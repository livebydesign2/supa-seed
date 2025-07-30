/**
 * Architecture Detection Engine for Epic 2: Smart Platform Detection Engine
 * Main engine for detecting platform architecture (individual/team/hybrid) with confidence scoring
 * Part of Task 2.1.3: Implement main architecture detection engine with confidence scoring
 */

import { Logger } from '../utils/logger';
import { PatternAnalysisOrchestrator } from './pattern-analyzers';
import type {
  PlatformArchitectureType,
  PlatformArchitectureDetectionResult,
  ArchitectureDetectionConfig,
  DetectionAnalysisContext,
  ArchitectureEvidence,
  PlatformFeature,
  ConfidenceLevel,
  DetectionStrategy,
  DetectionCacheEntry,
  OverrideValidationResult,
  DetectionStatistics
} from './detection-types';

/**
 * Main Architecture Detection Engine
 * Orchestrates the complete platform architecture detection process
 */
export class ArchitectureDetectionEngine {
  private patternOrchestrator: PatternAnalysisOrchestrator;
  private detectionCache: Map<string, DetectionCacheEntry> = new Map();
  private statistics: DetectionStatistics = {
    totalDetections: 0,
    resultsByArchitecture: { individual: 0, team: 0, hybrid: 0 },
    averageDetectionTime: 0,
    averageConfidence: 0,
    cacheHitRate: 0,
    commonEvidenceTypes: {
      table_pattern: 0,
      column_analysis: 0,
      relationship_pattern: 0,
      constraint_pattern: 0,
      function_analysis: 0,
      naming_convention: 0,
      data_pattern: 0,
      business_logic: 0
    },
    errorRates: {},
    performanceMetrics: {
      fastestDetection: Infinity,
      slowestDetection: 0,
      memoryUsage: 0
    }
  };

  constructor() {
    this.patternOrchestrator = new PatternAnalysisOrchestrator();
  }

  /**
   * Detect platform architecture from database schema
   */
  async detectArchitecture(
    context: DetectionAnalysisContext,
    config: Partial<ArchitectureDetectionConfig> = {}
  ): Promise<PlatformArchitectureDetectionResult> {
    const startTime = Date.now();
    
    // Merge config with defaults
    const detectionConfig = this.mergeWithDefaults(config);
    
    Logger.info(`Starting architecture detection with strategy: ${detectionConfig.strategy}`);

    try {
      // Check cache if enabled
      if (detectionConfig.useCaching) {
        const cached = this.getCachedResult(context, detectionConfig);
        if (cached) {
          this.statistics.totalDetections++;
          return cached;
        }
      }

      // Handle manual overrides first
      if (detectionConfig.manualOverrides?.architectureType) {
        const overrideResult = await this.handleManualOverride(context, detectionConfig);
        if (overrideResult) {
          this.updateStatistics(overrideResult, startTime);
          return overrideResult;
        }
      }

      // Execute detection based on strategy
      const result = await this.executeDetectionStrategy(context, detectionConfig, startTime);

      // Cache result if enabled
      if (detectionConfig.useCaching) {
        this.cacheResult(context, detectionConfig, result);
      }

      this.updateStatistics(result, startTime);
      Logger.info(`Architecture detection completed: ${result.architectureType} (confidence: ${result.confidence.toFixed(3)})`);

      return result;

    } catch (error: any) {
      Logger.error('Architecture detection failed:', error);
      
      // Return fallback result
      const fallbackResult = this.createFallbackResult(context, error, startTime);
      this.updateStatistics(fallbackResult, startTime);
      return fallbackResult;
    }
  }

  /**
   * Execute detection based on configured strategy
   */
  private async executeDetectionStrategy(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    startTime: number
  ): Promise<PlatformArchitectureDetectionResult> {
    switch (config.strategy) {
      case 'comprehensive':
        return await this.comprehensiveDetection(context, config, startTime);
      case 'fast':
        return await this.fastDetection(context, config, startTime);
      case 'conservative':
        return await this.conservativeDetection(context, config, startTime);
      case 'aggressive':
        return await this.aggressiveDetection(context, config, startTime);
      default:
        return await this.comprehensiveDetection(context, config, startTime);
    }
  }

