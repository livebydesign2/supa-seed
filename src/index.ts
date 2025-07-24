import { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { SeedConfig, SeedModule, SeedContext } from './types';
import { AuthSeeder } from './seeders/auth-seeder';
import { BaseDataSeeder } from './seeders/base-data-seeder';
import { UserSeeder } from './seeders/user-seeder';
import { SetupSeeder } from './seeders/setup-seeder';
import { GearSeeder } from './seeders/gear-seeder';
import { MediaSeeder } from './seeders/media-seeder';
import { SchemaAdapter } from './schema-adapter';
import { Logger } from './utils/logger';
import { SchemaValidator } from './validation/schema-validator';
import { createEnhancedSupabaseClient } from './utils/enhanced-supabase-client';

export class SupaSeedFramework {
  private client: any; // Use any to avoid type conflicts with enhanced client
  private context: SeedContext;
  
  constructor(private config: SeedConfig) {
    this.validateConfig(config);
    
    this.client = createEnhancedSupabaseClient(
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
    
    try {
      // First, check database connectivity and schema
      const schemaAdapter = await this.validateDatabaseAndSchema();
      
      // Validate schema compatibility
      const validator = new SchemaValidator(this.client, schemaAdapter);
      const validationResult = await validator.validateSchema();
      
      SchemaValidator.printResults(validationResult);
      
      if (!validationResult.valid) {
        const continueAnyway = process.env.FORCE_SEED === 'true';
        if (!continueAnyway) {
          throw new Error('Schema validation failed. Set FORCE_SEED=true to continue anyway.');
        }
        Logger.warn('Continuing despite validation errors (FORCE_SEED=true)');
      }
      
      // Define seeding order (dependency-aware)
      const seeders: SeedModule[] = [
        new AuthSeeder(this.context),
        new BaseDataSeeder(this.context),
        new UserSeeder(this.context),
        new GearSeeder(this.context),
        new SetupSeeder(this.context),
        new MediaSeeder(this.context),
      ];

      for (const seeder of seeders) {
        try {
          console.log(`🔄 Running ${seeder.constructor.name}...`);
          await seeder.seed();
          console.log(`✅ ${seeder.constructor.name} completed`);
        } catch (error: any) {
          console.warn(`⚠️  ${seeder.constructor.name} failed but seeding continues:`, error.message);
          // Continue with next seeder rather than failing completely
        }
      }
      
      await this.printSummary();
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  private async validateDatabaseAndSchema(): Promise<SchemaAdapter> {
    Logger.step('Validating database connection and schema...');
    
    try {
      // Test basic connection using multiple methods with clear feedback
      let connectionValid = false;
      let connectionMethod = '';
      
      // Method 1: Test with auth.users query (most reliable for service role)
      try {
        Logger.debug('Testing connection with auth.admin.listUsers...');
        const { error: authError } = await this.client.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        if (!authError) {
          connectionValid = true;
          connectionMethod = 'auth.admin';
          Logger.debug('Connection successful via auth.admin');
        } else {
          Logger.debug('Auth test failed:', authError);
        }
      } catch (error) {
        Logger.debug('Auth test threw error:', error);
      }
      
      // Method 2: Try a simple table query
      if (!connectionValid) {
        try {
          Logger.debug('Testing connection with simple table query...');
          const { error } = await this.client
            .from('_dummy_table_test_connection')
            .select('*')
            .limit(1);
          
          // PGRST116 = table doesn't exist (which is expected, but means connection works)
          if (!error || error.code === 'PGRST116') {
            connectionValid = true;
            connectionMethod = 'table query';
            Logger.debug('Connection successful via table query');
          }
        } catch (error) {
          Logger.debug('Table query test failed:', error);
        }
      }
      
      // Method 3: Try RPC call
      if (!connectionValid) {
        try {
          Logger.debug('Testing connection with RPC call...');
          const { error } = await this.client.rpc('version');
          
          if (!error) {
            connectionValid = true;
            connectionMethod = 'rpc';
            Logger.debug('Connection successful via RPC');
          }
        } catch (error) {
          // RPC might not exist, which is fine
          Logger.debug('RPC test failed:', error);
        }
      }
      
      if (!connectionValid) {
        throw new Error('All connection test methods failed');
      }
      
      Logger.success(`Database connection validated (method: ${connectionMethod})`)
      
      // Initialize schema adapter to detect schema - pass config for overrides
      const schemaAdapter = new SchemaAdapter(this.client, this.config);
      const schemaInfo = await schemaAdapter.detectSchema();
      
      // Provide helpful guidance based on detected schema
      if (!schemaInfo.hasAccounts && !schemaInfo.hasProfiles) {
        Logger.warn('No user tables detected. You may need to:');
        Logger.info('   1. Run the schema.sql file to create required tables');
        Logger.info('   2. Or ensure your custom schema is compatible');
        Logger.info('   3. Check your database permissions');
      } else {
        const strategy = schemaAdapter.getUserCreationStrategy();
        Logger.success(`Schema validated. Using ${strategy} user creation strategy.`);
      }
      
      return schemaAdapter;
      
    } catch (error: any) {
      Logger.error('Connection validation failed:', error);
      
      // Provide detailed debugging information
      Logger.debug('Connection Debug Info:', {
        URL: this.config.supabaseUrl,
        ServiceKey: this.config.supabaseServiceKey ? '***' + this.config.supabaseServiceKey.slice(-4) : 'Not provided',
        Environment: this.config.environment
      });
      
      if (error.message.includes('permission denied') || error.message.includes('JWT')) {
        throw new Error(
          `❌ Database permissions error. Please ensure your SUPABASE_SERVICE_ROLE_KEY has the necessary permissions.\n\n` +
          `🔧 Debug Info:\n` +
          `   • URL: ${this.config.supabaseUrl}\n` +
          `   • Key ends with: ${this.config.supabaseServiceKey ? '***' + this.config.supabaseServiceKey.slice(-4) : 'NOT_PROVIDED'}\n\n` +
          `✅ Required permissions:\n` +
          `   • Create auth users (admin.createUser)\n` +
          `   • Insert into user tables (accounts/profiles)\n` +
          `   • Access table schemas\n\n` +
          `💡 For local Supabase, make sure you're using the service_role key, not anon key.`
        );
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
        throw new Error(
          `❌ Database connection failed. Connection details:\n\n` +
          `🔧 Debug Info:\n` +
          `   • URL: ${this.config.supabaseUrl}\n` +
          `   • Key: ${this.config.supabaseServiceKey ? 'PROVIDED' : 'MISSING'}\n` +
          `   • Error: ${error.message}\n\n` +
          `✅ Please check:\n` +
          `   • SUPABASE_URL is correct and accessible\n` +
          `   • SUPABASE_SERVICE_ROLE_KEY is valid\n` +
          `   • Your network connection\n` +
          `   • Supabase instance is running\n\n` +
          `💡 For local development, ensure Supabase is running on ${this.config.supabaseUrl}`
        );
      } else if (error.message.includes('Invalid JWT') || error.message.includes('jwt')) {
        throw new Error(
          `❌ JWT/Authentication error:\n\n` +
          `🔧 Debug Info:\n` +
          `   • URL: ${this.config.supabaseUrl}\n` +
          `   • Error: ${error.message}\n\n` +
          `💡 This usually means:\n` +
          `   • You're using the wrong API key (use service_role, not anon)\n` +
          `   • The API key has expired or is malformed\n` +
          `   • Local Supabase JWT_SECRET doesn't match`
        );
      }
      
      throw new Error(`❌ Connection validation failed: ${error.message}`);
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

      const testAccountIds = testAccounts.map((acc: any) => acc.id);

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
            ).data?.map((s: any) => s.id) || []
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
        .in('account_id', testAccounts?.map((acc: any) => acc.id) || []);

      console.log(`👥 Test accounts: ${testAccounts?.length || 0}`);
      console.log(`🏕️  Test setups: ${setups?.length || 0}`);
      
      if (testAccounts?.length) {
        console.log('\n📋 Test accounts:');
        testAccounts.forEach((acc: any) => {
          console.log(`   • ${acc.email}`);
        });
      }
    } catch (error) {
      console.error('❌ Status check failed:', error);
      throw error;
    }
  }

  private validateConfig(config: SeedConfig): void {
    const requiredFields = [
      'supabaseUrl',
      'supabaseServiceKey',
    ];

    const missingFields = requiredFields.filter(field => 
      !config[field as keyof SeedConfig] || config[field as keyof SeedConfig] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required configuration: ${missingFields.join(', ')}.\n` +
        'Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your environment or configuration.'
      );
    }

    if (!config.supabaseUrl.startsWith('http')) {
      throw new Error('supabaseUrl must be a valid HTTP/HTTPS URL');
    }

    if (config.userCount <= 0 || config.setupsPerUser <= 0) {
      throw new Error('userCount and setupsPerUser must be greater than 0');
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
    emailDomain: 'supaseed.test',
    ...overrides,
  };
}

// Export types and classes for library usage
export * from './types';
export * from './config-types';
export { ConfigManager } from './config-manager';
export { SchemaAdapter } from './schema-adapter';
export { AuthSeeder, BaseDataSeeder, UserSeeder, SetupSeeder, GearSeeder, MediaSeeder }; 