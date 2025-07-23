/**
 * Test suite for Asset Pool Engine
 * Phase 2, Checkpoint B1 validation
 */

import { AssetPoolEngine, AssetPoolConfig } from '../src/assets/asset-pool-engine';
import { writeFile, mkdir, rm } from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

// Mock Logger
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Asset Pool Engine', () => {
  let poolEngine: AssetPoolEngine;
  let testDir: string;

  beforeEach(async () => {
    poolEngine = new AssetPoolEngine();
    testDir = path.join(tmpdir(), `supa-seed-pool-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Pool Creation and Management', () => {
    test('should create asset pool with default configuration', async () => {
      // Create test assets
      await writeFile(path.join(testDir, 'post1.md'), '# Test Post\n\nContent here');
      await writeFile(path.join(testDir, 'data.json'), '{"title": "Test Data"}');

      const pool = await poolEngine.createPool(
        'test-pool',
        'Test Pool',
        testDir,
        ['*.md', '*.json']
      );

      expect(pool.id).toBe('test-pool');
      expect(pool.name).toBe('Test Pool');
      expect(pool.assets).toHaveLength(2);
      expect(pool.metadata.totalAssets).toBe(2);
      expect(pool.metadata.assetTypes.markdown).toBe(1);
      expect(pool.metadata.assetTypes.json).toBe(1);
    });

    test('should create pool with custom configuration', async () => {
      await writeFile(path.join(testDir, 'post.md'), '# Short');

      const config: Partial<AssetPoolConfig> = {
        includeContent: false,
        validateAssets: true,
        contentFilters: {
          minContentLength: 10
        }
      };

      const pool = await poolEngine.createPool(
        'filtered-pool',
        'Filtered Pool',
        testDir,
        ['*.md'],
        config
      );

      expect(pool.assets).toHaveLength(0); // Filtered out due to min length
      expect(pool.config.includeContent).toBe(false);
    });

    test('should prevent duplicate pool IDs', async () => {
      await writeFile(path.join(testDir, 'test.md'), '# Test');

      await poolEngine.createPool('duplicate', 'First', testDir, ['*.md']);

      await expect(
        poolEngine.createPool('duplicate', 'Second', testDir, ['*.md'])
      ).rejects.toThrow("Asset pool with ID 'duplicate' already exists");
    });

    test('should retrieve pool by ID', async () => {
      await writeFile(path.join(testDir, 'test.md'), '# Test');
      
      const createdPool = await poolEngine.createPool('retrieve-test', 'Test', testDir, ['*.md']);
      const retrievedPool = poolEngine.getPool('retrieve-test');

      expect(retrievedPool).toBeDefined();
      expect(retrievedPool?.id).toBe('retrieve-test');
      expect(retrievedPool?.assets).toHaveLength(1);
    });

    test('should return undefined for non-existent pool', () => {
      const pool = poolEngine.getPool('non-existent');
      expect(pool).toBeUndefined();
    });

    test('should list all pools', async () => {
      await writeFile(path.join(testDir, 'test1.md'), '# Test 1');
      await writeFile(path.join(testDir, 'test2.md'), '# Test 2');

      await poolEngine.createPool('pool1', 'Pool 1', testDir, ['test1.md']);
      await poolEngine.createPool('pool2', 'Pool 2', testDir, ['test2.md']);

      const allPools = poolEngine.getAllPools();
      expect(allPools).toHaveLength(2);
      expect(allPools.map(p => p.id)).toContain('pool1');
      expect(allPools.map(p => p.id)).toContain('pool2');
    });
  });

  describe('Pool Content Filtering', () => {
    test('should filter by required fields', async () => {
      const markdownWithMeta = `---
title: "Complete Post"
author: "Test Author"
---
# Complete Post`;

      const markdownWithoutMeta = `# Incomplete Post`;

      await writeFile(path.join(testDir, 'complete.md'), markdownWithMeta);
      await writeFile(path.join(testDir, 'incomplete.md'), markdownWithoutMeta);

      const config: Partial<AssetPoolConfig> = {
        contentFilters: {
          requiredFields: ['title', 'author']
        }
      };

      const pool = await poolEngine.createPool('filtered', 'Filtered', testDir, ['*.md'], config);

      expect(pool.assets).toHaveLength(1);
      expect(pool.assets[0].metadata.title).toBe('Complete Post');
    });

    test('should filter by tags', async () => {
      const taggedPost = `---
title: "Tagged Post"
tags: ["important", "featured"]
---
# Tagged Post`;

      const untaggedPost = `---
title: "Untagged Post"
---
# Untagged Post`;

      await writeFile(path.join(testDir, 'tagged.md'), taggedPost);
      await writeFile(path.join(testDir, 'untagged.md'), untaggedPost);

      const config: Partial<AssetPoolConfig> = {
        contentFilters: {
          tagFilters: ['important']
        }
      };

      const pool = await poolEngine.createPool('tag-filtered', 'Tag Filtered', testDir, ['*.md'], config);

      expect(pool.assets).toHaveLength(1);
      expect(pool.assets[0].metadata.title).toBe('Tagged Post');
    });

    test('should filter by minimum content length', async () => {
      await writeFile(path.join(testDir, 'short.md'), '# Short');
      await writeFile(path.join(testDir, 'long.md'), '# Long Post\n\nThis is a much longer post with substantial content that should pass the minimum length filter.');

      const config: Partial<AssetPoolConfig> = {
        contentFilters: {
          minContentLength: 50
        }
      };

      const pool = await poolEngine.createPool('length-filtered', 'Length Filtered', testDir, ['*.md'], config);

      expect(pool.assets).toHaveLength(1);
      expect(pool.assets[0].filePath).toContain('long.md');
    });
  });

  describe('Multi-Format Support', () => {
    test('should handle multiple file formats in one pool', async () => {
      // Create markdown file
      await writeFile(path.join(testDir, 'post.md'), '# Test Post\n\nContent');

      // Create JSON file
      await writeFile(path.join(testDir, 'data.json'), JSON.stringify({
        title: 'Test Data',
        items: [1, 2, 3]
      }));

      // Create CSV file
      await writeFile(path.join(testDir, 'users.csv'), 'name,email,role\nJohn Doe,john@example.com,admin\nJane Smith,jane@example.com,user');

      // Create small test image
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xCD, 0x90, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);
      await writeFile(path.join(testDir, 'image.png'), pngData);

      const pool = await poolEngine.createPool('multi-format', 'Multi Format', testDir, ['*.*']);

      expect(pool.assets).toHaveLength(4);
      expect(pool.metadata.assetTypes.markdown).toBe(1);
      expect(pool.metadata.assetTypes.json).toBe(1);
      expect(pool.metadata.assetTypes.csv).toBe(1);
      expect(pool.metadata.assetTypes.image).toBe(1);
    });

    test('should validate CSV assets correctly', async () => {
      // Valid CSV
      await writeFile(path.join(testDir, 'valid.csv'), 'name,email\nJohn,john@test.com\nJane,jane@test.com');
      
      // Invalid CSV (empty)
      await writeFile(path.join(testDir, 'invalid.csv'), '');

      const pool = await poolEngine.createPool('csv-test', 'CSV Test', testDir, ['*.csv']);

      expect(pool.assets).toHaveLength(2);
      
      const validAsset = pool.assets.find(a => a.filePath.includes('valid.csv'));
      const invalidAsset = pool.assets.find(a => a.filePath.includes('invalid.csv'));

      expect(validAsset?.isValid).toBe(true);
      expect(validAsset?.metadata.rowCount).toBe(2);
      expect(validAsset?.metadata.columnCount).toBe(2);

      expect(invalidAsset?.isValid).toBe(false);
      expect(invalidAsset?.validationErrors).toContain('CSV content is empty');
    });
  });

  describe('Asset Search and Retrieval', () => {
    beforeEach(async () => {
      // Create test content for search
      const blogPost = `---
title: "How to Test"
tags: ["testing", "tutorial"]
category: "development"
---
# How to Test
This is a tutorial about testing.`;

      const newsPost = `---
title: "Breaking News"
tags: ["news", "urgent"]
category: "news"
---
# Breaking News
Important news update here.`;

      await writeFile(path.join(testDir, 'blog.md'), blogPost);
      await writeFile(path.join(testDir, 'news.md'), newsPost);
      await writeFile(path.join(testDir, 'data.json'), '{"title": "API Data", "category": "data"}');

      await poolEngine.createPool('search-pool', 'Search Pool', testDir, ['*.*']);
    });

    test('should search by asset types', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        types: ['markdown']
      });

      expect(results).toHaveLength(2);
      expect(results.every(r => r.type === 'markdown')).toBe(true);
    });

    test('should search by tags', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        tags: ['tutorial']
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('How to Test');
    });

    test('should search by categories', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        categories: ['news']
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('Breaking News');
    });

    test('should search by title content', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        titleContains: 'test'
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('How to Test');
    });

    test('should search by content', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        contentContains: 'tutorial'
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata.title).toBe('How to Test');
    });

    test('should filter valid assets only', () => {
      const results = poolEngine.searchAssets({
        pools: ['search-pool'],
        validOnly: true
      });

      expect(results.every(r => r.isValid)).toBe(true);
    });
  });

  describe('Pool Statistics and Health', () => {
    test('should provide comprehensive pool statistics', async () => {
      await writeFile(path.join(testDir, 'post1.md'), '# Post 1\n\nThis is a longer post with sufficient content for validation.');
      await writeFile(path.join(testDir, 'post2.md'), '# Post 2\n\nThis is another longer post with sufficient content for validation.');
      await writeFile(path.join(testDir, 'data.json'), '{"test": true}');

      await poolEngine.createPool('stats-pool', 'Stats Pool', testDir, ['*.*']);

      const stats = poolEngine.getPoolStats();

      expect(stats.totalPools).toBe(1);
      expect(stats.totalAssets).toBe(3);
      expect(stats.averagePoolSize).toBe(3);
      expect(stats.typeDistribution.markdown).toBe(2);
      expect(stats.typeDistribution.json).toBe(1);
      expect(stats.healthStatus).toBe('healthy');
    });

    test('should detect health issues', async () => {
      // Create empty pool
      await poolEngine.createPool('empty-pool', 'Empty Pool', testDir, ['*.nonexistent']);

      const stats = poolEngine.getPoolStats();

      expect(stats.healthStatus).toBe('error');
      expect(stats.issues).toContain("Pool 'Empty Pool' contains no assets");
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const config: Partial<AssetPoolConfig> = {
        maxFileSize: 1024 * 1024,
        batchSize: 100,
        maxConcurrentLoads: 5
      };

      const validation = AssetPoolEngine.validatePoolConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect invalid configuration', () => {
      const config: Partial<AssetPoolConfig> = {
        maxFileSize: -1,
        batchSize: 0,
        maxConcurrentLoads: -5
      };

      const validation = AssetPoolEngine.validatePoolConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('maxFileSize must be greater than 0');
      expect(validation.errors).toContain('batchSize must be greater than 0');
      expect(validation.errors).toContain('maxConcurrentLoads must be greater than 0');
    });
  });

  describe('Pool Import/Export', () => {
    test('should export pool configuration', async () => {
      await writeFile(path.join(testDir, 'test.md'), '# Test');
      
      const pool = await poolEngine.createPool('export-test', 'Export Test', testDir, ['*.md']);
      const exported = poolEngine.exportPoolConfig('export-test');

      expect(exported.id).toBe('export-test');
      expect(exported.name).toBe('Export Test');
      expect(exported.baseDirectory).toBe(testDir);
      expect(exported.patterns).toEqual(['*.md']);
      expect(exported.metadata.totalAssets).toBe(1);
    });

    test('should import and recreate pool', async () => {
      await writeFile(path.join(testDir, 'import.md'), '# Import Test');

      const config = {
        id: 'imported-pool',
        name: 'Imported Pool',
        baseDirectory: testDir,
        patterns: ['*.md'],
        config: {
          includeContent: true,
          validateAssets: true
        }
      };

      const pool = await poolEngine.importPoolConfig(config);

      expect(pool.id).toBe('imported-pool');
      expect(pool.name).toBe('Imported Pool');
      expect(pool.assets).toHaveLength(1);
    });
  });

  describe('Pool Refresh', () => {
    test('should refresh pool with new assets', async () => {
      // Initial asset
      await writeFile(path.join(testDir, 'initial.md'), '# Initial');
      
      const pool = await poolEngine.createPool('refresh-test', 'Refresh Test', testDir, ['*.md']);
      expect(pool.assets).toHaveLength(1);

      // Add new asset
      await writeFile(path.join(testDir, 'new.md'), '# New Asset');

      // Refresh pool
      const refreshedPool = await poolEngine.refreshPool('refresh-test');
      expect(refreshedPool.assets).toHaveLength(2);
    });

    test('should handle refresh of non-existent pool', async () => {
      await expect(
        poolEngine.refreshPool('non-existent')
      ).rejects.toThrow("Asset pool 'non-existent' not found");
    });
  });

  describe('Pool Removal', () => {
    test('should remove existing pool', async () => {
      await writeFile(path.join(testDir, 'test.md'), '# Test');
      
      await poolEngine.createPool('remove-test', 'Remove Test', testDir, ['*.md']);
      expect(poolEngine.getPool('remove-test')).toBeDefined();

      const removed = poolEngine.removePool('remove-test');
      expect(removed).toBe(true);
      expect(poolEngine.getPool('remove-test')).toBeUndefined();
    });

    test('should return false for non-existent pool removal', () => {
      const removed = poolEngine.removePool('non-existent');
      expect(removed).toBe(false);
    });
  });
});