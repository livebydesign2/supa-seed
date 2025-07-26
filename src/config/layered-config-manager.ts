/**
 * Layered Configuration Manager for SupaSeed v2.5.0
 * Implements Task 5.1.3: Create layered configuration manager
 * Main interface for the 3-layer configuration system with composition and conflict resolution
 */

import { Logger } from '../utils/logger';
import { ConfigurationLayerSystem } from './layer-system';
import type {
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  ConfigurationLayerType,
  MergeStrategy,
  LayerStatus,
  LayerChangeEvent,
  ConfigurationTemplate
} from './config-layers';
import type { FlexibleSeedConfig } from '../config-types';
import type { PlatformArchitectureType, ContentDomainType } from '../detection/detection-types';

/**
 * Configuration composition result
 */
export interface ComposedConfiguration {
  /** Final composed configuration ready for use */
  final: FlexibleSeedConfig;
  
  /** Source layers that contributed to the final configuration */
  sources: {
    universal: Partial<FlexibleSeedConfig>;
    detection: Partial<FlexibleSeedConfig>;
    extensions: Partial<FlexibleSeedConfig>;
  };
  
  /** Composition metadata */
  metadata: {
    composedAt: Date;
    mergeStrategy: MergeStrategy;
    conflicts: {
      path: string;
      values: Record<ConfigurationLayerType, any>;
      resolution: 'override' | 'merge' | 'skip';
      resolvedValue: any;
    }[];
    warnings: string[];
  };
  
  /** Validation results */
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  };
}

/**
 * Zero-configuration setup result
 */
export interface ZeroConfigResult {
  /** Generated configuration */
  configuration: FlexibleSeedConfig;
  
  /** Auto-detection results that informed the configuration */
  detection: {
    architecture: PlatformArchitectureType;
    domain: ContentDomainType;
    confidence: number;
    evidence: any;
  };
  
  /** Applied optimizations */
  optimizations: {
    performance: any;
    content: any;
    features: string[];
  };
  
  /** Setup metadata */
  metadata: {
    setupTime: number; // milliseconds
    autoDetectionEnabled: boolean;
    fallbacksUsed: string[];
    recommendedAdjustments: string[];
  };
}

/**
 * Main Layered Configuration Manager
 * Orchestrates the 3-layer configuration system
 */
export class LayeredConfigurationManager {
  private layerSystem: ConfigurationLayerSystem;
  private autoDetectionEnabled: boolean = true;
  private zeroConfigEnabled: boolean = true;
  private globalMergeStrategy: MergeStrategy = 'merge';

  constructor() {
    this.layerSystem = new ConfigurationLayerSystem();
    this.setupDefaultTemplates();
    
    // Listen for layer changes to trigger recomposition
    this.layerSystem.addChangeListener('manager', this.handleLayerChange.bind(this));
    
    Logger.debug('LayeredConfigurationManager initialized');
  }

  /**
   * Get the current composed configuration
   * Combines all enabled layers into a final usable configuration
   */
  getConfiguration(): ComposedConfiguration {
    Logger.debug('Composing configuration from all layers');
    
    const startTime = Date.now();
    const layers = this.layerSystem.getAllLayers();
    const conflicts: any[] = [];
    const warnings: string[] = [];

    // Start with universal layer as base
    let composed: any = this.layerToFlexibleConfig(layers.universal);
    const sources = {
      universal: { ...composed },
      detection: {},
      extensions: {}
    };

    // Apply detection layer if enabled
    if (layers.detection?.layer?.enabled) {
      const detectionConfig = this.layerToFlexibleConfig(layers.detection);
      const mergeResult = this.mergeWithConflictDetection(
        composed, 
        detectionConfig, 
        'detection',
        this.globalMergeStrategy
      );
      
      composed = mergeResult.merged;
      sources.detection = detectionConfig;
      conflicts.push(...mergeResult.conflicts);
      warnings.push(...mergeResult.warnings);
    }

    // Apply extensions layer if enabled
    if (layers.extensions?.layer?.enabled) {
      const extensionsConfig = this.layerToFlexibleConfig(layers.extensions);
      const mergeResult = this.mergeWithConflictDetection(
        composed, 
        extensionsConfig, 
        'extensions',
        this.globalMergeStrategy
      );
      
      composed = mergeResult.merged;
      sources.extensions = extensionsConfig;
      conflicts.push(...mergeResult.conflicts);
      warnings.push(...mergeResult.warnings);
    }

    // Validate the final composed configuration
    const validation = this.validateComposedConfiguration(composed);

    const result: ComposedConfiguration = {
      final: composed,
      sources,
      metadata: {
        composedAt: new Date(),
        mergeStrategy: this.globalMergeStrategy,
        conflicts,
        warnings
      },
      validation
    };

    const compositionTime = Date.now() - startTime;
    Logger.debug(`Configuration composed in ${compositionTime}ms`, {
      conflicts: conflicts.length,
      warnings: warnings.length,
      valid: validation.valid
    });

    return result;
  }

