/**
 * Manual Override System for Epic 2: Smart Platform Detection Engine
 * Provides manual override capabilities and validation for detection results
 * Part of Task 2.1.6: Add manual override support and validation
 */

import {
  PlatformArchitectureType,
  ContentDomainType,
  PlatformArchitectureDetectionResult,
  ArchitectureEvidence,
  PlatformFeature,
  OverrideValidationResult,
  EvidenceType
} from './detection-types';

/**
 * Manual override configuration
 */
export interface ManualOverrideConfig {
  /** Force specific architecture type */
  architectureType?: PlatformArchitectureType;
  
  /** Force specific content domain */
  contentDomain?: ContentDomainType;
  
  /** Override confidence score */
  confidenceOverride?: number;
  
  /** Force specific platform features to be present/absent */
  platformFeatures?: Record<string, boolean>;
  
  /** Add custom evidence to support the override */
  customEvidence?: ArchitectureEvidence[];
  
  /** Custom reasoning to include in results */
  customReasoning?: string[];
  
  /** Override specific detection metrics */
  metricOverrides?: {
    schemaComplexity?: number;
    evidenceCount?: number;
  };
  
  /** Validation preferences */
  validation?: {
    /** Whether to validate against existing evidence */
    validateAgainstEvidence: boolean;
    
    /** Whether to allow overrides that conflict with high-confidence evidence */
    allowHighConfidenceConflicts: boolean;
    
    /** Minimum confidence required to override */
    minimumConfidenceToOverride: number;
    
    /** Whether to include warnings in validation */
    includeWarnings: boolean;
  };
  
  /** Metadata about the override */
  metadata?: {
    /** Reason for the override */
    reason: string;
    
    /** Who created the override */
    createdBy?: string;
    
    /** When the override was created */
    createdAt?: string;
    
    /** Override version for tracking */
    version?: string;
  };
}

/**
 * Override application result
 */
export interface OverrideApplicationResult {
  /** The modified detection result */
  result: PlatformArchitectureDetectionResult;
  
  /** Validation result of the override */
  validation: OverrideValidationResult;
  
  /** Applied overrides summary */
  appliedOverrides: {
    architectureTypeOverridden: boolean;
    confidenceOverridden: boolean;
    featuresOverridden: string[];
    evidenceAdded: number;
    reasoningAdded: number;
  };
  
  /** Override metadata */
  metadata: {
    overrideId: string;
    applicationTime: string;
    originalResult: {
      architectureType: PlatformArchitectureType;
      confidence: number;
    };
  };
}

/**
 * Override conflict information
 */
export interface OverrideConflict {
  /** Type of conflict */
  type: 'evidence_conflict' | 'confidence_conflict' | 'feature_conflict';
  
  /** Description of the conflict */
  description: string;
  
  /** Severity of the conflict */
  severity: 'low' | 'medium' | 'high';
  
  /** Conflicting evidence or features */
  conflictingItems: string[];
  
  /** Suggested resolution */
  suggestedResolution: string;
}

/**
 * Manual Override Manager
 */
export class ManualOverrideManager {
  private overrideHistory: Map<string, ManualOverrideConfig[]> = new Map();

