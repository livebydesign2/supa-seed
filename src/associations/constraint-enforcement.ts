/**
 * Constraint Enforcement System for Association Intelligence
 * Phase 3, Checkpoint C2 - Advanced constraint validation and conflict resolution
 */

import { LoadedAsset } from '../features/generation/assets/asset-loader';
import { DistributionTarget, DistributionAssignment } from './distribution-algorithms';
import { Logger } from '../core/utils/logger';

export interface ConstraintRule {
  id: string;
  name: string;
  type: 'count' | 'content' | 'relationship' | 'temporal' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  validator: (assignment: DistributionAssignment, context: ValidationContext) => ConstraintValidationResult;
  conflictResolver?: (violation: ConstraintViolation, context: ResolutionContext) => ConstraintResolution | null;
}

export interface ValidationContext {
  allAssignments: DistributionAssignment[];
  allAssets: LoadedAsset[];
  globalConfig: ConstraintConfig;
  metadata: Record<string, any>;
}

export interface ResolutionContext extends ValidationContext {
  conflictHistory: ConstraintViolation[];
  resolutionAttempts: number;
  maxRetries: number;
}

export interface ConstraintValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  warnings: ConstraintWarning[];
  metadata: {
    executionTime: number;
    assetsEvaluated: number;
    rulesApplied: string[];
  };
}

export interface ConstraintViolation {
  ruleId: string;
  ruleName: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  affectedTargets: string[];
  affectedAssets: string[];
  violationType: 'insufficient' | 'excess' | 'invalid' | 'conflict';
  suggestedResolutions: string[];
  metadata: Record<string, any>;
}

export interface ConstraintWarning {
  ruleId: string;
  message: string;
  targets: string[];
  recommendation: string;
}

export interface ConstraintResolution {
  strategy: 'redistribute' | 'relax_constraint' | 'add_fallback' | 'manual_intervention' | 'partial_fulfillment';
  description: string;
  actions: ResolutionAction[];
  confidence: number; // 0-100
  impact: 'low' | 'medium' | 'high';
}

export interface ResolutionAction {
  type: 'move_asset' | 'generate_fallback' | 'modify_constraint' | 'create_target' | 'remove_constraint';
  description: string;
  parameters: Record<string, any>;
  reversible: boolean;
}

export interface ConstraintConfig {
  enforcementLevel: 'strict' | 'balanced' | 'permissive';
  allowPartialFulfillment: boolean;
  autoResolveConflicts: boolean;
  maxResolutionAttempts: number;
  fallbackGeneration: boolean;
  priorityWeighting: Record<string, number>;
  customResolvers: Record<string, (violation: ConstraintViolation) => ConstraintResolution>;
}

export interface EnforcementResult {
  success: boolean;
  resolvedViolations: number;
  unresolvableViolations: ConstraintViolation[];
  appliedResolutions: ConstraintResolution[];
  finalAssignments: DistributionAssignment[];
  enforcementReport: EnforcementReport;
}

export interface EnforcementReport {
  summary: string;
  statistics: {
    totalRulesEvaluated: number;
    violationsFound: number;
    violationsResolved: number;
    resolutionSuccessRate: number;
    executionTime: number;
    assetsAffected: number;
    targetsAffected: number;
  };
  violationsByType: Record<string, number>;
  resolutionsByStrategy: Record<string, number>;
  recommendations: string[];
  performanceMetrics: {
    validationTime: number;
    resolutionTime: number;
    memoryUsage: number;
  };
}

export class ConstraintEnforcementEngine {
  private rules: Map<string, ConstraintRule> = new Map();
  private config: ConstraintConfig;

  constructor(config: ConstraintConfig) {
    this.config = config;
    this.initializeBuiltInRules();
  }

  /**
   * Add a custom constraint rule to the enforcement engine
   */
  addRule(rule: ConstraintRule): void {
    this.rules.set(rule.id, rule);
    Logger.debug(`Added constraint rule: ${rule.name} (${rule.id})`);
  }

