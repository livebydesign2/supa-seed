/**
 * Business Logic Analysis Types
 * Types for analyzing database business logic patterns and data flows
 */

export interface BusinessLogicAnalysisResult {
  success: boolean;
  framework: string;
  confidence: number;
  dataFlowPattern: DataFlowPattern;
  recommendedStrategy: RecommendedStrategy;
  triggerAnalysis: TriggerAnalysis;
  rlsPolicies: RLSPolicyInfo[];
  businessRules: DetectedBusinessRule[];
  warnings: string[];
  errors: string[];
  executionTime: number;
}

export interface DataFlowPattern {
  type: 'auth_triggered' | 'direct_insertion' | 'hybrid' | 'unknown';
  confidence: number;
  description: string;
  detectedFlow: string[];
  requiredSteps: WorkflowStep[];
  bypasses: FlowBypass[];
}

export interface RecommendedStrategy {
  strategy: 'auth_admin_create_user' | 'direct_table_insert' | 'custom_workflow';
  reason: string;
  confidence: number;
  alternativeStrategies: AlternativeStrategy[];
  requiresUserContext: boolean;
  respectsBusinessLogic: boolean;
}

export interface AlternativeStrategy {
  strategy: string;
  reason: string;
  confidence: number;
  tradeoffs: string[];
}

export interface TriggerAnalysis {
  triggersFound: DatabaseTrigger[];
  triggerFunctions: TriggerFunction[];
  userCreationFlow: UserCreationFlow | null;
  accountCreationFlow: AccountCreationFlow | null;
  profileCreationFlow: ProfileCreationFlow | null;
  businessLogicTriggers: BusinessLogicTrigger[];
  confidence: number;
}

export interface DatabaseTrigger {
  triggerName: string;
  tableName: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: TriggerEvent[];
  functionName: string;
  functionSchema: string;
  condition?: string;
  isEnabled: boolean;
  analysisResult: TriggerAnalysisResult;
}

export type TriggerEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface TriggerAnalysisResult {
  businessLogicType: 'user_creation' | 'data_validation' | 'audit' | 'cascading_update' | 'custom';
  affectedTables: string[];
  dependsOnAuth: boolean;
  requiresUserContext: boolean;
  confidence: number;
  extractedRules: string[];
}

export interface TriggerFunction {
  functionName: string;
  schema: string;
  definition: string;
  parameters: FunctionParameter[];
  returnType: string;
  language: string;
  volatility: 'IMMUTABLE' | 'STABLE' | 'VOLATILE';
  parsedBusinessRules: ParsedBusinessRule[];
  analysisConfidence: number;
}

export interface FunctionParameter {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
}

export interface ParsedBusinessRule {
  rule: string;
  type: 'validation' | 'transformation' | 'workflow' | 'constraint';
  affectedTables: string[];
  conditions: string[];
  actions: string[];
  confidence: number;
}

export interface UserCreationFlow {
  usesAuthTriggers: boolean;
  triggerFunction: string;
  createsAccount: boolean;
  createsProfile: boolean;
  requiredFields: string[];
  optionalFields: string[];
  businessLogicSteps: string[];
  confidence: number;
}

export interface AccountCreationFlow {
  triggeredByAuth: boolean;
  triggerFunction?: string;
  defaultValues: Record<string, any>;
  constraints: string[];
  requiredRelationships: string[];
  confidence: number;
}

export interface ProfileCreationFlow {
  triggeredByAccount: boolean;
  triggerFunction?: string;
  defaultValues: Record<string, any>;
  linkedToAccount: boolean;
  linkedToAuth: boolean;
  confidence: number;
}

export interface BusinessLogicTrigger {
  triggerName: string;
  purpose: 'user_setup' | 'data_validation' | 'relationship_maintenance' | 'audit' | 'custom';
  description: string;
  affectedWorkflows: string[];
  bypassable: boolean;
  criticality: 'high' | 'medium' | 'low';
}

export interface RLSPolicyInfo {
  policyName: string;
  tableName: string;
  permissiveRestrictive: 'PERMISSIVE' | 'RESTRICTIVE';
  roles: string[];
  command: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  using?: string;
  withCheck?: string;
  isEnabled: boolean;
  affectsSeeding: boolean;
  requiresUserContext: boolean;
  bypassStrategies: RLSBypassStrategy[];
}

export interface RLSBypassStrategy {
  strategy: 'service_role' | 'disable_rls' | 'impersonate_user' | 'custom_context';
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  suitableForSeeding: boolean;
}

export interface DetectedBusinessRule {
  id: string;
  name: string;
  type: 'trigger_based' | 'constraint_based' | 'rls_based' | 'function_based';
  description: string;
  enforcementLevel: 'strict' | 'moderate' | 'advisory';
  affectedTables: string[];
  requirements: BusinessRuleRequirement[];
  violations: PotentialViolation[];
  autoFixAvailable: boolean;
  confidence: number;
}

