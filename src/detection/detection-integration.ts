/**
 * Detection System Integration Layer for Epic 2: Smart Platform Detection Engine
 * Integrates new Architecture Detection Engine with existing schema introspection and framework detection
 * Part of Task 2.1.5: Integrate with existing schema introspection and framework detection
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

// Import existing detection systems
import { SchemaIntrospector, type SchemaIntrospectionResult } from '../schema/schema-introspector';
import { MakerKitDetector, type MakerKitDetectionResult } from '../framework/strategies/makerkit-detector';

// Import new architecture detection system
import { ArchitectureDetectionEngine } from './architecture-detector';
import { ArchitectureEvidenceCollector } from './evidence-collector';
import {
  PlatformArchitectureDetectionResult,
  DetectionAnalysisContext,
  ArchitectureDetectionConfig,
  PlatformArchitectureType,
  ContentDomainType
} from './detection-types';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Unified detection result combining all detection systems
 */
export interface UnifiedDetectionResult {
  /** Architecture detection results (new system) */
  architecture: PlatformArchitectureDetectionResult;
  
  /** Schema introspection results (existing system) */
  schema: SchemaIntrospectionResult;
  
  /** Framework detection results (existing system) */
  framework: MakerKitDetectionResult;
  
  /** Integration metadata */
  integration: {
    /** Overall confidence in unified detection */
    overallConfidence: number;
    
    /** Cross-validation results */
    crossValidation: CrossValidationResult;
    
    /** Consolidated recommendations */
    recommendations: string[];
    
    /** Detection conflicts and resolutions */
    conflicts: DetectionConflict[];
    
    /** Performance metrics */
    performance: {
      totalExecutionTime: number;
      schemaIntrospectionTime: number;
      frameworkDetectionTime: number;
      architectureDetectionTime: number;
    };
  };
}

/**
 * Cross-validation between different detection systems
 */
export interface CrossValidationResult {
  /** Whether architecture and framework detection agree */
  architectureFrameworkAgreement: number; // 0-1
  
  /** Whether schema patterns match architecture detection */
  schemaArchitectureAgreement: number; // 0-1
  
  /** Overall cross-validation score */
  overallAgreement: number; // 0-1
  
  /** Specific agreements and disagreements */
  agreements: string[];
  disagreements: string[];
}

/**
 * Detection conflicts between systems
 */
export interface DetectionConflict {
  /** Type of conflict */
  type: 'architecture_mismatch' | 'framework_mismatch' | 'schema_inconsistency';
  
  /** Description of the conflict */
  description: string;
  
  /** Severity of the conflict */
  severity: 'low' | 'medium' | 'high';
  
  /** Suggested resolution */
  suggestedResolution: string;
  
  /** Systems involved in the conflict */
  involvedSystems: ('architecture' | 'schema' | 'framework')[];
}

/**
 * Configuration for unified detection
 */
export interface UnifiedDetectionConfig {
  /** Architecture detection configuration */
  architecture?: Partial<ArchitectureDetectionConfig>;
  
  /** Whether to perform cross-validation */
  enableCrossValidation: boolean;
  
  /** Whether to attempt conflict resolution */
  enableConflictResolution: boolean;
  
  /** Maximum execution time for unified detection (ms) */
  maxExecutionTime: number;
  
  /** Whether to cache detection results */
  enableCaching: boolean;
  
  /** Confidence threshold for accepting results */
  confidenceThreshold: number;
}

/**
 * Main integration orchestrator for all detection systems
 */
export class DetectionIntegrationEngine {
  private client: SupabaseClient;
  private schemaIntrospector: SchemaIntrospector;
  private makerKitDetector: MakerKitDetector;
  private architectureDetector: ArchitectureDetectionEngine;
  private evidenceCollector: ArchitectureEvidenceCollector;
  private cache: Map<string, UnifiedDetectionResult> = new Map();

  constructor(client: SupabaseClient) {
    this.client = client;
    this.schemaIntrospector = new SchemaIntrospector(client);
    this.makerKitDetector = new MakerKitDetector(client);
    this.architectureDetector = new ArchitectureDetectionEngine();
    this.evidenceCollector = new ArchitectureEvidenceCollector();
  }

