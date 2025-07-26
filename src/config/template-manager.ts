/**
 * Template Management System for SupaSeed v2.5.0
 * Implements Task 5.2.2: Template selection, application, customization, and inheritance
 * Provides comprehensive template management capabilities for the 3-layer configuration system
 */

import type { FlexibleSeedConfig } from '../config-types';
import type {
  ConfigurationTemplate,
  CompleteConfigurationTemplate,
  TemplateMetadata,
  TemplateComposition,
  PlatformArchitectureType,
  ContentDomainType,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  LayeredConfiguration
} from './config-layers';
import {
  ALL_CONFIGURATION_TEMPLATES,
  TEMPLATE_REGISTRY,
  getRecommendedTemplates
} from './config-templates';
import { Logger } from '../utils/logger';

/**
 * Template selection criteria for finding appropriate templates
 */
export interface TemplateSelectionCriteria {
  architecture?: PlatformArchitectureType;
  domain?: ContentDomainType;
  complexity?: string;
  tags?: string[];
  category?: 'platform' | 'domain' | 'hybrid' | 'specialized';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  compatibility?: {
    minimumVersion?: string;
    maxSetupTime?: string;
    requiredExtensions?: string[];
  };
  preferences?: {
    prioritizeRating?: boolean;
    prioritizeUsage?: boolean;
    requireDocumentation?: boolean;
    allowBeta?: boolean;
  };
}

/**
 * Template application options for customizing how templates are applied
 */
export interface TemplateApplicationOptions {
  inheritance?: {
    enableInheritance?: boolean;
    mergeStrategy?: 'replace' | 'merge' | 'deep_merge';
    resolveConflicts?: boolean;
    validateConstraints?: boolean;
  };
  customization?: {
    allowOverrides?: boolean;
    preserveUserConfig?: boolean;
    validateRequired?: boolean;
    applyDefaults?: boolean;
  };
  validation?: {
    validateAfterApplication?: boolean;
    requireCompatibility?: boolean;
    allowWarnings?: boolean;
    strictMode?: boolean;
  };
  reporting?: {
    includeMetadata?: boolean;
    trackChanges?: boolean;
    generateReport?: boolean;
  };
}

/**
 * Template application result with metadata and validation
 */
export interface TemplateApplicationResult {
  success: boolean;
  appliedTemplate: CompleteConfigurationTemplate;
  resultingConfig: LayeredConfiguration;
  metadata: {
    applicationTime: number;
    inheritanceChain: string[];
    overridesApplied: number;
    conflictsResolved: number;
    validationResults: {
      valid: boolean;
      errors: string[];
      warnings: string[];
      suggestions: string[];
    };
  };
  changes: {
    path: string;
    before: any;
    after: any;
    source: 'template' | 'inheritance' | 'override' | 'default';
  }[];
  report?: string;
}

/**
 * Template customization parameters for user-specific modifications
 */
export interface TemplateCustomization {
  templateId: string;
  customizations: {
    path: string;
    value: any;
    reason?: string;
    preserve?: boolean;
  }[];
  metadata?: {
    customizedBy?: string;
    customizedAt?: Date;
    version?: string;
    description?: string;
  };
}

/**
 * Template inheritance chain for composition and conflict resolution
 */
export interface TemplateInheritanceChain {
  templates: CompleteConfigurationTemplate[];
  mergeOrder: string[];
  conflicts: {
    path: string;
    values: Record<string, any>;
    resolution: 'manual' | 'automatic';
    appliedValue: any;
    reason: string;
  }[];
  metadata: {
    totalInheritance: number;
    compositionTime: number;
    complexityScore: number;
  };
}

/**
 * Template validation results for ensuring compatibility and correctness
 */
export interface TemplateValidationResult {
  valid: boolean;
  templateId: string;
  errors: {
    code: string;
    message: string;
    path?: string;
    severity: 'error' | 'warning' | 'info';
  }[];
  warnings: string[];
  suggestions: string[];
  compatibility: {
    version: boolean;
    dependencies: boolean;
    constraints: boolean;
    extensions: boolean;
  };
  score: number; // 0-100 validation score
}

/**
 * Main template manager class providing comprehensive template management
 */
