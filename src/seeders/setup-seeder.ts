import { SeedModule, CachedUser, CachedBaseTemplate, CachedSetup } from '../types';

export class SetupSeeder extends SeedModule {
  private setupTypes = {
    'Vehicle': [
      'Weekend Car Camping',
      'Extended Overland Trip',
      'Daily Driver + Adventure',
      'Base Camp Setup',
      'Family Road Trip',
      'Solo Adventure Rig',
      'Photography Expedition',
      'Hunting/Fishing Mobile Base'
    ],
    'Backpack': [
      'Day Hiking Essentials',
      'Overnight Backpacking',
      'Multi-day Wilderness Trek',
      'Ultralight Minimalist',
      'Photography Hiking Kit',
      'Peak Bagging Setup',
      'Winter Backpacking',
      'Desert Adventure Pack'
    ]
  };

  async seed(): Promise<void> {
    console.log('🎒 Seeding setups...');
    
    const users = this.context.cache.get('users') as CachedUser[];
    const templates = this.context.cache.get('baseTemplates') as CachedBaseTemplate[];
    
    if (!users?.length) {
      console.log('⚠️  No users found in cache, skipping setup seeding');
      return;
    }

    if (!templates?.length) {
      console.log('⚠️  No base templates found in cache, skipping setup seeding');
      return;
    }

    const createdSetups: CachedSetup[] = [];

    for (const user of users) {
      const setupCount = this.context.faker.number.int({ 
        min: 1, 
        max: this.context.config.setupsPerUser 
      });
      
      for (let i = 0; i < setupCount; i++) {
        const setup = await this.createSetup(user, templates);
        if (setup) {
          createdSetups.push(setup);
          this.context.stats.setupsCreated++;
        }
      }
    }

    this.context.cache.set('setups', createdSetups);
    console.log(`✅ Created ${createdSetups.length} setups`);
  }

  private async createSetup(
    user: CachedUser, 
    templates: CachedBaseTemplate[]
  ): Promise<CachedSetup | null> {
    const { client, faker } = this.context;
    
    // Pick a random template
    const template = faker.helpers.arrayElement(templates);
    const setupTypes = this.setupTypes[template.type];
    const setupCategory = faker.helpers.arrayElement(setupTypes);
    
    // Generate contextual title and description
    const title = this.generateSetupTitle(template, setupCategory);
    const description = this.generateSetupDescription(template, setupCategory);
    
    const setupData = {
      account_id: user.id,
      title,
      description,
      base_template_id: template.id,
      category: setupCategory,
      is_public: faker.datatype.boolean(0.8), // 80% public
      created_at: faker.date.between({ 
        from: new Date('2024-01-01'), 
        to: new Date() 
      }).toISOString(),
    };

    try {
      const { data, error } = await client
        .from('setups')
        .insert(setupData)
        .select('id')
        .single();

      if (error) {
        console.error(`❌ Failed to create setup for user ${user.username}:`, error);
        return null;
      }

      return {
        id: data.id,
        userId: user.id,
        title,
        category: setupCategory,
        baseTemplateId: template.id,
      };
    } catch (error) {
      console.error(`❌ Error creating setup:`, error);
      return null;
    }
  }

  private generateSetupTitle(template: CachedBaseTemplate, category: string): string {
    const { faker } = this.context;
    
    const descriptors = {
      'Vehicle': [
        'Overland', 'Adventure', 'Expedition', 'Journey', 'Explorer',
        'Wanderer', 'Nomad', 'Trail', 'Backcountry', 'Wilderness'
      ],
      'Backpack': [
        'Minimalist', 'Ultralight', 'Essential', 'Complete', 'Tested',
        'Proven', 'Reliable', 'Compact', 'Versatile', 'Optimized'
      ]
    };

    const desc = faker.helpers.arrayElement(descriptors[template.type]);
    const year = template.year || '';
    
    if (template.type === 'Vehicle') {
      return `${desc} ${template.make} ${template.model} ${year} Build`;
    } else {
      return `${desc} ${category} Kit`;
    }
  }

  private generateSetupDescription(template: CachedBaseTemplate, category: string): string {
    const { faker } = this.context;
    
    const experiences = [
      'after several seasons of testing',
      'refined through multiple adventures',
      'proven on countless trips',
      'optimized for reliability and comfort',
      'developed through trial and error',
      'battle-tested in various conditions'
    ];

    const terrains = [
      'mountain trails', 'desert landscapes', 'forest backroads', 
      'coastal routes', 'alpine environments', 'wilderness areas',
      'national parks', 'backcountry locations'
    ];

    const experience = faker.helpers.arrayElement(experiences);
    const terrain = faker.helpers.arrayElement(terrains);
    
    if (template.type === 'Vehicle') {
      return `My ${template.make} ${template.model} setup for ${category.toLowerCase()}, ${experience}. Perfect for exploring ${terrain} and handling whatever adventure throws your way. This build focuses on reliability, comfort, and versatility.`;
    } else {
      return `A carefully curated ${category.toLowerCase()} kit ${experience}. This loadout has served me well across ${terrain} and various weather conditions. Every item has earned its place through real-world use.`;
    }
  }
} 