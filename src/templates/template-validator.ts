/**
 * Template Validation and Testing Framework
 * Phase 4, Checkpoint D3 - Comprehensive template validation with automated testing
 */

import { Template, TemplateVariable, TemplateFile, RenderResult } from './template-engine';
import { TemplateEngine } from './template-engine';
import { DynamicVariableResolver } from './variable-resolver';
import { SchemaInfo } from '../schema-adapter';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structure' | 'security' | 'performance' | 'compatibility' | 'best-practice';
  severity: 'error' | 'warning' | 'info';
  validate: (template: Template, context?: ValidationContext) => ValidationIssue[];
}

export interface ValidationContext {
  schema?: SchemaInfo;
  targetEnvironment?: 'development' | 'staging' | 'production';
  supaSeedVersion?: string;
  strictMode?: boolean;
  customRules?: ValidationRule[];
}

export interface ValidationIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    file?: string;
    line?: number;
    column?: number;
    variable?: string;
  };
  suggestion?: string;
  autoFixAvailable?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    infos: number;
    rulesApplied: number;
    validationTime: number;
  };
  recommendations: string[];
}

export interface TemplateTest {
  id: string;
  name: string;
  description: string;
  templateId: string;
  variables: Record<string, any>;
  expectedFiles: Array<{
    path: string;
    contentMatches?: string | RegExp;
    shouldExist: boolean;
    minSize?: number;
  }>;
  expectedVariables?: string[];
  shouldSucceed: boolean;
  timeout?: number;
}

export interface TestResult {
  testId: string;
  success: boolean;
  renderResult?: RenderResult;
  issues: TestIssue[];
  executionTime: number;
}

export interface TestIssue {
  type: 'assertion' | 'error' | 'timeout';
  message: string;
  expected?: any;
  actual?: any;
  context?: any;
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: TemplateTest[];
  setup?: {
    schema?: SchemaInfo;
    variables?: Record<string, any>;
  };
  teardown?: {
    cleanup?: boolean;
  };
}

export interface TestSuiteResult {
  suiteId: string;
  success: boolean;
  results: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    executionTime: number;
  };
}

