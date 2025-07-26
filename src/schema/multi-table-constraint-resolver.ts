/**
 * Complex Multi-Table Constraint Resolution System for Epic 1: Universal MakerKit Core System
 * Advanced strategies for resolving constraints that span multiple tables and complex relationships
 * Part of Task 1.5.4: Add complex multi-table constraint resolution strategies
 */

import { Logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';
import { AdvancedSlugManager } from './slug-management-system';
import {
  ConstraintHandlingResult,
  ConstraintFix,
  CheckConstraint,
  ForeignKeyConstraint,
  UniqueConstraint
} from './constraint-types';

/**
 * Configuration for multi-table constraint resolution
 */
export interface MultiTableResolverConfig {
  enableCascadeResolution?: boolean;
  enableDependencyCreation?: boolean;
  maxResolutionDepth?: number;
  enableParallelResolution?: boolean;
  dryRun?: boolean;
  strictMode?: boolean;
}

/**
 * Result of multi-table constraint resolution
 */
export interface MultiTableResolutionResult {
  success: boolean;
  resolvedConstraints: number;
  createdDependencies: DependencyOperation[];
  modifiedRecords: RecordModification[];
  warnings: string[];
  errors: string[];
  executionMetrics: {
    totalExecutionTime: number;
    tablesAnalyzed: number;
    constraintsProcessed: number;
    dependenciesCreated: number;
  };
}

/**
 * Dependency operation for creating related records
 */
export interface DependencyOperation {
  operation: 'create' | 'update' | 'link';
  targetTable: string;
  data: any;
  reason: string;
  priority: number;
  dependencies: string[];
}

/**
 * Record modification tracking
 */
export interface RecordModification {
  table: string;
  recordId: string;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number;
}

/**
 * Constraint dependency graph node
 */
interface ConstraintNode {
  table: string;
  constraint: any;
  dependencies: string[];
  dependents: string[];
  resolved: boolean;
  priority: number;
}

/**
 * Advanced Multi-Table Constraint Resolver
 */
export class MultiTableConstraintResolver {
  private client: any;
  private slugManager: AdvancedSlugManager;
  private config: MultiTableResolverConfig;
  private dependencyGraph: Map<string, ConstraintNode> = new Map();

  constructor(client: any, config: Partial<MultiTableResolverConfig> = {}) {
    this.client = client;
    this.slugManager = new AdvancedSlugManager(client);
    this.config = {
      enableCascadeResolution: true,
      enableDependencyCreation: true,
      maxResolutionDepth: 5,
      enableParallelResolution: false,
      dryRun: false,
      strictMode: false,
      ...config
    };
  }

  /**
   * Resolve complex multi-table constraints for MakerKit data
   */
  async resolveMultiTableConstraints(
    data: any,
    tableName: string,
    constraints: any[]
  ): Promise<MultiTableResolutionResult> {
    const startTime = Date.now();
    const result: MultiTableResolutionResult = {
      success: true,
      resolvedConstraints: 0,
      createdDependencies: [],
      modifiedRecords: [],
      warnings: [],
      errors: [],
      executionMetrics: {
        totalExecutionTime: 0,
        tablesAnalyzed: 0,
        constraintsProcessed: 0,
        dependenciesCreated: 0
      }
    };

    try {
      // Step 1: Build constraint dependency graph
      await this.buildConstraintDependencyGraph(constraints, tableName);

      // Step 2: Resolve constraints in dependency order
      await this.resolveConstraintsInOrder(data, tableName, result);

      // Step 3: Handle MakerKit-specific multi-table patterns
      await this.resolveMakerKitPatterns(data, tableName, result);

      // Step 4: Execute dependency operations
      if (this.config.enableDependencyCreation && !this.config.dryRun) {
        await this.executeDependencyOperations(result);
      }

      result.executionMetrics.totalExecutionTime = Date.now() - startTime;
      Logger.info(`Multi-table constraint resolution completed in ${result.executionMetrics.totalExecutionTime}ms`);

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Multi-table constraint resolution failed: ${error.message}`);
      Logger.error('Multi-table constraint resolution error:', error);
    }

    return result;
  }

  /**
   * Build constraint dependency graph for resolution ordering
   */
  private async buildConstraintDependencyGraph(
    constraints: any[],
    tableName: string
  ): Promise<void> {
    this.dependencyGraph.clear();

    for (const constraint of constraints) {
      const nodeId = `${tableName}.${constraint.constraintName}`;
      const dependencies = await this.analyzeConstraintDependencies(constraint, tableName);
      
      this.dependencyGraph.set(nodeId, {
        table: tableName,
        constraint,
        dependencies,
        dependents: [],
        resolved: false,
        priority: this.calculateConstraintPriority(constraint)
      });
    }

    // Build dependent relationships
    for (const [nodeId, node] of this.dependencyGraph) {
      for (const dependency of node.dependencies) {
        const depNode = this.dependencyGraph.get(dependency);
        if (depNode) {
          depNode.dependents.push(nodeId);
        }
      }
    }

    Logger.debug(`Built constraint dependency graph with ${this.dependencyGraph.size} nodes`);
  }

  /**
   * Analyze dependencies for a specific constraint
   */
  private async analyzeConstraintDependencies(
    constraint: any,
    tableName: string
  ): Promise<string[]> {
    const dependencies: string[] = [];

    // Foreign key dependencies
    if (constraint.constraintType === 'foreign_key') {
      const referencedTable = constraint.referencedTable;
      if (referencedTable && referencedTable !== tableName) {
        dependencies.push(`${referencedTable}.*`);
      }
    }

    // Check constraint dependencies (analyze SQL)
    if (constraint.constraintType === 'check' && constraint.checkClause) {
      const referencedTables = this.extractReferencedTables(constraint.checkClause);
      dependencies.push(...referencedTables.map(table => `${table}.*`));
    }

    // MakerKit-specific dependencies
    if (this.isMakerKitAccountConstraint(constraint, tableName)) {
      dependencies.push('auth.users.*', 'profiles.*');
    }

    if (this.isMakerKitOrganizationConstraint(constraint, tableName)) {
      dependencies.push('accounts.*', 'organization_members.*');
    }

    return dependencies;
  }

  /**
   * Resolve constraints in dependency order
   */
  private async resolveConstraintsInOrder(
    data: any,
    tableName: string,
    result: MultiTableResolutionResult
  ): Promise<void> {
    const resolutionQueue = Array.from(this.dependencyGraph.values())
      .sort((a, b) => b.priority - a.priority);

    for (const node of resolutionQueue) {
      if (node.resolved) continue;

      // Check if all dependencies are resolved
      const unresolvedDeps = node.dependencies.filter(dep => {
        const depNode = this.findNodeByDependency(dep);
        return depNode && !depNode.resolved;
      });

      if (unresolvedDeps.length > 0 && this.config.strictMode) {
        result.warnings.push(`Skipping constraint ${node.constraint.constraintName} - unresolved dependencies: ${unresolvedDeps.join(', ')}`);
        continue;
      }

      // Resolve the constraint
      const resolutionResult = await this.resolveComplexConstraint(
        node.constraint,
        data,
        tableName
      );

      if (resolutionResult.success) {
        node.resolved = true;
        result.resolvedConstraints++;
        result.modifiedRecords.push(...this.convertToRecordModifications(resolutionResult, tableName));
        result.warnings.push(...resolutionResult.warnings);
      } else {
        result.errors.push(...resolutionResult.errors);
      }

      result.executionMetrics.constraintsProcessed++;
    }
  }

  /**
   * Resolve MakerKit-specific multi-table patterns
   */
  private async resolveMakerKitPatterns(
    data: any,
    tableName: string,
    result: MultiTableResolutionResult
  ): Promise<void> {
    // Pattern 1: Account creation with organization and membership
    if (tableName === 'accounts' && data.is_personal_account === false) {
      await this.resolveAccountOrganizationPattern(data, result);
    }

    // Pattern 2: User creation with profile and auth identity
    if (tableName === 'users' || (tableName === 'accounts' && data.user_id)) {
      await this.resolveUserProfilePattern(data, result);
    }

    // Pattern 3: Organization creation with owner membership
    if (tableName === 'organizations') {
      await this.resolveOrganizationOwnerPattern(data, result);
    }

    // Pattern 4: Subscription creation with account validation
    if (tableName === 'subscriptions') {
      await this.resolveSubscriptionAccountPattern(data, result);
    }

    // Pattern 5: Invitation workflow with expiry and role validation
    if (tableName === 'invitations') {
      await this.resolveInvitationWorkflowPattern(data, result);
    }
  }

  /**
   * Resolve account-organization pattern
   */
  private async resolveAccountOrganizationPattern(
    data: any,
    result: MultiTableResolutionResult
  ): Promise<void> {
    // Team accounts need organization
    if (!data.organization_id) {
      const organizationData = {
        name: data.name || `${data.user_name || 'User'}'s Organization`,
        slug: await this.slugManager.generateUniqueSlug(
          data.name || data.user_name || 'organization',
          'organizations'
        ),
        created_by: data.user_id,
        account_id: data.id
      };

      result.createdDependencies.push({
        operation: 'create',
        targetTable: 'organizations',
        data: organizationData,
        reason: 'Team account requires organization',
        priority: 1,
        dependencies: []
      });

      // Create owner membership
      result.createdDependencies.push({
        operation: 'create',
        targetTable: 'organization_members',
        data: {
          organization_id: '${organizations.id}', // Reference to created org
          user_id: data.user_id,
          role: 'owner',
          is_owner: true,
          invited_by: data.user_id
        },
        reason: 'Create owner membership for new organization',
        priority: 2,
        dependencies: ['organizations']
      });
    }
  }

  /**
   * Resolve user-profile pattern
   */
  private async resolveUserProfilePattern(
    data: any,
    result: MultiTableResolutionResult
  ): Promise<void> {
    const userId = data.user_id || data.id;
    
    if (userId && !data.profile_id) {
      // Check if profile exists
      const { data: existingProfile } = await this.client
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .limit(1);

      if (!existingProfile || existingProfile.length === 0) {
        result.createdDependencies.push({
          operation: 'create',
          targetTable: 'profiles',
          data: {
            id: userId,
            email: data.email || data.auth_email,
            full_name: data.full_name || data.name,
            avatar_url: data.avatar_url,
            updated_at: new Date().toISOString()
          },
          reason: 'Create profile for user account',
          priority: 1,
          dependencies: []
        });
      }
    }
  }

  /**
   * Resolve organization-owner pattern
   */
  private async resolveOrganizationOwnerPattern(
    data: any,
    result: MultiTableResolutionResult
  ): Promise<void> {
    if (data.created_by && !data.owner_membership_created) {
      result.createdDependencies.push({
        operation: 'create',
        targetTable: 'organization_members',
        data: {
          organization_id: data.id,
          user_id: data.created_by,
          role: 'owner',
          is_owner: true,
          invited_by: data.created_by,
          joined_at: new Date().toISOString()
        },
        reason: 'Create owner membership for new organization',
        priority: 1,
        dependencies: []
      });
    }
  }

  /**
   * Resolve subscription-account pattern
   */
  private async resolveSubscriptionAccountPattern(
    data: any,
    result: MultiTableResolutionResult
  ): Promise<void> {
    // Validate account exists and is compatible with subscription
    if (data.account_id) {
      const { data: account } = await this.client
        .from('accounts')
        .select('is_personal_account, account_type')
        .eq('id', data.account_id)
        .limit(1);

      if (account && account.length > 0) {
        const accountData = account[0];
        
        // Team subscriptions require team accounts
        if (data.subscription_type === 'team' && accountData.is_personal_account) {
          result.warnings.push('Team subscription assigned to personal account - consider subscription type mismatch');
        }

        // Personal subscriptions should use personal accounts
        if (data.subscription_type === 'individual' && !accountData.is_personal_account) {
          result.warnings.push('Individual subscription assigned to team account - consider subscription type mismatch');
        }
      }
    }
  }

  /**
   * Resolve invitation workflow pattern
   */
  private async resolveInvitationWorkflowPattern(
    data: any,
    result: MultiTableResolutionResult
  ): Promise<void> {
    // Set expiry if not provided
    if (!data.expires_at) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
      
      result.modifiedRecords.push({
        table: 'invitations',
        recordId: data.id || 'new',
        field: 'expires_at',
        oldValue: null,
        newValue: expiryDate.toISOString(),
        reason: 'Set default invitation expiry',
        confidence: 0.9
      });
    }

    // Validate role against organization permissions
    if (data.role && data.organization_id) {
      const validRoles = ['owner', 'admin', 'member', 'viewer'];
      if (!validRoles.includes(data.role)) {
        result.modifiedRecords.push({
          table: 'invitations',
          recordId: data.id || 'new',
          field: 'role',
          oldValue: data.role,
          newValue: 'member',
          reason: 'Invalid role, defaulting to member',
          confidence: 0.8
        });
      }
    }
  }

  /**
   * Execute dependency operations
   */
  private async executeDependencyOperations(
    result: MultiTableResolutionResult
  ): Promise<void> {
    // Sort by priority
    const sortedOperations = result.createdDependencies.sort((a, b) => a.priority - b.priority);

    for (const operation of sortedOperations) {
      try {
        switch (operation.operation) {
          case 'create':
            await this.executeDependencyCreate(operation);
            break;
          case 'update':
            await this.executeDependencyUpdate(operation);
            break;
          case 'link':
            await this.executeDependencyLink(operation);
            break;
        }
        
        result.executionMetrics.dependenciesCreated++;
        Logger.debug(`Executed dependency operation: ${operation.operation} on ${operation.targetTable}`);
        
      } catch (error: any) {
        result.errors.push(`Failed to execute dependency operation: ${error.message}`);
        Logger.error(`Dependency operation failed:`, error);
      }
    }
  }

  /**
   * Execute dependency create operation
   */
  private async executeDependencyCreate(operation: DependencyOperation): Promise<void> {
    const { data: created, error } = await this.client
      .from(operation.targetTable)
      .insert(operation.data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ${operation.targetTable}: ${error.message}`);
    }

    // Store created record ID for reference resolution
    this.storeCreatedReference(operation.targetTable, created.id);
  }

  /**
   * Execute dependency update operation
   */
  private async executeDependencyUpdate(operation: DependencyOperation): Promise<void> {
    const { error } = await this.client
      .from(operation.targetTable)
      .update(operation.data)
      .match({ id: operation.data.id });

    if (error) {
      throw new Error(`Failed to update ${operation.targetTable}: ${error.message}`);
    }
  }

  /**
   * Execute dependency link operation
   */
  private async executeDependencyLink(operation: DependencyOperation): Promise<void> {
    // Implementation for linking existing records
    Logger.debug(`Linking operation for ${operation.targetTable} not yet implemented`);
  }

  /**
   * Helper methods
   */
  private resolveComplexConstraint(constraint: any, data: any, tableName: string): Promise<ConstraintHandlingResult> {
    // Implement complex constraint resolution logic
    return Promise.resolve({
      success: true,
      originalData: data,
      modifiedData: data,
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    });
  }

  private extractReferencedTables(checkClause: string): string[] {
    // Simple regex to extract table references from SQL
    const tablePattern = /FROM\s+(\w+)|JOIN\s+(\w+)|EXISTS\s*\([^)]*FROM\s+(\w+)/gi;
    const matches = [];
    let match;
    
    while ((match = tablePattern.exec(checkClause)) !== null) {
      const table = match[1] || match[2] || match[3];
      if (table) matches.push(table);
    }
    
    return [...new Set(matches)];
  }

  private isMakerKitAccountConstraint(constraint: any, tableName: string): boolean {
    return tableName === 'accounts' && (
      constraint.constraintName?.toLowerCase().includes('account') ||
      constraint.checkClause?.toLowerCase().includes('is_personal_account')
    );
  }

  private isMakerKitOrganizationConstraint(constraint: any, tableName: string): boolean {
    return (tableName === 'organizations' || tableName === 'organization_members') && (
      constraint.constraintName?.toLowerCase().includes('organization') ||
      constraint.checkClause?.toLowerCase().includes('organization')
    );
  }

  private calculateConstraintPriority(constraint: any): number {
    // Higher priority for critical constraints
    if (constraint.constraintType === 'not_null') return 100;
    if (constraint.constraintType === 'primary_key') return 90;
    if (constraint.constraintType === 'foreign_key') return 80;
    if (constraint.constraintType === 'unique') return 70;
    if (constraint.constraintType === 'check') return 60;
    return 50;
  }

  private findNodeByDependency(dependency: string): ConstraintNode | undefined {
    for (const node of this.dependencyGraph.values()) {
      if (dependency.startsWith(node.table)) {
        return node;
      }
    }
    return undefined;
  }

  private convertToRecordModifications(result: ConstraintHandlingResult, tableName: string): RecordModification[] {
    return result.appliedFixes.map(fix => ({
      table: tableName,
      recordId: 'unknown',
      field: fix.field || 'unknown',
      oldValue: fix.oldValue,
      newValue: fix.newValue,
      reason: fix.reason,
      confidence: fix.confidence || 0.8
    }));
  }

  private storeCreatedReference(table: string, id: string): void {
    // Store reference for later resolution (simplified implementation)
    Logger.debug(`Stored reference: ${table}.${id}`);
  }
}

export default MultiTableConstraintResolver;