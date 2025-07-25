/**
 * Configurable Workflow Execution Engine
 * Executes dynamically generated workflows with constraint validation and error handling
 * Replaces hardcoded business logic with configurable execution patterns
 */

import type { createClient } from '@supabase/supabase-js';
import { faker } from '@faker-js/faker';
import { 
  UserCreationWorkflow, 
  WorkflowStep, 
  WorkflowField, 
  WorkflowCondition 
} from './workflow-builder';
import { Logger } from '../utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface WorkflowExecutionContext {
  client: SupabaseClient;
  userId?: string;
  userData: Record<string, any>;
  stepResults: Map<string, any>;
  rollbackData: Map<string, any>;
  executionId: string;
  startTime: Date;
}

export interface WorkflowExecutionResult {
  success: boolean;
  userId?: string;
  executionId: string;
  duration: number;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
  rollbackRequired: boolean;
  rollbackCompleted: boolean;
  stepResults: Record<string, any>;
}

export interface ExecutionConfig {
  enableRollback: boolean;
  enableConstraintValidation: boolean;
  continueOnError: boolean;
  maxRetries: number;
  timeoutMs: number;
  generateMissingFields: boolean;
}

export class WorkflowExecutor {
  private client: SupabaseClient;
  private config: ExecutionConfig;

  constructor(client: SupabaseClient, config: ExecutionConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Execute a complete user creation workflow
   */
  async executeWorkflow(
    workflow: UserCreationWorkflow, 
    userData: Record<string, any>
  ): Promise<WorkflowExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = new Date();

    Logger.info(`🚀 Executing workflow: ${workflow.name} (${executionId})`);

    const context: WorkflowExecutionContext = {
      client: this.client,
      userData,
      stepResults: new Map(),
      rollbackData: new Map(),
      executionId,
      startTime
    };

    const result: WorkflowExecutionResult = {
      success: false,
      executionId,
      duration: 0,
      completedSteps: [],
      rollbackRequired: false,
      rollbackCompleted: false,
      stepResults: {}
    };

    try {
      // Execute workflow steps in dependency order
      const executionOrder = this.calculateExecutionOrder(workflow.steps);
      
      for (const stepId of executionOrder) {
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) {
          throw new Error(`Step ${stepId} not found in workflow`);
        }

        Logger.debug(`Executing step: ${step.description}`);

        const stepResult = await this.executeStep(step, context);
        
        if (!stepResult.success) {
          result.failedStep = step.id;
          result.error = stepResult.error;
          
          if (step.onError === 'fail') {
            result.rollbackRequired = this.config.enableRollback;
            break;
          } else if (step.onError === 'skip') {
            Logger.warn(`Skipping failed step: ${step.description}`);
            continue;
          } else if (step.onError === 'retry' && step.retryCount) {
            // Implement retry logic
            const retryResult = await this.retryStep(step, context, step.retryCount);
            if (!retryResult.success) {
              result.failedStep = step.id;
              result.error = retryResult.error;
              break;
            }
            stepResult.success = true;
            stepResult.data = retryResult.data;
          }
        }

        // Store step result
        context.stepResults.set(step.id, stepResult.data);
        result.completedSteps.push(step.id);

        // Special handling for auth user creation
        if (step.type === 'create_auth_user' && stepResult.data?.userId) {
          context.userId = stepResult.data.userId;
          result.userId = stepResult.data.userId;
        }
      }

      // If we completed all steps, mark as successful
      if (result.completedSteps.length === workflow.steps.length) {
        result.success = true;
        Logger.success(`✅ Workflow completed successfully: ${workflow.name}`);
      }

    } catch (error: any) {
      Logger.error(`Workflow execution failed: ${error.message}`);
      result.error = error.message;
      result.rollbackRequired = this.config.enableRollback;
    }

    // Execute rollback if needed
    if (result.rollbackRequired && workflow.rollbackSteps.length > 0) {
      Logger.info('🔄 Executing rollback steps...');
      result.rollbackCompleted = await this.executeRollback(workflow.rollbackSteps, context);
    }

    // Calculate execution duration
    result.duration = Date.now() - startTime.getTime();
    
    // Convert step results to plain object
    result.stepResults = Object.fromEntries(context.stepResults);

    Logger.info(`Workflow execution completed in ${result.duration}ms`);
    return result;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Check step conditions first
      if (step.conditions && step.conditions.length > 0) {
        const conditionsValid = await this.validateConditions(step.conditions, context);
        if (!conditionsValid) {
          return { 
            success: false, 
            error: `Step conditions not met: ${step.description}` 
          };
        }
      }

