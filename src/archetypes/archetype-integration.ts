/**
 * Archetype Integration with Platform Detection for SupaSeed v2.5.0
 * Implements Task 4.1.5: Integrate archetypes with existing platform detection
 * Connects archetype system with platform architecture and domain detection
 */

import { Logger } from '../utils/logger';
import { ArchetypeManager } from './archetype-manager';
import { BehaviorPatternEngine } from './behavior-patterns';
import { INDIVIDUAL_CREATOR_COLLECTION, getCustomizedArchetype } from './individual-archetypes';
import type { 
  UserArchetype, 
  ArchetypeGenerationConfig,
  ArchetypeApplicationResult,
  ArchetypeCollection
} from './archetype-types';
import type { 
  PlatformArchitectureType, 
  ContentDomainType 
} from '../detection/detection-types';

// Import detection integration if available
import type { UnifiedDetectionResult } from '../detection/detection-integration';

/**
 * Platform-aware archetype selection result
 */
export interface PlatformArchetypeResult {
  /** Selected platform architecture */
  detectedArchitecture: PlatformArchitectureType;
  
  /** Selected content domain */
  detectedDomain: ContentDomainType;
  
  /** Selected archetypes for the platform */
  selectedArchetypes: UserArchetype[];
  
  /** Generation configuration optimized for platform */
  optimizedConfig: ArchetypeGenerationConfig;
  
  /** Platform compatibility assessment */
  compatibility: {
    fullCompatibility: UserArchetype[];
    partialCompatibility: UserArchetype[];
    limitedCompatibility: UserArchetype[];
  };
  
  /** Recommendations for archetype usage */
  recommendations: {
    primary: UserArchetype[];
    secondary: UserArchetype[];
    avoid: UserArchetype[];
  };
}

/**
 * Archetype generation context with platform awareness
 */
export interface ArchetypeGenerationContext {
  /** Platform detection results */
  platformContext: {
    architecture: PlatformArchitectureType;
    domain: ContentDomainType;
    confidence: number;
    evidenceStrength: 'strong' | 'moderate' | 'weak';
  };
  
  /** User preferences and overrides */
  userPreferences: {
    preferredArchetypes?: string[];
    excludedArchetypes?: string[];
    customWeights?: Record<string, number>;
    focusAreas?: string[];
  };
  
  /** Generation constraints */
  constraints: {
    maxUsers: number;
    minUsers: number;
    experienceLevelLimits?: Record<string, number>;
    contentFocusAreas?: string[];
  };
  
  /** Domain-specific customizations */
  domainCustomizations?: {
    enableCustomContent: boolean;
    customContentTypes?: string[];
    specialBehaviors?: Record<string, any>;
  };
}

/**
 * Integrated archetype and platform detection manager
 */
export class ArchetypeIntegrationManager {
  private archetypeManager: ArchetypeManager;
  private behaviorEngine: BehaviorPatternEngine;
  private platformCache: Map<string, PlatformArchetypeResult> = new Map();

  constructor() {
    this.archetypeManager = new ArchetypeManager();
    this.behaviorEngine = new BehaviorPatternEngine();
    
    // Initialize with individual creator collection
    this.archetypeManager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
    
    Logger.debug('ArchetypeIntegrationManager initialized with individual creator archetypes');
  }

