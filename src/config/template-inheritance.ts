/**
 * Template Inheritance and Composition Utilities for SupaSeed v2.5.0
 * Implements Task 5.2.3: Advanced template inheritance, composition, and merge strategies
 * Provides sophisticated template composition with conflict resolution and validation
 */

import type {
  CompleteConfigurationTemplate,
  TemplateComposition,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  LayeredConfiguration
} from './config-layers';
import { Logger } from '../utils/logger';

/**
 * Merge strategy configuration for different data types
 */
export interface MergeStrategyConfig {
  arrays: 'replace' | 'merge' | 'append' | 'unique_merge';
  objects: 'replace' | 'merge' | 'deep_merge' | 'selective_merge';
  primitives: 'replace' | 'prefer_override' | 'prefer_base' | 'conditional';
  special?: {
    [path: string]: 'replace' | 'merge' | 'deep_merge' | 'custom';
  };
}

/**
 * Inheritance composition result with detailed metadata
 */
export interface InheritanceCompositionResult {
  composedConfig: LayeredConfiguration;
  inheritanceMetadata: {
    templateChain: string[];
    mergeOperations: MergeOperation[];
    conflictResolutions: ConflictResolution[];
    compositionTime: number;
    validationResults: ValidationResult;
  };
  diagnostics: {
    totalMerges: number;
    conflictsDetected: number;
    conflictsResolved: number;
    performanceMetrics: PerformanceMetrics;
  };
}

/**
 * Individual merge operation details
 */
export interface MergeOperation {
  id: string;
  type: 'template_merge' | 'override_apply' | 'conditional_merge' | 'custom_merge';
  sourcePath: string;
  targetPath: string;
  strategy: string;
  success: boolean;
  duration: number;
  metadata: {
    sourceTemplate?: string;
    originalValue?: any;
    mergedValue?: any;
    conflicts?: string[];
  };
}

/**
 * Conflict resolution details
 */
export interface ConflictResolution {
  id: string;
  path: string;
  conflictType: 'value_mismatch' | 'type_conflict' | 'structural_conflict' | 'constraint_violation';
  conflictSeverity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStrategy: 'automatic' | 'priority_based' | 'user_defined' | 'custom_logic';
  values: {
    base: any;
    incoming: any;
    resolved: any;
  };
  reasoning: string;
  confidence: number;
  metadata: {
    affectedTemplates: string[];
    resolutionTime: number;
    fallbackUsed: boolean;
  };
}

/**
 * Validation result for inheritance composition
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number;
  coverage: {
    templatesValidated: number;
    layersValidated: number;
    constraintsChecked: number;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  path: string;
  severity: 'error' | 'warning' | 'info';
  source: 'template' | 'inheritance' | 'composition' | 'constraint';
  suggested_fix?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  impact: 'none' | 'low' | 'medium' | 'high';
  recommendation?: string;
}

/**
 * Validation suggestion for optimization
 */
export interface ValidationSuggestion {
  type: 'optimization' | 'best_practice' | 'performance' | 'compatibility';
  message: string;
  path?: string;
  benefit: 'low' | 'medium' | 'high';
  implementation?: string;
}

/**
 * Performance metrics for composition process
 */
export interface PerformanceMetrics {
  totalTime: number;
  mergeTime: number;
  validationTime: number;
  conflictResolutionTime: number;
  memoryUsage?: {
    peak: number;
    average: number;
  };
  operationCounts: {
    merges: number;
    conflicts: number;
    validations: number;
  };
}

/**
 * Template inheritance path tracking
 */
export interface InheritancePath {
  templateId: string;
  depth: number;
  parent?: string;
  children: string[];
  mergePriority: number;
  contribution: {
    universal: number;
    detection: number;
    extensions: number;
  };
}

/**
 * Conditional merge context for advanced merging
 */
