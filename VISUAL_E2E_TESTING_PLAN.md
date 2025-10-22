# 🎯 Visual E2E Testing Plan - Real User Simulation

**Based on**: Real User Testing Blueprint (No Playwright automation)  
**Approach**: Manual browser testing simulating actual user behavior  
**Goal**: Validate 10/10 UAT compliance through realistic user flows

---

## 0️⃣ **What "10/10" Means (First Principles)**

### **Outcome Over Pixels**
- ✅ Users accomplish core jobs-to-be-done quickly and confidently
- ✅ AE's meeting prep, deep company intel, account monitoring work seamlessly
- ✅ No ambiguity or dead-ends in any flow

### **End-to-End Integrity**
- ✅ Signup → Approval → Onboarding → Dashboard → Research → Save → Revisit
- ✅ All transitions smooth and logical
- ✅ No broken states or confusion points

### **Agent Quality**
- ✅ Research outputs accurate, actionable, source-backed
- ✅ Formatted as promised by agent specs
- ✅ Quick vs Deep distinction clear

### **Accessibility & Usability**
- ✅ SUS ≥ 85 (System Usability Scale)
- ✅ SEQ ≥ 6/7 (Single Ease Question)
- ✅ Zero critical blockers in P0 flows

---

## 1️⃣ **Test Environments & Setup**

### **Test Accounts**
1. **New User** (no data)
   - Fresh signup
   - No chat history
   - Full credits

2. **Returning User** (seeded data)
   - 3 saved companies (Stripe, Notion, Salesforce)
   - Chat history with 5+ conversations
   - Low credit balance (8 credits)

### **Sample Data**
- **CSV Files**:
  - `valid_10_companies.csv` (10 rows, clean)
  - `valid_50_companies.csv` (50 rows, clean)
  - `malformed_companies.csv` (missing columns, bad data)

### **Devices/Browsers**
- Desktop Chrome (primary)
- Desktop Safari
- iOS Safari (mobile)
- Android Chrome (mobile)

### **Network Profiles**
- Normal (fast connection)
- Slow 3G (to test streaming/latency)

---

## 2️⃣ **The 10 Core Tasks**

### **T1: Sign Up and Get In**
**Goal**: "Create an account and get to the main dashboard."

**Success Criteria**:
- [ ] Completes signup form without errors
- [ ] Receives approval email (or pending approval message)
- [ ] Can re-enter after approval
- [ ] Reaches dashboard without help
- [ ] No dead-ends or confusion

**Time Expectation**: ≤ 2 minutes  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Email approval handoff clarity
- "Pending approval" messaging
- Re-entry flow after approval

---

### **T2: The 5-Step Onboarding**
**Goal**: "Set up your company so the agent can research for you."

**Success Criteria**:
- [ ] Completes in ≤ 3 minutes (README claim)
- [ ] Company name vs URL distinction clear
- [ ] Progress visibility throughout
- [ ] No redundant questions
- [ ] No unnecessary steps
- [ ] Form copy disambiguates inputs

**Time Expectation**: ≤ 3 minutes  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Clarity of each step
- Progress indicators
- Skip vs required fields
- Completion confirmation

---

### **T3: Quick Brief on a Company**
**Goal**: "Get a quick brief on Salesforce you could skim before a call."

**Success Criteria**:
- [ ] Output matches quick brief schema
- [ ] Includes executive summary
- [ ] Shows key decision makers
- [ ] Lists buying signals
- [ ] Cites sources
- [ ] Feels immediately usable for meeting prep

**Time Expectation**: ≤ 2 minutes  
**SEQ Target**: ≥ 6/7

**Output Quality Rating** (1-5 each):
- [ ] Actionability (explicit next steps)
- [ ] Signal coverage (buying/timing signals)
- [ ] Decision-maker clarity
- [ ] Personalization hooks
- [ ] Evidence (source grounding)

**Target**: Average ≥ 4/5

---

### **T4: Deep Intelligence Run**
**Goal**: "Now get a deep intelligence report on Salesforce for outreach angles."

