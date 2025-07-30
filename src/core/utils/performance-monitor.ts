/**
 * Performance Monitoring System
 * Phase 6, Checkpoint F1 - Comprehensive performance tracking and optimization
 */

import { Logger } from './logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'mb' | 'count' | 'percentage' | 'bytes/sec';
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface OperationTiming {
  operationName: string;
  component: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: {
    before: NodeJS.MemoryUsage;
    after?: NodeJS.MemoryUsage;
    delta?: Partial<NodeJS.MemoryUsage>;
  };
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static activeOperations: Map<string, OperationTiming> = new Map();
  private static performanceThresholds: Map<string, number> = new Map();
  private static readonly MAX_METRICS_HISTORY = 10000;

  /**
   * Initialize performance monitoring with default thresholds
   */
  static initialize(): void {
    // Set default performance thresholds (in milliseconds)
    this.setThreshold('database_query', 1000);
    this.setThreshold('ai_generation', 30000);
    this.setThreshold('schema_detection', 5000);
    this.setThreshold('template_rendering', 2000);
    this.setThreshold('file_operations', 500);
    this.setThreshold('configuration_update', 1000);

    Logger.info('📊 Performance monitoring initialized');
  }

  /**
   * Start timing an operation
   */
  static startOperation(
    operationName: string, 
    component: string, 
    metadata?: Record<string, any>
  ): string {
    const operationId = `${component}_${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timing: OperationTiming = {
      operationName,
      component,
      startTime: performance.now(),
      memoryUsage: {
        before: process.memoryUsage()
      },
      success: false,
      metadata
    };

    this.activeOperations.set(operationId, timing);
    
    Logger.debug(`⏱️ Started timing: ${operationName}`, { operationId, component });
    
    return operationId;
  }

  /**
   * End timing an operation
   */
  static endOperation(
    operationId: string, 
    success: boolean = true, 
    errorCode?: string,
    additionalMetadata?: Record<string, any>
  ): OperationTiming | null {
    const timing = this.activeOperations.get(operationId);
    
    if (!timing) {
      Logger.warn('⚠️ Attempted to end non-existent operation:', operationId);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timing.startTime;
    const memoryAfter = process.memoryUsage();

    // Calculate memory delta
    const memoryDelta = {
      rss: memoryAfter.rss - timing.memoryUsage!.before.rss,
      heapUsed: memoryAfter.heapUsed - timing.memoryUsage!.before.heapUsed,
      heapTotal: memoryAfter.heapTotal - timing.memoryUsage!.before.heapTotal,
      external: memoryAfter.external - timing.memoryUsage!.before.external,
      arrayBuffers: memoryAfter.arrayBuffers - timing.memoryUsage!.before.arrayBuffers
    };

    // Update timing
    timing.endTime = endTime;
    timing.duration = duration;
    timing.success = success;
    timing.errorCode = errorCode;
    timing.memoryUsage!.after = memoryAfter;
    timing.memoryUsage!.delta = memoryDelta;
    
    if (additionalMetadata) {
      timing.metadata = { ...timing.metadata, ...additionalMetadata };
    }

    // Check performance threshold
    this.checkPerformanceThreshold(timing);

    // Record metrics
    this.recordMetric({
      name: `${timing.component}_${timing.operationName}_duration`,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        component: timing.component,
        operation: timing.operationName,
        success: success.toString()
      },
      metadata: timing.metadata
    });

    // Record memory usage
    this.recordMetric({
      name: `${timing.component}_${timing.operationName}_memory_delta`,
      value: memoryDelta.heapUsed / 1024 / 1024, // Convert to MB
      unit: 'mb',
      timestamp: new Date(),
      tags: {
        component: timing.component,
        operation: timing.operationName,
        type: 'heap_used_delta'
      }
    });

    // Remove from active operations
    this.activeOperations.delete(operationId);

    Logger.debug(`✅ Completed timing: ${timing.operationName}`, {
      duration: `${duration.toFixed(2)}ms`,
      success,
      memoryDelta: `${(memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`
    });

    return timing;
  }

  /**
   * Record a custom metric
   */
  static recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Maintain metrics history size
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.shift();
    }

    // Log significant metrics
    if (this.isSignificantMetric(metric)) {
      Logger.info('📈 Performance metric:', {
        name: metric.name,
        value: `${metric.value}${metric.unit}`,
        tags: metric.tags
      });
    }
  }

  /**
   * Set performance threshold for an operation
   */
  static setThreshold(operationKey: string, thresholdMs: number): void {
    this.performanceThresholds.set(operationKey, thresholdMs);
    Logger.debug(`🎯 Set performance threshold: ${operationKey} = ${thresholdMs}ms`);
  }

  /**
   * Check if operation exceeded performance threshold
   */
  private static checkPerformanceThreshold(timing: OperationTiming): void {
    const thresholdKey = `${timing.component}_${timing.operationName}`;
    const threshold = this.performanceThresholds.get(thresholdKey) || 
                     this.performanceThresholds.get(timing.operationName);

    if (threshold && timing.duration && timing.duration > threshold) {
      Logger.warn('🐌 Performance threshold exceeded:', {
        operation: thresholdKey,
        duration: `${timing.duration.toFixed(2)}ms`,
        threshold: `${threshold}ms`,
        overrun: `${(timing.duration - threshold).toFixed(2)}ms`,
        recommendation: this.getPerformanceRecommendation(timing)
      });
    }
  }

  /**
   * Get performance recommendation based on timing
   */
  private static getPerformanceRecommendation(timing: OperationTiming): string {
    const { component, operationName, duration = 0 } = timing;

    if (component === 'database' && duration > 5000) {
      return 'Consider optimizing database queries or adding indexes';
    }
    
    if (component === 'ai' && duration > 60000) {
      return 'AI operation taking too long, consider smaller batch sizes or timeout';
    }
    
    if (component === 'template' && duration > 3000) {
      return 'Template rendering slow, check for complex logic or large datasets';
    }
    
    if (operationName.includes('file') && duration > 1000) {
      return 'File operations slow, check disk I/O or file sizes';
    }

    return 'Consider optimizing this operation for better performance';
  }

  /**
   * Check if metric is significant enough to log
   */
  private static isSignificantMetric(metric: PerformanceMetric): boolean {
    // Log all error cases
    if (metric.tags.success === 'false') {
      return true;
    }

    // Log slow operations
    if (metric.unit === 'ms' && metric.value > 5000) {
      return true;
    }

    // Log high memory usage
    if (metric.unit === 'mb' && Math.abs(metric.value) > 50) {
      return true;
    }

    return false;
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    totalOperations: number;
    averageResponseTime: number;
    slowestOperations: Array<{
      operation: string;
      duration: number;
      timestamp: Date;
    }>;
    memoryTrends: Array<{
      timestamp: Date;
      heapUsed: number;
      component: string;
    }>;
    errorRate: number;
    componentPerformance: Record<string, {
      averageDuration: number;
      operationCount: number;
      errorCount: number;
    }>;
  } {
    const durationMetrics = this.metrics.filter(m => m.unit === 'ms');
    const memoryMetrics = this.metrics.filter(m => m.unit === 'mb');
    
    // Calculate averages
    const totalDuration = durationMetrics.reduce((sum, m) => sum + m.value, 0);
    const averageResponseTime = durationMetrics.length > 0 ? totalDuration / durationMetrics.length : 0;
    
    // Find slowest operations
    const slowestOperations = durationMetrics
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(m => ({
        operation: m.name,
        duration: m.value,
        timestamp: m.timestamp
      }));

    // Memory trends
    const memoryTrends = memoryMetrics
      .filter(m => m.name.includes('memory_delta'))
      .slice(-50)
      .map(m => ({
        timestamp: m.timestamp,
        heapUsed: m.value,
        component: m.tags.component
      }));

    // Error rate
    const errorMetrics = durationMetrics.filter(m => m.tags.success === 'false');
    const errorRate = durationMetrics.length > 0 ? errorMetrics.length / durationMetrics.length : 0;

    // Component performance
    const componentPerformance: Record<string, any> = {};
    
    for (const metric of durationMetrics) {
      const component = metric.tags.component;
      if (!componentPerformance[component]) {
        componentPerformance[component] = {
          totalDuration: 0,
          operationCount: 0,
          errorCount: 0
        };
      }
      
      componentPerformance[component].totalDuration += metric.value;
      componentPerformance[component].operationCount += 1;
      
      if (metric.tags.success === 'false') {
        componentPerformance[component].errorCount += 1;
      }
    }

    // Calculate averages for components
    for (const component in componentPerformance) {
      const stats = componentPerformance[component];
      stats.averageDuration = stats.totalDuration / stats.operationCount;
      delete stats.totalDuration;
    }

    return {
      totalOperations: durationMetrics.length,
      averageResponseTime,
      slowestOperations,
      memoryTrends,
      errorRate,
      componentPerformance
    };
  }

  /**
   * Get system resource usage
   */
  static getSystemStats(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    activeOperations: number;
    cpuUsage?: NodeJS.CpuUsage;
  } {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      activeOperations: this.activeOperations.size,
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Clear metrics history
   */
  static clearMetrics(): void {
    this.metrics.length = 0;
    Logger.info('🧹 Performance metrics cleared');
  }

  /**
   * Export metrics for external monitoring
   */
  static exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    if (format === 'prometheus') {
      return this.formatPrometheusMetrics();
    }
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      activeOperations: Array.from(this.activeOperations.values()),
      systemStats: this.getSystemStats(),
      performanceStats: this.getPerformanceStats()
    }, null, 2);
  }

  /**
   * Format metrics in Prometheus format
   */
  private static formatPrometheusMetrics(): string {
    let output = '';
    
    // Group metrics by name
    const metricGroups = new Map<string, PerformanceMetric[]>();
    
    for (const metric of this.metrics) {
      if (!metricGroups.has(metric.name)) {
        metricGroups.set(metric.name, []);
      }
      metricGroups.get(metric.name)!.push(metric);
    }

    // Format each metric group
    for (const [name, metrics] of metricGroups) {
      output += `# HELP ${name} Performance metric from supa-seed\n`;
      output += `# TYPE ${name} gauge\n`;
      
      for (const metric of metrics.slice(-10)) { // Last 10 entries
        const tagString = Object.entries(metric.tags)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        
        output += `${name}{${tagString}} ${metric.value} ${metric.timestamp.getTime()}\n`;
      }
      
      output += '\n';
    }

    return output;
  }
}

/**
 * Performance monitoring decorator
 */
export function monitor(component: string, operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const opName = operationName || propertyName;

    descriptor.value = async function (...args: any[]) {
      const operationId = PerformanceMonitor.startOperation(opName, component, {
        argsCount: args.length
      });

      try {
        const result = await method.apply(this, args);
        PerformanceMonitor.endOperation(operationId, true);
        return result;
      } catch (error) {
        PerformanceMonitor.endOperation(operationId, false, (error as Error).name);
        throw error;
      }
    };
  };
}

/**
 * Async wrapper for performance monitoring
 */
export async function withPerformanceMonitoring<T>(
  operation: () => Promise<T>,
  component: string,
  operationName: string,
  metadata?: Record<string, any>
): Promise<T> {
  const operationId = PerformanceMonitor.startOperation(operationName, component, metadata);

  try {
    const result = await operation();
    PerformanceMonitor.endOperation(operationId, true);
    return result;
  } catch (error) {
    PerformanceMonitor.endOperation(operationId, false, (error as Error).name);
    throw error;
  }
}

export default PerformanceMonitor;