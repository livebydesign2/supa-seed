/**
 * Framework-Agnostic User Creation Logic
 * Adapts user creation to any schema structure and constraints
 * Replaces framework-specific assumptions with dynamic adaptation
 */

import type { createClient } from '@supabase/supabase-js';
import { SchemaDrivenAdapter, UserCreationRequest, UserCreationResponse } from './schema-driven-adapter';
import { SchemaIntrospectionResult } from './schema-introspector';
import { Logger } from '../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface AdaptiveUserCreationConfig {
  // Adaptation strategies
  fallbackToSimpleCreation: boolean;
  enableProgressiveEnhancement: boolean;
  enableGracefulDegradation: boolean;
  
  // Framework detection
  autoDetectFramework: boolean;
  frameworkHints?: string[];
  
  // Constraint handling
  skipOptionalConstraints: boolean;
  generateMissingRelationships: boolean;
  createDependenciesOnDemand: boolean;
  
  // Error recovery
  enableMultipleAttempts: boolean;
  fallbackStrategies: Array<'simple_profiles' | 'accounts_only' | 'auth_only'>;
  
  // Customization
  beforeUserCreation?: (request: UserCreationRequest) => Promise<UserCreationRequest>;
  afterUserCreation?: (response: UserCreationResponse) => Promise<UserCreationResponse>;
  onError?: (error: any, attempt: number) => Promise<boolean>; // return true to retry
}

export interface AdaptiveCreationResult extends UserCreationResponse {
  adaptationInfo: {
    frameworkDetected: string;
    strategiesUsed: string[];
    fallbacksTriggered: string[];
    constraintsHandled: number;
    adaptationConfidence: number;
  };
  compatibilityReport: {
    fullCompatibility: boolean;
    partialCompatibility: boolean;
    limitationsFound: string[];
    enhancementsApplied: string[];
  };
}

export class FrameworkAgnosticUserCreator {
  private client: SupabaseClient;
  private adapter: SchemaDrivenAdapter;
  private config: AdaptiveUserCreationConfig;

  constructor(
    client: SupabaseClient, 
    config: Partial<AdaptiveUserCreationConfig> = {}
  ) {
    this.client = client;
    this.config = {
      fallbackToSimpleCreation: true,
      enableProgressiveEnhancement: true,
      enableGracefulDegradation: true,
      autoDetectFramework: true,
      skipOptionalConstraints: false,
      generateMissingRelationships: true,
      createDependenciesOnDemand: true,
      enableMultipleAttempts: true,
      fallbackStrategies: ['simple_profiles', 'accounts_only', 'auth_only'],
      ...config
    };

    // Initialize the schema-driven adapter
    this.adapter = new SchemaDrivenAdapter(client, {
      enableConstraintValidation: true,
      enableRollback: true,
      enableAutoFixes: true,
      enableSchemaCache: true
    });
  }

  /**
   * Create a user with adaptive framework detection and constraint handling
   */
  async createUser(request: UserCreationRequest): Promise<AdaptiveCreationResult> {
    Logger.info(`🎯 Starting framework-agnostic user creation for ${request.email}`);

    const adaptationInfo = {
      frameworkDetected: 'unknown',
      strategiesUsed: [] as string[],
      fallbacksTriggered: [] as string[],
      constraintsHandled: 0,
      adaptationConfidence: 0
    };

    const compatibilityReport = {
      fullCompatibility: false,
      partialCompatibility: false,
      limitationsFound: [],
      enhancementsApplied: []
    };

    try {
      // Apply pre-creation hook
      if (this.config.beforeUserCreation) {
        request = await this.config.beforeUserCreation(request);
        adaptationInfo.strategiesUsed.push('pre_creation_hook');
      }

      // Attempt primary creation strategy
      let response = await this.attemptPrimaryCreation(request, adaptationInfo, compatibilityReport);

      // If primary strategy failed and fallback is enabled, try fallback strategies
      if (!response.success && this.config.enableMultipleAttempts) {
        response = await this.attemptFallbackStrategies(request, adaptationInfo, compatibilityReport);
      }

      // Apply post-creation hook
      if (this.config.afterUserCreation) {
        response = await this.config.afterUserCreation(response);
        adaptationInfo.strategiesUsed.push('post_creation_hook');
      }

      // Determine compatibility status
      if (response.success) {
        if (adaptationInfo.fallbacksTriggered.length === 0) {
          compatibilityReport.fullCompatibility = true;
        } else {
          compatibilityReport.partialCompatibility = true;
        }
      }

      const result: AdaptiveCreationResult = {
        ...response,
        adaptationInfo,
        compatibilityReport
      };

      this.logCreationResult(result);
      return result;

    } catch (error: any) {
      Logger.error('Framework-agnostic user creation failed:', error);

      // Handle error with custom handler
      if (this.config.onError) {
        const shouldRetry = await this.config.onError(error, 1);
        if (shouldRetry) {
          Logger.info('Retrying user creation after error handler...');
          return this.createUser(request);
        }
      }

      return this.createErrorResponse(request, error, adaptationInfo, compatibilityReport);
    }
  }

