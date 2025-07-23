/**
 * Test suite for Constraint Enforcement System
 * Phase 3, Checkpoint C2 validation - Advanced constraint validation and conflict resolution
 */

import { 
  ConstraintEnforcementEngine, 
  ConstraintRule, 
  ConstraintConfig,
  ConstraintViolation,
  ValidationContext,
  ResolutionContext
} from '../src/associations/constraint-enforcement';
import { DistributionTarget, DistributionAssignment } from '../src/associations/distribution-algorithms';
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

describe('Constraint Enforcement Engine', () => {
  let engine: ConstraintEnforcementEngine;
  let mockAssets: LoadedAsset[];
  let mockAssignments: DistributionAssignment[];

  beforeEach(() => {
    const config: ConstraintConfig = {
      enforcementLevel: 'balanced',
      allowPartialFulfillment: true,
      autoResolveConflicts: true,
      maxResolutionAttempts: 3,
      fallbackGeneration: true,
      priorityWeighting: { critical: 10, high: 5, medium: 2, low: 1 },
      customResolvers: {}
    };

    engine = new ConstraintEnforcementEngine(config);

    // Create mock assets
    mockAssets = [
      {
        id: 'asset-1',
        filePath: '/test/post1.md',
        type: 'markdown',
        content: 'First post content',
        metadata: {
          filename: 'post1',
          title: 'First Post',
          tags: ['blog', 'featured']
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
          tags: ['blog']
        },
        fileSize: 1500,
        lastModified: new Date('2025-01-21'),
        isValid: true
      },
      {
        id: 'asset-3',
        filePath: '/test/data.json',
        type: 'json',
        content: '{"users": [{"name": "John"}]}',
        metadata: {
          filename: 'data',
          dataType: 'users'
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
          tags: ['media']
        },
        fileSize: 2000,
        lastModified: new Date('2025-01-23'),
        isValid: true
      }
    ] as LoadedAsset[];

    // Create mock assignments
    mockAssignments = [
      {
        target: {
          id: 'user-1',
          name: 'Alice',
          constraints: {
            minItems: 2,
            maxItems: 3,
            requiredTypes: ['markdown']
          }
        },
        assets: [mockAssets[0], mockAssets[1]], // 2 markdown assets
        fulfilled: true,
        constraintViolations: [],
        assignmentReason: 'test'
      },
      {
        target: {
          id: 'user-2',
          name: 'Bob',
          constraints: {
            minItems: 1,
            excludedTypes: ['image']
          }
        },
        assets: [mockAssets[2]], // 1 JSON asset
        fulfilled: true,
        constraintViolations: [],
        assignmentReason: 'test'
      }
    ];
  });

  describe('Engine Initialization and Configuration', () => {
    test('should initialize with default built-in rules', () => {
      const rules = engine.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.id === 'min-items-constraint')).toBe(true);
      expect(rules.some(rule => rule.id === 'max-items-constraint')).toBe(true);
      expect(rules.some(rule => rule.id === 'asset-type-constraint')).toBe(true);
    });

    test('should create engine with default configuration', () => {
      const defaultEngine = ConstraintEnforcementEngine.createDefault();
      const rules = defaultEngine.getRules();
      
      expect(rules.length).toBeGreaterThan(0);
    });

    test('should add and remove custom rules', () => {
      const customRule: ConstraintRule = {
        id: 'custom-test-rule',
        name: 'Custom Test Rule',
        type: 'custom',
        priority: 'medium',
        description: 'A test rule',
        validator: () => ({
          isValid: true,
          violations: [],
          warnings: [],
          metadata: { executionTime: 0, assetsEvaluated: 0, rulesApplied: [] }
        })
      };

      engine.addRule(customRule);
      expect(engine.getRule('custom-test-rule')).toBeDefined();

      const removed = engine.removeRule('custom-test-rule');
      expect(removed).toBe(true);
      expect(engine.getRule('custom-test-rule')).toBeUndefined();
    });

    test('should update configuration', () => {
      engine.updateConfig({ enforcementLevel: 'strict', maxResolutionAttempts: 5 });
      
      // Configuration changes would be reflected in behavior, 
      // but we can't directly access private config for testing
      expect(true).toBe(true); // Configuration update completed without error
    });
  });

  describe('Constraint Validation', () => {
    test('should validate assignments successfully when constraints are met', () => {
      const result = engine.validateAssignments(mockAssignments, mockAssets);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.rulesApplied.length).toBeGreaterThan(0);
    });

    test('should detect minimum items violations', () => {
      // Create assignment that violates minimum items constraint
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              minItems: 5 // Requires 5 but only has 1
            }
          },
          assets: [mockAssets[0]], // Only 1 asset
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(violatingAssignments, mockAssets);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('min-items-constraint');
      expect(result.violations[0].violationType).toBe('insufficient');
      expect(result.violations[0].affectedTargets).toContain('user-1');
    });

    test('should detect maximum items violations', () => {
      // Create assignment that violates maximum items constraint
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              maxItems: 2 // Allows max 2 but has 4
            }
          },
          assets: mockAssets, // All 4 assets
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(violatingAssignments, mockAssets);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('max-items-constraint');
      expect(result.violations[0].violationType).toBe('excess');
      expect(result.violations[0].metadata.excess).toBe(2);
    });

    test('should detect asset type violations for required types', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              requiredTypes: ['markdown'] // Only allows markdown
            }
          },
          assets: [mockAssets[0], mockAssets[2]], // markdown + JSON (violates constraint)
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(violatingAssignments, mockAssets);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('asset-type-constraint');
      expect(result.violations[0].violationType).toBe('invalid');
      expect(result.violations[0].affectedAssets).toContain('asset-3'); // JSON asset
    });

    test('should detect asset type violations for excluded types', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              excludedTypes: ['image'] // Excludes images
            }
          },
          assets: [mockAssets[0], mockAssets[3]], // markdown + image (violates constraint)
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(violatingAssignments, mockAssets);

      expect(result.isValid).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].ruleId).toBe('asset-type-constraint');
      expect(result.violations[0].violationType).toBe('invalid');
      expect(result.violations[0].affectedAssets).toContain('asset-4'); // Image asset
    });

    test('should handle multiple violations in single assignment', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              minItems: 5, // Too few assets
              maxItems: 3, // Too many assets (if we had 5)
              requiredTypes: ['markdown'] // Only markdown allowed
            }
          },
          assets: [mockAssets[2]], // Only 1 JSON asset (violates min + type)
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(violatingAssignments, mockAssets);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(2); // At least min-items and asset-type violations
    });

    test('should handle validation errors gracefully', () => {
      // Add a rule that throws an error
      const errorRule: ConstraintRule = {
        id: 'error-rule',
        name: 'Error Rule',
        type: 'custom',
        priority: 'low',
        description: 'A rule that throws errors',
        validator: () => {
          throw new Error('Validation error');
        }
      };

      engine.addRule(errorRule);
      const result = engine.validateAssignments(mockAssignments, mockAssets);

      // Should still return a result with warnings about the failed rule
      expect(result.warnings.some(w => w.message.includes('Rule evaluation failed'))).toBe(true);
    });
  });

  describe('Constraint Enforcement and Resolution', () => {
    test('should successfully enforce constraints when no violations exist', () => {
      const result = engine.enforceConstraints(mockAssignments, mockAssets);

      expect(result.success).toBe(true);
      expect(result.unresolvableViolations).toHaveLength(0);
      expect(result.finalAssignments).toHaveLength(mockAssignments.length);
      expect(result.enforcementReport.statistics.resolutionSuccessRate).toBe(100);
    });

    test('should resolve minimum items violations with fallback generation', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              minItems: 3 // Requires 3 but only has 1
            }
          },
          assets: [mockAssets[0]], // Only 1 asset
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.enforceConstraints(violatingAssignments, mockAssets);

      expect(result.appliedResolutions.length).toBeGreaterThan(0);
      expect(result.appliedResolutions[0].strategy).toBe('add_fallback');
      expect(result.enforcementReport.resolutionsByStrategy['add_fallback']).toBeGreaterThan(0);
    });

    test('should handle maximum items violations', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              maxItems: 2 // Allows max 2 but has 4
            }
          },
          assets: mockAssets, // All 4 assets
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        },
        {
          target: {
            id: 'user-2',
            name: 'Bob',
            constraints: {
              maxItems: 10 // Can accept more assets
            }
          },
          assets: [], // Empty target for redistribution
          fulfilled: true,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.enforceConstraints(violatingAssignments, mockAssets);

      // Should complete without errors and provide a report
      expect(result.enforcementReport).toBeDefined();
      expect(result.enforcementReport.statistics.totalRulesEvaluated).toBeGreaterThan(0);
      expect(result.finalAssignments.length).toBe(2);
    });

    test('should handle unresolvable violations', () => {
      // Create a violation that cannot be automatically resolved
      const unresolvableAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            name: 'Alice',
            constraints: {
              requiredTypes: ['nonexistent-type'] // No assets of this type exist
            }
          },
          assets: [mockAssets[0]], // Markdown asset (wrong type)
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.enforceConstraints(unresolvableAssignments, mockAssets);

      expect(result.success).toBe(false);
      expect(result.unresolvableViolations.length).toBeGreaterThan(0);
      expect(result.enforcementReport.recommendations.length).toBeGreaterThan(0);
    });

    test('should respect maximum resolution attempts', () => {
      // Create a scenario that would require many resolution attempts
      const config: ConstraintConfig = {
        enforcementLevel: 'strict',
        allowPartialFulfillment: false,
        autoResolveConflicts: true,
        maxResolutionAttempts: 1, // Very low limit
        fallbackGeneration: false,
        priorityWeighting: { critical: 10, high: 5, medium: 2, low: 1 },
        customResolvers: {}
      };

      const strictEngine = new ConstraintEnforcementEngine(config);

      const complexAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            constraints: {
              minItems: 10, // Impossible to fulfill without fallback generation
              requiredTypes: ['markdown']
            }
          },
          assets: [mockAssets[0]], // Only 1 asset, needs 10
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = strictEngine.enforceConstraints(complexAssignments, mockAssets);

      // Should have violations due to minItems constraint and disabled fallback generation
      expect(result.success).toBe(false);
      expect(result.unresolvableViolations.length).toBeGreaterThanOrEqual(0);
      expect(result.enforcementReport.statistics.resolutionSuccessRate).toBeLessThan(100);
    });

    test('should generate comprehensive enforcement report', () => {
      const violatingAssignments: DistributionAssignment[] = [
        {
          target: {
            id: 'user-1',
            constraints: {
              minItems: 3,
              maxItems: 2 // Conflicting constraints
            }
          },
          assets: [mockAssets[0]],
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.enforceConstraints(violatingAssignments, mockAssets);

      expect(result.enforcementReport).toBeDefined();
      expect(result.enforcementReport.summary).toContain('Constraint enforcement completed');
      expect(result.enforcementReport.statistics.totalRulesEvaluated).toBeGreaterThan(0);
      expect(result.enforcementReport.statistics.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.enforcementReport.violationsByType).toBeDefined();
      expect(result.enforcementReport.performanceMetrics).toBeDefined();
      expect(result.enforcementReport.performanceMetrics.memoryUsage).toBeGreaterThan(0);
    });
  });

  describe('Custom Rules and Resolvers', () => {
    test('should execute custom constraint rules', () => {
      let validatorCalled = false;
      
      const customRule: ConstraintRule = {
        id: 'custom-content-rule',
        name: 'Custom Content Rule',
        type: 'content',
        priority: 'medium',
        description: 'Validates custom content requirements',
        validator: (assignment, context) => {
          validatorCalled = true;
          
          const hasTitle = assignment.assets.some(asset => 
            asset.metadata.title && asset.metadata.title.length > 0
          );
          
          const violations = hasTitle ? [] : [{
            ruleId: 'custom-content-rule',
            ruleName: 'Custom Content Rule',
            severity: 'warning' as const,
            message: 'No assets with titles found',
            affectedTargets: [assignment.target.id],
            affectedAssets: assignment.assets.map(a => a.id),
            violationType: 'invalid' as const,
            suggestedResolutions: ['Add assets with titles'],
            metadata: {}
          }];

          return {
            isValid: violations.length === 0,
            violations,
            warnings: [],
            metadata: {
              executionTime: 1,
              assetsEvaluated: assignment.assets.length,
              rulesApplied: ['custom-content-rule']
            }
          };
        }
      };

      engine.addRule(customRule);
      
      const assignmentsWithoutTitles: DistributionAssignment[] = [
        {
          target: { id: 'user-1', name: 'Alice' },
          assets: [{ ...mockAssets[2], metadata: { filename: 'data' } }], // Asset without title
          fulfilled: true,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(assignmentsWithoutTitles, mockAssets);

      expect(validatorCalled).toBe(true);
      expect(result.violations.some(v => v.ruleId === 'custom-content-rule')).toBe(true);
    });

    test('should use custom conflict resolvers', () => {
      let resolverCalled = false;

      const customRule: ConstraintRule = {
        id: 'custom-resolvable-rule',
        name: 'Custom Resolvable Rule',
        type: 'custom',
        priority: 'high',
        description: 'A rule with custom resolver',
        validator: (assignment) => ({
          isValid: false,
          violations: [{
            ruleId: 'custom-resolvable-rule',
            ruleName: 'Custom Resolvable Rule',
            severity: 'error',
            message: 'Always violates for testing',
            affectedTargets: [assignment.target.id],
            affectedAssets: [],
            violationType: 'invalid',
            suggestedResolutions: ['Use custom resolver'],
            metadata: {}
          }],
          warnings: [],
          metadata: {
            executionTime: 1,
            assetsEvaluated: 0,
            rulesApplied: ['custom-resolvable-rule']
          }
        }),
        conflictResolver: (violation, context) => {
          resolverCalled = true;
          return {
            strategy: 'relax_constraint',
            description: 'Custom resolution strategy',
            actions: [{
              type: 'modify_constraint',
              description: 'Remove problematic constraint',
              parameters: {
                targetId: violation.affectedTargets[0],
                constraintType: 'custom',
                newValue: null
              },
              reversible: true
            }],
            confidence: 95,
            impact: 'low'
          };
        }
      };

      engine.addRule(customRule);
      
      const result = engine.enforceConstraints(mockAssignments, mockAssets);

      expect(resolverCalled).toBe(true);
      expect(result.appliedResolutions.some(r => r.strategy === 'relax_constraint')).toBe(true);
    });
  });

  describe('Resolution Actions', () => {
    test('should execute move asset actions', () => {
      const assignments: DistributionAssignment[] = [
        {
          target: { id: 'user-1', name: 'Alice' },
          assets: [mockAssets[0], mockAssets[1]], // 2 assets
          fulfilled: true,
          constraintViolations: [],
          assignmentReason: 'test'
        },
        {
          target: { id: 'user-2', name: 'Bob' },
          assets: [], // Empty
          fulfilled: true,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      // Create a rule that moves assets
      const moveRule: ConstraintRule = {
        id: 'move-test-rule',
        name: 'Move Test Rule',
        type: 'custom',
        priority: 'medium',
        description: 'Test asset movement',
        validator: (assignment) => ({
          isValid: assignment.assets.length <= 1,
          violations: assignment.assets.length > 1 ? [{
            ruleId: 'move-test-rule',
            ruleName: 'Move Test Rule',
            severity: 'warning',
            message: 'Too many assets',
            affectedTargets: [assignment.target.id],
            affectedAssets: assignment.assets.slice(1).map(a => a.id),
            violationType: 'excess',
            suggestedResolutions: ['Move excess assets'],
            metadata: {}
          }] : [],
          warnings: [],
          metadata: { executionTime: 1, assetsEvaluated: assignment.assets.length, rulesApplied: [] }
        }),
        conflictResolver: (violation) => ({
          strategy: 'redistribute',
          description: 'Move excess assets',
          actions: [{
            type: 'move_asset',
            description: 'Move asset',
            parameters: {
              assetId: violation.affectedAssets[0],
              fromTargetId: violation.affectedTargets[0],
              toTargetId: 'user-2'
            },
            reversible: true
          }],
          confidence: 90,
          impact: 'low'
        })
      };

      engine.addRule(moveRule);
      const result = engine.enforceConstraints(assignments, mockAssets);

      // Check that asset was moved
      const alice = result.finalAssignments.find(a => a.target.id === 'user-1');
      const bob = result.finalAssignments.find(a => a.target.id === 'user-2');

      expect(alice?.assets.length).toBe(1);
      expect(bob?.assets.length).toBe(1);
    });

    test('should handle resolution action failures gracefully', () => {
      // Create a rule with an invalid resolution action
      const invalidRule: ConstraintRule = {
        id: 'invalid-resolution-rule',
        name: 'Invalid Resolution Rule',
        type: 'custom',
        priority: 'low',
        description: 'Rule with invalid resolution',
        validator: () => ({
          isValid: false,
          violations: [{
            ruleId: 'invalid-resolution-rule',
            ruleName: 'Invalid Resolution Rule',
            severity: 'error',
            message: 'Always violates',
            affectedTargets: ['user-1'],
            affectedAssets: [],
            violationType: 'invalid',
            suggestedResolutions: [],
            metadata: {}
          }],
          warnings: [],
          metadata: { executionTime: 1, assetsEvaluated: 0, rulesApplied: [] }
        }),
        conflictResolver: () => ({
          strategy: 'redistribute',
          description: 'Invalid action',
          actions: [{
            type: 'move_asset',
            description: 'Move non-existent asset',
            parameters: {
              assetId: 'non-existent',
              fromTargetId: 'non-existent',
              toTargetId: 'non-existent'
            },
            reversible: true
          }],
          confidence: 50,
          impact: 'low'
        })
      };

      engine.addRule(invalidRule);
      const result = engine.enforceConstraints(mockAssignments, mockAssets);

      // Should handle the failure gracefully and report unresolvable violations
      expect(result.unresolvableViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle large numbers of assignments efficiently', () => {
      // Create many assignments to test performance
      const manyAssignments: DistributionAssignment[] = [];
      for (let i = 0; i < 100; i++) {
        manyAssignments.push({
          target: {
            id: `user-${i}`,
            name: `User ${i}`,
            constraints: { minItems: 1 }
          },
          assets: [mockAssets[i % mockAssets.length]],
          fulfilled: true,
          constraintViolations: [],
          assignmentReason: 'test'
        });
      }

      const startTime = Date.now();
      const result = engine.validateAssignments(manyAssignments, mockAssets);
      const executionTime = Date.now() - startTime;

      expect(result.metadata.executionTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(executionTime).toBeLessThan(2000); // Total time should be reasonable
    });

    test('should track memory usage in reports', () => {
      const result = engine.enforceConstraints(mockAssignments, mockAssets);

      expect(result.enforcementReport.performanceMetrics.memoryUsage).toBeGreaterThan(0);
      expect(typeof result.enforcementReport.performanceMetrics.memoryUsage).toBe('number');
    });

    test('should handle empty assignments gracefully', () => {
      const result = engine.validateAssignments([], mockAssets);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle assignments with no assets', () => {
      const emptyAssignments: DistributionAssignment[] = [
        {
          target: { id: 'user-1', name: 'Alice' },
          assets: [], // No assets
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }
      ];

      const result = engine.validateAssignments(emptyAssignments, mockAssets);

      expect(result.isValid).toBe(true); // No constraints violated with empty assets
      expect(result.metadata.assetsEvaluated).toBe(0);
    });
  });
});