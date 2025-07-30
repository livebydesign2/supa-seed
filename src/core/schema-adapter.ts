import type { createClient } from '@supabase/supabase-js';
import { Logger } from './utils/logger';
import { isServiceRoleKey, isLocalSupabaseEnvironment } from './utils/enhanced-supabase-client';

class JWTAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JWTAuthenticationError';
  }
}

type SupabaseClient = ReturnType<typeof createClient>;

export interface SchemaInfo {
  hasAccounts: boolean;
  hasUsers: boolean; // Makerkit uses auth.users + profiles pattern
  hasProfiles: boolean;
  hasSetups: boolean;
  hasCategories: boolean;
  hasTeams: boolean; // Makerkit multi-tenancy
  hasOrganizations: boolean;
  accountsTableStructure: 'simple' | 'makerkit' | 'custom';
  primaryUserTable: 'accounts' | 'profiles' | 'users';
  // Enhanced detection fields
  makerkitVersion: 'v1' | 'v2' | 'v3' | 'custom' | 'none';
  customTables: string[];
  detectedRelationships: TableRelationship[];
  assetCompatibility: AssetCompatibilityInfo;
  frameworkType: 'makerkit' | 'simple' | 'wildernest' | 'custom';
}

export interface TableRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: 'one_to_one' | 'one_to_many' | 'many_to_many';
  cascadeDelete: boolean;
}

export interface AssetCompatibilityInfo {
  supportsImages: boolean;
  supportsMarkdown: boolean;
  supportsJson: boolean;
  contentTables: string[];
  userContentRelationships: TableRelationship[];
  mediaStoragePattern: 'supabase_storage' | 'url_only' | 'base64' | 'custom';
}

export class SchemaAdapter {
  private schemaInfo: SchemaInfo | null = null;
  private configOverride?: {
    framework?: string;
    primaryUserTable?: 'accounts' | 'profiles' | 'users';
    schema?: any;
  };
  private supabaseUrl: string;

  constructor(private client: SupabaseClient, configOverride?: any, supabaseUrl?: string, private supabaseKey?: string) {
    this.configOverride = configOverride;
    // Store the URL for local environment detection
    this.supabaseUrl = supabaseUrl || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  }

  /**
   * Check if this is a local Supabase environment
   */
  private isLocalSupabaseEnvironment(): boolean {
    return isLocalSupabaseEnvironment(this.supabaseUrl);
  }

  /**
   * Detect the database schema and return comprehensive compatibility info
   */
  async detectSchema(): Promise<SchemaInfo> {
    if (this.schemaInfo) {
      return this.schemaInfo;
    }

    console.log('🔍 Detecting database schema...');
    
    // Check if this is a local Supabase environment
    const isLocalSupabase = this.isLocalSupabaseEnvironment();
    if (isLocalSupabase) {
      Logger.debug('Local Supabase environment detected, using enhanced local detection patterns');
    }

    const schemaInfo: SchemaInfo = {
      hasAccounts: false,
      hasUsers: false,
      hasProfiles: false,
      hasSetups: false,
      hasCategories: false,
      hasTeams: false,
      hasOrganizations: false,
      accountsTableStructure: 'simple',
      primaryUserTable: 'accounts',
      // Enhanced detection fields
      makerkitVersion: 'none',
      customTables: [],
      detectedRelationships: [],
      assetCompatibility: {
        supportsImages: false,
        supportsMarkdown: false,
        supportsJson: false,
        contentTables: [],
        userContentRelationships: [],
        mediaStoragePattern: 'url_only'
      },
      frameworkType: 'custom'
    };

    // Check for core tables
    schemaInfo.hasAccounts = await this.tableExists('accounts');
    schemaInfo.hasProfiles = await this.tableExists('profiles');
    schemaInfo.hasSetups = await this.tableExists('setups');
    schemaInfo.hasCategories = await this.tableExists('categories');
    schemaInfo.hasTeams = await this.tableExists('teams');
    schemaInfo.hasOrganizations = await this.tableExists('organizations');
    
    // Check for MakerKit-specific tables
    const hasMemberships = await this.tableExists('memberships');
    const hasSubscriptions = await this.tableExists('subscriptions');
    const hasRoles = await this.tableExists('roles');
    const hasInvitations = await this.tableExists('invitations');
    const hasNotifications = await this.tableExists('notifications');
    
    // Additional MakerKit v2/v3 tables mentioned in beta test bug report
    const hasRolePermissions = await this.tableExists('role_permissions');
    const hasBillingCustomers = await this.tableExists('billing_customers');
    const hasGearItems = await this.tableExists('gear_items');
    const hasReviews = await this.tableExists('reviews');
    
    // Check for content and media tables
    const hasPosts = await this.tableExists('posts');
    const hasMediaAttachments = await this.tableExists('media_attachments');
    const hasGear = await this.tableExists('gear');
    const hasBaseTemplates = await this.tableExists('base_templates');
    const hasTrips = await this.tableExists('trips');
    const hasModifications = await this.tableExists('modifications');
    
    // Detect custom tables (beyond standard MakerKit)
    schemaInfo.customTables = await this.detectCustomTables([
      'accounts', 'profiles', 'memberships', 'subscriptions', 'roles', 
      'invitations', 'notifications', 'posts', 'media_attachments'
    ]);

    // Check if auth.users has records (standard Supabase pattern)
    schemaInfo.hasUsers = await this.checkAuthUsers();

    // Enhanced MakerKit version detection
    schemaInfo.makerkitVersion = await this.detectMakerKitVersion({
      hasAccounts: schemaInfo.hasAccounts,
      hasMemberships,
      hasSubscriptions,
      hasRoles,
      hasInvitations,
      hasNotifications,
      hasRolePermissions,
      hasBillingCustomers,
      hasGearItems,
      hasReviews
    });
    
    // Determine account table structure with enhanced detection
    if (schemaInfo.hasAccounts && hasMemberships) {
      schemaInfo.accountsTableStructure = 'makerkit';
    } else if (schemaInfo.hasAccounts) {
      const accountsStructure = await this.detectAccountsStructure();
      schemaInfo.accountsTableStructure = accountsStructure;
    }
    
    // Detect framework type based on table patterns
    schemaInfo.frameworkType = this.detectFrameworkTypeEnhanced({
      makerkitVersion: schemaInfo.makerkitVersion,
      hasGear,
      hasBaseTemplates,
      hasSetups: schemaInfo.hasSetups,
      hasTrips,
      customTables: schemaInfo.customTables
    });
    
    // Detect relationships for better association intelligence
    schemaInfo.detectedRelationships = await this.detectTableRelationships();
    
    // Analyze asset compatibility
    schemaInfo.assetCompatibility = await this.analyzeAssetCompatibility({
      hasMediaAttachments,
      hasPosts,
      hasSetups: schemaInfo.hasSetups,
      customTables: schemaInfo.customTables
    });

    // Determine primary user table (prioritize config override)
    schemaInfo.primaryUserTable = this.determinePrimaryUserTable(schemaInfo);

    this.schemaInfo = schemaInfo;
    
    console.log('📋 Enhanced schema detected:', {
      primaryUserTable: schemaInfo.primaryUserTable,
      structure: schemaInfo.accountsTableStructure,
      makerkitVersion: schemaInfo.makerkitVersion,
      frameworkType: schemaInfo.frameworkType,
      customTables: schemaInfo.customTables.length,
      relationships: schemaInfo.detectedRelationships.length,
      assetCompatibility: {
        images: schemaInfo.assetCompatibility.supportsImages,
        markdown: schemaInfo.assetCompatibility.supportsMarkdown,
        storage: schemaInfo.assetCompatibility.mediaStoragePattern
      }
    });

    return schemaInfo;
  }

