/**
 * Constraint-Aware Workflow Generator
 * Generates executable workflows based on discovered PostgreSQL constraints
 * Part of supa-seed v2.2.0 constraint-aware architecture
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { 
  ConstraintDiscoveryEngine, 
  type ConstraintMetadata, 
  type BusinessRule,
  type TableDependency,
  type DependencyGraph
} from './constraint-discovery-engine';
import {
  type WorkflowConfiguration,
  type UserCreationWorkflow,
  type WorkflowStep,
  type ConstraintCondition,
  type FieldMapping,
  type ErrorAction
} from './constraint-aware-executor';

type SupabaseClient = ReturnType<typeof createClient>;

export interface WorkflowGenerationOptions {
  frameworkType?: 'makerkit' | 'nextjs' | 'custom';
  userCreationStrategy: 'comprehensive' | 'minimal' | 'adaptive';
  constraintHandling: 'strict' | 'permissive' | 'auto_fix';
  generateOptionalSteps: boolean;
  includeDependencyCreation: boolean;
  enableAutoFixes: boolean;
}

export interface GeneratedWorkflowMetadata {
  generatedAt: string;
  constraintMetadata: ConstraintMetadata;
  dependencyGraph: DependencyGraph;
  generationOptions: WorkflowGenerationOptions;
  confidence: number;
  warnings: string[];
  recommendations: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  frameworkType: string;
  steps: WorkflowStepTemplate[];
  conditions: ConstraintConditionTemplate[];
}

export interface WorkflowStepTemplate {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'validate';
  priority: number;
  fieldMappings: FieldMappingTemplate[];
}

export interface ConstraintConditionTemplate {
  type: 'business_rule' | 'dependency' | 'validation';
  ruleName: string;
  condition: string;
  required: boolean;
}

export interface FieldMappingTemplate {
  fieldName: string;
  sourceType: 'input' | 'generated' | 'dependency';
  required: boolean;
  validator?: string;
}

export class WorkflowGenerator {
  private client: SupabaseClient;
  private constraintEngine: ConstraintDiscoveryEngine;
  private templates: Map<string, WorkflowTemplate> = new Map();

  constructor(client: SupabaseClient) {
    this.client = client;
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
    this.loadBuiltInTemplates();
  }

  /**
   * Generate a complete workflow configuration from discovered constraints
   */
  async generateWorkflowConfiguration(
    tableNames: string[],
    options: WorkflowGenerationOptions
  ): Promise<{ configuration: WorkflowConfiguration; metadata: GeneratedWorkflowMetadata }> {
    Logger.info('🏗️ Generating constraint-aware workflow configuration...');

    // Step 1: Discover constraints
    const constraints = await this.constraintEngine.discoverConstraints(tableNames);
    
    // Step 2: Build dependency graph
    const dependencyGraph = await this.constraintEngine.buildDependencyGraph(constraints);

    // Step 3: Generate user creation workflow
    const userCreationWorkflow = await this.generateUserCreationWorkflow(
      constraints,
      dependencyGraph,
      options
    );

    // Step 4: Build complete configuration
    const configuration: WorkflowConfiguration = {
      version: '2.2.0',
      strategy: 'constraint-aware',
      workflows: {
        userCreation: userCreationWorkflow
      },
      constraints: {
        discovery: {
          enabled: true,
          analyzeTriggers: true,
          parseFunctions: true,
          buildDependencyGraph: true,
          cacheResults: true
        },
        validation: {
          preValidation: true,
          continueOnWarnings: options.constraintHandling === 'permissive',
          stopOnErrors: options.constraintHandling === 'strict',
          validateDependencies: true
        },
        handling: {
          autoFix: options.enableAutoFixes,
          suggestFixes: true,
          skipInvalidOperations: options.constraintHandling === 'permissive',
          createDependenciesOnDemand: options.includeDependencyCreation
        }
      }
    };

    // Step 5: Generate metadata
    const metadata: GeneratedWorkflowMetadata = {
      generatedAt: new Date().toISOString(),
      constraintMetadata: constraints,
      dependencyGraph,
      generationOptions: options,
      confidence: this.calculateGenerationConfidence(constraints, dependencyGraph),
      warnings: [],
      recommendations: []
    };

    // Step 6: Add warnings and recommendations
    await this.addWarningsAndRecommendations(metadata, constraints, dependencyGraph);

    Logger.success(`✅ Workflow configuration generated (confidence: ${(metadata.confidence * 100).toFixed(1)}%)`);

    return { configuration, metadata };
  }

  /**
   * Generate user creation workflow based on constraints
   */
  async generateUserCreationWorkflow(
    constraints: ConstraintMetadata,
    dependencyGraph: DependencyGraph,
    options: WorkflowGenerationOptions
  ): Promise<UserCreationWorkflow> {
    Logger.debug('Generating user creation workflow...');

    // Determine creation order based on dependencies
    const creationOrder = dependencyGraph.creationOrder.length > 0 
      ? dependencyGraph.creationOrder 
      : this.inferCreationOrder(constraints);

    const steps: WorkflowStep[] = [];
    let stepCounter = 0;

    // Generate steps in dependency order
    for (const tableName of creationOrder) {
      const tableConstraints = constraints.tables.find(t => t.tableName === tableName);
      if (!tableConstraints) continue;

      const step = await this.generateTableStep(
        tableName,
        tableConstraints,
        constraints,
        options,
        stepCounter++
      );

      if (step) {
        steps.push(step);
      }
    }

    // Generate validation steps if needed
    if (options.userCreationStrategy === 'comprehensive') {
      const validationSteps = await this.generateValidationSteps(constraints, options);
      steps.push(...validationSteps);
    }

    return {
      steps,
      errorHandling: {
        type: options.constraintHandling === 'strict' ? 'fail_fast' : 'graceful_degradation',
        maxFailures: options.constraintHandling === 'permissive' ? 10 : 1,
        failureThreshold: 0.8
      },
      rollback: {
        enabled: true,
        onCriticalFailure: true,
        preserveSuccessfulSteps: options.constraintHandling === 'permissive'
      },
      validation: {
        preExecution: true,
        postExecution: options.userCreationStrategy === 'comprehensive',
        dependencyValidation: true
      }
    };
  }

  /**
   * Generate a workflow step for a specific table
   */
  private async generateTableStep(
    tableName: string,
    tableConstraints: any,
    allConstraints: ConstraintMetadata,
    options: WorkflowGenerationOptions,
    stepIndex: number
  ): Promise<WorkflowStep | null> {
    // Skip system tables and auth tables (handled separately)
    if (tableName.startsWith('auth.') || this.isSystemTable(tableName)) {
      return null;
    }

    Logger.debug(`Generating step for table: ${tableName}`);

    const stepId = `create_${tableName}_${stepIndex}`;
    
    // Generate field mappings based on table role and constraints
    const fieldMappings = await this.generateFieldMappings(
      tableName, 
      tableConstraints, 
      allConstraints, 
      options
    );

    // Generate conditions based on business rules
    const conditions = await this.generateStepConditions(
      tableName,
      tableConstraints,
      allConstraints
    );

    // Determine if this step is required
    const isRequired = this.isRequiredTable(tableName, allConstraints);

    // Generate auto-fixes for common constraint violations
    const autoFixes = await this.generateAutoFixes(
      tableName,
      tableConstraints,
      allConstraints
    );

    return {
      id: stepId,
      table: tableName,
      operation: 'insert',
      required: isRequired,
      conditions,
      fields: fieldMappings,
      onError: {
        type: options.enableAutoFixes ? 'auto_fix' : 
              options.constraintHandling === 'permissive' ? 'skip' : 'fail',
        maxRetries: options.enableAutoFixes ? 3 : 1
      },
      dependencies: this.extractStepDependencies(tableName, allConstraints),
      autoFixes: options.enableAutoFixes ? autoFixes : undefined
    };
  }

  /**
   * Generate field mappings for a table
   */
  private async generateFieldMappings(
    tableName: string,
    tableConstraints: any,
    allConstraints: ConstraintMetadata,
    options: WorkflowGenerationOptions
  ): Promise<FieldMapping[]> {
    const mappings: FieldMapping[] = [];

    // Standard ID field
    mappings.push({
      name: 'id',
      source: 'generated.uuid',
      required: true
    });

    // Table-specific mappings based on discovered patterns
    switch (tableName) {
      case 'accounts':
        mappings.push(
          { name: 'email', source: 'input.email', required: true },
          { name: 'name', source: 'input.name', required: false },
          { name: 'is_personal_account', source: 'generated.true', required: false }, // MakerKit constraint fix
        );
        break;

      case 'profiles':
        mappings.push(
          { name: 'id', source: 'auth_user.id', required: true },
          { name: 'email', source: 'input.email', required: false },
          { name: 'username', source: 'input.username', required: false },
          { name: 'name', source: 'input.name', required: false },
          { name: 'bio', source: 'input.bio', required: false },
          { name: 'avatar_url', source: 'input.picture_url', required: false }
        );
        break;

      case 'users':
        mappings.push(
          { name: 'email', source: 'input.email', required: true },
          { name: 'name', source: 'input.name', required: false },
          { name: 'username', source: 'input.username', required: false }
        );
        break;

      default:
        // Generic mappings for unknown tables
        mappings.push(
          { name: 'name', source: 'input.name', required: false },
          { name: 'title', source: 'input.title', required: false },
          { name: 'description', source: 'input.description', required: false }
        );
    }

    // Add timestamp fields
    mappings.push(
      { name: 'created_at', source: 'generated.now', required: false },
      { name: 'updated_at', source: 'generated.now', required: false }
    );

    // Add constraint-specific field mappings
    for (const rule of tableConstraints.constraints || []) {
      const constraintMapping = this.generateConstraintFieldMapping(rule, allConstraints);
      if (constraintMapping) {
        mappings.push(constraintMapping);
      }
    }

    return mappings;
  }

  /**
   * Generate constraint-specific field mapping
   */
  private generateConstraintFieldMapping(
    rule: BusinessRule,
    allConstraints: ConstraintMetadata
  ): FieldMapping | null {
    // Parse the rule to extract field requirements
    if (rule.autoFix && rule.autoFix.type === 'set_field') {
      return {
        name: rule.autoFix.action.field!,
        source: `constraint_fix.${rule.autoFix.action.value}`,
        value: rule.autoFix.action.value,
        required: rule.action === 'require'
      };
    }

    return null;
  }

  /**
   * Generate step conditions based on business rules
   */
  private async generateStepConditions(
    tableName: string,
    tableConstraints: any,
    allConstraints: ConstraintMetadata
  ): Promise<ConstraintCondition[]> {
    const conditions: ConstraintCondition[] = [];

    // Add business rule conditions
    for (const rule of tableConstraints.constraints || []) {
      if (rule.type === 'validation' || rule.type === 'business_logic') {
        conditions.push({
          type: 'business_rule',
          businessRuleId: rule.id,
          description: rule.errorMessage || rule.condition
        });
      }
    }

    // Add dependency conditions
    for (const dependency of tableConstraints.dependencies || []) {
      if (dependency.relationship === 'required') {
        conditions.push({
          type: 'exists',
          table: dependency.toTable,
          field: 'id',
          description: `Requires ${dependency.toTable} to exist`
        });
      }
    }

    // Add MakerKit-specific conditions
    if (tableName === 'profiles') {
      conditions.push({
        type: 'equals',
        table: 'accounts',
        field: 'is_personal_account',
        value: true,
        description: 'Profiles can only be created for personal accounts'
      });
    }

    return conditions;
  }

  /**
   * Generate auto-fixes for common constraint violations
   */
  private async generateAutoFixes(
    tableName: string,
    tableConstraints: any,
    allConstraints: ConstraintMetadata
  ): Promise<any[]> {
    const autoFixes: any[] = [];

    // Extract auto-fixes from business rules
    for (const rule of allConstraints.businessRules) {
      if (rule.table === tableName && rule.autoFix) {
        autoFixes.push(rule.autoFix);
      }
    }

    return autoFixes;
  }

  /**
   * Generate validation steps
   */
  private async generateValidationSteps(
    constraints: ConstraintMetadata,
    options: WorkflowGenerationOptions
  ): Promise<WorkflowStep[]> {
    const validationSteps: WorkflowStep[] = [];

    // Generate post-creation validation steps
    validationSteps.push({
      id: 'validate_user_creation',
      table: 'validation',
      operation: 'validate',
      required: false,
      fields: [],
      onError: { type: 'skip' },
      conditions: [{
        type: 'custom',
        customSQL: 'SELECT COUNT(*) > 0 FROM profiles WHERE created_at > NOW() - INTERVAL \'1 minute\'',
        description: 'Verify user profile was created successfully'
      }]
    });

    return validationSteps;
  }

  /**
   * Load built-in workflow templates
   */
  private loadBuiltInTemplates(): void {
    // MakerKit v2/v3 template
    this.templates.set('makerkit_v2', {
      id: 'makerkit_v2',
      name: 'MakerKit v2/v3 User Creation',
      description: 'Standard MakerKit user creation with accounts and profiles',
      frameworkType: 'makerkit',
      steps: [
        {
          id: 'create_auth_user',
          table: 'auth.users',
          operation: 'insert',
          priority: 1,
          fieldMappings: [
            { fieldName: 'email', sourceType: 'input', required: true },
            { fieldName: 'password', sourceType: 'input', required: true }
          ]
        },
        {
          id: 'create_account',
          table: 'accounts',
          operation: 'insert',
          priority: 2,
          fieldMappings: [
            { fieldName: 'id', sourceType: 'dependency', required: true },
            { fieldName: 'is_personal_account', sourceType: 'generated', required: true }
          ]
        },
        {
          id: 'create_profile',
          table: 'profiles',
          operation: 'insert',
          priority: 3,
          fieldMappings: [
            { fieldName: 'id', sourceType: 'dependency', required: true },
            { fieldName: 'username', sourceType: 'input', required: false }
          ]
        }
      ],
      conditions: [
        {
          type: 'business_rule',
          ruleName: 'validate_personal_account_profile',
          condition: 'accounts.is_personal_account = true',
          required: true
        }
      ]
    });

    // Generic template
    this.templates.set('generic', {
      id: 'generic',
      name: 'Generic User Creation',
      description: 'Basic user creation for custom schemas',
      frameworkType: 'custom',
      steps: [
        {
          id: 'create_user',
          table: 'users',
          operation: 'insert',
          priority: 1,
          fieldMappings: [
            { fieldName: 'email', sourceType: 'input', required: true },
            { fieldName: 'name', sourceType: 'input', required: false }
          ]
        }
      ],
      conditions: []
    });
  }

  /**
   * Utility methods
   */
  private inferCreationOrder(constraints: ConstraintMetadata): string[] {
    // Simple dependency-based ordering
    const tables = new Set<string>();
    const dependencies = new Map<string, string[]>();

    // Collect all tables and their dependencies
    constraints.dependencies.forEach(dep => {
      tables.add(dep.fromTable);
      tables.add(dep.toTable);
      
      if (!dependencies.has(dep.fromTable)) {
        dependencies.set(dep.fromTable, []);
      }
      dependencies.get(dep.fromTable)!.push(dep.toTable);
    });

    // Simple topological sort
    const ordered: string[] = [];
    const visited = new Set<string>();

    const visit = (table: string) => {
      if (visited.has(table)) return;
      visited.add(table);

      const deps = dependencies.get(table) || [];
      deps.forEach(dep => visit(dep));
      
      ordered.push(table);
    };

    Array.from(tables).forEach(table => visit(table));
    
    return ordered.reverse(); // Dependencies first
  }

  private isSystemTable(tableName: string): boolean {
    const systemTables = ['pg_', 'information_schema', 'auth.', '_'];
    return systemTables.some(prefix => tableName.startsWith(prefix));
  }

  private isRequiredTable(tableName: string, constraints: ConstraintMetadata): boolean {
    // Consider tables with high dependency count as required
    const dependencyCount = constraints.dependencies.filter(d => d.fromTable === tableName).length;
    return dependencyCount > 0 || ['users', 'accounts', 'profiles'].includes(tableName);
  }

  private extractStepDependencies(tableName: string, constraints: ConstraintMetadata): string[] {
    return constraints.dependencies
      .filter(dep => dep.fromTable === tableName)
      .map(dep => `create_${dep.toTable}`);
  }

  private calculateGenerationConfidence(
    constraints: ConstraintMetadata,
    dependencyGraph: DependencyGraph
  ): number {
    let confidence = constraints.confidence || 0;

    // Boost confidence based on discovered business rules
    if (constraints.businessRules.length > 0) {
      confidence += 0.2;
    }

    // Boost confidence based on dependency graph completeness
    if (dependencyGraph.nodes.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private async addWarningsAndRecommendations(
    metadata: GeneratedWorkflowMetadata,
    constraints: ConstraintMetadata,
    dependencyGraph: DependencyGraph
  ): Promise<void> {
    // Add warnings for low confidence business rules
    const lowConfidenceRules = constraints.businessRules.filter(rule => rule.confidence < 0.7);
    if (lowConfidenceRules.length > 0) {
      metadata.warnings.push(`${lowConfidenceRules.length} business rules have low confidence scores`);
    }

    // Add warnings for circular dependencies
    if (dependencyGraph.cycles.length > 0) {
      metadata.warnings.push(`${dependencyGraph.cycles.length} circular dependencies detected`);
    }

    // Add recommendations
    if (constraints.businessRules.length === 0) {
      metadata.recommendations.push('No business rules discovered. Consider adding triggers or constraints to improve data integrity.');
    }

    if (metadata.confidence < 0.8) {
      metadata.recommendations.push('Low generation confidence. Review and test the generated workflow thoroughly.');
    }
  }
}