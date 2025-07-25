/**
 * Crypto Utilities for MFA and Security Testing
 * Provides TOTP generation, backup codes, and crypto functions for testing
 * Part of Task 1.2: Add MFA Factor Support
 */

import { createHash, randomBytes } from 'crypto';

/**
 * Generate a secure TOTP secret
 */
export function generateTOTPSecret(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32 characters
  let secret = '';
  
  for (let i = 0; i < length; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return secret;
}

/**
 * Generate TOTP code for testing
 * This is a simplified implementation for testing purposes
 */
export function generateTOTPCode(secret: string, timestamp: number): string {
  // Simplified TOTP algorithm for testing
  // In production, use a proper TOTP library like 'otplib'
  
  const timeStep = Math.floor(timestamp / 30000); // 30-second window
  const hash = createHash('sha1');
  hash.update(secret + timeStep.toString());
  const hashDigest = hash.digest('hex');
  
  // Extract 6-digit code from hash
  const offset = parseInt(hashDigest.slice(-1), 16) & 0xf;
  const code = parseInt(hashDigest.substr(offset * 2, 8), 16) & 0x7fffffff;
  
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Generate backup codes for MFA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric backup code
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  
  return codes;
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
  return /^[A-F0-9]{8}$/.test(code);
}

/**
 * Generate secure random string
 */
export function generateSecureString(length: number): string {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Hash password for testing (simple implementation)
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Generate realistic phone number for testing
 */
export function generateTestPhoneNumber(countryCode: string = '+1'): string {
  const areaCode = Math.floor(Math.random() * 900) + 100; // 100-999
  const exchange = Math.floor(Math.random() * 900) + 100; // 100-999
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
  
  return `${countryCode}${areaCode}${exchange}${number}`;
}

/**
 * Generate JWT-like token for testing
 */
export function generateTestJWT(payload: Record<string, any>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHash('sha256')
    .update(encodedHeader + '.' + encodedPayload + 'test-secret')
    .digest('base64url');
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Generate challenge ID for MFA testing
 */
export function generateChallengeId(): string {
  return 'challenge_' + generateSecureString(16);
}

/**
 * Generate factor ID for MFA testing
 */
export function generateFactorId(type: 'totp' | 'phone'): string {
  return `${type}_` + generateSecureString(16);
}