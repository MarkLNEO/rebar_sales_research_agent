-- Drop unused tables that have 0 rows and 0 code references
-- These tables were created for features that were never implemented or have been replaced

-- Drop old preference system (replaced by user_preferences)
DROP TABLE IF EXISTS preference_events CASCADE;

-- Drop unused feature tables (never implemented)
DROP TABLE IF EXISTS use_case_templates CASCADE;
DROP TABLE IF EXISTS guardrail_profiles CASCADE;
DROP TABLE IF EXISTS signal_sets_catalog CASCADE;
DROP TABLE IF EXISTS icp_profiles CASCADE;
DROP TABLE IF EXISTS research_playbooks CASCADE;
DROP TABLE IF EXISTS golden_runs CASCADE;
DROP TABLE IF EXISTS knowledge_suggestions CASCADE;
DROP TABLE IF EXISTS relations CASCADE;
DROP TABLE IF EXISTS user_report_preferences CASCADE;

-- Drop deprecated tables (replaced by newer schemas)
DROP TABLE IF EXISTS company_signals CASCADE;
DROP TABLE IF EXISTS research_results CASCADE;

-- Ad