  /**
   * Get the appropriate user creation strategy based on detected schema
   */
  getUserCreationStrategy(): 'simple-accounts' | 'makerkit-profiles' | 'custom-profiles' {
    if (!this.schemaInfo) {
      throw new Error('Schema not detected. Call detectSchema() first.');
    }

    // Check config override first
    if (this.configOverride?.schema?.primaryUserTable === 'accounts' || 
        this.configOverride?.primaryUserTable === 'accounts') {
      Logger.debug('Using simple-accounts strategy due to config override');
      return 'simple-accounts';
    }

    // Original logic with MakerKit detection improvements
    if (this.schemaInfo.hasAccounts && this.schemaInfo.accountsTableStructure === 'makerkit') {
      return 'makerkit-profiles';
    } else if (this.schemaInfo.hasProfiles && this.schemaInfo.hasTeams) {
      return 'makerkit-profiles';
    } else if (this.schemaInfo.hasProfiles && this.schemaInfo.hasUsers) {
      return 'custom-profiles';
    } else if (this.schemaInfo.hasAccounts) {
      return 'simple-accounts';
    } else {
      return 'custom-profiles';
    }
  }

  /**
   * Create a user using the appropriate strategy for the detected schema
   */
  async createUserForSchema(userData: {
    id?: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    picture_url?: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    const strategy = this.getUserCreationStrategy();
    
    try {
      switch (strategy) {
        case 'simple-accounts':
          return await this.createSimpleAccountUser(userData);
          
        case 'makerkit-profiles':
          return await this.createMakerkitUser(userData);
          
        case 'custom-profiles':
          return await this.createProfilesUser(userData);
          
        default:
          throw new Error(`Unknown user creation strategy: ${strategy}`);
      }
    } catch (error: any) {
      console.error(`Failed to create user with strategy ${strategy}:`, error);
      return { id: '', success: false, error: error.message };
    }
  }

  /**
   * Get the correct column name for a field, checking config first then what actually exists
   */
  private async getColumnMapping(tableName: string, expectedField: string, fallbacks: string[] = []): Promise<string | null> {
    // First check if config override specifies a mapping
    const configMapping = this.getConfigColumnMapping(tableName, expectedField);
    if (configMapping && await this.columnExists(tableName, configMapping)) {
      return configMapping;
    }
    
    // Fall back to checking all options
    const allOptions = [expectedField, ...fallbacks];
    
    for (const option of allOptions) {
      if (await this.columnExists(tableName, option)) {
        return option;
      }
    }
    
    return null;
  }

  /**
   * Get column mapping from configuration
   */
  private getConfigColumnMapping(tableName: string, expectedField: string): string | null {
    if (!this.configOverride?.schema) return null;
    
    // Map expected fields to config field names
    const fieldMappings: Record<string, string> = {
      // Profile/user table mappings
      'email': 'emailField',
      'picture_url': 'pictureField',
      'avatar_url': 'pictureField',
      'bio': 'bioField',
      'username': 'usernameField',
      'name': 'nameField',
      'display_name': 'nameField',
      // Base template mappings
      'description': 'descriptionField',
      'type': 'typeField',
      'make': 'makeField',
      'model': 'modelField',
      'year': 'yearField'
    };
    
    const configFieldName = fieldMappings[expectedField];
    if (!configFieldName) return null;
    
    // Check different table configurations
    if (tableName === 'profiles' && this.configOverride.schema.userTable) {
      return this.configOverride.schema.userTable[configFieldName as keyof typeof this.configOverride.schema.userTable] as string || null;
    }
    
    if (tableName === 'base_templates' && this.configOverride.schema.baseTemplateTable) {
      return this.configOverride.schema.baseTemplateTable[configFieldName as keyof typeof this.configOverride.schema.baseTemplateTable] as string || null;
    }
    
    return null;
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      // For local Supabase environments, add extra timeout and retry logic
      const isLocal = this.isLocalSupabaseEnvironment();
      
      if (isLocal) {
        // Local environments might be slower, provide better error details
        const { error } = await this.client
          .from(tableName)
          .select('id')
          .limit(1);
        
        const exists = !error;
        if (exists) {
          Logger.debug(`Table '${tableName}' found in local environment`);
        } else {
          // Check for JWT authentication errors specifically
          if (error?.message?.includes('JWSError') || error?.message?.includes('JWSInvalidSignature')) {
            Logger.debug(`JWT authentication error for table '${tableName}': ${error.message}`);
            // Only throw on the first table to avoid spamming the user
            if (tableName === 'accounts') {
              const isServiceRole = this.supabaseKey && isServiceRoleKey(this.supabaseKey);
              const keyType = isServiceRole ? 'service role key' : 'authentication key';
              
              throw new JWTAuthenticationError(`
${keyType} authentication failed in local environment.

This version of supa-seed includes enhanced JWT handling, but you're still experiencing authentication issues.

**Immediate workaround**: Use anon key instead:
1. Get anon key: supabase status | grep "anon key"  
2. Retry: npx supa-seed detect --url "${this.supabaseUrl}" --key "[ANON_KEY]"

**Root cause**: JWT signature validation issue between service role keys and local Supabase environments.
Anon keys work perfectly and have sufficient permissions for all supa-seed operations.

Technical details: ${error.message}
              `.trim());
            }
            return false;
          }
          Logger.debug(`Table '${tableName}' not found in local environment: ${error?.message || 'Unknown error'}`);
        }
        return exists;
      } else {
        // Cloud environments use standard detection
        const { error } = await this.client.from(tableName).select('*').limit(1);
        return !error;
      }
    } catch (error: any) {
      // Re-throw JWT authentication errors with helpful message
      if (error instanceof JWTAuthenticationError) {
        throw error;
      }
      Logger.debug(`Table existence check failed for '${tableName}': ${error.message}`);
      return false;
    }
  }

