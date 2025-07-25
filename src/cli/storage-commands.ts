/**
 * CLI Commands for Storage Integration System
 */

import type { createClient } from '@supabase/supabase-js';
import { FrameworkAdapter } from '../framework/framework-adapter';
import { StorageIntegrationManager } from '../storage/storage-integration-manager';
import { createEnhancedSupabaseClient } from '../utils/enhanced-supabase-client';
import { Logger } from '../utils/logger';
import { StorageConfigUtils } from '../config/storage-config';
import type { StorageConfig } from '../storage/storage-types';

export interface StorageCommandOptions {
  url?: string;
  key?: string;
  verbose?: boolean;
  framework?: string;
  bucket?: string;
  setupId?: string;
  accountId?: string;
  domain?: string;
  count?: number;
  enableRealImages?: boolean;
}

export class StorageCommands {
  
  /**
   * Format file size in human readable format
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Test storage permissions and connectivity
   */
  static async testStorage(options: StorageCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🔍 Testing storage connectivity and permissions...\n');

      // Initialize framework adapter to get proper configuration
      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false,
        frameworkOverride: options.framework
      });

      await adapter.initialize();
      const strategy = adapter.getCurrentStrategy();

      // Get storage configuration
      const storageConfig = strategy?.getStorageConfig?.() || StorageConfigUtils.getFrameworkConfig('generic').config;
      const bucketName = options.bucket || storageConfig.bucketName || 'media';

      console.log('📋 Storage Test Configuration:');
      console.log(`   Framework: ${strategy?.name || 'generic'}`);
      console.log(`   Bucket: ${bucketName}`);
      console.log(`   Domain: ${storageConfig.domain || 'general'}`);
      console.log(`   RLS Enabled: ${storageConfig.respectRLS ? '✅' : '❌'}`);

      // Initialize storage manager
      const storageManager = new StorageIntegrationManager(client, { 
        ...storageConfig, 
        bucketName 
      });

      // Test permissions
      console.log('\n🔒 Testing storage permissions...');
      const permissionCheck = await storageManager.checkStoragePermissions(bucketName);
      
      console.log(`   Read Access: ${permissionCheck.canRead ? '✅' : '❌'}`);
      console.log(`   Write Access: ${permissionCheck.canWrite ? '✅' : '❌'}`);
      console.log(`   Delete Access: ${permissionCheck.canDelete ? '✅' : '❌'}`);
      console.log(`   Permission Level: ${permissionCheck.permissionLevel}`);

      if (permissionCheck.rlsPolicies.length > 0) {
        console.log(`   RLS Policies: ${permissionCheck.rlsPolicies.length} detected`);
        
        if (options.verbose) {
          console.log('\n   📋 RLS Policies:');
          permissionCheck.rlsPolicies.forEach(policy => {
            console.log(`     • ${policy.name} (${policy.policy_type})`);
          });
        }
      }

      if (permissionCheck.restrictions.length > 0) {
        console.log('\n   ⚠️  Restrictions:');
        permissionCheck.restrictions.forEach(restriction => {
          console.log(`     • ${restriction}`);
        });
      }

      // Test quota
      console.log('\n📊 Checking storage quota...');
      const quotaInfo = await storageManager.getStorageQuota(bucketName);
      
      console.log(`   Current Usage: ${StorageCommands.formatFileSize(quotaInfo.currentUsage)}`);
      console.log(`   Total Quota: ${StorageCommands.formatFileSize(quotaInfo.totalQuota)}`);
      console.log(`   Usage Percentage: ${quotaInfo.usagePercentage.toFixed(1)}%`);
      console.log(`   Files Count: ${quotaInfo.filesCount}`);
      console.log(`   Near Limit: ${quotaInfo.isNearLimit ? '⚠️  Yes' : '✅ No'}`);

      // Show recommendations
      const allRecommendations = [
        ...permissionCheck.recommendations,
        ...quotaInfo.recommendations
      ];

      if (allRecommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        [...new Set(allRecommendations)].forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }

      console.log('\n✅ Storage test completed');

    } catch (error: any) {
      console.error('❌ Storage test failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Generate and upload test media files
   */
  static async generateMedia(options: StorageCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      const setupId = options.setupId || `test-setup-${Date.now()}`;
      const count = options.count || 3;
      
      console.log(`🖼️  Generating ${count} media files for setup: ${setupId}\n`);

      // Initialize framework adapter
      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false,
        frameworkOverride: options.framework
      });

      await adapter.initialize();
      const strategy = adapter.getCurrentStrategy();

      if (!strategy) {
        throw new Error('No strategy available for media generation');
      }

      // Check if strategy supports storage
      if (!strategy.integrateWithStorage) {
        throw new Error(`Strategy ${strategy.name} does not support storage integration`);
      }

      // Prepare custom configuration
      const customConfig: Partial<StorageConfig> = {
        imagesPerSetup: count
      };

      if (options.domain) {
        customConfig.domain = options.domain;
      }

      if (options.bucket) {
        customConfig.bucketName = options.bucket;
      }

      if (options.enableRealImages !== undefined) {
        customConfig.enableRealImages = options.enableRealImages;
      }

      console.log('📋 Media Generation Configuration:');
      console.log(`   Framework: ${strategy.name}`);
      console.log(`   Setup ID: ${setupId}`);
      console.log(`   Account ID: ${options.accountId || 'none'}`);
      console.log(`   Images Count: ${count}`);
      console.log(`   Real Images: ${customConfig.enableRealImages ? '✅' : '❌'}`);
      console.log(`   Domain: ${customConfig.domain || 'default'}`);

      // Execute storage integration
      console.log('\n🚀 Starting media generation...');
      const result = await strategy.integrateWithStorage(
        setupId,
        options.accountId,
        customConfig
      );

      // Display results
      console.log(`\n📊 Media Generation Results:`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Files Processed: ${result.totalFilesProcessed}`);
      console.log(`   Files Uploaded: ${result.totalFilesUploaded}`);
      console.log(`   Total Size: ${StorageCommands.formatFileSize(result.totalSize)}`);
      console.log(`   Execution Time: ${result.executionTime}ms`);

      if (result.mediaAttachments.length > 0) {
        console.log(`\n📎 Generated Media Attachments:`);
        result.mediaAttachments.forEach((attachment, index) => {
          console.log(`   ${index + 1}. ${attachment.file_name}`);
          console.log(`      Type: ${attachment.file_type}`);
          console.log(`      Size: ${StorageCommands.formatFileSize(attachment.file_size)}`);
          console.log(`      Path: ${attachment.file_path}`);
          if (options.verbose) {
            console.log(`      Alt Text: ${attachment.alt_text}`);
            console.log(`      Description: ${attachment.description}`);
          }
        });
      }

      if (result.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }

      console.log('\n✅ Media generation completed');

    } catch (error: any) {
      console.error('❌ Media generation failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Show storage configuration for a framework
   */
  static async showConfig(options: StorageCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('⚙️  Storage Configuration Analysis\n');

      // Initialize framework adapter
      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false,
        frameworkOverride: options.framework
      });

      await adapter.initialize();
      const strategy = adapter.getCurrentStrategy();
      const frameworkName = strategy?.name || 'generic';

      console.log(`📋 Framework: ${frameworkName}`);

      // Get framework-specific storage configuration
      const frameworkConfig = StorageConfigUtils.getFrameworkConfig(frameworkName);
      const mergedConfig = StorageConfigUtils.getMergedConfig(frameworkName);
      const envConfig = StorageConfigUtils.getEnvironmentConfig();

      console.log('\n🏗️  Framework Storage Configuration:');
      console.log(`   Bucket Name: ${frameworkConfig.config.bucketName}`);
      console.log(`   Domain: ${frameworkConfig.config.domain}`);
      console.log(`   Bucket Strategy: ${frameworkConfig.bucketStrategy}`);
      console.log(`   Media Strategy: ${frameworkConfig.mediaAttachmentStrategy}`);
      console.log(`   RLS Respect: ${frameworkConfig.config.respectRLS ? '✅' : '❌'}`);
      console.log(`   Real Images: ${frameworkConfig.config.enableRealImages ? '✅' : '❌'}`);
      console.log(`   Images Per Setup: ${frameworkConfig.config.imagesPerSetup}`);

      if (frameworkConfig.config.categories) {
        console.log(`   Categories: ${frameworkConfig.config.categories.join(', ')}`);
      }

      console.log('\n🌍 Environment Configuration:');
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Real Images Override: ${envConfig.enableRealImages ? '✅' : '❌'}`);
      console.log(`   RLS Override: ${envConfig.respectRLS ? '✅' : '❌'}`);

      console.log('\n🔧 Default Permissions:');
      console.log(`   Respect RLS: ${frameworkConfig.defaultPermissions.respectRLS ? '✅' : '❌'}`);
      console.log(`   Enable Public URLs: ${frameworkConfig.defaultPermissions.enablePublicUrls ? '✅' : '❌'}`);
      console.log(`   Require Auth: ${frameworkConfig.defaultPermissions.requireAuth ? '✅' : '❌'}`);

      // Validate configuration
      console.log('\n✅ Configuration Validation:');
      const validation = StorageConfigUtils.validate(mergedConfig);
      console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);

      if (validation.errors.length > 0) {
        console.log('\n❌ Configuration Errors:');
        validation.errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }

      if (validation.warnings.length > 0) {
        console.log('\n⚠️  Configuration Warnings:');
        validation.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
      }

      // Get recommendations
      const recommendations = StorageConfigUtils.getRecommendations(frameworkName, mergedConfig);
      if (recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }

      // Show API key status
      console.log('\n🔑 API Key Status:');
      console.log(`   Unsplash: ${process.env.UNSPLASH_ACCESS_KEY ? '✅ Configured' : '❌ Missing'}`);
      console.log(`   Pixabay: ${process.env.PIXABAY_API_KEY ? '✅ Configured' : '❌ Missing'}`);

      if (options.verbose) {
        console.log('\n🔍 Full Merged Configuration:');
        console.log(JSON.stringify(mergedConfig, null, 2));
      }

      console.log('\n✅ Configuration analysis completed');

    } catch (error: any) {
      console.error('❌ Configuration analysis failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Check media attachments for a setup
   */
  static async listMedia(options: StorageCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('📎 Listing media attachments...\n');

      const setupId = options.setupId;
      const accountId = options.accountId;

      if (!setupId && !accountId) {
        console.log('⚠️  Please specify either --setup-id or --account-id to filter results');
        return;
      }

      // Build query
      let query = client.from('media_attachments').select('*');
      
      if (setupId) {
        query = query.eq('setup_id', setupId);
      }
      
      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: mediaAttachments, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch media attachments: ${error.message}`);
      }

      if (!mediaAttachments || mediaAttachments.length === 0) {
        console.log('📭 No media attachments found');
        return;
      }

      console.log(`📊 Found ${mediaAttachments.length} media attachment(s):`);

      mediaAttachments.forEach((attachment: any, index: number) => {
        console.log(`\n   ${index + 1}. ${attachment.file_name}`);
        console.log(`      ID: ${attachment.id}`);
        console.log(`      Setup ID: ${attachment.setup_id || 'N/A'}`);
        console.log(`      Account ID: ${attachment.account_id || 'N/A'}`);
        console.log(`      Type: ${attachment.file_type}`);
        console.log(`      Size: ${attachment.file_size} bytes`);
        console.log(`      Bucket: ${attachment.storage_bucket}`);
        console.log(`      Path: ${attachment.file_path}`);
        console.log(`      Status: ${attachment.upload_status}`);
        console.log(`      Public: ${attachment.is_public ? '✅' : '❌'}`);
        console.log(`      Created: ${new Date(attachment.created_at).toLocaleString()}`);
        
        if (options.verbose) {
          console.log(`      Alt Text: ${attachment.alt_text || 'N/A'}`);
          console.log(`      Description: ${attachment.description || 'N/A'}`);
          if (attachment.metadata) {
            console.log(`      Metadata: ${JSON.stringify(attachment.metadata, null, 8)}`);
          }
        }
      });

      console.log('\n✅ Media listing completed');

    } catch (error: any) {
      console.error('❌ Media listing failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Clean up media attachments and storage files
   */
  static async cleanupMedia(options: StorageCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🧹 Cleaning up media attachments and storage files...\n');

      const setupId = options.setupId;
      const bucketName = options.bucket || 'media';

      if (!setupId) {
        console.log('⚠️  Please specify --setup-id to target specific media for cleanup');
        return;
      }

      // Get media attachments to clean up
      const { data: mediaAttachments, error: queryError } = await client
        .from('media_attachments')
        .select('*')
        .eq('setup_id', setupId);

      if (queryError) {
        throw new Error(`Failed to fetch media attachments: ${queryError.message}`);
      }

      if (!mediaAttachments || mediaAttachments.length === 0) {
        console.log('📭 No media attachments found for cleanup');
        return;
      }

      console.log(`📊 Found ${mediaAttachments.length} media attachment(s) to clean up`);

      let deletedFiles = 0;
      let deletedRecords = 0;
      const errors: string[] = [];

      // Clean up storage files
      console.log('\n🗑️  Deleting storage files...');
      for (const attachment of mediaAttachments) {
        try {
          const { error: deleteError } = await client.storage
            .from(bucketName)
            .remove([attachment.file_path]);

          if (deleteError) {
            errors.push(`Failed to delete ${attachment.file_path}: ${deleteError.message}`);
          } else {
            deletedFiles++;
            console.log(`   ✅ Deleted: ${attachment.file_name}`);
          }
        } catch (error: any) {
          errors.push(`Error deleting ${attachment.file_path}: ${error.message}`);
        }
      }

      // Clean up database records
      console.log('\n🗃️  Deleting database records...');
      const { error: deleteRecordsError } = await client
        .from('media_attachments')
        .delete()
        .eq('setup_id', setupId);

      if (deleteRecordsError) {
        errors.push(`Failed to delete media attachment records: ${deleteRecordsError.message}`);
      } else {
        deletedRecords = mediaAttachments.length;
        console.log(`   ✅ Deleted ${deletedRecords} database record(s)`);
      }

      // Summary
      console.log(`\n📊 Cleanup Summary:`);
      console.log(`   Files Deleted: ${deletedFiles}/${mediaAttachments.length}`);
      console.log(`   Records Deleted: ${deletedRecords}/${mediaAttachments.length}`);

      if (errors.length > 0) {
        console.log('\n❌ Cleanup Errors:');
        errors.forEach(error => {
          console.log(`   • ${error}`);
        });
      }

      console.log('\n✅ Media cleanup completed');

    } catch (error: any) {
      console.error('❌ Media cleanup failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }
}