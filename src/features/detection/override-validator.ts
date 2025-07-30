/**
 * Override Validation System for Epic 2: Smart Platform Detection Engine
 * Validates manual platform and domain overrides against auto-detection results
 * Part of Task 2.4.2: Create override validation utilities (FR-2.5)
 */

import { Logger } from '../../core/utils/logger';
import type { FlexibleSeedConfig } from '../core/types/config-types';
import type { UnifiedDetectionResult } from './detection-integration';
import type {
  PlatformArchitectureType,
  ContentDomainType,
  ConfidenceLevel
} from './detection-types';

/**
 * Override validation result
 */
export interface OverrideValidationResult {
  /** Whether the overall validation passed */
  valid: boolean;
  
  /** Validation confidence score */
  confidence: number;
  
  /** Validation confidence level */
  confidenceLevel: ConfidenceLevel;
  
  /** Platform architecture validation */
  platformArchitecture: {
    hasOverride: boolean;
    overrideValue?: PlatformArchitectureType;
    detectedValue?: PlatformArchitectureType;
    conflictSeverity: 'none' | 'low' | 'medium' | 'high';
    recommendedAction: 'proceed' | 'warn' | 'review' | 'reject';
    validation: {
      valid: boolean;
      confidence: number;
      reasoning: string[];
      warnings: string[];
    };
  };
  
  /** Content domain validation */
  contentDomain: {
    hasOverride: boolean;
    overrideValue?: ContentDomainType;
    detectedValue?: ContentDomainType;
    conflictSeverity: 'none' | 'low' | 'medium' | 'high';
    recommendedAction: 'proceed' | 'warn' | 'review' | 'reject';
    validation: {
      valid: boolean;
      confidence: number;
      reasoning: string[];
      warnings: string[];
    };
  };
  
  /** Overall validation metadata */
  validation: {
    totalConflicts: number;
    highSeverityConflicts: number;
    validationTime: number;
    validationMethod: string;
    recommendations: string[];
    warnings: string[];
    errors: string[];
  };
}

/**
 * Override conflict types
 */
export interface OverrideConflict {
  type: 'platform_architecture_mismatch' | 'content_domain_mismatch' | 'configuration_inconsistency';
  severity: 'low' | 'medium' | 'high';
  description: string;
  overrideValue: string;
  detectedValue: string;
  detectionConfidence: number;
  suggestedResolution: string;
  autoFixAvailable: boolean;
}

/**
 * Override validation options
 */
export interface OverrideValidationOptions {
  /** Whether to enable strict validation mode */
  strictMode: boolean;
  
  /** Warning level for validation output */
  warningLevel: 'none' | 'basic' | 'detailed';
  
  /** Minimum confidence threshold to challenge overrides */
  confidenceThreshold: number;
  
  /** Whether to validate domain-specific configurations */
  validateDomainSpecific: boolean;
  
  /** Whether to check for configuration inconsistencies */
  checkConfigurationConsistency: boolean;
  
  /** Whether to suggest auto-fixes for conflicts */
  suggestAutoFixes: boolean;
}

/**
 * Main Override Validation Engine
 */
export class OverrideValidator {
  
  /**
   * Validate manual overrides against detection results
   */
  async validateOverrides(
    config: FlexibleSeedConfig,
    detectionResults: UnifiedDetectionResult,
    options: Partial<OverrideValidationOptions> = {}
  ): Promise<OverrideValidationResult> {
    const startTime = Date.now();
    const fullOptions = this.mergeWithDefaults(options);
    
    Logger.debug('🔍 Validating manual overrides against detection results...');
    
    try {
      // Validate platform architecture override
      const platformValidation = await this.validatePlatformArchitectureOverride(
        config,
        detectionResults,
        fullOptions
      );
      
      // Validate content domain override
      const domainValidation = await this.validateContentDomainOverride(
        config,
        detectionResults,
        fullOptions
      );
      
      // Calculate overall validation result
      const overallValid = platformValidation.validation.valid && domainValidation.validation.valid;
      const totalConflicts = this.countConflicts(platformValidation, domainValidation);
      const highSeverityConflicts = this.countHighSeverityConflicts(platformValidation, domainValidation);
      
      // Generate recommendations based on validation results
      const recommendations = this.generateValidationRecommendations(
        platformValidation,
        domainValidation,
        fullOptions
      );
      
      // Collect all warnings and errors
      const allWarnings = [
        ...platformValidation.validation.warnings,
        ...domainValidation.validation.warnings
      ];
      
      const allErrors: string[] = [];
      if (!platformValidation.validation.valid) {
        allErrors.push(`Platform architecture override validation failed`);
      }
      if (!domainValidation.validation.valid) {
        allErrors.push(`Content domain override validation failed`);
      }
      
      const validationTime = Date.now() - startTime;
      const overallConfidence = (platformValidation.validation.confidence + domainValidation.validation.confidence) / 2;
      
      const result: OverrideValidationResult = {
        valid: overallValid,
        confidence: overallConfidence,
        confidenceLevel: this.getConfidenceLevel(overallConfidence),
        platformArchitecture: platformValidation,
        contentDomain: domainValidation,
        validation: {
          totalConflicts,
          highSeverityConflicts,
          validationTime,
          validationMethod: 'comprehensive',
          recommendations,
          warnings: allWarnings,
          errors: allErrors
        }
      };
      
      Logger.debug(`Override validation completed in ${validationTime}ms with ${overallConfidence.toFixed(2)} confidence`);
      
      return result;
      
    } catch (error: any) {
      Logger.error('Override validation failed:', error);
      return this.createFailureResult(error, Date.now() - startTime);
    }
  }
  
