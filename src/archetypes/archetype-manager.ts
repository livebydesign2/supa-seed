/**
 * User Archetype Manager for SupaSeed v2.5.0
 * Implements Task 4.1: Platform-Specific Archetype System
 * Core archetype management system with platform-specific logic
 */

import { Logger } from '../utils/logger';
import type {
  UserArchetype,
  ArchetypeCollection,
  ArchetypeGenerationConfig,
  ArchetypeApplicationResult,
  ArchetypeValidationResult,
  ArchetypeCompatibility,
  ArchetypeCategory,
  ExperienceLevel,
  ActivityFrequency,
  EngagementDepth
} from './archetype-types';
import type { PlatformArchitectureType, ContentDomainType } from '../detection/detection-types';

/**
 * Default archetype generation configuration
 */
export const DEFAULT_ARCHETYPE_CONFIG: ArchetypeGenerationConfig = {
  targetArchitecture: 'individual',
  targetDomain: 'generic',
  usersPerArchetype: {
    min: 2,
    max: 8
  },
  distributionStrategy: 'weighted',
  includedCategories: ['content_creator', 'content_discoverer', 'community_expert', 'casual_browser'],
  excludedCategories: [],
  experienceLevelDistribution: {
    beginner: 0.3,
    intermediate: 0.4,
    advanced: 0.2,
    expert: 0.1
  },
  generateRelationships: true,
  relationshipDensity: 0.3,
  applyDomainCustomizations: true
};

/**
 * Core archetype manager class
 */
export class ArchetypeManager {
  private archetypes: Map<string, UserArchetype> = new Map();
  private collections: Map<string, ArchetypeCollection> = new Map();
  private generationConfig: ArchetypeGenerationConfig = DEFAULT_ARCHETYPE_CONFIG;

  constructor(config?: Partial<ArchetypeGenerationConfig>) {
    if (config) {
      this.generationConfig = { ...DEFAULT_ARCHETYPE_CONFIG, ...config };
    }
    
    Logger.debug('ArchetypeManager initialized', {
      targetArchitecture: this.generationConfig.targetArchitecture,
      targetDomain: this.generationConfig.targetDomain
    });
  }

  /**
   * Register an archetype in the manager
   */
  registerArchetype(archetype: UserArchetype): void {
    const validation = this.validateArchetype(archetype);
    
    if (!validation.valid) {
      const errors = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ');
      throw new Error(`Cannot register invalid archetype '${archetype.id}': ${errors}`);
    }

    this.archetypes.set(archetype.id, archetype);
    Logger.debug(`Registered archetype: ${archetype.id} (${archetype.category})`);
  }

  /**
   * Register multiple archetypes from a collection
   */
  registerCollection(collection: ArchetypeCollection): void {
    this.collections.set(collection.name, collection);
    
    for (const archetype of collection.archetypes) {
      try {
        this.registerArchetype(archetype);
      } catch (error) {
        Logger.warn(`Failed to register archetype ${archetype.id} from collection ${collection.name}:`, error);
      }
    }
    
    Logger.info(`Registered collection '${collection.name}' with ${collection.archetypes.length} archetypes`);
  }

  /**
   * Get archetype by ID
   */
  getArchetype(id: string): UserArchetype | undefined {
    return this.archetypes.get(id);
  }

  /**
   * Get all registered archetypes
   */
  getAllArchetypes(): UserArchetype[] {
    return Array.from(this.archetypes.values());
  }

  /**
   * Get archetypes compatible with specified platform and domain
   */
  getCompatibleArchetypes(
    architecture: PlatformArchitectureType,
    domain: ContentDomainType,
    includePartial: boolean = true
  ): UserArchetype[] {
    return this.getAllArchetypes().filter(archetype => {
      const architectureMatch = archetype.supportedArchitectures.includes(architecture);
      const domainMatch = archetype.supportedDomains.includes(domain) || 
                         archetype.supportedDomains.includes('generic');
      
      if (includePartial) {
        return (architectureMatch || domainMatch) && archetype.enabled;
      } else {
        return architectureMatch && domainMatch && archetype.enabled;
      }
    });
  }

