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