import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest } from '../../lib/auth';
import { loadFullUserContext } from '../../lib/contextLoader';

export const runtime = 'nodejs';

function summarizeProfile(context: Awaited<ReturnType<typeof loadFullUserContext>>) {
  const pieces: string[] = [];
  const profile = context.profile || {};

  if (profile.company_name) pieces.push(`Company: ${profile.company_name}`);
  if (profile.industry) pieces.push(`Industry: ${profile.industry}`);
  if (profile.icp_definition) pieces.push(`ICP: ${profile.icp_definition}`);

  if (Array.isArray(profile.target_titles) && profile.target_titles.length) {
    const titles = profile.target_titles
      .filter((title: unknown): title is string => typeof title === 'string' && title.trim().length > 0)
      .slice(0, 5)
      .join(', ');
    if (titles) pieces.push(`Target titles: ${titles}`);
  }

  if (Array.isArray(context.customCriteria) && context.customCriteria.length) {
    const criteria = context.customCriteria
      .map((criterion: any) => criterion?.field_name || criterion?.name)
      .filter((val: unknown): val is string => typeof val === 'string' && val.trim().length > 0)
      .slice(0, 5)
      .join(', ');
    if (criteria) pieces.push(`Critical criteria: ${criteria}`);
  }

  if (Array.isArray(context.signals) && context.signals.length) {
    const signals = context.signals
      .map((signal: any) => signal?.display_label || signal?.signal_type)
      .filter((val: unknown): val is string => typeof val === 'string' && val.trim().length > 0)
      .slice(0, 5)
      .join(', ');
    if (signals) pieces.push(`Priority signals: ${signals}`);
  }

  return pieces.join('\n');
}

function safeSlice(text: string | null | undefined, max = 4000) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) : text;
}

// Use a slightly larger model for better structured-output reliability
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

