import type { createClient } from '@supabase/supabase-js';
import { Logger } from './utils/logger';

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
}

export class SchemaAdapter {
  private schemaInfo: SchemaInfo | null = null;
  private configOverride?: {
    framework?: string;
    primaryUserTable?: 'accounts' | 'profiles' | 'users';
    schema?: any;
  };

  constructor(private client: SupabaseClient, configOverride?: any) {
    this.configOverride = configOverride;
  }

  /**
   * Detect the database schema and return compatibility info
   */
  async detectSchema(): Promise<SchemaInfo> {
    if (this.schemaInfo) {
      return this.schemaInfo;
    }

    console.log('🔍 Detecting database schema...');

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
    };

    // Check for various tables
    schemaInfo.hasAccounts = await this.tableExists('accounts');
    schemaInfo.hasProfiles = await this.tableExists('profiles');
    schemaInfo.hasSetups = await this.tableExists('setups');
    schemaInfo.hasCategories = await this.tableExists('categories');
    schemaInfo.hasTeams = await this.tableExists('teams');
    schemaInfo.hasOrganizations = await this.tableExists('organizations');
    
    // Check for additional Makerkit-specific tables
    const hasMemberships = await this.tableExists('memberships');
    const hasSubscriptions = await this.tableExists('subscriptions');

    // Check if auth.users has records (standard Supabase pattern)
    schemaInfo.hasUsers = await this.checkAuthUsers();

    // Determine account table structure with improved Makerkit detection
    if (schemaInfo.hasAccounts && hasMemberships) {
      // Strong indicator of Makerkit pattern
      schemaInfo.accountsTableStructure = 'makerkit';
    } else if (schemaInfo.hasAccounts) {
      const accountsStructure = await this.detectAccountsStructure();
      schemaInfo.accountsTableStructure = accountsStructure;
    }

    // Determine primary user table (prioritize config override)
    schemaInfo.primaryUserTable = this.determinePrimaryUserTable(schemaInfo);

    this.schemaInfo = schemaInfo;
    
    console.log('📋 Schema detected:', {
      primaryUserTable: schemaInfo.primaryUserTable,
      structure: schemaInfo.accountsTableStructure,
      hasProfiles: schemaInfo.hasProfiles,
      hasTeams: schemaInfo.hasTeams,
      hasMemberships,
      framework: this.getFrameworkType(schemaInfo, hasMemberships),
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
      const { error } = await this.client.from(tableName).select('*').limit(1);
      return !error;
    } catch {
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