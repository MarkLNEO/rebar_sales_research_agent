# RebarHQ Platform Analysis: Deep Dive into Prompting & Evolution Strategy

## Executive Summary

**What You've Built**: An AI-powered B2B intelligence platform that transforms generic company research into hyper-personalized, actionable sales intelligence by learning and adapting to each user's unique ICP, criteria, and preferences.

**Core Value Proposition**: "Know what your user wants before they do" - A self-evolving research assistant that gets smarter with every interaction.

---

## 1. PLATFORM UNDERSTANDING

### Who It's For
**Primary Users**: B2B sales professionals (AEs, SDRs, Sales Leaders) who need:
- Deep company intelligence for outbound prospecting
- Personalized outreach angles based on real-time signals
- Automated account monitoring and qualification
- Custom criteria evaluation (not generic "company size" but "uses Python + AWS + has 20+ engineers")

**User Personas**:
1. **Enterprise AE** (Zscaler example): Selling to Fortune 500 CISOs, needs security incident signals, compliance frameworks, procurement patterns
2. **SMB Sales Rep**: Needs quick qualification, tech stack compatibility, growth signals
3. **Sales Leader**: Needs team-wide ICP consistency, bulk research, account prioritization

### Core Value Propositions

**1. Hyper-Personalization**
- Not "here's what I found about Acme Corp"
- But "here's why Acme Corp fits YOUR ICP, matches YOUR 5 custom criteria, triggered YOUR buying signals, and here are 3 angles YOUR competitors won't have"

**2. Learning System**
- Stated preferences: User explicitly defines ICP, criteria, signals
- Observed preferences: System learns from:
  - Which research formats they save
  - Which sections they expand/skip
  - Which accounts they track
  - Which follow-up questions they ask
  - Research depth choices (quick vs deep)

**3. Proactive Intelligence**
- Monitors tracked accounts for signal changes
- Suggests new accounts matching evolving ICP
- Predicts next research needs based on patterns
- Auto-generates personalized outreach drafts

### What Makes It Better Than Alternatives

**vs. Generic AI (ChatGPT/Claude)**:
- ❌ Generic: "Tell me about Acme Corp" → Generic company overview
- ✅ RebarHQ: Automatically evaluates against YOUR custom criteria, YOUR signals, YOUR ICP

**vs. Sales Intelligence Tools (ZoomInfo, Apollo)**:
- ❌ Static data dumps, no synthesis
- ✅ RebarHQ: Strategic synthesis with "why now" timing, personalization hooks, competitive angles

**vs. Manual Research**:
- ❌ 2-3 hours per account, inconsistent quality
- ✅ RebarHQ: 5-10 minutes, consistent framework, learns what matters to YOU

---

## 2. CURRENT PROMPTING ANALYSIS

### What's Working Well ✅

**1. Instruction Hierarchy** (ResearchAgent.ts:31-36)
```
Priority 1: User's explicit requests override everything
Priority 2: Complete research with actionable insights before yielding
Priority 3: Balance speed with depth based on query complexity
```
- **Why it works**: Prevents AI from being overly cautious or asking permission
- **Impact**: Autonomous operation, no "should I continue?" questions

**2. Persistence & Autonomy** (lines 81-87)
```
- Find at least 3 actionable insights before stopping
- If initial searches are surface-level, automatically dig deeper
- Never ask "should I continue?" - determine completeness autonomously
```
- **Why it works**: Eliminates back-and-forth, delivers complete value in one shot
- **Impact**: User gets actionable intelligence, not generic observations

**3. Pattern Recognition** (lines 104-122)
```
"Hired 5 engineers" → "Building capability for [specific initiative]"
"New VP from [Company]" → "Implementing [Company]'s playbook"
```
- **Why it works**: Transforms data into strategic insights
- **Impact**: Competitive advantage through synthesis, not just data collection

**4. Context Injection** (BaseAgent.ts:126-150)
- Custom criteria with importance levels
- Signal preferences with lookback windows
- Disqualifying criteria to save time
- **Why it works**: Every research run is personalized without user repeating themselves

### Critical Gaps & Rigidity Issues ❌

**1. NO PREFERENCE LEARNING LOOP**
```typescript
// Current: User context is STATIC
Current User Context:
- Company: ${this.context.profile?.company_name}
- Custom Criteria: ${this.context.customCriteria?.length || 0}
```

**Problem**: The system shows user preferences but doesn't LEARN from behavior
- ❌ Doesn't track which research formats user saves
- ❌ Doesn't notice user always asks for "tech stack" first
- ❌ Doesn't learn user prefers concise vs detailed
- ❌ Doesn't adapt based on which accounts user tracks

