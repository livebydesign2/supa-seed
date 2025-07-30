/**
 * Template Engine
 * Handles template processing and code generation
 */

import * as handlebars from 'handlebars';
import { Logger } from '../../core/utils/logger';

export interface TemplateContext {
  [key: string]: any;
}

export interface TemplateOptions {
  helpers?: Record<string, handlebars.HelperDelegate>;
  partials?: Record<string, string>;
  strictMode?: boolean;
  noEscape?: boolean;
}

export interface TemplateResult {
  success: boolean;
  output?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Basic template interface for external use
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  content?: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class TemplateEngine {
  private handlebars: typeof handlebars;
  private options: Required<TemplateOptions>;

  constructor(options: TemplateOptions = {}) {
    this.handlebars = handlebars.create();
    this.options = {
      helpers: {},
      partials: {},
      strictMode: false,
      noEscape: false,
      ...options
    };

    this.registerBuiltinHelpers();
    this.registerHelpers(this.options.helpers);
    this.registerPartials(this.options.partials);
  }

  /**
   * Process a template string with given context
   */
  processTemplate(templateString: string, context: TemplateContext): TemplateResult {
    try {
      const template = this.handlebars.compile(templateString, {
        strict: this.options.strictMode,
        noEscape: this.options.noEscape
      });

      const output = template(context);

      return {
        success: true,
        output,
        warnings: []
      };

    } catch (error: any) {
      Logger.error(`Template processing failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process template from file
   */
  async processTemplateFile(filePath: string, context: TemplateContext): Promise<TemplateResult> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const templateContent = await fs.readFile(filePath, 'utf-8');
      return this.processTemplate(templateContent, context);
    } catch (error: any) {
      Logger.error(`Template file processing failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Register custom helpers
   */
  registerHelpers(helpers: Record<string, handlebars.HelperDelegate>): void {
    Object.entries(helpers).forEach(([name, helper]) => {
      this.handlebars.registerHelper(name, helper);
    });
  }

  /**
   * Register partials
   */
  registerPartials(partials: Record<string, string>): void {
    Object.entries(partials).forEach(([name, partial]) => {
      this.handlebars.registerPartial(name, partial);
    });
  }

  /**
   * Register built-in helpers
   */
  private registerBuiltinHelpers(): void {
    // String helpers
    this.handlebars.registerHelper('uppercase', (str: string) => {
      return str ? str.toUpperCase() : '';
    });

    this.handlebars.registerHelper('lowercase', (str: string) => {
      return str ? str.toLowerCase() : '';
    });

    this.handlebars.registerHelper('capitalize', (str: string) => {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });

    this.handlebars.registerHelper('camelCase', (str: string) => {
      return str ? str.replace(/[-_\s]+(.)?/g, (_, char) => char?.toUpperCase() || '') : '';
    });

    this.handlebars.registerHelper('kebabCase', (str: string) => {
      return str ? str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '') : '';
    });

    this.handlebars.registerHelper('snakeCase', (str: string) => {
      return str ? str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') : '';
    });

    // Array helpers
    this.handlebars.registerHelper('join', (array: any[], separator: string = ', ') => {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    this.handlebars.registerHelper('length', (array: any[]) => {
      return Array.isArray(array) ? array.length : 0;
    });

    this.handlebars.registerHelper('first', (array: any[]) => {
      return Array.isArray(array) && array.length > 0 ? array[0] : null;
    });

    this.handlebars.registerHelper('last', (array: any[]) => {
      return Array.isArray(array) && array.length > 0 ? array[array.length - 1] : null;
    });

    // Conditional helpers
    this.handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    this.handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    this.handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    this.handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    this.handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    this.handlebars.registerHelper('lte', (a: any, b: any) => a <= b);

    // Logical helpers
    this.handlebars.registerHelper('and', (...args: any[]) => {
      const options = args.pop();
      return args.every(Boolean);
    });

    this.handlebars.registerHelper('or', (...args: any[]) => {
      const options = args.pop();
      return args.some(Boolean);
    });

    this.handlebars.registerHelper('not', (value: any) => !value);

    // Object helpers
    this.handlebars.registerHelper('keys', (obj: object) => {
      return obj ? Object.keys(obj) : [];
    });

    this.handlebars.registerHelper('values', (obj: object) => {
      return obj ? Object.values(obj) : [];
    });

    // Date helpers
    this.handlebars.registerHelper('now', () => new Date().toISOString());
    this.handlebars.registerHelper('formatDate', (date: Date | string, format: string = 'ISO') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (!(d instanceof Date) || isNaN(d.getTime())) return '';
      
      switch (format) {
        case 'ISO':
          return d.toISOString();
        case 'date':
          return d.toDateString();
        case 'time':
          return d.toTimeString();
        default:
          return d.toString();
      }
    });

    // Math helpers
    this.handlebars.registerHelper('add', (a: number, b: number) => (a || 0) + (b || 0));
    this.handlebars.registerHelper('subtract', (a: number, b: number) => (a || 0) - (b || 0));
    this.handlebars.registerHelper('multiply', (a: number, b: number) => (a || 0) * (b || 0));
    this.handlebars.registerHelper('divide', (a: number, b: number) => b !== 0 ? (a || 0) / b : 0);

    // Utility helpers
    this.handlebars.registerHelper('default', (value: any, defaultValue: any) => {
      return value != null ? value : defaultValue;
    });

    this.handlebars.registerHelper('json', (obj: any) => {
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return '{}';
      }
    });

    this.handlebars.registerHelper('debug', (obj: any) => {
      console.log('Template Debug:', obj);
      return '';
    });
  }

  /**
   * Create a new template engine instance with additional options
   */
  extend(additionalOptions: TemplateOptions): TemplateEngine {
    const mergedOptions = {
      helpers: { ...this.options.helpers, ...additionalOptions.helpers },
      partials: { ...this.options.partials, ...additionalOptions.partials },
      strictMode: additionalOptions.strictMode ?? this.options.strictMode,
      noEscape: additionalOptions.noEscape ?? this.options.noEscape
    };

    return new TemplateEngine(mergedOptions);
  }

  /**
   * Validate template syntax without processing
   */
  validateTemplate(templateString: string): TemplateResult {
    try {
      this.handlebars.compile(templateString, {
        strict: this.options.strictMode
      });

      return {
        success: true,
        warnings: []
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available helpers
   */
  getHelpers(): string[] {
    return Object.keys(this.handlebars.helpers);
  }

  /**
   * Get available partials
   */
  getPartials(): string[] {
    return Object.keys(this.handlebars.partials);
  }
}

// Export convenience functions
export function createTemplateEngine(options?: TemplateOptions): TemplateEngine {
  return new TemplateEngine(options);
}

export function processTemplate(templateString: string, context: TemplateContext, options?: TemplateOptions): TemplateResult {
  const engine = new TemplateEngine(options);
  return engine.processTemplate(templateString, context);
}

export async function processTemplateFile(filePath: string, context: TemplateContext, options?: TemplateOptions): Promise<TemplateResult> {
  const engine = new TemplateEngine(options);
  return engine.processTemplateFile(filePath, context);
}

// Default export
export default TemplateEngine;