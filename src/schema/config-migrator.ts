/**
 * Configuration Migration System
 * Migrates existing configs from hardcoded framework assumptions to schema-first format
 * Ensures backward compatibility while encouraging adoption of new architecture
 */

import type { createClient } from '@supabase/supabase-js';
import { SchemaDrivenAdapter } from './schema-driven-adapter';
import { DynamicColumnMapper } from './dynamic-column-mapper';
import { Logger } from '../core/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

type SupabaseClient = ReturnType<typeof createClient>;

export interface LegacyConfig {
  // Old supa-seed configuration format
  supabaseUrl: string;
  supabaseServiceKey: string;
  environment: string;
  userCount: number;
  setupsPerUser: number;
  imagesPerSetup: number;
  enableRealImages: boolean;
  seed: string;
  emailDomain: string;
  domain?: string;
  createStandardTestEmails?: boolean;
  createTeamAccounts?: boolean;
  testUserPassword?: string;
  
  // Legacy schema configuration
  schema?: {
    framework?: string;
    primaryUserTable?: string;
    userTable?: {
      name: string;
      emailField?: string;
      nameField?: string;
      pictureField?: string;
      bioField?: string;
      usernameField?: string;
    };
    setupTable?: {
      name: string;
      userField?: string;
      titleField?: string;
      descriptionField?: string;
      categoryField?: string;
      publicField?: string;
    };
    baseTemplateTable?: {
      name: string;
      typeField?: string;
      makeField?: string;
      modelField?: string;
      yearField?: string;
      descriptionField?: string;
    };
    optionalTables?: Record<string, any>;
  };
  
  // Legacy storage configuration
  storage?: {
    buckets?: Record<string, string>;
    autoCreate?: boolean;
  };
  
  // Legacy seeders configuration
  seeders?: {
    enabled?: string[];
    skip?: string[];
  };
}

export interface ModernConfig {
  // New schema-first configuration format
  version: '2.1.0';
  
  // Connection settings (unchanged)
  supabaseUrl: string;
  supabaseServiceKey: string;
  environment: string;
  
  // Seeding settings (enhanced)
  seeding: {
    userCount: number;
    setupsPerUser: number;
    imagesPerSetup: number;
    enableRealImages: boolean;
    seed: string;
    emailDomain: string;
    domain: string;
    testUserPassword: string;
    
    // New schema-driven settings
    enableSchemaIntrospection: boolean;
    enableConstraintValidation: boolean;
    enableAutoFixes: boolean;
    enableProgressiveEnhancement: boolean;
    enableGracefulDegradation: boolean;
  };
  
  // Schema configuration (new approach)
  schema: {
    // Detection settings
    autoDetectFramework: boolean;
    frameworkOverride?: string;
    versionOverride?: string;
    primaryUserTable?: string;
    
    // Column mapping configuration
    columnMapping: {
      enableDynamicMapping: boolean;
      enableFuzzyMatching: boolean;
      enablePatternMatching: boolean;
      minimumConfidence: number;
      customMappings: Record<string, Record<string, string>>;
    };
    
    // Constraint handling
    constraints: {
      enableValidation: boolean;
      enableAutoFixes: boolean;
      skipOptionalConstraints: boolean;
      createDependenciesOnDemand: boolean;
    };
    
    // Relationship handling
    relationships: {
      enableDiscovery: boolean;
      respectForeignKeys: boolean;
      handleCircularDependencies: boolean;
      enableParallelSeeding: boolean;
    };
  };
  
  // Execution settings (enhanced)
  execution: {
    enableRollback: boolean;
    maxRetries: number;
    timeoutMs: number;
    continueOnError: boolean;
    enableCaching: boolean;
    cacheTimeout: number;
  };
  
  // Backward compatibility settings
  compatibility: {
    enableLegacyMode: boolean;
    legacyFallbacks: string[];
    maintainOldBehavior: boolean;
  };
  
  // Migration metadata
  migration: {
    migratedFrom: string;
    migrationDate: string;
    originalConfigHash: string;
    migrationWarnings: string[];
  };
}

export interface MigrationResult {
  success: boolean;
  modernConfig: ModernConfig;
  warnings: string[];
  errors: string[];
  changes: ConfigChange[];
  backupPath: string;
  recommendedActions: string[];
}

export interface ConfigChange {
  type: 'added' | 'modified' | 'removed' | 'restructured';
  path: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
}

export interface MigrationOptions {
  // Input/output options
  inputPath?: string;
  outputPath?: string;
  createBackup: boolean;
  