  /**
   * Select optimal archetypes based on platform detection results
   */
  selectArchetypesForPlatform(
    detectionResult: UnifiedDetectionResult | { architecture: PlatformArchitectureType; domain: ContentDomainType }
  ): PlatformArchetypeResult {
    const architecture = 'architecture' in detectionResult && detectionResult.architecture?.detectedArchitecture 
      ? detectionResult.architecture.detectedArchitecture 
      : (detectionResult as any).architecture;
    
    const domain = 'domain' in detectionResult && detectionResult.domain?.detectedDomain 
      ? detectionResult.domain.detectedDomain 
      : (detectionResult as any).domain;

    Logger.info(`Selecting archetypes for platform: ${architecture} + ${domain}`);

    // Get compatible archetypes
    const compatibleArchetypes = this.archetypeManager.getCompatibleArchetypes(architecture, domain, true);
    
    // Categorize by compatibility level
    const compatibility = this.categorizeArchetypeCompatibility(compatibleArchetypes, architecture, domain);
    
    // Generate platform-optimized configuration
    const optimizedConfig = this.generatePlatformOptimizedConfig(architecture, domain, compatibility);
    
    // Select recommended archetypes
    const recommendations = this.generateArchetypeRecommendations(compatibility, architecture, domain);
    
    // Select final archetypes for generation
    const selectedArchetypes = this.selectFinalArchetypes(recommendations, optimizedConfig);

    const result: PlatformArchetypeResult = {
      detectedArchitecture: architecture,
      detectedDomain: domain,
      selectedArchetypes,
      optimizedConfig,
      compatibility,
      recommendations
    };

    // Cache result for performance
    const cacheKey = `${architecture}_${domain}`;
    this.platformCache.set(cacheKey, result);

    Logger.debug(`Selected ${selectedArchetypes.length} archetypes for ${architecture}/${domain} platform`, {
      primary: recommendations.primary.length,
      secondary: recommendations.secondary.length,
      avoided: recommendations.avoid.length
    });

    return result;
  }

  /**
   * Generate users with platform-aware archetype selection
   */
  generateUsersForPlatform(
    context: ArchetypeGenerationContext,
    userCount: number = 10
  ): ArchetypeApplicationResult[] {
    Logger.info(`Generating ${userCount} users for ${context.platformContext.architecture}/${context.platformContext.domain} platform`);

    // Select appropriate archetypes for the platform
    const platformResult = this.selectArchetypesForPlatform({
      architecture: context.platformContext.architecture,
      domain: context.platformContext.domain
    });

    // Apply user preferences and constraints
    const finalArchetypes = this.applyUserPreferences(platformResult.selectedArchetypes, context.userPreferences);
    const constrainedArchetypes = this.applyConstraints(finalArchetypes, context.constraints);

    // Generate users with selected archetypes
    const results: ArchetypeApplicationResult[] = [];
    const usersPerArchetype = Math.ceil(userCount / constrainedArchetypes.length);

    for (const archetype of constrainedArchetypes) {
      // Apply domain customizations
      const customizedArchetype = context.domainCustomizations?.enableCustomContent
        ? this.applyDomainCustomizations(archetype, context.platformContext.domain, context.domainCustomizations)
        : getCustomizedArchetype(archetype, context.platformContext.domain);

      // Generate users for this archetype
      const archetypeUserCount = Math.min(usersPerArchetype, userCount - results.length);
      
      for (let i = 0; i < archetypeUserCount; i++) {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const result = this.archetypeManager.generateUserFromArchetype(
          customizedArchetype,
          `${context.platformContext.architecture}_${context.platformContext.domain}_${i}`
        );
        
        // Enhance with platform-specific behavior patterns
        result.userData = this.enhanceWithPlatformBehaviors(result.userData, customizedArchetype, context);
        
        results.push(result);
      }

      if (results.length >= userCount) break;
    }

    Logger.info(`Generated ${results.length} users with platform-aware archetypes`);
    return results;
  }

  /**
   * Get archetype recommendations for specific platform
   */
  getArchetypeRecommendations(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType
  ): {
    recommended: UserArchetype[];
    optional: UserArchetype[];
    considerations: string[];
  } {
    const platformResult = this.selectArchetypesForPlatform({ architecture, domain });
    
    const considerations = [];
    
    // Add platform-specific considerations
    if (architecture === 'individual') {
      considerations.push('Focus on content creators and discoverers for individual platforms');
      considerations.push('Consider expert archetypes for guidance and community building');
    } else if (architecture === 'team') {
      considerations.push('Emphasize collaboration and team-focused archetypes');
      considerations.push('Include team admin and coordinator roles');
    } else if (architecture === 'hybrid') {
      considerations.push('Balance individual creators with team collaboration features');
      considerations.push('Include mixed archetype patterns for diverse usage scenarios');
    }

    // Add domain-specific considerations
    if (domain === 'outdoor') {
      considerations.push('Include safety-conscious and experience-sharing archetypes');
      considerations.push('Focus on location and gear-focused content patterns');
    } else if (domain === 'saas') {
      considerations.push('Emphasize productivity and workflow optimization archetypes');
      considerations.push('Include power users and business-focused patterns');
    } else if (domain === 'ecommerce') {
      considerations.push('Include review and recommendation-focused archetypes');
      considerations.push('Consider business owner and customer service patterns');
    }

    return {
      recommended: platformResult.recommendations.primary,
      optional: platformResult.recommendations.secondary,
      considerations
    };
  }

