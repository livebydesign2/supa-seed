import { SeedModule } from '../types';
import { hashPassword } from '../utils/auth-utils';

export class AuthSeeder extends SeedModule {
  async seed(): Promise<void> {
    console.log('🔐 Seeding authentication data...');
    
    // Ensure we have basic auth configuration
    await this.setupAuthConfig();
    
    console.log('✅ Auth seeding complete');
  }

  private async setupAuthConfig(): Promise<void> {
    const { client } = this.context;
    
    // Check if we need to create any auth-related configurations
    // In local development, this is mostly handled by Supabase automatically
    
    try {
      // Test auth connection
      const { data, error } = await client.auth.getSession();
      
      if (error) {
        console.warn('⚠️  Auth connection test failed:', error.message);
      } else {
        console.log('✅ Auth service connection verified');
      }
    } catch (error) {
      console.warn('⚠️  Auth setup check failed:', error);
    }
  }

  async createTestUser(email: string, password: string = 'testpass123'): Promise<string> {
    const { client } = this.context;
    
    try {
      // For local development, we use the auth admin functions
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm for testing
      });

      if (error) {
        throw new Error(`Failed to create auth user: ${error.message}`);
      }

      if (!data.user) {
        throw new Error('Auth user creation returned no user data');
      }

      return data.user.id;
    } catch (error) {
      console.error(`❌ Failed to create auth user ${email}:`, error);
      throw error;
    }
  }

  async deleteTestUsers(): Promise<void> {
    const { client } = this.context;
    
    try {
      // In local dev, we can clean up test users
      const { data: users } = await client.auth.admin.listUsers();
      
      if (users?.users) {
        for (const user of users.users) {
          if (user.email?.includes('test') || user.email?.includes('fake')) {
            await client.auth.admin.deleteUser(user.id);
          }
        }
      }
      
      console.log('✅ Test users cleaned up');
    } catch (error) {
      console.warn('⚠️  Auth cleanup failed:', error);
    }
  }
} 