export interface ConditionalMergeContext {
  currentTemplate: CompleteConfigurationTemplate;
  baseConfig: any;
  incomingConfig: any;
  path: string;
  mergeHistory: MergeOperation[];
  environmentContext: {
    architecture: string;
    domain: string;
    environment: string;
  };
}

/**
 * Main template inheritance and composition engine
 */
export class TemplateInheritanceEngine {
  private mergeStrategies: Map<string, MergeStrategyConfig> = new Map();
  private customMergeFunctions: Map<string, (context: ConditionalMergeContext) => any> = new Map();
  private validationRules: Map<string, (value: any, path: string) => ValidationError[]> = new Map();

  constructor() {
    this.initializeDefaultStrategies();
    this.initializeCustomMergeFunctions();
    this.initializeValidationRules();
  }

  /**
   * Initialize default merge strategies for common patterns
   */
  private initializeDefaultStrategies(): void {
    // Default merge strategy
    this.mergeStrategies.set('default', {
      arrays: 'unique_merge',
      objects: 'deep_merge',
      primitives: 'prefer_override',
      special: {
        'universal.seeding.defaultUserCount': 'replace',
        'detection.platform.confidence': 'replace',
        'extensions.archetypes.generationConfig': 'deep_merge'
      }
    });

    // Conservative merge strategy (minimal changes)
    this.mergeStrategies.set('conservative', {
      arrays: 'merge',
      objects: 'merge',
      primitives: 'prefer_base',
      special: {
        'universal.makerkit': 'replace',
        'detection.platform.architecture': 'prefer_base'
      }
    });

    // Aggressive merge strategy (prefer incoming)
    this.mergeStrategies.set('aggressive', {
      arrays: 'replace',
      objects: 'replace',
      primitives: 'replace',
      special: {}
    });

    // Selective merge strategy (path-specific logic)
    this.mergeStrategies.set('selective', {
      arrays: 'unique_merge',
      objects: 'selective_merge',
      primitives: 'conditional',
      special: {
        'universal.seeding': 'deep_merge',
        'detection': 'replace',
        'extensions.domainExtensions': 'unique_merge'
      }
    });

    Logger.debug('Initialized default merge strategies');
  }

  /**
   * Initialize custom merge functions for special cases
   */
  private initializeCustomMergeFunctions(): void {
    // Custom merge for archetype configurations
    this.customMergeFunctions.set('archetypes', (context) => {
      const base = context.baseConfig;
      const incoming = context.incomingConfig;

      if (!base || !incoming) return incoming || base;

      return {
        enabled: incoming.enabled !== undefined ? incoming.enabled : base.enabled,
        generationConfig: this.mergeGenerationConfig(base.generationConfig, incoming.generationConfig),
        customArchetypes: this.mergeArraysUnique(base.customArchetypes || [], incoming.customArchetypes || [], 'email'),
        selectionStrategy: incoming.selectionStrategy || base.selectionStrategy
      };
    });

    // Custom merge for domain extensions
    this.customMergeFunctions.set('domainExtensions', (context) => {
      const base = context.baseConfig;
      const incoming = context.incomingConfig;

      if (!base?.enabled || !incoming?.enabled) {
        return incoming || base;
      }

      const mergedEnabled = this.mergeArraysUnique(base.enabled, incoming.enabled, 'name');
      return { enabled: mergedEnabled };
    });

    // Custom merge for seeding configuration
    this.customMergeFunctions.set('seeding', (context) => {
      const base = context.baseConfig;
      const incoming = context.incomingConfig;

      // Intelligent merging based on platform type
      if (context.environmentContext.architecture === 'team') {
        return {
          ...base,
          ...incoming,
          defaultUserCount: Math.max(base?.defaultUserCount || 0, incoming?.defaultUserCount || 0),
          contentRatios: incoming.contentRatios || base?.contentRatios,
          relationships: this.deepMerge(base?.relationships, incoming?.relationships)
        };
      }

      return this.deepMerge(base, incoming);
    });

    Logger.debug('Initialized custom merge functions');
  }