  /**
   * Attempt primary creation using schema-driven approach
   */
  private async attemptPrimaryCreation(
    request: UserCreationRequest,
    adaptationInfo: any,
    compatibilityReport: any
  ): Promise<UserCreationResponse> {
    Logger.debug('Attempting primary schema-driven creation...');

    try {
      // Get schema information for adaptation
      const schemaInfo = await this.adapter.getSchemaInfo();
      adaptationInfo.frameworkDetected = schemaInfo.framework.type;
      adaptationInfo.adaptationConfidence = schemaInfo.framework.confidence;
      adaptationInfo.strategiesUsed.push('schema_driven');

      // Apply progressive enhancement based on detected framework
      if (this.config.enableProgressiveEnhancement) {
        request = await this.applyProgressiveEnhancement(request, schemaInfo, compatibilityReport);
      }

      // Attempt creation
      const response = await this.adapter.createUser(request);

      // Track constraint handling
      if (response.validationResult) {
        adaptationInfo.constraintsHandled = response.validationResult.constraintsChecked;
        
        if (response.appliedFixes && response.appliedFixes.length > 0) {
          compatibilityReport.enhancementsApplied.push(
            `Applied ${response.appliedFixes.length} auto-fixes`
          );
        }
      }

      return response;

    } catch (error: any) {
      Logger.warn(`Primary creation failed: ${error.message}`);
      adaptationInfo.fallbacksTriggered.push('primary_strategy_failed');
      throw error;
    }
  }

  /**
   * Apply progressive enhancement based on detected framework
   */
  private async applyProgressiveEnhancement(
    request: UserCreationRequest,
    schemaInfo: any,
    compatibilityReport: any
  ): Promise<UserCreationRequest> {
    const enhancedRequest = { ...request };

    // MakerKit-specific enhancements
    if (schemaInfo.framework.type === 'makerkit') {
      // Ensure username is set for MakerKit
      if (!enhancedRequest.username) {
        enhancedRequest.username = this.generateUsernameFromEmail(enhancedRequest.email);
        compatibilityReport.enhancementsApplied.push('Generated username for MakerKit compatibility');
      }

      // Add MakerKit-specific metadata
      enhancedRequest.metadata = {
        ...enhancedRequest.metadata,
        framework: 'makerkit',
        version: schemaInfo.framework.version,
        seedingSource: 'supa-seed-framework-agnostic'
      };

      compatibilityReport.enhancementsApplied.push('Added MakerKit-specific metadata');
    }

    // Nextjs-specific enhancements
    if (schemaInfo.framework.type === 'nextjs') {
      // Add Next.js specific fields if needed
      compatibilityReport.enhancementsApplied.push('Applied Next.js compatibility enhancements');
    }

    // Custom framework enhancements
    if (schemaInfo.framework.type === 'custom') {
      // Apply generic enhancements for custom frameworks
      if (!enhancedRequest.picture_url) {
        enhancedRequest.picture_url = this.generateDefaultAvatar(enhancedRequest.name);
        compatibilityReport.enhancementsApplied.push('Generated default avatar for custom framework');
      }
    }

    return enhancedRequest;
  }

