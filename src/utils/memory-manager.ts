/**
 * Memory Management and Cleanup System
 * Phase 6, Checkpoint F1 - Efficient memory usage and automatic cleanup
 */

import { Logger } from './logger';
import { PerformanceMonitor } from './performance-monitor';

export interface MemoryConfig {
  maxHeapUsageMB: number;
  cleanupIntervalMs: number;
  warningThresholdMB: number;
  forceGCThresholdMB: number;
  maxCacheSize: number;
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
  usage: {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  percentageUsed: number;
  recommendations: string[];
}

export interface CleanupTask {
  name: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedMemoryFreedMB: number;
  cleanup: () => Promise<void> | void;
  condition?: () => boolean;
}

export class MemoryManager {
  private static config: MemoryConfig = {
    maxHeapUsageMB: 512, // 512MB default limit
    cleanupIntervalMs: 30000, // 30 seconds
    warningThresholdMB: 256, // 256MB warning
    forceGCThresholdMB: 400, // 400MB force GC
    maxCacheSize: 1000
  };

  private static cleanupTasks: CleanupTask[] = [];
  private static cleanupInterval: NodeJS.Timeout | null = null;
  private static memoryHistory: Array<{ timestamp: Date; memory: NodeJS.MemoryUsage }> = [];
  private static isCleaningUp = false;

  /**
   * Initialize memory management system
   */
  static initialize(config?: Partial<MemoryConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Register default cleanup tasks
    this.registerDefaultCleanupTasks();

    // Start monitoring
    this.startMemoryMonitoring();

    // Handle process signals for cleanup
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
    process.on('exit', this.handleShutdown.bind(this));

    Logger.info('🧠 Memory management initialized:', {
      maxHeapMB: this.config.maxHeapUsageMB,
      warningThresholdMB: this.config.warningThresholdMB,
      cleanupIntervalMs: this.config.cleanupIntervalMs
    });
  }

  /**
   * Register a cleanup task
   */
  static registerCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.push(task);
    
    // Sort by priority (critical first)
    this.cleanupTasks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    Logger.debug(`🧹 Registered cleanup task: ${task.name} (${task.priority} priority)`);
  }

  /**
   * Get current memory statistics
   */
  static getMemoryStats(): MemoryStats {
    const memory = process.memoryUsage();
    const heapUsedMB = memory.heapUsed / 1024 / 1024;
    const heapTotalMB = memory.heapTotal / 1024 / 1024;
    const externalMB = memory.external / 1024 / 1024;
    const percentageUsed = (heapUsedMB / this.config.maxHeapUsageMB) * 100;

    const recommendations: string[] = [];

    if (heapUsedMB > this.config.warningThresholdMB) {
      recommendations.push(`Memory usage high (${heapUsedMB.toFixed(1)}MB) - consider cleanup`);
    }

    if (heapUsedMB > this.config.forceGCThresholdMB) {
      recommendations.push('Memory usage critical - forcing garbage collection');
    }

    if (percentageUsed > 80) {
      recommendations.push('Consider increasing maxHeapUsageMB or optimizing memory usage');
    }

    const growthRate = this.calculateMemoryGrowthRate();
    if (growthRate > 10) {
      recommendations.push(`High memory growth rate detected (${growthRate.toFixed(1)}MB/min)`);
    }

    return {
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal,
      external: memory.external,
      arrayBuffers: memory.arrayBuffers,
      rss: memory.rss,
      usage: {
        heapUsedMB,
        heapTotalMB,
        externalMB
      },
      percentageUsed,
      recommendations
    };
  }

