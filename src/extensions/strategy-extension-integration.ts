/**
 * Strategy Extension Integration
 * Integrates domain extension framework with existing seeding strategies
 * Part of Task 3.1.4: Integrate extension framework with existing seeding strategies (FR-3.1)
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { DomainExtensionFramework } from './domain-extension-framework';
import { ExtensionRegistry } from './extension-registry';
import { ExtensionConfigManager } from './extension-config-manager';
import {
  DomainExtension,
  ExtensionExecutionResult,
  PlatformContext,
  DomainContent,
  UserArchetype,
  StorageConfig
} from './extension-types';
import type { FlexibleSeedConfig } from '../config-types';
import type { 
  ContentDomainType, 
  PlatformArchitectureType 
} from '../detection/detection-types';
import type { 
  UnifiedDetectionResult 
} from '../detection/detection-integration';
import type { 
  SeedingStrategy,
  DatabaseSchema,
  User
} from '../framework/strategy-interface';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Extension integration configuration
 */
export interface ExtensionIntegrationConfig {
  /** Whether extension integration is enabled */
  enabled: boolean;
  
  /** Extension execution strategy */
  executionStrategy: 'sequential' | 'parallel' | 'priority-based';
  
  /** Maximum concurrent extensions */
  maxConcurrentExtensions: number;
  
  /** Extension execution timeout */
  executionTimeout: number;
  
  /** Whether to fail fast on extension errors */
  failFast: boolean;
  
  /** Extension result merging strategy */
  mergeStrategy: 'replace' | 'merge' | 'append';
  
  /** Extension content filtering */
  contentFiltering: {
    /** Whether to filter duplicate content */
    filterDuplicates: boolean;
    /** Whether to validate content consistency */
    validateConsistency: boolean;
    /** Maximum content items per extension */
    maxItemsPerExtension: number;
  };
  
  /** Performance monitoring */
  monitoring: {
    /** Whether to track extension performance */
    enabled: boolean;
    /** Whether to log detailed execution metrics */
    detailedMetrics: boolean;
    /** Performance alert thresholds */
    alertThresholds: {
      maxExecutionTime: number;
      maxMemoryUsage: number;
      maxErrorRate: number;
    };
  };
}

/**
 * Extension execution context for strategies
 */
export interface StrategyExtensionContext {
  /** Seeding strategy being executed */
  strategy: SeedingStrategy;
  
  /** Database client */
  client: SupabaseClient;
  
  /** Seed configuration */
  config: FlexibleSeedConfig;
  
  /** Database schema */
  schema: DatabaseSchema;
  
  /** Detection results */
  detectionResults: UnifiedDetectionResult;
  
  /** Users being created */
  users: User[];
  
  /** Current seeding phase */
  phase: 'pre-seeding' | 'user-creation' | 'content-generation' | 'post-seeding';
  
  /** Execution metadata */
  metadata: {
    batchId: string;
    startTime: number;
    currentUser?: User;
    currentUserIndex?: number;
  };
}

/**
 * Extension execution result for strategies
 */
export interface StrategyExtensionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Generated content from extensions */
  content: {
    /** Primary content items organized by type */
    primary: Record<string, any[]>;
    /** Secondary content items */
    secondary: Record<string, any[]>;
    /** Media files generated */
    media: Array<{
      filename: string;
      bucket: string;
      path: string;
      metadata: Record<string, any>;
    }>;
  };
  
  /** User archetypes from extensions */
  archetypes: UserArchetype[];
  
  /** Storage configurations from extensions */
  storageConfigs: StorageConfig[];
  
  /** Extension execution results */
  extensionResults: ExtensionExecutionResult[];
  
  /** Execution metadata */
  execution: {
    /** Total execution time */
    totalExecutionTime: number;
    /** Extensions executed */
    extensionsExecuted: number;
    /** Successful extensions */
    successfulExtensions: number;
    /** Failed extensions */
    failedExtensions: number;
    /** Content items generated */
    contentItemsGenerated: number;
    /** Media files generated */
    mediaFilesGenerated: number;
  };
  
  /** Warnings and errors */
  warnings: string[];
  errors: string[];
}

/**
 * Strategy Extension Integration Manager
 * Manages integration between domain extensions and seeding strategies
 */
