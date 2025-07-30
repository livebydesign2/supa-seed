/**
 * Framework-Aware Adapter
 * Bridges the existing schema-adapter with the new framework strategy system
 */

import type { createClient } from '@supabase/supabase-js';
import { SchemaAdapter, SchemaInfo } from '../../core/schema-adapter';
import { StrategyRegistry, StrategySelection } from './strategy-registry';
import { DatabaseSchema, SeedingStrategy, UserData, User, SeedingResult } from './strategy-interface';
import { MakerKitStrategy } from './strategies/makerkit-strategy';
import { GenericStrategy } from './strategies/generic-strategy';
import { Logger } from '../../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface FrameworkAdapterOptions {
  enableSchemaCache?: boolean;
  frameworkOverride?: string;
  enableConstraintHandling?: boolean;
  debug?: boolean;
}

export class FrameworkAdapter {
  private client: SupabaseClient;
  private schemaAdapter: SchemaAdapter;
  private strategyRegistry: StrategyRegistry;
  private currentStrategy?: SeedingStrategy;
  private currentSelection?: StrategySelection;
  private options: FrameworkAdapterOptions;

  constructor(
    client: SupabaseClient, 
    config?: any,
    options: FrameworkAdapterOptions = {}
  ) {
    this.client = client;
    this.options = {
      enableSchemaCache: true,
      enableConstraintHandling: true,
      debug: false,
      ...options
    };

    // Initialize schema adapter for backward compatibility
    this.schemaAdapter = new SchemaAdapter(client, config);

    // Initialize strategy registry
    this.strategyRegistry = new StrategyRegistry(client, {
      enableFallback: true,
      minimumConfidence: 0.3,
      debug: this.options.debug
    });
  }

  /**
   * Initialize the framework adapter
   */
  async initialize(): Promise<void> {
    try {
      Logger.debug('Initializing framework adapter...');

      // Register available strategies
      await this.registerStrategies();

      // Detect schema and select strategy
      await this.detectAndSelectStrategy();

      Logger.success(`Framework adapter initialized with ${this.currentStrategy!.name} strategy`);

    } catch (error: any) {
      Logger.error('Failed to initialize framework adapter:', error);
      throw error;
    }
  }

  /**
   * Register all available strategies
   */
  private async registerStrategies(): Promise<void> {
    const strategies = [
      new MakerKitStrategy(),
      new GenericStrategy()
    ];

    await this.strategyRegistry.registerAll(strategies);
    Logger.debug(`Registered ${strategies.length} framework strategies`);
  }

  /**
   * Detect schema and select appropriate strategy
   */
  private async detectAndSelectStrategy(): Promise<void> {
    try {
      // Get schema information from existing adapter
      const schemaInfo = await this.schemaAdapter.detectSchema();
      
      // Convert to new schema format
      const databaseSchema = await this.convertSchemaInfo(schemaInfo);

      // Select strategy
      this.currentSelection = await this.strategyRegistry.selectStrategyWithOverride(
        databaseSchema,
        this.options.frameworkOverride
      );

      this.currentStrategy = this.currentSelection.strategy;

      Logger.info(`Selected strategy: ${this.currentStrategy.name} (${this.currentSelection.reason})`);
      Logger.info(`Detection confidence: ${(this.currentSelection.detection.confidence * 100).toFixed(1)}%`);

      if (this.options.debug) {
        Logger.debug('Detection details:', {
          framework: this.currentSelection.detection.framework,
          version: this.currentSelection.detection.version,
          features: this.currentSelection.detection.detectedFeatures,
          recommendations: this.currentSelection.detection.recommendations
        });
      }

    } catch (error: any) {
      Logger.error('Strategy selection failed:', error);
      throw error;
    }
  }

