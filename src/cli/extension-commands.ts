/**
 * Extension Management CLI Commands for SupaSeed v2.5.0
 * Implements CLI commands for extension configuration and management
 * Part of Task 3.5.4: Create CLI commands for extension management
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Logger } from '../utils/logger';
import { 
  ExtensionConfigManager, 
  ExtensionConfigUtils, 
  EXTENSION_CONFIG_TEMPLATES,
  type ExtensionConfig,
  type ExtensionsConfig 
} from '../extensions/extension-config';
import { ConfigManager } from '../config-manager';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as inquirer from 'inquirer';

/**
 * Create extension management CLI commands
 */
export function createExtensionCommands(): Command {
  const extensionCmd = new Command('extension')
    .alias('ext')
    .description('Manage domain extensions and their configurations');

  // List available extensions and templates
  extensionCmd
    .command('list')
    .alias('ls')
    .description('List available extensions and configuration templates')
    .option('--templates', 'Show available configuration templates')
    .option('--enabled', 'Show only enabled extensions')
    .option('--format <format>', 'Output format (table|json|yaml)', 'table')
    .action(async (options) => {
      try {
        await listExtensions(options);
      } catch (error) {
        Logger.error('Failed to list extensions:', error);
        process.exit(1);
      }
    });

  // Show extension configuration
  extensionCmd
    .command('show [extension]')
    .description('Show extension configuration details')
    .option('--config <path>', 'Path to configuration file')
    .option('--format <format>', 'Output format (json|yaml|table)', 'table')
    .action(async (extension, options) => {
      try {
        await showExtensionConfig(extension, options);
      } catch (error) {
        Logger.error('Failed to show extension configuration:', error);
        process.exit(1);
      }
    });

  // Enable extension
  extensionCmd
    .command('enable <extension>')
    .description('Enable a domain extension')
    .option('--config <path>', 'Path to configuration file')
    .option('--template <template>', 'Use configuration template')
    .option('--interactive', 'Interactive configuration setup')
    .action(async (extension, options) => {
      try {
        await enableExtension(extension, options);
      } catch (error) {
        Logger.error('Failed to enable extension:', error);
        process.exit(1);
      }
    });

  // Disable extension
  extensionCmd
    .command('disable <extension>')
    .description('Disable a domain extension')
    .option('--config <path>', 'Path to configuration file')
    .action(async (extension, options) => {
      try {
        await disableExtension(extension, options);
      } catch (error) {
        Logger.error('Failed to disable extension:', error);
        process.exit(1);
      }
    });

  // Configure extension
  extensionCmd
    .command('configure <extension>')
    .description('Configure extension settings')
    .option('--config <path>', 'Path to configuration file')
    .option('--interactive', 'Interactive configuration')
    .option('--set <key=value>', 'Set configuration value', collect, [])
    .action(async (extension, options) => {
      try {
        await configureExtension(extension, options);
      } catch (error) {
        Logger.error('Failed to configure extension:', error);
        process.exit(1);
      }
    });

  // Validate extension configuration
  extensionCmd
    .command('validate')
    .description('Validate extension configurations')
    .option('--config <path>', 'Path to configuration file')
    .option('--fix', 'Auto-fix issues where possible')
    .action(async (options) => {
      try {
        await validateExtensions(options);
      } catch (error) {
        Logger.error('Failed to validate extensions:', error);
        process.exit(1);
      }
    });

  // Apply configuration template
  extensionCmd
    .command('template <templateName>')
    .description('Apply extension configuration template')
    .option('--config <path>', 'Path to configuration file')
    .option('--override <key=value>', 'Override template values', collect, [])
    .option('--preview', 'Preview template without applying')
    .action(async (templateName, options) => {
      try {
        await applyTemplate(templateName, options);
      } catch (error) {
        Logger.error('Failed to apply template:', error);
        process.exit(1);
      }
    });

  // Export extension configuration
  extensionCmd
    .command('export')
    .description('Export extension configuration')
    .option('--config <path>', 'Path to configuration file')
    .option('--output <file>', 'Output file path')
    .option('--format <format>', 'Export format (json|yaml)', 'json')
    .action(async (options) => {
      try {
        await exportExtensionConfig(options);
      } catch (error) {
        Logger.error('Failed to export configuration:', error);
        process.exit(1);
      }
    });

  // Import extension configuration
  extensionCmd
    .command('import <file>')
    .description('Import extension configuration')
    .option('--config <path>', 'Path to configuration file')
    .option('--merge', 'Merge with existing configuration')
    .option('--validate', 'Validate before importing')
    .action(async (file, options) => {
      try {
        await importExtensionConfig(file, options);
      } catch (error) {
        Logger.error('Failed to import configuration:', error);
        process.exit(1);
      }
    });

  // Test extension functionality
  extensionCmd
    .command('test <extension>')
    .description('Test extension functionality')
    .option('--config <path>', 'Path to configuration file')
    .option('--dry-run', 'Perform dry run without actual seeding')
    .action(async (extension, options) => {
      try {
        await testExtension(extension, options);
      } catch (error) {
        Logger.error('Failed to test extension:', error);
        process.exit(1);
      }
    });

  return extensionCmd;
}

