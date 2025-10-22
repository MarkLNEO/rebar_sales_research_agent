# 🏗️ Architecture Audit & Consolidation Plan

**Date**: October 22, 2025  
**Issue**: Multiple conflicting prompt systems causing confusion

---

## 🔍 **Current State Analysis**

### **ACTIVE CODE** (Actually Being Used)
✅ `app/api/lib/context.ts::buildSystemPrompt()` - **THIS IS THE ONLY ACTIVE PROMPT BUILDER**
- Called from `app/api/ai/chat/route.ts` line 29
- Builds the system prompt inline
- Includes learned preferences
- Simple, direct, works

### **DEAD CODE** (Not Being Used - Can Be Removed)
❌ `src/config/agents.ts::getAgentSystemPrompt()` - Old config system, not called
❌ `src/services/agents/BaseAgent.ts::buildSystemPrompt()` - Complex base class, never instantiated
❌ `src/services/agents/GPT5AgentFactory.ts` - Factory pattern, never called
❌ `src/services/agents/GPT5OptimizedAgent.ts` - Another base class, never used
❌ `src/services/agents/prompts/GPT5PromptLibrary.ts` - Not referenced
❌ `src/services/agents/prompts/ContextBuilder.ts` - Imported but never called

### **PARTIALLY USED**
⚠️ `src/services/agents/ResearchAgent.ts` - Only used for TYPE DEFINITIONS, not prompting
- Classes defined here (ResearchAgent, SettingsAgent, ProfilerAgent)
- But their `buildSystemPrompt()` methods are NEVER CALLED
- Only the types/interfaces are used

---

## 🎯 **Problems**

1. **Confusion**: Multiple files look like they should work but don't
2. **Maintenance**: Hard to know where to edit prompts
3. **Conflicts**: Different prompt styles could cause issues if accidentally used
4. **Bloat**: 1000+ lines of dead code

---

## ✅ **Recommended Solution**

### **Phase 1: Consolidate** (Keep It Simple)
1. **Keep**: `app/api/lib/context.ts` - This is working perfectly
2. **Remove**: All unused agent files
3. **Move**: Type definitions to a single file
4. **Document**: Clear comments about architecture

### **Phase 2: Simplify markdown.ts**
The file IS too heavy-handed. Issues:
- Forces headings even when not needed
- Conflicts with streamdown
- Too many regex replacements
- Makes debugging hard

**Solution**: Make it opt-in, not forced

### **Phase 3: Fix UI Issues**
- Chips/text mixing (need to see specific element)
- Vertical spacing
- Profile coach editing

---

## 📋 **Action Plan**

### **Step 1: Archive Dead Code** ✅
Move to `/archive` folder:
- `src/config/agents.ts` → `archive/config/agents.ts`
- `src/services/agents/BaseAgent.ts` → `archive/agents/BaseAgent.ts`
- `src/services/agents/GPT5*.ts` → `archive/agents/`
- `src/services/agents/prompts/*` → `archive/agents/prompts/`

Keep:
- `src/services/agents/types.ts` (type definitions)
- `app/api/lib/context.ts` (active prompt builder)

### **Step 2: Simplify markdown.ts** ✅
Make formatting opt-in:
```typescript
export function normalizeMarkdown(raw: string, opts?: { 
  enforceResearchSections?: boolean;
  autoBold?: boolean;
  normalizeHeadings?: boolean;
}): string {
  // Only apply transformations if requested
  // Default to minimal processing
}
```

### **Step 3: Document Clearly** ✅
Add to `app/api/lib/context.ts`:
```typescript
/**
 * MAIN SYSTEM PROMPT BUILDER
 * 
 * This is the ONLY active prompt builder in the application.
 * Do NOT look at src/services/agents/* - those are unused legacy code.
 * 
 * To modify prompts, edit this file only.
 */
export async function buildSystemPrompt(...)
```

---

## 📊 **Impact Analysis**

### **Files to Remove**: 7
- src/config/agents.ts
- src/services/agents/BaseAgent.ts
- src/services/agents/GPT5AgentFactory.ts
- src/services/agents/GPT5OptimizedAgent.ts
- src/services/agents/ResearchAgent.ts (extract types first)
- src/services/agents/prompts/GPT5PromptLibrary.ts
- src/services/agents/prompts/ContextBuilder.ts

### **Files to Keep**: 2
- app/api/lib/context.ts (active)
- src/services/agents/types.ts (create from ResearchAgent.ts types)

### **Code Reduction**: ~2000 lines removed

---

## 🎯 **Benefits**

1. ✅ **Clarity**: One place to edit prompts
2. ✅ **Simplicity**: Less cognitive load
3. ✅ **Maintainability**: Obvious what does what
4. ✅ **Performance**: Less code to load
5. ✅ **Confidence**: No confusion about conflicts

---

## ⚠️ **Risks**

**Minimal** - The code being removed is already not being used. Zero runtime impact.

---

## 🚀 **Implementation Order**

1. **Create** `src/services/agents/types.ts` (extract from ResearchAgent.ts)
2. **Update** imports to use new types file
3. **Move** dead code to `/archive` folder
4. **Add** documentation comments
5. **Simplify** markdown.ts
6. **Test** to ensure nothing breaks
7. **Commit** with clear message

Would you like me to proceed with this consolidation?
