/**
 * MFA Types for Epic 1: Universal MakerKit Core System
 * Comprehensive type definitions for Multi-Factor Authentication support
 * Part of Task 1.2: Add MFA Factor Support
 */

import type { IdentityProviderType } from './auth-types';

/**
 * MFA Factor types supported by Supabase Auth
 */
export type MFAFactorType = 'totp' | 'phone';

/**
 * MFA Factor status values
 */
export type MFAFactorStatus = 'verified' | 'unverified';

/**
 * Base MFA Factor interface matching Supabase auth.mfa_factors table
 */
export interface MFAFactor {
  id: string;
  userId: string;
  factorType: MFAFactorType;
  status: MFAFactorStatus;
  friendlyName?: string;
  secret?: string; // For TOTP factors
  phone?: string; // For phone factors
  backupCodes?: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * TOTP-specific factor data
 */
export interface TOTPFactor extends MFAFactor {
  factorType: 'totp';
  secret: string;
  issuer?: string;
  qrCodeUri?: string;
  backupCodes: string[];
}

/**
 * Phone-specific factor data
 */
export interface PhoneFactor extends MFAFactor {
  factorType: 'phone';
  phone: string;
  countryCode?: string;
  verificationMethod?: 'sms' | 'voice';
}

/**
 * Input data for creating a TOTP factor
 */
export interface TOTPFactorData {
  factorType: 'totp';
  friendlyName?: string;
  issuer?: string;
  secret?: string; // If not provided, will be generated
}

/**
 * Input data for creating a phone factor
 */
export interface PhoneFactorData {
  factorType: 'phone';
  friendlyName?: string;
  phone: string;
  countryCode?: string;
  verificationMethod?: 'sms' | 'voice';
}

/**
 * Union type for MFA factor creation data
 */
export type MFAFactorData = TOTPFactorData | PhoneFactorData;

/**
 * Result of MFA factor creation
 */
export interface MFAFactorCreationResult {
  success: boolean;
  factor?: MFAFactor;
  totpData?: {
    secret: string;
    qrCode: string;
    uri: string;
    backupCodes: string[];
    manualEntryKey: string;
  };
  phoneData?: {
    formattedPhone: string;
    countryCode: string;
    verificationMethod: 'sms' | 'voice';
  };
  error?: string;
  warnings: string[];
  recommendations: string[];
}

/**
 * MFA factor validation result
 */
export interface MFAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  securityScore?: number;
}

/**
 * MFA challenge information
 */
export interface MFAChallenge {
  id: string;
  factorId: string;
  challengeType: 'totp' | 'sms' | 'voice';
  expiresAt: string;
  attemptsRemaining: number;
  createdAt: string;
}

/**
 * MFA verification attempt
 */
export interface MFAVerificationAttempt {
  challengeId: string;
  code: string;
  timestamp: string;
  success: boolean;
  factor?: MFAFactor;
  backupCodeUsed?: boolean;
  attemptsRemaining?: number;
}

/**
 * MFA testing scenarios
 */
export interface MFATestingResult {
  factorId: string;
  factorType: MFAFactorType;
  validCodes: string[];
  backupCodes?: string[];
  testScenarios: Array<{
    scenario: string;
    code: string;
    expectedResult: 'success' | 'failure';
    description: string;
  }>;
  recommendations: string[];
}

/**
 * MFA configuration for different security levels
 */
export interface MFASecurityLevel {
  name: 'basic' | 'enhanced' | 'maximum';
  description: string;
  requireMFA: boolean;
  allowedFactorTypes: MFAFactorType[];
  minimumFactors: number;
  maximumFactors: number;
  enforceBackupCodes: boolean;
  gracePeriodDays?: number;
}

/**
 * User archetype MFA preferences
 */
export interface ArchetypeMFAPreferences {
  securityLevel: 'basic' | 'enhanced' | 'maximum';
  preferredFactorTypes: MFAFactorType[];
  factorCount: number;
  backupCodesEnabled: boolean;
  phoneNumber?: string;
  totpAppPreference?: 'google_authenticator' | 'authy' | 'microsoft_authenticator' | 'any';
}

/**
 * MFA enrollment flow state
 */