**Impact**: System stays static, doesn't evolve with user

---

**2. PREFERENCE SYSTEM IS WRITE-ONLY**

Looking at `lib/preferences/store.ts`:
```typescript
export async function upsertPreferences(
  userId: string,
  preferences: PreferenceUpsert[],
  client?: SupabaseClient<Database>
): Promise<string[]>
```

**Problem**: Preferences can be WRITTEN but aren't INJECTED into prompts
- ✅ Has `user_preferences` table with confidence scores
- ✅ Has preference sources (setup, followup, implicit, system)
- ❌ **NOT USED IN PROMPTS** - preferences stored but not retrieved for research

**Critical Missing Link**:
```typescript
// SHOULD EXIST BUT DOESN'T:
const userPrefs = await getResolvedPreferences(userId);

// Then inject into prompt:
<learned_preferences>
User typically focuses on: ${userPrefs.focus.areas}
Preferred research depth: ${userPrefs.coverage.depth}
Preferred output brevity: ${userPrefs.summary.brevity}
Tone preference: ${userPrefs.tone}
</learned_preferences>
```

---

**3. NO IMPLICIT LEARNING MECHANISMS**

**Missing Observation Points**:
- Which sections of research reports do users expand?
- Which accounts do they save/track after research?
- What follow-up questions do they ask?
- Which email drafts do they use vs edit?
- How often do they switch between quick/deep modes?

**Should Track & Learn**:
```typescript
// After user saves research:
await upsertPreferences(userId, [
  { key: 'focus.primary_section', value: 'buying_signals', confidence: 0.7, source: 'implicit' },
  { key: 'coverage.preferred_depth', value: 'deep', confidence: 0.6, source: 'implicit' }
]);

// After user asks follow-up about tech stack 3 times:
await upsertPreferences(userId, [
  { key: 'focus.always_include', value: ['tech_stack', 'engineering_team'], confidence: 0.8, source: 'implicit' }
]);
```

---

**4. PROMPTS ARE TOO PRESCRIPTIVE ON FORMAT**

Current (BaseAgent.ts:318-368):
```
### 1. EXECUTIVE SUMMARY
### 2. COMPANY OVERVIEW
### 3. LEADERSHIP TEAM
### 4. RECENT ACTIVITY & BUYING SIGNALS
### 5. TECHNOLOGY & INFRASTRUCTURE
### 6. CUSTOM CRITERIA ASSESSMENT
### 7. PERSONALIZATION POINTS
### 8. RECOMMENDED ACTIONS
```

**Problem**: Rigid structure doesn't adapt to:
- User who only cares about buying signals + tech stack
- User who needs compliance focus (CISO persona)
- User who wants competitive intelligence first

**Should Be**:
```typescript
// Dynamic section ordering based on user preferences
const sections = buildDynamicSections(userPrefs, customCriteria);

<output_structure>
${sections.map((s, i) => `${i+1}. ${s.name} ${s.required ? '(REQUIRED)' : '(if relevant)'}`).join('\n')}
</output_structure>
```

---

**5. NO MEMORY OF PAST RESEARCH**

**Current**: Each research is isolated
- User researches "Acme Corp" today
- User researches "Acme Corp" next week
- System doesn't say "Last time we found X, here's what's NEW"

**Should Have**:
```typescript
<research_history>
Previous research on ${company}:
- Date: ${lastResearch.date}
- Key findings: ${lastResearch.summary}
- Signals detected: ${lastResearch.signals}
- **Focus on CHANGES since last research**
</research_history>
```

---

**6. AUTONOMOUS OPERATION IS TOO AGGRESSIVE**

Current (ResearchAgent.ts:53-79):
```
NEVER ask these types of clarifying questions:
- "What type of research would be most helpful?"
- "Should I focus on any specific area?"
```

**Problem**: Sometimes users DO want to guide the research
- User: "Research Acme Corp" → System does full deep dive (expensive, time-consuming)
- User might have wanted: "Just check if they use AWS"

**Should Be**: Smart clarification based on context
```typescript
if (query.isVague && !userPrefs.coverage.default_mode) {
  // First-time user or ambiguous request
  return "I can do a quick brief (2-3 min) or deep intelligence (5-10 min). Which would help more right now?"
} else {
  // User has established preference, just go
  proceed_with_research(userPrefs.coverage.default_mode);
}
```

---

## 3. WHAT WOULD MAKE IT EVEN BETTER

### Priority 1: Close the Learning Loop 🔄

**Implement Implicit Preference Learning**:

```typescript
// After every research interaction:
class PreferenceLearner {
  async learnFromResearchSave(userId: string, research: Research) {
    const preferences: PreferenceUpsert[] = [];
    
    // Learn from what they saved
    if (research.saved_sections.includes('tech_stack')) {
      preferences.push({
        key: 'focus.tech_stack_priority',
        value: true,
        confidence: 0.7,
        source: 'implicit'
      });
    }
    
    // Learn from research depth chosen
    preferences.push({
      key: 'coverage.preferred_depth',
      value: research.depth_used,
      confidence: 0.6,
      source: 'implicit'
    });
    
    await upsertPreferences(userId, preferences);
  }
  
  async learnFromFollowUp(userId: string, question: string) {
    // If user asks "what about their tech stack?" multiple times
    // → Learn they care about tech stack
    const focusArea = extractFocusArea(question);
    if (focusArea) {
      await upsertPreferences(userId, [{
        key: `focus.priority_areas`,
        value: [focusArea],
        confidence: 0.65,
        source: 'implicit'
      }]);
    }
  }
}
```

---

### Priority 2: Inject Learned Preferences into Prompts

**Modify BaseAgent to use preferences**:

```typescript
protected async buildSystemPrompt(): Promise<string> {
  // Fetch learned preferences
  const { resolved } = await getResolvedPreferences(this.context.userId);
  
  let prompt = `You are an elite B2B research intelligence agent.
  
<learned_user_preferences>
Research Depth: ${resolved.coverage.depth} (learned from ${resolved.coverage.confidence} interactions)
Primary Focus Areas: ${resolved.focus.areas?.join(', ') || 'Not yet learned'}
Output Brevity: ${resolved.summary.brevity}
Tone: ${resolved.tone}

${resolved.focus.always_include?.length > 0 ? `
ALWAYS include these sections (user has shown consistent interest):
${resolved.focus.always_include.map(s => `- ${s}`).join('\n')}
` : ''}

${resolved.focus.skip_unless_relevant?.length > 0 ? `
Skip these unless highly relevant (user rarely engages):
${resolved.focus.skip_unless_relevant.map(s => `- ${s}`).join('\n')}
` : ''}
</learned_user_preferences>
`;
  
  return prompt;
}
```

---

### Priority 3: Adaptive Section Ordering

**Dynamic research structure based on user behavior**:

```typescript
function buildAdaptiveSections(userPrefs: ResolvedPrefs, customCriteria: CustomCriteria[]): Section[] {
  const sections: Section[] = [
    { name: 'Executive Summary', priority: 100, required: true },
  ];
  
  // Add sections based on learned preferences
  if (userPrefs.focus.areas?.includes('buying_signals')) {
    sections.push({ name: 'Buying Signals', priority: 90, required: true });
  }
  
  if (userPrefs.focus.areas?.includes('tech_stack')) {
    sections.push({ name: 'Technology Stack', priority: 85, required: true });
  }
  
  if (customCriteria.length > 0) {
    sections.push({ name: 'Custom Criteria Assessment', priority: 80, required: true });
  }
  
  // Lower priority sections (include if relevant)
  sections.push({ name: 'Company Overview', priority: 50, required: false });
  sections.push({ name: 'Leadership Team', priority: 40, required: false });
  
  return sections.sort((a, b) => b.priority - a.priority);
}
```

---

### Priority 4: Research Memory & Delta Detection

**Track what's been researched before**:

```typescript
<research_context>
${previousResearch ? `
Previous research on ${company} (${previousResearch.date}):
- Key findings: ${previousResearch.key_findings}
- Signals detected: ${previousResearch.signals}
- ICP fit score: ${previousResearch.icp_score}

**YOUR TASK**: Focus on CHANGES and NEW information since ${previousResearch.date}.
Highlight:
- New signals that emerged
- Changes in leadership/tech stack
- Updated ICP fit assessment
- New personalization angles
` : `
First-time research on ${company}. Provide comprehensive analysis.
`}
</research_context>
```

---

### Priority 5: Proactive Suggestions

**System should suggest next actions based on patterns**:

```typescript
// After 3 research sessions on similar companies:
async function generateProactiveSuggestions(userId: string) {
  const recentResearch = await getRecentResearch(userId, limit: 10);
  const patterns = analyzePatterns(recentResearch);
  
  if (patterns.common_industry && patterns.common_criteria) {
    return {
      type: 'bulk_research_suggestion',
      message: `I noticed you've researched ${patterns.count} ${patterns.common_industry} companies. 
      Want me to find 20 more companies matching your criteria and research them in bulk?`,
      action: 'start_bulk_research',
      params: {
        industry: patterns.common_industry,
        criteria: patterns.common_criteria
      }
    };
  }
}
```

