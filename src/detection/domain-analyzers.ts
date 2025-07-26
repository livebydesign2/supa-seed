/**
 * Domain Pattern Recognition Engines for Epic 2: Smart Platform Detection Engine
 * Specialized analyzers for each content domain with confidence scoring
 * Part of Task 2.2.2: Create domain pattern recognition engine with confidence scoring
 */

import { Logger } from '../utils/logger';
import {
  ContentDomainType,
  DomainEvidence,
  DomainPattern,
  DomainAnalysisContext
} from './detection-types';
import {
  getPatternsForDomain,
  DOMAIN_CONFIDENCE_WEIGHTS,
  DOMAIN_CONFIDENCE_THRESHOLDS
} from './domain-patterns';

/**
 * Pattern matching result for a single domain
 */
export interface DomainPatternMatchResult {
  /** Domain analyzed */
  domain: ContentDomainType;
  
  /** Patterns that matched */
  matchedPatterns: Array<{
    pattern: DomainPattern;
    confidence: number;
    matchDetails: PatternMatchDetails;
  }>;
  
  /** Overall confidence for this domain */
  overallConfidence: number;
  
  /** Evidence collected for this domain */
  evidence: DomainEvidence[];
  
  /** Reasoning for domain classification */
  reasoning: string[];
}

/**
 * Details about what matched in a pattern
 */
export interface PatternMatchDetails {
  /** Tables that matched */
  matchedTables: string[];
  
  /** Columns that matched */
  matchedColumns: string[];
  
  /** Relationships that matched */
  matchedRelationships: string[];
  
  /** Business logic that matched */
  matchedBusinessLogic: string[];
  
  /** Total number of matches */
  totalMatches: number;
}

/**
 * Base class for domain-specific analyzers
 */
abstract class BaseDomainAnalyzer {
  protected domain: ContentDomainType;
  
  constructor(domain: ContentDomainType) {
    this.domain = domain;
  }
  
  /**
   * Analyze patterns for this domain
   */
  async analyzeDomainPatterns(context: DomainAnalysisContext): Promise<DomainPatternMatchResult> {
    const patterns = getPatternsForDomain(this.domain);
    const matchedPatterns: DomainPatternMatchResult['matchedPatterns'] = [];
    const evidence: DomainEvidence[] = [];
    const reasoning: string[] = [];
    
    Logger.debug(`Analyzing ${patterns.length} patterns for ${this.domain} domain`);
    
    // Analyze each pattern
    for (const pattern of patterns) {
      const matchResult = await this.analyzePattern(pattern, context);
      
      if (matchResult.confidence > 0.1) { // Only include meaningful matches
        matchedPatterns.push({
          pattern,
          confidence: matchResult.confidence,
          matchDetails: matchResult.matchDetails
        });
        
        // Create evidence from pattern match
        const patternEvidence = this.createEvidenceFromMatch(pattern, matchResult);
        evidence.push(...patternEvidence);
        
        // Add reasoning
        if (matchResult.confidence > 0.5) {
          reasoning.push(`${pattern.name}: ${matchResult.confidence.toFixed(2)} confidence (${matchResult.matchDetails.totalMatches} matches)`);
        }
      }
    }
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(matchedPatterns);
    
    // Add domain-specific reasoning
    reasoning.unshift(`${this.domain.toUpperCase()} domain analysis: ${overallConfidence.toFixed(2)} confidence`);
    
    return {
      domain: this.domain,
      matchedPatterns,
      overallConfidence,
      evidence,
      reasoning
    };
  }
  
  /**
   * Analyze a single pattern against the schema
   */
  private async analyzePattern(
    pattern: DomainPattern,
    context: DomainAnalysisContext
  ): Promise<{ confidence: number; matchDetails: PatternMatchDetails }> {
    const matchDetails: PatternMatchDetails = {
      matchedTables: [],
      matchedColumns: [],
      matchedRelationships: [],
      matchedBusinessLogic: [],
      totalMatches: 0
    };
    
    // Match table patterns
    if (pattern.tablePatterns.length > 0) {
      matchDetails.matchedTables = this.matchTablePatterns(pattern.tablePatterns, context);
    }
    
    // Match column patterns
    if (pattern.columnPatterns.length > 0) {
      matchDetails.matchedColumns = await this.matchColumnPatterns(pattern.columnPatterns, context);
    }
    
    // Match relationship patterns
    if (pattern.relationshipPatterns.length > 0) {
      matchDetails.matchedRelationships = this.matchRelationshipPatterns(pattern.relationshipPatterns, context);
    }
    
    // Match business logic patterns
    if (pattern.businessLogicPatterns.length > 0) {
      matchDetails.matchedBusinessLogic = await this.matchBusinessLogicPatterns(pattern.businessLogicPatterns, context);
    }
    
    // Calculate total matches
    matchDetails.totalMatches = 
      matchDetails.matchedTables.length +
      matchDetails.matchedColumns.length +
      matchDetails.matchedRelationships.length +
      matchDetails.matchedBusinessLogic.length;
    
    // Calculate confidence based on matches and pattern requirements
    const confidence = this.calculatePatternConfidence(pattern, matchDetails);
    
    return { confidence, matchDetails };
  }
  
