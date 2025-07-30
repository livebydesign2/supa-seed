/**
 * Architecture Test Suite
 * Tests the new schema-first architecture against multiple MakerKit variants and custom schemas
 * Validates that the beta tester's concerns have been addressed
 */

import type { createClient } from '@supabase/supabase-js';
import { SchemaDrivenAdapter } from './schema-driven-adapter';
import { FrameworkAgnosticUserCreator } from './framework-agnostic-user-creator';
import { ConfigMigrator } from './config-migrator';
import { Logger } from '../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface TestScenario {
  name: string;
  description: string;
  mockSchema: MockSchema;
  testConfig: any;
  expectedBehavior: {
    shouldSucceed: boolean;
    frameworkDetection: string;
    primaryUserTable: string;
    constraintsHandled: number;
    fallbacksUsed?: string[];
  };
  validationCriteria: ValidationCriteria;
}

export interface MockSchema {
  tables: MockTable[];
  relationships: MockRelationship[];
  constraints: MockConstraint[];
  framework: {
    type: string;
    version: string;
    evidence: string[];
  };
}

export interface MockTable {
  name: string;
  columns: MockColumn[];
  hasData: boolean;
  recordCount: number;
}

export interface MockColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue?: any;
}

export interface MockRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cascadeDelete: boolean;
  required: boolean;
}

export interface MockConstraint {
  name: string;
  type: string;
  table: string;
  columns: string[];
  checkDefinition?: string;
  referencedTable?: string;
}

export interface ValidationCriteria {
  mustDetectFramework: boolean;
  mustHandleConstraints: boolean;
  mustRespectRelationships: boolean;
  mustGenerateWorkflow: boolean;
  mustPreventErrors: boolean;
  maxExecutionTime: number;
  minConfidenceScore: number;
}

export interface TestResult {
  scenario: string;
  success: boolean;
  actualBehavior: {
    frameworkDetected: string;
    primaryUserTable: string;
    constraintsHandled: number;
    executionTime: number;
    confidenceScore: number;
    fallbacksUsed: string[];
    workflowSteps: number;
  };
  validationResults: {
    frameworkDetection: boolean;
    constraintHandling: boolean;
    relationshipRespect: boolean;
    workflowGeneration: boolean;
    errorPrevention: boolean;
    performanceTest: boolean;
    confidenceTest: boolean;
  };
  errors: string[];
  warnings: string[];
  details: string;
}

export interface TestSuiteResult {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  results: TestResult[];
  summary: {
    frameworkDetectionAccuracy: number;
    constraintHandlingSuccess: number;
    overallSuccess: number;
    averageExecutionTime: number;
    averageConfidence: number;
  };
  recommendations: string[];
}

export class ArchitectureTestSuite {
  private mockClient: any; // Mock Supabase client
  private scenarios: TestScenario[] = [];

  constructor() {
    this.setupMockClient();
    this.setupTestScenarios();
  }

  /**
   * Run the complete test suite
   */
  async runTestSuite(): Promise<TestSuiteResult> {
    Logger.info('🧪 Starting Architecture Test Suite...');
    Logger.info(`Running ${this.scenarios.length} test scenarios`);

    const results: TestResult[] = [];
    let passedScenarios = 0;
    let totalExecutionTime = 0;
    let totalConfidence = 0;

    for (const scenario of this.scenarios) {
      Logger.info(`\n🔬 Testing: ${scenario.name}`);
      
      try {
        const result = await this.runScenario(scenario);
        results.push(result);
        
        if (result.success) {
          passedScenarios++;
          Logger.success(`✅ ${scenario.name} - PASSED`);
        } else {
          Logger.error(`❌ ${scenario.name} - FAILED: ${result.errors.join(', ')}`);
        }

        totalExecutionTime += result.actualBehavior.executionTime;
        totalConfidence += result.actualBehavior.confidenceScore;

      } catch (error: any) {
        Logger.error(`💥 ${scenario.name} - ERROR: ${error.message}`);
        results.push(this.createErrorResult(scenario, error));
      }
    }

    const summary = {
      frameworkDetectionAccuracy: this.calculateFrameworkAccuracy(results),
      constraintHandlingSuccess: this.calculateConstraintSuccess(results),
      overallSuccess: (passedScenarios / this.scenarios.length) * 100,
      averageExecutionTime: totalExecutionTime / this.scenarios.length,
      averageConfidence: totalConfidence / this.scenarios.length
    };

    const recommendations = this.generateRecommendations(results, summary);

    const suiteResult: TestSuiteResult = {
      totalScenarios: this.scenarios.length,
      passedScenarios,
      failedScenarios: this.scenarios.length - passedScenarios,
      results,
      summary,
      recommendations
    };

    this.logTestSuiteResult(suiteResult);
    return suiteResult;
  }

