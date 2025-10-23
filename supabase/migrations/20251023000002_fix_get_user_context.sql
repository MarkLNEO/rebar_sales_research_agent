-- Fix get_user_context function to remove reference to dropped user_report_preferences table
CREATE OR REPLACE FUNCTION get_user_context(p_user uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  select jsonb_build_object(
    'profile', (
      select to_jsonb(cp)
      from public.company_profiles cp
      where cp.user_id = p_user
    ),
    'custom_criteria', coalesce((
      select jsonb_agg(cc order by cc.display_order)
      from public.user_custom_criteria cc
      where cc.user_id = p_user
    ), '[]'::jsonb),
    'signals', coalesce((
      select jsonb_agg(sp)
      from public.user_signal_preferences sp
      where sp.user_id = p_user
    ), '[]'::jsonb),
    'disqualifiers', coalesce((
      select jsonb_agg(dc)
      from public.user_disqualifying_criteria dc
      where dc.user_id = p_user
    ), '[]'::jsonb),
    'prompt_config', (
      select to_jsonb(pc)
      from public.user_prompt_config pc
      where pc.user_id = p_user
    ),
    'preferences', coalesce((
      select jsonb_agg(ip)
      from public.implicit_preferences ip
      where ip.user_id = p_user
    ), '[]'::jsonb),
    'open_questions', '[]'::jsonb
  );
$$;
