/**
 * Framework Strategy Interface
 * Defines the contract for framework-specific seeding strategies
 */

import type { createClient } from '@supabase/supabase-js';
import type { 
  ConstraintHandler,
  ConstraintHandlingResult,
  ConstraintFix,
  TableConstraints,
  ConstraintDiscoveryResult 
} from '../schema/constraint-types';
import type {
  BusinessLogicAnalysisResult,
  RLSComplianceOptions,
  RLSComplianceResult,
  UserContext
} from '../schema/business-logic-types';
import type {
  RelationshipAnalysisResult
} from '../schema/relationship-analyzer';
import type {
  JunctionTableDetectionResult,
  JunctionSeedingOptions,
  JunctionSeedingResult
} from '../schema/junction-table-handler';
import type { DependencyGraph } from '../schema/dependency-graph';
import type {
  TenantDiscoveryResult,
  TenantSeedingResult,
  TenantIsolationReport,
  TenantDataGenerationOptions,
  TenantInfo,
  TenantScopeInfo
} from '../schema/tenant-types';
import type {
  StorageIntegrationResult,
  StorageConfig,
  StoragePermissionCheck,
  StorageQuotaInfo,
  MediaAttachment
} from '../storage/storage-types';

type SupabaseClient = ReturnType<typeof createClient>;

export interface DatabaseSchema {
  tables: TableInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
  constraints: ConstraintInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  relationships: RelationshipInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
}

export interface RelationshipInfo {
  type: 'foreign_key' | 'one_to_many' | 'many_to_many';
  targetTable: string;
  targetColumn: string;
  sourceColumn: string;
}

export interface FunctionInfo {
  name: string;
  schema: string;
  arguments: string[];
  returnType: string;
}

export interface TriggerInfo {
  name: string;
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  function: string;
}

export interface ConstraintInfo {
  name: string;
  table: string;
  type: 'check' | 'foreign_key' | 'unique' | 'primary_key';
  definition: string;
}

export interface FrameworkDetectionResult {
  framework: string;
  version?: string;
  confidence: number;
  detectedFeatures: string[];
  recommendations: string[];
}

export interface UserData {
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  password?: string;
  metadata?: Record<string, any>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// Re-export constraint types from schema module for consistency
export type { 
  ConstraintHandler,
  ConstraintHandlingResult,
  ConstraintFix,
  TableConstraints,
  ConstraintDiscoveryResult 
} from '../schema/constraint-types';

export interface StrategyConstraintResult {
  success: boolean;
  tables: TableConstraints[];
  totalConstraints: number;
  confidence: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  businessRules?: BusinessRule[]; // Optional for backward compatibility
}

export interface BusinessRule {
  id: string;
  name: string;
  type: 'validation' | 'transformation' | 'dependency' | 'business_logic';
  table: string;
  condition: string;
  action: 'allow' | 'deny' | 'modify' | 'require';
  errorMessage?: string;
  autoFix?: {
    type: 'set_field' | 'create_dependency' | 'skip_operation' | 'modify_workflow' | 'sql' | 'config' | 'data_modification';
    description: string;
    sql?: string;
    confidence: number;
    impact?: 'low' | 'medium' | 'high';
  };
  confidence: number;
  sqlPattern: string;
  dependencies: string[];
}

export interface SeedingStrategy {
  /**
   * Unique name for this strategy
   */
  name: string;

  /**
   * Detect if this strategy applies to the given database schema
   */
  detect(schema: DatabaseSchema): Promise<FrameworkDetectionResult>;

  /**
   * Create a user using the framework's intended flow
   */
  createUser(data: UserData): Promise<User>;

  /**
   * Handle constraints for a specific table and data
   */
  handleConstraints(table: string, data: any): Promise<ConstraintHandlingResult>;

  /**
   * Discover and analyze constraints for this strategy
   */
  discoverConstraints?(tableNames?: string[]): Promise<StrategyConstraintResult>;

  /**
   * Get framework-specific constraint handlers
   */
  getConstraintHandlers?(): ConstraintHandler[];

