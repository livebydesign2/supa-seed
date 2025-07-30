/**
 * Asset Selection Strategies
 * Phase 2, Checkpoint B2 - Intelligent asset selection algorithms
 */

import { LoadedAsset } from './asset-loader';
import { Logger } from '../../../core/utils/logger';

export interface SelectionResult {
  selected: LoadedAsset[];
  total: number;
  strategy: string;
  seed?: string;
  metadata: {
    selectionRate: number;
    avgFileSize: number;
    typeDistribution: Record<string, number>;
    validAssets: number;
    executionTime: number;
  };
}

export interface SelectionOptions {
  count?: number;
  seed?: string;
  ensureDeterministic?: boolean;
  preserveOrder?: boolean;
  respectWeights?: boolean;
}

export interface FilterFunction {
  (asset: LoadedAsset, index: number, assets: LoadedAsset[]): boolean;
}

export interface WeightFunction {
  (asset: LoadedAsset, index: number, assets: LoadedAsset[]): number;
}

export interface WeightedSelectionConfig {
  weightFunction?: WeightFunction;
  weights?: Record<string, number>; // Static weights by asset ID or type
  biases?: {
    byType?: Record<string, number>;
    bySize?: 'prefer_small' | 'prefer_large' | 'neutral';
    byAge?: 'prefer_new' | 'prefer_old' | 'neutral';
    byTags?: Record<string, number>;
  };
}

export class AssetSelectionEngine {
  private static readonly DEFAULT_SEED = 'supa-seed-default';

  /**
   * Select all assets from the pool (no filtering)
   */
  static selectAll(assets: LoadedAsset[], options: SelectionOptions = {}): SelectionResult {
    const startTime = Date.now();
    
    let selected = [...assets];
    
    // Apply ordering if requested
    if (!options.preserveOrder) {
      // Default ordering: by last modified date (newest first)
      selected.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    // Apply count limit if specified
    if (options.count && options.count < selected.length) {
      selected = selected.slice(0, options.count);
    }

    const executionTime = Date.now() - startTime;
    
    return {
      selected,
      total: assets.length,
      strategy: 'all',
      metadata: this.calculateSelectionMetadata(selected, assets.length, executionTime)
    };
  }

  /**
   * Select random assets with optional seed for deterministic results
   */
  static selectRandom(
    assets: LoadedAsset[], 
    count: number, 
    options: SelectionOptions = {}
  ): SelectionResult {
    const startTime = Date.now();
    
    if (count >= assets.length) {
      // If requesting more than available, return all
      return this.selectAll(assets, options);
    }

    const seed = options.seed || this.DEFAULT_SEED;
    const rng = this.createSeededRandom(seed);
    
    // Create shuffled copy for selection
    const shuffled = [...assets];
    
    // Fisher-Yates shuffle with seeded random
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, count);
    
    // Restore original order if requested
    if (options.preserveOrder) {
      selected.sort((a, b) => {
        const aIndex = assets.indexOf(a);
        const bIndex = assets.indexOf(b);
        return aIndex - bIndex;
      });
    }

    const executionTime = Date.now() - startTime;

    return {
      selected,
      total: assets.length,
      strategy: 'random',
      seed,
      metadata: this.calculateSelectionMetadata(selected, assets.length, executionTime)
    };
  }

