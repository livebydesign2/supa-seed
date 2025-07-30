/**
 * Configuration Layer System for SupaSeed v2.5.0
 * Implements Task 5.1.2: Implement configuration layer system
 * Core layer management, composition, and conflict resolution
 */

import { Logger } from '../utils/logger';
import type {
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  ConfigurationLayerType,
  LayerPriority,
  MergeStrategy,
  LayerStatus,
  LayerChangeEvent,
  ConfigurationTemplate
} from './config-layers';
import type { PlatformArchitectureType, ContentDomainType } from '../../features/detection/detection-types';

/**
 * Default Universal Core Configuration
 * Layer 1: Always active, provides MakerKit compatibility
 */
export const DEFAULT_UNIVERSAL_CONFIG: UniversalCoreConfig = {
  layer: {
    type: 'universal',
    priority: 'highest',
    enabled: true,
    readonly: true
  },
  makerkit: {
    enabled: true,
    accountType: 'hybrid' as const,
    completeAuthFlow: true,
    constraintCompliance: true,
    rlsCompliance: true,
    developmentSupport: true,
    mfaSupport: true,
    identityProviders: {
      email: true,
      google: false,
      github: false,
      facebook: false,
      apple: false,
      discord: false,
      custom: []
    },
    databaseCompliance: {
      enforceConstraints: true,
      validateForeignKeys: true,
      respectTimestamps: true,
      handleNullables: true,
      supportUUIDs: true
    }
  },
  seeding: {
    defaultUserCount: 10,
    contentRatios: {
      publicContent: 0.7,
      privateContent: 0.2,
      sharedContent: 0.1
    },
    relationships: {
      generateRelationships: true,
      relationshipDensity: 0.3,
      respectConstraints: true
    },
    safety: {
      validateBeforeInsert: true,
      dryRunMode: false,
      rollbackOnError: true,
      maxRetries: 3
    }
  },
  security: {
    rlsCompliance: true,
    policies: {
      enforceUserScope: true,
      validatePermissions: true,
      auditAccess: false
    }
  },
  webhook: {
    enabled: false,
    authentication: {
      enabled: false,
      method: 'jwt' as const
    },
    endpoints: {}
  },
  environment: {
    type: 'development',
    debugging: {
      enableVerboseLogging: false,
      logQueries: false,
      logPerformance: false,
      validateResults: true
    },
    performance: {
      batchSize: 50,
      parallelism: 3,
      timeout: 30000,
      memoryLimit: 512
    }
  }
};

/**
 * Default Smart Detection Configuration Template
 * Layer 2: Auto-configured based on platform detection
 */
export const DEFAULT_DETECTION_CONFIG: Omit<SmartDetectionConfig, 'layer'> = {
  platform: {
    architecture: 'auto',
    confidence: 0,
    domain: 'auto' as const,
    evidence: {
      tablePatterns: [],
      relationshipPatterns: [],
      constraintPatterns: [],
      namingConventions: []
    },
    architectureSettings: {}
  },
  domain: {
    domain: 'auto',
    confidence: 0,
    evidence: {
      tableNames: [],
      columnPatterns: [],
      dataTypes: [],
      businessLogicHints: []
    },
    domainSettings: {}
  },
  autoConfiguration: {
    enabled: true,
    confidenceThreshold: 0.8,
    autoApply: false,
    strategy: 'balanced' as const
  },
  optimizations: {
    performance: {
      suggestedBatchSize: 50,
      suggestedParallelism: 3,
      estimatedDataVolume: 'medium'
    },
    content: {
      suggestedUserCount: 10,
      suggestedContentRatios: {
        public: 0.7,
        private: 0.2,
        shared: 0.1
      },
      recommendedArchetypes: []
    },
    features: {
      enabledFeatures: [],
      disabledFeatures: [],
      optionalFeatures: []
    }
  }
};

/**
 * Default Extensions Configuration Template
 * Layer 3: Pluggable extensions and customizations
 */
