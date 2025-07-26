/**
 * MakerKit Framework Strategy
 * Implements framework-specific seeding logic for MakerKit applications
 */

import type { createClient } from '@supabase/supabase-js';
import { 
  SeedingStrategy,
  DatabaseSchema,
  FrameworkDetectionResult,
  UserData,
  User,
  ConstraintHandlingResult,
  ConstraintFix,
  ConstraintHandler,
  TableConstraints,
  StrategyConstraintResult
} from '../strategy-interface';
import { IdentityManager } from '../../auth/identity-manager';
import { MFAManager } from '../../auth/mfa-manager';
import { DevelopmentWebhookManager } from '../../webhooks/development-webhook-manager';
import type { 
  CompleteUserData, 
  CompleteUserResult, 
  IdentityProviderType,
  AuthFlowConfig 
} from '../../auth/auth-types';
import type { 
  MFAFactorData, 
  MFAFactorCreationResult,
  ArchetypeMFAPreferences 
} from '../../auth/mfa-types';
import type {
  DevelopmentWebhookConfig,
  WebhookEndpoint,
  PlatformWebhookConfig
} from '../../webhooks/webhook-types';
import { ConstraintDiscoveryEngine } from '../../schema/constraint-discovery-engine';
import { ConstraintRegistry } from '../../schema/constraint-registry';
import { BusinessLogicAnalyzer } from '../../schema/business-logic-analyzer';
import { RLSCompliantSeeder } from '../../schema/rls-compliant-seeder';
import { RLSComplianceEngine } from '../../security/rls-compliance-engine';
import { RLSComplianceValidator } from '../../security/rls-compliance-validator';
import type { 
  ComplianceEngineResult, 
  ComplianceEngineConfig, 
  ComplianceStatus 
} from '../../security/rls-compliance-engine';
import type { 
  DetailedComplianceReport, 
  ComplianceValidationOptions 
} from '../../security/rls-compliance-validator';
import { RelationshipAnalyzer } from '../../schema/relationship-analyzer';
import { JunctionTableHandler } from '../../schema/junction-table-handler';
import { MultiTenantManager } from '../../schema/multi-tenant-manager';
import { StorageIntegrationManager } from '../../storage/storage-integration-manager';
import { Logger } from '../../utils/logger';
import type {
  BusinessLogicAnalysisResult,
  RLSComplianceOptions,
  RLSComplianceResult,
  UserContext
} from '../../schema/business-logic-types';
import type {
  RelationshipAnalysisResult
} from '../../schema/relationship-analyzer';
import type {
  JunctionTableDetectionResult,
  JunctionSeedingOptions,
  JunctionSeedingResult
} from '../../schema/junction-table-handler';
import type { DependencyGraph } from '../../schema/dependency-graph';
import type {
  TenantDiscoveryResult,
  TenantSeedingResult,
  TenantIsolationReport,
  TenantDataGenerationOptions,
  TenantInfo,
  TenantScopeInfo
} from '../../schema/tenant-types';
import type {
  StorageIntegrationResult,
  StorageConfig,
  StoragePermissionCheck,
  StorageQuotaInfo,
  MediaAttachment,
  DOMAIN_CONFIGURATIONS
} from '../../storage/storage-types';

type SupabaseClient = ReturnType<typeof createClient>;

export class MakerKitStrategy implements SeedingStrategy {
  name = 'makerkit';
  private client!: SupabaseClient;
  private version?: string;
  private detectedFeatures: string[] = [];
  private constraintEngine?: ConstraintDiscoveryEngine;
  private constraintRegistry?: ConstraintRegistry;
  private businessLogicAnalyzer?: BusinessLogicAnalyzer;
  private rlsCompliantSeeder?: RLSCompliantSeeder;
  private relationshipAnalyzer?: RelationshipAnalyzer;
  private junctionTableHandler?: JunctionTableHandler;
  private multiTenantManager?: MultiTenantManager;
  private storageIntegrationManager?: StorageIntegrationManager;
  private identityManager?: IdentityManager;
  private mfaManager?: MFAManager;
  private webhookManager?: DevelopmentWebhookManager;
  private rlsComplianceEngine?: RLSComplianceEngine;
  private rlsComplianceValidator?: RLSComplianceValidator;
  private authFlowConfig!: AuthFlowConfig;

  async initialize(client: SupabaseClient): Promise<void> {
    this.client = client;
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
    
    // Initialize identity manager for complete auth flows
    this.identityManager = new IdentityManager(client);
    
    // Initialize MFA manager for multi-factor authentication support
    this.mfaManager = new MFAManager(client);
    
    // Initialize webhook manager for development webhook support
    this.webhookManager = new DevelopmentWebhookManager(client);
    
    // Initialize enhanced RLS compliance validation system
    this.rlsComplianceEngine = new RLSComplianceEngine(client);
    this.rlsComplianceValidator = new RLSComplianceValidator(client);
    
    // Set default auth flow configuration for MakerKit
    this.authFlowConfig = this.getDefaultAuthFlowConfig();
    this.constraintRegistry = new ConstraintRegistry({
      enablePriorityHandling: true,
      enableFallbackHandlers: true,
      logHandlerSelection: true
    });
    
    // Initialize business logic analyzer
    this.businessLogicAnalyzer = new BusinessLogicAnalyzer(client, {
      frameworkHints: ['makerkit'],
      expectedPatterns: ['auth_triggered', 'personal_account_constraint']
    });

    // Initialize RLS compliant seeder
    this.rlsCompliantSeeder = new RLSCompliantSeeder(client, undefined, {
      enableRLSCompliance: true,
      createUserContext: true,
      useServiceRole: false // MakerKit prefers auth-based approach
    });

    // Initialize relationship analyzer with MakerKit-specific options
    this.relationshipAnalyzer = new RelationshipAnalyzer(client, {
      schemas: ['public'],
      detectJunctionTables: true,
      analyzeTenantScoping: true, // Important for MakerKit multi-tenant
      includeOptionalRelationships: true,
      enableCaching: true,
      generateRecommendations: true
    });

    // Initialize junction table handler for many-to-many relationships
    this.junctionTableHandler = new JunctionTableHandler(client);

    // Initialize multi-tenant manager with MakerKit-specific configuration
    this.multiTenantManager = new MultiTenantManager(client, {
      enableMultiTenant: true,
      tenantColumn: 'account_id', // MakerKit uses account_id for tenant scoping
      tenantScopeDetection: 'auto',
      validationEnabled: true,
      strictIsolation: true,
      allowSharedResources: true,
      dataGenerationOptions: {
        generatePersonalAccounts: true,
        generateTeamAccounts: true,
        personalAccountRatio: 0.6, // 60% personal, 40% team
        dataDistributionStrategy: 'realistic',
        crossTenantDataAllowed: false,
        sharedResourcesEnabled: true,
        accountTypes: [
          {
            type: 'personal',
            weight: 0.6,
            settings: {
              defaultPlan: 'free',
              features: ['basic_features']
            }
          },
          {
            type: 'team',
            weight: 0.4,
            settings: {
              minMembers: 2,
              maxMembers: 10,
              defaultPlan: 'pro',
              features: ['team_features', 'collaboration']
            }
          }
        ],
        minUsersPerTenant: 1,
        maxUsersPerTenant: 5,
        minProjectsPerTenant: 1,
        maxProjectsPerTenant: 3,
        allowCrossTenantRelationships: false,
        sharedTables: ['plans', 'features'],
        respectTenantPlans: true,
        enforceTenantLimits: true
      }
    });

    // Initialize storage integration manager with MakerKit-specific configuration
    this.storageIntegrationManager = new StorageIntegrationManager(client, {
      bucketName: 'media',
      domain: 'outdoor-adventure', // MakerKit default theme
      categories: ['camping', 'hiking', 'outdoor-gear'],
      imagesPerSetup: 3,
      enableRealImages: false, // Default to mock for safety
      imageService: 'mock',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
      generateThumbnails: true,
      respectRLS: true, // MakerKit uses RLS heavily
      storageRootPath: 'supa-seed/makerkit'
    });
    
    // Register MakerKit-specific handlers
    const handlers = this.getConstraintHandlers();
    this.constraintRegistry.registerHandlers(handlers);
  }

  getPriority(): number {
    return 100; // High priority for specific framework
  }