  /**
   * Validate platform architecture override
   */
  private async validatePlatformArchitectureOverride(
    config: FlexibleSeedConfig,
    detectionResults: UnifiedDetectionResult,
    options: OverrideValidationOptions
  ): Promise<OverrideValidationResult['platformArchitecture']> {
    const override = config.detection?.platformArchitecture?.override;
    const detectedValue = detectionResults.architecture.architectureType;
    const detectionConfidence = detectionResults.architecture.confidence;
    
    if (!override) {
      // No override specified - validation passes
      return {
        hasOverride: false,
        detectedValue,
        conflictSeverity: 'none',
        recommendedAction: 'proceed',
        validation: {
          valid: true,
          confidence: 1.0,
          reasoning: ['No platform architecture override specified - using auto-detection'],
          warnings: []
        }
      };
    }
    
    Logger.debug(`Validating platform architecture override: ${override} vs detected: ${detectedValue}`);
    
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let conflictSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';
    let recommendedAction: 'proceed' | 'warn' | 'review' | 'reject' = 'proceed';
    let validationConfidence = 1.0;
    
    // Check for direct mismatch
    if (override !== detectedValue) {
      const confidenceGap = detectionConfidence - (config.detection?.platformArchitecture?.confidence || 0.5);
      
      if (detectionConfidence > 0.8 && confidenceGap > 0.3) {
        conflictSeverity = 'high';
        recommendedAction = options.strictMode ? 'reject' : 'review';
        validationConfidence = 0.3;
        warnings.push(`High-confidence detection (${(detectionConfidence * 100).toFixed(1)}%) conflicts with override`);
        reasoning.push(`Override '${override}' conflicts with high-confidence detection '${detectedValue}'`);
      } else if (detectionConfidence > 0.6) {
        conflictSeverity = 'medium';
        recommendedAction = 'warn';
        validationConfidence = 0.6;
        warnings.push(`Moderate-confidence detection conflicts with override`);
        reasoning.push(`Override '${override}' conflicts with detected '${detectedValue}' (${(detectionConfidence * 100).toFixed(1)}% confidence)`);
      } else {
        conflictSeverity = 'low';
        recommendedAction = 'proceed';
        validationConfidence = 0.8;
        reasoning.push(`Override '${override}' accepted - low detection confidence allows override`);
      }
    } else {
      // Override matches detection
      reasoning.push(`Override '${override}' matches detection result - validation passed`);
      validationConfidence = Math.min(1.0, detectionConfidence + 0.2); // Boost confidence when override matches
    }
    
    // Check for logical consistency with detected patterns
    if (this.isArchitectureLogicallyConsistent(override, detectionResults)) {
      reasoning.push(`Override is logically consistent with detected schema patterns`);
    } else {
      warnings.push(`Override may not be fully consistent with detected schema patterns`);
      validationConfidence *= 0.9;
    }
    
    const valid = recommendedAction !== 'reject' && (conflictSeverity !== 'high' || !options.strictMode);
    
    return {
      hasOverride: true,
      overrideValue: override,
      detectedValue,
      conflictSeverity,
      recommendedAction,
      validation: {
        valid,
        confidence: validationConfidence,
        reasoning,
        warnings
      }
    };
  }
  