export class StrategyExtensionIntegration {
  private extensionFramework: DomainExtensionFramework;
  private extensionRegistry: ExtensionRegistry;
  private configManager: ExtensionConfigManager;
  private config: ExtensionIntegrationConfig;
  private executionHistory: Map<string, StrategyExtensionResult> = new Map();
  
  constructor(
    extensionFramework: DomainExtensionFramework,
    extensionRegistry: ExtensionRegistry,
    configManager: ExtensionConfigManager,
    config: Partial<ExtensionIntegrationConfig> = {}
  ) {
    this.extensionFramework = extensionFramework;
    this.extensionRegistry = extensionRegistry;
    this.configManager = configManager;
    this.config = this.mergeWithDefaults(config);
  }
  
  /**
   * Execute extensions for a seeding strategy
   * @param context Strategy execution context
   * @returns Extension execution results
   */
  async executeExtensionsForStrategy(
    context: StrategyExtensionContext
  ): Promise<StrategyExtensionResult> {
    const executionId = `${context.strategy.name}-${context.metadata.batchId}`;
    const startTime = Date.now();
    
    Logger.info(`🔌 Executing extensions for strategy: ${context.strategy.name}`);
    
    try {
      if (!this.config.enabled) {
        Logger.debug('Extension integration is disabled');
        return this.createEmptyResult(executionId, startTime);
      }
      
      // Build platform context from strategy context
      const platformContext = await this.buildPlatformContext(context);
      
      // Execute extensions based on strategy
      const extensionResults = await this.executeExtensionsWithStrategy(
        platformContext,
        context
      );
      
      // Process and merge results
      const processedResult = await this.processExtensionResults(
        extensionResults,
        context
      );
      
      // Store execution history
      this.executionHistory.set(executionId, processedResult);
      
      // Log execution summary
      const executionTime = Date.now() - startTime;
      Logger.info(`✅ Extension execution completed for ${context.strategy.name}: ${processedResult.execution.extensionsExecuted} extensions, ${processedResult.execution.contentItemsGenerated} items generated (${executionTime}ms)`);
      
      return processedResult;
      
    } catch (error: any) {
      Logger.error(`❌ Extension execution failed for strategy ${context.strategy.name}:`, error);
      
      return {
        success: false,
        content: { primary: {}, secondary: {}, media: [] },
        archetypes: [],
        storageConfigs: [],
        extensionResults: [],
        execution: {
          totalExecutionTime: Date.now() - startTime,
          extensionsExecuted: 0,
          successfulExtensions: 0,
          failedExtensions: 0,
          contentItemsGenerated: 0,
          mediaFilesGenerated: 0
        },
        warnings: [],
        errors: [error.message]
      };
    }
  }
  
  /**
   * Get applicable extensions for strategy context
   * @param context Strategy execution context
   * @returns Array of applicable extensions
   */
  async getApplicableExtensions(
    context: StrategyExtensionContext
  ): Promise<DomainExtension[]> {
    try {
      // Get enabled extensions from registry
      const registeredExtensions = this.extensionRegistry.getExtensions({
        enabled: true,
        state: 'active'
      });
      
      const applicableExtensions: DomainExtension[] = [];
      
      // Filter extensions based on strategy context
      for (const entry of registeredExtensions) {
        if (!entry.instance) continue;
        
        try {
          // Check domain compatibility
          const domainCompatible = entry.instance.supportedDomains.includes(
            context.detectionResults.domain.primaryDomain
          );
          
          // Check architecture compatibility
          const architectureCompatible = entry.instance.supportedArchitectures.includes(
            context.detectionResults.architecture.architectureType
          );
          
          if (domainCompatible && architectureCompatible) {
            // Test extension confidence
            const platformContext = await this.buildPlatformContext(context);
            const confidence = await entry.instance.detectDomain(platformContext);
            
            if (confidence > 0.1) { // Minimum confidence threshold
              applicableExtensions.push(entry.instance);
            }
          }
        } catch (error) {
          Logger.error(`Error testing extension ${entry.name}:`, error);
        }
      }
      
      return applicableExtensions;
      
    } catch (error: any) {
      Logger.error('Failed to get applicable extensions:', error);
      return [];
    }
  }
  
