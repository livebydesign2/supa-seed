/**
 * Outdoor User Archetypes for Individual Creator Platforms
 * Generates realistic user personas for outdoor/adventure domain extensions
 * Part of Task 3.2.3: Create outdoor user archetypes (creator, explorer, guide) (FR-3.2)
 */

import { Logger } from '../../utils/logger';
import type { UserArchetype } from '../extension-types';
import type { OutdoorGearItem, GearSetup } from './outdoor-extension';

/**
 * Extended outdoor user archetype with outdoor-specific attributes
 */
export interface OutdoorUserArchetype extends UserArchetype {
  /** Outdoor-specific preferences */
  outdoorPreferences: {
    /** Primary activities */
    primaryActivities: string[];
    /** Secondary activities */
    secondaryActivities: string[];
    /** Experience level */
    experienceLevel: 'novice' | 'intermediate' | 'expert' | 'professional';
    /** Gear philosophy */
    gearPhilosophy: 'ultralight' | 'traditional' | 'luxury' | 'budget' | 'technical';
    /** Risk tolerance */
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    /** Preferred seasons */
    preferredSeasons: string[];
    /** Geographic preferences */
    preferredRegions: string[];
  };

  /** Content creation patterns specific to outdoor platforms */
  outdoorContentPattern: {
    /** Setup creation frequency */
    setupCreationFrequency: 'daily' | 'weekly' | 'monthly' | 'seasonal';
    /** Types of content created */
    contentTypes: ('gear_reviews' | 'trip_reports' | 'setup_guides' | 'tutorials' | 'photography')[];
    /** Sharing behavior */
    sharingBehavior: {
      /** Percentage of content made public */
      publicContentRatio: number;
      /** Social media cross-posting */
      crossPosts: boolean;
      /** Community engagement level */
      engagementLevel: 'low' | 'medium' | 'high' | 'very_high';
    };
    /** Review and rating patterns */
    reviewPatterns: {
      /** Likelihood to leave gear reviews */
      reviewsGear: boolean;
      /** Review detail level */
      reviewDepth: 'brief' | 'moderate' | 'detailed' | 'comprehensive';
      /** Photo inclusion rate */
      includesPhotos: number; // 0-1 probability
    };
  };

  /** Platform-specific behavior patterns */
  platformBehavior: {
    /** Login frequency */
    loginFrequency: 'daily' | 'weekly' | 'monthly';
    /** Session duration (minutes) */
    avgSessionDuration: number;
    /** Feature usage patterns */
    featureUsage: {
      browsesPublicSetups: boolean;
      followsOtherUsers: boolean;
      participatesInDiscussions: boolean;
      usesWishlist: boolean;
      tracksGearWeight: boolean;
      comparesPrices: boolean;
    };
    /** Notification preferences */
    notificationPreferences: {
      newFollowers: boolean;
      setupLikes: boolean;
      gearRecommendations: boolean;
      priceAlerts: boolean;
      communityUpdates: boolean;
    };
  };
}

/**
 * Outdoor User Archetype Generator
 * Creates realistic user personas for outdoor individual creator platforms like Wildernest
 */
export class OutdoorUserArchetypeGenerator {
  
  /**
   * Generate comprehensive set of outdoor user archetypes
   */
  static generateOutdoorArchetypes(): OutdoorUserArchetype[] {
    Logger.info('👥 Generating outdoor user archetypes for individual creator platform');

    return [
      this.generateCreatorArchetype(),
      this.generateExplorerArchetype(),
      this.generateGuideArchetype(),
      this.generateGearEnthusiastArchetype(),
      this.generateWeekendWarriorArchetype(),
      this.generateUltralightBackpackerArchetype()
    ];
  }

  /**
   * Generate primary creator archetype - the content creator and gear setup sharer
   */
  private static generateCreatorArchetype(): OutdoorUserArchetype {
    return {
      email: 'creator@wildernest.test',
      role: 'user',
      name: 'Alex Trail-Creator',
      purpose: 'Individual gear setup creator and adventure content sharer',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['gear_setups', 'trip_reports', 'gear_reviews', 'photography'],
          sharingPattern: 'public_focused'
        },
        engagement: {
          likesToShare: true,
          collaborationLevel: 'medium',  // Individual platform but engages with community
          communityParticipation: 'high'
        }
      },

      contentPattern: {
        setupsPerUser: 3, // Creates 3 new setups per month
        itemsPerSetup: 6, // Average 6 items per setup
        publicRatio: 0.8, // 80% of content is public
        preferredCategories: ['backpacking', 'day_hiking', 'photography']
      },

