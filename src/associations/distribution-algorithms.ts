/**
 * Distribution Algorithms for Asset Association Intelligence
 * Phase 3, Checkpoint C1 - Smart asset-to-entity distribution
 */

import { LoadedAsset } from '../features/generation/assets/asset-loader';
import { Logger } from '../core/utils/logger';

export interface DistributionTarget {
  id: string;
  name?: string;
  weight?: number;
  constraints?: {
    minItems?: number;
    maxItems?: number;
    requiredTags?: string[];
    excludedTags?: string[];
    requiredTypes?: string[];
    excludedTypes?: string[];
    customFilter?: (asset: LoadedAsset) => boolean;
  };
  metadata?: Record<string, any>;
}

export interface DistributionConfig {
  algorithm: 'weighted_random' | 'round_robin' | 'even_spread' | 'custom';
  seed?: string;
  ensureDeterministic?: boolean;
  respectConstraints?: boolean;
  allowPartialFulfillment?: boolean;
  maxRetries?: number;
  customAlgorithm?: (assets: LoadedAsset[], targets: DistributionTarget[]) => DistributionResult;
}

export interface DistributionAssignment {
  target: DistributionTarget;
  assets: LoadedAsset[];
  fulfilled: boolean;
  constraintViolations: string[];
  assignmentReason?: string;
}

export interface DistributionResult {
  assignments: DistributionAssignment[];
  unassigned: LoadedAsset[];
  algorithm: string;
  seed?: string;
  totalAssets: number;
  totalTargets: number;
  successRate: number;
  metadata: {
    executionTime: number;
    retries: number;
    constraintViolations: number;
    averageAssignmentsPerTarget: number;
    distributionEfficiency: number;
  };
}

export class DistributionEngine {
  private static readonly DEFAULT_SEED = 'supa-seed-distribution';

  /**
   * Distribute assets to targets using the specified algorithm
   */
  static distribute(
    assets: LoadedAsset[],
    targets: DistributionTarget[],
    config: DistributionConfig
  ): DistributionResult {
    const startTime = Date.now();
    
    Logger.info(`🎯 Distributing ${assets.length} assets to ${targets.length} targets using ${config.algorithm}`);

    // Validate inputs
    if (assets.length === 0) {
      return this.createEmptyResult(targets, config, startTime);
    }

    if (targets.length === 0) {
      return this.createResultWithUnassigned(assets, config, startTime);
    }

    // Apply distribution algorithm
    let result: DistributionResult;
    
    switch (config.algorithm) {
      case 'weighted_random':
        result = this.weightedRandomDistribution(assets, targets, config);
        break;
      case 'round_robin':
        result = this.roundRobinDistribution(assets, targets, config);
        break;
      case 'even_spread':
        result = this.evenSpreadDistribution(assets, targets, config);
        break;
      case 'custom':
        if (!config.customAlgorithm) {
          throw new Error('Custom algorithm function is required when using custom algorithm');
        }
        result = config.customAlgorithm(assets, targets);
        break;
      default:
        throw new Error(`Unknown distribution algorithm: ${config.algorithm}`);
    }

    // Apply constraint validation if enabled
    if (config.respectConstraints) {
      result = this.enforceConstraints(result, config);
    }

    // Update metadata
    const executionTime = Date.now() - startTime;
    result.metadata.executionTime = executionTime;
    result.successRate = this.calculateSuccessRate(result);

    Logger.info(`✅ Distribution complete: ${result.successRate.toFixed(1)}% success rate (${executionTime}ms)`);

    return result;
  }

