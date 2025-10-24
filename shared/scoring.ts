export type CriterionStatus = 'met' | 'not_met' | 'unknown';

export interface CriteriaItem {
  name?: string;
  importance?: 'critical' | 'important' | 'nice_to_have';
  status?: CriterionStatus;
}

export interface BuyingSignalItem {
  importance?: 'critical' | 'important';
  signal_date?: string; // ISO date
}

export interface IcpInputs {
  criteria?: CriteriaItem[];
  signals?: BuyingSignalItem[];
  employee_count?: number | null;
  industry?: string | null;
}

export interface IcpScoreResult {
  score: number; // 0-100
  breakdown: Array<{ label: string; delta: number }>; // explainable parts
  version: string;
}

const VERSION = 'icp-v1.0.0';

function daysAgo(date: string): number | null {
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch { return null; }
}

export function computeIcpScoreFromInputs(input: IcpInputs): IcpScoreResult {
  const breakdown: Array<{ label: string; delta: number }>=[];

  // Start with a neutral base; we want room for +/- adjustments
  let score = 50;

  // Criteria contributions
  const criteria = Array.isArray(input.criteria) ? input.criteria : [];
  for (const c of criteria) {
    const importance = (c.importance || 'important').toLowerCase() as 'critical'|'important'|'nice_to_have';
    const status = (c.status || 'unknown').toLowerCase() as CriterionStatus;
    let delta = 0;
    if (importance === 'critical') {
      if (status === 'met') delta = +15;
      else if (status === 'not_met') delta = -20;
    } else if (importance === 'important') {
      if (status === 'met') delta = +10;
      else if (status === 'not_met') delta = -10;
    } else {
      if (status === 'met') delta = +5;
      else if (status === 'not_met') delta = -5;
    }
    if (delta !== 0) breakdown.push({ label: `Criterion: ${c.name || 'Unnamed'} (${importance}, ${status})`, delta });
    score += delta;
  }

  // Signal recency contributions (cap total to avoid overpowering)
  const signals = Array.isArray(input.signals) ? input.signals : [];
  let signalTotal = 0;
  for (const s of signals) {
    const imp = (s.importance || 'important').toLowerCase() as 'critical'|'important';
    const d = s.signal_date ? daysAgo(s.signal_date) : null;
    if (d == null) continue;
    let delta = 0;
    if (imp === 'critical' && d <= 30) delta = 10;
    else if (imp === 'important' && d <= 60) delta = 5;
    if (delta) {
      signalTotal += delta;
    }
  }
  if (signalTotal) {
    const applied = Math.min(signalTotal, 20); // cap
    breakdown.push({ label: 'Recent priority signals', delta: applied });
    score += applied;
  }

  // Optional: very rough size hint (if provided)
  if (typeof input.employee_count === 'number') {
    // Default ICP from the current product often targets 50–200; give mild penalty for huge mismatch
    if (input.employee_count < 30 || input.employee_count > 5000) {
      breakdown.push({ label: 'Size band mismatch', delta: -10 });
      score -= 10;
    }
  }

  // Clamp and round for stability
  score = Math.max(0, Math.min(100, score));
  // Round to nearest 5 to reduce jitter
  score = Math.round(score / 5) * 5;

  return { score, breakdown, version: VERSION };
}

