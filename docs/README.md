# RebarHQ Documentation

**Last Updated**: 2025-10-22
**Status**: Consolidated & Current

---

## 📚 Documentation Structure

This directory contains all project documentation organized by category. All documentation has been consolidated to ensure **single source of truth** per feature/functionality.

---

## 🗂️ Directory Organization

### [`architecture/`](architecture/)
System architecture, migration guides, and performance documentation

- **[OVERVIEW.md](architecture/OVERVIEW.md)** - Complete system architecture, technology stack, and core systems
- **[MIGRATION_GUIDE.md](architecture/MIGRATION_GUIDE.md)** - Express to Next.js API migration details
- **[NEXTJS_MIGRATION.md](architecture/NEXTJS_MIGRATION.md)** - Full Next.js migration guide
- **[OPTIMIZATION_SUMMARY.md](architecture/OPTIMIZATION_SUMMARY.md)** - Performance improvements and metrics

### [`features/`](features/)
Feature-specific documentation with implementation details

- **[PREFERENCE_LEARNING.md](features/PREFERENCE_LEARNING.md)** - Automatic preference learning system
  - How it works
  - Implementation details
  - Database schema
  - Testing guide

### [`testing/`](testing/)
Testing documentation and UAT compliance results

- **[UAT_RESULTS.md](testing/UAT_RESULTS.md)** - UAT testing results and compliance scorecard
  - Feature verification
  - Manual test checklist
  - Known issues
  - Deployment readiness

### [`optimization/`](optimization/)
Performance optimization and prompt engineering

- **[PERFORMANCE.md](optimization/PERFORMANCE.md)** - GPT-4 optimization and performance tuning

### [`guides/`](guides/)
User-facing guides and implementation documentation

- **[USER_EXPERIENCE_GUIDE.md](guides/USER_EXPERIENCE_GUIDE.md)** - Complete UX guide
- **[NEXT_STEPS_IMPLEMENTATION.md](guides/NEXT_STEPS_IMPLEMENTATION.md)** - Implementation guide

### [`CLAUDE_guides/`](CLAUDE_guides/)
External API references and best practices

- **[gpt-5_prompting_best_practices.md](CLAUDE_guides/gpt-5_prompting_best_practices.md)** - OpenAI prompting guide
- **[streamdown_docs.md](CLAUDE_guides/streamdown_docs.md)** - Streamdown markdown documentation
- **[mcp_servers_for_gpt-5.md](CLAUDE_guides/mcp_servers_for_gpt-5.md)** - MCP server guide
- **[openai_responses_api_docs.md](CLAUDE_guides/openai_responses_api_docs.md)** - OpenAI Responses API docs

---

## 📄 Root-Level Documentation

Keep only these in project root:

- **[README.md](../README.md)** - Main project README with quick start
- **[STATUS.md](../STATUS.md)** - Current project status, metrics, and next steps

---

## 🗃️ Archived Documentation

Old and redundant documentation has been moved to: [`../archive/docs_old/`](../archive/docs_old/)

**Archived items include**:
- Multiple redundant status reports (40+ files)
- Iteration-specific test results
- Debugging session documents
- Old architecture audits
- Superseded implementation docs

**Archived**: 2025-10-22

---

## 🔍 Finding What You Need

### I want to...

#### **Understand the system architecture**
→ [architecture/OVERVIEW.md](architecture/OVERVIEW.md)

#### **Learn how preference learning works**
→ [features/PREFERENCE_LEARNING.md](features/PREFERENCE_LEARNING.md)

#### **Check UAT compliance and testing status**
→ [testing/UAT_RESULTS.md](testing/UAT_RESULTS.md)

#### **See current project status**
→ [../STATUS.md](../STATUS.md)

#### **Migrate from Express to Next.js**
→ [architecture/MIGRATION_GUIDE.md](architecture/MIGRATION_GUIDE.md)

#### **Understand performance optimizations**
→ [architecture/OPTIMIZATION_SUMMARY.md](architecture/OPTIMIZATION_SUMMARY.md)

#### **Learn OpenAI best practices**
→ [CLAUDE_guides/gpt-5_prompting_best_practices.md](CLAUDE_guides/gpt-5_prompting_best_practices.md)

#### **Set up for deployment**
→ [../README.md](../README.md) + [../STATUS.md](../STATUS.md)

---

## 📊 Documentation Health

### Metrics (as of 2025-10-22)

