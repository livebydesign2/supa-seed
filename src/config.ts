import { config as dotenvConfig } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { Logger } from './utils/logger';
import { FlexibleSeedConfig } from './config-types';
import { SeedConfig } from './types';

export interface ConfigLoadResult {
  config: SeedConfig;
  source: 'config-file' | 'environment' | 'defaults';
  flexConfig?: FlexibleSeedConfig;
}

export function loadConfiguration(configPath?: string): ConfigLoadResult {
  // Always try to load .env file first
  try {
    dotenvConfig();
    Logger.debug('Loaded .env file');
  } catch (error) {
    Logger.debug('No .env file found or failed to load');
  }
  
  // Try to load config file
  if (configPath) {
    try {
      const resolvedPath = resolve(configPath);
      
      if (!existsSync(resolvedPath)) {
        Logger.warn(`Configuration file not found: ${resolvedPath}`);
        return loadFromEnvironment();
      }
      
      const configContent = readFileSync(resolvedPath, 'utf8');
      const flexConfig = JSON.parse(configContent) as FlexibleSeedConfig;
      
      Logger.debug('Loaded configuration from file', { path: resolvedPath });
      
      // Validate essential fields
      if (!flexConfig.supabaseUrl || !flexConfig.supabaseServiceKey) {
        Logger.warn('Config file missing essential Supabase credentials');
        return loadFromEnvironment();
      }
      
      // Convert flexible config to legacy SeedConfig
      const config: SeedConfig = {
        supabaseUrl: flexConfig.supabaseUrl,
        supabaseServiceKey: flexConfig.supabaseServiceKey,
        environment: flexConfig.environment,
        userCount: flexConfig.userCount,
        setupsPerUser: flexConfig.setupsPerUser,
        imagesPerSetup: flexConfig.imagesPerSetup,
        enableRealImages: flexConfig.enableRealImages,
        seed: flexConfig.seed,
      };
      
      return {
        config,
        source: 'config-file',
        flexConfig
      };
      
    } catch (error: any) {
      Logger.error('Failed to load configuration file', error);
      Logger.info('Falling back to environment variables');
      return loadFromEnvironment();
    }
  }
  
  return loadFromEnvironment();
}

function loadFromEnvironment(): ConfigLoadResult {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    Logger.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    Logger.info('Available options:');
    Logger.info('1. Set environment variables in .env file');
    Logger.info('2. Create supa-seed.config.json with "supa-seed init"');
    Logger.info('3. Pass --url and --key options to commands');
    
    // Return default config that will fail validation
    const config: SeedConfig = {
      supabaseUrl: supabaseUrl || 'missing-url',
      supabaseServiceKey: supabaseServiceKey || 'missing-key',
      environment: 'local',
      userCount: 10,
      setupsPerUser: 3,
      imagesPerSetup: 3,
      enableRealImages: false,
      seed: 'supa-seed-2025',
    };
    
    return {
      config,
      source: 'defaults'
    };
  }
  
  Logger.debug('Loaded configuration from environment variables');
  
  const config: SeedConfig = {
    supabaseUrl,
    supabaseServiceKey,
    environment: (process.env.NODE_ENV as 'local' | 'staging' | 'production') || 'local',
    userCount: parseInt(process.env.SUPA_SEED_USER_COUNT || '10'),
    setupsPerUser: parseInt(process.env.SUPA_SEED_SETUPS_PER_USER || '3'),
    imagesPerSetup: parseInt(process.env.SUPA_SEED_IMAGES_PER_SETUP || '3'),
    enableRealImages: process.env.SUPA_SEED_ENABLE_REAL_IMAGES === 'true',
    seed: process.env.SUPA_SEED_SEED_VALUE || 'supa-seed-2025',
    emailDomain: process.env.SUPA_SEED_EMAIL_DOMAIN || 'supaseed.test',
  };
  
  return {
    config,
    source: 'environment'
  };
}

export function validateConfiguration(config: SeedConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!config.supabaseUrl || config.supabaseUrl === 'missing-url') {
    errors.push('supabaseUrl is required');
  }
  
  if (!config.supabaseServiceKey || config.supabaseServiceKey === 'missing-key') {
    errors.push('supabaseServiceKey is required');
  }
  
  // Validate URL format
  if (config.supabaseUrl && config.supabaseUrl !== 'missing-url') {
    try {
      new URL(config.supabaseUrl);
    } catch {
      errors.push('supabaseUrl must be a valid URL');
    }
  }
  
  // Validate numeric fields
  if (config.userCount <= 0) {
    errors.push('userCount must be greater than 0');
  }
  
  if (config.setupsPerUser <= 0) {
    errors.push('setupsPerUser must be greater than 0');
  }
  
  if (config.imagesPerSetup < 0) {
    errors.push('imagesPerSetup must be 0 or greater');
  }
  
  // Validate environment
  if (!['local', 'staging', 'production'].includes(config.environment)) {
    errors.push('environment must be one of: local, staging, production');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}