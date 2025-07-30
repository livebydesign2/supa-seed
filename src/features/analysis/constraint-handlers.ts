/**
 * Constraint Handlers System
 * Implements handlers for different types of PostgreSQL constraints
 */

import { Logger } from '../../core/utils/logger';
import {
  ConstraintHandler,
  ConstraintHandlingResult,
  ConstraintFix,
  CheckConstraint,
  ForeignKeyConstraint,
  UniqueConstraint,
  ConstraintType
} from './constraint-types';
import { registerMakerKitConstraintHandlers } from './makerkit-constraint-handlers';

export class ConstraintHandlers {
  private static handlers: Map<string, ConstraintHandler> = new Map();

  /**
   * Initialize default constraint handlers
   */
  static initializeDefaultHandlers(): void {
    // Register advanced MakerKit-specific constraint handlers
    registerMakerKitConstraintHandlers(this);

    // Enhanced MakerKit-specific handlers
    this.registerHandler(new MakerKitPersonalAccountSlugHandler());
    this.registerHandler(new MakerKitTeamAccountSlugHandler());
    this.registerHandler(new MakerKitOrganizationMemberHandler());
    this.registerHandler(new MakerKitSubscriptionStatusHandler());
    this.registerHandler(new MakerKitAccountTypeHandler());
    this.registerHandler(new MakerKitUserRoleHandler());
    this.registerHandler(new MakerKitBillingCycleHandler());
    this.registerHandler(new MakerKitOrganizationOwnerHandler());
    this.registerHandler(new MakerKitInvitationStatusHandler());

    // Enhanced generic handlers
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
 * MakerKit Team Account Slug Handler
 * Handles slug generation and validation for team accounts
 */
class MakerKitTeamAccountSlugHandler implements ConstraintHandler {
  id = 'makerkit_team_account_slug';
  type: ConstraintType = 'check';
  priority = 95;
  description = 'Handles MakerKit team account slug generation and validation';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('accounts_slug') ||
      constraint.constraintName?.toLowerCase().includes('team_slug') ||
      (constraint.checkClause?.toLowerCase().includes('slug') && 
       constraint.checkClause?.toLowerCase().includes('is_personal_account'))
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

    // If is_personal_account is false and no slug provided, generate one
    if (data.is_personal_account === false && !data.slug) {
      const generatedSlug = this.generateUniqueSlug(data);
      result.modifiedData.slug = generatedSlug;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'slug',
        oldValue: null,
        newValue: generatedSlug,
        reason: 'Generated unique slug for team account',
        confidence: 0.9
      });
    }

    // Validate existing slug format for team accounts
    if (data.is_personal_account === false && data.slug) {
      const validatedSlug = this.validateAndFixSlug(data.slug);
      if (validatedSlug !== data.slug) {
        result.modifiedData.slug = validatedSlug;
        result.appliedFixes.push({
          type: 'transform_value',
          field: 'slug',
          oldValue: data.slug,
          newValue: validatedSlug,
          reason: 'Normalized slug format for team account',
          confidence: 0.95
        });
      }
    }

    return result;
  }

  private generateUniqueSlug(data: any): string {
    const baseName = data.name || data.organization_name || data.account_name || 'team';
    let slug = this.normalizeSlug(baseName);
    
    // Add timestamp to ensure uniqueness in testing scenarios
    const timestamp = Date.now().toString().slice(-6);
    slug = `${slug}-${timestamp}`;
    
    return slug;
  }

  private validateAndFixSlug(slug: string): string {
    return this.normalizeSlug(slug);
  }

  private normalizeSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }
}

/**
 * MakerKit Account Type Handler
 * Handles account type validation and business logic constraints
 */
class MakerKitAccountTypeHandler implements ConstraintHandler {
  id = 'makerkit_account_type';
  type: ConstraintType = 'check';
  priority = 90;
  description = 'Handles MakerKit account type constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('account_type') ||
      constraint.checkClause?.toLowerCase().includes('account_type') ||
      constraint.checkClause?.toLowerCase().includes('is_personal_account')
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

