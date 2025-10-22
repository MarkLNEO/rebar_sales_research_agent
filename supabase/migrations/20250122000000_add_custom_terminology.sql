-- Add custom terminology fields to user_profiles
-- This allows users to define their own terminology for signals, criteria, etc.
-- The agent will then use their exact words in responses, creating a sense of personalization

ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS signal_terminology TEXT DEFAULT 'Buying Signals',
  ADD COLUMN IF NOT EXISTS criteria_terminology TEXT DEFAULT 'Custom Criteria',
  ADD COLUMN IF NOT EXISTS watchlist_label TEXT DEFAULT 'Watchlist',
  ADD COLUMN IF NOT EXISTS show_watchlist_always BOOLEAN DEFAULT true;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_terminology 
  ON user_profiles(signal_terminology, criteria_terminology);

-- Update existing users to have defaults
UPDATE user_profiles 
SET 
  signal_terminology = 'Buying Signals',
  criteria_terminology = 'Custom Criteria',
  watchlist_label = 'Watchlist',
  show_watchlist_always = true
WHERE signal_terminology IS NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN user_profiles.signal_terminology IS 'User''s preferred term for buying signals (e.g., "Indicators", "Triggers", "Events")';
COMMENT ON COLUMN user_profiles.criteria_terminology IS 'User''s preferred term for custom criteria (e.g., "Qualifiers", "Requirements")';
COMMENT ON COLUMN user_profiles.watchlist_label IS 'User''s preferred label for the watchlist section in research reports';
COMMENT ON COLUMN user_profiles.show_watchlist_always IS 'Whether to always show watchlist section even when no signals detected';
