/**
 * Outdoor Storage Configuration and Media Generation
 * Handles adventure photography, gear images, and domain-specific storage patterns
 * Part of Task 3.2.4: Add outdoor storage configuration and media generation (FR-3.2)
 */

import { Logger } from '../../utils/logger';
import type { StorageConfig } from '../extension-types';

/**
 * Adventure media category for realistic outdoor content
 */
export interface AdventureMediaCategory {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  imageProviders: MediaProvider[];
  videoProviders: MediaProvider[];
  commonUseCases: string[];
  seasonalAvailability: Record<string, number>; // season -> availability multiplier
}

/**
 * Media provider configuration
 */
export interface MediaProvider {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  supportedFormats: string[];
  supportedSizes: string[];
  qualityLevels: ('low' | 'medium' | 'high' | 'ultra')[];
}

/**
 * Storage bucket configuration for outdoor content
 */
export interface OutdoorStorageBucket {
  name: string;
  purpose: string;
  publicAccess: boolean;
  allowedFileTypes: string[];
  maxFileSize: number; // bytes
  folder: string;
  rls: {
    enabled: boolean;
    policy: string;
    readRoles: string[];
    writeRoles: string[];
  };
  compression: {
    enabled: boolean;
    quality: number; // 0-100
    formats: string[];
  };
  cdn: {
    enabled: boolean;
    provider?: string;
    customDomain?: string;
  };
  lifecycle: {
    deleteAfterDays?: number;
    archiveAfterDays?: number;
    transitionToIA?: number; // days before transitioning to Infrequent Access
  };
}

/**
 * Generated media item with metadata
 */
export interface GeneratedMediaItem {
  id: string;
  type: 'image' | 'video' | 'document';
  category: string;
  url: string;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    dimensions?: { width: number; height: number };
    fileSize: number; // bytes
    format: string;
    source: string;
    generatedAt: number;
  };
  outdoorSpecific: {
    activity: string;
    location: string;
    season: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    weatherConditions: string;
    timeOfDay: 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';
  };
  usage: {
    purpose: ('gear_photo' | 'adventure_shot' | 'setup_demo' | 'action_shot' | 'landscape')[];
    suitableFor: string[]; // gear categories or content types
    averageEngagement: number; // estimated engagement multiplier
  };
}

/**
 * Outdoor Storage and Media Generator
 * Generates adventure-focused storage configurations and realistic outdoor media
 */
export class OutdoorStorageGenerator {
  private mediaCategories: Map<string, AdventureMediaCategory> = new Map();
  private mediaProviders: Map<string, MediaProvider> = new Map();
  private generatedMedia: Map<string, GeneratedMediaItem[]> = new Map();

  constructor() {
    this.initializeMediaCategories();
    this.initializeMediaProviders();
  }

