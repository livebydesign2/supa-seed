/**
 * Webhook Types for Epic 1: Universal MakerKit Core System
 * Comprehensive type definitions for development webhook setup and management
 * Part of Task 1.3: Development Webhook Setup
 */

/**
 * Supabase webhook event types
 */
export type DatabaseEventType = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuthEventType = 
  | 'user.created'
  | 'user.updated' 
  | 'user.deleted'
  | 'user.confirmed'
  | 'user.password_reset'
  | 'user.email_changed'
  | 'user.phone_changed'
  | 'session.created'
  | 'session.deleted'
  | 'mfa.enrolled'
  | 'mfa.challenged'
  | 'mfa.verified';

export type WebhookEventType = DatabaseEventType | AuthEventType;

/**
 * Standard Supabase webhook payload structure
 */
export interface WebhookPayload {
  type: DatabaseEventType;
  table: string;
  schema: string;
  record: Record<string, any> | null; // Current record (null for DELETE)
  old_record: Record<string, any> | null; // Previous record (null for INSERT)
}

/**
 * Auth webhook payload structure
 */
export interface AuthWebhookPayload {
  type: AuthEventType;
  user: {
    id: string;
    email?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    last_sign_in_at?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
  };
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
}

/**
 * Generic webhook payload that can handle both database and auth events
 */
export type GenericWebhookPayload = WebhookPayload | AuthWebhookPayload;

/**
 * Webhook endpoint configuration
 */
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: WebhookEventType[];
  enabled: boolean;
  authentication?: WebhookAuthentication;
  retryPolicy?: WebhookRetryPolicy;
  filters?: WebhookFilter[];
  metadata?: Record<string, any>;
}

/**
 * Webhook authentication configuration
 */
export interface WebhookAuthentication {
  type: 'none' | 'bearer' | 'basic' | 'signature';
  credentials?: {
    token?: string;
    username?: string;
    password?: string;
    secret?: string; // For signature verification
  };
  headers?: Record<string, string>;
}

/**
 * Webhook retry policy configuration
 */
export interface WebhookRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  retryConditions: Array<{
    type: 'status_code' | 'timeout' | 'network_error';
    condition: string | number;
  }>;
}

/**
 * Webhook filtering configuration
 */
export interface WebhookFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
  description?: string;
}

/**
 * Development webhook configuration
 */
export interface DevelopmentWebhookConfig {
  enabled: boolean;
  baseUrl: string; // e.g., 'http://localhost:3000' or ngrok URL
  ngrokSupport: {
    enabled: boolean;
    subdomain?: string;
    authToken?: string;
    region?: 'us' | 'eu' | 'ap' | 'au' | 'sa' | 'jp' | 'in';
  };
  endpoints: {
    // Authentication webhook endpoints
    userCreated?: string;
    userUpdated?: string;
    userDeleted?: string;
    userConfirmed?: string;
    userSignIn?: string;
    userSignOut?: string;
    passwordReset?: string;
    emailConfirm?: string;
    mfaEnrolled?: string;
    mfaVerified?: string;
    
    // Database webhook endpoints
    accountCreated?: string;
    accountUpdated?: string;
    profileCreated?: string;
    profileUpdated?: string;
    subscriptionCreated?: string;
    subscriptionUpdated?: string;
    
    // Custom endpoints
    custom?: Record<string, string>;
  };
  authentication?: WebhookAuthentication;
  testing: {
    enablePayloadLogging: boolean;
    enableRequestLogging: boolean;
    enableResponseLogging: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    mockEndpoints: boolean;
    validatePayloads: boolean;
  };
}

/**
 * MakerKit-specific webhook patterns
 */
export interface MakerKitWebhookPatterns {
  // Core MakerKit events that commonly use webhooks
  coreEvents: {
    userRegistration: {
      enabled: boolean;
      triggers: ('account_creation' | 'profile_setup' | 'welcome_email' | 'onboarding_start')[];
      endpoint?: string;
    };
    accountManagement: {
      enabled: boolean;
      triggers: ('team_created' | 'member_added' | 'member_removed' | 'permissions_changed')[];
      endpoint?: string;
    };
    subscriptionManagement: {
      enabled: boolean;
      triggers: ('subscription_created' | 'subscription_updated' | 'payment_succeeded' | 'payment_failed')[];
      endpoint?: string;
    };
    securityEvents: {
      enabled: boolean;
      triggers: ('mfa_enabled' | 'password_changed' | 'suspicious_login' | 'account_locked')[];
      endpoint?: string;
    };
  };
  
