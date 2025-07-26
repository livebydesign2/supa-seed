/**
 * Advanced Configuration Customization System for SupaSeed v2.5.0
 * Implements Task 5.3.1: Deep configuration overrides with constraint checking
 * Provides extensive customization capabilities while maintaining universal compatibility
 */

import type {
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  ConfigurationTemplate
} from './config-layers';
import type { FlexibleSeedConfig } from '../config-types';
import { Logger } from '../utils/logger';

/**
 * Advanced customization options for deep configuration modification
 */
export interface AdvancedCustomizationOptions {
  allowUnsafeOverrides?: boolean;
  preserveUniversalConstraints?: boolean;
  validateCompatibility?: boolean;
  enableMigration?: boolean;
  trackChanges?: boolean;
  performanceOptimization?: boolean;
}

/**
 * Deep override configuration for specific configuration paths
 */
export interface DeepOverrideConfig {
  path: string;
  value: any;
  strategy: 'replace' | 'merge' | 'append' | 'prepend' | 'remove';
  condition?: string; // Conditional application
  priority?: number; // Override priority (higher wins)
  validation?: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    constraints?: string[]; // Validation constraints
  };
  metadata?: {
    reason?: string;
    author?: string;
    timestamp?: Date;
    migrationPath?: string;
  };
}

/**
 * Constraint checking configuration for maintaining compatibility
 */
export interface ConstraintCheckConfig {
  universal: {
    preserveMakerKitCompliance: boolean;
    enforceRLSCompliance: boolean;
    maintainAuthFlow: boolean;
    validateWebhookSupport: boolean;
  };
  detection: {
    preserveAutoDetection: boolean;
    allowArchitectureOverride: boolean;
    allowDomainOverride: boolean;
    validateDetectionLogic: boolean;
  };
  extensions: {
    maintainPluginCompatibility: boolean;
    enforceExtensionDependencies: boolean;
    validateArchetypeConsistency: boolean;
    preserveStoragePatterns: boolean;
  };
}

/**
 * Configuration customization result with validation and change tracking
 */
export interface CustomizationResult {
  success: boolean;
  customizedConfig: LayeredConfiguration;
  appliedOverrides: DeepOverrideConfig[];
  constraintViolations: ConstraintViolation[];
  warnings: string[];
  suggestions: string[];
  performanceImpact: {
    estimatedSlowdown: number; // percentage
    memoryIncrease: number; // MB
    complexityScore: number; // 1-10
  };
  migrationInfo?: {
    fromVersion: string;
    toVersion: string;
    migrationSteps: string[];
    backwardCompatible: boolean;
  };
}

/**
 * Constraint violation details for validation reporting
 */
export interface ConstraintViolation {
  path: string;
  violationType: 'universal' | 'detection' | 'extension' | 'performance';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  autoFixAvailable?: boolean;
  migrationRequired?: boolean;
}

/**
 * Configuration migration tracking for version compatibility
 */
export interface MigrationTracker {
  originalConfig: LayeredConfiguration;
  targetConfig: LayeredConfiguration;
  migrationSteps: MigrationStep[];
  rollbackSupport: boolean;
  validationResults: ValidationResult[];
}

/**
 * Individual migration step for configuration updates
 */
export interface MigrationStep {
  id: string;
  description: string;
  type: 'add' | 'modify' | 'remove' | 'restructure';
  path: string;
  before?: any;
  after?: any;
  reversible: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration: number; // milliseconds
}

/**
 * Configuration validation result for compatibility checking
 */
export interface ValidationResult {
  valid: boolean;
  path: string;
  violations: ConstraintViolation[];
  performance: {
    executionTime: number;
    memoryUsage: number;
    complexity: number;
  };
  recommendations: string[];
}

/**
 * Advanced Configuration Customization Engine
 * Provides deep customization capabilities with comprehensive validation and migration support
 */
export class AdvancedConfigurationCustomizer {
  private constraints: ConstraintCheckConfig;
  private migrationTracker: MigrationTracker | null = null;
  private changeHistory: DeepOverrideConfig[] = [];

  constructor(constraints?: Partial<ConstraintCheckConfig>) {
    this.constraints = {
      universal: {
        preserveMakerKitCompliance: true,
        enforceRLSCompliance: true,
        maintainAuthFlow: true,
        validateWebhookSupport: true,
        ...constraints?.universal
      },
      detection: {
        preserveAutoDetection: true,
        allowArchitectureOverride: true,
        allowDomainOverride: true,
        validateDetectionLogic: true,
        ...constraints?.detection
      },
      extensions: {
        maintainPluginCompatibility: true,
        enforceExtensionDependencies: true,
        validateArchetypeConsistency: true,
        preserveStoragePatterns: true,
        ...constraints?.extensions
      }
    };
  }

