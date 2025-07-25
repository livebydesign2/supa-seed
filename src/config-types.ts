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