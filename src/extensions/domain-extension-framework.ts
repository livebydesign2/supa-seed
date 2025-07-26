/**
 * Domain Extension Framework for Epic 3: Pluggable Domain Extension System
 * Core framework for managing domain-specific content generation extensions
 * Part of Task 3.1.1: Create abstract DomainExtension base class and extension types (FR-3.1)
 */

import { Logger } from '../utils/logger';
import {
  DomainExtension,
  ExtensionConfig,
  ExtensionRegistryEntry,
  ExtensionValidationResult,
  ExtensionExecutionResult,  
  ExtensionConflict,
  ExtensionConflictResolution,
  ExtensionHealthStatus,
  PlatformContext,
  DomainContent,
  UserArchetype,
  StorageConfig,
  ExtensionLifecycleState,
  ExtensionPriority
} from './extension-types';
import type { ContentDomainType, PlatformArchitectureType } from '../detection/detection-types';

/**
 * Domain Extension Framework Configuration
 */
export interface DomainExtensionFrameworkConfig {
  /** Maximum number of concurrent extensions */
  maxConcurrentExtensions: number;
  
  /** Default execution timeout for extensions */
  defaultExecutionTimeout: number;
  
  /** Extension conflict resolution strategy */
  conflictResolution: ExtensionConflictResolution;
  
  /** Whether to enable extension isolation */
  enableExtensionIsolation: boolean;
  
  /** Health check interval (milliseconds) */
  healthCheckInterval: number;
  
  /** Extension registry persistence */
  registryPersistence: {
    enabled: boolean;
    filePath?: string;
    autoSave: boolean;
  };
  
  /** Performance monitoring */
  performanceMonitoring: {
    enabled: boolean;
    metricsRetention: number; // days
    alertThresholds: {
      maxExecutionTime: number;
      maxMemoryUsage: number;
      maxErrorRate: number;
    };
  };
  
  /** Debug and logging settings */
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableProfiling: boolean;
    saveExecutionLogs: boolean;
  };
}

/**
 * Extension execution context
 */
interface ExtensionExecutionContext {
  /** Execution identifier */
  executionId: string;
  
  /** Start timestamp */
  startTime: number;
  
  /** Platform context */
  platformContext: PlatformContext;
  
  /** Extension being executed */
  extension: DomainExtension;
  
  /** Execution timeout */
  timeout: number;
  
  /** Resource limits */
  resourceLimits: {
    maxMemory: number;
    maxExecutionTime: number;
  };
}

/**
 * Main Domain Extension Framework
 * Manages the lifecycle and execution of domain-specific extensions
 */
export class DomainExtensionFramework {
  private config: DomainExtensionFrameworkConfig;
  private registry: Map<string, ExtensionRegistryEntry> = new Map();
  private activeExecutions: Map<string, ExtensionExecutionContext> = new Map();
  private healthMonitor: NodeJS.Timeout | null = null;
  private performanceMetrics: Map<string, any[]> = new Map();
  
  constructor(config: Partial<DomainExtensionFrameworkConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.initializeFramework();
  }
  
