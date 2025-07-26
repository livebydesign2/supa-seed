/**
 * Extension Registry for Domain Extension Framework
 * Manages registration, discovery, and lifecycle of domain extensions
 * Part of Task 3.1.2: Implement extension registry and management system (FR-3.1)  
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';
import {
  DomainExtension,
  ExtensionConfig,
  ExtensionRegistryEntry,
  ExtensionValidationResult,
  ExtensionConflict,
  ExtensionLifecycleState,
  ExtensionHealthStatus
} from './extension-types';
import type { ContentDomainType, PlatformArchitectureType } from '../detection/detection-types';

/**
 * Extension discovery configuration
 */
export interface ExtensionDiscoveryConfig {
  /** Directories to scan for extensions */
  scanDirectories: string[];
  
  /** File patterns to match extension files */
  filePatterns: string[];
  
  /** Whether to enable automatic discovery */
  autoDiscovery: boolean;
  
  /** Discovery interval for automatic scanning */
  discoveryInterval: number;
  
  /** Whether to enable hot-reloading of extensions */
  hotReload: boolean;
  
  /** Extension validation requirements */
  validationRequirements: {
    /** Require version specification */
    requireVersion: boolean;
    /** Require description */
    requireDescription: boolean;
    /** Require compatibility specification */
    requireCompatibility: boolean;
    /** Maximum allowed extension size (bytes) */
    maxExtensionSize: number;
  };
}

/**
 * Extension registry persistence configuration
 */
export interface RegistryPersistenceConfig {
  /** Whether to enable persistence */
  enabled: boolean;
  
  /** File path for registry storage */
  filePath: string;
  
  /** Auto-save interval (0 = disabled) */
  autoSaveInterval: number;
  
  /** Whether to compress saved data */
  compression: boolean;
  
  /** Registry format */
  format: 'json' | 'yaml' | 'binary';
  
  /** Backup settings */
  backup: {
    enabled: boolean;
    maxBackups: number;
    backupInterval: number;
  };
}

/**
 * Extension dependency resolution result
 */
export interface DependencyResolutionResult {
  /** Whether all dependencies were resolved */
  resolved: boolean;
  
  /** Successfully resolved dependencies */
  resolvedDependencies: Array<{
    dependencyName: string;
    version: string;
    extensionId: string;
  }>;
  
  /** Unresolved dependencies */
  unresolvedDependencies: Array<{
    dependencyName: string;
    version?: string;
    reason: string;
  }>;
  
  /** Dependency conflicts */
  conflicts: ExtensionConflict[];
  
  /** Dependency chain */
  dependencyChain: string[];
  
  /** Circular dependency detection */
  circularDependencies: string[][];
}

/**
 * Extension registry statistics
 */
export interface RegistryStatistics {
  /** Total registered extensions */
  totalExtensions: number;
  
  /** Extensions by state */
  extensionsByState: Record<ExtensionLifecycleState, number>;
  
  /** Extensions by domain */
  extensionsByDomain: Record<ContentDomainType, number>;
  
  /** Extensions by architecture */
  extensionsByArchitecture: Record<PlatformArchitectureType, number>;
  
  /** Dependency statistics */
  dependencies: {
    totalDependencies: number;
    resolvedDependencies: number;
    unresolvedDependencies: number;
    circularDependencies: number;
  };
  
  /** Health statistics */
  health: {
    healthyExtensions: number;
    warningExtensions: number;
    criticalExtensions: number;
    unknownExtensions: number;
  };
  
  /** Performance statistics */
  performance: {
    averageLoadTime: number;
    averageExecutionTime: number;
    totalExecutions: number;
    successRate: number;
  };
}

/**
 * Extension Registry Manager
 * Central registry for managing domain extensions with discovery, persistence, and lifecycle management
 */
export class ExtensionRegistry {
  private registry: Map<string, ExtensionRegistryEntry> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private discoveryConfig: ExtensionDiscoveryConfig;
  private persistenceConfig: RegistryPersistenceConfig;
  private discoveryTimer: NodeJS.Timeout | null = null;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private extensionWatchers: Map<string, any> = new Map();
  
  constructor(
    discoveryConfig: Partial<ExtensionDiscoveryConfig> = {},
    persistenceConfig: Partial<RegistryPersistenceConfig> = {}
  ) {
    this.discoveryConfig = this.mergeDiscoveryDefaults(discoveryConfig);
    this.persistenceConfig = this.mergePersistenceDefaults(persistenceConfig);
    
    this.initializeRegistry();
  }
  
