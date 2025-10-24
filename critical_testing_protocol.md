# Sales Researcher Agent - Bulletproof Testing Outline
## Complete Validation Protocol

**Date Created:** October 23, 2025  
**Purpose:** Ensure all flagged issues from Asana tasks and feedback documents have been resolved/implemented

---

## 🎯 CRITICAL TESTING PRIORITIES

### **Priority 1: Memory & Context Retention (HIGHEST PRIORITY)**
All setup time must be worth it - context and preferences must persist throughout ALL interactions.

---

## 📋 SECTION 1: MEMORY & CONTEXT PERSISTENCE

### 1.1 Multi-Turn Conversation Memory
**Objective:** Verify the agent retains context across multiple follow-up questions within a single session.

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-MEM-001 | 1. Research "Gartner.com"<br>2. Wait for complete response<br>3. Ask: "Tell me about their CEO" | Agent should know you're referring to Gartner and provide CEO info (Eugene Hall) WITHOUT asking "which company?" | ✅ PASS | **FIXED** - 10/23/25: Context preserved, CEO info provided (Eugene Hall), depth='specific', TTFB=37.3s (slower than target but functional) |
| TC-MEM-002 | 1. Research "Salesforce"<br>2. Ask: "What are their revenue numbers?"<br>3. Ask: "Tell me about their AI initiatives"<br>4. Ask: "Who are their main competitors?" | All follow-ups should maintain Salesforce context without re-asking which company | ✅ PASS | **10/23/25:** All 4 follow-ups maintained "Salesforce" context, Mode='specific' for all follow-ups, no "which company?" asked. TTFB: 34.4s/24.9s/44.6s. Screenshots: tc-mem-002-step1-4.png |
| TC-MEM-003 | 1. Research "Microsoft"<br>2. Ask: "Draft an email to their CTO"<br>3. Ask: "Now draft one for their CFO" | Agent should know both emails are for Microsoft contacts | ✅ PASS | **10/23/25:** Both emails correctly referenced Microsoft, context maintained, Mode='specific' for follow-ups. TTFB: 11.0s/7.4s. Screenshots: tc-mem-003-step1-3.png |
| TC-MEM-004 | 1. Research "Adobe"<br>2. Ask: "Tell me more about the CEO"<br>3. Ask: "What about the CTO?"<br>4. Ask: "And the CFO?" | Agent maintains company context for all role-based queries | ⚠️ PARTIAL PASS | **10/23/25:** ✅ Semantic understanding CORRECT (CEO: Shantanu Narayen, CTO: Ely Greenfield, CFO: Dan Durn), Mode='specific'. ❌ **CRITICAL BUG**: Context corrupted Step 3→"What About The CTO", Step 4→"And The CFO". activeSubject overwritten despite isFollowUp=true. Screenshots: tc-mem-004-step1-4.png |
| TC-MEM-005 | 1. Type "m365" or "MS365"<br>2. Observe if agent recognizes Microsoft 365 | Agent should understand shorthand/abbreviations for commonly known products/companies | ✅ PASS | **10/23/25:** ✅ Agent correctly recognized "m365" as Microsoft 365, provided comprehensive research, showed confirmation UI "m365 → Microsoft 365 (cloud productivity suite)". TTFB: 4.1s. Screenshot: tc-mem-005-m365-recognition.png |

