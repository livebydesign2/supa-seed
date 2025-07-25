/**
 * Dependency Graph Types and Utilities
 * Manages table dependencies and seeding order for relationship-aware seeding
 */

export interface TableDependency {
  fromTable: string;
  toTable: string;
  relationship: 'required' | 'optional' | 'conditional' | 'circular';
  foreignKey: ForeignKeyRelationship;
  condition?: string;
  constraint?: string;
}

export interface ForeignKeyRelationship {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | 'SET DEFAULT';
  isNullable: boolean;
  isDeferrable: boolean;
  schema: string;
}

export interface DependencyNode {
  table: string;
  schema: string;
  dependencies: string[]; // Tables this table depends on
  dependents: string[];   // Tables that depend on this table
  depth: number;          // Distance from root nodes
  priority: number;       // Seeding priority (higher = seed first)
  isCircular: boolean;    // Part of circular dependency
  metadata: TableMetadata;
}

export interface TableMetadata {
  isJunctionTable: boolean;
  isTenantScoped: boolean;
  hasTimestamps: boolean;
  primaryKeyColumns: string[];
  foreignKeyCount: number;
  estimatedSize: 'small' | 'medium' | 'large';
  seedingComplexity: 'simple' | 'moderate' | 'complex';
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'required' | 'optional' | 'conditional';
  weight: number;         // Relationship strength (1-10)
  constraint: string;
  canBeCircular: boolean;
}

export interface CircularDependency {
  tables: string[];
  edges: DependencyEdge[];
  resolutionStrategy: 'defer_constraints' | 'null_initially' | 'post_insert_update' | 'manual';
  resolutionOrder: string[];
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: CircularDependency[];
  seedingOrder: string[];
  creationOrder: string[];   // For DDL operations
  deletionOrder: string[];   // Reverse of creation order
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  totalTables: number;
  totalRelationships: number;
  circularDependencies: number;
  maxDepth: number;
  complexity: 'simple' | 'moderate' | 'complex' | 'very_complex';
  analysisTimestamp: string;
  confidence: number;
  warnings: string[];
  recommendations: string[];
}

export interface SeedingOrderOptions {
  respectCircularDependencies: boolean;
  prioritizeJunctionTables: boolean;
  groupByTenant: boolean;
  includeMetadata: boolean;
  optimizeForPerformance: boolean;
  handleOptionalRelationships: 'ignore' | 'defer' | 'include';
}

export interface SeedingOrderResult {
  success: boolean;
  seedingOrder: string[];
  phases: SeedingPhase[];
  circularDependenciesResolved: CircularDependency[];
  warnings: string[];
  errors: string[];
  metadata: {
    totalPhases: number;
    estimatedSeedingTime: number;
    complexity: string;
    recommendations: string[];
  };
}

export interface SeedingPhase {
  phase: number;
  tables: string[];
  description: string;
  canRunInParallel: boolean;
  estimatedTime: number;
  dependencies: string[];
  requirements: string[];
}

export class DependencyGraphBuilder {
  private nodes: Map<string, DependencyNode> = new Map();
  private edges: DependencyEdge[] = [];
  private cycles: CircularDependency[] = [];

  /**
   * Add a table node to the graph
   */
  addNode(table: string, schema: string = 'public', metadata?: Partial<TableMetadata>): void {
    const node: DependencyNode = {
      table,
      schema,
      dependencies: [],
      dependents: [],
      depth: 0,
      priority: 0,
      isCircular: false,
      metadata: {
        isJunctionTable: false,
        isTenantScoped: false,
        hasTimestamps: false,
        primaryKeyColumns: [],
        foreignKeyCount: 0,
        estimatedSize: 'medium',
        seedingComplexity: 'simple',
        ...metadata
      }
    };
    
    this.nodes.set(table, node);
  }

