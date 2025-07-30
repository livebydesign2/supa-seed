/**
 * Configuration File Updater System
 * Phase 4, Checkpoint D2 - Safe configuration file modification with rollback support
 */

import { UserChoice, ConfigurationAction, ConfigurationPrompt } from './interactive-configuration';
import { SchemaChange, ConfigurationImpact } from './schema-evolution';
import { Logger } from '../core/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ConfigurationUpdate {
  id: string;
  filePath: string;
  updateType: 'add' | 'modify' | 'remove' | 'replace' | 'create';
  targetSection: string;
  changes: ConfigurationChange[];
  metadata: {
    triggeredBy: string; // choice ID
    timestamp: Date;
    backupPath?: string;
    checksum: string;
    estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
}

export interface ConfigurationChange {
  path: string; // JSON path or line number
  operation: 'set' | 'push' | 'splice' | 'delete' | 'merge';
  oldValue?: any;
  newValue?: any;
  context?: {
    before?: string;
    after?: string;
    indentation?: string;
  };
}

export interface UpdateResult {
  success: boolean;
  updatedFiles: string[];
  errors: UpdateError[];
  warnings: UpdateWarning[];
  rollbackPlan: RollbackAction[];
  metadata: {
    totalChanges: number;
    executionTime: number;
    filesModified: number;
    backupsCreated: number;
  };
}

export interface UpdateError {
  code: string;
  message: string;
  filePath: string;
  severity: 'error' | 'critical';
  context?: any;
}

export interface UpdateWarning {
  code: string;
  message: string;
  filePath: string;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface RollbackAction {
  type: 'restore_file' | 'undo_changes' | 'delete_file' | 'recreate_backup';
  filePath: string;
  backupPath?: string;
  changes?: ConfigurationChange[];
  order: number;
}

export interface FileProcessor {
  name: string;
  supportedExtensions: string[];
  canProcess: (filePath: string) => boolean;
  parse: (content: string) => any;
  stringify: (data: any, options?: any) => string;
  applyChanges: (data: any, changes: ConfigurationChange[]) => any;
  validate: (data: any) => { isValid: boolean; errors: string[] };
}

export interface ConfigurationTemplate {
  id: string;
  name: string;
  description: string;
  targetFiles: string[];
  variables: TemplateVariable[];
  generate: (variables: Record<string, any>) => Record<string, any>;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  defaultValue?: any;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    options?: any[];
  };
}

export class ConfigurationFileUpdater {
  private fileProcessors: Map<string, FileProcessor> = new Map();
  private templates: Map<string, ConfigurationTemplate> = new Map();
  private updateHistory: ConfigurationUpdate[] = [];
  private backupDirectory: string;

  constructor(backupDirectory?: string) {
    this.backupDirectory = backupDirectory || path.join(process.cwd(), '.supa-seed', 'backups');
    this.initializeFileProcessors();
    this.initializeTemplates();
    this.ensureBackupDirectory();
  }

