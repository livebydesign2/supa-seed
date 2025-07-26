/**
 * Outdoor Gear and Setup Generators
 * Advanced content generation utilities for realistic outdoor gear data
 * Part of Task 3.2.2: Implement outdoor gear and setup generators (FR-3.2)
 */

import { Logger } from '../../utils/logger';
import type { OutdoorGearItem, GearSetup } from './outdoor-extension';

/**
 * Advanced gear generation parameters
 */
export interface GearGenerationConfig {
  /** Number of items to generate per category */
  itemsPerCategory: number;
  
  /** Price variation percentage (0-1) */
  priceVariation: number;
  
  /** Enable seasonal adjustments */
  enableSeasonalPricing: boolean;
  
  /** Brand distribution weights */
  brandWeights: Record<string, number>;
  
  /** Quality tier distribution */
  qualityDistribution: {
    budget: number;
    midRange: number;
    premium: number;
  };
  
  /** Enable realistic wear patterns */
  enableAgingSimulation: boolean;
}

/**
 * Seasonal gear adjustments
 */
interface SeasonalAdjustment {
  priceMultiplier: number;
  availabilityBoost: number;
  popularityBoost: number;
  recommendedFor: string[];
}

/**
 * Brand tier definition
 */
interface BrandTier {
  tier: 'budget' | 'mid-range' | 'premium' | 'luxury';
  priceMultiplier: number;
  qualityScore: number;
  marketShare: number;
  specialties: string[];
}

/**
 * Advanced Outdoor Gear Generator
 * Generates realistic outdoor gear with market-accurate pricing and specifications
 */
export class OutdoorGearGenerator {
  private config: GearGenerationConfig;
  private brandTiers: Map<string, BrandTier> = new Map();
  private seasonalAdjustments: Map<string, SeasonalAdjustment> = new Map();
  private realGearDatabase: Map<string, any[]> = new Map();

  constructor(config: Partial<GearGenerationConfig> = {}) {
    this.config = {
      itemsPerCategory: 15,
      priceVariation: 0.25,
      enableSeasonalPricing: true,
      brandWeights: {},
      qualityDistribution: { budget: 0.3, midRange: 0.5, premium: 0.2 },
      enableAgingSimulation: false,
      ...config
    };

    this.initializeBrandTiers();
    this.initializeSeasonalAdjustments();
    this.initializeRealGearDatabase();
  }

  /**
   * Initialize brand tier system with realistic market positioning
   */
  private initializeBrandTiers(): void {
    const brands: Array<[string, BrandTier]> = [
      // Premium/Luxury brands
      ['Arc\'teryx', {
        tier: 'premium',
        priceMultiplier: 1.8,
        qualityScore: 0.95,
        marketShare: 0.05,
        specialties: ['mountaineering', 'technical_apparel', 'alpine']
      }],
      ['Patagonia', {
        tier: 'premium',
        priceMultiplier: 1.6,
        qualityScore: 0.90,
        marketShare: 0.12,
        specialties: ['environmental', 'climbing', 'outdoor_lifestyle']
      }],
      ['The North Face', {
        tier: 'premium',
        priceMultiplier: 1.4,
        qualityScore: 0.85,
        marketShare: 0.18,
        specialties: ['expedition', 'mountaineering', 'winter_sports']
      }],

      // Mid-range brands
      ['REI Co-op', {
        tier: 'mid-range',
        priceMultiplier: 1.0,
        qualityScore: 0.80,
        marketShare: 0.15,
        specialties: ['general_outdoor', 'value', 'accessibility']
      }],
      ['Osprey', {
        tier: 'mid-range',
        priceMultiplier: 1.2,
        qualityScore: 0.85,
        marketShare: 0.10,
        specialties: ['backpacks', 'hiking', 'travel']
      }],
      ['Black Diamond', {
        tier: 'mid-range',
        priceMultiplier: 1.3,
        qualityScore: 0.88,
        marketShare: 0.08,
        specialties: ['climbing', 'mountaineering', 'technical_gear']
      }],

      // Budget brands
      ['Coleman', {
        tier: 'budget',
        priceMultiplier: 0.6,
        qualityScore: 0.65,
        marketShare: 0.20,
        specialties: ['car_camping', 'family', 'beginner']
      }],
      ['Kelty', {
        tier: 'budget',
        priceMultiplier: 0.75,
        qualityScore: 0.70,
        marketShare: 0.08,
        specialties: ['backpacking', 'camping', 'value']
      }],
      ['Teton Sports', {
        tier: 'budget',
        priceMultiplier: 0.65,
        qualityScore: 0.68,
        marketShare: 0.04,
        specialties: ['sleeping_systems', 'budget_backpacking']
      }]
    ];

    for (const [brand, tier] of brands) {
      this.brandTiers.set(brand, tier);
    }
  }

