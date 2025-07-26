/**
 * RLS Security CLI Commands for Epic 1: Universal MakerKit Core System
 * Command-line interface for comprehensive RLS compliance validation and management
 * Part of Task 1.4.6: Create RLS security commands for CLI
 */

import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import { RLSComplianceEngine } from '../security/rls-compliance-engine';
import { RLSComplianceValidator } from '../security/rls-compliance-validator';
import { MakerKitStrategy } from '../framework/strategies/makerkit-strategy';
import { Logger } from '../utils/logger';
import type { 
  ComplianceEngineConfig, 
  ComplianceEngineResult 
} from '../security/rls-compliance-engine';
import type { 
  DetailedComplianceReport 
} from '../security/rls-compliance-validator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI options for RLS security commands
 */
interface RLSValidationOptions {
  config?: string;
  strict?: boolean;
  autoFix?: boolean;
  dryRun?: boolean;
  output?: string;
  format?: 'json' | 'markdown' | 'html';
  framework?: string;
  tables?: string;
  verbose?: boolean;
  quick?: boolean;
  severity?: 'all' | 'critical' | 'high' | 'medium';
}

interface RLSReportOptions {
  output?: string;
  format?: 'json' | 'markdown' | 'html';
  includeRecommendations?: boolean;
  framework?: string;
  detailed?: boolean;
}

interface RLSFixOptions {
  dryRun?: boolean;
  enableRlsOnly?: boolean;
  skipCritical?: boolean;
  backup?: boolean;
  confirmAll?: boolean;
}

/**
 * Create RLS security commands for CLI
 */
export function createSecurityCommands(): Command {
  const securityCmd = new Command('security')
    .description('RLS security validation and compliance management')
    .alias('rls');

  // Main validation command
  securityCmd
    .command('validate')
    .description('Comprehensive RLS compliance validation')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--strict', 'Enable strict validation mode', false)
    .option('--auto-fix', 'Enable automatic fixes for issues', false)
    .option('--dry-run', 'Show what would be fixed without applying changes', false)
    .option('-o, --output <path>', 'Output file path for results')
    .option('-f, --format <format>', 'Output format (json|markdown|html)', 'json')
    .option('--framework <name>', 'Target framework (makerkit|generic)', 'auto')
    .option('--tables <list>', 'Comma-separated list of tables to validate')
    .option('-v, --verbose', 'Enable verbose output', false)
    .option('--severity <level>', 'Filter by severity (all|critical|high|medium)', 'all')
    .action(async (options: RLSValidationOptions) => {
      try {
        await runRLSValidation(options);
      } catch (error: any) {
        Logger.error('RLS validation failed:', error);
        process.exit(1);
      }
    });

  // Quick check command
  securityCmd
    .command('check')
    .description('Quick RLS compliance check')
    .argument('[table]', 'Table name to check (optional)')
    .option('-c, --config <path>', 'Configuration file path')
    .option('--framework <name>', 'Target framework (makerkit|generic)', 'auto')
    .option('-v, --verbose', 'Enable verbose output', false)
    .action(async (table: string | undefined, options: RLSValidationOptions) => {
      try {
        await runQuickRLSCheck(table, options);
      } catch (error: any) {
        Logger.error('Quick RLS check failed:', error);
        process.exit(1);
      }
    });

  // Report generation command
  securityCmd
    .command('report')
    .description('Generate comprehensive RLS compliance report')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Report format (json|markdown|html)', 'markdown')
    .option('--include-recommendations', 'Include detailed recommendations', true)
    .option('--framework <name>', 'Target framework (makerkit|generic)', 'auto')
    .option('--detailed', 'Generate detailed analysis report', false)
    .action(async (options: RLSReportOptions) => {
      try {
        await generateRLSReport(options);
      } catch (error: any) {
        Logger.error('Report generation failed:', error);
        process.exit(1);
      }
    });

  // Auto-fix command
  securityCmd
    .command('fix')
    .description('Automatically fix common RLS issues')
    .option('--dry-run', 'Show what would be fixed without applying changes', false)
    .option('--enable-rls-only', 'Only enable RLS, don\'t create policies', false)
    .option('--skip-critical', 'Skip critical fixes that require manual review', false)
    .option('--backup', 'Create backup before applying fixes', true)
    .option('--confirm-all', 'Skip individual confirmations', false)
    .action(async (options: RLSFixOptions) => {
      try {
        await runRLSAutoFix(options);
      } catch (error: any) {
        Logger.error('Auto-fix failed:', error);
        process.exit(1);
      }
    });

  // Policy analysis command
  securityCmd
    .command('analyze-policies')
    .description('Analyze RLS policies for complexity and security')
    .option('-t, --table <name>', 'Analyze policies for specific table')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', 'Output format (json|markdown)', 'json')
    .option('--include-suggestions', 'Include optimization suggestions', true)
    .action(async (options: any) => {
      try {
        await analyzePolicies(options);
      } catch (error: any) {
        Logger.error('Policy analysis failed:', error);
        process.exit(1);
      }
    });

  // Conflict detection command
  securityCmd
    .command('detect-conflicts')
    .description('Detect conflicts between RLS policies')
    .option('-o, --output <path>', 'Output file path')
    .option('--resolve', 'Show resolution suggestions', true)
    .action(async (options: any) => {
      try {
        await detectPolicyConflicts(options);
      } catch (error: any) {
        Logger.error('Conflict detection failed:', error);
        process.exit(1);
      }
    });

  // Interactive setup command
  securityCmd
    .command('setup')
    .description('Interactive RLS security setup wizard')
    .option('--framework <name>', 'Target framework (makerkit|generic)', 'auto')
    .action(async (options: any) => {
      try {
        await runInteractiveSetup(options);
      } catch (error: any) {
        Logger.error('Interactive setup failed:', error);
        process.exit(1);
      }
    });

  return securityCmd;
}