  /**
   * Validate content domain override
   */
  private async validateContentDomainOverride(
    config: FlexibleSeedConfig,
    detectionResults: UnifiedDetectionResult,
    options: OverrideValidationOptions
  ): Promise<OverrideValidationResult['contentDomain']> {
    const override = config.detection?.contentDomain?.override;
    const detectedValue = detectionResults.domain.primaryDomain;
    const detectionConfidence = detectionResults.domain.confidence;
    
    if (!override) {
      // No override specified - validation passes
      return {
        hasOverride: false,
        detectedValue,
        conflictSeverity: 'none',
        recommendedAction: 'proceed',
        validation: {
          valid: true,
          confidence: 1.0,
          reasoning: ['No content domain override specified - using auto-detection'],
          warnings: []
        }
      };
    }
    
    Logger.debug(`Validating content domain override: ${override} vs detected: ${detectedValue}`);
    
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let conflictSeverity: 'none' | 'low' | 'medium' | 'high' = 'none';
    let recommendedAction: 'proceed' | 'warn' | 'review' | 'reject' = 'proceed';
    let validationConfidence = 1.0;
    
    // Check for direct mismatch
    if (override !== detectedValue) {
      const confidenceGap = detectionConfidence - (config.detection?.contentDomain?.confidence || 0.5);
      
      if (detectionConfidence > 0.8 && confidenceGap > 0.3) {
        conflictSeverity = 'high';
        recommendedAction = options.strictMode ? 'reject' : 'review';
        validationConfidence = 0.3;
        warnings.push(`High-confidence detection (${(detectionConfidence * 100).toFixed(1)}%) conflicts with override`);
        reasoning.push(`Override '${override}' conflicts with high-confidence detection '${detectedValue}'`);
      } else if (detectionConfidence > 0.6) {
        conflictSeverity = 'medium';
        recommendedAction = 'warn';
        validationConfidence = 0.6;
        warnings.push(`Moderate-confidence detection conflicts with override`);
        reasoning.push(`Override '${override}' conflicts with detected '${detectedValue}' (${(detectionConfidence * 100).toFixed(1)}% confidence)`);
      } else {
        conflictSeverity = 'low';
        recommendedAction = 'proceed';
        validationConfidence = 0.8;
        reasoning.push(`Override '${override}' accepted - low detection confidence allows override`);
      }
    } else {
      // Override matches detection
      reasoning.push(`Override '${override}' matches detection result - validation passed`);
      validationConfidence = Math.min(1.0, detectionConfidence + 0.2); // Boost confidence when override matches
    }
    
    // Validate domain-specific configurations if enabled
    if (options.validateDomainSpecific && config.detection?.contentDomain?.domainSpecific) {
      const domainSpecificValidation = this.validateDomainSpecificConfigurations(
        override,
        config.detection.contentDomain.domainSpecific,
        detectionResults
      );
      
      reasoning.push(...domainSpecificValidation.reasoning);
      warnings.push(...domainSpecificValidation.warnings);
      validationConfidence *= domainSpecificValidation.confidence;
    }
    
    // Check for logical consistency with detected patterns
    if (this.isDomainLogicallyConsistent(override, detectionResults)) {
      reasoning.push(`Override is logically consistent with detected schema patterns`);
    } else {
      warnings.push(`Override may not be fully consistent with detected schema patterns`);
      validationConfidence *= 0.9;
    }
    
    const valid = recommendedAction !== 'reject' && (conflictSeverity !== 'high' || !options.strictMode);
    
    return {
      hasOverride: true,
      overrideValue: override,
      detectedValue,
      conflictSeverity,
      recommendedAction,
      validation: {
        valid,
        confidence: validationConfidence,
        reasoning,
        warnings
      }
    };
  }
  