  /**
   * Perform unified detection across all systems
   */
  async performUnifiedDetection(
    config: Partial<UnifiedDetectionConfig> = {}
  ): Promise<UnifiedDetectionResult> {
    const fullConfig: UnifiedDetectionConfig = {
      enableCrossValidation: true,
      enableConflictResolution: true,
      maxExecutionTime: 30000, // 30 seconds
      enableCaching: true,
      confidenceThreshold: 0.6,
      ...config
    };

    const startTime = Date.now();
    Logger.info('🔄 Starting unified detection across all systems...');

    // Check cache first
    const cacheKey = this.generateCacheKey(fullConfig);
    if (fullConfig.enableCaching && this.cache.has(cacheKey)) {
      Logger.info('📦 Using cached unified detection result');
      return this.cache.get(cacheKey)!;
    }

    try {
      // Step 1: Schema Introspection (foundational data)
      const schemaStartTime = Date.now();
      Logger.debug('🔍 Performing schema introspection...');
      const schemaResult = await this.schemaIntrospector.introspectSchema();
      const schemaTime = Date.now() - schemaStartTime;
      Logger.success(`✅ Schema introspection completed in ${schemaTime}ms`);

      // Step 2: Framework Detection (leverages schema data)
      const frameworkStartTime = Date.now();
      Logger.debug('🏗️  Performing framework detection...');
      const frameworkResult = await this.makerKitDetector.detectMakerKit({
        tables: schemaResult.tables.map(t => ({
          name: t.name,
          columns: t.columns.map(c => ({ name: c.name, type: c.type, nullable: c.isNullable })),
          relationships: []
        })),
        functions: [], // Would be populated from actual schema
        constraints: schemaResult.constraints.dataIntegrityRules.map(r => ({
          name: r.rule,
          table: r.table,
          type: this.mapConstraintTypeToFramework(r.type),
          definition: r.sqlCondition
        })),
        triggers: [] // Would be populated from actual schema
      });
      const frameworkTime = Date.now() - frameworkStartTime;
      Logger.success(`✅ Framework detection completed in ${frameworkTime}ms`);

      // Step 3: Architecture Detection (new system)
      const architectureStartTime = Date.now();
      Logger.debug('🏛️  Performing architecture detection...');
      const detectionContext = this.buildDetectionContext(schemaResult, frameworkResult);
      const architectureResult = await this.architectureDetector.detectArchitecture(
        detectionContext,
        fullConfig.architecture
      );
      const architectureTime = Date.now() - architectureStartTime;
      Logger.success(`✅ Architecture detection completed in ${architectureTime}ms`);

      // Step 4: Cross-validation and integration
      const crossValidation = fullConfig.enableCrossValidation
        ? this.performCrossValidation(schemaResult, frameworkResult, architectureResult)
        : this.createEmptyCrossValidation();

      // Step 5: Conflict detection and resolution
      const conflicts = fullConfig.enableConflictResolution
        ? this.detectAndResolveConflicts(schemaResult, frameworkResult, architectureResult)
        : [];

      // Step 6: Generate consolidated recommendations
      const recommendations = this.generateConsolidatedRecommendations(
        schemaResult,
        frameworkResult,
        architectureResult,
        crossValidation,
        conflicts
      );

      // Step 7: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        schemaResult,
        frameworkResult,
        architectureResult,
        crossValidation
      );

      const totalTime = Date.now() - startTime;

      const unifiedResult: UnifiedDetectionResult = {
        architecture: architectureResult,
        schema: schemaResult,
        framework: frameworkResult,
        integration: {
          overallConfidence,
          crossValidation,
          recommendations,
          conflicts,
          performance: {
            totalExecutionTime: totalTime,
            schemaIntrospectionTime: schemaTime,
            frameworkDetectionTime: frameworkTime,
            architectureDetectionTime: architectureTime
          }
        }
      };

      // Cache the result
      if (fullConfig.enableCaching) {
        this.cache.set(cacheKey, unifiedResult);
      }

      Logger.success(`🎉 Unified detection completed in ${totalTime}ms with ${overallConfidence.toFixed(2)} confidence`);
      return unifiedResult;

    } catch (error: any) {
      Logger.error('Unified detection failed:', error);
      throw new Error(`Unified detection failed: ${error.message}`);
    }
  }

  /**
   * Build detection context from existing introspection results
   */
  private buildDetectionContext(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult
  ): DetectionAnalysisContext {
    return {
      schema: {
        tableCount: schemaResult.tables.length,
        tableNames: schemaResult.tables.map(t => t.name),
        relationships: schemaResult.relationships.map(r => ({
          fromTable: r.fromTable,
          toTable: r.toTable,
          type: r.relationshipType,
          columnName: r.fromColumn
        })),
        constraints: schemaResult.constraints.dataIntegrityRules.map(r => ({
          tableName: r.table,
          constraintName: r.rule,
          type: this.mapConstraintType(r.type)
        }))
      },
      framework: {
        type: frameworkResult.isMakerKit ? 'makerkit' : 'unknown',
        version: frameworkResult.version,
        confidence: frameworkResult.confidence
      },
      businessLogic: {
        functions: [],
        triggers: [],
        policies: []
      },
      existingResults: {
        frameworkDetection: frameworkResult,
        multiTenantDetection: undefined,
        businessLogicAnalysis: undefined
      }
    };
  }

  /**
   * Perform cross-validation between different detection systems
   */
  private performCrossValidation(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult
  ): CrossValidationResult {
    const agreements: string[] = [];
    const disagreements: string[] = [];

    // Validate architecture against framework
    const architectureFrameworkAgreement = this.validateArchitectureFrameworkAgreement(
      architectureResult,
      frameworkResult,
      agreements,
      disagreements
    );

    // Validate architecture against schema patterns
    const schemaArchitectureAgreement = this.validateSchemaArchitectureAgreement(
      schemaResult,
      architectureResult,
      agreements,
      disagreements
    );

    const overallAgreement = (architectureFrameworkAgreement + schemaArchitectureAgreement) / 2;

    return {
      architectureFrameworkAgreement,
      schemaArchitectureAgreement,
      overallAgreement,
      agreements,
      disagreements
    };
  }

  /**
   * Validate agreement between architecture and framework detection
   */
  private validateArchitectureFrameworkAgreement(
    architectureResult: PlatformArchitectureDetectionResult,
    frameworkResult: MakerKitDetectionResult,
    agreements: string[],
    disagreements: string[]
  ): number {
    let agreementScore = 0;
    let totalChecks = 0;

    // Check if MakerKit detection aligns with architecture type
    if (frameworkResult.isMakerKit) {
      totalChecks++;
      
      // MakerKit typically supports team and hybrid architectures
      if (architectureResult.architectureType === 'team' || 
          architectureResult.architectureType === 'hybrid') {
        agreementScore++;
        agreements.push('MakerKit framework aligns with team/hybrid architecture');
      } else {
        disagreements.push('MakerKit framework detected but architecture appears individual-focused');
      }
    }

    // Check MakerKit version alignment
    if (frameworkResult.version) {
      totalChecks++;
      
      const hasComplexFeatures = architectureResult.platformFeatures.some(f =>
        f.category === 'organization' || f.category === 'collaboration'
      );
      
      if (frameworkResult.version === 'v3' && hasComplexFeatures) {
        agreementScore++;
        agreements.push('MakerKit v3 aligns with complex organizational features');
      } else if (frameworkResult.version === 'v2' && !hasComplexFeatures) {
        agreementScore++;
        agreements.push('MakerKit v2 aligns with simpler feature set');
      } else {
        disagreements.push(`MakerKit ${frameworkResult.version} features don't match detected complexity`);
      }
    }

    return totalChecks > 0 ? agreementScore / totalChecks : 0.5;
  }

  /**
   * Validate agreement between schema patterns and architecture detection
   */
  private validateSchemaArchitectureAgreement(
    schemaResult: SchemaIntrospectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    agreements: string[],
    disagreements: string[]
  ): number {
    let agreementScore = 0;
    let totalChecks = 0;

    // Check table patterns alignment
    const userTables = schemaResult.patterns.filter(p => p.suggestedRole === 'user');
    const contentTables = schemaResult.patterns.filter(p => p.suggestedRole === 'content');
    
    totalChecks++;
    if (architectureResult.architectureType === 'individual') {
      if (userTables.length === 1 && contentTables.length > 0) {
        agreementScore++;
        agreements.push('Schema patterns align with individual architecture');
      } else {
        disagreements.push('Individual architecture but schema suggests multiple user patterns');
      }
    } else if (architectureResult.architectureType === 'team') {
      if (schemaResult.tables.some(t => t.name.includes('organization') || t.name.includes('team'))) {
        agreementScore++;
        agreements.push('Schema contains team/organization tables matching team architecture');
      } else {
        disagreements.push('Team architecture but schema lacks team-oriented tables');
      }
    }

    // Check relationship complexity
    totalChecks++;
    const relationshipCount = schemaResult.relationships.length;
    const expectedComplexity = this.getExpectedRelationshipComplexity(architectureResult.architectureType);
    
    if (relationshipCount >= expectedComplexity.min && relationshipCount <= expectedComplexity.max) {
      agreementScore++;
      agreements.push(`Relationship complexity (${relationshipCount}) matches ${architectureResult.architectureType} architecture`);
    } else {
      disagreements.push(`Relationship complexity (${relationshipCount}) doesn't match expected range for ${architectureResult.architectureType}`);
    }

    return totalChecks > 0 ? agreementScore / totalChecks : 0.5;
  }

  /**
   * Detect and resolve conflicts between detection systems
   */
  private detectAndResolveConflicts(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult
  ): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    // Check for architecture-framework conflicts
    if (frameworkResult.isMakerKit && frameworkResult.confidence > 0.7) {
      if (architectureResult.architectureType === 'individual' && architectureResult.confidence > 0.7) {
        conflicts.push({
          type: 'architecture_mismatch',
          description: 'High confidence MakerKit detection conflicts with individual architecture',
          severity: 'medium',
          suggestedResolution: 'Consider hybrid architecture or verify MakerKit configuration',
          involvedSystems: ['architecture', 'framework']
        });
      }
    }

    // Check for schema-architecture conflicts
    const teamTables = schemaResult.tables.filter(t => 
      t.name.includes('team') || t.name.includes('organization') || t.name.includes('workspace')
    );
    
    if (teamTables.length > 0 && architectureResult.architectureType === 'individual') {
      conflicts.push({
        type: 'schema_inconsistency',
        description: 'Schema contains team-oriented tables but architecture is individual',
        severity: 'high',
        suggestedResolution: 'Re-evaluate architecture detection or check for hybrid patterns',
        involvedSystems: ['schema', 'architecture']
      });
    }

    // Check for low confidence across all systems
    if (schemaResult.framework.confidence < 0.5 && 
        frameworkResult.confidence < 0.5 && 
        architectureResult.confidence < 0.5) {
      conflicts.push({
        type: 'framework_mismatch',
        description: 'Low confidence across all detection systems',
        severity: 'high',
        suggestedResolution: 'Manual verification required - consider custom configuration',
        involvedSystems: ['schema', 'framework', 'architecture']
      });
    }

    return conflicts;
  }

  /**
   * Generate consolidated recommendations from all systems
   */
  private generateConsolidatedRecommendations(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    crossValidation: CrossValidationResult,
    conflicts: DetectionConflict[]
  ): string[] {
    const recommendations: string[] = [];

    // Architecture-specific recommendations
    recommendations.push(`Platform Architecture: ${architectureResult.architectureType} (${(architectureResult.confidence * 100).toFixed(0)}% confidence)`);
    recommendations.push(...architectureResult.recommendations);

    // Framework-specific recommendations
    if (frameworkResult.isMakerKit) {
      recommendations.push(`Framework: MakerKit ${frameworkResult.version || 'detected'} (${(frameworkResult.confidence * 100).toFixed(0)}% confidence)`);
      recommendations.push(...frameworkResult.recommendations);
    }

    // Schema-specific recommendations
    recommendations.push(...schemaResult.recommendations.map(r => `Schema: ${r.message}`));

    // Cross-validation recommendations
    if (crossValidation.overallAgreement < 0.7) {
      recommendations.push('⚠️ Low cross-validation agreement - consider manual review');
    }

    if (crossValidation.disagreements.length > 0) {
      recommendations.push('📝 Review disagreements between detection systems');
    }

    // Conflict-based recommendations
    for (const conflict of conflicts) {
      if (conflict.severity === 'high') {
        recommendations.push(`🚨 High Priority: ${conflict.suggestedResolution}`);
      } else {
        recommendations.push(`⚠️ ${conflict.suggestedResolution}`);
      }
    }

    // Performance recommendations
    if (architectureResult.detectionMetrics.executionTime > 10000) {
      recommendations.push('⏱️ Consider using faster detection strategy for better performance');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  /**
   * Calculate overall confidence across all detection systems
   */
  private calculateOverallConfidence(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    crossValidation: CrossValidationResult
  ): number {
    // Weight different confidence scores
    const weights = {
      schema: 0.2,
      framework: 0.3,
      architecture: 0.3,
      crossValidation: 0.2
    };

    const weightedSum = 
      (schemaResult.framework.confidence * weights.schema) +
      (frameworkResult.confidence * weights.framework) +
      (architectureResult.confidence * weights.architecture) +
      (crossValidation.overallAgreement * weights.crossValidation);

    return Math.min(1.0, weightedSum);
  }

  /**
   * Helper methods
   */
  private createEmptyCrossValidation(): CrossValidationResult {
    return {
      architectureFrameworkAgreement: 0.5,
      schemaArchitectureAgreement: 0.5,
      overallAgreement: 0.5,
      agreements: [],
      disagreements: []
    };
  }

  private mapConstraintType(type: string): string {
    const mapping: Record<string, string> = {
      'required_relationship': 'foreign_key',
      'conditional_insert': 'check',
      'value_constraint': 'check',
      'business_rule': 'trigger'
    };
    return mapping[type] || type;
  }

  private mapConstraintTypeToFramework(type: string): 'check' | 'foreign_key' | 'unique' | 'primary_key' {
    const mapping: Record<string, 'check' | 'foreign_key' | 'unique' | 'primary_key'> = {
      'required_relationship': 'foreign_key',
      'conditional_insert': 'check',
      'value_constraint': 'check',
      'business_rule': 'check'
    };
    return mapping[type] || 'check';
  }

  private getExpectedRelationshipComplexity(architectureType: PlatformArchitectureType): { min: number; max: number } {
    switch (architectureType) {
      case 'individual':
        return { min: 2, max: 8 };
      case 'team':
        return { min: 8, max: 20 };
      case 'hybrid':
        return { min: 6, max: 25 };
      default:
        return { min: 0, max: 100 };
    }
  }

  private generateCacheKey(config: UnifiedDetectionConfig): string {
    return `unified_detection_${JSON.stringify(config)}`;
  }

  /**
   * Clear all detection caches
   */
  clearCaches(): void {
    this.cache.clear();
    this.schemaIntrospector.clearCache();
    Logger.info('🧹 All detection caches cleared');
  }

  /**
   * Get quick detection summary for performance-critical scenarios
   */
  async getQuickDetectionSummary(): Promise<{
    architectureType: PlatformArchitectureType;
    confidence: number;
    isFrameworkDetected: boolean;
    executionTime: number;
  }> {
    const startTime = Date.now();
    
    // Use cached schema introspection if available
    let schemaResult = this.schemaIntrospector.getCachedResult();
    if (!schemaResult) {
      schemaResult = await this.schemaIntrospector.introspectSchema();
    }

    // Quick architecture detection with fast strategy
    const detectionContext = this.buildDetectionContext(schemaResult, {
      isMakerKit: false,
      confidence: 0,
      detectedFeatures: [],
      missingFeatures: [],
      recommendations: []
    });

    const architectureResult = await this.architectureDetector.detectArchitecture(
      detectionContext,
      { strategy: 'fast', maxExecutionTime: 5000 }
    );

    const executionTime = Date.now() - startTime;

    return {
      architectureType: architectureResult.architectureType,
      confidence: architectureResult.confidence,
      isFrameworkDetected: schemaResult.framework.confidence > 0.5,
      executionTime
    };
  }
}

/**
 * Default configuration for unified detection
 */
export const DEFAULT_UNIFIED_DETECTION_CONFIG: UnifiedDetectionConfig = {
  enableCrossValidation: true,
  enableConflictResolution: true,
  maxExecutionTime: 30000,
  enableCaching: true,
  confidenceThreshold: 0.6,
  architecture: {
    strategy: 'comprehensive',
    confidenceThreshold: 0.6,
    includeDetailedEvidence: true,
    analyzeBusinessLogic: false,
    analyzeRLSPolicies: false,
    deepRelationshipAnalysis: true,
    maxExecutionTime: 15000,
    useCaching: true
  }
};