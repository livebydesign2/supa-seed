/**
 * Extension Configuration System for SupaSeed v2.5.0
 * Implements FR-3.5: Domain extension configuration and customization options
 * Part of Task 3.5.1: Create extension configuration schemas and types
 */

import { Logger } from '../utils/logger';
import type { 
  ContentDomainType, 
  PlatformArchitectureType 
} from '../detection/detection-types';

/**
 * Base configuration interface for all domain extensions
 */
export interface ExtensionConfigBase {
  /** Extension identifier */
  name: string;
  /** Whether the extension is enabled */
  enabled: boolean;
  /** Extension version compatibility */
  version?: string;
  /** Custom extension settings */
  settings?: Record<string, any>;
  /** Extension priority (higher numbers load first) */
  priority?: number;
  /** Platform architectures this extension supports */
  supportedArchitectures?: PlatformArchitectureType[];
  /** Content domains this extension handles */
  supportedDomains?: ContentDomainType[];
}

/**
 * Outdoor domain extension configuration
 */
export interface OutdoorExtensionConfig extends ExtensionConfigBase {
  name: 'outdoor';
  settings?: {
    /** Gear categories to generate */
    gearCategories?: string[];
    /** Brand selection strategy */
    brands?: 'realistic' | 'generic' | 'custom';
    /** Custom brands list */
    customBrands?: string[];
    /** Price range strategy */
    priceRange?: 'market-accurate' | 'budget' | 'premium' | 'mixed';
    /** Setup complexity levels */
    setupComplexity?: 'simple' | 'moderate' | 'advanced' | 'mixed';
    /** Seasonal considerations */
    seasonalFocus?: 'all' | 'spring' | 'summer' | 'fall' | 'winter';
    /** Experience level targeting */
    experienceLevels?: ('beginner' | 'intermediate' | 'expert')[];
    /** Content generation preferences */
    contentGeneration?: {
      setupsPerUser?: number;
      gearPerSetup?: number;
      publicRatio?: number;
      reviewFrequency?: number;
    };
  };
}

/**
 * SaaS domain extension configuration
 */
export interface SaaSExtensionConfig extends ExtensionConfigBase {
  name: 'saas';
  settings?: {
    /** SaaS product types to simulate */
    productTypes?: ('productivity' | 'collaboration' | 'analytics' | 'development' | 'marketing')[];
    /** Subscription plan strategies */
    subscriptionPlans?: {
      tiers?: ('free' | 'starter' | 'professional' | 'enterprise')[];
      billingCycles?: ('monthly' | 'yearly' | 'lifetime')[];
      trialPeriods?: boolean;
    };
    /** Feature flag management */
    featureFlags?: {
      enabled?: boolean;
      flagCount?: number;
      rolloutStrategies?: ('percentage' | 'user_segments' | 'geography')[];
    };
    /** Usage analytics simulation */
    usageAnalytics?: {
      trackingEvents?: string[];
      userSegments?: string[];
      conversionFunnels?: boolean;
    };
    /** Team collaboration features */
    teamFeatures?: {
      workspaces?: boolean;
      roleBasedAccess?: boolean;
      inviteWorkflow?: boolean;
      auditLogs?: boolean;
    };
  };
}

/**
 * E-commerce domain extension configuration
 */
export interface EcommerceExtensionConfig extends ExtensionConfigBase {
  name: 'ecommerce';
  settings?: {
    /** Store types to simulate */
    storeTypes?: ('marketplace' | 'direct_to_consumer' | 'b2b' | 'subscription_box')[];
    /** Product categories focus */
    productCategories?: ('electronics' | 'clothing' | 'home_garden' | 'sports_outdoors' | 'books_media')[];
    /** Inventory management complexity */
    inventoryComplexity?: 'simple' | 'multi_location' | 'dropshipping' | 'marketplace';
    /** Payment processing features */
    paymentFeatures?: {
      methods?: ('credit_card' | 'paypal' | 'apple_pay' | 'crypto' | 'buy_now_pay_later')[];
      currencies?: string[];
      taxCalculation?: boolean;
      internationalShipping?: boolean;
    };
    /** Order management features */
    orderManagement?: {
      fulfillmentWorkflows?: boolean;
      returnProcessing?: boolean;
      customerReviews?: boolean;
      loyaltyPrograms?: boolean;
    };
    /** Marketing features */
    marketingFeatures?: {
      discountCodes?: boolean;
      emailCampaigns?: boolean;
      abandonedCartRecovery?: boolean;
      productRecommendations?: boolean;
    };
  };
}

