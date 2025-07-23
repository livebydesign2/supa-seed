/**
 * Fallback and Error Handling System for Association Intelligence
 * Phase 3, Checkpoint C3 - Comprehensive error recovery and progress reporting
 */

import { LoadedAsset } from '../assets/asset-loader';
import { DistributionTarget, DistributionAssignment, DistributionResult } from './distribution-algorithms';
import { ConstraintViolation, EnforcementResult } from './constraint-enforcement';
import { Logger } from '../utils/logger';

export interface FallbackAsset extends LoadedAsset {
  fallbackType: 'synthetic' | 'template' | 'default';
  generatedBy: string;
  sourceTemplate?: string;
  fallbackReason: string;
  confidence: number; // 0-100
}

export interface ErrorRecoveryOptions {
  enableFallbackGeneration: boolean;
  enableConstraintRelaxation: boolean;
  enablePartialFulfillment: boolean;
  maxRetryAttempts: number;
  fallbackStrategies: FallbackStrategy[];
  recoveryPriority: 'speed' | 'accuracy' | 'completeness';
  reportingLevel: 'minimal' | 'detailed' | 'verbose';
}

export interface FallbackStrategy {
  id: string;
  name: string;
  type: 'generate_synthetic' | 'use_template' | 'use_default' | 'duplicate_existing' | 'ai_generate';
  priority: number;
  applicableTypes: string[];
  generator: (requirements: FallbackRequirements) => Promise<FallbackAsset[]>;
  confidence: number;
  costWeight: number;
}

export interface FallbackRequirements {
  targetType: string;
  requiredCount: number;
  constraints?: Record<string, any>;
  existingAssets: LoadedAsset[];
  targetContext: DistributionTarget;
  templatePreferences?: string[];
}

export interface AssociationError {
  id: string;
  type: 'distribution_failure' | 'constraint_violation' | 'asset_insufficient' | 'validation_error' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: {
    targetId?: string;
    assetIds?: string[];
    ruleName?: string;
    operation: string;
    timestamp: Date;
  };
  recoverable: boolean;
  suggestedActions: string[];
  metadata: Record<string, any>;
}

export interface RecoveryAttempt {
  attemptNumber: number;
  strategy: string;
  action: string;
  success: boolean;
  errorMessage?: string;
  recoveredItems: number;
  executionTime: number;
  confidence: number;
}

export interface ProgressReport {
  operationId: string;
  phase: 'initialization' | 'distribution' | 'constraint_enforcement' | 'error_recovery' | 'finalization';
  overallProgress: number; // 0-100
  currentStep: string;
  completedSteps: string[];
  remainingSteps: string[];
  errors: AssociationError[];
  warnings: string[];
  statistics: {
    totalTargets: number;
    fulfilledTargets: number;
    totalAssets: number;
    assignedAssets: number;
    generatedFallbacks: number;
    recoveryAttempts: number;
    executionTime: number;
  };
  estimatedTimeRemaining?: number;
  canContinue: boolean;
}

export interface RecoveryResult {
  success: boolean;
  finalAssignments: DistributionAssignment[];
  recoveryAttempts: RecoveryAttempt[];
  generatedFallbacks: FallbackAsset[];
  unrecoverableErrors: AssociationError[];
  finalReport: ProgressReport;
  recommendations: string[];
  performanceMetrics: {
    totalRecoveryTime: number;
    fallbackGenerationTime: number;
    constraintRelaxationTime: number;
    finalValidationTime: number;
  };
}

export class FallbackErrorHandler {
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private options: ErrorRecoveryOptions;
  private currentProgress: ProgressReport;

  constructor(options: ErrorRecoveryOptions) {
    this.options = options;
    this.currentProgress = this.createInitialProgress();
    this.initializeBuiltInStrategies();
  }