  /**
   * Initialize seasonal pricing and availability adjustments
   */
  private initializeSeasonalAdjustments(): void {
    this.seasonalAdjustments.set('winter_gear', {
      priceMultiplier: 1.2, // Higher prices in fall/winter
      availabilityBoost: 0.8, // Lower availability in off-season
      popularityBoost: 1.5, // Higher popularity in season
      recommendedFor: ['november', 'december', 'january', 'february', 'march']
    });

    this.seasonalAdjustments.set('summer_gear', {
      priceMultiplier: 1.1,
      availabilityBoost: 1.2,
      popularityBoost: 1.3,
      recommendedFor: ['may', 'june', 'july', 'august', 'september']
    });

    this.seasonalAdjustments.set('shoulder_season', {
      priceMultiplier: 0.9, // Sales during shoulder seasons
      availabilityBoost: 1.1,
      popularityBoost: 0.8,
      recommendedFor: ['april', 'october']
    });
  }

  /**
   * Initialize database of real gear specifications
   */
  private initializeRealGearDatabase(): void {
    // Tents - based on real models
    this.realGearDatabase.set('tents', [
      {
        model: 'Hubba Hubba NX 2-Person',
        basePrice: 450,
        weight: 1720,
        capacity: 2,
        seasons: 3,
        features: ['Freestanding', 'Dual Vestibules', 'Easy Setup', 'Ultralight']
      },
      {
        model: 'Copper Spur HV UL2',
        basePrice: 500,
        weight: 1480,
        capacity: 2,
        seasons: 3,
        features: ['Ultralight', 'High Volume', 'Dual Doors', 'Color Coded']
      },
      {
        model: 'Half Dome 2 Plus',
        basePrice: 180,
        weight: 2240,
        capacity: 2,
        seasons: 3,
        features: ['Budget-Friendly', 'Spacious', 'Easy Setup', 'Durable']
      }
    ]);

    // Backpacks - based on real models
    this.realGearDatabase.set('backpacks', [
      {
        model: 'Atmos AG 65',
        basePrice: 280,
        weight: 2100,
        volume: 65,
        features: ['Anti-Gravity Suspension', 'Ventilated Back', 'Adjustable Torso']
      },
      {
        model: 'Exos 58',
        basePrice: 200,
        weight: 1130,
        volume: 58,
        features: ['Ultralight', 'Minimalist', 'Excellent Ventilation']
      },
      {
        model: 'Flash 55',
        basePrice: 150,
        weight: 1190,
        volume: 55,
        features: ['Lightweight', 'Simple Design', 'Value-Oriented']
      }
    ]);

    // Sleeping bags - based on real models
    this.realGearDatabase.set('sleeping_bags', [
      {
        model: 'Disco 15',
        basePrice: 350,
        weight: 1140,
        temperature: 15,
        insulation: 'down',
        features: ['Spoon Shape', 'Quilted Construction', 'Premium Down']
      },
      {
        model: 'Kelty Cosmic 20',
        basePrice: 120,
        weight: 1190,
        temperature: 20,
        insulation: 'down',
        features: ['Budget Down', 'Reliable', 'Traditional Shape']
      },
      {
        model: 'Trailbreak 30',
        basePrice: 90,
        weight: 1360,
        temperature: 30,
        insulation: 'synthetic',
        features: ['Synthetic Fill', 'Compressible', 'Easy Care']
      }
    ]);
  }

