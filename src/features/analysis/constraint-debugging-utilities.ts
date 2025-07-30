/**
 * Constraint Debugging and Testing Utilities for Epic 1: Universal MakerKit Core System
 * Comprehensive debugging tools for constraint handling and validation
 * Part of Task 1.5.5: Create constraint debugging and testing utilities
 */

import { Logger } from '../../core/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { ConstraintHandlers } from './constraint-handlers';
import { MultiTableConstraintResolver } from '../../schema/multi-table-constraint-resolver';
import { AdvancedSlugManager } from '../../schema/slug-management-system';
import {
  ConstraintHandlingResult,
  ConstraintType,
  CheckConstraint,
  ForeignKeyConstraint,
  UniqueConstraint
} from './constraint-types';

/**
 * Constraint debugging session information
 */
export interface ConstraintDebuggingSession {
  sessionId: string;
  startTime: Date;
  tableName: string;
  constraints: any[];
  testData: any[];
  results: ConstraintTestResult[];
  summary: ConstraintDebuggingSummary;
}

/**
 * Result of constraint testing
 */
export interface ConstraintTestResult {
  constraintName: string;
  constraintType: ConstraintType;
  testDataIndex: number;
  originalData: any;
  result: ConstraintHandlingResult;
  handlerUsed: string;
  executionTime: number;
  issues: ConstraintIssue[];
  recommendations: string[];
}

/**
 * Constraint issue identification
 */
export interface ConstraintIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'handler_not_found' | 'constraint_violation' | 'performance' | 'data_quality' | 'business_logic';
  message: string;
  suggestedFix: string;
  affectedField?: string;
  relatedConstraints?: string[];
}

/**
 * Summary of debugging session
 */
export interface ConstraintDebuggingSummary {
  totalConstraints: number;
  totalTests: number;
  successfulHandling: number;
  failedHandling: number;
  bypassRequired: number;
  averageExecutionTime: number;
  issueDistribution: Record<string, number>;
  handlerUsageStats: Record<string, number>;
  recommendations: string[];
}

/**
 * Constraint performance metrics
 */
export interface ConstraintPerformanceMetrics {
  constraintName: string;
  handlerName: string;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  totalExecutions: number;
  successRate: number;
  memoryUsage?: number;
}

/**
 * Comprehensive Constraint Debugging Utilities
 */
export class ConstraintDebuggingUtilities {
  private client: any;
  private multiTableResolver: MultiTableConstraintResolver;
  private slugManager: AdvancedSlugManager;
  private activeSessions: Map<string, ConstraintDebuggingSession> = new Map();
  private performanceMetrics: Map<string, ConstraintPerformanceMetrics> = new Map();

  constructor(client: any) {
    this.client = client;
    this.multiTableResolver = new MultiTableConstraintResolver(client);
    this.slugManager = new AdvancedSlugManager(client);
  }

  /**
   * Start a comprehensive constraint debugging session
   */
  async startDebuggingSession(
    tableName: string,
    constraints: any[],
    testData: any[]
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: ConstraintDebuggingSession = {
      sessionId,
      startTime: new Date(),
      tableName,
      constraints,
      testData,
      results: [],
      summary: {
        totalConstraints: constraints.length,
        totalTests: 0,
        successfulHandling: 0,
        failedHandling: 0,
        bypassRequired: 0,
        averageExecutionTime: 0,
        issueDistribution: {},
        handlerUsageStats: {},
        recommendations: []
      }
    };

    this.activeSessions.set(sessionId, session);
    Logger.info(`Started constraint debugging session: ${sessionId} for table: ${tableName}`);

    return sessionId;
  }