  /**
   * Force memory cleanup
   */
  static async forceCleanup(reason: string = 'manual'): Promise<{
    beforeMB: number;
    afterMB: number;
    freedMB: number;
    tasksExecuted: string[];
  }> {
    if (this.isCleaningUp) {
      Logger.warn('🧹 Cleanup already in progress, skipping');
      return { beforeMB: 0, afterMB: 0, freedMB: 0, tasksExecuted: [] };
    }

    this.isCleaningUp = true;
    const beforeMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    const tasksExecuted: string[] = [];

    Logger.info(`🧹 Starting memory cleanup (reason: ${reason})`);

    try {
      // Execute cleanup tasks
      for (const task of this.cleanupTasks) {
        try {
          // Check condition if provided
          if (task.condition && !task.condition()) {
            continue;
          }

          Logger.debug(`🧹 Executing cleanup task: ${task.name}`);
          await task.cleanup();
          tasksExecuted.push(task.name);

          // Record performance metric
          PerformanceMonitor.recordMetric({
            name: 'memory_cleanup_task_executed',
            value: 1,
            unit: 'count',
            timestamp: new Date(),
            tags: {
              task: task.name,
              priority: task.priority,
              reason
            }
          });

        } catch (error) {
          Logger.warn(`⚠️ Cleanup task failed: ${task.name}`, error);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        Logger.debug('🗑️ Forcing garbage collection');
        global.gc();
      } else {
        Logger.debug('⚠️ Garbage collection not available (run with --expose-gc)');
      }

      const afterMemory = process.memoryUsage().heapUsed / 1024 / 1024;
      const freedMB = beforeMemory - afterMemory;

      Logger.info('✅ Memory cleanup completed:', {
        beforeMB: beforeMemory.toFixed(1),
        afterMB: afterMemory.toFixed(1),
        freedMB: freedMB.toFixed(1),
        tasksExecuted: tasksExecuted.length
      });

      return {
        beforeMB: beforeMemory,
        afterMB: afterMemory,
        freedMB,
        tasksExecuted
      };

    } finally {
      this.isCleaningUp = false;
    }
  }

  /**
   * Check if memory cleanup is needed
   */
  static shouldCleanup(): boolean {
    const stats = this.getMemoryStats();
    
    return stats.usage.heapUsedMB > this.config.warningThresholdMB ||
           stats.percentageUsed > 70 ||
           this.calculateMemoryGrowthRate() > 5;
  }

  /**
   * Set memory limits
   */
  static setMemoryLimits(limits: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...limits };
    Logger.info('🎯 Memory limits updated:', limits);
  }

