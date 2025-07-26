/**
 * User Archetype System Types for SupaSeed v2.5.0
 * Implements type definitions for Task 4.1: Platform-Specific Archetype System
 * Part of FR-4.1: Create platform-specific user archetype templates
 */

import type { PlatformArchitectureType, ContentDomainType } from '../detection/detection-types';

/**
 * Core archetype categories that define user behavior patterns
 */
export type ArchetypeCategory = 
  | 'content_creator'     // Users who primarily create and share content
  | 'content_discoverer'  // Users who browse, search, and discover content
  | 'community_expert'    // Power users who guide, review, and lead communities
  | 'team_admin'         // Users who manage teams, workspaces, and permissions
  | 'team_member'        // Users who participate in team collaboration
  | 'team_lead'          // Users who coordinate projects and team activities
  | 'casual_browser'     // Light users who occasionally engage
  | 'power_user'         // Heavy users with advanced feature usage
  | 'business_owner'     // Users managing business operations and analytics
  | 'social_connector';   // Users focused on networking and social interactions

/**
 * User experience levels that affect behavior complexity
 */
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Activity frequency patterns for realistic usage simulation
 */
export type ActivityFrequency = 'daily' | 'weekly' | 'monthly' | 'occasional';

/**
 * Engagement depth levels for content interaction
 */
export type EngagementDepth = 'passive' | 'moderate' | 'active' | 'highly_active';

/**
 * User motivation types that drive behavior patterns
 */
export type UserMotivation = 
  | 'professional'       // Work-related goals and productivity
  | 'personal'          // Personal interests and hobbies
  | 'social'            // Community connection and networking
  | 'learning'          // Knowledge acquisition and skill development
  | 'creative'          // Creative expression and content creation
  | 'commercial';       // Business and revenue generation

/**
 * Base archetype configuration interface
 */
export interface ArchetypeBase {
  /** Unique identifier for the archetype */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Detailed description of the archetype */
  description: string;
  
  /** Primary archetype category */
  category: ArchetypeCategory;
  
  /** Experience level of users in this archetype */
  experienceLevel: ExperienceLevel;
  
  /** How frequently this archetype uses the platform */
  activityFrequency: ActivityFrequency;
  
  /** Depth of engagement with content and features */
  engagementDepth: EngagementDepth;
  
  /** Primary motivations driving this archetype */
  motivations: UserMotivation[];
  
  /** Platform architectures this archetype is suitable for */
  supportedArchitectures: PlatformArchitectureType[];
  
  /** Content domains this archetype is relevant to */
  supportedDomains: ContentDomainType[];
  
  /** Weight for random selection (0-100) */
  selectionWeight: number;
  
  /** Whether this archetype is enabled for generation */
  enabled: boolean;
}

/**
 * Content creation behavior patterns
 */
export interface ContentCreationPattern {
  /** Types of content this archetype creates */
  contentTypes: string[];
  
  /** Average content creation frequency */
  creationFrequency: ActivityFrequency;
  
  /** Number of content items per session */
  itemsPerSession: {
    min: number;
    max: number;
    average: number;
  };
  
  /** Preference for public vs private content */
  publicContentRatio: number; // 0-1 scale
  
  /** Whether archetype creates multimedia content */
  includesMedia: boolean;
  
  /** Complexity level of created content */
  contentComplexity: 'simple' | 'moderate' | 'complex' | 'varied';
  
  /** Whether archetype collaborates on content creation */
  collaborativeCreation: boolean;
}

/**
 * Social interaction behavior patterns
 */
export interface SocialInteractionPattern {
  /** Types of social interactions this archetype engages in */
  interactionTypes: string[];
  
  /** How actively the archetype engages with others */
  socialEngagement: EngagementDepth;
  
  /** Preference for public vs private interactions */
  publicInteractionRatio: number; // 0-1 scale
  
  /** Whether archetype initiates conversations */
  initiatesInteractions: boolean;
  
  /** Response rate to social interactions */
  responseRate: number; // 0-1 scale
  
  /** Community leadership tendencies */
  leadershipTendency: 'none' | 'informal' | 'formal' | 'expert';
  
  /** Network size preferences */
  networkSize: 'small' | 'medium' | 'large' | 'extensive';
}

/**
 * Platform usage behavior patterns
 */
export interface PlatformUsagePattern {
  /** Platform features frequently used */
  primaryFeatures: string[];
  
  /** Features rarely or never used */
  avoidedFeatures: string[];
  
  /** Session duration patterns */
  sessionDuration: {
    min: number; // minutes
    max: number; // minutes
    average: number; // minutes
  };
  
  /** Device preferences */
  devicePreferences: ('desktop' | 'mobile' | 'tablet')[];
  
  /** Time of day usage patterns */
  usageTimePatterns: ('morning' | 'afternoon' | 'evening' | 'night')[];
  
  /** Workflow complexity */
  workflowComplexity: 'linear' | 'multi_task' | 'complex' | 'adaptive';
  
  /** Help-seeking behavior */
  helpSeekingBehavior: 'self_sufficient' | 'occasional_help' | 'frequent_help' | 'community_reliant';
}

/**
 * Team-specific behavior patterns (for team archetypes)
 */
export interface TeamBehaviorPattern {
  /** Role in team structure */
  teamRole: 'leader' | 'coordinator' | 'contributor' | 'specialist' | 'observer';
  
