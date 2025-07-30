/**
 * Framework Strategy Registry
 * Manages registration and selection of framework strategies
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import { 
  SeedingStrategy, 
  DatabaseSchema, 
  FrameworkDetectionResult 
} from './strategy-interface';

type SupabaseClient = ReturnType<typeof createClient>;

export interface StrategyRegistryOptions {
  enableFallback?: boolean;
  minimumConfidence?: number;
  debug?: boolean;
}

export interface StrategySelection {
  strategy: SeedingStrategy;
  detection: FrameworkDetectionResult;
  reason: string;
}

export class StrategyRegistry {
  private strategies: Map<string, SeedingStrategy> = new Map();
  private client: SupabaseClient;
  private options: StrategyRegistryOptions;

  constructor(client: SupabaseClient, options: StrategyRegistryOptions = {}) {
    this.client = client;
    this.options = {
      enableFallback: true,
      minimumConfidence: 0.3,
      debug: false,
      ...options
    };
  }

  /**
   * Register a seeding strategy
   */
  async register(strategy: SeedingStrategy): Promise<void> {
    try {
      await strategy.initialize(this.client);
      this.strategies.set(strategy.name, strategy);
      
      if (this.options.debug) {
        Logger.debug(`Registered strategy: ${strategy.name}`);
      }
    } catch (error: any) {
      Logger.error(`Failed to register strategy ${strategy.name}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple strategies
   */
  async registerAll(strategies: SeedingStrategy[]): Promise<void> {
    for (const strategy of strategies) {
      await this.register(strategy);
    }
  }

  /**
   * Unregister a strategy
   */
  unregister(strategyName: string): void {
    this.strategies.delete(strategyName);
    
    if (this.options.debug) {
      Logger.debug(`Unregistered strategy: ${strategyName}`);
    }
  }

  /**
   * Get all registered strategies
   */
  getStrategies(): SeedingStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get a specific strategy by name
   */
  getStrategy(name: string): SeedingStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Select the best strategy for the given schema
   */
  async selectStrategy(schema: DatabaseSchema): Promise<StrategySelection> {
    if (this.strategies.size === 0) {
      throw new Error('No strategies registered');
    }

    const detectionResults: Array<{
      strategy: SeedingStrategy;
      detection: FrameworkDetectionResult;
    }> = [];

    // Run detection on all strategies
    for (const strategy of this.strategies.values()) {
      try {
        const detection = await strategy.detect(schema);
        detectionResults.push({ strategy, detection });
        
        if (this.options.debug) {
          Logger.debug(`Strategy ${strategy.name} confidence: ${detection.confidence}`);
        }
      } catch (error: any) {
        Logger.warn(`Strategy ${strategy.name} detection failed:`, error);
      }
    }

    if (detectionResults.length === 0) {
      throw new Error('No strategies could analyze the schema');
    }

    // Sort by confidence and priority
    detectionResults.sort((a, b) => {
      const confidenceDiff = b.detection.confidence - a.detection.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      return b.strategy.getPriority() - a.strategy.getPriority();
    });

    const bestResult = detectionResults[0];
    
    // Check minimum confidence threshold
    if (bestResult.detection.confidence < this.options.minimumConfidence!) {
      if (this.options.enableFallback) {
        const fallbackStrategy = this.findFallbackStrategy();
        if (fallbackStrategy) {
          Logger.warn(`Low confidence (${bestResult.detection.confidence}), using fallback strategy`);
          return {
            strategy: fallbackStrategy,
            detection: {
              framework: 'generic',
              confidence: 0.1,
              detectedFeatures: [],
              recommendations: ['Consider manual framework specification']
            },
            reason: 'fallback_low_confidence'
          };
        }
      }
      
      throw new Error(`No strategy meets minimum confidence threshold (${this.options.minimumConfidence})`);
    }

    return {
      strategy: bestResult.strategy,
      detection: bestResult.detection,
      reason: 'best_match'
    };
  }

  /**
   * Select strategy with manual override
   */
  async selectStrategyWithOverride(
    schema: DatabaseSchema, 
    frameworkOverride?: string
  ): Promise<StrategySelection> {
    if (frameworkOverride) {
      const strategy = this.strategies.get(frameworkOverride);
      if (strategy) {
        const detection = await strategy.detect(schema);
        return {
          strategy,
          detection,
          reason: 'manual_override'
        };
      } else {
        Logger.warn(`Override strategy '${frameworkOverride}' not found, falling back to auto-detection`);
      }
    }

    return this.selectStrategy(schema);
  }

  /**
   * Find the fallback strategy (typically generic)
   */
  private findFallbackStrategy(): SeedingStrategy | undefined {
    // Look for strategies with 'generic' in the name first
    for (const [name, strategy] of this.strategies) {
      if (name.toLowerCase().includes('generic')) {
        return strategy;
      }
    }

    // Fall back to the strategy with lowest priority
    const strategies = Array.from(this.strategies.values());
    if (strategies.length === 0) return undefined;

    strategies.sort((a, b) => a.getPriority() - b.getPriority());
    return strategies[0];
  }

  /**
   * Get detection results for all strategies
   */
  async getAllDetectionResults(schema: DatabaseSchema): Promise<Array<{
    strategy: string;
    detection: FrameworkDetectionResult;
  }>> {
    const results: Array<{
      strategy: string;
      detection: FrameworkDetectionResult;
    }> = [];

    for (const strategy of this.strategies.values()) {
      try {
        const detection = await strategy.detect(schema);
        results.push({
          strategy: strategy.name,
          detection
        });
      } catch (error: any) {
        Logger.warn(`Detection failed for strategy ${strategy.name}:`, error);
        results.push({
          strategy: strategy.name,
          detection: {
            framework: 'unknown',
            confidence: 0,
            detectedFeatures: [],
            recommendations: [`Detection failed: ${error.message}`]
          }
        });
      }
    }

    return results;
  }

  /**
   * Validate that a strategy works with the current schema
   */
  async validateStrategy(
    strategyName: string, 
    schema: DatabaseSchema
  ): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      return {
        valid: false,
        issues: [`Strategy '${strategyName}' not found`],
        recommendations: ['Register the strategy first']
      };
    }

    try {
      const detection = await strategy.detect(schema);
      const recommendations = strategy.getRecommendations();
      
      return {
        valid: detection.confidence > 0,
        issues: detection.confidence === 0 ? ['Strategy not compatible with schema'] : [],
        recommendations
      };
    } catch (error: any) {
      return {
        valid: false,
        issues: [`Strategy validation failed: ${error.message}`],
        recommendations: ['Check strategy implementation and schema compatibility']
      };
    }
  }

  /**
   * Clear all registered strategies
   */
  clear(): void {
    this.strategies.clear();
    if (this.options.debug) {
      Logger.debug('Cleared all registered strategies');
    }
  }
}