/**
 * Constraint Handlers System
 * Implements handlers for different types of PostgreSQL constraints
 */

import { Logger } from '../utils/logger';
import {
  ConstraintHandler,
  ConstraintHandlingResult,
  ConstraintFix,
  CheckConstraint,
  ForeignKeyConstraint,
  UniqueConstraint,
  ConstraintType
} from './constraint-types';

export class ConstraintHandlers {
  private static handlers: Map<string, ConstraintHandler> = new Map();

  /**
   * Initialize default constraint handlers
   */
  static initializeDefaultHandlers(): void {
    // MakerKit-specific handlers
    this.registerHandler(new MakerKitPersonalAccountSlugHandler());
    this.registerHandler(new MakerKitOrganizationMemberHandler());
    this.registerHandler(new MakerKitSubscriptionStatusHandler());

    // Generic handlers
    this.registerHandler(new GenericCheckConstraintHandler());
    this.registerHandler(new GenericForeignKeyHandler());
    this.registerHandler(new GenericUniqueConstraintHandler());
    this.registerHandler(new GenericNotNullHandler());

    Logger.debug(`Initialized ${this.handlers.size} constraint handlers`);
  }

  /**
   * Register a custom constraint handler
   */
  static registerHandler(handler: ConstraintHandler): void {
    this.handlers.set(handler.id, handler);
    Logger.debug(`Registered constraint handler: ${handler.id}`);
  }

  /**
   * Get handler for a specific constraint
   */
  static getHandler(constraint: any, constraintType: ConstraintType): ConstraintHandler | null {
    // Try to find specific handler first
    for (const handler of this.handlers.values()) {
      if (handler.type === constraintType && handler.canHandle(constraint, null)) {
        return handler;
      }
    }

    // Fall back to generic handler
    const genericHandlerKey = `generic_${constraintType}`;
    return this.handlers.get(genericHandlerKey) || null;
  }

  /**
   * Handle constraint for given data
   */
  static handleConstraint(
    constraint: any,
    constraintType: ConstraintType,
    data: any
  ): ConstraintHandlingResult {
    const handler = this.getHandler(constraint, constraintType);

    if (!handler) {
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [`No handler found for ${constraintType} constraint`],
        errors: [],
        bypassRequired: true
      };
    }

    try {
      return handler.handle(constraint, data);
    } catch (error: any) {
      Logger.error(`Constraint handler ${handler.id} failed:`, error);
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [],
        errors: [`Handler error: ${error.message}`],
        bypassRequired: true
      };
    }
  }

  /**
   * Get all registered handlers
   */
  static getAllHandlers(): ConstraintHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Clear all handlers
   */
  static clearHandlers(): void {
    this.handlers.clear();
  }
}

/**
 * MakerKit Personal Account Slug Handler
 * Handles the accounts_slug_null_if_personal_account_true constraint
 */
class MakerKitPersonalAccountSlugHandler implements ConstraintHandler {
  id = 'makerkit_personal_account_slug';
  type: ConstraintType = 'check';
  priority = 100;
  description = 'Handles MakerKit personal account slug constraint';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('accounts_slug_null_if_personal') ||
      constraint.checkClause?.toLowerCase().includes('is_personal_account') &&
      constraint.checkClause?.toLowerCase().includes('slug')
    );
  }

  handle(constraint: CheckConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    // If is_personal_account is true, slug must be null
    if (data.is_personal_account === true && data.slug !== null) {
      result.modifiedData.slug = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'slug',
        oldValue: data.slug,
        newValue: null,
        reason: 'Personal accounts must have null slug (MakerKit constraint)',
        confidence: 0.95
      });
    }

    // If is_personal_account is not set, default to true for profile creation
    if (data.is_personal_account === undefined) {
      result.modifiedData.is_personal_account = true;
      result.modifiedData.slug = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'is_personal_account',
        oldValue: undefined,
        newValue: true,
        reason: 'Default to personal account for profile compatibility',
        confidence: 0.85
      });
      result.appliedFixes.push({
        type: 'set_field',
        field: 'slug',
        oldValue: data.slug,
        newValue: null,
        reason: 'Set slug to null for personal account',
        confidence: 0.95
      });
    }

    return result;
  }

  generateFix(constraint: CheckConstraint, data: any): ConstraintFix {
    return {
      type: 'set_field',
      field: 'slug',
      oldValue: data.slug,
      newValue: null,
      reason: 'MakerKit personal accounts require null slug',
      confidence: 0.95
    };
  }
}

/**
 * MakerKit Organization Member Handler
 */
class MakerKitOrganizationMemberHandler implements ConstraintHandler {
  id = 'makerkit_organization_member';
  type: ConstraintType = 'unique';
  priority = 90;
  description = 'Handles MakerKit organization member uniqueness';

  canHandle(constraint: UniqueConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('organization_member') ||
      (constraint.columns?.includes('organization_id') && constraint.columns?.includes('user_id'))
    );
  }

  handle(constraint: UniqueConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    // Check if both organization_id and user_id are present
    if (!data.organization_id || !data.user_id) {
      result.warnings.push('Organization member requires both organization_id and user_id');
    }

    // Could add logic to check for existing memberships and suggest alternatives
    return result;
  }
}

/**
 * MakerKit Subscription Status Handler
 */