### 1.2 Setup Configuration Memory
**Objective:** Verify ALL setup information is retained and reflected in EVERY research output.

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-SETUP-001 | 1. Complete full setup with:<br>   - Company: Keepit<br>   - Competitors: Veeam, Commvault<br>   - Signals: Data breach, Leadership change<br>   - Titles: CISO, CTO, VP Security<br>2. Research any company | Output MUST include sections matching setup using EXACT terminology:<br>- "Signals: Data breach - [findings], Leadership Change - [findings]"<br>- Key contacts section showing CISO, CTO, VP Security with names | ⚠️ PARTIAL PASS | **10/23/25:** ✅ ICP configuration correctly applied ("B2B SaaS, 100-1000 employees, sales enablement" in Context Applied & ICP Fit Score). ❌ **UI LIMITATION**: Could not configure competitors/signals/titles via Profile Coach - no direct edit controls. Tested with existing ICP only. TTFB: 3.4s. Screenshot: tc-setup-001-stripe-icp-applied.png |
| TC-SETUP-002 | 1. During setup, define 3 custom buying signals<br>2. Research 5 different companies | EVERY research output must check for and report on those 3 signals using the SAME terminology provided | ⛔ BLOCKED | **10/23/25:** Test blocked - Profile Coach UI does not expose direct controls for configuring custom buying signals. Requires backend/database setup or different UI path |
| TC-SETUP-003 | 1. Setup with specific competitor list<br>2. Research target company | Competitive intelligence section must reference YOUR specified competitors, not generic ones | ⛔ BLOCKED | **10/23/25:** Test blocked - Profile Coach UI does not expose competitor list configuration controls |
| TC-SETUP-004 | 1. Define target titles during setup<br>2. Research company | Key contacts section must prioritize and highlight the EXACT titles specified, using same terminology | ⛔ BLOCKED | **10/23/25:** Test blocked - Profile Coach UI does not expose target titles configuration controls. Currently failing per Asana task |
| TC-SETUP-005 | 1. View setup configuration summary<br>2. Edit one signal<br>3. Research a company<br>4. Verify change is reflected | Changed setup parameters must immediately reflect in next research | ⛔ BLOCKED | **10/23/25:** Test blocked - Cannot edit signals without UI access to configuration controls |

### 1.3 Persistent Preferences from Follow-Up Questions
**Objective:** When users ask follow-up questions, those preferences should be saved and applied to ALL future research.

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-PREF-001 | 1. Research "Company A"<br>2. Ask: "Tell me more about their cloud strategy"<br>3. Research "Company B" (new company)<br>4. Check if cloud strategy is automatically included | If user shows interest in specific topic, it should become part of future research templates | ☐ | Adaptive learning |
| TC-PREF-002 | 1. Research Company A<br>2. Ask: "What about their M&A history?"<br>3. Mark this as "always include"<br>4. Research Companies B, C, D | M&A history should now appear in all future briefs | ☐ | Preference persistence |
| TC-PREF-003 | 1. Ask for CEO info multiple times across different companies<br>2. After 3rd request, verify it's added to default research scope | Repeated follow-up patterns should be learned and integrated | ☐ | Pattern learning |

---

## 📋 SECTION 2: SETUP AGENT VALIDATION