export const DEFAULT_EXTENSIONS_CONFIG: Omit<ExtensionsLayerConfig, 'layer'> = {
  domainExtensions: {
    enabled: []
  },
  archetypes: {
    enabled: false,
    generationConfig: {
      targetArchitecture: 'individual',
      targetDomain: 'generic',
      usersPerArchetype: { min: 2, max: 5 },
      distributionStrategy: 'weighted',
      includedCategories: [],
      excludedCategories: [],
      experienceLevelDistribution: {
        beginner: 0.3,
        intermediate: 0.4,
        advanced: 0.2,
        expert: 0.1
      },
      generateRelationships: true,
      relationshipDensity: 0.3,
      applyDomainCustomizations: true
    },
    customArchetypes: [],
    selectionStrategy: {
      strategy: 'automatic'
    }
  },
  customGenerators: {
    contentGenerators: [],
    relationshipGenerators: [],
    mediaGenerators: []
  },
  integrations: {
    apis: [],
    storage: {
      providers: []
    },
    analytics: {
      providers: []
    }
  },
  businessLogic: {
    validationRules: [],
    transformations: [],
    constraints: []
  }
};

/**
 * Configuration Layer System - manages the 3-layer architecture
 */
export class ConfigurationLayerSystem {
  private layers: Map<ConfigurationLayerType, any> = new Map();
  private layerStatus: Map<ConfigurationLayerType, LayerStatus> = new Map();
  private changeListeners: Map<string, (event: LayerChangeEvent) => void> = new Map();
  private templates: Map<string, ConfigurationTemplate> = new Map();

  constructor() {
    this.initializeDefaultLayers();
    Logger.debug('ConfigurationLayerSystem initialized with default layers');
  }

  /**
   * Initialize the system with default layer configurations
   */
  private initializeDefaultLayers(): void {
    // Layer 1: Universal Core (always enabled, readonly)
    this.setLayer('universal', {
      ...DEFAULT_UNIVERSAL_CONFIG,
      layer: {
        ...DEFAULT_UNIVERSAL_CONFIG.layer,
        enabled: true,
        readonly: true
      }
    });

    // Layer 2: Smart Detection (auto-generated)
    this.setLayer('detection', {
      ...DEFAULT_DETECTION_CONFIG,
      layer: {
        type: 'detection',
        priority: 'high',
        enabled: true,
        autoGenerated: true,
        confidence: 0,
        lastDetected: new Date()
      }
    });

    // Layer 3: Extensions (user-configurable)
    this.setLayer('extensions', {
      ...DEFAULT_EXTENSIONS_CONFIG,
      layer: {
        type: 'extensions',
        priority: 'medium',
        enabled: false,
        userConfigured: false,
        lastModified: new Date()
      }
    });
  }

  /**
   * Set configuration for a specific layer
   */
  setLayer(layerType: ConfigurationLayerType, config: any): void {
    const oldConfig = this.layers.get(layerType);
    this.layers.set(layerType, config);

    // Update layer status
    this.updateLayerStatus(layerType, config);

    // Emit change event
    if (oldConfig) {
      this.emitChangeEvent(layerType, 'updated', oldConfig, config);
    } else {
      this.emitChangeEvent(layerType, 'created', null, config);
    }

    Logger.debug(`Updated ${layerType} layer configuration`);
  }

  /**
   * Get configuration for a specific layer
   */
  getLayer<T = any>(layerType: ConfigurationLayerType): T | undefined {
    return this.layers.get(layerType);
  }

  /**
   * Get all layer configurations
   */
  getAllLayers(): Record<ConfigurationLayerType, any> {
    return {
      universal: this.layers.get('universal'),
      detection: this.layers.get('detection'),
      extensions: this.layers.get('extensions')
    };
  }

