import { SupabaseClient } from './types';

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

  constructor(private client: SupabaseClient) {}

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

    // Check if auth.users has records (standard Supabase pattern)
    schemaInfo.hasUsers = await this.checkAuthUsers();

    // Determine account table structure
    if (schemaInfo.hasAccounts) {
      const accountsStructure = await this.detectAccountsStructure();
      schemaInfo.accountsTableStructure = accountsStructure;
    }

    // Determine primary user table
    schemaInfo.primaryUserTable = this.determinePrimaryUserTable(schemaInfo);

    this.schemaInfo = schemaInfo;
    
    console.log('📋 Schema detected:', {
      primaryUserTable: schemaInfo.primaryUserTable,
      structure: schemaInfo.accountsTableStructure,
      hasProfiles: schemaInfo.hasProfiles,
      hasTeams: schemaInfo.hasTeams,
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

    if (this.schemaInfo.hasProfiles && this.schemaInfo.hasTeams) {
      return 'makerkit-profiles';
    } else if (this.schemaInfo.hasProfiles && this.schemaInfo.hasUsers) {
      return 'custom-profiles';
    } else {
      return 'simple-accounts';
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
      // Try to get table schema information
      const { data, error } = await this.client
        .from('accounts')
        .select('*')
        .limit(1);

      if (error) {
        // Check error message for clues about structure
        if (error.message.includes('primary_owner_user_id')) {
          return 'makerkit';
        }
        return 'custom';
      }

      // If we got data, we can't determine structure without actual records
      // Default to simple for now
      return 'simple';
    } catch {
      return 'custom';
    }
  }

  private determinePrimaryUserTable(schemaInfo: SchemaInfo): 'accounts' | 'profiles' | 'users' {
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

    // Create account record
    const { error: accountError } = await this.client
      .from('accounts')
      .insert({
        id: userId,
        email: userData.email,
        name: userData.name,
        username: userData.username,
        bio: userData.bio,
        picture_url: userData.picture_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (accountError) {
      return { id: '', success: false, error: `Account creation failed: ${accountError.message}` };
    }

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
}