/**
 * Logging System Test Script
 *
 * Run with: npx tsx scripts/test-logging.ts
 *
 * This script demonstrates and tests the logging system
 */

import { logger, createContextLogger, withTiming } from '../src/lib/logger';
import {
  logSystemInfo,
  logEnvironmentInfo,
  logStructuredError,
  withPerformanceMonitoring,
  logMemoryUsage,
} from '../src/lib/logger/utils';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testBasicLogging() {
  console.log('\n=== Testing Basic Logging ===\n');

  logger.debug('This is a debug message', { level: 'debug' });
  logger.info('This is an info message', { userId: 123 });
  logger.warn('This is a warning message', { threshold: 0.8 });
  logger.error('This is an error message', new Error('Test error'));
}

async function testContextLogger() {
  console.log('\n=== Testing Context Logger ===\n');

  const requestLogger = createContextLogger({
    requestId: 'test-123',
    userId: 'user-456',
    operation: 'test-operation',
  });

  requestLogger.info('Starting operation');
  await sleep(100);
  requestLogger.debug('Processing data');
  await sleep(100);
  requestLogger.info('Operation completed');
}

async function testPerformanceTiming() {
  console.log('\n=== Testing Performance Timing ===\n');

  const result = await withTiming(
    'database-query',
    async () => {
      await sleep(150);
      return { rows: 42 };
    },
    { table: 'users', operation: 'select' }
  );

  logger.info('Query result', result);
}

async function testPerformanceMonitoring() {
  console.log('\n=== Testing Performance Monitoring ===\n');

  const monitoredFunction = withPerformanceMonitoring(
    async (userId: number, action: string) => {
      await sleep(200);
      return { success: true, userId, action };
    },
    'user-action'
  );

  await monitoredFunction(123, 'login');
}

async function testStructuredError() {
  console.log('\n=== Testing Structured Error Logging ===\n');

  try {
    throw new Error('Something went wrong');
  } catch (error) {
    logStructuredError(error as Error, {
      operation: 'test-operation',
      userId: 'user-123',
      requestId: 'req-456',
      additionalData: {
        attemptNumber: 3,
        retryable: true,
      },
    });
  }
}

async function testSensitiveDataRedaction() {
  console.log('\n=== Testing Sensitive Data Redaction ===\n');

  logger.info('User login attempt', {
    email: 'user@example.com',
    password: 'secret123', // Should be redacted
    apiKey: 'sk-123456789', // Should be redacted
    token: 'bearer-token-xyz', // Should be redacted
    normalField: 'This should be visible',
  });
}

async function testSystemInfo() {
  console.log('\n=== Testing System Info Logging ===\n');

  logSystemInfo();
  logEnvironmentInfo();
  logMemoryUsage();
}

async function main() {
  console.log('🎵 Melodia Logging System Test\n');
  console.log('Current configuration:');
  console.log('- LOG_LEVEL:', process.env.LOG_LEVEL || 'default');
  console.log('- DEBUG_MODE:', process.env.DEBUG_MODE || 'default');
  console.log('- LOG_PRETTY:', process.env.LOG_PRETTY || 'default');
  console.log('');

  try {
    await testBasicLogging();
    await testContextLogger();
    await testPerformanceTiming();
    await testPerformanceMonitoring();
    await testStructuredError();
    await testSensitiveDataRedaction();
    await testSystemInfo();

    console.log('\n✅ All tests completed successfully!\n');
    console.log('📖 For more information, see LOGGING.md');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();






