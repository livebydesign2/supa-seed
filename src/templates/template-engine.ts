/**
 * Template Engine for Dynamic Configuration Generation
 * Phase 4, Checkpoint D3 - Template system with variable interpolation and validation
 */

import { SchemaInfo } from '../schema-adapter';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { HelperDelegate } from 'handlebars';
import * as yaml from 'js-yaml';

export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  category: 'seeder' | 'schema' | 'migration' | 'full-config' | 'custom';
  tags: string[];
  compatibility: {
    supaSeedVersion: string;
    makerKitVersions?: string[];
    supabaseVersions?: string[];
  };
  variables: TemplateVariable[];
  files: TemplateFile[];
  hooks?: TemplateHook[];
  metadata: {
    created: Date;
    updated: Date;
    downloads?: number;
    rating?: number;
    featured?: boolean;
  };
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum' | 'schema';
  description: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    enum?: any[];
    customValidator?: string; // Function name to call
  };
  prompt?: {
    message: string;
    hint?: string;
    choices?: Array<{ value: any; label: string }>;
  };
  transform?: string; // Transformation function name
  dependencies?: string[]; // Other variable names this depends on
}

export interface TemplateFile {
  path: string;
  content: string;
  type: 'handlebars' | 'liquid' | 'ejs' | 'plain';
  encoding?: 'utf8' | 'base64';
  permissions?: string;
  condition?: string; // Conditional expression for file generation
}

export interface TemplateHook {
  name: 'pre-render' | 'post-render' | 'pre-write' | 'post-write' | 'validation';
  script: string;
  description?: string;
  failOnError?: boolean;
}

export interface RenderContext {
  variables: Record<string, any>;
  schema?: SchemaInfo;
  helpers: Record<string, Function>;
  partials: Record<string, string>;
  metadata: {
    timestamp: Date;
    environment: string;
    version: string;
  };
}

export interface RenderResult {
  success: boolean;
  files: GeneratedFile[];
  errors: RenderError[];
  warnings: RenderWarning[];
  metadata: {
    templateId: string;
    renderTime: number;
    variablesUsed: string[];
    filesGenerated: number;
  };
}

export interface GeneratedFile {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  permissions?: string;
  metadata: {
    templateFile: string;
    variablesUsed: string[];
    size: number;
  };
}

export interface RenderError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  variable?: string;
  context?: any;
}

export interface RenderWarning {
  code: string;
  message: string;
  file?: string;
  suggestion?: string;
}

export interface TemplateEngineOptions {
  templateDirectory?: string;
  cacheTemplates?: boolean;
  strictMode?: boolean;
  enableCustomHelpers?: boolean;
  enableHooks?: boolean;
  sandboxHooks?: boolean;
  maxRenderTime?: number; // ms
}

export class TemplateEngine {
  private templates: Map<string, Template> = new Map();
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private customHelpers: Map<string, Function> = new Map();
  private options: TemplateEngineOptions;
  private handlebars: typeof Handlebars;

  constructor(options?: TemplateEngineOptions) {
    this.options = {
      templateDirectory: path.join(process.cwd(), 'templates'),
      cacheTemplates: true,
      strictMode: false,
      enableCustomHelpers: true,
      enableHooks: true,
      sandboxHooks: true,
      maxRenderTime: 30000,
      ...options
    };

    // Initialize Handlebars instance
    this.handlebars = Handlebars.create();
    this.registerBuiltInHelpers();
    this.loadTemplates();
  }