class MakerKitSubscriptionStatusHandler implements ConstraintHandler {
  id = 'makerkit_subscription_status';
  type: ConstraintType = 'check';
  priority = 85;
  description = 'Handles MakerKit subscription status validation';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('subscription_status') ||
      constraint.checkClause?.toLowerCase().includes('status') &&
      constraint.checkClause?.toLowerCase().includes('active')
    );
  }

  handle(constraint: CheckConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    const validStatuses = ['active', 'canceled', 'past_due', 'trialing', 'incomplete'];
    
    if (data.status && !validStatuses.includes(data.status)) {
      result.modifiedData.status = 'active'; // Default to active
      result.appliedFixes.push({
        type: 'set_field',
        field: 'status',
        oldValue: data.status,
        newValue: 'active',
        reason: 'Invalid subscription status, defaulting to active',
        confidence: 0.8
      });
    }

    if (!data.status) {
      result.modifiedData.status = 'active';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'status',
        oldValue: undefined,
        newValue: 'active',
        reason: 'Set default subscription status',
        confidence: 0.9
      });
    }

    return result;
  }
}

/**
 * Generic Check Constraint Handler
 */
class GenericCheckConstraintHandler implements ConstraintHandler {
  id = 'generic_check';
  type: ConstraintType = 'check';
  priority = 10;
  description = 'Generic handler for check constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return true; // Generic handler can handle any check constraint
  }

  handle(constraint: CheckConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [`Generic handling for check constraint: ${constraint.constraintName}`],
      errors: [],
      bypassRequired: false
    };

    // Basic analysis of check clause
    const checkClause = constraint.checkClause?.toLowerCase() || '';
    
    // Handle common patterns
    if (checkClause.includes('not null') || checkClause.includes('is not null')) {
      this.handleNotNullCheck(constraint, data, result);
    } else if (checkClause.includes('length(') || checkClause.includes('char_length(')) {
      this.handleLengthCheck(constraint, data, result);
    } else if (checkClause.includes(' in (')) {
      this.handleEnumCheck(constraint, data, result);
    } else {
      result.warnings.push(`Complex check constraint may require manual review: ${constraint.constraintName}`);
    }

    return result;
  }

  private handleNotNullCheck(constraint: CheckConstraint, data: any, result: ConstraintHandlingResult): void {
    // Extract field name from constraint (basic pattern matching)
    const checkClause = constraint.checkClause;
    const fieldMatch = checkClause.match(/(\w+)\s+(IS\s+)?NOT\s+NULL/i);
    
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      if (data[fieldName] === null || data[fieldName] === undefined) {
        result.warnings.push(`Field ${fieldName} should not be null according to constraint ${constraint.constraintName}`);
      }
    }
  }

  private handleLengthCheck(constraint: CheckConstraint, data: any, result: ConstraintHandlingResult): void {
    result.warnings.push(`Length constraint detected: ${constraint.constraintName} - manual validation recommended`);
  }

  private handleEnumCheck(constraint: CheckConstraint, data: any, result: ConstraintHandlingResult): void {
    result.warnings.push(`Enum constraint detected: ${constraint.constraintName} - validate against allowed values`);
  }
}

/**
 * Generic Foreign Key Handler
 */
class GenericForeignKeyHandler implements ConstraintHandler {
  id = 'generic_foreign_key';
  type: ConstraintType = 'foreign_key';
  priority = 10;
  description = 'Generic handler for foreign key constraints';

  canHandle(constraint: ForeignKeyConstraint, data: any): boolean {
    return true;
  }

  handle(constraint: ForeignKeyConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    const fieldValue = data[constraint.columnName];
    
    if (fieldValue === null || fieldValue === undefined) {
      if (constraint.onDelete === 'SET NULL') {
        // This is acceptable
        result.warnings.push(`Foreign key ${constraint.columnName} is null, which is allowed by constraint`);
      } else {
        result.warnings.push(`Foreign key ${constraint.columnName} is null - ensure referenced record exists`);
      }
    } else {
      result.warnings.push(`Foreign key ${constraint.columnName} references ${constraint.referencedTable}.${constraint.referencedColumn} - ensure target exists`);
    }

    return result;
  }
}

/**
 * Generic Unique Constraint Handler
 */
class GenericUniqueConstraintHandler implements ConstraintHandler {
  id = 'generic_unique';
  type: ConstraintType = 'unique';
  priority = 10;
  description = 'Generic handler for unique constraints';

  canHandle(constraint: UniqueConstraint, data: any): boolean {
    return true;
  }

  handle(constraint: UniqueConstraint, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    // Check if all columns in unique constraint have values
    const missingColumns = constraint.columns.filter(col => 
      data[col] === null || data[col] === undefined
    );

    if (missingColumns.length > 0) {
      result.warnings.push(`Unique constraint ${constraint.constraintName} requires values for: ${missingColumns.join(', ')}`);
    } else {
      result.warnings.push(`Unique constraint ${constraint.constraintName} - ensure values are unique across: ${constraint.columns.join(', ')}`);
    }

    return result;
  }
}

/**
 * Generic Not Null Handler
 */
class GenericNotNullHandler implements ConstraintHandler {
  id = 'generic_not_null';
  type: ConstraintType = 'not_null';
  priority = 10;
  description = 'Generic handler for not null constraints';

  canHandle(constraint: any, data: any): boolean {
    return true;
  }

  handle(constraint: any, data: any): ConstraintHandlingResult {
    const result: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    const fieldName = constraint.columnName;
    if (data[fieldName] === null || data[fieldName] === undefined) {
      result.errors.push(`Field ${fieldName} cannot be null`);
      result.success = false;
    }

    return result;
  }
}

// Initialize default handlers when module is loaded
ConstraintHandlers.initializeDefaultHandlers();