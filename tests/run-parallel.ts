#!/usr/bin/env ts-node
/**
 * Parallel Test Runner
 *
 * Runs all test suites in parallel and aggregates results.
 *
 * Usage:
 *   npm run test:parallel
 *   npm run test:parallel -- --headed  (run with browser visible)
 *   npm run test:parallel -- --debug   (run with debug logging)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Test suites to run
const TEST_SUITES = [
  'tests/onboarding.spec.ts',
  'tests/research.spec.ts',
  'tests/preferences.spec.ts',
  'tests/profile-coach.spec.ts',
  'tests/memory.spec.ts',
  // Add more as they're created:
  // 'tests/tracked-accounts.spec.ts',
  // 'tests/bulk-research.spec.ts',
  // 'tests/settings.spec.ts',
];

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  status: 'passed' | 'failed' | 'error';
  error?: string;
}

async function runTestSuite(suitePath: string): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    suite: path.basename(suitePath),
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    status: 'passed',
  };

  try {
    console.log(`\n🚀 Running ${result.suite}...`);

    // Run Playwright test for this suite
    const output = execSync(
      `npx playwright test ${suitePath} --reporter=json`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );

    // Parse JSON output
    const jsonOutput = JSON.parse(output);
    result.passed = jsonOutput.stats?.expected || 0;
    result.failed = jsonOutput.stats?.unexpected || 0;
    result.skipped = jsonOutput.stats?.skipped || 0;

    if (result.failed > 0) {
      result.status = 'failed';
    }

  } catch (error: any) {
    result.status = 'error';
    result.error = error.message;
    console.error(`❌ ${result.suite} failed:`, error.message);
  }

  result.duration = Date.now() - startTime;
  return result;
}

async function main() {
  console.log('🧪 Running E2E Tests in Parallel\n');
  console.log(`Test Suites: ${TEST_SUITES.length}`);
  console.log(`Workers: ${process.env.CI ? 2 : 4}\n`);

  const startTime = Date.now();

  // Run all test suites in parallel
  const results = await Promise.all(
    TEST_SUITES.map(suite => runTestSuite(suite))
  );

  const totalDuration = Date.now() - startTime;

  // Aggregate results
  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    errors: results.filter(r => r.status === 'error').length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    duration: totalDuration,
  };

  // Print results table
  console.log('\n\n📊 Test Results Summary\n');
  console.log('┌─────────────────────────────────┬────────┬────────┬─────────┬──────────┐');
  console.log('│ Suite                           │ Passed │ Failed │ Skipped │ Duration │');
  console.log('├─────────────────────────────────┼────────┼────────┼─────────┼──────────┤');

  results.forEach(r => {
    const suite = r.suite.padEnd(31);
    const passed = r.passed.toString().padStart(6);
    const failed = r.failed.toString().padStart(6);
    const skipped = r.skipped.toString().padStart(7);
    const duration = `${(r.duration / 1000).toFixed(1)}s`.padStart(8);

    const status = r.status === 'passed' ? '✅' :
                   r.status === 'failed' ? '❌' : '⚠️ ';

    console.log(`│ ${status} ${suite} │ ${passed} │ ${failed} │ ${skipped} │ ${duration} │`);
  });

  console.log('└─────────────────────────────────┴────────┴────────┴─────────┴──────────┘');

  // Print summary
  console.log('\n📈 Overall Summary\n');
  console.log(`  Suites:    ${summary.passed}/${summary.total} passed`);
  console.log(`  Tests:     ${summary.totalPassed}/${summary.totalTests} passed`);
  console.log(`  Failed:    ${summary.totalFailed}`);
  console.log(`  Skipped:   ${summary.totalSkipped}`);
  console.log(`  Duration:  ${(summary.duration / 1000).toFixed(1)}s`);

  // Save detailed results
  const resultsPath = 'test-results/parallel-results.json';
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify({ summary, results }, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

  // Exit with appropriate code
  if (summary.failed > 0 || summary.errors > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
