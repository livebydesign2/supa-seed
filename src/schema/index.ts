/**
 * Schema-First Architecture - Main Integration Module
 * Exports all components of the new schema-driven approach
 * v2.1.0 - Complete architectural overhaul addressing beta tester feedback
 */

// Core schema introspection and analysis
export { SchemaIntrospector } from './schema-introspector';
export type {
  SchemaIntrospectionResult,
  DatabaseTable,
  DatabaseColumn,
  DatabaseConstraint,
  SchemaRelationship,
  TablePattern,
  ConstraintRule,
  SchemaRecommendation
} from './schema-introspector';

// Workflow building and execution
export { WorkflowBuilder } from './workflow-builder';
export { WorkflowExecutor } from './workflow-executor';
export type {
  UserCreationWorkflow as LegacyUserCreationWorkflow,
  WorkflowStep as LegacyWorkflowStep,
  WorkflowField,
  WorkflowCondition,
  WorkflowBuilderConfig
} from './workflow-builder';

export type {
  WorkflowExecutionResult,
  ExecutionConfig
} from './workflow-executor';

// Constraint validation
export { ConstraintValidator } from './constraint-validator';
export type {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  AutoFix
} from './constraint-validator';

// Dynamic column mapping
export { DynamicColumnMapper } from './dynamic-column-mapper';
export type {
  SemanticField,
  ColumnMapping,
  TableColumnMap,
  MappingRecommendation,
  MappingConfig
} from './dynamic-column-mapper';

// Relationship discovery
export { RelationshipDiscoverer } from './relationship-discoverer';
export type {
  RelationshipGraph,
  TableNode,
  RelationshipEdge,
  SeedingStrategy,
  RelationshipAnalysis
} from './relationship-discoverer';

// Main adapters and creators
export { SchemaDrivenAdapter } from './schema-driven-adapter';
export { FrameworkAgnosticUserCreator } from './framework-agnostic-user-creator';

export type {
  UserCreationRequest,
  UserCreationResponse,
  SchemaAdapterConfig
} from './schema-driven-adapter';

export type {
  AdaptiveUserCreationConfig,
  AdaptiveCreationResult
} from './framework-agnostic-user-creator';

// Migration and testing
export { ConfigMigrator } from './config-migrator';
export { ArchitectureTestSuite } from './architecture-test-suite';

export type {
  LegacyConfig,
  ModernConfig,
  MigrationResult
} from './config-migrator';

export type {
  TestScenario,
  TestResult,
  TestSuiteResult
} from './architecture-test-suite';

// v2.2.0: Constraint-aware architecture components
export { ConstraintDiscoveryEngine } from './constraint-discovery-engine';
export { ConstraintAwareExecutor } from './constraint-aware-executor';
export { WorkflowGenerator } from './workflow-generator';
export { V2_2_0_Migrator } from './v2-2-0-migrator';
export { ConstraintAwareTestSuite } from './constraint-aware-test-suite';

export type {
  // Constraint discovery types
  ConstraintMetadata,
  BusinessRule,
  AutoFixSuggestion,
  PostgreSQLFunction,
  PostgreSQLTrigger,
  TableDependency,
  DependencyGraph
} from './constraint-discovery-engine';

export type {
  // Workflow execution types from constraint-aware-executor
  WorkflowConfiguration,
  UserCreationWorkflow,
  WorkflowStep,
  ConstraintCondition,
  ExecutionResult,
  ConstraintViolation
} from './constraint-aware-executor';

export type {
  // Workflow generation types
  WorkflowGenerationOptions,
  GeneratedWorkflowMetadata
} from './workflow-generator';

export type {
  // v2.2.0 Migration types
  V2_2_0_Config,
  V2_2_0_MigrationOptions,
  V2_2_0_MigrationResult
} from './v2-2-0-migrator';

export type {
  // v2.2.0 Testing types
  TestScenario as V2_2_0_TestScenario,
  TestResult as V2_2_0_TestResult,
  TestSuiteResult as V2_2_0_TestSuiteResult,
  AssertionResult
} from './constraint-aware-test-suite';

export type {
  ExecutionContext,
  StepResult,
  AutoFixApplied,
  ExecutionSummary
} from './constraint-aware-executor';

// Import the actual classes to use in factory functions
import { SchemaDrivenAdapter } from './schema-driven-adapter';
import { FrameworkAgnosticUserCreator } from './framework-agnostic-user-creator';
import { ArchitectureTestSuite } from './architecture-test-suite';
import { ConstraintDiscoveryEngine } from './constraint-discovery-engine';
import { ConstraintAwareExecutor } from './constraint-aware-executor';
import { WorkflowGenerator } from './workflow-generator';
import { V2_2_0_Migrator } from './v2-2-0-migrator';
import { ConstraintAwareTestSuite } from './constraint-aware-test-suite';

