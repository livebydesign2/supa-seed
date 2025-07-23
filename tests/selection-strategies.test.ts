/**
 * Test suite for Asset Selection Strategies
 * Phase 2, Checkpoint B2 validation
 */

import { AssetSelectionEngine, SelectionOptions, WeightedSelectionConfig } from '../src/assets/selection-strategies';
import { LoadedAsset } from '../src/assets/asset-loader';

// Mock Logger
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Asset Selection Strategies', () => {
  let mockAssets: LoadedAsset[];

  beforeEach(() => {
    // Create mock assets for testing
    mockAssets = [
      {
        id: 'asset-1',
        filePath: '/test/post1.md',
        type: 'markdown',
        content: 'Short content',
        metadata: {
          filename: 'post1',
          title: 'First Post',
          tags: ['blog', 'featured'],
          category: 'tutorial'
        },
        fileSize: 1000,
        lastModified: new Date('2025-01-20'),
        isValid: true
      },
      {
        id: 'asset-2',
        filePath: '/test/post2.md',
        type: 'markdown',
        content: 'Much longer content with more detailed information about the topic',
        metadata: {
          filename: 'post2',
          title: 'Second Post',
          tags: ['blog', 'advanced'],
          category: 'guide'
        },
        fileSize: 2000,
        lastModified: new Date('2025-01-22'),
        isValid: true
      },
      {
        id: 'asset-3',
        filePath: '/test/data.json',
        type: 'json',
        content: '{"users": [{"name": "John"}, {"name": "Jane"}]}',
        metadata: {
          filename: 'data',
          dataType: 'users'
        },
        fileSize: 500,
        lastModified: new Date('2025-01-21'),
        isValid: true
      },
      {
        id: 'asset-4',
        filePath: '/test/users.csv',
        type: 'csv',
        content: 'name,email\nJohn,john@test.com\nJane,jane@test.com',
        metadata: {
          filename: 'users',
          rowCount: 2,
          columns: ['name', 'email']
        },
        fileSize: 800,
        lastModified: new Date('2025-01-19'),
        isValid: false // Marked as invalid for testing
      },
      {
        id: 'asset-5',
        filePath: '/test/image.png',
        type: 'image',
        metadata: {
          filename: 'image',
          mimeType: 'image/png'
        },
        fileSize: 1500,
        lastModified: new Date('2025-01-23'),
        isValid: true
      }
    ] as LoadedAsset[];
  });

  describe('Select All Strategy', () => {
    test('should select all assets when no count limit', () => {
      const result = AssetSelectionEngine.selectAll(mockAssets);

      expect(result.selected).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.strategy).toBe('all');
      expect(result.metadata.selectionRate).toBe(100);
    });

    test('should respect count limit', () => {
      const result = AssetSelectionEngine.selectAll(mockAssets, { count: 3 });

      expect(result.selected).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.metadata.selectionRate).toBe(60);
    });

    test('should order by last modified by default', () => {
      const result = AssetSelectionEngine.selectAll(mockAssets);

      // Should be ordered by last modified (newest first)
      expect(result.selected[0].id).toBe('asset-5'); // 2025-01-23
      expect(result.selected[1].id).toBe('asset-2'); // 2025-01-22
      expect(result.selected[2].id).toBe('asset-3'); // 2025-01-21
    });

    test('should preserve original order when requested', () => {
      const result = AssetSelectionEngine.selectAll(mockAssets, { preserveOrder: true });

      expect(result.selected[0].id).toBe('asset-1');
      expect(result.selected[1].id).toBe('asset-2');
      expect(result.selected[2].id).toBe('asset-3');
    });
  });

  describe('Random Selection Strategy', () => {
    test('should select specified number of assets', () => {
      const result = AssetSelectionEngine.selectRandom(mockAssets, 3);

      expect(result.selected).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.strategy).toBe('random');
      expect(result.metadata.selectionRate).toBe(60);
    });

    test('should be deterministic with same seed', () => {
      const result1 = AssetSelectionEngine.selectRandom(mockAssets, 3, { seed: 'test-seed' });
      const result2 = AssetSelectionEngine.selectRandom(mockAssets, 3, { seed: 'test-seed' });

      expect(result1.selected.map(a => a.id)).toEqual(result2.selected.map(a => a.id));
      expect(result1.seed).toBe('test-seed');
      expect(result2.seed).toBe('test-seed');
    });

    test('should return different results with different seeds', () => {
      const result1 = AssetSelectionEngine.selectRandom(mockAssets, 3, { seed: 'seed-1' });
      const result2 = AssetSelectionEngine.selectRandom(mockAssets, 3, { seed: 'seed-2' });

      // Results should likely be different (not guaranteed but highly probable)
      const ids1 = result1.selected.map(a => a.id).sort();
      const ids2 = result2.selected.map(a => a.id).sort();
      expect(ids1).not.toEqual(ids2);
    });

    test('should return all assets if count exceeds available', () => {
      const result = AssetSelectionEngine.selectRandom(mockAssets, 10);

      expect(result.selected).toHaveLength(5);
      expect(result.strategy).toBe('all'); // Falls back to selectAll
    });

    test('should preserve order when requested', () => {
      const result = AssetSelectionEngine.selectRandom(mockAssets, 3, { 
        preserveOrder: true,
        seed: 'order-test'
      });

      // Check that selected assets maintain their original relative order
      const selectedIndices = result.selected.map(asset => mockAssets.indexOf(asset));
      const sortedIndices = [...selectedIndices].sort((a, b) => a - b);
      expect(selectedIndices).toEqual(sortedIndices);
    });
  });

  describe('Filtered Selection Strategy', () => {
    test('should filter by single condition', () => {
      const typeFilter = AssetSelectionEngine.createFilters.byType(['markdown']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [typeFilter]);

      expect(result.selected).toHaveLength(2);
      expect(result.selected.every(a => a.type === 'markdown')).toBe(true);
      expect(result.strategy).toBe('filtered');
    });

    test('should filter by multiple conditions', () => {
      const typeFilter = AssetSelectionEngine.createFilters.byType(['markdown']);
      const tagFilter = AssetSelectionEngine.createFilters.byTags(['featured']);
      
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [typeFilter, tagFilter]);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].id).toBe('asset-1');
    });

    test('should handle filter by tags', () => {
      const tagFilter = AssetSelectionEngine.createFilters.byTags(['blog']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [tagFilter]);

      expect(result.selected).toHaveLength(2);
      expect(result.selected.every(a => a.metadata.tags?.includes('blog'))).toBe(true);
    });

    test('should filter by required tags (must have all)', () => {
      const requiredTagsFilter = AssetSelectionEngine.createFilters.byRequiredTags(['blog', 'featured']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [requiredTagsFilter]);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].id).toBe('asset-1');
    });

    test('should filter by category', () => {
      const categoryFilter = AssetSelectionEngine.createFilters.byCategory(['tutorial']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [categoryFilter]);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].metadata.category).toBe('tutorial');
    });

    test('should filter by size range', () => {
      const sizeFilter = AssetSelectionEngine.createFilters.bySizeRange(500, 1500);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [sizeFilter]);

      expect(result.selected).toHaveLength(4); // asset-1(1000), asset-3(500), asset-4(800), asset-5(1500)
      expect(result.selected.every(a => a.fileSize >= 500 && a.fileSize <= 1500)).toBe(true);
    });

    test('should filter by date range', () => {
      const dateFilter = AssetSelectionEngine.createFilters.byDateRange(
        new Date('2025-01-20'),
        new Date('2025-01-22')
      );
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [dateFilter]);

      expect(result.selected).toHaveLength(3);
    });

    test('should filter by content length', () => {
      const contentFilter = AssetSelectionEngine.createFilters.byContentLength(30);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [contentFilter]);

      expect(result.selected).toHaveLength(3); // asset-2(67 chars), asset-3(44 chars), asset-4(48 chars)
    });

    test('should filter valid assets only', () => {
      const validFilter = AssetSelectionEngine.createFilters.validOnly();
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [validFilter]);

      expect(result.selected).toHaveLength(4); // Excludes asset-4 which is invalid
      expect(result.selected.every(a => a.isValid)).toBe(true);
    });

    test('should filter by field existence', () => {
      const fieldFilter = AssetSelectionEngine.createFilters.hasField('title');
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [fieldFilter]);

      expect(result.selected).toHaveLength(2); // Only markdown assets have title
    });

    test('should filter by field value', () => {
      const valueFilter = AssetSelectionEngine.createFilters.fieldEquals('dataType', 'users');
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [valueFilter]);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].metadata.dataType).toBe('users');
    });

    test('should respect count limit with deterministic selection', () => {
      const typeFilter = AssetSelectionEngine.createFilters.byType(['markdown']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [typeFilter], {
        count: 1,
        ensureDeterministic: true,
        seed: 'filter-test'
      });

      expect(result.selected).toHaveLength(1);
      expect(result.strategy).toBe('filtered+random');
    });
  });

  describe('Manual Selection Strategy', () => {
    test('should select by asset IDs', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, ['asset-1', 'asset-3']);

      expect(result.selected).toHaveLength(2);
      expect(result.selected.map(a => a.id)).toEqual(['asset-1', 'asset-3']);
      expect(result.strategy).toBe('manual');
    });

    test('should select by filenames', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, ['post1', 'data']);

      expect(result.selected).toHaveLength(2);
      expect(result.selected[0].metadata.filename).toBe('post1');
      expect(result.selected[1].metadata.filename).toBe('data');
    });

    test('should select by file paths', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, ['/test/post1.md']);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].filePath).toBe('/test/post1.md');
    });

    test('should handle mixed identifier types', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, [
        'asset-1',        // By ID
        'data',           // By filename
        '/test/image.png' // By path
      ]);

      expect(result.selected).toHaveLength(3);
    });

    test('should handle non-existent identifiers gracefully', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, [
        'asset-1',
        'non-existent',
        'also-missing'
      ]);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0].id).toBe('asset-1');
    });

    test('should preserve identifier order by default', () => {
      const result = AssetSelectionEngine.selectManual(mockAssets, [
        'asset-3',
        'asset-1',
        'asset-5'
      ], { preserveOrder: true });

      expect(result.selected.map(a => a.id)).toEqual(['asset-3', 'asset-1', 'asset-5']);
    });
  });

  describe('Weighted Selection Strategy', () => {
    test('should select with uniform weights (equivalent to random)', () => {
      const config: WeightedSelectionConfig = {
        weights: {
          'asset-1': 1,
          'asset-2': 1,
          'asset-3': 1,
          'asset-4': 1,
          'asset-5': 1
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 3, config, {
        seed: 'uniform-test'
      });

      expect(result.selected).toHaveLength(3);
      expect(result.strategy).toBe('weighted');
    });

    test('should bias selection with different weights', () => {
      const config: WeightedSelectionConfig = {
        weights: {
          'asset-1': 10, // High weight
          'asset-2': 1,
          'asset-3': 1,
          'asset-4': 1,
          'asset-5': 1
        }
      };

      // Run multiple times to test bias (asset-1 should appear more often)
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config, {
          seed: `bias-test-${i}`
        });
        results.push(result.selected.map(a => a.id));
      }

      // asset-1 should appear in most results due to higher weight
      const asset1Appearances = results.filter(ids => ids.includes('asset-1')).length;
      expect(asset1Appearances).toBeGreaterThan(5); // Should appear in majority of results
    });

    test('should use custom weight function', () => {
      const config: WeightedSelectionConfig = {
        weightFunction: AssetSelectionEngine.createWeightFunctions.byFileSize()
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 3, config, {
        seed: 'size-weight-test'
      });

      expect(result.selected).toHaveLength(3);
      // Larger files should be more likely to be selected
    });

    test('should apply type bias', () => {
      const config: WeightedSelectionConfig = {
        biases: {
          byType: {
            'markdown': 3.0, // Strongly prefer markdown
            'json': 1.0,
            'csv': 1.0,
            'image': 1.0
          }
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 3, config, {
        seed: 'type-bias-test'
      });

      expect(result.selected).toHaveLength(3);
      // Should favor markdown assets
    });

    test('should apply size bias', () => {
      const config: WeightedSelectionConfig = {
        biases: {
          bySize: 'prefer_large'
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config, {
        seed: 'size-bias-test'
      });

      expect(result.selected).toHaveLength(2);
    });

    test('should apply age bias', () => {
      const config: WeightedSelectionConfig = {
        biases: {
          byAge: 'prefer_new'
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config, {
        seed: 'age-bias-test'
      });

      expect(result.selected).toHaveLength(2);
    });

    test('should apply tag bias', () => {
      const config: WeightedSelectionConfig = {
        biases: {
          byTags: {
            'featured': 2.0,
            'advanced': 1.5
          }
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config, {
        seed: 'tag-bias-test'
      });

      expect(result.selected).toHaveLength(2);
    });

    test('should handle zero weights gracefully', () => {
      const config: WeightedSelectionConfig = {
        weights: {
          'asset-1': 0,
          'asset-2': 0,
          'asset-3': 0,
          'asset-4': 0,
          'asset-5': 0
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config);

      expect(result.selected).toHaveLength(2); // Should fall back to random
    });

    test('should return all assets if count exceeds available', () => {
      const config: WeightedSelectionConfig = { weights: {} };
      const result = AssetSelectionEngine.selectWeighted(mockAssets, 10, config);

      expect(result.selected).toHaveLength(5);
      expect(result.strategy).toBe('all');
    });
  });

  describe('Selection Metadata', () => {
    test('should calculate correct selection metadata', () => {
      const result = AssetSelectionEngine.selectRandom(mockAssets, 3, { seed: 'meta-test' });

      expect(result.metadata.selectionRate).toBe(60); // 3/5 * 100
      expect(result.metadata.avgFileSize).toBeGreaterThan(0);
      expect(result.metadata.typeDistribution).toBeDefined();
      expect(result.metadata.validAssets).toBeLessThanOrEqual(3);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should track type distribution correctly', () => {
      const typeFilter = AssetSelectionEngine.createFilters.byType(['markdown', 'json']);
      const result = AssetSelectionEngine.selectFiltered(mockAssets, [typeFilter]);

      expect(result.metadata.typeDistribution.markdown).toBe(2);
      expect(result.metadata.typeDistribution.json).toBe(1);
    });
  });

  describe('Weight Functions', () => {
    test('should create file size weight function', () => {
      const weightFn = AssetSelectionEngine.createWeightFunctions.byFileSize();
      const weight = weightFn(mockAssets[1], 1, mockAssets); // asset-2 has fileSize 2000

      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    });

    test('should create recency weight function', () => {
      const weightFn = AssetSelectionEngine.createWeightFunctions.byRecency();
      const weight = weightFn(mockAssets[4], 4, mockAssets); // asset-5 is newest

      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    });

    test('should create tag count weight function', () => {
      const weightFn = AssetSelectionEngine.createWeightFunctions.byTagCount();
      const weight = weightFn(mockAssets[0], 0, mockAssets); // asset-1 has 2 tags

      expect(weight).toBe(2); // Should return tag count
    });

    test('should create content length weight function', () => {
      const weightFn = AssetSelectionEngine.createWeightFunctions.byContentLength();
      const weight = weightFn(mockAssets[1], 1, mockAssets); // asset-2 has longer content

      expect(weight).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle filter function errors gracefully', () => {
      const errorFilter = () => {
        throw new Error('Filter error');
      };

      const result = AssetSelectionEngine.selectFiltered(mockAssets, [errorFilter]);

      expect(result.selected).toHaveLength(0); // All assets filtered out due to error
    });

    test('should handle weight function errors gracefully', () => {
      const config: WeightedSelectionConfig = {
        weightFunction: () => {
          throw new Error('Weight function error');
        }
      };

      const result = AssetSelectionEngine.selectWeighted(mockAssets, 2, config);

      expect(result.selected).toHaveLength(2); // Should fall back to base weight
    });
  });
});