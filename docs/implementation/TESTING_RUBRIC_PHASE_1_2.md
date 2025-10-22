# 🧪 Testing Rubric: Phase 1 & 2 GPT-5 Optimizations

**Date**: October 22, 2025  
**Purpose**: Validate Phase 1 (Reliability) and Phase 2 (Planning & Transparency) optimizations  
**Duration**: 2-4 hours for comprehensive testing

---

## 📋 Testing Overview

### **What We're Testing**

**Phase 1 Features**:
1. ✅ Numbered instruction hierarchy (conflict resolution)
2. ✅ Enhanced deduplication (4-step process)
3. ✅ Validation loop (self-correction)
4. ✅ Parallel query optimization

**Phase 2 Features**:
5. ✅ Conceptual planning checklist (3-7 bullets)
6. ✅ Tool preambles (purpose + inputs)
7. ✅ Better query examples

---

## 🎯 Testing Categories

### **Category A: Planning & Transparency** (30 points)
- Planning checklists appear and are useful
- Purpose statements before tool calls
- Clear reasoning visibility

### **Category B: Reliability & Accuracy** (40 points)
- Self-correction when needed
- Deduplication of redundant info
- Contradiction resolution
- Source quality

### **Category C: Output Quality** (30 points)
- Relevant results
- Clear structure
- Actionable insights
- No verbosity issues

**Total Possible Score**: 100 points

---

## 🧪 Test Scenarios

### **Test 1: Standard Company Research** ⭐ (Easy)

**Scenario**: Research a well-known tech company  
**Test Company**: `Stripe`  
**Difficulty**: Easy (abundant data available)

**Steps**:
1. Start fresh chat session
2. Enter: `"Research Stripe"`
3. Observe full output
4. Document findings

**Expected Behaviors**:

✅ **Planning Checklist** (10 points):
- [ ] Checklist appears before research starts
- [ ] Contains 3-7 conceptual bullets
- [ ] Items are relevant to task
- [ ] Not too technical or granular

Example:
```
🎯 Research Plan:
- Assess ICP fit based on Fortune 500 and payment infrastructure
- Search for recent buying signals (funding, hiring, product launches)
- Identify key decision makers in payments and finance
- Analyze timing factors and market position
- Synthesize actionable recommendations
```

**Scoring**:
- **10 pts**: Perfect checklist (3-7 relevant items)
- **7 pts**: Checklist present but too generic
- **4 pts**: Checklist present but too detailed/technical
- **0 pts**: No checklist or completely irrelevant

---

✅ **Tool Preambles** (10 points):
- [ ] Purpose stated before web searches
- [ ] Inputs clearly specified
- [ ] Not overly verbose

Example:
```
🔍 Purpose: Find recent buying signals. 
   Inputs: Funding rounds, executive hires, product launches (last 90 days)
```

**Scoring**:
- **10 pts**: Clear purpose + inputs every time
- **7 pts**: Purpose/inputs present but sometimes missing
- **4 pts**: Too verbose or unclear
- **0 pts**: No purpose statements

---

✅ **Deduplication** (15 points):
- [ ] No duplicate information from multiple sources
- [ ] Consolidated facts properly
- [ ] Sources cited clearly

**Scoring**:
- **15 pts**: Perfect consolidation, no duplicates
- **10 pts**: Minor duplicates (1-2 instances)
- **5 pts**: Several duplicates
- **0 pts**: Significant redundancy

---

✅ **Output Quality** (15 points):
- [ ] Relevant insights about Stripe
- [ ] Clear structure
- [ ] Actionable recommendations
- [ ] Not overly verbose

**Scoring**:
- **15 pts**: Excellent quality, actionable, concise
- **10 pts**: Good quality, minor issues
- **5 pts**: Relevant but verbose or unclear
- **0 pts**: Poor quality or off-topic

---

**Test 1 Total**: 50 points

---

### **Test 2: Company with Conflicting Data** ⭐⭐ (Medium)

**Scenario**: Research a company with contradictory information online  
**Test Company**: Choose a company that recently had conflicting news (IPO rumors, acquisition talks, etc.)  
**Example**: `WeWork` or recent startup with mixed signals  
**Difficulty**: Medium (contradictory sources)

**Steps**:
1. Start fresh chat
2. Enter: `"Research [Company with contradictions]"`
3. Look specifically for how contradictions are handled
4. Document validation/correction behaviors

**Expected Behaviors**:

✅ **Validation Loop** (20 points):
- [ ] Agent notices contradictions
- [ ] Validates information
- [ ] States which sources are more credible
- [ ] Self-corrects when needed

Example:
```
✅ Validated: Found conflicting revenue data
   - TechCrunch reports $500M ARR (Oct 2024)
   - Company PR states $450M ARR (Sept 2024)
   → Prioritizing official company PR as more credible
```

**Scoring**:
- **20 pts**: Explicitly catches and resolves contradictions
- **15 pts**: Notices contradictions but resolution unclear
- **10 pts**: Contradictions present but not addressed
- **0 pts**: Reports contradictions as fact without validation

---

