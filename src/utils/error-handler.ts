/**
 * Production Error Handling System
 * Phase 6, Checkpoint F1 - Comprehensive error handling with logging and recovery
 */

import { Logger } from './logger';

export interface ErrorContext {
  operation: string;
  component: string;
  userId?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  timestamp: Date;
}

export interface ErrorRecoveryOptions {
  retryable: boolean;
  maxRetries?: number;
  fallbackStrategy?: 'graceful' | 'fail-fast' | 'silent';
  userMessage?: string;
  technicalMessage?: string;
}

export class SupaSeedError extends Error {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly recoveryOptions: ErrorRecoveryOptions;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    message: string,
    code: string,
    context: ErrorContext,
    recoveryOptions: ErrorRecoveryOptions = { retryable: false },
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'SupaSeedError';
    this.code = code;
    this.context = context;
    this.recoveryOptions = recoveryOptions;
    this.severity = severity;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupaSeedError);
    }
    this.context.stackTrace = this.stack;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      recoveryOptions: this.recoveryOptions,
      severity: this.severity,
      stack: this.stack
    };
  }
}

export class ErrorHandler {
  private static errorCounts: Map<string, number> = new Map();
  private static errorHistory: Array<{ error: SupaSeedError; handled: Date }> = [];
  private static readonly MAX_HISTORY = 1000;

  /**
   * Handle an error with comprehensive logging and recovery
   */
  static async handle(error: Error | SupaSeedError, context?: Partial<ErrorContext>): Promise<void> {
    const supaSeedError = error instanceof SupaSeedError 
      ? error 
      : this.wrapError(error, context);

    // Log the error
    this.logError(supaSeedError);

    // Track error frequency
    this.trackErrorFrequency(supaSeedError);

    // Add to history
    this.addToHistory(supaSeedError);

    // Attempt recovery if specified
    if (supaSeedError.recoveryOptions.retryable) {
      await this.attemptRecovery(supaSeedError);
    }

    // Notify monitoring systems
    this.notifyMonitoring(supaSeedError);
  }

  /**
   * Wrap a generic error in SupaSeedError
   */
  private static wrapError(error: Error, context?: Partial<ErrorContext>): SupaSeedError {
    const errorContext: ErrorContext = {
      operation: context?.operation || 'unknown',
      component: context?.component || 'unknown',
      userId: context?.userId,
      metadata: context?.metadata || {},
      timestamp: new Date(),
      stackTrace: error.stack
    };

    return new SupaSeedError(
      error.message,
      'WRAPPED_ERROR',
      errorContext,
      { retryable: false },
      'medium'
    );
  }

  /**
   * Log error with appropriate severity
   */
  private static logError(error: SupaSeedError): void {
    const logData = {
      code: error.code,
      message: error.message,
      component: error.context.component,
      operation: error.context.operation,
      severity: error.severity,
      metadata: error.context.metadata,
      userId: error.context.userId
    };

    switch (error.severity) {
      case 'critical':
        Logger.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'high':
        Logger.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case 'medium':
        Logger.warn('⚠️ ERROR:', logData);
        break;
      case 'low':
        Logger.info('ℹ️ Minor issue:', logData);
        break;
    }
  }

  /**
   * Track error frequency for pattern detection
   */
  private static trackErrorFrequency(error: SupaSeedError): void {
    const key = `${error.code}:${error.context.component}:${error.context.operation}`;
    const current = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, current + 1);

