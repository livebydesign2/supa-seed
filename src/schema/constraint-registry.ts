/**
 * Constraint Handler Registry
 * Manages registration and selection of constraint handlers
 */

import { Logger } from '../utils/logger';
import {
  ConstraintHandler,
  ConstraintHandlingResult,
  ConstraintType,
  TableConstraints
} from './constraint-types';

export interface ConstraintRegistryOptions {
  enablePriorityHandling?: boolean;
  enableFallbackHandlers?: boolean;
  logHandlerSelection?: boolean;
  validateHandlers?: boolean;
}

export interface HandlerMatch {
  handler: ConstraintHandler;
  confidence: number;
  reason: string;
}

export class ConstraintRegistry {
  private handlers: Map<string, ConstraintHandler> = new Map();
  private handlersByType: Map<ConstraintType, ConstraintHandler[]> = new Map();
  private options: ConstraintRegistryOptions;

  constructor(options: ConstraintRegistryOptions = {}) {
    this.options = {
      enablePriorityHandling: true,
      enableFallbackHandlers: true,
      logHandlerSelection: false,
      validateHandlers: true,
      ...options
    };

    // Initialize type maps
    this.initializeTypeMaps();
  }

  /**
   * Initialize constraint type maps
   */
  private initializeTypeMaps(): void {
    const types: ConstraintType[] = ['check', 'foreign_key', 'unique', 'primary_key', 'not_null'];
    types.forEach(type => {
      this.handlersByType.set(type, []);
    });
  }

  /**
   * Register a constraint handler
   */
  registerHandler(handler: ConstraintHandler): void {
    try {
      // Validate handler if enabled
      if (this.options.validateHandlers) {
        this.validateHandler(handler);
      }

      // Register handler
      this.handlers.set(handler.id, handler);

      // Add to type-specific list
      const typeHandlers = this.handlersByType.get(handler.type) || [];
      typeHandlers.push(handler);
      
      // Sort by priority (higher priority first)
      if (this.options.enablePriorityHandling) {
        typeHandlers.sort((a, b) => b.priority - a.priority);
      }
      
      this.handlersByType.set(handler.type, typeHandlers);

      Logger.debug(`Registered constraint handler: ${handler.id} (type: ${handler.type}, priority: ${handler.priority})`);

    } catch (error: any) {
      Logger.error(`Failed to register handler ${handler.id}:`, error);
      throw error;
    }
  }

