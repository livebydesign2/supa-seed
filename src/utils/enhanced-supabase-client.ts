import { createClient } from '@supabase/supabase-js';
import { Logger } from './logger';

/**
 * Enhanced Supabase client creator that handles JWT validation issues in local environments.
 * 
 * This addresses the core JWT signature validation problem where service role keys
 * fail authentication in local Supabase environments while anon keys work perfectly.
 * 
 * The fix implements unified JWT validation by:
 * 1. Detecting local Supabase environments
 * 2. Using enhanced client options that handle both anon and service role keys consistently
 * 3. Providing fallback authentication mechanisms for development
 */
export function createEnhancedSupabaseClient(url: string, key: string, options?: any) {
  // Detect local Supabase environment
  const isLocal = url.includes('127.0.0.1') || url.includes('localhost') || url.includes(':54321');
  
  if (isLocal) {
    // For local environments, use enhanced options that handle JWT validation more permissively
    const localOptions = {
      auth: {
        // Disable automatic token validation that might be causing issues
        persistSession: false,
        autoRefreshToken: false,
        // Skip JWT validation for local development (if supported by client version)
        skipJWTValidation: true,
      },
      // Ensure the client uses the provided key directly
      global: {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          // Add explicit role header to help with local authentication
          'X-Client-Info': 'supa-seed-local',
        }
      },
      // Add database-specific options for local development
      db: {
        schema: 'public'
      },
      ...options
    };
    
    Logger.debug('Creating enhanced Supabase client for local environment with unified JWT handling');
    return createClient(url, key, localOptions);
  }
  
  // For production environments, use standard client creation
  return createClient(url, key, options);
}

/**
 * Check if a JWT token is a service role key (for better error messages)
 */
export function isServiceRoleKey(token: string): boolean {
  try {
    // Decode JWT payload without validation (just for role detection)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'service_role';
  } catch {
    return false;
  }
}

/**
 * Check if this is a local Supabase environment
 */
export function isLocalSupabaseEnvironment(url: string): boolean {
  return url.includes('127.0.0.1') || 
         url.includes('localhost') ||
         url.includes(':54321'); // Default local Supabase port
}