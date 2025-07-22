import { SeedModule } from '../types';

export class BaseDataSeeder extends SeedModule {
  async seed(): Promise<void> {
    console.log('🗂️  Seeding base data...');
    
    await this.seedGearCategories();
    await this.seedBaseTemplates();
    
    console.log('✅ Base data seeding complete');
  }

  private async seedGearCategories(): Promise<void> {
    const { client } = this.context;
    
    const categories = [
      { name: 'Shelter', description: 'Tents, tarps, and protective gear' },
      { name: 'Sleep System', description: 'Sleeping bags, pads, and comfort items' },
      { name: 'Cooking', description: 'Stoves, cookware, and food preparation' },
      { name: 'Navigation', description: 'Maps, compass, GPS, and wayfinding tools' },
      { name: 'Safety', description: 'First aid, emergency, and safety equipment' },
      { name: 'Clothing', description: 'Base layers, shells, and outdoor apparel' },
      { name: 'Electronics', description: 'Lights, batteries, communication devices' },
      { name: 'Tools', description: 'Knives, multi-tools, and utility items' },
      { name: 'Hydration', description: 'Water bottles, filters, and treatment' },
      { name: 'Vehicle', description: 'Overland and camping vehicle modifications' },
    ];

    const existingCategories = await client
      .from('gear_categories')
      .select('name');

    const existingNames = new Set(
      existingCategories.data?.map(c => c.name) || []
    );

    const newCategories = categories.filter(
      cat => !existingNames.has(cat.name)
    );

    if (newCategories.length > 0) {
      const { error } = await client
        .from('gear_categories')
        .insert(newCategories);

      if (error) {
        throw new Error(`Failed to seed gear categories: ${error.message}`);
      }

      console.log(`   ✅ Created ${newCategories.length} gear categories`);
    } else {
      console.log('   ℹ️  Gear categories already exist, skipping');
    }
  }

  private async seedBaseTemplates(): Promise<void> {
    const { client } = this.context;
    
    const templates = [
      // Vehicle Templates
      {
        type: 'Vehicle' as const,
        make: 'Toyota',
        model: 'Tacoma',
        year: 2023,
        description: 'Mid-size pickup truck popular for overlanding'
      },
      {
        type: 'Vehicle' as const,
        make: 'Toyota',
        model: '4Runner',
        year: 2023,
        description: 'Full-size SUV with excellent off-road capability'
      },
      {
        type: 'Vehicle' as const,
        make: 'Jeep',
        model: 'Wrangler',
        year: 2023,
        description: 'Iconic 4x4 vehicle for trail adventures'
      },
      {
        type: 'Vehicle' as const,
        make: 'Ford',
        model: 'Bronco',
        year: 2023,
        description: 'Modern off-road SUV with classic heritage'
      },
      {
        type: 'Vehicle' as const,
        make: 'Subaru',
        model: 'Outback',
        year: 2023,
        description: 'All-wheel drive wagon for car camping'
      },
      // Backpack Templates
      {
        type: 'Backpack' as const,
        make: 'Osprey',
        model: 'Atmos AG 65',
        description: 'Lightweight backpacking pack with anti-gravity suspension'
      },
      {
        type: 'Backpack' as const,
        make: 'Gregory',
        model: 'Baltoro 65',
        description: 'Traditional backpacking pack with excellent load support'
      },
      {
        type: 'Backpack' as const,
        make: 'Hyperlite Mountain Gear',
        model: 'Southwest 55',
        description: 'Ultralight backpacking pack for minimalist hiking'
      },
      {
        type: 'Backpack' as const,
        make: 'Kelty',
        model: 'Coyote 65',
        description: 'Affordable, durable pack for weekend adventures'
      },
      {
        type: 'Backpack' as const,
        make: 'Deuter',
        model: 'Aircontact Lite 65+10',
        description: 'European-style pack with excellent ventilation'
      },
    ];

    const existingTemplates = await client
      .from('base_templates')
      .select('make, model, type');

    const existingKeys = new Set(
      existingTemplates.data?.map(t => `${t.type}-${t.make}-${t.model}`) || []
    );

    const newTemplates = templates.filter(
      template => !existingKeys.has(`${template.type}-${template.make}-${template.model}`)
    );

    if (newTemplates.length > 0) {
      const { error } = await client
        .from('base_templates')
        .insert(newTemplates);

      if (error) {
        throw new Error(`Failed to seed base templates: ${error.message}`);
      }

      console.log(`   ✅ Created ${newTemplates.length} base templates`);
    } else {
      console.log('   ℹ️  Base templates already exist, skipping');
    }

    // Cache templates for other seeders
    const { data: allTemplates } = await client
      .from('base_templates')
      .select('*');

    this.context.cache.set('baseTemplates', allTemplates || []);
  }
} 