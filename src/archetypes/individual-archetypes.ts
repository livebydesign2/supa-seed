/**
 * Individual Creator Archetype Templates for SupaSeed v2.5.0
 * Implements Task 4.1.3: Create individual creator archetype templates
 * Part of FR-4.2: Generate individual creator archetypes (for Wildernest-style platforms)
 */

import type { UserArchetype, ArchetypeCollection } from './archetype-types';

/**
 * Content Creator Archetype - Active content creators and sharers
 */
export const CONTENT_CREATOR_ARCHETYPE: UserArchetype = {
  id: 'individual_content_creator',
  name: 'Content Creator',
  description: 'Active users who regularly create and share original content, stories, and experiences',
  category: 'content_creator',
  experienceLevel: 'intermediate',
  activityFrequency: 'weekly',
  engagementDepth: 'active',
  motivations: ['creative', 'personal', 'social'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['outdoor', 'social', 'generic'],
  selectionWeight: 85,
  enabled: true,
  contentCreation: {
    contentTypes: ['posts', 'stories', 'photos', 'videos', 'guides', 'reviews'],
    creationFrequency: 'weekly',
    itemsPerSession: {
      min: 1,
      max: 4,
      average: 2
    },
    publicContentRatio: 0.8,
    includesMedia: true,
    contentComplexity: 'moderate',
    collaborativeCreation: false
  },
  socialInteraction: {
    interactionTypes: ['comments', 'likes', 'shares', 'follows', 'mentions'],
    socialEngagement: 'active',
    publicInteractionRatio: 0.9,
    initiatesInteractions: true,
    responseRate: 0.7,
    leadershipTendency: 'informal',
    networkSize: 'medium'
  },
  platformUsage: {
    primaryFeatures: ['content_creation', 'media_upload', 'social_interaction', 'discovery'],
    avoidedFeatures: ['analytics', 'advanced_settings'],
    sessionDuration: {
      min: 15,
      max: 60,
      average: 25
    },
    devicePreferences: ['mobile', 'desktop'],
    usageTimePatterns: ['evening', 'afternoon'],
    workflowComplexity: 'multi_task',
    helpSeekingBehavior: 'occasional_help'
  },
  metadata: {
    tags: ['creative', 'social', 'content'],
    targetPersonas: ['outdoor_enthusiast', 'lifestyle_blogger', 'hobbyist'],
    contentFocus: 'personal_experiences'
  }
};

/**
 * Content Discoverer Archetype - Users focused on finding and consuming content
 */
export const CONTENT_DISCOVERER_ARCHETYPE: UserArchetype = {
  id: 'individual_content_discoverer',
  name: 'Content Discoverer',
  description: 'Users who actively browse, search, and discover content from others',
  category: 'content_discoverer',
  experienceLevel: 'beginner',
  activityFrequency: 'daily',
  engagementDepth: 'moderate',
  motivations: ['learning', 'personal', 'social'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['outdoor', 'saas', 'ecommerce', 'social', 'generic'],
  selectionWeight: 75,
  enabled: true,
  contentCreation: {
    contentTypes: ['comments', 'likes', 'bookmarks'],
    creationFrequency: 'occasional',
    itemsPerSession: {
      min: 0,
      max: 2,
      average: 1
    },
    publicContentRatio: 0.4,
    includesMedia: false,
    contentComplexity: 'simple',
    collaborativeCreation: false
  },
  socialInteraction: {
    interactionTypes: ['likes', 'bookmarks', 'follows', 'comments'],
    socialEngagement: 'moderate',
    publicInteractionRatio: 0.6,
    initiatesInteractions: false,
    responseRate: 0.5,
    leadershipTendency: 'none',
    networkSize: 'small'
  },
  platformUsage: {
    primaryFeatures: ['discovery', 'search', 'bookmarks', 'following'],
    avoidedFeatures: ['content_creation', 'media_upload', 'analytics'],
    sessionDuration: {
      min: 10,
      max: 45,
      average: 20
    },
    devicePreferences: ['mobile', 'tablet'],
    usageTimePatterns: ['morning', 'evening'],
    workflowComplexity: 'linear',
    helpSeekingBehavior: 'frequent_help'
  },
  metadata: {
    tags: ['discovery', 'browsing', 'consumer'],
    targetPersonas: ['curious_explorer', 'research_focused', 'casual_browser'],
    contentFocus: 'discovery_and_learning'
  }
};

/**
 * Community Expert Archetype - Experienced users who guide and help others
 */
export const COMMUNITY_EXPERT_ARCHETYPE: UserArchetype = {
  id: 'individual_community_expert',
  name: 'Community Expert',
  description: 'Experienced users who share expertise, provide guidance, and contribute to community knowledge',
  category: 'community_expert',
  experienceLevel: 'expert',
  activityFrequency: 'weekly',
  engagementDepth: 'highly_active',
  motivations: ['social', 'learning', 'professional'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['outdoor', 'saas', 'generic'],
  selectionWeight: 60,
  enabled: true,
  contentCreation: {
    contentTypes: ['guides', 'tutorials', 'reviews', 'tips', 'answers', 'recommendations'],
    creationFrequency: 'weekly',
    itemsPerSession: {
      min: 1,
      max: 3,
      average: 2
    },
    publicContentRatio: 0.95,
    includesMedia: true,
    contentComplexity: 'complex',
    collaborativeCreation: true
  },
  socialInteraction: {
    interactionTypes: ['answers', 'advice', 'mentoring', 'reviews', 'recommendations'],
    socialEngagement: 'highly_active',
    publicInteractionRatio: 0.95,
    initiatesInteractions: true,
    responseRate: 0.9,
    leadershipTendency: 'expert',
    networkSize: 'large'
  },
  platformUsage: {
    primaryFeatures: ['content_creation', 'community_interaction', 'mentoring', 'moderation'],
    avoidedFeatures: [],
    sessionDuration: {
      min: 30,
      max: 120,
      average: 60
    },
    devicePreferences: ['desktop', 'mobile'],
    usageTimePatterns: ['morning', 'afternoon', 'evening'],
    workflowComplexity: 'complex',
    helpSeekingBehavior: 'self_sufficient'
  },
  metadata: {
    tags: ['expert', 'mentor', 'community_leader'],
    targetPersonas: ['industry_expert', 'experienced_practitioner', 'community_moderator'],
    contentFocus: 'educational_and_guidance'
  }
};

/**
 * Casual Browser Archetype - Light users who occasionally engage
 */
export const CASUAL_BROWSER_ARCHETYPE: UserArchetype = {
  id: 'individual_casual_browser',
  name: 'Casual Browser',
  description: 'Light users who occasionally browse content and engage minimally with the platform',
  category: 'casual_browser',
  experienceLevel: 'beginner',
  activityFrequency: 'monthly',
  engagementDepth: 'passive',
  motivations: ['personal', 'learning'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['outdoor', 'saas', 'ecommerce', 'social', 'generic'],
  selectionWeight: 40,
  enabled: true,
  contentCreation: {
    contentTypes: ['likes'],
    creationFrequency: 'occasional',
    itemsPerSession: {
      min: 0,
      max: 1,
      average: 0
    },
    publicContentRatio: 0.2,
    includesMedia: false,
    contentComplexity: 'simple',
    collaborativeCreation: false
  },
  socialInteraction: {
    interactionTypes: ['likes', 'views'],
    socialEngagement: 'passive',
    publicInteractionRatio: 0.3,
    initiatesInteractions: false,
    responseRate: 0.2,
    leadershipTendency: 'none',
    networkSize: 'small'
  },
  platformUsage: {
    primaryFeatures: ['browsing', 'discovery'],
    avoidedFeatures: ['content_creation', 'social_interaction', 'advanced_features'],
    sessionDuration: {
      min: 5,
      max: 20,
      average: 10
    },
    devicePreferences: ['mobile'],
    usageTimePatterns: ['evening'],
    workflowComplexity: 'linear',
    helpSeekingBehavior: 'community_reliant'
  },
  metadata: {
    tags: ['casual', 'passive', 'browser'],
    targetPersonas: ['occasional_visitor', 'lurker', 'minimal_engagement'],
    contentFocus: 'passive_consumption'
  }
};

/**
 * Power User Archetype - Advanced users who maximize platform features
 */
export const POWER_USER_ARCHETYPE: UserArchetype = {
  id: 'individual_power_user',
  name: 'Power User',
  description: 'Advanced users who leverage platform features extensively and optimize their workflows',
  category: 'power_user',
  experienceLevel: 'advanced',
  activityFrequency: 'daily',
  engagementDepth: 'highly_active',
  motivations: ['professional', 'creative', 'learning'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['saas', 'ecommerce', 'generic'],
  selectionWeight: 50,
  enabled: true,
  contentCreation: {
    contentTypes: ['posts', 'guides', 'reviews', 'tutorials', 'workflows', 'templates'],
    creationFrequency: 'daily',
    itemsPerSession: {
      min: 2,
      max: 6,
      average: 4
    },
    publicContentRatio: 0.7,
    includesMedia: true,
    contentComplexity: 'complex',
    collaborativeCreation: true
  },
  socialInteraction: {
    interactionTypes: ['detailed_comments', 'feedback', 'collaboration', 'sharing', 'recommendations'],
    socialEngagement: 'highly_active',
    publicInteractionRatio: 0.8,
    initiatesInteractions: true,
    responseRate: 0.8,
    leadershipTendency: 'formal',
    networkSize: 'large'
  },
  platformUsage: {
    primaryFeatures: ['advanced_creation', 'automation', 'analytics', 'integrations', 'customization'],
    avoidedFeatures: [],
    sessionDuration: {
      min: 45,
      max: 180,
      average: 90
    },
    devicePreferences: ['desktop'],
    usageTimePatterns: ['morning', 'afternoon'],
    workflowComplexity: 'adaptive',
    helpSeekingBehavior: 'self_sufficient'
  },
  metadata: {
    tags: ['power_user', 'advanced', 'productivity'],
    targetPersonas: ['productivity_optimizer', 'workflow_expert', 'feature_maximizer'],
    contentFocus: 'optimization_and_efficiency'
  }
};

/**
 * Social Connector Archetype - Users focused on networking and social interactions
 */
export const SOCIAL_CONNECTOR_ARCHETYPE: UserArchetype = {
  id: 'individual_social_connector',
  name: 'Social Connector',
  description: 'Users who prioritize networking, community building, and social interactions',
  category: 'social_connector',
  experienceLevel: 'intermediate',
  activityFrequency: 'daily',
  engagementDepth: 'active',
  motivations: ['social', 'personal', 'professional'],
  supportedArchitectures: ['individual', 'hybrid'],
  supportedDomains: ['social', 'outdoor', 'generic'],
  selectionWeight: 70,
  enabled: true,
  contentCreation: {
    contentTypes: ['social_posts', 'comments', 'introductions', 'event_posts', 'shares'],
    creationFrequency: 'daily',
    itemsPerSession: {
      min: 2,
      max: 5,
      average: 3
    },
    publicContentRatio: 0.9,
    includesMedia: true,
    contentComplexity: 'moderate',
    collaborativeCreation: true
  },
  socialInteraction: {
    interactionTypes: ['comments', 'mentions', 'direct_messages', 'group_discussions', 'event_participation'],
    socialEngagement: 'highly_active',
    publicInteractionRatio: 0.85,
    initiatesInteractions: true,
    responseRate: 0.9,
    leadershipTendency: 'informal',
    networkSize: 'extensive'
  },
  platformUsage: {
    primaryFeatures: ['social_networking', 'messaging', 'groups', 'events', 'profiles'],
    avoidedFeatures: ['analytics', 'automation'],
    sessionDuration: {
      min: 20,
      max: 90,
      average: 45
    },
    devicePreferences: ['mobile', 'desktop'],
    usageTimePatterns: ['morning', 'afternoon', 'evening'],
    workflowComplexity: 'multi_task',
    helpSeekingBehavior: 'community_reliant'
  },
  metadata: {
    tags: ['social', 'networking', 'community'],
    targetPersonas: ['community_builder', 'networker', 'social_enthusiast'],
    contentFocus: 'relationship_and_community'
  }
};

/**
 * Individual Creator Archetype Collection
 * Complete collection of individual creator archetypes for individual/hybrid platforms
 */
export const INDIVIDUAL_CREATOR_COLLECTION: ArchetypeCollection = {
  name: 'Individual Creator Archetypes',
  description: 'Comprehensive collection of user archetypes for individual and hybrid platform architectures',
  version: '1.0.0',
  targetArchitecture: 'individual',
  archetypes: [
    CONTENT_CREATOR_ARCHETYPE,
    CONTENT_DISCOVERER_ARCHETYPE,
    COMMUNITY_EXPERT_ARCHETYPE,
    CASUAL_BROWSER_ARCHETYPE,
    POWER_USER_ARCHETYPE,
    SOCIAL_CONNECTOR_ARCHETYPE
  ],
  defaultGenerationConfig: {
    targetArchitecture: 'individual',
    targetDomain: 'generic',
    usersPerArchetype: {
      min: 3,
      max: 8
    },
    distributionStrategy: 'weighted',
    includedCategories: ['content_creator', 'content_discoverer', 'community_expert', 'casual_browser'],
    excludedCategories: [],
    experienceLevelDistribution: {
      beginner: 0.35,
      intermediate: 0.35,
      advanced: 0.20,
      expert: 0.10
    },
    generateRelationships: true,
    relationshipDensity: 0.4,
    applyDomainCustomizations: true
  },
  metadata: {
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    author: 'SupaSeed v2.5.0 Archetype System',
    tags: ['individual', 'creator', 'social', 'content']
  }
};

/**
 * Outdoor-specific archetype customizations
 */
export const OUTDOOR_ARCHETYPE_CUSTOMIZATIONS = {
  content_creator: {
    contentTypes: ['trip_reports', 'gear_reviews', 'photos', 'route_guides', 'safety_tips'],
    domainSpecificMetadata: {
      gearFocus: true,
      locationSharing: true,
      safetyAware: true,
      weatherConscious: true
    }
  },
  community_expert: {
    contentTypes: ['safety_guides', 'technique_tutorials', 'gear_recommendations', 'route_reviews'],
    domainSpecificMetadata: {
      certifications: ['wilderness_first_aid', 'guide_certification'],
      specializations: ['mountaineering', 'rock_climbing', 'backpacking'],
      mentorshipRole: true
    }
  },
  content_discoverer: {
    contentTypes: ['location_bookmarks', 'gear_wishlists', 'route_saves'],
    domainSpecificMetadata: {
      planningFocus: true,
      researchOriented: true,
      tripPreparation: true
    }
  }
};

/**
 * SaaS-specific archetype customizations
 */
export const SAAS_ARCHETYPE_CUSTOMIZATIONS = {
  power_user: {
    contentTypes: ['workflow_templates', 'automation_guides', 'feature_tutorials', 'integration_setups'],
    domainSpecificMetadata: {
      productivityFocus: true,
      integrationHeavy: true,
      workflowOptimization: true,
      analyticsUsage: true
    }
  },
  content_creator: {
    contentTypes: ['use_cases', 'success_stories', 'tutorials', 'best_practices'],
    domainSpecificMetadata: {
      businessFocus: true,
      resultOriented: true,
      processDocumentation: true
    }
  }
};

/**
 * Utility function to get domain-customized archetype
 */
export function getCustomizedArchetype(
  baseArchetype: UserArchetype, 
  domain: string
): UserArchetype {
  const customizations = domain === 'outdoor' ? OUTDOOR_ARCHETYPE_CUSTOMIZATIONS :
                        domain === 'saas' ? SAAS_ARCHETYPE_CUSTOMIZATIONS :
                        null;

  if (!customizations || !customizations[baseArchetype.category as keyof typeof customizations]) {
    return baseArchetype;
  }

  const customization = customizations[baseArchetype.category as keyof typeof customizations];
  
  return {
    ...baseArchetype,
    contentCreation: {
      ...baseArchetype.contentCreation,
      contentTypes: customization.contentTypes || baseArchetype.contentCreation.contentTypes
    },
    metadata: {
      ...baseArchetype.metadata,
      ...customization.domainSpecificMetadata
    }
  };
}