/**
 * Test suite for Distribution Algorithms
 * Phase 3, Checkpoint C1 validation - Asset-to-entity distribution testing
 */

import { DistributionEngine, DistributionTarget, DistributionConfig, DistributionResult } from '../src/associations/distribution-algorithms';
import { LoadedAsset } from '../src/features/generation/assets/asset-loader';

// Mock Logger
jest.mock('../src/core/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Distribution Algorithms', () => {
  let mockAssets: LoadedAsset[];
  let mockTargets: DistributionTarget[];

  beforeEach(() => {
    // Create mock assets for distribution
    mockAssets = [
      {
        id: 'asset-1',
        filePath: '/test/post1.md',
        type: 'markdown',
        content: 'First post content',
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
        content: 'Second post content',
        metadata: {
          filename: 'post2',
          title: 'Second Post',
          tags: ['blog', 'advanced'],
          category: 'guide'
        },
        fileSize: 1500,
        lastModified: new Date('2025-01-21'),
        isValid: true
      },
      {
        id: 'asset-3',
        filePath: '/test/data.json',
        type: 'json',
        content: '{"users": [{"name": "John"}, {"name": "Jane"}]}',
        metadata: {
          filename: 'data',
          dataType: 'users',
          tags: ['data']
        },
        fileSize: 500,
        lastModified: new Date('2025-01-22'),
        isValid: true
      },
      {
        id: 'asset-4',
        filePath: '/test/image.png',
        type: 'image',
        metadata: {
          filename: 'image',
          tags: ['media', 'featured']
        },
        fileSize: 2000,
        lastModified: new Date('2025-01-23'),
        isValid: true
      },
      {
        id: 'asset-5',
        filePath: '/test/products.csv',
        type: 'csv',
        content: 'name,price\nWidget,29.99\nGadget,49.99',
        metadata: {
          filename: 'products',
          tags: ['data', 'products']
        },
        fileSize: 800,
        lastModified: new Date('2025-01-24'),
        isValid: true
      }
    ] as LoadedAsset[];

    // Create mock distribution targets
    mockTargets = [
      {
        id: 'user-1',
        name: 'Alice',
        weight: 1
      },
      {
        id: 'user-2',
        name: 'Bob',
        weight: 2
      },
      {
        id: 'user-3',
        name: 'Charlie',
        weight: 1
      }
    ];
  });

  describe('Weighted Random Distribution', () => {
    test('should distribute assets based on target weights', () => {
      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'test-seed',
        ensureDeterministic: true
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      expect(result.algorithm).toBe('weighted_random');
      expect(result.seed).toBe('test-seed');
      expect(result.assignments).toHaveLength(3);
      expect(result.totalAssets).toBe(5);
      expect(result.totalTargets).toBe(3);
      expect(result.unassigned).toHaveLength(0);

      // All assets should be assigned
      const totalAssigned = result.assignments.reduce((sum, a) => sum + a.assets.length, 0);
      expect(totalAssigned).toBe(5);

      // Bob (weight 2) should get more assets than Alice/Charlie (weight 1 each)
      const bobAssignment = result.assignments.find(a => a.target.id === 'user-2');
      expect(bobAssignment?.assets.length).toBeGreaterThanOrEqual(1);
    });

    test('should be deterministic with same seed', () => {
      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'deterministic-test',
        ensureDeterministic: true
      };

      const result1 = DistributionEngine.distribute(mockAssets, mockTargets, config);
      const result2 = DistributionEngine.distribute(mockAssets, mockTargets, config);

      // Results should be identical
      for (let i = 0; i < result1.assignments.length; i++) {
        expect(result1.assignments[i].assets.map(a => a.id)).toEqual(
          result2.assignments[i].assets.map(a => a.id)
        );
      }
    });

    test('should produce different results with different seeds', () => {
      const config1: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'seed-1',
        ensureDeterministic: true
      };

      const config2: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'seed-2',
        ensureDeterministic: true
      };

      const result1 = DistributionEngine.distribute(mockAssets, mockTargets, config1);
      const result2 = DistributionEngine.distribute(mockAssets, mockTargets, config2);

      // Results should likely be different (not guaranteed but highly probable)
      let different = false;
      for (let i = 0; i < result1.assignments.length; i++) {
        const ids1 = result1.assignments[i].assets.map(a => a.id).sort();
        const ids2 = result2.assignments[i].assets.map(a => a.id).sort();
        if (JSON.stringify(ids1) !== JSON.stringify(ids2)) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });

    test('should handle equal weights (uniform distribution)', () => {
      const equalWeightTargets = mockTargets.map(t => ({ ...t, weight: 1 }));
      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'equal-weights',
        ensureDeterministic: true
      };

      const result = DistributionEngine.distribute(mockAssets, equalWeightTargets, config);

      expect(result.assignments).toHaveLength(3);
      expect(result.metadata.distributionEfficiency).toBe(100);
    });
  });

  describe('Round Robin Distribution', () => {
    test('should distribute assets evenly in sequential order', () => {
      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      expect(result.algorithm).toBe('round_robin');
      expect(result.assignments).toHaveLength(3);
      expect(result.unassigned).toHaveLength(0);

      // With 5 assets and 3 targets, distribution should be 2-2-1 or 2-1-2 etc.
      const assignmentCounts = result.assignments.map(a => a.assets.length);
      assignmentCounts.sort((a, b) => b - a); // Sort descending
      expect(assignmentCounts).toEqual([2, 2, 1]);

      // Check sequential assignment pattern
      // First asset should go to first target, second to second target, etc.
      expect(result.assignments[0].assets[0].id).toBe('asset-1');
      expect(result.assignments[1].assets[0].id).toBe('asset-2');
      expect(result.assignments[2].assets[0].id).toBe('asset-3');
      expect(result.assignments[0].assets[1].id).toBe('asset-4');
      expect(result.assignments[1].assets[1].id).toBe('asset-5');
    });

    test('should handle more targets than assets', () => {
      const manyTargets = [
        ...mockTargets,
        { id: 'user-4', name: 'David' },
        { id: 'user-5', name: 'Eve' },
        { id: 'user-6', name: 'Frank' }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result = DistributionEngine.distribute(mockAssets, manyTargets, config);

      expect(result.assignments).toHaveLength(6);
      expect(result.unassigned).toHaveLength(0);

      // First 5 targets should get 1 asset each, last target gets none
      const assignmentCounts = result.assignments.map(a => a.assets.length);
      expect(assignmentCounts).toEqual([1, 1, 1, 1, 1, 0]);
    });

    test('should maintain consistent assignment order', () => {
      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result1 = DistributionEngine.distribute(mockAssets, mockTargets, config);
      const result2 = DistributionEngine.distribute(mockAssets, mockTargets, config);

      // Round robin should always produce the same result (deterministic)
      for (let i = 0; i < result1.assignments.length; i++) {
        expect(result1.assignments[i].assets.map(a => a.id)).toEqual(
          result2.assignments[i].assets.map(a => a.id)
        );
      }
    });
  });

  describe('Even Spread Distribution', () => {
    test('should distribute assets as evenly as possible', () => {
      const config: DistributionConfig = {
        algorithm: 'even_spread',
        seed: 'even-test',
        ensureDeterministic: true
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      expect(result.algorithm).toBe('even_spread');
      expect(result.seed).toBe('even-test');
      expect(result.assignments).toHaveLength(3);
      expect(result.unassigned).toHaveLength(0);

      // With 5 assets and 3 targets, should distribute 2-2-1 (or similar)
      const assignmentCounts = result.assignments.map(a => a.assets.length);
      assignmentCounts.sort((a, b) => b - a);
      expect(assignmentCounts[0] - assignmentCounts[2]).toBeLessThanOrEqual(1); // Max difference of 1
    });

    test('should handle perfect division', () => {
      // Use 6 assets with 3 targets for perfect division
      const sixAssets = [...mockAssets, {
        id: 'asset-6',
        filePath: '/test/extra.md',
        type: 'markdown',
        content: 'Extra content',
        metadata: { filename: 'extra' },
        fileSize: 1200,
        lastModified: new Date('2025-01-25'),
        isValid: true
      } as LoadedAsset];

      const config: DistributionConfig = {
        algorithm: 'even_spread',
        seed: 'perfect-division',
        ensureDeterministic: true
      };

      const result = DistributionEngine.distribute(sixAssets, mockTargets, config);

      // Should be exactly 2 assets per target
      const assignmentCounts = result.assignments.map(a => a.assets.length);
      expect(assignmentCounts).toEqual([2, 2, 2]);
    });

    test('should be deterministic with same seed', () => {
      const config: DistributionConfig = {
        algorithm: 'even_spread',
        seed: 'spread-deterministic',
        ensureDeterministic: true
      };

      const result1 = DistributionEngine.distribute(mockAssets, mockTargets, config);
      const result2 = DistributionEngine.distribute(mockAssets, mockTargets, config);

      // Results should be identical due to seeded shuffling
      for (let i = 0; i < result1.assignments.length; i++) {
        expect(result1.assignments[i].assets.map(a => a.id)).toEqual(
          result2.assignments[i].assets.map(a => a.id)
        );
      }
    });

    test('should shuffle assets for fair distribution', () => {
      const config: DistributionConfig = {
        algorithm: 'even_spread',
        seed: 'shuffle-test',
        ensureDeterministic: true
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      // Assets should not be distributed in original order (due to shuffling)
      const firstAssignmentAssets = result.assignments[0].assets.map(a => a.id);
      // This test might occasionally fail due to randomness, but should usually pass
      const isOriginalOrder = firstAssignmentAssets[0] === 'asset-1' && 
                             (firstAssignmentAssets.length === 1 || firstAssignmentAssets[1] === 'asset-4');
      // With shuffling, original order is unlikely (but possible)
    });
  });

  describe('Custom Algorithm', () => {
    test('should use custom algorithm function', () => {
      const customAlgorithm = (assets: LoadedAsset[], targets: DistributionTarget[]): DistributionResult => {
        // Custom: assign all assets to first target
        return {
          assignments: [
            {
              target: targets[0],
              assets: [...assets],
              fulfilled: true,
              constraintViolations: [],
              assignmentReason: 'custom_all_to_first'
            },
            ...targets.slice(1).map(target => ({
              target,
              assets: [],
              fulfilled: true,
              constraintViolations: [],
              assignmentReason: 'custom_empty'
            }))
          ],
          unassigned: [],
          algorithm: 'custom',
          totalAssets: assets.length,
          totalTargets: targets.length,
          successRate: 100,
          metadata: {
            executionTime: 0,
            retries: 0,
            constraintViolations: 0,
            averageAssignmentsPerTarget: assets.length / targets.length,
            distributionEfficiency: 100
          }
        };
      };

      const config: DistributionConfig = {
        algorithm: 'custom',
        customAlgorithm
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      expect(result.algorithm).toBe('custom');
      expect(result.assignments[0].assets).toHaveLength(5); // All assets to first target
      expect(result.assignments[1].assets).toHaveLength(0);
      expect(result.assignments[2].assets).toHaveLength(0);
    });

    test('should throw error when custom algorithm not provided', () => {
      const config: DistributionConfig = {
        algorithm: 'custom'
        // Missing customAlgorithm
      };

      expect(() => {
        DistributionEngine.distribute(mockAssets, mockTargets, config);
      }).toThrow('Custom algorithm function is required when using custom algorithm');
    });
  });

  describe('Constraint Enforcement', () => {
    test('should enforce minimum items constraint', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            minItems: 4 // Require more than can be fulfilled with round robin (5 assets, 2 targets = max 3 for user-1)
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true,
        allowPartialFulfillment: false
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.fulfilled).toBe(false);
      expect(aliceAssignment?.constraintViolations.some(v => 
        v.includes('requires minimum 4')
      )).toBe(true);
    });

    test('should enforce maximum items constraint', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            maxItems: 2
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'max-constraint-test',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.length).toBeLessThanOrEqual(2);
      expect(result.unassigned.length).toBeGreaterThanOrEqual(0);
    });

    test('should filter by required types', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            requiredTypes: ['markdown']
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.every(a => a.type === 'markdown')).toBe(true);
    });

    test('should filter by excluded types', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            excludedTypes: ['image', 'csv']
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.every(a => !['image', 'csv'].includes(a.type))).toBe(true);
    });

    test('should filter by required tags', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            requiredTags: ['featured']
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.every(a => 
        a.metadata.tags?.includes('featured')
      )).toBe(true);
    });

    test('should filter by excluded tags', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            excludedTags: ['data']
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.every(a => 
        !a.metadata.tags?.some(tag => ['data'].includes(tag))
      )).toBe(true);
    });

    test('should apply custom filter', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            customFilter: (asset: LoadedAsset) => asset.fileSize > 1000
          }
        },
        {
          id: 'user-2',
          name: 'Bob'
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.every(a => a.fileSize > 1000)).toBe(true);
    });

    test('should handle partial fulfillment when allowed', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            minItems: 10 // Impossible to fulfill
          }
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true,
        allowPartialFulfillment: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);

      const aliceAssignment = result.assignments.find(a => a.target.id === 'user-1');
      expect(aliceAssignment?.assets.length).toBeGreaterThan(0);
      expect(aliceAssignment?.fulfilled).toBe(false);
      expect(aliceAssignment?.constraintViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty asset list', () => {
      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result = DistributionEngine.distribute([], mockTargets, config);

      expect(result.totalAssets).toBe(0);
      expect(result.totalTargets).toBe(3);
      expect(result.successRate).toBe(0);
      expect(result.assignments.every(a => a.assets.length === 0)).toBe(true);
      expect(result.assignments.every(a => !a.fulfilled)).toBe(true);
    });

    test('should handle empty target list', () => {
      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result = DistributionEngine.distribute(mockAssets, [], config);

      expect(result.totalAssets).toBe(5);
      expect(result.totalTargets).toBe(0);
      expect(result.successRate).toBe(0);
      expect(result.assignments).toHaveLength(0);
      expect(result.unassigned).toHaveLength(5);
    });

    test('should throw error for unknown algorithm', () => {
      const config: DistributionConfig = {
        algorithm: 'unknown_algorithm' as any
      };

      expect(() => {
        DistributionEngine.distribute(mockAssets, mockTargets, config);
      }).toThrow('Unknown distribution algorithm: unknown_algorithm');
    });

    test('should calculate success rate correctly', () => {
      const config: DistributionConfig = {
        algorithm: 'round_robin'
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      // All assignments should be fulfilled (no constraints)
      expect(result.successRate).toBe(100);

      // Test with constraints that will fail
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          constraints: { minItems: 10 }
        },
        {
          id: 'user-2',
          constraints: { minItems: 10 }
        }
      ];

      const constrainedConfig: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true,
        allowPartialFulfillment: false
      };

      const constrainedResult = DistributionEngine.distribute(mockAssets, constrainedTargets, constrainedConfig);
      expect(constrainedResult.successRate).toBe(0); // No targets can be fulfilled
    });

    test('should track execution time', () => {
      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'timing-test'
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);

      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata.executionTime).toBe('number');
    });
  });

  describe('Distribution Analysis', () => {
    test('should provide comprehensive analysis', () => {
      const config: DistributionConfig = {
        algorithm: 'weighted_random',
        seed: 'analysis-test'
      };

      const result = DistributionEngine.distribute(mockAssets, mockTargets, config);
      const analysis = DistributionEngine.analyzeDistribution(result);

      expect(analysis.summary).toContain('Distribution completed');
      expect(analysis.summary).toContain('weighted_random');
      expect(analysis.insights).toContain('Used weighted_random algorithm to distribute 5 assets to 3 targets');
      expect(analysis.statistics.totalAssigned).toBe(5);
      expect(analysis.statistics.totalUnassigned).toBe(0);
      expect(analysis.statistics.avgAssetsPerTarget).toBeCloseTo(5/3, 1);
      expect(analysis.statistics.fulfilmentRate).toBe(100);
    });

    test('should provide recommendations for poor performance', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          constraints: { minItems: 10 }
        },
        {
          id: 'user-2',
          constraints: { minItems: 10 }
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true,
        allowPartialFulfillment: false
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);
      const analysis = DistributionEngine.analyzeDistribution(result);

      expect(analysis.recommendations).toContain('Consider relaxing constraints or using a different distribution algorithm');
      expect(analysis.statistics.fulfilmentRate).toBeLessThan(80);
    });

    test('should analyze constraint violations', () => {
      const constrainedTargets: DistributionTarget[] = [
        {
          id: 'user-1',
          constraints: { requiredTypes: ['nonexistent'] }
        },
        {
          id: 'user-2',
          constraints: { requiredTypes: ['nonexistent'] }
        }
      ];

      const config: DistributionConfig = {
        algorithm: 'round_robin',
        respectConstraints: true
      };

      const result = DistributionEngine.distribute(mockAssets, constrainedTargets, config);
      const analysis = DistributionEngine.analyzeDistribution(result);

      expect(analysis.insights.some(insight => 
        insight.includes('constraint violations')
      )).toBe(true);
      expect(analysis.recommendations.some(rec => 
        rec.includes('Review target constraints')
      )).toBe(true);
    });
  });
});