  /**
   * Generate realistic outdoor gear item with market-accurate specifications
   */
  generateRealisticGearItem(
    category: string,
    subcategory: string,
    brand: string,
    season?: string
  ): OutdoorGearItem {
    Logger.debug(`🎯 Generating realistic ${brand} ${subcategory} for ${category}`);

    // Get real gear specifications if available
    const realSpecs = this.getRealGearSpecs(subcategory);
    const brandTier = this.brandTiers.get(brand);
    const seasonalAdjustment = season ? this.getSeasonalAdjustment(subcategory, season) : null;

    // Generate base specifications
    const baseSpecs = this.generateBaseSpecs(subcategory, realSpecs);
    
    // Apply brand tier adjustments
    const brandAdjustedSpecs = this.applyBrandAdjustments(baseSpecs, brandTier);
    
    // Apply seasonal adjustments
    const finalSpecs = seasonalAdjustment 
      ? this.applySeasonalAdjustments(brandAdjustedSpecs, seasonalAdjustment)
      : brandAdjustedSpecs;

    // Generate unique item ID
    const itemId = `${category}_${subcategory}_${this.generateItemHash(brand, finalSpecs.name)}`;

    return {
      id: itemId,
      name: `${brand} ${finalSpecs.name}`,
      brand,
      category,
      subcategory,
      price: Math.round(finalSpecs.price),
      description: this.generateDetailedDescription(finalSpecs, brand, brandTier),
      weight: Math.round(finalSpecs.weight),
      features: finalSpecs.features,
      tags: this.generateAdvancedTags(category, subcategory, brandTier, finalSpecs),
      popularity: this.calculatePopularity(brandTier, finalSpecs, seasonalAdjustment)
    };
  }

  /**
   * Generate curated gear setup with theme and purpose
   */
  generateCuratedGearSetup(
    theme: string,
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    season: string,
    gearItems: OutdoorGearItem[]
  ): GearSetup {
    Logger.debug(`📦 Generating curated setup: ${theme} (${difficulty}, ${season})`);

    const setupId = `setup_${theme}_${difficulty}_${Date.now()}`;
    
    // Select appropriate gear based on theme and difficulty
    const selectedGear = this.selectGearForTheme(theme, difficulty, gearItems);
    
    // Generate setup metadata
    const setupName = this.generateSetupName(theme, difficulty, season);
    const description = this.generateSetupDescription(theme, difficulty, season, selectedGear.length);
    
    // Calculate totals
    const totalPrice = selectedGear.reduce((sum, item) => sum + item.price, 0);
    const totalWeight = selectedGear.reduce((sum, item) => sum + item.weight, 0);
    
    // Generate theme-appropriate tags
    const tags = this.generateSetupTags(theme, difficulty, season);
    
    // Generate creator notes
    const creatorNotes = this.generateCreatorNotes(theme, difficulty, selectedGear);

    return {
      id: setupId,
      name: setupName,
      description,
      activity: theme,
      difficulty,
      items: selectedGear,
      totalPrice,
      totalWeight,
      season: season as any,
      tags,
      creatorNotes,
      isPublic: this.determineVisibility(difficulty, totalPrice)
    };
  }

  /**
   * Generate weight-optimized gear setup for ultralight enthusiasts
   */
  generateUltralightSetup(
    activity: string,
    weightBudget: number, // in grams
    gearItems: OutdoorGearItem[]
  ): GearSetup {
    Logger.debug(`⚖️ Generating ultralight setup for ${activity} (${weightBudget}g budget)`);

    // Filter items by weight efficiency (performance per gram)
    const weightEfficientItems = gearItems
      .filter(item => this.isAppropriateForActivity(item, activity))
      .map(item => ({
        ...item,
        efficiency: this.calculateWeightEfficiency(item)
      }))
      .sort((a, b) => b.efficiency - a.efficiency);

    // Select items within weight budget
    const selectedItems: OutdoorGearItem[] = [];
    let currentWeight = 0;
    const requiredCategories = this.getRequiredCategoriesForActivity(activity);
    const categoryTracker = new Set<string>();

    // First pass: ensure essential categories are covered
    for (const category of requiredCategories) {
      const categoryItems = weightEfficientItems.filter(item => 
        item.subcategory === category && 
        (currentWeight + item.weight) <= weightBudget
      );

      if (categoryItems.length > 0 && !categoryTracker.has(category)) {
        const bestItem = categoryItems[0];
        selectedItems.push(bestItem);
        currentWeight += bestItem.weight;
        categoryTracker.add(category);
      }
    }

    // Second pass: fill remaining weight budget with best items
    for (const item of weightEfficientItems) {
      if (currentWeight + item.weight <= weightBudget && 
          !selectedItems.some(selected => selected.id === item.id)) {
        selectedItems.push(item);
        currentWeight += item.weight;
      }
    }

    const setupId = `ultralight_${activity}_${Date.now()}`;
    const weightSavings = weightBudget - currentWeight;

    return {
      id: setupId,
      name: `Ultralight ${this.capitalizeActivity(activity)} Setup`,
      description: `Weight-optimized setup for ${activity}. ${weightSavings}g under budget!`,
      activity,
      difficulty: 'advanced',
      items: selectedItems,
      totalPrice: selectedItems.reduce((sum, item) => sum + item.price, 0),
      totalWeight: currentWeight,
      season: 'all-season',
      tags: ['ultralight', 'weight-optimized', activity, 'advanced', 'minimalist'],
      creatorNotes: `This setup prioritizes weight savings while maintaining essential functionality. Total weight: ${currentWeight}g (${weightSavings}g under ${weightBudget}g budget). Perfect for experienced adventurers who understand the weight-performance tradeoffs.`,
      isPublic: true
    };
  }

