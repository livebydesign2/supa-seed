/**
 * Configuration Validation System for Epic 7: Configuration Extensibility Framework
 * Validates configuration against detected schema and provides recommendations
 */

import type { createClient } from '@supabase/supabase-js';
import { ExtendedSeedConfig, FlexibleSeedConfig } from '../config-types';
import { SchemaAdapter } from '../schema-adapter';
import { FrameworkAdapter } from '../framework/framework-adapter';
import { Logger } from '../utils/logger';

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
}