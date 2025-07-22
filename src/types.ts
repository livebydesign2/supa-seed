import type { createClient } from '@supabase/supabase-js';
import type { Faker } from '@faker-js/faker';

export type SupabaseClient = ReturnType<typeof createClient>;

export interface SeedConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  environment: 'local' | 'staging' | 'production';
  userCount: number;
  setupsPerUser: number;
  imagesPerSetup: number;
  enableRealImages: boolean;
  seed: string; // For deterministic fake data
}

export interface SeedStats {
  usersCreated: number;
  setupsCreated: number;
  imagesUploaded: number;
  startTime: Date;
}

export interface SeedContext {
  client: SupabaseClient;
  config: SeedConfig;
  faker: Faker;
  cache: Map<string, any>; // For caching created entities
  stats: SeedStats;
}

export abstract class SeedModule {
  constructor(protected context: SeedContext) {
    // Initialize faker with consistent seed
    this.context.faker.seed(this.hashSeed(context.config.seed + this.constructor.name));
  }

  abstract seed(): Promise<void>;

  protected hashSeed(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Check if database connection is healthy
   */
  protected async checkDatabaseConnection(): Promise<boolean> {
    try {
      const { error } = await this.context.client.from('accounts').select('count').limit(1);
      return !error;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  /**
   * Check if a table exists and is accessible
   */
  protected async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.context.client.from(tableName).select('*').limit(1);
      if (error) {
        // Check if error is due to table not existing vs other issues
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.warn(`⚠️  Table '${tableName}' does not exist`);
          return false;
        }
        if (error.message.includes('permission denied')) {
          console.warn(`⚠️  No permission to access table '${tableName}'`);
          return false;
        }
        // Other errors might be temporary, so we'll return true but log
        console.warn(`⚠️  Warning accessing table '${tableName}':`, error.message);
        return true;
      }
      return true;
    } catch (error) {
      console.error(`❌ Error checking table '${tableName}':`, error);
      return false;
    }
  }

  /**
   * Execute a database operation with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) {
          console.error(`❌ Operation failed after ${maxRetries} attempts:`, error);
          return null;
        }

        // Check if error is retryable
        if (this.isRetryableError(error)) {
          console.warn(`⚠️  Attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // Exponential backoff
        } else {
          console.error(`❌ Non-retryable error:`, error);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    const retryableMessages = [
      'connection',
      'timeout',
      'network',
      'rate limit',
      'temporary',
      'busy',
      'lock',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Log structured error information
   */
  protected logError(context: string, error: any, additionalInfo?: Record<string, any>): void {
    console.error(`❌ [${this.constructor.name}] ${context}:`, {
      error: error?.message || error,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      ...additionalInfo,
    });
  }

  /**
   * Log structured warning information
   */
  protected logWarning(context: string, message: string, additionalInfo?: Record<string, any>): void {
    console.warn(`⚠️  [${this.constructor.name}] ${context}: ${message}`, additionalInfo || {});
  }
}

// Data types for caching
export interface CachedUser {
  id: string;
  email: string;
  username: string;
  name: string;
}

export interface CachedSetup {
  id: string;
  userId: string;
  title: string;
  category: string;
  baseTemplateId?: string;
}

export interface CachedBaseTemplate {
  id: string;
  type: string;
  make: string;
  model: string;
  year?: number;
}

// Image generation types
export interface ImageGenerationOptions {
  width: number;
  height: number;
  category: string;
  style?: 'realistic' | 'stock' | 'generated';
}

export interface GeneratedImage {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
} 