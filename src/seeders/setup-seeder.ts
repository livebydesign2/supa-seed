import { SeedModule, CachedUser, CachedBaseTemplate, CachedSetup } from '../types';
import { SchemaAdapter } from '../schema-adapter';

export class SetupSeeder extends SeedModule {
  private setupTypes: Record<string, string[]> = {
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
    const schemaAdapter = this.context.cache.get('schemaAdapter') as SchemaAdapter;
    
    if (!users?.length) {
      console.log('⚠️  No users found in cache, skipping setup seeding');
      return;
    }

    // Check if setups table exists
    if (!(await this.checkTableExists('setups'))) {
      console.log('⚠️  Setups table not found, skipping setup seeding');
      return;
    }

    if (!templates?.length) {
      console.log('⚠️  No base templates found in cache, creating default setups instead');
    }

    const createdSetups: CachedSetup[] = [];

    for (const user of users) {
      const setupCount = this.context.faker.number.int({ 
        min: 1, 
        max: this.context.config.setupsPerUser 
      });
      
      for (let i = 0; i < setupCount; i++) {
        const setup = await this.createSetup(user, templates, schemaAdapter);
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
    templates: CachedBaseTemplate[],
    schemaAdapter: SchemaAdapter
  ): Promise<CachedSetup | null> {
    const { client, faker } = this.context;
    
    // Pick a random template (or create generic if no templates)
    let template: CachedBaseTemplate;
    let setupCategory: string;
    
    if (templates && templates.length > 0) {
      template = faker.helpers.arrayElement(templates);
      const setupTypes = this.setupTypes[template.type] || [];
      if (setupTypes.length === 0) {
        console.warn(`⚠️  No setup types found for template type: ${template.type}`);
        return null;
      }
      setupCategory = faker.helpers.arrayElement(setupTypes);
    } else {
      // Create a generic setup without templates
      template = {
        id: '',
        type: 'General',
        make: '',
        model: '',
      };
      setupCategory = faker.helpers.arrayElement([
        'Adventure Kit', 'Travel Setup', 'Outdoor Essentials', 'Exploration Gear'
      ]);
    }
    
    // Generate contextual title and description
    const title = this.generateSetupTitle(template, setupCategory);
    const description = this.generateSetupDescription(template, setupCategory);
    
    // Use schema adapter to determine the correct foreign key
    const userForeignKey = schemaAdapter ? schemaAdapter.getUserForeignKey() : 'account_id';
    
    const setupData: any = {
      [userForeignKey]: user.id,
      title,
      description,
      category: setupCategory,
      is_public: faker.datatype.boolean(0.8), // 80% public
      created_at: faker.date.between({ 
        from: new Date('2024-01-01'), 
        to: new Date() 
      }).toISOString(),
    };
    
    // Only add base_template_id if we have a real template
    if (template.id) {
      setupData.base_template_id = template.id;
    }

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
        id: data.id as string,
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
    
    const descriptors: Record<string, string[]> = {
      'Vehicle': [
        'Overland', 'Adventure', 'Expedition', 'Journey', 'Explorer',
        'Wanderer', 'Nomad', 'Trail', 'Backcountry', 'Wilderness'
      ],
      'Backpack': [
        'Minimalist', 'Ultralight', 'Essential', 'Complete', 'Tested',
        'Proven', 'Reliable', 'Compact', 'Versatile', 'Optimized'
      ]
    };

    const templateDescriptors = descriptors[template.type] || ['Custom'];
    const desc = faker.helpers.arrayElement(templateDescriptors);
    const year = template.year || '';
    
    if (template.type === 'Vehicle' && template.make && template.model) {
      return `${desc} ${template.make} ${template.model} ${year} Build`.trim();
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
    
    if (template.type === 'Vehicle' && template.make && template.model) {
      return `My ${template.make} ${template.model} setup for ${category.toLowerCase()}, ${experience}. Perfect for exploring ${terrain} and handling whatever adventure throws your way. This build focuses on reliability, comfort, and versatility.`;
    } else {
      return `A carefully curated ${category.toLowerCase()} kit ${experience}. This loadout has served me well across ${terrain} and various weather conditions. Every item has earned its place through real-world use.`;
    }
  }
} 