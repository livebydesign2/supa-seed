/**
 * Schema-Driven Workflow Builder
 * Builds dynamic workflows based on actual database schema instead of hardcoded assumptions
 * Replaces framework-specific business logic with configurable execution patterns
 */

import { SchemaIntrospector, SchemaIntrospectionResult, TablePattern, ConstraintRule } from './schema-introspector';
import { Logger } from '../utils/logger';

export interface WorkflowStep {
  id: string;
  type: 'create_auth_user' | 'insert_record' | 'validate_constraint' | 'execute_trigger' | 'conditional_action';
  table?: string;
  description: string;
  dependencies: string[]; // IDs of steps that must complete first
  fields: WorkflowField[];
  conditions?: WorkflowCondition[];
  onError: 'fail' | 'skip' | 'retry' | 'continue';
  retryCount?: number;
  timeout?: number;
}

export interface WorkflowField {
  name: string;
  source: 'input' | 'generated' | 'reference' | 'computed';
  sourceField?: string; // For 'reference' source
  generator?: 'uuid' | 'faker' | 'timestamp' | 'sequence';
  fakerType?: string; // e.g., 'person.firstName', 'internet.email'
  required: boolean;
  validation?: WorkflowValidation[];
}

export interface WorkflowCondition {
  type: 'field_exists' | 'constraint_check' | 'relationship_exists' | 'custom_sql';
  field?: string;
  value?: any;
  sqlCondition?: string;
  description: string;
}

export interface WorkflowValidation {
  type: 'not_null' | 'unique' | 'foreign_key' | 'check_constraint' | 'custom';
  errorMessage: string;
  sqlCheck?: string;
}

export interface UserCreationWorkflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  rollbackSteps: WorkflowStep[];
  metadata: {
    framework: string;
    version: string;
    createdAt: string;
    schemaHash: string;
  };
}

export interface WorkflowBuilderConfig {
  primaryUserTable: string;
  enableConstraintValidation: boolean;
  enableRollback: boolean;
  generateOptionalFields: boolean;
  respectExistingData: boolean;
  customFieldMappings?: Record<string, string>;
  constraintOverrides?: Record<string, boolean>;
}

export class WorkflowBuilder {
  private introspector: SchemaIntrospector;
  private schemaResult: SchemaIntrospectionResult | null = null;

  constructor(introspector: SchemaIntrospector) {
    this.introspector = introspector;
  }

  /**
   * Build a complete user creation workflow based on actual schema
   */
  async buildUserCreationWorkflow(config: WorkflowBuilderConfig): Promise<UserCreationWorkflow> {
    Logger.info('🔨 Building schema-driven user creation workflow...');

    // Get fresh schema introspection
    this.schemaResult = await this.introspector.introspectSchema();

    if (!this.schemaResult) {
      throw new Error('Schema introspection failed - cannot build workflow');
    }

    // Find the primary user table
    const userTable = this.findUserTable(config.primaryUserTable);
    if (!userTable) {
      throw new Error(`Primary user table '${config.primaryUserTable}' not found in schema`);
    }

    // Build workflow steps
    const steps = await this.buildWorkflowSteps(userTable, config);
    const rollbackSteps = config.enableRollback ? await this.buildRollbackSteps(steps) : [];

    const workflow: UserCreationWorkflow = {
      id: `user_creation_${Date.now()}`,
      name: `Dynamic User Creation - ${userTable.name}`,
      description: `Schema-driven workflow for creating users in ${userTable.name} table`,
      steps,
      rollbackSteps,
      metadata: {
        framework: this.schemaResult.framework.type,
        version: this.schemaResult.framework.version,
        createdAt: new Date().toISOString(),
        schemaHash: this.generateSchemaHash(this.schemaResult)
      }
    };

    Logger.success(`✅ Built workflow with ${steps.length} steps`);
    return workflow;
  }

