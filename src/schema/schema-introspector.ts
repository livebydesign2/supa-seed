/**
 * Schema Introspection System
 * Dynamically discovers database structure, constraints, and relationships
 * Replaces hardcoded framework assumptions with actual schema analysis
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface DatabaseColumn {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  maxLength?: number;
  enumValues?: string[];
}

export interface DatabaseConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  checkDefinition?: string;
  isDeferrable: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface DatabaseTable {
  name: string;
  schema: string;
  columns: DatabaseColumn[];
  constraints: DatabaseConstraint[];
  indexes: DatabaseIndex[];
  triggers: DatabaseTrigger[];
  rowCount: number;
  hasData: boolean;
}

export interface DatabaseIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
  method: string; // btree, hash, gin, etc.
}

export interface DatabaseTrigger {
  name: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  functionName: string;
}

export interface SchemaRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  cascadeDelete: boolean;
  isRequired: boolean;
}

export interface TablePattern {
  name: string;
  confidence: number; // 0-1 score
  evidence: string[];
  suggestedRole: 'user' | 'content' | 'association' | 'system' | 'auth';
  columnMappings: Record<string, string[]>; // semantic field -> possible columns
}

export interface SchemaIntrospectionResult {
  tables: DatabaseTable[];
  relationships: SchemaRelationship[];
  patterns: TablePattern[];
  constraints: {
    userCreationConstraints: ConstraintRule[];
    dataIntegrityRules: ConstraintRule[];
    businessLogicConstraints: ConstraintRule[];
  };
  framework: {
    type: 'makerkit' | 'nextjs' | 'remix' | 'custom';
    version: string;
    confidence: number;
    evidence: string[];
  };
  recommendations: SchemaRecommendation[];
}

export interface ConstraintRule {
  table: string;
  rule: string;
  type: 'required_relationship' | 'conditional_insert' | 'value_constraint' | 'business_rule';
  description: string;
  sqlCondition: string;
  requiresValidation: boolean;
}

export interface SchemaRecommendation {
  type: 'warning' | 'optimization' | 'configuration';
  message: string;
  table?: string;
  suggestedAction?: string;
  priority: 'high' | 'medium' | 'low';
}

export class SchemaIntrospector {
  private client: SupabaseClient;
  private cache: Map<string, any> = new Map();
  private introspectionCache: SchemaIntrospectionResult | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Perform comprehensive schema introspection
   */
  async introspectSchema(): Promise<SchemaIntrospectionResult> {
    if (this.introspectionCache) {
      return this.introspectionCache;
    }

    Logger.info('🔍 Starting comprehensive schema introspection...');

    const result: SchemaIntrospectionResult = {
      tables: [],
      relationships: [],
      patterns: [],
      constraints: {
        userCreationConstraints: [],
        dataIntegrityRules: [],
        businessLogicConstraints: []
      },
      framework: {
        type: 'custom',
        version: 'unknown',
        confidence: 0,
        evidence: []
      },
      recommendations: []
    };

    try {
      // Step 1: Discover all tables
      result.tables = await this.discoverTables();
      Logger.debug(`Discovered ${result.tables.length} tables`);

      // Step 2: Analyze relationships
      result.relationships = await this.analyzeRelationships(result.tables);
      Logger.debug(`Found ${result.relationships.length} relationships`);

      // Step 3: Identify table patterns and roles
      result.patterns = await this.identifyTablePatterns(result.tables, result.relationships);
      Logger.debug(`Identified ${result.patterns.length} table patterns`);

      // Step 4: Extract constraints
      result.constraints = await this.extractConstraints(result.tables, result.relationships);
      Logger.debug(`Extracted constraints: ${Object.values(result.constraints).flat().length} total`);

      // Step 5: Detect framework
      result.framework = await this.detectFramework(result.tables, result.patterns);
      Logger.debug(`Framework detected: ${result.framework.type} (confidence: ${result.framework.confidence})`);

      // Step 6: Generate recommendations
      result.recommendations = await this.generateRecommendations(result);
      Logger.debug(`Generated ${result.recommendations.length} recommendations`);

      this.introspectionCache = result;
      Logger.success('✅ Schema introspection completed');

      return result;

    } catch (error: any) {
      Logger.error('Schema introspection failed:', error);
      throw new Error(`Schema introspection failed: ${error.message}`);
    }
  }

  /**
   * Discover all tables with their columns, constraints, and metadata
   */
  private async discoverTables(): Promise<DatabaseTable[]> {
    const tables: DatabaseTable[] = [];

    // Get basic table information
    const { data: tableData, error: tableError } = await this.client
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (tableError) {
      Logger.warn('Could not query information_schema, falling back to table discovery');
      return this.fallbackTableDiscovery();
    }

    for (const table of tableData || []) {
      const tableName = table.table_name;
      
      try {
        const tableInfo: DatabaseTable = {
          name: tableName,
          schema: table.table_schema,
          columns: await this.getTableColumns(tableName),
          constraints: await this.getTableConstraints(tableName),
          indexes: await this.getTableIndexes(tableName),
          triggers: await this.getTableTriggers(tableName),
          rowCount: await this.getTableRowCount(tableName),
          hasData: false
        };

        tableInfo.hasData = tableInfo.rowCount > 0;
        tables.push(tableInfo);

      } catch (error: any) {
        Logger.warn(`Failed to introspect table ${tableName}: ${error.message}`);
        // Continue with other tables
      }
    }

    return tables;
  }

  /**
   * Fallback table discovery when information_schema is not accessible
   */
  private async fallbackTableDiscovery(): Promise<DatabaseTable[]> {
    const commonTables = [
      'profiles', 'accounts', 'users', 'setups', 'posts', 'categories',
      'teams', 'organizations', 'memberships', 'subscriptions', 'roles',
      'invitations', 'notifications', 'media_attachments', 'gear_items',
      'base_templates', 'reviews', 'trips', 'modifications'
    ];

    const tables: DatabaseTable[] = [];

    for (const tableName of commonTables) {
      if (await this.tableExists(tableName)) {
        try {
          const tableInfo: DatabaseTable = {
            name: tableName,
            schema: 'public',
            columns: await this.getTableColumns(tableName),
            constraints: [], // Limited info in fallback mode
            indexes: [],
            triggers: [],
            rowCount: await this.getTableRowCount(tableName),
            hasData: false
          };

          tableInfo.hasData = tableInfo.rowCount > 0;
          tables.push(tableInfo);

        } catch (error: any) {
          Logger.debug(`Fallback discovery failed for ${tableName}: ${error.message}`);
        }
      }
    }

    return tables;
  }

  /**
   * Get detailed column information for a table
   */
  private async getTableColumns(tableName: string): Promise<DatabaseColumn[]> {
    const { data, error } = await this.client
      .from('information_schema.columns')
      .select(`
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      `)
      .eq('table_name', tableName)
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (error) {
      // Fallback: try to get columns by querying the table
      return this.fallbackGetColumns(tableName);
    }

    const columns: DatabaseColumn[] = [];

    for (const col of data || []) {
      const column: DatabaseColumn = {
        name: col.column_name,
        type: col.data_type,
        isNullable: col.is_nullable === 'YES',
        defaultValue: col.column_default,
        isPrimaryKey: false, // Will be set when we analyze constraints
        isForeignKey: false,
        maxLength: col.character_maximum_length
      };

      // Handle enum types
      if (col.data_type === 'USER-DEFINED') {
        column.enumValues = await this.getEnumValues(tableName, col.column_name);
      }

      columns.push(column);
    }

    return columns;
  }

  /**
   * Fallback method to get column info when information_schema is not available
   */
  private async fallbackGetColumns(tableName: string): Promise<DatabaseColumn[]> {
    try {
      // Try to do a select with limit 0 to get column info from error or metadata
      const { error } = await this.client
        .from(tableName)
        .select('*')
        .limit(0);

      // For now, return minimal column info
      // In a full implementation, we could parse error messages or use other methods
      return [
        {
          name: 'id',
          type: 'uuid',
          isNullable: false,
          defaultValue: null,
          isPrimaryKey: true,
          isForeignKey: false
        }
      ];

    } catch (error: any) {
      Logger.debug(`Fallback column discovery failed for ${tableName}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get table constraints (primary keys, foreign keys, checks, etc.)
   */
  private async getTableConstraints(tableName: string): Promise<DatabaseConstraint[]> {
    // This would query information_schema.table_constraints and related tables
    // Implementation details depend on PostgreSQL system catalogs
    
    const constraints: DatabaseConstraint[] = [];
    
    try {
      // Get constraint information from information_schema
      const { data, error } = await this.client
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

      if (!error && data) {
        for (const constraint of data) {
          // Get detailed constraint info (columns, references, etc.)
          const constraintDetails = await this.getConstraintDetails(constraint.constraint_name, tableName);
          if (constraintDetails) {
            constraints.push(constraintDetails);
          }
        }
      }

    } catch (error: any) {
      Logger.debug(`Constraint discovery failed for ${tableName}: ${error.message}`);
    }

    return constraints;
  }

  /**
   * Get detailed information about a specific constraint
   */
  private async getConstraintDetails(constraintName: string, tableName: string): Promise<DatabaseConstraint | null> {
    // Implementation would query information_schema.key_column_usage, referential_constraints, etc.
    // For now, return a basic structure
    
    return {
      name: constraintName,
      type: 'PRIMARY KEY', // Would be determined from actual query
      columns: ['id'], // Would be determined from actual query
      isDeferrable: false
    };
  }

  /**
   * Analyze relationships between tables
   */
  private async analyzeRelationships(tables: DatabaseTable[]): Promise<SchemaRelationship[]> {
    const relationships: SchemaRelationship[] = [];

    for (const table of tables) {
      for (const constraint of table.constraints) {
        if (constraint.type === 'FOREIGN KEY' && constraint.referencedTable) {
          const relationship: SchemaRelationship = {
            fromTable: table.name,
            fromColumn: constraint.columns[0],
            toTable: constraint.referencedTable,
            toColumn: constraint.referencedColumns?.[0] || 'id',
            relationshipType: this.determineRelationshipType(table.name, constraint),
            cascadeDelete: constraint.onDelete === 'CASCADE',
            isRequired: !table.columns.find(col => col.name === constraint.columns[0])?.isNullable
          };

          relationships.push(relationship);
        }
      }
    }

    return relationships;
  }

  /**
   * Identify table patterns and their likely roles in the application
   */
  private async identifyTablePatterns(
    tables: DatabaseTable[], 
    relationships: SchemaRelationship[]
  ): Promise<TablePattern[]> {
    const patterns: TablePattern[] = [];

    for (const table of tables) {
      const pattern = await this.analyzeTablePattern(table, relationships);
      if (pattern) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Analyze a single table to determine its pattern and role
   */
  private async analyzeTablePattern(
    table: DatabaseTable, 
    relationships: SchemaRelationship[]
  ): Promise<TablePattern | null> {
    const columnNames = table.columns.map(col => col.name.toLowerCase());
    const evidence: string[] = [];
    let confidence = 0;
    let suggestedRole: TablePattern['suggestedRole'] = 'system';
    const columnMappings: Record<string, string[]> = {};

    // Analyze column patterns to determine table role
    
    // User table patterns
    if (this.hasUserTableColumns(columnNames)) {
      suggestedRole = 'user';
      confidence += 30;
      evidence.push('Has user-like columns (email, name, etc.)');
      
      columnMappings.email = this.findColumnVariants(columnNames, ['email', 'email_address', 'user_email']);
      columnMappings.name = this.findColumnVariants(columnNames, ['name', 'display_name', 'full_name', 'username']);
      columnMappings.avatar = this.findColumnVariants(columnNames, ['avatar_url', 'picture_url', 'profile_image', 'image_url']);
      columnMappings.bio = this.findColumnVariants(columnNames, ['bio', 'about', 'description']);
    }

    // Content table patterns
    if (this.hasContentTableColumns(columnNames)) {
      suggestedRole = 'content';
      confidence += 25;
      evidence.push('Has content-like columns (title, description, etc.)');
      
      columnMappings.title = this.findColumnVariants(columnNames, ['title', 'name', 'subject']);
      columnMappings.content = this.findColumnVariants(columnNames, ['content', 'body', 'description', 'text']);
      columnMappings.author = this.findColumnVariants(columnNames, ['user_id', 'author_id', 'creator_id', 'account_id']);
    }

    // Association table patterns
    if (this.hasAssociationTableColumns(columnNames, relationships)) {
      suggestedRole = 'association';
      confidence += 20;
      evidence.push('Has association-like structure (multiple foreign keys)');
    }

    // MakerKit-specific patterns
    if (this.hasMakerKitColumns(columnNames)) {
      confidence += 15;
      evidence.push('Has MakerKit-specific columns');
    }

    // Auth table patterns
    if (table.name.includes('auth') || table.schema === 'auth') {
      suggestedRole = 'auth';
      confidence += 40;
      evidence.push('Located in auth schema or has auth-related name');
    }

    if (confidence < 10) {
      return null; // Not confident enough in the pattern
    }

    return {
      name: table.name,
      confidence: Math.min(confidence / 100, 1),
      evidence,
      suggestedRole,
      columnMappings: this.cleanColumnMappings(columnMappings)
    };
  }

  /**
   * Helper methods for pattern recognition
   */
  private hasUserTableColumns(columns: string[]): boolean {
    const userColumns = ['email', 'name', 'username', 'display_name', 'full_name'];
    return userColumns.some(col => columns.includes(col));
  }

  private hasContentTableColumns(columns: string[]): boolean {
    const contentColumns = ['title', 'content', 'body', 'description'];
    return contentColumns.some(col => columns.includes(col));
  }

  private hasAssociationTableColumns(columns: string[], relationships: SchemaRelationship[]): boolean {
    const tableRelationships = relationships.filter(rel => rel.fromTable === columns[0]);
    return tableRelationships.length >= 2; // Has multiple foreign keys
  }

  private hasMakerKitColumns(columns: string[]): boolean {
    const makerkitColumns = ['primary_owner_user_id', 'is_personal_account', 'slug'];
    return makerkitColumns.some(col => columns.includes(col));
  }

  private findColumnVariants(columns: string[], variants: string[]): string[] {
    return variants.filter(variant => columns.includes(variant));
  }

  private cleanColumnMappings(mappings: Record<string, string[]>): Record<string, string[]> {
    const cleaned: Record<string, string[]> = {};
    for (const [key, values] of Object.entries(mappings)) {
      if (values.length > 0) {
        cleaned[key] = values;
      }
    }
    return cleaned;
  }

  /**
   * Extract business constraints and rules from the schema
   */
  private async extractConstraints(
    tables: DatabaseTable[], 
    relationships: SchemaRelationship[]
  ): Promise<SchemaIntrospectionResult['constraints']> {
    const userCreationConstraints: ConstraintRule[] = [];
    const dataIntegrityRules: ConstraintRule[] = [];
    const businessLogicConstraints: ConstraintRule[] = [];

    // Analyze each table for constraint patterns
    for (const table of tables) {
      // Look for user creation constraints
      if (table.name === 'profiles' || table.name === 'accounts') {
        const constraints = await this.analyzeUserCreationConstraints(table, relationships);
        userCreationConstraints.push(...constraints);
      }

      // Look for data integrity rules
      const integrityRules = await this.analyzeDataIntegrityRules(table);
      dataIntegrityRules.push(...integrityRules);

      // Look for business logic constraints
      const businessRules = await this.analyzeBusinessLogicConstraints(table);
      businessLogicConstraints.push(...businessRules);
    }

    return {
      userCreationConstraints,
      dataIntegrityRules,
      businessLogicConstraints
    };
  }

  /**
   * Detect framework type and version based on schema patterns
   */
  private async detectFramework(
    tables: DatabaseTable[], 
    patterns: TablePattern[]
  ): Promise<SchemaIntrospectionResult['framework']> {
    const evidence: string[] = [];
    let type: SchemaIntrospectionResult['framework']['type'] = 'custom';
    let version = 'unknown';
    let confidence = 0;

    const tableNames = tables.map(t => t.name);

    // MakerKit detection
    if (tableNames.includes('accounts') && tableNames.includes('memberships')) {
      type = 'makerkit';
      confidence += 40;
      evidence.push('Has accounts and memberships tables');

      // Version detection based on table patterns
      if (tableNames.includes('role_permissions') && tableNames.includes('billing_customers')) {
        version = 'v3';
        confidence += 20;
        evidence.push('Has v3-specific tables (role_permissions, billing_customers)');
      } else if (tableNames.includes('subscriptions') && tableNames.includes('roles')) {
        version = 'v2';
        confidence += 15;
        evidence.push('Has v2-specific tables (subscriptions, roles)');
      } else {
        version = 'v1';
        confidence += 10;
        evidence.push('Basic MakerKit pattern detected');
      }
    }

    // Check for MakerKit-specific column patterns
    const accountsTable = tables.find(t => t.name === 'accounts');
    if (accountsTable) {
      const accountsColumns = accountsTable.columns.map(c => c.name);
      if (accountsColumns.includes('primary_owner_user_id')) {
        confidence += 15;
        evidence.push('Has MakerKit-specific account structure');
      }
    }

    return {
      type,
      version,
      confidence: Math.min(confidence / 100, 1),
      evidence
    };
  }

  /**
   * Generate recommendations based on introspection results
   */
  private async generateRecommendations(
    result: SchemaIntrospectionResult
  ): Promise<SchemaRecommendation[]> {
    const recommendations: SchemaRecommendation[] = [];

    // Analyze patterns for recommendations
    const userTables = result.patterns.filter(p => p.suggestedRole === 'user');
    
    if (userTables.length === 0) {
      recommendations.push({
        type: 'warning',
        message: 'No user tables detected. User creation may fail.',
        priority: 'high',
        suggestedAction: 'Ensure you have a profiles, accounts, or users table'
      });
    } else if (userTables.length > 1) {
      recommendations.push({
        type: 'configuration',
        message: 'Multiple user tables detected. Specify primary user table in config.',
        priority: 'medium',
        suggestedAction: 'Set schema.primaryUserTable in your configuration'
      });
    }

    // Check for missing relationships
    const orphanTables = result.tables.filter(table => 
      !result.relationships.some(rel => rel.fromTable === table.name || rel.toTable === table.name)
    );

    if (orphanTables.length > 0) {
      recommendations.push({
        type: 'optimization',
        message: `${orphanTables.length} tables have no relationships. This may indicate isolated data.`,
        priority: 'low',
        suggestedAction: 'Review table relationships for proper data seeding'
      });
    }

    return recommendations;
  }

  /**
   * Helper methods for constraint analysis
   */
  private async analyzeUserCreationConstraints(
    table: DatabaseTable, 
    relationships: SchemaRelationship[]
  ): Promise<ConstraintRule[]> {
    const constraints: ConstraintRule[] = [];

    // Look for CHECK constraints that might affect user creation
    for (const constraint of table.constraints) {
      if (constraint.type === 'CHECK' && constraint.checkDefinition) {
        constraints.push({
          table: table.name,
          rule: constraint.name,
          type: 'conditional_insert',
          description: `Check constraint: ${constraint.checkDefinition}`,
          sqlCondition: constraint.checkDefinition,
          requiresValidation: true
        });
      }
    }

    return constraints;
  }

  private async analyzeDataIntegrityRules(table: DatabaseTable): Promise<ConstraintRule[]> {
    const rules: ConstraintRule[] = [];

    // Analyze NOT NULL constraints
    const requiredColumns = table.columns.filter(col => !col.isNullable && !col.isPrimaryKey);
    for (const col of requiredColumns) {
      rules.push({
        table: table.name,
        rule: `${col.name}_required`,
        type: 'required_relationship',
        description: `Column ${col.name} is required`,
        sqlCondition: `${col.name} IS NOT NULL`,
        requiresValidation: true
      });
    }

    return rules;
  }

  private async analyzeBusinessLogicConstraints(table: DatabaseTable): Promise<ConstraintRule[]> {
    const constraints: ConstraintRule[] = [];

    // Look for business logic patterns in triggers
    for (const trigger of table.triggers) {
      constraints.push({
        table: table.name,
        rule: trigger.name,
        type: 'business_rule',
        description: `Trigger ${trigger.name} enforces business logic`,
        sqlCondition: `-- Trigger: ${trigger.functionName}`,
        requiresValidation: false
      });
    }

    return constraints;
  }

  /**
   * Utility methods
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.client.from(tableName).select('*').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async getTableRowCount(tableName: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      return error ? 0 : (count || 0);
    } catch {
      return 0;
    }
  }

  private async getTableIndexes(tableName: string): Promise<DatabaseIndex[]> {
    // Would query pg_indexes or information_schema.statistics
    return [];
  }

  private async getTableTriggers(tableName: string): Promise<DatabaseTrigger[]> {
    // Would query information_schema.triggers
    return [];
  }

  private async getEnumValues(tableName: string, columnName: string): Promise<string[]> {
    // Would query pg_enum for enum values
    return [];
  }

  private determineRelationshipType(
    tableName: string, 
    constraint: DatabaseConstraint
  ): SchemaRelationship['relationshipType'] {
    // Simple heuristic - could be more sophisticated
    if (constraint.columns.length === 1 && constraint.referencedColumns?.length === 1) {
      return 'one_to_many';
    }
    return 'many_to_many';
  }

  /**
   * Clear the introspection cache
   */
  clearCache(): void {
    this.introspectionCache = null;
    this.cache.clear();
  }

  /**
   * Get cached introspection result
   */
  getCachedResult(): SchemaIntrospectionResult | null {
    return this.introspectionCache;
  }
}