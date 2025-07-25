/**
 * Auth Data Generator for Epic 1: Universal MakerKit Core System
 * Generates comprehensive authentication test data with identity providers
 * Part of Task 1.1: Implement Auth.Identities Support
 */

import type { 
  CompleteUserData, 
  IdentityProviderType, 
  UserArchetype, 
  AuthSeedingOptions,
  AuthSeedingResult,
  PlatformContext
} from '../auth/auth-types';
import { Logger } from '../utils/logger';

export interface AuthDataGenerationOptions {
  userCount: number;
  archetype?: UserArchetype;
  platformContext?: PlatformContext;
  providerWeights?: Record<IdentityProviderType, number>;
  includeMultipleProviders?: boolean;
  domainOverride?: string;
}

export class AuthDataGenerator {
  private readonly providers: IdentityProviderType[] = [
    'email', 'google', 'github', 'discord', 'apple'
  ];

  private readonly commonNames = [
    'Alex Rivera', 'Jordan Chen', 'Taylor Smith', 'Casey Johnson', 'Morgan Brown',
    'Riley Davis', 'Avery Wilson', 'Quinn Martinez', 'Blake Anderson', 'Drew Thompson',
    'Sage Garcia', 'Rowan Rodriguez', 'Cameron Lewis', 'Devon Clark', 'Emery Hall'
  ];

  private readonly outdoorUsernames = [
    'trailblazer', 'peakseeker', 'wildernomad', 'mountaineer', 'basecamp',
    'adventurer', 'trailrunner', 'summitbound', 'wildcraft', 'outdoor_ace',
    'nature_guide', 'backpacker', 'cliff_hanger', 'wilderness_pro', 'gear_guru'
  ];

  private readonly saasUsernames = [
    'product_owner', 'dev_lead', 'scrum_master', 'ui_designer', 'data_analyst',
    'team_captain', 'project_pro', 'workflow_wizard', 'efficiency_expert', 'sprint_hero',
    'feature_builder', 'bug_hunter', 'code_reviewer', 'deployment_ninja', 'metrics_master'
  ];

  /**
   * Generate complete user data for authentication testing
   */
  generateCompleteUsers(options: AuthDataGenerationOptions): CompleteUserData[] {
    Logger.info(`🎭 Generating ${options.userCount} complete users for authentication testing`);

    const users: CompleteUserData[] = [];
    const domain = this.getDomainFromContext(options.platformContext) || options.domainOverride || 'test';

    for (let i = 0; i < options.userCount; i++) {
      const user = this.generateSingleCompleteUser(i, domain, options);
      users.push(user);
    }

    Logger.success(`✅ Generated ${users.length} complete users with authentication data`);
    return users;
  }

  /**
   * Generate user archetypes for different platform types
   */
  generateUserArchetypes(platformContext: PlatformContext): UserArchetype[] {
    const archetypes: UserArchetype[] = [];

    // Base admin archetype for all platforms
    archetypes.push(this.createAdminArchetype(platformContext));

    // Platform-specific archetypes
    switch (platformContext.architecture) {
      case 'individual':
        archetypes.push(
          this.createIndividualCreatorArchetype(platformContext),
          this.createIndividualExplorerArchetype(platformContext)
        );
        break;

      case 'team':
        archetypes.push(
          this.createTeamManagerArchetype(platformContext),
          this.createTeamMemberArchetype(platformContext),
          this.createTeamCollaboratorArchetype(platformContext)
        );
        break;

      case 'hybrid':
        archetypes.push(
          this.createHybridPowerUserArchetype(platformContext),
          this.createHybridCasualUserArchetype(platformContext)
        );
        break;
    }

    Logger.info(`🎭 Generated ${archetypes.length} user archetypes for ${platformContext.architecture} ${platformContext.domain} platform`);
    return archetypes;
  }