  /**
   * Find the appropriate user table pattern
   */
  private findUserTable(preferredTableName: string): TablePattern | null {
    if (!this.schemaResult) return null;

    // First try to find the exact table name
    let userTable = this.schemaResult.patterns.find(
      p => p.name === preferredTableName && p.suggestedRole === 'user'
    );

    // If not found, find any user table
    if (!userTable) {
      userTable = this.schemaResult.patterns.find(p => p.suggestedRole === 'user');
    }

    // If still not found, check if the preferred table exists but wasn't classified as user
    if (!userTable) {
      const tableExists = this.schemaResult.tables.find(t => t.name === preferredTableName);
      if (tableExists) {
        // Create a basic pattern for the table
        return {
          name: preferredTableName,
          confidence: 0.5,
          evidence: ['Specified as primary user table in config'],
          suggestedRole: 'user',
          columnMappings: this.generateBasicColumnMappings(tableExists.columns.map(c => c.name))
        };
      }
    }

    return userTable || null;
  }

  /**
   * Build the complete workflow steps
   */
  private async buildWorkflowSteps(userTable: TablePattern, config: WorkflowBuilderConfig): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    // Step 1: Always create auth user first (Supabase requirement)
    steps.push(await this.buildAuthUserStep());

    // Step 2: Validate constraints before user table insertion
    if (config.enableConstraintValidation) {
      const constraintSteps = await this.buildConstraintValidationSteps(userTable);
      steps.push(...constraintSteps);
    }

    // Step 3: Create the main user record
    const userRecordStep = await this.buildUserRecordStep(userTable, config);
    steps.push(userRecordStep);

    // Step 4: Handle related tables (accounts, profiles, etc.)
    const relatedSteps = await this.buildRelatedTableSteps(userTable, config);
    steps.push(...relatedSteps);

    // Step 5: Execute any post-creation triggers or business logic
    const postCreationSteps = await this.buildPostCreationSteps(userTable);
    steps.push(...postCreationSteps);