  /**
   * Generate user archetypes for strategy
   * @param context Strategy execution context
   * @returns Array of user archetypes
   */
  async generateUserArchetypesForStrategy(
    context: StrategyExtensionContext
  ): Promise<UserArchetype[]> {
    try {
      Logger.debug('🎭 Generating user archetypes from extensions');
      
      const applicableExtensions = await this.getApplicableExtensions(context);
      const allArchetypes: UserArchetype[] = [];
      
      // Get archetypes from each extension
      for (const extension of applicableExtensions) {
        try {
          const platformContext = await this.buildPlatformContext(context);
          const archetypes = await extension.getUserArchetypes(platformContext);
          allArchetypes.push(...archetypes);
        } catch (error) {
          Logger.error(`Error getting archetypes from extension ${extension.name}:`, error);
        }
      }
      
      // Deduplicate and merge archetypes
      const mergedArchetypes = this.mergeUserArchetypes(allArchetypes);
      
      Logger.debug(`✅ Generated ${mergedArchetypes.length} user archetypes from ${applicableExtensions.length} extensions`);
      return mergedArchetypes;
      
    } catch (error: any) {
      Logger.error('Failed to generate user archetypes:', error);
      return [];
    }
  }
  
  /**
   * Generate storage configuration for strategy
   * @param context Strategy execution context
   * @returns Merged storage configuration
   */
  async generateStorageConfigForStrategy(
    context: StrategyExtensionContext
  ): Promise<StorageConfig | null> {
    try {
      Logger.debug('💾 Generating storage configuration from extensions');
      
      const applicableExtensions = await this.getApplicableExtensions(context);
      const storageConfigs: StorageConfig[] = [];
      
      // Get storage configs from each extension
      for (const extension of applicableExtensions) {
        try {
          const platformContext = await this.buildPlatformContext(context);
          const storageConfig = await extension.getStorageConfig(platformContext);
          storageConfigs.push(storageConfig);
        } catch (error) {
          Logger.error(`Error getting storage config from extension ${extension.name}:`, error);
        }
      }
      
      if (storageConfigs.length === 0) {
        return null;
      }
      
      // Merge storage configurations
      const mergedConfig = this.mergeStorageConfigs(storageConfigs);
      
      Logger.debug(`✅ Generated merged storage configuration from ${storageConfigs.length} extensions`);
      return mergedConfig;
      
    } catch (error: any) {
      Logger.error('Failed to generate storage configuration:', error);
      return null;
    }
  }
  
  /**
   * Get extension execution history
   * @param strategyName Optional strategy name filter
   * @returns Execution history
   */
  getExecutionHistory(strategyName?: string): StrategyExtensionResult[] {
    const results = Array.from(this.executionHistory.values());
    
    if (strategyName) {
      return results.filter(result => 
        result.extensionResults.some(er => er.execution.extensionName.includes(strategyName))
      );
    }
    
    return results;
  }
  
  /**
   * Get extension integration statistics
   * @returns Integration statistics
   */
  getIntegrationStatistics() {
    const history = Array.from(this.executionHistory.values());
    
    const totalExecutions = history.length;
    const successfulExecutions = history.filter(h => h.success).length;
    const totalExtensionsExecuted = history.reduce((sum, h) => sum + h.execution.extensionsExecuted, 0);
    const totalContentGenerated = history.reduce((sum, h) => sum + h.execution.contentItemsGenerated, 0);
    const totalMediaGenerated = history.reduce((sum, h) => sum + h.execution.mediaFilesGenerated, 0);
    const averageExecutionTime = totalExecutions > 0 
      ? history.reduce((sum, h) => sum + h.execution.totalExecutionTime, 0) / totalExecutions 
      : 0;
      
    return {
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      totalExtensionsExecuted,
      totalContentGenerated,
      totalMediaGenerated,
      averageExecutionTime,
      registeredExtensions: this.extensionRegistry.getExtensions().length,
      enabledExtensions: this.extensionRegistry.getExtensions({ enabled: true }).length,
      activeExtensions: this.extensionRegistry.getExtensions({ state: 'active' }).length
    };
  }
  
  // Private implementation methods
  
