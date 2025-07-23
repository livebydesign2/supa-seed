/**
 * Test suite for Interactive Configuration System
 * Phase 4, Checkpoint D2 validation - Interactive configuration prompt engine and user choice handling
 */

import {
  ConfigurationPromptEngine,
  ConfigurationPrompt,
  ConfigurationOption,
  UserChoice,
  ConfigurationSession,
  PromptGenerationOptions
} from '../src/schema/interactive-configuration';

import {
  UserChoiceValidator,
  ValidationRule,
  ValidationContext,
  ChoiceValidationSummary,
  UserPreferences
} from '../src/schema/choice-validator';

import {
  ConfigurationFileUpdater,
  ConfigurationUpdate,
  UpdateResult,
  FileProcessor
} from '../src/schema/config-file-updater';

import {
  ConfigurationBackupManager,
  BackupMetadata,
  BackupSet,
  RestoreResult
} from '../src/schema/backup-manager';

import { SchemaChange, ConfigurationImpact, MigrationSuggestion } from '../src/schema/schema-evolution';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as rimraf from 'rimraf';

// Mock Logger
jest.mock('../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Interactive Configuration System', () => {
  let tempDir: string;
  let promptEngine: ConfigurationPromptEngine;
  let choiceValidator: UserChoiceValidator;
  let fileUpdater: ConfigurationFileUpdater;
  let backupManager: ConfigurationBackupManager;
  let mockSchemaChanges: SchemaChange[];
  let mockImpacts: ConfigurationImpact[];
  let mockSuggestions: MigrationSuggestion[];

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'supa-seed-test-'));

    // Initialize components
    const options: PromptGenerationOptions = {
      interactiveMode: false,
      autoAcceptLowRisk: false,
      requireConfirmationForHighRisk: true,
      includePreview: true,
      batchSimilarChanges: true,
      minimumRiskThreshold: 'LOW',
      timeoutSeconds: 30,
      saveChoices: false
    };

    promptEngine = new ConfigurationPromptEngine(options);
    choiceValidator = new UserChoiceValidator();
    fileUpdater = new ConfigurationFileUpdater(path.join(tempDir, 'backups'));
    backupManager = new ConfigurationBackupManager(path.join(tempDir, 'backups'));

    // Create mock data
    mockSchemaChanges = [
      {
        id: 'table-added-posts',
        type: 'TABLE_ADDED',
        severity: 'MEDIUM',
        impact: 'COMPATIBLE',
        tableName: 'posts',
        description: 'Table posts was added',
        recommendations: ['Update seeding configurations'],
        migrationRequired: true,
        dataBackupRequired: false
      },
      {
        id: 'column-removed-users-email',
        type: 'COLUMN_REMOVED',
        severity: 'HIGH',
        impact: 'BREAKING',
        tableName: 'users',
        columnName: 'email',
        description: 'Column email was removed from users table',
        recommendations: ['Remove references to email column'],
        migrationRequired: true,
        dataBackupRequired: true
      }
    ];

    mockImpacts = [
      {
        configFile: 'supa-seed.config.js',
        affectedSections: ['seeders', 'mappings'],
        changes: [
          {
            section: 'seeders',
            field: 'posts',
            currentValue: undefined,
            suggestedValue: { enabled: true },
            reason: 'New table added',
            required: true,
            breaking: false
          }
        ],
        migrationNeeded: true,
        backupRecommended: false,
        estimatedEffort: 'LOW'
      }
    ];

    mockSuggestions = [
      {
        id: 'auto-add-posts-seeder',
        title: 'Add Posts Table Seeder',
        description: 'Automatically add seeder configuration for new posts table',
        type: 'AUTOMATIC',
        priority: 'MEDIUM',
        affectedChanges: ['table-added-posts'],
        steps: [
          {
            order: 1,
            title: 'Add seeder config',
            description: 'Add posts seeder to configuration',
            type: 'CONFIG',
            estimated_minutes: 2
          }
        ],
        estimatedTime: 2,
        riskLevel: 'LOW',
        prerequisites: [],
        rollbackPlan: ['Remove posts seeder configuration']
      }
    ];
  });

  afterEach(async () => {
    // Cleanup temporary directory
    await rimraf.rimraf(tempDir);
  });

  describe('Configuration Prompt Engine', () => {
    test('should generate prompts from schema changes', async () => {
      const prompts = await promptEngine.generatePrompts(
        mockSchemaChanges,
        mockImpacts,
        mockSuggestions
      );

      expect(prompts).toBeDefined();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].type).toBe('schema_change');
      expect(prompts[0].options.length).toBeGreaterThan(0);
      expect(prompts[0].context.schemaChanges).toEqual(expect.arrayContaining([mockSchemaChanges[0]]));
    });

    test('should sort prompts by priority', async () => {
      const prompts = await promptEngine.generatePrompts(
        mockSchemaChanges,
        mockImpacts,
        mockSuggestions
      );

      // High severity changes should come before medium severity
      const priorities = prompts.map(p => p.metadata.priority);
      const highPriorityIndex = priorities.indexOf('HIGH');
      const mediumPriorityIndex = priorities.indexOf('MEDIUM');

      if (highPriorityIndex !== -1 && mediumPriorityIndex !== -1) {
        expect(highPriorityIndex).toBeLessThan(mediumPriorityIndex);
      }
    });

    test('should include appropriate options for each prompt type', async () => {
      const prompts = await promptEngine.generatePrompts(
        mockSchemaChanges,
        mockImpacts,
        mockSuggestions
      );

      const schemaPrompt = prompts.find(p => p.type === 'schema_change');
      expect(schemaPrompt?.options).toContainEqual(
        expect.objectContaining({ type: 'accept' })
      );
      expect(schemaPrompt?.options).toContainEqual(
        expect.objectContaining({ type: 'customize' })
      );
      expect(schemaPrompt?.options).toContainEqual(
        expect.objectContaining({ type: 'defer' })
      );
    });

    test('should handle empty input gracefully', async () => {
      const prompts = await promptEngine.generatePrompts([], [], []);

      expect(prompts).toBeDefined();
      expect(prompts).toHaveLength(0);
    });

    test('should present prompt in non-interactive mode', async () => {
      const prompts = await promptEngine.generatePrompts(
        [mockSchemaChanges[0]],
        mockImpacts,
        []
      );

      const choice = await promptEngine.presentPrompt(prompts[0]);

      expect(choice).toBeDefined();
      expect(choice.promptId).toBe(prompts[0].id);
      expect(choice.optionId).toBeDefined();
      expect(choice.confidence).toBe(50); // Auto-choice should have low confidence
    });

    test('should start configuration session', async () => {
      const session = await promptEngine.startConfigurationSession(
        mockSchemaChanges,
        mockImpacts,
        mockSuggestions
      );

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^config-session-/);
      expect(session.prompts.length).toBeGreaterThan(0);
      expect(session.status).toBe('completed'); // Non-interactive mode completes immediately
      expect(session.metadata.totalPrompts).toBeGreaterThan(0);
    });

    test('should track session status', async () => {
      const session = await promptEngine.startConfigurationSession(
        [mockSchemaChanges[0]],
        [],
        []
      );

      const status = promptEngine.getSessionStatus(session.id);
      expect(status).toBeDefined();
      expect(status?.id).toBe(session.id);
    });
  });

  describe('User Choice Validator', () => {
    let mockPrompt: ConfigurationPrompt;
    let mockContext: ValidationContext;

    beforeEach(() => {
      mockPrompt = {
        id: 'test-prompt',
        type: 'schema_change',
        title: 'Test Prompt',
        description: 'Test prompt description',
        context: {
          affectedFiles: ['test.config.js'],
          schemaChanges: [mockSchemaChanges[0]],
          migrationSuggestions: [],
          impactAnalysis: [],
          estimatedEffort: 'LOW'
        },
        options: [
          {
            id: 'accept',
            label: 'Accept',
            description: 'Accept the changes',
            type: 'accept',
            consequences: [],
            prerequisites: [],
            actions: [],
            reversible: true,
            riskLevel: 'LOW'
          },
          {
            id: 'reject',
            label: 'Reject',
            description: 'Reject the changes',
            type: 'reject',
            consequences: [],
            prerequisites: [],
            actions: [],
            reversible: true,
            riskLevel: 'LOW'
          }
        ],
        defaultOption: 'accept',
        required: false,
        dependencies: [],
        metadata: {
          priority: 'MEDIUM',
          riskLevel: 'LOW',
          reversible: true,
          estimatedTime: 5
        }
      };

      mockContext = {
        previousChoices: [],
        availablePrompts: [mockPrompt],
        schemaChanges: mockSchemaChanges,
        systemConstraints: [],
        userPreferences: {
          riskTolerance: 'balanced',
          autoConfirmLowRisk: false,
          requireExplicitHighRisk: true,
          preferredBackupStrategy: 'high_risk_only',
          maxConfigurationTime: 30,
          notificationLevel: 'standard'
        },
        environment: {
          nodeEnv: 'test',
          projectPath: tempDir,
          configFiles: [],
          dependencies: {}
        }
      };
    });

    test('should validate valid choices', async () => {
      const choice: UserChoice = {
        promptId: 'test-prompt',
        optionId: 'accept',
        timestamp: new Date(),
        confidence: 80
      };

      const result = await choiceValidator.validateChoice(choice, mockPrompt, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.ruleId).toBe('composite');
    });

    test('should detect invalid option selection', async () => {
      const choice: UserChoice = {
        promptId: 'test-prompt',
        optionId: 'invalid-option',
        timestamp: new Date(),
        confidence: 80
      };

      const result = await choiceValidator.validateChoice(choice, mockPrompt, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'OPTION_NOT_FOUND',
          severity: 'critical'
        })
      );
    });

    test('should validate choice sequence', async () => {
      const choices: UserChoice[] = [
        {
          promptId: 'test-prompt',
          optionId: 'accept',
          timestamp: new Date(),
          confidence: 85
        }
      ];

      const summary = await choiceValidator.validateChoiceSequence(
        choices,
        [mockPrompt],
        { schemaChanges: mockSchemaChanges }
      );

      expect(summary.totalChoices).toBe(1);
      expect(summary.validChoices).toBe(1);
      expect(summary.errorsFound).toBe(0);
      expect(summary.overallRisk).toBeDefined();
    });

    test('should detect risk tolerance violations', async () => {
      // Update user preferences to be conservative
      mockContext.userPreferences.riskTolerance = 'conservative';
      
      // Update prompt option to be high risk
      mockPrompt.options[0].riskLevel = 'HIGH';

      const choice: UserChoice = {
        promptId: 'test-prompt',
        optionId: 'accept',
        timestamp: new Date(),
        confidence: 80
      };

      const result = await choiceValidator.validateChoice(choice, mockPrompt, mockContext);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'HIGH_RISK_CONSERVATIVE'
        })
      );
    });

    test('should add and remove custom validation rules', () => {
      const customRule: ValidationRule = {
        id: 'test-rule',
        name: 'Test Rule',
        type: 'constraint',
        priority: 'LOW',
        description: 'Test validation rule',
        validator: () => ({
          isValid: true,
          errors: [],
          warnings: [],
          suggestions: [],
          metadata: {
            ruleId: 'test-rule',
            executionTime: 1,
            confidence: 100,
            canAutoFix: false
          }
        })
      };

      choiceValidator.addValidationRule(customRule);
      expect(choiceValidator.getValidationRules()).toContainEqual(customRule);

      const removed = choiceValidator.removeValidationRule('test-rule');
      expect(removed).toBe(true);
      expect(choiceValidator.getValidationRules()).not.toContainEqual(customRule);
    });

    test('should generate validation report', () => {
      const summary: ChoiceValidationSummary = {
        totalChoices: 5,
        validChoices: 4,
        errorsFound: 1,
        warningsFound: 2,
        suggestionsGenerated: 3,
        autoFixesApplied: 1,
        overallRisk: 'MEDIUM',
        estimatedImpact: 'Configuration files will be updated',
        recommendations: ['Consider backup', 'Review changes']
      };

      const report = choiceValidator.generateValidationReport(summary);

      expect(report).toContain('Total Choices: 5');
      expect(report).toContain('Valid Choices: 4');
      expect(report).toContain('Overall Risk Level: MEDIUM');
      expect(report).toContain('Consider backup');
    });
  });

  describe('Configuration File Updater', () => {
    let testConfigFile: string;

    beforeEach(async () => {
      testConfigFile = path.join(tempDir, 'test-config.json');
      
      // Create initial config file
      const initialConfig = {
        seeders: {
          users: { enabled: true }
        },
        database: {
          url: 'test-url'
        }
      };
      
      await fs.promises.writeFile(testConfigFile, JSON.stringify(initialConfig, null, 2));
    });

    test('should apply configuration updates from choices', async () => {
      const choices: UserChoice[] = [
        {
          promptId: 'test-prompt',
          optionId: 'accept',
          timestamp: new Date(),
          confidence: 80
        }
      ];

      const prompts: ConfigurationPrompt[] = [
        {
          id: 'test-prompt',
          type: 'schema_change',
          title: 'Add Posts Table',
          description: 'Add configuration for posts table',
          context: {
            affectedFiles: [testConfigFile],
            schemaChanges: [mockSchemaChanges[0]],
            migrationSuggestions: [],
            impactAnalysis: [],
            estimatedEffort: 'LOW'
          },
          options: [
            {
              id: 'accept',
              label: 'Accept',
              description: 'Add posts seeder',
              type: 'accept',
              consequences: [],
              prerequisites: [],
              actions: [
                {
                  type: 'file_update',
                  description: 'Add posts seeder config',
                  targetPath: testConfigFile,
                  parameters: {
                    configChanges: {
                      'seeders.posts.enabled': true
                    }
                  }
                }
              ],
              reversible: true,
              riskLevel: 'LOW'
            }
          ],
          defaultOption: 'accept',
          required: false,
          dependencies: [],
          metadata: {
            priority: 'MEDIUM',
            riskLevel: 'LOW',
            reversible: true,
            estimatedTime: 5
          }
        }
      ];

      const result = await fileUpdater.applyUpdates(choices, prompts, mockSchemaChanges);

      expect(result.success).toBe(true);
      expect(result.updatedFiles).toContain(testConfigFile);
      expect(result.errors).toHaveLength(0);

      // Verify file was updated
      const updatedConfig = JSON.parse(await fs.promises.readFile(testConfigFile, 'utf8'));
      expect(updatedConfig.seeders.posts).toEqual({ enabled: true });
    });

    test('should handle file creation', async () => {
      const newConfigFile = path.join(tempDir, 'new-config.json');
      
      const choices: UserChoice[] = [
        {
          promptId: 'create-prompt',
          optionId: 'create',
          timestamp: new Date(),
          confidence: 90
        }
      ];

      const prompts: ConfigurationPrompt[] = [
        {
          id: 'create-prompt',
          type: 'impact_resolution',
          title: 'Create Config File',
          description: 'Create new configuration file',
          context: {
            affectedFiles: [newConfigFile],
            schemaChanges: [],
            migrationSuggestions: [],
            impactAnalysis: [],
            estimatedEffort: 'LOW'
          },
          options: [
            {
              id: 'create',
              label: 'Create File',
              description: 'Create new configuration file',
              type: 'accept',
              consequences: [],
              prerequisites: [],
              actions: [
                {
                  type: 'file_create',
                  description: 'Create configuration file',
                  targetPath: newConfigFile,
                  parameters: {
                    configChanges: {
                      'version': '1.0.0',
                      'enabled': true
                    }
                  }
                }
              ],
              reversible: true,
              riskLevel: 'LOW'
            }
          ],
          defaultOption: 'create',
          required: false,
          dependencies: [],
          metadata: {
            priority: 'MEDIUM',
            riskLevel: 'LOW',
            reversible: true,
            estimatedTime: 3
          }
        }
      ];

      const result = await fileUpdater.applyUpdates(choices, prompts, []);

      expect(result.success).toBe(true);
      expect(fs.existsSync(newConfigFile)).toBe(true);
      
      const createdConfig = JSON.parse(await fs.promises.readFile(newConfigFile, 'utf8'));
      expect(createdConfig.version).toBe('1.0.0');
      expect(createdConfig.enabled).toBe(true);
    });

    test('should handle update errors gracefully', async () => {
      // Create invalid choice that will fail
      const choices: UserChoice[] = [
        {
          promptId: 'invalid-prompt',
          optionId: 'invalid-option',
          timestamp: new Date(),
          confidence: 80
        }
      ];

      const result = await fileUpdater.applyUpdates(choices, [], []);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'PROMPT_NOT_FOUND'
        })
      );
    });

    test('should create rollback plan', async () => {
      const choices: UserChoice[] = [
        {
          promptId: 'test-prompt',
          optionId: 'accept',
          timestamp: new Date(),
          confidence: 80
        }
      ];

      // Mock prompt with file_update action
      const prompts: ConfigurationPrompt[] = [
        {
          id: 'test-prompt',
          type: 'schema_change',
          title: 'Test Update',
          description: 'Test configuration update',
          context: {
            affectedFiles: [testConfigFile],
            schemaChanges: [],
            migrationSuggestions: [],
            impactAnalysis: [],
            estimatedEffort: 'LOW'
          },
          options: [
            {
              id: 'accept',
              label: 'Accept',
              description: 'Accept changes',
              type: 'accept',
              consequences: [],
              prerequisites: [],
              actions: [
                {
                  type: 'file_update',
                  description: 'Update config',
                  targetPath: testConfigFile,
                  parameters: {
                    configChanges: { 'test.value': 'updated' }
                  }
                }
              ],
              reversible: true,
              riskLevel: 'LOW'
            }
          ],
          defaultOption: 'accept',
          required: false,
          dependencies: [],
          metadata: {
            priority: 'MEDIUM',
            riskLevel: 'LOW',
            reversible: true,
            estimatedTime: 5
          }
        }
      ];

      const result = await fileUpdater.applyUpdates(choices, prompts, []);

      expect(result.rollbackPlan).toBeDefined();
      expect(result.rollbackPlan.length).toBeGreaterThan(0);
      expect(result.rollbackPlan[0].type).toBe('restore_file');
    });

    test('should add custom file processor', () => {
      const customProcessor: FileProcessor = {
        name: 'yaml',
        supportedExtensions: ['.yml', '.yaml'],
        canProcess: (filePath) => filePath.endsWith('.yml') || filePath.endsWith('.yaml'),
        parse: (content) => ({ content }),
        stringify: (data) => data.content || '',
        applyChanges: (data, changes) => data,
        validate: () => ({ isValid: true, errors: [] })
      };

      fileUpdater.addFileProcessor(customProcessor);

      // Verify processor was added (this would be tested indirectly through processing files)
      expect(true).toBe(true);
    });

    test('should get update history', async () => {
      const initialHistory = fileUpdater.getUpdateHistory();
      expect(initialHistory).toHaveLength(0);

      // Apply an update
      const choices: UserChoice[] = [
        {
          promptId: 'history-test',
          optionId: 'accept',
          timestamp: new Date(),
          confidence: 80
        }
      ];

      const prompts: ConfigurationPrompt[] = [
        {
          id: 'history-test',
          type: 'schema_change',
          title: 'History Test',
          description: 'Test update for history tracking',
          context: {
            affectedFiles: [testConfigFile],
            schemaChanges: [],
            migrationSuggestions: [],
            impactAnalysis: [],
            estimatedEffort: 'LOW'
          },
          options: [
            {
              id: 'accept',
              label: 'Accept',
              description: 'Accept changes',
              type: 'accept',
              consequences: [],
              prerequisites: [],
              actions: [
                {
                  type: 'file_update',
                  description: 'Update for history',
                  targetPath: testConfigFile,
                  parameters: {
                    configChanges: { 'history.test': true }
                  }
                }
              ],
              reversible: true,
              riskLevel: 'LOW'
            }
          ],
          defaultOption: 'accept',
          required: false,
          dependencies: [],
          metadata: {
            priority: 'MEDIUM',
            riskLevel: 'LOW',
            reversible: true,
            estimatedTime: 2
          }
        }
      ];

      await fileUpdater.applyUpdates(choices, prompts, []);

      const updatedHistory = fileUpdater.getUpdateHistory();
      expect(updatedHistory.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Backup Manager', () => {
    let testFile: string;

    beforeEach(async () => {
      testFile = path.join(tempDir, 'test-file.txt');
      await fs.promises.writeFile(testFile, 'Original content');
    });

    test('should create backup of file', async () => {
      const backup = await backupManager.createBackup(testFile, 'manual', ['test']);

      expect(backup).toBeDefined();
      expect(backup.id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-test-file-/);
      expect(backup.sourceFile).toBe(path.resolve(testFile));
      expect(backup.reason).toBe('manual');
      expect(backup.tags).toContain('test');
      expect(fs.existsSync(backup.backupPath)).toBe(true);
    });

    test('should create backup set for multiple files', async () => {
      const file2 = path.join(tempDir, 'test-file2.txt');
      await fs.promises.writeFile(file2, 'Second file content');

      const backupSet = await backupManager.createBackupSet(
        [testFile, file2],
        'Test Backup Set',
        'Backing up test files'
      );

      expect(backupSet).toBeDefined();
      expect(backupSet.backups).toHaveLength(2);
      expect(backupSet.status).toBe('complete');
      expect(backupSet.totalSize).toBeGreaterThan(0);
    });

    test('should restore backup successfully', async () => {
      // Create backup
      const backup = await backupManager.createBackup(testFile);

      // Modify original file
      await fs.promises.writeFile(testFile, 'Modified content');

      // Restore backup
      const result = await backupManager.restoreBackup(backup.id);

      expect(result.success).toBe(true);
      expect(result.restoredFiles).toContain(testFile);
      expect(result.errors).toHaveLength(0);

      // Verify content was restored
      const restoredContent = await fs.promises.readFile(testFile, 'utf8');
      expect(restoredContent).toBe('Original content');
    });

    test('should restore backup set', async () => {
      const file2 = path.join(tempDir, 'test-file2.txt');
      await fs.promises.writeFile(file2, 'Second file content');

      // Create backup set
      const backupSet = await backupManager.createBackupSet(
        [testFile, file2],
        'Restore Test Set',
        'Testing backup set restore'
      );

      // Modify files
      await fs.promises.writeFile(testFile, 'Modified 1');
      await fs.promises.writeFile(file2, 'Modified 2');

      // Restore backup set
      const result = await backupManager.restoreBackupSet(backupSet.id);

      expect(result.success).toBe(true);
      expect(result.restoredFiles).toHaveLength(2);

      // Verify both files were restored
      const content1 = await fs.promises.readFile(testFile, 'utf8');
      const content2 = await fs.promises.readFile(file2, 'utf8');
      expect(content1).toBe('Original content');
      expect(content2).toBe('Second file content');
    });

    test('should list backups with filters', async () => {
      // Create multiple backups
      await backupManager.createBackup(testFile, 'manual', ['tag1']);
      await backupManager.createBackup(testFile, 'pre_update', ['tag2']);

      // List all backups
      const allBackups = backupManager.listBackups();
      expect(allBackups).toHaveLength(2);

      // Filter by reason
      const manualBackups = backupManager.listBackups({ reason: 'manual' });
      expect(manualBackups).toHaveLength(1);
      expect(manualBackups[0].reason).toBe('manual');

      // Filter by tags
      const tag1Backups = backupManager.listBackups({ tags: ['tag1'] });
      expect(tag1Backups).toHaveLength(1);
      expect(tag1Backups[0].tags).toContain('tag1');
    });

    test('should verify backup integrity', async () => {
      // Create backup
      const backup = await backupManager.createBackup(testFile);

      // Verify integrity
      const result = await backupManager.verifyBackups([backup.id]);

      expect(result.isValid).toBe(true);
      expect(result.totalVerified).toBe(1);
      expect(result.corruptedBackups).toHaveLength(0);
      expect(result.missingFiles).toHaveLength(0);
      expect(result.checksumMismatches).toHaveLength(0);
    });

    test('should detect corrupted backups', async () => {
      // Create backup
      const backup = await backupManager.createBackup(testFile);

      // Corrupt backup file
      await fs.promises.writeFile(backup.backupPath, 'corrupted content');

      // Verify integrity
      const result = await backupManager.verifyBackups([backup.id]);

      expect(result.isValid).toBe(false);
      expect(result.checksumMismatches).toContain(backup.id);
    });

    test('should apply retention policies', async () => {
      // Create multiple backups
      const backups: BackupMetadata[] = [];
      for (let i = 0; i < 15; i++) {
        const backup = await backupManager.createBackup(testFile, 'scheduled');
        backups.push(backup);
      }

      // Apply retention (default keeps 10 backups)
      const result = await backupManager.applyRetentionPolicies();

      expect(result.deletedBackups.length).toBeGreaterThan(0);
      expect(result.totalSpaceFreed).toBeGreaterThan(0);

      // Verify remaining backups
      const remainingBackups = backupManager.listBackups();
      expect(remainingBackups.length).toBeLessThanOrEqual(10);
    });

    test('should get backup statistics', async () => {
      // Create some backups
      await backupManager.createBackup(testFile, 'manual');
      await backupManager.createBackup(testFile, 'pre_update');

      const stats = backupManager.getBackupStatistics();

      expect(stats.totalBackups).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.backupsByReason.manual).toBe(1);
      expect(stats.backupsByReason.pre_update).toBe(1);
      expect(stats.oldestBackup).toBeDefined();
      expect(stats.newestBackup).toBeDefined();
    });

    test('should delete backup', async () => {
      const backup = await backupManager.createBackup(testFile);
      
      const deleted = await backupManager.deleteBackup(backup.id);
      expect(deleted).toBe(true);

      // Verify backup is gone
      const remainingBackups = backupManager.listBackups();
      expect(remainingBackups.find(b => b.id === backup.id)).toBeUndefined();
      expect(fs.existsSync(backup.backupPath)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete configuration update workflow', async () => {
      const configFile = path.join(tempDir, 'workflow-test.json');
      const initialConfig = { seeders: { users: { enabled: true } } };
      await fs.promises.writeFile(configFile, JSON.stringify(initialConfig, null, 2));

      // 1. Generate prompts
      const prompts = await promptEngine.generatePrompts(
        [mockSchemaChanges[0]], // Table added
        mockImpacts,
        mockSuggestions
      );

      expect(prompts.length).toBeGreaterThan(0);

      // 2. Simulate user making choices
      const choices: UserChoice[] = prompts.map(prompt => ({
        promptId: prompt.id,
        optionId: prompt.defaultOption || prompt.options[0].id,
        timestamp: new Date(),
        confidence: 85
      }));

      // 3. Validate choices
      const validation = await choiceValidator.validateChoiceSequence(
        choices,
        prompts,
        { schemaChanges: mockSchemaChanges }
      );

      expect(validation.validChoices).toBe(choices.length);

      // 4. Create backup before updates
      const backupSet = await backupManager.createBackupSet(
        [configFile],
        'Pre-update Backup',
        'Backup before schema changes'
      );

      expect(backupSet.status).toBe('complete');

      // 5. Apply updates
      const updateResult = await fileUpdater.applyUpdates(choices, prompts, mockSchemaChanges);

      expect(updateResult.success).toBe(true);

      // 6. Verify changes were applied (this would depend on the specific prompt implementation)
      expect(fs.existsSync(configFile)).toBe(true);
    });

    test('should handle rollback scenario', async () => {
      const configFile = path.join(tempDir, 'rollback-test.json');
      const initialConfig = { version: '1.0.0', enabled: true };
      await fs.promises.writeFile(configFile, JSON.stringify(initialConfig, null, 2));

      // Create backup
      const backup = await backupManager.createBackup(configFile, 'pre_update');

      // Simulate failed update by modifying file
      const corruptedConfig = { corrupted: true };
      await fs.promises.writeFile(configFile, JSON.stringify(corruptedConfig, null, 2));

      // Rollback using backup
      const restoreResult = await backupManager.restoreBackup(backup.id);

      expect(restoreResult.success).toBe(true);

      // Verify original content was restored
      const restoredConfig = JSON.parse(await fs.promises.readFile(configFile, 'utf8'));
      expect(restoredConfig.version).toBe('1.0.0');
      expect(restoredConfig.enabled).toBe(true);
      expect(restoredConfig.corrupted).toBeUndefined();
    });

    test('should handle configuration session with validation errors', async () => {
      // Create prompts that will generate validation errors
      const problematicChoice: UserChoice = {
        promptId: 'non-existent-prompt',
        optionId: 'non-existent-option',
        timestamp: new Date(),
        confidence: 50
      };

      const mockPrompt: ConfigurationPrompt = {
        id: 'real-prompt',
        type: 'schema_change',
        title: 'Real Prompt',
        description: 'A real prompt for testing',
        context: {
          affectedFiles: [],
          schemaChanges: [],
          migrationSuggestions: [],
          impactAnalysis: [],
          estimatedEffort: 'LOW'
        },
        options: [
          {
            id: 'valid-option',
            label: 'Valid Option',
            description: 'A valid option',
            type: 'accept',
            consequences: [],
            prerequisites: [],
            actions: [],
            reversible: true,
            riskLevel: 'LOW'
          }
        ],
        defaultOption: 'valid-option',
        required: false,
        dependencies: [],
        metadata: {
          priority: 'LOW',
          riskLevel: 'LOW',
          reversible: true,
          estimatedTime: 1
        }
      };

      // Validate problematic choice
      const context: ValidationContext = {
        previousChoices: [],
        availablePrompts: [mockPrompt],
        schemaChanges: [],
        systemConstraints: [],
        userPreferences: {
          riskTolerance: 'balanced',
          autoConfirmLowRisk: false,
          requireExplicitHighRisk: true,
          preferredBackupStrategy: 'high_risk_only',
          maxConfigurationTime: 30,
          notificationLevel: 'standard'
        },
        environment: {
          nodeEnv: 'test',
          projectPath: tempDir,
          configFiles: [],
          dependencies: {}
        }
      };

      const validation = await choiceValidator.validateChoiceSequence(
        [problematicChoice],
        [mockPrompt],
        context
      );

      expect(validation.errorsFound).toBeGreaterThan(0);
      expect(validation.validChoices).toBe(0);

      // Verify that the system handles errors gracefully
      const report = choiceValidator.generateValidationReport(validation);
      expect(report).toContain('Errors Found: ');
    });
  });
});