  /**
   * Apply manual overrides to a detection result
   */
  async applyOverrides(
    originalResult: PlatformArchitectureDetectionResult,
    overrides: ManualOverrideConfig
  ): Promise<OverrideApplicationResult> {
    const overrideId = this.generateOverrideId();
    const applicationTime = new Date().toISOString();

    // Store original values for comparison
    const originalValues = {
      architectureType: originalResult.architectureType,
      confidence: originalResult.confidence
    };

    // Create a copy of the result to modify
    const modifiedResult: PlatformArchitectureDetectionResult = JSON.parse(
      JSON.stringify(originalResult)
    );

    // Track what was overridden
    const appliedOverrides = {
      architectureTypeOverridden: false,
      confidenceOverridden: false,
      featuresOverridden: [] as string[],
      evidenceAdded: 0,
      reasoningAdded: 0
    };

    // Step 1: Validate the override
    const validation = await this.validateOverride(originalResult, overrides);

    // Step 2: Apply architecture type override
    if (overrides.architectureType && overrides.architectureType !== originalResult.architectureType) {
      modifiedResult.architectureType = overrides.architectureType;
      appliedOverrides.architectureTypeOverridden = true;
      
      // Update alternatives to reflect the override
      modifiedResult.alternatives = modifiedResult.alternatives.filter(
        alt => alt.architectureType !== overrides.architectureType
      );
      modifiedResult.alternatives.unshift({
        architectureType: originalValues.architectureType,
        confidence: originalValues.confidence,
        reasoning: 'Original detected architecture (overridden)'
      });
    }

    // Step 3: Apply confidence override
    if (overrides.confidenceOverride !== undefined) {
      modifiedResult.confidence = Math.max(0, Math.min(1, overrides.confidenceOverride));
      modifiedResult.confidenceLevel = this.calculateConfidenceLevel(modifiedResult.confidence);
      appliedOverrides.confidenceOverridden = true;
    }

    // Step 4: Apply platform feature overrides
    if (overrides.platformFeatures) {
      for (const [featureId, shouldBePresent] of Object.entries(overrides.platformFeatures)) {
        const existingFeature = modifiedResult.platformFeatures.find(f => f.id === featureId);
        
        if (existingFeature) {
          if (existingFeature.present !== shouldBePresent) {
            existingFeature.present = shouldBePresent;
            existingFeature.confidence = shouldBePresent ? 1.0 : 0.0;
            existingFeature.evidence.push('Manual override applied');
            appliedOverrides.featuresOverridden.push(featureId);
          }
        } else if (shouldBePresent) {
          // Add new feature if it should be present
          const newFeature: PlatformFeature = {
            id: featureId,
            name: this.generateFeatureName(featureId),
            category: this.inferFeatureCategory(featureId),
            present: true,
            confidence: 1.0,
            evidence: ['Manual override - feature added'],
            implementingTables: [],
            typicallyIndicates: [modifiedResult.architectureType],
            commonInDomains: ['generic']
          };
          modifiedResult.platformFeatures.push(newFeature);
          appliedOverrides.featuresOverridden.push(featureId);
        }
      }
    }

    // Step 5: Add custom evidence
    if (overrides.customEvidence && overrides.customEvidence.length > 0) {
      modifiedResult.evidence.push(...overrides.customEvidence);
      appliedOverrides.evidenceAdded = overrides.customEvidence.length;
    }

    // Step 6: Add custom reasoning
    if (overrides.customReasoning && overrides.customReasoning.length > 0) {
      modifiedResult.reasoning.push(...overrides.customReasoning);
      appliedOverrides.reasoningAdded = overrides.customReasoning.length;
    }

    // Step 7: Apply metric overrides
    if (overrides.metricOverrides) {
      if (overrides.metricOverrides.schemaComplexity !== undefined) {
        modifiedResult.detectionMetrics.schemaComplexity = overrides.metricOverrides.schemaComplexity;
      }
      if (overrides.metricOverrides.evidenceCount !== undefined) {
        modifiedResult.detectionMetrics.evidenceCount = overrides.metricOverrides.evidenceCount;
      }
    }

    // Step 8: Update recommendations based on overrides
    this.updateRecommendationsForOverrides(modifiedResult, overrides, validation);

    // Step 9: Record the override in history
    this.recordOverrideInHistory(overrideId, overrides);

    return {
      result: modifiedResult,
      validation,
      appliedOverrides,
      metadata: {
        overrideId,
        applicationTime,
        originalResult: originalValues
      }
    };
  }

  /**
   * Validate manual override against existing evidence
   */
  async validateOverride(
    originalResult: PlatformArchitectureDetectionResult,
    overrides: ManualOverrideConfig
  ): Promise<OverrideValidationResult> {
    const validationConfig = {
      validateAgainstEvidence: true,
      allowHighConfidenceConflicts: false,
      minimumConfidenceToOverride: 0.3,
      includeWarnings: true,
      ...overrides.validation
    };

    const warnings: string[] = [];
    const conflicts: OverrideValidationResult['conflicts'] = [];
    const recommendations: string[] = [];

    let isValid = true;

    // Validate architecture type override
    if (overrides.architectureType && overrides.architectureType !== originalResult.architectureType) {
      const architectureConflicts = this.validateArchitectureTypeOverride(
        originalResult,
        overrides.architectureType,
        validationConfig
      );
      
      conflicts.push(...architectureConflicts);
      
      if (architectureConflicts.some(c => c.severity === 'high')) {
        if (!validationConfig.allowHighConfidenceConflicts) {
          isValid = false;
        }
        warnings.push(`High confidence conflicts detected for architecture override to ${overrides.architectureType}`);
      }
    }

    // Validate confidence override
    if (overrides.confidenceOverride !== undefined) {
      const confidenceConflicts = this.validateConfidenceOverride(
        originalResult,
        overrides.confidenceOverride,
        validationConfig
      );
      
      conflicts.push(...confidenceConflicts);
      
      if (Math.abs(overrides.confidenceOverride - originalResult.confidence) > 0.4) {
        warnings.push('Large confidence adjustment may indicate detection issues');
      }
    }

    // Validate platform feature overrides
    if (overrides.platformFeatures) {
      const featureConflicts = this.validateFeatureOverrides(
        originalResult,
        overrides.platformFeatures,
        validationConfig
      );
      
      conflicts.push(...featureConflicts);
    }

    // Validate custom evidence
    if (overrides.customEvidence) {
      const evidenceValidation = this.validateCustomEvidence(overrides.customEvidence);
      if (!evidenceValidation.isValid) {
        isValid = false;
        warnings.push('Custom evidence contains invalid data');
      }
    }

    // Generate validation recommendations
    if (conflicts.length > 0) {
      recommendations.push('Review conflicts before applying override');
    }
    
    if (originalResult.confidence > 0.8 && overrides.architectureType) {
      recommendations.push('Original detection has high confidence - consider verifying override necessity');
    }

    if (warnings.length === 0 && conflicts.length === 0) {
      recommendations.push('Override validation passed - safe to apply');
    }

    return {
      isValid,
      warnings,
      conflicts,
      recommendations
    };
  }

