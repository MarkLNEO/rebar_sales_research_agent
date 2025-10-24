-- Finalize tracked_accounts and research_outputs schema for production
-- Safe, idempotent migration: only adds/updates when missing

-- =============================
-- tracked_accounts adjustments
-- =============================
DO $$
BEGIN
  -- add commonly used columns (no-ops if they already exist)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'company_url'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN company_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'industry'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN industry text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'employee_count'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN employee_count integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'added_at'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN added_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'last_researched_at'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN last_researched_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'latest_research_id'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN latest_research_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'icp_fit_score'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN icp_fit_score integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'signal_score'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN signal_score integer DEFAULT 0;
  END IF;

  -- set defaults if columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'monitoring_enabled'
  ) THEN
    ALTER TABLE public.tracked_accounts ALTER COLUMN monitoring_enabled SET DEFAULT true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tracked_accounts ALTER COLUMN priority SET DEFAULT 'standard';
  END IF;

  -- ensure metadata + last_research_summary exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'last_research_summary'
  ) THEN
    ALTER TABLE public.tracked_accounts ADD COLUMN last_research_summary text;
  END IF;

  -- drop legacy 'domain' column if present
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'domain'
  ) THEN
    ALTER TABLE public.tracked_accounts DROP COLUMN domain;
  END IF;

  -- unique constraint for (user_id, company_name)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tracked_accounts_user_company_unique'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ADD CONSTRAINT tracked_accounts_user_company_unique UNIQUE (user_id, company_name);
  END IF;
END;$$;

-- updated_at trigger (already in repo; ensure present)
CREATE OR REPLACE FUNCTION public.set_tracked_accounts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tracked_accounts_updated_at ON public.tracked_accounts;
CREATE TRIGGER set_tracked_accounts_updated_at
BEFORE UPDATE ON public.tracked_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_tracked_accounts_updated_at();

-- =============================
-- research_outputs adjustments
-- =============================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'research_outputs' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE public.research_outputs ADD COLUMN account_id uuid;
  END IF;

  -- add FK if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'research_outputs' AND constraint_type = 'FOREIGN KEY' AND constraint_name = 'research_outputs_account_id_fkey'
  ) THEN
    ALTER TABLE public.research_outputs
      ADD CONSTRAINT research_outputs_account_id_fkey
      FOREIGN KEY (account_id) REFERENCES public.tracked_accounts(id) ON DELETE SET NULL;
  END IF;
END;$$;

-- optional richer columns (no-ops if exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='research_type'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN research_type text; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='data'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN data jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='tokens_used'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN tokens_used integer; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='executive_summary'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN executive_summary text; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='icp_fit_score'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN icp_fit_score integer; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='signal_score'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN signal_score integer; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='composite_score'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN composite_score integer; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='priority_level'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN priority_level text; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='confidence_level'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN confidence_level text; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='company_data'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN company_data jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='leadership_team'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN leadership_team jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='buying_signals'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN buying_signals jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='custom_criteria_assessment'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN custom_criteria_assessment jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='personalization_points'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN personalization_points jsonb; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='research_outputs' AND column_name='recommended_actions'
  ) THEN ALTER TABLE public.research_outputs ADD COLUMN recommended_actions jsonb; END IF;
END $$;

-- =============================
-- RLS (recommended; safe if already present)
-- =============================
DO $$ BEGIN
  -- tracked_accounts RLS + policies
  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='tracked_accounts';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.tracked_accounts ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracked_accounts' AND policyname='ta_sel'
    ) THEN
      EXECUTE 'CREATE POLICY ta_sel ON public.tracked_accounts FOR SELECT USING (user_id = auth.uid())';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracked_accounts' AND policyname='ta_ins'
    ) THEN
      EXECUTE 'CREATE POLICY ta_ins ON public.tracked_accounts FOR INSERT WITH CHECK (user_id = auth.uid())';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracked_accounts' AND policyname='ta_upd'
    ) THEN
      EXECUTE 'CREATE POLICY ta_upd ON public.tracked_accounts FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tracked_accounts' AND policyname='ta_del'
    ) THEN
      EXECUTE 'CREATE POLICY ta_del ON public.tracked_accounts FOR DELETE USING (user_id = auth.uid())';
    END IF;
  END IF;

  -- research_outputs RLS + policies (kept for client use; server-link uses service role)
  PERFORM 1 FROM pg_tables WHERE schemaname='public' AND tablename='research_outputs';
  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.research_outputs ENABLE ROW LEVEL SECURITY';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='research_outputs' AND policyname='ro_sel'
    ) THEN
      EXECUTE 'CREATE POLICY ro_sel ON public.research_outputs FOR SELECT USING (user_id = auth.uid())';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='research_outputs' AND policyname='ro_ins'
    ) THEN
      EXECUTE 'CREATE POLICY ro_ins ON public.research_outputs FOR INSERT WITH CHECK (user_id = auth.uid())';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='research_outputs' AND policyname='ro_upd'
    ) THEN
      EXECUTE 'CREATE POLICY ro_upd ON public.research_outputs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())';
    END IF;
  END IF;
END $$;

-- =============================
-- Indexes
-- =============================
CREATE INDEX IF NOT EXISTS ix_tracked_accounts_user ON public.tracked_accounts(user_id, company_name);
CREATE INDEX IF NOT EXISTS ix_research_outputs_user ON public.research_outputs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_research_outputs_acct ON public.research_outputs(account_id, created_at DESC);