  /**
   * Generate authentication seeding data based on options
   */
  generateAuthSeedingData(options: AuthSeedingOptions): {
    users: CompleteUserData[];
    archetypes: UserArchetype[];
    providerDistribution: Record<IdentityProviderType, number>;
  } {
    Logger.info('🔐 Generating comprehensive authentication seeding data');

    // Detect platform context from auth flow config
    const platformContext: PlatformContext = {
      architecture: 'individual', // Default, would be detected in real implementation
      domain: 'generic',
      confidence: 0.8,
      detectedFeatures: ['auth_identities', 'complete_flow'],
      recommendations: ['Use complete auth flow for realistic testing']
    };

    // Generate user archetypes
    const archetypes = this.generateUserArchetypes(platformContext);

    // Generate users based on archetypes
    const users: CompleteUserData[] = [];
    const providerDistribution: Record<IdentityProviderType, number> = {} as any;

    // Initialize provider distribution
    this.providers.forEach(provider => {
      providerDistribution[provider] = 0;
    });

    // Generate users for each archetype
    const usersPerArchetype = Math.ceil(options.userCount / archetypes.length);
    
    for (let archetypeIndex = 0; archetypeIndex < archetypes.length; archetypeIndex++) {
      const archetype = archetypes[archetypeIndex];
      const userCount = Math.min(usersPerArchetype, options.userCount - users.length);

      const archetypeUsers = this.generateCompleteUsers({
        userCount,
        archetype,
        platformContext,
        providerWeights: options.providerDistribution,
        includeMultipleProviders: options.authFlowConfig.allowMultipleProviders
      });

      users.push(...archetypeUsers);

      // Update provider distribution
      archetypeUsers.forEach(user => {
        user.identityProviders?.forEach(provider => {
          providerDistribution[provider]++;
        });
      });

      if (users.length >= options.userCount) break;
    }

    Logger.success(`✅ Generated authentication seeding data: ${users.length} users, ${archetypes.length} archetypes`);

    return {
      users: users.slice(0, options.userCount),
      archetypes,
      providerDistribution
    };
  }

  /**
   * Generate realistic provider combinations based on archetype
   */
  generateProviderCombination(
    archetype: UserArchetype, 
    providerWeights?: Record<IdentityProviderType, number>,
    allowMultiple: boolean = true
  ): IdentityProviderType[] {
    const providers: IdentityProviderType[] = ['email']; // Always include email

    if (!allowMultiple) {
      return providers;
    }

    // Add providers based on archetype security preferences
    const securityLevel = archetype.authPreferences.securityLevel;
    const preferredProviders = archetype.authPreferences.providers ?? [];

    // Filter preferred providers based on weights
    const weightedProviders = preferredProviders.filter(provider => {
      if (!providerWeights) return true;
      const weight = providerWeights[provider] || 0.3;
      return Math.random() < weight;
    });

    // Add 1-2 additional providers based on security level
    const additionalProviderCount = securityLevel === 'maximum' ? 2 : 
                                   securityLevel === 'enhanced' ? 1 : 
                                   Math.random() > 0.7 ? 1 : 0;

    for (let i = 0; i < additionalProviderCount && weightedProviders.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * weightedProviders.length);
      const provider = weightedProviders.splice(randomIndex, 1)[0];
      if (!providers.includes(provider)) {
        providers.push(provider);
      }
    }