  // Domain-specific webhook patterns
  domainSpecific: {
    outdoor: {
      enabled: boolean;
      events: ('setup_created' | 'gear_added' | 'review_posted' | 'trip_planned')[];
    };
    saas: {
      enabled: boolean;
      events: ('workspace_created' | 'project_created' | 'task_completed' | 'integration_connected')[];
    };
    ecommerce: {
      enabled: boolean;
      events: ('product_created' | 'order_placed' | 'payment_processed' | 'inventory_updated')[];
    };
    social: {
      enabled: boolean;
      events: ('post_created' | 'comment_added' | 'like_received' | 'follow_added')[];
    };
  };
}

/**
 * Webhook delivery result
 */
export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  attempt: number;
  error?: string;
  response?: {
    headers: Record<string, string>;
    body: string;
  };
  timestamp: string;
}

/**
 * Webhook delivery attempt
 */
export interface WebhookDeliveryAttempt {
  id: string;
  webhookId: string;
  payload: GenericWebhookPayload;
  endpoint: string;
  attempt: number;
  result: WebhookDeliveryResult;
  nextRetryAt?: string;
}

/**
 * Webhook validation result
 */
export interface WebhookValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  payloadSize: number;
  validationTime: number;
}

/**
 * Webhook testing scenario
 */
export interface WebhookTestingScenario {
  id: string;
  name: string;
  description: string;
  event: WebhookEventType;
  mockPayload: GenericWebhookPayload;
  expectedResponse: {
    statusCode: number;
    body?: any;
    headers?: Record<string, string>;
  };
  validationRules: Array<{
    field: string;
    rule: string;
    description: string;
  }>;
}

/**
 * Webhook manager interface
 */
export interface IWebhookManager {
  // Configuration management
  configure(config: DevelopmentWebhookConfig): Promise<void>;
  getConfiguration(): DevelopmentWebhookConfig | null;
  
  // Endpoint management
  registerEndpoint(endpoint: WebhookEndpoint): Promise<{ success: boolean; error?: string }>;
  updateEndpoint(id: string, updates: Partial<WebhookEndpoint>): Promise<{ success: boolean; error?: string }>;
  removeEndpoint(id: string): Promise<{ success: boolean; error?: string }>;
  listEndpoints(): Promise<WebhookEndpoint[]>;
  
  // Event handling
  triggerWebhook(event: WebhookEventType, payload: GenericWebhookPayload): Promise<WebhookDeliveryResult[]>;
  validateWebhook(endpoint: WebhookEndpoint, payload: GenericWebhookPayload): Promise<WebhookValidationResult>;
  
  // Testing utilities
  generateTestPayload(event: WebhookEventType): GenericWebhookPayload;
  runTestScenario(scenario: WebhookTestingScenario): Promise<WebhookDeliveryResult>;
  
  // Development utilities
  startNgrokTunnel(): Promise<{ success: boolean; url?: string; error?: string }>;
  stopNgrokTunnel(): Promise<{ success: boolean; error?: string }>;
  setupDevelopmentEndpoints(): Promise<{ success: boolean; endpoints: WebhookEndpoint[]; errors: string[] }>;
}

/**
 * Webhook security utilities
 */
export interface WebhookSecurity {
  // Signature verification
  generateSignature(payload: string, secret: string, algorithm?: 'sha256' | 'sha1'): string;
  verifySignature(payload: string, signature: string, secret: string, algorithm?: 'sha256' | 'sha1'): boolean;
  
  // Request validation
  validateRequest(request: {
    headers: Record<string, string>;
    body: string;
    method: string;
    url: string;
  }): { isValid: boolean; errors: string[] };
  
  // Rate limiting
  checkRateLimit(endpoint: string, windowMs: number, maxRequests: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }>;
}

/**
 * Platform-specific webhook configuration
 */
export interface PlatformWebhookConfig {
  architecture: 'individual' | 'team' | 'hybrid';
  domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
  webhooks: {
    // Essential webhooks for the platform type
    essential: WebhookEndpoint[];
    // Optional webhooks that enhance functionality
    optional: WebhookEndpoint[];
    // Testing webhooks for development
    testing: WebhookEndpoint[];
  };
  patterns: MakerKitWebhookPatterns;
}

/**
 * Webhook analytics and monitoring
 */
export interface WebhookAnalytics {
  deliveryStats: {
    total: number;
    successful: number;
    failed: number;
    retried: number;
    averageResponseTime: number;
  };
  errorPatterns: Array<{
    error: string;
    count: number;
    lastOccurrence: string;
  }>;
  endpointHealth: Array<{
    endpointId: string;
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastCheck: string;
  }>;
}

/**
 * Default webhook configurations for common scenarios
 */
