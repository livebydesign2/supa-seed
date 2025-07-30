/**
 * Main Domain Detection Engine for Epic 2: Smart Platform Detection Engine
 * Multi-domain detection with confidence scoring and evidence collection
 * Part of Task 2.2.3: Implement main domain detector with multi-domain support
 */

import { Logger } from '../utils/logger';
import {
  ContentDomainType,
  DomainDetectionResult,
  DomainDetectionConfig,
  DomainAnalysisContext,
  DomainEvidence
} from './detection-types';
import {
  DomainPatternAnalysisOrchestrator,
  DomainPatternMatchResult
} from './domain-analyzers';
import { DOMAIN_CONFIDENCE_THRESHOLDS } from './domain-patterns';

/**
 * Domain detection cache entry
 */
interface DomainDetectionCacheEntry {
  schemaHash: string;
  result: DomainDetectionResult;
  timestamp: number;
  config: DomainDetectionConfig;
  ttl: number;
}

/**
 * Main Domain Detection Engine
 * Orchestrates comprehensive domain detection with multi-domain support
 */
export class DomainDetectionEngine {
  private patternOrchestrator: DomainPatternAnalysisOrchestrator;
  private detectionCache: Map<string, DomainDetectionCacheEntry> = new Map();
  
  constructor() {
    this.patternOrchestrator = new DomainPatternAnalysisOrchestrator();
  }
  
  /**
   * Detect content domain from database schema analysis
   */
  async detectDomain(
    context: DomainAnalysisContext,
    config: Partial<DomainDetectionConfig> = {}
  ): Promise<DomainDetectionResult> {
    const startTime = Date.now();
    
    // Merge config with defaults
    const detectionConfig = this.mergeWithDefaults(config);
    
    Logger.info(`🎯 Starting domain detection with strategy: ${detectionConfig.strategy}`);
    
    try {
      // Check cache if enabled
      if (detectionConfig.useCaching) {
        const cached = this.getCachedResult(context, detectionConfig);
        if (cached) {
          Logger.info('📦 Using cached domain detection result');
          return cached;
        }
      }
      
      // Handle manual override first
      if (detectionConfig.manualOverride?.primaryDomain) {
        const overrideResult = await this.handleManualOverride(context, detectionConfig, startTime);
        if (overrideResult) {
          Logger.info(`🎯 Manual override applied: ${overrideResult.primaryDomain}`);
          return overrideResult;
        }
      }
      
      // Execute detection based on strategy
      const result = await this.executeDetectionStrategy(context, detectionConfig, startTime);
      
      // Cache result if enabled
      if (detectionConfig.useCaching) {
        this.cacheResult(context, detectionConfig, result);
      }
      
      Logger.info(`🎯 Domain detection completed: ${result.primaryDomain} (confidence: ${result.confidence.toFixed(3)})`);
      
      return result;
      
    } catch (error: any) {
      Logger.error('Domain detection failed:', error);
      
      // Return fallback result
      const fallbackResult = this.createFallbackResult(context, error, startTime);
      return fallbackResult;
    }
  }
  
