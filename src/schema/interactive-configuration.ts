/**
 * Interactive Configuration Updates System
 * Phase 4, Checkpoint D2 - Interactive configuration prompt engine and user choice handling
 */

import { SchemaChange, ConfigurationImpact, MigrationSuggestion } from './schema-evolution';
import { Logger } from '../core/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

export interface ConfigurationPrompt {
  id: string;
  type: 'schema_change' | 'migration_suggestion' | 'impact_resolution' | 'conflict_resolution';
  title: string;
  description: string;
  context: {
    affectedFiles: string[];
    schemaChanges: SchemaChange[];
    migrationSuggestions: MigrationSuggestion[];
    impactAnalysis: ConfigurationImpact[];
    estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTENSIVE';
  };
  options: ConfigurationOption[];
  defaultOption?: string;
  required: boolean;
  dependencies: string[]; // Other prompt IDs this depends on
  metadata: {
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    reversible: boolean;
    estimatedTime: number; // minutes
  };
}

export interface ConfigurationOption {
  id: string;
  label: string;
  description: string;
  type: 'accept' | 'reject' | 'customize' | 'defer' | 'skip';
  consequences: string[];
  prerequisites: string[];
  actions: ConfigurationAction[];
  reversible: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ConfigurationAction {
  type: 'file_update' | 'file_create' | 'file_backup' | 'schema_migration' | 'validation' | 'user_input';
  description: string;
  targetPath: string;
  parameters: Record<string, any>;
  rollbackAction?: ConfigurationAction;
  validation?: {
    type: 'syntax' | 'semantic' | 'compatibility';
    command?: string;
    expectedOutcome: string;
  };
}

export interface UserChoice {
  promptId: string;
  optionId: string;
  customParameters?: Record<string, any>;
  userNotes?: string;
  timestamp: Date;
  confidence: number; // 1-100
}

export interface ConfigurationSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  prompts: ConfigurationPrompt[];
  choices: UserChoice[];
  status: 'in_progress' | 'completed' | 'aborted' | 'deferred';
  metadata: {
    triggeredByChangeId: string;
    affectedFiles: string[];
    totalPrompts: number;
    completedPrompts: number;
    estimatedTotalTime: number;
    actualTime?: number;
  };
}

export interface PromptGenerationOptions {
  interactiveMode: boolean;
  autoAcceptLowRisk: boolean;
  requireConfirmationForHighRisk: boolean;
  includePreview: boolean;
  batchSimilarChanges: boolean;
  minimumRiskThreshold: 'LOW' | 'MEDIUM' | 'HIGH';
  timeoutSeconds: number;
  saveChoices: boolean;
}

export class ConfigurationPromptEngine {
  private sessions: Map<string, ConfigurationSession> = new Map();
  private readline?: readline.Interface;
  private options: PromptGenerationOptions;

  constructor(options: Partial<PromptGenerationOptions> = {}) {
    this.options = {
      interactiveMode: true,
      autoAcceptLowRisk: false,
      requireConfirmationForHighRisk: true,
      includePreview: true,
      batchSimilarChanges: true,
      minimumRiskThreshold: 'LOW',
      timeoutSeconds: 300,
      saveChoices: true,
      ...options
    };

    if (this.options.interactiveMode) {
      this.initializeReadline();
    }
  }

  /**
   * Generate configuration prompts from schema changes and migration suggestions
   */
  async generatePrompts(
    changes: SchemaChange[],
    impacts: ConfigurationImpact[],
    suggestions: MigrationSuggestion[]
  ): Promise<ConfigurationPrompt[]> {
    Logger.info('🎯 Generating configuration prompts from schema analysis...');

    const prompts: ConfigurationPrompt[] = [];

    // Group related changes for batch processing
    const groupedChanges = this.options.batchSimilarChanges 
      ? this.groupRelatedChanges(changes)
      : changes.map(c => [c]);

    // Generate prompts for schema changes
    for (const changeGroup of groupedChanges) {
      const schemaPrompt = this.generateSchemaChangePrompt(changeGroup, impacts);
      if (schemaPrompt) {
        prompts.push(schemaPrompt);
      }
    }

    // Generate prompts for migration suggestions
    for (const suggestion of suggestions) {
      const migrationPrompt = this.generateMigrationPrompt(suggestion, changes, impacts);
      if (migrationPrompt) {
        prompts.push(migrationPrompt);
      }
    }

    // Generate prompts for impact resolutions
    for (const impact of impacts) {
      if (impact.migrationNeeded) {
        const impactPrompt = this.generateImpactResolutionPrompt(impact, changes);
        if (impactPrompt) {
          prompts.push(impactPrompt);
        }
      }
    }

    // Sort prompts by priority and dependencies
    const sortedPrompts = this.sortPromptsByPriority(prompts);

    Logger.info(`🎯 Generated ${sortedPrompts.length} configuration prompts`);
    return sortedPrompts;
  }