/**
 * Social domain extension configuration
 */
export interface SocialExtensionConfig extends ExtensionConfigBase {
  name: 'social';
  settings?: {
    /** Social platform type */
    platformType?: 'general' | 'professional' | 'creative' | 'community' | 'dating';
    /** Content types to generate */
    contentTypes?: ('posts' | 'stories' | 'videos' | 'photos' | 'articles' | 'polls')[];
    /** Engagement features */
    engagementFeatures?: {
      likes?: boolean;
      comments?: boolean;
      shares?: boolean;
      reactions?: boolean;
      bookmarks?: boolean;
    };
    /** Social graph complexity */
    socialGraph?: {
      followSystem?: 'one_way' | 'mutual' | 'both';
      groupsAndCommunities?: boolean;
      directMessaging?: boolean;
      mentionsAndTags?: boolean;
    };
    /** Content moderation */
    contentModeration?: {
      reportingSystem?: boolean;
      automaticFiltering?: boolean;
      communityGuidelines?: boolean;
    };
    /** Privacy controls */
    privacyControls?: {
      postVisibility?: ('public' | 'friends' | 'private')[];
      profilePrivacy?: boolean;
      blockedUsers?: boolean;
    };
  };
}

/**
 * Union type for all extension configurations
 */
export type ExtensionConfig = 
  | OutdoorExtensionConfig 
  | SaaSExtensionConfig 
  | EcommerceExtensionConfig 
  | SocialExtensionConfig;

/**
 * Configuration for multiple extensions
 */
export interface ExtensionsConfig {
  /** List of enabled extensions with their configurations */
  enabled: ExtensionConfig[];
  /** Global extension settings */
  global?: {
    /** Extension loading timeout in milliseconds */
    loadTimeout?: number;
    /** Whether to fail fast on extension errors */
    failFast?: boolean;
    /** Extension dependency resolution strategy */
    dependencyResolution?: 'strict' | 'lenient' | 'ignore';
    /** Validation level for extension configs */
    validationLevel?: 'strict' | 'warn' | 'none';
  };
  /** Extension discovery settings */
  discovery?: {
    /** Auto-discover extensions based on schema patterns */
    autoDiscovery?: boolean;
    /** Minimum confidence threshold for auto-enabling extensions */
    confidenceThreshold?: number;
    /** Whether to prompt user for extension selection */
    promptForSelection?: boolean;
  };
  /** Extension conflict resolution */
  conflictResolution?: {
    /** Strategy when multiple extensions claim the same domain */
    domainConflicts?: 'first_wins' | 'highest_priority' | 'merge' | 'prompt';
    /** Strategy for conflicting configuration values */
    configConflicts?: 'override' | 'merge' | 'prompt' | 'error';
  };
}

/**
 * Extension configuration validation result
 */