  /**
   * Initialize adventure media categories with realistic outdoor content
   */
  private initializeMediaCategories(): void {
    const categories: AdventureMediaCategory[] = [
      {
        id: 'adventure_landscapes',
        name: 'Adventure Landscapes',
        description: 'Scenic outdoor locations perfect for adventure content',
        keywords: ['mountain', 'forest', 'wilderness', 'trail', 'summit', 'valley', 'alpine'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: ['pexels_video'],
        commonUseCases: ['setup_backgrounds', 'hero_images', 'trip_reports'],
        seasonalAvailability: {
          spring: 1.2,
          summer: 1.5,
          fall: 1.3,
          winter: 0.8
        }
      },
      {
        id: 'gear_in_action',
        name: 'Gear in Action',
        description: 'Equipment being used in real outdoor scenarios',
        keywords: ['gear', 'equipment', 'backpack', 'tent', 'hiking', 'camping', 'action'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: ['pexels_video'],
        commonUseCases: ['gear_reviews', 'setup_demos', 'how_to_guides'],
        seasonalAvailability: {
          spring: 1.0,
          summer: 1.3,
          fall: 1.1,
          winter: 0.9
        }
      },
      {
        id: 'adventure_portraits',
        name: 'Adventure Portraits',
        description: 'People engaged in outdoor activities',
        keywords: ['hiker', 'climber', 'adventurer', 'outdoor', 'portrait', 'action'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: ['pexels_video'],
        commonUseCases: ['user_avatars', 'testimonials', 'community_content'],
        seasonalAvailability: {
          spring: 1.1,
          summer: 1.4,
          fall: 1.2,
          winter: 0.8
        }
      },
      {
        id: 'technical_details',
        name: 'Technical Details',
        description: 'Close-up shots of gear features and technical details',
        keywords: ['detail', 'feature', 'technical', 'close-up', 'material', 'construction'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: [],
        commonUseCases: ['gear_reviews', 'feature_highlights', 'comparison_shots'],
        seasonalAvailability: {
          spring: 1.0,
          summer: 1.0,
          fall: 1.0,
          winter: 1.0
        }
      },
      {
        id: 'adventure_activities',
        name: 'Adventure Activities',
        description: 'Specific outdoor activities and sports',
        keywords: ['climbing', 'hiking', 'camping', 'kayaking', 'skiing', 'mountaineering'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: ['pexels_video'],
        commonUseCases: ['activity_guides', 'inspiration_content', 'setup_contexts'],
        seasonalAvailability: {
          spring: 1.1,
          summer: 1.3,
          fall: 1.2,
          winter: 1.1
        }
      },
      {
        id: 'weather_conditions',
        name: 'Weather Conditions',
        description: 'Various weather conditions for gear testing contexts',
        keywords: ['rain', 'snow', 'sun', 'wind', 'storm', 'weather', 'conditions'],
        imageProviders: ['unsplash', 'pexels'],
        videoProviders: ['pexels_video'],
        commonUseCases: ['gear_testing', 'weather_appropriateness', 'durability_demos'],
        seasonalAvailability: {
          spring: 1.2,
          summer: 0.9,
          fall: 1.3,
          winter: 1.4
        }
      }
    ];

    for (const category of categories) {
      this.mediaCategories.set(category.id, category);
    }

    Logger.debug(`✅ Initialized ${categories.length} adventure media categories`);
  }

  /**
   * Initialize media provider configurations
   */
  private initializeMediaProviders(): void {
    const providers: MediaProvider[] = [
      {
        name: 'unsplash',
        baseUrl: 'https://source.unsplash.com',
        rateLimit: {
          requestsPerMinute: 50,
          requestsPerDay: 5000
        },
        supportedFormats: ['jpg', 'webp'],
        supportedSizes: ['400x300', '800x600', '1200x800', '1920x1080'],
        qualityLevels: ['medium', 'high', 'ultra']
      },
      {
        name: 'pexels',
        baseUrl: 'https://images.pexels.com/photos',
        rateLimit: {
          requestsPerMinute: 200,
          requestsPerDay: 20000
        },
        supportedFormats: ['jpg', 'png', 'webp'],
        supportedSizes: ['400x300', '800x600', '1200x800', '1920x1080', '2560x1440'],
        qualityLevels: ['low', 'medium', 'high', 'ultra']
      },
      {
        name: 'pexels_video',
        baseUrl: 'https://videos.pexels.com',
        rateLimit: {
          requestsPerMinute: 100,
          requestsPerDay: 10000
        },
        supportedFormats: ['mp4', 'webm'],
        supportedSizes: ['720p', '1080p', '4k'],
        qualityLevels: ['medium', 'high', 'ultra']
      }
    ];

    for (const provider of providers) {
      this.mediaProviders.set(provider.name, provider);
    }

    Logger.debug(`✅ Initialized ${providers.length} media providers`);
  }

  /**
   * Generate comprehensive outdoor storage configuration
   */
  generateOutdoorStorageConfig(): StorageConfig {
    Logger.info('🗄️ Generating outdoor storage configuration');

    const buckets: OutdoorStorageBucket[] = [
      {
        name: 'adventure-photos',
        purpose: 'User-uploaded adventure and trip photos',
        publicAccess: true,
        allowedFileTypes: [
          'image/jpeg', 
          'image/png', 
          'image/webp', 
          'image/heic', // iPhone photos
          'image/tiff'
        ],
        maxFileSize: 15 * 1024 * 1024, // 15MB for high-res adventure photos
        folder: 'adventures/',
        rls: {
          enabled: true,
          policy: 'authenticated users can upload, public can view',
          readRoles: ['public'],
          writeRoles: ['authenticated']
        },
        compression: {
          enabled: true,
          quality: 85, // Good balance for outdoor photos
          formats: ['jpg', 'webp']
        },
        cdn: {
          enabled: true,
          provider: 'cloudflare',
          customDomain: 'media.wildernest.com'
        },
        lifecycle: {
          archiveAfterDays: 365, // Archive old photos after 1 year
          transitionToIA: 90 // Move to cheaper storage after 3 months
        }
      },
      {
        name: 'gear-images',
        purpose: 'Gear photos, product shots, and setup demonstrations',
        publicAccess: true,
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/webp'
        ],
        maxFileSize: 8 * 1024 * 1024, // 8MB for gear photos
        folder: 'gear/',
        rls: {
          enabled: true,
          policy: 'authenticated users can upload, public can view',
          readRoles: ['public'],
          writeRoles: ['authenticated']
        },
        compression: {
          enabled: true,
          quality: 90, // Higher quality for gear detail shots
          formats: ['jpg', 'webp']
        },
        cdn: {
          enabled: true,
          provider: 'cloudflare'
        },
        lifecycle: {
          // Gear photos rarely deleted - they're reference content
          transitionToIA: 180
        }
      },
      {
        name: 'setup-attachments',
        purpose: 'Setup documentation, PDFs, and supplementary files',
        publicAccess: false,
        allowedFileTypes: [
          'application/pdf',
          'text/plain',
          'application/json',
          'text/markdown',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // Excel files for gear lists
        ],
        maxFileSize: 5 * 1024 * 1024, // 5MB for documents
        folder: 'setups/',
        rls: {
          enabled: true,
          policy: 'owner can manage, followers can view if setup is public',
          readRoles: ['owner', 'followers'],
          writeRoles: ['owner']
        },
        compression: {
          enabled: false, // Don't compress documents
          quality: 100,
          formats: []
        },
        cdn: {
          enabled: false // Private documents don't need CDN
        },
        lifecycle: {
          deleteAfterDays: 1095 // Delete after 3 years if unused
        }
      },
      {
        name: 'user-avatars',
        purpose: 'User profile photos and avatar images',
        publicAccess: true,
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/webp'
        ],
        maxFileSize: 2 * 1024 * 1024, // 2MB for avatars
        folder: 'avatars/',
        rls: {
          enabled: true,
          policy: 'owner can manage, public can view',
          readRoles: ['public'],
          writeRoles: ['owner']
        },
        compression: {
          enabled: true,
          quality: 80, // Acceptable quality for avatars
          formats: ['jpg', 'webp']
        },
        cdn: {
          enabled: true,
          provider: 'cloudflare'
        },
        lifecycle: {
          // Avatars are persistent
          transitionToIA: 365
        }
      },
      {
        name: 'generated-content',
        purpose: 'AI-generated or placeholder images for seeding',
        publicAccess: true,
        allowedFileTypes: [
          'image/jpeg',
          'image/png',
          'image/webp'
        ],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        folder: 'generated/',
        rls: {
          enabled: false, // System-generated content
          policy: 'public read access',
          readRoles: ['public'],
          writeRoles: ['system']
        },
        compression: {
          enabled: true,
          quality: 85,
          formats: ['jpg', 'webp']
        },
        cdn: {
          enabled: true,
          provider: 'cloudflare'
        },
        lifecycle: {
          // Generated content can be recreated
          archiveAfterDays: 180
        }
      }
    ];

    const mediaGeneration = {
      enabled: true,
      categories: Array.from(this.mediaCategories.keys()),
      providers: {
        primary: 'unsplash',
        fallback: 'pexels',
        video: 'pexels_video'
      },
      apiEndpoints: {
        adventure: 'https://source.unsplash.com/1200x800/?adventure,outdoor,hiking',
        gear: 'https://source.unsplash.com/800x600/?gear,equipment,outdoor',
        landscape: 'https://source.unsplash.com/1920x1080/?mountain,forest,wilderness',
        activity: 'https://source.unsplash.com/1200x800/?climbing,hiking,camping'
      },
      fallbackImages: [
        '/assets/placeholders/gear-placeholder.jpg',
        '/assets/placeholders/adventure-placeholder.jpg',
        '/assets/placeholders/outdoor-placeholder.jpg',
        '/assets/placeholders/landscape-placeholder.jpg'
      ],
      generation: {
        batchSize: 10, // Generate 10 images at a time
        rateLimit: 50, // 50 requests per minute
        retryAttempts: 3,
        cacheDuration: 86400 // Cache for 24 hours
      }
    };

    return {
      buckets: buckets.map(bucket => ({
        name: bucket.name,
        publicAccess: bucket.publicAccess,
        allowedFileTypes: bucket.allowedFileTypes,
        maxFileSize: bucket.maxFileSize,
        folder: bucket.folder,
        rls: bucket.rls
      })),
      mediaGeneration
    };
  }

  /**
   * Generate adventure-specific media items for seeding
   */
  async generateAdventureMedia(
    count: number = 50,
    categories: string[] = [],
    season: string = 'summer'
  ): Promise<GeneratedMediaItem[]> {
    Logger.info(`🖼️ Generating ${count} adventure media items for ${season}`);

    const mediaItems: GeneratedMediaItem[] = [];
    const targetCategories = categories.length > 0 
      ? categories 
      : Array.from(this.mediaCategories.keys());

    for (let i = 0; i < count; i++) {
      const category = targetCategories[i % targetCategories.length];
      const categoryData = this.mediaCategories.get(category);
      
      if (!categoryData) {
        Logger.warn(`⚠️ Unknown media category: ${category}`);
        continue;
      }

      const mediaItem = await this.generateSingleMediaItem(categoryData, season, i);
      mediaItems.push(mediaItem);
    }

    // Store generated media for future reference
    this.generatedMedia.set(`${season}_${Date.now()}`, mediaItems);

    Logger.info(`✅ Generated ${mediaItems.length} adventure media items`);
    return mediaItems;
  }

  /**
   * Generate a single media item with realistic outdoor metadata
   */
  private async generateSingleMediaItem(
    category: AdventureMediaCategory,
    season: string,
    index: number
  ): Promise<GeneratedMediaItem> {
    // Select random keyword for this item
    const keyword = category.keywords[Math.floor(Math.random() * category.keywords.length)];
    
    // Select provider based on category
    const providerName = category.imageProviders[Math.floor(Math.random() * category.imageProviders.length)];
    const provider = this.mediaProviders.get(providerName);
    
    if (!provider) {
      throw new Error(`Media provider not found: ${providerName}`);
    }

    // Generate realistic dimensions
    const size = provider.supportedSizes[Math.floor(Math.random() * provider.supportedSizes.length)];
    const [width, height] = size.split('x').map(Number);

    // Generate realistic URL (in production, this would make actual API calls)
    const url = this.generateMediaUrl(provider, keyword, size);

    // Generate outdoor-specific metadata
    const outdoorSpecific = this.generateOutdoorMetadata(category, season);
    
    // Generate usage information
    const usage = this.generateUsageMetadata(category, outdoorSpecific);

    const mediaItem: GeneratedMediaItem = {
      id: `${category.id}_${index + 1}_${Date.now()}`,
      type: 'image',
      category: category.id,
      url,
      metadata: {
        title: this.generateMediaTitle(keyword, outdoorSpecific),
        description: this.generateMediaDescription(category, outdoorSpecific),
        tags: this.generateMediaTags(category, outdoorSpecific, keyword),
        dimensions: { width, height },
        fileSize: this.estimateFileSize(width, height),
        format: 'jpg',
        source: providerName,
        generatedAt: Date.now()
      },
      outdoorSpecific,
      usage
    };

    return mediaItem;
  }

  /**
   * Generate realistic outdoor-specific metadata
   */
  private generateOutdoorMetadata(category: AdventureMediaCategory, season: string) {
    const activities = ['hiking', 'camping', 'climbing', 'backpacking', 'kayaking', 'skiing'];
    const locations = ['mountains', 'forest', 'desert', 'coastline', 'alpine', 'valley', 'canyon'];
    const difficulties = ['beginner', 'intermediate', 'advanced'] as const;
    const weatherConditions = ['sunny', 'cloudy', 'overcast', 'misty', 'clear', 'dramatic'];
    const timesOfDay = ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const;

    return {
      activity: activities[Math.floor(Math.random() * activities.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      season,
      difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
      weatherConditions: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
      timeOfDay: timesOfDay[Math.floor(Math.random() * timesOfDay.length)]
    };
  }

  /**
   * Generate usage metadata for media items
   */
  private generateUsageMetadata(category: AdventureMediaCategory, outdoorData: any) {
    const purposes = ['gear_photo', 'adventure_shot', 'setup_demo', 'action_shot', 'landscape'] as const;
    const suitableFor = [
      'backpack_reviews',
      'tent_setups',
      'hiking_guides',
      'gear_comparisons',
      'adventure_blogs',
      'social_media',
      'product_photos'
    ];

    // Select 1-3 purposes based on category
    const filteredPurposes = purposes.filter(() => Math.random() > 0.6);
    const selectedPurposes = filteredPurposes.length > 0 
      ? filteredPurposes.slice(0, 3)
      : ['adventure_shot' as const]; // Ensure at least one purpose

    // Select 2-4 suitable use cases
    const selectedSuitableFor = suitableFor
      .filter(() => Math.random() > 0.5)
      .slice(0, 4);

    // Generate engagement score based on category and outdoor data
    let engagementScore = 0.5; // Base score
    
    if (category.id === 'adventure_landscapes') engagementScore += 0.2;
    if (category.id === 'gear_in_action') engagementScore += 0.3;
    if (outdoorData.timeOfDay === 'dawn' || outdoorData.timeOfDay === 'dusk') engagementScore += 0.1;
    if (outdoorData.weatherConditions === 'dramatic') engagementScore += 0.1;

    return {
      purpose: selectedPurposes,
      suitableFor: selectedSuitableFor,
      averageEngagement: Math.min(1.0, engagementScore)
    };
  }

  /**
   * Generate realistic media URL (placeholder - in production would use real APIs)
   */
  private generateMediaUrl(provider: MediaProvider, keyword: string, size: string): string {
    const encodedKeyword = encodeURIComponent(keyword);
    const randomId = Math.floor(Math.random() * 1000000);
    
    switch (provider.name) {
      case 'unsplash':
        return `${provider.baseUrl}/${size}/?${encodedKeyword}&sig=${randomId}`;
      case 'pexels':
        return `${provider.baseUrl}/${randomId}/pexels-photo-${randomId}.jpeg?auto=compress&cs=tinysrgb&w=${size.split('x')[0]}`;
      default:
        return `${provider.baseUrl}/${size}/${encodedKeyword}/${randomId}`;
    }
  }

  /**
   * Generate descriptive title for media item
   */
  private generateMediaTitle(keyword: string, outdoorData: any): string {
    const { activity, location, timeOfDay, weatherConditions } = outdoorData;
    
    const templates = [
      `${keyword} ${activity} in ${location}`,
      `${weatherConditions} ${keyword} during ${activity}`,
      `${timeOfDay} ${keyword} adventure in ${location}`,
      `${keyword} gear for ${activity} in ${weatherConditions} conditions`
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];
    return this.capitalizeWords(template);
  }

  /**
   * Generate descriptive text for media item
   */
  private generateMediaDescription(category: AdventureMediaCategory, outdoorData: any): string {
    const { activity, location, season, difficulty, weatherConditions, timeOfDay } = outdoorData;
    
    const descriptions = [
      `Perfect ${season} ${activity} conditions in ${location} during ${timeOfDay}. ${this.capitalizeWords(weatherConditions)} weather creates ideal conditions for ${difficulty}-level adventures.`,
      `Stunning ${location} scenery captured during a ${activity} expedition. This ${timeOfDay} shot showcases the beauty of ${season} outdoor adventures.`,
      `${this.capitalizeWords(difficulty)} ${activity} adventure in ${location}. ${this.capitalizeWords(weatherConditions)} conditions make for dramatic outdoor photography.`
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate relevant tags for media item
   */
  private generateMediaTags(category: AdventureMediaCategory, outdoorData: any, keyword: string): string[] {
    const baseTags = [
      keyword,
      outdoorData.activity,
      outdoorData.location,
      outdoorData.season,
      outdoorData.difficulty,
      'outdoor',
      'adventure'
    ];

    const additionalTags = [
      'gear',
      'hiking',
      'camping',
      'wilderness',
      'nature',
      'photography',
      'lifestyle',
      outdoorData.weatherConditions,
      outdoorData.timeOfDay
    ];

    // Add 3-5 additional tags
    const selectedAdditional = additionalTags
      .filter(() => Math.random() > 0.6)
      .slice(0, 5);

    return [...baseTags, ...selectedAdditional].filter(Boolean);
  }

  /**
   * Estimate file size based on dimensions
   */
  private estimateFileSize(width: number, height: number): number {
    // Rough estimate: 0.3 bytes per pixel for compressed JPEG
    const pixels = width * height;
    const baseSize = pixels * 0.3;
    
    // Add some randomness (±30%)
    const randomFactor = 0.7 + (Math.random() * 0.6);
    
    return Math.round(baseSize * randomFactor);
  }

  /**
   * Generate seasonal media recommendations
   */
  generateSeasonalMediaRecommendations(season: string): {
    priorityCategories: string[];
    recommendedKeywords: string[];
    avoidKeywords: string[];
    seasonalMultipliers: Record<string, number>;
  } {
    const seasonalData: Record<string, any> = {
      spring: {
        priorityCategories: ['adventure_landscapes', 'adventure_activities'],
        recommendedKeywords: ['bloom', 'fresh', 'green', 'waterfall', 'trail', 'hiking'],
        avoidKeywords: ['snow', 'winter', 'ice'],
        boost: ['adventure_landscapes', 'gear_in_action']
      },
      summer: {
        priorityCategories: ['adventure_activities', 'gear_in_action', 'adventure_portraits'],
        recommendedKeywords: ['sunny', 'bright', 'peak', 'summit', 'lake', 'camping'],
        avoidKeywords: ['snow', 'cold', 'winter'],
        boost: ['adventure_activities', 'adventure_portraits']
      },
      fall: {
        priorityCategories: ['adventure_landscapes', 'weather_conditions'],
        recommendedKeywords: ['autumn', 'golden', 'colorful', 'forest', 'leaves'],
        avoidKeywords: ['summer', 'beach', 'hot'],
        boost: ['adventure_landscapes', 'weather_conditions']
      },
      winter: {
        priorityCategories: ['weather_conditions', 'technical_details'],
        recommendedKeywords: ['snow', 'winter', 'cold', 'ice', 'skiing', 'snowshoe'],
        avoidKeywords: ['summer', 'hot', 'beach'],
        boost: ['weather_conditions', 'technical_details']
      }
    };

    const data = seasonalData[season] || seasonalData.summer;
    const multipliers: Record<string, number> = {};

    // Apply seasonal multipliers
    for (const [categoryId, category] of Array.from(this.mediaCategories)) {
      if (data.boost.includes(categoryId)) {
        multipliers[categoryId] = category.seasonalAvailability[season] || 1.0;
      } else {
        multipliers[categoryId] = (category.seasonalAvailability[season] || 1.0) * 0.8;
      }
    }

    return {
      priorityCategories: data.priorityCategories,
      recommendedKeywords: data.recommendedKeywords,
      avoidKeywords: data.avoidKeywords,
      seasonalMultipliers: multipliers
    };
  }

  /**
   * Get statistics about generated media
   */
  getMediaStatistics(): {
    totalGenerated: number;
    byCategory: Record<string, number>;
    byProvider: Record<string, number>;
    byUsage: Record<string, number>;
    averageFileSize: number;
  } {
    const allMedia = Array.from(this.generatedMedia.values()).flat();
    
    const stats = {
      totalGenerated: allMedia.length,
      byCategory: {} as Record<string, number>,
      byProvider: {} as Record<string, number>,
      byUsage: {} as Record<string, number>,
      averageFileSize: 0
    };

    // Calculate statistics
    for (const item of allMedia) {
      // By category
      stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
      
      // By provider
      stats.byProvider[item.metadata.source] = (stats.byProvider[item.metadata.source] || 0) + 1;
      
      // By usage
      for (const purpose of item.usage.purpose) {
        stats.byUsage[purpose] = (stats.byUsage[purpose] || 0) + 1;
      }
    }

    // Calculate average file size
    if (allMedia.length > 0) {
      const totalSize = allMedia.reduce((sum, item) => sum + item.metadata.fileSize, 0);
      stats.averageFileSize = Math.round(totalSize / allMedia.length);
    }

    return stats;
  }

  /**
   * Helper method to capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}