  /**
   * Update smart detection layer with detection results
   */
  updateDetectionLayer(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType,
    confidence: number,
    evidence: any
  ): void {
    const currentDetection = this.getLayer<SmartDetectionConfig>('detection');
    if (!currentDetection) return;

    const updatedDetection: SmartDetectionConfig = {
      ...currentDetection,
      layer: {
        ...currentDetection.layer,
        confidence,
        lastDetected: new Date()
      },
      platform: {
        ...currentDetection.platform,
        architecture,
        confidence,
        evidence: evidence.platform || currentDetection.platform.evidence,
        architectureSettings: this.generateArchitectureSettings(architecture)
      },
      domain: {
        ...currentDetection.domain,
        domain,
        confidence,
        evidence: evidence.domain || currentDetection.domain.evidence,
        domainSettings: this.generateDomainSettings(domain)
      },
      optimizations: this.generateOptimizations(architecture, domain, confidence)
    };

    this.setLayer('detection', updatedDetection);
    Logger.info(`Updated detection layer: ${architecture}/${domain} (confidence: ${confidence})`);
  }

  /**
   * Enable or disable a specific layer
   */
  setLayerEnabled(layerType: ConfigurationLayerType, enabled: boolean): void {
    const layer = this.getLayer(layerType);
    if (!layer) return;

    // Universal layer cannot be disabled
    if (layerType === 'universal' && !enabled) {
      Logger.warn('Cannot disable universal layer - it is required for core functionality');
      return;
    }

    layer.layer.enabled = enabled;
    this.setLayer(layerType, layer);

    Logger.debug(`${enabled ? 'Enabled' : 'Disabled'} ${layerType} layer`);
  }

  /**
   * Get the status of all layers
   */
  getLayerStatuses(): Record<ConfigurationLayerType, LayerStatus> {
    return {
      universal: this.layerStatus.get('universal')!,
      detection: this.layerStatus.get('detection')!,
      extensions: this.layerStatus.get('extensions')!
    };
  }

  /**
   * Get the status of a specific layer
   */
  getLayerStatus(layerType: ConfigurationLayerType): LayerStatus | undefined {
    return this.layerStatus.get(layerType);
  }