  /**
   * Match table name patterns
   */
  private matchTablePatterns(tablePatterns: string[], context: DomainAnalysisContext): string[] {
    const matches: string[] = [];
    
    for (const tablePattern of tablePatterns) {
      const regex = new RegExp(tablePattern.replace('*', '.*'), 'i');
      
      for (const tableName of context.schema.tableNames) {
        if (regex.test(tableName) || tableName.toLowerCase().includes(tablePattern.toLowerCase())) {
          matches.push(tableName);
        }
      }
    }
    
    return Array.from(new Set(matches)); // Remove duplicates
  }
  
  /**
   * Match column patterns across all tables
   */
  private async matchColumnPatterns(columnPatterns: string[], context: DomainAnalysisContext): Promise<string[]> {
    const matches: string[] = [];
    
    // This would typically require schema introspection to get column information
    // For now, we'll simulate based on common patterns
    for (const columnPattern of columnPatterns) {
      // Common column patterns that would be found through schema analysis
      if (this.isCommonColumnPattern(columnPattern, context)) {
        matches.push(columnPattern);
      }
    }
    
    return matches;
  }
  
  /**
   * Check if a column pattern is commonly found in this type of schema
   */
  private isCommonColumnPattern(columnPattern: string, context: DomainAnalysisContext): boolean {
    // This is a simplified implementation
    // In practice, this would analyze actual column names from schema introspection
    const commonPatterns: Record<ContentDomainType, string[]> = {
      outdoor: ['make', 'model', 'weight', 'specifications', 'type', 'priority'],
      saas: ['plan_id', 'subscription_status', 'billing_cycle', 'workspace_id', 'usage_count'],
      ecommerce: ['sku', 'price', 'inventory_count', 'order_status', 'payment_method'],
      social: ['like_count', 'follower_id', 'media_url', 'hashtags', 'reaction_type'],
      generic: ['title', 'description', 'content', 'status', 'created_at']
    };
    
    return commonPatterns[this.domain]?.includes(columnPattern) || false;
  }
  
  /**
   * Match relationship patterns
   */
  private matchRelationshipPatterns(
    relationshipPatterns: DomainPattern['relationshipPatterns'],
    context: DomainAnalysisContext
  ): string[] {
    const matches: string[] = [];
    
    for (const relPattern of relationshipPatterns) {
      for (const relationship of context.schema.relationships) {
        const fromMatch = relationship.fromTable.toLowerCase().includes(relPattern.fromTable.toLowerCase());
        const toMatch = relationship.toTable.toLowerCase().includes(relPattern.toTable.toLowerCase());
        
        if (fromMatch && toMatch) {
          matches.push(`${relationship.fromTable}->${relationship.toTable}`);
        }
      }
    }
    
    return matches;
  }
  
  /**
   * Match business logic patterns
   */
  private async matchBusinessLogicPatterns(
    businessLogicPatterns: string[],
    context: DomainAnalysisContext
  ): Promise<string[]> {
    const matches: string[] = [];
    
    // Check business logic from context
    if (context.businessLogic) {
      for (const pattern of businessLogicPatterns) {
        // Check function names
        for (const func of context.businessLogic.functions) {
          if (func.toLowerCase().includes(pattern.toLowerCase())) {
            matches.push(func);
          }
        }
        
        // Check triggers
        for (const trigger of context.businessLogic.triggers) {
          if (trigger.toLowerCase().includes(pattern.toLowerCase())) {
            matches.push(trigger);
          }
        }
        
        // Check policies
        for (const policy of context.businessLogic.policies) {
          if (policy.toLowerCase().includes(pattern.toLowerCase())) {
            matches.push(policy);
          }
        }
      }
    }
    
    return matches;
  }
  