  /** Collaboration style */
  collaborationStyle: 'directive' | 'collaborative' | 'supportive' | 'independent';
  
  /** Communication preferences */
  communicationStyle: 'formal' | 'informal' | 'direct' | 'diplomatic' | 'detailed';
  
  /** Decision-making involvement */
  decisionMaking: 'decision_maker' | 'advisor' | 'implementer' | 'observer';
  
  /** Project participation level */
  projectParticipation: EngagementDepth;
  
  /** Mentoring and knowledge sharing */
  knowledgeSharing: boolean;
  
  /** Cross-team interaction patterns */
  crossTeamInteraction: 'frequent' | 'occasional' | 'rare' | 'none';
}

/**
 * Complete archetype definition
 */
export interface UserArchetype extends ArchetypeBase {
  /** Content creation behavior patterns */
  contentCreation: ContentCreationPattern;
  
  /** Social interaction behavior patterns */
  socialInteraction: SocialInteractionPattern;
  
  /** Platform usage behavior patterns */
  platformUsage: PlatformUsagePattern;
  
  /** Team behavior patterns (optional, for team archetypes) */
  teamBehavior?: TeamBehaviorPattern;
  
  /** Custom archetype-specific metadata */
  metadata: Record<string, any>;
}

/**
 * Archetype generation configuration
 */
export interface ArchetypeGenerationConfig {
  /** Target platform architecture */
  targetArchitecture: PlatformArchitectureType;
  
  /** Target content domain */
  targetDomain: ContentDomainType;
  
  /** Number of users to generate per archetype */
  usersPerArchetype: {
    min: number;
    max: number;
  };
  
  /** Distribution strategy for archetype selection */
  distributionStrategy: 'weighted' | 'equal' | 'custom';
  
  /** Custom weights for archetype selection (if using custom strategy) */
  customWeights?: Record<string, number>;
  
  /** Archetype categories to include */
  includedCategories: ArchetypeCategory[];
  
  /** Archetype categories to exclude */
  excludedCategories: ArchetypeCategory[];
  
  /** Experience level distribution */
  experienceLevelDistribution: Record<ExperienceLevel, number>;
  
  /** Whether to generate realistic user relationships */
  generateRelationships: boolean;
  
  /** Relationship density (0-1 scale) */
  relationshipDensity: number;
  
  /** Whether to apply domain-specific customizations */
  applyDomainCustomizations: boolean;
}

/**
 * Archetype application result
 */
export interface ArchetypeApplicationResult {
  /** Applied archetype information */
  archetype: UserArchetype;
  
  /** Generated user data based on archetype */
  userData: {
    profile: Record<string, any>;
    preferences: Record<string, any>;
    initialContent?: any[];
    relationships?: any[];
  };
  
  /** Behavior pattern application details */
  appliedPatterns: {
    contentCreation: boolean;
    socialInteraction: boolean;
    platformUsage: boolean;
    teamBehavior: boolean;
  };
  
  /** Generation metadata */
  metadata: {
    generatedAt: Date;
    seedValue?: string;
    customizations: string[];
  };
}

/**
 * Archetype validation result
 */
export interface ArchetypeValidationResult {
  /** Whether the archetype is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: {
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }[];
  
  /** Validation warnings */
  warnings: string[];
  
  /** Suggestions for improvement */
  suggestions: {
    field: string;
    suggestion: string;
    impact: 'low' | 'medium' | 'high';
  }[];
}

/**
 * Archetype compatibility information
 */
export interface ArchetypeCompatibility {
  /** Platform architectures this archetype works with */
  architectures: {
    architecture: PlatformArchitectureType;
    compatibility: 'full' | 'partial' | 'limited' | 'none';
    limitations?: string[];
  }[];
  
  /** Content domains this archetype works with */
  domains: {
    domain: ContentDomainType;
    compatibility: 'full' | 'partial' | 'limited' | 'none';
    limitations?: string[];
  }[];
  
  /** Feature requirements */
  requiredFeatures: string[];
  
  /** Optional features that enhance the archetype */
  optionalFeatures: string[];
}

/**
 * Archetype collection interface
 */
export interface ArchetypeCollection {
  /** Collection name and metadata */
  name: string;
  description: string;
  version: string;
  
  /** Target platform characteristics */
  targetArchitecture?: PlatformArchitectureType;
  targetDomain?: ContentDomainType;
  
  /** Individual archetype definitions */
  archetypes: UserArchetype[];
  
  /** Default generation configuration */
  defaultGenerationConfig: ArchetypeGenerationConfig;
  
  /** Collection-level metadata */
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author?: string;
    tags: string[];
  };
}

/**
 * Archetype template for easy creation
 */
export interface ArchetypeTemplate {
  /** Template identification */
  id: string;
  name: string;
  description: string;
  
  /** Template category and domain */
  category: ArchetypeCategory;
  targetArchitectures: PlatformArchitectureType[];
  targetDomains: ContentDomainType[];
  
  /** Default values for archetype creation */
  defaults: Partial<UserArchetype>;
  
  /** Required customizations when using template */
  requiredCustomizations: string[];
  
  /** Template usage examples */
  examples: {
    name: string;
    description: string;
    customizations: Record<string, any>;
  }[];
}