/**
 * Configuration Conflict Resolution System for SupaSeed v2.5.0
 * Implements Task 5.1.4: Add layer composition and conflict resolution
 * Advanced conflict detection and resolution for the 3-layer configuration system
 */

import { Logger } from '../utils/logger';
import type { 
  ConfigurationLayerType, 
  MergeStrategy,
  LayerPriority 
} from './config-layers';

/**
 * Configuration conflict details
 */
export interface ConfigurationConflict {
  /** Unique identifier for the conflict */
  id: string;
  
  /** Configuration path where conflict occurs */
  path: string;
  
  /** Conflicting values from different layers */
  values: Record<ConfigurationLayerType, any>;
  
  /** Conflict severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Conflict type classification */
  type: 'value_mismatch' | 'type_mismatch' | 'logical_inconsistency' | 'dependency_conflict';
  
  /** Suggested resolution strategy */
  suggestedResolution: {
    strategy: MergeStrategy;
    reason: string;
    confidence: number;
  };
  
  /** Available resolution options */
  resolutionOptions: {
    strategy: MergeStrategy;
    description: string;
    implications: string[];
    recommendationScore: number;
  }[];
  
  /** Auto-resolvable flag */
  autoResolvable: boolean;
  
  /** Impact assessment */
  impact: {
    affectedFeatures: string[];
    performanceImpact: 'none' | 'low' | 'medium' | 'high';
    compatibilityRisk: 'none' | 'low' | 'medium' | 'high';
    userExperienceImpact: 'none' | 'minor' | 'moderate' | 'significant';
  };
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  /** Resolution success status */
  success: boolean;
  
  /** Applied resolution strategy */
  appliedStrategy: MergeStrategy;
  
  /** Final resolved value */
  resolvedValue: any;
  
  /** Resolution metadata */
  metadata: {
    resolvedAt: Date;
    resolutionTime: number; // milliseconds
    appliedBy: 'auto' | 'user' | 'system';
    confidence: number;
  };
  
  /** Warnings about the resolution */
  warnings: string[];
  
  /** Side effects of the resolution */
  sideEffects: {
    modifiedPaths: string[];
    affectedLayers: ConfigurationLayerType[];
    requiresValidation: boolean;
  };
}

/**
 * Conflict resolution context
 */
export interface ResolutionContext {
  /** Layer priorities for conflict resolution */
  layerPriorities: Record<ConfigurationLayerType, LayerPriority>;
  
  /** Global merge strategy preference */
  defaultStrategy: MergeStrategy;
  
  /** Path-specific merge strategies */
  pathStrategies: Record<string, MergeStrategy>;
  
  /** User preferences for conflict resolution */
  userPreferences: {
    autoResolveLevel: 'none' | 'safe' | 'moderate' | 'aggressive';
    prioritizePerformance: boolean;
    prioritizeCompatibility: boolean;
    allowDataLoss: boolean;
  };
  
  /** System constraints */
  constraints: {
    maxResolutionTime: number; // milliseconds
    requireUserConfirmation: string[]; // paths requiring user confirmation
    prohibitedChanges: string[]; // paths that cannot be modified
  };
}

/**
 * Advanced Conflict Resolution Engine
 */
export class ConflictResolutionEngine {
  private resolutionHistory: Map<string, ConflictResolutionResult[]> = new Map();
  private conflictPatterns: Map<string, ConfigurationConflict[]> = new Map();

  constructor(private context: ResolutionContext) {
    Logger.debug('ConflictResolutionEngine initialized');
  }

  /**
   * Detect conflicts between configuration layers
   */
  detectConflicts(
    baseConfig: any,
    overlayConfig: any,
    layerType: ConfigurationLayerType,
    basePath: string = ''
  ): ConfigurationConflict[] {
    const conflicts: ConfigurationConflict[] = [];
    
    this.traverseAndDetectConflicts(
      baseConfig,
      overlayConfig,
      layerType,
      basePath,
      conflicts
    );

    // Analyze conflict patterns
    this.analyzeConflictPatterns(conflicts);
    
    Logger.debug(`Detected ${conflicts.length} conflicts in ${layerType} layer`);
    return conflicts;
  }

