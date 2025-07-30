/**
 * Constraint Discovery Engine for PostgreSQL
 * Parses triggers, functions, and constraints to extract business logic rules
 * Part of supa-seed v2.2.0 constraint-aware architecture
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface PostgreSQLFunction {
  name: string;
  schema: string;
  definition: string;
  returnType: string;
  parameters: PostgreSQLParameter[];
  language: string;
  volatility: 'IMMUTABLE' | 'STABLE' | 'VOLATILE';
}

export interface PostgreSQLParameter {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
}

export interface PostgreSQLTrigger {
  name: string;
  tableName: string;
  schema: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  functionName: string;
  functionSchema: string;
  condition?: string;
  isEnabled: boolean;
}

export interface BusinessRule {
  id: string;
  name: string;
  type: 'validation' | 'transformation' | 'dependency' | 'business_logic';
  table: string;
  condition: string;
  action: 'allow' | 'deny' | 'modify' | 'require';
  errorMessage?: string;
  autoFix?: AutoFixSuggestion;
  confidence: number;
  sqlPattern: string;
  dependencies: string[];
}

export interface AutoFixSuggestion {
  type: 'set_field' | 'create_dependency' | 'skip_operation' | 'modify_workflow';
  description: string;
  action: AutoFixAction;
  confidence: number;
  impact?: 'low' | 'medium' | 'high'; // Added for compatibility
}

export interface AutoFixAction {
  table?: string;
  field?: string;
  value?: any;
  sqlCode?: string;
  workflowModification?: {
    skipStep?: boolean;
    addStep?: WorkflowStepTemplate;
    modifyConditions?: string[];
  };
}

export interface WorkflowStepTemplate {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'validate' | 'skip';
  fields: Record<string, any>;
  conditions?: string[];
}

export interface ConstraintMetadata {
  tables: TableConstraints[];
  businessRules: BusinessRule[];
  dependencies: TableDependency[];
  triggers: TriggerRule[];
  functions: FunctionRule[];
  confidence: number;
  discoveryTimestamp: string;
}

export interface TableConstraints {
  tableName: string;
  constraints: BusinessRule[];
  triggers: TriggerRule[];
  dependencies: TableDependency[];
}

export interface TriggerRule {
  triggerName: string;
  tableName: string;
  functionName: string;
  extractedRules: BusinessRule[];
  rawDefinition: string;
  parsedSuccessfully: boolean;
}

export interface FunctionRule {
  functionName: string;
  schema: string;
  extractedRules: BusinessRule[];
  rawDefinition: string;
  parsedSuccessfully: boolean;
}

export interface TableDependency {
  fromTable: string;
  toTable: string;
  relationship: 'required' | 'optional' | 'conditional';
  condition?: string;
  constraint: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: DependencyNode[][];
  creationOrder: string[];
}

export interface DependencyNode {
  table: string;
  dependencies: string[];
  dependents: string[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'required' | 'optional' | 'conditional';
  constraint: string;
}

export class ConstraintDiscoveryEngine {
  private client: SupabaseClient;
  private discoveryCache: Map<string, ConstraintMetadata> = new Map();
  private functionCache: Map<string, PostgreSQLFunction> = new Map();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Main entry point: discover all constraints for schema tables
   */
  async discoverConstraints(tableNames: string[]): Promise<ConstraintMetadata> {
    const cacheKey = tableNames.sort().join(',');
    
    if (this.discoveryCache.has(cacheKey)) {
      Logger.debug('Using cached constraint discovery results');
      return this.discoveryCache.get(cacheKey)!;
    }

    Logger.info('🔍 Starting PostgreSQL constraint discovery...');

    const startTime = Date.now();
    const metadata: ConstraintMetadata = {
      tables: [],
      businessRules: [],
      dependencies: [],
      triggers: [],
      functions: [],
      confidence: 0,
      discoveryTimestamp: new Date().toISOString()
    };

    try {
      // Step 1: Discover all triggers for the tables
      const triggers = await this.discoverTriggers(tableNames);
      Logger.debug(`Found ${triggers.length} triggers`);

      // Step 2: Discover and parse functions referenced by triggers
      const functions = await this.discoverTriggerFunctions(triggers);
      Logger.debug(`Found ${functions.length} constraint functions`);

      // Step 3: Parse business rules from functions
      const businessRules = await this.parseBusinessLogicFromFunctions(functions);
      Logger.debug(`Extracted ${businessRules.length} business rules`);

      // Step 4: Build table constraint metadata
      metadata.tables = await this.buildTableConstraints(tableNames, triggers, businessRules);

      // Step 5: Extract dependencies from business rules
      metadata.dependencies = await this.extractDependencies(businessRules);

      // Step 6: Process triggers into rules
      metadata.triggers = await this.processTriggerRules(triggers, functions);

      // Step 7: Process functions into rules
      metadata.functions = await this.processFunctionRules(functions);

      // Aggregate all business rules
      metadata.businessRules = businessRules;

      // Calculate confidence score
      metadata.confidence = this.calculateConfidenceScore(metadata);

      const duration = Date.now() - startTime;
      Logger.success(`✅ Constraint discovery completed in ${duration}ms (confidence: ${(metadata.confidence * 100).toFixed(1)}%)`);

      // Cache results
      this.discoveryCache.set(cacheKey, metadata);

      return metadata;

    } catch (error: any) {
      Logger.error('PostgreSQL constraint discovery failed:', error);
      throw new Error(`Constraint discovery failed: ${error.message}`);
    }
  }

  /**
   * Discover all triggers for specified tables
   */
  private async discoverTriggers(tableNames: string[]): Promise<PostgreSQLTrigger[]> {
    const triggers: PostgreSQLTrigger[] = [];

    try {
      // Query PostgreSQL system catalogs for trigger information
      const triggerQuery = `
        SELECT 
          t.tgname as trigger_name,
          c.relname as table_name,
          n.nspname as table_schema,
          CASE t.tgtype & 66
            WHEN 2 THEN 'BEFORE'
            WHEN 64 THEN 'INSTEAD OF' 
            ELSE 'AFTER'
          END as timing,
          CASE t.tgtype & 28
            WHEN 4 THEN ARRAY['INSERT']
            WHEN 8 THEN ARRAY['DELETE']
            WHEN 12 THEN ARRAY['INSERT', 'DELETE']
            WHEN 16 THEN ARRAY['UPDATE']
            WHEN 20 THEN ARRAY['INSERT', 'UPDATE']
            WHEN 24 THEN ARRAY['UPDATE', 'DELETE']
            WHEN 28 THEN ARRAY['INSERT', 'UPDATE', 'DELETE']
            ELSE ARRAY[]::text[]
          END as events,
          p.proname as function_name,
          pn.nspname as function_schema,
          t.tgenabled = 'O' as is_enabled,
          pg_get_triggerdef(t.oid) as trigger_definition
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace pn ON p.pronamespace = pn.oid
        WHERE n.nspname = 'public'
          AND c.relname = ANY($1)
          AND NOT t.tgisinternal
        ORDER BY c.relname, t.tgname
      `;

      const { data: triggerData, error } = await this.client.rpc('exec_sql', {
        sql: triggerQuery,
        params: [tableNames]
      });

      if (error) {
        Logger.warn('Failed to query pg_trigger, using fallback method');
        return this.fallbackTriggerDiscovery(tableNames);
      }

      if (triggerData && Array.isArray(triggerData)) {
        for (const row of triggerData) {
          triggers.push({
            name: row.trigger_name,
            tableName: row.table_name,
            schema: row.table_schema,
            timing: row.timing,
            events: row.events || [],
            functionName: row.function_name,
            functionSchema: row.function_schema,
            isEnabled: row.is_enabled
          });
        }
      }

    } catch (error: any) {
      Logger.warn(`Trigger discovery error: ${error.message}, using fallback`);
      return this.fallbackTriggerDiscovery(tableNames);
    }

    return triggers;
  }

  /**
   * Fallback trigger discovery using information_schema
   */
  private async fallbackTriggerDiscovery(tableNames: string[]): Promise<PostgreSQLTrigger[]> {
    const triggers: PostgreSQLTrigger[] = [];

    try {
      const { data: triggerData, error } = await this.client
        .from('information_schema.triggers')
        .select(`
          trigger_name,
          event_object_table,
          trigger_schema,
          action_timing,
          event_manipulation,
          action_statement
        `)
        .eq('trigger_schema', 'public')
        .in('event_object_table', tableNames);

      if (!error && triggerData) {
        for (const row of triggerData) {
          // Extract function name from action_statement (e.g., "EXECUTE PROCEDURE function_name()")
          const actionStatement = row.action_statement as string;
          const functionMatch = actionStatement.match(/EXECUTE (?:PROCEDURE|FUNCTION)\s+([^(]+)/i);
          const functionName = functionMatch ? functionMatch[1].trim() : 'unknown';

          triggers.push({
            name: row.trigger_name as string,
            tableName: row.event_object_table as string,
            schema: row.trigger_schema as string,
            timing: row.action_timing as any,
            events: [row.event_manipulation as any],
            functionName,
            functionSchema: 'public',
            isEnabled: true
          });
        }
      }
    } catch (error: any) {
      Logger.debug(`Fallback trigger discovery failed: ${error.message}`);
    }

    return triggers;
  }

  /**
   * Discover and load function definitions for triggers
   */
  private async discoverTriggerFunctions(triggers: PostgreSQLTrigger[]): Promise<PostgreSQLFunction[]> {
    const functions: PostgreSQLFunction[] = [];
    const functionNames = [...new Set(triggers.map(t => t.functionName))];

    for (const functionName of functionNames) {
      if (this.functionCache.has(functionName)) {
        functions.push(this.functionCache.get(functionName)!);
        continue;
      }

      try {
        const func = await this.loadFunctionDefinition(functionName);
        if (func) {
          functions.push(func);
          this.functionCache.set(functionName, func);
        }
      } catch (error: any) {
        Logger.warn(`Failed to load function ${functionName}: ${error.message}`);
      }
    }

    return functions;
  }

  /**
   * Load a PostgreSQL function definition
   */
  private async loadFunctionDefinition(functionName: string): Promise<PostgreSQLFunction | null> {
    try {
      const functionQuery = `
        SELECT 
          p.proname as function_name,
          n.nspname as schema_name,
          pg_get_functiondef(p.oid) as definition,
          t.typname as return_type,
          p.prolang as language_oid,
          l.lanname as language,
          p.provolatile as volatility,
          p.pronargs as param_count,
          p.proargnames as param_names,
          p.proargtypes as param_types
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        JOIN pg_type t ON p.prorettype = t.oid
        JOIN pg_language l ON p.prolang = l.oid
        WHERE p.proname = $1
          AND n.nspname = 'public'
        LIMIT 1
      `;

      const { data: funcData, error } = await this.client.rpc('exec_sql', {
        sql: functionQuery,
        params: [functionName]
      });

      if (error || !funcData || !Array.isArray(funcData) || funcData.length === 0) {
        return null;
      }

      const row = funcData[0];
      
      return {
        name: row.function_name,
        schema: row.schema_name,
        definition: row.definition,
        returnType: row.return_type,
        parameters: [], // Would parse from param_names/param_types if needed
        language: row.language,
        volatility: this.mapVolatility(row.volatility)
      };

    } catch (error: any) {
      Logger.debug(`Failed to load function definition for ${functionName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse business logic rules from PostgreSQL functions
   */
  private async parseBusinessLogicFromFunctions(functions: PostgreSQLFunction[]): Promise<BusinessRule[]> {
    const businessRules: BusinessRule[] = [];

    for (const func of functions) {
      try {
        const rules = await this.parseBusinessRulesFromFunction(func);
        businessRules.push(...rules);
      } catch (error: any) {
        Logger.warn(`Failed to parse business rules from function ${func.name}: ${error.message}`);
      }
    }

    return businessRules;
  }

  /**
   * Parse business rules from a single function definition
   */
  private async parseBusinessRulesFromFunction(func: PostgreSQLFunction): Promise<BusinessRule[]> {
    const rules: BusinessRule[] = [];
    const definition = func.definition.toLowerCase();

    // Pattern 1: RAISE EXCEPTION with condition
    const exceptionPatterns = [
      /if\s+not\s+exists\s*\(\s*select[^)]+from\s+(\w+)[^)]+where[^)]+(\w+)\s*=\s*(\w+)[^)]*\)\s+then\s+raise\s+exception\s+'([^']+)'/gi,
      /if\s+([^)]+)\s+then\s+raise\s+exception\s+'([^']+)'/gi
    ];

    for (const pattern of exceptionPatterns) {
      let match;
      while ((match = pattern.exec(definition)) !== null) {
        const rule = this.extractRuleFromException(match, func);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    // Pattern 2: Conditional logic with table lookups
    const conditionalPatterns = [
      /select[^;]+from\s+(\w+)[^;]+where[^;]+(\w+)\s*=\s*(\w+)/gi
    ];

    for (const pattern of conditionalPatterns) {
      let match;
      while ((match = pattern.exec(definition)) !== null) {
        const rule = this.extractRuleFromConditional(match, func);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    return rules;
  }

  /**
   * Extract business rule from RAISE EXCEPTION pattern
   */
  private extractRuleFromException(match: RegExpExecArray, func: PostgreSQLFunction): BusinessRule | null {
    const fullMatch = match[0];
    const errorMessage = match[match.length - 1]; // Last capture group is usually the error message

    // Parse the table and condition from the SQL pattern
    const tableMatch = fullMatch.match(/from\s+(\w+)/i);
    const conditionMatch = fullMatch.match(/where[^)]+(\w+)\s*=\s*(\w+)/i);

    if (!tableMatch) {
      return null;
    }

    const table = tableMatch[1];
    const condition = conditionMatch ? `${conditionMatch[1]} = ${conditionMatch[2]}` : 'complex_condition';

    // Generate auto-fix suggestion
    const autoFix: AutoFixSuggestion | undefined = conditionMatch ? {
      type: 'set_field',
      description: `Set ${conditionMatch[1]} to ${conditionMatch[2]} to satisfy constraint`,
      confidence: 0.8,
      action: {
        table,
        field: conditionMatch[1],
        value: conditionMatch[2] === 'true' ? true : conditionMatch[2]
      }
    } : undefined;

    return {
      id: `${func.name}_${table}_${Date.now()}`,
      name: `${func.name}_constraint`,
      type: 'validation',
      table,
      condition,
      action: 'deny',
      errorMessage,
      autoFix,
      confidence: 0.9,
      sqlPattern: fullMatch,
      dependencies: [table]
    };
  }

  /**
   * Extract business rule from conditional pattern
   */
  private extractRuleFromConditional(match: RegExpExecArray, func: PostgreSQLFunction): BusinessRule | null {
    const table = match[1];
    const field = match[2];
    const value = match[3];

    return {
      id: `${func.name}_${table}_${field}_${Date.now()}`,
      name: `${func.name}_dependency`,
      type: 'dependency',
      table,
      condition: `${field} = ${value}`,
      action: 'require',
      confidence: 0.7,
      sqlPattern: match[0],
      dependencies: [table]
    };
  }

  /**
   * Build table-specific constraint metadata
   */
  private async buildTableConstraints(
    tableNames: string[],
    triggers: PostgreSQLTrigger[],
    businessRules: BusinessRule[]
  ): Promise<TableConstraints[]> {
    const tableConstraints: TableConstraints[] = [];

    for (const tableName of tableNames) {
      const tableTriggers = triggers.filter(t => t.tableName === tableName);
      const tableRules = businessRules.filter(r => r.table === tableName);
      const tableDependencies = await this.extractTableDependencies(tableName, businessRules);

      const triggerRules: TriggerRule[] = tableTriggers.map(trigger => ({
        triggerName: trigger.name,
        tableName: trigger.tableName,
        functionName: trigger.functionName,
        extractedRules: businessRules.filter(r => r.sqlPattern.includes(trigger.functionName)),
        rawDefinition: trigger.condition || '',
        parsedSuccessfully: true
      }));

      tableConstraints.push({
        tableName,
        constraints: tableRules,
        triggers: triggerRules,
        dependencies: tableDependencies
      });
    }

    return tableConstraints;
  }

  /**
   * Extract dependencies from business rules
   */
  private async extractDependencies(businessRules: BusinessRule[]): Promise<TableDependency[]> {
    const dependencies: TableDependency[] = [];

    for (const rule of businessRules) {
      for (const depTable of rule.dependencies) {
        if (depTable !== rule.table) {
          dependencies.push({
            fromTable: rule.table,
            toTable: depTable,
            relationship: rule.action === 'require' ? 'required' : 'conditional',
            condition: rule.condition,
            constraint: rule.name
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Extract table-specific dependencies
   */
  private async extractTableDependencies(tableName: string, businessRules: BusinessRule[]): Promise<TableDependency[]> {
    return businessRules
      .filter(rule => rule.table === tableName)
      .flatMap(rule => 
        rule.dependencies
          .filter(dep => dep !== tableName)
          .map(dep => ({
            fromTable: tableName,
            toTable: dep,
            relationship: rule.action === 'require' ? 'required' : 'conditional',
            condition: rule.condition,
            constraint: rule.name
          } as TableDependency))
      );
  }

  /**
   * Process triggers into rule metadata
   */
  private async processTriggerRules(
    triggers: PostgreSQLTrigger[],
    functions: PostgreSQLFunction[]
  ): Promise<TriggerRule[]> {
    const triggerRules: TriggerRule[] = [];

    for (const trigger of triggers) {
      const func = functions.find(f => f.name === trigger.functionName);
      const extractedRules = func ? await this.parseBusinessRulesFromFunction(func) : [];

      triggerRules.push({
        triggerName: trigger.name,
        tableName: trigger.tableName,
        functionName: trigger.functionName,
        extractedRules,
        rawDefinition: func?.definition || '',
        parsedSuccessfully: func !== undefined
      });
    }

    return triggerRules;
  }

  /**
   * Process functions into rule metadata
   */
  private async processFunctionRules(functions: PostgreSQLFunction[]): Promise<FunctionRule[]> {
    const functionRules: FunctionRule[] = [];

    for (const func of functions) {
      const extractedRules = await this.parseBusinessRulesFromFunction(func);

      functionRules.push({
        functionName: func.name,
        schema: func.schema,
        extractedRules,
        rawDefinition: func.definition,
        parsedSuccessfully: extractedRules.length > 0
      });
    }

    return functionRules;
  }

  /**
   * Build dependency graph for table creation ordering
   */
  async buildDependencyGraph(constraints: ConstraintMetadata): Promise<DependencyGraph> {
    const nodes: DependencyNode[] = [];
    const edges: DependencyEdge[] = [];
    const tableSet = new Set<string>();

    // Collect all tables
    constraints.dependencies.forEach(dep => {
      tableSet.add(dep.fromTable);
      tableSet.add(dep.toTable);
    });

    // Build nodes
    for (const table of tableSet) {
      const dependencies = constraints.dependencies
        .filter(dep => dep.fromTable === table)
        .map(dep => dep.toTable);
      
      const dependents = constraints.dependencies
        .filter(dep => dep.toTable === table)
        .map(dep => dep.fromTable);

      nodes.push({
        table,
        dependencies,
        dependents
      });
    }

    // Build edges
    constraints.dependencies.forEach(dep => {
      edges.push({
        from: dep.fromTable,
        to: dep.toTable,
        type: dep.relationship as any,
        constraint: dep.constraint
      });
    });

    // Detect cycles
    const cycles = this.detectCycles(nodes, edges);

    // Calculate creation order
    const creationOrder = this.calculateCreationOrder(nodes, edges);

    return {
      nodes,
      edges,
      cycles,
      creationOrder
    };
  }

  /**
   * Utility methods
   */
  private mapVolatility(volatility: string): 'IMMUTABLE' | 'STABLE' | 'VOLATILE' {
    switch (volatility) {
      case 'i': return 'IMMUTABLE';
      case 's': return 'STABLE';
      case 'v': return 'VOLATILE';
      default: return 'VOLATILE';
    }
  }

  private calculateConfidenceScore(metadata: ConstraintMetadata): number {
    let totalScore = 0;
    let totalRules = 0;

    metadata.businessRules.forEach(rule => {
      totalScore += rule.confidence;
      totalRules++;
    });

    return totalRules > 0 ? totalScore / totalRules : 0;
  }

  private detectCycles(nodes: DependencyNode[], edges: DependencyEdge[]): DependencyNode[][] {
    // Simplified cycle detection - would implement proper algorithm
    return [];
  }

  private calculateCreationOrder(nodes: DependencyNode[], edges: DependencyEdge[]): string[] {
    // Topological sort implementation
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (table: string) => {
      if (visiting.has(table)) {
        // Cycle detected - handle gracefully
        return;
      }
      if (visited.has(table)) {
        return;
      }

      visiting.add(table);
      
      const node = nodes.find(n => n.table === table);
      if (node) {
        node.dependencies.forEach(dep => visit(dep));
      }

      visiting.delete(table);
      visited.add(table);
      order.push(table);
    };

    nodes.forEach(node => {
      if (!visited.has(node.table)) {
        visit(node.table);
      }
    });

    return order;
  }

  /**
   * Clear discovery cache
   */
  clearCache(): void {
    this.discoveryCache.clear();
    this.functionCache.clear();
  }
}