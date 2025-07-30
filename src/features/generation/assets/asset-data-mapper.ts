/**
 * Asset-to-Data Mapping System
 * Phase 2, Checkpoint B3 - Bridge between asset selection and database seeding
 */

import { LoadedAsset } from './asset-loader';
import { Logger } from '../../../core/utils/logger';

export interface FieldMapping {
  sourceField: string;           // Field in asset metadata or special key like '$content', '$filename'
  targetField: string;           // Database column name
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  required: boolean;
  defaultValue?: any;
  transformer?: (value: any, asset: LoadedAsset) => any;
  validator?: (value: any) => boolean;
  fallbackGenerator?: () => any;
}

export interface MappingConfig {
  tableName: string;
  mappings: FieldMapping[];
  globalDefaults?: Record<string, any>;
  requireAll?: boolean;         // If true, all required fields must be present
  allowPartial?: boolean;       // If true, create records even with missing optional fields
  batchSize?: number;
  onMappingError?: 'skip' | 'throw' | 'use_fallback';
}

export interface MappedRecord {
  originalAsset: LoadedAsset;
  mappedData: Record<string, any>;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  usedFallbacks: string[];      // Fields that used fallback values
}

export interface MappingResult {
  records: MappedRecord[];
  successful: number;
  failed: number;
  totalAssets: number;
  executionTime: number;
  errors: Array<{
    asset: LoadedAsset;
    error: string;
  }>;
  statistics: {
    fieldUsageStats: Record<string, number>;
    dataTypeStats: Record<string, number>;
    fallbackUsageStats: Record<string, number>;
    validationFailureStats: Record<string, number>;
  };
}

export class AssetDataMapper {
  private static readonly SPECIAL_FIELDS = {
    '$content': (asset: LoadedAsset) => asset.content,
    '$filename': (asset: LoadedAsset) => asset.metadata.filename,
    '$filepath': (asset: LoadedAsset) => asset.filePath,
    '$filesize': (asset: LoadedAsset) => asset.fileSize,
    '$lastmodified': (asset: LoadedAsset) => asset.lastModified,
    '$type': (asset: LoadedAsset) => asset.type,
    '$id': (asset: LoadedAsset) => asset.id,
    '$isvalid': (asset: LoadedAsset) => asset.isValid,
    '$extension': (asset: LoadedAsset) => asset.metadata.extension,
    '$mimetype': (asset: LoadedAsset) => asset.metadata.mimeType
  };

  /**
   * Map assets to database records using the provided configuration
   */
  static mapAssetsToRecords(
    assets: LoadedAsset[],
    config: MappingConfig
  ): MappingResult {
    const startTime = Date.now();
    const records: MappedRecord[] = [];
    const errors: Array<{ asset: LoadedAsset; error: string }> = [];
    const statistics = {
      fieldUsageStats: {} as Record<string, number>,
      dataTypeStats: {} as Record<string, number>,
      fallbackUsageStats: {} as Record<string, number>,
      validationFailureStats: {} as Record<string, number>
    };

    Logger.info(`🗂️  Mapping ${assets.length} assets to ${config.tableName} records`);

    for (const asset of assets) {
      try {
        const mappedRecord = this.mapSingleAsset(asset, config, statistics);
        records.push(mappedRecord);
      } catch (error: any) {
        errors.push({ asset, error: error.message });
        Logger.warn(`Failed to map asset ${asset.id}: ${error.message}`);
      }
    }

    const successful = records.filter(r => r.isValid).length;
    const failed = records.length - successful;
    const executionTime = Date.now() - startTime;

    Logger.info(`✅ Mapped ${successful}/${assets.length} assets successfully (${executionTime}ms)`);

    return {
      records,
      successful,
      failed,
      totalAssets: assets.length,
      executionTime,
      errors,
      statistics
    };
  }

