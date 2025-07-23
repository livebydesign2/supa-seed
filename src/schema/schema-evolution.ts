/**
 * Schema Evolution and Change Detection System
 * Phase 4, Checkpoint D1 - Intelligent schema change detection and migration support
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SchemaInfo, SchemaAdapter } from '../schema-adapter';
import { Logger } from '../utils/logger';

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  constraints: ConstraintSchema[];
  indexes: IndexSchema[];
  triggers: TriggerSchema[];
  policies: PolicySchema[];
  relationships: RelationshipSchema[];
  metadata: {
    created: Date;
    modified: Date;
    owner: string;
    comment?: string;
  };
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  enumValues?: string[];
  comment?: string;
}

export interface ConstraintSchema {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  onUpdate?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  onDelete?: 'CASCADE' | 'SET NULL' | 'SET DEFAULT' | 'RESTRICT' | 'NO ACTION';
  checkCondition?: string;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  isUnique: boolean;
  type: 'btree' | 'hash' | 'gist' | 'gin';
  where?: string;
  partial: boolean;
}

export interface TriggerSchema {
  name: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  function: string;
  condition?: string;
}

export interface PolicySchema {
  name: string;
  command: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  roles: string[];
  using?: string;
  check?: string;
  permissive: boolean;
}

export interface RelationshipSchema {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many' | 'self-referencing';
  fromTable: string;
  fromColumns: string[];
  toTable: string;
  toColumns: string[];
  cascadeDelete: boolean;
  cascadeUpdate: boolean;
}

export interface SchemaSnapshot {
  id: string;
  timestamp: Date;
  version: string;
  tables: Map<string, TableSchema>;
  functions: Map<string, FunctionSchema>;
  types: Map<string, TypeSchema>;
  extensions: string[];
  metadata: {
    databaseVersion: string;
    capturedBy: string;
    environment: string;
    description?: string;
  };
}

export interface FunctionSchema {
  name: string;
  schema: string;
  returnType: string;
  parameters: ParameterSchema[];
  language: string;
  body: string;
  security: 'DEFINER' | 'INVOKER';
  volatility: 'VOLATILE' | 'STABLE' | 'IMMUTABLE';
}

export interface ParameterSchema {
  name: string;
  type: string;
  mode: 'IN' | 'OUT' | 'INOUT';
  defaultValue?: any;
}

export interface TypeSchema {
  name: string;
  schema: string;
  type: 'enum' | 'composite' | 'domain';
  definition: string;
  values?: string[];
  baseType?: string;
}

export interface SchemaChange {
  id: string;
  type: 'TABLE_ADDED' | 'TABLE_REMOVED' | 'TABLE_RENAMED' | 
        'COLUMN_ADDED' | 'COLUMN_REMOVED' | 'COLUMN_MODIFIED' | 'COLUMN_RENAMED' |
        'CONSTRAINT_ADDED' | 'CONSTRAINT_REMOVED' | 'CONSTRAINT_MODIFIED' |
        'INDEX_ADDED' | 'INDEX_REMOVED' | 'INDEX_MODIFIED' |
        'TRIGGER_ADDED' | 'TRIGGER_REMOVED' | 'TRIGGER_MODIFIED' |
        'POLICY_ADDED' | 'POLICY_REMOVED' | 'POLICY_MODIFIED' |
        'FUNCTION_ADDED' | 'FUNCTION_REMOVED' | 'FUNCTION_MODIFIED' |
        'TYPE_ADDED' | 'TYPE_REMOVED' | 'TYPE_MODIFIED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: 'NONE' | 'COMPATIBLE' | 'BREAKING' | 'DATA_LOSS';
  tableName?: string;
  columnName?: string;
  constraintName?: string;
  objectName?: string;
  before?: any;
  after?: any;
  description: string;
  recommendations: string[];
  migrationRequired: boolean;
  dataBackupRequired: boolean;
}

export interface ConfigurationImpact {
  configFile: string;
  affectedSections: string[];
  changes: ConfigurationChange[];
  migrationNeeded: boolean;
  backupRecommended: boolean;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTENSIVE';
}

export interface ConfigurationChange {
  section: string;
  field: string;
  currentValue: any;
  suggestedValue: any;
  reason: string;
  required: boolean;
  breaking: boolean;
}

export interface MigrationSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'AUTOMATIC' | 'SEMI_AUTOMATIC' | 'MANUAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedChanges: string[];
  steps: MigrationStep[];
  estimatedTime: number; // minutes
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  prerequisites: string[];
  rollbackPlan: string[];
}

export interface MigrationStep {
  order: number;
  title: string;
  description: string;
  type: 'SQL' | 'CONFIG' | 'CODE' | 'MANUAL' | 'VALIDATION';
  command?: string;
  configPath?: string;
  configChanges?: Record<string, any>;
  validation?: string;
  rollbackCommand?: string;
  estimated_minutes: number;
}

export class SchemaEvolutionEngine {
  private supabase: SupabaseClient;
  private schemaAdapter: SchemaAdapter;
  private snapshots: Map<string, SchemaSnapshot> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.schemaAdapter = new SchemaAdapter(supabase as any);
  }

  /**
   * Capture a complete schema snapshot
   */
  async captureSchemaSnapshot(version?: string, description?: string): Promise<SchemaSnapshot> {
    Logger.info('📸 Capturing schema snapshot...');
    
    const timestamp = new Date();
    const snapshotId = `snapshot-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tables = await this.captureTables();
    const functions = await this.captureFunctions();
    const types = await this.captureTypes();
    const extensions = await this.captureExtensions();
    const databaseVersion = await this.getDatabaseVersion();

    const snapshot: SchemaSnapshot = {
      id: snapshotId,
      timestamp,
      version: version || '1.0.0',
      tables,
      functions,
      types,
      extensions,
      metadata: {
        databaseVersion,
        capturedBy: 'supa-seed-evolution-engine',
        environment: process.env.NODE_ENV || 'development',
        description
      }
    };

    this.snapshots.set(snapshotId, snapshot);
    
    Logger.info(`✅ Schema snapshot captured: ${snapshotId} (${tables.size} tables, ${functions.size} functions)`);
    
    return snapshot;
  }

  /**
   * Compare two schema snapshots to detect changes
   */
  async compareSchemas(
    beforeSnapshot: SchemaSnapshot, 
    afterSnapshot: SchemaSnapshot
  ): Promise<SchemaChange[]> {
    Logger.info(`🔍 Comparing schemas: ${beforeSnapshot.id} → ${afterSnapshot.id}`);
    
    const changes: SchemaChange[] = [];
    
    // Compare tables
    changes.push(...this.compareTableSchemas(beforeSnapshot.tables, afterSnapshot.tables));
    
    // Compare functions
    changes.push(...this.compareFunctionSchemas(beforeSnapshot.functions, afterSnapshot.functions));
    
    // Compare types
    changes.push(...this.compareTypeSchemas(beforeSnapshot.types, afterSnapshot.types));
    
    // Compare extensions
    changes.push(...this.compareExtensions(beforeSnapshot.extensions, afterSnapshot.extensions));
    
    Logger.info(`🔍 Schema comparison complete: ${changes.length} changes detected`);
    
    return changes;
  }

  /**
   * Analyze the impact of schema changes on existing configurations
   */
  async analyzeConfigurationImpact(
    changes: SchemaChange[],
    configurationPaths: string[] = ['supa-seed.config.js', 'seeds/']
  ): Promise<ConfigurationImpact[]> {
    Logger.info('📊 Analyzing configuration impact...');
    
    const impacts: ConfigurationImpact[] = [];
    
    for (const configPath of configurationPaths) {
      const impact = await this.analyzeConfigurationFile(configPath, changes);
      if (impact.changes.length > 0) {
        impacts.push(impact);
      }
    }
    
    Logger.info(`📊 Configuration impact analysis complete: ${impacts.length} files affected`);
    
    return impacts;
  }

  /**
   * Generate migration suggestions based on detected changes
   */
  generateMigrationSuggestions(
    changes: SchemaChange[],
    impacts: ConfigurationImpact[]
  ): MigrationSuggestion[] {
    Logger.info('🎯 Generating migration suggestions...');
    
    const suggestions: MigrationSuggestion[] = [];
    
    // Group changes by type and severity
    const groupedChanges = this.groupChangesByType(changes);
    
    // Generate automatic migrations for safe changes
    suggestions.push(...this.generateAutomaticMigrations(groupedChanges));
    
    // Generate semi-automatic migrations for moderate changes
    suggestions.push(...this.generateSemiAutomaticMigrations(groupedChanges, impacts));
    
    // Generate manual migrations for complex changes
    suggestions.push(...this.generateManualMigrations(groupedChanges, impacts));
    
    // Sort by priority and risk
    suggestions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });
    
    Logger.info(`🎯 Generated ${suggestions.length} migration suggestions`);
    
    return suggestions;
  }

  /**
   * Detect schema changes by comparing current schema with a previous snapshot
   */
  async detectSchemaChanges(previousSnapshotId?: string): Promise<{
    changes: SchemaChange[];
    impacts: ConfigurationImpact[];
    suggestions: MigrationSuggestion[];
    currentSnapshot: SchemaSnapshot;
  }> {
    Logger.info('🔎 Starting schema change detection...');
    
    // Capture current schema
    const currentSnapshot = await this.captureSchemaSnapshot();
    
    let changes: SchemaChange[] = [];
    let impacts: ConfigurationImpact[] = [];
    let suggestions: MigrationSuggestion[] = [];
    
    if (previousSnapshotId && this.snapshots.has(previousSnapshotId)) {
      const previousSnapshot = this.snapshots.get(previousSnapshotId)!;
      
      // Compare schemas
      changes = await this.compareSchemas(previousSnapshot, currentSnapshot);
      
      if (changes.length > 0) {
        // Analyze impact on configurations
        impacts = await this.analyzeConfigurationImpact(changes);
        
        // Generate migration suggestions
        suggestions = this.generateMigrationSuggestions(changes, impacts);
      }
    } else {
      Logger.info('No previous snapshot found - this will be the baseline');
    }
    
    Logger.info(`🔎 Schema change detection complete: ${changes.length} changes, ${impacts.length} impacts, ${suggestions.length} suggestions`);
    
    return {
      changes,
      impacts,
      suggestions,
      currentSnapshot
    };
  }

  /**
   * Capture all table schemas from the database
   */
  private async captureTables(): Promise<Map<string, TableSchema>> {
    const tables = new Map<string, TableSchema>();
    
    try {
      // Get all table names
      const { data: tableData, error: tableError } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (tableError) {
        Logger.warn(`Failed to fetch tables: ${tableError.message}`);
        return tables;
      }
      
      // Capture schema for each table
      for (const table of tableData || []) {
        try {
          const tableSchema = await this.captureTableSchema(table.table_name);
          tables.set(table.table_name, tableSchema);
        } catch (error: any) {
          Logger.warn(`Failed to capture schema for table ${table.table_name}: ${error.message}`);
        }
      }
    } catch (error: any) {
      Logger.warn(`Failed to capture tables: ${error.message}`);
    }
    
    return tables;
  }

  /**
   * Capture schema for a specific table
   */
  private async captureTableSchema(tableName: string): Promise<TableSchema> {
    const [columns, constraints, indexes, triggers, policies, relationships] = await Promise.all([
      this.captureTableColumns(tableName),
      this.captureTableConstraints(tableName),
      this.captureTableIndexes(tableName),
      this.captureTableTriggers(tableName),
      this.captureTablePolicies(tableName),
      this.captureTableRelationships(tableName)
    ]);

    return {
      name: tableName,
      columns,
      constraints,
      indexes,
      triggers,
      policies,
      relationships,
      metadata: {
        created: new Date(), // Would be fetched from pg_class in real implementation
        modified: new Date(),
        owner: 'postgres', // Would be fetched from pg_class
        comment: undefined
      }
    };
  }

  /**
   * Capture column information for a table
   */
  private async captureTableColumns(tableName: string): Promise<ColumnSchema[]> {
    const { data, error } = await this.supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position');
    
    if (error) {
      Logger.warn(`Failed to fetch columns for ${tableName}: ${error.message}`);
      return [];
    }
    
    return (data || []).map(col => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      defaultValue: col.column_default,
      isPrimaryKey: false, // Would be determined from constraints
      isForeignKey: false, // Would be determined from constraints
      isUnique: false, // Would be determined from constraints
      maxLength: col.character_maximum_length,
      precision: col.numeric_precision,
      scale: col.numeric_scale,
      comment: undefined
    }));
  }

  /**
   * Capture constraint information for a table
   */
  private async captureTableConstraints(tableName: string): Promise<ConstraintSchema[]> {
    // This would query information_schema.table_constraints and related views
    // For now, return empty array as it requires complex SQL queries
    return [];
  }

  /**
   * Capture index information for a table
   */
  private async captureTableIndexes(tableName: string): Promise<IndexSchema[]> {
    // This would query pg_indexes and related system tables
    // For now, return empty array as it requires complex SQL queries
    return [];
  }

  /**
   * Capture trigger information for a table
   */
  private async captureTableTriggers(tableName: string): Promise<TriggerSchema[]> {
    // This would query information_schema.triggers
    // For now, return empty array as it requires complex SQL queries
    return [];
  }

  /**
   * Capture RLS policy information for a table
   */
  private async captureTablePolicies(tableName: string): Promise<PolicySchema[]> {
    // This would query pg_policies
    // For now, return empty array as it requires complex SQL queries
    return [];
  }

  /**
   * Capture relationship information for a table
   */
  private async captureTableRelationships(tableName: string): Promise<RelationshipSchema[]> {
    // This would analyze foreign key constraints to build relationships
    // For now, return empty array as it requires complex SQL queries
    return [];
  }

  /**
   * Capture all function schemas
   */
  private async captureFunctions(): Promise<Map<string, FunctionSchema>> {
    // This would query information_schema.routines
    // For now, return empty map as it requires complex SQL queries
    return new Map();
  }

  /**
   * Capture all custom type schemas
   */
  private async captureTypes(): Promise<Map<string, TypeSchema>> {
    // This would query pg_type and related system tables
    // For now, return empty map as it requires complex SQL queries
    return new Map();
  }

  /**
   * Capture installed extensions
   */
  private async captureExtensions(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('pg_extension')
        .select('extname');
      
      if (error) {
        Logger.warn(`Failed to fetch extensions: ${error.message}`);
        return [];
      }
      
      return (data || []).map(ext => ext.extname);
    } catch (error: any) {
      Logger.warn(`Failed to capture extensions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get database version
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('version');
      
      if (error) {
        Logger.warn(`Failed to get database version: ${error.message}`);
        return 'unknown';
      }
      
      return data || 'unknown';
    } catch (error: any) {
      Logger.warn(`Failed to get database version: ${error.message}`);
      return 'unknown';
    }
  }

  /**
   * Compare table schemas between two snapshots
   */
  private compareTableSchemas(
    beforeTables: Map<string, TableSchema>,
    afterTables: Map<string, TableSchema>
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Check for added tables
    for (const [tableName, tableSchema] of afterTables) {
      if (!beforeTables.has(tableName)) {
        changes.push({
          id: `table-added-${tableName}`,
          type: 'TABLE_ADDED',
          severity: 'MEDIUM',
          impact: 'COMPATIBLE',
          tableName,
          after: tableSchema,
          description: `Table '${tableName}' was added`,
          recommendations: [
            'Update seeding configurations to include the new table',
            'Consider adding seed data for the new table'
          ],
          migrationRequired: true,
          dataBackupRequired: false
        });
      }
    }
    
    // Check for removed tables
    for (const [tableName, tableSchema] of beforeTables) {
      if (!afterTables.has(tableName)) {
        changes.push({
          id: `table-removed-${tableName}`,
          type: 'TABLE_REMOVED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName,
          before: tableSchema,
          description: `Table '${tableName}' was removed`,
          recommendations: [
            'Remove references to this table from seeding configurations',
            'Consider data migration if table contained important data'
          ],
          migrationRequired: true,
          dataBackupRequired: true
        });
      }
    }
    
    // Check for modified tables
    for (const [tableName, afterTable] of afterTables) {
      if (beforeTables.has(tableName)) {
        const beforeTable = beforeTables.get(tableName)!;
        changes.push(...this.compareTableColumns(tableName, beforeTable.columns, afterTable.columns));
      }
    }
    
    return changes;
  }

  /**
   * Compare columns between two table schemas
   */
  private compareTableColumns(
    tableName: string,
    beforeColumns: ColumnSchema[],
    afterColumns: ColumnSchema[]
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];
    const beforeColMap = new Map(beforeColumns.map(col => [col.name, col]));
    const afterColMap = new Map(afterColumns.map(col => [col.name, col]));
    
    // Check for added columns
    for (const [colName, colSchema] of afterColMap) {
      if (!beforeColMap.has(colName)) {
        changes.push({
          id: `column-added-${tableName}-${colName}`,
          type: 'COLUMN_ADDED',
          severity: 'LOW',
          impact: colSchema.nullable ? 'COMPATIBLE' : 'BREAKING',
          tableName,
          columnName: colName,
          after: colSchema,
          description: `Column '${colName}' was added to table '${tableName}'`,
          recommendations: colSchema.nullable ? [
            'No immediate action required - column is nullable'
          ] : [
            'Update seeding data to provide values for the new non-nullable column',
            'Consider adding a default value to the column'
          ],
          migrationRequired: !colSchema.nullable,
          dataBackupRequired: false
        });
      }
    }
    
    // Check for removed columns
    for (const [colName, colSchema] of beforeColMap) {
      if (!afterColMap.has(colName)) {
        changes.push({
          id: `column-removed-${tableName}-${colName}`,
          type: 'COLUMN_REMOVED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName,
          columnName: colName,
          before: colSchema,
          description: `Column '${colName}' was removed from table '${tableName}'`,
          recommendations: [
            'Remove references to this column from seeding configurations',
            'Update any asset mappings that use this column'
          ],
          migrationRequired: true,
          dataBackupRequired: true
        });
      }
    }
    
    // Check for modified columns
    for (const [colName, afterCol] of afterColMap) {
      if (beforeColMap.has(colName)) {
        const beforeCol = beforeColMap.get(colName)!;
        const colChanges = this.compareColumnProperties(tableName, colName, beforeCol, afterCol);
        changes.push(...colChanges);
      }
    }
    
    return changes;
  }

  /**
   * Compare properties of two column schemas
   */
  private compareColumnProperties(
    tableName: string,
    columnName: string,
    beforeCol: ColumnSchema,
    afterCol: ColumnSchema
  ): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    // Check for type changes
    if (beforeCol.type !== afterCol.type) {
      changes.push({
        id: `column-type-changed-${tableName}-${columnName}`,
        type: 'COLUMN_MODIFIED',
        severity: 'HIGH',
        impact: 'BREAKING',
        tableName,
        columnName,
        before: beforeCol.type,
        after: afterCol.type,
        description: `Column '${columnName}' type changed from ${beforeCol.type} to ${afterCol.type}`,
        recommendations: [
          'Review and update seeding data to match the new column type',
          'Test data type conversions to ensure compatibility'
        ],
        migrationRequired: true,
        dataBackupRequired: true
      });
    }
    
    // Check for nullable changes
    if (beforeCol.nullable !== afterCol.nullable) {
      changes.push({
        id: `column-nullable-changed-${tableName}-${columnName}`,
        type: 'COLUMN_MODIFIED',
        severity: afterCol.nullable ? 'LOW' : 'MEDIUM',
        impact: afterCol.nullable ? 'COMPATIBLE' : 'BREAKING',
        tableName,
        columnName,
        before: beforeCol.nullable,
        after: afterCol.nullable,
        description: `Column '${columnName}' nullable changed from ${beforeCol.nullable} to ${afterCol.nullable}`,
        recommendations: afterCol.nullable ? [
          'Column can now accept null values - no immediate action required'
        ] : [
          'Column now requires non-null values - ensure seeding data provides values',
          'Consider adding a default value if appropriate'
        ],
        migrationRequired: !afterCol.nullable,
        dataBackupRequired: false
      });
    }
    
    return changes;
  }

  /**
   * Compare function schemas (placeholder)
   */
  private compareFunctionSchemas(
    beforeFunctions: Map<string, FunctionSchema>,
    afterFunctions: Map<string, FunctionSchema>
  ): SchemaChange[] {
    // Function comparison would be implemented here
    return [];
  }

  /**
   * Compare type schemas (placeholder)
   */
  private compareTypeSchemas(
    beforeTypes: Map<string, TypeSchema>,
    afterTypes: Map<string, TypeSchema>
  ): SchemaChange[] {
    // Type comparison would be implemented here
    return [];
  }

  /**
   * Compare extensions
   */
  private compareExtensions(beforeExts: string[], afterExts: string[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    const beforeSet = new Set(beforeExts);
    const afterSet = new Set(afterExts);
    
    // Check for added extensions
    for (const ext of afterExts) {
      if (!beforeSet.has(ext)) {
        changes.push({
          id: `extension-added-${ext}`,
          type: 'TYPE_ADDED', // Using TYPE_ADDED as placeholder
          severity: 'LOW',
          impact: 'COMPATIBLE',
          objectName: ext,
          after: ext,
          description: `Extension '${ext}' was added`,
          recommendations: ['No action required - extension additions are typically safe'],
          migrationRequired: false,
          dataBackupRequired: false
        });
      }
    }
    
    // Check for removed extensions
    for (const ext of beforeExts) {
      if (!afterSet.has(ext)) {
        changes.push({
          id: `extension-removed-${ext}`,
          type: 'TYPE_REMOVED', // Using TYPE_REMOVED as placeholder
          severity: 'MEDIUM',
          impact: 'BREAKING',
          objectName: ext,
          before: ext,
          description: `Extension '${ext}' was removed`,
          recommendations: [
            'Ensure no seeding logic depends on this extension',
            'Review any custom functions that might use this extension'
          ],
          migrationRequired: true,
          dataBackupRequired: false
        });
      }
    }
    
    return changes;
  }

  /**
   * Analyze impact on a specific configuration file
   */
  private async analyzeConfigurationFile(
    configPath: string,
    changes: SchemaChange[]
  ): Promise<ConfigurationImpact> {
    // This would analyze actual configuration files
    // For now, return a basic impact analysis
    const affectedChanges = changes.filter(change => 
      change.impact === 'BREAKING' || change.migrationRequired
    );
    
    const configChanges: ConfigurationChange[] = affectedChanges.map(change => ({
      section: 'seeders',
      field: change.tableName || change.objectName || 'unknown',
      currentValue: change.before,
      suggestedValue: change.after,
      reason: change.description,
      required: change.migrationRequired,
      breaking: change.impact === 'BREAKING'
    }));
    
    return {
      configFile: configPath,
      affectedSections: ['seeders', 'mappings'],
      changes: configChanges,
      migrationNeeded: configChanges.some(c => c.required),
      backupRecommended: changes.some(c => c.dataBackupRequired),
      estimatedEffort: configChanges.length > 5 ? 'HIGH' : 
                      configChanges.length > 2 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Group changes by type for easier processing
   */
  private groupChangesByType(changes: SchemaChange[]): Map<string, SchemaChange[]> {
    const grouped = new Map<string, SchemaChange[]>();
    
    for (const change of changes) {
      const key = change.type;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(change);
    }
    
    return grouped;
  }

  /**
   * Generate automatic migration suggestions
   */
  private generateAutomaticMigrations(groupedChanges: Map<string, SchemaChange[]>): MigrationSuggestion[] {
    const suggestions: MigrationSuggestion[] = [];
    
    // Handle added nullable columns automatically
    const addedColumns = groupedChanges.get('COLUMN_ADDED') || [];
    const nullableColumns = addedColumns.filter(c => c.impact === 'COMPATIBLE');
    
    if (nullableColumns.length > 0) {
      suggestions.push({
        id: 'auto-nullable-columns',
        title: 'Handle New Nullable Columns',
        description: 'Automatically update configurations for new nullable columns',
        type: 'AUTOMATIC',
        priority: 'LOW',
        affectedChanges: nullableColumns.map(c => c.id),
        steps: [{
          order: 1,
          title: 'Update Configuration',
          description: 'Add new nullable columns to seeding configurations with optional mappings',
          type: 'CONFIG',
          estimated_minutes: 5
        }],
        estimatedTime: 5,
        riskLevel: 'LOW',
        prerequisites: [],
        rollbackPlan: ['Remove added column mappings from configuration']
      });
    }
    
    return suggestions;
  }

  /**
   * Generate semi-automatic migration suggestions
   */
  private generateSemiAutomaticMigrations(
    groupedChanges: Map<string, SchemaChange[]>,
    impacts: ConfigurationImpact[]
  ): MigrationSuggestion[] {
    const suggestions: MigrationSuggestion[] = [];
    
    // Handle removed tables
    const removedTables = groupedChanges.get('TABLE_REMOVED') || [];
    
    if (removedTables.length > 0) {
      suggestions.push({
        id: 'semi-auto-removed-tables',
        title: 'Handle Removed Tables',
        description: 'Update configurations to remove references to deleted tables',
        type: 'SEMI_AUTOMATIC',
        priority: 'HIGH',
        affectedChanges: removedTables.map(c => c.id),
        steps: [
          {
            order: 1,
            title: 'Backup Affected Configurations',
            description: 'Create backups of configuration files that reference removed tables',
            type: 'MANUAL',
            estimated_minutes: 10
          },
          {
            order: 2,
            title: 'Remove Table References',
            description: 'Automatically remove references to deleted tables from configurations',
            type: 'CONFIG',
            estimated_minutes: 5
          },
          {
            order: 3,
            title: 'Validate Configuration',
            description: 'Validate updated configurations',
            type: 'VALIDATION',
            validation: 'Run configuration validation to ensure no broken references remain',
            estimated_minutes: 5
          }
        ],
        estimatedTime: 20,
        riskLevel: 'MEDIUM',
        prerequisites: ['Configuration backups'],
        rollbackPlan: ['Restore configuration backups', 'Re-add table references if needed']
      });
    }
    
    return suggestions;
  }

  /**
   * Generate manual migration suggestions
   */
  private generateManualMigrations(
    groupedChanges: Map<string, SchemaChange[]>,
    impacts: ConfigurationImpact[]
  ): MigrationSuggestion[] {
    const suggestions: MigrationSuggestion[] = [];
    
    // Handle column type changes
    const modifiedColumns = groupedChanges.get('COLUMN_MODIFIED') || [];
    const typeChanges = modifiedColumns.filter(c => c.description.includes('type changed'));
    
    if (typeChanges.length > 0) {
      suggestions.push({
        id: 'manual-column-types',
        title: 'Handle Column Type Changes',
        description: 'Manually review and update seeding data for changed column types',
        type: 'MANUAL',
        priority: 'HIGH',
        affectedChanges: typeChanges.map(c => c.id),
        steps: [
          {
            order: 1,
            title: 'Review Type Changes',
            description: 'Review all column type changes and their impact on existing data',
            type: 'MANUAL',
            estimated_minutes: 30
          },
          {
            order: 2,
            title: 'Update Seed Data',
            description: 'Update seed data files to match new column types',
            type: 'CODE',
            estimated_minutes: 60
          },
          {
            order: 3,
            title: 'Test Data Conversion',
            description: 'Test that existing data can be converted to new types',
            type: 'VALIDATION',
            validation: 'Run test seeding with updated data to ensure compatibility',
            estimated_minutes: 15
          }
        ],
        estimatedTime: 105,
        riskLevel: 'HIGH',
        prerequisites: ['Database backup', 'Test environment'],
        rollbackPlan: [
          'Restore database from backup if needed',
          'Revert seed data changes',
          'Contact database administrator for schema rollback'
        ]
      });
    }
    
    return suggestions;
  }

  /**
   * Get all captured snapshots
   */
  getSnapshots(): SchemaSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Get a specific snapshot by ID
   */
  getSnapshot(snapshotId: string): SchemaSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Clear all snapshots (useful for testing)
   */
  clearSnapshots(): void {
    this.snapshots.clear();
  }
}