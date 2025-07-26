/**
 * Detection System Integration Layer for Epic 2: Smart Platform Detection Engine
 * Integrates new Architecture Detection Engine with existing schema introspection and framework detection
 * Part of Task 2.1.5: Integrate with existing schema introspection and framework detection
 */

import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

// Import caching system
import { DetectionCacheManager, DetectionCacheUtils } from './detection-cache';

// Import auto-configuration system
import { AutoConfigurator, type AutoConfigurationResult, type AutoConfigurationOptions } from './auto-configurator';

// Import existing detection systems
import { SchemaIntrospector, type SchemaIntrospectionResult } from '../schema/schema-introspector';
import { MakerKitDetector, type MakerKitDetectionResult } from '../framework/strategies/makerkit-detector';

// Import new architecture detection system
import { ArchitectureDetectionEngine } from './architecture-detector';
import { ArchitectureEvidenceCollector } from './evidence-collector';

// Import new domain detection system
import { DomainDetectionEngine } from './domain-detector';
import {
  PlatformArchitectureDetectionResult,
  DomainDetectionResult,
  DetectionAnalysisContext,
  DomainAnalysisContext,
  ArchitectureDetectionConfig,
  DomainDetectionConfig,
  PlatformArchitectureType,
  ContentDomainType
} from './detection-types';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Unified detection result combining all detection systems
 */
export interface UnifiedDetectionResult {
  /** Architecture detection results (new system) */
  architecture: PlatformArchitectureDetectionResult;
  
  /** Domain detection results (new system) */
  domain: DomainDetectionResult;
  
  /** Schema introspection results (existing system) */
  schema: SchemaIntrospectionResult;
  
  /** Framework detection results (existing system) */
  framework: MakerKitDetectionResult;
  
  /** Integration metadata */
  integration: {
    /** Overall confidence in unified detection */
    overallConfidence: number;
    
    /** Cross-validation results */
    crossValidation: CrossValidationResult;
    
    /** Consolidated recommendations */
    recommendations: string[];
    
    /** Detection conflicts and resolutions */
    conflicts: DetectionConflict[];
    
    /** Performance metrics */
    performance: {
      totalExecutionTime: number;
      schemaIntrospectionTime: number;
      frameworkDetectionTime: number;
      architectureDetectionTime: number;
      domainDetectionTime: number;
    };
  };
}

/**
 * Cross-validation between different detection systems
 */
export interface CrossValidationResult {
  /** Whether architecture and framework detection agree */
  architectureFrameworkAgreement: number; // 0-1
  
  /** Whether schema patterns match architecture detection */
  schemaArchitectureAgreement: number; // 0-1
  
  /** Whether domain and architecture detection align */
  domainArchitectureAgreement: number; // 0-1
  
  /** Overall cross-validation score */
  overallAgreement: number; // 0-1
  
  /** Specific agreements and disagreements */
  agreements: string[];
  disagreements: string[];
}

/**
 * Detection conflicts between systems
 */
export interface DetectionConflict {
  /** Type of conflict */
  type: 'architecture_mismatch' | 'framework_mismatch' | 'schema_inconsistency';
  
  /** Description of the conflict */
  description: string;
  
  /** Severity of the conflict */
  severity: 'low' | 'medium' | 'high';
  
  /** Suggested resolution */
  suggestedResolution: string;
  
  /** Systems involved in the conflict */
  involvedSystems: ('architecture' | 'schema' | 'framework' | 'domain')[];
}

/**
 * Configuration for unified detection
 */
export interface UnifiedDetectionConfig {
  /** Architecture detection configuration */
  architecture?: Partial<ArchitectureDetectionConfig>;
  
  /** Domain detection configuration */
  domain?: Partial<DomainDetectionConfig>;
  
  /** Whether to perform cross-validation */
  enableCrossValidation: boolean;
  
  /** Whether to attempt conflict resolution */
  enableConflictResolution: boolean;
  
  /** Maximum execution time for unified detection (ms) */
  maxExecutionTime: number;
  
  /** Whether to cache detection results */
  enableCaching: boolean;
  
  /** Confidence threshold for accepting results */
  confidenceThreshold: number;
}

/**
 * Main integration orchestrator for all detection systems
 */
