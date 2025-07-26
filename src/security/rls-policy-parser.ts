/**
 * Advanced RLS Policy Parser for Epic 1: Universal MakerKit Core System
 * Sophisticated SQL policy expression parsing and validation for complex RLS conditions
 * Part of Task 1.4.2: Implement advanced SQL policy parser for complex conditions
 */

import { Logger } from '../utils/logger';

/**
 * Parsed policy condition structure
 */
export interface ParsedPolicyCondition {
  type: 'simple' | 'complex' | 'compound' | 'subquery' | 'function_call';
  expression: string;
  conditions: PolicyConditionNode[];
  dependencies: PolicyDependency[];
  complexity: PolicyComplexity;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
}

export interface PolicyConditionNode {
  nodeType: 'comparison' | 'logical' | 'function' | 'column' | 'literal' | 'subquery';
  operator?: LogicalOperator | ComparisonOperator;
  left?: PolicyConditionNode;
  right?: PolicyConditionNode;
  value?: any;
  columnName?: string;
  functionName?: string;
  arguments?: PolicyConditionNode[];
  subquery?: ParsedSubquery;
}

export interface ParsedSubquery {
  select: string[];
  from: string[];
  where?: ParsedPolicyCondition;
  joins: JoinClause[];
  complexity: number;
  potentialPerformanceIssues: string[];
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS';
  table: string;
  condition: string;
  complexity: number;
}

export interface PolicyDependency {
  type: 'table' | 'column' | 'function' | 'role' | 'session_variable';
  name: string;
  schema?: string;
  required: boolean;
  description: string;
  security_implications: string[];
}

export interface PolicyComplexity {
  score: number; // 1-100
  level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex' | 'extreme';
  factors: ComplexityFactor[];
  maintainability: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
  testability: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
}

export interface ComplexityFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface SecurityAnalysis {
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong' | 'excellent';
  vulnerabilities: SecurityVulnerability[];
  recommendations: SecurityRecommendation[];
  bypassRisks: BypassRisk[];
  injectionRisks: InjectionRisk[];
}

export interface SecurityVulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: 'data_leak' | 'privilege_escalation' | 'injection' | 'bypass' | 'timing_attack';
  description: string;
  example?: string;
  mitigation: string;
  cwe?: string; // Common Weakness Enumeration ID
}

export interface SecurityRecommendation {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
  implementation: string;
  impact: 'positive' | 'neutral' | 'negative';
}

export interface BypassRisk {
  method: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
  description: string;
  prevention: string;
}

export interface InjectionRisk {
  vector: string;
  type: 'sql_injection' | 'parameter_injection' | 'function_injection';
  severity: 'critical' | 'high' | 'medium' | 'low';
  example: string;
  prevention: string;
}

export interface PerformanceAnalysis {
  impact: 'negligible' | 'minimal' | 'low' | 'moderate' | 'high' | 'severe';
  estimatedOverhead: number; // percentage
  bottlenecks: PerformanceBottleneck[];
  optimizations: OptimizationSuggestion[];
  indexRequirements: IndexRequirement[];
}