// Convenience factory function for easy setup
export function createSchemaDrivenSeeder(client: any, config: Partial<any> = {}) {
  return new SchemaDrivenAdapter(client, config);
}

// Convenience factory function for framework-agnostic creation
export function createFrameworkAgnosticCreator(client: any, config: Partial<any> = {}) {
  return new FrameworkAgnosticUserCreator(client, config);
}

// v2.2.0: Convenience factory functions for constraint-aware architecture
export function createConstraintDiscoveryEngine(client: any) {
  return new ConstraintDiscoveryEngine(client);
}

export function createConstraintAwareExecutor(client: any) {
  return new ConstraintAwareExecutor(client);
}

export function createWorkflowGenerator(client: any) {
  return new WorkflowGenerator(client);
}

export function createV2_2_0_Migrator(client: any) {
  return new V2_2_0_Migrator(client);
}

export function createConstraintAwareTestSuite(client: any) {
  return new ConstraintAwareTestSuite(client);
}

// v2.2.0: All-in-one constraint-aware setup
export async function createConstraintAwareSeeder(client: any, options: {
  tableNames?: string[],
  generationOptions?: Partial<any>
} = {}) {
  const generator = new WorkflowGenerator(client);
  const executor = new ConstraintAwareExecutor(client);
  
  const tableNames = options.tableNames || ['profiles', 'accounts', 'users'];
  const generationOptions = {
    userCreationStrategy: 'adaptive',
    constraintHandling: 'auto_fix',
    generateOptionalSteps: true,
    includeDependencyCreation: true,
    enableAutoFixes: true,
    ...options.generationOptions
  };

  const { configuration, metadata } = await generator.generateWorkflowConfiguration(
    tableNames,
    generationOptions as any
  );

  return {
    generator,
    executor,
    configuration,
    metadata,
    async createUser(userData: any) {
      return executor.executeWorkflow(configuration.workflows.userCreation, userData);
    }
  };
}

// Version and metadata
export const CURRENT_VERSION = '2.4.2';
export const CONSTRAINT_AWARE_VERSION = '2.2.0';
export const SCHEMA_FIRST_VERSION = '2.1.0'; // Maintained for compatibility

export const V2_2_0_MIGRATION_NOTES = {
  from: '2.1.0',
  to: '2.2.0',
  majorFeatures: [
    'Deep PostgreSQL constraint discovery and parsing',
    'Business logic rule extraction from triggers and functions',
    'Constraint-aware workflow execution engine',
    'Pre-execution constraint validation system',
    'Automatic constraint violation detection and fixing',
    'Configurable workflow generation from discovered constraints',
    'Dependency graph analysis for proper operation ordering'
  ],
  architecturalChanges: [
    'Added ConstraintDiscoveryEngine for PostgreSQL function/trigger parsing',
    'Created ConstraintAwareExecutor for validated workflow execution',
    'Built WorkflowGenerator for dynamic workflow creation from constraints',
    'Enhanced SchemaIntrospector with deep constraint discovery',
    'Implemented auto-fix suggestion and application system'
  ],
  coreImprovements: [
    'Eliminates constraint violations at runtime through pre-validation',
    'Automatically discovers and respects PostgreSQL business logic',
    'Generates workflows that adapt to any schema structure',
    'Provides actionable auto-fix suggestions for constraint violations',
    'Supports configurable constraint handling strategies'
  ],
  betaTesterIssuesResolved: [
    'Fixed "Profiles can only be created for personal accounts" MakerKit constraint',
    'Eliminated hardcoded business logic assumptions entirely',
    'Added comprehensive constraint-aware user creation workflows',
    'Implemented automatic dependency creation and validation',
    'Built framework-agnostic constraint discovery for any PostgreSQL schema'
  ]
};

// Legacy v2.1.0 migration notes (maintained for compatibility)
export const MIGRATION_NOTES = {
  from: '2.0.5',
  to: '2.1.0',
  changes: [
    'Replaced hardcoded framework assumptions with dynamic schema introspection',
    'Added constraint-aware validation and execution',
    'Implemented intelligent column mapping with fuzzy matching',
    'Added framework-agnostic user creation with fallback strategies',
    'Introduced relationship discovery for proper foreign key handling',
    'Created migration system for smooth upgrade from legacy configs',
    'Built comprehensive test suite for multiple MakerKit variants'
  ],
  betaTesterIssuesAddressed: [
    'Fixed hardcoded business logic assumptions',
    'Eliminated "whack-a-mole" pattern of individual column fixes',
    'Added constraint validation to prevent "personal account" errors',
    'Implemented schema-discovery-based workflow generation',
    'Enabled framework-agnostic operation for any MakerKit variant'
  ]
};

