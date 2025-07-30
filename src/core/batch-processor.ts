/**
 * Streaming Batch Processor for Memory-Efficient Data Processing
 * FEAT-003: Memory Management & Schema Mapping Fixes
 * 
 * This module provides streaming batch processing capabilities to prevent
 * out-of-memory errors when processing large datasets.
 */

import { Logger } from './utils/logger';
import MemoryManager from './utils/memory-manager';
import { PerformanceMonitor } from './utils/performance-monitor';

export interface BatchProcessorConfig {
  /** Default batch size for processing (default: 50) */
  defaultBatchSize: number;
  /** Memory threshold in MB to trigger smaller batches (default: 800) */
  memoryThresholdMB: number;
  /** Minimum batch size when memory pressure is high (default: 10) */
  minBatchSize: number;
  /** Maximum batch size allowed (default: 200) */
  maxBatchSize: number;
  /** Whether to force garbage collection between batches (default: true) */
  forceGCBetweenBatches: boolean;
  /** Delay in ms between batches for memory pressure relief (default: 100) */
  batchDelayMs: number;
}

export interface BatchProcessingStats {
  totalItems: number;
  processedItems: number;
  batchesCompleted: number;
  currentBatchSize: number;
  averageMemoryUsageMB: number;
  peakMemoryUsageMB: number;
  totalProcessingTimeMs: number;
  averageBatchTimeMs: number;
}

export interface BatchItem<T> {
  data: T;
  index: number;
  metadata?: Record<string, any>;
}

export interface BatchResult<R> {
  success: boolean;
  result?: R;
  error?: Error;
  processingTimeMs: number;
  memoryUsageMB: number;
}

/**
 * Streaming batch processor for memory-efficient data processing
 */
export class StreamingBatchProcessor<T, R> {
  private config: BatchProcessorConfig;
  private stats: BatchProcessingStats;
  private startTime: number = 0;
  private memoryReadings: number[] = [];

  constructor(config?: Partial<BatchProcessorConfig>) {
    this.config = {
      defaultBatchSize: 50,
      memoryThresholdMB: 800,
      minBatchSize: 10,
      maxBatchSize: 200,
      forceGCBetweenBatches: true,
      batchDelayMs: 100,
      ...config
    };

    this.stats = {
      totalItems: 0,
      processedItems: 0,
      batchesCompleted: 0,
      currentBatchSize: this.config.defaultBatchSize,
      averageMemoryUsageMB: 0,
      peakMemoryUsageMB: 0,
      totalProcessingTimeMs: 0,
      averageBatchTimeMs: 0
    };

    Logger.info('🔄 StreamingBatchProcessor initialized:', {
      defaultBatchSize: this.config.defaultBatchSize,
      memoryThresholdMB: this.config.memoryThresholdMB,
      forceGC: this.config.forceGCBetweenBatches
    });
  }

  /**
   * Process items in streaming batches with automatic memory management
   */
  async *processBatches(
    items: T[],
    processor: (batch: BatchItem<T>[]) => Promise<BatchResult<R>[]>
  ): AsyncGenerator<BatchResult<R>[], void, unknown> {
    this.initializeProcessing(items.length);

    try {
      for await (const batchResults of this.streamBatches(items, processor)) {
        yield batchResults;
        
        // Memory management between batches
        await this.performBatchCleanup();
      }
    } finally {
      this.finalizeProcessing();
    }
  }

