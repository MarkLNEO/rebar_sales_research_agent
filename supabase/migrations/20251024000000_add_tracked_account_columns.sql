-- Align tracked_accounts schema with application expectations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'last_research_summary'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ADD COLUMN last_research_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'monitoring_enabled'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ALTER COLUMN monitoring_enabled SET DEFAULT true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ALTER COLUMN priority SET DEFAULT 'standard';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tracked_accounts' AND column_name = 'signal_score'
  ) THEN
    ALTER TABLE public.tracked_accounts
      ALTER COLUMN signal_score SET DEFAULT 0;
  END IF;
END;
$$;

-- Ensure updated_at stays in sync when records change
CREATE OR REPLACE FUNCTION public.set_tracked_accounts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_tracked_accounts_updated_at ON public.tracked_accounts;
CREATE TRIGGER set_tracked_accounts_updated_at
BEFORE UPDATE ON public.tracked_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_tracked_accounts_updated_at();
