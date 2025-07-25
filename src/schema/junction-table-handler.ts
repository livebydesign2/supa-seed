/**
 * Junction Table Handler
 * Handles many-to-many relationships and junction table seeding
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { DependencyGraph, ForeignKeyRelationship } from './dependency-graph';

type SupabaseClient = ReturnType<typeof createClient>;

export interface JunctionTableInfo {
  tableName: string;
  schema: string;
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  leftForeignKey: ForeignKeyRelationship;
  rightForeignKey: ForeignKeyRelationship;
  additionalColumns: JunctionColumn[];
  cardinality: CardinalityInfo;
  isDetected: boolean;
  confidence: number;
}

export interface JunctionColumn {
  name: string;
  type: string;
  isNullable: boolean;
  hasDefault: boolean;
  defaultValue?: any;
  isTimestamp: boolean;
  isMetadata: boolean;
}

export interface CardinalityInfo {
  leftCardinality: 'one' | 'many';
  rightCardinality: 'one' | 'many';
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  isOptional: boolean;
  estimatedDensity: number; // 0-1, how many relationships exist vs possible
}

export interface RelationshipPattern {
  name: string;
  pattern: RegExp;
  leftTable: string;
  rightTable: string;
  confidence: number;
  description: string;
}

export interface JunctionTableDetectionResult {
  success: boolean;
  junctionTables: JunctionTableInfo[];
  relationshipPatterns: RelationshipPattern[];
  totalRelationships: number;
  confidence: number;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export interface JunctionSeedingOptions {
  // Relationship generation options
  generateRelationships: boolean;
  relationshipDensity: number; // 0-1, what percentage of possible relations to create
  respectCardinality: boolean;
  avoidOrphans: boolean; // Ensure all records have at least one relationship
  
  // Distribution options
  distributionStrategy: 'random' | 'even' | 'weighted' | 'clustered';
  clusterFactor: number; // For clustered distribution
  weightFunction?: (leftRecord: any, rightRecord: any) => number;
  
  // Data generation options  
  generateMetadata: boolean;
  includeTimestamps: boolean;
  customDataGenerators: Map<string, (leftRecord: any, rightRecord: any) => any>;
  
  // Performance options
  batchSize: number;
  maxRelationshipsPerRecord: number;
  validateForeignKeys: boolean;
}

export interface JunctionSeedingResult {
  success: boolean;
  junctionTable: string;
  relationshipsCreated: number;
  relationshipsSkipped: number;
  batchesProcessed: number;
  orphansAvoided: number;
  validationErrors: string[];
  warnings: string[];
  errors: string[];
  executionTime: number;
  metadata: {
    leftTableRecords: number;
    rightTableRecords: number;
    possibleRelationships: number;
    actualDensity: number;
    averageRelationshipsPerLeftRecord: number;
    averageRelationshipsPerRightRecord: number;
  };
}

// Common junction table patterns
export const COMMON_JUNCTION_PATTERNS: RelationshipPattern[] = [
  {
    name: 'user_roles',
    pattern: /^(user|account)_roles?$/i,
    leftTable: 'users',
    rightTable: 'roles',
    confidence: 0.9,
    description: 'User-Role many-to-many relationship'
  },
  {
    name: 'user_teams',
    pattern: /^(user|member)_teams?$/i,
    leftTable: 'users',
    rightTable: 'teams',
    confidence: 0.85,
    description: 'User-Team membership relationship'
  },
  {
    name: 'product_categories',
    pattern: /^products?_categories$/i,
    leftTable: 'products',
    rightTable: 'categories',
    confidence: 0.8,
    description: 'Product-Category classification relationship'
  },
  {
    name: 'post_tags',
    pattern: /^posts?_tags?$/i,
    leftTable: 'posts',
    rightTable: 'tags',
    confidence: 0.85,
    description: 'Post-Tag labeling relationship'
  },
  {
    name: 'organization_members',
    pattern: /^(organization|org)_members?$/i,
    leftTable: 'organizations',
    rightTable: 'users',
    confidence: 0.9,
    description: 'Organization membership relationship'
  }
];

export class JunctionTableHandler {
  private client: SupabaseClient;
  private detectedJunctionTables: Map<string, JunctionTableInfo> = new Map();
  private relationshipPatterns: RelationshipPattern[] = [...COMMON_JUNCTION_PATTERNS];

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Detect junction tables from dependency graph
   */
  async detectJunctionTables(dependencyGraph: DependencyGraph): Promise<JunctionTableDetectionResult> {
    Logger.info('🔗 Detecting junction tables...');
    
    try {
      const junctionTables: JunctionTableInfo[] = [];
      const warnings: string[] = [];
      const errors: string[] = [];
      
      // Analyze each node in the dependency graph
      for (const node of dependencyGraph.nodes) {
        if (node.metadata.isJunctionTable) {
          Logger.debug(`Analyzing potential junction table: ${node.table}`);
          
          const junctionInfo = await this.analyzeJunctionTable(node.table, node.schema, dependencyGraph);
          
          if (junctionInfo) {
            junctionTables.push(junctionInfo);
            this.detectedJunctionTables.set(node.table, junctionInfo);
            Logger.debug(`✅ Confirmed junction table: ${node.table} (${junctionInfo.leftTable} ↔ ${junctionInfo.rightTable})`);
          }
        }
      }

      // Detect relationship patterns
      const detectedPatterns = this.detectRelationshipPatterns(junctionTables);

      const confidence = this.calculateDetectionConfidence(junctionTables);
      const recommendations = this.generateJunctionRecommendations(junctionTables);

      Logger.success(`🔗 Junction table detection completed: ${junctionTables.length} tables found`);

      return {
        success: true,
        junctionTables,
        relationshipPatterns: detectedPatterns,
        totalRelationships: junctionTables.length,
        confidence,
        warnings,
        errors,
        recommendations
      };

    } catch (error: any) {
      Logger.error('Junction table detection failed:', error);
      return {
        success: false,
        junctionTables: [],
        relationshipPatterns: [],
        totalRelationships: 0,
        confidence: 0,
        warnings: [],
        errors: [error.message],
        recommendations: []
      };
    }
  }

  /**
   * Analyze a specific table to determine if it's a junction table
   */
  private async analyzeJunctionTable(
    tableName: string, 
    schema: string, 
    dependencyGraph: DependencyGraph
  ): Promise<JunctionTableInfo | null> {
    try {
      // Get foreign keys for this table
      const node = dependencyGraph.nodes.find(n => n.table === tableName);
      if (!node) return null;

      const foreignKeys = dependencyGraph.edges
        .filter(edge => edge.from === tableName)
        .map(edge => this.findForeignKeyRelationship(edge, dependencyGraph));

      if (foreignKeys.length < 2) return null;

      // For junction tables, we expect exactly 2 foreign keys (or 2 primary foreign keys)
      const primaryForeignKeys = foreignKeys.filter(fk => fk !== null).slice(0, 2);
      
      if (primaryForeignKeys.length < 2) return null;

      const [leftFk, rightFk] = primaryForeignKeys as ForeignKeyRelationship[];

      // Get additional columns
      const additionalColumns = await this.getAdditionalColumns(tableName, schema, [leftFk.fromColumn, rightFk.fromColumn]);

      // Analyze cardinality
      const cardinality = await this.analyzeCardinality(tableName, leftFk, rightFk);

      // Calculate confidence
      const confidence = this.calculateJunctionConfidence(tableName, foreignKeys, additionalColumns);

      return {
        tableName,
        schema,
        leftTable: leftFk.toTable,
        leftColumn: leftFk.fromColumn,
        rightTable: rightFk.toTable,
        rightColumn: rightFk.fromColumn,
        leftForeignKey: leftFk,
        rightForeignKey: rightFk,
        additionalColumns,
        cardinality,
        isDetected: true,
        confidence
      };

    } catch (error: any) {
      Logger.warn(`Failed to analyze junction table ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Find foreign key relationship from dependency edge
   */
  private findForeignKeyRelationship(edge: any, dependencyGraph: DependencyGraph): ForeignKeyRelationship | null {
    // This is a simplified implementation - in a real scenario, we'd have access to the full FK info
    return {
      constraintName: edge.constraint || `fk_${edge.from}_${edge.to}`,
      fromTable: edge.from,
      fromColumn: `${edge.to}_id`, // Assumed convention
      toTable: edge.to,
      toColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      isNullable: edge.type === 'optional',
      isDeferrable: false,
      schema: 'public'
    };
  }

  /**
   * Get additional columns in junction table (beyond foreign keys)
   */
  private async getAdditionalColumns(
    tableName: string, 
    schema: string, 
    foreignKeyColumns: string[]
  ): Promise<JunctionColumn[]> {
    try {
      const { data: columns, error } = await this.client
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', schema);

      if (error || !columns) return [];

      return ((columns || []) as any[])
        .filter(col => !foreignKeyColumns.includes(col.column_name))
        .map(col => ({
          name: col.column_name as string,
          type: col.data_type as string,
          isNullable: col.is_nullable === 'YES',
          hasDefault: col.column_default !== null,
          defaultValue: col.column_default,
          isTimestamp: ['created_at', 'updated_at', 'timestamp'].includes(col.column_name as string),
          isMetadata: ['created_by', 'updated_by', 'status', 'priority'].includes(col.column_name as string)
        }));

    } catch (error: any) {
      Logger.warn(`Failed to get additional columns for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Analyze cardinality of the relationship
   */
  private async analyzeCardinality(
    junctionTable: string,
    leftFk: ForeignKeyRelationship,
    rightFk: ForeignKeyRelationship
  ): Promise<CardinalityInfo> {
    // For now, assume many-to-many since it's a junction table
    // In a full implementation, we'd analyze the actual data
    return {
      leftCardinality: 'many',
      rightCardinality: 'many',
      relationshipType: 'many_to_many',
      isOptional: leftFk.isNullable || rightFk.isNullable,
      estimatedDensity: 0.3 // Default estimate
    };
  }

  /**
   * Calculate confidence score for junction table detection
   */
  private calculateJunctionConfidence(
    tableName: string,
    foreignKeys: (ForeignKeyRelationship | null)[],
    additionalColumns: JunctionColumn[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for exactly 2 foreign keys
    if (foreignKeys.filter(fk => fk !== null).length === 2) {
      confidence += 0.3;
    }

    // Boost confidence for minimal additional columns
    if (additionalColumns.length <= 2) {
      confidence += 0.2;
    }

    // Boost confidence for timestamp columns
    if (additionalColumns.some(col => col.isTimestamp)) {
      confidence += 0.1;
    }

    // Boost confidence for recognized naming patterns
    for (const pattern of this.relationshipPatterns) {
      if (pattern.pattern.test(tableName)) {
        confidence += 0.2;
        break;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Detect relationship patterns in junction tables
   */
  private detectRelationshipPatterns(junctionTables: JunctionTableInfo[]): RelationshipPattern[] {
    const detectedPatterns: RelationshipPattern[] = [];

    for (const junction of junctionTables) {
      for (const pattern of this.relationshipPatterns) {
        if (pattern.pattern.test(junction.tableName)) {
          detectedPatterns.push({
            ...pattern,
            leftTable: junction.leftTable,
            rightTable: junction.rightTable
          });
        }
      }
    }

    return detectedPatterns;
  }

  /**
   * Seed junction table with relationships
   */
  async seedJunctionTable(
    junctionTableName: string,
    options: Partial<JunctionSeedingOptions> = {}
  ): Promise<JunctionSeedingResult> {
    const startTime = Date.now();
    Logger.info(`🌱 Seeding junction table: ${junctionTableName}`);

    const opts: JunctionSeedingOptions = {
      generateRelationships: true,
      relationshipDensity: 0.3,
      respectCardinality: true,
      avoidOrphans: true,
      distributionStrategy: 'random',
      clusterFactor: 0.7,
      generateMetadata: true,
      includeTimestamps: true,
      customDataGenerators: new Map(),
      batchSize: 100,
      maxRelationshipsPerRecord: 10,
      validateForeignKeys: true,
      ...options
    };

    try {
      const junctionInfo = this.detectedJunctionTables.get(junctionTableName);
      if (!junctionInfo) {
        throw new Error(`Junction table ${junctionTableName} not detected or analyzed`);
      }

      // Get records from both related tables
      const [leftRecords, rightRecords] = await Promise.all([
        this.getTableRecords(junctionInfo.leftTable),
        this.getTableRecords(junctionInfo.rightTable)
      ]);

      if (leftRecords.length === 0 || rightRecords.length === 0) {
        throw new Error(`Cannot seed junction table: one or both related tables are empty`);
      }

      // Generate relationships
      const relationships = this.generateRelationships(
        leftRecords,
        rightRecords,
        junctionInfo,
        opts
      );

      // Prepare junction records
      const junctionRecords = relationships.map(rel => 
        this.createJunctionRecord(rel.left, rel.right, junctionInfo, opts)
      );

      // Insert in batches
      let insertedCount = 0;
      let skippedCount = 0;
      const batchCount = Math.ceil(junctionRecords.length / opts.batchSize);

      for (let i = 0; i < batchCount; i++) {
        const batch = junctionRecords.slice(i * opts.batchSize, (i + 1) * opts.batchSize);
        
        try {
          const { data, error } = await this.client
            .from(junctionTableName)
            .insert(batch)
            .select();

          if (error) {
            Logger.warn(`Batch ${i + 1} failed:`, error);
            skippedCount += batch.length;
          } else {
            insertedCount += data?.length || 0;
          }
        } catch (batchError: any) {
          Logger.warn(`Batch ${i + 1} error:`, batchError);
          skippedCount += batch.length;
        }
      }

      const metadata = {
        leftTableRecords: leftRecords.length,
        rightTableRecords: rightRecords.length,
        possibleRelationships: leftRecords.length * rightRecords.length,
        actualDensity: insertedCount / (leftRecords.length * rightRecords.length),
        averageRelationshipsPerLeftRecord: insertedCount / leftRecords.length,
        averageRelationshipsPerRightRecord: insertedCount / rightRecords.length
      };

      Logger.success(`✅ Junction table seeding completed: ${insertedCount} relationships created`);

      return {
        success: true,
        junctionTable: junctionTableName,
        relationshipsCreated: insertedCount,
        relationshipsSkipped: skippedCount,
        batchesProcessed: batchCount,
        orphansAvoided: 0, // Would calculate if implementing orphan avoidance
        validationErrors: [],
        warnings: [],
        errors: [],
        executionTime: Date.now() - startTime,
        metadata
      };

    } catch (error: any) {
      Logger.error(`Junction table seeding failed for ${junctionTableName}:`, error);
      return {
        success: false,
        junctionTable: junctionTableName,
        relationshipsCreated: 0,
        relationshipsSkipped: 0,
        batchesProcessed: 0,
        orphansAvoided: 0,
        validationErrors: [],
        warnings: [],
        errors: [error.message],
        executionTime: Date.now() - startTime,
        metadata: {
          leftTableRecords: 0,
          rightTableRecords: 0,
          possibleRelationships: 0,
          actualDensity: 0,
          averageRelationshipsPerLeftRecord: 0,
          averageRelationshipsPerRightRecord: 0
        }
      };
    }
  }

  /**
   * Get records from a table for relationship generation
   */
  private async getTableRecords(tableName: string): Promise<any[]> {
    const { data, error } = await this.client
      .from(tableName)
      .select('*')
      .limit(1000); // Reasonable limit for seeding

    if (error) {
      throw new Error(`Failed to get records from ${tableName}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Generate relationships between two sets of records
   */
  private generateRelationships(
    leftRecords: any[],
    rightRecords: any[],
    junctionInfo: JunctionTableInfo,
    options: JunctionSeedingOptions
  ): Array<{left: any, right: any}> {
    const relationships: Array<{left: any, right: any}> = [];
    const targetCount = Math.floor(leftRecords.length * rightRecords.length * options.relationshipDensity);

    switch (options.distributionStrategy) {
      case 'random':
        return this.generateRandomRelationships(leftRecords, rightRecords, targetCount);
      
      case 'even':
        return this.generateEvenRelationships(leftRecords, rightRecords, targetCount);
      
      case 'clustered':
        return this.generateClusteredRelationships(leftRecords, rightRecords, targetCount, options.clusterFactor);
        
      default:
        return this.generateRandomRelationships(leftRecords, rightRecords, targetCount);
    }
  }

  /**
   * Generate random relationships
   */
  private generateRandomRelationships(
    leftRecords: any[],
    rightRecords: any[],
    targetCount: number
  ): Array<{left: any, right: any}> {
    const relationships: Array<{left: any, right: any}> = [];
    const usedPairs = new Set<string>();

    while (relationships.length < targetCount && relationships.length < leftRecords.length * rightRecords.length) {
      const leftRecord = leftRecords[Math.floor(Math.random() * leftRecords.length)];
      const rightRecord = rightRecords[Math.floor(Math.random() * rightRecords.length)];
      const pairKey = `${leftRecord.id}-${rightRecord.id}`;

      if (!usedPairs.has(pairKey)) {
        relationships.push({ left: leftRecord, right: rightRecord });
        usedPairs.add(pairKey);
      }
    }

    return relationships;
  }

  /**
   * Generate even distribution of relationships
   */
  private generateEvenRelationships(
    leftRecords: any[],
    rightRecords: any[],
    targetCount: number
  ): Array<{left: any, right: any}> {
    const relationships: Array<{left: any, right: any}> = [];
    const relationshipsPerLeft = Math.ceil(targetCount / leftRecords.length);

    for (const leftRecord of leftRecords) {
      const shuffledRight = [...rightRecords].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < relationshipsPerLeft && i < shuffledRight.length && relationships.length < targetCount; i++) {
        relationships.push({ left: leftRecord, right: shuffledRight[i] });
      }
    }

    return relationships;
  }

  /**
   * Generate clustered relationships (some records have many relationships, others few)
   */
  private generateClusteredRelationships(
    leftRecords: any[],
    rightRecords: any[],
    targetCount: number,
    clusterFactor: number
  ): Array<{left: any, right: any}> {
    const relationships: Array<{left: any, right: any}> = [];
    
    // Select a portion of left records to be "popular" (have many relationships)
    const popularCount = Math.floor(leftRecords.length * (1 - clusterFactor));
    const popularRecords = leftRecords.slice(0, popularCount);
    const regularRecords = leftRecords.slice(popularCount);

    // Distribute relationships: popular records get more
    const popularRelationships = Math.floor(targetCount * 0.7);
    const regularRelationships = targetCount - popularRelationships;

    // Generate popular relationships
    for (let i = 0; i < popularRelationships; i++) {
      const leftRecord = popularRecords[Math.floor(Math.random() * popularRecords.length)];
      const rightRecord = rightRecords[Math.floor(Math.random() * rightRecords.length)];
      relationships.push({ left: leftRecord, right: rightRecord });
    }

    // Generate regular relationships
    for (let i = 0; i < regularRelationships; i++) {
      const leftRecord = regularRecords[Math.floor(Math.random() * regularRecords.length)];
      const rightRecord = rightRecords[Math.floor(Math.random() * rightRecords.length)];
      relationships.push({ left: leftRecord, right: rightRecord });
    }

    return relationships;
  }

  /**
   * Create a junction record from two related records
   */
  private createJunctionRecord(
    leftRecord: any,
    rightRecord: any,
    junctionInfo: JunctionTableInfo,
    options: JunctionSeedingOptions
  ): any {
    const junctionRecord: any = {
      [junctionInfo.leftColumn]: leftRecord.id,
      [junctionInfo.rightColumn]: rightRecord.id
    };

    // Add timestamps if requested
    if (options.includeTimestamps) {
      const now = new Date().toISOString();
      junctionRecord.created_at = now;
      junctionRecord.updated_at = now;
    }

    // Add metadata if requested and columns exist
    if (options.generateMetadata) {
      for (const column of junctionInfo.additionalColumns) {
        if (column.isMetadata && !junctionRecord[column.name]) {
          junctionRecord[column.name] = this.generateColumnValue(column, leftRecord, rightRecord);
        }
      }
    }

    // Apply custom data generators
    for (const [columnName, generator] of options.customDataGenerators) {
      if (junctionInfo.additionalColumns.some(col => col.name === columnName)) {
        junctionRecord[columnName] = generator(leftRecord, rightRecord);
      }
    }

    return junctionRecord;
  }

  /**
   * Generate value for a junction table column
   */
  private generateColumnValue(column: JunctionColumn, leftRecord: any, rightRecord: any): any {
    switch (column.name) {
      case 'status':
        return 'active';
      case 'priority':
        return Math.floor(Math.random() * 10) + 1;
      case 'weight':
        return Math.random();
      case 'order':
        return Math.floor(Math.random() * 100);
      default:
        if (column.hasDefault) return column.defaultValue;
        if (column.isNullable) return null;
        return `value_${Date.now()}`;
    }
  }

  /**
   * Calculate overall detection confidence
   */
  private calculateDetectionConfidence(junctionTables: JunctionTableInfo[]): number {
    if (junctionTables.length === 0) return 0;
    
    const totalConfidence = junctionTables.reduce((sum, table) => sum + table.confidence, 0);
    return totalConfidence / junctionTables.length;
  }

  /**
   * Generate recommendations for junction table handling
   */
  private generateJunctionRecommendations(junctionTables: JunctionTableInfo[]): string[] {
    const recommendations: string[] = [];

    if (junctionTables.length > 0) {
      recommendations.push(`Detected ${junctionTables.length} junction tables for many-to-many relationships`);
      recommendations.push('Seed parent tables before junction tables to maintain referential integrity');
    }

    const lowConfidenceTables = junctionTables.filter(t => t.confidence < 0.7);
    if (lowConfidenceTables.length > 0) {
      recommendations.push(`${lowConfidenceTables.length} junction tables have low confidence - verify manually`);
    }

    const complexJunctions = junctionTables.filter(t => t.additionalColumns.length > 3);
    if (complexJunctions.length > 0) {
      recommendations.push(`${complexJunctions.length} junction tables have additional columns - consider custom seeding logic`);
    }

    return recommendations;
  }

  /**
   * Get detected junction table information
   */
  getJunctionTableInfo(tableName: string): JunctionTableInfo | undefined {
    return this.detectedJunctionTables.get(tableName);
  }

  /**
   * Get all detected junction tables
   */
  getAllJunctionTables(): JunctionTableInfo[] {
    return Array.from(this.detectedJunctionTables.values());
  }

  /**
   * Add custom relationship pattern
   */
  addRelationshipPattern(pattern: RelationshipPattern): void {
    this.relationshipPatterns.push(pattern);
  }

  /**
   * Clear detected junction tables
   */
  clearDetectedTables(): void {
    this.detectedJunctionTables.clear();
  }
}