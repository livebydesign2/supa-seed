/**
 * MakerKit Compatibility Layer
 * Ensures seamless integration with all MakerKit versions and patterns
 * Phase 1, Checkpoint A2
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import { SchemaAdapter, SchemaInfo } from '../../core/schema-adapter';

type SupabaseClient = ReturnType<typeof createClient>;

export interface MakerKitCompatibilityConfig {
  // Core MakerKit settings
  standardTestUsers: boolean;
  customTestEmails?: string[];
  preserveAuthFlow: boolean;
  preserveRLS: boolean;
  
  // Version-specific behavior
  makerkitVersion?: 'v1' | 'v2' | 'v3' | 'auto';
  teamAccountCreation: boolean;
  personalAccountCreation: boolean;
  
  // Advanced settings
  roleHierarchy: boolean;
  subscriptionSupport: boolean;
  notificationSystem: boolean;
  
  // Override settings for custom implementations
  overrides?: {
    primaryUserTable?: 'accounts' | 'profiles' | 'users';
    accountsTable?: {
      useSlug?: boolean;
      usePersonalAccounts?: boolean;
      customFields?: Record<string, any>;
    };
    testUserPasswords?: {
      default?: string;
      perUser?: Record<string, string>;
    };
  };
}

export interface StandardTestUser {
  email: string;
  name: string;
  username: string;
  role: 'admin' | 'owner' | 'member' | 'custom' | 'super-admin';
  password: string;
  metadata?: Record<string, any>;
}

export interface MakerKitValidationResult {
  isValid: boolean;
  compatibility: 'full' | 'partial' | 'custom' | 'incompatible';
  issues: string[];
  recommendations: string[];
  detectedVersion: 'v1' | 'v2' | 'v3' | 'custom' | 'none';
}

export class MakerKitCompatibilityLayer {
  private client: SupabaseClient;
  private schemaAdapter: SchemaAdapter;
  private config: MakerKitCompatibilityConfig;
  private schemaInfo: SchemaInfo | null = null;

  constructor(
    client: SupabaseClient, 
    config: MakerKitCompatibilityConfig,
    schemaAdapter?: SchemaAdapter
  ) {
    this.client = client;
    this.config = config;
    this.schemaAdapter = schemaAdapter || new SchemaAdapter(client);
  }

  /**
   * Initialize and validate MakerKit compatibility
   */
  async initialize(): Promise<MakerKitValidationResult> {
    Logger.info('🔧 Initializing MakerKit compatibility layer...');
    
    // Detect schema and get compatibility info
    this.schemaInfo = await this.schemaAdapter.detectSchema();
    
    // Validate compatibility
    const validation = await this.validateMakerKitCompatibility();
    
    // Auto-configure based on detected version if needed
    if (this.config.makerkitVersion === 'auto') {
      this.config.makerkitVersion = this.schemaInfo.makerkitVersion as any;
      Logger.info(`🎯 Auto-detected MakerKit version: ${this.config.makerkitVersion}`);
    }
    
    Logger.info(`✅ MakerKit compatibility: ${validation.compatibility}`);
    return validation;
  }

  /**
   * Get the standard MakerKit test users based on version and config
   */
  getStandardTestUsers(): StandardTestUser[] {
    const baseUsers: StandardTestUser[] = [
      {
        email: 'test@makerkit.dev',
        name: 'Test User',
        username: 'test_user',
        role: 'admin',
        password: this.getPasswordForUser('test@makerkit.dev'),
        metadata: { 
          role: 'admin',
          isTestUser: true,
          createdBy: 'supa-seed-makerkit-compatibility'
        }
      },
      {
        email: 'owner@makerkit.dev',
        name: 'Owner User',
        username: 'owner_user',
        role: 'owner',
        password: this.getPasswordForUser('owner@makerkit.dev'),
        metadata: { 
          role: 'owner',
          isTestUser: true,
          canCreateTeams: true,
          createdBy: 'supa-seed-makerkit-compatibility'
        }
      },
      {
        email: 'member@makerkit.dev',
        name: 'Member User',
        username: 'member_user',
        role: 'member',
        password: this.getPasswordForUser('member@makerkit.dev'),
        metadata: { 
          role: 'member',
          isTestUser: true,
          createdBy: 'supa-seed-makerkit-compatibility'
        }
      },
      {
        email: 'custom@makerkit.dev',
        name: 'Custom User',
        username: 'custom_user',
        role: 'custom',
        password: this.getPasswordForUser('custom@makerkit.dev'),
        metadata: { 
          role: 'custom',
          isTestUser: true,
          customizable: true,
          createdBy: 'supa-seed-makerkit-compatibility'
        }
      },
      {
        email: 'super-admin@makerkit.dev',
        name: 'Super Admin',
        username: 'super_admin',
        role: 'super-admin',
        password: this.getPasswordForUser('super-admin@makerkit.dev'),
        metadata: { 
          role: 'super-admin',
          isTestUser: true,
          hasSuperAdminAccess: true,
          createdBy: 'supa-seed-makerkit-compatibility'
        }
      }
    ];

    // Add custom test emails if specified
    const customUsers: StandardTestUser[] = [];
    if (this.config.customTestEmails) {
      this.config.customTestEmails.forEach((email, index) => {
        customUsers.push({
          email,
          name: `Custom User ${index + 1}`,
          username: `custom_${index + 1}`,
          role: 'custom',
          password: this.getPasswordForUser(email),
          metadata: {
            role: 'custom',
            isTestUser: true,
            isCustomEmail: true,
            createdBy: 'supa-seed-makerkit-compatibility'
          }
        });
      });
    }

    return [...baseUsers, ...customUsers];
  }

  /**
   * Create standard test users with proper MakerKit integration
   */
  async createStandardTestUsers(): Promise<{ 
    created: StandardTestUser[], 
    failed: Array<{ user: StandardTestUser, error: string }> 
  }> {
    const users = this.getStandardTestUsers();
    const created: StandardTestUser[] = [];
    const failed: Array<{ user: StandardTestUser, error: string }> = [];

    Logger.info(`👥 Creating ${users.length} standard MakerKit test users...`);

    for (const user of users) {
      try {
        Logger.info(`  Creating: ${user.email} (${user.role})`);
        
        const result = await this.createMakerKitUser(user);
        
        if (result.success) {
          created.push(user);
          Logger.info(`  ✅ Created: ${user.email}`);
        } else {
          failed.push({ user, error: result.error || 'Unknown error' });
          Logger.warn(`  ⚠️  Failed: ${user.email} - ${result.error}`);
        }
      } catch (error: any) {
        failed.push({ user, error: error.message });
        Logger.error(`  ❌ Error creating ${user.email}:`, error);
      }
    }

    Logger.info(`✅ Created ${created.length}/${users.length} standard test users`);
    
    if (failed.length > 0) {
      Logger.warn(`⚠️  ${failed.length} users failed to create`);
    }

    return { created, failed };
  }

  /**
   * Create a single MakerKit user with proper auth flow and account creation
   */
  private async createMakerKitUser(user: StandardTestUser): Promise<{
    success: boolean;
    userId?: string;
    error?: string;
  }> {
    if (!this.schemaInfo) {
      throw new Error('Schema not initialized. Call initialize() first.');
    }

    const userId = crypto.randomUUID();

    try {
      // Step 1: Create auth user (this is always required)
      const { error: authError } = await this.client.auth.admin.createUser({
        id: userId,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          username: user.username,
          role: user.role,
          ...user.metadata
        }
      });

      if (authError) {
        return { success: false, error: `Auth creation failed: ${authError.message}` };
      }

      // Step 2: Let MakerKit triggers handle account creation, or create manually if needed
      const accountResult = await this.handleAccountCreation(userId, user);
      if (!accountResult.success) {
        return { success: false, error: accountResult.error };
      }

      // Step 3: Create team account if configured and user has appropriate role
      if (this.config.teamAccountCreation && (user.role === 'owner' || user.role === 'admin')) {
        await this.createTeamAccountForUser(userId, user);
      }

      // Step 4: Set up role hierarchy if supported
      if (this.config.roleHierarchy && this.schemaInfo.makerkitVersion !== 'none') {
        await this.setupUserRoles(userId, user);
      }

      return { success: true, userId };

    } catch (error: any) {
      Logger.error(`Failed to create MakerKit user ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle account creation based on MakerKit version and configuration
   */
  private async handleAccountCreation(userId: string, user: StandardTestUser): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.schemaInfo) {
      return { success: false, error: 'Schema not initialized' };
    }

    try {
      // For modern MakerKit (v2, v3), triggers should handle account creation
      if (this.schemaInfo.makerkitVersion === 'v2' || this.schemaInfo.makerkitVersion === 'v3') {
        // Wait a moment for triggers to execute
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verify the account was created by trigger
        const { data: account, error } = await this.client
          .from('accounts')
          .select('id, primary_owner_user_id')
          .eq('primary_owner_user_id', userId)
          .eq('is_personal_account', true)
          .single();

        if (!error && account) {
          Logger.debug(`Account created by MakerKit trigger for ${user.email}`);
          return { success: true };
        }

        Logger.debug(`Trigger didn't create account for ${user.email}, creating manually`);
      }

      // Fallback: Create account manually using schema adapter
      const result = await this.schemaAdapter.createUserForSchema({
        id: userId,
        email: user.email,
        name: user.name,
        username: user.username,
        bio: this.generateUserBio(user),
        picture_url: this.generateProfileImage(user.name)
      });

      if (result.success) {
        Logger.debug(`Manual account creation successful for ${user.email}`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }

    } catch (error: any) {
      Logger.error(`Account creation failed for ${user.email}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create team account for users with appropriate roles
   */
  private async createTeamAccountForUser(userId: string, user: StandardTestUser): Promise<void> {
    if (!this.schemaInfo?.hasAccounts) {
      Logger.debug('No accounts table found, skipping team account creation');
      return;
    }

    try {
      const teamName = `${user.name}'s Team`;
      const { error } = await this.client
        .from('accounts')
        .insert({
          id: crypto.randomUUID(),
          name: teamName,
          primary_owner_user_id: userId,
          is_personal_account: false,
          slug: `${user.username}-team`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        Logger.warn(`Failed to create team account for ${user.email}:`, error.message);
      } else {
        Logger.debug(`Created team account "${teamName}" for ${user.email}`);
      }
    } catch (error: any) {
      Logger.warn(`Team account creation error for ${user.email}:`, error);
    }
  }

  /**
   * Set up user roles in the role hierarchy system
   */
  private async setupUserRoles(userId: string, user: StandardTestUser): Promise<void> {
    if (!this.schemaInfo?.hasAccounts) return;

    try {
      // This would interact with the roles/memberships system
      // Implementation depends on specific MakerKit version
      Logger.debug(`Setting up roles for ${user.email} with role: ${user.role}`);
      
      // For now, roles are handled through user metadata and account memberships
      // Full implementation would depend on the specific role system in place
      
    } catch (error: any) {
      Logger.warn(`Role setup failed for ${user.email}:`, error);
    }
  }

  /**
   * Validate MakerKit compatibility and provide recommendations
   */
  private async validateMakerKitCompatibility(): Promise<MakerKitValidationResult> {
    if (!this.schemaInfo) {
      return {
        isValid: false,
        compatibility: 'incompatible',
        issues: ['Schema information not available'],
        recommendations: ['Run schema detection first'],
        detectedVersion: 'none'
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];
    const detectedVersion = this.schemaInfo.makerkitVersion;

    // Check for basic MakerKit requirements
    if (!this.schemaInfo.hasAccounts && this.config.standardTestUsers) {
      issues.push('No accounts table found but standard test users requested');
      recommendations.push('Disable standard test users or add accounts table');
    }

    // Check version-specific requirements
    if (this.config.teamAccountCreation && detectedVersion === 'v1') {
      issues.push('Team account creation requested but MakerKit v1 has limited support');
      recommendations.push('Upgrade to MakerKit v2+ for full team account support');
    }

    if (this.config.subscriptionSupport && !this.schemaInfo.hasAccounts) {
      issues.push('Subscription support requested but no subscription system detected');
      recommendations.push('Add subscription tables or disable subscription support');
    }

    // Determine compatibility level
    let compatibility: 'full' | 'partial' | 'custom' | 'incompatible' = 'full';
    
    if (issues.length > 3) {
      compatibility = 'incompatible';
    } else if (issues.length > 0 || detectedVersion === 'custom') {
      compatibility = 'partial';
    } else if (detectedVersion === 'none') {
      compatibility = 'custom';
    }

    // Add positive recommendations
    if (detectedVersion !== 'none') {
      recommendations.push(`MakerKit ${detectedVersion} detected - full compatibility available`);
    }

    if (this.schemaInfo.frameworkType === 'wildernest') {
      recommendations.push('Wildernest platform detected - consider using outdoor platform templates');
    }

    return {
      isValid: issues.length === 0,
      compatibility,
      issues,
      recommendations,
      detectedVersion
    };
  }

  /**
   * Get password for a user (from config overrides or default)
   */
  private getPasswordForUser(email: string): string {
    const overrides = this.config.overrides?.testUserPasswords;
    
    if (overrides?.perUser?.[email]) {
      return overrides.perUser[email];
    }
    
    if (overrides?.default) {
      return overrides.default;
    }
    
    return 'password123'; // Default password
  }

  /**
   * Generate appropriate user bio based on role and config
   */
  private generateUserBio(user: StandardTestUser): string {
    const roleBios = {
      admin: `Administrator user for testing and development. Has full system access and can manage all aspects of the application.`,
      owner: `Team owner with full account management privileges. Can create teams, invite members, and manage subscriptions.`,
      member: `Team member with standard access permissions. Can collaborate on team projects and access shared resources.`,
      custom: `Custom test user for specific testing scenarios. Permissions and access can be configured as needed.`,
      'super-admin': `Super administrator with system-wide access. Used for testing administrative functions and system management.`
    };

    return roleBios[user.role] || 'Test user created by supa-seed MakerKit compatibility layer.';
  }

  /**
   * Generate profile image URL for user
   */
  private generateProfileImage(name: string): string {
    const [firstName, lastName] = name.split(' ');
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + '+' + (lastName || 'User'))}&background=random&bold=true&size=200`;
  }

  /**
   * Get comprehensive compatibility information
   */
  getCompatibilityInfo(): {
    detectedVersion: string;
    supportedFeatures: string[];
    recommendedSettings: Partial<MakerKitCompatibilityConfig>;
    limitations: string[];
  } {
    if (!this.schemaInfo) {
      throw new Error('Schema not initialized. Call initialize() first.');
    }

    const supportedFeatures: string[] = [];
    const limitations: string[] = [];
    const recommendedSettings: Partial<MakerKitCompatibilityConfig> = {};

    // Analyze supported features based on detected schema
    if (this.schemaInfo.hasAccounts) {
      supportedFeatures.push('Standard test users');
      supportedFeatures.push('Personal accounts');
      recommendedSettings.personalAccountCreation = true;
    }

    if (this.schemaInfo.makerkitVersion !== 'none') {
      supportedFeatures.push('MakerKit integration');
      supportedFeatures.push('Auth flow preservation');
      recommendedSettings.preserveAuthFlow = true;
      recommendedSettings.preserveRLS = true;
    }

    if (this.schemaInfo.makerkitVersion === 'v2' || this.schemaInfo.makerkitVersion === 'v3') {
      supportedFeatures.push('Team accounts');
      supportedFeatures.push('Role hierarchy');
      recommendedSettings.teamAccountCreation = true;
      recommendedSettings.roleHierarchy = true;
    }

    // Identify limitations
    if (this.schemaInfo.makerkitVersion === 'v1') {
      limitations.push('Limited team account support');
      limitations.push('Basic role system only');
    }

    if (this.schemaInfo.makerkitVersion === 'none') {
      limitations.push('No MakerKit-specific features available');
      limitations.push('Manual account management required');
    }

    return {
      detectedVersion: this.schemaInfo.makerkitVersion,
      supportedFeatures,
      recommendedSettings,
      limitations
    };
  }
}