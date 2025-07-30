/**
 * Table Relationship Discovery System
 * Discovers and maps database relationships for proper foreign key handling
 * Enables intelligent data seeding that respects referential integrity
 */

import type { createClient } from '@supabase/supabase-js';
import { 
  SchemaIntrospectionResult, 
  SchemaRelationship, 
  DatabaseTable, 
  DatabaseConstraint 
} from './schema-introspector';
import { Logger } from '../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface RelationshipGraph {
  nodes: TableNode[];
  edges: RelationshipEdge[];
  cycles: TableCycle[];
  seedingOrder: string[];
  dependencyLevels: Map<string, number>;
}

export interface TableNode {
  tableName: string;
  nodeType: 'root' | 'intermediate' | 'leaf';
  dependencies: string[];
  dependents: string[];
  seedingPriority: number;
  constraints: RelationshipConstraint[];
}

export interface RelationshipEdge {
  fromTable: string;
  toTable: string;
  foreignKey: string;
  referencedKey: string;
  relationship: 'one_to_one' | 'one_to_many' | 'many_to_many';
  cascadeDelete: boolean;
  isNullable: boolean;
  constraintName: string;
}

export interface RelationshipConstraint {
  type: 'required_parent' | 'conditional_child' | 'circular_reference' | 'self_reference';
  description: string;
  tables: string[];
  resolution: 'create_parent_first' | 'use_deferred_constraint' | 'break_cycle' | 'allow_null';
}

export interface TableCycle {
  tables: string[];
  breakPoints: Array<{
    table: string;
    column: string;
    strategy: 'allow_null' | 'defer_constraint' | 'create_placeholder';
  }>;
}

export interface SeedingStrategy {
  tableName: string;
  strategy: 'independent' | 'dependent' | 'circular' | 'deferred';
  prerequisites: string[];
  creationOrder: number;
  specialHandling?: {
    type: 'create_parent_first' | 'use_temp_values' | 'batch_update' | 'skip_constraints';
    instructions: string;
  };
}

export interface RelationshipAnalysis {
  graph: RelationshipGraph;
  strategies: Map<string, SeedingStrategy>;
  warnings: RelationshipWarning[];
  recommendations: string[];
}

export interface RelationshipWarning {
  type: 'circular_dependency' | 'missing_table' | 'constraint_conflict' | 'complex_relationship';
  message: string;
  tables: string[];
  severity: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

export class RelationshipDiscoverer {
  private client: SupabaseClient;
  private schemaInfo: SchemaIntrospectionResult | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Analyze all table relationships and create seeding strategies
   */
  async analyzeRelationships(schemaInfo: SchemaIntrospectionResult): Promise<RelationshipAnalysis> {
    this.schemaInfo = schemaInfo;
    Logger.info('🔗 Analyzing table relationships for seeding strategy...');

    const graph = await this.buildRelationshipGraph();
    const strategies = await this.createSeedingStrategies(graph);
    const warnings = this.identifyWarnings(graph);
    const recommendations = this.generateRecommendations(graph, strategies);

    Logger.success(`✅ Relationship analysis complete: ${graph.nodes.length} tables, ${graph.edges.length} relationships`);

    return {
      graph,
      strategies,
      warnings,
      recommendations
    };
  }

  /**
   * Build a complete relationship graph
   */
  private async buildRelationshipGraph(): Promise<RelationshipGraph> {
    if (!this.schemaInfo) {
      throw new Error('Schema information not available');
    }

    const nodes: TableNode[] = [];
    const edges: RelationshipEdge[] = [];

    // Create nodes for each table
    for (const table of this.schemaInfo.tables) {
      const node = await this.createTableNode(table);
      nodes.push(node);
    }

    // Create edges from relationships
    for (const relationship of this.schemaInfo.relationships) {
      const edge = await this.createRelationshipEdge(relationship);
      edges.push(edge);
    }

    // Enhance edges with additional analysis
    await this.enhanceRelationshipEdges(edges);

    // Update node dependencies based on edges
    this.updateNodeDependencies(nodes, edges);

    // Detect cycles
    const cycles = this.detectCycles(nodes, edges);

    // Calculate seeding order
    const seedingOrder = this.calculateSeedingOrder(nodes, edges, cycles);

    // Calculate dependency levels
    const dependencyLevels = this.calculateDependencyLevels(nodes, edges);

    return {
      nodes,
      edges,
      cycles,
      seedingOrder,
      dependencyLevels
    };
  }

