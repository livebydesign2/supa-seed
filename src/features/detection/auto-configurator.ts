/**
 * Auto-Configuration System for Epic 2: Smart Platform Detection Engine
 * Generates platform-specific configurations based on detection results
 * Part of Task 2.3.1: Create auto-configurator system with platform-specific config generation
 */

import { Logger } from '../../core/utils/logger';
import type { FlexibleSeedConfig } from '../core/types/config-types';
import type {
  PlatformArchitectureType,
  ContentDomainType,
  ConfidenceLevel
} from './detection-types';

// Import UnifiedDetectionResult from detection-integration since it's defined there
import type { UnifiedDetectionResult } from './detection-integration';

/**
 * Auto-generated configuration result
 */
export interface AutoConfigurationResult {
  /** Generated configuration based on detection */
  configuration: Partial<FlexibleSeedConfig>;
  
  /** Confidence in the auto-configuration */
  confidence: number;
  
  /** Confidence level category */
  confidenceLevel: ConfidenceLevel;
  
  /** Reasoning for configuration choices */
  reasoning: string[];
  
  /** Warnings about configuration choices */
  warnings: string[];
  
  /** Detection results used for configuration */
  detectionResults: UnifiedDetectionResult;
  
  /** Configuration generation metrics */
  generationMetrics: {
    /** Time taken for configuration generation (ms) */
    executionTime: number;
    
    /** Number of configuration templates applied */
    templatesApplied: number;
    
    /** Configuration strategy used */
    strategyUsed: string;
  };
}

/**
 * Configuration template for specific platform/domain combinations
 */
export interface ConfigurationTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Platform architecture this template applies to */
  architecture: PlatformArchitectureType | 'any';
  
  /** Content domain this template applies to */
  domain: ContentDomainType | 'any';
  
  /** Minimum confidence required to apply template */
  minimumConfidence: number;
  
  /** Template priority (higher = more specific) */
  priority: number;
  
  /** Configuration overrides to apply */
  configurationOverrides: Partial<FlexibleSeedConfig>;
  
  /** Template application logic */
  shouldApply: (detection: UnifiedDetectionResult) => boolean;
  
  /** Custom configuration generation function */
  generateConfig?: (detection: UnifiedDetectionResult, baseConfig: Partial<FlexibleSeedConfig>) => Partial<FlexibleSeedConfig>;
}

/**
 * Auto-configuration generation strategies
 */
export type AutoConfigurationStrategy = 
  | 'comprehensive' // Full configuration with all detected features
  | 'minimal' // Minimal configuration with only essential settings
  | 'conservative' // Safe configuration with fallbacks
  | 'optimized'; // Performance-optimized configuration

/**
 * Auto-configuration system options
 */
export interface AutoConfigurationOptions {
  /** Configuration generation strategy */
  strategy: AutoConfigurationStrategy;
  
  /** Base configuration to extend */
  baseConfiguration?: Partial<FlexibleSeedConfig>;
  
  /** Whether to apply domain-specific extensions */
  enableDomainExtensions: boolean;
  
  /** Whether to apply architecture-specific optimizations */
  enableArchitectureOptimizations: boolean;
  
  /** Minimum confidence threshold for applying configurations */
  confidenceThreshold: number;
  
  /** Custom configuration templates to include */
  customTemplates?: ConfigurationTemplate[];
  
  /** Configuration overrides that take priority */
  configurationOverrides?: Partial<FlexibleSeedConfig>;
}

/**
 * Main Auto-Configuration System
 * Generates platform-specific configurations based on detection results
 */
export class AutoConfigurator {
  private configurationTemplates: ConfigurationTemplate[] = [];
  
  constructor() {
    this.initializeDefaultTemplates();
  }
  
