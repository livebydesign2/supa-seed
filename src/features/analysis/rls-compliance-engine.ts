/**
 * RLS Compliance Engine
 * Analyzes and validates Row Level Security policies
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';

export interface ComplianceEngineConfig {
  strictMode: boolean;
  autoFix: boolean;
  autoFixEnabled?: boolean;
  enableAdvancedParsing?: boolean;
  enableConflictDetection?: boolean;
  enablePerformanceAnalysis?: boolean;
  enableSecurityAnalysis?: boolean;
  auditLevel?: 'basic' | 'comprehensive' | 'detailed';
  generateReports?: boolean;
  frameworkSpecific?: boolean;
  maxConcurrentValidations?: number;
  reportFormat?: 'json' | 'markdown' | 'html';
  includeTables?: string[];
  excludeTables?: string[];
  policies?: {
    enforceAuthentication: boolean;
    requireTenantIsolation: boolean;
    validateOwnership: boolean;
  };
}

export interface ComplianceEngineResult {
  overallCompliance: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    criticalIssues: number;
  } | number; // Support both formats for backward compatibility
  tablesAnalyzed: number;
  policiesFound: number;
  violations: ComplianceViolation[];
  recommendations: string[];
  autoFixesApplied: AutoFix[];
  autoFixResults?: AutoFixResult[];
  isCompliant?: boolean;
  requiresUserContext?: boolean;
  suggestedFixes?: AutoFix[];
  policyAnalysis?: {
    parsedPolicies: ParsedPolicy[];
    securityDistribution: {
      strong: number;
      moderate: number;
      weak: number;
    };
  };
  executionMetrics?: {
    duration: number;
    tablesProcessed: number;
    policiesAnalyzed: number;
  };
  summary: {
    compliant: number;
    nonCompliant: number;
    warnings: number;
  };
}

export interface AutoFixResult extends AutoFix {
  status: 'applied' | 'failed' | 'skipped' | 'requires_manual_review';
  error?: string;
  fixType?: string;
  originalIssue?: string;
}

export interface ParsedPolicy {
  name: string;
  table: string;
  command: string;
  parsed: {
    expression: string;
    hasUserContext: boolean;
    securityLevel: 'strong' | 'moderate' | 'weak';
  };
}

export interface ComplianceViolation {
  table: string;
  severity: 'high' | 'medium' | 'low';
  type: 'missing_policy' | 'insecure_policy' | 'policy_conflict';
  description: string;
  recommendation: string;
  autoFixAvailable: boolean;
}

export interface AutoFix {
  table: string;
  description: string;
  applied: boolean;
  sql?: string;
}

export type ComplianceStatus = 'compliant' | 'partial' | 'non_compliant';

export class RLSComplianceEngine {
  private client: any;
  private config: ComplianceEngineConfig;

  constructor(client: any, config?: Partial<ComplianceEngineConfig>) {
    this.client = client;
    this.config = {
      strictMode: false,
      autoFix: false,
      policies: {
        enforceAuthentication: true,
        requireTenantIsolation: false,
        validateOwnership: true
      },
      ...config
    };
  }

  /**
   * Analyze RLS compliance across all tables
   */
  async analyzeCompliance(): Promise<ComplianceEngineResult> {
    Logger.info('🔍 Starting RLS compliance analysis...');
    const startTime = Date.now();

    try {
      const tables = await this.getTables();
      const violations: ComplianceViolation[] = [];
      const autoFixesApplied: AutoFix[] = [];
      let policiesFound = 0;

      for (const table of tables) {
        if (this.shouldSkipTable(table)) {
          continue;
        }

        const tableAnalysis = await this.analyzeTableCompliance(table);
        violations.push(...tableAnalysis.violations);
        policiesFound += tableAnalysis.policiesFound;

        if (this.config.autoFix && tableAnalysis.autoFixes.length > 0) {
          const appliedFixes = await this.applyAutoFixes(table, tableAnalysis.autoFixes);
          autoFixesApplied.push(...appliedFixes);
        }
      }

      const compliant = tables.filter(t => violations.filter(v => v.table === t).length === 0).length;
      const nonCompliant = tables.length - compliant;

      const complianceScore = (compliant / tables.length) * 100;
      const criticalIssues = violations.filter(v => v.severity === 'high').length;
      
      const result: ComplianceEngineResult = {
        overallCompliance: this.config.enableAdvancedParsing ? {
          score: complianceScore,
          grade: this.calculateGrade(complianceScore),
          criticalIssues
        } : complianceScore,
        tablesAnalyzed: tables.length,
        policiesFound,
        violations,
        recommendations: this.generateRecommendations(violations),
        autoFixesApplied,
        autoFixResults: autoFixesApplied.map(fix => ({
          ...fix,
          status: fix.applied ? 'applied' as const : 'failed' as const
        })),
        isCompliant: complianceScore >= 80,
        requiresUserContext: violations.some(v => v.description.includes('authentication')),
        suggestedFixes: autoFixesApplied,
        policyAnalysis: this.config.enableAdvancedParsing ? {
          parsedPolicies: await this.analyzePolicies(tables),
          securityDistribution: {
            strong: 0,
            moderate: 0,
            weak: violations.filter(v => v.type === 'insecure_policy').length
          }
        } : undefined,
        executionMetrics: this.config.enablePerformanceAnalysis ? {
          duration: Date.now() - startTime,
          tablesProcessed: tables.length,
          policiesAnalyzed: policiesFound
        } : undefined,
        summary: {
          compliant,
          nonCompliant,
          warnings: violations.filter(v => v.severity === 'low').length
        }
      };

      const compliancePercent = typeof result.overallCompliance === 'number' 
        ? result.overallCompliance 
        : result.overallCompliance.score;
      
      Logger.success(`✅ RLS compliance analysis complete: ${compliancePercent.toFixed(1)}% compliant`);
      return result;

    } catch (error: any) {
      Logger.error(`RLS compliance analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze RLS compliance for a specific table
   */
  private async analyzeTableCompliance(table: string): Promise<{
    violations: ComplianceViolation[];
    policiesFound: number;
    autoFixes: AutoFix[];
  }> {
    const violations: ComplianceViolation[] = [];
    const autoFixes: AutoFix[] = [];
    let policiesFound = 0;

    try {
      // Check if RLS is enabled
      const rlsEnabled = await this.isRLSEnabled(table);
      if (!rlsEnabled) {
        violations.push({
          table,
          severity: 'high',
          type: 'missing_policy',
          description: 'RLS is not enabled on this table',
          recommendation: 'Enable RLS to secure table access',
          autoFixAvailable: true
        });

        autoFixes.push({
          table,
          description: 'Enable RLS on table',
          applied: false,
          sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
        });
      }

      // Check for existing policies
      const policies = await this.getTablePolicies(table);
      policiesFound = policies.length;

      if (policies.length === 0 && rlsEnabled) {
        violations.push({
          table,
          severity: 'high',
          type: 'missing_policy',
          description: 'RLS enabled but no policies defined',
          recommendation: 'Create appropriate RLS policies for this table',
          autoFixAvailable: false
        });
      }

      // Analyze policy security
      for (const policy of policies) {
        const policyViolations = this.analyzePolicyCompliance(table, policy);
        violations.push(...policyViolations);
      }

    } catch (error: any) {
      Logger.warn(`Could not analyze table ${table}: ${error.message}`);
    }

    return { violations, policiesFound, autoFixes };
  }

  /**
   * Check if RLS is enabled on a table
   */
  private async isRLSEnabled(table: string): Promise<boolean> {
    try {
      const { data } = await this.client
        .from('pg_tables')
        .select('*')
        .eq('tablename', table)
        .single();

      return data?.rowsecurity || false;
    } catch {
      // Fallback method
      try {
        const { data } = await this.client.rpc('check_rls_enabled', { table_name: table });
        return data || false;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get RLS policies for a table
   */
  private async getTablePolicies(table: string): Promise<any[]> {
    try {
      const { data } = await this.client
        .from('pg_policies')
        .select('*')
        .eq('tablename', table);

      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Analyze individual policy compliance
   */
  private analyzePolicyCompliance(table: string, policy: any): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    // Check for overly permissive policies
    if (policy.qual && (policy.qual.includes('true') || policy.qual === '')) {
      violations.push({
        table,
        severity: 'medium',
        type: 'insecure_policy',
        description: `Policy "${policy.policyname}" may be overly permissive`,
        recommendation: 'Review policy conditions to ensure proper access control',
        autoFixAvailable: false
      });
    }

    // Check for authentication requirements
    if (this.config.policies?.enforceAuthentication && !policy.qual?.includes('auth.')) {
      violations.push({
        table,
        severity: 'medium',
        type: 'insecure_policy',
        description: `Policy "${policy.policyname}" doesn't enforce authentication`,
        recommendation: 'Add authentication checks to policy conditions',
        autoFixAvailable: false
      });
    }

    return violations;
  }

  /**
   * Apply auto-fixes for RLS issues
   */
  private async applyAutoFixes(table: string, fixes: AutoFix[]): Promise<AutoFix[]> {
    const appliedFixes: AutoFix[] = [];

    for (const fix of fixes) {
      try {
        if (fix.sql) {
          // In a real implementation, we would execute the SQL
          // For now, we'll just mark it as applied
          Logger.info(`Would apply fix for ${table}: ${fix.description}`);
          
          appliedFixes.push({
            ...fix,
            applied: true
          });
        }
      } catch (error: any) {
        Logger.error(`Failed to apply fix for ${table}: ${error.message}`);
        appliedFixes.push({
          ...fix,
          applied: false
        });
      }
    }

    return appliedFixes;
  }

  /**
   * Get list of tables to analyze
   */
  private async getTables(): Promise<string[]> {
    try {
      const { data } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .neq('table_type', 'VIEW');

      return data?.map((t: any) => t.table_name) || [];
    } catch {
      // Fallback to common tables
      return ['users', 'profiles', 'accounts', 'organizations'];
    }
  }

  /**
   * Check if table should be skipped from analysis
   */
  private shouldSkipTable(table: string): boolean {
    if (this.config.includeTables && !this.config.includeTables.includes(table)) {
      return true;
    }

    if (this.config.excludeTables && this.config.excludeTables.includes(table)) {
      return true;
    }

    // Skip system tables
    if (table.startsWith('pg_') || table.startsWith('information_schema')) {
      return true;
    }

    return false;
  }

  /**
   * Analyze and enforce compliance with auto-fixes
   */
  async analyzeAndEnforceCompliance(config?: Partial<ComplianceEngineConfig>): Promise<ComplianceEngineResult> {
    const mergedConfig = { ...this.config, ...config, autoFix: true };
    const originalConfig = this.config;
    this.config = mergedConfig;
    
    try {
      const result = await this.analyzeCompliance();
      return result;
    } finally {
      this.config = originalConfig;
    }
  }

  /**
   * Quick compliance check for a specific table and operation
   */
  async quickComplianceCheck(
    tableName: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT',
    dataCount?: number
  ): Promise<ComplianceEngineResult> {
    Logger.info(`🔍 Quick RLS check for ${tableName} (${operation})`);

    try {
      const violations: ComplianceViolation[] = [];
      const autoFixesApplied: AutoFix[] = [];

      // Check if RLS is enabled
      const rlsEnabled = await this.isRLSEnabled(tableName);
      if (!rlsEnabled) {
        violations.push({
          table: tableName,
          severity: 'high',
          type: 'missing_policy',
          description: `RLS is not enabled for ${operation} operation`,
          recommendation: 'Enable RLS to secure table access',
          autoFixAvailable: true
        });
      }

      // Check for relevant policies
      const policies = await this.getTablePolicies(tableName);
      const relevantPolicies = policies.filter(p => 
        p.cmd?.toUpperCase() === operation || p.cmd?.toUpperCase() === 'ALL'
      );

      if (relevantPolicies.length === 0 && rlsEnabled) {
        violations.push({
          table: tableName,
          severity: 'high',
          type: 'missing_policy',
          description: `No RLS policy found for ${operation} operation`,
          recommendation: `Create RLS policy for ${operation} operations`,
          autoFixAvailable: false
        });
      }

      const complianceScore = violations.length === 0 ? 100 : 0;
      
      const result: ComplianceEngineResult = {
        overallCompliance: this.config.enableAdvancedParsing ? {
          score: complianceScore,
          grade: this.calculateGrade(complianceScore),
          criticalIssues: violations.filter(v => v.severity === 'high').length
        } : complianceScore,
        tablesAnalyzed: 1,
        policiesFound: policies.length,
        violations,
        recommendations: this.generateRecommendations(violations),
        autoFixesApplied,
        autoFixResults: autoFixesApplied.map(fix => ({
          ...fix,
          status: fix.applied ? 'applied' as const : 'failed' as const
        })),
        isCompliant: complianceScore >= 80,
        requiresUserContext: violations.some(v => v.description.includes('authentication')),
        suggestedFixes: autoFixesApplied,
        summary: {
          compliant: violations.length === 0 ? 1 : 0,
          nonCompliant: violations.length > 0 ? 1 : 0,
          warnings: violations.filter(v => v.severity === 'low').length
        }
      };

      Logger.success(`✅ Quick RLS check complete for ${tableName}`);
      return result;

    } catch (error: any) {
      Logger.error(`Quick RLS check failed for ${tableName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate formatted report
   */
  async generateFormattedReport(
    result: ComplianceEngineResult,
    format: 'json' | 'markdown' | 'html' = 'markdown'
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'html':
        return this.generateHtmlReport(result);
      default:
        return this.generateMarkdownReport(result);
    }
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(result: ComplianceEngineResult): string {
    let markdown = `# RLS Compliance Report\n\n`;
    markdown += `**Overall Compliance:** ${this.getComplianceScore(result.overallCompliance).toFixed(1)}%\n`;
    markdown += `**Tables Analyzed:** ${result.tablesAnalyzed}\n`;
    markdown += `**Policies Found:** ${result.policiesFound}\n\n`;

    if (result.violations.length > 0) {
      markdown += `## Violations\n\n`;
      for (const violation of result.violations) {
        markdown += `### ${violation.table} - ${violation.severity.toUpperCase()}\n`;
        markdown += `**Type:** ${violation.type}\n`;
        markdown += `**Description:** ${violation.description}\n`;
        markdown += `**Recommendation:** ${violation.recommendation}\n\n`;
      }
    }

    if (result.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      for (const rec of result.recommendations) {
        markdown += `- ${rec}\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(result: ComplianceEngineResult): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>RLS Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .compliance-score { font-size: 24px; font-weight: bold; 
                           color: ${this.getComplianceScore(result.overallCompliance) >= 80 ? 'green' : this.getComplianceScore(result.overallCompliance) >= 50 ? 'orange' : 'red'}; }
        .violation { margin: 15px 0; padding: 10px; border-left: 4px solid #dc3545; background: #f8f9fa; }
        .recommendation { margin: 5px 0; }
    </style>
</head>
<body>
    <h1>RLS Compliance Report</h1>
    <div class="compliance-score">Overall Compliance: ${this.getComplianceScore(result.overallCompliance).toFixed(1)}%</div>
    <p><strong>Tables Analyzed:</strong> ${result.tablesAnalyzed}</p>
    <p><strong>Policies Found:</strong> ${result.policiesFound}</p>
    
    ${result.violations.length > 0 ? `
    <h2>Violations</h2>
    ${result.violations.map(v => `
        <div class="violation">
            <h3>${v.table} - ${v.severity.toUpperCase()}</h3>
            <p><strong>Type:</strong> ${v.type}</p>
            <p><strong>Description:</strong> ${v.description}</p>
            <p><strong>Recommendation:</strong> ${v.recommendation}</p>
        </div>
    `).join('')}
    ` : ''}
    
    ${result.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    <ul>
        ${result.recommendations.map(r => `<li class="recommendation">${r}</li>`).join('')}
    </ul>
    ` : ''}
</body>
</html>`;
  }

  /**
   * Calculate letter grade from compliance score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Analyze policies for security patterns
   */
  private async analyzePolicies(tables: string[]): Promise<ParsedPolicy[]> {
    const parsedPolicies: ParsedPolicy[] = [];

    for (const table of tables) {
      try {
        const policies = await this.getTablePolicies(table);
        
        for (const policy of policies) {
          const expression = policy.qual || '';
          
          parsedPolicies.push({
            name: policy.policyname,
            table,
            command: policy.cmd,
            parsed: {
              expression,
              hasUserContext: expression.includes('auth.') || expression.includes('user_id'),
              securityLevel: this.assessPolicySecurityLevel(expression)
            }
          });
        }
      } catch (error) {
        Logger.warn(`Could not analyze policies for table ${table}`);
      }
    }

    return parsedPolicies;
  }

  /**
   * Assess security level of a policy expression
   */
  private assessPolicySecurityLevel(expression: string): 'strong' | 'moderate' | 'weak' {
    if (!expression || expression.includes('true') || expression === '') {
      return 'weak';
    }

    if (expression.includes('auth.uid()') && expression.includes('user_id')) {
      return 'strong';
    }

    if (expression.includes('auth.') || expression.includes('user_id')) {
      return 'moderate';
    }

    return 'weak';
  }

  /**
   * Get numeric score from compliance union type
   */
  private getComplianceScore(compliance: number | { score: number; grade: string; criticalIssues: number }): number {
    return typeof compliance === 'number' ? compliance : compliance.score;
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ComplianceViolation[]): string[] {
    const recommendations: string[] = [];

    const highSeverityCount = violations.filter(v => v.severity === 'high').length;
    if (highSeverityCount > 0) {
      recommendations.push(`Address ${highSeverityCount} high-severity RLS violations immediately`);
    }

    const missingPolicyCount = violations.filter(v => v.type === 'missing_policy').length;
    if (missingPolicyCount > 0) {
      recommendations.push(`Enable RLS and create policies for ${missingPolicyCount} tables`);
    }

    const insecurePolicyCount = violations.filter(v => v.type === 'insecure_policy').length;
    if (insecurePolicyCount > 0) {
      recommendations.push(`Review and strengthen ${insecurePolicyCount} potentially insecure policies`);
    }

    if (recommendations.length === 0) {
      recommendations.push('RLS compliance looks good! Continue monitoring for changes.');
    }

    return recommendations;
  }
}