  /**
   * Set up zero-configuration mode
   * Automatically detects platform and generates optimal configuration
   */
  async setupZeroConfiguration(
    detectionResults?: {
      architecture: PlatformArchitectureType;
      domain: ContentDomainType;
      confidence: number;
      evidence: any;
    }
  ): Promise<ZeroConfigResult> {
    Logger.info('Setting up zero-configuration mode');
    
    const startTime = Date.now();
    
    // Use provided detection results or trigger auto-detection
    let detection = detectionResults;
    if (!detection && this.autoDetectionEnabled) {
      detection = await this.performAutoDetection();
    }
    
    // Fallback to generic settings if no detection available
    if (!detection) {
      detection = {
        architecture: 'individual',
        domain: 'generic',
        confidence: 0.5,
        evidence: { fallback: true }
      };
    }

    // Update detection layer with results
    this.layerSystem.updateDetectionLayer(
      detection.architecture,
      detection.domain,
      detection.confidence,
      detection.evidence
    );

    // Apply appropriate template based on detection
    const template = this.selectBestTemplate(detection.architecture, detection.domain);
    if (template) {
      this.layerSystem.applyTemplate(template.id);
      Logger.debug(`Applied template: ${template.name}`);
    }

    // Generate optimizations
    const optimizations = this.generateOptimizations(detection);

    // Compose final configuration
    const composedConfig = this.getConfiguration();

    const setupTime = Date.now() - startTime;
    
    const result: ZeroConfigResult = {
      configuration: composedConfig.final,
      detection,
      optimizations,
      metadata: {
        setupTime,
        autoDetectionEnabled: this.autoDetectionEnabled,
        fallbacksUsed: detection.confidence < 0.7 ? ['generic-fallback'] : [],
        recommendedAdjustments: this.generateRecommendations(detection, composedConfig)
      }
    };

    Logger.info(`Zero-configuration setup completed in ${setupTime}ms`, {
      architecture: detection.architecture,
      domain: detection.domain,
      confidence: detection.confidence
    });

    return result;
  }

  /**
   * Update a specific layer
   */
  updateLayer(layerType: ConfigurationLayerType, config: any): void {
    this.layerSystem.setLayer(layerType, config);
  }

  /**
   * Get a specific layer
   */
  getLayer<T = any>(layerType: ConfigurationLayerType): T | undefined {
    return this.layerSystem.getLayer<T>(layerType);
  }