  /**
   * Generate auto-configuration from detection results
   */
  async generateConfiguration(
    detectionResults: UnifiedDetectionResult,
    options: Partial<AutoConfigurationOptions> = {}
  ): Promise<AutoConfigurationResult> {
    const startTime = Date.now();
    
    // Merge options with defaults
    const fullOptions = this.mergeWithDefaults(options);
    
    Logger.info(`🔧 Generating auto-configuration with strategy: ${fullOptions.strategy}`);
    
    try {
      // Apply configuration generation strategy
      const configResult = await this.executeConfigurationStrategy(
        detectionResults,
        fullOptions,
        startTime
      );
      
      Logger.info(`🔧 Auto-configuration generated with ${configResult.confidence.toFixed(2)} confidence`);
      
      return configResult;
      
    } catch (error: any) {
      Logger.error('Auto-configuration generation failed:', error);
      
      // Return fallback configuration
      return this.createFallbackConfiguration(detectionResults, error, startTime);
    }
  }
  
  /**
   * Execute configuration generation based on strategy
   */
  private async executeConfigurationStrategy(
    detectionResults: UnifiedDetectionResult,
    options: AutoConfigurationOptions,
    startTime: number
  ): Promise<AutoConfigurationResult> {
    switch (options.strategy) {
      case 'comprehensive':
        return await this.generateComprehensiveConfiguration(detectionResults, options, startTime);
      case 'minimal':
        return await this.generateMinimalConfiguration(detectionResults, options, startTime);
      case 'conservative':
        return await this.generateConservativeConfiguration(detectionResults, options, startTime);
      case 'optimized':
        return await this.generateOptimizedConfiguration(detectionResults, options, startTime);
      default:
        return await this.generateComprehensiveConfiguration(detectionResults, options, startTime);
    }
  }
  
  /**
   * Generate comprehensive configuration with all detected features
   */
  private async generateComprehensiveConfiguration(
    detectionResults: UnifiedDetectionResult,
    options: AutoConfigurationOptions,
    startTime: number
  ): Promise<AutoConfigurationResult> {
    Logger.debug('🔧 Generating comprehensive auto-configuration');
    
    // Start with base configuration
    let configuration = { ...options.baseConfiguration } as Partial<FlexibleSeedConfig>;
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let templatesApplied = 0;
    
    // Apply architecture-specific configuration
    if (options.enableArchitectureOptimizations) {
      const archConfig = this.generateArchitectureConfiguration(detectionResults.architecture);
      configuration = { ...configuration, ...archConfig.config };
      reasoning.push(...archConfig.reasoning);
      warnings.push(...archConfig.warnings);
    }
    
    // Apply domain-specific configuration
    if (options.enableDomainExtensions) {
      const domainConfig = this.generateDomainConfiguration(detectionResults.domain);
      configuration = { ...configuration, ...domainConfig.config };
      reasoning.push(...domainConfig.reasoning);
      warnings.push(...domainConfig.warnings);
    }
    
    // Apply configuration templates
    const applicableTemplates = this.getApplicableTemplates(detectionResults, options.confidenceThreshold);
    for (const template of applicableTemplates) {
      if (template.generateConfig) {
        const templateConfig = template.generateConfig(detectionResults, configuration);
        configuration = { ...configuration, ...templateConfig };
      } else {
        configuration = { ...configuration, ...template.configurationOverrides };
      }
      templatesApplied++;
      reasoning.push(`Applied ${template.name} template for ${template.architecture}/${template.domain} platform`);
    }
    
    // Apply configuration overrides
    if (options.configurationOverrides) {
      configuration = { ...configuration, ...options.configurationOverrides };
      reasoning.push('Applied manual configuration overrides');
    }
    
    // Calculate overall confidence
    const overallConfidence = this.calculateConfigurationConfidence(detectionResults, configuration);
    
    // Add comprehensive configuration reasoning
    reasoning.unshift(`Comprehensive configuration generated for ${detectionResults.architecture.architectureType}/${detectionResults.domain.primaryDomain} platform`);
    reasoning.push(`Configuration confidence: ${overallConfidence.toFixed(2)} based on detection results`);
    
    const executionTime = Date.now() - startTime;
    
    return {
      configuration,
      confidence: overallConfidence,
      confidenceLevel: this.getConfidenceLevel(overallConfidence),
      reasoning,
      warnings,
      detectionResults,
      generationMetrics: {
        executionTime,
        templatesApplied,
        strategyUsed: 'comprehensive'
      }
    };
  }
  
