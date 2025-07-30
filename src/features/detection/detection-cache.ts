/**
 * Detection Result Caching System for Epic 2: Smart Platform Detection Engine
 * Provides caching and reuse capabilities for detection results to improve performance
 * Part of Task 2.3.4: Add detection result caching and reuse capabilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../../core/utils/logger';
// Import UnifiedDetectionResult from detection-integration since it's defined there
import type { UnifiedDetectionResult } from './detection-integration';
import type { AutoConfigurationResult } from './auto-configurator';

/**
 * Cache entry for detection results
 */
export interface DetectionCacheEntry {
  /** Unique cache key */
  key: string;
  
  /** Database schema hash for invalidation */
  schemaHash: string;
  
  /** Database URL for validation */
  databaseUrl: string;
  
  /** Detection results */
  detectionResults: UnifiedDetectionResult;
  
  /** Auto-configuration results */
  autoConfiguration?: AutoConfigurationResult;
  
  /** Cache metadata */
  metadata: {
    /** Creation timestamp */
    createdAt: string;
    
    /** Last access timestamp */
    lastAccessedAt: string;
    
    /** Access count */
    accessCount: number;
    
    /** Detection engine version */
    engineVersion: string;
    
    /** Cache TTL in milliseconds */
    ttl: number;
    
    /** Confidence level for cache validity */
    confidenceLevel: string;
  };
}

/**
 * Cache configuration options
 */
export interface DetectionCacheOptions {
  /** Cache directory path */
  cacheDir: string;
  
  /** Default TTL for cache entries (ms) */
  defaultTTL: number;
  
  /** Maximum cache size in bytes */
  maxCacheSize: number;
  
  /** Maximum number of cache entries */
  maxEntries: number;
  
  /** Enable cache compression */
  enableCompression: boolean;
  
  /** Cache invalidation strategy */
  invalidationStrategy: 'time' | 'schema_change' | 'hybrid';
  
  /** Minimum confidence level to cache */
  minConfidenceToCache: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Total cache entries */
  totalEntries: number;
  
  /** Cache size in bytes */
  cacheSize: number;
  
  /** Cache hit rate */
  hitRate: number;
  
  /** Total cache hits */
  totalHits: number;
  
  /** Total cache misses */
  totalMisses: number;
  
  /** Average cache age */
  averageAge: number;
  
  /** Oldest cache entry age */
  oldestEntry: number;
  
  /** Most frequently accessed entry */
  mostFrequentKey: string;
}

/**
 * Main Detection Cache Manager
 */
export class DetectionCacheManager {
  private cacheDir: string;
  private options: DetectionCacheOptions;
  private statistics: {
    hits: number;
    misses: number;
    totalAccesses: number;
  } = { hits: 0, misses: 0, totalAccesses: 0 };
  
  constructor(options: Partial<DetectionCacheOptions> = {}) {
    this.options = this.mergeWithDefaults(options);
    this.cacheDir = this.options.cacheDir;
    this.ensureCacheDirectory();
  }
  
