/**
 * Basic File System Asset Loading
 * Phase 1, Checkpoint A3 - Foundation for hybrid seeding
 */

import { glob } from 'glob';
import { readFile, stat } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import path from 'path';
import { Logger } from '../../core/utils/logger';

export interface AssetMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  author?: string;
  date?: string;
  featured?: boolean;
  [key: string]: any;
}

export interface LoadedAsset {
  id: string;
  filePath: string;
  type: 'markdown' | 'json' | 'image' | 'csv';
  content?: string;
  metadata: AssetMetadata;
  fileSize: number;
  lastModified: Date;
  isValid: boolean;
  validationErrors?: string[];
}

export interface AssetLoadOptions {
  patterns: string[];
  baseDirectory?: string;
  includeContent?: boolean;
  validateSchema?: boolean;
  maxFileSize?: number;
  allowedExtensions?: string[];
}

export interface AssetLoadResult {
  assets: LoadedAsset[];
  errors: Array<{
    filePath: string;
    error: string;
  }>;
  totalFiles: number;
  successCount: number;
  errorCount: number;
}

export class AssetLoader {
  private defaultOptions: Partial<AssetLoadOptions> = {
    includeContent: true,
    validateSchema: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.md', '.markdown', '.json', '.csv', '.jpg', '.jpeg', '.png', '.gif', '.webp']
  };

  /**
   * Load assets from file system using glob patterns
   */
  async loadAssets(options: AssetLoadOptions): Promise<AssetLoadResult> {
    const opts = { ...this.defaultOptions, ...options };
    const baseDir = opts.baseDirectory || process.cwd();
    const errors: Array<{ filePath: string; error: string }> = [];
    const assets: LoadedAsset[] = [];

    Logger.info(`📁 Loading assets from ${baseDir} with patterns: ${opts.patterns.join(', ')}`);

    try {
      // Find all files matching patterns
      const allFiles: string[] = [];
      for (const pattern of opts.patterns) {
        const fullPattern = path.resolve(baseDir, pattern);
        const matchingFiles = await glob(fullPattern, { nodir: true });
        allFiles.push(...matchingFiles);
      }

      // Remove duplicates
      const uniqueFiles = [...new Set(allFiles)];
      Logger.info(`🔍 Found ${uniqueFiles.length} potential asset files`);

      // Process each file
      for (const filePath of uniqueFiles) {
        try {
          // Check file extension
          const ext = path.extname(filePath).toLowerCase();
          if (opts.allowedExtensions && !opts.allowedExtensions.includes(ext)) {
            errors.push({ filePath, error: `Unsupported file extension: ${ext}` });
            continue;
          }

          // Check file size
          const stats = await stat(filePath);
          if (opts.maxFileSize && stats.size > opts.maxFileSize) {
            errors.push({ 
              filePath, 
              error: `File too large: ${stats.size} bytes > ${opts.maxFileSize} bytes` 
            });
            continue;
          }

          // Load asset based on type
          const asset = await this.loadSingleAsset(filePath, stats, opts);
          if (asset) {
            assets.push(asset);
          }
        } catch (error: any) {
          errors.push({ filePath, error: error.message });
          Logger.warn(`⚠️  Failed to load asset ${filePath}: ${error.message}`);
        }
      }

      Logger.info(`✅ Loaded ${assets.length}/${uniqueFiles.length} assets successfully`);

      return {
        assets,
        errors,
        totalFiles: uniqueFiles.length,
        successCount: assets.length,
        errorCount: errors.length
      };

    } catch (error: any) {
      Logger.error('Asset loading failed:', error);
      throw new Error(`Asset loading failed: ${error.message}`);
    }
  }

  /**
   * Load a single asset file
   */
  private async loadSingleAsset(
    filePath: string, 
    stats: any, 
    options: AssetLoadOptions & typeof this.defaultOptions
  ): Promise<LoadedAsset | null> {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath, ext);
    const id = this.generateAssetId(filePath);

    let type: 'markdown' | 'json' | 'image' | 'csv';
    let content: string | undefined;
    let metadata: AssetMetadata = {};
    let isValid = true;
    let validationErrors: string[] = [];

    // Determine asset type
    if (['.md', '.markdown'].includes(ext)) {
      type = 'markdown';
    } else if (ext === '.json') {
      type = 'json';
    } else if (ext === '.csv') {
      type = 'csv';
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      type = 'image';
    } else {
      return null; // Skip unsupported files
    }