  /**
   * Generate minimal configuration with only essential settings
   */
  private async generateMinimalConfiguration(
    detectionResults: UnifiedDetectionResult,
    options: AutoConfigurationOptions,
    startTime: number
  ): Promise<AutoConfigurationResult> {
    Logger.debug('🔧 Generating minimal auto-configuration');
    
    // Start with base configuration
    let configuration = { ...options.baseConfiguration } as Partial<FlexibleSeedConfig>;
    const reasoning: string[] = [];
    const warnings: string[] = [];
    
    // Apply only essential architecture settings
    const essentialArchConfig = this.generateEssentialArchitectureConfiguration(detectionResults.architecture);
    configuration = { ...configuration, ...essentialArchConfig.config };
    reasoning.push(...essentialArchConfig.reasoning);
    
    // Apply only essential domain settings
    const essentialDomainConfig = this.generateEssentialDomainConfiguration(detectionResults.domain);
    configuration = { ...configuration, ...essentialDomainConfig.config };
    reasoning.push(...essentialDomainConfig.reasoning);
    
    // Apply configuration overrides
    if (options.configurationOverrides) {
      configuration = { ...configuration, ...options.configurationOverrides };
      reasoning.push('Applied manual configuration overrides');
    }
    
    const overallConfidence = this.calculateConfigurationConfidence(detectionResults, configuration);
    reasoning.unshift(`Minimal configuration generated for ${detectionResults.architecture.architectureType}/${detectionResults.domain.primaryDomain} platform`);
    warnings.push('Minimal configuration mode - some features may not be optimally configured');
    
    const executionTime = Date.now() - startTime;
    
    return {
      configuration,
      confidence: overallConfidence * 0.9, // Slightly lower confidence for minimal config
      confidenceLevel: this.getConfidenceLevel(overallConfidence * 0.9),
      reasoning,
      warnings,
      detectionResults,
      generationMetrics: {
        executionTime,
        templatesApplied: 0,
        strategyUsed: 'minimal'
      }
    };
  }
  
  /**
   * Generate conservative configuration with safe fallbacks
   */
  private async generateConservativeConfiguration(
    detectionResults: UnifiedDetectionResult,
    options: AutoConfigurationOptions,
    startTime: number
  ): Promise<AutoConfigurationResult> {
    Logger.debug('🔧 Generating conservative auto-configuration');
    
    // Use conservative approach - only apply high-confidence configurations
    let configuration = { ...options.baseConfiguration } as Partial<FlexibleSeedConfig>;
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let templatesApplied = 0;
    
    // Only apply architecture configuration if confidence is high
    if (detectionResults.architecture.confidence > 0.8) {
      const archConfig = this.generateArchitectureConfiguration(detectionResults.architecture);
      configuration = { ...configuration, ...archConfig.config };
      reasoning.push(...archConfig.reasoning);
    } else {
      warnings.push('Architecture confidence too low for automatic configuration - using defaults');
    }
    
    // Only apply domain configuration if confidence is high
    if (detectionResults.domain.confidence > 0.8) {
      const domainConfig = this.generateDomainConfiguration(detectionResults.domain);
      configuration = { ...configuration, ...domainConfig.config };
      reasoning.push(...domainConfig.reasoning);
    } else {
      warnings.push('Domain confidence too low for automatic configuration - using generic settings');
      // Apply generic domain configuration
      configuration.domain = 'generic';
    }
    
    // Only apply high-confidence templates
    const highConfidenceTemplates = this.getApplicableTemplates(detectionResults, 0.8);
    for (const template of highConfidenceTemplates) {
      configuration = { ...configuration, ...template.configurationOverrides };
      templatesApplied++;
      reasoning.push(`Applied high-confidence ${template.name} template`);
    }
    
    // Apply configuration overrides
    if (options.configurationOverrides) {
      configuration = { ...configuration, ...options.configurationOverrides };
      reasoning.push('Applied manual configuration overrides');
    }
    
    const overallConfidence = Math.min(this.calculateConfigurationConfidence(detectionResults, configuration), 0.9);
    reasoning.unshift(`Conservative configuration generated with high-confidence requirements`);
    
    const executionTime = Date.now() - startTime;
    
    return {
      configuration,
      confidence: overallConfidence,
      confidenceLevel: this.getConfidenceLevel(overallConfidence),
      reasoning,
      warnings,
      detectionResults,
      generationMetrics: {
        executionTime,
        templatesApplied,
        strategyUsed: 'conservative'
      }
    };
  }
  