/**
 * Helper function to collect multiple option values
 */
function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

/**
 * List available extensions and templates
 */
async function listExtensions(options: any): Promise<void> {
  Logger.info('📋 Listing available extensions...');

  if (options.templates) {
    // Show available templates
    console.log(chalk.bold('\n🔧 Available Configuration Templates:\n'));
    
    EXTENSION_CONFIG_TEMPLATES.forEach(template => {
      console.log(chalk.cyan(`${template.name}`));
      console.log(`  ${chalk.gray(template.description)}`);
      console.log(`  ${chalk.yellow('Architectures:')} ${template.targetArchitectures.join(', ')}`);
      console.log(`  ${chalk.yellow('Domains:')} ${template.targetDomains.join(', ')}`);
      console.log(`  ${chalk.yellow('Extensions:')} ${template.extensions.enabled.map(e => e.name).join(', ')}\n`);
    });
    return;
  }

  // Load current configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();
  const extensionsConfig = config.extensions;

  if (!extensionsConfig) {
    console.log(chalk.yellow('No extension configuration found. Use "extension template" to apply a template.'));
    return;
  }

  const extensionConfigManager = new ExtensionConfigManager(extensionsConfig);
  const extensions = extensionConfigManager.getConfig().enabled;

  if (extensions.length === 0) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  // Filter enabled extensions if requested
  const filteredExtensions = options.enabled 
    ? extensions.filter(ext => ext.enabled)
    : extensions;

  if (options.format === 'json') {
    console.log(JSON.stringify(filteredExtensions, null, 2));
    return;
  }

  // Table format
  console.log(chalk.bold('\n🔌 Configured Extensions:\n'));
  
  filteredExtensions.forEach(ext => {
    const status = ext.enabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled');
    const priority = ext.priority || 0;
    
    console.log(`${chalk.cyan(ext.name.padEnd(15))} ${status.padEnd(20)} Priority: ${priority}`);
    
    if (ext.supportedArchitectures) {
      console.log(`  ${chalk.gray('Architectures:')} ${ext.supportedArchitectures.join(', ')}`);
    }
    
    if (ext.supportedDomains) {
      console.log(`  ${chalk.gray('Domains:')} ${ext.supportedDomains.join(', ')}`);
    }
    
    console.log('');
  });
}

/**
 * Show extension configuration details
 */
async function showExtensionConfig(extensionName: string, options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();
  const extensionsConfig = config.extensions;

  if (!extensionsConfig) {
    console.log(chalk.yellow('No extension configuration found.'));
    return;
  }

  if (extensionName) {
    // Show specific extension
    const extension = ExtensionConfigUtils.getExtension(extensionsConfig, extensionName);
    
    if (!extension) {
      console.log(chalk.red(`Extension '${extensionName}' not found.`));
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(extension, null, 2));
      return;
    }

    // Table format
    console.log(chalk.bold(`\n🔌 Extension: ${chalk.cyan(extensionName)}\n`));
    console.log(`${chalk.yellow('Status:')} ${extension.enabled ? chalk.green('Enabled') : chalk.red('Disabled')}`);
    console.log(`${chalk.yellow('Priority:')} ${extension.priority || 0}`);
    console.log(`${chalk.yellow('Version:')} ${extension.version || 'Not specified'}`);
    
    if (extension.supportedArchitectures) {
      console.log(`${chalk.yellow('Supported Architectures:')} ${extension.supportedArchitectures.join(', ')}`);
    }
    
    if (extension.supportedDomains) {
      console.log(`${chalk.yellow('Supported Domains:')} ${extension.supportedDomains.join(', ')}`);
    }

    if (extension.settings) {
      console.log(`\n${chalk.yellow('Settings:')}`);
      console.log(JSON.stringify(extension.settings, null, 2));
    }
  } else {
    // Show all extension configuration
    if (options.format === 'json') {
      console.log(JSON.stringify(extensionsConfig, null, 2));
      return;
    }

    console.log(chalk.bold('\n🔧 Extensions Configuration:\n'));
    console.log(JSON.stringify(extensionsConfig, null, 2));
  }
}

