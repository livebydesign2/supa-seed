/**
 * Multi-Tenant Data Manager
 * Handles tenant-scoped data creation, validation, and isolation
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../core/utils/logger';
import {
  TenantInfo,
  TenantScopeInfo,
  TenantBoundaryValidation,
  TenantViolation,
  TenantDataGenerationOptions,
  TenantSeedingResult,
  TenantDiscoveryResult,
  TenantIsolationReport,
  TenantSeederConfig,
  COMMON_TENANT_COLUMNS,
  MAKERKIT_TENANT_PATTERN,
  DEFAULT_TENANT_GENERATION_OPTIONS
} from './tenant-types';

type SupabaseClient = ReturnType<typeof createClient>;

export class MultiTenantManager {
  private client: SupabaseClient;
  private config: TenantSeederConfig;
  private detectedTenantScopes: Map<string, TenantScopeInfo> = new Map();
  private tenantCache: Map<string, TenantInfo> = new Map();

  constructor(client: SupabaseClient, config: Partial<TenantSeederConfig> = {}) {
    this.client = client;
    this.config = {
      enableMultiTenant: true,
      tenantColumn: 'account_id',
      tenantScopeDetection: 'auto',
      manualTenantScopes: {},
      validationEnabled: true,
      strictIsolation: true,
      allowSharedResources: true,
      dataGenerationOptions: DEFAULT_TENANT_GENERATION_OPTIONS,
      ...config
    };
  }

  /**
   * Discover tenant-scoped tables in the database
   */
  async discoverTenantScopes(): Promise<TenantDiscoveryResult> {
    Logger.info('🏢 Discovering tenant-scoped tables...');

    try {
      const tenantScopedTables: TenantScopeInfo[] = [];
      const sharedTables: string[] = [];
      let totalConfidence = 0;

      // Get all tables in the schema
      const { data: tables, error } = await this.client
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error || !tables) {
        throw new Error(`Failed to get table list: ${error?.message}`);
      }

      // Analyze each table for tenant scope indicators
      for (const table of tables as any[]) {
        const tableName = table.table_name as string;
        
        // Skip system tables
        if (tableName.startsWith('_') || tableName.includes('schema_migrations')) {
          continue;
        }

        const scopeInfo = await this.analyzeTenantScope(tableName, 'public');
        
        if (scopeInfo.isTenantScoped) {
          tenantScopedTables.push(scopeInfo);
          this.detectedTenantScopes.set(tableName, scopeInfo);
          totalConfidence += scopeInfo.confidence;
          Logger.debug(`✅ Tenant-scoped table detected: ${tableName} (${scopeInfo.tenantColumn})`);
        } else {
          sharedTables.push(tableName);
          Logger.debug(`📋 Shared table: ${tableName}`);
        }
      }

      const averageConfidence = tenantScopedTables.length > 0 
        ? totalConfidence / tenantScopedTables.length 
        : 0;

      const recommendations = this.generateTenantRecommendations(tenantScopedTables, sharedTables);

      Logger.success(`🏢 Tenant scope discovery completed: ${tenantScopedTables.length} tenant-scoped tables found`);

      return {
        success: true,
        tenantScopedTables,
        sharedTables,
        tenantColumn: this.config.tenantColumn,
        confidence: averageConfidence,
        recommendations,
        errors: [],
        warnings: [],
        metadata: {
          totalTables: tables.length,
          tenantScopedCount: tenantScopedTables.length,
          sharedCount: sharedTables.length,
          averageConfidence,
          detectionMethod: 'column_analysis'
        }
      };

    } catch (error: any) {
      Logger.error('Tenant scope discovery failed:', error);
      return {
        success: false,
        tenantScopedTables: [],
        sharedTables: [],
        tenantColumn: this.config.tenantColumn,
        confidence: 0,
        recommendations: [],
        errors: [error.message],
        warnings: [],
        metadata: {
          totalTables: 0,
          tenantScopedCount: 0,
          sharedCount: 0,
          averageConfidence: 0,
          detectionMethod: 'column_analysis'
        }
      };
    }
  }

  /**
   * Analyze a specific table for tenant scope indicators
   */
  private async analyzeTenantScope(tableName: string, schema: string): Promise<TenantScopeInfo> {
    try {
      // Get column information
      const { data: columns, error } = await this.client
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', tableName)
        .eq('table_schema', schema);

      if (error || !columns) {
        return this.createDefaultScopeInfo(tableName, schema, false, 0);
      }

      const columnNames = (columns as any[]).map(col => col.column_name as string);
      
      // Check for tenant columns
      let tenantColumn = '';
      let confidence = 0;

      for (const candidate of COMMON_TENANT_COLUMNS) {
        if (columnNames.includes(candidate)) {
          tenantColumn = candidate;
          confidence += 0.4;
          break;
        }
      }

      // Check for RLS policies
      const hasRLS = await this.checkRLSPolicies(tableName, schema);
      if (hasRLS) {
        confidence += 0.3;
      }

      // Check for foreign key relationships to accounts/tenants
      const tenantForeignKeys = await this.getTenantForeignKeys(tableName, schema);
      if (tenantForeignKeys.length > 0) {
        confidence += 0.3;
        if (!tenantColumn) {
          tenantColumn = tenantForeignKeys[0].fromColumn;
        }
      }

      // Boost confidence for specific patterns (MakerKit)
      if (tableName === 'accounts' || tableName === 'profiles') {
        confidence += 0.2;
      }

      const isTenantScoped = confidence > 0.3 && tenantColumn !== '';

      return {
        tableName,
        schema,
        tenantColumn,
        isTenantScoped,
        confidence: Math.min(confidence, 1.0),
        scopeType: confidence > 0.7 ? 'strict' : 'optional',
        metadata: {
          hasRLS,
          rlsPolicies: [], // Would populate in full implementation
          foreignKeys: tenantForeignKeys,
          constraints: [],
          triggers: [],
          isMultiTenant: isTenantScoped
        }
      };

    } catch (error: any) {
      Logger.warn(`Failed to analyze tenant scope for ${tableName}:`, error);
      return this.createDefaultScopeInfo(tableName, schema, false, 0);
    }
  }

  /**
   * Check if table has RLS policies
   */
  private async checkRLSPolicies(tableName: string, schema: string): Promise<boolean> {
    try {
      const { data: policies, error } = await this.client
        .from('pg_policies')
        .select('policyname')
        .eq('tablename', tableName)
        .eq('schemaname', schema);

      return !error && (policies?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get tenant-related foreign keys for a table
   */
  private async getTenantForeignKeys(tableName: string, schema: string): Promise<any[]> {
    try {
      const { data: constraints, error } = await this.client
        .from('information_schema.key_column_usage')
        .select(`
          constraint_name,
          column_name,
          referenced_table_name,
          referenced_column_name
        `)
        .eq('table_name', tableName)
        .eq('table_schema', schema)
        .in('referenced_table_name', ['accounts', 'tenants', 'organizations']);

      return constraints || [];
    } catch {
      return [];
    }
  }

  /**
   * Create tenant-scoped data with proper account_id assignment
   */
  async createTenantScopedData(
    tableName: string,
    tenantId: string,
    data: any[],
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<any[]> {
    Logger.debug(`🏢 Creating tenant-scoped data for ${tableName} (tenant: ${tenantId})`);

    const scopeInfo = this.detectedTenantScopes.get(tableName);
    if (!scopeInfo || !scopeInfo.isTenantScoped) {
      Logger.warn(`Table ${tableName} is not tenant-scoped, inserting without tenant assignment`);
      return data;
    }

    // Add tenant ID to all records
    const tenantScopedData = data.map(record => ({
      ...record,
      [scopeInfo.tenantColumn]: tenantId,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString()
    }));

    // Validate tenant boundaries if enabled
    if (this.config.validationEnabled) {
      const validation = await this.validateTenantBoundaries(tableName, tenantScopedData);
      if (!validation.isValid) {
        Logger.warn(`Tenant boundary validation failed for ${tableName}:`, validation.violations);
        if (this.config.strictIsolation) {
          throw new Error(`Strict tenant isolation violation in ${tableName}`);
        }
      }
    }

    return tenantScopedData;
  }

  /**
   * Validate tenant boundaries for data
   */
  async validateTenantBoundaries(
    tableName: string,
    data: any[]
  ): Promise<TenantBoundaryValidation> {
    const violations: TenantViolation[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const scopeInfo = this.detectedTenantScopes.get(tableName);
    if (!scopeInfo) {
      return {
        isValid: true,
        violations,
        warnings: ['Table not analyzed for tenant scope'],
        recommendations,
        isolationScore: 0.5
      };
    }

    // Check for missing tenant IDs
    const missingTenantIds = data.filter(record => !record[scopeInfo.tenantColumn]);
    if (missingTenantIds.length > 0) {
      violations.push({
        type: 'missing_tenant_id',
        severity: 'error',
        tableName,
        description: `${missingTenantIds.length} records missing ${scopeInfo.tenantColumn}`,
        suggestedFix: `Add ${scopeInfo.tenantColumn} to all records`,
        affectedFields: [scopeInfo.tenantColumn]
      });
    }

    // Check for cross-tenant references
    const tenantIds = new Set(data.map(record => record[scopeInfo.tenantColumn]).filter(Boolean));
    if (tenantIds.size > 1 && !this.config.dataGenerationOptions.allowCrossTenantRelationships) {
      violations.push({
        type: 'cross_tenant_reference',
        severity: 'warning',
        tableName,
        description: `Data spans multiple tenants: ${Array.from(tenantIds).join(', ')}`,
        suggestedFix: 'Ensure data belongs to single tenant per operation',
        affectedFields: [scopeInfo.tenantColumn]
      });
    }

    // Calculate isolation score
    const recordsWithTenantId = data.length - missingTenantIds.length;
    const isolationScore = data.length > 0 ? recordsWithTenantId / data.length : 1.0;

    const isValid = violations.filter(v => v.severity === 'error').length === 0;

    return {
      isValid,
      violations,
      warnings,
      recommendations,
      isolationScore
    };
  }

  /**
   * Generate tenant accounts (personal and team)
   */
  async generateTenantAccounts(
    count: number,
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<TenantInfo[]> {
    Logger.info(`🏢 Generating ${count} tenant accounts...`);

    const opts = { ...DEFAULT_TENANT_GENERATION_OPTIONS, ...options };
    const tenants: TenantInfo[] = [];

    const personalAccountCount = Math.floor(count * opts.personalAccountRatio);
    const teamAccountCount = count - personalAccountCount;

    // Generate personal accounts
    for (let i = 0; i < personalAccountCount; i++) {
      const tenant = await this.generatePersonalAccount(i);
      tenants.push(tenant);
      this.tenantCache.set(tenant.id, tenant);
    }

    // Generate team accounts
    for (let i = 0; i < teamAccountCount; i++) {
      const tenant = await this.generateTeamAccount(i);
      tenants.push(tenant);
      this.tenantCache.set(tenant.id, tenant);
    }

    Logger.success(`✅ Generated ${tenants.length} tenant accounts (${personalAccountCount} personal, ${teamAccountCount} team)`);
    return tenants;
  }

  /**
   * Generate a personal account
   */
  private async generatePersonalAccount(index: number): Promise<TenantInfo> {
    const id = `tenant_personal_${index + 1}`;
    const email = `user${index + 1}@supaseed.test`;
    
    return {
      id,
      type: 'personal',
      isPersonalAccount: true,
      slug: null, // Personal accounts have null slug in MakerKit
      name: `Personal Account ${index + 1}`,
      email,
      createdAt: new Date().toISOString(),
      metadata: {
        memberCount: 1,
        plan: 'free',
        features: ['basic_features'],
        settings: {
          theme: 'light',
          notifications: true
        },
        limits: {
          maxUsers: 1,
          maxProjects: 3,
          maxStorage: 1024 * 1024 * 100, // 100MB
          maxApiCalls: 1000
        }
      }
    };
  }

  /**
   * Generate a team account
   */
  private async generateTeamAccount(index: number): Promise<TenantInfo> {
    const id = `tenant_team_${index + 1}`;
    const slug = `team-${index + 1}`;
    
    return {
      id,
      type: 'team',
      isPersonalAccount: false,
      slug,
      name: `Team Account ${index + 1}`,
      createdAt: new Date().toISOString(),
      metadata: {
        memberCount: Math.floor(Math.random() * 8) + 2, // 2-10 members
        plan: 'pro',
        features: ['team_features', 'collaboration', 'advanced_analytics'],
        settings: {
          theme: 'light',
          notifications: true,
          teamFeatures: true
        },
        limits: {
          maxUsers: 10,
          maxProjects: 20,
          maxStorage: 1024 * 1024 * 1024, // 1GB
          maxApiCalls: 10000
        }
      }
    };
  }

  /**
   * Create tenant isolation report
   */
  async createTenantIsolationReport(tenantId: string): Promise<TenantIsolationReport> {
    Logger.info(`📊 Creating tenant isolation report for: ${tenantId}`);

    const tenant = this.tenantCache.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found in cache`);
    }

    const violations: TenantViolation[] = [];
    const tableBreakdown: Record<string, any> = {};
    let totalRecords = 0;
    let ownedRecords = 0;

    // Analyze each tenant-scoped table
    for (const [tableName, scopeInfo] of this.detectedTenantScopes) {
      try {
        const { data: records } = await this.client
          .from(tableName)
          .select('*')
          .eq(scopeInfo.tenantColumn, tenantId);

        const recordCount = records?.length || 0;
        totalRecords += recordCount;
        ownedRecords += recordCount;

        tableBreakdown[tableName] = {
          totalRecords: recordCount,
          ownedRecords: recordCount,
          violations: 0
        };

      } catch (error: any) {
        Logger.warn(`Failed to analyze ${tableName} for tenant ${tenantId}:`, error);
      }
    }

    const isolationScore = totalRecords > 0 ? ownedRecords / totalRecords : 1.0;

    return {
      tenantId,
      tenantType: tenant.type,
      isolationScore,
      violations,
      recommendations: this.generateIsolationRecommendations(isolationScore, violations),
      dataBreakdown: {
        totalRecords,
        ownedRecords,
        accessibleRecords: ownedRecords, // Simplified
        crossTenantRecords: 0
      },
      tableBreakdown
    };
  }

  /**
   * Helper methods
   */
  private createDefaultScopeInfo(
    tableName: string, 
    schema: string, 
    isTenantScoped: boolean, 
    confidence: number
  ): TenantScopeInfo {
    return {
      tableName,
      schema,
      tenantColumn: this.config.tenantColumn,
      isTenantScoped,
      confidence,
      scopeType: 'optional',
      metadata: {
        hasRLS: false,
        rlsPolicies: [],
        foreignKeys: [],
        constraints: [],
        triggers: [],
        isMultiTenant: isTenantScoped
      }
    };
  }

  private generateTenantRecommendations(
    tenantScoped: TenantScopeInfo[],
    shared: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (tenantScoped.length > 0) {
      recommendations.push(`Detected ${tenantScoped.length} tenant-scoped tables - enable multi-tenant mode`);
      recommendations.push('Ensure all tenant-scoped data includes proper tenant identifiers');
    }

    if (shared.length > 0) {
      recommendations.push(`${shared.length} shared tables detected - consider if they need tenant scoping`);
    }

    const lowConfidenceTables = tenantScoped.filter(t => t.confidence < 0.7);
    if (lowConfidenceTables.length > 0) {
      recommendations.push(`${lowConfidenceTables.length} tables have low tenant confidence - verify manually`);
    }

    return recommendations;
  }

  private generateIsolationRecommendations(
    isolationScore: number,
    violations: TenantViolation[]
  ): string[] {
    const recommendations: string[] = [];

    if (isolationScore < 0.8) {
      recommendations.push('Tenant isolation score is low - review data access patterns');
    }

    if (violations.length > 0) {
      recommendations.push(`${violations.length} tenant violations found - address before production`);
    }

    recommendations.push('Regularly audit tenant data isolation for security compliance');

    return recommendations;
  }

  /**
   * Public getters
   */
  getTenantScopeInfo(tableName: string): TenantScopeInfo | undefined {
    return this.detectedTenantScopes.get(tableName);
  }

  getAllTenantScopes(): TenantScopeInfo[] {
    return Array.from(this.detectedTenantScopes.values());
  }

  getTenantInfo(tenantId: string): TenantInfo | undefined {
    return this.tenantCache.get(tenantId);
  }

  getAllTenants(): TenantInfo[] {
    return Array.from(this.tenantCache.values());
  }

  getConfig(): TenantSeederConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TenantSeederConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}