    const validAccountTypes = ['personal', 'team', 'organization', 'enterprise'];

    // Handle is_personal_account boolean field
    if (data.hasOwnProperty('is_personal_account')) {
      if (data.is_personal_account === true) {
        if (data.account_type && data.account_type !== 'personal') {
          result.modifiedData.account_type = 'personal';
          result.appliedFixes.push({
            type: 'set_field',
            field: 'account_type',
            oldValue: data.account_type,
            newValue: 'personal',
            reason: 'Account type must be personal when is_personal_account is true',
            confidence: 0.95
          });
        }
      } else if (data.is_personal_account === false) {
        if (!data.account_type || data.account_type === 'personal') {
          result.modifiedData.account_type = 'team';
          result.appliedFixes.push({
            type: 'set_field',
            field: 'account_type',
            oldValue: data.account_type,
            newValue: 'team',
            reason: 'Default to team account type when is_personal_account is false',
            confidence: 0.85
          });
        }
      }
    }

    // Validate account_type field
    if (data.account_type && !validAccountTypes.includes(data.account_type)) {
      result.modifiedData.account_type = 'personal';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'account_type',
        oldValue: data.account_type,
        newValue: 'personal',
        reason: 'Invalid account type, defaulting to personal',
        confidence: 0.8
      });
    }

    return result;
  }
}

/**
 * MakerKit User Role Handler
 * Handles user role validation and hierarchy constraints
 */
class MakerKitUserRoleHandler implements ConstraintHandler {
  id = 'makerkit_user_role';
  type: ConstraintType = 'check';
  priority = 85;
  description = 'Handles MakerKit user role constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('user_role') ||
      constraint.constraintName?.toLowerCase().includes('member_role') ||
      constraint.checkClause?.toLowerCase().includes('role')
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

    const validRoles = ['owner', 'admin', 'member', 'viewer', 'billing', 'support'];
    const roleHierarchy = {
      owner: 5,
      admin: 4,
      billing: 3,
      support: 2,
      member: 1,
      viewer: 0
    };

    // Validate role field
    if (data.role && !validRoles.includes(data.role)) {
      result.modifiedData.role = 'member';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'role',
        oldValue: data.role,
        newValue: 'member',
        reason: 'Invalid role, defaulting to member',
        confidence: 0.8
      });
    }

    // Set default role if missing
    if (!data.role) {
      const defaultRole = data.is_owner ? 'owner' : 'member';
      result.modifiedData.role = defaultRole;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'role',
        oldValue: undefined,
        newValue: defaultRole,
        reason: `Set default role based on ${data.is_owner ? 'owner status' : 'member status'}`,
        confidence: 0.9
      });
    }

    // Validate role hierarchy constraints
    if (data.role === 'owner' && data.is_owner !== true) {
      result.modifiedData.is_owner = true;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'is_owner',
        oldValue: data.is_owner,
        newValue: true,
        reason: 'Owner role requires is_owner flag to be true',
        confidence: 0.95
      });
    }

    return result;
  }
}

/**
 * MakerKit Billing Cycle Handler
 * Handles billing cycle and subscription constraints
 */
class MakerKitBillingCycleHandler implements ConstraintHandler {
  id = 'makerkit_billing_cycle';
  type: ConstraintType = 'check';
  priority = 80;
  description = 'Handles MakerKit billing cycle constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('billing_cycle') ||
      constraint.constraintName?.toLowerCase().includes('interval') ||
      constraint.checkClause?.toLowerCase().includes('billing') ||
      constraint.checkClause?.toLowerCase().includes('interval')
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

    const validCycles = ['monthly', 'yearly', 'weekly', 'daily'];
    const validIntervals = ['month', 'year', 'week', 'day'];