  private async checkAuthUsers(): Promise<boolean> {
    try {
      // Try to access auth.users indirectly through a query that would work
      // if users exist in the auth schema
      const { data, error } = await this.client.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      return !error;
    } catch {
      return false;
    }
  }

  private async detectAccountsStructure(): Promise<'simple' | 'makerkit' | 'custom'> {
    try {
      // Test if the table has MakerKit-specific fields by trying to select them
      const { error: primaryOwnerError } = await this.client
        .from('accounts')
        .select('primary_owner_user_id')
        .limit(1);

      if (!primaryOwnerError) {
        Logger.debug('Found primary_owner_user_id field - MakerKit pattern detected');
        return 'makerkit';
      }

      // Test for other MakerKit indicators
      const { error: slugError } = await this.client
        .from('accounts')
        .select('slug, is_personal_account')
        .limit(1);

      if (!slugError) {
        Logger.debug('Found slug field - MakerKit pattern detected');
        return 'makerkit';
      }

      // Check for simple pattern with id field
      const { error: idError } = await this.client
        .from('accounts')
        .select('id')
        .limit(1);

      if (!idError) {
        Logger.debug('Simple accounts pattern detected');
        return 'simple';
      }

      return 'custom';
    } catch (error: any) {
      Logger.debug('Account structure detection failed:', error);
      return 'custom';
    }
  }

  private determinePrimaryUserTable(schemaInfo: SchemaInfo): 'accounts' | 'profiles' | 'users' {
    // First check if config override specifies primary user table
    if (this.configOverride?.schema?.primaryUserTable) {
      const configTable = this.configOverride.schema.primaryUserTable;
      Logger.debug(`Using config override for primary user table: ${configTable}`);
      return configTable;
    }
    
    // Also check direct primaryUserTable property
    if (this.configOverride?.primaryUserTable) {
      const configTable = this.configOverride.primaryUserTable;
      Logger.debug(`Using config override for primary user table: ${configTable}`);
      return configTable;
    }
    
    // Prioritize accounts table for MakerKit patterns
    if (schemaInfo.hasAccounts && schemaInfo.accountsTableStructure === 'makerkit') {
      Logger.debug('Detected MakerKit pattern with accounts table, using accounts as primary');
      return 'accounts';
    }
    
    // Fall back to original logic
    if (schemaInfo.hasProfiles && schemaInfo.hasUsers) {
      return 'profiles';
    } else if (schemaInfo.hasAccounts) {
      return 'accounts';
    } else {
      return 'users';
    }
  }