  /**
   * Get archetypes by category
   */
  getArchetypesByCategory(category: ArchetypeCategory): UserArchetype[] {
    return this.getAllArchetypes().filter(archetype => 
      archetype.category === category && archetype.enabled
    );
  }

  /**
   * Select archetypes for generation based on configuration
   */
  selectArchetypesForGeneration(config?: Partial<ArchetypeGenerationConfig>): UserArchetype[] {
    const effectiveConfig = { ...this.generationConfig, ...config };
    
    // Get compatible archetypes
    const compatibleArchetypes = this.getCompatibleArchetypes(
      effectiveConfig.targetArchitecture,
      effectiveConfig.targetDomain
    );

    // Filter by included/excluded categories
    const filteredArchetypes = compatibleArchetypes.filter(archetype => {
      const categoryIncluded = effectiveConfig.includedCategories.length === 0 ||
                              effectiveConfig.includedCategories.includes(archetype.category);
      const categoryNotExcluded = !effectiveConfig.excludedCategories.includes(archetype.category);
      
      return categoryIncluded && categoryNotExcluded;
    });

    // Apply distribution strategy
    switch (effectiveConfig.distributionStrategy) {
      case 'weighted':
        return this.selectByWeight(filteredArchetypes);
      case 'equal':
        return this.selectEqually(filteredArchetypes);
      case 'custom':
        return this.selectByCustomWeights(filteredArchetypes, effectiveConfig.customWeights || {});
      default:
        return filteredArchetypes;
    }
  }

  /**
   * Generate user data based on archetype
   */
  generateUserFromArchetype(archetype: UserArchetype, seed?: string): ArchetypeApplicationResult {
    Logger.debug(`Generating user from archetype: ${archetype.id}`);

    // Generate base user profile
    const profile = this.generateUserProfile(archetype, seed);
    
    // Generate user preferences based on archetype patterns
    const preferences = this.generateUserPreferences(archetype);
    
    // Generate initial content if archetype is content-focused
    const initialContent = this.shouldGenerateInitialContent(archetype) 
      ? this.generateInitialContent(archetype)
      : undefined;
    
    // Generate relationships if enabled
    const relationships = this.generationConfig.generateRelationships
      ? this.generateUserRelationships(archetype)
      : undefined;

    const result: ArchetypeApplicationResult = {
      archetype,
      userData: {
        profile,
        preferences,
        initialContent,
        relationships
      },
      appliedPatterns: {
        contentCreation: true,
        socialInteraction: true,
        platformUsage: true,
        teamBehavior: !!archetype.teamBehavior
      },
      metadata: {
        generatedAt: new Date(),
        seedValue: seed,
        customizations: this.getAppliedCustomizations(archetype)
      }
    };

    return result;
  }

