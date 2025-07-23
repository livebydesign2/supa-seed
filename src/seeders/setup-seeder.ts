import { SeedModule, CachedUser, CachedBaseTemplate, CachedSetup } from '../types';
import { SchemaAdapter } from '../schema-adapter';
import { getDomainConfig } from '../domains';

export class SetupSeeder extends SeedModule {
  private getSetupTypes(): Record<string, string[]> {
    const domainConfig = getDomainConfig(this.context.config.domain);
    return domainConfig.setupTypes;
  }

  // Legacy outdoor setup types for backward compatibility
  private outdoorSetupTypes: Record<string, string[]> = {
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
      const domainSetupTypes = this.getSetupTypes();
      const setupTypes = domainSetupTypes[template.type] || [];
      if (setupTypes.length === 0) {
        console.warn(`⚠️  No setup types found for template type: ${template.type}`);
        return null;
      }
      setupCategory = faker.helpers.arrayElement(setupTypes);
    } else {
      // Create a generic setup without templates
      const domainSetupTypes = this.getSetupTypes();
      const allSetupTypes = Object.values(domainSetupTypes).flat();
      template = {
        id: '',
        type: 'General',
        make: '',
        model: '',
      };
      setupCategory = faker.helpers.arrayElement(
        allSetupTypes.length > 0 ? allSetupTypes : ['Adventure Kit', 'Travel Setup', 'Outdoor Essentials', 'Exploration Gear']
      );
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
    const domainConfig = getDomainConfig(this.context.config.domain);
    
    // Use domain-specific descriptors or fallback to generic ones
    const descriptors: Record<string, string[]> = domainConfig.titleDescriptors || {
      'Vehicle': [
        'Custom', 'Professional', 'Complete', 'Premium', 'Essential',
        'Advanced', 'Standard', 'Optimized', 'Versatile', 'Reliable'
      ],
      'Backpack': [
        'Essential', 'Complete', 'Tested', 'Proven', 'Reliable', 
        'Compact', 'Versatile', 'Optimized', 'Professional', 'Premium'
      ],
      'General': [
        'Custom', 'Professional', 'Complete', 'Essential', 'Advanced',
        'Standard', 'Optimized', 'Versatile', 'Reliable', 'Premium'
      ]
    };

    const templateDescriptors = descriptors[template.type] || descriptors['General'] || ['Custom'];
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
    const domainConfig = getDomainConfig(this.context.config.domain);
    
    // Use domain-specific descriptions or fallback to generic ones
    const experiences = domainConfig.experiences || [
      'after extensive testing',
      'refined through regular use',
      'proven through experience',
      'optimized for reliability',
      'developed through practice',
      'tested in various conditions'
    ];

    const contexts = domainConfig.contexts || [
      'different environments', 'various situations', 'multiple contexts',
      'diverse conditions', 'real-world scenarios', 'practical applications'
    ];

    const experience = faker.helpers.arrayElement(experiences);
    const context = faker.helpers.arrayElement(contexts);
    
    if (template.type === 'Vehicle' && template.make && template.model) {
      return `My ${template.make} ${template.model} setup for ${category.toLowerCase()}, ${experience}. Perfect for ${context} and handling whatever comes your way. This build focuses on reliability, comfort, and versatility.`;
    } else {
      return `A carefully curated ${category.toLowerCase()} kit ${experience}. This setup has served me well across ${context}. Every item has earned its place through real-world use.`;
    }
  }
} 