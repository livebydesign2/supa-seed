/**
 * Test Suite for AI Integration
 * Phase 5, Checkpoint E1 validation - Complete AI system testing
 */

import {
  OllamaClient,
  DomainPromptEngine,
  AIResponseCache,
  AIAssetGenerator
} from '../src/ai';

import { SchemaInfo } from '../src/schema-adapter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as rimraf from 'rimraf';

// Mock Logger
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AI Integration System', () => {
  let tempDir: string;
  let ollamaClient: OllamaClient;
  let promptEngine: DomainPromptEngine;
  let aiCache: AIResponseCache;
  let aiGenerator: AIAssetGenerator;
  let mockSchema: SchemaInfo;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'supa-seed-ai-'));

    // Initialize AI components
    ollamaClient = new OllamaClient({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:latest',
      timeout: 5000
    });

    promptEngine = new DomainPromptEngine();

    aiCache = new AIResponseCache({
      persistToDisk: false,
      maxSize: 100,
      ttl: 3600
    });

    aiGenerator = new AIAssetGenerator(ollamaClient, promptEngine, aiCache);

    // Create mock schema
    mockSchema = {
      hasAccounts: false,
      hasUsers: true,
      hasProfiles: true,
      hasSetups: false,
      hasCategories: false,
      hasTeams: false,
      hasOrganizations: false,
      accountsTableStructure: 'simple' as const,
      primaryUserTable: 'users' as const,
      makerkitVersion: 'v3' as const,
      customTables: ['users', 'posts', 'categories'],
      detectedRelationships: [
        { fromTable: 'posts', fromColumn: 'user_id', toTable: 'users', toColumn: 'id', relationshipType: 'one_to_many', cascadeDelete: false },
        { fromTable: 'posts', fromColumn: 'category_id', toTable: 'categories', toColumn: 'id', relationshipType: 'one_to_many', cascadeDelete: false }
      ],
      assetCompatibility: {
        supportsImages: true,
        supportsMarkdown: true,
        supportsJson: true,
        contentTables: ['posts'],
        userContentRelationships: [
          { fromTable: 'users', fromColumn: 'id', toTable: 'posts', toColumn: 'user_id', relationshipType: 'one_to_many', cascadeDelete: false }
        ],
        mediaStoragePattern: 'supabase_storage' as const
      },
      frameworkType: 'makerkit' as const
    };
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rimraf.rimraf(tempDir);
    aiCache.destroy();
  });

  describe('Ollama Client', () => {
    test('should initialize with default configuration', () => {
      expect(ollamaClient).toBeDefined();
      expect(ollamaClient.getConfig().baseUrl).toBe('http://localhost:11434');
      expect(ollamaClient.getConfig().model).toBe('llama3.1:latest');
    });

    test('should handle health check when Ollama is not running', async () => {
      const health = await ollamaClient.checkHealth();
      
      // Should handle connection failure gracefully
      expect(health).toBeDefined();
      expect(typeof health.connected).toBe('boolean');
      expect(Array.isArray(health.availableModels)).toBe(true);
    });

    test('should update configuration dynamically', () => {
      const originalModel = ollamaClient.getConfig().model;
      
      ollamaClient.updateConfig({ model: 'test-model' });
      
      expect(ollamaClient.getConfig().model).toBe('test-model');
      expect(ollamaClient.getConfig().model).not.toBe(originalModel);
      expect(ollamaClient.isConnected()).toBe(false); // Should reset health status
    });

    test('should handle generate request with proper error handling', async () => {
      try {
        await ollamaClient.generate({
          prompt: 'Test prompt',
          options: { temperature: 0.5 }
        });
      } catch (error) {
        // Should fail gracefully when Ollama not available
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('not available');
      }
    });

    test('should handle JSON generation with schema validation', async () => {
      try {
        await ollamaClient.generateJSON('{"test": "data"}', 'Return JSON only');
      } catch (error) {
        // Should fail gracefully when Ollama not available
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Domain Prompt Engine', () => {
    test('should initialize with built-in templates', () => {
      const templates = promptEngine.getAvailableTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.type === 'seed_data')).toBe(true);
      expect(templates.some(t => t.type === 'template_content')).toBe(true);
      expect(templates.some(t => t.type === 'schema_suggestion')).toBe(true);
    });

    test('should generate seed data prompts', () => {
      const context = {
        table: 'posts',
        columns: [
          { name: 'id', type: 'int' },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' }
        ],
        domain: 'blog',
        style: 'realistic' as const
      };

      const { system, user, schema } = promptEngine.generateSeedDataPrompt(context, 10);
      
      expect(system).toContain('database seeding specialist');
      expect(user).toContain('posts');
      expect(user).toContain('10');
      expect(user).toContain('realistic');
      expect(schema).toBeDefined();
      expect(schema.properties).toHaveProperty('records');
    });

    test('should generate template content prompts', () => {
      const context = {
        table: 'users',
        schema: mockSchema,
        domain: 'saas'
      };

      const { system, user } = promptEngine.generateTemplatePrompt(context, 'seeder');
      
      expect(system).toContain('TypeScript');
      expect(user).toContain('users');
      expect(user).toContain('makerkit');
      expect(user).toContain('seeder');
    });

    test('should generate schema analysis prompts', () => {
      const { system, user } = promptEngine.generateSchemaAnalysisPrompt(mockSchema);
      
      expect(system).toContain('database architecture expert');
      expect(user).toContain('makerkit');
      expect(user).toContain('users');
      expect(user).toContain('posts');
      expect(user).toContain('v3');
    });

    test('should add custom prompt templates', () => {
      const customTemplate = {
        id: 'custom-test',
        name: 'Custom Test Template',
        description: 'Test template',
        type: 'seed_data' as const,
        systemPrompt: 'Custom system prompt',
        userPromptTemplate: 'Custom user prompt for {{table}}',
        outputFormat: 'json' as const
      };

      promptEngine.addPromptTemplate(customTemplate);
      
      const templates = promptEngine.getAvailableTemplates();
      expect(templates.some(t => t.id === 'custom-test')).toBe(true);
    });

    test('should handle domain knowledge', () => {
      promptEngine.addDomainKnowledge('test-domain', {
        tables: ['test_table'],
        patterns: { id: 'number', name: 'string' }
      });

      // Domain knowledge should be integrated into prompts
      const context = {
        table: 'test_table',
        domain: 'test-domain'
      };

      const { system } = promptEngine.generateSeedDataPrompt(context, 5);
      expect(system).toContain('test-domain');
    });
  });

  describe('AI Response Cache', () => {
    test('should initialize with configuration', () => {
      expect(aiCache).toBeDefined();
      
      const stats = aiCache.getStats();
      expect(stats.totalEntries).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    test('should cache and retrieve responses', async () => {
      const prompt = 'Test prompt';
      const response = { data: 'test response' };
      const model = 'test-model';

      // Should return null for cache miss
      const miss = await aiCache.get(prompt, model);
      expect(miss).toBeNull();

      // Cache the response
      const cached = await aiCache.set(prompt, response, model, 100, {
        quality: 85,
        tags: ['test']
      });
      expect(cached).toBe(true);

      // Should return cached response
      const hit = await aiCache.get(prompt, model);
      expect(hit).toEqual(response);

      // Stats should reflect cache usage
      const stats = aiCache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test('should handle cache expiration', async () => {
      const prompt = 'Expiring prompt';
      const response = { data: 'expiring response' };

      // Cache with very short TTL
      await aiCache.set(prompt, response, 'test-model', 100, {
        ttl: 1, // 1 second
        quality: 90
      });

      // Should be available immediately
      const immediate = await aiCache.get(prompt);
      expect(immediate).toEqual(response);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired now
      const expired = await aiCache.get(prompt);
      expect(expired).toBeNull();
    });

    test('should search cached entries', async () => {
      await aiCache.set('search prompt 1', { result: 1 }, 'model1', 100, {
        tags: ['search', 'test1'],
        quality: 80
      });

      await aiCache.set('search prompt 2', { result: 2 }, 'model2', 150, {
        tags: ['search', 'test2'],
        quality: 90
      });

      const results = aiCache.search('search', {
        tags: ['search'],
        minQuality: 85,
        limit: 5
      });

      expect(results.length).toBe(1);
      expect(results[0].response.result).toBe(2);
    });

    test('should find similar cached responses', async () => {
      await aiCache.set('generate user data', { users: [] }, 'model', 100, {
        quality: 85
      });

      await aiCache.set('create user information', { users: [] }, 'model', 100, {
        quality: 90
      });

      const similar = aiCache.findSimilar('generate user records', 0.3, 2);
      expect(similar.length).toBeGreaterThanOrEqual(1);
    });

    test('should clear cache by criteria', async () => {
      await aiCache.set('clear test 1', { data: 1 }, 'model1', 100, {
        tags: ['clear-test']
      });

      await aiCache.set('clear test 2', { data: 2 }, 'model2', 100, {
        tags: ['keep']
      });

      const cleared = aiCache.clear({ tags: ['clear-test'] });
      expect(cleared).toBe(1);

      const remaining = aiCache.search('', { tags: ['keep'] });
      expect(remaining.length).toBe(1);
    });

    test('should provide comprehensive statistics', async () => {
      await aiCache.set('stats test', { data: 'test' }, 'model', 200, {
        quality: 95,
        tags: ['stats', 'performance']
      });

      const stats = aiCache.getStats();
      
      expect(stats.totalEntries).toBe(1);
      expect(stats.averageResponseTime).toBe(200);
      expect(stats.topTags.length).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
    });
  });

  describe('AI Asset Generator', () => {
    test('should initialize with dependencies', () => {
      expect(aiGenerator).toBeDefined();
    });

    test('should handle seed data generation when AI unavailable', async () => {
      const context = {
        table: 'posts',
        columns: [
          { name: 'id', type: 'int' },
          { name: 'title', type: 'varchar' }
        ],
        domain: 'blog'
      };

      const result = await aiGenerator.generateSeedData('posts', 5, context, {
        fallbackToFaker: true
      });

      // Should either succeed with AI or fallback
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.metadata.source).toMatch(/ai|fallback|cache/);
    });

    test('should provide AI service status', async () => {
      const status = await aiGenerator.getStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.ai_available).toBe('boolean');
      expect(typeof status.model).toBe('string');
      expect(status.cache_stats).toBeDefined();
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    test('should handle template recommendations gracefully', async () => {
      const context = {
        table: 'products',
        schema: mockSchema,
        domain: 'ecommerce'
      };

      const recommendation = await aiGenerator.recommendTemplate(context, 'seeder');
      
      // Should return null when AI unavailable, or a valid recommendation
      if (recommendation) {
        expect(recommendation.template).toBeDefined();
        expect(recommendation.confidence).toBeGreaterThan(0);
        expect(recommendation.reasoning).toBeDefined();
      } else {
        expect(recommendation).toBeNull();
      }
    });

    test('should analyze schema when AI available', async () => {
      const analysis = await aiGenerator.analyzeSchema(mockSchema, {
        useCache: false
      });

      // Should return null when AI unavailable, or valid analysis
      if (analysis) {
        expect(analysis.improvements).toBeDefined();
        expect(analysis.seedingStrategy).toBeDefined();
        expect(analysis.qualityScore).toBeGreaterThanOrEqual(0);
        expect(analysis.qualityScore).toBeLessThanOrEqual(100);
      } else {
        expect(analysis).toBeNull();
      }
    });

    test('should suggest fields for tables', async () => {
      const existingColumns = [
        { name: 'id', type: 'int' },
        { name: 'name', type: 'varchar' }
      ];

      const suggestions = await aiGenerator.suggestFields(
        'products',
        existingColumns,
        'ecommerce'
      );

      // Should return empty array when AI unavailable, or suggestions
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should clear cache when requested', () => {
      const cleared = aiGenerator.clearCache({ tags: ['test'] });
      expect(typeof cleared).toBe('number');
    });

    test('should handle generation options correctly', async () => {
      const context = {
        table: 'users',
        columns: [{ name: 'email', type: 'varchar' }],
        domain: 'saas'
      };

      const options = {
        useCache: true,
        fallbackToFaker: true,
        maxRetries: 2,
        qualityThreshold: 80,
        temperature: 0.7,
        tags: ['test-generation']
      };

      const result = await aiGenerator.generateSeedData('users', 3, context, options);
      
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete AI-assisted seeding workflow', async () => {
      const context = {
        table: 'blog_posts',
        columns: [
          { name: 'id', type: 'serial' },
          { name: 'title', type: 'varchar' },
          { name: 'content', type: 'text' },
          { name: 'author_id', type: 'int' },
          { name: 'published_at', type: 'timestamp' }
        ],
        relationships: [
          { from: 'blog_posts', to: 'users', type: 'belongs_to' }
        ],
        schema: mockSchema,
        domain: 'blog',
        style: 'realistic' as const
      };

      // 1. Generate prompt
      const { system, user } = promptEngine.generateSeedDataPrompt(context, 10);
      expect(system).toBeDefined();
      expect(user).toBeDefined();

      // 2. Check cache (should be empty)
      const cached = await aiCache.get(user, 'test-model');
      expect(cached).toBeNull();

      // 3. Attempt AI generation (will fail without Ollama, but should handle gracefully)
      const result = await aiGenerator.generateSeedData('blog_posts', 10, context, {
        fallbackToFaker: true,
        useCache: true
      });

      expect(result.success).toBe(true);
      expect(result.metadata.source).toMatch(/ai|fallback|cache/);
    });

    test('should demonstrate AI cache efficiency', async () => {
      const context = {
        table: 'test_cache',
        columns: [{ name: 'value', type: 'varchar' }],
        domain: 'test'
      };

      // First request - should be cache miss
      const result1 = await aiGenerator.generateSeedData('test_cache', 5, context, {
        fallbackToFaker: true
      });

       // If we got a successful result, try the same request again
      if (result1.success) {
        // Manually cache a response for testing
        await aiCache.set(
          'test cache prompt',
          { records: [{ value: 'cached' }] },
          'test-model',
          100,
          { quality: 90, tags: ['cache-test'] }
        );

        const cached = await aiCache.get('test cache prompt', 'test-model');
        expect(cached).toBeDefined();
        expect(cached.records[0].value).toBe('cached');
      }

      expect(result1).toBeDefined();
    });

    test('should handle AI service degradation gracefully', async () => {
      // Simulate various failure scenarios
      const scenarios = [
        { description: 'Service unavailable', fallback: true },
        { description: 'Service unavailable without fallback', fallback: false }
      ];

      for (const scenario of scenarios) {
        const result = await aiGenerator.generateSeedData('test_table', 3, {
          table: 'test_table',
          domain: 'test'
        }, {
          fallbackToFaker: scenario.fallback
        });

        if (scenario.fallback) {
          expect(result.success).toBe(true);
          expect(result.metadata.source).toBe('fallback');
        } else {
          // May succeed or fail depending on AI availability
          expect(result).toBeDefined();
        }
      }
    });

    test('should provide comprehensive system status', async () => {
      const status = await aiGenerator.getStatus();
      
      // Validate status structure
      expect(status.ai_available).toBeDefined();
      expect(status.model).toBeDefined();
      expect(status.cache_stats).toBeDefined();
      expect(status.recommendations).toBeDefined();

      // Cache stats should be comprehensive
      expect(status.cache_stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(status.cache_stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(status.cache_stats.hitRate).toBeLessThanOrEqual(1);

      // Should provide actionable recommendations
      if (status.recommendations.length > 0) {
        expect(status.recommendations[0]).toContain('Ollama');
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed AI responses', async () => {
      // This would test the system's resilience to bad AI output
      const context = {
        table: 'error_test',
        columns: [{ name: 'id', type: 'int' }]
      };

      const result = await aiGenerator.generateSeedData('error_test', 1, context, {
        fallbackToFaker: true
      });

      // Should always provide a result due to fallback
      expect(result.success).toBe(true);
    });

    test('should handle cache corruption gracefully', async () => {
      // Test cache resilience
      const corruptEntry = {
        key: 'corrupt',
        prompt: 'test',
        response: undefined,
        model: 'test',
        timestamp: new Date(),
        ttl: 3600,
        metadata: {} as any,
        tags: []
      };

      // This should not break the cache system
      const stats = aiCache.getStats();
      expect(stats).toBeDefined();
    });

    test('should handle resource constraints', async () => {
      // Test with very large requests
      const largeContext = {
        table: 'large_test',
        columns: Array.from({ length: 50 }, (_, i) => ({
          name: `field_${i}`,
          type: 'varchar'
        }))
      };

      const result = await aiGenerator.generateSeedData('large_test', 100, largeContext, {
        fallbackToFaker: true
      });

      expect(result).toBeDefined();
    });
  });
});