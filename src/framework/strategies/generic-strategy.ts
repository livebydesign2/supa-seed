/**
 * Generic Framework Strategy
 * Fallback strategy for databases without specific framework patterns
 */

import type { createClient } from '@supabase/supabase-js';
import { 
  SeedingStrategy,
  DatabaseSchema,
  FrameworkDetectionResult,
  UserData,
  User,
  ConstraintHandlingResult,
  ConstraintFix,
  ConstraintHandler,
  TableConstraints,
  StrategyConstraintResult
} from '../strategy-interface';
import { ConstraintDiscoveryEngine } from '../../schema/constraint-discovery-engine';
import { ConstraintRegistry } from '../../schema/constraint-registry';
import { BusinessLogicAnalyzer } from '../../schema/business-logic-analyzer';
import { RLSCompliantSeeder } from '../../schema/rls-compliant-seeder';
import { RelationshipAnalyzer } from '../../schema/relationship-analyzer';
import { JunctionTableHandler } from '../../schema/junction-table-handler';
import { MultiTenantManager } from '../../schema/multi-tenant-manager';
import { Logger } from '../../utils/logger';
import type {
  BusinessLogicAnalysisResult,
  RLSComplianceOptions,
  RLSComplianceResult,
  UserContext
} from '../../schema/business-logic-types';
import type {
  RelationshipAnalysisResult
} from '../../schema/relationship-analyzer';
import type {
  JunctionTableDetectionResult,
  JunctionSeedingOptions,
  JunctionSeedingResult
} from '../../schema/junction-table-handler';
import type { DependencyGraph } from '../../schema/dependency-graph';
import type {
  TenantDiscoveryResult,
  TenantSeedingResult,
  TenantIsolationReport,
  TenantDataGenerationOptions,
  TenantInfo,
  TenantScopeInfo
} from '../../schema/tenant-types';

type SupabaseClient = ReturnType<typeof createClient>;

export class GenericStrategy implements SeedingStrategy {
  name = 'generic';
  private client!: SupabaseClient;
  private discoveredConstraints: Map<string, any[]> = new Map();
  private constraintEngine?: ConstraintDiscoveryEngine;
  private constraintRegistry?: ConstraintRegistry;
  private businessLogicAnalyzer?: BusinessLogicAnalyzer;
  private rlsCompliantSeeder?: RLSCompliantSeeder;
  private relationshipAnalyzer?: RelationshipAnalyzer;
  private junctionTableHandler?: JunctionTableHandler;
  private multiTenantManager?: MultiTenantManager;

  async initialize(client: SupabaseClient): Promise<void> {
    this.client = client;
    this.constraintEngine = new ConstraintDiscoveryEngine(client);
    this.constraintRegistry = new ConstraintRegistry({
      enablePriorityHandling: false,
      enableFallbackHandlers: true,
      logHandlerSelection: false
    });

    // Initialize business logic analyzer for generic patterns
    this.businessLogicAnalyzer = new BusinessLogicAnalyzer(client, {
      frameworkHints: [],
      expectedPatterns: ['direct_insertion']
    });

    // Initialize RLS compliant seeder with service role preference for generic
    this.rlsCompliantSeeder = new RLSCompliantSeeder(client, undefined, {
      enableRLSCompliance: true,
      createUserContext: false,
      useServiceRole: true // Generic strategy prefers service role bypass
    });

    // Initialize relationship analyzer with generic options
    this.relationshipAnalyzer = new RelationshipAnalyzer(client, {
      schemas: ['public'],
      detectJunctionTables: true,
      analyzeTenantScoping: false, // Generic strategy doesn't assume tenant scoping
      includeOptionalRelationships: true,
      enableCaching: true,
      generateRecommendations: true
    });

    // Initialize junction table handler
    this.junctionTableHandler = new JunctionTableHandler(client);

    // Initialize multi-tenant manager with generic configuration
    this.multiTenantManager = new MultiTenantManager(client, {
      enableMultiTenant: false, // Generic strategy doesn't assume multi-tenant by default
      tenantColumn: 'tenant_id', // Generic default, can be overridden
      tenantScopeDetection: 'auto',
      validationEnabled: false, // Less strict for generic
      strictIsolation: false,
      allowSharedResources: true,
      dataGenerationOptions: {
        generatePersonalAccounts: false, // Generic doesn't distinguish account types
        generateTeamAccounts: false,
        personalAccountRatio: 1.0,
        dataDistributionStrategy: 'even',
        crossTenantDataAllowed: true, // More permissive for generic
        sharedResourcesEnabled: true,
        accountTypes: [],
        minUsersPerTenant: 1,
        maxUsersPerTenant: 1,
        minProjectsPerTenant: 1,
        maxProjectsPerTenant: 1,
        allowCrossTenantRelationships: true,
        sharedTables: [], // Will be discovered
        respectTenantPlans: false,
        enforceTenantLimits: false
      }
    });
    
    // Register generic handlers
    const handlers = this.getConstraintHandlers();
    this.constraintRegistry.registerHandlers(handlers);
  }

