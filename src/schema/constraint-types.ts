/**
 * Constraint Discovery Types
 * Type definitions for PostgreSQL constraint discovery and handling
 */

export interface TableConstraints {
  table: string;
  schema: string;
  checkConstraints: CheckConstraint[];
  foreignKeyConstraints: ForeignKeyConstraint[];
  uniqueConstraints: UniqueConstraint[];
  primaryKeyConstraints: PrimaryKeyConstraint[];
  notNullConstraints: NotNullConstraint[];
  confidence: number;
  discoveryTimestamp: string;
  schemaVersion?: string;
}

export interface CheckConstraint {
  constraintName: string;
  table: string;
  schema: string;
  checkClause: string;
  isEnforced: boolean;
  description?: string;
  handler?: ConstraintHandler;
}

export interface ForeignKeyConstraint {
  constraintName: string;
  table: string;
  schema: string;
  columnName: string;
  referencedTable: string;
  referencedSchema: string;
  referencedColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  isEnforced: boolean;
  handler?: ConstraintHandler;
}

export interface UniqueConstraint {
  constraintName: string;
  table: string;
  schema: string;
  columns: string[];
  isEnforced: boolean;
  isPrimaryKey: boolean;
  handler?: ConstraintHandler;
}

export interface PrimaryKeyConstraint {
  constraintName: string;
  table: string;
  schema: string;
  columns: string[];
  handler?: ConstraintHandler;
}

export interface NotNullConstraint {
  columnName: string;
  table: string;
  schema: string;
  isEnforced: boolean;
  handler?: ConstraintHandler;
}

export interface ConstraintHandler {
  id: string;
  type: ConstraintType;
  priority: number;
  description: string;
  canHandle: (constraint: any, data: any) => boolean;
  handle: (constraint: any, data: any) => ConstraintHandlingResult;
  generateFix?: (constraint: any, data: any) => ConstraintFix;
}

export interface ConstraintHandlingResult {
  success: boolean;
  originalData: any;
  modifiedData: any;
  appliedFixes: ConstraintFix[];
  warnings: string[];
  errors: string[];
  bypassRequired: boolean;
}

export interface ConstraintFix {
  type: 'set_field' | 'remove_field' | 'transform_value' | 'add_dependency' | 'bypass_constraint';
  field?: string;
  oldValue?: any;
  newValue?: any;
  reason: string;
  confidence: number;
  requiresManualReview?: boolean;
}

export type ConstraintType = 
  | 'check' 
  | 'foreign_key' 
  | 'unique' 
  | 'primary_key' 
  | 'not_null';

export interface ConstraintDiscoveryOptions {
  // Discovery settings
  enableCaching: boolean;
  cacheTimeout: number; // minutes
  enableSchemaVersioning: boolean;
  
  // Query settings
  includeSystemTables: boolean;
  includeViews: boolean;
  schemas: string[]; // schemas to analyze, default: ['public']
  
  // Analysis settings
  enableConfidenceScoring: boolean;
  minimumConfidence: number;
  enableConstraintParsing: boolean;
  enableHandlerGeneration: boolean;
  
  // Performance settings
  maxConcurrentQueries: number;
  queryTimeout: number; // milliseconds
  batchSize: number;
}

export interface ConstraintDiscoveryResult {
  success: boolean;
  tablesAnalyzed: number;
  constraintsDiscovered: number;
  constraintsByType: Record<ConstraintType, number>;
  confidence: number;
  errors: string[];
  warnings: string[];
  executionTime: number;
  cacheHit: boolean;
  schemaVersion?: string;
  tables: TableConstraints[];
}

export interface ConstraintCache {
  key: string;
  schemaVersion: string;
  timestamp: string;
  expiresAt: string;
  data: TableConstraints[];
  confidence: number;
}

export interface SchemaVersionInfo {
  hash: string;
  timestamp: string;
  tableCount: number;
  constraintCount: number;
  lastModified?: string;
}

export interface ConstraintPattern {
  name: string;
  pattern: RegExp;
  type: ConstraintType;
  description: string;
  handler: string; // Handler ID
  confidence: number;
  examples: string[];
}

// Common MakerKit constraint patterns
export const MAKERKIT_CONSTRAINT_PATTERNS: ConstraintPattern[] = [
  {
    name: 'personal_account_slug_constraint',
    pattern: /accounts_slug_null_if_personal_account/i,
    type: 'check',
    description: 'MakerKit personal account slug must be null',
    handler: 'makerkit_personal_account_slug',
    confidence: 0.95,
    examples: [
      'accounts_slug_null_if_personal_account_true',
      'CHECK ((is_personal_account IS TRUE AND slug IS NULL) OR (is_personal_account IS FALSE))'
    ]
  },
  {
    name: 'organization_member_unique',
    pattern: /organization.*member.*unique/i,
    type: 'unique',
    description: 'MakerKit organization member uniqueness',
    handler: 'makerkit_organization_member',
    confidence: 0.85,
    examples: [
      'organization_members_organization_id_user_id_key',
      'UNIQUE (organization_id, user_id)'
    ]
  },
  {
    name: 'subscription_status_check',
    pattern: /subscription.*status.*check/i,
    type: 'check',
    description: 'MakerKit subscription status validation',
    handler: 'makerkit_subscription_status',
    confidence: 0.80,
    examples: [
      'subscriptions_status_check',
      "CHECK (status IN ('active', 'canceled', 'past_due', 'trialing'))"
    ]
  }
];

export interface ConstraintAnalysisReport {
  summary: {
    totalTables: number;
    totalConstraints: number;
    constraintsByType: Record<ConstraintType, number>;
    averageConfidence: number;
    frameworkPatterns: string[];
  };
  
  tables: Array<{
    name: string;
    constraintCount: number;
    confidence: number;
    issues: string[];
    recommendations: string[];
  }>;
  
  potentialIssues: Array<{
    table: string;
    constraint: string;
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recommendation: string;
  }>;
  
  frameworkRecommendations: string[];
  nextSteps: string[];
}