  /**
   * Start an interactive configuration session
   */
  async startConfigurationSession(
    changes: SchemaChange[],
    impacts: ConfigurationImpact[],
    suggestions: MigrationSuggestion[]
  ): Promise<ConfigurationSession> {
    const sessionId = `config-session-${Date.now()}`;
    const prompts = await this.generatePrompts(changes, impacts, suggestions);

    const session: ConfigurationSession = {
      id: sessionId,
      startTime: new Date(),
      prompts,
      choices: [],
      status: 'in_progress',
      metadata: {
        triggeredByChangeId: changes[0]?.id || 'unknown',
        affectedFiles: this.extractAffectedFiles(impacts),
        totalPrompts: prompts.length,
        completedPrompts: 0,
        estimatedTotalTime: prompts.reduce((sum, p) => sum + p.metadata.estimatedTime, 0)
      }
    };

    this.sessions.set(sessionId, session);

    Logger.info(`🚀 Started configuration session: ${sessionId} (${prompts.length} prompts)`);

    if (this.options.interactiveMode) {
      await this.runInteractiveSession(session);
    } else {
      // In non-interactive mode, auto-complete with default choices
      for (const prompt of prompts) {
        const defaultOption = prompt.options.find(o => o.id === prompt.defaultOption) || prompt.options[0];
        if (defaultOption) {
          const choice: UserChoice = {
            promptId: prompt.id,
            optionId: defaultOption.id,
            timestamp: new Date(),
            confidence: 50
          };
          session.choices.push(choice);
        }
      }
      session.status = 'completed';
      session.endTime = new Date();
      session.metadata.completedPrompts = session.choices.length;
    }

    return session;
  }

  /**
   * Present a single prompt to the user and collect their choice
   */
  async presentPrompt(prompt: ConfigurationPrompt): Promise<UserChoice> {
    Logger.info(`\n📋 Configuration Prompt: ${prompt.title}`);
    
    if (!this.options.interactiveMode) {
      // Return default choice in non-interactive mode
      const defaultOption = prompt.options.find(o => o.id === prompt.defaultOption) || prompt.options[0];
      return {
        promptId: prompt.id,
        optionId: defaultOption.id,
        timestamp: new Date(),
        confidence: 50 // Low confidence for auto-choices
      };
    }

    // Display prompt information
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 ${prompt.title}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`\n📝 Description:`);
    console.log(`   ${prompt.description}`);

    if (prompt.context.affectedFiles.length > 0) {
      console.log(`\n📁 Affected Files:`);
      prompt.context.affectedFiles.forEach(file => {
        console.log(`   • ${file}`);
      });
    }

    console.log(`\n⚖️  Impact: ${prompt.metadata.riskLevel} risk, ~${prompt.metadata.estimatedTime}min`);
    
    if (this.options.includePreview && prompt.context.schemaChanges.length > 0) {
      console.log(`\n🔍 Schema Changes:`);
      prompt.context.schemaChanges.forEach(change => {
        console.log(`   • ${change.description} (${change.severity})`);
      });
    }

    console.log(`\n🔧 Available Options:`);
    prompt.options.forEach((option, index) => {
      const defaultMarker = option.id === prompt.defaultOption ? ' (default)' : '';
      console.log(`   ${index + 1}. ${option.label}${defaultMarker}`);
      console.log(`      ${option.description}`);
      if (option.consequences.length > 0) {
        console.log(`      Consequences: ${option.consequences.join(', ')}`);
      }
    });

    // Auto-accept low risk if configured
    if (this.options.autoAcceptLowRisk && prompt.metadata.riskLevel === 'LOW') {
      const acceptOption = prompt.options.find(o => o.type === 'accept');
      if (acceptOption) {
        console.log(`\n✅ Auto-accepting low-risk change: ${acceptOption.label}`);
        return {
          promptId: prompt.id,
          optionId: acceptOption.id,
          timestamp: new Date(),
          confidence: 80
        };
      }
    }