**Success Criteria**:
- [ ] Delivers full structure (summary → strategic intelligence → recommendations → personalization)
- [ ] Noticeably richer than quick brief
- [ ] User can articulate next action
- [ ] Sources cited throughout
- [ ] Formatted professionally

**Time Expectation**: ≤ 10 minutes  
**SEQ Target**: ≥ 6/7

**Output Quality Rating** (1-5 each):
- [ ] Actionability
- [ ] Signal coverage
- [ ] Decision-maker clarity
- [ ] Personalization hooks
- [ ] Evidence

**Target**: Average ≥ 4/5 (should exceed Quick Brief)

---

### **T5: Save & Find It Later**
**Goal**: "Save this research and find it again."

**Success Criteria**:
- [ ] Can save research without confusion
- [ ] Saved item appears in correct location
- [ ] Can find saved research in ≤ 30 seconds
- [ ] Naming/metadata clear
- [ ] Persistence to research_outputs verified

**Time Expectation**: ≤ 1 minute (save + find)  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Save button visibility
- Confirmation feedback
- Discoverability from dashboard
- Search/filter functionality

---

### **T6: Configure via Settings Agent**
**Goal**: "Tell the system the industries, company sizes, and buying signals you care about going forward."

**Success Criteria**:
- [ ] Configuration via natural language works
- [ ] Agent proposes structured changes
- [ ] Offers to save globally
- [ ] Settings update reflected in future research
- [ ] Feels faster than forms

**Time Expectation**: ≤ 3 minutes  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Conversational flow quality
- Agent understanding of requests
- Confirmation of changes
- Settings persistence

---

### **T7: Bulk Research from CSV**
**Goal**: "Upload a CSV of companies and get results you can download."

**Success Criteria**:
- [ ] File validation works (accepts valid, rejects invalid)
- [ ] Progress status visible
- [ ] Job survives page refresh
- [ ] Can download results
- [ ] CSV output has expected columns
- [ ] Quality matches individual research

**Time Expectation**: ≤ 5 minutes (upload + monitor)  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Upload UX
- Progress indicators
- Error handling (malformed CSV)
- Download process
- Output quality

---

### **T8: Credits & Limits**
**Goal**: "Kick off research until you hit a low balance—what happens?"

**Success Criteria**:
- [ ] Clear feedback/warnings before hitting limit
- [ ] No silent failures
- [ ] User knows how to purchase or manage usage
- [ ] Credit deductions visible
- [ ] Low balance warning appears

**Time Expectation**: ≤ 2 minutes  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Warning thresholds
- Messaging clarity
- Purchase flow (if applicable)
- Balance visibility

---

### **T9: Come Back Tomorrow (Re-entry)**
**Goal**: "Return later and pick up where you left off."

**Success Criteria**:
- [ ] Fast recall of context
- [ ] Saved threads obvious
- [ ] No cognitive re-onboarding needed
- [ ] Recent activity visible
- [ ] Can resume conversations

**Time Expectation**: ≤ 1 minute  
**SEQ Target**: ≥ 6/7

**What to Observe**:
- Dashboard state on return
- Chat history accessibility
- Context preservation
- Navigation clarity

---

### **T10: Accessibility Spot Checks**
**Goal**: "Complete a quick brief and save it—keyboard only / screen reader."

**Success Criteria** (AA Compliance):
- [ ] Logical focus order
- [ ] Visible focus outlines
- [ ] All controls labeled
- [ ] No keyboard traps
- [ ] Screen reader announces correctly
- [ ] Contrast ratios sufficient
- [ ] Target sizes adequate

**Time Expectation**: Same as T3 + T5  
**SEQ Target**: ≥ 6/7

**What to Test**:
- Tab navigation through forms
- Enter/Space activation
- Escape to close dialogs
- Arrow keys in lists
- Screen reader labels

---

## 3️⃣ **Pass/Fail Rubrics**

### **Flow Completion & Efficiency**

**🟢 Pass (Green)**:
- Unassisted completion
- ≤ Expected time
- ≤ Expected clicks
- No backtracks