  /**
   * Generate cache key for detection request
   */
  generateCacheKey(
    databaseUrl: string,
    schemaHash: string,
    options?: any
  ): string {
    const keyData = {
      url: this.normalizeUrl(databaseUrl),
      schema: schemaHash,
      options: options || {}
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex')
      .substring(0, 16);
  }
  
  /**
   * Store detection results in cache
   */
  async store(
    cacheKey: string,
    databaseUrl: string,
    schemaHash: string,
    detectionResults: UnifiedDetectionResult,
    autoConfiguration?: AutoConfigurationResult,
    ttl?: number
  ): Promise<void> {
    try {
      // Check if results meet minimum confidence threshold
      if (detectionResults.integration.overallConfidence < this.options.minConfidenceToCache) {
        Logger.debug(`Not caching detection results due to low confidence: ${detectionResults.integration.overallConfidence}`);
        return;
      }
      
      const entry: DetectionCacheEntry = {
        key: cacheKey,
        schemaHash,
        databaseUrl: this.normalizeUrl(databaseUrl),
        detectionResults,
        autoConfiguration,
        metadata: {
          createdAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          accessCount: 0,
          engineVersion: '2.5.0',
          ttl: ttl || this.options.defaultTTL,
          confidenceLevel: detectionResults.integration.overallConfidence >= 0.8 ? 'high' : 'medium'
        }
      };
      
      // Clean up old entries before storing new ones
      await this.cleanupExpiredEntries();
      await this.enforceMaxSize();
      
      // Store the entry
      const filePath = this.getCacheFilePath(cacheKey);
      const serialized = JSON.stringify(entry, null, 2);
      
      await fs.promises.writeFile(filePath, serialized, 'utf8');
      
      Logger.debug(`Cached detection results with key: ${cacheKey}`);
      
    } catch (error: any) {
      Logger.warn('Failed to store detection cache entry:', error.message);
    }
  }
  
  /**
   * Retrieve detection results from cache
   */
  async retrieve(
    cacheKey: string,
    databaseUrl?: string,
    currentSchemaHash?: string
  ): Promise<DetectionCacheEntry | null> {
    try {
      this.statistics.totalAccesses++;
      
      const filePath = this.getCacheFilePath(cacheKey);
      
      if (!fs.existsSync(filePath)) {
        this.statistics.misses++;
        return null;
      }
      
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const entry: DetectionCacheEntry = JSON.parse(fileContent);
      
      // Validate cache entry
      const validationResult = this.validateCacheEntry(entry, databaseUrl, currentSchemaHash);
      
      if (!validationResult.valid) {
        Logger.debug(`Cache entry invalid: ${validationResult.reason}`);
        this.statistics.misses++;
        
        // Remove invalid entry
        await this.remove(cacheKey);
        return null;
      }
      
      // Update access metadata
      entry.metadata.lastAccessedAt = new Date().toISOString();
      entry.metadata.accessCount++;
      
      // Update the file with new access data
      await fs.promises.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf8');
      
      this.statistics.hits++;
      Logger.debug(`Cache hit for key: ${cacheKey}`);
      
      return entry;
      
    } catch (error: any) {
      Logger.debug('Failed to retrieve cache entry:', error.message);
      this.statistics.misses++;
      return null;
    }
  }
  
  /**
   * Check if a cache entry exists and is valid
   */
  async has(
    cacheKey: string,
    databaseUrl?: string,
    currentSchemaHash?: string
  ): Promise<boolean> {
    const entry = await this.retrieve(cacheKey, databaseUrl, currentSchemaHash);
    return entry !== null;
  }
  
  /**
   * Remove a cache entry
   */
  async remove(cacheKey: string): Promise<void> {
    try {
      const filePath = this.getCacheFilePath(cacheKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        Logger.debug(`Removed cache entry: ${cacheKey}`);
      }
    } catch (error: any) {
      Logger.debug('Failed to remove cache entry:', error.message);
    }
  }
  
  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache.json'));
      
      await Promise.all(
        cacheFiles.map(file => 
          fs.promises.unlink(path.join(this.cacheDir, file))
        )
      );
      
      // Reset statistics
      this.statistics = { hits: 0, misses: 0, totalAccesses: 0 };
      
      Logger.info(`Cleared ${cacheFiles.length} cache entries`);
      
    } catch (error: any) {
      Logger.error('Failed to clear cache:', error.message);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStatistics(): Promise<CacheStatistics> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache.json'));
      
      let totalSize = 0;
      let totalAge = 0;
      let oldestEntry = 0;
      let mostFrequentKey = '';
      let maxAccessCount = 0;
      
      for (const file of cacheFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
        
        try {
          const entry: DetectionCacheEntry = JSON.parse(
            await fs.promises.readFile(filePath, 'utf8')
          );
          
          const age = Date.now() - new Date(entry.metadata.createdAt).getTime();
          totalAge += age;
          oldestEntry = Math.max(oldestEntry, age);
          
          if (entry.metadata.accessCount > maxAccessCount) {
            maxAccessCount = entry.metadata.accessCount;
            mostFrequentKey = entry.key;
          }
        } catch {
          // Skip corrupted entries
        }
      }
      
      const hitRate = this.statistics.totalAccesses > 0 
        ? this.statistics.hits / this.statistics.totalAccesses 
        : 0;
      
      return {
        totalEntries: cacheFiles.length,
        cacheSize: totalSize,
        hitRate,
        totalHits: this.statistics.hits,
        totalMisses: this.statistics.misses,
        averageAge: cacheFiles.length > 0 ? totalAge / cacheFiles.length : 0,
        oldestEntry,
        mostFrequentKey
      };
      
    } catch (error: any) {
      Logger.error('Failed to get cache statistics:', error.message);
      throw error;
    }
  }
  
  /**
   * Cleanup expired cache entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache.json'));
      
      let removedCount = 0;
      const now = Date.now();
      
      for (const file of cacheFiles) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const entry: DetectionCacheEntry = JSON.parse(
            await fs.promises.readFile(filePath, 'utf8')
          );
          
          const createdAt = new Date(entry.metadata.createdAt).getTime();
          const ttl = entry.metadata.ttl;
          
          if (now - createdAt > ttl) {
            await fs.promises.unlink(filePath);
            removedCount++;
          }
        } catch {
          // Remove corrupted entries
          await fs.promises.unlink(path.join(this.cacheDir, file));
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        Logger.debug(`Cleaned up ${removedCount} expired cache entries`);
      }
      
      return removedCount;
      
    } catch (error: any) {
      Logger.debug('Failed to cleanup expired entries:', error.message);
      return 0;
    }
  }
  
  /**
   * Validate cache entry against current conditions
   */
  private validateCacheEntry(
    entry: DetectionCacheEntry,
    databaseUrl?: string,
    currentSchemaHash?: string
  ): { valid: boolean; reason?: string } {
    // Check TTL
    const now = Date.now();
    const createdAt = new Date(entry.metadata.createdAt).getTime();
    
    if (now - createdAt > entry.metadata.ttl) {
      return { valid: false, reason: 'Entry expired' };
    }
    
    // Check database URL if provided
    if (databaseUrl && this.normalizeUrl(databaseUrl) !== entry.databaseUrl) {
      return { valid: false, reason: 'Database URL mismatch' };
    }
    
    // Check schema hash if provided (for schema change detection)
    if (this.options.invalidationStrategy !== 'time' && currentSchemaHash) {
      if (entry.schemaHash !== currentSchemaHash) {
        return { valid: false, reason: 'Schema has changed' };
      }
    }
    
    // Check engine version compatibility
    if (entry.metadata.engineVersion !== '2.5.0') {
      return { valid: false, reason: 'Engine version mismatch' };
    }
    
    return { valid: true };
  }
  
  /**
   * Enforce maximum cache size
   */
  private async enforceMaxSize(): Promise<void> {
    try {
      const stats = await this.getStatistics();
      
      if (stats.cacheSize <= this.options.maxCacheSize && stats.totalEntries <= this.options.maxEntries) {
        return;
      }
      
      // Get all cache files sorted by last access time (oldest first)
      const files = await fs.promises.readdir(this.cacheDir);
      const cacheFiles = files.filter(file => file.endsWith('.cache.json'));
      
      const fileData: Array<{ file: string; lastAccessed: number; accessCount: number }> = [];
      
      for (const file of cacheFiles) {
        try {
          const filePath = path.join(this.cacheDir, file);
          const entry: DetectionCacheEntry = JSON.parse(
            await fs.promises.readFile(filePath, 'utf8')
          );
          
          fileData.push({
            file,
            lastAccessed: new Date(entry.metadata.lastAccessedAt).getTime(),
            accessCount: entry.metadata.accessCount
          });
        } catch {
          // Mark corrupted files for removal
          fileData.push({
            file,
            lastAccessed: 0,
            accessCount: 0
          });
        }
      }
      
      // Sort by least recently used and least frequently accessed
      fileData.sort((a, b) => {
        // First, prioritize by access count (lower = remove first)
        if (a.accessCount !== b.accessCount) {
          return a.accessCount - b.accessCount;
        }
        // Then by last access time (older = remove first)
        return a.lastAccessed - b.lastAccessed;
      });
      
      // Remove oldest entries until we're under limits
      let removedCount = 0;
      while (fileData.length > removedCount && 
             (stats.totalEntries - removedCount > this.options.maxEntries ||
              stats.cacheSize > this.options.maxCacheSize)) {
        
        const toRemove = fileData[removedCount];
        await fs.promises.unlink(path.join(this.cacheDir, toRemove.file));
        removedCount++;
      }
      
      if (removedCount > 0) {
        Logger.debug(`Removed ${removedCount} cache entries to enforce size limits`);
      }
      
    } catch (error: any) {
      Logger.debug('Failed to enforce cache size limits:', error.message);
    }
  }
  
  /**
   * Get cache file path for a given key
   */
  private getCacheFilePath(cacheKey: string): string {
    return path.join(this.cacheDir, `${cacheKey}.cache.json`);
  }
  
  /**
   * Normalize database URL for consistent caching
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove credentials and normalize format
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
  
  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    } catch (error: any) {
      Logger.warn('Failed to create cache directory:', error.message);
      // Fall back to temp directory
      this.cacheDir = path.join(process.cwd(), '.supa-seed-cache');
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
    }
  }
  
  /**
   * Merge options with defaults
   */
  private mergeWithDefaults(options: Partial<DetectionCacheOptions>): DetectionCacheOptions {
    const defaultCacheDir = path.join(process.cwd(), '.supa-seed-cache');
    
    return {
      cacheDir: options.cacheDir || defaultCacheDir,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxEntries: 100,
      enableCompression: false,
      invalidationStrategy: 'hybrid',
      minConfidenceToCache: 0.6,
      ...options
    };
  }
}

