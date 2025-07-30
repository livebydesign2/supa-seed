/**
 * Jest Test Setup for SupaSeed v2.4.1
 * Global test configuration and utilities
 */

import { config } from 'dotenv';

// Load environment variables from .env.test if it exists
config({ path: '.env.test' });

// Set default test environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Increase timeout for integration tests
jest.setTimeout(60000);

// Global test utilities
global.testUtils = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate unique test identifier
   */
  generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Check if running in CI environment
   */
  isCI: () => process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
  
  /**
   * Get test database connection info
   */
  getTestConfig: () => ({
    supabaseUrl: process.env.TEST_SUPABASE_URL!,
    supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY!
  })
};

// Extend Jest matchers for better assertions
expect.extend({
  /**
   * Custom matcher for checking if a value is a valid UUID
   */
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for checking email format
   */
  toBeValidEmail(received: string) {
    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },

  /**
   * Custom matcher for performance testing
   */
  toCompleteWithin(received: number, expectedMs: number) {
    const pass = received <= expectedMs;
    
    if (pass) {
      return {
        message: () => `expected operation not to complete within ${expectedMs}ms, but it took ${received}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected operation to complete within ${expectedMs}ms, but it took ${received}ms`,
        pass: false,
      };
    }
  }
});

// Global setup and teardown
beforeAll(async () => {
  // Global test setup
  console.log('🧪 Starting SupaSeed test suite...');
});

afterAll(async () => {
  // Global test cleanup
  console.log('✅ SupaSeed test suite completed');
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export type augmentations for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toCompleteWithin(expectedMs: number): R;
    }
  }
  
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    generateTestId: () => string;
    isCI: () => boolean;
    getTestConfig: () => {
      supabaseUrl: string;
      supabaseServiceKey: string;
    };
  };
}