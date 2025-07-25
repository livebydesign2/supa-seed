/**
 * Schema Evolution Detection System for Epic 7: Configuration Extensibility Framework
 * Detects and handles database schema changes over time
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { ExtendedSeedConfig } from '../config-types';

type SupabaseClient = ReturnType<typeof createClient>;

export interface SchemaSnapshot {
  version: string;
  timestamp: string;
  trackingMode: 'hash' | 'timestamp' | 'version';
  tables: TableSnapshot[];
  constraints: ConstraintSnapshot[];
  indexes: IndexSnapshot[];
  functions: FunctionSnapshot[];
  triggers: TriggerSnapshot[];
  metadata: {
    capturedBy: string;
    environment?: string;
    notes?: string;
  };
}

export interface TableSnapshot {
  name: string;
  schema: string;
  columns: ColumnSnapshot[];
  primaryKey?: string[];
  foreignKeys: ForeignKeySnapshot[];
  rowCount?: number;
}

export interface ColumnSnapshot {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  characterMaximumLength?: number;
  numericPrecision?: number;
  numericScale?: number;
}

export interface ConstraintSnapshot {
  name: string;
  table: string;
  schema: string;
  type: 'check' | 'foreign_key' | 'unique' | 'primary_key' | 'not_null';
  definition: string;
  columns: string[];
}

export interface IndexSnapshot {
  name: string;
  table: string;
  schema: string;
  columns: string[];
  isUnique: boolean;
  indexType: string;
}

export interface FunctionSnapshot {
  name: string;
  schema: string;
  returnType: string;
  arguments: Array<{ name: string; type: string; mode?: string }>;
  language: string;
  definition?: string;
}

export interface TriggerSnapshot {
  name: string;
  table: string;
  schema: string;
  event: string;
  timing: string;
  functionName: string;
}

export interface SchemaChange {
  type: 'table_added' | 'table_removed' | 'column_added' | 'column_removed' | 'column_modified' | 
        'constraint_added' | 'constraint_removed' | 'constraint_modified' |
        'index_added' | 'index_removed' | 'index_modified' |
        'function_added' | 'function_removed' | 'function_modified' |
        'trigger_added' | 'trigger_removed' | 'trigger_modified';
  table?: string;
  column?: string;
  constraint?: string;
  index?: string;
  function?: string;
  trigger?: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  breakingChange: boolean;
  migrationRequired: boolean;
  suggestedAction?: string;
}

export interface ForeignKeySnapshot {
  constraintName: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: string;
  onUpdate?: string;
}

export interface SchemaEvolutionResult {
  hasChanged: boolean;
  changes: SchemaChange[];
  schemaVersion: string;
  previousVersion: string;
  migrationRequired: boolean;
  recommendations: string[];
  breakingChanges: SchemaChange[];
}

export class SchemaEvolutionDetector {
  private client: SupabaseClient;
  private cacheLocation: string;

  constructor(client: SupabaseClient, cacheLocation: string = '.supa-seed-cache') {
    this.client = client;
    this.cacheLocation = path.resolve(cacheLocation);
  }

  /**
   * Detect schema evolution by comparing current schema with cached snapshot
   */
  async detectEvolution(config: ExtendedSeedConfig): Promise<SchemaEvolutionResult> {
    if (!config.schemaEvolution?.enabled) {
      return {
        hasChanged: false,
        changes: [],
        schemaVersion: 'unknown',
        previousVersion: 'unknown',
        migrationRequired: false,
        recommendations: ['Schema evolution detection is disabled'],
        breakingChanges: []
      };
    }

    Logger.info('🔄 Detecting schema evolution...');

    try {
      // Capture current schema snapshot
      const currentSnapshot = await this.captureSchemaSnapshot(config);
      
      // Load previous snapshot
      const previousSnapshot = await this.loadPreviousSnapshot();
      
      // Compare snapshots
      const changes = previousSnapshot ? 
        this.compareSnapshots(previousSnapshot, currentSnapshot) : [];
      
      // Save current snapshot
      await this.saveSnapshot(currentSnapshot);
      
      // Analyze changes
      const breakingChanges = changes.filter(change => change.breakingChange);
      const migrationRequired = changes.some(change => change.migrationRequired) || 
                               config.schemaEvolution.autoMigration;
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(changes, config);
      
      Logger.info(`📊 Schema evolution detection completed: ${changes.length} changes detected`);
      
      return {
        hasChanged: changes.length > 0,
        changes,
        schemaVersion: currentSnapshot.version,
        previousVersion: previousSnapshot?.version || 'none',
        migrationRequired,
        recommendations,
        breakingChanges
      };
      
    } catch (error: any) {
      Logger.error('Schema evolution detection failed:', error);
      throw new Error(`Schema evolution detection failed: ${error.message}`);
    }
  }

  /**
   * Capture comprehensive database schema snapshot
   */
  async captureSchemaSnapshot(config: ExtendedSeedConfig): Promise<SchemaSnapshot> {
    Logger.debug('📸 Capturing schema snapshot...');

    const tables = await this.captureTables();
    const constraints = await this.captureConstraints();
    const indexes = await this.captureIndexes();
    const functions = await this.captureFunctions();
    const triggers = await this.captureTriggers();

    const snapshot: SchemaSnapshot = {
      version: this.generateVersion(config.schemaEvolution!.trackingMode, { tables, constraints, indexes, functions, triggers }),
      timestamp: new Date().toISOString(),
      trackingMode: config.schemaEvolution!.trackingMode,
      tables,
      constraints,
      indexes,
      functions,
      triggers,
      metadata: {
        capturedBy: 'supa-seed-schema-evolution-detector',
        environment: config.environment,
        notes: `Captured via ${config.schemaEvolution!.trackingMode} tracking mode`
      }
    };

    Logger.debug(`✅ Schema snapshot captured: ${tables.length} tables, ${constraints.length} constraints`);
    return snapshot;
  }

  /**
   * Capture table information from database
   */
  private async captureTables(): Promise<TableSnapshot[]> {
    const { data: tables, error } = await this.client
      .rpc('get_table_info')
      .then(result => result)
      .catch(() => this.fallbackGetTables());

    if (error) {
      Logger.warn('Failed to capture tables via RPC, using fallback method');
      return this.fallbackGetTables();
    }

    const tableSnapshots: TableSnapshot[] = [];

    for (const table of tables || []) {
      const columns = await this.captureTableColumns(table.table_name);
      const foreignKeys = await this.captureTableForeignKeys(table.table_name);
      
      tableSnapshots.push({
        name: table.table_name,
        schema: table.table_schema || 'public',
        columns,
        primaryKey: table.primary_key ? table.primary_key.split(',') : undefined,
        foreignKeys,
        rowCount: table.row_count
      });
    }

    return tableSnapshots;
  }

  /**
   * Fallback method to get tables using information_schema
   */
  private async fallbackGetTables(): Promise<any[]> {
    const query = `
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });
      if (error) throw error;
      return data || [];
    } catch (error) {
      Logger.warn('Fallback table capture also failed, returning empty array');
      return [];
    }
  }

  /**
   * Capture column information for a specific table
   */
  private async captureTableColumns(tableName: string): Promise<ColumnSnapshot[]> {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns 
      WHERE table_name = $1 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { 
        query, 
        params: [tableName] 
      });
      
      if (error) throw error;

      return (data || []).map((col: any) => ({
        name: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        characterMaximumLength: col.character_maximum_length,
        numericPrecision: col.numeric_precision,
        numericScale: col.numeric_scale
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture columns for table ${tableName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Capture foreign key information for a specific table
   */
  private async captureTableForeignKeys(tableName: string): Promise<ForeignKeySnapshot[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule,
        rc.update_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = $1 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { 
        query, 
        params: [tableName] 
      });
      
      if (error) throw error;

      return (data || []).map((fk: any) => ({
        constraintName: fk.constraint_name,
        column: fk.column_name,
        referencedTable: fk.referenced_table,
        referencedColumn: fk.referenced_column,
        onDelete: fk.delete_rule,
        onUpdate: fk.update_rule
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture foreign keys for table ${tableName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Capture constraint information
   */
  private async captureConstraints(): Promise<ConstraintSnapshot[]> {
    const query = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.table_schema,
        tc.constraint_type,
        cc.check_clause as definition,
        array_agg(kcu.column_name) as columns
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      GROUP BY tc.constraint_name, tc.table_name, tc.table_schema, tc.constraint_type, cc.check_clause
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });
      if (error) throw error;

      return (data || []).map((constraint: any) => ({
        name: constraint.constraint_name,
        table: constraint.table_name,
        schema: constraint.table_schema,
        type: this.mapConstraintType(constraint.constraint_type),
        definition: constraint.definition || constraint.constraint_type,
        columns: constraint.columns || []
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture constraints: ${error.message}`);
      return [];
    }
  }

  /**
   * Capture index information
   */
  private async captureIndexes(): Promise<IndexSnapshot[]> {
    const query = `
      SELECT 
        i.relname as index_name,
        t.relname as table_name,
        n.nspname as schema_name,
        idx.indisunique as is_unique,
        am.amname as index_type,
        array_agg(a.attname ORDER BY a.attnum) as columns
      FROM pg_index idx
      JOIN pg_class i ON i.oid = idx.indexrelid
      JOIN pg_class t ON t.oid = idx.indrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_am am ON am.oid = i.relam
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(idx.indkey)
      WHERE n.nspname = 'public'
        AND NOT idx.indisprimary
      GROUP BY i.relname, t.relname, n.nspname, idx.indisunique, am.amname
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });
      if (error) throw error;

      return (data || []).map((index: any) => ({
        name: index.index_name,
        table: index.table_name,
        schema: index.schema_name,
        columns: index.columns || [],
        isUnique: index.is_unique,
        indexType: index.index_type
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture indexes: ${error.message}`);
      return [];
    }
  }

  /**
   * Capture function information
   */
  private async captureFunctions(): Promise<FunctionSnapshot[]> {
    const query = `
      SELECT 
        p.proname as function_name,
        n.nspname as schema_name,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as arguments,
        l.lanname as language
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      WHERE n.nspname IN ('public', 'kit')
        AND p.prokind = 'f'
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });
      if (error) throw error;

      return (data || []).map((func: any) => ({
        name: func.function_name,
        schema: func.schema_name,
        returnType: func.return_type,
        arguments: this.parseArguments(func.arguments),
        language: func.language
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture functions: ${error.message}`);
      return [];
    }
  }

  /**
   * Capture trigger information
   */
  private async captureTriggers(): Promise<TriggerSnapshot[]> {
    const query = `
      SELECT 
        t.tgname as trigger_name,
        c.relname as table_name,
        n.nspname as schema_name,
        CASE t.tgtype & 66
          WHEN 2 THEN 'BEFORE'
          WHEN 64 THEN 'INSTEAD OF'
          ELSE 'AFTER'
        END as timing,
        CASE t.tgtype & 28
          WHEN 4 THEN 'INSERT'
          WHEN 8 THEN 'DELETE'
          WHEN 16 THEN 'UPDATE'
          WHEN 12 THEN 'INSERT OR DELETE'
          WHEN 20 THEN 'INSERT OR UPDATE'
          WHEN 24 THEN 'UPDATE OR DELETE'
          WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
        END as event,
        p.proname as function_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
    `;

    try {
      const { data, error } = await this.client.rpc('execute_sql', { query });
      if (error) throw error;

      return (data || []).map((trigger: any) => ({
        name: trigger.trigger_name,
        table: trigger.table_name,
        schema: trigger.schema_name,
        event: trigger.event,
        timing: trigger.timing,
        functionName: trigger.function_name
      }));
      
    } catch (error: any) {
      Logger.warn(`Failed to capture triggers: ${error.message}`);
      return [];
    }
  }

  /**
   * Compare two schema snapshots and detect changes
   */
  private compareSnapshots(previous: SchemaSnapshot, current: SchemaSnapshot): SchemaChange[] {
    const changes: SchemaChange[] = [];

    // Compare tables
    changes.push(...this.compareTableSnapshots(previous.tables, current.tables));
    
    // Compare constraints
    changes.push(...this.compareConstraintSnapshots(previous.constraints, current.constraints));
    
    // Compare indexes
    changes.push(...this.compareIndexSnapshots(previous.indexes, current.indexes));
    
    // Compare functions
    changes.push(...this.compareFunctionSnapshots(previous.functions, current.functions));
    
    // Compare triggers
    changes.push(...this.compareTriggerSnapshots(previous.triggers, current.triggers));

    return changes;
  }

  /**
   * Compare table snapshots
   */
  private compareTableSnapshots(previous: TableSnapshot[], current: TableSnapshot[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevTableMap = new Map(previous.map(t => [t.name, t]));
    const currTableMap = new Map(current.map(t => [t.name, t]));

    // Detect added tables
    for (const table of current) {
      if (!prevTableMap.has(table.name)) {
        changes.push({
          type: 'table_added',
          table: table.name,
          description: `Table '${table.name}' was added`,
          severity: 'medium',
          breakingChange: false,
          migrationRequired: false,
          suggestedAction: `Update configuration to include new table '${table.name}'`
        });
      }
    }

    // Detect removed tables
    for (const table of previous) {
      if (!currTableMap.has(table.name)) {
        changes.push({
          type: 'table_removed',
          table: table.name,
          description: `Table '${table.name}' was removed`,
          severity: 'critical',
          breakingChange: true,
          migrationRequired: true,
          suggestedAction: `Remove references to table '${table.name}' from configuration`
        });
      }
    }

    // Compare existing tables for column changes
    for (const table of current) {
      const prevTable = prevTableMap.get(table.name);
      if (prevTable) {
        changes.push(...this.compareColumnSnapshots(prevTable, table));
      }
    }

    return changes;
  }

  /**
   * Compare column snapshots between tables
   */
  private compareColumnSnapshots(prevTable: TableSnapshot, currTable: TableSnapshot): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevColumnMap = new Map(prevTable.columns.map(c => [c.name, c]));
    const currColumnMap = new Map(currTable.columns.map(c => [c.name, c]));

    // Detect added columns
    for (const column of currTable.columns) {
      if (!prevColumnMap.has(column.name)) {
        changes.push({
          type: 'column_added',
          table: currTable.name,
          column: column.name,
          description: `Column '${column.name}' was added to table '${currTable.name}'`,
          severity: 'low',
          breakingChange: false,
          migrationRequired: false
        });
      }
    }

    // Detect removed columns
    for (const column of prevTable.columns) {
      if (!currColumnMap.has(column.name)) {
        changes.push({
          type: 'column_removed',
          table: currTable.name,
          column: column.name,
          description: `Column '${column.name}' was removed from table '${currTable.name}'`,
          severity: 'high',
          breakingChange: true,
          migrationRequired: true,
          suggestedAction: `Update configuration mappings for table '${currTable.name}'`
        });
      }
    }

    // Detect modified columns
    for (const column of currTable.columns) {
      const prevColumn = prevColumnMap.get(column.name);
      if (prevColumn && this.columnChanged(prevColumn, column)) {
        changes.push({
          type: 'column_modified',
          table: currTable.name,
          column: column.name,
          description: `Column '${column.name}' in table '${currTable.name}' was modified`,
          severity: 'medium',
          breakingChange: column.dataType !== prevColumn.dataType,
          migrationRequired: column.dataType !== prevColumn.dataType
        });
      }
    }

    return changes;
  }

  /**
   * Compare constraint snapshots
   */
  private compareConstraintSnapshots(previous: ConstraintSnapshot[], current: ConstraintSnapshot[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevConstraintMap = new Map(previous.map(c => [`${c.table}.${c.name}`, c]));
    const currConstraintMap = new Map(current.map(c => [`${c.table}.${c.name}`, c]));

    // Detect added constraints
    for (const constraint of current) {
      const key = `${constraint.table}.${constraint.name}`;
      if (!prevConstraintMap.has(key)) {
        changes.push({
          type: 'constraint_added',
          table: constraint.table,
          constraint: constraint.name,
          description: `Constraint '${constraint.name}' was added to table '${constraint.table}'`,
          severity: 'medium',
          breakingChange: constraint.type === 'check',
          migrationRequired: constraint.type === 'check'
        });
      }
    }

    // Detect removed constraints
    for (const constraint of previous) {
      const key = `${constraint.table}.${constraint.name}`;
      if (!currConstraintMap.has(key)) {
        changes.push({
          type: 'constraint_removed',
          table: constraint.table,
          constraint: constraint.name,
          description: `Constraint '${constraint.name}' was removed from table '${constraint.table}'`,
          severity: 'high',
          breakingChange: true,
          migrationRequired: true
        });
      }
    }

    return changes;
  }

  /**
   * Compare index snapshots
   */
  private compareIndexSnapshots(previous: IndexSnapshot[], current: IndexSnapshot[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevIndexMap = new Map(previous.map(i => [`${i.table}.${i.name}`, i]));
    const currIndexMap = new Map(current.map(i => [`${i.table}.${i.name}`, i]));

    // Detect added indexes
    for (const index of current) {
      const key = `${index.table}.${index.name}`;
      if (!prevIndexMap.has(key)) {
        changes.push({
          type: 'index_added',
          table: index.table,
          index: index.name,
          description: `Index '${index.name}' was added to table '${index.table}'`,
          severity: 'low',
          breakingChange: false,
          migrationRequired: false
        });
      }
    }

    // Detect removed indexes
    for (const index of previous) {
      const key = `${index.table}.${index.name}`;
      if (!currIndexMap.has(key)) {
        changes.push({
          type: 'index_removed',
          table: index.table,
          index: index.name,
          description: `Index '${index.name}' was removed from table '${index.table}'`,
          severity: 'low',
          breakingChange: false,
          migrationRequired: false
        });
      }
    }

    return changes;
  }

  /**
   * Compare function snapshots
   */
  private compareFunctionSnapshots(previous: FunctionSnapshot[], current: FunctionSnapshot[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevFunctionMap = new Map(previous.map(f => [`${f.schema}.${f.name}`, f]));
    const currFunctionMap = new Map(current.map(f => [`${f.schema}.${f.name}`, f]));

    // Detect added functions
    for (const func of current) {
      const key = `${func.schema}.${func.name}`;
      if (!prevFunctionMap.has(key)) {
        changes.push({
          type: 'function_added',
          function: func.name,
          description: `Function '${func.schema}.${func.name}' was added`,
          severity: 'low',
          breakingChange: false,
          migrationRequired: false
        });
      }
    }

    // Detect removed functions
    for (const func of previous) {
      const key = `${func.schema}.${func.name}`;
      if (!currFunctionMap.has(key)) {
        const isCritical = func.name.includes('setup_new_user') || func.name.includes('seed');
        changes.push({
          type: 'function_removed',
          function: func.name,
          description: `Function '${func.schema}.${func.name}' was removed`,
          severity: isCritical ? 'critical' : 'medium',
          breakingChange: isCritical,
          migrationRequired: isCritical,
          suggestedAction: isCritical ? 'Update framework strategy configuration' : undefined
        });
      }
    }

    return changes;
  }

  /**
   * Compare trigger snapshots
   */
  private compareTriggerSnapshots(previous: TriggerSnapshot[], current: TriggerSnapshot[]): SchemaChange[] {
    const changes: SchemaChange[] = [];
    
    const prevTriggerMap = new Map(previous.map(t => [`${t.table}.${t.name}`, t]));
    const currTriggerMap = new Map(current.map(t => [`${t.table}.${t.name}`, t]));

    // Detect added triggers
    for (const trigger of current) {
      const key = `${trigger.table}.${trigger.name}`;
      if (!prevTriggerMap.has(key)) {
        changes.push({
          type: 'trigger_added',
          table: trigger.table,
          trigger: trigger.name,
          description: `Trigger '${trigger.name}' was added to table '${trigger.table}'`,
          severity: 'medium',
          breakingChange: false,
          migrationRequired: false
        });
      }
    }

    // Detect removed triggers
    for (const trigger of previous) {
      const key = `${trigger.table}.${trigger.name}`;
      if (!currTriggerMap.has(key)) {
        changes.push({
          type: 'trigger_removed',
          table: trigger.table,
          trigger: trigger.name,
          description: `Trigger '${trigger.name}' was removed from table '${trigger.table}'`,
          severity: 'high',
          breakingChange: true,
          migrationRequired: true,
          suggestedAction: 'Review seeding strategy for potential business logic changes'
        });
      }
    }

    return changes;
  }

  /**
   * Load previous schema snapshot from cache
   */
  private async loadPreviousSnapshot(): Promise<SchemaSnapshot | null> {
    const cacheFilePath = path.join(this.cacheLocation, 'schema-snapshot.json');
    
    if (!fs.existsSync(cacheFilePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(cacheFilePath, 'utf8');
      return JSON.parse(content) as SchemaSnapshot;
    } catch (error: any) {
      Logger.warn(`Failed to load previous schema snapshot: ${error.message}`);
      return null;
    }
  }

  /**
   * Save schema snapshot to cache
   */
  private async saveSnapshot(snapshot: SchemaSnapshot): Promise<void> {
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheLocation)) {
      fs.mkdirSync(this.cacheLocation, { recursive: true });
    }

    const cacheFilePath = path.join(this.cacheLocation, 'schema-snapshot.json');
    
    try {
      fs.writeFileSync(cacheFilePath, JSON.stringify(snapshot, null, 2));
      Logger.debug(`✅ Schema snapshot saved to ${cacheFilePath}`);
    } catch (error: any) {
      Logger.error(`Failed to save schema snapshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate schema version based on tracking mode
   */
  private generateVersion(mode: 'hash' | 'timestamp' | 'version', schemaData: any): string {
    switch (mode) {
      case 'hash':
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(schemaData));
        return hash.digest('hex').substring(0, 16);
      
      case 'timestamp':
        return new Date().toISOString();
      
      case 'version':
        // In a real implementation, this would increment based on change analysis
        return '1.0.0';
      
      default:
        return 'unknown';
    }
  }

  /**
   * Generate recommendations based on detected changes
   */
  private generateRecommendations(changes: SchemaChange[], config: ExtendedSeedConfig): string[] {
    const recommendations: string[] = [];

    if (changes.length === 0) {
      recommendations.push('✅ No schema changes detected');
      return recommendations;
    }

    const breakingChanges = changes.filter(c => c.breakingChange);
    const migrationRequired = changes.some(c => c.migrationRequired);

    recommendations.push(`📊 ${changes.length} schema changes detected`);
    
    if (breakingChanges.length > 0) {
      recommendations.push(`⚠️  ${breakingChanges.length} breaking changes require attention`);
    }

    if (migrationRequired) {
      recommendations.push('🔄 Configuration migration may be required');
    }

    // Specific recommendations based on change types
    const tableChanges = changes.filter(c => c.type.includes('table'));
    const columnChanges = changes.filter(c => c.type.includes('column'));
    const constraintChanges = changes.filter(c => c.type.includes('constraint'));

    if (tableChanges.length > 0) {
      recommendations.push(`📋 ${tableChanges.length} table structure changes detected - review configuration mappings`);
    }

    if (columnChanges.length > 0) {
      recommendations.push(`📝 ${columnChanges.length} column changes detected - validate field mappings`);
    }

    if (constraintChanges.length > 0) {
      recommendations.push(`🔒 ${constraintChanges.length} constraint changes detected - review constraint handlers`);
    }

    // Action recommendations based on configuration
    switch (config.schemaEvolution!.onSchemaChange) {
      case 'error':
        recommendations.push('❌ Configuration set to error on schema change - resolve issues before proceeding');
        break;
      case 'warn':
        recommendations.push('⚠️  Review changes and update configuration as needed');
        break;
      case 'auto-adapt':
        recommendations.push('🤖 Auto-adaptation enabled - configuration will be updated automatically');
        break;
      case 'prompt':
        recommendations.push('❓ User intervention required - review changes and confirm actions');
        break;
    }

    return recommendations;
  }

  /**
   * Helper methods
   */

  private mapConstraintType(pgType: string): ConstraintSnapshot['type'] {
    switch (pgType) {
      case 'CHECK': return 'check';
      case 'FOREIGN KEY': return 'foreign_key';
      case 'UNIQUE': return 'unique';
      case 'PRIMARY KEY': return 'primary_key';
      case 'NOT NULL': return 'not_null';
      default: return 'check';
    }
  }

  private parseArguments(argString: string): Array<{ name: string; type: string; mode?: string }> {
    if (!argString) return [];
    
    // Simple parsing - in a real implementation, this would be more sophisticated
    const args = argString.split(',').map(arg => arg.trim());
    return args.map(arg => {
      const parts = arg.split(' ');
      return {
        name: parts[0] || 'unnamed',
        type: parts[1] || 'unknown'
      };
    });
  }

  private columnChanged(prev: ColumnSnapshot, curr: ColumnSnapshot): boolean {
    return prev.dataType !== curr.dataType ||
           prev.isNullable !== curr.isNullable ||
           prev.defaultValue !== curr.defaultValue;
  }
}