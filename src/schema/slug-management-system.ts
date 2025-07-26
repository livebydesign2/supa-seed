/**
 * Advanced Slug Management System for Epic 1: Universal MakerKit Core System
 * Comprehensive slug generation, validation, and collision handling for team accounts
 * Part of Task 1.5.3: Implement advanced slug management system for team accounts
 */

import { Logger } from '../utils/logger';
import { createClient } from '@supabase/supabase-js';

/**
 * Configuration options for slug generation
 */
export interface SlugGenerationOptions {
  maxLength?: number;
  allowNumbers?: boolean;
  allowHyphens?: boolean;
  forceLowercase?: boolean;
  addTimestamp?: boolean;
  customSeparator?: string;
  reservedSlugs?: string[];
  collisionStrategy?: 'increment' | 'timestamp' | 'random' | 'uuid';
}

/**
 * Result of slug validation operation
 */
export interface SlugValidationResult {
  isValid: boolean;
  normalizedSlug: string;
  issues: string[];
  suggestions: string[];
  collisionDetected: boolean;
  alternativeSlugs: string[];
}

/**
 * Slug collision resolution result
 */
export interface SlugCollisionResult {
  originalSlug: string;
  resolvedSlug: string;
  strategy: string;
  attempts: number;
  alternativesGenerated: string[];
}

/**
 * Advanced Slug Manager for MakerKit team accounts
 */
export class AdvancedSlugManager {
  private client?: any;
  private defaultOptions: SlugGenerationOptions = {
    maxLength: 50,
    allowNumbers: true,
    allowHyphens: true,
    forceLowercase: true,
    addTimestamp: false,
    customSeparator: '-',
    reservedSlugs: [
      'admin', 'api', 'app', 'auth', 'billing', 'dashboard', 'docs', 'help',
      'home', 'login', 'logout', 'profile', 'settings', 'signup', 'support',
      'team', 'teams', 'user', 'users', 'www', 'mail', 'email', 'ftp', 'blog',
      'news', 'test', 'demo', 'staging', 'prod', 'production', 'dev', 'development'
    ],
    collisionStrategy: 'increment'
  };

  constructor(client?: any) {
    this.client = client;
  }

  /**
   * Generate a unique slug for team accounts with comprehensive validation
   */
  async generateUniqueSlug(
    baseName: string,
    tableName: string = 'accounts',
    options: Partial<SlugGenerationOptions> = {}
  ): Promise<string> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Step 1: Normalize the base name
    let slug = this.normalizeSlug(baseName, mergedOptions);
    
    // Step 2: Validate against reserved slugs
    if (this.isReservedSlug(slug, mergedOptions.reservedSlugs)) {
      slug = await this.resolveReservedSlugCollision(slug, mergedOptions);
    }
    
    // Step 3: Check for database collisions
    if (this.client) {
      const collisionResult = await this.resolveSlugCollision(slug, tableName, mergedOptions);
      slug = collisionResult.resolvedSlug;
    }
    
