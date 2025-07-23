/**
 * Dynamic Template Variable Resolver
 * Phase 4, Checkpoint D3 - Dynamic variable resolution with schema awareness
 */

import { TemplateVariable } from './template-engine';
import { SchemaInfo } from '../schema-adapter';
import { Logger } from '../utils/logger';
import * as path from 'path';
import pluralize from 'pluralize';

export interface VariableResolutionContext {
  schema?: SchemaInfo;
  userVariables: Record<string, any>;
  environment: Record<string, string>;
  previousResolutions: Record<string, any>;
  metadata: {
    timestamp: Date;
    projectPath: string;
    supaSeedVersion: string;
  };
}

export interface ResolvedVariable {
  name: string;
  value: any;
  source: 'user' | 'schema' | 'environment' | 'computed' | 'default';
  confidence: number; // 0-100
  alternatives?: Array<{
    value: any;
    reason: string;
    confidence: number;
  }>;
  metadata: {
    resolvedAt: Date;
    dependencies: string[];
    transformsApplied: string[];
  };
}

export interface ResolutionResult {
  success: boolean;
  resolvedVariables: Record<string, ResolvedVariable>;
  errors: ResolutionError[];
  warnings: ResolutionWarning[];
  suggestions: ResolutionSuggestion[];
  metadata: {
    totalVariables: number;
    resolvedCount: number;
    resolutionTime: number;
    schemaUtilization: number; // Percentage of resolutions that used schema
  };
}

export interface ResolutionError {
  code: string;
  message: string;
  variable: string;
  context?: any;
}

export interface ResolutionWarning {
  code: string;
  message: string;
  variable: string;
  suggestion?: string;
}

export interface ResolutionSuggestion {
  variable: string;
  suggestion: string;
  value?: any;
  confidence: number;
  reason: string;
}

export interface VariableResolver {
  name: string;
  description: string;
  priority: number;
  applicableTypes: string[];
  resolve: (
    variable: TemplateVariable,
    context: VariableResolutionContext
  ) => Promise<ResolvedVariable | null>;
}

export class DynamicVariableResolver {
  private resolvers: Map<string, VariableResolver> = new Map();
  private schemaCache: Map<string, any> = new Map();

  constructor() {
    this.initializeBuiltInResolvers();
  }

  /**
   * Resolve all template variables dynamically
   */
  async resolveVariables(
    variables: TemplateVariable[],
    context: VariableResolutionContext
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    Logger.info(`🔮 Resolving ${variables.length} template variables...`);

    const resolvedVariables: Record<string, ResolvedVariable> = {};
    const errors: ResolutionError[] = [];
    const warnings: ResolutionWarning[] = [];
    const suggestions: ResolutionSuggestion[] = [];
    let schemaUsageCount = 0;

    // Sort variables by dependencies
    const sortedVariables = this.sortByDependencies(variables);

    // Resolve each variable
    for (const variable of sortedVariables) {
      try {
        // Skip if already resolved
        if (resolvedVariables[variable.name]) {
          continue;
        }

        // Update context with previously resolved variables
        const currentContext: VariableResolutionContext = {
          ...context,
          previousResolutions: resolvedVariables
        };

        // Try to resolve the variable
        const resolved = await this.resolveVariable(variable, currentContext);

        if (resolved) {
          resolvedVariables[variable.name] = resolved;
          
          if (resolved.source === 'schema') {
            schemaUsageCount++;
          }

          // Generate suggestions if confidence is low
          if (resolved.confidence < 70 && resolved.alternatives) {
            for (const alt of resolved.alternatives) {
              if (alt.confidence > resolved.confidence) {
                suggestions.push({
                  variable: variable.name,
                  suggestion: `Consider using: ${JSON.stringify(alt.value)}`,
                  value: alt.value,
                  confidence: alt.confidence,
                  reason: alt.reason
                });
              }
            }
          }
        } else if (variable.required) {
          errors.push({
            code: 'UNRESOLVED_REQUIRED_VARIABLE',
            message: `Could not resolve required variable: ${variable.name}`,
            variable: variable.name
          });
        } else {
          warnings.push({
            code: 'UNRESOLVED_OPTIONAL_VARIABLE',
            message: `Could not resolve optional variable: ${variable.name}`,
            variable: variable.name,
            suggestion: 'Variable will use default value if provided'
          });
        }

      } catch (error: any) {
        errors.push({
          code: 'RESOLUTION_ERROR',
          message: `Error resolving ${variable.name}: ${error.message}`,
          variable: variable.name,
          context: { error: error.stack }
        });
      }
    }

    // Generate additional suggestions based on schema
    if (context.schema) {
      const schemaSuggestions = this.generateSchemaSuggestions(
        variables,
        resolvedVariables,
        context.schema
      );
      suggestions.push(...schemaSuggestions);
    }

    const resolutionTime = Date.now() - startTime;
    const resolvedCount = Object.keys(resolvedVariables).length;
    const schemaUtilization = resolvedCount > 0 
      ? Math.round((schemaUsageCount / resolvedCount) * 100)
      : 0;

    Logger.info(`🔮 Variable resolution complete: ${resolvedCount}/${variables.length} resolved in ${resolutionTime}ms`);

    return {
      success: errors.length === 0,
      resolvedVariables,
      errors,
      warnings,
      suggestions,
      metadata: {
        totalVariables: variables.length,
        resolvedCount,
        resolutionTime,
        schemaUtilization
      }
    };
  }

