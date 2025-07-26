/**
 * Extension Configuration System Tests
 * Tests for Task 3.5: Extension Configuration System
 */

import {
  ExtensionConfigManager,
  ExtensionConfigUtils,
  EXTENSION_CONFIG_DEFAULTS,
  EXTENSION_CONFIG_TEMPLATES,
  type ExtensionConfig,
  type ExtensionsConfig,
  type OutdoorExtensionConfig,
  type EcommerceExtensionConfig
} from '../extension-config';

describe('ExtensionConfigUtils', () => {
  describe('mergeConfigs', () => {
    it('should merge extension configurations correctly', () => {
      const base: ExtensionsConfig = {
        enabled: [
          { name: 'outdoor', enabled: true, priority: 100 }
        ],
        global: {
          loadTimeout: 30000,
          failFast: false
        }
      };

      const override: Partial<ExtensionsConfig> = {
        enabled: [
          { name: 'ecommerce', enabled: true, priority: 200 }
        ],
        global: {
          failFast: true
        }
      };

      const result = ExtensionConfigUtils.mergeConfigs(base, override);

      expect(result.enabled).toEqual(override.enabled);
      expect(result.global?.failFast).toBe(true);
      expect(result.global?.loadTimeout).toBe(30000);
    });
  });

  describe('getTemplate', () => {
    it('should return template by name', () => {
      const template = ExtensionConfigUtils.getTemplate('wildernest-platform');
      expect(template).toBeDefined();
      expect(template?.name).toBe('wildernest-platform');
    });

    it('should return undefined for non-existent template', () => {
      const template = ExtensionConfigUtils.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });

  describe('getMatchingTemplates', () => {
    it('should return templates matching architecture', () => {
      const templates = ExtensionConfigUtils.getMatchingTemplates('individual');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.targetArchitectures.includes('individual'))).toBe(true);
    });

    it('should return templates matching domain', () => {
      const templates = ExtensionConfigUtils.getMatchingTemplates(undefined, 'outdoor');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.targetDomains.includes('outdoor'))).toBe(true);
    });

    it('should return templates matching both criteria', () => {
      const templates = ExtensionConfigUtils.getMatchingTemplates('individual', 'outdoor');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => 
        t.targetArchitectures.includes('individual') && 
        t.targetDomains.includes('outdoor')
      )).toBe(true);
    });
  });

  describe('fromTemplate', () => {
    it('should create config from template', () => {
      const config = ExtensionConfigUtils.fromTemplate('wildernest-platform');
      expect(config).toBeDefined();
      expect(config.enabled.length).toBeGreaterThan(0);
      expect(config.enabled.some(e => e.name === 'outdoor')).toBe(true);
    });

    it('should apply overrides to template', () => {
      const overrides = {
        global: {
          loadTimeout: 60000
        }
      };

      const config = ExtensionConfigUtils.fromTemplate('wildernest-platform', overrides);
      expect(config.global?.loadTimeout).toBe(60000);
    });

    it('should throw error for non-existent template', () => {
      expect(() => {
        ExtensionConfigUtils.fromTemplate('non-existent');
      }).toThrow();
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', () => {
      const config: ExtensionsConfig = {
        enabled: [
          {
            name: 'outdoor',
            enabled: true,
            priority: 100,
            settings: {
              gearCategories: ['camping', 'hiking'],
              brands: 'realistic',
              contentGeneration: {
                publicRatio: 0.75
              }
            }
          }
        ]
      };

      const validation = ExtensionConfigUtils.validateConfig(config);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing extension name', () => {
      const config: ExtensionsConfig = {
        enabled: [
          { name: '', enabled: true } as any
        ]
      };

      const validation = ExtensionConfigUtils.validateConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should detect invalid public ratio', () => {
      const config: ExtensionsConfig = {
        enabled: [
          {
            name: 'outdoor',
            enabled: true,
            settings: {
              contentGeneration: {
                publicRatio: 1.5 // Invalid: > 1
              }
            }
          }
        ]
      };

      const validation = ExtensionConfigUtils.validateConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => 
        e.field === 'settings.contentGeneration.publicRatio'
      )).toBe(true);
    });

    it('should detect duplicate extensions', () => {
      const config: ExtensionsConfig = {
        enabled: [
          { name: 'outdoor', enabled: true },
          { name: 'outdoor', enabled: true }
        ]
      };

      const validation = ExtensionConfigUtils.validateConfig(config);
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('should warn about low load timeout', () => {
      const config: ExtensionsConfig = {
        enabled: [],
        global: {
          loadTimeout: 500 // Low timeout
        }
      };

      const validation = ExtensionConfigUtils.validateConfig(config);
      expect(validation.warnings.some(w => w.includes('timeout'))).toBe(true);
      expect(validation.suggestions.some(s => s.field === 'loadTimeout')).toBe(true);
    });
  });

  describe('extension helpers', () => {
    const config: ExtensionsConfig = {
      enabled: [
        { name: 'outdoor', enabled: true, priority: 100 },
        { name: 'ecommerce', enabled: false, priority: 200 },
        { name: 'saas', enabled: true, priority: 50 }
      ]
    };

    it('should get extension by name', () => {
      const extension = ExtensionConfigUtils.getExtension(config, 'outdoor');
      expect(extension).toBeDefined();
      expect(extension?.name).toBe('outdoor');
    });

    it('should check if extension is enabled', () => {
      expect(ExtensionConfigUtils.isExtensionEnabled(config, 'outdoor')).toBe(true);
      expect(ExtensionConfigUtils.isExtensionEnabled(config, 'ecommerce')).toBe(false);
      expect(ExtensionConfigUtils.isExtensionEnabled(config, 'unknown')).toBe(false);
    });

    it('should sort extensions by priority', () => {
      const sorted = ExtensionConfigUtils.getExtensionsByPriority(config);
      expect(sorted[0].name).toBe('ecommerce'); // priority 200
      expect(sorted[1].name).toBe('outdoor'); // priority 100
      expect(sorted[2].name).toBe('saas'); // priority 50
    });
  });
});

