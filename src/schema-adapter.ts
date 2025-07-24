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

  private async tableExists(tableName: string): Promise<boolean> {
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

    // Add optional fields if provided
    if (userData.username) accountData.username = userData.username;
    if (userData.bio) accountData.bio = userData.bio;
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

    const { error: accountError } = await this.client
      .from('accounts')
      .insert(accountData);

    if (accountError) {
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

    // Create profile
    const { error: profileError } = await this.client
      .from('profiles')
      .insert({
        id: userId,
        email: userData.email,
        display_name: userData.name,
        full_name: userData.name,
        avatar_url: userData.picture_url,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      return { id: '', success: false, error: `Profile creation failed: ${profileError.message}` };
    }

    // Try to create a personal account/team if the tables exist
    if (this.schemaInfo?.hasAccounts) {
      try {
        const { error: accountError } = await this.client
          .from('accounts')
          .insert({
            id: crypto.randomUUID(),
            name: `${userData.name}'s Account`,
            primary_owner_user_id: userId,
            slug: userData.username || userData.email.split('@')[0],
            is_personal_account: true,
          });
        
        // Don't fail if account creation fails, as it might not be required
        if (accountError) {
          console.warn('Account creation failed (non-critical):', accountError.message);
        }
      } catch (error) {
        console.warn('Account creation attempt failed (non-critical):', error);
      }
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

    // Create profile
    const { error: profileError } = await this.client
      .from('profiles')
      .insert({
        id: userId,
        email: userData.email,
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        avatar_url: userData.picture_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      return { id: '', success: false, error: `Profile creation failed: ${profileError.message}` };
    }

    return { id: userId, success: true };
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
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
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