/**
 * Data Volume Management System for Epic 7: Configuration Extensibility Framework
 * Manages realistic data volume configuration and generation patterns
 */

import { ExtendedSeedConfig } from '../core/types/config-types';
import { Logger } from '../../core/utils/logger';

export interface DataVolumeProfile {
  name: string;
  description: string;
  userCount: number;
  avgItemsPerUser: number;
  avgRelationshipsPerItem: number;
  dataQualityLevel: 'basic' | 'rich' | 'production';
  environment: 'development' | 'staging' | 'production';
  estimatedSeedingTime: number; // in seconds
  storageRequirement: number; // in MB
}

export interface DataGenerationMetrics {
  totalUsers: number;
  totalItems: number;
  totalRelationships: number;
  publicContentCount: number;
  privateContentCount: number;
  draftContentCount: number;
  estimatedDatabaseSize: number; // in MB
  estimatedSeedingTime: number; // in seconds
}

export interface DomainSpecificPatterns {
  domain: string;
  contentTypes: string[];
  relationshipPatterns: Array<{
    from: string;
    to: string;
    expectedRatio: number;
    description: string;
  }>;
  seasonalFactors: Array<{
    period: string;
    multiplier: number;
    affects: string[];
  }>;
  userBehaviorProfiles: Array<{
    type: string;
    percentage: number;
    activityLevel: 'low' | 'medium' | 'high';
    contentCreationRate: number;
  }>;
}

export class DataVolumeManager {
  private domainPatterns: Map<string, DomainSpecificPatterns> = new Map();

  constructor() {
    this.initializeDomainPatterns();
  }

  /**
   * Generate comprehensive data volume configuration
   */
  generateDataVolumeConfiguration(requirements: {
    environment: 'development' | 'staging' | 'production';
    testingScenarios: string[];
    expectedLoad: 'light' | 'medium' | 'heavy';
    domainType?: string;
    customConstraints?: {
      maxUsers?: number;
      maxSeedingTime?: number; // in seconds
      maxDatabaseSize?: number; // in MB
    };
  }): ExtendedSeedConfig['dataVolumes'] {
    Logger.info(`📊 Generating data volume configuration for ${requirements.environment} environment`);

    const domainPattern = this.domainPatterns.get(requirements.domainType || 'general');
    const baseVolumes = this.getBaseVolumesByEnvironment(requirements.environment);
    const loadMultiplier = this.getLoadMultiplier(requirements.expectedLoad);

    // Apply custom constraints
    let adjustedVolumes = {
      users: Math.round(baseVolumes.users * loadMultiplier),
      avgItems: Math.round(baseVolumes.avgItems * loadMultiplier),
      relationships: Math.round(baseVolumes.relationships * loadMultiplier)
    };

    if (requirements.customConstraints) {
      if (requirements.customConstraints.maxUsers && adjustedVolumes.users > requirements.customConstraints.maxUsers) {
        const reductionFactor = requirements.customConstraints.maxUsers / adjustedVolumes.users;
        adjustedVolumes.users = requirements.customConstraints.maxUsers;
        adjustedVolumes.avgItems = Math.round(adjustedVolumes.avgItems * reductionFactor);
        adjustedVolumes.relationships = Math.round(adjustedVolumes.relationships * reductionFactor);
      }
    }

    // Generate content ratios based on domain and environment
    const contentRatios = this.generateContentRatios(requirements.environment, domainPattern);
    
    // Generate relationship density patterns
    const relationshipDensity = this.generateRelationshipDensity(adjustedVolumes, domainPattern);

    // Create volume profiles
    const volumeProfiles = this.generateVolumeProfiles(adjustedVolumes, requirements);

    return {
      enabled: true,
      patterns: {
        userDistribution: this.selectUserDistribution(requirements.environment, requirements.expectedLoad),
        contentRatios,
        relationshipDensity,
        seasonalVariation: requirements.environment !== 'development' && !!domainPattern?.seasonalFactors.length,
        activityCycles: requirements.environment === 'production'
      },
      volumeProfiles
    };
  }