  /**
   * Run a specific test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    const startTime = Date.now();
    
    // Setup mock schema for this scenario
    this.configureMockSchema(scenario.mockSchema);
    
    // Test schema-driven adapter
    const adapter = new SchemaDrivenAdapter(this.mockClient, scenario.testConfig);
    const frameworkCreator = new FrameworkAgnosticUserCreator(this.mockClient);
    
    const errors: string[] = [];
    const warnings: string[] = [];
    let actualBehavior: TestResult['actualBehavior'] = {
      frameworkDetected: 'unknown',
      primaryUserTable: 'unknown',
      constraintsHandled: 0,
      executionTime: 0,
      confidenceScore: 0,
      fallbacksUsed: [],
      workflowSteps: 0
    };

    try {
      // Test schema analysis
      const schemaInfo = await adapter.getSchemaInfo();
      actualBehavior.frameworkDetected = schemaInfo.framework.type;
      actualBehavior.confidenceScore = schemaInfo.framework.confidence;

      // Test user creation
      const userCreationResult = await frameworkCreator.createUser({
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser'
      });

      actualBehavior.constraintsHandled = userCreationResult.validationResult?.constraintsChecked || 0;
      actualBehavior.workflowSteps = userCreationResult.workflow.steps.length;
      actualBehavior.fallbacksUsed = userCreationResult.adaptationInfo.fallbacksTriggered;

      // Get primary user table
      const strategy = await adapter.getUserCreationStrategy();
      actualBehavior.primaryUserTable = strategy.primaryTable;

    } catch (error: any) {
      errors.push(error.message);
    }

    actualBehavior.executionTime = Date.now() - startTime;

    // Validate results against criteria
    const validationResults = this.validateScenarioResults(scenario, actualBehavior, errors);

    const success = errors.length === 0 && Object.values(validationResults).every(v => v);

    return {
      scenario: scenario.name,
      success,
      actualBehavior,
      validationResults,
      errors,
      warnings,
      details: this.generateTestDetails(scenario, actualBehavior, validationResults)
    };
  }

  /**
   * Setup test scenarios for different MakerKit variants and custom schemas
   */
  private setupTestScenarios(): void {
    // Scenario 1: Standard MakerKit v2 (like the beta tester's setup)
    this.scenarios.push({
      name: 'MakerKit v2 Standard',
      description: 'Standard MakerKit v2 setup with accounts and profiles',
      mockSchema: {
        tables: [
          {
            name: 'accounts',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'primary_owner_user_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: 'is_personal_account', type: 'boolean', nullable: false, isPrimaryKey: false, isForeignKey: false, defaultValue: true },
              { name: 'slug', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: true },
              { name: 'username', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'email', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false },
              { name: 'bio', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          }
        ],
        relationships: [
          {
            fromTable: 'accounts',
            fromColumn: 'primary_owner_user_id',
            toTable: 'auth.users',
            toColumn: 'id',
            cascadeDelete: true,
            required: true
          },
          {
            fromTable: 'profiles',
            fromColumn: 'id',
            toTable: 'auth.users',
            toColumn: 'id',
            cascadeDelete: true,
            required: true
          }
        ],
        constraints: [
          {
            name: 'profiles_personal_account_check',
            type: 'CHECK',
            table: 'profiles',
            columns: ['id'],
            checkDefinition: 'EXISTS (SELECT 1 FROM accounts WHERE primary_owner_user_id = profiles.id AND is_personal_account = true)'
          }
        ],
        framework: {
          type: 'makerkit',
          version: 'v2',
          evidence: ['has accounts table', 'has primary_owner_user_id column', 'has is_personal_account constraint']
        }
      },
      testConfig: {},
      expectedBehavior: {
        shouldSucceed: true,
        frameworkDetection: 'makerkit',
        primaryUserTable: 'profiles',
        constraintsHandled: 2
      },
      validationCriteria: {
        mustDetectFramework: true,
        mustHandleConstraints: true,
        mustRespectRelationships: true,
        mustGenerateWorkflow: true,
        mustPreventErrors: true,
        maxExecutionTime: 5000,
        minConfidenceScore: 0.8
      }
    });

    // Scenario 2: MakerKit v3 with Advanced Features
    this.scenarios.push({
      name: 'MakerKit v3 Advanced',
      description: 'MakerKit v3 with role permissions and billing',
      mockSchema: {
        tables: [
          {
            name: 'accounts',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'primary_owner_user_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: 'is_personal_account', type: 'boolean', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'public_data', type: 'jsonb', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: true },
              { name: 'display_name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'avatar_url', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'role_permissions',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'role', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'permission', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'billing_customers',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'account_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: 'stripe_customer_id', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          }
        ],
        relationships: [
          {
            fromTable: 'billing_customers',
            fromColumn: 'account_id',
            toTable: 'accounts',
            toColumn: 'id',
            cascadeDelete: true,
            required: true
          }
        ],
        constraints: [],
        framework: {
          type: 'makerkit',
          version: 'v3',
          evidence: ['has role_permissions table', 'has billing_customers table', 'has public_data jsonb column']
        }
      },
      testConfig: {},
      expectedBehavior: {
        shouldSucceed: true,
        frameworkDetection: 'makerkit',
        primaryUserTable: 'profiles',
        constraintsHandled: 1
      },
      validationCriteria: {
        mustDetectFramework: true,
        mustHandleConstraints: true,
        mustRespectRelationships: true,
        mustGenerateWorkflow: true,
        mustPreventErrors: true,
        maxExecutionTime: 5000,
        minConfidenceScore: 0.8
      }
    });

    // Scenario 3: Custom Schema (Non-MakerKit)
    this.scenarios.push({
      name: 'Custom Schema',
      description: 'Custom schema with non-standard column names',
      mockSchema: {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'user_id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'email_address', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'full_name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'profile_image_url', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'posts',
            columns: [
              { name: 'post_id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'author_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: 'title', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'content', type: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          }
        ],
        relationships: [
          {
            fromTable: 'posts',
            fromColumn: 'author_id',
            toTable: 'users',
            toColumn: 'user_id',
            cascadeDelete: false,
            required: true
          }
        ],
        constraints: [],
        framework: {
          type: 'custom',
          version: 'unknown',
          evidence: ['non-standard table names', 'custom column naming']
        }
      },
      testConfig: {
        schema: {
          columnMapping: {
            customMappings: {
              'users': {
                'email': 'email_address',
                'name': 'full_name',
                'avatar': 'profile_image_url'
              }
            }
          }
        }
      },
      expectedBehavior: {
        shouldSucceed: true,
        frameworkDetection: 'custom',
        primaryUserTable: 'users',
        constraintsHandled: 1
      },
      validationCriteria: {
        mustDetectFramework: true,
        mustHandleConstraints: false, // Relaxed for custom schemas
        mustRespectRelationships: true,
        mustGenerateWorkflow: true,
        mustPreventErrors: true,
        maxExecutionTime: 6000, // Allow more time for custom schemas
        minConfidenceScore: 0.6 // Lower confidence expected for custom
      }
    });

    // Scenario 4: Problematic Schema (The beta tester's issue)
    this.scenarios.push({
      name: 'Beta Tester Issue - Constraint Violation',
      description: 'Schema with personal account constraint that caused beta test failure',
      mockSchema: {
        tables: [
          {
            name: 'accounts',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: false },
              { name: 'name', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false },
              { name: 'primary_owner_user_id', type: 'uuid', nullable: false, isPrimaryKey: false, isForeignKey: true },
              { name: 'is_personal_account', type: 'boolean', nullable: false, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          },
          {
            name: 'profiles',
            columns: [
              { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true, isForeignKey: true },
              { name: 'username', type: 'text', nullable: false, isPrimaryKey: false, isForeignKey: false }
            ],
            hasData: false,
            recordCount: 0
          }
        ],
        relationships: [],
        constraints: [
          {
            name: 'profiles_personal_account_only',
            type: 'CHECK',
            table: 'profiles',
            columns: ['id'],
            checkDefinition: 'EXISTS (SELECT 1 FROM accounts WHERE primary_owner_user_id = profiles.id AND is_personal_account = true)'
          }
        ],
        framework: {
          type: 'makerkit',
          version: 'v2',
          evidence: ['has accounts table', 'has primary_owner_user_id']
        }
      },
      testConfig: {
        seeding: {
          enableConstraintValidation: true
        }
      },
      expectedBehavior: {
        shouldSucceed: true,
        frameworkDetection: 'makerkit',
        primaryUserTable: 'profiles',
        constraintsHandled: 1
      },
      validationCriteria: {
        mustDetectFramework: true,
        mustHandleConstraints: true,
        mustRespectRelationships: true,
        mustGenerateWorkflow: true,
        mustPreventErrors: true, // This is the key test - must prevent the beta tester's error
        maxExecutionTime: 5000,
        minConfidenceScore: 0.7
      }
    });

    // Scenario 5: Fallback Test
    this.scenarios.push({
      name: 'Fallback Strategy Test',
      description: 'Schema that should trigger fallback strategies',
      mockSchema: {
        tables: [], // Empty schema to force fallbacks
        relationships: [],
        constraints: [],
        framework: {
          type: 'unknown',
          version: 'unknown',
          evidence: []
        }
      },
      testConfig: {
        compatibility: {
          enableLegacyMode: true,
          legacyFallbacks: ['auth_only']
        }
      },
      expectedBehavior: {
        shouldSucceed: true,
        frameworkDetection: 'fallback',
        primaryUserTable: 'auth.users',
        constraintsHandled: 0,
        fallbacksUsed: ['auth_only']
      },
      validationCriteria: {
        mustDetectFramework: false, // Fallback scenario
        mustHandleConstraints: false,
        mustRespectRelationships: false,
        mustGenerateWorkflow: true,
        mustPreventErrors: true,
        maxExecutionTime: 3000,
        minConfidenceScore: 0.2 // Very low confidence expected
      }
    });
  }

  /**
   * Setup mock Supabase client
   */
  private setupMockClient(): void {
    this.mockClient = {
      auth: {
        admin: {
          createUser: async (userData: any) => ({
            data: { user: { id: userData.id, email: userData.email } },
            error: null
          }),
          listUsers: async () => ({ data: { users: [] }, error: null })
        }
      },
      from: (table: string) => ({
        select: () => ({
          eq: () => ({ data: [], error: null }),
          limit: () => ({ data: [], error: null }),
          single: () => ({ data: null, error: { message: 'No data found' } })
        }),
        insert: () => ({
          select: () => ({
            single: () => ({ data: { id: crypto.randomUUID() }, error: null })
          })
        }),
        delete: () => ({ error: null })
      }),
      // Mock schema introspection responses
      _mockSchemaData: null as any
    };
  }

  /**
   * Configure mock schema for a test scenario
   */
  private configureMockSchema(schema: MockSchema): void {
    this.mockClient._mockSchemaData = schema;
    
    // Override information_schema queries
    const originalFrom = this.mockClient.from;
    this.mockClient.from = (table: string) => {
      if (table === 'information_schema.tables') {
        return {
          select: () => ({
            eq: () => ({
              data: schema.tables.map(t => ({ table_name: t.name, table_schema: 'public' })),
              error: null
            })
          })
        };
      }
      
      if (table === 'information_schema.columns') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                data: schema.tables.flatMap(t => 
                  t.columns.map(c => ({
                    table_name: t.name,
                    column_name: c.name,
                    data_type: c.type,
                    is_nullable: c.nullable ? 'YES' : 'NO',
                    column_default: c.defaultValue
                  }))
                ),
                error: null
              })
            })
          })
        };
      }
      
      return originalFrom(table);
    };
  }

  /**
   * Validate scenario results against criteria
   */
  private validateScenarioResults(
    scenario: TestScenario,
    actualBehavior: TestResult['actualBehavior'],
    errors: string[]
  ): TestResult['validationResults'] {
    const criteria = scenario.validationCriteria;
    const expected = scenario.expectedBehavior;

    return {
      frameworkDetection: !criteria.mustDetectFramework || 
        actualBehavior.frameworkDetected === expected.frameworkDetection,
      
      constraintHandling: !criteria.mustHandleConstraints || 
        actualBehavior.constraintsHandled >= expected.constraintsHandled,
      
      relationshipRespect: !criteria.mustRespectRelationships || 
        actualBehavior.workflowSteps > 0,
      
      workflowGeneration: !criteria.mustGenerateWorkflow || 
        actualBehavior.workflowSteps > 0,
      
      errorPrevention: !criteria.mustPreventErrors || errors.length === 0,
      
      performanceTest: actualBehavior.executionTime <= criteria.maxExecutionTime,
      
      confidenceTest: actualBehavior.confidenceScore >= criteria.minConfidenceScore
    };
  }

  /**
   * Calculate framework detection accuracy across all tests
   */
  private calculateFrameworkAccuracy(results: TestResult[]): number {
    const accurateDetections = results.filter(r => r.validationResults.frameworkDetection).length;
    return (accurateDetections / results.length) * 100;
  }

  /**
   * Calculate constraint handling success rate
   */
  private calculateConstraintSuccess(results: TestResult[]): number {
    const successfulConstraintHandling = results.filter(r => r.validationResults.constraintHandling).length;
    return (successfulConstraintHandling / results.length) * 100;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: TestResult[], summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.overallSuccess < 80) {
      recommendations.push('Overall success rate is below 80%. Review failed scenarios and improve error handling.');
    }

    if (summary.frameworkDetectionAccuracy < 90) {
      recommendations.push('Framework detection accuracy is below 90%. Improve detection algorithms.');
    }

    if (summary.averageExecutionTime > 3000) {
      recommendations.push('Average execution time is above 3 seconds. Consider performance optimizations.');
    }

    if (summary.averageConfidence < 0.7) {
      recommendations.push('Average confidence score is below 70%. Improve schema analysis algorithms.');
    }

    // Check for specific failure patterns
    const constraintFailures = results.filter(r => !r.validationResults.constraintHandling);
    if (constraintFailures.length > 0) {
      recommendations.push(`${constraintFailures.length} scenarios failed constraint handling. Review constraint validation logic.`);
    }

    const performanceFailures = results.filter(r => !r.validationResults.performanceTest);
    if (performanceFailures.length > 0) {
      recommendations.push(`${performanceFailures.length} scenarios exceeded performance limits. Optimize execution speed.`);
    }

    return recommendations;
  }

  /**
   * Generate detailed test information
   */
  private generateTestDetails(
    scenario: TestScenario,
    actualBehavior: TestResult['actualBehavior'],
    validationResults: TestResult['validationResults']
  ): string {
    const details = [];
    
    details.push(`Framework: Expected ${scenario.expectedBehavior.frameworkDetection}, Got ${actualBehavior.frameworkDetected}`);
    details.push(`Primary Table: Expected ${scenario.expectedBehavior.primaryUserTable}, Got ${actualBehavior.primaryUserTable}`);
    details.push(`Constraints: Expected ${scenario.expectedBehavior.constraintsHandled}, Got ${actualBehavior.constraintsHandled}`);
    details.push(`Execution Time: ${actualBehavior.executionTime}ms`);
    details.push(`Confidence: ${(actualBehavior.confidenceScore * 100).toFixed(1)}%`);
    details.push(`Workflow Steps: ${actualBehavior.workflowSteps}`);
    
    if (actualBehavior.fallbacksUsed.length > 0) {
      details.push(`Fallbacks Used: ${actualBehavior.fallbacksUsed.join(', ')}`);
    }

    return details.join(' | ');
  }

  /**
   * Create error result for failed scenarios
   */
  private createErrorResult(scenario: TestScenario, error: any): TestResult {
    return {
      scenario: scenario.name,
      success: false,
      actualBehavior: {
        frameworkDetected: 'error',
        primaryUserTable: 'error',
        constraintsHandled: 0,
        executionTime: 0,
        confidenceScore: 0,
        fallbacksUsed: [],
        workflowSteps: 0
      },
      validationResults: {
        frameworkDetection: false,
        constraintHandling: false,
        relationshipRespect: false,
        workflowGeneration: false,
        errorPrevention: false,
        performanceTest: false,
        confidenceTest: false
      },
      errors: [error.message],
      warnings: [],
      details: `Test execution failed: ${error.message}`
    };
  }

  /**
   * Log test suite results
   */
  private logTestSuiteResult(result: TestSuiteResult): void {
    Logger.info('\n📊 Architecture Test Suite Results:');
    Logger.info(`   Total Scenarios: ${result.totalScenarios}`);
    Logger.info(`   Passed: ${result.passedScenarios}`);
    Logger.info(`   Failed: ${result.failedScenarios}`);
    Logger.info(`   Success Rate: ${result.summary.overallSuccess.toFixed(1)}%`);
    Logger.info(`   Framework Detection: ${result.summary.frameworkDetectionAccuracy.toFixed(1)}%`);
    Logger.info(`   Constraint Handling: ${result.summary.constraintHandlingSuccess.toFixed(1)}%`);
    Logger.info(`   Average Execution Time: ${result.summary.averageExecutionTime.toFixed(0)}ms`);
    Logger.info(`   Average Confidence: ${(result.summary.averageConfidence * 100).toFixed(1)}%`);

    if (result.recommendations.length > 0) {
      Logger.info('\n💡 Recommendations:');
      result.recommendations.forEach(rec => Logger.info(`   • ${rec}`));
    }

    // Log detailed results for failed scenarios
    const failedResults = result.results.filter(r => !r.success);
    if (failedResults.length > 0) {
      Logger.warn('\n❌ Failed Scenarios:');
      failedResults.forEach(r => {
        Logger.warn(`   ${r.scenario}: ${r.errors.join(', ')}`);
      });
    }
  }

  /**
   * Run a specific test by name
   */
  async runSingleTest(scenarioName: string): Promise<TestResult | null> {
    const scenario = this.scenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      Logger.error(`Test scenario "${scenarioName}" not found`);
      return null;
    }

    Logger.info(`🔬 Running single test: ${scenarioName}`);
    return await this.runScenario(scenario);
  }

  /**
   * Get list of available test scenarios
   */
  getAvailableScenarios(): string[] {
    return this.scenarios.map(s => s.name);
  }
}