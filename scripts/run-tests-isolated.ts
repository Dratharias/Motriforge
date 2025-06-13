import { spawn } from 'child_process';
import { glob } from 'glob';

/**
 * Run tests in complete isolation to prevent database conflicts
 * This script runs each test file individually to ensure zero interference
 */
async function runTestsIsolated() {
  console.log('🧪 Running tests in complete isolation...\n');

  try {
    // Find all test files
    const testFiles = await glob('tests/**/*.test.{ts,js}', {
      cwd: process.cwd(),
      absolute: false
    });

    console.log(`Found ${testFiles.length} test files:\n`);
    testFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    console.log('');

    let passedCount = 0;
    let failedCount = 0;
    const failedFiles: string[] = [];

    // Run each test file individually
    for (let i = 0; i < testFiles.length; i++) {
      const testFile = testFiles[i];
      const fileNum = i + 1;
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🧪 Running test ${fileNum}/${testFiles.length}: ${testFile}`);
      console.log(`${'='.repeat(60)}\n`);

      const success = await runSingleTest(testFile);
      
      if (success) {
        passedCount++;
        console.log(`✅ PASSED: ${testFile}\n`);
      } else {
        failedCount++;
        failedFiles.push(testFile);
        console.log(`❌ FAILED: ${testFile}\n`);
      }

      // Small delay between tests to ensure complete cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 TEST SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total tests: ${testFiles.length}`);
    console.log(`✅ Passed: ${passedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    
    if (failedFiles.length > 0) {
      console.log(`\n🚨 Failed test files:`);
      failedFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }

    console.log(`${'='.repeat(60)}\n`);

    // Exit with appropriate code
    process.exit(failedCount > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Error running isolated tests:', error);
    process.exit(1);
  }
}

/**
 * Run a single test file
 */
function runSingleTest(testFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('npx', ['vitest', 'run', testFile, '--reporter=verbose'], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        // Force isolation for this specific run
        VITEST_POOL: 'forks',
        VITEST_ISOLATE: 'true'
      }
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', (error) => {
      console.error(`Error running test ${testFile}:`, error);
      resolve(false);
    });
  });
}

/**
 * Quick test for database connectivity
 */
async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { db } = await import('../backend/database/connection');
    await db.execute('SELECT 1');
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Isolated Test Runner

Usage: tsx scripts/run-tests-isolated.ts [options]

This script runs each test file individually to prevent database conflicts
and ensure complete test isolation.

Options:
  -h, --help    Show this help message
  --db-check    Only check database connection
  
Examples:
  tsx scripts/run-tests-isolated.ts
  tsx scripts/run-tests-isolated.ts --db-check
`);
    return;
  }

  if (args.includes('--db-check')) {
    console.log('🔍 Checking database connection...');
    const connected = await testDatabaseConnection();
    process.exit(connected ? 0 : 1);
    return;
  }

  // Check database connection first
  console.log('🔍 Verifying database connection...');
  const dbOk = await testDatabaseConnection();
  
  if (!dbOk) {
    console.error('\n❌ Database connection failed. Please ensure:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. DATABASE_URL is set correctly in .env');
    console.error('  3. Database exists and is accessible\n');
    process.exit(1);
  }

  await runTestsIsolated();
}

// Handle script interruption gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test run interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Test run terminated');
  process.exit(143);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}