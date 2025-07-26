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
  
  // Manual Override Configuration (FR-2.5: Support manual platform/domain overrides)
  detection?: {
    // Platform architecture override
    platformArchitecture?: {
      override?: 'individual' | 'team' | 'hybrid';
      confidence?: number; // Override confidence level (0-1)
      reason?: string; // Reason for manual override
      fallbackToAutoDetection?: boolean; // Whether to fall back to auto-detection if override fails
    };
    
    // Content domain override
    contentDomain?: {
      override?: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
      confidence?: number; // Override confidence level (0-1)  
      reason?: string; // Reason for manual override
      fallbackToAutoDetection?: boolean; // Whether to fall back to auto-detection if override fails
      
      // Domain-specific overrides
      domainSpecific?: {
        // Outdoor domain overrides
        outdoor?: {
          gearCategories?: string[];
          brands?: string[];
          priceRange?: {
            min: number;
            max: number;
          };
          imageStyle?: 'realistic' | 'stock' | 'adventure';
        };
        
        // SaaS domain overrides
        saas?: {
          productivityFocus?: boolean;
          workspaceType?: 'team-collaboration' | 'individual-productivity' | 'hybrid';
          subscriptionModel?: 'freemium' | 'tiered' | 'usage-based';
        };
        
        // E-commerce domain overrides
        ecommerce?: {
          storeType?: 'marketplace' | 'single-vendor' | 'dropshipping';
          productCategories?: string[];
          paymentMethods?: string[];
          inventoryTracking?: boolean;
        };
        
        // Social domain overrides
        social?: {
          platformType?: 'content-sharing' | 'networking' | 'messaging';
          contentTypes?: string[];
          interactionFeatures?: string[];
        };
      };
    };
    
    // Validation settings for overrides
    validation?: {
      enabled: boolean; // Whether to validate overrides against detected patterns
      strictMode: boolean; // Whether to reject conflicting overrides or just warn
      warningLevel: 'none' | 'basic' | 'detailed'; // Level of warning detail for mismatches
      requireConfidenceThreshold: number; // Minimum confidence required for auto-detection to challenge overrides
    };
    
    // Override reporting and debugging
    reporting?: {
      enabled: boolean; // Whether to generate override validation reports
      includeDetectionComparison: boolean; // Whether to compare overrides with auto-detection results
      saveReportToFile?: string; // Optional file path to save detailed reports
    };
  };
  
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

  // Webhook Configuration (FR-1.3: Development Webhook Setup)
  webhooks?: {
    enabled: boolean;
    baseUrl: string; // e.g., 'http://localhost:3000' or ngrok URL
    ngrokSupport: {
      enabled: boolean;
      subdomain?: string;
      authToken?: string;
      region?: 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';
    };
    endpoints: {
      // Authentication webhook endpoints
      userCreated?: string;
      userUpdated?: string;
      userDeleted?: string;
      userConfirmed?: string;
      userSignIn?: string;
      userSignOut?: string;
      passwordReset?: string;
      emailConfirm?: string;
      mfaEnrolled?: string;
      mfaVerified?: string;
      
      // Database webhook endpoints
      accountCreated?: string;
      accountUpdated?: string;
      profileCreated?: string;
      profileUpdated?: string;
      subscriptionCreated?: string;
      subscriptionUpdated?: string;
      
      // Custom endpoints for domain-specific events
      custom?: Record<string, string>;
    };
    authentication: {
      type: 'none' | 'bearer' | 'basic' | 'signature';
      credentials?: {
        token?: string;
        username?: string;
        password?: string;
        secret?: string; // For signature verification
      };
      headers?: Record<string, string>;
    };
    testing: {
      enablePayloadLogging: boolean;
      enableRequestLogging: boolean;
      enableResponseLogging: boolean;
      logLevel: 'debug' | 'info' | 'warn' | 'error';
      mockEndpoints: boolean;
      validatePayloads: boolean;
    };
    retryPolicy: {
      enabled: boolean;
      maxAttempts: number;
      backoffStrategy: 'linear' | 'exponential' | 'fixed';
      initialDelay: number; // milliseconds
      maxDelay: number; // milliseconds
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

  // Advanced Webhook Configuration (FR-1.3: Development Webhook Setup)
  advancedWebhooks?: {
    enabled: boolean;
    developmentMode: boolean;
    endpoints: Array<{
      id: string;
      name: string;
      url: string;
      events: ('INSERT' | 'UPDATE' | 'DELETE' | 'user.created' | 'user.updated' | 'user.deleted' | 'user.confirmed' | 'session.created' | 'mfa.enrolled')[];
      enabled: boolean;
      authentication?: {
        type: 'none' | 'bearer' | 'basic' | 'signature';
        credentials?: Record<string, string>;
        headers?: Record<string, string>;
      };
      retryPolicy?: {
        enabled: boolean;
        maxAttempts: number;
        backoffStrategy: 'linear' | 'exponential' | 'fixed';
        initialDelay: number;
        maxDelay: number;
      };
      filters?: Array<{
        field: string;
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
        value: any;
        description?: string;
      }>;
      metadata?: Record<string, any>;
    }>;
    platformSpecific: {
      architecture: 'individual' | 'team' | 'hybrid';
      domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
      coreEvents: {
        userRegistration: {
          enabled: boolean;
          triggers: ('account_creation' | 'profile_setup' | 'welcome_email' | 'onboarding_start')[];
          endpoint?: string;
        };
        accountManagement: {
          enabled: boolean;
          triggers: ('team_created' | 'member_added' | 'member_removed' | 'permissions_changed')[];
          endpoint?: string;
        };
        subscriptionManagement: {
          enabled: boolean;
          triggers: ('subscription_created' | 'subscription_updated' | 'payment_succeeded' | 'payment_failed')[];
          endpoint?: string;
        };
        securityEvents: {
          enabled: boolean;
          triggers: ('mfa_enabled' | 'password_changed' | 'suspicious_login' | 'account_locked')[];
          endpoint?: string;
        };
      };
      domainSpecific: {
        outdoor?: {
          enabled: boolean;
          events: ('setup_created' | 'gear_added' | 'review_posted' | 'trip_planned')[];
        };
        saas?: {
          enabled: boolean;
          events: ('workspace_created' | 'project_created' | 'task_completed' | 'integration_connected')[];
        };
        ecommerce?: {
          enabled: boolean;
          events: ('product_created' | 'order_placed' | 'payment_processed' | 'inventory_updated')[];
        };
        social?: {
          enabled: boolean;
          events: ('post_created' | 'comment_added' | 'like_received' | 'follow_added')[];
        };
      };
    };
    ngrokIntegration: {
      enabled: boolean;
      autoStart: boolean;
      subdomain?: string;
      authToken?: string;
      region: 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';
      configFile?: string;
    };
    testing: {
      scenarios: Array<{
        id: string;
        name: string;
        description: string;
        event: string;
        mockPayload: Record<string, any>;
        expectedResponse: {
          statusCode: number;
          body?: any;
          headers?: Record<string, string>;
        };
        validationRules: Array<{
          field: string;
          rule: string;
          description: string;
        }>;
      }>;
      enablePayloadSanitization: boolean;
      enableSignatureValidation: boolean;
      enableRateLimitTesting: boolean;
      generateTestReports: boolean;
    };
    monitoring: {
      enabled: boolean;
      analytics: {
        trackDeliverySuccess: boolean;
        trackResponseTimes: boolean;
        trackErrorPatterns: boolean;
        generateHealthReports: boolean;
      };
      alerting: {
        enabled: boolean;
        failureThreshold: number; // percentage
        responseTimeThreshold: number; // milliseconds
        errorRateWindow: number; // minutes
      };
    };
  };
}