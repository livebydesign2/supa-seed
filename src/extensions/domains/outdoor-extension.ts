/**
 * Outdoor Domain Extension for SupaSeed v2.5.0
 * Generates realistic outdoor gear data and adventure-focused content for Wildernest-style platforms
 * Part of Task 3.2: Implement Outdoor Domain Extension (FR-3.2)
 */

import { Logger } from '../../utils/logger';
import {
  DomainExtension,
  ExtensionConfig,
  ExtensionValidationResult,
  PlatformContext,
  DomainContent,
  UserArchetype,
  StorageConfig,
  ExtensionHealthStatus
} from '../extension-types';
import type { ContentDomainType, PlatformArchitectureType } from '../../detection/detection-types';

/**
 * Outdoor gear category definitions
 */
export interface OutdoorGearCategory {
  id: string;
  name: string;
  subcategories: string[];
  priceRange: { min: number; max: number };
  popularBrands: string[];
}

/**
 * Individual gear item definition
 */
export interface OutdoorGearItem {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  description: string;
  weight: number; // in grams
  features: string[];
  tags: string[];
  imageUrl?: string;
  popularity: number; // 0-1 score
}

/**
 * Gear setup/kit definition for individual creators
 */
export interface GearSetup {
  id: string;
  name: string;
  description: string;
  activity: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  items: OutdoorGearItem[];
  totalPrice: number;
  totalWeight: number;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'all-season';
  tags: string[];
  creatorNotes?: string;
  isPublic: boolean;
}

/**
 * Outdoor Domain Extension
 * Generates realistic outdoor gear data with proper brands, pricing, and adventure-focused content
 */
export class OutdoorDomainExtension extends DomainExtension {
  public readonly name = 'outdoor';
  public readonly supportedDomains: ContentDomainType[] = ['outdoor'];
  public readonly supportedArchitectures: PlatformArchitectureType[] = ['individual', 'hybrid'];

  private gearCategories: OutdoorGearCategory[] = [];
  private outdoorBrands: Record<string, string[]> = {};
  private gearDatabase: OutdoorGearItem[] = [];
  private activityTypes: string[] = [];

  constructor(config: ExtensionConfig) {
    super(config);
    this.initializeOutdoorData();
  }

  /**
   * Initialize outdoor gear data, brands, and categories
   */
  private initializeOutdoorData(): void {
    // Define outdoor gear categories with realistic subcategories
    this.gearCategories = [
      {
        id: 'camping',
        name: 'Camping',
        subcategories: ['tents', 'sleeping_bags', 'sleeping_pads', 'camp_furniture', 'cooking', 'lighting'],
        priceRange: { min: 15, max: 800 },
        popularBrands: ['REI Co-op', 'Big Agnes', 'MSR', 'Coleman', 'Nemo', 'Marmot']
      },
      {
        id: 'hiking',
        name: 'Hiking & Backpacking',
        subcategories: ['backpacks', 'boots', 'trekking_poles', 'navigation', 'hydration', 'clothing'],
        priceRange: { min: 25, max: 600 },
        popularBrands: ['Osprey', 'Deuter', 'Patagonia', 'Merrell', 'Salomon', 'Black Diamond']
      },
      {
        id: 'climbing',
        name: 'Climbing',
        subcategories: ['ropes', 'harnesses', 'helmets', 'protection', 'shoes', 'belay_devices'],
        priceRange: { min: 30, max: 400 },
        popularBrands: ['Black Diamond', 'Petzl', 'La Sportiva', 'Mammut', 'Arc\'teryx', 'Edelrid']
      },
      {
        id: 'water_sports',
        name: 'Water Sports',
        subcategories: ['kayaks', 'paddles', 'life_jackets', 'dry_bags', 'wetsuits', 'fishing'],
        priceRange: { min: 40, max: 1200 },
        popularBrands: ['YETI', 'NRS', 'Patagonia', 'Pelican', 'Old Town', 'Perception']
      },
      {
        id: 'winter_sports',
        name: 'Winter Sports',
        subcategories: ['skis', 'snowboards', 'boots', 'bindings', 'poles', 'avalanche_safety'],
        priceRange: { min: 50, max: 1000 },
        popularBrands: ['Rossignol', 'Salomon', 'K2', 'Burton', 'Atomic', 'Volkl']
      }
    ];

    // Define outdoor brands by category
    this.outdoorBrands = {
      'premium': ['Arc\'teryx', 'Patagonia', 'The North Face', 'Mammut', 'Rab'],
      'mid-range': ['REI Co-op', 'Osprey', 'Black Diamond', 'MSR', 'Big Agnes'],
      'budget': ['Coleman', 'Kelty', 'Teton Sports', 'Eureka', 'Alps Mountaineering'],
      'specialized': ['Petzl', 'La Sportiva', 'YETI', 'Nemo', 'Western Mountaineering']
    };

    // Define activity types for content generation
    this.activityTypes = [
      'car_camping', 'backpacking', 'day_hiking', 'mountaineering', 'rock_climbing',
      'bouldering', 'kayaking', 'canoeing', 'fishing', 'skiing', 'snowboarding',
      'snowshoeing', 'trail_running', 'bikepacking', 'overlanding'
    ];

    // Generate initial gear database
    this.generateGearDatabase();
  }