  /**
   * Select assets using custom filter functions
   */
  static selectFiltered(
    assets: LoadedAsset[],
    filters: FilterFunction[],
    options: SelectionOptions = {}
  ): SelectionResult {
    const startTime = Date.now();
    
    let filtered = assets;
    
    // Apply each filter sequentially
    for (const filter of filters) {
      filtered = filtered.filter((asset, index, array) => {
        try {
          return filter(asset, index, array);
        } catch (error: any) {
          Logger.warn(`Filter function error for asset ${asset.id}: ${error.message}`);
          return false; // Exclude asset if filter fails
        }
      });
    }

    // Apply count limit if specified
    if (options.count && options.count < filtered.length) {
      // If deterministic is requested, use seeded selection
      if (options.ensureDeterministic) {
        const randomResult = this.selectRandom(filtered, options.count, options);
        randomResult.strategy = 'filtered+random';
        return randomResult;
      } else {
        filtered = filtered.slice(0, options.count);
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      selected: filtered,
      total: assets.length,
      strategy: 'filtered',
      metadata: this.calculateSelectionMetadata(filtered, assets.length, executionTime)
    };
  }

  /**
   * Select specific assets by file names or IDs
   */
  static selectManual(
    assets: LoadedAsset[],
    identifiers: string[],
    options: SelectionOptions = {}
  ): SelectionResult {
    const startTime = Date.now();
    
    const selected: LoadedAsset[] = [];
    const notFound: string[] = [];

    for (const identifier of identifiers) {
      // Try to find by ID first, then by filename, then by file path
      const asset = assets.find(a => 
        a.id === identifier ||
        a.metadata.filename === identifier ||
        a.filePath.includes(identifier) ||
        a.filePath === identifier
      );

      if (asset) {
        selected.push(asset);
      } else {
        notFound.push(identifier);
      }
    }

    if (notFound.length > 0) {
      Logger.warn(`Manual selection: ${notFound.length} assets not found: ${notFound.join(', ')}`);
    }

    // Preserve order of identifiers unless specified otherwise
    if (!options.preserveOrder) {
      // Sort by original asset order
      selected.sort((a, b) => {
        const aIndex = assets.indexOf(a);
        const bIndex = assets.indexOf(b);
        return aIndex - bIndex;
      });
    }

    const executionTime = Date.now() - startTime;

    return {
      selected,
      total: assets.length,
      strategy: 'manual',
      metadata: this.calculateSelectionMetadata(selected, assets.length, executionTime)
    };
  }

  /**
   * Select assets using weighted probability distribution
   */
  static selectWeighted(
    assets: LoadedAsset[],
    count: number,
    config: WeightedSelectionConfig,
    options: SelectionOptions = {}
  ): SelectionResult {
    const startTime = Date.now();
    
    if (count >= assets.length) {
      return this.selectAll(assets, options);
    }

    // Calculate weights for each asset
    const weights = assets.map((asset, index) => {
      let weight = 1; // Base weight

      // Apply custom weight function if provided
      if (config.weightFunction) {
        try {
          weight = config.weightFunction(asset, index, assets);
        } catch (error: any) {
          Logger.warn(`Weight function error for asset ${asset.id}: ${error.message}`);
          weight = 1; // Fallback to base weight
        }
      }

      // Apply static weights
      if (config.weights) {
        const staticWeight = config.weights[asset.id] || config.weights[asset.type];
        if (staticWeight !== undefined) {
          weight *= staticWeight;
        }
      }

      // Apply biases
      if (config.biases) {
        weight *= this.calculateBiasWeight(asset, config.biases, assets);
      }

      return Math.max(0, weight); // Ensure non-negative
    });

    // Perform weighted selection
    const selected = this.performWeightedSelection(assets, weights, count, options);

    const executionTime = Date.now() - startTime;

    return {
      selected,
      total: assets.length,
      strategy: 'weighted',
      seed: options.seed,
      metadata: this.calculateSelectionMetadata(selected, assets.length, executionTime)
    };
  }

  /**
   * Create a seeded random number generator
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
   * Calculate bias weight based on asset characteristics
   */
  private static calculateBiasWeight(
    asset: LoadedAsset, 
    biases: NonNullable<WeightedSelectionConfig['biases']>,
    allAssets: LoadedAsset[]
  ): number {
    let biasMultiplier = 1;

    // Type bias
    if (biases.byType && biases.byType[asset.type]) {
      biasMultiplier *= biases.byType[asset.type];
    }

    // Size bias
    if (biases.bySize && biases.bySize !== 'neutral') {
      const avgSize = allAssets.reduce((sum, a) => sum + a.fileSize, 0) / allAssets.length;
      if (biases.bySize === 'prefer_small' && asset.fileSize < avgSize) {
        biasMultiplier *= 1.5;
      } else if (biases.bySize === 'prefer_large' && asset.fileSize > avgSize) {
        biasMultiplier *= 1.5;
      }
    }

    // Age bias
    if (biases.byAge && biases.byAge !== 'neutral') {
      const now = Date.now();
      const avgAge = allAssets.reduce((sum, a) => sum + (now - a.lastModified.getTime()), 0) / allAssets.length;
      const assetAge = now - asset.lastModified.getTime();
      
      if (biases.byAge === 'prefer_new' && assetAge < avgAge) {
        biasMultiplier *= 1.5;
      } else if (biases.byAge === 'prefer_old' && assetAge > avgAge) {
        biasMultiplier *= 1.5;
      }
    }

    // Tag bias
    if (biases.byTags && asset.metadata.tags) {
      const tags = Array.isArray(asset.metadata.tags) ? asset.metadata.tags : [];
      for (const tag of tags) {
        if (biases.byTags[tag]) {
          biasMultiplier *= biases.byTags[tag];
        }
      }
    }

    return biasMultiplier;
  }

  /**
   * Perform weighted selection using cumulative probability
   */
  private static performWeightedSelection(
    assets: LoadedAsset[],
    weights: number[],
    count: number,
    options: SelectionOptions
  ): LoadedAsset[] {
    const seed = options.seed || this.DEFAULT_SEED;
    const rng = this.createSeededRandom(seed);

    // Calculate cumulative weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight === 0) {
      Logger.warn('All assets have zero weight, falling back to random selection');
      return this.selectRandom(assets, count, options).selected;
    }

    const cumulativeWeights = weights.reduce((acc, weight, index) => {
      acc.push((acc[index - 1] || 0) + weight);
      return acc;
    }, [] as number[]);

    const selected: LoadedAsset[] = [];
    const selectedIndices = new Set<number>();

    // Perform selection
    for (let i = 0; i < count && selectedIndices.size < assets.length; i++) {
      let attempts = 0;
      let selectedIndex = -1;

      // Try to find a unique asset (with reasonable attempt limit)
      while (attempts < 100 && (selectedIndex === -1 || selectedIndices.has(selectedIndex))) {
        const random = rng() * totalWeight;
        selectedIndex = cumulativeWeights.findIndex(cw => cw >= random);
        attempts++;
      }

      if (selectedIndex !== -1 && !selectedIndices.has(selectedIndex)) {
        selected.push(assets[selectedIndex]);
        selectedIndices.add(selectedIndex);
      }
    }

    // If we couldn't get enough unique assets, fill with remaining assets
    if (selected.length < count) {
      const remaining = assets.filter((_, index) => !selectedIndices.has(index));
      selected.push(...remaining.slice(0, count - selected.length));
    }

    return selected;
  }

