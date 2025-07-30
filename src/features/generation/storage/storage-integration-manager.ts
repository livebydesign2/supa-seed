/**
 * Storage Integration Manager
 * Handles Supabase Storage operations, file uploads, and media record management
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import { ImageGenerator } from './image-generator';
import {
  StorageConfig,
  StorageUploadResult,
  StorageBatchUploadResult,
  MediaAttachment,
  StoragePermissionCheck,
  StorageQuotaInfo,
  StorageIntegrationResult,
  ImageGenerationOptions,
  GeneratedImage,
  RLSPolicy,
  DEFAULT_STORAGE_CONFIG,
  DOMAIN_CONFIGURATIONS,
  STORAGE_RLS_TEMPLATES,
  BUCKET_NAMING
} from './storage-types';

type SupabaseClient = ReturnType<typeof createClient>;

export class StorageIntegrationManager {
  private client: SupabaseClient;
  private imageGenerator: ImageGenerator;
  private config: StorageConfig;
  private uploadQueue: Map<string, Promise<StorageUploadResult>> = new Map();

  constructor(client: SupabaseClient, config: Partial<StorageConfig> = {}) {
    this.client = client;
    this.config = { ...DEFAULT_STORAGE_CONFIG, ...config };
    this.imageGenerator = new ImageGenerator();
  }

  /**
   * Main method to seed storage files for a setup
   */
  async seedWithStorageFiles(
    setupId: string,
    accountId?: string,
    customConfig?: Partial<StorageConfig>
  ): Promise<StorageIntegrationResult> {
    const startTime = Date.now();
    Logger.info(`🗂️  Starting storage integration for setup: ${setupId}`);

    const effectiveConfig = { ...this.config, ...customConfig };
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalSize = 0;

    try {
      // Check storage permissions
      const permissionCheck = await this.checkStoragePermissions(effectiveConfig.bucketName);
      if (!permissionCheck.canWrite) {
        throw new Error(`No write permission for bucket: ${effectiveConfig.bucketName}`);
      }

      if (permissionCheck.restrictions.length > 0) {
        warnings.push(...permissionCheck.restrictions);
      }

      // Check storage quota
      const quotaInfo = await this.getStorageQuota(effectiveConfig.bucketName);
      if (quotaInfo.isNearLimit) {
        warnings.push(`Storage bucket is ${quotaInfo.usagePercentage.toFixed(1)}% full`);
      }

      // Generate images
      const imageOptions: ImageGenerationOptions = {
        domain: effectiveConfig.domain,
        categories: effectiveConfig.categories,
        count: effectiveConfig.imagesPerSetup,
        dimensions: { width: 1024, height: 768 },
        quality: 'medium',
        searchTerms: [],
        fallbackToMock: !effectiveConfig.enableRealImages,
        rateLimitDelay: 1000,
        maxRetries: 3
      };

      const images = await this.imageGenerator.generateImages(imageOptions);
      Logger.info(`🖼️  Generated ${images.length} images for upload`);

      // Upload images and create media attachments
      const mediaAttachments: MediaAttachment[] = [];
      let uploadedCount = 0;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        try {
          const uploadResult = await this.uploadImageToStorage(
            image,
            setupId,
            accountId,
            effectiveConfig,
            i
          );

          if (uploadResult.success && uploadResult.mediaAttachment) {
            mediaAttachments.push(uploadResult.mediaAttachment);
            uploadedCount++;
            totalSize += uploadResult.metadata.originalSize;
            
            Logger.debug(`✅ Uploaded: ${image.filename} (${this.formatFileSize(uploadResult.metadata.originalSize)})`);
          } else {
            errors.push(`Failed to upload ${image.filename}: ${uploadResult.error}`);
            warnings.push(...uploadResult.warnings);
          }

        } catch (uploadError: any) {
          errors.push(`Upload error for ${image.filename}: ${uploadError.message}`);
          Logger.warn(`❌ Upload failed: ${image.filename}`, uploadError.message);
        }
      }

      // Get final bucket info
      const finalQuotaInfo = await this.getStorageQuota(effectiveConfig.bucketName);

      const result: StorageIntegrationResult = {
        success: errors.length === 0,
        setupId,
        mediaAttachments,
        totalFilesProcessed: images.length,
        totalFilesUploaded: uploadedCount,
        totalSize,
        executionTime: Date.now() - startTime,
        errors,
        warnings,
        bucketInfo: {
          bucketName: effectiveConfig.bucketName,
          finalUsage: finalQuotaInfo.currentUsage,
          filesAdded: uploadedCount
        },
        recommendations: [
          ...permissionCheck.recommendations,
          ...quotaInfo.recommendations,
          `Successfully uploaded ${uploadedCount}/${images.length} files`,
          `Total storage used: ${this.formatFileSize(totalSize)}`
        ]
      };

      if (result.success) {
        Logger.success(`🗂️  Storage integration completed: ${uploadedCount} files uploaded`);
      } else {
        Logger.warn(`🗂️  Storage integration completed with ${errors.length} errors`);
      }

      return result;

    } catch (error: any) {
      Logger.error('Storage integration failed:', error);
      
      return {
        success: false,
        setupId,
        mediaAttachments: [],
        totalFilesProcessed: 0,
        totalFilesUploaded: 0,
        totalSize: 0,
        executionTime: Date.now() - startTime,
        errors: [error.message],
        warnings,
        bucketInfo: {
          bucketName: effectiveConfig.bucketName,
          finalUsage: 0,
          filesAdded: 0
        },
        recommendations: ['Check storage permissions and configuration']
      };
    }
  }

  /**
   * Upload a single image to storage
   */
  private async uploadImageToStorage(
    image: GeneratedImage,
    setupId: string,
    accountId: string | undefined,
    config: StorageConfig,
    index: number
  ): Promise<StorageUploadResult> {
    const startTime = Date.now();

    try {
      // Generate file path
      const fileExtension = this.getFileExtension(image.type);
      const timestamp = Date.now();
      const fileName = `${setupId}_${index}_${timestamp}${fileExtension}`;
      const filePath = `${config.storageRootPath}/${setupId}/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.client.storage
        .from(config.bucketName)
        .upload(filePath, image.blob, {
          contentType: image.type,
          upsert: false,
          cacheControl: '3600' // 1 hour cache
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL if not RLS protected
      let publicUrl: string | undefined;
      if (!config.respectRLS) {
        const { data: urlData } = this.client.storage
          .from(config.bucketName)
          .getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      // Create media attachment record
      const mediaAttachment: MediaAttachment = {
        id: this.generateId(),
        setup_id: setupId,
        account_id: accountId,
        file_path: filePath,
        file_name: fileName,
        file_type: image.type,
        file_size: image.size,
        alt_text: image.altText,
        description: image.description,
        storage_bucket: config.bucketName,
        is_public: !config.respectRLS,
        upload_status: 'completed',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          originalName: image.filename,
          dimensions: image.dimensions,
          format: image.type,
          quality: 'medium',
          source: image.metadata.source,
          uploadedBy: 'supa-seed',
          processingSteps: ['upload'],
          checksums: {
            // Would calculate in production
          },
          exifData: {}
        }
      };

      // Insert media attachment record into database
      const { data: dbData, error: dbError } = await this.client
        .from('media_attachments')
        .insert(mediaAttachment as any)
        .select()
        .single();

      if (dbError) {
        // If database insert fails, clean up uploaded file
        await this.client.storage
          .from(config.bucketName)
          .remove([filePath]);
        
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        mediaAttachment: (dbData as unknown as MediaAttachment) || mediaAttachment,
        filePath,
        publicUrl,
        warnings: [],
        uploadTime: executionTime,
        metadata: {
          originalSize: image.size,
          uploadSpeed: image.size / (executionTime / 1000),
          bucketUsage: 0 // Would calculate in production
        }
      };

    } catch (error: any) {
      Logger.error(`Upload failed for ${image.filename}:`, error);
      
      return {
        success: false,
        error: error.message,
        warnings: [],
        uploadTime: Date.now() - startTime,
        metadata: {
          originalSize: image.size,
          uploadSpeed: 0,
          bucketUsage: 0
        }
      };
    }
  }

  /**
   * Check storage permissions and RLS policies
   */
  async checkStoragePermissions(bucketName: string): Promise<StoragePermissionCheck> {
    Logger.debug(`🔒 Checking storage permissions for bucket: ${bucketName}`);

    try {
      // Test bucket access by attempting to list files
      const { data: listData, error: listError } = await this.client.storage
        .from(bucketName)
        .list('', { limit: 1 });

      const canRead = !listError;

      // Test write permissions by attempting a small upload
      let canWrite = false;
      const testFileName = `test-${Date.now()}.txt`;
      const testBlob = new Blob(['test'], { type: 'text/plain' });

      const { data: uploadData, error: uploadError } = await this.client.storage
        .from(bucketName)
        .upload(testFileName, testBlob);

      if (!uploadError) {
        canWrite = true;
        // Clean up test file
        await this.client.storage
          .from(bucketName)
          .remove([testFileName]);
      }

      // Get RLS policies
      const rlsPolicies = await this.getRLSPolicies(bucketName);

      // Determine permission level
      let permissionLevel: 'none' | 'read' | 'write' | 'admin' = 'none';
      if (canWrite) permissionLevel = 'write';
      else if (canRead) permissionLevel = 'read';

      const restrictions: string[] = [];
      const recommendations: string[] = [];

      if (!canRead) {
        restrictions.push('No read access to storage bucket');
        recommendations.push('Verify bucket exists and user has read permissions');
      }

      if (!canWrite) {
        restrictions.push('No write access to storage bucket');
        recommendations.push('Verify user has write permissions for storage bucket');
      }

      if (rlsPolicies.length > 0) {
        recommendations.push(`${rlsPolicies.length} RLS policies detected - ensure compliance`);
      }

      return {
        canRead,
        canWrite,
        canDelete: canWrite, // Assume delete permission follows write
        rlsPolicies,
        permissionLevel,
        restrictions,
        recommendations
      };

    } catch (error: any) {
      Logger.error('Storage permission check failed:', error);
      
      return {
        canRead: false,
        canWrite: false,
        canDelete: false,
        rlsPolicies: [],
        permissionLevel: 'none',
        restrictions: ['Permission check failed'],
        recommendations: ['Verify storage configuration and credentials']
      };
    }
  }

  /**
   * Get RLS policies affecting storage
   */
  private async getRLSPolicies(bucketName: string): Promise<RLSPolicy[]> {
    try {
      // Query for RLS policies on storage-related tables
      const { data: policies, error } = await this.client
        .from('pg_policies')
        .select('*')
        .or('tablename.eq.objects,tablename.eq.buckets');

      if (error || !policies) {
        return [];
      }

      return policies.map((policy: any) => ({
        name: policy.policyname,
        table: policy.tablename,
        policy_type: policy.cmd?.toLowerCase() || 'select',
        definition: policy.qual || '',
        enabled: true,
        affects_storage: true
      }));

    } catch (error: any) {
      Logger.warn('Failed to retrieve RLS policies:', error.message);
      return [];
    }
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(bucketName: string): Promise<StorageQuotaInfo> {
    Logger.debug(`📊 Checking storage quota for bucket: ${bucketName}`);

    try {
      // List all files to calculate usage
      const { data: files, error } = await this.client.storage
        .from(bucketName)
        .list('', { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      let currentUsage = 0;
      let filesCount = 0;

      if (files) {
        for (const file of files) {
          if (file.metadata?.size) {
            currentUsage += file.metadata.size;
          }
          filesCount++;
        }
      }

      // Default quota (in practice, this would come from Supabase project settings)
      const totalQuota = 1024 * 1024 * 1024 * 2; // 2GB default
      const usagePercentage = (currentUsage / totalQuota) * 100;
      const isNearLimit = usagePercentage > 80;

      const recommendations: string[] = [];
      if (isNearLimit) {
        recommendations.push('Storage usage is high - consider cleaning up old files');
        recommendations.push('Monitor storage usage regularly');
      }

      if (filesCount > 500) {
        recommendations.push('Large number of files - consider organizing in folders');
      }

      return {
        bucketName,
        currentUsage,
        totalQuota,
        filesCount,
        usagePercentage,
        isNearLimit,
        projectedFullDate: isNearLimit ? this.calculateProjectedFullDate(currentUsage, totalQuota) : undefined,
        recommendations
      };

    } catch (error: any) {
      Logger.warn('Storage quota check failed:', error.message);
      
      return {
        bucketName,
        currentUsage: 0,
        totalQuota: 0,
        filesCount: 0,
        usagePercentage: 0,
        isNearLimit: false,
        recommendations: ['Unable to check storage quota']
      };
    }
  }

  /**
   * Batch upload multiple files
   */
  async batchUpload(
    files: GeneratedImage[],
    setupId: string,
    accountId?: string,
    config?: Partial<StorageConfig>
  ): Promise<StorageBatchUploadResult> {
    const startTime = Date.now();
    const effectiveConfig = { ...this.config, ...config };
    
    Logger.info(`📤 Starting batch upload of ${files.length} files`);

    const mediaAttachments: MediaAttachment[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let successfulUploads = 0;
    let totalSize = 0;

    // Process uploads in parallel with concurrency limit
    const concurrency = 3;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map((file, index) => 
        this.uploadImageToStorage(file, setupId, accountId, effectiveConfig, index)
      );

      const results = await Promise.allSettled(promises);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const uploadResult = result.value;
          
          if (uploadResult.success && uploadResult.mediaAttachment) {
            mediaAttachments.push(uploadResult.mediaAttachment);
            successfulUploads++;
            totalSize += uploadResult.metadata.originalSize;
          } else {
            errors.push(uploadResult.error || 'Unknown upload error');
            warnings.push(...uploadResult.warnings);
          }
        } else {
          errors.push(`Upload failed: ${result.reason}`);
        }
      }
    }

    const bucketInfo = await this.getStorageQuota(effectiveConfig.bucketName);

    return {
      success: errors.length === 0,
      totalFiles: files.length,
      successfulUploads,
      failedUploads: files.length - successfulUploads,
      mediaAttachments,
      errors,
      warnings,
      executionTime: Date.now() - startTime,
      totalSize,
      bucketInfo: {
        bucketName: effectiveConfig.bucketName,
        usageAfterUpload: bucketInfo.currentUsage,
        filesCount: bucketInfo.filesCount,
        remainingQuota: bucketInfo.totalQuota - bucketInfo.currentUsage
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<StorageConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.debug('Storage configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig {
    return { ...this.config };
  }

  /**
   * Get domain-specific configuration
   */
  static getDomainConfig(domain: string): Partial<StorageConfig> {
    return DOMAIN_CONFIGURATIONS[domain] || DOMAIN_CONFIGURATIONS.general;
  }

  /**
   * Utility methods
   */
  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/svg+xml': '.svg'
    };
    return extensions[mimeType] || '.jpg';
  }

  private generateId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private calculateProjectedFullDate(currentUsage: number, totalQuota: number): string {
    // Simple projection based on current usage (would be more sophisticated in production)
    const remainingSpace = totalQuota - currentUsage;
    const daysRemaining = Math.floor(remainingSpace / (currentUsage / 30)); // Assume 30-day growth cycle
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + daysRemaining);
    return projectedDate.toISOString().split('T')[0];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.imageGenerator.clearCache();
    this.uploadQueue.clear();
    Logger.debug('Storage integration manager cleaned up');
  }
}