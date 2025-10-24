export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type GenericRelationship = {
  foreignKeyName: string;
  columns: string[];
  referencedRelation: string;
  referencedColumns: string[];
};

type GenericTable = {
  Row: Record<string, Json | undefined>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
  Relationships: GenericRelationship[];
};

type PublicTables = {
  users: {
    Row: {
      id: string;
      email: string;
      created_at: string;
      credits_remaining: number;
      credits_total: number;
      approved: boolean;
      admin: boolean;
    };
    Insert: {
      id: string;
      email: string;
      created_at?: string;
      credits_remaining?: number;
      credits_total?: number;
      approved?: boolean;
      admin?: boolean;
    };
    Update: {
      id?: string;
      email?: string;
      created_at?: string;
      credits_remaining?: number;
      credits_total?: number;
      approved?: boolean;
      admin?: boolean;
    };
    Relationships: [];
  };
  company_profiles: {
    Row: {
      id: string;
      user_id: string;
      company_name: string | null;
      industry: string | null;
      company_size: string | null;
      target_market: string | null;
      research_focus: string | null;
      onboarding_step: number | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      company_name?: string | null;
      industry?: string | null;
      company_size?: string | null;
      target_market?: string | null;
      research_focus?: string | null;
      onboarding_step?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      company_name?: string | null;
      industry?: string | null;
      company_size?: string | null;
      target_market?: string | null;
      research_focus?: string | null;
      onboarding_step?: number | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'company_profiles_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  user_custom_criteria: {
    Row: {
      id: string;
      user_id: string;
      field_name: string;
      field_type: string;
      importance: number;
      hints: string | null;
      display_order: number;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      field_name: string;
      field_type: string;
      importance: number;
      hints?: string | null;
      display_order?: number;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      field_name?: string;
      field_type?: string;
      importance?: number;
      hints?: string | null;
      display_order?: number;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'user_custom_criteria_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  user_signal_preferences: {
    Row: {
      id: string;
      user_id: string;
      signal_type: string;
      enabled: boolean;
      severity_threshold: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      signal_type: string;
      enabled?: boolean;
      severity_threshold?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      signal_type?: string;
      enabled?: boolean;
      severity_threshold?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'user_signal_preferences_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  user_disqualifying_criteria: {
    Row: {
      id: string;
      user_id: string;
      criterion: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      criterion: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      criterion?: string;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'user_disqualifying_criteria_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  tracked_accounts: {
    Row: {
      id: string;
      user_id: string;
      company_name: string;
      company_url: string | null;
      industry: string | null;
      employee_count: number | null;
      added_at: string;
      updated_at: string;
      last_researched_at: string | null;
      monitoring_enabled: boolean;
      latest_research_id: string | null;
      icp_fit_score: number | null;
      signal_score: number | null;
      priority: string;
      last_contacted_at: string | null;
      notes: string | null;
      metadata: Json | null;
      last_research_summary: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      company_name: string;
      company_url?: string | null;
      industry?: string | null;
      employee_count?: number | null;
      added_at?: string;
      updated_at?: string;
      last_researched_at?: string | null;
      monitoring_enabled?: boolean;
      latest_research_id?: string | null;
      icp_fit_score?: number | null;
      signal_score?: number | null;
      priority?: string;
      last_contacted_at?: string | null;
      notes?: string | null;
      metadata?: Json | null;
      last_research_summary?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      company_name?: string;
      company_url?: string | null;
      industry?: string | null;
      employee_count?: number | null;
      added_at?: string;
      updated_at?: string;
      last_researched_at?: string | null;
      monitoring_enabled?: boolean;
      latest_research_id?: string | null;
      icp_fit_score?: number | null;
      signal_score?: number | null;
      priority?: string;
      last_contacted_at?: string | null;
      notes?: string | null;
      metadata?: Json | null;
      last_research_summary?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'tracked_accounts_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  account_signals: {
    Row: {
      id: string;
      account_id: string;
      signal_type: string;
      severity: string;
      description: string;
      signal_date: string;
      source_url: string | null;
      score: number | null;
      metadata: Json | null;
      detected_at: string;
      viewed: boolean;
      viewed_at: string | null;
      dismissed: boolean;
      dismissed_at: string | null;
    };
    Insert: {
      id?: string;
      account_id: string;
      signal_type: string;
      severity: string;
      description: string;
      signal_date: string;
      source_url?: string | null;
      score?: number | null;
      metadata?: Json | null;
      detected_at?: string;
      viewed?: boolean;
      viewed_at?: string | null;
      dismissed?: boolean;
      dismissed_at?: string | null;
    };
    Update: {
      id?: string;
      account_id?: string;
      signal_type?: string;
      severity?: string;
      description?: string;
      signal_date?: string;
      source_url?: string | null;
      score?: number | null;
      metadata?: Json | null;
      detected_at?: string;
      viewed?: boolean;
      viewed_at?: string | null;
      dismissed?: boolean;
      dismissed_at?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'account_signals_account_id_fkey';
        columns: ['account_id'];
        referencedRelation: 'tracked_accounts';
        referencedColumns: ['id'];
      }
    ];
  };
  research_outputs: {
    Row: {
      id: string;
      user_id: string;
      subject: string;
      markdown_report: string | null;
      sources: Json | null;
      metadata: Json | null;
      created_at: string;
      updated_at: string;
      account_id: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      subject: string;
      markdown_report?: string | null;
      sources?: Json | null;
      metadata?: Json | null;
      created_at?: string;
      updated_at?: string;
      account_id?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      subject?: string;
      markdown_report?: string | null;
      sources?: Json | null;
      metadata?: Json | null;
      created_at?: string;
      updated_at?: string;
      account_id?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'research_outputs_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'research_outputs_account_id_fkey';
        columns: ['account_id'];
        referencedRelation: 'tracked_accounts';
        referencedColumns: ['id'];
      }
    ];
  };
  chats: {
    Row: {
      id: string;
      user_id: string;
      title: string | null;
      created_at: string;
      updated_at: string;
      archived: boolean;
    };
    Insert: {
      id?: string;
      user_id: string;
      title?: string | null;
      created_at?: string;
      updated_at?: string;
      archived?: boolean;
    };
    Update: {
      id?: string;
      user_id?: string;
      title?: string | null;
      created_at?: string;
      updated_at?: string;
      archived?: boolean;
    };
    Relationships: [
      {
        foreignKeyName: 'chats_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  messages: {
    Row: {
      id: string;
      chat_id: string;
      role: string;
      content: string;
      metadata: Json | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      chat_id: string;
      role: string;
      content: string;
      metadata?: Json | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      chat_id?: string;
      role?: string;
      content?: string;
      metadata?: Json | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'messages_chat_id_fkey';
        columns: ['chat_id'];
        referencedRelation: 'chats';
        referencedColumns: ['id'];
      }
    ];
  };
  usage_logs: {
    Row: {
      id: string;
      user_id: string;
      tokens_used: number;
      credits_charged: number;
      metadata: Json | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id: string;
      tokens_used: number;
      credits_charged: number;
      metadata?: Json | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      tokens_used?: number;
      credits_charged?: number;
      metadata?: Json | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'usage_logs_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  bulk_research_jobs: {
    Row: {
      id: string;
      user_id: string;
      status: string;
      total_accounts: number;
      completed_accounts: number;
      failed_accounts: number;
      created_at: string;
      updated_at: string;
      metadata: Json | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      status: string;
      total_accounts: number;
      completed_accounts?: number;
      failed_accounts?: number;
      created_at?: string;
      updated_at?: string;
      metadata?: Json | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      status?: string;
      total_accounts?: number;
      completed_accounts?: number;
      failed_accounts?: number;
      created_at?: string;
      updated_at?: string;
      metadata?: Json | null;
    };
    Relationships: [
      {
        foreignKeyName: 'bulk_research_jobs_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  user_preferences: {
    Row: {
      id: string;
      user_id: string;
      key: string;
      value: Json;
      source: string;
      confidence: number | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      key: string;
      value: Json;
      source: string;
      confidence?: number | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      key?: string;
      value?: Json;
      source?: string;
      confidence?: number | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'user_preferences_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  entity_aliases: {
    Row: {
      id: string;
      canonical: string;
      aliases: string[];
      type: string;
      metadata: Json | null;
      source: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      canonical: string;
      aliases: string[];
      type: string;
      metadata?: Json | null;
      source?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      canonical?: string;
      aliases?: string[];
      type?: string;
      metadata?: Json | null;
      source?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  user_entity_aliases: {
    Row: {
      id: string;
      user_id: string;
      alias: string;
      alias_normalized: string;
      canonical: string;
      type: string;
      metadata: Json | null;
      source: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      alias: string;
      alias_normalized?: string;
      canonical: string;
      type?: string;
      metadata?: Json | null;
      source?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      alias?: string;
      alias_normalized?: string;
      canonical?: string;
      type?: string;
      metadata?: Json | null;
      source?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'user_entity_aliases_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
  open_questions: {
    Row: {
      id: string;
      user_id: string;
      question: string;
      context: Json | null;
      asked_at: string | null;
      resolved_at: string | null;
      resolution: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      user_id: string;
      question: string;
      context?: Json | null;
      asked_at?: string | null;
      resolved_at?: string | null;
      resolution?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      question?: string;
      context?: Json | null;
      asked_at?: string | null;
      resolved_at?: string | null;
      resolution?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: 'open_questions_user_id_fkey';
        columns: ['user_id'];
        referencedRelation: 'users';
        referencedColumns: ['id'];
      }
    ];
  };
} & {
  [key: string]: GenericTable;
};

export interface Database {
  public: {
    Tables: PublicTables;
    Views: {
      [key: string]: {
        Row: Record<string, Json | undefined>;
        Relationships: GenericRelationship[];
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, Json | undefined>;
        Returns: Json;
      };
    };
    Enums: Record<string, string[]>;
    CompositeTypes: Record<string, Record<string, Json | undefined>>;
  };
}