  /**
   * Weighted random distribution - assigns assets based on target weights
   */
  private static weightedRandomDistribution(
    assets: LoadedAsset[],
    targets: DistributionTarget[],
    config: DistributionConfig
  ): DistributionResult {
    const seed = config.seed || this.DEFAULT_SEED;
    const rng = this.createSeededRandom(seed);
    
    // Calculate weights and cumulative distribution
    const weights = targets.map(target => target.weight || 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const cumulativeWeights = weights.reduce((acc, weight, index) => {
      acc.push((acc[index - 1] || 0) + weight);
      return acc;
    }, [] as number[]);

    // Initialize assignments
    const assignments: DistributionAssignment[] = targets.map(target => ({
      target,
      assets: [],
      fulfilled: false,
      constraintViolations: [],
      assignmentReason: 'weighted_random'
    }));

    // Distribute assets
    for (const asset of assets) {
      const random = rng() * totalWeight;
      const targetIndex = cumulativeWeights.findIndex(cw => cw >= random);
      
      if (targetIndex !== -1) {
        assignments[targetIndex].assets.push(asset);
      }
    }

    // Mark all assignments as fulfilled by default (no constraints applied yet)
    assignments.forEach(assignment => {
      assignment.fulfilled = true;
    });

    return {
      assignments,
      unassigned: [],
      algorithm: 'weighted_random',
      seed,
      totalAssets: assets.length,
      totalTargets: targets.length,
      successRate: 0, // Will be calculated later
      metadata: {
        executionTime: 0, // Will be set by caller
        retries: 0,
        constraintViolations: 0,
        averageAssignmentsPerTarget: assets.length / targets.length,
        distributionEfficiency: 100 // All assets assigned in weighted random
      }
    };
  }

  /**
   * Round robin distribution - assigns assets in sequential order to targets
   */
  private static roundRobinDistribution(
    assets: LoadedAsset[],
    targets: DistributionTarget[],
    config: DistributionConfig
  ): DistributionResult {
    // Initialize assignments
    const assignments: DistributionAssignment[] = targets.map(target => ({
      target,
      assets: [],
      fulfilled: false,
      constraintViolations: [],
      assignmentReason: 'round_robin'
    }));

    // Distribute assets in round-robin fashion
    let targetIndex = 0;
    for (const asset of assets) {
      assignments[targetIndex].assets.push(asset);
      targetIndex = (targetIndex + 1) % targets.length;
    }

    // Mark all assignments as fulfilled by default (no constraints applied yet)
    assignments.forEach(assignment => {
      assignment.fulfilled = true;
    });

    return {
      assignments,
      unassigned: [],
      algorithm: 'round_robin',
      seed: config.seed,
      totalAssets: assets.length,
      totalTargets: targets.length,
      successRate: 0, // Will be calculated later
      metadata: {
        executionTime: 0, // Will be set by caller
        retries: 0,
        constraintViolations: 0,
        averageAssignmentsPerTarget: assets.length / targets.length,
        distributionEfficiency: 100 // All assets assigned in round robin
      }
    };
  }

  /**
   * Even spread distribution - tries to assign equal number of assets to each target
   */
  private static evenSpreadDistribution(
    assets: LoadedAsset[],
    targets: DistributionTarget[],
    config: DistributionConfig
  ): DistributionResult {
    const seed = config.seed || this.DEFAULT_SEED;
    const rng = this.createSeededRandom(seed);
    
    // Calculate base assignment count and remainder
    const baseCount = Math.floor(assets.length / targets.length);
    const remainder = assets.length % targets.length;

    // Initialize assignments
    const assignments: DistributionAssignment[] = targets.map((target, index) => ({
      target,
      assets: [],
      fulfilled: false,
      constraintViolations: [],
      assignmentReason: 'even_spread'
    }));

    // Shuffle assets for fair distribution
    const shuffledAssets = [...assets];
    for (let i = shuffledAssets.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledAssets[i], shuffledAssets[j]] = [shuffledAssets[j], shuffledAssets[i]];
    }

    // Distribute assets evenly
    let assetIndex = 0;
    for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
      const assignmentCount = baseCount + (targetIndex < remainder ? 1 : 0);
      
      for (let i = 0; i < assignmentCount && assetIndex < shuffledAssets.length; i++) {
        assignments[targetIndex].assets.push(shuffledAssets[assetIndex]);
        assetIndex++;
      }
    }

    // Mark all assignments as fulfilled by default (no constraints applied yet)
    assignments.forEach(assignment => {
      assignment.fulfilled = true;
    });

