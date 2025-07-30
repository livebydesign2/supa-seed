/**
 * MakerKit-Specific Constraint Handlers for Epic 1: Universal MakerKit Core System
 * Advanced constraint resolution strategies for complex MakerKit relationship patterns
 * Part of Task 1.5.2: Create MakerKit-specific constraint handlers
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

/**
 * Advanced MakerKit Cross-Table Constraint Handler
 * Handles complex multi-table relationship constraints
 */
export class MakerKitCrossTableConstraintHandler implements ConstraintHandler {
  id = 'makerkit_cross_table';
  type: ConstraintType = 'check';
  priority = 120;
  description = 'Handles MakerKit cross-table constraint relationships';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('cross_table') ||
      constraint.constraintName?.toLowerCase().includes('dependent') ||
      constraint.checkClause?.toLowerCase().includes('exists') ||
      constraint.checkClause?.toLowerCase().includes('select')
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

    // Handle account-subscription dependency constraints
    if (this.isAccountSubscriptionConstraint(constraint)) {
      this.handleAccountSubscriptionDependency(constraint, data, result);
    }

    // Handle organization-member cascade constraints
    if (this.isOrganizationMemberConstraint(constraint)) {
      this.handleOrganizationMemberCascade(constraint, data, result);
    }

    // Handle user-profile consistency constraints
    if (this.isUserProfileConstraint(constraint)) {
      this.handleUserProfileConsistency(constraint, data, result);
    }

    return result;
  }

  private isAccountSubscriptionConstraint(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return (
      clause.includes('subscription') && 
      (clause.includes('account') || clause.includes('organization'))
    );
  }

  private isOrganizationMemberConstraint(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return (
      clause.includes('organization') && 
      clause.includes('member') &&
      clause.includes('exists')
    );
  }

  private isUserProfileConstraint(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return (
      clause.includes('user') && 
      clause.includes('profile') &&
      clause.includes('auth')
    );
  }

  private handleAccountSubscriptionDependency(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Ensure subscription has valid account reference
    if (data.account_id && !data.subscription_id) {
      result.warnings.push('Account created without subscription - may require subscription setup');
    }

    // Handle subscription status constraints with account type
    if (data.is_personal_account === true && data.subscription_status === 'team') {
      result.modifiedData.subscription_status = 'individual';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'subscription_status',
        oldValue: data.subscription_status,
        newValue: 'individual',
        reason: 'Personal accounts cannot have team subscription status',
        confidence: 0.95
      });
    }
  }

  private handleOrganizationMemberCascade(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Handle organization creation with automatic owner membership
    if (data.organization_id && data.created_by && !data.member_id) {
      result.warnings.push('Organization created without owner membership - requires member record creation');
      
      // Add dependency for member creation
      result.appliedFixes.push({
        type: 'add_dependency',
        field: 'organization_members',
        oldValue: null,
        newValue: {
          organization_id: data.organization_id,
          user_id: data.created_by,
          role: 'owner',
          is_owner: true
        },
        reason: 'Create owner membership for new organization',
        confidence: 0.9
      });
    }

    // Handle member role changes with organization constraints
    if (data.role === 'owner' && data.organization_members_count === 0) {
      result.warnings.push('Cannot assign owner role to organization with no members');
    }
  }

  private handleUserProfileConsistency(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Ensure auth.users and profiles consistency
    if (data.user_id && !data.profile_id) {
      result.warnings.push('User created without profile - profile creation may be required');
    }

    // Handle email consistency between auth and profile
    if (data.auth_email && data.profile_email && data.auth_email !== data.profile_email) {
      result.modifiedData.profile_email = data.auth_email;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'profile_email',
        oldValue: data.profile_email,
        newValue: data.auth_email,
        reason: 'Sync profile email with auth email for consistency',
        confidence: 0.9
      });
    }
  }
}

/**
 * MakerKit Conditional Foreign Key Handler
 * Handles nullable foreign keys with business logic conditions
 */