### 2.1 Setup Flow & UX

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-SETUP-101 | Complete entire setup flow | Process takes ~5 minutes, all questions are clear, no redundant info requested | ☐ | Timing validation |
| TC-SETUP-102 | First setup message | Should NOT include "Or just start asking me questions" - remove all text below the two options | ☐ | Per Asana task |
| TC-SETUP-103 | Second setup message | Should remove "besides company research..." section until "let's start" | ☐ | Simplification needed |
| TC-SETUP-104 | 4th setup message (after company name) | Should say: "Perfect! I have set [Company] as your organization. Next step: Certain events create urgency... What events make a company more likely to buy from you right now? Possible Responses: answer the question, type 'show signals' to see options, or 'skip' to continue" | ☐ | Wording update |
| TC-SETUP-105 | 5th setup message (signals confirmation) | Should say: "Added signal(s): [Signal name]. Type more or 'done' to continue" | ☐ | Consistency |
| TC-SETUP-106 | Last setup question (default selections) | If it says "by default", ALL boxes below should be CHECKED by default, not unchecked | ☐ | Currently broken |
| TC-SETUP-107 | Enter "all of those" during setup | Should work (currently only "all" works) | ☐ | Natural language processing |
| TC-SETUP-108 | Setup completion | Should redirect to Dashboard (currently doesn't redirect) | ☐ | Navigation fix |
| TC-SETUP-109 | Data types question | Should NOT ask users to identify data types - remove this question entirely | ☐ | Too technical for users |
| TC-SETUP-110 | Company name vs URL | If user inputs URL when asked for company name, should intelligently extract company name | ☐ | Input flexibility |

### 2.2 Setup Configuration Viewing

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-SETUP-201 | From within chat, type command to view setup | Agent should provide complete summary of all setup configurations | ☐ | Transparency |
| TC-SETUP-202 | Access setup summary from dashboard | Easy navigation to view/edit all setup parameters | ☐ | Accessibility |
| TC-SETUP-203 | View "Refine Scope" settings | Should show ALL 6 items as checked (or whatever was set during setup), reflecting current state | ☐ | Currently broken |

---

## 📋 SECTION 3: RESEARCH OUTPUT VALIDATION

### 3.1 Research Accuracy & Completeness

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-RES-001 | Research "Gartner.com" | Output MUST include:<br>- Key contacts with EXACT titles from setup (CISO, CTO, etc.)<br>- Named individuals (e.g., Eugene Hall)<br>- Signals breakdown using setup terminology<br>- All sections defined in setup | ☐ | **CRITICAL** - Currently failing |
| TC-RES-002 | Research output format | Response should tie ALL findings to setup items with clear connections | ☐ | Context integration |
| TC-RES-003 | Buying signals section | Should literally say: "Signals: Data breach - [xyz comments], Leadership Change - [xyz comments], Acquisition - [xyz comments]" using EXACT signal names from setup | ☐ | Currently not matching terminology |
| TC-RES-004 | Deep research mode | Should provide significantly more depth than quick mode, clearly differentiated | ☐ | Depth validation |
| TC-RES-005 | Research timing | "Thinking" indicator should appear within 2 seconds of query submission (currently 5 second delay) | ☐ | Performance issue |

### 3.2 Company Identification

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-RES-101 | Search for ambiguous company name | Should provide top 5 company matches to select from (like Claude does) | ☐ | UX improvement needed |
| TC-RES-102 | Search for company not in database | Should provide response similar to Claude: "I couldn't find that exact company. Here are some similar options..." | ☐ | Graceful degradation |
| TC-RES-103 | Confirm company after initial match | Should NOT ask for domain name again if company already identified | ☐ | Currently asking twice |
| TC-RES-104 | Company confirmation UX | After identifying company, should NOT ask "what would you like researched" if setup already completed | ☐ | Context awareness |

### 3.3 Response Formatting

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-RES-201 | Ask simple follow-up question | Should NOT show "Key Findings, Signals, etc." structure when not relevant to the question | ☐ | Context-appropriate formatting |
| TC-RES-202 | Review "Next Actions" section | Should include: "Continue research on [company]" and "Follow up question" as first option | ☐ | Action relevance |
| TC-RES-203 | "Refresh Please provide Deep research" button | Button text too long, needs shortening. Verify it provides DIFFERENT results than initial summary | ☐ | Currently shows same results |
| TC-RES-204 | "Refine focus" option | Verify clear explanation of what this option does | ☐ | Clarity needed |
| TC-RES-205 | Timer display | Verify timer is always visible during research and doesn't cut off text | ☐ | Previously disappeared |

---

## 📋 SECTION 4: FEATURE-SPECIFIC TESTING

### 4.1 Email Drafting

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-EMAIL-001 | Click "Draft email" after research | Should know the contact's name (e.g., CISO's actual name) | ☐ | Name recognition |
| TC-EMAIL-002 | Draft email request | Should ask: "Who would you like to draft an email to?" with option for generic email | ☐ | Target specification |
| TC-EMAIL-003 | Email personalization | During setup or first email, ask for user's name and title (optional) to reduce future editing | ☐ | User info capture |
| TC-EMAIL-004 | Email template learning | Eventually: allow users to share sample email intros for the agent to learn their style | ☐ | Future enhancement |
| TC-EMAIL-005 | Draft email thinking indicator | While drafting, show same timer/thinking indicator as in research | ☐ | Consistency |