export class TemplateValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private engine: TemplateEngine;
  private resolver: DynamicVariableResolver;

  constructor(engine: TemplateEngine, resolver: DynamicVariableResolver) {
    this.engine = engine;
    this.resolver = resolver;
    this.initializeBuiltInRules();
  }

  /**
   * Validate a template against all rules
   */
  async validateTemplate(
    template: Template,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    Logger.info(`🔍 Validating template: ${template.name}`);

    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    let rulesApplied = 0;

    // Apply all validation rules
    for (const rule of this.rules.values()) {
      try {
        const ruleIssues = rule.validate(template, context);
        issues.push(...ruleIssues);
        rulesApplied++;
      } catch (error: any) {
        Logger.warn(`Validation rule ${rule.id} failed: ${error.message}`);
        issues.push({
          ruleId: 'RULE_EXECUTION_ERROR',
          severity: 'warning',
          message: `Validation rule '${rule.name}' failed to execute`,
          suggestion: 'This may indicate a problem with the validation rule itself'
        });
      }
    }

    // Calculate score
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));

    // Generate recommendations
    if (score < 80) {
      recommendations.push('Consider addressing validation issues to improve template quality');
    }
    if (errorCount > 0) {
      recommendations.push('Fix all errors before using this template in production');
    }
    if (template.files.length > 10) {
      recommendations.push('Consider splitting large templates into smaller, focused templates');
    }

    const validationTime = Date.now() - startTime;
    const isValid = errorCount === 0;

    Logger.info(`🔍 Validation complete: ${isValid ? 'VALID' : 'INVALID'} (score: ${score}/100)`);

    return {
      isValid,
      score,
      issues,
      summary: {
        errors: errorCount,
        warnings: warningCount,
        infos: issues.filter(i => i.severity === 'info').length,
        rulesApplied,
        validationTime
      },
      recommendations
    };
  }

  /**
   * Run a single template test
   */
  async runTest(test: TemplateTest, schema?: SchemaInfo): Promise<TestResult> {
    const startTime = Date.now();
    Logger.debug(`🧪 Running test: ${test.name}`);

    const issues: TestIssue[] = [];
    let renderResult: RenderResult | undefined;

    try {
      // Run the template with test variables
      renderResult = await this.engine.renderTemplate(
        test.templateId,
        test.variables,
        schema
      );

      // Check if render succeeded as expected
      if (test.shouldSucceed && !renderResult.success) {
        issues.push({
          type: 'assertion',
          message: 'Template rendering should have succeeded but failed',
          expected: 'success',
          actual: 'failure',
          context: { errors: renderResult.errors }
        });
      } else if (!test.shouldSucceed && renderResult.success) {
        issues.push({
          type: 'assertion',
          message: 'Template rendering should have failed but succeeded',
          expected: 'failure',
          actual: 'success'
        });
      }

      // Validate expected files
      if (renderResult.success && test.expectedFiles) {
        for (const expectedFile of test.expectedFiles) {
          const actualFile = renderResult.files.find(f => f.path === expectedFile.path);
          
          if (expectedFile.shouldExist && !actualFile) {
            issues.push({
              type: 'assertion',
              message: `Expected file not generated: ${expectedFile.path}`,
              expected: 'file exists',
              actual: 'file missing'
            });
          } else if (!expectedFile.shouldExist && actualFile) {
            issues.push({
              type: 'assertion',
              message: `Unexpected file generated: ${expectedFile.path}`,
              expected: 'file missing',
              actual: 'file exists'
            });
          }

          if (actualFile && expectedFile.contentMatches) {
            const match = typeof expectedFile.contentMatches === 'string'
              ? actualFile.content.includes(expectedFile.contentMatches)
              : expectedFile.contentMatches.test(actualFile.content);

            if (!match) {
              issues.push({
                type: 'assertion',
                message: `File content does not match expected pattern: ${expectedFile.path}`,
                expected: expectedFile.contentMatches.toString(),
                actual: `${actualFile.content.substring(0, 100)}...`
              });
            }
          }

          if (actualFile && expectedFile.minSize && actualFile.content.length < expectedFile.minSize) {
            issues.push({
              type: 'assertion',
              message: `File is smaller than expected: ${expectedFile.path}`,
              expected: `>= ${expectedFile.minSize} bytes`,
              actual: `${actualFile.content.length} bytes`
            });
          }
        }
      }

      // Validate expected variables were used
      if (test.expectedVariables && renderResult.success) {
        const usedVariables = renderResult.metadata.variablesUsed;
        for (const expectedVar of test.expectedVariables) {
          if (!usedVariables.includes(expectedVar)) {
            issues.push({
              type: 'assertion',
              message: `Expected variable not used in template: ${expectedVar}`,
              expected: 'variable used',
              actual: 'variable unused'
            });
          }
        }
      }

    } catch (error: any) {
      issues.push({
        type: 'error',
        message: `Test execution failed: ${error.message}`,
        context: { error: error.stack }
      });
    }

    const executionTime = Date.now() - startTime;
    
    // Check timeout
    if (test.timeout && executionTime > test.timeout) {
      issues.push({
        type: 'timeout',
        message: `Test exceeded timeout: ${executionTime}ms > ${test.timeout}ms`
      });
    }

    const success = issues.filter(i => i.type === 'assertion' || i.type === 'error').length === 0;

    return {
      testId: test.id,
      success,
      renderResult,
      issues,
      executionTime
    };
  }

  /**
   * Run a complete test suite
   */
  async runTestSuite(suite: TestSuite): Promise<TestSuiteResult> {
    const startTime = Date.now();
    Logger.info(`🧪 Running test suite: ${suite.name} (${suite.tests.length} tests)`);

    const results: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const test of suite.tests) {
      try {
        const result = await this.runTest(test, suite.setup?.schema);
        results.push(result);
        
        if (result.success) {
          passed++;
        } else {
          failed++;
        }
      } catch (error: any) {
        Logger.error(`Test ${test.id} failed: ${error.message}`);
        results.push({
          testId: test.id,
          success: false,
          issues: [{
            type: 'error',
            message: `Test setup failed: ${error.message}`
          }],
          executionTime: 0
        });
        failed++;
      }
    }

    const executionTime = Date.now() - startTime;
    const success = failed === 0;

    Logger.info(`🧪 Test suite complete: ${passed}/${suite.tests.length} passed in ${executionTime}ms`);

    return {
      suiteId: suite.id,
      success,
      results,
      summary: {
        totalTests: suite.tests.length,
        passed,
        failed,
        skipped,
        executionTime
      }
    };
  }

  /**
   * Add a custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    Logger.debug(`Added validation rule: ${rule.name}`);
  }

  /**
   * Remove a validation rule
   */
  removeValidationRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Generate a test suite from a template
   */
  generateTestSuite(template: Template, options?: {
    includeErrorCases?: boolean;
    generateVariableCombinations?: boolean;
  }): TestSuite {
    const tests: TemplateTest[] = [];

    // Basic success test
    const basicVariables: Record<string, any> = {};
    for (const variable of template.variables) {
      if (variable.defaultValue !== undefined) {
        basicVariables[variable.name] = variable.defaultValue;
      } else {
        // Generate basic values based on type
        switch (variable.type) {
          case 'string':
            basicVariables[variable.name] = `test_${variable.name}`;
            break;
          case 'number':
            basicVariables[variable.name] = 42;
            break;
          case 'boolean':
            basicVariables[variable.name] = true;
            break;
          case 'array':
            basicVariables[variable.name] = ['item1', 'item2'];
            break;
          case 'object':
            basicVariables[variable.name] = { key: 'value' };
            break;
        }
      }
    }

    tests.push({
      id: `${template.id}_basic_success`,
      name: 'Basic Success Test',
      description: 'Tests template with valid basic variables',
      templateId: template.id,
      variables: basicVariables,
      expectedFiles: template.files.map(f => ({
        path: f.path,
        shouldExist: true,
        minSize: 10
      })),
      shouldSucceed: true
    });

    // Error cases
    if (options?.includeErrorCases) {
      // Missing required variables
      const requiredVars = template.variables.filter(v => v.required);
      if (requiredVars.length > 0) {
        const incompleteVariables = { ...basicVariables };
        delete incompleteVariables[requiredVars[0].name];

        tests.push({
          id: `${template.id}_missing_required`,
          name: 'Missing Required Variable Test',
          description: 'Tests template with missing required variables',
          templateId: template.id,
          variables: incompleteVariables,
          expectedFiles: [],
          shouldSucceed: false
        });
      }

      // Invalid variable types
      const stringVar = template.variables.find(v => v.type === 'string');
      if (stringVar) {
        const invalidTypeVariables = { ...basicVariables };
        invalidTypeVariables[stringVar.name] = 12345; // Number instead of string

        tests.push({
          id: `${template.id}_invalid_type`,
          name: 'Invalid Variable Type Test',
          description: 'Tests template with invalid variable types',
          templateId: template.id,
          variables: invalidTypeVariables,
          expectedFiles: [],
          shouldSucceed: false
        });
      }
    }

    return {
      id: `${template.id}_generated_suite`,
      name: `Generated Test Suite for ${template.name}`,
      description: `Automatically generated test suite for template ${template.id}`,
      tests
    };
  }

  /**
   * Private: Initialize built-in validation rules
   */
  private initializeBuiltInRules(): void {
    // Template structure validation
    this.addValidationRule({
      id: 'template_structure',
      name: 'Template Structure',
      description: 'Validates basic template structure and required fields',
      category: 'structure',
      severity: 'error',
      validate: (template) => {
        const issues: ValidationIssue[] = [];

        if (!template.id) {
          issues.push({
            ruleId: 'template_structure',
            severity: 'error',
            message: 'Template must have an ID',
            suggestion: 'Add a unique ID to identify this template'
          });
        }

        if (!template.name) {
          issues.push({
            ruleId: 'template_structure',
            severity: 'error',
            message: 'Template must have a name',
            suggestion: 'Add a descriptive name for this template'
          });
        }

        if (!template.version) {
          issues.push({
            ruleId: 'template_structure',
            severity: 'error',
            message: 'Template must have a version',
            suggestion: 'Add semantic version (e.g., "1.0.0")'
          });
        }

        if (!template.files || template.files.length === 0) {
          issues.push({
            ruleId: 'template_structure',
            severity: 'error',
            message: 'Template must have at least one file',
            suggestion: 'Add template files to generate output'
          });
        }

        return issues;
      }
    });

    // Variable validation
    this.addValidationRule({
      id: 'variable_validation',
      name: 'Variable Validation',
      description: 'Validates template variables and their definitions',
      category: 'structure',
      severity: 'error',
      validate: (template) => {
        const issues: ValidationIssue[] = [];
        const variableNames = new Set<string>();

        for (const variable of template.variables) {
          // Check for duplicate names
          if (variableNames.has(variable.name)) {
            issues.push({
              ruleId: 'variable_validation',
              severity: 'error',
              message: `Duplicate variable name: ${variable.name}`,
              location: { variable: variable.name },
              suggestion: 'Use unique names for all variables'
            });
          }
          variableNames.add(variable.name);

          // Check variable name format
          if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable.name)) {
            issues.push({
              ruleId: 'variable_validation',
              severity: 'warning',
              message: `Variable name should follow camelCase convention: ${variable.name}`,
              location: { variable: variable.name },
              suggestion: 'Use camelCase for variable names'
            });
          }

          // Check required variables have descriptions
          if (variable.required && !variable.description) {
            issues.push({
              ruleId: 'variable_validation',
              severity: 'warning',
              message: `Required variable missing description: ${variable.name}`,
              location: { variable: variable.name },
              suggestion: 'Add descriptive text to help users understand this variable'
            });
          }

          // Check for circular dependencies
          if (variable.dependencies) {
            for (const dep of variable.dependencies) {
              const depVar = template.variables.find(v => v.name === dep);
              if (depVar?.dependencies?.includes(variable.name)) {
                issues.push({
                  ruleId: 'variable_validation',
                  severity: 'error',
                  message: `Circular dependency between ${variable.name} and ${dep}`,
                  location: { variable: variable.name },
                  suggestion: 'Remove circular dependencies between variables'
                });
              }
            }
          }
        }

        return issues;
      }
    });

    // Security validation
    this.addValidationRule({
      id: 'security_check',
      name: 'Security Check',
      description: 'Checks for potential security issues in templates',
      category: 'security',
      severity: 'error',
      validate: (template) => {
        const issues: ValidationIssue[] = [];

        for (const file of template.files) {
          // Check for dangerous patterns
          const dangerousPatterns = [
            /eval\s*\(/g,
            /Function\s*\(/g,
            /require\s*\(\s*['"]/g,
            /import\s+.*from\s+['"]/g,
            /process\.env\./g
          ];

          for (const pattern of dangerousPatterns) {
            if (pattern.test(file.content)) {
              issues.push({
                ruleId: 'security_check',
                severity: 'warning',
                message: `Potentially unsafe pattern found in ${file.path}`,
                location: { file: file.path },
                suggestion: 'Review template for security implications'
              });
            }
          }

          // Check for hardcoded secrets
          const secretPatterns = [
            /password\s*[:=]\s*['"]/gi,
            /secret\s*[:=]\s*['"]/gi,
            /key\s*[:=]\s*['"]/gi,
            /token\s*[:=]\s*['"]/gi
          ];

          for (const pattern of secretPatterns) {
            if (pattern.test(file.content)) {
              issues.push({
                ruleId: 'security_check',
                severity: 'error',
                message: `Potential hardcoded secret in ${file.path}`,
                location: { file: file.path },
                suggestion: 'Use variables for sensitive values'
              });
            }
          }
        }

        return issues;
      }
    });

    // Performance validation
    this.addValidationRule({
      id: 'performance_check',
      name: 'Performance Check',
      description: 'Checks for performance issues in templates',
      category: 'performance',
      severity: 'warning',
      validate: (template) => {
        const issues: ValidationIssue[] = [];

        // Check template size
        const totalSize = template.files.reduce((sum, f) => sum + f.content.length, 0);
        if (totalSize > 100000) { // 100KB
          issues.push({
            ruleId: 'performance_check',
            severity: 'warning',
            message: `Template is very large (${Math.round(totalSize / 1024)}KB)`,
            suggestion: 'Consider splitting into smaller templates'
          });
        }

        // Check for excessive loops in templates
        for (const file of template.files) {
          const loopMatches = file.content.match(/\{\{#each|\{\{#for|\{\{#while/g);
          if (loopMatches && loopMatches.length > 5) {
            issues.push({
              ruleId: 'performance_check',
              severity: 'warning',
              message: `Many loops detected in ${file.path}`,
              location: { file: file.path },
              suggestion: 'Consider optimizing template complexity'
            });
          }
        }

        return issues;
      }
    });

    // Best practices validation
    this.addValidationRule({
      id: 'best_practices',
      name: 'Best Practices',
      description: 'Validates adherence to template best practices',
      category: 'best-practice',
      severity: 'info',
      validate: (template) => {
        const issues: ValidationIssue[] = [];

        // Check for description
        if (!template.description) {
          issues.push({
            ruleId: 'best_practices',
            severity: 'info',
            message: 'Template should have a description',
            suggestion: 'Add a description to help users understand this template'
          });
        }

        // Check for author
        if (!template.author) {
          issues.push({
            ruleId: 'best_practices',
            severity: 'info',
            message: 'Template should have an author',
            suggestion: 'Add author information for attribution'
          });
        }

        // Check for tags
        if (!template.tags || template.tags.length === 0) {
          issues.push({
            ruleId: 'best_practices',
            severity: 'info',
            message: 'Template should have tags for categorization',
            suggestion: 'Add relevant tags to help users find this template'
          });
        }

        // Check variable naming
        for (const variable of template.variables) {
          if (variable.name.length < 3 || variable.name.length > 50) {
            issues.push({
              ruleId: 'best_practices',
              severity: 'info',
              message: `Variable name should be 3-50 characters: ${variable.name}`,
              location: { variable: variable.name },
              suggestion: 'Use descriptive but concise variable names'
            });
          }
        }

        return issues;
      }
    });
  }
}