/**
 * CLI Commands for Template Management in SupaSeed v2.5.0
 * Implements Task 5.2.4: CLI interface for template discovery, application, and management
 * Provides comprehensive command-line interface for configuration templates
 */

import { Command } from 'commander';
import { ConfigurationTemplateManager, TemplateSelectionCriteria } from '../config/template-manager';
import { templateInheritanceEngine } from '../config/template-inheritance';
import { ALL_CONFIGURATION_TEMPLATES, getRecommendedTemplates } from '../config/config-templates';
import type { 
  CompleteConfigurationTemplate, 
  PlatformArchitectureType, 
  ContentDomainType 
} from '../config/config-layers';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI output formatting utilities
 */
class TemplateCliFormatter {
  /**
   * Format template list for console output
   */
  static formatTemplateList(templates: CompleteConfigurationTemplate[], detailed: boolean = false): string {
    if (templates.length === 0) {
      return '📭 No templates found matching your criteria';
    }

    const lines: string[] = [
      `📋 Found ${templates.length} template${templates.length === 1 ? '' : 's'}:`,
      ''
    ];

    templates.forEach((template, index) => {
      lines.push(`${index + 1}. 🏗️  ${template.name} (${template.id})`);
      lines.push(`   📝 ${template.description}`);
      lines.push(`   🏷️  ${template.metadata.category} • ${template.metadata.difficulty} • v${template.version}`);
      lines.push(`   🎯 ${template.targets.architectures.join(', ')} • ${template.targets.domains.join(', ')}`);
      lines.push(`   ⭐ ${template.metadata.rating}/5 • ⏱️  ${template.metadata.estimatedSetupTime}`);
      
      if (detailed) {
        lines.push(`   🏗️  Architecture: ${template.targets.architectures.join(', ')}`);
        lines.push(`   🌐 Domain: ${template.targets.domains.join(', ')}`);
        lines.push(`   🔧 Complexity: ${template.targets.complexity}`);
        lines.push(`   📦 Dependencies: ${template.metadata.compatibility.dependencies.join(', ') || 'None'}`);
        lines.push(`   🏷️  Tags: ${template.metadata.tags.join(', ')}`);
      }
      
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Format template details for console output
   */
  static formatTemplateDetails(template: CompleteConfigurationTemplate): string {
    const lines: string[] = [
      `🏗️  Template: ${template.name}`,
      `📋 ID: ${template.id}`,
      `📝 Description: ${template.description}`,
      `📅 Version: ${template.version}`,
      `👤 Author: ${template.metadata.author}`,
      '',
      `📊 Metadata:`,
      `   🏷️  Category: ${template.metadata.category}`,
      `   🎯 Difficulty: ${template.metadata.difficulty}`,
      `   ⭐ Rating: ${template.metadata.rating}/5`,
      `   📈 Usage Count: ${template.metadata.usageCount}`,
      `   ⏱️  Setup Time: ${template.metadata.estimatedSetupTime}`,
      `   📅 Last Updated: ${template.metadata.lastUpdated.toLocaleDateString()}`,
      '',
      `🎯 Targets:`,
      `   🏗️  Architectures: ${template.targets.architectures.join(', ')}`,
      `   🌐 Domains: ${template.targets.domains.join(', ')}`,
      `   🔧 Complexity: ${template.targets.complexity}`,
      '',
      `📦 Compatibility:`,
      `   📋 Minimum Version: ${template.metadata.compatibility.minimumVersion}`,
      `   🔗 Dependencies: ${template.metadata.compatibility.dependencies.join(', ') || 'None'}`,
      `   ❌ Conflicts: ${template.metadata.compatibility.conflicts?.join(', ') || 'None'}`,
      '',
      `🏷️  Tags: ${template.metadata.tags.join(', ')}`,
      '',
      `📚 Documentation:`,
      `   📖 Overview: ${template.documentation.overview}`,
      `   🛠️  Setup Steps: ${template.documentation.setup.length} steps`,
      `   ⚙️  Customization Options: ${template.documentation.customization.length} options`,
      `   🔧 Troubleshooting Tips: ${template.documentation.troubleshooting.length} tips`,
      ''
    ];

    if (template.composition.baseTemplates.length > 0) {
      lines.push(`🔗 Inheritance:`);
      lines.push(`   📋 Base Templates: ${template.composition.baseTemplates.join(', ')}`);
      lines.push(`   🔄 Merge Strategy: ${template.composition.mergeStrategy.objects}`);
      lines.push('');
    }

    if (template.metadata.examples.length > 0) {
      lines.push(`💡 Examples:`);
      template.metadata.examples.forEach((example, index) => {
        lines.push(`   ${index + 1}. ${example.useCase}: ${example.description}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format application result for console output
   */
  static formatApplicationResult(result: any): string {
    const lines: string[] = [
      result.success ? '✅ Template Applied Successfully!' : '❌ Template Application Failed',
      '',
      `🏗️  Template: ${result.appliedTemplate.name}`,
      `⏱️  Duration: ${result.metadata.applicationTime}ms`,
      `🔗 Inheritance Chain: ${result.metadata.inheritanceChain.join(' → ')}`,
      `🔄 Overrides Applied: ${result.metadata.overridesApplied}`,
      `⚡ Conflicts Resolved: ${result.metadata.conflictsResolved}`,
      '',
      `📊 Validation:`,
      `   ${result.metadata.validationResults.valid ? '✅' : '❌'} Valid: ${result.metadata.validationResults.valid}`,
      `   ❌ Errors: ${result.metadata.validationResults.errors.length}`,
      `   ⚠️  Warnings: ${result.metadata.validationResults.warnings.length}`,
      `   💡 Suggestions: ${result.metadata.validationResults.suggestions.length}`,
      ''
    ];

    if (result.metadata.validationResults.errors.length > 0) {
      lines.push('❌ Errors:');
      result.metadata.validationResults.errors.forEach((error: string) => {
        lines.push(`   • ${error}`);
      });
      lines.push('');
    }

    if (result.metadata.validationResults.warnings.length > 0) {
      lines.push('⚠️  Warnings:');
      result.metadata.validationResults.warnings.forEach((warning: string) => {
        lines.push(`   • ${warning}`);
      });
      lines.push('');
    }

    if (result.changes.length > 0) {
      lines.push(`🔄 Configuration Changes (${result.changes.length}):`);
      result.changes.slice(0, 5).forEach((change: any) => {
        lines.push(`   • ${change.path}: ${change.source} → ${JSON.stringify(change.after)}`);
      });
      if (result.changes.length > 5) {
        lines.push(`   ... and ${result.changes.length - 5} more changes`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format recommendation results
   */
  static formatRecommendations(
    templates: CompleteConfigurationTemplate[], 
    architecture?: string, 
    domain?: string
  ): string {
    const lines: string[] = [
      '🎯 Template Recommendations',
      ''
    ];

    if (architecture || domain) {
      lines.push(`📋 Based on: ${architecture ? `Architecture: ${architecture}` : ''}${architecture && domain ? ', ' : ''}${domain ? `Domain: ${domain}` : ''}`);
      lines.push('');
    }

    if (templates.length === 0) {
      lines.push('📭 No recommendations found for your criteria');
      lines.push('💡 Try using broader search criteria or check available templates with `templates list`');
      return lines.join('\n');
    }

    templates.forEach((template, index) => {
      const rank = index + 1;
      const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '📄';
      
      lines.push(`${emoji} ${rank}. ${template.name}`);
      lines.push(`   📝 ${template.description}`);
      lines.push(`   ⭐ ${template.metadata.rating}/5 • ⏱️  ${template.metadata.estimatedSetupTime} • 📈 ${template.metadata.usageCount} uses`);
      lines.push(`   🎯 Perfect for: ${template.targets.architectures.join('/')} ${template.targets.domains.join('/')} platforms`);
      lines.push('');
    });

    lines.push('💡 Use `templates show <template-id>` for more details');
    lines.push('🚀 Use `templates apply <template-id>` to apply a template');

    return lines.join('\n');
  }
}

/**
 * Template CLI command handlers
 */
class TemplateCommandHandlers {
  private templateManager: ConfigurationTemplateManager;

  constructor() {
    this.templateManager = new ConfigurationTemplateManager();
  }

  /**
   * List all available templates
   */
  async listTemplates(options: {
    category?: string;
    difficulty?: string;
    architecture?: string;
    domain?: string;
    tags?: string;
    detailed?: boolean;
  }): Promise<void> {
    try {
      Logger.info('🔍 Searching for templates...');

      const criteria: TemplateSelectionCriteria = {};

      if (options.category) {
        criteria.category = options.category as any;
      }
      if (options.difficulty) {
        criteria.difficulty = options.difficulty as any;
      }
      if (options.architecture) {
        criteria.architecture = options.architecture as PlatformArchitectureType;
      }
      if (options.domain) {
        criteria.domain = options.domain as ContentDomainType;
      }
      if (options.tags) {
        criteria.tags = options.tags.split(',').map(tag => tag.trim());
      }

      const templates = this.templateManager.findTemplates(criteria);
      const output = TemplateCliFormatter.formatTemplateList(templates, options.detailed);
      
      console.log(output);
      Logger.complete(`Found ${templates.length} templates`);

    } catch (error) {
      Logger.error(`Failed to list templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Show detailed information about a specific template
   */
  async showTemplate(templateId: string): Promise<void> {
    try {
      Logger.info(`🔍 Looking up template: ${templateId}`);

      const template = this.templateManager.getTemplate(templateId);
      
      if (!template) {
        Logger.error(`❌ Template not found: ${templateId}`);
        console.log('\n💡 Use `templates list` to see available templates');
        process.exit(1);
      }

      const output = TemplateCliFormatter.formatTemplateDetails(template);
      console.log(output);
      
      Logger.complete(`Template details displayed`);

    } catch (error) {
      Logger.error(`Failed to show template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Apply a template to create configuration
   */
  async applyTemplate(templateId: string, options: {
    output?: string;
    validate?: boolean;
    inheritance?: boolean;
    report?: boolean;
    dryRun?: boolean;
  }): Promise<void> {
    try {
      Logger.info(`🚀 Applying template: ${templateId}`);

      if (options.dryRun) {
        Logger.info('🔍 Dry run mode - no changes will be made');
      }

      const applicationOptions = {
        inheritance: {
          enableInheritance: options.inheritance !== false,
          mergeStrategy: 'deep_merge' as const,
          resolveConflicts: true,
          validateConstraints: true
        },
        validation: {
          validateAfterApplication: options.validate !== false,
          requireCompatibility: true,
          allowWarnings: true,
          strictMode: false
        },
        reporting: {
          includeMetadata: true,
          trackChanges: true,
          generateReport: options.report === true
        }
      };

      const result = await this.templateManager.applyTemplate(templateId, applicationOptions);
      
      const output = TemplateCliFormatter.formatApplicationResult(result);
      console.log(output);

      // Save configuration if not dry run and output specified
      if (!options.dryRun && options.output) {
        const configPath = path.resolve(options.output);
        const configData = JSON.stringify(result.resultingConfig, null, 2);
        
        await fs.promises.writeFile(configPath, configData, 'utf8');
        Logger.complete(`Configuration saved to: ${configPath}`);
      }

      // Save report if requested
      if (options.report && result.report) {
        const reportPath = `template-report-${templateId}-${Date.now()}.md`;
        await fs.promises.writeFile(reportPath, result.report, 'utf8');
        Logger.info(`📋 Report saved to: ${reportPath}`);
      }

      Logger.complete('Template applied successfully');

    } catch (error) {
      Logger.error(`Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Get template recommendations
   */
  async recommendTemplates(options: {
    architecture?: string;
    domain?: string;
    difficulty?: string;
    limit?: number;
  }): Promise<void> {
    try {
      Logger.info('🎯 Finding template recommendations...');

      const architecture = options.architecture as PlatformArchitectureType;
      const domain = options.domain as ContentDomainType;
      const difficulty = options.difficulty;

      let recommendations = getRecommendedTemplates(architecture, domain, difficulty);
      
      if (options.limit) {
        recommendations = recommendations.slice(0, options.limit);
      }

      const output = TemplateCliFormatter.formatRecommendations(recommendations, architecture, domain);
      console.log(output);
      
      Logger.complete(`Generated ${recommendations.length} recommendations`);

    } catch (error) {
      Logger.error(`Failed to get recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Validate a template
   */
  async validateTemplate(templateId: string): Promise<void> {
    try {
      Logger.info(`🔍 Validating template: ${templateId}`);

      const template = this.templateManager.getTemplate(templateId);
      
      if (!template) {
        Logger.error(`❌ Template not found: ${templateId}`);
        process.exit(1);
      }

      // Perform composition with validation
      const composition = await templateInheritanceEngine.composeTemplates([template], {
        validationLevel: 'strict',
        performanceTracking: true
      });

      const validation = composition.inheritanceMetadata.validationResults;
      const diagnostics = composition.diagnostics;

      console.log(`\n🔍 Template Validation Results for: ${template.name}\n`);
      
      console.log(`📊 Overall Status: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
      console.log(`📈 Score: ${validation.score}/100`);
      console.log(`⏱️  Composition Time: ${composition.inheritanceMetadata.compositionTime}ms`);
      console.log(`🔄 Merge Operations: ${diagnostics.totalMerges}`);
      console.log(`⚡ Conflicts: ${diagnostics.conflictsDetected} detected, ${diagnostics.conflictsResolved} resolved`);
      console.log('');

      if (validation.errors.length > 0) {
        console.log('❌ Errors:');
        validation.errors.forEach(error => {
          console.log(`   • ${error.message} (${error.path || 'general'})`);
        });
        console.log('');
      }

      if (validation.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        validation.warnings.forEach(warning => {
          console.log(`   • ${warning}`);
        });
        console.log('');
      }

      if (validation.suggestions.length > 0) {
        console.log('💡 Suggestions:');
        validation.suggestions.forEach(suggestion => {
          console.log(`   • ${suggestion}`);
        });
        console.log('');
      }

      console.log(`📋 Coverage:`);
      console.log(`   🏗️  Templates: ${validation.coverage.templatesValidated}`);
      console.log(`   📚 Layers: ${validation.coverage.layersValidated}`);
      console.log(`   🔧 Constraints: ${validation.coverage.constraintsChecked}`);

      Logger.complete(`Template validation completed`);

    } catch (error) {
      Logger.error(`Failed to validate template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Compare two templates
   */
  async compareTemplates(templateId1: string, templateId2: string): Promise<void> {
    try {
      Logger.info(`🔍 Comparing templates: ${templateId1} vs ${templateId2}`);

      const template1 = this.templateManager.getTemplate(templateId1);
      const template2 = this.templateManager.getTemplate(templateId2);

      if (!template1) {
        Logger.error(`❌ Template not found: ${templateId1}`);
        process.exit(1);
      }

      if (!template2) {
        Logger.error(`❌ Template not found: ${templateId2}`);
        process.exit(1);
      }

      console.log(`\n🔍 Template Comparison\n`);
      console.log(`📋 Template 1: ${template1.name} (${template1.id})`);
      console.log(`📋 Template 2: ${template2.name} (${template2.id})`);
      console.log('');

      // Compare metadata
      console.log(`📊 Metadata Comparison:`);
      console.log(`   🏷️  Category: ${template1.metadata.category} vs ${template2.metadata.category}`);
      console.log(`   🎯 Difficulty: ${template1.metadata.difficulty} vs ${template2.metadata.difficulty}`);
      console.log(`   ⭐ Rating: ${template1.metadata.rating}/5 vs ${template2.metadata.rating}/5`);
      console.log(`   ⏱️  Setup Time: ${template1.metadata.estimatedSetupTime} vs ${template2.metadata.estimatedSetupTime}`);
      console.log('');

      // Compare targets
      console.log(`🎯 Target Comparison:`);
      console.log(`   🏗️  Architecture: ${template1.targets.architectures.join(', ')} vs ${template2.targets.architectures.join(', ')}`);
      console.log(`   🌐 Domain: ${template1.targets.domains.join(', ')} vs ${template2.targets.domains.join(', ')}`);
      console.log(`   🔧 Complexity: ${template1.targets.complexity} vs ${template2.targets.complexity}`);
      console.log('');

      // Compare compatibility
      console.log(`📦 Compatibility Comparison:`);
      console.log(`   📋 Min Version: ${template1.metadata.compatibility.minimumVersion} vs ${template2.metadata.compatibility.minimumVersion}`);
      console.log(`   🔗 Dependencies: ${template1.metadata.compatibility.dependencies.length} vs ${template2.metadata.compatibility.dependencies.length}`);
      console.log('');

      // Similarity analysis
      const sharedArchitectures = template1.targets.architectures.filter(arch => 
        template2.targets.architectures.includes(arch)
      );
      const sharedDomains = template1.targets.domains.filter(domain => 
        template2.targets.domains.includes(domain)
      );
      const sharedTags = template1.metadata.tags.filter(tag => 
        template2.metadata.tags.includes(tag)
      );

      console.log(`🔗 Compatibility Analysis:`);
      console.log(`   🏗️  Shared Architectures: ${sharedArchitectures.join(', ') || 'None'}`);
      console.log(`   🌐 Shared Domains: ${sharedDomains.join(', ') || 'None'}`);
      console.log(`   🏷️  Shared Tags: ${sharedTags.join(', ') || 'None'}`);
      console.log('');

      // Recommendations
      const canCombine = sharedArchitectures.length > 0 || sharedDomains.length > 0;
      const similarityScore = (sharedArchitectures.length + sharedDomains.length + sharedTags.length) / 
        (template1.targets.architectures.length + template1.targets.domains.length + template1.metadata.tags.length) * 100;

      console.log(`💡 Analysis Results:`);
      console.log(`   📊 Similarity Score: ${Math.round(similarityScore)}%`);
      console.log(`   🔗 Can be combined: ${canCombine ? 'Yes' : 'No'}`);
      if (canCombine) {
        console.log(`   🚀 Recommended use: Apply ${template1.metadata.rating > template2.metadata.rating ? template1.name : template2.name} as primary template`);
      }

      Logger.complete(`Template comparison completed`);

    } catch (error) {
      Logger.error(`Failed to compare templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * Export template to file
   */
  async exportTemplate(templateId: string, outputPath: string): Promise<void> {
    try {
      Logger.info(`📤 Exporting template: ${templateId}`);

      const template = this.templateManager.getTemplate(templateId);
      
      if (!template) {
        Logger.error(`❌ Template not found: ${templateId}`);
        process.exit(1);
      }

      const exportData = {
        template,
        exportedAt: new Date().toISOString(),
        exportedBy: 'SupaSeed CLI',
        version: '2.5.0'
      };

      const outputFile = path.resolve(outputPath);
      await fs.promises.writeFile(outputFile, JSON.stringify(exportData, null, 2), 'utf8');
      
      Logger.complete(`Template exported to: ${outputFile}`);

    } catch (error) {
      Logger.error(`Failed to export template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  }
}

/**
 * Register template commands with Commander.js
 */
export function registerTemplateCommands(program: Command): void {
  const handlers = new TemplateCommandHandlers();

  const templateCmd = program
    .command('templates')
    .alias('tmpl')
    .description('🏗️  Manage configuration templates');

  // List templates
  templateCmd
    .command('list')
    .alias('ls')
    .description('📋 List available templates')
    .option('-c, --category <category>', 'Filter by category (platform, domain, hybrid, specialized)')
    .option('-d, --difficulty <difficulty>', 'Filter by difficulty (beginner, intermediate, advanced)')
    .option('-a, --architecture <architecture>', 'Filter by architecture (individual, team, hybrid)')
    .option('-m, --domain <domain>', 'Filter by domain (outdoor, saas, ecommerce, social, generic)')
    .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
    .option('--detailed', 'Show detailed information')
    .action(async (options) => {
      await handlers.listTemplates(options);
    });

  // Show template details
  templateCmd
    .command('show <template-id>')
    .alias('info')
    .description('🔍 Show detailed template information')
    .action(async (templateId) => {
      await handlers.showTemplate(templateId);
    });

  // Apply template
  templateCmd
    .command('apply <template-id>')
    .alias('use')
    .description('🚀 Apply a template to generate configuration')
    .option('-o, --output <path>', 'Output configuration file path')
    .option('--no-validate', 'Skip validation after application')
    .option('--no-inheritance', 'Disable template inheritance')
    .option('--report', 'Generate detailed application report')
    .option('--dry-run', 'Preview changes without applying')
    .action(async (templateId, options) => {
      await handlers.applyTemplate(templateId, options);
    });

  // Get recommendations
  templateCmd
    .command('recommend')
    .alias('rec')
    .description('🎯 Get template recommendations')
    .option('-a, --architecture <architecture>', 'Target architecture (individual, team, hybrid)')
    .option('-d, --domain <domain>', 'Target domain (outdoor, saas, ecommerce, social)')
    .option('--difficulty <difficulty>', 'Preferred difficulty (beginner, intermediate, advanced)')
    .option('-l, --limit <number>', 'Limit number of recommendations', parseInt)
    .action(async (options) => {
      await handlers.recommendTemplates(options);
    });

  // Validate template
  templateCmd
    .command('validate <template-id>')
    .alias('check')
    .description('🔍 Validate a template')
    .action(async (templateId) => {
      await handlers.validateTemplate(templateId);
    });

  // Compare templates
  templateCmd
    .command('compare <template-id-1> <template-id-2>')
    .alias('diff')
    .description('🔍 Compare two templates')
    .action(async (templateId1, templateId2) => {
      await handlers.compareTemplates(templateId1, templateId2);
    });

  // Export template
  templateCmd
    .command('export <template-id> <output-path>')
    .description('📤 Export template to file')
    .action(async (templateId, outputPath) => {
      await handlers.exportTemplate(templateId, outputPath);
    });

  // Quick status command
  templateCmd
    .command('status')
    .description('📊 Show template system status')
    .action(async () => {
      console.log('\n🏗️  SupaSeed Template System Status\n');
      
      const allTemplates = Object.values(ALL_CONFIGURATION_TEMPLATES).flat();
      const categories = new Set(allTemplates.map(t => t.metadata.category));
      const difficulties = new Set(allTemplates.map(t => t.metadata.difficulty));
      const architectures = new Set(allTemplates.flatMap(t => t.targets.architectures));
      const domains = new Set(allTemplates.flatMap(t => t.targets.domains));

      console.log(`📋 Total Templates: ${allTemplates.length}`);
      console.log(`🏷️  Categories: ${Array.from(categories).join(', ')}`);
      console.log(`🎯 Difficulties: ${Array.from(difficulties).join(', ')}`);
      console.log(`🏗️  Architectures: ${Array.from(architectures).join(', ')}`);
      console.log(`🌐 Domains: ${Array.from(domains).join(', ')}`);
      console.log('');
      console.log('💡 Use `templates list` to see all available templates');
      console.log('🎯 Use `templates recommend` to get personalized recommendations');
      
      Logger.complete('Template system status displayed');
    });
}

/**
 * Export command handlers for direct use
 */
export { TemplateCommandHandlers, TemplateCliFormatter };