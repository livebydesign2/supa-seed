/**
 * Custom Relationship Manager for Epic 7: Configuration Extensibility Framework
 * Manages custom table relationship definitions and validation
 */

import type { createClient } from '@supabase/supabase-js';
import { ExtendedSeedConfig } from '../core/types/config-types';
import { Logger } from '../../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface CustomRelationshipDefinition {
  id: string;
  fromTable: string;
  toTable: string;
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  fromColumn: string;
  toColumn: string;
  isRequired: boolean;
  cascadeDelete: boolean;
  generationStrategy: 'sequential' | 'random' | 'weighted' | 'custom';
  customGenerator?: string;
  metadata?: {
    description?: string;
    businessRule?: string;
    validationRules?: string[];
  };
}

export interface JunctionTableDefinition {
  tableName: string;
  leftTable: string;
  rightTable: string;
  leftColumn: string;
  rightColumn: string;
  additionalColumns?: Array<{
    name: string;
    type: string;
    defaultValue?: any;
  }>;
}

export interface InheritanceRule {
  parentTable: string;
  childTable: string;
  inheritedFields: string[];
  overrideStrategy: 'extend' | 'replace' | 'merge';
}

export interface RelationshipValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  relationshipGraph: RelationshipGraph;
}

export interface RelationshipGraph {
  nodes: Array<{
    table: string;
    type: 'entity' | 'junction';
    columns: string[];
  }>;
  edges: Array<{
    from: string;
    to: string;
    relationship: CustomRelationshipDefinition;
    strength: 'strong' | 'weak';
  }>;
  cycles: string[][];
  orphanTables: string[];
}

export interface RelationshipGenerationPlan {
  executionOrder: string[];
  batchGroups: Array<{
    tables: string[];
    canExecuteInParallel: boolean;
    dependencies: string[];
  }>;
  junctionTableCreation: Array<{
    junctionTable: string;
    dependsOn: string[];
    executionOrder: number;
  }>;
  estimatedComplexity: 'low' | 'medium' | 'high' | 'critical';
}