export class MakerKitConditionalForeignKeyHandler implements ConstraintHandler {
  id = 'makerkit_conditional_fk';
  type: ConstraintType = 'foreign_key';
  priority = 110;
  description = 'Handles MakerKit conditional foreign key constraints';

  canHandle(constraint: ForeignKeyConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('conditional') ||
      constraint.constraintName?.toLowerCase().includes('nullable') ||
      this.isConditionalForeignKey(constraint)
    );
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

    // Handle organization_id that's nullable for personal accounts
    if (this.isOrganizationForeignKey(constraint)) {
      this.handleOrganizationForeignKey(constraint, data, result);
    }

    // Handle parent_id for hierarchical structures
    if (this.isHierarchicalForeignKey(constraint)) {
      this.handleHierarchicalForeignKey(constraint, data, result);
    }

    // Handle subscription_id for conditional billing
    if (this.isSubscriptionForeignKey(constraint)) {
      this.handleSubscriptionForeignKey(constraint, data, result);
    }

    return result;
  }

  private isConditionalForeignKey(constraint: ForeignKeyConstraint): boolean {
    const conditionalPatterns = [
      'organization_id',
      'parent_id',
      'subscription_id',
      'billing_customer_id',
      'team_id'
    ];
    
    return conditionalPatterns.some(pattern => 
      constraint.columnName?.toLowerCase().includes(pattern)
    );
  }

  private isOrganizationForeignKey(constraint: ForeignKeyConstraint): boolean {
    return constraint.columnName?.toLowerCase().includes('organization_id') || false;
  }

  private isHierarchicalForeignKey(constraint: ForeignKeyConstraint): boolean {
    return constraint.columnName?.toLowerCase().includes('parent_id') || false;
  }

  private isSubscriptionForeignKey(constraint: ForeignKeyConstraint): boolean {
    return (
      constraint.columnName?.toLowerCase().includes('subscription_id') ||
      constraint.columnName?.toLowerCase().includes('billing_customer_id')
    ) || false;
  }

  private handleOrganizationForeignKey(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Personal accounts should not have organization_id
    if (data.is_personal_account === true && data.organization_id) {
      result.modifiedData.organization_id = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'organization_id',
        oldValue: data.organization_id,
        newValue: null,
        reason: 'Personal accounts should not have organization_id',
        confidence: 0.95
      });
    }

    // Team accounts must have organization_id
    if (data.is_personal_account === false && !data.organization_id) {
      result.warnings.push('Team account requires organization_id - organization creation may be needed');
      
      // Could suggest organization creation
      result.appliedFixes.push({
        type: 'add_dependency',
        field: 'organizations',
        oldValue: null,
        newValue: {
          name: data.organization_name || `${data.name || 'User'}'s Organization`,
          slug: this.generateOrganizationSlug(data),
          created_by: data.user_id || data.id
        },
        reason: 'Create organization for team account',
        confidence: 0.8
      });
    }
  }

  private handleHierarchicalForeignKey(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Prevent self-referencing parent relationships
    if (data.parent_id === data.id) {
      result.modifiedData.parent_id = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'parent_id',
        oldValue: data.parent_id,
        newValue: null,
        reason: 'Prevent self-referencing parent relationship',
        confidence: 0.95
      });
    }

    // Validate hierarchical depth constraints
    if (data.parent_id && data.hierarchy_level > 5) {
      result.warnings.push('Deep hierarchy detected - may cause performance issues');
    }
  }

  private handleSubscriptionForeignKey(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Free tier accounts may not have subscription_id
    if (data.plan_type === 'free' && data.subscription_id) {
      result.modifiedData.subscription_id = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'subscription_id',
        oldValue: data.subscription_id,
        newValue: null,
        reason: 'Free tier accounts should not have subscription_id',
        confidence: 0.9
      });
    }

    // Paid accounts should have subscription_id
    if (data.plan_type && data.plan_type !== 'free' && !data.subscription_id) {
      result.warnings.push('Paid account requires subscription_id - subscription creation may be needed');
    }
  }

  private generateOrganizationSlug(data: any): string {
    const baseName = data.organization_name || data.name || 'organization';
    return baseName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}