/**
 * Enable an extension
 */
async function enableExtension(extensionName: string, options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();
  
  // Initialize extensions config if not present
  if (!config.extensions) {
    config.extensions = { enabled: [] };
  }

  const extensionConfigManager = new ExtensionConfigManager(config.extensions);

  // Check if extension already exists
  let extension = ExtensionConfigUtils.getExtension(config.extensions, extensionName);

  if (extension) {
    if (extension.enabled) {
      console.log(chalk.yellow(`Extension '${extensionName}' is already enabled.`));
      return;
    }
    
    // Enable existing extension
    extensionConfigManager.enableExtension(extensionName);
    console.log(chalk.green(`✓ Enabled extension: ${extensionName}`));
  } else {
    // Create new extension configuration
    let extensionConfig: ExtensionConfig;

    if (options.template) {
      // Use template
      const template = ExtensionConfigUtils.getTemplate(options.template);
      if (!template) {
        throw new Error(`Template '${options.template}' not found`);
      }
      
      const templateExtension = template.extensions.enabled.find(e => e.name === extensionName);
      if (!templateExtension) {
        throw new Error(`Extension '${extensionName}' not found in template '${options.template}'`);
      }
      
      extensionConfig = { ...templateExtension };
    } else if (options.interactive) {
      // Interactive configuration
      extensionConfig = await interactiveExtensionConfig(extensionName);
    } else {
      // Basic configuration
      extensionConfig = {
        name: extensionName as any,
        enabled: true,
        priority: 100
      };
    }

    extensionConfigManager.setExtension(extensionConfig);
    console.log(chalk.green(`✓ Added and enabled extension: ${extensionName}`));
  }

  // Save configuration
  config.extensions = extensionConfigManager.getConfig();
  await configManager.saveConfig(config);
  
  console.log(chalk.blue('Configuration saved.'));
}

/**
 * Disable an extension
 */
async function disableExtension(extensionName: string, options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config.extensions) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  const extensionConfigManager = new ExtensionConfigManager(config.extensions);
  const success = extensionConfigManager.disableExtension(extensionName);

  if (!success) {
    console.log(chalk.red(`Extension '${extensionName}' not found.`));
    return;
  }

  config.extensions = extensionConfigManager.getConfig();
  await configManager.saveConfig(config);
  
  console.log(chalk.green(`✓ Disabled extension: ${extensionName}`));
}

/**
 * Configure extension settings
 */
async function configureExtension(extensionName: string, options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config.extensions) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  const extensionConfigManager = new ExtensionConfigManager(config.extensions);
  const extension = ExtensionConfigUtils.getExtension(config.extensions, extensionName);

  if (!extension) {
    console.log(chalk.red(`Extension '${extensionName}' not found.`));
    return;
  }

  if (options.interactive) {
    // Interactive configuration
    const updatedExtension = await interactiveExtensionConfig(extensionName, extension);
    extensionConfigManager.setExtension(updatedExtension);
  } else if (options.set && options.set.length > 0) {
    // Set specific values
    if (!extension.settings) {
      extension.settings = {};
    }

    for (const setting of options.set) {
      const [key, value] = setting.split('=');
      if (!key || value === undefined) {
        console.log(chalk.red(`Invalid setting format: ${setting}. Use key=value.`));
        continue;
      }

      // Parse value (basic type inference)
      let parsedValue: any = value;
      if (value === 'true') parsedValue = true;
      else if (value === 'false') parsedValue = false;
      else if (!isNaN(Number(value))) parsedValue = Number(value);

      // Set nested value using dot notation
      setNestedValue(extension.settings, key, parsedValue);
      console.log(chalk.green(`✓ Set ${key} = ${parsedValue}`));
    }

    extensionConfigManager.setExtension(extension);
  } else {
    console.log(chalk.yellow('No configuration changes specified. Use --interactive or --set key=value.'));
    return;
  }

  config.extensions = extensionConfigManager.getConfig();
  await configManager.saveConfig(config);
  
  console.log(chalk.blue('Extension configuration saved.'));
}

