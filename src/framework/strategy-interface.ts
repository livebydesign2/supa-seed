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