  /**
   * Validate archetype definition
   */
  validateArchetype(archetype: UserArchetype): ArchetypeValidationResult {
    const errors: { field: string; message: string; severity: 'error' | 'warning' }[] = [];
    const warnings: string[] = [];
    const suggestions: { field: string; suggestion: string; impact: 'low' | 'medium' | 'high' }[] = [];

    // Required field validation
    if (!archetype.id || archetype.id.trim() === '') {
      errors.push({ field: 'id', message: 'Archetype ID is required', severity: 'error' });
    }

    if (!archetype.name || archetype.name.trim() === '') {
      errors.push({ field: 'name', message: 'Archetype name is required', severity: 'error' });
    }

    if (!archetype.description || archetype.description.trim() === '') {
      errors.push({ field: 'description', message: 'Archetype description is required', severity: 'error' });
    }

    // Selection weight validation
    if (archetype.selectionWeight < 0 || archetype.selectionWeight > 100) {
      errors.push({ 
        field: 'selectionWeight', 
        message: 'Selection weight must be between 0 and 100', 
        severity: 'error' 
      });
    }

    // Content creation pattern validation
    if (archetype.contentCreation.publicContentRatio < 0 || archetype.contentCreation.publicContentRatio > 1) {
      errors.push({
        field: 'contentCreation.publicContentRatio',
        message: 'Public content ratio must be between 0 and 1',
        severity: 'error'
      });
    }

    // Social interaction pattern validation
    if (archetype.socialInteraction.publicInteractionRatio < 0 || archetype.socialInteraction.publicInteractionRatio > 1) {
      errors.push({
        field: 'socialInteraction.publicInteractionRatio',
        message: 'Public interaction ratio must be between 0 and 1',
        severity: 'error'
      });
    }

    if (archetype.socialInteraction.responseRate < 0 || archetype.socialInteraction.responseRate > 1) {
      errors.push({
        field: 'socialInteraction.responseRate',
        message: 'Response rate must be between 0 and 1',
        severity: 'error'
      });
    }

    // Platform usage validation
    if (archetype.platformUsage.sessionDuration.min > archetype.platformUsage.sessionDuration.max) {
      errors.push({
        field: 'platformUsage.sessionDuration',
        message: 'Minimum session duration cannot be greater than maximum',
        severity: 'error'
      });
    }

    // Compatibility validation
    if (archetype.supportedArchitectures.length === 0) {
      warnings.push('Archetype supports no platform architectures - it may never be selected');
      suggestions.push({
        field: 'supportedArchitectures',
        suggestion: 'Add at least one supported platform architecture',
        impact: 'high'
      });
    }

    if (archetype.supportedDomains.length === 0) {
      warnings.push('Archetype supports no content domains - consider adding "generic" domain');
      suggestions.push({
        field: 'supportedDomains',
        suggestion: 'Add "generic" domain for broader compatibility',
        impact: 'medium'
      });
    }

    // Performance suggestions
    if (archetype.selectionWeight === 0) {
      warnings.push('Archetype has zero selection weight - it will never be randomly selected');
    }

    if (archetype.contentCreation.contentTypes.length === 0) {
      suggestions.push({
        field: 'contentCreation.contentTypes',
        suggestion: 'Define content types for more realistic content generation',
        impact: 'medium'
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get archetype compatibility information
   */
  getArchetypeCompatibility(archetype: UserArchetype): ArchetypeCompatibility {
    const allArchitectures: PlatformArchitectureType[] = ['individual', 'team', 'hybrid'];
    const allDomains: ContentDomainType[] = ['outdoor', 'saas', 'ecommerce', 'social', 'generic'];

    return {
      architectures: allArchitectures.map(arch => ({
        architecture: arch,
        compatibility: archetype.supportedArchitectures.includes(arch) ? 'full' : 'none',
        limitations: archetype.supportedArchitectures.includes(arch) ? undefined : ['Not supported']
      })),
      domains: allDomains.map(domain => ({
        domain,
        compatibility: archetype.supportedDomains.includes(domain) ? 'full' : 'none',
        limitations: archetype.supportedDomains.includes(domain) ? undefined : ['Not supported']
      })),
      requiredFeatures: this.getRequiredFeatures(archetype),
      optionalFeatures: this.getOptionalFeatures(archetype)
    };
  }

  /**
   * Update generation configuration
   */
  updateGenerationConfig(config: Partial<ArchetypeGenerationConfig>): void {
    this.generationConfig = { ...this.generationConfig, ...config };
    Logger.debug('Updated archetype generation configuration', config);
  }

  /**
   * Get current generation configuration
   */
  getGenerationConfig(): ArchetypeGenerationConfig {
    return { ...this.generationConfig };
  }

  /**
   * Reset to default configuration
   */
  resetConfiguration(): void {
    this.generationConfig = { ...DEFAULT_ARCHETYPE_CONFIG };
    Logger.debug('Reset archetype generation configuration to defaults');
  }

  /**
   * Get archetype statistics
   */
  getStatistics(): {
    totalArchetypes: number;
    enabledArchetypes: number;
    archetypesByCategory: Record<ArchetypeCategory, number>;
    archetypesByArchitecture: Record<PlatformArchitectureType, number>;
    archetypesByDomain: Record<ContentDomainType, number>;
  } {
    const allArchetypes = this.getAllArchetypes();
    const enabledArchetypes = allArchetypes.filter(a => a.enabled);

    const categoryCount: Record<string, number> = {};
    const architectureCount: Record<string, number> = {};
    const domainCount: Record<string, number> = {};

    enabledArchetypes.forEach(archetype => {
      // Count by category
      categoryCount[archetype.category] = (categoryCount[archetype.category] || 0) + 1;
      
      // Count by supported architectures
      archetype.supportedArchitectures.forEach(arch => {
        architectureCount[arch] = (architectureCount[arch] || 0) + 1;
      });
      
      // Count by supported domains
      archetype.supportedDomains.forEach(domain => {
        domainCount[domain] = (domainCount[domain] || 0) + 1;
      });
    });

    return {
      totalArchetypes: allArchetypes.length,
      enabledArchetypes: enabledArchetypes.length,
      archetypesByCategory: categoryCount as Record<ArchetypeCategory, number>,
      archetypesByArchitecture: architectureCount as Record<PlatformArchitectureType, number>,
      archetypesByDomain: domainCount as Record<ContentDomainType, number>
    };
  }

  // Private helper methods

  private selectByWeight(archetypes: UserArchetype[]): UserArchetype[] {
    return archetypes.filter(archetype => archetype.selectionWeight > 0);
  }

  private selectEqually(archetypes: UserArchetype[]): UserArchetype[] {
    return archetypes;
  }

  private selectByCustomWeights(archetypes: UserArchetype[], customWeights: Record<string, number>): UserArchetype[] {
    return archetypes.filter(archetype => {
      const weight = customWeights[archetype.id] ?? archetype.selectionWeight;
      return weight > 0;
    });
  }

  private generateUserProfile(archetype: UserArchetype, seed?: string): Record<string, any> {
    // Generate realistic user profile based on archetype characteristics
    return {
      displayName: this.generateDisplayName(archetype),
      bio: this.generateUserBio(archetype),
      experienceLevel: archetype.experienceLevel,
      joinedAt: this.generateJoinDate(archetype),
      preferences: {
        activityFrequency: archetype.activityFrequency,
        engagementDepth: archetype.engagementDepth,
        motivations: archetype.motivations
      },
      seed
    };
  }

  private generateUserPreferences(archetype: UserArchetype): Record<string, any> {
    return {
      contentCreation: {
        preferredTypes: archetype.contentCreation.contentTypes,
        publicRatio: archetype.contentCreation.publicContentRatio,
        includesMedia: archetype.contentCreation.includesMedia
      },
      socialInteraction: {
        engagementLevel: archetype.socialInteraction.socialEngagement,
        networkSize: archetype.socialInteraction.networkSize,
        leadershipTendency: archetype.socialInteraction.leadershipTendency
      },
      platformUsage: {
        primaryFeatures: archetype.platformUsage.primaryFeatures,
        sessionDuration: archetype.platformUsage.sessionDuration.average,
        devicePreferences: archetype.platformUsage.devicePreferences
      }
    };
  }

  private shouldGenerateInitialContent(archetype: UserArchetype): boolean {
    return archetype.category === 'content_creator' || 
           archetype.category === 'community_expert' ||
           archetype.contentCreation.creationFrequency !== 'occasional';
  }

  private generateInitialContent(archetype: UserArchetype): any[] {
    const contentCount = Math.floor(Math.random() * archetype.contentCreation.itemsPerSession.max) + 1;
    const content = [];

    for (let i = 0; i < contentCount; i++) {
      content.push({
        type: archetype.contentCreation.contentTypes[Math.floor(Math.random() * archetype.contentCreation.contentTypes.length)],
        complexity: archetype.contentCreation.contentComplexity,
        isPublic: Math.random() < archetype.contentCreation.publicContentRatio,
        includesMedia: archetype.contentCreation.includesMedia && Math.random() > 0.5
      });
    }

    return content;
  }

  private generateUserRelationships(archetype: UserArchetype): any[] {
    const relationshipCount = Math.floor(this.generationConfig.relationshipDensity * 10);
    const relationships = [];

    for (let i = 0; i < relationshipCount; i++) {
      relationships.push({
        type: this.getRelationshipType(archetype),
        strength: this.getRelationshipStrength(archetype)
      });
    }

    return relationships;
  }

  private getAppliedCustomizations(archetype: UserArchetype): string[] {
    const customizations = [];
    
    if (this.generationConfig.applyDomainCustomizations) {
      customizations.push('domain-specific-customizations');
    }
    
    if (archetype.teamBehavior) {
      customizations.push('team-behavior-patterns');
    }
    
    return customizations;
  }

  private generateDisplayName(archetype: UserArchetype): string {
    // Generate realistic display names based on archetype category
    const prefixes = {
      content_creator: ['Creative', 'Artist', 'Maker', 'Builder'],
      community_expert: ['Guide', 'Expert', 'Mentor', 'Pro'],
      content_discoverer: ['Explorer', 'Seeker', 'Scout', 'Hunter'],
      casual_browser: ['Casual', 'Browser', 'Visitor', 'Guest']
    };
    
    const prefix = prefixes[archetype.category as keyof typeof prefixes] || ['User'];
    const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    return `${randomPrefix}${randomNumber}`;
  }

  private generateUserBio(archetype: UserArchetype): string {
    const bioTemplates = {
      content_creator: [
        'Passionate about creating and sharing content',
        'Love bringing ideas to life through creative expression',
        'Always working on the next big project'
      ],
      community_expert: [
        'Here to help and share knowledge with the community',
        'Experienced user happy to guide newcomers',
        'Contributing expertise to help others succeed'
      ],
      content_discoverer: [
        'Always exploring and discovering new content',
        'Love finding hidden gems and sharing discoveries',
        'Curious explorer of all things interesting'
      ]
    };
    
    const templates = bioTemplates[archetype.category as keyof typeof bioTemplates] || ['Platform user'];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateJoinDate(archetype: UserArchetype): Date {
    const now = new Date();
    const daysAgo = archetype.experienceLevel === 'expert' ? 365 * 2 :
                   archetype.experienceLevel === 'advanced' ? 365 :
                   archetype.experienceLevel === 'intermediate' ? 180 :
                   30;
    
    return new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  }

  private getRequiredFeatures(archetype: UserArchetype): string[] {
    const features = ['user_profiles', 'authentication'];
    
    if (archetype.contentCreation.contentTypes.length > 0) {
      features.push('content_creation');
    }
    
    if (archetype.socialInteraction.socialEngagement !== 'passive') {
      features.push('social_interaction');
    }
    
    if (archetype.teamBehavior) {
      features.push('team_collaboration');
    }
    
    return features;
  }

  private getOptionalFeatures(archetype: UserArchetype): string[] {
    const features = [];
    
    if (archetype.contentCreation.includesMedia) {
      features.push('media_upload');
    }
    
    if (archetype.socialInteraction.leadershipTendency !== 'none') {
      features.push('community_moderation');
    }
    
    if (archetype.platformUsage.workflowComplexity === 'complex') {
      features.push('advanced_workflows');
    }
    
    return features;
  }

  private getRelationshipType(archetype: UserArchetype): string {
    const types = ['follower', 'following', 'mutual_connection'];
    
    if (archetype.teamBehavior) {
      types.push('teammate', 'collaborator');
    }
    
    if (archetype.socialInteraction.leadershipTendency !== 'none') {
      types.push('mentor', 'mentee');
    }
    
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRelationshipStrength(archetype: UserArchetype): 'weak' | 'moderate' | 'strong' {
    const strengths: ('weak' | 'moderate' | 'strong')[] = ['weak', 'moderate', 'strong'];
    
    // Adjust probabilities based on archetype social engagement
    const weights = archetype.socialInteraction.socialEngagement === 'highly_active' ? [0.2, 0.3, 0.5] :
                   archetype.socialInteraction.socialEngagement === 'active' ? [0.3, 0.4, 0.3] :
                   archetype.socialInteraction.socialEngagement === 'moderate' ? [0.5, 0.3, 0.2] :
                   [0.7, 0.2, 0.1];
    
    const random = Math.random();
    if (random < weights[0]) return strengths[0];
    if (random < weights[0] + weights[1]) return strengths[1];
    return strengths[2];
  }
}