    // Alert on high frequency errors
    if (current + 1 >= 10) {
      Logger.error('🔄 High frequency error detected:', {
        errorPattern: key,
        occurrences: current + 1,
        recommendation: 'Consider implementing circuit breaker or permanent fix'
      });
    }
  }

  /**
   * Add error to history for analysis
   */
  private static addToHistory(error: SupaSeedError): void {
    this.errorHistory.push({
      error,
      handled: new Date()
    });

    // Maintain history size
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift();
    }
  }

  /**
   * Attempt error recovery based on options
   */
  private static async attemptRecovery(error: SupaSeedError): Promise<void> {
    Logger.info('🔄 Attempting error recovery:', {
      code: error.code,
      strategy: error.recoveryOptions.fallbackStrategy
    });

    // Implementation would depend on specific recovery strategies
    // For now, just log the attempt
  }

  /**
   * Notify external monitoring systems
   */
  private static notifyMonitoring(error: SupaSeedError): void {
    // This would integrate with monitoring services like Sentry, DataDog, etc.
    // For now, we'll simulate with logging
    if (error.severity === 'critical' || error.severity === 'high') {
      Logger.error('📡 Notifying monitoring systems:', {
        code: error.code,
        severity: error.severity,
        component: error.context.component
      });
    }
  }

  /**
   * Get error statistics for monitoring
   */
  static getErrorStats(): {
    totalErrors: number;
    errorsByComponent: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ pattern: string; count: number }>;
    recentErrors: Array<{ code: string; component: string; timestamp: Date }>;
  } {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByComponent: {} as Record<string, number>,
      errorsBySeverity: {} as Record<string, number>,
      topErrors: [] as Array<{ pattern: string; count: number }>,
      recentErrors: [] as Array<{ code: string; component: string; timestamp: Date }>
    };

    // Analyze error history
    for (const entry of this.errorHistory) {
      const { error } = entry;

      // Count by component
      stats.errorsByComponent[error.context.component] = 
        (stats.errorsByComponent[error.context.component] || 0) + 1;

      // Count by severity
      stats.errorsBySeverity[error.severity] = 
        (stats.errorsBySeverity[error.severity] || 0) + 1;
    }

    // Get top errors
    stats.topErrors = Array.from(this.errorCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent errors
    stats.recentErrors = this.errorHistory
      .slice(-20)
      .map(entry => ({
        code: entry.error.code,
        component: entry.error.context.component,
        timestamp: entry.handled
      }));

    return stats;
  }

  /**
   * Clear error history and counters
   */
  static clearHistory(): void {
    this.errorHistory.length = 0;
    this.errorCounts.clear();
    Logger.info('🧹 Error history cleared');
  }

  /**
   * Create common error types with predefined configurations
   */
  static createDatabaseError(message: string, context: Partial<ErrorContext>): SupaSeedError {
    return new SupaSeedError(
      message,
      'DATABASE_ERROR',
      { 
        ...context,
        component: context.component || 'database',
        operation: context.operation || 'query',
        timestamp: new Date()
      } as ErrorContext,
      { 
        retryable: true, 
        maxRetries: 3, 
        fallbackStrategy: 'graceful',
        userMessage: 'Database operation failed. Please try again.',
        technicalMessage: `Database error: ${message}`
      },
      'high'
    );
  }

  static createAIError(message: string, context: Partial<ErrorContext>): SupaSeedError {
    return new SupaSeedError(
      message,
      'AI_SERVICE_ERROR',
      {
        ...context,
        component: context.component || 'ai',
        operation: context.operation || 'generation',
        timestamp: new Date()
      } as ErrorContext,
      {
        retryable: true,
        maxRetries: 2,
        fallbackStrategy: 'graceful',
        userMessage: 'AI service temporarily unavailable. Using fallback generation.',
        technicalMessage: `AI error: ${message}`
      },
      'medium'
    );
  }

  static createConfigurationError(message: string, context: Partial<ErrorContext>): SupaSeedError {
    return new SupaSeedError(
      message,
      'CONFIGURATION_ERROR',
      {
        ...context,
        component: context.component || 'config',
        operation: context.operation || 'validation',
        timestamp: new Date()
      } as ErrorContext,
      {
        retryable: false,
        fallbackStrategy: 'fail-fast',
        userMessage: 'Configuration error detected. Please check your settings.',
        technicalMessage: `Configuration error: ${message}`
      },
      'high'
    );
  }

  static createValidationError(message: string, context: Partial<ErrorContext>): SupaSeedError {
    return new SupaSeedError(
      message,
      'VALIDATION_ERROR',
      {
        ...context,
        component: context.component || 'validation',
        operation: context.operation || 'validate',
        timestamp: new Date()
      } as ErrorContext,
      {
        retryable: false,
        fallbackStrategy: 'fail-fast',
        userMessage: 'Invalid input detected. Please correct and try again.',
        technicalMessage: `Validation error: ${message}`
      },
      'medium'
    );
  }

  static createNetworkError(message: string, context: Partial<ErrorContext>): SupaSeedError {
    return new SupaSeedError(
      message,
      'NETWORK_ERROR',
      {
        ...context,
        component: context.component || 'network',
        operation: context.operation || 'request',
        timestamp: new Date()
      } as ErrorContext,
      {
        retryable: true,
        maxRetries: 5,
        fallbackStrategy: 'graceful',
        userMessage: 'Network connectivity issue. Retrying...',
        technicalMessage: `Network error: ${message}`
      },
      'medium'
    );
  }
}

/**
 * Decorator for automatic error handling
 */
export function handleErrors(
  component: string,
  operation?: string,
  recoveryOptions?: ErrorRecoveryOptions
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        await ErrorHandler.handle(error as Error, {
          component,
          operation: operation || propertyName,
          metadata: { args: args.length }
        });
        
        // Re-throw if not recoverable
        if (!(error instanceof SupaSeedError) || !error.recoveryOptions.retryable) {
          throw error;
        }
      }
    };
  };
}

/**
 * Async wrapper for error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: Partial<ErrorContext>,
  recoveryOptions?: ErrorRecoveryOptions
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    await ErrorHandler.handle(error as Error, context);
    
    if (error instanceof SupaSeedError && error.recoveryOptions.retryable && recoveryOptions?.maxRetries) {
      // Implement retry logic here
      for (let i = 0; i < recoveryOptions.maxRetries; i++) {
        try {
          Logger.info(`🔄 Retry attempt ${i + 1} for ${context.operation}`);
          return await operation();
        } catch (retryError) {
          if (i === recoveryOptions.maxRetries - 1) {
            throw retryError;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    
    throw error;
  }
}

export default ErrorHandler;