export interface ExtensionConfigValidation {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Validation errors */
  errors: Array<{
    extension: string;
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  /** Validation warnings */
  warnings: string[];
  /** Suggested fixes */
  suggestions: Array<{
    extension: string;
    field: string;
    suggestion: string;
    autoFixable: boolean;
  }>;
}

/**
 * Extension configuration templates for common scenarios
 */
export interface ExtensionConfigTemplate {
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Target platform architectures */
  targetArchitectures: PlatformArchitectureType[];
  /** Target domains */
  targetDomains: ContentDomainType[];
  /** Extension configuration */
  extensions: ExtensionsConfig;
  /** Template metadata */
  metadata: {
    author?: string;
    version?: string;
    tags?: string[];
    documentation?: string;
  };
}

/**
 * Pre-defined configuration templates
 */
export const EXTENSION_CONFIG_TEMPLATES: ExtensionConfigTemplate[] = [
  {
    name: 'wildernest-platform',
    description: 'Configuration optimized for Wildernest-style outdoor gear platforms',
    targetArchitectures: ['individual'],
    targetDomains: ['outdoor'],
    extensions: {
      enabled: [
        {
          name: 'outdoor',
          enabled: true,
          priority: 100,
          settings: {
            gearCategories: ['camping', 'hiking', 'climbing', 'cycling'],
            brands: 'realistic',
            priceRange: 'market-accurate',
            setupComplexity: 'mixed',
            seasonalFocus: 'all',
            experienceLevels: ['beginner', 'intermediate', 'expert'],
            contentGeneration: {
              setupsPerUser: 2,
              gearPerSetup: 5,
              publicRatio: 0.75,
              reviewFrequency: 0.3
            }
          }
        }
      ],
      global: {
        loadTimeout: 30000,
        failFast: true,
        dependencyResolution: 'strict',
        validationLevel: 'strict'
      }
    },
    metadata: {
      author: 'SupaSeed Team',
      version: '1.0.0',
      tags: ['outdoor', 'individual', 'marketplace'],
      documentation: 'Optimized for individual creator platforms focused on outdoor gear'
    }
  },
  {
    name: 'saas-team-platform',
    description: 'Configuration for SaaS productivity and team collaboration platforms',
    targetArchitectures: ['team', 'hybrid'],
    targetDomains: ['saas'],
    extensions: {
      enabled: [
        {
          name: 'saas',
          enabled: true,
          priority: 100,
          settings: {
            productTypes: ['productivity', 'collaboration', 'analytics'],
            subscriptionPlans: {
              tiers: ['free', 'professional', 'enterprise'],
              billingCycles: ['monthly', 'yearly'],
              trialPeriods: true
            },
            featureFlags: {
              enabled: true,
              flagCount: 15,
              rolloutStrategies: ['percentage', 'user_segments']
            },
            teamFeatures: {
              workspaces: true,
              roleBasedAccess: true,
              inviteWorkflow: true,
              auditLogs: true
            }
          }
        }
      ],
      global: {
        loadTimeout: 30000,
        failFast: false,
        dependencyResolution: 'lenient',
        validationLevel: 'warn'
      }
    },
    metadata: {
      author: 'SupaSeed Team',
      version: '1.0.0',
      tags: ['saas', 'team', 'productivity'],
      documentation: 'Optimized for team-based SaaS productivity platforms'
    }
  },
  {
    name: 'ecommerce-marketplace',
    description: 'Configuration for e-commerce marketplace platforms',
    targetArchitectures: ['individual', 'team'],
    targetDomains: ['ecommerce'],
    extensions: {
      enabled: [
        {
          name: 'ecommerce',
          enabled: true,
          priority: 100,
          settings: {
            storeTypes: ['marketplace', 'direct_to_consumer'],
            productCategories: ['electronics', 'clothing', 'home_garden'],
            inventoryComplexity: 'multi_location',
            paymentFeatures: {
              methods: ['credit_card', 'paypal', 'apple_pay'],
              currencies: ['USD', 'EUR', 'GBP'],
              taxCalculation: true,
              internationalShipping: true
            },
            orderManagement: {
              fulfillmentWorkflows: true,
              returnProcessing: true,
              customerReviews: true,
              loyaltyPrograms: false
            },
            marketingFeatures: {
              discountCodes: true,
              emailCampaigns: true,
              abandonedCartRecovery: true,
              productRecommendations: true
            }
          }
        }
      ],
      global: {
        loadTimeout: 45000,
        failFast: false,
        dependencyResolution: 'lenient',
        validationLevel: 'warn'
      }
    },
    metadata: {
      author: 'SupaSeed Team',
      version: '1.0.0',
      tags: ['ecommerce', 'marketplace', 'multi-vendor'],
      documentation: 'Optimized for multi-vendor marketplace platforms'
    }
  },
  {
    name: 'minimal-auto-detect',
    description: 'Minimal configuration with automatic extension detection',
    targetArchitectures: ['individual', 'team', 'hybrid'],
    targetDomains: ['outdoor', 'saas', 'ecommerce', 'social'],
    extensions: {
      enabled: [],
      global: {
        loadTimeout: 30000,
        failFast: false,
        dependencyResolution: 'lenient',
        validationLevel: 'warn'
      },
      discovery: {
        autoDiscovery: true,
        confidenceThreshold: 0.7,
        promptForSelection: false
      }
    },
    metadata: {
      author: 'SupaSeed Team',
      version: '1.0.0',
      tags: ['auto-detect', 'minimal', 'universal'],
      documentation: 'Minimal configuration that auto-detects and enables appropriate extensions'
    }
  }
];

/**
 * Extension configuration defaults
 */
export const EXTENSION_CONFIG_DEFAULTS: ExtensionsConfig = {
  enabled: [],
  global: {
    loadTimeout: 30000,
    failFast: false,
    dependencyResolution: 'lenient',
    validationLevel: 'warn'
  },
  discovery: {
    autoDiscovery: true,
    confidenceThreshold: 0.8,
    promptForSelection: false
  },
  conflictResolution: {
    domainConflicts: 'highest_priority',
    configConflicts: 'merge'
  }
};

/**
 * Extension configuration utilities
 */
export class ExtensionConfigUtils {
  /**
   * Merge two extension configurations
   */
  static mergeConfigs(base: ExtensionsConfig, override: Partial<ExtensionsConfig>): ExtensionsConfig {
    return {
      enabled: override.enabled || base.enabled,
      global: {
        ...base.global,
        ...override.global
      },
      discovery: {
        ...base.discovery,
        ...override.discovery
      },
      conflictResolution: {
        ...base.conflictResolution,
        ...override.conflictResolution
      }
    };
  }