  /**
   * Apply a batch of configuration updates based on user choices
   */
  async applyUpdates(
    choices: UserChoice[],
    prompts: ConfigurationPrompt[],
    schemaChanges: SchemaChange[]
  ): Promise<UpdateResult> {
    Logger.info(`🔧 Applying configuration updates: ${choices.length} choices`);

    const updates: ConfigurationUpdate[] = [];
    const errors: UpdateError[] = [];
    const warnings: UpdateWarning[] = [];
    const rollbackActions: RollbackAction[] = [];
    const updatedFiles: string[] = [];
    let totalChanges = 0;

    const startTime = Date.now();

    try {
      // Generate updates from choices
      for (const choice of choices) {
        const prompt = prompts.find(p => p.id === choice.promptId);
        if (!prompt) {
          errors.push({
            code: 'PROMPT_NOT_FOUND',
            message: `Prompt not found: ${choice.promptId}`,
            filePath: '',
            severity: 'error'
          });
          continue;
        }

        const selectedOption = prompt.options.find(o => o.id === choice.optionId);
        if (!selectedOption) {
          errors.push({
            code: 'OPTION_NOT_FOUND',
            message: `Option not found: ${choice.optionId}`,
            filePath: '',
            severity: 'error'
          });
          continue;
        }

        // Process each action in the selected option
        for (const action of selectedOption.actions) {
          if (action.type === 'file_update' || action.type === 'file_create') {
            try {
              const update = await this.generateUpdate(action, choice, schemaChanges);
              if (update) {
                updates.push(update);
              }
            } catch (error: any) {
              errors.push({
                code: 'UPDATE_GENERATION_FAILED',
                message: `Failed to generate update: ${error.message}`,
                filePath: action.targetPath,
                severity: 'error',
                context: { choice: choice.promptId, action: action.type }
              });
            }
          }
        }
      }

      // Apply updates in order of risk (low risk first)
      const sortedUpdates = updates.sort((a, b) => {
        const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };
        return riskOrder[a.metadata.estimatedRisk] - riskOrder[b.metadata.estimatedRisk];
      });

      for (const update of sortedUpdates) {
        try {
          const result = await this.applyUpdate(update);
          
          if (result.success) {
            updatedFiles.push(update.filePath);
            totalChanges += update.changes.length;
            rollbackActions.push(...result.rollbackActions);
            this.updateHistory.push(update);
          } else {
            errors.push(...result.errors);
            warnings.push(...result.warnings);
          }

        } catch (error: any) {
          errors.push({
            code: 'UPDATE_APPLICATION_FAILED',
            message: `Failed to apply update: ${error.message}`,
            filePath: update.filePath,
            severity: 'critical',
            context: { updateId: update.id }
          });
        }
      }

    } catch (error: any) {
      errors.push({
        code: 'BATCH_UPDATE_FAILED',
        message: `Batch update failed: ${error.message}`,
        filePath: '',
        severity: 'critical'
      });
    }

    const executionTime = Date.now() - startTime;