  /**
   * Calculate data generation metrics
   */
  calculateGenerationMetrics(config: ExtendedSeedConfig): DataGenerationMetrics {
    if (!config.dataVolumes?.enabled) {
      // Use basic configuration values
      const totalUsers = config.userCount || 5;
      const totalItems = totalUsers * (config.setupsPerUser || 2);
      
      return {
        totalUsers,
        totalItems,
        totalRelationships: totalItems * 2, // Estimate
        publicContentCount: Math.round(totalItems * 0.75),
        privateContentCount: Math.round(totalItems * 0.25),
        draftContentCount: 0,
        estimatedDatabaseSize: this.estimateDatabaseSize(totalUsers, totalItems),
        estimatedSeedingTime: this.estimateSeedingTime(totalUsers, totalItems)
      };
    }

    // Use the standard profile or calculate from patterns
    const standardProfile = config.dataVolumes.volumeProfiles.find(p => p.name === 'standard') ||
                           config.dataVolumes.volumeProfiles[0];

    if (!standardProfile) {
      throw new Error('No volume profile available for metrics calculation');
    }

    const totalUsers = standardProfile.userCount;
    const totalItems = totalUsers * standardProfile.avgItemsPerUser;
    const totalRelationships = totalItems * standardProfile.avgRelationshipsPerItem;

    const ratios = config.dataVolumes.patterns.contentRatios;
    const publicContentCount = Math.round(totalItems * ratios.publicContent);
    const privateContentCount = Math.round(totalItems * ratios.privateContent);
    const draftContentCount = Math.round(totalItems * ratios.draftContent);

    return {
      totalUsers,
      totalItems,
      totalRelationships,
      publicContentCount,
      privateContentCount,
      draftContentCount,
      estimatedDatabaseSize: this.estimateDatabaseSize(totalUsers, totalItems, standardProfile.dataQualityLevel),
      estimatedSeedingTime: this.estimateSeedingTime(totalUsers, totalItems, standardProfile.dataQualityLevel)
    };
  }

  /**
   * Get recommended profile for specific use case
   */
  getRecommendedProfile(useCase: 'ci-testing' | 'development' | 'demo' | 'load-testing' | 'production'): DataVolumeProfile {
    const profiles: Record<string, DataVolumeProfile> = {
      'ci-testing': {
        name: 'ci-minimal',
        description: 'Minimal data for CI/CD pipeline testing',
        userCount: 2,
        avgItemsPerUser: 1,
        avgRelationshipsPerItem: 1,
        dataQualityLevel: 'basic',
        environment: 'development',
        estimatedSeedingTime: 5,
        storageRequirement: 1
      },
      'development': {
        name: 'dev-standard',
        description: 'Standard development data set',
        userCount: 5,
        avgItemsPerUser: 3,
        avgRelationshipsPerItem: 2,
        dataQualityLevel: 'basic',
        environment: 'development',
        estimatedSeedingTime: 15,
        storageRequirement: 5
      },
      'demo': {
        name: 'demo-showcase',
        description: 'Rich data for demonstrations',
        userCount: 25,
        avgItemsPerUser: 5,
        avgRelationshipsPerItem: 4,
        dataQualityLevel: 'rich',
        environment: 'staging',
        estimatedSeedingTime: 45,
        storageRequirement: 25
      },
      'load-testing': {
        name: 'load-test',
        description: 'High volume data for load testing',
        userCount: 500,
        avgItemsPerUser: 10,
        avgRelationshipsPerItem: 8,
        dataQualityLevel: 'basic',
        environment: 'staging',
        estimatedSeedingTime: 300,
        storageRequirement: 200
      },
      'production': {
        name: 'prod-demo',
        description: 'Production-quality demo data',
        userCount: 100,
        avgItemsPerUser: 8,
        avgRelationshipsPerItem: 6,
        dataQualityLevel: 'production',
        environment: 'production',
        estimatedSeedingTime: 120,
        storageRequirement: 100
      }
    };

    return profiles[useCase];
  }

