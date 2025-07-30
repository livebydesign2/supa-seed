import { BaseSeeder } from './base-seeder';
import { Logger } from '../../../core/utils/logger';
import { getDomainConfig } from '../../../domains';
import { SchemaAdapter } from '../../../core/schema-adapter';

export class BaseDataSeeder extends BaseSeeder {
  
  /**
   * Check if a column exists in a table (helper method)
   */
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { error } = await this.context.client
        .from(tableName)
        .select(columnName)
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get the correct column name for a field, checking config and existence
   */
  private async getColumnMapping(tableName: string, expectedField: string, fallbacks: string[] = []): Promise<string | null> {
    // First check if config override specifies a mapping
    const configMapping = this.getConfigColumnMapping(tableName, expectedField);
    if (configMapping && await this.columnExists(tableName, configMapping)) {
      return configMapping;
    }
    
    // Fall back to checking all options
    const allOptions = [expectedField, ...fallbacks];
    
    for (const option of allOptions) {
      if (await this.columnExists(tableName, option)) {
        return option;
      }
    }
    
    return null;
  }

  /**
   * Get column mapping from configuration with enhanced support
   */
  private getConfigColumnMapping(tableName: string, expectedField: string): string | null {
    if (!this.context.config?.schema) return null;
    
    // Handle base_templates table mappings
    if (tableName === 'base_templates' && this.context.config.schema?.baseTemplateTable) {
      const table = this.context.config.schema.baseTemplateTable;
      switch (expectedField) {
        case 'description': return table.descriptionField || null;
        case 'type': return table.typeField || null;
        case 'make': return table.makeField || null;
        case 'model': return table.modelField || null;
        case 'year': return table.yearField || null;
      }
    }
    
    // Handle profiles table mappings
    if (tableName === 'profiles' && this.context.config.schema?.userTable) {
      const table = this.context.config.schema.userTable;
      switch (expectedField) {
        case 'picture_url':
        case 'avatar_url': return table.pictureField || null;
        case 'bio': return (table as any).bioField || null;
        case 'name':
        case 'display_name': return table.nameField || null;
      }
    }
    
    return null;
  }
  async seed(): Promise<void> {
    console.log('🗂️  Seeding base data...');
    
    await this.seedCategories();
    await this.seedBaseTemplates();
    
    console.log('✅ Base data seeding complete');
  }

  private async seedCategories(): Promise<void> {
    const domainConfig = getDomainConfig(this.context.config.domain);
    const categories = domainConfig.categories;

    await this.seedWithFallback(
      async () => {
        const { client } = this.context;
        
        const { data: existingCategories, error: selectError } = await client
          .from('categories')
          .select('name');

        if (selectError) {
          throw new Error(`Failed to check existing categories: ${selectError.message}`);
        }

        const existingNames = new Set(
          existingCategories?.map(c => c.name) || []
        );

        const newCategories = categories.filter(
          cat => !existingNames.has(cat.name)
        );

        if (newCategories.length > 0) {
          const { error: insertError } = await client
            .from('categories')
            .insert(newCategories);

          if (insertError) {
            throw insertError;
          }

          Logger.complete(`Created ${newCategories.length} categories`);
        } else {
          Logger.info('Categories already exist, skipping');
        }
      },
      'categories',
      'Categories are optional for basic seeding'
    );
  }

  private async seedBaseTemplates(): Promise<void> {
    // Get schema adapter to check column existence
    const schemaAdapter = this.context.cache.get('schemaAdapter') as SchemaAdapter;
    
    // Check what description column to use based on config and existence
    const descriptionColumn = await this.getColumnMapping('base_templates', 'description', ['info', 'details', 'notes']);
    const hasDescriptionColumn = descriptionColumn !== null;
    
    const baseTemplateData = [
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
    
    // Use correct description column or remove if none exists
    const templates = hasDescriptionColumn ? 
      baseTemplateData.map(template => {
        if (descriptionColumn !== 'description') {
          // Rename description field to match actual column
          const { description, ...rest } = template;
          return { ...rest, [descriptionColumn!]: description };
        }
        return template;
      }) :
      baseTemplateData.map(({ description, ...rest }) => rest);

    await this.seedWithFallback(
      async () => {
        const { client } = this.context;
        
        const { data: existingTemplates, error: selectError } = await client
          .from('base_templates')
          .select('make, model, type');

        if (selectError) {
          throw new Error(`Failed to check existing templates: ${selectError.message}`);
        }

        const existingKeys = new Set(
          existingTemplates?.map(t => `${t.type}-${t.make}-${t.model}`) || []
        );

        const newTemplates = templates.filter(
          template => !existingKeys.has(`${template.type}-${template.make}-${template.model}`)
        );

        if (newTemplates.length > 0) {
          const { error: insertError } = await client
            .from('base_templates')
            .insert(newTemplates);

          if (insertError) {
            // Provide better error message for column issues
            const errorMsg = insertError.message.includes('column') && !hasDescriptionColumn ?
              `Base template creation failed: description column not found. ${insertError.message}` :
              insertError.message;
            throw new Error(errorMsg);
          }

          const msg = hasDescriptionColumn ? 
            `Created ${newTemplates.length} base templates` :
            `Created ${newTemplates.length} base templates (without descriptions - column not found)`;
          Logger.complete(msg);
        } else {
          Logger.info('Base templates already exist, skipping');
        }

        // Cache templates for other seeders
        const { data: allTemplates } = await client
          .from('base_templates')
          .select('*');

        this.context.cache.set('baseTemplates', allTemplates || []);
      },
      'base_templates',
      'Base templates are optional for basic seeding'
    );
    
    // Ensure cache has at least empty array if table doesn't exist
    if (!this.context.cache.has('baseTemplates')) {
      this.context.cache.set('baseTemplates', []);
    }
  }

  /**
   * Legacy function for backward compatibility
   * @deprecated Use seedCategories instead
   */
  private async seedGearCategories(): Promise<void> {
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
    
    // Use the main seedCategories logic but with hardcoded categories
    await this.seedWithFallback(
      async () => {
        const { client } = this.context;
        const { data: existingCategories, error: selectError } = await client
          .from('categories')
          .select('name');
        if (selectError) {
          throw new Error(`Failed to check existing categories: ${selectError.message}`);
        }
        const existingNames = new Set(existingCategories?.map(c => c.name) || []);
        const newCategories = categories.filter(cat => !existingNames.has(cat.name));
        if (newCategories.length > 0) {
          const { error: insertError } = await client.from('categories').insert(newCategories);
          if (insertError) throw insertError;
          Logger.complete(`Created ${newCategories.length} categories`);
        } else {
          Logger.info('Categories already exist, skipping');
        }
      },
      'categories',
      'Categories are optional for basic seeding'
    );
  }
} 