export class DetectionIntegrationEngine {
  private client: SupabaseClient;
  private schemaIntrospector: SchemaIntrospector;
  private makerKitDetector: MakerKitDetector;
  private architectureDetector: ArchitectureDetectionEngine;
  private domainDetector: DomainDetectionEngine;
  private evidenceCollector: ArchitectureEvidenceCollector;
  private cacheManager: DetectionCacheManager;
  private autoConfigurator: AutoConfigurator;
  private databaseUrl: string;
  private schemaHash?: string;

  constructor(client: SupabaseClient, databaseUrl?: string) {
    this.client = client;
    this.databaseUrl = databaseUrl || this.extractUrlFromClient(client);
    this.schemaIntrospector = new SchemaIntrospector(client);
    this.makerKitDetector = new MakerKitDetector(client);
    this.architectureDetector = new ArchitectureDetectionEngine();
    this.domainDetector = new DomainDetectionEngine();
    this.evidenceCollector = new ArchitectureEvidenceCollector();
    this.cacheManager = new DetectionCacheManager();
    this.autoConfigurator = new AutoConfigurator();
  }

  /**
   * Perform unified detection with auto-configuration
   */
  async performUnifiedDetectionWithAutoConfig(
    autoConfigOptions: Partial<AutoConfigurationOptions> = {},
    detectionConfig: Partial<UnifiedDetectionConfig> = {}
  ): Promise<{ detection: UnifiedDetectionResult; autoConfiguration: AutoConfigurationResult }> {
    const fullDetectionConfig: UnifiedDetectionConfig = {
      enableCrossValidation: true,
      enableConflictResolution: true,
      maxExecutionTime: 30000,
      enableCaching: true,
      confidenceThreshold: 0.6,
      ...detectionConfig
    };

    const startTime = Date.now();
    Logger.info('🔄 Starting unified detection with auto-configuration...');

    // Check cache first if enabled
    let cacheKey: string;
    if (fullDetectionConfig.enableCaching) {
      try {
        // Generate schema hash for cache validation
        if (!this.schemaHash) {
          this.schemaHash = await DetectionCacheUtils.generateSchemaHash(this.client);
        }
        
        // Include auto-config options in cache key
        const cacheData = {
          detection: fullDetectionConfig,
          autoConfig: autoConfigOptions
        };
        
        cacheKey = this.cacheManager.generateCacheKey(
          this.databaseUrl,
          this.schemaHash,
          cacheData
        );
        
        const cachedEntry = await this.cacheManager.retrieve(
          cacheKey,
          this.databaseUrl,
          this.schemaHash
        );
        
        if (cachedEntry && cachedEntry.autoConfiguration) {
          Logger.info('📦 Using cached unified detection and auto-configuration results');
          Logger.debug(`Cache hit with detection confidence: ${cachedEntry.detectionResults.integration.overallConfidence}`);
          Logger.debug(`Cache hit with config confidence: ${cachedEntry.autoConfiguration.confidence}`);
          
          return {
            detection: cachedEntry.detectionResults,
            autoConfiguration: cachedEntry.autoConfiguration
          };
        }
      } catch (error: any) {
        Logger.debug('Cache lookup failed:', error.message);
        // Continue with fresh detection
      }
    }

    try {
      // Step 1: Perform unified detection
      const detectionResults = await this.performUnifiedDetection(fullDetectionConfig);

      // Step 2: Generate auto-configuration from detection results
      Logger.debug('🔧 Generating auto-configuration from detection results...');
      const autoConfigStartTime = Date.now();
      
      const autoConfiguration = await this.autoConfigurator.generateConfiguration(
        detectionResults,
        autoConfigOptions
      );
      
      const autoConfigTime = Date.now() - autoConfigStartTime;
      Logger.success(`✅ Auto-configuration completed in ${autoConfigTime}ms with ${autoConfiguration.confidence.toFixed(2)} confidence`);

      // Step 3: Cache the combined results
      if (fullDetectionConfig.enableCaching) {
        try {
          await this.cacheManager.store(
            cacheKey!,
            this.databaseUrl,
            this.schemaHash!,
            detectionResults,
            autoConfiguration
          );
          Logger.debug('Combined detection and auto-configuration results cached successfully');
        } catch (error: any) {
          Logger.debug('Failed to cache combined results:', error.message);
          // Continue without caching
        }
      }

      const totalTime = Date.now() - startTime;
      Logger.success(`🎉 Unified detection with auto-configuration completed in ${totalTime}ms`);

      return {
        detection: detectionResults,
        autoConfiguration
      };

    } catch (error: any) {
      Logger.error('Unified detection with auto-configuration failed:', error);
      throw new Error(`Unified detection with auto-configuration failed: ${error.message}`);
    }
  }