  /**
   * Remove a constraint rule from the enforcement engine
   */
  removeRule(ruleId: string): boolean {
    const removed = this.rules.delete(ruleId);
    if (removed) {
      Logger.debug(`Removed constraint rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Validate all assignments against constraint rules
   */
  validateAssignments(assignments: DistributionAssignment[], allAssets: LoadedAsset[]): ConstraintValidationResult {
    const startTime = Date.now();
    const violations: ConstraintViolation[] = [];
    const warnings: ConstraintWarning[] = [];
    const rulesApplied: string[] = [];
    let assetsEvaluated = 0;

    Logger.info(`🔍 Validating ${assignments.length} assignments against ${this.rules.size} constraint rules`);

    const context: ValidationContext = {
      allAssignments: assignments,
      allAssets,
      globalConfig: this.config,
      metadata: {}
    };

    // Sort rules by priority for evaluation order
    const sortedRules = Array.from(this.rules.values()).sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const rule of sortedRules) {
      try {
        for (const assignment of assignments) {
          const result = rule.validator(assignment, context);
          
          if (!result.isValid) {
            violations.push(...result.violations);
          }
          warnings.push(...result.warnings);
          assetsEvaluated += result.metadata.assetsEvaluated;
        }
        rulesApplied.push(rule.id);
      } catch (error: any) {
        Logger.warn(`Constraint rule ${rule.id} failed: ${error.message}`);
        warnings.push({
          ruleId: rule.id,
          message: `Rule evaluation failed: ${error.message}`,
          targets: [],
          recommendation: 'Review rule configuration'
        });
      }
    }

    const executionTime = Date.now() - startTime;
    Logger.info(`✅ Constraint validation complete: ${violations.length} violations, ${warnings.length} warnings (${executionTime}ms)`);

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      metadata: {
        executionTime,
        assetsEvaluated,
        rulesApplied
      }
    };
  }

  /**
   * Enforce constraints by resolving violations
   */
  enforceConstraints(
    assignments: DistributionAssignment[], 
    allAssets: LoadedAsset[]
  ): EnforcementResult {
    const startTime = Date.now();
    let currentAssignments = [...assignments];
    const appliedResolutions: ConstraintResolution[] = [];
    const unresolvableViolations: ConstraintViolation[] = [];

    Logger.info(`⚖️ Enforcing constraints on ${assignments.length} assignments`);

    // Initial validation
    let validationResult = this.validateAssignments(currentAssignments, allAssets);
    let resolutionAttempts = 0;

    while (validationResult.violations.length > 0 && resolutionAttempts < this.config.maxResolutionAttempts) {
      resolutionAttempts++;
      Logger.debug(`Constraint resolution attempt ${resolutionAttempts}/${this.config.maxResolutionAttempts}`);

      const resolutionContext: ResolutionContext = {
        allAssignments: currentAssignments,
        allAssets,
        globalConfig: this.config,
        metadata: {},
        conflictHistory: unresolvableViolations,
        resolutionAttempts,
        maxRetries: this.config.maxResolutionAttempts
      };

      let resolvedAny = false;

      // Attempt to resolve violations in priority order
      const sortedViolations = validationResult.violations.sort((a, b) => {
        const severityOrder = { critical: 3, error: 2, warning: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      for (const violation of sortedViolations) {
        const rule = this.rules.get(violation.ruleId);
        if (rule?.conflictResolver) {
          try {
            const resolution = rule.conflictResolver(violation, resolutionContext);
            
            if (resolution && resolution.confidence >= 70) { // Only apply high-confidence resolutions
              const success = this.applyResolution(resolution, currentAssignments, allAssets);
              
              if (success) {
                appliedResolutions.push(resolution);
                resolvedAny = true;
                Logger.debug(`Applied resolution: ${resolution.strategy} for rule ${violation.ruleId}`);
              }
            } else {
              unresolvableViolations.push(violation);
            }
          } catch (error: any) {
            Logger.warn(`Resolution failed for rule ${violation.ruleId}: ${error.message}`);
            unresolvableViolations.push(violation);
          }
        } else {
          // Try default resolution strategies
          const defaultResolution = this.getDefaultResolution(violation, resolutionContext);
          if (defaultResolution) {
            const success = this.applyResolution(defaultResolution, currentAssignments, allAssets);
            if (success) {
              appliedResolutions.push(defaultResolution);
              resolvedAny = true;
            }
          } else {
            unresolvableViolations.push(violation);
          }
        }
      }

      if (!resolvedAny) {
        Logger.warn('No progress made in constraint resolution, stopping attempts');
        break;
      }

      // Re-validate after applying resolutions
      validationResult = this.validateAssignments(currentAssignments, allAssets);
    }

    const executionTime = Date.now() - startTime;
    const resolvedViolations = assignments.length > 0 ? 
      Math.max(0, validationResult.violations.length - unresolvableViolations.length) : 0;

    const enforcementReport = this.generateEnforcementReport(
      validationResult,
      appliedResolutions,
      unresolvableViolations,
      executionTime,
      currentAssignments.length,
      new Set(currentAssignments.map(a => a.target.id)).size
    );

    Logger.info(`⚖️ Constraint enforcement complete: ${resolvedViolations} resolved, ${unresolvableViolations.length} unresolvable`);

    return {
      success: unresolvableViolations.length === 0,
      resolvedViolations,
      unresolvableViolations,
      appliedResolutions,
      finalAssignments: currentAssignments,
      enforcementReport
    };
  }

  /**
   * Apply a constraint resolution to the assignments
   */
  private applyResolution(
    resolution: ConstraintResolution,
    assignments: DistributionAssignment[],
    allAssets: LoadedAsset[]
  ): boolean {
    try {
      for (const action of resolution.actions) {
        const success = this.executeResolutionAction(action, assignments, allAssets);
        if (!success) {
          Logger.warn(`Failed to execute resolution action: ${action.type}`);
          return false;
        }
      }
      return true;
    } catch (error: any) {
      Logger.error(`Error applying resolution: ${error.message}`);
      return false;
    }
  }

  /**
   * Execute a specific resolution action
   */
  private executeResolutionAction(
    action: ResolutionAction,
    assignments: DistributionAssignment[],
    allAssets: LoadedAsset[]
  ): boolean {
    switch (action.type) {
      case 'move_asset':
        return this.moveAsset(action.parameters, assignments);
      
      case 'generate_fallback':
        return this.generateFallback(action.parameters, assignments, allAssets);
      
      case 'modify_constraint':
        return this.modifyConstraint(action.parameters, assignments);
      
      case 'create_target':
        return this.createTarget(action.parameters, assignments);
      
      case 'remove_constraint':
        return this.removeConstraintFromTarget(action.parameters, assignments);
      
      default:
        Logger.warn(`Unknown resolution action type: ${action.type}`);
        return false;
    }
  }

  /**
   * Move an asset from one target to another
   */
  private moveAsset(params: Record<string, any>, assignments: DistributionAssignment[]): boolean {
    const { assetId, fromTargetId, toTargetId } = params;
    
    const fromAssignment = assignments.find(a => a.target.id === fromTargetId);
    const toAssignment = assignments.find(a => a.target.id === toTargetId);
    
    if (!fromAssignment || !toAssignment) {
      return false;
    }
    
    const assetIndex = fromAssignment.assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) {
      return false;
    }
    
    const asset = fromAssignment.assets.splice(assetIndex, 1)[0];
    toAssignment.assets.push(asset);
    
    return true;
  }

  /**
   * Generate fallback assets when insufficient assets are available
   */
  private generateFallback(
    params: Record<string, any>, 
    assignments: DistributionAssignment[], 
    allAssets: LoadedAsset[]
  ): boolean {
    // This would integrate with fallback generation system
    // For now, we'll just mark that fallback is needed
    const { targetId, count, assetType } = params;
    
    const assignment = assignments.find(a => a.target.id === targetId);
    if (!assignment) return false;
    
    // Mark assignment as needing fallback generation
    assignment.assignmentReason = `fallback_needed_${count}_${assetType}`;
    
    return true;
  }

  /**
   * Modify constraint parameters for a target
   */
  private modifyConstraint(params: Record<string, any>, assignments: DistributionAssignment[]): boolean {
    const { targetId, constraintType, newValue } = params;
    
    const assignment = assignments.find(a => a.target.id === targetId);
    if (!assignment || !assignment.target.constraints) return false;
    
    // Modify the constraint
    (assignment.target.constraints as any)[constraintType] = newValue;
    
    return true;
  }

  /**
   * Create a new target to accommodate excess assets
   */
  private createTarget(params: Record<string, any>, assignments: DistributionAssignment[]): boolean {
    const { targetId, targetName, constraints } = params;
    
    const newTarget: DistributionTarget = {
      id: targetId,
      name: targetName,
      constraints: constraints || {}
    };
    
    const newAssignment: DistributionAssignment = {
      target: newTarget,
      assets: [],
      fulfilled: false,
      constraintViolations: [],
      assignmentReason: 'created_for_resolution'
    };
    
    assignments.push(newAssignment);
    
    return true;
  }

  /**
   * Remove a specific constraint from a target
   */
  private removeConstraintFromTarget(params: Record<string, any>, assignments: DistributionAssignment[]): boolean {
    const { targetId, constraintName } = params;
    
    const assignment = assignments.find(a => a.target.id === targetId);
    if (!assignment || !assignment.target.constraints) return false;
    
    delete (assignment.target.constraints as any)[constraintName];
    
    return true;
  }

  /**
   * Get default resolution strategy for a violation
   */
  private getDefaultResolution(violation: ConstraintViolation, context: ResolutionContext): ConstraintResolution | null {
    switch (violation.violationType) {
      case 'insufficient':
        return {
          strategy: 'add_fallback',
          description: 'Generate fallback assets to meet minimum requirements',
          actions: [{
            type: 'generate_fallback',
            description: 'Create synthetic assets',
            parameters: {
              targetId: violation.affectedTargets[0],
              count: 1,
              assetType: 'generic'
            },
            reversible: true
          }],
          confidence: 80,
          impact: 'low'
        };
      
      case 'excess':
        // Find another target that can accept the asset
        const potentialTargets = context.allAssignments.filter(a => 
          a.target.id !== violation.affectedTargets[0] &&
          (!a.target.constraints?.maxItems || a.assets.length < a.target.constraints.maxItems)
        );
        
        if (potentialTargets.length > 0) {
          return {
            strategy: 'redistribute',
            description: 'Redistribute excess assets to other targets',
            actions: violation.affectedAssets.slice(0, violation.metadata.excess).map(assetId => ({
              type: 'move_asset',
              description: `Move asset ${assetId} to another target`,
              parameters: {
                assetId,
                fromTargetId: violation.affectedTargets[0],
                toTargetId: potentialTargets[0].target.id
              },
              reversible: true
            })),
            confidence: 75,
            impact: 'low'
          };
        } else {
          return {
            strategy: 'relax_constraint',
            description: 'No targets available for redistribution, relax maximum constraint',
            actions: [{
              type: 'modify_constraint',
              description: 'Increase maximum items limit',
              parameters: {
                targetId: violation.affectedTargets[0],
                constraintType: 'maxItems',
                newValue: violation.metadata.actual
              },
              reversible: true
            }],
            confidence: 50,
            impact: 'medium'
          };
        }
      
      case 'invalid':
        if (this.config.enforcementLevel === 'permissive') {
          return {
            strategy: 'relax_constraint',
            description: 'Relax constraint to allow current assignment',
            actions: [{
              type: 'modify_constraint',
              description: 'Adjust constraint parameters',
              parameters: {
                targetId: violation.affectedTargets[0],
                constraintType: 'validation',
                newValue: false
              },
              reversible: true
            }],
            confidence: 60,
            impact: 'medium'
          };
        }
        break;
    }
    
    return null;
  }

  /**
   * Generate comprehensive enforcement report
   */
  private generateEnforcementReport(
    validationResult: ConstraintValidationResult,
    appliedResolutions: ConstraintResolution[],
    unresolvableViolations: ConstraintViolation[],
    executionTime: number,
    assetsAffected: number,
    targetsAffected: number
  ): EnforcementReport {
    const totalViolations = validationResult.violations.length;
    const resolvedViolations = totalViolations - unresolvableViolations.length;
    
    const violationsByType: Record<string, number> = {};
    validationResult.violations.forEach(v => {
      violationsByType[v.violationType] = (violationsByType[v.violationType] || 0) + 1;
    });
    
    const resolutionsByStrategy: Record<string, number> = {};
    appliedResolutions.forEach(r => {
      resolutionsByStrategy[r.strategy] = (resolutionsByStrategy[r.strategy] || 0) + 1;
    });
    
    const recommendations: string[] = [];
    if (unresolvableViolations.length > 0) {
      recommendations.push('Consider relaxing constraints or adding more assets to resolve remaining violations');
    }
    if (appliedResolutions.length > totalViolations * 0.5) {
      recommendations.push('High number of resolutions applied - review constraint configuration');
    }
    
    const successRate = totalViolations > 0 ? (resolvedViolations / totalViolations) * 100 : 100;
    
    return {
      summary: `Constraint enforcement completed with ${successRate.toFixed(1)}% success rate`,
      statistics: {
        totalRulesEvaluated: this.rules.size,
        violationsFound: totalViolations,
        violationsResolved: resolvedViolations,
        resolutionSuccessRate: successRate,
        executionTime,
        assetsAffected,
        targetsAffected
      },
      violationsByType,
      resolutionsByStrategy,
      recommendations,
      performanceMetrics: {
        validationTime: validationResult.metadata.executionTime,
        resolutionTime: executionTime - validationResult.metadata.executionTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
      }
    };
  }

  /**
   * Initialize built-in constraint rules
   */
  private initializeBuiltInRules(): void {
    // Minimum items constraint
    this.addRule({
      id: 'min-items-constraint',
      name: 'Minimum Items Required',
      type: 'count',
      priority: 'high',
      description: 'Ensures targets receive at least the minimum number of required items',
      validator: (assignment, context) => {
        const startTime = Date.now();
        const violations: ConstraintViolation[] = [];
        const warnings: ConstraintWarning[] = [];
        
        const minItems = assignment.target.constraints?.minItems;
        if (minItems && assignment.assets.length < minItems) {
          violations.push({
            ruleId: 'min-items-constraint',
            ruleName: 'Minimum Items Required',
            severity: 'error',
            message: `Target ${assignment.target.id} has ${assignment.assets.length} items but requires minimum ${minItems}`,
            affectedTargets: [assignment.target.id],
            affectedAssets: assignment.assets.map(a => a.id),
            violationType: 'insufficient',
            suggestedResolutions: ['Generate fallback assets', 'Redistribute from other targets', 'Relax constraint'],
            metadata: { required: minItems, actual: assignment.assets.length }
          });
        }
        
        return {
          isValid: violations.length === 0,
          violations,
          warnings,
          metadata: {
            executionTime: Date.now() - startTime,
            assetsEvaluated: assignment.assets.length,
            rulesApplied: ['min-items-constraint']
          }
        };
      },
      conflictResolver: (violation, context) => {
        // Only offer fallback generation if it's enabled in config
        if (context.globalConfig.fallbackGeneration) {
          return {
            strategy: 'add_fallback',
            description: 'Generate synthetic assets to meet minimum requirement',
            actions: [{
              type: 'generate_fallback',
              description: `Generate ${violation.metadata.required - violation.metadata.actual} fallback assets`,
              parameters: {
                targetId: violation.affectedTargets[0],
                count: violation.metadata.required - violation.metadata.actual,
                assetType: 'synthetic'
              },
              reversible: true
            }],
            confidence: 85,
            impact: 'low'
          };
        } else {
          // Return null to indicate no resolution available
          return null;
        }
      }
    });

    // Maximum items constraint
    this.addRule({
      id: 'max-items-constraint',
      name: 'Maximum Items Limit',
      type: 'count',
      priority: 'medium',
      description: 'Ensures targets do not exceed the maximum number of allowed items',
      validator: (assignment, context) => {
        const startTime = Date.now();
        const violations: ConstraintViolation[] = [];
        const warnings: ConstraintWarning[] = [];
        
        const maxItems = assignment.target.constraints?.maxItems;
        if (maxItems && assignment.assets.length > maxItems) {
          violations.push({
            ruleId: 'max-items-constraint',
            ruleName: 'Maximum Items Limit',
            severity: 'error',
            message: `Target ${assignment.target.id} has ${assignment.assets.length} items but allows maximum ${maxItems}`,
            affectedTargets: [assignment.target.id],
            affectedAssets: assignment.assets.slice(maxItems).map(a => a.id),
            violationType: 'excess',
            suggestedResolutions: ['Move excess assets to other targets', 'Increase maximum limit', 'Remove excess assets'],
            metadata: { limit: maxItems, actual: assignment.assets.length, excess: assignment.assets.length - maxItems }
          });
        }
        
        return {
          isValid: violations.length === 0,
          violations,
          warnings,
          metadata: {
            executionTime: Date.now() - startTime,
            assetsEvaluated: assignment.assets.length,
            rulesApplied: ['max-items-constraint']
          }
        };
      },
      conflictResolver: (violation, context) => ({
        strategy: 'redistribute',
        description: 'Redistribute excess assets to other targets',
        actions: violation.affectedAssets.slice(0, violation.metadata.excess).map(assetId => ({
          type: 'move_asset' as const,
          description: `Move asset ${assetId} to another target`,
          parameters: {
            assetId,
            fromTargetId: violation.affectedTargets[0]
          },
          reversible: true
        })),
        confidence: 90,
        impact: 'low'
      })
    });

    // Asset type compatibility constraint
    this.addRule({
      id: 'asset-type-constraint',
      name: 'Asset Type Compatibility',
      type: 'content',
      priority: 'medium',
      description: 'Ensures targets only receive compatible asset types',
      validator: (assignment, context) => {
        const startTime = Date.now();
        const violations: ConstraintViolation[] = [];
        const warnings: ConstraintWarning[] = [];
        
        const requiredTypes = assignment.target.constraints?.requiredTypes;
        const excludedTypes = assignment.target.constraints?.excludedTypes;
        
        if (requiredTypes) {
          const incompatibleAssets = assignment.assets.filter(asset => 
            !requiredTypes.includes(asset.type)
          );
          
          if (incompatibleAssets.length > 0) {
            violations.push({
              ruleId: 'asset-type-constraint',
              ruleName: 'Asset Type Compatibility',
              severity: 'error',
              message: `Target ${assignment.target.id} has ${incompatibleAssets.length} assets with incompatible types`,
              affectedTargets: [assignment.target.id],
              affectedAssets: incompatibleAssets.map(a => a.id),
              violationType: 'invalid',
              suggestedResolutions: ['Remove incompatible assets', 'Update required types', 'Transform asset types'],
              metadata: { requiredTypes, incompatibleTypes: incompatibleAssets.map(a => a.type) }
            });
          }
        }
        
        if (excludedTypes) {
          const excludedAssets = assignment.assets.filter(asset => 
            excludedTypes.includes(asset.type)
          );
          
          if (excludedAssets.length > 0) {
            violations.push({
              ruleId: 'asset-type-constraint',
              ruleName: 'Asset Type Compatibility',
              severity: 'error',
              message: `Target ${assignment.target.id} has ${excludedAssets.length} assets with excluded types`,
              affectedTargets: [assignment.target.id],
              affectedAssets: excludedAssets.map(a => a.id),
              violationType: 'invalid',
              suggestedResolutions: ['Remove excluded assets', 'Update excluded types', 'Move to compatible targets'],
              metadata: { excludedTypes, foundTypes: excludedAssets.map(a => a.type) }
            });
          }
        }
        
        return {
          isValid: violations.length === 0,
          violations,
          warnings,
          metadata: {
            executionTime: Date.now() - startTime,
            assetsEvaluated: assignment.assets.length,
            rulesApplied: ['asset-type-constraint']
          }
        };
      }
    });

    Logger.info(`🔧 Initialized ${this.rules.size} built-in constraint rules`);
  }

  /**
   * Get all available constraint rules
   */
  getRules(): ConstraintRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get constraint rule by ID
   */
  getRule(ruleId: string): ConstraintRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Update constraint configuration
   */
  updateConfig(newConfig: Partial<ConstraintConfig>): void {
    this.config = { ...this.config, ...newConfig };
    Logger.debug('Updated constraint enforcement configuration');
  }

  /**
   * Create a constraint enforcement engine with default configuration
   */
  static createDefault(): ConstraintEnforcementEngine {
    const defaultConfig: ConstraintConfig = {
      enforcementLevel: 'balanced',
      allowPartialFulfillment: true,
      autoResolveConflicts: true,
      maxResolutionAttempts: 3,
      fallbackGeneration: true,
      priorityWeighting: {
        critical: 10,
        high: 5,
        medium: 2,
        low: 1
      },
      customResolvers: {}
    };

    return new ConstraintEnforcementEngine(defaultConfig);
  }
}