  /**
   * Validate archetype compatibility with detected platform
   */
  validateArchetypeCompatibility(
    archetypes: UserArchetype[],
    architecture: PlatformArchitectureType,
    domain: ContentDomainType
  ): {
    compatible: UserArchetype[];
    incompatible: UserArchetype[];
    warnings: string[];
    suggestions: string[];
  } {
    const compatible = [];
    const incompatible = [];
    const warnings = [];
    const suggestions = [];

    for (const archetype of archetypes) {
      const isArchitectureCompatible = archetype.supportedArchitectures.includes(architecture);
      const isDomainCompatible = archetype.supportedDomains.includes(domain) || 
                                archetype.supportedDomains.includes('generic');

      if (isArchitectureCompatible && isDomainCompatible) {
        compatible.push(archetype);
      } else {
        incompatible.push(archetype);
        
        if (!isArchitectureCompatible) {
          warnings.push(`Archetype '${archetype.name}' may not work well with ${architecture} architecture`);
        }
        
        if (!isDomainCompatible) {
          warnings.push(`Archetype '${archetype.name}' may not be optimized for ${domain} domain`);
        }
      }
    }

    // Generate suggestions
    if (incompatible.length > 0) {
      suggestions.push('Consider using platform-specific archetype variants');
      suggestions.push('Review archetype configuration for domain customizations');
    }

    if (compatible.length === 0) {
      suggestions.push('No fully compatible archetypes found - consider adding generic domain support');
    }

    return { compatible, incompatible, warnings, suggestions };
  }

  /**
   * Update archetype manager configuration based on platform detection
   */
  updateConfigurationForPlatform(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType,
    confidence: number
  ): void {
    const config: Partial<ArchetypeGenerationConfig> = {
      targetArchitecture: architecture,
      targetDomain: domain,
      applyDomainCustomizations: confidence > 0.7 // Only apply if high confidence
    };

    // Adjust distribution strategy based on platform
    if (architecture === 'team') {
      config.includedCategories = ['team_admin', 'team_member', 'team_lead', 'content_creator'];
      config.experienceLevelDistribution = {
        beginner: 0.2,
        intermediate: 0.4,
        advanced: 0.3,
        expert: 0.1
      };
    } else if (architecture === 'individual') {
      config.includedCategories = ['content_creator', 'content_discoverer', 'community_expert', 'casual_browser'];
      config.experienceLevelDistribution = {
        beginner: 0.35,
        intermediate: 0.35,
        advanced: 0.20,
        expert: 0.10
      };
    }

    // Adjust relationship density based on platform type
    if (domain === 'social') {
      config.relationshipDensity = 0.6;
    } else if (domain === 'saas') {
      config.relationshipDensity = 0.3;
    } else {
      config.relationshipDensity = 0.4;
    }

    this.archetypeManager.updateGenerationConfig(config);
    Logger.debug('Updated archetype configuration for platform', config);
  }

