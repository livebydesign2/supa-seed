#!/usr/bin/env node

import { program } from 'commander';
import { SupaSeedFramework, createDefaultConfig } from './index';
import type { SeedConfig } from './types';

async function main() {
  program
    .name('supa-seed')
    .description('🌱 Modern Database Seeding Framework for Supabase')
    .version('1.0.0');

  program
    .command('seed')
    .description('Seed the database with test data')
    .option('-u, --users <number>', 'Number of users to create', '10')
    .option('-s, --setups <number>', 'Number of setups per user', '3')
    .option('-i, --images <number>', 'Number of images per setup', '3')
    .option('--real-images', 'Use real images from Unsplash (requires API key)', false)
    .option('--cleanup', 'Clean up existing seed data first', false)
    .option('--env <environment>', 'Environment (local|staging|production)', 'local')
    .option('--seed-value <string>', 'Seed value for deterministic data', 'supa-seed-2025')
    .action(async (options) => {
      try {
        const config = createDefaultConfig({
          userCount: parseInt(options.users),
          setupsPerUser: parseInt(options.setups),
          imagesPerSetup: parseInt(options.images),
          enableRealImages: options.realImages,
          environment: options.env as 'local' | 'staging' | 'production',
          seed: options.seedValue,
        });

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
    .description('Initialize supa-seed configuration')
    .option('--config-file <path>', 'Config file path', 'supa-seed.config.json')
    .action(async (options) => {
      const fs = await import('fs');
      const path = await import('path');
      
      const configPath = path.resolve(options.configFile);
      
      if (fs.existsSync(configPath)) {
        console.log(`⚠️  Configuration file already exists: ${configPath}`);
        process.exit(1);
      }

      const defaultConfig = createDefaultConfig();
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
      
      console.log(`✅ Created configuration file: ${configPath}`);
      console.log('📝 Edit the configuration file to customize your seeding requirements');
    });

  await program.parseAsync(process.argv);
}

main().catch(console.error); 