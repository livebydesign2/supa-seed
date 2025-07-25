/**
 * Framework-Specific Configuration Templates for Epic 7: Configuration Extensibility Framework
 * Provides pre-configured templates for different frameworks and use cases
 */

import { ExtendedSeedConfig, FlexibleSeedConfig } from '../config-types';

export interface ConfigTemplate {
  name: string;
  description: string;
  framework: string;
  useCase: 'development' | 'staging' | 'production' | 'testing' | 'demo';
  config: Partial<ExtendedSeedConfig>;
  features: string[];
  requirements: string[];
  notes?: string[];
}

export class ConfigTemplateManager {
  private templates: Map<string, ConfigTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Get all available templates
   */
  getTemplates(): ConfigTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): ConfigTemplate | undefined {
    return this.templates.get(name);
  }

  /**
   * Get templates by framework
   */
  getTemplatesByFramework(framework: string): ConfigTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.framework === framework);
  }

  /**
   * Get templates by use case
   */
  getTemplatesByUseCase(useCase: string): ConfigTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.useCase === useCase);
  }

  /**
   * Generate configuration from template
   */
  generateFromTemplate(templateName: string, overrides: Partial<ExtendedSeedConfig> = {}): ExtendedSeedConfig {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Merge template config with overrides
    const baseConfig: ExtendedSeedConfig = {
      // Basic configuration
      supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
      environment: 'local',
      userCount: 5,
      setupsPerUser: 2,
      imagesPerSetup: 1,
      enableRealImages: false,
      seed: 'supa-seed-template',

      // Schema configuration (will be overridden by template)
      schema: {
        framework: 'simple',
        userTable: {
          name: 'users',
          emailField: 'email',
          idField: 'id',
          nameField: 'name'
        },
        setupTable: {
          name: 'setups',
          userField: 'user_id',
          titleField: 'title',
          descriptionField: 'description'
        },
        optionalTables: {}
      },

      // Storage configuration
      storage: {
        buckets: {
          setupImages: 'setup-images',
          gearImages: 'gear-images',
          profileImages: 'profile-images'
        },
        autoCreate: true
      },

      // Default seeders
      seeders: {
        enabled: ['auth', 'baseData', 'users', 'gear', 'setups', 'media'],
        order: ['auth', 'baseData', 'users', 'gear', 'setups', 'media']
      },

      // Default data
      data: {
        categories: [],
        baseTemplates: []
      }
    };

    // Deep merge template configuration
    return this.deepMerge(baseConfig, template.config, overrides) as ExtendedSeedConfig;
  }

  /**
   * Initialize all available templates
   */
  private initializeTemplates(): void {
    // MakerKit Templates
    this.templates.set('makerkit-local', this.createMakerKitLocalTemplate());
    this.templates.set('makerkit-staging', this.createMakerKitStagingTemplate());
    this.templates.set('makerkit-production', this.createMakerKitProductionTemplate());
    this.templates.set('makerkit-testing', this.createMakerKitTestingTemplate());

    // Generic/Simple Templates
    this.templates.set('generic-local', this.createGenericLocalTemplate());
    this.templates.set('generic-staging', this.createGenericStagingTemplate());
    this.templates.set('generic-production', this.createGenericProductionTemplate());

    // Specialized Templates
    this.templates.set('wildernest-outdoor', this.createWildernestTemplate());
    this.templates.set('saas-platform', this.createSaasPlatformTemplate());
    this.templates.set('ecommerce-shop', this.createEcommerceTemplate());
    this.templates.set('minimal-testing', this.createMinimalTestingTemplate());
    this.templates.set('comprehensive-demo', this.createComprehensiveDemoTemplate());
  }

  /**
   * MakerKit Local Development Template
   */
  private createMakerKitLocalTemplate(): ConfigTemplate {
    return {
      name: 'makerkit-local',
      description: 'MakerKit local development with minimal data and fast seeding',
      framework: 'makerkit',
      useCase: 'development',
      features: [
        'MakerKit framework detection',
        'Personal and team accounts',
        'Constraint-aware seeding',
        'Multi-tenant isolation',
        'Local image generation'
      ],
      requirements: [
        'MakerKit database schema',
        'Profiles and accounts tables',
        'Auth triggers configured'
      ],
      config: {
        environment: 'local',
        userCount: 4,
        setupsPerUser: 2,
        imagesPerSetup: 1,
        enableRealImages: false,
        seed: 'makerkit-local-dev',

        schema: {
          framework: 'makerkit',
          userTable: {
            name: 'profiles',
            emailField: 'email',
            idField: 'id',
            nameField: 'display_name',
            bioField: 'bio',
            pictureField: 'avatar_url'
          },
          setupTable: {
            name: 'setups',
            userField: 'user_id',
            titleField: 'title',
            descriptionField: 'description',
            categoryField: 'category',
            publicField: 'is_public'
          },
          multiTenant: {
            enabled: true,
            tenantColumn: 'account_id',
            tenantScopeDetection: 'auto',
            validationEnabled: true,
            strictIsolation: true,
            allowSharedResources: false,
            dataGeneration: {
              generatePersonalAccounts: true,
              generateTeamAccounts: true,
              personalAccountRatio: 0.6,
              dataDistributionStrategy: 'even',
              crossTenantDataAllowed: false,
              sharedResourcesEnabled: false,
              accountTypes: [
                {
                  type: 'personal',
                  weight: 0.6,
                  settings: {
                    defaultPlan: 'free',
                    features: ['basic', 'personal']
                  }
                },
                {
                  type: 'team',
                  weight: 0.4,
                  settings: {
                    minMembers: 2,
                    maxMembers: 5,
                    defaultPlan: 'pro',
                    features: ['collaboration', 'team-management']
                  }
                }
              ],
              minUsersPerTenant: 1,
              maxUsersPerTenant: 3,
              minProjectsPerTenant: 1,
              maxProjectsPerTenant: 3,
              allowCrossTenantRelationships: false,
              sharedTables: [],
              respectTenantPlans: true,
              enforceTenantLimits: true
            }
          },
          optionalTables: {
            categories: { enabled: true, autoCreate: true },
            gearItems: { enabled: true, autoCreate: true },
            setupGearItems: { enabled: true, autoCreate: true },
            setupBaseTemplates: { enabled: true, autoCreate: true }
          }
        },

        frameworkStrategy: {
          enabled: true,
          fallbackBehavior: 'generic',
          enableStrategyValidation: true
        },

        constraintHandlers: {
          enabled: true,
          overrideDefaults: false,
          enableConstraintLogging: true
        },

        schemaEvolution: {
          enabled: true,
          trackingMode: 'hash',
          cacheLocation: '.supa-seed-cache',
          autoMigration: false,
          migrationStrategies: [],
          onSchemaChange: 'warn'
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'linear',
            contentRatios: {
              publicContent: 0.7,
              privateContent: 0.3,
              draftContent: 0.0
            },
            relationshipDensity: {
              userToContent: 2,
              crossReferences: 1,
              tagConnections: 2
            },
            seasonalVariation: false,
            activityCycles: false
          },
          volumeProfiles: [
            {
              name: 'minimal',
              description: 'Minimal data for basic testing',
              userCount: 3,
              avgItemsPerUser: 2,
              avgRelationshipsPerItem: 1,
              dataQualityLevel: 'basic'
            }
          ]
        }
      },
      notes: [
        'Optimized for fast local development',
        'Uses hash-based schema evolution tracking',
        'Enables all MakerKit-specific features'
      ]
    };
  }

  /**
   * MakerKit Staging Template
   */
  private createMakerKitStagingTemplate(): ConfigTemplate {
    return {
      name: 'makerkit-staging',
      description: 'MakerKit staging environment with realistic data volumes',
      framework: 'makerkit',
      useCase: 'staging',
      features: [
        'Realistic data volumes',
        'External image integration',
        'Schema evolution detection',
        'Multi-tenant validation',
        'Production-like constraints'
      ],
      requirements: [
        'MakerKit staging database',
        'External image API keys',
        'Storage buckets configured'
      ],
      config: {
        environment: 'staging',
        userCount: 25,
        setupsPerUser: 4,
        imagesPerSetup: 3,
        enableRealImages: true,
        seed: 'makerkit-staging-2025',

        schema: {
          framework: 'makerkit',
          userTable: {
            name: 'profiles',
            emailField: 'email',
            idField: 'id',
            nameField: 'display_name',
            bioField: 'bio',
            pictureField: 'avatar_url'
          },
          setupTable: {
            name: 'setups',
            userField: 'user_id',
            titleField: 'title',
            descriptionField: 'description',
            categoryField: 'category',
            publicField: 'is_public'
          },
          multiTenant: {
            enabled: true,
            tenantColumn: 'account_id',
            tenantScopeDetection: 'auto',
            validationEnabled: true,
            strictIsolation: true,
            allowSharedResources: true,
            dataGeneration: {
              generatePersonalAccounts: true,
              generateTeamAccounts: true,
              personalAccountRatio: 0.7,
              dataDistributionStrategy: 'realistic',
              crossTenantDataAllowed: false,
              sharedResourcesEnabled: true,
              accountTypes: [
                {
                  type: 'personal',
                  weight: 0.7,
                  settings: {
                    defaultPlan: 'free',
                    features: ['basic', 'personal']
                  }
                },
                {
                  type: 'team',
                  weight: 0.25,
                  settings: {
                    minMembers: 2,
                    maxMembers: 10,
                    defaultPlan: 'pro',
                    features: ['collaboration', 'team-management', 'advanced']
                  }
                },
                {
                  type: 'organization',
                  weight: 0.05,
                  settings: {
                    minMembers: 5,
                    maxMembers: 50,
                    defaultPlan: 'enterprise',
                    features: ['enterprise', 'sso', 'advanced-analytics']
                  }
                }
              ],
              minUsersPerTenant: 1,
              maxUsersPerTenant: 10,
              minProjectsPerTenant: 2,
              maxProjectsPerTenant: 8,
              allowCrossTenantRelationships: false,
              sharedTables: ['categories', 'base_templates'],
              respectTenantPlans: true,
              enforceTenantLimits: true
            }
          }
        },

        frameworkStrategy: {
          enabled: true,
          fallbackBehavior: 'error',
          enableStrategyValidation: true
        },

        schemaEvolution: {
          enabled: true,
          trackingMode: 'timestamp',
          cacheLocation: '.supa-seed-cache',
          autoMigration: true,
          migrationStrategies: [],
          onSchemaChange: 'auto-adapt'
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.75,
              privateContent: 0.20,
              draftContent: 0.05
            },
            relationshipDensity: {
              userToContent: 4,
              crossReferences: 3,
              tagConnections: 5
            },
            seasonalVariation: true,
            activityCycles: false
          },
          volumeProfiles: [
            {
              name: 'standard',
              description: 'Standard staging data volume',
              userCount: 25,
              avgItemsPerUser: 4,
              avgRelationshipsPerItem: 3,
              dataQualityLevel: 'rich'
            }
          ]
        }
      }
    };
  }

  /**
   * MakerKit Production Template
   */
  private createMakerKitProductionTemplate(): ConfigTemplate {
    return {
      name: 'makerkit-production',
      description: 'MakerKit production demo data with comprehensive features',
      framework: 'makerkit',
      useCase: 'production',
      features: [
        'Production-scale data',
        'Advanced multi-tenancy',
        'Version-based schema tracking',
        'Activity cycle simulation',
        'Enterprise account types'
      ],
      requirements: [
        'Production MakerKit database',
        'Enterprise features enabled',
        'Full storage integration'
      ],
      config: {
        environment: 'production',
        userCount: 100,
        setupsPerUser: 6,
        imagesPerSetup: 5,
        enableRealImages: true,
        seed: 'makerkit-prod-demo-2025',

        schemaEvolution: {
          enabled: true,
          trackingMode: 'version',
          cacheLocation: '.supa-seed-cache',
          autoMigration: false,
          onSchemaChange: 'prompt'
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.60,
              privateContent: 0.35,
              draftContent: 0.05
            },
            relationshipDensity: {
              userToContent: 6,
              crossReferences: 5,
              tagConnections: 8
            },
            seasonalVariation: true,
            activityCycles: true
          },
          volumeProfiles: [
            {
              name: 'comprehensive',
              description: 'Production-scale comprehensive data',
              userCount: 100,
              avgItemsPerUser: 6,
              avgRelationshipsPerItem: 5,
              dataQualityLevel: 'production'
            }
          ]
        }
      }
    };
  }

  /**
   * MakerKit Testing Template
   */
  private createMakerKitTestingTemplate(): ConfigTemplate {
    return {
      name: 'makerkit-testing',
      description: 'MakerKit testing template with predictable data patterns',
      framework: 'makerkit',
      useCase: 'testing',
      features: [
        'Predictable data generation',
        'All constraint scenarios',
        'Edge case coverage',
        'Validation testing'
      ],
      requirements: [
        'Test database environment',
        'All MakerKit features'
      ],
      config: {
        environment: 'staging',
        userCount: 10,
        setupsPerUser: 3,
        imagesPerSetup: 2,
        enableRealImages: false,
        seed: 'makerkit-testing-fixed',

        constraintHandlers: {
          enabled: true,
          overrideDefaults: false,
          enableConstraintLogging: true,
          customHandlers: [
            {
              id: 'test-personal-account-constraint',
              type: 'check',
              priority: 100,
              tables: ['accounts'],
              handlerFunction: 'handlePersonalAccountSlugConstraint',
              description: 'Test handler for personal account slug constraint'
            }
          ]
        },

        customRelationships: {
          enabled: true,
          relationships: [
            {
              id: 'test-user-setup-relationship',
              fromTable: 'profiles',
              toTable: 'setups',
              relationshipType: 'one_to_many',
              fromColumn: 'id',
              toColumn: 'user_id',
              isRequired: true,
              cascadeDelete: true,
              generationStrategy: 'sequential'
            }
          ]
        }
      }
    };
  }

  /**
   * Generic Local Template
   */
  private createGenericLocalTemplate(): ConfigTemplate {
    return {
      name: 'generic-local',
      description: 'Generic/simple schema for local development',
      framework: 'generic',
      useCase: 'development',
      features: [
        'Simple table structure',
        'Direct insertion seeding',
        'Basic constraint handling',
        'Fast local development'
      ],
      requirements: [
        'Basic user/setup tables',
        'No framework dependencies'
      ],
      config: {
        environment: 'local',
        userCount: 5,
        setupsPerUser: 2,
        imagesPerSetup: 1,
        enableRealImages: false,

        schema: {
          framework: 'simple',
          userTable: {
            name: 'users',
            emailField: 'email',
            idField: 'id',
            nameField: 'name',
            bioField: 'bio',
            pictureField: 'avatar_url'
          },
          setupTable: {
            name: 'setups',
            userField: 'user_id',
            titleField: 'title',
            descriptionField: 'description'
          }
        },

        frameworkStrategy: {
          enabled: false
        },

        schemaEvolution: {
          enabled: true,
          trackingMode: 'hash',
          onSchemaChange: 'warn'
        }
      }
    };
  }

  /**
   * Generic Staging Template
   */
  private createGenericStagingTemplate(): ConfigTemplate {
    return {
      name: 'generic-staging',
      description: 'Generic schema for staging environment testing',
      framework: 'generic',
      useCase: 'staging',
      features: [
        'Medium data volumes',
        'Schema evolution tracking',
        'Basic relationship handling'
      ],
      requirements: [
        'Staging database',
        'Basic table structure'
      ],
      config: {
        environment: 'staging',
        userCount: 20,
        setupsPerUser: 3,
        imagesPerSetup: 2,
        enableRealImages: true,

        schemaEvolution: {
          enabled: true,
          trackingMode: 'timestamp',
          onSchemaChange: 'auto-adapt'
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.8,
              privateContent: 0.2,
              draftContent: 0.0
            },
            relationshipDensity: {
              userToContent: 3,
              crossReferences: 2,
              tagConnections: 3
            },
            seasonalVariation: false,
            activityCycles: false
          }
        }
      }
    };
  }

  /**
   * Generic Production Template
   */
  private createGenericProductionTemplate(): ConfigTemplate {
    return {
      name: 'generic-production',
      description: 'Generic schema for production demo data',
      framework: 'generic',
      useCase: 'production',
      features: [
        'Large data volumes',
        'Production-quality data',
        'Comprehensive relationships'
      ],
      requirements: [
        'Production database',
        'Full feature set'
      ],
      config: {
        environment: 'production',
        userCount: 75,
        setupsPerUser: 5,
        imagesPerSetup: 4,
        enableRealImages: true,

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.65,
              privateContent: 0.30,
              draftContent: 0.05
            },
            relationshipDensity: {
              userToContent: 5,
              crossReferences: 4,
              tagConnections: 6
            },
            seasonalVariation: true,
            activityCycles: true
          }
        }
      }
    };
  }

  /**
   * Wildernest Outdoor Template
   */
  private createWildernestTemplate(): ConfigTemplate {
    return {
      name: 'wildernest-outdoor',
      description: 'Outdoor adventure gear platform (Wildernest-style)',
      framework: 'makerkit',
      useCase: 'demo',
      features: [
        'Outdoor gear categories',
        'Adventure-themed content',
        'Seasonal data patterns',
        'Gear-specific relationships'
      ],
      requirements: [
        'MakerKit or compatible schema',
        'Outdoor domain content'
      ],
      config: {
        domain: 'outdoor-adventure',
        userCount: 15,
        setupsPerUser: 4,
        imagesPerSetup: 4,
        enableRealImages: true,

        data: {
          categories: [
            { name: 'Camping', description: 'Camping gear and supplies', icon: '⛺', color: '#22c55e' },
            { name: 'Hiking', description: 'Hiking equipment and apparel', icon: '🥾', color: '#3b82f6' },
            { name: 'Climbing', description: 'Rock and mountain climbing gear', icon: '🧗', color: '#f59e0b' },
            { name: 'Water Sports', description: 'Kayaking, rafting, and water gear', icon: '🚣', color: '#06b6d4' },
            { name: 'Winter Sports', description: 'Skiing, snowboarding, winter gear', icon: '⛷️', color: '#8b5cf6' }
          ],
          baseTemplates: [
            { type: 'Camping Setup', make: 'Outdoor', model: 'Base Camp', description: 'Complete camping setup template' },
            { type: 'Hiking Kit', make: 'Trail', model: 'Day Hike', description: 'Essential day hiking gear template' },
            { type: 'Climbing Rack', make: 'Rock', model: 'Sport', description: 'Sport climbing gear template' }
          ]
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.85,
              privateContent: 0.15,
              draftContent: 0.0
            },
            relationshipDensity: {
              userToContent: 4,
              crossReferences: 6,
              tagConnections: 8
            },
            seasonalVariation: true,
            activityCycles: false
          }
        }
      }
    };
  }

  /**
   * SaaS Platform Template
   */
  private createSaasPlatformTemplate(): ConfigTemplate {
    return {
      name: 'saas-platform',
      description: 'SaaS platform with team collaboration features',
      framework: 'makerkit',
      useCase: 'demo',
      features: [
        'Team-focused data',
        'SaaS business models',
        'Subscription tiers',
        'Collaboration patterns'
      ],
      requirements: [
        'Team-enabled MakerKit',
        'Subscription features'
      ],
      config: {
        domain: 'saas-platform',
        userCount: 30,
        setupsPerUser: 3,
        imagesPerSetup: 2,

        schema: {
          multiTenant: {
            enabled: true,
            dataGeneration: {
              generatePersonalAccounts: false,
              generateTeamAccounts: true,
              personalAccountRatio: 0.2,
              dataDistributionStrategy: 'realistic',
              accountTypes: [
                {
                  type: 'team',
                  weight: 0.7,
                  settings: {
                    minMembers: 3,
                    maxMembers: 15,
                    defaultPlan: 'pro',
                    features: ['collaboration', 'team-management', 'integrations']
                  }
                },
                {
                  type: 'organization',
                  weight: 0.3,
                  settings: {
                    minMembers: 10,
                    maxMembers: 100,
                    defaultPlan: 'enterprise',
                    features: ['enterprise', 'sso', 'advanced-analytics', 'custom-integrations']
                  }
                }
              ]
            }
          }
        }
      }
    };
  }

  /**
   * E-commerce Template
   */
  private createEcommerceTemplate(): ConfigTemplate {
    return {
      name: 'ecommerce-shop',
      description: 'E-commerce shop with product catalogs and orders',
      framework: 'generic',
      useCase: 'demo',
      features: [
        'Product-focused data',
        'Order relationships',
        'Inventory patterns',
        'Customer segments'
      ],
      requirements: [
        'E-commerce schema',
        'Product/order tables'
      ],
      config: {
        domain: 'ecommerce',
        userCount: 40,
        setupsPerUser: 5,
        imagesPerSetup: 6,
        enableRealImages: true,

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'exponential',
            contentRatios: {
              publicContent: 0.95,
              privateContent: 0.05,
              draftContent: 0.0
            },
            relationshipDensity: {
              userToContent: 5,
              crossReferences: 8,
              tagConnections: 12
            },
            seasonalVariation: true,
            activityCycles: true
          }
        }
      }
    };
  }

  /**
   * Minimal Testing Template
   */
  private createMinimalTestingTemplate(): ConfigTemplate {
    return {
      name: 'minimal-testing',
      description: 'Minimal data for fast testing and CI/CD',
      framework: 'generic',
      useCase: 'testing',
      features: [
        'Minimal data set',
        'Fast seeding',
        'Essential relationships only',
        'CI/CD optimized'
      ],
      requirements: [
        'Basic schema',
        'Fast execution needs'
      ],
      config: {
        environment: 'local',
        userCount: 2,
        setupsPerUser: 1,
        imagesPerSetup: 0,
        enableRealImages: false,
        seed: 'minimal-test-fixed',

        frameworkStrategy: {
          enabled: false
        },

        schemaEvolution: {
          enabled: false
        },

        dataVolumes: {
          enabled: false
        }
      }
    };
  }

  /**
   * Comprehensive Demo Template
   */
  private createComprehensiveDemoTemplate(): ConfigTemplate {
    return {
      name: 'comprehensive-demo',
      description: 'Comprehensive demo showcasing all features',
      framework: 'makerkit',
      useCase: 'demo',
      features: [
        'All Epic 7 features enabled',
        'Complex relationships',
        'Custom constraint handlers',
        'Schema evolution',
        'Multiple data patterns'
      ],
      requirements: [
        'Full MakerKit installation',
        'All optional features'
      ],
      config: {
        environment: 'staging',
        userCount: 50,
        setupsPerUser: 5,
        imagesPerSetup: 4,
        enableRealImages: true,

        frameworkStrategy: {
          enabled: true,
          enableStrategyValidation: true,
          fallbackBehavior: 'generic'
        },

        constraintHandlers: {
          enabled: true,
          overrideDefaults: false,
          enableConstraintLogging: true
        },

        schemaEvolution: {
          enabled: true,
          trackingMode: 'version',
          autoMigration: true,
          onSchemaChange: 'auto-adapt'
        },

        dataVolumes: {
          enabled: true,
          patterns: {
            userDistribution: 'realistic',
            contentRatios: {
              publicContent: 0.70,
              privateContent: 0.25,
              draftContent: 0.05
            },
            relationshipDensity: {
              userToContent: 5,
              crossReferences: 4,
              tagConnections: 7
            },
            seasonalVariation: true,
            activityCycles: true
          },
          volumeProfiles: [
            {
              name: 'comprehensive',
              description: 'Full feature demonstration',
              userCount: 50,
              avgItemsPerUser: 5,
              avgRelationshipsPerItem: 4,
              dataQualityLevel: 'production'
            }
          ]
        },

        customRelationships: {
          enabled: true,
          relationships: [
            {
              id: 'demo-user-content',
              fromTable: 'profiles',
              toTable: 'setups',
              relationshipType: 'one_to_many',
              fromColumn: 'id',
              toColumn: 'user_id',
              isRequired: true,
              cascadeDelete: true,
              generationStrategy: 'weighted'
            }
          ]
        }
      }
    };
  }

  /**
   * Deep merge utility for configuration objects
   */
  private deepMerge(target: any, ...sources: any[]): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      });
    }

    return this.deepMerge(target, ...sources);
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}

// Export default instance
export const configTemplateManager = new ConfigTemplateManager();