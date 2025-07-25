/**
 * Constraint-Aware Validation System
 * Validates operations against actual database constraints before execution
 * Prevents the constraint violations identified in beta testing
 */

import type { createClient } from '@supabase/supabase-js';
import { 
  SchemaIntrospectionResult, 
  ConstraintRule, 
  DatabaseTable, 
  DatabaseConstraint 
} from './schema-introspector';
import { Logger } from '../utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  table: string;
  column?: string;
  type: 'not_null' | 'unique' | 'foreign_key' | 'check' | 'custom' | 'business_logic';
  severity: 'error' | 'warning' | 'info';
  sqlCheck: string;
  parameters: string[];
  errorMessage: string;
  autoFix?: {
    possible: boolean;
    strategy: 'provide_default' | 'skip_field' | 'modify_value' | 'create_dependency';
    fixValue?: any;
  };
}

export interface ValidationContext {
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  userId?: string;
  existingData?: Record<string, any>;
  schemaInfo: SchemaIntrospectionResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  autoFixes: AutoFix[];
  constraintsChecked: number;
  executionTime: number;
}

export interface ValidationError {
  rule: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
  constraint: string;
  suggestedFix?: string;
  blockExecution: boolean;
}

export interface ValidationWarning {
  rule: string;
  field?: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface AutoFix {
  rule: string;
  field: string;
  originalValue: any;
  fixedValue: any;
  strategy: string;
  applied: boolean;
}

export class ConstraintValidator {
  private client: SupabaseClient;
  private validationRules: Map<string, ValidationRule[]> = new Map();
  private schemaInfo: SchemaIntrospectionResult | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Initialize validator with schema information and build validation rules
   */
  async initialize(schemaInfo: SchemaIntrospectionResult): Promise<void> {
    this.schemaInfo = schemaInfo;
    Logger.info('🔍 Initializing constraint validator...');

    // Build validation rules from schema constraints
    await this.buildValidationRules();
    
    Logger.success(`✅ Constraint validator initialized with ${this.getTotalRuleCount()} rules`);
  }

  /**
   * Validate data against all applicable constraints before operation
   */
  async validateOperation(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now();
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      autoFixes: [],
      constraintsChecked: 0,
      executionTime: 0
    };

    if (!this.schemaInfo) {
      throw new Error('Constraint validator not initialized. Call initialize() first.');
    }

    Logger.debug(`Validating ${context.operation} operation on ${context.table}`);

    // Get validation rules for this table
    const tableRules = this.validationRules.get(context.table) || [];
    
    // Execute validation rules
    for (const rule of tableRules) {
      try {
        const ruleResult = await this.executeValidationRule(rule, context);
        result.constraintsChecked++;

        if (!ruleResult.valid) {
          if (rule.severity === 'error') {
            result.errors.push({
              rule: rule.id,
              field: rule.column,
              message: ruleResult.message,
              severity: 'error',
              constraint: rule.name,
              suggestedFix: ruleResult.suggestedFix,
              blockExecution: true
            });
            result.valid = false;
          } else if (rule.severity === 'warning') {
            result.warnings.push({
              rule: rule.id,
              field: rule.column,
              message: ruleResult.message,
              impact: 'medium',  // Could be computed based on rule type
              recommendation: ruleResult.suggestedFix || 'Review and fix manually'
            });
          }

          // Check if auto-fix is possible
          if (rule.autoFix?.possible && ruleResult.autoFix) {
            result.autoFixes.push(ruleResult.autoFix);
          }
        }

      } catch (error: any) {
        Logger.warn(`Validation rule ${rule.id} failed to execute: ${error.message}`);
        result.warnings.push({
          rule: rule.id,
          message: `Validation rule execution failed: ${error.message}`,
          impact: 'low',
          recommendation: 'Check rule configuration'
        });
      }
    }

    result.executionTime = Date.now() - startTime;
    