  /**
   * Render a template with given variables
   */
  async renderTemplate(
    templateId: string,
    variables: Record<string, any>,
    schema?: SchemaInfo
  ): Promise<RenderResult> {
    const startTime = Date.now();
    Logger.info(`🎨 Rendering template: ${templateId}`);

    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        files: [],
        errors: [{
          code: 'TEMPLATE_NOT_FOUND',
          message: `Template not found: ${templateId}`
        }],
        warnings: [],
        metadata: {
          templateId,
          renderTime: Date.now() - startTime,
          variablesUsed: [],
          filesGenerated: 0
        }
      };
    }

    try {
      // Validate variables
      const validationResult = await this.validateVariables(template, variables);
      if (!validationResult.isValid) {
        return {
          success: false,
          files: [],
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          metadata: {
            templateId,
            renderTime: Date.now() - startTime,
            variablesUsed: [],
            filesGenerated: 0
          }
        };
      }

      // Apply variable transformations
      const transformedVariables = await this.transformVariables(template, variables);

      // Create render context
      const context: RenderContext = {
        variables: transformedVariables,
        schema,
        helpers: Object.fromEntries(this.customHelpers),
        partials: {},
        metadata: {
          timestamp: new Date(),
          environment: process.env.NODE_ENV || 'development',
          version: template.version
        }
      };

      // Execute pre-render hooks
      if (this.options.enableHooks && template.hooks) {
        await this.executeHooks(template.hooks.filter(h => h.name === 'pre-render'), context);
      }

      // Render all template files
      const files: GeneratedFile[] = [];
      const errors: RenderError[] = [];
      const warnings: RenderWarning[] = [];
      const variablesUsed = new Set<string>();

      for (const templateFile of template.files) {
        // Check condition
        if (templateFile.condition && !this.evaluateCondition(templateFile.condition, context)) {
          Logger.debug(`Skipping file ${templateFile.path} due to condition: ${templateFile.condition}`);
          continue;
        }

        try {
          const rendered = await this.renderFile(templateFile, context);
          files.push(rendered);
          
          // Track variables used
          rendered.metadata.variablesUsed.forEach(v => variablesUsed.add(v));

        } catch (error: any) {
          errors.push({
            code: 'RENDER_ERROR',
            message: `Failed to render ${templateFile.path}: ${error.message}`,
            file: templateFile.path,
            context: { error: error.stack }
          });
        }
      }

      // Execute post-render hooks
      if (this.options.enableHooks && template.hooks) {
        await this.executeHooks(template.hooks.filter(h => h.name === 'post-render'), context);
      }

      const renderTime = Date.now() - startTime;
      if (renderTime > this.options.maxRenderTime!) {
        warnings.push({
          code: 'SLOW_RENDER',
          message: `Template rendering took ${renderTime}ms (max: ${this.options.maxRenderTime}ms)`,
          suggestion: 'Consider optimizing template complexity'
        });
      }

      Logger.info(`🎨 Template rendered: ${files.length} files generated in ${renderTime}ms`);

      return {
        success: errors.length === 0,
        files,
        errors,
        warnings,
        metadata: {
          templateId,
          renderTime,
          variablesUsed: Array.from(variablesUsed),
          filesGenerated: files.length
        }
      };

    } catch (error: any) {
      Logger.error(`Template rendering failed: ${error.message}`);
      return {
        success: false,
        files: [],
        errors: [{
          code: 'UNEXPECTED_ERROR',
          message: `Unexpected error: ${error.message}`,
          context: { error: error.stack }
        }],
        warnings: [],
        metadata: {
          templateId,
          renderTime: Date.now() - startTime,
          variablesUsed: [],
          filesGenerated: 0
        }
      };
    }
  }

  /**
   * Load a template from file or string
   */
  async loadTemplate(source: string | Template, isPath: boolean = true): Promise<string> {
    let template: Template;

    if (typeof source === 'string') {
      if (isPath) {
        const content = await fs.promises.readFile(source, 'utf8');
        template = source.endsWith('.json') 
          ? JSON.parse(content)
          : yaml.load(content) as Template;
      } else {
        template = JSON.parse(source);
      }
    } else {
      template = source;
    }

    // Validate template structure
    this.validateTemplateStructure(template);

    // Compile template files if using Handlebars
    if (this.options.cacheTemplates) {
      for (const file of template.files) {
        if (file.type === 'handlebars') {
          const compiled = this.handlebars.compile(file.content, {
            strict: this.options.strictMode
          });
          this.compiledTemplates.set(`${template.id}:${file.path}`, compiled);
        }
      }
    }

    this.templates.set(template.id, template);
    Logger.info(`📄 Loaded template: ${template.name} (${template.id})`);

    return template.id;
  }

  /**
   * List all available templates
   */
  listTemplates(filter?: {
    category?: Template['category'];
    tags?: string[];
    compatibility?: {
      supaSeedVersion?: string;
      makerKitVersion?: string;
    };
  }): Template[] {
    let templates = Array.from(this.templates.values());

    if (filter) {
      if (filter.category) {
        templates = templates.filter(t => t.category === filter.category);
      }
      if (filter.tags && filter.tags.length > 0) {
        templates = templates.filter(t => 
          filter.tags!.some(tag => t.tags.includes(tag))
        );
      }
      if (filter.compatibility) {
        templates = templates.filter(t => {
          if (filter.compatibility!.supaSeedVersion) {
            // Simple version check - in practice would use semver
            if (t.compatibility.supaSeedVersion !== filter.compatibility!.supaSeedVersion) {
              return false;
            }
          }
          return true;
        });
      }
    }

    return templates.sort((a, b) => {
      // Sort by featured, then by downloads/rating
      if (a.metadata.featured !== b.metadata.featured) {
        return a.metadata.featured ? -1 : 1;
      }
      const aScore = (a.metadata.downloads || 0) + (a.metadata.rating || 0) * 100;
      const bScore = (b.metadata.downloads || 0) + (b.metadata.rating || 0) * 100;
      return bScore - aScore;
    });
  }

  /**
   * Get a specific template
   */
  getTemplate(templateId: string): Template | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Register a custom helper function
   */
  registerHelper(name: string, helper: HelperDelegate): void {
    if (!this.options.enableCustomHelpers) {
      throw new Error('Custom helpers are disabled');
    }

    this.customHelpers.set(name, helper as Function);
    this.handlebars.registerHelper(name, helper);
    Logger.debug(`Registered helper: ${name}`);
  }

  /**
   * Remove a template
   */
  removeTemplate(templateId: string): boolean {
    // Remove compiled templates
    for (const [key] of this.compiledTemplates) {
      if (key.startsWith(`${templateId}:`)) {
        this.compiledTemplates.delete(key);
      }
    }

    return this.templates.delete(templateId);
  }

  /**
   * Clear all templates and caches
   */
  clearTemplates(): void {
    this.templates.clear();
    this.compiledTemplates.clear();
  }

  /**
   * Private: Load templates from directory
   */
  private async loadTemplates(): Promise<void> {
    if (!fs.existsSync(this.options.templateDirectory!)) {
      Logger.debug(`Template directory does not exist: ${this.options.templateDirectory}`);
      return;
    }

    try {
      const files = await fs.promises.readdir(this.options.templateDirectory!);
      const templateFiles = files.filter(f => 
        f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml')
      );

      for (const file of templateFiles) {
        const filePath = path.join(this.options.templateDirectory!, file);
        try {
          await this.loadTemplate(filePath);
        } catch (error: any) {
          Logger.warn(`Failed to load template ${file}: ${error.message}`);
        }
      }

      Logger.info(`📚 Loaded ${this.templates.size} templates from ${this.options.templateDirectory}`);
    } catch (error: any) {
      Logger.error(`Failed to load templates: ${error.message}`);
    }
  }

  /**
   * Private: Register built-in Handlebars helpers
   */
  private registerBuiltInHelpers(): void {
    // String helpers
    this.handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    this.handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    this.handlebars.registerHelper('capitalize', (str: string) => 
      str?.charAt(0).toUpperCase() + str?.slice(1).toLowerCase()
    );
    this.handlebars.registerHelper('camelCase', (str: string) => 
      str?.replace(/[-_\s]+(.)?/g, (_, c) => c?.toUpperCase() || '')
    );
    this.handlebars.registerHelper('snakeCase', (str: string) => 
      str?.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '')
    );
    this.handlebars.registerHelper('kebabCase', (str: string) => 
      str?.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`).replace(/^-/, '')
    );

    // Array helpers
    this.handlebars.registerHelper('join', (arr: any[], separator: string) => 
      Array.isArray(arr) ? arr.join(separator || ', ') : ''
    );
    this.handlebars.registerHelper('first', (arr: any[]) => 
      Array.isArray(arr) ? arr[0] : undefined
    );
    this.handlebars.registerHelper('last', (arr: any[]) => 
      Array.isArray(arr) ? arr[arr.length - 1] : undefined
    );

    // Logic helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    this.handlebars.registerHelper('and', (...args: any[]) => {
      const options = args.pop();
      return args.every(Boolean);
    });
    this.handlebars.registerHelper('or', (...args: any[]) => {
      const options = args.pop();
      return args.some(Boolean);
    });

    // Schema helpers (updated for new SchemaInfo structure)
    this.handlebars.registerHelper('hasTable', (tableName: string, options: any) => {
      const schema = options.data.root.schema as SchemaInfo | undefined;
      return schema?.customTables.includes(tableName) || false;
    });
    this.handlebars.registerHelper('getTableNames', (options: any) => {
      const schema = options.data.root.schema as SchemaInfo | undefined;
      return schema?.customTables || [];
    });

    // Date helpers
    this.handlebars.registerHelper('now', () => new Date().toISOString());
    this.handlebars.registerHelper('date', (date: any, format?: string) => {
      const d = date ? new Date(date) : new Date();
      return format === 'iso' ? d.toISOString() : d.toLocaleDateString();
    });

    // JSON helper
    this.handlebars.registerHelper('json', (obj: any, indent?: number) => 
      JSON.stringify(obj, null, indent || 2)
    );
  }

  /**
   * Private: Validate template structure
   */
  private validateTemplateStructure(template: Template): void {
    const errors: string[] = [];

    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.version) errors.push('Template version is required');
    if (!template.category) errors.push('Template category is required');
    if (!Array.isArray(template.variables)) errors.push('Template variables must be an array');
    if (!Array.isArray(template.files)) errors.push('Template files must be an array');
    if (template.files.length === 0) errors.push('Template must have at least one file');

    // Validate variables
    const variableNames = new Set<string>();
    for (const variable of template.variables) {
      if (!variable.name) errors.push('Variable name is required');
      if (variableNames.has(variable.name)) {
        errors.push(`Duplicate variable name: ${variable.name}`);
      }
      variableNames.add(variable.name);

      if (!variable.type) errors.push(`Variable ${variable.name} must have a type`);
      if (variable.dependencies) {
        for (const dep of variable.dependencies) {
          if (!variableNames.has(dep) && !template.variables.some(v => v.name === dep)) {
            errors.push(`Variable ${variable.name} depends on unknown variable: ${dep}`);
          }
        }
      }
    }

    // Validate files
    for (const file of template.files) {
      if (!file.path) errors.push('File path is required');
      if (!file.content) errors.push(`File ${file.path} must have content`);
      if (!file.type) errors.push(`File ${file.path} must have a type`);
    }

    if (errors.length > 0) {
      throw new Error(`Invalid template structure:\n${errors.join('\n')}`);
    }
  }

  /**
   * Private: Validate variables against template requirements
   */
  private async validateVariables(
    template: Template,
    variables: Record<string, any>
  ): Promise<{
    isValid: boolean;
    errors: RenderError[];
    warnings: RenderWarning[];
  }> {
    const errors: RenderError[] = [];
    const warnings: RenderWarning[] = [];

    for (const varDef of template.variables) {
      const value = variables[varDef.name];

      // Check required
      if (varDef.required && (value === undefined || value === null)) {
        errors.push({
          code: 'MISSING_REQUIRED_VARIABLE',
          message: `Required variable missing: ${varDef.name}`,
          variable: varDef.name
        });
        continue;
      }

      // Skip validation if not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== varDef.type && varDef.type !== 'schema') {
        errors.push({
          code: 'INVALID_VARIABLE_TYPE',
          message: `Variable ${varDef.name} must be of type ${varDef.type}, got ${actualType}`,
          variable: varDef.name,
          context: { expected: varDef.type, actual: actualType }
        });
        continue;
      }

      // Additional validation rules
      if (varDef.validation) {
        const validation = varDef.validation;

        // Pattern validation
        if (validation.pattern && typeof value === 'string') {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              code: 'PATTERN_MISMATCH',
              message: `Variable ${varDef.name} does not match pattern: ${validation.pattern}`,
              variable: varDef.name
            });
          }
        }

        // Numeric range validation
        if (typeof value === 'number') {
          if (validation.min !== undefined && value < validation.min) {
            errors.push({
              code: 'VALUE_TOO_SMALL',
              message: `Variable ${varDef.name} must be at least ${validation.min}`,
              variable: varDef.name
            });
          }
          if (validation.max !== undefined && value > validation.max) {
            errors.push({
              code: 'VALUE_TOO_LARGE',
              message: `Variable ${varDef.name} must be at most ${validation.max}`,
              variable: varDef.name
            });
          }
        }

        // String length validation
        if (typeof value === 'string') {
          if (validation.minLength !== undefined && value.length < validation.minLength) {
            errors.push({
              code: 'STRING_TOO_SHORT',
              message: `Variable ${varDef.name} must be at least ${validation.minLength} characters`,
              variable: varDef.name
            });
          }
          if (validation.maxLength !== undefined && value.length > validation.maxLength) {
            errors.push({
              code: 'STRING_TOO_LONG',
              message: `Variable ${varDef.name} must be at most ${validation.maxLength} characters`,
              variable: varDef.name
            });
          }
        }

        // Enum validation
        if (validation.enum && !validation.enum.includes(value)) {
          errors.push({
            code: 'INVALID_ENUM_VALUE',
            message: `Variable ${varDef.name} must be one of: ${validation.enum.join(', ')}`,
            variable: varDef.name
          });
        }
      }
    }

    // Check for unknown variables
    for (const varName of Object.keys(variables)) {
      if (!template.variables.some(v => v.name === varName)) {
        warnings.push({
          code: 'UNKNOWN_VARIABLE',
          message: `Unknown variable provided: ${varName}`,
          suggestion: 'This variable will be ignored'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Private: Transform variables according to template rules
   */
  private async transformVariables(
    template: Template,
    variables: Record<string, any>
  ): Promise<Record<string, any>> {
    const transformed = { ...variables };

    // Apply defaults for missing variables
    for (const varDef of template.variables) {
      if (transformed[varDef.name] === undefined && varDef.defaultValue !== undefined) {
        transformed[varDef.name] = varDef.defaultValue;
      }
    }

    // Apply transformations
    for (const varDef of template.variables) {
      if (varDef.transform && transformed[varDef.name] !== undefined) {
        const transformFn = this.getTransformFunction(varDef.transform);
        if (transformFn) {
          try {
            transformed[varDef.name] = await transformFn(transformed[varDef.name], transformed);
          } catch (error: any) {
            Logger.warn(`Transform failed for ${varDef.name}: ${error.message}`);
          }
        }
      }
    }

    return transformed;
  }

  /**
   * Private: Get transformation function
   */
  private getTransformFunction(name: string): Function | undefined {
    // Built-in transformations
    const transforms: Record<string, Function> = {
      'toLowerCase': (value: string) => value?.toLowerCase(),
      'toUpperCase': (value: string) => value?.toUpperCase(),
      'trim': (value: string) => value?.trim(),
      'parseInt': (value: any) => parseInt(value, 10),
      'parseFloat': (value: any) => parseFloat(value),
      'toBoolean': (value: any) => Boolean(value),
      'toArray': (value: any) => Array.isArray(value) ? value : [value],
      'unique': (value: any[]) => [...new Set(value)],
      'sort': (value: any[]) => [...value].sort()
    };

    return transforms[name] || this.customHelpers.get(name);
  }

  /**
   * Private: Render a single template file
   */
  private async renderFile(
    file: TemplateFile,
    context: RenderContext
  ): Promise<GeneratedFile> {
    let content: string;
    const variablesUsed = new Set<string>();

    switch (file.type) {
      case 'handlebars':
        const templateKey = `${context.metadata.version}:${file.path}`;
        let compiled = this.compiledTemplates.get(templateKey);
        
        if (!compiled) {
          compiled = this.handlebars.compile(file.content, {
            strict: this.options.strictMode
          });
          if (this.options.cacheTemplates) {
            this.compiledTemplates.set(templateKey, compiled);
          }
        }

        // Track variable usage
        const usageTracker = new Proxy(context.variables, {
          get(target, prop: string) {
            variablesUsed.add(prop);
            return target[prop];
          }
        });

        content = compiled({
          ...context.variables,
          schema: context.schema,
          metadata: context.metadata
        });
        break;

      case 'plain':
        content = file.content;
        break;

      default:
        throw new Error(`Unsupported template type: ${file.type}`);
    }

    return {
      path: file.path,
      content,
      encoding: file.encoding || 'utf8',
      permissions: file.permissions,
      metadata: {
        templateFile: file.path,
        variablesUsed: Array.from(variablesUsed),
        size: Buffer.byteLength(content, file.encoding || 'utf8')
      }
    };
  }

  /**
   * Private: Evaluate conditional expression
   */
  private evaluateCondition(condition: string, context: RenderContext): boolean {
    try {
      // Simple expression evaluation - in production would use a safe evaluator
      const func = new Function('variables', 'schema', `return ${condition}`);
      return func(context.variables, context.schema);
    } catch (error: any) {
      Logger.warn(`Failed to evaluate condition: ${condition} - ${error.message}`);
      return false;
    }
  }

  /**
   * Private: Execute template hooks
   */
  private async executeHooks(hooks: TemplateHook[], context: RenderContext): Promise<void> {
    for (const hook of hooks) {
      try {
        if (this.options.sandboxHooks) {
          // In production, would use a proper sandbox like vm2
          Logger.debug(`Executing hook: ${hook.name} (sandboxed)`);
        } else {
          // Direct execution - not recommended for untrusted templates
          const func = new Function('context', hook.script);
          await func(context);
        }
      } catch (error: any) {
        Logger.error(`Hook execution failed: ${hook.name} - ${error.message}`);
        if (hook.failOnError) {
          throw error;
        }
      }
    }
  }
}