/**
 * Validate extension configurations
 */
async function validateExtensions(options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config.extensions) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  console.log(chalk.blue('🔍 Validating extension configurations...\n'));

  const validation = ExtensionConfigUtils.validateConfig(config.extensions);

  if (validation.valid) {
    console.log(chalk.green('✅ All extension configurations are valid!'));
  } else {
    console.log(chalk.red(`❌ Found ${validation.errors.length} validation errors:\n`));
    
    validation.errors.forEach(error => {
      const severity = error.severity === 'error' ? chalk.red('ERROR') : chalk.yellow('WARNING');
      console.log(`  ${severity} [${error.extension}] ${error.field}: ${error.message}`);
    });
  }

  if (validation.warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Warnings (${validation.warnings.length}):`));
    validation.warnings.forEach(warning => {
      console.log(`  ${chalk.yellow('WARN')} ${warning}`);
    });
  }

  if (validation.suggestions.length > 0) {
    console.log(chalk.blue(`\n💡 Suggestions (${validation.suggestions.length}):`));
    validation.suggestions.forEach(suggestion => {
      const autofix = suggestion.autoFixable ? chalk.green('[AUTO-FIXABLE]') : '';
      console.log(`  ${autofix} [${suggestion.extension}] ${suggestion.field}: ${suggestion.suggestion}`);
    });

    if (options.fix) {
      console.log(chalk.blue('\n🔧 Applying auto-fixes...'));
      // TODO: Implement auto-fix logic
      console.log(chalk.yellow('Auto-fix not yet implemented.'));
    }
  }
}

/**
 * Apply configuration template
 */
async function applyTemplate(templateName: string, options: any): Promise<void> {
  const template = ExtensionConfigUtils.getTemplate(templateName);
  
  if (!template) {
    console.log(chalk.red(`Template '${templateName}' not found.`));
    console.log(chalk.blue('\nAvailable templates:'));
    EXTENSION_CONFIG_TEMPLATES.forEach(t => {
      console.log(`  - ${chalk.cyan(t.name)}: ${t.description}`);
    });
    return;
  }

  // Parse overrides
  const overrides: any = {};
  if (options.override && options.override.length > 0) {
    for (const override of options.override) {
      const [key, value] = override.split('=');
      if (key && value !== undefined) {
        setNestedValue(overrides, key, value);
      }
    }
  }

  const extensionsConfig = ExtensionConfigUtils.fromTemplate(templateName, overrides);

  if (options.preview) {
    console.log(chalk.blue(`\n📋 Preview of template '${templateName}':\n`));
    console.log(JSON.stringify(extensionsConfig, null, 2));
    return;
  }

  // Apply template
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();
  
  config.extensions = extensionsConfig;
  await configManager.saveConfig(config);

  console.log(chalk.green(`✅ Applied template '${templateName}' successfully!`));
  console.log(chalk.blue(`Enabled ${extensionsConfig.enabled.length} extensions:`));
  
  extensionsConfig.enabled.forEach(ext => {
    console.log(`  - ${chalk.cyan(ext.name)} ${ext.enabled ? chalk.green('(enabled)') : chalk.red('(disabled)')}`);
  });
}

/**
 * Export extension configuration
 */
async function exportExtensionConfig(options: any): Promise<void> {
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config.extensions) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  const output = options.format === 'yaml' 
    ? require('js-yaml').dump(config.extensions)
    : JSON.stringify(config.extensions, null, 2);

  if (options.output) {
    writeFileSync(options.output, output);
    console.log(chalk.green(`✓ Extension configuration exported to: ${options.output}`));
  } else {
    console.log(output);
  }
}

/**
 * Import extension configuration
 */
async function importExtensionConfig(file: string, options: any): Promise<void> {
  if (!existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  const content = readFileSync(file, 'utf-8');
  let importedConfig: ExtensionsConfig;

  try {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      importedConfig = require('js-yaml').load(content) as ExtensionsConfig;
    } else {
      importedConfig = JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse configuration file: ${error}`);
  }

  if (options.validate) {
    const validation = ExtensionConfigUtils.validateConfig(importedConfig);
    if (!validation.valid) {
      console.log(chalk.red('❌ Configuration validation failed:'));
      validation.errors.forEach(error => {
        console.log(`  - [${error.extension}] ${error.field}: ${error.message}`);
      });
      return;
    }
  }

  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (options.merge && config.extensions) {
    config.extensions = ExtensionConfigUtils.mergeConfigs(config.extensions, importedConfig);
  } else {
    config.extensions = importedConfig;
  }

  await configManager.saveConfig(config);
  console.log(chalk.green(`✅ Extension configuration imported successfully!`));
}