export class ConfigurationTemplateManager {
  private templates: Map<string, CompleteConfigurationTemplate> = new Map();
  private customizations: Map<string, TemplateCustomization> = new Map();
  private inheritanceCache: Map<string, TemplateInheritanceChain> = new Map();
  private validationCache: Map<string, TemplateValidationResult> = new Map();

  constructor() {
    this.loadBuiltInTemplates();
  }

  /**
   * Load all built-in templates into the manager
   */
  private loadBuiltInTemplates(): void {
    Object.values(ALL_CONFIGURATION_TEMPLATES)
      .flat()
      .forEach(template => {
        this.templates.set(template.id, template);
      });

    Logger.debug(`Loaded ${this.templates.size} built-in templates`);
  }

  /**
   * Find templates matching the specified criteria
   */
  public findTemplates(criteria: TemplateSelectionCriteria): CompleteConfigurationTemplate[] {
    let candidates = Array.from(this.templates.values());

    // Filter by architecture
    if (criteria.architecture) {
      candidates = candidates.filter(template => 
        template.targets.architectures.includes(criteria.architecture!)
      );
    }

    // Filter by domain
    if (criteria.domain) {
      candidates = candidates.filter(template => 
        template.targets.domains.includes(criteria.domain!)
      );
    }

    // Filter by complexity
    if (criteria.complexity) {
      candidates = candidates.filter(template => 
        template.targets.complexity === criteria.complexity
      );
    }

    // Filter by category
    if (criteria.category) {
      candidates = candidates.filter(template => 
        template.metadata.category === criteria.category
      );
    }

    // Filter by difficulty
    if (criteria.difficulty) {
      candidates = candidates.filter(template => 
        template.metadata.difficulty === criteria.difficulty
      );
    }

    // Filter by tags
    if (criteria.tags && criteria.tags.length > 0) {
      candidates = candidates.filter(template => 
        criteria.tags!.some(tag => template.metadata.tags.includes(tag))
      );
    }

    // Filter by compatibility
    if (criteria.compatibility) {
      candidates = candidates.filter(template => {
        const compat = template.metadata.compatibility;
        
        if (criteria.compatibility!.minimumVersion) {
          if (!this.isVersionCompatible(compat.minimumVersion, criteria.compatibility!.minimumVersion)) {
            return false;
          }
        }

        if (criteria.compatibility!.requiredExtensions) {
          const hasRequired = criteria.compatibility!.requiredExtensions.every(ext =>
            compat.dependencies.includes(ext)
          );
          if (!hasRequired) return false;
        }

        return true;
      });
    }

    // Apply preferences for sorting
    if (criteria.preferences) {
      if (criteria.preferences.prioritizeRating) {
        candidates.sort((a, b) => b.metadata.rating - a.metadata.rating);
      } else if (criteria.preferences.prioritizeUsage) {
        candidates.sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);
      }

      if (criteria.preferences.requireDocumentation) {
        candidates = candidates.filter(template => 
          template.documentation.overview.length > 0 &&
          template.documentation.setup.length > 0
        );
      }
    }

