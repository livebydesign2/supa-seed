import { createHash, randomBytes } from 'crypto';

/**
 * Hash a password for seeding purposes
 * Note: In production, Supabase handles password hashing automatically
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256');
  hash.update(password + salt);
  return hash.digest('hex') + ':' + salt;
}

/**
 * Generate a secure random password for test users
 */
export function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * Generate a valid email address for seeding with guaranteed uniqueness
 */
export function generateTestEmail(username: string, domain: string = 'supaseed.test'): string {
  // Add timestamp + random to ensure uniqueness (faker is seeded so usernames repeat)
  const timestamp = Date.now().toString().slice(-6);
  const randomId = Math.floor(Math.random() * 10000);
  const uniqueUsername = `${username.toLowerCase()}_${timestamp}_${randomId}`;
  return `${uniqueUsername}@${domain}`;
}

/**
 * Generate realistic usernames based on domain configuration
 */
export function generateUsername(
  firstName: string, 
  lastName: string, 
  suffixes: string[] = ['user', 'member', 'pro', 'fan', 'creator']
): string {
  const formats = [
    `${firstName.toLowerCase()}_${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
    `${lastName.toLowerCase()}_${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
    `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}_${Math.floor(Math.random() * 99)}`,
    `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}_${suffixes[0]}`,
    `${firstName.toLowerCase()}_${Math.floor(Math.random() * 999)}`,
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use generateUsername instead
 */
export function generateOutdoorUsername(firstName: string, lastName: string): string {
  const outdoorSuffixes = [
    'hiker', 'climber', 'explorer', 'wanderer', 'adventurer', 
    'camper', 'backpacker', 'outdoors', 'trails', 'peaks',
    'wild', 'summit', 'trek', 'journey', 'roam'
  ];
  return generateUsername(firstName, lastName, outdoorSuffixes);
} 