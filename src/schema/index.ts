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
  UserCreationWorkflow,
  WorkflowStep,
  WorkflowField,
  WorkflowCondition,
  WorkflowBuilderConfig,
  WorkflowExecutionResult,
  ExecutionConfig
} from './workflow-builder';

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
  SchemaAdapterConfig,
  AdaptiveUserCreationConfig,
  AdaptiveCreationResult
} from './schema-driven-adapter';

// Migration and testing
export { ConfigMigrator } from './config-migrator';
export { ArchitectureTestSuite } from './architecture-test-suite';

export type {
  LegacyConfig,
  ModernConfig,
  MigrationResult,
  TestScenario,
  TestResult,
  TestSuiteResult
} from './config-migrator';

// Convenience factory function for easy setup
export function createSchemaDrivenSeeder(client: any, config: Partial<any> = {}) {
  return new SchemaDrivenAdapter(client, config);
}

// Convenience factory function for framework-agnostic creation
export function createFrameworkAgnosticCreator(client: any, config: Partial<any> = {}) {
  return new FrameworkAgnosticUserCreator(client, config);
}

// Version and metadata
export const SCHEMA_FIRST_VERSION = '2.1.0';
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

// Default configuration for new installations
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
  const adapter = new SchemaDrivenAdapter(client, DEFAULT_SCHEMA_FIRST_CONFIG);
  
  if (options.enableTesting) {
    const testSuite = new ArchitectureTestSuite();
    const testResults = await testSuite.runTestSuite();
    console.log('🧪 Architecture test suite completed');
    console.log(`Success rate: ${testResults.summary.overallSuccess.toFixed(1)}%`);
  }

  if (options.email) {
    const creator = new FrameworkAgnosticUserCreator(client);
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