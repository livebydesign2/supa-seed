/**
 * Test suite for Asset-to-Data Mapping System
 * Phase 2, Checkpoint B3 validation
 */

import { AssetDataMapper, FieldMapping, MappingConfig } from '../src/features/generation/assets/asset-data-mapper';
import { LoadedAsset } from '../src/features/generation/assets/asset-loader';

// Mock Logger
jest.mock('../src/core/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Asset Data Mapper', () => {
  let mockAssets: LoadedAsset[];

  beforeEach(() => {
    mockAssets = [
      {
        id: 'post-1',
        filePath: '/test/post1.md',
        type: 'markdown',
        content: '# First Post\n\nThis is the content of the first post.',
        metadata: {
          filename: 'post1',
          title: 'First Post',
          description: 'A sample blog post',
          author: 'John Doe',
          date: '2025-01-20',
          tags: ['blog', 'featured'],
          featured: true,
          category: 'tutorial'
        },
        fileSize: 1000,
        lastModified: new Date('2025-01-20'),
        isValid: true
      },
      {
        id: 'user-data',
        filePath: '/test/users.csv',
        type: 'csv',
        content: 'name,email,role\nJane Smith,jane@example.com,admin',
        metadata: {
          filename: 'users',
          rowCount: 1,
          columns: ['name', 'email', 'role'],
          sampleRows: [
            { name: 'Jane Smith', email: 'jane@example.com', role: 'admin' }
          ]
        },
        fileSize: 500,
        lastModified: new Date('2025-01-21'),
        isValid: true
      },
      {
        id: 'incomplete-post',
        filePath: '/test/incomplete.md',
        type: 'markdown',
        content: 'Just some content without metadata',
        metadata: {
          filename: 'incomplete'
          // Missing title, author, etc.
        },
        fileSize: 200,
        lastModified: new Date('2025-01-19'),
        isValid: false
      }
    ] as LoadedAsset[];
  });

  describe('Basic Field Mapping', () => {
    test('should map simple fields correctly', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true
          },
          {
            sourceField: 'author',
            targetField: 'author_name',
            dataType: 'string',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.records).toHaveLength(1);

      const record = result.records[0];
      expect(record.isValid).toBe(true);
      expect(record.mappedData.title).toBe('First Post');
      expect(record.mappedData.author_name).toBe('John Doe');
    });

    test('should handle missing required fields with fallbacks', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true,
            fallbackGenerator: () => 'Default Title'
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[2]], config); // incomplete post

      expect(result.successful).toBe(1);
      const record = result.records[0];
      expect(record.isValid).toBe(true);
      expect(record.mappedData.title).toBe('Default Title');
      expect(record.usedFallbacks).toContain('title');
    });

    test('should handle missing required fields without fallbacks', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[2]], config); // incomplete post

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      const record = result.records[0];
      expect(record.isValid).toBe(false);
      expect(record.errors).toContain("Field 'title': Required field is missing");
    });

    test('should use default values for optional fields', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true
          },
          {
            sourceField: 'category',
            targetField: 'category',
            dataType: 'string',
            required: false,
            defaultValue: 'uncategorized'
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[2]], config);

      const record = result.records[0];
      expect(record.mappedData.category).toBe('uncategorized');
    });
  });

  describe('Special Field Mapping', () => {
    test('should map special fields correctly', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: '$content',
            targetField: 'body',
            dataType: 'string',
            required: false
          },
          {
            sourceField: '$filename',
            targetField: 'slug',
            dataType: 'string',
            required: false
          },
          {
            sourceField: '$filesize',
            targetField: 'size_bytes',
            dataType: 'number',
            required: false
          },
          {
            sourceField: '$lastmodified',
            targetField: 'created_at',
            dataType: 'date',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);

      const record = result.records[0];
      expect(record.mappedData.body).toBe('# First Post\n\nThis is the content of the first post.');
      expect(record.mappedData.slug).toBe('post1');
      expect(record.mappedData.size_bytes).toBe(1000);
      expect(record.mappedData.created_at).toBeInstanceOf(Date);
    });

    test('should map nested metadata fields', () => {
      const assetWithNested = {
        ...mockAssets[0],
        metadata: {
          ...mockAssets[0].metadata,
          user: {
            profile: {
              displayName: 'John Display'
            }
          }
        }
      };

      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'user.profile.displayName',
            targetField: 'display_name',
            dataType: 'string',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([assetWithNested], config);

      expect(result.records[0].mappedData.display_name).toBe('John Display');
    });
  });

  describe('Data Type Conversion', () => {
    test('should convert strings to numbers', () => {
      const asset = {
        ...mockAssets[0],
        metadata: { ...mockAssets[0].metadata, price: '29.99' }
      };

      const config: MappingConfig = {
        tableName: 'products',
        mappings: [
          {
            sourceField: 'price',
            targetField: 'price',
            dataType: 'number',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([asset], config);

      expect(result.records[0].mappedData.price).toBe(29.99);
      expect(typeof result.records[0].mappedData.price).toBe('number');
    });

    test('should convert strings to booleans', () => {
      const asset = {
        ...mockAssets[0],
        metadata: { 
          ...mockAssets[0].metadata, 
          active: 'true',
          visible: 'false',
          enabled: '1',
          disabled: '0'
        }
      };

      const config: MappingConfig = {
        tableName: 'test',
        mappings: [
          { sourceField: 'active', targetField: 'is_active', dataType: 'boolean', required: false },
          { sourceField: 'visible', targetField: 'is_visible', dataType: 'boolean', required: false },
          { sourceField: 'enabled', targetField: 'is_enabled', dataType: 'boolean', required: false },
          { sourceField: 'disabled', targetField: 'is_disabled', dataType: 'boolean', required: false }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([asset], config);
      const record = result.records[0];

      expect(record.mappedData.is_active).toBe(true);
      expect(record.mappedData.is_visible).toBe(false);
      expect(record.mappedData.is_enabled).toBe(true);
      expect(record.mappedData.is_disabled).toBe(false);
    });

    test('should convert strings to dates', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'date',
            targetField: 'published_at',
            dataType: 'date',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);

      expect(result.records[0].mappedData.published_at).toBeInstanceOf(Date);
      expect(result.records[0].mappedData.published_at.getFullYear()).toBe(2025);
    });

    test('should convert strings to arrays', () => {
      const asset = {
        ...mockAssets[0],
        metadata: { 
          ...mockAssets[0].metadata,
          csvTags: 'tag1,tag2,tag3',
          jsonTags: '["json1", "json2"]'
        }
      };

      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          { sourceField: 'tags', targetField: 'existing_tags', dataType: 'array', required: false },
          { sourceField: 'csvTags', targetField: 'csv_tags', dataType: 'array', required: false },
          { sourceField: 'jsonTags', targetField: 'json_tags', dataType: 'array', required: false }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([asset], config);
      const record = result.records[0];

      expect(record.mappedData.existing_tags).toEqual(['blog', 'featured']);
      expect(record.mappedData.csv_tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(record.mappedData.json_tags).toEqual(['json1', 'json2']);
    });

    test('should handle invalid data type conversions', () => {
      const asset = {
        ...mockAssets[0],
        metadata: { ...mockAssets[0].metadata, invalidNumber: 'not-a-number' }
      };

      const config: MappingConfig = {
        tableName: 'test',
        mappings: [
          {
            sourceField: 'invalidNumber',
            targetField: 'number_field',
            dataType: 'number',
            required: false
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([asset], config);
      const record = result.records[0];

      expect(record.errors.length).toBeGreaterThan(0);
      expect(record.errors[0]).toContain('Cannot convert "not-a-number" to number');
    });
  });

  describe('Field Transformers', () => {
    test('should apply transformers correctly', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'slug',
            dataType: 'string',
            required: false,
            transformer: AssetDataMapper.createTransformers.slugify
          },
          {
            sourceField: 'description',
            targetField: 'excerpt',
            dataType: 'string',
            required: false,
            transformer: AssetDataMapper.createTransformers.truncate(20)
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);
      const record = result.records[0];

      expect(record.mappedData.slug).toBe('first-post');
      expect(record.mappedData.excerpt).toBe('A sample blog post'); // 18 chars < 20, so no truncation
    });

    test('should apply markdown to text transformer', () => {
      const asset = {
        ...mockAssets[0],
        content: '# Title\n\nThis is **bold** and *italic* text with [a link](http://example.com) and `code`.'
      };

      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: '$content',
            targetField: 'plain_text',
            dataType: 'string',
            required: false,
            transformer: AssetDataMapper.createTransformers.markdownToText
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([asset], config);
      const record = result.records[0];

      expect(record.mappedData.plain_text).toBe('Title\n\nThis is bold and italic text with a link and code.');
    });

    test('should handle transformer errors gracefully', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'transformed_title',
            dataType: 'string',
            required: false,
            transformer: () => { throw new Error('Transformer error'); }
          }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);
      const record = result.records[0];

      expect(record.errors.length).toBeGreaterThan(0);
      expect(record.errors[0]).toContain('Transformer error');
    });
  });

  describe('Field Validation', () => {
    test('should validate field values correctly', () => {
      const config: MappingConfig = {
        tableName: 'users',
        mappings: [
          {
            sourceField: 'email',
            targetField: 'email',
            dataType: 'string',
            required: true,
            validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          }
        ]
      };

      // Test with valid email
      const validAsset = {
        ...mockAssets[0],
        metadata: { ...mockAssets[0].metadata, email: 'test@example.com' }
      };

      const validResult = AssetDataMapper.mapAssetsToRecords([validAsset], config);
      expect(validResult.records[0].isValid).toBe(true);

      // Test with invalid email
      const invalidAsset = {
        ...mockAssets[0],
        metadata: { ...mockAssets[0].metadata, email: 'invalid-email' }
      };

      const invalidResult = AssetDataMapper.mapAssetsToRecords([invalidAsset], config);
      expect(invalidResult.records[0].isValid).toBe(false);
      expect(invalidResult.records[0].errors[0]).toContain('Validation failed');
    });
  });

  describe('Error Handling and Configuration', () => {
    test('should handle different error strategies', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'missing_field',
            targetField: 'required_field',
            dataType: 'string',
            required: true,
            fallbackGenerator: () => 'fallback_value'
          }
        ],
        onMappingError: 'use_fallback'
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[2]], config);
      const record = result.records[0];

      expect(record.isValid).toBe(true);
      expect(record.mappedData.required_field).toBe('fallback_value');
      expect(record.usedFallbacks).toContain('required_field');
    });

    test('should apply global defaults', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: false
          }
        ],
        globalDefaults: {
          status: 'draft',
          created_by: 'system'
        }
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);
      const record = result.records[0];

      expect(record.mappedData.status).toBe('draft');
      expect(record.mappedData.created_by).toBe('system');
    });

    test('should handle partial records when allowed', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: false
          },
          {
            sourceField: 'missing_field',
            targetField: 'optional_field',
            dataType: 'string',
            required: false
          }
        ],
        allowPartial: true
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);

      expect(result.successful).toBe(1);
      expect(result.records[0].isValid).toBe(true);
    });
  });

  describe('Predefined Mappings', () => {
    test('should create blog post mapping correctly', () => {
      const mappings = AssetDataMapper.createMappings.blogPost();
      const config: MappingConfig = {
        tableName: 'posts',
        mappings
      };

      const result = AssetDataMapper.mapAssetsToRecords([mockAssets[0]], config);
      const record = result.records[0];

      expect(record.isValid).toBe(true);
      expect(record.mappedData.title).toBe('First Post');
      expect(record.mappedData.content).toContain('This is the content');
      expect(record.mappedData.author).toBe('John Doe');
      expect(record.mappedData.published_at).toBeInstanceOf(Date);
      expect(record.mappedData.tags).toEqual(['blog', 'featured']);
      expect(record.mappedData.is_featured).toBe(true);
    });

    test('should create users mapping correctly', () => {
      const mappings = AssetDataMapper.createMappings.users();
      const config: MappingConfig = {
        tableName: 'users',
        mappings
      };

      // Create a CSV-like asset
      const csvAsset = {
        ...mockAssets[1],
        metadata: {
          ...mockAssets[1].metadata,
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'admin',
          active: 'true'
        }
      };

      const result = AssetDataMapper.mapAssetsToRecords([csvAsset], config);
      const record = result.records[0];

      expect(record.isValid).toBe(true);
      expect(record.mappedData.full_name).toBe('Jane Smith');
      expect(record.mappedData.email).toBe('jane@example.com');
      expect(record.mappedData.role).toBe('admin');
      expect(record.mappedData.is_active).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate valid configuration', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true
          }
        ]
      };

      const validation = AssetDataMapper.validateMappingConfig(config);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should detect configuration errors', () => {
      const config: MappingConfig = {
        tableName: '', // Empty table name
        mappings: [
          {
            sourceField: '',
            targetField: 'title',
            dataType: 'invalid' as any,
            required: true
          },
          {
            sourceField: 'description',
            targetField: 'title', // Duplicate target field
            dataType: 'string',
            required: false
          }
        ]
      };

      const validation = AssetDataMapper.validateMappingConfig(config);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Table name is required');
      expect(validation.errors).toContain('Source field is required for target: title');
      expect(validation.errors).toContain("Invalid data type 'invalid' for field: title");
      expect(validation.errors).toContain('Duplicate target field: title');
    });

    test('should provide configuration warnings', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          {
            sourceField: 'title',
            targetField: 'title',
            dataType: 'string',
            required: true
            // No fallback generator or default value
          }
        ]
      };

      const validation = AssetDataMapper.validateMappingConfig(config);

      expect(validation.warnings).toContain("Required field 'title' has no fallback or default value");
    });
  });

  describe('Statistics and Metadata', () => {
    test('should provide comprehensive mapping statistics', () => {
      const config: MappingConfig = {
        tableName: 'posts',
        mappings: [
          { sourceField: 'title', targetField: 'title', dataType: 'string', required: true },
          { sourceField: 'author', targetField: 'author', dataType: 'string', required: false },
          { sourceField: 'date', targetField: 'published_at', dataType: 'date', required: false }
        ]
      };

      const result = AssetDataMapper.mapAssetsToRecords(mockAssets, config);

      expect(result.statistics.fieldUsageStats.title).toBeGreaterThan(0);
      expect(result.statistics.dataTypeStats.string).toBeGreaterThan(0);
      expect(result.statistics.dataTypeStats.date).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });
});