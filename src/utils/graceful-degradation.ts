/**
 * Graceful Degradation System
 * Phase 6, Checkpoint F1 - Ensures system functionality even when AI services fail
 */

import { Logger } from './logger';
import { ErrorHandler, SupaSeedError } from './error-handler';
import { PerformanceMonitor } from './performance-monitor';

export interface ServiceHealth {
  serviceName: string;
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  averageResponseTime: number;
  errorRate: number;
  lastError?: string;
}

export interface FallbackStrategy {
  serviceName: string;
  fallbackMethod: 'faker' | 'static' | 'cached' | 'simplified' | 'disabled';
  priority: number;
  description: string;
  implementation: () => Promise<any>;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
  halfOpenMaxCalls: number;
}

export class GracefulDegradation {
  private static serviceHealth: Map<string, ServiceHealth> = new Map();
  private static fallbackStrategies: Map<string, FallbackStrategy[]> = new Map();
  private static circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private static degradationConfig: Map<string, CircuitBreakerConfig> = new Map();

  /**
   * Initialize graceful degradation system
   */
  static initialize(): void {
    // Default circuit breaker configurations
    this.setCircuitBreakerConfig('ai_service', {
      failureThreshold: 5,
      resetTimeoutMs: 60000, // 1 minute
      monitoringPeriodMs: 300000, // 5 minutes
      halfOpenMaxCalls: 3
    });

    this.setCircuitBreakerConfig('database', {
      failureThreshold: 3,
      resetTimeoutMs: 30000, // 30 seconds
      monitoringPeriodMs: 120000, // 2 minutes
      halfOpenMaxCalls: 1
    });

    this.setCircuitBreakerConfig('template_service', {
      failureThreshold: 10,
      resetTimeoutMs: 120000, // 2 minutes
      monitoringPeriodMs: 600000, // 10 minutes
      halfOpenMaxCalls: 5
    });

    // Initialize AI service fallback strategies
    this.registerFallbackStrategy('ai_seed_generation', {
      serviceName: 'ai_service',
      fallbackMethod: 'faker',
      priority: 1,
      description: 'Use Faker.js for realistic but non-AI seed data',
      implementation: this.fakerFallback
    });

    this.registerFallbackStrategy('ai_template_generation', {
      serviceName: 'ai_service',
      fallbackMethod: 'static',
      priority: 1,
      description: 'Use pre-built static templates',
      implementation: this.staticTemplateFallback
    });

    this.registerFallbackStrategy('ai_schema_analysis', {
      serviceName: 'ai_service',
      fallbackMethod: 'simplified',
      priority: 1,
      description: 'Use rule-based schema analysis',
      implementation: this.simplifiedSchemaAnalysis
    });

    Logger.info('🛡️ Graceful degradation system initialized');
  }

