/**
 * Dynamic Table Mapping Resolver
 * FEAT-003: Memory Management & Schema Mapping Fixes - Phase 2
 * 
 * Resolves table name conflicts between framework expectations and actual schema.
 * Handles MakerKit base_templates vs setup_types mapping and other schema variations.
 */

import { Logger } from '../core/utils/logger';
import { SchemaMapping, SCHEMA_MAPPINGS } from '../core/config/schema-mappings';
import { SupabaseClient } from '@supabase/supabase-js';

export interface TableMappingConfig {
  /** Framework type detected */
  framework: string;
  /** Custom schema mappings to override defaults */
  customMappings?: Partial<SchemaMapping>;
  /** Whether to perform schema introspection for validation */
  validateWithDatabase?: boolean;
}

export interface TableMappingResult {
  /** The actual table name to use in queries */
  actualTableName: string;
  /** Whether the table exists in the database */
  exists: boolean;
  /** The mapping source (config, fallback, or error) */
  source: 'config' | 'fallback' | 'introspection' | 'error';
  /** Any warnings or recommendations */
  warnings: string[];
}

/**
 * Resolves table name conflicts dynamically based on configuration and schema introspection
 */
export class TableMappingResolver {
  private client: SupabaseClient;
  private config: TableMappingConfig;
  private cachedMappings = new Map<string, TableMappingResult>();
  private schemaValidated = false;

  constructor(client: SupabaseClient, config: TableMappingConfig) {
    this.client = client;
    this.config = config;
    
    Logger.debug('🗺️ TableMappingResolver initialized:', {
      framework: config.framework,
      validateWithDatabase: config.validateWithDatabase,
      hasCustomMappings: !!config.customMappings
    });
  }

  /**
   * Resolve a framework-expected table name to the actual table name
   */
  async resolveTableName(
    expectedTableName: string,
    tableType: 'userTable' | 'setupTable' | 'baseTemplateTable' | 'mediaAttachmentsTable'
  ): Promise<TableMappingResult> {
    const cacheKey = `${expectedTableName}:${tableType}`;
    
    // Return cached result if available
    if (this.cachedMappings.has(cacheKey)) {
      return this.cachedMappings.get(cacheKey)!;
    }

    const result = await this._resolveTableNameInternal(expectedTableName, tableType);
    
    // Cache the result
    this.cachedMappings.set(cacheKey, result);
    
    Logger.debug(`🗺️ Table mapping resolved: ${expectedTableName} -> ${result.actualTableName}`, {
      source: result.source,
      exists: result.exists,
      warnings: result.warnings.length
    });

    return result;
  }

