import { SeedModule, CachedUser, CachedBaseTemplate, CachedSetup } from '../../../core/types/types';
import { SchemaAdapter } from '../../../core/schema-adapter';
import { getDomainConfig } from '../../../domains';
import { StreamingBatchProcessor, BatchItem, BatchResult } from '../../../core/batch-processor';
import { Logger } from '../../../core/utils/logger';
import MemoryManager from '../../../core/utils/memory-manager';
import { createQueryTranslator } from '../../../schema/query-translator';

export class SetupSeeder extends SeedModule {
  private getSetupTypes(): Record<string, string[]> {
    const domainConfig = getDomainConfig(this.context.config.domain);
    
    // Fallback to legacy outdoor setup types if domain doesn't have the needed types
    const domainSetupTypes = domainConfig.setupTypes;
    const hasVehicleTypes = domainSetupTypes['Vehicle']?.length > 0;
    const hasBackpackTypes = domainSetupTypes['Backpack']?.length > 0;
    
    if (!hasVehicleTypes || !hasBackpackTypes) {
      // Merge domain types with legacy outdoor types for backward compatibility
      return {
        ...domainSetupTypes,
        ...this.outdoorSetupTypes
      };
    }
    
    return domainSetupTypes;
  }

  /**
   * Validate configured categories against database enum constraints
   */
  private async validateCategoriesAgainstEnum(categories: string[]): Promise<{valid: boolean, errors: string[]}> {
    const { client } = this.context;
    const errors: string[] = [];
    
    try {
      // Query PostgreSQL to get enum values for outdoor_category type
      const { data: enumData, error } = await client
        .from('information_schema.enum_range')
        .select('enumlabel')
        .ilike('enumtypid', '%outdoor_category%')
        .limit(100);
        
      if (error) {
        Logger.debug('Could not query enum values, attempting alternative approach');
        
        // Alternative: Try to get enum values from pg_enum
        const { data: pgEnumData, error: pgEnumError } = await client.rpc('get_enum_values', {
          enum_name: 'outdoor_category'
        });
        
        if (pgEnumError) {
          Logger.warn('Could not validate categories against database enum - validation skipped');
          return { valid: true, errors: [] }; // Allow to proceed without validation
        }
        
        const validEnumValues = Array.isArray(pgEnumData) ? pgEnumData.map((row: any) => row.enumlabel) : [];
        const invalidCategories = categories.filter(cat => !validEnumValues.includes(cat));
        
        if (invalidCategories.length > 0) {
          errors.push(`Invalid enum values: ${invalidCategories.join(', ')}. Valid values: ${validEnumValues.join(', ')}`);
        }
        
        return { valid: errors.length === 0, errors };
      }
      
      const validEnumValues = Array.isArray(enumData) ? enumData.map((row: any) => row.enumlabel) : [];
      const invalidCategories = categories.filter(cat => !validEnumValues.includes(cat));
      
      if (invalidCategories.length > 0) {
        errors.push(`Invalid enum values: ${invalidCategories.join(', ')}. Valid values: ${validEnumValues.join(', ')}`);
      }
      
      return { valid: errors.length === 0, errors };
      
    } catch (validationError) {
      Logger.warn('Enum validation failed, proceeding without validation:', validationError);
      return { valid: true, errors: [] }; // Allow to proceed
    }
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
    console.log('🎒 Seeding setups with memory-efficient batch processing...');
    
    // Validate and log category configuration
    const configuredCategories = this.context.config.tables?.setups?.categories;
    if (configuredCategories && configuredCategories.length > 0) {
      console.log(`🎯 Using configured categories: ${configuredCategories.join(', ')}`);
      Logger.info(`Configuration-based category selection: ${configuredCategories.length} categories provided`);
      
      // Validate categories against database enum
      const validation = await this.validateCategoriesAgainstEnum(configuredCategories);
      if (!validation.valid) {
        console.error('❌ Configuration validation failed:');
        for (const error of validation.errors) {
          console.error(`   ${error}`);
        }
        Logger.error('Invalid categories in configuration', { errors: validation.errors });
        throw new Error(`Invalid category configuration: ${validation.errors.join('; ')}`);
      } else {
        console.log('✅ All configured categories validated against database schema');
        Logger.info('Category validation passed - all categories are valid enum values');
      }
    } else {
      console.log('⚠️  No categories configured, will use domain-based setup types');
      Logger.warn('No configured categories found in tables.setups.categories - falling back to hardcoded types');
    }
    
    const users = this.context.cache.get('users') as CachedUser[];
    const templates = this.context.cache.get('baseTemplates') as CachedBaseTemplate[];
    const schemaAdapter = this.context.cache.get('schemaAdapter') as SchemaAdapter;
    const noUsersCreated = this.context.cache.get('noUsersCreated') as boolean;
    
    if (!users?.length || noUsersCreated) {
      const reason = noUsersCreated ? 
        'User creation failed - check schema configuration and column mappings' :
        'No users found in cache';
      console.log(`⚠️  Skipping setup seeding: ${reason}`);
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

    // Use streaming batch processing to prevent OOM
    await this.processSetupsInBatches(users, templates, schemaAdapter);
  }

  private async createSetup(
    user: CachedUser, 
    templates: CachedBaseTemplate[],
    schemaAdapter: SchemaAdapter
  ): Promise<CachedSetup | null> {
    const { client, faker } = this.context;
    
    // Get categories from configuration first, fallback to domain-based categories
    const configuredCategories = this.context.config.tables?.setups?.categories;
    let setupCategory: string;
    let template: CachedBaseTemplate;
    
    if (configuredCategories && configuredCategories.length > 0) {
      // Use configured categories exclusively
      Logger.debug(`🎯 Using configured categories: ${configuredCategories.join(', ')}`);
      setupCategory = faker.helpers.arrayElement(configuredCategories);
      
      // Use template if available, otherwise create generic
      if (templates && templates.length > 0) {
        template = faker.helpers.arrayElement(templates);
      } else {
        template = {
          id: '',
          type: 'General',
          make: '',
          model: '',
        };
      }
    } else {
      // Fallback to legacy domain-based setup types
      Logger.debug('⚠️  No categories configured, falling back to domain-based setup types');
      
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
      // Use query translator for dynamic table mapping
      const framework = this.context.config.schema?.framework || 'makerkit';
      const translator = createQueryTranslator(client, {
        framework,
        enableValidation: true,
        enableCaching: true
      });
      
      const { data, error } = await (await translator.from('setups'))
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

  private async processSetupsInBatches(
    users: CachedUser[],
    templates: CachedBaseTemplate[],
    schemaAdapter: SchemaAdapter
  ): Promise<void> {
    const createdSetups: CachedSetup[] = [];
    
    // Configure batch processor for memory efficiency
    const batchProcessor = new StreamingBatchProcessor<CachedUser, CachedSetup[]>({
      defaultBatchSize: 25, // Smaller batches for setup generation
      memoryThresholdMB: 512, // Lower threshold for setup processing
      minBatchSize: 5,
      maxBatchSize: 50,
      forceGCBetweenBatches: true,
      batchDelayMs: 50 // Brief pause between batches
    });

    // Create a processor function for each batch of users
    const userBatchProcessor = async (userBatch: BatchItem<CachedUser>[]): Promise<BatchResult<CachedSetup[]>[]> => {
      const batchResults: BatchResult<CachedSetup[]>[] = [];
      
      for (const userItem of userBatch) {
        const batchStartTime = Date.now();
        const memoryBefore = process.memoryUsage().heapUsed / 1024 / 1024;
        
        try {
          const user = userItem.data;
          const userSetups: CachedSetup[] = [];
          
          // Generate random number of setups for this user
          const setupCount = this.context.faker.number.int({ 
            min: 1, 
            max: this.context.config.setupsPerUser 
          });
          
          Logger.debug(`🎒 Creating ${setupCount} setups for user: ${user.username}`);
          
          // Create setups for this user
          for (let i = 0; i < setupCount; i++) {
            const setup = await this.createSetup(user, templates, schemaAdapter);
            if (setup) {
              userSetups.push(setup);
              this.context.stats.setupsCreated++;
            }
          }
          
          const processingTime = Date.now() - batchStartTime;
          const memoryAfter = process.memoryUsage().heapUsed / 1024 / 1024;
          
          batchResults.push({
            success: true,
            result: userSetups,
            processingTimeMs: processingTime,
            memoryUsageMB: memoryAfter
          });
          
        } catch (error) {
          Logger.error(`❌ Failed to create setups for user ${userItem.data.username}:`, error);
          
          batchResults.push({
            success: false,
            error: error as Error,
            processingTimeMs: Date.now() - batchStartTime,
            memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
          });
        }
      }
      
      return batchResults;
    };

    Logger.info(`🔄 Processing ${users.length} users in memory-efficient batches...`);
    
    // Process all users through the batch processor
    const { results, stats, recommendations } = await batchProcessor.processAll(users, userBatchProcessor);
    
    // Collect all successful results
    let totalSetups = 0;
    for (const result of results) {
      if (result.success && result.result) {
        createdSetups.push(...result.result);
        totalSetups += result.result.length;
      }
    }
    
    // Cache the results
    this.context.cache.set('setups', createdSetups);
    
    // Log completion with memory statistics
    Logger.info(`✅ Setup seeding completed:`, {
      totalUsers: users.length,
      totalSetups: totalSetups,
      batchesProcessed: stats.batchesCompleted,
      peakMemoryMB: stats.peakMemoryUsageMB.toFixed(1),
      avgMemoryMB: stats.averageMemoryUsageMB.toFixed(1),
      totalTimeMs: stats.totalProcessingTimeMs
    });
    
    console.log(`✅ Created ${totalSetups} setups for ${users.length} users using streaming batch processing`);
    
    // Log recommendations if any
    if (recommendations.length > 0) {
      Logger.info('💡 Performance recommendations:', recommendations);
    }
    
    // Force final cleanup and log memory usage
    const finalMemoryStats = MemoryManager.getMemoryStats();
    Logger.info('📊 Final memory usage after setup seeding:', {
      heapUsedMB: finalMemoryStats.usage.heapUsedMB.toFixed(1),
      heapTotalMB: finalMemoryStats.usage.heapTotalMB.toFixed(1),
      percentageUsed: finalMemoryStats.percentageUsed.toFixed(1),
      recommendations: finalMemoryStats.recommendations
    });
  }
} 