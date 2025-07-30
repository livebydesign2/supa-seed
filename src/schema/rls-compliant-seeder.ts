/**
 * RLS-Compliant Seeder
 * Implements user context-aware seeding that respects Row Level Security policies
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../core/utils/logger';
import { BusinessLogicAnalyzer } from '../features/analysis/business-logic-analyzer';
import { 
  RLSPolicyInfo, 
  BusinessLogicAnalysisResult,
  RLSComplianceOptions,
  UserContext,
  RLSComplianceResult,
  RLSValidationResult,
  RLSPolicyViolation,
  RLSFixSuggestion
} from '../features/analysis/business-logic-types';

type SupabaseClient = ReturnType<typeof createClient>;


export class RLSCompliantSeeder {
  private client: SupabaseClient;
  private serviceRoleClient?: SupabaseClient;
  private businessLogicAnalyzer: BusinessLogicAnalyzer;
  private options: RLSComplianceOptions;
  private cachedPolicies: RLSPolicyInfo[] = [];
  private currentUserContext?: UserContext;

  constructor(
    client: SupabaseClient, 
    serviceRoleClient?: SupabaseClient,
    options: Partial<RLSComplianceOptions> = {}
  ) {
    this.client = client;
    this.serviceRoleClient = serviceRoleClient;
    this.businessLogicAnalyzer = new BusinessLogicAnalyzer(client);
    
    this.options = {
      enableRLSCompliance: true,
      useServiceRole: false,
      createUserContext: true,
      bypassOnFailure: false,
      validateAfterInsert: true,
      logPolicyViolations: true,
      maxRetries: 3,
      ...options
    };
  }

  /**
   * Seed data with RLS compliance
   */
  async seedWithRLSCompliance(
    table: string,
    data: any[],
    userContext?: UserContext
  ): Promise<RLSComplianceResult> {
    Logger.info(`🔒 Starting RLS-compliant seeding for table: ${table}`);

    const result: RLSComplianceResult = {
      success: false,
      violatedPolicies: [],
      bypassesUsed: [],
      warnings: [],
      errors: [],
      insertedRecords: 0,
      validatedRecords: 0
    };

    try {
      // Check if RLS compliance is enabled
      if (!this.options.enableRLSCompliance) {
        Logger.debug('RLS compliance disabled, using direct seeding');
        return await this.seedDirectly(table, data, result);
      }

      // Get or create user context
      if (this.options.createUserContext && !userContext) {
        userContext = await this.createUserContext();
        result.userContext = userContext;
      }

      // Analyze RLS policies for the table
      const policies = await this.getRLSPoliciesForTable(table);
      
      if (policies.length === 0) {
        Logger.debug(`No RLS policies found for table ${table}, proceeding with normal seeding`);
        return await this.seedDirectly(table, data, result);
      }

      // Validate data against RLS policies
      const validation = await this.validateDataAgainstRLS(table, data, policies, userContext);
      
      if (!validation.isCompliant) {
        result.violatedPolicies = validation.violatedPolicies.map(v => v.policyName);
        
        if (this.options.logPolicyViolations) {
          Logger.warn(`RLS policy violations detected for table ${table}:`, validation.violatedPolicies);
        }

        // Try to fix violations or use bypass
        return await this.handleRLSViolations(table, data, validation, result, userContext);
      }

      // Seed with user context
      const insertResult = await this.seedWithUserContext(table, data, userContext);
      result.success = insertResult.success;
      result.insertedRecords = insertResult.insertedRecords;

      // Validate after insert if enabled
      if (this.options.validateAfterInsert) {
        const postValidation = await this.validateInsertedData(table, data, userContext);
        result.validatedRecords = postValidation.validatedRecords;
        
        if (!postValidation.success) {
          result.warnings.push('Post-insert validation failed for some records');
        }
      }

      Logger.success(`✅ RLS-compliant seeding completed for ${table}: ${result.insertedRecords} records`);
      return result;

    } catch (error: any) {
      Logger.error(`RLS-compliant seeding failed for ${table}:`, error);
      result.errors.push(error.message);
      
      // Try bypass if failure handling is enabled
      if (this.options.bypassOnFailure) {
        Logger.warn('Attempting RLS bypass due to failure');
        return await this.seedWithBypass(table, data, result);
      }

      return result;
    }
  }

  /**
   * Create user context for seeding
   */
  private async createUserContext(): Promise<UserContext> {
    Logger.debug('Creating user context for RLS-compliant seeding');

    try {
      // First, try to get current auth user
      const { data: { user }, error: authError } = await this.client.auth.getUser();

      if (user && !authError) {
        Logger.debug('Using existing authenticated user context');
        return {
          userId: user.id,
          email: user.email!,
          role: 'authenticated',
          metadata: user.user_metadata
        };
      }

      // Create a temporary user for seeding context
      const tempUserData = {
        email: `seed-user-${Date.now()}@example.com`,
        password: 'TempPassword123!',
        email_confirm: true,
        user_metadata: {
          name: 'Seed User',
          created_for: 'rls_compliant_seeding'
        }
      };

      const { data: newUser, error: createError } = await this.client.auth.admin.createUser(tempUserData);

      if (createError || !newUser.user) {
        throw new Error(`Failed to create user context: ${createError?.message}`);
      }

      Logger.debug(`Created temporary user context: ${newUser.user.email}`);

      return {
        userId: newUser.user.id,
        email: newUser.user.email!,
        role: 'authenticated',
        metadata: newUser.user.user_metadata
      };

    } catch (error: any) {
      Logger.error('Failed to create user context:', error);
      throw new Error(`User context creation failed: ${error.message}`);
    }
  }

  /**
   * Get RLS policies for a specific table
   */
  private async getRLSPoliciesForTable(table: string): Promise<RLSPolicyInfo[]> {
    // Use cached policies if available
    if (this.cachedPolicies.length > 0) {
      return this.cachedPolicies.filter(p => p.tableName === table);
    }

    try {
      // Get policies from business logic analyzer
      const analysis = await this.businessLogicAnalyzer.analyzeBusinessLogic();
      this.cachedPolicies = analysis.rlsPolicies;
      
      return this.cachedPolicies.filter(p => p.tableName === table);

    } catch (error: any) {
      Logger.warn(`Failed to get RLS policies for ${table}:`, error);
      return [];
    }
  }

  /**
   * Validate data against RLS policies
   */
  private async validateDataAgainstRLS(
    table: string,
    data: any[],
    policies: RLSPolicyInfo[],
    userContext?: UserContext
  ): Promise<RLSValidationResult> {
    const violations: RLSPolicyViolation[] = [];
    const suggestedFixes: RLSFixSuggestion[] = [];
    let requiresUserContext = false;

    for (const policy of policies) {
      if (policy.requiresUserContext && !userContext) {
        requiresUserContext = true;
        violations.push({
          policyName: policy.policyName,
          tableName: table,
          reason: 'Policy requires user context but none provided',
          severity: 'high',
          suggestedFix: 'Create user context before seeding'
        });
      }

      // Check policy conditions against data
      if (policy.using || policy.withCheck) {
        const violation = this.checkPolicyConditions(policy, data, userContext);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    // Generate fix suggestions
    if (violations.length > 0) {
      suggestedFixes.push(...this.generateFixSuggestions(violations, policies));
    }

    return {
      isCompliant: violations.length === 0,
      violatedPolicies: violations,
      suggestedFixes,
      requiresUserContext,
      bypassRecommended: violations.some(v => v.severity === 'critical')
    };
  }

  /**
   * Check policy conditions against data
   */
  private checkPolicyConditions(
    policy: RLSPolicyInfo,
    data: any[],
    userContext?: UserContext
  ): RLSPolicyViolation | null {
    // Simplified policy checking - in real implementation would parse SQL conditions
    const using = policy.using || '';
    const withCheck = policy.withCheck || '';

    // Check for auth.uid() requirements
    if ((using.includes('auth.uid()') || withCheck.includes('auth.uid()')) && !userContext) {
      return {
        policyName: policy.policyName,
        tableName: policy.tableName,
        reason: 'Policy requires auth.uid() but no user context provided',
        severity: 'high',
        suggestedFix: 'Provide user context or use service role'
      };
    }

    // Check for account_id/user_id requirements
    if (using.includes('account_id') || withCheck.includes('account_id')) {
      const hasAccountId = data.some(record => record.account_id);
      if (!hasAccountId) {
        return {
          policyName: policy.policyName,
          tableName: policy.tableName,
          reason: 'Policy requires account_id but data does not include it',
          severity: 'medium',
          suggestedFix: 'Add account_id to data records'
        };
      }
    }

    return null;
  }

  /**
   * Generate fix suggestions for RLS violations
   */
  private generateFixSuggestions(
    violations: RLSPolicyViolation[],
    policies: RLSPolicyInfo[]
  ): RLSFixSuggestion[] {
    const suggestions: RLSFixSuggestion[] = [];

    if (violations.some(v => v.reason.includes('user context'))) {
      suggestions.push({
        type: 'add_user_context',
        description: 'Create user context for RLS compliance',
        implementation: 'Enable createUserContext option or provide userContext parameter',
        riskLevel: 'low'
      });
    }

    if (violations.some(v => v.reason.includes('account_id'))) {
      suggestions.push({
        type: 'modify_data',
        description: 'Add required account_id to data records',
        implementation: 'Include account_id field in seeding data',
        riskLevel: 'low'
      });
    }

    suggestions.push({
      type: 'use_service_role',
      description: 'Use service role to bypass RLS policies',
      implementation: 'Configure SUPABASE_SERVICE_ROLE_KEY and enable useServiceRole',
      riskLevel: 'medium'
    });

    return suggestions;
  }

  /**
   * Handle RLS violations with fixes or bypass
   */
  private async handleRLSViolations(
    table: string,
    data: any[],
    validation: RLSValidationResult,
    result: RLSComplianceResult,
    userContext?: UserContext
  ): Promise<RLSComplianceResult> {
    Logger.debug(`Handling RLS violations for table ${table}`);

    // Try to apply suggested fixes
    for (const fix of validation.suggestedFixes) {
      if (fix.type === 'modify_data' && fix.riskLevel === 'low') {
        const fixedData = this.applyDataFixes(data, fix);
        if (fixedData.length > 0) {
          Logger.debug(`Applied data fix: ${fix.description}`);
          const retryResult = await this.seedWithUserContext(table, fixedData, userContext);
          if (retryResult.success) {
            result.success = true;
            result.insertedRecords = retryResult.insertedRecords;
            result.warnings.push(`Applied fix: ${fix.description}`);
            return result;
          }
        }
      }
    }

    // If fixes don't work and bypass is recommended, try service role
    if (validation.bypassRecommended || this.options.useServiceRole) {
      Logger.warn('Using service role bypass for RLS compliance');
      return await this.seedWithBypass(table, data, result);
    }

    // Log the violations and return failure
    result.errors.push('RLS policy violations could not be resolved');
    for (const violation of validation.violatedPolicies) {
      result.errors.push(`${violation.policyName}: ${violation.reason}`);
    }

    return result;
  }

  /**
   * Apply data fixes based on suggestions
   */
  private applyDataFixes(data: any[], fix: RLSFixSuggestion): any[] {
    // Simplified fix application - in real implementation would be more sophisticated
    if (fix.description.includes('account_id')) {
      return data.map(record => ({
        ...record,
        account_id: record.account_id || this.currentUserContext?.accountId || 'default-account-id'
      }));
    }

    return data;
  }

  /**
   * Seed with user context
   */
  private async seedWithUserContext(
    table: string,
    data: any[],
    userContext?: UserContext
  ): Promise<{ success: boolean; insertedRecords: number }> {
    try {
      // Set user context if available
      if (userContext) {
        Logger.debug(`Setting user context: ${userContext.email}`);
        this.currentUserContext = userContext;
      }

      // Insert data
      const { data: insertedData, error } = await this.client
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw error;
      }

      return {
        success: true,
        insertedRecords: insertedData?.length || 0
      };

    } catch (error: any) {
      Logger.error(`User context seeding failed for ${table}:`, error);
      return {
        success: false,
        insertedRecords: 0
      };
    }
  }

  /**
   * Seed directly without RLS compliance
   */
  private async seedDirectly(
    table: string,
    data: any[],
    result: RLSComplianceResult
  ): Promise<RLSComplianceResult> {
    try {
      const { data: insertedData, error } = await this.client
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw error;
      }

      result.success = true;
      result.insertedRecords = insertedData?.length || 0;
      result.warnings.push('RLS compliance was disabled');

      return result;

    } catch (error: any) {
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Seed with RLS bypass using service role
   */
  private async seedWithBypass(
    table: string,
    data: any[],
    result: RLSComplianceResult
  ): Promise<RLSComplianceResult> {
    if (!this.serviceRoleClient) {
      result.errors.push('Service role client not available for RLS bypass');
      return result;
    }

    try {
      Logger.debug(`Using service role bypass for table ${table}`);
      
      const { data: insertedData, error } = await this.serviceRoleClient
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw error;
      }

      result.success = true;
      result.insertedRecords = insertedData?.length || 0;
      result.bypassesUsed.push('service_role');
      result.warnings.push('Used service role to bypass RLS policies');

      return result;

    } catch (error: any) {
      result.errors.push(`Service role bypass failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Validate inserted data
   */
  private async validateInsertedData(
    table: string,
    originalData: any[],
    userContext?: UserContext
  ): Promise<{ success: boolean; validatedRecords: number }> {
    try {
      // Query inserted data to verify it's accessible with current context
      const { data: queriedData, error } = await this.client
        .from(table)
        .select('*')
        .limit(originalData.length);

      if (error) {
        Logger.warn(`Post-insert validation failed for ${table}:`, error);
        return { success: false, validatedRecords: 0 };
      }

      return {
        success: true,
        validatedRecords: queriedData?.length || 0
      };

    } catch (error: any) {
      Logger.warn(`Post-insert validation error for ${table}:`, error);
      return { success: false, validatedRecords: 0 };
    }
  }

  /**
   * Check if table has RLS enabled
   */
  async isRLSEnabled(table: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('pg_class')
        .select('relrowsecurity')
        .eq('relname', table)
        .single();

      if (error) {
        Logger.debug(`Could not check RLS status for ${table}:`, error);
        return false;
      }

      return Boolean(data?.relrowsecurity) || false;

    } catch (error: any) {
      Logger.debug(`RLS check failed for ${table}:`, error);
      return false;
    }
  }

  /**
   * Get RLS compliance recommendations
   */
  getComplianceRecommendations(analysisResult: BusinessLogicAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (analysisResult.rlsPolicies.length > 0) {
      recommendations.push('Enable RLS compliance mode for safer seeding');
      
      if (analysisResult.rlsPolicies.some(p => p.requiresUserContext)) {
        recommendations.push('Create user context before seeding RLS-protected tables');
      }

      if (analysisResult.rlsPolicies.some(p => p.command === 'INSERT')) {
        recommendations.push('Ensure seeding data includes required fields for RLS policies');
      }
    }

    return recommendations;
  }

  /**
   * Clear temporary user context
   */
  async clearUserContext(): Promise<void> {
    if (this.currentUserContext?.email.includes('seed-user-')) {
      try {
        await this.client.auth.admin.deleteUser(this.currentUserContext.userId);
        Logger.debug('Cleaned up temporary user context');
      } catch (error: any) {
        Logger.warn('Failed to cleanup temporary user context:', error);
      }
    }
    
    this.currentUserContext = undefined;
  }
}