  /**
   * Comprehensive detection strategy - thorough analysis with maximum accuracy  
   */
  private async comprehensiveDetection(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    startTime: number
  ): Promise<PlatformArchitectureDetectionResult> {
    Logger.debug('Executing comprehensive detection strategy');

    // Run all pattern analyses
    const patternResults = await this.patternOrchestrator.analyzeAllPatterns(context);

    // Collect evidence from all sources
    const evidence = await this.collectComprehensiveEvidence(context, patternResults);

    // Analyze platform features in depth
    const platformFeatures = await this.analyzePlatformFeatures(context, patternResults);

    // Calculate confidence with multiple factors
    const confidenceAnalysis = this.calculateComprehensiveConfidence(
      patternResults,
      evidence,
      platformFeatures
    );

    // Generate detailed reasoning
    const reasoning = this.generateDetailedReasoning(patternResults, evidence, platformFeatures);

    // Create alternative analysis
    const alternatives = this.generateAlternatives(patternResults, confidenceAnalysis);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      confidenceAnalysis.architectureType,
      confidenceAnalysis.confidence,
      evidence,
      platformFeatures
    );

    return {
      architectureType: confidenceAnalysis.architectureType,
      confidence: confidenceAnalysis.confidence,
      confidenceLevel: this.getConfidenceLevel(confidenceAnalysis.confidence),
      evidence,
      platformFeatures,
      detectedFeatures: platformFeatures.map(feature => feature.name),
      reasoning,
      alternatives,
      recommendations,
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: evidence.length,
        schemaComplexity: this.calculateSchemaComplexity(context),
        strategyUsed: 'comprehensive'
      },
      warnings: [],
      errors: []
    };
  }

  /**
   * Fast detection strategy - quick analysis with good accuracy
   */
  private async fastDetection(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    startTime: number
  ): Promise<PlatformArchitectureDetectionResult> {
    Logger.debug('Executing fast detection strategy');

    // Use simplified pattern analysis
    const patternResults = await this.patternOrchestrator.analyzeAllPatterns(context);

    // Focus on high-confidence evidence only
    const evidence = await this.collectHighConfidenceEvidence(context, patternResults);

    // Analyze key platform features only
    const platformFeatures = await this.analyzeKeyPlatformFeatures(context, patternResults);

    // Quick confidence calculation
    const architectureType = patternResults.summary.strongestArchitecture;
    const confidence = Math.min(patternResults.summary.confidence * 0.9, 0.95); // Slightly lower for fast mode

    const reasoning = [`Fast analysis identified ${architectureType} architecture based on key patterns`];
    const alternatives = this.generateSimpleAlternatives(patternResults);
    const recommendations = this.generateBasicRecommendations(architectureType, confidence);

    return {
      architectureType,
      confidence,
      confidenceLevel: this.getConfidenceLevel(confidence),
      evidence,
      platformFeatures,
      detectedFeatures: platformFeatures.map(feature => feature.name),
      reasoning,
      alternatives,
      recommendations,
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: evidence.length,
        schemaComplexity: this.calculateSchemaComplexity(context),
        strategyUsed: 'fast'
      },
      warnings: ['Fast detection mode - some patterns may not be fully analyzed'],
      errors: []
    };
  }

  /**
   * Conservative detection strategy - high precision, may classify as hybrid when uncertain
   */
  private async conservativeDetection(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    startTime: number
  ): Promise<PlatformArchitectureDetectionResult> {
    Logger.debug('Executing conservative detection strategy');

    const patternResults = await this.patternOrchestrator.analyzeAllPatterns(context);
    const evidence = await this.collectHighConfidenceEvidence(context, patternResults);
    const platformFeatures = await this.analyzePlatformFeatures(context, patternResults);

    // Conservative logic: require high confidence or default to hybrid
    let architectureType: PlatformArchitectureType;
    let confidence: number;

    const individualScore = patternResults.summary.individualScore;
    const teamScore = patternResults.summary.teamScore;
    const hybridScore = patternResults.summary.hybridScore;

    const maxScore = Math.max(individualScore, teamScore, hybridScore);
    const secondMaxScore = [individualScore, teamScore, hybridScore]
      .sort((a, b) => b - a)[1];

    // Require significant margin to avoid hybrid classification
    const margin = maxScore - secondMaxScore;

    if (maxScore > 0.8 && margin > 0.3) {
      architectureType = patternResults.summary.strongestArchitecture;
      confidence = maxScore * 0.95; // Conservative confidence reduction
    } else {
      // Default to hybrid when uncertain
      architectureType = 'hybrid';
      confidence = Math.max(hybridScore, 0.6); // Minimum reasonable confidence for hybrid
    }

    const reasoning = [
      `Conservative analysis with margin threshold (${margin.toFixed(2)})`,
      `Selected ${architectureType} with confidence adjustments for reliability`
    ];
    
    const alternatives = this.generateAlternatives(patternResults, { architectureType, confidence });
    const recommendations = this.generateRecommendations(architectureType, confidence, evidence, platformFeatures);

    return {
      architectureType,
      confidence,
      confidenceLevel: this.getConfidenceLevel(confidence),
      evidence,
      platformFeatures,
      detectedFeatures: platformFeatures.map(feature => feature.name),
      reasoning,
      alternatives,
      recommendations,
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: evidence.length,
        schemaComplexity: this.calculateSchemaComplexity(context),
        strategyUsed: 'conservative'
      },
      warnings: ['Conservative mode - may classify ambiguous cases as hybrid'],
      errors: []
    };
  }

  /**
   * Aggressive detection strategy - favor clear classifications, higher confidence
   */
  private async aggressiveDetection(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    startTime: number
  ): Promise<PlatformArchitectureDetectionResult> {
    Logger.debug('Executing aggressive detection strategy');

    const patternResults = await this.patternOrchestrator.analyzeAllPatterns(context);
    const evidence = await this.collectAllEvidence(context, patternResults);
    const platformFeatures = await this.analyzePlatformFeatures(context, patternResults);

    // Aggressive logic: boost confidence and favor definitive classifications
    const architectureType = patternResults.summary.strongestArchitecture;
    const baseConfidence = patternResults.summary.confidence;
    
    // Boost confidence for clear winners
    const confidence = Math.min(baseConfidence * 1.1, 0.99);

    const reasoning = [
      `Aggressive analysis boosted confidence for clear ${architectureType} classification`,
      `Based on ${evidence.length} evidence pieces and ${platformFeatures.length} platform features`
    ];

    const alternatives = this.generateAlternatives(patternResults, { architectureType, confidence });
    const recommendations = this.generateRecommendations(architectureType, confidence, evidence, platformFeatures);

    return {
      architectureType,
      confidence,
      confidenceLevel: this.getConfidenceLevel(confidence),
      evidence,
      platformFeatures,
      detectedFeatures: platformFeatures.map(feature => feature.name),
      reasoning,
      alternatives,
      recommendations,
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: evidence.length,
        schemaComplexity: this.calculateSchemaComplexity(context),
        strategyUsed: 'aggressive'
      },
      warnings: ['Aggressive mode - confidence may be optimistically high'],
      errors: []
    };
  }

  /**
   * Collect comprehensive evidence from all analysis sources
   */
  private async collectComprehensiveEvidence(
    context: DetectionAnalysisContext,
    patternResults: any
  ): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Evidence from pattern matching
    for (const category of ['individual', 'team', 'hybrid']) {
      const results = patternResults[category] || [];
      for (const result of results) {
        if (result.matched && result.matchConfidence > 0.3) {
          evidence.push({
            type: 'table_pattern',
            description: `${result.pattern.name}: ${result.architectureIndication.reasoning}`,
            confidence: result.matchConfidence,
            weight: result.pattern.confidenceWeight,
            supportingData: {
              tables: result.matchDetails.matchedTables,
              columns: result.matchDetails.matchedColumns,
              constraints: result.matchDetails.matchedConstraints,
              patterns: [result.pattern.id],
              samples: []
            },
            architectureIndicators: {
              individual: category === 'individual' ? result.matchConfidence : 0,
              team: category === 'team' ? result.matchConfidence : 0,
              hybrid: category === 'hybrid' ? result.matchConfidence : 0
            }
          });
        }
      }
    }

    // Evidence from schema structure
    const structuralEvidence = await this.collectStructuralEvidence(context);
    evidence.push(...structuralEvidence);

    // Evidence from relationships
    const relationshipEvidence = await this.collectRelationshipEvidence(context);
    evidence.push(...relationshipEvidence);

    // Evidence from constraints
    const constraintEvidence = await this.collectConstraintEvidence(context);
    evidence.push(...constraintEvidence);

    return evidence.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
  }

  /**
   * Collect structural evidence from schema analysis
   */
  private async collectStructuralEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Table count and complexity analysis
    const tableCount = context.schema.tableCount;
    const relationshipCount = context.schema.relationships.length;
    const constraintCount = context.schema.constraints.length;

    // Individual platforms tend to be simpler
    if (tableCount <= 10 && relationshipCount <= 15) {
      evidence.push({
        type: 'data_pattern',
        description: `Simple schema structure (${tableCount} tables, ${relationshipCount} relationships)`,
        confidence: 0.7,
        weight: 0.6,
        supportingData: {
          tables: context.schema.tableNames,
          samples: [{ tableCount, relationshipCount, constraintCount }]
        },
        architectureIndicators: {
          individual: 0.8,
          team: 0.2,
          hybrid: 0.4
        }
      });
    }

    // Team platforms tend to be more complex
    if (tableCount >= 15 && relationshipCount >= 25) {
      evidence.push({
        type: 'data_pattern',
        description: `Complex schema structure (${tableCount} tables, ${relationshipCount} relationships)`,
        confidence: 0.8,
        weight: 0.7,
        supportingData: {
          tables: context.schema.tableNames,
          samples: [{ tableCount, relationshipCount, constraintCount }]
        },
        architectureIndicators: {
          individual: 0.1,
          team: 0.9,
          hybrid: 0.6
        }
      });
    }

    return evidence;
  }

  /**
   * Collect relationship evidence
   */
  private async collectRelationshipEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Analyze relationship patterns
    const userRelationships = context.schema.relationships.filter(rel =>
      ['user_id', 'owner_id', 'created_by'].includes(rel.columnName?.toLowerCase() || '')
    );

    const organizationRelationships = context.schema.relationships.filter(rel =>
      ['organization_id', 'team_id', 'workspace_id'].includes(rel.columnName?.toLowerCase() || '')
    );

    // Strong user-centric relationships indicate individual platform
    if (userRelationships.length > organizationRelationships.length * 2) {
      evidence.push({
        type: 'relationship_pattern',
        description: `Strong user-centric relationships (${userRelationships.length} user vs ${organizationRelationships.length} org)`,
        confidence: 0.8,
        weight: 0.8,
        supportingData: {
          patterns: userRelationships.map(rel => `${rel.fromTable}->${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.9,
          team: 0.1,
          hybrid: 0.3
        }
      });
    }

    // Strong organization-centric relationships indicate team platform
    if (organizationRelationships.length > userRelationships.length) {
      evidence.push({
        type: 'relationship_pattern',
        description: `Strong organization-centric relationships (${organizationRelationships.length} org vs ${userRelationships.length} user)`,
        confidence: 0.8,
        weight: 0.8,
        supportingData: {
          patterns: organizationRelationships.map(rel => `${rel.fromTable}->${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.1,
          team: 0.9,
          hybrid: 0.4
        }
      });
    }

    // Balanced relationships indicate hybrid platform
    const ratio = userRelationships.length / Math.max(organizationRelationships.length, 1);
    if (ratio > 0.5 && ratio < 2.0 && userRelationships.length > 2 && organizationRelationships.length > 2) {
      evidence.push({
        type: 'relationship_pattern',
        description: `Balanced user/organization relationships (ratio: ${ratio.toFixed(2)})`,
        confidence: 0.7,
        weight: 0.9,
        supportingData: {
          patterns: [...userRelationships, ...organizationRelationships].map(rel => `${rel.fromTable}->${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.3,
          team: 0.3,
          hybrid: 0.8
        }
      });
    }

    return evidence;
  }

  /**
   * Collect constraint evidence
   */
  private async collectConstraintEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // MakerKit personal account constraints indicate hybrid capability
    const personalAccountConstraints = context.schema.constraints.filter(constraint =>
      constraint.constraintName?.toLowerCase().includes('personal_account') ||
      constraint.constraintName?.toLowerCase().includes('accounts_slug_null_if_personal')
    );

    if (personalAccountConstraints.length > 0) {
      evidence.push({
        type: 'constraint_pattern',
        description: `MakerKit personal account constraints detected (${personalAccountConstraints.length})`,
        confidence: 0.9,
        weight: 0.8,
        supportingData: {
          constraints: personalAccountConstraints.map(c => c.constraintName)
        },
        architectureIndicators: {
          individual: 0.4,
          team: 0.4,
          hybrid: 0.9
        }
      });
    }

    return evidence;
  }

  /**
   * Collect high-confidence evidence only (for fast/conservative modes)
   */
  private async collectHighConfidenceEvidence(
    context: DetectionAnalysisContext,
    patternResults: any
  ): Promise<ArchitectureEvidence[]> {
    const allEvidence = await this.collectComprehensiveEvidence(context, patternResults);
    return allEvidence.filter(evidence => evidence.confidence >= 0.7);
  }

  /**
   * Collect all available evidence (for aggressive mode)
   */
  private async collectAllEvidence(
    context: DetectionAnalysisContext,
    patternResults: any
  ): Promise<ArchitectureEvidence[]> {
    return await this.collectComprehensiveEvidence(context, patternResults);
  }

  /**
   * Analyze platform features in depth
   */
  private async analyzePlatformFeatures(
    context: DetectionAnalysisContext,
    patternResults: any
  ): Promise<PlatformFeature[]> {
    const features: PlatformFeature[] = [];

    // Authentication features
    if (context.schema.tableNames.some(table => 
      ['users', 'auth', 'authentication'].some(pattern => table.toLowerCase().includes(pattern))
    )) {
      features.push({
        id: 'authentication',
        name: 'User Authentication',
        category: 'authentication',
        present: true,
        confidence: 0.9,
        evidence: ['Users/auth tables detected'],
        implementingTables: context.schema.tableNames.filter(table => 
          ['users', 'auth'].some(pattern => table.toLowerCase().includes(pattern))
        ),
        typicallyIndicates: ['individual', 'team', 'hybrid'],
        commonInDomains: ['outdoor', 'saas', 'ecommerce', 'social']
      });
    }

    // Organization features
    if (context.schema.tableNames.some(table => 
      ['organizations', 'teams', 'workspaces'].some(pattern => table.toLowerCase().includes(pattern))
    )) {
      features.push({
        id: 'organizations',
        name: 'Organization Management',
        category: 'organization',
        present: true,
        confidence: 0.95,
        evidence: ['Organization/team tables detected'],
        implementingTables: context.schema.tableNames.filter(table => 
          ['organizations', 'teams', 'workspaces'].some(pattern => table.toLowerCase().includes(pattern))
        ),
        typicallyIndicates: ['team', 'hybrid'],
        commonInDomains: ['saas', 'ecommerce']
      });
    }

    // Content creation features
    const contentTables = context.schema.tableNames.filter(table =>
      ['posts', 'articles', 'content', 'media', 'projects'].some(pattern => 
        table.toLowerCase().includes(pattern)
      )
    );

    if (contentTables.length > 0) {
      features.push({
        id: 'content_creation',
        name: 'Content Creation',
        category: 'content_creation',
        present: true,
        confidence: 0.8,
        evidence: [`${contentTables.length} content-related tables`],
        implementingTables: contentTables,
        typicallyIndicates: ['individual', 'hybrid'],
        commonInDomains: ['outdoor', 'social']
      });
    }

    return features;
  }

  /**
   * Analyze key platform features only (for fast mode)
   */
  private async analyzeKeyPlatformFeatures(
    context: DetectionAnalysisContext,
    patternResults: any
  ): Promise<PlatformFeature[]> {
    const allFeatures = await this.analyzePlatformFeatures(context, patternResults);
    return allFeatures.filter(feature => 
      ['authentication', 'organizations', 'content_creation'].includes(feature.id)
    );
  }

  /**
   * Calculate comprehensive confidence score
   */
  private calculateComprehensiveConfidence(
    patternResults: any,
    evidence: ArchitectureEvidence[],
    platformFeatures: PlatformFeature[]
  ): { architectureType: PlatformArchitectureType; confidence: number } {
    const scores = {
      individual: 0,
      team: 0,
      hybrid: 0
    };

    // Weight evidence by confidence and weight
    for (const item of evidence) {
      const effectiveWeight = item.confidence * item.weight;
      scores.individual += item.architectureIndicators.individual * effectiveWeight;
      scores.team += item.architectureIndicators.team * effectiveWeight;
      scores.hybrid += item.architectureIndicators.hybrid * effectiveWeight;
    }

    // Normalize scores
    const totalWeight = evidence.reduce((sum, item) => sum + (item.confidence * item.weight), 0);
    if (totalWeight > 0) {
      scores.individual /= totalWeight;
      scores.team /= totalWeight;
      scores.hybrid /= totalWeight;
    }

    // Find highest scoring architecture
    const architectureTypes: PlatformArchitectureType[] = ['individual', 'team', 'hybrid'];
    const sortedArchitectures = architectureTypes.sort((a, b) => scores[b] - scores[a]);
    
    const architectureType = sortedArchitectures[0];
    const confidence = scores[architectureType];

    return { architectureType, confidence };
  }

  /**
   * Generate detailed reasoning for the detection
   */
  private generateDetailedReasoning(
    patternResults: any,
    evidence: ArchitectureEvidence[],
    platformFeatures: PlatformFeature[]
  ): string[] {
    const reasoning: string[] = [];

    // Pattern analysis summary
    reasoning.push(`Pattern analysis: individual=${patternResults.summary.individualScore.toFixed(2)}, team=${patternResults.summary.teamScore.toFixed(2)}, hybrid=${patternResults.summary.hybridScore.toFixed(2)}`);

    // Key evidence summary
    const topEvidence = evidence.slice(0, 3);
    if (topEvidence.length > 0) {
      reasoning.push(`Top evidence: ${topEvidence.map(e => e.description).join('; ')}`);
    }

    // Platform features summary
    const presentFeatures = platformFeatures.filter(f => f.present);
    if (presentFeatures.length > 0) {
      reasoning.push(`Platform features: ${presentFeatures.map(f => f.name).join(', ')}`);
    }

    return reasoning;
  }

  /**
   * Generate alternative architecture possibilities
   */
  private generateAlternatives(
    patternResults: any,
    confidenceAnalysis: { architectureType: PlatformArchitectureType; confidence: number }
  ): Array<{ architectureType: PlatformArchitectureType; confidence: number; reasoning: string }> {
    const alternatives: Array<{ architectureType: PlatformArchitectureType; confidence: number; reasoning: string }> = [];

    const scores = [
      { type: 'individual' as PlatformArchitectureType, score: patternResults.summary.individualScore },
      { type: 'team' as PlatformArchitectureType, score: patternResults.summary.teamScore },
      { type: 'hybrid' as PlatformArchitectureType, score: patternResults.summary.hybridScore }
    ];

    // Sort by score and exclude the primary result
    scores
      .filter(s => s.type !== confidenceAnalysis.architectureType)
      .sort((a, b) => b.score - a.score)
      .forEach(alt => {
        if (alt.score > 0.2) { // Only include reasonable alternatives
          alternatives.push({
            architectureType: alt.type,
            confidence: alt.score,
            reasoning: `Alternative based on ${alt.type} pattern analysis`
          });
        }
      });

    return alternatives;
  }

  /**
   * Generate simple alternatives (for fast mode)
   */
  private generateSimpleAlternatives(patternResults: any): Array<{ architectureType: PlatformArchitectureType; confidence: number; reasoning: string }> {
    const scores = [
      { type: 'individual' as PlatformArchitectureType, score: patternResults.summary.individualScore },
      { type: 'team' as PlatformArchitectureType, score: patternResults.summary.teamScore },
      { type: 'hybrid' as PlatformArchitectureType, score: patternResults.summary.hybridScore }
    ];

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(1, 2) // Just the second-best option
      .map(alt => ({
        architectureType: alt.type,
        confidence: alt.score,
        reasoning: `Secondary option from pattern analysis`
      }));
  }

  /**
   * Generate recommendations based on detection results
   */
  private generateRecommendations(
    architectureType: PlatformArchitectureType,
    confidence: number,
    evidence: ArchitectureEvidence[],
    platformFeatures: PlatformFeature[]
  ): string[] {
    const recommendations: string[] = [];

    // Confidence-based recommendations
    if (confidence < 0.6) {
      recommendations.push('Low confidence detection - consider manual verification');
      recommendations.push('Review schema patterns and add more distinguishing features');
    } else if (confidence > 0.9) {
      recommendations.push('High confidence detection - proceed with detected architecture');
    }

    // Architecture-specific recommendations
    switch (architectureType) {
      case 'individual':
        recommendations.push('Configure individual creator user archetypes');
        recommendations.push('Use content-focused seeding patterns');
        break;
      case 'team':
        recommendations.push('Configure team collaboration features');
        recommendations.push('Use organization-based seeding patterns');
        break;
      case 'hybrid':
        recommendations.push('Configure flexible user archetypes for both individual and team use');
        recommendations.push('Use adaptive seeding patterns based on account type');
        break;
    }

    // Feature-based recommendations
    const missingFeatures = platformFeatures.filter(f => !f.present);
    if (missingFeatures.length > 0) {
      recommendations.push(`Consider adding: ${missingFeatures.map(f => f.name).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Generate basic recommendations (for fast mode)
   */
  private generateBasicRecommendations(
    architectureType: PlatformArchitectureType,
    confidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (confidence < 0.7) {
      recommendations.push('Consider manual verification due to moderate confidence');
    }

    recommendations.push(`Proceed with ${architectureType} architecture configuration`);

    return recommendations;
  }

  /**
   * Get confidence level from numeric confidence
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * Calculate schema complexity score
   */
  private calculateSchemaComplexity(context: DetectionAnalysisContext): number {
    const tableCount = context.schema.tableCount;
    const relationshipCount = context.schema.relationships.length;
    const constraintCount = context.schema.constraints.length;

    // Normalize to 0-1 scale
    const tableComplexity = Math.min(tableCount / 50, 1);
    const relationshipComplexity = Math.min(relationshipCount / 100, 1);
    const constraintComplexity = Math.min(constraintCount / 50, 1);

    return (tableComplexity + relationshipComplexity + constraintComplexity) / 3;
  }

  /**
   * Handle manual override
   */
  private async handleManualOverride(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig
  ): Promise<PlatformArchitectureDetectionResult | null> {
    const override = config.manualOverrides;
    if (!override?.architectureType) return null;

    Logger.info(`Processing manual override: ${override.architectureType}`);

    // Validate override against detected patterns
    const validation = await this.validateOverride(context, override);

    // Create basic result for override
    const result: PlatformArchitectureDetectionResult = {
      architectureType: override.architectureType,
      confidence: 0.95, // High confidence for manual override
      confidenceLevel: 'very_high',
      evidence: override.customEvidence || [],
      platformFeatures: [],
      detectedFeatures: [],
      reasoning: ['Manual override specified', `Architecture forced to: ${override.architectureType}`],
      alternatives: [],
      recommendations: validation.recommendations,
      detectionMetrics: {
        executionTime: 0,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: override.customEvidence?.length || 0,
        schemaComplexity: this.calculateSchemaComplexity(context),
        strategyUsed: config.strategy
      },
      warnings: validation.warnings,
      errors: []
    };

    // Add conflicts as warnings
    result.warnings.push(...validation.conflicts.map(c => 
      `Override conflict (${c.severity}): ${c.description}`
    ));

    return result;
  }

  /**
   * Validate manual override against detected patterns
   */
  private async validateOverride(
    context: DetectionAnalysisContext,
    override: NonNullable<ArchitectureDetectionConfig['manualOverrides']>
  ): Promise<OverrideValidationResult> {
    // For now, simple validation - could be enhanced
    return {
      isValid: true,
      warnings: ['Manual override in effect - automatic detection bypassed'],
      conflicts: [],
      recommendations: ['Verify that the manual override matches your intended architecture']
    };
  }

  /**
   * Create fallback result for errors
   */
  private createFallbackResult(
    context: DetectionAnalysisContext,
    error: Error,
    startTime: number
  ): PlatformArchitectureDetectionResult {
    return {
      architectureType: 'hybrid', // Safe fallback
      confidence: 0.5,
      confidenceLevel: 'medium',
      evidence: [],
      platformFeatures: [],
      detectedFeatures: [],
      reasoning: ['Detection failed, using fallback hybrid classification'],
      alternatives: [],
      recommendations: ['Manual architecture verification recommended due to detection failure'],
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        tablesAnalyzed: context.schema.tableCount,
        evidenceCount: 0,
        schemaComplexity: 0,
        strategyUsed: 'comprehensive'
      },
      warnings: ['Detection process encountered errors'],
      errors: [error.message]
    };
  }

  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<ArchitectureDetectionConfig>): ArchitectureDetectionConfig {
    return {
      strategy: 'comprehensive',
      confidenceThreshold: 0.7,
      includeDetailedEvidence: true,
      analyzeBusinessLogic: true,
      analyzeRLSPolicies: true,
      deepRelationshipAnalysis: true,
      excludeTables: [],
      maxExecutionTime: 30000, // 30 seconds
      useCaching: true,
      ...config
    };
  }

  /**
   * Cache management methods
   */
  private getCachedResult(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig
  ): PlatformArchitectureDetectionResult | null {
    const schemaHash = this.generateSchemaHash(context);
    const cached = this.detectionCache.get(schemaHash);
    
    if (cached && cached.timestamp + cached.ttl > Date.now()) {
      Logger.debug('Using cached detection result');
      this.statistics.cacheHitRate = (this.statistics.cacheHitRate * this.statistics.totalDetections + 1) / (this.statistics.totalDetections + 1);
      return cached.result;
    }
    
    return null;
  }

  private cacheResult(
    context: DetectionAnalysisContext,
    config: ArchitectureDetectionConfig,
    result: PlatformArchitectureDetectionResult
  ): void {
    const schemaHash = this.generateSchemaHash(context);
    this.detectionCache.set(schemaHash, {
      schemaHash,
      result,
      timestamp: Date.now(),
      config,
      ttl: 60000 // 1 minute TTL
    });
  }

  private generateSchemaHash(context: DetectionAnalysisContext): string {
    const hashData = {
      tableNames: context.schema.tableNames.sort(),
      relationshipCount: context.schema.relationships.length,
      constraintCount: context.schema.constraints.length
    };
    return Buffer.from(JSON.stringify(hashData)).toString('base64');
  }

  /**
   * Update detection statistics
   */
  private updateStatistics(result: PlatformArchitectureDetectionResult, startTime: number): void {
    this.statistics.totalDetections++;
    this.statistics.resultsByArchitecture[result.architectureType]++;
    
    const executionTime = Date.now() - startTime;
    this.statistics.averageDetectionTime = 
      (this.statistics.averageDetectionTime * (this.statistics.totalDetections - 1) + executionTime) / 
      this.statistics.totalDetections;
    
    this.statistics.averageConfidence =
      (this.statistics.averageConfidence * (this.statistics.totalDetections - 1) + result.confidence) /
      this.statistics.totalDetections;

    // Update performance metrics
    this.statistics.performanceMetrics.fastestDetection = 
      Math.min(this.statistics.performanceMetrics.fastestDetection, executionTime);
    this.statistics.performanceMetrics.slowestDetection = 
      Math.max(this.statistics.performanceMetrics.slowestDetection, executionTime);

    // Update evidence type statistics
    for (const evidence of result.evidence) {
      this.statistics.commonEvidenceTypes[evidence.type]++;
    }
  }

  /**
   * Get detection statistics
   */
  getStatistics(): DetectionStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
    Logger.debug('Detection cache cleared');
  }
}

export default ArchitectureDetectionEngine;