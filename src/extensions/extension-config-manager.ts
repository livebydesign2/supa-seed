/**
 * Extension Configuration Manager
 * Manages extension configuration, validation, and schema enforcement
 * Part of Task 3.1.3: Create extension configuration system with validation (FR-3.1)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/logger';
import {
  ExtensionConfig,
  ExtensionValidationResult,
  ExtensionDependency,
  ExtensionPriority,
  DomainExtension
} from './extension-types';
import type { ContentDomainType, PlatformArchitectureType } from '../detection/detection-types';

/**
 * Extension configuration schema definition
 */
export interface ExtensionConfigSchema {
  /** Schema version */
  version: string;
  
  /** Required fields */
  required: string[];
  
  /** Field definitions */
  fields: Record<string, ExtensionFieldSchema>;
  
  /** Custom validation rules */
  validations: ExtensionValidationRule[];
  
  /** Configuration templates */
  templates: Record<string, Partial<ExtensionConfig>>;
}

/**
 * Extension field schema definition
 */
export interface ExtensionFieldSchema {
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';
  
  /** Whether field is required */
  required: boolean;
  
  /** Default value */
  default?: any;
  
  /** Field description */
  description: string;
  
  /** Validation constraints */
  constraints?: {
    /** Minimum value (for numbers) */
    min?: number;
    /** Maximum value (for numbers) */
    max?: number;
    /** Minimum length (for strings/arrays) */
    minLength?: number;
    /** Maximum length (for strings/arrays) */
    maxLength?: number;
    /** Pattern (for strings) */
    pattern?: string;
    /** Enum values */
    enum?: any[];
    /** Nested object schema (for objects) */
    properties?: Record<string, ExtensionFieldSchema>;
    /** Array item schema (for arrays) */
    items?: ExtensionFieldSchema;
  };
  
  /** Field metadata */
  metadata?: {
    /** Display name */
    displayName?: string;
    /** Help text */
    helpText?: string;
    /** Category for grouping */
    category?: string;
    /** Whether field is advanced/expert-level */
    advanced?: boolean;
  };
}

/**
 * Extension validation rule
 */
export interface ExtensionValidationRule {
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Validation function */
  validator: (config: ExtensionConfig) => Promise<ExtensionValidationResult>;
  
  /** Rule severity */
  severity: 'error' | 'warning' | 'info';
  
  /** When to apply this rule */
  conditions?: {
    /** Apply only to specific domains */
    domains?: ContentDomainType[];
    /** Apply only to specific architectures */
    architectures?: PlatformArchitectureType[];
    /** Apply only when specific settings are enabled */
    settings?: Record<string, any>;
  };
}

/**
 * Configuration template
 */
export interface ConfigurationTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Target domains */
  domains: ContentDomainType[];
  
  /** Target architectures */
  architectures: PlatformArchitectureType[];
  
  /** Template configuration */
  config: Partial<ExtensionConfig>;
  
  /** Template metadata */
  metadata: {
    /** Template author */
    author: string;
    /** Template version */
    version: string;
    /** Creation date */
    createdAt: number;
    /** Update date */
    updatedAt: number;
    /** Usage count */
    usageCount: number;
    /** Template tags */
    tags: string[];
  };
}

/**
 * Configuration validation context
 */
export interface ConfigValidationContext {
  /** Extension being validated */
  extension?: DomainExtension;
  
  /** Target platform context */
  platform?: {
    domain: ContentDomainType;
    architecture: PlatformArchitectureType;
  };
  
  /** Validation options */
  options: {
    /** Validation level */
    level: 'basic' | 'standard' | 'strict';
    /** Whether to validate dependencies */
    validateDependencies: boolean;
    /** Whether to validate compatibility */
    validateCompatibility: boolean;
    /** Custom validation rules to apply */
    customRules?: string[];
  };
}

/**
 * Extension Configuration Manager
 * Central system for managing extension configurations with validation and schema enforcement
 */
export class ExtensionConfigManager {
  private schemas: Map<string, ExtensionConfigSchema> = new Map();
  private templates: Map<string, ConfigurationTemplate> = new Map();
  private validationRules: Map<string, ExtensionValidationRule> = new Map();
  private configCache: Map<string, ExtensionConfig> = new Map();
  
  constructor() {
    this.initializeDefaultSchema();
    this.initializeDefaultTemplates();
    this.initializeDefaultValidationRules();
  }
  
