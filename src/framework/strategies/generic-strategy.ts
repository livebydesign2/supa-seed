/**
 * Generic Framework Strategy
 * Fallback strategy for databases without specific framework patterns
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

export class GenericStrategy implements SeedingStrategy {
  name = 'generic';
  private client!: SupabaseClient;
  private discoveredConstraints: Map<string, any[]> = new Map();

  async initialize(client: SupabaseClient): Promise<void> {
    this.client = client;
  }

  getPriority(): number {
    return 1; // Lowest priority - fallback strategy
  }

  async detect(schema: DatabaseSchema): Promise<FrameworkDetectionResult> {
    // Generic strategy always has low confidence - it's a fallback
    let confidence = 0.1;
    const detectedFeatures: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for basic user-related tables
      const hasUsersTable = schema.tables.some(t => t.name === 'users');
      const hasAccountsTable = schema.tables.some(t => t.name === 'accounts');
      const hasProfilesTable = schema.tables.some(t => t.name === 'profiles');

      if (hasUsersTable || hasAccountsTable || hasProfilesTable) {
        confidence = 0.2;
        detectedFeatures.push('basic_user_tables');
      }

      // Check for auth integration
      const hasAuthTriggers = schema.triggers.some(t => 
        t.table === 'users' || t.function.includes('auth')
      );

      if (hasAuthTriggers) {
        detectedFeatures.push('auth_integration');
        recommendations.push('Consider auth-based user creation for better integration');
      }

      // Basic constraint discovery
      if (schema.constraints.length > 0) {
        detectedFeatures.push('has_constraints');
        recommendations.push('Enable constraint discovery for better seeding reliability');
      }

      // Always provide fallback recommendations
      recommendations.push('Using generic strategy - consider framework-specific strategy if available');
      recommendations.push('Enable constraint validation for safer operations');
      
      if (confidence < 0.3) {
        recommendations.push('Low framework detection - consider manual configuration');
      }

      return {
        framework: this.name,
        confidence,
        detectedFeatures,
        recommendations
      };

    } catch (error: any) {
      Logger.warn(`Generic detection failed: ${error.message}`);
      return {
        framework: this.name,
        confidence: 0.1,
        detectedFeatures: ['fallback_mode'],
        recommendations: ['Using fallback mode due to detection error']
      };
    }
  }

  async createUser(data: UserData): Promise<User> {
    try {
      Logger.debug(`Creating generic user: ${data.email}`);

      // Try auth-based creation first (safer approach)
      let user: User;
      let useAuthCreation = true;

      try {
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
          Logger.warn(`Auth creation failed, falling back to direct insertion: ${authError.message}`);
          useAuthCreation = false;
        } else if (authUser.user) {
          user = {
            id: authUser.user.id,
            email: authUser.user.email!,
            name: data.name,
            username: data.username,
            avatar: data.avatar,
            created_at: authUser.user.created_at,
            metadata: authUser.user.user_metadata
          };
        } else {
          useAuthCreation = false;
        }
      } catch (error: any) {
        Logger.warn(`Auth creation error, using direct insertion: ${error.message}`);
        useAuthCreation = false;
      }

      // Fallback to direct table insertion
      if (!useAuthCreation) {
        user = await this.createUserDirectly(data);
      }

      // Try to create related records in common tables
      await this.createRelatedRecords(user!, data);

      return user!;

    } catch (error: any) {
      Logger.error(`Generic user creation failed: ${error.message}`);
      throw error;
    }
  }

  private async createUserDirectly(data: UserData): Promise<User> {
    // Generate a UUID for the user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Try multiple table patterns
    const tablesToTry = ['accounts', 'profiles', 'users'];
    let createdUser: User | null = null;

    for (const tableName of tablesToTry) {
      try {
        // Check if table exists by trying to query it
        const { error: testError } = await this.client
          .from(tableName)
          .select('id')
          .limit(1);

        if (testError && testError.code === 'PGRST116') {
          // Table doesn't exist, skip
          continue;
        }

        // Prepare data for this table
        const constraintResult = await this.handleConstraints(tableName, {
          id: userId,
          email: data.email,
          name: data.name,
          username: data.username,
          avatar_url: data.avatar,
          bio: data.bio,
          created_at: now,
          updated_at: now
        });

        const { error: insertError } = await this.client
          .from(tableName)
          .insert(constraintResult.data);

        if (!insertError) {
          createdUser = {
            id: userId,
            email: data.email,
            name: data.name,
            username: data.username,
            avatar: data.avatar,
            created_at: now,
            metadata: data.metadata
          };
          Logger.debug(`User created in ${tableName} table`);
          break;
        } else {
          Logger.debug(`Failed to create user in ${tableName}: ${insertError.message}`);
        }

      } catch (error: any) {
        Logger.debug(`Error trying ${tableName} table: ${error.message}`);
      }
    }

    if (!createdUser) {
      throw new Error('Failed to create user in any available table');
    }

    return createdUser;
  }

  private async createRelatedRecords(user: User, data: UserData): Promise<void> {
    // Try to create records in other common tables
    const relatedTables = ['profiles', 'accounts'];

    for (const tableName of relatedTables) {
      try {
        // Check if table exists and user doesn't already exist there
        const { data: existing, error: existError } = await this.client
          .from(tableName)
          .select('id')
          .eq('id', user.id)
          .single();

        if (existError && existError.code !== 'PGRST116') {
          // Error other than table not found
          continue;
        }

        if (existing) {
          // User already exists in this table
          continue;
        }

        // Try to create related record
        const constraintResult = await this.handleConstraints(tableName, {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar_url: user.avatar,
          bio: data.bio,
          created_at: user.created_at,
          updated_at: user.created_at
        });

        const { error: insertError } = await this.client
          .from(tableName)
          .insert(constraintResult.data);

        if (!insertError) {
          Logger.debug(`Related record created in ${tableName}`);
        }

      } catch (error: any) {
        Logger.debug(`Failed to create related record in ${tableName}: ${error.message}`);
      }
    }
  }

  async handleConstraints(table: string, data: any): Promise<ConstraintHandlingResult> {
    const appliedFixes: ConstraintFix[] = [];
    const warnings: string[] = [];
    let processedData = { ...data };

    try {
      // Basic constraint handling for common patterns
      
      // Handle common timestamp fields
      if (!processedData.created_at) {
        processedData.created_at = new Date().toISOString();
        appliedFixes.push({
          type: 'set_field',
          field: 'created_at',
          oldValue: undefined,
          newValue: processedData.created_at,
          reason: 'Set default created_at timestamp'
        });
      }

      if (!processedData.updated_at) {
        processedData.updated_at = processedData.created_at || new Date().toISOString();
        appliedFixes.push({
          type: 'set_field',
          field: 'updated_at',
          oldValue: undefined,
          newValue: processedData.updated_at,
          reason: 'Set default updated_at timestamp'
        });
      }

      // Handle nullable vs non-nullable patterns
      if (table === 'accounts' && processedData.slug === undefined) {
        // If we can't determine if slug should be null, make it nullable
        processedData.slug = null;
        appliedFixes.push({
          type: 'set_field',
          field: 'slug',
          oldValue: undefined,
          newValue: null,
          reason: 'Default slug to null for compatibility'
        });
      }

      // Remove undefined values that might cause insertion issues
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === undefined) {
          delete processedData[key];
          appliedFixes.push({
            type: 'remove_field',
            field: key,
            oldValue: undefined,
            newValue: undefined,
            reason: 'Remove undefined value to prevent insertion errors'
          });
        }
      });

      // Handle common field mapping
      if (processedData.avatar_url && !processedData.avatar) {
        processedData.avatar = processedData.avatar_url;
      }
      if (processedData.avatar && !processedData.avatar_url) {
        processedData.avatar_url = processedData.avatar;
      }

      return {
        data: processedData,
        appliedFixes,
        warnings
      };

    } catch (error: any) {
      Logger.warn(`Generic constraint handling failed for ${table}: ${error.message}`);
      return {
        data: processedData,
        appliedFixes,
        warnings: [...warnings, `Constraint handling error: ${error.message}`]
      };
    }
  }

  getRecommendations(): string[] {
    return [
      'Generic strategy provides basic compatibility with any schema',
      'Consider using a framework-specific strategy for better integration',
      'Enable constraint discovery to improve data integrity',
      'Use auth.admin.createUser() when possible for better Supabase integration',
      'Test seeding with small data sets first to identify schema-specific issues'
    ];
  }

  supportsFeature(feature: string): boolean {
    const supportedFeatures = [
      'basic_user_creation',
      'direct_insertion',
      'fallback_behavior',
      'constraint_basic_handling',
      'multi_table_attempts'
    ];

    return supportedFeatures.includes(feature);
  }
}