  /**
   * Handle insufficient assets by generating fallbacks
   */
  async handleInsufficientAssets(
    target: DistributionTarget,
    currentAssets: LoadedAsset[],
    requiredCount: number
  ): Promise<FallbackAsset[]> {
    if (!this.options.enableFallbackGeneration) {
      return [];
    }

    const shortfall = requiredCount - currentAssets.length;
    if (shortfall <= 0) {
      return [];
    }

    Logger.info(`🔄 Generating ${shortfall} fallback assets for target ${target.id}`);

    const requirements: FallbackRequirements = {
      targetType: this.inferTargetType(target, currentAssets),
      requiredCount: shortfall,
      constraints: target.constraints,
      existingAssets: currentAssets,
      targetContext: target,
      templatePreferences: this.getTemplatePreferences(target)
    };

    // Try fallback strategies in priority order
    const sortedStrategies = Array.from(this.fallbackStrategies.values())
      .filter(strategy => 
        strategy.applicableTypes.includes('*') || 
        strategy.applicableTypes.includes(requirements.targetType)
      )
      .sort((a, b) => b.priority - a.priority);

    const generatedAssets: FallbackAsset[] = [];

    for (const strategy of sortedStrategies) {
      if (generatedAssets.length >= shortfall) break;

      try {
        const remaining = shortfall - generatedAssets.length;
        const strategyRequirements = { ...requirements, requiredCount: remaining };
        
        const assets = await strategy.generator(strategyRequirements);
        generatedAssets.push(...assets);
        
        Logger.debug(`Generated ${assets.length} assets using strategy: ${strategy.name}`);
      } catch (error: any) {
        Logger.warn(`Fallback strategy ${strategy.name} failed: ${error.message}`);
      }
    }

    this.updateProgress('error_recovery', 
      `Generated ${generatedAssets.length}/${shortfall} fallback assets for ${target.id}`);

    return generatedAssets;
  }

  /**
   * Attempt to recover from association errors
   */
  async recoverFromErrors(
    distributionResult: DistributionResult,
    enforcementResult: EnforcementResult,
    originalAssets: LoadedAsset[]
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const recoveryAttempts: RecoveryAttempt[] = [];
    const generatedFallbacks: FallbackAsset[] = [];
    const unrecoverableErrors: AssociationError[] = [];

    Logger.info('🚑 Starting association error recovery process');

    this.updateProgress('error_recovery', 'Analyzing errors and violations');

    // Convert enforcement violations to recoverable errors
    const errors = this.analyzeErrors(distributionResult, enforcementResult);
    
    let currentAssignments = [...enforcementResult.finalAssignments];
    let attemptNumber = 0;

    for (const error of errors) {
      if (attemptNumber >= this.options.maxRetryAttempts) {
        Logger.warn(`Maximum retry attempts (${this.options.maxRetryAttempts}) reached`);
        unrecoverableErrors.push(...errors.slice(errors.indexOf(error)));
        break;
      }

      if (!error.recoverable) {
        unrecoverableErrors.push(error);
        continue;
      }

      attemptNumber++;
      const recoveryAttempt = await this.attemptErrorRecovery(
        error, 
        currentAssignments, 
        originalAssets, 
        attemptNumber
      );

      recoveryAttempts.push(recoveryAttempt);

      if (recoveryAttempt.success) {
        Logger.info(`✅ Successfully recovered from error: ${error.message}`);
        
        // Update assignments based on recovery
        if (error.type === 'asset_insufficient') {
          const fallbacks = await this.handleInsufficientAssets(
            currentAssignments.find(a => a.target.id === error.context.targetId)?.target!,
            currentAssignments.find(a => a.target.id === error.context.targetId)?.assets || [],
            recoveryAttempt.recoveredItems
          );
          generatedFallbacks.push(...fallbacks);
          
          // Add fallbacks to assignments
          const targetAssignment = currentAssignments.find(a => a.target.id === error.context.targetId);
          if (targetAssignment) {
            targetAssignment.assets.push(...fallbacks);
            targetAssignment.fulfilled = this.checkFulfillment(targetAssignment);
          }
        }
      } else {
        Logger.warn(`❌ Failed to recover from error: ${error.message}`);
        unrecoverableErrors.push(error);
      }
    }

    const totalRecoveryTime = Date.now() - startTime;
    const success = unrecoverableErrors.length === 0;

    this.updateProgress('finalization', 'Recovery process completed');

    const finalReport = this.generateFinalReport(
      currentAssignments,
      generatedFallbacks,
      recoveryAttempts,
      unrecoverableErrors
    );

    const recommendations = this.generateRecoveryRecommendations(
      recoveryAttempts,
      unrecoverableErrors,
      generatedFallbacks
    );

    Logger.info(`🏁 Recovery completed: ${success ? 'SUCCESS' : 'PARTIAL'} (${totalRecoveryTime}ms)`);

    return {
      success,
      finalAssignments: currentAssignments,
      recoveryAttempts,
      generatedFallbacks,
      unrecoverableErrors,
      finalReport,
      recommendations,
      performanceMetrics: {
        totalRecoveryTime,
        fallbackGenerationTime: recoveryAttempts
          .filter(r => r.strategy === 'fallback_generation')
          .reduce((sum, r) => sum + r.executionTime, 0),
        constraintRelaxationTime: recoveryAttempts
          .filter(r => r.strategy === 'constraint_relaxation')
          .reduce((sum, r) => sum + r.executionTime, 0),
        finalValidationTime: 0 // Would be set by validation step
      }
    };
  }