      preferences: {
        gearFocus: 'performance',
        budgetRange: 'mid-range',
        activities: ['backpacking', 'day_hiking', 'camping', 'outdoor_photography']
      },

      outdoorPreferences: {
        primaryActivities: ['backpacking', 'day_hiking'],
        secondaryActivities: ['camping', 'outdoor_photography', 'trail_running'],
        experienceLevel: 'intermediate',
        gearPhilosophy: 'traditional', // Balanced approach to gear selection
        riskTolerance: 'moderate',
        preferredSeasons: ['spring', 'summer', 'fall'],
        preferredRegions: ['mountains', 'forests', 'national_parks']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'weekly',
        contentTypes: ['gear_reviews', 'setup_guides', 'trip_reports', 'photography'],
        sharingBehavior: {
          publicContentRatio: 0.8,
          crossPosts: true, // Shares to social media
          engagementLevel: 'high'
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'detailed',
          includesPhotos: 0.9 // 90% of reviews include photos
        }
      },

      platformBehavior: {
        loginFrequency: 'daily',
        avgSessionDuration: 45, // 45 minutes average
        featureUsage: {
          browsesPublicSetups: true,
          followsOtherUsers: true,
          participatesInDiscussions: true,
          usesWishlist: true,
          tracksGearWeight: true,
          comparesPrices: false // More focused on performance than price
        },
        notificationPreferences: {
          newFollowers: true,
          setupLikes: true,
          gearRecommendations: true,
          priceAlerts: false,
          communityUpdates: true
        }
      }
    };
  }

  /**
   * Generate explorer archetype - the setup browser and community member
   */
  private static generateExplorerArchetype(): OutdoorUserArchetype {
    return {
      email: 'explorer@wildernest.test',
      role: 'user',
      name: 'Jordan Adventure-Explorer',
      purpose: 'Setup discoverer, reviewer, and active community member',
      
      behavior: {
        contentCreation: {
          frequency: 'monthly',
          types: ['gear_reviews', 'comments', 'ratings'],
          sharingPattern: 'community_focused'
        },
        engagement: {
          likesToShare: false, // More consumer than creator
          collaborationLevel: 'medium',
          communityParticipation: 'very_high'
        }
      },

      contentPattern: {
        setupsPerUser: 1, // Creates occasional setups
        itemsPerSetup: 4,
        publicRatio: 0.6,
        behaviors: ['browsesPublicSetups', 'leavesReviews', 'ratesGear', 'followsCreators']
      },

      preferences: {
        gearFocus: 'value',
        budgetRange: 'budget',
        activities: ['hiking', 'camping', 'fishing']
      },

      outdoorPreferences: {
        primaryActivities: ['day_hiking', 'camping'],
        secondaryActivities: ['fishing', 'nature_photography', 'geocaching'],
        experienceLevel: 'novice',
        gearPhilosophy: 'budget', // Cost-conscious gear selection
        riskTolerance: 'conservative',
        preferredSeasons: ['summer', 'fall'],
        preferredRegions: ['local_trails', 'state_parks', 'lakes']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'monthly',
        contentTypes: ['gear_reviews'],
        sharingBehavior: {
          publicContentRatio: 0.6,
          crossPosts: false,
          engagementLevel: 'very_high' // Active in discussions and comments
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'moderate',
          includesPhotos: 0.4 // 40% include photos
        }
      },

      platformBehavior: {
        loginFrequency: 'weekly',
        avgSessionDuration: 30, // 30 minutes browsing and reading
        featureUsage: {
          browsesPublicSetups: true, // Primary activity
          followsOtherUsers: true,
          participatesInDiscussions: true,
          usesWishlist: true,
          tracksGearWeight: false,
          comparesPrices: true // Very price-conscious
        },
        notificationPreferences: {
          newFollowers: false,
          setupLikes: false,
          gearRecommendations: true,
          priceAlerts: true, // Wants to know about deals
          communityUpdates: true
        }
      }
    };
  }

  /**
   * Generate guide archetype - the professional sharing expert setups
   */
  private static generateGuideArchetype(): OutdoorUserArchetype {
    return {
      email: 'guide@wildernest.test',
      role: 'user',
      name: 'Sam Mountain-Guide',
      purpose: 'Professional guide sharing expert setups and safety-focused content',
      
      behavior: {
        contentCreation: {
          frequency: 'bi-weekly',
          types: ['expert_setups', 'safety_guides', 'technique_tips', 'professional_reviews'],
          sharingPattern: 'educational_focused'
        },
        engagement: {
          likesToShare: true,
          collaborationLevel: 'high', // Mentors others
          communityParticipation: 'medium' // Quality over quantity
        }
      },

      contentPattern: {
        setupsPerUser: 6, // Creates detailed professional setups
        itemsPerSetup: 10, // Comprehensive professional kits
        publicRatio: 0.95, // Almost everything public for educational value
        preferredCategories: ['mountaineering', 'alpine_climbing', 'rescue', 'winter_sports']
      },

      preferences: {
        gearFocus: 'professional',
        budgetRange: 'premium',
        activities: ['mountaineering', 'alpine_climbing', 'backcountry_skiing', 'rescue_operations']
      },

      outdoorPreferences: {
        primaryActivities: ['mountaineering', 'alpine_climbing'],
        secondaryActivities: ['backcountry_skiing', 'ice_climbing', 'rescue_training'],
        experienceLevel: 'professional',
        gearPhilosophy: 'technical', // Safety and performance above all
        riskTolerance: 'moderate', // Calculated risks with safety systems
        preferredSeasons: ['all-season'], // Works year-round
        preferredRegions: ['high_mountains', 'alpine', 'glacier', 'remote_wilderness']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'weekly',
        contentTypes: ['setup_guides', 'tutorials', 'gear_reviews'],
        sharingBehavior: {
          publicContentRatio: 0.95,
          crossPosts: true, // Professional brand building
          engagementLevel: 'medium' // Selective but valuable engagement
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'comprehensive', // Professional detailed reviews
          includesPhotos: 0.95 // Nearly always includes field photos
        }
      },

      platformBehavior: {
        loginFrequency: 'daily',
        avgSessionDuration: 60, // Longer sessions for detailed content creation
        featureUsage: {
          browsesPublicSetups: false, // Creates more than consumes
          followsOtherUsers: false, // Professional focus
          participatesInDiscussions: true, // Provides expert advice
          usesWishlist: false,
          tracksGearWeight: true, // Professional attention to detail
          comparesPrices: false // Quality over cost
        },
        notificationPreferences: {
          newFollowers: false,
          setupLikes: false,
          gearRecommendations: false,
          priceAlerts: false,
          communityUpdates: false // Minimal distractions
        }
      }
    };
  }

  /**
   * Generate gear enthusiast archetype - focused on gear research and collection
   */
  private static generateGearEnthusiastArchetype(): OutdoorUserArchetype {
    return {
      email: 'gearhead@wildernest.test',
      role: 'user',
      name: 'Casey Gear-Enthusiast',
      purpose: 'Gear collector and detailed reviewer focused on equipment analysis',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['gear_reviews', 'comparisons', 'technical_analysis'],
          sharingPattern: 'expertise_focused'
        },
        engagement: {
          likesToShare: true,
          collaborationLevel: 'low', // Individual focus on gear
          communityParticipation: 'medium'
        }
      },

      contentPattern: {
        setupsPerUser: 4, // Creates specialized setups
        itemsPerSetup: 8,
        publicRatio: 0.85,
        preferredCategories: ['gear_testing', 'technical_analysis', 'weight_optimization']
      },

      preferences: {
        gearFocus: 'innovation',
        budgetRange: 'premium',
        activities: ['gear_testing', 'ultralight_backpacking', 'technical_climbing']
      },

      outdoorPreferences: {
        primaryActivities: ['ultralight_backpacking', 'gear_testing'],
        secondaryActivities: ['day_hiking', 'minimalist_camping'],
        experienceLevel: 'expert',
        gearPhilosophy: 'ultralight', // Obsessed with weight and efficiency
        riskTolerance: 'moderate',
        preferredSeasons: ['spring', 'summer', 'fall'],
        preferredRegions: ['long_distance_trails', 'wilderness_areas']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'weekly',
        contentTypes: ['gear_reviews', 'tutorials'],
        sharingBehavior: {
          publicContentRatio: 0.85,
          crossPosts: false,
          engagementLevel: 'medium'
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'comprehensive',
          includesPhotos: 0.8
        }
      },

      platformBehavior: {
        loginFrequency: 'daily',
        avgSessionDuration: 55,
        featureUsage: {
          browsesPublicSetups: true,
          followsOtherUsers: false,
          participatesInDiscussions: true,
          usesWishlist: true,
          tracksGearWeight: true, // Obsessive about weight tracking
          comparesPrices: true
        },
        notificationPreferences: {
          newFollowers: false,
          setupLikes: false,
          gearRecommendations: true,
          priceAlerts: true,
          communityUpdates: false
        }
      }
    };
  }

  /**
   * Generate weekend warrior archetype - casual but regular outdoor enthusiast
   */
  private static generateWeekendWarriorArchetype(): OutdoorUserArchetype {
    return {
      email: 'weekend@wildernest.test',
      role: 'user',
      name: 'Riley Weekend-Warrior',
      purpose: 'Regular weekend adventurer seeking reliable gear and inspiration',
      
      behavior: {
        contentCreation: {
          frequency: 'monthly',
          types: ['trip_reports', 'photography', 'gear_reviews'],
          sharingPattern: 'social_focused'
        },
        engagement: {
          likesToShare: true,
          collaborationLevel: 'medium',
          communityParticipation: 'high'
        }
      },

      contentPattern: {
        setupsPerUser: 2,
        itemsPerSetup: 5,
        publicRatio: 0.9, // Loves sharing adventures
        preferredCategories: ['weekend_trips', 'day_hiking', 'car_camping']
      },

      preferences: {
        gearFocus: 'reliability',
        budgetRange: 'mid-range',
        activities: ['day_hiking', 'car_camping', 'fishing', 'photography']
      },

      outdoorPreferences: {
        primaryActivities: ['day_hiking', 'car_camping'],
        secondaryActivities: ['fishing', 'outdoor_photography', 'kayaking'],
        experienceLevel: 'intermediate',
        gearPhilosophy: 'traditional',
        riskTolerance: 'conservative',
        preferredSeasons: ['spring', 'summer', 'fall'],
        preferredRegions: ['local_mountains', 'state_parks', 'nearby_wilderness']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'monthly',
        contentTypes: ['trip_reports', 'photography'],
        sharingBehavior: {
          publicContentRatio: 0.9,
          crossPosts: true, // Shares to social media
          engagementLevel: 'high'
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'moderate',
          includesPhotos: 0.7
        }
      },

      platformBehavior: {
        loginFrequency: 'weekly',
        avgSessionDuration: 25,
        featureUsage: {
          browsesPublicSetups: true,
          followsOtherUsers: true,
          participatesInDiscussions: true,
          usesWishlist: true,
          tracksGearWeight: false,
          comparesPrices: true
        },
        notificationPreferences: {
          newFollowers: true,
          setupLikes: true,
          gearRecommendations: true,
          priceAlerts: true,
          communityUpdates: true
        }
      }
    };
  }

  /**
   * Generate ultralight backpacker archetype - minimalist focused on weight optimization
   */
  private static generateUltralightBackpackerArchetype(): OutdoorUserArchetype {
    return {
      email: 'ultralight@wildernest.test',
      role: 'user',
      name: 'Morgan Ultralight-Hiker',
      purpose: 'Minimalist hiker obsessed with ultralight gear and weight optimization',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['weight_breakdowns', 'gear_modifications', 'ultralight_tips'],
          sharingPattern: 'niche_focused'
        },
        engagement: {
          likesToShare: true,
          collaborationLevel: 'high', // Active in ultralight community
          communityParticipation: 'high'
        }
      },

      contentPattern: {
        setupsPerUser: 5, // Creates multiple weight-optimized setups
        itemsPerSetup: 12, // Detailed breakdowns with alternatives
        publicRatio: 0.95, // Shares knowledge freely
        preferredCategories: ['ultralight', 'weight_optimization', 'gear_modification']
      },

      preferences: {
        gearFocus: 'weight',
        budgetRange: 'premium', // Invests in ultralight gear
        activities: ['thru_hiking', 'fastpacking', 'long_distance_backpacking']
      },

      outdoorPreferences: {
        primaryActivities: ['thru_hiking', 'long_distance_backpacking'],
        secondaryActivities: ['fastpacking', 'trail_running'],
        experienceLevel: 'expert',
        gearPhilosophy: 'ultralight',
        riskTolerance: 'aggressive', // Comfortable with minimal gear
        preferredSeasons: ['spring', 'summer', 'fall'],
        preferredRegions: ['long_distance_trails', 'desert', 'alpine']
      },

      outdoorContentPattern: {
        setupCreationFrequency: 'weekly',
        contentTypes: ['setup_guides', 'tutorials'],
        sharingBehavior: {
          publicContentRatio: 0.95,
          crossPosts: false, // Niche community focused
          engagementLevel: 'high'
        },
        reviewPatterns: {
          reviewsGear: true,
          reviewDepth: 'comprehensive',
          includesPhotos: 0.9
        }
      },

      platformBehavior: {
        loginFrequency: 'daily',
        avgSessionDuration: 40,
        featureUsage: {
          browsesPublicSetups: true,
          followsOtherUsers: true,
          participatesInDiscussions: true,
          usesWishlist: false, // Already knows what they want
          tracksGearWeight: true, // Obsessive weight tracking
          comparesPrices: false // Weight is more important than price
        },
        notificationPreferences: {
          newFollowers: false,
          setupLikes: false,
          gearRecommendations: true, // New ultralight gear
          priceAlerts: false,
          communityUpdates: true
        }
      }
    };
  }

  /**
   * Generate contextual user behavior based on archetype and current conditions
   */
  static generateContextualBehavior(
    archetype: OutdoorUserArchetype,
    context: {
      season: string;
      dayOfWeek: string;
      timeOfDay: string;
    }
  ): {
    likelihood: number; // 0-1 probability of being active
    expectedActions: string[];
    sessionDuration: number; // minutes
  } {
    let likelihood = 0.5; // Base likelihood
    const expectedActions: string[] = [];
    let sessionDuration = archetype.platformBehavior.avgSessionDuration;

    // Adjust based on login frequency
    if (archetype.platformBehavior.loginFrequency === 'daily') {
      likelihood += 0.3;
    } else if (archetype.platformBehavior.loginFrequency === 'weekly') {
      likelihood += (context.dayOfWeek === 'saturday' || context.dayOfWeek === 'sunday') ? 0.4 : 0.1;
    }

    // Adjust based on time of day
    if (context.timeOfDay === 'evening') {
      likelihood += 0.2; // People browse more in evening
      sessionDuration *= 1.2;
    } else if (context.timeOfDay === 'morning') {
      likelihood += 0.1;
    }

    // Adjust based on season preferences
    if (archetype.outdoorPreferences.preferredSeasons.includes(context.season)) {
      likelihood += 0.2;
      expectedActions.push('browse_seasonal_setups', 'plan_trips');
    }

    // Determine likely actions based on archetype
    if (archetype.outdoorContentPattern.setupCreationFrequency === 'weekly' && 
        (context.dayOfWeek === 'saturday' || context.dayOfWeek === 'sunday')) {
      expectedActions.push('create_setup', 'upload_photos');
      sessionDuration *= 1.5;
    }

    if (archetype.platformBehavior.featureUsage.browsesPublicSetups) {
      expectedActions.push('browse_setups', 'like_content');
    }

    if (archetype.outdoorContentPattern.reviewPatterns.reviewsGear) {
      expectedActions.push('write_review', 'rate_gear');
    }

    return {
      likelihood: Math.min(1, likelihood),
      expectedActions,
      sessionDuration: Math.round(sessionDuration)
    };
  }

  /**
   * Generate gear preferences for an archetype based on their profile
   */
  static generateGearPreferences(archetype: OutdoorUserArchetype): {
    preferredBrands: string[];
    avoidedBrands: string[];
    priceRange: { min: number; max: number };
    keyFeatures: string[];
    dealBreakers: string[];
  } {
    const preferences = {
      preferredBrands: [] as string[],
      avoidedBrands: [] as string[],
      priceRange: { min: 0, max: 1000 },
      keyFeatures: [] as string[],
      dealBreakers: [] as string[]
    };

    // Set preferences based on gear philosophy
    switch (archetype.outdoorPreferences.gearPhilosophy) {
      case 'ultralight':
        preferences.preferredBrands = ['Zpacks', 'Hyperlite Mountain Gear', 'Gossamer Gear'];
        preferences.avoidedBrands = ['Coleman', 'Ozark Trail'];
        preferences.priceRange = { min: 100, max: 800 };
        preferences.keyFeatures = ['lightweight', 'packable', 'minimal'];
        preferences.dealBreakers = ['heavy', 'bulky'];
        break;

      case 'budget':
        preferences.preferredBrands = ['Coleman', 'Kelty', 'Teton Sports'];
        preferences.avoidedBrands = ['Arc\'teryx', 'Patagonia'];
        preferences.priceRange = { min: 20, max: 200 };
        preferences.keyFeatures = ['affordable', 'reliable', 'durable'];
        preferences.dealBreakers = ['expensive', 'premium-only'];
        break;

      case 'technical':
        preferences.preferredBrands = ['Black Diamond', 'Petzl', 'Arc\'teryx'];
        preferences.avoidedBrands = ['Coleman', 'generic'];
        preferences.priceRange = { min: 150, max: 1200 };
        preferences.keyFeatures = ['technical', 'professional-grade', 'safety-certified'];
        preferences.dealBreakers = ['non-certified', 'recreational-only'];
        break;

      case 'luxury':
        preferences.preferredBrands = ['Arc\'teryx', 'Patagonia', 'The North Face'];
        preferences.avoidedBrands = ['Coleman', 'budget brands'];
        preferences.priceRange = { min: 200, max: 2000 };
        preferences.keyFeatures = ['premium materials', 'innovative design', 'brand prestige'];
        preferences.dealBreakers = ['cheap materials', 'poor craftsmanship'];
        break;

      default: // traditional
        preferences.preferredBrands = ['REI Co-op', 'Osprey', 'MSR'];
        preferences.priceRange = { min: 50, max: 500 };
        preferences.keyFeatures = ['reliable', 'proven design', 'good value'];
        preferences.dealBreakers = ['untested', 'gimmicky'];
    }

    return preferences;
  }

  /**
   * Simulate user's response to a gear setup based on their archetype
   */
  static simulateSetupResponse(
    archetype: OutdoorUserArchetype,
    setup: GearSetup
  ): {
    wouldView: boolean;
    wouldLike: boolean;
    wouldComment: boolean;
    wouldShare: boolean;
    commentStyle: 'brief' | 'detailed' | 'technical' | 'enthusiastic';
    rating?: number; // 1-5 stars
  } {
    let interestScore = 0;

    // Check activity alignment
    if (archetype.outdoorPreferences.primaryActivities.includes(setup.activity)) {
      interestScore += 0.4;
    } else if (archetype.outdoorPreferences.secondaryActivities.includes(setup.activity)) {
      interestScore += 0.2;
    }

    // Check difficulty alignment
    const userExperience = archetype.outdoorPreferences.experienceLevel;
    if ((userExperience === 'novice' && setup.difficulty === 'beginner') ||
        (userExperience === 'intermediate' && ['beginner', 'intermediate'].includes(setup.difficulty)) ||
        (userExperience === 'expert' && setup.difficulty === 'advanced') ||
        (userExperience === 'professional' && setup.difficulty === 'advanced')) {
      interestScore += 0.2;
    }

    // Check price alignment
    const gearPrefs = this.generateGearPreferences(archetype);
    const avgItemPrice = setup.totalPrice / setup.items.length;
    if (avgItemPrice >= gearPrefs.priceRange.min && avgItemPrice <= gearPrefs.priceRange.max) {
      interestScore += 0.2;
    }

    // Check gear philosophy alignment
    const hasPreferredFeatures = setup.items.some(item => 
      gearPrefs.keyFeatures.some(feature => 
        item.features.some(itemFeature => 
          itemFeature.toLowerCase().includes(feature.toLowerCase())
        )
      )
    );
    if (hasPreferredFeatures) {
      interestScore += 0.2;
    }

    const wouldView = interestScore > 0.3;
    const wouldLike = interestScore > 0.5;
    const wouldComment = interestScore > 0.6 && archetype.platformBehavior.featureUsage.participatesInDiscussions;
    const wouldShare = interestScore > 0.7 && archetype.behavior.engagement.likesToShare;

    // Determine comment style based on archetype
    let commentStyle: 'brief' | 'detailed' | 'technical' | 'enthusiastic' = 'brief';
    if (archetype.outdoorContentPattern.reviewPatterns.reviewDepth === 'comprehensive') {
      commentStyle = 'technical';
    } else if (archetype.outdoorContentPattern.reviewPatterns.reviewDepth === 'detailed') {
      commentStyle = 'detailed';
    } else if (archetype.behavior.engagement.communityParticipation === 'very_high') {
      commentStyle = 'enthusiastic';
    }

    // Generate rating based on interest score
    const rating = wouldView ? Math.max(1, Math.min(5, Math.round(interestScore * 5 + Math.random() - 0.5))) : undefined;

    return {
      wouldView,
      wouldLike,
      wouldComment,
      wouldShare,
      commentStyle,
      rating
    };
  }
}