  /**
   * Validate domain-specific configurations
   */
  private validateDomainSpecificConfigurations(
    domain: ContentDomainType,
    domainSpecific: NonNullable<NonNullable<FlexibleSeedConfig['detection']>['contentDomain']>['domainSpecific'],
    detectionResults: UnifiedDetectionResult
  ): { reasoning: string[]; warnings: string[]; confidence: number } {
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;
    
    if (!domainSpecific) {
      return { reasoning, warnings, confidence };
    }
    
    const domainConfig = domainSpecific[domain as keyof typeof domainSpecific];
    if (!domainConfig) {
      return { reasoning, warnings, confidence };
    }
    
    switch (domain) {
      case 'outdoor': {
        const outdoorConfig = domainConfig as NonNullable<typeof domainSpecific>['outdoor'];
        if (outdoorConfig?.gearCategories && outdoorConfig.gearCategories.length > 0) {
          reasoning.push(`Outdoor domain configured with ${outdoorConfig.gearCategories.length} gear categories`);
          
          // Check if categories are realistic for outdoor domain
          const validOutdoorCategories = ['camping', 'hiking', 'climbing', 'backpacking', 'skiing', 'kayaking'];
          const invalidCategories = outdoorConfig.gearCategories.filter((cat: string) => 
            !validOutdoorCategories.includes(cat.toLowerCase())
          );
          
          if (invalidCategories.length > 0) {
            warnings.push(`Some gear categories may not be typical for outdoor domain: ${invalidCategories.join(', ')}`);
            confidence *= 0.9;
          }
        }
        
        if (outdoorConfig?.priceRange) {
          const { min, max } = outdoorConfig.priceRange;
          if (min < 0 || max < min) {
            warnings.push(`Invalid price range specified: ${min}-${max}`);
            confidence *= 0.8;
          } else if (max > 10000) {
            warnings.push(`Price range maximum (${max}) seems high for typical outdoor gear`);
            confidence *= 0.95;
          }
          reasoning.push(`Price range configured: $${min}-$${max}`);
        }
        break;
      }
        
      case 'saas': {
        const saasConfig = domainConfig as NonNullable<typeof domainSpecific>['saas'];
        if (saasConfig?.workspaceType) {
          reasoning.push(`SaaS domain configured for ${saasConfig.workspaceType} workspace`);
          
          // Validate workspace type consistency with platform architecture
          const detectedArchitecture = detectionResults.architecture.architectureType;
          if (saasConfig.workspaceType === 'team-collaboration' && detectedArchitecture === 'individual') {
            warnings.push(`Team collaboration workspace type may not match individual platform architecture`);
            confidence *= 0.8;
          }
        }
        break;
      }
        
      case 'ecommerce': {
        const ecommerceConfig = domainConfig as NonNullable<typeof domainSpecific>['ecommerce'];
        if (ecommerceConfig?.storeType) {
          reasoning.push(`E-commerce domain configured as ${ecommerceConfig.storeType} store`);
        }
        
        if (ecommerceConfig?.productCategories && ecommerceConfig.productCategories.length === 0) {
          warnings.push(`E-commerce domain specified but no product categories configured`);
          confidence *= 0.9;
        }
        break;
      }
        
      case 'social': {
        const socialConfig = domainConfig as NonNullable<typeof domainSpecific>['social'];
        if (socialConfig?.platformType) {
          reasoning.push(`Social domain configured as ${socialConfig.platformType} platform`);
        }
        
        if (socialConfig?.contentTypes && socialConfig.contentTypes.length === 0) {
          warnings.push(`Social domain specified but no content types configured`);
          confidence *= 0.9;
        }
        break;
      }
    }
    
    return { reasoning, warnings, confidence };
  }
  
  /**
   * Check if architecture override is logically consistent with detected patterns
   */
  private isArchitectureLogicallyConsistent(
    override: PlatformArchitectureType,
    detectionResults: UnifiedDetectionResult
  ): boolean {
    // Check for obvious inconsistencies based on schema patterns
    
    // Individual platforms typically have simpler schemas
    if (override === 'individual') {
      // Look for team-specific indicators that would contradict individual architecture
      const teamIndicators = detectionResults.integration.recommendations.filter(rec => 
        rec.toLowerCase().includes('team') || rec.toLowerCase().includes('collaboration')
      );
      
      return teamIndicators.length < 2; // Allow some team indicators but not many
    }
    
    // Team platforms typically have more complex multi-tenant features
    if (override === 'team') {
      // Look for individual-specific indicators that would contradict team architecture
      const individualIndicators = detectionResults.integration.recommendations.filter(rec => 
        rec.toLowerCase().includes('individual') || rec.toLowerCase().includes('personal')
      );
      
      return individualIndicators.length < 2; // Allow some individual indicators but not many
    }
    
    // Hybrid platforms should have mixed indicators
    if (override === 'hybrid') {
      return true; // Hybrid can accommodate most patterns
    }
    
    return true; // Default to consistent if we can't determine
  }
  
