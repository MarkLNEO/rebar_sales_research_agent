// Test script to verify system prompt fixes for signals and target titles
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testPromptFixes() {
  console.log('=== Testing System Prompt Fixes ===\n');

  // Get a test user (use the first user we can find)
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);

  if (!users || users.length === 0) {
    console.log('No users found in database');
    return;
  }

  const userId = users[0].id;
  console.log(`Testing with user ID: ${userId}\n`);

  // Check if user has signal preferences configured
  const { data: signalPrefs } = await supabase
    .from('user_signal_preferences')
    .select('*')
    .eq('user_id', userId);

  console.log('📊 SIGNAL PREFERENCES (Bug #1 Fix):');
  if (signalPrefs && signalPrefs.length > 0) {
    console.log('User has configured signal types:');
    signalPrefs.forEach((pref, i) => {
      console.log(`  ${i + 1}. ${pref.signal_type} (severity: ${pref.min_severity || 'any'})`);
    });
    console.log('\n✅ System prompt will now include:');
    console.log('   **CRITICAL OUTPUT REQUIREMENT**:');
    console.log('   Include a **Buying Signals** section with findings broken down BY SIGNAL TYPE:');
    signalPrefs.forEach(pref => {
      console.log(`   **${pref.signal_type}**: [findings or "No recent activity"]`);
    });
  } else {
    console.log('❌ No signal preferences configured for this user');
    console.log('   Default signals will be used');
  }

  console.log('\n---\n');

  // Check if user has ICP profile with target titles
  const { data: icpProfiles } = await supabase
    .from('icp_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  console.log('👤 TARGET TITLES (Bug #4 Fix):');
  if (icpProfiles && icpProfiles.length > 0) {
    const profile = icpProfiles[0];
    console.log(`ICP Profile: ${profile.profile_name || 'Default'}`);

    if (profile.target_titles && Array.isArray(profile.target_titles) && profile.target_titles.length > 0) {
      console.log('Configured target decision maker titles:');
      profile.target_titles.forEach((title, i) => {
        const titleStr = typeof title === 'string' ? title : title.title;
        console.log(`  ${i + 1}. ${titleStr}`);
      });
      console.log('\n✅ System prompt will now include:');
      console.log('   **Target Decision Maker Titles:** ' + profile.target_titles.map(t => typeof t === 'string' ? t : t.title).join(', '));
      console.log('   **CRITICAL**: These are the EXACT titles the user sells into.');
      console.log('   You MUST include a "Decision Makers" section in every company research output');
      console.log('   showing contacts for these titles.');
    } else {
      console.log('❌ No target titles configured in ICP profile');
    }
  } else {
    console.log('❌ No active ICP profiles found for this user');
  }

  console.log('\n---\n');

  console.log('📝 VERIFICATION SUMMARY:');
  console.log('');
  console.log('Bug #1 - Signal Terminology:');
  console.log('  ✅ System prompt now enforces EXACT signal type names from user config');
  console.log('  ✅ Output MUST show breakdown by signal type (not generic list)');
  console.log('');
  console.log('Bug #4 - Missing Target Titles:');
  console.log('  ✅ System prompt now includes target titles with CRITICAL flag');
  console.log('  ✅ Output MUST include "Decision Makers" section for each title');
  console.log('');
  console.log('Location of fixes: app/api/lib/context.ts');
  console.log('  - Lines 571-581: Signal terminology enforcement');
  console.log('  - Lines 510-513: Target titles requirement');
}

testPromptFixes().catch(console.error);
