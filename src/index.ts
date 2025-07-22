import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { SeedConfig, SeedModule, SeedContext } from './types';
import { AuthSeeder } from './seeders/auth-seeder';
import { BaseDataSeeder } from './seeders/base-data-seeder';
import { UserSeeder } from './seeders/user-seeder';
import { SetupSeeder } from './seeders/setup-seeder';
import { GearSeeder } from './seeders/gear-seeder';
import { MediaSeeder } from './seeders/media-seeder';

export class SupaSeedFramework {
  private client: ReturnType<typeof createClient>;
  private context: SeedContext;
  
  constructor(private config: SeedConfig) {
    this.client = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey
    );
    
    this.context = {
      client: this.client,
      config,
      faker,
      cache: new Map(),
      stats: {
        usersCreated: 0,
        setupsCreated: 0,
        imagesUploaded: 0,
        startTime: new Date(),
      }
    };
  }

  async seed(): Promise<void> {
    console.log('🌱 Starting database seeding...');
    
    // Define seeding order (dependency-aware)
    const seeders: SeedModule[] = [
      new AuthSeeder(this.context),
      new BaseDataSeeder(this.context),
      new UserSeeder(this.context),
      new GearSeeder(this.context),
      new SetupSeeder(this.context),
      new MediaSeeder(this.context),
    ];

    try {
      for (const seeder of seeders) {
        console.log(`🔄 Running ${seeder.constructor.name}...`);
        await seeder.seed();
        console.log(`✅ ${seeder.constructor.name} completed`);
      }
      
      await this.printSummary();
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up existing seed data...');
    
    try {
      // Get test accounts first
      const { data: testAccounts } = await this.client
        .from('accounts')
        .select('id')
        .like('email', '%.test');

      if (!testAccounts?.length) {
        console.log('ℹ️  No test data found to clean up');
        return;
      }

      const testAccountIds = testAccounts.map(acc => acc.id);

      // Clean setup_gear_items first (if table exists)
      try {
        await this.client
          .from('setup_gear_items')
          .delete()
          .in('setup_id', 
            (await this.client
              .from('setups')
              .select('id')
              .in('account_id', testAccountIds)
            ).data?.map(s => s.id) || []
          );
      } catch {
        console.log('ℹ️  setup_gear_items table not found, skipping');
      }

      // Clean setups
      await this.client
        .from('setups')
        .delete()
        .in('account_id', testAccountIds);

      // Clean accounts
      await this.client
        .from('accounts')
        .delete()
        .in('id', testAccountIds);

      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  async status(): Promise<void> {
    console.log('📊 Checking seeding status...');
    
    try {
      const { data: testAccounts } = await this.client
        .from('accounts')
        .select('id, email, created_at')
        .like('email', '%.test');

      const { data: setups } = await this.client
        .from('setups')
        .select('id, title, account_id')
        .in('account_id', testAccounts?.map(acc => acc.id) || []);

      console.log(`👥 Test accounts: ${testAccounts?.length || 0}`);
      console.log(`🏕️  Test setups: ${setups?.length || 0}`);
      
      if (testAccounts?.length) {
        console.log('\n📋 Test accounts:');
        testAccounts.forEach(acc => {
          console.log(`   • ${acc.email}`);
        });
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
      throw error;
    }
  }

  private async printSummary(): Promise<void> {
    const { stats } = this.context;
    const duration = Date.now() - stats.startTime.getTime();
    
    console.log('\n📊 Seeding Summary:');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`👥 Users created: ${stats.usersCreated}`);
    console.log(`🏕️  Setups created: ${stats.setupsCreated}`);
    console.log(`🖼️  Images uploaded: ${stats.imagesUploaded}`);
    console.log('✨ Seeding completed successfully!\n');
  }
}

/**
 * Create default configuration for seeding
 */
export function createDefaultConfig(overrides: Partial<SeedConfig> = {}): SeedConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    environment: (process.env.NODE_ENV as 'local' | 'staging' | 'production') || 'local',
    userCount: 10,
    setupsPerUser: 3,
    imagesPerSetup: 3,
    enableRealImages: false,
    seed: 'supa-seed-2025',
    ...overrides,
  };
}

// Export types and classes for library usage
export * from './types';
export { AuthSeeder, BaseDataSeeder, UserSeeder, SetupSeeder, GearSeeder, MediaSeeder }; 