  /**
   * Generate budget-conscious setup with price optimization
   */
  generateBudgetSetup(
    activity: string,
    budget: number, // in dollars
    gearItems: OutdoorGearItem[]
  ): GearSetup {
    Logger.debug(`💰 Generating budget setup for ${activity} ($${budget} budget)`);

    // Filter items by value (performance per dollar)
    const valueItems = gearItems
      .filter(item => this.isAppropriateForActivity(item, activity))
      .map(item => ({
        ...item,
        value: this.calculateValueScore(item)
      }))
      .sort((a, b) => b.value - a.value);

    // Select items within budget
    const selectedItems: OutdoorGearItem[] = [];
    let currentCost = 0;
    const requiredCategories = this.getRequiredCategoriesForActivity(activity);
    const categoryTracker = new Set<string>();

    // Ensure essential categories are covered within budget
    for (const category of requiredCategories) {
      const categoryItems = valueItems.filter(item => 
        item.subcategory === category && 
        (currentCost + item.price) <= budget
      );

      if (categoryItems.length > 0 && !categoryTracker.has(category)) {
        const bestValueItem = categoryItems[0];
        selectedItems.push(bestValueItem);
        currentCost += bestValueItem.price;
        categoryTracker.add(category);
      }
    }

    // Fill remaining budget with best value items
    for (const item of valueItems) {
      if (currentCost + item.price <= budget && 
          !selectedItems.some(selected => selected.id === item.id)) {
        selectedItems.push(item);
        currentCost += item.price;
      }
    }

    const setupId = `budget_${activity}_${Date.now()}`;
    const savings = budget - currentCost;

    return {
      id: setupId,
      name: `Budget ${this.capitalizeActivity(activity)} Setup`,
      description: `Value-optimized setup for ${activity}. Complete setup under $${budget}!`,
      activity,
      difficulty: 'beginner',
      items: selectedItems,
      totalPrice: currentCost,
      totalWeight: selectedItems.reduce((sum, item) => sum + item.weight, 0),
      season: 'all-season',
      tags: ['budget', 'value', activity, 'beginner', 'affordable'],
      creatorNotes: `This setup maximizes value while covering all essential gear categories. Total cost: $${currentCost} (saved $${savings} from $${budget} budget). Perfect for beginners or anyone looking for reliable gear without breaking the bank.`,
      isPublic: true
    };
  }

  // Private helper methods

  private getRealGearSpecs(subcategory: string): any {
    const specs = this.realGearDatabase.get(subcategory);
    if (specs && specs.length > 0) {
      return specs[Math.floor(Math.random() * specs.length)];
    }
    return null;
  }

  private generateBaseSpecs(subcategory: string, realSpecs: any): any {
    if (realSpecs) {
      // Use real specifications as base
      return {
        name: realSpecs.model,
        price: realSpecs.basePrice,
        weight: realSpecs.weight,
        features: [...realSpecs.features]
      };
    }

    // Generate synthetic specifications
    const baseSpecs = this.getSyntheticSpecs(subcategory);
    return {
      name: this.generateModelName(subcategory),
      price: baseSpecs.basePrice,
      weight: baseSpecs.baseWeight,
      features: [...baseSpecs.baseFeatures]
    };
  }

