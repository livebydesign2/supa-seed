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
    if (!setups?.length) {
      console.log('⚠️  No setups found in cache, skipping gear seeding');
      return;
    }

    // First, seed all gear items to the database
    await this.seedGearItems();
    
    // Then, associate gear with setups
    await this.associateGearWithSetups(setups);
    
    console.log('✅ Gear seeding complete');
  }

  private async seedGearItems(): Promise<void> {
    const { client } = this.context;
    
    let totalCreated = 0;
    
    for (const [categoryName, items] of Object.entries(this.gearData)) {
      // Get the category ID
      const { data: category } = await client
        .from('gear_categories')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!category) {
        console.warn(`⚠️  Category '${categoryName}' not found, skipping`);
        continue;
      }

      for (const item of items) {
        // Check if item already exists
        const { data: existingItem } = await client
          .from('gear_items')
          .select('id')
          .eq('make', item.make)
          .eq('model', item.model)
          .single();

        if (existingItem) {
          continue; // Skip if already exists
        }

        const { error } = await client
          .from('gear_items')
          .insert({
            category_id: category.id,
            make: item.make,
            model: item.model,
            price: item.price,
            weight: item.weight,
            description: `${item.make} ${item.model} - Professional grade outdoor gear`,
          });

        if (error) {
          console.error(`❌ Failed to create gear item ${item.make} ${item.model}:`, error);
        } else {
          totalCreated++;
        }
      }
    }

    console.log(`   ✅ Created ${totalCreated} new gear items`);
  }

  private async associateGearWithSetups(setups: CachedSetup[]): Promise<void> {
    const { client, faker } = this.context;
    
    // Get all gear items
    const { data: allGear } = await client
      .from('gear_items')
      .select(`
        id, make, model, price, weight,
        gear_categories!inner(name)
      `);

    if (!allGear?.length) {
      console.log('⚠️  No gear items found, skipping associations');
      return;
    }

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

    console.log(`   ✅ Created ${totalAssociations} gear associations`);
  }

  private selectRelevantGear(setup: CachedSetup, allGear: any[]): any[] {
    // Filter gear based on setup type and category
    if (setup.category.includes('Vehicle') || (setup.baseTemplateId && setup.baseTemplateId.includes('Vehicle'))) {
      // Vehicle setups get vehicle-specific gear plus general outdoor gear
      return allGear.filter(gear => 
        ['Vehicle', 'Electronics', 'Safety', 'Cooking', 'Tools'].includes(gear.gear_categories.name)
      );
    } else {
      // Backpack setups get lighter, more portable gear
      return allGear.filter(gear => 
        !['Vehicle'].includes(gear.gear_categories.name)
      );
    }
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