  /**
   * Execute detection based on configured strategy
   */
  private async executeDetectionStrategy(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult> {
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
   * Comprehensive detection strategy - thorough analysis of all domains
   */
  private async comprehensiveDetection(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult> {
    Logger.debug('🔍 Executing comprehensive domain detection strategy');
    
    // Analyze all domains
    const domainAnalysisResults = await this.patternOrchestrator.analyzeAllDomains(context);
    
    // Filter excluded domains
    const filteredResults = domainAnalysisResults.filter(result => 
      !config.excludeDomains.includes(result.domain)
    );
    
    // Determine primary domain
    const primaryDomainResult = filteredResults[0]; // Already sorted by confidence
    
    // Determine secondary domains
    const secondaryDomains = this.determineSecondaryDomains(
      filteredResults.slice(1),
      config.detectSecondaryDomains
    );
    
    // Collect all evidence
    const allEvidence = this.collectAllEvidence(filteredResults);
    
    // Check for hybrid capabilities
    const hybridCapabilities = this.detectHybridCapabilities(filteredResults);
    
    // Generate comprehensive reasoning
    const reasoning = this.generateComprehensiveReasoning(filteredResults, hybridCapabilities);
    
    // Calculate detection metrics
    const detectionMetrics = {
      executionTime: Date.now() - startTime,
      patternsAnalyzed: filteredResults.reduce((sum, result) => sum + result.matchedPatterns.length, 0),
      evidenceCount: allEvidence.length,
      strategyUsed: 'comprehensive'
    };
    
    return {
      primaryDomain: primaryDomainResult.domain,
      confidence: primaryDomainResult.overallConfidence,
      confidenceLevel: this.getConfidenceLevel(primaryDomainResult.overallConfidence),
      secondaryDomains,
      domainEvidence: allEvidence,
      hybridCapabilities,
      detectedFeatures: this.extractDomainFeatures(allEvidence),
      reasoning,
      recommendations: this.generateDomainRecommendations(primaryDomainResult.domain, primaryDomainResult.overallConfidence),
      detectionMetrics,
      warnings: this.generateWarnings(filteredResults),
      errors: []
    };
  }
  
  /**
   * Fast detection strategy - quick analysis focusing on distinctive patterns
   */
  private async fastDetection(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult> {
    Logger.debug('⚡ Executing fast domain detection strategy');
    
    // Use quick analysis method
    const domainAnalysisResults = await this.patternOrchestrator.getQuickDomainAnalysis(context);
    
    // Filter excluded domains
    const filteredResults = domainAnalysisResults.filter(result => 
      !config.excludeDomains.includes(result.domain)
    );
    
    const primaryDomainResult = filteredResults[0];
    
    // Limited secondary domain detection in fast mode
    const secondaryDomains = config.detectSecondaryDomains 
      ? this.determineSecondaryDomains(filteredResults.slice(1), true).slice(0, 2) // Max 2 secondary
      : [];
    
    const allEvidence = this.collectHighConfidenceEvidence(filteredResults);
    const hybridCapabilities = false; // Skip hybrid detection in fast mode
    
    const reasoning = [
      `Fast analysis identified ${primaryDomainResult.domain} domain`,
      `Based on ${primaryDomainResult.matchedPatterns.length} distinctive patterns`
    ];
    
    const detectionMetrics = {
      executionTime: Date.now() - startTime,
      patternsAnalyzed: filteredResults.reduce((sum, result) => sum + result.matchedPatterns.length, 0),
      evidenceCount: allEvidence.length,
      strategyUsed: 'fast'
    };
    
    return {
      primaryDomain: primaryDomainResult.domain,
      confidence: primaryDomainResult.overallConfidence * 0.95, // Slightly reduce confidence for fast mode
      confidenceLevel: this.getConfidenceLevel(primaryDomainResult.overallConfidence * 0.95),
      secondaryDomains,
      domainEvidence: allEvidence,
      hybridCapabilities,
      detectedFeatures: this.extractDomainFeatures(allEvidence),
      reasoning,
      recommendations: this.generateDomainRecommendations(primaryDomainResult.domain, primaryDomainResult.overallConfidence * 0.95),
      detectionMetrics,
      warnings: ['Fast detection mode - some patterns may not be fully analyzed'],
      errors: []
    };
  }
  
  /**
   * Conservative detection strategy - high precision, may default to generic
   */
  private async conservativeDetection(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult> {
    Logger.debug('🔒 Executing conservative domain detection strategy');
    
    const domainAnalysisResults = await this.patternOrchestrator.analyzeAllDomains(context);
    const filteredResults = domainAnalysisResults.filter(result => 
      !config.excludeDomains.includes(result.domain)
    );
    
    // Conservative logic: require high confidence or default to generic
    let primaryDomainResult = filteredResults[0];
    
    // If confidence is not high enough, check if we should default to generic
    if (primaryDomainResult.overallConfidence < DOMAIN_CONFIDENCE_THRESHOLDS.strong) {
      const genericResult = filteredResults.find(result => result.domain === 'generic');
      if (genericResult) {
        primaryDomainResult = genericResult;
        primaryDomainResult.overallConfidence = Math.max(primaryDomainResult.overallConfidence, 0.6);
      }
    }
    
    // Reduce confidence for conservative approach
    const adjustedConfidence = primaryDomainResult.overallConfidence * 0.9;
    
    const secondaryDomains = config.detectSecondaryDomains
      ? this.determineSecondaryDomains(
          filteredResults.filter(r => r !== primaryDomainResult && r.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.strong),
          true
        )
      : [];
    
    const allEvidence = this.collectHighConfidenceEvidence(filteredResults);
    const hybridCapabilities = this.detectHybridCapabilities(filteredResults);
    
    const reasoning = [
      `Conservative analysis with high-confidence requirement`,
      `Selected ${primaryDomainResult.domain} with confidence adjustments for reliability`,
      `Required threshold: ${DOMAIN_CONFIDENCE_THRESHOLDS.strong}, achieved: ${primaryDomainResult.overallConfidence.toFixed(2)}`
    ];
    
    const detectionMetrics = {
      executionTime: Date.now() - startTime,
      patternsAnalyzed: filteredResults.reduce((sum, result) => sum + result.matchedPatterns.length, 0),
      evidenceCount: allEvidence.length,
      strategyUsed: 'conservative'
    };
    
    return {
      primaryDomain: primaryDomainResult.domain,
      confidence: adjustedConfidence,
      confidenceLevel: this.getConfidenceLevel(adjustedConfidence),
      secondaryDomains,
      domainEvidence: allEvidence,
      hybridCapabilities,
      detectedFeatures: this.extractDomainFeatures(allEvidence),
      reasoning,
      recommendations: this.generateDomainRecommendations(primaryDomainResult.domain, adjustedConfidence),
      detectionMetrics,
      warnings: ['Conservative mode - may default to generic for ambiguous cases'],
      errors: []
    };
  }
  
  /**
   * Aggressive detection strategy - favor definitive classifications with boosted confidence
   */
  private async aggressiveDetection(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult> {
    Logger.debug('🚀 Executing aggressive domain detection strategy');
    
    const domainAnalysisResults = await this.patternOrchestrator.analyzeAllDomains(context);
    const filteredResults = domainAnalysisResults.filter(result => 
      !config.excludeDomains.includes(result.domain)
    );
    
    const primaryDomainResult = filteredResults[0];
    
    // Boost confidence for clear winners in aggressive mode
    const boostedConfidence = Math.min(primaryDomainResult.overallConfidence * 1.1, 0.99);
    
    // More liberal secondary domain detection
    const secondaryDomains = config.detectSecondaryDomains
      ? this.determineSecondaryDomains(
          filteredResults.slice(1).filter(r => r.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate),
          true
        )
      : [];
    
    const allEvidence = this.collectAllEvidence(filteredResults);
    const hybridCapabilities = this.detectHybridCapabilities(filteredResults);
    
    const reasoning = [
      `Aggressive analysis boosted confidence for clear ${primaryDomainResult.domain} classification`,
      `Based on ${allEvidence.length} evidence pieces across ${filteredResults.length} domains`,
      `Confidence boost applied: ${primaryDomainResult.overallConfidence.toFixed(2)} → ${boostedConfidence.toFixed(2)}`
    ];
    
    const detectionMetrics = {
      executionTime: Date.now() - startTime,
      patternsAnalyzed: filteredResults.reduce((sum, result) => sum + result.matchedPatterns.length, 0),
      evidenceCount: allEvidence.length,
      strategyUsed: 'aggressive'
    };
    
    return {
      primaryDomain: primaryDomainResult.domain,
      confidence: boostedConfidence,
      confidenceLevel: this.getConfidenceLevel(boostedConfidence),
      secondaryDomains,
      domainEvidence: allEvidence,
      hybridCapabilities,
      detectedFeatures: this.extractDomainFeatures(allEvidence),
      reasoning,
      recommendations: this.generateDomainRecommendations(primaryDomainResult.domain, boostedConfidence),
      detectionMetrics,
      warnings: ['Aggressive mode - confidence may be optimistically high'],
      errors: []
    };
  }
  
  /**
   * Determine secondary domains with confidence thresholds
   */
  private determineSecondaryDomains(
    analysisResults: DomainPatternMatchResult[],
    detectSecondary: boolean
  ): DomainDetectionResult['secondaryDomains'] {
    if (!detectSecondary || analysisResults.length === 0) {
      return [];
    }
    
    return analysisResults
      .filter(result => result.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate)
      .slice(0, 3) // Max 3 secondary domains
      .map(result => ({
        domain: result.domain,
        confidence: result.overallConfidence,
        reasoning: `Secondary domain based on ${result.matchedPatterns.length} pattern matches`
      }));
  }
  
  /**
   * Collect all evidence from analysis results
   */
  private collectAllEvidence(analysisResults: DomainPatternMatchResult[]): DomainEvidence[] {
    const allEvidence: DomainEvidence[] = [];
    
    for (const result of analysisResults) {
      allEvidence.push(...result.evidence);
    }
    
    // Sort by confidence and weight
    return allEvidence.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
  }
  
  /**
   * Collect only high-confidence evidence
   */
  private collectHighConfidenceEvidence(analysisResults: DomainPatternMatchResult[]): DomainEvidence[] {
    const allEvidence = this.collectAllEvidence(analysisResults);
    return allEvidence.filter(evidence => evidence.confidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate);
  }
  
  /**
   * Detect hybrid domain capabilities
   */
  private detectHybridCapabilities(analysisResults: DomainPatternMatchResult[]): boolean {
    // Consider hybrid if multiple domains have reasonable confidence
    const moderateConfidenceDomains = analysisResults.filter(result => 
      result.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.moderate
    );
    
    return moderateConfidenceDomains.length >= 2;
  }
  
  /**
   * Generate comprehensive reasoning
   */
  private generateComprehensiveReasoning(
    analysisResults: DomainPatternMatchResult[],
    hybridCapabilities: boolean
  ): string[] {
    const reasoning: string[] = [];
    
    // Overall analysis summary
    const nonZeroResults = analysisResults.filter(r => r.overallConfidence > 0);
    reasoning.push(`Domain analysis across ${nonZeroResults.length} domains with pattern matches`);
    
    // Top domain reasoning
    if (nonZeroResults.length > 0) {
      const topResult = nonZeroResults[0];
      reasoning.push(`Primary domain ${topResult.domain}: ${topResult.overallConfidence.toFixed(2)} confidence (${topResult.matchedPatterns.length} patterns)`);
      
      // Add specific pattern insights
      const topPatterns = topResult.matchedPatterns
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      
      for (const pattern of topPatterns) {
        reasoning.push(`  • ${pattern.pattern.name}: ${pattern.confidence.toFixed(2)} confidence`);
      }
    }
    
    // Hybrid capabilities
    if (hybridCapabilities) {
      reasoning.push('Platform shows hybrid domain capabilities with multiple domain patterns');
    }
    
    // Secondary domains
    const secondaryDomains = nonZeroResults.slice(1, 3);
    if (secondaryDomains.length > 0) {
      reasoning.push(`Secondary domains: ${secondaryDomains.map(r => `${r.domain}(${r.overallConfidence.toFixed(2)})`).join(', ')}`);
    }
    
    return reasoning;
  }
  
  /**
   * Generate warnings based on analysis
   */
  private generateWarnings(analysisResults: DomainPatternMatchResult[]): string[] {
    const warnings: string[] = [];
    
    // Check for low confidence
    const topResult = analysisResults[0];
    if (topResult && topResult.overallConfidence < DOMAIN_CONFIDENCE_THRESHOLDS.moderate) {
      warnings.push(`Low confidence in domain detection (${topResult.overallConfidence.toFixed(2)}) - consider manual verification`);
    }
    
    // Check for close competitions
    if (analysisResults.length >= 2) {
      const confidenceDiff = analysisResults[0].overallConfidence - analysisResults[1].overallConfidence;
      if (confidenceDiff < 0.2) {
        warnings.push(`Close competition between ${analysisResults[0].domain} and ${analysisResults[1].domain} domains`);
      }
    }
    
    // Check for no clear winner
    const highConfidenceResults = analysisResults.filter(r => r.overallConfidence > DOMAIN_CONFIDENCE_THRESHOLDS.strong);
    if (highConfidenceResults.length === 0) {
      warnings.push('No domain reached high confidence threshold - platform may be generic or mixed-domain');
    }
    
    return warnings;
  }
  
  /**
   * Handle manual domain override
   */
  private async handleManualOverride(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    startTime: number
  ): Promise<DomainDetectionResult | null> {
    const override = config.manualOverride!;
    
    if (!override.primaryDomain) {
      return null;
    }
    
    // Create basic analysis for the overridden domain
    const specificResults = await this.patternOrchestrator.analyzeSpecificDomains([override.primaryDomain], context);
    const overriddenResult = specificResults[0];
    
    // Create evidence from override
    const overrideEvidence: DomainEvidence[] = override.customEvidence || [];
    const analysisEvidence = overriddenResult ? overriddenResult.evidence : [];
    
    return {
      primaryDomain: override.primaryDomain,
      confidence: 0.95, // High confidence for manual override
      confidenceLevel: 'very_high',
      secondaryDomains: [],
      domainEvidence: [...overrideEvidence, ...analysisEvidence],
      hybridCapabilities: false,
      detectedFeatures: [],
      reasoning: [
        `Manual override applied: ${override.primaryDomain}`,
        `Override confidence: 0.95`,
        overriddenResult ? `Supporting analysis: ${overriddenResult.overallConfidence.toFixed(2)} confidence` : 'No supporting analysis available'
      ],
      recommendations: [`Manual override for ${override.primaryDomain} domain applied`, 'Verify seeding configuration matches overridden domain'],
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        patternsAnalyzed: overriddenResult ? overriddenResult.matchedPatterns.length : 0,
        evidenceCount: overrideEvidence.length + analysisEvidence.length,
        strategyUsed: `${config.strategy}_with_override`
      },
      warnings: ['Manual domain override applied - automatic detection bypassed'],
      errors: []
    };
  }
  
  /**
   * Create fallback result when detection fails
   */
  private createFallbackResult(
    context: DomainAnalysisContext,
    error: Error,
    startTime: number
  ): DomainDetectionResult {
    return {
      primaryDomain: 'generic',
      confidence: 0.3,
      confidenceLevel: 'low',
      secondaryDomains: [],
      domainEvidence: [],
      hybridCapabilities: false,
      detectedFeatures: [],
      reasoning: ['Detection failed - defaulting to generic domain'],
      recommendations: ['Manual domain verification recommended due to detection failure'],
      detectionMetrics: {
        executionTime: Date.now() - startTime,
        patternsAnalyzed: 0,
        evidenceCount: 0,
        strategyUsed: 'fallback'
      },
      warnings: ['Domain detection failed - using fallback result'],
      errors: [error.message]
    };
  }
  
  /**
   * Get confidence level from confidence score
   */
  private getConfidenceLevel(confidence: number): DomainDetectionResult['confidenceLevel'] {
    if (confidence >= DOMAIN_CONFIDENCE_THRESHOLDS.definitive) return 'very_high';
    if (confidence >= DOMAIN_CONFIDENCE_THRESHOLDS.strong) return 'high';
    if (confidence >= DOMAIN_CONFIDENCE_THRESHOLDS.moderate) return 'medium';
    if (confidence >= DOMAIN_CONFIDENCE_THRESHOLDS.weak) return 'low';
    return 'very_low';
  }
  
  /**
   * Merge config with defaults
   */
  private mergeWithDefaults(config: Partial<DomainDetectionConfig>): DomainDetectionConfig {
    return {
      strategy: 'comprehensive',
      confidenceThreshold: DOMAIN_CONFIDENCE_THRESHOLDS.moderate,
      detectSecondaryDomains: true,
      analyzeBusinessLogic: false,
      deepRelationshipAnalysis: true,
      excludeDomains: [],
      maxExecutionTime: 15000, // 15 seconds
      useCaching: true,
      ...config
    };
  }
  
  /**
   * Cache management methods
   */
  private getCachedResult(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig
  ): DomainDetectionResult | null {
    const cacheKey = this.generateCacheKey(context, config);
    const cached = this.detectionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.result;
    }
    
    return null;
  }
  
  private cacheResult(
    context: DomainAnalysisContext,
    config: DomainDetectionConfig,
    result: DomainDetectionResult
  ): void {
    const cacheKey = this.generateCacheKey(context, config);
    const schemaHash = this.generateSchemaHash(context);
    
    this.detectionCache.set(cacheKey, {
      schemaHash,
      result,
      timestamp: Date.now(),
      config,
      ttl: 300000 // 5 minutes
    });
  }
  
  private generateCacheKey(context: DomainAnalysisContext, config: DomainDetectionConfig): string {
    const schemaHash = this.generateSchemaHash(context);
    const configHash = JSON.stringify({
      strategy: config.strategy,
      excludeDomains: config.excludeDomains,
      detectSecondaryDomains: config.detectSecondaryDomains
    });
    
    return `domain_${schemaHash}_${btoa(configHash)}`;
  }
  
  private generateSchemaHash(context: DomainAnalysisContext): string {
    const schemaString = JSON.stringify({
      tables: context.schema.tableNames.sort(),
      relationships: context.schema.relationships.length,
      constraints: context.schema.constraints.length
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < schemaString.length; i++) {
      const char = schemaString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }
  
  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
    Logger.info('🧹 Domain detection cache cleared');
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.detectionCache.size,
      entries: Array.from(this.detectionCache.keys())
    };
  }

  /**
   * Extract detected features from domain evidence
   */
  private extractDomainFeatures(evidence: DomainEvidence[]): string[] {
    const features = new Set<string>();
    
    evidence.forEach(ev => {
      // Extract feature names from evidence types and descriptions
      if (ev.type === 'table_pattern') {
        features.add(`table_pattern_${ev.description.toLowerCase().replace(/\s+/g, '_')}`);
      } else if (ev.type === 'column_analysis') {
        features.add(`column_pattern_${ev.description.toLowerCase().replace(/\s+/g, '_')}`);
      } else if (ev.type === 'relationship_pattern') {
        features.add(`relationship_${ev.description.toLowerCase().replace(/\s+/g, '_')}`);
      } else {
        features.add(ev.type);
      }
    });
    
    return Array.from(features);
  }

  /**
   * Generate domain-specific recommendations
   */
  private generateDomainRecommendations(domain: ContentDomainType, confidence: number): string[] {
    const recommendations: string[] = [];
    
    // Base recommendations based on confidence
    if (confidence < 0.5) {
      recommendations.push('Consider manual domain verification due to low confidence');
    } else if (confidence < 0.7) {
      recommendations.push('Review domain detection results and verify against expected schema patterns');
    }
    
    // Domain-specific recommendations
    switch (domain) {
      case 'outdoor':
        recommendations.push('Consider enabling outdoor-specific data generation patterns');
        recommendations.push('Review gear and setup table relationships for outdoor domain');
        break;
      case 'saas':
        recommendations.push('Enable team and workspace management features');
        recommendations.push('Consider subscription and billing table requirements');
        break;
      case 'ecommerce':
        recommendations.push('Verify product catalog and order management tables');
        recommendations.push('Consider payment processing and inventory tracking features');
        break;
      case 'social':
        recommendations.push('Enable user interaction and content sharing features');
        recommendations.push('Consider privacy settings and content moderation requirements');
        break;
      case 'generic':
        recommendations.push('Generic domain detected - consider more specific domain configuration');
        recommendations.push('Review schema patterns to identify potential specialized domain features');
        break;
    }
    
    return recommendations;
  }
}

/**
 * Default domain detection configuration
 */
export const DEFAULT_DOMAIN_DETECTION_CONFIG: DomainDetectionConfig = {
  strategy: 'comprehensive',
  confidenceThreshold: DOMAIN_CONFIDENCE_THRESHOLDS.moderate,
  detectSecondaryDomains: true,
  analyzeBusinessLogic: false,
  deepRelationshipAnalysis: true,
  excludeDomains: [],
  maxExecutionTime: 15000,
  useCaching: true
};