  /**
   * Add a custom variable resolver
   */
  addResolver(resolver: VariableResolver): void {
    this.resolvers.set(resolver.name, resolver);
    Logger.debug(`Added variable resolver: ${resolver.name}`);
  }

  /**
   * Remove a variable resolver
   */
  removeResolver(name: string): boolean {
    return this.resolvers.delete(name);
  }

  /**
   * Get all resolvers
   */
  getResolvers(): VariableResolver[] {
    return Array.from(this.resolvers.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Clear resolver caches
   */
  clearCache(): void {
    this.schemaCache.clear();
  }

  /**
   * Private: Initialize built-in resolvers
   */
  private initializeBuiltInResolvers(): void {
    // User-provided resolver (highest priority)
    this.addResolver({
      name: 'user-provided',
      description: 'Resolves from user-provided variables',
      priority: 100,
      applicableTypes: ['string', 'number', 'boolean', 'array', 'object'],
      resolve: async (variable, context) => {
        const value = context.userVariables[variable.name];
        if (value !== undefined) {
          return {
            name: variable.name,
            value,
            source: 'user',
            confidence: 100,
            metadata: {
              resolvedAt: new Date(),
              dependencies: [],
              transformsApplied: []
            }
          };
        }
        return null;
      }
    });

    // Schema-based resolver
    this.addResolver({
      name: 'schema-based',
      description: 'Resolves from database schema information',
      priority: 90,
      applicableTypes: ['string', 'number', 'boolean', 'array', 'object', 'schema'],
      resolve: async (variable, context) => {
        if (!context.schema) return null;

        const resolved = await this.resolveFromSchema(variable, context.schema);
        if (resolved) {
          return {
            ...resolved,
            source: 'schema',
            metadata: {
              resolvedAt: new Date(),
              dependencies: [],
              transformsApplied: []
            }
          };
        }
        return null;
      }
    });

    // Environment resolver
    this.addResolver({
      name: 'environment',
      description: 'Resolves from environment variables',
      priority: 80,
      applicableTypes: ['string', 'number', 'boolean'],
      resolve: async (variable, context) => {
        // Map common variable names to environment variables
        const envMappings: Record<string, string> = {
          'databaseUrl': 'DATABASE_URL',
          'supabaseUrl': 'SUPABASE_URL',
          'supabaseAnonKey': 'SUPABASE_ANON_KEY',
          'nodeEnv': 'NODE_ENV',
          'port': 'PORT'
        };

        const envKey = envMappings[variable.name] || 
                      variable.name.toUpperCase().replace(/[A-Z]/g, '_$&').slice(1);
        
        const value = process.env[envKey] || context.environment[envKey];
        if (value !== undefined) {
          return {
            name: variable.name,
            value: this.convertEnvironmentValue(value, variable.type),
            source: 'environment',
            confidence: 90,
            metadata: {
              resolvedAt: new Date(),
              dependencies: [],
              transformsApplied: []
            }
          };
        }
        return null;
      }
    });

    // Computed resolver
    this.addResolver({
      name: 'computed',
      description: 'Computes values based on other variables and schema',
      priority: 70,
      applicableTypes: ['string', 'number', 'boolean', 'array', 'object'],
      resolve: async (variable, context) => {
        const computed = await this.computeVariable(variable, context);
        if (computed) {
          return {
            ...computed,
            source: 'computed',
            metadata: {
              resolvedAt: new Date(),
              dependencies: variable.dependencies || [],
              transformsApplied: []
            }
          };
        }
        return null;
      }
    });

    // Default value resolver (lowest priority)
    this.addResolver({
      name: 'default-value',
      description: 'Uses default value if specified',
      priority: 10,
      applicableTypes: ['string', 'number', 'boolean', 'array', 'object'],
      resolve: async (variable, context) => {
        if (variable.defaultValue !== undefined) {
          return {
            name: variable.name,
            value: variable.defaultValue,
            source: 'default',
            confidence: 50,
            metadata: {
              resolvedAt: new Date(),
              dependencies: [],
              transformsApplied: []
            }
          };
        }
        return null;
      }
    });
  }

  /**
   * Private: Resolve a single variable
   */
  private async resolveVariable(
    variable: TemplateVariable,
    context: VariableResolutionContext
  ): Promise<ResolvedVariable | null> {
    // Try each resolver in priority order
    for (const resolver of this.getResolvers()) {
      if (resolver.applicableTypes.includes(variable.type)) {
        try {
          const resolved = await resolver.resolve(variable, context);
          if (resolved) {
            return resolved;
          }
        } catch (error: any) {
          Logger.debug(`Resolver ${resolver.name} failed for ${variable.name}: ${error.message}`);
        }
      }
    }

    return null;
  }

  /**
   * Private: Resolve variable from schema
   */
  private async resolveFromSchema(
    variable: TemplateVariable,
    schema: SchemaInfo
  ): Promise<Omit<ResolvedVariable, 'source' | 'metadata'> | null> {
    // Common schema-based resolutions
    const schemaPatterns: Record<string, (schema: SchemaInfo) => any> = {
      'tables': (s) => s.customTables,
      'tableNames': (s) => s.customTables,
      'tableCount': (s) => s.customTables.length,
      'primaryTable': (s) => s.primaryUserTable,
      'userTable': (s) => s.primaryUserTable,
      'hasAuth': (s) => s.hasUsers || s.hasAccounts,
      'hasUsers': (s) => s.hasUsers,
      'hasProfiles': (s) => s.hasProfiles,
      'hasTeams': (s) => s.hasTeams,
      'makerkitVersion': (s) => s.makerkitVersion,
      'frameworkType': (s) => s.frameworkType
    };

    // Check if variable name matches a pattern
    const resolver = schemaPatterns[variable.name];
    if (resolver) {
      const value = resolver(schema);
      return {
        name: variable.name,
        value,
        confidence: 95,
        alternatives: []
      };
    }

    // Table-specific resolutions
    const tableMatch = variable.name.match(/^(.+)Table$/);
    if (tableMatch) {
      const entityName = tableMatch[1].toLowerCase();
      const table = schema.customTables.find(t => 
        t.toLowerCase() === entityName ||
        t.toLowerCase() === pluralize(entityName) ||
        t.toLowerCase() === pluralize.singular(entityName)
      );
      
      if (table) {
        return {
          name: variable.name,
          value: table,
          confidence: 90,
          alternatives: []
        };
      }
    }

    return null;
  }

  /**
   * Private: Compute variable value based on context
   */
  private async computeVariable(
    variable: TemplateVariable,
    context: VariableResolutionContext
  ): Promise<Omit<ResolvedVariable, 'source' | 'metadata'> | null> {
    // Common computed patterns
    const computePatterns: Record<string, (context: VariableResolutionContext) => any> = {
      'timestamp': () => new Date().toISOString(),
      'year': () => new Date().getFullYear(),
      'projectName': (ctx) => path.basename(ctx.metadata.projectPath),
      'seedCount': () => Math.floor(Math.random() * 900) + 100, // 100-1000
      'batchSize': () => 100,
      'enableSync': () => true,
      'debugMode': (ctx) => ctx.environment.NODE_ENV === 'development'
    };

    const compute = computePatterns[variable.name];
    if (compute) {
      const value = compute(context);
      return {
        name: variable.name,
        value,
        confidence: 80,
        alternatives: []
      };
    }

    // Dependency-based computation
    if (variable.dependencies && variable.dependencies.length > 0) {
      return this.computeFromDependencies(variable, context);
    }

    return null;
  }

  /**
   * Private: Compute from dependencies
   */
  private computeFromDependencies(
    variable: TemplateVariable,
    context: VariableResolutionContext
  ): Omit<ResolvedVariable, 'source' | 'metadata'> | null {
    // Check if all dependencies are resolved
    const deps = variable.dependencies || [];
    const depValues: Record<string, any> = {};
    
    for (const dep of deps) {
      const resolved = context.previousResolutions[dep];
      if (!resolved) {
        return null; // Can't compute without all dependencies
      }
      depValues[dep] = resolved.value;
    }

    // Common dependency patterns
    if (variable.name === 'connectionString' && depValues['databaseUrl']) {
      return {
        name: variable.name,
        value: depValues['databaseUrl'],
        confidence: 85,
        alternatives: []
      };
    }

    if (variable.name === 'apiEndpoint' && (depValues['supabaseUrl'] || depValues['baseUrl'])) {
      const baseUrl = depValues['supabaseUrl'] || depValues['baseUrl'];
      return {
        name: variable.name,
        value: `${baseUrl}/rest/v1`,
        confidence: 85,
        alternatives: []
      };
    }

    return null;
  }

  /**
   * Private: Convert environment value to correct type
   */
  private convertEnvironmentValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
      case 'array':
        return value.split(',').map(v => v.trim());
      default:
        return value;
    }
  }

