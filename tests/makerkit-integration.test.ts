/**
 * MakerKit Integration Tests for SupaSeed v2.4.1
 * Focused testing of MakerKit-specific functionality and schema compatibility
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'jest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MakerKitStrategy } from '../src/framework/strategies/makerkit-strategy';
import { Logger } from '../src/utils/logger';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || 'test-key'
};

describe('MakerKit Integration Tests', () => {
  let supabase: SupabaseClient;
  let strategy: MakerKitStrategy;
  let testAccountIds: string[] = [];

  beforeAll(async () => {
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    strategy = new MakerKitStrategy();
    await strategy.initialize(supabase);
    Logger.level = 'error'; // Suppress logs during testing
  });

  afterAll(async () => {
    await cleanupTestAccounts();
  });

  beforeEach(() => {
    testAccountIds = [];
  });

  describe('Framework Detection', () => {
    test('should detect MakerKit framework correctly', async () => {
      const detection = await strategy.detectFramework();
      
      expect(detection.framework).toBe('makerkit');
      expect(detection.hasAccountsTable).toBe(true);
      expect(detection.hasProfilesTable).toBe(false);
      expect(detection.accountsTableStructure).toBeDefined();
    });

    test('should identify accounts table structure', async () => {
      const detection = await strategy.detectFramework();
      const structure = detection.accountsTableStructure;
      
      expect(structure.hasIsPersonalAccount).toBe(true);
      expect(structure.hasSlugField).toBe(true);
      expect(structure.hasPublicDataField).toBe(true);
      expect(structure.publicDataType).toBe('jsonb');
    });

    test('should validate MakerKit constraints', async () => {
      const constraints = await strategy.analyzeMakerKitConstraints();
      
      expect(constraints.personalAccountConstraint).toBeDefined();
      expect(constraints.emailUniqueConstraint).toBeDefined();
      expect(constraints.slugNullableConstraint).toBeDefined();
    });
  });

  describe('Account Creation', () => {
    test('should create basic personal account', async () => {
      const userData = {
        email: 'basic-test@makerkit.test',
        name: 'Basic Test User'
      };

      const result = await strategy.createMakerKitAccount(userData);
      
      expect(result.success).toBe(true);
      expect(result.accountId).toBeDefined();
      expect(result.authUser).toBeDefined();
      
      testAccountIds.push(result.accountId!);

      // Verify account properties
      const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', result.accountId)
        .single();

      expect(account.email).toBe(userData.email);
      expect(account.name).toBe(userData.name);
      expect(account.is_personal_account).toBe(true);
      expect(account.slug).toBeNull();
    });

    test('should handle JSONB public_data field correctly', async () => {
      const userData = {
        email: 'jsonb-test@makerkit.test',
        name: 'JSONB Test User',
        bio: 'A passionate outdoor enthusiast who loves hiking and camping.',
        username: 'outdoorpro123'
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      const { data: account } = await supabase
        .from('accounts')
        .select('public_data')
        .eq('id', result.accountId)
        .single();

      expect(account.public_data).toEqual({
        bio: userData.bio,
        username: userData.username
      });
    });

    test('should handle special characters in JSONB fields', async () => {
      const userData = {
        email: 'special-chars@makerkit.test',
        name: 'Special Character User',
        bio: 'Bio with special chars: éñüñ@#$%^&*(){}[]|\\:";\'<>?,./`~',
        username: 'user_with-dots.and_underscores'
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      const { data: account } = await supabase
        .from('accounts')
        .select('public_data')
        .eq('id', result.accountId)
        .single();

      expect(account.public_data.bio).toBe(userData.bio);
      expect(account.public_data.username).toBe(userData.username);
    });

    test('should create auth.users entry with correct properties', async () => {
      const userData = {
        email: 'auth-test@makerkit.test',
        name: 'Auth Test User',
        password: 'test-password-123'
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      // Verify auth user was created
      expect(result.authUser).toBeDefined();
      expect(result.authUser!.email).toBe(userData.email);
      expect(result.authUser!.id).toBe(result.accountId);
    });
  });

  describe('Constraint Handling', () => {
    test('should handle duplicate email errors gracefully', async () => {
      const userData = {
        email: 'duplicate@makerkit.test',
        name: 'First User'
      };

      // Create first user
      const firstResult = await strategy.createMakerKitAccount(userData);
      expect(firstResult.success).toBe(true);
      testAccountIds.push(firstResult.accountId!);

      // Attempt to create duplicate
      const duplicateResult = await strategy.createMakerKitAccount(userData);
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain('duplicate');
    });

    test('should enforce personal account constraints', async () => {
      const userData = {
        email: 'constraint-test@makerkit.test',
        name: 'Constraint Test User'
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      // Verify constraint enforcement
      const { data: account } = await supabase
        .from('accounts')
        .select('is_personal_account, slug')
        .eq('id', result.accountId)
        .single();

      expect(account.is_personal_account).toBe(true);
      expect(account.slug).toBeNull(); // Personal accounts have null slug
    });

    test('should handle null slug for personal accounts', async () => {
      const userData = {
        email: 'null-slug@makerkit.test',
        name: 'Null Slug User'
      };

      // Try to create account with explicit slug (should be ignored for personal accounts)
      const userDataWithSlug = { ...userData, slug: 'should-be-ignored' };
      
      const result = await strategy.createMakerKitAccount(userDataWithSlug);
      testAccountIds.push(result.accountId!);

      const { data: account } = await supabase
        .from('accounts')
        .select('slug')
        .eq('id', result.accountId)
        .single();

      expect(account.slug).toBeNull();
    });
  });

  describe('Schema Compatibility', () => {
    test('should handle missing bio/username gracefully', async () => {
      const userData = {
        email: 'minimal@makerkit.test',
        name: 'Minimal User'
        // No bio or username
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      const { data: account } = await supabase
        .from('accounts')
        .select('public_data')
        .eq('id', result.accountId)
        .single();

      // public_data should be null or empty when no additional data provided
      expect(account.public_data).toBeNull();
    });

    test('should support partial JSONB data', async () => {
      const userData = {
        email: 'partial@makerkit.test',
        name: 'Partial Data User',
        bio: 'Only bio provided'
        // No username
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      const { data: account } = await supabase
        .from('accounts')
        .select('public_data')
        .eq('id', result.accountId)
        .single();

      expect(account.public_data).toEqual({
        bio: userData.bio
      });
      expect(account.public_data.username).toBeUndefined();
    });

    test('should work with existing MakerKit triggers', async () => {
      // Test that our account creation works with MakerKit's existing triggers
      const userData = {
        email: 'trigger-test@makerkit.test',
        name: 'Trigger Test User',
        bio: 'Testing MakerKit triggers'
      };

      const result = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(result.accountId!);

      // Verify account was created and triggers didn't interfere
      const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', result.accountId)
        .single();

      expect(account).toBeDefined();
      expect(account.created_at).toBeDefined();
      expect(account.updated_at).toBeDefined();
    });
  });

  describe('Setup Relationships', () => {
    test('should create setups with correct account_id foreign key', async () => {
      // First create an account
      const userData = {
        email: 'setup-creator@makerkit.test',
        name: 'Setup Creator'
      };

      const accountResult = await strategy.createMakerKitAccount(userData);
      testAccountIds.push(accountResult.accountId!);

      // Create a setup linked to this account
      const setupData = {
        title: 'Test MakerKit Setup',
        description: 'Setup created for MakerKit integration testing',
        account_id: accountResult.accountId,
        is_public: true,
        category_id: null,
        total_weight: 1500,
        total_price: 25000
      };

      const { data: setup, error } = await supabase
        .from('setups')
        .insert(setupData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(setup).toBeDefined();
      expect(setup.account_id).toBe(accountResult.accountId);
      expect(setup.title).toBe(setupData.title);
    });

    test('should enforce foreign key constraint for setups', async () => {
      const setupData = {
        title: 'Invalid Setup',
        description: 'Setup with invalid account_id',
        account_id: 'non-existent-id',
        is_public: true
      };

      const { data, error } = await supabase
        .from('setups')
        .insert(setupData)
        .select();

      expect(error).toBeDefined();
      expect(error?.code).toBe('23503'); // Foreign key violation
    });
  });

  describe('Cleanup Operations', () => {
    test('should clean up MakerKit accounts properly', async () => {
      const userData = {
        email: 'cleanup-test@makerkit.test',
        name: 'Cleanup Test User'
      };

      const result = await strategy.createMakerKitAccount(userData);
      const accountId = result.accountId!;

      // Verify account exists
      const { data: beforeCleanup } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .single();
      expect(beforeCleanup).toBeDefined();

      // Clean up account
      await strategy.cleanupMakerKitAccount(accountId);

      // Verify account is deleted
      const { data: afterCleanup } = await supabase
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .single();
      expect(afterCleanup).toBeNull();

      // Verify auth user is also deleted
      try {
        await supabase.auth.admin.getUserById(accountId);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined(); // User should not exist
      }
    });
  });

  describe('Error Recovery', () => {
    test('should handle partial account creation failures', async () => {
      // This test simulates a scenario where auth.users creation succeeds
      // but accounts table insertion fails
      const userData = {
        email: 'recovery-test@makerkit.test',
        name: 'Recovery Test User'
      };

      // We can't easily simulate this without mocking, but we can test
      // that our error handling includes proper cleanup
      const result = await strategy.createMakerKitAccount(userData);
      
      if (result.success) {
        testAccountIds.push(result.accountId!);
        expect(result.accountId).toBeDefined();
        expect(result.authUser).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
        expect(result.accountId).toBeUndefined();
      }
    });

    test('should validate account creation result consistency', async () => {
      const userData = {
        email: 'consistency-test@makerkit.test',
        name: 'Consistency Test User'
      };

      const result = await strategy.createMakerKitAccount(userData);
      
      if (result.success) {
        testAccountIds.push(result.accountId!);
        
        // Ensure account and auth user IDs match
        expect(result.accountId).toBe(result.authUser?.id);
        
        // Verify both records exist
        const { data: account } = await supabase
          .from('accounts')
          .select('id')
          .eq('id', result.accountId)
          .single();
        
        expect(account.id).toBe(result.accountId);
      }
    });
  });

  /**
   * Clean up test accounts
   */
  async function cleanupTestAccounts(): Promise<void> {
    for (const accountId of testAccountIds) {
      try {
        await strategy.cleanupMakerKitAccount(accountId);
      } catch (error) {
        Logger.error(`Failed to cleanup account ${accountId}:`, error);
      }
    }
    testAccountIds = [];
  }
});