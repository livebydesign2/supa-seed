/**
 * Detection Types and Interfaces for Epic 2: Smart Platform Detection Engine
 * Core type definitions for platform architecture and domain detection system
 * Part of Task 2.1.1: Create core detection types and interfaces
 */

/**
 * Platform architecture types that can be detected
 */
export type PlatformArchitectureType = 'individual' | 'team' | 'hybrid';

/**
 * Content domain types for domain-specific detection
 */
export type ContentDomainType = 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';

/**
 * Evidence types for supporting detection decisions
 */
export type EvidenceType = 
  | 'table_pattern' 
  | 'column_analysis' 
  | 'relationship_pattern' 
  | 'constraint_pattern'
  | 'function_analysis'
  | 'naming_convention'
  | 'data_pattern'
  | 'business_logic';

/**
 * Confidence levels for detection results
 */
export type ConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

/**
 * Platform feature categories for detailed analysis
 */
export type PlatformFeatureCategory = 
  | 'authentication'
  | 'user_management'
  | 'content_creation'
  | 'collaboration'
  | 'organization'
  | 'billing'
  | 'media'
  | 'communication'
  | 'analytics'
  | 'customization';

/**
 * Detection strategies for different analysis approaches
 */
export type DetectionStrategy = 'comprehensive' | 'fast' | 'conservative' | 'aggressive';

/**
 * Evidence supporting an architecture detection decision
 */
export interface ArchitectureEvidence {
  /** Type of evidence found */
  type: EvidenceType;
  
  /** Human-readable description of the evidence */
  description: string;
  
  /** Confidence in this piece of evidence (0-1) */
  confidence: number;
  
  /** Weight of this evidence in overall decision (0-1) */
  weight: number;
  
  /** Supporting data for the evidence */
  supportingData: {
    /** Table names involved */
    tables?: string[];
    /** Column names involved */
    columns?: string[];
    /** Constraint names involved */
    constraints?: string[];
    /** Pattern matches */
    patterns?: string[];
    /** Raw data samples */
    samples?: any[];
  };
  
  /** How this evidence points to specific architecture */
  architectureIndicators: {
    individual: number; // 0-1 strength
    team: number;       // 0-1 strength
    hybrid: number;     // 0-1 strength
  };
}

/**
 * Platform feature detected in the schema
 */
export interface PlatformFeature {
  /** Feature identifier */
  id: string;
  
  /** Feature name */
  name: string;
  
  /** Feature category */
  category: PlatformFeatureCategory;
  
  /** Whether the feature is present */
  present: boolean;
  
  /** Confidence in feature detection (0-1) */
  confidence: number;
  
  /** Evidence supporting this feature detection */
  evidence: string[];
  
  /** Tables that implement this feature */
  implementingTables: string[];
  
  /** Architecture types this feature typically indicates */
  typicallyIndicates: PlatformArchitectureType[];
  
  /** Domain types this feature is common in */
  commonInDomains: ContentDomainType[];
}

/**
 * Main result of platform architecture detection
 */
export interface PlatformArchitectureDetectionResult {
  /** Detected architecture type */
  architectureType: PlatformArchitectureType;
  
  /** Overall confidence in detection (0-1) */
  confidence: number;
  
  /** Confidence level category */
  confidenceLevel: ConfidenceLevel;
  
  /** All evidence supporting this detection */
  evidence: ArchitectureEvidence[];
  
  /** Platform features detected */
  platformFeatures: PlatformFeature[];
  
  /** Detailed reasoning for the detection */
  reasoning: string[];
  
  /** Alternative possibilities with their confidence */
  alternatives: Array<{
    architectureType: PlatformArchitectureType;
    confidence: number;
    reasoning: string;
  }>;
  
  /** Recommendations based on detection */
  recommendations: string[];
  
