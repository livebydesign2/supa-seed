/**
 * RLS Compliance Validator
 * Validates and generates detailed RLS compliance reports
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import type { ComplianceEngineResult, ComplianceViolation } from './rls-compliance-engine';

export interface DetailedComplianceReport {
  timestamp: string;
  overallScore: number;
  tableReports: TableComplianceReport[];
  summary: ComplianceSummary;
  recommendations: RecommendationCategory[];
  trends?: ComplianceTrend[];
}

export interface TableComplianceReport {
  table: string;
  score: number;
  status: 'compliant' | 'partial' | 'non_compliant';
  policies: PolicyReport[];
  violations: ComplianceViolation[];
  lastChecked: string;
}

export interface PolicyReport {
  name: string;
  command: string;
  roles: string[];
  expression: string;
  isSecure: boolean;
  issues: string[];
}

export interface ComplianceSummary {
  totalTables: number;
  compliantTables: number;
  partiallyCompliantTables: number;
  nonCompliantTables: number;
  totalPolicies: number;
  securityScore: number;
}

export interface RecommendationCategory {
  category: 'security' | 'performance' | 'maintenance';
  priority: 'high' | 'medium' | 'low';
  recommendations: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface ComplianceTrend {
  date: string;
  score: number;
  tablesAnalyzed: number;
  violations: number;
}

export interface ComplianceValidationOptions {
  includeHistoricalTrends: boolean;
  generateRecommendations: boolean;
  detailedPolicyAnalysis: boolean;
  exportFormat: 'json' | 'markdown' | 'html';
}

export class RLSComplianceValidator {
  private client: any;
  private validationHistory: ComplianceTrend[] = [];

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Generate detailed compliance report
   */
  async generateDetailedReport(
    engineResult: ComplianceEngineResult,
    options: Partial<ComplianceValidationOptions> = {}
  ): Promise<DetailedComplianceReport> {
    Logger.info('📊 Generating detailed RLS compliance report...');

    const defaultOptions: ComplianceValidationOptions = {
      includeHistoricalTrends: false,
      generateRecommendations: true,
      detailedPolicyAnalysis: true,
      exportFormat: 'json',
      ...options
    };

    try {
      const tableReports = await this.generateTableReports(engineResult);
      const summary = this.generateSummary(engineResult, tableReports);
      const recommendations = defaultOptions.generateRecommendations 
        ? await this.generateRecommendations(engineResult, tableReports)
        : [];

      const trends = defaultOptions.includeHistoricalTrends 
        ? await this.getHistoricalTrends()
        : undefined;

      const report: DetailedComplianceReport = {
        timestamp: new Date().toISOString(),
        overallScore: this.getComplianceScore(engineResult.overallCompliance),
        tableReports,
        summary,
        recommendations,
        trends
      };

      // Store this result for historical tracking
      this.recordComplianceTrend(engineResult);

      Logger.success('✅ Detailed compliance report generated');
      return report;

    } catch (error: any) {
      Logger.error(`Failed to generate detailed report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate individual table compliance reports
   */
  private async generateTableReports(
    engineResult: ComplianceEngineResult
  ): Promise<TableComplianceReport[]> {
    const tableReports: TableComplianceReport[] = [];
    const tables = await this.getUniqueTables(engineResult.violations);

    for (const table of tables) {
      const tableViolations = engineResult.violations.filter(v => v.table === table);
      const policies = await this.getTablePolicyReports(table);
      
      const score = this.calculateTableScore(tableViolations, policies);
      const status = this.determineComplianceStatus(score);

      tableReports.push({
        table,
        score,
        status,
        policies,
        violations: tableViolations,
        lastChecked: new Date().toISOString()
      });
    }

    return tableReports;
  }

  /**
   * Get detailed policy reports for a table
   */
  private async getTablePolicyReports(table: string): Promise<PolicyReport[]> {
    try {
      const { data: policies } = await this.client
        .from('pg_policies')
        .select('*')
        .eq('tablename', table);

      if (!policies) return [];

      return policies.map((policy: any) => ({
        name: policy.policyname,
        command: policy.cmd,
        roles: policy.roles || [],
        expression: policy.qual || '',
        isSecure: this.isPolicySecure(policy),
        issues: this.identifyPolicyIssues(policy)
      }));

    } catch (error: any) {
      Logger.warn(`Could not fetch policies for table ${table}: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if a policy is considered secure
   */
  private isPolicySecure(policy: any): boolean {
    const expression = policy.qual || '';
    
    // Basic security checks
    if (expression.includes('true') || expression === '') {
      return false; // Overly permissive
    }

    if (!expression.includes('auth.')) {
      return false; // No authentication check
    }

    // Could add more sophisticated analysis here
    return true;
  }

  /**
   * Identify specific issues with a policy
   */
  private identifyPolicyIssues(policy: any): string[] {
    const issues: string[] = [];
    const expression = policy.qual || '';

    if (expression.includes('true') || expression === '') {
      issues.push('Policy allows unrestricted access');
    }

    if (!expression.includes('auth.')) {
      issues.push('Policy does not enforce authentication');
    }

    if (expression.includes('OR') && expression.split('OR').length > 3) {
      issues.push('Policy has complex OR conditions that may be hard to maintain');
    }

    if (!expression.includes('user_id') && !expression.includes('owner_id')) {
      issues.push('Policy may not enforce proper ownership checks');
    }

    return issues;
  }

  /**
   * Calculate compliance score for a table
   */
  private calculateTableScore(
    violations: ComplianceViolation[],
    policies: PolicyReport[]
  ): number {
    let score = 100;

    // Deduct points for violations
    for (const violation of violations) {
      switch (violation.severity) {
        case 'high':
          score -= 30;
          break;
        case 'medium':
          score -= 15;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }

    // Deduct points for insecure policies
    const insecurePolicies = policies.filter(p => !p.isSecure).length;
    score -= insecurePolicies * 10;

    // Bonus for having policies
    if (policies.length > 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine compliance status from score
   */
  private determineComplianceStatus(score: number): 'compliant' | 'partial' | 'non_compliant' {
    if (score >= 80) return 'compliant';
    if (score >= 50) return 'partial';
    return 'non_compliant';
  }

  /**
   * Generate summary from engine result and table reports
   */
  private generateSummary(
    engineResult: ComplianceEngineResult,
    tableReports: TableComplianceReport[]
  ): ComplianceSummary {
    const compliantTables = tableReports.filter(t => t.status === 'compliant').length;
    const partiallyCompliantTables = tableReports.filter(t => t.status === 'partial').length;
    const nonCompliantTables = tableReports.filter(t => t.status === 'non_compliant').length;

    const totalPolicies = tableReports.reduce((sum, table) => sum + table.policies.length, 0);
    const averageScore = tableReports.reduce((sum, table) => sum + table.score, 0) / tableReports.length;

    return {
      totalTables: tableReports.length,
      compliantTables,
      partiallyCompliantTables,
      nonCompliantTables,
      totalPolicies,
      securityScore: averageScore
    };
  }

  /**
   * Generate categorized recommendations
   */
  private async generateRecommendations(
    engineResult: ComplianceEngineResult,
    tableReports: TableComplianceReport[]
  ): Promise<RecommendationCategory[]> {
    const categories: RecommendationCategory[] = [];

    // Security recommendations
    const securityRecs: string[] = [];
    const highViolations = engineResult.violations.filter(v => v.severity === 'high');
    if (highViolations.length > 0) {
      securityRecs.push(`Address ${highViolations.length} critical security violations immediately`);
      securityRecs.push('Enable RLS on all tables handling sensitive data');
    }

    const nonCompliantTables = tableReports.filter(t => t.status === 'non_compliant');
    if (nonCompliantTables.length > 0) {
      securityRecs.push(`Create RLS policies for ${nonCompliantTables.length} non-compliant tables`);
    }

    if (securityRecs.length > 0) {
      categories.push({
        category: 'security',
        priority: 'high',
        recommendations: securityRecs,
        estimatedEffort: 'medium'
      });
    }

    // Performance recommendations
    const performanceRecs: string[] = [];
    if (engineResult.policiesFound > 20) {
      performanceRecs.push('Consider consolidating similar policies to improve query performance');
    }

    if (performanceRecs.length > 0) {
      categories.push({
        category: 'performance',
        priority: 'medium',
        recommendations: performanceRecs,
        estimatedEffort: 'low'
      });
    }

    // Maintenance recommendations
    const maintenanceRecs: string[] = [];
    maintenanceRecs.push('Schedule regular RLS compliance reviews');
    maintenanceRecs.push('Document policy intentions for future maintenance');

    categories.push({
      category: 'maintenance',
      priority: 'low',
      recommendations: maintenanceRecs,
      estimatedEffort: 'low'
    });

    return categories;
  }

  /**
   * Get unique table names from violations
   */
  private async getUniqueTables(violations: ComplianceViolation[]): Promise<string[]> {
    const tableSet = new Set(violations.map(v => v.table));
    
    // Also include tables that might not have violations but should be checked
    try {
      const { data: tables } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (tables) {
        tables.forEach((t: any) => tableSet.add(t.table_name));
      }
    } catch {
      // Ignore error, use tables from violations only
    }

    return Array.from(tableSet);
  }

  /**
   * Record compliance trend for historical tracking
   */
  private recordComplianceTrend(engineResult: ComplianceEngineResult): void {
    const trend: ComplianceTrend = {
      date: new Date().toISOString(),
      score: this.getComplianceScore(engineResult.overallCompliance),
      tablesAnalyzed: engineResult.tablesAnalyzed,
      violations: engineResult.violations.length
    };

    this.validationHistory.push(trend);

    // Keep only last 30 entries
    if (this.validationHistory.length > 30) {
      this.validationHistory = this.validationHistory.slice(-30);
    }
  }

  /**
   * Get numeric score from compliance union type
   */
  private getComplianceScore(compliance: number | { score: number; grade: string; criticalIssues: number }): number {
    return typeof compliance === 'number' ? compliance : compliance.score;
  }

  /**
   * Get historical compliance trends
   */
  private async getHistoricalTrends(): Promise<ComplianceTrend[]> {
    return this.validationHistory;
  }

  /**
   * Export report in different formats
   */
  async exportReport(
    report: DetailedComplianceReport,
    format: 'json' | 'markdown' | 'html' = 'json'
  ): Promise<string> {
    switch (format) {
      case 'markdown':
        return this.generateMarkdownReport(report);
      case 'html':
        return this.generateHtmlReport(report);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  /**
   * Generate markdown format report
   */
  private generateMarkdownReport(report: DetailedComplianceReport): string {
    let markdown = `# RLS Compliance Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n`;
    markdown += `**Overall Score:** ${report.overallScore.toFixed(1)}%\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `- **Total Tables:** ${report.summary.totalTables}\n`;
    markdown += `- **Compliant:** ${report.summary.compliantTables}\n`;
    markdown += `- **Partially Compliant:** ${report.summary.partiallyCompliantTables}\n`;
    markdown += `- **Non-Compliant:** ${report.summary.nonCompliantTables}\n`;
    markdown += `- **Total Policies:** ${report.summary.totalPolicies}\n\n`;

    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      for (const category of report.recommendations) {
        markdown += `### ${category.category.toUpperCase()} (${category.priority} priority)\n\n`;
        for (const rec of category.recommendations) {
          markdown += `- ${rec}\n`;
        }
        markdown += `\n`;
      }
    }

    return markdown;
  }

  /**
   * Generate HTML format report
   */
  private generateHtmlReport(report: DetailedComplianceReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>RLS Compliance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .score { font-size: 24px; font-weight: bold; color: ${report.overallScore >= 80 ? 'green' : report.overallScore >= 50 ? 'orange' : 'red'}; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .recommendation { margin: 10px 0; padding: 10px; border-left: 4px solid #007cba; }
    </style>
</head>
<body>
    <h1>RLS Compliance Report</h1>
    <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    <p class="score">Overall Score: ${report.overallScore.toFixed(1)}%</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <ul>
            <li>Total Tables: ${report.summary.totalTables}</li>
            <li>Compliant: ${report.summary.compliantTables}</li>
            <li>Partially Compliant: ${report.summary.partiallyCompliantTables}</li>
            <li>Non-Compliant: ${report.summary.nonCompliantTables}</li>
            <li>Total Policies: ${report.summary.totalPolicies}</li>
        </ul>
    </div>

    ${report.recommendations.length > 0 ? `
    <h2>Recommendations</h2>
    ${report.recommendations.map(category => `
        <div class="recommendation">
            <h3>${category.category.toUpperCase()} (${category.priority} priority)</h3>
            <ul>
                ${category.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `).join('')}
    ` : ''}
</body>
</html>`;
  }
}