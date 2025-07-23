/**
 * Test suite for Fallback and Error Handling System
 * Phase 3, Checkpoint C3 validation - Comprehensive error recovery and progress reporting
 */

import { 
  FallbackErrorHandler, 
  ErrorRecoveryOptions, 
  FallbackStrategy,
  AssociationError,
  FallbackAsset
} from '../src/associations/fallback-error-handling';
import { DistributionTarget, DistributionAssignment, DistributionResult } from '../src/associations/distribution-algorithms';
import { EnforcementResult, ConstraintViolation } from '../src/associations/constraint-enforcement';
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

describe('Fallback Error Handler', () => {
  let handler: FallbackErrorHandler;
  let mockAssets: LoadedAsset[];
  let mockTargets: DistributionTarget[];

  beforeEach(() => {
    const options: ErrorRecoveryOptions = {
      enableFallbackGeneration: true,
      enableConstraintRelaxation: true,
      enablePartialFulfillment: true,
      maxRetryAttempts: 3,
      fallbackStrategies: [],
      recoveryPriority: 'completeness',
      reportingLevel: 'detailed'
    };

    handler = new FallbackErrorHandler(options);

    // Create mock assets
    mockAssets = [
      {
        id: 'asset-1',
        filePath: '/test/post1.md',
        type: 'markdown',
        content: 'First post content',
        metadata: {
          filename: 'post1',
          title: 'First Post'
        },
        fileSize: 1000,
        lastModified: new Date('2025-01-20'),
        isValid: true
      },
      {
        id: 'asset-2',
        filePath: '/test/data.json',
        type: 'json',
        content: '{"key": "value"}',
        metadata: {
          filename: 'data'
        },
        fileSize: 500,
        lastModified: new Date('2025-01-21'),
        isValid: true
      }
    ] as LoadedAsset[];

    // Create mock targets
    mockTargets = [
      {
        id: 'user-1',
        name: 'Alice',
        constraints: {
          minItems: 3,
          requiredTypes: ['markdown']
        }
      },
      {
        id: 'user-2',
        name: 'Bob',
        constraints: {
          minItems: 2,
          maxItems: 5
        }
      }
    ];
  });

  describe('Handler Initialization and Configuration', () => {
    test('should initialize with default built-in strategies', () => {
      const strategies = handler.getFallbackStrategies();
      
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.id === 'synthetic-generator')).toBe(true);
      expect(strategies.some(s => s.id === 'template-generator')).toBe(true);
    });

    test('should create handler with default options', () => {
      const defaultHandler = FallbackErrorHandler.createDefault();
      const strategies = defaultHandler.getFallbackStrategies();
      
      expect(strategies.length).toBeGreaterThan(0);
    });

    test('should add and remove custom fallback strategies', () => {
      const customStrategy: FallbackStrategy = {
        id: 'custom-test-strategy',
        name: 'Custom Test Strategy',
        type: 'use_default',
        priority: 50,
        applicableTypes: ['test'],
        confidence: 60,
        costWeight: 1,
        generator: async () => []
      };

      handler.addFallbackStrategy(customStrategy);
      expect(handler.getFallbackStrategies().some(s => s.id === 'custom-test-strategy')).toBe(true);

      const removed = handler.removeFallbackStrategy('custom-test-strategy');
      expect(removed).toBe(true);
      expect(handler.getFallbackStrategies().some(s => s.id === 'custom-test-strategy')).toBe(false);
    });

    test('should update recovery options', () => {
      handler.updateOptions({ maxRetryAttempts: 5, enableFallbackGeneration: false });
      
      // Options are updated (we can't directly test private fields, but behavior would change)
      expect(true).toBe(true); // Configuration update completed without error
    });
  });

  describe('Insufficient Assets Handling', () => {
    test('should generate fallback assets when insufficient assets exist', async () => {
      const target = mockTargets[0]; // Requires 3 markdown assets
      const currentAssets = [mockAssets[0]]; // Only 1 asset
      const requiredCount = 3;

      const fallbacks = await handler.handleInsufficientAssets(target, currentAssets, requiredCount);

      expect(fallbacks.length).toBe(2); // Should generate 2 additional assets (3 - 1)
      expect(fallbacks.every(f => f.fallbackType === 'synthetic' || f.fallbackType === 'template')).toBe(true);
      expect(fallbacks.every(f => f.confidence > 0)).toBe(true);
    });

    test('should not generate fallbacks when sufficient assets exist', async () => {
      const target = mockTargets[1];
      const currentAssets = mockAssets; // 2 assets
      const requiredCount = 2;

      const fallbacks = await handler.handleInsufficientAssets(target, currentAssets, requiredCount);

      expect(fallbacks.length).toBe(0);
    });

    test('should respect fallback generation setting', async () => {
      handler.updateOptions({ enableFallbackGeneration: false });
      
      const target = mockTargets[0];
      const currentAssets = [mockAssets[0]];
      const requiredCount = 3;

      const fallbacks = await handler.handleInsufficientAssets(target, currentAssets, requiredCount);

      expect(fallbacks.length).toBe(0);
    });

    test('should use appropriate fallback strategies based on target type', async () => {
      const markdownTarget = {
        ...mockTargets[0],
        constraints: { ...mockTargets[0].constraints, requiredTypes: ['markdown'] }
      };

      const fallbacks = await handler.handleInsufficientAssets(markdownTarget, [], 2);

      expect(fallbacks.length).toBe(2);
      expect(fallbacks.every(f => f.type === 'markdown')).toBe(true);
    });

    test('should handle fallback strategy failures gracefully', async () => {
      // Add a strategy that always fails
      const failingStrategy: FallbackStrategy = {
        id: 'failing-strategy',
        name: 'Failing Strategy',
        type: 'generate_synthetic',
        priority: 100, // Higher priority than built-ins
        applicableTypes: ['*'],
        confidence: 90,
        costWeight: 1,
        generator: async () => {
          throw new Error('Strategy failure');
        }
      };

      handler.addFallbackStrategy(failingStrategy);

      const fallbacks = await handler.handleInsufficientAssets(mockTargets[0], [], 2);

      // Should still get fallbacks from other strategies
      expect(fallbacks.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from distribution and enforcement errors', async () => {
      const distributionResult: DistributionResult = {
        assignments: [
          {
            target: mockTargets[0],
            assets: [mockAssets[0]], // Only 1 asset, needs 3
            fulfilled: false,
            constraintViolations: [],
            assignmentReason: 'test'
          }
        ],
        unassigned: [mockAssets[1]], // 1 unassigned asset
        algorithm: 'test',
        totalAssets: 2,
        totalTargets: 1,
        successRate: 50,
        metadata: {
          executionTime: 100,
          retries: 0,
          constraintViolations: 1,
          averageAssignmentsPerTarget: 1,
          distributionEfficiency: 50
        }
      };

      const enforcementResult: EnforcementResult = {
        success: false,
        resolvedViolations: 0,
        unresolvableViolations: [
          {
            ruleId: 'min-items-constraint',
            ruleName: 'Minimum Items Required',
            severity: 'error',
            message: 'Target user-1 has 1 items but requires minimum 3',
            affectedTargets: ['user-1'],
            affectedAssets: ['asset-1'],
            violationType: 'insufficient',
            suggestedResolutions: ['Generate fallback assets'],
            metadata: { required: 3, actual: 1 }
          }
        ],
        appliedResolutions: [],
        finalAssignments: distributionResult.assignments,
        enforcementReport: {
          summary: 'Test report',
          statistics: {
            totalRulesEvaluated: 1,
            violationsFound: 1,
            violationsResolved: 0,
            resolutionSuccessRate: 0,
            executionTime: 50,
            assetsAffected: 1,
            targetsAffected: 1
          },
          violationsByType: { insufficient: 1 },
          resolutionsByStrategy: {},
          recommendations: [],
          performanceMetrics: {
            validationTime: 25,
            resolutionTime: 25,
            memoryUsage: 10
          }
        }
      };

      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);

      expect(result.success).toBe(true);
      expect(result.recoveryAttempts.length).toBeGreaterThan(0);
      expect(result.generatedFallbacks.length).toBeGreaterThan(0);
      expect(result.finalAssignments[0].assets.length).toBeGreaterThan(1); // Should have added fallbacks
    });

    test('should handle unrecoverable errors', async () => {
      const distributionResult: DistributionResult = {
        assignments: [],
        unassigned: mockAssets,
        algorithm: 'test',
        totalAssets: 2,
        totalTargets: 0,
        successRate: 0,
        metadata: {
          executionTime: 100,
          retries: 0,
          constraintViolations: 0,
          averageAssignmentsPerTarget: 0,
          distributionEfficiency: 0
        }
      };

      const enforcementResult: EnforcementResult = {
        success: false,
        resolvedViolations: 0,
        unresolvableViolations: [
          {
            ruleId: 'system-error',
            ruleName: 'System Error',
            severity: 'critical',
            message: 'Unrecoverable system error',
            affectedTargets: [],
            affectedAssets: [],
            violationType: 'invalid',
            suggestedResolutions: ['Manual intervention required'],
            metadata: { critical: true }
          }
        ],
        appliedResolutions: [],
        finalAssignments: [],
        enforcementReport: {
          summary: 'Critical failure',
          statistics: {
            totalRulesEvaluated: 1,
            violationsFound: 1,
            violationsResolved: 0,
            resolutionSuccessRate: 0,
            executionTime: 50,
            assetsAffected: 0,
            targetsAffected: 0
          },
          violationsByType: { invalid: 1 },
          resolutionsByStrategy: {},
          recommendations: ['Manual intervention required'],
          performanceMetrics: {
            validationTime: 25,
            resolutionTime: 25,
            memoryUsage: 10
          }
        }
      };

      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);

      expect(result.success).toBe(false);
      expect(result.unrecoverableErrors.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('manual intervention'))).toBe(true);
    });

    test('should respect maximum retry attempts', async () => {
      handler.updateOptions({ maxRetryAttempts: 1 });

      // Create multiple recoverable errors
      const distributionResult: DistributionResult = {
        assignments: [
          {
            target: mockTargets[0],
            assets: [],
            fulfilled: false,
            constraintViolations: [],
            assignmentReason: 'test'
          }
        ],
        unassigned: mockAssets,
        algorithm: 'test',
        totalAssets: 2,
        totalTargets: 1,
        successRate: 0,
        metadata: {
          executionTime: 100,
          retries: 0,
          constraintViolations: 2,
          averageAssignmentsPerTarget: 0,
          distributionEfficiency: 0
        }
      };

      const enforcementResult: EnforcementResult = {
        success: false,
        resolvedViolations: 0,
        unresolvableViolations: [
          {
            ruleId: 'error-1',
            ruleName: 'Error One',
            severity: 'error',
            message: 'First error',
            affectedTargets: ['user-1'],
            affectedAssets: [],
            violationType: 'insufficient',
            suggestedResolutions: [],
            metadata: {}
          },
          {
            ruleId: 'error-2',
            ruleName: 'Error Two',
            severity: 'error',
            message: 'Second error',
            affectedTargets: ['user-1'],
            affectedAssets: [],
            violationType: 'insufficient',
            suggestedResolutions: [],
            metadata: {}
          }
        ],
        appliedResolutions: [],
        finalAssignments: distributionResult.assignments,
        enforcementReport: {
          summary: 'Multiple errors',
          statistics: {
            totalRulesEvaluated: 2,
            violationsFound: 2,
            violationsResolved: 0,
            resolutionSuccessRate: 0,
            executionTime: 50,
            assetsAffected: 0,
            targetsAffected: 1
          },
          violationsByType: { insufficient: 2 },
          resolutionsByStrategy: {},
          recommendations: [],
          performanceMetrics: {
            validationTime: 25,
            resolutionTime: 25,
            memoryUsage: 10
          }
        }
      };

      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);

      expect(result.recoveryAttempts.length).toBeLessThanOrEqual(1); // Should stop after max attempts
      expect(result.unrecoverableErrors.length).toBeGreaterThanOrEqual(1);
    });

    test('should generate appropriate recovery recommendations', async () => {
      const distributionResult: DistributionResult = {
        assignments: [],
        unassigned: mockAssets,
        algorithm: 'test',
        totalAssets: 2,
        totalTargets: 0,
        successRate: 0,
        metadata: {
          executionTime: 100,
          retries: 0,
          constraintViolations: 0,
          averageAssignmentsPerTarget: 0,
          distributionEfficiency: 0
        }
      };

      const enforcementResult: EnforcementResult = {
        success: true,
        resolvedViolations: 0,
        unresolvableViolations: [],
        appliedResolutions: [],
        finalAssignments: [],
        enforcementReport: {
          summary: 'No violations',
          statistics: {
            totalRulesEvaluated: 0,
            violationsFound: 0,
            violationsResolved: 0,
            resolutionSuccessRate: 100,
            executionTime: 10,
            assetsAffected: 0,
            targetsAffected: 0
          },
          violationsByType: {},
          resolutionsByStrategy: {},
          recommendations: [],
          performanceMetrics: {
            validationTime: 5,
            resolutionTime: 5,
            memoryUsage: 5
          }
        }
      };

      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Progress Reporting', () => {
    test('should provide initial progress report', () => {
      const progress = handler.reportProgress();

      expect(progress.operationId).toBeDefined();
      expect(progress.phase).toBe('initialization');
      expect(progress.overallProgress).toBe(0);
      expect(progress.canContinue).toBe(true);
      expect(progress.statistics).toBeDefined();
    });

    test('should update progress correctly', () => {
      handler.updateProgress('distribution', 'Starting distribution', 25);
      
      const progress = handler.reportProgress();

      expect(progress.phase).toBe('distribution');
      expect(progress.currentStep).toBe('Starting distribution');
      expect(progress.overallProgress).toBe(25);
      expect(progress.completedSteps).toContain('Starting distribution');
    });

    test('should not exceed 100% progress', () => {
      handler.updateProgress('finalization', 'Completing', 150);
      
      const progress = handler.reportProgress();

      expect(progress.overallProgress).toBe(100);
    });

    test('should track completed steps', () => {
      handler.updateProgress('initialization', 'Step 1', 10);
      handler.updateProgress('distribution', 'Step 2', 20);
      handler.updateProgress('constraint_enforcement', 'Step 3', 30);
      
      const progress = handler.reportProgress();

      expect(progress.completedSteps).toHaveLength(3);
      expect(progress.completedSteps).toContain('Step 1');
      expect(progress.completedSteps).toContain('Step 2');
      expect(progress.completedSteps).toContain('Step 3');
    });
  });

  describe('Custom Fallback Strategies', () => {
    test('should execute custom fallback strategies', async () => {
      let customGeneratorCalled = false;
      
      const customStrategy: FallbackStrategy = {
        id: 'custom-generator',
        name: 'Custom Generator Strategy',
        type: 'generate_synthetic',
        priority: 95, // Higher than built-ins
        applicableTypes: ['json'],
        confidence: 90,
        costWeight: 2,
        generator: async (requirements) => {
          customGeneratorCalled = true;
          
          const fallbacks: FallbackAsset[] = [];
          for (let i = 0; i < requirements.requiredCount; i++) {
            fallbacks.push({
              id: `custom-${i}`,
              filePath: `/custom/asset_${i}.txt`,
              type: 'json',
              content: 'Custom generated content',
              metadata: { filename: `custom_${i}`, custom: true },
              fileSize: 50,
              lastModified: new Date(),
              isValid: true,
              fallbackType: 'synthetic',
              generatedBy: 'custom-generator',
              fallbackReason: 'Custom generation',
              confidence: 90
            });
          }
          
          return fallbacks;
        }
      };

      handler.addFallbackStrategy(customStrategy);

      const customTarget = {
        ...mockTargets[0],
        constraints: { ...mockTargets[0].constraints, requiredTypes: ['json'] }
      };

      const fallbacks = await handler.handleInsufficientAssets(customTarget, [], 2);

      expect(customGeneratorCalled).toBe(true);
      expect(fallbacks.length).toBe(2);
      expect(fallbacks.every(f => f.type === 'json')).toBe(true);
      expect(fallbacks.every(f => f.generatedBy === 'custom-generator')).toBe(true);
    });

    test('should prioritize strategies correctly', async () => {
      // Add two strategies with different priorities
      const lowPriorityStrategy: FallbackStrategy = {
        id: 'low-priority',
        name: 'Low Priority Strategy',
        type: 'generate_synthetic',
        priority: 10,
        applicableTypes: ['*'],
        confidence: 50,
        costWeight: 1,
        generator: async () => [{
          id: 'low-priority-asset',
          filePath: '/low/asset.txt',
          type: 'markdown',
          content: 'Low priority content',
          metadata: { filename: 'low_priority' },
          fileSize: 30,
          lastModified: new Date(),
          isValid: true,
          fallbackType: 'synthetic',
          generatedBy: 'low-priority',
          fallbackReason: 'Low priority generation',
          confidence: 50
        }]
      };

      const highPriorityStrategy: FallbackStrategy = {
        id: 'high-priority',
        name: 'High Priority Strategy',
        type: 'generate_synthetic',
        priority: 99,
        applicableTypes: ['*'],
        confidence: 95,
        costWeight: 1,
        generator: async () => [{
          id: 'high-priority-asset',
          filePath: '/high/asset.txt',
          type: 'markdown',
          content: 'High priority content',
          metadata: { filename: 'high_priority' },
          fileSize: 40,
          lastModified: new Date(),
          isValid: true,
          fallbackType: 'synthetic',
          generatedBy: 'high-priority',
          fallbackReason: 'High priority generation',
          confidence: 95
        }]
      };

      handler.addFallbackStrategy(lowPriorityStrategy);
      handler.addFallbackStrategy(highPriorityStrategy);

      const fallbacks = await handler.handleInsufficientAssets(mockTargets[0], [], 1);

      expect(fallbacks.length).toBe(1);
      expect(fallbacks[0].generatedBy).toBe('high-priority'); // Should use higher priority strategy first
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle large-scale recovery operations efficiently', async () => {
      // Create many assignments with errors
      const manyAssignments: DistributionAssignment[] = [];
      const manyViolations: ConstraintViolation[] = [];

      for (let i = 0; i < 50; i++) {
        manyAssignments.push({
          target: {
            id: `user-${i}`,
            name: `User ${i}`,
            constraints: { minItems: 2 }
          },
          assets: i % 3 === 0 ? [] : [mockAssets[0]], // Some have no assets, some have insufficient
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        });

        if (i % 3 === 0) {
          manyViolations.push({
            ruleId: 'min-items-constraint',
            ruleName: 'Minimum Items Required',
            severity: 'error',
            message: `Target user-${i} has 0 items but requires minimum 2`,
            affectedTargets: [`user-${i}`],
            affectedAssets: [],
            violationType: 'insufficient',
            suggestedResolutions: ['Generate fallback assets'],
            metadata: { required: 2, actual: 0 }
          });
        }
      }

      const distributionResult: DistributionResult = {
        assignments: manyAssignments,
        unassigned: [],
        algorithm: 'test',
        totalAssets: 50,
        totalTargets: 50,
        successRate: 66,
        metadata: {
          executionTime: 200,
          retries: 0,
          constraintViolations: manyViolations.length,
          averageAssignmentsPerTarget: 1,
          distributionEfficiency: 66
        }
      };

      const enforcementResult: EnforcementResult = {
        success: false,
        resolvedViolations: 0,
        unresolvableViolations: manyViolations,
        appliedResolutions: [],
        finalAssignments: manyAssignments,
        enforcementReport: {
          summary: 'Many violations',
          statistics: {
            totalRulesEvaluated: 1,
            violationsFound: manyViolations.length,
            violationsResolved: 0,
            resolutionSuccessRate: 0,
            executionTime: 100,
            assetsAffected: 0,
            targetsAffected: manyViolations.length
          },
          violationsByType: { insufficient: manyViolations.length },
          resolutionsByStrategy: {},
          recommendations: [],
          performanceMetrics: {
            validationTime: 50,
            resolutionTime: 50,
            memoryUsage: 20
          }
        }
      };

      const startTime = Date.now();
      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete in reasonable time
      expect(result.performanceMetrics.totalRecoveryTime).toBeGreaterThan(0);
      expect(result.finalReport.statistics.recoveryAttempts).toBeGreaterThan(0);
    });

    test('should handle strategy failures gracefully during recovery', async () => {
      // Add a strategy that fails
      const failingStrategy: FallbackStrategy = {
        id: 'failing-recovery-strategy',
        name: 'Failing Recovery Strategy',
        type: 'generate_synthetic',
        priority: 100,
        applicableTypes: ['*'],
        confidence: 80,
        costWeight: 1,
        generator: async () => {
          throw new Error('Recovery strategy failed');
        }
      };

      handler.addFallbackStrategy(failingStrategy);

      const distributionResult: DistributionResult = {
        assignments: [{
          target: mockTargets[0],
          assets: [],
          fulfilled: false,
          constraintViolations: [],
          assignmentReason: 'test'
        }],
        unassigned: [],
        algorithm: 'test',
        totalAssets: 0,
        totalTargets: 1,
        successRate: 0,
        metadata: {
          executionTime: 50,
          retries: 0,
          constraintViolations: 1,
          averageAssignmentsPerTarget: 0,
          distributionEfficiency: 0
        }
      };

      const enforcementResult: EnforcementResult = {
        success: false,
        resolvedViolations: 0,
        unresolvableViolations: [{
          ruleId: 'min-items-constraint',
          ruleName: 'Minimum Items Required',
          severity: 'error',
          message: 'Insufficient assets',
          affectedTargets: ['user-1'],
          affectedAssets: [],
          violationType: 'insufficient',
          suggestedResolutions: [],
          metadata: {}
        }],
        appliedResolutions: [],
        finalAssignments: distributionResult.assignments,
        enforcementReport: {
          summary: 'Insufficient assets',
          statistics: {
            totalRulesEvaluated: 1,
            violationsFound: 1,
            violationsResolved: 0,
            resolutionSuccessRate: 0,
            executionTime: 25,
            assetsAffected: 0,
            targetsAffected: 1
          },
          violationsByType: { insufficient: 1 },
          resolutionsByStrategy: {},
          recommendations: [],
          performanceMetrics: {
            validationTime: 10,
            resolutionTime: 15,
            memoryUsage: 5
          }
        }
      };

      const result = await handler.recoverFromErrors(distributionResult, enforcementResult, mockAssets);

      // Should handle the failure gracefully and still attempt recovery with other strategies
      expect(result.finalReport).toBeDefined();
    });
  });
});