  /**
   * Create a table node with dependency analysis
   */
  private async createTableNode(table: DatabaseTable): Promise<TableNode> {
    const dependencies: string[] = [];
    const dependents: string[] = [];
    const constraints: RelationshipConstraint[] = [];

    // Analyze foreign key constraints to find dependencies
    for (const constraint of table.constraints) {
      if (constraint.type === 'FOREIGN KEY' && constraint.referencedTable) {
        dependencies.push(constraint.referencedTable);
        
        // Create constraint for required parent
        if (!this.isColumnNullable(table, constraint.columns[0])) {
          constraints.push({
            type: 'required_parent',
            description: `Table ${table.name} requires ${constraint.referencedTable} to exist first`,
            tables: [table.name, constraint.referencedTable],
            resolution: 'create_parent_first'
          });
        }
      }
    }

    // Determine node type
    let nodeType: TableNode['nodeType'] = 'intermediate';
    if (dependencies.length === 0) {
      nodeType = 'root';
    } else if (dependents.length === 0) {
      nodeType = 'leaf';
    }

    return {
      tableName: table.name,
      nodeType,
      dependencies,
      dependents, // Will be populated later
      seedingPriority: this.calculateSeedingPriority(table, dependencies.length),
      constraints
    };
  }

  /**
   * Create a relationship edge with detailed analysis
   */
  private async createRelationshipEdge(relationship: SchemaRelationship): Promise<RelationshipEdge> {
    return {
      fromTable: relationship.fromTable,
      toTable: relationship.toTable,
      foreignKey: relationship.fromColumn,
      referencedKey: relationship.toColumn,
      relationship: relationship.relationshipType,
      cascadeDelete: relationship.cascadeDelete,
      isNullable: !relationship.isRequired,
      constraintName: `fk_${relationship.fromTable}_${relationship.fromColumn}`
    };
  }

  /**
   * Enhance relationship edges with additional database analysis
   */
  private async enhanceRelationshipEdges(edges: RelationshipEdge[]): Promise<void> {
    for (const edge of edges) {
      try {
        // Check if the foreign key is actually nullable in the database
        const fromTable = this.schemaInfo?.tables.find(t => t.name === edge.fromTable);
        if (fromTable) {
          const column = fromTable.columns.find(c => c.name === edge.foreignKey);
          if (column) {
            edge.isNullable = column.isNullable;
          }
        }

        // Enhance relationship type detection
        edge.relationship = await this.detectRelationshipType(edge);

      } catch (error: any) {
        Logger.warn(`Failed to enhance edge ${edge.fromTable}->${edge.toTable}: ${error.message}`);
      }
    }
  }

  /**
   * Detect the actual relationship type between tables
   */
  private async detectRelationshipType(edge: RelationshipEdge): Promise<RelationshipEdge['relationship']> {
    try {
      // Check if foreign key has unique constraint (indicates one-to-one)
      const fromTable = this.schemaInfo?.tables.find(t => t.name === edge.fromTable);
      if (fromTable) {
        const hasUniqueConstraint = fromTable.constraints.some(c => 
          c.type === 'UNIQUE' && c.columns.includes(edge.foreignKey)
        );
        
        if (hasUniqueConstraint) {
          return 'one_to_one';
        }
      }

      // Check for junction table pattern (indicates many-to-many)
      if (this.isJunctionTable(edge.fromTable)) {
        return 'many_to_many';
      }

      // Default to one-to-many
      return 'one_to_many';

    } catch (error) {
      return 'one_to_many'; // Safe default
    }
  }

  /**
   * Check if a table is a junction table (for many-to-many relationships)
   */
  private isJunctionTable(tableName: string): boolean {
    const table = this.schemaInfo?.tables.find(t => t.name === tableName);
    if (!table) return false;

    // Junction tables typically have only foreign keys and maybe an ID
    const foreignKeyCount = table.constraints.filter(c => c.type === 'FOREIGN KEY').length;
    const totalColumns = table.columns.length;

    // Heuristic: if most columns are foreign keys, it's likely a junction table
    return foreignKeyCount >= 2 && foreignKeyCount >= totalColumns - 2;
  }

