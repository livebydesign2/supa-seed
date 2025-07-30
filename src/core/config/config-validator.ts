/**
 * Configuration Validation and Migration System for SupaSeed v2.5.0
 * Implements Task 5.3.2: Validation and migration utilities for configuration upgrades
 * Enhanced from Epic 7 system with advanced layered configuration support
 */

import type { createClient } from '@supabase/supabase-js';
import { ExtendedSeedConfig, FlexibleSeedConfig } from '../types/config-types';
import { SchemaAdapter } from '../schema-adapter';
import { FrameworkAdapter } from '../../features/integration/framework-adapter';
import { Logger } from '../utils/logger';
import type {
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig
} from './config-layers';
// Advanced customization types not available in v2.4.1
type DeepOverrideConfig = any;
type ConstraintViolation = any;

type SupabaseClient = ReturnType<typeof createClient>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  score: number; // 0-1 validation score
}

export interface ConfigurationRecommendation {
  type: 'framework' | 'constraint' | 'relationship' | 'data_volume' | 'general';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  suggestedFix?: string;
  autoFixable: boolean;
}

/**
 * Advanced validation options for Task 5.3.2
 */
export interface AdvancedValidationOptions {
  strictMode?: boolean;
  checkCompatibility?: boolean;
  validatePerformance?: boolean;
  includeWarnings?: boolean;
  autoFix?: boolean;
  migrationSupport?: boolean;
  layeredConfigMode?: boolean;
}

/**
 * Layered configuration validation result
 */
export interface LayeredConfigValidationResult {
  valid: boolean;
  score: number; // 0-100 validation score
  validationTime: number; // milliseconds
  layers: {
    universal: LayerValidationResult;
    detection: LayerValidationResult;
    extensions: LayerValidationResult;
  };
  errors: LayeredValidationError[];
  warnings: LayeredValidationWarning[];
  suggestions: LayeredValidationSuggestion[];
  autoFixSuggestions: LayeredAutoFixSuggestion[];
  migrationInfo?: LayeredMigrationInfo;
  performanceImpact?: LayeredPerformanceValidation;
}

/**
 * Individual layer validation result
 */
export interface LayerValidationResult {
  valid: boolean;
  score: number;
  errors: LayeredValidationError[];
  warnings: LayeredValidationWarning[];
  coverage: {
    totalFields: number;
    validatedFields: number;
    percentage: number;
  };
  constraints: {
    checked: number;
    passed: number;
    failed: number;
  };
}

/**
 * Layered configuration validation error
 */
export interface LayeredValidationError {
  code: string;
  path: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'structure' | 'type' | 'constraint' | 'compatibility' | 'performance';
  layer: 'universal' | 'detection' | 'extensions' | 'cross-layer';
  autoFixable: boolean;
  migrationRequired?: boolean;
  relatedErrors?: string[];
}

/**
 * Layered configuration validation warning
 */
export interface LayeredValidationWarning {
  code: string;
  path: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  category: 'performance' | 'compatibility' | 'best-practice' | 'security';
  layer: 'universal' | 'detection' | 'extensions' | 'cross-layer';
  recommendation: string;
  autoFixable: boolean;
}

/**
 * Layered configuration validation suggestion
 */
export interface LayeredValidationSuggestion {
  type: 'optimization' | 'enhancement' | 'alternative' | 'migration';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation: string[];
  estimatedBenefit: string;
  affectedLayers: ('universal' | 'detection' | 'extensions')[];
}

/**
 * Layered auto-fix suggestion
 */
export interface LayeredAutoFixSuggestion {
  errorCode: string;
  path: string;
  description: string;
  action: 'add' | 'modify' | 'remove' | 'restructure';
  currentValue?: any;
  suggestedValue: any;
  riskLevel: 'safe' | 'moderate' | 'risky';
  backupRequired: boolean;
  affectedLayers: ('universal' | 'detection' | 'extensions')[];
}

/**
 * Layered migration information
 */
export interface LayeredMigrationInfo {
  required: boolean;
  fromVersion: string;
  toVersion: string;
  migrationSteps: LayeredMigrationStep[];
  estimatedDuration: number; // minutes
  riskAssessment: 'low' | 'medium' | 'high';
  backupRecommended: boolean;
  rollbackSupported: boolean;
  layerMigrations: {
    universal: LayeredMigrationStep[];
    detection: LayeredMigrationStep[];
    extensions: LayeredMigrationStep[];
  };
}

/**
 * Individual layered migration step
 */
export interface LayeredMigrationStep {
  id: string;
  order: number;
  description: string;
  type: 'schema' | 'config' | 'data' | 'validation';
  layer: 'universal' | 'detection' | 'extensions' | 'cross-layer';
  action: string;
  reversible: boolean;
  estimatedTime: number; // seconds
  riskLevel: 'low' | 'medium' | 'high';
  dependencies: string[];
}

/**
 * Layered performance validation
 */
export interface LayeredPerformanceValidation {
  score: number; // 0-100
  estimatedSlowdown: number; // percentage
  memoryImpact: number; // MB
  complexityAnalysis: {
    universalComplexity: number;
    detectionComplexity: number;
    extensionComplexity: number;
    crossLayerComplexity: number;
  };
  recommendations: string[];
  optimizations: string[];
  layerImpact: {
    universal: number;
    detection: number;
    extensions: number;
  };
}

