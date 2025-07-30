import { SeedModule, CachedSetup } from '../../../core/types/types';

export class GearSeeder extends SeedModule {
  private gearData = {
    'Shelter': [
      { make: 'MSR', model: 'Hubba Hubba NX 2P', price: 449.99, weight: '3 lbs 7 oz' },
      { make: 'Big Agnes', model: 'Copper Spur HV UL2', price: 499.95, weight: '3 lbs 2 oz' },
      { make: 'Nemo', model: 'Dagger 2P', price: 419.95, weight: '3 lbs 14 oz' },
      { make: 'REI Co-op', model: 'Quarter Dome SL 2', price: 299.00, weight: '2 lbs 14 oz' },
      { make: 'Zpacks', model: 'Duplex Tent', price: 699.00, weight: '1 lb 5 oz' },
    ],
    'Sleep System': [
      { make: 'Western Mountaineering', model: 'UltraLite Sleeping Bag', price: 485.00, weight: '1 lb 14 oz' },
      { make: 'Therm-a-Rest', model: 'NeoAir XLite', price: 199.95, weight: '12 oz' },
      { make: 'Sea to Summit', model: 'Ether Light XT', price: '179.95', weight: '1 lb 1 oz' },
      { make: 'Enlightened Equipment', model: 'Revelation 20°', price: 285.00, weight: '1 lb 4 oz' },
      { make: 'Nemo', model: 'Tensor Insulated', price: 169.95, weight: '1 lb' },
    ],
    'Cooking': [
      { make: 'Jetboil', model: 'MiniMo', price: 149.95, weight: '14.6 oz' },
      { make: 'MSR', model: 'PocketRocket 2', price: 49.95, weight: '2.6 oz' },
      { make: 'Toaks', model: 'Titanium 750ml Pot', price: 54.95, weight: '3.4 oz' },
      { make: 'GSI Outdoors', model: 'Pinnacle Camper', price: 79.95, weight: '1 lb 6 oz' },
      { make: 'Snow Peak', model: 'LiteMax Stove', price: 59.95, weight: '1.9 oz' },
    ],
    'Navigation': [
      { make: 'Garmin', model: 'inReach Mini 2', price: 399.99, weight: '3.5 oz' },
      { make: 'Suunto', model: 'MC-2 Compass', price: 79.95, weight: '2.5 oz' },
      { make: 'Garmin', model: 'eTrex 32x', price: 199.99, weight: '5 oz' },
      { make: 'Silva', model: 'Ranger 2.0 Compass', price: 49.95, weight: '1.6 oz' },
      { make: 'National Geographic', model: 'Trails Illustrated Maps', price: 14.95, weight: '1 oz' },
    ],
    'Safety': [
      { make: 'Adventure Medical Kits', model: 'Ultralight .7', price: 59.95, weight: '7 oz' },
      { make: 'Black Diamond', model: 'Storm 500-R Headlamp', price: 59.95, weight: '3.2 oz' },
      { make: 'Petzl', model: 'Tikka Headlamp', price: 39.95, weight: '2.8 oz' },
      { make: 'SOL', model: 'Emergency Bivvy', price: 19.95, weight: '3.8 oz' },
      { make: 'Garmin', model: 'inReach Explorer+', price: 449.99, weight: '7.5 oz' },
    ],
    'Clothing': [
      { make: 'Patagonia', model: 'Houdini Jacket', price: 129.00, weight: '3.1 oz' },
      { make: 'Arc\'teryx', model: 'Beta AR Jacket', price: 650.00, weight: '1 lb 2 oz' },
      { make: 'Smartwool', model: 'Merino 150 Base Layer', price: 75.00, weight: '5.5 oz' },
      { make: 'Darn Tough', model: 'Vermont Hiker Socks', price: 22.00, weight: '2.1 oz' },
      { make: 'Outdoor Research', model: 'Ferrosi Pants', price: 139.00, weight: '11.5 oz' },
    ],
    'Electronics': [
      { make: 'Black Diamond', model: 'Spot 400 Headlamp', price: 39.95, weight: '2.75 oz' },
      { make: 'Goal Zero', model: 'Nomad 10 Solar Panel', price: 149.95, weight: '1 lb 2 oz' },
      { make: 'Anker', model: 'PowerCore 10000', price: 35.99, weight: '6.35 oz' },
      { make: 'BioLite', model: 'HeadLamp 330', price: 99.95, weight: '3 oz' },
      { make: 'Garmin', model: 'Fenix 7 Solar', price: 749.99, weight: '2.2 oz' },
    ],
    'Tools': [
      { make: 'Leatherman', model: 'Wave+ Multi-tool', price: 119.95, weight: '8.5 oz' },
      { make: 'Benchmade', model: 'Bugout 535', price: 165.00, weight: '1.85 oz' },
      { make: 'Victorinox', model: 'Swiss Army Huntsman', price: 44.99, weight: '3.7 oz' },
      { make: 'Opinel', model: 'No. 8 Carbon Steel', price: 18.99, weight: '1.6 oz' },
      { make: 'Gerber', model: 'Gear Paranite Axe', price: 79.99, weight: '1 lb 15 oz' },
    ],
    'Hydration': [
      { make: 'Hydro Flask', model: '32 oz Wide Mouth', price: 44.95, weight: '15.2 oz' },
      { make: 'Nalgene', model: '32oz Wide Mouth', price: 12.95, weight: '6.25 oz' },
      { make: 'Katadyn', model: 'BeFree Water Filter', price: 44.95, weight: '2.3 oz' },
      { make: 'Sawyer', model: 'Squeeze Water Filter', price: 37.99, weight: '3 oz' },
      { make: 'Platypus', model: 'GravityWorks 4L', price: 109.95, weight: '11.5 oz' },
    ],
    'Vehicle': [
      { make: 'Yakima', model: 'SkyBox 16 Cargo Box', price: 449.00, weight: '35 lbs' },
      { make: 'Dometic', model: 'CFX3 55IM Fridge', price: 1249.00, weight: '57 lbs' },
      { make: 'ARB', model: 'Awning 2500', price: 459.00, weight: '55 lbs' },
      { make: 'Rhino-Rack', model: 'Pioneer Platform', price: 799.95, weight: '110 lbs' },
      { make: 'Goal Zero', model: 'Yeti 400 Power Station', price: 449.95, weight: '29 lbs' },
    ],
  };