**🟡 Yellow**:
- Minor detours
- Brief assistance needed
- Slightly over time

**🔴 Red (Fail)**:
- Cannot complete
- Requires heavy facilitation
- Major confusion points

### **Research Output Quality** (1-5 scale)

**Criteria**:
1. **Actionability**: Explicit next steps provided
2. **Signal Coverage**: Buying/timing signals identified
3. **Decision-Maker Clarity**: Key contacts named with context
4. **Personalization Hooks**: Specific angles for outreach
5. **Evidence**: Sources cited and credible

**Target**: Average ≥ 4/5 for all outputs

**Deep vs Quick**:
- Deep should score ≥ 0.5 points higher on all criteria
- If not, that's a red flag

### **Accessibility (AA)**

**Must Pass**:
- Keyboard reachability (all interactive elements)
- Visible focus indicators
- Proper labeling (aria-labels, form labels)
- Contrast ratios ≥ 4.5:1
- Error messaging clarity
- No keyboard traps

---

## 4️⃣ **Success Thresholds (Ship/No-Ship Gates)**

### **P0 Tasks (T1-T7)**
- ✅ ≥ 95% unassisted completion
- ✅ Median times:
  - T2 ≤ 3 min (onboarding)
  - T3 ≤ 2 min (quick brief)
  - T4 ≤ 10 min (deep intelligence)
  - T7 ≤ 5 min (bulk CSV)

### **Usability Scores**
- ✅ SUS ≥ 85
- ✅ SEQ median ≥ 6/7 on P0 tasks

### **Quality**
- ✅ Output quality average ≥ 4/5 on all five criteria
- ✅ Deep outputs noticeably exceed Quick outputs

### **Blockers**
- ✅ Zero critical blockers
- ✅ AA compliance on tested flows

---

## 5️⃣ **Testing Checklist (Per Task)**

### **Observer Sheet Template**

```
Task ID: T___
Participant: ___________
Start Time: __:__
End Time: __:__

Success: ☐ Y  ☐ N
SEQ (1-7): ___

Confusion Moments:
- 
- 

Detours/Backtracks (count): ___

Blockers Encountered:
- 
- 

Post-Task Confidence:
"Could you use this today?" ☐ Y  ☐ N
Why: ___________

Notes:
```

### **Research Output Rater Sheet**

```
Task: ☐ T3 (Quick)  ☐ T4 (Deep)
Company: ___________

Actionability (1-5): ___
Signal Coverage (1-5): ___
Decision-Maker Clarity (1-5): ___
Personalization Hooks (1-5): ___
Evidence/Sources (1-5): ___

Average: ___

Would you forward this to your team as-is?
☐ Y  ☐ N

Notes:
```

### **Accessibility Quick Pass**

```
Task: T___

Keyboard-Only:
☐ Could complete
☐ Any traps? (describe)
☐ Focus order logical

Screen Reader:
☐ Labels make sense
☐ Announcements clear
☐ Navigation intuitive

Visual:
☐ Contrast sufficient
☐ Target sizes adequate
☐ Focus indicators visible

Notes:
```

---

## 6️⃣ **Testing Protocol**

### **Before Each Session**
1. Clear browser cache/cookies
2. Start with correct test account
3. Have sample CSVs ready
4. Screen recording enabled
5. Observer sheet printed

### **During Testing**
1. **Don't guide** - Let user explore
2. **Think-aloud** - Ask user to narrate
3. **Note exact wording** - Capture confusion quotes
4. **Mark detours** - Count backtracks
5. **60-second rule** - If stuck for 60s, offer one nudge: "What would you try next?"

### **After Each Task**
1. Ask SEQ: "How easy was this task?" (1-7)
2. Ask: "Could you use this today?" (Y/N + why)
3. Note any suggestions

### **After All Tasks**
1. SUS survey (10 questions)
2. Three open-ended questions:
   - "What felt fastest?"
   - "Where did you lose confidence?"
   - "What would you remove to make this simpler?"