export interface BusinessRuleRequirement {
  type: 'field_value' | 'relationship' | 'user_context' | 'permission' | 'sequence';
  description: string;
  required: boolean;
  autoFixable: boolean;
}

export interface PotentialViolation {
  scenario: string;
  likelihood: 'high' | 'medium' | 'low';
  impact: 'critical' | 'high' | 'medium' | 'low';
  preventionStrategy: string;
}

export interface WorkflowStep {
  step: number;
  action: 'auth_create_user' | 'wait_for_trigger' | 'direct_insert' | 'validate_context' | 'custom';
  description: string;
  requiredContext: string[];
  expectedOutcome: string;
  fallbackStrategy?: string;
}

export interface FlowBypass {
  bypassType: 'rls_disable' | 'trigger_disable' | 'service_role' | 'direct_sql';
  reason: string;
  riskLevel: 'low' | 'medium' | 'high';  
  suitableForSeeding: boolean;
}

export interface BusinessLogicAnalysisOptions {
  // Analysis depth
  analyzeDepth: 'basic' | 'detailed' | 'comprehensive';
  includeTriggerAnalysis: boolean;
  includeRLSAnalysis: boolean;
  includeFunctionAnalysis: boolean;
  
  // Framework-specific options
  frameworkHints: string[];
  expectedPatterns: string[];
  
  // Performance options
  maxConcurrentQueries: number;
  queryTimeout: number;
  enableCaching: boolean;
  
  // Output options
  includeRecommendations: boolean;
  includeAlternatives: boolean;
  verboseOutput: boolean;
}

export interface BusinessLogicCache {
  key: string;
  schemaHash: string;
  timestamp: string;
  expiresAt: string;
  analysisResult: BusinessLogicAnalysisResult;
  confidence: number;
}

// Pattern matching interfaces
export interface FrameworkPattern {
  name: string;
  framework: string;
  pattern: RegExp | string;
  confidence: number;
  indicators: PatternIndicator[];
}

export interface PatternIndicator {
  type: 'function_name' | 'trigger_name' | 'table_structure' | 'constraint_pattern';
  value: string;
  weight: number;
}

// MakerKit-specific patterns
export const MAKERKIT_BUSINESS_LOGIC_PATTERNS: FrameworkPattern[] = [
  {
    name: 'auth_user_creation_trigger',
    framework: 'makerkit',
    pattern: /kit\.setup_new_user|handle_new_user|create_profile_for_user/i,
    confidence: 0.95,
    indicators: [
      { type: 'function_name', value: 'kit.setup_new_user', weight: 0.9 },
      { type: 'function_name', value: 'handle_new_user', weight: 0.8 },
      { type: 'trigger_name', value: 'on_auth_user_created', weight: 0.7 }
    ]
  },
  {
    name: 'personal_account_business_logic',
    framework: 'makerkit',
    pattern: /is_personal_account.*true.*slug.*null/i,
    confidence: 0.85,
    indicators: [
      { type: 'constraint_pattern', value: 'accounts_slug_null_if_personal_account', weight: 0.9 },
      { type: 'table_structure', value: 'accounts.is_personal_account', weight: 0.7 }
    ]
  },
  {
    name: 'tenant_scoped_data',
    framework: 'makerkit',
    pattern: /account_id.*foreign.*key|tenant.*isolation/i,
    confidence: 0.75,
    indicators: [
      { type: 'table_structure', value: 'account_id FK pattern', weight: 0.8 },
      { type: 'constraint_pattern', value: 'tenant_isolation', weight: 0.6 }
    ]
  }
];

export interface AnalysisRecommendation {
  type: 'strategy' | 'configuration' | 'workflow' | 'bypass';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  implementation: string;
  benefits: string[];
  risks: string[];
  applicableFrameworks: string[];
}

// RLS Compliance Types
export interface RLSComplianceOptions {
  enableRLSCompliance: boolean;
  useServiceRole: boolean;
  createUserContext: boolean;
  bypassOnFailure: boolean;
  validateAfterInsert: boolean;
  logPolicyViolations: boolean;
  maxRetries: number;
}

export interface UserContext {
  userId: string;
  email: string;
  role: string;
  accountId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface RLSComplianceResult {
  success: boolean;
  userContext?: UserContext;
  violatedPolicies: string[];
  bypassesUsed: string[];
  warnings: string[];
  errors: string[];
  insertedRecords: number;
  validatedRecords: number;
}

export interface RLSValidationResult {
  isCompliant: boolean;
  violatedPolicies: RLSPolicyViolation[];
  suggestedFixes: RLSFixSuggestion[];
  requiresUserContext: boolean;
  bypassRecommended: boolean;
}

export interface RLSPolicyViolation {
  policyName: string;
  tableName: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedFix?: string;
}

export interface RLSFixSuggestion {
  type: 'add_user_context' | 'modify_data' | 'use_service_role' | 'disable_rls';
  description: string;
  implementation: string;
  riskLevel: 'low' | 'medium' | 'high';
}