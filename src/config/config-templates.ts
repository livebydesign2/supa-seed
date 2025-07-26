/**
 * Configuration Templates for SupaSeed v2.5.0
 * Implements Task 5.2.1: Create platform-specific configuration templates
 * Provides ready-to-use templates for common platform types with inheritance and composition
 */

import type { FlexibleSeedConfig } from '../config-types';
import type { 
  ConfigurationTemplate, 
  PlatformArchitectureType, 
  ContentDomainType,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig
} from './config-layers';

/**
 * Template metadata for discovery and management
 */
export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  tags: string[];
  category: 'platform' | 'domain' | 'hybrid' | 'specialized';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedSetupTime: string;
  usageCount: number;
  rating: number;
  lastUpdated: Date;
  compatibility: {
    minimumVersion: string;
    maximumVersion?: string;
    dependencies: string[];
    conflicts?: string[];
  };
  examples: {
    useCase: string;
    description: string;
    code?: string;
  }[];
}

/**
 * Template composition and inheritance settings
 */
export interface TemplateComposition {
  baseTemplates: string[]; // Templates to inherit from
  overrides: {
    path: string;
    value: any;
    reason: string;
  }[];
  mergeStrategy: {
    arrays: 'replace' | 'merge' | 'append';
    objects: 'replace' | 'merge' | 'deep_merge';
    primitives: 'replace' | 'prefer_override' | 'prefer_base';
  };
  conditionalLogic?: {
    condition: string;
    apply: any;
    description: string;
  }[];
}

/**
 * Complete configuration template with all features
 */
export interface CompleteConfigurationTemplate extends ConfigurationTemplate {
  metadata: TemplateMetadata;
  composition: TemplateComposition;
  validation: {
    required: string[];
    optional: string[];
    constraints: {
      path: string;
      rule: string;
      message: string;
    }[];
  };
  documentation: {
    overview: string;
    setup: string[];
    customization: string[];
    troubleshooting: string[];
    examples: any[];
  };
}

/**
 * Individual Creator Platform Templates
 * For platforms focused on individual content creation and sharing
 */