  private mergeWithDefaults(config: Partial<ExtensionIntegrationConfig>): ExtensionIntegrationConfig {
    return {
      enabled: true,
      executionStrategy: 'priority-based',
      maxConcurrentExtensions: 3,
      executionTimeout: 30000,
      failFast: false,
      mergeStrategy: 'merge',
      contentFiltering: {
        filterDuplicates: true,
        validateConsistency: true,
        maxItemsPerExtension: 1000
      },
      monitoring: {
        enabled: true,
        detailedMetrics: false,
        alertThresholds: {
          maxExecutionTime: 10000,
          maxMemoryUsage: 100,
          maxErrorRate: 0.1
        }
      },
      ...config
    };
  }
  
  private async buildPlatformContext(context: StrategyExtensionContext): Promise<PlatformContext> {
    return {
      client: context.client,
      config: context.config,
      architecture: context.detectionResults.architecture.architectureType,
      domain: context.detectionResults.domain.primaryDomain,
      schema: {
        tables: context.schema.tables.map(t => t.name),
        relationships: this.extractRelationships(context.schema),
        constraints: this.extractConstraints(context.schema)
      },
      userContext: {
        userCount: context.config.userCount,
        currentUserIndex: context.metadata.currentUserIndex || 0,
        existingUsers: context.users,
        teamAssignments: this.extractTeamAssignments(context.users)
      },
      contentContext: {
        setupsPerUser: context.config.setupsPerUser,
        imagesPerSetup: context.config.imagesPerSetup,
        enableRealImages: context.config.enableRealImages,
        existingContent: {}
      },
      executionMetadata: {
        batchId: context.metadata.batchId,
        timestamp: context.metadata.startTime,
        parentExtensions: [],
        executionId: `${context.strategy.name}-${Date.now()}`
      }
    };
  }
  
  private async executeExtensionsWithStrategy(
    platformContext: PlatformContext,
    context: StrategyExtensionContext
  ): Promise<ExtensionExecutionResult[]> {
    return await this.extensionFramework.executeExtensions(
      platformContext,
      context.detectionResults.domain.primaryDomain
    );
  }
  
  private async processExtensionResults(
    extensionResults: ExtensionExecutionResult[],
    context: StrategyExtensionContext
  ): Promise<StrategyExtensionResult> {
    const startTime = Date.now();
    
    // Organize content by type
    const primaryContent: Record<string, any[]> = {};
    const secondaryContent: Record<string, any[]> = {};
    const allMedia: Array<{ filename: string; bucket: string; path: string; metadata: Record<string, any> }> = [];
    const allArchetypes: UserArchetype[] = [];
    const allStorageConfigs: StorageConfig[] = [];
    
    // Process each extension result
    for (const result of extensionResults) {
      if (!result.success) continue;
      
      // Merge content
      if (result.content) {
        // Primary content
        if (result.content.primary) {
          if (!primaryContent[result.content.primary.type]) {
            primaryContent[result.content.primary.type] = [];
          }
          primaryContent[result.content.primary.type].push(...result.content.primary.items);
        }
        
        // Secondary content
        if (result.content.secondary) {
          for (const secondary of result.content.secondary) {
            if (!secondaryContent[secondary.type]) {
              secondaryContent[secondary.type] = [];
            }
            secondaryContent[secondary.type].push(...secondary.items);
          }
        }
        
        // Media
        if (result.content.media) {
          allMedia.push(...result.content.media.images);
          allMedia.push(...result.content.media.files);
        }
      }
      
      // Collect archetypes
      if (result.archetypes) {
        allArchetypes.push(...result.archetypes);
      }
      
      // Collect storage configs
      if (result.storageConfig) {
        allStorageConfigs.push(result.storageConfig);
      }
    }
    
    // Apply content filtering if enabled
    if (this.config.contentFiltering.filterDuplicates) {
      this.filterDuplicateContent(primaryContent);
      this.filterDuplicateContent(secondaryContent);
    }
    
    // Calculate execution metrics
    const successfulResults = extensionResults.filter(r => r.success);
    const failedResults = extensionResults.filter(r => !r.success);
    const totalContentItems = Object.values(primaryContent).flat().length + 
                             Object.values(secondaryContent).flat().length;
    
    // Collect warnings and errors
    const warnings = extensionResults.flatMap(r => r.warnings);
    const errors = extensionResults.flatMap(r => r.errors.map(e => e.message));
    
    return {
      success: successfulResults.length > 0,
      content: {
        primary: primaryContent,
        secondary: secondaryContent,
        media: allMedia
      },
      archetypes: this.mergeUserArchetypes(allArchetypes),
      storageConfigs: allStorageConfigs,
      extensionResults,
      execution: {
        totalExecutionTime: Date.now() - startTime,
        extensionsExecuted: extensionResults.length,
        successfulExtensions: successfulResults.length,
        failedExtensions: failedResults.length,
        contentItemsGenerated: totalContentItems,
        mediaFilesGenerated: allMedia.length
      },
      warnings,
      errors
    };
  }
  