export class CustomRelationshipManager {
  private client: SupabaseClient;
  private relationshipCache: Map<string, CustomRelationshipDefinition[]> = new Map();

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Comprehensive validation of custom relationship definitions
   */
  async validateCustomRelationships(
    relationships: ExtendedSeedConfig['customRelationships']
  ): Promise<RelationshipValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!relationships?.enabled) {
      return {
        valid: true,
        errors,
        warnings: ['Custom relationships disabled'],
        recommendations: ['Consider enabling custom relationships for better data modeling'],
        relationshipGraph: { nodes: [], edges: [], cycles: [], orphanTables: [] }
      };
    }

    Logger.info('🔗 Validating custom relationship definitions...');

    try {
      // Build relationship graph
      const relationshipGraph = await this.buildRelationshipGraph(relationships);

      // Validate individual relationships
      if (relationships.relationships) {
        for (const relationship of relationships.relationships) {
          const relationshipErrors = await this.validateSingleRelationship(relationship);
          errors.push(...relationshipErrors);
        }
      }

      // Validate junction tables
      if (relationships.junctionTables) {
        for (const junctionTable of relationships.junctionTables) {
          const junctionErrors = await this.validateJunctionTable(junctionTable);
          errors.push(...junctionErrors);
        }
      }

      // Validate inheritance rules
      if (relationships.inheritanceRules) {
        for (const inheritanceRule of relationships.inheritanceRules) {
          const inheritanceErrors = await this.validateInheritanceRule(inheritanceRule);
          errors.push(...inheritanceErrors);
        }
      }

      // Analyze relationship graph for issues
      const graphAnalysis = this.analyzeRelationshipGraph(relationshipGraph);
      warnings.push(...graphAnalysis.warnings);
      recommendations.push(...graphAnalysis.recommendations);

      // Generate final recommendations
      recommendations.push(`Validated ${relationships.relationships?.length || 0} custom relationships`);
      recommendations.push(`Validated ${relationships.junctionTables?.length || 0} junction tables`);
      recommendations.push(`Validated ${relationships.inheritanceRules?.length || 0} inheritance rules`);

      if (relationshipGraph.cycles.length > 0) {
        warnings.push(`Detected ${relationshipGraph.cycles.length} circular dependencies in relationship graph`);
        recommendations.push('Consider breaking circular dependencies with nullable foreign keys or junction tables');
      }

      Logger.info(`✅ Custom relationship validation completed: ${errors.length} errors, ${warnings.length} warnings`);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        recommendations,
        relationshipGraph
      };

    } catch (error: any) {
      Logger.error('Custom relationship validation failed:', error);
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: [],
        recommendations: ['Fix validation errors and retry'],
        relationshipGraph: { nodes: [], edges: [], cycles: [], orphanTables: [] }
      };
    }
  }

  /**
   * Generate execution plan for relationship seeding
   */
  async generateRelationshipExecutionPlan(
    relationships: ExtendedSeedConfig['customRelationships']
  ): Promise<RelationshipGenerationPlan> {
    if (!relationships?.enabled || !relationships.relationships) {
      return {
        executionOrder: [],
        batchGroups: [],
        junctionTableCreation: [],
        estimatedComplexity: 'low'
      };
    }

    Logger.info('📋 Generating relationship execution plan...');

    const relationshipGraph = await this.buildRelationshipGraph(relationships);
    
    // Perform topological sort to determine execution order
    const executionOrder = this.topologicalSortTables(relationshipGraph);
    
    // Group tables into batches that can execute in parallel
    const batchGroups = this.createBatchGroups(relationshipGraph, executionOrder);
    
    // Plan junction table creation
    const junctionTableCreation = this.planJunctionTableCreation(relationships.junctionTables || []);
    
    // Estimate complexity
    const estimatedComplexity = this.estimateRelationshipComplexity(relationshipGraph, relationships);

    const plan: RelationshipGenerationPlan = {
      executionOrder,
      batchGroups,
      junctionTableCreation,
      estimatedComplexity
    };

    Logger.info(`✅ Generated execution plan: ${executionOrder.length} tables, ${batchGroups.length} batch groups`);

    return plan;
  }

  /**
   * Create custom relationship generators
   */
  createRelationshipGenerators(
    relationships: CustomRelationshipDefinition[]
  ): Map<string, (fromId: any, context: any) => any> {
    const generators = new Map<string, (fromId: any, context: any) => any>();

    for (const relationship of relationships) {
      const generatorKey = `${relationship.fromTable}_to_${relationship.toTable}`;
      
      switch (relationship.generationStrategy) {
        case 'sequential':
          generators.set(generatorKey, this.createSequentialGenerator(relationship));
          break;
        case 'random':
          generators.set(generatorKey, this.createRandomGenerator(relationship));
          break;
        case 'weighted':
          generators.set(generatorKey, this.createWeightedGenerator(relationship));
          break;
        case 'custom':
          if (relationship.customGenerator) {
            generators.set(generatorKey, this.createCustomGenerator(relationship));
          }
          break;
      }
    }

    return generators;
  }

  /**
   * Apply inheritance rules to data
   */
  applyInheritanceRules(
    data: Record<string, any[]>,
    inheritanceRules: InheritanceRule[]
  ): Record<string, any[]> {
    const processedData = { ...data };

    for (const rule of inheritanceRules) {
      if (!processedData[rule.parentTable] || !processedData[rule.childTable]) {
        continue;
      }

      const parentData = processedData[rule.parentTable];
      const childData = processedData[rule.childTable];

      processedData[rule.childTable] = childData.map(childRecord => {
        // Find matching parent record (assuming ID-based inheritance)
        const parentRecord = parentData.find(parent => parent.id === childRecord.parent_id);
        
        if (!parentRecord) {
          return childRecord;
        }

        // Apply inheritance based on strategy
        switch (rule.overrideStrategy) {
          case 'extend':
            return {
              ...childRecord,
              ...this.pickFields(parentRecord, rule.inheritedFields)
            };
          case 'replace':
            return {
              ...this.pickFields(parentRecord, rule.inheritedFields),
              ...childRecord
            };
          case 'merge':
            return this.mergeRecords(
              this.pickFields(parentRecord, rule.inheritedFields),
              childRecord
            );
          default:
            return childRecord;
        }
      });
    }

    return processedData;
  }

  /**
   * Private helper methods
   */

  private async validateSingleRelationship(relationship: CustomRelationshipDefinition): Promise<string[]> {
    const errors: string[] = [];

    // Basic validation
    if (!relationship.id) {
      errors.push('Relationship ID is required');
    }
    if (!relationship.fromTable || !relationship.toTable) {
      errors.push(`Relationship '${relationship.id}' must have fromTable and toTable`);
    }
    if (!relationship.fromColumn || !relationship.toColumn) {
      errors.push(`Relationship '${relationship.id}' must have fromColumn and toColumn`);
    }

    if (!['one_to_one', 'one_to_many', 'many_to_many'].includes(relationship.relationshipType)) {
      errors.push(`Invalid relationship type '${relationship.relationshipType}' for relationship '${relationship.id}'`);
    }

    if (!['sequential', 'random', 'weighted', 'custom'].includes(relationship.generationStrategy)) {
      errors.push(`Invalid generation strategy '${relationship.generationStrategy}' for relationship '${relationship.id}'`);
    }

    // Custom generator validation
    if (relationship.generationStrategy === 'custom' && !relationship.customGenerator) {
      errors.push(`Custom generation strategy specified but no customGenerator provided for relationship '${relationship.id}'`);
    }

    // Table existence validation
    try {
      const fromTableExists = await this.tableExists(relationship.fromTable);
      const toTableExists = await this.tableExists(relationship.toTable);

      if (!fromTableExists) {
        errors.push(`From table '${relationship.fromTable}' does not exist for relationship '${relationship.id}'`);
      }
      if (!toTableExists) {
        errors.push(`To table '${relationship.toTable}' does not exist for relationship '${relationship.id}'`);
      }

      // Column existence validation if tables exist
      if (fromTableExists) {
        const fromColumnExists = await this.columnExists(relationship.fromTable, relationship.fromColumn);
        if (!fromColumnExists) {
          errors.push(`From column '${relationship.fromColumn}' does not exist in table '${relationship.fromTable}'`);
        }
      }

      if (toTableExists) {
        const toColumnExists = await this.columnExists(relationship.toTable, relationship.toColumn);
        if (!toColumnExists) {
          errors.push(`To column '${relationship.toColumn}' does not exist in table '${relationship.toTable}'`);
        }
      }

    } catch (error: any) {
      errors.push(`Could not validate tables for relationship '${relationship.id}': ${error.message}`);
    }

    return errors;
  }

  private async validateJunctionTable(junctionTable: JunctionTableDefinition): Promise<string[]> {
    const errors: string[] = [];

    if (!junctionTable.tableName) {
      errors.push('Junction table name is required');
    }
    if (!junctionTable.leftTable || !junctionTable.rightTable) {
      errors.push(`Junction table '${junctionTable.tableName}' must have leftTable and rightTable`);
    }
    if (!junctionTable.leftColumn || !junctionTable.rightColumn) {
      errors.push(`Junction table '${junctionTable.tableName}' must have leftColumn and rightColumn`);
    }

    // Check table existence
    try {
      const junctionExists = await this.tableExists(junctionTable.tableName);
      const leftExists = await this.tableExists(junctionTable.leftTable);
      const rightExists = await this.tableExists(junctionTable.rightTable);

      if (!junctionExists) {
        errors.push(`Junction table '${junctionTable.tableName}' does not exist`);
      }
      if (!leftExists) {
        errors.push(`Left table '${junctionTable.leftTable}' does not exist for junction table '${junctionTable.tableName}'`);
      }
      if (!rightExists) {
        errors.push(`Right table '${junctionTable.rightTable}' does not exist for junction table '${junctionTable.tableName}'`);
      }

    } catch (error: any) {
      errors.push(`Could not validate junction table '${junctionTable.tableName}': ${error.message}`);
    }

    return errors;
  }

  private async validateInheritanceRule(inheritanceRule: InheritanceRule): Promise<string[]> {
    const errors: string[] = [];

    if (!inheritanceRule.parentTable || !inheritanceRule.childTable) {
      errors.push('Inheritance rule must have parentTable and childTable');
    }
    if (!inheritanceRule.inheritedFields || inheritanceRule.inheritedFields.length === 0) {
      errors.push('Inheritance rule must specify inheritedFields');
    }
    if (!['extend', 'replace', 'merge'].includes(inheritanceRule.overrideStrategy)) {
      errors.push(`Invalid override strategy '${inheritanceRule.overrideStrategy}' - must be one of: extend, replace, merge`);
    }

    // Check table existence
    try {
      const parentExists = await this.tableExists(inheritanceRule.parentTable);
      const childExists = await this.tableExists(inheritanceRule.childTable);

      if (!parentExists) {
        errors.push(`Parent table '${inheritanceRule.parentTable}' does not exist`);
      }
      if (!childExists) {
        errors.push(`Child table '${inheritanceRule.childTable}' does not exist`);
      }

    } catch (error: any) {
      errors.push(`Could not validate inheritance rule: ${error.message}`);
    }

    return errors;
  }

  private async buildRelationshipGraph(
    relationships: ExtendedSeedConfig['customRelationships']
  ): Promise<RelationshipGraph> {
    const nodes: RelationshipGraph['nodes'] = [];
    const edges: RelationshipGraph['edges'] = [];
    const tableSet = new Set<string>();

    // Collect all tables involved in relationships
    if (relationships?.relationships) {
      for (const rel of relationships.relationships) {
        tableSet.add(rel.fromTable);
        tableSet.add(rel.toTable);
      }
    }

    // Add junction tables
    if (relationships?.junctionTables) {
      for (const jt of relationships.junctionTables) {
        tableSet.add(jt.tableName);
        tableSet.add(jt.leftTable);
        tableSet.add(jt.rightTable);
      }
    }

    // Create nodes
    for (const table of tableSet) {
      const isJunction = relationships?.junctionTables?.some(jt => jt.tableName === table) || false;
      const columns = await this.getTableColumns(table);
      
      nodes.push({
        table,
        type: isJunction ? 'junction' : 'entity',
        columns
      });
    }

    // Create edges
    if (relationships?.relationships) {
      for (const rel of relationships.relationships) {
        edges.push({
          from: rel.fromTable,
          to: rel.toTable,
          relationship: rel,
          strength: rel.isRequired ? 'strong' : 'weak'
        });
      }
    }

    // Detect cycles
    const cycles = this.detectCycles(nodes, edges);
    
    // Find orphan tables
    const orphanTables = this.findOrphanTables(nodes, edges);

    return {
      nodes,
      edges,
      cycles,
      orphanTables
    };
  }

  private analyzeRelationshipGraph(graph: RelationshipGraph): {
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check for complex many-to-many relationships without junction tables
    const manyToManyRels = graph.edges.filter(edge => 
      edge.relationship.relationshipType === 'many_to_many'
    );

    if (manyToManyRels.length > 0) {
      recommendations.push(`Consider creating junction tables for ${manyToManyRels.length} many-to-many relationships`);
    }

    // Check for high-degree nodes (tables with many relationships)
    const nodeDegrees = new Map<string, number>();
    graph.edges.forEach(edge => {
      nodeDegrees.set(edge.from, (nodeDegrees.get(edge.from) || 0) + 1);
      nodeDegrees.set(edge.to, (nodeDegrees.get(edge.to) || 0) + 1);
    });

    const highDegreeNodes = Array.from(nodeDegrees.entries())
      .filter(([, degree]) => degree > 5)
      .map(([table]) => table);

    if (highDegreeNodes.length > 0) {
      warnings.push(`High-degree tables detected: ${highDegreeNodes.join(', ')} - may indicate design issues`);
    }

    // Check for orphan tables
    if (graph.orphanTables.length > 0) {
      warnings.push(`Orphan tables detected: ${graph.orphanTables.join(', ')} - no relationships defined`);
    }

    return { warnings, recommendations };
  }

  private topologicalSortTables(graph: RelationshipGraph): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (table: string) => {
      if (visiting.has(table)) {
        // Cycle detected - handle gracefully
        return;
      }
      if (visited.has(table)) {
        return;
      }

      visiting.add(table);

      // Visit all dependencies first
      const dependencies = graph.edges
        .filter(edge => edge.to === table)
        .map(edge => edge.from);

      for (const dep of dependencies) {
        visit(dep);
      }

      visiting.delete(table);
      visited.add(table);
      result.push(table);
    };

    // Visit all nodes
    graph.nodes.forEach(node => visit(node.table));

    return result;
  }

  private createBatchGroups(graph: RelationshipGraph, executionOrder: string[]): RelationshipGenerationPlan['batchGroups'] {
    const batchGroups: RelationshipGenerationPlan['batchGroups'] = [];
    const processed = new Set<string>();

    for (const table of executionOrder) {
      if (processed.has(table)) continue;

      // Find all tables that can be processed in parallel with this one
      const batch = [table];
      const dependencies = this.getTableDependencies(graph, table);

      // Add tables that have the same dependencies and can be processed in parallel
      for (const otherTable of executionOrder) {
        if (otherTable === table || processed.has(otherTable)) continue;
        
        const otherDependencies = this.getTableDependencies(graph, otherTable);
        const canProcessInParallel = this.canProcessInParallel(dependencies, otherDependencies);
        
        if (canProcessInParallel) {
          batch.push(otherTable);
        }
      }

      batch.forEach(t => processed.add(t));

      batchGroups.push({
        tables: batch,
        canExecuteInParallel: batch.length > 1,
        dependencies: Array.from(dependencies)
      });
    }

    return batchGroups;
  }

  private planJunctionTableCreation(junctionTables: JunctionTableDefinition[]): RelationshipGenerationPlan['junctionTableCreation'] {
    return junctionTables.map((jt, index) => ({
      junctionTable: jt.tableName,
      dependsOn: [jt.leftTable, jt.rightTable],
      executionOrder: index + 1000 // Execute after main tables
    }));
  }

  private estimateRelationshipComplexity(
    graph: RelationshipGraph,
    relationships: ExtendedSeedConfig['customRelationships']
  ): 'low' | 'medium' | 'high' | 'critical' {
    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;
    const cycleCount = graph.cycles.length;
    const junctionTableCount = relationships?.junctionTables?.length || 0;

    if (nodeCount <= 5 && edgeCount <= 10 && cycleCount === 0) {
      return 'low';
    } else if (nodeCount <= 15 && edgeCount <= 30 && cycleCount <= 2) {
      return 'medium';
    } else if (nodeCount <= 50 && edgeCount <= 100 && cycleCount <= 5) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  private detectCycles(nodes: RelationshipGraph['nodes'], edges: RelationshipGraph['edges']): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = edges
        .filter(edge => edge.from === node)
        .map(edge => edge.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      recStack.delete(node);
    };

    nodes.forEach(node => {
      if (!visited.has(node.table)) {
        dfs(node.table, []);
      }
    });

    return cycles;
  }

  private findOrphanTables(nodes: RelationshipGraph['nodes'], edges: RelationshipGraph['edges']): string[] {
    const connectedTables = new Set<string>();
    
    edges.forEach(edge => {
      connectedTables.add(edge.from);
      connectedTables.add(edge.to);
    });

    return nodes
      .filter(node => !connectedTables.has(node.table))
      .map(node => node.table);
  }

  private getTableDependencies(graph: RelationshipGraph, table: string): Set<string> {
    return new Set(
      graph.edges
        .filter(edge => edge.to === table)
        .map(edge => edge.from)
    );
  }

  private canProcessInParallel(deps1: Set<string>, deps2: Set<string>): boolean {
    // Tables can be processed in parallel if they don't depend on each other
    // and have similar dependency sets
    const intersection = new Set([...deps1].filter(x => deps2.has(x)));
    const union = new Set([...deps1, ...deps2]);
    
    // Simple heuristic: if they share most dependencies, they can be parallel
    return intersection.size / union.size > 0.7;
  }

  private createSequentialGenerator(relationship: CustomRelationshipDefinition) {
    let counter = 0;
    return (fromId: any, context: any) => {
      counter++;
      return { [relationship.toColumn]: `${fromId}_${counter}` };
    };
  }

  private createRandomGenerator(relationship: CustomRelationshipDefinition) {
    return (fromId: any, context: any) => {
      const randomValue = Math.floor(Math.random() * 1000000);
      return { [relationship.toColumn]: `${fromId}_${randomValue}` };
    };
  }

  private createWeightedGenerator(relationship: CustomRelationshipDefinition) {
    return (fromId: any, context: any) => {
      // Simple weighted generation based on context
      const weight = context?.weight || 1;
      const value = Math.floor(Math.random() * 1000 * weight);
      return { [relationship.toColumn]: `${fromId}_${value}` };
    };
  }

  private createCustomGenerator(relationship: CustomRelationshipDefinition) {
    return (fromId: any, context: any) => {
      // Placeholder for custom generator implementation
      // In a real implementation, this would load and execute the custom function
      return { [relationship.toColumn]: `custom_${fromId}` };
    };
  }

  private pickFields(record: Record<string, any>, fields: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    fields.forEach(field => {
      if (record.hasOwnProperty(field)) {
        result[field] = record[field];
      }
    });
    return result;
  }

  private mergeRecords(parent: Record<string, any>, child: Record<string, any>): Record<string, any> {
    const result = { ...parent };
    
    Object.keys(child).forEach(key => {
      if (child[key] !== null && child[key] !== undefined) {
        result[key] = child[key];
      }
    });

    return result;
  }

  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.client.from(tableName).select('*').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { error } = await this.client.from(tableName).select(columnName).limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async getTableColumns(tableName: string): Promise<string[]> {
    try {
      // This would need to be implemented based on available database introspection
      // For now, return a basic set of columns
      return ['id', 'created_at', 'updated_at'];
    } catch {
      return [];
    }
  }
}