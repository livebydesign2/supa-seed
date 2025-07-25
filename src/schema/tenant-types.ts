/**
 * Multi-Tenant Architecture Types
 * Types and interfaces for tenant-aware seeding
 */

export interface TenantInfo {
  id: string;
  type: 'personal' | 'team' | 'organization';
  isPersonalAccount: boolean;
  slug: string | null;
  name: string;
  email?: string;
  ownerId?: string;
  createdAt: string;
  metadata: TenantMetadata;
}

export interface TenantMetadata {
  memberCount: number;
  plan: 'free' | 'pro' | 'enterprise';
  features: string[];
  settings: Record<string, any>;
  limits: TenantLimits;
}

export interface TenantLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorage: number; // in bytes
  maxApiCalls: number;
}

export interface TenantScopeInfo {
  tableName: string;
  schema: string;
  tenantColumn: string; // usually 'account_id' or 'tenant_id'
  isTenantScoped: boolean;
  confidence: number;
  scopeType: 'strict' | 'optional' | 'shared';
  metadata: TenantScopeMetadata;
}

export interface TenantScopeMetadata {
  hasRLS: boolean;
  rlsPolicies: string[];
  foreignKeys: TenantForeignKey[];
  constraints: string[];
  triggers: string[];
  isMultiTenant: boolean;
}

export interface TenantForeignKey {
  constraintName: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: string;
  onUpdate: string;
  isTenantReference: boolean;
}

export interface TenantBoundaryValidation {
  isValid: boolean;
  violations: TenantViolation[];
  warnings: string[];
  recommendations: string[];
  isolationScore: number; // 0-1, how well isolated the tenant data is
}

export interface TenantViolation {
  type: 'cross_tenant_reference' | 'missing_tenant_id' | 'invalid_tenant_scope' | 'rls_bypass';
  severity: 'error' | 'warning' | 'info';
  tableName: string;
  recordId?: string;
  description: string;
  suggestedFix: string;
  affectedFields: string[];
}

export interface TenantDataGenerationOptions {
  // Tenant configuration
  generatePersonalAccounts: boolean;
  generateTeamAccounts: boolean;
  personalAccountRatio: number; // 0-1
  
  // Data distribution
  dataDistributionStrategy: 'even' | 'realistic' | 'skewed';
  crossTenantDataAllowed: boolean;
  sharedResourcesEnabled: boolean;
  
  // Account types
  accountTypes: AccountTypeConfig[];
  
  // Data volumes per tenant
  minUsersPerTenant: number;
  maxUsersPerTenant: number;
  minProjectsPerTenant: number;
  maxProjectsPerTenant: number;
  
  // Relationships
  allowCrossTenantRelationships: boolean;
  sharedTables: string[]; // Tables that can be shared across tenants
  
  // Business logic
  respectTenantPlans: boolean;
  enforceTenantLimits: boolean;
}

export interface AccountTypeConfig {
  type: 'personal' | 'team' | 'organization';
  weight: number; // relative probability of generating this type
  settings: {
    minMembers?: number;
    maxMembers?: number;
    defaultPlan: 'free' | 'pro' | 'enterprise';
    features: string[];
  };
}

export interface TenantSeedingResult {
  success: boolean;
  tenantsCreated: number;
  personalAccounts: number;
  teamAccounts: number;
  totalRecords: number;
  tenantScopedRecords: number;
  crossTenantReferences: number;
  validationResult: TenantBoundaryValidation;
  executionTime: number;
  errors: string[];
  warnings: string[];
  tenantDetails: TenantSeedingDetails[];
}

export interface TenantSeedingDetails {
  tenantId: string;
  tenantType: 'personal' | 'team' | 'organization';
  recordsCreated: number;
  tablesSeeded: string[];
  relationships: number;
  isolationScore: number;
  errors: string[];
  warnings: string[];
}

export interface TenantDiscoveryResult {
  success: boolean;
  tenantScopedTables: TenantScopeInfo[];
  sharedTables: string[];
  tenantColumn: string; // most common tenant column name
  confidence: number;
  recommendations: string[];
  errors: string[];
  warnings: string[];
  metadata: {
    totalTables: number;
    tenantScopedCount: number;
    sharedCount: number;
    averageConfidence: number;
    detectionMethod: 'column_analysis' | 'rls_analysis' | 'constraint_analysis' | 'hybrid';
  };
}

export interface TenantIsolationReport {
  tenantId: string;
  tenantType: 'personal' | 'team' | 'organization';
  isolationScore: number; // 0-1
  violations: TenantViolation[];
  recommendations: string[];
  dataBreakdown: {
    totalRecords: number;
    ownedRecords: number;
    accessibleRecords: number;
    crossTenantRecords: number;
  };
  tableBreakdown: Record<string, {
    totalRecords: number;
    ownedRecords: number;
    violations: number;
  }>;
}

// Utility types for MakerKit specific patterns
export interface MakerKitTenantPattern {
  accountsTable: string;
  profilesTable: string;
  accountIdColumn: string;
  personalAccountConstraint: string;
  slugConstraint: string;
  setupFunction: string;
}

export interface TenantSeederConfig {
  enableMultiTenant: boolean;
  tenantColumn: string;
  tenantScopeDetection: 'auto' | 'manual';
  manualTenantScopes: Record<string, TenantScopeInfo>;
  validationEnabled: boolean;
  strictIsolation: boolean;
  allowSharedResources: boolean;
  dataGenerationOptions: TenantDataGenerationOptions;
}

// Constants for common tenant patterns
export const COMMON_TENANT_COLUMNS = [
  'account_id',
  'tenant_id', 
  'org_id',
  'organization_id',
  'team_id',
  'workspace_id',
  'company_id'
];

export const MAKERKIT_TENANT_PATTERN: MakerKitTenantPattern = {
  accountsTable: 'accounts',
  profilesTable: 'profiles',
  accountIdColumn: 'account_id',
  personalAccountConstraint: 'accounts_slug_null_if_personal_account_true',
  slugConstraint: 'accounts_slug_check',
  setupFunction: 'kit.setup_new_user'
};

export const DEFAULT_TENANT_GENERATION_OPTIONS: TenantDataGenerationOptions = {
  generatePersonalAccounts: true,
  generateTeamAccounts: true,
  personalAccountRatio: 0.6, // 60% personal, 40% team
  dataDistributionStrategy: 'realistic',
  crossTenantDataAllowed: false,
  sharedResourcesEnabled: true,
  accountTypes: [
    {
      type: 'personal',
      weight: 0.6,
      settings: {
        defaultPlan: 'free',
        features: ['basic_features']
      }
    },
    {
      type: 'team',
      weight: 0.35,
      settings: {
        minMembers: 2,
        maxMembers: 10,
        defaultPlan: 'pro',
        features: ['team_features', 'collaboration']
      }
    },
    {
      type: 'organization',
      weight: 0.05,
      settings: {
        minMembers: 10,
        maxMembers: 100,
        defaultPlan: 'enterprise',
        features: ['enterprise_features', 'advanced_security']
      }
    }
  ],
  minUsersPerTenant: 1,
  maxUsersPerTenant: 5,
  minProjectsPerTenant: 1,
  maxProjectsPerTenant: 3,
  allowCrossTenantRelationships: false,
  sharedTables: ['plans', 'features', 'regions'],
  respectTenantPlans: true,
  enforceTenantLimits: true
};