  /**
   * Perform unified detection across all systems
   */
  async performUnifiedDetection(
    config: Partial<UnifiedDetectionConfig> = {}
  ): Promise<UnifiedDetectionResult> {
    const fullConfig: UnifiedDetectionConfig = {
      enableCrossValidation: true,
      enableConflictResolution: true,
      maxExecutionTime: 30000, // 30 seconds
      enableCaching: true,
      confidenceThreshold: 0.6,
      ...config
    };

    const startTime = Date.now();
    Logger.info('🔄 Starting unified detection across all systems...');

    // Check cache first if enabled
    let cacheKey: string;
    if (fullConfig.enableCaching) {
      try {
        // Generate schema hash for cache validation
        if (!this.schemaHash) {
          this.schemaHash = await DetectionCacheUtils.generateSchemaHash(this.client);
        }
        
        cacheKey = this.cacheManager.generateCacheKey(
          this.databaseUrl,
          this.schemaHash,
          fullConfig
        );
        
        const cachedEntry = await this.cacheManager.retrieve(
          cacheKey,
          this.databaseUrl,
          this.schemaHash
        );
        
        if (cachedEntry) {
          Logger.info('📦 Using cached unified detection result');
          Logger.debug(`Cache hit with confidence: ${cachedEntry.detectionResults.integration.overallConfidence}`);
          return cachedEntry.detectionResults;
        }
      } catch (error: any) {
        Logger.debug('Cache lookup failed:', error.message);
        // Continue with fresh detection
      }
    }

    try {
      // Step 1: Schema Introspection (foundational data)
      const schemaStartTime = Date.now();
      Logger.debug('🔍 Performing schema introspection...');
      const schemaResult = await this.schemaIntrospector.introspectSchema();
      const schemaTime = Date.now() - schemaStartTime;
      Logger.success(`✅ Schema introspection completed in ${schemaTime}ms`);

      // Step 2: Framework Detection (leverages schema data)
      const frameworkStartTime = Date.now();
      Logger.debug('🏗️  Performing framework detection...');
      const frameworkResult = await this.makerKitDetector.detectMakerKit({
        tables: schemaResult.tables.map(t => ({
          name: t.name,
          columns: t.columns.map(c => ({ name: c.name, type: c.type, nullable: c.isNullable })),
          relationships: []
        })),
        functions: [], // Would be populated from actual schema
        constraints: schemaResult.constraints.dataIntegrityRules.map(r => ({
          name: r.rule,
          table: r.table,
          type: this.mapConstraintTypeToFramework(r.type),
          definition: r.sqlCondition
        })),
        triggers: [] // Would be populated from actual schema
      });
      const frameworkTime = Date.now() - frameworkStartTime;
      Logger.success(`✅ Framework detection completed in ${frameworkTime}ms`);

      // Step 3: Architecture Detection (new system)
      const architectureStartTime = Date.now();
      Logger.debug('🏛️  Performing architecture detection...');
      const detectionContext = this.buildDetectionContext(schemaResult, frameworkResult);
      const architectureResult = await this.architectureDetector.detectArchitecture(
        detectionContext,
        fullConfig.architecture
      );
      const architectureTime = Date.now() - architectureStartTime;
      Logger.success(`✅ Architecture detection completed in ${architectureTime}ms`);

      // Step 4: Domain Detection (new system)
      const domainStartTime = Date.now();
      Logger.debug('🎯 Performing domain detection...');
      const domainContext = this.buildDomainContext(schemaResult, frameworkResult, architectureResult);
      const domainResult = await this.domainDetector.detectDomain(
        domainContext,
        fullConfig.domain
      );
      const domainTime = Date.now() - domainStartTime;
      Logger.success(`✅ Domain detection completed in ${domainTime}ms`);

      // Step 5: Cross-validation and integration
      const crossValidation = fullConfig.enableCrossValidation
        ? this.performCrossValidation(schemaResult, frameworkResult, architectureResult, domainResult)
        : this.createEmptyCrossValidation();

      // Step 6: Conflict detection and resolution
      const conflicts = fullConfig.enableConflictResolution
        ? this.detectAndResolveConflicts(schemaResult, frameworkResult, architectureResult, domainResult)
        : [];

      // Step 7: Generate consolidated recommendations
      const recommendations = this.generateConsolidatedRecommendations(
        schemaResult,
        frameworkResult,
        architectureResult,
        domainResult,
        crossValidation,
        conflicts
      );

      // Step 8: Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(
        schemaResult,
        frameworkResult,
        architectureResult,
        domainResult,
        crossValidation
      );

      const totalTime = Date.now() - startTime;

      const unifiedResult: UnifiedDetectionResult = {
        architecture: architectureResult,
        domain: domainResult,
        schema: schemaResult,
        framework: frameworkResult,
        integration: {
          overallConfidence,
          crossValidation,
          recommendations,
          conflicts,
          performance: {
            totalExecutionTime: totalTime,
            schemaIntrospectionTime: schemaTime,
            frameworkDetectionTime: frameworkTime,
            architectureDetectionTime: architectureTime,
            domainDetectionTime: domainTime
          }
        }
      };

      // Cache the result if enabled
      if (fullConfig.enableCaching) {
        try {
          await this.cacheManager.store(
            cacheKey!,
            this.databaseUrl,
            this.schemaHash!,
            unifiedResult,
            undefined, // No auto-configuration at this level
            undefined // Use default TTL
          );
          Logger.debug('Detection results cached successfully');
        } catch (error: any) {
          Logger.debug('Failed to cache detection results:', error.message);
          // Continue without caching
        }
      }

      Logger.success(`🎉 Unified detection completed in ${totalTime}ms with ${overallConfidence.toFixed(2)} confidence`);
      return unifiedResult;

    } catch (error: any) {
      Logger.error('Unified detection failed:', error);
      throw new Error(`Unified detection failed: ${error.message}`);
    }
  }

  /**
   * Build detection context from existing introspection results
   */
  private buildDetectionContext(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult
  ): DetectionAnalysisContext {
    return {
      schema: {
        tableCount: schemaResult.tables.length,
        tableNames: schemaResult.tables.map(t => t.name),
        relationships: schemaResult.relationships.map(r => ({
          fromTable: r.fromTable,
          toTable: r.toTable,
          type: r.relationshipType,
          columnName: r.fromColumn
        })),
        constraints: schemaResult.constraints.dataIntegrityRules.map(r => ({
          tableName: r.table,
          constraintName: r.rule,
          type: this.mapConstraintType(r.type)
        }))
      },
      framework: {
        type: frameworkResult.isMakerKit ? 'makerkit' : 'unknown',
        version: frameworkResult.version,
        confidence: frameworkResult.confidence
      },
      businessLogic: {
        functions: [],
        triggers: [],
        policies: []
      },
      existingResults: {
        frameworkDetection: frameworkResult,
        multiTenantDetection: undefined,
        businessLogicAnalysis: undefined
      }
    };
  }

  /**
   * Build domain analysis context from existing results
   */
  private buildDomainContext(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult
  ): DomainAnalysisContext {
    const baseContext = this.buildDetectionContext(schemaResult, frameworkResult);
    
    return {
      ...baseContext,
      domainHints: {
        suggestedDomains: this.suggestDomainsFromArchitecture(architectureResult.architectureType),
        excludedDomains: [],
        knownPatterns: []
      }
    };
  }

  /**
   * Suggest likely domains based on architecture type
   */
  private suggestDomainsFromArchitecture(architectureType: PlatformArchitectureType): ContentDomainType[] {
    switch (architectureType) {
      case 'individual':
        return ['outdoor', 'social', 'generic']; // Individual creators often in outdoor/social
      case 'team':
        return ['saas', 'ecommerce', 'generic']; // Teams often in business/enterprise
      case 'hybrid':
        return ['saas', 'ecommerce', 'social', 'generic']; // Hybrid can be anything
      default:
        return ['generic'];
    }
  }

  /**
   * Perform cross-validation between different detection systems
   */
  private performCrossValidation(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    domainResult: DomainDetectionResult
  ): CrossValidationResult {
    const agreements: string[] = [];
    const disagreements: string[] = [];

    // Validate architecture against framework
    const architectureFrameworkAgreement = this.validateArchitectureFrameworkAgreement(
      architectureResult,
      frameworkResult,
      agreements,
      disagreements
    );

    // Validate architecture against schema patterns
    const schemaArchitectureAgreement = this.validateSchemaArchitectureAgreement(
      schemaResult,
      architectureResult,
      agreements,
      disagreements
    );

    // Validate domain against architecture alignment
    const domainArchitectureAgreement = this.validateDomainArchitectureAgreement(
      domainResult,
      architectureResult,
      agreements,
      disagreements
    );

    const overallAgreement = (architectureFrameworkAgreement + schemaArchitectureAgreement + domainArchitectureAgreement) / 3;

    return {
      architectureFrameworkAgreement,
      schemaArchitectureAgreement,
      domainArchitectureAgreement,
      overallAgreement,
      agreements,
      disagreements
    };
  }

  /**
   * Validate agreement between architecture and framework detection
   */
  private validateArchitectureFrameworkAgreement(
    architectureResult: PlatformArchitectureDetectionResult,
    frameworkResult: MakerKitDetectionResult,
    agreements: string[],
    disagreements: string[]
  ): number {
    let agreementScore = 0;
    let totalChecks = 0;

    // Check if MakerKit detection aligns with architecture type
    if (frameworkResult.isMakerKit) {
      totalChecks++;
      
      // MakerKit typically supports team and hybrid architectures
      if (architectureResult.architectureType === 'team' || 
          architectureResult.architectureType === 'hybrid') {
        agreementScore++;
        agreements.push('MakerKit framework aligns with team/hybrid architecture');
      } else {
        disagreements.push('MakerKit framework detected but architecture appears individual-focused');
      }
    }

    // Check MakerKit version alignment
    if (frameworkResult.version) {
      totalChecks++;
      
      const hasComplexFeatures = architectureResult.platformFeatures.some(f =>
        f.category === 'organization' || f.category === 'collaboration'
      );
      
      if (frameworkResult.version === 'v3' && hasComplexFeatures) {
        agreementScore++;
        agreements.push('MakerKit v3 aligns with complex organizational features');
      } else if (frameworkResult.version === 'v2' && !hasComplexFeatures) {
        agreementScore++;
        agreements.push('MakerKit v2 aligns with simpler feature set');
      } else {
        disagreements.push(`MakerKit ${frameworkResult.version} features don't match detected complexity`);
      }
    }

    return totalChecks > 0 ? agreementScore / totalChecks : 0.5;
  }

  /**
   * Validate agreement between schema patterns and architecture detection
   */
  private validateSchemaArchitectureAgreement(
    schemaResult: SchemaIntrospectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    agreements: string[],
    disagreements: string[]
  ): number {
    let agreementScore = 0;
    let totalChecks = 0;

    // Check table patterns alignment
    const userTables = schemaResult.patterns.filter(p => p.suggestedRole === 'user');
    const contentTables = schemaResult.patterns.filter(p => p.suggestedRole === 'content');
    
    totalChecks++;
    if (architectureResult.architectureType === 'individual') {
      if (userTables.length === 1 && contentTables.length > 0) {
        agreementScore++;
        agreements.push('Schema patterns align with individual architecture');
      } else {
        disagreements.push('Individual architecture but schema suggests multiple user patterns');
      }
    } else if (architectureResult.architectureType === 'team') {
      if (schemaResult.tables.some(t => t.name.includes('organization') || t.name.includes('team'))) {
        agreementScore++;
        agreements.push('Schema contains team/organization tables matching team architecture');
      } else {
        disagreements.push('Team architecture but schema lacks team-oriented tables');
      }
    }

    // Check relationship complexity
    totalChecks++;
    const relationshipCount = schemaResult.relationships.length;
    const expectedComplexity = this.getExpectedRelationshipComplexity(architectureResult.architectureType);
    
    if (relationshipCount >= expectedComplexity.min && relationshipCount <= expectedComplexity.max) {
      agreementScore++;
      agreements.push(`Relationship complexity (${relationshipCount}) matches ${architectureResult.architectureType} architecture`);
    } else {
      disagreements.push(`Relationship complexity (${relationshipCount}) doesn't match expected range for ${architectureResult.architectureType}`);
    }

    return totalChecks > 0 ? agreementScore / totalChecks : 0.5;
  }

  /**
   * Validate agreement between domain and architecture detection
   */
  private validateDomainArchitectureAgreement(
    domainResult: DomainDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    agreements: string[],
    disagreements: string[]
  ): number {
    let agreementScore = 0;
    let totalChecks = 0;

    // Check domain-architecture typical alignments
    totalChecks++;
    const domainArchitectureAlignment = this.getDomainArchitectureAlignment(
      domainResult.primaryDomain, 
      architectureResult.architectureType
    );
    
    if (domainArchitectureAlignment >= 0.7) {
      agreementScore++;
      agreements.push(`${domainResult.primaryDomain} domain aligns well with ${architectureResult.architectureType} architecture`);
    } else if (domainArchitectureAlignment < 0.3) {
      disagreements.push(`${domainResult.primaryDomain} domain typically doesn't align with ${architectureResult.architectureType} architecture`);
    }

    // Check confidence alignment
    totalChecks++;
    const confidenceDiff = Math.abs(domainResult.confidence - architectureResult.confidence);
    if (confidenceDiff < 0.2) {
      agreementScore++;
      agreements.push('Domain and architecture detection confidence levels are aligned');
    } else {
      disagreements.push(`Large confidence difference between domain (${domainResult.confidence.toFixed(2)}) and architecture (${architectureResult.confidence.toFixed(2)})`);
    }

    // Check hybrid capabilities alignment
    if (domainResult.hybridCapabilities && architectureResult.architectureType === 'hybrid') {
      totalChecks++;
      agreementScore++;
      agreements.push('Hybrid domain capabilities align with hybrid architecture');
    } else if (domainResult.hybridCapabilities && architectureResult.architectureType !== 'hybrid') {
      totalChecks++;
      disagreements.push('Hybrid domain capabilities detected but architecture is not hybrid');
    }

    return totalChecks > 0 ? agreementScore / totalChecks : 0.5;
  }

  /**
   * Get alignment score between domain and architecture types
   */
  private getDomainArchitectureAlignment(domain: ContentDomainType, architecture: PlatformArchitectureType): number {
    const alignmentMatrix: Record<ContentDomainType, Record<PlatformArchitectureType, number>> = {
      outdoor: { individual: 0.9, team: 0.3, hybrid: 0.7 },
      saas: { individual: 0.2, team: 0.9, hybrid: 0.8 },
      ecommerce: { individual: 0.4, team: 0.7, hybrid: 0.9 },
      social: { individual: 0.8, team: 0.6, hybrid: 0.7 },
      generic: { individual: 0.5, team: 0.5, hybrid: 0.5 }
    };
    
    return alignmentMatrix[domain]?.[architecture] ?? 0.5;
  }

  /**
   * Detect and resolve conflicts between detection systems
   */
  private detectAndResolveConflicts(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    domainResult: DomainDetectionResult
  ): DetectionConflict[] {
    const conflicts: DetectionConflict[] = [];

    // Check for architecture-framework conflicts
    if (frameworkResult.isMakerKit && frameworkResult.confidence > 0.7) {
      if (architectureResult.architectureType === 'individual' && architectureResult.confidence > 0.7) {
        conflicts.push({
          type: 'architecture_mismatch',
          description: 'High confidence MakerKit detection conflicts with individual architecture',
          severity: 'medium',
          suggestedResolution: 'Consider hybrid architecture or verify MakerKit configuration',
          involvedSystems: ['architecture', 'framework']
        });
      }
    }

    // Check for schema-architecture conflicts
    const teamTables = schemaResult.tables.filter(t => 
      t.name.includes('team') || t.name.includes('organization') || t.name.includes('workspace')
    );
    
    if (teamTables.length > 0 && architectureResult.architectureType === 'individual') {
      conflicts.push({
        type: 'schema_inconsistency',
        description: 'Schema contains team-oriented tables but architecture is individual',
        severity: 'high',
        suggestedResolution: 'Re-evaluate architecture detection or check for hybrid patterns',
        involvedSystems: ['schema', 'architecture']
      });
    }

    // Check for domain-architecture alignment conflicts
    if (domainResult.primaryDomain === 'outdoor' && architectureResult.architectureType === 'team') {
      if (domainResult.confidence > 0.7 && architectureResult.confidence > 0.7) {
        conflicts.push({
          type: 'architecture_mismatch',
          description: 'Outdoor domain typically uses individual/hybrid architecture but team architecture detected',
          severity: 'medium',
          suggestedResolution: 'Verify if this is a team-oriented outdoor platform or consider hybrid architecture',
          involvedSystems: ['architecture', 'domain']
        });
      }
    }

    // Check for domain-specific feature conflicts
    if (domainResult.primaryDomain === 'saas' && !teamTables.length) {
      if (domainResult.confidence > 0.7) {
        conflicts.push({
          type: 'schema_inconsistency',
          description: 'SaaS domain detected but schema lacks typical team/organization structures',
          severity: 'medium',
          suggestedResolution: 'Verify SaaS classification or check for alternative team management patterns',
          involvedSystems: ['schema', 'domain']
        });
      }
    }

    // Check for low confidence across all systems (including domain)
    if (schemaResult.framework.confidence < 0.5 && 
        frameworkResult.confidence < 0.5 && 
        architectureResult.confidence < 0.5 &&
        domainResult.confidence < 0.5) {
      conflicts.push({
        type: 'framework_mismatch',
        description: 'Low confidence across all detection systems including domain detection',
        severity: 'high',
        suggestedResolution: 'Manual verification required - consider custom configuration and domain specification',
        involvedSystems: ['schema', 'framework', 'architecture', 'domain']
      });
    }

    return conflicts;
  }

  /**
   * Generate consolidated recommendations from all systems
   */
  private generateConsolidatedRecommendations(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    domainResult: DomainDetectionResult,
    crossValidation: CrossValidationResult,
    conflicts: DetectionConflict[]
  ): string[] {
    const recommendations: string[] = [];

    // Architecture-specific recommendations
    recommendations.push(`Platform Architecture: ${architectureResult.architectureType} (${(architectureResult.confidence * 100).toFixed(0)}% confidence)`);
    recommendations.push(...architectureResult.recommendations);

    // Domain-specific recommendations
    recommendations.push(`Content Domain: ${domainResult.primaryDomain} (${(domainResult.confidence * 100).toFixed(0)}% confidence)`);
    if (domainResult.secondaryDomains.length > 0) {
      const secondaryDomainsList = domainResult.secondaryDomains
        .map(d => `${d.domain}(${(d.confidence * 100).toFixed(0)}%)`)
        .join(', ');
      recommendations.push(`Secondary domains: ${secondaryDomainsList}`);
    }
    if (domainResult.hybridCapabilities) {
      recommendations.push('✨ Platform shows hybrid domain capabilities - consider multi-domain strategies');
    }
    recommendations.push(...domainResult.reasoning.slice(0, 3)); // Top 3 domain reasoning points

    // Framework-specific recommendations
    if (frameworkResult.isMakerKit) {
      recommendations.push(`Framework: MakerKit ${frameworkResult.version || 'detected'} (${(frameworkResult.confidence * 100).toFixed(0)}% confidence)`);
      recommendations.push(...frameworkResult.recommendations);
    }

    // Schema-specific recommendations
    recommendations.push(...schemaResult.recommendations.map(r => `Schema: ${r.message}`));

    // Cross-validation recommendations
    if (crossValidation.overallAgreement < 0.7) {
      recommendations.push('⚠️ Low cross-validation agreement - consider manual review');
    }

    if (crossValidation.disagreements.length > 0) {
      recommendations.push('📝 Review disagreements between detection systems');
    }

    // Conflict-based recommendations
    for (const conflict of conflicts) {
      if (conflict.severity === 'high') {
        recommendations.push(`🚨 High Priority: ${conflict.suggestedResolution}`);
      } else {
        recommendations.push(`⚠️ ${conflict.suggestedResolution}`);
      }
    }

    // Performance recommendations
    if (architectureResult.detectionMetrics.executionTime > 10000) {
      recommendations.push('⏱️ Consider using faster detection strategy for better performance');
    }

    return Array.from(new Set(recommendations)); // Remove duplicates
  }

  /**
   * Calculate overall confidence across all detection systems
   */
  private calculateOverallConfidence(
    schemaResult: SchemaIntrospectionResult,
    frameworkResult: MakerKitDetectionResult,
    architectureResult: PlatformArchitectureDetectionResult,
    domainResult: DomainDetectionResult,
    crossValidation: CrossValidationResult
  ): number {
    // Weight different confidence scores including domain detection
    const weights = {
      schema: 0.15,
      framework: 0.25,
      architecture: 0.25,
      domain: 0.20,
      crossValidation: 0.15
    };

    const weightedSum = 
      (schemaResult.framework.confidence * weights.schema) +
      (frameworkResult.confidence * weights.framework) +
      (architectureResult.confidence * weights.architecture) +
      (domainResult.confidence * weights.domain) +
      (crossValidation.overallAgreement * weights.crossValidation);

    return Math.min(1.0, weightedSum);
  }

  /**
   * Helper methods
   */
  private createEmptyCrossValidation(): CrossValidationResult {
    return {
      architectureFrameworkAgreement: 0.5,
      schemaArchitectureAgreement: 0.5,
      domainArchitectureAgreement: 0.5,
      overallAgreement: 0.5,
      agreements: [],
      disagreements: []
    };
  }

  private mapConstraintType(type: string): string {
    const mapping: Record<string, string> = {
      'required_relationship': 'foreign_key',
      'conditional_insert': 'check',
      'value_constraint': 'check',
      'business_rule': 'trigger'
    };
    return mapping[type] || type;
  }

  private mapConstraintTypeToFramework(type: string): 'check' | 'foreign_key' | 'unique' | 'primary_key' {
    const mapping: Record<string, 'check' | 'foreign_key' | 'unique' | 'primary_key'> = {
      'required_relationship': 'foreign_key',
      'conditional_insert': 'check',
      'value_constraint': 'check',
      'business_rule': 'check'
    };
    return mapping[type] || 'check';
  }

  private getExpectedRelationshipComplexity(architectureType: PlatformArchitectureType): { min: number; max: number } {
    switch (architectureType) {
      case 'individual':
        return { min: 2, max: 8 };
      case 'team':
        return { min: 8, max: 20 };
      case 'hybrid':
        return { min: 6, max: 25 };
      default:
        return { min: 0, max: 100 };
    }
  }

  /**
   * Extract database URL from Supabase client
   */
  private extractUrlFromClient(client: SupabaseClient): string {
    try {
      // Try to extract URL from client properties
      return (client as any).supabaseUrl || 'unknown-url';
    } catch {
      return 'unknown-url';
    }
  }

  /**
   * Clear detection cache
   */
  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
    this.schemaHash = undefined; // Force regeneration
    Logger.info('Detection cache cleared');
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics() {
    return await this.cacheManager.getStatistics();
  }

  private generateCacheKey(config: UnifiedDetectionConfig): string {
    return `unified_detection_${JSON.stringify(config)}`;
  }

  /**
   * Clear all detection caches
   */
  async clearCaches(): Promise<void> {
    await this.cacheManager.clear();
    this.schemaIntrospector.clearCache();
    Logger.info('🧹 All detection caches cleared');
  }

  /**
   * Get quick detection summary for performance-critical scenarios
   */
  async getQuickDetectionSummary(): Promise<{
    architectureType: PlatformArchitectureType;
    confidence: number;
    isFrameworkDetected: boolean;
    executionTime: number;
  }> {
    const startTime = Date.now();
    
    // Use cached schema introspection if available
    let schemaResult = this.schemaIntrospector.getCachedResult();
    if (!schemaResult) {
      schemaResult = await this.schemaIntrospector.introspectSchema();
    }

    // Quick architecture detection with fast strategy
    const detectionContext = this.buildDetectionContext(schemaResult, {
      isMakerKit: false,
      confidence: 0,
      detectedFeatures: [],
      missingFeatures: [],
      recommendations: []
    });

    const architectureResult = await this.architectureDetector.detectArchitecture(
      detectionContext,
      { strategy: 'fast', maxExecutionTime: 5000 }
    );

    const executionTime = Date.now() - startTime;

    return {
      architectureType: architectureResult.architectureType,
      confidence: architectureResult.confidence,
      isFrameworkDetected: schemaResult.framework.confidence > 0.5,
      executionTime
    };
  }
}

/**
 * Default configuration for unified detection
 */
export const DEFAULT_UNIFIED_DETECTION_CONFIG: UnifiedDetectionConfig = {
  enableCrossValidation: true,
  enableConflictResolution: true,
  maxExecutionTime: 30000,
  enableCaching: true,
  confidenceThreshold: 0.6,
  architecture: {
    strategy: 'comprehensive',
    confidenceThreshold: 0.6,
    includeDetailedEvidence: true,
    analyzeBusinessLogic: false,
    analyzeRLSPolicies: false,
    deepRelationshipAnalysis: true,
    maxExecutionTime: 15000,
    useCaching: true
  }
};