    return {
      success: errors.filter(e => e.severity === 'critical').length === 0,
      updatedFiles: [...new Set(updatedFiles)],
      errors,
      warnings,
      rollbackPlan: rollbackActions.sort((a, b) => b.order - a.order), // Reverse order for rollback
      metadata: {
        totalChanges,
        executionTime,
        filesModified: updatedFiles.length,
        backupsCreated: rollbackActions.filter(a => a.type === 'restore_file').length
      }
    };
  }

  /**
   * Apply a single configuration update
   */
  async applyUpdate(update: ConfigurationUpdate): Promise<{
    success: boolean;
    errors: UpdateError[];
    warnings: UpdateWarning[];
    rollbackActions: RollbackAction[];
  }> {
    Logger.debug(`🔧 Applying update: ${update.id} to ${update.filePath}`);

    const errors: UpdateError[] = [];
    const warnings: UpdateWarning[] = [];
    const rollbackActions: RollbackAction[] = [];

    try {
      // Determine file processor
      const processor = this.getFileProcessor(update.filePath);
      if (!processor) {
        errors.push({
          code: 'NO_PROCESSOR',
          message: `No processor available for file: ${update.filePath}`,
          filePath: update.filePath,
          severity: 'error'
        });
        return { success: false, errors, warnings, rollbackActions };
      }

      // Create backup if file exists
      if (fs.existsSync(update.filePath)) {
        const backupPath = await this.createBackup(update.filePath);
        update.metadata.backupPath = backupPath;
        
        rollbackActions.push({
          type: 'restore_file',
          filePath: update.filePath,
          backupPath,
          order: rollbackActions.length
        });
      }

      // Read and parse existing file (or create new)
      let currentData: any = {};
      if (fs.existsSync(update.filePath)) {
        const currentContent = fs.readFileSync(update.filePath, 'utf8');
        try {
          currentData = processor.parse(currentContent);
        } catch (error: any) {
          errors.push({
            code: 'PARSE_ERROR',
            message: `Failed to parse file: ${error.message}`,
            filePath: update.filePath,
            severity: 'error'
          });
          return { success: false, errors, warnings, rollbackActions };
        }
      }

      // Apply changes
      let updatedData: any;
      try {
        updatedData = processor.applyChanges(currentData, update.changes);
      } catch (error: any) {
        errors.push({
          code: 'APPLY_CHANGES_ERROR',
          message: `Failed to apply changes: ${error.message}`,
          filePath: update.filePath,
          severity: 'error'
        });
        return { success: false, errors, warnings, rollbackActions };
      }

      // Validate updated data
      const validation = processor.validate(updatedData);
      if (!validation.isValid) {
        errors.push({
          code: 'VALIDATION_ERROR',
          message: `Updated file failed validation: ${validation.errors.join(', ')}`,
          filePath: update.filePath,
          severity: 'error'
        });
        return { success: false, errors, warnings, rollbackActions };
      }

      // Write updated file
      try {
        const updatedContent = processor.stringify(updatedData, { indent: 2 });
        
        // Ensure directory exists
        const dirPath = path.dirname(update.filePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        fs.writeFileSync(update.filePath, updatedContent, 'utf8');
        
        // Update checksum
        update.metadata.checksum = this.calculateChecksum(updatedContent);
        
        Logger.info(`✅ Successfully updated: ${update.filePath}`);
        
      } catch (error: any) {
        errors.push({
          code: 'WRITE_ERROR',
          message: `Failed to write file: ${error.message}`,
          filePath: update.filePath,
          severity: 'critical'
        });
        return { success: false, errors, warnings, rollbackActions };
      }

    } catch (error: any) {
      errors.push({
        code: 'UNEXPECTED_ERROR',
        message: `Unexpected error: ${error.message}`,
        filePath: update.filePath,
        severity: 'critical'
      });
    }

    return {
      success: errors.length === 0,
      errors,
      warnings,
      rollbackActions
    };
  }

  /**
   * Rollback configuration changes
   */
  async rollbackUpdates(rollbackPlan: RollbackAction[]): Promise<{
    success: boolean;
    errors: string[];
    restoredFiles: string[];
  }> {
    Logger.info(`🔄 Rolling back configuration changes: ${rollbackPlan.length} actions`);

    const errors: string[] = [];
    const restoredFiles: string[] = [];

    // Execute rollback actions in order
    for (const action of rollbackPlan) {
      try {
        switch (action.type) {
          case 'restore_file':
            if (action.backupPath && fs.existsSync(action.backupPath)) {
              fs.copyFileSync(action.backupPath, action.filePath);
              restoredFiles.push(action.filePath);
              Logger.debug(`Restored: ${action.filePath} from ${action.backupPath}`);
            }
            break;

          case 'delete_file':
            if (fs.existsSync(action.filePath)) {
              fs.unlinkSync(action.filePath);
              Logger.debug(`Deleted: ${action.filePath}`);
            }
            break;

          case 'undo_changes':
            // This would reverse specific changes - complex implementation
            Logger.debug(`Undo changes: ${action.filePath}`);
            break;

          case 'recreate_backup':
            if (action.backupPath) {
              const backupDir = path.dirname(action.backupPath);
              if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
              }
              fs.copyFileSync(action.filePath, action.backupPath);
              Logger.debug(`Recreated backup: ${action.backupPath}`);
            }
            break;
        }
      } catch (error: any) {
        errors.push(`Failed to execute rollback action ${action.type}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      errors,
      restoredFiles
    };
  }

  /**
   * Create configuration from template
   */
  async createFromTemplate(
    templateId: string,
    variables: Record<string, any>,
    targetDirectory?: string
  ): Promise<{
    success: boolean;
    createdFiles: string[];
    errors: string[];
  }> {
    Logger.info(`📄 Creating configuration from template: ${templateId}`);

    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        createdFiles: [],
        errors: [`Template not found: ${templateId}`]
      };
    }

    const errors: string[] = [];
    const createdFiles: string[] = [];

    try {
      // Validate variables
      const validationErrors = this.validateTemplateVariables(template, variables);
      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        return { success: false, createdFiles, errors };
      }

      // Generate configuration data
      const configData = template.generate(variables);

      // Create files
      for (const targetFile of template.targetFiles) {
        const filePath = targetDirectory 
          ? path.join(targetDirectory, targetFile)
          : targetFile;

        try {
          const processor = this.getFileProcessor(filePath);
          if (!processor) {
            errors.push(`No processor for file: ${filePath}`);
            continue;
          }

          const content = processor.stringify(configData[targetFile] || {}, { indent: 2 });
          
          // Ensure directory exists
          const dirPath = path.dirname(filePath);
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }

          fs.writeFileSync(filePath, content, 'utf8');
          createdFiles.push(filePath);
          
          Logger.debug(`Created: ${filePath}`);

        } catch (error: any) {
          errors.push(`Failed to create ${filePath}: ${error.message}`);
        }
      }

    } catch (error: any) {
      errors.push(`Template generation failed: ${error.message}`);
    }

    return {
      success: errors.length === 0,
      createdFiles,
      errors
    };
  }

  /**
   * Get update history
   */
  getUpdateHistory(): ConfigurationUpdate[] {
    return [...this.updateHistory];
  }

  /**
   * Clear update history
   */
  clearUpdateHistory(): void {
    this.updateHistory = [];
  }

  /**
   * Add custom file processor
   */
  addFileProcessor(processor: FileProcessor): void {
    this.fileProcessors.set(processor.name, processor);
    Logger.debug(`Added file processor: ${processor.name}`);
  }

  /**
   * Add configuration template
   */
  addTemplate(template: ConfigurationTemplate): void {
    this.templates.set(template.id, template);
    Logger.debug(`Added template: ${template.name}`);
  }

  /**
   * Private: Initialize built-in file processors
   */
  private initializeFileProcessors(): void {
    // JSON processor
    this.addFileProcessor({
      name: 'json',
      supportedExtensions: ['.json'],
      canProcess: (filePath) => path.extname(filePath) === '.json',
      parse: (content) => JSON.parse(content),
      stringify: (data, options) => JSON.stringify(data, null, options?.indent || 2),
      applyChanges: (data, changes) => {
        const result = JSON.parse(JSON.stringify(data)); // Deep clone
        
        for (const change of changes) {
          const pathParts = change.path.split('.');
          let current = result;
          
          // Navigate to parent
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (!(part in current)) {
              current[part] = {};
            }
            current = current[part];
          }
          
          const finalKey = pathParts[pathParts.length - 1];
          
          switch (change.operation) {
            case 'set':
              current[finalKey] = change.newValue;
              break;
            case 'delete':
              delete current[finalKey];
              break;
            case 'push':
              if (!Array.isArray(current[finalKey])) {
                current[finalKey] = [];
              }
              current[finalKey].push(change.newValue);
              break;
            case 'merge':
              if (typeof current[finalKey] !== 'object') {
                current[finalKey] = {};
              }
              Object.assign(current[finalKey], change.newValue);
              break;
          }
        }
        
        return result;
      },
      validate: (data) => {
        try {
          JSON.stringify(data);
          return { isValid: true, errors: [] };
        } catch (error: any) {
          return { isValid: false, errors: [error.message] };
        }
      }
    });

    // JavaScript processor (simplified)
    this.addFileProcessor({
      name: 'javascript',
      supportedExtensions: ['.js', '.mjs'],
      canProcess: (filePath) => ['.js', '.mjs'].includes(path.extname(filePath)),
      parse: (content) => {
        // This is a simplified implementation
        // In practice, you'd use a proper JS parser like @babel/parser
        return { content };
      },
      stringify: (data) => data.content || '',
      applyChanges: (data, changes) => {
        // Simplified - would need sophisticated JS AST manipulation
        let content = data.content || '';
        
        for (const change of changes) {
          if (change.operation === 'set' && change.context) {
            // Simple text replacement
            content = content.replace(
              change.context.before || '',
              change.context.after || String(change.newValue)
            );
          }
        }
        
        return { content };
      },
      validate: (data) => {
        // Basic validation - could use ESLint or similar
        return { isValid: true, errors: [] };
      }
    });
  }

  /**
   * Private: Initialize configuration templates
   */
  private initializeTemplates(): void {
    // Basic supa-seed configuration template
    this.addTemplate({
      id: 'supa-seed-basic',
      name: 'Basic Supa-Seed Configuration',
      description: 'Creates a basic supa-seed configuration with common settings',
      targetFiles: ['supa-seed.config.js'],
      variables: [
        {
          name: 'supabaseUrl',
          type: 'string',
          description: 'Supabase project URL',
          required: true,
          validation: { pattern: '^https://.*\\.supabase\\.co$' }
        },
        {
          name: 'supabaseAnonKey',
          type: 'string',
          description: 'Supabase anonymous key',
          required: true
        },
        {
          name: 'enableSync',
          type: 'boolean',
          description: 'Enable automatic synchronization',
          defaultValue: true,
          required: false
        }
      ],
      generate: (variables) => ({
        'supa-seed.config.js': {
          supabase: {
            url: variables.supabaseUrl,
            anonKey: variables.supabaseAnonKey
          },
          sync: {
            enabled: variables.enableSync || true,
            interval: 30000
          },
          seeding: {
            batchSize: 100,
            parallelUploads: 5
          }
        }
      })
    });
  }

  /**
   * Private: Generate update from configuration action
   */
  private async generateUpdate(
    action: ConfigurationAction,
    choice: UserChoice,
    schemaChanges: SchemaChange[]
  ): Promise<ConfigurationUpdate | null> {
    if (!action.targetPath) {
      return null;
    }

    // Generate changes based on action parameters
    const changes: ConfigurationChange[] = [];
    
    if (action.parameters.changes) {
      // Schema-driven changes
      for (const schemaChange of action.parameters.changes as SchemaChange[]) {
        if (schemaChange.tableName) {
          changes.push({
            path: `seeders.${schemaChange.tableName}.enabled`,
            operation: 'set',
            newValue: true
          });
        }
      }
    }

    if (action.parameters.configChanges) {
      // Direct configuration changes
      for (const [key, value] of Object.entries(action.parameters.configChanges)) {
        changes.push({
          path: key,
          operation: 'set',
          newValue: value
        });
      }
    }

    const update: ConfigurationUpdate = {
      id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filePath: action.targetPath,
      updateType: action.type === 'file_create' ? 'create' : 'modify',
      targetSection: 'root',
      changes,
      metadata: {
        triggeredBy: choice.promptId,
        timestamp: new Date(),
        checksum: '',
        estimatedRisk: changes.length > 5 ? 'HIGH' : changes.length > 2 ? 'MEDIUM' : 'LOW'
      }
    };

    return update;
  }

  /**
   * Private: Get appropriate file processor
   */
  private getFileProcessor(filePath: string): FileProcessor | null {
    for (const processor of this.fileProcessors.values()) {
      if (processor.canProcess(filePath)) {
        return processor;
      }
    }
    return null;
  }

  /**
   * Private: Create backup of file
   */
  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const basename = path.basename(filePath);
    const backupName = `${timestamp}-${basename}`;
    const backupPath = path.join(this.backupDirectory, backupName);

    if (!fs.existsSync(this.backupDirectory)) {
      fs.mkdirSync(this.backupDirectory, { recursive: true });
    }

    fs.copyFileSync(filePath, backupPath);
    Logger.debug(`Created backup: ${backupPath}`);

    return backupPath;
  }

  /**
   * Private: Calculate file checksum
   */
  private calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Private: Ensure backup directory exists
   */
  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDirectory)) {
      fs.mkdirSync(this.backupDirectory, { recursive: true });
    }
  }

  /**
   * Private: Validate template variables
   */
  private validateTemplateVariables(
    template: ConfigurationTemplate,
    variables: Record<string, any>
  ): string[] {
    const errors: string[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];

      // Check required variables
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable missing: ${variable.name}`);
        continue;
      }

      // Type validation
      if (value !== undefined && typeof value !== variable.type) {
        errors.push(`Variable ${variable.name} must be of type ${variable.type}`);
      }

      // Pattern validation
      if (variable.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(variable.validation.pattern);
        if (!regex.test(value)) {
          errors.push(`Variable ${variable.name} does not match required pattern`);
        }
      }

      // Range validation
      if (typeof value === 'number') {
        if (variable.validation?.min !== undefined && value < variable.validation.min) {
          errors.push(`Variable ${variable.name} must be at least ${variable.validation.min}`);
        }
        if (variable.validation?.max !== undefined && value > variable.validation.max) {
          errors.push(`Variable ${variable.name} must be at most ${variable.validation.max}`);
        }
      }

      // Options validation
      if (variable.validation?.options && !variable.validation.options.includes(value)) {
        errors.push(`Variable ${variable.name} must be one of: ${variable.validation.options.join(', ')}`);
      }
    }

    return errors;
  }
}