  /**
   * Validate extension configuration
   * @param config Extension configuration to validate
   * @param context Validation context
   * @returns Validation result
   */
  async validateConfiguration(
    config: ExtensionConfig,
    context: ConfigValidationContext = { options: { level: 'standard', validateDependencies: true, validateCompatibility: true } }
  ): Promise<ExtensionValidationResult> {
    Logger.debug(`🔍 Validating extension configuration: ${config.metadata.description}`);
    
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    try {
      // Schema validation
      const schemaValidation = await this.validateAgainstSchema(config, 'default');
      errors.push(...schemaValidation.errors);
      warnings.push(...schemaValidation.warnings);
      
      // Rule-based validation
      const ruleValidation = await this.validateWithRules(config, context);
      errors.push(...ruleValidation.errors);
      warnings.push(...ruleValidation.warnings);
      
      // Dependency validation
      if (context.options.validateDependencies) {
        const dependencyValidation = await this.validateDependencies(config);
        errors.push(...dependencyValidation.errors);
        warnings.push(...dependencyValidation.warnings);
      }
      
      // Compatibility validation
      if (context.options.validateCompatibility && context.platform) {
        const compatibilityValidation = await this.validateCompatibility(config, context.platform);
        errors.push(...compatibilityValidation.errors);
        warnings.push(...compatibilityValidation.warnings);
      }
      
      // Performance validation
      const performanceValidation = await this.validatePerformanceConstraints(config);
      errors.push(...performanceValidation.errors);
      warnings.push(...performanceValidation.warnings);
      
      const valid = errors.filter(e => e.severity === 'error').length === 0;
      
      Logger.debug(`✅ Configuration validation completed: ${valid ? 'VALID' : 'INVALID'}`);
      
      return {
        valid,
        errors,
        warnings,
        compatibility: {
          domains: {
            compatible: config.metadata.compatibleDomains || [],
            incompatible: [],
            warnings: []
          },
          architectures: {
            compatible: config.metadata.compatibleArchitectures || [],
            incompatible: [],
            warnings: []
          },
          dependencies: {
            resolved: config.dependencies.filter(d => !d.optional),
            unresolved: [],
            conflicts: []
          }
        },
        performance: {
          estimatedMemory: config.constraints.maxMemoryUsage,
          estimatedExecutionTime: config.constraints.maxExecutionTime,
          resourceWarnings: warnings.filter(w => w.includes('performance') || w.includes('resource'))
        },
        security: {
          risks: [],
          permissions: [],
          dataAccess: []
        }
      };
      
    } catch (error: any) {
      Logger.error('❌ Configuration validation failed:', error);
      
      return {
        valid: false,
        errors: [{
          field: 'configuration',
          message: `Validation error: ${error.message}`,
          severity: 'error'
        }],
        warnings: [],
        compatibility: {
          domains: { compatible: [], incompatible: [], warnings: [] },
          architectures: { compatible: [], incompatible: [], warnings: [] },
          dependencies: { resolved: [], unresolved: [], conflicts: [] }
        },
        performance: {
          estimatedMemory: 0,
          estimatedExecutionTime: 0,
          resourceWarnings: []
        },
        security: {
          risks: [{ level: 'high', description: 'Configuration validation failed', mitigation: 'Fix configuration errors' }],
          permissions: [],
          dataAccess: []
        }
      };
    }
  }
  
  /**
   * Generate configuration from template
   * @param templateId Template identifier
   * @param overrides Configuration overrides
   * @returns Generated configuration
   */
  async generateFromTemplate(
    templateId: string,
    overrides: Partial<ExtensionConfig> = {}
  ): Promise<ExtensionConfig | null> {
    Logger.info(`📋 Generating configuration from template: ${templateId}`);
    
    const template = this.templates.get(templateId);
    if (!template) {
      Logger.error(`❌ Template not found: ${templateId}`);
      return null;
    }
    
    try {
      // Merge template with overrides
      const config = this.deepMerge(template.config, overrides) as ExtensionConfig;
      
      // Apply defaults for required fields
      const defaultConfig = this.generateDefaultConfiguration();
      const finalConfig = this.deepMerge(defaultConfig, config) as ExtensionConfig;
      
      // Update template usage count
      template.metadata.usageCount++;
      template.metadata.updatedAt = Date.now();
      
      Logger.info(`✅ Configuration generated from template: ${templateId}`);
      return finalConfig;
      
    } catch (error: any) {
      Logger.error(`❌ Failed to generate configuration from template:`, error);
      return null;
    }
  }
  
