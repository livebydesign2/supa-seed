/**
 * Schema-Driven Adapter
 * Replaces hardcoded MakerKit workflows with configurable execution patterns
 * Integrates all schema-first components to provide a unified interface
 */

import type { createClient } from '@supabase/supabase-js';
import { SchemaIntrospector, SchemaIntrospectionResult } from './schema-introspector';
import { WorkflowBuilder, UserCreationWorkflow, WorkflowBuilderConfig } from './workflow-builder';
import { WorkflowExecutor, WorkflowExecutionResult, ExecutionConfig } from './workflow-executor';
import { ConstraintValidator, ValidationResult } from './constraint-validator';
import { DynamicColumnMapper, TableColumnMap, MappingConfig } from './dynamic-column-mapper';
import { Logger } from '../../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface SchemaAdapterConfig {
  // Core configuration
  primaryUserTable?: string;
  enableConstraintValidation: boolean;
  enableRollback: boolean;
  enableAutoFixes: boolean;
  
  // Execution settings
  maxRetries: number;
  timeoutMs: number;
  continueOnError: boolean;
  
  // Mapping settings
  mappingConfig: MappingConfig;
  customColumnMappings?: Record<string, Record<string, string>>;
  
  // Framework detection
  frameworkOverride?: 'makerkit' | 'nextjs' | 'custom';
  versionOverride?: string;
  
  // Caching
  enableSchemaCache: boolean;
  cacheTimeout: number; // minutes
}

export interface UserCreationRequest {
  email: string;
  name: string;
  username?: string;
  bio?: string;
  picture_url?: string;
  password?: string;
  metadata?: Record<string, any>;
  customFields?: Record<string, any>;
}

export interface UserCreationResponse {
  success: boolean;
  userId?: string;
  executionId: string;
  workflow: UserCreationWorkflow;
  executionResult: WorkflowExecutionResult;
  validationResult?: ValidationResult;
  appliedFixes?: Array<{ field: string; oldValue: any; newValue: any }>;
  schemaInfo: {
    framework: string;
    version: string;
    confidence: number;
    primaryUserTable: string;
  };
  performance: {
    introspectionTime: number;
    workflowBuildTime: number;
    executionTime: number;
    totalTime: number;
  };
  recommendations: string[];
}

export interface SchemaAnalysisResult {
  schemaInfo: SchemaIntrospectionResult;
  columnMappings: Map<string, TableColumnMap>;
  workflow: UserCreationWorkflow;
  recommendations: string[];
  confidence: number;
}

export class SchemaDrivenAdapter {
  private client: SupabaseClient;
  private config: SchemaAdapterConfig;
  
  // Core components
  private introspector: SchemaIntrospector;
  private workflowBuilder: WorkflowBuilder;
  private executor: WorkflowExecutor;
  private validator: ConstraintValidator;
  private columnMapper: DynamicColumnMapper;
  
  // Cached data
  private cachedSchema: SchemaIntrospectionResult | null = null;
  private cachedMappings: Map<string, TableColumnMap> | null = null;
  private cachedWorkflow: UserCreationWorkflow | null = null;
  private cacheTimestamp: Date | null = null;

  constructor(client: SupabaseClient, config: Partial<SchemaAdapterConfig> = {}) {
    this.client = client;
    this.config = {
      enableConstraintValidation: true,
      enableRollback: true,
      enableAutoFixes: true,
      maxRetries: 3,
      timeoutMs: 30000,
      continueOnError: false,
      mappingConfig: {
        strictMode: false,
        enablePatternMatching: true,
        enableFuzzyMatching: true,
        minimumConfidence: 0.3,
        preferExactMatches: true,
        allowMultipleMappings: false
      },
      enableSchemaCache: true,
      cacheTimeout: 30,
      ...config
    };

    // Initialize components
    this.introspector = new SchemaIntrospector(client);
    this.workflowBuilder = new WorkflowBuilder(this.introspector);
    this.executor = new WorkflowExecutor(client, {
      enableRollback: this.config.enableRollback,
      enableConstraintValidation: this.config.enableConstraintValidation,
      continueOnError: this.config.continueOnError,
      maxRetries: this.config.maxRetries,
      timeoutMs: this.config.timeoutMs,
      generateMissingFields: true
    });
    this.validator = new ConstraintValidator(client);
    this.columnMapper = new DynamicColumnMapper({
      ...this.config.mappingConfig,
      customMappings: this.config.customColumnMappings
    });
  }