  /**
   * Check if domain override is logically consistent with detected patterns
   */
  private isDomainLogicallyConsistent(
    override: ContentDomainType,
    detectionResults: UnifiedDetectionResult
  ): boolean {
    // Check for domain-specific schema patterns
    
    // Outdoor domain should have gear/setup related tables
    if (override === 'outdoor') {
      const hasOutdoorPatterns = detectionResults.integration.recommendations.some(rec => 
        rec.toLowerCase().includes('gear') || 
        rec.toLowerCase().includes('outdoor') || 
        rec.toLowerCase().includes('setup')
      );
      
      return hasOutdoorPatterns || detectionResults.domain.confidence < 0.7; // Allow if detection isn't very confident
    }
    
    // SaaS domain should have subscription/billing patterns
    if (override === 'saas') {
      const hasSaaSPatterns = detectionResults.integration.recommendations.some(rec => 
        rec.toLowerCase().includes('subscription') || 
        rec.toLowerCase().includes('billing') || 
        rec.toLowerCase().includes('workspace')
      );
      
      return hasSaaSPatterns || detectionResults.domain.confidence < 0.7;
    }
    
    // E-commerce should have product/order patterns
    if (override === 'ecommerce') {
      const hasEcommercePatterns = detectionResults.integration.recommendations.some(rec => 
        rec.toLowerCase().includes('product') || 
        rec.toLowerCase().includes('order') || 
        rec.toLowerCase().includes('cart')
      );
      
      return hasEcommercePatterns || detectionResults.domain.confidence < 0.7;
    }
    
    return true; // Default to consistent if we can't determine
  }
  
  /**
   * Generate validation recommendations
   */
  private generateValidationRecommendations(
    platformValidation: OverrideValidationResult['platformArchitecture'],
    domainValidation: OverrideValidationResult['contentDomain'],
    options: OverrideValidationOptions
  ): string[] {
    const recommendations: string[] = [];
    
    // Platform architecture recommendations
    if (platformValidation.conflictSeverity === 'high') {
      recommendations.push(`Consider reviewing platform architecture override - high confidence detection suggests '${platformValidation.detectedValue}'`);
    } else if (platformValidation.conflictSeverity === 'medium') {
      recommendations.push(`Platform architecture override accepted but monitor seeding results for potential issues`);
    }
    
    // Content domain recommendations
    if (domainValidation.conflictSeverity === 'high') {
      recommendations.push(`Consider reviewing content domain override - high confidence detection suggests '${domainValidation.detectedValue}'`);
    } else if (domainValidation.conflictSeverity === 'medium') {
      recommendations.push(`Content domain override accepted but verify domain-specific features work as expected`);
    }
    
    // General recommendations
    if (platformValidation.conflictSeverity !== 'none' || domainValidation.conflictSeverity !== 'none') {
      recommendations.push(`Run seeding with --verbose flag to monitor override behavior`);
      recommendations.push(`Consider using fallbackToAutoDetection: true for safer override handling`);
    }
    
    if (options.strictMode && (platformValidation.conflictSeverity === 'high' || domainValidation.conflictSeverity === 'high')) {
      recommendations.push(`Disable strict mode or address high-severity conflicts before proceeding`);
    }
    
    return recommendations;
  }
  
  /**
   * Count total conflicts
   */
  private countConflicts(
    platformValidation: OverrideValidationResult['platformArchitecture'],
    domainValidation: OverrideValidationResult['contentDomain']
  ): number {
    let count = 0;
    
    if (platformValidation.conflictSeverity !== 'none') count++;
    if (domainValidation.conflictSeverity !== 'none') count++;
    
    return count;
  }
  
  /**
   * Count high-severity conflicts
   */
  private countHighSeverityConflicts(
    platformValidation: OverrideValidationResult['platformArchitecture'],
    domainValidation: OverrideValidationResult['contentDomain']
  ): number {
    let count = 0;
    
    if (platformValidation.conflictSeverity === 'high') count++;
    if (domainValidation.conflictSeverity === 'high') count++;
    
    return count;
  }
  
  /**
   * Get confidence level from score
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }
  
  /**
   * Create failure result
   */
  private createFailureResult(error: Error, executionTime: number): OverrideValidationResult {
    return {
      valid: false,
      confidence: 0,
      confidenceLevel: 'very_low',
      platformArchitecture: {
        hasOverride: false,
        conflictSeverity: 'high',
        recommendedAction: 'reject',
        validation: {
          valid: false,
          confidence: 0,
          reasoning: [],
          warnings: ['Validation failed due to error']
        }
      },
      contentDomain: {
        hasOverride: false,
        conflictSeverity: 'high',
        recommendedAction: 'reject',
        validation: {
          valid: false,
          confidence: 0,
          reasoning: [],
          warnings: ['Validation failed due to error']
        }
      },
      validation: {
        totalConflicts: 0,
        highSeverityConflicts: 0,
        validationTime: executionTime,
        validationMethod: 'error',
        recommendations: ['Fix validation errors before proceeding'],
        warnings: [`Validation error: ${error.message}`],
        errors: [error.message]
      }
    };
  }
  