  /**
   * Get integration statistics and health metrics
   */
  getIntegrationStatistics(): {
    platformCache: {
      entries: number;
      architectures: Record<PlatformArchitectureType, number>;
      domains: Record<ContentDomainType, number>;
    };
    archetypeStats: any;
    recommendations: {
      mostUsedArchetypes: string[];
      platformCoverage: Record<string, number>;
    };
  } {
    const cacheEntries = Array.from(this.platformCache.entries());
    const architectureCount: Record<string, number> = {};
    const domainCount: Record<string, number> = {};

    cacheEntries.forEach(([key, result]) => {
      architectureCount[result.detectedArchitecture] = (architectureCount[result.detectedArchitecture] || 0) + 1;
      domainCount[result.detectedDomain] = (domainCount[result.detectedDomain] || 0) + 1;
    });

    const archetypeStats = this.archetypeManager.getStatistics();

    return {
      platformCache: {
        entries: cacheEntries.length,
        architectures: architectureCount as Record<PlatformArchitectureType, number>,
        domains: domainCount as Record<ContentDomainType, number>
      },
      archetypeStats,
      recommendations: {
        mostUsedArchetypes: Object.keys(archetypeStats.archetypesByCategory)
          .sort((a, b) => archetypeStats.archetypesByCategory[b] - archetypeStats.archetypesByCategory[a])
          .slice(0, 5),
        platformCoverage: this.calculatePlatformCoverage()
      }
    };
  }

  // Private helper methods

  private categorizeArchetypeCompatibility(
    archetypes: UserArchetype[],
    architecture: PlatformArchitectureType,
    domain: ContentDomainType
  ): {
    fullCompatibility: UserArchetype[];
    partialCompatibility: UserArchetype[];
    limitedCompatibility: UserArchetype[];
  } {
    const fullCompatibility = [];
    const partialCompatibility = [];
    const limitedCompatibility = [];

    for (const archetype of archetypes) {
      const architectureMatch = archetype.supportedArchitectures.includes(architecture);
      const domainMatch = archetype.supportedDomains.includes(domain) || 
                         archetype.supportedDomains.includes('generic');

      if (architectureMatch && domainMatch) {
        fullCompatibility.push(archetype);
      } else if (architectureMatch || domainMatch) {
        partialCompatibility.push(archetype);
      } else {
        limitedCompatibility.push(archetype);
      }
    }

    return { fullCompatibility, partialCompatibility, limitedCompatibility };
  }

  private generatePlatformOptimizedConfig(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType,
    compatibility: any
  ): ArchetypeGenerationConfig {
    const config: ArchetypeGenerationConfig = {
      targetArchitecture: architecture,
      targetDomain: domain,
      usersPerArchetype: { min: 2, max: 6 },
      distributionStrategy: 'weighted',
      includedCategories: [],
      excludedCategories: [],
      experienceLevelDistribution: {
        beginner: 0.3,
        intermediate: 0.4,
        advanced: 0.2,
        expert: 0.1
      },
      generateRelationships: true,
      relationshipDensity: 0.4,
      applyDomainCustomizations: true
    };

    // Optimize based on compatibility
    if (compatibility.fullCompatibility.length > 3) {
      config.distributionStrategy = 'weighted';
      config.usersPerArchetype = { min: 3, max: 8 };
    } else {
      config.distributionStrategy = 'equal';
      config.usersPerArchetype = { min: 2, max: 5 };
    }

    return config;
  }

  private generateArchetypeRecommendations(
    compatibility: any,
    architecture: PlatformArchitectureType,
    domain: ContentDomainType
  ): {
    primary: UserArchetype[];
    secondary: UserArchetype[];
    avoid: UserArchetype[];
  } {
    // Primary: Full compatibility + high selection weight
    const primary = compatibility.fullCompatibility
      .filter((a: UserArchetype) => a.selectionWeight > 60)
      .sort((a: UserArchetype, b: UserArchetype) => b.selectionWeight - a.selectionWeight);

    // Secondary: Partial compatibility or lower weight
    const secondary = [
      ...compatibility.fullCompatibility.filter((a: UserArchetype) => a.selectionWeight <= 60),
      ...compatibility.partialCompatibility.filter((a: UserArchetype) => a.selectionWeight > 40)
    ];

    // Avoid: Limited compatibility or very low weight
    const avoid = [
      ...compatibility.limitedCompatibility,
      ...compatibility.partialCompatibility.filter((a: UserArchetype) => a.selectionWeight <= 40)
    ];

    return { primary, secondary, avoid };
  }