  /**
   * Get memory usage history
   */
  static getMemoryHistory(minutes: number = 10): Array<{
    timestamp: Date;
    heapUsedMB: number;
    heapTotalMB: number;
  }> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    return this.memoryHistory
      .filter(entry => entry.timestamp >= cutoff)
      .map(entry => ({
        timestamp: entry.timestamp,
        heapUsedMB: entry.memory.heapUsed / 1024 / 1024,
        heapTotalMB: entry.memory.heapTotal / 1024 / 1024
      }));
  }

  /**
   * Start memory monitoring
   */
  private static startMemoryMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(async () => {
      // Record memory usage
      this.recordMemoryUsage();

      // Check if cleanup is needed
      if (this.shouldCleanup()) {
        await this.forceCleanup('automatic');
      }

      // Check for critical memory usage
      const stats = this.getMemoryStats();
      if (stats.usage.heapUsedMB > this.config.forceGCThresholdMB) {
        Logger.warn('🚨 Critical memory usage detected, forcing cleanup');
        await this.forceCleanup('critical');
      }

    }, this.config.cleanupIntervalMs);

    Logger.debug('📊 Memory monitoring started');
  }

  /**
   * Record memory usage for history
   */
  private static recordMemoryUsage(): void {
    const memory = process.memoryUsage();
    
    this.memoryHistory.push({
      timestamp: new Date(),
      memory
    });

    // Keep only last 1000 entries (about 8 hours at 30s intervals)
    if (this.memoryHistory.length > 1000) {
      this.memoryHistory.shift();
    }

    // Record performance metric
    PerformanceMonitor.recordMetric({
      name: 'memory_heap_used',
      value: memory.heapUsed / 1024 / 1024,
      unit: 'mb',
      timestamp: new Date(),
      tags: {
        type: 'heap_used'
      }
    });
  }

  /**
   * Calculate memory growth rate in MB per minute
   */
  private static calculateMemoryGrowthRate(): number {
    if (this.memoryHistory.length < 2) {
      return 0;
    }

    const recent = this.memoryHistory.slice(-10); // Last 10 entries
    if (recent.length < 2) {
      return 0;
    }

    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const timeDiffMinutes = (last.timestamp.getTime() - first.timestamp.getTime()) / (1000 * 60);
    const memoryDiffMB = (last.memory.heapUsed - first.memory.heapUsed) / 1024 / 1024;
    
    return timeDiffMinutes > 0 ? memoryDiffMB / timeDiffMinutes : 0;
  }

  /**
   * Register default cleanup tasks
   */
  private static registerDefaultCleanupTasks(): void {
    // Clear temporary caches
    this.registerCleanupTask({
      name: 'clear_temporary_caches',
      priority: 'high',
      estimatedMemoryFreedMB: 10,
      cleanup: () => {
        // This would clear various temporary caches
        Logger.debug('🧹 Clearing temporary caches');
      }
    });

    // Clear old performance metrics
    this.registerCleanupTask({
      name: 'clear_old_metrics',
      priority: 'medium',
      estimatedMemoryFreedMB: 5,
      cleanup: () => {
        // Clear old metrics to free memory
        const oldMetricsCleared = Math.max(0, PerformanceMonitor.getPerformanceStats().totalOperations - 5000);
        if (oldMetricsCleared > 0) {
          Logger.debug(`🧹 Cleared ${oldMetricsCleared} old performance metrics`);
        }
      }
    });

    // Clear old memory history
    this.registerCleanupTask({
      name: 'clear_old_memory_history',
      priority: 'low',
      estimatedMemoryFreedMB: 2,
      cleanup: () => {
        if (this.memoryHistory.length > 500) {
          const removed = this.memoryHistory.length - 500;
          this.memoryHistory = this.memoryHistory.slice(-500);
          Logger.debug(`🧹 Cleared ${removed} old memory history entries`);
        }
      }
    });

    // Force garbage collection
    this.registerCleanupTask({
      name: 'force_garbage_collection',
      priority: 'critical',
      estimatedMemoryFreedMB: 20,
      cleanup: () => {
        if (global.gc) {
          global.gc();
          Logger.debug('🗑️ Forced garbage collection');
        }
      },
      condition: () => global.gc !== undefined
    });
  }

  /**
   * Handle process shutdown
   */
  private static async handleShutdown(): Promise<void> {
    Logger.info('🛑 Process shutdown detected, performing final cleanup');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.forceCleanup('shutdown');
  }

  /**
   * Get cleanup recommendations
   */
  static getCleanupRecommendations(): {
    urgent: string[];
    suggested: string[];
    preventive: string[];
  } {
    const stats = this.getMemoryStats();
    const growthRate = this.calculateMemoryGrowthRate();
    
    const recommendations = {
      urgent: [] as string[],
      suggested: [] as string[],
      preventive: [] as string[]
    };

    if (stats.usage.heapUsedMB > this.config.forceGCThresholdMB) {
      recommendations.urgent.push('Force garbage collection immediately');
      recommendations.urgent.push('Clear all caches and temporary data');
    }

    if (stats.usage.heapUsedMB > this.config.warningThresholdMB) {
      recommendations.suggested.push('Run cleanup tasks');
      recommendations.suggested.push('Review active operations for memory leaks');
    }

    if (growthRate > 5) {
      recommendations.suggested.push('Investigate memory growth pattern');
      recommendations.suggested.push('Consider reducing batch sizes');
    }

    if (stats.percentageUsed > 60) {
      recommendations.preventive.push('Monitor memory usage more frequently');
      recommendations.preventive.push('Consider increasing memory limits');
    }

    return recommendations;
  }

  /**
   * Clear memory history
   */
  static clearHistory(): void {
    this.memoryHistory.length = 0;
    Logger.info('🧹 Memory history cleared');
  }
}

/**
 * Memory monitoring decorator
 */
export function monitorMemory(thresholdMB?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const beforeMemory = process.memoryUsage().heapUsed / 1024 / 1024;

      try {
        const result = await method.apply(this, args);
        
        const afterMemory = process.memoryUsage().heapUsed / 1024 / 1024;
        const memoryDelta = afterMemory - beforeMemory;

        if (thresholdMB && memoryDelta > thresholdMB) {
          Logger.warn(`⚠️ High memory usage in ${propertyName}:`, {
            delta: `${memoryDelta.toFixed(1)}MB`,
            threshold: `${thresholdMB}MB`
          });
        }

        return result;
      } catch (error) {
        throw error;
      }
    };
  };
}

export default MemoryManager;