  async seed(): Promise<void> {
    console.log('⚙️  Seeding gear items...');
    
    const setups = this.context.cache.get('setups') as CachedSetup[];
    console.log(`🔍 Checking cache for setups... found ${setups?.length || 0} setups`);
    
    if (!setups?.length) {
      const cacheKeys = Array.from(this.context.cache.keys());
      console.error('❌ CRITICAL: No setups found in cache for gear seeding');
      console.error(`   Available cache keys: ${cacheKeys.join(', ')}`);
      console.error('   This indicates a dependency chain failure.');
      console.error('   Gear seeding requires setups to be created and cached first.');
      throw new Error('Dependency validation failed: GearSeeder requires cached setups');
    }

    // First, seed all gear items to the database
    await this.seedGearItems();
    
    // Then, associate gear with setups
    await this.associateGearWithSetups(setups);
    
    console.log('✅ Gear seeding complete');
  }

  private async seedGearItems(): Promise<void> {
    const { client } = this.context;
    
    // NEW: Get configuration for gear generation
    const gearConfig = this.context.config.tables?.gear;
    const requestedCount = gearConfig?.count || 0;
    const forceGeneration = gearConfig?.forceGeneration || false;
    const categoryStrategy = gearConfig?.categoryStrategy || 'auto';
    
    console.log(`🎯 Gear configuration: count=${requestedCount}, forceGeneration=${forceGeneration}, categoryStrategy=${categoryStrategy}`);
    
    if (requestedCount <= 0) {
      console.log('ℹ️  No gear items requested (count=0), skipping gear generation');
      return;
    }
    
    // Detect category strategy for gear table
    const detectedStrategy = await this.detectGearCategoryStrategy();
    const finalStrategy = categoryStrategy === 'auto' ? detectedStrategy.strategy : categoryStrategy;
    
    console.log(`🔍 Category strategy: ${finalStrategy} (detected: ${detectedStrategy.strategy})`);
    
    let categoryMap: Record<string, string> = {};
    let availableGearItems: any[] = [];
    
    if (finalStrategy === 'enum') {
      // Use enum-based categories
      availableGearItems = await this.createEnumGearItemPool(detectedStrategy, gearConfig);
      console.log(`📦 Available gear pool: ${availableGearItems.length} items with enum categories`);
    } else if (finalStrategy === 'fk') {
      // Use FK-based categories (original logic)
      categoryMap = await this.ensureGearCategories();
      availableGearItems = this.createGearItemPool(categoryMap);
      console.log(`📦 Available gear pool: ${availableGearItems.length} items across ${Object.keys(categoryMap).length} categories`);
    } else {
      console.warn('⚠️  Unable to determine category strategy, falling back to FK-based');
      categoryMap = await this.ensureGearCategories();
      availableGearItems = this.createGearItemPool(categoryMap);
      console.log(`📦 Available gear pool: ${availableGearItems.length} items across ${Object.keys(categoryMap).length} categories`);
    }
    
    if (availableGearItems.length === 0) {
      console.warn('⚠️  No gear items available for generation');
      return;
    }
    
    // Generate the requested number of gear items
    const itemsToCreate = this.selectGearItems(availableGearItems, requestedCount, forceGeneration);
    console.log(`🔄 Creating ${itemsToCreate.length} gear items...`);
    
    let totalCreated = 0;
    let totalSkipped = 0;
    
    for (const itemData of itemsToCreate) {
      try {
        // Determine table name (try gear_items first, then gear)
        const tableName = await this.getGearTableName();
        
        // Check if item already exists (unless force generation is enabled)
        if (!forceGeneration) {
          const { data: existingItem } = await client
            .from(tableName)
            .select('id')
            .eq('make', itemData.make)
            .eq('model', itemData.model)
            .single();

          if (existingItem) {
            totalSkipped++;
            continue;
          }
        }

        // Prepare insertion data based on strategy
        const insertData: any = {
          make: itemData.make,
          model: itemData.model,
          price: itemData.price,
          weight: itemData.weight,
          description: itemData.description,
        };

        // Add category data based on strategy
        if (finalStrategy === 'enum') {
          // For enum strategy, use the enum column directly
          const categoryColumn = detectedStrategy.categoryColumn || 'category';
          insertData[categoryColumn] = itemData[categoryColumn];
          
          // Also store the gear type for reference
          if (itemData.gear_type) {
            insertData.gear_type = itemData.gear_type;
          }
        } else {
          // For FK strategy, use category_id
          insertData.category_id = itemData.category_id;
        }

        const { error } = await client
          .from(tableName)
          .insert(insertData);

        if (error) {
          console.error(`❌ Failed to create gear item ${itemData.make} ${itemData.model}:`, error);
        } else {
          totalCreated++;
        }
      } catch (error) {
        console.error(`❌ Error creating gear item ${itemData.make} ${itemData.model}:`, error);
      }
    }

    console.log(`   ✅ Created ${totalCreated} new gear items (${totalSkipped} skipped as duplicates)`);
    
    // Validate we created the expected count
    if (totalCreated < requestedCount && !forceGeneration) {
      console.warn(`⚠️  Created fewer items than requested (${totalCreated}/${requestedCount}) - likely due to existing duplicates`);
      console.warn(`💡 Use "forceGeneration": true to create variants and reach exact count`);
    } else if (totalCreated === requestedCount) {
      console.log(`🎯 Successfully generated exactly ${requestedCount} gear items as requested`);
    }
  }