  /**
   * Map a single asset to a database record
   */
  private static mapSingleAsset(
    asset: LoadedAsset,
    config: MappingConfig,
    statistics: MappingResult['statistics']
  ): MappedRecord {
    const mappedData: Record<string, any> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    const usedFallbacks: string[] = [];

    // Apply global defaults first
    if (config.globalDefaults) {
      Object.assign(mappedData, config.globalDefaults);
    }

    // Process each field mapping
    for (const mapping of config.mappings) {
      try {
        const result = this.mapField(asset, mapping, statistics);
        
        if (result.success) {
          mappedData[mapping.targetField] = result.value;
          if (result.usedFallback) {
            usedFallbacks.push(mapping.targetField);
          }
        } else {
          const errorMsg = `Field '${mapping.targetField}': ${result.error}`;
          
          if (mapping.required) {
            if (config.onMappingError === 'throw') {
              throw new Error(errorMsg);
            } else if (config.onMappingError === 'use_fallback' && mapping.fallbackGenerator) {
              const fallbackValue = mapping.fallbackGenerator();
              mappedData[mapping.targetField] = fallbackValue;
              usedFallbacks.push(mapping.targetField);
              warnings.push(`Used fallback for ${mapping.targetField}`);
            } else {
              errors.push(errorMsg);
            }
          } else {
            // For optional fields, still add to errors if it's a conversion/validation error
            if (config.onMappingError === 'skip') {
              warnings.push(errorMsg);
            } else {
              errors.push(errorMsg);
            }
            // Use default value for optional fields if available
            if (mapping.defaultValue !== undefined) {
              mappedData[mapping.targetField] = mapping.defaultValue;
            }
          }
        }
      } catch (error: any) {
        const errorMsg = `Field '${mapping.targetField}': ${error.message}`;
        errors.push(errorMsg);
        statistics.validationFailureStats[mapping.targetField] = 
          (statistics.validationFailureStats[mapping.targetField] || 0) + 1;
      }
    }

    // Determine if record is valid
    const hasRequiredFieldErrors = errors.some(error => 
      config.mappings.some(m => m.required && error.includes(m.targetField))
    );
    const isValid = !hasRequiredFieldErrors && (config.allowPartial || errors.length === 0);

    return {
      originalAsset: asset,
      mappedData,
      errors,
      warnings,
      isValid,
      usedFallbacks
    };
  }

