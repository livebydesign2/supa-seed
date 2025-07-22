#!/usr/bin/env node

import { program } from 'commander';
import { SupaSeedFramework, createDefaultConfig } from './index';
import { ConfigManager } from './config-manager';
import { createClient } from '@supabase/supabase-js';
import type { SeedConfig } from './types';

async function main() {
  program
    .name('supa-seed')
    .description('🌱 Modern Database Seeding Framework for Supabase')
    .version('1.0.0');

  program
    .command('seed')
    .description('Seed the database with test data')
    .option('-c, --config <file>', 'Configuration file path', 'supa-seed.config.json')
    .option('-u, --users <number>', 'Number of users to create (overrides config)')
    .option('-s, --setups <number>', 'Number of setups per user (overrides config)')
    .option('-i, --images <number>', 'Number of images per setup (overrides config)')
    .option('--real-images', 'Use real images from Unsplash (overrides config)', false)
    .option('--cleanup', 'Clean up existing seed data first', false)
    .option('--env <environment>', 'Environment (local|staging|production)')
    .option('--seed-value <string>', 'Seed value for deterministic data')
    .action(async (options) => {
      try {
        let config: SeedConfig;
        
        // Try to use config file first
        const configManager = new ConfigManager(options.config);
        try {
          const flexConfig = configManager.loadConfig();
          
          // Convert flexible config to legacy config format
          config = {
            supabaseUrl: flexConfig.supabaseUrl,
            supabaseServiceKey: flexConfig.supabaseServiceKey,
            environment: flexConfig.environment,
            userCount: options.users ? parseInt(options.users) : flexConfig.userCount,
            setupsPerUser: options.setups ? parseInt(options.setups) : flexConfig.setupsPerUser,
            imagesPerSetup: options.images ? parseInt(options.images) : flexConfig.imagesPerSetup,
            enableRealImages: options.realImages || flexConfig.enableRealImages,
            seed: options.seedValue || flexConfig.seed,
          };
          
          console.log('📋 Using configuration file:', options.config);
          configManager.printConfigSummary(flexConfig);
          
        } catch (configError) {
          console.log('⚠️  No config file found, using defaults and CLI options');
          
          // Fall back to legacy config
          config = createDefaultConfig({
            userCount: options.users ? parseInt(options.users) : 10,
            setupsPerUser: options.setups ? parseInt(options.setups) : 3,
            imagesPerSetup: options.images ? parseInt(options.images) : 3,
            enableRealImages: options.realImages,
            environment: (options.env as 'local' | 'staging' | 'production') || 'local',
            seed: options.seedValue || 'supa-seed-2025',
          });
        }

        const seeder = new SupaSeedFramework(config);
        
        if (options.cleanup) {
          await seeder.cleanup();
        }
        
        await seeder.seed();
      } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
      }
    });

  program
    .command('cleanup')
    .description('Clean up all seed data')
    .option('--force', 'Force cleanup without confirmation')
    .action(async (options) => {
      try {
        if (!options.force) {
          console.log('⚠️  This will remove all seed data. Use --force to confirm.');
          process.exit(1);
        }

        const config = createDefaultConfig();
        const seeder = new SupaSeedFramework(config);
        await seeder.cleanup();
        
        console.log('✅ Cleanup completed');
      } catch (error) {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
      }
    });

  program
    .command('status')
    .description('Check seeding status')
    .action(async () => {
      try {
        const config = createDefaultConfig();
        const seeder = new SupaSeedFramework(config);
        await seeder.status();
      } catch (error) {
        console.error('❌ Status check failed:', error);
        process.exit(1);
      }
    });

  program
    .command('init')
    .description('Initialize supa-seed configuration with auto-detection')
    .option('-c, --config-file <path>', 'Config file path', 'supa-seed.config.json')
    .option('--env <environment>', 'Environment (local|staging|production)', 'local')
    .option('-u, --users <number>', 'Number of users to create', '10')
    .option('--force', 'Overwrite existing configuration file')
    .option('--detect', 'Auto-detect database schema and suggest configuration', true)
    .action(async (options) => {
      try {
        console.log('🔍 Initializing supa-seed configuration...');
        
        const configManager = new ConfigManager(options.configFile);
        
        if (options.detect) {
          // Get credentials for schema detection
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            console.log('⚠️  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables not found.');
            console.log('💡 Set these variables or create a .env file to enable schema detection.');
            console.log('\nCreating basic configuration...');
            
            // Create basic config without detection
            const basicConfig = createDefaultConfig({
              environment: options.env as 'local' | 'staging' | 'production',
              userCount: parseInt(options.users),
            });
            
            const fs = await import('fs');
            fs.writeFileSync(options.configFile, JSON.stringify(basicConfig, null, 2));
            
            console.log(`✅ Created basic configuration: ${options.configFile}`);
            console.log('📝 Edit the file and set your Supabase credentials to enable advanced features');
            return;
          }
          
          // Create client for schema detection
          const client = createClient(supabaseUrl, supabaseKey);
          
          console.log('🔎 Analyzing database schema...');
          const detection = await configManager.detectAndSuggestConfig(client as any);
          
          console.log('\n📊 Schema Analysis Results:');
          console.log(`   Framework detected: ${detection.framework}`);
          console.log(`   Has profiles table: ${detection.hasProfiles ? '✅' : '❌'}`);
          console.log(`   Has accounts table: ${detection.hasAccounts ? '✅' : '❌'}`);
          console.log(`   Has setups table: ${detection.hasSetups ? '✅' : '❌'}`);
          console.log(`   Has categories table: ${detection.hasCategories ? '✅' : '❌'}`);
          
          if (detection.missingTables.length > 0) {
            console.log(`   Missing tables: ${detection.missingTables.join(', ')}`);
            console.log('💡 These can be auto-created when seeding');
          }
          
          // Create configuration with detection
          const config = await configManager.createConfig(client as any, {
            environment: options.env as 'local' | 'staging' | 'production',
            userCount: parseInt(options.users),
            force: options.force
          });
          
          console.log(`\n✅ Created intelligent configuration: ${options.configFile}`);
          configManager.printConfigSummary(config);
          
        } else {
          // Create basic config without detection
          const basicConfig = createDefaultConfig({
            environment: options.env as 'local' | 'staging' | 'production',
            userCount: parseInt(options.users),
          });
          
          const fs = await import('fs');
          if (fs.existsSync(options.configFile) && !options.force) {
            console.log(`⚠️  Configuration file already exists: ${options.configFile}`);
            console.log('Use --force to overwrite');
            process.exit(1);
          }
          
          fs.writeFileSync(options.configFile, JSON.stringify(basicConfig, null, 2));
          console.log(`✅ Created basic configuration: ${options.configFile}`);
        }
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Review and edit your configuration file');
        console.log('   2. Set your Supabase credentials in .env or the config file');
        console.log('   3. Run "supa-seed seed" to start seeding');
        
      } catch (error) {
        console.error('❌ Configuration initialization failed:', error);
        process.exit(1);
      }
    });

  program
    .command('detect')
    .description('Analyze database schema and show compatibility information')
    .option('--url <url>', 'Supabase URL (overrides env var)')
    .option('--key <key>', 'Supabase service role key (overrides env var)')
    .action(async (options) => {
      try {
        console.log('🔍 Analyzing database schema...');
        
        const supabaseUrl = options.url || process.env.SUPABASE_URL;
        const supabaseKey = options.key || process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
          console.log('💡 Set environment variables or use --url and --key options');
          process.exit(1);
        }
        
        const client = createClient(supabaseUrl, supabaseKey);
        const configManager = new ConfigManager();
        
        const detection = await configManager.detectAndSuggestConfig(client as any);
        
        console.log('\n📊 Database Schema Analysis:');
        console.log(`   🏗️  Framework detected: ${detection.framework}`);
        console.log(`   👤 Has profiles table: ${detection.hasProfiles ? '✅' : '❌'}`);
        console.log(`   👤 Has accounts table: ${detection.hasAccounts ? '✅' : '❌'}`);
        console.log(`   📝 Has setups table: ${detection.hasSetups ? '✅' : '❌'}`);
        console.log(`   🏷️  Has categories table: ${detection.hasCategories ? '✅' : '❌'}`);
        
        if (detection.missingTables.length > 0) {
          console.log(`\n⚠️  Missing tables: ${detection.missingTables.join(', ')}`);
          console.log('💡 Run the appropriate schema file:');
          
          if (detection.framework === 'makerkit') {
            console.log('   psql -f schema-wildernest.sql');
          } else {
            console.log('   psql -f schema.sql');
          }
        } else {
          console.log('\n✅ All required tables found!');
        }
        
        console.log('\n🚀 Next steps:');
        console.log('   1. Run "supa-seed init" to create a configuration file');
        console.log('   2. Run "supa-seed seed" to start seeding your database');
        
      } catch (error) {
        console.error('❌ Schema detection failed:', error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error); 