export interface MFAEnrollmentFlow {
  userId: string;
  step: 'factor_creation' | 'verification' | 'backup_codes' | 'completed';
  factorId?: string;
  factorType?: MFAFactorType;
  challengeId?: string;
  attemptsRemaining?: number;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

/**
 * MFA factor statistics
 */
export interface MFAFactorStats {
  total: number;
  verified: number;
  unverified: number;
  totpFactors: number;
  phoneFactors: number;
  withBackupCodes: number;
  averageAge: number; // in days
  lastUsed?: string;
}

/**
 * MFA policy configuration
 */
export interface MFAPolicy {
  enforced: boolean;
  enforcedForRoles: string[];
  gracePeriodDays: number;
  maxFactorsPerUser: number;
  allowedFactorTypes: MFAFactorType[];
  requireBackupCodes: boolean;
  totpSettings: {
    issuer: string;
    algorithm: 'SHA1' | 'SHA256' | 'SHA512';
    digits: 6 | 8;
    period: number; // seconds
    window: number; // tolerance window
  };
  phoneSettings: {
    allowedCountries?: string[];
    verificationMethod: 'sms' | 'voice' | 'both';
    rateLimitPerHour: number;
  };
}

/**
 * MFA audit log entry
 */
export interface MFAAuditLog {
  id: string;
  userId: string;
  factorId?: string;
  action: 'factor_created' | 'factor_verified' | 'factor_disabled' | 'challenge_created' | 'verification_attempt' | 'backup_code_used';
  result: 'success' | 'failure';
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/**
 * MFA recovery options
 */
export interface MFARecoveryOptions {
  backupCodes: {
    enabled: boolean;
    count: number;
    used: number;
    remaining: number;
    lastGenerated: string;
  };
  recoveryEmail: {
    enabled: boolean;
    email?: string;
    verified: boolean;
  };
  recoveryPhone: {
    enabled: boolean;
    phone?: string;
    verified: boolean;
  };
  adminOverride: {
    enabled: boolean;
    requiresApproval: boolean;
  };
}

/**
 * MFA seeding configuration for user archetypes
 */
export interface MFASeedingConfig {
  enabled: boolean;
  distributionBySecurityLevel: {
    basic: number; // percentage of users with basic security (no MFA)
    enhanced: number; // percentage with enhanced security (1 factor)
    maximum: number; // percentage with maximum security (2+ factors)
  };
  factorTypeDistribution: {
    totpOnly: number;
    phoneOnly: number; 
    both: number;
  };
  verificationRate: number; // percentage of factors that are pre-verified
  backupCodeGeneration: boolean;
  testingScenarios: {
    includeInvalidCodes: boolean;
    includeExpiredCodes: boolean;
    includeRateLimitScenarios: boolean;
  };
}

/**
 * Platform-specific MFA configuration
 */
export interface PlatformMFAConfig {
  architecture: 'individual' | 'team' | 'hybrid';
  domain: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
  securityRequirements: {
    minimumSecurityLevel: 'basic' | 'enhanced' | 'maximum';
    enforceForRoles: string[];
    complianceStandards?: ('SOC2' | 'HIPAA' | 'PCI_DSS' | 'GDPR')[];
  };
  usagePatterns: {
    expectedFactorTypes: MFAFactorType[];
    userSecurityAwareness: 'low' | 'medium' | 'high';
    deviceTrustLevel: 'low' | 'medium' | 'high';
  };
}

/**
 * MFA integration with identity providers
 */
export interface MFAIdentityIntegration {
  provider: IdentityProviderType;
  supportsMFA: boolean;
  nativeMFATypes: MFAFactorType[];
  requiresAdditionalMFA: boolean;
  trustLevel: 'low' | 'medium' | 'high';
  configuration?: {
    bypassMFAForTrustedProvider?: boolean;
    stepUpAuthenticationRequired?: boolean;
    minimumAAL?: 1 | 2 | 3; // Authentication Assurance Level
  };
}

/**
 * MFA error types
 */
export type MFAError = 
  | 'invalid_code'
  | 'expired_code'
  | 'rate_limited'
  | 'factor_not_found'
  | 'factor_not_verified'
  | 'backup_code_already_used'
  | 'max_factors_exceeded'
  | 'unsupported_factor_type'
  | 'enrollment_expired'
  | 'phone_verification_failed'
  | 'totp_setup_failed';

/**
 * MFA error details
 */
export interface MFAErrorDetail {
  code: MFAError;
  message: string;
  retryable: boolean;
  retryAfter?: number; // seconds to wait before retry
  helpUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Comprehensive MFA manager interface
 */
export interface IMFAManager {
  // Factor management
  createMFAFactor(userId: string, factorData: MFAFactorData): Promise<MFAFactorCreationResult>;
  createMultipleFactors(userId: string, factors: MFAFactorData[]): Promise<MFAFactorCreationResult[]>;
  getUserFactors(userId: string): Promise<{ success: boolean; factors: MFAFactor[]; stats: MFAFactorStats; error?: string }>;
  deleteFactor(factorId: string): Promise<{ success: boolean; error?: string }>;
  updateFactor(factorId: string, updates: Partial<MFAFactor>): Promise<{ success: boolean; factor?: MFAFactor; error?: string }>;

  // Challenge and verification
  createChallenge(factorId: string): Promise<{ success: boolean; challenge?: MFAChallenge; error?: string }>;
  verifyChallenge(challengeId: string, code: string): Promise<{ success: boolean; verified: boolean; error?: MFAErrorDetail }>;
  
  // Testing utilities
  generateTestCodes(factorId: string): Promise<MFATestingResult | null>;
  verifyFactorForTesting(factorId: string, code: string, scenario?: string): Promise<{ verified: boolean; message: string; nextAction?: string }>;
  