  /**
   * Generate optimized configuration for performance
   */
  private async generateOptimizedConfiguration(
    detectionResults: UnifiedDetectionResult,
    options: AutoConfigurationOptions,
    startTime: number
  ): Promise<AutoConfigurationResult> {
    Logger.debug('🔧 Generating optimized auto-configuration');
    
    // Start with comprehensive configuration and optimize
    const comprehensiveResult = await this.generateComprehensiveConfiguration(detectionResults, options, startTime);
    
    // Apply performance optimizations
    let configuration = { ...comprehensiveResult.configuration };
    const reasoning = [...comprehensiveResult.reasoning];
    const warnings = [...comprehensiveResult.warnings];
    
    // Optimize user count based on platform architecture
    const optimizedUserCount = this.getOptimizedUserCount(detectionResults.architecture.architectureType);
    if (configuration.userCount !== optimizedUserCount) {
      configuration.userCount = optimizedUserCount;
      reasoning.push(`Optimized user count to ${optimizedUserCount} for ${detectionResults.architecture.architectureType} architecture`);
    }
    
    // Optimize seeding parameters based on domain
    const optimizedParams = this.getOptimizedSeedingParams(detectionResults.domain.primaryDomain);
    configuration.setupsPerUser = optimizedParams.setupsPerUser;
    configuration.imagesPerSetup = optimizedParams.imagesPerSetup;
    reasoning.push(`Optimized seeding parameters for ${detectionResults.domain.primaryDomain} domain`);
    
    // Add caching optimizations
    if (configuration.schema?.frameworkStrategy) {
      configuration.schema.frameworkStrategy.enableConstraintHandling = true;
      configuration.schema.frameworkStrategy.enableRLSCompliance = true;
      reasoning.push('Enabled framework strategy optimizations for better performance');
    }
    
    reasoning.unshift('Performance-optimized configuration generated based on platform detection');
    
    const executionTime = Date.now() - startTime;
    
    return {
      configuration,
      confidence: comprehensiveResult.confidence,
      confidenceLevel: comprehensiveResult.confidenceLevel,
      reasoning,
      warnings,
      detectionResults,
      generationMetrics: {
        executionTime,
        templatesApplied: comprehensiveResult.generationMetrics.templatesApplied,
        strategyUsed: 'optimized'
      }
    };
  }
  