  /** Metrics about the detection process */
  detectionMetrics: {
    /** Time taken for detection (ms) */
    executionTime: number;
    
    /** Number of tables analyzed */
    tablesAnalyzed: number;
    
    /** Number of evidence pieces found */
    evidenceCount: number;
    
    /** Schema complexity score */
    schemaComplexity: number;
    
    /** Detection strategy used */
    strategyUsed: DetectionStrategy;
  };
  
  /** Warnings or issues encountered during detection */
  warnings: string[];
  
  /** Errors that occurred but didn't prevent detection */
  errors: string[];
}

/**
 * Configuration for architecture detection process
 */
export interface ArchitectureDetectionConfig {
  /** Detection strategy to use */
  strategy: DetectionStrategy;
  
  /** Minimum confidence threshold for definitive results */
  confidenceThreshold: number;
  
  /** Whether to include detailed evidence in results */
  includeDetailedEvidence: boolean;
  
  /** Whether to analyze business logic functions */
  analyzeBusinessLogic: boolean;
  
  /** Whether to analyze RLS policies */
  analyzeRLSPolicies: boolean;
  
  /** Whether to perform deep relationship analysis */
  deepRelationshipAnalysis: boolean;
  
  /** Tables to exclude from analysis */
  excludeTables: string[];
  
  /** Tables to focus analysis on */
  focusTables?: string[];
  
  /** Maximum time to spend on detection (ms) */
  maxExecutionTime: number;
  
  /** Whether to use cached detection results */
  useCaching: boolean;
  
  /** Manual overrides for detection */
  manualOverrides?: {
    /** Force specific architecture type */
    architectureType?: PlatformArchitectureType;
    
    /** Force specific features to be present/absent */
    forcePlatformFeatures?: Record<string, boolean>;
    
    /** Add custom evidence */
    customEvidence?: ArchitectureEvidence[];
  };
}

/**
 * Pattern matching rule for architecture detection
 */
export interface ArchitecturePattern {
  /** Pattern identifier */
  id: string;
  
  /** Pattern name */
  name: string;
  
  /** Pattern description */
  description: string;
  
  /** Architecture types this pattern indicates */
  indicatesArchitecture: PlatformArchitectureType[];
  
  /** Confidence boost when pattern matches (0-1) */
  confidenceWeight: number;
  
  /** Table name patterns to match */
  tablePatterns: string[];
  
  /** Column name patterns to match */
  columnPatterns: string[];
  
  /** Constraint patterns to match */
  constraintPatterns: string[];
  
  /** Relationship patterns to match */
  relationshipPatterns: Array<{
    fromTable: string;
    toTable: string;
    type: 'one_to_one' | 'one_to_many' | 'many_to_many';
  }>;
  
  /** Function patterns to match */
  functionPatterns: string[];
  
  /** Minimum matches required for pattern to be valid */
  minimumMatches: number;
  
  /** Whether this pattern is exclusive to certain architectures */
  exclusive: boolean;
}

/**
 * Individual creator platform patterns
 */
export interface IndividualPlatformIndicators {
  /** User-centric table patterns */
  userCentricTables: string[];
  
  /** Content creation focused tables */
  contentFocusedTables: string[];
  
  /** Simple account structures */
  simpleAccountPatterns: string[];
  
  /** Limited collaboration indicators */
  limitedCollaboration: string[];
  
  /** Personal profile emphasis */
  personalProfilePatterns: string[];
}

/**
 * Team collaboration platform patterns
 */
export interface TeamPlatformIndicators {
  /** Team/organization table patterns */
  teamOrganizationTables: string[];
  
  /** Member management structures */
  memberManagementTables: string[];
  
  /** Workspace/project patterns */
  workspaceProjectTables: string[];
  
  /** Complex permission systems */
  permissionSystemTables: string[];
  
  /** Collaboration features */
  collaborationTables: string[];
  
  /** Role hierarchy patterns */
  roleHierarchyPatterns: string[];
}

/**
 * Hybrid platform patterns combining individual and team features
 */
export interface HybridPlatformIndicators {
  /** Flexible account structures */
  flexibleAccountTables: string[];
  
