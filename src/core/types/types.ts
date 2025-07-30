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
  emailDomain?: string; // Domain for test emails (default: supaseed.test)
  domain?: string; // Domain configuration (generic, outdoor, ecommerce, saas, etc.)
  createStandardTestEmails?: boolean; // Create MakerKit standard test emails (default: false)
  customTestEmails?: string[]; // Custom test email addresses
  createTeamAccounts?: boolean; // Create team accounts for testing
  testUserPassword?: string; // Password for test users
  
  // NEW: MakerKit Integration & Existing User Support (SUPASEED-001)
  userStrategy?: 'use-existing' | 'create-new' | 'hybrid'; // User creation strategy (default: 'create-new')
  existingUsers?: {
    preserve?: boolean; // Preserve existing users (default: true)
    table?: string; // Table to query for existing users (default: 'accounts')
    filter?: Record<string, any>; // Filter criteria for existing users
    idField?: string; // ID field name (default: 'id')
  };
  additionalUsers?: {
    count?: number; // Number of additional users to create (default: 5)
    personas?: string[]; // User personas for realistic diversity
    authIntegration?: 'makerkit' | 'supabase' | 'custom'; // Auth integration type (default: 'supabase')
  };
  schema?: {
    framework?: 'makerkit' | 'simple' | 'custom';
    primaryUserTable?: 'accounts' | 'profiles' | 'users';
    userTable?: {
      name: string;
      emailField: string;
      idField: string;
      nameField: string;
      pictureField?: string;
      bioField?: string;
    };
    setupsTable?: {
      name: string;
      userField: string; // Match config-types naming
      titleField: string;
      descriptionField?: string;
    };
    baseTemplateTable?: {
      name: string;
      descriptionField?: string;
      typeField?: string;
      makeField?: string;
      modelField?: string;
      yearField?: string;
    };
    optionalTables?: {
      categories?: boolean | {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      baseTemplates?: boolean | {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      gearItems?: boolean | {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      organizations?: boolean;
      memberships?: boolean;
    };
  };
  
  // Table-specific configuration
  tables?: {
    setups?: {
      count?: number;
      categories?: string[]; // User-provided categories for setup generation
    };
    users?: {
      count?: number;
    };
    posts?: {
      count?: number;
      categories?: string[];
    };
    gear?: {
      count?: number;
      forceGeneration?: boolean; // Create variants if needed to reach exact count
      categoryStrategy?: 'enum' | 'fk' | 'auto'; // How to handle categories (default: 'auto')
      categoryMapping?: Record<string, string>; // Map gear types to enum values
      enumCategories?: string[]; // Valid enum values for direct insertion
      skipCategoryTableCreation?: boolean; // Skip creating separate category tables
    };
  };
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