  /**
   * Process all items and return aggregated results
   */
  async processAll(
    items: T[],
    processor: (batch: BatchItem<T>[]) => Promise<BatchResult<R>[]>
  ): Promise<{
    results: BatchResult<R>[];
    stats: BatchProcessingStats;
    recommendations: string[];
  }> {
    const allResults: BatchResult<R>[] = [];
    
    for await (const batchResults of this.processBatches(items, processor)) {
      allResults.push(...batchResults);
    }

    return {
      results: allResults,
      stats: this.getStats(),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Get current processing statistics
   */
  getStats(): BatchProcessingStats {
    return { ...this.stats };
  }

  /**
   * Get processing recommendations based on current performance
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const memoryStats = MemoryManager.getMemoryStats();

    if (this.stats.peakMemoryUsageMB > this.config.memoryThresholdMB) {
      recommendations.push(`Peak memory usage (${this.stats.peakMemoryUsageMB.toFixed(1)}MB) exceeded threshold - consider reducing batch size`);
    }

    if (this.stats.averageBatchTimeMs > 30000) { // 30 seconds
      recommendations.push('Long batch processing times detected - consider optimizing batch operations');
    }

    if (memoryStats.percentageUsed > 80) {
      recommendations.push('High memory usage detected - enable more aggressive garbage collection');
    }

    if (this.stats.currentBatchSize < this.config.defaultBatchSize * 0.5) {
      recommendations.push('Batch size was reduced due to memory pressure - consider optimizing memory usage per item');
    }

    return recommendations;
  }

  /**
   * Create batches with dynamic sizing based on memory pressure
   */
  private *createDynamicBatches(items: T[]): Generator<BatchItem<T>[], void, unknown> {
    let startIndex = 0;

    while (startIndex < items.length) {
      const currentBatchSize = this.calculateOptimalBatchSize();
      const endIndex = Math.min(startIndex + currentBatchSize, items.length);
      
      const batch: BatchItem<T>[] = items
        .slice(startIndex, endIndex)
        .map((data, localIndex) => ({
          data,
          index: startIndex + localIndex,
          metadata: { batchNumber: this.stats.batchesCompleted + 1 }
        }));

      this.stats.currentBatchSize = batch.length;
      yield batch;
      
      startIndex = endIndex;
    }
  }

  /**
   * Stream batches with memory monitoring
   */
  private async *streamBatches(
    items: T[],
    processor: (batch: BatchItem<T>[]) => Promise<BatchResult<R>[]>
  ): AsyncGenerator<BatchResult<R>[], void, unknown> {
    
    for (const batch of this.createDynamicBatches(items)) {
      const batchStartTime = Date.now();
      const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;

      Logger.debug(`🔄 Processing batch ${this.stats.batchesCompleted + 1}:`, {
        size: batch.length,
        progress: `${this.stats.processedItems}/${this.stats.totalItems}`,
        memoryMB: memoryBefore.toFixed(1)
      });

      try {
        // Process the batch
        const results = await processor(batch);
        
        // Update statistics
        const batchEndTime = Date.now();
        const processingTime = batchEndTime - batchStartTime;
        const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
        
        this.updateBatchStats(batch.length, processingTime, memoryAfter);
        
        yield results;

      } catch (error) {
        Logger.error(`❌ Batch processing failed:`, error);
        
        // Create error results for the failed batch
        const errorResults: BatchResult<R>[] = batch.map(item => ({
          success: false,
          error: error as Error,
          processingTimeMs: Date.now() - batchStartTime,
          memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
        }));
        
        yield errorResults;
      }
    }
  }

  /**
   * Calculate optimal batch size based on current memory conditions
   */
  private calculateOptimalBatchSize(): number {
    const memoryStats = MemoryManager.getMemoryStats();
    const currentMemoryMB = memoryStats.usage.heapUsedMB;
    
    // If memory usage is high, reduce batch size
    if (currentMemoryMB > this.config.memoryThresholdMB) {
      const reductionFactor = Math.min(
        this.config.memoryThresholdMB / currentMemoryMB,
        1.0
      );
      const reducedSize = Math.floor(this.config.defaultBatchSize * reductionFactor);
      
      return Math.max(reducedSize, this.config.minBatchSize);
    }
    
    // If memory usage is low, we can use the default or even increase slightly
    if (currentMemoryMB < this.config.memoryThresholdMB * 0.6) {
      return Math.min(this.config.defaultBatchSize, this.config.maxBatchSize);
    }
    
    return this.config.defaultBatchSize;
  }

  /**
   * Perform cleanup between batches
   */
  private async performBatchCleanup(): Promise<void> {
    // Record memory usage
    const currentMemory = process.memoryUsage().heapUsed / 1024 / 1024;
    this.memoryReadings.push(currentMemory);

    // Force garbage collection if enabled and memory usage is high
    if (this.config.forceGCBetweenBatches) {
      const memoryStats = MemoryManager.getMemoryStats();
      
      if (memoryStats.usage.heapUsedMB > this.config.memoryThresholdMB * 0.7) {
        Logger.debug('🗑️ Forcing garbage collection between batches');
        await MemoryManager.forceCleanup('batch_processing');
      }
    }

    // Add delay for memory pressure relief if configured
    if (this.config.batchDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.batchDelayMs));
    }

    // Record performance metric
    PerformanceMonitor.recordMetric({
      name: 'batch_processor_memory_usage',
      value: currentMemory,
      unit: 'mb',
      timestamp: new Date(),
      tags: {
        batch_number: this.stats.batchesCompleted.toString(),
        batch_size: this.stats.currentBatchSize.toString()
      }
    });
  }

