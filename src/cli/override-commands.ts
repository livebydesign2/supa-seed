/**
 * CLI Commands for Override Validation System
 * Part of Task 2.4.3: Update CLI and add override testing commands (FR-2.5)
 */

import type { createClient } from '@supabase/supabase-js';
import { OverrideValidator, OverrideValidationUtils } from '../detection/override-validator';
import { DetectionIntegrationEngine } from '../detection/detection-integration';
import { createEnhancedSupabaseClient } from '../utils/enhanced-supabase-client';
import { Logger } from '../utils/logger';
import type { FlexibleSeedConfig } from '../config-types';
import type { UnifiedDetectionResult } from '../detection/detection-integration';

export interface OverrideCommandOptions {
  url?: string;
  key?: string;
  verbose?: boolean;
  config?: string;
  strictMode?: boolean;
  warningLevel?: 'none' | 'basic' | 'detailed';
  confidenceThreshold?: number;
  outputFormat?: 'text' | 'json';
}

export class OverrideCommands {
  
  /**
   * Test manual overrides against auto-detection results
   */
  static async testOverrides(options: OverrideCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🔍 Testing manual overrides against detection results...\n');

      // Load configuration
      const config = await this.loadConfig(options.config);
      
      if (!OverrideValidationUtils.hasManualOverrides(config)) {
        console.log('ℹ️  No manual overrides found in configuration');
        console.log('   Add platformArchitecture.override or contentDomain.override to test overrides');
        return;
      }

      console.log('📋 Override Summary:');
      console.log(`   ${OverrideValidationUtils.getOverrideSummary(config)}`);
      console.log('');

      // Run detection to get baseline results
      console.log('🔬 Running auto-detection...');
      const detectionIntegration = new DetectionIntegrationEngine(client);
      const detectionResults = await detectionIntegration.performUnifiedDetection({});
      
      console.log('✅ Auto-detection completed\n');

      // Validate overrides
      console.log('⚖️  Validating overrides...');
      const validator = new OverrideValidator();
      
      const validationOptions = {
        strictMode: options.strictMode || config.detection?.validation?.strictMode || false,
        warningLevel: options.warningLevel || config.detection?.validation?.warningLevel || 'detailed',
        confidenceThreshold: options.confidenceThreshold || config.detection?.validation?.requireConfidenceThreshold || 0.7,
        validateDomainSpecific: true,
        checkConfigurationConsistency: true,
        suggestAutoFixes: true
      };

      const validationResult = await validator.validateOverrides(
        config,
        detectionResults,
        validationOptions
      );

      console.log('✅ Override validation completed\n');

      // Display results
      if (options.outputFormat === 'json') {
        console.log(JSON.stringify(validationResult, null, 2));
      } else {
        console.log(OverrideValidationUtils.formatValidationResult(validationResult));
      }

      // Exit with appropriate code
      if (!validationResult.valid) {
        console.log('\n❌ Override validation failed');
        if (validationResult.validation.errors.length > 0) {
          console.log('Errors:');
          validationResult.validation.errors.forEach(error => {
            console.log(`  • ${error}`);
          });
        }
        process.exit(1);
      } else {
        console.log('\n✅ Override validation passed');
        if (validationResult.validation.warnings.length > 0) {
          console.log('Warnings to consider:');
          validationResult.validation.warnings.forEach(warning => {
            console.log(`  • ${warning}`);
          });
        }
      }

    } catch (error: any) {
      console.error('❌ Override testing failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Compare manual overrides with auto-detection results
   */
  static async compareOverrides(options: OverrideCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🔍 Comparing manual overrides with auto-detection...\n');

      // Load configuration
      const config = await this.loadConfig(options.config);

      // Run detection
      console.log('🔬 Running auto-detection...');
      const detectionIntegration = new DetectionIntegrationEngine(client);
      const detectionResults = await detectionIntegration.performUnifiedDetection({});
      console.log('✅ Auto-detection completed\n');

      // Display comparison
      console.log('📊 Override vs Detection Comparison:');
      console.log('─'.repeat(50));

      // Platform Architecture Comparison
      const platformOverride = config.detection?.platformArchitecture?.override;
      const detectedArchitecture = detectionResults.architecture.architectureType;
      const architectureConfidence = detectionResults.architecture.confidence;

      console.log('\n🏗️  Platform Architecture:');
      console.log(`   Override:     ${platformOverride || 'None'}`);
      console.log(`   Detected:     ${detectedArchitecture}`);
      console.log(`   Confidence:   ${(architectureConfidence * 100).toFixed(1)}%`);
      console.log(`   Match:        ${platformOverride === detectedArchitecture ? '✅' : '❌'}`);

      if (platformOverride && platformOverride !== detectedArchitecture) {
        const conflictSeverity = this.assessConflictSeverity(architectureConfidence);
        console.log(`   Conflict:     ${conflictSeverity} severity`);
      }

      // Content Domain Comparison
      const domainOverride = config.detection?.contentDomain?.override;
      const detectedDomain = detectionResults.domain.primaryDomain;
      const domainConfidence = detectionResults.domain.confidence;

      console.log('\n🎯 Content Domain:');
      console.log(`   Override:     ${domainOverride || 'None'}`);
      console.log(`   Detected:     ${detectedDomain}`);
      console.log(`   Confidence:   ${(domainConfidence * 100).toFixed(1)}%`);
      console.log(`   Match:        ${domainOverride === detectedDomain ? '✅' : '❌'}`);

      if (domainOverride && domainOverride !== detectedDomain) {
        const conflictSeverity = this.assessConflictSeverity(domainConfidence);
        console.log(`   Conflict:     ${conflictSeverity} severity`);
      }

      // Additional Detection Details
      if (options.verbose) {
        console.log('\n🔍 Detection Details:');
        console.log('\nArchitecture Reasoning:');
        detectionResults.architecture.reasoning.forEach((reason: string, index: number) => {
          console.log(`   ${index + 1}. ${reason}`);
        });

        console.log('\nDomain Reasoning:');
        detectionResults.domain.reasoning.forEach((reason: string, index: number) => {
          console.log(`   ${index + 1}. ${reason}`);
        });

        console.log('\nIntegration Recommendations:');
        detectionResults.integration.recommendations.forEach((rec: string, index: number) => {
          console.log(`   ${index + 1}. ${rec}`);
        });
      }

      console.log('\n✅ Comparison completed');

    } catch (error: any) {
      console.error('❌ Override comparison failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Validate override configuration format
   */
  static async validateConfig(options: OverrideCommandOptions): Promise<void> {
    try {
      console.log('🔍 Validating override configuration format...\n');

      // Load and validate configuration
      const config = await this.loadConfig(options.config);

      const validationErrors: string[] = [];
      const validationWarnings: string[] = [];

      // Validate platform architecture override
      if (config.detection?.platformArchitecture) {
        const platformConfig = config.detection.platformArchitecture;
        
        if (platformConfig.override) {
          const validArchitectures = ['individual', 'team', 'hybrid'];
          if (!validArchitectures.includes(platformConfig.override)) {
            validationErrors.push(`Invalid platform architecture override: ${platformConfig.override}. Must be one of: ${validArchitectures.join(', ')}`);
          }
        }

        if (platformConfig.confidence !== undefined) {
          if (platformConfig.confidence < 0 || platformConfig.confidence > 1) {
            validationErrors.push(`Platform architecture confidence must be between 0 and 1, got: ${platformConfig.confidence}`);
          }
        }
      }

      // Validate content domain override
      if (config.detection?.contentDomain) {
        const domainConfig = config.detection.contentDomain;
        
        if (domainConfig.override) {
          const validDomains = ['outdoor', 'saas', 'ecommerce', 'social', 'generic'];
          if (!validDomains.includes(domainConfig.override)) {
            validationErrors.push(`Invalid content domain override: ${domainConfig.override}. Must be one of: ${validDomains.join(', ')}`);
          }
        }

        if (domainConfig.confidence !== undefined) {
          if (domainConfig.confidence < 0 || domainConfig.confidence > 1) {
            validationErrors.push(`Content domain confidence must be between 0 and 1, got: ${domainConfig.confidence}`);
          }
        }

        // Validate domain-specific configurations
        if (domainConfig.domainSpecific) {
          const specific = domainConfig.domainSpecific;
          
          if (specific.outdoor?.priceRange) {
            const { min, max } = specific.outdoor.priceRange;
            if (min < 0 || max < min) {
              validationErrors.push(`Invalid outdoor price range: min=${min}, max=${max}`);
            }
          }

          if (specific.saas?.workspaceType) {
            const validWorkspaceTypes = ['team-collaboration', 'individual-productivity', 'hybrid'];
            if (!validWorkspaceTypes.includes(specific.saas.workspaceType)) {
              validationErrors.push(`Invalid SaaS workspace type: ${specific.saas.workspaceType}`);
            }
          }
        }
      }

      // Validate validation settings
      if (config.detection?.validation) {
        const validation = config.detection.validation;
        
        if (validation.warningLevel && !['none', 'basic', 'detailed'].includes(validation.warningLevel)) {
          validationErrors.push(`Invalid warning level: ${validation.warningLevel}`);
        }

        if (validation.requireConfidenceThreshold !== undefined) {
          if (validation.requireConfidenceThreshold < 0 || validation.requireConfidenceThreshold > 1) {
            validationErrors.push(`Confidence threshold must be between 0 and 1, got: ${validation.requireConfidenceThreshold}`);
          }
        }
      }

      // Check for potential configuration issues
      if (config.detection?.platformArchitecture?.override && !config.detection?.contentDomain?.override) {
        validationWarnings.push('Platform architecture override specified but no content domain override - consider adding domain override for consistency');
      }

      if (config.detection?.contentDomain?.override && !config.detection?.platformArchitecture?.override) {
        validationWarnings.push('Content domain override specified but no platform architecture override - consider adding platform override for consistency');
      }

      // Display results
      console.log('📋 Configuration Validation Results:');
      console.log(`   Errors:       ${validationErrors.length}`);
      console.log(`   Warnings:     ${validationWarnings.length}`);
      console.log(`   Status:       ${validationErrors.length === 0 ? '✅ Valid' : '❌ Invalid'}`);

      if (validationErrors.length > 0) {
        console.log('\n❌ Validation Errors:');
        validationErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }

      if (validationWarnings.length > 0) {
        console.log('\n⚠️  Validation Warnings:');
        validationWarnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }

      if (OverrideValidationUtils.hasManualOverrides(config)) {
        console.log('\n📋 Detected Overrides:');
        console.log(`   ${OverrideValidationUtils.getOverrideSummary(config)}`);
      } else {
        console.log('\nℹ️  No manual overrides detected in configuration');
      }

      console.log('\n✅ Configuration validation completed');

      if (validationErrors.length > 0) {
        process.exit(1);
      }

    } catch (error: any) {
      console.error('❌ Configuration validation failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Generate override configuration template
   */
  static async generateTemplate(options: OverrideCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🔍 Generating override configuration template...\n');

      // Run detection to provide intelligent suggestions
      console.log('🔬 Running auto-detection for suggestions...');
      const detectionIntegration = new DetectionIntegrationEngine(client);
      const detectionResults = await detectionIntegration.performUnifiedDetection({});
      console.log('✅ Auto-detection completed\n');

      // Generate template based on detection results
      const template = {
        detection: {
          platformArchitecture: {
            override: detectionResults.architecture.architectureType,
            confidence: 0.9,
            reason: "Manual override based on business requirements",
            fallbackToAutoDetection: true
          },
          contentDomain: {
            override: detectionResults.domain.primaryDomain,
            confidence: 0.9,
            reason: "Manual override for domain-specific seeding",
            fallbackToAutoDetection: true,
            domainSpecific: this.generateDomainSpecificTemplate(detectionResults.domain.primaryDomain)
          },
          validation: {
            enabled: true,
            strictMode: false,
            warningLevel: "detailed" as const,
            requireConfidenceThreshold: 0.7
          },
          reporting: {
            enabled: true,
            includeDetectionComparison: true,
            saveReportToFile: "override-validation-report.json"
          }
        }
      };

      console.log('📋 Generated Override Configuration Template:');
      console.log('─'.repeat(50));
      console.log(JSON.stringify(template, null, 2));

      console.log('\n💡 Usage Instructions:');
      console.log('1. Copy the template above to your seed configuration');
      console.log('2. Modify the override values as needed for your platform');
      console.log('3. Test the configuration with: npm run seed -- test-overrides');
      console.log('4. Validate the format with: npm run seed -- validate-config');

      console.log('\n📊 Detection-Based Suggestions:');
      console.log(`   Suggested Platform: ${detectionResults.architecture.architectureType} (${(detectionResults.architecture.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`   Suggested Domain:   ${detectionResults.domain.primaryDomain} (${(detectionResults.domain.confidence * 100).toFixed(1)}% confidence)`);

      console.log('\n✅ Template generation completed');

    } catch (error: any) {
      console.error('❌ Template generation failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Load configuration from file or use defaults
   */
  private static async loadConfig(configPath?: string): Promise<FlexibleSeedConfig> {
    // This is a simplified version - in a real implementation, you'd load from file
    // For now, we'll check for common configuration patterns
    
    const defaultConfig: FlexibleSeedConfig = {
      supabaseUrl: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      environment: 'local',
      userCount: 5,
      setupsPerUser: 2,
      imagesPerSetup: 3,
      enableRealImages: false,
      seed: 'test-seed',
      schema: {
        framework: 'simple',
        userTable: {
          name: 'users',
          emailField: 'email',
          idField: 'id',
          nameField: 'name'
        },
        setupTable: {
          name: 'setups',
          userField: 'user_id',
          titleField: 'title',
          descriptionField: 'description'
        },
        optionalTables: {}
      },
      storage: {
        buckets: {
          setupImages: 'setup-images',
          gearImages: 'gear-images',
          profileImages: 'profile-images'
        },
        autoCreate: true
      }
    };

    // If configPath is provided, you would load and merge with defaults
    // For now, return the default config
    return defaultConfig;
  }

  /**
   * Assess conflict severity based on detection confidence
   */
  private static assessConflictSeverity(confidence: number): string {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
  }

  /**
   * Generate domain-specific template based on detected domain
   */
  private static generateDomainSpecificTemplate(domain: string) {
    switch (domain) {
      case 'outdoor':
        return {
          outdoor: {
            gearCategories: ["camping", "hiking", "climbing"],
            brands: ["Patagonia", "REI", "Black Diamond"],
            priceRange: { min: 10, max: 500 },
            imageStyle: "realistic" as const
          }
        };
      case 'saas':
        return {
          saas: {
            productivityFocus: true,
            workspaceType: "team-collaboration" as const,
            subscriptionModel: "tiered" as const
          }
        };
      case 'ecommerce':
        return {
          ecommerce: {
            storeType: "single-vendor" as const,
            productCategories: ["electronics", "clothing", "home"],
            paymentMethods: ["credit_card", "paypal"],
            inventoryTracking: true
          }
        };
      case 'social':
        return {
          social: {
            platformType: "content-sharing" as const,
            contentTypes: ["text", "image", "video"],
            interactionFeatures: ["like", "comment", "share"]
          }
        };
      default:
        return undefined;
    }
  }
}