  /**
   * Register multiple handlers
   */
  registerHandlers(handlers: ConstraintHandler[]): void {
    for (const handler of handlers) {
      this.registerHandler(handler);
    }
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(handlerId: string): boolean {
    const handler = this.handlers.get(handlerId);
    if (!handler) {
      return false;
    }

    // Remove from main registry
    this.handlers.delete(handlerId);

    // Remove from type-specific list
    const typeHandlers = this.handlersByType.get(handler.type) || [];
    const index = typeHandlers.findIndex(h => h.id === handlerId);
    if (index !== -1) {
      typeHandlers.splice(index, 1);
      this.handlersByType.set(handler.type, typeHandlers);
    }

    Logger.debug(`Unregistered constraint handler: ${handlerId}`);
    return true;
  }

  /**
   * Find the best handler for a constraint
   */
  findHandler(constraint: any, constraintType: ConstraintType, data?: any): HandlerMatch | null {
    const typeHandlers = this.handlersByType.get(constraintType) || [];
    
    if (typeHandlers.length === 0) {
      if (this.options.logHandlerSelection) {
        Logger.debug(`No handlers registered for constraint type: ${constraintType}`);
      }
      return null;
    }

    // Find handlers that can handle this constraint
    const candidates: HandlerMatch[] = [];

    for (const handler of typeHandlers) {
      try {
        if (handler.canHandle(constraint, data)) {
          candidates.push({
            handler,
            confidence: this.calculateHandlerConfidence(handler, constraint, data),
            reason: 'pattern_match'
          });
        }
      } catch (error: any) {
        Logger.warn(`Handler ${handler.id} canHandle check failed:`, error);
      }
    }

    if (candidates.length === 0) {
      if (this.options.logHandlerSelection) {
        Logger.debug(`No handlers can handle constraint ${constraint.constraintName || 'unknown'} of type ${constraintType}`);
      }
      return null;
    }

    // Sort by confidence (higher first) and priority
    candidates.sort((a, b) => {
      const confidenceDiff = b.confidence - a.confidence;
      if (Math.abs(confidenceDiff) > 0.1) {
        return confidenceDiff;
      }
      return b.handler.priority - a.handler.priority;
    });

    const bestMatch = candidates[0];

    if (this.options.logHandlerSelection) {
      Logger.debug(`Selected handler ${bestMatch.handler.id} for ${constraintType} constraint (confidence: ${bestMatch.confidence})`);
    }

    return bestMatch;
  }

  /**
   * Handle a constraint using the best available handler
   */
  handleConstraint(
    constraint: any,
    constraintType: ConstraintType,
    data: any
  ): ConstraintHandlingResult {
    const match = this.findHandler(constraint, constraintType, data);

    if (!match) {
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [`No handler available for ${constraintType} constraint`],
        errors: [],
        bypassRequired: true
      };
    }

    try {
      const result = match.handler.handle(constraint, data);
      
      // Add handler information to result
      if (!result.appliedFixes) {
        result.appliedFixes = [];
      }

      // Log successful handling
      if (this.options.logHandlerSelection && result.success) {
        Logger.debug(`Handler ${match.handler.id} successfully processed constraint`);
      }

      return result;

    } catch (error: any) {
      Logger.error(`Handler ${match.handler.id} failed to process constraint:`, error);
      
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [],
        errors: [`Handler error: ${error.message}`],
        bypassRequired: true
      };
    }
  }

  /**
   * Handle all constraints for a table
   */
  handleTableConstraints(
    tableConstraints: TableConstraints,
    data: any
  ): ConstraintHandlingResult {
    const combinedResult: ConstraintHandlingResult = {
      success: true,
      originalData: { ...data },
      modifiedData: { ...data },
      appliedFixes: [],
      warnings: [],
      errors: [],
      bypassRequired: false
    };

    let currentData = { ...data };

    // Handle check constraints
    for (const constraint of tableConstraints.checkConstraints) {
      const result = this.handleConstraint(constraint, 'check', currentData);
      this.mergeResults(combinedResult, result);
      
      if (result.success && result.modifiedData) {
        currentData = { ...result.modifiedData };
      }
    }

    // Handle foreign key constraints
    for (const constraint of tableConstraints.foreignKeyConstraints) {
      const result = this.handleConstraint(constraint, 'foreign_key', currentData);
      this.mergeResults(combinedResult, result);
      
      if (result.success && result.modifiedData) {
        currentData = { ...result.modifiedData };
      }
    }

    // Handle unique constraints
    for (const constraint of tableConstraints.uniqueConstraints) {
      const result = this.handleConstraint(constraint, 'unique', currentData);
      this.mergeResults(combinedResult, result);
      
      if (result.success && result.modifiedData) {
        currentData = { ...result.modifiedData };
      }
    }

    // Handle not null constraints
    for (const constraint of tableConstraints.notNullConstraints) {
      const result = this.handleConstraint(constraint, 'not_null', currentData);
      this.mergeResults(combinedResult, result);
      
      if (result.success && result.modifiedData) {
        currentData = { ...result.modifiedData };
      }
    }

    combinedResult.modifiedData = currentData;
    return combinedResult;
  }

  /**
   * Get handler by ID
   */
  getHandler(handlerId: string): ConstraintHandler | undefined {
    return this.handlers.get(handlerId);
  }

  /**
   * Get all handlers of a specific type
   */
  getHandlersByType(constraintType: ConstraintType): ConstraintHandler[] {
    return this.handlersByType.get(constraintType) || [];
  }

  /**
   * Get all registered handlers
   */
  getAllHandlers(): ConstraintHandler[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalHandlers: number;
    handlersByType: Record<ConstraintType, number>;
    handlerIds: string[];
  } {
    const stats = {
      totalHandlers: this.handlers.size,
      handlersByType: {} as Record<ConstraintType, number>,
      handlerIds: Array.from(this.handlers.keys())
    };

    // Count by type
    for (const [type, handlers] of this.handlersByType) {
      stats.handlersByType[type] = handlers.length;
    }

    return stats;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.initializeTypeMaps();
    Logger.debug('Cleared all constraint handlers');
  }

  /**
   * Validate a handler before registration
   */
  private validateHandler(handler: ConstraintHandler): void {
    if (!handler.id || typeof handler.id !== 'string') {
      throw new Error('Handler must have a valid string ID');
    }

    if (this.handlers.has(handler.id)) {
      throw new Error(`Handler with ID ${handler.id} is already registered`);
    }

    if (!handler.type || !['check', 'foreign_key', 'unique', 'primary_key', 'not_null'].includes(handler.type)) {
      throw new Error('Handler must have a valid constraint type');
    }

    if (typeof handler.priority !== 'number') {
      throw new Error('Handler must have a numeric priority');
    }

    if (typeof handler.canHandle !== 'function') {
      throw new Error('Handler must implement canHandle method');
    }

    if (typeof handler.handle !== 'function') {
      throw new Error('Handler must implement handle method');
    }
  }

  /**
   * Calculate confidence score for a handler
   */
  private calculateHandlerConfidence(
    handler: ConstraintHandler,
    constraint: any,
    data?: any
  ): number {
    // Base confidence on handler priority (normalized)
    let confidence = Math.min(handler.priority / 100, 1.0);

    // Boost confidence for specific pattern matching
    if (handler.id.includes('makerkit') && 
        (constraint.constraintName?.toLowerCase().includes('makerkit') ||
         constraint.checkClause?.toLowerCase().includes('personal_account'))) {
      confidence += 0.3;
    }

    // Ensure confidence is between 0 and 1
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Merge two constraint handling results
   */
  private mergeResults(
    target: ConstraintHandlingResult,
    source: ConstraintHandlingResult
  ): void {
    // Merge success state (false if any fails)
    target.success = target.success && source.success;

    // Merge arrays
    target.appliedFixes.push(...source.appliedFixes);
    target.warnings.push(...source.warnings);
    target.errors.push(...source.errors);

    // Set bypass required if any handler requires it
    target.bypassRequired = target.bypassRequired || source.bypassRequired;
  }

  /**
   * Test a handler against sample data
   */
  testHandler(
    handlerId: string,
    sampleConstraint: any,
    sampleData: any
  ): {
    canHandle: boolean;
    result?: ConstraintHandlingResult;
    error?: string;
  } {
    const handler = this.handlers.get(handlerId);
    
    if (!handler) {
      return {
        canHandle: false,
        error: `Handler ${handlerId} not found`
      };
    }

    try {
      const canHandle = handler.canHandle(sampleConstraint, sampleData);
      
      if (!canHandle) {
        return { canHandle: false };
      }

      const result = handler.handle(sampleConstraint, sampleData);
      return {
        canHandle: true,
        result
      };

    } catch (error: any) {
      return {
        canHandle: false,
        error: error.message
      };
    }
  }
}