---

### Priority 6: Confidence-Based Prompting

**Adjust autonomy based on confidence**:

```typescript
function getAutonomyLevel(userPrefs: ResolvedPrefs): 'high' | 'medium' | 'low' {
  // High confidence → Full autonomy
  if (userPrefs.coverage.confidence > 0.8) {
    return 'high'; // Just do it, don't ask
  }
  
  // Medium confidence → Offer choice
  if (userPrefs.coverage.confidence > 0.5) {
    return 'medium'; // "I'll do X unless you prefer Y"
  }
  
  // Low confidence → Ask
  return 'low'; // "Would you like quick or deep research?"
}

// In prompt:
<autonomy_level>
${autonomyLevel === 'high' ? `
Proceed with research using learned preferences. Don't ask for confirmation.
` : autonomyLevel === 'medium' ? `
Suggest your approach but offer alternatives if user might want different depth/focus.
` : `
Ask clarifying questions to establish preferences for future research.
`}
</autonomy_level>
```

---

## 4. IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
1. ✅ Fix syntax errors (em-dash issue)
2. ✅ Remove OPENAI_PROJECT auth issue
3. **Connect preferences to prompts**:
   - Modify `BaseAgent.buildSystemPrompt()` to call `getResolvedPreferences()`
   - Inject learned preferences into system prompt
4. **Add preference tracking hooks**:
   - Track when user saves research
   - Track research depth choices
   - Track follow-up question patterns

### Phase 2: Learning Loop (Week 3-4)
1. **Implement `PreferenceLearner` class**:
   - `learnFromResearchSave()`
   - `learnFromFollowUp()`
   - `learnFromAccountTracking()`
2. **Add implicit preference capture**:
   - After save → learn section preferences
   - After depth choice → learn coverage preference
   - After follow-up → learn focus areas
3. **Test learning accuracy**:
   - Does system correctly identify user prefers "tech stack first"?
   - Does confidence increase appropriately?

### Phase 3: Adaptive Prompting (Week 5-6)
1. **Dynamic section ordering**:
   - `buildAdaptiveSections()` based on learned preferences
   - Inject into prompt dynamically
2. **Confidence-based autonomy**:
   - High confidence → full autonomy
   - Low confidence → ask clarifying questions
3. **Research memory**:
   - Store research summaries
   - Detect delta on re-research

### Phase 4: Proactive Intelligence (Week 7-8)
1. **Pattern detection**:
   - Analyze research history for patterns
   - Suggest bulk research opportunities
2. **Predictive suggestions**:
   - "Based on your recent research, you might want to look at..."
   - "Company X just triggered your buying signal"
3. **Auto-monitoring**:
   - Track accounts automatically
   - Alert on signal changes

---

## 5. KEY METRICS TO TRACK

**Learning Effectiveness**:
- Preference confidence scores over time
- % of research sessions using learned preferences
- User satisfaction with adaptive vs static prompts

**Value Delivery**:
- Time to actionable insight (target: <5 min)
- % of research leading to tracked accounts
- % of research leading to outreach

**System Evolution**:
- Preference drift over time (user needs change)
- Accuracy of proactive suggestions
- Reduction in clarifying questions needed

---

## 6. COMPETITIVE MOAT

**What makes this defensible**:
1. **Personalization Depth**: Not just "company research" but "research that matches YOUR exact criteria"
2. **Learning System**: Gets smarter with every interaction (network effects per user)
3. **Proactive Intelligence**: Doesn't wait for user to ask, suggests next moves
4. **Integration**: Supabase + OpenAI + custom learning layer = hard to replicate

**The Vision**: 
"Your AI research analyst that knows your ICP better than you do, predicts which accounts to research next, and delivers insights your competitors can't get."

---

## CONCLUSION

**Current State**: Strong foundation with autonomous research, custom criteria, and signal detection. But it's a **static system** that doesn't learn.

**Missing Piece**: **The learning loop**. You have all the infrastructure (preferences table, confidence scores, sources) but it's not connected to the prompting system.

**Biggest Impact**: Connect `getResolvedPreferences()` to `buildSystemPrompt()` and start tracking implicit preferences. This single change will transform the system from "smart assistant" to "evolving intelligence."

**Next Steps**:
1. Fix immediate bugs (syntax, auth)
2. Wire up preferences → prompts
3. Add implicit learning hooks
4. Test with real users
5. Iterate based on preference confidence scores

You're 70% there. The last 30% (learning loop) will 10x the value.