  /**
   * Update node dependencies based on edges
   */
  private updateNodeDependencies(nodes: TableNode[], edges: RelationshipEdge[]): void {
    // Clear existing dependencies/dependents
    for (const node of nodes) {
      node.dependencies = [];
      node.dependents = [];
    }

    // Rebuild based on edges
    for (const edge of edges) {
      const fromNode = nodes.find(n => n.tableName === edge.fromTable);
      const toNode = nodes.find(n => n.tableName === edge.toTable);

      if (fromNode && toNode) {
        // From table depends on To table
        if (!fromNode.dependencies.includes(edge.toTable)) {
          fromNode.dependencies.push(edge.toTable);
        }
        
        // To table has From table as dependent
        if (!toNode.dependents.includes(edge.fromTable)) {
          toNode.dependents.push(edge.fromTable);
        }
      }
    }

    // Update node types based on final dependencies
    for (const node of nodes) {
      if (node.dependencies.length === 0 && node.dependents.length > 0) {
        node.nodeType = 'root';
      } else if (node.dependencies.length > 0 && node.dependents.length === 0) {
        node.nodeType = 'leaf';
      } else {
        node.nodeType = 'intermediate';
      }
    }
  }

  /**
   * Detect circular dependencies in the relationship graph
   */
  private detectCycles(nodes: TableNode[], edges: RelationshipEdge[]): TableCycle[] {
    const cycles: TableCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (tableName: string, path: string[]): boolean => {
      if (recursionStack.has(tableName)) {
        // Found a cycle
        const cycleStart = path.indexOf(tableName);
        const cycleTables = path.slice(cycleStart);
        cycleTables.push(tableName); // Complete the cycle

        const cycle = this.createTableCycle(cycleTables, edges);
        cycles.push(cycle);
        
        return true;
      }

      if (visited.has(tableName)) {
        return false;
      }

      visited.add(tableName);
      recursionStack.add(tableName);
      path.push(tableName);

      const node = nodes.find(n => n.tableName === tableName);
      if (node) {
        for (const dependency of node.dependencies) {
          if (hasCycle(dependency, [...path])) {
            return true;
          }
        }
      }

      recursionStack.delete(tableName);
      return false;
    };

    // Check each node for cycles
    for (const node of nodes) {
      if (!visited.has(node.tableName)) {
        hasCycle(node.tableName, []);
      }
    }

    return cycles;
  }

  /**
   * Create a table cycle with break point strategies
   */
  private createTableCycle(tables: string[], edges: RelationshipEdge[]): TableCycle {
    const breakPoints: TableCycle['breakPoints'] = [];

    // Find the best places to break the cycle
    for (let i = 0; i < tables.length - 1; i++) {
      const fromTable = tables[i];
      const toTable = tables[i + 1];

      const edge = edges.find(e => e.fromTable === fromTable && e.toTable === toTable);
      if (edge) {
        let strategy: TableCycle['breakPoints'][0]['strategy'] = 'allow_null';

        if (edge.isNullable) {
          strategy = 'allow_null';
        } else {
          // Check if we can defer the constraint
          strategy = 'defer_constraint';
        }

        breakPoints.push({
          table: fromTable,
          column: edge.foreignKey,
          strategy
        });
      }
    }

    return {
      tables: tables.slice(0, -1), // Remove duplicate last element
      breakPoints
    };
  }

  /**
   * Calculate optimal seeding order considering dependencies and cycles
   */
  private calculateSeedingOrder(
    nodes: TableNode[], 
    edges: RelationshipEdge[], 
    cycles: TableCycle[]
  ): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    // First, add all root nodes (no dependencies)
    const rootNodes = nodes.filter(n => n.nodeType === 'root').sort((a, b) => b.seedingPriority - a.seedingPriority);
    for (const node of rootNodes) {
      order.push(node.tableName);
      visited.add(node.tableName);
    }

