/**
 * Configuration Validation System
 * Phase 6, Checkpoint F1 - Comprehensive validation for all configuration inputs
 */

import { Logger } from './logger';
import { ErrorHandler, SupaSeedError } from './error-handler';

export interface ValidationRule {
  name: string;
  description: string;
  validator: (value: any, context?: ValidationContext) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  category: 'security' | 'performance' | 'compatibility' | 'syntax' | 'logic';
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  suggestion?: string;
  details?: Record<string, any>;
}

export interface ValidationContext {
  configPath: string[];
  fullConfig: Record<string, any>;
  environment: 'development' | 'production' | 'test';
  metadata?: Record<string, any>;
}

export interface ConfigValidationReport {
  valid: boolean;
  errors: Array<ValidationError>;
  warnings: Array<ValidationWarning>;
  info: Array<ValidationInfo>;
  summary: {
    totalRules: number;
    passed: number;
    failed: number;
    warnings: number;
    criticalIssues: string[];
    recommendations: string[];
  };
}

export interface ValidationError {
  path: string;
  rule: string;
  message: string;
  severity: 'error';
  category: string;
  suggestion?: string;
}

export interface ValidationWarning {
  path: string;
  rule: string;
  message: string;
  severity: 'warning';
  category: string;
  suggestion?: string;
}

export interface ValidationInfo {
  path: string;
  rule: string;
  message: string;
  severity: 'info';
  category: string;
}

export class ConfigValidator {
  private static validationRules: Map<string, ValidationRule[]> = new Map();
  private static globalRules: ValidationRule[] = [];

  /**
   * Initialize configuration validator with built-in rules
   */
  static initialize(): void {
    this.registerBuiltInRules();
    Logger.info('✅ Configuration validator initialized');
  }

  /**
   * Register a validation rule for a specific config path
   */
  static registerRule(configPath: string, rule: ValidationRule): void {
    if (!this.validationRules.has(configPath)) {
      this.validationRules.set(configPath, []);
    }
    
    this.validationRules.get(configPath)!.push(rule);
    Logger.debug(`📝 Registered validation rule: ${rule.name} for ${configPath}`);
  }

  /**
   * Register a global validation rule
   */
  static registerGlobalRule(rule: ValidationRule): void {
    this.globalRules.push(rule);
    Logger.debug(`🌐 Registered global validation rule: ${rule.name}`);
  }

  /**
   * Validate a configuration object
   */
  static validateConfig(
    config: Record<string, any>,
    environment: 'development' | 'production' | 'test' = 'development'
  ): ConfigValidationReport {
    const report: ConfigValidationReport = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
      summary: {
        totalRules: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        criticalIssues: [],
        recommendations: []
      }
    };

    Logger.info('🔍 Starting configuration validation');

    try {
      // Validate with global rules first
      this.validateWithRules(config, [], this.globalRules, environment, report);

      // Validate specific paths
      this.validateObjectRecursively(config, [], config, environment, report);

      // Generate summary
      this.generateValidationSummary(report);

      Logger.info('✅ Configuration validation completed:', {
        valid: report.valid,
        errors: report.errors.length,
        warnings: report.warnings.length,
        rulesChecked: report.summary.totalRules
      });

    } catch (error) {
      Logger.error('🚨 Configuration validation failed:', error);
      throw ErrorHandler.createValidationError(
        `Configuration validation process failed: ${(error as Error).message}`,
        { component: 'config_validator', operation: 'validateConfig' }
      );
    }