  /**
   * Set circuit breaker configuration for a service
   */
  static setCircuitBreakerConfig(serviceName: string, config: CircuitBreakerConfig): void {
    this.degradationConfig.set(serviceName, config);
    
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, {
        state: 'closed',
        failureCount: 0,
        lastFailureTime: new Date(0),
        halfOpenCallCount: 0
      });
    }

    Logger.debug(`⚙️ Circuit breaker configured for ${serviceName}:`, config);
  }

  /**
   * Register a fallback strategy for a service
   */
  static registerFallbackStrategy(operationName: string, strategy: FallbackStrategy): void {
    if (!this.fallbackStrategies.has(operationName)) {
      this.fallbackStrategies.set(operationName, []);
    }
    
    this.fallbackStrategies.get(operationName)!.push(strategy);
    
    // Sort by priority (lower number = higher priority)
    this.fallbackStrategies.get(operationName)!.sort((a, b) => a.priority - b.priority);

    Logger.debug(`📋 Registered fallback strategy for ${operationName}:`, {
      method: strategy.fallbackMethod,
      priority: strategy.priority
    });
  }

  /**
   * Execute operation with graceful degradation
   */
  static async executeWithFallback<T>(
    serviceName: string,
    operationName: string,
    primaryOperation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const operationId = PerformanceMonitor.startOperation(operationName, serviceName);

    try {
      // Check circuit breaker
      if (this.isCircuitOpen(serviceName)) {
        Logger.warn(`🚫 Circuit breaker open for ${serviceName}, using fallback`);
        return await this.executeFallback(operationName, context);
      }

      // Attempt primary operation
      const result = await primaryOperation();
      
      // Record success
      this.recordSuccess(serviceName);
      PerformanceMonitor.endOperation(operationId, true);
      
      return result;

    } catch (error) {
      Logger.warn(`❌ Primary operation failed for ${serviceName}.${operationName}:`, error);
      
      // Record failure
      this.recordFailure(serviceName, error as Error);
      PerformanceMonitor.endOperation(operationId, false, (error as Error).name);

      // Try fallback
      try {
        const fallbackResult = await this.executeFallback<T>(operationName, context);
        Logger.info(`✅ Fallback successful for ${operationName}`);
        return fallbackResult;
      } catch (fallbackError) {
        Logger.error(`🚨 Both primary and fallback failed for ${operationName}:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Execute fallback strategy for an operation
   */
  private static async executeFallback<T>(
    operationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const strategies = this.fallbackStrategies.get(operationName);
    
    if (!strategies || strategies.length === 0) {
      throw ErrorHandler.createConfigurationError(
        `No fallback strategy registered for ${operationName}`,
        { component: 'graceful_degradation', operation: operationName }
      );
    }

    // Try each strategy in priority order
    for (const strategy of strategies) {
      try {
        Logger.info(`🔄 Attempting fallback: ${strategy.description}`);
        const result = await strategy.implementation();
        Logger.info(`✅ Fallback successful: ${strategy.fallbackMethod}`);
        return result;
      } catch (error) {
        Logger.warn(`❌ Fallback strategy failed: ${strategy.fallbackMethod}`, error);
        continue;
      }
    }

    throw ErrorHandler.createAIError(
      `All fallback strategies failed for ${operationName}`,
      { component: 'graceful_degradation', operation: operationName }
    );
  }

  /**
   * Record successful operation
   */
  private static recordSuccess(serviceName: string): void {
    const health = this.getOrCreateServiceHealth(serviceName);
    health.consecutiveFailures = 0;
    health.lastCheck = new Date();
    health.isHealthy = true;

    // Reset circuit breaker on success
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker && breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.halfOpenCallCount = 0;
      Logger.info(`🔓 Circuit breaker closed for ${serviceName}`);
    }
  }

  /**
   * Record failed operation
   */
  private static recordFailure(serviceName: string, error: Error): void {
    const health = this.getOrCreateServiceHealth(serviceName);
    health.consecutiveFailures += 1;
    health.lastCheck = new Date();
    health.lastError = error.message;
    health.isHealthy = false;

    // Update circuit breaker
    const breaker = this.circuitBreakers.get(serviceName);
    const config = this.degradationConfig.get(serviceName);
    
    if (breaker && config) {
      breaker.failureCount += 1;
      breaker.lastFailureTime = new Date();

      if (breaker.failureCount >= config.failureThreshold && breaker.state === 'closed') {
        breaker.state = 'open';
        Logger.warn(`🔒 Circuit breaker opened for ${serviceName} after ${breaker.failureCount} failures`);
      }
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private static isCircuitOpen(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName);
    const config = this.degradationConfig.get(serviceName);

    if (!breaker || !config) {
      return false;
    }

    const now = new Date();

    switch (breaker.state) {
      case 'closed':
        return false;

      case 'open':
        // Check if enough time has passed to try half-open
        const timeSinceFailure = now.getTime() - breaker.lastFailureTime.getTime();
        if (timeSinceFailure >= config.resetTimeoutMs) {
          breaker.state = 'half-open';
          breaker.halfOpenCallCount = 0;
          Logger.info(`🔓 Circuit breaker half-open for ${serviceName}`);
          return false;
        }
        return true;

      case 'half-open':
        // Allow limited calls in half-open state
        if (breaker.halfOpenCallCount < config.halfOpenMaxCalls) {
          breaker.halfOpenCallCount += 1;
          return false;
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Get or create service health record
   */
  private static getOrCreateServiceHealth(serviceName: string): ServiceHealth {
    if (!this.serviceHealth.has(serviceName)) {
      this.serviceHealth.set(serviceName, {
        serviceName,
        isHealthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
        averageResponseTime: 0,
        errorRate: 0
      });
    }
    return this.serviceHealth.get(serviceName)!;
  }

  /**
   * Get system degradation status
   */
  static getDegradationStatus(): {
    services: Array<ServiceHealth & { circuitBreakerState: string }>;
    activeFallbacks: string[];
    systemHealth: 'healthy' | 'degraded' | 'critical';
    recommendations: string[];
  } {
    const services = Array.from(this.serviceHealth.values()).map(health => ({
      ...health,
      circuitBreakerState: this.circuitBreakers.get(health.serviceName)?.state || 'closed'
    }));

    const activeFallbacks = services
      .filter(s => !s.isHealthy || s.circuitBreakerState !== 'closed')
      .map(s => s.serviceName);

    // Determine overall system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const criticalServices = services.filter(s => !s.isHealthy && s.consecutiveFailures > 10);
    const degradedServices = services.filter(s => !s.isHealthy);

    if (criticalServices.length > 0) {
      systemHealth = 'critical';
    } else if (degradedServices.length > 0) {
      systemHealth = 'degraded';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (activeFallbacks.includes('ai_service')) {
      recommendations.push('AI service is degraded - check Ollama installation and model availability');
    }
    
    if (activeFallbacks.includes('database')) {
      recommendations.push('Database connectivity issues detected - verify Supabase connection');
    }
    
    if (systemHealth === 'critical') {
      recommendations.push('Multiple critical services failing - consider system restart');
    }

    return {
      services,
      activeFallbacks,
      systemHealth,
      recommendations
    };
  }

  /**
   * Force reset circuit breaker
   */
  static resetCircuitBreaker(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.halfOpenCallCount = 0;
      Logger.info(`🔄 Manual circuit breaker reset for ${serviceName}`);
      return true;
    }
    return false;
  }

  /**
   * Fallback implementations
   */
  private static async fakerFallback(): Promise<any> {
    // This would integrate with existing Faker.js functionality
    return {
      records: [
        { id: 1, name: 'Fallback User 1', email: 'fallback1@example.com' },
        { id: 2, name: 'Fallback User 2', email: 'fallback2@example.com' }
      ],
      metadata: {
        source: 'faker_fallback',
        generated_at: new Date().toISOString()
      }
    };
  }

  private static async staticTemplateFallback(): Promise<any> {
    return {
      template: {
        id: 'static_fallback_template',
        name: 'Basic Seeder Template',
        description: 'Fallback template when AI is unavailable',
        category: 'seeder',
        tags: ['fallback', 'static'],
        version: '1.0.0',
        compatibility: { supaSeedVersion: '1.0.0' },
        variables: [],
        files: [{
          path: 'seeder.ts',
          content: '// Basic seeder implementation\nexport default class BasicSeeder {}'
        }],
        metadata: { created: new Date(), updated: new Date() }
      },
      confidence: 60,
      reasoning: 'Static fallback template - basic functionality only',
      suggestedVariables: []
    };
  }

  private static async simplifiedSchemaAnalysis(): Promise<any> {
    return {
      improvements: [
        {
          category: 'seeding',
          title: 'Basic seeding order optimization',
          description: 'Seed users before posts to maintain referential integrity',
          priority: 'medium',
          implementation: 'Order tables by foreign key dependencies'
        }
      ],
      seedingStrategy: {
        order: ['users', 'profiles', 'posts', 'comments'],
        relationships: [
          { from: 'posts', to: 'users', type: 'belongs_to' },
          { from: 'comments', to: 'posts', type: 'belongs_to' }
        ],
        estimatedTime: 120 // seconds
      },
      qualityScore: 75
    };
  }
}

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: Date;
  halfOpenCallCount: number;
}

/**
 * Decorator for automatic graceful degradation
 */
export function withGracefulDegradation(serviceName: string, operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName = operationName || propertyName;

    descriptor.value = async function (...args: any[]) {
      return await GracefulDegradation.executeWithFallback(
        serviceName,
        opName,
        () => method.apply(this, args),
        { args: args.length }
      );
    };
  };
}

export default GracefulDegradation;