    Logger.debug(`Generated unique slug: ${slug} from base: ${baseName}`);
    return slug;
  }

  /**
   * Validate an existing slug and provide suggestions for improvement
   */
  async validateSlug(
    slug: string,
    tableName: string = 'accounts',
    options: Partial<SlugGenerationOptions> = {}
  ): Promise<SlugValidationResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const result: SlugValidationResult = {
      isValid: true,
      normalizedSlug: slug,
      issues: [],
      suggestions: [],
      collisionDetected: false,
      alternativeSlugs: []
    };

    // Basic format validation
    const formatIssues = this.validateSlugFormat(slug, mergedOptions);
    result.issues.push(...formatIssues);

    // Normalize the slug
    const normalizedSlug = this.normalizeSlug(slug, mergedOptions);
    if (normalizedSlug !== slug) {
      result.normalizedSlug = normalizedSlug;
      result.suggestions.push(`Consider using normalized version: ${normalizedSlug}`);
    }

    // Check for reserved slug conflicts
    if (this.isReservedSlug(normalizedSlug, mergedOptions.reservedSlugs)) {
      result.issues.push('Slug conflicts with reserved system slug');
      result.isValid = false;
      result.alternativeSlugs = this.generateAlternativeReservedSlugs(normalizedSlug);
    }

    // Check for database collisions
    if (this.client) {
      const hasCollision = await this.checkSlugCollision(normalizedSlug, tableName);
      if (hasCollision) {
        result.collisionDetected = true;
        result.isValid = false;
        result.issues.push('Slug already exists in database');
        
        // Generate alternatives
        result.alternativeSlugs = await this.generateAlternativeSlugs(
          normalizedSlug, 
          tableName, 
          mergedOptions
        );
      }
    }

    // Generate suggestions for improvement
    if (result.issues.length === 0) {
      result.suggestions = this.generateSlugImprovementSuggestions(normalizedSlug);
    }

    return result;
  }

  /**
   * Normalize a slug according to MakerKit standards
   */
  normalizeSlug(input: string, options: SlugGenerationOptions): string {
    let slug = input.toString().trim();

    // Force lowercase if required
    if (options.forceLowercase) {
      slug = slug.toLowerCase();
    }

    // Remove accents and special characters
    slug = slug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Replace spaces and underscores with separator
    const separator = options.customSeparator || '-';
    slug = slug.replace(/[\s_]+/g, separator);

    // Remove disallowed characters
    if (!options.allowNumbers) {
      slug = slug.replace(/[0-9]/g, '');
    }
    
    if (!options.allowHyphens && separator !== '-') {
      slug = slug.replace(/-/g, '');
    }

    // Remove special characters (keep only alphanumeric and allowed separators)
    const allowedChars = options.allowNumbers ? 'a-z0-9' : 'a-z';
    const separatorRegex = options.allowHyphens ? '-' : '';
    const pattern = new RegExp(`[^${allowedChars}${separatorRegex}${separator}]`, 'g');
    slug = slug.replace(pattern, '');

    // Clean up multiple separators
    const multiSeparatorRegex = new RegExp(`${separator}+`, 'g');
    slug = slug.replace(multiSeparatorRegex, separator);

    // Remove leading/trailing separators
    const leadingTrailingRegex = new RegExp(`^${separator}|${separator}$`, 'g');
    slug = slug.replace(leadingTrailingRegex, '');

    // Enforce maximum length
    if (options.maxLength && slug.length > options.maxLength) {
      slug = slug.substring(0, options.maxLength);
      // Ensure we don't end with a separator after truncation
      slug = slug.replace(new RegExp(`${separator}$`), '');
    }

    // Add timestamp if requested
    if (options.addTimestamp) {
      const timestamp = Date.now().toString().slice(-6);
      const maxBaseLength = (options.maxLength || 50) - timestamp.length - 1;
      if (slug.length > maxBaseLength) {
        slug = slug.substring(0, maxBaseLength);
      }
      slug = `${slug}${separator}${timestamp}`;
    }

    return slug || 'team'; // Fallback if slug becomes empty
  }

  /**
   * Check if a slug collides with existing records in the database
   */
  private async checkSlugCollision(slug: string, tableName: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      const { data, error } = await this.client
        .from(tableName)
        .select('slug')
        .eq('slug', slug)
        .limit(1);

      if (error) {
        Logger.warn(`Error checking slug collision: ${error.message}`);
        return false;
      }

      return data && data.length > 0;
    } catch (error: any) {
      Logger.warn(`Error checking slug collision: ${error.message}`);
      return false;
    }
  }

  /**
   * Resolve slug collision using specified strategy
   */
  private async resolveSlugCollision(
    slug: string,
    tableName: string,
    options: SlugGenerationOptions
  ): Promise<SlugCollisionResult> {
    const result: SlugCollisionResult = {
      originalSlug: slug,
      resolvedSlug: slug,
      strategy: options.collisionStrategy || 'increment',
      attempts: 0,
      alternativesGenerated: []
    };

    let currentSlug = slug;
    let hasCollision = await this.checkSlugCollision(currentSlug, tableName);

    while (hasCollision && result.attempts < 50) {
      result.attempts++;
      
      switch (options.collisionStrategy) {
        case 'increment':
          currentSlug = `${slug}-${result.attempts}`;
          break;
        case 'timestamp':
          const timestamp = Date.now().toString().slice(-6);
          currentSlug = `${slug}-${timestamp}`;
          break;
        case 'random':
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          currentSlug = `${slug}-${randomSuffix}`;
          break;
        case 'uuid':
          const uuidSuffix = this.generateShortUuid();
          currentSlug = `${slug}-${uuidSuffix}`;
          break;
        default:
          currentSlug = `${slug}-${result.attempts}`;
      }

      // Ensure new slug doesn't exceed length limits
      if (options.maxLength && currentSlug.length > options.maxLength) {
        const excess = currentSlug.length - options.maxLength;
        const baseSlug = slug.substring(0, slug.length - excess);
        currentSlug = currentSlug.replace(slug, baseSlug);
      }

      result.alternativesGenerated.push(currentSlug);
      hasCollision = await this.checkSlugCollision(currentSlug, tableName);
    }

    result.resolvedSlug = currentSlug;
    return result;
  }

  /**
   * Validate slug format against rules
   */
  private validateSlugFormat(slug: string, options: SlugGenerationOptions): string[] {
    const issues: string[] = [];

    // Check length
    if (options.maxLength && slug.length > options.maxLength) {
      issues.push(`Slug exceeds maximum length of ${options.maxLength} characters`);
    }

    if (slug.length === 0) {
      issues.push('Slug cannot be empty');
    }

    // Check for invalid characters
    const allowedChars = options.allowNumbers ? 'a-z0-9' : 'a-z';
    const separatorChar = options.customSeparator || '-';
    const hyphensAllowed = options.allowHyphens ? '-' : '';
    const pattern = new RegExp(`^[${allowedChars}${hyphensAllowed}${separatorChar}]+$`, 'i');
    
    if (!pattern.test(slug)) {
      issues.push('Slug contains invalid characters');
    }

    // Check for leading/trailing separators
    if (slug.startsWith(separatorChar) || slug.endsWith(separatorChar)) {
      issues.push('Slug cannot start or end with separator');
    }

    // Check for consecutive separators
    const consecutivePattern = new RegExp(`${separatorChar}{2,}`);
    if (consecutivePattern.test(slug)) {
      issues.push('Slug cannot contain consecutive separators');
    }

    return issues;
  }

  /**
   * Check if slug is reserved
   */
  private isReservedSlug(slug: string, reservedSlugs?: string[]): boolean {
    const reserved = reservedSlugs || this.defaultOptions.reservedSlugs || [];
    return reserved.includes(slug.toLowerCase());
  }

  /**
   * Resolve reserved slug collision
   */
  private async resolveReservedSlugCollision(
    slug: string,
    options: SlugGenerationOptions
  ): Promise<string> {
    const strategies = ['team', 'org', 'group', 'company'];
    
    for (const strategy of strategies) {
      const candidate = `${strategy}-${slug}`;
      if (!this.isReservedSlug(candidate, options.reservedSlugs)) {
        return candidate;
      }
    }

    // Fallback to timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `${slug}-${timestamp}`;
  }

  /**
   * Generate alternative slugs for reserved conflicts
   */
  private generateAlternativeReservedSlugs(slug: string): string[] {
    const prefixes = ['team', 'org', 'group', 'my', 'the'];
    const suffixes = ['team', 'org', 'group', 'inc', 'co'];
    
    const alternatives: string[] = [];
    
    prefixes.forEach(prefix => {
      alternatives.push(`${prefix}-${slug}`);
    });
    
    suffixes.forEach(suffix => {
      alternatives.push(`${slug}-${suffix}`);
    });

    return alternatives.slice(0, 5); // Return top 5 alternatives
  }

  /**
   * Generate alternative slugs for database collisions
   */
  private async generateAlternativeSlugs(
    slug: string,
    tableName: string,
    options: SlugGenerationOptions
  ): Promise<string[]> {
    const alternatives: string[] = [];
    
    // Strategy 1: Increment numbers
    for (let i = 1; i <= 5; i++) {
      const candidate = `${slug}-${i}`;
      const hasCollision = await this.checkSlugCollision(candidate, tableName);
      if (!hasCollision) {
        alternatives.push(candidate);
      }
    }

    // Strategy 2: Add descriptive suffixes
    const suffixes = ['team', 'org', 'group', 'co', 'inc'];
    for (const suffix of suffixes) {
      const candidate = `${slug}-${suffix}`;
      const hasCollision = await this.checkSlugCollision(candidate, tableName);
      if (!hasCollision) {
        alternatives.push(candidate);
      }
    }

    return alternatives.slice(0, 5);
  }

  /**
   * Generate suggestions for slug improvement
   */
  private generateSlugImprovementSuggestions(slug: string): string[] {
    const suggestions: string[] = [];

    // Check for common issues and suggest improvements
    if (slug.length < 3) {
      suggestions.push('Consider using a longer, more descriptive slug');
    }

    if (slug.length > 30) {
      suggestions.push('Consider shortening the slug for better readability');
    }

    if (!/[a-z]/.test(slug)) {
      suggestions.push('Include letters for better readability');
    }

    if (slug.split('-').length > 4) {
      suggestions.push('Consider reducing the number of segments for simplicity');
    }

    return suggestions;
  }

  /**
   * Generate a short UUID-like string
   */
  private generateShortUuid(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Batch validate multiple slugs
   */
  async batchValidateSlugs(
    slugs: string[],
    tableName: string = 'accounts',
    options: Partial<SlugGenerationOptions> = {}
  ): Promise<Map<string, SlugValidationResult>> {
    const results = new Map<string, SlugValidationResult>();
    
    for (const slug of slugs) {
      const result = await this.validateSlug(slug, tableName, options);
      results.set(slug, result);
    }

    return results;
  }

  /**
   * Get slug generation statistics
   */
  getSlugStatistics(slugs: string[]): {
    averageLength: number;
    mostCommonPattern: string;
    reservedConflicts: number;
    formatIssues: number;
  } {
    const lengths = slugs.map(s => s.length);
    const averageLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    // Find most common pattern (simplified)
    const patterns = slugs.map(s => s.replace(/[0-9]/g, '#').replace(/[a-z]/g, 'a'));
    const patternCounts = patterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonPattern = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';

    const reservedConflicts = slugs.filter(s => 
      this.isReservedSlug(s, this.defaultOptions.reservedSlugs)
    ).length;

    const formatIssues = slugs.filter(s => 
      this.validateSlugFormat(s, this.defaultOptions).length > 0
    ).length;

    return {
      averageLength,
      mostCommonPattern,
      reservedConflicts,
      formatIssues
    };
  }
}

