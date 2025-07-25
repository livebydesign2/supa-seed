/**
 * Dynamic Column Mapping System
 * Automatically discovers and maps semantic fields to actual database columns
 * Replaces hardcoded column assumptions with intelligent field detection
 */

import { 
  SchemaIntrospectionResult, 
  TablePattern, 
  DatabaseColumn 
} from './schema-introspector';
import { Logger } from '../utils/logger';

export interface SemanticField {
  name: string;
  description: string;
  aliases: string[];
  patterns: RegExp[];
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'url' | 'json';
  required: boolean;
  category: 'identity' | 'content' | 'metadata' | 'relationship' | 'system';
  defaultValue?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enumValues?: string[];
  };
}

export interface ColumnMapping {
  semanticField: string;
  actualColumn: string;
  confidence: number; // 0-1 score
  evidence: string[];
  dataTypeMatch: boolean;
  constraintMatch: boolean;
  alternativeColumns?: string[];
}

export interface TableColumnMap {
  tableName: string;
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  unmappedSemanticFields: string[];
  confidence: number;
  recommendations: MappingRecommendation[];
}

export interface MappingRecommendation {
  type: 'column_rename' | 'add_column' | 'use_alternative' | 'ignore_field';
  message: string;
  semanticField?: string;
  currentColumn?: string;
  suggestedColumn?: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

export interface MappingConfig {
  strictMode: boolean; // Require high confidence mappings
  enablePatternMatching: boolean;
  enableFuzzyMatching: boolean;
  minimumConfidence: number; // 0-1
  preferExactMatches: boolean;
  allowMultipleMappings: boolean;
  customMappings?: Record<string, Record<string, string>>; // table -> semantic -> actual
}

export class DynamicColumnMapper {
  private semanticFields: Map<string, SemanticField[]> = new Map();
  private config: MappingConfig;

  constructor(config: MappingConfig = this.getDefaultConfig()) {
    this.config = config;
    this.initializeSemanticFields();
  }

  /**
   * Create column mappings for all tables in the schema
   */
  async createMappings(schemaInfo: SchemaIntrospectionResult): Promise<Map<string, TableColumnMap>> {
    Logger.info('🗺️  Creating dynamic column mappings...');
    
    const mappings = new Map<string, TableColumnMap>();

    for (const pattern of schemaInfo.patterns) {
      const tableMap = await this.createTableMapping(pattern, schemaInfo);
      mappings.set(pattern.name, tableMap);
      
      Logger.debug(`Created mapping for ${pattern.name}: ${tableMap.mappings.length} mappings, confidence ${(tableMap.confidence * 100).toFixed(1)}%`);
    }

    Logger.success(`✅ Created column mappings for ${mappings.size} tables`);
    return mappings;
  }

  /**
   * Create column mapping for a specific table
   */
  async createTableMapping(
    tablePattern: TablePattern, 
    schemaInfo: SchemaIntrospectionResult
  ): Promise<TableColumnMap> {
    const table = schemaInfo.tables.find(t => t.name === tablePattern.name);
    if (!table) {
      throw new Error(`Table ${tablePattern.name} not found in schema`);
    }

    const mappings: ColumnMapping[] = [];
    const unmappedColumns: string[] = [...table.columns.map(c => c.name)];
    const unmappedSemanticFields: string[] = [];

    // Get semantic fields for this table type
    const relevantSemanticFields = this.getSemanticFieldsForTable(tablePattern.suggestedRole);

    // Apply custom mappings first (highest priority)
    if (this.config.customMappings?.[table.name]) {
      const customMappings = this.config.customMappings[table.name];
      for (const [semanticField, actualColumn] of Object.entries(customMappings)) {
        if (table.columns.find(c => c.name === actualColumn)) {
          const mapping = this.createCustomMapping(semanticField, actualColumn, table.columns);
          mappings.push(mapping);
          this.removeFromArray(unmappedColumns, actualColumn);
          this.removeFromArray(unmappedSemanticFields, semanticField);
        }
      }
    }

    // Create mappings for each semantic field
    for (const semanticField of relevantSemanticFields) {
      if (mappings.find(m => m.semanticField === semanticField.name)) {
        continue; // Already mapped via custom mapping
      }

      const mapping = await this.findBestColumnMapping(
        semanticField, 
        table.columns, 
        unmappedColumns
      );

      if (mapping) {
        mappings.push(mapping);
        this.removeFromArray(unmappedColumns, mapping.actualColumn);
      } else {
        unmappedSemanticFields.push(semanticField.name);
      }
    }

    // Calculate overall confidence
    const confidence = this.calculateTableConfidence(mappings, relevantSemanticFields.length);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      table.name,
      mappings,
      unmappedColumns,
      unmappedSemanticFields,
      relevantSemanticFields
    );

