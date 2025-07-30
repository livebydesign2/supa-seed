/**
 * Configuration Backup Manager System
 * Phase 4, Checkpoint D2 - Advanced backup management with versioning and restoration
 */

import { Logger } from '../core/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  sourceFile: string;
  backupPath: string;
  checksum: string;
  size: number;
  compressed: boolean;
  tags: string[];
  reason: 'manual' | 'pre_update' | 'scheduled' | 'rollback_point';
  relatedUpdates: string[]; // Update IDs that triggered this backup
  metadata: {
    version?: string;
    environment?: string;
    userId?: string;
    notes?: string;
  };
}

export interface BackupSet {
  id: string;
  name: string;
  description: string;
  timestamp: Date;
  backups: BackupMetadata[];
  status: 'complete' | 'partial' | 'corrupted';
  totalSize: number;
  relatedChanges: string[];
}

export interface BackupPolicy {
  id: string;
  name: string;
  description: string;
  triggers: BackupTrigger[];
  retention: RetentionPolicy;
  compression: boolean;
  encryption: boolean;
  verification: boolean;
  excludePatterns: string[];
}

export interface BackupTrigger {
  type: 'file_change' | 'time_interval' | 'before_update' | 'manual' | 'schema_change';
  condition?: string;
  parameters: Record<string, any>;
}

export interface RetentionPolicy {
  maxCount?: number;
  maxAge?: number; // days
  keepDaily?: number;
  keepWeekly?: number;
  keepMonthly?: number;
  customRules?: RetentionRule[];
}

export interface RetentionRule {
  condition: string;
  keepCount: number;
  description: string;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  errors: RestoreError[];
  warnings: RestoreWarning[];
  metadata: {
    backupSetId: string;
    restoreTime: Date;
    totalFiles: number;
    totalSize: number;
  };
}

export interface RestoreError {
  code: string;
  message: string;
  filePath: string;
  severity: 'error' | 'critical';
}

export interface RestoreWarning {
  code: string;
  message: string;
  filePath: string;
  impact: 'low' | 'medium' | 'high';
}

export interface BackupVerificationResult {
  isValid: boolean;
  corruptedBackups: string[];
  missingFiles: string[];
  checksumMismatches: string[];
  totalVerified: number;
  verificationTime: number;
}

export class ConfigurationBackupManager {
  private backupDirectory: string;
  private metadataFile: string;
  private backups: Map<string, BackupMetadata> = new Map();
  private backupSets: Map<string, BackupSet> = new Map();
  private policies: Map<string, BackupPolicy> = new Map();

  constructor(backupDirectory?: string) {
    this.backupDirectory = backupDirectory || path.join(process.cwd(), '.supa-seed', 'backups');
    this.metadataFile = path.join(this.backupDirectory, 'backup-metadata.json');
    this.initializeDirectory();
    this.loadMetadata();
    this.initializeDefaultPolicies();
  }