  /**
   * Map a single field from asset to target format
   */
  private static mapField(
    asset: LoadedAsset,
    mapping: FieldMapping,
    statistics: MappingResult['statistics']
  ): { success: boolean; value?: any; error?: string; usedFallback?: boolean } {
    // Update statistics
    statistics.fieldUsageStats[mapping.sourceField] = 
      (statistics.fieldUsageStats[mapping.sourceField] || 0) + 1;
    statistics.dataTypeStats[mapping.dataType] = 
      (statistics.dataTypeStats[mapping.dataType] || 0) + 1;

    try {
      // Extract raw value from asset
      let rawValue = this.extractFieldValue(asset, mapping.sourceField);

      // Handle missing required values
      if ((rawValue === undefined || rawValue === null) && mapping.required) {
        if (mapping.fallbackGenerator) {
          rawValue = mapping.fallbackGenerator();
          statistics.fallbackUsageStats[mapping.sourceField] = 
            (statistics.fallbackUsageStats[mapping.sourceField] || 0) + 1;
          return { success: true, value: rawValue, usedFallback: true };
        }
        return { success: false, error: 'Required field is missing' };
      }

      // Use default value if available and value is missing
      if ((rawValue === undefined || rawValue === null) && mapping.defaultValue !== undefined) {
        rawValue = mapping.defaultValue;
      }

      // Apply transformer if provided
      if (mapping.transformer && rawValue !== undefined && rawValue !== null) {
        rawValue = mapping.transformer(rawValue, asset);
      }

      // Convert data type
      const convertedValue = this.convertDataType(rawValue, mapping.dataType);

      // Validate if validator provided
      if (mapping.validator && !mapping.validator(convertedValue)) {
        return { success: false, error: 'Validation failed' };
      }

      return { success: true, value: convertedValue };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract field value from asset
   */
  private static extractFieldValue(asset: LoadedAsset, sourceField: string): any {
    // Handle special fields
    if (sourceField.startsWith('$')) {
      const specialHandler = this.SPECIAL_FIELDS[sourceField as keyof typeof this.SPECIAL_FIELDS];
      if (specialHandler) {
        return specialHandler(asset);
      }
      throw new Error(`Unknown special field: ${sourceField}`);
    }

    // Handle nested field access (e.g., "user.profile.displayName")
    if (sourceField.includes('.')) {
      const parts = sourceField.split('.');
      let current: any = asset.metadata;
      
      for (const part of parts) {
        if (current && typeof current === 'object') {
          current = current[part];
        } else {
          return undefined;
        }
      }
      
      return current;
    }

    // Direct field access
    return asset.metadata[sourceField];
  }

  /**
   * Convert value to target data type
   */
  private static convertDataType(value: any, targetType: FieldMapping['dataType']): any {
    if (value === null || value === undefined) {
      return null;
    }

    switch (targetType) {
      case 'string':
        return String(value);

      case 'number':
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            throw new Error(`Cannot convert "${value}" to number`);
          }
          return parsed;
        }
        if (typeof value === 'boolean') return value ? 1 : 0;
        throw new Error(`Cannot convert ${typeof value} to number`);

      case 'boolean':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
          const lower = value.toLowerCase();
          if (['true', '1', 'yes', 'on', 'enabled'].includes(lower)) return true;
          if (['false', '0', 'no', 'off', 'disabled'].includes(lower)) return false;
        }
        if (typeof value === 'number') return value !== 0;
        throw new Error(`Cannot convert "${value}" to boolean`);

      case 'date':
        if (value instanceof Date) return value;
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            throw new Error(`Cannot convert "${value}" to date`);
          }
          return date;
        }
        throw new Error(`Cannot convert ${typeof value} to date`);

      case 'json':
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            throw new Error(`Cannot parse "${value}" as JSON`);
          }
        }
        throw new Error(`Cannot convert ${typeof value} to JSON`);

      case 'array':
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
          // Try to parse as JSON array first
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
          } catch {
            // Fall back to comma-separated values
            return value.split(',').map(item => item.trim());
          }
        }
        // Wrap single values in array
        return [value];

      default:
        throw new Error(`Unknown data type: ${targetType}`);
    }
  }

  /**
   * Create common field mapping configurations
   */
  static createMappings = {
    /**
     * Create mapping for blog posts
     */
    blogPost: (): FieldMapping[] => [
      {
        sourceField: 'title',
        targetField: 'title',
        dataType: 'string',
        required: true,
        fallbackGenerator: () => `Generated Post ${Date.now()}`
      },
      {
        sourceField: 'description',
        targetField: 'description',
        dataType: 'string',
        required: false
      },
      {
        sourceField: '$content',
        targetField: 'content',
        dataType: 'string',
        required: true,
        fallbackGenerator: () => 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
      },
      {
        sourceField: 'author',
        targetField: 'author',
        dataType: 'string',
        required: false,
        defaultValue: 'Anonymous'
      },
      {
        sourceField: 'date',
        targetField: 'published_at',
        dataType: 'date',
        required: false,
        transformer: (value, asset) => value || asset.lastModified
      },
      {
        sourceField: 'tags',
        targetField: 'tags',
        dataType: 'array',
        required: false,
        defaultValue: []
      },
      {
        sourceField: 'featured',
        targetField: 'is_featured',
        dataType: 'boolean',
        required: false,
        defaultValue: false
      }
    ],

    /**
     * Create mapping for users from CSV
     */
    users: (): FieldMapping[] => [
      {
        sourceField: 'name',
        targetField: 'full_name',
        dataType: 'string',
        required: true,
        fallbackGenerator: () => `User ${Math.floor(Math.random() * 10000)}`
      },
      {
        sourceField: 'email',
        targetField: 'email',
        dataType: 'string',
        required: true,
        validator: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        fallbackGenerator: () => `user${Date.now()}@example.com`
      },
      {
        sourceField: 'role',
        targetField: 'role',
        dataType: 'string',
        required: false,
        defaultValue: 'user'
      },
      {
        sourceField: 'active',
        targetField: 'is_active',
        dataType: 'boolean',
        required: false,
        defaultValue: true
      }
    ],

    /**
     * Create mapping for products
     */
    products: (): FieldMapping[] => [
      {
        sourceField: 'name',
        targetField: 'name',
        dataType: 'string',
        required: true,
        fallbackGenerator: () => `Product ${Date.now()}`
      },
      {
        sourceField: 'description',
        targetField: 'description',
        dataType: 'string',
        required: false
      },
      {
        sourceField: 'price',
        targetField: 'price',
        dataType: 'number',
        required: true,
        validator: (value) => typeof value === 'number' && value >= 0,
        fallbackGenerator: () => Math.floor(Math.random() * 100) + 1
      },
      {
        sourceField: 'category',
        targetField: 'category',
        dataType: 'string',
        required: false,
        defaultValue: 'uncategorized'
      },
      {
        sourceField: 'available',
        targetField: 'is_available',
        dataType: 'boolean',
        required: false,
        defaultValue: true
      }
    ],

    /**
     * Create mapping for generic content
     */
    content: (): FieldMapping[] => [
      {
        sourceField: 'title',
        targetField: 'title',
        dataType: 'string',
        required: true,
        fallbackGenerator: () => `Content ${Date.now()}`
      },
      {
        sourceField: '$content',
        targetField: 'body',
        dataType: 'string',
        required: false
      },
      {
        sourceField: '$type',
        targetField: 'content_type',
        dataType: 'string',
        required: false
      },
      {
        sourceField: '$lastmodified',
        targetField: 'updated_at',
        dataType: 'date',
        required: false,
        transformer: (value) => value || new Date()
      }
    ]
  };

  /**
   * Create common transformers for field values
   */
  static createTransformers = {
    /**
     * Slugify a string for URL-safe identifiers
     */
    slugify: (value: any) => {
      return String(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    },

    /**
     * Truncate text to specified length
     */
    truncate: (maxLength: number) => (value: any) => {
      const str = String(value);
      return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
    },

    /**
     * Extract first N words
     */
    firstWords: (count: number) => (value: any) => {
      return String(value).split(/\s+/).slice(0, count).join(' ');
    },

    /**
     * Format date to ISO string
     */
    toISOString: (value: any) => {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date.toISOString();
    },

    /**
     * Clean HTML tags from text
     */
    stripHtml: (value: any) => {
      return String(value).replace(/<[^>]*>/g, '');
    },

    /**
     * Convert markdown to plain text (simple)
     */
    markdownToText: (value: any) => {
      return String(value)
        .replace(/#+\s/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
        .replace(/`(.*?)`/g, '$1'); // Remove code
    }
  };

  /**
   * Validate mapping configuration
   */
  static validateMappingConfig(config: MappingConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.tableName || config.tableName.trim() === '') {
      errors.push('Table name is required');
    }

    if (!config.mappings || config.mappings.length === 0) {
      errors.push('At least one field mapping is required');
    }

    const targetFields = new Set<string>();
    for (const mapping of config.mappings || []) {
      // Check for duplicate target fields
      if (targetFields.has(mapping.targetField)) {
        errors.push(`Duplicate target field: ${mapping.targetField}`);
      }
      targetFields.add(mapping.targetField);

      // Validate source field
      if (!mapping.sourceField) {
        errors.push(`Source field is required for target: ${mapping.targetField}`);
      }

      // Validate data type
      if (!['string', 'number', 'boolean', 'date', 'json', 'array'].includes(mapping.dataType)) {
        errors.push(`Invalid data type '${mapping.dataType}' for field: ${mapping.targetField}`);
      }

      // Warn about required fields without fallbacks
      if (mapping.required && !mapping.fallbackGenerator && mapping.defaultValue === undefined) {
        warnings.push(`Required field '${mapping.targetField}' has no fallback or default value`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}