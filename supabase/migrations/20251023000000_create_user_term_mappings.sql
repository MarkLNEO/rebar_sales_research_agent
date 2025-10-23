-- Create user_term_mappings table for entity disambiguation
-- Stores user-confirmed abbreviations and jargon expansions
-- Example: "m365" -> "Microsoft 365"

CREATE TABLE IF NOT EXISTS user_term_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  expansion TEXT NOT NULL,
  context TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  use_count INTEGER DEFAULT 0,
  CONSTRAINT user_term_mappings_unique UNIQUE (user_id, term)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS user_term_mappings_user_id_idx ON user_term_mappings(user_id);
CREATE INDEX IF NOT EXISTS user_term_mappings_term_idx ON user_term_mappings(term);

-- Enable RLS
ALTER TABLE user_term_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own term mappings
CREATE POLICY "Users can view own term mappings"
  ON user_term_mappings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own term mappings"
  ON user_term_mappings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own term mappings"
  ON user_term_mappings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own term mappings"
  ON user_term_mappings FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE user_term_mappings IS 'Stores user-confirmed abbreviations and jargon expansions for entity disambiguation';
COMMENT ON COLUMN user_term_mappings.term IS 'The abbreviation or jargon term (e.g., "m365", "k8s")';
COMMENT ON COLUMN user_term_mappings.expansion IS 'The full expansion (e.g., "Microsoft 365", "Kubernetes")';
COMMENT ON COLUMN user_term_mappings.context IS 'Optional context or category (e.g., "cloud productivity suite")';
COMMENT ON COLUMN user_term_mappings.last_used_at IS 'Last time this term was used in a query';
COMMENT ON COLUMN user_term_mappings.use_count IS 'Number of times this term has been used';