✅ **Deduplication with Conflicts** (15 points):
- [ ] Multiple sources consolidated
- [ ] Conflicts explicitly resolved
- [ ] Reasoning for resolution stated

**Scoring**:
- **15 pts**: Perfect conflict resolution with reasoning
- **10 pts**: Conflicts resolved but reasoning unclear
- **5 pts**: Some conflicts unresolved
- **0 pts**: Contradictions reported without resolution

---

✅ **Source Quality** (15 points):
- [ ] Prioritizes credible sources
- [ ] Recent sources preferred
- [ ] Official sources > rumors
- [ ] Citations include dates

**Scoring**:
- **15 pts**: Excellent source prioritization
- **10 pts**: Good sources, minor issues
- **5 pts**: Mixed source quality
- **0 pts**: Poor source selection

---

**Test 2 Total**: 50 points

---

### **Test 3: Follow-Up Questions** ⭐ (Easy)

**Scenario**: Test follow-up behavior and context awareness  
**Initial Query**: `"Research Salesforce"`  
**Follow-Up**: `"What about their AI strategy?"`  
**Difficulty**: Easy (tests context + focus)

**Steps**:
1. Initial research: `"Research Salesforce"`
2. Wait for completion
3. Follow-up: `"What about their AI strategy?"`
4. Observe planning and execution

**Expected Behaviors**:

✅ **Focused Planning** (10 points):
- [ ] Checklist reflects focused scope
- [ ] References prior context
- [ ] Doesn't restart full research

Example:
```
🎯 Research Plan:
- Review Salesforce's recent AI announcements
- Identify Einstein AI platform developments
- Search for AI partnership news
- Analyze competitive AI positioning
```

**Scoring**:
- **10 pts**: Focused plan referencing context
- **7 pts**: Plan present but too broad
- **4 pts**: Ignores context, starts over
- **0 pts**: No clear plan

---

✅ **Targeted Search** (10 points):
- [ ] Purpose statement reflects focused scope
- [ ] Doesn't repeat previous research
- [ ] Specific to AI topic

**Scoring**:
- **10 pts**: Perfectly focused on AI
- **7 pts**: Focused but some redundancy
- **4 pts**: Partially redundant
- **0 pts**: Completely redundant research

---

**Test 3 Total**: 20 points

---

### **Test 4: Edge Case - Minimal Data** ⭐⭐⭐ (Hard)

**Scenario**: Research a company with limited online presence  
**Test Company**: Small B2B startup or private company  
**Example**: Find a Series A startup in a niche market  
**Difficulty**: Hard (sparse data)

**Steps**:
1. Find a company with limited public data
2. Enter: `"Research [Small Company]"`
3. Observe self-correction behavior
4. Check how gaps are handled

**Expected Behaviors**:

✅ **Self-Correction on Missing Data** (15 points):
- [ ] Agent notices lack of data
- [ ] Attempts alternative searches
- [ ] Explicitly states gaps
- [ ] Doesn't fabricate information

Example:
```
❌ Initial search found limited financial data
✅ Self-correct: Searching job postings for growth indicators
✅ Self-correct: Checking LinkedIn for team size and hiring

Result: "Limited public financial data. Based on LinkedIn showing 50-75 employees and 10 recent hires, estimated early growth stage."
```

**Scoring**:
- **15 pts**: Excellent self-correction, no fabrication
- **10 pts**: Some self-correction, mostly accurate
- **5 pts**: Limited self-correction
- **0 pts**: Fabricates data or gives up

---

✅ **Honest Gap Reporting** (15 points):
- [ ] Clearly states what's unknown
- [ ] Doesn't present guesses as facts
- [ ] Suggests alternative approaches
- [ ] Still provides value despite gaps

**Scoring**:
- **15 pts**: Honest, valuable despite limitations
- **10 pts**: Mostly honest, some uncertainty
- **5 pts**: Unclear about gaps
- **0 pts**: Fabricates or unhelpful

---

**Test 4 Total**: 30 points

---

## 📊 Scoring Summary

### **Total Possible Points**: 150

| Test | Category | Max Points | Your Score |
|------|----------|------------|------------|
| **Test 1: Standard Research** | Planning & Quality | 50 | ___ |
| **Test 2: Conflicting Data** | Validation & Reliability | 50 | ___ |
| **Test 3: Follow-Up** | Context Awareness | 20 | ___ |
| **Test 4: Edge Case** | Self-Correction | 30 | ___ |
| **TOTAL** | | **150** | ___ |

---

## 🎯 Success Criteria

### **Grade Thresholds**

| Grade | Score Range | Interpretation |
|-------|-------------|----------------|
| **A+** | 140-150 | Excellent - Ready for production |
| **A** | 130-139 | Very good - Minor tweaks only |
| **B** | 110-129 | Good - Some adjustments needed |
| **C** | 90-109 | Acceptable - Significant tuning required |
| **D** | 70-89 | Poor - Major issues, reconsider approach |
| **F** | <70 | Failing - Optimizations not working |

---

### **Minimum Passing Criteria**