### 4.2 Save to Research

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-SAVE-001 | Click "Save to research" | Should provide clear confirmation notification | ☐ | Currently no confirmation |
| TC-SAVE-002 | View saved research | Saved items should appear in "Tracked accounts" (or equivalent) | ☐ | Currently not visible |
| TC-SAVE-003 | Save popup | Evaluate if "research type" popup is necessary - consider auto-saving without popup | ☐ | UX simplification |
| TC-SAVE-004 | Tracked accounts list | Verify all saved research appears correctly with proper metadata | ☐ | Data persistence |

### 4.3 Welcome Agent / Dashboard

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-DASH-001 | Welcome agent layout | Maximum 6 option boxes displayed, first option should be "Research a company" | ☐ | UX optimization |
| TC-DASH-002 | Priority options | Most important boxes: 1) Research a company, 2) Bulk research, 3) Find contacts, 4) Find ICP matches | ☐ | Prioritization |
| TC-DASH-003 | Remove redundancy | "Added signals" and "Currently tracking" are redundant - keep only one | ☐ | Simplification |
| TC-DASH-004 | "Skip for now" button | Remove "Skip for now" - only have "Create my agent" button | ☐ | Decisiveness |
| TC-DASH-005 | Return to dashboard button | Verify always accessible and functional | ☐ | Navigation |
| TC-DASH-006 | Home screen button | Add home screen button (currently missing) | ☐ | Navigation enhancement |

### 4.4 Settings & Profile

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-SET-001 | "Settings Agent" label | Either explain what "Settings Agent" is OR remove/rename it | ☐ | Clarity needed |
| TC-SET-002 | "Research History" | Should show ALL chats, not blank. Clarify purpose | ☐ | Currently showing blank |
| TC-SET-003 | Profile Coach | Should NOT ask about JSON or technical implementation details | ☐ | Currently asking weird questions |
| TC-SET-004 | View setup options | Easily accessible way to view ALL options selected during setup | ☐ | Transparency |

### 4.5 Account Management

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-ACCT-001 | Logout button | Add visible logout button (currently missing) | ☐ | Basic functionality |
| TC-ACCT-002 | Email verification | Fix broken email verification | ☐ | Critical fix |
| TC-ACCT-003 | Signup page | Create dedicated signup page | ☐ | User onboarding |

---

## 📋 SECTION 5: CONTEXTUAL INTELLIGENCE TESTING

### 5.1 Entity Recognition & Shorthand

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-ENT-001 | Type "m365" | Agent recognizes as Microsoft 365 | ☐ | Abbreviation intelligence |
| TC-ENT-002 | Type "AWS" | Agent recognizes as Amazon Web Services | ☐ | Common abbreviations |
| TC-ENT-003 | Type "SFDC" | Agent recognizes as Salesforce | ☐ | Industry shorthand |
| TC-ENT-004 | Type company nickname | Test with common industry nicknames (e.g., "Big Blue" for IBM) | ☐ | Cultural awareness |

### 5.2 Context Switching

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-CTX-001 | Research Company A → Research Company B | Agent should clearly switch context, not mix information | ☐ | Context separation |
| TC-CTX-002 | After researching Company A, ask about "their CEO" after starting Company B research | Should refer to Company B's CEO, not Company A | ☐ | Proper context switching |
| TC-CTX-003 | Deep research on Company A → Quick research on Company B | Different research modes shouldn't interfere | ☐ | Mode isolation |

### 5.3 Expectations Box

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-EXP-001 | Search Company A, then search Company B | Expectations box should update to show Company B, not stuck on Company A | ☐ | Currently broken |
| TC-EXP-002 | Expectations box accuracy | Should always reflect current company being researched | ☐ | Real-time updates |

