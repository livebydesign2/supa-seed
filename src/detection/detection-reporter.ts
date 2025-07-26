/**
 * Detection Reporting System for Epic 2: Smart Platform Detection Engine
 * Provides CLI-friendly reporting of detection results and auto-configuration
 * Part of Task 2.3.3: Create detection reporting and CLI integration
 */

import { Logger } from '../utils/logger';
// Import UnifiedDetectionResult from detection-integration since it's defined there
import type { UnifiedDetectionResult } from './detection-integration';
import type { AutoConfigurationResult } from './auto-configurator';
import type { FlexibleSeedConfig } from '../config-types';

/**
 * Detection report options
 */
export interface DetectionReportOptions {
  /** Show detailed detection information */
  showDetails: boolean;
  
  /** Show configuration recommendations */
  showRecommendations: boolean;
  
  /** Show warnings and issues */
  showWarnings: boolean;
  
  /** Show confidence scores */
  showConfidenceScores: boolean;
  
  /** Show generated configuration */
  showConfiguration: boolean;
  
  /** Output format */
  format: 'cli' | 'json' | 'summary';
  
  /** Use colors in CLI output */
  useColors: boolean;
}

/**
 * Detection summary for quick overview
 */
export interface DetectionSummary {
  architecture: {
    type: string;
    confidence: number;
    features: string[];
  };
  domain: {
    primary: string;
    confidence: number;
    features: string[];
  };
  integration: {
    overallConfidence: number;
    detectionAgreement: number;
    recommendations: string[];
  };
  configuration: {
    strategy: string;
    confidence: number;
    keySettings: Record<string, any>;
  };
}

/**
 * Main Detection Reporter class
 */
export class DetectionReporter {
  
  /**
   * Generate a comprehensive detection report
   */
  static generateReport(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined = undefined,
    options: Partial<DetectionReportOptions> = {}
  ): string {
    const fullOptions = this.mergeWithDefaults(options);
    
    switch (fullOptions.format) {
      case 'json':
        return this.generateJSONReport(detectionResults, autoConfiguration);
      case 'summary':
        return this.generateSummaryReport(detectionResults, autoConfiguration, fullOptions);
      case 'cli':
      default:
        return this.generateCLIReport(detectionResults, autoConfiguration, fullOptions);
    }
  }
  
