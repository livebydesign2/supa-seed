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
 * Generate a valid email address for seeding
 */
export function generateTestEmail(username: string, domain: string = 'supaseed.test'): string {
  return `${username.toLowerCase()}@${domain}`;
}

/**
 * Generate realistic usernames for outdoor enthusiasts
 */
export function generateOutdoorUsername(firstName: string, lastName: string): string {
  const outdoorSuffixes = [
    'hiker', 'climber', 'explorer', 'wanderer', 'adventurer', 
    'camper', 'backpacker', 'outdoors', 'trails', 'peaks',
    'wild', 'summit', 'trek', 'journey', 'roam'
  ];
  
  const formats = [
    `${firstName.toLowerCase()}_${outdoorSuffixes[Math.floor(Math.random() * outdoorSuffixes.length)]}`,
    `${lastName.toLowerCase()}_${outdoorSuffixes[Math.floor(Math.random() * outdoorSuffixes.length)]}`,
    `${firstName.toLowerCase()}${lastName.charAt(0).toLowerCase()}_${Math.floor(Math.random() * 99)}`,
    `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}_outdoors`,
    `${firstName.toLowerCase()}_adventures`,
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
} 