---

## 📋 SECTION 6: VISUAL INDICATORS & ICONS

### 6.1 Status Icons

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-ICON-001 | Research Gartner, save to watchlist, refresh icon display | Icons should accurately reflect current state (e.g., not show "needs refresh" immediately after running research) | ☐ | Currently inaccurate |
| TC-ICON-002 | Deep research indicator | When showing deep research icon, content should clearly be deeper than quick mode | ☐ | Mismatch reported |

### 6.2 Button & Selection States

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-BTN-001 | Click "Continue this company" then "Start new company" | Highlight should move to show which option is selected | ☐ | Currently stuck |
| TC-BTN-002 | Click "Start new company" | Should actually start new company research flow | ☐ | Currently nothing happens |
| TC-BTN-003 | "Summarize" button | Verify it works as expected (note: may not need to exist) | ☐ | Previously not working |

---

## 📋 SECTION 7: EDGE CASES & ERROR HANDLING

### 7.1 Wrong Company Research

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-ERR-001 | Research Gartner, then request "deep research" as follow-up | Should provide deep research on GARTNER, not switch to user's company (Keepit) | ☐ | Previously failed |
| TC-ERR-002 | Search for non-existent company | Graceful error message with suggestions | ☐ | Error handling |
| TC-ERR-003 | Provide invalid input during setup | Should guide user to correct format without frustration | ☐ | Input validation |

### 7.2 Performance & Reliability

| Test Case | Steps | Expected Result | Pass/Fail | Notes |
|-----------|-------|-----------------|-----------|-------|
| TC-PERF-001 | Submit query | "Thinking" indicator appears within 2 seconds max | ☐ | Currently 5 second delay |
| TC-PERF-002 | Complete research cycle | Total time reasonable for depth provided | ☐ | Speed/quality balance |
| TC-PERF-003 | Multiple rapid queries | System handles without errors or slowdowns | ☐ | Stress testing |

---

## 📋 SECTION 8: END-TO-END USER JOURNEYS

### 8.1 New User Onboarding Journey

**Journey:** First-time user complete experience

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Land on signup page | Clear, professional signup page exists | ☐ | Create if missing |
| 2 | Create account | Email verification works properly | ☐ | Currently broken |
| 3 | First login | Welcome agent appears with max 6 options, "Research a company" first | ☐ | Prioritization |
| 4 | Choose setup path | Clear choice: "5 min setup" OR "Start research now" | ☐ | Two paths clear |
| 5 | Complete 5-min setup | All questions clear, ~5 minutes total, all setup data captured | ☐ | Timing & clarity |
| 6 | Redirect to dashboard | Automatic redirect after setup completion | ☐ | Currently doesn't redirect |
| 7 | First research query | Process smooth, uses ALL setup context | ☐ | Setup application |
| 8 | View results | All setup terminology reflected, key contacts shown with names/titles | ☐ | Terminology consistency |

### 8.2 Returning User Research Journey

**Journey:** User who completed setup returns to do research

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Login | Welcome agent loads quickly | ☐ | Performance |
| 2 | Type: "Research Salesforce" | Identifies company, confirms, begins research | ☐ | Quick start |
| 3 | Review results | All setup preferences applied, signals checked, contacts with titles shown | ☐ | Preference persistence |
| 4 | Ask: "Tell me about their CEO" | Maintains Salesforce context, provides CEO info | ☐ | Memory check |
| 5 | Ask: "What about recent acquisitions?" | Still knows it's Salesforce, provides acquisition data | ☐ | Extended memory |
| 6 | Click "Draft email to CTO" | Knows company, knows CTO name, generates personalized email | ☐ | Integration |
| 7 | Click "Save to research" | Confirmation appears, appears in tracked accounts | ☐ | Save functionality |
| 8 | Start new company: "Microsoft" | Cleanly switches context to Microsoft | ☐ | Context switching |