  /**
   * Register an extension manually
   * @param extensionClass Extension class constructor
   * @param config Extension configuration
   * @returns Registration result
   */
  async registerExtension(
    extensionClass: new (config: ExtensionConfig) => DomainExtension,
    config: ExtensionConfig
  ): Promise<{ success: boolean; extensionId: string; errors: string[] }> {
    try {
      Logger.info(`📝 Registering extension: ${config.metadata.description}`);
      
      // Create extension instance for validation
      const instance = new extensionClass(config);
      const extensionId = this.generateExtensionId(instance.name, config.metadata.version);
      
      // Check if extension already exists
      if (this.registry.has(extensionId)) {
        Logger.warn(`⚠️ Extension already registered: ${extensionId}`);
        return {
          success: false,
          extensionId,
          errors: [`Extension ${extensionId} is already registered`]
        };
      }
      
      // Validate extension
      const validation = await this.validateExtension(instance, config);
      if (!validation.valid) {
        Logger.error(`❌ Extension validation failed:`, validation.errors);
        return {
          success: false,
          extensionId,
          errors: validation.errors.map(e => e.message)
        };
      }
      
      // Resolve dependencies
      const dependencyResolution = await this.resolveDependencies(config);
      if (!dependencyResolution.resolved) {
        Logger.error(`❌ Dependency resolution failed:`, dependencyResolution.unresolvedDependencies);
        return {
          success: false,
          extensionId,
          errors: dependencyResolution.unresolvedDependencies.map(d => d.reason)
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
      
      // Add to registry
      this.registry.set(extensionId, registryEntry);
      
      // Update dependency graph
      this.updateDependencyGraph(extensionId, config.dependencies);
      
      // Persist if enabled
      if (this.persistenceConfig.enabled) {
        await this.persistRegistry();
      }
      
      Logger.info(`✅ Extension registered successfully: ${extensionId}`);
      
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
   * Unregister an extension
   * @param extensionId Extension identifier
   * @returns Whether unregistration was successful
   */
  async unregisterExtension(extensionId: string): Promise<boolean> {
    try {
      const entry = this.registry.get(extensionId);
      if (!entry) {
        Logger.warn(`⚠️ Extension not found: ${extensionId}`);
        return false;
      }
      
      Logger.info(`📝 Unregistering extension: ${extensionId}`);
      
      // Check for dependent extensions
      const dependents = this.findDependentExtensions(extensionId);
      if (dependents.length > 0) {
        Logger.warn(`⚠️ Extension has dependents, they may be affected: ${dependents.join(', ')}`);
      }
      
      // Cleanup extension
      if (entry.instance) {
        await entry.instance.cleanup();
      }
      
      // Remove from registry
      this.registry.delete(extensionId);
      
      // Update dependency graph
      this.dependencyGraph.delete(extensionId);
      
      // Remove from watchers if hot-reload is enabled
      if (this.extensionWatchers.has(extensionId)) {
        const watcher = this.extensionWatchers.get(extensionId);
        if (watcher && typeof watcher.close === 'function') {
          watcher.close();
        }
        this.extensionWatchers.delete(extensionId);
      }
      
      // Persist if enabled
      if (this.persistenceConfig.enabled) {
        await this.persistRegistry();
      }
      
      Logger.info(`✅ Extension unregistered: ${extensionId}`);
      return true;
      
    } catch (error: any) {
      Logger.error(`❌ Failed to unregister extension:`, error);
      return false;
    }
  }
  
  /**
   * Discover extensions in configured directories
   * @returns Discovery results
   */
  async discoverExtensions(): Promise<{
    discovered: number;
    registered: number;
    errors: string[];
  }> {
    Logger.info('🔍 Discovering extensions...');
    
    const results = {
      discovered: 0,
      registered: 0,
      errors: [] as string[]
    };
    
    try {
      for (const directory of this.discoveryConfig.scanDirectories) {
        try {
          const dirResults = await this.scanDirectory(directory);
          results.discovered += dirResults.discovered;
          results.registered += dirResults.registered;
          results.errors.push(...dirResults.errors);
        } catch (error: any) {
          results.errors.push(`Failed to scan directory ${directory}: ${error.message}`);
        }
      }
      
      Logger.info(`✅ Extension discovery completed: ${results.discovered} discovered, ${results.registered} registered`);
      
    } catch (error: any) {
      Logger.error('❌ Extension discovery failed:', error);
      results.errors.push(`Discovery failed: ${error.message}`);
    }
    
    return results;
  }
  
  /**
   * Get extension by ID
   * @param extensionId Extension identifier
   * @returns Extension registry entry or undefined
   */
  getExtension(extensionId: string): ExtensionRegistryEntry | undefined {
    return this.registry.get(extensionId);
  }
  
  /**
   * Get all registered extensions
   * @param filters Optional filters
   * @returns Array of registry entries
   */
  getExtensions(filters?: {
    domain?: ContentDomainType;
    architecture?: PlatformArchitectureType;
    enabled?: boolean;
    state?: ExtensionLifecycleState;
    name?: string;
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
      
      if (filters.name) {
        extensions = extensions.filter(ext =>
          ext.name.toLowerCase().includes(filters.name!.toLowerCase())
        );
      }
    }
    
    return extensions;
  }
  
  /**
   * Update extension state
   * @param extensionId Extension identifier
   * @param newState New lifecycle state
   * @returns Whether update was successful
   */
  async updateExtensionState(
    extensionId: string,
    newState: ExtensionLifecycleState
  ): Promise<boolean> {
    try {
      const entry = this.registry.get(extensionId);
      if (!entry) {
        Logger.warn(`⚠️ Extension not found: ${extensionId}`);
        return false;
      }
      
      const oldState = entry.state;
      entry.state = newState;
      
      Logger.debug(`🔄 Extension state updated: ${extensionId} (${oldState} → ${newState})`);
      
      // Persist if enabled
      if (this.persistenceConfig.enabled) {
        await this.persistRegistry();
      }
      
      return true;
      
    } catch (error: any) {
      Logger.error(`❌ Failed to update extension state:`, error);
      return false;
    }
  }
  
  /**
   * Get registry statistics
   * @returns Registry statistics
   */
  getStatistics(): RegistryStatistics {
    const extensions = Array.from(this.registry.values());
    
    // Calculate state distribution
    const extensionsByState = extensions.reduce((acc, ext) => {
      acc[ext.state] = (acc[ext.state] || 0) + 1;
      return acc;
    }, {} as Record<ExtensionLifecycleState, number>);
    
    // Calculate domain distribution
    const extensionsByDomain = extensions.reduce((acc, ext) => {
      if (ext.instance) {
        ext.instance.supportedDomains.forEach(domain => {
          acc[domain] = (acc[domain] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<ContentDomainType, number>);
    
    // Calculate architecture distribution
    const extensionsByArchitecture = extensions.reduce((acc, ext) => {
      if (ext.instance) {
        ext.instance.supportedArchitectures.forEach(arch => {
          acc[arch] = (acc[arch] || 0) + 1;
        });
      }
      return acc;
    }, {} as Record<PlatformArchitectureType, number>);
    
    // Calculate dependency statistics
    const totalDependencies = extensions.reduce((sum, ext) => 
      sum + ext.config.dependencies.length, 0
    );
    
    // Calculate performance statistics
    const totalExecutions = extensions.reduce((sum, ext) => 
      sum + ext.statistics.totalExecutions, 0
    );
    const successfulExecutions = extensions.reduce((sum, ext) => 
      sum + ext.statistics.successfulExecutions, 0
    );
    const averageExecutionTime = extensions.length > 0 
      ? extensions.reduce((sum, ext) => sum + ext.statistics.averageExecutionTime, 0) / extensions.length
      : 0;
    
    return {
      totalExtensions: extensions.length,
      extensionsByState,
      extensionsByDomain,
      extensionsByArchitecture,
      dependencies: {
        totalDependencies,
        resolvedDependencies: totalDependencies, // TODO: Calculate actual resolved dependencies
        unresolvedDependencies: 0,
        circularDependencies: 0
      },
      health: {
        healthyExtensions: extensions.filter(e => e.state === 'active').length,
        warningExtensions: extensions.filter(e => e.state === 'error').length,
        criticalExtensions: 0,
        unknownExtensions: extensions.filter(e => e.state === 'unloaded').length
      },
      performance: {
        averageLoadTime: 0, // TODO: Track load times
        averageExecutionTime,
        totalExecutions,
        successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0
      }
    };
  }
  
  /**
   * Load registry from persistence
   * @returns Whether loading was successful
   */
  async loadRegistry(): Promise<boolean> {
    if (!this.persistenceConfig.enabled) {
      Logger.debug('Registry persistence is disabled');
      return true;
    }
    
    try {
      Logger.info(`📂 Loading registry from: ${this.persistenceConfig.filePath}`);
      
      const data = await fs.readFile(this.persistenceConfig.filePath, 'utf-8');
      const registryData = JSON.parse(data);
      
      // Reconstruct registry entries
      for (const entry of registryData.entries || []) {
        // Note: We can't reconstruct the extension classes from JSON
        // This would require a separate extension discovery/loading mechanism
        Logger.debug(`📦 Registry entry loaded: ${entry.id}`);
      }
      
      Logger.info('✅ Registry loaded successfully');
      return true;
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        Logger.debug('Registry file not found, starting with empty registry');
        return true;
      }
      
      Logger.error('❌ Failed to load registry:', error);
      return false;
    }
  }
  
  /**
   * Save registry to persistence
   * @returns Whether saving was successful
   */
  async persistRegistry(): Promise<boolean> {
    if (!this.persistenceConfig.enabled) {
      return true;
    }
    
    try {
      const registryData = {
        version: '1.0.0',
        timestamp: Date.now(),
        entries: Array.from(this.registry.values()).map(entry => ({
          id: entry.id,
          name: entry.name,
          config: entry.config,
          state: entry.state,
          registeredAt: entry.registeredAt,
          lastExecutedAt: entry.lastExecutedAt,
          statistics: entry.statistics,
          validation: entry.validation
        }))
      };
      
      // Ensure directory exists
      const dir = path.dirname(this.persistenceConfig.filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Save to file
      await fs.writeFile(
        this.persistenceConfig.filePath,
        JSON.stringify(registryData, null, 2),
        'utf-8'
      );
      
      Logger.debug(`💾 Registry persisted to: ${this.persistenceConfig.filePath}`);
      return true;
      
    } catch (error: any) {
      Logger.error('❌ Failed to persist registry:', error);
      return false;
    }
  }
  
  /**
   * Shutdown registry and cleanup resources
   */
  async shutdown(): Promise<void> {
    Logger.info('📝 Shutting down Extension Registry');
    
    // Stop discovery timer
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    
    // Stop auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    
    // Close file watchers
    for (const [extensionId, watcher] of Array.from(this.extensionWatchers)) {
      if (watcher && typeof watcher.close === 'function') {
        watcher.close();
      }
    }
    this.extensionWatchers.clear();
    
    // Final persistence
    if (this.persistenceConfig.enabled) {
      await this.persistRegistry();
    }
    
    // Clear registry
    this.registry.clear();
    this.dependencyGraph.clear();
    
    Logger.info('✅ Extension Registry shutdown complete');
  }
  
  // Private implementation methods
  
  private mergeDiscoveryDefaults(config: Partial<ExtensionDiscoveryConfig>): ExtensionDiscoveryConfig {
    return {
      scanDirectories: ['src/extensions/domains'],
      filePatterns: ['**/*-extension.ts', '**/*-extension.js'],
      autoDiscovery: false,
      discoveryInterval: 60000, // 1 minute
      hotReload: false,
      validationRequirements: {
        requireVersion: true,
        requireDescription: true,
        requireCompatibility: true,
        maxExtensionSize: 1024 * 1024 // 1MB
      },
      ...config
    };
  }
  
  private mergePersistenceDefaults(config: Partial<RegistryPersistenceConfig>): RegistryPersistenceConfig {
    return {
      enabled: false,
      filePath: 'data/extension-registry.json',
      autoSaveInterval: 300000, // 5 minutes
      compression: false,
      format: 'json',
      backup: {
        enabled: false,
        maxBackups: 5,
        backupInterval: 3600000 // 1 hour
      },
      ...config
    };
  }
  
  private async initializeRegistry(): Promise<void> {
    Logger.info('📝 Initializing Extension Registry');
    
    // Load persisted registry if enabled
    await this.loadRegistry();
    
    // Start auto-discovery if enabled
    if (this.discoveryConfig.autoDiscovery) {
      this.startAutoDiscovery();
    }
    
    // Start auto-save if enabled
    if (this.persistenceConfig.enabled && this.persistenceConfig.autoSaveInterval > 0) {
      this.startAutoSave();
    }
    
    Logger.info('✅ Extension Registry initialized');
  }
  
  private generateExtensionId(name: string, version: string): string {
    return `${name}@${version}`;
  }
  
  private async validateExtension(
    extension: DomainExtension,
    config: ExtensionConfig
  ): Promise<ExtensionValidationResult> {
    // Use the extension's own validation method
    const result = await extension.validate();
    
    // Add registry-specific validation
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    
    // Check validation requirements
    if (this.discoveryConfig.validationRequirements.requireVersion && !config.metadata.version) {
      errors.push({
        field: 'metadata.version',
        message: 'Extension version is required',
        severity: 'error'
      });
    }
    
    if (this.discoveryConfig.validationRequirements.requireDescription && !config.metadata.description) {
      errors.push({
        field: 'metadata.description',
        message: 'Extension description is required',
        severity: 'error'
      });
    }
    
    return {
      ...result,
      valid: result.valid && errors.length === 0,
      errors,
      warnings
    };
  }
  
  private async resolveDependencies(config: ExtensionConfig): Promise<DependencyResolutionResult> {
    const resolved: Array<{ dependencyName: string; version: string; extensionId: string }> = [];
    const unresolved: Array<{ dependencyName: string; version?: string; reason: string }> = [];
    const conflicts: ExtensionConflict[] = [];
    
    for (const dependency of config.dependencies) {
      const matchingExtensions = Array.from(this.registry.values()).filter(entry =>
        entry.name === dependency.extensionName
      );
      
      if (matchingExtensions.length === 0) {
        if (!dependency.optional) {
          unresolved.push({
            dependencyName: dependency.extensionName,
            version: dependency.version,
            reason: 'Dependency not found in registry'
          });
        }
      } else {
        // For now, take the first matching extension
        // TODO: Implement proper version resolution
        const matchingExtension = matchingExtensions[0];
        resolved.push({
          dependencyName: dependency.extensionName,
          version: matchingExtension.config.metadata.version,
          extensionId: matchingExtension.id
        });
      }
    }
    
    return {
      resolved: unresolved.length === 0,
      resolvedDependencies: resolved,
      unresolvedDependencies: unresolved,
      conflicts,
      dependencyChain: [],
      circularDependencies: []
    };
  }
  
  private updateDependencyGraph(extensionId: string, dependencies: any[]): void {
    const dependencySet = new Set<string>();
    
    for (const dependency of dependencies) {
      // Find the extension ID for this dependency name
      const dependentExtension = Array.from(this.registry.values()).find(entry =>
        entry.name === dependency.extensionName
      );
      
      if (dependentExtension) {
        dependencySet.add(dependentExtension.id);
      }
    }
    
    this.dependencyGraph.set(extensionId, dependencySet);
  }
  
  private findDependentExtensions(extensionId: string): string[] {
    const dependents: string[] = [];
    
    for (const [id, dependencies] of Array.from(this.dependencyGraph)) {
      if (dependencies.has(extensionId)) {
        dependents.push(id);
      }
    }
    
    return dependents;
  }
  
  private async scanDirectory(directory: string): Promise<{
    discovered: number;
    registered: number;
    errors: string[];
  }> {
    const results = {
      discovered: 0,
      registered: 0,
      errors: [] as string[]
    };
    
    try {
      // This is a simplified implementation
      // In a real implementation, you would scan for extension files and load them
      Logger.debug(`📁 Scanning directory: ${directory}`);
      
      // TODO: Implement actual file scanning and extension loading
      // This would involve:
      // 1. Scanning for files matching the patterns
      // 2. Loading the extension modules
      // 3. Validating they implement DomainExtension
      // 4. Registering them automatically
      
    } catch (error: any) {
      results.errors.push(`Failed to scan ${directory}: ${error.message}`);
    }
    
    return results;
  }
  
  private startAutoDiscovery(): void {
    this.discoveryTimer = setInterval(async () => {
      try {
        await this.discoverExtensions();
      } catch (error) {
        Logger.error('Auto-discovery error:', error);
      }
    }, this.discoveryConfig.discoveryInterval);
    
    Logger.debug('🔍 Auto-discovery started');
  }
  
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.persistRegistry();
      } catch (error) {
        Logger.error('Auto-save error:', error);
      }
    }, this.persistenceConfig.autoSaveInterval);
    
    Logger.debug('💾 Auto-save started');
  }
}