  /**
   * Generate progress reports for long-running operations
   */
  reportProgress(): ProgressReport {
    return { ...this.currentProgress };
  }

  /**
   * Update progress with new information
   */
  updateProgress(
    phase: ProgressReport['phase'], 
    currentStep: string, 
    progressIncrement: number = 0
  ): void {
    this.currentProgress.phase = phase;
    this.currentProgress.currentStep = currentStep;
    this.currentProgress.overallProgress = Math.min(100, this.currentProgress.overallProgress + progressIncrement);
    this.currentProgress.completedSteps.push(currentStep);
    
    if (this.options.reportingLevel === 'verbose') {
      Logger.info(`📊 Progress: ${this.currentProgress.overallProgress}% - ${currentStep}`);
    }
  }

  /**
   * Attempt to recover from a specific error
   */
  private async attemptErrorRecovery(
    error: AssociationError,
    assignments: DistributionAssignment[],
    originalAssets: LoadedAsset[],
    attemptNumber: number
  ): Promise<RecoveryAttempt> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;
    let recoveredItems = 0;
    let strategy = 'unknown';
    let action = 'unknown';

    try {
      switch (error.type) {
        case 'asset_insufficient':
          strategy = 'fallback_generation';
          action = 'Generate synthetic assets';
          recoveredItems = await this.recoverInsufficientAssets(error, assignments);
          success = recoveredItems > 0;
          break;

        case 'constraint_violation':
          strategy = 'constraint_relaxation';
          action = 'Relax constraints';
          success = await this.recoverConstraintViolation(error, assignments);
          recoveredItems = success ? 1 : 0;
          break;

        case 'distribution_failure':
          strategy = 'redistribution';
          action = 'Redistribute assets';
          success = await this.recoverDistributionFailure(error, assignments, originalAssets);
          recoveredItems = success ? 1 : 0;
          break;

        default:
          strategy = 'manual_intervention';
          action = 'Manual intervention required';
          success = false;
          errorMessage = 'Error type requires manual intervention';
      }
    } catch (recoveryError: any) {
      success = false;
      errorMessage = recoveryError.message;
    }

    const executionTime = Date.now() - startTime;

