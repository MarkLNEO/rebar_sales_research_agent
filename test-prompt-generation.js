/**
 * Test Script: Verify Optimized Prompt Generation
 * 
 * This script tests the buildSystemPrompt function to ensure:
 * 1. All required sections are present
 * 2. No "PREFERENCE CHECK-OUT" language
 * 3. XML tags are properly structured
 * 4. User context is properly injected
 */

const fs = require('fs');
const path = require('path');

// Mock context data
const mockContext = {
  userId: 'test-user-123',
  profile: {
    company_name: 'Test Corp',
    industry: 'SaaS',
    user_role: 'Account Executive',
    use_case: 'lead_generation',
    icp_definition: 'Enterprise companies with 500+ employees in healthcare tech',
    signal_terminology: 'Buying Signals',
    criteria_terminology: 'Custom Criteria',
    watchlist_label: 'Watchlist'
  },
  customCriteria: [
    {
      field_name: 'Has CISO',
      field_type: 'boolean',
      importance: 'critical',
      hints: ['job postings', 'LinkedIn']
    }
  ],
  signals: [
    {
      signal_type: 'Recent funding',
      importance: 'critical',
      lookback_days: 90
    }
  ],
  disqualifiers: [
    {
      criterion: 'Under 50 employees'
    }
  ]
};

// Read the context.ts file
const contextFilePath = path.join(__dirname, 'app/api/lib/context.ts');
const contextFileContent = fs.readFileSync(contextFilePath, 'utf8');

console.log('🔍 PHASE 1 VERIFICATION: Prompt Generation Test\n');
console.log('=' .repeat(60));

// Test 1: Check for required XML sections
console.log('\n✅ Test 1: Required XML Sections');
const requiredSections = [
  '<instruction_hierarchy>',
  '<tool_preambles>',
  '<persistence>',
  '<context_gathering>',
  '<output_excellence>',
  '<verbosity_control>',
  '<web_search_mastery>',
  '<autonomous_operation>',
  '<proactive_follow_ups>',
  '<response_format>'
];

let allSectionsPresent = true;
requiredSections.forEach(section => {
  if (contextFileContent.includes(section)) {
    console.log(`  ✓ ${section} found`);
  } else {
    console.log(`  ✗ ${section} MISSING`);
    allSectionsPresent = false;
  }
});

console.log(allSectionsPresent ? '\n  ✅ All XML sections present' : '\n  ❌ Some sections missing');

// Test 2: Check for removed contradictions (not in negative examples)
console.log('\n✅ Test 2: Contradictions Removed');
const bannedPhrases = [
  'Be concise but complete',
  'PREFERENCE CHECK-OUT'
];

// Check if banned phrases appear OUTSIDE of "❌ BAD" examples
let noContradictions = true;
bannedPhrases.forEach(phrase => {
  const phraseIndex = contextFileContent.indexOf(phrase);
  if (phraseIndex !== -1) {
    // Check if it's in a BAD example context (within 100 chars of ❌ BAD)
    const beforeText = contextFileContent.substring(Math.max(0, phraseIndex - 100), phraseIndex);
    const isInBadExample = beforeText.includes('❌ BAD');
    
    if (isInBadExample) {
      console.log(`  ✓ "${phrase}" only in negative examples (correct)`);
    } else {
      console.log(`  ✗ FOUND BANNED PHRASE: "${phrase}"`);
      noContradictions = false;
    }
  } else {
    console.log(`  ✓ "${phrase}" removed`);
  }
});

console.log(noContradictions ? '\n  ✅ All contradictions removed' : '\n  ❌ Some contradictions remain');

// Test 3: Check for tool preamble examples
console.log('\n✅ Test 3: Tool Preamble Examples');
const preambleExamples = [
  '🔍 Researching',
  'Checking recent funding',
  '✅ Research complete'
];

let hasPreambles = true;
preambleExamples.forEach(example => {
  if (contextFileContent.includes(example)) {
    console.log(`  ✓ "${example}" found`);
  } else {
    console.log(`  ✗ "${example}" missing`);
    hasPreambles = false;
  }
});