  /**
   * Merge options with defaults
   */
  private mergeWithDefaults(options: Partial<OverrideValidationOptions>): OverrideValidationOptions {
    return {
      strictMode: false,
      warningLevel: 'detailed',
      confidenceThreshold: 0.7,
      validateDomainSpecific: true,
      checkConfigurationConsistency: true,
      suggestAutoFixes: true,
      ...options
    };
  }
}

/**
 * Utility functions for override validation
 */
export class OverrideValidationUtils {
  
  /**
   * Check if configuration has any manual overrides
   */
  static hasManualOverrides(config: FlexibleSeedConfig): boolean {
    return !!(
      config.detection?.platformArchitecture?.override ||
      config.detection?.contentDomain?.override
    );
  }
  
  /**
   * Extract override summary for logging
   */
  static getOverrideSummary(config: FlexibleSeedConfig): string {
    const overrides: string[] = [];
    
    if (config.detection?.platformArchitecture?.override) {
      overrides.push(`Platform: ${config.detection.platformArchitecture.override}`);
    }
    
    if (config.detection?.contentDomain?.override) {
      overrides.push(`Domain: ${config.detection.contentDomain.override}`);
    }
    
    return overrides.length > 0 ? overrides.join(', ') : 'None';
  }
  
  /**
   * Create default validation options
   */
  static getDefaultValidationOptions(): OverrideValidationOptions {
    return {
      strictMode: false,
      warningLevel: 'detailed',
      confidenceThreshold: 0.7,
      validateDomainSpecific: true,
      checkConfigurationConsistency: true,
      suggestAutoFixes: true
    };
  }
  
  /**
   * Format validation result for display
   */
  static formatValidationResult(result: OverrideValidationResult): string {
    const lines: string[] = [];
    
    lines.push('🔍 Override Validation Results');
    lines.push('─'.repeat(40));
    lines.push(`Overall Status: ${result.valid ? '✅ Valid' : '❌ Invalid'}`);
    lines.push(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    lines.push(`Total Conflicts: ${result.validation.totalConflicts}`);
    lines.push(`High Severity: ${result.validation.highSeverityConflicts}`);
    lines.push('');
    
    // Platform architecture section
    if (result.platformArchitecture.hasOverride) {
      lines.push('🏗️  Platform Architecture');
      lines.push(`Override: ${result.platformArchitecture.overrideValue}`);
      lines.push(`Detected: ${result.platformArchitecture.detectedValue}`);
      lines.push(`Conflict: ${result.platformArchitecture.conflictSeverity}`);
      lines.push(`Action: ${result.platformArchitecture.recommendedAction}`);
      lines.push('');
    }
    
    // Content domain section
    if (result.contentDomain.hasOverride) {
      lines.push('🎯 Content Domain');
      lines.push(`Override: ${result.contentDomain.overrideValue}`);
      lines.push(`Detected: ${result.contentDomain.detectedValue}`);
      lines.push(`Conflict: ${result.contentDomain.conflictSeverity}`);
      lines.push(`Action: ${result.contentDomain.recommendedAction}`);
      lines.push('');
    }
    
    // Recommendations
    if (result.validation.recommendations.length > 0) {
      lines.push('💡 Recommendations');
      result.validation.recommendations.forEach(rec => {
        lines.push(`• ${rec}`);
      });
      lines.push('');
    }
    
    // Warnings
    if (result.validation.warnings.length > 0) {
      lines.push('⚠️  Warnings');
      result.validation.warnings.forEach(warning => {
        lines.push(`• ${warning}`);
      });
    }
    
    return lines.join('\n');
  }
}

/**
 * Default override validation options
 */
export const DEFAULT_OVERRIDE_VALIDATION_OPTIONS: OverrideValidationOptions = {
  strictMode: false,
  warningLevel: 'detailed',
  confidenceThreshold: 0.7,
  validateDomainSpecific: true,
  checkConfigurationConsistency: true,
  suggestAutoFixes: true
};