/**
 * Implementation of CLI command handlers
 */

/**
 * Run comprehensive RLS validation
 */
async function runRLSValidation(options: RLSValidationOptions): Promise<void> {
  Logger.info('🔒 Starting RLS compliance validation');

  const { client, config } = await initializeClientAndConfig(options.config);
  const engine = new RLSComplianceEngine(client);

  const engineConfig: Partial<ComplianceEngineConfig> = {
    strictMode: options.strict || false,
    autoFixEnabled: options.autoFix && !options.dryRun,
    enableAdvancedParsing: true,
    enableConflictDetection: true,
    enablePerformanceAnalysis: true,
    enableSecurityAnalysis: true,
    generateReports: true,
    frameworkSpecific: options.framework !== 'generic',
    reportFormat: options.format || 'json',
    auditLevel: options.verbose ? 'comprehensive' : 'detailed'
  };

  const result = await engine.analyzeAndEnforceCompliance(engineConfig);

  // Filter results by severity if specified
  if (options.severity && options.severity !== 'all') {
    filterResultsBySeverity(result, options.severity);
  }

  // Filter by specific tables if specified
  if (options.tables) {
    const tableList = options.tables.split(',').map(t => t.trim());
    filterResultsByTables(result, tableList);
  }

  // Display results
  displayValidationResults(result, options.verbose);

  // Save results if output specified
  if (options.output) {
    await saveResults(result, options.output, options.format || 'json');
  }

  // Exit with appropriate code
  const exitCode = result.overallCompliance.status === 'compliant' ? 0 : 1;
  Logger.info(`\n🏁 Validation completed with exit code: ${exitCode}`);
  
  if (exitCode !== 0 && !options.verbose) {
    Logger.info('💡 Use --verbose flag for detailed information');
  }
}

/**
 * Run quick RLS compliance check
 */