  /**
   * Initialize processing statistics
   */
  private initializeProcessing(totalItems: number): void {
    this.startTime = Date.now();
    this.stats.totalItems = totalItems;
    this.stats.processedItems = 0;
    this.stats.batchesCompleted = 0;
    this.memoryReadings = [];

    Logger.info('🚀 Starting batch processing:', {
      totalItems,
      estimatedBatches: Math.ceil(totalItems / this.config.defaultBatchSize),
      batchSize: this.config.defaultBatchSize
    });
  }

  /**
   * Update statistics after each batch
   */
  private updateBatchStats(batchSize: number, processingTime: number, memoryUsage: number): void {
    this.stats.processedItems += batchSize;
    this.stats.batchesCompleted++;
    this.stats.peakMemoryUsageMB = Math.max(this.stats.peakMemoryUsageMB, memoryUsage);
    
    // Calculate averages
    this.stats.averageMemoryUsageMB = this.memoryReadings.length > 0 
      ? this.memoryReadings.reduce((a, b) => a + b, 0) / this.memoryReadings.length
      : memoryUsage;
    
    this.stats.totalProcessingTimeMs += processingTime;
    this.stats.averageBatchTimeMs = this.stats.totalProcessingTimeMs / this.stats.batchesCompleted;

    // Log progress
    const progressPercent = (this.stats.processedItems / this.stats.totalItems * 100).toFixed(1);
    Logger.info(`📊 Batch ${this.stats.batchesCompleted} completed:`, {
      progress: `${progressPercent}%`,
      processed: `${this.stats.processedItems}/${this.stats.totalItems}`,
      batchTime: `${processingTime}ms`,
      memoryMB: memoryUsage.toFixed(1)
    });
  }

  /**
   * Finalize processing and log summary
   */
  private finalizeProcessing(): void {
    const totalTime = Date.now() - this.startTime;
    const avgItemTime = totalTime / this.stats.totalItems;

    Logger.info('✅ Batch processing completed:', {
      totalItems: this.stats.totalItems,
      totalBatches: this.stats.batchesCompleted,
      totalTimeMs: totalTime,
      avgItemTimeMs: avgItemTime.toFixed(2),
      peakMemoryMB: this.stats.peakMemoryUsageMB.toFixed(1),
      avgMemoryMB: this.stats.averageMemoryUsageMB.toFixed(1)
    });

    // Record final performance metrics
    PerformanceMonitor.recordMetric({
      name: 'batch_processor_completed',
      value: this.stats.totalItems,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        total_batches: this.stats.batchesCompleted.toString(),
        peak_memory_mb: this.stats.peakMemoryUsageMB.toFixed(1),
        total_time_ms: totalTime.toString()
      }
    });
  }
}

/**
 * Utility function to create a batch processor with common configuration
 */
export function createBatchProcessor<T, R>(
  config?: Partial<BatchProcessorConfig>
): StreamingBatchProcessor<T, R> {
  return new StreamingBatchProcessor<T, R>(config);
}

/**
 * Memory-aware batch processing decorator
 */
export function batchProcessed(batchSize: number = 50, memoryThresholdMB: number = 800) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (items: any[], ...args: any[]) {
      const processor = createBatchProcessor({
        defaultBatchSize: batchSize,
        memoryThresholdMB: memoryThresholdMB
      });

      // Create a batch processing function
      const batchFunc = async (batch: BatchItem<any>[]): Promise<BatchResult<any>[]> => {
        const results: BatchResult<any>[] = [];
        
        for (const item of batch) {
          const itemStartTime = Date.now();
          const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
          
          try {
            const result = await method.call(this, item.data, ...args);
            results.push({
              success: true,
              result,
              processingTimeMs: Date.now() - itemStartTime,
              memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
            });
          } catch (error) {
            results.push({
              success: false,
              error: error as Error,
              processingTimeMs: Date.now() - itemStartTime,
              memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
            });
          }
        }
        
        return results;
      };

      const { results } = await processor.processAll(items, batchFunc);
      return results.filter(r => r.success).map(r => r.result);
    };
  };
}

export default StreamingBatchProcessor;