**Must achieve ALL of these**:
- ✅ Planning checklist appears consistently (>80% of tests)
- ✅ Self-correction works at least once (Test 2 or 4)
- ✅ Deduplication reduces redundancy (Test 1 & 2)
- ✅ No fabricated information (Test 4)
- ✅ Overall score ≥90 points

---

## 📝 Testing Checklist

### **Pre-Test Setup**
- [ ] Start with fresh browser/session
- [ ] Clear any cached data
- [ ] Have test companies selected
- [ ] Document ready for notes

### **During Testing**
- [ ] Take screenshots of key outputs
- [ ] Copy full outputs for analysis
- [ ] Note timestamps for each test
- [ ] Record unexpected behaviors

### **Post-Test Analysis**
- [ ] Calculate scores for each test
- [ ] Identify patterns (good and bad)
- [ ] Document specific examples
- [ ] Note any bugs or issues

---

## 📋 Results Template

Use this template to document results:

```markdown
# Phase 1 & 2 Testing Results

**Tester**: [Your Name]
**Date**: [Date]
**Session**: [Session ID if applicable]

## Test 1: Standard Research (Stripe)
**Score**: __/50

### Planning Checklist: __/10
- Present: [Yes/No]
- Quality: [Excellent/Good/Poor]
- Notes: 

### Tool Preambles: __/10
- Present: [Yes/No]
- Clarity: [Excellent/Good/Poor]
- Notes:

### Deduplication: __/15
- No duplicates: [Yes/No]
- Consolidation quality: [Excellent/Good/Poor]
- Notes:

### Output Quality: __/15
- Relevance: [Excellent/Good/Poor]
- Actionability: [Excellent/Good/Poor]
- Notes:

**Key Observations**:
- [What worked well]
- [What needs improvement]
- [Specific examples]

---

## Test 2: Conflicting Data ([Company])
**Score**: __/50

### Validation Loop: __/20
- Caught contradictions: [Yes/No]
- Resolution quality: [Excellent/Good/Poor]
- Notes:

### Conflict Resolution: __/15
- Consolidated properly: [Yes/No]
- Reasoning clear: [Yes/No]
- Notes:

### Source Quality: __/15
- Prioritization: [Excellent/Good/Poor]
- Citation quality: [Excellent/Good/Poor]
- Notes:

**Key Observations**:
- [What worked well]
- [What needs improvement]
- [Specific examples]

---

## Test 3: Follow-Up (Salesforce AI)
**Score**: __/20

### Focused Planning: __/10
- Context awareness: [Yes/No]
- Scope appropriate: [Yes/No]
- Notes:

### Targeted Search: __/10
- No redundancy: [Yes/No]
- Focus maintained: [Yes/No]
- Notes:

**Key Observations**:
- [What worked well]
- [What needs improvement]

---

## Test 4: Edge Case ([Small Company])
**Score**: __/30

### Self-Correction: __/15
- Attempted alternative searches: [Yes/No]
- Quality: [Excellent/Good/Poor]
- Notes:

### Gap Reporting: __/15
- Honest about limitations: [Yes/No]
- No fabrication: [Yes/No]
- Still valuable: [Yes/No]
- Notes:

**Key Observations**:
- [What worked well]
- [What needs improvement]

---

## Overall Assessment

**Total Score**: __/150
**Grade**: [A+/A/B/C/D/F]

**Pass Minimum Criteria?**: [Yes/No]
- [ ] Planning checklist >80% present
- [ ] Self-correction worked at least once
- [ ] Deduplication effective
- [ ] No fabrication
- [ ] Score ≥90

---

## Recommendations

### What's Working Well:
1. 
2. 
3. 

### What Needs Improvement:
1. 
2. 
3. 

### Specific Adjustments Needed:
1. 
2. 
3. 

### Next Steps:
- [ ] 
- [ ] 
- [ ] 

---

## Decision

**Proceed to Production?**: [Yes/No/With Adjustments]

**Reasoning**:


**If adjustments needed, priority order**:
1. 
2. 
3. 
```

---

## 🎯 Quick Reference Card

**Copy this for easy reference during testing**:

```
TESTING QUICK REFERENCE

Test 1: Stripe (Standard) - 50 pts
→ Check: Planning, Preambles, Dedup, Quality

Test 2: [Conflict Company] - 50 pts  
→ Check: Validation, Conflict resolution, Sources

Test 3: Salesforce → AI follow-up - 20 pts
→ Check: Context awareness, Focus

Test 4: [Small Company] - 30 pts
→ Check: Self-correction, Honest gaps

MUST SEE:
✅ Planning checklist (3-7 bullets)
✅ Purpose before searches
✅ Validation messages (✅/❌)
✅ No duplicate info
✅ No fabricated data

RED FLAGS:
❌ No planning checklist
❌ Contradictions not addressed
❌ Lots of duplicate info
❌ Fabricated data
❌ Overly verbose
```

---

## 🚀 Ready to Test!

**Estimated Time**: 2-4 hours total
- Test 1: 30-45 min
- Test 2: 45-60 min  
- Test 3: 15-20 min
- Test 4: 30-45 min
- Analysis: 30-45 min

**Good luck! Document everything and be objective in scoring.** 📊
