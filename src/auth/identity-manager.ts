/**
 * Identity Manager for Epic 1: Universal MakerKit Core System
 * Manages auth.identities records for complete MakerKit authentication flows
 * Part of Task 1.1: Implement Auth.Identities Support
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface IdentityProvider {
  provider: 'email' | 'google' | 'github' | 'discord' | 'apple' | 'facebook' | 'twitter';
  providerId: string;
  metadata?: Record<string, any>;
}

export interface IdentityData {
  userId: string;
  provider: IdentityProvider['provider'];
  providerId: string;
  email?: string;
  providerMetadata?: Record<string, any>;
  lastSignInAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IdentityCreationResult {
  success: boolean;
  identity?: any;
  error?: string;
  warnings: string[];
}

export interface IdentityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class IdentityManager {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Create auth.identities record for complete MakerKit auth flow
   */
  async createIdentity(identityData: IdentityData): Promise<IdentityCreationResult> {
    const warnings: string[] = [];

    try {
      Logger.debug(`Creating identity for user ${identityData.userId} with provider ${identityData.provider}`);

      // Validate identity data
      const validation = this.validateIdentityData(identityData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Identity validation failed: ${validation.errors.join(', ')}`,
          warnings: validation.warnings
        };
      }

      warnings.push(...validation.warnings);

      // Check if identity already exists
      const existingIdentity = await this.findExistingIdentity(identityData.userId, identityData.provider);
      if (existingIdentity) {
        Logger.debug(`Identity already exists for user ${identityData.userId} with provider ${identityData.provider}`);
        return {
          success: true,
          identity: existingIdentity,
          warnings: [...warnings, 'Identity already exists - returning existing record']
        };
      }

      // Format identity record for auth.identities table
      const identityRecord = this.formatIdentityRecord(identityData);

      // Insert identity record
      const { data: identity, error } = await this.client
        .from('auth.identities')
        .insert(identityRecord)
        .select()
        .single();

      if (error) {
        // Handle common MakerKit identity constraints
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          Logger.warn(`Identity already exists for ${identityData.provider}:${identityData.providerId}`);
          const existing = await this.findExistingIdentity(identityData.userId, identityData.provider);
          return {
            success: true,
            identity: existing,
            warnings: [...warnings, 'Found existing identity record']
          };
        }

        throw new Error(`Failed to create identity: ${error.message}`);
      }

      Logger.success(`✅ Created identity for user ${identityData.userId} with provider ${identityData.provider}`);
      return {
        success: true,
        identity,
        warnings
      };

    } catch (error: any) {
      Logger.error(`Identity creation failed for user ${identityData.userId}:`, error);
      return {
        success: false,
        error: error.message,
        warnings
      };
    }
  }

  /**
   * Create multiple identities for a user (supports multiple OAuth providers)
   */
  async createMultipleIdentities(
    userId: string, 
    providers: IdentityProvider[]
  ): Promise<IdentityCreationResult[]> {
    Logger.debug(`Creating ${providers.length} identities for user ${userId}`);

    const results: IdentityCreationResult[] = [];

    for (const provider of providers) {
      const identityData: IdentityData = {
        userId,
        provider: provider.provider,
        providerId: provider.providerId,
        providerMetadata: provider.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await this.createIdentity(identityData);
      results.push(result);

      // Short delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successCount = results.filter(r => r.success).length;
    Logger.info(`✅ Created ${successCount}/${providers.length} identities for user ${userId}`);

    return results;
  }

  /**
   * Generate realistic OAuth provider data for testing
   */
  generateOAuthProviderData(provider: 'email' | 'google' | 'github' | 'discord' | 'apple' | 'facebook' | 'twitter', email: string): IdentityProvider {
    const baseId = email.split('@')[0];
    
    switch (provider) {
      case 'google':
        return {
          provider: 'google',
          providerId: `google_${baseId}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            iss: 'https://accounts.google.com',
            sub: `google_${baseId}_${Math.random().toString(36).substr(2, 9)}`,
            email,
            email_verified: true,
            name: this.extractNameFromEmail(email),
            picture: `https://lh3.googleusercontent.com/a/default-user=s96-c`,
            given_name: this.extractNameFromEmail(email).split(' ')[0],
            family_name: this.extractNameFromEmail(email).split(' ')[1] || '',
            locale: 'en'
          }
        };

      case 'github':
        return {
          provider: 'github',
          providerId: `github_${baseId}_${Math.random().toString(36).substr(2, 9)}`,
          metadata: {
            login: baseId,
            id: Math.floor(Math.random() * 100000000),
            avatar_url: `https://avatars.githubusercontent.com/u/${Math.floor(Math.random() * 100000000)}`,
            gravatar_id: '',
            url: `https://api.github.com/users/${baseId}`,
            html_url: `https://github.com/${baseId}`,
            name: this.extractNameFromEmail(email),
            email,
            bio: null,
            public_repos: Math.floor(Math.random() * 50),
            followers: Math.floor(Math.random() * 1000),
            following: Math.floor(Math.random() * 500)
          }
        };

      case 'discord':
        return {
          provider: 'discord',
          providerId: `discord_${Math.random().toString(36).substr(2, 18)}`,
          metadata: {
            id: Math.random().toString(36).substr(2, 18),
            username: baseId,
            discriminator: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
            avatar: `avatar_${Math.random().toString(36).substr(2, 6)}`,
            email,
            verified: true,
            locale: 'en-US',
            mfa_enabled: Math.random() > 0.7
          }
        };

      case 'apple':
        return {
          provider: 'apple',
          providerId: `apple_${baseId}.${Math.random().toString(36).substr(2, 6)}`,
          metadata: {
            sub: `${baseId}.${Math.random().toString(36).substr(2, 6)}`,
            email,
            email_verified: 'true',
            is_private_email: 'false',
            real_user_status: 2
          }
        };

      case 'email':
      default:
        return {
          provider: 'email',
          providerId: email,
          metadata: {
            sub: email,
            email,
            email_verified: true
          }
        };
    }
  }

  /**
   * Validate identity data before creation
   */
  private validateIdentityData(identityData: IdentityData): IdentityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Required fields validation
    if (!identityData.userId) {
      errors.push('userId is required');
    }

    if (!identityData.provider) {
      errors.push('provider is required');
    }

    if (!identityData.providerId) {
      errors.push('providerId is required');
    }

    // Provider-specific validation
    const validProviders = ['email', 'google', 'github', 'discord', 'apple', 'facebook', 'twitter'];
    if (identityData.provider && !validProviders.includes(identityData.provider)) {
      errors.push(`Invalid provider: ${identityData.provider}. Valid providers: ${validProviders.join(', ')}`);
    }

    // Email provider specific validation
    if (identityData.provider === 'email') {
      if (!identityData.email || !identityData.email.includes('@')) {
        errors.push('Email provider requires valid email address');
      }
      if (identityData.providerId !== identityData.email) {
        warnings.push('For email provider, providerId should match email address');
      }
    }

    // OAuth provider validation
    if (identityData.provider !== 'email' && !identityData.providerMetadata) {
      warnings.push(`OAuth provider ${identityData.provider} should include provider metadata for realistic testing`);
    }

    // UUID validation for userId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (identityData.userId && !uuidRegex.test(identityData.userId)) {
      warnings.push('userId should be a valid UUID for MakerKit compatibility');
    }

    // Recommendations
    if (identityData.provider === 'email') {
      recommendations.push('Consider adding additional OAuth providers for comprehensive testing');
    }

    if (!identityData.lastSignInAt) {
      recommendations.push('Consider setting lastSignInAt for realistic user activity patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Find existing identity for user and provider
   */
  private async findExistingIdentity(userId: string, provider: string): Promise<any | null> {
    try {
      const { data, error } = await this.client
        .from('auth.identities')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', provider)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          return null;
        }
        throw error;
      }

      return data;
    } catch (error: any) {
      Logger.debug(`No existing identity found for user ${userId} with provider ${provider}`);
      return null;
    }
  }

  /**
   * Format identity data for auth.identities table structure
   */
  private formatIdentityRecord(identityData: IdentityData): any {
    const now = new Date().toISOString();

    return {
      id: `${identityData.userId}-${identityData.provider}`,
      user_id: identityData.userId,
      identity_data: {
        sub: identityData.providerId,
        email: identityData.email,
        ...identityData.providerMetadata
      },
      provider: identityData.provider,
      last_sign_in_at: identityData.lastSignInAt || now,
      created_at: identityData.createdAt || now,
      updated_at: identityData.updatedAt || now
    };
  }

  /**
   * Extract a reasonable name from email address
   */
  private extractNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    
    // Handle common patterns
    if (localPart.includes('.')) {
      return localPart.split('.').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    
    if (localPart.includes('_')) {
      return localPart.split('_').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join(' ');
    }
    
    // Just capitalize first letter
    return localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  /**
   * Check if auth.identities table exists and is accessible
   */
  async validateIdentityTableAccess(): Promise<{
    tableExists: boolean;
    hasPermissions: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Test table access
      const { error } = await this.client
        .from('auth.identities')
        .select('count')
        .limit(1);

      if (error) {
        if (error.message.includes('permission denied') || error.message.includes('unauthorized')) {
          errors.push('Insufficient permissions to access auth.identities table');
          warnings.push('Ensure service role key is configured with proper auth schema permissions');
        } else if (error.message.includes('does not exist')) {
          errors.push('auth.identities table does not exist');
          warnings.push('This may indicate a non-standard MakerKit setup or older version');
        } else {
          errors.push(`Table access error: ${error.message}`);
        }

        return {
          tableExists: false,
          hasPermissions: false,
          errors,
          warnings
        };
      }

      Logger.success('✅ auth.identities table access validated');
      return {
        tableExists: true,
        hasPermissions: true,
        errors,
        warnings
      };

    } catch (error: any) {
      errors.push(`Identity table validation failed: ${error.message}`);
      return {
        tableExists: false,
        hasPermissions: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Get identity statistics for debugging and validation
   */
  async getIdentityStats(): Promise<{
    totalIdentities: number;
    providerBreakdown: Record<string, number>;
    usersWithMultipleProviders: number;
    orphanedIdentities: number;
  }> {
    try {
      // Get all identities
      const { data: identities, error } = await this.client
        .from('auth.identities')
        .select('user_id, provider');

      if (error) {
        throw error;
      }

      const totalIdentities = identities?.length || 0;
      const providerBreakdown: Record<string, number> = {};
      const userProviderCounts: Record<string, number> = {};

      if (identities) {
        for (const identity of identities) {
          // Provider breakdown
          const provider = String(identity.provider);
          providerBreakdown[provider] = (providerBreakdown[provider] || 0) + 1;
          
          // User provider counts
          const userId = String(identity.user_id);
          userProviderCounts[userId] = (userProviderCounts[userId] || 0) + 1;
        }
      }

      const usersWithMultipleProviders = Object.values(userProviderCounts)
        .filter(count => count > 1).length;

      // Check for orphaned identities (identities without corresponding auth.users)
      let orphanedIdentities = 0;
      if (identities && identities.length > 0) {
        const userIds = [...new Set(identities.map(i => i.user_id))];
        const { data: users } = await this.client
          .from('auth.users')
          .select('id')
          .in('id', userIds);

        const existingUserIds = new Set(users?.map(u => u.id) || []);
        orphanedIdentities = identities.filter(i => !existingUserIds.has(i.user_id)).length;
      }

      return {
        totalIdentities,
        providerBreakdown,
        usersWithMultipleProviders,
        orphanedIdentities
      };

    } catch (error: any) {
      Logger.error('Failed to get identity stats:', error);
      throw error;
    }
  }
}