  // Archetype support
  generateArchetypeFactors(userId: string, securityLevel: 'basic' | 'enhanced' | 'maximum', preferences?: Partial<ArchetypeMFAPreferences>): Promise<MFAFactorCreationResult[]>;
  
  // Validation and compliance
  validateMFATableAccess(): Promise<{ tableExists: boolean; hasPermissions: boolean; errors: string[]; warnings: string[] }>;
  validateFactorData(factorData: MFAFactorData): MFAValidationResult;
  
  // Recovery and backup
  generateBackupCodes(factorId: string, count?: number): Promise<{ success: boolean; codes?: string[]; error?: string }>;
  verifyBackupCode(userId: string, code: string): Promise<{ success: boolean; verified: boolean; remaining: number; error?: string }>;
}

/**
 * Default MFA security levels
 */
export const MFA_SECURITY_LEVELS: Record<string, MFASecurityLevel> = {
  basic: {
    name: 'basic',
    description: 'No MFA required - password only',
    requireMFA: false,
    allowedFactorTypes: [],
    minimumFactors: 0,
    maximumFactors: 0,
    enforceBackupCodes: false
  },
  enhanced: {
    name: 'enhanced',
    description: 'Single factor MFA required',
    requireMFA: true,
    allowedFactorTypes: ['totp', 'phone'],
    minimumFactors: 1,
    maximumFactors: 2,
    enforceBackupCodes: true,
    gracePeriodDays: 7
  },
  maximum: {
    name: 'maximum',
    description: 'Multiple factor MFA with backup codes required',
    requireMFA: true,
    allowedFactorTypes: ['totp', 'phone'],
    minimumFactors: 2,
    maximumFactors: 5,
    enforceBackupCodes: true,
    gracePeriodDays: 3
  }
};

/**
 * Default MFA policy
 */
export const DEFAULT_MFA_POLICY: MFAPolicy = {
  enforced: false,
  enforcedForRoles: ['admin'],
  gracePeriodDays: 7,
  maxFactorsPerUser: 5,
  allowedFactorTypes: ['totp', 'phone'],
  requireBackupCodes: true,
  totpSettings: {
    issuer: 'SupaSeed Test',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    window: 1
  },
  phoneSettings: {
    verificationMethod: 'sms',
    rateLimitPerHour: 5
  }
};

/**
 * Type guards for MFA factor types
 */
export function isTOTPFactor(factor: MFAFactor): factor is TOTPFactor {
  return factor.factorType === 'totp' && !!factor.secret;
}

export function isPhoneFactor(factor: MFAFactor): factor is PhoneFactor {
  return factor.factorType === 'phone' && !!factor.phone;
}

export function isTOTPFactorData(data: MFAFactorData): data is TOTPFactorData {
  return data.factorType === 'totp';
}

export function isPhoneFactorData(data: MFAFactorData): data is PhoneFactorData {
  return data.factorType === 'phone';
}

/**
 * Utility functions for MFA operations
 */
export namespace MFAUtils {
  /**
   * Validate phone number format (E.164)
   */
  export function isValidPhoneNumber(phone: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate TOTP code format
   */
  export function isValidTOTPCode(code: string): boolean {
    return /^\d{6}$/.test(code);
  }

  /**
   * Validate backup code format
   */
  export function isValidBackupCode(code: string): boolean {
    return /^[A-Z0-9]{8,12}$/.test(code);
  }

  /**
   * Generate factor ID
   */
  export function generateFactorId(type: MFAFactorType, userId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}_${userId.substring(0, 8)}_${timestamp}_${random}`;
  }

  /**
   * Calculate security score for MFA configuration
   */
  export function calculateSecurityScore(factors: MFAFactor[]): number {
    if (factors.length === 0) return 0;
    
    let score = 0;
    const hasTotp = factors.some(f => f.factorType === 'totp' && f.status === 'verified');
    const hasPhone = factors.some(f => f.factorType === 'phone' && f.status === 'verified');
    const hasBackupCodes = factors.some(f => f.backupCodes && f.backupCodes.length > 0);
    
    if (hasTotp) score += 40;
    if (hasPhone) score += 30;
    if (hasTotp && hasPhone) score += 20; // bonus for diversity
    if (hasBackupCodes) score += 10;
    
    return Math.min(score, 100);
  }

  /**
   * Determine recommended security level based on platform
   */
  export function getRecommendedSecurityLevel(
    platform: { architecture: string; domain: string }
  ): 'basic' | 'enhanced' | 'maximum' {
    // High-security domains
    if (['saas', 'ecommerce'].includes(platform.domain)) {
      return 'maximum';
    }
    
    // Team architectures benefit from enhanced security
    if (platform.architecture === 'team') {
      return 'enhanced';
    }
    
    // Individual platforms can use basic by default
    return 'basic';
  }
}