describe('ExtensionConfigManager', () => {
  let manager: ExtensionConfigManager;

  beforeEach(() => {
    manager = new ExtensionConfigManager();
  });

  describe('basic operations', () => {
    it('should initialize with defaults', () => {
      const config = manager.getConfig();
      expect(config.enabled).toEqual([]);
      expect(config.global).toBeDefined();
    });

    it('should update configuration', () => {
      const updates = {
        global: {
          loadTimeout: 60000
        }
      };

      manager.updateConfig(updates);
      const config = manager.getConfig();
      expect(config.global?.loadTimeout).toBe(60000);
    });
  });

  describe('extension management', () => {
    it('should add new extension', () => {
      const extension: ExtensionConfig = {
        name: 'outdoor',
        enabled: true,
        priority: 100
      };

      manager.setExtension(extension);
      const config = manager.getConfig();
      expect(config.enabled).toHaveLength(1);
      expect(config.enabled[0].name).toBe('outdoor');
    });

    it('should update existing extension', () => {
      const extension: ExtensionConfig = {
        name: 'outdoor',
        enabled: true,
        priority: 100
      };

      manager.setExtension(extension);
      
      const updated: ExtensionConfig = {
        name: 'outdoor',
        enabled: false,
        priority: 200
      };

      manager.setExtension(updated);
      const config = manager.getConfig();
      expect(config.enabled).toHaveLength(1);
      expect(config.enabled[0].enabled).toBe(false);
      expect(config.enabled[0].priority).toBe(200);
    });

    it('should remove extension', () => {
      const extension: ExtensionConfig = {
        name: 'outdoor',
        enabled: true
      };

      manager.setExtension(extension);
      expect(manager.getConfig().enabled).toHaveLength(1);

      const removed = manager.removeExtension('outdoor');
      expect(removed).toBe(true);
      expect(manager.getConfig().enabled).toHaveLength(0);
    });

    it('should return false when removing non-existent extension', () => {
      const removed = manager.removeExtension('non-existent');
      expect(removed).toBe(false);
    });

    it('should enable extension', () => {
      const extension: ExtensionConfig = {
        name: 'outdoor',
        enabled: false
      };

      manager.setExtension(extension);
      const enabled = manager.enableExtension('outdoor');
      
      expect(enabled).toBe(true);
      expect(manager.getConfig().enabled[0].enabled).toBe(true);
    });

    it('should disable extension', () => {
      const extension: ExtensionConfig = {
        name: 'outdoor',
        enabled: true
      };

      manager.setExtension(extension);
      const disabled = manager.disableExtension('outdoor');
      
      expect(disabled).toBe(true);
      expect(manager.getConfig().enabled[0].enabled).toBe(false);
    });
  });

  describe('template operations', () => {
    it('should apply template', () => {
      manager.applyTemplate('wildernest-platform');
      const config = manager.getConfig();
      
      expect(config.enabled.length).toBeGreaterThan(0);
      expect(config.enabled.some(e => e.name === 'outdoor')).toBe(true);
    });

    it('should apply template with overrides', () => {
      const overrides = {
        global: {
          loadTimeout: 45000
        }
      };

      manager.applyTemplate('wildernest-platform', overrides);
      const config = manager.getConfig();
      
      expect(config.global?.loadTimeout).toBe(45000);
    });

    it('should throw error for invalid template', () => {
      expect(() => {
        manager.applyTemplate('invalid-template');
      }).toThrow();
    });
  });

  describe('validation', () => {
    it('should validate configuration', () => {
      manager.setExtension({
        name: 'outdoor',
        enabled: true,
        priority: 100
      });

      const validation = manager.validate();
      expect(validation.valid).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should export to JSON', () => {
      manager.setExtension({
        name: 'outdoor',
        enabled: true,
        priority: 100
      });

      const json = manager.toJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.enabled).toHaveLength(1);
      expect(parsed.enabled[0].name).toBe('outdoor');
    });

    it('should import from JSON', () => {
      const config = {
        enabled: [
          { name: 'outdoor', enabled: true, priority: 100 }
        ]
      };

      manager.fromJSON(JSON.stringify(config));
      const result = manager.getConfig();
      
      expect(result.enabled).toHaveLength(1);
      expect(result.enabled[0].name).toBe('outdoor');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        manager.fromJSON('invalid json');
      }).toThrow();
    });

    it('should throw error for invalid configuration in JSON', () => {
      const invalidConfig = {
        enabled: [
          { name: '', enabled: true } // Missing name
        ]
      };

      expect(() => {
        manager.fromJSON(JSON.stringify(invalidConfig));
      }).toThrow();
    });
  });

  describe('reset', () => {
    it('should reset to defaults', () => {
      manager.setExtension({
        name: 'outdoor',
        enabled: true
      });

      expect(manager.getConfig().enabled).toHaveLength(1);
      
      manager.reset();
      const config = manager.getConfig();
      
      expect(config.enabled).toHaveLength(0);
      expect(config.global).toEqual(EXTENSION_CONFIG_DEFAULTS.global);
    });
  });
});