  /**
   * Validate architecture type override
   */
  private validateArchitectureTypeOverride(
    originalResult: PlatformArchitectureDetectionResult,
    overrideType: PlatformArchitectureType,
    config: any
  ): OverrideValidationResult['conflicts'] {
    const conflicts: OverrideValidationResult['conflicts'] = [];

    // Check for evidence that strongly contradicts the override
    const contradictingEvidence = originalResult.evidence.filter(evidence => {
      const originalIndicator = evidence.architectureIndicators[originalResult.architectureType];
      const overrideIndicator = evidence.architectureIndicators[overrideType];
      
      return originalIndicator > 0.7 && overrideIndicator < 0.3 && evidence.confidence > 0.7;
    });

    if (contradictingEvidence.length > 0) {
      conflicts.push({
        evidenceType: 'table_pattern',
        description: `${contradictingEvidence.length} pieces of evidence strongly contradict ${overrideType} architecture`,
        severity: contradictingEvidence.length > 2 ? 'high' : 'medium'
      });
    }

    // Check if original detection had very high confidence
    if (originalResult.confidence > 0.9) {
      conflicts.push({
        evidenceType: 'column_analysis',
        description: 'Original detection has very high confidence (>90%)',
        severity: 'medium'
      });
    }

    return conflicts;
  }

  /**
   * Validate confidence override
   */
  private validateConfidenceOverride(
    originalResult: PlatformArchitectureDetectionResult,
    overrideConfidence: number,
    config: any
  ): OverrideValidationResult['conflicts'] {
    const conflicts: OverrideValidationResult['conflicts'] = [];

    // Check for unrealistic confidence values
    if (overrideConfidence < config.minimumConfidenceToOverride) {
      conflicts.push({
        evidenceType: 'business_logic',
        description: `Override confidence (${overrideConfidence}) below minimum threshold (${config.minimumConfidenceToOverride})`,
        severity: 'medium'
      });
    }

    // Check for confidence inconsistent with evidence
    const strongEvidence = originalResult.evidence.filter(e => e.confidence > 0.8).length;
    if (overrideConfidence < 0.5 && strongEvidence > 3) {
      conflicts.push({
        evidenceType: 'data_pattern',
        description: 'Low confidence override despite strong supporting evidence',
        severity: 'medium'
      });
    }

    return conflicts;
  }