  /**
   * Apply constraint-aware data transformation
   */
  applyConstraintFixes?(table: string, data: any, constraints: TableConstraints): Promise<ConstraintHandlingResult>;

  /**
   * Analyze business logic patterns for this strategy
   */
  analyzeBusinessLogic?(): Promise<BusinessLogicAnalysisResult>;

  /**
   * Seed data with RLS compliance
   */
  seedWithRLSCompliance?(table: string, data: any[], userContext?: UserContext): Promise<RLSComplianceResult>;

  /**
   * Get RLS compliance options for this strategy
   */
  getRLSComplianceOptions?(): RLSComplianceOptions;

  /**
   * Analyze database relationships for dependency-aware seeding
   */
  analyzeRelationships?(): Promise<RelationshipAnalysisResult>;

  /**
   * Get dependency graph for seeding order optimization
   */
  getDependencyGraph?(): Promise<DependencyGraph>;

  /**
   * Detect and handle junction tables for many-to-many relationships
   */
  detectJunctionTables?(): Promise<JunctionTableDetectionResult>;

  /**
   * Seed junction tables with proper relationship data
   */
  seedJunctionTable?(tableName: string, options?: Partial<JunctionSeedingOptions>): Promise<JunctionSeedingResult>;

  /**
   * Get optimal seeding order based on dependencies
   */
  getSeedingOrder?(): Promise<string[]>;

  /**
   * Discover tenant-scoped tables and relationships
   */
  discoverTenantScopes?(): Promise<TenantDiscoveryResult>;

  /**
   * Create tenant-aware data with proper tenant isolation
   */
  createTenantScopedData?(tenantId: string, tableName: string, data: any[], options?: Partial<TenantDataGenerationOptions>): Promise<any[]>;

  /**
   * Generate tenant accounts (personal and team)
   */
  generateTenantAccounts?(count: number, options?: Partial<TenantDataGenerationOptions>): Promise<TenantInfo[]>;

  /**
   * Validate tenant boundary isolation
   */
  validateTenantIsolation?(tenantId: string): Promise<TenantIsolationReport>;

  /**
   * Seed data across multiple tenants with proper isolation
   */
  seedMultiTenantData?(tenants: TenantInfo[], options?: Partial<TenantDataGenerationOptions>): Promise<TenantSeedingResult>;

  /**
   * Get tenant scope information for a table
   */
  getTenantScopeInfo?(tableName: string): Promise<TenantScopeInfo | null>;

  /**
   * Integrate with Supabase Storage for file uploads and media management
   */
  integrateWithStorage?(setupId: string, accountId?: string, config?: Partial<StorageConfig>): Promise<StorageIntegrationResult>;

  /**
   * Check storage permissions and RLS compliance
   */
  checkStoragePermissions?(bucketName: string): Promise<StoragePermissionCheck>;

  /**
   * Get storage quota and usage information
   */
  getStorageQuota?(bucketName: string): Promise<StorageQuotaInfo>;

  /**
   * Generate and upload media attachments for a specific entity
   */
  generateMediaAttachments?(entityId: string, entityType: string, count?: number, config?: Partial<StorageConfig>): Promise<MediaAttachment[]>;

  /**
   * Get framework-specific storage configuration
   */
  getStorageConfig?(): Partial<StorageConfig>;

  /**
   * Get recommendations for using this strategy
   */
  getRecommendations(): string[];

  /**
   * Check if this strategy supports a specific feature
   */
  supportsFeature(feature: string): boolean;

  /**
   * Initialize the strategy with a Supabase client
   */
  initialize(client: SupabaseClient): Promise<void>;

  /**
   * Get the priority of this strategy (higher = more specific)
   */
  getPriority(): number;
}

export interface SeedingOptions {
  enableConstraintHandling?: boolean;
  enableBusinessLogicRespect?: boolean;
  enableRLSCompliance?: boolean;
  enableMultiTenant?: boolean;
  customMappings?: Record<string, Record<string, string>>;
  debug?: boolean;
}

export interface SeedingResult {
  success: boolean;
  data?: any;
  errors: string[];
  warnings: string[];
  appliedFixes: ConstraintFix[];
  strategy: string;
  executionTime: number;
}