**Total Active Docs**: 15 files
**Archived Docs**: 40+ files
**Single Source of Truth**: ✅ YES
**Up to Date**: ✅ YES
**Redundancy**: ❌ ELIMINATED

### Coverage

| Area | Status | Primary Doc |
|------|--------|-------------|
| **Architecture** | ✅ Complete | [OVERVIEW.md](architecture/OVERVIEW.md) |
| **Features** | ✅ Complete | [PREFERENCE_LEARNING.md](features/PREFERENCE_LEARNING.md) |
| **Testing** | ✅ Complete | [UAT_RESULTS.md](testing/UAT_RESULTS.md) |
| **Performance** | ✅ Complete | [PERFORMANCE.md](optimization/PERFORMANCE.md) |
| **Migration** | ✅ Complete | [MIGRATION_GUIDE.md](architecture/MIGRATION_GUIDE.md) |
| **User Guides** | ✅ Complete | [USER_EXPERIENCE_GUIDE.md](guides/USER_EXPERIENCE_GUIDE.md) |
| **API Docs** | ✅ Complete | [OVERVIEW.md](architecture/OVERVIEW.md#api-endpoints) |

---

## 🔄 Documentation Standards

### When to Create New Documentation

✅ **DO create new docs when**:
- Adding a major new feature
- Implementing a new system/subsystem
- Major architecture changes
- New deployment environments

❌ **DON'T create new docs for**:
- Bug fixes (update STATUS.md instead)
- Minor feature tweaks (update existing feature doc)
- Temporary debugging notes (use comments or ephemeral files)
- Duplicate information (update existing doc instead)

### Documentation Checklist

When creating or updating documentation:

- [ ] Check if existing doc covers this topic
- [ ] Update "Last Updated" date
- [ ] Add cross-references to related docs
- [ ] Update this README if adding new file
- [ ] Use consistent markdown formatting
- [ ] Include code examples where relevant
- [ ] Add file path references with line numbers
- [ ] Verify all links work

---

## 🎯 Quick Reference

### Most Important Docs (Start Here)

1. **[Architecture Overview](architecture/OVERVIEW.md)** - Understand the system
2. **[Status Document](../STATUS.md)** - Current state and next steps
3. **[UAT Results](testing/UAT_RESULTS.md)** - What's working, what needs testing
4. **[Preference Learning](features/PREFERENCE_LEARNING.md)** - Key differentiator feature

### For Developers

- [Architecture Overview](architecture/OVERVIEW.md) - System design
- [Migration Guide](architecture/MIGRATION_GUIDE.md) - API migration details
- [Performance Guide](optimization/PERFORMANCE.md) - Optimization techniques

### For Project Managers

- [Status Document](../STATUS.md) - Current status and timeline
- [UAT Results](testing/UAT_RESULTS.md) - Testing compliance
- [Next Steps](guides/NEXT_STEPS_IMPLEMENTATION.md) - Implementation roadmap

### For QA/Testers

- [UAT Results](testing/UAT_RESULTS.md) - Test cases and results
- [User Experience Guide](guides/USER_EXPERIENCE_GUIDE.md) - Expected UX
- [Status Document](../STATUS.md) - Known issues

---

## 📝 Version History

### 2025-10-22 - Documentation Consolidation
- ✅ Consolidated 67 files → 15 files
- ✅ Archived 40+ redundant documents
- ✅ Established single source of truth per feature
- ✅ Created clear directory structure
- ✅ Updated all cross-references

### Prior to 2025-10-22
- Multiple redundant documentation files
- Unclear structure
- Outdated information scattered across files

---

## 🤝 Contributing to Documentation

### Making Updates

1. **Find the right doc**: Use the "I want to..." section above
2. **Edit the doc**: Make your changes
3. **Update date**: Change "Last Updated" at the top
4. **Update this README**: If adding/removing files
5. **Test links**: Ensure all references work

### Creating New Documentation

1. **Check existing docs first**: Avoid duplication
2. **Choose correct directory**: See structure above
3. **Follow template**: Use existing docs as examples
4. **Add to this README**: Update the relevant section
5. **Cross-reference**: Link to/from related docs

---

## 📞 Questions?

If you can't find what you're looking for:

1. Check [STATUS.md](../STATUS.md) for current state
2. Check [Architecture Overview](architecture/OVERVIEW.md) for system details
3. Search `archive/docs_old/` if looking for historical info
4. Review git history for context on changes

---

**Maintained by**: RebarHQ Team
**Last Major Update**: 2025-10-22
**Status**: ✅ **CURRENT & CONSOLIDATED**
