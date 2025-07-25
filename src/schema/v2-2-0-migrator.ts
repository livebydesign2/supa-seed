/**
 * v2.2.0 Configuration Migrator
 * Upgrades v2.1.0 schema-first configurations to v2.2.0 constraint-aware architecture
 * Part of supa-seed v2.2.0 constraint-aware architecture
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { ConfigMigrator, type ModernConfig, type MigrationResult } from './config-migrator';
import { 
  ConstraintDiscoveryEngine, 
  type ConstraintMetadata 
} from './constraint-discovery-engine';
import { 
  WorkflowGenerator, 
  type WorkflowGenerationOptions 
} from './workflow-generator';
import { 
  type WorkflowConfiguration 
} from './constraint-aware-executor';

type SupabaseClient = ReturnType<typeof createClient>;

export interface V2_2_0_Config extends Omit<ModernConfig, 'version'> {
  version: '2.2.0';
  strategy: 'constraint-aware' | 'schema-first' | 'legacy';
  
  // Enhanced seeding configuration
  seeding: ModernConfig['seeding'] & {
    enableDeepConstraintDiscovery: boolean;
    enableBusinessLogicParsing: boolean;
    enableWorkflowGeneration: boolean;
  };
  
  // Enhanced schema configuration
  schema: ModernConfig['schema'] & {
    constraints: ModernConfig['schema']['constraints'] & {
      enableDeepDiscovery: boolean;
      parseTriggerFunctions: boolean;
      buildDependencyGraph: boolean;
      preValidateOperations: boolean;
      cacheConstraintMetadata?: boolean;
      constraintDiscoveryTimeout?: number;
    };
  };
  
  // Enhanced execution configuration
  execution: ModernConfig['execution'] & {
    constraintValidationStrategy: 'pre_execution' | 'post_execution' | 'both';
    errorHandlingStrategy: 'fail_fast' | 'graceful_degradation' | 'best_effort';
    autoFixStrategy: 'aggressive' | 'conservative' | 'disabled';  
    workflowExecutionMode: 'constraint_aware' | 'schema_first' | 'legacy';
    enableStepValidation?: boolean;
    enableAutoRecovery?: boolean;
  };
  
  // v2.2.0 Workflow configuration
  workflows?: WorkflowConfiguration['workflows'];
  
  // v2.2.0 Discovered constraint metadata
  discoveredConstraints?: ConstraintMetadata;
  
  // Enhanced compatibility
  compatibility: ModernConfig['compatibility'] & {
    supportSchemaFirstMode: boolean;
    enableV2_1_0_Fallback: boolean;
    gracefulDegradationToV2_1_0?: boolean;
  };
  
  // v2.2.0 specific settings
  testing?: {
    enableConstraintTesting: boolean;
    validateDiscoveredRules: boolean;
    testAutoFixes: boolean;
    constraintViolationSimulation: boolean;
    workflowValidationTests: boolean;
  };
  
  performance?: {
    constraintDiscoveryCache: boolean;
    businessRuleParsingTimeout: number;
    workflowExecutionTimeout: number;
    enableExecutionMetrics: boolean;
    logConstraintViolations: boolean;
    logAutoFixes: boolean;
  };
}

export interface V2_2_0_MigrationOptions {
  // Migration behavior
  enableConstraintDiscovery: boolean;
  generateWorkflows: boolean;
  enableAutoFixes: boolean;
  
  // Workflow generation options
  workflowGenerationOptions?: WorkflowGenerationOptions;
  
  // Performance settings
  constraintDiscoveryTimeout?: number; 
  cacheDiscoveredConstraints?: boolean;
  
  // Compatibility options
  maintainV2_1_0_Compatibility: boolean;
  enableGracefulDegradation: boolean;
  
  // Testing options
  enableTestingFeatures?: boolean;
  validateConstraintsAfterMigration?: boolean;
}

export interface V2_2_0_MigrationResult extends MigrationResult {
  v2_2_0_Config: V2_2_0_Config;
  discoveredConstraints?: ConstraintMetadata;
  generatedWorkflows?: WorkflowConfiguration['workflows'];
  constraintDiscoveryReport: {
    success: boolean;
    rulesFound: number;
    dependenciesFound: number;
    confidence: number;
    warnings: string[];
  };
  workflowGenerationReport?: {
    success: boolean;
    workflowsGenerated: number;
    autoFixesGenerated: number;
    confidence: number;
  };
}

export class V2_2_0_Migrator {
  private client: SupabaseClient;
  private legacyMigrator: ConfigMigrator;
  private constraintEngine: ConstraintDiscoveryEngine;
  private workflowGenerator: WorkflowGenerator;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.legacyMigrator = new ConfigMigrator(client);
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
    this.workflowGenerator = new WorkflowGenerator(client);
  }

  /**
   * Migrate v2.1.0 configuration to v2.2.0 constraint-aware architecture
   */
  async migrateToV2_2_0(
    v2_1_0_Config: ModernConfig,
    options: V2_2_0_MigrationOptions
  ): Promise<V2_2_0_MigrationResult> {
    Logger.info('🚀 Starting v2.2.0 constraint-aware architecture migration...');

    const migrationResult: V2_2_0_MigrationResult = {
      success: false,
      modernConfig: v2_1_0_Config,
      v2_2_0_Config: await this.createBaseV2_2_0_Config(v2_1_0_Config, options),
      warnings: [],
      errors: [],
      changes: [],
      backupPath: '',
      recommendedActions: [],
      constraintDiscoveryReport: {
        success: false,
        rulesFound: 0,
        dependenciesFound: 0,
        confidence: 0,
        warnings: []
      }
    };

    try {
      // Step 1: Perform constraint discovery if enabled
      if (options.enableConstraintDiscovery) {
        await this.performConstraintDiscovery(migrationResult, options);
      }

      // Step 2: Generate workflows if enabled
      if (options.generateWorkflows) {
        await this.generateWorkflows(migrationResult, options);
      }

      // Step 3: Apply v2.2.0 enhancements
      await this.applyV2_2_0_Enhancements(migrationResult, options);

      // Step 4: Validate migration result
      if (options.validateConstraintsAfterMigration) {
        await this.validateMigrationResult(migrationResult);
      }

      // Step 5: Generate migration summary
      this.generateMigrationSummary(migrationResult);

      migrationResult.success = migrationResult.errors.length === 0;

      const duration = Date.now();
      Logger.success(`✅ v2.2.0 migration completed (${migrationResult.success ? 'SUCCESS' : 'WITH ERRORS'})`);

    } catch (error: any) {
      Logger.error('v2.2.0 migration failed:', error);
      migrationResult.errors.push(`Migration failed: ${error.message}`);
      migrationResult.success = false;
    }

    return migrationResult;
  }

  /**
   * Create base v2.2.0 configuration from v2.1.0 config
   */
  private async createBaseV2_2_0_Config(
    v2_1_0_Config: ModernConfig,
    options: V2_2_0_MigrationOptions
  ): Promise<V2_2_0_Config> {
    const v2_2_0_Config: V2_2_0_Config = {
      ...v2_1_0_Config,
      version: '2.2.0',
      strategy: 'constraint-aware',
      
      // Enhanced seeding configuration
      seeding: {
        ...v2_1_0_Config.seeding,
        enableDeepConstraintDiscovery: options.enableConstraintDiscovery,
        enableBusinessLogicParsing: options.enableConstraintDiscovery,
        enableWorkflowGeneration: options.generateWorkflows
      },
      
      // Enhanced schema configuration
      schema: {
        ...v2_1_0_Config.schema,
        constraints: {
          ...v2_1_0_Config.schema.constraints,
          enableDeepDiscovery: options.enableConstraintDiscovery,
          parseTriggerFunctions: options.enableConstraintDiscovery,
          buildDependencyGraph: options.enableConstraintDiscovery,
          preValidateOperations: true,
          cacheConstraintMetadata: options.cacheDiscoveredConstraints ?? true,
          constraintDiscoveryTimeout: options.constraintDiscoveryTimeout ?? 10000
        }
      },
      
      // Enhanced execution configuration
      execution: {
        ...v2_1_0_Config.execution,
        constraintValidationStrategy: 'pre_execution',
        errorHandlingStrategy: options.enableGracefulDegradation ? 'graceful_degradation' : 'fail_fast',
        autoFixStrategy: options.enableAutoFixes ? 'aggressive' : 'conservative',
        workflowExecutionMode: 'constraint_aware',
        enableStepValidation: true,
        enableAutoRecovery: options.enableGracefulDegradation
      },
      
      // Enhanced compatibility
      compatibility: {
        ...v2_1_0_Config.compatibility,
        supportSchemaFirstMode: options.maintainV2_1_0_Compatibility,
        enableV2_1_0_Fallback: options.maintainV2_1_0_Compatibility,
        gracefulDegradationToV2_1_0: options.enableGracefulDegradation
      },
      
      // v2.2.0 specific settings
      testing: options.enableTestingFeatures ? {
        enableConstraintTesting: true,
        validateDiscoveredRules: true,
        testAutoFixes: options.enableAutoFixes,
        constraintViolationSimulation: true,
        workflowValidationTests: true
      } : undefined,
      
      performance: {
        constraintDiscoveryCache: options.cacheDiscoveredConstraints ?? true,
        businessRuleParsingTimeout: options.constraintDiscoveryTimeout ?? 5000,
        workflowExecutionTimeout: 30000,
        enableExecutionMetrics: true,
        logConstraintViolations: true,
        logAutoFixes: options.enableAutoFixes
      }
    };

    return v2_2_0_Config;
  }

  /**
   * Perform constraint discovery and update configuration
   */
  private async performConstraintDiscovery(
    migrationResult: V2_2_0_MigrationResult,
    options: V2_2_0_MigrationOptions
  ): Promise<void> {
    Logger.info('🔍 Performing constraint discovery...');

    try {
      // Extract table names from existing configuration
      const tableNames = this.extractTableNamesFromConfig(migrationResult.v2_2_0_Config);
      
      // Discover constraints
      const discoveredConstraints = await this.constraintEngine.discoverConstraints(tableNames);
      
      // Update migration result
      migrationResult.discoveredConstraints = discoveredConstraints;
      migrationResult.v2_2_0_Config.discoveredConstraints = discoveredConstraints;
      
      // Update constraint discovery report
      migrationResult.constraintDiscoveryReport = {
        success: true,
        rulesFound: discoveredConstraints.businessRules.length,
        dependenciesFound: discoveredConstraints.dependencies.length,
        confidence: discoveredConstraints.confidence,
        warnings: []
      };

      // Add warnings for low confidence rules
      const lowConfidenceRules = discoveredConstraints.businessRules.filter(rule => rule.confidence < 0.7);
      if (lowConfidenceRules.length > 0) {
        const warning = `${lowConfidenceRules.length} business rules have low confidence scores`;
        migrationResult.constraintDiscoveryReport.warnings.push(warning);
        migrationResult.warnings.push(warning);
      }

      Logger.success(`✅ Constraint discovery completed: ${discoveredConstraints.businessRules.length} rules found`);

    } catch (error: any) {
      Logger.error('Constraint discovery failed:', error);
      migrationResult.constraintDiscoveryReport.success = false;
      migrationResult.constraintDiscoveryReport.warnings.push(`Discovery failed: ${error.message}`);
      migrationResult.warnings.push(`Constraint discovery failed: ${error.message}`);
    }
  }

  /**
   * Generate workflows based on discovered constraints
   */
  private async generateWorkflows(
    migrationResult: V2_2_0_MigrationResult,
    options: V2_2_0_MigrationOptions
  ): Promise<void> {
    Logger.info('🏗️ Generating constraint-aware workflows...');

    try {
      if (!migrationResult.discoveredConstraints) {
        migrationResult.warnings.push('Workflow generation skipped: No constraint metadata available');
        return;
      }

      const tableNames = this.extractTableNamesFromConfig(migrationResult.v2_2_0_Config);
      const generationOptions: WorkflowGenerationOptions = {
        userCreationStrategy: 'adaptive',
        constraintHandling: 'auto_fix',
        generateOptionalSteps: true,
        includeDependencyCreation: true,
        enableAutoFixes: options.enableAutoFixes,
        ...options.workflowGenerationOptions
      };

      const { configuration, metadata } = await this.workflowGenerator.generateWorkflowConfiguration(
        tableNames,
        generationOptions
      );

      // Update migration result
      migrationResult.generatedWorkflows = configuration.workflows;
      migrationResult.v2_2_0_Config.workflows = configuration.workflows;

      // Update workflow generation report
      migrationResult.workflowGenerationReport = {
        success: true,
        workflowsGenerated: Object.keys(configuration.workflows).length,
        autoFixesGenerated: this.countAutoFixes(configuration.workflows),
        confidence: metadata.confidence
      };

      Logger.success(`✅ Workflow generation completed: ${Object.keys(configuration.workflows).length} workflows generated`);

    } catch (error: any) {
      Logger.error('Workflow generation failed:', error);
      migrationResult.workflowGenerationReport = {
        success: false,
        workflowsGenerated: 0,
        autoFixesGenerated: 0,
        confidence: 0
      };
      migrationResult.warnings.push(`Workflow generation failed: ${error.message}`);
    }
  }

  /**
   * Apply v2.2.0 specific enhancements
   */
  private async applyV2_2_0_Enhancements(
    migrationResult: V2_2_0_MigrationResult,
    options: V2_2_0_MigrationOptions
  ): Promise<void> {
    Logger.debug('Applying v2.2.0 enhancements...');

    // Track configuration changes
    migrationResult.changes.push({
      type: 'modified',
      path: 'version',
      oldValue: '2.1.0',
      newValue: '2.2.0',
      reason: 'Upgraded to constraint-aware architecture'
    });

    migrationResult.changes.push({
      type: 'added',
      path: 'strategy',
      newValue: 'constraint-aware',
      reason: 'Added v2.2.0 constraint-aware strategy'
    });

    if (migrationResult.discoveredConstraints) {
      migrationResult.changes.push({
        type: 'added',
        path: 'discoveredConstraints',
        newValue: `${migrationResult.discoveredConstraints.businessRules.length} business rules`,
        reason: 'Added discovered PostgreSQL constraint metadata'
      });
    }

    if (migrationResult.generatedWorkflows) {
      migrationResult.changes.push({
        type: 'added',
        path: 'workflows',
        newValue: `${Object.keys(migrationResult.generatedWorkflows).length} generated workflows`,
        reason: 'Added auto-generated constraint-aware workflows'
      });
    }

    // Update migration metadata
    migrationResult.v2_2_0_Config.migration = {
      ...migrationResult.v2_2_0_Config.migration,
      migratedFrom: '2.1.0',
      migrationDate: new Date().toISOString(),
      migrationWarnings: migrationResult.warnings.slice()
    };
  }

  /**
   * Validate migration result
   */
  private async validateMigrationResult(migrationResult: V2_2_0_MigrationResult): Promise<void> {
    Logger.debug('Validating v2.2.0 migration result...');

    // Validate version
    if (migrationResult.v2_2_0_Config.version !== '2.2.0') {
      migrationResult.errors.push('Version not updated to 2.2.0');
    }

    // Validate strategy
    if (migrationResult.v2_2_0_Config.strategy !== 'constraint-aware') {
      migrationResult.warnings.push('Strategy not set to constraint-aware');
    }

    // Validate constraint discovery results
    if (migrationResult.v2_2_0_Config.seeding.enableDeepConstraintDiscovery && !migrationResult.discoveredConstraints) {
      migrationResult.warnings.push('Constraint discovery enabled but no constraints discovered');
    }

    // Validate workflow generation results
    if (migrationResult.v2_2_0_Config.seeding.enableWorkflowGeneration && !migrationResult.generatedWorkflows) {
      migrationResult.warnings.push('Workflow generation enabled but no workflows generated');
    }
  }

  /**
   * Generate migration summary and recommendations
   */
  private generateMigrationSummary(migrationResult: V2_2_0_MigrationResult): void {
    // Generate recommendations based on migration results
    migrationResult.recommendedActions = [
      'Test the migrated configuration in a development environment',
      'Review auto-generated workflows for your specific use case',
      'Validate discovered constraint rules against your business logic'
    ];

    if (migrationResult.constraintDiscoveryReport.rulesFound === 0) {
      migrationResult.recommendedActions.push(
        'No business rules discovered. Consider adding PostgreSQL triggers or constraints for better data integrity.'
      );
    }

    if (migrationResult.constraintDiscoveryReport.confidence < 0.8) {
      migrationResult.recommendedActions.push(
        'Low constraint discovery confidence. Review and test the discovered rules carefully.'
      );
    }

    if (migrationResult.workflowGenerationReport && migrationResult.workflowGenerationReport.autoFixesGenerated > 0) {
      migrationResult.recommendedActions.push(
        `${migrationResult.workflowGenerationReport.autoFixesGenerated} auto-fixes generated. Review and test these fixes before production use.`
      );
    }

    // Add compatibility recommendations
    if (migrationResult.v2_2_0_Config.compatibility.enableV2_1_0_Fallback) {
      migrationResult.recommendedActions.push(
        'v2.1.0 fallback is enabled. Consider disabling after successful testing.'
      );
    }
  }

  /**
   * Utility methods
   */
  private extractTableNamesFromConfig(config: V2_2_0_Config): string[] {
    const tableNames: string[] = [];

    // Extract from existing schema configuration
    if (config.schema.primaryUserTable) {
      tableNames.push(config.schema.primaryUserTable);
    }

    // Extract from column mappings
    Object.keys(config.schema.columnMapping.customMappings || {}).forEach(tableName => {
      if (!tableNames.includes(tableName)) {
        tableNames.push(tableName);
      }
    });

    // Add common tables if none found
    if (tableNames.length === 0) {
      tableNames.push('profiles', 'accounts', 'users');
    }

    return tableNames;
  }

  private countAutoFixes(workflows: WorkflowConfiguration['workflows']): number {
    let autoFixCount = 0;

    Object.values(workflows).forEach(workflow => {
      if ('steps' in workflow) {
        workflow.steps.forEach(step => {
          if (step.autoFixes) {
            autoFixCount += step.autoFixes.length;
          }
        });
      }
    });

    return autoFixCount;
  }

  /**
   * Quick migration helper for common use cases
   */
  static async quickMigrateToV2_2_0(
    client: SupabaseClient,
    v2_1_0_ConfigPath: string,
    outputPath?: string
  ): Promise<V2_2_0_MigrationResult> {
    const migrator = new V2_2_0_Migrator(client);
    
    // Read existing v2.1.0 configuration
    const fs = await import('fs');
    const v2_1_0_Config = JSON.parse(
      await fs.promises.readFile(v2_1_0_ConfigPath, 'utf8')
    ) as ModernConfig;

    // Use recommended migration options
    const options: V2_2_0_MigrationOptions = {
      enableConstraintDiscovery: true,
      generateWorkflows: true,
      enableAutoFixes: true,
      maintainV2_1_0_Compatibility: true,
      enableGracefulDegradation: true,
      enableTestingFeatures: true,
      validateConstraintsAfterMigration: true,
      workflowGenerationOptions: {
        userCreationStrategy: 'adaptive',
        constraintHandling: 'auto_fix',
        generateOptionalSteps: true,
        includeDependencyCreation: true,
        enableAutoFixes: true
      }
    };

    const result = await migrator.migrateToV2_2_0(v2_1_0_Config, options);

    // Save migrated configuration if path provided
    if (outputPath && result.success) {
      const content = JSON.stringify(result.v2_2_0_Config, null, 2);
      await fs.promises.writeFile(outputPath, content, 'utf8');
      Logger.success(`✅ Migrated configuration saved to: ${outputPath}`);
    }

    return result;
  }
}