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
import { ConstraintDiscoveryEngine } from '../../schema/constraint-discovery-engine';
import { ConstraintRegistry } from '../../schema/constraint-registry';
import { BusinessLogicAnalyzer } from '../../schema/business-logic-analyzer';
import { RLSCompliantSeeder } from '../../schema/rls-compliant-seeder';
import { Logger } from '../../utils/logger';
import type {
  BusinessLogicAnalysisResult,
  RLSComplianceOptions,
  RLSComplianceResult,
  UserContext
} from '../../schema/business-logic-types';

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

  async initialize(client: SupabaseClient): Promise<void> {
    this.client = client;
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
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
    try {
      Logger.debug(`Creating MakerKit user: ${data.email}`);

      // Use MakerKit's intended flow: auth.admin.createUser() + triggers
      const { data: authUser, error: authError } = await this.client.auth.admin.createUser({
        email: data.email,
        password: data.password || 'defaultPassword123!',
        email_confirm: true,
        user_metadata: {
          name: data.name,
          username: data.username,
          avatar_url: data.avatar,
          bio: data.bio,
          ...data.metadata
        }
      });

      if (authError) {
        throw new Error(`Auth user creation failed: ${authError.message}`);
      }

      if (!authUser.user) {
        throw new Error('Auth user creation returned no user');
      }

      // Wait for MakerKit triggers to create account and profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify account was created
      const { data: account, error: accountError } = await this.client
        .from('accounts')
        .select('*')
        .eq('id', authUser.user.id)
        .single();

      if (accountError || !account) {
        Logger.warn('Account not created by trigger, creating manually');
        
        // Fallback: create account manually with constraint handling
        const accountData = await this.handleConstraints('accounts', {
          id: authUser.user.id,
          name: data.name,
          email: data.email,
          is_personal_account: true,
          slug: null, // Set to null for personal accounts
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        const { error: insertError } = await this.client
          .from('accounts')
          .insert(accountData.modifiedData);

        if (insertError) {
          throw new Error(`Manual account creation failed: ${insertError.message}`);
        }
      }

      // Check for profile creation
      const { data: profile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', authUser.user.id)
        .single();

      if (!profile) {
        Logger.debug('Creating profile manually');
        
        const { error: profileError } = await this.client
          .from('profiles')
          .insert({
            id: authUser.user.id,
            name: data.name,
            username: data.username,
            avatar_url: data.avatar,
            bio: data.bio,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          Logger.warn(`Profile creation failed: ${profileError.message}`);
        }
      }

      return {
        id: authUser.user.id,
        email: authUser.user.email!,
        name: data.name,
        username: data.username,
        avatar: data.avatar,
        created_at: authUser.user.created_at,
        metadata: authUser.user.user_metadata
      };

    } catch (error: any) {
      Logger.error(`MakerKit user creation failed: ${error.message}`);
      throw error;
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
      'framework_specific_handlers'
    ];

    return supportedFeatures.includes(feature);
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
}