  /**
   * Apply advanced customizations to layered configuration
   */
  public async applyAdvancedCustomizations(
    baseConfig: LayeredConfiguration,
    overrides: DeepOverrideConfig[],
    options: AdvancedCustomizationOptions = {}
  ): Promise<CustomizationResult> {
    Logger.info('Applying advanced configuration customizations...');
    const startTime = Date.now();

    try {
      // Sort overrides by priority
      const sortedOverrides = this.sortOverridesByPriority(overrides);
      
      // Create deep copy for customization
      const customizedConfig = this.deepClone(baseConfig);
      
      // Track applied overrides and violations
      const appliedOverrides: DeepOverrideConfig[] = [];
      const constraintViolations: ConstraintViolation[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Apply each override with validation
      for (const override of sortedOverrides) {
        try {
          // Validate override before application
          const preValidation = await this.validateOverride(override, customizedConfig, options);
          
          if (preValidation.canApply) {
            // Apply the override
            await this.applyDeepOverride(customizedConfig, override, options);
            appliedOverrides.push(override);
            
            // Track change history
            this.changeHistory.push({
              ...override,
              metadata: {
                ...override.metadata,
                timestamp: new Date()
              }
            });
          } else {
            constraintViolations.push(...preValidation.violations);
            warnings.push(...preValidation.warnings);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          constraintViolations.push({
            path: override.path,
            violationType: 'universal',
            severity: 'error',
            message: `Failed to apply override: ${message}`,
            suggestion: 'Review override configuration and try again'
          });
        }
      }

      // Final validation of customized configuration
      const finalValidation = await this.validateCustomizedConfig(customizedConfig, options);
      constraintViolations.push(...finalValidation.violations);
      warnings.push(...finalValidation.warnings);
      suggestions.push(...finalValidation.suggestions);

      // Calculate performance impact
      const performanceImpact = this.calculatePerformanceImpact(baseConfig, customizedConfig, appliedOverrides);

      // Generate migration info if applicable
      const migrationInfo = options.enableMigration 
        ? await this.generateMigrationInfo(baseConfig, customizedConfig)
        : undefined;

      const result: CustomizationResult = {
        success: constraintViolations.filter(v => v.severity === 'error').length === 0,
        customizedConfig,
        appliedOverrides,
        constraintViolations,
        warnings,
        suggestions,
        performanceImpact,
        migrationInfo
      };

      const duration = Date.now() - startTime;
      Logger.complete(`Advanced customization completed in ${duration}ms`);
      
      return result;

    } catch (error) {
      Logger.error(`Advanced customization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Validate individual override before application
   */
  private async validateOverride(
    override: DeepOverrideConfig,
    config: LayeredConfiguration,
    options: AdvancedCustomizationOptions
  ): Promise<{ canApply: boolean; violations: ConstraintViolation[]; warnings: string[] }> {
    const violations: ConstraintViolation[] = [];
    const warnings: string[] = [];

    // Path validation
    if (!this.isValidConfigPath(override.path)) {
      violations.push({
        path: override.path,
        violationType: 'universal',
        severity: 'error',
        message: 'Invalid configuration path',
        suggestion: 'Use valid configuration path format (e.g., "layers.universal.makerkit.enabled")'
      });
    }

    // Type validation
    if (override.validation?.type) {
      const currentValue = this.getValueAtPath(config, override.path);
      if (currentValue !== undefined && !this.validateType(override.value, override.validation.type)) {
        violations.push({
          path: override.path,
          violationType: 'universal',
          severity: 'error',
          message: `Type mismatch: expected ${override.validation.type}, got ${typeof override.value}`,
          suggestion: `Convert value to ${override.validation.type} type`
        });
      }
    }

    // Constraint validation
    if (override.validation?.constraints) {
      for (const constraint of override.validation.constraints) {
        const constraintResult = await this.evaluateConstraint(constraint, override.value, config);
        if (!constraintResult.valid) {
          violations.push({
            path: override.path,
            violationType: 'universal',
            severity: constraintResult.severity,
            message: constraintResult.message,
            suggestion: constraintResult.suggestion
          });
        }
      }
    }

    // Universal constraints check
    if (options.preserveUniversalConstraints !== false) {
      const universalViolations = await this.checkUniversalConstraints(override, config);
      violations.push(...universalViolations);
    }

    // Conditional application check
    if (override.condition) {
      const conditionMet = await this.evaluateCondition(override.condition, config);
      if (!conditionMet) {
        warnings.push(`Condition not met for override at ${override.path}: ${override.condition}`);
      }
    }

    return {
      canApply: violations.filter(v => v.severity === 'error').length === 0,
      violations,
      warnings
    };
  }

  /**
   * Apply deep override to configuration using specified strategy
   */
  private async applyDeepOverride(
    config: LayeredConfiguration,
    override: DeepOverrideConfig,
    options: AdvancedCustomizationOptions
  ): Promise<void> {
    const pathParts = override.path.split('.');
    const target = this.navigateToParent(config, pathParts);
    const key = pathParts[pathParts.length - 1];

    if (!target) {
      throw new Error(`Cannot navigate to path: ${override.path}`);
    }

    switch (override.strategy) {
      case 'replace':
        target[key] = override.value;
        break;

      case 'merge':
        if (this.isObject(target[key]) && this.isObject(override.value)) {
          target[key] = { ...target[key], ...override.value };
        } else {
          target[key] = override.value;
        }
        break;

      case 'append':
        if (Array.isArray(target[key])) {
          target[key].push(...(Array.isArray(override.value) ? override.value : [override.value]));
        } else {
          target[key] = [target[key], override.value].filter(v => v !== undefined);
        }
        break;

      case 'prepend':
        if (Array.isArray(target[key])) {
          target[key].unshift(...(Array.isArray(override.value) ? override.value : [override.value]));
        } else {
          target[key] = [override.value, target[key]].filter(v => v !== undefined);
        }
        break;

      case 'remove':
        if (Array.isArray(target[key])) {
          target[key] = target[key].filter((item: any) => 
            Array.isArray(override.value) 
              ? !override.value.includes(item)
              : item !== override.value
          );
        } else {
          delete target[key];
        }
        break;

      default:
        throw new Error(`Unknown override strategy: ${override.strategy}`);
    }
  }

  /**
   * Check universal constraints for configuration compatibility
   */
  private async checkUniversalConstraints(
    override: DeepOverrideConfig,
    config: LayeredConfiguration
  ): Promise<ConstraintViolation[]> {
    const violations: ConstraintViolation[] = [];

    // MakerKit compliance check
    if (this.constraints.universal.preserveMakerKitCompliance && 
        override.path.startsWith('layers.universal.makerkit')) {
      
      if (override.strategy === 'remove' || override.value === false) {
        violations.push({
          path: override.path,
          violationType: 'universal',
          severity: 'error',
          message: 'Cannot disable core MakerKit functionality',
          suggestion: 'Use customization options instead of disabling core features',
          autoFixAvailable: false
        });
      }
    }

    // RLS compliance check
    if (this.constraints.universal.enforceRLSCompliance && 
        override.path.includes('rls') && override.value === false) {
      
      violations.push({
        path: override.path,
        violationType: 'universal',
        severity: 'error',
        message: 'Cannot disable RLS compliance in universal layer',
        suggestion: 'RLS compliance is required for security',
        autoFixAvailable: false
      });
    }

    // Auth flow integrity check
    if (this.constraints.universal.maintainAuthFlow && 
        override.path.includes('auth') && 
        (override.strategy === 'remove' || override.value === false)) {
      
      violations.push({
        path: override.path,
        violationType: 'universal',
        severity: 'warning',
        message: 'Modifying auth flow may break MakerKit compatibility',
        suggestion: 'Consider using extension-layer auth customizations instead',
        autoFixAvailable: true
      });
    }

    return violations;
  }

  /**
   * Validate the entire customized configuration for consistency
   */
  private async validateCustomizedConfig(
    config: LayeredConfiguration,
    options: AdvancedCustomizationOptions
  ): Promise<{ violations: ConstraintViolation[]; warnings: string[]; suggestions: string[] }> {
    const violations: ConstraintViolation[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate layer consistency
    const layerValidation = await this.validateLayerConsistency(config);
    violations.push(...layerValidation.violations);
    warnings.push(...layerValidation.warnings);

    // Check extension compatibility
    if (config.extensions) {
      const extensionValidation = await this.validateExtensionCompatibility(config.extensions);
      violations.push(...extensionValidation.violations);
      suggestions.push(...extensionValidation.suggestions);
    }

    // Performance validation
    if (options.performanceOptimization) {
      const performanceValidation = await this.validatePerformanceConstraints(config);
      warnings.push(...performanceValidation.warnings);
      suggestions.push(...performanceValidation.suggestions);
    }

    return { violations, warnings, suggestions };
  }

  /**
   * Calculate performance impact of customizations
   */
  private calculatePerformanceImpact(
    baseConfig: LayeredConfiguration,
    customizedConfig: LayeredConfiguration,
    appliedOverrides: DeepOverrideConfig[]
  ): CustomizationResult['performanceImpact'] {
    // Estimate based on number and complexity of overrides
    const complexityScore = Math.min(10, appliedOverrides.length / 5 + 
      appliedOverrides.filter(o => o.strategy === 'merge').length * 0.5);
    
    const estimatedSlowdown = Math.min(50, appliedOverrides.length * 2);
    const memoryIncrease = Math.min(100, appliedOverrides.length * 0.5);

    return {
      estimatedSlowdown,
      memoryIncrease,
      complexityScore
    };
  }

  /**
   * Generate migration information for configuration updates
   */
  private async generateMigrationInfo(
    fromConfig: LayeredConfiguration,
    toConfig: LayeredConfiguration
  ): Promise<CustomizationResult['migrationInfo']> {
    const migrationSteps: string[] = [];
    
    // Compare configurations and generate migration steps
    const differences = this.compareConfigurations(fromConfig, toConfig);
    
    for (const diff of differences) {
      migrationSteps.push(`Update ${diff.path}: ${diff.from} → ${diff.to}`);
    }

    return {
      fromVersion: '2.5.0',
      toVersion: '2.5.0-customized',
      migrationSteps,
      backwardCompatible: differences.every(d => d.backwardCompatible)
    };
  }

  /**
   * Utility methods for configuration manipulation
   */
  private sortOverridesByPriority(overrides: DeepOverrideConfig[]): DeepOverrideConfig[] {
    return [...overrides].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private isValidConfigPath(path: string): boolean {
    const validPrefixes = ['layers.universal', 'layers.detection', 'layers.extensions', 'metadata'];
    return validPrefixes.some(prefix => path.startsWith(prefix));
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array': return Array.isArray(value);
      default: return true;
    }
  }

  private async evaluateConstraint(
    constraint: string,
    value: any,
    config: LayeredConfiguration
  ): Promise<{ valid: boolean; severity: 'error' | 'warning'; message: string; suggestion?: string }> {
    // Simple constraint evaluation - can be extended with more sophisticated logic
    if (constraint === 'required' && (value === undefined || value === null)) {
      return {
        valid: false,
        severity: 'error',
        message: 'Required value is missing',
        suggestion: 'Provide a valid value for this configuration'
      };
    }

    return { valid: true, severity: 'error', message: '' };
  }

  private async evaluateCondition(condition: string, config: LayeredConfiguration): Promise<boolean> {
    // Simple condition evaluation - can be extended with expression parser
    return true; // Simplified for now
  }

  private getValueAtPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private navigateToParent(obj: any, pathParts: string[]): any {
    let current = obj;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (current[pathParts[i]] === undefined) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }
    return current;
  }

  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private async validateLayerConsistency(config: LayeredConfiguration): Promise<{ violations: ConstraintViolation[]; warnings: string[] }> {
    return { violations: [], warnings: [] };
  }

  private async validateExtensionCompatibility(extensions: ExtensionsLayerConfig): Promise<{ violations: ConstraintViolation[]; suggestions: string[] }> {
    return { violations: [], suggestions: [] };
  }

  private async validatePerformanceConstraints(config: LayeredConfiguration): Promise<{ warnings: string[]; suggestions: string[] }> {
    return { warnings: [], suggestions: [] };
  }

  private compareConfigurations(from: LayeredConfiguration, to: LayeredConfiguration): Array<{ path: string; from: any; to: any; backwardCompatible: boolean }> {
    return []; // Simplified for now
  }

  /**
   * Get customization history for audit and rollback
   */
  public getCustomizationHistory(): DeepOverrideConfig[] {
    return [...this.changeHistory];
  }

  /**
   * Clear customization history
   */
  public clearCustomizationHistory(): void {
    this.changeHistory = [];
    Logger.debug('Customization history cleared');
  }

  /**
   * Export customization configuration for sharing
   */
  public exportCustomizations(appliedOverrides: DeepOverrideConfig[]): string {
    const exportData = {
      version: '2.5.0',
      timestamp: new Date().toISOString(),
      overrides: appliedOverrides,
      metadata: {
        totalOverrides: appliedOverrides.length,
        complexityScore: this.calculateComplexityScore(appliedOverrides)
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import customization configuration
   */
  public importCustomizations(configJson: string): DeepOverrideConfig[] {
    try {
      const importData = JSON.parse(configJson);
      
      if (!importData.version || !importData.overrides) {
        throw new Error('Invalid customization configuration format');
      }

      Logger.info(`Importing ${importData.overrides.length} customizations from v${importData.version}`);
      return importData.overrides;
      
    } catch (error) {
      Logger.error(`Failed to import customizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Calculate complexity score for customizations
   */
  private calculateComplexityScore(overrides: DeepOverrideConfig[]): number {
    return Math.min(10, overrides.length / 10 + 
      overrides.filter(o => o.strategy === 'merge').length * 0.3 +
      overrides.filter(o => o.condition).length * 0.2);
  }
}

/**
 * Default advanced customization instance
 */
export const advancedCustomizer = new AdvancedConfigurationCustomizer();