#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://matxrspxbaqegvyliyba.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdHhyc3B4YmFxZWd2eWxpeWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MzgxMzIsImV4cCI6MjA3NTExNDEzMn0.sIrKcFjgrY3HKtu09ehsKv39666W0Vx9CC2OlwkHJpk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const users = [
  { email: 'cliff.test@nevereverordinary.com', password: 'Test123!@#' },
  { email: 'sarah.test@nevereverordinary.com', password: 'Test123!@#' }
];

for (const user of users) {
  console.log(`Creating ${user.email}...`);
  const { data, error } = await supabase.auth.signUp({
    email: user.email,
    password: user.password,
  });

  if (error) {
    console.log(`  Error: ${error.message}`);
  } else {
    const confirmed = data.user?.email_confirmed_at ? 'yes' : 'no';
    console.log(`  Created: ${data.user?.id} (confirmed: ${confirmed})`);
  }
}

console.log('\nDone!');