  /**
   * Generate architecture-specific configuration
   */
  private generateArchitectureConfiguration(architectureResult: any): {
    config: Partial<FlexibleSeedConfig>;
    reasoning: string[];
    warnings: string[];
  } {
    const config: Partial<FlexibleSeedConfig> = {};
    const reasoning: string[] = [];
    const warnings: string[] = [];
    
    switch (architectureResult.architectureType) {
      case 'individual':
        // Individual creator configuration
        config.userCount = Math.max(config.userCount || 5, 3);
        config.setupsPerUser = Math.max(config.setupsPerUser || 2, 2);
        config.createTeamAccounts = false;
        if (config.schema) {
          config.schema.multiTenant = {
            enabled: false,
            tenantColumn: 'user_id',
            tenantScopeDetection: 'auto',
            validationEnabled: true,
            strictIsolation: false,
            allowSharedResources: true,
            dataGeneration: {
              generatePersonalAccounts: true,
              generateTeamAccounts: false,
              personalAccountRatio: 1.0,
              dataDistributionStrategy: 'even',
              crossTenantDataAllowed: true,
              sharedResourcesEnabled: true,
              accountTypes: [
                {
                  type: 'personal',
                  weight: 1.0,
                  settings: {
                    defaultPlan: 'free',
                    features: ['content_creation', 'sharing']
                  }
                }
              ],
              minUsersPerTenant: 1,
              maxUsersPerTenant: 1,
              minProjectsPerTenant: 1,
              maxProjectsPerTenant: 5,
              allowCrossTenantRelationships: false,
              sharedTables: [],
              respectTenantPlans: false,
              enforceTenantLimits: false
            }
          };
        }
        reasoning.push('Configured for individual creator platform with personal content focus');
        break;
        
      case 'team':
        // Team collaboration configuration
        config.userCount = Math.max(config.userCount || 8, 6);
        config.setupsPerUser = Math.max(config.setupsPerUser || 1, 1);
        config.createTeamAccounts = true;
        if (config.schema) {
          config.schema.multiTenant = {
            enabled: true,
            tenantColumn: 'account_id',
            tenantScopeDetection: 'auto',
            validationEnabled: true,
            strictIsolation: true,
            allowSharedResources: false,
            dataGeneration: {
              generatePersonalAccounts: false,
              generateTeamAccounts: true,
              personalAccountRatio: 0.2,
              dataDistributionStrategy: 'realistic',
              crossTenantDataAllowed: false,
              sharedResourcesEnabled: false,
              accountTypes: [
                {
                  type: 'team',
                  weight: 0.7,
                  settings: {
                    minMembers: 2,
                    maxMembers: 5,
                    defaultPlan: 'pro',
                    features: ['collaboration', 'team_management']
                  }
                },
                {
                  type: 'organization',
                  weight: 0.3,
                  settings: {
                    minMembers: 3,
                    maxMembers: 10,
                    defaultPlan: 'enterprise',
                    features: ['advanced_collaboration', 'admin_controls']
                  }
                }
              ],
              minUsersPerTenant: 2,
              maxUsersPerTenant: 8,
              minProjectsPerTenant: 1,
              maxProjectsPerTenant: 3,
              allowCrossTenantRelationships: false,
              sharedTables: [],
              respectTenantPlans: true,
              enforceTenantLimits: true
            }
          };
        }
        reasoning.push('Configured for team collaboration platform with multi-tenant isolation');
        break;
        
      case 'hybrid':
        // Hybrid platform configuration
        config.userCount = Math.max(config.userCount || 10, 8);
        config.setupsPerUser = Math.max(config.setupsPerUser || 2, 1);
        config.createTeamAccounts = true;
        if (config.schema) {
          config.schema.multiTenant = {
            enabled: true,
            tenantColumn: 'account_id',
            tenantScopeDetection: 'auto',
            validationEnabled: true,
            strictIsolation: false,
            allowSharedResources: true,
            dataGeneration: {
              generatePersonalAccounts: true,
              generateTeamAccounts: true,
              personalAccountRatio: 0.6,
              dataDistributionStrategy: 'realistic',
              crossTenantDataAllowed: true,
              sharedResourcesEnabled: true,
              accountTypes: [
                {
                  type: 'personal',
                  weight: 0.6,
                  settings: {
                    defaultPlan: 'free',
                    features: ['content_creation', 'sharing']
                  }
                },
                {
                  type: 'team',
                  weight: 0.4,
                  settings: {
                    minMembers: 2,
                    maxMembers: 4,
                    defaultPlan: 'pro',
                    features: ['collaboration', 'team_management']
                  }
                }
              ],
              minUsersPerTenant: 1,
              maxUsersPerTenant: 6,
              minProjectsPerTenant: 1,
              maxProjectsPerTenant: 4,
              allowCrossTenantRelationships: true,
              sharedTables: ['categories'],
              respectTenantPlans: true,
              enforceTenantLimits: false
            }
          };
        }
        reasoning.push('Configured for hybrid platform supporting both individual and team usage');
        break;
    }
    
    return { config, reasoning, warnings };
  }
  
