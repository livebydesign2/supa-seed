/**
 * Asset Pool Engine
 * Phase 2, Checkpoint B1 - Advanced asset management and pool system
 */

import { AssetLoader, LoadedAsset, AssetLoadOptions, AssetLoadResult } from './asset-loader';
import { Logger } from '../../../core/utils/logger';
import path from 'path';

export interface AssetPool {
  id: string;
  name: string;
  description?: string;
  baseDirectory: string;
  patterns: string[];
  assets: LoadedAsset[];
  metadata: {
    totalAssets: number;
    assetTypes: Record<string, number>;
    lastLoaded: Date;
    loadDuration: number;
    averageFileSize: number;
    validationRate: number;
  };
  config: AssetPoolConfig;
}

export interface AssetPoolConfig {
  // Loading configuration
  includeContent: boolean;
  validateAssets: boolean;
  maxFileSize: number;
  allowedExtensions: string[];
  
  // Pool-specific settings
  enableCaching: boolean;
  cacheDirectory?: string;
  refreshInterval?: number;
  
  // Content filtering
  contentFilters?: {
    minContentLength?: number;
    requiredFields?: string[];
    tagFilters?: string[];
    categoryFilters?: string[];
  };
  
  // Performance optimization
  batchSize?: number;
  maxConcurrentLoads?: number;
  memoryLimit?: number;
}

export interface AssetPoolStats {
  totalPools: number;
  totalAssets: number;
  averagePoolSize: number;
  typeDistribution: Record<string, number>;
  healthStatus: 'healthy' | 'warning' | 'error';
  issues: string[];
}

