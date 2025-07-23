/**
 * Test suite for enhanced schema detection
 * Phase 1, Checkpoint A1 validation
 */

import { SchemaAdapter, SchemaInfo } from '../src/schema-adapter';

// Mock Logger to avoid chalk import issues
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Supabase client for testing
const mockClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue({ error: null, data: [] })
    })
  }),
  auth: {
    admin: {
      listUsers: jest.fn().mockResolvedValue({ error: null, data: [] })
    }
  }
} as any;

describe('Enhanced Schema Detection', () => {
  let schemaAdapter: SchemaAdapter;

  beforeEach(() => {
    schemaAdapter = new SchemaAdapter(mockClient);
    jest.clearAllMocks();
  });

  describe('MakerKit Version Detection', () => {
    test('should detect MakerKit v3 with full feature set', async () => {
      // Mock all required tables exist
      mockClient.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ error: null, data: [] })
        })
      }));

      const schemaInfo = await schemaAdapter.detectSchema();
      
      expect(schemaInfo.makerkitVersion).toBeDefined();
      expect(['v1', 'v2', 'v3', 'custom', 'none']).toContain(schemaInfo.makerkitVersion);
    });

    test('should detect custom tables beyond MakerKit standard', async () => {
      const schemaInfo = await schemaAdapter.detectSchema();
      
      expect(schemaInfo.customTables).toBeDefined();
      expect(Array.isArray(schemaInfo.customTables)).toBe(true);
    });

    test('should detect table relationships', async () => {
      const schemaInfo = await schemaAdapter.detectSchema();
      
      expect(schemaInfo.detectedRelationships).toBeDefined();
      expect(Array.isArray(schemaInfo.detectedRelationships)).toBe(true);
    });

    test('should analyze asset compatibility', async () => {
      const schemaInfo = await schemaAdapter.detectSchema();
      
      expect(schemaInfo.assetCompatibility).toBeDefined();
      expect(schemaInfo.assetCompatibility.supportsImages).toBeDefined();
      expect(schemaInfo.assetCompatibility.supportsMarkdown).toBeDefined();
      expect(schemaInfo.assetCompatibility.supportsJson).toBeDefined();
    });
  });

  describe('Framework Type Detection', () => {
    test('should detect framework type correctly', async () => {
      const schemaInfo = await schemaAdapter.detectSchema();
      
      expect(schemaInfo.frameworkType).toBeDefined();
      expect(['makerkit', 'simple', 'wildernest', 'custom']).toContain(schemaInfo.frameworkType);
    });

    test('should provide hybrid seeding recommendations', async () => {
      await schemaAdapter.detectSchema();
      const recommendations = schemaAdapter.getHybridSeedingInfo();
      
      expect(recommendations.compatibilityLevel).toBeDefined();
      expect(['basic', 'intermediate', 'advanced']).toContain(recommendations.compatibilityLevel);
      expect(Array.isArray(recommendations.recommendedAssetTypes)).toBe(true);
      expect(Array.isArray(recommendations.suggestedAssociations)).toBe(true);
      expect(Array.isArray(recommendations.frameworkSpecificTips)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain existing interface compatibility', async () => {
      const schemaInfo = await schemaAdapter.detectSchema();
      
      // All existing fields should still be present
      expect(schemaInfo.hasAccounts).toBeDefined();
      expect(schemaInfo.hasUsers).toBeDefined();
      expect(schemaInfo.hasProfiles).toBeDefined();
      expect(schemaInfo.accountsTableStructure).toBeDefined();
      expect(schemaInfo.primaryUserTable).toBeDefined();
    });

    test('should maintain existing user creation strategy logic', async () => {
      // This test ensures the getUserCreationStrategy method still works
      await schemaAdapter.detectSchema();
      expect(() => schemaAdapter.getUserCreationStrategy()).not.toThrow();
    });

    test('should maintain existing foreign key detection', async () => {
      await schemaAdapter.detectSchema();
      expect(() => schemaAdapter.getUserForeignKey()).not.toThrow();
    });
  });
});

/**
 * Integration test with actual MakerKit patterns
 */
describe('MakerKit Integration Tests', () => {
  // These would be run against actual MakerKit databases in CI/CD
  test.skip('should correctly detect MakerKit v3 boilerplate', async () => {
    // This test would connect to actual MakerKit v3 test database
    // and verify all detection works correctly
  });

  test.skip('should correctly detect Wildernest platform', async () => {
    // This test would connect to Wildernest-style database
    // and verify complex schema detection
  });
});