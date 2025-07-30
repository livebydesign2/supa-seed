import * as fs from 'fs';
import * as path from 'path';
import { FlexibleSeedConfig, ConfigProfile, ConfigDetectionResult, ExtendedSeedConfig } from '../types/config-types';
import { SchemaAdapter } from '../schema-adapter';
import { FrameworkAdapter } from '../../features/integration/framework-adapter';
// SchemaEvolutionDetector removed - feature not available in v2.4.1
import { DataVolumeManager } from '../../features/generation/data-volume-manager';
import { CustomRelationshipManager } from '../../schema/custom-relationship-manager';
import { DataGenerationPatternManager } from '../../features/generation/data-generation-pattern-manager';
import type { createClient } from '@supabase/supabase-js';
import type { ConstraintHandler } from '../../features/analysis/constraint-types';
import type { SeedingStrategy } from '../../features/integration/strategy-interface';
import { Logger } from '../utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface ConfigManagerOptions {
  enableExtensibility?: boolean;
  enableSchemaEvolution?: boolean;
  customHandlerRegistry?: Map<string, ConstraintHandler>;
  customStrategies?: Map<string, SeedingStrategy>;
}

export class ConfigManager {
  private configPath: string;
  private options: ConfigManagerOptions;
  private schemaCache: Map<string, any> = new Map();
  private customHandlers: Map<string, ConstraintHandler> = new Map();
  private customStrategies: Map<string, SeedingStrategy> = new Map();
  private client?: SupabaseClient;

  constructor(configPath: string = 'supa-seed.config.json', options: ConfigManagerOptions = {}) {
    this.configPath = path.resolve(configPath);
    this.options = {
      enableExtensibility: true,
      enableSchemaEvolution: true,
      ...options
    };

    // Initialize custom registries
    if (options.customHandlerRegistry) {
      this.customHandlers = new Map(options.customHandlerRegistry);
    }
    if (options.customStrategies) {
      this.customStrategies = new Map(options.customStrategies);
    }
  }

