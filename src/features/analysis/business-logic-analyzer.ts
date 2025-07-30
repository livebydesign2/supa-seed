/**
 * Business Logic Analyzer
 * Analyzes database business logic patterns and data flows to determine optimal seeding strategies
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import {
  BusinessLogicAnalysisResult,
  BusinessLogicAnalysisOptions,
  DataFlowPattern,
  RecommendedStrategy,
  TriggerAnalysis,
  DatabaseTrigger,
  TriggerFunction,
  RLSPolicyInfo,
  DetectedBusinessRule,
  UserCreationFlow,
  AccountCreationFlow,
  ProfileCreationFlow,
  BusinessLogicCache,
  MAKERKIT_BUSINESS_LOGIC_PATTERNS,
  AnalysisRecommendation
} from './business-logic-types';

type SupabaseClient = ReturnType<typeof createClient>;

export class BusinessLogicAnalyzer {
  private client: SupabaseClient;
  private analysisCache: Map<string, BusinessLogicCache> = new Map();
  private options: BusinessLogicAnalysisOptions;

  constructor(client: SupabaseClient, options: Partial<BusinessLogicAnalysisOptions> = {}) {
    this.client = client;
    this.options = {
      analyzeDepth: 'detailed',
      includeTriggerAnalysis: true,
      includeRLSAnalysis: true,
      includeFunctionAnalysis: true,
      frameworkHints: [],
      expectedPatterns: [],
      maxConcurrentQueries: 10,
      queryTimeout: 30000,
      enableCaching: true,
      includeRecommendations: true,
      includeAlternatives: true,
      verboseOutput: false,
      ...options
    };
  }

  /**
   * Analyze business logic patterns in the database
   */
  async analyzeBusinessLogic(): Promise<BusinessLogicAnalysisResult> {
    const startTime = Date.now();
    Logger.info('🔍 Starting business logic analysis...');

    try {
      // Check cache first
      const cacheKey = await this.generateCacheKey();
      if (this.options.enableCaching && this.analysisCache.has(cacheKey)) {
        Logger.debug('Using cached business logic analysis');
        return this.analysisCache.get(cacheKey)!.analysisResult;
      }

      const [triggerAnalysis, rlsPolicies, businessRules] = await Promise.all([
        this.analyzeTriggers(),
        this.analyzeRLSPolicies(),
        this.extractBusinessRules()
      ]);

      // Determine data flow pattern
      const dataFlowPattern = this.determineDataFlowPattern(triggerAnalysis);
      
      // Generate recommendations
      const recommendedStrategy = this.generateRecommendedStrategy(
        dataFlowPattern,
        triggerAnalysis,
        rlsPolicies
      );

      // Detect framework
      const framework = this.detectFramework(triggerAnalysis, businessRules);
      const confidence = this.calculateOverallConfidence(triggerAnalysis, dataFlowPattern, businessRules);

      const result: BusinessLogicAnalysisResult = {
        success: true,
        framework,
        confidence,
        dataFlowPattern,
        recommendedStrategy,
        triggerAnalysis,
        rlsPolicies,
        businessRules,
        warnings: [],
        errors: [],
        executionTime: Date.now() - startTime
      };

      // Cache the result
      if (this.options.enableCaching) {
        this.cacheResult(cacheKey, result);
      }

      Logger.success(`✅ Business logic analysis completed in ${result.executionTime}ms (confidence: ${(confidence * 100).toFixed(1)}%)`);
      return result;

    } catch (error: any) {
      Logger.error('Business logic analysis failed:', error);
      return {
        success: false,
        framework: 'unknown',
        confidence: 0,
        dataFlowPattern: {
          type: 'unknown',
          confidence: 0,
          description: 'Analysis failed',
          detectedFlow: [],
          requiredSteps: [],
          bypasses: []
        },
        recommendedStrategy: {
          strategy: 'direct_table_insert',
          reason: 'Analysis failed, falling back to direct insertion',
          confidence: 0,
          alternativeStrategies: [],
          requiresUserContext: false,
          respectsBusinessLogic: false
        },
        triggerAnalysis: {
          triggersFound: [],
          triggerFunctions: [],
          userCreationFlow: null,
          accountCreationFlow: null,
          profileCreationFlow: null,
          businessLogicTriggers: [],
          confidence: 0
        },
        rlsPolicies: [],
        businessRules: [],
        warnings: [],
        errors: [error.message],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze database triggers and their functions
   */
  private async analyzeTriggers(): Promise<TriggerAnalysis> {
    Logger.debug('Analyzing database triggers...');

    try {
      // Query for triggers
      const { data: triggers, error: triggerError } = await this.client
        .from('information_schema.triggers')
        .select(`
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation,
          action_statement,
          trigger_schema
        `);

      if (triggerError) {
        Logger.warn('Failed to query triggers from information_schema:', triggerError);
        return this.fallbackTriggerAnalysis();
      }

      // Query for functions  
      const { data: functions, error: functionError } = await this.client
        .from('information_schema.routines')
        .select('routine_name, routine_schema, routine_definition, data_type');

      if (functionError) {
        Logger.debug('Failed to get detailed functions, trying basic query');
      }

      const triggersFound: DatabaseTrigger[] = [];
      const triggerFunctions: TriggerFunction[] = [];

      // Process triggers
      for (const trigger of triggers || []) {
        const analyzedTrigger = await this.analyzeTrigger(trigger);
        triggersFound.push(analyzedTrigger);
      }

      // Process functions
      if (functions && Array.isArray(functions)) {
        for (const func of functions) {
          const analyzedFunction = await this.analyzeFunction(func);
          triggerFunctions.push(analyzedFunction);
        }
      }

      // Analyze specific flows
      const userCreationFlow = this.analyzeUserCreationFlow(triggersFound, triggerFunctions);
      const accountCreationFlow = this.analyzeAccountCreationFlow(triggersFound, triggerFunctions);
      const profileCreationFlow = this.analyzeProfileCreationFlow(triggersFound, triggerFunctions);

      // Identify business logic triggers
      const businessLogicTriggers = this.identifyBusinessLogicTriggers(triggersFound);

      const confidence = this.calculateTriggerAnalysisConfidence(
        triggersFound,
        triggerFunctions,
        userCreationFlow,
        accountCreationFlow,
        profileCreationFlow
      );

      return {
        triggersFound,
        triggerFunctions,
        userCreationFlow,
        accountCreationFlow,
        profileCreationFlow,
        businessLogicTriggers,
        confidence
      };

    } catch (error: any) {
      Logger.error('Trigger analysis failed:', error);
      return this.fallbackTriggerAnalysis();
    }
  }

  /**
   * Analyze individual trigger
   */
  private async analyzeTrigger(trigger: any): Promise<DatabaseTrigger> {
    const functionName = this.extractFunctionName(trigger.action_statement);
    
    return {
      triggerName: trigger.trigger_name,
      tableName: trigger.event_object_table,
      timing: trigger.action_timing,
      events: [trigger.event_manipulation],
      functionName,
      functionSchema: trigger.trigger_schema || 'public',
      isEnabled: true,
      analysisResult: {
        businessLogicType: this.classifyTriggerBusinessLogic(trigger, functionName),
        affectedTables: [trigger.event_object_table],
        dependsOnAuth: this.triggerDependsOnAuth(functionName, trigger.action_statement),
        requiresUserContext: this.triggerRequiresUserContext(functionName),
        confidence: 0.8,
        extractedRules: []
      }
    };
  }

  /**
   * Analyze individual function
   */
  private async analyzeFunction(func: any): Promise<TriggerFunction> {
    const businessRules = await this.parseBusinessRulesFromFunction(func);

    return {
      functionName: func.routine_name || func.name,
      schema: func.routine_schema || func.schema || 'public',
      definition: func.routine_definition || func.definition || '',
      parameters: [],
      returnType: func.data_type || 'void',
      language: func.external_language || 'plpgsql',
      volatility: 'VOLATILE',
      parsedBusinessRules: businessRules,
      analysisConfidence: businessRules.length > 0 ? 0.8 : 0.3
    };
  }

  /**
   * Parse business rules from function definition
   */
  private async parseBusinessRulesFromFunction(func: any): Promise<any[]> {
    // This is a simplified version - in a real implementation you'd have more sophisticated parsing
    const definition = func.routine_definition || func.definition || '';
    const rules = [];

    // Look for MakerKit patterns
    if (definition.includes('setup_new_user') || definition.includes('kit.')) {
      rules.push({
        rule: 'MakerKit user setup workflow',
        type: 'workflow',
        affectedTables: ['accounts', 'profiles'],
        conditions: ['auth.users trigger'],
        actions: ['create_account', 'create_profile'],
        confidence: 0.9
      });
    }

    return rules;
  }

  /**
   * Analyze RLS policies
   */
  private async analyzeRLSPolicies(): Promise<RLSPolicyInfo[]> {
    if (!this.options.includeRLSAnalysis) {
      return [];
    }

    Logger.debug('Analyzing RLS policies...');

    try {
      const { data: policies, error } = await this.client
        .from('pg_policies')
        .select(`
          policyname,
          tablename,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        `);

      if (error) {
        Logger.warn('Failed to query RLS policies:', error);
        return [];
      }

      return (policies || []).map(policy => ({
        policyName: String(policy.policyname || 'unknown'),
        tableName: String(policy.tablename || 'unknown'),
        permissiveRestrictive: policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE' as 'PERMISSIVE' | 'RESTRICTIVE',
        roles: Array.isArray(policy.roles) ? policy.roles : [],
        command: String(policy.cmd || 'ALL') as 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
        using: policy.qual ? String(policy.qual) : undefined,
        withCheck: policy.with_check ? String(policy.with_check) : undefined,
        isEnabled: true,
        affectsSeeding: this.policyAffectsSeeding(policy),
        requiresUserContext: this.policyRequiresUserContext(policy),
        bypassStrategies: [
          {
            strategy: 'service_role',
            description: 'Use service role key to bypass RLS',
            riskLevel: 'low',
            suitableForSeeding: true
          }
        ]
      }));

    } catch (error: any) {
      Logger.warn('RLS policy analysis failed:', error);
      return [];
    }
  }

  /**
   * Extract business rules from various sources
   */
  private async extractBusinessRules(): Promise<DetectedBusinessRule[]> {
    const rules: DetectedBusinessRule[] = [];

    // Check for MakerKit-specific patterns
    for (const pattern of MAKERKIT_BUSINESS_LOGIC_PATTERNS) {
      const rule = await this.checkForPattern(pattern);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Check for specific business logic pattern
   */
  private async checkForPattern(pattern: any): Promise<DetectedBusinessRule | null> {
    // Simplified pattern matching - in real implementation would be more sophisticated
    return {
      id: `pattern_${pattern.name}`,
      name: pattern.name,
      type: 'trigger_based',
      description: `Detected ${pattern.framework} pattern: ${pattern.name}`,
      enforcementLevel: 'strict',
      affectedTables: ['accounts', 'profiles'],
      requirements: [
        {
          type: 'user_context',
          description: 'Requires authenticated user context',
          required: true,
          autoFixable: false
        }
      ],
      violations: [],
      autoFixAvailable: false,
      confidence: pattern.confidence
    };
  }

  /**
   * Determine overall data flow pattern
   */
  private determineDataFlowPattern(triggerAnalysis: TriggerAnalysis): DataFlowPattern {
    if (triggerAnalysis.userCreationFlow?.usesAuthTriggers) {
      return {
        type: 'auth_triggered',
        confidence: 0.9,
        description: 'Uses auth.users triggers for user creation workflow',
        detectedFlow: [
          'auth.admin.createUser() → auth.users INSERT',
          'auth.users trigger → create account',
          'account trigger → create profile'
        ],
        requiredSteps: [
          {
            step: 1,
            action: 'auth_create_user',
            description: 'Create user via auth.admin.createUser()',
            requiredContext: ['email', 'password'],
            expectedOutcome: 'User created in auth.users'
          },
          {
            step: 2,
            action: 'wait_for_trigger',
            description: 'Wait for trigger to create account and profile',
            requiredContext: [],
            expectedOutcome: 'Account and profile created automatically'
          }
        ],
        bypasses: []
      };
    }

    return {
      type: 'direct_insertion',
      confidence: 0.7,
      description: 'Direct table insertion pattern',
      detectedFlow: ['Direct INSERT into tables'],
      requiredSteps: [
        {
          step: 1,
          action: 'direct_insert',
          description: 'Insert directly into tables',
          requiredContext: ['table_data'],
          expectedOutcome: 'Records created directly'
        }
      ],
      bypasses: [
        {
          bypassType: 'rls_disable',
          reason: 'Direct insertion may require RLS bypass',
          riskLevel: 'medium',
          suitableForSeeding: true
        }
      ]
    };
  }

  /**
   * Generate recommended strategy based on analysis
   */
  private generateRecommendedStrategy(
    dataFlowPattern: DataFlowPattern,
    triggerAnalysis: TriggerAnalysis,
    rlsPolicies: RLSPolicyInfo[]
  ): RecommendedStrategy {
    if (dataFlowPattern.type === 'auth_triggered') {
      return {
        strategy: 'auth_admin_create_user',
        reason: 'Database uses auth triggers for user creation workflow',
        confidence: 0.9,
        alternativeStrategies: [
          {
            strategy: 'direct_table_insert',
            reason: 'Bypass triggers for faster seeding',
            confidence: 0.6,
            tradeoffs: ['Bypasses business logic', 'May violate constraints']
          }
        ],
        requiresUserContext: true,
        respectsBusinessLogic: true
      };
    }

    return {
      strategy: 'direct_table_insert',
      reason: 'No auth trigger workflow detected',
      confidence: 0.7,
      alternativeStrategies: [],
      requiresUserContext: false,
      respectsBusinessLogic: false
    };
  }

  /**
   * Detect framework based on analysis
   */
  private detectFramework(triggerAnalysis: TriggerAnalysis, businessRules: DetectedBusinessRule[]): string {
    // Look for MakerKit patterns
    if (triggerAnalysis.triggerFunctions.some(f => 
      f.functionName.includes('kit.') || 
      f.functionName.includes('setup_new_user')
    )) {
      return 'makerkit';
    }

    if (businessRules.some(rule => rule.name.includes('makerkit'))) {
      return 'makerkit';
    }

    return 'generic';
  }

  /**
   * Helper methods for trigger analysis
   */
  private extractFunctionName(actionStatement: string): string {
    const match = actionStatement?.match(/EXECUTE (?:FUNCTION|PROCEDURE) ([^\(]+)/i);
    return match ? match[1].trim() : 'unknown';
  }

  private classifyTriggerBusinessLogic(trigger: any, functionName: string): any {
    if (functionName.includes('setup_new_user') || functionName.includes('handle_new_user')) {
      return 'user_creation';
    }
    return 'custom';
  }

  private triggerDependsOnAuth(functionName: string, actionStatement: string): boolean {
    return functionName.includes('auth') || 
           functionName.includes('user') || 
           actionStatement?.includes('auth.');
  }

  private triggerRequiresUserContext(functionName: string): boolean {
    return functionName.includes('user') || functionName.includes('auth');
  }

  private policyAffectsSeeding(policy: any): boolean {
    return policy.cmd !== 'SELECT'; // INSERT, UPDATE, DELETE policies affect seeding
  }

  private policyRequiresUserContext(policy: any): boolean {
    const using = policy.qual || '';
    const withCheck = policy.with_check || '';
    return using.includes('auth.uid()') || withCheck.includes('auth.uid()');
  }

  private analyzeUserCreationFlow(triggers: DatabaseTrigger[], functions: TriggerFunction[]): UserCreationFlow | null {
    const authTriggers = triggers.filter(t => 
      t.tableName === 'users' || 
      t.analysisResult.dependsOnAuth
    );

    if (authTriggers.length > 0) {
      return {
        usesAuthTriggers: true,
        triggerFunction: authTriggers[0].functionName,
        createsAccount: true,
        createsProfile: true,
        requiredFields: ['email'],
        optionalFields: ['name', 'avatar_url'],
        businessLogicSteps: ['create_account', 'create_profile'],
        confidence: 0.8
      };
    }

    return null;
  }

  private analyzeAccountCreationFlow(triggers: DatabaseTrigger[], functions: TriggerFunction[]): AccountCreationFlow | null {
    const accountTriggers = triggers.filter(t => t.tableName === 'accounts');
    
    if (accountTriggers.length > 0) {
      return {
        triggeredByAuth: true,
        triggerFunction: accountTriggers[0].functionName,
        defaultValues: { is_personal_account: true, slug: null },
        constraints: ['accounts_slug_null_if_personal_account_true'],
        requiredRelationships: ['auth.users'],
        confidence: 0.8
      };
    }

    return null;
  }

  private analyzeProfileCreationFlow(triggers: DatabaseTrigger[], functions: TriggerFunction[]): ProfileCreationFlow | null {
    const profileTriggers = triggers.filter(t => t.tableName === 'profiles');
    
    if (profileTriggers.length > 0) {
      return {
        triggeredByAccount: true,
        triggerFunction: profileTriggers[0].functionName,
        defaultValues: {},
        linkedToAccount: true,
        linkedToAuth: true,
        confidence: 0.8
      };
    }

    return null;
  }

  private identifyBusinessLogicTriggers(triggers: DatabaseTrigger[]): any[] {
    return triggers
      .filter(t => t.analysisResult.businessLogicType !== 'custom')
      .map(t => ({
        triggerName: t.triggerName,
        purpose: t.analysisResult.businessLogicType,
        description: `${t.analysisResult.businessLogicType} trigger on ${t.tableName}`,
        affectedWorkflows: ['user_creation'],
        bypassable: false,
        criticality: 'high'
      }));
  }

  private calculateTriggerAnalysisConfidence(...args: any[]): number {
    // Simplified confidence calculation
    return 0.8;
  }

  private calculateOverallConfidence(triggerAnalysis: TriggerAnalysis, dataFlowPattern: DataFlowPattern, businessRules: DetectedBusinessRule[]): number {
    return (triggerAnalysis.confidence + dataFlowPattern.confidence + (businessRules.length > 0 ? 0.8 : 0.2)) / 3;
  }

  private fallbackTriggerAnalysis(): TriggerAnalysis {
    return {
      triggersFound: [],
      triggerFunctions: [],
      userCreationFlow: null,
      accountCreationFlow: null,
      profileCreationFlow: null,
      businessLogicTriggers: [],
      confidence: 0
    };
  }

  private async generateCacheKey(): Promise<string> {
    return `business_logic_${Date.now()}`;
  }

  private cacheResult(key: string, result: BusinessLogicAnalysisResult): void {
    const cacheEntry: BusinessLogicCache = {
      key,
      schemaHash: 'temp_hash',
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour
      analysisResult: result,
      confidence: result.confidence
    };

    this.analysisCache.set(key, cacheEntry);
  }

  /**
   * Get analysis recommendations
   */
  getRecommendations(analysisResult: BusinessLogicAnalysisResult): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    if (analysisResult.dataFlowPattern.type === 'auth_triggered') {
      recommendations.push({
        type: 'strategy',
        priority: 'high',
        title: 'Use Auth-Based User Creation',
        description: 'Use auth.admin.createUser() to respect trigger-based workflow',
        implementation: 'Configure strategy to use auth.admin.createUser() instead of direct insertion',
        benefits: ['Respects business logic', 'Maintains data integrity', 'Follows intended workflow'],
        risks: ['Slower than direct insertion', 'Requires auth configuration'],
        applicableFrameworks: ['makerkit']
      });
    }

    if (analysisResult.rlsPolicies.length > 0) {
      recommendations.push({
        type: 'configuration',
        priority: 'medium',
        title: 'Configure RLS Bypass',
        description: 'Use service role for seeding operations',
        implementation: 'Ensure SUPABASE_SERVICE_ROLE_KEY is configured',
        benefits: ['Bypasses RLS restrictions', 'Enables full data access'],
        risks: ['Full database access', 'Must be used carefully'],
        applicableFrameworks: ['all']
      });
    }

    return recommendations;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}