  /**
   * Generate CLI-friendly report
   */
  private static generateCLIReport(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined,
    options: DetectionReportOptions
  ): string {
    const lines: string[] = [];
    
    // Header
    lines.push('');
    lines.push('🔍 Platform Detection Results');
    lines.push('═'.repeat(50));
    lines.push('');
    
    // Platform Architecture Section
    lines.push('🏗️  Platform Architecture');
    lines.push(`   Type: ${detectionResults.architecture.architectureType}`);
    lines.push(`   Confidence: ${this.formatConfidence(detectionResults.architecture.confidence, options.useColors)}`);
    
    if (options.showDetails && detectionResults.architecture.detectedFeatures.length > 0) {
      lines.push('   Detected Features:');
      detectionResults.architecture.detectedFeatures.forEach((feature: string) => {
        lines.push(`   • ${feature}`);
      });
    }
    
    lines.push('');
    
    // Content Domain Section
    lines.push('🎯 Content Domain');
    lines.push(`   Primary Domain: ${detectionResults.domain.primaryDomain}`);
    lines.push(`   Confidence: ${this.formatConfidence(detectionResults.domain.confidence, options.useColors)}`);
    
    if (options.showDetails && detectionResults.domain.detectedFeatures.length > 0) {
      lines.push('   Detected Features:');
      detectionResults.domain.detectedFeatures.forEach((feature: string) => {
        lines.push(`   • ${feature}`);
      });
    }
    
    lines.push('');
    
    // Integration Results Section
    lines.push('🔗 Detection Integration');
    lines.push(`   Overall Confidence: ${this.formatConfidence(detectionResults.integration.overallConfidence, options.useColors)}`);
    lines.push(`   Detection Agreement: ${this.formatConfidence(detectionResults.integration.crossValidation.overallAgreement, options.useColors)}`);
    
    if (options.showConfidenceScores) {
      lines.push('   Individual Engine Confidence:');
      Object.entries(detectionResults.integration.crossValidation.engineAgreement).forEach(([engine, confidence]) => {
        lines.push(`   • ${engine}: ${this.formatConfidence(confidence as number, options.useColors)}`);
      });
    }
    
    lines.push('');
    
    // Auto-Configuration Section
    if (autoConfiguration && options.showConfiguration) {
      lines.push('⚙️  Auto-Configuration');
      lines.push(`   Strategy Used: ${autoConfiguration.generationMetrics.strategyUsed}`);
      lines.push(`   Configuration Confidence: ${this.formatConfidence(autoConfiguration.confidence, options.useColors)}`);
      lines.push(`   Templates Applied: ${autoConfiguration.generationMetrics.templatesApplied}`);
      lines.push(`   Generation Time: ${autoConfiguration.generationMetrics.executionTime}ms`);
      
      lines.push('');
      lines.push('   Generated Configuration:');
      if (autoConfiguration.configuration.userCount) {
        lines.push(`   • User Count: ${autoConfiguration.configuration.userCount}`);
      }
      if (autoConfiguration.configuration.setupsPerUser) {
        lines.push(`   • Setups per User: ${autoConfiguration.configuration.setupsPerUser}`);
      }
      if (autoConfiguration.configuration.imagesPerSetup) {
        lines.push(`   • Images per Setup: ${autoConfiguration.configuration.imagesPerSetup}`);
      }
      if (autoConfiguration.configuration.domain) {
        lines.push(`   • Domain: ${autoConfiguration.configuration.domain}`);
      }
      if (autoConfiguration.configuration.createTeamAccounts !== undefined) {
        lines.push(`   • Team Accounts: ${autoConfiguration.configuration.createTeamAccounts}`);
      }
      if (autoConfiguration.configuration.enableRealImages !== undefined) {
        lines.push(`   • Real Images: ${autoConfiguration.configuration.enableRealImages}`);
      }
      
      lines.push('');
    }
    
    // Recommendations Section
    if (options.showRecommendations) {
      const allRecommendations = [
        ...detectionResults.architecture.recommendations,
        ...detectionResults.domain.recommendations,
        ...detectionResults.integration.recommendations
      ];
      
      if (autoConfiguration) {
        allRecommendations.push(...autoConfiguration.reasoning);
      }
      
      if (allRecommendations.length > 0) {
        lines.push('💡 Recommendations');
        allRecommendations.forEach(rec => {
          lines.push(`   • ${rec}`);
        });
        lines.push('');
      }
    }
    
    // Warnings Section
    if (options.showWarnings) {
      const allWarnings = [
        ...detectionResults.architecture.warnings,
        ...detectionResults.domain.warnings,
        ...detectionResults.integration.warnings
      ];
      
      if (autoConfiguration) {
        allWarnings.push(...autoConfiguration.warnings);
      }
      
      if (allWarnings.length > 0) {
        lines.push('⚠️  Warnings');
        allWarnings.forEach(warning => {
          lines.push(`   • ${warning}`);
        });
        lines.push('');
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Generate JSON report for programmatic use
   */
  private static generateJSONReport(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined
  ): string {
    const report = {
      timestamp: new Date().toISOString(),
      detection: detectionResults,
      autoConfiguration: autoConfiguration || null
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * Generate summary report for quick overview
   */
  private static generateSummaryReport(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined,
    options: DetectionReportOptions
  ): string {
    const lines: string[] = [];
    
    lines.push('🔍 Detection Summary');
    lines.push(`Platform: ${detectionResults.architecture.architectureType}/${detectionResults.domain.primaryDomain}`);
    lines.push(`Confidence: ${this.formatConfidence(detectionResults.integration.overallConfidence, options.useColors)}`);
    
    if (autoConfiguration) {
      lines.push(`Auto-Config: ${autoConfiguration.generationMetrics.strategyUsed} (${this.formatConfidence(autoConfiguration.confidence, options.useColors)})`);
    }
    
    return lines.join(' | ');
  }
  
  /**
   * Generate detection summary object
   */
  static generateSummary(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined = undefined
  ): DetectionSummary {
    return {
      architecture: {
        type: detectionResults.architecture.architectureType,
        confidence: detectionResults.architecture.confidence,
        features: detectionResults.architecture.detectedFeatures
      },
      domain: {
        primary: detectionResults.domain.primaryDomain,
        confidence: detectionResults.domain.confidence,
        features: detectionResults.domain.detectedFeatures
      },
      integration: {
        overallConfidence: detectionResults.integration.overallConfidence,
        detectionAgreement: detectionResults.integration.crossValidation.overallAgreement,
        recommendations: detectionResults.integration.recommendations
      },
      configuration: autoConfiguration ? {
        strategy: autoConfiguration.generationMetrics.strategyUsed,
        confidence: autoConfiguration.confidence,
        keySettings: {
          userCount: autoConfiguration.configuration.userCount,
          setupsPerUser: autoConfiguration.configuration.setupsPerUser,
          domain: autoConfiguration.configuration.domain,
          createTeamAccounts: autoConfiguration.configuration.createTeamAccounts
        }
      } : {
        strategy: 'none',
        confidence: 0,
        keySettings: {}
      }
    };
  }
  
  /**
   * Print detection results to console with formatting
   */
  static printDetectionResults(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined = undefined,
    options: Partial<DetectionReportOptions> = {}
  ): void {
    const report = this.generateReport(detectionResults, autoConfiguration, {
      ...options,
      format: 'cli',
      useColors: true
    });
    
    console.log(report);
  }
  
  /**
   * Print quick summary to console
   */
  static printSummary(
    detectionResults: UnifiedDetectionResult,
    autoConfiguration: AutoConfigurationResult | undefined = undefined
  ): void {
    const summary = this.generateSummaryReport(detectionResults, autoConfiguration, {
      format: 'summary',
      useColors: true,
      showDetails: false,
      showRecommendations: false,
      showWarnings: false,
      showConfidenceScores: false,
      showConfiguration: false
    });
    
    Logger.info(summary);
  }
  
  /**
   * Format confidence score with colors
   */
  private static formatConfidence(confidence: number, useColors: boolean): string {
    const percentage = (confidence * 100).toFixed(1) + '%';
    
    if (!useColors) {
      return percentage;
    }
    
    // Color coding based on confidence level
    if (confidence >= 0.9) {
      return `\x1b[32m${percentage}\x1b[0m`; // Green
    } else if (confidence >= 0.7) {
      return `\x1b[33m${percentage}\x1b[0m`; // Yellow
    } else if (confidence >= 0.5) {
      return `\x1b[35m${percentage}\x1b[0m`; // Magenta
    } else {
      return `\x1b[31m${percentage}\x1b[0m`; // Red
    }
  }
  
  /**
   * Merge options with defaults
   */
  private static mergeWithDefaults(options: Partial<DetectionReportOptions>): DetectionReportOptions {
    return {
      showDetails: true,
      showRecommendations: true,
      showWarnings: true,
      showConfidenceScores: true,
      showConfiguration: true,
      format: 'cli',
      useColors: true,
      ...options
    };
  }
}

/**
 * CLI Command Integration for detection reporting
 */
export class DetectionCLI {
  
  /**
   * Handle CLI command for detection analysis
   */
  static async handleDetectionCommand(args: string[]): Promise<void> {
    try {
      // Parse command line arguments
      const options = this.parseDetectionArgs(args);
      
      Logger.info('🔍 Starting platform detection analysis...');
      
      // Import and initialize detection system
      const { DetectionIntegrationEngine } = await import('./detection-integration');
      const { AutoConfigurator } = await import('./auto-configurator');
      
      // Note: In real implementation, we would get client from configuration
      // For now, we'll show the command structure
      Logger.info('Detection analysis would be performed here with configured Supabase client');
      Logger.info(`Options: ${JSON.stringify(options, null, 2)}`);
      
    } catch (error: any) {
      Logger.error('Detection command failed:', error);
      process.exit(1);
    }
  }
  
  /**
   * Parse detection command arguments
   */
  private static parseDetectionArgs(args: string[]): {
    format: 'cli' | 'json' | 'summary';
    showDetails: boolean;
    showConfiguration: boolean;
    configurationStrategy: string;
  } {
    const options = {
      format: 'cli' as const,
      showDetails: true,
      showConfiguration: true,
      configurationStrategy: 'comprehensive'
    };
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--format':
        case '-f':
          if (i + 1 < args.length) {
            const format = args[i + 1];
            if (['cli', 'json', 'summary'].includes(format)) {
              options.format = format as 'cli' | 'json' | 'summary';
            }
            i++;
          }
          break;
          
        case '--no-details':
          options.showDetails = false;
          break;
          
        case '--no-config':
          options.showConfiguration = false;
          break;
          
        case '--strategy':
        case '-s':
          if (i + 1 < args.length) {
            options.configurationStrategy = args[i + 1];
            i++;
          }
          break;
      }
    }
    
    return options;
  }
  
  /**
   * Print CLI help for detection commands
   */
  static printHelp(): void {
    console.log(`
🔍 Platform Detection Commands

  supa-seed detect                 Run platform detection analysis
  
Options:
  --format, -f <format>           Output format: cli, json, summary (default: cli)
  --no-details                    Hide detailed detection information
  --no-config                     Hide auto-configuration results
  --strategy, -s <strategy>       Auto-configuration strategy: comprehensive, minimal, conservative, optimized

Examples:
  supa-seed detect                           # Full CLI report
  supa-seed detect --format json            # JSON output for scripts
  supa-seed detect --format summary         # Quick summary
  supa-seed detect --strategy minimal       # Minimal auto-configuration
  supa-seed detect --no-details --no-config # Basic results only
`);
  }
}

/**
 * Default detection report options
 */
export const DEFAULT_DETECTION_REPORT_OPTIONS: DetectionReportOptions = {
  showDetails: true,
  showRecommendations: true,
  showWarnings: true,
  showConfidenceScores: true,
  showConfiguration: true,
  format: 'cli',
  useColors: true
};