  private getSyntheticSpecs(subcategory: string): any {
    const specs: Record<string, any> = {
      'tents': { basePrice: 300, baseWeight: 2000, baseFeatures: ['Waterproof', 'Easy Setup'] },
      'backpacks': { basePrice: 200, baseWeight: 1500, baseFeatures: ['Adjustable', 'Multiple Pockets'] },
      'sleeping_bags': { basePrice: 150, baseWeight: 1200, baseFeatures: ['Temperature Rated', 'Compressible'] },
      'boots': { basePrice: 180, baseWeight: 1000, baseFeatures: ['Waterproof', 'Durable'] }
    };

    return specs[subcategory] || { basePrice: 100, baseWeight: 500, baseFeatures: ['Durable', 'Reliable'] };
  }

  private generateModelName(subcategory: string): string {
    const prefixes = ['Pro', 'Ultra', 'Elite', 'Summit', 'Trail', 'Explorer', 'Adventure'];
    const suffixes = ['X', 'GT', 'Plus', 'Pro', 'Max', 'Elite'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const model = this.capitalizeActivity(subcategory.replace('_', ' '));
    
    return `${prefix} ${model} ${suffix}`;
  }

  private applyBrandAdjustments(baseSpecs: any, brandTier?: BrandTier): any {
    if (!brandTier) {
      return baseSpecs;
    }

    return {
      ...baseSpecs,
      price: Math.round(baseSpecs.price * brandTier.priceMultiplier),
      features: this.enhanceFeaturesForBrand(baseSpecs.features, brandTier),
      quality: brandTier.qualityScore
    };
  }

  private enhanceFeaturesForBrand(baseFeatures: string[], brandTier: BrandTier): string[] {
    const enhancedFeatures = [...baseFeatures];

    if (brandTier.tier === 'premium' || brandTier.tier === 'luxury') {
      enhancedFeatures.push('Premium Materials', 'Advanced Engineering');
    }

    if (brandTier.specialties.includes('technical_gear')) {
      enhancedFeatures.push('Technical Construction');
    }

    if (brandTier.specialties.includes('environmental')) {
      enhancedFeatures.push('Sustainable Materials');
    }

    return enhancedFeatures;
  }

  private applySeasonalAdjustments(specs: any, adjustment: SeasonalAdjustment): any {
    return {
      ...specs,
      price: Math.round(specs.price * adjustment.priceMultiplier),
      popularity: (specs.popularity || 0.5) * adjustment.popularityBoost
    };
  }

  private getSeasonalAdjustment(subcategory: string, season: string): SeasonalAdjustment | null {
    const winterCategories = ['winter_sports', 'insulation', 'cold_weather'];
    const summerCategories = ['water_sports', 'ventilation', 'hot_weather'];

    if (winterCategories.some(cat => subcategory.includes(cat))) {
      return this.seasonalAdjustments.get('winter_gear') || null;
    }

    if (summerCategories.some(cat => subcategory.includes(cat))) {
      return this.seasonalAdjustments.get('summer_gear') || null;
    }

    return this.seasonalAdjustments.get('shoulder_season') || null;
  }

  private generateDetailedDescription(specs: any, brand: string, brandTier?: BrandTier): string {
    const brandDescription = brandTier 
      ? this.getBrandDescription(brandTier)
      : 'Quality outdoor gear';

    const featureText = specs.features.length > 0 
      ? ` Features include ${specs.features.slice(0, 3).join(', ')}.`
      : '';

    return `${brand} ${specs.name}. ${brandDescription} built for outdoor adventures.${featureText} Designed for reliability and performance in challenging conditions.`;
  }

  private getBrandDescription(brandTier: BrandTier): string {
    switch (brandTier.tier) {
      case 'luxury':
        return 'Ultra-premium gear with cutting-edge technology and materials';
      case 'premium':
        return 'High-performance gear trusted by professionals and enthusiasts';
      case 'mid-range':
        return 'Reliable gear offering excellent value and proven performance';
      case 'budget':
        return 'Affordable gear perfect for beginners and casual adventurers';
      default:
        return 'Quality outdoor gear';
    }
  }

  private generateAdvancedTags(
    category: string, 
    subcategory: string, 
    brandTier?: BrandTier, 
    specs?: any
  ): string[] {
    const tags = [category, subcategory];

    if (brandTier) {
      tags.push(brandTier.tier);
      tags.push(...brandTier.specialties);
    }

    if (specs?.weight && specs.weight < 1000) {
      tags.push('ultralight');
    }

    if (specs?.price && specs.price < 100) {
      tags.push('budget-friendly');
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private calculatePopularity(
    brandTier?: BrandTier, 
    specs?: any, 
    seasonalAdjustment?: SeasonalAdjustment | null
  ): number {
    let popularity = 0.5; // Base popularity

    if (brandTier) {
      popularity += brandTier.marketShare;
    }

    if (seasonalAdjustment) {
      popularity *= seasonalAdjustment.popularityBoost;
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, popularity));
  }

  private generateItemHash(brand: string, name: string): string {
    // Simple hash function for generating unique item IDs
    const str = `${brand}_${name}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private selectGearForTheme(
    theme: string, 
    difficulty: 'beginner' | 'intermediate' | 'advanced', 
    gearItems: OutdoorGearItem[]
  ): OutdoorGearItem[] {
    // Filter items appropriate for the theme and difficulty
    const appropriateItems = gearItems.filter(item => 
      this.isAppropriateForActivity(item, theme) &&
      this.isAppropriateForDifficulty(item, difficulty)
    );

    // Select 4-8 items based on difficulty
    const itemCount = difficulty === 'beginner' ? 4 : difficulty === 'intermediate' ? 6 : 8;
    
    return this.selectDiverseItems(appropriateItems, itemCount);
  }

  private isAppropriateForActivity(item: OutdoorGearItem, activity: string): boolean {
    const activityMappings: Record<string, string[]> = {
      'backpacking': ['backpacks', 'tents', 'sleeping_bags', 'cooking', 'boots'],
      'car_camping': ['tents', 'sleeping_bags', 'cooking', 'camp_furniture'],
      'day_hiking': ['backpacks', 'boots', 'trekking_poles', 'hydration'],
      'rock_climbing': ['harnesses', 'ropes', 'protection', 'shoes', 'helmets'],
      'kayaking': ['kayaks', 'paddles', 'life_jackets', 'dry_bags']
    };

    const requiredCategories = activityMappings[activity] || [];
    return requiredCategories.includes(item.subcategory);
  }

  private isAppropriateForDifficulty(
    item: OutdoorGearItem, 
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  ): boolean {
    // Advanced users might prefer premium gear, beginners might prefer budget options
    if (difficulty === 'beginner' && item.price > 300) {
      return false;
    }
    
    if (difficulty === 'advanced' && item.tags.includes('budget') && !item.tags.includes('value')) {
      return false;
    }

    return true;
  }

  private selectDiverseItems(items: OutdoorGearItem[], count: number): OutdoorGearItem[] {
    const selected: OutdoorGearItem[] = [];
    const usedSubcategories = new Set<string>();

    // First, ensure category diversity
    for (const item of items) {
      if (selected.length >= count) break;
      
      if (!usedSubcategories.has(item.subcategory)) {
        selected.push(item);
        usedSubcategories.add(item.subcategory);
      }
    }

    // Fill remaining slots
    while (selected.length < count && selected.length < items.length) {
      const remainingItems = items.filter(item => 
        !selected.some(s => s.id === item.id)
      );
      
      if (remainingItems.length === 0) break;
      
      const randomItem = remainingItems[Math.floor(Math.random() * remainingItems.length)];
      selected.push(randomItem);
    }

    return selected;
  }

  private generateSetupName(theme: string, difficulty: string, season: string): string {
    const themeNames: Record<string, string> = {
      'backpacking': 'Backpacking',
      'car_camping': 'Car Camping',
      'day_hiking': 'Day Hiking',
      'rock_climbing': 'Rock Climbing',
      'kayaking': 'Kayaking',
      'mountaineering': 'Mountaineering'
    };

    const difficultyAdjectives: Record<string, string> = {
      'beginner': 'Essential',
      'intermediate': 'Complete',
      'advanced': 'Professional'
    };

    const themeName = themeNames[theme] || this.capitalizeActivity(theme);
    const difficultyAdj = difficultyAdjectives[difficulty] || 'Complete';
    
    return `${difficultyAdj} ${themeName} Setup`;
  }

  private generateSetupDescription(
    theme: string, 
    difficulty: string, 
    season: string, 
    itemCount: number
  ): string {
    const activity = this.capitalizeActivity(theme.replace('_', ' '));
    const difficultyDesc = difficulty === 'beginner' ? 'starter' : 
                          difficulty === 'intermediate' ? 'complete' : 'professional-grade';
    
    return `Carefully curated ${difficultyDesc} gear setup for ${activity} adventures. This ${itemCount}-piece kit includes everything needed for a successful ${season} expedition.`;
  }

  private generateSetupTags(theme: string, difficulty: string, season: string): string[] {
    return [
      'curated',
      'setup',
      theme,
      difficulty,
      season,
      'gear-kit',
      'complete',
      'tested'
    ];
  }

  private generateCreatorNotes(
    theme: string, 
    difficulty: string, 
    selectedGear: OutdoorGearItem[]
  ): string {
    const gearCount = selectedGear.length;
    const avgPrice = selectedGear.reduce((sum, item) => sum + item.price, 0) / gearCount;
    const totalWeight = selectedGear.reduce((sum, item) => sum + item.weight, 0);

    const notes = [
      `This ${difficulty}-level setup includes ${gearCount} carefully selected items.`,
      `Average item cost: $${Math.round(avgPrice)}, total weight: ${Math.round(totalWeight/1000 * 10)/10}kg.`,
      `Perfect for ${theme.replace('_', ' ')} enthusiasts looking for reliable gear.`
    ];

    if (difficulty === 'advanced') {
      notes.push('Recommended for experienced adventurers who understand the gear requirements.');
    } else if (difficulty === 'beginner') {
      notes.push('Great starter kit for those new to the activity.');
    }

    return notes.join(' ');
  }

  private determineVisibility(difficulty: string, totalPrice: number): boolean {
    // Advanced setups and expensive setups are more likely to be public (showcase value)
    if (difficulty === 'advanced') return Math.random() > 0.1; // 90% public
    if (totalPrice > 1000) return Math.random() > 0.2; // 80% public
    return Math.random() > 0.3; // 70% public for others
  }

  private calculateWeightEfficiency(item: OutdoorGearItem): number {
    // Simple efficiency metric: features per gram
    const featureCount = item.features.length;
    const weightInKg = item.weight / 1000;
    return featureCount / weightInKg;
  }

  private calculateValueScore(item: OutdoorGearItem): number {
    // Simple value metric: features and popularity per dollar
    const featureCount = item.features.length;
    const popularity = item.popularity || 0.5;
    return (featureCount + popularity) / item.price * 1000; // Scale for readability
  }

  private getRequiredCategoriesForActivity(activity: string): string[] {
    const mappings: Record<string, string[]> = {
      'backpacking': ['backpacks', 'sleeping_bags', 'tents'],
      'day_hiking': ['backpacks', 'boots'],
      'rock_climbing': ['harnesses', 'ropes'],
      'kayaking': ['life_jackets', 'paddles'],
      'car_camping': ['tents', 'sleeping_bags']
    };

    return mappings[activity] || ['backpacks'];
  }

  private capitalizeActivity(activity: string): string {
    return activity.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

/**
 * Gear Setup Theme Generator
 * Creates themed setups for specific use cases and adventures
 */
export class GearSetupThemeGenerator {
  /**
   * Generate themed setups for different adventure scenarios
   */
  static generateThemedSetups(gearItems: OutdoorGearItem[]): GearSetup[] {
    const generator = new OutdoorGearGenerator();
    const setups: GearSetup[] = [];

    // Adventure themes with specific requirements
    const themes = [
      { name: 'weekend_warrior', difficulty: 'intermediate' as const, season: 'summer' },
      { name: 'ultralight_thru_hiker', difficulty: 'advanced' as const, season: 'all-season' },
      { name: 'family_car_camping', difficulty: 'beginner' as const, season: 'summer' },
      { name: 'winter_mountaineering', difficulty: 'advanced' as const, season: 'winter' },
      { name: 'desert_backpacking', difficulty: 'intermediate' as const, season: 'spring' }
    ];

    for (const theme of themes) {
      const setup = generator.generateCuratedGearSetup(
        theme.name,
        theme.difficulty,
        theme.season,
        gearItems
      );
      setups.push(setup);
    }

    // Generate specialized setups
    setups.push(generator.generateUltralightSetup('backpacking', 6000, gearItems)); // 6kg limit
    setups.push(generator.generateBudgetSetup('day_hiking', 300, gearItems)); // $300 budget

    return setups;
  }
}