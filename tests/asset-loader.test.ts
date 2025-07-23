/**
 * Test suite for Basic File System Asset Loading
 * Phase 1, Checkpoint A3 validation
 */

import { AssetLoader, AssetLoadOptions, LoadedAsset } from '../src/assets/asset-loader';
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

describe('Asset Loader', () => {
  let assetLoader: AssetLoader;
  let testDir: string;

  beforeEach(async () => {
    assetLoader = new AssetLoader();
    testDir = path.join(tmpdir(), `supa-seed-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Markdown Asset Loading', () => {
    test('should load markdown file with frontmatter', async () => {
      const markdownContent = `---
title: "Test Blog Post"
description: "A test blog post for asset loading"
tags: ["test", "blog", "markdown"]
author: "Test Author"
date: "2025-01-23"
featured: true
---

# Test Blog Post

This is a test blog post with some content.

## Features

- Frontmatter parsing
- Content extraction
- Metadata validation`;

      const filePath = path.join(testDir, 'test-post.md');
      await writeFile(filePath, markdownContent);

      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.assets).toHaveLength(1);

      const asset = result.assets[0];
      expect(asset.type).toBe('markdown');
      expect(asset.metadata.title).toBe('Test Blog Post');
      expect(asset.metadata.tags).toEqual(['test', 'blog', 'markdown']);
      expect(asset.metadata.featured).toBe(true);
      expect(asset.content).toContain('This is a test blog post');
      expect(asset.isValid).toBe(true);
    });

    test('should handle markdown without frontmatter', async () => {
      const markdownContent = `# Simple Post

This is a simple markdown post without frontmatter.`;

      const filePath = path.join(testDir, 'simple-post.md');
      await writeFile(filePath, markdownContent);

      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.type).toBe('markdown');
      expect(asset.metadata.title).toBeUndefined();
      expect(asset.content).toContain('# Simple Post');
      expect(asset.isValid).toBe(true);
    });

    test('should validate markdown content', async () => {
      const emptyMarkdown = '';
      const filePath = path.join(testDir, 'empty.md');
      await writeFile(filePath, emptyMarkdown);

      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: testDir,
        validateSchema: true
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.isValid).toBe(false);
      expect(asset.validationErrors).toContain('Markdown content is empty');
    });
  });

  describe('JSON Asset Loading', () => {
    test('should load valid JSON asset', async () => {
      const jsonData = {
        title: 'Test Data',
        description: 'Sample JSON data for testing',
        tags: ['json', 'test', 'data'],
        category: 'sample',
        data: {
          items: [1, 2, 3],
          settings: {
            enabled: true,
            value: 'test'
          }
        },
        metadata: {
          version: '1.0',
          author: 'Test Author'
        }
      };

      const filePath = path.join(testDir, 'test-data.json');
      await writeFile(filePath, JSON.stringify(jsonData, null, 2));

      const options: AssetLoadOptions = {
        patterns: ['*.json'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      const asset = result.assets[0];
      expect(asset.type).toBe('json');
      expect(asset.metadata.title).toBe('Test Data');
      expect(asset.metadata.tags).toEqual(['json', 'test', 'data']);
      expect(asset.metadata.version).toBe('1.0'); // From nested metadata
      expect(asset.isValid).toBe(true);
    });

    test('should handle invalid JSON', async () => {
      const invalidJson = '{ "title": "Test", invalid json }';
      const filePath = path.join(testDir, 'invalid.json');
      await writeFile(filePath, invalidJson);

      const options: AssetLoadOptions = {
        patterns: ['*.json'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.type).toBe('json');
      expect(asset.isValid).toBe(false);
      expect(asset.validationErrors?.[0]).toContain('Invalid JSON');
    });
  });

  describe('CSV Asset Loading', () => {
    test('should load valid CSV asset', async () => {
      const csvContent = `name,email,role,active
John Doe,john@example.com,admin,true
Jane Smith,jane@example.com,user,false
Bob Johnson,bob@example.com,moderator,true`;

      const filePath = path.join(testDir, 'users.csv');
      await writeFile(filePath, csvContent);

      const options: AssetLoadOptions = {
        patterns: ['*.csv'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      const asset = result.assets[0];
      expect(asset.type).toBe('csv');
      expect(asset.metadata.rowCount).toBe(3);
      expect(asset.metadata.columnCount).toBe(4);
      expect(asset.metadata.columns).toEqual(['name', 'email', 'role', 'active']);
      expect(asset.metadata.dataType).toBe('users'); // Should detect from 'email' column
      expect(asset.metadata.sampleRows).toHaveLength(3);
      expect(asset.isValid).toBe(true);
    });

    test('should handle CSV with quoted values', async () => {
      const csvContent = `title,description
"Test Article","This is a test, with commas"
"Another Article","Simple description"`;

      const filePath = path.join(testDir, 'articles.csv');
      await writeFile(filePath, csvContent);

      const options: AssetLoadOptions = {
        patterns: ['*.csv'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.type).toBe('csv');
      expect(asset.metadata.sampleRows?.[0]?.description).toBe('This is a test, with commas');
      expect(asset.isValid).toBe(true);
    });

    test('should validate empty CSV', async () => {
      const emptyCSV = '';
      const filePath = path.join(testDir, 'empty.csv');
      await writeFile(filePath, emptyCSV);

      const options: AssetLoadOptions = {
        patterns: ['*.csv'],
        baseDirectory: testDir,
        validateSchema: true
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.isValid).toBe(false);
      expect(asset.validationErrors).toContain('CSV content is empty');
    });

    test('should detect different data types from column names', async () => {
      const productCSV = `product_name,price,category
Widget A,10.99,electronics
Widget B,15.99,gadgets`;

      const filePath = path.join(testDir, 'products.csv');
      await writeFile(filePath, productCSV);

      const options: AssetLoadOptions = {
        patterns: ['*.csv'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.metadata.dataType).toBe('products'); // Should detect from 'product' column
    });
  });

  describe('Image Asset Loading', () => {
    test('should load image asset with metadata', async () => {
      // Create a small test image (1x1 PNG)
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
        0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x5C, 0xCD, 0x90, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const filePath = path.join(testDir, 'test-image.png');
      await writeFile(filePath, pngData);

      const options: AssetLoadOptions = {
        patterns: ['*.png'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);

      const asset = result.assets[0];
      expect(asset.type).toBe('image');
      expect(asset.metadata.filename).toBe('test-image');
      expect(asset.metadata.extension).toBe('.png');
      expect(asset.metadata.mimeType).toBe('image/png');
      expect(asset.fileSize).toBeGreaterThan(0);
      expect(asset.isValid).toBe(true);
      expect(asset.content).toBeUndefined(); // Images don't load content
    });
  });

  describe('Glob Pattern Support', () => {
    test('should support multiple glob patterns', async () => {
      // Create various files
      await writeFile(path.join(testDir, 'post1.md'), '# Post 1');
      await writeFile(path.join(testDir, 'post2.markdown'), '# Post 2');
      await writeFile(path.join(testDir, 'data.json'), '{"title": "Data"}');
      await writeFile(path.join(testDir, 'config.json'), '{"config": true}');

      const options: AssetLoadOptions = {
        patterns: ['*.md', '*.markdown', '*.json'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(4);
      expect(result.assets.filter(a => a.type === 'markdown')).toHaveLength(2);
      expect(result.assets.filter(a => a.type === 'json')).toHaveLength(2);
    });

    test('should support nested directory patterns', async () => {
      // Create nested structure
      const postsDir = path.join(testDir, 'posts');
      const dataDir = path.join(testDir, 'data');
      await mkdir(postsDir, { recursive: true });
      await mkdir(dataDir, { recursive: true });

      await writeFile(path.join(postsDir, 'post1.md'), '# Post 1');
      await writeFile(path.join(postsDir, 'post2.md'), '# Post 2');
      await writeFile(path.join(dataDir, 'users.json'), '{"users": []}');

      const options: AssetLoadOptions = {
        patterns: ['**/*.md', '**/*.json'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(3);
      expect(result.assets.some(a => a.filePath.includes('posts'))).toBe(true);
      expect(result.assets.some(a => a.filePath.includes('data'))).toBe(true);
    });
  });

  describe('File Filtering and Validation', () => {
    test('should respect file size limits', async () => {
      const largeContent = 'a'.repeat(1000); // 1KB content
      await writeFile(path.join(testDir, 'large.md'), largeContent);

      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: testDir,
        maxFileSize: 500 // 500 bytes limit
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(0);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('File too large');
    });

    test('should filter by allowed extensions', async () => {
      await writeFile(path.join(testDir, 'document.md'), '# Document');
      await writeFile(path.join(testDir, 'data.json'), '{"data": true}');
      await writeFile(path.join(testDir, 'script.js'), 'console.log("test");');

      const options: AssetLoadOptions = {
        patterns: ['*.*'],
        baseDirectory: testDir,
        allowedExtensions: ['.md', '.json']
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].error).toContain('Unsupported file extension');
    });

    test('should handle content loading toggle', async () => {
      await writeFile(path.join(testDir, 'post.md'), '# Test Post\n\nContent here');

      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: testDir,
        includeContent: false
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(1);
      const asset = result.assets[0];
      expect(asset.content).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle non-existent directory gracefully', async () => {
      const options: AssetLoadOptions = {
        patterns: ['*.md'],
        baseDirectory: '/non-existent-directory'
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(0);
      expect(result.totalFiles).toBe(0);
    });

    test('should continue processing after individual file errors', async () => {
      await writeFile(path.join(testDir, 'good.md'), '# Good Post');
      await writeFile(path.join(testDir, 'bad.json'), 'invalid json {');
      await writeFile(path.join(testDir, 'good.json'), '{"title": "Good"}');

      const options: AssetLoadOptions = {
        patterns: ['*.*'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);

      expect(result.successCount).toBe(3); // All files loaded, but one invalid
      expect(result.assets.filter(a => a.isValid)).toHaveLength(2); // Two valid
      expect(result.assets.filter(a => !a.isValid)).toHaveLength(1); // One invalid
    });
  });

  describe('Asset Loading Statistics', () => {
    test('should provide comprehensive loading statistics', async () => {
      await writeFile(path.join(testDir, 'post1.md'), '# Post 1\n\nContent');
      await writeFile(path.join(testDir, 'post2.md'), '# Post 2\n\nMore content');
      await writeFile(path.join(testDir, 'data.json'), '{"title": "Data"}');

      const options: AssetLoadOptions = {
        patterns: ['*.*'],
        baseDirectory: testDir
      };

      const result = await assetLoader.loadAssets(options);
      const stats = AssetLoader.getLoadingStats(result);

      expect(stats.successRate).toBe(100);
      expect(stats.avgFileSize).toBeGreaterThan(0);
      expect(stats.typeDistribution.markdown).toBe(2);
      expect(stats.typeDistribution.json).toBe(1);
      expect(stats.validationRate).toBe(100);
    });
  });
});

describe('Asset Loader Integration Tests', () => {
  test.skip('should handle large asset pools efficiently', async () => {
    // This test would create a large number of assets and verify performance
    // Skipped for unit tests but valuable for performance testing
  });

  test.skip('should work with real-world asset structures', async () => {
    // This test would use actual asset folders from projects
    // Skipped for unit tests but valuable for integration testing
  });
});