export interface PerformanceBottleneck {
  location: string;
  type: 'sequential_scan' | 'nested_loop' | 'subquery' | 'function_call' | 'join';
  impact: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface OptimizationSuggestion {
  suggestion: string;
  potential_improvement: string;
  effort: 'minimal' | 'low' | 'moderate' | 'high';
  risk: 'safe' | 'low_risk' | 'moderate_risk' | 'high_risk';
}

export interface IndexRequirement {
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  priority: 'critical' | 'high' | 'medium' | 'low';
  rationale: string;
}

export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type ComparisonOperator = '=' | '!=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'ILIKE' | 'IN' | 'NOT IN' | 'EXISTS' | 'NOT EXISTS' | 'IS NULL' | 'IS NOT NULL';

/**
 * Policy conflict analysis
 */
export interface PolicyConflictReport {
  conflicts: PolicyConflict[];
  overlaps: PolicyOverlap[];
  gaps: PolicyGap[];
  recommendations: ConflictResolution[];
}

export interface PolicyConflict {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'contradictory' | 'redundant' | 'ambiguous' | 'ordering';
  policies: string[];
  description: string;
  example: string;
  resolution: string;
}

export interface PolicyOverlap {
  policies: string[];
  overlap_type: 'identical' | 'subset' | 'intersection';
  redundancy_level: 'complete' | 'partial' | 'minimal';
  recommendation: string;
}

export interface PolicyGap {
  scenario: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  suggested_policy: string;
}

export interface ConflictResolution {
  conflict_id: string;
  strategy: 'merge' | 'prioritize' | 'separate' | 'refactor';
  implementation: string;
  risk_assessment: string;
}

/**
 * Advanced RLS Policy Parser
 * Parses and analyzes complex SQL policy expressions
 */
export class RLSPolicyParser {
  private static readonly RESERVED_WORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'EXISTS', 'IN', 'LIKE', 'ILIKE',
    'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'ON', 'USING',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'UNION', 'INTERSECT', 'EXCEPT'
  ]);

  private static readonly SECURITY_FUNCTIONS = new Set([
    'auth.uid', 'auth.role', 'current_user', 'session_user', 'current_role',
    'current_setting', 'pg_has_role', 'has_table_privilege', 'has_column_privilege'
  ]);

  private static readonly DANGEROUS_PATTERNS = [
    /'\s*OR\s*'1'\s*=\s*'1/i, // SQL injection pattern
    /;\s*(DROP|DELETE|UPDATE|INSERT)/i, // Statement injection
    /EXECUTE\s+/i, // Dynamic SQL execution
    /\$\$[^$]*\$\$/g, // Dollar quoting (potential code injection)
  ];

  /**
   * Parse a policy expression into structured format
   */
  parsePolicy(expression: string): ParsedPolicyCondition {
    Logger.debug(`🔍 Parsing policy expression: ${expression.substring(0, 100)}...`);

    try {
      // Normalize the expression
      const normalizedExpression = this.normalizeExpression(expression);
      
      // Tokenize the expression
      const tokens = this.tokenize(normalizedExpression);
      
      // Parse tokens into AST
      const ast = this.parseTokens(tokens);
      
      // Analyze dependencies
      const dependencies = this.analyzeDependencies(ast, normalizedExpression);
      
      // Calculate complexity
      const complexity = this.calculateComplexity(ast, dependencies);
      
      // Perform security analysis
      const security = this.analyzeSecurityImplications(ast, normalizedExpression);
      
      // Analyze performance impact
      const performance = this.analyzePerformanceImpact(ast, dependencies);
      
      // Determine overall type
      const type = this.determineExpressionType(ast, complexity);

      return {
        type,
        expression: normalizedExpression,
        conditions: [ast],
        dependencies,
        complexity,
        security,
        performance
      };

    } catch (error: any) {
      Logger.error(`Failed to parse policy expression: ${error.message}`);
      
      // Return fallback analysis for unparseable expressions
      return this.createFallbackAnalysis(expression, error);
    }
  }

  /**
   * Detect conflicts between multiple policies
   */
  detectPolicyConflicts(policies: Array<{name: string, expression: string, command: string, type: 'PERMISSIVE' | 'RESTRICTIVE'}>): PolicyConflictReport {
    Logger.debug(`🔄 Analyzing conflicts between ${policies.length} policies`);

    const conflicts: PolicyConflict[] = [];
    const overlaps: PolicyOverlap[] = [];
    const gaps: PolicyGap[] = [];

    // Parse all policies
    const parsedPolicies = policies.map(p => ({
      ...p,
      parsed: this.parsePolicy(p.expression)
    }));

    // Check for conflicts between policies
    for (let i = 0; i < parsedPolicies.length; i++) {
      for (let j = i + 1; j < parsedPolicies.length; j++) {
        const policy1 = parsedPolicies[i];
        const policy2 = parsedPolicies[j];

        // Only check policies that apply to the same command
        if (policy1.command === policy2.command || policy1.command === 'ALL' || policy2.command === 'ALL') {
          const conflict = this.analyzeConflictBetweenPolicies(policy1, policy2);
          if (conflict) {
            conflicts.push(conflict);
          }

          const overlap = this.analyzeOverlapBetweenPolicies(policy1, policy2);
          if (overlap) {
            overlaps.push(overlap);
          }
        }
      }
    }

    // Check for coverage gaps
    const coverageGaps = this.identifyPolicyGaps(parsedPolicies);
    gaps.push(...coverageGaps);

    // Generate resolution recommendations
    const recommendations = this.generateConflictResolutions(conflicts, overlaps, gaps);

    return {
      conflicts,
      overlaps,
      gaps,
      recommendations
    };
  }

  /**
   * Validate policy logic for correctness and security
   */
  validatePolicyLogic(condition: ParsedPolicyCondition): Array<{severity: string, message: string, suggestion: string}> {
    const issues: Array<{severity: string, message: string, suggestion: string}> = [];

    // Check for security vulnerabilities
    for (const vuln of condition.security.vulnerabilities) {
      issues.push({
        severity: vuln.severity,
        message: vuln.description,
        suggestion: vuln.mitigation
      });
    }

    // Check for performance issues
    for (const bottleneck of condition.performance.bottlenecks) {
      if (bottleneck.impact === 'critical' || bottleneck.impact === 'high') {
        issues.push({
          severity: bottleneck.impact === 'critical' ? 'high' : 'medium',
          message: `Performance bottleneck: ${bottleneck.description}`,
          suggestion: `Optimize ${bottleneck.location} to improve performance`
        });
      }
    }

    // Check for complexity issues
    if (condition.complexity.level === 'very_complex' || condition.complexity.level === 'extreme') {
      issues.push({
        severity: 'medium',
        message: `Policy is very complex (${condition.complexity.score}/100) and may be difficult to maintain`,
        suggestion: 'Consider breaking down into simpler policies or adding documentation'
      });
    }

    // Check for logical issues
    const logicalIssues = this.validateLogicalStructure(condition.conditions[0]);
    issues.push(...logicalIssues);

    return issues;
  }

  /**
   * Private parsing methods
   */
  private normalizeExpression(expression: string): string {
    return expression
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n/g, ' ')   // Remove newlines
      .replace(/\t/g, ' ');  // Remove tabs
  }

  private tokenize(expression: string): string[] {
    // Simple tokenizer - would be more sophisticated in production
    const tokens: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (!inString && (char === '"' || char === "'")) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        inString = true;
        stringChar = char;
        current = char;
      } else if (inString && char === stringChar) {
        current += char;
        tokens.push(current);
        current = '';
        inString = false;
        stringChar = '';
      } else if (inString) {
        current += char;
      } else if (/\s/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if (/[(),=<>!]/.test(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
      } else {
        current += char;
      }
    }

    if (current) {
      tokens.push(current);
    }

    return tokens.filter(token => token.trim() !== '');
  }

  private parseTokens(tokens: string[]): PolicyConditionNode {
    // Simplified recursive descent parser
    let index = 0;

    const parseExpression = (): PolicyConditionNode => {
      return parseOrExpression();
    };

    const parseOrExpression = (): PolicyConditionNode => {
      let left = parseAndExpression();

      while (index < tokens.length && tokens[index].toUpperCase() === 'OR') {
        index++; // consume 'OR'
        const right = parseAndExpression();
        left = {
          nodeType: 'logical',
          operator: 'OR',
          left,
          right
        };
      }

      return left;
    };

    const parseAndExpression = (): PolicyConditionNode => {
      let left = parseNotExpression();

      while (index < tokens.length && tokens[index].toUpperCase() === 'AND') {
        index++; // consume 'AND'
        const right = parseNotExpression();
        left = {
          nodeType: 'logical',
          operator: 'AND',
          left,
          right
        };
      }

      return left;
    };

    const parseNotExpression = (): PolicyConditionNode => {
      if (index < tokens.length && tokens[index].toUpperCase() === 'NOT') {
        index++; // consume 'NOT'
        const operand = parseComparison();
        return {
          nodeType: 'logical',
          operator: 'NOT',
          right: operand
        };
      }

      return parseComparison();
    };

    const parseComparison = (): PolicyConditionNode => {
      const left = parsePrimary();

      if (index < tokens.length && this.isComparisonOperator(tokens[index])) {
        const operator = tokens[index] as ComparisonOperator;
        index++;
        const right = parsePrimary();
        
        return {
          nodeType: 'comparison',
          operator,
          left,
          right
        };
      }

      return left;
    };

    const parsePrimary = (): PolicyConditionNode => {
      if (index >= tokens.length) {
        throw new Error('Unexpected end of expression');
      }

      const token = tokens[index];

      // Handle parentheses
      if (token === '(') {
        index++; // consume '('
        const expr = parseExpression();
        if (index >= tokens.length || tokens[index] !== ')') {
          throw new Error('Expected closing parenthesis');
        }
        index++; // consume ')'
        return expr;
      }

      // Handle function calls
      if (index + 1 < tokens.length && tokens[index + 1] === '(') {
        const functionName = token;
        index += 2; // consume function name and '('
        
        const args: PolicyConditionNode[] = [];
        while (index < tokens.length && tokens[index] !== ')') {
          if (tokens[index] === ',') {
            index++; // consume ','
            continue;
          }
          args.push(parsePrimary());
        }
        
        if (index >= tokens.length || tokens[index] !== ')') {
          throw new Error('Expected closing parenthesis for function');
        }
        index++; // consume ')'
        
        return {
          nodeType: 'function',
          functionName,
          arguments: args
        };
      }

      // Handle literals and columns
      index++;
      
      if (token.startsWith('"') || token.startsWith("'")) {
        return {
          nodeType: 'literal',
          value: token.slice(1, -1) // Remove quotes
        };
      }

      if (/^\d+$/.test(token)) {
        return {
          nodeType: 'literal',
          value: parseInt(token)
        };
      }

      if (token.toLowerCase() === 'true' || token.toLowerCase() === 'false') {
        return {
          nodeType: 'literal',
          value: token.toLowerCase() === 'true'
        };
      }

      // Assume it's a column name
      return {
        nodeType: 'column',
        columnName: token
      };
    };

    return parseExpression();
  }

  private isComparisonOperator(token: string): boolean {
    const upperToken = token.toUpperCase();
    return ['=', '!=', '<>', '<', '<=', '>', '>=', 'LIKE', 'ILIKE', 'IN', 'EXISTS'].includes(upperToken);
  }

  private analyzeDependencies(ast: PolicyConditionNode, expression: string): PolicyDependency[] {
    const dependencies: PolicyDependency[] = [];
    const visited = new Set<string>();

    const traverse = (node: PolicyConditionNode) => {
      switch (node.nodeType) {
        case 'column':
          if (node.columnName && !visited.has(node.columnName)) {
            visited.add(node.columnName);
            dependencies.push({
              type: 'column',
              name: node.columnName,
              required: true,
              description: `Column reference: ${node.columnName}`,
              security_implications: this.analyzeColumnSecurity(node.columnName)
            });
          }
          break;

        case 'function':
          if (node.functionName && !visited.has(node.functionName)) {
            visited.add(node.functionName);
            dependencies.push({
              type: 'function',
              name: node.functionName,
              required: true,
              description: `Function call: ${node.functionName}()`,
              security_implications: this.analyzeFunctionSecurity(node.functionName)
            });
          }
          if (node.arguments) {
            node.arguments.forEach(traverse);
          }
          break;

        case 'logical':
        case 'comparison':
          if (node.left) traverse(node.left);
          if (node.right) traverse(node.right);
          break;
      }
    };

    traverse(ast);

    // Additional dependency analysis from raw expression
    const additionalDeps = this.extractAdditionalDependencies(expression);
    dependencies.push(...additionalDeps);

    return dependencies;
  }

  private analyzeColumnSecurity(columnName: string): string[] {
    const implications: string[] = [];

    if (columnName.toLowerCase().includes('id')) {
      implications.push('Contains identifying information');
    }
    if (columnName.toLowerCase().includes('user') || columnName.toLowerCase().includes('account')) {
      implications.push('User-related data - high privacy sensitivity');
    }
    if (columnName.toLowerCase().includes('password') || columnName.toLowerCase().includes('secret')) {
      implications.push('Contains sensitive authentication data');
    }

    return implications;
  }

  private analyzeFunctionSecurity(functionName: string): string[] {
    const implications: string[] = [];

    if (RLSPolicyParser.SECURITY_FUNCTIONS.has(functionName)) {
      implications.push('Security-related function - critical for access control');
    }
    if (functionName.includes('auth.')) {
      implications.push('Authentication function - ensure proper context');
    }
    if (functionName.includes('current_')) {
      implications.push('Session-dependent function - context sensitive');
    }

    return implications;
  }

  private extractAdditionalDependencies(expression: string): PolicyDependency[] {
    const dependencies: PolicyDependency[] = [];

    // Look for auth.uid() calls
    if (expression.includes('auth.uid()')) {
      dependencies.push({
        type: 'session_variable',
        name: 'auth.uid',
        required: true,
        description: 'Requires authenticated user session',
        security_implications: ['Depends on authentication state', 'Critical for user isolation']
      });
    }

    // Look for role references
    const roleMatches = expression.match(/current_role|session_user|current_user/g);
    if (roleMatches) {
      roleMatches.forEach(match => {
        dependencies.push({
          type: 'role',
          name: match,
          required: true,
          description: `Role-based access control: ${match}`,
          security_implications: ['Role-dependent access', 'Security context required']
        });
      });
    }

    return dependencies;
  }

  private calculateComplexity(ast: PolicyConditionNode, dependencies: PolicyDependency[]): PolicyComplexity {
    const factors: ComplexityFactor[] = [];
    let totalScore = 0;

    // Base complexity from AST depth
    const depth = this.calculateASTDepth(ast);
    const depthScore = Math.min(depth * 5, 30);
    totalScore += depthScore;
    factors.push({
      factor: 'AST Depth',
      impact: depthScore,
      description: `Expression has ${depth} levels of nesting`
    });

    // Complexity from dependencies
    const depScore = Math.min(dependencies.length * 3, 20);
    totalScore += depScore;
    factors.push({
      factor: 'Dependencies',
      impact: depScore,
      description: `Policy depends on ${dependencies.length} external elements`
    });

    // Complexity from logical operators
    const logicalCount = this.countLogicalOperators(ast);
    const logicalScore = Math.min(logicalCount * 2, 15);
    totalScore += logicalScore;
    factors.push({
      factor: 'Logical Operators',
      impact: logicalScore,
      description: `Contains ${logicalCount} logical operators (AND/OR/NOT)`
    });

    // Complexity from function calls
    const functionCount = this.countFunctionCalls(ast);
    const functionScore = Math.min(functionCount * 4, 20);
    totalScore += functionScore;
    factors.push({
      factor: 'Function Calls',
      impact: functionScore,
      description: `Contains ${functionCount} function calls`
    });

    // Determine complexity level
    let level: PolicyComplexity['level'];
    if (totalScore <= 10) level = 'trivial';
    else if (totalScore <= 25) level = 'simple';
    else if (totalScore <= 50) level = 'moderate';
    else if (totalScore <= 75) level = 'complex';
    else if (totalScore <= 90) level = 'very_complex';
    else level = 'extreme';

    // Determine maintainability and testability
    const maintainability = totalScore <= 30 ? 'excellent' : totalScore <= 50 ? 'good' : totalScore <= 70 ? 'fair' : totalScore <= 85 ? 'poor' : 'very_poor';
    const testability = totalScore <= 20 ? 'easy' : totalScore <= 40 ? 'moderate' : totalScore <= 70 ? 'difficult' : 'very_difficult';

    return {
      score: Math.min(totalScore, 100),
      level,
      factors,
      maintainability,
      testability
    };
  }

  private calculateASTDepth(node: PolicyConditionNode): number {
    if (!node.left && !node.right && !node.arguments) {
      return 1;
    }

    let maxDepth = 0;
    
    if (node.left) {
      maxDepth = Math.max(maxDepth, this.calculateASTDepth(node.left));
    }
    
    if (node.right) {
      maxDepth = Math.max(maxDepth, this.calculateASTDepth(node.right));
    }
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        maxDepth = Math.max(maxDepth, this.calculateASTDepth(arg));
      }
    }

    return maxDepth + 1;
  }

  private countLogicalOperators(node: PolicyConditionNode): number {
    let count = 0;
    
    if (node.nodeType === 'logical') {
      count = 1;
    }
    
    if (node.left) {
      count += this.countLogicalOperators(node.left);
    }
    
    if (node.right) {
      count += this.countLogicalOperators(node.right);
    }
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        count += this.countLogicalOperators(arg);
      }
    }
    
    return count;
  }

  private countFunctionCalls(node: PolicyConditionNode): number {
    let count = 0;
    
    if (node.nodeType === 'function') {
      count = 1;
    }
    
    if (node.left) {
      count += this.countFunctionCalls(node.left);
    }
    
    if (node.right) {
      count += this.countFunctionCalls(node.right);
    }
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        count += this.countFunctionCalls(arg);
      }
    }
    
    return count;
  }

  private analyzeSecurityImplications(ast: PolicyConditionNode, expression: string): SecurityAnalysis {
    const vulnerabilities: SecurityVulnerability[] = [];
    const recommendations: SecurityRecommendation[] = [];
    const bypassRisks: BypassRisk[] = [];
    const injectionRisks: InjectionRisk[] = [];

    // Check for dangerous patterns
    for (const pattern of RLSPolicyParser.DANGEROUS_PATTERNS) {
      if (pattern.test(expression)) {
        vulnerabilities.push({
          id: `injection-risk-${vulnerabilities.length}`,
          severity: 'critical',
          type: 'injection',
          description: 'Expression contains potential SQL injection pattern',
          example: pattern.source,
          mitigation: 'Use parameterized queries and avoid dynamic SQL construction',
          cwe: 'CWE-89'
        });
      }
    }

    // Check for overly permissive conditions
    if (expression.includes('true') && !expression.includes('auth.uid()')) {
      vulnerabilities.push({
        id: `permissive-${vulnerabilities.length}`,
        severity: 'high',
        type: 'data_leak',
        description: 'Policy allows unrestricted access with "true" condition',
        mitigation: 'Replace with appropriate access control logic',
        cwe: 'CWE-285'
      });
    }

    // Analyze bypass risks
    this.analyzeBypassRisks(ast, expression, bypassRisks);

    // Determine overall security strength
    const strength = this.calculateSecurityStrength(vulnerabilities, bypassRisks, expression);

    return {
      strength,
      vulnerabilities,
      recommendations,
      bypassRisks,
      injectionRisks
    };
  }

  private analyzeBypassRisks(ast: PolicyConditionNode, expression: string, risks: BypassRisk[]): void {
    // Check for common bypass patterns
    if (!expression.includes('auth.uid()') && !expression.includes('current_user')) {
      risks.push({
        method: 'No user context required',
        likelihood: 'high',
        impact: 'high',
        description: 'Policy does not verify user identity, allowing potential unauthorized access',
        prevention: 'Add user authentication checks using auth.uid() or similar functions'
      });
    }

    if (expression.includes('OR true') || expression.includes('OR 1=1')) {
      risks.push({
        method: 'Logical bypass',
        likelihood: 'very_high',
        impact: 'severe',
        description: 'Policy contains logical conditions that always evaluate to true',
        prevention: 'Remove or fix logical conditions that bypass security checks'
      });
    }
  }

  private calculateSecurityStrength(
    vulnerabilities: SecurityVulnerability[],
    bypassRisks: BypassRisk[],
    expression: string
  ): SecurityAnalysis['strength'] {
    let score = 100;

    // Deduct points for vulnerabilities
    for (const vuln of vulnerabilities) {
      switch (vuln.severity) {
        case 'critical': score -= 40; break;
        case 'high': score -= 20; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    }

    // Deduct points for bypass risks
    for (const risk of bypassRisks) {
      if (risk.likelihood === 'very_high' && risk.impact === 'severe') {
        score -= 30;
      } else if (risk.likelihood === 'high' || risk.impact === 'high') {
        score -= 15;
      }
    }

    // Bonus points for good security practices
    if (expression.includes('auth.uid()')) score += 10;
    if (expression.includes('current_user') || expression.includes('session_user')) score += 5;

    score = Math.max(0, Math.min(100, score));

    if (score >= 90) return 'excellent';
    if (score >= 75) return 'very_strong';
    if (score >= 60) return 'strong';
    if (score >= 40) return 'moderate';
    if (score >= 20) return 'weak';
    return 'very_weak';
  }

  private analyzePerformanceImpact(ast: PolicyConditionNode, dependencies: PolicyDependency[]): PerformanceAnalysis {
    const bottlenecks: PerformanceBottleneck[] = [];
    const optimizations: OptimizationSuggestion[] = [];
    const indexRequirements: IndexRequirement[] = [];

    // Analyze function call performance
    this.analyzeFunctionPerformance(ast, bottlenecks);

    // Analyze dependency performance
    this.analyzeDependencyPerformance(dependencies, bottlenecks, indexRequirements);

    // Generate optimization suggestions
    this.generateOptimizationSuggestions(bottlenecks, optimizations);

    // Calculate overall performance impact
    const impact = this.calculatePerformanceImpact(bottlenecks, dependencies.length);
    const estimatedOverhead = this.estimatePerformanceOverhead(bottlenecks, dependencies);

    return {
      impact,
      estimatedOverhead,
      bottlenecks,
      optimizations,
      indexRequirements
    };
  }

  private analyzeFunctionPerformance(node: PolicyConditionNode, bottlenecks: PerformanceBottleneck[]): void {
    if (node.nodeType === 'function') {
      const functionName = node.functionName || '';
      
      // Some functions are known to be expensive
      if (functionName.includes('EXISTS') || functionName.includes('IN')) {
        bottlenecks.push({
          location: `Function: ${functionName}`,
          type: 'subquery',
          impact: 'high',
          description: `${functionName} may require subquery execution`
        });
      }
    }

    // Recursively analyze child nodes
    if (node.left) this.analyzeFunctionPerformance(node.left, bottlenecks);
    if (node.right) this.analyzeFunctionPerformance(node.right, bottlenecks);
    if (node.arguments) {
      node.arguments.forEach(arg => this.analyzeFunctionPerformance(arg, bottlenecks));
    }
  }

  private analyzeDependencyPerformance(
    dependencies: PolicyDependency[],
    bottlenecks: PerformanceBottleneck[],
    indexRequirements: IndexRequirement[]
  ): void {
    for (const dep of dependencies) {
      if (dep.type === 'column') {
        // Columns used in WHERE clauses should be indexed
        indexRequirements.push({
          columns: [dep.name],
          type: 'btree',
          priority: 'medium',
          rationale: `Column ${dep.name} is used in RLS policy condition`
        });
      }
    }
  }

  private generateOptimizationSuggestions(
    bottlenecks: PerformanceBottleneck[],
    optimizations: OptimizationSuggestion[]
  ): void {
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case 'subquery':
          optimizations.push({
            suggestion: 'Consider rewriting subquery as JOIN',
            potential_improvement: 'Significant performance improvement for large datasets',
            effort: 'moderate',
            risk: 'low_risk'
          });
          break;
        case 'function_call':
          optimizations.push({
            suggestion: 'Cache function results if deterministic',
            potential_improvement: 'Reduced CPU overhead per row',
            effort: 'low',
            risk: 'safe'
          });
          break;
      }
    }
  }

  private calculatePerformanceImpact(bottlenecks: PerformanceBottleneck[], dependencyCount: number): PerformanceAnalysis['impact'] {
    let score = 0;

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.impact) {
        case 'critical': score += 40; break;
        case 'high': score += 20; break;
        case 'medium': score += 10; break;
        case 'low': score += 5; break;
      }
    }

    // Add complexity penalty
    score += Math.min(dependencyCount * 2, 20);

    if (score >= 60) return 'severe';
    if (score >= 40) return 'high';
    if (score >= 20) return 'moderate';
    if (score >= 10) return 'low';
    if (score >= 5) return 'minimal';
    return 'negligible';
  }

  private estimatePerformanceOverhead(bottlenecks: PerformanceBottleneck[], dependencies: PolicyDependency[]): number {
    let overhead = 5; // Base overhead for RLS

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.impact) {
        case 'critical': overhead += 50; break;
        case 'high': overhead += 25; break;
        case 'medium': overhead += 10; break;
        case 'low': overhead += 5; break;
      }
    }

    // Additional overhead per dependency
    overhead += dependencies.length * 2;

    return Math.min(overhead, 200); // Cap at 200%
  }

  private determineExpressionType(ast: PolicyConditionNode, complexity: PolicyComplexity): ParsedPolicyCondition['type'] {
    if (complexity.level === 'trivial' || complexity.level === 'simple') {
      return 'simple';
    }

    // Check for subqueries
    if (this.hasSubqueries(ast)) {
      return 'subquery';
    }

    // Check for function calls
    if (this.hasFunctionCalls(ast)) {
      return 'function_call';
    }

    // Check for compound conditions
    if (this.hasMultipleLogicalOperators(ast)) {
      return 'compound';
    }

    return 'complex';
  }

  private hasSubqueries(node: PolicyConditionNode): boolean {
    if (node.subquery) return true;
    if (node.left && this.hasSubqueries(node.left)) return true;
    if (node.right && this.hasSubqueries(node.right)) return true;
    if (node.arguments) {
      return node.arguments.some(arg => this.hasSubqueries(arg));
    }
    return false;
  }

  private hasFunctionCalls(node: PolicyConditionNode): boolean {
    if (node.nodeType === 'function') return true;
    if (node.left && this.hasFunctionCalls(node.left)) return true;
    if (node.right && this.hasFunctionCalls(node.right)) return true;
    if (node.arguments) {
      return node.arguments.some(arg => this.hasFunctionCalls(arg));
    }
    return false;
  }

  private hasMultipleLogicalOperators(node: PolicyConditionNode): boolean {
    return this.countLogicalOperators(node) > 2;
  }

  private createFallbackAnalysis(expression: string, error: Error): ParsedPolicyCondition {
    return {
      type: 'complex',
      expression,
      conditions: [],
      dependencies: [],
      complexity: {
        score: 100,
        level: 'extreme',
        factors: [{
          factor: 'Parse Error',
          impact: 100,
          description: `Failed to parse expression: ${error.message}`
        }],
        maintainability: 'very_poor',
        testability: 'very_difficult'
      },
      security: {
        strength: 'very_weak',
        vulnerabilities: [{
          id: 'parse-error',
          severity: 'high',
          type: 'bypass',
          description: 'Expression could not be parsed, security analysis incomplete',
          mitigation: 'Fix syntax errors and re-analyze',
          cwe: 'CWE-1173'
        }],
        recommendations: [],
        bypassRisks: [],
        injectionRisks: []
      },
      performance: {
        impact: 'high',
        estimatedOverhead: 50,
        bottlenecks: [],
        optimizations: [],
        indexRequirements: []
      }
    };
  }

  private validateLogicalStructure(node: PolicyConditionNode): Array<{severity: string, message: string, suggestion: string}> {
    const issues: Array<{severity: string, message: string, suggestion: string}> = [];

    // Check for always-true conditions
    if (node.nodeType === 'literal' && node.value === true) {
      issues.push({
        severity: 'high',
        message: 'Policy contains always-true condition',
        suggestion: 'Replace with appropriate access control logic'
      });
    }

    // Check for contradictory conditions
    if (node.nodeType === 'logical' && node.operator === 'AND') {
      const contradiction = this.checkForContradictions(node.left, node.right);
      if (contradiction) {
        issues.push({
          severity: 'medium',
          message: 'Policy may contain contradictory conditions',
          suggestion: 'Review logical structure for consistency'
        });
      }
    }

    return issues;
  }

  private checkForContradictions(left?: PolicyConditionNode, right?: PolicyConditionNode): boolean {
    // Simplified contradiction check
    if (!left || !right) return false;
    
    // Check for A AND NOT A pattern
    if (left.nodeType === 'comparison' && right.nodeType === 'logical' && right.operator === 'NOT') {
      // More sophisticated logic would be needed for real contradiction detection
      return false;
    }

    return false;
  }

  private analyzeConflictBetweenPolicies(
    policy1: any,
    policy2: any
  ): PolicyConflict | null {
    // Simplified conflict detection
    if (policy1.type === 'PERMISSIVE' && policy2.type === 'RESTRICTIVE') {
      return {
        id: `conflict-${policy1.name}-${policy2.name}`,
        severity: 'medium',
        type: 'contradictory',
        policies: [policy1.name, policy2.name],
        description: 'PERMISSIVE and RESTRICTIVE policies may interact unexpectedly',
        example: 'Users might have access when it should be restricted',
        resolution: 'Review policy interaction and ensure intended behavior'
      };
    }

    return null;
  }

  private analyzeOverlapBetweenPolicies(
    policy1: any,
    policy2: any
  ): PolicyOverlap | null {
    // Simplified overlap detection
    if (policy1.expression === policy2.expression) {
      return {
        policies: [policy1.name, policy2.name],
        overlap_type: 'identical',
        redundancy_level: 'complete',
        recommendation: 'Remove one of the identical policies'
      };
    }

    return null;
  }

  private identifyPolicyGaps(policies: any[]): PolicyGap[] {
    const gaps: PolicyGap[] = [];
    
    // Check for missing DELETE policies (common gap)
    const hasDeletePolicy = policies.some(p => p.command === 'DELETE' || p.command === 'ALL');
    if (!hasDeletePolicy) {
      gaps.push({
        scenario: 'DELETE operations',
        severity: 'medium',
        description: 'No policy exists for DELETE operations',
        suggested_policy: 'CREATE POLICY delete_policy ON table_name FOR DELETE USING (user_id = auth.uid());'
      });
    }

    return gaps;
  }

  private generateConflictResolutions(
    conflicts: PolicyConflict[],
    overlaps: PolicyOverlap[],
    gaps: PolicyGap[]
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      resolutions.push({
        conflict_id: conflict.id,
        strategy: 'refactor',
        implementation: 'Review and refactor conflicting policies',
        risk_assessment: 'Medium risk - ensure functionality is preserved'
      });
    }

    return resolutions;
  }
}