### 8.3 Advanced User Multi-Company Journey

**Journey:** Power user researching multiple companies in one session

| Step | Action | Expected Result | Pass/Fail | Notes |
|------|--------|-----------------|-----------|-------|
| 1 | Research Company A (Adobe) | Full research with all setup context | ☐ | Baseline |
| 2 | Ask 3 follow-ups about Adobe | All maintain Adobe context | ☐ | Extended memory |
| 3 | Research Company B (Oracle) | Switches cleanly to Oracle | ☐ | Context switch |
| 4 | Ask about "their CEO" | Refers to Oracle CEO, not Adobe | ☐ | Correct context |
| 5 | Research Company C (SAP) | Clean switch to SAP | ☐ | Multiple switches |
| 6 | View all tracked accounts | All three companies visible with proper metadata | ☐ | Tracking |
| 7 | Return to Adobe research | Can access previous Adobe research | ☐ | History access |

---

## 📋 SECTION 9: TERMINOLOGY & LANGUAGE CONSISTENCY

### 9.1 Setup Terminology Matching

| Test Case | Description | Pass/Fail | Notes |
|-----------|-------------|-----------|-------|
| TC-TERM-001 | If user types "Data breach" in setup signals, output must say "Data breach" not "Security incident" or "Breach" | ☐ | Exact matching required |
| TC-TERM-002 | If user types "Chief Information Security Officer", output must use full title, not abbreviate to "CISO" | ☐ | Respect user language |
| TC-TERM-003 | Custom signal names used in setup appear VERBATIM in research outputs | ☐ | No paraphrasing |
| TC-TERM-004 | Competitor names spelled/formatted exactly as user provided | ☐ | Consistency |

---

## 📋 SECTION 10: REGRESSION TESTING

### 10.1 Previously Fixed Issues (Verify Not Broken Again)

| Issue | Description | Status | Verification Date |
|-------|-------------|--------|-------------------|
| Memory in follow-ups | "Tell me about their CEO" after company research should maintain context | ☐ | |
| Summarize button | Should function or be removed | ☐ | |
| Save to research notification | Should show confirmation | ☐ | |
| Company identification | Shouldn't ask for domain after identifying company | ☐ | |
| Setup redirect | Should redirect to dashboard after completion | ☐ | |
| Timer visibility | Should remain visible during thinking | ☐ | |
| Next actions format | Should include "Continue research" and "Follow up question" | ☐ | |
| Email thinking indicator | Should show progress indicator | ☐ | |
| Refine scope state | Should show current selections, all checked if default | ☐ | |

---

## 📋 SECTION 11: ACCEPTANCE CRITERIA CHECKLIST

### Critical Must-Haves (Cannot Launch Without)

- [ ] **Memory persistence:** 5+ follow-up questions maintain context without asking "which company"
- [ ] **Setup terminology:** Research outputs use EXACT terms/phrases from setup
- [ ] **Buying signals:** Signals section uses exact signal names and breaks down findings per signal
- [ ] **Target titles:** Key contacts section shows people with specified titles using exact terminology
- [ ] **Entity recognition:** Common abbreviations recognized (m365, AWS, SFDC, etc.)
- [ ] **Preference learning:** Follow-up questions can be marked to "always include" in future research
- [ ] **Context switching:** Clean switches between companies without information bleeding
- [ ] **Email verification:** Working and reliable
- [ ] **Save to research:** Functional with confirmation and visibility in tracked accounts
- [ ] **Performance:** Thinking indicator appears within 2 seconds

### High Priority (Should Have)

- [ ] Setup flow: 5 minutes or less, clear questions, proper redirects
- [ ] Company identification: Top 5 matches when ambiguous
- [ ] Research depth: Clear differentiation between quick and deep modes
- [ ] Navigation: Logout button, home button, easy access to setup summary
- [ ] Visual accuracy: Icons reflect actual state
- [ ] Error handling: Graceful failures with helpful messages