  /**
   * Check if a column exists in a table
   */
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    const schemaAdapter = new (await import('../../../core/schema-adapter')).SchemaAdapter(this.context.client);
    return await schemaAdapter.columnExists(tableName, columnName);
  }

  /**
   * Get the gear table name (try multiple possibilities)
   */
  private async getGearTableName(): Promise<string> {
    const schemaAdapter = new (await import('../../../core/schema-adapter')).SchemaAdapter(this.context.client);
    
    const possibleNames = ['gear_items', 'gear', 'equipment', 'items'];
    for (const tableName of possibleNames) {
      const exists = await schemaAdapter.tableExists(tableName);
      if (exists) {
        return tableName;
      }
    }
    
    // Default to gear_items if none found
    return 'gear_items';
  }

  /**
   * Detect gear table category strategy
   */
  private async detectGearCategoryStrategy(): Promise<{
    strategy: 'enum' | 'fk' | 'none';
    categoryColumn?: string;
    enumValues?: string[];
    categoryTableName?: string;
  }> {
    const schemaAdapter = new (await import('../../../core/schema-adapter')).SchemaAdapter(this.context.client);
    
    // First check for gear_items table
    let tableName = 'gear_items';
    const gearItemsExists = await schemaAdapter.tableExists(tableName);
    
    if (!gearItemsExists) {
      // Try alternative table names
      const alternativeNames = ['gear', 'equipment', 'items'];
      for (const altName of alternativeNames) {
        const exists = await schemaAdapter.tableExists(altName);
        if (exists) {
          tableName = altName;
          break;
        }
      }
    }
    
    console.log(`🔍 Detecting category strategy for table: ${tableName}`);
    return await schemaAdapter.detectCategoryStrategy(tableName);
  }

  /**
   * Create gear item pool for enum-based categories
   */
  private async createEnumGearItemPool(detectedStrategy: any, gearConfig: any): Promise<any[]> {
    const pool: any[] = [];
    const { categoryColumn, enumValues } = detectedStrategy;
    
    // Get enum values from config or detected values
    const availableEnumValues = gearConfig?.enumCategories || enumValues || [];
    
    if (availableEnumValues.length === 0) {
      console.warn('⚠️  No enum values available for gear categories');
      return [];
    }
    
    console.log(`🏷️  Using enum categories: ${availableEnumValues.join(', ')}`);
    
    // Create category mapping from gear types to enum values
    const categoryMapping = gearConfig?.categoryMapping || this.createDefaultCategoryMapping(availableEnumValues);
    
    for (const [gearType, items] of Object.entries(this.gearData)) {
      // Map gear type to enum value
      const enumValue = categoryMapping[gearType] || this.findBestEnumMatch(gearType, availableEnumValues);
      
      if (!enumValue) {
        console.warn(`⚠️  No enum mapping found for gear type '${gearType}', skipping`);
        continue;
      }
      
      for (const item of items) {
        pool.push({
          [categoryColumn || 'category']: enumValue,
          gear_type: gearType,
          make: item.make,
          model: item.model,
          price: item.price,
          weight: item.weight,
          description: `${item.make} ${item.model} - Professional grade outdoor gear`,
        });
      }
    }
    
    return pool;
  }

  /**
   * Create default category mapping for enum values
   */
  private createDefaultCategoryMapping(enumValues: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    
    // Common mappings for outdoor gear
    const commonMappings = [
      { gearTypes: ['Shelter'], enumValue: 'backpacking' },
      { gearTypes: ['Sleep System'], enumValue: 'backpacking' },
      { gearTypes: ['Cooking'], enumValue: 'car-camping' },
      { gearTypes: ['Navigation', 'Safety'], enumValue: 'ultralight' },
      { gearTypes: ['Clothing'], enumValue: 'backpacking' },
      { gearTypes: ['Electronics'], enumValue: 'overlanding' },
      { gearTypes: ['Tools'], enumValue: 'car-camping' },
      { gearTypes: ['Hydration'], enumValue: 'ultralight' },
      { gearTypes: ['Vehicle'], enumValue: 'overlanding' },
    ];
    
    for (const { gearTypes, enumValue } of commonMappings) {
      if (enumValues.includes(enumValue)) {
        for (const gearType of gearTypes) {
          mapping[gearType] = enumValue;
        }
      }
    }
    
    // Fallback to first available enum value for unmapped types
    const fallbackEnum = enumValues[0];
    for (const gearType of Object.keys(this.gearData)) {
      if (!mapping[gearType]) {
        mapping[gearType] = fallbackEnum;
      }
    }
    
    console.log(`🗺️  Category mapping:`, mapping);
    return mapping;
  }

  /**
   * Find best enum match for a gear type
   */
  private findBestEnumMatch(gearType: string, enumValues: string[]): string | null {
    const gearTypeLower = gearType.toLowerCase();
    
    // Direct matches
    for (const enumValue of enumValues) {
      if (gearTypeLower.includes(enumValue.toLowerCase()) || enumValue.toLowerCase().includes(gearTypeLower)) {
        return enumValue;
      }
    }
    
    // Semantic matches
    const semanticMatches: Record<string, string[]> = {
      'backpacking': ['shelter', 'sleep', 'clothing', 'hydration'],
      'car-camping': ['cooking', 'tools'],
      'overlanding': ['vehicle', 'electronics'],
      'ultralight': ['navigation', 'safety', 'hydration'],
      'van-life': ['vehicle', 'electronics', 'cooking']
    };
    
    for (const [enumValue, keywords] of Object.entries(semanticMatches)) {
      if (enumValues.includes(enumValue)) {
        for (const keyword of keywords) {
          if (gearTypeLower.includes(keyword)) {
            return enumValue;
          }
        }
      }
    }
    
    // Fallback to first available enum value
    return enumValues[0] || null;
  }

  /**
   * Ensure all gear categories exist in the database
   */
  private async ensureGearCategories(): Promise<Record<string, string>> {
    const { client } = this.context;
    const categoryMap: Record<string, string> = {};
    
    console.log('🔍 Checking gear categories...');
    
    for (const categoryName of Object.keys(this.gearData)) {
      try {
        // Try to get existing category
        let { data: category } = await client
          .from('gear_categories')
          .select('id')
          .eq('name', categoryName)
          .single();
        
        // Create category if it doesn't exist
        if (!category) {
          console.log(`📝 Creating missing category: ${categoryName}`);
          const { data: newCategory, error } = await client
            .from('gear_categories')
            .insert({ name: categoryName })
            .select('id')
            .single();
          
          if (error) {
            console.warn(`⚠️  Failed to create category '${categoryName}':`, error);
            continue;
          }
          category = newCategory;
        }
        
        if (category?.id) {
          categoryMap[categoryName] = category.id as string;
        }
      } catch (error) {
        console.warn(`⚠️  Error handling category '${categoryName}':`, error);
      }
    }
    
    console.log(`✅ Available categories: ${Object.keys(categoryMap).join(', ')}`);
    return categoryMap;
  }

  /**
   * Create a pool of all available gear items with their category IDs
   */
  private createGearItemPool(categoryMap: Record<string, string>): any[] {
    const pool: any[] = [];
    
    for (const [categoryName, items] of Object.entries(this.gearData)) {
      const categoryId = categoryMap[categoryName];
      if (!categoryId) {
        console.warn(`⚠️  No category ID for '${categoryName}', skipping items`);
        continue;
      }
      
      for (const item of items) {
        pool.push({
          category_id: categoryId,
          category_name: categoryName,
          make: item.make,
          model: item.model,
          price: item.price,
          weight: item.weight,
          description: `${item.make} ${item.model} - Professional grade outdoor gear`,
        });
      }
    }
    
    return pool;
  }

  /**
   * Select specific number of gear items from the pool
   */
  private selectGearItems(availableItems: any[], requestedCount: number, forceGeneration: boolean): any[] {
    const { faker } = this.context;
    
    if (requestedCount >= availableItems.length) {
      // If requesting more items than available, we need to create variants
      if (forceGeneration) {
        return this.createGearVariants(availableItems, requestedCount);
      } else {
        console.log(`ℹ️  Requested ${requestedCount} items but only ${availableItems.length} available - returning all available`);
        return [...availableItems];
      }
    }
    
    // Randomly select the requested number of items
    return faker.helpers.arrayElements(availableItems, requestedCount);
  }

  /**
   * Create variants of existing gear items to reach requested count
   */
  private createGearVariants(baseItems: any[], requestedCount: number): any[] {
    const { faker } = this.context;
    const result: any[] = [...baseItems]; // Start with all base items
    
    // Create variants until we reach requested count
    while (result.length < requestedCount) {
      const baseItem = faker.helpers.arrayElement(baseItems);
      const variant = {
        ...baseItem,
        model: `${baseItem.model} (Variant ${result.length - baseItems.length + 1})`,
        price: baseItem.price * faker.number.float({ min: 0.8, max: 1.2 }), // ±20% price variation
      };
      result.push(variant);
    }
    
    return result.slice(0, requestedCount); // Ensure exact count
  }

  private async associateGearWithSetups(setups: CachedSetup[]): Promise<void> {
    const { client, faker } = this.context;
    
    console.log(`🔗 Creating gear-setup associations for ${setups.length} setups...`);
    
    // Detect category strategy and table name
    const detectedStrategy = await this.detectGearCategoryStrategy();
    const tableName = await this.getGearTableName();
    
    // Get all gear items with appropriate category selection
    let selectQuery = 'id, make, model, price, weight';
    
    if (detectedStrategy.strategy === 'enum') {
      // For enum strategy, select the enum column directly
      const categoryColumn = detectedStrategy.categoryColumn || 'category';
      selectQuery += `, ${categoryColumn}`;
      if (await this.columnExists(tableName, 'gear_type')) {
        selectQuery += ', gear_type';
      }
    } else {
      // For FK strategy, join with categories table
      selectQuery += ', gear_categories!inner(name)';
    }
    
    const { data: allGear } = await client
      .from(tableName)
      .select(selectQuery);

    if (!allGear?.length) {
      console.log('⚠️  No gear items found, skipping associations');
      return;
    }
    
    console.log(`📦 Found ${allGear.length} gear items available for associations`);

    let totalAssociations = 0;

    for (const setup of setups) {
      // Determine gear compatibility based on setup category
      const relevantGear = this.selectRelevantGear(setup, allGear);
      const itemCount = faker.number.int({ min: 3, max: 12 });
      const selectedGear = faker.helpers.arrayElements(relevantGear, itemCount);

      for (const gear of selectedGear) {
        const setupItem = {
          setup_id: setup.id,
          gear_item_id: gear.id,
          quantity: faker.helpers.weightedArrayElement([
            { weight: 80, value: 1 },
            { weight: 15, value: 2 },
            { weight: 5, value: 3 },
          ]),
          notes: this.generateGearNotes(gear),
          is_essential: faker.datatype.boolean(0.3), // 30% marked as essential
        };

        const { error } = await client
          .from('setup_items')
          .insert(setupItem);

        if (error) {
          console.error(`❌ Failed to associate gear with setup:`, error);
        } else {
          totalAssociations++;
        }
      }
    }

    console.log(`   ✅ Created ${totalAssociations} gear-setup associations (avg ${Math.round(totalAssociations / setups.length)} per setup)`);
  }

  private selectRelevantGear(setup: CachedSetup, allGear: any[]): any[] {
    // Filter gear based on setup type and category
    const isVehicleSetup = setup.category.includes('Vehicle') || setup.category.includes('overlanding') || 
                          (setup.baseTemplateId && setup.baseTemplateId.includes('Vehicle'));
    
    return allGear.filter(gear => {
      // Handle enum-based categories
      if (gear.category || gear.outdoor_category) {
        const gearCategory = gear.category || gear.outdoor_category;
        const gearType = gear.gear_type || '';
        
        if (isVehicleSetup) {
          // Vehicle setups prefer overlanding/car-camping gear
          return ['overlanding', 'car-camping'].includes(gearCategory) || 
                 ['Vehicle', 'Electronics', 'Safety', 'Cooking', 'Tools'].includes(gearType);
        } else {
          // Backpack setups prefer backpacking/ultralight gear
          return ['backpacking', 'ultralight'].includes(gearCategory) && 
                 !['Vehicle'].includes(gearType);
        }
      }
      
      // Handle FK-based categories (original logic)
      if (gear.gear_categories?.name) {
        if (isVehicleSetup) {
          return ['Vehicle', 'Electronics', 'Safety', 'Cooking', 'Tools'].includes(gear.gear_categories.name);
        } else {
          return !['Vehicle'].includes(gear.gear_categories.name);
        }
      }
      
      // If no category info available, include all gear
      return true;
    });
  }

  private generateGearNotes(gear: any): string {
    const { faker } = this.context;
    
    const experiences = [
      'Reliable workhorse in my kit',
      'Has never let me down',
      'Excellent value for money',
      'Worth every penny',
      'Essential for my adventures',
      'Upgraded from cheaper alternatives',
      'Perfect for my needs',
      'Highly recommended',
      'Used on every trip',
      'Game changer for comfort',
    ];

    const conditions = [
      'in harsh weather',
      'on multi-day trips',
      'in extreme conditions',
      'over many seasons',
      'in various terrains',
      'for years now',
      'in challenging environments',
      'across different climates',
    ];

    const experience = faker.helpers.arrayElement(experiences);
    const condition = faker.helpers.arrayElement(conditions);
    
    return `${experience} ${condition}.`;
  }
} 