  /**
   * Validate data volume configuration
   */
  validateDataVolumeConfiguration(config: ExtendedSeedConfig['dataVolumes']): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    if (!config?.enabled) {
      return {
        valid: true,
        errors,
        warnings: ['Data volume configuration is disabled'],
        recommendations: ['Consider enabling data volume configuration for better data generation patterns']
      };
    }

    // Validate content ratios
    const ratios = config.patterns.contentRatios;
    const totalRatio = ratios.publicContent + ratios.privateContent + ratios.draftContent;
    
    if (Math.abs(totalRatio - 1.0) > 0.01) {
      errors.push(`Content ratios must sum to 1.0, got ${totalRatio.toFixed(3)}`);
    }

    // Validate individual ratios
    Object.entries(ratios).forEach(([key, value]) => {
      if (value < 0 || value > 1) {
        errors.push(`${key} ratio must be between 0 and 1, got ${value}`);
      }
    });

    // Validate relationship density
    const density = config.patterns.relationshipDensity;
    if (density.userToContent <= 0) {
      errors.push('userToContent density must be greater than 0');
    }
    if (density.crossReferences < 0) {
      errors.push('crossReferences density must be 0 or greater');
    }
    if (density.tagConnections < 0) {
      errors.push('tagConnections density must be 0 or greater');
    }

    // Validate volume profiles
    config.volumeProfiles?.forEach((profile, index) => {
      if (!profile.name) {
        errors.push(`Volume profile at index ${index} must have a name`);
      }
      if (profile.userCount <= 0) {
        errors.push(`Volume profile '${profile.name}' userCount must be greater than 0`);
      }
      if (profile.avgItemsPerUser <= 0) {
        errors.push(`Volume profile '${profile.name}' avgItemsPerUser must be greater than 0`);
      }
      if (!['basic', 'rich', 'production'].includes(profile.dataQualityLevel)) {
        errors.push(`Volume profile '${profile.name}' dataQualityLevel must be one of: basic, rich, production`);
      }
    });

    // Generate warnings and recommendations
    if (config.patterns.userDistribution === 'exponential') {
      warnings.push('Exponential user distribution may create very uneven data patterns');
    }

    if (config.patterns.seasonalVariation && !config.patterns.activityCycles) {
      recommendations.push('Consider enabling activity cycles when using seasonal variation for more realistic patterns');
    }

    const largestProfile = config.volumeProfiles?.reduce((max, profile) => 
      profile.userCount > (max?.userCount || 0) ? profile : max
    );

    if (largestProfile && largestProfile.userCount > 1000) {
      warnings.push(`Large data volumes detected (${largestProfile.userCount} users) - consider seeding time and resource requirements`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations: [
        ...recommendations,
        `Configuration validated for ${config.volumeProfiles?.length || 0} volume profiles`
      ]
    };
  }

  /**
   * Private helper methods
   */

  private getBaseVolumesByEnvironment(environment: string) {
    const baseVolumes: Record<string, { users: number; avgItems: number; relationships: number }> = {
      development: { users: 5, avgItems: 3, relationships: 2 },
      staging: { users: 25, avgItems: 6, relationships: 4 },
      production: { users: 100, avgItems: 10, relationships: 6 }
    };
    return baseVolumes[environment] || baseVolumes.development;
  }

  private getLoadMultiplier(expectedLoad: string): number {
    const multipliers: Record<string, number> = {
      light: 0.7,
      medium: 1.0,
      heavy: 1.5
    };
    return multipliers[expectedLoad] || 1.0;
  }

  private generateContentRatios(environment: string, domainPattern?: DomainSpecificPatterns) {
    // Default ratios
    let ratios = {
      publicContent: 0.75,
      privateContent: 0.20,
      draftContent: 0.05
    };

    // Adjust based on environment
    switch (environment) {
      case 'development':
        ratios = { publicContent: 0.8, privateContent: 0.2, draftContent: 0.0 };
        break;
      case 'staging':
        ratios = { publicContent: 0.7, privateContent: 0.25, draftContent: 0.05 };
        break;
      case 'production':
        ratios = { publicContent: 0.6, privateContent: 0.35, draftContent: 0.05 };
        break;
    }

    // Adjust based on domain
    if (domainPattern) {
      switch (domainPattern.domain) {
        case 'ecommerce':
          ratios = { publicContent: 0.95, privateContent: 0.05, draftContent: 0.0 };
          break;
        case 'social-media':
          ratios = { publicContent: 0.85, privateContent: 0.10, draftContent: 0.05 };
          break;
        case 'enterprise':
          ratios = { publicContent: 0.3, privateContent: 0.65, draftContent: 0.05 };
          break;
      }
    }

    return ratios;
  }