---

## 7️⃣ **Evidence to Capture**

### **Screenshots/Videos**
- [ ] Onboarding steps (all 5)
- [ ] Dashboard states (empty, seeded, low credits)
- [ ] Research outputs (Quick and Deep)
- [ ] Bulk CSV status screens
- [ ] Low-credit warnings
- [ ] Save confirmation
- [ ] Settings changes

### **System Events** (if available)
- [ ] research_outputs creation
- [ ] usage_logs credit debits
- [ ] CSV job state transitions
- [ ] chat message persistence

### **Participant Quotes**
- Moments of confusion
- Moments of delight
- Suggestions for improvement
- Exact wording used

---

## 8️⃣ **Daily Debrief & Triage**

### **After Each Testing Day**
1. **Top 5 Issues** with clips
2. **Label**: S1/S2/S3 and Flow/Device/State
3. **Ask**: "If this 'passed' in lab, why could it fail in the field?"
4. **Assign owners** for fixes
5. **Re-test** T1/T2/T7 after fixes (riskiest seams)

### **Challenge Assumptions**
- "AE's will configure everything up front" → Reality: just-in-time config
- "Users read instructions" → Reality: they scan and click
- "Approval email is obvious" → Reality: check spam, timing issues
- "CSV format is clear" → Reality: various Excel exports

---

## 9️⃣ **Ground Truth (From Repo)**

### **What We're Testing Against**
1. ✅ Onboarding is 5 steps, ≤ 3 minutes
2. ✅ Quick Brief ≤ 2 minutes
3. ✅ Deep Intelligence ≤ 10 minutes
4. ✅ Agents deliver promised structure
5. ✅ Bulk Research resilient to refresh
6. ✅ Credits system visible & clear
7. ✅ Signup/Approval flow smooth

---

## 🔟 **TL;DR Run-Sheet (Start Here)**

### **Day 1 Prep**
1. ☐ Set up 2 test accounts (empty/seeded)
2. ☐ Verify email approval working
3. ☐ Load sample CSVs
4. ☐ Print observer sheets
5. ☐ Enable screen recording

### **Day 1 Testing**
1. ☐ Run T1-T7 in order
2. ☐ Record all interactions
3. ☐ Collect SEQ per task
4. ☐ Collect SUS at end

### **Day 1 Debrief**
1. ☐ Surface top 5 problems with clips
2. ☐ Assign owners
3. ☐ Fix quickly

### **Day 2**
1. ☐ Re-test T1/T2/T7 post-fix
2. ☐ Repeat with next cohort
3. ☐ Validate fixes didn't break anything

---

## 📊 **Success Metrics Dashboard**

```
Task Completion Rates:
T1: ___% (target: ≥95%)
T2: ___% (target: ≥95%)
T3: ___% (target: ≥95%)
T4: ___% (target: ≥95%)
T5: ___% (target: ≥95%)
T6: ___% (target: ≥95%)
T7: ___% (target: ≥95%)
T8: ___% (target: ≥90%)
T9: ___% (target: ≥95%)
T10: ___% (target: ≥90%)

Average Times:
T2: ___ min (target: ≤3)
T3: ___ min (target: ≤2)
T4: ___ min (target: ≤10)
T7: ___ min (target: ≤5)

Usability:
SUS: ___ (target: ≥85)
SEQ (median): ___ (target: ≥6)

Quality:
Output Rating: ___ (target: ≥4)
Deep > Quick: ☐ Y  ☐ N

Accessibility:
AA Compliant: ☐ Y  ☐ N
Critical Issues: ___
```

---

## ✅ **Ready to Test**

**This plan is**:
- ✅ Grounded in first principles
- ✅ Based on actual user flows
- ✅ Measurable and actionable
- ✅ Focused on outcomes, not pixels
- ✅ Accessibility-aware
- ✅ Ready for real participants

**Next Steps**:
1. Print observer sheets
2. Set up test accounts
3. Run through tasks yourself first
4. Recruit participants
5. Test, observe, iterate!