describe('Extension Configuration Templates', () => {
  it('should have valid template structure', () => {
    EXTENSION_CONFIG_TEMPLATES.forEach(template => {
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(Array.isArray(template.targetArchitectures)).toBe(true);
      expect(Array.isArray(template.targetDomains)).toBe(true);
      expect(template.extensions).toBeDefined();
      expect(template.metadata).toBeDefined();
    });
  });

  it('should validate all templates', () => {
    EXTENSION_CONFIG_TEMPLATES.forEach(template => {
      const validation = ExtensionConfigUtils.validateConfig(template.extensions);
      expect(validation.valid).toBe(true);
    });
  });

  it('should have wildernest template for outdoor platforms', () => {
    const template = EXTENSION_CONFIG_TEMPLATES.find(t => t.name === 'wildernest-platform');
    expect(template).toBeDefined();
    expect(template?.targetDomains).toContain('outdoor');
    expect(template?.targetArchitectures).toContain('individual');
  });

  it('should have saas template for team platforms', () => {
    const template = EXTENSION_CONFIG_TEMPLATES.find(t => t.name === 'saas-team-platform');
    expect(template).toBeDefined();
    expect(template?.targetDomains).toContain('saas');
    expect(template?.targetArchitectures).toContain('team');
  });

  it('should have ecommerce template for marketplace platforms', () => {
    const template = EXTENSION_CONFIG_TEMPLATES.find(t => t.name === 'ecommerce-marketplace');
    expect(template).toBeDefined();
    expect(template?.targetDomains).toContain('ecommerce');
  });

  it('should have minimal auto-detect template', () => {
    const template = EXTENSION_CONFIG_TEMPLATES.find(t => t.name === 'minimal-auto-detect');
    expect(template).toBeDefined();
    expect(template?.extensions.discovery?.autoDiscovery).toBe(true);
  });
});

describe('Extension Type Safety', () => {
  it('should enforce outdoor extension configuration types', () => {
    const outdoorConfig: OutdoorExtensionConfig = {
      name: 'outdoor',
      enabled: true,
      settings: {
        gearCategories: ['camping', 'hiking'],
        brands: 'realistic',
        priceRange: 'market-accurate',
        setupComplexity: 'mixed',
        seasonalFocus: 'all',
        experienceLevels: ['beginner', 'intermediate'],
        contentGeneration: {
          setupsPerUser: 2,
          gearPerSetup: 5,
          publicRatio: 0.75,
          reviewFrequency: 0.3
        }
      }
    };

    expect(outdoorConfig.name).toBe('outdoor');
    expect(outdoorConfig.settings?.brands).toBe('realistic');
  });

  it('should enforce ecommerce extension configuration types', () => {
    const ecommerceConfig: EcommerceExtensionConfig = {
      name: 'ecommerce',
      enabled: true,
      settings: {
        storeTypes: ['marketplace', 'direct_to_consumer'],
        productCategories: ['electronics', 'clothing'],
        inventoryComplexity: 'multi_location',
        paymentFeatures: {
          methods: ['credit_card', 'paypal'],
          currencies: ['USD', 'EUR'],
          taxCalculation: true,
          internationalShipping: true
        },
        orderManagement: {
          fulfillmentWorkflows: true,
          returnProcessing: true,
          customerReviews: true,
          loyaltyPrograms: false
        }
      }
    };

    expect(ecommerceConfig.name).toBe('ecommerce');
    expect(ecommerceConfig.settings?.storeTypes).toContain('marketplace');
  });
});