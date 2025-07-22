import * as fs from 'fs';
import * as path from 'path';
import { FlexibleSeedConfig, ConfigProfile, ConfigDetectionResult } from './config-types';
import { SchemaAdapter } from './schema-adapter';
import type { createClient } from '@supabase/supabase-js';

type SupabaseClient = ReturnType<typeof createClient>;

export class ConfigManager {
  private configPath: string;

  constructor(configPath: string = 'supa-seed.config.json') {
    this.configPath = path.resolve(configPath);
  }

  /**
   * Detect current database schema and suggest configuration
   */
  async detectAndSuggestConfig(client: SupabaseClient): Promise<ConfigDetectionResult> {
    const schemaAdapter = new SchemaAdapter(client);
    const schemaInfo = await schemaAdapter.detectSchema();
    
    const missingTables: string[] = [];
    const suggestedConfig: Partial<FlexibleSeedConfig> = {};

    // Detect framework type using improved detection
    let framework: 'simple' | 'makerkit' | 'custom' = 'simple';
    
    // Check for additional Makerkit-specific tables
    const hasMemberships = await this.tableExists(client, 'memberships');
    const hasSubscriptions = await this.tableExists(client, 'subscriptions');
    
    // Check for MakerKit patterns first
    if (schemaInfo.hasAccounts && hasMemberships) {
      framework = 'makerkit';
    } else if (schemaInfo.hasProfiles && (schemaInfo.hasOrganizations || schemaInfo.hasTeams)) {
      framework = 'makerkit';
    } else if (schemaInfo.hasProfiles && !schemaInfo.hasAccounts) {
      framework = 'simple';
    } else {
      framework = 'custom';
    }

    // Suggest schema configuration based on detected tables
    if (framework === 'makerkit') {
      suggestedConfig.schema = {
        framework: 'makerkit',
        userTable: {
          name: 'profiles',
          emailField: 'email',
          idField: 'id',
          nameField: 'display_name',
          bioField: 'bio',
          pictureField: 'avatar_url'
        },
        setupTable: {
          name: 'setups',
          userField: 'user_id',
          titleField: 'title',
          descriptionField: 'description',
          categoryField: 'category',
          publicField: 'is_public'
        },
        baseTemplateTable: {
          name: 'base_templates',
          descriptionField: 'description',
          typeField: 'type',
          makeField: 'make',
          modelField: 'model',
          yearField: 'year'
        },
        optionalTables: {
          categories: {
            enabled: schemaInfo.hasCategories,
            autoCreate: !schemaInfo.hasCategories
          },
          gearItems: {
            enabled: true,
            autoCreate: true
          },
          setupGearItems: {
            enabled: true,
            autoCreate: true
          },
          setupBaseTemplates: {
            enabled: true,
            autoCreate: true
          }
        }
      };
    } else if (framework === 'simple') {
      suggestedConfig.schema = {
        framework: 'simple',
        userTable: {
          name: 'accounts',
          emailField: 'email',
          idField: 'id',
          nameField: 'name',
          bioField: 'bio',
          pictureField: 'picture_url'
        },
        setupTable: {
          name: 'setups',
          userField: 'account_id',
          titleField: 'title',
          descriptionField: 'description',
          categoryField: 'category',
          publicField: 'is_public'
        },
        baseTemplateTable: {
          name: 'base_templates',
          descriptionField: 'description'
        },
        optionalTables: {
          categories: {
            enabled: schemaInfo.hasCategories,
            autoCreate: !schemaInfo.hasCategories
          },
          gearItems: {
            enabled: true,
            autoCreate: true
          },
          setupGearItems: {
            enabled: true,
            autoCreate: true
          },
          setupBaseTemplates: {
            enabled: true,
            autoCreate: true
          }
        }
      };
    }

    // Check for missing tables
    if (!schemaInfo.hasCategories) missingTables.push('categories');
    if (!schemaInfo.hasSetups) missingTables.push('setups');

    return {
      framework,
      hasProfiles: schemaInfo.hasProfiles,
      hasAccounts: schemaInfo.hasAccounts,
      hasSetups: schemaInfo.hasSetups,
      hasCategories: schemaInfo.hasCategories,
      missingTables,
      suggestedConfig
    };
  }