export class ConfigValidator {
  private client: SupabaseClient;
  private schemaAdapter: SchemaAdapter;
  private frameworkAdapter: FrameworkAdapter;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.schemaAdapter = new SchemaAdapter(client);
    this.frameworkAdapter = new FrameworkAdapter(client);
  }

  /**
   * Comprehensive configuration validation
   */
  async validateConfiguration(config: ExtendedSeedConfig): Promise<ValidationResult> {
    Logger.info('🔍 Starting comprehensive configuration validation...');

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // 1. Basic configuration validation
      const basicValidation = this.validateBasicConfiguration(config);
      errors.push(...basicValidation.errors);
      warnings.push(...basicValidation.warnings);

      // 2. Framework strategy validation
      const frameworkValidation = await this.validateFrameworkStrategy(config);
      errors.push(...frameworkValidation.errors);
      warnings.push(...frameworkValidation.warnings);

      // 3. Constraint handler validation
      const constraintValidation = await this.validateConstraintHandlers(config);
      errors.push(...constraintValidation.errors);
      warnings.push(...constraintValidation.warnings);

      // 4. Schema evolution validation
      const schemaValidation = this.validateSchemaEvolution(config);
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);

      // 5. Data volume validation
      const volumeValidation = this.validateDataVolumes(config);
      errors.push(...volumeValidation.errors);
      warnings.push(...volumeValidation.warnings);

      // 6. Custom relationships validation
      const relationshipValidation = await this.validateCustomRelationships(config);
      errors.push(...relationshipValidation.errors);
      warnings.push(...relationshipValidation.warnings);

      // Calculate validation score
      const totalChecks = 50; // Approximate number of validation checks
      const failedChecks = errors.length + (warnings.length * 0.5);
      const score = Math.max(0, (totalChecks - failedChecks) / totalChecks);

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(config, errors, warnings));

      Logger.info(`✅ Configuration validation completed with score: ${(score * 100).toFixed(1)}%`);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        score
      };

    } catch (error: any) {
      Logger.error('Configuration validation failed:', error);
      return {
        valid: false,
        errors: [`Validation process failed: ${error.message}`],
        warnings: [],
        recommendations: ['Fix validation errors and retry'],
        score: 0
      };
    }
  }

  /**
   * Validate basic configuration structure and required fields
   */
  private validateBasicConfiguration(config: ExtendedSeedConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!config.supabaseUrl) {
      errors.push('supabaseUrl is required');
    } else if (!config.supabaseUrl.startsWith('http')) {
      warnings.push('supabaseUrl should be a valid HTTP/HTTPS URL');
    }

    if (!config.supabaseServiceKey) {
      errors.push('supabaseServiceKey is required');
    } else if (config.supabaseServiceKey.length < 50) {
      warnings.push('supabaseServiceKey appears to be too short - ensure it\'s the service role key');
    }

    if (!config.environment || !['local', 'staging', 'production'].includes(config.environment)) {
      errors.push('environment must be one of: local, staging, production');
    }

    // Numeric validation
    if (!config.userCount || config.userCount <= 0) {
      errors.push('userCount must be greater than 0');
    } else if (config.userCount > 1000 && config.environment === 'local') {
      warnings.push('userCount is very high for local environment - consider reducing for faster seeding');
    }

    if (!config.setupsPerUser || config.setupsPerUser <= 0) {
      errors.push('setupsPerUser must be greater than 0');
    }

    if (!config.imagesPerSetup || config.imagesPerSetup < 0) {
      errors.push('imagesPerSetup must be 0 or greater');
    }

    // Schema configuration validation
    if (!config.schema) {
      errors.push('schema configuration is required');
    } else {
      if (!config.schema.userTable) {
        errors.push('schema.userTable configuration is required');
      } else {
        if (!config.schema.userTable.name) errors.push('schema.userTable.name is required');
        if (!config.schema.userTable.idField) errors.push('schema.userTable.idField is required');
        if (!config.schema.userTable.emailField) errors.push('schema.userTable.emailField is required');
        if (!config.schema.userTable.nameField) errors.push('schema.userTable.nameField is required');
      }

      if (!config.schema.setupTable) {
        errors.push('schema.setupTable configuration is required');
      } else {
        if (!config.schema.setupTable.name) errors.push('schema.setupTable.name is required');
        if (!config.schema.setupTable.userField) errors.push('schema.setupTable.userField is required');
        if (!config.schema.setupTable.titleField) errors.push('schema.setupTable.titleField is required');
        if (!config.schema.setupTable.descriptionField) errors.push('schema.setupTable.descriptionField is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Validate framework strategy configuration
   */
  private async validateFrameworkStrategy(config: ExtendedSeedConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.frameworkStrategy?.enabled) {
      return { valid: true, errors, warnings, recommendations: [], score: 1 };
    }

    try {
      // Initialize framework adapter for validation
      await this.frameworkAdapter.initialize();
      const availableStrategies = this.frameworkAdapter.getAvailableStrategies();

      // Validate manual override
      if (config.frameworkStrategy.manualOverride) {
        if (!availableStrategies.includes(config.frameworkStrategy.manualOverride)) {
          errors.push(`Invalid framework override: ${config.frameworkStrategy.manualOverride}. Available: ${availableStrategies.join(', ')}`);
        }
      }

      // Validate custom strategies
      if (config.frameworkStrategy.customStrategies) {
        for (const strategy of config.frameworkStrategy.customStrategies) {
          if (!strategy.name) {
            errors.push('Custom strategy name is required');
          }
          if (typeof strategy.priority !== 'number' || strategy.priority < 0) {
            errors.push(`Invalid priority for custom strategy '${strategy.name}' - must be a non-negative number`);
          }
          if (strategy.moduleUrl && !strategy.moduleUrl.match(/^https?:\/\//)) {
            warnings.push(`Custom strategy '${strategy.name}' moduleUrl should be a valid HTTP/HTTPS URL`);
          }
        }
      }

      // Validate fallback behavior
      if (!['error', 'generic', 'skip'].includes(config.frameworkStrategy.fallbackBehavior)) {
        errors.push('frameworkStrategy.fallbackBehavior must be one of: error, generic, skip');
      }

    } catch (error: any) {
      warnings.push(`Framework strategy validation skipped: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Validate constraint handlers configuration
   */
  private async validateConstraintHandlers(config: ExtendedSeedConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.constraintHandlers?.enabled) {
      return { valid: true, errors, warnings, recommendations: [], score: 1 };
    }

    // Validate custom handlers
    if (config.constraintHandlers.customHandlers) {
      for (const handler of config.constraintHandlers.customHandlers) {
        if (!handler.id) {
          errors.push('Custom constraint handler ID is required');
        }
        if (!handler.type || !['check', 'foreign_key', 'unique', 'not_null'].includes(handler.type)) {
          errors.push(`Invalid constraint handler type '${handler.type}' for handler '${handler.id}' - must be one of: check, foreign_key, unique, not_null`);
        }
        if (typeof handler.priority !== 'number' || handler.priority < 0) {
          errors.push(`Invalid priority for constraint handler '${handler.id}' - must be a non-negative number`);
        }
        if (!handler.handlerFunction) {
          errors.push(`Handler function is required for constraint handler '${handler.id}'`);
        }

        // Validate table references if specified
        if (handler.tables) {
          for (const tableName of handler.tables) {
            try {
              const exists = await this.tableExists(tableName);
              if (!exists) {
                warnings.push(`Table '${tableName}' referenced in constraint handler '${handler.id}' may not exist`);
              }
            } catch (error: any) {
              warnings.push(`Could not verify table '${tableName}' for constraint handler '${handler.id}': ${error.message}`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Validate schema evolution configuration
   */
  private validateSchemaEvolution(config: ExtendedSeedConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.schemaEvolution?.enabled) {
      return { valid: true, errors, warnings, recommendations: [], score: 1 };
    }

    // Validate tracking mode
    if (!['hash', 'timestamp', 'version'].includes(config.schemaEvolution.trackingMode)) {
      errors.push('schemaEvolution.trackingMode must be one of: hash, timestamp, version');
    }

    // Validate cache location
    if (!config.schemaEvolution.cacheLocation) {
      warnings.push('schemaEvolution.cacheLocation not specified - will use default');
    }

    // Validate on schema change behavior
    if (!['warn', 'error', 'auto-adapt', 'prompt'].includes(config.schemaEvolution.onSchemaChange)) {
      errors.push('schemaEvolution.onSchemaChange must be one of: warn, error, auto-adapt, prompt');
    }

    // Validate migration strategies for version tracking
    if (config.schemaEvolution.trackingMode === 'version') {
      if (!config.schemaEvolution.migrationStrategies?.length) {
        warnings.push('Version tracking enabled but no migration strategies defined');
      } else {
        for (const migration of config.schemaEvolution.migrationStrategies) {
          if (!migration.fromVersion || !migration.toVersion) {
            errors.push('Migration strategy must have fromVersion and toVersion');
          }
          if (!migration.migrationSteps?.length) {
            warnings.push(`Migration from ${migration.fromVersion} to ${migration.toVersion} has no steps defined`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Validate data volume configuration
   */
  private validateDataVolumes(config: ExtendedSeedConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.dataVolumes?.enabled) {
      return { valid: true, errors, warnings, recommendations: [], score: 1 };
    }

    // Validate user distribution pattern
    if (!['linear', 'realistic', 'exponential', 'custom'].includes(config.dataVolumes.patterns.userDistribution)) {
      errors.push('dataVolumes.patterns.userDistribution must be one of: linear, realistic, exponential, custom');
    }

    // Validate content ratios
    const ratios = config.dataVolumes.patterns.contentRatios;
    const totalRatio = ratios.publicContent + ratios.privateContent + ratios.draftContent;
    if (Math.abs(totalRatio - 1.0) > 0.01) {
      errors.push(`Content ratios must sum to 1.0, got ${totalRatio.toFixed(3)}`);
    }

    // Validate individual ratios
    if (ratios.publicContent < 0 || ratios.publicContent > 1) {
      errors.push('publicContent ratio must be between 0 and 1');
    }
    if (ratios.privateContent < 0 || ratios.privateContent > 1) {
      errors.push('privateContent ratio must be between 0 and 1');
    }
    if (ratios.draftContent < 0 || ratios.draftContent > 1) {
      errors.push('draftContent ratio must be between 0 and 1');
    }

    // Validate relationship density
    const density = config.dataVolumes.patterns.relationshipDensity;
    if (density.userToContent <= 0) {
      errors.push('relationshipDensity.userToContent must be greater than 0');
    }
    if (density.crossReferences < 0) {
      errors.push('relationshipDensity.crossReferences must be 0 or greater');
    }
    if (density.tagConnections < 0) {
      errors.push('relationshipDensity.tagConnections must be 0 or greater');
    }

    // Validate volume profiles
    if (config.dataVolumes.volumeProfiles) {
      for (const profile of config.dataVolumes.volumeProfiles) {
        if (!profile.name) {
          errors.push('Volume profile name is required');
        }
        if (profile.userCount <= 0) {
          errors.push(`Volume profile '${profile.name}' userCount must be greater than 0`);
        }
        if (profile.avgItemsPerUser <= 0) {
          errors.push(`Volume profile '${profile.name}' avgItemsPerUser must be greater than 0`);
        }
        if (!['basic', 'rich', 'production'].includes(profile.dataQualityLevel)) {
          errors.push(`Volume profile '${profile.name}' dataQualityLevel must be one of: basic, rich, production`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Validate custom relationships configuration
   */
  private async validateCustomRelationships(config: ExtendedSeedConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.customRelationships?.enabled) {
      return { valid: true, errors, warnings, recommendations: [], score: 1 };
    }

    // Validate relationships
    if (config.customRelationships.relationships) {
      for (const relationship of config.customRelationships.relationships) {
        if (!relationship.id) {
          errors.push('Custom relationship ID is required');
        }
        if (!relationship.fromTable || !relationship.toTable) {
          errors.push(`Custom relationship '${relationship.id}' must have fromTable and toTable`);
        }
        if (!['one_to_one', 'one_to_many', 'many_to_many'].includes(relationship.relationshipType)) {
          errors.push(`Invalid relationship type '${relationship.relationshipType}' for relationship '${relationship.id}'`);
        }
        if (!['sequential', 'random', 'weighted', 'custom'].includes(relationship.generationStrategy)) {
          errors.push(`Invalid generation strategy '${relationship.generationStrategy}' for relationship '${relationship.id}'`);
        }

        // Check if custom generator is provided for custom strategy
        if (relationship.generationStrategy === 'custom' && !relationship.customGenerator) {
          errors.push(`Custom generation strategy specified but no customGenerator provided for relationship '${relationship.id}'`);
        }

        // Validate table existence
        try {
          const fromExists = await this.tableExists(relationship.fromTable);
          const toExists = await this.tableExists(relationship.toTable);
          
          if (!fromExists) {
            warnings.push(`From table '${relationship.fromTable}' may not exist for relationship '${relationship.id}'`);
          }
          if (!toExists) {
            warnings.push(`To table '${relationship.toTable}' may not exist for relationship '${relationship.id}'`);
          }
        } catch (error: any) {
          warnings.push(`Could not verify tables for relationship '${relationship.id}': ${error.message}`);
        }
      }
    }

    // Validate junction tables
    if (config.customRelationships.junctionTables) {
      for (const junctionTable of config.customRelationships.junctionTables) {
        if (!junctionTable.tableName) {
          errors.push('Junction table name is required');
        }
        if (!junctionTable.leftTable || !junctionTable.rightTable) {
          errors.push(`Junction table '${junctionTable.tableName}' must have leftTable and rightTable`);
        }
        if (!junctionTable.leftColumn || !junctionTable.rightColumn) {
          errors.push(`Junction table '${junctionTable.tableName}' must have leftColumn and rightColumn`);
        }

        // Check table existence
        try {
          const exists = await this.tableExists(junctionTable.tableName);
          if (!exists) {
            warnings.push(`Junction table '${junctionTable.tableName}' may not exist`);
          }
        } catch (error: any) {
          warnings.push(`Could not verify junction table '${junctionTable.tableName}': ${error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [],
      score: 0
    };
  }

  /**
   * Generate configuration recommendations based on validation results
   */
  private generateRecommendations(
    config: ExtendedSeedConfig,
    errors: string[],
    warnings: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Basic recommendations based on environment
    if (config.environment === 'local') {
      recommendations.push('💡 For local development, consider reducing userCount and setupsPerUser for faster seeding');
      if (config.enableRealImages) {
        recommendations.push('💡 Consider disabling real images in local environment to improve seeding speed');
      }
    }

    if (config.environment === 'production') {
      if (config.userCount < 10) {
        recommendations.push('💡 Consider increasing userCount for production environment to generate more realistic data');
      }
      if (!config.enableRealImages) {
        recommendations.push('💡 Consider enabling real images in production environment for better visual testing');
      }
    }

    // Framework strategy recommendations
    if (!config.frameworkStrategy?.enabled) {
      recommendations.push('💡 Enable framework strategy configuration for better framework-aware seeding');
    }

    // Schema evolution recommendations
    if (!config.schemaEvolution?.enabled) {
      recommendations.push('💡 Enable schema evolution detection to handle database schema changes gracefully');
    }

    // Data volume recommendations
    if (!config.dataVolumes?.enabled) {
      recommendations.push('💡 Enable data volume configuration for more realistic data generation patterns');
    }

    // Error and warning based recommendations
    if (errors.length > 0) {
      recommendations.push(`🚨 Fix ${errors.length} configuration errors before proceeding`);
    }

    if (warnings.length > 0) {
      recommendations.push(`⚠️  Review ${warnings.length} configuration warnings for optimal setup`);
    }

    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push('✅ Configuration validation passed - ready for seeding');
    }

    return recommendations;
  }

  /**
   * Check if a table exists in the database
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.client.from(tableName).select('*').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Validate configuration against actual database schema
   */
  async validateAgainstSchema(config: ExtendedSeedConfig): Promise<ValidationResult> {
    Logger.info('🔍 Validating configuration against database schema...');

    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    try {
      // Detect current schema
      const schemaInfo = await this.schemaAdapter.detectSchema();

      // Validate user table mapping
      if (config.schema?.userTable) {
        const userTableExists = await this.tableExists(config.schema.userTable.name);
        if (!userTableExists) {
          errors.push(`User table '${config.schema.userTable.name}' does not exist in database`);
        } else {
          // Validate column mappings
          const validation = await this.schemaAdapter.validateTableSchema(
            config.schema.userTable.name,
            {
              id: [config.schema.userTable.idField],
              email: [config.schema.userTable.emailField],
              name: [config.schema.userTable.nameField],
              ...(config.schema.userTable.bioField && { bio: [config.schema.userTable.bioField] }),
              ...(config.schema.userTable.pictureField && { picture: [config.schema.userTable.pictureField] })
            }
          );

          if (!validation.valid) {
            warnings.push(...validation.missingFields.map(field => 
              `User table column mapping issue: '${field}' may not exist`
            ));
            recommendations.push(...validation.suggestions);
          }
        }
      }

      // Validate setup table mapping
      if (config.schema?.setupTable) {
        const setupTableExists = await this.tableExists(config.schema.setupTable.name);
        if (!setupTableExists) {
          errors.push(`Setup table '${config.schema.setupTable.name}' does not exist in database`);
        }
      }

      // Framework compatibility check
      if (config.schema?.framework) {
        const detectedFramework = schemaInfo.frameworkType;
        if (config.schema.framework === 'makerkit' && detectedFramework !== 'makerkit') {
          warnings.push(`Configuration specifies MakerKit framework but detected '${detectedFramework}' - consider updating configuration`);
        }
      }

      recommendations.push(`Database schema validation completed for ${Object.keys(schemaInfo).length} detected features`);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        score: errors.length === 0 ? 1 : 0.5
      };

    } catch (error: any) {
      Logger.error('Schema validation failed:', error);
      return {
        valid: false,
        errors: [`Schema validation failed: ${error.message}`],
        warnings: [],
        recommendations: ['Ensure database is accessible and contains expected tables'],
        score: 0
      };
    }
  }

  /**
   * Get configuration recommendations for a specific framework
   */
  async getFrameworkRecommendations(frameworkType: string): Promise<ConfigurationRecommendation[]> {
    const recommendations: ConfigurationRecommendation[] = [];

    switch (frameworkType) {
      case 'makerkit':
        recommendations.push({
          type: 'framework',
          priority: 'high',
          message: 'Enable MakerKit-specific constraint handling for accounts and profiles',
          suggestedFix: 'Set frameworkStrategy.enabled = true and constraintHandlers.enabled = true',
          autoFixable: true
        });
        recommendations.push({
          type: 'constraint',
          priority: 'medium',
          message: 'Configure personal account constraint handler',
          suggestedFix: 'Add custom constraint handler for accounts_slug_null_if_personal_account_true',
          autoFixable: false
        });
        break;

      case 'generic':
        recommendations.push({
          type: 'framework',
          priority: 'medium',
          message: 'Consider enabling schema evolution detection for custom schemas',
          suggestedFix: 'Set schemaEvolution.enabled = true',
          autoFixable: true
        });
        break;

      default:
        recommendations.push({
          type: 'general',
          priority: 'low',
          message: 'Framework type not recognized - using generic configuration',
          autoFixable: false
        });
    }

    return recommendations;
  }

  /**
   * Validate layered configuration with comprehensive analysis
   * Task 5.3.2: Advanced validation for layered configuration system
   */
  async validateLayeredConfiguration(
    config: LayeredConfiguration,
    options: AdvancedValidationOptions = {}
  ): Promise<LayeredConfigValidationResult> {
    Logger.info('🔍 Starting advanced layered configuration validation...');
    const startTime = Date.now();

    try {
      // Initialize validation result
      const result: LayeredConfigValidationResult = {
        valid: true,
        score: 100,
        validationTime: 0,
        layers: {
          universal: await this.validateConfigurationLayer(config.universal, 'universal', options),
          detection: await this.validateConfigurationLayer(config.detection, 'detection', options),
          extensions: await this.validateConfigurationLayer(config.extensions, 'extensions', options)
        },
        errors: [],
        warnings: [],
        suggestions: [],
        autoFixSuggestions: []
      };

      // Aggregate layer results
      const allErrors = [
        ...result.layers.universal.errors,
        ...result.layers.detection.errors,
        ...result.layers.extensions.errors
      ];

      const allWarnings = [
        ...result.layers.universal.warnings,
        ...result.layers.detection.warnings,
        ...result.layers.extensions.warnings
      ];

      // Cross-layer validation
      const crossLayerValidation = await this.validateCrossLayerConstraints(config, options);
      allErrors.push(...crossLayerValidation.errors);
      allWarnings.push(...crossLayerValidation.warnings);

      // Compatibility validation
      if (options.checkCompatibility) {
        const compatibilityValidation = await this.validateLayeredCompatibility(config);
        allErrors.push(...compatibilityValidation.errors);
        allWarnings.push(...compatibilityValidation.warnings);
      }

      // Performance validation
      if (options.validatePerformance) {
        result.performanceImpact = await this.validateLayeredPerformance(config);
        if (result.performanceImpact.score < 70) {
          allWarnings.push({
            code: 'PERF_LOW_SCORE',
            path: 'config',
            message: `Performance score is low: ${result.performanceImpact.score}/100`,
            impact: 'high',
            category: 'performance',
            layer: 'cross-layer',
            recommendation: 'Consider optimizing configuration complexity',
            autoFixable: false
          });
        }
      }

      // Migration analysis
      if (options.migrationSupport) {
        result.migrationInfo = await this.analyzeLayeredMigrationRequirements(config);
      }

      // Generate suggestions
      result.suggestions = await this.generateLayeredSuggestions(config, allErrors, allWarnings);

      // Generate auto-fix suggestions
      if (options.autoFix) {
        result.autoFixSuggestions = await this.generateLayeredAutoFixSuggestions(allErrors);
      }

      // Calculate overall score and validity
      result.errors = allErrors;
      result.warnings = options.includeWarnings ? allWarnings : [];
      result.valid = allErrors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0;
      result.score = this.calculateLayeredOverallScore(result.layers, allErrors, allWarnings);
      result.validationTime = Date.now() - startTime;

      Logger.complete(`Layered configuration validation completed in ${result.validationTime}ms - Score: ${result.score}/100`);
      return result;

    } catch (error: any) {
      Logger.error(`Layered configuration validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate individual configuration layer
   */
  private async validateConfigurationLayer(
    layer: any,
    layerName: 'universal' | 'detection' | 'extensions',
    options: AdvancedValidationOptions
  ): Promise<LayerValidationResult> {
    const errors: LayeredValidationError[] = [];
    const warnings: LayeredValidationWarning[] = [];

    // Layer-specific validation
    switch (layerName) {
      case 'universal':
        await this.validateUniversalLayer(layer, errors, warnings, options);
        break;
      case 'detection':
        await this.validateDetectionLayer(layer, errors, warnings, options);
        break;
      case 'extensions':
        await this.validateExtensionsLayer(layer, errors, warnings, options);
        break;
    }

    // Calculate coverage and constraints
    const coverage = this.calculateLayerCoverage(layer, layerName);
    const constraintStats = this.calculateLayerConstraintStats(errors, warnings);

    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      score: this.calculateLayerScore(errors, warnings, coverage),
      errors,
      warnings,
      coverage,
      constraints: constraintStats
    };
  }

  /**
   * Validate universal layer
   */
  private async validateUniversalLayer(
    layer: UniversalCoreConfig,
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[],
    options: AdvancedValidationOptions
  ): Promise<void> {
    // MakerKit compliance validation
    if (!layer.makerkit?.enabled) {
      errors.push({
        code: 'MAKERKIT_DISABLED',
        path: 'layers.universal.makerkit.enabled',
        message: 'MakerKit compliance is disabled in universal layer',
        severity: 'high',
        category: 'constraint',
        layer: 'universal',
        autoFixable: true
      });
    }

    // RLS compliance validation
    if (layer.security?.rlsCompliance === false) {
      errors.push({
        code: 'RLS_DISABLED',
        path: 'layers.universal.security.rlsCompliance',
        message: 'RLS compliance is disabled - security risk',
        severity: 'critical',
        category: 'constraint',
        layer: 'universal',
        autoFixable: true
      });
    }

    // Webhook configuration validation
    if (layer.webhook?.enabled && !Object.keys(layer.webhook.endpoints || {}).length) {
      warnings.push({
        code: 'WEBHOOK_NO_ENDPOINTS',
        path: 'layers.universal.webhook.endpoints',
        message: 'Webhook enabled but no endpoints configured',
        impact: 'medium',
        category: 'compatibility',
        layer: 'universal',
        recommendation: 'Add webhook endpoints or disable webhook support',
        autoFixable: false
      });
    }
  }

  /**
   * Validate detection layer
   */
  private async validateDetectionLayer(
    layer: SmartDetectionConfig,
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[],
    options: AdvancedValidationOptions
  ): Promise<void> {
    // Platform detection validation
    if (layer.platform) {
      if (!['individual', 'team', 'hybrid', 'auto'].includes(layer.platform.architecture)) {
        errors.push({
          code: 'INVALID_ARCHITECTURE',
          path: 'layers.detection.platform.architecture',
          message: `Invalid platform architecture: ${layer.platform.architecture}`,
          severity: 'medium',
          category: 'type',
          layer: 'detection',
          autoFixable: false
        });
      }

      if (layer.platform.domain && !['outdoor', 'saas', 'ecommerce', 'social', 'generic', 'auto'].includes(layer.platform.domain)) {
        errors.push({
          code: 'INVALID_DOMAIN',
          path: 'layers.detection.platform.domain',
          message: `Invalid platform domain: ${layer.platform.domain}`,
          severity: 'medium',
          category: 'type',
          layer: 'detection',
          autoFixable: false
        });
      }

      // Confidence validation
      if (layer.platform.confidence !== undefined && (layer.platform.confidence < 0 || layer.platform.confidence > 1)) {
        errors.push({
          code: 'INVALID_CONFIDENCE',
          path: 'layers.detection.platform.confidence',
          message: 'Platform detection confidence must be between 0 and 1',
          severity: 'medium',
          category: 'type',
          layer: 'detection',
          autoFixable: true
        });
      }
    }

    // Auto-configuration validation
    if (layer.autoConfiguration?.enabled && !layer.autoConfiguration.strategy) {
      warnings.push({
        code: 'AUTOCONFIG_NO_STRATEGY',
        path: 'layers.detection.autoConfiguration.strategy',
        message: 'Auto-configuration enabled but no strategy specified',
        impact: 'medium',
        category: 'compatibility',
        layer: 'detection',
        recommendation: 'Specify auto-configuration strategy',
        autoFixable: true
      });
    }
  }

  /**
   * Validate extensions layer
   */
  private async validateExtensionsLayer(
    layer: ExtensionsLayerConfig,
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[],
    options: AdvancedValidationOptions
  ): Promise<void> {
    // Domain extension validation
    const domainExtensions = ['outdoor', 'saas', 'ecommerce', 'social'];
    const enabledExtensions = domainExtensions.filter(ext => layer[ext]?.enabled);

    if (enabledExtensions.length > 3) {
      warnings.push({
        code: 'TOO_MANY_EXTENSIONS',
        path: 'layers.extensions',
        message: `${enabledExtensions.length} extensions enabled - may impact performance`,
        impact: 'medium',
        category: 'performance',
        layer: 'extensions',
        recommendation: 'Consider reducing number of enabled extensions',
        autoFixable: false
      });
    }

    // Extension-specific validation
    for (const extension of enabledExtensions) {
      const config = layer[extension];
      if (config && config.customization && !config.customization.validate) {
        warnings.push({
          code: 'EXTENSION_NO_VALIDATION',
          path: `layers.extensions.${extension}.customization.validate`,
          message: `Extension ${extension} has customization but validation is disabled`,
          impact: 'low',
          category: 'best-practice',
          layer: 'extensions',
          recommendation: 'Enable validation for customized extensions',
          autoFixable: true
        });
      }
    }

    // Archetype system validation
    if (layer.archetypes?.enabled && !layer.archetypes.customArchetypes?.length) {
      warnings.push({
        code: 'ARCHETYPES_NO_PROFILES',
        path: 'layers.extensions.archetypes.profiles',
        message: 'Archetype system enabled but no profiles defined',
        impact: 'medium',
        category: 'compatibility',
        layer: 'extensions',
        recommendation: 'Define archetype profiles or disable archetype system',
        autoFixable: false
      });
    }
  }

  /**
   * Validate cross-layer constraints
   */
  private async validateCrossLayerConstraints(
    config: LayeredConfiguration,
    options: AdvancedValidationOptions
  ): Promise<{ errors: LayeredValidationError[]; warnings: LayeredValidationWarning[] }> {
    const errors: LayeredValidationError[] = [];
    const warnings: LayeredValidationWarning[] = [];

    // Architecture-Extension compatibility
    if (config.detection?.platform?.architecture && config.extensions) {
      const architecture = config.detection.platform.architecture;
      const enabledExtensions = Object.keys(config.extensions).filter(
        key => config.extensions[key]?.enabled
      );

      if (architecture === 'individual' && enabledExtensions.includes('saas')) {
        warnings.push({
          code: 'ARCHITECTURE_EXTENSION_MISMATCH',
          path: 'layers',
          message: 'Individual architecture with SaaS extension may not be optimal',
          impact: 'medium',
          category: 'compatibility',
          layer: 'cross-layer',
          recommendation: 'Consider team or hybrid architecture for SaaS platforms',
          autoFixable: false
        });
      }

      if (architecture === 'team' && enabledExtensions.includes('outdoor')) {
        warnings.push({
          code: 'ARCHITECTURE_EXTENSION_MISMATCH',
          path: 'layers',
          message: 'Team architecture with outdoor extension may not be optimal',
          impact: 'medium',
          category: 'compatibility',
          layer: 'cross-layer',
          recommendation: 'Consider individual or hybrid architecture for outdoor platforms',
          autoFixable: false
        });
      }
    }

    // Universal-Detection compatibility
    if (config.universal?.makerkit?.accountType && config.detection?.platform?.architecture) {
      const accountType = config.universal.makerkit.accountType;
      const architecture = config.detection.platform.architecture;

      if (accountType === 'individual' && architecture === 'team') {
        errors.push({
          code: 'ACCOUNT_ARCHITECTURE_CONFLICT',
          path: 'layers',
          message: 'Personal account type conflicts with team architecture',
          severity: 'high',
          category: 'compatibility',
          layer: 'cross-layer',
          autoFixable: true
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate layered configuration compatibility
   */
  private async validateLayeredCompatibility(
    config: LayeredConfiguration
  ): Promise<{ errors: LayeredValidationError[]; warnings: LayeredValidationWarning[] }> {
    const errors: LayeredValidationError[] = [];
    const warnings: LayeredValidationWarning[] = [];

    // Version compatibility
    const configVersion = config.metadata?.version || '2.4.1';
    if (configVersion < '2.4.1') {
      warnings.push({
        code: 'OLD_CONFIG_VERSION',
        path: 'metadata.version',
        message: `Configuration version ${configVersion} is outdated`,
        impact: 'medium',
        category: 'compatibility',
        layer: 'cross-layer',
        recommendation: 'Upgrade configuration to v2.4.1',
        autoFixable: true
      });
    }

    // Layer structure validation
    if (!config.universal || !config.detection || !config.extensions) {
      errors.push({
        code: 'MISSING_LAYERS',
        path: 'layers',
        message: 'Layered configuration missing required layer properties',
        severity: 'critical',
        category: 'structure',
        layer: 'cross-layer',
        autoFixable: false
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate layered configuration performance
   */
  private async validateLayeredPerformance(config: LayeredConfiguration): Promise<LayeredPerformanceValidation> {
    // Analyze layer complexity
    const universalComplexity = this.analyzeLayerComplexity(config.universal);
    const detectionComplexity = this.analyzeLayerComplexity(config.detection);
    const extensionComplexity = this.analyzeLayerComplexity(config.extensions);
    const crossLayerComplexity = this.analyzeCrossLayerComplexity(config);

    const overallComplexity = (universalComplexity + detectionComplexity + extensionComplexity + crossLayerComplexity) / 4;
    const score = Math.max(0, 100 - (overallComplexity * 10));

    return {
      score,
      estimatedSlowdown: Math.min(50, overallComplexity * 5),
      memoryImpact: Math.min(100, overallComplexity * 2),
      complexityAnalysis: {
        universalComplexity,
        detectionComplexity,
        extensionComplexity,
        crossLayerComplexity
      },
      recommendations: this.generateLayeredPerformanceRecommendations(overallComplexity),
      optimizations: this.generateLayeredOptimizationSuggestions(config),
      layerImpact: {
        universal: universalComplexity,
        detection: detectionComplexity,
        extensions: extensionComplexity
      }
    };
  }

  /**
   * Analyze migration requirements for layered configuration
   */
  private async analyzeLayeredMigrationRequirements(config: LayeredConfiguration): Promise<LayeredMigrationInfo> {
    const currentVersion = config.metadata?.version || '2.4.1';
    const targetVersion = '2.4.1';
    
    // Check if migration is needed
    const migrationRequired = currentVersion !== targetVersion;
    
    return {
      required: migrationRequired,
      fromVersion: currentVersion,
      toVersion: targetVersion,
      migrationSteps: [],
      estimatedDuration: 0,
      riskAssessment: 'low',
      backupRecommended: migrationRequired,
      rollbackSupported: true,
      layerMigrations: {
        universal: [],
        detection: [],
        extensions: []
      }
    };
  }

  /**
   * Generate improvement suggestions for layered configuration
   */
  private async generateLayeredSuggestions(
    config: LayeredConfiguration,
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[]
  ): Promise<LayeredValidationSuggestion[]> {
    const suggestions: LayeredValidationSuggestion[] = [];

    // Performance optimization suggestions
    const extensionComplexity = this.analyzeLayerComplexity(config.extensions);
    if (extensionComplexity > 5) {
      suggestions.push({
        type: 'optimization',
        priority: 'medium',
        description: 'Extension layer complexity is high, consider simplification',
        impact: 'Improved performance and maintainability',
        implementation: [
          'Disable unused extensions',
          'Simplify extension configurations',
          'Use extension templates'
        ],
        estimatedBenefit: '10-30% performance improvement',
        affectedLayers: ['extensions']
      });
    }

    // Migration suggestions
    const compatibilityErrors = errors.filter(e => e.category === 'compatibility');
    if (compatibilityErrors.length > 0) {
      suggestions.push({
        type: 'migration',
        priority: 'high',
        description: 'Configuration compatibility issues detected',
        impact: 'Improved compatibility and reduced errors',
        implementation: [
          'Run configuration migration utility',
          'Update deprecated configurations',
          'Test migrated configuration'
        ],
        estimatedBenefit: 'Improved compatibility and reduced errors',
        affectedLayers: ['universal', 'detection', 'extensions']
      });
    }

    return suggestions;
  }

  /**
   * Generate auto-fix suggestions for layered configuration
   */
  private async generateLayeredAutoFixSuggestions(errors: LayeredValidationError[]): Promise<LayeredAutoFixSuggestion[]> {
    const autoFixSuggestions: LayeredAutoFixSuggestion[] = [];

    for (const error of errors.filter(e => e.autoFixable)) {
      switch (error.code) {
        case 'MAKERKIT_DISABLED':
          autoFixSuggestions.push({
            errorCode: error.code,
            path: error.path,
            description: 'Enable MakerKit compliance in universal layer',
            action: 'modify',
            suggestedValue: true,
            riskLevel: 'safe',
            backupRequired: false,
            affectedLayers: ['universal']
          });
          break;

        case 'RLS_DISABLED':
          autoFixSuggestions.push({
            errorCode: error.code,
            path: error.path,
            description: 'Enable RLS compliance for security',
            action: 'modify',
            suggestedValue: true,
            riskLevel: 'moderate',
            backupRequired: true,
            affectedLayers: ['universal']
          });
          break;

        case 'INVALID_CONFIDENCE':
          autoFixSuggestions.push({
            errorCode: error.code,
            path: error.path,
            description: 'Fix detection confidence value',
            action: 'modify',
            suggestedValue: 0.8,
            riskLevel: 'safe',
            backupRequired: false,
            affectedLayers: ['detection']
          });
          break;
      }
    }

    return autoFixSuggestions;
  }

  /**
   * Utility methods for layered validation
   */
  private calculateLayerCoverage(layer: any, layerName: string): LayerValidationResult['coverage'] {
    if (!layer) return { totalFields: 0, validatedFields: 0, percentage: 0 };
    
    const totalFields = this.getExpectedFieldsForLayer(layerName);
    const validatedFields = Object.keys(layer).length;
    
    return {
      totalFields,
      validatedFields,
      percentage: totalFields > 0 ? (validatedFields / totalFields) * 100 : 100
    };
  }

  private getExpectedFieldsForLayer(layerName: string): number {
    switch (layerName) {
      case 'universal': return 5; // makerkit, security, storage, webhook, deployment
      case 'detection': return 3; // platform, autoConfiguration, overrides
      case 'extensions': return 6; // outdoor, saas, ecommerce, social, archetypes, customization
      default: return 0;
    }
  }

  private calculateLayerConstraintStats(
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[]
  ): LayerValidationResult['constraints'] {
    const checked = errors.length + warnings.length;
    const failed = errors.length;
    const passed = warnings.length;

    return { checked, passed, failed };
  }

  private calculateLayerScore(
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[],
    coverage: LayerValidationResult['coverage']
  ): number {
    let score = 100;
    
    // Deduct for errors
    score -= errors.filter(e => e.severity === 'critical').length * 25;
    score -= errors.filter(e => e.severity === 'high').length * 15;
    score -= errors.filter(e => e.severity === 'medium').length * 10;
    score -= errors.filter(e => e.severity === 'low').length * 5;
    
    // Deduct for warnings
    score -= warnings.filter(w => w.impact === 'high').length * 5;
    score -= warnings.filter(w => w.impact === 'medium').length * 3;
    score -= warnings.filter(w => w.impact === 'low').length * 1;
    
    // Factor in coverage
    score = score * (coverage.percentage / 100);
    
    return Math.max(0, Math.round(score));
  }

  private calculateLayeredOverallScore(
    layers: LayeredConfigValidationResult['layers'],
    errors: LayeredValidationError[],
    warnings: LayeredValidationWarning[]
  ): number {
    const layerScores = [layers.universal.score, layers.detection.score, layers.extensions.score];
    const averageLayerScore = layerScores.reduce((a, b) => a + b, 0) / layerScores.length;
    
    // Apply global penalties
    let globalScore = averageLayerScore;
    globalScore -= errors.filter(e => e.category === 'compatibility').length * 10;
    globalScore -= warnings.filter(w => w.category === 'performance').length * 5;
    
    return Math.max(0, Math.round(globalScore));
  }

  private analyzeLayerComplexity(layer: any): number {
    if (!layer) return 0;
    const complexity = JSON.stringify(layer).split('{').length + JSON.stringify(layer).split('[').length;
    return Math.min(10, complexity / 50);
  }

  private analyzeCrossLayerComplexity(config: LayeredConfiguration): number {
    // Analyze interactions between layers
    let complexity = 0;
    
    // Detection-Extension interactions
    if (config.detection?.platform && config.extensions) {
      complexity += Object.keys(config.extensions).filter(key => 
        config.extensions[key]?.enabled
      ).length;
    }
    
    // Universal-Detection interactions
    if (config.universal?.makerkit && config.detection?.platform) {
      complexity += 1;
    }
    
    return Math.min(10, complexity);
  }

  private generateLayeredPerformanceRecommendations(complexity: number): string[] {
    const recommendations: string[] = [];
    
    if (complexity > 7) {
      recommendations.push('Consider simplifying layer configurations');
      recommendations.push('Disable unused extensions');
      recommendations.push('Use configuration templates');
    }
    
    if (complexity > 5) {
      recommendations.push('Enable configuration caching');
      recommendations.push('Consider lazy loading for extensions');
    }
    
    return recommendations;
  }

  private generateLayeredOptimizationSuggestions(config: LayeredConfiguration): string[] {
    const suggestions = [
      'Use template-based configurations for better performance',
      'Enable configuration caching',
      'Consider batch validation for multiple configurations'
    ];

    // Layer-specific suggestions
    if (config.extensions) {
      const enabledExtensions = Object.keys(config.extensions).filter(
        key => config.extensions[key]?.enabled
      );
      if (enabledExtensions.length > 2) {
        suggestions.push('Consider reducing number of enabled extensions');
      }
    }

    return suggestions;
  }

  /**
   * Apply auto-fixes to layered configuration
   */
  async applyLayeredAutoFixes(
    config: LayeredConfiguration,
    autoFixSuggestions: LayeredAutoFixSuggestion[]
  ): Promise<{ fixedConfig: LayeredConfiguration; appliedFixes: string[] }> {
    const fixedConfig = JSON.parse(JSON.stringify(config)) as LayeredConfiguration;
    const appliedFixes: string[] = [];

    for (const fix of autoFixSuggestions.filter(f => f.riskLevel === 'safe')) {
      try {
        this.applyLayeredFix(fixedConfig, fix);
        appliedFixes.push(`${fix.action} ${fix.path}: ${fix.description}`);
      } catch (error: any) {
        Logger.warn(`Failed to apply auto-fix for ${fix.path}: ${error.message}`);
      }
    }

    Logger.info(`Applied ${appliedFixes.length} layered auto-fixes`);
    return { fixedConfig, appliedFixes };
  }

  private applyLayeredFix(config: LayeredConfiguration, fix: LayeredAutoFixSuggestion): void {
    const pathParts = fix.path.split('.');
    let current: any = config;

    // Navigate to parent
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }

    const lastKey = pathParts[pathParts.length - 1];

    switch (fix.action) {
      case 'add':
      case 'modify':
        current[lastKey] = fix.suggestedValue;
        break;
      case 'remove':
        delete current[lastKey];
        break;
    }
  }
}