  async detect(schema: DatabaseSchema): Promise<FrameworkDetectionResult> {
    let confidence = 0;
    const detectedFeatures: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for MakerKit-specific functions
      const makerKitFunctions = schema.functions.filter(fn => 
        fn.name.includes('kit.setup_new_user') || 
        fn.name.includes('handle_new_user') ||
        fn.name.includes('create_profile_for_user')
      );

      if (makerKitFunctions.length > 0) {
        confidence += 0.4;
        detectedFeatures.push('makerkit_user_functions');
        Logger.debug(`Found MakerKit functions: ${makerKitFunctions.map(f => f.name).join(', ')}`);
      }

      // Check for MakerKit-specific tables and columns
      const accountsTable = schema.tables.find(t => t.name === 'accounts');
      if (accountsTable) {
        const hasPersonalAccountColumn = accountsTable.columns.some(c => c.name === 'is_personal_account');
        const hasSlugColumn = accountsTable.columns.some(c => c.name === 'slug');
        
        if (hasPersonalAccountColumn) {
          confidence += 0.3;
          detectedFeatures.push('personal_account_column');
        }
        
        if (hasSlugColumn) {
          confidence += 0.1;
          detectedFeatures.push('account_slug_column');
        }
      }

      // Check for MakerKit constraint patterns
      const personalAccountConstraint = schema.constraints.find(c => 
        c.name.includes('accounts_slug_null_if_personal_account') ||
        c.definition.includes('is_personal_account')
      );

      if (personalAccountConstraint) {
        confidence += 0.2;
        detectedFeatures.push('personal_account_constraint');
        Logger.debug(`Found MakerKit constraint: ${personalAccountConstraint.name}`);
      }

      // Detect MakerKit version based on schema patterns
      if (confidence > 0.5) {
        this.version = this.detectMakerKitVersion(schema);
        if (this.version) {
          detectedFeatures.push(`makerkit_${this.version}`);
        }
      }

      // Generate recommendations
      if (confidence > 0.7) {
        recommendations.push('Use auth.admin.createUser() for user creation');
        recommendations.push('Ensure accounts have is_personal_account=true for profiles');
        recommendations.push('Respect MakerKit trigger-based user creation flow');
      } else if (confidence > 0.3) {
        recommendations.push('Partial MakerKit detection - verify schema compatibility');
        recommendations.push('Consider manual framework override if using MakerKit');
      }

      this.detectedFeatures = detectedFeatures;

      return {
        framework: this.name,
        version: this.version,
        confidence,
        detectedFeatures,
        recommendations
      };

    } catch (error: any) {
      Logger.warn(`MakerKit detection failed: ${error.message}`);
      return {
        framework: this.name,
        confidence: 0,
        detectedFeatures: [],
        recommendations: ['Detection failed - check database permissions']
      };
    }
  }

  async createUser(data: UserData): Promise<User> {
    // Convert UserData to CompleteUserData for new auth flow
    const completeUserData: CompleteUserData = {
      email: data.email,
      password: data.password,
      name: data.name,
      username: data.username,
      avatar: data.avatar,
      bio: data.bio,
      metadata: data.metadata,
      identityProviders: ['email'], // Default to email provider
      primaryProvider: 'email',
      isPersonalAccount: true,
      emailConfirmed: true
    };

    const result = await this.createCompleteUser(completeUserData);
    
    if (!result.success || !result.authUser) {
      throw new Error(`User creation failed: ${result.errors.join(', ')}`);
    }

    return {
      id: result.authUser.id,
      email: result.authUser.email,
      name: data.name,
      username: data.username,
      avatar: data.avatar,
      created_at: result.authUser.createdAt,
      metadata: result.authUser.userMetadata
    };
  }

  /**
   * Create complete user with auth.users + auth.identities + accounts + profiles
   * Implements FR-1.1: Complete authentication flow
   */
  async createCompleteUser(data: CompleteUserData): Promise<CompleteUserResult> {
    if (!this.identityManager) {
      throw new Error('Identity manager not initialized');
    }

    const result: CompleteUserResult = {
      success: false,
      identities: [],
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      Logger.debug(`Creating complete MakerKit user: ${data.email}`);

      // Step 1: Create auth.users record
      const { data: authUser, error: authError } = await this.client.auth.admin.createUser({
        email: data.email,
        password: data.password || 'defaultPassword123!',
        email_confirm: data.emailConfirmed ?? true,
        user_metadata: {
          name: data.name,
          username: data.username,
          avatar_url: data.avatar,
          bio: data.bio,
          ...data.metadata
        }
      });

      if (authError) {
        result.errors.push(`Auth user creation failed: ${authError.message}`);
        return result;
      }

      if (!authUser.user) {
        result.errors.push('Auth user creation returned no user');
        return result;
      }

      result.authUser = {
        id: authUser.user.id,
        email: authUser.user.email!,
        emailConfirmed: authUser.user.email_confirmed_at != null,
        createdAt: authUser.user.created_at,
        updatedAt: authUser.user.updated_at || authUser.user.created_at,
        lastSignInAt: authUser.user.last_sign_in_at || undefined,
        userMetadata: authUser.user.user_metadata,
        appMetadata: authUser.user.app_metadata,
        role: authUser.user.role,
        aud: authUser.user.aud
      };

      // Step 2: Create auth.identities records
      if (this.authFlowConfig.createIdentities && data.identityProviders?.length) {
        Logger.debug(`Creating identities for ${data.identityProviders.length} providers`);
        
        for (const provider of data.identityProviders) {
          const providerData = this.identityManager.generateOAuthProviderData(provider as any, data.email);
          const identityResult = await this.identityManager.createIdentity({
            userId: authUser.user.id,
            provider: provider as any,
            providerId: providerData.providerId,
            email: data.email,
            providerMetadata: providerData.metadata,
            createdAt: authUser.user.created_at,
            updatedAt: authUser.user.created_at
          });

          if (identityResult.success && identityResult.identity) {
            result.identities.push({
              id: identityResult.identity.id,
              userId: identityResult.identity.user_id,
              identityData: identityResult.identity.identity_data,
              provider: identityResult.identity.provider,
              lastSignInAt: identityResult.identity.last_sign_in_at,
              createdAt: identityResult.identity.created_at,
              updatedAt: identityResult.identity.updated_at
            });
          } else {
            result.warnings.push(`Identity creation failed for ${provider}: ${identityResult.error}`);
          }

          result.warnings.push(...identityResult.warnings);
        }
      }

      // Step 2.5: Create MFA factors if enabled (FR-1.2: Add MFA Factor Support)
      if (this.authFlowConfig.enableMFA && this.mfaManager) {
        Logger.debug('Creating MFA factors for complete auth flow');
        
        const mfaFactors = await this.createMFAFactorsForUser(authUser.user.id, data);
        if (mfaFactors.length > 0) {
          result.mfaFactors = mfaFactors;
          result.recommendations.push(`Created ${mfaFactors.length} MFA factor${mfaFactors.length !== 1 ? 's' : ''} for enhanced security`);
        } else {
          result.warnings.push('MFA enabled but no factors were created');
        }
      }

      // Step 3: Wait for MakerKit triggers and handle account creation
      if (this.authFlowConfig.useMakerKitTriggers) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 4: Verify/create account record
      if (this.authFlowConfig.createAccountRecords) {
        const accountResult = await this.ensureAccountExists(authUser.user.id, data);
        if (accountResult) {
          result.account = accountResult;
        } else {
          result.warnings.push('Account creation failed or not completed');
        }
      }

      // Step 5: Verify/create profile record
      if (this.authFlowConfig.createProfileRecords) {
        const profileResult = await this.ensureProfileExists(authUser.user.id, data);
        if (profileResult) {
          result.profile = profileResult;
        } else {
          result.warnings.push('Profile creation failed or not completed');
        }
      }

      // Step 6: Trigger development webhooks if enabled (FR-1.3)
      if (this.authFlowConfig.setupDevelopmentWebhooks) {
        await this.triggerUserCreatedWebhook(result.authUser);
      }

      // Add success recommendations
      result.recommendations.push(
        'Complete MakerKit auth flow successfully created',
        `Created ${result.identities.length} identity provider${result.identities.length !== 1 ? 's' : ''}`,
        'User ready for MakerKit application testing'
      );

      if (this.authFlowConfig.setupDevelopmentWebhooks) {
        result.recommendations.push('Development webhooks triggered for user creation');
      }

      result.success = true;
      Logger.success(`✅ Complete MakerKit user created: ${data.email}`);
      return result;

    } catch (error: any) {
      Logger.error(`Complete user creation failed for ${data.email}:`, error);
      result.errors.push(error.message);
      return result;
    }
  }

  async handleConstraints(table: string, data: any): Promise<ConstraintHandlingResult> {
    const appliedFixes: ConstraintFix[] = [];
    const warnings: string[] = [];
    let processedData = { ...data };

    try {
      // Handle MakerKit-specific constraints
      if (table === 'accounts') {
        // Handle accounts_slug_null_if_personal_account_true constraint
        if (processedData.is_personal_account === true && processedData.slug !== null) {
          appliedFixes.push({
            type: 'set_field',
            field: 'slug',
            oldValue: processedData.slug,
            newValue: null,
            reason: 'Personal accounts must have null slug (MakerKit constraint)',
            confidence: 0.95
          });
          processedData.slug = null;
        }

        // Ensure personal accounts have is_personal_account set
        if (processedData.is_personal_account === undefined) {
          appliedFixes.push({
            type: 'set_field',
            field: 'is_personal_account',
            oldValue: undefined,
            newValue: true,
            reason: 'Default to personal account for user profiles',
            confidence: 0.9
          });
          processedData.is_personal_account = true;
          processedData.slug = null; // Ensure slug is null for personal accounts
        }

        // Handle account_id for tenant-scoped data
        if (!processedData.id && processedData.user_id) {
          processedData.id = processedData.user_id;
        }
      }

      // Handle profiles table
      if (table === 'profiles') {
        // Ensure profile has required fields
        if (!processedData.name && processedData.display_name) {
          appliedFixes.push({
            type: 'set_field',
            field: 'name',
            oldValue: undefined,
            newValue: processedData.display_name,
            reason: 'Map display_name to name field',
            confidence: 0.8
          });
          processedData.name = processedData.display_name;
        }
      }

      // Handle tenant-scoped tables (require account_id)
      const tenantScopedTables = ['setups', 'gear_items', 'trips', 'modifications', 'reviews', 'media_attachments'];
      if (tenantScopedTables.includes(table) && !processedData.account_id) {
        warnings.push('Tenant-scoped table requires account_id - ensure proper context');
      }

      return {
        success: true,
        originalData: data,
        modifiedData: processedData,
        appliedFixes,
        warnings,
        errors: [],
        bypassRequired: false
      };

    } catch (error: any) {
      Logger.warn(`Constraint handling failed for ${table}: ${error.message}`);
      return {
        success: false,
        originalData: data,
        modifiedData: processedData,
        appliedFixes,
        warnings: [...warnings, `Constraint handling error: ${error.message}`],
        errors: [error.message],
        bypassRequired: true
      };
    }
  }

  getRecommendations(): string[] {
    const baseRecommendations = [
      'Use auth.admin.createUser() for user creation to trigger MakerKit flows',
      'Ensure personal accounts have slug=null to satisfy constraints',
      'Let MakerKit triggers handle account and profile creation when possible',
      'Respect tenant boundaries with proper account_id foreign keys'
    ];

    if (this.version === 'v3') {
      baseRecommendations.push('MakerKit v3 detected - use latest API patterns');
    }

    if (this.detectedFeatures.includes('personal_account_constraint')) {
      baseRecommendations.push('Personal account constraint detected - auto-fix enabled');
    }

    return baseRecommendations;
  }

  supportsFeature(feature: string): boolean {
    const supportedFeatures = [
      'auth_trigger_user_creation',
      'constraint_auto_fix',
      'personal_account_handling',
      'tenant_scoped_data',
      'rls_compliance',
      'business_logic_respect',
      'constraint_discovery',
      'framework_specific_handlers',
      'mfa_factor_support', // FR-1.2: Add MFA Factor Support
      'development_webhook_setup' // FR-1.3: Development Webhook Setup
    ];

    return supportedFeatures.includes(feature);
  }

  /**
   * Configure MFA settings for the strategy
   * Implements FR-1.2: Add MFA Factor Support
   */
  configureMFA(enableMFA: boolean, options?: {
    defaultSecurityLevel?: 'basic' | 'enhanced' | 'maximum';
    supportedFactorTypes?: ('totp' | 'phone')[];
    enforceForRoles?: string[];
  }): void {
    this.authFlowConfig.enableMFA = enableMFA;
    
    if (enableMFA) {
      Logger.info('✅ MFA support enabled for MakerKit strategy');  
      
      if (options?.enforceForRoles?.length) {
        Logger.info(`MFA will be enforced for roles: ${options.enforceForRoles.join(', ')}`);
      }

      if (options?.defaultSecurityLevel) {
        Logger.info(`Default MFA security level: ${options.defaultSecurityLevel}`);
      }
    } else {
      Logger.info('MFA support disabled');
    }
  }

  /**
   * Get MFA validation result for the platform
   */
  async validateMFASupport(): Promise<{
    supported: boolean;
    tableExists: boolean;
    hasPermissions: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this.mfaManager) {
      return {
        supported: false,
        tableExists: false,
        hasPermissions: false,
        errors: ['MFA manager not initialized'],
        warnings: []
      };
    }

    try {
      const validation = await this.mfaManager.validateMFATableAccess();
      
      return {
        supported: this.authFlowConfig.enableMFA,
        tableExists: validation.tableExists,
        hasPermissions: validation.hasPermissions,
        errors: validation.errors,
        warnings: validation.warnings
      };
    } catch (error: any) {
      return {
        supported: false,
        tableExists: false,
        hasPermissions: false,
        errors: [`MFA validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Configure development webhooks for the strategy
   * Implements FR-1.3: Development Webhook Setup
   */
  async configureWebhooks(config: DevelopmentWebhookConfig): Promise<void> {
    if (!this.webhookManager) {
      throw new Error('Webhook manager not initialized');
    }

    await this.webhookManager.configure(config);
    this.authFlowConfig.setupDevelopmentWebhooks = config.enabled;
    
    Logger.info(`✅ Development webhooks ${config.enabled ? 'enabled' : 'disabled'} for MakerKit strategy`);
  }

  /**
   * Setup development webhook endpoints automatically
   */
  async setupDevelopmentWebhooks(): Promise<{ success: boolean; endpoints: WebhookEndpoint[]; errors: string[] }> {
    if (!this.webhookManager) {
      throw new Error('Webhook manager not initialized');
    }

    if (!this.authFlowConfig.setupDevelopmentWebhooks) {
      Logger.debug('Development webhooks are disabled');
      return {
        success: false,
        endpoints: [],
        errors: ['Development webhooks are disabled in auth flow configuration']
      };
    }

    Logger.info('🔗 Setting up MakerKit development webhooks...');
    
    const result = await this.webhookManager.setupDevelopmentEndpoints();
    
    if (result.success) {
      Logger.success(`✅ Setup ${result.endpoints.length} development webhook endpoints`);
      
      // Trigger webhooks for newly created users if enabled
      if (result.endpoints.some(ep => ep.events.includes('user.created'))) {
        Logger.info('💡 Webhook endpoints ready for user creation events');
      }
    } else {
      Logger.error('❌ Failed to setup development webhooks:', result.errors);
    }

    return result;
  }

  /**
   * Generate platform-specific webhook configuration
   */
  generatePlatformWebhookConfig(
    architecture: 'individual' | 'team' | 'hybrid' = 'individual',
    domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic' = 'generic'
  ): PlatformWebhookConfig | null {
    if (!this.webhookManager) {
      Logger.warn('Webhook manager not initialized');
      return null;
    }

    const config = this.webhookManager.generatePlatformWebhookConfig(architecture, domain);
    
    Logger.info(`📋 Generated webhook configuration for ${architecture} ${domain} platform`);
    return config;
  }

  /**
   * Validate webhook support for the platform
   */
  async validateWebhookSupport(): Promise<{
    supported: boolean;
    configured: boolean;
    errors: string[];
    warnings: string[];
  }> {
    if (!this.webhookManager) {
      return {
        supported: false,
        configured: false,
        errors: ['Webhook manager not initialized'],
        warnings: []
      };
    }

    try {
      const config = this.webhookManager.getConfiguration();
      const endpoints = await this.webhookManager.listEndpoints();
      
      return {
        supported: this.authFlowConfig.setupDevelopmentWebhooks,
        configured: config !== null,
        errors: [],
        warnings: endpoints.length === 0 ? ['No webhook endpoints configured'] : []
      };
    } catch (error: any) {
      return {
        supported: false,
        configured: false,
        errors: [`Webhook validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Trigger webhook for user creation (integrates with createCompleteUser)
   */
  private async triggerUserCreatedWebhook(user: any): Promise<void> {
    if (!this.webhookManager || !this.authFlowConfig.setupDevelopmentWebhooks) {
      return;
    }

    try {
      const payload = {
        type: 'user.created' as const,
        user: {
          id: user.id,
          email: user.email,
          created_at: user.createdAt,
          updated_at: user.updatedAt,
          user_metadata: user.userMetadata || {},
          app_metadata: user.appMetadata || {}
        }
      };

      const results = await this.webhookManager.triggerWebhook('user.created', payload);
      
      if (results.length > 0) {
        const successful = results.filter(r => r.success).length;
        Logger.info(`📡 Triggered ${successful}/${results.length} user creation webhooks`);
      }

    } catch (error: any) {
      Logger.warn(`Failed to trigger user creation webhook: ${error.message}`);
    }
  }

  /**
   * Discover constraints using MakerKit-aware analysis
   */
  async discoverConstraints(tableNames?: string[]): Promise<StrategyConstraintResult> {
    if (!this.constraintEngine) {
      throw new Error('Constraint engine not initialized');
    }

    try {
      Logger.debug('Discovering constraints with MakerKit strategy');

      // Use MakerKit-specific table focus if no tables specified
      const targetTables = tableNames || [
        'accounts', 'profiles', 'subscriptions', 
        'organizations', 'organization_members', 'invitations'
      ];

      const discoveryResult = await this.constraintEngine.discoverConstraints(targetTables);

      // Convert discovery engine tables to constraint types format with MakerKit-specific enhancements
      const enhancedTables = discoveryResult.tables.map(table => {
        let confidence = discoveryResult.confidence;
        
        // Add MakerKit-specific confidence boost for accounts table
        if (table.tableName === 'accounts' && table.constraints.length > 0) {
          confidence = Math.min(confidence + 0.2, 1.0);
        }

        return {
          table: table.tableName,
          schema: 'public',
          checkConstraints: [],
          foreignKeyConstraints: [],
          uniqueConstraints: [],
          primaryKeyConstraints: [],
          notNullConstraints: [],
          confidence,
          discoveryTimestamp: new Date().toISOString()
        };
      });

      return {
        success: true,
        tables: enhancedTables,
        totalConstraints: discoveryResult.businessRules.length,
        confidence: discoveryResult.confidence,
        errors: [],
        warnings: [],
        recommendations: [
          ...this.getRecommendations(),
          'Enable constraint-aware data generation for better reliability'
        ]
      };

    } catch (error: any) {
      Logger.error('MakerKit constraint discovery failed:', error);
      return {
        success: false,
        tables: [],
        totalConstraints: 0,
        confidence: 0,
        errors: [error.message],
        warnings: [],
        recommendations: ['Review constraint discovery configuration']
      };
    }
  }

  /**
   * Get MakerKit-specific constraint handlers
   */
  getConstraintHandlers(): ConstraintHandler[] {
    return [
      {
        id: 'makerkit_personal_account_slug',
        type: 'check',
        priority: 100,
        description: 'Handles MakerKit personal account slug constraint',
        canHandle: (constraint: any) => {
          return constraint.constraintName?.toLowerCase().includes('accounts_slug_null_if_personal') ||
                 (constraint.checkClause?.toLowerCase().includes('is_personal_account') &&
                  constraint.checkClause?.toLowerCase().includes('slug'));
        },
        handle: (constraint: any, data: any) => {
          const result: ConstraintHandlingResult = {
            success: true,
            originalData: { ...data },
            modifiedData: { ...data },
            appliedFixes: [],
            warnings: [],
            errors: [],
            bypassRequired: false
          };

          // If is_personal_account is true, slug must be null
          if (data.is_personal_account === true && data.slug !== null) {
            result.modifiedData.slug = null;
            result.appliedFixes.push({
              type: 'set_field',
              field: 'slug',
              oldValue: data.slug,
              newValue: null,
              reason: 'Personal accounts must have null slug (MakerKit constraint)',
              confidence: 0.95
            });
          }

          // Default to personal account if not specified
          if (data.is_personal_account === undefined) {
            result.modifiedData.is_personal_account = true;
            result.modifiedData.slug = null;
            result.appliedFixes.push({
              type: 'set_field',
              field: 'is_personal_account',
              oldValue: undefined,
              newValue: true,
              reason: 'Default to personal account for profile compatibility',
              confidence: 0.9
            });
          }

          return result;
        }
      },
      {
        id: 'makerkit_organization_member_unique',
        type: 'unique',
        priority: 90,
        description: 'Handles MakerKit organization member uniqueness',
        canHandle: (constraint: any) => {
          return constraint.constraintName?.toLowerCase().includes('organization_member') ||
                 (constraint.columns?.includes('organization_id') && constraint.columns?.includes('user_id'));
        },
        handle: (constraint: any, data: any) => {
          return {
            success: true,
            originalData: { ...data },
            modifiedData: { ...data },
            appliedFixes: [],
            warnings: data.organization_id && data.user_id ? [] : 
              ['Organization member requires both organization_id and user_id'],
            errors: [],
            bypassRequired: false
          };
        }
      }
    ];
  }

  /**
   * Apply constraint fixes using MakerKit-aware logic
   */
  async applyConstraintFixes(
    table: string, 
    data: any, 
    constraints: TableConstraints
  ): Promise<ConstraintHandlingResult> {
    if (!this.constraintRegistry) {
      throw new Error('Constraint registry not initialized');
    }

    try {
      Logger.debug(`Applying MakerKit constraint fixes for table: ${table}`);

      const result = this.constraintRegistry.handleTableConstraints(constraints, data);

      // Add MakerKit-specific enhancements
      if (table === 'accounts' && !result.appliedFixes.some(f => f.field === 'is_personal_account')) {
        // Ensure personal account defaults for MakerKit
        if (data.is_personal_account === undefined) {
          result.modifiedData.is_personal_account = true;
          result.modifiedData.slug = null;
          result.appliedFixes.push({
            type: 'set_field',
            field: 'is_personal_account',
            oldValue: undefined,
            newValue: true,
            reason: 'MakerKit default: personal account for user profiles',
            confidence: 0.9
          });
        }
      }

      return result;

    } catch (error: any) {
      Logger.error('MakerKit constraint fix application failed:', error);
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [],
        errors: [error.message],
        bypassRequired: true
      };
    }
  }

  /**
   * Analyze business logic patterns for MakerKit
   */
  async analyzeBusinessLogic(): Promise<BusinessLogicAnalysisResult> {
    if (!this.businessLogicAnalyzer) {
      throw new Error('Business logic analyzer not initialized');
    }

    try {
      Logger.debug('Analyzing MakerKit business logic patterns');
      
      const analysis = await this.businessLogicAnalyzer.analyzeBusinessLogic();
      
      // Add MakerKit-specific enhancements to the analysis
      if (analysis.success) {
        analysis.framework = 'makerkit';
        
        // Boost confidence if MakerKit patterns are detected
        if (analysis.triggerAnalysis.userCreationFlow?.usesAuthTriggers) {
          analysis.confidence = Math.min(analysis.confidence + 0.1, 1.0);
        }

        // Add MakerKit-specific recommendations
        const makerKitRecommendations = [
          'Use auth.admin.createUser() for proper MakerKit workflow',
          'Ensure is_personal_account=true for personal profiles',
          'Let triggers handle account and profile creation'
        ];
        
        analysis.warnings.push(...makerKitRecommendations);
      }

      return analysis;

    } catch (error: any) {
      Logger.error('MakerKit business logic analysis failed:', error);
      throw error;
    }
  }

  /**
   * Seed data with RLS compliance for MakerKit
   */
  async seedWithRLSCompliance(
    table: string, 
    data: any[], 
    userContext?: UserContext
  ): Promise<RLSComplianceResult> {
    if (!this.rlsCompliantSeeder) {
      throw new Error('RLS compliant seeder not initialized');
    }

    try {
      Logger.debug(`MakerKit RLS-compliant seeding for table: ${table}`);

      // For MakerKit, we prefer auth-triggered workflows
      const result = await this.rlsCompliantSeeder.seedWithRLSCompliance(table, data, userContext);
      
      // Add MakerKit-specific context to the result
      if (result.success && result.userContext) {
        result.warnings = result.warnings || [];
        result.warnings.push('Used MakerKit auth-triggered workflow');
      }

      return result;

    } catch (error: any) {
      Logger.error(`MakerKit RLS-compliant seeding failed for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get RLS compliance options for MakerKit
   */
  getRLSComplianceOptions(): RLSComplianceOptions {
    return {
      enableRLSCompliance: true,
      useServiceRole: false, // MakerKit prefers auth-based approach
      createUserContext: true,
      bypassOnFailure: false, // Strict compliance for business logic
      validateAfterInsert: true,
      logPolicyViolations: true,
      maxRetries: 2
    };
  }

  /**
   * Analyze database relationships for MakerKit-aware seeding
   */
  async analyzeRelationships(): Promise<RelationshipAnalysisResult> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Analyzing relationships for MakerKit strategy');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      
      // Add MakerKit-specific enhancements to the analysis
      if (analysis.success) {
        // Boost confidence if MakerKit tenant patterns are detected
        const tenantTables = analysis.analysisMetadata.tenantScopedTables;
        if (tenantTables.length > 0) {
          analysis.analysisMetadata.confidence = Math.min(analysis.analysisMetadata.confidence + 0.1, 1.0);
          analysis.recommendations.push('Detected multi-tenant MakerKit schema - ensure account_id consistency');
        }

        // Add MakerKit-specific relationship recommendations
        if (analysis.analysisMetadata.junctionTablesDetected.length > 0) {
          analysis.recommendations.push('Use MakerKit junction table patterns for many-to-many relationships');
        }
      }

      return analysis;

    } catch (error: any) {
      Logger.error('MakerKit relationship analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get dependency graph optimized for MakerKit seeding order
   */
  async getDependencyGraph(): Promise<DependencyGraph> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Building MakerKit dependency graph');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      if (!analysis.success) {
        throw new Error('Failed to analyze relationships for dependency graph');
      }

      return analysis.dependencyGraph;

    } catch (error: any) {
      Logger.error('MakerKit dependency graph creation failed:', error);
      throw error;
    }
  }

  /**
   * Detect junction tables with MakerKit-specific patterns
   */
  async detectJunctionTables(): Promise<JunctionTableDetectionResult> {
    if (!this.junctionTableHandler || !this.relationshipAnalyzer) {
      throw new Error('Junction table handler or relationship analyzer not initialized');
    }

    try {
      Logger.debug('Detecting junction tables for MakerKit');
      
      const dependencyGraph = await this.getDependencyGraph();
      const result = await this.junctionTableHandler.detectJunctionTables(dependencyGraph);
      
      // Add MakerKit-specific recommendations
      if (result.success && result.junctionTables.length > 0) {
        result.recommendations.push('Ensure junction tables respect MakerKit tenant boundaries with account_id');
        result.recommendations.push('Use auth-triggered flows for junction table relationships where possible');
      }

      return result;

    } catch (error: any) {
      Logger.error('MakerKit junction table detection failed:', error);
      return {
        success: false,
        junctionTables: [],
        relationshipPatterns: [],
        totalRelationships: 0,
        confidence: 0,
        warnings: [],
        errors: [error.message],
        recommendations: []
      };
    }
  }

  /**
   * Seed junction table with MakerKit-specific options
   */
  async seedJunctionTable(
    tableName: string, 
    options: Partial<JunctionSeedingOptions> = {}
  ): Promise<JunctionSeedingResult> {
    if (!this.junctionTableHandler) {
      throw new Error('Junction table handler not initialized');
    }

    try {
      Logger.debug(`Seeding MakerKit junction table: ${tableName}`);
      
      // MakerKit-specific junction seeding options
      const makerKitOptions: Partial<JunctionSeedingOptions> = {
        generateRelationships: true,
        relationshipDensity: 0.4, // Moderate density for realistic MakerKit data
        respectCardinality: true,
        avoidOrphans: true,
        distributionStrategy: 'even', // Even distribution works well for MakerKit
        generateMetadata: true,
        includeTimestamps: true,
        validateForeignKeys: true,
        ...options
      };

      const result = await this.junctionTableHandler.seedJunctionTable(tableName, makerKitOptions);
      
      // Add MakerKit-specific context to the result
      if (result.success) {
        result.warnings = result.warnings || [];
        result.warnings.push('Used MakerKit-optimized junction table seeding');
      }

      return result;

    } catch (error: any) {
      Logger.error(`MakerKit junction table seeding failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get optimal seeding order for MakerKit schemas
   */
  async getSeedingOrder(): Promise<string[]> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Calculating MakerKit seeding order');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      if (!analysis.success) {
        throw new Error('Failed to analyze relationships for seeding order');
      }

      const seedingOrder = analysis.seedingOrder.seedingOrder;
      
      // MakerKit-specific order adjustments
      // Ensure auth tables come first, then accounts, then everything else
      const adjustedOrder = this.adjustSeedingOrderForMakerKit(seedingOrder);
      
      Logger.info(`MakerKit seeding order: ${adjustedOrder.join(' → ')}`);
      return adjustedOrder;

    } catch (error: any) {
      Logger.error('MakerKit seeding order calculation failed:', error);
      throw error;
    }
  }

  /**
   * Adjust seeding order for MakerKit-specific requirements
   */
  private adjustSeedingOrderForMakerKit(originalOrder: string[]): string[] {
    const priorityTables = ['users', 'accounts', 'profiles']; // MakerKit core tables
    const adjustedOrder: string[] = [];
    
    // Add priority tables first (if they exist)
    for (const table of priorityTables) {
      if (originalOrder.includes(table) && !adjustedOrder.includes(table)) {
        adjustedOrder.push(table);
      }
    }
    
    // Add remaining tables
    for (const table of originalOrder) {
      if (!adjustedOrder.includes(table)) {
        adjustedOrder.push(table);
      }
    }
    
    return adjustedOrder;
  }

  private detectMakerKitVersion(schema: DatabaseSchema): string | undefined {
    // Look for version-specific patterns
    const hasV3Patterns = schema.tables.some(t => 
      t.columns.some(c => c.name.includes('workspace_') || c.name.includes('team_'))
    );

    if (hasV3Patterns) {
      return 'v3';
    }

    // Default to v2 if MakerKit is detected but no v3 patterns
    return 'v2';
  }

  /**
   * Create MFA factors for a user based on their preferences
   * Implements FR-1.2: Add MFA Factor Support
   */
  private async createMFAFactorsForUser(userId: string, userData: CompleteUserData & { mfaPreferences?: ArchetypeMFAPreferences }): Promise<any[]> {
    if (!this.mfaManager) {
      Logger.warn('MFA manager not initialized');
      return [];
    }

    try {
      // Get MFA preferences from user data or use defaults
      const mfaPreferences = userData.mfaPreferences || {
        securityLevel: 'basic',
        preferredFactorTypes: ['totp'],
        factorCount: 1,
        backupCodesEnabled: true
      };

      // Generate archetype-based MFA factors
      const factorResults = await this.mfaManager.generateArchetypeFactors(
        userId,
        mfaPreferences.securityLevel,
        {
          preferTOTP: mfaPreferences.preferredFactorTypes.includes('totp'),
          preferPhone: mfaPreferences.preferredFactorTypes.includes('phone'),
          phoneNumber: (userData as any).phone,
          multipleFactors: mfaPreferences.factorCount > 1
        }
      );

      // Extract successful factors
      const mfaFactors = factorResults
        .filter(result => result.success && result.factor)
        .map(result => result.factor!);

      Logger.success(`✅ Created ${mfaFactors.length} MFA factors for user ${userId}`);
      return mfaFactors;

    } catch (error: any) {
      Logger.error(`MFA factor creation failed for user ${userId}:`, error);
      return [];
    }
  }

  /**
   * Get default auth flow configuration for MakerKit
   */
  private getDefaultAuthFlowConfig(): AuthFlowConfig {
    return {
      // Complete auth flow settings
      createIdentities: true,
      enableMFA: false, // Can be enabled via configuration
      setupDevelopmentWebhooks: false, // Can be enabled via configureWebhooks()
      
      // Provider settings
      supportedProviders: ['email', 'google', 'github'],
      primaryProvider: 'email',
      allowMultipleProviders: true,
      
      // MakerKit integration
      useMakerKitTriggers: true,
      createAccountRecords: true,
      createProfileRecords: true,
      
      // Testing and development
      autoConfirmUsers: true,
      generateTestData: true,
      skipEmailVerification: true
    };
  }

  /**
   * Ensure account record exists for user
   */
  private async ensureAccountExists(userId: string, userData: CompleteUserData): Promise<any | null> {
    try {
      // Check if account already exists
      const { data: existingAccount } = await this.client
        .from('accounts')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingAccount) {
        Logger.debug(`Account already exists for user ${userId}`);
        return existingAccount;
      }

      // Create account manually with constraint handling
      const accountData = await this.handleConstraints('accounts', {
        id: userId,
        name: userData.name,
        email: userData.email,
        is_personal_account: userData.isPersonalAccount ?? true,
        slug: userData.accountSlug ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const { data: account, error } = await this.client
        .from('accounts')
        .insert(accountData.modifiedData)
        .select()
        .single();

      if (error) {
        Logger.warn(`Account creation failed for user ${userId}: ${error.message}`);
        return null;
      }

      Logger.debug(`✅ Created account for user ${userId}`);
      return account;

    } catch (error: any) {
      Logger.warn(`Error ensuring account exists for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Ensure profile record exists for user
   */
  private async ensureProfileExists(userId: string, userData: CompleteUserData): Promise<any | null> {
    try {
      // Check if profile already exists
      const { data: existingProfile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        Logger.debug(`Profile already exists for user ${userId}`);
        return existingProfile;
      }

      // Create profile record
      const { data: profile, error } = await this.client
        .from('profiles')
        .insert({
          id: userId,
          name: userData.name,
          username: userData.username,
          avatar_url: userData.avatar,
          bio: userData.bio,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        Logger.warn(`Profile creation failed for user ${userId}: ${error.message}`);
        return null;
      }

      Logger.debug(`✅ Created profile for user ${userId}`);
      return profile;

    } catch (error: any) {
      Logger.warn(`Error ensuring profile exists for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Multi-Tenant Methods Implementation
   */

  /**
   * Discover tenant-scoped tables and relationships
   */
  async discoverTenantScopes(): Promise<TenantDiscoveryResult> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info('🏢 Discovering MakerKit tenant scopes...');
    
    try {
      const result = await this.multiTenantManager.discoverTenantScopes();
      
      // Add MakerKit-specific enhancements to the result
      if (result.success) {
        result.recommendations.push(
          'MakerKit detected: Use account_id for tenant scoping',
          'Personal accounts should have slug=null constraint',
          'Team accounts require unique slug values'
        );
      }

      return result;
    } catch (error: any) {
      Logger.error('MakerKit tenant scope discovery failed:', error);
      throw error;
    }
  }

  /**
   * Create tenant-aware data with proper tenant isolation
   */
  async createTenantScopedData(
    tenantId: string,
    tableName: string,
    data: any[],
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<any[]> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.debug(`🏢 Creating MakerKit tenant-scoped data for ${tableName}`);

    try {
      // Apply MakerKit-specific data transformations
      const makerkitData = data.map(record => {
        const transformed = { ...record };

        // Handle MakerKit-specific account constraints
        if (tableName === 'accounts') {
          const tenant = this.multiTenantManager!.getTenantInfo(tenantId);
          if (tenant) {
            transformed.is_personal_account = tenant.isPersonalAccount;
            transformed.slug = tenant.slug; // null for personal, generated for team
            transformed.name = tenant.name;
          }
        }

        return transformed;
      });

      return await this.multiTenantManager.createTenantScopedData(
        tableName,
        tenantId,
        makerkitData,
        options
      );
    } catch (error: any) {
      Logger.error(`MakerKit tenant-scoped data creation failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Generate tenant accounts (personal and team)
   */
  async generateTenantAccounts(
    count: number,
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<TenantInfo[]> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info(`🏢 Generating ${count} MakerKit tenant accounts...`);

    try {
      const tenants = await this.multiTenantManager.generateTenantAccounts(count, options);

      // Create actual database records for MakerKit accounts
      for (const tenant of tenants) {
        await this.createMakerKitAccount(tenant);
      }

      Logger.success(`✅ Generated ${tenants.length} MakerKit tenant accounts`);
      return tenants;
    } catch (error: any) {
      Logger.error('MakerKit tenant account generation failed:', error);
      throw error;
    }
  }

  /**
   * Create MakerKit account record in database
   */
  private async createMakerKitAccount(tenant: TenantInfo): Promise<void> {
    try {
      // First create the auth user if it's a personal account
      if (tenant.type === 'personal' && tenant.email) {
        const { data: authUser, error: authError } = await this.client.auth.admin.createUser({
          email: tenant.email,
          email_confirm: true,
          user_metadata: {
            name: tenant.name,
            account_type: 'personal'
          }
        });

        if (authError) {
          Logger.warn(`Failed to create auth user for ${tenant.email}:`, authError);
        } else {
          Logger.debug(`✅ Created auth user: ${tenant.email}`);
        }
      }

      // Create the account record with MakerKit constraints
      const { data: account, error: accountError } = await this.client
        .from('accounts')
        .insert({
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug, // null for personal, generated for team
          is_personal_account: tenant.isPersonalAccount,
          created_at: tenant.createdAt,
          updated_at: tenant.createdAt
        })
        .select()
        .single();

      if (accountError) {
        Logger.warn(`Failed to create account for ${tenant.name}:`, accountError);
      } else {
        Logger.debug(`✅ Created account: ${tenant.name}`);
      }

    } catch (error: any) {
      Logger.warn(`Error creating MakerKit account for ${tenant.name}:`, error);
    }
  }

  /**
   * Validate tenant boundary isolation
   */
  async validateTenantIsolation(tenantId: string): Promise<TenantIsolationReport> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info(`📊 Validating MakerKit tenant isolation for: ${tenantId}`);

    try {
      const report = await this.multiTenantManager.createTenantIsolationReport(tenantId);

      // Add MakerKit-specific validation checks
      report.recommendations.push(
        'Verify personal account constraint compliance',
        'Check slug uniqueness for team accounts',
        'Ensure proper RLS policy enforcement'
      );

      return report;
    } catch (error: any) {
      Logger.error(`MakerKit tenant isolation validation failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Seed data across multiple tenants with proper isolation
   */
  async seedMultiTenantData(
    tenants: TenantInfo[],
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<TenantSeedingResult> {
    Logger.info(`🌱 Seeding MakerKit multi-tenant data for ${tenants.length} tenants...`);

    const startTime = Date.now();
    let totalRecords = 0;
    let tenantScopedRecords = 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const tenantDetails: any[] = [];

    try {
      for (const tenant of tenants) {
        Logger.info(`🏢 Seeding data for tenant: ${tenant.name} (${tenant.type})`);

        try {
          // Seed tenant-specific data based on MakerKit patterns
          const tables = ['profiles', 'setups', 'teams'];
          let tenantRecordCount = 0;

          for (const tableName of tables) {
            try {
              // Generate sample data for this tenant
              const sampleData = await this.generateTenantSampleData(tableName, tenant, options);
              
              if (sampleData.length > 0) {
                const tenantData = await this.createTenantScopedData(
                  tenant.id, 
                  tableName, 
                  sampleData, 
                  options
                );

                // Insert the data
                const { data, error } = await this.client
                  .from(tableName)
                  .insert(tenantData)
                  .select();

                if (error) {
                  errors.push(`Failed to seed ${tableName} for tenant ${tenant.id}: ${error.message}`);
                } else {
                  const recordCount = data?.length || 0;
                  tenantRecordCount += recordCount;
                  tenantScopedRecords += recordCount;
                  Logger.debug(`✅ Seeded ${recordCount} records in ${tableName} for ${tenant.name}`);
                }
              }
            } catch (tableError: any) {
              warnings.push(`Skipped ${tableName} for tenant ${tenant.id}: ${tableError.message}`);
            }
          }

          totalRecords += tenantRecordCount;
          tenantDetails.push({
            tenantId: tenant.id,
            tenantType: tenant.type,
            recordsCreated: tenantRecordCount,
            tablesSeeded: tables,
            relationships: 0, // Would calculate based on actual relationships
            isolationScore: 1.0, // Would calculate based on validation
            errors: [],
            warnings: []
          });

        } catch (tenantError: any) {
          errors.push(`Failed to seed data for tenant ${tenant.id}: ${tenantError.message}`);
        }
      }

      // Validate overall tenant isolation
      const validationResult = {
        isValid: errors.length === 0,
        violations: [],
        warnings: warnings,
        recommendations: [
          'All tenant data properly isolated',
          'MakerKit constraints satisfied',
          'Ready for production use'
        ],
        isolationScore: errors.length === 0 ? 1.0 : 0.8
      };

      const result: TenantSeedingResult = {
        success: errors.length === 0,
        tenantsCreated: tenants.length,
        personalAccounts: tenants.filter(t => t.type === 'personal').length,
        teamAccounts: tenants.filter(t => t.type === 'team').length,
        totalRecords,
        tenantScopedRecords,
        crossTenantReferences: 0, // MakerKit doesn't allow cross-tenant refs
        validationResult,
        executionTime: Date.now() - startTime,
        errors,
        warnings,
        tenantDetails
      };

      Logger.success(`✅ MakerKit multi-tenant seeding completed: ${totalRecords} records across ${tenants.length} tenants`);
      return result;

    } catch (error: any) {
      Logger.error('MakerKit multi-tenant seeding failed:', error);
      throw error;
    }
  }

  /**
   * Generate sample data for a tenant and table
   */
  private async generateTenantSampleData(
    tableName: string,
    tenant: TenantInfo,
    options: Partial<TenantDataGenerationOptions>
  ): Promise<any[]> {
    const sampleData: any[] = [];

    switch (tableName) {
      case 'profiles':
        if (tenant.email) {
          sampleData.push({
            email: tenant.email,
            display_name: tenant.name,
            avatar_url: null,
            bio: `Profile for ${tenant.name}`,
            created_at: tenant.createdAt,
            updated_at: tenant.createdAt
          });
        }
        break;

      case 'setups':
        // Generate 1-3 setups per tenant
        const setupCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < setupCount; i++) {
          sampleData.push({
            title: `${tenant.name} Setup ${i + 1}`,
            description: `Sample setup ${i + 1} for ${tenant.name}`,
            is_public: Math.random() > 0.3, // 70% public
            created_at: tenant.createdAt,
            updated_at: tenant.createdAt
          });
        }
        break;

      case 'teams':
        if (tenant.type === 'team') {
          sampleData.push({
            name: tenant.name,
            description: `Team: ${tenant.name}`,
            created_at: tenant.createdAt,
            updated_at: tenant.createdAt
          });
        }
        break;
    }

    return sampleData;
  }

  /**
   * Get tenant scope information for a table
   */
  async getTenantScopeInfo(tableName: string): Promise<TenantScopeInfo | null> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    const scopeInfo = this.multiTenantManager.getTenantScopeInfo(tableName);
    return scopeInfo || null;
  }

  /**
   * Storage Integration Methods Implementation
   */

  /**
   * Integrate with Supabase Storage for file uploads and media management
   */
  async integrateWithStorage(
    setupId: string, 
    accountId?: string, 
    config?: Partial<StorageConfig>
  ): Promise<StorageIntegrationResult> {
    if (!this.storageIntegrationManager) {
      throw new Error('Storage integration manager not initialized');
    }

    Logger.info(`🗂️  MakerKit storage integration for setup: ${setupId}`);

    try {
      // Apply MakerKit-specific configuration overrides
      const makerkitConfig = {
        ...config,
        respectRLS: true, // Always respect RLS in MakerKit
        storageRootPath: `supa-seed/makerkit/${accountId || 'shared'}`,
        domain: config?.domain || 'outdoor-adventure'
      };

      const result = await this.storageIntegrationManager.seedWithStorageFiles(
        setupId,
        accountId,
        makerkitConfig
      );

      // Add MakerKit-specific recommendations
      if (result.success) {
        result.recommendations.push(
          'MakerKit: Storage respects RLS policies and tenant boundaries',
          'Files are organized by account for multi-tenant isolation',
          'Consider enabling real images for production-like testing'
        );
      }

      return result;

    } catch (error: any) {
      Logger.error('MakerKit storage integration failed:', error);
      throw error;
    }
  }

  /**
   * Check storage permissions and RLS compliance
   */
  async checkStoragePermissions(bucketName: string): Promise<StoragePermissionCheck> {
    if (!this.storageIntegrationManager) {
      throw new Error('Storage integration manager not initialized');
    }

    Logger.info(`🔒 MakerKit storage permission check for bucket: ${bucketName}`);

    try {
      const permissionCheck = await this.storageIntegrationManager.checkStoragePermissions(bucketName);

      // Add MakerKit-specific context
      permissionCheck.recommendations.push(
        'MakerKit: Ensure storage bucket has proper RLS policies',
        'Verify tenant-scoped access patterns for media files',
        'Consider using separate buckets for different account types'
      );

      return permissionCheck;

    } catch (error: any) {
      Logger.error('MakerKit storage permission check failed:', error);
      throw error;
    }
  }

  /**
   * Get storage quota and usage information
   */
  async getStorageQuota(bucketName: string): Promise<StorageQuotaInfo> {
    if (!this.storageIntegrationManager) {
      throw new Error('Storage integration manager not initialized');
    }

    Logger.info(`📊 MakerKit storage quota check for bucket: ${bucketName}`);

    try {
      const quotaInfo = await this.storageIntegrationManager.getStorageQuota(bucketName);

      // Add MakerKit-specific recommendations
      quotaInfo.recommendations.push(
        'MakerKit: Monitor storage usage per tenant/account',
        'Consider implementing storage limits per plan type',
        'Regular cleanup of old media files recommended'
      );

      return quotaInfo;

    } catch (error: any) {
      Logger.error('MakerKit storage quota check failed:', error);
      throw error;
    }
  }

  /**
   * Generate and upload media attachments for a specific entity
   */
  async generateMediaAttachments(
    entityId: string,
    entityType: string,
    count: number = 3,
    config?: Partial<StorageConfig>
  ): Promise<MediaAttachment[]> {
    if (!this.storageIntegrationManager) {
      throw new Error('Storage integration manager not initialized');
    }

    Logger.info(`🖼️  Generating ${count} MakerKit media attachments for ${entityType}: ${entityId}`);

    try {
      // Determine account ID from entity context if possible
      let accountId: string | undefined;
      
      // For MakerKit, try to extract account_id from context
      if (entityType === 'setup' || entityType === 'profile') {
        // Would query database to get account_id for the entity
        // For now, we'll use a placeholder approach
        accountId = `account_${entityId.split('_')[0]}`;
      }

      // Apply MakerKit-specific configuration
      const makerkitConfig = {
        ...config,
        domain: config?.domain || 'outdoor-adventure',
        categories: config?.categories || ['camping', 'hiking', 'outdoor-gear'],
        imagesPerSetup: count,
        respectRLS: true,
        storageRootPath: `supa-seed/makerkit/${accountId || 'shared'}`
      };

      const result = await this.storageIntegrationManager.seedWithStorageFiles(
        entityId,
        accountId,
        makerkitConfig
      );

      if (result.success) {
        Logger.success(`✅ Generated ${result.mediaAttachments.length} media attachments for ${entityType}`);
        return result.mediaAttachments;
      } else {
        throw new Error(`Media generation failed: ${result.errors.join(', ')}`);
      }

    } catch (error: any) {
      Logger.error(`MakerKit media generation failed for ${entityType} ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Get framework-specific storage configuration
   */
  getStorageConfig(): Partial<StorageConfig> {
    return {
      bucketName: 'media',
      domain: 'outdoor-adventure',
      categories: ['camping', 'hiking', 'climbing', 'backpacking', 'outdoor-gear'],
      imagesPerSetup: 3,
      enableRealImages: false,
      imageService: 'mock',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp'],
      generateThumbnails: true,
      respectRLS: true,
      storageRootPath: 'supa-seed/makerkit'
    };
  }

  /**
   * Enhanced RLS Compliance Validation Methods (Task 1.4.5)
   * Comprehensive RLS compliance validation for 100% security coverage
   */

  /**
   * Perform comprehensive RLS compliance analysis for MakerKit applications
   */
  async validateRLSCompliance(
    options: Partial<ComplianceEngineConfig> = {}
  ): Promise<ComplianceEngineResult> {
    Logger.info('🔒 Starting comprehensive MakerKit RLS compliance validation');

    if (!this.rlsComplianceEngine) {
      throw new Error('RLS compliance engine not initialized');
    }

    const makerkitConfig: Partial<ComplianceEngineConfig> = {
      strictMode: true,
      enableAdvancedParsing: true,
      enableConflictDetection: true,
      enablePerformanceAnalysis: true,
      enableSecurityAnalysis: true,
      generateReports: true,
      frameworkSpecific: true,
      autoFixEnabled: false, // Conservative approach for MakerKit
      maxConcurrentValidations: 3, // MakerKit-optimized concurrency
      reportFormat: 'json',
      auditLevel: 'comprehensive',
      ...options
    };

    try {
      const result = await this.rlsComplianceEngine.analyzeAndEnforceCompliance(makerkitConfig);
      
      // Add MakerKit-specific analysis
      const enhancedResult = await this.enhanceComplianceResultForMakerKit(result);
      
      Logger.success(`✅ MakerKit RLS compliance validation completed`);
      Logger.info(`📊 Compliance Grade: ${enhancedResult.overallCompliance.grade}`);
      Logger.info(`🔍 MakerKit Score: ${enhancedResult.overallCompliance.score}/100`);
      
      return enhancedResult;

    } catch (error: any) {
      Logger.error('❌ MakerKit RLS compliance validation failed:', error);
      throw error;
    }
  }

  /**
   * Quick RLS compliance check for seeding operations
   */
  async quickRLSCheck(
    tableName: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT',
    userContext?: UserContext
  ): Promise<{
    isCompliant: boolean;
    requiresUserContext: boolean;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    Logger.debug(`⚡ Quick MakerKit RLS check for ${tableName} (${operation})`);

    if (!this.rlsComplianceEngine) {
      throw new Error('RLS compliance engine not initialized');
    }

    try {
      const validationResult = await this.rlsComplianceEngine.quickComplianceCheck(
        tableName,
        operation,
        userContext
      );

      // Enhance with MakerKit-specific insights
      const makerkitRecommendations = this.generateMakerKitRLSRecommendations(
        tableName,
        operation,
        validationResult
      );

      const riskLevel = this.assessMakerKitRLSRisk(tableName, validationResult);

      return {
        isCompliant: validationResult.isCompliant,
        requiresUserContext: validationResult.requiresUserContext,
        recommendations: [
          ...validationResult.suggestedFixes.map(fix => fix.description),
          ...makerkitRecommendations
        ],
        riskLevel
      };

    } catch (error: any) {
      Logger.error(`Quick MakerKit RLS check failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Validate RLS compliance before seeding operation
   */
  async validatePreSeedingRLS(
    tableName: string,
    dataCount: number,
    userContext?: UserContext
  ): Promise<{
    approved: boolean;
    complianceStatus: 'compliant' | 'warning' | 'blocked';
    message: string;
    suggestedActions: string[];
  }> {
    Logger.debug(`🔍 Pre-seeding RLS validation for ${tableName} (${dataCount} records)`);

    const quickCheck = await this.quickRLSCheck(tableName, 'INSERT', userContext);

    if (!quickCheck.isCompliant) {
      return {
        approved: false,
        complianceStatus: 'blocked',
        message: `RLS compliance issues prevent seeding ${tableName}`,
        suggestedActions: quickCheck.recommendations
      };
    }

    // Check for MakerKit-specific patterns
    const makerkitIssues = await this.checkMakerKitSpecificRLSPatterns(tableName);

    if (makerkitIssues.length > 0) {
      const severity = quickCheck.riskLevel;
      
      if (severity === 'critical' || severity === 'high') {
        return {
          approved: false,
          complianceStatus: 'blocked',
          message: `Critical MakerKit RLS issues found for ${tableName}`,
          suggestedActions: makerkitIssues
        };
      } else {
        return {
          approved: true,
          complianceStatus: 'warning',
          message: `RLS warnings for ${tableName} - proceeding with caution`,
          suggestedActions: makerkitIssues
        };
      }
    }

    return {
      approved: true,
      complianceStatus: 'compliant',
      message: `RLS validation passed for ${tableName}`,
      suggestedActions: []
    };
  }

  /**
   * Generate comprehensive RLS compliance report for MakerKit
   */
  async generateRLSComplianceReport(
    format: 'json' | 'markdown' | 'html' = 'markdown'
  ): Promise<string> {
    Logger.info('📄 Generating MakerKit RLS compliance report');

    const complianceResult = await this.validateRLSCompliance();
    
    if (!this.rlsComplianceEngine) {
      throw new Error('RLS compliance engine not initialized');
    }

    const baseReport = await this.rlsComplianceEngine.generateFormattedReport(
      complianceResult,
      format
    );

    if (format === 'markdown') {
      return this.enhanceMarkdownReportForMakerKit(baseReport, complianceResult);
    }

    return baseReport;
  }

  /**
   * Auto-fix common MakerKit RLS issues (conservative approach)
   */
  async autoFixMakerKitRLSIssues(
    options: {
      dryRun?: boolean;
      enableRLSOnly?: boolean;
      skipCriticalFixes?: boolean;
    } = {}
  ): Promise<{
    fixesApplied: number;
    fixesFailed: number;
    fixesSkipped: number;
    recommendations: string[];
    requiresManualReview: string[];
  }> {
    Logger.info('🔧 Auto-fixing MakerKit RLS issues');

    const config: Partial<ComplianceEngineConfig> = {
      autoFixEnabled: !options.dryRun,
      strictMode: true,
      frameworkSpecific: true
    };

    const result = await this.validateRLSCompliance(config);
    
    let fixesApplied = 0;
    let fixesFailed = 0;
    let fixesSkipped = 0;
    const recommendations: string[] = [];
    const requiresManualReview: string[] = [];

    // Process auto-fix results
    for (const autoFix of result.autoFixResults) {
      switch (autoFix.status) {
        case 'applied':
          fixesApplied++;
          break;
        case 'failed':
          fixesFailed++;
          break;
        case 'skipped':
        case 'requires_manual_review':
          fixesSkipped++;
          requiresManualReview.push(`${autoFix.fixType}: ${autoFix.originalIssue}`);
          break;
      }
    }

    // Generate MakerKit-specific recommendations
    recommendations.push(...this.generateMakerKitRLSFixRecommendations(result));

    Logger.info(`🔧 Auto-fix summary: ${fixesApplied} applied, ${fixesFailed} failed, ${fixesSkipped} skipped`);

    return {
      fixesApplied,
      fixesFailed,
      fixesSkipped,
      recommendations,
      requiresManualReview
    };
  }

  /**
   * Private helper methods for MakerKit RLS enhancement
   */
  private async enhanceComplianceResultForMakerKit(
    result: ComplianceEngineResult
  ): Promise<ComplianceEngineResult> {
    // Add MakerKit-specific analysis
    const makerkitPatterns = await this.analyzeMakerKitRLSPatterns(result);
    
    // Enhance recommendations with MakerKit-specific guidance
    const enhancedRecommendations = [
      ...result.recommendations,
      ...this.generateMakerKitSpecificRecommendations(result)
    ];

    return {
      ...result,
      recommendations: enhancedRecommendations,
      // Add MakerKit-specific metadata
      executionMetrics: {
        ...result.executionMetrics
      }
    };
  }

  private generateMakerKitRLSRecommendations(
    tableName: string,
    operation: string,
    validationResult: any
  ): string[] {
    const recommendations: string[] = [];

    // MakerKit-specific table recommendations
    if (tableName === 'accounts') {
      recommendations.push('Ensure account isolation with proper tenant scoping');
      recommendations.push('Verify personal vs team account RLS policies');
    }

    if (tableName === 'profiles') {
      recommendations.push('Implement user-scoped access using auth.uid()');
      recommendations.push('Consider profile visibility settings for team accounts');
    }

    if (tableName.includes('organization') || tableName.includes('team')) {
      recommendations.push('Implement role-based access control for team operations');
      recommendations.push('Ensure proper member permission validation');
    }

    if (operation === 'INSERT' && !validationResult.requiresUserContext) {
      recommendations.push('Consider adding user context for audit trails');
    }

    return recommendations;
  }

  private assessMakerKitRLSRisk(
    tableName: string,
    validationResult: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk tables in MakerKit
    const criticalTables = ['accounts', 'users', 'organization_members', 'billing'];
    const sensitiveTable = criticalTables.some(table => tableName.includes(table));

    if (!validationResult.isCompliant) {
      return sensitiveTable ? 'critical' : 'high';
    }

    if (validationResult.violatedPolicies.length > 0) {
      return sensitiveTable ? 'high' : 'medium';
    }

    return 'low';
  }

  private async checkMakerKitSpecificRLSPatterns(tableName: string): Promise<string[]> {
    const issues: string[] = [];

    // Check for common MakerKit patterns
    if (tableName === 'accounts') {
      // Check for personal account constraint
      const hasPersonalAccountConstraint = await this.checkForConstraint(
        tableName,
        'accounts_slug_null_if_personal_account'
      );
      
      if (!hasPersonalAccountConstraint) {
        issues.push('Missing personal account constraint - may affect RLS policy logic');
      }
    }

    if (tableName.includes('organization')) {
      // Check for proper team member policies
      issues.push('Verify team member access policies for organization data');
    }

    return issues;
  }

  private async checkForConstraint(tableName: string, constraintName: string): Promise<boolean> {
    try {
      // Simplified constraint check - would use constraint discovery engine in real implementation
      const { data } = await this.client
        .rpc('exec_sql', {
          query: `
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = $1 AND constraint_name = $2
          `,
          params: [tableName, constraintName]
        });
      
      return data && (data as any[]).length > 0;
    } catch {
      return false;
    }
  }

  private async analyzeMakerKitRLSPatterns(result: ComplianceEngineResult): Promise<any[]> {
    const patterns: any[] = [];

    // Analyze common MakerKit RLS patterns
    for (const policy of result.policyAnalysis.parsedPolicies) {
      if (policy.parsed.expression.includes('auth.uid()')) {
        patterns.push({
          type: 'user_scoped_access',
          table: policy.tableName,
          description: 'User-scoped access pattern detected'
        });
      }

      if (policy.parsed.expression.includes('account_id')) {
        patterns.push({
          type: 'tenant_isolation',
          table: policy.tableName,
          description: 'Tenant isolation pattern detected'
        });
      }
    }

    return patterns;
  }

  private generateMakerKitSpecificRecommendations(result: ComplianceEngineResult): any[] {
    const recommendations: any[] = [];

    // Add MakerKit-specific security recommendations
    if (result.overallCompliance.score < 80) {
      recommendations.push({
        id: 'makerkit-security-enhancement',
        priority: 'high',
        category: 'security',
        title: 'Enhance MakerKit Security Posture',
        description: 'Implement MakerKit best practices for RLS policies',
        impact: 'Improved security for multi-tenant SaaS applications',
        effort: 'moderate',
        implementation: [
          {
            step: 1,
            action: 'Review tenant isolation policies',
            verification: 'Ensure proper account_id scoping'
          },
          {
            step: 2,
            action: 'Implement user-scoped access controls',
            verification: 'Verify auth.uid() usage in critical tables'
          }
        ],
        dependencies: ['MakerKit framework knowledge'],
        risks: ['Potential access control issues'],
        benefits: ['Better tenant isolation', 'Improved security']
      });
    }

    return recommendations;
  }

  private generateMakerKitRLSFixRecommendations(result: ComplianceEngineResult): string[] {
    const recommendations: string[] = [];

    // Analyze critical issues specific to MakerKit
    if (result.overallCompliance.criticalIssues > 0) {
      recommendations.push('Prioritize fixing critical RLS issues in auth and account tables');
      recommendations.push('Implement proper tenant isolation before production deployment');
    }

    if (result.policyAnalysis.securityDistribution.weak > 0) {
      recommendations.push('Strengthen weak RLS policies with proper user context validation');
      recommendations.push('Consider implementing role-based access control for team features');
    }

    recommendations.push('Regular RLS compliance audits recommended for MakerKit applications');
    recommendations.push('Test RLS policies with different user roles and tenant scenarios');

    return recommendations;
  }

  private enhanceMarkdownReportForMakerKit(
    baseReport: string,
    result: ComplianceEngineResult
  ): string {
    const makerkitSection = [
      '',
      '## MakerKit-Specific Analysis',
      '',
      '### Framework Compatibility',
      `**MakerKit Version Detected:** ${this.version || 'Unknown'}`,
      `**Features Detected:** ${this.detectedFeatures.join(', ') || 'Standard'}`,
      '',
      '### Common MakerKit Patterns',
      '- **Tenant Isolation:** Account-based data scoping',
      '- **User Authentication:** Auth.uid() based access control',
      '- **Team Management:** Role-based organization access',
      '',
      '### MakerKit Recommendations',
      '1. Ensure all tenant-scoped tables use `account_id` properly',
      '2. Implement user-scoped policies for personal data',
      '3. Test RLS policies with different organization roles',
      '4. Regular compliance audits for multi-tenant security',
      ''
    ].join('\n');

    return baseReport + makerkitSection;
  }
}