  /**
   * Initialize validation rules for inheritance composition
   */
  private initializeValidationRules(): void {
    // Validate user count constraints
    this.validationRules.set('userCount', (value, path) => {
      const errors: ValidationError[] = [];
      if (typeof value !== 'number' || value < 1 || value > 1000) {
        errors.push({
          code: 'INVALID_USER_COUNT',
          message: `User count must be between 1 and 1000, got: ${value}`,
          path,
          severity: 'error',
          source: 'constraint',
          suggested_fix: 'Set userCount to a value between 1 and 1000'
        });
      }
      return errors;
    });

    // Validate content ratios sum to 1.0
    this.validationRules.set('contentRatios', (value, path) => {
      const errors: ValidationError[] = [];
      if (value && typeof value === 'object') {
        const sum = Object.values(value).reduce((acc: number, ratio: any) => acc + (Number(ratio) || 0), 0);
        if (Math.abs(sum - 1.0) > 0.001) {
          errors.push({
            code: 'INVALID_RATIO_SUM',
            message: `Content ratios must sum to 1.0, got: ${sum}`,
            path,
            severity: 'warning',
            source: 'constraint',
            suggested_fix: 'Adjust content ratios to sum to 1.0'
          });
        }
      }
      return errors;
    });

    // Validate domain extension compatibility
    this.validationRules.set('domainExtensions', (value, path) => {
      const errors: ValidationError[] = [];
      if (value?.enabled && Array.isArray(value.enabled)) {
        const enabledExtensions = value.enabled.filter((ext: any) => ext.enabled);
        if (enabledExtensions.length === 0) {
          errors.push({
            code: 'NO_ENABLED_EXTENSIONS',
            message: 'At least one domain extension should be enabled',
            path,
            severity: 'warning',
            source: 'composition'
          });
        }
      }
      return errors;
    });

    Logger.debug('Initialized validation rules');
  }