export const INDIVIDUAL_PLATFORM_TEMPLATES: CompleteConfigurationTemplate[] = [
  {
    id: 'individual-outdoor-creator',
    name: 'Individual Outdoor Creator Platform',
    description: 'Perfect for Wildernest-style outdoor gear and adventure sharing platforms',
    version: '1.0.0',
    targets: {
      architectures: ['individual'],
      domains: ['outdoor'],
      complexity: 'intermediate'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 12,
          contentRatios: {
            publicContent: 0.8, // High public sharing in outdoor community
            privateContent: 0.15,
            sharedContent: 0.05
          },
          relationships: {
            generateRelationships: true,
            relationshipDensity: 0.4, // Moderate community connections
            respectConstraints: true
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        platform: {
          architecture: 'individual',
          confidence: 0.95,
          evidence: {
            tablePatterns: ['setups', 'gear_items', 'base_templates'],
            relationshipPatterns: ['user_id foreign keys', 'public sharing patterns'],
            constraintPatterns: ['outdoor domain indicators'],
            namingConventions: ['outdoor terminology']
          },
          architectureSettings: {
            individual: {
              focusOnPersonalContent: true,
              enableSocialFeatures: true,
              contentSharingRatio: 0.8,
              communityInteraction: 'high',
              personalBranding: true
            }
          }
        },
        domain: {
          domain: 'outdoor',
          confidence: 0.95,
          evidence: {
            tableNames: ['setups', 'gear_items', 'categories', 'base_templates'],
            columnPatterns: ['gear', 'outdoor', 'adventure'],
            dataTypes: ['gear categories', 'outdoor brands'],
            businessLogicHints: ['gear setup creation', 'adventure sharing']
          },
          domainSettings: {
            outdoor: {
              gearFocus: true,
              locationData: true,
              weatherAwareness: true,
              safetyEmphasis: true,
              brandAuthenticity: true,
              seasonalContent: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        domainExtensions: {
          enabled: [{ name: 'outdoor', enabled: true }]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'individual',
            targetDomain: 'outdoor',
            usersPerArchetype: { min: 2, max: 4 },
            distributionStrategy: 'weighted',
            includedCategories: ['gear_enthusiast', 'adventure_creator', 'community_expert', 'gear_reviewer'],
            excludedCategories: ['team_leader', 'enterprise_user'],
            experienceLevelDistribution: {
              beginner: 0.25,
              intermediate: 0.45,
              advanced: 0.25,
              expert: 0.05
            },
            generateRelationships: true,
            relationshipDensity: 0.4,
            applyDomainCustomizations: true
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'individual-outdoor-creator',
      name: 'Individual Outdoor Creator Platform',
      description: 'Perfect for Wildernest-style outdoor gear and adventure sharing platforms',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['individual', 'outdoor', 'gear', 'adventure', 'wildernest', 'creator'],
      category: 'platform',
      difficulty: 'intermediate',
      estimatedSetupTime: '5-10 minutes',
      usageCount: 0,
      rating: 5.0,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['outdoor-extension', 'individual-archetypes']
      },
      examples: [
        {
          useCase: 'Adventure gear sharing platform',
          description: 'Create realistic outdoor gear setups with community features'
        },
        {
          useCase: 'Equipment review platform',
          description: 'Generate authentic gear reviews and recommendations'
        }
      ]
    },
    composition: {
      baseTemplates: [],
      overrides: [],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['userCount', 'domain', 'extensions'],
      constraints: [
        {
          path: 'extensions.outdoor',
          rule: 'enabled === true',
          message: 'Outdoor extension must be enabled for outdoor creator templates'
        }
      ]
    },
    documentation: {
      overview: 'This template creates a realistic outdoor gear sharing platform similar to Wildernest, with individual creators sharing gear setups and adventure content.',
      setup: [
        'Requires outdoor domain extension',
        'Generates 12 diverse outdoor enthusiasts',
        'Creates realistic gear setups with authentic brands',
        'Includes community features and social interactions'
      ],
      customization: [
        'Adjust userCount for platform size',
        'Modify contentRatios for sharing patterns',
        'Customize gear categories and brands',
        'Configure relationship density for community feel'
      ],
      troubleshooting: [
        'Ensure outdoor extension is available',
        'Verify database supports gear-related tables',
        'Check that public sharing is enabled'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['userCount', 'contentRatios', 'archetypes.experienceLevelDistribution'],
      defaults: {
        userCount: 12,
        publicContentRatio: 0.8,
        relationshipDensity: 0.4
      },
      validation: {}
    }
  },

  {
    id: 'individual-creative-portfolio',
    name: 'Individual Creative Portfolio Platform',
    description: 'For individual creators showcasing work and building personal brands',
    version: '1.0.0',
    targets: {
      architectures: ['individual'],
      domains: ['generic', 'social'],
      complexity: 'beginner'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 8,
          contentRatios: {
            publicContent: 0.9, // Very high public visibility for portfolios
            privateContent: 0.08,
            sharedContent: 0.02
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        platform: {
          architecture: 'individual',
          confidence: 0.9,
          architectureSettings: {
            individual: {
              focusOnPersonalContent: true,
              enableSocialFeatures: true,
              contentSharingRatio: 0.9,
              personalBranding: true,
              portfolioFocus: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'individual',
            targetDomain: 'generic',
            includedCategories: ['content_creator', 'portfolio_artist', 'personal_brand', 'creative_professional'],
            experienceLevelDistribution: {
              beginner: 0.3,
              intermediate: 0.4,
              advanced: 0.25,
              expert: 0.05
            }
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'individual-creative-portfolio',
      name: 'Individual Creative Portfolio Platform',
      description: 'For individual creators showcasing work and building personal brands',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['individual', 'creative', 'portfolio', 'personal-brand', 'showcase'],
      category: 'platform',
      difficulty: 'beginner',
      estimatedSetupTime: '3-5 minutes',
      usageCount: 0,
      rating: 4.8,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['individual-archetypes']
      },
      examples: [
        {
          useCase: 'Artist portfolio platform',
          description: 'Showcase creative work with high visibility'
        }
      ]
    },
    composition: {
      baseTemplates: [],
      overrides: [],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['userCount', 'contentRatios'],
      constraints: []
    },
    documentation: {
      overview: 'Creates a platform focused on individual creative portfolios with high public visibility.',
      setup: [
        'Generates creative professionals and artists',
        'High public content ratio for portfolio visibility',
        'Focuses on personal branding and showcase features'
      ],
      customization: [
        'Adjust user types for different creative fields',
        'Modify content visibility ratios',
        'Customize portfolio features'
      ],
      troubleshooting: [
        'Ensure portfolio-related tables exist',
        'Verify public content permissions'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['userCount', 'contentRatios'],
      defaults: {
        userCount: 8,
        publicContentRatio: 0.9
      },
      validation: {}
    }
  }
];

/**
 * Team Collaboration Platform Templates
 * For platforms focused on team productivity and collaboration
 */
export const TEAM_PLATFORM_TEMPLATES: CompleteConfigurationTemplate[] = [
  {
    id: 'team-saas-productivity',
    name: 'Team SaaS Productivity Platform',
    description: 'For team-based SaaS platforms focused on productivity and collaboration',
    version: '1.0.0',
    targets: {
      architectures: ['team'],
      domains: ['saas'],
      complexity: 'intermediate'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 15,
          contentRatios: {
            publicContent: 0.3, // Lower public, more team-internal
            privateContent: 0.4,
            sharedContent: 0.3 // High team sharing
          },
          relationships: {
            generateRelationships: true,
            relationshipDensity: 0.6, // High team connectivity
            respectConstraints: true
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        platform: {
          architecture: 'team',
          confidence: 0.95,
          architectureSettings: {
            team: {
              enableTeamCollaboration: true,
              teamSizeRange: { min: 3, max: 8 },
              workspaceManagement: true,
              permissionComplexity: 'moderate',
              hierarchicalStructure: true
            }
          }
        },
        domain: {
          domain: 'saas',
          confidence: 0.95,
          domainSettings: {
            saas: {
              productivityFocus: true,
              integrationHeavy: true,
              analyticsEnabled: true,
              workflowOptimization: true,
              subscriptionBased: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        domainExtensions: {
          enabled: [{ name: 'saas', enabled: true }]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'team',
            targetDomain: 'saas',
            usersPerArchetype: { min: 2, max: 5 },
            distributionStrategy: 'weighted',
            includedCategories: ['team_admin', 'team_member', 'project_manager', 'productivity_expert'],
            experienceLevelDistribution: {
              beginner: 0.2,
              intermediate: 0.5,
              advanced: 0.25,
              expert: 0.05
            },
            generateRelationships: true,
            relationshipDensity: 0.6,
            applyDomainCustomizations: true
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'team-saas-productivity',
      name: 'Team SaaS Productivity Platform',
      description: 'For team-based SaaS platforms focused on productivity and collaboration',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['team', 'saas', 'productivity', 'collaboration', 'workspace'],
      category: 'platform',
      difficulty: 'intermediate',
      estimatedSetupTime: '8-12 minutes',
      usageCount: 0,
      rating: 4.9,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['saas-extension', 'team-archetypes']
      },
      examples: [
        {
          useCase: 'Project management platform',
          description: 'Team collaboration with projects, tasks, and workflows'
        },
        {
          useCase: 'Productivity suite',
          description: 'Workspace management with team coordination features'
        }
      ]
    },
    composition: {
      baseTemplates: [],
      overrides: [],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['userCount', 'teamSize', 'workspaceConfig'],
      constraints: [
        {
          path: 'extensions.saas',
          rule: 'enabled === true',
          message: 'SaaS extension must be enabled for SaaS productivity templates'
        }
      ]
    },
    documentation: {
      overview: 'Creates a realistic team-based SaaS productivity platform with multiple teams, projects, and collaboration features.',
      setup: [
        'Generates multiple teams with realistic hierarchies',
        'Creates projects, tasks, and productivity workflows',
        'Includes subscription and billing scenarios',
        'Sets up team collaboration and permission patterns'
      ],
      customization: [
        'Adjust team sizes and structures',
        'Modify collaboration patterns',
        'Customize productivity features',
        'Configure subscription models'
      ],
      troubleshooting: [
        'Ensure SaaS extension is available',
        'Verify team-related tables exist',
        'Check subscription model compatibility'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['userCount', 'teamConfiguration', 'subscriptionModel'],
      defaults: {
        userCount: 15,
        teamsCount: 3,
        relationshipDensity: 0.6
      },
      validation: {}
    }
  },

  {
    id: 'team-ecommerce-marketplace',
    name: 'Team E-commerce Marketplace Platform',
    description: 'For team-managed e-commerce platforms and marketplaces',
    version: '1.0.0',
    targets: {
      architectures: ['team'],
      domains: ['ecommerce'],
      complexity: 'advanced'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 20,
          contentRatios: {
            publicContent: 0.7, // High product visibility
            privateContent: 0.2, // Internal management
            sharedContent: 0.1   // Vendor sharing
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        platform: {
          architecture: 'team',
          confidence: 0.95,
          architectureSettings: {
            team: {
              enableTeamCollaboration: true,
              teamSizeRange: { min: 5, max: 12 },
              workspaceManagement: true,
              permissionComplexity: 'high',
              vendorManagement: true
            }
          }
        },
        domain: {
          domain: 'ecommerce',
          confidence: 0.95,
          domainSettings: {
            ecommerce: {
              productCatalogs: true,
              inventoryManagement: true,
              orderProcessing: true,
              paymentIntegration: true,
              vendorSupport: true,
              multiChannelSales: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        domainExtensions: {
          enabled: [{ name: 'ecommerce', enabled: true }]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'team',
            targetDomain: 'ecommerce',
            includedCategories: ['marketplace_admin', 'vendor_manager', 'product_curator', 'order_processor', 'customer_support'],
            experienceLevelDistribution: {
              beginner: 0.15,
              intermediate: 0.45,
              advanced: 0.3,
              expert: 0.1
            }
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'team-ecommerce-marketplace',
      name: 'Team E-commerce Marketplace Platform',
      description: 'For team-managed e-commerce platforms and marketplaces',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['team', 'ecommerce', 'marketplace', 'vendors', 'products'],
      category: 'platform',
      difficulty: 'advanced',
      estimatedSetupTime: '15-20 minutes',
      usageCount: 0,
      rating: 4.7,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['ecommerce-extension', 'team-archetypes']
      },
      examples: [
        {
          useCase: 'Multi-vendor marketplace',
          description: 'Platform with multiple vendors and complex product management'
        }
      ]
    },
    composition: {
      baseTemplates: [],
      overrides: [],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['vendorCount', 'productCategories'],
      constraints: []
    },
    documentation: {
      overview: 'Creates a complex e-commerce marketplace with team management, vendor systems, and product catalogs.',
      setup: [
        'Generates vendor teams and marketplace admins',
        'Creates product catalogs with realistic inventory',
        'Sets up order processing and payment workflows',
        'Includes vendor management and permissions'
      ],
      customization: [
        'Configure vendor structures',
        'Adjust product categories and inventory',
        'Modify payment and shipping options',
        'Customize marketplace rules'
      ],
      troubleshooting: [
        'Ensure e-commerce extension is available',
        'Verify product and order tables exist',
        'Check payment integration compatibility'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['vendorCount', 'productCategories', 'paymentMethods'],
      defaults: {
        userCount: 20,
        vendorCount: 5,
        productsPerVendor: 15
      },
      validation: {}
    }
  }
];

/**
 * Hybrid Platform Templates
 * For platforms supporting both individual and team usage patterns
 */
export const HYBRID_PLATFORM_TEMPLATES: CompleteConfigurationTemplate[] = [
  {
    id: 'hybrid-social-collaboration',
    name: 'Hybrid Social Collaboration Platform',
    description: 'Supports both individual content creation and team collaboration features',
    version: '1.0.0',
    targets: {
      architectures: ['hybrid'],
      domains: ['social', 'saas'],
      complexity: 'advanced'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 18,
          contentRatios: {
            publicContent: 0.6, // Balanced public/private mix
            privateContent: 0.25,
            sharedContent: 0.15
          },
          relationships: {
            generateRelationships: true,
            relationshipDensity: 0.5, // Moderate connectivity
            respectConstraints: true
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        platform: {
          architecture: 'hybrid',
          confidence: 0.9,
          architectureSettings: {
            hybrid: {
              balanceRatio: 0.6, // 60% individual, 40% team
              enableFlexibleRoles: true,
              supportMultiContext: true,
              adaptivePermissions: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        domainExtensions: {
          enabled: [
            { name: 'social', enabled: true },
            { name: 'saas', enabled: true }
          ]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'hybrid',
            targetDomain: 'social',
            includedCategories: ['individual_creator', 'team_member', 'community_leader', 'hybrid_user'],
            experienceLevelDistribution: {
              beginner: 0.25,
              intermediate: 0.45,
              advanced: 0.25,
              expert: 0.05
            }
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'hybrid-social-collaboration',
      name: 'Hybrid Social Collaboration Platform',
      description: 'Supports both individual content creation and team collaboration features',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['hybrid', 'social', 'collaboration', 'flexible', 'multi-context'],
      category: 'hybrid',
      difficulty: 'advanced',
      estimatedSetupTime: '12-18 minutes',
      usageCount: 0,
      rating: 4.6,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['social-extension', 'saas-extension', 'hybrid-archetypes']
      },
      examples: [
        {
          useCase: 'Social productivity platform',
          description: 'Individual and team features in one platform'
        }
      ]
    },
    composition: {
      baseTemplates: [],
      overrides: [],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['hybridRatio', 'contextSwitching'],
      constraints: []
    },
    documentation: {
      overview: 'Creates a platform that seamlessly supports both individual and team usage patterns.',
      setup: [
        'Generates users with hybrid roles and permissions',
        'Creates both individual and team content',
        'Sets up flexible collaboration features',
        'Includes context-switching capabilities'
      ],
      customization: [
        'Adjust individual vs team balance',
        'Configure context-switching rules',
        'Modify collaboration patterns',
        'Customize permission models'
      ],
      troubleshooting: [
        'Ensure both social and SaaS extensions are available',
        'Verify flexible permission system',
        'Check context-switching functionality'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['hybridRatio', 'contextSwitching', 'permissionModel'],
      defaults: {
        userCount: 18,
        hybridRatio: 0.6,
        contextSwitching: true
      },
      validation: {}
    }
  }
];

/**
 * Domain-Specific Templates
 * Specialized templates for specific use cases and industries
 */
export const DOMAIN_SPECIFIC_TEMPLATES: CompleteConfigurationTemplate[] = [
  {
    id: 'wildernest-optimized',
    name: 'Wildernest Optimized Template',
    description: 'Specifically optimized for Wildernest outdoor gear platforms',
    version: '1.0.0',
    targets: {
      architectures: ['individual'],
      domains: ['outdoor'],
      complexity: 'specialized'
    },
    layers: {
      universal: {
        seeding: {
          defaultUserCount: 15,
          contentRatios: {
            publicContent: 0.85, // Very high public sharing
            privateContent: 0.1,
            sharedContent: 0.05
          }
        }
      } as Partial<UniversalCoreConfig>,
      detection: {
        domain: {
          domain: 'outdoor',
          confidence: 1.0, // Perfect confidence for specialized template
          domainSettings: {
            outdoor: {
              gearFocus: true,
              locationData: true,
              weatherAwareness: true,
              safetyEmphasis: true,
              brandAuthenticity: true,
              seasonalContent: true,
              wildernestOptimized: true
            }
          }
        }
      } as Partial<SmartDetectionConfig>,
      extensions: {
        domainExtensions: {
          enabled: [{ name: 'outdoor', enabled: true }]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'individual',
            targetDomain: 'outdoor',
            includedCategories: ['wildernest_creator', 'gear_expert', 'adventure_guide', 'outdoor_photographer'],
            customArchetypes: [
              {
                email: 'wildernest.creator@example.com',
                role: 'user',
                purpose: 'Primary Wildernest content creator',
                archetype: 'wildernest_creator',
                contentPatterns: {
                  setupsPerMonth: 4,
                  gearPerSetup: 8,
                  reviewsPerMonth: 6
                }
              }
            ]
          }
        }
      } as Partial<ExtensionsLayerConfig>
    },
    metadata: {
      id: 'wildernest-optimized',
      name: 'Wildernest Optimized Template',
      description: 'Specifically optimized for Wildernest outdoor gear platforms',
      version: '1.0.0',
      author: 'SupaSeed v2.5.0',
      tags: ['wildernest', 'outdoor', 'specialized', 'gear', 'optimized'],
      category: 'specialized',
      difficulty: 'intermediate',
      estimatedSetupTime: '8-12 minutes',
      usageCount: 0,
      rating: 5.0,
      lastUpdated: new Date(),
      compatibility: {
        minimumVersion: '2.5.0',
        dependencies: ['outdoor-extension', 'wildernest-archetypes']
      },
      examples: [
        {
          useCase: 'Wildernest production environment',
          description: 'Production-ready data for Wildernest platform'
        }
      ]
    },
    composition: {
      baseTemplates: ['individual-outdoor-creator'],
      overrides: [
        {
          path: 'seeding.defaultUserCount',
          value: 15,
          reason: 'Wildernest requires more diverse user base'
        },
        {
          path: 'seeding.contentRatios.publicContent',
          value: 0.85,
          reason: 'Wildernest emphasizes public gear sharing'
        }
      ],
      mergeStrategy: {
        arrays: 'merge',
        objects: 'deep_merge',
        primitives: 'replace'
      }
    },
    validation: {
      required: ['supabaseUrl', 'supabaseServiceKey'],
      optional: ['wildernestFeatures', 'gearCategories'],
      constraints: [
        {
          path: 'domain',
          rule: 'equals "outdoor"',
          message: 'Wildernest template requires outdoor domain'
        }
      ]
    },
    documentation: {
      overview: 'This template is specifically designed and optimized for Wildernest outdoor gear platforms.',
      setup: [
        'Inherits from individual-outdoor-creator template',
        'Adds Wildernest-specific customizations',
        'Includes specialized gear categories and brands',
        'Optimizes for high public content sharing'
      ],
      customization: [
        'Configure Wildernest-specific features',
        'Adjust gear categories for target audience',
        'Modify content sharing patterns',
        'Customize adventure types and locations'
      ],
      troubleshooting: [
        'Ensure base template is available',
        'Verify Wildernest-specific extensions',
        'Check outdoor domain compatibility'
      ],
      examples: []
    },
    customization: {
      requiredFields: [],
      optionalFields: ['wildernestFeatures', 'gearCategories', 'adventureTypes'],
      defaults: {
        userCount: 15,
        wildernestOptimized: true,
        publicContentRatio: 0.85
      },
      validation: {}
    }
  }
];

/**
 * All available configuration templates organized by category
 */
export const ALL_CONFIGURATION_TEMPLATES: Record<string, CompleteConfigurationTemplate[]> = {
  individual: INDIVIDUAL_PLATFORM_TEMPLATES,
  team: TEAM_PLATFORM_TEMPLATES,
  hybrid: HYBRID_PLATFORM_TEMPLATES,
  specialized: DOMAIN_SPECIFIC_TEMPLATES
};

/**
 * Quick template lookup by ID
 */
export const TEMPLATE_REGISTRY: Record<string, CompleteConfigurationTemplate> = Object.values(ALL_CONFIGURATION_TEMPLATES)
  .flat()
  .reduce((registry, template) => {
    registry[template.id] = template;
    return registry;
  }, {} as Record<string, CompleteConfigurationTemplate>);

/**
 * Template discovery utilities
 */
export function findTemplatesByArchitecture(architecture: PlatformArchitectureType): CompleteConfigurationTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter(template => 
    template.targets.architectures.includes(architecture)
  );
}

export function findTemplatesByDomain(domain: ContentDomainType): CompleteConfigurationTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter(template => 
    template.targets.domains.includes(domain)
  );
}

export function findTemplatesByTags(tags: string[]): CompleteConfigurationTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter(template => 
    tags.some(tag => template.metadata.tags.includes(tag))
  );
}

export function findTemplatesByComplexity(complexity: string): CompleteConfigurationTemplate[] {
  return Object.values(TEMPLATE_REGISTRY).filter(template => 
    template.targets.complexity === complexity
  );
}

export function getRecommendedTemplates(
  architecture?: PlatformArchitectureType,
  domain?: ContentDomainType,
  difficulty?: string
): CompleteConfigurationTemplate[] {
  let candidates = Object.values(TEMPLATE_REGISTRY);

  if (architecture) {
    candidates = candidates.filter(template => 
      template.targets.architectures.includes(architecture)
    );
  }

  if (domain) {
    candidates = candidates.filter(template => 
      template.targets.domains.includes(domain)
    );
  }

  if (difficulty) {
    candidates = candidates.filter(template => 
      template.metadata.difficulty === difficulty
    );
  }

  // Sort by rating and usage count
  return candidates.sort((a, b) => {
    const ratingDiff = b.metadata.rating - a.metadata.rating;
    if (ratingDiff !== 0) return ratingDiff;
    return b.metadata.usageCount - a.metadata.usageCount;
  });
}