/**
 * MakerKit Hierarchical Constraint Handler
 * Handles parent-child relationship constraints and circular dependency prevention
 */
export class MakerKitHierarchicalConstraintHandler implements ConstraintHandler {
  id = 'makerkit_hierarchical';
  type: ConstraintType = 'check';
  priority = 105;
  description = 'Handles MakerKit hierarchical relationship constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('hierarchical') ||
      constraint.constraintName?.toLowerCase().includes('parent') ||
      constraint.constraintName?.toLowerCase().includes('circular') ||
      constraint.checkClause?.toLowerCase().includes('parent_id') ||
      constraint.checkClause?.toLowerCase().includes('hierarchy')
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

    // Prevent circular references
    if (this.isCircularReference(data)) {
      this.handleCircularReference(data, result);
    }

    // Validate hierarchy depth
    if (this.isDeepHierarchy(data)) {
      this.handleDeepHierarchy(data, result);
    }

    // Handle orphaned records
    if (this.isOrphanedRecord(data)) {
      this.handleOrphanedRecord(data, result);
    }

    return result;
  }

  private isCircularReference(data: any): boolean {
    return data.parent_id === data.id || 
           (data.parent_id && data.children?.some((child: any) => child.id === data.parent_id));
  }

  private isDeepHierarchy(data: any): boolean {
    return (data.hierarchy_level || 0) > 10;
  }

  private isOrphanedRecord(data: any): boolean {
    return data.parent_id && !data.parent_exists && data.level > 0;
  }

  private handleCircularReference(data: any, result: ConstraintHandlingResult): void {
    result.modifiedData.parent_id = null;
    result.appliedFixes.push({
      type: 'set_field',
      field: 'parent_id',
      oldValue: data.parent_id,
      newValue: null,
      reason: 'Removed circular reference in hierarchy',
      confidence: 0.95
    });

    result.warnings.push('Circular reference detected and resolved by removing parent relationship');
  }

  private handleDeepHierarchy(data: any, result: ConstraintHandlingResult): void {
    result.warnings.push(`Deep hierarchy detected (level ${data.hierarchy_level}) - consider flattening structure`);
    
    // Optionally limit hierarchy depth
    if (data.hierarchy_level > 15) {
      result.modifiedData.parent_id = null;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'parent_id',
        oldValue: data.parent_id,
        newValue: null,
        reason: 'Hierarchy too deep, moved to root level',
        confidence: 0.7
      });
    }
  }

  private handleOrphanedRecord(data: any, result: ConstraintHandlingResult): void {
    result.modifiedData.parent_id = null;
    result.modifiedData.hierarchy_level = 0;
    
    result.appliedFixes.push({
      type: 'set_field',
      field: 'parent_id',
      oldValue: data.parent_id,
      newValue: null,
      reason: 'Removed reference to non-existent parent',
      confidence: 0.9
    });

    result.appliedFixes.push({
      type: 'set_field',
      field: 'hierarchy_level',
      oldValue: data.hierarchy_level,
      newValue: 0,
      reason: 'Reset hierarchy level for orphaned record',
      confidence: 0.9
    });
  }
}

/**
 * MakerKit Business Rule Constraint Handler
 * Handles complex business logic constraints that span multiple conditions
 */
export class MakerKitBusinessRuleConstraintHandler implements ConstraintHandler {
  id = 'makerkit_business_rule';
  type: ConstraintType = 'check';
  priority = 115;
  description = 'Handles MakerKit business rule constraints';

