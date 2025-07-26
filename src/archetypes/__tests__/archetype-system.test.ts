/**
 * Comprehensive Test Suite for Archetype System
 * Tests for Task 4.1: Platform-Specific Archetype System
 * Validates all archetype functionality including types, manager, patterns, and integration
 */

import {
  ArchetypeManager,
  DEFAULT_ARCHETYPE_CONFIG
} from '../archetype-manager';
import { BehaviorPatternEngine } from '../behavior-patterns';
import { ArchetypeIntegrationManager } from '../archetype-integration';
import {
  CONTENT_CREATOR_ARCHETYPE,
  CONTENT_DISCOVERER_ARCHETYPE,
  COMMUNITY_EXPERT_ARCHETYPE,
  CASUAL_BROWSER_ARCHETYPE,
  POWER_USER_ARCHETYPE,
  SOCIAL_CONNECTOR_ARCHETYPE,
  INDIVIDUAL_CREATOR_COLLECTION,
  getCustomizedArchetype
} from '../individual-archetypes';
import type {
  UserArchetype,
  ArchetypeGenerationConfig,
  ArchetypeApplicationResult,
  ArchetypeValidationResult,
  ArchetypeCategory,
  ExperienceLevel,
  ActivityFrequency,
  EngagementDepth
} from '../archetype-types';
import type { PlatformArchitectureType, ContentDomainType } from '../../detection/detection-types';