async function runQuickRLSCheck(table: string | undefined, options: RLSValidationOptions): Promise<void> {
  Logger.info('⚡ Running quick RLS compliance check');

  const { client } = await initializeClientAndConfig(options.config);
  const engine = new RLSComplianceEngine(client);

  if (table) {
    // Check specific table
    const result = await engine.quickComplianceCheck(table);
    
    console.log(`\n📋 Quick Check Results for ${table}:`);
    console.log(`   Compliant: ${result.isCompliant ? '✅ Yes' : '❌ No'}`);
    console.log(`   Requires User Context: ${result.requiresUserContext ? 'Yes' : 'No'}`);
    
    if (result.violatedPolicies.length > 0) {
      console.log('\n⚠️  Policy Violations:');
      result.violatedPolicies.forEach(violation => {
        console.log(`   - ${violation.policyName}: ${violation.reason}`);
      });
    }

    if (result.suggestedFixes.length > 0) {
      console.log('\n💡 Suggested Fixes:');
      result.suggestedFixes.forEach(fix => {
        console.log(`   - ${fix.description}`);
      });
    }
  } else {
    // Quick overview of all tables
    const validator = new RLSComplianceValidator(client);
    const report = await validator.validateCompleteCompliance({ 
      strictMode: false,
      maxConcurrentQueries: 3 
    });

    console.log('\n📊 Quick Compliance Overview:');
    console.log(`   Total Tables: ${report.summary.totalTables}`);
    console.log(`   Tables with RLS: ${report.summary.tablesWithRLS}`);
    console.log(`   Compliance Score: ${report.summary.complianceScore}/100`);
    console.log(`   Overall Grade: ${report.securityAssessment.complianceGrade}`);

    if (report.summary.tablesWithoutRLS.length > 0) {
      console.log('\n❌ Tables without RLS:');
      report.summary.tablesWithoutRLS.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
  }
}

/**
 * Generate comprehensive RLS report
 */
async function generateRLSReport(options: RLSReportOptions): Promise<void> {
  Logger.info('📄 Generating RLS compliance report');

  const { client } = await initializeClientAndConfig();
  const engine = new RLSComplianceEngine(client);

  const result = await engine.analyzeAndEnforceCompliance({
    generateReports: true,
    frameworkSpecific: options.framework !== 'generic',
    auditLevel: options.detailed ? 'comprehensive' : 'detailed'
  });

  const reportContent = await engine.generateFormattedReport(
    result,
    options.format || 'markdown'
  );

  const outputPath = options.output || `rls-compliance-report.${options.format || 'md'}`;
  
  fs.writeFileSync(outputPath, reportContent, 'utf8');
  
  Logger.success(`✅ Report generated: ${path.resolve(outputPath)}`);
  
  // Display summary
  console.log('\n📊 Report Summary:');
  console.log(`   Compliance Grade: ${result.overallCompliance.grade}`);
  console.log(`   Total Issues: ${result.executionMetrics.issuesFound}`);
  console.log(`   Critical Issues: ${result.overallCompliance.criticalIssues}`);
  console.log(`   Recommendations: ${result.recommendations.length}`);
}

/**
 * Run auto-fix for common RLS issues
 */
async function runRLSAutoFix(options: RLSFixOptions): Promise<void> {
  Logger.info('🔧 Running RLS auto-fix');

  if (!options.dryRun && !options.confirmAll) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('⚠️  This will modify your database. Continue? (y/N): ', resolve);
    });
    rl.close();

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      Logger.info('Auto-fix cancelled by user');
      return;
    }
  }

  const { client } = await initializeClientAndConfig();

  // Use MakerKit strategy for framework-specific fixes
  const strategy = new MakerKitStrategy();
  await strategy.initialize(client);

  const result = await strategy.autoFixMakerKitRLSIssues({
    dryRun: options.dryRun,
    enableRLSOnly: options.enableRlsOnly,
    skipCriticalFixes: options.skipCritical
  });

  console.log('\n🔧 Auto-Fix Results:');
  console.log(`   Fixes Applied: ${result.fixesApplied}`);
  console.log(`   Fixes Failed: ${result.fixesFailed}`);
  console.log(`   Fixes Skipped: ${result.fixesSkipped}`);

  if (result.requiresManualReview.length > 0) {
    console.log('\n⚠️  Requires Manual Review:');
    result.requiresManualReview.forEach(item => {
      console.log(`   - ${item}`);
    });
  }

  if (result.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    result.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }

  if (options.dryRun) {
    Logger.info('\n💡 This was a dry run. Use without --dry-run to apply fixes.');
  }
}