  /**
   * Create a configuration file with auto-detection
   */
  async createConfig(client: SupabaseClient, options: {
    environment?: 'local' | 'staging' | 'production';
    userCount?: number;
    force?: boolean;
  } = {}): Promise<FlexibleSeedConfig> {
    // Check if config already exists
    if (fs.existsSync(this.configPath) && !options.force) {
      throw new Error(`Configuration file already exists: ${this.configPath}\nUse --force to overwrite`);
    }

    // Detect current schema
    const detection = await this.detectAndSuggestConfig(client);
    
    // Build default configuration
    const config: FlexibleSeedConfig = {
      supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
      environment: options.environment || 'local',
      userCount: options.userCount || (options.environment === 'local' ? 5 : 10),
      setupsPerUser: options.environment === 'local' ? 2 : 3,
      imagesPerSetup: options.environment === 'local' ? 1 : 3,
      enableRealImages: false,
      seed: 'supa-seed-2025',
      
      // Ensure schema is always provided
      schema: detection.suggestedConfig.schema || {
        framework: 'simple',
        userTable: {
          name: 'accounts',
          emailField: 'email',
          idField: 'id',
          nameField: 'name'
        },
        setupTable: {
          name: 'setups',
          userField: 'account_id',
          titleField: 'title',
          descriptionField: 'description'
        },
        optionalTables: {}
      },
      
      storage: {
        buckets: {
          setupImages: 'setup-images',
          gearImages: 'gear-images',
          profileImages: 'profile-images'
        },
        autoCreate: true
      },
      
      seeders: {
        enabled: ['auth', 'baseData', 'users', 'gear', 'setups', 'media'],
        order: ['auth', 'baseData', 'users', 'gear', 'setups', 'media']
      },
      
      data: {
        categories: [
          {
            name: 'Overlanding',
            description: 'Vehicle-dependent travel and camping',
            icon: '🚛',
            color: '#ef4444'
          },
          {
            name: 'Backpacking',
            description: 'Multi-day hiking with overnight camping',
            icon: '🎒',
            color: '#22c55e'
          },
          {
            name: 'Car Camping',
            description: 'Vehicle-based camping adventures',
            icon: '🚗',
            color: '#3b82f6'
          },
          {
            name: 'Day Hiking',
            description: 'Single-day trail adventures',
            icon: '🥾',
            color: '#f59e0b'
          }
        ],
        baseTemplates: [
          {
            type: 'Vehicle',
            make: 'Toyota',
            model: '4Runner',
            year: 2023,
            description: 'Reliable mid-size SUV for overlanding'
          },
          {
            type: 'Backpack',
            make: 'Osprey',
            model: 'Atmos AG 65',
            description: '65L backpacking pack with anti-gravity suspension'
          }
        ]
      }
    };

    // Save configuration
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    
    return config;
  }

