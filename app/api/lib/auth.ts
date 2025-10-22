import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function isEmailAllowed(email?: string | null): boolean {
  if (!email) return false;
  if (process.env.ACCESS_ALLOW_BYPASS === 'true') return true;
  const allowlist = (process.env.ACCESS_ALLOWLIST || '').split(/[;,\s]+/).filter(Boolean).map(s => s.toLowerCase());
  const domains = (process.env.ACCESS_ALLOWED_DOMAINS || '').split(/[;,\s]+/).filter(Boolean).map(s => s.toLowerCase());
  if (allowlist.length === 0 && domains.length === 0) return true;
  const lower = email.toLowerCase();
  if (allowlist.includes(lower)) return true;
  const domain = lower.split('@')[1] || '';
  return domains.includes(domain);
}

export async function authenticateRequest(authHeader?: string | null, impersonateUserId?: string) {
  if (!authHeader) throw new Error('Missing authorization header');
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing Supabase configuration');

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const token = authHeader.replace('Bearer ', '').trim();
  
  let user: any;
  
  if (token === SERVICE_KEY && impersonateUserId) {
    const { data, error } = await supabase.auth.admin.getUserById(impersonateUserId);
    if (error || !data?.user) throw new Error('Impersonation failed');
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new Error('Invalid token');
    user = data.user;
  }

  if (!isEmailAllowed(user.email)) {
    throw new Error('Access restricted');
  }

  return { user, supabase };
}

export async function checkCredits(supabase: any, userId: string) {
  const INITIAL_CREDITS = 1000;
  let { data: userRow } = await supabase
    .from('users')
    .select('id, credits_remaining, approval_status')
    .eq('id', userId)
    .maybeSingle();

  if (!userRow) {
    const { data: inserted } = await supabase
      .from('users')
      .insert({ id: userId, credits_remaining: INITIAL_CREDITS, approval_status: 'approved' })
      .select('id, credits_remaining, approval_status')
      .single();
    userRow = inserted;
  }

  if (userRow?.approval_status === 'rejected') {
    throw new Error('Account access restricted');
  }

  const remaining = userRow?.credits_remaining || 0;
  if (remaining <= 0) {
    throw new Error('Credits exhausted');
  }

  return { remaining, lowCredits: remaining < 100 };
}

export async function deductCredits(supabase: any, userId: string, tokensUsed: number) {
  const creditsToDeduct = Math.ceil(tokensUsed / 1000);
  await supabase.rpc('deduct_user_credits', { p_user_id: userId, p_credits: creditsToDeduct });
}

export async function logUsage(supabase: any, userId: string, actionType: string, tokensUsed: number, metadata = {}) {
  await supabase.from('usage_logs').insert({
    user_id: userId,
    action_type: actionType,
    tokens_used: tokensUsed,
    tool_name: 'chat',
    metadata
  });
}