/**
 * Analyze RLS policies
 */
async function analyzePolicies(options: any): Promise<void> {
  Logger.info('🔬 Analyzing RLS policies');

  const { client } = await initializeClientAndConfig();
  const engine = new RLSComplianceEngine(client);

  const result = await engine.analyzeAndEnforceCompliance({
    enableAdvancedParsing: true,
    enablePerformanceAnalysis: true,
    enableSecurityAnalysis: true
  });

  const analysis = result.policyAnalysis;

  console.log('\n📊 Policy Analysis Results:');
  console.log(`   Total Policies: ${analysis.totalPolicies}`);
  console.log('\n🔢 Complexity Distribution:');
  console.log(`   Simple: ${analysis.complexityDistribution.simple + analysis.complexityDistribution.trivial}`);
  console.log(`   Moderate: ${analysis.complexityDistribution.moderate}`);
  console.log(`   Complex: ${analysis.complexityDistribution.complex + analysis.complexityDistribution.veryComplex}`);

  console.log('\n🔒 Security Distribution:');
  console.log(`   Strong: ${analysis.securityDistribution.strong + analysis.securityDistribution.veryStrong + analysis.securityDistribution.excellent}`);
  console.log(`   Moderate: ${analysis.securityDistribution.moderate}`);
  console.log(`   Weak: ${analysis.securityDistribution.weak + analysis.securityDistribution.veryWeak}`);

  if (options.table) {
    const tablePolicies = analysis.parsedPolicies.filter(p => p.tableName === options.table);
    if (tablePolicies.length > 0) {
      console.log(`\n📋 Policies for ${options.table}:`);
      tablePolicies.forEach(policy => {
        console.log(`   - ${policy.policyName}: ${policy.parsed.complexity.level} complexity, ${policy.parsed.security.strength} security`);
      });
    }
  }

  if (options.output) {
    const content = options.format === 'markdown' ? 
      generatePolicyAnalysisMarkdown(analysis) : 
      JSON.stringify(analysis, null, 2);
    
    fs.writeFileSync(options.output, content, 'utf8');
    Logger.success(`✅ Analysis saved to: ${options.output}`);
  }
}

/**
 * Detect policy conflicts
 */
async function detectPolicyConflicts(options: any): Promise<void> {
  Logger.info('⚔️ Detecting policy conflicts');

  const { client } = await initializeClientAndConfig();
  const engine = new RLSComplianceEngine(client);

  const result = await engine.analyzeAndEnforceCompliance({
    enableConflictDetection: true
  });

  const conflicts = result.conflictAnalysis;

  console.log('\n⚔️ Conflict Detection Results:');
  console.log(`   Total Conflicts: ${conflicts.conflicts.length}`);
  console.log(`   Policy Overlaps: ${conflicts.overlaps.length}`);
  console.log(`   Coverage Gaps: ${conflicts.gaps.length}`);

  if (conflicts.conflicts.length > 0) {
    console.log('\n❌ Detected Conflicts:');
    conflicts.conflicts.forEach(conflict => {
      console.log(`   - ${conflict.type} conflict between: ${conflict.policies.join(', ')}`);
      console.log(`     Severity: ${conflict.severity}`);
      console.log(`     Description: ${conflict.description}`);
    });
  }

  if (conflicts.gaps.length > 0) {
    console.log('\n🕳️  Coverage Gaps:');
    conflicts.gaps.forEach(gap => {
      console.log(`   - ${gap.scenario}: ${gap.description}`);
    });
  }

  if (options.resolve && conflicts.recommendations.length > 0) {
    console.log('\n💡 Resolution Recommendations:');
    conflicts.recommendations.forEach(rec => {
      console.log(`   - ${rec.strategy}: ${rec.implementation}`);
    });
  }

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(conflicts, null, 2), 'utf8');
    Logger.success(`✅ Conflicts saved to: ${options.output}`);
  }
}