    return {
      assignments,
      unassigned: [],
      algorithm: 'even_spread',
      seed,
      totalAssets: assets.length,
      totalTargets: targets.length,
      successRate: 0, // Will be calculated later
      metadata: {
        executionTime: 0, // Will be set by caller
        retries: 0,
        constraintViolations: 0,
        averageAssignmentsPerTarget: assets.length / targets.length,
        distributionEfficiency: 100 // All assets assigned in even spread
      }
    };
  }

  /**
   * Enforce constraints on distribution result
   */
  private static enforceConstraints(
    result: DistributionResult,
    config: DistributionConfig
  ): DistributionResult {
    const maxRetries = config.maxRetries || 3;
    let retries = 0;
    let constraintViolations = 0;
    const unassigned: LoadedAsset[] = [];

    for (const assignment of result.assignments) {
      const { target, assets } = assignment;
      const constraints = target.constraints;
      
      if (!constraints) {
        assignment.fulfilled = true;
        continue;
      }

      // Check and enforce constraints
      let validAssets = assets;
      let violations: string[] = [];

      // Filter by required types
      if (constraints.requiredTypes && constraints.requiredTypes.length > 0) {
        const beforeCount = validAssets.length;
        validAssets = validAssets.filter(asset => 
          constraints.requiredTypes!.includes(asset.type)
        );
        if (validAssets.length < beforeCount) {
          violations.push(`Filtered ${beforeCount - validAssets.length} assets not matching required types`);
        }
      }

      // Filter by excluded types
      if (constraints.excludedTypes && constraints.excludedTypes.length > 0) {
        const beforeCount = validAssets.length;
        validAssets = validAssets.filter(asset => 
          !constraints.excludedTypes!.includes(asset.type)
        );
        if (validAssets.length < beforeCount) {
          violations.push(`Filtered ${beforeCount - validAssets.length} assets matching excluded types`);
        }
      }

      // Filter by required tags
      if (constraints.requiredTags && constraints.requiredTags.length > 0) {
        const beforeCount = validAssets.length;
        validAssets = validAssets.filter(asset => {
          const assetTags = asset.metadata.tags || [];
          return constraints.requiredTags!.every(tag => assetTags.includes(tag));
        });
        if (validAssets.length < beforeCount) {
          violations.push(`Filtered ${beforeCount - validAssets.length} assets not having required tags`);
        }
      }

      // Filter by excluded tags
      if (constraints.excludedTags && constraints.excludedTags.length > 0) {
        const beforeCount = validAssets.length;
        validAssets = validAssets.filter(asset => {
          const assetTags = asset.metadata.tags || [];
          return !constraints.excludedTags!.some(tag => assetTags.includes(tag));
        });
        if (validAssets.length < beforeCount) {
          violations.push(`Filtered ${beforeCount - validAssets.length} assets having excluded tags`);
        }
      }

      // Apply custom filter
      if (constraints.customFilter) {
        const beforeCount = validAssets.length;
        validAssets = validAssets.filter(constraints.customFilter);
        if (validAssets.length < beforeCount) {
          violations.push(`Filtered ${beforeCount - validAssets.length} assets by custom filter`);
        }
      }

      // Check minimum items constraint
      if (constraints.minItems && validAssets.length < constraints.minItems) {
        violations.push(`Has ${validAssets.length} assets but requires minimum ${constraints.minItems}`);
        
        if (!config.allowPartialFulfillment) {
          // Move all assets to unassigned if we can't meet minimum
          unassigned.push(...validAssets);
          validAssets = [];
        }
      }

      // Enforce maximum items constraint
      if (constraints.maxItems && validAssets.length > constraints.maxItems) {
        const excess = validAssets.splice(constraints.maxItems);
        unassigned.push(...excess);
        violations.push(`Trimmed ${excess.length} assets to respect maximum ${constraints.maxItems}`);
      }

      // Update assignment
      assignment.assets = validAssets;
      assignment.constraintViolations = violations;
      assignment.fulfilled = violations.length === 0 && 
        (!constraints.minItems || validAssets.length >= constraints.minItems);

      if (violations.length > 0) {
        constraintViolations++;
      }
    }

    // Update result metadata
    result.unassigned.push(...unassigned);
    result.metadata.retries = retries;
    result.metadata.constraintViolations = constraintViolations;
    result.metadata.distributionEfficiency = 
      ((result.totalAssets - result.unassigned.length) / result.totalAssets) * 100;

    return result;
  }

  /**
   * Calculate success rate of distribution
   */
  private static calculateSuccessRate(result: DistributionResult): number {
    if (result.assignments.length === 0) return 0;
    
    const fulfilledAssignments = result.assignments.filter(a => a.fulfilled).length;
    return (fulfilledAssignments / result.assignments.length) * 100;
  }

  /**
   * Create seeded random number generator
   */
  private static createSeededRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use the hash as seed for a simple PRNG (Mulberry32)
    let state = Math.abs(hash);
    return function() {
      state |= 0;
      state = state + 0x6D2B79F5 | 0;
      let t = Math.imul(state ^ state >>> 15, state | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /**
   * Create empty result when no assets provided
   */
  private static createEmptyResult(
    targets: DistributionTarget[],
    config: DistributionConfig,
    startTime: number
  ): DistributionResult {
    return {
      assignments: targets.map(target => ({
        target,
        assets: [],
        fulfilled: false,
        constraintViolations: ['No assets to distribute'],
        assignmentReason: 'empty_input'
      })),
      unassigned: [],
      algorithm: config.algorithm,
      seed: config.seed,
      totalAssets: 0,
      totalTargets: targets.length,
      successRate: 0,
      metadata: {
        executionTime: Date.now() - startTime,
        retries: 0,
        constraintViolations: targets.length,
        averageAssignmentsPerTarget: 0,
        distributionEfficiency: 0
      }
    };
  }

  /**
   * Create result with all assets unassigned when no targets provided
   */
  private static createResultWithUnassigned(
    assets: LoadedAsset[],
    config: DistributionConfig,
    startTime: number
  ): DistributionResult {
    return {
      assignments: [],
      unassigned: assets,
      algorithm: config.algorithm,
      seed: config.seed,
      totalAssets: assets.length,
      totalTargets: 0,
      successRate: 0,
      metadata: {
        executionTime: Date.now() - startTime,
        retries: 0,
        constraintViolations: 0,
        averageAssignmentsPerTarget: 0,
        distributionEfficiency: 0
      }
    };
  }

  /**
   * Analyze distribution result and provide insights
   */
  static analyzeDistribution(result: DistributionResult): {
    summary: string;
    insights: string[];
    recommendations: string[];
    statistics: {
      totalAssigned: number;
      totalUnassigned: number;
      avgAssetsPerTarget: number;
      fulfilmentRate: number;
      constraintViolationRate: number;
    };
  } {
    const totalAssigned = result.assignments.reduce((sum, a) => sum + a.assets.length, 0);
    const fulfilledTargets = result.assignments.filter(a => a.fulfilled).length;
    const targetsWithViolations = result.assignments.filter(a => a.constraintViolations.length > 0).length;

    const statistics = {
      totalAssigned,
      totalUnassigned: result.unassigned.length,
      avgAssetsPerTarget: result.totalTargets > 0 ? totalAssigned / result.totalTargets : 0,
      fulfilmentRate: result.successRate,
      constraintViolationRate: result.totalTargets > 0 ? (targetsWithViolations / result.totalTargets) * 100 : 0
    };

    const insights: string[] = [];
    const recommendations: string[] = [];

    // Generate insights
    insights.push(`Used ${result.algorithm} algorithm to distribute ${result.totalAssets} assets to ${result.totalTargets} targets`);
    insights.push(`${fulfilledTargets}/${result.totalTargets} targets were successfully fulfilled`);
    
    if (result.unassigned.length > 0) {
      insights.push(`${result.unassigned.length} assets could not be assigned to any target`);
    }

    if (result.metadata.constraintViolations > 0) {
      insights.push(`${result.metadata.constraintViolations} targets had constraint violations`);
    }

    // Generate recommendations
    if (statistics.fulfilmentRate < 80) {
      recommendations.push('Consider relaxing constraints or using a different distribution algorithm');
    }

    if (statistics.constraintViolationRate > 20) {
      recommendations.push('Review target constraints - many targets have violations');
    }

    if (result.unassigned.length > result.totalAssets * 0.1) {
      recommendations.push('High number of unassigned assets - consider adding more targets or relaxing constraints');
    }

    if (result.algorithm === 'weighted_random' && statistics.avgAssetsPerTarget < 1) {
      recommendations.push('Consider using even_spread algorithm for better asset distribution');
    }

    const summary = `Distribution completed with ${statistics.fulfilmentRate.toFixed(1)}% success rate using ${result.algorithm} algorithm`;

    return {
      summary,
      insights,
      recommendations,
      statistics
    };
  }
}