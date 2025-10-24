'use client';

import { useEffect, useMemo, useState } from 'react';
import { Streamdown } from 'streamdown';
import { useToast } from './ToastProvider';
import { Download, FileText, TrendingUp, Zap, Users, Target, Lightbulb, HelpCircle } from 'lucide-react';
import { OptimizeICPModal } from './OptimizeICPModal';
import { computeIcpScoreFromInputs } from '../../shared/scoring';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ResearchOutputProps {
  research: {
    id: string;
    subject: string;
    research_type: string;
    icp_fit_score?: number;
    signal_score?: number;
    composite_score?: number;
    priority_level?: 'hot' | 'warm' | 'standard';
    executive_summary?: string;
    company_data?: any;
    leadership_team?: any[];
    buying_signals?: any[];
    custom_criteria_assessment?: any[];
    personalization_points?: any[];
    recommended_actions?: any;
    confidence_level?: string;
    markdown_report?: string;
    sources?: any;
    created_at: string;
  };
  onExportPDF?: () => void;
  onExportCSV?: () => void;
}

function ScoreCard({ label, score, icon: Icon, color }: { label: string; score?: number; icon: any; color: string }) {
  if (score === undefined || score === null) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-3xl font-bold text-gray-900">{score}</div>
      <div className="mt-2 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${color.replace('text-', 'bg-')}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function PriorityBadge({ level }: { level?: string }) {
  if (!level) return null;

  const config = {
    hot: { icon: '🔥', label: 'HOT LEAD', color: 'bg-red-50 text-red-700 border-red-200' },
    warm: { icon: '⚡', label: 'WARM LEAD', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    standard: { icon: '📍', label: 'STANDARD', color: 'bg-blue-50 text-blue-700 border-blue-200' }
  };

  const { icon, label, color } = config[level as keyof typeof config] || config.standard;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
}

export function ResearchOutput({ research, onExportPDF, onExportCSV }: ResearchOutputProps) {
  const [showIcpWhy, setShowIcpWhy] = useState(false);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [enriched, setEnriched] = useState<Record<string, { email?: string; linkedin_url?: string | null }>>({});
  const [enriching, setEnriching] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuth();

  // Profile Alignment state (mirrors ICP, signals, and criteria verbatim)
  const [profileAlignment, setProfileAlignment] = useState<{
    icp?: string | null;
    signals?: Array<{ label: string; importance?: string }>;
    criteria?: Array<{ name: string; importance?: string }>;
  }>({});

  const domain = useMemo(() => {
    try {
      const raw = research?.company_data?.website || research?.company_data?.domain || '';
      if (!raw) return '';
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      return u.hostname.replace(/^www\./, '');
    } catch { return ''; }
  }, [research?.company_data]);

  useEffect(() => {
    let canceled = false;
    // Auto-attempt enrichment shortly after mount for convenience
    (async () => {
      try {
        await runEnrichment(false, () => canceled);
      } catch {}
    })();
    return () => { canceled = true; };
  }, [domain, research?.leadership_team]);

  // Load a lightweight snapshot of the user's ICP, signals, and criteria for mirroring
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user?.id) return;
        const [profileRes, signalsRes, criteriaRes] = await Promise.all([
          supabase.from('company_profiles').select('icp_definition').eq('user_id', user.id).maybeSingle(),
          supabase.from('user_signal_preferences').select('signal_type, importance, config').eq('user_id', user.id),
          supabase.from('user_custom_criteria').select('field_name, importance, display_order').eq('user_id', user.id).order('display_order', { ascending: true })
        ]);

        const icp = profileRes.data?.icp_definition ?? null;
        const signals = Array.isArray(signalsRes.data)
          ? signalsRes.data.map((s: any) => ({
              label: typeof s?.config?.label === 'string' && s.config.label.trim() ? s.config.label.trim() : (String(s?.signal_type || '') || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (m: string) => m.toUpperCase()),
              importance: s?.importance || undefined,
            }))
          : [];
        const criteria = Array.isArray(criteriaRes.data)
          ? criteriaRes.data.map((c: any) => ({ name: c?.field_name || '', importance: c?.importance || undefined }))
          : [];

        if (!cancelled) setProfileAlignment({ icp, signals, criteria });
      } catch (e) {
        // Non-fatal: mirroring is best-effort
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Extract a domain from markdown/sources if structured company_data is missing
  const extractDomainFallback = (): string => {
    const text = [research?.markdown_report || '', JSON.stringify(research?.sources || {})].join('\n');
    const subject = String(research?.subject || '').toLowerCase();
    const matches = Array.from(text.matchAll(/\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)\b/gi));
    const candidates = matches.map(m => (m[1] || '').toLowerCase()).filter(Boolean);
    // Prefer domains containing the subject keyword
    const preferred = candidates.find(d => subject && d.includes(subject.replace(/[^a-z0-9]/g, '')));
    return preferred || candidates[0] || '';
  };

  const normalizeName = (name: string): string =>
    (name || '')
      .toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const runEnrichment = async (manual = false, isCanceled?: () => boolean) => {
    try {
      const names = (Array.isArray(research?.leadership_team) ? research.leadership_team : []).slice(0, 6).map((l: any) => ({ name: l?.name || '', title: l?.title || l?.role || '' })).filter(x => x.name);
      if (names.length === 0) return;
      const resolved = domain || extractDomainFallback();
      if (!resolved) {
        if (manual) addToast({ type: 'info', title: 'No website found', description: 'Add a company website or include it in your research (e.g., “Research Acme (acme.com)”)' });
        return;
      }
      setEnriching(true);
      const resp = await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: resolved, names, limit: 6 }) });
      if (isCanceled && isCanceled()) return;
      if (!resp.ok) {
        if (manual) addToast({ type: 'error', title: 'Verification failed', description: await resp.text().catch(() => 'Unknown error') });
        return;
      }
      const data = await resp.json();
      if (isCanceled && isCanceled()) return;
      const map: Record<string, { email?: string; linkedin_url?: string | null }> = {};
      for (const c of (data?.contacts || [])) {
        const key = normalizeName(c?.name || '');
        if (!key) continue;
        map[key] = { email: c.email || undefined, linkedin_url: c.linkedin_url || null };
      }
      setEnriched(map);
      const count = Object.values(map).filter(x => x.email).length;
      if (manual) {
        addToast({ type: count > 0 ? 'success' : 'info', title: count > 0 ? `Found ${count} verified email${count === 1 ? '' : 's'}` : 'No verified emails found', description: count > 0 ? 'Verified emails are now shown under contacts.' : 'Some domains do not validate publicly.' });
      }
    } catch (e: any) {
      if (manual) addToast({ type: 'error', title: 'Verification error', description: e?.message || 'Please try again.' });
    } finally {
      setEnriching(false);
    }
  };
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 md:p-6 space-y-4 md:space-y-6" data-testid="research-output">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{research.subject}</h3>
          <div className="flex items-center gap-3">
            <PriorityBadge level={research.priority_level} />
            {research.confidence_level && (
              <span className="text-sm text-gray-600">
                Confidence: <span className="font-semibold capitalize">{research.confidence_level}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportPDF}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export as PDF"
          >
            <FileText className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onExportCSV}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export as CSV"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Executive Summary */}
      {research.executive_summary && (
        <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-4" data-testid="research-section-executive-summary">
          <h4 className="font-semibold text-gray-900 mb-2">Executive Summary</h4>
          <p className="text-gray-700 leading-relaxed">{research.executive_summary}</p>
        </div>
      )}

      {/* Profile Alignment (mirrors user's ICP, signals, and criteria terms) */}
      {(profileAlignment.icp || (profileAlignment.signals && profileAlignment.signals.length > 0) || (profileAlignment.criteria && profileAlignment.criteria.length > 0)) && (
        <div className="bg-white border border-blue-200 rounded-xl p-3 md:p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Profile Alignment</h4>
          {profileAlignment.icp && (
            <div className="mb-2">
              <span className="text-sm text-gray-600">ICP</span>
              <p className="text-gray-900">{profileAlignment.icp}</p>
            </div>
          )}
          {profileAlignment.signals && profileAlignment.signals.length > 0 && (
            <div className="mb-2">
              <span className="text-sm text-gray-600">Signals</span>
              <ul className="mt-1 text-gray-900 list-disc list-inside text-sm">
                {profileAlignment.signals.slice(0, 5).map((s, idx) => (
                  <li key={idx}>{s.label}{s.importance ? ` (${s.importance})` : ''}</li>
                ))}
              </ul>
            </div>
          )}
          {profileAlignment.criteria && profileAlignment.criteria.length > 0 && (
            <div>
              <span className="text-sm text-gray-600">Criteria</span>
              <ul className="mt-1 text-gray-900 list-disc list-inside text-sm">
                {profileAlignment.criteria.slice(0, 5).map((c, idx) => (
                  <li key={idx}>{c.name}{c.importance ? ` (${c.importance})` : ''}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(() => {
          // Deterministic fallback: compute score if not provided
          if (typeof research.icp_fit_score !== 'number') {
            const derived = computeIcpScoreFromInputs({
              criteria: Array.isArray(research.custom_criteria_assessment) ? research.custom_criteria_assessment : [],
              signals: Array.isArray(research.buying_signals) ? research.buying_signals : [],
              employee_count: typeof research?.company_data?.employee_count === 'number' ? research.company_data.employee_count : null,
              industry: typeof research?.company_data?.industry === 'string' ? research.company_data.industry : null,
            });
            (research as any).icp_fit_score = derived.score;
            (research as any).icp_score_version = derived.version;
            (research as any).icp_score_breakdown = derived.breakdown;
          }
          return null;
        })()}
        <ScoreCard
          label="ICP Fit Score"
          score={research.icp_fit_score}
          icon={Target}
          color="text-blue-600"
        />
        <ScoreCard
          label="Signal Score"
          score={research.signal_score}
          icon={Zap}
          color="text-blue-700"
        />
        <ScoreCard
          label="Composite Score"
          score={research.composite_score}
          icon={TrendingUp}
          color="text-green-600"
        />
      </div>

      {/* ICP explanation */}
      {(typeof research.icp_fit_score === 'number') && (
        <div className="-mt-2">
          <button
            type="button"
            onClick={() => setShowIcpWhy(v => !v)}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
          >
            <HelpCircle className="w-3.5 h-3.5" /> How is this calculated?
          </button>
          {showIcpWhy && (
            <div className="mt-2 bg-white border border-blue-100 rounded-lg p-3">
              {Array.isArray((research as any).icp_score_breakdown) && (research as any).icp_score_breakdown.length > 0 ? (
                <div className="text-sm text-gray-800">
                  <div className="font-semibold mb-1">Scoring breakdown (version {(research as any).icp_score_version || 'icp-v1.0.0'})</div>
                  <ul className="list-disc list-inside space-y-1">
                    {(research as any).icp_score_breakdown.map((b: any, idx: number) => (
                      <li key={idx} className={b.delta >= 0 ? 'text-green-700' : 'text-red-700'}>
                        {b.label} {b.delta >= 0 ? `(+${b.delta})` : `(${b.delta})`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm text-gray-700">This score is computed from your criteria (critical/important/nice‑to‑have), recent priority signals, and basic size hints. To improve accuracy, define more criteria and keep signal preferences up to date.</div>
              )}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setOptimizeOpen(true)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  Improve my ICP
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optimize ICP modal */}
      <OptimizeICPModal isOpen={optimizeOpen} onClose={() => setOptimizeOpen(false)} />

      {/* Company Data */}
      {research.company_data && Object.keys(research.company_data).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5" data-testid="research-section-company-overview">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Company Overview
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {research.company_data.industry && (
              <div>
                <span className="text-sm text-gray-600">Industry</span>
                <p className="font-medium text-gray-900">{research.company_data.industry}</p>
              </div>
            )}
            {research.company_data.size && (
              <div>
                <span className="text-sm text-gray-600">Company Size</span>
                <p className="font-medium text-gray-900">{research.company_data.size}</p>
              </div>
            )}
            {research.company_data.location && (
              <div>
                <span className="text-sm text-gray-600">Location</span>
                <p className="font-medium text-gray-900">{research.company_data.location}</p>
              </div>
            )}
            {research.company_data.founded && (
              <div>
                <span className="text-sm text-gray-600">Founded</span>
                <p className="font-medium text-gray-900">{research.company_data.founded}</p>
              </div>
            )}
            {research.company_data.website && (
              <div className="col-span-2">
                <span className="text-sm text-gray-600">Website</span>
                <a
                  href={research.company_data.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline block"
                >
                  {research.company_data.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decision Makers */}
      {research.leadership_team && research.leadership_team.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="research-section-decision-makers">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900">Decision Makers</h4>
            <div className="flex items-center gap-2">
              {enriching && (
                <span className="text-xs text-gray-600">Verifying emails…</span>
              )}
              <button
                type="button"
                onClick={() => { void runEnrichment(true); }}
                disabled={enriching}
                className={`px-3 py-1.5 text-xs rounded-lg border ${enriching ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                title="Verify and show decision-maker emails"
              >
                {enriching ? 'Verifying…' : 'Get verified emails'}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {research.leadership_team.map((leader: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-600">
                    {leader.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{leader.name}</div>
                  <div className="text-sm text-gray-600">{leader.title || leader.role}</div>
                  {(() => {
                    const key = normalizeName(String(leader.name || ''));
                    const rec = key ? enriched[key] : undefined;
                    return rec?.email ? (
                      <div className="text-sm text-gray-700">
                        <a href={`mailto:${rec.email}`} className="text-blue-700 hover:underline">
                          {rec.email}
                        </a>
                      </div>
                    ) : null;
                  })()}
                  {leader.linkedin && (
                    <a
                      href={leader.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      LinkedIn Profile
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buying Signals */}
      {research.buying_signals && research.buying_signals.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="research-section-buying-signals">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-700" />
            Buying Signals
          </h4>
          <div className="space-y-3">
            {research.buying_signals.map((signal: any, idx: number) => (
              <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{signal.type || signal.signal_type}</div>
                    <p className="text-sm text-gray-600 mt-1">{signal.description || signal.details}</p>
                    {signal.date && (
                      <span className="text-xs text-gray-500 mt-1 block">{signal.date}</span>
                    )}
                  </div>
                  {signal.score !== undefined && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-semibold">
                      +{signal.score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Criteria Assessment */}
      {research.custom_criteria_assessment && research.custom_criteria_assessment.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5" data-testid="research-section-custom-criteria">
          <h4 className="font-semibold text-gray-900 mb-4">Custom Criteria Assessment</h4>
          <div className="space-y-2">
            {research.custom_criteria_assessment.map((criterion: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{criterion.name || criterion.field_name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {criterion.value !== undefined && criterion.value !== null ? String(criterion.value) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {criterion.confidence && (
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        criterion.confidence === 'high'
                          ? 'bg-green-100 text-green-700'
                          : criterion.confidence === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {criterion.confidence}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personalization Points */}
      {research.personalization_points && research.personalization_points.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5" data-testid="research-section-personalization">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Personalization Points
          </h4>
          <ul className="space-y-3">
            {research.personalization_points.map((point: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="text-gray-700">{point.point || point.description || point}</p>
                  {point.source && (
                    <span className="text-xs text-gray-500 mt-1 block">Source: {point.source}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      {research.recommended_actions && Object.keys(research.recommended_actions).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5" data-testid="research-section-recommended-actions">
          <h4 className="font-semibold text-gray-900 mb-4">Recommended Actions</h4>
          <div className="space-y-3">
            {research.recommended_actions.timing && (
              <div>
                <span className="text-sm font-medium text-gray-600">Timing:</span>
                <p className="text-gray-900 mt-1">{research.recommended_actions.timing}</p>
              </div>
            )}
            {research.recommended_actions.messaging && (
              <div>
                <span className="text-sm font-medium text-gray-600">Messaging Angles:</span>
                <p className="text-gray-700 mt-1">{research.recommended_actions.messaging}</p>
              </div>
            )}
            {research.recommended_actions.targets && (
              <div>
                <span className="text-sm font-medium text-gray-600">Key Targets:</span>
                <p className="text-gray-700 mt-1">{research.recommended_actions.targets}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {Array.isArray(research.sources) && research.sources.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 md:p-5" data-testid="research-section-sources">
          <h4 className="font-semibold text-gray-900 mb-3">Sources & Citations</h4>
          <ul className="space-y-2 text-sm">
            {research.sources.map((source: any, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-400">{idx + 1}.</span>
                {source?.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline break-words break-all">
                    {source.title || source.url}
                  </a>
                ) : (
                  <span className="text-gray-700">{source?.title || 'Reference'}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Full Report Link + Collapsible content */}
      {research.markdown_report && (
        <FullReport markdown={research.markdown_report} />
      )}
    </div>
  );
}

function FullReport({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-4 border-t border-gray-200" data-testid="research-section-markdown">
      <div className="text-center">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          {open ? 'Hide full report' : 'View Full Research Report →'}
        </button>
      </div>
      {open && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 md:p-4">
          <Streamdown className="prose prose-sm md:prose max-w-none text-gray-800 break-words">
            {markdown}
          </Streamdown>
        </div>
      )}
    </div>
  );
}