  private async createSimpleAccountUser(userData: {
    id?: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    picture_url?: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    // Original supa-seed logic - create auth user then account
    const userId = userData.id || crypto.randomUUID();

    // Create auth user
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: userData.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: userData.name,
        username: userData.username,
      }
    });

    if (authError) {
      return { id: '', success: false, error: `Auth user creation failed: ${authError.message}` };
    }

    // Create account record with proper fields based on schema
    const accountData: any = {
      email: userData.email,
      name: userData.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add optional fields if provided - MakerKit accounts table structure
    if (userData.bio || userData.username) {
      // For MakerKit, additional data like bio and username go in public_data JSONB field
      accountData.public_data = {};
      if (userData.bio) accountData.public_data.bio = userData.bio;
      if (userData.username) accountData.public_data.username = userData.username;
    }
    if (userData.picture_url) accountData.picture_url = userData.picture_url;

    // For MakerKit-style accounts, use primary_owner_user_id
    if (this.schemaInfo?.accountsTableStructure === 'makerkit') {
      accountData.primary_owner_user_id = userId;
      accountData.is_personal_account = true;
      // Don't set slug for personal accounts due to constraint
    } else {
      // For simple accounts, use id field
      accountData.id = userId;
    }

    // Check if account already exists before trying to create it
    const { data: existingAccount } = await this.client
      .from('accounts')
      .select('email, id')
      .eq('email', userData.email)
      .single();

    if (existingAccount) {
      Logger.debug(`Account for ${userData.email} already exists, using existing record`);
      return { id: existingAccount.id as string, success: true };
    }

    const { error: accountError } = await this.client
      .from('accounts')
      .insert(accountData);

    if (accountError) {
      // If it's a duplicate key error, check if the record was actually created
      if (accountError.code === '23505') {
        const { data: createdAccount } = await this.client
          .from('accounts')
          .select('email, id')
          .eq('email', userData.email)
          .single();
          
        if (createdAccount) {
          Logger.debug(`Account for ${userData.email} was created despite duplicate key error`);
          return { id: createdAccount.id as string, success: true };
        }
      }
      
      Logger.debug('Account creation error:', accountError);
      return { id: '', success: false, error: `Account creation failed: ${accountError.message}` };
    }

    Logger.debug(`Successfully created account for ${userData.email} with ID ${userId}`);
    return { id: userId, success: true };
  }

  private async createMakerkitUser(userData: {
    id?: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    picture_url?: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    // Makerkit pattern: auth user + profile + account/team
    const userId = userData.id || crypto.randomUUID();

    // Create auth user
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: userData.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: userData.name,
      }
    });

    if (authError) {
      return { id: '', success: false, error: `Auth user creation failed: ${authError.message}` };
    }

    // Dynamically determine profile column mappings (config-aware)
    const emailColumn = await this.getColumnMapping('profiles', 'email', ['email_address', 'user_email']);
    const pictureColumn = await this.getColumnMapping('profiles', 'picture_url', ['avatar_url', 'profile_image_url', 'image_url']);
    const bioColumn = await this.getColumnMapping('profiles', 'bio', ['about', 'description']);
    const usernameColumn = await this.getColumnMapping('profiles', 'username', ['handle', 'user_name']);
    const nameColumn = await this.getColumnMapping('profiles', 'name', ['display_name', 'full_name', 'username']);

    // Build profile data with only columns that exist
    const profileData: any = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    // Add email field if column exists and data provided
    if (emailColumn && userData.email) {
      profileData[emailColumn] = userData.email;
    } else if (userData.email) {
      Logger.debug(`Email field not found in profiles table - skipping email`);
    }

    // Add name field if column exists and data provided
    if (nameColumn && userData.name) {
      profileData[nameColumn] = userData.name;
    } else if (userData.name) {
      Logger.debug(`Name field not found in profiles table - skipping name`);
    }

    // Add optional fields only if columns exist and data provided
    if (pictureColumn && userData.picture_url) {
      profileData[pictureColumn] = userData.picture_url;
    } else if (userData.picture_url) {
      // Log missing column but don't fail
      Logger.debug(`Picture field not found in profiles table - skipping avatar`);
    }
    
    if (bioColumn && userData.bio) {
      profileData[bioColumn] = userData.bio;
    } else if (userData.bio) {
      Logger.debug(`Bio field not found in profiles table - skipping bio`);
    }
    
    if (usernameColumn && userData.username) {
      profileData[usernameColumn] = userData.username;
    } else if (userData.username) {
      Logger.debug(`Username field not found in profiles table - skipping username`);
    }

    // CRITICAL FIX: Create account FIRST to satisfy PostgreSQL constraint
    // "Profiles can only be created for personal accounts" requires account to exist before profile
    if (this.schemaInfo?.hasAccounts) {
      try {
        // NEW: Pre-check for MakerKit personal account constraints
        const constraintCheck = await this.checkPersonalAccountConstraints();
        if (!constraintCheck.canCreate) {
          const errorMsg = `Cannot create personal account: ${constraintCheck.reason}. ` +
            `Existing personal accounts: ${constraintCheck.existingCount}, ` +
            `Maximum allowed: ${constraintCheck.maxAllowed}`;
          Logger.warn(errorMsg);
          return { id: '', success: false, error: errorMsg };
        }

        const { error: accountError } = await this.client
          .from('accounts')
          .insert({
            id: crypto.randomUUID(),
            name: `${userData.name}'s Account`,
            primary_owner_user_id: userId,
            slug: null, // CRITICAL: MakerKit constraint requires slug = null for personal accounts
            is_personal_account: true, // CRITICAL: Must be true for profile creation to succeed
          });
        
        if (accountError) {
          // Check if this is the specific constraint violation we're trying to prevent
          if (accountError.message.includes('unique_personal_account')) {
            const enhancedError = `Personal account constraint violation: MakerKit limits personal accounts per workspace. ` +
              `Current constraint prevents additional personal accounts. ` +
              `Consider using existing accounts or configuring team accounts instead.`;
            return { id: '', success: false, error: enhancedError };
          }
          return { id: '', success: false, error: `Account creation failed: ${accountError.message}` };
        }
        
        Logger.debug(`✅ Account created for ${userData.email} with is_personal_account=true`);
      } catch (error: any) {
        return { id: '', success: false, error: `Account creation failed: ${error.message}` };
      }
    }

    // Now create profile (after account exists with is_personal_account=true)
    const { error: profileError } = await this.client
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      // Enhanced error reporting with schema introspection hints
      let errorMsg = `Profile creation failed: ${profileError.message}`;
      
      if (profileError.message.includes('column')) {
        // Use comprehensive schema validation for better error messages
        const schemaValidation = await this.validateTableSchema('profiles', {
          email: ['email', 'email_address', 'user_email'],
          name: ['name', 'display_name', 'full_name', 'username'],
          picture: ['picture_url', 'avatar_url', 'profile_image_url', 'image_url'],
          bio: ['bio', 'about', 'description'],
          username: ['username', 'handle', 'user_name']
        });
        
        errorMsg += `\n\nSchema Analysis:`;
        errorMsg += `\n  Available columns: ${schemaValidation.availableColumns.join(', ')}`;
        
        if (schemaValidation.suggestions.length > 0) {
          errorMsg += `\n\nMapping suggestions:`;
          schemaValidation.suggestions.forEach(suggestion => {
            errorMsg += `\n  - ${suggestion}`;
          });
        }
        
        errorMsg += `\n\nCurrent mappings:`;
        if (emailColumn) errorMsg += `\n  - Email: '${emailColumn}' ✅`;
        if (nameColumn) errorMsg += `\n  - Name: '${nameColumn}' ✅`;
        if (pictureColumn) errorMsg += `\n  - Picture: '${pictureColumn}' ✅`;
        if (bioColumn) errorMsg += `\n  - Bio: '${bioColumn}' ✅`;
        if (usernameColumn) errorMsg += `\n  - Username: '${usernameColumn}' ✅`;
        
        errorMsg += `\n\nTo fix: Update your config schema.userTable fields to match your database columns.`;
      }
      
      return { id: '', success: false, error: errorMsg };
    }

    return { id: userId, success: true };
  }

  private async createProfilesUser(userData: {
    id?: string;
    email: string;
    name: string;
    username?: string;
    bio?: string;
    picture_url?: string;
  }): Promise<{ id: string; success: boolean; error?: string }> {
    // Generic profiles pattern: auth user + profile
    const userId = userData.id || crypto.randomUUID();

    // Create auth user
    const { error: authError } = await this.client.auth.admin.createUser({
      id: userId,
      email: userData.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: userData.name,
      }
    });

    if (authError) {
      return { id: '', success: false, error: `Auth user creation failed: ${authError.message}` };
    }

    // Dynamically determine profile column mappings (config-aware)
    const emailColumn = await this.getColumnMapping('profiles', 'email', ['email_address', 'user_email']);
    const pictureColumn = await this.getColumnMapping('profiles', 'picture_url', ['avatar_url', 'profile_image_url', 'image_url']);
    const bioColumn = await this.getColumnMapping('profiles', 'bio', ['about', 'description']);
    const usernameColumn = await this.getColumnMapping('profiles', 'username', ['handle', 'user_name']);
    const nameColumn = await this.getColumnMapping('profiles', 'name', ['display_name', 'full_name']);

    // Build profile data with only columns that exist
    const profileData: any = {
      id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add email field if column exists and data provided
    if (emailColumn && userData.email) {
      profileData[emailColumn] = userData.email;
    } else if (userData.email) {
      Logger.debug(`Email field not found in profiles table - skipping email`);
    }

    // Add required fields with fallbacks
    if (nameColumn) {
      profileData[nameColumn] = userData.name;
    } else {
      profileData.name = userData.name; // fallback
    }

    // Add optional fields only if columns exist and data provided
    if (pictureColumn && userData.picture_url) {
      profileData[pictureColumn] = userData.picture_url;
    } else if (userData.picture_url) {
      // Log missing column but don't fail
      Logger.debug(`Picture field not found in profiles table - skipping avatar`);
    }
    
    if (bioColumn && userData.bio) {
      profileData[bioColumn] = userData.bio;
    } else if (userData.bio) {
      Logger.debug(`Bio field not found in profiles table - skipping bio`);
    }
    
    if (usernameColumn && userData.username) {
      profileData[usernameColumn] = userData.username;
    } else if (userData.username) {
      Logger.debug(`Username field not found in profiles table - skipping username`);
    }

    // Create profile
    const { error: profileError } = await this.client
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      // Enhanced error reporting with schema introspection hints
      let errorMsg = `Profile creation failed: ${profileError.message}`;
      
      if (profileError.message.includes('column')) {
        // Use comprehensive schema validation for better error messages
        const schemaValidation = await this.validateTableSchema('profiles', {
          email: ['email', 'email_address', 'user_email'],
          name: ['name', 'display_name', 'full_name', 'username'],
          picture: ['picture_url', 'avatar_url', 'profile_image_url', 'image_url'],
          bio: ['bio', 'about', 'description'],
          username: ['username', 'handle', 'user_name']
        });
        
        errorMsg += `\n\nSchema Analysis:`;
        errorMsg += `\n  Available columns: ${schemaValidation.availableColumns.join(', ')}`;
        
        if (schemaValidation.suggestions.length > 0) {
          errorMsg += `\n\nMapping suggestions:`;
          schemaValidation.suggestions.forEach(suggestion => {
            errorMsg += `\n  - ${suggestion}`;
          });
        }
        
        errorMsg += `\n\nCurrent mappings:`;
        if (emailColumn) errorMsg += `\n  - Email: '${emailColumn}' ✅`;
        if (nameColumn) errorMsg += `\n  - Name: '${nameColumn}' ✅`;
        if (pictureColumn) errorMsg += `\n  - Picture: '${pictureColumn}' ✅`;
        if (bioColumn) errorMsg += `\n  - Bio: '${bioColumn}' ✅`;
        if (usernameColumn) errorMsg += `\n  - Username: '${usernameColumn}' ✅`;
        
        errorMsg += `\n\nTo fix: Update your config schema.userTable fields to match your database columns.`;
      }
      
      return { id: '', success: false, error: errorMsg };
    }

    return { id: userId, success: true };
  }

  /**
   * Check if we can create additional personal accounts based on MakerKit constraints
   */
  private async checkPersonalAccountConstraints(): Promise<{
    canCreate: boolean;
    reason: string;
    existingCount: number;
    maxAllowed: number;
  }> {
    try {
      // Check if we can detect the unique_personal_account constraint
      const hasConstraint = await this.detectUniquePersonalAccountConstraint();
      
      if (!hasConstraint) {
        // No constraint detected, allow creation
        return {
          canCreate: true,
          reason: 'No personal account constraints detected',
          existingCount: 0,
          maxAllowed: Infinity
        };
      }

      // Count existing personal accounts
      const { data: existingAccounts, error } = await this.client
        .from('accounts')
        .select('id')
        .eq('is_personal_account', true);

      if (error) {
        Logger.warn('Failed to check existing personal accounts:', error);
        // If we can't check, allow creation but warn
        return {
          canCreate: true,
          reason: 'Unable to verify constraint limits',
          existingCount: 0,
          maxAllowed: -1
        };
      }

      const existingCount = existingAccounts?.length || 0;
      
      // MakerKit typically allows 1 personal account per workspace
      // This is a common pattern we've observed
      const maxAllowed = 1;

      if (existingCount >= maxAllowed) {
        return {
          canCreate: false,
          reason: 'MakerKit unique_personal_account constraint limit reached',
          existingCount,
          maxAllowed
        };
      }

      return {
        canCreate: true,
        reason: 'Within personal account limits',
        existingCount,
        maxAllowed
      };

    } catch (error: any) {
      Logger.warn('Error checking personal account constraints:', error);
      // If constraint checking fails, allow creation but with warning
      return {
        canCreate: true,
        reason: 'Constraint checking failed, proceeding with caution',
        existingCount: -1,
        maxAllowed: -1
      };
    }
  }

  /**
   * Detect if the unique_personal_account constraint exists
   */
  private async detectUniquePersonalAccountConstraint(): Promise<boolean> {
    try {
      // Try to query the constraint from the information schema
      const { data, error } = await this.client
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'accounts')
        .ilike('constraint_name', '%unique_personal_account%');

      if (error) {
        Logger.debug('Failed to query constraints from information_schema:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      Logger.debug('Error detecting unique_personal_account constraint:', error);
      return false;
    }
  }

  /**
   * Get the appropriate table name for setups/content based on schema
   */
  getSetupsTableName(): string {
    if (!this.schemaInfo) {
      throw new Error('Schema not detected. Call detectSchema() first.');
    }

    // Look for common alternatives to 'setups'
    const possibleTables = ['setups', 'posts', 'content', 'projects', 'items'];
    
    // For now, default to 'setups' but in the future we could detect
    // which table is most appropriate
    return 'setups';
  }

  /**
   * Get the appropriate foreign key for user relationships
   */
  getUserForeignKey(): string {
    // Check config override first
    if (this.configOverride?.schema?.setupsTable?.userField) {
      return this.configOverride.schema.setupsTable.userField;
    }
    
    // Check for MakerKit patterns - they use account_id for user references
    if (this.hasMakerKitPattern()) {
      return 'account_id';
    }
    
    const strategy = this.getUserCreationStrategy();
    
    switch (strategy) {
      case 'simple-accounts':
        return 'account_id';
      case 'makerkit-profiles':
      case 'custom-profiles':
        return 'user_id';
      default:
        return 'account_id';
    }
  }
  
  /**
   * Detect if this is a MakerKit schema pattern
   */
  private hasMakerKitPattern(): boolean {
    // If we detect accounts table as primary user table, it's likely MakerKit
    const primaryTable = this.schemaInfo?.primaryUserTable;
    return primaryTable === 'accounts';
  }

  /**
   * Detect MakerKit version based on table patterns and schema structure
   */
  private async detectMakerKitVersion(tables: {
    hasAccounts: boolean;
    hasMemberships: boolean;
    hasSubscriptions: boolean;
    hasRoles: boolean;
    hasInvitations: boolean;
    hasNotifications: boolean;
    hasRolePermissions: boolean;
    hasBillingCustomers: boolean;
    hasGearItems: boolean;
    hasReviews: boolean;
  }): Promise<'v1' | 'v2' | 'v3' | 'custom' | 'none'> {
    const { hasAccounts, hasMemberships, hasSubscriptions, hasRoles, hasInvitations, hasNotifications, hasRolePermissions, hasBillingCustomers, hasGearItems, hasReviews } = tables;
    
    // No MakerKit if no accounts table
    if (!hasAccounts) {
      return 'none';
    }
    
    // Check for v3 indicators (latest MakerKit with comprehensive feature set)
    if (hasAccounts && hasMemberships && hasSubscriptions && hasRoles && hasInvitations && hasNotifications && hasRolePermissions && hasBillingCustomers) {
      // Check for v3-specific account structure
      const hasAdvancedAccountFields = await this.checkAccountFields([
        'primary_owner_user_id', 'slug', 'is_personal_account', 'public_data'
      ]);
      
      if (hasAdvancedAccountFields) {
        Logger.debug('Detected MakerKit v3 pattern with full feature set including role_permissions and billing_customers');
        return 'v3';
      }
    }
    
    // Check for v2 indicators (mid-version with core multi-tenancy)
    // Enhanced detection for MakerKit v2 based on bug report patterns
    if (hasAccounts && hasMemberships && hasSubscriptions && hasRoles && (hasRolePermissions || hasInvitations)) {
      const hasV2AccountFields = await this.checkAccountFields([
        'primary_owner_user_id', 'is_personal_account'
      ]);
      
      if (hasV2AccountFields) {
        Logger.debug('Detected MakerKit v2 pattern with multi-tenancy and role permissions');
        return 'v2';
      }
    }
    
    // Check for v1 indicators (basic MakerKit with accounts and memberships)
    if (hasAccounts && hasMemberships) {
      Logger.debug('Detected MakerKit v1 pattern with basic accounts');
      return 'v1';
    }
    
    // Has accounts but not standard MakerKit pattern
    if (hasAccounts) {
      Logger.debug('Detected custom accounts pattern (non-MakerKit)');
      return 'custom';
    }
    
    return 'none';
  }
  
  /**
   * Check if specific fields exist in the accounts table
   */
  private async checkAccountFields(fields: string[]): Promise<boolean> {
    try {
      const selectFields = fields.join(', ');
      const { error } = await this.client
        .from('accounts')
        .select(selectFields)
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }
  
  /**
   * Detect custom tables beyond standard MakerKit schema
   */
  private async detectCustomTables(standardTables: string[]): Promise<string[]> {
    try {
      // Fallback: try common custom table names since we can't easily query information_schema
      const commonCustomTables = [
        'setups', 'gear', 'base_templates', 'trips', 'modifications',
        'posts', 'media_attachments', 'conversations', 'messages',
        'user_preferences', 'audit_logs', 'analytics_events'
      ];
      
      const customTables = [];
      for (const table of commonCustomTables) {
        if (await this.tableExists(table) && !standardTables.includes(table)) {
          customTables.push(table);
        }
      }
      
      return customTables;
    } catch (error) {
      Logger.debug('Custom table detection failed:', error);
      return [];
    }
  }
  
  /**
   * Detect table relationships for better association intelligence
   */
  private async detectTableRelationships(): Promise<TableRelationship[]> {
    const relationships: TableRelationship[] = [];
    
    try {
      // Common relationship patterns to check
      const commonRelationships = [
        { from: 'setups', fromCol: 'user_id', to: 'auth.users', toCol: 'id' },
        { from: 'setups', fromCol: 'account_id', to: 'accounts', toCol: 'id' },
        { from: 'posts', fromCol: 'author_id', to: 'accounts', toCol: 'id' },
        { from: 'media_attachments', fromCol: 'setup_id', to: 'setups', toCol: 'id' },
        { from: 'setup_gear_items', fromCol: 'setup_id', to: 'setups', toCol: 'id' },
        { from: 'memberships', fromCol: 'account_id', to: 'accounts', toCol: 'id' },
        { from: 'memberships', fromCol: 'user_id', to: 'auth.users', toCol: 'id' }
      ];
      
      for (const rel of commonRelationships) {
        const fromExists = await this.tableExists(rel.from);
        const toExists = await this.tableExists(rel.to.replace('auth.', ''));
        
        if (fromExists && toExists) {
          // Try to detect the relationship by checking column existence
          const hasColumn = await this.columnExists(rel.from, rel.fromCol);
          
          if (hasColumn) {
            relationships.push({
              fromTable: rel.from,
              fromColumn: rel.fromCol,
              toTable: rel.to,
              toColumn: rel.toCol,
              relationshipType: 'one_to_many', // Default assumption
              cascadeDelete: false // Default assumption
            });
          }
        }
      }
      
      Logger.debug(`Detected ${relationships.length} table relationships`);
      return relationships;
    } catch (error) {
      Logger.debug('Relationship detection failed:', error);
      return [];
    }
  }
  
  /**
   * Check if a column exists in a table
   */
  async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(tableName)
        .select(columnName)
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get actual column names from database schema
   */
  private async getTableColumns(tableName: string): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');
      
      if (error) {
        // Fallback: try to get columns by doing a select with limit 0
        const { error: selectError } = await this.client
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (selectError && selectError.message.includes('column')) {
          Logger.debug(`Unable to introspect ${tableName} columns: ${selectError.message}`);
          return [];
        }
        
        return [];
      }
      
      return data?.map(row => row.column_name as string) || [];
    } catch (error) {
      Logger.debug(`Schema introspection failed for ${tableName}: ${error}`);
      return [];
    }
  }

  /**
   * Validate that required columns exist for a table and provide helpful error messages
   */
  async validateTableSchema(tableName: string, requiredFields: Record<string, string[]>): Promise<{
    valid: boolean;
    missingFields: string[];
    availableColumns: string[];
    suggestions: string[];
  }> {
    const availableColumns = await this.getTableColumns(tableName);
    const missingFields: string[] = [];
    const suggestions: string[] = [];
    
    for (const [fieldName, possibleColumns] of Object.entries(requiredFields)) {
      const foundColumn = possibleColumns.find(col => availableColumns.includes(col));
      if (!foundColumn) {
        missingFields.push(fieldName);
        
        // Find similar column names as suggestions
        const similarCols = availableColumns.filter(col => 
          possibleColumns.some(possible => 
            col.toLowerCase().includes(possible.toLowerCase()) || 
            possible.toLowerCase().includes(col.toLowerCase())
          )
        );
        
        if (similarCols.length > 0) {
          suggestions.push(`For ${fieldName}, consider mapping to: ${similarCols.join(', ')}`);
        }
      }
    }
    
    return {
      valid: missingFields.length === 0,
      missingFields,
      availableColumns,
      suggestions
    };
  }
  
  /**
   * Detect framework type based on comprehensive analysis
   */
  private detectFrameworkTypeEnhanced(analysis: {
    makerkitVersion: string;
    hasGear: boolean;
    hasBaseTemplates: boolean;
    hasSetups: boolean;
    hasTrips: boolean;
    customTables: string[];
  }): 'makerkit' | 'simple' | 'wildernest' | 'custom' {
    const { makerkitVersion, hasGear, hasBaseTemplates, hasSetups, hasTrips, customTables } = analysis;
    
    // Check for Wildernest pattern (MakerKit + outdoor platform tables)
    if (makerkitVersion !== 'none' && hasGear && hasBaseTemplates && hasSetups) {
      Logger.debug('Detected Wildernest-style outdoor platform');
      return 'wildernest';
    }
    
    // Standard MakerKit patterns
    if (makerkitVersion === 'v3' || makerkitVersion === 'v2' || makerkitVersion === 'v1') {
      Logger.debug(`Detected MakerKit ${makerkitVersion} framework`);
      return 'makerkit';
    }
    
    // Simple framework (basic Supabase without MakerKit)
    if (makerkitVersion === 'none' && customTables.length < 3) {
      Logger.debug('Detected simple Supabase framework');
      return 'simple';
    }
    
    // Custom framework with significant customizations
    Logger.debug('Detected custom framework with extensive customizations');
    return 'custom';
  }
  
  /**
   * Analyze asset compatibility for hybrid seeding
   */
  private async analyzeAssetCompatibility(tables: {
    hasMediaAttachments: boolean;
    hasPosts: boolean;
    hasSetups: boolean;
    customTables: string[];
  }): Promise<AssetCompatibilityInfo> {
    const { hasMediaAttachments, hasPosts, hasSetups, customTables } = tables;
    
    const compatibility: AssetCompatibilityInfo = {
      supportsImages: false,
      supportsMarkdown: false,
      supportsJson: false,
      contentTables: [],
      userContentRelationships: [],
      mediaStoragePattern: 'url_only'
    };
    
    // Check for image support
    if (hasMediaAttachments) {
      compatibility.supportsImages = true;
      compatibility.mediaStoragePattern = 'supabase_storage';
    }
    
    // Check for markdown content support
    if (hasPosts) {
      compatibility.supportsMarkdown = await this.checkMarkdownSupport('posts');
      compatibility.contentTables.push('posts');
    }
    
    if (hasSetups) {
      const setupMarkdown = await this.checkMarkdownSupport('setups');
      if (setupMarkdown) {
        compatibility.supportsMarkdown = true;
      }
      compatibility.contentTables.push('setups');
    }
    
    // Check custom tables for content patterns
    for (const table of customTables) {
      const hasContent = await this.checkContentColumns(table);
      if (hasContent) {
        compatibility.contentTables.push(table);
      }
    }
    
    // JSON support is generally available in Postgres
    compatibility.supportsJson = true;
    
    Logger.debug('Asset compatibility analysis:', compatibility);
    return compatibility;
  }
  
  /**
   * Check if a table supports markdown content
   */
  private async checkMarkdownSupport(tableName: string): Promise<boolean> {
    const markdownColumns = ['content', 'description', 'body', 'markdown', 'readme'];
    
    for (const column of markdownColumns) {
      if (await this.columnExists(tableName, column)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a table has content-related columns
   */
  private async checkContentColumns(tableName: string): Promise<boolean> {
    const contentColumns = ['title', 'content', 'description', 'body', 'name'];
    
    for (const column of contentColumns) {
      if (await this.columnExists(tableName, column)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get comprehensive schema information for hybrid seeding
   */
  getHybridSeedingInfo(): {
    compatibilityLevel: 'basic' | 'intermediate' | 'advanced';
    recommendedAssetTypes: string[];
    suggestedAssociations: string[];
    frameworkSpecificTips: string[];
  } {
    if (!this.schemaInfo) {
      throw new Error('Schema not detected. Call detectSchema() first.');
    }
    
    const info = this.schemaInfo;
    const tips: string[] = [];
    const assets: string[] = [];
    const associations: string[] = [];
    
    // Determine compatibility level
    let compatibilityLevel: 'basic' | 'intermediate' | 'advanced' = 'basic';
    
    if (info.makerkitVersion !== 'none') {
      compatibilityLevel = 'intermediate';
      tips.push('MakerKit detected - standard test users will be created automatically');
      tips.push('Team and personal accounts supported');
    }
    
    if (info.frameworkType === 'wildernest' || info.customTables.length > 5) {
      compatibilityLevel = 'advanced';
      tips.push('Complex schema detected - consider using phase-based seeding');
    }
    
    // Recommend asset types based on compatibility
    if (info.assetCompatibility.supportsImages) {
      assets.push('images');
      associations.push('images_to_content');
    }
    
    if (info.assetCompatibility.supportsMarkdown) {
      assets.push('markdown');
      associations.push('posts_to_users');
    }
    
    if (info.assetCompatibility.supportsJson) {
      assets.push('json');
    }
    
    // Framework-specific recommendations
    if (info.frameworkType === 'wildernest') {
      assets.push('gear_catalog', 'setup_images');
      associations.push('gear_to_setups', 'images_to_setups');
      tips.push('Outdoor platform detected - gear and setup assets recommended');
    }
    
    return {
      compatibilityLevel,
      recommendedAssetTypes: assets,
      suggestedAssociations: associations,
      frameworkSpecificTips: tips
    };
  }

  /**
   * Detect enum types in a table column
   */
  async detectEnumValues(tableName: string, columnName: string): Promise<string[] | null> {
    try {
      // Try to get enum values from PostgreSQL system catalogs
      const { data: enumData, error } = await this.client
        .rpc('get_column_enum_values', {
          table_name: tableName,
          column_name: columnName
        });

      if (!error && enumData && Array.isArray(enumData)) {
        return enumData;
      }

      // Fallback: Try querying pg_enum directly
      const { data: pgEnumData, error: pgEnumError } = await this.client
        .from('information_schema.columns')
        .select('udt_name')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .single();

      if (!pgEnumError && pgEnumData?.udt_name) {
        const { data: enumValues, error: enumError } = await this.client
          .rpc('get_enum_values', {
            enum_name: pgEnumData.udt_name
          });

        if (!enumError && enumValues && Array.isArray(enumValues)) {
          return enumValues.map((row: any) => row.enumlabel || row);
        }
      }

      return null;
    } catch (error) {
      Logger.debug(`Error detecting enum values for ${tableName}.${columnName}:`, error);
      return null;
    }
  }

  /**
   * Check if a table uses enum-based categories vs FK-based categories
   */
  async detectCategoryStrategy(tableName: string): Promise<{
    strategy: 'enum' | 'fk' | 'none';
    categoryColumn?: string;
    enumValues?: string[];
    categoryTableName?: string;
  }> {
    try {
      // Common category column names to check
      const categoryColumns = ['category', 'category_type', 'outdoor_category', 'gear_category'];
      
      for (const columnName of categoryColumns) {
        // Check if column exists
        const columnExists = await this.columnExists(tableName, columnName);
        if (!columnExists) continue;

        // Check if it's an enum
        const enumValues = await this.detectEnumValues(tableName, columnName);
        if (enumValues && enumValues.length > 0) {
          Logger.debug(`Detected enum category strategy for ${tableName}.${columnName}:`, enumValues);
          return {
            strategy: 'enum',
            categoryColumn: columnName,
            enumValues
          };
        }
      }

      // Check for FK-based category strategy
      const categoryFkColumns = ['category_id', 'gear_category_id', 'setup_category_id'];
      for (const columnName of categoryFkColumns) {
        const columnExists = await this.columnExists(tableName, columnName);
        if (columnExists) {
          // Try to determine the referenced table
          const categoryTableName = this.inferCategoryTableName(columnName);
          const categoryTableExists = await this.tableExists(categoryTableName);
          
          if (categoryTableExists) {
            Logger.debug(`Detected FK category strategy for ${tableName}.${columnName} -> ${categoryTableName}`);
            return {
              strategy: 'fk',
              categoryColumn: columnName,
              categoryTableName
            };
          }
        }
      }

      return { strategy: 'none' };
    } catch (error) {
      Logger.debug(`Error detecting category strategy for ${tableName}:`, error);
      return { strategy: 'none' };
    }
  }

  /**
   * Infer category table name from FK column name
   */
  private inferCategoryTableName(fkColumnName: string): string {
    if (fkColumnName.includes('gear_category')) return 'gear_categories';
    if (fkColumnName.includes('setup_category')) return 'setup_categories';
    if (fkColumnName.includes('category')) return 'categories';
    return 'categories'; // Default fallback
  }

  /**
   * Determine the framework type based on detected schema
   */
  private getFrameworkType(schemaInfo: SchemaInfo, hasMemberships: boolean): 'simple' | 'makerkit' | 'custom' {
    // Check for MakerKit patterns first
    if (schemaInfo.hasAccounts && hasMemberships) {
      return 'makerkit';
    }
    
    if (schemaInfo.hasProfiles && schemaInfo.hasOrganizations) {
      return 'makerkit';
    }
    
    // Check for simple framework patterns
    if (schemaInfo.hasProfiles && !schemaInfo.hasAccounts) {
      return 'simple';
    }
    
    // Default to custom
    return 'custom';
  }
}