  /**
   * Compose templates with full inheritance support
   */
  public async composeTemplates(
    templates: CompleteConfigurationTemplate[],
    options: {
      mergeStrategy?: string;
      customMergeRules?: Map<string, any>;
      validationLevel?: 'strict' | 'moderate' | 'lenient';
      performanceTracking?: boolean;
    } = {}
  ): Promise<InheritanceCompositionResult> {
    const startTime = Date.now();
    const mergeOperations: MergeOperation[] = [];
    const conflictResolutions: ConflictResolution[] = [];

    Logger.info(`Composing ${templates.length} templates with inheritance`);

    try {
      // Build inheritance paths
      const inheritancePaths = this.buildInheritancePaths(templates);
      
      // Sort templates by merge priority
      const sortedTemplates = this.sortByMergePriority(templates, inheritancePaths);

      // Perform composition with conflict resolution
      const composedConfig = await this.performComposition(
        sortedTemplates,
        options,
        mergeOperations,
        conflictResolutions
      );

      // Validate composition result
      const validationResults = await this.validateComposition(
        composedConfig,
        templates,
        options.validationLevel || 'moderate'
      );

      const compositionTime = Date.now() - startTime;
      const diagnostics = this.generateDiagnostics(mergeOperations, conflictResolutions, compositionTime);

      Logger.complete(`Template composition completed in ${compositionTime}ms`);

      return {
        composedConfig,
        inheritanceMetadata: {
          templateChain: sortedTemplates.map(t => t.id),
          mergeOperations,
          conflictResolutions,
          compositionTime,
          validationResults
        },
        diagnostics
      };

    } catch (error) {
      Logger.error(`Template composition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Build inheritance paths for template dependency tracking
   */
  private buildInheritancePaths(templates: CompleteConfigurationTemplate[]): Map<string, InheritancePath> {
    const paths = new Map<string, InheritancePath>();

    // Initialize paths for each template
    templates.forEach(template => {
      paths.set(template.id, {
        templateId: template.id,
        depth: 0,
        children: [],
        mergePriority: 0,
        contribution: { universal: 0, detection: 0, extensions: 0 }
      });
    });

    // Build inheritance relationships
    templates.forEach(template => {
      const path = paths.get(template.id)!;
      
      // Process base templates
      template.composition.baseTemplates.forEach(baseId => {
        const basePath = paths.get(baseId);
        if (basePath) {
          path.parent = baseId;
          path.depth = basePath.depth + 1;
          basePath.children.push(template.id);
        }
      });

      // Calculate contribution scores
      this.calculateContributionScores(template, path);
    });

    // Calculate merge priorities
    paths.forEach(path => {
      path.mergePriority = this.calculateMergePriority(path, paths);
    });

    return paths;
  }

  /**
   * Calculate contribution scores for each configuration layer
   */
  private calculateContributionScores(template: CompleteConfigurationTemplate, path: InheritancePath): void {
    // Score based on configuration density and complexity
    path.contribution.universal = this.calculateLayerComplexity(template.layers.universal);
    path.contribution.detection = this.calculateLayerComplexity(template.layers.detection);
    path.contribution.extensions = this.calculateLayerComplexity(template.layers.extensions);
  }

  /**
   * Calculate complexity score for a configuration layer
   */
  private calculateLayerComplexity(layer: any): number {
    if (!layer) return 0;

    let complexity = 0;
    const countProperties = (obj: any, depth = 0): number => {
      let count = 0;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          count += 1;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            count += countProperties(obj[key], depth + 1) * (depth + 1);
          } else if (Array.isArray(obj[key])) {
            count += obj[key].length;
          }
        }
      }
      return count;
    };

    return countProperties(layer);
  }

  /**
   * Calculate merge priority based on inheritance depth and dependencies
   */
  private calculateMergePriority(path: InheritancePath, allPaths: Map<string, InheritancePath>): number {
    let priority = path.depth * 10; // Base priority from depth

    // Add priority for contribution
    priority += Math.max(path.contribution.universal, path.contribution.detection, path.contribution.extensions);

    // Reduce priority if many children (should be applied later)
    priority -= path.children.length * 2;

    return priority;
  }

  /**
   * Sort templates by merge priority (lowest first)
   */
  private sortByMergePriority(
    templates: CompleteConfigurationTemplate[],
    paths: Map<string, InheritancePath>
  ): CompleteConfigurationTemplate[] {
    return templates.sort((a, b) => {
      const pathA = paths.get(a.id)!;
      const pathB = paths.get(b.id)!;
      return pathA.mergePriority - pathB.mergePriority;
    });
  }

  /**
   * Perform the actual composition with merge operations
   */
  private async performComposition(
    sortedTemplates: CompleteConfigurationTemplate[],
    options: any,
    mergeOperations: MergeOperation[],
    conflictResolutions: ConflictResolution[]
  ): Promise<LayeredConfiguration> {
    const strategy = this.mergeStrategies.get(options.mergeStrategy || 'default')!;
    
    // Initialize empty configuration
    let composedConfig: LayeredConfiguration = {
      layers: {
        universal: {} as UniversalCoreConfig,
        detection: {} as SmartDetectionConfig,
        extensions: {} as ExtensionsLayerConfig
      },
      metadata: {
        templateSource: [],
        compositionTime: 0,
        layerCount: 3,
        conflicts: [],
        customizations: []
      }
    };

    // Apply each template in priority order
    for (const template of sortedTemplates) {
      const templateStartTime = Date.now();

      // Merge universal layer
      if (template.layers.universal) {
        const universalResult = await this.mergeLayer(
          composedConfig.layers.universal,
          template.layers.universal,
          'universal',
          strategy,
          template,
          options
        );
        composedConfig.layers.universal = universalResult.merged;
        mergeOperations.push(...universalResult.operations);
        conflictResolutions.push(...universalResult.conflicts);
      }

      // Merge detection layer
      if (template.layers.detection) {
        const detectionResult = await this.mergeLayer(
          composedConfig.layers.detection,
          template.layers.detection,
          'detection',
          strategy,
          template,
          options
        );
        composedConfig.layers.detection = detectionResult.merged;
        mergeOperations.push(...detectionResult.operations);
        conflictResolutions.push(...detectionResult.conflicts);
      }

      // Merge extensions layer
      if (template.layers.extensions) {
        const extensionsResult = await this.mergeLayer(
          composedConfig.layers.extensions,
          template.layers.extensions,
          'extensions',
          strategy,
          template,
          options
        );
        composedConfig.layers.extensions = extensionsResult.merged;
        mergeOperations.push(...extensionsResult.operations);
        conflictResolutions.push(...extensionsResult.conflicts);
      }

      const templateTime = Date.now() - templateStartTime;
      composedConfig.metadata.templateSource.push(template.id);

      Logger.debug(`Merged template ${template.id} in ${templateTime}ms`);
    }

    return composedConfig;
  }

  /**
   * Merge individual configuration layer with conflict detection
   */
  private async mergeLayer(
    base: any,
    incoming: any,
    layerName: string,
    strategy: MergeStrategyConfig,
    sourceTemplate: CompleteConfigurationTemplate,
    options: any
  ): Promise<{
    merged: any;
    operations: MergeOperation[];
    conflicts: ConflictResolution[];
  }> {
    const operations: MergeOperation[] = [];
    const conflicts: ConflictResolution[] = [];
    const merged = this.deepClone(base);

    await this.recursiveMerge(
      merged,
      incoming,
      layerName,
      strategy,
      sourceTemplate.id,
      operations,
      conflicts,
      options
    );

    return { merged, operations, conflicts };
  }

  /**
   * Recursively merge objects with conflict detection
   */
  private async recursiveMerge(
    target: any,
    source: any,
    path: string,
    strategy: MergeStrategyConfig,
    sourceTemplate: string,
    operations: MergeOperation[],
    conflicts: ConflictResolution[],
    options: any
  ): Promise<void> {
    if (!source) return;

    for (const key in source) {
      if (!source.hasOwnProperty(key)) continue;

      const currentPath = path ? `${path}.${key}` : key;
      const sourceValue = source[key];
      const targetValue = target[key];
      const operationId = `${sourceTemplate}-${currentPath}-${Date.now()}`;

      // Check for special path handling
      const specialStrategy = strategy.special?.[currentPath];
      if (specialStrategy) {
        await this.applySpecialMerge(
          target,
          key,
          sourceValue,
          targetValue,
          specialStrategy,
          currentPath,
          sourceTemplate,
          operations,
          conflicts
        );
        continue;
      }

      // Detect conflicts
      if (targetValue !== undefined && targetValue !== sourceValue) {
        const conflict = this.createConflictResolution(
          currentPath,
          targetValue,
          sourceValue,
          sourceTemplate,
          strategy
        );
        conflicts.push(conflict);
      }

      // Apply merge based on type
      if (Array.isArray(sourceValue)) {
        await this.mergeArray(
          target,
          key,
          targetValue,
          sourceValue,
          strategy.arrays,
          currentPath,
          sourceTemplate,
          operations
        );
      } else if (this.isObject(sourceValue)) {
        if (!this.isObject(targetValue)) {
          target[key] = {};
        }
        await this.recursiveMerge(
          target[key],
          sourceValue,
          currentPath,
          strategy,
          sourceTemplate,
          operations,
          conflicts,
          options
        );
      } else {
        await this.mergePrimitive(
          target,
          key,
          targetValue,
          sourceValue,
          strategy.primitives,
          currentPath,
          sourceTemplate,
          operations
        );
      }
    }
  }

  /**
   * Apply special merge strategies for specific paths
   */
  private async applySpecialMerge(
    target: any,
    key: string,
    sourceValue: any,
    targetValue: any,
    specialStrategy: string,
    path: string,
    sourceTemplate: string,
    operations: MergeOperation[],
    conflicts: ConflictResolution[]
  ): Promise<void> {
    const operation: MergeOperation = {
      id: `special-${path}-${Date.now()}`,
      type: 'custom_merge',
      sourcePath: path,
      targetPath: path,
      strategy: specialStrategy,
      success: true,
      duration: 0,
      metadata: {
        sourceTemplate,
        originalValue: targetValue,
        mergedValue: undefined
      }
    };

    const startTime = Date.now();

    try {
      switch (specialStrategy) {
        case 'replace':
          target[key] = sourceValue;
          operation.metadata.mergedValue = sourceValue;
          break;

        case 'merge':
          if (this.isObject(targetValue) && this.isObject(sourceValue)) {
            target[key] = { ...targetValue, ...sourceValue };
          } else {
            target[key] = sourceValue;
          }
          operation.metadata.mergedValue = target[key];
          break;

        case 'deep_merge':
          target[key] = this.deepMerge(targetValue, sourceValue);
          operation.metadata.mergedValue = target[key];
          break;

        case 'custom':
          const customFunction = this.customMergeFunctions.get(key);
          if (customFunction) {
            const context: ConditionalMergeContext = {
              currentTemplate: {} as CompleteConfigurationTemplate, // Simplified
              baseConfig: targetValue,
              incomingConfig: sourceValue,
              path,
              mergeHistory: operations,
              environmentContext: {
                architecture: 'individual',
                domain: 'generic',
                environment: 'local'
              }
            };
            target[key] = customFunction(context);
            operation.metadata.mergedValue = target[key];
          } else {
            target[key] = sourceValue;
            operation.metadata.mergedValue = sourceValue;
          }
          break;

        default:
          target[key] = sourceValue;
          operation.metadata.mergedValue = sourceValue;
      }

      operation.success = true;
    } catch (error) {
      operation.success = false;
      operation.metadata.conflicts = [error instanceof Error ? error.message : 'Unknown error'];
    }

    operation.duration = Date.now() - startTime;
    operations.push(operation);
  }

  /**
   * Merge arrays with different strategies
   */
  private async mergeArray(
    target: any,
    key: string,
    targetValue: any[],
    sourceValue: any[],
    strategy: string,
    path: string,
    sourceTemplate: string,
    operations: MergeOperation[]
  ): Promise<void> {
    const operation: MergeOperation = {
      id: `array-${path}-${Date.now()}`,
      type: 'template_merge',
      sourcePath: path,
      targetPath: path,
      strategy,
      success: true,
      duration: 0,
      metadata: {
        sourceTemplate,
        originalValue: targetValue,
        mergedValue: undefined
      }
    };

    const startTime = Date.now();

    try {
      switch (strategy) {
        case 'replace':
          target[key] = [...sourceValue];
          break;

        case 'merge':
          target[key] = Array.isArray(targetValue) 
            ? [...targetValue, ...sourceValue]
            : [...sourceValue];
          break;

        case 'append':
          if (Array.isArray(targetValue)) {
            target[key] = [...targetValue, ...sourceValue];
          } else {
            target[key] = [...sourceValue];
          }
          break;

        case 'unique_merge':
          const baseArray = Array.isArray(targetValue) ? targetValue : [];
          target[key] = this.mergeArraysUnique(baseArray, sourceValue);
          break;

        default:
          target[key] = [...sourceValue];
      }

      operation.metadata.mergedValue = target[key];
      operation.success = true;
    } catch (error) {
      operation.success = false;
      operation.metadata.conflicts = [error instanceof Error ? error.message : 'Unknown error'];
    }

    operation.duration = Date.now() - startTime;
    operations.push(operation);
  }

  /**
   * Merge primitive values with different strategies
   */
  private async mergePrimitive(
    target: any,
    key: string,
    targetValue: any,
    sourceValue: any,
    strategy: string,
    path: string,
    sourceTemplate: string,
    operations: MergeOperation[]
  ): Promise<void> {
    const operation: MergeOperation = {
      id: `primitive-${path}-${Date.now()}`,
      type: 'template_merge',
      sourcePath: path,
      targetPath: path,
      strategy,
      success: true,
      duration: 0,
      metadata: {
        sourceTemplate,
        originalValue: targetValue,
        mergedValue: undefined
      }
    };

    const startTime = Date.now();

    try {
      switch (strategy) {
        case 'replace':
          target[key] = sourceValue;
          break;

        case 'prefer_override':
          target[key] = sourceValue;
          break;

        case 'prefer_base':
          if (targetValue === undefined) {
            target[key] = sourceValue;
          }
          break;

        case 'conditional':
          // Apply conditional logic based on value types and context
          if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
            target[key] = Math.max(targetValue, sourceValue);
          } else {
            target[key] = sourceValue;
          }
          break;

        default:
          target[key] = sourceValue;
      }

      operation.metadata.mergedValue = target[key];
      operation.success = true;
    } catch (error) {
      operation.success = false;
      operation.metadata.conflicts = [error instanceof Error ? error.message : 'Unknown error'];
    }

    operation.duration = Date.now() - startTime;
    operations.push(operation);
  }

  /**
   * Create conflict resolution for detected conflicts
   */
  private createConflictResolution(
    path: string,
    baseValue: any,
    incomingValue: any,
    sourceTemplate: string,
    strategy: MergeStrategyConfig
  ): ConflictResolution {
    const conflictType = this.determineConflictType(baseValue, incomingValue);
    const severity = this.determineConflictSeverity(path, baseValue, incomingValue);
    
    return {
      id: `conflict-${path}-${Date.now()}`,
      path,
      conflictType,
      conflictSeverity: severity,
      resolutionStrategy: 'automatic',
      values: {
        base: baseValue,
        incoming: incomingValue,
        resolved: incomingValue // Default resolution
      },
      reasoning: `Template ${sourceTemplate} overrides existing value at ${path}`,
      confidence: 0.8,
      metadata: {
        affectedTemplates: [sourceTemplate],
        resolutionTime: 0,
        fallbackUsed: false
      }
    };
  }

  /**
   * Determine conflict type based on value comparison
   */
  private determineConflictType(baseValue: any, incomingValue: any): ConflictResolution['conflictType'] {
    if (typeof baseValue !== typeof incomingValue) {
      return 'type_conflict';
    }
    
    if (this.isObject(baseValue) && this.isObject(incomingValue)) {
      return 'structural_conflict';
    }
    
    return 'value_mismatch';
  }

  /**
   * Determine conflict severity based on path and values
   */
  private determineConflictSeverity(path: string, baseValue: any, incomingValue: any): ConflictResolution['conflictSeverity'] {
    // Critical paths that affect core functionality
    const criticalPaths = ['supabaseUrl', 'supabaseServiceKey', 'environment'];
    if (criticalPaths.some(critical => path.includes(critical))) {
      return 'critical';
    }

    // High impact paths
    const highImpactPaths = ['defaultUserCount', 'architecture', 'domain'];
    if (highImpactPaths.some(high => path.includes(high))) {
      return 'high';
    }

    // Type conflicts are generally medium severity
    if (typeof baseValue !== typeof incomingValue) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Validate composition result
   */
  private async validateComposition(
    composedConfig: LayeredConfiguration,
    sourceTemplates: CompleteConfigurationTemplate[],
    validationLevel: 'strict' | 'moderate' | 'lenient'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate each layer
    await this.validateLayer(composedConfig.layers.universal, 'universal', errors, warnings, suggestions, validationLevel);
    await this.validateLayer(composedConfig.layers.detection, 'detection', errors, warnings, suggestions, validationLevel);
    await this.validateLayer(composedConfig.layers.extensions, 'extensions', errors, warnings, suggestions, validationLevel);

    // Calculate validation score
    const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
      coverage: {
        templatesValidated: sourceTemplates.length,
        layersValidated: 3,
        constraintsChecked: this.validationRules.size
      }
    };
  }

  /**
   * Validate individual configuration layer
   */
  private async validateLayer(
    layer: any,
    layerName: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[],
    validationLevel: string
  ): Promise<void> {
    if (!layer) return;

    // Apply validation rules
    for (const [ruleName, validationFunction] of this.validationRules) {
      const value = this.getNestedProperty(layer, ruleName);
      if (value !== undefined) {
        const ruleErrors = validationFunction(value, `${layerName}.${ruleName}`);
        errors.push(...ruleErrors);
      }
    }

    // Additional layer-specific validations
    if (validationLevel === 'strict') {
      await this.strictValidation(layer, layerName, errors, warnings, suggestions);
    }
  }

  /**
   * Perform strict validation for critical configurations
   */
  private async strictValidation(
    layer: any,
    layerName: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: ValidationSuggestion[]
  ): Promise<void> {
    // Add strict validation logic here
    // This would include comprehensive checks for production readiness
  }

  /**
   * Generate diagnostics for composition process
   */
  private generateDiagnostics(
    mergeOperations: MergeOperation[],
    conflictResolutions: ConflictResolution[],
    totalTime: number
  ): InheritanceCompositionResult['diagnostics'] {
    const successfulMerges = mergeOperations.filter(op => op.success).length;
    const failedMerges = mergeOperations.filter(op => !op.success).length;
    const resolvedConflicts = conflictResolutions.filter(cr => cr.resolutionStrategy !== 'user_defined').length;

    return {
      totalMerges: mergeOperations.length,
      conflictsDetected: conflictResolutions.length,
      conflictsResolved: resolvedConflicts,
      performanceMetrics: {
        totalTime,
        mergeTime: mergeOperations.reduce((sum, op) => sum + op.duration, 0),
        validationTime: 0, // Would be calculated from validation operations
        conflictResolutionTime: conflictResolutions.reduce((sum, cr) => sum + cr.metadata.resolutionTime, 0),
        operationCounts: {
          merges: successfulMerges,
          conflicts: conflictResolutions.length,
          validations: 0 // Would be calculated from validation operations
        }
      }
    };
  }

  /**
   * Utility method to deep clone an object
   */
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item)) as unknown as T;
    
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }
    return cloned;
  }

  /**
   * Utility method to check if value is a plain object
   */
  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Utility method to deep merge two objects
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = this.deepClone(target);
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[Extract<keyof T, string>];
        }
      }
    }

    return result;
  }

  /**
   * Utility method to merge arrays with uniqueness
   */
  private mergeArraysUnique<T>(base: T[], incoming: T[], uniqueKey?: string): T[] {
    if (!uniqueKey) {
      return [...new Set([...base, ...incoming])];
    }

    const merged = [...base];
    for (const item of incoming) {
      const exists = merged.find(existing => 
        (existing as any)[uniqueKey] === (item as any)[uniqueKey]
      );
      if (!exists) {
        merged.push(item);
      }
    }
    return merged;
  }

  /**
   * Utility method to merge generation configs
   */
  private mergeGenerationConfig(base: any, incoming: any): any {
    if (!base || !incoming) return incoming || base;

    return {
      ...base,
      ...incoming,
      experienceLevelDistribution: {
        ...base.experienceLevelDistribution,
        ...incoming.experienceLevelDistribution
      },
      includedCategories: this.mergeArraysUnique(
        base.includedCategories || [], 
        incoming.includedCategories || []
      ),
      excludedCategories: this.mergeArraysUnique(
        base.excludedCategories || [], 
        incoming.excludedCategories || []
      )
    };
  }

  /**
   * Utility method to get nested property value
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

/**
 * Default template inheritance engine instance
 */
export const templateInheritanceEngine = new TemplateInheritanceEngine();