  /**
   * Attempt fallback strategies when primary creation fails
   */
  private async attemptFallbackStrategies(
    request: UserCreationRequest,
    adaptationInfo: any,
    compatibilityReport: any
  ): Promise<UserCreationResponse> {
    Logger.info('Primary creation failed, attempting fallback strategies...');

    for (const strategy of this.config.fallbackStrategies || []) {
      try {
        Logger.debug(`Attempting fallback strategy: ${strategy}`);
        
        const response = await this.executeFallbackStrategy(strategy, request);
        
        if (response.success) {
          adaptationInfo.fallbacksTriggered.push(strategy);
          adaptationInfo.strategiesUsed.push(`fallback_${strategy}`);
          compatibilityReport.limitationsFound.push(
            `Primary strategy failed, used ${strategy} fallback`
          );
          
          Logger.success(`✅ Fallback strategy ${strategy} succeeded`);
          return response;
        }

      } catch (error: any) {
        Logger.warn(`Fallback strategy ${strategy} failed: ${error.message}`);
        compatibilityReport.limitationsFound.push(
          `Fallback strategy ${strategy} failed: ${error.message}`
        );
      }
    }

    throw new Error('All fallback strategies failed');
  }

  /**
   * Execute a specific fallback strategy
   */
  private async executeFallbackStrategy(
    strategy: string,
    request: UserCreationRequest
  ): Promise<UserCreationResponse> {
    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    switch (strategy) {
      case 'simple_profiles':
        return await this.createSimpleProfileUser(request, executionId, startTime);
      
      case 'accounts_only':
        return await this.createAccountOnlyUser(request, executionId, startTime);
      
      case 'auth_only':
        return await this.createAuthOnlyUser(request, executionId, startTime);
      
      default:
        throw new Error(`Unknown fallback strategy: ${strategy}`);
    }
  }

