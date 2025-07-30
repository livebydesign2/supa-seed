/**
 * Schema Mapping Tests
 * FEAT-003: Memory Management & Schema Mapping Fixes - Phase 2
 * 
 * Tests the dynamic table mapping system for MakerKit compatibility
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Schema Mapping System - FEAT-003 Validation', () => {
  // Mock configuration for testing
  const mockFrameworkConfigs = {
    makerkit: {
      baseTemplateTable: { name: 'base_templates' },
      userTable: { name: 'accounts' },
      setupTable: { name: 'setups' }
    },
    simple: {
      baseTemplateTable: { name: 'templates' },
      userTable: { name: 'users' },
      setupTable: { name: 'posts' }
    }
  };

  beforeEach(() => {
    resolver = createTableMappingResolver(mockSupabaseClient, {
      framework: 'makerkit',
      validateWithDatabase: false // Disable validation for unit tests
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MakerKit base_templates mapping', () => {
    it('should resolve setup_types to base_templates for MakerKit framework', async () => {
      const result = await resolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      expect(result.actualTableName).toBe('base_templates');
      expect(result.source).toBe('config');
      expect(result.warnings).toHaveLength(0);
    });

    it('should resolve users to accounts for MakerKit framework', async () => {
      const result = await resolver.resolveTableName('users', 'userTable');
      
      expect(result.actualTableName).toBe('accounts');
      expect(result.source).toBe('config');
      expect(result.warnings).toHaveLength(0);
    });

    it('should resolve setups table correctly', async () => {
      const result = await resolver.resolveTableName('setups', 'setupTable');
      
      expect(result.actualTableName).toBe('setups');
      expect(result.source).toBe('config');
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Custom mapping override', () => {
    it('should use custom mappings when provided', async () => {
      const customResolver = createTableMappingResolver(mockSupabaseClient, {
        framework: 'makerkit',
        customMappings: {
          baseTemplateTable: {
            name: 'custom_templates',
            idField: 'id',
            typeField: 'type'
          }
        },
        validateWithDatabase: false
      });

      const result = await customResolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      expect(result.actualTableName).toBe('custom_templates');
      expect(result.source).toBe('config');
    });
  });

  describe('Error handling', () => {
    it('should handle missing framework gracefully', async () => {
      const errorResolver = createTableMappingResolver(mockSupabaseClient, {
        framework: 'nonexistent',
        validateWithDatabase: false
      });

      const result = await errorResolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      expect(result.source).toBe('error');
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    it('should cache resolved table names', async () => {
      // First call
      const result1 = await resolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      // Second call - should use cache
      const result2 = await resolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      expect(result1.actualTableName).toBe(result2.actualTableName);
      expect(result1.source).toBe(result2.source);
    });

    it('should clear cache when requested', async () => {
      await resolver.resolveTableName('setup_types', 'baseTemplateTable');
      
      const statsBefore = resolver.getStats();
      expect(statsBefore.cachedMappings).toBeGreaterThan(0);
      
      resolver.clearCache();
      
      const statsAfter = resolver.getStats();
      expect(statsAfter.cachedMappings).toBe(0);
    });
  });
});

describe('QueryTranslator', () => {
  let translator: QueryTranslator;
  let mockFrom: jest.Mock;

  beforeEach(() => {
    mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    });
    
    mockSupabaseClient.from = mockFrom;
    
    translator = createQueryTranslator(mockSupabaseClient, {
      framework: 'makerkit',
      enableValidation: false,
      enableCaching: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Table name inference', () => {
    it('should infer baseTemplateTable type from setup_types', async () => {
      const actualName = await translator.translateTableName('setup_types');
      expect(actualName).toBe('base_templates');
    });

    it('should infer userTable type from users', async () => {
      const actualName = await translator.translateTableName('users');
      expect(actualName).toBe('accounts');
    });

    it('should use table names as-is when no mapping exists', async () => {
      const actualName = await translator.translateTableName('unknown_table');
      expect(actualName).toBe('unknown_table');
    });
  });

  describe('Query building', () => {
    it('should create translated query builder', async () => {
      const queryBuilder = await translator.from('setup_types');
      
      expect(mockFrom).toHaveBeenCalledWith('base_templates');
      expect(queryBuilder).toBeDefined();
    });

    it('should cache translations for performance', async () => {
      await translator.translateTableName('setup_types');
      await translator.translateTableName('setup_types'); // Second call should use cache
      
      const stats = translator.getStats();
      expect(stats.cachedTranslations).toBeGreaterThan(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle MakerKit schema mapping scenario', async () => {
      // Simulate the exact scenario from FEAT-003
      const mappings = await translator.getAllMappings();
      
      expect(mappings['setup_types']).toBe('base_templates');
      expect(mappings['users']).toBe('accounts');
    });
  });
});

describe('Integration: Full Schema Mapping Flow', () => {
  it('should resolve the MakerKit base_templates issue described in FEAT-003', async () => {
    // This test validates the core issue fix:
    // Framework expects 'setup_types' but MakerKit uses 'base_templates'
    
    const resolver = createTableMappingResolver(mockSupabaseClient, {
      framework: 'makerkit',
      validateWithDatabase: false
    });

    const result = await resolver.resolveTableName('setup_types', 'baseTemplateTable');
    
    // Verify the mapping works as expected
    expect(result.actualTableName).toBe('base_templates');
    expect(result.exists).toBe(true); // Assuming it exists since validation is disabled
    expect(result.source).toBe('config');
    expect(result.warnings).toHaveLength(0);
    
    // This should eliminate the "setup_types table not found" warnings
    // mentioned in the FEAT-003 testing report
  });
});