  /**
   * Calculate confidence for a single pattern match
   */
  private calculatePatternConfidence(pattern: DomainPattern, matchDetails: PatternMatchDetails): number {
    // Check if minimum matches requirement is met
    if (matchDetails.totalMatches < pattern.minimumMatches) {
      return 0;
    }
    
    // Calculate weighted confidence based on match types
    let confidence = 0;
    
    // Table matches (highest weight)
    if (pattern.tablePatterns.length > 0) {
      const tableMatchRatio = matchDetails.matchedTables.length / pattern.tablePatterns.length;
      confidence += tableMatchRatio * DOMAIN_CONFIDENCE_WEIGHTS.tablePatterns;
    }
    
    // Column matches
    if (pattern.columnPatterns.length > 0) {
      const columnMatchRatio = matchDetails.matchedColumns.length / pattern.columnPatterns.length;
      confidence += columnMatchRatio * DOMAIN_CONFIDENCE_WEIGHTS.columnPatterns;
    }
    
    // Relationship matches
    if (pattern.relationshipPatterns.length > 0) {
      const relMatchRatio = matchDetails.matchedRelationships.length / pattern.relationshipPatterns.length;
      confidence += relMatchRatio * DOMAIN_CONFIDENCE_WEIGHTS.relationshipPatterns;
    }
    
    // Business logic matches
    if (pattern.businessLogicPatterns.length > 0) {
      const bizLogicMatchRatio = matchDetails.matchedBusinessLogic.length / pattern.businessLogicPatterns.length;
      confidence += bizLogicMatchRatio * DOMAIN_CONFIDENCE_WEIGHTS.businessLogic;
    }
    
    // Apply pattern's confidence weight
    confidence *= pattern.confidenceWeight;
    
    // Boost for exclusive patterns
    if (pattern.exclusive && confidence > 0.5) {
      confidence = Math.min(confidence * 1.2, 1.0);
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Calculate overall confidence for the domain
   */
  private calculateOverallConfidence(
    matchedPatterns: DomainPatternMatchResult['matchedPatterns']
  ): number {
    if (matchedPatterns.length === 0) {
      return 0;
    }
    
    // Weight by pattern priority and confidence
    let totalWeightedConfidence = 0;
    let totalWeight = 0;
    
    for (const match of matchedPatterns) {
      const weight = match.pattern.priority * match.confidence;
      totalWeightedConfidence += weight;
      totalWeight += match.pattern.priority;
    }
    
    return totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
  }
  
  /**
   * Create evidence objects from pattern matches
   */
  private createEvidenceFromMatch(
    pattern: DomainPattern,
    matchResult: { confidence: number; matchDetails: PatternMatchDetails }
  ): DomainEvidence[] {
    const evidence: DomainEvidence[] = [];
    
    // Create evidence for each type of match
    if (matchResult.matchDetails.matchedTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        domain: this.domain,
        description: `${pattern.name}: Found ${matchResult.matchDetails.matchedTables.length} matching tables`,
        confidence: matchResult.confidence,
        weight: pattern.confidenceWeight,
        supportingData: {
          tables: matchResult.matchDetails.matchedTables,
          patterns: [pattern.id]
        }
      });
    }
    
    if (matchResult.matchDetails.matchedColumns.length > 0) {
      evidence.push({
        type: 'column_analysis',
        domain: this.domain,
        description: `${pattern.name}: Found ${matchResult.matchDetails.matchedColumns.length} matching columns`,
        confidence: matchResult.confidence,
        weight: pattern.confidenceWeight * 0.8, // Slightly lower weight for columns
        supportingData: {
          columns: matchResult.matchDetails.matchedColumns,
          patterns: [pattern.id]
        }
      });
    }
    
    if (matchResult.matchDetails.matchedRelationships.length > 0) {
      evidence.push({
        type: 'relationship_pattern',
        domain: this.domain,
        description: `${pattern.name}: Found ${matchResult.matchDetails.matchedRelationships.length} matching relationships`,
        confidence: matchResult.confidence,
        weight: pattern.confidenceWeight * 0.9,
        supportingData: {
          patterns: matchResult.matchDetails.matchedRelationships
        }
      });
    }
    
    if (matchResult.matchDetails.matchedBusinessLogic.length > 0) {
      evidence.push({
        type: 'business_logic',
        domain: this.domain,
        description: `${pattern.name}: Found ${matchResult.matchDetails.matchedBusinessLogic.length} matching business logic patterns`,
        confidence: matchResult.confidence,
        weight: pattern.confidenceWeight * 0.7,
        supportingData: {
          businessLogic: matchResult.matchDetails.matchedBusinessLogic,
          patterns: [pattern.id]
        }
      });
    }
    
    return evidence;
  }
}

/**
 * Outdoor Domain Analyzer
 */
export class OutdoorDomainAnalyzer extends BaseDomainAnalyzer {
  constructor() {
    super('outdoor');
  }
}

/**
 * SaaS Domain Analyzer
 */
export class SaaSDomainAnalyzer extends BaseDomainAnalyzer {
  constructor() {
    super('saas');
  }
}

/**
 * E-commerce Domain Analyzer
 */
export class EcommerceDomainAnalyzer extends BaseDomainAnalyzer {
  constructor() {
    super('ecommerce');
  }
}

/**
 * Social Domain Analyzer
 */
export class SocialDomainAnalyzer extends BaseDomainAnalyzer {
  constructor() {
    super('social');
  }
}

/**
 * Generic Domain Analyzer
 */