  /**
   * Validate all layers for consistency and compatibility
   */
  validateLayers(): {
    valid: boolean;
    errors: { layer: ConfigurationLayerType; error: string }[];
    warnings: { layer: ConfigurationLayerType; warning: string }[];
  } {
    const errors: { layer: ConfigurationLayerType; error: string }[] = [];
    const warnings: { layer: ConfigurationLayerType; warning: string }[] = [];

    // Validate each layer individually
    for (const [layerType, config] of this.layers) {
      const layerValidation = this.validateLayer(layerType, config);
      
      errors.push(...layerValidation.errors.map(e => ({ 
        layer: layerType, 
        error: e.message 
      })));
      
      warnings.push(...layerValidation.warnings.map(w => ({ 
        layer: layerType, 
        warning: w 
      })));
    }

    // Validate layer interactions and compatibility
    const interactionValidation = this.validateLayerInteractions();
    errors.push(...interactionValidation.errors);
    warnings.push(...interactionValidation.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Register a template for use with the layer system
   */
  registerTemplate(template: ConfigurationTemplate): void {
    this.templates.set(template.id, template);
    Logger.debug(`Registered configuration template: ${template.name}`);
  }

  /**
   * Apply a configuration template
   */
  applyTemplate(templateId: string, overrides?: Record<string, any>): boolean {
    const template = this.templates.get(templateId);
    if (!template) {
      Logger.error(`Template not found: ${templateId}`);
      return false;
    }

    try {
      // Apply template layers
      if (template.layers.universal) {
        const universalConfig = this.mergeConfigurations(
          this.getLayer('universal'),
          template.layers.universal,
          'merge'
        );
        this.setLayer('universal', universalConfig);
      }

      if (template.layers.detection) {
        const detectionConfig = this.mergeConfigurations(
          this.getLayer('detection'),
          template.layers.detection,
          'merge'
        );
        this.setLayer('detection', detectionConfig);
      }

      if (template.layers.extensions) {
        const extensionsConfig = this.mergeConfigurations(
          this.getLayer('extensions'),
          template.layers.extensions,
          'merge'
        );
        this.setLayer('extensions', extensionsConfig);
      }

      // Apply any overrides
      if (overrides) {
        this.applyOverrides(overrides);
      }

      Logger.info(`Applied configuration template: ${template.name}`);
      return true;
    } catch (error) {
      Logger.error(`Failed to apply template ${templateId}:`, error);
      return false;
    }
  }

  /**
   * Get all registered templates
   */
  getTemplates(): ConfigurationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates matching specific criteria
   */
  getMatchingTemplates(
    architecture?: PlatformArchitectureType,
    domain?: ContentDomainType,
    complexity?: string
  ): ConfigurationTemplate[] {
    return this.getTemplates().filter(template => {
      const architectureMatch = !architecture || 
        template.targets.architectures.includes(architecture);
      const domainMatch = !domain || 
        template.targets.domains.includes(domain);
      const complexityMatch = !complexity || 
        template.targets.complexity === complexity;
      
      return architectureMatch && domainMatch && complexityMatch;
    });
  }

  /**
   * Add a change listener
   */
  addChangeListener(id: string, listener: (event: LayerChangeEvent) => void): void {
    this.changeListeners.set(id, listener);
  }

  /**
   * Remove a change listener
   */
  removeChangeListener(id: string): void {
    this.changeListeners.delete(id);
  }

  /**
   * Reset all layers to default configuration
   */
  reset(): void {
    this.layers.clear();
    this.layerStatus.clear();
    this.initializeDefaultLayers();
    Logger.info('Reset all configuration layers to defaults');
  }

  // Private helper methods

  private updateLayerStatus(layerType: ConfigurationLayerType, config: any): void {
    const startTime = Date.now();
    
    const validation = this.validateLayer(layerType, config);
    const loadTime = Date.now() - startTime;

    const status: LayerStatus = {
      layer: layerType,
      status: {
        enabled: config.layer?.enabled ?? true,
        healthy: validation.valid,
        lastUpdated: new Date(),
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings
      },
      performance: {
        loadTime,
        memoryUsage: this.estimateMemoryUsage(config),
        cacheHitRate: 0.95 // Placeholder
      },
      validation
    };

    this.layerStatus.set(layerType, status);
  }

  private validateLayer(layerType: ConfigurationLayerType, config: any): {
    valid: boolean;
    errors: { path: string; message: string; severity: 'error' | 'warning' }[];
    warnings: string[];
    suggestions: { path: string; suggestion: string; impact: 'low' | 'medium' | 'high' }[];
  } {
    const errors: { path: string; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: string[] = [];
    const suggestions: { path: string; suggestion: string; impact: 'low' | 'medium' | 'high' }[] = [];

    // Basic layer structure validation
    if (!config.layer) {
      errors.push({
        path: 'layer',
        message: 'Missing layer metadata',
        severity: 'error'
      });
    }

    if (!config.layer?.type || config.layer.type !== layerType) {
      errors.push({
        path: 'layer.type',
        message: `Layer type mismatch: expected ${layerType}`,
        severity: 'error'
      });
    }

    // Layer-specific validation
    switch (layerType) {
      case 'universal':
        this.validateUniversalLayer(config, errors, warnings, suggestions);
        break;
      case 'detection':
        this.validateDetectionLayer(config, errors, warnings, suggestions);
        break;
      case 'extensions':
        this.validateExtensionsLayer(config, errors, warnings, suggestions);
        break;
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private validateUniversalLayer(config: any, errors: any[], warnings: string[], suggestions: any[]): void {
    if (!config.makerkit) {
      errors.push({
        path: 'makerkit',
        message: 'Missing MakerKit configuration',
        severity: 'error'
      });
      return;
    }

    if (!config.seeding) {
      errors.push({
        path: 'seeding',
        message: 'Missing seeding configuration',
        severity: 'error'
      });
    }

    if (!config.environment) {
      errors.push({
        path: 'environment',
        message: 'Missing environment configuration',
        severity: 'error'
      });
    }

    // Validate ranges and constraints
    if (config.seeding?.contentRatios) {
      const ratios = config.seeding.contentRatios;
      const total = ratios.publicContent + ratios.privateContent + ratios.sharedContent;
      if (Math.abs(total - 1.0) > 0.01) {
        warnings.push('Content ratios should sum to 1.0');
        suggestions.push({
          path: 'seeding.contentRatios',
          suggestion: 'Normalize content ratios to sum to 1.0',
          impact: 'medium'
        });
      }
    }
  }

  private validateDetectionLayer(config: any, errors: any[], warnings: string[], suggestions: any[]): void {
    if (!config.platform) {
      errors.push({
        path: 'platform',
        message: 'Missing platform configuration',
        severity: 'error'
      });
    }

    if (!config.domain) {
      errors.push({
        path: 'domain',
        message: 'Missing domain configuration',
        severity: 'error'
      });
    }

    // Validate confidence scores
    if (config.platform?.confidence < 0 || config.platform?.confidence > 1) {
      errors.push({
        path: 'platform.confidence',
        message: 'Platform confidence must be between 0 and 1',
        severity: 'error'
      });
    }

    if (config.domain?.confidence < 0 || config.domain?.confidence > 1) {
      errors.push({
        path: 'domain.confidence',
        message: 'Domain confidence must be between 0 and 1',
        severity: 'error'
      });
    }

    // Warn about low confidence
    if (config.platform?.confidence < 0.5) {
      warnings.push('Low platform detection confidence - consider manual verification');
    }

    if (config.domain?.confidence < 0.5) {
      warnings.push('Low domain detection confidence - consider manual verification');
    }
  }

  private validateExtensionsLayer(config: any, errors: any[], warnings: string[], suggestions: any[]): void {
    if (!config.domainExtensions) {
      warnings.push('No domain extensions configured');
    }

    if (!config.archetypes) {
      warnings.push('No archetype configuration found');
    }

    // Validate custom generators
    if (config.customGenerators) {
      config.customGenerators.contentGenerators?.forEach((gen: any, index: number) => {
        if (!gen.name) {
          errors.push({
            path: `customGenerators.contentGenerators[${index}].name`,
            message: 'Custom generator must have a name',
            severity: 'error'
          });
        }
      });
    }
  }

  private validateLayerInteractions(): {
    errors: { layer: ConfigurationLayerType; error: string }[];
    warnings: { layer: ConfigurationLayerType; warning: string }[];
  } {
    const errors: { layer: ConfigurationLayerType; error: string }[] = [];
    const warnings: { layer: ConfigurationLayerType; warning: string }[] = [];

    const universal = this.getLayer('universal');
    const detection = this.getLayer('detection');
    const extensions = this.getLayer('extensions');

    // Check for conflicts between layers
    if (universal && detection) {
      // Check if detection settings conflict with universal settings
      if (detection.optimizations?.performance?.suggestedBatchSize && 
          detection.optimizations.performance.suggestedBatchSize > universal.environment?.performance?.batchSize * 2) {
        warnings.push({
          layer: 'detection',
          warning: 'Detected performance settings significantly differ from universal settings'
        });
      }
    }

    if (detection && extensions) {
      // Check if extensions are compatible with detected platform
      if (extensions.archetypes?.enabled && detection.platform?.architecture) {
        const compatibleArchetypes = extensions.archetypes.customArchetypes?.filter((arch: any) =>
          arch.supportedArchitectures?.includes(detection.platform.architecture)
        );
        
        if (extensions.archetypes.customArchetypes?.length > 0 && 
            compatibleArchetypes?.length === 0) {
          warnings.push({
            layer: 'extensions',
            warning: 'No archetypes are compatible with detected platform architecture'
          });
        }
      }
    }

    return { errors, warnings };
  }

  private generateArchitectureSettings(architecture: PlatformArchitectureType): any {
    switch (architecture) {
      case 'individual':
        return {
          individual: {
            focusOnPersonalContent: true,
            enableSocialFeatures: true,
            contentSharingRatio: 0.7
          }
        };
      case 'team':
        return {
          team: {
            enableTeamCollaboration: true,
            teamSizeRange: { min: 3, max: 15 },
            workspaceManagement: true,
            permissionComplexity: 'moderate'
          }
        };
      case 'hybrid':
        return {
          hybrid: {
            balanceRatio: 0.6,
            enableFlexibleRoles: true,
            supportMultiContext: true
          }
        };
      default:
        return {};
    }
  }

  private generateDomainSettings(domain: ContentDomainType): any {
    switch (domain) {
      case 'outdoor':
        return {
          outdoor: {
            gearFocus: true,
            locationData: true,
            weatherAwareness: true,
            safetyEmphasis: true
          }
        };
      case 'saas':
        return {
          saas: {
            productivityFocus: true,
            integrationHeavy: true,
            analyticsEnabled: true,
            workflowOptimization: true
          }
        };
      case 'ecommerce':
        return {
          ecommerce: {
            productCatalogs: true,
            inventoryManagement: true,
            orderProcessing: true,
            paymentIntegration: false
          }
        };
      case 'social':
        return {
          social: {
            networkingEmphasis: true,
            contentSharing: true,
            communityFeatures: true,
            realTimeInteraction: false
          }
        };
      default:
        return {
          generic: {
            adaptiveContent: true,
            broadCompatibility: true,
            minimalAssumptions: true
          }
        };
    }
  }

  private generateOptimizations(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType,
    confidence: number
  ): any {
    const baseOptimizations = {
      performance: {
        suggestedBatchSize: 50,
        suggestedParallelism: 3,
        estimatedDataVolume: 'medium' as const
      },
      content: {
        suggestedUserCount: 10,
        suggestedContentRatios: {
          public: 0.7,
          private: 0.2,
          shared: 0.1
        },
        recommendedArchetypes: []
      },
      features: {
        enabledFeatures: [],
        disabledFeatures: [],
        optionalFeatures: []
      }
    };

    // Adjust based on architecture
    if (architecture === 'team') {
      baseOptimizations.content.suggestedUserCount = 15;
      baseOptimizations.content.suggestedContentRatios.shared = 0.3;
      baseOptimizations.content.suggestedContentRatios.private = 0.1;
      baseOptimizations.content.suggestedContentRatios.public = 0.6;
    }

    // Adjust based on domain
    if (domain === 'ecommerce') {
      baseOptimizations.performance.estimatedDataVolume = 'medium' as const;
      baseOptimizations.performance.suggestedBatchSize = 100;
    }

    return baseOptimizations;
  }

  private mergeConfigurations(base: any, override: any, strategy: MergeStrategy): any {
    switch (strategy) {
      case 'override':
        return { ...base, ...override };
      case 'merge':
        return this.deepMerge(base, override);
      case 'fallback':
        return this.fallbackMerge(base, override);
      default:
        return { ...base, ...override };
    }
  }

  private deepMerge(base: any, override: any): any {
    if (!base) return override;
    if (!override) return base;

    const result = { ...base };

    for (const key in override) {
      if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = this.deepMerge(result[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  private fallbackMerge(base: any, override: any): any {
    const result = { ...override };

    for (const key in base) {
      if (!(key in result) || result[key] === null || result[key] === undefined) {
        result[key] = base[key];
      }
    }

    return result;
  }

  private applyOverrides(overrides: Record<string, any>): void {
    for (const [path, value] of Object.entries(overrides)) {
      const [layerType, ...pathParts] = path.split('.');
      if (layerType in this.layers && (layerType === 'universal' || layerType === 'detection' || layerType === 'extensions')) {
        this.setNestedValue(this.layers.get(layerType as ConfigurationLayerType), pathParts, value);
      }
    }
  }

  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current) || typeof current[path[i]] !== 'object') {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  }

  private estimateMemoryUsage(config: any): number {
    // Simple estimation based on JSON string length
    return JSON.stringify(config).length * 2; // Rough estimate in bytes
  }

  private emitChangeEvent(
    layerType: ConfigurationLayerType,
    changeType: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled',
    oldValue: any,
    newValue: any
  ): void {
    const event: LayerChangeEvent = {
      timestamp: new Date(),
      layer: layerType,
      changeType,
      changes: [{
        path: layerType,
        oldValue,
        newValue,
        source: 'system'
      }],
      impact: {
        severity: 'medium',
        affectedLayers: [layerType],
        requiresRegeneration: true,
        backwardCompatible: true
      }
    };

    this.changeListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        Logger.error('Error in change listener:', error);
      }
    });
  }
}