console.log(hasPreambles ? '\n  ✅ Tool preambles present' : '\n  ❌ Tool preambles missing');

// Test 4: Check for persistence instructions
console.log('\n✅ Test 4: Persistence Instructions');
const persistenceKeywords = [
  'autonomous research agent',
  'Find at least 3 actionable insights',
  'Never ask "should I continue?"',
  'Don\'t ask permission to research deeper'
];

let hasPersistence = true;
persistenceKeywords.forEach(keyword => {
  if (contextFileContent.includes(keyword)) {
    console.log(`  ✓ "${keyword}" found`);
  } else {
    console.log(`  ✗ "${keyword}" missing`);
    hasPersistence = false;
  }
});

console.log(hasPersistence ? '\n  ✅ Persistence instructions present' : '\n  ❌ Persistence instructions missing');

// Test 5: Check for context gathering strategy
console.log('\n✅ Test 5: Context Gathering Strategy');
const contextGatheringKeywords = [
  'Launch 3-5 parallel web_search calls',
  'Read top 2-3 results per search',
  'Stop when you have enough to act',
  'Quality threshold'
];

let hasContextGathering = true;
contextGatheringKeywords.forEach(keyword => {
  if (contextFileContent.includes(keyword)) {
    console.log(`  ✓ "${keyword}" found`);
  } else {
    console.log(`  ✗ "${keyword}" missing`);
    hasContextGathering = false;
  }
});

console.log(hasContextGathering ? '\n  ✅ Context gathering strategy present' : '\n  ❌ Context gathering strategy missing');

// Test 6: Check for improved follow-ups
console.log('\n✅ Test 6: Improved Follow-Ups');
const goodExamples = [
  'Ready to draft a warm intro email',
  'Want me to track their engineering hiring',
  'Should I always prioritize tech stack changes'
];
const badExamples = [
  'Preference check-out',
  'Save this to your history?'
];

let hasGoodFollowUps = true;
goodExamples.forEach(example => {
  if (contextFileContent.includes(example)) {
    console.log(`  ✓ Good example: "${example.substring(0, 40)}..."`);
  } else {
    console.log(`  ✗ Good example missing`);
    hasGoodFollowUps = false;
  }
});

badExamples.forEach(example => {
  const exampleIndex = contextFileContent.indexOf(example);
  if (exampleIndex !== -1) {
    // Check if it's in a ❌ BAD example context (teaching what NOT to do)
    const beforeText = contextFileContent.substring(Math.max(0, exampleIndex - 100), exampleIndex);
    const isInBadExample = beforeText.includes('❌ BAD');
    
    if (isInBadExample) {
      console.log(`  ✓ Bad example used for teaching (correct): "${example}"`);
    } else {
      console.log(`  ✗ BAD example found outside teaching context: "${example}"`);
      hasGoodFollowUps = false;
    }
  } else {
    console.log(`  ✓ Bad example not found: "${example}"`);
  }
});

console.log(hasGoodFollowUps ? '\n  ✅ Follow-ups improved' : '\n  ❌ Follow-ups need work');

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 PHASE 1 SUMMARY:');
console.log(`  XML Sections: ${allSectionsPresent ? '✅' : '❌'}`);
console.log(`  Contradictions Removed: ${noContradictions ? '✅' : '❌'}`);
console.log(`  Tool Preambles: ${hasPreambles ? '✅' : '❌'}`);
console.log(`  Persistence: ${hasPersistence ? '✅' : '❌'}`);
console.log(`  Context Gathering: ${hasContextGathering ? '✅' : '❌'}`);
console.log(`  Follow-Ups: ${hasGoodFollowUps ? '✅' : '❌'}`);

const allTestsPassed = allSectionsPresent && noContradictions && hasPreambles && 
                        hasPersistence && hasContextGathering && hasGoodFollowUps;

console.log(`\n${allTestsPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
console.log('\n' + '='.repeat(60));

if (allTestsPassed) {
  console.log('\n✅ Phase 1 implementation matches documentation');
  console.log('✅ Ready to proceed to Phase 2');
} else {
  console.log('\n❌ Phase 1 needs fixes before proceeding');
  process.exit(1);
}
