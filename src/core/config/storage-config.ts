/**
 * Storage Configuration Management
 * Handles configuration for storage integration across different frameworks
 */

import type { StorageConfig } from '../storage/storage-types';
import { DOMAIN_CONFIGURATIONS, DEFAULT_STORAGE_CONFIG } from '../storage/storage-types';

export interface FrameworkStorageConfig {
  framework: string;
  config: Partial<StorageConfig>;
  bucketStrategy: 'single' | 'multi-bucket' | 'tenant-scoped';
  defaultPermissions: {
    respectRLS: boolean;
    enablePublicUrls: boolean;
    requireAuth: boolean;
  };
  mediaAttachmentStrategy: 'database' | 'metadata-only' | 'hybrid';
}

/**
 * Framework-specific storage configurations
 */
export const FRAMEWORK_STORAGE_CONFIGS: Record<string, FrameworkStorageConfig> = {
  makerkit: {
    framework: 'makerkit',
    config: {
      bucketName: 'media',
      domain: 'outdoor-adventure',
      respectRLS: true,
      enableRealImages: true,
      imagesPerSetup: 8,
      categories: ['outdoor', 'adventure', 'nature', 'travel'],
      storageRootPath: 'accounts'
    },
    bucketStrategy: 'tenant-scoped',
    defaultPermissions: {
      respectRLS: true,
      enablePublicUrls: false,
      requireAuth: true
    },
    mediaAttachmentStrategy: 'database'
  },

  'makerkit-profiles': {
    framework: 'makerkit-profiles',
    config: {
      bucketName: 'media',
      domain: 'outdoor-adventure',
      respectRLS: true,
      enableRealImages: true,
      imagesPerSetup: 6,
      categories: ['outdoor', 'adventure', 'profile', 'nature'],
      storageRootPath: 'profiles'
    },
    bucketStrategy: 'single',
    defaultPermissions: {
      respectRLS: true,
      enablePublicUrls: false,
      requireAuth: true
    },
    mediaAttachmentStrategy: 'database'
  },

  simple: {
    framework: 'simple',
    config: {
      bucketName: 'uploads',
      domain: 'general',
      respectRLS: false,
      enableRealImages: false,
      imagesPerSetup: 3,
      categories: ['general', 'placeholder'],
      storageRootPath: 'files'
    },
    bucketStrategy: 'single',
    defaultPermissions: {
      respectRLS: false,
      enablePublicUrls: true,
      requireAuth: false
    },
    mediaAttachmentStrategy: 'metadata-only'
  },

  custom: {
    framework: 'custom',
    config: {
      bucketName: 'files',
      domain: 'general',
      respectRLS: false,
      enableRealImages: false,
      imagesPerSetup: 4,
      categories: ['general', 'user-content'],
      storageRootPath: 'uploads'
    },
    bucketStrategy: 'single',
    defaultPermissions: {
      respectRLS: false,
      enablePublicUrls: true,
      requireAuth: false
    },
    mediaAttachmentStrategy: 'hybrid'
  },

  generic: {
    framework: 'generic',
    config: {
      bucketName: 'media',
      domain: 'general',
      respectRLS: true,
      enableRealImages: false,
      imagesPerSetup: 3,
      categories: ['general', 'placeholder', 'mock'],
      storageRootPath: 'uploads'
    },
    bucketStrategy: 'single',
    defaultPermissions: {
      respectRLS: true,
      enablePublicUrls: false,
      requireAuth: true
    },
    mediaAttachmentStrategy: 'database'
  }
};

/**
 * Get storage configuration for a specific framework
 */
export function getFrameworkStorageConfig(framework: string): FrameworkStorageConfig {
  return FRAMEWORK_STORAGE_CONFIGS[framework] || FRAMEWORK_STORAGE_CONFIGS.generic;
}

/**
 * Get merged storage configuration with custom overrides
 */
export function getMergedStorageConfig(
  framework: string,
  customConfig?: Partial<StorageConfig>
): StorageConfig {
  const frameworkConfig = getFrameworkStorageConfig(framework);
  const domainConfig = DOMAIN_CONFIGURATIONS[frameworkConfig.config.domain || 'general'] || {};
  
  return {
    ...DEFAULT_STORAGE_CONFIG,
    ...domainConfig,
    ...frameworkConfig.config,
    ...customConfig
  };
}

/**
 * Validate storage configuration
 */
export function validateStorageConfig(config: Partial<StorageConfig>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!config.bucketName) {
    errors.push('bucketName is required');
  }

  if (!config.domain) {
    warnings.push('domain not specified, using default');
  }

  // Logical validation
  if (config.enableRealImages && (!process.env.UNSPLASH_ACCESS_KEY && !process.env.PIXABAY_API_KEY)) {
    warnings.push('enableRealImages is true but no API keys found - will fallback to mock images');
  }

  // Note: Permission validation is handled at the framework level

  if (config.imagesPerSetup && config.imagesPerSetup > 20) {
    warnings.push('imagesPerSetup is high - may impact performance and API rate limits');
  }

  // Category validation
  if (config.categories && config.categories.length === 0) {
    warnings.push('Empty categories array - will use default categories');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate storage recommendations based on configuration
 */
export function generateStorageRecommendations(
  framework: string,
  config: Partial<StorageConfig>
): string[] {
  const recommendations: string[] = [];
  const frameworkConfig = getFrameworkStorageConfig(framework);

  // Framework-specific recommendations
  if (framework === 'generic') {
    recommendations.push('Consider using a framework-specific strategy for better storage integration');
    recommendations.push('Generic storage uses conservative settings for compatibility');
  }

  if (frameworkConfig.bucketStrategy === 'tenant-scoped') {
    recommendations.push('Tenant-scoped storage requires proper RLS policies');
    recommendations.push('Ensure tenant isolation is properly configured');
  }

  // Configuration-based recommendations
  if (config.enableRealImages) {
    recommendations.push('Real image generation requires API keys and rate limit consideration');
    recommendations.push('Monitor external API usage to prevent rate limiting');
  }

  if (config.respectRLS === false) {
    recommendations.push('RLS bypass enabled - ensure security implications are understood');
    recommendations.push('Consider enabling RLS for production environments');
  }

  // Note: Permission validation recommendations are handled by the framework strategy

  return recommendations;
}

/**
 * Get environment-specific storage configuration
 */
export function getEnvironmentStorageConfig(): Partial<StorageConfig> {
  const environment = process.env.NODE_ENV || 'development';
  
  const baseConfig: Partial<StorageConfig> = {};

  switch (environment) {
    case 'production':
      baseConfig.enableRealImages = true;
      baseConfig.respectRLS = true;
      break;

    case 'staging':
      baseConfig.enableRealImages = false; // Use mock images in staging
      baseConfig.respectRLS = true;
      break;

    case 'development':
    default:
      baseConfig.enableRealImages = false;
      baseConfig.respectRLS = false;
      break;
  }

  return baseConfig;
}

/**
 * Storage configuration utilities
 */
export const StorageConfigUtils = {
  getFrameworkConfig: getFrameworkStorageConfig,
  getMergedConfig: getMergedStorageConfig,
  validate: validateStorageConfig,
  getRecommendations: generateStorageRecommendations,
  getEnvironmentConfig: getEnvironmentStorageConfig
};