describe('Archetype Types and Validation', () => {
  describe('UserArchetype interface compliance', () => {
    it('should validate content creator archetype structure', () => {
      expect(CONTENT_CREATOR_ARCHETYPE.id).toBe('individual_content_creator');
      expect(CONTENT_CREATOR_ARCHETYPE.name).toBe('Content Creator');
      expect(CONTENT_CREATOR_ARCHETYPE.category).toBe('content_creator');
      expect(CONTENT_CREATOR_ARCHETYPE.enabled).toBe(true);
      expect(CONTENT_CREATOR_ARCHETYPE.selectionWeight).toBeGreaterThan(0);
      expect(CONTENT_CREATOR_ARCHETYPE.supportedArchitectures).toContain('individual');
      expect(CONTENT_CREATOR_ARCHETYPE.contentCreation).toBeDefined();
      expect(CONTENT_CREATOR_ARCHETYPE.socialInteraction).toBeDefined();
      expect(CONTENT_CREATOR_ARCHETYPE.platformUsage).toBeDefined();
    });

    it('should validate all individual archetypes have required properties', () => {
      const archetypes = [
        CONTENT_CREATOR_ARCHETYPE,
        CONTENT_DISCOVERER_ARCHETYPE,
        COMMUNITY_EXPERT_ARCHETYPE,
        CASUAL_BROWSER_ARCHETYPE,
        POWER_USER_ARCHETYPE,
        SOCIAL_CONNECTOR_ARCHETYPE
      ];

      archetypes.forEach(archetype => {
        expect(archetype.id).toBeTruthy();
        expect(archetype.name).toBeTruthy();
        expect(archetype.description).toBeTruthy();
        expect(archetype.category).toBeTruthy();
        expect(archetype.experienceLevel).toBeTruthy();
        expect(archetype.activityFrequency).toBeTruthy();
        expect(archetype.engagementDepth).toBeTruthy();
        expect(Array.isArray(archetype.motivations)).toBe(true);
        expect(Array.isArray(archetype.supportedArchitectures)).toBe(true);
        expect(Array.isArray(archetype.supportedDomains)).toBe(true);
        expect(typeof archetype.selectionWeight).toBe('number');
        expect(typeof archetype.enabled).toBe('boolean');
      });
    });

    it('should validate content creation patterns', () => {
      const pattern = CONTENT_CREATOR_ARCHETYPE.contentCreation;
      
      expect(Array.isArray(pattern.contentTypes)).toBe(true);
      expect(pattern.contentTypes.length).toBeGreaterThan(0);
      expect(typeof pattern.publicContentRatio).toBe('number');
      expect(pattern.publicContentRatio).toBeGreaterThanOrEqual(0);
      expect(pattern.publicContentRatio).toBeLessThanOrEqual(1);
      expect(typeof pattern.includesMedia).toBe('boolean');
      expect(pattern.itemsPerSession.min).toBeLessThanOrEqual(pattern.itemsPerSession.max);
      expect(pattern.itemsPerSession.average).toBeGreaterThanOrEqual(pattern.itemsPerSession.min);
      expect(pattern.itemsPerSession.average).toBeLessThanOrEqual(pattern.itemsPerSession.max);
    });

    it('should validate social interaction patterns', () => {
      const pattern = CONTENT_CREATOR_ARCHETYPE.socialInteraction;
      
      expect(Array.isArray(pattern.interactionTypes)).toBe(true);
      expect(pattern.interactionTypes.length).toBeGreaterThan(0);
      expect(typeof pattern.publicInteractionRatio).toBe('number');
      expect(pattern.publicInteractionRatio).toBeGreaterThanOrEqual(0);
      expect(pattern.publicInteractionRatio).toBeLessThanOrEqual(1);
      expect(typeof pattern.responseRate).toBe('number');
      expect(pattern.responseRate).toBeGreaterThanOrEqual(0);
      expect(pattern.responseRate).toBeLessThanOrEqual(1);
      expect(typeof pattern.initiatesInteractions).toBe('boolean');
    });

    it('should validate platform usage patterns', () => {
      const pattern = CONTENT_CREATOR_ARCHETYPE.platformUsage;
      
      expect(Array.isArray(pattern.primaryFeatures)).toBe(true);
      expect(Array.isArray(pattern.avoidedFeatures)).toBe(true);
      expect(Array.isArray(pattern.devicePreferences)).toBe(true);
      expect(Array.isArray(pattern.usageTimePatterns)).toBe(true);
      expect(pattern.sessionDuration.min).toBeLessThanOrEqual(pattern.sessionDuration.max);
      expect(pattern.sessionDuration.average).toBeGreaterThanOrEqual(pattern.sessionDuration.min);
      expect(pattern.sessionDuration.average).toBeLessThanOrEqual(pattern.sessionDuration.max);
    });
  });

  describe('Individual Creator Collection', () => {
    it('should contain all expected archetypes', () => {
      expect(INDIVIDUAL_CREATOR_COLLECTION.archetypes).toHaveLength(6);
      
      const archetypeIds = INDIVIDUAL_CREATOR_COLLECTION.archetypes.map(a => a.id);
      expect(archetypeIds).toContain('individual_content_creator');
      expect(archetypeIds).toContain('individual_content_discoverer');
      expect(archetypeIds).toContain('individual_community_expert');
      expect(archetypeIds).toContain('individual_casual_browser');
      expect(archetypeIds).toContain('individual_power_user');
      expect(archetypeIds).toContain('individual_social_connector');
    });

    it('should have valid collection metadata', () => {
      expect(INDIVIDUAL_CREATOR_COLLECTION.name).toBe('Individual Creator Archetypes');
      expect(INDIVIDUAL_CREATOR_COLLECTION.version).toBe('1.0.0');
      expect(INDIVIDUAL_CREATOR_COLLECTION.targetArchitecture).toBe('individual');
      expect(INDIVIDUAL_CREATOR_COLLECTION.defaultGenerationConfig).toBeDefined();
      expect(INDIVIDUAL_CREATOR_COLLECTION.metadata.createdAt).toBeInstanceOf(Date);
      expect(INDIVIDUAL_CREATOR_COLLECTION.metadata.updatedAt).toBeInstanceOf(Date);
      expect(Array.isArray(INDIVIDUAL_CREATOR_COLLECTION.metadata.tags)).toBe(true);
    });

    it('should have realistic selection weights distribution', () => {
      const weights = INDIVIDUAL_CREATOR_COLLECTION.archetypes.map(a => a.selectionWeight);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      
      expect(totalWeight).toBeGreaterThan(0);
      expect(Math.max(...weights)).toBeLessThanOrEqual(100);
      expect(Math.min(...weights)).toBeGreaterThanOrEqual(0);
      
      // Check that weights are distributed reasonably
      const highWeightArchetypes = weights.filter(w => w > 70).length;
      const lowWeightArchetypes = weights.filter(w => w < 50).length;
      
      expect(highWeightArchetypes).toBeGreaterThan(0); // Some should be highly weighted
      expect(lowWeightArchetypes).toBeGreaterThan(0); // Some should be less common
    });
  });

  describe('Domain Customizations', () => {
    it('should customize outdoor archetypes correctly', () => {
      const originalArchetype = CONTENT_CREATOR_ARCHETYPE;
      const customizedArchetype = getCustomizedArchetype(originalArchetype, 'outdoor');
      
      expect(customizedArchetype.contentCreation.contentTypes).toContain('trip_reports');
      expect(customizedArchetype.contentCreation.contentTypes).toContain('gear_reviews');
      expect(customizedArchetype.metadata.gearFocus).toBe(true);
      expect(customizedArchetype.metadata.locationSharing).toBe(true);
      expect(customizedArchetype.metadata.safetyAware).toBe(true);
    });

    it('should customize SaaS archetypes correctly', () => {
      const originalArchetype = POWER_USER_ARCHETYPE;
      const customizedArchetype = getCustomizedArchetype(originalArchetype, 'saas');
      
      expect(customizedArchetype.contentCreation.contentTypes).toContain('workflow_templates');
      expect(customizedArchetype.contentCreation.contentTypes).toContain('automation_guides');
      expect(customizedArchetype.metadata.productivityFocus).toBe(true);
      expect(customizedArchetype.metadata.integrationHeavy).toBe(true);
    });

    it('should return original archetype for unsupported domains', () => {
      const originalArchetype = CONTENT_CREATOR_ARCHETYPE;
      const customizedArchetype = getCustomizedArchetype(originalArchetype, 'generic');
      
      expect(customizedArchetype).toEqual(originalArchetype);
    });
  });
});

