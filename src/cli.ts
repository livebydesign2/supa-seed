#!/usr/bin/env node

import { program } from 'commander';
import ora from 'ora';
import { SupaSeedFramework, createDefaultConfig } from './index';
import { ConfigManager } from './config-manager';
import { createClient } from '@supabase/supabase-js';
import { loadConfiguration } from './config';
import { Logger } from './utils/logger';
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
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
      const spinner = ora('Initializing seeding process...').start();
      
      try {
        // Set verbose mode if requested
        if (options.verbose) {
          Logger.setVerbose(true);
        }
        
        let config: SeedConfig;
        
        spinner.text = 'Loading configuration...';
        
        // Try to load configuration using the enhanced config loader
        const configResult = loadConfiguration(options.config);
        
        if (configResult.source === 'config-file' && configResult.flexConfig) {
          // Use flexible config from file
          const flexConfig = configResult.flexConfig;
          config = {
            supabaseUrl: flexConfig.supabaseUrl,
            supabaseServiceKey: flexConfig.supabaseServiceKey,
            environment: options.env || flexConfig.environment,
            userCount: options.users ? parseInt(options.users) : flexConfig.userCount,
            setupsPerUser: options.setups ? parseInt(options.setups) : flexConfig.setupsPerUser,
            imagesPerSetup: options.images ? parseInt(options.images) : flexConfig.imagesPerSetup,
            enableRealImages: options.realImages || flexConfig.enableRealImages,
            seed: options.seedValue || flexConfig.seed,
            emailDomain: flexConfig.emailDomain || 'supaseed.test',
            schema: flexConfig.schema, // Pass through schema configuration
          };
          
          spinner.succeed(`Configuration loaded from: ${options.config}`);
          const configManager = new ConfigManager(options.config);
          configManager.printConfigSummary(flexConfig);
          
        } else {
          // Use config from environment or defaults
          config = configResult.config;
          
          // Override with CLI options
          if (options.users) config.userCount = parseInt(options.users);
          if (options.setups) config.setupsPerUser = parseInt(options.setups);
          if (options.images) config.imagesPerSetup = parseInt(options.images);
          if (options.realImages) config.enableRealImages = true;
          if (options.env) config.environment = options.env as 'local' | 'staging' | 'production';
          if (options.seedValue) config.seed = options.seedValue;
          
          spinner.succeed(`Configuration loaded from: ${configResult.source}`);
        }
        
        spinner.text = 'Connecting to database...';
        const seeder = new SupaSeedFramework(config);
        
        if (options.cleanup) {
          spinner.text = 'Cleaning up existing seed data...';
          await seeder.cleanup();
          spinner.succeed('Cleanup completed');
        }
        
        spinner.text = 'Starting database seeding...';
        spinner.stop(); // Stop spinner as seeding has its own output
        
        await seeder.seed();
        
        Logger.success('🎉 Seeding completed successfully!');
      } catch (error: any) {
        spinner.fail('Seeding failed');
        Logger.error('Error details:', error);
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
    .option('--verbose', 'Enable verbose logging')
    .action(async (options) => {
      const spinner = ora('Initializing supa-seed configuration...').start();
      
      try {
        if (options.verbose) {
          Logger.setVerbose(true);
        }
        
        const configManager = new ConfigManager(options.configFile);
        
        if (options.detect) {
          // Get credentials for schema detection
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          if (!supabaseUrl || !supabaseKey) {
            spinner.warn('Missing environment variables for schema detection');
            Logger.warn('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables not found.');
            Logger.info('Set these variables or create a .env file to enable schema detection.');
            Logger.info('\nCreating basic configuration...');
            
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
          spinner.text = 'Connecting to database...';
          const client = createClient(supabaseUrl, supabaseKey);
          
          spinner.text = 'Analyzing database schema...';
          const detection = await configManager.detectAndSuggestConfig(client as any);
          
          spinner.succeed('Schema analysis complete');
          
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
    .option('--verbose', 'Enable verbose logging')
    .option('--debug', 'Enable debug mode for detailed analysis')
    .action(async (options) => {
      const spinner = ora('Analyzing database schema...').start();
      
      try {
        if (options.verbose) {
          Logger.setVerbose(true);
        }
        
        const supabaseUrl = options.url || process.env.SUPABASE_URL;
        const supabaseKey = options.key || process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          spinner.fail('Missing required credentials');
          Logger.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
          Logger.info('Set environment variables or use --url and --key options');
          process.exit(1);
        }
        
        spinner.text = 'Connecting to database...';
        const client = createClient(supabaseUrl, supabaseKey);
        const configManager = new ConfigManager();
        
        // Try to load existing configuration for overrides
        let configOverride;
        try {
          const existingConfig = configManager.loadConfig();
          configOverride = {
            database: existingConfig.schema ? { framework: existingConfig.schema.framework } : undefined,
            schema: existingConfig.schema
          };
          if (options.verbose) {
            Logger.debug('Loaded existing configuration for detection overrides');
          }
        } catch {
          // No existing config, proceed with auto-detection
          if (options.verbose) {
            Logger.debug('No existing configuration found, using auto-detection');
          }
        }
        
        spinner.text = 'Detecting schema structure...';
        const detection = await configManager.detectAndSuggestConfig(client as any, configOverride, supabaseUrl);
        
        spinner.succeed('Schema analysis complete');
        
        // Display enhanced detection results if available
        if (detection.enhancedDetection && (options.verbose || options.debug)) {
          console.log('\n📋 Enhanced schema detected:', {
            primaryUserTable: detection.enhancedDetection.primaryUserTable,
            structure: detection.framework,
            makerkitVersion: detection.enhancedDetection.makerkitVersion,
            frameworkType: detection.enhancedDetection.frameworkType,
            customTables: detection.enhancedDetection.customTables,
            relationships: detection.enhancedDetection.relationships,
            assetCompatibility: detection.enhancedDetection.assetCompatibility
          });
        }
        
        console.log('\n📊 Database Schema Analysis:');
        console.log(`   🏗️  Framework detected: ${detection.enhancedDetection?.frameworkType || detection.framework}`);
        
        if (detection.enhancedDetection?.makerkitVersion && detection.enhancedDetection.makerkitVersion !== 'none') {
          console.log(`   📦 MakerKit version: ${detection.enhancedDetection.makerkitVersion}`);
        }
        
        console.log(`   👤 Has profiles table: ${detection.hasProfiles ? '✅' : '❌'}`);
        console.log(`   👤 Has accounts table: ${detection.hasAccounts ? '✅' : '❌'}`);
        console.log(`   📝 Has setups table: ${detection.hasSetups ? '✅' : '❌'}`);
        console.log(`   🏷️  Has categories table: ${detection.hasCategories ? '✅' : '❌'}`);
        
        if (detection.enhancedDetection) {
          console.log(`   📋 Primary user table: ${detection.enhancedDetection.primaryUserTable}`);
          console.log(`   🔗 Custom tables found: ${detection.enhancedDetection.customTables}`);
          console.log(`   🔄 Relationships detected: ${detection.enhancedDetection.relationships}`);
          
          if (detection.enhancedDetection.assetCompatibility.images) {
            console.log(`   🖼️  Image support: ✅ (${detection.enhancedDetection.assetCompatibility.storage})`);
          } else {
            console.log(`   🖼️  Image support: ❌`);
          }
        }
        
        if (detection.missingTables.length > 0) {
          Logger.warn(`Missing tables: ${detection.missingTables.join(', ')}`);
          Logger.info('Run the appropriate schema file:');
          
          if (detection.framework === 'makerkit' || detection.enhancedDetection?.frameworkType === 'makerkit') {
            Logger.info('   psql -f schema-wildernest.sql');
          } else {
            Logger.info('   psql -f schema.sql');
          }
        } else {
          Logger.success('All required tables found!');
        }
        
        console.log('\n🚀 Next steps:');
        if (configOverride) {
          console.log('   Configuration file detected and used for framework detection');
          console.log('   1. Run "supa-seed seed" to start seeding your database');
          console.log('   2. Use "supa-seed detect --verbose" for detailed analysis');
        } else {
          console.log('   1. Run "supa-seed init" to create a configuration file');
          console.log('   2. Run "supa-seed seed" to start seeding your database');
        }
        
      } catch (error: any) {
        spinner.fail('Schema detection failed');
        Logger.error('Error details:', error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error); 