/**
 * AI Response Cache System
 * Phase 5, Checkpoint E1 - Intelligent caching to avoid regeneration and improve performance
 */

import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface CacheEntry {
  key: string;
  prompt: string;
  response: any;
  model: string;
  timestamp: Date;
  ttl: number; // Time to live in seconds
  metadata: {
    responseTime: number;
    tokenCount?: number;
    quality?: number; // 0-100 quality score
    usage_count: number;
    last_accessed: Date;
  };
  tags: string[]; // For categorization and bulk operations
}

export interface CacheOptions {
  ttl?: number; // Default TTL in seconds
  maxSize?: number; // Maximum cache entries
  persistToDisk?: boolean;
  cacheDirectory?: string;
  compressionEnabled?: boolean;
  qualityThreshold?: number; // Minimum quality to cache
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalSize: number; // In bytes
  oldestEntry?: Date;
  newestEntry?: Date;
  averageResponseTime: number;
  topTags: Array<{ tag: string; count: number }>;
}

export interface SearchOptions {
  tags?: string[];
  model?: string;
  minQuality?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  limit?: number;
  sortBy?: 'timestamp' | 'quality' | 'usage' | 'relevance';
}

export class AIResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private options: Required<CacheOptions>;
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };

  constructor(options?: CacheOptions) {
    this.options = {
      ttl: 24 * 60 * 60, // 24 hours default
      maxSize: 1000,
      persistToDisk: true,
      cacheDirectory: path.join(process.cwd(), '.supa-seed', 'ai-cache'),
      compressionEnabled: true,
      qualityThreshold: 70,
      ...options
    };

    this.initializeCache();
    this.startCleanupInterval();

    Logger.info(`🧠 AI Cache initialized: ${this.options.maxSize} entries, ${this.options.ttl}s TTL`);
  }

  /**
   * Get cached response for a prompt
   */
  async get(prompt: string, model?: string, tags?: string[]): Promise<any | null> {
    this.stats.totalRequests++;
    
    const key = this.generateKey(prompt, model, tags);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      Logger.debug(`🧠 Cache miss for key: ${key.substring(0, 16)}...`);
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      Logger.debug(`🧠 Cache expired for key: ${key.substring(0, 16)}...`);
      return null;
    }

    // Update access statistics
    entry.metadata.usage_count++;
    entry.metadata.last_accessed = new Date();
    
    this.stats.hits++;
    Logger.debug(`🧠 Cache hit for key: ${key.substring(0, 16)}... (used ${entry.metadata.usage_count} times)`);
    
    return entry.response;
  }

  /**
   * Store response in cache
   */
  async set(
    prompt: string, 
    response: any, 
    model: string,
    responseTime: number,
    options?: {
      ttl?: number;
      tags?: string[];
      quality?: number;
      tokenCount?: number;
    }
  ): Promise<boolean> {
    const quality = options?.quality || 100;
    
    // Don't cache low-quality responses
    if (quality < this.options.qualityThreshold) {
      Logger.debug(`🧠 Skipping cache: quality ${quality} below threshold ${this.options.qualityThreshold}`);
      return false;
    }

    const key = this.generateKey(prompt, model, options?.tags);
    const ttl = options?.ttl || this.options.ttl;
    
    const entry: CacheEntry = {
      key,
      prompt,
      response,
      model,
      timestamp: new Date(),
      ttl,
      metadata: {
        responseTime,
        tokenCount: options?.tokenCount,
        quality,
        usage_count: 0,
        last_accessed: new Date()
      },
      tags: options?.tags || []
    };

    // Ensure cache size limit
    if (this.cache.size >= this.options.maxSize) {
      await this.evictLeastUsed();
    }

    this.cache.set(key, entry);
    
    // Persist to disk if enabled
    if (this.options.persistToDisk) {
      await this.persistEntry(entry);
    }

    Logger.debug(`🧠 Cached response: ${key.substring(0, 16)}... (quality: ${quality})`);
    return true;
  }

  /**
   * Search cached entries
   */
  search(query: string, options?: SearchOptions): CacheEntry[] {
    const results: CacheEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.cache.values()) {
      // Skip expired entries
      if (this.isExpired(entry)) continue;

      // Apply filters
      if (options?.tags && !options.tags.some(tag => entry.tags.includes(tag))) {
        continue;
      }
      
      if (options?.model && entry.model !== options.model) {
        continue;
      }
      
      if (options?.minQuality && (entry.metadata.quality || 0) < options.minQuality) {
        continue;
      }
      
      if (options?.dateRange) {
        const entryDate = entry.timestamp;
        if (entryDate < options.dateRange.from || entryDate > options.dateRange.to) {
          continue;
        }
      }

      // Check if query matches prompt or response content
      if (entry.prompt.toLowerCase().includes(queryLower) ||
          JSON.stringify(entry.response).toLowerCase().includes(queryLower)) {
        results.push(entry);
      }
    }

    // Sort results
    if (options?.sortBy) {
      results.sort((a, b) => {
        switch (options.sortBy) {
          case 'timestamp':
            return b.timestamp.getTime() - a.timestamp.getTime();
          case 'quality':
            return (b.metadata.quality || 0) - (a.metadata.quality || 0);
          case 'usage':
            return b.metadata.usage_count - a.metadata.usage_count;
          default:
            return 0;
        }
      });
    }

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get similar cached responses using basic text similarity
   */
  findSimilar(prompt: string, threshold: number = 0.6, limit: number = 5): CacheEntry[] {
    const results: Array<{ entry: CacheEntry; similarity: number }> = [];

    for (const entry of this.cache.values()) {
      if (this.isExpired(entry)) continue;

      const similarity = this.calculateSimilarity(prompt, entry.prompt);
      if (similarity >= threshold) {
        results.push({ entry, similarity });
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.entry);
  }

  /**
   * Clear cache entries by criteria
   */
  clear(criteria?: {
    tags?: string[];
    model?: string;
    olderThan?: Date;
    qualityBelow?: number;
  }): number {
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      let shouldRemove = false;

      if (!criteria) {
        shouldRemove = true;
      } else {
        if (criteria.tags && criteria.tags.some(tag => entry.tags.includes(tag))) {
          shouldRemove = true;
        }
        if (criteria.model && entry.model === criteria.model) {
          shouldRemove = true;
        }
        if (criteria.olderThan && entry.timestamp < criteria.olderThan) {
          shouldRemove = true;
        }
        if (criteria.qualityBelow && (entry.metadata.quality || 100) < criteria.qualityBelow) {
          shouldRemove = true;
        }
      }

      if (shouldRemove) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    Logger.info(`🧠 Cleared ${removedCount} cache entries`);
    return removedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values()).filter(e => !this.isExpired(e));
    const hitRate = this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0;
    
    // Calculate total size (approximate)
    const totalSize = entries.reduce((size, entry) => {
      return size + JSON.stringify(entry).length;
    }, 0);

    // Get top tags
    const tagCounts = new Map<string, number>();
    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average response time
    const avgResponseTime = entries.length > 0 
      ? entries.reduce((sum, e) => sum + e.metadata.responseTime, 0) / entries.length
      : 0;

    const timestamps = entries.map(e => e.timestamp);
    
    return {
      totalEntries: entries.length,
      hitRate,
      missRate: 1 - hitRate,
      totalSize,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined,      averageResponseTime: avgResponseTime,
      topTags
    };
  }

  /**
   * Export cache to file
   */
  async exportCache(filePath: string): Promise<void> {
    const entries = Array.from(this.cache.values());
    const data = {
      exported_at: new Date().toISOString(),
      entries,
      stats: this.getStats()
    };

    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    Logger.info(`🧠 Exported ${entries.length} cache entries to ${filePath}`);
  }

  /**
   * Import cache from file
   */
  async importCache(filePath: string, merge: boolean = true): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Cache file not found: ${filePath}`);
    }

    const data = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));
    
    if (!merge) {
      this.cache.clear();
    }

    let imported = 0;
    for (const entry of data.entries) {
      // Convert timestamp strings back to Date objects
      entry.timestamp = new Date(entry.timestamp);
      entry.metadata.last_accessed = new Date(entry.metadata.last_accessed);
      
      if (!this.isExpired(entry)) {
        this.cache.set(entry.key, entry);
        imported++;
      }
    }

    Logger.info(`🧠 Imported ${imported} cache entries from ${filePath}`);
  }

  /**
   * Private: Generate cache key
   */
  private generateKey(prompt: string, model?: string, tags?: string[]): string {
    const content = `${prompt}|${model || ''}|${tags?.sort().join(',') || ''}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Private: Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const expiryTime = new Date(entry.timestamp.getTime() + entry.ttl * 1000);
    return new Date() > expiryTime;
  }

  /**
   * Private: Initialize cache from disk
   */
  private async initializeCache(): Promise<void> {
    if (!this.options.persistToDisk) return;

    try {
      await fs.promises.mkdir(this.options.cacheDirectory, { recursive: true });
      
      const cacheFile = path.join(this.options.cacheDirectory, 'cache.json');
      if (fs.existsSync(cacheFile)) {
        await this.importCache(cacheFile, false);
      }
    } catch (error: any) {
      Logger.warn(`🧠 Failed to initialize cache from disk: ${error.message}`);
    }
  }

  /**
   * Private: Persist entry to disk
   */
  private async persistEntry(entry: CacheEntry): Promise<void> {
    try {
      const entryFile = path.join(this.options.cacheDirectory, `${entry.key}.json`);
      await fs.promises.writeFile(entryFile, JSON.stringify(entry, null, 2));
    } catch (error: any) {
      Logger.debug(`🧠 Failed to persist cache entry: ${error.message}`);
    }
  }

  /**
   * Private: Evict least recently used entries
   */
  private async evictLeastUsed(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => {
      return a[1].metadata.last_accessed.getTime() - b[1].metadata.last_accessed.getTime();
    });

    // Remove oldest 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }

    Logger.debug(`🧠 Evicted ${toRemove} least used cache entries`);
  }

  /**
   * Private: Calculate basic text similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    // Simple word-based similarity (Jaccard similarity)
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Private: Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      let removedCount = 0;
      
      for (const [key, entry] of this.cache.entries()) {
        if (this.isExpired(entry)) {
          this.cache.delete(key);
          removedCount++;
        }
      }
      
      if (removedCount > 0) {
        Logger.debug(`🧠 Cleaned up ${removedCount} expired cache entries`);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    this.cache.clear();
    Logger.info('🧠 AI Cache destroyed');
  }
}

// Export singleton instance
export const aiCache = new AIResponseCache();