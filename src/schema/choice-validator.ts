/**
 * User Choice Validator System
 * Phase 4, Checkpoint D2 - Advanced validation for interactive configuration choices
 */

import { ConfigurationPrompt, ConfigurationOption, UserChoice, ConfigurationAction } from './interactive-configuration';
import { SchemaChange } from './schema-evolution';
import { Logger } from '../core/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export interface ValidationRule {
  id: string;
  name: string;
  type: 'dependency' | 'constraint' | 'compatibility' | 'safety' | 'business_logic';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  validator: (choice: UserChoice, prompt: ConfigurationPrompt, context: ValidationContext) => ValidationResult;
  autoFix?: (choice: UserChoice, prompt: ConfigurationPrompt, context: ValidationContext) => UserChoice | null;
}

export interface ValidationContext {
  previousChoices: UserChoice[];
  availablePrompts: ConfigurationPrompt[];
  schemaChanges: SchemaChange[];
  systemConstraints: SystemConstraint[];
  userPreferences: UserPreferences;
  environment: {
    nodeEnv: string;
    projectPath: string;
    configFiles: string[];
    dependencies: Record<string, string>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  metadata: {
    ruleId: string;
    executionTime: number;
    confidence: number;
    canAutoFix: boolean;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'critical';
  field?: string;
  expectedValue?: any;
  actualValue?: any;
  resolution?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  recommendation?: string;
}

export interface ValidationSuggestion {
  type: 'alternative_option' | 'parameter_adjustment' | 'dependency_resolution' | 'risk_mitigation';
  description: string;
  suggestedChoice?: Partial<UserChoice>;
  rationale: string;
  confidence: number;
}

export interface SystemConstraint {
  id: string;
  type: 'file_system' | 'dependency' | 'version' | 'permission' | 'resource';
  description: string;
  validator: (context: ValidationContext) => boolean;
  errorMessage: string;
}

export interface UserPreferences {
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  autoConfirmLowRisk: boolean;
  requireExplicitHighRisk: boolean;
  preferredBackupStrategy: 'always' | 'high_risk_only' | 'never';
  maxConfigurationTime: number; // minutes
  notificationLevel: 'minimal' | 'standard' | 'verbose';
}

export interface ChoiceValidationSummary {
  totalChoices: number;
  validChoices: number;
  errorsFound: number;
  warningsFound: number;
  suggestionsGenerated: number;
  autoFixesApplied: number;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpact: string;
  recommendations: string[];
}

export class UserChoiceValidator {
  private validationRules: Map<string, ValidationRule> = new Map();
  private systemConstraints: SystemConstraint[] = [];
  private userPreferences: UserPreferences;

  constructor(userPreferences?: Partial<UserPreferences>) {
    this.userPreferences = {
      riskTolerance: 'balanced',
      autoConfirmLowRisk: false,
      requireExplicitHighRisk: true,
      preferredBackupStrategy: 'high_risk_only',
      maxConfigurationTime: 30,
      notificationLevel: 'standard',
      ...userPreferences
    };

    this.initializeBuiltInRules();
    this.initializeSystemConstraints();
  }

  /**
   * Validate a single user choice
   */
  async validateChoice(
    choice: UserChoice,
    prompt: ConfigurationPrompt,
    context: ValidationContext
  ): Promise<ValidationResult> {
    Logger.debug(`🔍 Validating choice: ${choice.optionId} for prompt ${prompt.id}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    let totalExecutionTime = 0;
    let canAutoFix = false;

    // Run all validation rules
    for (const rule of this.validationRules.values()) {
      const startTime = Date.now();
      
      try {
        const result = rule.validator(choice, prompt, context);
        totalExecutionTime += Date.now() - startTime;

        errors.push(...result.errors);
        warnings.push(...result.warnings);
        suggestions.push(...result.suggestions);

        if (result.metadata.canAutoFix) {
          canAutoFix = true;
        }

      } catch (error: any) {
        Logger.warn(`Validation rule ${rule.id} failed: ${error.message}`);
        warnings.push({
          code: 'RULE_EXECUTION_FAILED',
          message: `Validation rule '${rule.name}' failed to execute`,
          impact: 'low',
          recommendation: 'Manual verification recommended'
        });
      }
    }

    const isValid = errors.filter(e => e.severity === 'error' || e.severity === 'critical').length === 0;

    return {
      isValid,
      errors,
      warnings,
      suggestions,
      metadata: {
        ruleId: 'composite',
        executionTime: totalExecutionTime,
        confidence: isValid ? 95 : 60,
        canAutoFix
      }
    };
  }

  /**
   * Validate multiple choices for consistency and dependencies
   */
  async validateChoiceSequence(
    choices: UserChoice[],
    prompts: ConfigurationPrompt[],
    baseContext: Partial<ValidationContext>
  ): Promise<ChoiceValidationSummary> {
    Logger.info(`🔍 Validating choice sequence: ${choices.length} choices`);

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalSuggestions = 0;
    let autoFixesApplied = 0;
    let highestRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    const recommendations: string[] = [];

    // Build validation context
    const context: ValidationContext = {
      previousChoices: [],
      availablePrompts: prompts,
      schemaChanges: baseContext.schemaChanges || [],
      systemConstraints: this.systemConstraints,
      userPreferences: this.userPreferences,
      environment: baseContext.environment || {
        nodeEnv: process.env.NODE_ENV || 'development',
        projectPath: process.cwd(),
        configFiles: [],
        dependencies: {}
      }
    };

    // Validate each choice in sequence
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      const prompt = prompts.find(p => p.id === choice.promptId);
      
      if (!prompt) {
        totalErrors++;
        continue;
      }

      // Update context with previous choices
      context.previousChoices = choices.slice(0, i);

      const validation = await this.validateChoice(choice, prompt, context);

      totalErrors += validation.errors.length;
      totalWarnings += validation.warnings.length;
      totalSuggestions += validation.suggestions.length;

      // Update risk level
      const optionRisk = this.getOptionRiskLevel(prompt, choice.optionId);
      if (this.isHigherRisk(optionRisk, highestRisk)) {
        highestRisk = optionRisk;
      }

      // Collect recommendations
      validation.suggestions.forEach(suggestion => {
        if (suggestion.confidence > 70) {
          recommendations.push(suggestion.description);
        }
      });

      // Attempt auto-fix if needed and allowed
      if (!validation.isValid && validation.metadata.canAutoFix && this.userPreferences.autoConfirmLowRisk) {
        const autoFixedChoice = await this.autoFixChoice(choice, prompt, context);
        if (autoFixedChoice) {
          choices[i] = autoFixedChoice;
          autoFixesApplied++;
        }
      }
    }

    // Generate overall assessment
    const impactAssessment = this.assessOverallImpact(choices, prompts, context);

    return {
      totalChoices: choices.length,
      validChoices: choices.length - totalErrors,
      errorsFound: totalErrors,
      warningsFound: totalWarnings,
      suggestionsGenerated: totalSuggestions,
      autoFixesApplied,
      overallRisk: highestRisk,
      estimatedImpact: impactAssessment,
      recommendations: [...new Set(recommendations)].slice(0, 5) // Top 5 unique recommendations
    };
  }

  /**
   * Attempt to automatically fix a choice
   */
  async autoFixChoice(
    choice: UserChoice,
    prompt: ConfigurationPrompt,
    context: ValidationContext
  ): Promise<UserChoice | null> {
    Logger.debug(`🔧 Attempting auto-fix for choice: ${choice.optionId}`);

    for (const rule of this.validationRules.values()) {
      if (rule.autoFix) {
        try {
          const fixedChoice = rule.autoFix(choice, prompt, context);
          if (fixedChoice) {
            Logger.info(`✅ Auto-fixed choice using rule: ${rule.name}`);
            return fixedChoice;
          }
        } catch (error: any) {
          Logger.warn(`Auto-fix failed for rule ${rule.id}: ${error.message}`);
        }
      }
    }

    return null;
  }

  /**
   * Validate choice against system constraints
   */
  validateSystemConstraints(context: ValidationContext): {
    satisfied: SystemConstraint[];
    violated: SystemConstraint[];
  } {
    const satisfied: SystemConstraint[] = [];
    const violated: SystemConstraint[] = [];

    for (const constraint of this.systemConstraints) {
      try {
        if (constraint.validator(context)) {
          satisfied.push(constraint);
        } else {
          violated.push(constraint);
        }
      } catch (error: any) {
        Logger.warn(`System constraint validation failed: ${constraint.id} - ${error.message}`);
        violated.push(constraint);
      }
    }

    return { satisfied, violated };
  }

  /**
   * Add custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
    Logger.debug(`Added validation rule: ${rule.name}`);
  }

  /**
   * Remove validation rule
   */
  removeValidationRule(ruleId: string): boolean {
    const removed = this.validationRules.delete(ruleId);
    if (removed) {
      Logger.debug(`Removed validation rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
    Logger.info('Updated user preferences');
  }

  /**
   * Generate validation report
   */
  generateValidationReport(summary: ChoiceValidationSummary): string {
    const report = [
      '📊 Configuration Choice Validation Report',
      '=' .repeat(50),
      '',
      `Total Choices: ${summary.totalChoices}`,
      `Valid Choices: ${summary.validChoices}`,
      `Errors Found: ${summary.errorsFound}`,
      `Warnings Found: ${summary.warningsFound}`,
      `Suggestions Generated: ${summary.suggestionsGenerated}`,
      `Auto-fixes Applied: ${summary.autoFixesApplied}`,
      '',
      `Overall Risk Level: ${summary.overallRisk}`,
      `Estimated Impact: ${summary.estimatedImpact}`,
      ''
    ];

    if (summary.recommendations.length > 0) {
      report.push('💡 Top Recommendations:');
      summary.recommendations.forEach((rec, index) => {
        report.push(`   ${index + 1}. ${rec}`);
      });
      report.push('');
    }

    const successRate = summary.totalChoices > 0 
      ? Math.round((summary.validChoices / summary.totalChoices) * 100) 
      : 100;

    report.push(`✅ Validation Success Rate: ${successRate}%`);

    return report.join('\n');
  }

  /**
   * Private: Initialize built-in validation rules
   */
  private initializeBuiltInRules(): void {
    // Option existence rule
    this.addValidationRule({
      id: 'option-exists',
      name: 'Option Existence Validator',
      type: 'constraint',
      priority: 'CRITICAL',
      description: 'Validates that the selected option exists in the prompt',
      validator: (choice, prompt) => {
        const optionExists = prompt.options.some(opt => opt.id === choice.optionId);
        
        return {
          isValid: optionExists,
          errors: optionExists ? [] : [{
            code: 'OPTION_NOT_FOUND',
            message: `Option '${choice.optionId}' does not exist in prompt '${prompt.id}'`,
            severity: 'critical',
            actualValue: choice.optionId,
            expectedValue: prompt.options.map(o => o.id)
          }],
          warnings: [],
          suggestions: optionExists ? [] : [{
            type: 'alternative_option',
            description: `Consider selecting one of: ${prompt.options.map(o => o.label).join(', ')}`,
            rationale: 'Valid options are available',
            confidence: 90
          }],
          metadata: {
            ruleId: 'option-exists',
            executionTime: 1,
            confidence: 100,
            canAutoFix: true
          }
        };
      },
      autoFix: (choice, prompt) => {
        // Auto-fix by selecting the default option
        const defaultOption = prompt.options.find(o => o.id === prompt.defaultOption) || prompt.options[0];
        if (defaultOption) {
          return {
            ...choice,
            optionId: defaultOption.id,
            confidence: 60, // Lower confidence for auto-fix
            userNotes: `Auto-fixed: Selected ${defaultOption.label} (was invalid option)`
          };
        }
        return null;
      }
    });

    // Dependencies rule
    this.addValidationRule({
      id: 'dependency-check',
      name: 'Dependency Validator',
      type: 'dependency',
      priority: 'HIGH',
      description: 'Validates that prompt dependencies are satisfied',
      validator: (choice, prompt, context) => {
        const unmetDependencies = prompt.dependencies.filter(depId => 
          !context.previousChoices.some(prevChoice => prevChoice.promptId === depId)
        );

        return {
          isValid: unmetDependencies.length === 0,
          errors: unmetDependencies.map(depId => ({
            code: 'UNMET_DEPENDENCY',
            message: `Prompt '${prompt.id}' depends on '${depId}' which has not been completed`,
            severity: 'error',
            actualValue: depId,
            resolution: 'Complete the dependent prompt first'
          })),
          warnings: [],
          suggestions: unmetDependencies.length > 0 ? [{
            type: 'dependency_resolution',
            description: 'Complete dependent prompts before proceeding',
            rationale: 'Dependencies must be resolved for consistent configuration',
            confidence: 95
          }] : [],
          metadata: {
            ruleId: 'dependency-check',
            executionTime: 2,
            confidence: 100,
            canAutoFix: false
          }
        };
      }
    });

    // Risk tolerance rule
    this.addValidationRule({
      id: 'risk-tolerance',
      name: 'Risk Tolerance Validator',
      type: 'safety',
      priority: 'HIGH',
      description: 'Validates choices against user risk tolerance',
      validator: (choice, prompt, context) => {
        const selectedOption = prompt.options.find(o => o.id === choice.optionId);
        if (!selectedOption) return { isValid: true, errors: [], warnings: [], suggestions: [], metadata: { ruleId: 'risk-tolerance', executionTime: 0, confidence: 0, canAutoFix: false } };

        const warnings: ValidationWarning[] = [];
        const suggestions: ValidationSuggestion[] = [];
        
        // Check if high-risk choice conflicts with conservative preference
        if (context.userPreferences.riskTolerance === 'conservative' && selectedOption.riskLevel === 'HIGH') {
          warnings.push({
            code: 'HIGH_RISK_CONSERVATIVE',
            message: 'High-risk option selected with conservative risk tolerance',
            impact: 'medium',
            recommendation: 'Consider a lower-risk alternative'
          });

          // Suggest lower-risk alternatives
          const lowerRiskOptions = prompt.options.filter(o => o.riskLevel === 'LOW' || o.riskLevel === 'MEDIUM');
          if (lowerRiskOptions.length > 0) {
            suggestions.push({
              type: 'alternative_option',
              description: `Consider lower-risk options: ${lowerRiskOptions.map(o => o.label).join(', ')}`,
              rationale: 'Aligns better with conservative risk tolerance',
              confidence: 80
            });
          }
        }

        // Check confidence level for high-risk choices
        if (selectedOption.riskLevel === 'HIGH' && choice.confidence < 70) {
          warnings.push({
            code: 'LOW_CONFIDENCE_HIGH_RISK',
            message: 'High-risk option selected with low confidence',
            impact: 'high',
            recommendation: 'Increase confidence level or select a safer option'
          });
        }

        return {
          isValid: true, // Warnings don't invalidate the choice
          errors: [],
          warnings,
          suggestions,
          metadata: {
            ruleId: 'risk-tolerance',
            executionTime: 3,
            confidence: 90,
            canAutoFix: false
          }
        };
      }
    });

    // Prerequisite validation rule
    this.addValidationRule({
      id: 'prerequisite-check',
      name: 'Prerequisite Validator',
      type: 'constraint',
      priority: 'HIGH',
      description: 'Validates that option prerequisites are met',
      validator: (choice, prompt, context) => {
        const selectedOption = prompt.options.find(o => o.id === choice.optionId);
        if (!selectedOption) return { isValid: true, errors: [], warnings: [], suggestions: [], metadata: { ruleId: 'prerequisite-check', executionTime: 0, confidence: 0, canAutoFix: false } };

        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // Check each prerequisite
        for (const prereq of selectedOption.prerequisites) {
          // This is a simplified check - in a real implementation,
          // you'd have more sophisticated prerequisite validation
          if (prereq.includes('file') && prereq.includes('not found')) {
            errors.push({
              code: 'PREREQUISITE_NOT_MET',
              message: `Prerequisite not met: ${prereq}`,
              severity: 'error',
              resolution: 'Ensure all prerequisites are satisfied before proceeding'
            });
          } else if (prereq.includes('manual') || prereq.includes('review')) {
            warnings.push({
              code: 'MANUAL_PREREQUISITE',
              message: `Manual prerequisite: ${prereq}`,
              impact: 'medium',
              recommendation: 'Ensure manual steps are completed'
            });
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          suggestions: [],
          metadata: {
            ruleId: 'prerequisite-check',
            executionTime: 2,
            confidence: 95,
            canAutoFix: false
          }
        };
      }
    });

    // Time budget rule
    this.addValidationRule({
      id: 'time-budget',
      name: 'Time Budget Validator',
      type: 'business_logic',
      priority: 'MEDIUM',
      description: 'Validates choices against available time budget',
      validator: (choice, prompt, context) => {
        const selectedOption = prompt.options.find(o => o.id === choice.optionId);
        if (!selectedOption) return { isValid: true, errors: [], warnings: [], suggestions: [], metadata: { ruleId: 'time-budget', executionTime: 0, confidence: 0, canAutoFix: false } };

        const warnings: ValidationWarning[] = [];
        const suggestions: ValidationSuggestion[] = [];

        // Calculate total estimated time from previous choices and current choice
        const previousTime = context.previousChoices.reduce((sum, prevChoice) => {
          const prevPrompt = context.availablePrompts.find(p => p.id === prevChoice.promptId);
          return sum + (prevPrompt?.metadata.estimatedTime || 0);
        }, 0);

        const currentTime = prompt.metadata.estimatedTime;
        const totalTime = previousTime + currentTime;

        if (totalTime > context.userPreferences.maxConfigurationTime) {
          warnings.push({
            code: 'TIME_BUDGET_EXCEEDED',
            message: `Total configuration time (${totalTime}min) exceeds budget (${context.userPreferences.maxConfigurationTime}min)`,
            impact: 'medium',
            recommendation: 'Consider deferring non-critical changes'
          });

          // Suggest defer or skip options
          const deferOptions = prompt.options.filter(o => o.type === 'defer' || o.type === 'skip');
          if (deferOptions.length > 0) {
            suggestions.push({
              type: 'alternative_option',
              description: `Consider deferring: ${deferOptions.map(o => o.label).join(', ')}`,
              rationale: 'Helps stay within time budget',
              confidence: 70
            });
          }
        }

        return {
          isValid: true,
          errors: [],
          warnings,
          suggestions,
          metadata: {
            ruleId: 'time-budget',
            executionTime: 1,
            confidence: 85,
            canAutoFix: false
          }
        };
      }
    });
  }

  /**
   * Private: Initialize system constraints
   */
  private initializeSystemConstraints(): void {
    // File system permissions
    this.systemConstraints.push({
      id: 'file-permissions',
      type: 'permission',
      description: 'Configuration files must be writable',
      validator: (context) => {
        return context.environment.configFiles.every(file => {
          try {
            if (fs.existsSync(file)) {
              fs.accessSync(file, fs.constants.W_OK);
            }
            return true;
          } catch {
            return false;
          }
        });
      },
      errorMessage: 'One or more configuration files are not writable'
    });

    // Node.js version compatibility
    this.systemConstraints.push({
      id: 'node-version',
      type: 'version',
      description: 'Node.js version must be 14.0.0 or higher',
      validator: (context) => {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        return majorVersion >= 14;
      },
      errorMessage: 'Node.js version 14.0.0 or higher is required'
    });

    // Disk space availability
    this.systemConstraints.push({
      id: 'disk-space',
      type: 'resource',
      description: 'Sufficient disk space must be available',
      validator: (context) => {
        try {
          const stats = fs.statSync(context.environment.projectPath);
          // This is a simplified check - real implementation would check available space
          return true;
        } catch {
          return false;
        }
      },
      errorMessage: 'Insufficient disk space for configuration changes'
    });
  }

  /**
   * Private: Get risk level for a specific option
   */
  private getOptionRiskLevel(prompt: ConfigurationPrompt, optionId: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const option = prompt.options.find(o => o.id === optionId);
    return option?.riskLevel === 'HIGH' ? 'HIGH' : 
           option?.riskLevel === 'MEDIUM' ? 'MEDIUM' : 'LOW';
  }

  /**
   * Private: Check if one risk level is higher than another
   */
  private isHigherRisk(risk1: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', risk2: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): boolean {
    const riskLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return riskLevels[risk1] > riskLevels[risk2];
  }

  /**
   * Private: Assess overall impact of choices
   */
  private assessOverallImpact(
    choices: UserChoice[],
    prompts: ConfigurationPrompt[],
    context: ValidationContext
  ): string {
    const impacts: string[] = [];

    // Analyze configuration file changes
    const affectedFiles = new Set<string>();
    prompts.forEach(prompt => {
      prompt.context.affectedFiles.forEach(file => affectedFiles.add(file));
    });

    if (affectedFiles.size > 0) {
      impacts.push(`${affectedFiles.size} configuration files will be modified`);
    }

    // Analyze schema changes
    const schemaChanges = context.schemaChanges.length;
    if (schemaChanges > 0) {
      impacts.push(`${schemaChanges} schema changes will be processed`);
    }

    // Analyze time impact
    const totalTime = choices.reduce((sum, choice) => {
      const prompt = prompts.find(p => p.id === choice.promptId);
      return sum + (prompt?.metadata.estimatedTime || 0);
    }, 0);

    if (totalTime > 0) {
      impacts.push(`Estimated completion time: ${totalTime} minutes`);
    }

    return impacts.join('; ') || 'No significant impact detected';
  }
}