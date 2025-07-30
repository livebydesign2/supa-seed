/**
 * Relationship Analyzer
 * Analyzes foreign key relationships and builds dependency graphs for seeding order
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import {
  DependencyGraph,
  DependencyGraphBuilder,
  TableDependency,
  ForeignKeyRelationship,
  TableMetadata,
  SeedingOrderResult,
  SeedingOrderOptions
} from './dependency-graph';

type SupabaseClient = ReturnType<typeof createClient>;

export interface RelationshipAnalysisOptions {
  // Schema options
  schemas: string[];
  includeTables: string[];
  excludeTables: string[];
  
  // Analysis options
  detectJunctionTables: boolean;
  analyzeTenantScoping: boolean;
  includeOptionalRelationships: boolean;
  detectSelfReferences: boolean;
  
  // Performance options
  enableCaching: boolean;
  cacheTimeout: number; // minutes
  maxConcurrentQueries: number;
  queryTimeout: number; // milliseconds
  
  // Output options
  generateRecommendations: boolean;
  includeMetadata: boolean;
  verboseLogging: boolean;
}

export interface RelationshipAnalysisResult {
  success: boolean;
  dependencyGraph: DependencyGraph;
  foreignKeyRelationships: ForeignKeyRelationship[];
  tableDependencies: TableDependency[];
  analysisMetadata: AnalysisMetadata;
  seedingOrder: SeedingOrderResult;
  recommendations: string[];
  warnings: string[];
  errors: string[];
  executionTime: number;
}

export interface AnalysisMetadata {
  tablesAnalyzed: number;
  relationshipsFound: number;
  junctionTablesDetected: string[];
  tenantScopedTables: string[];
  circularDependencies: number;
  maxDependencyDepth: number;
  analysisTimestamp: string;
  confidence: number;
  cacheHit: boolean;
}

interface PostgresForeignKey {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
  update_rule: string;
  delete_rule: string;
  is_deferrable: boolean;
  initially_deferred: boolean;
  table_schema: string;
  foreign_table_schema: string;
  is_nullable: boolean;
}

interface PostgresTable {
  table_name: string;
  table_schema: string;
  table_type: string;
}

interface PostgresColumn {
  table_name: string;
  column_name: string;
  is_nullable: string;
  data_type: string;
  is_primary_key: boolean;
}

export class RelationshipAnalyzer {
  private client: SupabaseClient;
  private options: RelationshipAnalysisOptions;
  private analysisCache: Map<string, RelationshipAnalysisResult> = new Map();

  constructor(client: SupabaseClient, options: Partial<RelationshipAnalysisOptions> = {}) {
    this.client = client;
    this.options = {
      schemas: ['public'],
      includeTables: [],
      excludeTables: [],
      detectJunctionTables: true,
      analyzeTenantScoping: true,
      includeOptionalRelationships: true,
      detectSelfReferences: true,
      enableCaching: true,
      cacheTimeout: 30,
      maxConcurrentQueries: 10,
      queryTimeout: 30000,
      generateRecommendations: true,
      includeMetadata: true,
      verboseLogging: false,
      ...options
    };
  }

  /**
   * Analyze relationships and build dependency graph
   */
  async analyzeRelationships(): Promise<RelationshipAnalysisResult> {
    const startTime = Date.now();
    Logger.info('🔗 Starting relationship analysis...');

    try {
      // Check cache
      const cacheKey = this.generateCacheKey();
      if (this.options.enableCaching && this.analysisCache.has(cacheKey)) {
        Logger.debug('Using cached relationship analysis');
        const cached = this.analysisCache.get(cacheKey)!;
        cached.analysisMetadata.cacheHit = true;
        return cached;
      }

      // Get all tables in specified schemas
      const tables = await this.getTables();
      
      // Get foreign key relationships
      const foreignKeys = await this.getForeignKeyRelationships();

      // Get column information for metadata
      const columns = await this.getColumnInformation();

      // Build dependency graph
      const dependencyGraph = await this.buildDependencyGraph(tables, foreignKeys, columns);

      // Calculate seeding order
      const seedingOrder = dependencyGraph.calculateSeedingOrderWithPhases({
        respectCircularDependencies: true,
        prioritizeJunctionTables: false,
        groupByTenant: this.options.analyzeTenantScoping
      });

      // Convert to table dependencies
      const tableDependencies = this.convertToTableDependencies(foreignKeys);

      // Generate analysis metadata
      const analysisMetadata = this.generateAnalysisMetadata(
        tables,
        foreignKeys,
        dependencyGraph,
        startTime,
        false
      );

      const builtGraph = dependencyGraph.build();

      const result: RelationshipAnalysisResult = {
        success: true,
        dependencyGraph: builtGraph,
        foreignKeyRelationships: foreignKeys,
        tableDependencies,
        analysisMetadata,
        seedingOrder,
        recommendations: this.generateRecommendations(dependencyGraph),
        warnings: builtGraph.metadata.warnings,
        errors: [],
        executionTime: Date.now() - startTime
      };

      // Cache result
      if (this.options.enableCaching) {
        this.analysisCache.set(cacheKey, result);
      }

      Logger.success(`✅ Relationship analysis completed in ${result.executionTime}ms`);
      Logger.info(`📊 Found ${foreignKeys.length} relationships across ${tables.length} tables`);
      Logger.info(`🔄 Seeding order: ${seedingOrder.seedingOrder.join(' → ')}`);

      return result;

    } catch (error: any) {
      Logger.error('Relationship analysis failed:', error);
      return {
        success: false,
        dependencyGraph: this.createEmptyGraph(),
        foreignKeyRelationships: [],
        tableDependencies: [],
        analysisMetadata: {
          tablesAnalyzed: 0,
          relationshipsFound: 0,
          junctionTablesDetected: [],
          tenantScopedTables: [],
          circularDependencies: 0,
          maxDependencyDepth: 0,
          analysisTimestamp: new Date().toISOString(),
          confidence: 0,
          cacheHit: false
        },
        seedingOrder: {
          success: false,
          seedingOrder: [],
          phases: [],
          circularDependenciesResolved: [],
          warnings: [],
          errors: [error.message],
          metadata: {
            totalPhases: 0,
            estimatedSeedingTime: 0,
            complexity: 'unknown',
            recommendations: []
          }
        },
        recommendations: [],
        warnings: [],
        errors: [error.message],
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get all tables from specified schemas
   */
  private async getTables(): Promise<PostgresTable[]> {
    Logger.debug('Querying database tables...');

    const schemaFilter = this.options.schemas.join(',');
    
    const { data: tables, error } = await this.client
      .from('information_schema.tables')
      .select('table_name, table_schema, table_type')
      .in('table_schema', this.options.schemas)
      .eq('table_type', 'BASE TABLE');

    if (error) {
      throw new Error(`Failed to query tables: ${error.message}`);
    }

    let filteredTables = (tables || []) as PostgresTable[];

    // Apply include/exclude filters
    if (this.options.includeTables.length > 0) {
      filteredTables = filteredTables.filter(t => 
        this.options.includeTables.includes(t.table_name)
      );
    }

    if (this.options.excludeTables.length > 0) {
      filteredTables = filteredTables.filter(t => 
        !this.options.excludeTables.includes(t.table_name)
      );
    }

    Logger.debug(`Found ${filteredTables.length} tables to analyze`);
    return filteredTables;
  }

  /**
   * Get foreign key relationships
   */
  private async getForeignKeyRelationships(): Promise<ForeignKeyRelationship[]> {
    Logger.debug('Querying foreign key relationships...');

    const { data: foreignKeys, error } = await this.client.rpc('get_foreign_keys_detailed', {
      schema_names: this.options.schemas
    });

    if (error) {
      Logger.debug('Detailed foreign key query failed, using basic query');
      return await this.getForeignKeysBasic();
    }

    return this.transformForeignKeys((foreignKeys || []) as any[]);
  }

  /**
   * Fallback method to get foreign keys using basic information_schema queries
   */
  private async getForeignKeysBasic(): Promise<ForeignKeyRelationship[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule,
        tc.is_deferrable,
        tc.initially_deferred,
        tc.table_schema,
        ccu.table_schema AS foreign_table_schema,
        col.is_nullable
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name 
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name 
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
        AND tc.table_schema = rc.constraint_schema
      JOIN information_schema.columns col
        ON kcu.table_name = col.table_name
        AND kcu.column_name = col.column_name
        AND kcu.table_schema = col.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = ANY($1)
    `;

    try {
      const { data, error } = await this.client.rpc('exec_sql', {
        query,
        params: [this.options.schemas]
      });

      if (error) {
        Logger.warn('Basic foreign key query failed, using minimal fallback');
        return [];
      }

      return this.transformForeignKeys((data || []) as any[]);

    } catch (error: any) {
      Logger.warn('Foreign key query failed:', error);
      return [];
    }
  }

  /**
   * Transform raw foreign key data to our format
   */
  private transformForeignKeys(rawData: any[]): ForeignKeyRelationship[] {
    return rawData.map(fk => ({
      constraintName: fk.constraint_name || 'unknown',
      fromTable: fk.table_name || 'unknown',
      fromColumn: fk.column_name || 'unknown',
      toTable: fk.foreign_table_name || 'unknown',
      toColumn: fk.foreign_column_name || 'unknown',
      onDelete: this.normalizeReferentialAction(fk.delete_rule || 'NO ACTION'),
      onUpdate: this.normalizeReferentialAction(fk.update_rule || 'NO ACTION'),
      isNullable: fk.is_nullable === 'YES' || fk.is_nullable === true,
      isDeferrable: fk.is_deferrable === 'YES' || fk.is_deferrable === true,
      schema: fk.table_schema || 'public'
    }));
  }

  /**
   * Get column information for metadata analysis
   */
  private async getColumnInformation(): Promise<PostgresColumn[]> {
    Logger.debug('Querying column information...');

    const { data: columns, error } = await this.client
      .from('information_schema.columns')
      .select('table_name, column_name, is_nullable, data_type')
      .in('table_schema', this.options.schemas);

    if (error) {
      Logger.warn('Failed to get column information:', error);
      return [];
    }

    // Add primary key information
    const columnsWithPK = await Promise.all(((columns || []) as any[]).map(async col => ({
      ...col,
      is_primary_key: await this.isColumnPrimaryKey(col.table_name, col.column_name)
    })));

    return columnsWithPK as PostgresColumn[];
  }

  /**
   * Check if a column is part of primary key
   */
  private async isColumnPrimaryKey(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('information_schema.key_column_usage')
        .select('constraint_name')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .in('table_schema', this.options.schemas);

      if (error || !data) return false;

      // Check if any constraint is a primary key
      for (const kcu of (data as any[])) {
        const { data: constraint } = await this.client
          .from('information_schema.table_constraints')
          .select('constraint_type')
          .eq('constraint_name', kcu.constraint_name)
          .eq('constraint_type', 'PRIMARY KEY')
          .single();

        if (constraint) return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Build dependency graph from relationships
   */
  private async buildDependencyGraph(
    tables: PostgresTable[],
    foreignKeys: ForeignKeyRelationship[],
    columns: PostgresColumn[]
  ): Promise<DependencyGraphBuilder> {
    Logger.debug('Building dependency graph...');

    const builder = new DependencyGraphBuilder();

    // Add all tables as nodes
    for (const table of tables) {
      const metadata = await this.generateTableMetadata(table, columns, foreignKeys);
      builder.addNode(table.table_name, table.table_schema, metadata);
    }

    // Add relationships as edges
    for (const fk of foreignKeys) {
      // Only add if both tables exist in our table list
      const fromExists = tables.some(t => t.table_name === fk.fromTable);
      const toExists = tables.some(t => t.table_name === fk.toTable);

      if (fromExists && toExists) {
        builder.addEdge(fk.fromTable, fk.toTable, fk);
      }
    }

    return builder;
  }

  /**
   * Generate metadata for a table
   */
  private async generateTableMetadata(
    table: PostgresTable,
    columns: PostgresColumn[],
    foreignKeys: ForeignKeyRelationship[]
  ): Promise<TableMetadata> {
    const tableColumns = columns.filter(c => c.table_name === table.table_name);
    const tableForeignKeys = foreignKeys.filter(fk => fk.fromTable === table.table_name);
    
    const primaryKeyColumns = tableColumns
      .filter(c => c.is_primary_key)
      .map(c => c.column_name);

    return {
      isJunctionTable: this.isJunctionTable(table.table_name, tableColumns, tableForeignKeys),
      isTenantScoped: this.isTenantScoped(tableColumns),
      hasTimestamps: this.hasTimestampColumns(tableColumns),
      primaryKeyColumns,
      foreignKeyCount: tableForeignKeys.length,
      estimatedSize: this.estimateTableSize(tableColumns),
      seedingComplexity: this.estimateSeedingComplexity(tableColumns, tableForeignKeys)
    };
  }

  /**
   * Check if table is a junction table
   */
  private isJunctionTable(
    tableName: string,
    columns: PostgresColumn[],
    foreignKeys: ForeignKeyRelationship[]
  ): boolean {
    // Junction table heuristics:
    // 1. Has 2 or more foreign keys
    // 2. Primary key consists only of foreign key columns
    // 3. Few or no additional columns
    
    if (foreignKeys.length < 2) return false;

    const primaryKeyColumns = columns.filter(c => c.is_primary_key).map(c => c.column_name);
    const foreignKeyColumns = foreignKeys.map(fk => fk.fromColumn);

    // Check if all PK columns are FK columns
    const allPKColumnsAreFKs = primaryKeyColumns.every(pk => foreignKeyColumns.includes(pk));
    
    // Check if table has minimal additional columns
    const nonFKColumns = columns.filter(c => 
      !foreignKeyColumns.includes(c.column_name) && 
      !['created_at', 'updated_at', 'id'].includes(c.column_name)
    );

    return allPKColumnsAreFKs && nonFKColumns.length <= 2;
  }

  /**
   * Check if table is tenant-scoped
   */
  private isTenantScoped(columns: PostgresColumn[]): boolean {
    const tenantColumns = ['account_id', 'tenant_id', 'organization_id', 'team_id'];
    return columns.some(c => tenantColumns.includes(c.column_name));
  }

  /**
   * Check if table has timestamp columns
   */
  private hasTimestampColumns(columns: PostgresColumn[]): boolean {
    const timestampColumns = ['created_at', 'updated_at', 'timestamp'];
    return columns.some(c => timestampColumns.includes(c.column_name));
  }

  /**
   * Estimate table size category
   */
  private estimateTableSize(columns: PostgresColumn[]): TableMetadata['estimatedSize'] {
    // Simple heuristic based on column count
    if (columns.length <= 5) return 'small';
    if (columns.length <= 15) return 'medium';
    return 'large';
  }

  /**
   * Estimate seeding complexity
   */
  private estimateSeedingComplexity(
    columns: PostgresColumn[],
    foreignKeys: ForeignKeyRelationship[]
  ): TableMetadata['seedingComplexity'] {
    let complexity = 0;
    
    // Add complexity for foreign keys
    complexity += foreignKeys.length * 2;
    
    // Add complexity for non-nullable columns
    complexity += columns.filter(c => c.is_nullable === 'NO').length;
    
    // Add complexity for complex data types
    const complexTypes = ['json', 'jsonb', 'array', 'geometry'];
    complexity += columns.filter(c => complexTypes.some(type => c.data_type.includes(type))).length * 3;

    if (complexity <= 5) return 'simple';
    if (complexity <= 15) return 'moderate';
    return 'complex';
  }

  /**
   * Convert foreign keys to table dependencies
   */
  private convertToTableDependencies(foreignKeys: ForeignKeyRelationship[]): TableDependency[] {
    return foreignKeys.map(fk => ({
      fromTable: fk.fromTable,
      toTable: fk.toTable,
      relationship: fk.isNullable ? 'optional' : 'required',
      foreignKey: fk,
      constraint: fk.constraintName
    }));
  }

  /**
   * Generate analysis metadata
   */
  private generateAnalysisMetadata(
    tables: PostgresTable[],
    foreignKeys: ForeignKeyRelationship[],
    dependencyGraph: DependencyGraphBuilder,
    startTime: number,
    cacheHit: boolean
  ): AnalysisMetadata {
    const graph = dependencyGraph.build();
    
    return {
      tablesAnalyzed: tables.length,
      relationshipsFound: foreignKeys.length,
      junctionTablesDetected: graph.nodes
        .filter(n => n.metadata.isJunctionTable)
        .map(n => n.table),
      tenantScopedTables: graph.nodes
        .filter(n => n.metadata.isTenantScoped)
        .map(n => n.table),
      circularDependencies: graph.cycles.length,
      maxDependencyDepth: graph.metadata.maxDepth,
      analysisTimestamp: new Date().toISOString(),
      confidence: graph.metadata.confidence,
      cacheHit
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(dependencyGraph: DependencyGraphBuilder): string[] {
    const graph = dependencyGraph.build();
    const recommendations: string[] = [];

    if (graph.cycles.length > 0) {
      recommendations.push(`Found ${graph.cycles.length} circular dependencies - consider using nullable foreign keys`);
    }

    const junctionTables = graph.nodes.filter(n => n.metadata.isJunctionTable);
    if (junctionTables.length > 0) {
      recommendations.push(`Detected ${junctionTables.length} junction tables - ensure proper many-to-many handling`);
    }

    if (graph.metadata.maxDepth > 5) {
      recommendations.push('Deep dependency chain detected - consider flattening schema design');
    }

    const tenantTables = graph.nodes.filter(n => n.metadata.isTenantScoped);
    if (tenantTables.length > 0) {
      recommendations.push(`${tenantTables.length} tenant-scoped tables detected - enable multi-tenant mode`);
    }

    return recommendations;
  }

  /**
   * Normalize referential action strings
   */
  private normalizeReferentialAction(action: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT' {
    const normalized = action.toUpperCase().trim();
    switch (normalized) {
      case 'CASCADE': return 'CASCADE';
      case 'SET NULL': return 'SET NULL';
      case 'RESTRICT': return 'RESTRICT';
      case 'SET DEFAULT': return 'SET DEFAULT';
      default: return 'NO ACTION';
    }
  }

  /**
   * Create empty dependency graph for error cases
   */
  private createEmptyGraph(): DependencyGraph {
    const builder = new DependencyGraphBuilder();
    return builder.build();
  }

  /**
   * Generate cache key for results
   */
  private generateCacheKey(): string {
    const keyData = {
      schemas: this.options.schemas.sort(),
      includes: this.options.includeTables.sort(),
      excludes: this.options.excludeTables.sort(),
      options: {
        junctions: this.options.detectJunctionTables,
        tenant: this.options.analyzeTenantScoping,
        optional: this.options.includeOptionalRelationships
      }
    };
    
    return `relationship_analysis_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    Logger.debug('Relationship analysis cache cleared');
  }

  /**
   * Get dependency graph for specific tables
   */
  async getDependencyGraphForTables(tableNames: string[]): Promise<DependencyGraph> {
    const analysis = await this.analyzeRelationships();
    
    if (!analysis.success) {
      throw new Error('Failed to analyze relationships');
    }

    // Filter graph to only include specified tables
    const filteredBuilder = new DependencyGraphBuilder();
    
    // Add nodes for specified tables
    for (const node of analysis.dependencyGraph.nodes) {
      if (tableNames.includes(node.table)) {
        filteredBuilder.addNode(node.table, node.schema, node.metadata);
      }
    }

    // Add edges between specified tables
    for (const fk of analysis.foreignKeyRelationships) {
      if (tableNames.includes(fk.fromTable) && tableNames.includes(fk.toTable)) {
        filteredBuilder.addEdge(fk.fromTable, fk.toTable, fk);
      }
    }

    return filteredBuilder.build();
  }
}