    return {
      tableName: table.name,
      mappings,
      unmappedColumns,
      unmappedSemanticFields,
      confidence,
      recommendations
    };
  }

  /**
   * Find the best column mapping for a semantic field
   */
  private async findBestColumnMapping(
    semanticField: SemanticField,
    columns: DatabaseColumn[],
    availableColumns: string[]
  ): Promise<ColumnMapping | null> {
    const candidates: Array<{
      column: DatabaseColumn;
      confidence: number;
      evidence: string[];
    }> = [];

    // Only consider available columns
    const availableColumnObjects = columns.filter(c => availableColumns.includes(c.name));

    for (const column of availableColumnObjects) {
      const result = this.scoreColumnMatch(semanticField, column);
      if (result.confidence >= this.config.minimumConfidence) {
        candidates.push({
          column,
          confidence: result.confidence,
          evidence: result.evidence
        });
      }
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by confidence and take the best match
    candidates.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = candidates[0];

    // Get alternative columns (lower confidence matches)
    const alternatives = candidates.slice(1, 4).map(c => c.column.name);

    return {
      semanticField: semanticField.name,
      actualColumn: bestMatch.column.name,
      confidence: bestMatch.confidence,
      evidence: bestMatch.evidence,
      dataTypeMatch: this.isDataTypeCompatible(semanticField.dataType, bestMatch.column.type),
      constraintMatch: this.isConstraintCompatible(semanticField, bestMatch.column),
      alternativeColumns: alternatives.length > 0 ? alternatives : undefined
    };
  }

  /**
   * Score how well a column matches a semantic field
   */
  private scoreColumnMatch(
    semanticField: SemanticField,
    column: DatabaseColumn
  ): { confidence: number; evidence: string[] } {
    let confidence = 0;
    const evidence: string[] = [];

    // Exact name match (highest score)
    if (column.name.toLowerCase() === semanticField.name.toLowerCase()) {
      confidence += 0.5;
      evidence.push('Exact name match');
    }

    // Alias match
    for (const alias of semanticField.aliases) {
      if (column.name.toLowerCase() === alias.toLowerCase()) {
        confidence += 0.4;
        evidence.push(`Alias match: ${alias}`);
        break;
      }
    }

    // Pattern match
    if (this.config.enablePatternMatching) {
      for (const pattern of semanticField.patterns) {
        if (pattern.test(column.name)) {
          confidence += 0.3;
          evidence.push(`Pattern match: ${pattern.source}`);
          break;
        }
      }
    }

    // Fuzzy match
    if (this.config.enableFuzzyMatching) {
      const fuzzyScore = this.calculateFuzzyMatch(semanticField.name, column.name);
      if (fuzzyScore > 0.7) {
        confidence += fuzzyScore * 0.2;
        evidence.push(`Fuzzy match: ${(fuzzyScore * 100).toFixed(1)}%`);
      }
    }

    // Data type compatibility
    if (this.isDataTypeCompatible(semanticField.dataType, column.type)) {
      confidence += 0.15;
      evidence.push('Data type compatible');
    }

    // Constraint compatibility
    if (this.isConstraintCompatible(semanticField, column)) {
      confidence += 0.1;
      evidence.push('Constraint compatible');
    }

    // Required field match
    if (semanticField.required === !column.isNullable) {
      confidence += 0.05;
      evidence.push('Required constraint match');
    }

    return { confidence, evidence };
  }

  /**
   * Check if data types are compatible
   */
  private isDataTypeCompatible(semanticType: string, columnType: string): boolean {
    const compatibilityMap: Record<string, string[]> = {
      'string': ['text', 'varchar', 'character varying', 'char', 'character'],
      'number': ['integer', 'bigint', 'smallint', 'decimal', 'numeric', 'real', 'double precision'],
      'boolean': ['boolean', 'bool'],
      'date': ['timestamp', 'timestamptz', 'date', 'time', 'timetz'],
      'uuid': ['uuid'],
      'email': ['text', 'varchar', 'character varying'],
      'url': ['text', 'varchar', 'character varying'],
      'json': ['json', 'jsonb']
    };

    const compatibleTypes = compatibilityMap[semanticType] || [];
    return compatibleTypes.some(type => columnType.toLowerCase().includes(type.toLowerCase()));
  }

  /**
   * Check if constraints are compatible
   */
  private isConstraintCompatible(semanticField: SemanticField, column: DatabaseColumn): boolean {
    // Check if required field has NOT NULL constraint
    if (semanticField.required && column.isNullable) {
      return false;
    }

    // Check if email field has unique constraint (common pattern)
    if (semanticField.dataType === 'email' && !column.isForeignKey) {
      // Assume email fields should be unique (not a hard requirement)
      return true;
    }

    return true;
  }

  /**
   * Calculate fuzzy string match score
   */
  private calculateFuzzyMatch(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    
    if (maxLength === 0) return 1;
    
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create a custom mapping with high confidence
   */
  private createCustomMapping(
    semanticField: string,
    actualColumn: string,
    columns: DatabaseColumn[]
  ): ColumnMapping {
    const column = columns.find(c => c.name === actualColumn);
    
    return {
      semanticField,
      actualColumn,
      confidence: 1.0,
      evidence: ['Custom mapping configuration'],
      dataTypeMatch: true, // Assume custom mappings are correct
      constraintMatch: true
    };
  }

  /**
   * Calculate overall confidence for a table mapping
   */
  private calculateTableConfidence(
    mappings: ColumnMapping[],
    totalSemanticFields: number
  ): number {
    if (totalSemanticFields === 0) return 1;

    const totalConfidence = mappings.reduce((sum, mapping) => sum + mapping.confidence, 0);
    const coverageRatio = mappings.length / totalSemanticFields;
    
    return (totalConfidence / totalSemanticFields) * coverageRatio;
  }

  /**
   * Generate recommendations for improving mappings
   */
  private generateRecommendations(
    tableName: string,
    mappings: ColumnMapping[],
    unmappedColumns: string[],
    unmappedSemanticFields: string[],
    semanticFields: SemanticField[]
  ): MappingRecommendation[] {
    const recommendations: MappingRecommendation[] = [];

    // Low confidence mappings
    for (const mapping of mappings) {
      if (mapping.confidence < 0.7) {
        recommendations.push({
          type: 'use_alternative',
          message: `Low confidence mapping for ${mapping.semanticField}. Consider using ${mapping.alternativeColumns?.[0] || 'a different column'}.`,
          semanticField: mapping.semanticField,
          currentColumn: mapping.actualColumn,
          suggestedColumn: mapping.alternativeColumns?.[0],
          priority: 'medium',
          impact: 'May cause data seeding issues if mapping is incorrect'
        });
      }
    }

    // Important unmapped semantic fields
    for (const fieldName of unmappedSemanticFields) {
      const semanticField = semanticFields.find(f => f.name === fieldName);
      if (semanticField?.required) {
        recommendations.push({
          type: 'add_column',
          message: `Required field ${fieldName} could not be mapped. Consider adding a column or updating configuration.`,
          semanticField: fieldName,
          priority: 'high',
          impact: 'User creation will fail without this field'
        });
      }
    }

    // Suggest column renames for close matches
    for (const columnName of unmappedColumns) {
      for (const fieldName of unmappedSemanticFields) {
        const fuzzyScore = this.calculateFuzzyMatch(fieldName, columnName);
        if (fuzzyScore > 0.8) {
          recommendations.push({
            type: 'column_rename',
            message: `Column ${columnName} is similar to semantic field ${fieldName}. Consider renaming or adding to custom mappings.`,
            semanticField: fieldName,
            currentColumn: columnName,
            priority: 'low',
            impact: 'Could improve mapping confidence'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Initialize semantic field definitions
   */
  private initializeSemanticFields(): void {
    const userFields: SemanticField[] = [
      {
        name: 'id',
        description: 'Primary key identifier',
        aliases: ['user_id', 'account_id', 'profile_id'],
        patterns: [/^.*_?id$/i],
        dataType: 'uuid',
        required: true,
        category: 'identity'
      },
      {
        name: 'email',
        description: 'Email address',
        aliases: ['email_address', 'user_email', 'mail'],
        patterns: [/email/i, /mail/i],
        dataType: 'email',
        required: true,
        category: 'identity',
        validation: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        }
      },
      {
        name: 'name',
        description: 'Full name or display name',
        aliases: ['full_name', 'display_name', 'username', 'first_name', 'last_name'],
        patterns: [/name$/i, /^name/i],
        dataType: 'string',
        required: true,
        category: 'identity',
        validation: {
          minLength: 1,
          maxLength: 255
        }
      },
      {
        name: 'username',
        description: 'Unique username or handle',
        aliases: ['handle', 'user_name', 'login'],
        patterns: [/username/i, /handle/i],
        dataType: 'string',
        required: false,
        category: 'identity',
        validation: {
          minLength: 3,
          maxLength: 50
        }
      },
      {
        name: 'avatar',
        description: 'Profile picture URL',
        aliases: ['avatar_url', 'picture_url', 'profile_image', 'image_url', 'photo_url'],
        patterns: [/avatar/i, /picture/i, /image/i, /photo/i],
        dataType: 'url',
        required: false,
        category: 'content'
      },
      {
        name: 'bio',
        description: 'Biography or about text',
        aliases: ['about', 'description', 'profile_text', 'summary'],
        patterns: [/bio$/i, /about/i, /description/i],
        dataType: 'string',
        required: false,
        category: 'content',
        validation: {
          maxLength: 1000
        }
      },
      {
        name: 'created_at',
        description: 'Creation timestamp',
        aliases: ['date_created', 'created_date', 'created_time'],
        patterns: [/created/i, /created_at/i],
        dataType: 'date',
        required: false,
        category: 'metadata'
      },
      {
        name: 'updated_at',
        description: 'Last update timestamp',
        aliases: ['date_updated', 'updated_date', 'modified_at', 'last_modified'],
        patterns: [/updated/i, /modified/i],
        dataType: 'date',
        required: false,
        category: 'metadata'
      }
    ];

    const contentFields: SemanticField[] = [
      {
        name: 'title',
        description: 'Content title or name',
        aliases: ['name', 'subject', 'heading'],
        patterns: [/title/i, /subject/i],
        dataType: 'string',
        required: true,
        category: 'content'
      },
      {
        name: 'content',
        description: 'Main content body',
        aliases: ['body', 'text', 'description', 'details'],
        patterns: [/content/i, /body/i, /text/i],
        dataType: 'string',
        required: false,
        category: 'content'
      },
      {
        name: 'author',
        description: 'Content author reference',
        aliases: ['user_id', 'creator_id', 'owner_id', 'account_id'],
        patterns: [/author/i, /creator/i, /owner/i, /_id$/i],
        dataType: 'uuid',
        required: true,
        category: 'relationship'
      },
      {
        name: 'category',
        description: 'Content category',
        aliases: ['category_id', 'type', 'classification'],
        patterns: [/category/i, /type/i],
        dataType: 'string',
        required: false,
        category: 'metadata'
      },
      {
        name: 'published',
        description: 'Publication status',
        aliases: ['is_published', 'published_at', 'is_public', 'status'],
        patterns: [/published/i, /public/i, /status/i],
        dataType: 'boolean',
        required: false,
        category: 'metadata'
      }
    ];

    this.semanticFields.set('user', userFields);
    this.semanticFields.set('content', contentFields);
    this.semanticFields.set('association', []);
    this.semanticFields.set('system', []);
  }

  /**
   * Get semantic fields for a table type
   */
  private getSemanticFieldsForTable(tableRole: string): SemanticField[] {
    return this.semanticFields.get(tableRole) || [];
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): MappingConfig {
    return {
      strictMode: false,
      enablePatternMatching: true,
      enableFuzzyMatching: true,
      minimumConfidence: 0.3,
      preferExactMatches: true,
      allowMultipleMappings: false
    };
  }

  /**
   * Utility method to remove item from array
   */
  private removeFromArray<T>(array: T[], item: T): void {
    const index = array.indexOf(item);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  /**
   * Get mapping for a specific table and semantic field
   */
  getMapping(tableMappings: Map<string, TableColumnMap>, tableName: string, semanticField: string): string | null {
    const tableMap = tableMappings.get(tableName);
    if (!tableMap) return null;

    const mapping = tableMap.mappings.find(m => m.semanticField === semanticField);
    return mapping?.actualColumn || null;
  }

  /**
   * Validate existing mappings against current schema
   */
  async validateMappings(
    tableMappings: Map<string, TableColumnMap>,
    schemaInfo: SchemaIntrospectionResult
  ): Promise<{
    valid: boolean;
    invalidMappings: Array<{ table: string; field: string; reason: string }>;
    missingTables: string[];
  }> {
    const invalidMappings: Array<{ table: string; field: string; reason: string }> = [];
    const missingTables: string[] = [];

    for (const [tableName, tableMap] of tableMappings) {
      const table = schemaInfo.tables.find(t => t.name === tableName);
      
      if (!table) {
        missingTables.push(tableName);
        continue;
      }

      for (const mapping of tableMap.mappings) {
        const column = table.columns.find(c => c.name === mapping.actualColumn);
        
        if (!column) {
          invalidMappings.push({
            table: tableName,
            field: mapping.semanticField,
            reason: `Column ${mapping.actualColumn} no longer exists`
          });
        }
      }
    }

    return {
      valid: invalidMappings.length === 0 && missingTables.length === 0,
      invalidMappings,
      missingTables
    };
  }

  /**
   * Export mappings to configuration format
   */
  exportMappings(tableMappings: Map<string, TableColumnMap>): Record<string, Record<string, string>> {
    const config: Record<string, Record<string, string>> = {};

    for (const [tableName, tableMap] of tableMappings) {
      config[tableName] = {};
      
      for (const mapping of tableMap.mappings) {
        config[tableName][mapping.semanticField] = mapping.actualColumn;
      }
    }

    return config;
  }
}