function sanitizeSuggestion(text: string): string | null {
  if (typeof text !== 'string') return null;
  const cleaned = text
    .replace(/^['"\s]+|['"\s]+$/g, '')
    .replace(/^[•\-*\d.\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;
  if (/[{}<>]|\"suggestions\"/i.test(cleaned)) return null;
  if (cleaned.length > 120) return null;
  const wordCount = cleaned.split(/\s+/).length;
  if (wordCount < 3) return null;

  // Ensure it's phrased as a question; append '?' if reasonable
  const terminal = cleaned.endsWith('?') ? cleaned : `${cleaned}?`;
  return terminal;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, supabase } = await authenticateRequest(authHeader);
    const body = await req.json();

    const {
      last_assistant: lastAssistant = '',
      last_user: lastUser = '',
      applied_context: appliedContext = null,
      active_company: activeCompany = null,
    } = body || {};

    const fullContext = await loadFullUserContext(supabase, user.id, 'company_research');

    const profileSummary = summarizeProfile(fullContext);
    const memorySnippet = safeSlice(fullContext.memoryBlock, 2000);
    const assistantSnippet = safeSlice(lastAssistant, 6000);
    const userSnippet = safeSlice(lastUser, 1200);
    const appliedSummary = appliedContext
      ? typeof appliedContext === 'string'
        ? appliedContext
        : JSON.stringify(appliedContext)
      : '';

    const promptPayload = {
      context: {
        profile: profileSummary || null,
        applied_context: appliedSummary || null,
        memory_highlights: memorySnippet || null,
        active_company: activeCompany,
      },
      latest_request: userSnippet || null,
      latest_response: assistantSnippet || null,
      instructions: [
        'Generate between 3 and 5 concise follow-up questions.',
        'Each suggestion must be phrased as a question under 18 words.',
        'Preserve user terminology exactly as it appears in the context.',
        'Avoid bullet markers, numbering, quotes, or explanations—just the questions.',
        'If the context lacks enough detail, ask clarifying questions instead of guessing.',
      ],
    };

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await openai.responses.create({
      model: MODEL,
      text: {
        format: {
          type: 'json_schema',
          name: 'follow_up_suggestions',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['suggestions'],
            properties: {
              suggestions: {
                type: 'array',
                minItems: 3,
                maxItems: 5,
                items: {
                  type: 'string',
                  minLength: 8,
                  maxLength: 160,
                },
              },
            },
          },
        },
      },
      instructions: 'You assist revenue teams by proposing their next smart follow-up questions.',
      input: JSON.stringify(promptPayload),
      max_output_tokens: 400,
    });

    let payload: any = null;
    const collectQuestionsFromText = (text: string): string[] => {
      try {
        const lines = String(text || '')
          .split(/\n+/)
          .map(l => l.replace(/^[-*\d.\s]+/, '').trim())
          .filter(Boolean);
        const candidates = lines.filter(l => /\?$/.test(l));
        return candidates.slice(0, 8);
      } catch {
        return [];
      }
    };
    if (Array.isArray((response as any).output)) {
      for (const item of (response as any).output) {
        if (!item?.content) continue;
        for (const fragment of item.content) {
          if (fragment?.type === 'output_json' && fragment.json) {
            payload = fragment.json;
            break;
          }
          if (fragment?.type === 'output_text' && typeof fragment.text === 'string' && fragment.text.trim()) {
            try {
              payload = JSON.parse(fragment.text);
            } catch {
              const matched = fragment.text.match(/\{[\s\S]*\}/);
              if (matched) {
                try {
                  payload = JSON.parse(matched[0]);
                } catch {
                  // ignore parse failure here
                }
              }
              // Fallback: try to extract question lines
              if (!payload) {
                const questions = collectQuestionsFromText(fragment.text);
                if (questions.length) {
                  payload = { suggestions: questions };
                }
              }
            }
          }
        }
        if (payload) break;
      }
    }

    if (!payload && typeof (response as any).output_text === 'string' && (response as any).output_text.trim()) {
      try {
        payload = JSON.parse((response as any).output_text);
      } catch {
        const matched = (response as any).output_text.match(/\{[\s\S]*\}/);
        if (matched) {
          try {
            payload = JSON.parse(matched[0]);
          } catch {
            // swallow
          }
        }
        // Fallback: extract question lines from free text
        if (!payload) {
          const questions = collectQuestionsFromText((response as any).output_text);
          if (questions.length) {
            payload = { suggestions: questions };
          }
        }
      }
    }

    const rawSuggestions: unknown[] = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
    const unique = new Set<string>();
    const normalized: string[] = [];
    for (const entry of rawSuggestions) {
      const suggestion = sanitizeSuggestion(String(entry ?? ''));
      if (suggestion) {
        const key = suggestion.toLowerCase();
        if (!unique.has(key)) {
          unique.add(key);
          normalized.push(suggestion);
        }
      }
    }

    // Server-side deterministic fallback if the model fails to return structured suggestions
    if (normalized.length === 0) {
      const normalizeName = (name: string | null | undefined): string | null => {
        if (!name) return null;
        const trimmed = name.trim();
        if (!trimmed) return null;
        const lc = trimmed.toLowerCase();
        // Filter out generic or accidental subjects
        const banned = ['quick clarification', 'what changed', 'this company', 'the company', 'general'];
        if (banned.includes(lc)) return null;
        // Filter obvious questions turned into title-case
        if (/^(what|who|when|where|which|how)\b/i.test(trimmed)) return null;
        // Keep it short and reasonable
        if (trimmed.length > 60) return null;
        return trimmed;
      };

      // Try to recover a reasonable company from inputs
      let company = normalizeName(typeof activeCompany === 'string' ? activeCompany : null);
      if (!company) {
        try {
          const parsedInput = promptPayload as any;
          // Look into latest_response for a proper organization mention
          const lr = String(parsedInput?.latest_response || '');
          const orgMatch = lr.match(/\b(?:Company|Organization|Org|Assumed)\s*:?\s*([A-Z][A-Za-z0-9&\- ]{2,60})/);
          if (orgMatch && normalizeName(orgMatch[1])) company = normalizeName(orgMatch[1]);
        } catch {}
      }
      if (!company) {
        try {
          const lu = String((body as any)?.last_user || '');
          const domainMatch = lu.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+)\.[a-z]{2,}/i);
          if (domainMatch) {
            const seg = domainMatch[1];
            if (seg) company = seg.split(/[-_]/).map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
          }
        } catch {}
      }

      const signalNames: string[] = Array.isArray(fullContext.signals)
        ? fullContext.signals
            .map((s: any) => (s?.display_label || s?.label || '').toString().trim() || (s?.signal_type || '').toString().replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))
            .filter((v: string) => v.length > 0)
        : [];

      const topSignal = signalNames[0] || 'Leadership Change';
      const secondSignal = signalNames[1] || 'Data Breach';
      const thirdSignal = signalNames[2] || 'Acquisitions';

      // Craft questions; include company if we confidently resolved it, otherwise generic
      const withCo = (q: string) => company ? q.replace('{company}', company) : q.replace(' at {company}', '').replace(' for {company}', '').replace(' {company}', '');
      const fallbackRaw = [
        withCo(`Any ${secondSignal.toLowerCase()} alerts at {company} in the last 90 days?`),
        withCo(`What ${topSignal.toLowerCase()} happened recently for {company}?`),
        withCo(`What ${thirdSignal.toLowerCase()} or partnerships were announced by {company} recently?`),
      ];
      const fallback = fallbackRaw.map(sanitizeSuggestion).filter((q): q is string => Boolean(q));

      if (fallback.length > 0) {
        normalized.push(...fallback);
      }
    }

    return Response.json({
      suggestions: normalized.slice(0, 5),
    });
  } catch (error: any) {
    console.error('[followups] error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to generate suggestions';
    const status = typeof error?.status === 'number' ? error.status : 500;
    return Response.json({ error: message }, { status });
  }
}