  /**
   * Create configuration template
   * @param template Template definition
   * @returns Whether creation was successful
   */
  async createTemplate(template: ConfigurationTemplate): Promise<boolean> {
    try {
      Logger.info(`📋 Creating configuration template: ${template.id}`);
      
      // Validate template configuration
      const validation = await this.validateConfiguration(template.config as ExtensionConfig);
      if (!validation.valid) {
        Logger.error('❌ Template configuration is invalid:', validation.errors);
        return false;
      }
      
      // Store template
      this.templates.set(template.id, {
        ...template,
        metadata: {
          ...template.metadata,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          usageCount: 0
        }
      });
      
      Logger.info(`✅ Template created successfully: ${template.id}`);
      return true;
      
    } catch (error: any) {
      Logger.error('❌ Failed to create template:', error);
      return false;
    }
  }
  
  /**
   * Get available templates
   * @param filters Optional filters
   * @returns Array of matching templates
   */
  getTemplates(filters?: {
    domain?: ContentDomainType;
    architecture?: PlatformArchitectureType;
    tags?: string[];
  }): ConfigurationTemplate[] {
    let templates = Array.from(this.templates.values());
    
    if (filters) {
      if (filters.domain) {
        templates = templates.filter(t => t.domains.includes(filters.domain!));
      }
      
      if (filters.architecture) {
        templates = templates.filter(t => t.architectures.includes(filters.architecture!));
      }
      
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t => 
          filters.tags!.some(tag => t.metadata.tags.includes(tag))
        );
      }
    }
    
    // Sort by usage count and update date
    return templates.sort((a, b) => {
      if (a.metadata.usageCount !== b.metadata.usageCount) {
        return b.metadata.usageCount - a.metadata.usageCount;
      }
      return b.metadata.updatedAt - a.metadata.updatedAt;
    });
  }
  
  /**
   * Update extension configuration
   * @param config Current configuration
   * @param updates Configuration updates
   * @returns Updated configuration
   */
  async updateConfiguration(
    config: ExtensionConfig,
    updates: Partial<ExtensionConfig>
  ): Promise<{ success: boolean; config?: ExtensionConfig; errors: string[] }> {
    try {
      Logger.debug('🔧 Updating extension configuration');
      
      // Merge updates with current configuration
      const updatedConfig = this.deepMerge(config, updates) as ExtensionConfig;
      
      // Validate updated configuration
      const validation = await this.validateConfiguration(updatedConfig);
      if (!validation.valid) {
        const errorMessages = validation.errors
          .filter(e => e.severity === 'error')
          .map(e => e.message);
        
        return {
          success: false,
          errors: errorMessages
        };
      }
      
      Logger.debug('✅ Configuration updated successfully');
      return {
        success: true,
        config: updatedConfig,
        errors: []
      };
      
    } catch (error: any) {
      Logger.error('❌ Failed to update configuration:', error);
      return {
        success: false,
        errors: [error.message]
      };
    }
  }
  
  /**
   * Export configuration to different formats
   * @param config Configuration to export
   * @param format Export format
   * @returns Exported configuration string
   */
  async exportConfiguration(
    config: ExtensionConfig,
    format: 'json' | 'yaml' | 'typescript' = 'json'
  ): Promise<string> {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(config, null, 2);
          
        case 'yaml':
          // TODO: Implement YAML export
          return '# YAML export not implemented yet\n' + JSON.stringify(config, null, 2);
          
        case 'typescript':
          return this.generateTypeScriptConfig(config);
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error: any) {
      Logger.error('❌ Failed to export configuration:', error);
      throw error;
    }
  }
  
  /**
   * Import configuration from different formats
   * @param configString Configuration string
   * @param format Import format
   * @returns Parsed configuration
   */
  async importConfiguration(
    configString: string,
    format: 'json' | 'yaml' | 'typescript' = 'json'
  ): Promise<ExtensionConfig> {
    try {
      let config: ExtensionConfig;
      
      switch (format) {
        case 'json':
          config = JSON.parse(configString);
          break;
          
        case 'yaml':
          // TODO: Implement YAML import
          throw new Error('YAML import not implemented yet');
          
        case 'typescript':
          // TODO: Implement TypeScript import
          throw new Error('TypeScript import not implemented yet');
          
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }
      
      // Validate imported configuration
      const validation = await this.validateConfiguration(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      
      return config;
      
    } catch (error: any) {
      Logger.error('❌ Failed to import configuration:', error);
      throw error;
    }
  }
  
  // Private implementation methods
  
  private initializeDefaultSchema(): void {
    const defaultSchema: ExtensionConfigSchema = {
      version: '1.0.0',
      required: ['settings', 'enabled', 'priority', 'metadata', 'constraints'],
      fields: {
        'settings': {
          type: 'object',
          required: true,
          description: 'Extension-specific settings',
          constraints: {
            properties: {}
          }
        },
        'enabled': {
          type: 'boolean',
          required: true,
          default: true,
          description: 'Whether extension is enabled'
        },
        'priority': {
          type: 'enum',
          required: true,
          default: 'medium',
          description: 'Extension priority level',
          constraints: {
            enum: ['critical', 'high', 'medium', 'low']
          }
        },
        'metadata': {
          type: 'object',
          required: true,
          description: 'Extension metadata',
          constraints: {
            properties: {
              'version': { type: 'string', required: true, description: 'Extension version' },
              'author': { type: 'string', required: true, description: 'Extension author' },
              'description': { type: 'string', required: true, description: 'Extension description' },
              'tags': { type: 'array', required: false, description: 'Extension tags' }
            }
          }
        }
      },
      validations: [],
      templates: {}
    };
    
    this.schemas.set('default', defaultSchema);
  }
  
  private initializeDefaultTemplates(): void {
    // Basic outdoor extension template
    const outdoorTemplate: ConfigurationTemplate = {
      id: 'outdoor-basic',
      name: 'Basic Outdoor Extension',
      description: 'Template for outdoor/adventure domain extensions',
      domains: ['outdoor'],
      architectures: ['individual', 'hybrid'],
      config: {
        settings: {
          gearCategories: ['camping', 'hiking', 'climbing'],
          brandFocus: 'realistic',
          priceRange: { min: 10, max: 500 }
        },
        enabled: true,
        priority: 'high' as ExtensionPriority,
        dependencies: [],
        metadata: {
          version: '1.0.0',
          author: 'SupaSeed',
          description: 'Basic outdoor extension template',
          tags: ['outdoor', 'gear', 'adventure'],
          compatibleDomains: ['outdoor'],
          compatibleArchitectures: ['individual', 'hybrid']
        },
        constraints: {
          maxExecutionTime: 30000,
          maxMemoryUsage: 100,
          maxConcurrency: 3
        },
        debug: {
          enabled: false,
          logLevel: 'info' as const,
          enableProfiling: false,
          saveMetrics: false
        }
      },
      metadata: {
        author: 'SupaSeed Framework',
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        usageCount: 0,
        tags: ['template', 'outdoor', 'basic']
      }
    };
    
    this.templates.set('outdoor-basic', outdoorTemplate);
  }
  
  private initializeDefaultValidationRules(): void {
    // Metadata validation rule
    const metadataRule: ExtensionValidationRule = {
      name: 'metadata-completeness',
      description: 'Validates that required metadata fields are present',
      severity: 'error',
      validator: async (config: ExtensionConfig) => {
        const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
        
        if (!config.metadata.version) {
          errors.push({ field: 'metadata.version', message: 'Version is required', severity: 'error' });
        }
        
        if (!config.metadata.author) {
          errors.push({ field: 'metadata.author', message: 'Author is required', severity: 'error' });
        }
        
        if (!config.metadata.description) {
          errors.push({ field: 'metadata.description', message: 'Description is required', severity: 'error' });
        }
        
        return {
          valid: errors.length === 0,
          errors,
          warnings: [],
          compatibility: {
            domains: { compatible: [], incompatible: [], warnings: [] },
            architectures: { compatible: [], incompatible: [], warnings: [] },
            dependencies: { resolved: [], unresolved: [], conflicts: [] }
          },
          performance: { estimatedMemory: 0, estimatedExecutionTime: 0, resourceWarnings: [] },
          security: { risks: [], permissions: [], dataAccess: [] }
        };
      }
    };
    
    this.validationRules.set('metadata-completeness', metadataRule);
  }
  
  private generateDefaultConfiguration(): ExtensionConfig {
    return {
      settings: {},
      enabled: true,
      priority: 'medium',
      dependencies: [],
      metadata: {
        version: '1.0.0',
        author: '',
        description: '',
        tags: [],
        compatibleDomains: [],
        compatibleArchitectures: []
      },
      constraints: {
        maxExecutionTime: 30000,
        maxMemoryUsage: 100,
        maxConcurrency: 1
      },
      debug: {
        enabled: false,
        logLevel: 'info',
        enableProfiling: false,
        saveMetrics: false
      }
    };
  }
  
  private async validateAgainstSchema(
    config: ExtensionConfig,
    schemaName: string
  ): Promise<{ errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>; warnings: string[] }> {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        errors: [{ field: 'schema', message: `Schema '${schemaName}' not found`, severity: 'error' }],
        warnings: []
      };
    }
    
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const requiredField of schema.required) {
      if (!(requiredField in config)) {
        errors.push({
          field: requiredField,
          message: `Required field '${requiredField}' is missing`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }
  
  private async validateWithRules(
    config: ExtensionConfig,
    context: ConfigValidationContext
  ): Promise<{ errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>; warnings: string[] }> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    for (const [ruleName, rule] of Array.from(this.validationRules)) {
      try {
        const result = await rule.validator(config);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } catch (error: any) {
        errors.push({
          field: 'validation',
          message: `Rule '${ruleName}' failed: ${error.message}`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }
  
  private async validateDependencies(
    config: ExtensionConfig
  ): Promise<{ errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>; warnings: string[] }> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    // Validate dependency format
    for (let i = 0; i < config.dependencies.length; i++) {
      const dependency = config.dependencies[i];
      
      if (!dependency.extensionName) {
        errors.push({
          field: `dependencies[${i}].extensionName`,
          message: 'Dependency extension name is required',
          severity: 'error'
        });
      }
      
      if (!dependency.reason) {
        warnings.push(`Dependency ${dependency.extensionName} should include a reason`);
      }
    }
    
    return { errors, warnings };
  }
  
  private async validateCompatibility(
    config: ExtensionConfig,
    platform: { domain: ContentDomainType; architecture: PlatformArchitectureType }
  ): Promise<{ errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>; warnings: string[] }> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    // Check domain compatibility
    if (config.metadata.compatibleDomains && config.metadata.compatibleDomains.length > 0) {
      if (!config.metadata.compatibleDomains.includes(platform.domain)) {
        errors.push({
          field: 'metadata.compatibleDomains',
          message: `Extension is not compatible with domain '${platform.domain}'`,
          severity: 'error'
        });
      }
    }
    
    // Check architecture compatibility
    if (config.metadata.compatibleArchitectures && config.metadata.compatibleArchitectures.length > 0) {
      if (!config.metadata.compatibleArchitectures.includes(platform.architecture)) {
        errors.push({
          field: 'metadata.compatibleArchitectures',
          message: `Extension is not compatible with architecture '${platform.architecture}'`,
          severity: 'error'
        });
      }
    }
    
    return { errors, warnings };
  }
  
  private async validatePerformanceConstraints(
    config: ExtensionConfig
  ): Promise<{ errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }>; warnings: string[] }> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];
    
    // Validate constraint values
    if (config.constraints.maxExecutionTime <= 0) {
      errors.push({
        field: 'constraints.maxExecutionTime',
        message: 'Maximum execution time must be positive',
        severity: 'error'
      });
    }
    
    if (config.constraints.maxMemoryUsage <= 0) {
      errors.push({
        field: 'constraints.maxMemoryUsage',
        message: 'Maximum memory usage must be positive',
        severity: 'error'
      });
    }
    
    // Performance warnings
    if (config.constraints.maxExecutionTime > 60000) {
      warnings.push('Long execution times may impact seeding performance');
    }
    
    if (config.constraints.maxMemoryUsage > 500) {
      warnings.push('High memory usage may cause system instability');
    }
    
    return { errors, warnings };
  }
  
  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }
    
    if (typeof source !== 'object' || typeof target !== 'object') {
      return source;
    }
    
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
  
  private generateTypeScriptConfig(config: ExtensionConfig): string {
    return `// Generated Extension Configuration
import type { ExtensionConfig } from './extension-types';

export const extensionConfig: ExtensionConfig = ${JSON.stringify(config, null, 2)};

export default extensionConfig;`;
  }
}