  private generateRelationshipDensity(volumes: any, domainPattern?: DomainSpecificPatterns) {
    let density = {
      userToContent: volumes.avgItems,
      crossReferences: volumes.relationships,
      tagConnections: Math.round(volumes.relationships * 1.2)
    };

    // Adjust based on domain patterns
    if (domainPattern?.relationshipPatterns) {
      const avgRatio = domainPattern.relationshipPatterns.reduce((sum, pattern) => 
        sum + pattern.expectedRatio, 0) / domainPattern.relationshipPatterns.length;
      
      density.crossReferences = Math.round(density.crossReferences * avgRatio);
    }

    return density;
  }

  private selectUserDistribution(environment: string, expectedLoad: string): 'linear' | 'realistic' | 'exponential' | 'custom' {
    if (environment === 'development') return 'linear';
    if (expectedLoad === 'heavy') return 'exponential';
    return 'realistic';
  }

  private generateVolumeProfiles(volumes: any, requirements: any): Array<{
    name: string;
    description: string;
    userCount: number;
    avgItemsPerUser: number;
    avgRelationshipsPerItem: number;
    dataQualityLevel: 'basic' | 'rich' | 'production';
  }> {
    const profiles = [];

    // Always include a minimal profile
    profiles.push({
      name: 'minimal',
      description: 'Minimal data for basic testing',
      userCount: Math.max(2, Math.round(volumes.users * 0.3)),
      avgItemsPerUser: Math.max(1, Math.round(volumes.avgItems * 0.5)),
      avgRelationshipsPerItem: Math.max(1, Math.round(volumes.relationships * 0.5)),
      dataQualityLevel: 'basic' as const
    });

    // Standard profile
    profiles.push({
      name: 'standard',
      description: `Standard ${requirements.environment} data volume`,
      userCount: volumes.users,
      avgItemsPerUser: volumes.avgItems,
      avgRelationshipsPerItem: volumes.relationships,
      dataQualityLevel: requirements.environment === 'development' ? 'basic' as const : 'rich' as const
    });

    // Add comprehensive profile for non-development environments
    if (requirements.environment !== 'development') {
      profiles.push({
        name: 'comprehensive',
        description: 'Comprehensive data for thorough testing',
        userCount: Math.round(volumes.users * 1.5),
        avgItemsPerUser: Math.round(volumes.avgItems * 1.3),
        avgRelationshipsPerItem: Math.round(volumes.relationships * 1.2),
        dataQualityLevel: requirements.environment === 'production' ? 'production' as const : 'rich' as const
      });
    }

    return profiles;
  }

  private estimateDatabaseSize(users: number, items: number, quality: 'basic' | 'rich' | 'production' = 'basic'): number {
    const baseSize = users * 0.1 + items * 0.05; // Base size in MB
    
    const qualityMultipliers = {
      basic: 1.0,
      rich: 2.5,
      production: 4.0
    };

    return Math.round(baseSize * qualityMultipliers[quality]);
  }

  private estimateSeedingTime(users: number, items: number, quality: 'basic' | 'rich' | 'production' = 'basic'): number {
    const baseTime = users * 0.5 + items * 0.1; // Base time in seconds
    
    const qualityMultipliers = {
      basic: 1.0,
      rich: 2.0,
      production: 3.0
    };

    return Math.round(baseTime * qualityMultipliers[quality]);
  }