  /**
   * Generate comprehensive gear database with realistic items
   */
  private generateGearDatabase(): void {
    this.gearDatabase = [];

    for (const category of this.gearCategories) {
      for (const subcategory of category.subcategories) {
        // Generate 3-8 items per subcategory
        const itemCount = 3 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < itemCount; i++) {
          const brand = this.selectRandomBrand(category.popularBrands);
          const gearItem = this.generateGearItem(category, subcategory, brand, i);
          this.gearDatabase.push(gearItem);
        }
      }
    }

    Logger.debug(`✅ Generated ${this.gearDatabase.length} outdoor gear items`);
  }

  /**
   * Generate individual gear item with realistic specifications
   */
  private generateGearItem(
    category: OutdoorGearCategory, 
    subcategory: string, 
    brand: string, 
    index: number
  ): OutdoorGearItem {
    const itemNames = this.getItemNamesForSubcategory(subcategory);
    const baseName = itemNames[index % itemNames.length];
    
    // Generate realistic price within category range
    const priceVariation = 0.3; // 30% price variation
    const basePrice = category.priceRange.min + 
      (category.priceRange.max - category.priceRange.min) * Math.random();
    const price = Math.round(basePrice * (1 + (Math.random() - 0.5) * priceVariation));

    return {
      id: `${category.id}_${subcategory}_${index + 1}`,
      name: `${brand} ${baseName}`,
      brand,
      category: category.id,
      subcategory,
      price: Math.max(price, category.priceRange.min),
      description: this.generateGearDescription(baseName, brand, subcategory),
      weight: this.generateRealisticWeight(subcategory),
      features: this.generateGearFeatures(subcategory),
      tags: this.generateGearTags(category.id, subcategory),
      popularity: Math.random() * 0.6 + 0.4 // 0.4-1.0 popularity
    };
  }

  /**
   * Generate realistic item names for subcategories
   */
  private getItemNamesForSubcategory(subcategory: string): string[] {
    const itemNames: Record<string, string[]> = {
      // Camping
      'tents': ['Dome Tent', 'Backpacking Tent', 'Family Tent', 'Ultralight Tent'],
      'sleeping_bags': ['Down Sleeping Bag', 'Synthetic Sleeping Bag', 'Mummy Bag', 'Rectangular Bag'],
      'sleeping_pads': ['Inflatable Pad', 'Foam Pad', 'Self-Inflating Pad', 'Ultralight Pad'],
      'cooking': ['Camp Stove', 'Cookset', 'Fuel Canister', 'Mess Kit'],
      
      // Hiking
      'backpacks': ['Day Pack', 'Multi-Day Pack', 'Ultralight Pack', 'Expedition Pack'],
      'boots': ['Hiking Boots', 'Trail Runners', 'Mountaineering Boots', 'Approach Shoes'],
      'trekking_poles': ['Carbon Poles', 'Aluminum Poles', 'Collapsible Poles', 'Ultralight Poles'],
      
      // Climbing
      'ropes': ['Dynamic Rope', 'Static Rope', 'Half Rope', 'Twin Rope'],
      'harnesses': ['Sport Harness', 'Trad Harness', 'Alpine Harness', 'Gym Harness'],
      'protection': ['Cam Set', 'Nut Set', 'Piton Set', 'Mixed Rack'],
      
      // Water Sports
      'kayaks': ['Touring Kayak', 'Recreational Kayak', 'Fishing Kayak', 'Whitewater Kayak'],
      'life_jackets': ['Touring PFD', 'Fishing PFD', 'Whitewater PFD', 'Recreational PFD'],
      
      // Winter Sports
      'skis': ['All-Mountain Skis', 'Touring Skis', 'Powder Skis', 'Carving Skis'],
      'snowboards': ['All-Mountain Board', 'Freestyle Board', 'Freeride Board', 'Splitboard']
    };

    return itemNames[subcategory] || ['Outdoor Gear', 'Adventure Equipment', 'Pro Gear', 'Essential Kit'];
  }

  /**
   * Generate realistic gear description
   */
  private generateGearDescription(itemName: string, brand: string, subcategory: string): string {
    const descriptions: Record<string, string[]> = {
      'tents': [
        'Durable and lightweight tent perfect for backpacking adventures',
        'Spacious family tent with excellent weather protection',
        'Ultralight design for minimalist outdoor enthusiasts'
      ],
      'sleeping_bags': [
        'Comfortable sleeping bag rated for three-season use',
        'Premium down insulation for maximum warmth-to-weight ratio',
        'Synthetic fill provides reliable warmth even when wet'
      ],
      'backpacks': [
        'Ergonomic design with advanced suspension system',
        'Lightweight pack with thoughtful organization features',
        'Expedition-grade durability for serious adventures'
      ],
      'boots': [
        'Waterproof leather boots built for rugged terrain',
        'Lightweight trail runners for fast-and-light adventures',
        'Technical mountaineering boots for alpine conditions'
      ]
    };

    const categoryDescriptions = descriptions[subcategory] || [
      'High-quality outdoor gear built for adventure',
      'Professional-grade equipment for serious outdoor enthusiasts',
      'Reliable gear designed for challenging conditions'
    ];

    const baseDescription = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
    return `${brand} ${itemName}. ${baseDescription}. Built with premium materials for durability and performance.`;
  }

  /**
   * Generate realistic weight for gear items (in grams)
   */
  private generateRealisticWeight(subcategory: string): number {
    const weightRanges: Record<string, { min: number; max: number }> = {
      'tents': { min: 800, max: 3500 },
      'sleeping_bags': { min: 600, max: 2200 },
      'sleeping_pads': { min: 300, max: 900 },
      'backpacks': { min: 1200, max: 3000 },
      'boots': { min: 800, max: 1500 },
      'trekking_poles': { min: 200, max: 600 },
      'ropes': { min: 3000, max: 6000 },
      'harnesses': { min: 300, max: 600 },
      'kayaks': { min: 15000, max: 35000 },
      'skis': { min: 1500, max: 3000 }
    };

    const range = weightRanges[subcategory] || { min: 200, max: 1000 };
    return Math.round(range.min + (range.max - range.min) * Math.random());
  }

  /**
   * Generate realistic features for gear items
   */
  private generateGearFeatures(subcategory: string): string[] {
    const features: Record<string, string[]> = {
      'tents': ['Waterproof', 'Easy Setup', 'Lightweight', 'Ventilation System', 'Durable Zippers'],
      'sleeping_bags': ['Temperature Rated', 'Compressible', 'Draft Collar', 'Zipper Guard', 'Hood'],
      'backpacks': ['Adjustable Torso', 'Hip Belt', 'Hydration Compatible', 'Rain Cover', 'Multiple Pockets'],
      'boots': ['Waterproof', 'Breathable', 'Vibram Sole', 'Ankle Support', 'Toe Protection'],
      'climbing': ['CE Certified', 'Lightweight', 'Ergonomic', 'Durable Construction', 'Color Coded']
    };

    const categoryFeatures = features[subcategory] || features['climbing'] || ['Durable', 'Lightweight', 'Weather Resistant'];
    
    // Return 2-4 random features
    const numFeatures = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...categoryFeatures].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, numFeatures);
  }

  /**
   * Generate appropriate tags for gear items
   */
  private generateGearTags(category: string, subcategory: string): string[] {
    const baseTags = [category, subcategory];
    const additionalTags = [
      'outdoor', 'adventure', 'hiking', 'camping', 'gear', 'equipment',
      'durable', 'lightweight', 'professional', 'reliable'
    ];
    
    // Add 2-3 additional tags
    const numAdditional = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...additionalTags].sort(() => Math.random() - 0.5);
    
    return [...baseTags, ...shuffled.slice(0, numAdditional)];
  }

  /**
   * Select random brand with weighted probability
   */
  private selectRandomBrand(categoryBrands: string[]): string {
    return categoryBrands[Math.floor(Math.random() * categoryBrands.length)];
  }

  // DomainExtension interface implementation

  async initialize(platformContext: PlatformContext): Promise<void> {
    Logger.info('🏔️ Initializing Outdoor Domain Extension');
    
    // Validate platform compatibility
    if (!this.supportedDomains.includes(platformContext.domain) || 
        !this.supportedArchitectures.includes(platformContext.architecture)) {
      throw new Error(`Outdoor extension not compatible with ${platformContext.domain}/${platformContext.architecture}`);
    }

    // Initialize gear database if not already done
    if (this.gearDatabase.length === 0) {
      this.generateGearDatabase();
    }

    Logger.info(`✅ Outdoor extension initialized with ${this.gearDatabase.length} gear items`);
  }

  async detectDomain(platformContext: PlatformContext): Promise<number> {
    // Check for outdoor-specific schema patterns
    let confidence = 0;
    
    // Look for outdoor-specific table patterns
    const outdoorTables = ['gear', 'setups', 'trips', 'base_templates', 'equipment', 'adventures'];
    const outdoorFields = ['brand', 'weight', 'price', 'category', 'activity', 'difficulty'];
    
    // This would analyze the actual schema in a real implementation
    // For now, return high confidence if domain is already 'outdoor'
    if (platformContext.domain === 'outdoor') {
      confidence = 0.95;
    } else {
      // Simulate schema analysis confidence
      confidence = Math.random() * 0.3; // Low confidence for non-outdoor domains
    }

    Logger.debug(`🔍 Outdoor domain detection confidence: ${confidence}`);
    return confidence;
  }

  async generateContent(platformContext: PlatformContext): Promise<DomainContent> {
    Logger.info('🎒 Generating outdoor domain content');

    try {
      // Generate gear setups for individual creators
      const gearSetups = this.generateGearSetups(5); // Generate 5 setups
      
      // Get gear items by category
      const gearByCategory = this.getGearByCategory();
      
      // Generate outdoor brands data
      const brands = this.getAllBrands();
      
      // Generate categories structure
      const categories = this.gearCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        subcategories: cat.subcategories,
        itemCount: this.gearDatabase.filter(item => item.category === cat.id).length
      }));

      Logger.info(`✅ Generated outdoor content: ${gearSetups.length} setups, ${this.gearDatabase.length} gear items`);

      return {
        domain: 'outdoor',
        content: {
          gearSetups,
          gearItems: this.gearDatabase,
          gearByCategory,
          brands,
          categories,
          activities: this.activityTypes
        },
        metadata: {
          generatedAt: Date.now(),
          itemCount: this.gearDatabase.length,
          setupCount: gearSetups.length,
          categories: this.gearCategories.length
        }
      };

    } catch (error: any) {
      Logger.error('❌ Failed to generate outdoor content:', error);
      throw error;
    }
  }

  async getUserArchetypes(platformContext: PlatformContext): Promise<UserArchetype[]> {
    Logger.info('👥 Generating outdoor user archetypes');

    return [
      {
        email: 'creator@wildernest.test',
        role: 'user',
        name: 'Alex Trail-Creator',
        purpose: 'Individual gear setup creator and sharer',
        behavior: {
          contentCreation: {
            frequency: 'weekly',
            types: ['gear_setups', 'trip_reports', 'gear_reviews'],
            sharingPattern: 'public_focused'
          },
          engagement: {
            likesToShare: true,
            collaborationLevel: 'low',
            communityParticipation: 'high'
          }
        },
        contentPattern: {
          setups: 2,
          gearPerSetup: 5,
          publicRatio: 0.75,
          specialization: ['hiking', 'camping']
        },
        preferences: {
          gearFocus: 'ultralight',
          budgetRange: 'mid-range',
          activities: ['backpacking', 'day_hiking', 'car_camping']
        }
      },
      {
        email: 'explorer@wildernest.test',
        role: 'user',
        name: 'Jordan Adventure-Explorer',
        purpose: 'Setup discoverer, reviewer, and community member',
        behavior: {
          contentCreation: {
            frequency: 'monthly',
            types: ['gear_reviews', 'comments', 'ratings'],
            sharingPattern: 'community_focused'
          },
          engagement: {
            likesToShare: false,
            collaborationLevel: 'medium',
            communityParticipation: 'very_high'
          }
        },
        contentPattern: {
          browsesPublicSetups: true,
          leavesReviews: true,
          ratesGear: true,
          followsCreators: true
        },
        preferences: {
          gearFocus: 'value',
          budgetRange: 'budget',
          activities: ['hiking', 'camping', 'fishing']
        }
      },
      {
        email: 'guide@wildernest.test',
        role: 'user',
        name: 'Sam Mountain-Guide',
        purpose: 'Professional guide sharing expert setups',
        behavior: {
          contentCreation: {
            frequency: 'bi-weekly',
            types: ['expert_setups', 'safety_guides', 'technique_tips'],
            sharingPattern: 'educational_focused'
          },
          engagement: {
            likesToShare: true,
            collaborationLevel: 'high',
            communityParticipation: 'medium'
          }
        },
        contentPattern: {
          setups: 4,
          gearPerSetup: 8,
          publicRatio: 0.9,
          specialization: ['mountaineering', 'climbing', 'winter_sports']
        },
        preferences: {
          gearFocus: 'professional',
          budgetRange: 'premium',
          activities: ['mountaineering', 'rock_climbing', 'skiing']
        }
      }
    ];
  }

  async getStorageConfig(platformContext: PlatformContext): Promise<StorageConfig> {
    Logger.info('💾 Generating outdoor storage configuration');

    return {
      buckets: [
        {
          name: 'adventure-photos',
          publicAccess: true,
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxFileSize: 10 * 1024 * 1024, // 10MB
          folder: 'adventures/',
          rls: {
            enabled: true,
            policy: 'authenticated users can upload, public can view'
          }
        },
        {
          name: 'gear-images',
          publicAccess: true,
          allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxFileSize: 5 * 1024 * 1024, // 5MB
          folder: 'gear/',
          rls: {
            enabled: true,
            policy: 'authenticated users can upload, public can view'
          }
        },
        {
          name: 'setup-attachments',
          publicAccess: false,
          allowedFileTypes: ['application/pdf', 'text/plain', 'application/json'],
          maxFileSize: 2 * 1024 * 1024, // 2MB
          folder: 'setups/',
          rls: {
            enabled: true,
            policy: 'owner can manage, followers can view'
          }
        }
      ],
      mediaGeneration: {
        enabled: true,
        categories: ['adventure', 'outdoor', 'gear', 'landscape'],
        apiEndpoint: 'https://source.unsplash.com/800x600/?adventure,outdoor',
        fallbackImages: [
          '/assets/gear-placeholder.jpg',
          '/assets/adventure-placeholder.jpg',
          '/assets/outdoor-placeholder.jpg'
        ]
      }
    };
  }

  async validate(): Promise<ExtensionValidationResult> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];

    // Validate gear database
    if (this.gearDatabase.length === 0) {
      errors.push({
        field: 'gearDatabase',
        message: 'Gear database is empty',
        severity: 'error'
      });
    }

    // Validate categories
    if (this.gearCategories.length === 0) {
      errors.push({
        field: 'gearCategories',
        message: 'No gear categories defined',
        severity: 'error'
      });
    }

    // Performance warnings
    if (this.gearDatabase.length > 1000) {
      warnings.push('Large gear database may impact performance');
    }

    const valid = errors.filter(e => e.severity === 'error').length === 0;

    return {
      valid,
      errors,
      warnings,
      compatibility: {
        domains: {
          compatible: this.supportedDomains,
          incompatible: [],
          warnings: []
        },
        architectures: {
          compatible: this.supportedArchitectures,
          incompatible: [],
          warnings: []
        },
        dependencies: {
          resolved: [],
          unresolved: [],
          conflicts: []
        }
      },
      performance: {
        estimatedMemory: Math.round(this.gearDatabase.length * 2), // 2KB per item estimate
        estimatedExecutionTime: 5000, // 5 seconds
        resourceWarnings: warnings.filter(w => w.includes('performance'))
      },
      security: {
        risks: [],
        permissions: ['read:gear', 'create:setups', 'upload:images'],
        dataAccess: ['gear_items', 'gear_setups', 'user_preferences']
      }
    };
  }

  async updateConfig(configUpdate: Partial<ExtensionConfig>): Promise<void> {
    Logger.info('🔧 Updating outdoor extension configuration');
    
    // Merge configuration updates
    this.config = { ...this.config, ...configUpdate };
    
    // Reinitialize if settings changed
    if (configUpdate.settings) {
      this.initializeOutdoorData();
    }
    
    Logger.info('✅ Outdoor extension configuration updated');
  }

  async cleanup(): Promise<void> {
    Logger.info('🧹 Cleaning up outdoor extension resources');
    
    // Clear gear database
    this.gearDatabase = [];
    this.gearCategories = [];
    this.outdoorBrands = {};
    this.activityTypes = [];
    
    Logger.info('✅ Outdoor extension cleanup complete');
  }

  async getHealthStatus(): Promise<ExtensionHealthStatus> {
    const isHealthy = this.gearDatabase.length > 0 && this.gearCategories.length > 0;
    
    return {
      extensionId: `${this.name}@${this.config.metadata.version}`,
      status: isHealthy ? 'healthy' : 'warning',
      checks: [
        {
          name: 'gear_database',
          status: this.gearDatabase.length > 0 ? 'pass' : 'fail',
          message: `Gear database contains ${this.gearDatabase.length} items`,
          timestamp: Date.now()
        },
        {
          name: 'categories',
          status: this.gearCategories.length > 0 ? 'pass' : 'fail',
          message: `${this.gearCategories.length} gear categories available`,
          timestamp: Date.now()
        }
      ],
      performance: {
        responseTime: 0, // Would be measured in real execution
        throughput: this.gearDatabase.length,
        errorRate: 0,
        memoryUsage: Math.round(this.gearDatabase.length * 2) // Estimate
      },
      recentIssues: [],
      summary: {
        uptime: Date.now() - (this.config.metadata as any).initializedAt || 0,
        totalFailures: 0,
        recoveryTime: 0
      }
    };
  }

  // Helper methods for content generation

  private generateGearSetups(count: number): GearSetup[] {
    const setups: GearSetup[] = [];
    
    for (let i = 0; i < count; i++) {
      const activity = this.activityTypes[Math.floor(Math.random() * this.activityTypes.length)];
      const difficulty = ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any;
      const season = ['spring', 'summer', 'fall', 'winter', 'all-season'][Math.floor(Math.random() * 5)] as any;
      
      // Select 4-8 gear items for this setup
      const itemCount = 4 + Math.floor(Math.random() * 5);
      const items = this.selectGearForActivity(activity, itemCount);
      
      const setup: GearSetup = {
        id: `setup_${i + 1}`,
        name: `${this.capitalizeWords(activity.replace('_', ' '))} Setup ${i + 1}`,
        description: `Curated gear setup for ${activity.replace('_', ' ')} adventures`,
        activity,
        difficulty,
        items,
        totalPrice: items.reduce((sum, item) => sum + item.price, 0),
        totalWeight: items.reduce((sum, item) => sum + item.weight, 0),
        season,
        tags: [activity, difficulty, season, 'curated', 'setup'],
        creatorNotes: `This ${difficulty} setup is perfect for ${season} ${activity.replace('_', ' ')} adventures.`,
        isPublic: Math.random() > 0.25 // 75% chance of being public
      };
      
      setups.push(setup);
    }
    
    return setups;
  }

  private selectGearForActivity(activity: string, count: number): OutdoorGearItem[] {
    // Define essential categories for each activity
    const activityGearMapping: Record<string, string[]> = {
      'backpacking': ['backpacks', 'tents', 'sleeping_bags', 'cooking'],
      'car_camping': ['tents', 'sleeping_bags', 'cooking', 'camp_furniture'],
      'day_hiking': ['backpacks', 'boots', 'trekking_poles', 'hydration'],
      'rock_climbing': ['harnesses', 'ropes', 'protection', 'shoes'],
      'kayaking': ['kayaks', 'paddles', 'life_jackets', 'dry_bags'],
      'skiing': ['skis', 'boots', 'bindings', 'poles']
    };

    const requiredCategories = activityGearMapping[activity] || ['backpacks', 'boots'];
    const availableItems = this.gearDatabase.filter(item => 
      requiredCategories.includes(item.subcategory)
    );

    // Select items ensuring category diversity
    const selectedItems: OutdoorGearItem[] = [];
    const usedSubcategories = new Set<string>();

    // First, ensure we have at least one item from each required category
    for (const subcategory of requiredCategories) {
      if (selectedItems.length >= count) break;
      
      const categoryItems = availableItems.filter(item => 
        item.subcategory === subcategory && !usedSubcategories.has(item.subcategory)
      );
      
      if (categoryItems.length > 0) {
        const selectedItem = categoryItems[Math.floor(Math.random() * categoryItems.length)];
        selectedItems.push(selectedItem);
        usedSubcategories.add(selectedItem.subcategory);
      }
    }

    // Fill remaining slots with random items
    while (selectedItems.length < count) {
      const remainingItems = availableItems.filter(item => 
        !selectedItems.some(selected => selected.id === item.id)
      );
      
      if (remainingItems.length === 0) break;
      
      const randomItem = remainingItems[Math.floor(Math.random() * remainingItems.length)];
      selectedItems.push(randomItem);
    }

    return selectedItems;
  }

  private getGearByCategory(): Record<string, OutdoorGearItem[]> {
    const gearByCategory: Record<string, OutdoorGearItem[]> = {};
    
    for (const category of this.gearCategories) {
      gearByCategory[category.id] = this.gearDatabase.filter(item => 
        item.category === category.id
      );
    }
    
    return gearByCategory;
  }

  private getAllBrands(): Array<{ name: string; category: string; itemCount: number }> {
    const brandMap = new Map<string, { category: string; count: number }>();
    
    for (const item of this.gearDatabase) {
      const existing = brandMap.get(item.brand) || { category: 'general', count: 0 };
      brandMap.set(item.brand, {
        category: existing.category,
        count: existing.count + 1
      });
    }
    
    return Array.from(brandMap.entries()).map(([name, data]) => ({
      name,
      category: data.category,
      itemCount: data.count
    }));
  }

  private capitalizeWords(str: string): string {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
}