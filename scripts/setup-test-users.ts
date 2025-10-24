#!/usr/bin/env ts-node
/**
 * Setup script to create test users in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const TEST_USERS = [
  {
    email: 'cliff.test@rebarhq.ai',
    password: 'Test123!@#',
    metadata: {
      full_name: 'Cliff Test',
      role: 'Account Executive',
      company: 'Acme Security Solutions',
    }
  },
  {
    email: 'sarah.test@rebarhq.ai',
    password: 'Test123!@#',
    metadata: {
      full_name: 'Sarah Test',
      role: 'Sales Director',
      company: 'TechCorp Inc',
    }
  }
];

async function setupTestUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('🚀 Setting up test users...\n');

  for (const user of TEST_USERS) {
    try {
      console.log(`Creating user: ${user.email}`);

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`  ⚠️  User already exists, skipping`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Created user: ${data.user?.id}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed to create user: ${err.message}`);
    }
  }

  console.log('\n✅ Test user setup complete!');
  console.log('\nYou can now run tests with:');
  console.log('  npm run test:parallel');
}

setupTestUsers();