  private createEmptyResult(executionId: string, startTime: number): StrategyExtensionResult {
    return {
      success: true,
      content: { primary: {}, secondary: {}, media: [] },
      archetypes: [],
      storageConfigs: [],
      extensionResults: [],
      execution: {
        totalExecutionTime: Date.now() - startTime,
        extensionsExecuted: 0,
        successfulExtensions: 0,
        failedExtensions: 0,
        contentItemsGenerated: 0,
        mediaFilesGenerated: 0
      },
      warnings: [],
      errors: []
    };
  }
  
  private extractRelationships(schema: DatabaseSchema): Record<string, string[]> {
    // This is a simplified extraction - in reality, you'd analyze foreign keys
    const relationships: Record<string, string[]> = {};
    
    for (const table of schema.tables) {
      relationships[table.name] = [];
      
      // Extract relationships from columns (simplified)
      for (const column of table.columns) {
        if (column.name.endsWith('_id') && column.name !== 'id') {
          const referencedTable = column.name.replace('_id', '');
          if (schema.tables.some(t => t.name === referencedTable)) {
            relationships[table.name].push(referencedTable);
          }
        }
      }
    }
    
    return relationships;
  }
  
  private extractConstraints(schema: DatabaseSchema): Record<string, any[]> {
    // This is a simplified extraction - in reality, you'd analyze actual constraints  
    const constraints: Record<string, any[]> = {};
    
    for (const table of schema.tables) {
      constraints[table.name] = [];
      
      // Extract basic constraints from columns
      for (const column of table.columns) {
        if (!column.nullable) {
          constraints[table.name].push({
            type: 'not_null',
            column: column.name
          });
        }
        
        if (column.name === 'id') {
          constraints[table.name].push({
            type: 'primary_key',
            column: column.name
          });
        }
      }
    }
    
    return constraints;
  }
  
  private extractTeamAssignments(users: User[]): Record<string, string[]> | undefined {
    // This would extract team assignments if the platform supports teams
    // For now, return undefined as it's optional
    return undefined;
  }
  
  private mergeUserArchetypes(archetypes: UserArchetype[]): UserArchetype[] {
    const uniqueArchetypes = new Map<string, UserArchetype>();
    
    for (const archetype of archetypes) {
      const key = `${archetype.email}-${archetype.role}`;
      
      if (!uniqueArchetypes.has(key)) {
        uniqueArchetypes.set(key, archetype);
      } else {
        // Merge duplicate archetypes
        const existing = uniqueArchetypes.get(key)!;
        existing.platformContext.weight = Math.max(
          existing.platformContext.weight,
          archetype.platformContext.weight
        );
      }
    }
    
    return Array.from(uniqueArchetypes.values());
  }
  
  private mergeStorageConfigs(configs: StorageConfig[]): StorageConfig {
    if (configs.length === 0) {
      throw new Error('No storage configurations to merge');
    }
    
    if (configs.length === 1) {
      return configs[0];
    }
    
    // Merge storage configurations (simplified approach)
    const mergedConfig = { ...configs[0] };
    
    // Merge buckets
    for (let i = 1; i < configs.length; i++) {
      const config = configs[i];
      
      // Add secondary buckets
      if (config.buckets.secondary) {
        if (!mergedConfig.buckets.secondary) {
          mergedConfig.buckets.secondary = [];
        }
        mergedConfig.buckets.secondary.push(...config.buckets.secondary);
      }
    }
    
    return mergedConfig;
  }
  
  private filterDuplicateContent(content: Record<string, any[]>): void {
    for (const [type, items] of Object.entries(content)) {
      // Simple deduplication based on JSON stringify
      const unique = new Map<string, any>();
      
      for (const item of items) {
        const key = JSON.stringify(item);
        if (!unique.has(key)) {
          unique.set(key, item);
        }
      }
      
      content[type] = Array.from(unique.values());
    }
  }
}