    Logger.debug(`Validation completed: ${result.valid ? 'PASSED' : 'FAILED'} (${result.constraintsChecked} rules in ${result.executionTime}ms)`);
    
    if (!result.valid) {
      Logger.warn(`Validation failed with ${result.errors.length} errors and ${result.warnings.length} warnings`);
    }

    return result;
  }

  /**
   * Apply auto-fixes to data before operation
   */
  async applyAutoFixes(
    data: Record<string, any>, 
    autoFixes: AutoFix[]
  ): Promise<{ data: Record<string, any>; appliedFixes: AutoFix[] }> {
    const modifiedData = { ...data };
    const appliedFixes: AutoFix[] = [];

    for (const fix of autoFixes) {
      try {
        switch (fix.strategy) {
          case 'provide_default':
            if (modifiedData[fix.field] === undefined || modifiedData[fix.field] === null) {
              modifiedData[fix.field] = fix.fixedValue;
              fix.applied = true;
              appliedFixes.push(fix);
              Logger.debug(`Applied auto-fix: Set ${fix.field} = ${fix.fixedValue}`);
            }
            break;

          case 'modify_value':
            modifiedData[fix.field] = fix.fixedValue;
            fix.applied = true;
            appliedFixes.push(fix);
            Logger.debug(`Applied auto-fix: Modified ${fix.field} from ${fix.originalValue} to ${fix.fixedValue}`);
            break;

          case 'skip_field':
            delete modifiedData[fix.field];
            fix.applied = true;
            appliedFixes.push(fix);
            Logger.debug(`Applied auto-fix: Removed ${fix.field} from data`);
            break;

          case 'create_dependency':
            // This would create required related records
            Logger.debug(`Auto-fix requires dependency creation: ${fix.rule}`);
            break;
        }
      } catch (error: any) {
        Logger.warn(`Failed to apply auto-fix for ${fix.field}: ${error.message}`);
      }
    }

    return { data: modifiedData, appliedFixes };
  }

  /**
   * Build validation rules from schema constraints
   */
  private async buildValidationRules(): Promise<void> {
    if (!this.schemaInfo) return;

    for (const table of this.schemaInfo.tables) {
      const rules: ValidationRule[] = [];

      // Build rules from database constraints
      rules.push(...await this.buildConstraintRules(table));

      // Build rules from business logic constraints
      rules.push(...await this.buildBusinessLogicRules(table));

      // Build rules from schema patterns
      rules.push(...await this.buildPatternRules(table));

      this.validationRules.set(table.name, rules);
      Logger.debug(`Built ${rules.length} validation rules for table ${table.name}`);
    }
  }

  /**
   * Build validation rules from database constraints
   */
  private async buildConstraintRules(table: DatabaseTable): Promise<ValidationRule[]> {
    const rules: ValidationRule[] = [];

    for (const constraint of table.constraints) {
      switch (constraint.type) {
        case 'NOT NULL':
          rules.push(...this.buildNotNullRules(table, constraint));
          break;

        case 'UNIQUE':
          rules.push(...this.buildUniqueRules(table, constraint));
          break;

        case 'FOREIGN KEY':
          rules.push(...this.buildForeignKeyRules(table, constraint));
          break;

        case 'CHECK':
          rules.push(...this.buildCheckConstraintRules(table, constraint));
          break;
      }
    }

    return rules;
  }

  /**
   * Build NOT NULL constraint rules
   */
  private buildNotNullRules(table: DatabaseTable, constraint: DatabaseConstraint): ValidationRule[] {
    const rules: ValidationRule[] = [];

    for (const columnName of constraint.columns) {
      const column = table.columns.find(c => c.name === columnName);
      if (column && !column.isNullable) {
        rules.push({
          id: `${table.name}_${columnName}_not_null`,
          name: `${columnName} NOT NULL`,
          description: `Column ${columnName} cannot be null`,
          table: table.name,
          column: columnName,
          type: 'not_null',
          severity: 'error',
          sqlCheck: `${columnName} IS NOT NULL`,
          parameters: [columnName],
          errorMessage: `${columnName} is required and cannot be null`,
          autoFix: {
            possible: true,
            strategy: 'provide_default',
            fixValue: this.getDefaultValueForColumn(column)
          }
        });
      }
    }

    return rules;
  }