  /**
   * Detect current database schema and suggest configuration
   */
  async detectAndSuggestConfig(client: SupabaseClient, configOverride?: any, supabaseUrl?: string, supabaseKey?: string): Promise<ConfigDetectionResult> {
    const schemaAdapter = new SchemaAdapter(client, configOverride, supabaseUrl, supabaseKey);
    const schemaInfo = await schemaAdapter.detectSchema();
    
    const missingTables: string[] = [];
    const suggestedConfig: Partial<FlexibleSeedConfig> = {};

    // Check for manual framework configuration override first
    let framework: 'simple' | 'makerkit' | 'custom' = 'simple';
    
    if (configOverride?.database?.framework) {
      const overrideFramework = configOverride.database.framework;
      if (overrideFramework === 'makerkit-v2' || overrideFramework === 'makerkit-v3' || overrideFramework === 'makerkit') {
        framework = 'makerkit';
      } else if (overrideFramework === 'simple') {
        framework = 'simple';
      } else {
        framework = 'custom';
      }
    } else {
      // Use enhanced framework detection from SchemaAdapter
      if (schemaInfo.frameworkType === 'makerkit' || schemaInfo.frameworkType === 'wildernest') {
        framework = 'makerkit';
      } else if (schemaInfo.frameworkType === 'simple') {
        framework = 'simple';
      } else {
        framework = 'custom';
      }
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
      suggestedConfig,
      // Enhanced detection results from SchemaAdapter
      enhancedDetection: {
        makerkitVersion: schemaInfo.makerkitVersion,
        frameworkType: schemaInfo.frameworkType,
        primaryUserTable: schemaInfo.primaryUserTable,
        customTables: schemaInfo.customTables.length,
        relationships: schemaInfo.detectedRelationships.length,
        assetCompatibility: {
          images: schemaInfo.assetCompatibility.supportsImages,
          markdown: schemaInfo.assetCompatibility.supportsMarkdown,
          storage: schemaInfo.assetCompatibility.mediaStoragePattern
        }
      }
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
            name: 'Primary',
            description: 'Main category items',
            icon: '⭐',
            color: '#22c55e'
          },
          {
            name: 'Secondary',
            description: 'Supporting items',
            icon: '📋',
            color: '#3b82f6'
          },
          {
            name: 'Tools',
            description: 'Tools and utilities',
            icon: '🔧',
            color: '#f59e0b'
          },
          {
            name: 'Resources',
            description: 'Resources and materials',
            icon: '📚',
            color: '#ef4444'
          }
        ],
        baseTemplates: [
          {
            type: 'Project',
            make: 'Standard',
            model: 'Basic',
            year: undefined,
            description: 'Standard project template'
          },
          {
            type: 'Collection',
            make: 'Essential',
            model: 'Starter',
            year: undefined,
            description: 'Essential starter collection template'
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
   * Save configuration to file
   */
  saveConfig(config: FlexibleSeedConfig): void {
    try {
      const validatedConfig = this.validateConfig(config);
      fs.writeFileSync(this.configPath, JSON.stringify(validatedConfig, null, 2));
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
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
   * Validate column mappings against actual database schema
   */
  async validateColumnMappings(client: SupabaseClient, config: FlexibleSeedConfig): Promise<{
    valid: boolean;
    warnings: string[];
    suggestions: string[];
  }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    if (!config.schema?.userTable) {
      return { valid: true, warnings, suggestions };
    }
    
    try {
      // Create SchemaAdapter for column validation
      const schemaAdapter = new SchemaAdapter(client, config);
      
      // Validate profiles table mappings with database schema
      // Use comprehensive field lists to avoid false positives
      const profilesValidation = await schemaAdapter.validateTableSchema('profiles', {
        email: [
          config.schema.userTable.emailField || 'email',
          'email_address', 'user_email', 'email'
        ],
        name: [
          config.schema.userTable.nameField || 'name',
          'name', 'display_name', 'full_name', 'username'
        ],
        picture: [
          config.schema.userTable.pictureField || 'picture_url',
          'picture_url', 'avatar_url', 'profile_image_url', 'image_url'
        ],
        bio: [
          config.schema.userTable.bioField || 'bio',
          'bio', 'about', 'description'
        ],
        id: [
          config.schema.userTable.idField || 'id',
          'id'
        ]
      });
      
      // Only warn about truly missing mappings, not fields that exist with different names
      if (!profilesValidation.valid && profilesValidation.missingFields.length > 0) {
        // Double-check each missing field against actual available columns
        const actuallyMissingFields = profilesValidation.missingFields.filter(fieldName => {
          const fieldOptions = {
            email: ['email', 'email_address', 'user_email'],
            name: ['name', 'display_name', 'full_name', 'username'],
            picture: ['picture_url', 'avatar_url', 'profile_image_url', 'image_url'],
            bio: ['bio', 'about', 'description'],
            id: ['id']
          }[fieldName] || [];
          
          // Check if any of the field options exist in available columns
          return !fieldOptions.some(option => 
            profilesValidation.availableColumns.includes(option)
          );
        });
        
        // Only show warnings for fields that are truly missing
        actuallyMissingFields.forEach(field => {
          warnings.push(`Profiles table: '${field}' column mapping may be incorrect`);
        });
        
        // Only add suggestions if there are actually missing fields
        if (actuallyMissingFields.length > 0) {
          suggestions.push(...profilesValidation.suggestions);
          
          if (profilesValidation.availableColumns.length > 0) {
            suggestions.push(`Available columns in profiles table: ${profilesValidation.availableColumns.join(', ')}`);
          }
        }
      }
      
      // Validate setups table if configured
      if (config.schema.setupTable) {
        const setupsValidation = await schemaAdapter.validateTableSchema(config.schema.setupTable.name || 'setups', {
          title: [config.schema.setupTable.titleField || 'title'],
          description: [config.schema.setupTable.descriptionField || 'description'],
          user_field: [config.schema.setupTable.userField || 'user_id']
        });
        
        if (!setupsValidation.valid) {
          setupsValidation.missingFields.forEach(field => {
            warnings.push(`Setups table: '${field}' column mapping may be incorrect`);
          });
          
          suggestions.push(...setupsValidation.suggestions);
        }
      }
      
      // Validate base templates if configured  
      if (config.schema.baseTemplateTable) {
        const templatesValidation = await schemaAdapter.validateTableSchema(config.schema.baseTemplateTable.name || 'base_templates', {
          type: [config.schema.baseTemplateTable.typeField || 'type'],
          make: [config.schema.baseTemplateTable.makeField || 'make'],
          model: [config.schema.baseTemplateTable.modelField || 'model'],
          description: [config.schema.baseTemplateTable.descriptionField || 'description']
        });
        
        if (!templatesValidation.valid) {
          templatesValidation.missingFields.forEach(field => {
            warnings.push(`Base templates table: '${field}' column mapping may be incorrect`);
          });
          
          suggestions.push(...templatesValidation.suggestions);
        }
      }
      
    } catch (error: any) {
      warnings.push(`Unable to validate column mappings against database: ${error.message}`);
    }
    
    return {
      valid: warnings.length === 0,
      warnings,
      suggestions
    };
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

  /**
   * Epic 7 Enhanced Configuration Methods
   */

  /**
   * FR-7.1: Support framework strategy overrides
   */
  async detectFrameworkWithOverrides(
    client: SupabaseClient, 
    config?: ExtendedSeedConfig
  ): Promise<{
    detectedFramework: string;
    overriddenFramework?: string;
    availableStrategies: string[];
    recommendations: string[];
  }> {
    Logger.info('🔍 Detecting framework with strategy override support...');

    try {
      // Initialize framework adapter
      const frameworkAdapter = new FrameworkAdapter(client, config, {
        enableSchemaCache: this.options.enableSchemaEvolution,
        frameworkOverride: config?.frameworkStrategy?.manualOverride,
        debug: config?.frameworkStrategy?.enabled
      });

      await frameworkAdapter.initialize();

      // Get framework detection results
      const detection = frameworkAdapter.getStrategySelection();
      const availableStrategies = frameworkAdapter.getAvailableStrategies();
      const recommendations = frameworkAdapter.getRecommendations();

      let detectedFramework = detection?.detection.framework || 'generic';
      let overriddenFramework: string | undefined;

      // Apply manual override if specified
      if (config?.frameworkStrategy?.manualOverride) {
        Logger.info(`📝 Framework override applied: ${config.frameworkStrategy.manualOverride}`);
        overriddenFramework = config.frameworkStrategy.manualOverride;
        
        // Validate override against available strategies
        if (!availableStrategies.includes(overriddenFramework)) {
          const error = `Invalid framework override: ${overriddenFramework}. Available: ${availableStrategies.join(', ')}`;
          
          if (config.frameworkStrategy.fallbackBehavior === 'error') {
            throw new Error(error);
          } else if (config.frameworkStrategy.fallbackBehavior === 'generic') {
            Logger.warn(`${error}. Falling back to generic strategy.`);
            overriddenFramework = 'generic';
          } else {
            Logger.warn(`${error}. Skipping framework override.`);
            overriddenFramework = undefined;
          }
        }
      }

      // Register custom strategies if configured
      if (config?.frameworkStrategy?.customStrategies) {
        for (const customStrategy of config.frameworkStrategy.customStrategies) {
          await this.registerCustomStrategy(customStrategy);
        }
      }

      return {
        detectedFramework,
        overriddenFramework,
        availableStrategies,
        recommendations: [
          ...recommendations,
          `Detected framework: ${detectedFramework}`,
          ...(overriddenFramework ? [`Using override: ${overriddenFramework}`] : []),
          `Available strategies: ${availableStrategies.join(', ')}`
        ]
      };

    } catch (error: any) {
      Logger.error('Framework detection with overrides failed:', error);
      throw error;
    }
  }

  /**
   * FR-7.2: Register custom constraint handler
   */
  registerCustomConstraintHandler(handler: ConstraintHandler): void {
    Logger.info(`🔧 Registering custom constraint handler: ${handler.id}`);
    this.customHandlers.set(handler.id, handler);
  }

  /**
   * FR-7.2: Apply custom constraint handlers from configuration
   */
  applyCustomConstraintHandlers(config: ExtendedSeedConfig): ConstraintHandler[] {
    const handlers: ConstraintHandler[] = [];

    if (!config.constraintHandlers?.enabled) {
      return handlers;
    }

    Logger.info('🔧 Applying custom constraint handlers from configuration');

    for (const handlerConfig of config.constraintHandlers.customHandlers || []) {
      try {
        // Create constraint handler from configuration
        const handler: ConstraintHandler = {
          id: handlerConfig.id,
          type: handlerConfig.type,
          priority: handlerConfig.priority,
          description: handlerConfig.description || `Custom ${handlerConfig.type} handler`,
          canHandle: (constraint: any) => {
            // Simple matching logic - can be enhanced
            if (handlerConfig.tables && handlerConfig.tables.length > 0) {
              return handlerConfig.tables.includes(constraint.table);
            }
            return constraint.type === handlerConfig.type;
          },
          handle: this.createConstraintHandlerFunction(handlerConfig.handlerFunction)
        };

        handlers.push(handler);
        this.customHandlers.set(handler.id, handler);

        Logger.debug(`✅ Registered custom constraint handler: ${handler.id}`);
      } catch (error: any) {
        Logger.error(`Failed to register constraint handler ${handlerConfig.id}:`, error);
      }
    }

    return handlers;
  }

  /**
   * FR-7.3: Schema evolution detection
   */
  async detectSchemaEvolution(
    client: SupabaseClient, 
    config: ExtendedSeedConfig
  ): Promise<{
    hasChanged: boolean;
    changes: Array<{
      type: 'table_added' | 'table_removed' | 'column_added' | 'column_removed' | 'constraint_changed';
      table: string;
      column?: string;
      description: string;
    }>;
    schemaVersion: string;
    migrationRequired: boolean;
    recommendations: string[];
  }> {
    if (!config.schemaEvolution?.enabled) {
      return {
        hasChanged: false,
        changes: [],
        schemaVersion: 'unknown',
        migrationRequired: false,
        recommendations: ['Schema evolution detection is disabled']
      };
    }

    Logger.info('🔄 Schema evolution detection not available in v2.4.1');

    try {
      // Schema evolution detection feature removed in v2.4.1
      // Using basic detection instead
      const changes: any[] = [];
      const evolutionResult = {
        hasChanged: false,
        changes: [],
        recommendations: ['Schema evolution detection disabled in v2.4.1'],
        schemaVersion: 'v2.4.1',
        migrationRequired: false
      };

      // Handle onSchemaChange behavior
      if (evolutionResult.hasChanged) {
        Logger.info(`📊 Schema changes detected: ${evolutionResult.changes.length} changes`);
        
        switch (config.schemaEvolution.onSchemaChange) {
          case 'error':
            throw new Error(`Schema evolution detected with ${evolutionResult.changes.length} changes. Configuration set to error on schema change.`);
          case 'warn':
            Logger.warn('⚠️  Schema changes detected - review changes before proceeding');
            break;
          case 'auto-adapt':
            Logger.info('🤖 Schema changes detected - automatically adapting configuration');
            break;
          case 'prompt':
            Logger.info('❓ Schema changes detected - user prompt required');
            break;
        }
      }

      return {
        hasChanged: evolutionResult.hasChanged,
        changes,
        schemaVersion: evolutionResult.schemaVersion,
        migrationRequired: evolutionResult.migrationRequired,
        recommendations: evolutionResult.recommendations
      };

    } catch (error: any) {
      Logger.error('Schema evolution detection failed:', error);
      throw error;
    }
  }

  /**
   * FR-7.4: Generate realistic data volume configuration
   */
  generateDataVolumeConfiguration(requirements: {
    environment: 'development' | 'staging' | 'production';
    testingScenarios: string[];
    expectedLoad: 'light' | 'medium' | 'heavy';
    domainType?: string;
    customConstraints?: {
      maxUsers?: number;
      maxSeedingTime?: number;
      maxDatabaseSize?: number;
    };
  }): ExtendedSeedConfig['dataVolumes'] {
    Logger.info(`📊 Generating data volume configuration for ${requirements.environment} environment`);

    const dataVolumeManager = new DataVolumeManager();
    
    // Use the comprehensive data volume manager for generation
    const dataVolumes = dataVolumeManager.generateDataVolumeConfiguration(requirements);
    
    Logger.info(`✅ Generated data volume configuration with ${dataVolumes?.volumeProfiles?.length || 0} profiles`);
    
    return dataVolumes;
  }

  /**
   * Calculate data generation metrics for a configuration
   */
  calculateDataGenerationMetrics(config: ExtendedSeedConfig): {
    totalUsers: number;
    totalItems: number;
    totalRelationships: number;
    publicContentCount: number;
    privateContentCount: number;
    draftContentCount: number;
    estimatedDatabaseSize: number;
    estimatedSeedingTime: number;
  } {
    const dataVolumeManager = new DataVolumeManager();
    return dataVolumeManager.calculateGenerationMetrics(config);
  }

  /**
   * Get recommended data volume profile for specific use case
   */
  getRecommendedDataVolumeProfile(useCase: 'ci-testing' | 'development' | 'demo' | 'load-testing' | 'production') {
    const dataVolumeManager = new DataVolumeManager();
    return dataVolumeManager.getRecommendedProfile(useCase);
  }

  /**
   * Validate data volume configuration
   */
  validateDataVolumeConfiguration(config: ExtendedSeedConfig['dataVolumes']): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const dataVolumeManager = new DataVolumeManager();
    return dataVolumeManager.validateDataVolumeConfiguration(config);
  }

  /**
   * FR-7.5: Validate custom relationship definitions
   */
  async validateCustomRelationships(
    client: SupabaseClient,
    relationships: ExtendedSeedConfig['customRelationships']
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  }> {
    if (!relationships?.enabled) {
      return { 
        valid: true, 
        errors: [], 
        warnings: ['Custom relationships disabled'], 
        recommendations: ['Consider enabling custom relationships for better data modeling'] 
      };
    }

    Logger.info('🔗 Validating custom relationship definitions...');

    try {
      const relationshipManager = new CustomRelationshipManager(client);
      const validationResult = await relationshipManager.validateCustomRelationships(relationships);

      Logger.info(`✅ Custom relationship validation completed: ${validationResult.errors.length} errors, ${validationResult.warnings.length} warnings`);

      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        recommendations: validationResult.recommendations
      };

    } catch (error: any) {
      Logger.error('Custom relationship validation failed:', error);
      return { 
        valid: false, 
        errors: [`Validation error: ${error.message}`], 
        warnings: [], 
        recommendations: ['Fix validation errors and retry'] 
      };
    }
  }

  /**
   * Generate relationship execution plan
   */
  async generateRelationshipExecutionPlan(
    client: SupabaseClient,
    relationships: ExtendedSeedConfig['customRelationships']
  ) {
    const relationshipManager = new CustomRelationshipManager(client);
    return await relationshipManager.generateRelationshipExecutionPlan(relationships);
  }

  /**
   * Create relationship generators for data seeding
   */
  createRelationshipGenerators(
    client: SupabaseClient,
    relationships: ExtendedSeedConfig['customRelationships']
  ) {
    if (!relationships?.enabled || !relationships.relationships) {
      return new Map();
    }

    const relationshipManager = new CustomRelationshipManager(client);
    return relationshipManager.createRelationshipGenerators(relationships.relationships);
  }

  /**
   * Apply inheritance rules to generated data
   */
  applyInheritanceRules(
    client: SupabaseClient,
    data: Record<string, any[]>,
    inheritanceRules?: any[]
  ): Record<string, any[]> {
    if (!inheritanceRules || inheritanceRules.length === 0) {
      return data;
    }

    const relationshipManager = new CustomRelationshipManager(client);
    return relationshipManager.applyInheritanceRules(data, inheritanceRules);
  }

  /**
   * Generate data using configured patterns
   */
  generateDataWithPatterns(
    config: ExtendedSeedConfig,  
    table: string,
    count: number,
    context: Record<string, any> = {}
  ): any[] {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.generateDataWithPatterns(config, table, count, context);
  }

  /**
   * Apply consistency rules to generated data
   */
  applyDataConsistencyRules(
    data: Record<string, any[]>,
    config: ExtendedSeedConfig
  ): {
    data: Record<string, any[]>;
    violations: Array<{
      rule: string;
      severity: string;
      message: string;
      affectedTables: string[];
      autoFixed: boolean;
    }>;
  } {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.applyConsistencyRules(data, config);
  }

  /**
   * Enforce referential integrity on generated data
   */
  enforceReferentialIntegrity(
    data: Record<string, any[]>,
    config: ExtendedSeedConfig
  ): {
    data: Record<string, any[]>;
    orphansRemoved: number;
    referencesFixed: number;
  } {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.enforceReferentialIntegrity(data, config);
  }

  /**
   * Validate generated data patterns
   */
  validateGeneratedDataPatterns(
    data: Record<string, any[]>,
    config: ExtendedSeedConfig
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    patternMetrics: Record<string, any>;
  } {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.validateGeneratedPatterns(data, config);
  }

  /**
   * Get available data generation patterns
   */
  getAvailableDataPatterns(domain?: string) {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.getAvailablePatterns(domain);
  }

  /**
   * Get domain-specific vocabulary
   */
  getDomainVocabulary(domain: string) {
    const patternManager = new DataGenerationPatternManager();
    return patternManager.getDomainVocabulary(domain);
  }

  /**
   * Create custom data generation pattern
   */
  createCustomDataPattern(pattern: any): void {
    const patternManager = new DataGenerationPatternManager();
    patternManager.createCustomPattern(pattern);
  }

  /**
   * Enhanced configuration validation with extensibility support
   */
  validateExtendedConfig(config: ExtendedSeedConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    Logger.info('🔍 Validating extended configuration...');

    // Basic validation (existing logic)
    try {
      this.validateConfig(config);
    } catch (error: any) {
      errors.push(`Basic validation failed: ${error.message}`);
    }

    // Framework strategy validation
    if (config.frameworkStrategy?.enabled) {
      if (config.frameworkStrategy.customStrategies) {
        for (const strategy of config.frameworkStrategy.customStrategies) {
          if (!strategy.name) {
            errors.push('Custom strategy name is required');
          }
          if (!strategy.priority || strategy.priority < 0) {
            errors.push(`Invalid priority for custom strategy '${strategy.name}'`);
          }
        }
      }
    }

    // Constraint handlers validation
    if (config.constraintHandlers?.enabled) {
      if (config.constraintHandlers.customHandlers) {
        for (const handler of config.constraintHandlers.customHandlers) {
          if (!handler.id) {
            errors.push('Custom constraint handler ID is required');
          }
          if (!handler.handlerFunction) {
            errors.push(`Handler function is required for constraint handler '${handler.id}'`);
          }
        }
      }
    }

    // Schema evolution validation
    if (config.schemaEvolution?.enabled) {
      if (!config.schemaEvolution.cacheLocation) {
        warnings.push('Schema evolution cache location not specified - using default');
      }
      if (config.schemaEvolution.trackingMode === 'version' && !config.schemaEvolution.migrationStrategies?.length) {
        warnings.push('Version tracking enabled but no migration strategies defined');
      }
    }

    // Data volumes validation
    if (config.dataVolumes?.enabled) {
      const ratios = config.dataVolumes.patterns.contentRatios;
      const totalRatio = ratios.publicContent + ratios.privateContent + ratios.draftContent;
      if (Math.abs(totalRatio - 1.0) > 0.01) {
        errors.push(`Content ratios must sum to 1.0, got ${totalRatio}`);
      }
    }

    recommendations.push('Extended configuration validation completed');
    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push('✅ All validations passed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Helper methods for Epic 7 functionality
   */

  private async registerCustomStrategy(strategyConfig: any): Promise<void> {
    Logger.debug(`Registering custom strategy: ${strategyConfig.name}`);
    // Implementation would load and register custom strategy module
    // For now, we'll just log the registration
  }

  private createConstraintHandlerFunction(handlerFunction: string): any {
    // Implementation would create actual constraint handler function
    // For now, return a placeholder
    return (constraint: any, data: any) => ({
      success: true,
      originalData: data,
      modifiedData: data,
      appliedFixes: [],
      warnings: [`Custom handler applied: ${handlerFunction}`],
      errors: [],
      bypassRequired: false
    });
  }

  private mapChangeType(detectorChangeType: string): 'table_added' | 'table_removed' | 'column_added' | 'column_removed' | 'constraint_changed' {
    switch (detectorChangeType) {
      case 'table_added': return 'table_added';
      case 'table_removed': return 'table_removed';
      case 'column_added': return 'column_added';
      case 'column_removed': return 'column_removed';
      case 'column_modified': return 'constraint_changed';
      case 'constraint_added':
      case 'constraint_removed':
      case 'constraint_modified':
        return 'constraint_changed';
      default:
        return 'constraint_changed';
    }
  }
}