  /**
   * Generate domain-specific configuration
   */
  private generateDomainConfiguration(domainResult: any): {
    config: Partial<FlexibleSeedConfig>;
    reasoning: string[];
    warnings: string[];
  } {
    const config: Partial<FlexibleSeedConfig> = {};
    const reasoning: string[] = [];
    const warnings: string[] = [];
    
    // Set domain in configuration
    config.domain = domainResult.primaryDomain;
    
    switch (domainResult.primaryDomain) {
      case 'outdoor':
        // Outdoor domain configuration
        config.enableRealImages = true;
        config.imagesPerSetup = Math.max(config.imagesPerSetup || 3, 2);
        if (config.storage) {
          config.storage.buckets = {
            setupImages: 'setup-images',
            gearImages: 'gear-images',
            profileImages: 'profile-images'
          };
        }
        reasoning.push('Configured for outdoor domain with gear-focused image generation');
        break;
        
      case 'saas':
        // SaaS domain configuration
        config.enableRealImages = false; // Focus on productivity content over images
        config.imagesPerSetup = Math.min(config.imagesPerSetup || 1, 1);
        config.createTeamAccounts = true;
        reasoning.push('Configured for SaaS domain with productivity focus and team accounts');
        break;
        
      case 'ecommerce':
        // E-commerce domain configuration
        config.enableRealImages = true;
        config.imagesPerSetup = Math.max(config.imagesPerSetup || 4, 3);
        config.setupsPerUser = Math.max(config.setupsPerUser || 3, 2); // Products per user
        reasoning.push('Configured for e-commerce domain with product-focused content generation');
        break;
        
      case 'social':
        // Social domain configuration
        config.enableRealImages = true;
        config.imagesPerSetup = Math.max(config.imagesPerSetup || 2, 1);
        config.userCount = Math.max(config.userCount || 12, 8); // More users for social interactions
        reasoning.push('Configured for social domain with user interaction focus');
        break;
        
      case 'generic':
        // Generic domain configuration
        config.enableRealImages = false;
        config.imagesPerSetup = config.imagesPerSetup || 1;
        reasoning.push('Configured for generic domain with basic content generation');
        warnings.push('Generic domain detected - configuration may not be optimally tailored');
        break;
    }
    
    return { config, reasoning, warnings };
  }
  
  /**
   * Generate essential architecture configuration (minimal mode)
   */
  private generateEssentialArchitectureConfiguration(architectureResult: any): {
    config: Partial<FlexibleSeedConfig>;
    reasoning: string[];
  } {
    const config: Partial<FlexibleSeedConfig> = {};
    const reasoning: string[] = [];
    
    // Only set essential architecture-specific settings
    switch (architectureResult.architectureType) {
      case 'individual':
        config.createTeamAccounts = false;
        reasoning.push('Disabled team accounts for individual architecture');
        break;
      case 'team':
        config.createTeamAccounts = true;
        reasoning.push('Enabled team accounts for team architecture');
        break;
      case 'hybrid':
        config.createTeamAccounts = true;
        reasoning.push('Enabled team accounts for hybrid architecture flexibility');
        break;
    }
    
    return { config, reasoning };
  }
  
  /**
   * Generate essential domain configuration (minimal mode)
   */
  private generateEssentialDomainConfiguration(domainResult: any): {
    config: Partial<FlexibleSeedConfig>;
    reasoning: string[];
  } {
    const config: Partial<FlexibleSeedConfig> = {};
    const reasoning: string[] = [];
    
    // Only set essential domain setting
    config.domain = domainResult.primaryDomain;
    reasoning.push(`Set domain to ${domainResult.primaryDomain}`);
    
    return { config, reasoning };
  }
  