  /** Mixed content ownership */
  mixedOwnershipPatterns: string[];
  
  /** Scalable permission systems */
  scalablePermissionTables: string[];
  
  /** Both individual and team capabilities */
  dualCapabilityTables: string[];
  
  /** Context-switching features */
  contextSwitchingPatterns: string[];
}

/**
 * Analysis context for detection process
 */
export interface DetectionAnalysisContext {
  /** Schema information being analyzed */
  schema: {
    /** Total number of tables */
    tableCount: number;
    
    /** Table names */
    tableNames: string[];
    
    /** Relationships between tables */
    relationships: Array<{
      fromTable: string;
      toTable: string;
      type: string;
      columnName: string;
    }>;
    
    /** Constraints present */
    constraints: Array<{
      tableName: string;
      constraintName: string;
      type: string;
    }>;
  };
  
  /** Framework information if detected */
  framework?: {
    type: string;
    version?: string;
    confidence: number;
  };
  
  /** Business logic information */
  businessLogic?: {
    functions: string[];
    triggers: string[];
    policies: string[];
  };
  
  /** Existing detection results to build upon */
  existingResults?: {
    frameworkDetection?: any;
    multiTenantDetection?: any;
    businessLogicAnalysis?: any;
  };
}

/**
 * Result of pattern analysis
 */
export interface PatternAnalysisResult {
  /** Pattern that was analyzed */
  pattern: ArchitecturePattern;
  
  /** Whether the pattern matched */
  matched: boolean;
  
  /** Confidence in the match (0-1) */
  matchConfidence: number;
  
  /** Details about what matched */
  matchDetails: {
    /** Tables that matched */
    matchedTables: string[];
    
    /** Columns that matched */
    matchedColumns: string[];
    
    /** Constraints that matched */
    matchedConstraints: string[];
    
    /** Relationships that matched */
    matchedRelationships: string[];
    
    /** Functions that matched */
    matchedFunctions: string[];
  };
  
  /** What the pattern indicates */
  architectureIndication: {
    type: PlatformArchitectureType;
    confidence: number;
    reasoning: string;
  };
}

/**
 * Cache entry for detection results
 */
export interface DetectionCacheEntry {
  /** Schema hash for cache validation */
  schemaHash: string;
  
  /** Detection result */
  result: PlatformArchitectureDetectionResult;
  
  /** Timestamp when cached */
  timestamp: number;
  
  /** Detection config used */
  config: ArchitectureDetectionConfig;
  
  /** Time to live (ms) */
  ttl: number;
}

/**
 * Override validation result
 */
export interface OverrideValidationResult {
  /** Whether the override is valid */
  isValid: boolean;
  
  /** Warnings about the override */
  warnings: string[];
  
  /** Conflicts with detected evidence */
  conflicts: Array<{
    evidenceType: EvidenceType;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  /** Recommendations for the override */
  recommendations: string[];
}

/**
 * Detection statistics for monitoring and optimization
 */
export interface DetectionStatistics {
  /** Total detections performed */
  totalDetections: number;
  
  /** Detection results by architecture type */
  resultsByArchitecture: Record<PlatformArchitectureType, number>;
  
  /** Average detection time */
  averageDetectionTime: number;
  
  /** Average confidence scores */
  averageConfidence: number;
  
  /** Cache hit rate */
  cacheHitRate: number;
  
  /** Most common evidence types */
  commonEvidenceTypes: Record<EvidenceType, number>;
  
  /** Error rates by detection stage */
  errorRates: Record<string, number>;
  
  /** Performance metrics */
  performanceMetrics: {
    fastestDetection: number;
    slowestDetection: number;
    memoryUsage: number;
  };
}

/**
 * Export commonly used type unions
 */
export type DetectionResultType = PlatformArchitectureDetectionResult;
export type DetectionConfigType = ArchitectureDetectionConfig;
export type ArchitectureEvidenceType = ArchitectureEvidence;
export type PlatformFeatureType = PlatformFeature;