  canHandle(constraint: CheckConstraint, data: any): boolean {
    return (
      constraint.constraintName?.toLowerCase().includes('business_rule') ||
      constraint.constraintName?.toLowerCase().includes('workflow') ||
      this.isComplexBusinessRule(constraint)
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

    // Handle subscription-billing business rules
    if (this.isSubscriptionBillingRule(constraint)) {
      this.handleSubscriptionBillingRule(constraint, data, result);
    }

    // Handle organization-membership business rules
    if (this.isOrganizationMembershipRule(constraint)) {
      this.handleOrganizationMembershipRule(constraint, data, result);
    }

    // Handle user-permission business rules
    if (this.isUserPermissionRule(constraint)) {
      this.handleUserPermissionRule(constraint, data, result);
    }

    return result;
  }

  private isComplexBusinessRule(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return (
      clause.includes('case when') ||
      clause.includes('and') && clause.includes('or') ||
      clause.split('and').length > 2 ||
      clause.includes('not exists')
    );
  }

  private isSubscriptionBillingRule(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return clause.includes('subscription') && clause.includes('billing');
  }

  private isOrganizationMembershipRule(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return clause.includes('organization') && clause.includes('member');
  }

  private isUserPermissionRule(constraint: CheckConstraint): boolean {
    const clause = constraint.checkClause?.toLowerCase() || '';
    return clause.includes('permission') || clause.includes('role') && clause.includes('access');
  }

  private handleSubscriptionBillingRule(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Business rule: Active subscription must have valid billing
    if (data.subscription_status === 'active' && !data.stripe_customer_id) {
      result.warnings.push('Active subscription requires valid billing setup');
    }

    // Business rule: Canceled subscription should not have active billing
    if (data.subscription_status === 'canceled' && data.billing_status === 'active') {
      result.modifiedData.billing_status = 'canceled';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'billing_status',
        oldValue: data.billing_status,
        newValue: 'canceled',
        reason: 'Sync billing status with canceled subscription',
        confidence: 0.9
      });
    }
  }

  private handleOrganizationMembershipRule(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Business rule: Organization must have exactly one owner
    if (data.role === 'owner' && data.existing_owners_count > 0) {
      result.modifiedData.role = 'admin';
      result.appliedFixes.push({
        type: 'set_field',
        field: 'role',
        oldValue: 'owner',
        newValue: 'admin',
        reason: 'Organization already has an owner, assigning admin role',
        confidence: 0.85
      });
    }

    // Business rule: Cannot remove last member from organization
    if (data.action === 'remove' && data.total_members === 1) {
      result.errors.push('Cannot remove last member from organization');
      result.success = false;
    }
  }

  private handleUserPermissionRule(
    constraint: CheckConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    // Business rule: Admin role requires specific permissions
    if (data.role === 'admin' && !data.can_manage_members) {
      result.modifiedData.can_manage_members = true;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'can_manage_members',
        oldValue: false,
        newValue: true,
        reason: 'Admin role requires member management permission',
        confidence: 0.9
      });
    }

    // Business rule: Viewer role should have minimal permissions
    if (data.role === 'viewer' && (data.can_create || data.can_delete)) {
      result.modifiedData.can_create = false;
      result.modifiedData.can_delete = false;
      result.appliedFixes.push({
        type: 'set_field',
        field: 'can_create',
        oldValue: data.can_create,
        newValue: false,
        reason: 'Viewer role should not have create permissions',
        confidence: 0.95
      });
    }
  }
}

/**
 * MakerKit Cascade Constraint Handler
 * Handles cascade operations and dependent data creation/updates
 */
export class MakerKitCascadeConstraintHandler implements ConstraintHandler {
  id = 'makerkit_cascade';
  type: ConstraintType = 'foreign_key';
  priority = 100;
  description = 'Handles MakerKit cascade constraint operations';

