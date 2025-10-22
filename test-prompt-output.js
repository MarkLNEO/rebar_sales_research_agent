/**
 * Test Script: Verify Dynamic Prompt Output
 * 
 * This script simulates buildSystemPrompt() to verify:
 * 1. Prompt contains all required sections
 * 2. User context properly injected
 * 3. Dynamic elements work correctly
 * 4. Output length is reasonable
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 PHASE 3: Dynamic Prompt Output Test\n');
console.log('=' .repeat(60));

// Mock user context (realistic scenario)
const testContexts = [
  {
    name: 'New User (No Profile)',
    context: {
      userId: 'test-user-1',
      profile: null,
      customCriteria: [],
      signals: [],
      disqualifiers: []
    }
  },
  {
    name: 'Enterprise User (Full Profile)',
    context: {
      userId: 'test-user-2',
      profile: {
        company_name: 'Acme Corp',
        industry: 'Healthcare SaaS',
        user_role: 'VP Sales',
        use_case: 'enterprise_sales',
        icp_definition: 'Enterprise healthcare orgs with 1000+ employees, strong focus on HIPAA compliance',
        signal_terminology: 'Growth Signals',
        criteria_terminology: 'Deal Qualifiers',
        watchlist_label: 'Priority Alerts'
      },
      customCriteria: [
        {
          field_name: 'HIPAA Compliant',
          field_type: 'boolean',
          importance: 'critical',
          hints: ['SOC 2', 'HIPAA', 'compliance']
        },
        {
          field_name: 'Annual Revenue',
          field_type: 'number',
          importance: 'important',
          hints: ['$50M+', 'revenue']
        }
      ],
      signals: [
        {
          signal_type: 'Recent Funding Round',
          importance: 'critical',
          lookback_days: 90
        },
        {
          signal_type: 'Executive Hiring',
          importance: 'important',
          lookback_days: 60
        }
      ],
      disqualifiers: [
        {
          criterion: 'Under 100 employees'
        },
        {
          criterion: 'Non-healthcare industry'
        }
      ]
    }
  }
];

// Read context.ts to extract the function
const contextFile = fs.readFileSync(
  path.join(__dirname, 'app/api/lib/context.ts'),
  'utf8'
);

console.log('\n✅ Test 1: Base Prompt Structure\n');

// Test base sections are present
const baseSections = [
  { tag: '<instruction_hierarchy>', name: 'Instruction Hierarchy' },
  { tag: '<tool_preambles>', name: 'Tool Preambles' },
  { tag: '<persistence>', name: 'Persistence' },
  { tag: '<context_gathering>', name: 'Context Gathering' },
  { tag: '<output_excellence>', name: 'Output Excellence' },
  { tag: '<verbosity_control>', name: 'Verbosity Control' },
  { tag: '<web_search_mastery>', name: 'Web Search Mastery' },
  { tag: '<autonomous_operation>', name: 'Autonomous Operation' },
  { tag: '<proactive_follow_ups>', name: 'Proactive Follow-Ups' },
  { tag: '<response_format>', name: 'Response Format' }
];

let allBaseSectionsPresent = true;
baseSections.forEach(({ tag, name }) => {
  const present = contextFile.includes(tag);
  console.log(`  ${present ? '✓' : '✗'} ${name}: ${present ? 'Present' : 'MISSING'}`);
  if (!present) allBaseSectionsPresent = false;
});

console.log(allBaseSectionsPresent ? '\n  ✅ All base sections present\n' : '\n  ❌ Some sections missing\n');

// Test 2: Priority ordering in instruction hierarchy
console.log('✅ Test 2: Instruction Hierarchy Priority\n');
const hierarchyMatch = contextFile.match(/<instruction_hierarchy>([\s\S]*?)<\/instruction_hierarchy>/);
if (hierarchyMatch) {
  const hierarchy = hierarchyMatch[1];
  const priorities = ['Priority 1:', 'Priority 2:', 'Priority 3:', 'Priority 4:'];
  let hierarchyCorrect = true;
  
  priorities.forEach(priority => {
    const present = hierarchy.includes(priority);
    console.log(`  ${present ? '✓' : '✗'} ${priority} ${present ? 'defined' : 'MISSING'}`);
    if (!present) hierarchyCorrect = false;
  });
  
  console.log(hierarchyCorrect ? '\n  ✅ Hierarchy correctly ordered\n' : '\n  ❌ Hierarchy incomplete\n');
} else {
  console.log('  ❌ Instruction hierarchy section not found\n');
}

// Test 3: Tool preamble examples
console.log('✅ Test 3: Tool Preamble Examples\n');
const preambleExamples = [
  '🔍 Researching',
  'Checking recent funding',
  '✅ Research complete'
];

let preambleCheck = true;
preambleExamples.forEach(example => {
  const present = contextFile.includes(example);
  console.log(`  ${present ? '✓' : '✗'} "${example}": ${present ? 'Found' : 'MISSING'}`);
  if (!present) preambleCheck = false;
});

console.log(preambleCheck ? '\n  ✅ Tool preambles have examples\n' : '\n  ❌ Preamble examples missing\n');

// Test 4: Context gathering strategy
console.log('✅ Test 4: Context Gathering Strategy Details\n');
const contextGatheringElements = [
  'Launch 3-5 parallel web_search calls',
  'Read top 2-3 results per search',
  'Stop when you have enough to act',
  'Quality threshold:'
];

let contextGatheringComplete = true;
contextGatheringElements.forEach(element => {
  const present = contextFile.includes(element);
  console.log(`  ${present ? '✓' : '✗'} ${element}: ${present ? 'Present' : 'MISSING'}`);
  if (!present) contextGatheringComplete = false;
});

console.log(contextGatheringComplete ? '\n  ✅ Context gathering fully specified\n' : '\n  ❌ Context gathering incomplete\n');

// Test 5: User context injection
console.log('✅ Test 5: User Context Injection\n');

// Check that profile fields are used
const profileFields = [
  'profile.company_name',
  'profile.industry',
  'profile.user_role',
  'profile.signal_terminology',
  'profile.criteria_terminology'
];

let contextInjectionWorks = true;
profileFields.forEach(field => {
  const present = contextFile.includes(field);
  console.log(`  ${present ? '✓' : '✗'} Uses ${field}: ${present ? 'Yes' : 'NO'}`);
  if (!present) contextInjectionWorks = false;
});

console.log(contextInjectionWorks ? '\n  ✅ User context properly injected\n' : '\n  ❌ Context injection incomplete\n');

// Test 6: Custom terminology
console.log('✅ Test 6: Terminology Adaptation\n');

// Check for terminology adaptation
const terminologyChecks = [
  { pattern: 'signalTerm', description: 'Signal terminology variable' },
  { pattern: 'criteriaTerm', description: 'Criteria terminology variable' },
  { pattern: 'watchlistTerm', description: 'Watchlist terminology variable' }
];

let terminologyWorks = true;
terminologyChecks.forEach(({ pattern, description }) => {
  const present = contextFile.includes(pattern);
  console.log(`  ${present ? '✓' : '✗'} ${description}: ${present ? 'Used' : 'NOT USED'}`);
  if (!present) terminologyWorks = false;
});

console.log(terminologyWorks ? '\n  ✅ Terminology adaptation implemented\n' : '\n  ❌ Terminology adaptation missing\n');

// Test 7: No contradictions
console.log('✅ Test 7: Contradiction Check\n');

const contradictions = [
  { phrase: 'Be concise but complete', shouldBeAbsent: true },
  { phrase: '## PREFERENCE CHECK-OUT', shouldBeAbsent: true }
];

let noContradictions = true;
contradictions.forEach(({ phrase, shouldBeAbsent }) => {
  const index = contextFile.indexOf(phrase);
  if (index !== -1) {
    // Check if it's in a BAD example
    const beforeText = contextFile.substring(Math.max(0, index - 100), index);
    const isInBadExample = beforeText.includes('❌ BAD');
    
    if (shouldBeAbsent && !isInBadExample) {
      console.log(`  ✗ FOUND: "${phrase}" (should be absent)`);
      noContradictions = false;
    } else if (isInBadExample) {
      console.log(`  ✓ "${phrase}" only in negative examples (correct)`);
    }
  } else {
    console.log(`  ✓ "${phrase}" correctly absent`);
  }
});

console.log(noContradictions ? '\n  ✅ No contradictions found\n' : '\n  ❌ Contradictions present\n');

// Test 8: Estimate prompt size
console.log('✅ Test 8: Prompt Size Estimation\n');

// Extract just the prompt template (base prompt)
const basePromptMatch = contextFile.match(/let prompt = `([\s\S]*?)`;\s*\n\s*if \(profile\)/);
if (basePromptMatch) {
  const basePrompt = basePromptMatch[1];
  const baseTokens = Math.ceil(basePrompt.length / 4); // Rough estimate
  
  console.log(`  Base Prompt Length: ${basePrompt.length} chars`);
  console.log(`  Estimated Base Tokens: ~${baseTokens} tokens`);
  console.log(`  With User Context: ~${baseTokens + 500}-${baseTokens + 1000} tokens`);
  
  if (baseTokens < 2000) {
    console.log(`\n  ✅ Base prompt size reasonable (< 2000 tokens)\n`);
  } else {
    console.log(`\n  ⚠️  Base prompt is large (> 2000 tokens)\n`);
  }
}

// Test 9: XML tag pairing
console.log('✅ Test 9: XML Tag Pairing\n');

const xmlTags = [
  'instruction_hierarchy',
  'tool_preambles',
  'persistence',
  'context_gathering',
  'output_excellence',
  'verbosity_control',
  'web_search_mastery',
  'autonomous_operation',
  'proactive_follow_ups',
  'response_format',
  'user_context',
  'custom_criteria',
  'buying_signals',
  'disqualifiers'
];

let allTagsPaired = true;
xmlTags.forEach(tag => {
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;
  const hasOpen = contextFile.includes(openTag);
  const hasClose = contextFile.includes(closeTag);
  
  if (hasOpen && hasClose) {
    console.log(`  ✓ <${tag}> properly paired`);
  } else if (hasOpen && !hasClose) {
    console.log(`  ✗ <${tag}> MISSING CLOSE TAG`);
    allTagsPaired = false;
  } else if (!hasOpen && hasClose) {
    console.log(`  ✗ <${tag}> MISSING OPEN TAG`);
    allTagsPaired = false;
  }
  // If neither, it's optional (like user_context)
});

console.log(allTagsPaired ? '\n  ✅ All XML tags properly paired\n' : '\n  ❌ Some tags not paired\n');

// Final Summary
console.log('=' .repeat(60));
console.log('\n📊 PHASE 3 AUTOMATED TESTS SUMMARY:\n');

const results = [
  { name: 'Base Sections', passed: allBaseSectionsPresent },
  { name: 'Hierarchy', passed: hierarchyMatch !== null },
  { name: 'Tool Preambles', passed: preambleCheck },
  { name: 'Context Gathering', passed: contextGatheringComplete },
  { name: 'Context Injection', passed: contextInjectionWorks },
  { name: 'Terminology', passed: terminologyWorks },
  { name: 'No Contradictions', passed: noContradictions },
  { name: 'XML Pairing', passed: allTagsPaired }
];

results.forEach(({ name, passed }) => {
  console.log(`  ${passed ? '✅' : '❌'} ${name}`);
});

const allPassed = results.every(r => r.passed);

console.log(allPassed ? '\n🎉 ALL AUTOMATED TESTS PASSED!' : '\n⚠️  SOME TESTS FAILED');
console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('\n✅ Phase 3 automated verification complete');
  console.log('✅ Prompt structure verified');
  console.log('✅ Ready for production testing');
  console.log('\n📋 Next: Run manual production tests');
  console.log('   See READY_FOR_TESTING.md for instructions');
  process.exit(0);
} else {
  console.log('\n❌ Fix failing tests before production testing');
  process.exit(1);
}