export class AssetPoolEngine {
  private pools: Map<string, AssetPool> = new Map();
  private assetLoader: AssetLoader;
  private defaultConfig: AssetPoolConfig = {
    includeContent: true,
    validateAssets: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.md', '.markdown', '.json', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp'],
    enableCaching: true,
    batchSize: 100,
    maxConcurrentLoads: 5,
    memoryLimit: 100 * 1024 * 1024 // 100MB
  };

  constructor() {
    this.assetLoader = new AssetLoader();
  }

  /**
   * Create a new asset pool
   */
  async createPool(
    id: string,
    name: string,
    baseDirectory: string,
    patterns: string[],
    config?: Partial<AssetPoolConfig>
  ): Promise<AssetPool> {
    Logger.info(`🏊 Creating asset pool: ${name} (${id})`);

    if (this.pools.has(id)) {
      throw new Error(`Asset pool with ID '${id}' already exists`);
    }

    const poolConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();

    // Load initial assets (always include content for filtering, will strip later if needed)
    const needsContentForFiltering = poolConfig.contentFilters?.minContentLength !== undefined;
    const loadOptions: AssetLoadOptions = {
      patterns,
      baseDirectory,
      includeContent: poolConfig.includeContent || needsContentForFiltering,
      validateSchema: poolConfig.validateAssets,
      maxFileSize: poolConfig.maxFileSize,
      allowedExtensions: poolConfig.allowedExtensions
    };

    const loadResult = await this.assetLoader.loadAssets(loadOptions);
    const loadDuration = Date.now() - startTime;

    // Apply content filters if configured
    let filteredAssets = this.applyContentFilters(loadResult.assets, poolConfig);

    // Strip content if it wasn't originally requested (but was loaded for filtering)
    if (!poolConfig.includeContent && needsContentForFiltering) {
      filteredAssets = filteredAssets.map(asset => ({
        ...asset,
        content: undefined // Strip content for all types since it wasn't requested
      }));
    }

    // Calculate metadata
    const metadata = this.calculatePoolMetadata(filteredAssets, loadDuration);

    const pool: AssetPool = {
      id,
      name,
      baseDirectory,
      patterns,
      assets: filteredAssets,
      metadata,
      config: poolConfig
    };

    this.pools.set(id, pool);

    Logger.info(`✅ Asset pool '${name}' created with ${filteredAssets.length} assets (${loadDuration}ms)`);
    return pool;
  }

  /**
   * Get an asset pool by ID
   */
  getPool(id: string): AssetPool | undefined {
    return this.pools.get(id);
  }

  /**
   * List all asset pools
   */
  getAllPools(): AssetPool[] {
    return Array.from(this.pools.values());
  }

  /**
   * Refresh a pool by reloading its assets
   */
  async refreshPool(id: string): Promise<AssetPool> {
    const pool = this.pools.get(id);
    if (!pool) {
      throw new Error(`Asset pool '${id}' not found`);
    }

    Logger.info(`🔄 Refreshing asset pool: ${pool.name}`);

    // Remove the existing pool temporarily
    this.pools.delete(id);

    try {
      // Reload assets using existing configuration
      const updatedPool = await this.createPool(
        id,
        pool.name,
        pool.baseDirectory,
        pool.patterns,
        pool.config
      );

      return updatedPool;
    } catch (error) {
      // If refresh fails, restore the original pool
      this.pools.set(id, pool);
      throw error;
    }
  }

  /**
   * Remove a pool
   */
  removePool(id: string): boolean {
    const existed = this.pools.has(id);
    if (existed) {
      this.pools.delete(id);
      Logger.info(`🗑️  Removed asset pool: ${id}`);
    }
    return existed;
  }

  /**
   * Get assets from multiple pools
   */
  getAssetsFromPools(poolIds: string[]): LoadedAsset[] {
    const assets: LoadedAsset[] = [];
    
    for (const poolId of poolIds) {
      const pool = this.pools.get(poolId);
      if (pool) {
        assets.push(...pool.assets);
      }
    }

    return assets;
  }

  /**
   * Search assets across all pools
   */
  searchAssets(query: {
    pools?: string[];
    types?: ('markdown' | 'json' | 'image' | 'csv')[];
    tags?: string[];
    categories?: string[];
    titleContains?: string;
    contentContains?: string;
    validOnly?: boolean;
  }): LoadedAsset[] {
    const searchPools = query.pools 
      ? query.pools.map(id => this.pools.get(id)).filter(Boolean) as AssetPool[]
      : this.getAllPools();

    let results: LoadedAsset[] = [];

    for (const pool of searchPools) {
      results.push(...pool.assets);
    }

    // Apply filters
    if (query.types) {
      results = results.filter(asset => query.types!.includes(asset.type as any));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(asset => {
        const assetTags = asset.metadata.tags || [];
        return query.tags!.some(tag => assetTags.includes(tag));
      });
    }

    if (query.categories && query.categories.length > 0) {
      results = results.filter(asset => 
        query.categories!.includes(asset.metadata.category || '')
      );
    }

    if (query.titleContains) {
      const titleQuery = query.titleContains.toLowerCase();
      results = results.filter(asset => 
        (asset.metadata.title || '').toLowerCase().includes(titleQuery)
      );
    }

    if (query.contentContains && query.contentContains.trim()) {
      const contentQuery = query.contentContains.toLowerCase();
      results = results.filter(asset => 
        (asset.content || '').toLowerCase().includes(contentQuery)
      );
    }

    if (query.validOnly) {
      results = results.filter(asset => asset.isValid);
    }

    return results;
  }

  /**
   * Get comprehensive statistics about all pools
   */
  getPoolStats(): AssetPoolStats {
    const pools = this.getAllPools();
    const totalAssets = pools.reduce((sum, pool) => sum + pool.assets.length, 0);
    const averagePoolSize = pools.length > 0 ? totalAssets / pools.length : 0;

    const typeDistribution: Record<string, number> = {};
    const issues: string[] = [];

    for (const pool of pools) {
      // Aggregate type distribution
      for (const asset of pool.assets) {
        typeDistribution[asset.type] = (typeDistribution[asset.type] || 0) + 1;
      }

      // Check for pool health issues
      if (pool.metadata.validationRate < 90) {
        issues.push(`Pool '${pool.name}' has low validation rate: ${pool.metadata.validationRate.toFixed(1)}%`);
      }

      if (pool.assets.length === 0) {
        issues.push(`Pool '${pool.name}' contains no assets`);
      }

      if (pool.metadata.averageFileSize > 5 * 1024 * 1024) { // 5MB
        issues.push(`Pool '${pool.name}' has large average file size: ${(pool.metadata.averageFileSize / 1024 / 1024).toFixed(1)}MB`);
      }
    }

    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (issues.length > 0) {
      healthStatus = issues.some(issue => issue.includes('no assets')) ? 'error' : 'warning';
    }

    return {
      totalPools: pools.length,
      totalAssets,
      averagePoolSize,
      typeDistribution,
      healthStatus,
      issues
    };
  }

  /**
   * Apply content filters to assets
   */
  private applyContentFilters(assets: LoadedAsset[], config: AssetPoolConfig): LoadedAsset[] {
    if (!config.contentFilters) {
      return assets;
    }

    let filtered = assets;
    const filters = config.contentFilters;

    // Filter by minimum content length
    if (filters.minContentLength) {
      filtered = filtered.filter(asset => {
        // Images don't have text content, so skip length check
        if (asset.type === 'image') {
          return true;
        }
        // For other types, check content length
        return asset.content && asset.content.length >= filters.minContentLength!;
      });
    }

    // Filter by required fields
    if (filters.requiredFields && filters.requiredFields.length > 0) {
      filtered = filtered.filter(asset => {
        return filters.requiredFields!.every(field => 
          asset.metadata[field] !== undefined && asset.metadata[field] !== null
        );
      });
    }

    // Filter by tags
    if (filters.tagFilters && filters.tagFilters.length > 0) {
      filtered = filtered.filter(asset => {
        const assetTags = asset.metadata.tags || [];
        return filters.tagFilters!.some(tag => assetTags.includes(tag));
      });
    }

    // Filter by categories
    if (filters.categoryFilters && filters.categoryFilters.length > 0) {
      filtered = filtered.filter(asset => 
        filters.categoryFilters!.includes(asset.metadata.category || '')
      );
    }

    if (filtered.length !== assets.length) {
      Logger.info(`🔍 Content filters applied: ${assets.length} → ${filtered.length} assets`);
    }

    return filtered;
  }

  /**
   * Calculate pool metadata and statistics
   */
  private calculatePoolMetadata(assets: LoadedAsset[], loadDuration: number) {
    const assetTypes: Record<string, number> = {};
    let totalSize = 0;
    let validAssets = 0;

    for (const asset of assets) {
      assetTypes[asset.type] = (assetTypes[asset.type] || 0) + 1;
      totalSize += asset.fileSize;
      if (asset.isValid) validAssets++;
    }

    return {
      totalAssets: assets.length,
      assetTypes,
      lastLoaded: new Date(),
      loadDuration,
      averageFileSize: assets.length > 0 ? totalSize / assets.length : 0,
      validationRate: assets.length > 0 ? (validAssets / assets.length) * 100 : 0
    };
  }

  /**
   * Validate pool configuration
   */
  static validatePoolConfig(config: Partial<AssetPoolConfig>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.maxFileSize !== undefined && config.maxFileSize <= 0) {
      errors.push('maxFileSize must be greater than 0');
    }

    if (config.batchSize !== undefined && config.batchSize <= 0) {
      errors.push('batchSize must be greater than 0');
    }

    if (config.maxConcurrentLoads !== undefined && config.maxConcurrentLoads <= 0) {
      errors.push('maxConcurrentLoads must be greater than 0');
    }

    if (config.memoryLimit && config.memoryLimit <= 0) {
      errors.push('memoryLimit must be greater than 0');
    }

    if (config.contentFilters?.minContentLength && config.contentFilters.minContentLength < 0) {
      errors.push('minContentLength must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Export pool configuration for persistence
   */
  exportPoolConfig(id: string): any {
    const pool = this.pools.get(id);
    if (!pool) {
      throw new Error(`Pool '${id}' not found`);
    }

    return {
      id: pool.id,
      name: pool.name,
      description: pool.description,
      baseDirectory: pool.baseDirectory,
      patterns: pool.patterns,
      config: pool.config,
      metadata: {
        totalAssets: pool.metadata.totalAssets,
        assetTypes: pool.metadata.assetTypes,
        lastLoaded: pool.metadata.lastLoaded.toISOString()
      }
    };
  }

  /**
   * Import pool configuration and create pool
   */
  async importPoolConfig(config: any): Promise<AssetPool> {
    const validation = AssetPoolEngine.validatePoolConfig(config.config || {});
    if (!validation.isValid) {
      throw new Error(`Invalid pool configuration: ${validation.errors.join(', ')}`);
    }

    return await this.createPool(
      config.id,
      config.name,
      config.baseDirectory,
      config.patterns,
      config.config
    );
  }
}