  /**
   * Get configuration template by name
   */
  static getTemplate(name: string): ExtensionConfigTemplate | undefined {
    return EXTENSION_CONFIG_TEMPLATES.find(template => template.name === name);
  }

  /**
   * Get templates matching target criteria
   */
  static getMatchingTemplates(
    architecture?: PlatformArchitectureType,
    domain?: ContentDomainType
  ): ExtensionConfigTemplate[] {
    return EXTENSION_CONFIG_TEMPLATES.filter(template => {
      const archMatch = !architecture || template.targetArchitectures.includes(architecture);
      const domainMatch = !domain || template.targetDomains.includes(domain);
      return archMatch && domainMatch;
    });
  }

  /**
   * Create extension configuration from template
   */
  static fromTemplate(templateName: string, overrides?: Partial<ExtensionsConfig>): ExtensionsConfig {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Extension configuration template '${templateName}' not found`);
    }

    if (!overrides) {
      return template.extensions;
    }

    return this.mergeConfigs(template.extensions, overrides);
  }

  /**
   * Validate extension configuration
   */
  static validateConfig(config: ExtensionsConfig): ExtensionConfigValidation {
    const errors: ExtensionConfigValidation['errors'] = [];
    const warnings: string[] = [];
    const suggestions: ExtensionConfigValidation['suggestions'] = [];

    // Validate enabled extensions
    for (const extension of config.enabled) {
      if (!extension.name) {
        errors.push({
          extension: 'unknown',
          field: 'name',
          message: 'Extension name is required',
          severity: 'error'
        });
      }

      if (extension.priority !== undefined && (extension.priority < 0 || extension.priority > 1000)) {
        warnings.push(`Extension '${extension.name}' has priority ${extension.priority}, recommended range is 0-1000`);
      }

      // Validate extension-specific settings
      if (extension.name === 'outdoor' && extension.settings) {
        const settings = extension.settings as OutdoorExtensionConfig['settings'];
        if (settings?.contentGeneration?.publicRatio !== undefined) {
          const ratio = settings.contentGeneration.publicRatio;
          if (ratio < 0 || ratio > 1) {
            errors.push({
              extension: extension.name,
              field: 'settings.contentGeneration.publicRatio',
              message: 'Public ratio must be between 0 and 1',
              severity: 'error'
            });
          }
        }
      }
    }

    // Check for duplicate extension names
    const extensionNames = config.enabled.map(ext => ext.name);
    const duplicates = extensionNames.filter((name, index) => extensionNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push({
        extension: 'global',
        field: 'enabled',
        message: `Duplicate extensions detected: ${duplicates.join(', ')}`,
        severity: 'error'
      });
    }

    // Validate global settings
    if (config.global?.loadTimeout !== undefined && config.global.loadTimeout < 1000) {
      warnings.push('Load timeout below 1000ms may cause extension loading failures');
      suggestions.push({
        extension: 'global',
        field: 'loadTimeout',
        suggestion: 'Consider increasing load timeout to at least 5000ms',
        autoFixable: true
      });
    }

    return {
      valid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get extension by name from configuration
   */
  static getExtension(config: ExtensionsConfig, name: string): ExtensionConfig | undefined {
    return config.enabled.find(ext => ext.name === name);
  }

  /**
   * Check if extension is enabled
   */
  static isExtensionEnabled(config: ExtensionsConfig, name: string): boolean {
    const extension = this.getExtension(config, name);
    return extension?.enabled === true;
  }

  /**
   * Get extensions sorted by priority (highest first)
   */
  static getExtensionsByPriority(config: ExtensionsConfig): ExtensionConfig[] {
    return [...config.enabled].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }
}

/**
 * Extension configuration manager
 */
export class ExtensionConfigManager {
  private config: ExtensionsConfig;

  constructor(config: ExtensionsConfig = EXTENSION_CONFIG_DEFAULTS) {
    this.config = config;
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtensionsConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ExtensionsConfig>): void {
    this.config = ExtensionConfigUtils.mergeConfigs(this.config, updates);
    Logger.debug('Extension configuration updated', { config: this.config });
  }

  /**
   * Add or update an extension configuration
   */
  setExtension(extensionConfig: ExtensionConfig): void {
    const existingIndex = this.config.enabled.findIndex(ext => ext.name === extensionConfig.name);
    
    if (existingIndex >= 0) {
      this.config.enabled[existingIndex] = extensionConfig;
      Logger.debug(`Updated extension configuration: ${extensionConfig.name}`);
    } else {
      this.config.enabled.push(extensionConfig);
      Logger.debug(`Added extension configuration: ${extensionConfig.name}`);
    }
  }

  /**
   * Remove extension configuration
   */
  removeExtension(name: string): boolean {
    const initialLength = this.config.enabled.length;
    this.config.enabled = this.config.enabled.filter(ext => ext.name !== name);
    const removed = this.config.enabled.length < initialLength;
    
    if (removed) {
      Logger.debug(`Removed extension configuration: ${name}`);
    }
    
    return removed;
  }

  /**
   * Enable extension
   */
  enableExtension(name: string): boolean {
    const extension = ExtensionConfigUtils.getExtension(this.config, name);
    if (extension) {
      extension.enabled = true;
      Logger.debug(`Enabled extension: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Disable extension
   */
  disableExtension(name: string): boolean {
    const extension = ExtensionConfigUtils.getExtension(this.config, name);
    if (extension) {
      extension.enabled = false;
      Logger.debug(`Disabled extension: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Validate current configuration
   */
  validate(): ExtensionConfigValidation {
    return ExtensionConfigUtils.validateConfig(this.config);
  }

  /**
   * Apply configuration template
   */
  applyTemplate(templateName: string, overrides?: Partial<ExtensionsConfig>): void {
    try {
      const templateConfig = ExtensionConfigUtils.fromTemplate(templateName, overrides);
      this.config = templateConfig;
      Logger.info(`Applied extension configuration template: ${templateName}`);
    } catch (error) {
      Logger.error(`Failed to apply template '${templateName}':`, error);
      throw error;
    }
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = { ...EXTENSION_CONFIG_DEFAULTS };
    Logger.info('Extension configuration reset to defaults');
  }

  /**
   * Export configuration to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Load configuration from JSON
   */
  fromJSON(json: string): void {
    try {
      const config = JSON.parse(json) as ExtensionsConfig;
      const validation = ExtensionConfigUtils.validateConfig(config);
      
      if (!validation.valid) {
        const errorMessages = validation.errors.map(e => `${e.extension}.${e.field}: ${e.message}`);
        throw new Error(`Invalid configuration: ${errorMessages.join(', ')}`);
      }
      
      this.config = config;
      Logger.info('Extension configuration loaded from JSON');
    } catch (error) {
      Logger.error('Failed to load configuration from JSON:', error);
      throw error;
    }
  }
}