  /**
   * Convert existing SchemaInfo to new DatabaseSchema format
   */
  private async convertSchemaInfo(schemaInfo: SchemaInfo): Promise<DatabaseSchema> {
    // For now, create a basic schema representation
    // This will be enhanced as we build the constraint discovery system
    const schema: DatabaseSchema = {
      tables: [],
      functions: [],
      triggers: [],
      constraints: []
    };

    // Add basic table information based on detected tables
    const tableNames: string[] = [];
    
    if (schemaInfo.hasAccounts) tableNames.push('accounts');
    if (schemaInfo.hasProfiles) tableNames.push('profiles');
    if (schemaInfo.hasSetups) tableNames.push('setups');
    if (schemaInfo.hasTeams) tableNames.push('teams');
    if (schemaInfo.hasOrganizations) tableNames.push('organizations');
    
    // Add custom tables
    tableNames.push(...schemaInfo.customTables);

    // Create basic table info (will be enhanced with constraint discovery)
    schema.tables = tableNames.map(name => ({
      name,
      columns: [], // Will be populated by constraint discovery
      relationships: []
    }));

    // Add framework-specific function detection
    if (schemaInfo.makerkitVersion !== 'none') {
      // Add known MakerKit functions
      schema.functions.push({
        name: 'kit.setup_new_user',
        schema: 'public',
        arguments: [],
        returnType: 'void'
      });
    }

    return schema;
  }

  /**
   * Create a user using the selected strategy
   */
  async createUser(userData: UserData): Promise<SeedingResult> {
    if (!this.currentStrategy) {
      throw new Error('Framework adapter not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      Logger.debug(`Creating user with ${this.currentStrategy.name} strategy: ${userData.email}`);

      const user = await this.currentStrategy.createUser(userData);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data: user,
        errors: [],
        warnings: [],
        appliedFixes: [],
        strategy: this.currentStrategy.name,
        executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      Logger.error(`User creation failed with ${this.currentStrategy.name} strategy:`, error);

      return {
        success: false,
        errors: [error.message],
        warnings: [],
        appliedFixes: [],
        strategy: this.currentStrategy.name,
        executionTime
      };
    }
  }

  /**
   * Get the current strategy
   */
  getCurrentStrategy(): SeedingStrategy | undefined {
    return this.currentStrategy;
  }

  /**
   * Get strategy selection details
   */
  getStrategySelection(): StrategySelection | undefined {
    return this.currentSelection;
  }

  /**
   * Get framework recommendations
   */
  getRecommendations(): string[] {
    if (!this.currentStrategy) {
      return ['Initialize framework adapter to get recommendations'];
    }

    const strategyRecommendations = this.currentStrategy.getRecommendations();
    const detectionRecommendations = this.currentSelection?.detection.recommendations || [];

    return [
      ...strategyRecommendations,
      ...detectionRecommendations
    ];
  }

  /**
   * Check if a specific feature is supported
   */
  supportsFeature(feature: string): boolean {
    return this.currentStrategy?.supportsFeature(feature) || false;
  }

  /**
   * Get schema information (backward compatibility)
   */
  async getSchemaInfo(): Promise<SchemaInfo> {
    return await this.schemaAdapter.detectSchema();
  }

  /**
   * Get legacy user creation strategy (backward compatibility)
   */
  getUserCreationStrategy(): 'simple-accounts' | 'makerkit-profiles' | 'custom-profiles' {
    return this.schemaAdapter.getUserCreationStrategy();
  }

  /**
   * Validate the current strategy setup
   */
  async validateStrategy(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    if (!this.currentStrategy || !this.currentSelection) {
      return {
        valid: false,
        issues: ['No strategy selected'],
        recommendations: ['Initialize framework adapter']
      };
    }

    const schema = await this.convertSchemaInfo(await this.getSchemaInfo());
    
    return await this.strategyRegistry.validateStrategy(
      this.currentStrategy.name,
      schema
    );
  }

  /**
   * Override the current strategy
   */
  async overrideStrategy(strategyName: string): Promise<void> {
    const strategy = this.strategyRegistry.getStrategy(strategyName);
    if (!strategy) {
      throw new Error(`Strategy '${strategyName}' not found`);
    }

    this.currentStrategy = strategy;
    
    // Create a new selection result
    const schema = await this.convertSchemaInfo(await this.getSchemaInfo());
    const detection = await strategy.detect(schema);
    
    this.currentSelection = {
      strategy,
      detection,
      reason: 'manual_override'
    };

    Logger.info(`Strategy overridden to: ${strategyName}`);
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): string[] {
    return this.strategyRegistry.getStrategies().map(s => s.name);
  }

  /**
   * Get detection results for all strategies
   */
  async getAllDetectionResults(): Promise<Array<{
    strategy: string;
    detection: any;
  }>> {
    const schema = await this.convertSchemaInfo(await this.getSchemaInfo());
    return await this.strategyRegistry.getAllDetectionResults(schema);
  }

  /**
   * Get the currently active strategy
   */
  getActiveStrategy(): SeedingStrategy | undefined {
    return this.currentStrategy;
  }
}