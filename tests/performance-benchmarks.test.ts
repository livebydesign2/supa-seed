/**
 * Performance Benchmarking Tests for SupaSeed v2.4.1
 * Tests performance characteristics and scalability
 */

import { describe, test, expect, beforeAll, afterAll } from 'jest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SupaSeedFramework } from '../src/index';
import { MakerKitStrategy } from '../src/framework/strategies/makerkit-strategy';
import { Logger } from '../src/utils/logger';
import type { SeedConfig } from '../src/types';

// Performance test configuration
const PERF_CONFIG: SeedConfig = {
  supabaseUrl: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
  supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || 'test-key',
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

interface PerformanceResult {
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  itemsProcessed: number;
  itemsPerSecond: number;
}

describe('Performance Benchmarking Tests', () => {
  let supabase: SupabaseClient;
  let testAccountIds: string[] = [];

  beforeAll(() => {
    supabase = createClient(PERF_CONFIG.supabaseUrl, PERF_CONFIG.supabaseServiceKey);
    Logger.level = 'error'; // Suppress logs during performance testing
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  /**
   * Helper function to measure performance
   */
  async function measurePerformance<T>(
    operation: () => Promise<T>,
    itemCount: number
  ): Promise<PerformanceResult & { result: T }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    const result = await operation();

    const endTime = Date.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    
    const duration = endTime - startTime;
    const memoryDelta = memoryAfter - memoryBefore;
    const itemsPerSecond = (itemCount / duration) * 1000;

    return {
      result,
      duration,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      itemsProcessed: itemCount,
      itemsPerSecond
    };
  }

  describe('Individual Operation Performance', () => {
    test('should create single account within performance threshold', async () => {
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);

      const performance = await measurePerformance(async () => {
        const result = await strategy.createMakerKitAccount({
          email: 'perf-single@supaseed.test',
          name: 'Performance Test User',
          bio: 'Single account creation performance test'
        });
        
        if (result.success) {
          testAccountIds.push(result.accountId!);
        }
        
        return result;
      }, 1);

      expect(performance.result.success).toBe(true);
      expect(performance.duration).toBeLessThan(2000); // Under 2 seconds
      expect(performance.memoryDelta).toBeLessThan(50 * 1024 * 1024); // Under 50MB
      
      Logger.info(`Single account creation: ${performance.duration}ms, ${Math.round(performance.memoryDelta / 1024)}KB`);
    });

    test('should create account batch efficiently', async () => {
      const strategy = new MakerKitStrategy();
      await strategy.initialize(supabase);
      
      const batchSize = 5;
      
      const performance = await measurePerformance(async () => {
        const promises = Array.from({ length: batchSize }, (_, i) => 
          strategy.createMakerKitAccount({
            email: `perf-batch-${i}@supaseed.test`,
            name: `Batch User ${i}`,
            bio: `Batch performance test user ${i}`
          })
        );

        const results = await Promise.all(promises);
        
        results.forEach(result => {
          if (result.success) {
            testAccountIds.push(result.accountId!);
          }
        });

        return results;
      }, batchSize);

      const successCount = performance.result.filter(r => r.success).length;
      expect(successCount).toBe(batchSize);
      expect(performance.duration).toBeLessThan(5000); // Under 5 seconds for 5 accounts
      expect(performance.itemsPerSecond).toBeGreaterThan(0.5); // At least 0.5 accounts/second
      
      Logger.info(`Batch account creation (${batchSize}): ${performance.duration}ms, ${performance.itemsPerSecond.toFixed(2)} accounts/sec`);
    });
  });

  describe('Full Seeding Performance', () => {
    test('should handle small scale efficiently (6 users, 12 setups)', async () => {
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 6,
        setupsPerUser: 2,
        seed: 'perf-small'
      });

      const performance = await measurePerformance(async () => {
        return await framework.seed();
      }, 18); // 6 users + 12 setups

      expect(performance.result.success).toBe(true);
      expect(performance.result.usersCreated).toBe(6);
      expect(performance.result.setupsCreated).toBe(12);
      expect(performance.duration).toBeLessThan(15000); // Under 15 seconds
      expect(performance.itemsPerSecond).toBeGreaterThan(1); // At least 1 item/second
      
      testAccountIds.push(...performance.result.accountIds);
      
      Logger.info(`Small scale seeding: ${performance.duration}ms, ${performance.itemsPerSecond.toFixed(2)} items/sec`);
    });

    test('should handle medium scale efficiently (12 users, 36 setups)', async () => {
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 12,
        setupsPerUser: 3,
        seed: 'perf-medium'
      });

      const performance = await measurePerformance(async () => {
        return await framework.seed();
      }, 48); // 12 users + 36 setups

      expect(performance.result.success).toBe(true);
      expect(performance.result.usersCreated).toBe(12);
      expect(performance.result.setupsCreated).toBe(36);
      expect(performance.duration).toBeLessThan(30000); // Under 30 seconds
      expect(performance.itemsPerSecond).toBeGreaterThan(1.5); // At least 1.5 items/second
      
      testAccountIds.push(...performance.result.accountIds);
      
      Logger.info(`Medium scale seeding: ${performance.duration}ms, ${performance.itemsPerSecond.toFixed(2)} items/sec`);
    });

    test('should scale linearly with user count', async () => {
      const scales = [
        { users: 3, setups: 1, label: 'tiny' },
        { users: 6, setups: 2, label: 'small' },
        { users: 12, setups: 3, label: 'medium' }
      ];

      const results: Array<{ scale: typeof scales[0], performance: PerformanceResult }> = [];

      for (const scale of scales) {
        const framework = new SupaSeedFramework({
          ...PERF_CONFIG,
          userCount: scale.users,
          setupsPerUser: scale.setups,
          seed: `perf-scale-${scale.label}`
        });

        const performance = await measurePerformance(async () => {
          return await framework.seed();
        }, scale.users + (scale.users * scale.setups));

        expect(performance.result.success).toBe(true);
        testAccountIds.push(...performance.result.accountIds);

        results.push({ scale, performance });
        
        Logger.info(`${scale.label} scale (${scale.users}u, ${scale.users * scale.setups}s): ${performance.duration}ms`);
      }

      // Verify roughly linear scaling
      const ratios = [];
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        const timeRatio = curr.performance.duration / prev.performance.duration;
        const itemRatio = curr.performance.itemsProcessed / prev.performance.itemsProcessed;
        ratios.push({ timeRatio, itemRatio });
      }

      // Time growth should be roughly proportional to item growth (within 2x factor)
      ratios.forEach(ratio => {
        expect(ratio.timeRatio / ratio.itemRatio).toBeLessThan(2);
        expect(ratio.timeRatio / ratio.itemRatio).toBeGreaterThan(0.5);
      });
    });
  });

  describe('Memory Performance', () => {
    test('should maintain reasonable memory usage during seeding', async () => {
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 10,
        setupsPerUser: 3,
        seed: 'perf-memory'
      });

      const performance = await measurePerformance(async () => {
        return await framework.seed();
      }, 40);

      expect(performance.result.success).toBe(true);
      testAccountIds.push(...performance.result.accountIds);

      // Memory usage should be reasonable (under 100MB for this scale)
      expect(performance.memoryDelta).toBeLessThan(100 * 1024 * 1024);
      
      // Memory per item should be reasonable (under 2MB per item)
      const memoryPerItem = performance.memoryDelta / performance.itemsProcessed;
      expect(memoryPerItem).toBeLessThan(2 * 1024 * 1024);
      
      Logger.info(`Memory usage: ${Math.round(performance.memoryDelta / 1024 / 1024)}MB total, ${Math.round(memoryPerItem / 1024)}KB per item`);
    });

    test('should handle multiple seeding cycles without memory leaks', async () => {
      const cycles = 3;
      const memoryUsages: number[] = [];

      for (let i = 0; i < cycles; i++) {
        // Force garbage collection between cycles
        if (global.gc) {
          global.gc();
        }

        const framework = new SupaSeedFramework({
          ...PERF_CONFIG,
          userCount: 4,
          setupsPerUser: 2,
          seed: `perf-leak-${i}`
        });

        const performance = await measurePerformance(async () => {
          return await framework.seed();
        }, 12);

        expect(performance.result.success).toBe(true);
        testAccountIds.push(...performance.result.accountIds);
        
        memoryUsages.push(performance.memoryDelta);
        
        Logger.info(`Cycle ${i + 1} memory delta: ${Math.round(performance.memoryDelta / 1024)}KB`);
      }

      // Memory usage should not grow significantly between cycles
      // Allow some variance but no more than 50% increase
      const baseMemory = memoryUsages[0];
      memoryUsages.slice(1).forEach((usage, index) => {
        const growthFactor = usage / baseMemory;
        expect(growthFactor).toBeLessThan(1.5); // No more than 50% growth
        Logger.info(`Cycle ${index + 2} growth factor: ${growthFactor.toFixed(2)}x`);
      });
    });
  });

  describe('Concurrent Performance', () => {
    test('should handle concurrent seeding operations', async () => {
      const concurrentOperations = 3;
      
      const performance = await measurePerformance(async () => {
        const promises = Array.from({ length: concurrentOperations }, (_, i) => {
          const framework = new SupaSeedFramework({
            ...PERF_CONFIG,
            userCount: 3,
            setupsPerUser: 1,
            seed: `perf-concurrent-${i}`
          });
          return framework.seed();
        });

        return await Promise.all(promises);
      }, concurrentOperations * 6); // 3 operations × (3 users + 3 setups each)

      const successCount = performance.result.filter(r => r.success).length;
      expect(successCount).toBe(concurrentOperations);
      
      // Concurrent operations should be faster than sequential
      expect(performance.duration).toBeLessThan(20000); // Under 20 seconds
      
      performance.result.forEach(result => {
        if (result.success) {
          testAccountIds.push(...result.accountIds);
        }
      });
      
      Logger.info(`Concurrent operations (${concurrentOperations}): ${performance.duration}ms`);
    });

    test('should maintain performance under load', async () => {
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 15,
        setupsPerUser: 2,
        seed: 'perf-load-test'
      });

      const performance = await measurePerformance(async () => {
        return await framework.seed();
      }, 45); // 15 users + 30 setups

      expect(performance.result.success).toBe(true);
      expect(performance.result.usersCreated).toBe(15);
      expect(performance.result.setupsCreated).toBe(30);
      
      // Should maintain reasonable performance even at higher load
      expect(performance.duration).toBeLessThan(45000); // Under 45 seconds
      expect(performance.itemsPerSecond).toBeGreaterThan(1); // At least 1 item/second
      
      testAccountIds.push(...performance.result.accountIds);
      
      Logger.info(`Load test: ${performance.duration}ms, ${performance.itemsPerSecond.toFixed(2)} items/sec`);
    });
  });

  describe('Database Performance', () => {
    test('should efficiently query accounts with indexes', async () => {
      // First create some test data
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 10,
        setupsPerUser: 1,
        seed: 'perf-db-test'
      });

      const seedResult = await framework.seed();
      testAccountIds.push(...seedResult.accountIds);

      // Test account queries performance
      const queryPerformance = await measurePerformance(async () => {
        const queries = [
          // Email lookup (should use index)
          supabase.from('accounts').select('*').eq('email', 'creator-0@supaseed-personas.test').single(),
          
          // Personal accounts filter (should use index)
          supabase.from('accounts').select('*').eq('is_personal_account', true),
          
          // JSONB field query (should use GIN index)
          supabase.from('accounts').select('*').not('public_data', 'is', null),
          
          // Recent accounts (should use timestamp index)
          supabase.from('accounts').select('*').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        ];

        return await Promise.all(queries);
      }, 4);

      // All queries should complete quickly
      expect(queryPerformance.duration).toBeLessThan(2000); // Under 2 seconds for all queries
      expect(queryPerformance.itemsPerSecond).toBeGreaterThan(2); // At least 2 queries/second
      
      Logger.info(`Database queries: ${queryPerformance.duration}ms for ${queryPerformance.itemsProcessed} queries`);
    });

    test('should efficiently query setups with relationships', async () => {
      // Create test data with setups
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 8,
        setupsPerUser: 3,
        seed: 'perf-setup-queries'
      });

      const seedResult = await framework.seed();
      testAccountIds.push(...seedResult.accountIds);

      // Test setup relationship queries
      const queryPerformance = await measurePerformance(async () => {
        const queries = [
          // User's setups (should use account_id index)
          supabase.from('setups').select('*').eq('account_id', seedResult.accountIds[0]),
          
          // Public setups (should use partial index)
          supabase.from('setups').select('*').eq('is_public', true).order('created_at', { ascending: false }).limit(10),
          
          // Setup with gear items (relationship query)
          supabase.from('setups').select('*, gear_items(*)').limit(5),
          
          // Title search (should use text search index)
          supabase.from('setups').select('*').textSearch('title', 'hiking')
        ];

        return await Promise.all(queries);
      }, 4);

      expect(queryPerformance.duration).toBeLessThan(3000); // Under 3 seconds
      expect(queryPerformance.itemsPerSecond).toBeGreaterThan(1); // At least 1 query/second
      
      Logger.info(`Setup queries: ${queryPerformance.duration}ms for ${queryPerformance.itemsProcessed} queries`);
    });
  });

  /**
   * Performance benchmarking summary
   */
  describe('Performance Summary', () => {
    test('should meet overall performance targets', async () => {
      const framework = new SupaSeedFramework({
        ...PERF_CONFIG,
        userCount: 12,
        setupsPerUser: 3,
        seed: 'perf-final-test'
      });

      const performance = await measurePerformance(async () => {
        return await framework.seed();
      }, 48);

      expect(performance.result.success).toBe(true);
      testAccountIds.push(...performance.result.accountIds);

      // Performance targets for v2.4.1
      expect(performance.duration).toBeLessThan(30000); // Under 30 seconds
      expect(performance.itemsPerSecond).toBeGreaterThan(1.5); // At least 1.5 items/second
      expect(performance.memoryDelta).toBeLessThan(100 * 1024 * 1024); // Under 100MB
      
      const summary = {
        totalTime: performance.duration,
        usersCreated: performance.result.usersCreated,
        setupsCreated: performance.result.setupsCreated,
        itemsPerSecond: performance.itemsPerSecond,
        memoryUsedMB: Math.round(performance.memoryDelta / 1024 / 1024),
        memoryPerItemKB: Math.round(performance.memoryDelta / performance.itemsProcessed / 1024)
      };

      Logger.info('Performance Summary:', summary);
      
      // Log for CI/benchmarking
      console.log(`BENCHMARK_RESULTS: ${JSON.stringify(summary)}`);
    });
  });

  /**
   * Cleanup test data
   */
  async function cleanupTestData(): Promise<void> {
    try {
      // Delete setups first (foreign key constraint)
      await supabase
        .from('setups')
        .delete()
        .in('account_id', testAccountIds);

      // Delete accounts
      await supabase
        .from('accounts')
        .delete()
        .in('id', testAccountIds);

      // Delete auth users
      for (const accountId of testAccountIds) {
        try {
          await supabase.auth.admin.deleteUser(accountId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }

      testAccountIds = [];
    } catch (error) {
      Logger.error('Performance test cleanup failed:', error);
    }
  }
});