  /**
   * Create a user using the schema-driven approach
   * This replaces all hardcoded MakerKit workflows
   */
  async createUser(request: UserCreationRequest): Promise<UserCreationResponse> {
    const startTime = Date.now();
    Logger.info(`🚀 Starting schema-driven user creation for ${request.email}`);

    const performance = {
      introspectionTime: 0,
      workflowBuildTime: 0,
      executionTime: 0,
      totalTime: 0
    };

    try {
      // Step 1: Analyze schema (with caching)
      const analysisStart = Date.now();
      const analysis = await this.analyzeSchema();
      performance.introspectionTime = Date.now() - analysisStart;

      Logger.info(`📊 Schema analysis complete: ${analysis.schemaInfo.framework.type} ${analysis.schemaInfo.framework.version} (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);

      // Step 2: Build workflow
      const workflowStart = Date.now();
      const workflow = await this.getOrBuildWorkflow(analysis);
      performance.workflowBuildTime = Date.now() - workflowStart;

      Logger.info(`🔨 Workflow built with ${workflow.steps.length} steps`);

      // Step 3: Validate and apply auto-fixes
      let validationResult: ValidationResult | undefined;
      let appliedFixes: Array<{ field: string; oldValue: any; newValue: any }> = [];
      
      if (this.config.enableConstraintValidation) {
        const primaryUserTable = this.determinePrimaryUserTable(analysis.schemaInfo);
        validationResult = await this.validator.validateOperation({
          operation: 'insert',
          table: primaryUserTable,
          data: this.normalizeUserData(request, analysis.columnMappings.get(primaryUserTable)),
          schemaInfo: analysis.schemaInfo
        });

        if (!validationResult.valid && this.config.enableAutoFixes) {
          const autoFixResult = await this.validator.applyAutoFixes(
            this.normalizeUserData(request, analysis.columnMappings.get(primaryUserTable)),
            validationResult.autoFixes
          );
          
          appliedFixes = autoFixResult.appliedFixes.map(fix => ({
            field: fix.field,
            oldValue: fix.originalValue,
            newValue: fix.fixedValue
          }));

          // Update request with fixed data
          Object.assign(request, autoFixResult.data);
        }
      }

      // Step 4: Execute workflow
      const executionStart = Date.now();
      const executionResult = await this.executor.executeWorkflow(workflow, request);
      performance.executionTime = Date.now() - executionStart;

      performance.totalTime = Date.now() - startTime;

      const response: UserCreationResponse = {
        success: executionResult.success,
        userId: executionResult.userId,
        executionId: executionResult.executionId,
        workflow,
        executionResult,
        validationResult,
        appliedFixes: appliedFixes.length > 0 ? appliedFixes : undefined,
        schemaInfo: {
          framework: analysis.schemaInfo.framework.type,
          version: analysis.schemaInfo.framework.version,
          confidence: analysis.schemaInfo.framework.confidence,
          primaryUserTable: this.determinePrimaryUserTable(analysis.schemaInfo)
        },
        performance,
        recommendations: analysis.recommendations
      };

      if (response.success) {
        Logger.success(`✅ User created successfully: ${request.email} (${performance.totalTime}ms)`);
      } else {
        Logger.error(`❌ User creation failed: ${executionResult.error}`);
      }

      return response;

    } catch (error: any) {
      Logger.error('Schema-driven user creation failed:', error);
      
      performance.totalTime = Date.now() - startTime;

      return {
        success: false,
        executionId: crypto.randomUUID(),
        workflow: await this.getEmptyWorkflow(),
        executionResult: {
          success: false,
          executionId: crypto.randomUUID(),
          duration: performance.totalTime,
          completedSteps: [],
          error: error.message,
          rollbackRequired: false,
          rollbackCompleted: false,
          stepResults: {}
        },
        schemaInfo: {
          framework: 'unknown',
          version: 'unknown',
          confidence: 0,
          primaryUserTable: 'unknown'
        },
        performance,
        recommendations: [`Error occurred: ${error.message}`]
      };
    }
  }

  /**
   * Analyze schema and build column mappings
   */
  async analyzeSchema(): Promise<SchemaAnalysisResult> {
    // Check cache first
    if (this.isCacheValid()) {
      Logger.debug('Using cached schema analysis');
      return {
        schemaInfo: this.cachedSchema!,
        columnMappings: this.cachedMappings!,
        workflow: this.cachedWorkflow!,
        recommendations: [],
        confidence: this.cachedSchema!.framework.confidence
      };
    }

    Logger.info('🔍 Performing fresh schema analysis...');

    // Introspect schema
    const schemaInfo = await this.introspector.introspectSchema();
    
    // Initialize validator with schema info
    await this.validator.initialize(schemaInfo);
    
    // Create column mappings
    const columnMappings = await this.columnMapper.createMappings(schemaInfo);
    
    // Build workflow
    const primaryUserTable = this.determinePrimaryUserTable(schemaInfo);
    const workflowConfig: WorkflowBuilderConfig = {
      primaryUserTable,
      enableConstraintValidation: this.config.enableConstraintValidation,
      enableRollback: this.config.enableRollback,
      generateOptionalFields: true,
      respectExistingData: true,
      customFieldMappings: this.extractCustomFieldMappings(columnMappings)
    };
    
    const workflow = await this.workflowBuilder.buildUserCreationWorkflow(workflowConfig);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(schemaInfo, columnMappings, workflow);
    
    // Cache results
    if (this.config.enableSchemaCache) {
      this.cachedSchema = schemaInfo;
      this.cachedMappings = columnMappings;
      this.cachedWorkflow = workflow;
      this.cacheTimestamp = new Date();
    }

    return {
      schemaInfo,
      columnMappings,
      workflow,
      recommendations,
      confidence: schemaInfo.framework.confidence
    };
  }

  /**
   * Get the strategy that would be used for user creation
   * This replaces the old getUserCreationStrategy method
   */
  async getUserCreationStrategy(): Promise<{
    strategy: string;
    primaryTable: string;
    workflow: UserCreationWorkflow;
    confidence: number;
    evidence: string[];
  }> {
    const analysis = await this.analyzeSchema();
    const primaryTable = this.determinePrimaryUserTable(analysis.schemaInfo);
    
    return {
      strategy: 'schema-driven',
      primaryTable,
      workflow: analysis.workflow,
      confidence: analysis.confidence,
      evidence: analysis.schemaInfo.framework.evidence
    };
  }

  /**
   * Create a user using the legacy interface for backward compatibility
   * This replaces createUserForSchema from the old SchemaAdapter
   */
  async createUserForSchema(userData: {
    id?: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    picture_url?: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    try {
      const request: UserCreationRequest = {
        email: userData.email,
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        picture_url: userData.picture_url,
        customFields: userData.id ? { id: userData.id } : undefined
      };

      const response = await this.createUser(request);
      
      if (response.success && response.userId) {
        return { 
          id: response.userId, 
          success: true 
        };
      } else {
        return { 
          id: '', 
          success: false, 
          error: response.executionResult.error || 'User creation failed' 
        };
      }
    } catch (error: any) {
      return { 
        id: '', 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Validate the current schema and mappings
   */
  async validateSchema(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
    schemaHash: string;
  }> {
    const analysis = await this.analyzeSchema();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Validate workflow
    const workflowValidation = await this.workflowBuilder.validateWorkflow(analysis.workflow);
    if (!workflowValidation.isValid) {
      issues.push(...workflowValidation.errors);
    }
    recommendations.push(...workflowValidation.warnings);

    // Validate mappings
    const mappingValidation = await this.columnMapper.validateMappings(
      analysis.columnMappings, 
      analysis.schemaInfo
    );
    if (!mappingValidation.valid) {
      issues.push(...mappingValidation.invalidMappings.map(m => 
        `Invalid mapping in ${m.table}.${m.field}: ${m.reason}`
      ));
      issues.push(...mappingValidation.missingTables.map(t => 
        `Missing table: ${t}`
      ));
    }

    // Add general recommendations
    recommendations.push(...analysis.recommendations);

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
      schemaHash: analysis.workflow.metadata.schemaHash
    };
  }

  /**
   * Get current schema information
   */
  async getSchemaInfo(): Promise<{
    framework: { type: string; version: string; confidence: number };
    tables: Array<{ name: string; role: string; confidence: number }>;
    relationships: number;
    constraints: number;
    mappings: Record<string, Record<string, string>>;
  }> {
    const analysis = await this.analyzeSchema();
    
    return {
      framework: analysis.schemaInfo.framework,
      tables: analysis.schemaInfo.patterns.map(p => ({
        name: p.name,
        role: p.suggestedRole,
        confidence: p.confidence
      })),
      relationships: analysis.schemaInfo.relationships.length,
      constraints: Object.values(analysis.schemaInfo.constraints).flat().length,
      mappings: this.columnMapper.exportMappings(analysis.columnMappings)
    };
  }

  /**
   * Clear all caches and force fresh analysis
   */
  clearCache(): void {
    this.cachedSchema = null;
    this.cachedMappings = null;
    this.cachedWorkflow = null;
    this.cacheTimestamp = null;
    this.introspector.clearCache();
    this.validator.clearCache();
    Logger.debug('Schema cache cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SchemaAdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    this.executor = new WorkflowExecutor(this.client, {
      enableRollback: this.config.enableRollback,
      enableConstraintValidation: this.config.enableConstraintValidation,
      continueOnError: this.config.continueOnError,
      maxRetries: this.config.maxRetries,
      timeoutMs: this.config.timeoutMs,
      generateMissingFields: true
    });

    // Clear cache to force reconfiguration
    this.clearCache();
    
    Logger.debug('Schema adapter configuration updated');
  }

  /**
   * Private helper methods
   */
  private isCacheValid(): boolean {
    if (!this.config.enableSchemaCache) return false;
    if (!this.cacheTimestamp || !this.cachedSchema) return false;
    
    const cacheAge = Date.now() - this.cacheTimestamp.getTime();
    const cacheLimit = this.config.cacheTimeout * 60 * 1000; // Convert to milliseconds
    
    return cacheAge < cacheLimit;
  }

  private determinePrimaryUserTable(schemaInfo: SchemaIntrospectionResult): string {
    // Check configuration override
    if (this.config.primaryUserTable) {
      return this.config.primaryUserTable;
    }

    // Find user table pattern with highest confidence
    const userTables = schemaInfo.patterns.filter(p => p.suggestedRole === 'user');
    if (userTables.length === 0) {
      Logger.warn('No user tables detected, defaulting to "profiles"');
      return 'profiles';
    }

    // Sort by confidence and return the best match
    userTables.sort((a, b) => b.confidence - a.confidence);
    return userTables[0].name;
  }

  private normalizeUserData(
    request: UserCreationRequest, 
    tableMap?: TableColumnMap
  ): Record<string, any> {
    const normalized: Record<string, any> = {
      email: request.email,
      name: request.name
    };

    // Add optional fields
    if (request.username) normalized.username = request.username;
    if (request.bio) normalized.bio = request.bio;
    if (request.picture_url) normalized.picture_url = request.picture_url;
    if (request.customFields) Object.assign(normalized, request.customFields);

    // Apply column mappings if available
    if (tableMap) {
      const mappedData: Record<string, any> = {};
      
      for (const mapping of tableMap.mappings) {
        const semanticField = mapping.semanticField;
        const actualColumn = mapping.actualColumn;
        
        if (normalized[semanticField] !== undefined) {
          mappedData[actualColumn] = normalized[semanticField];
        }
      }
      
      return mappedData;
    }

    return normalized;
  }

  private extractCustomFieldMappings(
    columnMappings: Map<string, TableColumnMap>
  ): Record<string, string> | undefined {
    const mappings: Record<string, string> = {};
    
    for (const [tableName, tableMap] of columnMappings) {
      for (const mapping of tableMap.mappings) {
        mappings[mapping.semanticField] = mapping.actualColumn;
      }
    }
    
    return Object.keys(mappings).length > 0 ? mappings : undefined;
  }

  private generateRecommendations(
    schemaInfo: SchemaIntrospectionResult,
    columnMappings: Map<string, TableColumnMap>,
    workflow: UserCreationWorkflow
  ): string[] {
    const recommendations: string[] = [];

    // Framework confidence recommendations
    if (schemaInfo.framework.confidence < 0.7) {
      recommendations.push(
        `Low framework detection confidence (${(schemaInfo.framework.confidence * 100).toFixed(1)}%). Consider specifying framework in configuration.`
      );
    }

    // Column mapping recommendations
    for (const [tableName, tableMap] of columnMappings) {
      if (tableMap.confidence < 0.6) {
        recommendations.push(
          `Low column mapping confidence for ${tableName} (${(tableMap.confidence * 100).toFixed(1)}%). Review column mappings.`
        );
      }

      if (tableMap.recommendations.length > 0) {
        recommendations.push(...tableMap.recommendations.map(r => r.message));
      }
    }

    // Workflow recommendations
    if (workflow.steps.length > 10) {
      recommendations.push(
        `Complex workflow with ${workflow.steps.length} steps. Consider simplifying schema or enabling error continuation.`
      );
    }

    // Schema recommendations
    recommendations.push(...schemaInfo.recommendations.map(r => r.message));

    return recommendations;
  }

  private async getOrBuildWorkflow(analysis: SchemaAnalysisResult): Promise<UserCreationWorkflow> {
    // Return cached workflow if available
    if (this.cachedWorkflow && this.isCacheValid()) {
      return this.cachedWorkflow;
    }

    return analysis.workflow;
  }

  private async getEmptyWorkflow(): Promise<UserCreationWorkflow> {
    return {
      id: 'empty_workflow',
      name: 'Empty Workflow',
      description: 'Fallback workflow for error cases',
      steps: [],
      rollbackSteps: [],
      metadata: {
        framework: 'unknown',
        version: 'unknown',
        createdAt: new Date().toISOString(),
        schemaHash: 'error'
      }
    };
  }
}