      // Execute based on step type
      switch (step.type) {
        case 'create_auth_user':
          return await this.executeCreateAuthUser(step, context);
        
        case 'insert_record':
          return await this.executeInsertRecord(step, context);
        
        case 'validate_constraint':
          return await this.executeValidateConstraint(step, context);
        
        case 'execute_trigger':
          return await this.executeExecuteTrigger(step, context);
        
        case 'conditional_action':
          return await this.executeConditionalAction(step, context);
        
        default:
          return { 
            success: false, 
            error: `Unknown step type: ${step.type}` 
          };
      }

    } catch (error: any) {
      Logger.error(`Step execution failed: ${step.description}`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Execute auth user creation step
   */
  private async executeCreateAuthUser(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const fieldData = await this.resolveStepFields(step.fields, context);
    
    try {
      const { data, error } = await context.client.auth.admin.createUser({
        id: fieldData.id,
        email: fieldData.email,
        password: fieldData.password || 'password123',
        email_confirm: fieldData.email_confirm !== false,
        user_metadata: {
          full_name: context.userData.name,
          username: context.userData.username,
          ...context.userData.metadata
        }
      });

      if (error) {
        return { success: false, error: `Auth user creation failed: ${error.message}` };
      }

      if (!data.user) {
        return { success: false, error: 'Auth user creation returned no user data' };
      }

      Logger.debug(`Created auth user: ${fieldData.email}`);

      return { 
        success: true, 
        data: { 
          userId: data.user.id,
          email: data.user.email,
          authUserData: data.user 
        } 
      };

    } catch (error: any) {
      return { success: false, error: `Auth user creation failed: ${error.message}` };
    }
  }

  /**
   * Execute record insertion step
   */
  private async executeInsertRecord(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!step.table) {
      return { success: false, error: 'No table specified for insert operation' };
    }

    const fieldData = await this.resolveStepFields(step.fields, context);
    
    // Validate required fields
    for (const field of step.fields) {
      if (field.required && (fieldData[field.name] === undefined || fieldData[field.name] === null)) {
        return { 
          success: false, 
          error: `Required field missing: ${field.name}` 
        };
      }
    }

    try {
      const { data, error } = await context.client
        .from(step.table)
        .insert(fieldData)
        .select()
        .single();

      if (error) {
        return { 
          success: false, 
          error: `Insert into ${step.table} failed: ${error.message}` 
        };
      }

      Logger.debug(`Inserted record into ${step.table}`);

      // Store rollback data
      if (this.config.enableRollback && data) {
        context.rollbackData.set(step.id, {
          table: step.table,
          id: data.id,
          operation: 'delete'
        });
      }

      return { success: true, data };

    } catch (error: any) {
      return { 
        success: false, 
        error: `Insert into ${step.table} failed: ${error.message}` 
      };
    }
  }

  /**
   * Execute constraint validation step
   */
  private async executeValidateConstraint(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.config.enableConstraintValidation) {
      return { success: true, data: { skipped: 'Constraint validation disabled' } };
    }

    // Execute custom SQL conditions
    for (const condition of step.conditions || []) {
      if (condition.type === 'custom_sql' && condition.sqlCondition) {
        try {
          // For now, we'll implement basic constraint validation
          // Full implementation would use actual SQL constraint checking
          Logger.debug(`Validating constraint: ${condition.description}`);
          
          // This is a placeholder - real implementation would execute the SQL condition
          const valid = await this.validateSqlCondition(condition.sqlCondition, context);
          
          if (!valid) {
            return { 
              success: false, 
              error: `Constraint validation failed: ${condition.description}` 
            };
          }
          
        } catch (error: any) {
          return { 
            success: false, 
            error: `Constraint validation error: ${error.message}` 
          };
        }
      }
    }

    return { success: true, data: { validated: true } };
  }

  /**
   * Execute trigger execution step
   */
  private async executeExecuteTrigger(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Triggers are typically executed automatically by the database
    // This step is mainly for validation that triggers executed correctly
    
    Logger.debug(`Trigger execution step: ${step.description}`);
    
    // For now, just return success - full implementation would verify trigger execution
    return { success: true, data: { triggerExecuted: true } };
  }

  /**
   * Execute conditional action step
   */
  private async executeConditionalAction(
    step: WorkflowStep, 
    context: WorkflowExecutionContext
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    // Check if conditions are met
    if (step.conditions) {
      const conditionsValid = await this.validateConditions(step.conditions, context);
      if (!conditionsValid) {
        return { success: true, data: { skipped: 'Conditions not met' } };
      }
    }

    // Execute the conditional action (implementation depends on specific action)
    Logger.debug(`Conditional action: ${step.description}`);
    
    return { success: true, data: { actionExecuted: true } };
  }

  /**
   * Resolve field values for a step
   */
  private async resolveStepFields(
    fields: WorkflowField[], 
    context: WorkflowExecutionContext
  ): Promise<Record<string, any>> {
    const resolvedData: Record<string, any> = {};

    for (const field of fields) {
      let value: any;

      switch (field.source) {
        case 'input':
          value = context.userData[field.name];
          break;
        
        case 'reference':
          if (field.sourceField) {
            // Look up reference value from previous step or context
            if (field.sourceField === 'id' && context.userId) {
              value = context.userId;
            } else {
              value = context.userData[field.sourceField];
            }
          }
          break;
        
        case 'generated':
          value = await this.generateFieldValue(field);
          break;
        
        case 'computed':
          value = await this.computeFieldValue(field, context);
          break;
        
        default:
          value = context.userData[field.name];
      }

      // Apply field validation
      if (field.validation && field.validation.length > 0) {
        const validationResult = await this.validateFieldValue(field, value, context);
        if (!validationResult.valid) {
          throw new Error(`Field validation failed for ${field.name}: ${validationResult.error}`);
        }
      }

      resolvedData[field.name] = value;
    }

    return resolvedData;
  }

  /**
   * Generate a field value based on the field configuration
   */
  private async generateFieldValue(field: WorkflowField): Promise<any> {
    switch (field.generator) {
      case 'uuid':
        return crypto.randomUUID();
      
      case 'timestamp':
        return new Date().toISOString();
      
      case 'sequence':
        // Implementation would maintain sequence counters
        return Date.now(); // Simple fallback
      
      case 'faker':
        if (field.fakerType) {
          return this.generateFakerValue(field.fakerType);
        }
        return null;
      
      default:
        return null;
    }
  }

  /**
   * Generate faker value based on type
   */
  private generateFakerValue(fakerType: string): any {
    const parts = fakerType.split('.');
    if (parts.length !== 2) return null;

    const [category, method] = parts;
    
    try {
      const fakerCategory = (faker as any)[category];
      if (fakerCategory && typeof fakerCategory[method] === 'function') {
        return fakerCategory[method]();
      }
    } catch (error) {
      Logger.warn(`Failed to generate faker value for ${fakerType}`);
    }
    
    return null;
  }

  /**
   * Calculate execution order based on step dependencies
   */
  private calculateExecutionOrder(steps: WorkflowStep[]): string[] {
    const executed = new Set<string>();
    const order: string[] = [];
    const maxIterations = steps.length * 2; // Prevent infinite loops
    let iterations = 0;

    while (order.length < steps.length && iterations < maxIterations) {
      iterations++;

      for (const step of steps) {
        if (executed.has(step.id)) continue;

        // Check if all dependencies are satisfied
        const dependenciesSatisfied = step.dependencies.every(dep => executed.has(dep));
        
        if (dependenciesSatisfied) {
          order.push(step.id);
          executed.add(step.id);
        }
      }
    }

    if (order.length < steps.length) {
      throw new Error('Circular dependency detected in workflow steps');
    }

    return order;
  }

  /**
   * Validate step conditions
   */
  private async validateConditions(
    conditions: WorkflowCondition[], 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const valid = await this.validateSingleCondition(condition, context);
      if (!valid) {
        return false;
      }
    }
    return true;
  }

  /**
   * Validate a single condition
   */
  private async validateSingleCondition(
    condition: WorkflowCondition, 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'field_exists':
        return condition.field ? (context.userData[condition.field] !== undefined) : false;
      
      case 'constraint_check':
        return await this.validateConstraintCheck(condition, context);
      
      case 'relationship_exists':
        return await this.validateRelationshipExists(condition, context);
      
      case 'custom_sql':
        return condition.sqlCondition ? 
          await this.validateSqlCondition(condition.sqlCondition, context) : false;
      
      default:
        return true;
    }
  }

  /**
   * Validate SQL condition (placeholder implementation)
   */
  private async validateSqlCondition(
    sqlCondition: string, 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    // This is a placeholder implementation
    // Real implementation would execute the SQL condition safely
    Logger.debug(`Validating SQL condition: ${sqlCondition}`);
    return true;
  }

  /**
   * Additional validation methods (placeholders)
   */
  private async validateConstraintCheck(
    condition: WorkflowCondition, 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    return true; // Placeholder
  }

  private async validateRelationshipExists(
    condition: WorkflowCondition, 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    return true; // Placeholder
  }

  private async validateFieldValue(
    field: WorkflowField, 
    value: any, 
    context: WorkflowExecutionContext
  ): Promise<{ valid: boolean; error?: string }> {
    // Placeholder implementation
    return { valid: true };
  }

  private async computeFieldValue(
    field: WorkflowField, 
    context: WorkflowExecutionContext
  ): Promise<any> {
    // Placeholder for computed field values
    return null;
  }

  /**
   * Retry a failed step
   */
  private async retryStep(
    step: WorkflowStep, 
    context: WorkflowExecutionContext, 
    maxRetries: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      Logger.debug(`Retrying step ${step.id}, attempt ${attempt}/${maxRetries}`);
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      
      const result = await this.executeStep(step, context);
      if (result.success) {
        Logger.debug(`Step ${step.id} succeeded on retry attempt ${attempt}`);
        return result;
      }
    }

    return { 
      success: false, 
      error: `Step failed after ${maxRetries} retry attempts` 
    };
  }

  /**
   * Execute rollback steps
   */
  private async executeRollback(
    rollbackSteps: WorkflowStep[], 
    context: WorkflowExecutionContext
  ): Promise<boolean> {
    let rollbackSuccess = true;

    for (const step of rollbackSteps) {
      try {
        const result = await this.executeStep(step, context);
        if (!result.success) {
          Logger.warn(`Rollback step failed: ${step.description}`);
          rollbackSuccess = false;
        }
      } catch (error: any) {
        Logger.error(`Rollback step error: ${step.description}`, error);
        rollbackSuccess = false;
      }
    }

    return rollbackSuccess;
  }
}