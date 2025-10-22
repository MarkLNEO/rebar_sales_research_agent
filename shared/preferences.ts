export type FocusPreference = {
  on?: boolean;
  weight?: number;
  areas?: string[];
  always_include?: string[];
  skip_unless_relevant?: string[];
  [key: string]: unknown;
};

export type ResolvedPrefs = {
  focus: Record<string, FocusPreference> & {
    areas?: string[];
    always_include?: string[];
    skip_unless_relevant?: string[];
  };
  coverage: {
    depth?: 'shallow' | 'standard' | 'deep';
    mode?: 'quick' | 'deep' | 'specific';
    confidence?: number;
  };
  industry: {
    filters?: string[];
  };
  summary: {
    brevity?: 'short' | 'standard' | 'long';
  };
  tone?: 'warm' | 'balanced' | 'direct' | 'formal' | 'casual';
  [key: string]: unknown;
};