export const DEFAULT_WEBHOOK_CONFIGS = {
  development: {
    enabled: true,
    baseUrl: 'http://localhost:3000',
    ngrokSupport: {
      enabled: false
    },
    endpoints: {
      userCreated: '/webhooks/auth/user-created',
      userUpdated: '/webhooks/auth/user-updated',
      accountCreated: '/webhooks/db/account-created',
      profileCreated: '/webhooks/db/profile-created'
    },
    authentication: {
      type: 'none' as const
    },
    testing: {
      enablePayloadLogging: true,
      enableRequestLogging: true,
      enableResponseLogging: true,
      logLevel: 'debug' as const,
      mockEndpoints: false,
      validatePayloads: true
    }
  } as DevelopmentWebhookConfig,
  
  production: {
    enabled: true,
    baseUrl: 'https://your-app.com',
    ngrokSupport: {
      enabled: false
    },
    endpoints: {
      userCreated: '/api/webhooks/auth/user-created',
      userUpdated: '/api/webhooks/auth/user-updated',
      accountCreated: '/api/webhooks/db/account-created',
      profileCreated: '/api/webhooks/db/profile-created'
    },
    authentication: {
      type: 'signature' as const,
      credentials: {
        secret: process.env.WEBHOOK_SECRET
      }
    },
    testing: {
      enablePayloadLogging: false,
      enableRequestLogging: false,
      enableResponseLogging: false,
      logLevel: 'error' as const,
      mockEndpoints: false,
      validatePayloads: true
    }
  } as DevelopmentWebhookConfig
};

/**
 * Common webhook event mappings for MakerKit
 */
export const MAKERKIT_WEBHOOK_EVENTS = {
  // Authentication events
  auth: {
    'auth.user.created': {
      description: 'User registration completed',
      commonTriggers: ['account_setup', 'welcome_email', 'profile_creation'],
      payload: {
        type: 'user.created',
        user: 'UserObject',
        session: 'SessionObject?'
      }
    },
    'auth.user.confirmed': {
      description: 'Email confirmation completed',
      commonTriggers: ['profile_activation', 'onboarding_start'],
      payload: {
        type: 'user.confirmed',
        user: 'UserObject'
      }
    }
  },
  
  // Database events for core MakerKit tables
  database: {
    'db.accounts.insert': {
      description: 'New account created',
      commonTriggers: ['workspace_setup', 'billing_setup', 'team_initialization'],
      payload: {
        type: 'INSERT',
        table: 'accounts',
        record: 'AccountObject'
      }
    },
    'db.profiles.insert': {
      description: 'New profile created',
      commonTriggers: ['avatar_setup', 'preferences_config', 'notification_setup'],
      payload: {
        type: 'INSERT',
        table: 'profiles',
        record: 'ProfileObject'
      }
    }
  }
};

/**
 * Type guards for webhook payloads
 */
export function isDatabaseWebhook(payload: GenericWebhookPayload): payload is WebhookPayload {
  return 'table' in payload && 'schema' in payload;
}

export function isAuthWebhook(payload: GenericWebhookPayload): payload is AuthWebhookPayload {
  return 'user' in payload && !('table' in payload);
}

/**
 * Utility functions for webhook operations
 */
export namespace WebhookUtils {
  /**
   * Generate a unique webhook ID
   */
  export function generateWebhookId(prefix: string = 'webhook'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validate webhook URL format
   */
  export function isValidWebhookUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize webhook payload for logging
   */
  export function sanitizePayload(payload: GenericWebhookPayload): GenericWebhookPayload {
    const sanitized = JSON.parse(JSON.stringify(payload));
    
    // Remove sensitive fields
    if ('user' in sanitized && sanitized.user) {
      delete sanitized.user.password;
      delete sanitized.user.password_hash;
      if (sanitized.user.user_metadata?.password) {
        delete sanitized.user.user_metadata.password;
      }
    }
    
    if ('session' in sanitized && sanitized.session) {
      // Keep only token type and expiry, not actual tokens
      sanitized.session = {
        token_type: sanitized.session.token_type,
        expires_in: sanitized.session.expires_in
      };
    }
    
    return sanitized;
  }

  /**
   * Calculate webhook payload size
   */
  export function getPayloadSize(payload: GenericWebhookPayload): number {
    return new Blob([JSON.stringify(payload)]).size;
  }

  /**
   * Generate webhook endpoint URL
   */
  export function buildEndpointUrl(baseUrl: string, path: string): string {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBase}/${cleanPath}`;
  }

  /**
   * Determine appropriate retry delay
   */
  export function calculateRetryDelay(
    attempt: number, 
    strategy: 'linear' | 'exponential' | 'fixed',
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ): number {
    let delay: number;
    
    switch (strategy) {
      case 'linear':
        delay = baseDelay * attempt;
        break;
      case 'exponential':
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'fixed':
        delay = baseDelay;
        break;
    }
    
    return Math.min(delay, maxDelay);
  }
}