/**
 * Utility functions for slug management
 */
export class SlugUtils {
  /**
   * Extract potential slug base from various data sources
   */
  static extractSlugBase(data: any): string {
    const candidates = [
      data.name,
      data.organization_name,
      data.account_name,
      data.company_name,
      data.team_name,
      data.title,
      data.display_name
    ].filter(Boolean);

    return candidates[0] || 'team';
  }

  /**
   * Suggest slug based on business context
   */
  static suggestContextualSlug(data: any): string {
    const base = SlugUtils.extractSlugBase(data);
    
    // Add context based on account type
    if (data.account_type === 'enterprise') {
      return `${base}-enterprise`;
    }
    
    if (data.industry) {
      return `${base}-${data.industry}`;
    }
    
    if (data.location) {
      return `${base}-${data.location}`;
    }

    return base;
  }

  /**
   * Check if slug follows MakerKit naming conventions
   */
  static followsMakerKitConventions(slug: string): boolean {
    // MakerKit conventions: lowercase, hyphens, no special chars
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && 
           slug.length >= 3 && 
           slug.length <= 50;
  }

  /**
   * Convert various naming formats to slug format
   */
  static convertToSlugFormat(input: string, format: 'camelCase' | 'snake_case' | 'Title Case' | 'UPPER'): string {
    let converted = input;

    switch (format) {
      case 'camelCase':
        converted = input.replace(/([A-Z])/g, '-$1').toLowerCase();
        break;
      case 'snake_case':
        converted = input.replace(/_/g, '-');
        break;
      case 'Title Case':
        converted = input.replace(/\s+/g, '-').toLowerCase();
        break;
      case 'UPPER':
        converted = input.toLowerCase().replace(/\s+/g, '-');
        break;
    }

    return converted.replace(/-+/g, '-').replace(/^-|-$/g, '');
  }
}

export default AdvancedSlugManager;