// v2.2.0: Default configuration for constraint-aware architecture
export const DEFAULT_CONSTRAINT_AWARE_CONFIG = {
  version: '2.2.0',
  strategy: 'constraint-aware',
  seeding: {
    enableSchemaIntrospection: true,
    enableConstraintValidation: true,
    enableAutoFixes: true,
    enableProgressiveEnhancement: true,
    enableGracefulDegradation: true,
    // v2.2.0: New constraint-aware settings
    enableDeepConstraintDiscovery: true,
    enableBusinessLogicParsing: true,
    enableWorkflowGeneration: true
  },
  schema: {
    autoDetectFramework: true,
    columnMapping: {
      enableDynamicMapping: true,
      enableFuzzyMatching: true,
      enablePatternMatching: true,
      minimumConfidence: 0.3
    },
    constraints: {
      enableValidation: true,
      enableAutoFixes: true,
      createDependenciesOnDemand: true,
      // v2.2.0: Enhanced constraint handling
      enableDeepDiscovery: true,
      parseTriggerFunctions: true,
      buildDependencyGraph: true,
      preValidateOperations: true
    },
    relationships: {
      enableDiscovery: true,
      respectForeignKeys: true,
      handleCircularDependencies: true,
      enableParallelSeeding: true
    }
  },
  execution: {
    enableRollback: true,
    maxRetries: 3,
    timeoutMs: 30000,
    enableCaching: true,
    cacheTimeout: 30,
    // v2.2.0: Constraint-aware execution settings
    constraintValidationStrategy: 'pre_execution',
    errorHandlingStrategy: 'graceful_degradation',
    autoFixStrategy: 'aggressive'
  },
  compatibility: {
    enableLegacyMode: false,
    legacyFallbacks: ['simple_profiles', 'accounts_only', 'auth_only'],
    // v2.2.0: Maintain v2.1.0 compatibility
    supportSchemaFirstMode: true,
    enableV2_1_0_Fallback: true
  }
};

// Legacy v2.1.0 configuration (maintained for compatibility)
export const DEFAULT_SCHEMA_FIRST_CONFIG = {
  version: '2.1.0',
  seeding: {
    enableSchemaIntrospection: true,
    enableConstraintValidation: true,
    enableAutoFixes: true,
    enableProgressiveEnhancement: true,
    enableGracefulDegradation: true
  },
  schema: {
    autoDetectFramework: true,
    columnMapping: {
      enableDynamicMapping: true,
      enableFuzzyMatching: true,
      enablePatternMatching: true,
      minimumConfidence: 0.3
    },
    constraints: {
      enableValidation: true,
      enableAutoFixes: true,
      createDependenciesOnDemand: true
    },
    relationships: {
      enableDiscovery: true,
      respectForeignKeys: true,
      handleCircularDependencies: true,
      enableParallelSeeding: true
    }
  },
  execution: {
    enableRollback: true,
    maxRetries: 3,
    timeoutMs: 30000,
    enableCaching: true,
    cacheTimeout: 30
  },
  compatibility: {
    enableLegacyMode: false,
    legacyFallbacks: ['simple_profiles', 'accounts_only', 'auth_only']
  }
};

/**
 * Quick start function for immediate use
 * Automatically configures the best settings based on database analysis
 */
export async function quickStart(client: any, options: {
  userCount?: number;
  email?: string;
  enableTesting?: boolean;
} = {}): Promise<any> {
  const adapter = new SchemaDrivenAdapter(client, DEFAULT_SCHEMA_FIRST_CONFIG as any);
  
  if (options.enableTesting) {
    const testSuite = new ArchitectureTestSuite();
    const testResults = await testSuite.runTestSuite();
    console.log('🧪 Architecture test suite completed');
    console.log(`Success rate: ${testResults.summary.overallSuccess.toFixed(1)}%`);
  }

  if (options.email) {
    const creator = new FrameworkAgnosticUserCreator(client, {});
    const result = await creator.createUser({
      email: options.email,
      name: 'Test User',
      username: 'testuser'
    });
    
    return {
      adapter,
      userCreationResult: result,
      recommendations: [
        'Schema-first architecture is now active',
        'All hardcoded assumptions have been replaced with dynamic discovery',
        'Constraint validation is enabled to prevent seeding errors',
        'Framework-agnostic operation supports any MakerKit variant'
      ]
    };
  }

  return {
    adapter,
    recommendations: [
      'Use adapter.createUser() for schema-aware user creation',
      'Enable constraint validation to prevent errors',
      'Use framework-agnostic creator for maximum compatibility'
    ]
  };
}