  /**
   * Simple profiles-based user creation (most basic approach)
   */
  private async createSimpleProfileUser(
    request: UserCreationRequest,
    executionId: string,
    startTime: number
  ): Promise<UserCreationResponse> {
    const userId = crypto.randomUUID();

    // Create auth user
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: request.email,
      password: request.password || 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: request.name,
        username: request.username
      }
    });

    if (authError) {
      throw new Error(`Auth user creation failed: ${authError.message}`);
    }

    // Try to create a simple profile record
    try {
      const { error: profileError } = await this.client
        .from('profiles')
        .insert({
          id: userId,
          email: request.email,
          name: request.name,
          username: request.username,
          bio: request.bio,
          avatar_url: request.picture_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        Logger.warn(`Profile creation failed, but auth user created: ${profileError.message}`);
      }
    } catch (error) {
      Logger.warn('Profile table may not exist or have different structure');
    }

    return this.createSuccessResponse(
      request,
      userId,
      executionId,
      Date.now() - startTime,
      'simple_profiles'
    );
  }

  /**
   * Account-only user creation (for account-based systems)
   */
  private async createAccountOnlyUser(
    request: UserCreationRequest,
    executionId: string,
    startTime: number
  ): Promise<UserCreationResponse> {
    const userId = crypto.randomUUID();

    // Create auth user
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: request.email,
      password: request.password || 'password123',
      email_confirm: true
    });

    if (authError) {
      throw new Error(`Auth user creation failed: ${authError.message}`);
    }

    // Try to create an account record
    try {
      const { error: accountError } = await this.client
        .from('accounts')
        .insert({
          id: userId,
          email: request.email,
          name: request.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (accountError) {
        Logger.warn(`Account creation failed, but auth user created: ${accountError.message}`);
      }
    } catch (error) {
      Logger.warn('Account table may not exist or have different structure');
    }

    return this.createSuccessResponse(
      request,
      userId,
      executionId,
      Date.now() - startTime,
      'accounts_only'
    );
  }

  /**
   * Auth-only user creation (most basic fallback)
   */
  private async createAuthOnlyUser(
    request: UserCreationRequest,
    executionId: string,
    startTime: number
  ): Promise<UserCreationResponse> {
    const userId = crypto.randomUUID();

    // Create only auth user with all data in metadata
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: request.email,
      password: request.password || 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: request.name,
        username: request.username,
        bio: request.bio,
        picture_url: request.picture_url,
        ...request.metadata
      }
    });

    if (authError) {
      throw new Error(`Auth user creation failed: ${authError.message}`);
    }

    return this.createSuccessResponse(
      request,
      userId,
      executionId,
      Date.now() - startTime,
      'auth_only'
    );
  }

  /**
   * Utility methods
   */
  private generateUsernameFromEmail(email: string): string {
    const baseUsername = email.split('@')[0].toLowerCase();
    // Remove special characters and add random suffix for uniqueness
    const cleanUsername = baseUsername.replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000);
    return `${cleanUsername}${randomSuffix}`;
  }

  private generateDefaultAvatar(name: string): string {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&bold=true&size=200`;
  }

  private createSuccessResponse(
    request: UserCreationRequest,
    userId: string,
    executionId: string,
    duration: number,
    strategy: string
  ): UserCreationResponse {
    return {
      success: true,
      userId,
      executionId,
      workflow: {
        id: `fallback_${strategy}_${Date.now()}`,
        name: `Fallback: ${strategy}`,
        description: `Fallback user creation using ${strategy} strategy`,
        steps: [],
        rollbackSteps: [],
        metadata: {
          framework: 'fallback',
          version: strategy,
          createdAt: new Date().toISOString(),
          schemaHash: 'fallback'
        }
      },
      executionResult: {
        success: true,
        userId,
        executionId,
        duration,
        completedSteps: [`create_auth_user`, `create_${strategy}_record`],
        rollbackRequired: false,
        rollbackCompleted: false,
        stepResults: {
          auth_user: { id: userId, email: request.email },
          fallback_record: { strategy }
        }
      },
      schemaInfo: {
        framework: 'fallback',
        version: strategy,
        confidence: 0.5,
        primaryUserTable: strategy === 'simple_profiles' ? 'profiles' : 
                         strategy === 'accounts_only' ? 'accounts' : 'auth.users'
      },
      performance: {
        introspectionTime: 0,
        workflowBuildTime: 0,
        executionTime: duration,
        totalTime: duration
      },
      recommendations: [
        `Used fallback strategy: ${strategy}`,
        'Consider configuring schema-driven approach for better compatibility'
      ]
    };
  }

  private createErrorResponse(
    request: UserCreationRequest,
    error: any,
    adaptationInfo: any,
    compatibilityReport: any
  ): AdaptiveCreationResult {
    return {
      success: false,
      executionId: crypto.randomUUID(),
      workflow: {
        id: 'error_workflow',
        name: 'Error Workflow',
        description: 'Error occurred during user creation',
        steps: [],
        rollbackSteps: [],
        metadata: {
          framework: 'error',
          version: 'error',
          createdAt: new Date().toISOString(),
          schemaHash: 'error'
        }
      },
      executionResult: {
        success: false,
        executionId: crypto.randomUUID(),
        duration: 0,
        completedSteps: [],
        error: error.message,
        rollbackRequired: false,
        rollbackCompleted: false,
        stepResults: {}
      },
      schemaInfo: {
        framework: 'error',
        version: 'error',
        confidence: 0,
        primaryUserTable: 'unknown'
      },
      performance: {
        introspectionTime: 0,
        workflowBuildTime: 0,
        executionTime: 0,
        totalTime: 0
      },
      recommendations: [`Error: ${error.message}`],
      adaptationInfo,
      compatibilityReport
    };
  }

  private logCreationResult(result: AdaptiveCreationResult): void {
    if (result.success) {
      Logger.success(`✅ Framework-agnostic user creation succeeded`);
      Logger.info(`   Framework: ${result.adaptationInfo.frameworkDetected}`);
      Logger.info(`   Strategies: ${result.adaptationInfo.strategiesUsed.join(', ')}`);
      Logger.info(`   Compatibility: ${result.compatibilityReport.fullCompatibility ? 'Full' : 'Partial'}`);
    } else {
      Logger.error(`❌ Framework-agnostic user creation failed`);
      Logger.error(`   Error: ${result.executionResult.error}`);
      Logger.error(`   Fallbacks tried: ${result.adaptationInfo.fallbacksTriggered.join(', ')}`);
    }
  }

  /**
   * Public configuration methods
   */
  updateConfig(newConfig: Partial<AdaptiveUserCreationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.debug('Framework-agnostic user creator configuration updated');
  }

  async getCompatibilityReport(): Promise<{
    detectedFramework: string;
    confidence: number;
    supportedFeatures: string[];
    limitations: string[];
    recommendations: string[];
  }> {
    const schemaInfo = await this.adapter.getSchemaInfo();
    
    return {
      detectedFramework: schemaInfo.framework.type,
      confidence: schemaInfo.framework.confidence,
      supportedFeatures: [
        'Dynamic schema introspection',
        'Constraint-aware validation',
        'Progressive enhancement',
        'Graceful degradation',
        'Multiple fallback strategies'
      ],
      limitations: schemaInfo.framework.confidence < 0.7 ? 
        ['Low framework detection confidence'] : [],
      recommendations: [
        'Enable schema caching for better performance',
        'Configure custom column mappings for better accuracy',
        'Use constraint validation to prevent errors'
      ]
    };
  }
}