### Medium Priority (Nice to Have)

- [ ] Email personalization: User name/title capture for less editing
- [ ] Dynamic next actions: Context-appropriate suggestions
- [ ] Research history: Functional and useful
- [ ] Signup page: Dedicated, professional page
- [ ] Setup viewing: Easy access from chat to view/edit setup

---

## 📋 SECTION 12: TEST EXECUTION PROTOCOL

### Testing Phases

**Phase 1: Critical Memory & Setup (Week 1)**
- Complete Section 1 (Memory & Context)
- Complete Section 2.2 (Setup Configuration Memory)
- Complete Section 9 (Terminology Consistency)
- **Exit Criteria:** 95% pass rate on all memory tests

**Phase 2: Research Output & Features (Week 1-2)**
- Complete Section 3 (Research Validation)
- Complete Section 4 (Feature-Specific)
- Complete Section 6 (Visual Indicators)
- **Exit Criteria:** 90% pass rate, all critical features working

**Phase 3: UX & Edge Cases (Week 2)**
- Complete Section 2.1 (Setup Flow)
- Complete Section 7 (Edge Cases)
- Complete Section 5 (Contextual Intelligence)
- **Exit Criteria:** 85% pass rate, no blocking UX issues

**Phase 4: Integration & Journeys (Week 2-3)**
- Complete Section 8 (End-to-End Journeys)
- Complete Section 10 (Regression Testing)
- **Exit Criteria:** All user journeys complete successfully

**Phase 5: Final Validation (Week 3)**
- Run complete checklist (Section 11)
- UAT with original testers
- Sign-off from stakeholders

### Test Environment Setup

1. **Fresh User Account:** Create new test account for unbiased testing
2. **Setup Documentation:** Screenshot each step of setup for reference
3. **Test Data:** Prepare list of 20+ companies to test
4. **Terminology List:** Document exact terms used in setup for validation
5. **Comparison Baseline:** Keep original feedback docs available

### Bug Reporting Protocol

**For Each Failed Test:**
1. Mark Pass/Fail in test case table
2. Take screenshot showing issue
3. Document exact steps to reproduce
4. Note expected vs actual behavior
5. Assign severity: Critical / High / Medium / Low
6. Create Asana task with all above information
7. Link to original feedback if applicable