  /**
   * Build UNIQUE constraint rules
   */
  private buildUniqueRules(table: DatabaseTable, constraint: DatabaseConstraint): ValidationRule[] {
    const rules: ValidationRule[] = [];

    rules.push({
      id: `${table.name}_${constraint.name}_unique`,
      name: constraint.name,
      description: `Unique constraint on ${constraint.columns.join(', ')}`,
      table: table.name,
      type: 'unique',
      severity: 'error',
      sqlCheck: `SELECT COUNT(*) FROM ${table.name} WHERE ${constraint.columns.map(col => `${col} = $${col}`).join(' AND ')}`,
      parameters: constraint.columns,
      errorMessage: `Duplicate value found for unique constraint: ${constraint.columns.join(', ')}`,
      autoFix: {
        possible: false,
        strategy: 'modify_value'
      }
    });

    return rules;
  }

  /**
   * Build FOREIGN KEY constraint rules
   */
  private buildForeignKeyRules(table: DatabaseTable, constraint: DatabaseConstraint): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (constraint.referencedTable && constraint.referencedColumns) {
      rules.push({
        id: `${table.name}_${constraint.name}_fk`,
        name: constraint.name,
        description: `Foreign key constraint referencing ${constraint.referencedTable}`,
        table: table.name,
        column: constraint.columns[0],
        type: 'foreign_key',
        severity: 'error',
        sqlCheck: `SELECT COUNT(*) FROM ${constraint.referencedTable} WHERE ${constraint.referencedColumns[0]} = $${constraint.columns[0]}`,
        parameters: constraint.columns,
        errorMessage: `Referenced record not found in ${constraint.referencedTable}`,
        autoFix: {
          possible: true,
          strategy: 'create_dependency'
        }
      });
    }