    return report;
  }

  /**
   * Validate specific configuration value
   */
  static validateValue(
    value: any,
    configPath: string,
    context?: Partial<ValidationContext>
  ): ValidationResult {
    const rules = this.validationRules.get(configPath) || [];
    
    if (rules.length === 0) {
      return {
        valid: true,
        message: 'No validation rules defined for this path'
      };
    }

    const fullContext: ValidationContext = {
      configPath: configPath.split('.'),
      fullConfig: context?.fullConfig || {},
      environment: context?.environment || 'development',
      metadata: context?.metadata
    };

    // Run first applicable rule
    for (const rule of rules) {
      const result = rule.validator(value, fullContext);
      if (!result.valid) {
        return result;
      }
    }

    return {
      valid: true,
      message: 'All validation rules passed'
    };
  }

  /**
   * Get validation rules for a path
   */
  static getRulesForPath(configPath: string): ValidationRule[] {
    return this.validationRules.get(configPath) || [];
  }

  /**
   * Validate configuration schema structure
   */
  static validateSchema(
    config: Record<string, any>,
    expectedSchema: Record<string, any>
  ): ValidationResult {
    const missingFields: string[] = [];
    const extraFields: string[] = [];
    const typeErrors: Array<{ field: string; expected: string; actual: string }> = [];

    // Check for missing required fields
    this.checkRequiredFields(config, expectedSchema, '', missingFields);

    // Check for extra fields (only if strict mode)
    if (expectedSchema._strict) {
      this.checkExtraFields(config, expectedSchema, '', extraFields);
    }

    // Check field types
    this.checkFieldTypes(config, expectedSchema, '', typeErrors);

    const hasErrors = missingFields.length > 0 || typeErrors.length > 0;
    const hasWarnings = extraFields.length > 0;

    let message = 'Schema validation passed';
    if (hasErrors) {
      message = `Schema validation failed: ${missingFields.length} missing fields, ${typeErrors.length} type errors`;
    } else if (hasWarnings) {
      message = `Schema validation passed with warnings: ${extraFields.length} extra fields`;
    }

    return {
      valid: !hasErrors,
      message,
      details: {
        missingFields,
        extraFields,
        typeErrors
      }
    };
  }

  /**
   * Register built-in validation rules
   */
  private static registerBuiltInRules(): void {
    // Database configuration validation
    this.registerRule('database.url', {
      name: 'database_url_format',
      description: 'Validate Supabase database URL format',
      validator: (value: string) => {
        if (!value || typeof value !== 'string') {
          return {
            valid: false,
            message: 'Database URL is required and must be a string',
            suggestion: 'Provide a valid Supabase URL (https://xxx.supabase.co)'
          };
        }

        if (!value.includes('supabase.co') && !value.includes('localhost')) {
          return {
            valid: false,
            message: 'Database URL should be a valid Supabase URL',
            suggestion: 'Use format: https://xxx.supabase.co or localhost for development'
          };
        }

        return { valid: true, message: 'Database URL format is valid' };
      },
      severity: 'error',
      category: 'compatibility'
    });

    this.registerRule('database.key', {
      name: 'database_key_security',
      description: 'Validate Supabase API key security',
      validator: (value: string, context) => {
        if (!value || typeof value !== 'string') {
          return {
            valid: false,
            message: 'Database API key is required',
            suggestion: 'Provide a valid Supabase API key'
          };
        }

        if (value.length < 20) {
          return {
            valid: false,
            message: 'API key appears to be too short',
            suggestion: 'Ensure you are using the correct Supabase API key'
          };
        }

        if (context?.environment === 'production' && value.includes('anon')) {
          return {
            valid: false,
            message: 'Using anonymous key in production is not recommended',
            suggestion: 'Use service role key for production seeding'
          };
        }

        return { valid: true, message: 'API key format is valid' };
      },
      severity: 'error',
      category: 'security'
    });

    // AI configuration validation
    this.registerRule('ai.ollamaUrl', {
      name: 'ollama_url_format',
      description: 'Validate Ollama service URL',
      validator: (value: string) => {
        if (!value) {
          return { valid: true, message: 'Ollama URL is optional' };
        }

        if (typeof value !== 'string') {
          return {
            valid: false,
            message: 'Ollama URL must be a string'
          };
        }

        if (!value.match(/^https?:\/\/.+/)) {
          return {
            valid: false,
            message: 'Ollama URL must be a valid HTTP/HTTPS URL',
            suggestion: 'Use format: http://localhost:11434'
          };
        }

        return { valid: true, message: 'Ollama URL format is valid' };
      },
      severity: 'warning',
      category: 'compatibility'
    });

    // Performance configuration validation
    this.registerRule('performance.batchSize', {
      name: 'batch_size_optimization',
      description: 'Validate batch size for performance',
      validator: (value: number) => {
        if (typeof value !== 'number' || value <= 0) {
          return {
            valid: false,
            message: 'Batch size must be a positive number',
            suggestion: 'Use a value between 10 and 1000'
          };
        }

        if (value > 1000) {
          return {
            valid: false,
            message: 'Batch size too large, may cause memory issues',
            suggestion: 'Consider using a batch size of 100-500 for optimal performance'
          };
        }

        if (value < 10) {
          return {
            valid: false,
            message: 'Batch size too small, may be inefficient',
            suggestion: 'Consider using a batch size of at least 10'
          };
        }

        return { valid: true, message: 'Batch size is optimal' };
      },
      severity: 'warning',
      category: 'performance'
    });

    // Global configuration rules
    this.registerGlobalRule({
      name: 'environment_consistency',
      description: 'Validate environment-specific configurations',
      validator: (config: Record<string, any>, context) => {
        const env = context?.environment;
        
        if (env === 'production') {
          // Production-specific validations
          if (!config.database?.url?.includes('https://')) {
            return {
              valid: false,
              message: 'Production environment must use HTTPS database URL',
              suggestion: 'Ensure database URL uses HTTPS in production'
            };
          }

          if (config.debug === true) {
            return {
              valid: false,
              message: 'Debug mode should be disabled in production',
              suggestion: 'Set debug: false for production environment'
            };
          }
        }

        if (env === 'development') {
          // Development-specific validations
          if (config.ai?.enabled && !config.ai?.ollamaUrl) {
            return {
              valid: false,
              message: 'AI features enabled but no Ollama URL configured',
              suggestion: 'Configure ai.ollamaUrl or disable AI features'
            };
          }
        }

        return { valid: true, message: 'Environment configuration is consistent' };
      },
      severity: 'error',
      category: 'logic'
    });

    this.registerGlobalRule({
      name: 'required_fields_check',
      description: 'Validate presence of required configuration fields',
      validator: (config: Record<string, any>) => {
        const requiredFields = ['database.url', 'database.key'];
        const missingFields: string[] = [];

        for (const field of requiredFields) {
          const value = this.getNestedValue(config, field);
          if (value === undefined || value === null || value === '') {
            missingFields.push(field);
          }
        }

        if (missingFields.length > 0) {
          return {
            valid: false,
            message: `Missing required configuration fields: ${missingFields.join(', ')}`,
            suggestion: 'Provide all required configuration values'
          };
        }

        return { valid: true, message: 'All required fields are present' };
      },
      severity: 'error',
      category: 'syntax'
    });
  }

  /**
   * Validate object recursively
   */
  private static validateObjectRecursively(
    obj: any,
    currentPath: string[],
    fullConfig: Record<string, any>,
    environment: 'development' | 'production' | 'test',
    report: ConfigValidationReport
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const path = [...currentPath, key];
      const pathString = path.join('.');
      
      // Get rules for this path
      const rules = this.validationRules.get(pathString) || [];
      
      if (rules.length > 0) {
        this.validateWithRules(value, path, rules, environment, report, fullConfig);
      }

      // Recurse for nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.validateObjectRecursively(value, path, fullConfig, environment, report);
      }
    }
  }

  /**
   * Validate with specific rules
   */
  private static validateWithRules(
    value: any,
    path: string[],
    rules: ValidationRule[],
    environment: 'development' | 'production' | 'test',
    report: ConfigValidationReport,
    fullConfig?: Record<string, any>
  ): void {
    const context: ValidationContext = {
      configPath: path,
      fullConfig: fullConfig || {},
      environment
    };

    for (const rule of rules) {
      report.summary.totalRules++;
      
      try {
        const result = rule.validator(value, context);
        
        if (result.valid) {
          report.summary.passed++;
        } else {
          const pathString = path.join('.');
          
          switch (rule.severity) {
            case 'error':
              report.errors.push({
                path: pathString,
                rule: rule.name,
                message: result.message,
                severity: 'error',
                category: rule.category,
                suggestion: result.suggestion
              });
              report.summary.failed++;
              report.valid = false;
              break;
              
            case 'warning':
              report.warnings.push({
                path: pathString,
                rule: rule.name,
                message: result.message,
                severity: 'warning',
                category: rule.category,
                suggestion: result.suggestion
              });
              report.summary.warnings++;
              break;
              
            case 'info':
              report.info.push({
                path: pathString,
                rule: rule.name,
                message: result.message,
                severity: 'info',
                category: rule.category
              });
              break;
          }
        }
      } catch (error) {
        Logger.warn(`⚠️ Validation rule failed: ${rule.name}`, error);
        report.summary.failed++;
      }
    }
  }

  /**
   * Generate validation summary
   */
  private static generateValidationSummary(report: ConfigValidationReport): void {
    // Identify critical issues
    report.summary.criticalIssues = report.errors
      .filter(e => e.category === 'security' || e.category === 'syntax')
      .map(e => `${e.path}: ${e.message}`);

    // Generate recommendations
    const recommendations = new Set<string>();
    
    for (const error of report.errors) {
      if (error.suggestion) {
        recommendations.add(error.suggestion);
      }
    }
    
    for (const warning of report.warnings) {
      if (warning.suggestion) {
        recommendations.add(warning.suggestion);
      }
    }

    report.summary.recommendations = Array.from(recommendations);
  }

  /**
   * Helper methods for schema validation
   */
  private static checkRequiredFields(
    config: any,
    schema: any,
    prefix: string,
    missingFields: string[]
  ): void {
    for (const [key, value] of Object.entries(schema)) {
      if (key.startsWith('_')) continue; // Skip meta fields
      
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        const schemaField = value as any;
        if (schemaField.required && (config[key] === undefined || config[key] === null)) {
          missingFields.push(fieldPath);
        } else if (typeof config[key] === 'object') {
          this.checkRequiredFields(config[key], value, fieldPath, missingFields);
        }
      }
    }
  }

  private static checkExtraFields(
    config: any,
    schema: any,
    prefix: string,
    extraFields: string[]
  ): void {
    for (const key of Object.keys(config)) {
      if (!schema.hasOwnProperty(key)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        extraFields.push(fieldPath);
      }
    }
  }

  private static checkFieldTypes(
    config: any,
    schema: any,
    prefix: string,
    typeErrors: Array<{ field: string; expected: string; actual: string }>
  ): void {
    for (const [key, schemaValue] of Object.entries(schema)) {
      if (key.startsWith('_')) continue;
      
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const configValue = config[key];
      
      if (configValue !== undefined && typeof schemaValue === 'object' && schemaValue !== null) {
        const expectedType = (schemaValue as any).type;
        if (expectedType && typeof configValue !== expectedType) {
          typeErrors.push({
            field: fieldPath,
            expected: expectedType,
            actual: typeof configValue
          });
        }
      }
    }
  }

  private static getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }
}

export default ConfigValidator;