/**
 * Run interactive setup wizard
 */
async function runInteractiveSetup(options: any): Promise<void> {
  Logger.info('🧙 Starting interactive RLS setup wizard');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('\n🔒 RLS Security Setup Wizard');
    console.log('This wizard will help you configure RLS security for your application.\n');

    // Framework detection
    const framework = await new Promise<string>((resolve) => {
      rl.question('What framework are you using? (makerkit/generic) [auto]: ', (answer) => {
        resolve(answer.trim() || 'auto');
      });
    });

    // Validation level
    const validationLevel = await new Promise<string>((resolve) => {
      rl.question('Validation level? (strict/standard/basic) [standard]: ', (answer) => {
        resolve(answer.trim() || 'standard');
      });
    });

    // Auto-fix preference
    const autoFix = await new Promise<boolean>((resolve) => {
      rl.question('Enable automatic fixes? (y/N): ', (answer) => {
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });

    rl.close();

    Logger.info('\n⚙️ Configuration:');
    console.log(`   Framework: ${framework}`);
    console.log(`   Validation Level: ${validationLevel}`);
    console.log(`   Auto-fix: ${autoFix ? 'Enabled' : 'Disabled'}`);

    // Run validation with selected options
    Logger.info('\n🔍 Running initial validation...');

    await runRLSValidation({
      framework: framework === 'auto' ? undefined : framework,
      strict: validationLevel === 'strict',
      autoFix,
      verbose: true,
      format: 'json'
    });

    Logger.success('\n✅ Interactive setup completed!');
    Logger.info('💡 Use "supa-seed security validate --help" for more options');

  } catch (error) {
    rl.close();
    throw error;
  }
}

/**
 * Helper utility functions
 */

/**
 * Initialize Supabase client and load configuration
 */
async function initializeClientAndConfig(configPath?: string): Promise<{
  client: ReturnType<typeof createClient>;
  config?: any;
}> {
  // Load configuration from environment or config file
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
  }

  const client = createClient(supabaseUrl, supabaseServiceKey) as any;

  let config = undefined;
  if (configPath && fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configContent);
  }

  return { client, config };
}

/**
 * Filter results by severity level
 */
function filterResultsBySeverity(result: ComplianceEngineResult, severity: string): void {
  // Filter recommendations by priority
  const priorityMap: Record<string, string[]> = {
    critical: ['immediate'],
    high: ['immediate', 'high'],
    medium: ['immediate', 'high', 'medium']
  };

  const allowedPriorities = priorityMap[severity] || [];
  result.recommendations = result.recommendations.filter(rec => 
    allowedPriorities.includes(rec.priority)
  );
}

/**
 * Filter results by specific tables
 */
function filterResultsByTables(result: ComplianceEngineResult, tables: string[]): void {
  // Filter table analysis
  result.complianceReport.tableAnalysis = result.complianceReport.tableAnalysis.filter(
    analysis => tables.includes(analysis.tableName) || tables.includes(`${analysis.schema}.${analysis.tableName}`)
  );

  // Filter policy analysis
  result.policyAnalysis.parsedPolicies = result.policyAnalysis.parsedPolicies.filter(
    policy => tables.includes(policy.tableName)
  );
}