  private selectFinalArchetypes(
    recommendations: any,
    config: ArchetypeGenerationConfig
  ): UserArchetype[] {
    // Start with primary recommendations
    let selected = [...recommendations.primary];

    // Add secondary if needed
    if (selected.length < 3) {
      selected = [...selected, ...recommendations.secondary.slice(0, 3 - selected.length)];
    }

    // Ensure minimum viable set
    if (selected.length === 0) {
      Logger.warn('No recommended archetypes found, using all available archetypes');
      selected = [...recommendations.primary, ...recommendations.secondary];
    }

    return selected.slice(0, 6); // Limit to reasonable number
  }

  private applyUserPreferences(
    archetypes: UserArchetype[],
    preferences: any
  ): UserArchetype[] {
    let filtered = archetypes;

    // Apply preferred archetypes filter
    if (preferences.preferredArchetypes?.length > 0) {
      filtered = filtered.filter(a => preferences.preferredArchetypes.includes(a.id));
    }

    // Apply excluded archetypes filter
    if (preferences.excludedArchetypes?.length > 0) {
      filtered = filtered.filter(a => !preferences.excludedArchetypes.includes(a.id));
    }

    return filtered;
  }

  private applyConstraints(
    archetypes: UserArchetype[],
    constraints: any
  ): UserArchetype[] {
    // Apply experience level constraints
    if (constraints.experienceLevelLimits) {
      // Filter based on experience level distribution requirements
      // This is a simplified implementation
      return archetypes;
    }

    // Apply content focus constraints
    if (constraints.contentFocusAreas?.length > 0) {
      return archetypes.filter(archetype => {
        return constraints.contentFocusAreas.some((area: string) =>
          archetype.contentCreation.contentTypes.some(type => type.includes(area))
        );
      });
    }

    return archetypes;
  }

  private applyDomainCustomizations(
    archetype: UserArchetype,
    domain: ContentDomainType,
    customizations: any
  ): UserArchetype {
    const customized = { ...archetype };

    if (customizations.customContentTypes?.length > 0) {
      customized.contentCreation = {
        ...customized.contentCreation,
        contentTypes: [...customized.contentCreation.contentTypes, ...customizations.customContentTypes]
      };
    }

    if (customizations.specialBehaviors) {
      customized.metadata = {
        ...customized.metadata,
        specialBehaviors: customizations.specialBehaviors
      };
    }

    return customized;
  }

  private enhanceWithPlatformBehaviors(
    userData: any,
    archetype: UserArchetype,
    context: ArchetypeGenerationContext
  ): any {
    // Generate platform-specific behavior scenarios
    const contentScenario = this.behaviorEngine.generateContentScenario(archetype, context.platformContext.domain);
    const engagementPattern = this.behaviorEngine.generateEngagementPattern(archetype, []);

    return {
      ...userData,
      platformBehaviors: {
        contentScenario,
        engagementPattern,
        sessionPatterns: this.behaviorEngine.generateActivityTimingPattern(archetype),
        contentFrequency: this.behaviorEngine.calculateContentFrequency(archetype)
      }
    };
  }

  private calculatePlatformCoverage(): Record<string, number> {
    const coverage: Record<string, number> = {};
    const archetypes = this.archetypeManager.getAllArchetypes();

    // Calculate coverage for each platform combination
    const architectures: PlatformArchitectureType[] = ['individual', 'team', 'hybrid'];
    const domains: ContentDomainType[] = ['outdoor', 'saas', 'ecommerce', 'social', 'generic'];

    architectures.forEach(arch => {
      domains.forEach(domain => {
        const compatible = archetypes.filter(a => 
          a.supportedArchitectures.includes(arch) && 
          (a.supportedDomains.includes(domain) || a.supportedDomains.includes('generic'))
        );
        coverage[`${arch}_${domain}`] = compatible.length;
      });
    });

    return coverage;
  }
}