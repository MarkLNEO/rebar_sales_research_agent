/**
 * Implicit Preference Tracker
 * 
 * Automatically learns user preferences from behavior patterns without explicit asks.
 * Tracks: section engagement, research depth patterns, follow-up interests, etc.
 */

import type { PreferenceUpsert } from './store';
import { supabase } from '@/src/lib/supabase';

export type UserInteraction = 
  | { type: 'section_expanded'; section: string; chatId: string }
  | { type: 'section_collapsed'; section: string; chatId: string }
  | { type: 'research_completed'; depth: 'quick' | 'deep'; agentType: string; chatId: string }
  | { type: 'follow_up_asked'; topic: string; chatId: string }
  | { type: 'report_saved'; sections: string[]; chatId: string }
  | { type: 'preference_confirmed'; key: string; value: any; chatId: string };

interface TrackerState {
  sectionEngagement: Map<string, { expanded: number; collapsed: number }>;
  researchDepth: Map<string, number>; // 'quick' or 'deep'
  followUpTopics: Map<string, number>;
  lastTracked: Date;
}

class PreferenceTracker {
  private state: TrackerState;
  private userId: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private pendingPreferences: PreferenceUpsert[] = [];

  constructor() {
    this.state = {
      sectionEngagement: new Map(),
      researchDepth: new Map(),
      followUpTopics: new Map(),
      lastTracked: new Date()
    };
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Track a user interaction and derive implicit preferences
   */
  track(interaction: UserInteraction) {
    if (!this.userId) {
      console.warn('[PreferenceTracker] No userId set, skipping tracking');
      return;
    }

    const preferences = this.derivePreferences(interaction);
    
    if (preferences.length > 0) {
      this.pendingPreferences.push(...preferences);
      this.debounceSave();
    }
  }

  /**
   * Derive preferences from interaction patterns
   */
  private derivePreferences(interaction: UserInteraction): PreferenceUpsert[] {
    const preferences: PreferenceUpsert[] = [];

    switch (interaction.type) {
      case 'section_expanded': {
        // User expanded a section → they care about this
        const stats = this.state.sectionEngagement.get(interaction.section) || { expanded: 0, collapsed: 0 };
        stats.expanded++;
        this.state.sectionEngagement.set(interaction.section, stats);

        // If expanded 3+ times, high interest
        if (stats.expanded >= 3 && stats.expanded > stats.collapsed * 2) {
          const key = this.sectionToPreferenceKey(interaction.section);
          preferences.push({
            key,
            value: true,
            confidence: Math.min(0.7 + (stats.expanded * 0.05), 0.9),
            source: 'implicit'
          });
        }
        break;
      }

      case 'section_collapsed': {
        // User collapsed a section → less interested
        const stats = this.state.sectionEngagement.get(interaction.section) || { expanded: 0, collapsed: 0 };
        stats.collapsed++;
        this.state.sectionEngagement.set(interaction.section, stats);

        // If collapsed 3+ times, low interest
        if (stats.collapsed >= 3 && stats.collapsed > stats.expanded * 2) {
          const key = this.sectionToPreferenceKey(interaction.section);
          preferences.push({
            key,
            value: false,
            confidence: Math.min(0.6 + (stats.collapsed * 0.05), 0.85),
            source: 'implicit'
          });
        }
        break;
      }

      case 'research_completed': {
        // Track research depth preference
        const depthCount = this.state.researchDepth.get(interaction.depth) || 0;
        this.state.researchDepth.set(interaction.depth, depthCount + 1);

        const totalResearches = Array.from(this.state.researchDepth.values()).reduce((a, b) => a + b, 0);
        
        // After 5+ researches, infer depth preference
        if (totalResearches >= 5) {
          const deepCount = this.state.researchDepth.get('deep') || 0;
          const quickCount = this.state.researchDepth.get('quick') || 0;
          
          if (deepCount > quickCount * 2) {
            preferences.push({
              key: 'coverage.depth',
              value: 'deep',
              confidence: Math.min(0.65 + (deepCount / totalResearches) * 0.2, 0.85),
              source: 'implicit'
            });
          } else if (quickCount > deepCount * 2) {
            preferences.push({
              key: 'coverage.depth',
              value: 'shallow',
              confidence: Math.min(0.65 + (quickCount / totalResearches) * 0.2, 0.85),
              source: 'implicit'
            });
          }
        }
        break;
      }

      case 'follow_up_asked': {
        // Track topics user asks follow-ups about
        const topicCount = this.state.followUpTopics.get(interaction.topic) || 0;
        this.state.followUpTopics.set(interaction.topic, topicCount + 1);

        // After 3+ follow-ups on same topic, high interest
        if (topicCount >= 2) {
          preferences.push({
            key: `focus.${interaction.topic.toLowerCase().replace(/\s+/g, '_')}`,
            value: true,
            confidence: Math.min(0.6 + (topicCount * 0.1), 0.85),
            source: 'implicit'
          });
        }
        break;
      }

      case 'report_saved': {
        // User saved a report → they liked these sections
        for (const section of interaction.sections) {
          const key = this.sectionToPreferenceKey(section);
          preferences.push({
            key,
            value: true,
            confidence: 0.65, // Moderate confidence from saves
            source: 'implicit'
          });
        }
        break;
      }

      case 'preference_confirmed': {
        // User explicitly confirmed a preference (high confidence)
        preferences.push({
          key: interaction.key,
          value: interaction.value,
          confidence: 0.95,
          source: 'followup'
        });
        break;
      }
    }

    return preferences;
  }

  /**
   * Convert section name to preference key
   */
  private sectionToPreferenceKey(section: string): string {
    const normalized = section.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
    
    // Map common sections to preference keys
    const mapping: Record<string, string> = {
      'tech_stack': 'focus.tech_stack',
      'technology': 'focus.tech_stack',
      'decision_makers': 'focus.decision_makers',
      'buying_signals': 'focus.signals',
      'signals': 'focus.signals',
      'custom_criteria': 'focus.criteria',
      'criteria': 'focus.criteria',
      'risks_gaps': 'focus.risks',
      'risks': 'focus.risks',
      'competitive': 'focus.competitive',
      'market': 'focus.market'
    };

    return mapping[normalized] || `focus.${normalized}`;
  }

  /**
   * Debounce saves to avoid too many API calls
   */
  private debounceSave() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, 3000); // Save after 3 seconds of no activity
  }

  /**
   * Flush pending preferences to API
   */
  async flush() {
    if (!this.userId || this.pendingPreferences.length === 0) {
      return;
    }

    const prefsToSave = [...this.pendingPreferences];
    this.pendingPreferences = [];

    try {
      // Deduplicate by key (keep highest confidence)
      const deduped = new Map<string, PreferenceUpsert>();
      for (const pref of prefsToSave) {
        const existing = deduped.get(pref.key);
        if (!existing || (pref.confidence || 0) > (existing.confidence || 0)) {
          deduped.set(pref.key, pref);
        }
      }

      // Save via API
      const authToken = await this.getAuthToken();
      if (!authToken) {
        console.warn('[PreferenceTracker] No auth token, cannot save preferences');
        return;
      }

      const promises = Array.from(deduped.values()).map(pref =>
        fetch('/api/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(pref)
        })
      );

      await Promise.all(promises);
      console.log(`[PreferenceTracker] Saved ${deduped.size} implicit preferences`);
    } catch (error) {
      console.error('[PreferenceTracker] Failed to save preferences:', error);
      // Re-add to pending if failed
      this.pendingPreferences.push(...prefsToSave);
    }
  }

  /**
   * Get auth token from localStorage or cookies
   */
  private async getAuthToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (token) {
        return token;
      }
    } catch (error) {
      console.warn('[PreferenceTracker] Failed to retrieve session for auth token', error);
    }

    try {
      const stored = localStorage.getItem('supabase.auth.token');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'string') return parsed;
        if (parsed?.access_token) return parsed.access_token;
      }
    } catch {
      // Ignore JSON parse errors
    }

    try {
      const match = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
      const projectRef = match ? match[1] : null;
      if (projectRef) {
        const key = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.access_token) return parsed.access_token;
        }
      }
    } catch {
      // Ignore JSON parse errors
    }

    return null;
  }

  /**
   * Get current state for debugging
   */
  getState(): TrackerState {
    return { ...this.state };
  }

  /**
   * Reset state (useful for testing)
   */
  reset() {
    this.state = {
      sectionEngagement: new Map(),
      researchDepth: new Map(),
      followUpTopics: new Map(),
      lastTracked: new Date()
    };
    this.pendingPreferences = [];
  }
}

// Singleton instance
export const preferenceTracker = new PreferenceTracker();

// Helper function for React components
export function usePreferenceTracking(userId: string | undefined) {
  if (userId && typeof window !== 'undefined') {
    preferenceTracker.setUserId(userId);
  }
  
  return {
    track: (interaction: UserInteraction) => preferenceTracker.track(interaction),
    flush: () => preferenceTracker.flush(),
    getState: () => preferenceTracker.getState()
  };
}