    // Get user input
    const choice = await this.getUserChoice(prompt);
    return choice;
  }

  /**
   * Validate a user choice against prompt constraints
   */
  validateChoice(prompt: ConfigurationPrompt, choice: UserChoice): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if option exists
    const selectedOption = prompt.options.find(o => o.id === choice.optionId);
    if (!selectedOption) {
      errors.push(`Invalid option: ${choice.optionId}`);
      return { isValid: false, errors, warnings };
    }

    // Check prerequisites
    for (const prereq of selectedOption.prerequisites) {
      // In a real implementation, this would check if prerequisites are met
      // For now, we'll just log them
      Logger.debug(`Prerequisite required: ${prereq}`);
    }

    // Check risk level confirmation for high-risk choices
    if (this.options.requireConfirmationForHighRisk && 
        selectedOption.riskLevel === 'HIGH' && 
        choice.confidence < 70) {
      warnings.push('High-risk option selected with low confidence');
    }

    // Validate custom parameters if provided
    if (choice.customParameters && selectedOption.type === 'customize') {
      const paramValidation = this.validateCustomParameters(selectedOption, choice.customParameters);
      errors.push(...paramValidation.errors);
      warnings.push(...paramValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute the actions associated with a user choice
   */
  async executeChoice(
    prompt: ConfigurationPrompt, 
    choice: UserChoice,
    dryRun: boolean = false
  ): Promise<{
    success: boolean;
    executedActions: ConfigurationAction[];
    errors: string[];
    rollbackActions: ConfigurationAction[];
  }> {
    const selectedOption = prompt.options.find(o => o.id === choice.optionId);
    if (!selectedOption) {
      return {
        success: false,
        executedActions: [],
        errors: [`Option not found: ${choice.optionId}`],
        rollbackActions: []
      };
    }

    Logger.info(`${dryRun ? '🧪 Dry run: ' : '⚡ Executing: '}${selectedOption.label}`);

    const executedActions: ConfigurationAction[] = [];
    const errors: string[] = [];
    const rollbackActions: ConfigurationAction[] = [];

    for (const action of selectedOption.actions) {
      try {
        const result = await this.executeAction(action, choice.customParameters || {}, dryRun);
        
        if (result.success) {
          executedActions.push(action);
          if (action.rollbackAction) {
            rollbackActions.unshift(action.rollbackAction); // Add to front for reverse order
          }
        } else {
          errors.push(`Action failed: ${action.description} - ${result.error}`);
          break; // Stop on first failure
        }
      } catch (error: any) {
        errors.push(`Action error: ${action.description} - ${error.message}`);
        break;
      }
    }

    return {
      success: errors.length === 0,
      executedActions,
      errors,
      rollbackActions
    };
  }

  /**
   * Get the current session status
   */
  getSessionStatus(sessionId: string): ConfigurationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): ConfigurationSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'in_progress');
  }

  /**
   * Cleanup completed sessions
   */
  cleanupSessions(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [sessionId, session] of this.sessions) {
      if (session.status !== 'in_progress' && session.startTime < cutoffTime) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Private: Initialize readline interface
   */
  private initializeReadline(): void {
    this.readline = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Private: Group related schema changes for batch processing
   */
  private groupRelatedChanges(changes: SchemaChange[]): SchemaChange[][] {
    const groups: Map<string, SchemaChange[]> = new Map();

    for (const change of changes) {
      const groupKey = change.tableName || 'global';
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(change);
    }

    return Array.from(groups.values());
  }

  /**
   * Private: Generate prompt for schema changes
   */
  private generateSchemaChangePrompt(
    changes: SchemaChange[],
    impacts: ConfigurationImpact[]
  ): ConfigurationPrompt | null {
    if (changes.length === 0) return null;

    const change = changes[0];
    const relatedImpacts = impacts.filter(i => 
      i.changes.some(c => changes.some(ch => ch.id === `change-${c.field}`))
    );

    const options: ConfigurationOption[] = [];

    // Accept option
    if (change.impact !== 'DATA_LOSS') {
      options.push({
        id: 'accept',
        label: 'Accept Changes',
        description: 'Apply the schema changes and update configurations automatically',
        type: 'accept',
        consequences: [
          'Configuration files will be updated',
          'Seed data may need regeneration'
        ],
        prerequisites: [],
        actions: [
          {
            type: 'file_update',
            description: 'Update configuration files',
            targetPath: 'supa-seed.config.js',
            parameters: { changes }
          }
        ],
        reversible: true,
        riskLevel: change.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'
      });
    }

    // Customize option
    options.push({
      id: 'customize',
      label: 'Customize Changes',
      description: 'Manually review and customize how changes are applied',
      type: 'customize',
      consequences: [
        'Manual configuration required',
        'Extended setup time'
      ],
      prerequisites: ['User input required'],
      actions: [
        {
          type: 'user_input',
          description: 'Collect customization preferences',
          targetPath: '',
          parameters: { prompt: 'customization' }
        }
      ],
      reversible: true,
      riskLevel: 'LOW'
    });

    // Defer option
    options.push({
      id: 'defer',
      label: 'Defer Changes',
      description: 'Skip these changes for now (can be applied later)',
      type: 'defer',
      consequences: [
        'Configuration remains unchanged',
        'Manual intervention may be required later'
      ],
      prerequisites: [],
      actions: [],
      reversible: true,
      riskLevel: 'LOW'
    });

    return {
      id: `schema-change-${change.id}`,
      type: 'schema_change',
      title: `Schema Change: ${change.description}`,
      description: `${change.description}\n\nSeverity: ${change.severity}, Impact: ${change.impact}`,
      context: {
        affectedFiles: relatedImpacts.map(i => i.configFile),
        schemaChanges: changes,
        migrationSuggestions: [],
        impactAnalysis: relatedImpacts,
        estimatedEffort: changes.length > 5 ? 'HIGH' : changes.length > 2 ? 'MEDIUM' : 'LOW'
      },
      options,
      defaultOption: change.severity === 'LOW' ? 'accept' : 'customize',
      required: change.migrationRequired,
      dependencies: [],
      metadata: {
        priority: change.severity as any,
        riskLevel: change.impact === 'BREAKING' ? 'HIGH' : change.impact === 'COMPATIBLE' ? 'LOW' : 'MEDIUM',
        reversible: !change.dataBackupRequired,
        estimatedTime: changes.length * 5 // 5 minutes per change
      }
    };
  }

  /**
   * Private: Generate prompt for migration suggestions
   */
  private generateMigrationPrompt(
    suggestion: MigrationSuggestion,
    changes: SchemaChange[],
    impacts: ConfigurationImpact[]
  ): ConfigurationPrompt | null {
    if (suggestion.type === 'AUTOMATIC') {
      // Skip prompts for automatic migrations in most cases
      return null;
    }

    const options: ConfigurationOption[] = [];

    // Execute option
    options.push({
      id: 'execute',
      label: `Execute ${suggestion.title}`,
      description: suggestion.description,
      type: 'accept',
      consequences: suggestion.steps.map(s => s.description),
      prerequisites: suggestion.prerequisites,
      actions: suggestion.steps.map(step => ({
        type: step.type.toLowerCase() as any,
        description: step.description,
        targetPath: step.configPath || '',
        parameters: step.configChanges || {},
        validation: step.validation ? {
          type: 'semantic' as const,
          command: step.validation,
          expectedOutcome: 'success'
        } : undefined
      })),
      reversible: suggestion.rollbackPlan.length > 0,
      riskLevel: suggestion.riskLevel
    });

    // Skip option
    options.push({
      id: 'skip',
      label: 'Skip Migration',
      description: 'Skip this migration and handle manually later',
      type: 'skip',
      consequences: ['Manual migration required later'],
      prerequisites: [],
      actions: [],
      reversible: true,
      riskLevel: 'LOW'
    });

    return {
      id: `migration-${suggestion.id}`,
      type: 'migration_suggestion',
      title: suggestion.title,
      description: suggestion.description,
      context: {
        affectedFiles: [],
        schemaChanges: changes.filter(c => suggestion.affectedChanges.includes(c.id)),
        migrationSuggestions: [suggestion],
        impactAnalysis: impacts,
        estimatedEffort: suggestion.estimatedTime > 60 ? 'HIGH' : suggestion.estimatedTime > 30 ? 'MEDIUM' : 'LOW'
      },
      options,
      defaultOption: suggestion.type === 'SEMI_AUTOMATIC' ? 'execute' : 'skip',
      required: suggestion.priority === 'CRITICAL',
      dependencies: [],
      metadata: {
        priority: suggestion.priority,
        riskLevel: suggestion.riskLevel,
        reversible: suggestion.rollbackPlan.length > 0,
        estimatedTime: suggestion.estimatedTime
      }
    };
  }

  /**
   * Private: Generate prompt for impact resolution
   */
  private generateImpactResolutionPrompt(
    impact: ConfigurationImpact,
    changes: SchemaChange[]
  ): ConfigurationPrompt | null {
    if (!impact.migrationNeeded) return null;

    const options: ConfigurationOption[] = [];

    // Auto-resolve option
    options.push({
      id: 'auto-resolve',
      label: 'Auto-resolve Impact',
      description: 'Automatically resolve configuration impacts',
      type: 'accept',
      consequences: ['Configuration will be updated automatically'],
      prerequisites: [],
      actions: [{
        type: 'file_update',
        description: `Update ${impact.configFile}`,
        targetPath: impact.configFile,
        parameters: { changes: impact.changes }
      }],
      reversible: true,
      riskLevel: impact.estimatedEffort === 'HIGH' ? 'HIGH' : 'MEDIUM'
    });

    // Manual review option
    options.push({
      id: 'manual-review',
      label: 'Manual Review',
      description: 'Manually review and resolve configuration impacts',
      type: 'customize',
      consequences: ['Manual configuration editing required'],
      prerequisites: ['File editing access'],
      actions: [{
        type: 'user_input',
        description: 'Open file for manual editing',
        targetPath: impact.configFile,
        parameters: { action: 'edit' }
      }],
      reversible: true,
      riskLevel: 'LOW'
    });

    return {
      id: `impact-${impact.configFile.replace(/[^a-zA-Z0-9]/g, '-')}`,
      type: 'impact_resolution',
      title: `Configuration Impact: ${path.basename(impact.configFile)}`,
      description: `Configuration file needs updates due to schema changes.\nAffected sections: ${impact.affectedSections.join(', ')}`,
      context: {
        affectedFiles: [impact.configFile],
        schemaChanges: changes,
        migrationSuggestions: [],
        impactAnalysis: [impact],
        estimatedEffort: impact.estimatedEffort
      },
      options,
      defaultOption: impact.estimatedEffort === 'LOW' ? 'auto-resolve' : 'manual-review',
      required: true,
      dependencies: [],
      metadata: {
        priority: impact.estimatedEffort === 'HIGH' ? 'HIGH' : 'MEDIUM',
        riskLevel: impact.backupRecommended ? 'HIGH' : 'MEDIUM',
        reversible: true,
        estimatedTime: impact.estimatedEffort === 'HIGH' ? 30 : impact.estimatedEffort === 'MEDIUM' ? 15 : 5
      }
    };
  }

  /**
   * Private: Sort prompts by priority and dependencies
   */
  private sortPromptsByPriority(prompts: ConfigurationPrompt[]): ConfigurationPrompt[] {
    const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    
    return prompts.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.metadata.priority] - priorityOrder[a.metadata.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by required status
      if (a.required !== b.required) return a.required ? -1 : 1;
      
      // Then by estimated time (shorter first)
      return a.metadata.estimatedTime - b.metadata.estimatedTime;
    });
  }

  /**
   * Private: Extract affected files from impacts
   */
  private extractAffectedFiles(impacts: ConfigurationImpact[]): string[] {
    return [...new Set(impacts.map(i => i.configFile))];
  }

  /**
   * Private: Run interactive session
   */
  private async runInteractiveSession(session: ConfigurationSession): Promise<void> {
    console.log(`\n🚀 Starting Configuration Session`);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Prompts: ${session.prompts.length}`);
    console.log(`   Estimated Time: ${session.metadata.estimatedTotalTime} minutes`);

    for (const prompt of session.prompts) {
      try {
        const choice = await this.presentPrompt(prompt);
        const validation = this.validateChoice(prompt, choice);

        if (!validation.isValid) {
          console.log(`\n❌ Invalid choice: ${validation.errors.join(', ')}`);
          continue; // Re-prompt
        }

        if (validation.warnings.length > 0) {
          console.log(`\n⚠️  Warnings: ${validation.warnings.join(', ')}`);
        }

        session.choices.push(choice);
        session.metadata.completedPrompts++;

        // Execute the choice if not in dry-run mode
        if (this.options.interactiveMode) {
          const execution = await this.executeChoice(prompt, choice, false);
          if (!execution.success) {
            console.log(`\n❌ Execution failed: ${execution.errors.join(', ')}`);
          } else {
            console.log(`\n✅ Successfully executed: ${execution.executedActions.length} actions`);
          }
        }

      } catch (error: any) {
        Logger.error(`Prompt failed: ${prompt.id} - ${error.message}`);
      }
    }

    session.status = 'completed';
    session.endTime = new Date();
    session.metadata.actualTime = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000 / 60);

    console.log(`\n🎉 Configuration session completed!`);
    console.log(`   Total time: ${session.metadata.actualTime} minutes`);
    console.log(`   Choices made: ${session.choices.length}/${session.prompts.length}`);

    if (this.options.saveChoices) {
      await this.saveSession(session);
    }
  }

  /**
   * Private: Get user choice through readline
   */
  private async getUserChoice(prompt: ConfigurationPrompt): Promise<UserChoice> {
    if (!this.readline) {
      throw new Error('Readline not initialized for interactive mode');
    }

    return new Promise((resolve) => {
      const question = `\n👤 Select option (1-${prompt.options.length})${prompt.defaultOption ? ` [default: ${prompt.options.findIndex(o => o.id === prompt.defaultOption) + 1}]` : ''}: `;
      
      this.readline!.question(question, (answer) => {
        const selection = answer.trim();
        let optionIndex: number;

        if (selection === '' && prompt.defaultOption) {
          optionIndex = prompt.options.findIndex(o => o.id === prompt.defaultOption);
        } else {
          optionIndex = parseInt(selection) - 1;
        }

        if (optionIndex >= 0 && optionIndex < prompt.options.length) {
          const selectedOption = prompt.options[optionIndex];
          
          // Ask for confidence level
          this.readline!.question(`\n🎯 Confidence level (1-100) [80]: `, (confidenceAnswer) => {
            const confidence = confidenceAnswer.trim() === '' ? 80 : parseInt(confidenceAnswer) || 80;
            
            resolve({
              promptId: prompt.id,
              optionId: selectedOption.id,
              timestamp: new Date(),
              confidence: Math.max(1, Math.min(100, confidence))
            });
          });
        } else {
          console.log(`\n❌ Invalid selection. Please choose 1-${prompt.options.length}.`);
          // Recursively ask again
          this.getUserChoice(prompt).then(resolve);
        }
      });
    });
  }

  /**
   * Private: Validate custom parameters
   */
  private validateCustomParameters(
    option: ConfigurationOption,
    parameters: Record<string, any>
  ): { errors: string[]; warnings: string[] } {
    // Basic validation - in a real implementation this would be more sophisticated
    return {
      errors: [],
      warnings: Object.keys(parameters).length === 0 ? ['No custom parameters provided'] : []
    };
  }

  /**
   * Private: Execute a single configuration action
   */
  private async executeAction(
    action: ConfigurationAction,
    customParams: Record<string, any>,
    dryRun: boolean
  ): Promise<{ success: boolean; error?: string }> {
    Logger.debug(`${dryRun ? 'Dry run: ' : 'Executing:'} ${action.type} - ${action.description}`);

    if (dryRun) {
      return { success: true };
    }

    try {
      switch (action.type) {
        case 'file_update':
          return await this.executeFileUpdate(action, customParams);
        case 'file_create':
          return await this.executeFileCreate(action, customParams);
        case 'file_backup':
          return await this.executeFileBackup(action, customParams);
        case 'validation':
          return await this.executeValidation(action, customParams);
        case 'user_input':
          return { success: true }; // User input already collected
        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Private: Execute file update action
   */
  private async executeFileUpdate(
    action: ConfigurationAction,
    customParams: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    // Placeholder implementation - would update configuration files
    Logger.info(`Would update file: ${action.targetPath}`);
    return { success: true };
  }

  /**
   * Private: Execute file create action
   */
  private async executeFileCreate(
    action: ConfigurationAction,
    customParams: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    // Placeholder implementation - would create new files
    Logger.info(`Would create file: ${action.targetPath}`);
    return { success: true };
  }

  /**
   * Private: Execute file backup action
   */
  private async executeFileBackup(
    action: ConfigurationAction,
    customParams: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    // Placeholder implementation - would backup files
    Logger.info(`Would backup file: ${action.targetPath}`);
    return { success: true };
  }

  /**
   * Private: Execute validation action
   */
  private async executeValidation(
    action: ConfigurationAction,
    customParams: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    // Placeholder implementation - would run validation
    Logger.info(`Would validate: ${action.description}`);
    return { success: true };
  }

  /**
   * Private: Save session to disk
   */
  private async saveSession(session: ConfigurationSession): Promise<void> {
    const sessionFile = path.join(process.cwd(), '.supa-seed', 'sessions', `${session.id}.json`);
    const sessionDir = path.dirname(sessionFile);

    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
    Logger.info(`💾 Configuration session saved: ${sessionFile}`);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = undefined;
    }
    this.cleanupSessions();
  }
}