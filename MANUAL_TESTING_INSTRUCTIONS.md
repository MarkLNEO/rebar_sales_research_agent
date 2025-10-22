# Manual UAT Testing Instructions

**Status**: Ready for execution
**Estimated Time**: 30-40 minutes
**Goal**: Achieve 100% UAT compliance

---

## 🗄️ STEP 1: Populate Entity Aliases (5 minutes)

### Option A: Supabase SQL Editor (Recommended)
1. Go to https://supabase.com/dashboard
2. Navigate to your project: `matxrspxbaqegvyliyba`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `/scripts/populate_entity_aliases.sql`
6. Click **Run** or press `Cmd+Enter`
7. Verify success: You should see ~30 rows affected

### Option B: Command Line
```bash
# Get your database connection string from Supabase dashboard
# Settings → Database → Connection string (Direct connection)
# Then run:
psql "YOUR_CONNECTION_STRING" -f scripts/populate_entity_aliases.sql
```

### Verification
```sql
-- Check count
SELECT COUNT(*) FROM entity_aliases;
-- Expected: ~30

-- Check samples
SELECT canonical, array_length(aliases, 1) as alias_count, category
FROM entity_aliases
ORDER BY category, canonical
LIMIT 10;
```

---

## 🧪 STEP 2: Manual Browser Tests (30 minutes)

### Prerequisites
- Application running: `npm run dev`
- Browser: Chrome/Firefox/Safari
- Logged in as active user

---

### Test #1: "Saved" Badge ✅/❌

**Steps**:
1. Navigate to `/research`
2. Enter a company name (e.g., "Stripe")
3. Wait for research to complete
4. Click **"Save to Research"** button
5. **VERIFY**: Badge/indicator appears showing research is saved
6. Navigate to **Research History**
7. **VERIFY**: Saved research appears in the list

**Expected Results**:
- ✅ Visual "Saved" indicator on the research
- ✅ Toast notification confirming save
- ✅ Research appears in history

**Actual Results**:
- [ ] Pass
- [ ] Fail - Describe issue: _______________

---

### Test #2: "Refine Focus" Tooltip ✅/❌

**Steps**:
1. Complete a research (or use existing one)
2. Locate the **"Refine Focus"** button
3. **Hover** over the button (don't click yet)
4. **VERIFY**: Tooltip appears explaining the feature

**Expected Results**:
- ✅ Tooltip visible on hover
- ✅ Tooltip explains: "Focus on specific themes: leadership, funding, tech stack, or recent news"

**Actual Results**:
- [ ] Pass
- [ ] Fail - Describe issue: _______________

---

### Test #3: Follow-up Question Mode ✅/❌

**Steps**:
1. Complete initial research on a company
2. Click **"Follow-up question"** button
3. Ask a follow-up (e.g., "What's their pricing model?")
4. **VERIFY**: Response comes back quickly (not deep research)
5. **VERIFY**: Response builds on previous context

**Expected Results**:
- ✅ Quick response (< 10 seconds)
- ✅ Runs in "Specific" mode (not "Deep")
- ✅ References previous research context
- ✅ No full re-research of the company

**Actual Results**:
- [ ] Pass
- [ ] Fail - Describe issue: _______________

---

### Test #4: "View My Setup" Modal ✅/❌

**Steps**:
1. Navigate to `/research`
2. Look for **"View my setup"** link (usually near top or in settings)
3. Click the link
4. **VERIFY**: Modal opens showing:
   - Organization name
   - ICP (Ideal Customer Profile)
   - Active Signals
   - Custom Criteria
   - Edit shortcuts/links

**Expected Results**:
- ✅ Modal opens with complete setup summary
- ✅ All configured items displayed
- ✅ Edit links work
- ✅ Can close modal easily

**Actual Results**:
- [ ] Pass
- [ ] Fail - Describe issue: _______________

---

### Test #5: Reasoning Visibility Toggle ✅/❌

**Steps**:
1. Start a new research query
2. **VERIFY**: Reasoning/thinking appears during streaming
3. **VERIFY**: Updates smoothly (not character-by-character jank)
4. Click **"Hide thinking"** button
5. **VERIFY**: Reasoning hidden but research continues
6. Click **"Show thinking"** button
7. **VERIFY**: Reasoning reappears
8. Refresh page and start new research
9. **VERIFY**: Preference persists (shows or hides based on last setting)

**Expected Results**:
- ✅ Reasoning visible by default
- ✅ Updates smoothly (~10 updates/second, not 100+)
- ✅ Toggle works immediately
- ✅ Preference saved in localStorage
- ✅ Preference persists across page refreshes

**Actual Results**:
- [ ] Pass
- [ ] Fail - Describe issue: _______________

---

## 📊 STEP 3: Document Results

### Update Compliance Score

After completing all tests, update the compliance score:

**Passing Tests**: ___/5

**Overall Compliance**:
- Code verification: 9/9 = 100%
- Manual tests: ___/5 = ___%
- **TOTAL**: (9 + ___) / 14 = ___%

---

## 🐛 If Tests Fail

For each failing test:

1. **Document the issue**:
   - What you expected
   - What actually happened
   - Screenshots if applicable

2. **Check browser console**:
   - Any errors?
   - Any warnings?

3. **Create issue report**:
```markdown
### Test #X Failed: [Test Name]

**Expected**: [Description]
**Actual**: [Description]
**Console Errors**: [Yes/No - paste errors]
**Screenshots**: [Attach if relevant]

**Steps to Reproduce**:
1. ...
2. ...

**Proposed Fix**: [If obvious]
```

---

## ✅ STEP 4: Final Sign-Off

Once all tests pass:

1. Update [UAT_COMPLIANCE_FINAL_REPORT.md](UAT_COMPLIANCE_FINAL_REPORT.md)
   - Change "95%" to "100%"
   - Change "PRODUCTION READY (pending manual tests)" to "PRODUCTION READY"
   - Update manual test section with ✅ checkmarks

2. Update [UAT_VERIFICATION_RESULTS.md](UAT_VERIFICATION_RESULTS.md)
   - Add test results for each item
   - Include any screenshots

3. Commit changes:
```bash
git add .
git commit -m "UAT: Achieve 100% compliance - all tests passing"
```

---

## 🎯 Success Criteria

**100% Compliance Achieved When**:
- ✅ Entity aliases populated (30+ rows)
- ✅ All 5 manual tests passing
- ✅ No critical bugs found
- ✅ Documentation updated
- ✅ Ready for production deployment

**Estimated Total Time**: 35-40 minutes

---

## 📞 Support

If you encounter issues:
1. Check console for errors
2. Verify dev server is running
3. Clear browser cache and retry
4. Check that you're logged in with an active account
5. Document and report any blockers

**Good luck!** 🚀