  /**
   * Enable or disable auto-detection
   */
  setAutoDetectionEnabled(enabled: boolean): void {
    this.autoDetectionEnabled = enabled;
    Logger.debug(`Auto-detection ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable or disable zero-configuration mode
   */
  setZeroConfigEnabled(enabled: boolean): void {
    this.zeroConfigEnabled = enabled;
    Logger.debug(`Zero-configuration ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set the global merge strategy for layer composition
   */
  setMergeStrategy(strategy: MergeStrategy): void {
    this.globalMergeStrategy = strategy;
    Logger.debug(`Global merge strategy set to: ${strategy}`);
  }

  /**
   * Validate the current configuration
   */
  validateConfiguration(): {
    valid: boolean;
    layerValidation: Record<ConfigurationLayerType, LayerStatus>;
    compositionValidation: any;
    recommendations: string[];
  } {
    Logger.debug('Validating complete configuration');

    const layerValidation = this.layerSystem.getLayerStatuses();
    const compositionValidation = this.layerSystem.validateLayers();
    const composed = this.getConfiguration();

    const recommendations = [
      ...this.generateValidationRecommendations(layerValidation),
      ...this.generateCompositionRecommendations(compositionValidation),
      ...composed.validation.suggestions
    ];

    return {
      valid: compositionValidation.valid && composed.validation.valid,
      layerValidation,
      compositionValidation,
      recommendations
    };
  }

  /**
   * Apply a configuration template
   */
  applyTemplate(templateId: string, overrides?: Record<string, any>): boolean {
    return this.layerSystem.applyTemplate(templateId, overrides);
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): ConfigurationTemplate[] {
    return this.layerSystem.getTemplates();
  }

  /**
   * Get templates matching specific criteria
   */
  getMatchingTemplates(
    architecture?: PlatformArchitectureType,
    domain?: ContentDomainType,
    complexity?: string
  ): ConfigurationTemplate[] {
    return this.layerSystem.getMatchingTemplates(architecture, domain, complexity);
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: ConfigurationTemplate): void {
    this.layerSystem.registerTemplate(template);
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.layerSystem.reset();
    Logger.info('Configuration reset to defaults');
  }

  /**
   * Export current configuration
   */
  exportConfiguration(): {
    layered: LayeredConfiguration;
    composed: FlexibleSeedConfig;
    metadata: {
      exportedAt: Date;
      version: string;
      checksum: string;
    };
  } {
    const layers = this.layerSystem.getAllLayers();
    const composed = this.getConfiguration();
    
    const layered: LayeredConfiguration = {
      metadata: {
        version: '2.5.0',
        createdAt: new Date(),
        lastModified: new Date(),
        source: 'auto-generated',
        checksum: this.generateChecksum(layers)
      },
      universal: layers.universal,
      detection: layers.detection,
      extensions: layers.extensions,
      composition: {
        mergeStrategy: this.globalMergeStrategy,
        customMerges: {},
        validationRules: {
          enforceCompatibility: true,
          allowConflicts: false,
          requireConfirmation: []
        },
        layerActivation: {
          universal: { enabled: true, readonly: true },
          detection: { enabled: this.autoDetectionEnabled, autoUpdate: true },
          extensions: { enabled: true, userControlled: true }
        }
      }
    };

    return {
      layered,
      composed: composed.final,
      metadata: {
        exportedAt: new Date(),
        version: '2.5.0',
        checksum: this.generateChecksum(layered)
      }
    };
  }

  /**
   * Import configuration
   */
  importConfiguration(data: {
    layered?: LayeredConfiguration;
    composed?: FlexibleSeedConfig;
  }): boolean {
    try {
      if (data.layered) {
        // Import layered configuration
        this.layerSystem.setLayer('universal', data.layered.universal);
        this.layerSystem.setLayer('detection', data.layered.detection);
        this.layerSystem.setLayer('extensions', data.layered.extensions);
        
        if (data.layered.composition?.mergeStrategy) {
          this.setMergeStrategy(data.layered.composition.mergeStrategy);
        }
        
        Logger.info('Imported layered configuration');
        return true;
      } else if (data.composed) {
        // Convert composed configuration to layers (best effort)
        this.convertComposedToLayers(data.composed);
        Logger.info('Imported and converted composed configuration');
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to import configuration:', error);
      return false;
    }
  }

  // Private helper methods

  private layerToFlexibleConfig(layer: any): Partial<FlexibleSeedConfig> {
    if (!layer) return {};

    const config: Partial<FlexibleSeedConfig> = {};

    // Map universal layer
    if (layer.layer?.type === 'universal') {
      config.userCount = layer.seeding?.defaultUserCount || 10;
      config.enableRealImages = true;
      config.seed = 'default-seed';
      config.environment = layer.environment?.type || 'development';
      
      // Map makerkit settings
      if (layer.makerkit) {
        config.createTeamAccounts = layer.makerkit.identityProviders?.google || false;
        config.createStandardTestEmails = layer.makerkit.completeAuthFlow || false;
      }
    }

    // Map detection layer
    if (layer.layer?.type === 'detection') {
      if (layer.platform?.architecture !== 'auto') {
        config.detection = {
          platformArchitecture: {
            override: layer.platform.architecture,
            confidence: layer.platform.confidence
          }
        };
      }
      
      if (layer.domain?.domain !== 'auto') {
        config.detection = {
          ...config.detection,
          contentDomain: {
            override: layer.domain.domain,
            confidence: layer.domain.confidence
          }
        };
      }

      // Apply optimizations
      if (layer.optimizations) {
        config.userCount = layer.optimizations.content?.suggestedUserCount;
        config.setupsPerUser = Math.floor((layer.optimizations.content?.suggestedUserCount || 10) / 3);
      }
    }

    // Map extensions layer
    if (layer.layer?.type === 'extensions') {
      config.extensions = layer.domainExtensions;
      
      if (layer.archetypes?.enabled) {
        // Map archetype settings to domain or other config
        config.domain = layer.archetypes.generationConfig?.targetDomain || 'generic';
      }
    }

    return config;
  }

  private mergeWithConflictDetection(
    base: any,
    override: any,
    sourceLayer: ConfigurationLayerType,
    strategy: MergeStrategy
  ): {
    merged: any;
    conflicts: any[];
    warnings: string[];
  } {
    const conflicts: any[] = [];
    const warnings: string[] = [];
    
    const merged = this.deepMergeWithConflictTracking(
      base, 
      override, 
      '', 
      sourceLayer, 
      conflicts, 
      warnings
    );

    return { merged, conflicts, warnings };
  }

  private deepMergeWithConflictTracking(
    base: any,
    override: any,
    path: string,
    sourceLayer: ConfigurationLayerType,
    conflicts: any[],
    warnings: string[]
  ): any {
    if (!base) return override;
    if (!override) return base;

    const result = { ...base };

    for (const key in override) {
      const currentPath = path ? `${path}.${key}` : key;
      const baseValue = result[key];
      const overrideValue = override[key];

      if (baseValue !== undefined && 
          overrideValue !== undefined && 
          baseValue !== overrideValue) {
        
        // Conflict detected
        conflicts.push({
          path: currentPath,
          values: {
            base: baseValue,
            [sourceLayer]: overrideValue
          },
          resolution: 'override',
          resolvedValue: overrideValue
        });
      }

      if (overrideValue !== null && 
          typeof overrideValue === 'object' && 
          !Array.isArray(overrideValue) &&
          baseValue !== null &&
          typeof baseValue === 'object' &&
          !Array.isArray(baseValue)) {
        
        result[key] = this.deepMergeWithConflictTracking(
          baseValue, 
          overrideValue, 
          currentPath, 
          sourceLayer, 
          conflicts, 
          warnings
        );
      } else {
        result[key] = overrideValue;
      }
    }

    return result;
  }

  private validateComposedConfiguration(config: FlexibleSeedConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!config.supabaseUrl) {
      errors.push('Missing required supabaseUrl');
    }

    if (!config.supabaseServiceKey) {
      errors.push('Missing required supabaseServiceKey');
    }

    if (config.userCount && (config.userCount < 1 || config.userCount > 1000)) {
      warnings.push('User count should be between 1 and 1000');
    }

    if (config.setupsPerUser && config.setupsPerUser > 20) {
      warnings.push('High setupsPerUser may impact performance');
    }

    // Domain-specific validation
    if (config.domain) {
      if (!['outdoor', 'saas', 'ecommerce', 'social', 'generic'].includes(config.domain)) {
        errors.push(`Invalid domain: ${config.domain}`);
      }
    }

    // Detection override validation
    if (config.detection?.platformArchitecture?.override &&
        !['individual', 'team', 'hybrid'].includes(config.detection.platformArchitecture.override)) {
      errors.push('Invalid platform architecture override');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  private async performAutoDetection(): Promise<{
    architecture: PlatformArchitectureType;
    domain: ContentDomainType;
    confidence: number;
    evidence: any;
  }> {
    // Placeholder for actual auto-detection logic
    // In a real implementation, this would analyze the database schema
    Logger.debug('Performing auto-detection (placeholder)');
    
    return {
      architecture: 'individual',
      domain: 'generic',
      confidence: 0.8,
      evidence: {
        tablePatterns: ['users', 'profiles'],
        detectionMethod: 'placeholder'
      }
    };
  }

  private selectBestTemplate(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType
  ): ConfigurationTemplate | null {
    const templates = this.layerSystem.getMatchingTemplates(architecture, domain);
    
    if (templates.length === 0) {
      return null;
    }

    // Select template with highest rating
    return templates.reduce((best, current) => 
      current.metadata.rating > best.metadata.rating ? current : best
    );
  }

  private generateOptimizations(detection: any): any {
    return {
      performance: {
        batchSize: detection.confidence > 0.8 ? 100 : 50,
        parallelism: detection.confidence > 0.8 ? 5 : 3
      },
      content: {
        userCount: detection.architecture === 'team' ? 15 : 10,
        contentRatio: detection.domain === 'social' ? 0.9 : 0.7
      },
      features: [
        ...(detection.architecture === 'team' ? ['team-collaboration'] : []),
        ...(detection.domain === 'ecommerce' ? ['inventory-management'] : [])
      ]
    };
  }

  private generateRecommendations(detection: any, composed: ComposedConfiguration): string[] {
    const recommendations: string[] = [];

    if (detection.confidence < 0.7) {
      recommendations.push('Consider manual verification of platform detection');
    }

    if (composed.metadata.conflicts.length > 0) {
      recommendations.push('Review configuration conflicts and adjust layer priorities');
    }

    if (detection.architecture === 'hybrid') {
      recommendations.push('Consider configuring both individual and team archetypes');
    }

    return recommendations;
  }

  private generateValidationRecommendations(layerValidation: Record<ConfigurationLayerType, LayerStatus>): string[] {
    const recommendations: string[] = [];

    Object.entries(layerValidation).forEach(([layer, status]) => {
      if (!status.status.healthy) {
        recommendations.push(`Review ${layer} layer configuration - ${status.status.errors.length} errors found`);
      }
      
      if (status.status.warnings.length > 0) {
        recommendations.push(`Consider addressing ${status.status.warnings.length} warnings in ${layer} layer`);
      }
    });

    return recommendations;
  }

  private generateCompositionRecommendations(validation: any): string[] {
    const recommendations: string[] = [];

    if (validation.warnings.length > 0) {
      recommendations.push('Review layer interaction warnings');
    }

    if (validation.errors.length > 0) {
      recommendations.push('Fix layer compatibility errors before proceeding');
    }

    return recommendations;
  }

  private generateChecksum(data: any): string {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private convertComposedToLayers(composed: FlexibleSeedConfig): void {
    // Convert composed configuration back to layers (best effort)
    // This is a simplified implementation for demonstration
    
    // Update universal layer with basic settings
    const universal = this.layerSystem.getLayer('universal');
    if (universal) {
      universal.seeding.defaultUserCount = composed.userCount || 10;
      universal.environment.type = composed.environment || 'development';
      this.layerSystem.setLayer('universal', universal);
    }

    // Update detection layer with overrides
    if (composed.detection) {
      const detection = this.layerSystem.getLayer('detection');
      if (detection && composed.detection.platformArchitecture?.override) {
        detection.platform.architecture = composed.detection.platformArchitecture.override;
        detection.platform.confidence = composed.detection.platformArchitecture.confidence || 0.8;
        this.layerSystem.setLayer('detection', detection);
      }
    }

    // Update extensions layer
    if (composed.extensions) {
      const extensions = this.layerSystem.getLayer('extensions');
      if (extensions) {
        extensions.domainExtensions = composed.extensions;
        this.layerSystem.setLayer('extensions', extensions);
      }
    }
  }

  private setupDefaultTemplates(): void {
    // Register default templates for common scenarios
    const individualOutdoorTemplate: ConfigurationTemplate = {
      id: 'individual-outdoor',
      name: 'Individual Outdoor Platform',
      description: 'Template for individual outdoor/adventure platforms',
      version: '1.0.0',
      targets: {
        architectures: ['individual'],
        domains: ['outdoor'],
        complexity: 'moderate'
      },
      layers: {
        detection: {
          platform: {
            architecture: 'individual',
            confidence: 0.9,
            evidence: {
              tablePatterns: [],
              relationshipPatterns: [],
              constraintPatterns: [],
              namingConventions: [],
              templateApplied: true
            },
            architectureSettings: {
              individual: {
                focusOnPersonalContent: true,
                enableSocialFeatures: true,
                contentSharingRatio: 0.8
              }
            }
          },
          domain: {
            domain: 'outdoor',
            confidence: 0.9,
            evidence: {
              tableNames: [],
              columnPatterns: [],
              dataTypes: [],
              businessLogicHints: [],
              templateApplied: true
            },
            domainSettings: {
              outdoor: {
                gearFocus: true,
                locationData: true,
                weatherAwareness: true,
                safetyEmphasis: true
              }
            }
          }
        } as Partial<SmartDetectionConfig>,
        extensions: {
          domainExtensions: {
            enabled: [{ name: 'outdoor', enabled: true }]
          },
          archetypes: {
            enabled: true,
            generationConfig: {
              targetArchitecture: 'individual',
              targetDomain: 'outdoor',
              usersPerArchetype: { min: 3, max: 8 },
              distributionStrategy: 'weighted',
              includedCategories: ['content_creator', 'content_discoverer', 'community_expert'],
              excludedCategories: ['casual_browser'],
              experienceLevelDistribution: {
                beginner: 0.4,
                intermediate: 0.3,
                advanced: 0.2,
                expert: 0.1
              },
              generateRelationships: true,
              relationshipDensity: 0.4,
              applyDomainCustomizations: true
            }
          }
        } as Partial<ExtensionsLayerConfig>
      },
      metadata: {
        author: 'SupaSeed v2.5.0',
        tags: ['individual', 'outdoor', 'adventure', 'gear'],
        usageCount: 0,
        rating: 4.5,
        lastUpdated: new Date(),
        compatibility: {
          minimumVersion: '2.5.0',
          dependencies: ['outdoor-extension', 'individual-archetypes']
        }
      },
      customization: {
        requiredFields: [],
        optionalFields: ['userCount', 'contentRatios'],
        defaults: {
          userCount: 12,
          gearFocus: true
        },
        validation: {}
      }
    };

    this.layerSystem.registerTemplate(individualOutdoorTemplate);
    Logger.debug('Registered default configuration templates');
  }

  private handleLayerChange(event: LayerChangeEvent): void {
    Logger.debug(`Layer ${event.layer} changed: ${event.changeType}`, {
      impact: event.impact.severity,
      requiresRegeneration: event.impact.requiresRegeneration
    });

    // Handle specific layer change scenarios
    if (event.layer === 'detection' && event.impact.requiresRegeneration) {
      // Detection layer changed, may need to update extensions
      const detection = this.layerSystem.getLayer<SmartDetectionConfig>('detection');
      const extensions = this.layerSystem.getLayer<ExtensionsLayerConfig>('extensions');
      
      if (detection && extensions && extensions.archetypes.enabled) {
        // Update archetype configuration to match detected platform
        extensions.archetypes.generationConfig.targetArchitecture = detection.platform.architecture as any;
        extensions.archetypes.generationConfig.targetDomain = detection.domain.domain as any;
        this.layerSystem.setLayer('extensions', extensions);
      }
    }
  }
}