**Severity Definitions:**
- **Critical:** Blocks core functionality or loses user data (e.g., memory not working)
- **High:** Major feature broken or poor UX (e.g., setup doesn't redirect)
- **Medium:** Feature works but not optimally (e.g., button text too long)
- **Low:** Minor polish or nice-to-have (e.g., icon styling)

---

## 📋 SECTION 13: SUCCESS METRICS

### Quantitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Memory retention rate | 95%+ | Follow-up questions that maintain context without re-asking |
| Setup terminology match | 100% | Exact matches between setup terms and output usage |
| Research completion time (quick) | <45 seconds | From query to complete output |
| Research completion time (deep) | <3 minutes | From query to complete output |
| "Thinking" indicator delay | <2 seconds | Time from submit to indicator appearance |
| Setup completion rate | 80%+ | Users who start setup and complete it |
| Setup time | ~5 minutes | Average time for new user to complete setup |
| Save success rate | 100% | Saves that appear in tracked accounts with confirmation |

### Qualitative Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| User confidence in memory | "High" | User survey: "The agent remembers what I told it" |
| Setup value perception | "Worth it" | User survey: "The setup time was valuable" |
| Output relevance | "Very relevant" | User survey: "Research outputs match my needs" |
| UX clarity | "Clear" | User survey: "I understand what each option does" |
| Overall satisfaction | 8/10+ | NPS or satisfaction score |

---

## 📋 SECTION 14: VERIFICATION EVIDENCE REQUIREMENTS

### For Each Test Section, Provide:

1. **Screenshots:**
   - Setup configuration showing entered terms
   - Research output showing matching terminology
   - Follow-up conversation showing memory retention
   - Error states (if applicable)

2. **Screen Recordings:**
   - Complete user journey from setup to research
   - Multi-turn conversation demonstrating memory
   - Context switching between companies
   - Performance (showing timing indicators)

3. **Documented Examples:**
   - Setup input: "Data breach, Leadership change"
   - Output result: "Signals: Data breach - [findings], Leadership change - [findings]"
   - Follow-up: User asks "Tell me about their CEO" → Agent responds with CEO info without asking which company

4. **Test Data:**
   - List of all companies tested
   - List of all terminology/signals used in setup
   - Timestamp logs showing performance metrics

---

## 🎯 TESTING PRIORITY MATRIX

### Must Test First (Blocking Issues if Broken)
1. Memory & context retention (TC-MEM-001 through TC-MEM-005)
2. Setup terminology matching (TC-SETUP-001, TC-RES-001, TC-RES-003)
3. Email verification (TC-ACCT-002)
4. Save to research functionality (TC-SAVE-001, TC-SAVE-002)
5. Performance/thinking indicator (TC-RES-005, TC-PERF-001)

### Must Test Second (Critical User Experience)
1. Setup flow & UX (all TC-SETUP-1xx)
2. Company identification (TC-RES-101 through TC-RES-104)
3. Entity recognition (TC-ENT-001 through TC-ENT-004)
4. Email drafting (all TC-EMAIL-xxx)
5. Navigation (TC-DASH-005, TC-DASH-006, TC-ACCT-001)

### Test Third (Features & Polish)
1. Visual indicators (all TC-ICON-xxx, TC-BTN-xxx)
2. Response formatting (all TC-RES-2xx)
3. Dashboard/Welcome agent (all TC-DASH-xxx)
4. Settings & profile (all TC-SET-xxx)
5. Edge cases (all TC-ERR-xxx, TC-CTX-xxx)

---

## 📋 FINAL NOTES FOR TESTERS

### Remember:
1. **The setup time MUST be worth it** - every piece of information provided during setup must be visible and useful in every research output
2. **Memory is CRITICAL** - if users have to repeat context, the product fails
3. **Use EXACT terminology** - if a user says "Data breach" in setup, the output must say "Data breach" not "security incident"
4. **Test like a real user** - don't work around bugs, document everything that feels wrong
5. **Follow-up questions are key** - this is where memory really matters

### Common Testing Mistakes to Avoid:
- ❌ Testing only one follow-up question (test 4-5 to verify consistent memory)
- ❌ Using generic test data (use real company names and realistic signals)
- ❌ Not documenting exact terminology used in setup
- ❌ Accepting "close enough" on terminology matching (must be EXACT)
- ❌ Testing only happy paths (try edge cases and errors)

### When in Doubt:
- **Screenshot it** - More evidence is always better
- **Document it** - Write down exact steps to reproduce
- **Report it** - Better to over-report than miss a bug
- **Test again** - Verify fixes don't break other things

---

## APPENDIX A: Original Feedback Summary

### From Combined Comments Document:
- Memory not working ("tell me about their CEO" asking which company)
- Expectations box not updating between companies
- Save to research button issues
- Setup flow too complex
- Signals not broken down by name
- Target titles not showing with names
- "Thinking" delay too long
- Timer visibility issues
- Next actions not relevant
- Email drafts missing contact names
- Company identification asking for domain twice
- Icons not reflecting actual state

### From Asana Tasks:
- 35 tasks tracked in Sales Researcher Agent project
- Key themes: Memory, Setup application, Terminology consistency, UX polish, Navigation
- Critical issues: Memory, Buying signals format, Target titles, Performance

---

**Document Version:** 1.0  
**Last Updated:** October 23, 2025  
**Status:** Ready for Test Execution