  // Migration behavior
  enableSchemaAnalysis: boolean;
  preserveLegacyBehavior: boolean;
  enableModernFeatures: boolean;
  
  // Safety options
  validateAfterMigration: boolean;
  dryRun: boolean;
  
  // Customization
  customMappings?: Record<string, Record<string, string>>;
  frameworkHint?: string;
}

export class ConfigMigrator {
  private client: SupabaseClient;
  private adapter: SchemaDrivenAdapter;
  private columnMapper: DynamicColumnMapper;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.adapter = new SchemaDrivenAdapter(client);
    this.columnMapper = new DynamicColumnMapper();
  }

  /**
   * Migrate a legacy configuration to the new schema-first format
   */
  async migrateConfig(
    legacyConfig: LegacyConfig,
    options: Partial<MigrationOptions> = {}
  ): Promise<MigrationResult> {
    Logger.info('🔄 Starting configuration migration to schema-first format...');

    const migrationOptions = {
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      createBackup: options.createBackup ?? true,
      enableSchemaAnalysis: options.enableSchemaAnalysis ?? true,
      preserveLegacyBehavior: options.preserveLegacyBehavior ?? false,
      enableModernFeatures: options.enableModernFeatures ?? true,
      validateAfterMigration: options.validateAfterMigration ?? true,
      dryRun: options.dryRun ?? false,
      customMappings: options.customMappings,
      frameworkHint: options.frameworkHint
    };

    const warnings: string[] = [];
    const errors: string[] = [];
    const changes: ConfigChange[] = [];
    let backupPath = '';

    try {
      // Create backup if requested
      if (migrationOptions.createBackup && migrationOptions.inputPath) {
        backupPath = await this.createBackup(migrationOptions.inputPath);
        Logger.info(`📋 Configuration backup created: ${backupPath}`);
      }

      // Analyze current schema if enabled
      let schemaAnalysis: any = null;
      if (migrationOptions.enableSchemaAnalysis) {
        try {
          schemaAnalysis = await this.analyzeCurrentSchema(legacyConfig);
          Logger.debug('Schema analysis completed');
        } catch (error: any) {
          warnings.push(`Schema analysis failed: ${error.message}`);
          Logger.warn('Schema analysis failed, proceeding with basic migration');
        }
      }

      // Build modern configuration
      const modernConfig = await this.buildModernConfig(
        legacyConfig,
        schemaAnalysis,
        migrationOptions,
        changes,
        warnings
      );

      // Validate migrated configuration
      if (migrationOptions.validateAfterMigration) {
        const validationResult = await this.validateModernConfig(modernConfig);
        if (!validationResult.valid) {
          errors.push(...validationResult.errors);
          warnings.push(...validationResult.warnings);
        }
      }

      // Save configuration if not dry run
      if (!migrationOptions.dryRun && migrationOptions.outputPath) {
        await this.saveModernConfig(modernConfig, migrationOptions.outputPath);
        Logger.success(`✅ Migrated configuration saved: ${migrationOptions.outputPath}`);
      }

      // Generate recommendations
      const recommendedActions = this.generateRecommendations(
        legacyConfig,
        modernConfig,
        schemaAnalysis,
        warnings
      );

      const result: MigrationResult = {
        success: errors.length === 0,
        modernConfig,
        warnings,
        errors,
        changes,
        backupPath,
        recommendedActions
      };

      this.logMigrationResult(result);
      return result;

    } catch (error: any) {
      Logger.error('Configuration migration failed:', error);
      
      return {
        success: false,
        modernConfig: await this.createFallbackConfig(legacyConfig),
        warnings,
        errors: [...errors, error.message],
        changes,
        backupPath,
        recommendedActions: ['Fix migration errors before proceeding']
      };
    }
  }

  /**
   * Migrate configuration file from disk
   */
  async migrateConfigFile(
    inputPath: string,
    outputPath?: string,
    options: Partial<MigrationOptions> = {}
  ): Promise<MigrationResult> {
    try {
      // Read legacy configuration
      const legacyConfig = await this.readLegacyConfig(inputPath);
      
      // Set up migration options
      const migrationOptions = {
        inputPath,
        outputPath: outputPath || inputPath.replace(/\.json$/, '.v2.json'),
        createBackup: options.createBackup ?? true,
        enableSchemaAnalysis: options.enableSchemaAnalysis ?? true,
        preserveLegacyBehavior: options.preserveLegacyBehavior ?? false,
        enableModernFeatures: options.enableModernFeatures ?? true,
        validateAfterMigration: options.validateAfterMigration ?? true,
        dryRun: options.dryRun ?? false,
        customMappings: options.customMappings,
        frameworkHint: options.frameworkHint
      };

      return await this.migrateConfig(legacyConfig, migrationOptions);

    } catch (error: any) {
      Logger.error(`Failed to migrate config file ${inputPath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a configuration needs migration
   */
  async checkMigrationNeeded(configPath: string): Promise<{
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
    reasons: string[];
  }> {
    try {
      const config = await this.readConfigFile(configPath);
      const needsMigration = !this.isModernConfig(config);
      
      const reasons: string[] = [];
      
      if (!config.version || config.version !== '2.1.0') {
        reasons.push('Missing or outdated version number');
      }
      
      if (!config.schema?.columnMapping) {
        reasons.push('Missing dynamic column mapping configuration');
      }
      
      if (!config.schema?.constraints) {
        reasons.push('Missing constraint handling configuration');
      }
      
      if (!config.execution) {
        reasons.push('Missing execution configuration');
      }

      return {
        needsMigration,
        currentVersion: config.version || 'legacy',
        targetVersion: '2.1.0',
        reasons
      };

    } catch (error: any) {
      return {
        needsMigration: true,
        currentVersion: 'unknown',
        targetVersion: '2.1.0',
        reasons: [`Failed to read config: ${error.message}`]
      };
    }
  }

  /**
   * Create a backup of the original configuration
   */
  private async createBackup(originalPath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = originalPath.replace(/\.json$/, `.backup.${timestamp}.json`);
    
    await fs.promises.copyFile(originalPath, backupPath);
    return backupPath;
  }

  /**
   * Analyze current schema to inform migration
   */
  private async analyzeCurrentSchema(legacyConfig: LegacyConfig): Promise<any> {
    try {
      // Update adapter configuration
      this.adapter.updateConfig({
        enableSchemaCache: false // Force fresh analysis
      });

      const schemaInfo = await this.adapter.getSchemaInfo();
      const columnMappings = await this.columnMapper.createMappings({
        tables: [],
        relationships: [],
        patterns: [],
        constraints: {
          userCreationConstraints: [],
          dataIntegrityRules: [],
          businessLogicConstraints: []
        },
        framework: schemaInfo.framework,
        recommendations: []
      } as any);

      return {
        framework: schemaInfo.framework,
        tables: schemaInfo.tables,
        mappings: this.columnMapper.exportMappings(columnMappings)
      };

    } catch (error: any) {
      Logger.warn(`Schema analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Build modern configuration from legacy configuration
   */
  private async buildModernConfig(
    legacyConfig: LegacyConfig,
    schemaAnalysis: any,
    options: any,
    changes: ConfigChange[],
    warnings: string[]
  ): Promise<ModernConfig> {
    const modernConfig: ModernConfig = {
      version: '2.1.0',
      
      // Migrate connection settings (mostly unchanged)
      supabaseUrl: legacyConfig.supabaseUrl,
      supabaseServiceKey: legacyConfig.supabaseServiceKey,
      environment: legacyConfig.environment,
      
      // Migrate and enhance seeding settings
      seeding: {
        userCount: legacyConfig.userCount,
        setupsPerUser: legacyConfig.setupsPerUser,
        imagesPerSetup: legacyConfig.imagesPerSetup,
        enableRealImages: legacyConfig.enableRealImages,
        seed: legacyConfig.seed,
        emailDomain: legacyConfig.emailDomain,
        domain: legacyConfig.domain || 'general',
        testUserPassword: legacyConfig.testUserPassword || 'password123',
        
        // New schema-driven settings
        enableSchemaIntrospection: options.enableModernFeatures,
        enableConstraintValidation: options.enableModernFeatures,
        enableAutoFixes: options.enableModernFeatures,
        enableProgressiveEnhancement: options.enableModernFeatures,
        enableGracefulDegradation: true
      },
      
      // Build new schema configuration
      schema: {
        autoDetectFramework: !options.frameworkHint,
        frameworkOverride: options.frameworkHint || legacyConfig.schema?.framework,
        primaryUserTable: legacyConfig.schema?.primaryUserTable,
        
        columnMapping: {
          enableDynamicMapping: options.enableModernFeatures,
          enableFuzzyMatching: options.enableModernFeatures,
          enablePatternMatching: options.enableModernFeatures,
          minimumConfidence: 0.3,
          customMappings: this.migrateLegacyMappings(legacyConfig, options.customMappings)
        },
        
        constraints: {
          enableValidation: options.enableModernFeatures,
          enableAutoFixes: options.enableModernFeatures,
          skipOptionalConstraints: false,
          createDependenciesOnDemand: options.enableModernFeatures
        },
        
        relationships: {
          enableDiscovery: options.enableModernFeatures,
          respectForeignKeys: true,
          handleCircularDependencies: options.enableModernFeatures,
          enableParallelSeeding: options.enableModernFeatures
        }
      },
      
      // Build execution configuration
      execution: {
        enableRollback: options.enableModernFeatures,
        maxRetries: 3,
        timeoutMs: 30000,
        continueOnError: false,
        enableCaching: true,
        cacheTimeout: 30
      },
      
      // Set compatibility options
      compatibility: {
        enableLegacyMode: options.preserveLegacyBehavior,
        legacyFallbacks: options.preserveLegacyBehavior ? 
          ['simple_profiles', 'accounts_only', 'auth_only'] : [],
        maintainOldBehavior: options.preserveLegacyBehavior
      },
      
      // Migration metadata
      migration: {
        migratedFrom: legacyConfig.schema?.framework || 'unknown',
        migrationDate: new Date().toISOString(),
        originalConfigHash: this.generateConfigHash(legacyConfig),
        migrationWarnings: warnings.slice() // Copy current warnings
      }
    };

    // Track changes
    this.trackConfigurationChanges(legacyConfig, modernConfig, changes);

    // Apply schema analysis results if available
    if (schemaAnalysis) {
      this.applySchemaAnalysisToConfig(modernConfig, schemaAnalysis, changes);
    }

    return modernConfig;
  }

  /**
   * Migrate legacy column mappings to new format
   */
  private migrateLegacyMappings(
    legacyConfig: LegacyConfig,
    customMappings?: Record<string, Record<string, string>>
  ): Record<string, Record<string, string>> {
    const mappings: Record<string, Record<string, string>> = {};

    // Start with custom mappings if provided
    if (customMappings) {
      Object.assign(mappings, customMappings);
    }

    // Migrate user table mappings
    if (legacyConfig.schema?.userTable) {
      const userTable = legacyConfig.schema.userTable;
      const tableName = userTable.name;
      
      if (!mappings[tableName]) {
        mappings[tableName] = {};
      }

      if (userTable.emailField) mappings[tableName].email = userTable.emailField;
      if (userTable.nameField) mappings[tableName].name = userTable.nameField;
      if (userTable.pictureField) mappings[tableName].avatar = userTable.pictureField;
      if (userTable.bioField) mappings[tableName].bio = userTable.bioField;
      if (userTable.usernameField) mappings[tableName].username = userTable.usernameField;
    }

    // Migrate setup table mappings
    if (legacyConfig.schema?.setupTable) {
      const setupTable = legacyConfig.schema.setupTable;
      const tableName = setupTable.name;
      
      if (!mappings[tableName]) {
        mappings[tableName] = {};
      }

      if (setupTable.userField) mappings[tableName].author = setupTable.userField;
      if (setupTable.titleField) mappings[tableName].title = setupTable.titleField;
      if (setupTable.descriptionField) mappings[tableName].content = setupTable.descriptionField;
      if (setupTable.categoryField) mappings[tableName].category = setupTable.categoryField;
      if (setupTable.publicField) mappings[tableName].published = setupTable.publicField;
    }

    // Migrate base template mappings
    if (legacyConfig.schema?.baseTemplateTable) {
      const templateTable = legacyConfig.schema.baseTemplateTable;
      const tableName = templateTable.name;
      
      if (!mappings[tableName]) {
        mappings[tableName] = {};
      }

      if (templateTable.typeField) mappings[tableName].type = templateTable.typeField;
      if (templateTable.makeField) mappings[tableName].make = templateTable.makeField;
      if (templateTable.modelField) mappings[tableName].model = templateTable.modelField;
      if (templateTable.yearField) mappings[tableName].year = templateTable.yearField;
      if (templateTable.descriptionField) mappings[tableName].description = templateTable.descriptionField;
    }

    return mappings;
  }

  /**
   * Track configuration changes for reporting
   */
  private trackConfigurationChanges(
    legacyConfig: LegacyConfig,
    modernConfig: ModernConfig,
    changes: ConfigChange[]
  ): void {
    // Track version addition
    changes.push({
      type: 'added',
      path: 'version',
      newValue: '2.1.0',
      reason: 'Added version tracking for future migrations'
    });

    // Track structure changes
    changes.push({
      type: 'restructured',
      path: 'seeding',
      oldValue: 'top-level properties',
      newValue: 'nested seeding object',
      reason: 'Organized seeding configuration into dedicated section'
    });

    changes.push({
      type: 'added',
      path: 'schema',
      newValue: modernConfig.schema,
      reason: 'Added comprehensive schema-first configuration'
    });

    changes.push({
      type: 'added',
      path: 'execution',
      newValue: modernConfig.execution,
      reason: 'Added execution behavior configuration'
    });

    // Track specific feature additions
    if (modernConfig.seeding.enableSchemaIntrospection) {
      changes.push({
        type: 'added',
        path: 'seeding.enableSchemaIntrospection',
        newValue: true,
        reason: 'Enabled dynamic schema discovery'
      });
    }

    if (modernConfig.schema.columnMapping.enableDynamicMapping) {
      changes.push({
        type: 'added',
        path: 'schema.columnMapping.enableDynamicMapping',
        newValue: true,
        reason: 'Enabled intelligent column mapping'
      });
    }
  }

  /**
   * Apply schema analysis results to configuration
   */
  private applySchemaAnalysisToConfig(
    modernConfig: ModernConfig,
    schemaAnalysis: any,
    changes: ConfigChange[]
  ): void {
    // Update framework detection based on analysis
    if (schemaAnalysis.framework && !modernConfig.schema.frameworkOverride) {
      modernConfig.schema.frameworkOverride = schemaAnalysis.framework.type;
      changes.push({
        type: 'added',
        path: 'schema.frameworkOverride',
        newValue: schemaAnalysis.framework.type,
        reason: `Framework auto-detected as ${schemaAnalysis.framework.type}`
      });
    }

    // Apply discovered column mappings
    if (schemaAnalysis.mappings) {
      Object.assign(modernConfig.schema.columnMapping.customMappings, schemaAnalysis.mappings);
      changes.push({
        type: 'modified',
        path: 'schema.columnMapping.customMappings',
        newValue: 'discovered mappings applied',
        reason: 'Applied column mappings discovered from schema analysis'
      });
    }

    // Update primary user table if detected
    if (schemaAnalysis.tables && schemaAnalysis.tables.length > 0) {
      const userTable = schemaAnalysis.tables.find((t: any) => t.role === 'user');
      if (userTable && !modernConfig.schema.primaryUserTable) {
        modernConfig.schema.primaryUserTable = userTable.name;
        changes.push({
          type: 'added',
          path: 'schema.primaryUserTable',
          newValue: userTable.name,
          reason: `Primary user table detected as ${userTable.name}`
        });
      }
    }
  }

  /**
   * Validate the migrated modern configuration
   */
  private async validateModernConfig(modernConfig: ModernConfig): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!modernConfig.version) {
      errors.push('Missing version field');
    }

    if (!modernConfig.supabaseUrl || !modernConfig.supabaseServiceKey) {
      errors.push('Missing required connection settings');
    }

    // Validate seeding configuration
    if (modernConfig.seeding.userCount <= 0) {
      errors.push('userCount must be greater than 0');
    }

    // Validate schema configuration
    if (modernConfig.schema.columnMapping.minimumConfidence < 0 || 
        modernConfig.schema.columnMapping.minimumConfidence > 1) {
      warnings.push('minimumConfidence should be between 0 and 1');
    }

    // Validate execution configuration
    if (modernConfig.execution.maxRetries < 0) {
      warnings.push('maxRetries should be non-negative');
    }

    if (modernConfig.execution.timeoutMs < 1000) {
      warnings.push('timeoutMs should be at least 1000ms');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate recommendations based on migration
   */
  private generateRecommendations(
    legacyConfig: LegacyConfig,
    modernConfig: ModernConfig,
    schemaAnalysis: any,
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Schema analysis recommendations
    if (!schemaAnalysis) {
      recommendations.push('Run schema analysis to optimize configuration: npx supa-seed detect');
    } else {
      if (schemaAnalysis.framework.confidence < 0.7) {
        recommendations.push('Low framework detection confidence. Consider manually specifying framework in config.');
      }
    }

    // Feature recommendations
    if (!modernConfig.seeding.enableSchemaIntrospection) {
      recommendations.push('Enable schema introspection for better compatibility with schema changes.');
    }

    if (!modernConfig.schema.constraints.enableValidation) {
      recommendations.push('Enable constraint validation to prevent seeding errors.');
    }

    if (!modernConfig.execution.enableRollback) {
      recommendations.push('Enable rollback for safer seeding operations.');
    }

    // Configuration recommendations
    if (Object.keys(modernConfig.schema.columnMapping.customMappings).length === 0) {
      recommendations.push('Add custom column mappings for better seeding accuracy.');
    }

    // Compatibility recommendations
    if (modernConfig.compatibility.enableLegacyMode) {
      recommendations.push('Consider disabling legacy mode once migration is tested and working correctly.');
    }

    // Warning-based recommendations
    if (warnings.length > 0) {
      recommendations.push(`Address ${warnings.length} migration warnings for optimal performance.`);
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private async readLegacyConfig(path: string): Promise<LegacyConfig> {
    const content = await fs.promises.readFile(path, 'utf8');
    return JSON.parse(content);
  }

  private async readConfigFile(path: string): Promise<any> {
    const content = await fs.promises.readFile(path, 'utf8');
    return JSON.parse(content);
  }

  private isModernConfig(config: any): boolean {
    return config.version === '2.1.0' && 
           config.schema?.columnMapping && 
           config.execution;
  }

  private generateConfigHash(config: any): string {
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return btoa(configString).slice(0, 16);
  }

  private async saveModernConfig(config: ModernConfig, outputPath: string): Promise<void> {
    const content = JSON.stringify(config, null, 2);
    await fs.promises.writeFile(outputPath, content, 'utf8');
  }

  private async createFallbackConfig(legacyConfig: LegacyConfig): Promise<ModernConfig> {
    return {
      version: '2.1.0',
      supabaseUrl: legacyConfig.supabaseUrl,
      supabaseServiceKey: legacyConfig.supabaseServiceKey,
      environment: legacyConfig.environment,
      seeding: {
        userCount: legacyConfig.userCount,
        setupsPerUser: legacyConfig.setupsPerUser,
        imagesPerSetup: legacyConfig.imagesPerSetup,
        enableRealImages: legacyConfig.enableRealImages,
        seed: legacyConfig.seed,
        emailDomain: legacyConfig.emailDomain,
        domain: legacyConfig.domain || 'general',
        testUserPassword: legacyConfig.testUserPassword || 'password123',
        enableSchemaIntrospection: false,
        enableConstraintValidation: false,
        enableAutoFixes: false,
        enableProgressiveEnhancement: false,
        enableGracefulDegradation: true
      },
      schema: {
        autoDetectFramework: false,
        columnMapping: {
          enableDynamicMapping: false,
          enableFuzzyMatching: false,
          enablePatternMatching: false,
          minimumConfidence: 0.3,
          customMappings: {}
        },
        constraints: {
          enableValidation: false,
          enableAutoFixes: false,
          skipOptionalConstraints: true,
          createDependenciesOnDemand: false
        },
        relationships: {
          enableDiscovery: false,
          respectForeignKeys: false,
          handleCircularDependencies: false,
          enableParallelSeeding: false
        }
      },
      execution: {
        enableRollback: false,
        maxRetries: 1,
        timeoutMs: 30000,
        continueOnError: true,
        enableCaching: false,
        cacheTimeout: 0
      },
      compatibility: {
        enableLegacyMode: true,
        legacyFallbacks: ['simple_profiles', 'accounts_only', 'auth_only'],
        maintainOldBehavior: true
      },
      migration: {
        migratedFrom: 'fallback',
        migrationDate: new Date().toISOString(),
        originalConfigHash: 'fallback',
        migrationWarnings: ['Migration failed, using fallback configuration']
      }
    };
  }

  private logMigrationResult(result: MigrationResult): void {
    if (result.success) {
      Logger.success('✅ Configuration migration completed successfully');
      Logger.info(`   Changes: ${result.changes.length}`);
      Logger.info(`   Warnings: ${result.warnings.length}`);
      Logger.info(`   Recommendations: ${result.recommendedActions.length}`);
    } else {
      Logger.error('❌ Configuration migration failed');
      Logger.error(`   Errors: ${result.errors.length}`);
      Logger.error(`   Warnings: ${result.warnings.length}`);
    }

    if (result.warnings.length > 0) {
      Logger.warn('Migration warnings:');
      result.warnings.forEach(warning => Logger.warn(`  • ${warning}`));
    }

    if (result.recommendedActions.length > 0) {
      Logger.info('Recommended actions:');
      result.recommendedActions.forEach(action => Logger.info(`  • ${action}`));
    }
  }
}