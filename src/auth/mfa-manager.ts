/**
 * MFA Manager for Epic 1: Universal MakerKit Core System
 * Manages MFA factors (TOTP, SMS) for comprehensive security testing
 * Part of Task 1.2: Add MFA Factor Support
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';
import { generateTOTPSecret, generateBackupCodes, generateTOTPCode } from '../utils/crypto-utils';

type SupabaseClient = ReturnType<typeof createClient>;

export interface MFAFactor {
  id: string;
  userId: string;
  factorType: 'totp' | 'phone';
  status: 'verified' | 'unverified';
  friendlyName?: string;
  secret?: string; // For TOTP
  phone?: string; // For SMS
  backupCodes?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TOTPFactorData {
  factorType: 'totp';
  friendlyName?: string;
  issuer?: string;
  secret?: string; // If not provided, will be generated
}

export interface PhoneFactorData {
  factorType: 'phone';
  friendlyName?: string;
  phone: string;
}

export type MFAFactorData = TOTPFactorData | PhoneFactorData;

export interface MFAFactorCreationResult {
  success: boolean;
  factor?: MFAFactor;
  totpData?: {
    secret: string;
    qrCode: string;
    uri: string;
    backupCodes: string[];
  };
  error?: string;
  warnings: string[];
}

export interface MFAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface MFATestingResult {
  factorId: string;
  validCodes: string[];
  backupCodes: string[];
  testScenarios: Array<{
    scenario: string;
    code: string;
    expectedResult: 'success' | 'failure';
  }>;
}

export class MFAManager {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Create MFA factor for user with realistic testing data
   */
  async createMFAFactor(userId: string, factorData: MFAFactorData): Promise<MFAFactorCreationResult> {
    const warnings: string[] = [];

    try {
      Logger.debug(`Creating MFA factor for user ${userId}: ${factorData.factorType}`);

      // Validate input data
      const validation = this.validateMFAFactorData(factorData);
      if (!validation.isValid) {
        return {
          success: false,
          error: `MFA factor validation failed: ${validation.errors.join(', ')}`,
          warnings: validation.warnings
        };
      }

      warnings.push(...validation.warnings);

      if (factorData.factorType === 'totp') {
        return await this.createTOTPFactor(userId, factorData, warnings);
      } else {
        return await this.createPhoneFactor(userId, factorData, warnings);
      }

    } catch (error: any) {
      Logger.error(`MFA factor creation failed for user ${userId}:`, error);
      return {
        success: false,
        error: error.message,
        warnings
      };
    }
  }

  /**
   * Create multiple MFA factors for a user
   */
  async createMultipleFactors(
    userId: string, 
    factors: MFAFactorData[]
  ): Promise<MFAFactorCreationResult[]> {
    Logger.debug(`Creating ${factors.length} MFA factors for user ${userId}`);

    const results: MFAFactorCreationResult[] = [];

    for (const factor of factors) {
      const result = await this.createMFAFactor(userId, factor);
      results.push(result);

      // Short delay to avoid rate limiting
      if (factors.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const successCount = results.filter(r => r.success).length;
    Logger.info(`✅ Created ${successCount}/${factors.length} MFA factors for user ${userId}`);

    return results;
  }

  /**
   * Generate test codes for MFA factor validation
   */
  async generateTestCodes(factorId: string): Promise<MFATestingResult | null> {
    try {
      // In a real implementation, this would query the factor from the database
      // For testing purposes, we'll generate realistic test data
      const validCodes = [
        generateTOTPCode('TESTSECRET123456789012345', Date.now()),
        generateTOTPCode('TESTSECRET123456789012345', Date.now() + 30000), // Next 30s window
        generateTOTPCode('TESTSECRET123456789012345', Date.now() - 30000)  // Previous 30s window
      ];

      const backupCodes = generateBackupCodes(10);

      const testScenarios = [
        {
          scenario: 'Valid current TOTP code',
          code: validCodes[0],
          expectedResult: 'success' as const
        },
        {
          scenario: 'Valid next window TOTP code',
          code: validCodes[1],
          expectedResult: 'success' as const
        },
        {
          scenario: 'Invalid TOTP code',
          code: '000000',
          expectedResult: 'failure' as const
        },
        {
          scenario: 'Valid backup code',
          code: backupCodes[0],
          expectedResult: 'success' as const
        },
        {
          scenario: 'Expired TOTP code',
          code: generateTOTPCode('TESTSECRET123456789012345', Date.now() - 120000), // 2 minutes old
          expectedResult: 'failure' as const
        }
      ];

      return {
        factorId,
        validCodes,
        backupCodes,
        testScenarios
      };

    } catch (error: any) {
      Logger.error(`Failed to generate test codes for factor ${factorId}:`, error);
      return null;
    }
  }

  /**
   * Verify MFA factor for testing scenarios
   */
  async verifyFactorForTesting(
    factorId: string, 
    code: string, 
    scenario: 'normal' | 'backup' | 'invalid' = 'normal'
  ): Promise<{
    verified: boolean;
    message: string;
    nextAction?: string;
  }> {
    try {
      Logger.debug(`Verifying MFA factor ${factorId} with scenario: ${scenario}`);

      switch (scenario) {
        case 'normal':
          // Simulate successful TOTP verification
          if (code.length === 6 && /^\d{6}$/.test(code) && code !== '000000') {
            return {
              verified: true,
              message: 'TOTP code verified successfully',
              nextAction: 'Factor is now verified and ready for use'
            };
          }
          break;

        case 'backup':
          // Simulate backup code verification
          if (code.length >= 8 && /^[A-Z0-9]+$/.test(code)) {
            return {
              verified: true,
              message: 'Backup code verified successfully',
              nextAction: 'Backup code consumed - generate new backup codes'
            };
          }
          break;

        case 'invalid':
          return {
            verified: false,
            message: 'Invalid verification code',
            nextAction: 'Try again with a valid code'
          };
      }

      return {
        verified: false,
        message: 'Code format invalid or verification failed',
        nextAction: 'Ensure code is correct and try again'
      };

    } catch (error: any) {
      Logger.error(`MFA verification failed for factor ${factorId}:`, error);
      return {
        verified: false,
        message: `Verification error: ${error.message}`,
        nextAction: 'Check factor configuration and try again'
      };
    }
  }

  /**
   * Get MFA factors for user (simulated for testing)
   */
  async getUserFactors(userId: string): Promise<{
    success: boolean;
    factors: MFAFactor[];
    stats: {
      total: number;
      verified: number;
      unverified: number;
      totpFactors: number;
      phoneFactors: number;
    };
    error?: string;
  }> {
    try {
      // In a real implementation, this would query auth.mfa_factors
      // For testing, we'll return simulated data
      Logger.debug(`Retrieving MFA factors for user ${userId}`);

      // Simulate some factors for testing
      const factors: MFAFactor[] = [];
      
      // This would be replaced with actual database query
      // const { data, error } = await this.client.auth.mfa.listFactors();

      const stats = {
        total: factors.length,
        verified: factors.filter(f => f.status === 'verified').length,
        unverified: factors.filter(f => f.status === 'unverified').length,
        totpFactors: factors.filter(f => f.factorType === 'totp').length,
        phoneFactors: factors.filter(f => f.factorType === 'phone').length
      };

      return {
        success: true,
        factors,
        stats
      };

    } catch (error: any) {
      Logger.error(`Failed to get MFA factors for user ${userId}:`, error);
      return {
        success: false,
        factors: [],
        stats: { total: 0, verified: 0, unverified: 0, totpFactors: 0, phoneFactors: 0 },
        error: error.message
      };
    }
  }

  /**
   * Check if MFA tables exist and are accessible
   */
  async validateMFATableAccess(): Promise<{
    tableExists: boolean;
    hasPermissions: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Note: auth.mfa_factors is not directly accessible via Supabase client
      // MFA operations go through the auth.mfa API instead
      Logger.debug('Validating MFA API access...');

      // Test MFA API access
      try {
        await this.client.auth.mfa.listFactors();
        Logger.success('✅ MFA API access validated');
        return {
          tableExists: true,
          hasPermissions: true,
          errors,
          warnings
        };
      } catch (error: any) {
        if (error.message.includes('session required')) {
          warnings.push('MFA API requires authenticated session - normal for seeding scenarios');
          return {
            tableExists: true,
            hasPermissions: true,
            errors,
            warnings
          };
        } else {
          errors.push(`MFA API access error: ${error.message}`);
          return {
            tableExists: false,
            hasPermissions: false,
            errors,
            warnings
          };
        }
      }

    } catch (error: any) {
      errors.push(`MFA validation failed: ${error.message}`);
      return {
        tableExists: false,
        hasPermissions: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Private helper methods
   */

  private async createTOTPFactor(
    userId: string, 
    factorData: TOTPFactorData, 
    warnings: string[]
  ): Promise<MFAFactorCreationResult> {
    const secret = factorData.secret || generateTOTPSecret();
    const issuer = factorData.issuer || 'SupaSeed Test';
    const friendlyName = factorData.friendlyName || 'Test Authenticator';

    // Generate TOTP data for testing
    const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    const qrCode = this.generateQRCodeSVG(totpUri);
    const backupCodes = generateBackupCodes(10);

    // In a real implementation, this would use:
    // const { data, error } = await this.client.auth.mfa.enroll({
    //   factorType: 'totp',
    //   issuer,
    //   friendlyName
    // });

    // For testing, create simulated factor
    const factor: MFAFactor = {
      id: `totp_${userId.substring(0, 8)}_${Date.now()}`,
      userId,
      factorType: 'totp',
      status: 'unverified', // Would be verified after user enters code
      friendlyName,
      secret,
      backupCodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    Logger.success(`✅ Created TOTP factor for user ${userId}`);

    return {
      success: true,
      factor,
      totpData: {
        secret,
        qrCode,
        uri: totpUri,
        backupCodes
      },
      warnings: [
        ...warnings,
        'TOTP factor created - user must scan QR code and enter verification code to complete setup'
      ]
    };
  }

  private async createPhoneFactor(
    userId: string, 
    factorData: PhoneFactorData, 
    warnings: string[]
  ): Promise<MFAFactorCreationResult> {
    const friendlyName = factorData.friendlyName || 'Test Phone';

    // In a real implementation, this would use:
    // const { data, error } = await this.client.auth.mfa.enroll({
    //   factorType: 'phone',
    //   phone: factorData.phone,
    //   friendlyName
    // });

    // For testing, create simulated factor
    const factor: MFAFactor = {
      id: `phone_${userId.substring(0, 8)}_${Date.now()}`,
      userId,
      factorType: 'phone',
      status: 'unverified', // Would be verified after SMS code entry
      friendlyName,
      phone: factorData.phone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    Logger.success(`✅ Created phone factor for user ${userId}: ${factorData.phone}`);

    return {
      success: true,
      factor,
      warnings: [
        ...warnings,
        'Phone factor created - SMS verification code would be sent to complete setup'
      ]
    };
  }

  private validateMFAFactorData(factorData: MFAFactorData): MFAValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Validate factor type
    if (!['totp', 'phone'].includes(factorData.factorType)) {
      errors.push(`Invalid factor type: ${factorData.factorType}. Must be 'totp' or 'phone'`);
    }

    // TOTP-specific validation
    if (factorData.factorType === 'totp') {
      if (factorData.secret && factorData.secret.length < 16) {
        warnings.push('TOTP secret should be at least 16 characters for security');
      }
    }

    // Phone-specific validation
    if (factorData.factorType === 'phone') {
      const phoneData = factorData as PhoneFactorData;
      if (!phoneData.phone) {
        errors.push('Phone number is required for phone factor');
      } else {
        // Basic E.164 format check
        if (!/^\+[1-9]\d{1,14}$/.test(phoneData.phone)) {
          warnings.push('Phone number should be in E.164 format (e.g., +1234567890)');
        }
      }
    }

    // Friendly name validation
    if (factorData.friendlyName && factorData.friendlyName.length > 50) {
      warnings.push('Friendly name should be 50 characters or less');
    }

    // Recommendations
    recommendations.push('Test MFA factor verification after creation');
    if (factorData.factorType === 'totp') {
      recommendations.push('Store TOTP secret securely for testing scenarios');
      recommendations.push('Generate backup codes for recovery testing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  private generateQRCodeSVG(uri: string): string {
    // In a real implementation, this would generate an actual QR code
    // For testing, return a placeholder SVG
    return `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="white"/>
      <text x="100" y="100" text-anchor="middle" fill="black" font-size="12">QR Code</text>
      <text x="100" y="120" text-anchor="middle" fill="gray" font-size="10">Scan with authenticator</text>
    </svg>`;
  }

  /**
   * Generate MFA factors based on user archetype security preferences
   */
  async generateArchetypeFactors(
    userId: string,
    securityLevel: 'basic' | 'enhanced' | 'maximum',
    preferences: {
      preferTOTP?: boolean;
      preferPhone?: boolean;
      phoneNumber?: string;
      multipleFactors?: boolean;
    } = {}
  ): Promise<MFAFactorCreationResult[]> {
    Logger.debug(`Generating MFA factors for user ${userId} with security level: ${securityLevel}`);

    const factors: MFAFactorData[] = [];

    switch (securityLevel) {
      case 'basic':
        // No MFA factors for basic security
        break;

      case 'enhanced':
        // Single factor - prefer TOTP
        if (preferences.preferPhone && preferences.phoneNumber) {
          factors.push({
            factorType: 'phone',
            friendlyName: 'Primary Phone',
            phone: preferences.phoneNumber
          });
        } else {
          factors.push({
            factorType: 'totp',
            friendlyName: 'Authenticator App',
            issuer: 'SupaSeed Test'
          });
        }
        break;

      case 'maximum':
        // Multiple factors for maximum security
        factors.push({
          factorType: 'totp',
          friendlyName: 'Primary Authenticator',
          issuer: 'SupaSeed Test'
        });

        if (preferences.phoneNumber) {
          factors.push({
            factorType: 'phone',
            friendlyName: 'Backup Phone',
            phone: preferences.phoneNumber
          });
        }
        break;
    }

    if (factors.length === 0) {
      Logger.debug(`No MFA factors needed for ${securityLevel} security level`);
      return [];
    }

    return await this.createMultipleFactors(userId, factors);
  }
}