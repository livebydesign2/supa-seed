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
  ConstraintFix
} from '../strategy-interface';
import { Logger } from '../../utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export class MakerKitStrategy implements SeedingStrategy {
  name = 'makerkit';
  private client!: SupabaseClient;
  private version?: string;
  private detectedFeatures: string[] = [];

  async initialize(client: SupabaseClient): Promise<void> {
    this.client = client;
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
          .insert(accountData.data);

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
            reason: 'Personal accounts must have null slug (MakerKit constraint)'
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
            reason: 'Default to personal account for user profiles'
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
            reason: 'Map display_name to name field'
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
        data: processedData,
        appliedFixes,
        warnings
      };

    } catch (error: any) {
      Logger.warn(`Constraint handling failed for ${table}: ${error.message}`);
      return {
        data: processedData,
        appliedFixes,
        warnings: [...warnings, `Constraint handling error: ${error.message}`]
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
      'business_logic_respect'
    ];

    return supportedFeatures.includes(feature);
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