describe('ArchetypeManager', () => {
  let manager: ArchetypeManager;

  beforeEach(() => {
    manager = new ArchetypeManager();
  });

  describe('Archetype Registration', () => {
    it('should register individual archetypes successfully', () => {
      manager.registerArchetype(CONTENT_CREATOR_ARCHETYPE);
      
      const retrieved = manager.getArchetype('individual_content_creator');
      expect(retrieved).toEqual(CONTENT_CREATOR_ARCHETYPE);
    });

    it('should register archetype collection successfully', () => {
      manager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
      
      const allArchetypes = manager.getAllArchetypes();
      expect(allArchetypes).toHaveLength(6);
      
      const archetypeIds = allArchetypes.map(a => a.id);
      expect(archetypeIds).toContain('individual_content_creator');
      expect(archetypeIds).toContain('individual_content_discoverer');
    });

    it('should reject invalid archetypes', () => {
      const invalidArchetype = {
        ...CONTENT_CREATOR_ARCHETYPE,
        id: '', // Invalid empty ID
        selectionWeight: 150 // Invalid weight > 100
      };

      expect(() => {
        manager.registerArchetype(invalidArchetype as UserArchetype);
      }).toThrow();
    });
  });

  describe('Archetype Selection and Filtering', () => {
    beforeEach(() => {
      manager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
    });

    it('should get compatible archetypes by architecture and domain', () => {
      const compatible = manager.getCompatibleArchetypes('individual', 'outdoor');
      
      expect(compatible.length).toBeGreaterThan(0);
      compatible.forEach(archetype => {
        const hasArchitecture = archetype.supportedArchitectures.includes('individual');
        const hasDomain = archetype.supportedDomains.includes('outdoor') || 
                         archetype.supportedDomains.includes('generic');
        expect(hasArchitecture || hasDomain).toBe(true);
      });
    });

    it('should get archetypes by category', () => {
      const contentCreators = manager.getArchetypesByCategory('content_creator');
      
      expect(contentCreators.length).toBeGreaterThan(0);
      contentCreators.forEach(archetype => {
        expect(archetype.category).toBe('content_creator');
        expect(archetype.enabled).toBe(true);
      });
    });

    it('should select archetypes for generation based on configuration', () => {
      const config: Partial<ArchetypeGenerationConfig> = {
        targetArchitecture: 'individual',
        targetDomain: 'outdoor',
        includedCategories: ['content_creator', 'community_expert'],
        distributionStrategy: 'weighted'
      };

      const selected = manager.selectArchetypesForGeneration(config);
      
      expect(selected.length).toBeGreaterThan(0);
      selected.forEach(archetype => {
        expect(['content_creator', 'community_expert']).toContain(archetype.category);
      });
    });

    it('should exclude specified categories', () => {
      const config: Partial<ArchetypeGenerationConfig> = {
        excludedCategories: ['casual_browser'],
        includedCategories: []
      };

      const selected = manager.selectArchetypesForGeneration(config);
      
      selected.forEach(archetype => {
        expect(archetype.category).not.toBe('casual_browser');
      });
    });
  });

  describe('User Generation', () => {
    beforeEach(() => {
      manager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
    });

    it('should generate user from archetype successfully', () => {
      const result = manager.generateUserFromArchetype(CONTENT_CREATOR_ARCHETYPE, 'test_seed');
      
      expect(result.archetype).toEqual(CONTENT_CREATOR_ARCHETYPE);
      expect(result.userData.profile).toBeDefined();
      expect(result.userData.preferences).toBeDefined();
      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.seedValue).toBe('test_seed');
      expect(result.appliedPatterns.contentCreation).toBe(true);
      expect(result.appliedPatterns.socialInteraction).toBe(true);
      expect(result.appliedPatterns.platformUsage).toBe(true);
    });

    it('should generate initial content for content-focused archetypes', () => {
      const result = manager.generateUserFromArchetype(CONTENT_CREATOR_ARCHETYPE);
      
      expect(result.userData.initialContent).toBeDefined();
      expect(Array.isArray(result.userData.initialContent)).toBe(true);
      if (result.userData.initialContent?.length > 0) {
        expect(result.userData.initialContent[0]).toHaveProperty('type');
        expect(result.userData.initialContent[0]).toHaveProperty('complexity');
        expect(result.userData.initialContent[0]).toHaveProperty('isPublic');
      }
    });

    it('should not generate initial content for discovery-focused archetypes', () => {
      const result = manager.generateUserFromArchetype(CASUAL_BROWSER_ARCHETYPE);
      
      // Casual browsers typically don't create initial content
      expect(result.userData.initialContent).toBeUndefined();
    });

    it('should generate relationships when enabled', () => {
      manager.updateGenerationConfig({ generateRelationships: true });
      const result = manager.generateUserFromArchetype(SOCIAL_CONNECTOR_ARCHETYPE);
      
      expect(result.userData.relationships).toBeDefined();
      expect(Array.isArray(result.userData.relationships)).toBe(true);
    });
  });

  describe('Archetype Validation', () => {
    beforeEach(() => {
      manager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
    });

    it('should validate correct archetypes successfully', () => {
      const validation = manager.validateArchetype(CONTENT_CREATOR_ARCHETYPE);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidArchetype = {
        ...CONTENT_CREATOR_ARCHETYPE,
        id: '',
        name: ''
      };

      const validation = manager.validateArchetype(invalidArchetype as UserArchetype);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'id')).toBe(true);
      expect(validation.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should detect invalid ratio values', () => {
      const invalidArchetype = {
        ...CONTENT_CREATOR_ARCHETYPE,
        contentCreation: {
          ...CONTENT_CREATOR_ARCHETYPE.contentCreation,
          publicContentRatio: 1.5 // Invalid: > 1
        },
        socialInteraction: {
          ...CONTENT_CREATOR_ARCHETYPE.socialInteraction,
          responseRate: -0.1 // Invalid: < 0
        }
      };

      const validation = manager.validateArchetype(invalidArchetype as UserArchetype);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.field === 'contentCreation.publicContentRatio')).toBe(true);
      expect(validation.errors.some(e => e.field === 'socialInteraction.responseRate')).toBe(true);
    });

    it('should generate warnings for potential issues', () => {
      const archetypeWithIssues = {
        ...CONTENT_CREATOR_ARCHETYPE,
        selectionWeight: 0, // Will generate warning
        supportedArchitectures: [], // Will generate warning
        contentCreation: {
          ...CONTENT_CREATOR_ARCHETYPE.contentCreation,
          contentTypes: [] // Will generate suggestion
        }
      };

      const validation = manager.validateArchetype(archetypeWithIssues as UserArchetype);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update generation configuration', () => {
      const newConfig: Partial<ArchetypeGenerationConfig> = {
        targetArchitecture: 'team',
        relationshipDensity: 0.8,
        distributionStrategy: 'equal'
      };

      manager.updateGenerationConfig(newConfig);
      const currentConfig = manager.getGenerationConfig();
      
      expect(currentConfig.targetArchitecture).toBe('team');
      expect(currentConfig.relationshipDensity).toBe(0.8);
      expect(currentConfig.distributionStrategy).toBe('equal');
    });

    it('should reset to default configuration', () => {
      manager.updateGenerationConfig({ targetArchitecture: 'team' });
      manager.resetConfiguration();
      
      const config = manager.getGenerationConfig();
      expect(config.targetArchitecture).toBe(DEFAULT_ARCHETYPE_CONFIG.targetArchitecture);
    });
  });

  describe('Statistics and Analytics', () => {
    beforeEach(() => {
      manager.registerCollection(INDIVIDUAL_CREATOR_COLLECTION);
    });

    it('should provide accurate statistics', () => {
      const stats = manager.getStatistics();
      
      expect(stats.totalArchetypes).toBe(6);
      expect(stats.enabledArchetypes).toBe(6); // All should be enabled
      expect(typeof stats.archetypesByCategory).toBe('object');
      expect(typeof stats.archetypesByArchitecture).toBe('object');
      expect(typeof stats.archetypesByDomain).toBe('object');
      
      // Check category distribution
      expect(stats.archetypesByCategory['content_creator']).toBeGreaterThan(0);
      expect(stats.archetypesByCategory['content_discoverer']).toBeGreaterThan(0);
    });

    it('should count architecture and domain support correctly', () => {
      const stats = manager.getStatistics();
      
      // All individual archetypes should support 'individual' architecture
      expect(stats.archetypesByArchitecture['individual']).toBe(6);
      
      // All should support at least 'generic' domain
      expect(stats.archetypesByDomain['generic']).toBeGreaterThan(0);
    });
  });
});