/**
 * Display validation results in a user-friendly format
 */
function displayValidationResults(result: ComplianceEngineResult, verbose: boolean): void {
  console.log('\n📊 RLS Compliance Results:');
  console.log(`   Overall Grade: ${result.overallCompliance.grade}`);
  console.log(`   Compliance Score: ${result.overallCompliance.score}/100`);
  console.log(`   Status: ${result.overallCompliance.status}`);

  console.log('\n📈 Issue Summary:');
  console.log(`   Critical: ${result.overallCompliance.criticalIssues}`);
  console.log(`   High: ${result.overallCompliance.highIssues}`);
  console.log(`   Medium: ${result.overallCompliance.mediumIssues}`);
  console.log(`   Low: ${result.overallCompliance.lowIssues}`);

  console.log('\n⏱️ Performance Metrics:');
  console.log(`   Tables Analyzed: ${result.executionMetrics.tablesAnalyzed}`);
  console.log(`   Policies Analyzed: ${result.executionMetrics.policiesAnalyzed}`);
  console.log(`   Execution Time: ${result.executionMetrics.totalExecutionTime}ms`);

  if (result.overallCompliance.criticalIssues > 0) {
    console.log('\n🚨 Critical Issues Require Immediate Attention!');
  }

  if (verbose && result.recommendations.length > 0) {
    console.log('\n💡 Top Recommendations:');
    result.recommendations
      .filter(rec => rec.priority === 'immediate' || rec.priority === 'high')
      .slice(0, 5)
      .forEach(rec => {
        console.log(`   - ${rec.title} (${rec.priority})`);
        console.log(`     ${rec.description}`);
      });
  }

  console.log(`\n${result.overallCompliance.summary}`);
}

/**
 * Save results to file
 */
async function saveResults(result: ComplianceEngineResult, outputPath: string, format: string): Promise<void> {
  let content: string;

  switch (format) {
    case 'markdown':
      const engine = new RLSComplianceEngine(result.complianceReport.summary as any); // Simplified for CLI
      content = await engine.generateFormattedReport(result, 'markdown');
      break;
    case 'html':
      const engineHtml = new RLSComplianceEngine(result.complianceReport.summary as any);
      content = await engineHtml.generateFormattedReport(result, 'html');
      break;
    case 'json':
    default:
      content = JSON.stringify(result, null, 2);
      break;
  }

  fs.writeFileSync(outputPath, content, 'utf8');
  Logger.success(`✅ Results saved to: ${path.resolve(outputPath)}`);
}

/**
 * Generate markdown report for policy analysis
 */
function generatePolicyAnalysisMarkdown(analysis: any): string {
  return `# RLS Policy Analysis Report

## Summary
- **Total Policies:** ${analysis.totalPolicies}

## Complexity Distribution
- **Simple:** ${analysis.complexityDistribution.simple + analysis.complexityDistribution.trivial}
- **Moderate:** ${analysis.complexityDistribution.moderate}
- **Complex:** ${analysis.complexityDistribution.complex + analysis.complexityDistribution.veryComplex}

## Security Distribution
- **Strong:** ${analysis.securityDistribution.strong + analysis.securityDistribution.veryStrong + analysis.securityDistribution.excellent}
- **Moderate:** ${analysis.securityDistribution.moderate}
- **Weak:** ${analysis.securityDistribution.weak + analysis.securityDistribution.veryWeak}

## Common Patterns
${analysis.commonPatterns.map((pattern: any) => `- **${pattern.pattern}:** ${pattern.description} (${pattern.frequency} occurrences)`).join('\n')}

## Anti-Patterns
${analysis.antiPatterns.map((antiPattern: any) => `- **${antiPattern.antiPattern}:** ${antiPattern.description} (Risk: ${antiPattern.risk})`).join('\n')}
`;
}

export default createSecurityCommands;