    try {
      let rawContent: string | undefined;

      // Always read content for metadata parsing (except images)
      if (type !== 'image') {
        rawContent = await readFile(filePath, 'utf-8');
      }

      // Parse metadata based on type
      switch (type) {
        case 'markdown':
          const markdownResult = this.parseMarkdownWithFrontmatter(rawContent || '');
          metadata = markdownResult.metadata;
          // Only include parsed content if requested
          content = options.includeContent ? markdownResult.content : undefined;
          if (options.validateSchema) {
            const validation = this.validateMarkdownAsset(metadata, markdownResult.content);
            isValid = validation.isValid;
            validationErrors = validation.errors;
          }
          break;

        case 'json':
          try {
            const jsonData = JSON.parse(rawContent || '{}');
            metadata = this.extractJsonMetadata(jsonData);
            // Only include raw content if requested
            content = options.includeContent ? rawContent : undefined;
            if (options.validateSchema) {
              const validation = this.validateJsonAsset(jsonData);
              isValid = validation.isValid;
              validationErrors = validation.errors;
            }
          } catch (error: any) {
            isValid = false;
            validationErrors.push(`Invalid JSON: ${error.message}`);
          }
          break;

        case 'csv':
          try {
            const csvData = this.parseCsvData(rawContent || '');
            metadata = this.extractCsvMetadata(csvData, rawContent || '');
            // Only include raw content if requested
            content = options.includeContent ? rawContent : undefined;
            if (options.validateSchema) {
              const validation = this.validateCsvAsset(csvData, rawContent || '');
              isValid = validation.isValid;
              validationErrors = validation.errors;
            }
          } catch (error: any) {
            isValid = false;
            validationErrors.push(`Invalid CSV: ${error.message}`);
          }
          break;

        case 'image':
          metadata = await this.extractImageMetadata(filePath, stats);
          content = undefined; // Images never have text content
          if (options.validateSchema) {
            const validation = this.validateImageAsset(metadata);
            isValid = validation.isValid;
            validationErrors = validation.errors;
          }
          break;
      }

      // Add common metadata
      metadata.filename = filename;
      metadata.extension = ext;
      metadata.path = filePath;

      return {
        id,
        filePath,
        type,
        content,
        metadata,
        fileSize: stats.size,
        lastModified: new Date(stats.mtime),
        isValid,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error: any) {
      Logger.warn(`Failed to process ${type} asset ${filePath}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse markdown file with frontmatter
   */
  private parseMarkdownWithFrontmatter(content: string): {
    metadata: AssetMetadata;
    content: string;
  } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (match) {
      try {
        const frontmatter = parseYaml(match[1]) || {};
        return {
          metadata: frontmatter,
          content: match[2].trim()
        };
      } catch (error: any) {
        Logger.warn(`Failed to parse frontmatter: ${error.message}`);
        return { metadata: {}, content };
      }
    }

    return { metadata: {}, content };
  }

  /**
   * Extract metadata from JSON data
   */
  private extractJsonMetadata(data: any): AssetMetadata {
    const metadata: AssetMetadata = {};

    // Common metadata fields
    const metadataFields = ['title', 'description', 'tags', 'category', 'author', 'date', 'featured'];
    
    for (const field of metadataFields) {
      if (data[field] !== undefined) {
        metadata[field] = data[field];
      }
    }

    // If data has a metadata object, merge it
    if (data.metadata && typeof data.metadata === 'object') {
      Object.assign(metadata, data.metadata);
    }

    return metadata;
  }

  /**
   * Extract metadata from image files
   */
  private async extractImageMetadata(filePath: string, stats: any): Promise<AssetMetadata> {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);
    
    return {
      filename: path.basename(filePath, ext),
      extension: ext,
      mimeType: this.getMimeType(ext),
      width: undefined, // Would need image processing library for actual dimensions
      height: undefined,
      aspectRatio: undefined,
      fileSize: stats.size,
      lastModified: stats.mtime
    };
  }

  /**
   * Validate markdown asset
   */
  private validateMarkdownAsset(metadata: AssetMetadata, content: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Basic validation rules
    if (!content || content.trim().length === 0) {
      errors.push('Markdown content is empty');
    }

    if (content.length < 10) {
      errors.push('Markdown content is too short (minimum 10 characters)');
    }

    if (metadata.tags && !Array.isArray(metadata.tags)) {
      errors.push('Tags must be an array');
    }

    if (metadata.date && isNaN(Date.parse(metadata.date))) {
      errors.push('Invalid date format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JSON asset
   */
  private validateJsonAsset(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (data === null || data === undefined) {
      errors.push('JSON data is null or undefined');
    }

    if (typeof data !== 'object') {
      errors.push('JSON root must be an object');
    }

    // Additional JSON-specific validation can be added here

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate image asset
   */
  private validateImageAsset(metadata: AssetMetadata): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!metadata.mimeType) {
      errors.push('Missing MIME type');
    }

    if (metadata.fileSize && metadata.fileSize < 50) {
      errors.push('Image file too small (possible corruption)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique asset ID from file path
   */
  private generateAssetId(filePath: string): string {
    return Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.md': 'text/markdown',
      '.markdown': 'text/markdown',
      '.json': 'application/json',
      '.csv': 'text/csv'
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Parse CSV data into structured format
   */
  private parseCsvData(content: string): any[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return [];
    }

    // Simple CSV parser - assumes comma separation and no nested quotes
    const headers = this.parseCsvLine(lines[0]);
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === headers.length) {
        const row: any = {};
        headers.forEach((header, index) => {
          row[header.trim()] = values[index]?.trim() || '';
        });
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Parse a single CSV line
   */
  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Extract metadata from CSV data
   */
  private extractCsvMetadata(data: any[], rawContent: string): AssetMetadata {
    const metadata: AssetMetadata = {};
    
    // Basic CSV statistics
    metadata.rowCount = data.length;
    metadata.columns = data.length > 0 ? Object.keys(data[0]) : [];
    metadata.columnCount = metadata.columns.length;
    
    // Try to detect content type from column names
    const columnNames = (metadata.columns as string[]).map(col => col.toLowerCase());
    
    if (columnNames.includes('title') || columnNames.includes('name')) {
      metadata.contentType = 'structured_data';
    }
    
    if (columnNames.includes('email') || columnNames.includes('user')) {
      metadata.dataType = 'users';
    } else if (columnNames.some(col => col.includes('product')) || columnNames.includes('item')) {
      metadata.dataType = 'products';
    } else if (columnNames.includes('post') || columnNames.includes('article')) {
      metadata.dataType = 'content';
    } else {
      metadata.dataType = 'generic';
    }

    // Sample first few rows for preview
    metadata.sampleRows = data.slice(0, 3);
    
    return metadata;
  }

  /**
   * Validate CSV asset
   */
  private validateCsvAsset(data: any[], rawContent: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!rawContent || rawContent.trim().length === 0) {
      errors.push('CSV content is empty');
    }

    if (data.length === 0) {
      errors.push('No valid CSV rows found');
    }

    // Check for consistent column count
    if (data.length > 0) {
      const expectedColumns = Object.keys(data[0]).length;
      for (let i = 0; i < data.length; i++) {
        if (Object.keys(data[i]).length !== expectedColumns) {
          errors.push(`Row ${i + 1} has inconsistent column count`);
          break; // Only report first inconsistency
        }
      }
    }

    // Check for minimum rows
    if (data.length < 1) {
      errors.push('CSV must have at least 1 data row');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get asset loading statistics
   */
  static getLoadingStats(result: AssetLoadResult): {
    successRate: number;
    avgFileSize: number;
    typeDistribution: Record<string, number>;
    validationRate: number;
  } {
    const successRate = result.totalFiles > 0 ? (result.successCount / result.totalFiles) * 100 : 0;
    const avgFileSize = result.assets.length > 0 
      ? result.assets.reduce((sum, asset) => sum + asset.fileSize, 0) / result.assets.length 
      : 0;

    const typeDistribution: Record<string, number> = {};
    result.assets.forEach(asset => {
      typeDistribution[asset.type] = (typeDistribution[asset.type] || 0) + 1;
    });

    const validAssets = result.assets.filter(asset => asset.isValid).length;
    const validationRate = result.assets.length > 0 ? (validAssets / result.assets.length) * 100 : 0;

    return {
      successRate,
      avgFileSize,
      typeDistribution,
      validationRate
    };
  }
}