  /**
   * Add a dependency edge between tables
   */
  addEdge(from: string, to: string, relationship: ForeignKeyRelationship): void {
    const edge: DependencyEdge = {
      from,
      to,
      type: relationship.isNullable ? 'optional' : 'required',
      weight: this.calculateRelationshipWeight(relationship),
      constraint: relationship.constraintName,
      canBeCircular: relationship.isNullable || relationship.isDeferrable
    };

    this.edges.push(edge);

    // Update node dependencies
    const fromNode = this.nodes.get(from);
    const toNode = this.nodes.get(to);

    if (fromNode && !fromNode.dependencies.includes(to)) {
      fromNode.dependencies.push(to);
    }

    if (toNode && !toNode.dependents.includes(from)) {
      toNode.dependents.push(from);
    }
  }

  /**
   * Build the complete dependency graph
   */
  build(): DependencyGraph {
    // Calculate node depths and priorities
    this.calculateDepthsAndPriorities();

    // Detect circular dependencies
    this.detectCircularDependencies();

    // Calculate seeding order
    const seedingOrder = this.calculateSeedingOrder();
    
    // Generate metadata
    const metadata = this.generateGraphMetadata();

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      cycles: this.cycles,
      seedingOrder,
      creationOrder: seedingOrder,
      deletionOrder: [...seedingOrder].reverse(),
      metadata
    };
  }

  /**
   * Calculate seeding order using topological sort
   */
  calculateSeedingOrder(options: Partial<SeedingOrderOptions> = {}): string[] {
    const opts: SeedingOrderOptions = {
      respectCircularDependencies: true,
      prioritizeJunctionTables: false,
      groupByTenant: false,
      includeMetadata: true,
      optimizeForPerformance: true,
      handleOptionalRelationships: 'include',
      ...options
    };

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    // Get all nodes sorted by priority
    const sortedNodes = Array.from(this.nodes.values())
      .sort((a, b) => {
        // Handle circular dependencies first
        if (a.isCircular !== b.isCircular) {
          return a.isCircular ? 1 : -1;
        }
        
        // Then by depth (lower depth = seed first)
        if (a.depth !== b.depth) {
          return a.depth - b.depth;
        }
        
        // Then by priority
        return b.priority - a.priority;
      });

    const visit = (tableName: string): void => {
      if (visiting.has(tableName)) {
        // Circular dependency detected - handle gracefully
        return;
      }
      
      if (visited.has(tableName)) {
        return;
      }

      visiting.add(tableName);
      
      const node = this.nodes.get(tableName);
      if (node) {
        // Visit dependencies first (tables this table depends on)
        for (const dependency of node.dependencies) {
          // Skip circular dependencies if option is set
          if (opts.respectCircularDependencies && this.isCircularEdge(tableName, dependency)) {
            continue;
          }
          
          visit(dependency);
        }
      }

      visiting.delete(tableName);
      visited.add(tableName);
      order.push(tableName);
    };

    // Visit all nodes
    for (const node of sortedNodes) {
      if (!visited.has(node.table)) {
        visit(node.table);
      }
    }

    return order;
  }

  /**
   * Calculate seeding order with phases for parallel execution
   */
  calculateSeedingOrderWithPhases(options: Partial<SeedingOrderOptions> = {}): SeedingOrderResult {
    const seedingOrder = this.calculateSeedingOrder(options);
    const phases: SeedingPhase[] = [];
    
    // Group tables into phases based on dependencies
    const processedTables = new Set<string>();
    let phaseNumber = 1;

    while (processedTables.size < seedingOrder.length) {
      const phaseTabless: string[] = [];
      
      for (const table of seedingOrder) {
        if (processedTables.has(table)) continue;
        
        const node = this.nodes.get(table);
        if (!node) continue;

        // Check if all dependencies are satisfied
        const dependenciesSatisfied = node.dependencies.every(dep => 
          processedTables.has(dep) || this.isCircularEdge(table, dep)
        );

        if (dependenciesSatisfied) {
          phaseTabless.push(table);
        }
      }

      if (phaseTabless.length === 0) {
        // Deadlock - add remaining tables with warnings
        const remainingTables = seedingOrder.filter(t => !processedTables.has(t));
        phaseTabless.push(...remainingTables);
      }

      phases.push({
        phase: phaseNumber,
        tables: phaseTabless,
        description: `Phase ${phaseNumber}: ${phaseTabless.length} tables`,
        canRunInParallel: phaseTabless.length > 1,
        estimatedTime: phaseTabless.length * 1000, // 1 second per table estimate
        dependencies: phaseNumber === 1 ? [] : [`Phase ${phaseNumber - 1}`],
        requirements: []
      });

      phaseTabless.forEach(table => processedTables.add(table));
      phaseNumber++;
    }

    return {
      success: true,
      seedingOrder,
      phases,
      circularDependenciesResolved: this.cycles,
      warnings: [],
      errors: [],
      metadata: {
        totalPhases: phases.length,
        estimatedSeedingTime: phases.reduce((sum, phase) => sum + phase.estimatedTime, 0),
        complexity: this.calculateComplexity(),
        recommendations: this.generateRecommendations()
      }
    };
  }

  private calculateDepthsAndPriorities(): void {
    // Reset depths
    this.nodes.forEach(node => {
      node.depth = 0;
      node.priority = 0;
    });

    // Calculate depths using BFS
    const visited = new Set<string>();
    const queue: Array<{table: string, depth: number}> = [];

    // Start with nodes that have no dependencies (root nodes)
    this.nodes.forEach((node, table) => {
      if (node.dependencies.length === 0) {
        queue.push({table, depth: 0});
      }
    });

    while (queue.length > 0) {
      const {table, depth} = queue.shift()!;
      
      if (visited.has(table)) continue;
      visited.add(table);

      const node = this.nodes.get(table)!;
      node.depth = Math.max(node.depth, depth);
      node.priority = this.calculateNodePriority(node);

      // Add dependents to queue
      for (const dependent of node.dependents) {
        if (!visited.has(dependent)) {
          queue.push({table: dependent, depth: depth + 1});
        }
      }
    }
  }

  private detectCircularDependencies(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const findCycle = (table: string, path: string[]): string[] | null => {
      if (visiting.has(table)) {
        // Found cycle - return the cycle path
        const cycleStart = path.indexOf(table);
        return path.slice(cycleStart);
      }
      
      if (visited.has(table)) {
        return null;
      }

      visiting.add(table);
      path.push(table);

      const node = this.nodes.get(table);
      if (node) {
        for (const dependency of node.dependencies) {
          const cycle = findCycle(dependency, [...path]);
          if (cycle) {
            return cycle;
          }
        }
      }

      visiting.delete(table);
      visited.add(table);
      return null;
    };

    // Check each node for cycles
    for (const [table] of this.nodes) {
      if (!visited.has(table)) {
        const cycle = findCycle(table, []);
        if (cycle && cycle.length > 1) {
          this.addCircularDependency(cycle);
        }
      }
    }
  }

  private addCircularDependency(tables: string[]): void {
    // Mark nodes as circular
    tables.forEach(table => {
      const node = this.nodes.get(table);
      if (node) {
        node.isCircular = true;
      }
    });

    // Find edges involved in the cycle
    const cycleEdges = this.edges.filter(edge => 
      tables.includes(edge.from) && tables.includes(edge.to)
    );

    // Determine resolution strategy
    const resolutionStrategy = this.determineCircularResolutionStrategy(cycleEdges);

    this.cycles.push({
      tables,
      edges: cycleEdges,
      resolutionStrategy,
      resolutionOrder: this.calculateCircularResolutionOrder(tables, cycleEdges),
      complexity: cycleEdges.length > 2 ? 'complex' : 'simple'
    });
  }

  private determineCircularResolutionStrategy(edges: DependencyEdge[]): CircularDependency['resolutionStrategy'] {
    // If all edges can be made deferrable, use defer_constraints
    if (edges.every(edge => edge.canBeCircular)) {
      return 'defer_constraints';
    }

    // If some edges are optional, use null_initially
    if (edges.some(edge => edge.type === 'optional')) {
      return 'null_initially';
    }

    // Otherwise, use post_insert_update
    return 'post_insert_update';
  }

  private calculateCircularResolutionOrder(tables: string[], edges: DependencyEdge[]): string[] {
    // For now, return tables in dependency order
    return tables;
  }

  private calculateRelationshipWeight(relationship: ForeignKeyRelationship): number {
    let weight = 5; // Base weight

    // Adjust based on nullability
    if (!relationship.isNullable) weight += 3;
    
    // Adjust based on delete action
    switch (relationship.onDelete) {
      case 'CASCADE': weight += 2; break;
      case 'RESTRICT': weight += 3; break;
      case 'SET NULL': weight += 1; break;
    }

    return Math.min(weight, 10);
  }

  private calculateNodePriority(node: DependencyNode): number {
    let priority = 100; // Base priority

    // Adjust based on dependencies (fewer dependencies = higher priority)
    priority -= node.dependencies.length * 10;

    // Adjust based on metadata
    if (node.metadata.isJunctionTable) priority -= 20;
    if (node.metadata.isTenantScoped) priority += 10;
    
    return Math.max(priority, 0);
  }

  private isCircularEdge(from: string, to: string): boolean {
    return this.cycles.some(cycle => 
      cycle.tables.includes(from) && cycle.tables.includes(to)
    );
  }

  private generateGraphMetadata(): GraphMetadata {
    const totalTables = this.nodes.size;
    const totalRelationships = this.edges.length;
    const circularDependencies = this.cycles.length;
    const maxDepth = Math.max(...Array.from(this.nodes.values()).map(n => n.depth));

    let complexity: GraphMetadata['complexity'] = 'simple';
    if (circularDependencies > 2 || maxDepth > 5) complexity = 'complex';
    else if (circularDependencies > 0 || maxDepth > 3) complexity = 'moderate';
    if (totalTables > 20 && circularDependencies > 3) complexity = 'very_complex';

    return {
      totalTables,
      totalRelationships,
      circularDependencies,
      maxDepth,
      complexity,
      analysisTimestamp: new Date().toISOString(),
      confidence: this.calculateConfidence(),
      warnings: this.generateWarnings(),
      recommendations: this.generateRecommendations()
    };
  }

  private calculateConfidence(): number {
    const baseConfidence = 0.8;
    let confidence = baseConfidence;

    // Reduce confidence for complex scenarios
    if (this.cycles.length > 0) confidence -= 0.1;
    if (this.cycles.length > 2) confidence -= 0.2;
    
    return Math.max(confidence, 0.1);
  }

  private generateWarnings(): string[] {
    const warnings: string[] = [];

    if (this.cycles.length > 0) {
      warnings.push(`${this.cycles.length} circular dependencies detected`);
    }

    if (this.cycles.length > 3) {
      warnings.push('High number of circular dependencies may affect seeding performance');
    }

    const maxDepth = Math.max(...Array.from(this.nodes.values()).map(n => n.depth));
    if (maxDepth > 5) {
      warnings.push('Deep dependency chain detected - consider optimizing schema design');
    }

    return warnings;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.cycles.length > 0) {
      recommendations.push('Consider using nullable foreign keys or deferred constraints to reduce circular dependencies');
    }

    const junctionTables = Array.from(this.nodes.values()).filter(n => n.metadata.isJunctionTable);
    if (junctionTables.length > 0) {
      recommendations.push('Junction tables detected - ensure proper many-to-many relationship handling');
    }

    return recommendations;
  }

  private calculateComplexity(): string {
    if (this.cycles.length > 3 || this.nodes.size > 20) return 'high';
    if (this.cycles.length > 0 || this.nodes.size > 10) return 'medium';
    return 'low';
  }
}