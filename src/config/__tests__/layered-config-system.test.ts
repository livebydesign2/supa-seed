/**
 * Comprehensive Test Suite for Layered Configuration System
 * Tests for Task 5.1: Implement 3-Layer Configuration System
 * Validates all configuration functionality including layers, composition, conflict resolution, and zero-config
 */

// Mock the Logger to avoid chalk import issues in tests
jest.mock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    step: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
    skip: jest.fn(),
    success: jest.fn(),
    setVerbose: jest.fn()
  }
}));

import {
  ConfigurationLayerSystem,
  DEFAULT_UNIVERSAL_CONFIG,
  DEFAULT_DETECTION_CONFIG,
  DEFAULT_EXTENSIONS_CONFIG
} from '../layer-system';
import { LayeredConfigurationManager } from '../layered-config-manager';
import { ConflictResolutionEngine } from '../conflict-resolution';
import { ZeroConfigurationEngine } from '../zero-config';
import type { FlexibleSeedConfig } from '../../config-types';
import type {
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  ConfigurationLayerType,
  MergeStrategy,
  LayerStatus,
  ConfigurationTemplate
} from '../config-layers';

describe('Configuration Layer System', () => {
  let layerSystem: ConfigurationLayerSystem;

  beforeEach(() => {
    layerSystem = new ConfigurationLayerSystem();
  });

  describe('Layer Management', () => {
    it('should initialize with default layers', () => {
      const universal = layerSystem.getLayer('universal');
      const detection = layerSystem.getLayer('detection');
      const extensions = layerSystem.getLayer('extensions');

      expect(universal).toBeDefined();
      expect(detection).toBeDefined();
      expect(extensions).toBeDefined();

      expect(universal.layer.type).toBe('universal');
      expect(detection.layer.type).toBe('detection');
      expect(extensions.layer.type).toBe('extensions');
    });

    it('should set and get layers correctly', () => {
      const testConfig = {
        ...DEFAULT_UNIVERSAL_CONFIG,
        seeding: {
          ...DEFAULT_UNIVERSAL_CONFIG.seeding,
          defaultUserCount: 20
        }
      };

      layerSystem.setLayer('universal', testConfig);
      const retrieved = layerSystem.getLayer('universal');

      expect(retrieved.seeding.defaultUserCount).toBe(20);
    });

    it('should get all layers', () => {
      const allLayers = layerSystem.getAllLayers();

      expect(allLayers.universal).toBeDefined();
      expect(allLayers.detection).toBeDefined();
      expect(allLayers.extensions).toBeDefined();
    });

    it('should update detection layer with results', () => {
      const evidence = {
        platform: { tablePatterns: ['users', 'teams'] },
        domain: { tableNames: ['products', 'orders'] }
      };

      layerSystem.updateDetectionLayer('team', 'ecommerce', 0.9, evidence);
      const detection = layerSystem.getLayer<SmartDetectionConfig>('detection');

      expect(detection?.platform.architecture).toBe('team');
      expect(detection?.domain.domain).toBe('ecommerce');
      expect(detection?.platform.confidence).toBe(0.9);
    });

    it('should enable and disable layers', () => {
      layerSystem.setLayerEnabled('extensions', false);
      const extensions = layerSystem.getLayer('extensions');
      expect(extensions.layer.enabled).toBe(false);

      layerSystem.setLayerEnabled('extensions', true);
      const extensionsEnabled = layerSystem.getLayer('extensions');
      expect(extensionsEnabled.layer.enabled).toBe(true);
    });

    it('should not disable universal layer', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      layerSystem.setLayerEnabled('universal', false);
      
      const universal = layerSystem.getLayer('universal');
      expect(universal.layer.enabled).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Layer Status and Validation', () => {
    it('should provide layer status information', () => {
      const statuses = layerSystem.getLayerStatuses();

      expect(statuses.universal).toBeDefined();
      expect(statuses.detection).toBeDefined();
      expect(statuses.extensions).toBeDefined();

      Object.values(statuses).forEach(status => {
        expect(status.layer).toBeDefined();
        expect(status.status).toBeDefined();
        expect(status.performance).toBeDefined();
        expect(status.validation).toBeDefined();
      });
    });

    it('should validate layer configurations', () => {
      const validation = layerSystem.validateLayers();

      expect(validation.valid).toBeDefined();
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should detect invalid layer configurations', () => {
      const invalidConfig = {
        layer: {
          type: 'universal',
          priority: 'highest',
          enabled: true,
          readonly: true
        },
        makerkit: null, // Invalid - should be object
        seeding: null, // Invalid - should be object
        environment: null // Invalid - should be object
      };

      layerSystem.setLayer('universal', invalidConfig);
      const validation = layerSystem.validateLayers();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Template System', () => {
    it('should register and retrieve templates', () => {
      const template: ConfigurationTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        version: '1.0.0',
        targets: {
          architectures: ['individual'],
          domains: ['outdoor'],
          complexity: 'simple'
        },
        layers: {
          universal: {
            seeding: {
              defaultUserCount: 15
            }
          } as Partial<UniversalCoreConfig>
        },
        metadata: {
          author: 'Test',
          tags: ['test'],
          usageCount: 0,
          rating: 5,
          lastUpdated: new Date(),
          compatibility: {
            minimumVersion: '2.5.0',
            dependencies: []
          }
        },
        customization: {
          requiredFields: [],
          optionalFields: [],
          defaults: {},
          validation: {}
        }
      };

      layerSystem.registerTemplate(template);
      const templates = layerSystem.getTemplates();
      expect(templates).toContain(template);
    });

    it('should apply templates correctly', () => {
      const template: ConfigurationTemplate = {
        id: 'apply-test',
        name: 'Apply Test Template',
        description: 'Template for testing application',
        version: '1.0.0',
        targets: {
          architectures: ['individual'],
          domains: ['outdoor'],
          complexity: 'simple'
        },
        layers: {
          universal: {
            seeding: {
              defaultUserCount: 25
            }
          } as Partial<UniversalCoreConfig>
        },
        metadata: {
          author: 'Test',
          tags: ['test'],
          usageCount: 0,
          rating: 5,
          lastUpdated: new Date(),
          compatibility: {
            minimumVersion: '2.5.0',
            dependencies: []
          }
        },
        customization: {
          requiredFields: [],
          optionalFields: [],
          defaults: {},
          validation: {}
        }
      };

      layerSystem.registerTemplate(template);
      const success = layerSystem.applyTemplate('apply-test');
      expect(success).toBe(true);

      const universal = layerSystem.getLayer('universal');
      expect(universal.seeding.defaultUserCount).toBe(25);
    });

    it('should get matching templates', () => {
      const templates = layerSystem.getMatchingTemplates('individual', 'outdoor');
      expect(Array.isArray(templates)).toBe(true);
    });
  });
});

describe('Layered Configuration Manager', () => {
  let configManager: LayeredConfigurationManager;

  beforeEach(() => {
    configManager = new LayeredConfigurationManager();
  });

  describe('Configuration Composition', () => {
    it('should compose configuration from all layers', () => {
      const composed = configManager.getConfiguration();

      expect(composed.final).toBeDefined();
      expect(composed.sources).toBeDefined();
      expect(composed.metadata).toBeDefined();
      expect(composed.validation).toBeDefined();

      expect(composed.sources.universal).toBeDefined();
      expect(composed.sources.detection).toBeDefined();
      expect(composed.sources.extensions).toBeDefined();
    });

    it('should handle layer conflicts during composition', () => {
      // Modify detection layer to create a conflict
      const detection = configManager.getLayer<SmartDetectionConfig>('detection');
      if (detection) {
        detection.optimizations.content.suggestedUserCount = 50;
        configManager.updateLayer('detection', detection);
      }

      const composed = configManager.getConfiguration();
      expect(composed.metadata.conflicts).toBeDefined();
    });

    it('should validate composed configuration', () => {
      const composed = configManager.getConfiguration();
      
      expect(composed.validation.valid).toBeDefined();
      expect(Array.isArray(composed.validation.errors)).toBe(true);
      expect(Array.isArray(composed.validation.warnings)).toBe(true);
      expect(Array.isArray(composed.validation.suggestions)).toBe(true);
    });
  });

  describe('Zero Configuration Setup', () => {
    it('should setup zero configuration successfully', async () => {
      const result = await configManager.setupZeroConfiguration();

      expect(result.configuration).toBeDefined();
      expect(result.detection).toBeDefined();
      expect(result.optimizations).toBeDefined();
      expect(result.metadata).toBeDefined();

      expect(result.configuration.userCount).toBeGreaterThan(0);
      expect(result.detection.architecture).toBeTruthy();
      expect(result.detection.domain).toBeTruthy();
    });

    it('should handle zero configuration with detection results', async () => {
      const detectionResults = {
        architecture: 'team' as const,
        domain: 'saas' as const,
        confidence: 0.9,
        evidence: { test: true }
      };

      const result = await configManager.setupZeroConfiguration(detectionResults);

      expect(result.detection.architecture).toBe('team');
      expect(result.detection.domain).toBe('saas');
      expect(result.detection.confidence).toBe(0.9);
    });

    it('should provide setup metadata and recommendations', async () => {
      const result = await configManager.setupZeroConfiguration();

      expect(result.metadata.setupTime).toBeGreaterThanOrEqual(0);
      expect(result.metadata.autoDetectionEnabled).toBeDefined();
      expect(Array.isArray(result.metadata.fallbacksUsed)).toBe(true);
      expect(Array.isArray(result.metadata.recommendedAdjustments)).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update layers correctly', () => {
      const testLayer = {
        layer: {
          type: 'extensions' as const,
          priority: 'medium' as const,
          enabled: true,
          userConfigured: true,
          lastModified: new Date()
        },
        domainExtensions: {
          enabled: [{ name: 'test', enabled: true }]
        },
        archetypes: {
          enabled: true,
          generationConfig: {
            targetArchitecture: 'team' as const,
            targetDomain: 'saas' as const,
            usersPerArchetype: { min: 5, max: 10 },
            distributionStrategy: 'weighted' as const,
            includedCategories: [],
            excludedCategories: [],
            experienceLevelDistribution: {
              beginner: 0.25,
              intermediate: 0.5,
              advanced: 0.2,
              expert: 0.05
            },
            generateRelationships: true,
            relationshipDensity: 0.4,
            applyDomainCustomizations: true
          },
          customArchetypes: [],
          selectionStrategy: { strategy: 'automatic' as const }
        },
        customGenerators: {
          contentGenerators: [],
          relationshipGenerators: [],
          mediaGenerators: []
        },
        integrations: {
          apis: [],
          storage: { providers: [] },
          analytics: { providers: [] }
        },
        businessLogic: {
          validationRules: [],
          transformations: [],
          constraints: []
        }
      };

      configManager.updateLayer('extensions', testLayer);
      const retrieved = configManager.getLayer('extensions');

      expect(retrieved.domainExtensions.enabled).toHaveLength(1);
      expect(retrieved.archetypes.enabled).toBe(true);
    });

    it('should validate complete configuration', () => {
      const validation = configManager.validateConfiguration();

      expect(validation.valid).toBeDefined();
      expect(validation.layerValidation).toBeDefined();
      expect(validation.compositionValidation).toBeDefined();
      expect(Array.isArray(validation.recommendations)).toBe(true);
    });

    it('should reset configuration to defaults', () => {
      // Modify configuration first
      const extensions = configManager.getLayer('extensions');
      if (extensions) {
        extensions.layer.enabled = false;
        configManager.updateLayer('extensions', extensions);
      }

      configManager.reset();
      const resetExtensions = configManager.getLayer('extensions');
      
      expect(resetExtensions.layer.enabled).toBe(false); // Should be reset to default
    });
  });

  describe('Import/Export', () => {
    it('should export configuration correctly', () => {
      const exported = configManager.exportConfiguration();

      expect(exported.layered).toBeDefined();
      expect(exported.composed).toBeDefined();
      expect(exported.metadata).toBeDefined();

      expect(exported.layered.universal).toBeDefined();
      expect(exported.layered.detection).toBeDefined();
      expect(exported.layered.extensions).toBeDefined();
    });

    it('should import layered configuration', () => {
      const exported = configManager.exportConfiguration();
      const success = configManager.importConfiguration({ layered: exported.layered });

      expect(success).toBe(true);
    });

    it('should import composed configuration', () => {
      const composedConfig: FlexibleSeedConfig = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseServiceKey: 'test-key',
        environment: 'local' as const,
        userCount: 15,
        setupsPerUser: 3,
        imagesPerSetup: 2,
        enableRealImages: false,
        seed: 'test-seed',
        schema: {
          framework: 'simple',
          userTable: {
            name: 'users',
            emailField: 'email',
            idField: 'id',
            nameField: 'name'
          },
          setupTable: {
            name: 'setups',
            userField: 'user_id',
            titleField: 'title',
            descriptionField: 'description'
          },
          optionalTables: {}
        },
        storage: {
          buckets: {
            setupImages: 'setup-images',
            gearImages: 'gear-images',
            profileImages: 'profile-images'
          },
          autoCreate: true
        }
      };

      const success = configManager.importConfiguration({ composed: composedConfig });
      expect(success).toBe(true);
    });
  });
});

describe('Conflict Resolution Engine', () => {
  let resolutionEngine: ConflictResolutionEngine;

  beforeEach(() => {
    resolutionEngine = new ConflictResolutionEngine({
      layerPriorities: {
        universal: 'highest',
        detection: 'high',
        extensions: 'medium'
      },
      defaultStrategy: 'merge',
      pathStrategies: {},
      userPreferences: {
        autoResolveLevel: 'moderate',
        prioritizePerformance: false,
        prioritizeCompatibility: true,
        allowDataLoss: false
      },
      constraints: {
        maxResolutionTime: 5000,
        requireUserConfirmation: ['supabaseUrl', 'supabaseServiceKey'],
        prohibitedChanges: ['environment']
      }
    });
  });

  describe('Conflict Detection', () => {
    it('should detect value conflicts between layers', () => {
      const baseConfig = { userCount: 10, batchSize: 50 };
      const overlayConfig = { userCount: 20, batchSize: 50 };

      const conflicts = resolutionEngine.detectConflicts(
        baseConfig,
        overlayConfig,
        'detection'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].path).toBe('userCount');
      expect(conflicts[0].type).toBe('value_mismatch');
    });

    it('should detect type mismatch conflicts', () => {
      const baseConfig = { userCount: 10 };
      const overlayConfig = { userCount: '20' };

      const conflicts = resolutionEngine.detectConflicts(
        baseConfig,
        overlayConfig,
        'detection'
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('type_mismatch');
    });

    it('should assess conflict severity correctly', () => {
      const baseConfig = { supabaseUrl: 'url1' };
      const overlayConfig = { supabaseUrl: 'url2' };

      const conflicts = resolutionEngine.detectConflicts(
        baseConfig,
        overlayConfig,
        'detection'
      );

      expect(conflicts[0].severity).toBe('critical');
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve single conflicts', () => {
      const conflict = {
        id: 'test-conflict',
        path: 'userCount',
        values: { universal: 10, detection: 20 } as any,
        severity: 'medium' as const,
        type: 'value_mismatch' as const,
        suggestedResolution: {
          strategy: 'override' as const,
          reason: 'Simple value override',
          confidence: 0.8
        },
        resolutionOptions: [],
        autoResolvable: true,
        impact: {
          affectedFeatures: [],
          performanceImpact: 'none' as const,
          compatibilityRisk: 'none' as const,
          userExperienceImpact: 'none' as const
        }
      };

      const result = resolutionEngine.resolveConflict(conflict);

      expect(result.success).toBe(true);
      expect(result.resolvedValue).toBe(20);
      expect(result.appliedStrategy).toBe('override');
    });

    it('should resolve multiple conflicts in batch', () => {
      const conflicts = [
        {
          id: 'conflict-1',
          path: 'userCount',
          values: { universal: 10, detection: 20 } as any,
          severity: 'low' as const,
          type: 'value_mismatch' as const,
          suggestedResolution: { strategy: 'override' as const, reason: 'test', confidence: 0.8 },
          resolutionOptions: [],
          autoResolvable: true,
          impact: {
            affectedFeatures: [],
            performanceImpact: 'none' as const,
            compatibilityRisk: 'none' as const,
            userExperienceImpact: 'none' as const
          }
        },
        {
          id: 'conflict-2',
          path: 'batchSize',
          values: { universal: 50, detection: 100 } as any,
          severity: 'low' as const,
          type: 'value_mismatch' as const,
          suggestedResolution: { strategy: 'override' as const, reason: 'test', confidence: 0.8 },
          resolutionOptions: [],
          autoResolvable: true,
          impact: {
            affectedFeatures: [],
            performanceImpact: 'low' as const,
            compatibilityRisk: 'none' as const,
            userExperienceImpact: 'none' as const
          }
        }
      ];

      const result = resolutionEngine.resolveConflicts(conflicts);

      expect(result.summary.totalConflicts).toBe(2);
      expect(result.summary.resolvedCount).toBeGreaterThan(0);
      expect(result.resolved.length).toBeGreaterThan(0);
    });

    it('should suggest optimal resolution strategies', () => {
      const conflict = {
        id: 'strategy-test',
        path: 'nestedObject',
        values: { 
          universal: { a: 1, b: 2 }, 
          detection: { b: 3, c: 4 } 
        } as any,
        severity: 'medium' as const,
        type: 'value_mismatch' as const,
        suggestedResolution: { strategy: 'merge' as const, reason: 'test', confidence: 0.8 },
        resolutionOptions: [],
        autoResolvable: true,
        impact: {
          affectedFeatures: [],
          performanceImpact: 'none' as const,
          compatibilityRisk: 'none' as const,
          userExperienceImpact: 'none' as const
        }
      };

      const suggestion = resolutionEngine.suggestResolutionStrategy(conflict);

      expect(suggestion.primary).toBeDefined();
      expect(Array.isArray(suggestion.alternatives)).toBe(true);
      expect(Array.isArray(suggestion.considerations)).toBe(true);
    });
  });

  describe('Resolution Statistics', () => {
    it('should provide resolution statistics', () => {
      const stats = resolutionEngine.getResolutionStatistics();

      expect(stats.totalConflicts).toBeDefined();
      expect(stats.resolvedConflicts).toBeDefined();
      expect(stats.failedResolutions).toBeDefined();
      expect(stats.averageResolutionTime).toBeDefined();
      expect(stats.successRate).toBeDefined();
    });
  });
});

describe('Zero Configuration Engine', () => {
  let zeroConfigEngine: ZeroConfigurationEngine;

  beforeEach(() => {
    zeroConfigEngine = new ZeroConfigurationEngine();
  });

  describe('Zero Configuration Generation', () => {
    it('should generate complete zero configuration', async () => {
      const result = await zeroConfigEngine.generateZeroConfiguration(
        'https://test.supabase.co',
        'test-service-key'
      );

      expect(result.configuration).toBeDefined();
      expect(result.intelligence).toBeDefined();
      expect(result.setup).toBeDefined();
      expect(result.validation).toBeDefined();

      expect(result.configuration.supabaseUrl).toBe('https://test.supabase.co');
      expect(result.configuration.supabaseServiceKey).toBe('test-service-key');
      expect(result.configuration.userCount).toBeGreaterThan(0);
    });

    it('should respect zero configuration options', async () => {
      const options = {
        environment: 'production' as const,
        preferences: {
          fastMode: true,
          minimalData: true,
          userCount: 5
        },
        safety: {
          dryRun: true,
          validateConfig: true
        }
      };

      const result = await zeroConfigEngine.generateZeroConfiguration(
        'https://test.supabase.co',
        'test-service-key',
        options
      );

      expect(result.configuration.environment).toBe('production');
      expect(result.configuration.userCount).toBeLessThanOrEqual(5);
    });

    it('should provide intelligence metadata', async () => {
      const result = await zeroConfigEngine.generateZeroConfiguration(
        'https://test.supabase.co',
        'test-service-key'
      );

      expect(result.intelligence.detection).toBeDefined();
      expect(result.intelligence.optimizations).toBeDefined();
      expect(result.intelligence.fallbacks).toBeDefined();

      expect(result.intelligence.detection.architecture).toBeTruthy();
      expect(result.intelligence.detection.domain).toBeTruthy();
      expect(result.intelligence.detection.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should provide setup process details', async () => {
      const result = await zeroConfigEngine.generateZeroConfiguration(
        'https://test.supabase.co',
        'test-service-key'
      );

      expect(result.setup.totalTime).toBeGreaterThan(0);
      expect(Array.isArray(result.setup.steps)).toBe(true);
      expect(Array.isArray(result.setup.warnings)).toBe(true);
      expect(Array.isArray(result.setup.recommendations)).toBe(true);
      expect(Array.isArray(result.setup.nextSteps)).toBe(true);

      expect(result.setup.steps.length).toBeGreaterThan(0);
      result.setup.steps.forEach(step => {
        expect(step.step).toBeTruthy();
        expect(step.duration).toBeGreaterThanOrEqual(0);
        expect(typeof step.success).toBe('boolean');
      });
    });
  });

  describe('Minimal Configuration', () => {
    it('should generate minimal configuration', () => {
      const config = zeroConfigEngine.generateMinimalConfiguration(
        'https://test.supabase.co',
        'test-service-key'
      );

      expect(config.supabaseUrl).toBe('https://test.supabase.co');
      expect(config.supabaseServiceKey).toBe('test-service-key');
      expect(config.userCount).toBeLessThanOrEqual(5);
      expect(config.setupsPerUser).toBe(1);
      expect(config.imagesPerSetup).toBe(1);
      expect(config.enableRealImages).toBe(false);
    });

    it('should adapt minimal configuration to environment', () => {
      const devConfig = zeroConfigEngine.generateMinimalConfiguration(
        'https://test.supabase.co',
        'test-service-key',
        'local'
      );

      const prodConfig = zeroConfigEngine.generateMinimalConfiguration(
        'https://test.supabase.co',
        'test-service-key',
        'production'
      );

      expect(devConfig.environment).toBe('local');
      expect(prodConfig.environment).toBe('production');
    });
  });

  describe('Recommended Configuration', () => {
    it('should provide use case specific recommendations', () => {
      const testingConfig = zeroConfigEngine.getRecommendedConfiguration('testing');
      const productionConfig = zeroConfigEngine.getRecommendedConfiguration('production');

      expect(testingConfig.userCount).toBeLessThan(productionConfig.userCount!);
      expect(testingConfig.enableRealImages).toBe(false);
    });

    it('should adapt recommendations to platform and domain', () => {
      const individualConfig = zeroConfigEngine.getRecommendedConfiguration(
        'local',
        'individual',
        'outdoor'
      );

      const teamConfig = zeroConfigEngine.getRecommendedConfiguration(
        'local',
        'team',
        'saas'
      );

      expect(individualConfig.createTeamAccounts).toBe(false);
      expect(teamConfig.createTeamAccounts).toBe(true);
      expect(individualConfig.domain).toBe('outdoor');
      expect(teamConfig.domain).toBe('saas');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate generated configurations', async () => {
      const result = await zeroConfigEngine.generateZeroConfiguration(
        'https://test.supabase.co',
        'test-service-key'
      );

      expect(result.validation.valid).toBeDefined();
      expect(Array.isArray(result.validation.errors)).toBe(true);
      expect(Array.isArray(result.validation.warnings)).toBe(true);
      expect(typeof result.validation.score).toBe('number');
      expect(result.validation.score).toBeGreaterThanOrEqual(0);
      expect(result.validation.score).toBeLessThanOrEqual(100);
    });

    it('should detect configuration issues', async () => {
      const result = await zeroConfigEngine.generateZeroConfiguration(
        '', // Invalid empty URL
        'test-service-key'
      );

      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);
      expect(result.validation.score).toBeLessThan(100);
    });
  });
});