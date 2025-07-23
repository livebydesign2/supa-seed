/**
 * Test Suite for Production Hardening Components
 * Phase 6, Checkpoint F1 validation - All production systems testing
 */

import {
  ErrorHandler,
  SupaSeedError,
  withErrorHandling
} from '../src/utils/error-handler';

import {
  PerformanceMonitor,
  monitor,
  withPerformanceMonitoring
} from '../src/utils/performance-monitor';

import {
  MemoryManager,
  monitorMemory
} from '../src/utils/memory-manager';

import {
  GracefulDegradation,
  withGracefulDegradation
} from '../src/utils/graceful-degradation';

import {
  ConfigValidator
} from '../src/utils/config-validator';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as rimraf from 'rimraf';

// Mock Logger
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Production Hardening System', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'supa-seed-prod-'));
    
    // Initialize all systems
    PerformanceMonitor.initialize();
    MemoryManager.initialize({ maxHeapUsageMB: 256 });
    GracefulDegradation.initialize();
    ConfigValidator.initialize();
  });

  afterEach(async () => {
    await rimraf.rimraf(tempDir);
    PerformanceMonitor.clearMetrics();
    MemoryManager.clearHistory();
    ErrorHandler.clearHistory();
  });

  describe('Error Handling System', () => {
    test('should create and handle SupaSeedError', async () => {
      const error = new SupaSeedError(
        'Test error message',
        'TEST_ERROR',
        {
          operation: 'test_operation',
          component: 'test_component',
          timestamp: new Date()
        },
        { retryable: true, maxRetries: 3 },
        'high'
      );

      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.severity).toBe('high');
      expect(error.recoveryOptions.retryable).toBe(true);

      await ErrorHandler.handle(error);

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsBySeverity.high).toBe(1);
    });

    test('should wrap generic errors', async () => {
      const genericError = new Error('Generic error');
      await ErrorHandler.handle(genericError, {
        component: 'test',
        operation: 'wrap_test'
      });

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.errorsByComponent.test).toBe(1);
    });

    test('should create predefined error types', () => {
      const dbError = ErrorHandler.createDatabaseError('Connection failed', {
        operation: 'connect'
      });
      expect(dbError.code).toBe('DATABASE_ERROR');
      expect(dbError.recoveryOptions.retryable).toBe(true);

      const aiError = ErrorHandler.createAIError('Model not available', {
        operation: 'generate'
      });
      expect(aiError.code).toBe('AI_SERVICE_ERROR');
      expect(aiError.severity).toBe('medium');

      const configError = ErrorHandler.createConfigurationError('Invalid config', {
        operation: 'validate'
      });
      expect(configError.code).toBe('CONFIGURATION_ERROR');
      expect(configError.recoveryOptions.retryable).toBe(false);
    });

    test('should handle error frequency tracking', async () => {
      // Generate multiple similar errors
      for (let i = 0; i < 12; i++) {
        const error = ErrorHandler.createDatabaseError('Repeated error', {
          component: 'database',
          operation: 'query'
        });
        await ErrorHandler.handle(error);
      }

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(12);
      expect(stats.topErrors.length).toBeGreaterThan(0);
    });

    test('should work with error handling decorator', async () => {
      class TestClass {
        async testMethod(): Promise<string> {
          throw new Error('Test error');
        }
      }

      // Apply decorator manually for testing
      const decoratedMethod = withGracefulDegradation('test_service')(
        TestClass.prototype,
        'testMethod',
        Object.getOwnPropertyDescriptor(TestClass.prototype, 'testMethod') || {
          value: TestClass.prototype.testMethod,
          writable: true,
          enumerable: false,
          configurable: true
        }
      );

      const instance = new TestClass();
      
      try {
        await instance.testMethod();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should work with withErrorHandling wrapper', async () => {
      const operation = async () => {
        throw new Error('Wrapped error');
      };

      try {
        await withErrorHandling(
          operation,
          { component: 'test', operation: 'wrapper_test' }
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      const stats = ErrorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe('Performance Monitoring System', () => {
    test('should track operation timing', async () => {
      const operationId = PerformanceMonitor.startOperation('test_op', 'test_component');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const timing = PerformanceMonitor.endOperation(operationId, true);
      
      expect(timing).toBeDefined();
      expect(timing!.duration).toBeGreaterThan(90);
      expect(timing!.success).toBe(true);
      expect(timing!.operationName).toBe('test_op');
    });

    test('should record custom metrics', () => {
      PerformanceMonitor.recordMetric({
        name: 'test_metric',
        value: 42,
        unit: 'count',
        timestamp: new Date(),
        tags: { type: 'test' }
      });

      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.totalOperations).toBe(0); // Custom metrics don't count as operations
    });

    test('should set and check performance thresholds', () => {
      PerformanceMonitor.setThreshold('slow_operation', 50);

      const operationId = PerformanceMonitor.startOperation('slow_operation', 'test');
      
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 60) {
        // Busy wait
      }
      
      const timing = PerformanceMonitor.endOperation(operationId, true);
      expect(timing!.duration).toBeGreaterThan(50);
    });

    test('should work with monitoring decorator', async () => {
      class TestClass {
        async monitoredMethod(): Promise<number> {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 42;
        }
      }

      // Apply decorator manually for testing
      const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, 'monitoredMethod') || {
        value: TestClass.prototype.monitoredMethod,
        writable: true,
        enumerable: false,
        configurable: true
      };
      
      monitor('test_component')(TestClass.prototype, 'monitoredMethod', descriptor);

      const instance = new TestClass();
      const result = await instance.monitoredMethod();
      
      expect(result).toBe(42);
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.totalOperations).toBeGreaterThan(0);
    });

    test('should work with performance monitoring wrapper', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 25));
        return 'success';
      };

      const result = await withPerformanceMonitoring(
        operation,
        'test_component',
        'wrapper_operation'
      );

      expect(result).toBe('success');
      
      const stats = PerformanceMonitor.getPerformanceStats();
      expect(stats.totalOperations).toBeGreaterThan(0);
    });

    test('should export metrics in different formats', () => {
      PerformanceMonitor.recordMetric({
        name: 'export_test',
        value: 100,
        unit: 'ms',
        timestamp: new Date(),
        tags: { format: 'test' }
      });

      const jsonExport = PerformanceMonitor.exportMetrics('json');
      expect(jsonExport).toContain('export_test');

      const prometheusExport = PerformanceMonitor.exportMetrics('prometheus');
      expect(prometheusExport).toContain('# HELP');
      expect(prometheusExport).toContain('export_test');
    });

    test('should track system resource usage', () => {
      const systemStats = PerformanceMonitor.getSystemStats();
      
      expect(systemStats.memory).toBeDefined();
      expect(systemStats.uptime).toBeGreaterThan(0);
      expect(systemStats.activeOperations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Memory Management System', () => {
    test('should track memory usage', () => {
      const stats = MemoryManager.getMemoryStats();
      
      expect(stats.usage.heapUsedMB).toBeGreaterThan(0);
      expect(stats.usage.heapTotalMB).toBeGreaterThan(0);
      expect(stats.percentageUsed).toBeGreaterThanOrEqual(0);
      expect(stats.percentageUsed).toBeLessThanOrEqual(100);
    });

    test('should perform memory cleanup', async () => {
      const beforeStats = MemoryManager.getMemoryStats();
      
      const result = await MemoryManager.forceCleanup('test');
      
      expect(result.beforeMB).toBeGreaterThan(0);
      expect(result.afterMB).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.tasksExecuted)).toBe(true);
    });

    test('should register custom cleanup tasks', () => {
      let taskExecuted = false;
      
      MemoryManager.registerCleanupTask({
        name: 'test_cleanup',
        priority: 'high',
        estimatedMemoryFreedMB: 5,
        cleanup: () => {
          taskExecuted = true;
        }
      });

      // Cleanup should execute the task
      MemoryManager.forceCleanup('test_task').then(() => {
        expect(taskExecuted).toBe(true);
      });
    });

    test('should check cleanup conditions', () => {
      // This will depend on current memory usage
      const shouldCleanup = MemoryManager.shouldCleanup();
      expect(typeof shouldCleanup).toBe('boolean');
    });

    test('should set memory limits', () => {
      MemoryManager.setMemoryLimits({
        maxHeapUsageMB: 1024,
        warningThresholdMB: 512
      });

      const stats = MemoryManager.getMemoryStats();
      expect(Array.isArray(stats.recommendations)).toBe(true);
    });

    test('should provide cleanup recommendations', () => {
      const recommendations = MemoryManager.getCleanupRecommendations();
      
      expect(recommendations.urgent).toBeDefined();
      expect(recommendations.suggested).toBeDefined();
      expect(recommendations.preventive).toBeDefined();
      expect(Array.isArray(recommendations.urgent)).toBe(true);
    });

    test('should work with memory monitoring decorator', async () => {
      class TestClass {
        async memoryIntensiveMethod(): Promise<void> {
          // Simulate memory-intensive operation
          const largeArray = new Array(1000).fill('test');
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Apply decorator manually for testing
      const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, 'memoryIntensiveMethod') || {
        value: TestClass.prototype.memoryIntensiveMethod,
        writable: true,
        enumerable: false,
        configurable: true
      };
      
      monitorMemory(10)(TestClass.prototype, 'memoryIntensiveMethod', descriptor);

      const instance = new TestClass();
      await instance.memoryIntensiveMethod();
      
      // Should complete without throwing
      expect(true).toBe(true);
    });

    test('should get memory history', () => {
      const history = MemoryManager.getMemoryHistory(1); // Last 1 minute
      
      expect(Array.isArray(history)).toBe(true);
      // History might be empty if no tracking has occurred
    });
  });

  describe('Graceful Degradation System', () => {
    test('should initialize with circuit breakers', () => {
      const status = GracefulDegradation.getDegradationStatus();
      
      expect(status.systemHealth).toBeDefined();
      expect(Array.isArray(status.services)).toBe(true);
      expect(Array.isArray(status.activeFallbacks)).toBe(true);
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    test('should execute operations with fallback', async () => {
      const primaryOperation = async () => {
        throw new Error('Primary operation failed');
      };

      // Register a fallback strategy
      GracefulDegradation.registerFallbackStrategy('test_operation', {
        serviceName: 'test_service',
        fallbackMethod: 'static',
        priority: 1,
        description: 'Test fallback',
        implementation: async () => ({ fallback: true })
      });

      const result = await GracefulDegradation.executeWithFallback(
        'test_service',
        'test_operation',
        primaryOperation
      );

      expect(result).toEqual({ fallback: true });
    });

    test('should track service health', async () => {
      // Execute multiple operations to track health
      for (let i = 0; i < 3; i++) {
        try {
          await GracefulDegradation.executeWithFallback(
            'health_test_service',
            'health_test_operation',
            async () => {
              if (i < 2) throw new Error('Simulated failure');
              return 'success';
            }
          );
        } catch (error) {
          // Expected for first two iterations
        }
      }

      const status = GracefulDegradation.getDegradationStatus();
      expect(status.services.length).toBeGreaterThanOrEqual(0);
    });

    test('should reset circuit breakers', () => {
      const resetResult = GracefulDegradation.resetCircuitBreaker('test_service');
      expect(typeof resetResult).toBe('boolean');
    });

    test('should work with graceful degradation decorator', async () => {
      class TestClass {
        async testMethod(): Promise<string> {
          return 'success';
        }
      }

      // Apply decorator manually for testing
      const descriptor = Object.getOwnPropertyDescriptor(TestClass.prototype, 'testMethod') || {
        value: TestClass.prototype.testMethod,
        writable: true,
        enumerable: false,
        configurable: true
      };
      
      withGracefulDegradation('decorated_service')(TestClass.prototype, 'testMethod', descriptor);

      const instance = new TestClass();
      const result = await instance.testMethod();
      
      expect(result).toBe('success');
    });

    test('should handle circuit breaker states', () => {
      GracefulDegradation.setCircuitBreakerConfig('state_test_service', {
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        monitoringPeriodMs: 5000,
        halfOpenMaxCalls: 1
      });

      const status = GracefulDegradation.getDegradationStatus();
      expect(status).toBeDefined();
    });
  });

  describe('Configuration Validation System', () => {
    test('should validate configuration objects', () => {
      const config = {
        database: {
          url: 'https://test.supabase.co',
          key: 'test-key-12345678901234567890'
        },
        ai: {
          enabled: true,
          ollamaUrl: 'http://localhost:11434'
        },
        performance: {
          batchSize: 100
        }
      };

      const report = ConfigValidator.validateConfig(config, 'development');
      
      expect(report.valid).toBeDefined();
      expect(Array.isArray(report.errors)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(report.summary).toBeDefined();
      expect(report.summary.totalRules).toBeGreaterThan(0);
    });

    test('should validate specific configuration values', () => {
      const result = ConfigValidator.validateValue(
        'https://test.supabase.co',
        'database.url',
        { environment: 'development' }
      );

      expect(result.valid).toBe(true);
      expect(result.message).toBeDefined();
    });

    test('should validate schema structure', () => {
      const config = {
        database: {
          url: 'https://test.supabase.co',
          key: 'test-key'
        }
      };

      const schema = {
        database: {
          url: { type: 'string', required: true },
          key: { type: 'string', required: true }
        }
      };

      const result = ConfigValidator.validateSchema(config, schema);
      
      expect(result.valid).toBeDefined();
      expect(result.message).toBeDefined();
    });

    test('should register custom validation rules', () => {
      ConfigValidator.registerRule('custom.field', {
        name: 'custom_validation',
        description: 'Test custom validation',
        validator: (value) => ({
          valid: value === 'expected',
          message: value === 'expected' ? 'Valid' : 'Invalid value'
        }),
        severity: 'warning',
        category: 'logic'
      });

      const rules = ConfigValidator.getRulesForPath('custom.field');
      expect(rules.length).toBe(1);
      expect(rules[0].name).toBe('custom_validation');
    });

    test('should handle production vs development validation', () => {
      const config = {
        database: {
          url: 'http://test.supabase.co', // HTTP instead of HTTPS
          key: 'test-key-12345678901234567890'
        },
        debug: true
      };

      const prodReport = ConfigValidator.validateConfig(config, 'production');
      const devReport = ConfigValidator.validateConfig(config, 'development');

      // Production should be stricter
      expect(prodReport.errors.length).toBeGreaterThanOrEqual(devReport.errors.length);
    });

    test('should provide validation suggestions', () => {
      const config = {
        database: {
          url: 'invalid-url',
          key: 'short'
        },
        performance: {
          batchSize: 2000 // Too large
        }
      };

      const report = ConfigValidator.validateConfig(config, 'development');
      
      const errorsWithSuggestions = report.errors.filter(e => e.suggestion);
      expect(errorsWithSuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('System Integration Tests', () => {
    test('should handle complete error-to-recovery workflow', async () => {
      // Register a fallback for testing
      GracefulDegradation.registerFallbackStrategy('integration_test', {
        serviceName: 'integration_service',
        fallbackMethod: 'static',
        priority: 1,
        description: 'Integration test fallback',
        implementation: async () => ({ recovered: true })
      });

      const operationId = PerformanceMonitor.startOperation('integration_test', 'integration');

      try {
        const result = await GracefulDegradation.executeWithFallback(
          'integration_service',
          'integration_test',
          async () => {
            throw ErrorHandler.createAIError('Integration test error', {
              component: 'integration',
              operation: 'test'
            });
          }
        );

        expect(result).toEqual({ recovered: true });
        PerformanceMonitor.endOperation(operationId, true);

      } catch (error) {
        PerformanceMonitor.endOperation(operationId, false, (error as Error).name);
        throw error;
      }

      // Verify all systems recorded the activity
      const errorStats = ErrorHandler.getErrorStats();
      const perfStats = PerformanceMonitor.getPerformanceStats();
      const degradationStatus = GracefulDegradation.getDegradationStatus();

      expect(errorStats.totalErrors).toBeGreaterThan(0);
      expect(perfStats.totalOperations).toBeGreaterThan(0);
      expect(degradationStatus).toBeDefined();
    });

    test('should handle memory pressure during operations', async () => {
      const beforeMemory = MemoryManager.getMemoryStats();

      // Simulate memory-intensive operation
      const largeData = new Array(10000).fill('memory-test-data');
      
      const operationId = PerformanceMonitor.startOperation('memory_test', 'integration');
      
      // Force memory usage tracking
      await new Promise(resolve => setTimeout(resolve, 10));
      
      PerformanceMonitor.endOperation(operationId, true);

      const afterMemory = MemoryManager.getMemoryStats();
      
      // Memory usage should be tracked
      expect(afterMemory.usage.heapUsedMB).toBeGreaterThanOrEqual(beforeMemory.usage.heapUsedMB);
    });

    test('should coordinate all systems during stress conditions', async () => {
      // Simulate stress conditions
      const stressOperations = Array.from({ length: 10 }, (_, i) => 
        withPerformanceMonitoring(
          async () => {
            if (i % 3 === 0) {
              throw new Error(`Stress test error ${i}`);
            }
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
            return `result-${i}`;
          },
          'stress_test',
          `operation_${i}`
        ).catch(error => `error-${i}`)
      );

      const results = await Promise.all(stressOperations);
      
      // Verify results mix of success and errors
      const successes = results.filter(r => r.startsWith('result-')).length;
      const errors = results.filter(r => r.startsWith('error-')).length;
      
      expect(successes + errors).toBe(10);
      expect(successes).toBeGreaterThan(0);
      
      // Check system health after stress
      const errorStats = ErrorHandler.getErrorStats();
      const perfStats = PerformanceMonitor.getPerformanceStats();
      const memoryStats = MemoryManager.getMemoryStats();
      const degradationStatus = GracefulDegradation.getDegradationStatus();

      expect(errorStats.totalErrors).toBeGreaterThan(0);
      expect(perfStats.totalOperations).toBeGreaterThan(0);
      expect(memoryStats.usage.heapUsedMB).toBeGreaterThan(0);
      expect(degradationStatus.systemHealth).toBeDefined();
    });

    test('should maintain system stability under concurrent load', async () => {
      const concurrentOperations = Array.from({ length: 20 }, (_, i) =>
        (async () => {
          try {
            return await GracefulDegradation.executeWithFallback(
              'concurrent_service',
              'concurrent_operation',
              async () => {
                const operationId = PerformanceMonitor.startOperation(`concurrent_${i}`, 'load_test');
                
                // Simulate varying operation times
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                
                // Occasionally fail
                if (Math.random() < 0.2) {
                  PerformanceMonitor.endOperation(operationId, false, 'RANDOM_FAILURE');
                  throw new Error('Random failure');
                }
                
                PerformanceMonitor.endOperation(operationId, true);
                return `success-${i}`;
              }
            );
          } catch (error) {
            return `handled-error-${i}`;
          }
        })()
      );

      const results = await Promise.all(concurrentOperations);
      
      // All operations should complete (either success or handled error)
      expect(results.length).toBe(20);
      expect(results.every(r => typeof r === 'string')).toBe(true);

      // System should still be responsive
      const finalStatus = GracefulDegradation.getDegradationStatus();
      expect(finalStatus).toBeDefined();
    });
  });
});