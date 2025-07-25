/**
 * Framework Strategy Interface
 * Defines the contract for framework-specific seeding strategies
 */

import type { createClient } from '@supabase/supabase-js';

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

export interface ConstraintHandlingResult {
  data: any;
  appliedFixes: ConstraintFix[];
  warnings: string[];
}

export interface ConstraintFix {
  type: 'set_field' | 'remove_field' | 'transform_value';
  field: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
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