  private initializeDomainPatterns(): void {
    // Outdoor/Adventure domain
    this.domainPatterns.set('outdoor-adventure', {
      domain: 'outdoor-adventure',
      contentTypes: ['gear-setup', 'trip-report', 'location-guide', 'gear-review'],
      relationshipPatterns: [
        { from: 'user', to: 'setup', expectedRatio: 4, description: 'Users create multiple gear setups' },
        { from: 'setup', to: 'gear', expectedRatio: 8, description: 'Each setup contains multiple gear items' },
        { from: 'user', to: 'location', expectedRatio: 3, description: 'Users visit multiple locations' }
      ],
      seasonalFactors: [
        { period: 'summer', multiplier: 1.5, affects: ['camping', 'hiking'] },
        { period: 'winter', multiplier: 1.3, affects: ['skiing', 'snowboarding'] }
      ],
      userBehaviorProfiles: [
        { type: 'casual', percentage: 0.6, activityLevel: 'low', contentCreationRate: 2 },
        { type: 'enthusiast', percentage: 0.3, activityLevel: 'medium', contentCreationRate: 5 },
        { type: 'professional', percentage: 0.1, activityLevel: 'high', contentCreationRate: 12 }
      ]
    });

    // SaaS platform domain
    this.domainPatterns.set('saas-platform', {
      domain: 'saas-platform',
      contentTypes: ['project', 'task', 'document', 'integration'],
      relationshipPatterns: [
        { from: 'team', to: 'project', expectedRatio: 3, description: 'Teams manage multiple projects' },
        { from: 'project', to: 'task', expectedRatio: 15, description: 'Projects contain many tasks' },
        { from: 'user', to: 'task', expectedRatio: 8, description: 'Users are assigned multiple tasks' }
      ],
      seasonalFactors: [],
      userBehaviorProfiles: [
        { type: 'viewer', percentage: 0.4, activityLevel: 'low', contentCreationRate: 1 },
        { type: 'contributor', percentage: 0.4, activityLevel: 'medium', contentCreationRate: 6 },
        { type: 'admin', percentage: 0.2, activityLevel: 'high', contentCreationRate: 15 }
      ]
    });

    // E-commerce domain
    this.domainPatterns.set('ecommerce', {
      domain: 'ecommerce',
      contentTypes: ['product', 'category', 'order', 'review'],
      relationshipPatterns: [
        { from: 'category', to: 'product', expectedRatio: 12, description: 'Categories contain multiple products' },
        { from: 'user', to: 'order', expectedRatio: 2.5, description: 'Users place multiple orders' },
        { from: 'order', to: 'product', expectedRatio: 3, description: 'Orders contain multiple products' }
      ],
      seasonalFactors: [
        { period: 'holiday', multiplier: 2.5, affects: ['orders', 'reviews'] },
        { period: 'back-to-school', multiplier: 1.8, affects: ['electronics', 'books'] }
      ],
      userBehaviorProfiles: [
        { type: 'browser', percentage: 0.7, activityLevel: 'low', contentCreationRate: 0.5 },
        { type: 'buyer', percentage: 0.25, activityLevel: 'medium', contentCreationRate: 2 },
        { type: 'reviewer', percentage: 0.05, activityLevel: 'high', contentCreationRate: 8 }
      ]
    });

    // General/default domain
    this.domainPatterns.set('general', {
      domain: 'general',
      contentTypes: ['post', 'comment', 'media', 'tag'],
      relationshipPatterns: [
        { from: 'user', to: 'post', expectedRatio: 3, description: 'Users create posts' },
        { from: 'post', to: 'comment', expectedRatio: 2, description: 'Posts receive comments' },
        { from: 'post', to: 'tag', expectedRatio: 3, description: 'Posts are tagged' }
      ],
      seasonalFactors: [],
      userBehaviorProfiles: [
        { type: 'passive', percentage: 0.6, activityLevel: 'low', contentCreationRate: 1 },
        { type: 'active', percentage: 0.35, activityLevel: 'medium', contentCreationRate: 4 },
        { type: 'power-user', percentage: 0.05, activityLevel: 'high', contentCreationRate: 12 }
      ]
    });
  }
}