    // Then add nodes in dependency order
    let changed = true;
    while (changed && visited.size < nodes.length) {
      changed = false;
      
      for (const node of nodes) {
        if (visited.has(node.tableName)) continue;

        // Check if all dependencies are satisfied
        const dependenciesSatisfied = node.dependencies.every(dep => {
          // Allow cycle break points to be skipped initially
          const isInCycle = cycles.some(cycle => 
            cycle.tables.includes(node.tableName) && cycle.tables.includes(dep)
          );
          return visited.has(dep) || isInCycle;
        });

        if (dependenciesSatisfied) {
          order.push(node.tableName);
          visited.add(node.tableName);
          changed = true;
        }
      }
    }

    // Add any remaining nodes (shouldn't happen with proper cycle handling)
    for (const node of nodes) {
      if (!visited.has(node.tableName)) {
        order.push(node.tableName);
      }
    }

    return order;
  }

  /**
   * Calculate dependency levels for parallel seeding
   */
  private calculateDependencyLevels(nodes: TableNode[], edges: RelationshipEdge[]): Map<string, number> {
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (tableName: string): number => {
      if (levels.has(tableName)) {
        return levels.get(tableName)!;
      }

      const node = nodes.find(n => n.tableName === tableName);
      if (!node || node.dependencies.length === 0) {
        levels.set(tableName, 0);
        return 0;
      }

      let maxDependencyLevel = -1;
      for (const dependency of node.dependencies) {
        if (!visited.has(dependency)) {
          visited.add(dependency);
          const depLevel = calculateLevel(dependency);
          maxDependencyLevel = Math.max(maxDependencyLevel, depLevel);
        }
      }

      const level = maxDependencyLevel + 1;
      levels.set(tableName, level);
      return level;
    };

    // Calculate level for each node
    for (const node of nodes) {
      if (!visited.has(node.tableName)) {
        visited.add(node.tableName);
        calculateLevel(node.tableName);
      }
    }

    return levels;
  }

  /**
   * Create seeding strategies for each table
   */
  private async createSeedingStrategies(graph: RelationshipGraph): Promise<Map<string, SeedingStrategy>> {
    const strategies = new Map<string, SeedingStrategy>();

    for (const node of graph.nodes) {
      const strategy = await this.createTableSeedingStrategy(node, graph);
      strategies.set(node.tableName, strategy);
    }

    return strategies;
  }

  /**
   * Create seeding strategy for a specific table
   */
  private async createTableSeedingStrategy(
    node: TableNode, 
    graph: RelationshipGraph
  ): Promise<SeedingStrategy> {
    const isInCycle = graph.cycles.some(cycle => cycle.tables.includes(node.tableName));
    const creationOrder = graph.seedingOrder.indexOf(node.tableName);

    let strategy: SeedingStrategy['strategy'] = 'independent';
    let specialHandling: SeedingStrategy['specialHandling'];

    if (node.dependencies.length === 0) {
      strategy = 'independent';
    } else if (isInCycle) {
      strategy = 'circular';
      specialHandling = {
        type: 'use_temp_values',
        instructions: 'Create with null foreign keys initially, then update with batch operation'
      };
    } else if (node.dependencies.length > 0) {
      strategy = 'dependent';
      
      // Check if any dependencies have complex constraints
      const hasComplexConstraints = node.constraints.some(c => c.type === 'required_parent');
      if (hasComplexConstraints) {
        specialHandling = {
          type: 'create_parent_first',
          instructions: 'Ensure all parent records exist before creating this record'
        };
      }
    }

    return {
      tableName: node.tableName,
      strategy,
      prerequisites: node.dependencies,
      creationOrder,
      specialHandling
    };
  }

  /**
   * Identify potential warnings in the relationship graph
   */
  private identifyWarnings(graph: RelationshipGraph): RelationshipWarning[] {
    const warnings: RelationshipWarning[] = [];

    // Circular dependency warnings
    for (const cycle of graph.cycles) {
      warnings.push({
        type: 'circular_dependency',
        message: `Circular dependency detected between tables: ${cycle.tables.join(' -> ')}`,
        tables: cycle.tables,
        severity: 'high',
        suggestedAction: `Use nullable foreign keys or deferred constraints at: ${cycle.breakPoints.map(bp => `${bp.table}.${bp.column}`).join(', ')}`
      });
    }

    // Complex relationship warnings
    const complexNodes = graph.nodes.filter(n => n.dependencies.length > 3);
    for (const node of complexNodes) {
      warnings.push({
        type: 'complex_relationship',
        message: `Table ${node.tableName} has ${node.dependencies.length} dependencies`,
        tables: [node.tableName, ...node.dependencies],
        severity: 'medium',
        suggestedAction: `Consider seeding ${node.tableName} after all dependencies are created`
      });
    }

    return warnings;
  }