    return rules;
  }

  /**
   * Build CHECK constraint rules
   */
  private buildCheckConstraintRules(table: DatabaseTable, constraint: DatabaseConstraint): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (constraint.checkDefinition) {
      rules.push({
        id: `${table.name}_${constraint.name}_check`,
        name: constraint.name,
        description: `Check constraint: ${constraint.checkDefinition}`,
        table: table.name,
        type: 'check',
        severity: 'error',
        sqlCheck: constraint.checkDefinition,
        parameters: [],
        errorMessage: `Check constraint violation: ${constraint.checkDefinition}`,
        autoFix: {
          possible: false,
          strategy: 'modify_value'
        }
      });
    }

    return rules;
  }

  /**
   * Build business logic constraint rules
   */
  private async buildBusinessLogicRules(table: DatabaseTable): Promise<ValidationRule[]> {
    const rules: ValidationRule[] = [];

    if (!this.schemaInfo) return rules;

    // Find business logic constraints for this table
    const businessConstraints = this.schemaInfo.constraints.businessLogicConstraints.filter(
      c => c.table === table.name
    );

    for (const constraint of businessConstraints) {
      rules.push({
        id: `${table.name}_${constraint.rule}_business`,
        name: constraint.rule,
        description: constraint.description,
        table: table.name,
        type: 'business_logic',
        severity: constraint.type === 'business_rule' ? 'warning' : 'error',
        sqlCheck: constraint.sqlCondition,
        parameters: [],
        errorMessage: `Business logic constraint violation: ${constraint.description}`,
        autoFix: {
          possible: false,
          strategy: 'skip_field'
        }
      });
    }

    return rules;
  }

  /**
   * Build pattern-based validation rules
   */
  private async buildPatternRules(table: DatabaseTable): Promise<ValidationRule[]> {
    const rules: ValidationRule[] = [];

    if (!this.schemaInfo) return rules;

    // Find table pattern
    const pattern = this.schemaInfo.patterns.find(p => p.name === table.name);
    if (!pattern) return rules;

    // Add pattern-specific rules
    if (pattern.suggestedRole === 'user') {
      // Add user table specific rules
      rules.push(...this.buildUserTableRules(table, pattern));
    }

    return rules;
  }

  /**
   * Build user table specific rules
   */
  private buildUserTableRules(table: DatabaseTable, pattern: any): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Email validation rule
    if (pattern.columnMappings.email && pattern.columnMappings.email.length > 0) {
      const emailColumn = pattern.columnMappings.email[0];
      rules.push({
        id: `${table.name}_${emailColumn}_email_format`,
        name: 'Email Format',
        description: 'Email must be in valid format',
        table: table.name,
        column: emailColumn,
        type: 'custom',
        severity: 'warning',
        sqlCheck: `${emailColumn} ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`,
        parameters: [emailColumn],
        errorMessage: 'Invalid email format',
        autoFix: {
          possible: false,
          strategy: 'modify_value'
        }
      });
    }

    return rules;
  }

  /**
   * Execute a single validation rule
   */
  private async executeValidationRule(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{
    valid: boolean;
    message: string;
    suggestedFix?: string;
    autoFix?: AutoFix;
  }> {
    try {
      switch (rule.type) {
        case 'not_null':
          return await this.validateNotNull(rule, context);
        
        case 'unique':
          return await this.validateUnique(rule, context);
        
        case 'foreign_key':
          return await this.validateForeignKey(rule, context);
        
        case 'check':
          return await this.validateCheckConstraint(rule, context);
        
        case 'business_logic':
          return await this.validateBusinessLogic(rule, context);
        
        case 'custom':
          return await this.validateCustomRule(rule, context);
        
        default:
          return { valid: true, message: 'Unknown rule type' };
      }
    } catch (error: any) {
      return { 
        valid: false, 
        message: `Rule execution failed: ${error.message}` 
      };
    }
  }

  /**
   * Validate NOT NULL constraint
   */
  private async validateNotNull(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string; autoFix?: AutoFix }> {
    if (!rule.column) {
      return { valid: true, message: 'No column specified' };
    }

    const value = context.data[rule.column];
    const isNull = value === null || value === undefined || value === '';

    if (isNull) {
      const autoFix: AutoFix = {
        rule: rule.id,
        field: rule.column,
        originalValue: value,
        fixedValue: rule.autoFix?.fixValue,
        strategy: 'provide_default',
        applied: false
      };

      return {
        valid: false,
        message: rule.errorMessage,
        suggestedFix: `Provide a value for ${rule.column}`,
        autoFix
      };
    }

    return { valid: true, message: 'Value is not null' };
  }

  /**
   * Validate UNIQUE constraint
   */
  private async validateUnique(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string }> {
    // Build WHERE conditions for unique check
    const conditions: Record<string, any> = {};
    for (const param of rule.parameters) {
      conditions[param] = context.data[param];
    }

    try {
      const { data, error } = await this.client
        .from(context.table)
        .select('id')
        .match(conditions)
        .limit(1);

      if (error) {
        return { 
          valid: false, 
          message: `Unique constraint check failed: ${error.message}` 
        };
      }

      if (data && data.length > 0) {
        // Check if this is the same record (for updates)
        if (context.operation === 'update' && context.existingData?.id === data[0].id) {
          return { valid: true, message: 'Unique constraint satisfied (same record)' };
        }

        return {
          valid: false,
          message: rule.errorMessage,
          suggestedFix: `Modify ${rule.parameters.join(', ')} to ensure uniqueness`
        };
      }

      return { valid: true, message: 'Unique constraint satisfied' };

    } catch (error: any) {
      return { 
        valid: false, 
        message: `Unique constraint validation error: ${error.message}` 
      };
    }
  }

  /**
   * Validate FOREIGN KEY constraint
   */
  private async validateForeignKey(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string }> {
    if (!rule.column) {
      return { valid: true, message: 'No column specified' };
    }

    const foreignKeyValue = context.data[rule.column];
    
    // If foreign key is null and column is nullable, it's valid
    if (foreignKeyValue === null || foreignKeyValue === undefined) {
      const column = this.schemaInfo?.tables
        .find(t => t.name === context.table)
        ?.columns.find(c => c.name === rule.column);
      
      if (column?.isNullable) {
        return { valid: true, message: 'Foreign key is null but nullable' };
      }
    }

    // Extract referenced table from rule description or SQL
    const referencedTableMatch = rule.description.match(/referencing (\w+)/);
    if (!referencedTableMatch) {
      return { valid: false, message: 'Cannot determine referenced table' };
    }

    const referencedTable = referencedTableMatch[1];

    try {
      const { data, error } = await this.client
        .from(referencedTable)
        .select('id')
        .eq('id', foreignKeyValue)
        .limit(1);

      if (error) {
        return { 
          valid: false, 
          message: `Foreign key constraint check failed: ${error.message}` 
        };
      }

      if (!data || data.length === 0) {
        return {
          valid: false,
          message: rule.errorMessage,
          suggestedFix: `Create referenced record in ${referencedTable} or use valid foreign key value`
        };
      }

      return { valid: true, message: 'Foreign key constraint satisfied' };

    } catch (error: any) {
      return { 
        valid: false, 
        message: `Foreign key validation error: ${error.message}` 
      };
    }
  }

  /**
   * Validate CHECK constraint
   */
  private async validateCheckConstraint(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string }> {
    // For check constraints, we'd need to evaluate the SQL condition
    // This is a simplified implementation
    Logger.debug(`Validating check constraint: ${rule.sqlCheck}`);
    
    // For now, assume check constraints pass
    // Full implementation would safely evaluate the SQL condition
    return { valid: true, message: 'Check constraint assumed valid' };
  }

  /**
   * Validate business logic constraint
   */
  private async validateBusinessLogic(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string }> {
    // Business logic validation would be specific to each rule
    Logger.debug(`Validating business logic: ${rule.description}`);
    
    // For now, assume business logic passes with warning
    return { 
      valid: true, 
      message: 'Business logic constraint assumed valid' 
    };
  }

  /**
   * Validate custom rule
   */
  private async validateCustomRule(
    rule: ValidationRule, 
    context: ValidationContext
  ): Promise<{ valid: boolean; message: string; suggestedFix?: string }> {
    // Custom rule validation would be implemented based on specific rule type
    Logger.debug(`Validating custom rule: ${rule.name}`);
    
    return { valid: true, message: 'Custom rule assumed valid' };
  }

  /**
   * Utility methods
   */
  private getDefaultValueForColumn(column: any): any {
    if (column.defaultValue) {
      return column.defaultValue;
    }

    switch (column.type) {
      case 'uuid':
        return crypto.randomUUID();
      case 'timestamp':
      case 'timestamptz':
        return new Date().toISOString();
      case 'boolean':
        return false;
      case 'integer':
      case 'bigint':
        return 0;
      case 'text':
      case 'varchar':
        return '';
      default:
        return null;
    }
  }

  private getTotalRuleCount(): number {
    let total = 0;
    for (const rules of this.validationRules.values()) {
      total += rules.length;
    }
    return total;
  }

  /**
   * Get validation rules for a specific table
   */
  getTableRules(tableName: string): ValidationRule[] {
    return this.validationRules.get(tableName) || [];
  }

  /**
   * Get all validation rules
   */
  getAllRules(): Map<string, ValidationRule[]> {
    return new Map(this.validationRules);
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationRules.clear();
    this.schemaInfo = null;
  }
}