  /**
   * Get applicable configuration templates
   */
  private getApplicableTemplates(
    detectionResults: UnifiedDetectionResult,
    confidenceThreshold: number
  ): ConfigurationTemplate[] {
    return this.configurationTemplates
      .filter(template => {
        // Check confidence threshold
        if (detectionResults.integration.overallConfidence < template.minimumConfidence) {
          return false;
        }
        
        // Check architecture match
        if (template.architecture !== 'any' && 
            template.architecture !== detectionResults.architecture.architectureType) {
          return false;
        }
        
        // Check domain match
        if (template.domain !== 'any' && 
            template.domain !== detectionResults.domain.primaryDomain) {
          return false;
        }
        
        // Check custom application logic
        if (!template.shouldApply(detectionResults)) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority); // Sort by priority (higher first)
  }
  
  /**
   * Calculate configuration confidence based on detection results
   */
  private calculateConfigurationConfidence(
    detectionResults: UnifiedDetectionResult,
    configuration: Partial<FlexibleSeedConfig>
  ): number {
    // Base confidence on overall detection confidence
    let confidence = detectionResults.integration.overallConfidence;
    
    // Adjust based on configuration completeness
    const configCompleteness = this.assessConfigurationCompleteness(configuration);
    confidence *= configCompleteness;
    
    // Adjust based on detection agreement
    if (detectionResults.integration.crossValidation.overallAgreement > 0.8) {
      confidence *= 1.1; // Boost for high agreement
    } else if (detectionResults.integration.crossValidation.overallAgreement < 0.5) {
      confidence *= 0.9; // Reduce for low agreement
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Assess configuration completeness
   */
  private assessConfigurationCompleteness(configuration: Partial<FlexibleSeedConfig>): number {
    let completeness = 0;
    let totalChecks = 0;
    
    // Check essential fields
    const essentialFields = ['userCount', 'setupsPerUser', 'domain'];
    for (const field of essentialFields) {
      totalChecks++;
      if (configuration[field as keyof FlexibleSeedConfig] !== undefined) {
        completeness++;
      }
    }
    
    // Check schema configuration
    totalChecks++;
    if (configuration.schema) {
      completeness++;
    }
    
    // Check storage configuration
    totalChecks++;
    if (configuration.storage) {
      completeness++;
    }
    
    return totalChecks > 0 ? completeness / totalChecks : 0.5;
  }
  
  /**
   * Get optimized user count for architecture type
   */
  private getOptimizedUserCount(architectureType: PlatformArchitectureType): number {
    switch (architectureType) {
      case 'individual': return 5; // Small number for individual focus
      case 'team': return 8; // Medium number for team testing
      case 'hybrid': return 10; // Larger number for mixed scenarios
      default: return 6;
    }
  }
  
  /**
   * Get optimized seeding parameters for domain
   */
  private getOptimizedSeedingParams(domain: ContentDomainType): {
    setupsPerUser: number;
    imagesPerSetup: number;
  } {
    switch (domain) {
      case 'outdoor':
        return { setupsPerUser: 2, imagesPerSetup: 3 }; // Gear setups with images
      case 'saas':
        return { setupsPerUser: 1, imagesPerSetup: 1 }; // Focus on functionality over content
      case 'ecommerce':
        return { setupsPerUser: 3, imagesPerSetup: 4 }; // Products with multiple images
      case 'social':
        return { setupsPerUser: 2, imagesPerSetup: 2 }; // Social posts with media
      case 'generic':
        return { setupsPerUser: 2, imagesPerSetup: 1 }; // Basic content
      default:
        return { setupsPerUser: 2, imagesPerSetup: 2 };
    }
  }
  
  /**
   * Get confidence level from confidence score
   */
  private getConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }
  
  /**
   * Create fallback configuration when generation fails
   */
  private createFallbackConfiguration(
    detectionResults: UnifiedDetectionResult,
    error: Error,
    startTime: number
  ): AutoConfigurationResult {
    return {
      configuration: {
        userCount: 5,
        setupsPerUser: 2,
        imagesPerSetup: 1,
        domain: 'generic',
        enableRealImages: false,
        createTeamAccounts: false
      },
      confidence: 0.3,
      confidenceLevel: 'low',
      reasoning: ['Auto-configuration failed - using fallback settings'],
      warnings: ['Configuration generation failed - using minimal safe defaults'],
      detectionResults,
      generationMetrics: {
        executionTime: Date.now() - startTime,
        templatesApplied: 0,
        strategyUsed: 'fallback'
      }
    };
  }
  
  /**
   * Merge options with defaults
   */
  private mergeWithDefaults(options: Partial<AutoConfigurationOptions>): AutoConfigurationOptions {
    return {
      strategy: 'comprehensive',
      enableDomainExtensions: true,
      enableArchitectureOptimizations: true,
      confidenceThreshold: 0.6,
      ...options
    };
  }
  
  /**
   * Initialize default configuration templates
   */
  private initializeDefaultTemplates(): void {
    this.configurationTemplates = [
      // Outdoor Individual Template
      {
        id: 'outdoor_individual',
        name: 'Outdoor Individual Creator',
        description: 'Configuration for individual outdoor gear platforms',
        architecture: 'individual',
        domain: 'outdoor',
        minimumConfidence: 0.7,
        priority: 10,
        configurationOverrides: {
          userCount: 4,
          setupsPerUser: 3,
          imagesPerSetup: 3,
          enableRealImages: true,
          emailDomain: 'wildernest.test'
        },
        shouldApply: (detection) => 
          detection.architecture.architectureType === 'individual' && 
          detection.domain.primaryDomain === 'outdoor'
      },
      
      // SaaS Team Template
      {
        id: 'saas_team',
        name: 'SaaS Team Platform',
        description: 'Configuration for team-based SaaS platforms',
        architecture: 'team',
        domain: 'saas',
        minimumConfidence: 0.7,
        priority: 10,
        configurationOverrides: {
          userCount: 8,
          setupsPerUser: 1,
          imagesPerSetup: 1,
          enableRealImages: false,
          createTeamAccounts: true,
          emailDomain: 'saas.test'
        },
        shouldApply: (detection) => 
          detection.architecture.architectureType === 'team' && 
          detection.domain.primaryDomain === 'saas'
      },
      
      // E-commerce Hybrid Template
      {
        id: 'ecommerce_hybrid',
        name: 'E-commerce Hybrid Platform',
        description: 'Configuration for hybrid e-commerce platforms',
        architecture: 'hybrid',
        domain: 'ecommerce',
        minimumConfidence: 0.6,
        priority: 8,
        configurationOverrides: {
          userCount: 10,
          setupsPerUser: 3,
          imagesPerSetup: 4,
          enableRealImages: true,
          createTeamAccounts: true,
          emailDomain: 'ecommerce.test'
        },
        shouldApply: (detection) => 
          detection.architecture.architectureType === 'hybrid' && 
          detection.domain.primaryDomain === 'ecommerce'
      },
      
      // Generic High-Confidence Template
      {
        id: 'generic_high_confidence',
        name: 'High-Confidence Generic Platform',
        description: 'Configuration for well-detected generic platforms',
        architecture: 'any',
        domain: 'generic',
        minimumConfidence: 0.8,
        priority: 5,
        configurationOverrides: {
          userCount: 6,
          setupsPerUser: 2,
          imagesPerSetup: 1,
          enableRealImages: false
        },
        shouldApply: (detection) => 
          detection.integration.overallConfidence > 0.8
      }
    ];
  }
}

/**
 * Default auto-configuration options
 */
export const DEFAULT_AUTO_CONFIGURATION_OPTIONS: AutoConfigurationOptions = {
  strategy: 'comprehensive',
  enableDomainExtensions: true,
  enableArchitectureOptimizations: true,
  confidenceThreshold: 0.6
};