    return steps;
  }

  /**
   * Build auth user creation step
   */
  private async buildAuthUserStep(): Promise<WorkflowStep> {
    return {
      id: 'create_auth_user',
      type: 'create_auth_user',
      description: 'Create Supabase auth user',
      dependencies: [],
      fields: [
        {
          name: 'id',
          source: 'generated',
          generator: 'uuid',
          required: true,
          validation: [{ type: 'not_null', errorMessage: 'User ID is required' }]
        },
        {
          name: 'email',
          source: 'input',
          required: true,
          validation: [
            { type: 'not_null', errorMessage: 'Email is required' },
            { type: 'unique', errorMessage: 'Email must be unique' }
          ]
        },
        {
          name: 'password',
          source: 'input',
          required: true,
          validation: [{ type: 'not_null', errorMessage: 'Password is required' }]
        },
        {
          name: 'email_confirm',
          source: 'generated',
          required: false
        }
      ],
      onError: 'fail'
    };
  }

  /**
   * Build constraint validation steps
   */
  private async buildConstraintValidationSteps(userTable: TablePattern): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    if (!this.schemaResult) return steps;

    // Find constraints that affect the user table
    const relevantConstraints = this.schemaResult.constraints.userCreationConstraints.filter(
      c => c.table === userTable.name
    );

    for (const constraint of relevantConstraints) {
      if (constraint.requiresValidation) {
        steps.push({
          id: `validate_${constraint.rule}`,
          type: 'validate_constraint',
          table: constraint.table,
          description: `Validate constraint: ${constraint.description}`,
          dependencies: ['create_auth_user'],
          fields: [],
          conditions: [{
            type: 'custom_sql',
            sqlCondition: constraint.sqlCondition,
            description: constraint.description
          }],
          onError: 'fail'
        });
      }
    }

    return steps;
  }

  /**
   * Build the main user record creation step
   */
  private async buildUserRecordStep(userTable: TablePattern, config: WorkflowBuilderConfig): Promise<WorkflowStep> {
    const tableInfo = this.schemaResult?.tables.find(t => t.name === userTable.name);
    if (!tableInfo) {
      throw new Error(`Table info not found for ${userTable.name}`);
    }

    const fields: WorkflowField[] = [];

    // Add primary key field
    const pkColumn = tableInfo.columns.find(c => c.isPrimaryKey);
    if (pkColumn) {
      fields.push({
        name: pkColumn.name,
        source: 'reference',
        sourceField: 'id',
        required: true,
        validation: [{ type: 'not_null', errorMessage: 'Primary key is required' }]
      });
    }

    // Add mapped fields based on column mappings
    for (const [semanticField, columnOptions] of Object.entries(userTable.columnMappings)) {
      const actualColumn = columnOptions[0]; // Use first available column
      if (actualColumn) {
        const columnInfo = tableInfo.columns.find(c => c.name === actualColumn);
        if (columnInfo) {
          fields.push(this.buildFieldFromColumn(semanticField, columnInfo, config));
        }
      }
    }

    // Add required columns that weren't mapped
    for (const column of tableInfo.columns) {
      if (!column.isNullable && !column.isPrimaryKey && !fields.find(f => f.name === column.name)) {
        fields.push(this.buildFieldFromColumn(column.name, column, config));
      }
    }

    return {
      id: `create_user_record`,
      type: 'insert_record',
      table: userTable.name,
      description: `Create user record in ${userTable.name}`,
      dependencies: ['create_auth_user'],
      fields,
      onError: 'fail'
    };
  }

  /**
   * Build a workflow field from a database column
   */
  private buildFieldFromColumn(semanticField: string, column: any, config: WorkflowBuilderConfig): WorkflowField {
    const field: WorkflowField = {
      name: column.name,
      source: 'input',
      required: !column.isNullable,
      validation: []
    };

    // Add validations based on column constraints
    if (!column.isNullable) {
      field.validation!.push({ type: 'not_null', errorMessage: `${column.name} is required` });
    }

    // Set appropriate source and generator based on semantic meaning
    switch (semanticField) {
      case 'email':
        field.generator = 'faker';
        field.fakerType = 'internet.email';
        field.validation!.push({ type: 'unique', errorMessage: 'Email must be unique' });
        break;
      
      case 'name':
      case 'display_name':
      case 'full_name':
        field.generator = 'faker';
        field.fakerType = 'person.fullName';
        break;
      
      case 'username':
        field.generator = 'faker';
        field.fakerType = 'internet.userName';
        field.validation!.push({ type: 'unique', errorMessage: 'Username must be unique' });
        break;
      
      case 'avatar':
      case 'picture_url':
      case 'avatar_url':
        field.source = 'generated';
        field.generator = 'faker';
        field.fakerType = 'image.avatar';
        field.required = false;
        break;
      
      case 'bio':
      case 'about':
        field.generator = 'faker';
        field.fakerType = 'lorem.paragraph';
        field.required = false;
        break;
      
      case 'created_at':
      case 'updated_at':
        field.source = 'generated';
        field.generator = 'timestamp';
        break;
    }

    return field;
  }

  /**
   * Build steps for related tables
   */
  private async buildRelatedTableSteps(userTable: TablePattern, config: WorkflowBuilderConfig): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    if (!this.schemaResult) return steps;

    // Find tables that have foreign keys to the user table
    const relatedTables = this.schemaResult.relationships.filter(
      rel => rel.toTable === userTable.name
    );

    for (const relationship of relatedTables) {
      // Check if this is a required relationship
      if (relationship.isRequired) {
        const relatedTable = this.schemaResult.patterns.find(p => p.name === relationship.fromTable);
        if (relatedTable) {
          const step = await this.buildRelatedTableStep(relatedTable, relationship, userTable);
          if (step) {
            steps.push(step);
          }
        }
      }
    }

    return steps;
  }

  /**
   * Build a step for a related table
   */
  private async buildRelatedTableStep(
    relatedTable: TablePattern, 
    relationship: any, 
    userTable: TablePattern
  ): Promise<WorkflowStep | null> {
    const tableInfo = this.schemaResult?.tables.find(t => t.name === relatedTable.name);
    if (!tableInfo) return null;

    // Only create steps for tables we understand
    if (relatedTable.suggestedRole === 'system') return null;

    const fields: WorkflowField[] = [];

    // Add the foreign key field
    fields.push({
      name: relationship.fromColumn,
      source: 'reference',
      sourceField: 'id',
      required: true,
      validation: [
        { type: 'not_null', errorMessage: 'User reference is required' },
        { type: 'foreign_key', errorMessage: 'Must reference valid user' }
      ]
    });

    // Add other required fields for this table
    for (const column of tableInfo.columns) {
      if (!column.isNullable && !column.isPrimaryKey && column.name !== relationship.fromColumn) {
        fields.push(this.buildFieldFromColumn(column.name, column, {} as WorkflowBuilderConfig));
      }
    }

    return {
      id: `create_${relatedTable.name}_record`,
      type: 'insert_record',
      table: relatedTable.name,
      description: `Create related record in ${relatedTable.name}`,
      dependencies: ['create_user_record'],
      fields,
      conditions: [{
        type: 'relationship_exists',
        description: `Ensure ${userTable.name} record exists`
      }],
      onError: 'skip' // Related tables are usually optional
    };
  }

  /**
   * Build post-creation steps
   */
  private async buildPostCreationSteps(userTable: TablePattern): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];

    if (!this.schemaResult) return steps;

    // Find triggers that might need to be executed
    const tableInfo = this.schemaResult.tables.find(t => t.name === userTable.name);
    if (tableInfo && tableInfo.triggers.length > 0) {
      for (const trigger of tableInfo.triggers) {
        if (trigger.events.includes('INSERT')) {
          steps.push({
            id: `execute_trigger_${trigger.name}`,
            type: 'execute_trigger',
            table: userTable.name,
            description: `Execute trigger: ${trigger.name}`,
            dependencies: ['create_user_record'],
            fields: [],
            onError: 'continue' // Triggers should not fail the entire process
          });
        }
      }
    }

    return steps;
  }

  /**
   * Build rollback steps
   */
  private async buildRollbackSteps(forwardSteps: WorkflowStep[]): Promise<WorkflowStep[]> {
    const rollbackSteps: WorkflowStep[] = [];

    // Create rollback steps in reverse order
    for (let i = forwardSteps.length - 1; i >= 0; i--) {
      const step = forwardSteps[i];
      
      if (step.type === 'insert_record' && step.table) {
        rollbackSteps.push({
          id: `rollback_${step.id}`,
          type: 'conditional_action',
          table: step.table,
          description: `Rollback: Delete record from ${step.table}`,
          dependencies: [],
          fields: [],
          conditions: [{
            type: 'field_exists',
            field: 'id',
            description: 'Only delete if record was created'
          }],
          onError: 'continue' // Continue rollback even if individual steps fail
        });
      }
    }

    return rollbackSteps;
  }

  /**
   * Utility methods
   */
  private generateBasicColumnMappings(columnNames: string[]): Record<string, string[]> {
    const mappings: Record<string, string[]> = {};
    
    // Common mappings
    const commonMappings = {
      email: ['email', 'email_address', 'user_email'],
      name: ['name', 'display_name', 'full_name', 'username'],
      avatar: ['avatar_url', 'picture_url', 'profile_image_url', 'image_url'],
      bio: ['bio', 'about', 'description']
    };

    for (const [key, variants] of Object.entries(commonMappings)) {
      const found = variants.filter(variant => columnNames.includes(variant));
      if (found.length > 0) {
        mappings[key] = found;
      }
    }

    return mappings;
  }

  private generateSchemaHash(schema: SchemaIntrospectionResult): string {
    // Generate a hash of the schema structure for change detection
    const schemaString = JSON.stringify({
      tables: schema.tables.map(t => ({ name: t.name, columns: t.columns.length })),
      relationships: schema.relationships.length,
      framework: schema.framework
    });
    
    return btoa(schemaString).slice(0, 16); // Simple hash for demo
  }

  /**
   * Validate a workflow against the current schema
   */
  async validateWorkflow(workflow: UserCreationWorkflow): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if schema has changed
    const currentSchema = await this.introspector.introspectSchema();
    const currentHash = this.generateSchemaHash(currentSchema);
    
    if (workflow.metadata.schemaHash !== currentHash) {
      warnings.push('Schema has changed since workflow was created. Consider regenerating.');
    }

    // Validate each step
    for (const step of workflow.steps) {
      if (step.table) {
        const tableExists = currentSchema.tables.find(t => t.name === step.table);
        if (!tableExists) {
          errors.push(`Table ${step.table} referenced in step ${step.id} does not exist`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}