    // Handle billing_cycle field
    if (data.billing_cycle && !validCycles.includes(data.billing_cycle)) {
      result.modifiedData.billing_cycle = 'monthly';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'billing_cycle',
        oldValue: data.billing_cycle,
        newValue: 'monthly',
        reason: 'Invalid billing cycle, defaulting to monthly',
        confidence: 0.85
      });
    }

    // Handle interval field
    if (data.interval && !validIntervals.includes(data.interval)) {
      result.modifiedData.interval = 'month';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'interval',
        oldValue: data.interval,
        newValue: 'month',
        reason: 'Invalid interval, defaulting to month',
        confidence: 0.85
      });
    }

    // Set default values if missing
    if (!data.billing_cycle && !data.interval) {
      result.modifiedData.billing_cycle = 'monthly';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'billing_cycle',
        oldValue: undefined,
        newValue: 'monthly',
        reason: 'Set default billing cycle',
        confidence: 0.9
      });
    }

    return result;
  }
}

/**
 * MakerKit Organization Owner Handler
 * Handles organization ownership constraints
 */
class MakerKitOrganizationOwnerHandler implements ConstraintHandler {
  id = 'makerkit_organization_owner';
  type: ConstraintType = 'unique';
  priority = 85;
  description = 'Handles MakerKit organization owner constraints';

  canHandle(constraint: UniqueConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('organization_owner') ||
      constraint.constraintName?.toLowerCase().includes('account_owner') ||
      (constraint.columns?.includes('organization_id') && 
       (constraint.columns?.includes('is_owner') || constraint.columns?.includes('owner_id')))
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

    // Validate organization ownership logic
    if (data.is_owner === true && !data.organization_id) {
      result.warnings.push('Owner flag set but no organization_id provided');
    }

    // Handle role consistency with ownership
    if (data.is_owner === true && data.role && data.role !== 'owner') {
      result.modifiedData.role = 'owner';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'role',
        oldValue: data.role,
        newValue: 'owner',
        reason: 'Role must be owner when is_owner is true',
        confidence: 0.95
      });
    }

    return result;
  }
}

/**
 * MakerKit Invitation Status Handler
 * Handles invitation status constraints and workflows
 */
class MakerKitInvitationStatusHandler implements ConstraintHandler {
  id = 'makerkit_invitation_status';
  type: ConstraintType = 'check';
  priority = 75;
  description = 'Handles MakerKit invitation status constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('invitation_status') ||
      constraint.constraintName?.toLowerCase().includes('invite_status') ||
      constraint.checkClause?.toLowerCase().includes('status') &&
      (constraint.checkClause?.toLowerCase().includes('pending') ||
       constraint.checkClause?.toLowerCase().includes('accepted') ||
       constraint.checkClause?.toLowerCase().includes('declined'))
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

    const validStatuses = ['pending', 'accepted', 'declined', 'expired'];

    // Validate invitation status
    if (data.status && !validStatuses.includes(data.status)) {
      result.modifiedData.status = 'pending';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'status',
        oldValue: data.status,
        newValue: 'pending',
        reason: 'Invalid invitation status, defaulting to pending',
        confidence: 0.85
      });
    }

    // Set default status if missing
    if (!data.status) {
      result.modifiedData.status = 'pending';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'status',
        oldValue: undefined,
        newValue: 'pending',
        reason: 'Set default invitation status',
        confidence: 0.9
      });
    }

    // Handle invitation expiry logic
    if (data.status === 'pending' && data.expires_at) {
      const now = new Date();
      const expiryDate = new Date(data.expires_at);
      if (expiryDate < now) {
        result.modifiedData.status = 'expired';
        result.appliedFixes.push({
          type: 'set_field',
          field: 'status',
          oldValue: 'pending',
          newValue: 'expired',
          reason: 'Invitation has expired based on expires_at date',
          confidence: 0.95
        });
      }
    }

    return result;
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