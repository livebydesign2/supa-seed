/**
 * Authentication Types for Epic 1: Universal MakerKit Core System
 * Comprehensive type definitions for complete MakerKit authentication flows
 * Part of Task 1.1: Implement Auth.Identities Support
 */

/**
 * Core authentication user data structure
 */
export interface AuthUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
  phone?: string;
  phoneConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
  lastSignInAt?: string;
  userMetadata?: Record<string, any>;
  appMetadata?: Record<string, any>;
  role?: string;
  aud?: string;
}

/**
 * Identity provider types supported by MakerKit
 */
export type IdentityProviderType = 
  | 'email' 
  | 'google' 
  | 'github' 
  | 'discord' 
  | 'apple' 
  | 'facebook' 
  | 'twitter'
  | 'linkedin'
  | 'microsoft'
  | 'slack';

/**
 * Identity record structure for auth.identities table
 */
export interface AuthIdentity {
  id: string;
  userId: string;
  identityData: IdentityData;
  provider: IdentityProviderType;
  lastSignInAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Provider-specific identity data
 */
export interface IdentityData {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  avatar_url?: string;
  username?: string;
  login?: string;
  preferred_username?: string;
  locale?: string;
  [key: string]: any;
}

/**
 * OAuth provider configuration for testing
 */
export interface OAuthProviderConfig {
  provider: IdentityProviderType;
  enabled: boolean;
  testUsers?: {
    primary: boolean;
    weight: number;
  };
  metadata?: {
    generateRealProfilePictures?: boolean;
    includeDetailedProfile?: boolean;
    simulateVerifiedAccounts?: boolean;
  };
}

/**
 * Complete user creation data including identity providers
 */
export interface CompleteUserData {
  // Auth user fields
  email: string;
  password?: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  metadata?: Record<string, any>;
  
  // Identity provider configuration
  identityProviders?: IdentityProviderType[];
  primaryProvider?: IdentityProviderType;
  
  // MakerKit-specific fields
  isPersonalAccount?: boolean;
  accountSlug?: string | null;
  role?: 'admin' | 'user' | 'member';
  
  // Optional verification
  emailConfirmed?: boolean;
  phoneConfirmed?: boolean;
}

/**
 * User creation result with complete auth flow
 */
export interface CompleteUserResult {
  success: boolean;
  authUser?: AuthUser;
  identities: AuthIdentity[];
  mfaFactors?: MFAFactor[];
  account?: any;
  profile?: any;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * MFA Factor types for future implementation
 */
export interface MFAFactor {
  id: string;
  userId: string;
  factorType: 'totp' | 'sms' | 'phone';
  status: 'verified' | 'unverified';
  friendlyName?: string;
  secret?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * MFA configuration options
 */
export interface MFAConfig {
  enabled: boolean;
  factorTypes: ('totp' | 'sms' | 'phone')[];
  enforceForRoles?: string[];
  gracePeriodDays?: number;
  maxFactorsPerUser?: number;
}

/**
 * Authentication validation result
 */
export interface AuthValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
}

/**
 * Authentication flow configuration for MakerKit
 */
export interface AuthFlowConfig {
  // Complete auth flow settings
  createIdentities: boolean;
  enableMFA: boolean;
  setupDevelopmentWebhooks: boolean;
  
  // Provider settings
  supportedProviders: IdentityProviderType[];
  primaryProvider: IdentityProviderType;
  allowMultipleProviders: boolean;
  
  // MakerKit integration
  useMakerKitTriggers: boolean;
  createAccountRecords: boolean;
  createProfileRecords: boolean;
  
  // Testing and development
  autoConfirmUsers: boolean;
  generateTestData: boolean;
  skipEmailVerification: boolean;
}

/**
 * Provider-specific metadata generators
 */
export interface ProviderMetadataGenerator {
  provider: IdentityProviderType;
  generateMetadata(email: string, userData?: Partial<CompleteUserData>): IdentityData;
  validateMetadata(metadata: IdentityData): AuthValidationResult;
}

/**
 * Authentication seeding options
 */
export interface AuthSeedingOptions {
  userCount: number;
  authFlowConfig: AuthFlowConfig;
  mfaConfig?: MFAConfig;
  providerDistribution?: Record<IdentityProviderType, number>;
  roleDistribution?: Record<string, number>;
  accountTypeDistribution?: {
    personal: number;
    team: number;
  };
}

/**
 * Authentication seeding result
 */
export interface AuthSeedingResult {
  success: boolean;
  usersCreated: number;
  identitiesCreated: number;
  mfaFactorsCreated: number;
  accountsCreated: number;
  profilesCreated: number;
  executionTime: number;
  errors: string[];
  warnings: string[];
  providerBreakdown: Record<IdentityProviderType, number>;
  recommendations: string[];
}

/**
 * Development webhook configuration
 */
export interface DevelopmentWebhookConfig {
  enabled: boolean;
  baseUrl: string;
  endpoints: {
    userCreated?: string;
    userUpdated?: string;
    userDeleted?: string;
    userSignIn?: string;
    userSignOut?: string;
    passwordReset?: string;
    emailConfirm?: string;
  };
  authentication?: {
    type: 'none' | 'bearer' | 'basic';
    credentials?: Record<string, string>;
  };
}

/**
 * Authentication compliance check result
 */
export interface AuthComplianceResult {
  compliant: boolean;
  checkedItems: {
    authUsersTable: boolean;
    authIdentitiesTable: boolean;
    mfaFactorsTable: boolean;
    rlsPoliciesEnabled: boolean;
    triggersConfigured: boolean;
    webhooksConfigured: boolean;
  };
  violations: Array<{
    type: 'error' | 'warning';
    message: string;
    recommendation: string;
  }>;
  confidence: number;
}

/**
 * User archetype for platform-specific user generation
 */
export interface UserArchetype {
  id: string;
  name: string;
  description: string;
  email: string;
  role: string;
  purpose: string;
  
  // Content patterns
  contentPattern: {
    createsContent: boolean;
    consumesContent: boolean;
    collaborates: boolean;
    setupsPerUser?: number;
    itemsPerSetup?: number;
    publicRatio?: number;
  };
  
  // Behavior patterns
  behaviorPattern: {
    activityLevel: 'low' | 'medium' | 'high';
    sessionDuration: 'short' | 'medium' | 'long';
    featureUsage: string[];
    socialInteraction: 'minimal' | 'moderate' | 'active';
  };
  
  // Platform context
  platformContext: {
    architecture: 'individual' | 'team' | 'hybrid';
    domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
    accountType: 'personal' | 'team';
  };
  
  // Authentication preferences
  authPreferences: {
    providers: IdentityProviderType[];
    mfaEnabled: boolean;
    securityLevel: 'basic' | 'enhanced' | 'maximum';
  };
}

/**
 * Platform detection context for auth configuration
 */
export interface PlatformContext {
  architecture: 'individual' | 'team' | 'hybrid';
  domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
  confidence: number;
  detectedFeatures: string[];
  recommendations: string[];
  accountType?: 'personal' | 'team';
}

/**
 * Re-export identity manager types for convenience
 */
export type {
  IdentityProvider,
  IdentityCreationResult,
  IdentityValidationResult
} from './identity-manager';