    Logger.debug(`Found ${candidates.length} templates matching criteria`);
    return candidates;
  }

  /**
   * Get template recommendations based on platform detection
   */
  public getRecommendations(
    architecture?: PlatformArchitectureType,
    domain?: ContentDomainType,
    difficulty?: string
  ): CompleteConfigurationTemplate[] {
    return getRecommendedTemplates(architecture, domain, difficulty);
  }

  /**
   * Apply a template to create a layered configuration
   */
  public async applyTemplate(
    templateId: string,
    options: TemplateApplicationOptions = {}
  ): Promise<TemplateApplicationResult> {
    const startTime = Date.now();
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    Logger.info(`Applying template: ${template.name}`);

    try {
      // Build inheritance chain if enabled
      const inheritanceChain = options.inheritance?.enableInheritance 
        ? await this.buildInheritanceChain(template)
        : { templates: [template], mergeOrder: [templateId], conflicts: [], metadata: { totalInheritance: 1, compositionTime: 0, complexityScore: 1 } };

      // Apply customizations if available
      const customization = this.customizations.get(templateId);
      
      // Create the layered configuration
      const resultingConfig = await this.composeLayeredConfiguration(
        inheritanceChain,
        customization,
        options
      );

      // Track changes
      const changes = this.trackConfigurationChanges(template, resultingConfig);

      // Validate result if requested
      const validationResults = options.validation?.validateAfterApplication
        ? await this.validateTemplateApplication(template, resultingConfig, options)
        : { valid: true, errors: [], warnings: [], suggestions: [] };

      const applicationTime = Date.now() - startTime;

      // Generate report if requested
      const report = options.reporting?.generateReport
        ? this.generateApplicationReport(template, inheritanceChain, changes, validationResults, applicationTime)
        : undefined;

      const result: TemplateApplicationResult = {
        success: validationResults.valid || (options.validation?.allowWarnings !== false),
        appliedTemplate: template,
        resultingConfig,
        metadata: {
          applicationTime,
          inheritanceChain: inheritanceChain.mergeOrder,
          overridesApplied: customization?.customizations.length || 0,
          conflictsResolved: inheritanceChain.conflicts.length,
          validationResults
        },
        changes,
        report
      };

      Logger.complete(`Template applied successfully in ${applicationTime}ms`);
      return result;

    } catch (error) {
      Logger.error(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Build inheritance chain for template composition
   */
  private async buildInheritanceChain(template: CompleteConfigurationTemplate): Promise<TemplateInheritanceChain> {
    const cacheKey = template.id;
    
    if (this.inheritanceCache.has(cacheKey)) {
      return this.inheritanceCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const templates: CompleteConfigurationTemplate[] = [];
    const mergeOrder: string[] = [];
    const conflicts: TemplateInheritanceChain['conflicts'] = [];

    // Start with base templates if specified
    if (template.composition.baseTemplates.length > 0) {
      for (const baseId of template.composition.baseTemplates) {
        const baseTemplate = this.templates.get(baseId);
        if (baseTemplate) {
          templates.push(baseTemplate);
          mergeOrder.push(baseId);
        }
      }
    }

    // Add the main template
    templates.push(template);
    mergeOrder.push(template.id);

    // Detect conflicts between templates
    for (let i = 0; i < templates.length - 1; i++) {
      const currentTemplate = templates[i];
      const nextTemplate = templates[i + 1];
      
      const templateConflicts = this.detectTemplateConflicts(currentTemplate, nextTemplate);
      conflicts.push(...templateConflicts);
    }

    const compositionTime = Date.now() - startTime;
    const chain: TemplateInheritanceChain = {
      templates,
      mergeOrder,
      conflicts,
      metadata: {
        totalInheritance: templates.length,
        compositionTime,
        complexityScore: this.calculateComplexityScore(templates, conflicts)
      }
    };

    this.inheritanceCache.set(cacheKey, chain);
    return chain;
  }

  /**
   * Compose layered configuration from inheritance chain
   */
  private async composeLayeredConfiguration(
    inheritanceChain: TemplateInheritanceChain,
    customization?: TemplateCustomization,
    options: TemplateApplicationOptions = {}
  ): Promise<LayeredConfiguration> {
    const { templates, mergeOrder } = inheritanceChain;
    
    // Start with empty configuration layers
    let universalLayer: Partial<UniversalCoreConfig> = {};
    let detectionLayer: Partial<SmartDetectionConfig> = {};
    let extensionsLayer: Partial<ExtensionsLayerConfig> = {};

    // Apply templates in inheritance order
    for (const templateId of mergeOrder) {
      const template = templates.find(t => t.id === templateId);
      if (!template) continue;

      // Merge each layer using specified strategy
      const strategy = template.composition.mergeStrategy;
      
      if (template.layers.universal) {
        universalLayer = this.mergeConfigurationLayer(
          universalLayer,
          template.layers.universal,
          strategy.objects
        );
      }

      if (template.layers.detection) {
        detectionLayer = this.mergeConfigurationLayer(
          detectionLayer,
          template.layers.detection,
          strategy.objects
        );
      }

      if (template.layers.extensions) {
        extensionsLayer = this.mergeConfigurationLayer(
          extensionsLayer,
          template.layers.extensions,
          strategy.objects
        );
      }
    }

    // Apply customizations if provided
    if (customization && options.customization?.allowOverrides) {
      for (const override of customization.customizations) {
        this.applyCustomizationOverride(
          { universal: universalLayer, detection: detectionLayer, extensions: extensionsLayer },
          override.path,
          override.value
        );
      }
    }

    // Build final layered configuration
    const layeredConfig: LayeredConfiguration = {
      layers: {
        universal: universalLayer as UniversalCoreConfig,
        detection: detectionLayer as SmartDetectionConfig,
        extensions: extensionsLayer as ExtensionsLayerConfig
      },
      metadata: {
        templateSource: inheritanceChain.mergeOrder,
        compositionTime: inheritanceChain.metadata.compositionTime,
        layerCount: 3,
        conflicts: inheritanceChain.conflicts,
        customizations: customization?.customizations || []
      }
    };

    return layeredConfig;
  }

  /**
   * Merge two configuration layers using specified strategy
   */
  private mergeConfigurationLayer<T>(
    base: Partial<T>,
    overlay: Partial<T>,
    strategy: 'replace' | 'merge' | 'deep_merge'
  ): Partial<T> {
    switch (strategy) {
      case 'replace':
        return { ...overlay };
      
      case 'merge':
        return { ...base, ...overlay };
      
      case 'deep_merge':
        return this.deepMerge(base, overlay);
      
      default:
        return { ...base, ...overlay };
    }
  }

  /**
   * Deep merge two objects recursively
   */
  private deepMerge<T>(target: Partial<T>, source: Partial<T>): Partial<T> {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   */
  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Apply customization override to configuration layers
   */
  private applyCustomizationOverride(
    layers: {
      universal: Partial<UniversalCoreConfig>;
      detection: Partial<SmartDetectionConfig>;
      extensions: Partial<ExtensionsLayerConfig>;
    },
    path: string,
    value: any
  ): void {
    const pathParts = path.split('.');
    const layerName = pathParts[0] as 'universal' | 'detection' | 'extensions';
    const propertyPath = pathParts.slice(1);

    if (layers[layerName]) {
      this.setNestedProperty(layers[layerName], propertyPath, value);
    }
  }

  /**
   * Set nested property using dot notation path
   */
  private setNestedProperty(obj: any, path: string[], value: any): void {
    let current = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current) || !this.isObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[path[path.length - 1]] = value;
  }

  /**
   * Detect conflicts between templates
   */
  private detectTemplateConflicts(
    template1: CompleteConfigurationTemplate,
    template2: CompleteConfigurationTemplate
  ): TemplateInheritanceChain['conflicts'] {
    const conflicts: TemplateInheritanceChain['conflicts'] = [];

    // Compare universal layers
    if (template1.layers.universal && template2.layers.universal) {
      const universalConflicts = this.findLayerConflicts(
        template1.layers.universal,
        template2.layers.universal,
        'universal'
      );
      conflicts.push(...universalConflicts);
    }

    // Compare detection layers
    if (template1.layers.detection && template2.layers.detection) {
      const detectionConflicts = this.findLayerConflicts(
        template1.layers.detection,
        template2.layers.detection,
        'detection'
      );
      conflicts.push(...detectionConflicts);
    }

    // Compare extensions layers
    if (template1.layers.extensions && template2.layers.extensions) {
      const extensionsConflicts = this.findLayerConflicts(
        template1.layers.extensions,
        template2.layers.extensions,
        'extensions'
      );
      conflicts.push(...extensionsConflicts);
    }

    return conflicts;
  }

  /**
   * Find conflicts between two layer configurations
   */
  private findLayerConflicts(
    layer1: any,
    layer2: any,
    layerPrefix: string
  ): TemplateInheritanceChain['conflicts'] {
    const conflicts: TemplateInheritanceChain['conflicts'] = [];

    const compareObjects = (obj1: any, obj2: any, path: string): void => {
      for (const key in obj1) {
        if (obj1.hasOwnProperty(key) && obj2.hasOwnProperty(key)) {
          const fullPath = path ? `${path}.${key}` : key;
          const value1 = obj1[key];
          const value2 = obj2[key];

          if (this.isObject(value1) && this.isObject(value2)) {
            compareObjects(value1, value2, fullPath);
          } else if (value1 !== value2) {
            conflicts.push({
              path: `${layerPrefix}.${fullPath}`,
              values: { template1: value1, template2: value2 },
              resolution: 'automatic',
              appliedValue: value2, // Template 2 takes precedence
              reason: 'Later template in inheritance chain takes precedence'
            });
          }
        }
      }
    };

    compareObjects(layer1, layer2, '');
    return conflicts;
  }

  /**
   * Calculate complexity score for inheritance chain
   */
  private calculateComplexityScore(
    templates: CompleteConfigurationTemplate[],
    conflicts: TemplateInheritanceChain['conflicts']
  ): number {
    const baseScore = templates.length;
    const conflictPenalty = conflicts.length * 0.5;
    const compositionBonus = templates.length > 1 ? 0.2 : 0;
    
    return Math.max(1, baseScore + conflictPenalty + compositionBonus);
  }

  /**
   * Track changes made during template application
   */
  private trackConfigurationChanges(
    template: CompleteConfigurationTemplate,
    resultingConfig: LayeredConfiguration
  ): TemplateApplicationResult['changes'] {
    const changes: TemplateApplicationResult['changes'] = [];

    // Track changes in each layer
    const trackLayerChanges = (
      layerName: string,
      templateLayer: any,
      resultLayer: any,
      prefix: string = ''
    ): void => {
      if (!templateLayer || !resultLayer) return;

      for (const key in templateLayer) {
        if (templateLayer.hasOwnProperty(key)) {
          const path = prefix ? `${prefix}.${key}` : key;
          const templateValue = templateLayer[key];
          const resultValue = resultLayer[key];

          if (this.isObject(templateValue) && this.isObject(resultValue)) {
            trackLayerChanges(layerName, templateValue, resultValue, path);
          } else if (templateValue !== undefined) {
            changes.push({
              path: `${layerName}.${path}`,
              before: undefined, // No previous value
              after: resultValue,
              source: 'template'
            });
          }
        }
      }
    };

    trackLayerChanges('universal', template.layers.universal, resultingConfig.layers.universal);
    trackLayerChanges('detection', template.layers.detection, resultingConfig.layers.detection);
    trackLayerChanges('extensions', template.layers.extensions, resultingConfig.layers.extensions);

    return changes;
  }

  /**
   * Validate template application results
   */
  private async validateTemplateApplication(
    template: CompleteConfigurationTemplate,
    resultingConfig: LayeredConfiguration,
    options: TemplateApplicationOptions
  ): Promise<TemplateApplicationResult['metadata']['validationResults']> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate template constraints
    for (const constraint of template.validation.constraints) {
      try {
        const isValid = this.evaluateConstraint(constraint, resultingConfig);
        if (!isValid) {
          errors.push(constraint.message);
        }
      } catch (error) {
        warnings.push(`Failed to validate constraint: ${constraint.path}`);
      }
    }

    // Validate required fields
    for (const requiredField of template.validation.required) {
      if (!this.hasNestedProperty(resultingConfig, requiredField)) {
        errors.push(`Required field missing: ${requiredField}`);
      }
    }

    // Check compatibility if strict mode
    if (options.validation?.strictMode) {
      const compatibilityCheck = await this.validateTemplateCompatibility(template);
      if (!compatibilityCheck.valid) {
        errors.push(...compatibilityCheck.errors.map(e => e.message));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Evaluate a constraint rule against configuration
   */
  private evaluateConstraint(constraint: any, config: LayeredConfiguration): boolean {
    // Simple constraint evaluation - in production this would be more sophisticated
    try {
      const value = this.getNestedProperty(config, constraint.path);
      const rule = constraint.rule;
      
      // Basic rule evaluation
      if (rule.includes('enabled === true')) {
        return value === true;
      }
      if (rule.includes('equals')) {
        const expectedValue = rule.split('"')[1];
        return value === expectedValue;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if nested property exists in object
   */
  private hasNestedProperty(obj: any, path: string): boolean {
    try {
      return this.getNestedProperty(obj, path) !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Get nested property value using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Validate template compatibility
   */
  private async validateTemplateCompatibility(
    template: CompleteConfigurationTemplate
  ): Promise<TemplateValidationResult> {
    const cacheKey = template.id;
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const errors: TemplateValidationResult['errors'] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate version compatibility
    const versionCompatible = this.isVersionCompatible(
      template.metadata.compatibility.minimumVersion,
      '2.5.0' // Current version
    );

    // Validate dependencies
    const dependenciesAvailable = template.metadata.compatibility.dependencies.every(dep => {
      // Check if dependency is available
      return true; // Simplified for this implementation
    });

    // Calculate validation score
    let score = 100;
    if (!versionCompatible) score -= 30;
    if (!dependenciesAvailable) score -= 20;
    score -= errors.length * 10;
    score -= warnings.length * 5;

    const result: TemplateValidationResult = {
      valid: errors.length === 0,
      templateId: template.id,
      errors,
      warnings,
      suggestions,
      compatibility: {
        version: versionCompatible,
        dependencies: dependenciesAvailable,
        constraints: true,
        extensions: true
      },
      score: Math.max(0, score)
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Check version compatibility
   */
  private isVersionCompatible(requiredVersion: string, currentVersion: string): boolean {
    // Simple version comparison - in production would use semver
    const parseVersion = (version: string) => {
      return version.split('.').map(Number);
    };

    const required = parseVersion(requiredVersion);
    const current = parseVersion(currentVersion);

    for (let i = 0; i < Math.max(required.length, current.length); i++) {
      const req = required[i] || 0;
      const cur = current[i] || 0;
      
      if (cur > req) return true;
      if (cur < req) return false;
    }
    
    return true;
  }

  /**
   * Generate comprehensive application report
   */
  private generateApplicationReport(
    template: CompleteConfigurationTemplate,
    inheritanceChain: TemplateInheritanceChain,
    changes: TemplateApplicationResult['changes'],
    validation: TemplateApplicationResult['metadata']['validationResults'],
    applicationTime: number
  ): string {
    const lines: string[] = [
      `# Template Application Report`,
      ``,
      `**Template**: ${template.name} (${template.id})`,
      `**Version**: ${template.version}`,
      `**Applied**: ${new Date().toISOString()}`,
      `**Duration**: ${applicationTime}ms`,
      ``,
      `## Template Details`,
      `- **Category**: ${template.metadata.category}`,
      `- **Difficulty**: ${template.metadata.difficulty}`,
      `- **Architecture**: ${template.targets.architectures.join(', ')}`,
      `- **Domain**: ${template.targets.domains.join(', ')}`,
      `- **Rating**: ${template.metadata.rating}/5`,
      ``,
      `## Inheritance Chain`,
      ...inheritanceChain.mergeOrder.map((id, index) => `${index + 1}. ${id}`),
      ``,
      `## Applied Changes`,
      `**Total Changes**: ${changes.length}`,
      ...changes.slice(0, 10).map(change => 
        `- \`${change.path}\`: ${change.source} → ${JSON.stringify(change.after)}`
      ),
      changes.length > 10 ? `... and ${changes.length - 10} more changes` : '',
      ``,
      `## Validation Results`,
      `**Status**: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`,
      `**Errors**: ${validation.errors.length}`,
      `**Warnings**: ${validation.warnings.length}`,
      `**Suggestions**: ${validation.suggestions.length}`,
      ``,
      `## Configuration Summary`,
      `The template has been successfully applied with ${inheritanceChain.conflicts.length} conflicts resolved`,
      `and ${changes.length} configuration changes applied.`,
      ``
    ];

    return lines.filter(line => line !== '').join('\n');
  }

  /**
   * Register a new template
   */
  public registerTemplate(template: CompleteConfigurationTemplate): void {
    this.templates.set(template.id, template);
    this.validationCache.delete(template.id);
    this.inheritanceCache.delete(template.id);
    
    Logger.debug(`Registered template: ${template.name}`);
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): CompleteConfigurationTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all available templates
   */
  public listTemplates(): CompleteConfigurationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Save template customization
   */
  public saveCustomization(customization: TemplateCustomization): void {
    this.customizations.set(customization.templateId, customization);
    Logger.debug(`Saved customization for template: ${customization.templateId}`);
  }

  /**
   * Get template customization
   */
  public getCustomization(templateId: string): TemplateCustomization | undefined {
    return this.customizations.get(templateId);
  }

  /**
   * Clear caches
   */
  public clearCaches(): void {
    this.validationCache.clear();
    this.inheritanceCache.clear();
    Logger.debug('Template manager caches cleared');
  }
}

/**
 * Default template manager instance
 */
export const templateManager = new ConfigurationTemplateManager();