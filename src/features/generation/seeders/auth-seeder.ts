import { SeedModule } from '../core/types/types';
import { hashPassword } from '../../core/utils/auth-utils';

export class AuthSeeder extends SeedModule {
  async seed(): Promise<void> {
    console.log('🔐 Seeding authentication data...');
    
    try {
      // Check database connection first
      if (!(await this.checkDatabaseConnection())) {
        throw new Error('Database connection failed');
      }

      // Ensure we have basic auth configuration
      await this.setupAuthConfig();
      
      console.log('✅ Auth seeding complete');
    } catch (error) {
      this.logError('Auth seeding failed', error);
      throw error;
    }
  }

  private async setupAuthConfig(): Promise<void> {
    const { client } = this.context;
    
    try {
      // Test auth connection with retry logic
      const authTest = await this.executeWithRetry(async () => {
        const { data, error } = await client.auth.getSession();
        if (error && (error.message.includes('network') || error.message.includes('connection'))) {
          throw error; // Retryable error
        }
        return { data, error };
      });

      if (authTest?.error) {
        this.logWarning('Auth connection test', authTest.error.message);
      } else {
        console.log('✅ Auth service connection verified');
      }

      // Test auth admin access
      try {
        const { error: adminError } = await client.auth.admin.listUsers({
          page: 1,
          perPage: 1
        });
        
        if (adminError) {
          if (adminError.message.includes('JWT') || adminError.message.includes('forbidden')) {
            this.logWarning('Auth admin access', 'Service role key may be invalid or insufficient permissions');
          } else {
            this.logWarning('Auth admin access', adminError.message);
          }
        } else {
          console.log('✅ Auth admin access verified');
        }
      } catch (adminError) {
        this.logWarning('Auth admin access check', 'Failed to verify admin permissions', { error: adminError });
      }
    } catch (error) {
      this.logError('Auth setup configuration', error);
      throw error;
    }
  }

  async createTestUser(email: string, password: string = 'testpass123'): Promise<string> {
    const { client } = this.context;
    
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address provided');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    try {
      // Check if user already exists first
      const existingUser = await this.executeWithRetry(async () => {
        const { data } = await client.auth.admin.listUsers();
        return data?.users?.find(user => user.email === email);
      });

      if (existingUser) {
        this.logWarning('User creation', `User with email ${email} already exists, returning existing ID`);
        return existingUser.id;
      }

      // Create new user with retry logic
      const result = await this.executeWithRetry(async () => {
        const { data, error } = await client.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm for testing
        });

        if (error) {
          // Check for specific error types
          if (error.message.includes('already registered')) {
            // User exists, try to get their ID
            const { data: userData } = await client.auth.admin.listUsers();
            const existingUser = userData?.users?.find(user => user.email === email);
            if (existingUser) {
              return { data: { user: existingUser }, error: null };
            }
          }
          throw new Error(`Failed to create auth user: ${error.message}`);
        }

        if (!data.user) {
          throw new Error('Auth user creation returned no user data');
        }

        return { data, error };
      });

      if (!result?.data?.user) {
        throw new Error('Failed to create or retrieve auth user');
      }

      console.log(`✅ Created auth user: ${email}`);
      return result.data.user.id;
    } catch (error) {
      this.logError(`Failed to create auth user ${email}`, error);
      throw error;
    }
  }

  async deleteTestUsers(): Promise<void> {
    const { client } = this.context;
    
    try {
      // Get all users with retry logic
      const result = await this.executeWithRetry(async () => {
        return await client.auth.admin.listUsers();
      });

      if (!result?.data?.users) {
        this.logWarning('User cleanup', 'No users found or failed to retrieve user list');
        return;
      }

      let deletedCount = 0;
      const errors: string[] = [];

      for (const user of result.data.users) {
        if (user.email?.includes('test') || user.email?.includes('fake') || user.email?.includes('.test')) {
          try {
            const deleteResult = await this.executeWithRetry(async () => {
              const { error } = await client.auth.admin.deleteUser(user.id);
              if (error) {
                throw error;
              }
              return { success: true };
            });

            if (deleteResult?.success) {
              deletedCount++;
            } else {
              errors.push(`Failed to delete user ${user.email}`);
            }
          } catch (error) {
            errors.push(`Error deleting user ${user.email}: ${error}`);
            this.logWarning('User deletion', `Failed to delete ${user.email}`, { error });
          }
        }
      }
      
      console.log(`✅ Deleted ${deletedCount} test users`);
      if (errors.length > 0) {
        this.logWarning('User cleanup', `${errors.length} users could not be deleted`, { errors });
      }
    } catch (error) {
      this.logError('Auth cleanup failed', error);
    }
  }
} 