  canHandle(constraint: ForeignKeyConstraint, data: any): boolean {
    return (
      constraint.onDelete === 'CASCADE' ||
      constraint.onUpdate === 'CASCADE' ||
      constraint.constraintName?.toLowerCase().includes('cascade')
    );
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

    // Handle organization deletion cascades
    if (this.isOrganizationCascade(constraint, data)) {
      this.handleOrganizationCascade(constraint, data, result);
    }

    // Handle user deletion cascades
    if (this.isUserCascade(constraint, data)) {
      this.handleUserCascade(constraint, data, result);
    }

    // Handle subscription cancellation cascades
    if (this.isSubscriptionCascade(constraint, data)) {
      this.handleSubscriptionCascade(constraint, data, result);
    }

    return result;
  }

  private isOrganizationCascade(constraint: ForeignKeyConstraint, data: any): boolean {
    return constraint.referencedTable?.toLowerCase().includes('organization') || 
           constraint.columnName?.toLowerCase().includes('organization_id') ||
           false;
  }

  private isUserCascade(constraint: ForeignKeyConstraint, data: any): boolean {
    return constraint.referencedTable?.toLowerCase().includes('user') ||
           constraint.columnName?.toLowerCase().includes('user_id') ||
           false;
  }

  private isSubscriptionCascade(constraint: ForeignKeyConstraint, data: any): boolean {
    return constraint.referencedTable?.toLowerCase().includes('subscription') ||
           constraint.columnName?.toLowerCase().includes('subscription_id') ||
           false;
  }

  private handleOrganizationCascade(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    if (data.action === 'delete' && data.has_members) {
      result.warnings.push('Deleting organization will cascade to remove all members');
      
      // Add cascade dependency information
      result.appliedFixes.push({
        type: 'add_dependency',
        field: 'cascade_operations',
        oldValue: null,
        newValue: {
          operation: 'delete_members',
          table: 'organization_members',
          condition: `organization_id = ${data.organization_id}`
        },
        reason: 'Cascade delete organization members',
        confidence: 0.9
      });
    }
  }

  private handleUserCascade(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    if (data.action === 'delete' && data.has_profiles) {
      result.warnings.push('Deleting user will cascade to remove profile and related data');
    }

    // Handle user update cascades
    if (data.action === 'update' && data.email_changed) {
      result.appliedFixes.push({
        type: 'add_dependency',
        field: 'cascade_operations',
        oldValue: null,
        newValue: {
          operation: 'update_profiles',
          table: 'profiles',
          condition: `user_id = ${data.user_id}`,
          updates: { email: data.new_email }
        },
        reason: 'Cascade email update to profile',
        confidence: 0.95
      });
    }
  }

  private handleSubscriptionCascade(
    constraint: ForeignKeyConstraint, 
    data: any, 
    result: ConstraintHandlingResult
  ): void {
    if (data.subscription_status === 'canceled') {
      result.warnings.push('Subscription cancellation may affect related services');
      
      // Add cascade operations for subscription cancellation
      result.appliedFixes.push({
        type: 'add_dependency',
        field: 'cascade_operations',
        oldValue: null,
        newValue: {
          operation: 'update_features',
          table: 'user_features',
          condition: `subscription_id = ${data.subscription_id}`,
          updates: { enabled: false }
        },
        reason: 'Disable features for canceled subscription',
        confidence: 0.9
      });
    }
  }
}

/**
 * Registry of all MakerKit-specific constraint handlers
 */
export const MAKERKIT_CONSTRAINT_HANDLERS = [
  MakerKitCrossTableConstraintHandler,
  MakerKitConditionalForeignKeyHandler,
  MakerKitHierarchicalConstraintHandler,
  MakerKitBusinessRuleConstraintHandler,
  MakerKitCascadeConstraintHandler
];

/**
 * Initialize and register all MakerKit-specific constraint handlers
 */
export function registerMakerKitConstraintHandlers(handlers: any): void {
  MAKERKIT_CONSTRAINT_HANDLERS.forEach(HandlerClass => {
    const handler = new HandlerClass();
    handlers.registerHandler(handler);
    Logger.debug(`Registered MakerKit constraint handler: ${handler.id}`);
  });
}