  /**
   * Internal table name resolution logic
   */
  private async _resolveTableNameInternal(
    expectedTableName: string,
    tableType: 'userTable' | 'setupTable' | 'baseTemplateTable' | 'mediaAttachmentsTable'
  ): Promise<TableMappingResult> {
    const warnings: string[] = [];
    
    try {
      // Step 1: Get schema mapping for the framework
      const schemaMapping = this.getSchemaMapping();
      
      // Step 2: Get the configured table name for this table type
      const tableMapping = schemaMapping[tableType];
      if (!tableMapping) {
        warnings.push(`No ${tableType} configuration found for framework: ${this.config.framework}`);
        return {
          actualTableName: expectedTableName,
          exists: false,
          source: 'error',
          warnings
        };
      }

      const configuredTableName = tableMapping.name;
      
      // Step 3: Validate with database if enabled
      if (this.config.validateWithDatabase) {
        const tableExists = await this.validateTableExists(configuredTableName);
        
        if (tableExists) {
          return {
            actualTableName: configuredTableName,
            exists: true,
            source: 'config',
            warnings
          };
        } else {
          warnings.push(`Configured table '${configuredTableName}' does not exist in database`);
          
          // Try fallback to expected name
          const fallbackExists = await this.validateTableExists(expectedTableName);
          if (fallbackExists) {
            warnings.push(`Using fallback table '${expectedTableName}' instead`);
            return {
              actualTableName: expectedTableName,
              exists: true,
              source: 'fallback',
              warnings
            };
          } else {
            warnings.push(`Neither configured table '${configuredTableName}' nor expected table '${expectedTableName}' exist`);
            return {
              actualTableName: configuredTableName, // Use configured even if it doesn't exist
              exists: false,
              source: 'error',
              warnings
            };
          }
        }
      } else {
        // No validation - trust configuration
        return {
          actualTableName: configuredTableName,
          exists: true, // Assume it exists
          source: 'config',
          warnings
        };
      }
    } catch (error) {
      Logger.error('❌ Error resolving table name:', error);
      warnings.push(`Error during table name resolution: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        actualTableName: expectedTableName,
        exists: false,
        source: 'error',
        warnings
      };
    }
  }

  /**
   * Get the effective schema mapping (defaults + custom overrides)
   */
  private getSchemaMapping(): SchemaMapping {
    const defaultMapping = SCHEMA_MAPPINGS[this.config.framework];
    
    if (!defaultMapping) {
      throw new Error(`No schema mapping found for framework: ${this.config.framework}`);
    }

    if (!this.config.customMappings) {
      return defaultMapping;
    }

    // Merge custom mappings with defaults
    return {
      userTable: { ...defaultMapping.userTable, ...(this.config.customMappings.userTable || {}) },
      setupTable: defaultMapping.setupTable ? { ...defaultMapping.setupTable, ...(this.config.customMappings.setupTable || {}) } : this.config.customMappings.setupTable,
      baseTemplateTable: defaultMapping.baseTemplateTable ? { ...defaultMapping.baseTemplateTable, ...(this.config.customMappings.baseTemplateTable || {}) } : this.config.customMappings.baseTemplateTable,
      mediaAttachmentsTable: defaultMapping.mediaAttachmentsTable ? { ...defaultMapping.mediaAttachmentsTable, ...(this.config.customMappings.mediaAttachmentsTable || {}) } : this.config.customMappings.mediaAttachmentsTable
    };
  }

  /**
   * Validate that a table exists in the database
   */
  private async validateTableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(tableName)
        .select('*')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get all table mappings for the current configuration
   */
  async getAllTableMappings(): Promise<Record<string, TableMappingResult>> {
    const mappings: Record<string, TableMappingResult> = {};
    const schemaMapping = this.getSchemaMapping();
    
    // Map each table type
    if (schemaMapping.userTable) {
      mappings.userTable = await this.resolveTableName('users', 'userTable');
    }
    
    if (schemaMapping.setupTable) {
      mappings.setupTable = await this.resolveTableName('setups', 'setupTable');
    }
    
    if (schemaMapping.baseTemplateTable) {
      mappings.baseTemplateTable = await this.resolveTableName('setup_types', 'baseTemplateTable');
    }
    
    if (schemaMapping.mediaAttachmentsTable) {
      mappings.mediaAttachmentsTable = await this.resolveTableName('media_attachments', 'mediaAttachmentsTable');
    }
    
    return mappings;
  }

  /**
   * Clear cached mappings (useful for testing or configuration changes)
   */
  clearCache(): void {
    this.cachedMappings.clear();
    this.schemaValidated = false;
    Logger.debug('🗑️ TableMappingResolver cache cleared');
  }

  /**
   * Get performance and mapping statistics
   */
  getStats(): {
    cachedMappings: number;
    schemaValidated: boolean;
    framework: string;
    hasCustomMappings: boolean;
  } {
    return {
      cachedMappings: this.cachedMappings.size,
      schemaValidated: this.schemaValidated,
      framework: this.config.framework,
      hasCustomMappings: !!this.config.customMappings
    };
  }
}

/**
 * Factory function to create a table mapping resolver
 */
export function createTableMappingResolver(
  client: SupabaseClient,
  config: TableMappingConfig
): TableMappingResolver {
  return new TableMappingResolver(client, config);
}

/**
 * Utility function to resolve a single table name quickly
 */
export async function resolveTableName(
  client: SupabaseClient,
  framework: string,
  expectedTableName: string,
  tableType: 'userTable' | 'setupTable' | 'baseTemplateTable' | 'mediaAttachmentsTable',
  customMappings?: Partial<SchemaMapping>
): Promise<string> {
  const resolver = createTableMappingResolver(client, {
    framework,
    customMappings,
    validateWithDatabase: true
  });

  const result = await resolver.resolveTableName(expectedTableName, tableType);
  
  if (result.warnings.length > 0) {
    Logger.warn('⚠️ Table mapping warnings:', result.warnings);
  }
  
  return result.actualTableName;
}

export default TableMappingResolver;