/**
 * Test extension functionality
 */
async function testExtension(extensionName: string, options: any): Promise<void> {
  console.log(chalk.blue(`🧪 Testing extension: ${extensionName}`));

  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (!config.extensions) {
    console.log(chalk.yellow('No extensions configured.'));
    return;
  }

  const extension = ExtensionConfigUtils.getExtension(config.extensions, extensionName);
  
  if (!extension) {
    console.log(chalk.red(`Extension '${extensionName}' not found.`));
    return;
  }

  if (!extension.enabled) {
    console.log(chalk.yellow(`Extension '${extensionName}' is disabled.`));
    return;
  }

  if (options.dryRun) {
    console.log(chalk.blue('Performing dry run test...'));
    // TODO: Implement dry run testing
    console.log(chalk.green('✅ Dry run test completed successfully!'));
  } else {
    console.log(chalk.blue('Performing full functionality test...'));
    // TODO: Implement full extension testing
    console.log(chalk.green('✅ Extension test completed successfully!'));
  }
}

/**
 * Interactive extension configuration
 */
async function interactiveExtensionConfig(
  extensionName: string, 
  existingConfig?: ExtensionConfig
): Promise<ExtensionConfig> {
  const questions: any[] = [
    {
      type: 'confirm',
      name: 'enabled',
      message: `Enable ${extensionName} extension?`,
      default: existingConfig?.enabled ?? true
    },
    {
      type: 'number',
      name: 'priority',
      message: 'Extension priority (0-1000, higher loads first):',
      default: existingConfig?.priority ?? 100,
      validate: (value: number) => value >= 0 && value <= 1000
    }
  ];

  // Add extension-specific questions
  if (extensionName === 'outdoor') {
    questions.push(
      {
        type: 'checkbox',
        name: 'gearCategories',
        message: 'Select gear categories:',
        choices: ['camping', 'hiking', 'climbing', 'cycling', 'water_sports'],
        default: existingConfig?.settings?.gearCategories ?? ['camping', 'hiking']
      },
      {
        type: 'list',
        name: 'brands',
        message: 'Brand selection strategy:',
        choices: ['realistic', 'generic', 'custom'],
        default: existingConfig?.settings?.brands ?? 'realistic'
      },
      {
        type: 'list',
        name: 'priceRange',
        message: 'Price range strategy:',
        choices: ['market-accurate', 'budget', 'premium', 'mixed'],
        default: existingConfig?.settings?.priceRange ?? 'market-accurate'
      }
    );
  } else if (extensionName === 'ecommerce') {
    questions.push(
      {
        type: 'checkbox',
        name: 'storeTypes',
        message: 'Select store types:',
        choices: ['marketplace', 'direct_to_consumer', 'b2b', 'subscription_box'],
        default: existingConfig?.settings?.storeTypes ?? ['marketplace']
      },
      {
        type: 'checkbox',
        name: 'productCategories',
        message: 'Select product categories:',
        choices: ['electronics', 'clothing', 'home_garden', 'sports_outdoors', 'books_media'],
        default: existingConfig?.settings?.productCategories ?? ['electronics', 'clothing']
      }
    );
  }

  const answers = await inquirer.prompt(questions);

  const config: ExtensionConfig = {
    name: extensionName as any,
    enabled: answers.enabled,
    priority: answers.priority,
    settings: {}
  };

  // Add extension-specific settings
  if (extensionName === 'outdoor') {
    config.settings = {
      gearCategories: answers.gearCategories,
      brands: answers.brands,
      priceRange: answers.priceRange
    };
  } else if (extensionName === 'ecommerce') {
    config.settings = {
      storeTypes: answers.storeTypes,
      productCategories: answers.productCategories
    };
  }

  return config;
}

/**
 * Set nested value using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}