  /**
   * Calculate metadata for selection results
   */
  private static calculateSelectionMetadata(
    selected: LoadedAsset[],
    totalAssets: number,
    executionTime: number
  ) {
    const typeDistribution: Record<string, number> = {};
    let totalSize = 0;
    let validAssets = 0;

    for (const asset of selected) {
      typeDistribution[asset.type] = (typeDistribution[asset.type] || 0) + 1;
      totalSize += asset.fileSize;
      if (asset.isValid) validAssets++;
    }

    return {
      selectionRate: totalAssets > 0 ? (selected.length / totalAssets) * 100 : 0,
      avgFileSize: selected.length > 0 ? totalSize / selected.length : 0,
      typeDistribution,
      validAssets,
      executionTime
    };
  }

  /**
   * Create common filter functions for convenience
   */
  static createFilters = {
    /**
     * Filter by asset type
     */
    byType: (types: ('markdown' | 'json' | 'csv' | 'image')[]): FilterFunction => {
      return (asset) => types.includes(asset.type as any);
    },

    /**
     * Filter by tags (asset must have at least one of the specified tags)
     */
    byTags: (tags: string[]): FilterFunction => {
      return (asset) => {
        const assetTags = asset.metadata.tags || [];
        return tags.some(tag => assetTags.includes(tag));
      };
    },

    /**
     * Filter by required tags (asset must have all specified tags)
     */
    byRequiredTags: (tags: string[]): FilterFunction => {
      return (asset) => {
        const assetTags = asset.metadata.tags || [];
        return tags.every(tag => assetTags.includes(tag));
      };
    },

    /**
     * Filter by category
     */
    byCategory: (categories: string[]): FilterFunction => {
      return (asset) => categories.includes(asset.metadata.category || '');
    },

    /**
     * Filter by file size range
     */
    bySizeRange: (minSize: number, maxSize: number): FilterFunction => {
      return (asset) => asset.fileSize >= minSize && asset.fileSize <= maxSize;
    },

    /**
     * Filter by date range
     */
    byDateRange: (startDate: Date, endDate: Date): FilterFunction => {
      return (asset) => {
        const assetDate = asset.lastModified;
        return assetDate >= startDate && assetDate <= endDate;
      };
    },

    /**
     * Filter by content length
     */
    byContentLength: (minLength: number, maxLength?: number): FilterFunction => {
      return (asset) => {
        if (!asset.content) return false;
        const length = asset.content.length;
        return length >= minLength && (maxLength === undefined || length <= maxLength);
      };
    },

    /**
     * Filter valid assets only
     */
    validOnly: (): FilterFunction => {
      return (asset) => asset.isValid;
    },

    /**
     * Filter by metadata field existence
     */
    hasField: (fieldName: string): FilterFunction => {
      return (asset) => asset.metadata[fieldName] !== undefined;
    },

    /**
     * Filter by metadata field value
     */
    fieldEquals: (fieldName: string, value: any): FilterFunction => {
      return (asset) => asset.metadata[fieldName] === value;
    }
  };

  /**
   * Create common weight functions for convenience
   */
  static createWeightFunctions = {
    /**
     * Weight by file size (larger files get higher weight)
     */
    byFileSize: (): WeightFunction => {
      return (asset, index, assets) => {
        const maxSize = Math.max(...assets.map(a => a.fileSize));
        return maxSize > 0 ? asset.fileSize / maxSize : 1;
      };
    },

    /**
     * Weight by recency (newer files get higher weight)
     */
    byRecency: (): WeightFunction => {
      return (asset, index, assets) => {
        const now = Date.now();
        const maxAge = Math.max(...assets.map(a => now - a.lastModified.getTime()));
        const assetAge = now - asset.lastModified.getTime();
        return maxAge > 0 ? 1 - (assetAge / maxAge) : 1;
      };
    },

    /**
     * Weight by tag count (more tags = higher weight)
     */
    byTagCount: (): WeightFunction => {
      return (asset) => {
        const tags = asset.metadata.tags || [];
        return Array.isArray(tags) ? Math.max(1, tags.length) : 1;
      };
    },

    /**
     * Weight by content length
     */
    byContentLength: (): WeightFunction => {
      return (asset, index, assets) => {
        if (!asset.content) return 0.1; // Low weight for assets without content
        const maxLength = Math.max(...assets.map(a => a.content?.length || 0));
        return maxLength > 0 ? asset.content.length / maxLength : 1;
      };
    }
  };
}