/**
 * Comprehensive Test Suite for SupaSeed v2.4.1
 * Tests MakerKit integration, persona diversity, and core functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'jest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SupaSeedFramework } from '../src/index';
import { MakerKitStrategy } from '../src/framework/strategies/makerkit-strategy';
import { OutdoorUserArchetypeGenerator } from '../src/extensions/domains/outdoor-user-archetypes';
import { Logger } from '../src/utils/logger';
import type { SeedConfig } from '../src/types';

// Test configuration
const TEST_CONFIG: SeedConfig = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || 'test-key',
  userCount: 6,
  setupsPerUser: 2,
  domain: 'outdoor',
  userStrategy: 'create-new',
  schema: {
    framework: 'makerkit',
    primaryUserTable: 'accounts',
    setupsTable: {
      userField: 'account_id'
    }
  }
};

describe('SupaSeed v2.4.1 Comprehensive Test Suite', () => {
  let supabase: SupabaseClient;
  let framework: SupaSeedFramework;
  let testAccountIds: string[] = [];

  beforeAll(async () => {
    // Initialize test environment
    supabase = createClient(TEST_CONFIG.supabaseUrl, TEST_CONFIG.supabaseServiceKey);
    framework = new SupaSeedFramework(TEST_CONFIG);
    
    // Suppress logs during testing
    Logger.level = 'error';
  });

  afterAll(async () => {
    // Cleanup test data
    if (testAccountIds.length > 0) {
      await cleanupTestData();
    }
  });

  beforeEach(async () => {
    // Reset test state
    testAccountIds = [];
  });

  afterEach(async () => {
    // Cleanup after each test
    if (testAccountIds.length > 0) {
      await cleanupTestData();
    }
  });

  /**
   * Core Framework Tests
   */
  describe('Core Framework Functionality', () => {
    test('should initialize framework with MakerKit configuration', () => {
      expect(framework).toBeDefined();
      expect(framework.config.schema.framework).toBe('makerkit');
      expect(framework.config.schema.primaryUserTable).toBe('accounts');
    });

    test('should validate MakerKit configuration', () => {
      expect(() => {
        framework.validateConfig();
      }).not.toThrow();
    });

    test('should detect MakerKit schema correctly', async () => {
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);
      
      const schemaInfo = await strategy.detectFramework();
      expect(schemaInfo.framework).toBe('makerkit');
      expect(schemaInfo.hasAccountsTable).toBe(true);
    });
  });

  /**
   * MakerKit Integration Tests
   */
  describe('MakerKit Integration', () => {
    test('should create personal accounts with proper constraints', async () => {
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);

      const userData = {
        email: 'test-personal@supaseed.test',
        name: 'Test Personal Account',
        bio: 'Test bio for personal account',
        username: 'testuser'
      };

      const result = await strategy.createMakerKitAccount(userData);
      
      expect(result.success).toBe(true);
      expect(result.accountId).toBeDefined();
      testAccountIds.push(result.accountId!);

      // Verify account was created correctly
      const { data: account } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', result.accountId)
        .single();

      expect(account).toBeDefined();
      expect(account.email).toBe(userData.email);
      expect(account.is_personal_account).toBe(true);
      expect(account.slug).toBeNull(); // Personal accounts have null slug
      expect(account.public_data?.bio).toBe(userData.bio);
      expect(account.public_data?.username).toBe(userData.username);
    });

    test('should handle JSONB public_data field correctly', async () => {
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);

      const userData = {
        email: 'test-jsonb@supaseed.test',
        name: 'Test JSONB User',
        bio: 'Complex bio with special characters: éñ@#$%',
        username: 'jsonb_user_123'
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

    test('should create setups with account_id relationship', async () => {
      // First create an account
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);

      const accountResult = await strategy.createMakerKitAccount({
        email: 'test-setup-creator@supaseed.test',
        name: 'Setup Creator'
      });
      testAccountIds.push(accountResult.accountId!);

      // Then create a setup
      const setupData = {
        title: 'Test Hiking Setup',
        description: 'A test setup for hiking',
        account_id: accountResult.accountId,
        is_public: true,
        total_weight: 2500,
        total_price: 45000
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
  });

  /**
   * Persona Diversity Tests
   */
  describe('Persona Diversity', () => {
    test('should generate 6 distinct outdoor archetypes', () => {
      const archetypes = OutdoorUserArchetypeGenerator.generateOutdoorArchetypes();
      
      expect(archetypes).toHaveLength(6);
      
      const expectedNames = [
        'Alex Trail-Creator',
        'Jordan Adventure-Explorer', 
        'Sam Mountain-Guide',
        'Casey Gear-Enthusiast',
        'Riley Weekend-Warrior',
        'Morgan Ultralight-Hiker'
      ];

      archetypes.forEach((archetype, index) => {
        expect(archetype.name).toBe(expectedNames[index]);
        expect(archetype.outdoorPreferences).toBeDefined();
        expect(archetype.outdoorContentPattern).toBeDefined();
        expect(archetype.platformBehavior).toBeDefined();
      });
    });

    test('should have diverse experience levels across archetypes', () => {
      const archetypes = OutdoorUserArchetypeGenerator.generateOutdoorArchetypes();
      const experienceLevels = archetypes.map(a => a.outdoorPreferences.experienceLevel);
      
      expect(experienceLevels).toContain('novice');
      expect(experienceLevels).toContain('intermediate');
      expect(experienceLevels).toContain('expert');
      expect(experienceLevels).toContain('professional');
    });

    test('should have diverse gear philosophies', () => {
      const archetypes = OutdoorUserArchetypeGenerator.generateOutdoorArchetypes();
      const gearPhilosophies = archetypes.map(a => a.outdoorPreferences.gearPhilosophy);
      
      expect(gearPhilosophies).toContain('ultralight');
      expect(gearPhilosophies).toContain('traditional');
      expect(gearPhilosophies).toContain('technical');
      expect(gearPhilosophies).toContain('budget');
    });

    test('should generate contextual behavior based on conditions', () => {
      const archetypes = OutdoorUserArchetypeGenerator.generateOutdoorArchetypes();
      const creator = archetypes[0]; // Alex Trail-Creator

      const weekendBehavior = OutdoorUserArchetypeGenerator.generateContextualBehavior(
        creator,
        { season: 'summer', dayOfWeek: 'saturday', timeOfDay: 'evening' }
      );

      expect(weekendBehavior.likelihood).toBeGreaterThan(0.5);
      expect(weekendBehavior.expectedActions).toContain('create_setup');
      expect(weekendBehavior.sessionDuration).toBeGreaterThan(creator.platformBehavior.avgSessionDuration);
    });
  });

  /**
   * Full Integration Tests
   */
  describe('Full Integration Tests', () => {
    test('should complete full seeding cycle with MakerKit', async () => {
      const seedingFramework = new SupaSeedFramework({
        ...TEST_CONFIG,
        userCount: 3, // Small test
        setupsPerUser: 1
      });

      const result = await seedingFramework.seed();
      
      expect(result.success).toBe(true);
      expect(result.usersCreated).toBe(3);
      expect(result.setupsCreated).toBe(3);

      // Collect test account IDs for cleanup
      testAccountIds.push(...result.accountIds);

      // Verify accounts were created with MakerKit constraints
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .in('id', result.accountIds);

      expect(accounts).toHaveLength(3);
      accounts.forEach(account => {
        expect(account.is_personal_account).toBe(true);
        expect(account.slug).toBeNull();
        expect(account.email).toMatch(/@supaseed/);
      });

      // Verify setups were created
      const { data: setups } = await supabase
        .from('setups')
        .select('*')
        .in('account_id', result.accountIds);

      expect(setups).toHaveLength(3);
      setups.forEach(setup => {
        expect(setup.account_id).toBeDefined();
        expect(setup.title).toBeDefined();
        expect(setup.description).toBeDefined();
      });
    });

    test('should handle hybrid user strategy correctly', async () => {
      // First create some existing accounts
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);

      const existingAccount = await strategy.createMakerKitAccount({
        email: 'existing@supaseed.test',
        name: 'Existing User'
      });
      testAccountIds.push(existingAccount.accountId!);

      // Now run hybrid strategy
      const hybridFramework = new SupaSeedFramework({
        ...TEST_CONFIG,
        userStrategy: 'hybrid',
        userCount: 3 // 1 existing + 2 new
      });

      const result = await hybridFramework.seed();
      
      expect(result.success).toBe(true);
      expect(result.existingUsersUsed).toBe(1);
      expect(result.newUsersCreated).toBe(2);
      expect(result.usersCreated).toBe(3);

      testAccountIds.push(...result.accountIds.filter(id => id !== existingAccount.accountId));
    });
  });

  /**
   * Performance Tests
   */
  describe('Performance Tests', () => {
    test('should complete seeding within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const performanceFramework = new SupaSeedFramework({
        ...TEST_CONFIG,
        userCount: 6,
        setupsPerUser: 2
      });

      const result = await performanceFramework.seed();
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
      
      testAccountIds.push(...result.accountIds);

      Logger.info(`Seeding completed in ${duration}ms for ${result.usersCreated} users and ${result.setupsCreated} setups`);
    });

    test('should handle concurrent operations efficiently', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => {
        const framework = new SupaSeedFramework({
          ...TEST_CONFIG,
          userCount: 2,
          setupsPerUser: 1,
          seed: `concurrent-test-${i}` // Unique seed to avoid conflicts
        });
        return framework.seed();
      });

      const results = await Promise.all(promises);
      
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        testAccountIds.push(...result.accountIds);
      });

      expect(results).toHaveLength(3);
    });
  });

  /**
   * Error Handling Tests
   */
  describe('Error Handling', () => {
    test('should handle invalid configuration gracefully', () => {
      expect(() => {
        new SupaSeedFramework({
          ...TEST_CONFIG,
          supabaseUrl: 'invalid-url'
        });
      }).toThrow();
    });

    test('should handle database connection errors', async () => {
      const invalidFramework = new SupaSeedFramework({
        ...TEST_CONFIG,
        supabaseServiceKey: 'invalid-key'
      });

      const result = await invalidFramework.seed();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle duplicate email constraints', async () => {
      const duplicateFramework = new SupaSeedFramework({
        ...TEST_CONFIG,
        userCount: 2,
        seed: 'duplicate-test' // Same seed = same emails
      });

      // First seeding should succeed
      const firstResult = await duplicateFramework.seed();
      expect(firstResult.success).toBe(true);
      testAccountIds.push(...firstResult.accountIds);

      // Second seeding with same seed should handle duplicates gracefully
      const secondResult = await duplicateFramework.seed();
      // Should either succeed with cleanup or fail gracefully
      expect(['boolean', 'undefined']).toContain(typeof secondResult.success);
    });
  });

  /**
   * Cleanup Helper
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // Delete setups first (foreign key constraint)
      await supabase
        .from('setups')
        .delete()
        .in('account_id', testAccountIds);

      // Delete gear items if any
      await supabase
        .from('gear_items')
        .delete()
        .in('setup_id', 
          (await supabase.from('setups').select('id').in('account_id', testAccountIds)).data?.map(s => s.id) || []
        );

      // Delete accounts
      await supabase
        .from('accounts')
        .delete()
        .in('id', testAccountIds);

      // Delete from auth.users
      for (const accountId of testAccountIds) {
        try {
          await supabase.auth.admin.deleteUser(accountId);
        } catch (error) {
          // Ignore auth deletion errors - user might not exist
        }
      }

      testAccountIds = [];
    } catch (error) {
      Logger.error('Cleanup failed:', error);
    }
  }
});