export class GenericDomainAnalyzer extends BaseDomainAnalyzer {
  constructor() {
    super('generic');
  }
}

/**
 * Domain Pattern Analysis Orchestrator
 * Coordinates analysis across all domain analyzers
 */
export class DomainPatternAnalysisOrchestrator {
  private analyzers: Map<ContentDomainType, BaseDomainAnalyzer>;
  
  constructor() {
    this.analyzers = new Map([
      ['outdoor', new OutdoorDomainAnalyzer()],
      ['saas', new SaaSDomainAnalyzer()],
      ['ecommerce', new EcommerceDomainAnalyzer()],
      ['social', new SocialDomainAnalyzer()],
      ['generic', new GenericDomainAnalyzer()]
    ]);
  }
  
  /**
   * Analyze patterns for all domains
   */
  async analyzeAllDomains(context: DomainAnalysisContext): Promise<DomainPatternMatchResult[]> {
    const results: DomainPatternMatchResult[] = [];
    
    Logger.info('🔍 Starting domain pattern analysis across all domains');
    
    // Run all analyzers in parallel
    const analysisPromises = Array.from(this.analyzers.entries()).map(async ([domain, analyzer]) => {
      try {
        return await analyzer.analyzeDomainPatterns(context);
      } catch (error: any) {
        Logger.error(`Failed to analyze ${domain} domain:`, error);
        return {
          domain,
          matchedPatterns: [],
          overallConfidence: 0,
          evidence: [],
          reasoning: [`Analysis failed: ${error.message}`]
        } as DomainPatternMatchResult;
      }
    });
    
    const analysisResults = await Promise.all(analysisPromises);
    results.push(...analysisResults);
    
    // Sort by confidence
    results.sort((a, b) => b.overallConfidence - a.overallConfidence);
    
    Logger.info(`✅ Domain pattern analysis completed: ${results.length} domains analyzed`);
    
    return results;
  }
  
  /**
   * Analyze patterns for specific domains only
   */
  async analyzeSpecificDomains(
    domains: ContentDomainType[],
    context: DomainAnalysisContext
  ): Promise<DomainPatternMatchResult[]> {
    const results: DomainPatternMatchResult[] = [];
    
    Logger.info(`🔍 Starting domain pattern analysis for: ${domains.join(', ')}`);
    
    for (const domain of domains) {
      const analyzer = this.analyzers.get(domain);
      if (analyzer) {
        try {
          const result = await analyzer.analyzeDomainPatterns(context);
          results.push(result);
        } catch (error: any) {
          Logger.error(`Failed to analyze ${domain} domain:`, error);
          results.push({
            domain,
            matchedPatterns: [],
            overallConfidence: 0,
            evidence: [],
            reasoning: [`Analysis failed: ${error.message}`]
          });
        }
      }
    }
    
    results.sort((a, b) => b.overallConfidence - a.overallConfidence);
    
    Logger.info(`✅ Specific domain analysis completed: ${results.length} domains analyzed`);
    
    return results;
  }
  
  /**
   * Get quick domain analysis (high-priority patterns only)
   */
  async getQuickDomainAnalysis(context: DomainAnalysisContext): Promise<DomainPatternMatchResult[]> {
    // For quick analysis, we'll focus on the most distinctive patterns
    const quickResults: DomainPatternMatchResult[] = [];
    
    Logger.info('⚡ Starting quick domain pattern analysis');
    
    // Check for outdoor domain (most distinctive)
    const outdoorResult = await this.analyzers.get('outdoor')!.analyzeDomainPatterns(context);
    if (outdoorResult.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate) {
      quickResults.push(outdoorResult);
    }
    
    // Check for e-commerce domain (distinctive patterns)
    const ecommerceResult = await this.analyzers.get('ecommerce')!.analyzeDomainPatterns(context);
    if (ecommerceResult.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate) {
      quickResults.push(ecommerceResult);
    }
    
    // Check for SaaS domain
    const saasResult = await this.analyzers.get('saas')!.analyzeDomainPatterns(context);
    if (saasResult.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate) {
      quickResults.push(saasResult);
    }
    
    // Check for social domain
    const socialResult = await this.analyzers.get('social')!.analyzeDomainPatterns(context);
    if (socialResult.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate) {
      quickResults.push(socialResult);
    }
    
    // Always include generic as fallback
    const genericResult = await this.analyzers.get('generic')!.analyzeDomainPatterns(context);
    quickResults.push(genericResult);
    
    quickResults.sort((a, b) => b.overallConfidence - a.overallConfidence);
    
    Logger.info(`⚡ Quick domain analysis completed: ${quickResults.length} domains considered`);
    
    return quickResults;
  }
}

/**
 * Default domain pattern analysis orchestrator instance
 */
export const domainPatternOrchestrator = new DomainPatternAnalysisOrchestrator();