  /**
   * Private: Sort variables by dependencies
   */
  private sortByDependencies(variables: TemplateVariable[]): TemplateVariable[] {
    const sorted: TemplateVariable[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (variable: TemplateVariable) => {
      if (visited.has(variable.name)) return;
      if (visiting.has(variable.name)) {
        throw new Error(`Circular dependency detected: ${variable.name}`);
      }

      visiting.add(variable.name);

      // Visit dependencies first
      if (variable.dependencies) {
        for (const dep of variable.dependencies) {
          const depVar = variables.find(v => v.name === dep);
          if (depVar) {
            visit(depVar);
          }
        }
      }

      visiting.delete(variable.name);
      visited.add(variable.name);
      sorted.push(variable);
    };

    for (const variable of variables) {
      visit(variable);
    }

    return sorted;
  }

  /**
   * Private: Generate suggestions based on schema
   */
  private generateSchemaSuggestions(
    variables: TemplateVariable[],
    resolvedVariables: Record<string, ResolvedVariable>,
    schema: SchemaInfo
  ): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];

    // Suggest table names for unresolved table variables
    for (const variable of variables) {
      if (!resolvedVariables[variable.name] && variable.name.includes('table')) {
        const bestMatch = this.findBestTableMatch(variable.name, schema.customTables);
        if (bestMatch) {
          suggestions.push({
            variable: variable.name,
            suggestion: `Based on schema, consider using table: ${bestMatch}`,
            value: bestMatch,
            confidence: 75,
            reason: 'Schema analysis'
          });
        }
      }
    }

    // Suggest common patterns
    if (!resolvedVariables['primaryKey'] && schema.customTables.length > 0) {
      suggestions.push({
        variable: 'primaryKey',
        suggestion: 'Common primary key pattern: id',
        value: 'id',
        confidence: 80,
        reason: 'Common pattern'
      });
    }

    return suggestions;
  }

  /**
   * Private: Find best matching table
   */
  private findBestTableMatch(variableName: string, tables: string[]): string | null {
    const varLower = variableName.toLowerCase();
    
    // Direct match
    const directMatch = tables.find(t => t.toLowerCase() === varLower);
    if (directMatch) return directMatch;

    // Partial match
    const partialMatch = tables.find(t => 
      t.toLowerCase().includes(varLower) ||
      varLower.includes(t.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // Pluralization match
    const singular = pluralize.singular(varLower);
    const plural = pluralize(varLower);
    
    const pluralMatch = tables.find(t => 
      t.toLowerCase() === singular ||
      t.toLowerCase() === plural
    );
    
    return pluralMatch || null;
  }
}