  /**
   * Create a backup of a single file
   */
  async createBackup(
    sourceFile: string,
    reason: BackupMetadata['reason'] = 'manual',
    tags: string[] = [],
    relatedUpdates: string[] = []
  ): Promise<BackupMetadata> {
    Logger.debug(`📦 Creating backup for: ${sourceFile}`);

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file does not exist: ${sourceFile}`);
    }

    const timestamp = new Date();
    const backupId = this.generateBackupId(sourceFile, timestamp);
    const stats = fs.statSync(sourceFile);
    
    // Generate backup filename
    const sourceBasename = path.basename(sourceFile);
    const backupFilename = `${backupId}-${sourceBasename}`;
    const backupPath = path.join(this.backupDirectory, 'files', backupFilename);

    // Ensure backup directory exists
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Read source file
    const sourceContent = fs.readFileSync(sourceFile);
    const checksum = crypto.createHash('sha256').update(sourceContent).digest('hex');

    // Apply compression if enabled
    let finalContent = sourceContent;
    let compressed = false;
    const compressionPolicy = this.shouldCompress(sourceFile, sourceContent.length);
    
    if (compressionPolicy) {
      finalContent = zlib.gzipSync(sourceContent);
      compressed = true;
      Logger.debug(`Compressed backup: ${sourceContent.length} -> ${finalContent.length} bytes`);
    }

    // Write backup file
    fs.writeFileSync(backupPath, finalContent);

    // Create metadata
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      sourceFile: path.resolve(sourceFile),
      backupPath,
      checksum,
      size: stats.size,
      compressed,
      tags,
      reason,
      relatedUpdates,
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        notes: `Backup created for ${reason} operation`
      }
    };

    // Store metadata
    this.backups.set(backupId, metadata);
    await this.saveMetadata();

    Logger.info(`📦 Backup created: ${backupId} (${this.formatSize(stats.size)})`);
    return metadata;
  }

  /**
   * Create a backup set for multiple files
   */
  async createBackupSet(
    files: string[],
    name: string,
    description: string,
    relatedChanges: string[] = []
  ): Promise<BackupSet> {
    Logger.info(`📦 Creating backup set: ${name} (${files.length} files)`);

    const backupSetId = `backupset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    const backups: BackupMetadata[] = [];
    let totalSize = 0;

    // Create individual backups
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          const backup = await this.createBackup(
            file,
            'pre_update',
            [`backupset:${backupSetId}`],
            relatedChanges
          );
          backups.push(backup);
          totalSize += backup.size;
        } catch (error: any) {
          Logger.warn(`Failed to backup file ${file}: ${error.message}`);
        }
      }
    }

    const backupSet: BackupSet = {
      id: backupSetId,
      name,
      description,
      timestamp,
      backups,
      status: backups.length === files.length ? 'complete' : 'partial',
      totalSize,
      relatedChanges
    };

    this.backupSets.set(backupSetId, backupSet);
    await this.saveMetadata();

    Logger.info(`📦 Backup set created: ${backupSetId} (${backups.length}/${files.length} files, ${this.formatSize(totalSize)})`);
    return backupSet;
  }

  /**
   * Restore a single backup
   */
  async restoreBackup(
    backupId: string,
    targetPath?: string,
    overwrite: boolean = false
  ): Promise<RestoreResult> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      return {
        success: false,
        restoredFiles: [],
        errors: [{
          code: 'BACKUP_NOT_FOUND',
          message: `Backup not found: ${backupId}`,
          filePath: '',
          severity: 'error'
        }],
        warnings: [],
        metadata: {
          backupSetId: '',
          restoreTime: new Date(),
          totalFiles: 0,
          totalSize: 0
        }
      };
    }

    return this.performRestore([backup], targetPath, overwrite);
  }

  /**
   * Restore a backup set
   */
  async restoreBackupSet(
    backupSetId: string,
    targetDirectory?: string,
    overwrite: boolean = false
  ): Promise<RestoreResult> {
    const backupSet = this.backupSets.get(backupSetId);
    if (!backupSet) {
      return {
        success: false,
        restoredFiles: [],
        errors: [{
          code: 'BACKUP_SET_NOT_FOUND',
          message: `Backup set not found: ${backupSetId}`,
          filePath: '',
          severity: 'error'
        }],
        warnings: [],
        metadata: {
          backupSetId,
          restoreTime: new Date(),
          totalFiles: 0,
          totalSize: 0
        }
      };
    }

    return this.performRestore(backupSet.backups, targetDirectory, overwrite, backupSetId);
  }

  /**
   * List all backups
   */
  listBackups(filter?: {
    sourceFile?: string;
    reason?: BackupMetadata['reason'];
    tags?: string[];
    afterDate?: Date;
    beforeDate?: Date;
  }): BackupMetadata[] {
    let results = Array.from(this.backups.values());

    if (filter) {
      if (filter.sourceFile) {
        results = results.filter(b => b.sourceFile.includes(filter.sourceFile!));
      }
      if (filter.reason) {
        results = results.filter(b => b.reason === filter.reason);
      }
      if (filter.tags && filter.tags.length > 0) {
        results = results.filter(b => filter.tags!.some(tag => b.tags.includes(tag)));
      }
      if (filter.afterDate) {
        results = results.filter(b => b.timestamp >= filter.afterDate!);
      }
      if (filter.beforeDate) {
        results = results.filter(b => b.timestamp <= filter.beforeDate!);
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * List all backup sets
   */
  listBackupSets(): BackupSet[] {
    return Array.from(this.backupSets.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Verify backup integrity
   */
  async verifyBackups(backupIds?: string[]): Promise<BackupVerificationResult> {
    Logger.info('🔍 Verifying backup integrity...');

    const startTime = Date.now();
    const toVerify = backupIds 
      ? backupIds.map(id => this.backups.get(id)).filter(Boolean) as BackupMetadata[]
      : Array.from(this.backups.values());

    const corruptedBackups: string[] = [];
    const missingFiles: string[] = [];
    const checksumMismatches: string[] = [];

    for (const backup of toVerify) {
      try {
        // Check if backup file exists
        if (!fs.existsSync(backup.backupPath)) {
          missingFiles.push(backup.id);
          continue;
        }

        // Read backup file
        let backupContent = fs.readFileSync(backup.backupPath);

        // Decompress if needed
        if (backup.compressed) {
          try {
            backupContent = zlib.gunzipSync(backupContent);
          } catch (error) {
            corruptedBackups.push(backup.id);
            continue;
          }
        }

        // Verify checksum
        const actualChecksum = crypto.createHash('sha256').update(backupContent).digest('hex');
        if (actualChecksum !== backup.checksum) {
          checksumMismatches.push(backup.id);
        }

      } catch (error: any) {
        Logger.warn(`Verification failed for backup ${backup.id}: ${error.message}`);
        corruptedBackups.push(backup.id);
      }
    }

    const verificationTime = Date.now() - startTime;
    const isValid = corruptedBackups.length === 0 && missingFiles.length === 0 && checksumMismatches.length === 0;

    Logger.info(`🔍 Verification complete: ${toVerify.length} backups verified in ${verificationTime}ms`);
    if (!isValid) {
      Logger.warn(`⚠️  Issues found: ${corruptedBackups.length} corrupted, ${missingFiles.length} missing, ${checksumMismatches.length} checksum mismatches`);
    }

    return {
      isValid,
      corruptedBackups,
      missingFiles,
      checksumMismatches,
      totalVerified: toVerify.length,
      verificationTime
    };
  }

  /**
   * Apply retention policies to clean up old backups
   */
  async applyRetentionPolicies(): Promise<{
    deletedBackups: string[];
    totalSpaceFreed: number;
    errors: string[];
  }> {
    Logger.info('🧹 Applying retention policies...');

    const deletedBackups: string[] = [];
    const errors: string[] = [];
    let totalSpaceFreed = 0;

    // Get all backups sorted by date (newest first)
    const allBackups = this.listBackups();
    
    // Apply default retention policy if no specific policies are defined
    if (this.policies.size === 0) {
      const toDelete = this.applyDefaultRetention(allBackups);
      
      for (const backup of toDelete) {
        try {
          await this.deleteBackup(backup.id);
          deletedBackups.push(backup.id);
          totalSpaceFreed += backup.size;
        } catch (error: any) {
          errors.push(`Failed to delete backup ${backup.id}: ${error.message}`);
        }
      }
    } else {
      // Apply custom policies
      for (const policy of this.policies.values()) {
        const policyBackups = this.getBackupsForPolicy(policy, allBackups);
        const toDelete = this.applyRetentionPolicy(policy.retention, policyBackups);
        
        for (const backup of toDelete) {
          try {
            await this.deleteBackup(backup.id);
            deletedBackups.push(backup.id);
            totalSpaceFreed += backup.size;
          } catch (error: any) {
            errors.push(`Failed to delete backup ${backup.id}: ${error.message}`);
          }
        }
      }
    }

    await this.saveMetadata();

    Logger.info(`🧹 Retention cleanup complete: deleted ${deletedBackups.length} backups, freed ${this.formatSize(totalSpaceFreed)}`);

    return {
      deletedBackups,
      totalSpaceFreed,
      errors
    };
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    const backup = this.backups.get(backupId);
    if (!backup) {
      return false;
    }

    try {
      // Delete backup file
      if (fs.existsSync(backup.backupPath)) {
        fs.unlinkSync(backup.backupPath);
      }

      // Remove from metadata
      this.backups.delete(backupId);

      // Remove from backup sets
      for (const backupSet of this.backupSets.values()) {
        backupSet.backups = backupSet.backups.filter(b => b.id !== backupId);
        if (backupSet.backups.length === 0) {
          this.backupSets.delete(backupSet.id);
        }
      }

      await this.saveMetadata();
      Logger.debug(`Deleted backup: ${backupId}`);
      return true;

    } catch (error: any) {
      Logger.error(`Failed to delete backup ${backupId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get backup statistics
   */
  getBackupStatistics(): {
    totalBackups: number;
    totalBackupSets: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    backupsByReason: Record<string, number>;
    compressionRatio: number;
  } {
    const backups = Array.from(this.backups.values());
    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const compressedSize = backups
      .filter(b => b.compressed)
      .reduce((sum, b) => sum + fs.statSync(b.backupPath).size, 0);
    const uncompressedSize = backups
      .filter(b => !b.compressed)
      .reduce((sum, b) => sum + fs.statSync(b.backupPath).size, 0);

    const backupsByReason: Record<string, number> = {};
    backups.forEach(backup => {
      backupsByReason[backup.reason] = (backupsByReason[backup.reason] || 0) + 1;
    });

    return {
      totalBackups: backups.length,
      totalBackupSets: this.backupSets.size,
      totalSize,
      oldestBackup: backups.length > 0 ? new Date(Math.min(...backups.map(b => b.timestamp.getTime()))) : undefined,
      newestBackup: backups.length > 0 ? new Date(Math.max(...backups.map(b => b.timestamp.getTime()))) : undefined,
      backupsByReason,
      compressionRatio: totalSize > 0 ? (compressedSize + uncompressedSize) / totalSize : 1
    };
  }

  /**
   * Add backup policy
   */
  addBackupPolicy(policy: BackupPolicy): void {
    this.policies.set(policy.id, policy);
    Logger.debug(`Added backup policy: ${policy.name}`);
  }

  /**
   * Remove backup policy
   */
  removeBackupPolicy(policyId: string): boolean {
    return this.policies.delete(policyId);
  }

  /**
   * Private: Perform the actual restore operation
   */
  private async performRestore(
    backups: BackupMetadata[],
    targetPath?: string,
    overwrite: boolean = false,
    backupSetId?: string
  ): Promise<RestoreResult> {
    Logger.info(`🔄 Restoring ${backups.length} backups...`);

    const errors: RestoreError[] = [];
    const warnings: RestoreWarning[] = [];
    const restoredFiles: string[] = [];
    let totalSize = 0;

    for (const backup of backups) {
      try {
        // Determine target path
        const restorePath = targetPath || backup.sourceFile;
        
        // Check if target exists and handle overwrite
        if (fs.existsSync(restorePath) && !overwrite) {
          warnings.push({
            code: 'FILE_EXISTS',
            message: `Target file exists and overwrite is disabled: ${restorePath}`,
            filePath: restorePath,
            impact: 'medium'
          });
          continue;
        }

        // Read backup file
        if (!fs.existsSync(backup.backupPath)) {
          errors.push({
            code: 'BACKUP_FILE_MISSING',
            message: `Backup file not found: ${backup.backupPath}`,
            filePath: backup.sourceFile,
            severity: 'error'
          });
          continue;
        }

        let backupContent = fs.readFileSync(backup.backupPath);

        // Decompress if needed
        if (backup.compressed) {
          try {
            backupContent = zlib.gunzipSync(backupContent);
          } catch (error: any) {
            errors.push({
              code: 'DECOMPRESSION_FAILED',
              message: `Failed to decompress backup: ${error.message}`,
              filePath: backup.sourceFile,
              severity: 'error'
            });
            continue;
          }
        }

        // Verify checksum
        const actualChecksum = crypto.createHash('sha256').update(backupContent).digest('hex');
        if (actualChecksum !== backup.checksum) {
          errors.push({
            code: 'CHECKSUM_MISMATCH',
            message: `Backup checksum mismatch: ${backup.id}`,
            filePath: backup.sourceFile,
            severity: 'critical'
          });
          continue;
        }

        // Ensure target directory exists
        const targetDir = path.dirname(restorePath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Write restored file
        fs.writeFileSync(restorePath, backupContent);
        restoredFiles.push(restorePath);
        totalSize += backup.size;

        Logger.debug(`Restored: ${backup.sourceFile} -> ${restorePath}`);

      } catch (error: any) {
        errors.push({
          code: 'RESTORE_FAILED',
          message: `Failed to restore backup: ${error.message}`,
          filePath: backup.sourceFile,
          severity: 'error'
        });
      }
    }

    const success = errors.filter(e => e.severity === 'critical').length === 0;

    Logger.info(`🔄 Restore complete: ${restoredFiles.length}/${backups.length} files restored (${this.formatSize(totalSize)})`);

    return {
      success,
      restoredFiles,
      errors,
      warnings,
      metadata: {
        backupSetId: backupSetId || '',
        restoreTime: new Date(),
        totalFiles: restoredFiles.length,
        totalSize
      }
    };
  }

  /**
   * Private: Initialize backup directory structure
   */
  private initializeDirectory(): void {
    const dirs = [
      this.backupDirectory,
      path.join(this.backupDirectory, 'files'),
      path.join(this.backupDirectory, 'metadata')
    ];

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Private: Load backup metadata from disk
   */
  private loadMetadata(): void {
    if (fs.existsSync(this.metadataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
        
        // Load backups
        if (data.backups) {
          for (const [id, backup] of Object.entries(data.backups as Record<string, any>)) {
            this.backups.set(id, {
              ...backup,
              timestamp: new Date(backup.timestamp)
            });
          }
        }

        // Load backup sets
        if (data.backupSets) {
          for (const [id, backupSet] of Object.entries(data.backupSets as Record<string, any>)) {
            this.backupSets.set(id, {
              ...backupSet,
              timestamp: new Date(backupSet.timestamp),
              backups: backupSet.backups.map((b: any) => ({
                ...b,
                timestamp: new Date(b.timestamp)
              }))
            });
          }
        }

        Logger.debug(`Loaded metadata: ${this.backups.size} backups, ${this.backupSets.size} backup sets`);
      } catch (error: any) {
        Logger.warn(`Failed to load backup metadata: ${error.message}`);
      }
    }
  }

  /**
   * Private: Save backup metadata to disk
   */
  private async saveMetadata(): Promise<void> {
    try {
      const data = {
        backups: Object.fromEntries(this.backups),
        backupSets: Object.fromEntries(this.backupSets),
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(this.metadataFile, JSON.stringify(data, null, 2));
    } catch (error: any) {
      Logger.error(`Failed to save backup metadata: ${error.message}`);
    }
  }

  /**
   * Private: Initialize default backup policies
   */
  private initializeDefaultPolicies(): void {
    this.addBackupPolicy({
      id: 'default-retention',
      name: 'Default Retention Policy',
      description: 'Keep last 10 backups, delete older than 30 days',
      triggers: [
        { type: 'before_update', parameters: {} }
      ],
      retention: {
        maxCount: 10,
        maxAge: 30
      },
      compression: true,
      encryption: false,
      verification: true,
      excludePatterns: ['*.tmp', '*.log']
    });
  }

  /**
   * Private: Generate unique backup ID
   */
  private generateBackupId(sourceFile: string, timestamp: Date): string {
    const basename = path.basename(sourceFile, path.extname(sourceFile));
    const hash = crypto.createHash('md5').update(sourceFile).digest('hex').substr(0, 8);
    const timeStr = timestamp.toISOString().replace(/[:.]/g, '-').substr(0, 19);
    return `${timeStr}-${basename}-${hash}`;
  }

  /**
   * Private: Determine if file should be compressed
   */
  private shouldCompress(filePath: string, size: number): boolean {
    // Compress files larger than 1KB
    if (size < 1024) return false;

    // Already compressed formats
    const compressedExts = ['.gz', '.zip', '.tar', '.bz2', '.xz'];
    if (compressedExts.some(ext => filePath.endsWith(ext))) {
      return false;
    }

    return true;
  }

  /**
   * Private: Apply default retention policy
   */
  private applyDefaultRetention(backups: BackupMetadata[]): BackupMetadata[] {
    const maxCount = 10;
    const maxAgeDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    return backups
      .filter((backup, index) => index >= maxCount || backup.timestamp < cutoffDate);
  }

  /**
   * Private: Apply retention policy to backups
   */
  private applyRetentionPolicy(policy: RetentionPolicy, backups: BackupMetadata[]): BackupMetadata[] {
    const toDelete: BackupMetadata[] = [];

    // Apply max count policy
    if (policy.maxCount && backups.length > policy.maxCount) {
      toDelete.push(...backups.slice(policy.maxCount));
    }

    // Apply max age policy
    if (policy.maxAge) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.maxAge);
      toDelete.push(...backups.filter(b => b.timestamp < cutoffDate));
    }

    return [...new Set(toDelete)]; // Remove duplicates
  }

  /**
   * Private: Get backups that match a policy
   */
  private getBackupsForPolicy(policy: BackupPolicy, allBackups: BackupMetadata[]): BackupMetadata[] {
    // For now, return all backups - in a real implementation,
    // you'd filter based on policy triggers and exclude patterns
    return allBackups;
  }

  /**
   * Private: Format file size for display
   */
  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }
}