describe('BehaviorPatternEngine', () => {
  let engine: BehaviorPatternEngine;

  beforeEach(() => {
    engine = new BehaviorPatternEngine();
  });

  describe('Content Generation Scenarios', () => {
    it('should generate realistic content scenarios', () => {
      const scenario = engine.generateContentScenario(CONTENT_CREATOR_ARCHETYPE, 'outdoor');
      
      expect(scenario.name).toBeTruthy();
      expect(scenario.description).toBeTruthy();
      expect(Array.isArray(scenario.contentItems)).toBe(true);
      expect(Array.isArray(scenario.interactions)).toBe(true);
      expect(Array.isArray(scenario.platformActions)).toBe(true);
      
      // Check content items structure
      if (scenario.contentItems.length > 0) {
        const item = scenario.contentItems[0];
        expect(item.type).toBeTruthy();
        expect(typeof item.isPublic).toBe('boolean');
        expect(typeof item.hasMedia).toBe('boolean');
        expect(item.metadata).toBeDefined();
      }
    });

    it('should respect archetype content creation patterns', () => {
      const scenario = engine.generateContentScenario(CONTENT_CREATOR_ARCHETYPE, 'outdoor');
      
      // Content count should be within archetype limits
      const pattern = CONTENT_CREATOR_ARCHETYPE.contentCreation;
      expect(scenario.contentItems.length).toBeGreaterThanOrEqual(pattern.itemsPerSession.min);
      expect(scenario.contentItems.length).toBeLessThanOrEqual(pattern.itemsPerSession.max);
      
      // Public content ratio should be respected (approximately)
      const publicItems = scenario.contentItems.filter(item => item.isPublic);
      const publicRatio = publicItems.length / scenario.contentItems.length;
      expect(publicRatio).toBeGreaterThanOrEqual(pattern.publicContentRatio - 0.3);
      expect(publicRatio).toBeLessThanOrEqual(pattern.publicContentRatio + 0.3);
    });

    it('should adapt content types to domain', () => {
      const outdoorScenario = engine.generateContentScenario(CONTENT_CREATOR_ARCHETYPE, 'outdoor');
      const saasScenario = engine.generateContentScenario(POWER_USER_ARCHETYPE, 'saas');
      
      // Should generate domain-appropriate content
      expect(outdoorScenario.contentItems.length).toBeGreaterThan(0);
      expect(saasScenario.contentItems.length).toBeGreaterThan(0);
      
      // Check that content metadata reflects domain
      if (outdoorScenario.contentItems.length > 0) {
        expect(outdoorScenario.contentItems[0].metadata.domain).toBe('outdoor');
      }
      if (saasScenario.contentItems.length > 0) {
        expect(saasScenario.contentItems[0].metadata.domain).toBe('saas');
      }
    });
  });

  describe('User Session Simulation', () => {
    it('should simulate realistic user sessions', () => {
      const simulation = engine.simulateUserSession(CONTENT_CREATOR_ARCHETYPE, 'test_user_123');
      
      expect(simulation.sessionId).toBeTruthy();
      expect(simulation.userId).toBe('test_user_123');
      expect(simulation.archetypeId).toBe('individual_content_creator');
      expect(simulation.startTime).toBeInstanceOf(Date);
      expect(simulation.endTime).toBeInstanceOf(Date);
      expect(simulation.endTime.getTime()).toBeGreaterThan(simulation.startTime.getTime());
      expect(Array.isArray(simulation.actions)).toBe(true);
      expect(Array.isArray(simulation.contentCreated)).toBe(true);
      expect(Array.isArray(simulation.interactionsPerformed)).toBe(true);
    });

    it('should respect archetype session duration patterns', () => {
      const simulation = engine.simulateUserSession(CONTENT_CREATOR_ARCHETYPE, 'test_user');
      const pattern = CONTENT_CREATOR_ARCHETYPE.platformUsage.sessionDuration;
      
      expect(simulation.duration).toBeGreaterThanOrEqual(pattern.min);
      expect(simulation.duration).toBeLessThanOrEqual(pattern.max);
    });

    it('should generate appropriate number of actions', () => {
      const simulation = engine.simulateUserSession(POWER_USER_ARCHETYPE, 'test_user');
      
      // Power users should have more actions than casual browsers
      expect(simulation.actions.length).toBeGreaterThan(0);
      
      // Actions should have proper structure
      if (simulation.actions.length > 0) {
        const action = simulation.actions[0];
        expect(action.timestamp).toBeInstanceOf(Date);
        expect(action.action).toBeTruthy();
        expect(action.data).toBeDefined();
      }
    });
  });

  describe('Engagement Pattern Generation', () => {
    it('should generate realistic engagement patterns', () => {
      const mockContent = [
        { id: 'content_1', type: 'post' },
        { id: 'content_2', type: 'guide' },
        { id: 'content_3', type: 'photo' }
      ];

      const pattern = engine.generateEngagementPattern(COMMUNITY_EXPERT_ARCHETYPE, mockContent);
      
      expect(Array.isArray(pattern.viewPattern)).toBe(true);
      expect(Array.isArray(pattern.interactionPattern)).toBe(true);
      expect(Array.isArray(pattern.followUpPattern)).toBe(true);
      
      // Should have view patterns for all content
      expect(pattern.viewPattern).toHaveLength(mockContent.length);
      
      // Check view pattern structure
      if (pattern.viewPattern.length > 0) {
        const view = pattern.viewPattern[0];
        expect(view.contentId).toBeTruthy();
        expect(typeof view.viewDuration).toBe('number');
        expect(typeof view.engaged).toBe('boolean');
      }
    });

    it('should reflect archetype engagement depth', () => {
      const mockContent = [{ id: 'test', type: 'post' }];
      
      const passivePattern = engine.generateEngagementPattern(CASUAL_BROWSER_ARCHETYPE, mockContent);
      const activePattern = engine.generateEngagementPattern(COMMUNITY_EXPERT_ARCHETYPE, mockContent);
      
      // Active users should have longer view durations and more interactions
      if (passivePattern.viewPattern.length > 0 && activePattern.viewPattern.length > 0) {
        expect(activePattern.viewPattern[0].viewDuration)
          .toBeGreaterThanOrEqual(passivePattern.viewPattern[0].viewDuration);
      }
    });
  });

  describe('Domain Customizations', () => {
    it('should apply domain-specific behavior customizations', () => {
      const originalArchetype = CONTENT_CREATOR_ARCHETYPE;
      const customizedArchetype = engine.applyDomainCustomizations(originalArchetype, 'outdoor');
      
      // Should maintain original structure but with domain customizations
      expect(customizedArchetype.id).toBe(originalArchetype.id);
      expect(customizedArchetype.name).toBe(originalArchetype.name);
      expect(customizedArchetype.metadata.domainCustomizations).toBe('Outdoor Domain');
    });

    it('should preserve original archetype for unsupported domains', () => {
      const originalArchetype = CONTENT_CREATOR_ARCHETYPE;
      const customizedArchetype = engine.applyDomainCustomizations(originalArchetype, 'generic');
      
      // Should return original archetype unchanged
      expect(customizedArchetype).toEqual(originalArchetype);
    });
  });

  describe('Content Frequency Calculations', () => {
    it('should calculate realistic content frequencies', () => {
      const frequency = engine.calculateContentFrequency(CONTENT_CREATOR_ARCHETYPE);
      
      expect(typeof frequency.daily).toBe('number');
      expect(typeof frequency.weekly).toBe('number');
      expect(typeof frequency.monthly).toBe('number');
      
      expect(frequency.daily).toBeGreaterThan(0);
      expect(frequency.weekly).toBeGreaterThan(frequency.daily);
      expect(frequency.monthly).toBeGreaterThan(frequency.weekly);
    });

    it('should vary frequency based on archetype activity level', () => {
      const activeFrequency = engine.calculateContentFrequency(CONTENT_CREATOR_ARCHETYPE);
      const casualFrequency = engine.calculateContentFrequency(CASUAL_BROWSER_ARCHETYPE);
      
      // Active creators should have higher content frequency
      expect(activeFrequency.daily).toBeGreaterThan(casualFrequency.daily);
    });
  });

  describe('Activity Timing Patterns', () => {
    it('should generate realistic timing patterns', () => {
      const pattern = engine.generateActivityTimingPattern(CONTENT_CREATOR_ARCHETYPE);
      
      expect(Array.isArray(pattern.preferredTimes)).toBe(true);
      expect(typeof pattern.activityDistribution).toBe('object');
      expect(typeof pattern.sessionPatterns).toBe('object');
      
      expect(pattern.sessionPatterns.short).toBeGreaterThanOrEqual(0);
      expect(pattern.sessionPatterns.medium).toBeGreaterThanOrEqual(0);
      expect(pattern.sessionPatterns.long).toBeGreaterThanOrEqual(0);
      
      // Proportions should sum to approximately 1
      const total = pattern.sessionPatterns.short + pattern.sessionPatterns.medium + pattern.sessionPatterns.long;
      expect(total).toBeCloseTo(1, 1);
    });

    it('should reflect archetype usage patterns', () => {
      const pattern = engine.generateActivityTimingPattern(CONTENT_CREATOR_ARCHETYPE);
      
      // Should include archetype's preferred usage times
      expect(pattern.preferredTimes).toEqual(CONTENT_CREATOR_ARCHETYPE.platformUsage.usageTimePatterns);
    });
  });
});