    return providers;
  }

  /**
   * Private helper methods
   */

  private generateSingleCompleteUser(
    index: number, 
    domain: string, 
    options: AuthDataGenerationOptions
  ): CompleteUserData {
    const name = this.commonNames[index % this.commonNames.length];
    const emailDomain = domain === 'test' ? 'test.com' : `${domain}.test`;
    const email = `${name.toLowerCase().replace(' ', '.')}+${index}@${emailDomain}`;
    
    // Generate username based on platform context
    const username = this.generateUsername(name, options.platformContext, index);
    
    // Generate identity providers
    const identityProviders = options.archetype ? 
      this.generateProviderCombination(
        options.archetype, 
        options.providerWeights, 
        options.includeMultipleProviders
      ) : ['email' as IdentityProviderType];

    // Determine primary provider
    const primaryProvider = identityProviders.includes('google') ? 'google' :
                           identityProviders.includes('github') ? 'github' :
                           'email';

    // Generate role based on archetype
    const role = options.archetype?.role || (index === 0 ? 'admin' : 'user');

    return {
      email,
      name,
      username,
      avatar: this.generateAvatarUrl(username, options.platformContext),
      bio: this.generateBio(name, options.archetype, options.platformContext),
      identityProviders,
      primaryProvider,
      isPersonalAccount: options.archetype?.platformContext.accountType === 'personal' ?? true,
      accountSlug: options.archetype?.platformContext.accountType === 'team' ? 
        username.toLowerCase().replace(/[^a-z0-9]/g, '-') : null,
      role: role as any,
      emailConfirmed: true,
      metadata: {
        generated_by: 'supa-seed-v2.5.0',
        archetype: options.archetype?.id || 'generated',
        platform: options.platformContext?.architecture || 'individual',
        domain: options.platformContext?.domain || 'generic'
      }
    };
  }

  private generateUsername(name: string, platformContext?: PlatformContext, index: number = 0): string {
    const baseName = name.toLowerCase().replace(' ', '_');
    
    if (!platformContext) {
      return `${baseName}_${index}`;
    }

    switch (platformContext.domain) {
      case 'outdoor':
        const outdoorSuffix = this.outdoorUsernames[index % this.outdoorUsernames.length];
        return Math.random() > 0.5 ? `${baseName}_${outdoorSuffix}` : outdoorSuffix;
        
      case 'saas':
        const saasSuffix = this.saasUsernames[index % this.saasUsernames.length];
        return Math.random() > 0.5 ? `${baseName}_${saasSuffix}` : saasSuffix;
        
      default:
        return `${baseName}_${index}`;
    }
  }

  private generateAvatarUrl(username: string, platformContext?: PlatformContext): string {
    // Generate deterministic avatar based on username
    const avatarId = Array.from(username).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100;
    
    if (platformContext?.domain === 'outdoor') {
      return `https://images.unsplash.com/photo-${1500000000 + avatarId}?w=150&h=150&fit=crop&crop=face`;
    }
    
    return `https://api.dicebear.com/7.x/personas/svg?seed=${username}&backgroundColor=b6e3f4`;
  }

  private generateBio(name: string, archetype?: UserArchetype, platformContext?: PlatformContext): string {
    if (archetype) {
      return `${archetype.description} | ${archetype.purpose}`;
    }

    const firstName = name.split(' ')[0];
    
    switch (platformContext?.domain) {
      case 'outdoor':
        return `${firstName} loves exploring the great outdoors and sharing gear recommendations.`;
      case 'saas':
        return `${firstName} is passionate about building great products and collaborating with teams.`;
      case 'ecommerce':
        return `${firstName} enjoys discovering new products and sharing reviews.`;
      default:
        return `${firstName} is exploring this platform and looking forward to great experiences.`;
    }
  }

  private getDomainFromContext(platformContext?: PlatformContext): string | null {
    return platformContext?.domain && platformContext.domain !== 'generic' ? 
      platformContext.domain : null;
  }

  /**
   * Archetype creation methods
   */

  private createAdminArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'admin-archetype',
      name: 'Platform Administrator',
      description: 'Platform administrator with full access and management capabilities',
      email: 'admin@test.com',
      role: 'admin',
      purpose: 'Platform administration and system management',
      contentPattern: {
        createsContent: true,
        consumesContent: true,
        collaborates: true,
        setupsPerUser: 5,
        itemsPerSetup: 10,
        publicRatio: 0.5
      },
      behaviorPattern: {
        activityLevel: 'high',
        sessionDuration: 'long',
        featureUsage: ['admin_panel', 'user_management', 'settings', 'analytics'],
        socialInteraction: 'active'
      },
      platformContext,
      authPreferences: {
        providers: ['email', 'google', 'github'],
        mfaEnabled: true,
        securityLevel: 'maximum'
      }
    };
  }

  private createIndividualCreatorArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'individual-creator',
      name: 'Individual Creator',
      description: 'Content creator focused on individual projects and sharing',
      email: 'creator@test.com',
      role: 'user',
      purpose: 'Individual content creation and sharing with community',
      contentPattern: {
        createsContent: true,
        consumesContent: true,
        collaborates: false,
        setupsPerUser: 3,
        itemsPerSetup: 7,
        publicRatio: 0.8
      },
      behaviorPattern: {
        activityLevel: 'medium',
        sessionDuration: 'medium',
        featureUsage: ['content_creation', 'sharing', 'discovery'],
        socialInteraction: 'moderate'
      },
      platformContext: {
        ...platformContext,
        accountType: 'personal'
      },
      authPreferences: {
        providers: ['email', 'google'],
        mfaEnabled: false,
        securityLevel: 'basic'
      }
    };
  }

  private createIndividualExplorerArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'individual-explorer',
      name: 'Content Explorer',
      description: 'User focused on discovering and consuming content',
      email: 'explorer@test.com',
      role: 'user',
      purpose: 'Content discovery and community engagement',
      contentPattern: {
        createsContent: false,
        consumesContent: true,
        collaborates: false,
        setupsPerUser: 1,
        itemsPerSetup: 3,
        publicRatio: 0.9
      },
      behaviorPattern: {
        activityLevel: 'low',
        sessionDuration: 'short',
        featureUsage: ['browsing', 'favorites', 'reviews'],
        socialInteraction: 'minimal'
      },
      platformContext: {
        ...platformContext,
        accountType: 'personal'
      },
      authPreferences: {
        providers: ['email'],
        mfaEnabled: false,
        securityLevel: 'basic'
      }
    };
  }

  private createTeamManagerArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'team-manager',
      name: 'Team Manager',
      description: 'Team leader responsible for workspace and member management',
      email: 'manager@test.com',
      role: 'admin',
      purpose: 'Team leadership and project coordination',
      contentPattern: {
        createsContent: true,
        consumesContent: true,
        collaborates: true,
        setupsPerUser: 4,
        itemsPerSetup: 8,
        publicRatio: 0.3
      },
      behaviorPattern: {
        activityLevel: 'high',
        sessionDuration: 'long',
        featureUsage: ['team_management', 'project_planning', 'analytics', 'billing'],
        socialInteraction: 'active'
      },
      platformContext: {
        ...platformContext,
        accountType: 'team'
      },
      authPreferences: {
        providers: ['email', 'google', 'github'],
        mfaEnabled: true,
        securityLevel: 'enhanced'
      }
    };
  }

  private createTeamMemberArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'team-member',
      name: 'Team Member',
      description: 'Active team member focused on collaboration and productivity',
      email: 'member@test.com',
      role: 'member',
      purpose: 'Team collaboration and task execution',
      contentPattern: {
        createsContent: true,
        consumesContent: true,
        collaborates: true,
        setupsPerUser: 2,
        itemsPerSetup: 5,
        publicRatio: 0.2
      },
      behaviorPattern: {
        activityLevel: 'medium',
        sessionDuration: 'medium',
        featureUsage: ['collaboration', 'task_management', 'communication'],
        socialInteraction: 'active'
      },
      platformContext: {
        ...platformContext,
        accountType: 'team'
      },
      authPreferences: {
        providers: ['email', 'google'],
        mfaEnabled: false,
        securityLevel: 'basic'
      }
    };
  }

  private createTeamCollaboratorArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'team-collaborator',
      name: 'External Collaborator',
      description: 'External collaborator with limited team access',
      email: 'collaborator@test.com',
      role: 'user',
      purpose: 'External collaboration on specific projects',
      contentPattern: {
        createsContent: false,
        consumesContent: true,
        collaborates: true,
        setupsPerUser: 1,
        itemsPerSetup: 3,
        publicRatio: 0.1
      },
      behaviorPattern: {
        activityLevel: 'low',
        sessionDuration: 'short',
        featureUsage: ['viewing', 'commenting', 'limited_editing'],
        socialInteraction: 'moderate'
      },
      platformContext: {
        ...platformContext,
        accountType: 'personal'
      },
      authPreferences: {
        providers: ['email'],
        mfaEnabled: false,
        securityLevel: 'basic'
      }
    };
  }

  private createHybridPowerUserArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'hybrid-power-user',
      name: 'Power User',
      description: 'Advanced user utilizing both individual and team features',
      email: 'poweruser@test.com',
      role: 'user',
      purpose: 'Maximum platform utilization across individual and team contexts',
      contentPattern: {
        createsContent: true,
        consumesContent: true,
        collaborates: true,
        setupsPerUser: 6,
        itemsPerSetup: 12,
        publicRatio: 0.6
      },
      behaviorPattern: {
        activityLevel: 'high',
        sessionDuration: 'long',
        featureUsage: ['all_features', 'advanced_customization', 'integrations'],
        socialInteraction: 'active'
      },
      platformContext: {
        ...platformContext,
        accountType: 'personal'
      },
      authPreferences: {
        providers: ['email', 'google', 'github', 'discord'],
        mfaEnabled: true,
        securityLevel: 'enhanced'
      }
    };
  }

  private createHybridCasualUserArchetype(platformContext: PlatformContext): UserArchetype {
    return {
      id: 'hybrid-casual-user',
      name: 'Casual User',
      description: 'Casual user with occasional individual and team usage',
      email: 'casual@test.com',
      role: 'user',
      purpose: 'Flexible usage across individual and team scenarios',
      contentPattern: {
        createsContent: false,
        consumesContent: true,
        collaborates: false,
        setupsPerUser: 1,
        itemsPerSetup: 2,
        publicRatio: 0.9
      },
      behaviorPattern: {
        activityLevel: 'low',
        sessionDuration: 'short',
        featureUsage: ['basic_features', 'browsing'],
        socialInteraction: 'minimal'
      },
      platformContext: {
        ...platformContext,
        accountType: 'personal'
      },
      authPreferences: {
        providers: ['email'],
        mfaEnabled: false,
        securityLevel: 'basic'
      }
    };
  }
}