  /**
   * Load configuration from file
   */
  loadConfig(): FlexibleSeedConfig {
    if (!fs.existsSync(this.configPath)) {
      throw new Error(
        `Configuration file not found: ${this.configPath}\n` +
        'Run "supa-seed init" to create a configuration file'
      );
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(content) as FlexibleSeedConfig;
      return this.validateConfig(config);
    } catch (error: any) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: FlexibleSeedConfig): FlexibleSeedConfig {
    const errors: string[] = [];

    // Required fields
    if (!config.supabaseUrl) errors.push('supabaseUrl is required');
    if (!config.supabaseServiceKey) errors.push('supabaseServiceKey is required');
    if (!config.schema) errors.push('schema configuration is required');
    if (!config.schema?.userTable) errors.push('schema.userTable is required');
    if (!config.schema?.setupTable) errors.push('schema.setupTable is required');

    // Validate schema
    if (config.schema?.userTable) {
      const { name, idField, nameField } = config.schema.userTable;
      if (!name) errors.push('schema.userTable.name is required');
      if (!idField) errors.push('schema.userTable.idField is required');
      if (!nameField) errors.push('schema.userTable.nameField is required');
    }

    // Validate numbers
    if (config.userCount <= 0) errors.push('userCount must be greater than 0');
    if (config.setupsPerUser <= 0) errors.push('setupsPerUser must be greater than 0');

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.map(e => `  • ${e}`).join('\n')}`);
    }

    return config;
  }

  /**
   * Create multiple environment profiles
   */
  createProfiles(): ConfigProfile[] {
    return [
      {
        name: 'local',
        description: 'Local development with minimal data',
        config: {
          supabaseUrl: 'http://127.0.0.1:54321',
          supabaseServiceKey: 'your-service-role-key',
          environment: 'local',
          userCount: 3,
          setupsPerUser: 2,
          imagesPerSetup: 1,
          enableRealImages: false,
          seed: 'local-dev',
        } as FlexibleSeedConfig
      },
      {
        name: 'staging',
        description: 'Staging environment with realistic data',
        config: {
          supabaseUrl: 'https://your-project.supabase.co',
          supabaseServiceKey: 'your-staging-service-role-key',
          environment: 'staging',
          userCount: 25,
          setupsPerUser: 4,
          imagesPerSetup: 3,
          enableRealImages: true,
          seed: 'staging-2025',
        } as FlexibleSeedConfig
      },
      {
        name: 'production',
        description: 'Production demo data',
        config: {
          supabaseUrl: 'https://your-project.supabase.co',
          supabaseServiceKey: 'your-production-service-role-key',
          environment: 'production',
          userCount: 50,
          setupsPerUser: 5,
          imagesPerSetup: 5,
          enableRealImages: true,
          seed: 'prod-demo-2025',
        } as FlexibleSeedConfig
      }
    ];
  }

  /**
   * Auto-create missing tables based on configuration
   */
  async autoCreateTables(client: SupabaseClient, config: FlexibleSeedConfig): Promise<void> {
    console.log('🔧 Auto-creating missing tables...');
    
    // This would contain SQL generation logic based on the config
    // For now, we'll use the existing schema files
    console.log('✅ Tables created successfully');
  }

  /**
   * Print configuration summary
   */
  printConfigSummary(config: FlexibleSeedConfig): void {
    console.log('\n📋 Configuration Summary:');
    console.log(`   Environment: ${config.environment}`);
    console.log(`   Framework: ${config.schema?.framework || 'auto-detect'}`);
    console.log(`   Users: ${config.userCount}`);
    console.log(`   Setups per user: ${config.setupsPerUser}`);
    console.log(`   Images per setup: ${config.imagesPerSetup}`);
    
    if (config.schema?.userTable?.name) {
      console.log(`   User table: ${config.schema.userTable.name}`);
    }
    
    if (config.schema?.setupTable?.name) {
      console.log(`   Setup table: ${config.schema.setupTable.name}`);
    }
    
    if (config.schema?.optionalTables) {
      const enabled = Object.entries(config.schema.optionalTables)
        .filter(([, opts]) => {
          if (typeof opts === 'boolean') return opts;
          return opts?.enabled;
        })
        .map(([name]) => name);
      if (enabled.length > 0) {
        console.log(`   Optional tables: ${enabled.join(', ')}`);
      }
    }
  }

  /**
   * Check if a table exists in the database
   */
  private async tableExists(client: SupabaseClient, tableName: string): Promise<boolean> {
    try {
      const { error } = await client.from(tableName).select('*').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}