  /**
   * Register a domain extension
   * @param extensionClass Extension class constructor
   * @param config Extension configuration
   * @returns Registration result
   */
  async registerExtension(
    extensionClass: new (config: ExtensionConfig) => DomainExtension,
    config: ExtensionConfig
  ): Promise<{ success: boolean; extensionId: string; errors: string[] }> {
    try {
      Logger.info(`🔌 Registering domain extension: ${config.metadata.description}`);
      
      // Create extension instance for validation
      const instance = new extensionClass(config);
      const extensionId = this.generateExtensionId(instance.name, config.metadata.version);
      
      // Check for conflicts
      const conflicts = await this.detectConflicts(instance, config);
      if (conflicts.length > 0 && conflicts.some(c => c.severity === 'blocking')) {
        const blockingConflicts = conflicts.filter(c => c.severity === 'blocking');
        Logger.error(`❌ Extension registration blocked due to conflicts:`, blockingConflicts);
        return {
          success: false,
          extensionId,
          errors: blockingConflicts.map(c => c.description)
        };
      }
      
      // Validate extension
      const validation = await instance.validate();
      if (!validation.valid) {
        Logger.error(`❌ Extension validation failed:`, validation.errors);
        return {
          success: false,
          extensionId,
          errors: validation.errors.map(e => e.message)
        };
      }
      
      // Create registry entry
      const registryEntry: ExtensionRegistryEntry = {
        id: extensionId,
        name: instance.name,
        extensionClass,
        config,
        instance,
        state: 'loaded',
        registeredAt: Date.now(),
        statistics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          averageMemoryUsage: 0
        },
        validation
      };
      
      // Store in registry
      this.registry.set(extensionId, registryEntry);
      
      // Resolve non-blocking conflicts
      if (conflicts.length > 0) {
        await this.resolveConflicts(conflicts);
      }
      
      Logger.info(`✅ Extension registered successfully: ${extensionId}`);
      
      // Start health monitoring if not already running
      if (!this.healthMonitor && this.config.performanceMonitoring.enabled) {
        this.startHealthMonitoring();
      }
      
      return {
        success: true,
        extensionId,
        errors: []
      };
      
    } catch (error: any) {
      Logger.error(`❌ Failed to register extension:`, error);
      return {
        success: false,
        extensionId: '',
        errors: [error.message]
      };
    }
  }
  
  /**
   * Unregister a domain extension
   * @param extensionId Extension identifier
   * @returns Whether unregistration was successful
   */
  async unregisterExtension(extensionId: string): Promise<boolean> {
    try {
      const entry = this.registry.get(extensionId);
      if (!entry) {
        Logger.warn(`⚠️ Extension not found for unregistration: ${extensionId}`);
        return false;
      }
      
      Logger.info(`🔌 Unregistering extension: ${extensionId}`);
      
      // Cleanup extension if it has an instance
      if (entry.instance) {
        await entry.instance.cleanup();
      }
      
      // Remove from registry
      this.registry.delete(extensionId);
      
      // Clean up performance metrics
      this.performanceMetrics.delete(extensionId);
      
      Logger.info(`✅ Extension unregistered: ${extensionId}`);
      return true;
      
    } catch (error: any) {
      Logger.error(`❌ Failed to unregister extension ${extensionId}:`, error);
      return false;
    }
  }
  
  /**
   * Execute extensions for content generation
   * @param platformContext Platform context
   * @param targetDomain Target domain (optional, auto-detect if not provided)
   * @returns Execution results from all applicable extensions
   */
  async executeExtensions(
    platformContext: PlatformContext,
    targetDomain?: ContentDomainType
  ): Promise<ExtensionExecutionResult[]> {
    Logger.info(`🚀 Executing domain extensions for context: ${platformContext.domain || targetDomain || 'auto-detect'}`);
    
    try {
      // Get applicable extensions
      const applicableExtensions = await this.getApplicableExtensions(
        platformContext,
        targetDomain
      );
      
      if (applicableExtensions.length === 0) {
        Logger.warn('⚠️ No applicable extensions found for current context');
        return [];
      }
      
      Logger.info(`📋 Found ${applicableExtensions.length} applicable extensions`);
      
      // Execute extensions based on concurrency limits
      const results: ExtensionExecutionResult[] = [];
      const concurrencyLimit = Math.min(
        this.config.maxConcurrentExtensions,
        applicableExtensions.length
      );
      
      // Batch execution with concurrency control
      for (let i = 0; i < applicableExtensions.length; i += concurrencyLimit) {
        const batch = applicableExtensions.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(entry => 
          this.executeExtension(entry, platformContext)
        );
        
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            Logger.error('❌ Extension execution failed:', result.reason);
            // Create error result
            results.push({
              success: false,
              execution: {
                extensionName: 'unknown',
                duration: 0,
                resourceUsage: { memory: 0, cpu: 0, database: 0 },
                operations: []
              },
              errors: [{
                code: 'EXECUTION_FAILED',
                message: result.reason.message || 'Extension execution failed',
                severity: 'error'
              }],
              warnings: []
            });
          }
        }
      }
      
      Logger.info(`✅ Extension execution completed. ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;
      
    } catch (error: any) {
      Logger.error('❌ Extension execution framework error:', error);
      return [{
        success: false,
        execution: {
          extensionName: 'framework',
          duration: 0,
          resourceUsage: { memory: 0, cpu: 0, database: 0 },
          operations: []
        },
        errors: [{
          code: 'FRAMEWORK_ERROR',
          message: error.message,
          severity: 'critical'
        }],
        warnings: []
      }];
    }
  }
  
  /**
   * Get registered extensions
   * @param filters Optional filters
   * @returns Array of registry entries
   */
  getRegisteredExtensions(filters?: {
    domain?: ContentDomainType;
    architecture?: PlatformArchitectureType;
    enabled?: boolean;
    state?: ExtensionLifecycleState;
  }): ExtensionRegistryEntry[] {
    let extensions = Array.from(this.registry.values());
    
    if (filters) {
      if (filters.domain) {
        extensions = extensions.filter(ext => 
          ext.instance?.supportedDomains.includes(filters.domain!)
        );
      }
      
      if (filters.architecture) {
        extensions = extensions.filter(ext => 
          ext.instance?.supportedArchitectures.includes(filters.architecture!)
        );
      }
      
      if (filters.enabled !== undefined) {
        extensions = extensions.filter(ext => 
          ext.config.enabled === filters.enabled
        );
      }
      
      if (filters.state) {
        extensions = extensions.filter(ext => 
          ext.state === filters.state
        );
      }
    }
    
    return extensions;
  }
  
  /**
   * Get extension health status
   * @param extensionId Extension identifier (optional, returns all if not provided)
   * @returns Health status for extension(s)
   */
  async getExtensionHealth(extensionId?: string): Promise<ExtensionHealthStatus[]> {
    const extensions = extensionId 
      ? [this.registry.get(extensionId)].filter(Boolean) as ExtensionRegistryEntry[]
      : Array.from(this.registry.values());
    
    const healthChecks = extensions.map(async (entry) => {
      if (!entry.instance) {
        return {
          extensionId: entry.id,
          status: 'unknown' as const,
          checks: [],
          performance: { responseTime: 0, throughput: 0, errorRate: 0, memoryUsage: 0 },
          recentIssues: [],
          summary: { uptime: 0, totalFailures: 0, recoveryTime: 0 }
        };
      }
      
      return await entry.instance.getHealthStatus();
    });
    
    return await Promise.all(healthChecks);
  }
  
  /**
   * Update extension configuration
   * @param extensionId Extension identifier
   * @param configUpdate Configuration updates
   * @returns Whether update was successful
   */
  async updateExtensionConfig(
    extensionId: string,
    configUpdate: Partial<ExtensionConfig>
  ): Promise<boolean> {
    try {
      const entry = this.registry.get(extensionId);
      if (!entry || !entry.instance) {
        Logger.warn(`⚠️ Extension not found: ${extensionId}`);
        return false;
      }
      
      Logger.info(`🔧 Updating configuration for extension: ${extensionId}`);
      
      // Update instance configuration
      await entry.instance.updateConfig(configUpdate);
      
      // Update registry entry
      entry.config = { ...entry.config, ...configUpdate };
      
      // Re-validate extension
      const validation = await entry.instance.validate();
      entry.validation = validation;
      
      if (!validation.valid) {
        Logger.warn(`⚠️ Extension configuration update resulted in validation errors:`, validation.errors);
      }
      
      Logger.info(`✅ Extension configuration updated: ${extensionId}`);
      return true;
      
    } catch (error: any) {
      Logger.error(`❌ Failed to update extension configuration:`, error);
      return false;
    }
  }
  
  /**
   * Get framework statistics
   * @returns Framework statistics
   */
  getFrameworkStatistics() {
    const extensions = Array.from(this.registry.values());
    
    return {
      totalExtensions: extensions.length,
      enabledExtensions: extensions.filter(e => e.config.enabled).length,
      activeExtensions: extensions.filter(e => e.state === 'active').length,
      extensionsByDomain: this.groupBy(extensions, ext => 
        ext.instance?.supportedDomains.join(',') || 'unknown'
      ),
      extensionsByPriority: this.groupBy(extensions, ext => ext.config.priority),
      totalExecutions: extensions.reduce((sum, ext) => sum + ext.statistics.totalExecutions, 0),
      successRate: this.calculateSuccessRate(extensions),
      averageExecutionTime: this.calculateAverageExecutionTime(extensions),
      performanceMetrics: Object.fromEntries(this.performanceMetrics)
    };
  }
  
  /**
   * Shutdown framework and cleanup resources
   */
  async shutdown(): Promise<void> {
    Logger.info('🔌 Shutting down Domain Extension Framework');
    
    // Stop health monitoring
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
      this.healthMonitor = null;
    }
    
    // Cleanup all extensions
    const cleanupPromises = Array.from(this.registry.values()).map(async (entry) => {
      if (entry.instance) {
        try {
          await entry.instance.cleanup();
        } catch (error) {
          Logger.error(`Error cleaning up extension ${entry.id}:`, error);
        }
      }
    });
    
    await Promise.all(cleanupPromises);
    
    // Clear registry
    this.registry.clear();
    this.activeExecutions.clear();
    this.performanceMetrics.clear();
    
    Logger.info('✅ Domain Extension Framework shutdown complete');
  }
  
  // Private implementation methods
  
  private mergeWithDefaults(config: Partial<DomainExtensionFrameworkConfig>): DomainExtensionFrameworkConfig {
    return {
      maxConcurrentExtensions: 5,
      defaultExecutionTimeout: 30000,
      conflictResolution: 'priority-based',
      enableExtensionIsolation: false,
      healthCheckInterval: 300000, // 5 minutes
      registryPersistence: {
        enabled: false,
        autoSave: false
      },
      performanceMonitoring: {
        enabled: true,
        metricsRetention: 7,
        alertThresholds: {
          maxExecutionTime: 10000,
          maxMemoryUsage: 100,
          maxErrorRate: 0.1
        }
      },
      debug: {
        enabled: false,
        logLevel: 'info',
        enableProfiling: false,
        saveExecutionLogs: false
      },
      ...config
    };
  }
  
  private initializeFramework(): void {
    Logger.info('🔌 Initializing Domain Extension Framework');
    
    if (this.config.performanceMonitoring.enabled) {
      this.startHealthMonitoring();
    }
    
    Logger.info('✅ Domain Extension Framework initialized');
  }
  
  private generateExtensionId(name: string, version: string): string {
    return `${name}@${version}`;
  }
  
  private async detectConflicts(
    extension: DomainExtension,
    config: ExtensionConfig
  ): Promise<ExtensionConflict[]> {
    const conflicts: ExtensionConflict[] = [];
    
    // Check for domain conflicts
    for (const [existingId, existingEntry] of Array.from(this.registry)) {
      if (!existingEntry.instance) continue;
      
      const overlappingDomains = extension.supportedDomains.filter(domain =>
        existingEntry.instance!.supportedDomains.includes(domain)
      );
      
      if (overlappingDomains.length > 0) {
        conflicts.push({
          type: 'domain',
          extensions: [extension.name, existingEntry.name],
          description: `Extensions conflict on domains: ${overlappingDomains.join(', ')}`,
          severity: 'medium',
          possibleResolutions: ['priority-based', 'merge-content', 'user-choice'],
          recommendedResolution: 'priority-based',
          autoResolvable: true
        });
      }
    }
    
    return conflicts;
  }
  
  private async resolveConflicts(conflicts: ExtensionConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      if (conflict.autoResolvable) {
        Logger.info(`🔧 Auto-resolving conflict using ${conflict.recommendedResolution}: ${conflict.description}`);
        // Implement conflict resolution logic based on strategy
      } else {
        Logger.warn(`⚠️ Manual conflict resolution required: ${conflict.description}`);
      }
    }
  }
  
  private async getApplicableExtensions(
    platformContext: PlatformContext,
    targetDomain?: ContentDomainType
  ): Promise<ExtensionRegistryEntry[]> {
    const enabledExtensions = this.getRegisteredExtensions({ enabled: true });
    const applicableExtensions: Array<{ entry: ExtensionRegistryEntry; confidence: number }> = [];
    
    // Test each extension for domain compatibility
    for (const entry of enabledExtensions) {
      if (!entry.instance) continue;
      
      try {
        // Check static compatibility first
        const domainCompatible = targetDomain 
          ? entry.instance.supportedDomains.includes(targetDomain)
          : entry.instance.supportedDomains.includes(platformContext.domain);
          
        const architectureCompatible = entry.instance.supportedArchitectures.includes(
          platformContext.architecture
        );
        
        if (domainCompatible && architectureCompatible) {
          // Get dynamic confidence score
          const confidence = await entry.instance.detectDomain(platformContext);
          
          if (confidence > 0.1) { // Minimum confidence threshold
            applicableExtensions.push({ entry, confidence });
          }
        }
      } catch (error) {
        Logger.error(`Error testing extension ${entry.name}:`, error);
      }
    }
    
    // Sort by confidence (highest first) and priority
    applicableExtensions.sort((a, b) => {
      // First sort by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Then by priority
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.entry.config.priority] - priorityOrder[a.entry.config.priority];
    });
    
    return applicableExtensions.map(item => item.entry);
  }
  
  private async executeExtension(
    entry: ExtensionRegistryEntry,
    platformContext: PlatformContext  
  ): Promise<ExtensionExecutionResult> {
    const executionId = `${entry.id}-${Date.now()}`;
    const startTime = Date.now();
    
    try {
      if (!entry.instance) {
        throw new Error('Extension instance not available');
      }
      
      Logger.debug(`🔄 Executing extension: ${entry.name}`);
      
      // Create execution context
      const executionContext: ExtensionExecutionContext = {
        executionId,
        startTime,
        platformContext,
        extension: entry.instance,
        timeout: entry.config.constraints.maxExecutionTime || this.config.defaultExecutionTimeout,
        resourceLimits: {
          maxMemory: entry.config.constraints.maxMemoryUsage,
          maxExecutionTime: entry.config.constraints.maxExecutionTime
        }
      };
      
      this.activeExecutions.set(executionId, executionContext);
      
      // Initialize extension if needed
      if (entry.state !== 'active') {
        await entry.instance.initialize(platformContext);
        entry.state = 'active';
      }
      
      // Execute extension methods
      const operations: Array<{ type: string; description: string; duration: number; success: boolean }> = [];
      
      // Generate content
      const contentStart = Date.now();
      const content = await this.executeWithTimeout(
        () => entry.instance!.generateContent(platformContext),
        executionContext.timeout,
        'generateContent'
      );
      operations.push({
        type: 'generateContent',
        description: 'Generate domain-specific content',
        duration: Date.now() - contentStart,
        success: true
      });
      
      // Get user archetypes
      const archetypesStart = Date.now();
      const archetypes = await this.executeWithTimeout(
        () => entry.instance!.getUserArchetypes(platformContext),
        executionContext.timeout,
        'getUserArchetypes'
      );
      operations.push({
        type: 'getUserArchetypes',
        description: 'Generate user archetypes',
        duration: Date.now() - archetypesStart,
        success: true
      });
      
      // Get storage config
      const storageStart = Date.now();
      const storageConfig = await this.executeWithTimeout(
        () => entry.instance!.getStorageConfig(platformContext),
        executionContext.timeout,
        'getStorageConfig'
      );
      operations.push({
        type: 'getStorageConfig',
        description: 'Get storage configuration',
        duration: Date.now() - storageStart,
        success: true
      });
      
      const duration = Date.now() - startTime;
      
      // Update statistics
      entry.statistics.totalExecutions++;
      entry.statistics.successfulExecutions++;
      entry.statistics.averageExecutionTime = 
        (entry.statistics.averageExecutionTime * (entry.statistics.totalExecutions - 1) + duration) / 
        entry.statistics.totalExecutions;
      entry.lastExecutedAt = Date.now();
      
      // Record performance metrics
      this.recordPerformanceMetrics(entry.id, {
        duration,
        success: true,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        operations: operations.length
      });
      
      Logger.debug(`✅ Extension executed successfully: ${entry.name} (${duration}ms)`);
      
      return {
        success: true,
        content,
        archetypes,
        storageConfig,
        execution: {
          extensionName: entry.name,
          duration,
          resourceUsage: {
            memory: process.memoryUsage().heapUsed / 1024 / 1024,
            cpu: 0, // TODO: Implement CPU monitoring
            database: operations.length
          },
          operations
        },
        errors: [],
        warnings: []
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Update failure statistics
      entry.statistics.totalExecutions++;
      entry.statistics.failedExecutions++;
      
      // Record failure metrics
      this.recordPerformanceMetrics(entry.id, {
        duration,
        success: false,
        error: error.message
      });
      
      Logger.error(`❌ Extension execution failed: ${entry.name}`, error);
      
      return {
        success: false,
        execution: {
          extensionName: entry.name,
          duration,
          resourceUsage: {
            memory: process.memoryUsage().heapUsed / 1024 / 1024,
            cpu: 0,
            database: 0
          },
          operations: []
        },
        errors: [{
          code: 'EXECUTION_ERROR',
          message: error.message,
          severity: 'error',
          context: { executionId, extensionName: entry.name }
        }],
        warnings: []
      };
      
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }
  
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number,
    operationName: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`));
      }, timeout);
      
      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
  
  private startHealthMonitoring(): void {
    this.healthMonitor = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        Logger.error('Health monitoring error:', error);
      }
    }, this.config.healthCheckInterval);
  }
  
  private async performHealthChecks(): Promise<void> {
    const extensions = Array.from(this.registry.values());
    
    for (const entry of extensions) {
      if (entry.instance && entry.state === 'active') {
        try {
          const health = await entry.instance.getHealthStatus();
          
          // Check against alert thresholds
          if (health.performance.responseTime > this.config.performanceMonitoring.alertThresholds.maxExecutionTime) {
            Logger.warn(`⚠️ Extension ${entry.name} exceeding execution time threshold`);
          }
          
          if (health.performance.errorRate > this.config.performanceMonitoring.alertThresholds.maxErrorRate) {
            Logger.warn(`⚠️ Extension ${entry.name} exceeding error rate threshold`);
          }
          
        } catch (error) {
          Logger.error(`Health check failed for extension ${entry.name}:`, error);
        }
      }
    }
  }
  
  private recordPerformanceMetrics(extensionId: string, metrics: any): void {
    if (!this.performanceMetrics.has(extensionId)) {
      this.performanceMetrics.set(extensionId, []);
    }
    
    const extensionMetrics = this.performanceMetrics.get(extensionId)!;
    extensionMetrics.push({
      timestamp: Date.now(),
      ...metrics
    });
    
    // Keep only recent metrics based on retention policy
    const retentionLimit = Date.now() - (this.config.performanceMonitoring.metricsRetention * 24 * 60 * 60 * 1000);
    this.performanceMetrics.set(
      extensionId,
      extensionMetrics.filter(m => m.timestamp > retentionLimit)
    );
  }
  
  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, number> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      groups[key] = (groups[key] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
  
  private calculateSuccessRate(extensions: ExtensionRegistryEntry[]): number {
    const totalExecutions = extensions.reduce((sum, ext) => sum + ext.statistics.totalExecutions, 0);
    const successfulExecutions = extensions.reduce((sum, ext) => sum + ext.statistics.successfulExecutions, 0);
    
    return totalExecutions > 0 ? successfulExecutions / totalExecutions : 0;
  }
  
  private calculateAverageExecutionTime(extensions: ExtensionRegistryEntry[]): number {
    const executionsWithTime = extensions.filter(ext => ext.statistics.averageExecutionTime > 0);
    
    if (executionsWithTime.length === 0) return 0;
    
    const totalTime = executionsWithTime.reduce((sum, ext) => sum + ext.statistics.averageExecutionTime, 0);
    return totalTime / executionsWithTime.length;
  }
}