  /**
   * Run comprehensive constraint tests
   */
  async runConstraintTests(sessionId: string): Promise<ConstraintDebuggingSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debugging session not found: ${sessionId}`);
    }

    Logger.info(`Running constraint tests for session: ${sessionId}`);

    for (let dataIndex = 0; dataIndex < session.testData.length; dataIndex++) {
      const testData = session.testData[dataIndex];
      
      for (const constraint of session.constraints) {
        const startTime = Date.now();
        
        try {
          const result = await this.testSingleConstraint(
            constraint,
            testData,
            session.tableName
          );

          const executionTime = Date.now() - startTime;
          const testResult: ConstraintTestResult = {
            constraintName: constraint.constraintName,
            constraintType: constraint.constraintType,
            testDataIndex: dataIndex,
            originalData: { ...testData },
            result,
            handlerUsed: this.identifyHandlerUsed(constraint, result),
            executionTime,
            issues: this.analyzeConstraintIssues(constraint, result, testData),
            recommendations: this.generateRecommendations(constraint, result, testData)
          };

          session.results.push(testResult);
          this.updatePerformanceMetrics(testResult);
          this.updateSessionSummary(session, testResult);

        } catch (error: any) {
          Logger.error(`Error testing constraint ${constraint.constraintName}:`, error);
          
          session.results.push({
            constraintName: constraint.constraintName,
            constraintType: constraint.constraintType,
            testDataIndex: dataIndex,
            originalData: { ...testData },
            result: {
              success: false,
              originalData: testData,
              modifiedData: testData,
              appliedFixes: [],
              warnings: [],
              errors: [error.message],
              bypassRequired: true
            },
            handlerUsed: 'error',
            executionTime: Date.now() - startTime,
            issues: [{
              severity: 'critical',
              type: 'handler_not_found',
              message: `Error during constraint testing: ${error.message}`,
              suggestedFix: 'Review constraint configuration and handler implementation'
            }],
            recommendations: ['Investigate constraint testing error']
          });
        }
      }
    }

    this.generateSessionRecommendations(session);
    Logger.info(`Completed constraint tests for session: ${sessionId}`);

    return session;
  }

  /**
   * Test a single constraint with specific data
   */
  private async testSingleConstraint(
    constraint: any,
    data: any,
    tableName: string
  ): Promise<ConstraintHandlingResult> {
    const constraintType = constraint.constraintType || this.inferConstraintType(constraint);
    
    return ConstraintHandlers.handleConstraint(constraint, constraintType, data);
  }

  /**
   * Analyze constraint handling for issues
   */
  private analyzeConstraintIssues(
    constraint: any,
    result: ConstraintHandlingResult,
    originalData: any
  ): ConstraintIssue[] {
    const issues: ConstraintIssue[] = [];

    // Check for critical failures
    if (!result.success) {
      issues.push({
        severity: 'critical',
        type: 'constraint_violation',
        message: 'Constraint handling failed',
        suggestedFix: 'Review constraint logic and data compatibility',
        relatedConstraints: [constraint.constraintName]
      });
    }

    // Check if bypass is required
    if (result.bypassRequired) {
      issues.push({
        severity: 'high',
        type: 'handler_not_found',
        message: 'No suitable handler found, bypass required',
        suggestedFix: 'Implement specific handler for this constraint pattern',
        relatedConstraints: [constraint.constraintName]
      });
    }

    // Check for data quality issues
    if (result.appliedFixes.length > 3) {
      issues.push({
        severity: 'medium',
        type: 'data_quality',
        message: 'Multiple fixes applied - data quality concerns',
        suggestedFix: 'Review data generation patterns for better quality',
        relatedConstraints: [constraint.constraintName]
      });
    }

    // Check for business logic issues
    if (this.isMakerKitConstraint(constraint)) {
      const businessLogicIssues = this.analyzeMakerKitBusinessLogic(constraint, result, originalData);
      issues.push(...businessLogicIssues);
    }

    // Check for performance issues
    const performanceMetrics = this.performanceMetrics.get(constraint.constraintName);
    if (performanceMetrics && performanceMetrics.averageExecutionTime > 100) {
      issues.push({
        severity: 'medium',
        type: 'performance',
        message: 'Slow constraint processing detected',
        suggestedFix: 'Optimize constraint handler implementation',
        relatedConstraints: [constraint.constraintName]
      });
    }

    return issues;
  }

  /**
   * Analyze MakerKit-specific business logic issues
   */
  private analyzeMakerKitBusinessLogic(
    constraint: any,
    result: ConstraintHandlingResult,
    originalData: any
  ): ConstraintIssue[] {
    const issues: ConstraintIssue[] = [];

    // Check personal account slug constraint
    if (constraint.constraintName?.toLowerCase().includes('accounts_slug_null_if_personal')) {
      if (originalData.is_personal_account === true && originalData.slug !== null) {
        const hasSlugFix = result.appliedFixes.some(fix => fix.field === 'slug');
        if (!hasSlugFix) {
          issues.push({
            severity: 'high',
            type: 'business_logic',
            message: 'Personal account slug constraint not properly handled',
            suggestedFix: 'Ensure slug is set to null for personal accounts',
            affectedField: 'slug'
          });
        }
      }
    }

    // Check organization membership constraints
    if (constraint.constraintName?.toLowerCase().includes('organization_member')) {
      if (originalData.organization_id && originalData.user_id) {
        if (!result.appliedFixes.some(fix => fix.type === 'add_dependency')) {
          issues.push({
            severity: 'medium',
            type: 'business_logic',
            message: 'Organization membership relationship may need validation',
            suggestedFix: 'Verify organization membership constraints'
          });
        }
      }
    }

    return issues;
  }

  /**
   * Generate recommendations for constraint handling
   */
  private generateRecommendations(
    constraint: any,
    result: ConstraintHandlingResult,
    originalData: any
  ): string[] {
    const recommendations: string[] = [];

    // Success recommendations
    if (result.success && result.appliedFixes.length === 0) {
      recommendations.push('Constraint handled successfully without modifications');
    }

    // Fix recommendations
    if (result.appliedFixes.length > 0) {
      const fixTypes = new Set(result.appliedFixes.map(fix => fix.type));
      if (fixTypes.has('set_field')) {
        recommendations.push('Consider improving data generation to reduce field corrections');
      }
      if (fixTypes.has('add_dependency')) {
        recommendations.push('Multi-table dependencies detected - ensure proper creation order');
      }
    }

    // Performance recommendations
    const metrics = this.performanceMetrics.get(constraint.constraintName);
    if (metrics && metrics.averageExecutionTime > 50) {
      recommendations.push('Consider optimizing constraint handler for better performance');
    }

    // MakerKit-specific recommendations
    if (this.isMakerKitConstraint(constraint)) {
      recommendations.push(...this.generateMakerKitRecommendations(constraint, result, originalData));
    }

    return recommendations;
  }

  /**
   * Generate MakerKit-specific recommendations
   */
  private generateMakerKitRecommendations(
    constraint: any,
    result: ConstraintHandlingResult,
    originalData: any
  ): string[] {
    const recommendations: string[] = [];

    // Account type recommendations
    if (originalData.hasOwnProperty('is_personal_account')) {
      if (originalData.is_personal_account === undefined) {
        recommendations.push('Consider explicitly setting is_personal_account for clarity');
      }
    }

    // Slug recommendations
    if (originalData.slug !== undefined) {
      if (originalData.is_personal_account === false && !originalData.slug) {
        recommendations.push('Team accounts benefit from meaningful slug generation');
      }
    }

    // Organization recommendations
    if (originalData.organization_id || originalData.organization_name) {
      recommendations.push('Ensure organization-related constraints are properly validated');
    }

    return recommendations;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(testResult: ConstraintTestResult): void {
    const key = testResult.constraintName;
    const existing = this.performanceMetrics.get(key);

    if (existing) {
      existing.totalExecutions++;
      existing.averageExecutionTime = (
        (existing.averageExecutionTime * (existing.totalExecutions - 1)) + testResult.executionTime
      ) / existing.totalExecutions;
      existing.minExecutionTime = Math.min(existing.minExecutionTime, testResult.executionTime);
      existing.maxExecutionTime = Math.max(existing.maxExecutionTime, testResult.executionTime);
      existing.successRate = existing.successRate + (testResult.result.success ? 1 : 0) / existing.totalExecutions;
    } else {
      this.performanceMetrics.set(key, {
        constraintName: testResult.constraintName,
        handlerName: testResult.handlerUsed,
        averageExecutionTime: testResult.executionTime,
        minExecutionTime: testResult.executionTime,
        maxExecutionTime: testResult.executionTime,
        totalExecutions: 1,
        successRate: testResult.result.success ? 1 : 0
      });
    }
  }

  /**
   * Update session summary
   */
  private updateSessionSummary(session: ConstraintDebuggingSession, testResult: ConstraintTestResult): void {
    session.summary.totalTests++;
    
    if (testResult.result.success) {
      session.summary.successfulHandling++;
    } else {
      session.summary.failedHandling++;
    }

    if (testResult.result.bypassRequired) {
      session.summary.bypassRequired++;
    }

    // Update handler usage stats
    const handler = testResult.handlerUsed;
    session.summary.handlerUsageStats[handler] = (session.summary.handlerUsageStats[handler] || 0) + 1;

    // Update issue distribution
    testResult.issues.forEach(issue => {
      const key = `${issue.severity}_${issue.type}`;
      session.summary.issueDistribution[key] = (session.summary.issueDistribution[key] || 0) + 1;
    });

    // Update average execution time
    const totalTime = session.results.reduce((sum, result) => sum + result.executionTime, 0);
    session.summary.averageExecutionTime = totalTime / session.results.length;
  }

  /**
   * Generate session-level recommendations
   */
  private generateSessionRecommendations(session: ConstraintDebuggingSession): void {
    const summary = session.summary;
    
    // Success rate recommendations
    const successRate = summary.successfulHandling / summary.totalTests;
    if (successRate < 0.8) {
      summary.recommendations.push('Low constraint handling success rate - review handler implementations');
    }

    // Performance recommendations
    if (summary.averageExecutionTime > 100) {
      summary.recommendations.push('High average execution time - consider performance optimizations');
    }

    // Bypass recommendations
    if (summary.bypassRequired > summary.totalTests * 0.1) {
      summary.recommendations.push('High bypass rate - implement more specific constraint handlers');
    }

    // Issue-specific recommendations
    const criticalIssues = Object.entries(summary.issueDistribution)
      .filter(([key]) => key.startsWith('critical'))
      .reduce((sum, [, count]) => sum + count, 0);
    
    if (criticalIssues > 0) {
      summary.recommendations.push('Critical issues detected - immediate attention required');
    }

    // Handler diversity recommendations
    const uniqueHandlers = Object.keys(summary.handlerUsageStats).length;
    if (uniqueHandlers < 3 && summary.totalConstraints > 5) {
      summary.recommendations.push('Limited handler diversity - consider implementing more specific handlers');
    }
  }

  /**
   * Generate detailed debugging report
   */
  generateDebuggingReport(sessionId: string, format: 'json' | 'markdown' | 'html' = 'markdown'): string {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Debugging session not found: ${sessionId}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);
      case 'html':
        return this.generateHtmlReport(session);
      case 'markdown':
      default:
        return this.generateMarkdownReport(session);
    }
  }

  /**
   * Generate markdown debugging report
   */
  private generateMarkdownReport(session: ConstraintDebuggingSession): string {
    const { summary } = session;
    const successRate = ((summary.successfulHandling / summary.totalTests) * 100).toFixed(1);

    return `# Constraint Debugging Report

## Session Information
- **Session ID**: ${session.sessionId}
- **Table**: ${session.tableName}
- **Start Time**: ${session.startTime.toISOString()}
- **Duration**: ${Date.now() - session.startTime.getTime()}ms

## Summary Statistics
- **Total Constraints**: ${summary.totalConstraints}
- **Total Tests**: ${summary.totalTests}
- **Success Rate**: ${successRate}%
- **Average Execution Time**: ${summary.averageExecutionTime.toFixed(2)}ms
- **Bypasses Required**: ${summary.bypassRequired}

## Handler Usage Statistics
${Object.entries(summary.handlerUsageStats)
  .map(([handler, count]) => `- **${handler}**: ${count} uses`)
  .join('\n')}

## Issue Distribution
${Object.entries(summary.issueDistribution)
  .map(([type, count]) => `- **${type}**: ${count} occurrences`)
  .join('\n')}

## Recommendations
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

## Performance Metrics
${Array.from(this.performanceMetrics.values())
  .map(metric => `### ${metric.constraintName}
- **Handler**: ${metric.handlerName}
- **Average Time**: ${metric.averageExecutionTime.toFixed(2)}ms
- **Success Rate**: ${(metric.successRate * 100).toFixed(1)}%
- **Total Executions**: ${metric.totalExecutions}`)
  .join('\n\n')}

## Detailed Test Results
${session.results
  .filter(result => result.issues.length > 0 || result.recommendations.length > 0)
  .map(result => `### ${result.constraintName} (Test ${result.testDataIndex})
- **Handler**: ${result.handlerUsed}
- **Execution Time**: ${result.executionTime}ms
- **Success**: ${result.result.success}
- **Fixes Applied**: ${result.result.appliedFixes.length}

${result.issues.length > 0 ? `**Issues:**
${result.issues.map(issue => `- [${issue.severity.toUpperCase()}] ${issue.message}`).join('\n')}` : ''}

${result.recommendations.length > 0 ? `**Recommendations:**
${result.recommendations.map(rec => `- ${rec}`).join('\n')}` : ''}`)
  .join('\n\n')}
`;
  }

  /**
   * Generate HTML debugging report
   */
  private generateHtmlReport(session: ConstraintDebuggingSession): string {
    // Simplified HTML report generation
    return `<!DOCTYPE html>
<html>
<head>
    <title>Constraint Debugging Report - ${session.sessionId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .issue-critical { color: #d32f2f; }
        .issue-high { color: #f57c00; }
        .issue-medium { color: #1976d2; }
        .issue-low { color: #388e3c; }
    </style>
</head>
<body>
    <h1>Constraint Debugging Report</h1>
    <div class="summary">
        <h2>Session: ${session.sessionId}</h2>
        <p><strong>Table:</strong> ${session.tableName}</p>
        <p><strong>Total Tests:</strong> ${session.summary.totalTests}</p>
        <p><strong>Success Rate:</strong> ${((session.summary.successfulHandling / session.summary.totalTests) * 100).toFixed(1)}%</p>
    </div>
    <!-- Additional HTML content would be generated here -->
</body>
</html>`;
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `debug_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private identifyHandlerUsed(constraint: any, result: ConstraintHandlingResult): string {
    // Try to identify which handler was used based on the result
    if (result.bypassRequired) {
      return 'none_bypass_required';
    }
    
    if (result.appliedFixes.length === 0) {
      return 'generic_passthrough';
    }

    // Check for MakerKit-specific patterns
    const fixReasons = result.appliedFixes.map(fix => fix.reason?.toLowerCase() || '');
    if (fixReasons.some(reason => reason.includes('personal account'))) {
      return 'makerkit_personal_account_slug';
    }
    if (fixReasons.some(reason => reason.includes('organization'))) {
      return 'makerkit_organization_member';
    }
    if (fixReasons.some(reason => reason.includes('subscription'))) {
      return 'makerkit_subscription_status';
    }

    return 'generic_handler';
  }

  private inferConstraintType(constraint: any): ConstraintType {
    if (constraint.checkClause) return 'check';
    if (constraint.referencedTable) return 'foreign_key';
    if (constraint.columns && constraint.columns.length > 1) return 'unique';
    if (constraint.notNull) return 'not_null';
    return 'check';
  }

  private isMakerKitConstraint(constraint: any): boolean {
    const name = constraint.constraintName?.toLowerCase() || '';
    return name.includes('account') || 
           name.includes('organization') || 
           name.includes('subscription') ||
           name.includes('makerkit');
  }

  /**
   * Clean up debugging session
   */
  endDebuggingSession(sessionId: string): void {
    this.activeSessions.delete(sessionId);
    Logger.info(`Ended constraint debugging session: ${sessionId}`);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }
}

export default ConstraintDebuggingUtilities;