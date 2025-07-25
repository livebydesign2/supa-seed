export interface FlexibleSeedConfig {
  // Basic connection settings
  supabaseUrl: string;
  supabaseServiceKey: string;
  environment: 'local' | 'staging' | 'production';
  
  // Seeding parameters
  userCount: number;
  setupsPerUser: number;
  imagesPerSetup: number;
  enableRealImages: boolean;
  seed: string;
  emailDomain?: string;
  domain?: string; // Domain configuration (generic, outdoor, ecommerce, saas, etc.)
  createStandardTestEmails?: boolean; // Create MakerKit standard test emails (default: false)
  customTestEmails?: string[]; // Custom test email addresses
  createTeamAccounts?: boolean; // Create team accounts for testing
  testUserPassword?: string; // Password for test users
  
  // Schema configuration
  schema: {
    framework: 'simple' | 'makerkit' | 'custom';
    // Framework strategy configuration
    frameworkStrategy?: {
      enabled: boolean;
      override?: string; // Manual strategy override
      enableConstraintHandling?: boolean;
      enableBusinessLogicRespect?: boolean;
      enableRLSCompliance?: boolean;
      enableMultiTenant?: boolean;
      debug?: boolean;
    };
    // Multi-tenant configuration
    multiTenant?: {
      enabled: boolean;
      tenantColumn: string; // Default: 'account_id'
      tenantScopeDetection: 'auto' | 'manual';
      manualTenantScopes?: Record<string, {
        isTenantScoped: boolean;
        tenantColumn?: string;
        scopeType: 'strict' | 'optional' | 'shared';
      }>;
      validationEnabled: boolean;
      strictIsolation: boolean;
      allowSharedResources: boolean;
      dataGeneration: {
        generatePersonalAccounts: boolean;
        generateTeamAccounts: boolean;
        personalAccountRatio: number; // 0-1
        dataDistributionStrategy: 'even' | 'realistic' | 'skewed';
        crossTenantDataAllowed: boolean;
        sharedResourcesEnabled: boolean;
        accountTypes: Array<{
          type: 'personal' | 'team' | 'organization';
          weight: number;
          settings: {
            minMembers?: number;
            maxMembers?: number;
            defaultPlan: 'free' | 'pro' | 'enterprise';
            features: string[];
          };
        }>;
        minUsersPerTenant: number;
        maxUsersPerTenant: number;
        minProjectsPerTenant: number;
        maxProjectsPerTenant: number;
        allowCrossTenantRelationships: boolean;
        sharedTables: string[];
        respectTenantPlans: boolean;
        enforceTenantLimits: boolean;
      };
    };
    userTable: {
      name: string;
      emailField: string;
      idField: string;
      nameField: string;
      bioField?: string;
      pictureField?: string;
    };
    setupTable: {
      name: string;
      userField: string;
      titleField: string;
      descriptionField: string;
      categoryField?: string;
      publicField?: string;
    };
    baseTemplateTable?: {
      name: string;
      descriptionField: string;
      typeField?: string;
      makeField?: string;
      modelField?: string;
      yearField?: string;
    };
    optionalTables: {
      categories?: {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      gearItems?: {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      setupGearItems?: {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
      setupBaseTemplates?: {
        enabled: boolean;
        autoCreate: boolean;
        tableName?: string;
      };
    };
  };
  
  // Storage configuration
  storage: {
    buckets: {
      setupImages: string;
      gearImages: string;
      profileImages: string;
    };
    autoCreate: boolean;
  };
  
  // Seeder configuration
  seeders?: {
    enabled: string[];
    order?: string[];
    skip?: string[];
    config?: Record<string, any>;
  };
  
  // MFA Configuration (FR-1.2: Add MFA Factor Support)
  mfa?: {
    enabled: boolean;
    defaultSecurityLevel: 'basic' | 'enhanced' | 'maximum';
    distributionBySecurityLevel: {
      basic: number; // percentage of users with basic security (no MFA)
      enhanced: number; // percentage with enhanced security (1 factor)
      maximum: number; // percentage with maximum security (2+ factors)
    };
    factorTypeDistribution: {
      totpOnly: number; // percentage using TOTP only
      phoneOnly: number; // percentage using phone only
      both: number; // percentage using both TOTP and phone
    };
    supportedFactorTypes: ('totp' | 'phone')[];
    enforceForRoles: string[];
    verificationRate: number; // percentage of factors that are pre-verified
    backupCodeGeneration: boolean;
    testingScenarios: {
      includeInvalidCodes: boolean;
      includeExpiredCodes: boolean;
      includeRateLimitScenarios: boolean;
    };
    archetypeOverrides?: {
      [userEmail: string]: {
        securityLevel: 'basic' | 'enhanced' | 'maximum';
        preferredFactorTypes: ('totp' | 'phone')[];
        factorCount: number;
        phoneNumber?: string;
        backupCodesEnabled: boolean;
      };
    };
  };

  // Custom data
  data?: {
    categories?: Array<{
      name: string;
      description: string;
      icon?: string;
      color?: string;
    }>;
    baseTemplates?: Array<{
      type: string;
      make?: string;
      model?: string;
      year?: number;
      description?: string;
    }>;
    gearItems?: Array<{
      category: string;
      make?: string;
      model?: string;
      name: string;
      description?: string;
      price?: number;
    }>;
  };
}

export interface ConfigProfile {
  name: string;
  description: string;
  config: FlexibleSeedConfig;
}

export interface ConfigDetectionResult {
  framework: 'simple' | 'makerkit' | 'custom';
  hasProfiles: boolean;
  hasAccounts: boolean;
  hasSetups: boolean;
  hasCategories: boolean;
  missingTables: string[];
  suggestedConfig: Partial<FlexibleSeedConfig>;
  enhancedDetection?: {
    makerkitVersion: 'v1' | 'v2' | 'v3' | 'custom' | 'none';
    frameworkType: 'makerkit' | 'simple' | 'wildernest' | 'custom';
    primaryUserTable: 'accounts' | 'profiles' | 'users';
    customTables: number;
    relationships: number;
    assetCompatibility: {
      images: boolean;
      markdown: boolean;
      storage: 'supabase_storage' | 'url_only' | 'base64' | 'custom';
    };
  };
}

/**
 * Extended configuration interface for Epic 7: Configuration Extensibility Framework
 * Supports framework strategy overrides, custom constraint handlers, and schema evolution
 */
export interface ExtendedSeedConfig extends FlexibleSeedConfig {
  // Framework Strategy Configuration (FR-7.1)
  frameworkStrategy?: {
    enabled: boolean;
    manualOverride?: string; // Override framework detection
    customStrategies?: Array<{
      name: string;
      priority: number;
      moduleUrl?: string; // For external strategy modules
      config?: Record<string, any>;
    }>;
    fallbackBehavior: 'error' | 'generic' | 'skip';
    enableStrategyValidation: boolean;
  };

  // Custom Constraint Handlers (FR-7.2)
  constraintHandlers?: {
    enabled: boolean;
    customHandlers?: Array<{
      id: string;
      type: 'check' | 'foreign_key' | 'unique' | 'not_null';
      priority: number;
      tables?: string[]; // Specific tables or undefined for all
      handlerFunction: string; // Function name or code reference
      description?: string;
    }>;
    overrideDefaults: boolean;
    enableConstraintLogging: boolean;
  };

  // Schema Evolution Detection (FR-7.3)
  schemaEvolution?: {
    enabled: boolean;
    trackingMode: 'hash' | 'timestamp' | 'version';
    cacheLocation: string; // Path to cache schema snapshots
    autoMigration: boolean;
    migrationStrategies: Array<{
      fromVersion: string;
      toVersion: string;
      migrationSteps: Array<{
        type: 'add_table' | 'modify_column' | 'add_constraint' | 'custom';
        description: string;
        sql?: string;
        handler?: string;
      }>;
    }>;
    onSchemaChange: 'warn' | 'error' | 'auto-adapt' | 'prompt';
  };

  // Realistic Data Volume Configuration (FR-7.4)
  dataVolumes?: {
    enabled: boolean;
    patterns: {
      userDistribution: 'linear' | 'realistic' | 'exponential' | 'custom';
      contentRatios: {
        publicContent: number; // 0-1
        privateContent: number; // 0-1
        draftContent: number; // 0-1
      };
      relationshipDensity: {
        userToContent: number; // Average items per user
        crossReferences: number; // Cross-table relationship density
        tagConnections: number; // Tag/category connections per item
      };
      seasonalVariation: boolean; // Simulate seasonal content patterns
      activityCycles: boolean; // Simulate user activity cycles
    };
    volumeProfiles: Array<{
      name: string;
      description: string;
      userCount: number;
      avgItemsPerUser: number;
      avgRelationshipsPerItem: number;
      dataQualityLevel: 'basic' | 'rich' | 'production';
    }>;
  };

  // Custom Table Relationship Definitions (FR-7.5)
  customRelationships?: {
    enabled: boolean;
    relationships: Array<{
      id: string;
      fromTable: string;
      toTable: string;
      relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
      fromColumn: string;
      toColumn: string;
      isRequired: boolean;
      cascadeDelete: boolean;
      generationStrategy: 'sequential' | 'random' | 'weighted' | 'custom';
      customGenerator?: string; // Function reference for custom generation
      metadata?: {
        description?: string;
        businessRule?: string;
        validationRules?: string[];
      };
    }>;
    junctionTables?: Array<{
      tableName: string;
      leftTable: string;
      rightTable: string;
      leftColumn: string;
      rightColumn: string;
      additionalColumns?: Array<{
        name: string;
        type: string;
        defaultValue?: any;
      }>;
    }>;
    inheritanceRules?: Array<{
      parentTable: string;
      childTable: string;
      inheritedFields: string[];
      overrideStrategy: 'extend' | 'replace' | 'merge';
    }>;
  };

  // Advanced Data Generation Patterns
  dataGenerationPatterns?: {
    enabled: boolean;
    domainSpecific: {
      [domain: string]: {
        enabled: boolean;
        patterns: Record<string, any>;
        vocabularies: string[];
        templates: Record<string, string>;
      };
    };
    consistencyRules: Array<{
      tables: string[];
      rule: string; // Description of consistency requirement
      validator?: string; // Function to validate consistency
      fixer?: string; // Function to fix inconsistencies
    }>;
    referencialIntegrity: {
      enforceStrict: boolean;
      allowOrphans: boolean;
      cleanupStrategy: 'cascade' | 'nullify' | 'preserve';
    };
  };

  // Enhanced MFA Configuration (FR-1.2: Add MFA Factor Support)
  enhancedMFA?: {
    enabled: boolean;
    policy: {
      enforced: boolean;
      enforcedForRoles: string[];
      gracePeriodDays: number;
      maxFactorsPerUser: number;
      allowedFactorTypes: ('totp' | 'phone')[];
      requireBackupCodes: boolean;
    };
    totpSettings: {
      issuer: string;
      algorithm: 'SHA1' | 'SHA256' | 'SHA512';
      digits: 6 | 8;
      period: number; // seconds
      window: number; // tolerance window
    };
    phoneSettings: {
      allowedCountries?: string[];
      verificationMethod: 'sms' | 'voice' | 'both';
      rateLimitPerHour: number;
    };
    platformSpecificConfig?: {
      architecture: 'individual' | 'team' | 'hybrid';
      domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
      securityRequirements: {
        minimumSecurityLevel: 'basic' | 'enhanced' | 'maximum';
        complianceStandards?: ('SOC2' | 'HIPAA' | 'PCI_DSS' | 'GDPR')[];
      };
      usagePatterns: {
        expectedFactorTypes: ('totp' | 'phone')[];
        userSecurityAwareness: 'low' | 'medium' | 'high';
        deviceTrustLevel: 'low' | 'medium' | 'high';
      };
    };
    seedingConfiguration: {
      distributionBySecurityLevel: {
        basic: number;
        enhanced: number;
        maximum: number;
      };
      factorTypeDistribution: {
        totpOnly: number;
        phoneOnly: number;
        both: number;
      };
      verificationRate: number;
      testingScenarios: {
        includeInvalidCodes: boolean;
        includeExpiredCodes: boolean;
        includeRateLimitScenarios: boolean;
        includeRecoveryScenarios: boolean;
      };
    };
    customGenerators?: Array<{
      name: string;
      type: 'factor' | 'challenge' | 'recovery';
      generatorFunction: string;
      config?: Record<string, any>;
    }>;
  };
}