/**
 * Utility functions for cache management
 */
export class DetectionCacheUtils {
  
  /**
   * Generate schema hash for cache invalidation
   */
  static async generateSchemaHash(client: any): Promise<string> {
    try {
      // Get basic schema information for hashing
      const { data: tables } = await client
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .order('table_name');
      
      const { data: columns } = await client
        .from('information_schema.columns')
        .select('table_name, column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .order('table_name, ordinal_position');
      
      // Create a stable hash from schema structure
      const schemaData = {
        tables: tables || [],
        columns: columns || []
      };
      
      return crypto
        .createHash('sha256')
        .update(JSON.stringify(schemaData))
        .digest('hex');
        
    } catch (error: any) {
      Logger.debug('Failed to generate schema hash:', error.message);
      // Return timestamp-based hash as fallback
      return crypto
        .createHash('sha256')
        .update(Date.now().toString())
        .digest('hex');
    }
  }
  
  /**
   * Format cache statistics for display
   */
  static formatStatistics(stats: CacheStatistics): string {
    const lines: string[] = [];
    
    lines.push('📊 Detection Cache Statistics');
    lines.push('─'.repeat(40));
    lines.push(`📋 Total Entries: ${stats.totalEntries}`);
    lines.push(`💾 Cache Size: ${this.formatBytes(stats.cacheSize)}`);
    lines.push(`🎯 Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    lines.push(`✅ Cache Hits: ${stats.totalHits}`);
    lines.push(`❌ Cache Misses: ${stats.totalMisses}`);
    
    if (stats.totalEntries > 0) {
      lines.push(`⏰ Average Age: ${this.formatDuration(stats.averageAge)}`);
      lines.push(`⏳ Oldest Entry: ${this.formatDuration(stats.oldestEntry)}`);
      if (stats.mostFrequentKey) {
        lines.push(`🔥 Most Used: ${stats.mostFrequentKey.substring(0, 8)}...`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format bytes for human-readable display
   */
  private static formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
  
  /**
   * Format duration for human-readable display
   */
  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

/**
 * Default cache options
 */
export const DEFAULT_CACHE_OPTIONS: DetectionCacheOptions = {
  cacheDir: path.join(process.cwd(), '.supa-seed-cache'),
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 100,
  enableCompression: false,
  invalidationStrategy: 'hybrid',
  minConfidenceToCache: 0.6
};