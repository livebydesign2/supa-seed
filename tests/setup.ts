// Test setup file for Jest
// This file is run before all tests

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test timeout
jest.setTimeout(30000);

// Global test utilities
global.testConfig = {
  supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key',
  environment: 'local' as const,
  userCount: 2,
  setupsPerUser: 1,
  imagesPerSetup: 0,
  enableRealImages: false,
  seed: 'test-seed-123',
};

// Extend global namespace for TypeScript
declare global {
  var testConfig: {
    supabaseUrl: string;
    supabaseServiceKey: string;
    environment: 'local';
    userCount: number;
    setupsPerUser: number;
    imagesPerSetup: number;
    enableRealImages: boolean;
    seed: string;
  };
}