  /**
   * Validate platform feature overrides
   */
  private validateFeatureOverrides(
    originalResult: PlatformArchitectureDetectionResult,
    featureOverrides: Record<string, boolean>,
    config: any
  ): OverrideValidationResult['conflicts'] {
    const conflicts: OverrideValidationResult['conflicts'] = [];

    for (const [featureId, shouldBePresent] of Object.entries(featureOverrides)) {
      const existingFeature = originalResult.platformFeatures.find(f => f.id === featureId);
      
      if (existingFeature && existingFeature.present !== shouldBePresent) {
        if (existingFeature.confidence > 0.8) {
          conflicts.push({
            evidenceType: 'table_pattern',
            description: `High confidence feature '${featureId}' being overridden`,
            severity: 'medium'
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Validate custom evidence
   */
  private validateCustomEvidence(customEvidence: ArchitectureEvidence[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const evidence of customEvidence) {
      // Validate confidence range
      if (evidence.confidence < 0 || evidence.confidence > 1) {
        errors.push(`Evidence confidence must be between 0 and 1, got ${evidence.confidence}`);
      }

      // Validate weight range
      if (evidence.weight < 0 || evidence.weight > 1) {
        errors.push(`Evidence weight must be between 0 and 1, got ${evidence.weight}`);
      }

      // Validate architecture indicators sum
      const indicatorSum = Object.values(evidence.architectureIndicators).reduce((sum, val) => sum + val, 0);
      if (indicatorSum > 3) { // Should typically sum to around 1, but allow some flexibility
        errors.push(`Architecture indicators sum seems too high: ${indicatorSum}`);
      }

      // Validate evidence has description
      if (!evidence.description || evidence.description.trim().length === 0) {
        errors.push('Evidence must have a description');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Update recommendations based on applied overrides
   */
  private updateRecommendationsForOverrides(
    result: PlatformArchitectureDetectionResult,
    overrides: ManualOverrideConfig,
    validation: OverrideValidationResult
  ): void {
    // Add override-specific recommendations
    if (overrides.architectureType) {
      result.recommendations.unshift(
        `Architecture manually overridden to ${overrides.architectureType}${overrides.metadata?.reason ? ` (${overrides.metadata.reason})` : ''}`
      );
    }

    if (overrides.confidenceOverride !== undefined) {
      result.recommendations.push(
        `Confidence manually set to ${(overrides.confidenceOverride * 100).toFixed(0)}%`
      );
    }

    // Add validation warnings as recommendations
    for (const warning of validation.warnings) {
      result.recommendations.push(`⚠️ Override Warning: ${warning}`);
    }

    // Add conflict resolutions as recommendations
    for (const conflict of validation.conflicts) {
      if (conflict.severity === 'high') {
        result.recommendations.push(`🚨 Override Conflict: ${conflict.description}`);
      }
    }
  }

  /**
   * Generate a unique override ID
   */
  private generateOverrideId(): string {
    return `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate confidence level from confidence score
   */
  private calculateConfidenceLevel(confidence: number): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.75) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.25) return 'low';
    return 'very_low';
  }

  /**
   * Generate feature name from feature ID
   */
  private generateFeatureName(featureId: string): string {
    return featureId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Infer feature category from feature ID
   */
  private inferFeatureCategory(featureId: string): PlatformFeature['category'] {
    const categoryMap: Record<string, PlatformFeature['category']> = {
      auth: 'authentication',
      user: 'user_management',
      team: 'collaboration',
      org: 'organization',
      content: 'content_creation',
      media: 'media',
      analytics: 'analytics',
      billing: 'billing',
      custom: 'customization'
    };

    for (const [key, category] of Object.entries(categoryMap)) {
      if (featureId.toLowerCase().includes(key)) {
        return category;
      }
    }

    return 'customization';
  }

  /**
   * Record override in history for tracking
   */
  private recordOverrideInHistory(overrideId: string, overrides: ManualOverrideConfig): void {
    const timestamp = new Date().toISOString();
    const historyEntry = {
      ...overrides,
      metadata: {
        reason: 'Override applied',
        ...overrides.metadata,
        overrideId,
        appliedAt: timestamp
      }
    };

    if (!this.overrideHistory.has(overrideId)) {
      this.overrideHistory.set(overrideId, []);
    }
    this.overrideHistory.get(overrideId)!.push(historyEntry);
  }

  /**
   * Get override history for analysis
   */
  getOverrideHistory(overrideId?: string): ManualOverrideConfig[] {
    if (overrideId) {
      return this.overrideHistory.get(overrideId) || [];
    }
    
    // Return all history entries
    const allHistory: ManualOverrideConfig[] = [];
    for (const entries of Array.from(this.overrideHistory.values())) {
      allHistory.push(...entries);
    }
    return allHistory;
  }

  /**
   * Clear override history
   */
  clearOverrideHistory(): void {
    this.overrideHistory.clear();
  }

  /**
   * Create a pre-configured override for common scenarios
   */
  createTemplateOverride(
    scenario: 'force_individual' | 'force_team' | 'force_hybrid' | 'high_confidence' | 'low_confidence'
  ): Partial<ManualOverrideConfig> {
    const templates: Record<string, Partial<ManualOverrideConfig>> = {
      force_individual: {
        architectureType: 'individual',
        customReasoning: ['Manually overridden to individual architecture'],
        metadata: {
          reason: 'Platform is designed for individual creators'
        }
      },
      force_team: {
        architectureType: 'team',
        platformFeatures: {
          'team_collaboration': true,
          'organization_management': true
        },
        customReasoning: ['Manually overridden to team architecture'],
        metadata: {
          reason: 'Platform has team collaboration features'
        }
      },
      force_hybrid: {
        architectureType: 'hybrid',
        platformFeatures: {
          'flexible_account_management': true,
          'context_switching': true
        },
        customReasoning: ['Manually overridden to hybrid architecture'],
        metadata: {
          reason: 'Platform supports both individual and team use cases'
        }
      },
      high_confidence: {
        confidenceOverride: 0.95,
        metadata: {
          reason: 'High confidence in manual assessment'
        }
      },
      low_confidence: {
        confidenceOverride: 0.3,
        metadata: {
          reason: 'Uncertain about detection accuracy'
        }
      }
    };

    return templates[scenario] || {};
  }
}

/**
 * Default manual override validation configuration
 */
export const DEFAULT_OVERRIDE_VALIDATION = {
  validateAgainstEvidence: true,
  allowHighConfidenceConflicts: false,
  minimumConfidenceToOverride: 0.2,
  includeWarnings: true
};