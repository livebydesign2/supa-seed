/**
 * Test suite for Schema Evolution and Change Detection System
 * Phase 4, Checkpoint D1 validation - Intelligent schema change detection and migration support
 */

import { 
  SchemaEvolutionEngine,
  SchemaSnapshot,
  SchemaChange,
  ConfigurationImpact,
  MigrationSuggestion,
  TableSchema,
  ColumnSchema,
  FunctionSchema,
  TypeSchema
} from '../src/schema/schema-evolution';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Logger
jest.mock('../src/core/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock SchemaAdapter
jest.mock('../src/core/schema-adapter', () => ({
  SchemaAdapter: jest.fn().mockImplementation(() => ({
    getSchemaInfo: jest.fn()
  }))
}));

describe('Schema Evolution Engine', () => {
  let engine: SchemaEvolutionEngine;
  let mockSupabase: jest.Mocked<SupabaseClient>;
  let mockTableSchema: TableSchema;
  let mockSnapshot: SchemaSnapshot;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn()
    } as any;

    // Setup mock responses
    const mockTableData = [
      { table_name: 'users' },
      { table_name: 'posts' },
      { table_name: 'comments' }
    ];

    const mockColumnData = [
      {
        column_name: 'id',
        data_type: 'uuid',
        is_nullable: 'NO',
        column_default: 'gen_random_uuid()',
        character_maximum_length: null,
        numeric_precision: null,
        numeric_scale: null
      },
      {
        column_name: 'email',
        data_type: 'varchar',
        is_nullable: 'NO',
        column_default: null,
        character_maximum_length: 255,
        numeric_precision: null,
        numeric_scale: null
      }
    ];

    const mockExtensionData = [
      { extname: 'uuid-ossp' },
      { extname: 'pgcrypto' }
    ];

    // Mock Supabase responses with proper chain
    mockSupabase.from.mockImplementation((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: table === 'information_schema.tables' ? mockTableData :
                    table === 'information_schema.columns' ? mockColumnData :
                    table === 'pg_extension' ? mockExtensionData : [],
              error: null
            }),
            // For tables without order method
            then: function(callback: any) {
              return callback({
                data: table === 'information_schema.tables' ? mockTableData :
                      table === 'information_schema.columns' ? mockColumnData :
                      table === 'pg_extension' ? mockExtensionData : [],
                error: null
              });
            }
          })
        })
      })
    } as any));

    mockSupabase.rpc.mockResolvedValue({
      data: 'PostgreSQL 15.4',
      error: null,
      count: null,
      status: 200,
      statusText: 'OK'
    });

    engine = new SchemaEvolutionEngine(mockSupabase);

    // Create mock table schema
    mockTableSchema = {
      name: 'users',
      columns: [
        {
          name: 'id',
          type: 'uuid',
          nullable: false,
          defaultValue: 'gen_random_uuid()',
          isPrimaryKey: true,
          isForeignKey: false,
          isUnique: true,
          comment: 'Primary key'
        },
        {
          name: 'email',
          type: 'varchar',
          nullable: false,
          maxLength: 255,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: true,
          comment: 'User email address'
        }
      ],
      constraints: [],
      indexes: [],
      triggers: [],
      policies: [],
      relationships: [],
      metadata: {
        created: new Date('2025-01-01'),
        modified: new Date('2025-01-15'),
        owner: 'postgres',
        comment: 'User accounts table'
      }
    };

    // Create mock snapshot
    const tables = new Map<string, TableSchema>();
    tables.set('users', mockTableSchema);

    mockSnapshot = {
      id: 'test-snapshot-1',
      timestamp: new Date('2025-01-20'),
      version: '1.0.0',
      tables,
      functions: new Map<string, FunctionSchema>(),
      types: new Map<string, TypeSchema>(),
      extensions: ['uuid-ossp', 'pgcrypto'],
      metadata: {
        databaseVersion: 'PostgreSQL 15.4',
        capturedBy: 'supa-seed-evolution-engine',
        environment: 'test',
        description: 'Test snapshot'
      }
    };
  });

  describe('Engine Initialization', () => {
    test('should initialize schema evolution engine', () => {
      expect(engine).toBeDefined();
      expect(engine.getSnapshots()).toHaveLength(0);
    });

    test('should clear snapshots', () => {
      engine.clearSnapshots();
      expect(engine.getSnapshots()).toHaveLength(0);
    });
  });

  describe('Schema Snapshot Capture', () => {
    test('should capture complete schema snapshot', async () => {
      const snapshot = await engine.captureSchemaSnapshot('1.0.0', 'Test capture');

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toMatch(/^snapshot-\d+-[a-z0-9]+$/);
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.metadata.description).toBe('Test capture');
      expect(snapshot.tables).toBeDefined();
      expect(Array.isArray(snapshot.extensions)).toBe(true);
      expect(snapshot.metadata.databaseVersion).toBe('PostgreSQL 15.4');
    });

    test('should use default version if not provided', async () => {
      const snapshot = await engine.captureSchemaSnapshot();

      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.metadata.description).toBeUndefined();
    });

    test('should store captured snapshots', async () => {
      const snapshot = await engine.captureSchemaSnapshot('1.0.0', 'Test storage');

      expect(engine.getSnapshots()).toHaveLength(1);
      expect(engine.getSnapshot(snapshot.id)).toBeDefined();
      expect(engine.getSnapshot(snapshot.id)?.id).toBe(snapshot.id);
    });

    test('should handle database connection errors gracefully', async () => {
      // Mock a database error
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection failed' }
              })
            })
          })
        })
      } as any));

      const snapshot = await engine.captureSchemaSnapshot();

      // Should still create a snapshot with empty tables
      expect(snapshot).toBeDefined();
      expect(snapshot.tables.size).toBe(0);
    });
  });

  describe('Schema Comparison', () => {
    test('should detect no changes when schemas are identical', async () => {
      const beforeSnapshot = mockSnapshot;
      const afterSnapshot = { ...mockSnapshot, id: 'test-snapshot-2' };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(0);
    });

    test('should detect added tables', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const afterTables = new Map(beforeSnapshot.tables);
      afterTables.set('new_table', {
        ...mockTableSchema,
        name: 'new_table'
      });

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('TABLE_ADDED');
      expect(changes[0].tableName).toBe('new_table');
      expect(changes[0].severity).toBe('MEDIUM');
      expect(changes[0].impact).toBe('COMPATIBLE');
      expect(changes[0].migrationRequired).toBe(true);
    });

    test('should detect removed tables', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const afterTables = new Map<string, TableSchema>();
      // Remove the 'users' table

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('TABLE_REMOVED');
      expect(changes[0].tableName).toBe('users');
      expect(changes[0].severity).toBe('HIGH');
      expect(changes[0].impact).toBe('BREAKING');
      expect(changes[0].dataBackupRequired).toBe(true);
    });

    test('should detect added columns', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const modifiedTable: TableSchema = {
        ...mockTableSchema,
        columns: [
          ...mockTableSchema.columns,
          {
            name: 'created_at',
            type: 'timestamp',
            nullable: true,
            isPrimaryKey: false,
            isForeignKey: false,
            isUnique: false
          }
        ]
      };

      const afterTables = new Map<string, TableSchema>();
      afterTables.set('users', modifiedTable);

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('COLUMN_ADDED');
      expect(changes[0].tableName).toBe('users');
      expect(changes[0].columnName).toBe('created_at');
      expect(changes[0].severity).toBe('LOW');
      expect(changes[0].impact).toBe('COMPATIBLE'); // Nullable column
    });

    test('should detect removed columns', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const modifiedTable: TableSchema = {
        ...mockTableSchema,
        columns: [mockTableSchema.columns[0]] // Remove email column
      };

      const afterTables = new Map<string, TableSchema>();
      afterTables.set('users', modifiedTable);

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('COLUMN_REMOVED');
      expect(changes[0].tableName).toBe('users');
      expect(changes[0].columnName).toBe('email');
      expect(changes[0].severity).toBe('HIGH');
      expect(changes[0].impact).toBe('BREAKING');
    });

    test('should detect column type changes', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const modifiedTable: TableSchema = {
        ...mockTableSchema,
        columns: [
          mockTableSchema.columns[0],
          {
            ...mockTableSchema.columns[1],
            type: 'text' // Changed from varchar to text
          }
        ]
      };

      const afterTables = new Map<string, TableSchema>();
      afterTables.set('users', modifiedTable);

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('COLUMN_MODIFIED');
      expect(changes[0].tableName).toBe('users');
      expect(changes[0].columnName).toBe('email');
      expect(changes[0].severity).toBe('HIGH');
      expect(changes[0].impact).toBe('BREAKING');
      expect(changes[0].before).toBe('varchar');
      expect(changes[0].after).toBe('text');
    });

    test('should detect nullable changes', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const modifiedTable: TableSchema = {
        ...mockTableSchema,
        columns: [
          mockTableSchema.columns[0],
          {
            ...mockTableSchema.columns[1],
            nullable: true // Changed from false to true
          }
        ]
      };

      const afterTables = new Map<string, TableSchema>();
      afterTables.set('users', modifiedTable);

      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        tables: afterTables
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('COLUMN_MODIFIED');
      expect(changes[0].severity).toBe('LOW'); // Making nullable is less severe
      expect(changes[0].impact).toBe('COMPATIBLE');
    });

    test('should detect extension changes', async () => {
      const beforeSnapshot = mockSnapshot;
      
      const afterSnapshot: SchemaSnapshot = {
        ...beforeSnapshot,
        id: 'test-snapshot-2',
        extensions: ['uuid-ossp', 'pgcrypto', 'postgis'] // Added postgis
      };

      const changes = await engine.compareSchemas(beforeSnapshot, afterSnapshot);

      expect(changes.some(c => c.objectName === 'postgis' && c.type === 'TYPE_ADDED')).toBe(true);
    });
  });

  describe('Configuration Impact Analysis', () => {
    test('should analyze impact on configuration files', async () => {
      const changes: SchemaChange[] = [
        {
          id: 'table-removed-users',
          type: 'TABLE_REMOVED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName: 'users',
          description: 'Table users was removed',
          recommendations: ['Remove references'],
          migrationRequired: true,
          dataBackupRequired: true
        }
      ];

      const impacts = await engine.analyzeConfigurationImpact(changes, ['test-config.js']);

      expect(impacts).toHaveLength(1);
      expect(impacts[0].configFile).toBe('test-config.js');
      expect(impacts[0].migrationNeeded).toBe(true);
      expect(impacts[0].backupRecommended).toBe(true);
      expect(impacts[0].changes.some(c => c.breaking)).toBe(true);
    });

    test('should skip files with no impacts', async () => {
      const changes: SchemaChange[] = [
        {
          id: 'extension-added-postgis',
          type: 'TYPE_ADDED',
          severity: 'LOW',
          impact: 'COMPATIBLE',
          objectName: 'postgis',
          description: 'Extension postgis was added',
          recommendations: [],
          migrationRequired: false,
          dataBackupRequired: false
        }
      ];

      const impacts = await engine.analyzeConfigurationImpact(changes, ['test-config.js']);

      expect(impacts).toHaveLength(0); // No breaking changes, no impact
    });

    test('should calculate effort estimation correctly', async () => {
      const manyChanges: SchemaChange[] = Array.from({ length: 10 }, (_, i) => ({
        id: `change-${i}`,
        type: 'COLUMN_REMOVED',
        severity: 'HIGH',
        impact: 'BREAKING',
        tableName: `table_${i}`,
        columnName: `column_${i}`,
        description: `Column column_${i} was removed`,
        recommendations: [],
        migrationRequired: true,
        dataBackupRequired: true
      }));

      const impacts = await engine.analyzeConfigurationImpact(manyChanges, ['test-config.js']);

      expect(impacts[0].estimatedEffort).toBe('HIGH'); // More than 5 changes
    });
  });

  describe('Migration Suggestions', () => {
    test('should generate automatic migration suggestions', () => {
      const changes: SchemaChange[] = [
        {
          id: 'column-added-nullable',
          type: 'COLUMN_ADDED',
          severity: 'LOW',
          impact: 'COMPATIBLE',
          tableName: 'users',
          columnName: 'created_at',
          description: 'Nullable column added',
          recommendations: [],
          migrationRequired: false,
          dataBackupRequired: false
        }
      ];

      const impacts: ConfigurationImpact[] = [];
      const suggestions = engine.generateMigrationSuggestions(changes, impacts);

      expect(suggestions.some(s => s.type === 'AUTOMATIC')).toBe(true);
      expect(suggestions.some(s => s.title.includes('Nullable Columns'))).toBe(true);
    });

    test('should generate semi-automatic migration suggestions', () => {
      const changes: SchemaChange[] = [
        {
          id: 'table-removed-users',
          type: 'TABLE_REMOVED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName: 'users',
          description: 'Table removed',
          recommendations: [],
          migrationRequired: true,
          dataBackupRequired: true
        }
      ];

      const impacts: ConfigurationImpact[] = [];
      const suggestions = engine.generateMigrationSuggestions(changes, impacts);

      expect(suggestions.some(s => s.type === 'SEMI_AUTOMATIC')).toBe(true);
      expect(suggestions.some(s => s.title.includes('Removed Tables'))).toBe(true);
    });

    test('should generate manual migration suggestions', () => {
      const changes: SchemaChange[] = [
        {
          id: 'column-type-changed',
          type: 'COLUMN_MODIFIED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName: 'users',
          columnName: 'email',
          before: 'varchar',
          after: 'text',
          description: 'Column type changed from varchar to text',
          recommendations: [],
          migrationRequired: true,
          dataBackupRequired: true
        }
      ];

      const impacts: ConfigurationImpact[] = [];
      const suggestions = engine.generateMigrationSuggestions(changes, impacts);

      expect(suggestions.some(s => s.type === 'MANUAL')).toBe(true);
      expect(suggestions.some(s => s.title.includes('Column Type Changes'))).toBe(true);
    });

    test('should sort suggestions by priority and risk', () => {
      const changes: SchemaChange[] = [
        {
          id: 'low-priority',
          type: 'COLUMN_ADDED',
          severity: 'LOW',
          impact: 'COMPATIBLE',
          tableName: 'users',
          description: 'Low priority change',
          recommendations: [],
          migrationRequired: false,
          dataBackupRequired: false
        },
        {
          id: 'high-priority',
          type: 'TABLE_REMOVED',
          severity: 'CRITICAL',
          impact: 'BREAKING',
          tableName: 'users',
          description: 'Critical change',
          recommendations: [],
          migrationRequired: true,
          dataBackupRequired: true
        }
      ];

      const impacts: ConfigurationImpact[] = [];
      const suggestions = engine.generateMigrationSuggestions(changes, impacts);

      // First suggestion should be the critical one
      expect(suggestions[0].priority).toBe('HIGH');
      expect(suggestions[suggestions.length - 1].priority).toBe('LOW');
    });

    test('should include time estimates and prerequisites', () => {
      const changes: SchemaChange[] = [
        {
          id: 'manual-change',
          type: 'COLUMN_MODIFIED',
          severity: 'HIGH',
          impact: 'BREAKING',
          tableName: 'users',
          columnName: 'email',
          before: 'varchar',
          after: 'text',
          description: 'Column type changed from varchar to text',
          recommendations: [],
          migrationRequired: true,
          dataBackupRequired: true
        }
      ];

      const impacts: ConfigurationImpact[] = [];
      const suggestions = engine.generateMigrationSuggestions(changes, impacts);

      const manualSuggestion = suggestions.find(s => s.type === 'MANUAL');
      
      expect(manualSuggestion).toBeDefined();
      expect(manualSuggestion?.estimatedTime).toBeGreaterThan(0);
      expect(manualSuggestion?.prerequisites).toBeDefined();
      expect(manualSuggestion?.rollbackPlan).toBeDefined();
      expect(manualSuggestion?.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Change Detection', () => {
    test('should detect changes with previous snapshot', async () => {
      // Capture initial snapshot
      const initialSnapshot = await engine.captureSchemaSnapshot('1.0.0', 'Initial');
      
      // Capture another snapshot
      const result = await engine.detectSchemaChanges(initialSnapshot.id);

      expect(result.currentSnapshot).toBeDefined();
      expect(result.changes).toHaveLength(0); // No changes in this test
      expect(result.impacts).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    test('should handle missing previous snapshot', async () => {
      const result = await engine.detectSchemaChanges('non-existent-snapshot');

      expect(result.currentSnapshot).toBeDefined();
      expect(result.changes).toHaveLength(0);
      expect(result.impacts).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    test('should detect changes and provide comprehensive results', async () => {
      // Create a mock previous snapshot with no tables
      const previousSnapshot: SchemaSnapshot = {
        ...mockSnapshot,
        id: 'previous-snapshot',
        tables: new Map<string, TableSchema>() // Empty tables
      };
      
      // Manually add to engine's snapshots (simulating previous capture)
      engine['snapshots'].set(previousSnapshot.id, previousSnapshot);
      
      const result = await engine.detectSchemaChanges(previousSnapshot.id);

      expect(result.currentSnapshot).toBeDefined();
      expect(result.changes).toBeDefined();
      expect(result.impacts).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.currentSnapshot.id).not.toBe(previousSnapshot.id);
    });
  });

  describe('Performance and Error Handling', () => {
    test('should handle database errors during snapshot capture', async () => {
      // Mock database error - return error in data response
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
              }),
              then: function(callback: any) {
                return callback({
                  data: null,
                  error: { message: 'Database connection failed' }
                });
              }
            })
          })
        })
      } as any));

      const snapshot = await engine.captureSchemaSnapshot();

      // Should still create a snapshot with basic information
      expect(snapshot).toBeDefined();
      expect(snapshot.tables.size).toBe(0);
    });

    test('should handle malformed database responses', async () => {
      // Mock malformed response
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [{ invalid_field: 'invalid_value' }], // Wrong structure
                error: null
              })
            })
          })
        })
      } as any));

      const snapshot = await engine.captureSchemaSnapshot();

      // Should handle gracefully
      expect(snapshot).toBeDefined();
    });

    test('should perform efficiently with large schemas', async () => {
      // Mock large number of tables but keep test reasonable
      const manyTables = Array.from({ length: 10 }, (_, i) => ({ table_name: `table_${i}` }));
      
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: table === 'information_schema.tables' ? manyTables : 
                      table === 'information_schema.columns' ? [] :
                      table === 'pg_extension' ? [] : [],
                error: null
              }),
              then: function(callback: any) {
                return callback({
                  data: table === 'information_schema.tables' ? manyTables : 
                        table === 'information_schema.columns' ? [] :
                        table === 'pg_extension' ? [] : [],
                  error: null
                });
              }
            })
          })
        })
      } as any));

      const startTime = Date.now();
      const snapshot = await engine.captureSchemaSnapshot();
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete in reasonable time
      expect(snapshot.tables.size).toBe(10);
    });

    test('should manage snapshot memory efficiently', () => {
      const initialSnapshots = engine.getSnapshots().length;
      
      // Clear snapshots
      engine.clearSnapshots();
      
      expect(engine.getSnapshots().length).toBe(0);
      expect(engine.getSnapshot('any-id')).toBeUndefined();
    });
  });

  describe('Snapshot Management', () => {
    beforeEach(() => {
      engine.clearSnapshots(); // Clear before each test
    });

    test('should retrieve snapshots by ID', async () => {
      const snapshot = await engine.captureSchemaSnapshot('1.0.0', 'Test');
      
      const retrieved = engine.getSnapshot(snapshot.id);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(snapshot.id);
      expect(retrieved?.version).toBe('1.0.0');
    });

    test('should return undefined for non-existent snapshots', () => {
      const retrieved = engine.getSnapshot('non-existent');
      
      expect(retrieved).toBeUndefined();
    });

    test('should list all snapshots', async () => {
      const first = await engine.captureSchemaSnapshot('1.0.0', 'First');
      const second = await engine.captureSchemaSnapshot('1.1.0', 'Second');
      
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      
      const snapshots = engine.getSnapshots();
      
      expect(snapshots).toHaveLength(2);
      expect(snapshots.some(s => s.version === '1.0.0')).toBe(true);
      expect(snapshots.some(s => s.version === '1.1.0')).toBe(true);
    });
  });
});