describe('ArchetypeIntegrationManager', () => {
  let integrationManager: ArchetypeIntegrationManager;

  beforeEach(() => {
    integrationManager = new ArchetypeIntegrationManager();
  });

  describe('Platform-Aware Archetype Selection', () => {
    it('should select appropriate archetypes for platform', () => {
      const result = integrationManager.selectArchetypesForPlatform({
        architecture: 'individual',
        domain: 'outdoor'
      });
      
      expect(result.detectedArchitecture).toBe('individual');
      expect(result.detectedDomain).toBe('outdoor');
      expect(result.selectedArchetypes.length).toBeGreaterThan(0);
      expect(result.optimizedConfig).toBeDefined();
      expect(result.compatibility).toBeDefined();
      expect(result.recommendations).toBeDefined();
      
      // All selected archetypes should support the architecture
      result.selectedArchetypes.forEach(archetype => {
        expect(archetype.supportedArchitectures).toContain('individual');
      });
    });

    it('should categorize archetype compatibility correctly', () => {
      const result = integrationManager.selectArchetypesForPlatform({
        architecture: 'individual',
        domain: 'outdoor'
      });
      
      expect(Array.isArray(result.compatibility.fullCompatibility)).toBe(true);
      expect(Array.isArray(result.compatibility.partialCompatibility)).toBe(true);
      expect(Array.isArray(result.compatibility.limitedCompatibility)).toBe(true);
      
      // Full compatibility archetypes should support both architecture and domain
      result.compatibility.fullCompatibility.forEach(archetype => {
        expect(archetype.supportedArchitectures).toContain('individual');
        const supportsDomain = archetype.supportedDomains.includes('outdoor') || 
                              archetype.supportedDomains.includes('generic');
        expect(supportsDomain).toBe(true);
      });
    });

    it('should generate platform-optimized configuration', () => {
      const result = integrationManager.selectArchetypesForPlatform({
        architecture: 'team',
        domain: 'saas'
      });
      
      expect(result.optimizedConfig.targetArchitecture).toBe('team');
      expect(result.optimizedConfig.targetDomain).toBe('saas');
      expect(result.optimizedConfig.applyDomainCustomizations).toBe(true);
      expect(typeof result.optimizedConfig.relationshipDensity).toBe('number');
    });

    it('should provide meaningful recommendations', () => {
      const result = integrationManager.selectArchetypesForPlatform({
        architecture: 'individual',
        domain: 'outdoor'
      });
      
      expect(Array.isArray(result.recommendations.primary)).toBe(true);
      expect(Array.isArray(result.recommendations.secondary)).toBe(true);
      expect(Array.isArray(result.recommendations.avoid)).toBe(true);
      
      // Primary recommendations should have higher selection weights
      if (result.recommendations.primary.length > 0) {
        const primaryWeights = result.recommendations.primary.map(a => a.selectionWeight);
        const avgPrimaryWeight = primaryWeights.reduce((sum, w) => sum + w, 0) / primaryWeights.length;
        expect(avgPrimaryWeight).toBeGreaterThan(50);
      }
    });
  });

  describe('Context-Aware User Generation', () => {
    it('should generate users with platform context', () => {
      const context = {
        platformContext: {
          architecture: 'individual' as PlatformArchitectureType,
          domain: 'outdoor' as ContentDomainType,
          confidence: 0.9,
          evidenceStrength: 'strong' as const
        },
        userPreferences: {},
        constraints: {
          maxUsers: 5,
          minUsers: 3
        }
      };

      const results = integrationManager.generateUsersForPlatform(context, 5);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.archetype).toBeDefined();
        expect(result.userData).toBeDefined();
        expect(result.metadata).toBeDefined();
        expect(result.userData.platformBehaviors).toBeDefined();
      });
    });

    it('should apply user preferences correctly', () => {
      const context = {
        platformContext: {
          architecture: 'individual' as PlatformArchitectureType,
          domain: 'outdoor' as ContentDomainType,
          confidence: 0.8,
          evidenceStrength: 'moderate' as const
        },
        userPreferences: {
          preferredArchetypes: ['individual_content_creator'],
          excludedArchetypes: ['individual_casual_browser']
        },
        constraints: {
          maxUsers: 3,
          minUsers: 1
        }
      };

      const results = integrationManager.generateUsersForPlatform(context, 3);
      
      // Should only include content creators, not casual browsers
      results.forEach(result => {
        expect(result.archetype.id).toBe('individual_content_creator');
      });
    });

    it('should enhance users with platform-specific behaviors', () => {
      const context = {
        platformContext: {
          architecture: 'individual' as PlatformArchitectureType,
          domain: 'outdoor' as ContentDomainType,
          confidence: 0.7,
          evidenceStrength: 'moderate' as const
        },
        userPreferences: {},
        constraints: {
          maxUsers: 2,
          minUsers: 1
        }
      };

      const results = integrationManager.generateUsersForPlatform(context, 2);
      
      results.forEach(result => {
        expect(result.userData.platformBehaviors).toBeDefined();
        expect(result.userData.platformBehaviors.contentScenario).toBeDefined();
        expect(result.userData.platformBehaviors.engagementPattern).toBeDefined();
        expect(result.userData.platformBehaviors.sessionPatterns).toBeDefined();
        expect(result.userData.platformBehaviors.contentFrequency).toBeDefined();
      });
    });
  });

  describe('Archetype Recommendations', () => {
    it('should provide platform-specific recommendations', () => {
      const recommendations = integrationManager.getArchetypeRecommendations('individual', 'outdoor');
      
      expect(Array.isArray(recommendations.recommended)).toBe(true);
      expect(Array.isArray(recommendations.optional)).toBe(true);
      expect(Array.isArray(recommendations.considerations)).toBe(true);
      
      expect(recommendations.recommended.length).toBeGreaterThan(0);
      expect(recommendations.considerations.length).toBeGreaterThan(0);
      
      // Should include domain-specific considerations
      const considerationText = recommendations.considerations.join(' ');
      expect(considerationText.toLowerCase()).toContain('outdoor');
    });

    it('should adapt recommendations to different platforms', () => {
      const individualRecs = integrationManager.getArchetypeRecommendations('individual', 'outdoor');
      const teamRecs = integrationManager.getArchetypeRecommendations('team', 'saas');
      
      // Should provide different recommendations for different platforms
      expect(individualRecs.considerations).not.toEqual(teamRecs.considerations);
      
      // Team recommendations should mention collaboration
      const teamConsiderations = teamRecs.considerations.join(' ');
      expect(teamConsiderations.toLowerCase()).toMatch(/team|collaborat/);
    });
  });

  describe('Compatibility Validation', () => {
    it('should validate archetype compatibility accurately', () => {
      const archetypes = [CONTENT_CREATOR_ARCHETYPE, POWER_USER_ARCHETYPE];
      const validation = integrationManager.validateArchetypeCompatibility(
        archetypes, 
        'individual', 
        'outdoor'
      );
      
      expect(Array.isArray(validation.compatible)).toBe(true);
      expect(Array.isArray(validation.incompatible)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
      expect(Array.isArray(validation.suggestions)).toBe(true);
      
      // Content creator should be compatible with individual/outdoor
      expect(validation.compatible).toContain(CONTENT_CREATOR_ARCHETYPE);
    });

    it('should detect incompatibilities correctly', () => {
      // Create an archetype that doesn't support individual architecture
      const teamOnlyArchetype = {
        ...CONTENT_CREATOR_ARCHETYPE,
        id: 'team_only_archetype',
        supportedArchitectures: ['team' as PlatformArchitectureType]
      };

      const validation = integrationManager.validateArchetypeCompatibility(
        [teamOnlyArchetype as UserArchetype], 
        'individual', 
        'outdoor'
      );
      
      expect(validation.compatible).toHaveLength(0);
      expect(validation.incompatible).toHaveLength(1);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Integration Statistics', () => {
    it('should provide comprehensive integration statistics', () => {
      // Generate some platform selections to populate cache
      integrationManager.selectArchetypesForPlatform({ architecture: 'individual', domain: 'outdoor' });
      integrationManager.selectArchetypesForPlatform({ architecture: 'team', domain: 'saas' });
      
      const stats = integrationManager.getIntegrationStatistics();
      
      expect(stats.platformCache).toBeDefined();
      expect(stats.archetypeStats).toBeDefined();
      expect(stats.recommendations).toBeDefined();
      
      expect(typeof stats.platformCache.entries).toBe('number');
      expect(typeof stats.platformCache.architectures).toBe('object');
      expect(typeof stats.platformCache.domains).toBe('object');
      
      expect(stats.platformCache.entries).toBeGreaterThanOrEqual(2);
    });

    it('should track platform coverage accurately', () => {
      const stats = integrationManager.getIntegrationStatistics();
      
      expect(typeof stats.recommendations.platformCoverage).toBe('object');
      
      // Should have coverage data for major platform combinations
      const coverageKeys = Object.keys(stats.recommendations.platformCoverage);
      expect(coverageKeys.some(key => key.includes('individual'))).toBe(true);
      expect(coverageKeys.some(key => key.includes('outdoor'))).toBe(true);
    });
  });
});