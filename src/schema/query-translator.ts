/**
 * Query Translation Layer
 * FEAT-003: Memory Management & Schema Mapping Fixes - Phase 2
 * 
 * Provides seamless query translation between framework-expected table names
 * and actual schema table names. Wraps Supabase client operations.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from '../core/utils/logger';
import { TableMappingResolver, createTableMappingResolver } from './table-mapping-resolver';
import { SchemaMapping } from '../core/config/schema-mappings';

export interface QueryTranslatorConfig {
  framework: string;
  customMappings?: Partial<SchemaMapping>;
  enableValidation?: boolean;
  enableCaching?: boolean;
}

/**
 * Query translator that automatically maps table names in Supabase queries
 */
export class QueryTranslator {
  private client: SupabaseClient;
  private resolver: TableMappingResolver;
  private config: QueryTranslatorConfig;
  private tableNameCache = new Map<string, string>();

  constructor(client: SupabaseClient, config: QueryTranslatorConfig) {
    this.client = client;
    this.config = config;
    this.resolver = createTableMappingResolver(client, {
      framework: config.framework,
      customMappings: config.customMappings,
      validateWithDatabase: config.enableValidation !== false
    });

    Logger.debug('🔄 QueryTranslator initialized:', {
      framework: config.framework,
      enableValidation: config.enableValidation,
      enableCaching: config.enableCaching
    });
  }

  /**
   * Translate a framework-expected table name to actual table name
   */
  async translateTableName(expectedTableName: string): Promise<string> {
    // Check cache first if caching is enabled
    if (this.config.enableCaching && this.tableNameCache.has(expectedTableName)) {
      return this.tableNameCache.get(expectedTableName)!;
    }

    let actualTableName: string;

    try {
      // Determine table type based on expected name
      const tableType = this.inferTableType(expectedTableName);
      
      if (tableType) {
        const result = await this.resolver.resolveTableName(expectedTableName, tableType);
        actualTableName = result.actualTableName;
        
        if (result.warnings.length > 0) {
          Logger.warn(`⚠️ Table translation warnings for '${expectedTableName}':`, result.warnings);
        }
      } else {
        // Fallback: use expected name as-is
        actualTableName = expectedTableName;
        Logger.debug(`🔄 No table type mapping for '${expectedTableName}', using as-is`);
      }
    } catch (error) {
      Logger.warn(`⚠️ Table translation failed for '${expectedTableName}', using as-is:`, error);
      actualTableName = expectedTableName;
    }

    // Cache the result if caching is enabled
    if (this.config.enableCaching) {
      this.tableNameCache.set(expectedTableName, actualTableName);
    }

    if (expectedTableName !== actualTableName) {
      Logger.debug(`🗺️ Table translated: ${expectedTableName} -> ${actualTableName}`);
    }

    return actualTableName;
  }

  /**
   * Create a translated Supabase query builder
   */
  async from(tableName: string) {
    const actualTableName = await this.translateTableName(tableName);
    return this.client.from(actualTableName);
  }

  /**
   * Infer table type from expected table name for mapping resolution
   */
  private inferTableType(expectedTableName: string): 'userTable' | 'setupTable' | 'baseTemplateTable' | 'mediaAttachmentsTable' | null {
    // Map common table name patterns to table types
    const patterns: Record<string, 'userTable' | 'setupTable' | 'baseTemplateTable' | 'mediaAttachmentsTable'> = {
      // User tables
      'users': 'userTable',
      'accounts': 'userTable',
      'profiles': 'userTable',
      
      // Setup tables
      'setups': 'setupTable',
      'posts': 'setupTable',
      
      // Base template tables
      'base_templates': 'baseTemplateTable',
      'setup_types': 'baseTemplateTable',
      'templates': 'baseTemplateTable',
      
      // Media tables
      'media_attachments': 'mediaAttachmentsTable',
      'attachments': 'mediaAttachmentsTable',
      'media': 'mediaAttachmentsTable'
    };

    // Direct match
    if (patterns[expectedTableName]) {
      return patterns[expectedTableName];
    }

    // Pattern matching for partial matches
    if (expectedTableName.includes('user') || expectedTableName.includes('account') || expectedTableName.includes('profile')) {
      return 'userTable';
    }
    
    if (expectedTableName.includes('setup') || expectedTableName.includes('post')) {
      return 'setupTable';
    }
    
    if (expectedTableName.includes('template') || expectedTableName.includes('type')) {
      return 'baseTemplateTable';
    }
    
    if (expectedTableName.includes('media') || expectedTableName.includes('attachment')) {
      return 'mediaAttachmentsTable';
    }

    return null;
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.tableNameCache.clear();
    this.resolver.clearCache();
    Logger.debug('🗑️ QueryTranslator cache cleared');
  }

  /**
   * Get translation statistics
   */
  getStats(): {
    cachedTranslations: number;
    framework: string;
    enableValidation: boolean;
    enableCaching: boolean;
  } {
    return {
      cachedTranslations: this.tableNameCache.size,
      framework: this.config.framework,
      enableValidation: this.config.enableValidation !== false,
      enableCaching: this.config.enableCaching !== false
    };
  }

  /**
   * Get all current table mappings
   */
  async getAllMappings(): Promise<Record<string, string>> {
    const mappings: Record<string, string> = {};
    
    // Common table names to check
    const commonTables = [
      'users', 'accounts', 'profiles',
      'setups', 'posts',
      'base_templates', 'setup_types', 'templates',
      'media_attachments', 'attachments', 'media'
    ];

    for (const tableName of commonTables) {
      try {
        const actualName = await this.translateTableName(tableName);
        if (actualName !== tableName) {
          mappings[tableName] = actualName;
        }
      } catch (error) {
        Logger.debug(`Could not resolve mapping for table: ${tableName}`);
      }
    }

    return mappings;
  }
}

/**
 * Factory function to create a query translator
 */
export function createQueryTranslator(
  client: SupabaseClient,
  config: QueryTranslatorConfig
): QueryTranslator {
  return new QueryTranslator(client, config);
}

/**
 * Utility function for one-off table name translation
 */
export async function translateTableName(
  client: SupabaseClient,
  framework: string,
  expectedTableName: string,
  customMappings?: Partial<SchemaMapping>
): Promise<string> {
  const translator = createQueryTranslator(client, {
    framework,
    customMappings,
    enableValidation: true,
    enableCaching: false
  });

  return translator.translateTableName(expectedTableName);
}

export default QueryTranslator;