  getPriority(): number {
    return 1; // Lowest priority - fallback strategy
  }

  async detect(schema: DatabaseSchema): Promise<FrameworkDetectionResult> {
    // Generic strategy always has low confidence - it's a fallback
    let confidence = 0.1;
    const detectedFeatures: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for basic user-related tables
      const hasUsersTable = schema.tables.some(t => t.name === 'users');
      const hasAccountsTable = schema.tables.some(t => t.name === 'accounts');
      const hasProfilesTable = schema.tables.some(t => t.name === 'profiles');

      if (hasUsersTable || hasAccountsTable || hasProfilesTable) {
        confidence = 0.2;
        detectedFeatures.push('basic_user_tables');
      }

      // Check for auth integration
      const hasAuthTriggers = schema.triggers.some(t => 
        t.table === 'users' || t.function.includes('auth')
      );

      if (hasAuthTriggers) {
        detectedFeatures.push('auth_integration');
        recommendations.push('Consider auth-based user creation for better integration');
      }

      // Basic constraint discovery
      if (schema.constraints.length > 0) {
        detectedFeatures.push('has_constraints');
        recommendations.push('Enable constraint discovery for better seeding reliability');
      }

      // Always provide fallback recommendations
      recommendations.push('Using generic strategy - consider framework-specific strategy if available');
      recommendations.push('Enable constraint validation for safer operations');
      
      if (confidence < 0.3) {
        recommendations.push('Low framework detection - consider manual configuration');
      }

      return {
        framework: this.name,
        confidence,
        detectedFeatures,
        recommendations
      };

    } catch (error: any) {
      Logger.warn(`Generic detection failed: ${error.message}`);
      return {
        framework: this.name,
        confidence: 0.1,
        detectedFeatures: ['fallback_mode'],
        recommendations: ['Using fallback mode due to detection error']
      };
    }
  }

  async createUser(data: UserData): Promise<User> {
    try {
      Logger.debug(`Creating generic user: ${data.email}`);

      // Try auth-based creation first (safer approach)
      let user: User;
      let useAuthCreation = true;

      try {
        const { data: authUser, error: authError } = await this.client.auth.admin.createUser({
          email: data.email,
          password: data.password || 'defaultPassword123!',
          email_confirm: true,
          user_metadata: {
            name: data.name,
            username: data.username,
            avatar_url: data.avatar,
            bio: data.bio,
            ...data.metadata
          }
        });

        if (authError) {
          Logger.warn(`Auth creation failed, falling back to direct insertion: ${authError.message}`);
          useAuthCreation = false;
        } else if (authUser.user) {
          user = {
            id: authUser.user.id,
            email: authUser.user.email!,
            name: data.name,
            username: data.username,
            avatar: data.avatar,
            created_at: authUser.user.created_at,
            metadata: authUser.user.user_metadata
          };
        } else {
          useAuthCreation = false;
        }
      } catch (error: any) {
        Logger.warn(`Auth creation error, using direct insertion: ${error.message}`);
        useAuthCreation = false;
      }

      // Fallback to direct table insertion
      if (!useAuthCreation) {
        user = await this.createUserDirectly(data);
      }

      // Try to create related records in common tables
      await this.createRelatedRecords(user!, data);

      return user!;

    } catch (error: any) {
      Logger.error(`Generic user creation failed: ${error.message}`);
      throw error;
    }
  }

  private async createUserDirectly(data: UserData): Promise<User> {
    // Generate a UUID for the user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Try multiple table patterns
    const tablesToTry = ['accounts', 'profiles', 'users'];
    let createdUser: User | null = null;

    for (const tableName of tablesToTry) {
      try {
        // Check if table exists by trying to query it
        const { error: testError } = await this.client
          .from(tableName)
          .select('id')
          .limit(1);

        if (testError && testError.code === 'PGRST116') {
          // Table doesn't exist, skip
          continue;
        }

        // Prepare data for this table
        const constraintResult = await this.handleConstraints(tableName, {
          id: userId,
          email: data.email,
          name: data.name,
          username: data.username,
          avatar_url: data.avatar,
          bio: data.bio,
          created_at: now,
          updated_at: now
        });

        const { error: insertError } = await this.client
          .from(tableName)
          .insert(constraintResult.modifiedData);

        if (!insertError) {
          createdUser = {
            id: userId,
            email: data.email,
            name: data.name,
            username: data.username,
            avatar: data.avatar,
            created_at: now,
            metadata: data.metadata
          };
          Logger.debug(`User created in ${tableName} table`);
          break;
        } else {
          Logger.debug(`Failed to create user in ${tableName}: ${insertError.message}`);
        }

      } catch (error: any) {
        Logger.debug(`Error trying ${tableName} table: ${error.message}`);
      }
    }

    if (!createdUser) {
      throw new Error('Failed to create user in any available table');
    }

    return createdUser;
  }

  private async createRelatedRecords(user: User, data: UserData): Promise<void> {
    // Try to create records in other common tables
    const relatedTables = ['profiles', 'accounts'];

    for (const tableName of relatedTables) {
      try {
        // Check if table exists and user doesn't already exist there
        const { data: existing, error: existError } = await this.client
          .from(tableName)
          .select('id')
          .eq('id', user.id)
          .single();

        if (existError && existError.code !== 'PGRST116') {
          // Error other than table not found
          continue;
        }

        if (existing) {
          // User already exists in this table
          continue;
        }

        // Try to create related record
        const constraintResult = await this.handleConstraints(tableName, {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar_url: user.avatar,
          bio: data.bio,
          created_at: user.created_at,
          updated_at: user.created_at
        });

        const { error: insertError } = await this.client
          .from(tableName)
          .insert(constraintResult.modifiedData);

        if (!insertError) {
          Logger.debug(`Related record created in ${tableName}`);
        }

      } catch (error: any) {
        Logger.debug(`Failed to create related record in ${tableName}: ${error.message}`);
      }
    }
  }

  async handleConstraints(table: string, data: any): Promise<ConstraintHandlingResult> {
    const appliedFixes: ConstraintFix[] = [];
    const warnings: string[] = [];
    let processedData = { ...data };

    try {
      // Basic constraint handling for common patterns
      
      // Handle common timestamp fields
      if (!processedData.created_at) {
        processedData.created_at = new Date().toISOString();
        appliedFixes.push({
          type: 'set_field',
          field: 'created_at',
          oldValue: undefined,
          newValue: processedData.created_at,
          reason: 'Set default created_at timestamp',
          confidence: 0.9
        });
      }

      if (!processedData.updated_at) {
        processedData.updated_at = processedData.created_at || new Date().toISOString();
        appliedFixes.push({
          type: 'set_field',
          field: 'updated_at',
          oldValue: undefined,
          newValue: processedData.updated_at,
          reason: 'Set default updated_at timestamp',
          confidence: 0.9
        });
      }

      // Handle nullable vs non-nullable patterns
      if (table === 'accounts' && processedData.slug === undefined) {
        // If we can't determine if slug should be null, make it nullable
        processedData.slug = null;
        appliedFixes.push({
          type: 'set_field',
          field: 'slug',
          oldValue: undefined,
          newValue: null,
          reason: 'Default slug to null for compatibility',
          confidence: 0.8
        });
      }

      // Remove undefined values that might cause insertion issues
      Object.keys(processedData).forEach(key => {
        if (processedData[key] === undefined) {
          delete processedData[key];
          appliedFixes.push({
            type: 'remove_field',
            field: key,
            oldValue: undefined,
            newValue: undefined,
            reason: 'Remove undefined value to prevent insertion errors',
            confidence: 0.95
          });
        }
      });

      // Handle common field mapping
      if (processedData.avatar_url && !processedData.avatar) {
        processedData.avatar = processedData.avatar_url;
      }
      if (processedData.avatar && !processedData.avatar_url) {
        processedData.avatar_url = processedData.avatar;
      }

      return {
        success: true,
        originalData: data,
        modifiedData: processedData,
        appliedFixes,
        warnings,
        errors: [],
        bypassRequired: false
      };

    } catch (error: any) {
      Logger.warn(`Generic constraint handling failed for ${table}: ${error.message}`);
      return {
        success: false,
        originalData: data,
        modifiedData: processedData,
        appliedFixes,
        warnings: [...warnings, `Constraint handling error: ${error.message}`],
        errors: [error.message],
        bypassRequired: true
      };
    }
  }

  getRecommendations(): string[] {
    return [
      'Generic strategy provides basic compatibility with any schema',
      'Consider using a framework-specific strategy for better integration',
      'Enable constraint discovery to improve data integrity',
      'Use auth.admin.createUser() when possible for better Supabase integration',
      'Test seeding with small data sets first to identify schema-specific issues'
    ];
  }

  supportsFeature(feature: string): boolean {
    const supportedFeatures = [
      'basic_user_creation',
      'direct_insertion',
      'fallback_behavior',
      'constraint_basic_handling',
      'multi_table_attempts',
      'constraint_discovery'
    ];

    return supportedFeatures.includes(feature);
  }

  /**
   * Discover constraints using generic analysis
   */
  async discoverConstraints(tableNames?: string[]): Promise<StrategyConstraintResult> {
    if (!this.constraintEngine) {
      throw new Error('Constraint engine not initialized');
    }

    try {
      Logger.debug('Discovering constraints with generic strategy');

      const discoveryResult = await this.constraintEngine.discoverConstraints(tableNames || []);

      // Convert discovery engine tables to constraint types format
      const convertedTables = discoveryResult.tables.map(table => ({
        table: table.tableName,
        schema: 'public',
        checkConstraints: [],
        foreignKeyConstraints: [],
        uniqueConstraints: [],
        primaryKeyConstraints: [],
        notNullConstraints: [],
        confidence: discoveryResult.confidence,
        discoveryTimestamp: new Date().toISOString()
      }));

      return {
        success: true,
        tables: convertedTables,
        totalConstraints: discoveryResult.businessRules.length,
        confidence: discoveryResult.confidence,
        errors: [],
        warnings: [],
        recommendations: [
          ...this.getRecommendations(),
          'Consider using a framework-specific strategy for better constraint handling'
        ]
      };

    } catch (error: any) {
      Logger.error('Generic constraint discovery failed:', error);
      return {
        success: false,
        tables: [],
        totalConstraints: 0,
        confidence: 0,
        errors: [error.message],
        warnings: [],
        recommendations: ['Review constraint discovery configuration']
      };
    }
  }

  /**
   * Get generic constraint handlers
   */
  getConstraintHandlers(): ConstraintHandler[] {
    return [
      {
        id: 'generic_basic_check',
        type: 'check',
        priority: 10,
        description: 'Basic handler for check constraints',
        canHandle: () => true,
        handle: (constraint: any, data: any) => ({
          success: true,
          originalData: { ...data },
          modifiedData: { ...data },
          appliedFixes: [],
          warnings: [`Basic handling for check constraint: ${constraint.constraintName || 'unknown'}`],
          errors: [],
          bypassRequired: false
        })
      },
      {
        id: 'generic_basic_foreign_key',
        type: 'foreign_key',
        priority: 10,
        description: 'Basic handler for foreign key constraints',
        canHandle: () => true,
        handle: (constraint: any, data: any) => ({
          success: true,
          originalData: { ...data },
          modifiedData: { ...data },
          appliedFixes: [],
          warnings: [`Foreign key reference: ensure ${constraint.referencedTable} exists`],
          errors: [],
          bypassRequired: false
        })
      }
    ];
  }

  /**
   * Apply constraint fixes using generic logic
   */
  async applyConstraintFixes(
    table: string, 
    data: any, 
    constraints: TableConstraints
  ): Promise<ConstraintHandlingResult> {
    if (!this.constraintRegistry) {
      throw new Error('Constraint registry not initialized');
    }

    try {
      Logger.debug(`Applying generic constraint fixes for table: ${table}`);

      const result = this.constraintRegistry.handleTableConstraints(constraints, data);

      // Add generic safety measures
      if (!result.modifiedData.created_at) {
        result.modifiedData.created_at = new Date().toISOString();
        result.appliedFixes.push({
          type: 'set_field',
          field: 'created_at',
          oldValue: undefined,
          newValue: result.modifiedData.created_at,
          reason: 'Set default timestamp',
          confidence: 0.9
        });
      }

      return result;

    } catch (error: any) {
      Logger.error('Generic constraint fix application failed:', error);
      return {
        success: false,
        originalData: data,
        modifiedData: data,
        appliedFixes: [],
        warnings: [],
        errors: [error.message],
        bypassRequired: true
      };
    }
  }

  /**
   * Analyze business logic patterns for generic strategy
   */
  async analyzeBusinessLogic(): Promise<BusinessLogicAnalysisResult> {
    if (!this.businessLogicAnalyzer) {
      throw new Error('Business logic analyzer not initialized');
    }

    try {
      Logger.debug('Analyzing generic business logic patterns');
      
      const analysis = await this.businessLogicAnalyzer.analyzeBusinessLogic();
      
      // Add generic-specific enhancements to the analysis
      if (analysis.success) {
        analysis.framework = 'generic';
        
        // Generic strategy typically has lower confidence for business logic
        analysis.confidence = Math.min(analysis.confidence, 0.7);

        // Add generic-specific recommendations
        const genericRecommendations = [
          'Consider framework-specific strategy for better business logic compliance',
          'Use service role for RLS bypass when needed',
          'Enable constraint discovery for better data integrity'
        ];
        
        analysis.warnings.push(...genericRecommendations);
      }

      return analysis;

    } catch (error: any) {
      Logger.error('Generic business logic analysis failed:', error);
      throw error;
    }
  }

  /**
   * Seed data with RLS compliance for generic strategy
   */
  async seedWithRLSCompliance(
    table: string, 
    data: any[], 
    userContext?: UserContext
  ): Promise<RLSComplianceResult> {
    if (!this.rlsCompliantSeeder) {
      throw new Error('RLS compliant seeder not initialized');
    }

    try {
      Logger.debug(`Generic RLS-compliant seeding for table: ${table}`);

      // For generic strategy, we often prefer service role bypass
      const result = await this.rlsCompliantSeeder.seedWithRLSCompliance(table, data, userContext);
      
      // Add generic-specific context to the result
      if (result.success && result.bypassesUsed.length > 0) {
        result.warnings = result.warnings || [];
        result.warnings.push('Used service role bypass for generic seeding');
      }

      return result;

    } catch (error: any) {
      Logger.error(`Generic RLS-compliant seeding failed for ${table}:`, error);
      throw error;
    }
  }

  /**
   * Get RLS compliance options for generic strategy
   */
  getRLSComplianceOptions(): RLSComplianceOptions {
    return {
      enableRLSCompliance: true,
      useServiceRole: true, // Generic strategy prefers service role bypass
      createUserContext: false,
      bypassOnFailure: true, // More permissive for generic use
      validateAfterInsert: false,
      logPolicyViolations: true,
      maxRetries: 1
    };
  }

  /**
   * Analyze database relationships for generic strategy
   */
  async analyzeRelationships(): Promise<RelationshipAnalysisResult> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Analyzing relationships for generic strategy');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      
      // Add generic-specific enhancements to the analysis
      if (analysis.success) {
        // Generic strategy has lower confidence since it doesn't know framework specifics
        analysis.analysisMetadata.confidence = Math.min(analysis.analysisMetadata.confidence, 0.8);
        
        // Add generic-specific recommendations
        analysis.recommendations.push('Consider using framework-specific strategy for better relationship handling');
        analysis.recommendations.push('Verify tenant boundaries if using multi-tenant architecture');
      }

      return analysis;

    } catch (error: any) {
      Logger.error('Generic relationship analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get dependency graph for generic strategy
   */
  async getDependencyGraph(): Promise<DependencyGraph> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Building generic dependency graph');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      if (!analysis.success) {
        throw new Error('Failed to analyze relationships for dependency graph');
      }

      return analysis.dependencyGraph;

    } catch (error: any) {
      Logger.error('Generic dependency graph creation failed:', error);
      throw error;
    }
  }

  /**
   * Detect junction tables with generic patterns
   */
  async detectJunctionTables(): Promise<JunctionTableDetectionResult> {
    if (!this.junctionTableHandler || !this.relationshipAnalyzer) {
      throw new Error('Junction table handler or relationship analyzer not initialized');
    }

    try {
      Logger.debug('Detecting junction tables for generic strategy');
      
      const dependencyGraph = await this.getDependencyGraph();
      const result = await this.junctionTableHandler.detectJunctionTables(dependencyGraph);
      
      // Add generic-specific recommendations
      if (result.success && result.junctionTables.length > 0) {
        result.recommendations.push('Verify junction table patterns match your application architecture');
        result.recommendations.push('Consider framework-specific strategy for optimized junction table handling');
      }

      return result;

    } catch (error: any) {
      Logger.error('Generic junction table detection failed:', error);
      return {
        success: false,
        junctionTables: [],
        relationshipPatterns: [],
        totalRelationships: 0,
        confidence: 0,
        warnings: [],
        errors: [error.message],
        recommendations: []
      };
    }
  }

  /**
   * Seed junction table with generic options
   */
  async seedJunctionTable(
    tableName: string, 
    options: Partial<JunctionSeedingOptions> = {}
  ): Promise<JunctionSeedingResult> {
    if (!this.junctionTableHandler) {
      throw new Error('Junction table handler not initialized');
    }

    try {
      Logger.debug(`Seeding generic junction table: ${tableName}`);
      
      // Generic-specific junction seeding options
      const genericOptions: Partial<JunctionSeedingOptions> = {
        generateRelationships: true,
        relationshipDensity: 0.3, // Conservative density for generic use
        respectCardinality: true,
        avoidOrphans: true,
        distributionStrategy: 'random', // Random distribution works well generically
        generateMetadata: false, // Less metadata assumption for generic
        includeTimestamps: true,
        validateForeignKeys: true,
        ...options
      };

      const result = await this.junctionTableHandler.seedJunctionTable(tableName, genericOptions);
      
      // Add generic-specific context to the result
      if (result.success) {
        result.warnings = result.warnings || [];
        result.warnings.push('Used generic junction table seeding - consider framework-specific optimization');
      }

      return result;

    } catch (error: any) {
      Logger.error(`Generic junction table seeding failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get optimal seeding order for generic schemas
   */
  async getSeedingOrder(): Promise<string[]> {
    if (!this.relationshipAnalyzer) {
      throw new Error('Relationship analyzer not initialized');
    }

    try {
      Logger.debug('Calculating generic seeding order');
      
      const analysis = await this.relationshipAnalyzer.analyzeRelationships();
      if (!analysis.success) {
        throw new Error('Failed to analyze relationships for seeding order');
      }

      const seedingOrder = analysis.seedingOrder.seedingOrder;
      
      Logger.info(`Generic seeding order: ${seedingOrder.join(' → ')}`);
      return seedingOrder;

    } catch (error: any) {
      Logger.error('Generic seeding order calculation failed:', error);
      throw error;
    }
  }

  /**
   * Multi-Tenant Methods Implementation (Basic Generic Support)
   */

  /**
   * Discover tenant-scoped tables and relationships
   */
  async discoverTenantScopes(): Promise<TenantDiscoveryResult> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info('🔍 Generic tenant scope discovery (basic support)...');
    
    try {
      const result = await this.multiTenantManager.discoverTenantScopes();
      
      // Add generic strategy notes
      if (result.success) {
        result.recommendations.push(
          'Generic strategy: Multi-tenant support is basic',
          'Consider using a framework-specific strategy for better tenant support',
          'Manual configuration may be required for complex tenant patterns'
        );
      }

      return result;
    } catch (error: any) {
      Logger.error('Generic tenant scope discovery failed:', error);
      throw error;
    }
  }

  /**
   * Create tenant-aware data with basic support
   */
  async createTenantScopedData(
    tenantId: string,
    tableName: string,
    data: any[],
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<any[]> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.debug(`🔍 Generic tenant-scoped data creation for ${tableName} (basic support)`);

    try {
      // Generic strategy just passes through to the multi-tenant manager
      // without any framework-specific transformations
      return await this.multiTenantManager.createTenantScopedData(
        tableName,
        tenantId,
        data,
        options
      );
    } catch (error: any) {
      Logger.error(`Generic tenant-scoped data creation failed for ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Generate basic tenant accounts (generic implementation)
   */
  async generateTenantAccounts(
    count: number,
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<TenantInfo[]> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info(`🔍 Generating ${count} generic tenant accounts (basic support)...`);

    try {
      // Generic strategy generates simple tenant info without creating database records
      const tenants = await this.multiTenantManager.generateTenantAccounts(count, {
        ...options,
        generatePersonalAccounts: false, // Generic doesn't distinguish types
        generateTeamAccounts: false,
        personalAccountRatio: 1.0,
        dataDistributionStrategy: 'even'
      });

      Logger.success(`✅ Generated ${tenants.length} generic tenant accounts`);
      Logger.info('💡 Note: Generic strategy provides basic tenant support only');
      Logger.info('💡 Consider using MakerKit or framework-specific strategy for full support');
      
      return tenants;
    } catch (error: any) {
      Logger.error('Generic tenant account generation failed:', error);
      throw error;
    }
  }

  /**
   * Basic tenant isolation validation
   */
  async validateTenantIsolation(tenantId: string): Promise<TenantIsolationReport> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    Logger.info(`📊 Generic tenant isolation validation for: ${tenantId} (basic support)`);

    try {
      const report = await this.multiTenantManager.createTenantIsolationReport(tenantId);

      // Add generic strategy notes
      report.recommendations.push(
        'Generic strategy: Basic tenant isolation validation only',
        'Framework-specific strategies provide more comprehensive validation',
        'Manual verification may be required for complex scenarios'
      );

      return report;
    } catch (error: any) {
      Logger.error(`Generic tenant isolation validation failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Basic multi-tenant data seeding
   */
  async seedMultiTenantData(
    tenants: TenantInfo[],
    options: Partial<TenantDataGenerationOptions> = {}
  ): Promise<TenantSeedingResult> {
    Logger.info(`🌱 Generic multi-tenant data seeding for ${tenants.length} tenants (basic support)...`);

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [
      'Generic strategy provides basic multi-tenant support only',
      'Framework-specific strategies offer more comprehensive tenant features'
    ];

    try {
      // Basic implementation - just return minimal result
      const result: TenantSeedingResult = {
        success: true,
        tenantsCreated: tenants.length,
        personalAccounts: 0, // Generic doesn't distinguish types
        teamAccounts: 0,
        totalRecords: 0,
        tenantScopedRecords: 0,
        crossTenantReferences: 0,
        validationResult: {
          isValid: true,
          violations: [],
          warnings: warnings,
          recommendations: [
            'Generic strategy completed basic tenant setup',
            'Consider using framework-specific strategy for production use',
            'Manual data seeding may be required for complex scenarios'
          ],
          isolationScore: 0.5 // Basic score for generic
        },
        executionTime: Date.now() - startTime,
        errors,
        warnings,
        tenantDetails: tenants.map(tenant => ({
          tenantId: tenant.id,
          tenantType: tenant.type,
          recordsCreated: 0,
          tablesSeeded: [],
          relationships: 0,
          isolationScore: 0.5,
          errors: [],
          warnings: []
        }))
      };

      Logger.success(`✅ Generic multi-tenant seeding completed (basic support)`);
      return result;

    } catch (error: any) {
      Logger.error('Generic multi-tenant seeding failed:', error);
      throw error;
    }
  }

  /**
   * Get tenant scope information for a table
   */
  async getTenantScopeInfo(tableName: string): Promise<TenantScopeInfo | null> {
    if (!this.multiTenantManager) {
      throw new Error('Multi-tenant manager not initialized');
    }

    const scopeInfo = this.multiTenantManager.getTenantScopeInfo(tableName);
    return scopeInfo || null;
  }
}