  /**
   * Resolve a single configuration conflict
   */
  resolveConflict(
    conflict: ConfigurationConflict,
    strategy?: MergeStrategy
  ): ConflictResolutionResult {
    const startTime = Date.now();
    
    const resolveStrategy = strategy || 
                           conflict.suggestedResolution.strategy ||
                           this.context.defaultStrategy;

    const result = this.applyResolutionStrategy(conflict, resolveStrategy);
    
    const resolutionTime = Date.now() - startTime;
    
    const resolutionResult: ConflictResolutionResult = {
      success: result.success,
      appliedStrategy: resolveStrategy,
      resolvedValue: result.value,
      metadata: {
        resolvedAt: new Date(),
        resolutionTime,
        appliedBy: strategy ? 'user' : 'auto',
        confidence: result.confidence
      },
      warnings: result.warnings,
      sideEffects: {
        modifiedPaths: [conflict.path],
        affectedLayers: Object.keys(conflict.values) as ConfigurationLayerType[],
        requiresValidation: conflict.severity !== 'low'
      }
    };

    // Record resolution history
    this.recordResolution(conflict.id, resolutionResult);
    
    Logger.debug(`Resolved conflict at ${conflict.path} using ${resolveStrategy} strategy`);
    return resolutionResult;
  }

  /**
   * Resolve multiple conflicts with batch processing
   */
  resolveConflicts(
    conflicts: ConfigurationConflict[],
    batchStrategy?: MergeStrategy
  ): {
    resolved: ConflictResolutionResult[];
    failed: { conflict: ConfigurationConflict; error: string }[];
    summary: {
      totalConflicts: number;
      resolvedCount: number;
      failedCount: number;
      autoResolved: number;
      userResolved: number;
    };
  } {
    Logger.info(`Resolving ${conflicts.length} configuration conflicts`);
    
    const resolved: ConflictResolutionResult[] = [];
    const failed: { conflict: ConfigurationConflict; error: string }[] = [];
    
    // Sort conflicts by priority (critical first)
    const sortedConflicts = this.sortConflictsByPriority(conflicts);
    
    for (const conflict of sortedConflicts) {
      try {
        // Check if auto-resolution is allowed
        const canAutoResolve = this.canAutoResolve(conflict);
        const strategy = canAutoResolve ? 
          (batchStrategy || conflict.suggestedResolution.strategy) :
          undefined;

        if (!canAutoResolve && !batchStrategy) {
          // Skip conflicts requiring user intervention
          failed.push({
            conflict,
            error: 'Requires user intervention - auto-resolution not permitted'
          });
          continue;
        }

        const result = this.resolveConflict(conflict, strategy);
        resolved.push(result);
        
      } catch (error) {
        failed.push({
          conflict,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      totalConflicts: conflicts.length,
      resolvedCount: resolved.length,
      failedCount: failed.length,
      autoResolved: resolved.filter(r => r.metadata.appliedBy === 'auto').length,
      userResolved: resolved.filter(r => r.metadata.appliedBy === 'user').length
    };

    Logger.info(`Conflict resolution complete`, summary);
    return { resolved, failed, summary };
  }

  /**
   * Suggest optimal resolution strategy for a conflict
   */
  suggestResolutionStrategy(conflict: ConfigurationConflict): {
    primary: MergeStrategy;
    alternatives: { strategy: MergeStrategy; score: number; reason: string }[];
    considerations: string[];
  } {
    const alternatives: { strategy: MergeStrategy; score: number; reason: string }[] = [];
    const considerations: string[] = [];

    // Analyze conflict characteristics
    const hasTypeConflict = conflict.type === 'type_mismatch';
    const isHighSeverity = conflict.severity === 'high' || conflict.severity === 'critical';
    const hasPerformanceImpact = conflict.impact.performanceImpact !== 'none';

    // Score different strategies
    const strategies: MergeStrategy[] = ['override', 'merge', 'fallback', 'validate'];
    
    for (const strategy of strategies) {
      const score = this.calculateStrategyScore(conflict, strategy);
      const reason = this.getStrategyReason(conflict, strategy);
      alternatives.push({ strategy, score, reason });
    }

    // Sort by score (highest first)
    alternatives.sort((a, b) => b.score - a.score);

    // Add considerations
    if (hasTypeConflict) {
      considerations.push('Type mismatch detected - consider data transformation');
    }

    if (isHighSeverity) {
      considerations.push('High severity conflict - review carefully before applying');
    }

    if (hasPerformanceImpact) {
      considerations.push('Resolution may impact performance - test thoroughly');
    }

    if (conflict.autoResolvable) {
      considerations.push('Conflict can be auto-resolved safely');
    } else {
      considerations.push('Manual review recommended due to complexity');
    }

    return {
      primary: alternatives[0].strategy,
      alternatives,
      considerations
    };
  }

  /**
   * Update resolution context
   */
  updateContext(updates: Partial<ResolutionContext>): void {
    Object.assign(this.context, updates);
    Logger.debug('Updated conflict resolution context');
  }

  /**
   * Get conflict resolution statistics
   */
  getResolutionStatistics(): {
    totalConflicts: number;
    resolvedConflicts: number;
    failedResolutions: number;
    averageResolutionTime: number;
    mostCommonConflictType: string;
    mostUsedStrategy: MergeStrategy;
    successRate: number;
  } {
    const allResults = Array.from(this.resolutionHistory.values()).flat();
    
    const totalConflicts = allResults.length;
    const resolvedConflicts = allResults.filter(r => r.success).length;
    const failedResolutions = totalConflicts - resolvedConflicts;
    
    const averageResolutionTime = totalConflicts > 0 
      ? allResults.reduce((sum, r) => sum + r.metadata.resolutionTime, 0) / totalConflicts
      : 0;

    const strategyCount = new Map<MergeStrategy, number>();
    allResults.forEach(r => {
      strategyCount.set(r.appliedStrategy, (strategyCount.get(r.appliedStrategy) || 0) + 1);
    });

    const mostUsedStrategy = Array.from(strategyCount.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'merge';

    return {
      totalConflicts,
      resolvedConflicts,
      failedResolutions,
      averageResolutionTime,
      mostCommonConflictType: 'value_mismatch', // Placeholder
      mostUsedStrategy,
      successRate: totalConflicts > 0 ? resolvedConflicts / totalConflicts : 1
    };
  }

  // Private helper methods

  private traverseAndDetectConflicts(
    base: any,
    overlay: any,
    layerType: ConfigurationLayerType,
    path: string,
    conflicts: ConfigurationConflict[]
  ): void {
    if (!base || !overlay) return;

    for (const key in overlay) {
      const currentPath = path ? `${path}.${key}` : key;
      const baseValue = base[key];
      const overlayValue = overlay[key];

      if (baseValue !== undefined && overlayValue !== undefined) {
        const conflict = this.analyzeValueConflict(
          baseValue,
          overlayValue,
          layerType,
          currentPath
        );

        if (conflict) {
          conflicts.push(conflict);
        }

        // Recurse for nested objects
        if (this.isObject(baseValue) && this.isObject(overlayValue)) {
          this.traverseAndDetectConflicts(
            baseValue,
            overlayValue,
            layerType,
            currentPath,
            conflicts
          );
        }
      }
    }
  }

  private analyzeValueConflict(
    baseValue: any,
    overlayValue: any,
    layerType: ConfigurationLayerType,
    path: string
  ): ConfigurationConflict | null {
    // Skip if values are equal
    if (this.deepEqual(baseValue, overlayValue)) {
      return null;
    }

    const conflictId = `${layerType}_${path}_${Date.now()}`;
    const conflictType = this.determineConflictType(baseValue, overlayValue);
    const severity = this.determineSeverity(path, baseValue, overlayValue);

    const conflict: ConfigurationConflict = {
      id: conflictId,
      path,
      values: {
        [layerType]: overlayValue,
        universal: baseValue // Assuming base is from universal layer
      } as Record<ConfigurationLayerType, any>,
      severity,
      type: conflictType,
      suggestedResolution: this.generateSuggestedResolution(baseValue, overlayValue, path),
      resolutionOptions: this.generateResolutionOptions(baseValue, overlayValue),
      autoResolvable: this.isAutoResolvable(severity, conflictType, path),
      impact: this.assessImpact(path, baseValue, overlayValue)
    };

    return conflict;
  }

  private determineConflictType(baseValue: any, overlayValue: any): ConfigurationConflict['type'] {
    if (typeof baseValue !== typeof overlayValue) {
      return 'type_mismatch';
    }

    if (this.isLogicallyInconsistent(baseValue, overlayValue)) {
      return 'logical_inconsistency';
    }

    if (this.hasDependencyConflict(baseValue, overlayValue)) {
      return 'dependency_conflict';
    }

    return 'value_mismatch';
  }

  private determineSeverity(
    path: string,
    baseValue: any,
    overlayValue: any
  ): ConfigurationConflict['severity'] {
    // Critical paths that affect core functionality
    const criticalPaths = [
      'supabaseUrl',
      'supabaseServiceKey',
      'environment',
      'makerkit.completeAuthFlow',
      'makerkit.rlsCompliance'
    ];

    // High importance paths
    const highPaths = [
      'userCount',
      'seeding',
      'performance',
      'safety'
    ];

    if (criticalPaths.some(p => path.includes(p))) {
      return 'critical';
    }

    if (highPaths.some(p => path.includes(p))) {
      return 'high';
    }

    if (typeof baseValue !== typeof overlayValue) {
      return 'high';
    }

    if (this.hasSignificantValueDifference(baseValue, overlayValue)) {
      return 'medium';
    }

    return 'low';
  }

  private generateSuggestedResolution(
    baseValue: any,
    overlayValue: any,
    path: string
  ): ConfigurationConflict['suggestedResolution'] {
    // Use path-specific strategy if available
    const pathStrategy = this.context.pathStrategies[path];
    if (pathStrategy) {
      return {
        strategy: pathStrategy,
        reason: `Path-specific strategy configured for ${path}`,
        confidence: 0.9
      };
    }

    // Suggest based on value types and characteristics
    if (typeof baseValue !== typeof overlayValue) {
      return {
        strategy: 'validate',
        reason: 'Type mismatch requires validation',
        confidence: 0.8
      };
    }

    if (this.isObject(baseValue) && this.isObject(overlayValue)) {
      return {
        strategy: 'merge',
        reason: 'Objects can be merged effectively',
        confidence: 0.9
      };
    }

    if (Array.isArray(baseValue) && Array.isArray(overlayValue)) {
      return {
        strategy: 'merge',
        reason: 'Arrays can be concatenated',
        confidence: 0.8
      };
    }

    return {
      strategy: 'override',
      reason: 'Simple value override is safe',
      confidence: 0.7
    };
  }

  private generateResolutionOptions(
    baseValue: any,
    overlayValue: any
  ): ConfigurationConflict['resolutionOptions'] {
    const options: ConfigurationConflict['resolutionOptions'] = [
      {
        strategy: 'override',
        description: 'Use the new value, replacing the existing one',
        implications: ['Previous value will be lost', 'May affect dependent configurations'],
        recommendationScore: 0.7
      },
      {
        strategy: 'fallback',
        description: 'Keep the existing value, ignore the new one',
        implications: ['New configuration will be ignored', 'May not utilize new features'],
        recommendationScore: 0.5
      }
    ];

    if (this.isObject(baseValue) && this.isObject(overlayValue)) {
      options.push({
        strategy: 'merge',
        description: 'Combine both configurations intelligently',
        implications: ['Both configurations contribute to final result', 'May create complex nested structure'],
        recommendationScore: 0.9
      });
    }

    options.push({
      strategy: 'validate',
      description: 'Validate compatibility and choose best option',
      implications: ['Requires additional validation time', 'Safest option for critical configurations'],
      recommendationScore: 0.8
    });

    return options.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  private isAutoResolvable(
    severity: ConfigurationConflict['severity'],
    type: ConfigurationConflict['type'],
    path: string
  ): boolean {
    // Never auto-resolve critical conflicts
    if (severity === 'critical') {
      return false;
    }

    // Check if path requires user confirmation
    if (this.context.constraints.requireUserConfirmation.includes(path)) {
      return false;
    }

    // Check auto-resolve level preference
    const level = this.context.userPreferences.autoResolveLevel;
    
    switch (level) {
      case 'none':
        return false;
      case 'safe':
        return severity === 'low' && type === 'value_mismatch';
      case 'moderate':
        return (severity === 'low' || severity === 'medium') && type !== 'logical_inconsistency';
      case 'aggressive':
        return severity === 'low' || severity === 'medium' || severity === 'high';
      default:
        return false;
    }
  }

  private assessImpact(
    path: string,
    baseValue: any,
    overlayValue: any
  ): ConfigurationConflict['impact'] {
    const performanceImpact = this.assessPerformanceImpact(path, baseValue, overlayValue);
    const compatibilityRisk = this.assessCompatibilityRisk(path, baseValue, overlayValue);
    const userExperienceImpact = this.assessUserExperienceImpact(path, baseValue, overlayValue);

    return {
      affectedFeatures: this.getAffectedFeatures(path),
      performanceImpact,
      compatibilityRisk,
      userExperienceImpact
    };
  }

  private sortConflictsByPriority(conflicts: ConfigurationConflict[]): ConfigurationConflict[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return conflicts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Secondary sort by auto-resolvable (non-auto-resolvable first)
      if (a.autoResolvable !== b.autoResolvable) {
        return a.autoResolvable ? 1 : -1;
      }
      
      return 0;
    });
  }

  private canAutoResolve(conflict: ConfigurationConflict): boolean {
    return conflict.autoResolvable && 
           conflict.severity !== 'critical' &&
           !this.context.constraints.requireUserConfirmation.includes(conflict.path);
  }

  private applyResolutionStrategy(
    conflict: ConfigurationConflict,
    strategy: MergeStrategy
  ): { success: boolean; value: any; confidence: number; warnings: string[] } {
    const warnings: string[] = [];
    
    try {
      const values = Object.values(conflict.values);
      const baseValue = values[0];
      const overlayValue = values[1];

      let resolvedValue: any;
      let confidence = 0.8;

      switch (strategy) {
        case 'override':
          resolvedValue = overlayValue;
          confidence = 0.9;
          break;
          
        case 'fallback':
          resolvedValue = baseValue;
          confidence = 0.7;
          warnings.push('Using fallback value - new configuration ignored');
          break;
          
        case 'merge':
          if (this.isObject(baseValue) && this.isObject(overlayValue)) {
            resolvedValue = { ...baseValue, ...overlayValue };
            confidence = 0.9;
          } else if (Array.isArray(baseValue) && Array.isArray(overlayValue)) {
            resolvedValue = [...baseValue, ...overlayValue];
            confidence = 0.8;
          } else {
            resolvedValue = overlayValue;
            confidence = 0.6;
            warnings.push('Cannot merge non-object values - using override strategy');
          }
          break;
          
        case 'validate':
          // Perform validation and choose best value
          resolvedValue = this.validateAndChoose(baseValue, overlayValue);
          confidence = 0.8;
          break;
          
        default:
          resolvedValue = overlayValue;
          confidence = 0.5;
          warnings.push(`Unknown strategy ${strategy} - using override`);
      }

      return { success: true, value: resolvedValue, confidence, warnings };
      
    } catch (error) {
      return { 
        success: false, 
        value: null, 
        confidence: 0, 
        warnings: [`Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
      };
    }
  }

  private calculateStrategyScore(conflict: ConfigurationConflict, strategy: MergeStrategy): number {
    let score = 0.5; // Base score

    // Factor in conflict type
    switch (conflict.type) {
      case 'value_mismatch':
        if (strategy === 'override') score += 0.3;
        if (strategy === 'merge') score += 0.2;
        break;
      case 'type_mismatch':
        if (strategy === 'validate') score += 0.4;
        break;
      case 'logical_inconsistency':
        if (strategy === 'validate') score += 0.5;
        break;
      case 'dependency_conflict':
        if (strategy === 'validate') score += 0.4;
        if (strategy === 'merge') score += 0.2;
        break;
    }

    // Factor in severity
    switch (conflict.severity) {
      case 'critical':
        if (strategy === 'validate') score += 0.3;
        break;
      case 'high':
        if (strategy === 'validate') score += 0.2;
        break;
      case 'medium':
        if (strategy === 'merge') score += 0.2;
        break;
      case 'low':
        if (strategy === 'override') score += 0.2;
        break;
    }

    // Factor in user preferences
    if (this.context.userPreferences.prioritizePerformance && strategy === 'override') {
      score += 0.1;
    }

    if (this.context.userPreferences.prioritizeCompatibility && strategy === 'validate') {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private getStrategyReason(conflict: ConfigurationConflict, strategy: MergeStrategy): string {
    const reasons: Record<MergeStrategy, string> = {
      override: 'Replaces old value with new value - simple and fast',
      merge: 'Combines values intelligently - preserves information from both sources',
      fallback: 'Keeps existing value - safest option but ignores new configuration',
      validate: 'Validates compatibility first - safest for complex conflicts',
      custom: 'Uses custom resolution logic'
    };

    return reasons[strategy] || 'Strategy not recognized';
  }

  private recordResolution(conflictId: string, result: ConflictResolutionResult): void {
    const history = this.resolutionHistory.get(conflictId) || [];
    history.push(result);
    this.resolutionHistory.set(conflictId, history);
  }

  private analyzeConflictPatterns(conflicts: ConfigurationConflict[]): void {
    // Group conflicts by path patterns for analysis
    const patterns = new Map<string, ConfigurationConflict[]>();
    
    conflicts.forEach(conflict => {
      const pattern = this.extractPathPattern(conflict.path);
      const existing = patterns.get(pattern) || [];
      existing.push(conflict);
      patterns.set(pattern, existing);
    });

    this.conflictPatterns = patterns;
  }

  private extractPathPattern(path: string): string {
    // Extract pattern like "layer.section.*" from "layer.section.specific.field"
    const parts = path.split('.');
    if (parts.length <= 2) return path;
    return `${parts[0]}.${parts[1]}.*`;
  }

  // Utility methods

  private isObject(value: any): boolean {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;

    if (this.isObject(a)) {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.deepEqual(item, b[index]));
    }

    return false;
  }

  private isLogicallyInconsistent(baseValue: any, overlayValue: any): boolean {
    // Example: enabled: false with required features
    if (typeof baseValue === 'boolean' && typeof overlayValue === 'boolean') {
      return false; // Boolean conflicts are just value mismatches
    }
    return false; // Placeholder - implement specific logic checks
  }

  private hasDependencyConflict(baseValue: any, overlayValue: any): boolean {
    // Placeholder for dependency conflict detection
    return false;
  }

  private hasSignificantValueDifference(baseValue: any, overlayValue: any): boolean {
    if (typeof baseValue === 'number' && typeof overlayValue === 'number') {
      const ratio = Math.abs(baseValue - overlayValue) / Math.max(baseValue, overlayValue, 1);
      return ratio > 0.5; // 50% difference is significant
    }
    return true; // Assume significant for non-numeric values
  }

  private assessPerformanceImpact(path: string, baseValue: any, overlayValue: any): 'none' | 'low' | 'medium' | 'high' {
    const performancePaths = ['batchSize', 'parallelism', 'timeout', 'userCount'];
    if (performancePaths.some(p => path.includes(p))) {
      return 'medium';
    }
    return 'none';
  }

  private assessCompatibilityRisk(path: string, baseValue: any, overlayValue: any): 'none' | 'low' | 'medium' | 'high' {
    const criticalPaths = ['supabaseUrl', 'environment', 'rlsCompliance'];
    if (criticalPaths.some(p => path.includes(p))) {
      return 'high';
    }
    return 'low';
  }

  private assessUserExperienceImpact(path: string, baseValue: any, overlayValue: any): 'none' | 'minor' | 'moderate' | 'significant' {
    const uxPaths = ['userCount', 'contentRatios', 'archetypes'];
    if (uxPaths.some(p => path.includes(p))) {
      return 'moderate';
    }
    return 'minor';
  }

  private getAffectedFeatures(path: string): string[] {
    const featureMap: Record<string, string[]> = {
      'seeding': ['data-generation', 'user-creation'],
      'makerkit': ['authentication', 'authorization'],
      'performance': ['batch-processing', 'parallel-execution'],
      'archetypes': ['user-behavior', 'content-patterns']
    };

    for (const [key, features] of Object.entries(featureMap)) {
      if (path.includes(key)) {
        return features;
      }
    }

    return [];
  }

  private validateAndChoose(baseValue: any, overlayValue: any): any {
    // Implement validation logic and choose the best value
    // This is a simplified implementation
    
    if (typeof baseValue === typeof overlayValue) {
      // Same type - prefer overlay value as it's more recent
      return overlayValue;
    }

    // Type mismatch - need careful consideration
    if (typeof overlayValue === 'string' && typeof baseValue === 'number') {
      const parsed = Number(overlayValue);
      return isNaN(parsed) ? baseValue : parsed;
    }

    if (typeof overlayValue === 'number' && typeof baseValue === 'string') {
      return overlayValue; // Prefer numeric value
    }

    // Default to base value for safety
    return baseValue;
  }
}