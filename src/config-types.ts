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
  
  // Schema configuration
  schema: {
    framework: 'simple' | 'makerkit' | 'custom';
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
}