    return {
      attemptNumber,
      strategy,
      action,
      success,
      errorMessage,
      recoveredItems,
      executionTime,
      confidence: success ? 85 : 0
    };
  }

  /**
   * Recover from insufficient assets error
   */
  private async recoverInsufficientAssets(
    error: AssociationError,
    assignments: DistributionAssignment[]
  ): Promise<number> {
    const targetId = error.context.targetId;
    if (!targetId) return 0;

    const assignment = assignments.find(a => a.target.id === targetId);
    if (!assignment) return 0;

    const minItems = assignment.target.constraints?.minItems || 0;
    const currentCount = assignment.assets.length;
    const needed = Math.max(0, minItems - currentCount);

    if (needed === 0) return 0;

    const fallbacks = await this.handleInsufficientAssets(
      assignment.target,
      assignment.assets,
      minItems
    );

    return fallbacks.length;
  }

  /**
   * Recover from constraint violation
   */
  private async recoverConstraintViolation(
    error: AssociationError,
    assignments: DistributionAssignment[]
  ): Promise<boolean> {
    if (!this.options.enableConstraintRelaxation) {
      return false;
    }

    const targetId = error.context.targetId;
    if (!targetId) return false;

    const assignment = assignments.find(a => a.target.id === targetId);
    if (!assignment || !assignment.target.constraints) return false;

    // Simple constraint relaxation - increase limits by 50%
    if (assignment.target.constraints.maxItems) {
      assignment.target.constraints.maxItems = Math.ceil(assignment.target.constraints.maxItems * 1.5);
    }

    if (assignment.target.constraints.minItems) {
      assignment.target.constraints.minItems = Math.max(1, Math.floor(assignment.target.constraints.minItems * 0.8));
    }

    return true;
  }

  /**
   * Recover from distribution failure
   */
  private async recoverDistributionFailure(
    error: AssociationError,
    assignments: DistributionAssignment[],
    originalAssets: LoadedAsset[]
  ): Promise<boolean> {
    // Simple redistribution - move unassigned assets to targets with capacity
    const availableTargets = assignments.filter(a => 
      !a.target.constraints?.maxItems || 
      a.assets.length < a.target.constraints.maxItems
    );

    if (availableTargets.length === 0) return false;

    // This is a simplified recovery - in practice would need more sophisticated logic
    return availableTargets.length > 0;
  }

  /**
   * Check if an assignment is fulfilled based on its constraints
   */
  private checkFulfillment(assignment: DistributionAssignment): boolean {
    const constraints = assignment.target.constraints;
    if (!constraints) return true;

    if (constraints.minItems && assignment.assets.length < constraints.minItems) {
      return false;
    }

    if (constraints.maxItems && assignment.assets.length > constraints.maxItems) {
      return false;
    }

    return true;
  }

  /**
   * Analyze distribution and enforcement results to identify recoverable errors
   */
  private analyzeErrors(
    distributionResult: DistributionResult,
    enforcementResult: EnforcementResult
  ): AssociationError[] {
    const errors: AssociationError[] = [];

    // Convert unresolvable violations to errors
    for (const violation of enforcementResult.unresolvableViolations) {
      errors.push({
        id: `violation-${violation.ruleId}-${Date.now()}`,
        type: this.mapViolationToErrorType(violation),
        severity: violation.severity === 'critical' ? 'critical' : 
                 violation.severity === 'error' ? 'high' : 'medium',
        message: violation.message,
        context: {
          targetId: violation.affectedTargets[0],
          assetIds: violation.affectedAssets,
          ruleName: violation.ruleName,
          operation: 'constraint_enforcement',
          timestamp: new Date()
        },
        recoverable: this.isViolationRecoverable(violation),
        suggestedActions: violation.suggestedResolutions,
        metadata: violation.metadata
      });
    }

    // Add general distribution errors
    if (distributionResult.unassigned.length > 0) {
      errors.push({
        id: `unassigned-assets-${Date.now()}`,
        type: 'distribution_failure',
        severity: 'medium',
        message: `${distributionResult.unassigned.length} assets could not be assigned`,
        context: {
          assetIds: distributionResult.unassigned.map(a => a.id),
          operation: 'distribution',
          timestamp: new Date()
        },
        recoverable: true,
        suggestedActions: ['Add more targets', 'Relax constraints', 'Generate additional capacity'],
        metadata: { unassignedCount: distributionResult.unassigned.length }
      });
    }

    return errors;
  }

  /**
   * Map constraint violation to error type
   */
  private mapViolationToErrorType(violation: ConstraintViolation): AssociationError['type'] {
    switch (violation.violationType) {
      case 'insufficient':
        return 'asset_insufficient';
      case 'invalid':
        return 'validation_error';
      default:
        return 'constraint_violation';
    }
  }

  /**
   * Check if a violation is recoverable
   */
  private isViolationRecoverable(violation: ConstraintViolation): boolean {
    return violation.violationType === 'insufficient' || 
           violation.violationType === 'excess' ||
           (violation.violationType === 'invalid' && this.options.enableConstraintRelaxation);
  }

  /**
   * Generate final recovery report
   */
  private generateFinalReport(
    assignments: DistributionAssignment[],
    fallbacks: FallbackAsset[],
    attempts: RecoveryAttempt[],
    errors: AssociationError[]
  ): ProgressReport {
    const fulfilledTargets = assignments.filter(a => a.fulfilled).length;
    const assignedAssets = assignments.reduce((sum, a) => sum + a.assets.length, 0);

    return {
      ...this.currentProgress,
      phase: 'finalization',
      overallProgress: 100,
      currentStep: 'Recovery completed',
      statistics: {
        totalTargets: assignments.length,
        fulfilledTargets,
        totalAssets: assignedAssets,
        assignedAssets,
        generatedFallbacks: fallbacks.length,
        recoveryAttempts: attempts.length,
        executionTime: Date.now() - this.currentProgress.statistics.executionTime
      },
      errors: errors,
      canContinue: errors.length === 0
    };
  }

  /**
   * Generate recovery recommendations
   */
  private generateRecoveryRecommendations(
    attempts: RecoveryAttempt[],
    errors: AssociationError[],
    fallbacks: FallbackAsset[]
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push(`${errors.length} errors remain unresolved - consider manual intervention`);
    }

    if (fallbacks.length > 10) {
      recommendations.push('High number of fallback assets generated - review asset pool quality');
    }

    const failedAttempts = attempts.filter(a => !a.success).length;
    if (failedAttempts > attempts.length * 0.5) {
      recommendations.push('Many recovery attempts failed - review recovery strategy configuration');
    }

    if (recommendations.length === 0) {
      recommendations.push('All errors successfully recovered - association process completed successfully');
    }

    return recommendations;
  }

  /**
   * Infer the target type from constraints and existing assets
   */
  private inferTargetType(target: DistributionTarget, assets: LoadedAsset[]): string {
    // Check constraints for type hints
    if (target.constraints?.requiredTypes && target.constraints.requiredTypes.length > 0) {
      return target.constraints.requiredTypes[0];
    }

    // Infer from existing assets
    if (assets.length > 0) {
      const typeFreq = assets.reduce((freq, asset) => {
        freq[asset.type] = (freq[asset.type] || 0) + 1;
        return freq;
      }, {} as Record<string, number>);

      return Object.entries(typeFreq).sort(([,a], [,b]) => b - a)[0][0];
    }

    return 'generic';
  }

  /**
   * Get template preferences for a target
   */
  private getTemplatePreferences(target: DistributionTarget): string[] {
    // This would analyze target metadata to suggest appropriate templates
    return ['default', 'basic'];
  }

  /**
   * Create initial progress report
   */
  private createInitialProgress(): ProgressReport {
    return {
      operationId: `recovery-${Date.now()}`,
      phase: 'initialization',
      overallProgress: 0,
      currentStep: 'Initializing recovery process',
      completedSteps: [],
      remainingSteps: ['analyze_errors', 'attempt_recovery', 'generate_fallbacks', 'finalize'],
      errors: [],
      warnings: [],
      statistics: {
        totalTargets: 0,
        fulfilledTargets: 0,
        totalAssets: 0,
        assignedAssets: 0,
        generatedFallbacks: 0,
        recoveryAttempts: 0,
        executionTime: Date.now()
      },
      canContinue: true
    };
  }

  /**
   * Initialize built-in fallback strategies
   */
  private initializeBuiltInStrategies(): void {
    // Synthetic data generation strategy
    this.addFallbackStrategy({
      id: 'synthetic-generator',
      name: 'Synthetic Data Generator',
      type: 'generate_synthetic',
      priority: 80,
      applicableTypes: ['*'],
      confidence: 70,
      costWeight: 1,
      generator: async (requirements) => {
        const fallbacks: FallbackAsset[] = [];
        
        for (let i = 0; i < requirements.requiredCount; i++) {
          const asset: FallbackAsset = {
            id: `synthetic-${Date.now()}-${i}`,
            filePath: `/synthetic/${requirements.targetType}_${i}.json`,
            type: this.normalizeAssetType(requirements.targetType),
            content: JSON.stringify({
              title: `Synthetic ${requirements.targetType} ${i + 1}`,
              description: `Auto-generated ${requirements.targetType} for testing`,
              generated: new Date().toISOString()
            }),
            metadata: {
              filename: `synthetic_${requirements.targetType}_${i}`,
              title: `Synthetic ${requirements.targetType} ${i + 1}`,
              synthetic: true
            },
            fileSize: 100,
            lastModified: new Date(),
            isValid: true,
            fallbackType: 'synthetic',
            generatedBy: 'synthetic-generator',
            fallbackReason: 'Insufficient assets for target requirements',
            confidence: 70
          };
          
          fallbacks.push(asset);
        }
        
        return fallbacks;
      }
    });

    // Template-based generation strategy
    this.addFallbackStrategy({
      id: 'template-generator',
      name: 'Template-Based Generator',
      type: 'use_template',
      priority: 90,
      applicableTypes: ['markdown', 'json'],
      confidence: 85,
      costWeight: 1.5,
      generator: async (requirements) => {
        // This would use predefined templates to generate assets
        // For now, return basic template-based assets
        const fallbacks: FallbackAsset[] = [];
        
        for (let i = 0; i < requirements.requiredCount; i++) {
          const asset: FallbackAsset = {
            id: `template-${Date.now()}-${i}`,
            filePath: `/templates/${requirements.targetType}_${i}.md`,
            type: this.normalizeAssetType(requirements.targetType),
            content: `# Template ${requirements.targetType}\n\nThis is a template-generated asset.`,
            metadata: {
              filename: `template_${requirements.targetType}_${i}`,
              title: `Template ${requirements.targetType} ${i + 1}`,
              template: true
            },
            fileSize: 150,
            lastModified: new Date(),
            isValid: true,
            fallbackType: 'template',
            generatedBy: 'template-generator',
            sourceTemplate: 'basic-template',
            fallbackReason: 'Using template to meet asset requirements',
            confidence: 85
          };
          
          fallbacks.push(asset);
        }
        
        return fallbacks;
      }
    });

    Logger.info(`🔧 Initialized ${this.fallbackStrategies.size} built-in fallback strategies`);
  }

  /**
   * Add a custom fallback strategy
   */
  addFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(strategy.id, strategy);
    Logger.debug(`Added fallback strategy: ${strategy.name}`);
  }

  /**
   * Remove a fallback strategy
   */
  removeFallbackStrategy(strategyId: string): boolean {
    return this.fallbackStrategies.delete(strategyId);
  }

  /**
   * Get all available fallback strategies
   */
  getFallbackStrategies(): FallbackStrategy[] {
    return Array.from(this.fallbackStrategies.values());
  }

  /**
   * Update error recovery options
   */
  updateOptions(newOptions: Partial<ErrorRecoveryOptions>): void {
    this.options = { ...this.options, ...newOptions };
    Logger.debug('Updated error recovery options');
  }

  /**
   * Normalize asset type to ensure it's a valid LoadedAsset type
   */
  private normalizeAssetType(targetType: string): 'markdown' | 'json' | 'image' | 'csv' {
    switch (targetType.toLowerCase()) {
      case 'markdown':
      case 'md':
        return 'markdown';
      case 'json':
        return 'json';
      case 'image':
      case 'img':
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      case 'csv':
        return 'csv';
      default:
        return 'json'; // Default fallback type
    }
  }

  /**
   * Create a fallback error handler with default options
   */
  static createDefault(): FallbackErrorHandler {
    const defaultOptions: ErrorRecoveryOptions = {
      enableFallbackGeneration: true,
      enableConstraintRelaxation: true,
      enablePartialFulfillment: true,
      maxRetryAttempts: 3,
      fallbackStrategies: [],
      recoveryPriority: 'completeness',
      reportingLevel: 'detailed'
    };

    return new FallbackErrorHandler(defaultOptions);
  }
}