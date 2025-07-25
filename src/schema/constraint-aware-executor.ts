/**
 * Constraint-Aware Workflow Execution Engine
 * Pre-validates and executes database operations based on discovered constraints
 * Part of supa-seed v2.2.0 constraint-aware architecture
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { 
  ConstraintDiscoveryEngine, 
  type ConstraintMetadata, 
  type BusinessRule,
  type AutoFixSuggestion 
} from './constraint-discovery-engine';

type SupabaseClient = ReturnType<typeof createClient>;

export interface WorkflowStep {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'validate' | 'skip';
  required: boolean;
  conditions?: ConstraintCondition[];
  fields: FieldMapping[];
  onError: ErrorAction;
  dependencies?: string[];
  autoFixes?: AutoFixSuggestion[];
}

export interface ConstraintCondition {
  type: 'exists' | 'equals' | 'custom' | 'business_rule';
  table?: string;
  field?: string;
  value?: any;
  customSQL?: string;
  businessRuleId?: string;
  description: string;
}

export interface FieldMapping {
  name: string;
  source: string; // 'input.field', 'generated.value', 'dependency.table.field'
  value?: any;
  required?: boolean;
  validator?: string;
}

export interface ErrorAction {
  type: 'fail' | 'skip' | 'retry' | 'auto_fix';
  maxRetries?: number;
  fallbackValue?: any;
  customHandler?: string;
}

export interface WorkflowConfiguration {
  version: '2.2.0';
  strategy: 'constraint-aware' | 'schema-first' | 'legacy';
  workflows: {
    userCreation: UserCreationWorkflow;
    dataSeeding?: DataSeedingWorkflow;
    cleanup?: CleanupWorkflow;
  };
  constraints: {
    discovery: ConstraintDiscoveryConfig;
    validation: ConstraintValidationConfig;
    handling: ConstraintHandlingConfig;
  };
}

export interface UserCreationWorkflow {
  steps: WorkflowStep[];
  errorHandling: ErrorHandlingStrategy;
  rollback: RollbackStrategy;
  validation: ValidationStrategy;
}

export interface DataSeedingWorkflow {
  steps: WorkflowStep[];
  parallelExecution: boolean;
  batchSize: number;
}

export interface CleanupWorkflow {
  steps: WorkflowStep[];
  cascading: boolean;
}

export interface ConstraintDiscoveryConfig {
  enabled: boolean;
  analyzeTriggers: boolean;
  parseFunctions: boolean;
  buildDependencyGraph: boolean;
  cacheResults: boolean;
}

export interface ConstraintValidationConfig {
  preValidation: boolean;
  continueOnWarnings: boolean;
  stopOnErrors: boolean;
  validateDependencies: boolean;
}

export interface ConstraintHandlingConfig {
  autoFix: boolean;
  suggestFixes: boolean;
  skipInvalidOperations: boolean;
  createDependenciesOnDemand: boolean;
}

export interface ErrorHandlingStrategy {
  type: 'fail_fast' | 'graceful_degradation' | 'best_effort';
  maxFailures: number;
  failureThreshold: number;
}

export interface RollbackStrategy {
  enabled: boolean;
  onCriticalFailure: boolean;
  preserveSuccessfulSteps: boolean;
}

export interface ValidationStrategy {
  preExecution: boolean;
  postExecution: boolean;
  dependencyValidation: boolean;
}

export interface ExecutionContext {
  inputData: Record<string, any>;
  generatedData: Record<string, any>;
  stepResults: Record<string, StepResult>;
  constraints: ConstraintMetadata;
  currentStep: number;
  totalSteps: number;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  data?: any;
  error?: string;
  warnings: string[];
  constraintViolations: ConstraintViolation[];
  autoFixesApplied: AutoFixApplied[];
  duration: number;
  rollbackData?: any;
}

export interface ConstraintViolation {
  rule: BusinessRule;
  violationType: 'validation' | 'dependency' | 'business_logic';
  message: string;
  suggestedFix?: AutoFixSuggestion;
  canAutoFix: boolean;
}

export interface AutoFixApplied {
  originalViolation: ConstraintViolation;
  fixApplied: AutoFixSuggestion;
  success: boolean;
  resultingValue?: any;
}

export interface ExecutionResult {
  success: boolean;
  stepsExecuted: StepResult[];
  stepsSkipped: SkippedStep[];
  constraintViolations: ConstraintViolation[];
  autoFixesApplied: AutoFixApplied[];
  rollbackActions?: RollbackAction[];
  executionSummary: ExecutionSummary;
}

export interface SkippedStep {
  stepId: string;
  reason: string;
  constraintViolations: ConstraintViolation[];
}

export interface RollbackAction {
  stepId: string;
  action: 'delete' | 'update' | 'custom';
  table: string;
  data: any;
  completed: boolean;
}

export interface ExecutionSummary {
  totalSteps: number;
  successfulSteps: number;
  skippedSteps: number;
  failedSteps: number;
  constraintViolationsFound: number;
  autoFixesApplied: number;
  duration: number;
}

export class ConstraintAwareExecutor {
  private client: SupabaseClient;
  private constraintEngine: ConstraintDiscoveryEngine;
  private constraints: ConstraintMetadata | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
  }

  /**
   * Execute a workflow with full constraint awareness
   */
  async executeWorkflow(
    workflow: UserCreationWorkflow, 
    inputData: Record<string, any>
  ): Promise<ExecutionResult> {
    Logger.info('🚀 Starting constraint-aware workflow execution...');
    const startTime = Date.now();

    // Initialize execution context
    const context: ExecutionContext = {
      inputData,
      generatedData: {},
      stepResults: {},
      constraints: await this.getOrDiscoverConstraints(workflow),
      currentStep: 0,
      totalSteps: workflow.steps.length
    };

    const result: ExecutionResult = {
      success: false,
      stepsExecuted: [],
      stepsSkipped: [],
      constraintViolations: [],
      autoFixesApplied: [],
      executionSummary: {
        totalSteps: workflow.steps.length,
        successfulSteps: 0,
        skippedSteps: 0,
        failedSteps: 0,
        constraintViolationsFound: 0,
        autoFixesApplied: 0,
        duration: 0
      }
    };

    try {
      // Pre-execution validation if enabled
      if (workflow.validation.preExecution) {
        await this.preValidateWorkflow(workflow, context);
      }

      // Execute each step with constraint validation
      for (const step of workflow.steps) {
        context.currentStep++;
        
        Logger.debug(`Executing step ${context.currentStep}/${context.totalSteps}: ${step.id}`);

        const stepResult = await this.executeStep(step, context);
        
        if (stepResult.success) {
          result.stepsExecuted.push(stepResult);
          result.executionSummary.successfulSteps++;
          context.stepResults[step.id] = stepResult;
        } else {
          if (step.required && workflow.errorHandling.type === 'fail_fast') {
            Logger.error(`Required step ${step.id} failed, stopping execution`);
            result.executionSummary.failedSteps++;
            break;
          } else if (stepResult.constraintViolations.length > 0) {
            result.stepsSkipped.push({
              stepId: step.id,
              reason: 'Constraint violations detected',
              constraintViolations: stepResult.constraintViolations
            });
            result.executionSummary.skippedSteps++;
          } else {
            result.executionSummary.failedSteps++;
          }
        }

        // Collect violations and auto-fixes
        result.constraintViolations.push(...stepResult.constraintViolations);
        result.autoFixesApplied.push(...stepResult.autoFixesApplied);
      }

      // Post-execution validation if enabled
      if (workflow.validation.postExecution) {
        await this.postValidateWorkflow(workflow, context, result);
      }

      // Determine overall success
      result.success = result.executionSummary.failedSteps === 0 && 
                      result.executionSummary.successfulSteps > 0;

      const duration = Date.now() - startTime;
      result.executionSummary.duration = duration;
      result.executionSummary.constraintViolationsFound = result.constraintViolations.length;
      result.executionSummary.autoFixesApplied = result.autoFixesApplied.length;

      Logger.success(`✅ Workflow execution completed in ${duration}ms`);
      this.logExecutionSummary(result.executionSummary);

    } catch (error: any) {
      Logger.error('Workflow execution failed:', error);
      
      // Attempt rollback if enabled
      if (workflow.rollback.enabled) {
        await this.rollbackSteps(result.stepsExecuted, workflow.rollback);
      }

      throw error;
    }

    return result;
  }

  /**
   * Execute a single workflow step with constraint validation
   */
  async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const startTime = Date.now();
    const stepResult: StepResult = {
      stepId: step.id,
      success: false,
      warnings: [],
      constraintViolations: [],
      autoFixesApplied: [],
      duration: 0
    };

    try {
      // Step 1: Validate step conditions
      const conditionValidation = await this.validateStepConditions(step, context);
      if (!conditionValidation.valid) {
        stepResult.constraintViolations.push(...conditionValidation.violations);
        
        // Attempt auto-fixes if enabled
        if (step.autoFixes && step.autoFixes.length > 0) {
          const autoFixResults = await this.applyAutoFixes(conditionValidation.violations, step, context);
          stepResult.autoFixesApplied.push(...autoFixResults);
          
          // Re-validate after auto-fixes
          const revalidation = await this.validateStepConditions(step, context);
          if (!revalidation.valid) {
            Logger.warn(`Step ${step.id} still invalid after auto-fixes`);
            stepResult.success = false;
            stepResult.duration = Date.now() - startTime;
            return stepResult;
          }
        } else {
          Logger.warn(`Step ${step.id} failed validation, no auto-fixes available`);
          stepResult.success = false;
          stepResult.duration = Date.now() - startTime;
          return stepResult;
        }
      }

      // Step 2: Execute the actual database operation
      switch (step.operation) {
        case 'insert':
          stepResult.data = await this.executeInsert(step, context);
          break;
        case 'update':
          stepResult.data = await this.executeUpdate(step, context);
          break;
        case 'validate':
          stepResult.data = await this.executeValidation(step, context);
          break;
        case 'skip':
          Logger.info(`Step ${step.id} explicitly skipped`);
          stepResult.data = { skipped: true };
          break;
        default:
          throw new Error(`Unknown operation: ${step.operation}`);
      }

      stepResult.success = true;
      Logger.debug(`✅ Step ${step.id} completed successfully`);

    } catch (error: any) {
      Logger.error(`Step ${step.id} failed:`, error);
      stepResult.error = error.message;
      
      // Handle error based on step configuration
      await this.handleStepError(step, context, error, stepResult);
    }

    stepResult.duration = Date.now() - startTime;
    return stepResult;
  }

  /**
   * Validate step conditions against discovered constraints
   */
  async validateStepConditions(
    step: WorkflowStep, 
    context: ExecutionContext
  ): Promise<{ valid: boolean; violations: ConstraintViolation[] }> {
    const violations: ConstraintViolation[] = [];

    if (!step.conditions || step.conditions.length === 0) {
      return { valid: true, violations: [] };
    }

    for (const condition of step.conditions) {
      const violation = await this.validateCondition(condition, step, context);
      if (violation) {
        violations.push(violation);
      }
    }

    return {
      valid: violations.length === 0,
      violations
    };
  }

  /**
   * Validate a single condition
   */
  private async validateCondition(
    condition: ConstraintCondition,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<ConstraintViolation | null> {
    try {
      switch (condition.type) {
        case 'exists':
          return await this.validateExistsCondition(condition, step, context);
        case 'equals':
          return await this.validateEqualsCondition(condition, step, context);
        case 'custom':
          return await this.validateCustomCondition(condition, step, context);
        case 'business_rule':
          return await this.validateBusinessRuleCondition(condition, step, context);
        default:
          Logger.warn(`Unknown condition type: ${condition.type}`);
          return null;
      }
    } catch (error: any) {
      Logger.error(`Condition validation failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate EXISTS condition
   */
  private async validateExistsCondition(
    condition: ConstraintCondition,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<ConstraintViolation | null> {
    if (!condition.table || !condition.field) {
      return null;
    }

    const { data, error } = await this.client
      .from(condition.table)
      .select('id')
      .eq(condition.field, condition.value)
      .limit(1);

    if (error) {
      Logger.warn(`EXISTS validation error: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      const businessRule = context.constraints.businessRules.find(r => 
        r.table === condition.table && 
        r.condition.includes(condition.field!)
      );

      return {
        rule: businessRule || this.createDummyRule(condition, step),
        violationType: 'dependency',
        message: `Required dependency not found: ${condition.table}.${condition.field} = ${condition.value}`,
        suggestedFix: businessRule?.autoFix,
        canAutoFix: businessRule?.autoFix !== undefined
      };
    }

    return null;
  }

  /**
   * Validate EQUALS condition
   */
  private async validateEqualsCondition(
    condition: ConstraintCondition,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<ConstraintViolation | null> {
    // This would check that a field equals a specific value
    // Implementation depends on the specific condition structure
    return null;
  }

  /**
   * Validate custom SQL condition
   */
  private async validateCustomCondition(
    condition: ConstraintCondition,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<ConstraintViolation | null> {
    if (!condition.customSQL) {
      return null;
    }

    try {
      const { data, error } = await this.client.rpc('exec_sql', {
        sql: condition.customSQL,
        params: []
      });

      if (error) {
        Logger.warn(`Custom SQL validation error: ${error.message}`);
        return null;
      }

      // Assume custom SQL returns boolean or count
      const result = data && Array.isArray(data) && data.length > 0 ? data[0] : false;
      
      if (!result) {
        return {
          rule: this.createDummyRule(condition, step),
          violationType: 'validation',
          message: condition.description || 'Custom validation failed',
          canAutoFix: false
        };
      }

    } catch (error: any) {
      Logger.warn(`Custom SQL execution failed: ${error.message}`);
      return null;
    }

    return null;
  }

  /**
   * Validate business rule condition
   */
  private async validateBusinessRuleCondition(
    condition: ConstraintCondition,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<ConstraintViolation | null> {
    if (!condition.businessRuleId) {
      return null;
    }

    const businessRule = context.constraints.businessRules.find(r => r.id === condition.businessRuleId);
    if (!businessRule) {
      return null;
    }

    // Validate the business rule based on its type and condition
    const isValid = await this.validateBusinessRule(businessRule, step, context);
    
    if (!isValid) {
      return {
        rule: businessRule,
        violationType: 'business_logic',
        message: businessRule.errorMessage || `Business rule violation: ${businessRule.condition}`,
        suggestedFix: businessRule.autoFix,
        canAutoFix: businessRule.autoFix !== undefined
      };
    }

    return null;
  }

  /**
   * Validate a business rule
   */
  private async validateBusinessRule(
    rule: BusinessRule,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<boolean> {
    // This would implement the actual business rule validation logic
    // For now, return true (would be implemented based on rule.sqlPattern)
    return true;
  }

  /**
   * Apply auto-fixes for constraint violations
   */
  private async applyAutoFixes(
    violations: ConstraintViolation[],
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<AutoFixApplied[]> {
    const appliedFixes: AutoFixApplied[] = [];

    for (const violation of violations) {
      if (violation.canAutoFix && violation.suggestedFix) {
        try {
          const success = await this.applyAutoFix(violation.suggestedFix, step, context);
          appliedFixes.push({
            originalViolation: violation,
            fixApplied: violation.suggestedFix,
            success
          });
        } catch (error: any) {
          Logger.warn(`Auto-fix failed for ${violation.rule.name}: ${error.message}`);
          appliedFixes.push({
            originalViolation: violation,
            fixApplied: violation.suggestedFix,
            success: false
          });
        }
      }
    }

    return appliedFixes;
  }

  /**
   * Apply a single auto-fix
   */
  private async applyAutoFix(
    fix: AutoFixSuggestion,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<boolean> {
    switch (fix.type) {
      case 'set_field':
        return await this.applySetFieldFix(fix, step, context);
      case 'create_dependency':
        return await this.applyCreateDependencyFix(fix, step, context);
      case 'skip_operation':
        return await this.applySkipOperationFix(fix, step, context);
      case 'modify_workflow':
        return await this.applyModifyWorkflowFix(fix, step, context);
      default:
        Logger.warn(`Unknown auto-fix type: ${fix.type}`);
        return false;
    }
  }

  /**
   * Apply set field auto-fix
   */
  private async applySetFieldFix(
    fix: AutoFixSuggestion,
    step: WorkflowStep,
    context: ExecutionContext
  ): Promise<boolean> {
    if (!fix.action.field || !fix.action.table) {
      return false;
    }

    // Update the step's field mappings to include the fix
    const fieldMapping = step.fields.find(f => f.name === fix.action.field);
    if (fieldMapping) {
      fieldMapping.value = fix.action.value;
    } else {
      step.fields.push({
        name: fix.action.field,
        source: 'auto_fix',
        value: fix.action.value,
        required: true
      });
    }

    Logger.info(`✅ Applied set_field fix: ${fix.action.field} = ${fix.action.value}`);
    return true;
  }

  /**
   * Execute database operations
   */
  private async executeInsert(step: WorkflowStep, context: ExecutionContext): Promise<any> {
    const insertData = this.buildInsertData(step, context);
    
    const { data, error } = await this.client
      .from(step.table)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    // Store rollback data
    if (data) {
      context.stepResults[step.id] = {
        ...context.stepResults[step.id],
        rollbackData: { operation: 'delete', table: step.table, id: data.id }
      };
    }

    return data;
  }

  /**
   * Build insert data from field mappings
   */
  private buildInsertData(step: WorkflowStep, context: ExecutionContext): Record<string, any> {
    const data: Record<string, any> = {};

    for (const field of step.fields) {
      let value = field.value;

      if (field.source.startsWith('input.')) {
        const inputField = field.source.replace('input.', '');
        value = context.inputData[inputField];
      } else if (field.source.startsWith('generated.')) {
        const generatedField = field.source.replace('generated.', '');
        value = context.generatedData[generatedField] || this.generateValue(generatedField);
      } else if (field.source.includes('.')) {
        // Reference to another step's result
        value = this.resolveStepReference(field.source, context);
      }

      if (value !== undefined) {
        data[field.name] = value;
      }
    }

    return data;
  }

  /**
   * Utility methods
   */
  private async getOrDiscoverConstraints(workflow: UserCreationWorkflow): Promise<ConstraintMetadata> {
    if (this.constraints) {
      return this.constraints;
    }

    // Extract table names from workflow steps
    const tableNames = [...new Set(workflow.steps.map(step => step.table))];
    this.constraints = await this.constraintEngine.discoverConstraints(tableNames);
    return this.constraints;
  }

  private createDummyRule(condition: ConstraintCondition, step: WorkflowStep): BusinessRule {
    return {
      id: `dummy_${step.id}_${Date.now()}`,
      name: 'Generated Rule',
      type: 'validation',
      table: step.table,
      condition: condition.description,
      action: 'deny',
      confidence: 0.5,
      sqlPattern: condition.customSQL || '',
      dependencies: []
    };
  }

  private generateValue(field: string): any {
    // Generate default values for common fields
    switch (field) {
      case 'id': return crypto.randomUUID();
      case 'created_at': return new Date().toISOString();
      case 'updated_at': return new Date().toISOString();
      default: return null;
    }
  }

  private resolveStepReference(source: string, context: ExecutionContext): any {
    // Parse references like "create_user.id" or "auth_user.id"
    const [stepId, field] = source.split('.');
    const stepResult = context.stepResults[stepId];
    return stepResult?.data?.[field];
  }

  private logExecutionSummary(summary: ExecutionSummary): void {
    Logger.info('📊 Execution Summary:');
    Logger.info(`   Total steps: ${summary.totalSteps}`);
    Logger.info(`   Successful: ${summary.successfulSteps}`);
    Logger.info(`   Skipped: ${summary.skippedSteps}`);
    Logger.info(`   Failed: ${summary.failedSteps}`);
    Logger.info(`   Constraint violations: ${summary.constraintViolationsFound}`);
    Logger.info(`   Auto-fixes applied: ${summary.autoFixesApplied}`);
    Logger.info(`   Duration: ${summary.duration}ms`);
  }

  // Placeholder methods for remaining operations
  private async executeUpdate(step: WorkflowStep, context: ExecutionContext): Promise<any> { return {}; }
  private async executeValidation(step: WorkflowStep, context: ExecutionContext): Promise<any> { return {}; }
  private async handleStepError(step: WorkflowStep, context: ExecutionContext, error: any, stepResult: StepResult): Promise<void> {}
  private async preValidateWorkflow(workflow: UserCreationWorkflow, context: ExecutionContext): Promise<void> {}
  private async postValidateWorkflow(workflow: UserCreationWorkflow, context: ExecutionContext, result: ExecutionResult): Promise<void> {}
  private async rollbackSteps(steps: StepResult[], rollbackStrategy: RollbackStrategy): Promise<void> {}
  private async applyCreateDependencyFix(fix: AutoFixSuggestion, step: WorkflowStep, context: ExecutionContext): Promise<boolean> { return false; }
  private async applySkipOperationFix(fix: AutoFixSuggestion, step: WorkflowStep, context: ExecutionContext): Promise<boolean> { return false; }
  private async applyModifyWorkflowFix(fix: AutoFixSuggestion, step: WorkflowStep, context: ExecutionContext): Promise<boolean> { return false; }
}