  /**
   * Generate recommendations for improved seeding
   */
  private generateRecommendations(
    graph: RelationshipGraph, 
    strategies: Map<string, SeedingStrategy>
  ): string[] {
    const recommendations: string[] = [];

    // Recommend parallel seeding for independent tables
    const independentTables = Array.from(strategies.values()).filter(s => s.strategy === 'independent');
    if (independentTables.length > 1) {
      recommendations.push(
        `${independentTables.length} independent tables can be seeded in parallel: ${independentTables.map(t => t.tableName).join(', ')}`
      );
    }

    // Recommend batch operations for circular dependencies
    if (graph.cycles.length > 0) {
      recommendations.push(
        `${graph.cycles.length} circular dependencies detected. Use batch operations with nullable foreign keys for optimal performance.`
      );
    }

    // Recommend level-based seeding
    const maxLevel = Math.max(...Array.from(graph.dependencyLevels.values()));
    if (maxLevel > 3) {
      recommendations.push(
        `Deep dependency chain detected (${maxLevel} levels). Consider level-based parallel seeding.`
      );
    }

    return recommendations;
  }

  /**
   * Utility methods
   */
  private isColumnNullable(table: DatabaseTable, columnName: string): boolean {
    const column = table.columns.find(c => c.name === columnName);
    return column?.isNullable ?? true;
  }

  private calculateSeedingPriority(table: DatabaseTable, dependencyCount: number): number {
    // Higher priority for tables with fewer dependencies
    let priority = 100 - (dependencyCount * 10);

    // Boost priority for user-related tables
    if (table.name.includes('user') || table.name.includes('profile') || table.name.includes('account')) {
      priority += 20;
    }

    // Boost priority for core system tables
    if (table.name.includes('auth') || table.name.includes('role') || table.name.includes('permission')) {
      priority += 15;
    }

    return Math.max(0, priority);
  }

  /**
   * Get seeding order for a specific set of tables
   */
  async getSeedingOrder(tableNames: string[]): Promise<string[]> {
    if (!this.schemaInfo) {
      throw new Error('Schema information not available. Call analyzeRelationships first.');
    }

    // Filter the global seeding order to only include requested tables
    const analysis = await this.analyzeRelationships(this.schemaInfo);
    return analysis.graph.seedingOrder.filter(table => tableNames.includes(table));
  }

  /**
   * Check if two tables can be seeded in parallel
   */
  async canSeedInParallel(table1: string, table2: string): Promise<boolean> {
    if (!this.schemaInfo) {
      throw new Error('Schema information not available. Call analyzeRelationships first.');
    }

    const analysis = await this.analyzeRelationships(this.schemaInfo);
    
    // Check if either table depends on the other
    const node1 = analysis.graph.nodes.find(n => n.tableName === table1);
    const node2 = analysis.graph.nodes.find(n => n.tableName === table2);

    if (!node1 || !node2) return false;

    const table1DependsOnTable2 = node1.dependencies.includes(table2);
    const table2DependsOnTable1 = node2.dependencies.includes(table1);

    return !table1DependsOnTable2 && !table2DependsOnTable1;
  }

  /**
   * Get all tables that can be seeded at a specific dependency level
   */
  async getTablesAtLevel(level: number): Promise<string[]> {
    if (!this.schemaInfo) {
      throw new Error('Schema information not available. Call analyzeRelationships first.');
    }

    const analysis = await this.analyzeRelationships(this.schemaInfo);
    const tables: string[] = [];

    for (const [tableName, tableLevel] of analysis.graph.dependencyLevels) {
      if (tableLevel === level) {
        tables.push(tableName);
      }
    }

    return tables;
  }
}