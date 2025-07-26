/**
 * Domain Extension Types and Interfaces for Epic 3: Pluggable Domain Extension System
 * Core type definitions for domain extension framework and plugin architecture
 * Part of Task 3.1.1: Create abstract DomainExtension base class and extension types (FR-3.1)
 */

import type { createClient } from '@supabase/supabase-js';
import type { FlexibleSeedConfig } from '../config-types';
import type { ContentDomainType, PlatformArchitectureType } from '../detection/detection-types';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Extension execution priority levels
 */
export type ExtensionPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Extension lifecycle states
 */
export type ExtensionLifecycleState = 
  | 'unloaded' 
  | 'loading' 
  | 'loaded' 
  | 'initializing' 
  | 'initialized' 
  | 'active' 
  | 'inactive' 
  | 'error' 
  | 'unloading';

/**
 * Extension dependency types
 */
export type ExtensionDependencyType = 'required' | 'optional' | 'conflicting';

/**
 * Platform context for extension execution
 */
export interface PlatformContext {
  /** Database client */
  client: SupabaseClient;
  
  /** Seed configuration */
  config: FlexibleSeedConfig;
  
  /** Detected platform architecture */
  architecture: PlatformArchitectureType;
  
  /** Detected content domain */
  domain: ContentDomainType;
  
  /** Schema information */
  schema: {
    tables: string[];
    relationships: Record<string, string[]>;
    constraints: Record<string, any[]>;
  };
  
  /** User generation context */
  userContext: {
    userCount: number;
    currentUserIndex: number;
    existingUsers: any[];
    teamAssignments?: Record<string, string[]>;
  };
  
  /** Content generation context */
  contentContext: {
    setupsPerUser: number;
    imagesPerSetup: number;
    enableRealImages: boolean;
    existingContent: Record<string, any[]>;
  };
  
  /** Extension execution metadata */
  executionMetadata: {
    batchId: string;
    timestamp: number;
    parentExtensions: string[];
    executionId: string;
  };
}

/**
 * Extension dependency specification
 */
export interface ExtensionDependency {
  /** Extension name */
  extensionName: string;
  
  /** Dependency type */
  type: ExtensionDependencyType;
  
  /** Required version (semver pattern) */
  version?: string;
  
  /** Reason for dependency */
  reason: string;
  
  /** Whether dependency is optional */
  optional: boolean;
}

/**
 * Extension configuration schema
 */
export interface ExtensionConfig {
  /** Extension-specific settings */
  settings: Record<string, any>;
  
  /** Whether extension is enabled */
  enabled: boolean;
  
  /** Extension priority level */
  priority: ExtensionPriority;
  
  /** Extension dependencies */
  dependencies: ExtensionDependency[];
  
  /** Extension metadata */
  metadata: {
    version: string;
    author: string;
    description: string;
    tags: string[];
    compatibleDomains: ContentDomainType[];
    compatibleArchitectures: PlatformArchitectureType[];
  };
  
  /** Performance constraints */
  constraints: {
    maxExecutionTime: number; // milliseconds
    maxMemoryUsage: number;   // MB
    maxConcurrency: number;   // parallel operations
  };
  
  /** Debug and monitoring settings */
  debug: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableProfiling: boolean;
    saveMetrics: boolean;
  };
}

/**
 * User archetype definition for domain extensions
 */
export interface UserArchetype {
  /** Unique archetype identifier */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Archetype description */
  description: string;
  
  /** Email pattern or specific email */
  email: string;
  
  /** User role */
  role: string;
  
  /** Archetype purpose and behavior */
  purpose: string;
  
  /** Content generation patterns */
  contentPattern: {
    /** Number of setups/items to create */
    setupsPerUser?: number;
    /** Items per setup */
    itemsPerSetup?: number;
    /** Ratio of public vs private content */
    publicRatio?: number;
    /** Content categories to focus on */
    preferredCategories?: string[];
    /** Special behaviors */
    behaviors?: string[];
  };
  
  /** Collaboration patterns (for team platforms) */
  collaborationPattern?: {
    /** Team leadership tendency */
    leadershipLevel?: 'none' | 'member' | 'lead' | 'admin';
    /** Collaboration frequency */
    collaborationFrequency?: 'low' | 'medium' | 'high';
    /** Cross-team interactions */
    crossTeamInteraction?: boolean;
    /** Preferred communication style */
    communicationStyle?: 'formal' | 'casual' | 'mixed';
  };
  
  /** Platform-specific context */
  platformContext: {
    /** Platform architecture compatibility */
    architectures: PlatformArchitectureType[];
    /** Domain compatibility */
    domains: ContentDomainType[];
    /** Weight for random selection */
    weight: number;
  };
  
  /** Demographic and profile data */
  profile: {
    /** Name generation pattern */
    namePattern?: string;
    /** Bio/description pattern */
    bioPattern?: string;
    /** Profile image preferences */
    imagePreferences?: {
      style: 'professional' | 'casual' | 'adventure' | 'creative';
      categories: string[];
    };
    /** Location preferences */
    locationPattern?: string;
  };
}

/**
 * Storage configuration for domain extensions
 */
export interface StorageConfig {
  /** Storage bucket configurations */
  buckets: {
    /** Primary content bucket */
    primary: {
      name: string;
      public: boolean;
      allowedFileTypes: string[];
      maxFileSize: number;
    };
    
    /** Secondary buckets for specific content types */
    secondary?: Array<{
      name: string;
      purpose: string;
      public: boolean;
      allowedFileTypes: string[];
      maxFileSize: number;
    }>;
  };
  
  /** File organization patterns */
  organization: {
    /** Directory structure pattern */
    directoryPattern: string;
    /** File naming convention */
    fileNamingPattern: string;
    /** Metadata to store with files */
    metadataFields: string[];
  };
  
  /** Content generation preferences */
  contentGeneration: {
    /** Whether to generate real images */
    generateRealImages: boolean;
    /** Image generation sources */
    imageSources: string[];
    /** File type preferences */
    preferredFileTypes: string[];
    /** Quality settings */
    qualitySettings: {
      images: 'low' | 'medium' | 'high';
      thumbnails: 'low' | 'medium' | 'high';
    };
  };
  
  /** Access control patterns */
  accessControl: {
    /** Default file permissions */
    defaultPermissions: 'public' | 'private' | 'authenticated';
    /** RLS policy patterns */
    rlsPolicyPattern: string;
    /** User-specific access rules */
    userAccessRules: Array<{
      role: string;
      permissions: string[];
    }>;
  };
}

/**
 * Domain-specific content generated by extensions
 */
export interface DomainContent {
  /** Primary content items */
  primary: {
    /** Content type name */
    type: string;
    /** Generated items */
    items: any[];
    /** Relationships to other content */
    relationships: Record<string, string[]>;
  };
  
  /** Secondary content items */
  secondary?: Array<{
    type: string;
    items: any[];
    relationships: Record<string, string[]>;
  }>;
  
  /** Generated media files */
  media?: {
    /** Images with metadata */
    images: Array<{
      filename: string;
      bucket: string;
      path: string;
      metadata: Record<string, any>;
    }>;
    
    /** Other file types */
    files: Array<{
      filename: string;
      bucket: string;
      path: string;
      type: string;
      metadata: Record<string, any>;
    }>;
  };
  
  /** Content generation metadata */
  metadata: {
    /** Extension that generated content */
    generatedBy: string;
    /** Generation timestamp */
    generatedAt: number;
    /** Content version */
    version: string;
    /** Quality metrics */
    quality: {
      realism: number;
      consistency: number;
      completeness: number;
    };
    /** Performance metrics */
    performance: {
      generationTime: number;
      memoryUsed: number;
      dbOperations: number;
    };
  };
}

/**
 * Extension execution result
 */
export interface ExtensionExecutionResult {
  /** Whether execution was successful */
  success: boolean;
  
  /** Generated domain content */
  content?: DomainContent;
  
  /** Generated user archetypes */
  archetypes?: UserArchetype[];
  
  /** Storage configuration used */
  storageConfig?: StorageConfig;
  
  /** Execution metadata */
  execution: {
    /** Extension name */
    extensionName: string;
    /** Execution duration */
    duration: number;
    /** Resources used */
    resourceUsage: {
      memory: number;
      cpu: number;
      database: number;
    };
    /** Operations performed */
    operations: Array<{
      type: string;
      description: string;
      duration: number;
      success: boolean;
    }>;
  };
  
  /** Any errors that occurred */
  errors: Array<{
    code: string;
    message: string;
    severity: 'warning' | 'error' | 'critical';
    context?: Record<string, any>;
  }>;
  
  /** Warnings and recommendations */
  warnings: string[];
  
  /** Debug information */
  debug?: {
    stackTrace?: string;
    variables?: Record<string, any>;
    profiling?: Record<string, number>;
  };
}

/**
 * Extension validation result
 */
export interface ExtensionValidationResult {
  /** Whether extension is valid */
  valid: boolean;
  
  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  
  /** Configuration warnings */
  warnings: string[];
  
  /** Compatibility checks */
  compatibility: {
    /** Domain compatibility */
    domains: {
      compatible: ContentDomainType[];
      incompatible: ContentDomainType[];
      warnings: string[];
    };
    /** Architecture compatibility */
    architectures: {
      compatible: PlatformArchitectureType[];
      incompatible: PlatformArchitectureType[];
      warnings: string[];
    };
    /** Dependency resolution */
    dependencies: {
      resolved: ExtensionDependency[];
      unresolved: ExtensionDependency[];
      conflicts: ExtensionDependency[];
    };
  };
  
  /** Performance analysis */
  performance: {
    /** Estimated memory usage */
    estimatedMemory: number;
    /** Estimated execution time */
    estimatedExecutionTime: number;
    /** Resource usage warnings */
    resourceWarnings: string[];
  };
  
  /** Security analysis */
  security: {
    /** Security risks identified */
    risks: Array<{
      level: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      mitigation: string;
    }>;
    /** Permission requirements */
    permissions: string[];
    /** Data access patterns */
    dataAccess: string[];
  };
}

/**
 * Extension registry entry
 */
export interface ExtensionRegistryEntry {
  /** Extension identifier */
  id: string;
  
  /** Extension name */
  name: string;
  
  /** Extension class constructor */
  extensionClass: new (config: ExtensionConfig) => DomainExtension;
  
  /** Extension configuration */
  config: ExtensionConfig;
  
  /** Extension instance (if loaded) */
  instance?: DomainExtension;
  
  /** Current lifecycle state */
  state: ExtensionLifecycleState;
  
  /** Registration timestamp */
  registeredAt: number;
  
  /** Last execution timestamp */
  lastExecutedAt?: number;
  
  /** Execution statistics */
  statistics: {
    /** Total executions */
    totalExecutions: number;
    /** Successful executions */
    successfulExecutions: number;
    /** Failed executions */
    failedExecutions: number;
    /** Average execution time */
    averageExecutionTime: number;
    /** Average memory usage */
    averageMemoryUsage: number;
  };
  
  /** Extension validation result */
  validation: ExtensionValidationResult;
}

/**
 * Domain extension health status
 */
export interface ExtensionHealthStatus {
  /** Extension identifier */
  extensionId: string;
  
  /** Overall health status */
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  
  /** Health checks */
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message: string;
    lastChecked: number;
    nextCheck: number;
  }>;
  
  /** Performance metrics */
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    memoryUsage: number;
  };
  
  /** Recent issues */
  recentIssues: Array<{
    timestamp: number;
    severity: 'warning' | 'error' | 'critical';
    message: string;
    resolved: boolean;
  }>;
  
  /** Health summary */
  summary: {
    uptime: number;
    lastFailure?: number;
    totalFailures: number;
    recoveryTime: number;
  };
}

/**
 * Extension conflict resolution strategy
 */
export type ExtensionConflictResolution = 
  | 'priority-based'    // Higher priority extension wins
  | 'first-registered'  // First registered extension wins
  | 'last-registered'   // Last registered extension wins
  | 'merge-content'     // Attempt to merge content from both
  | 'user-choice'       // Prompt user to choose
  | 'disable-conflicting'; // Disable conflicting extensions

/**
 * Extension conflict definition
 */
export interface ExtensionConflict {
  /** Conflict type */
  type: 'dependency' | 'resource' | 'domain' | 'functionality';
  
  /** Extensions involved in conflict */
  extensions: string[];
  
  /** Conflict description */
  description: string;
  
  /** Severity of conflict */
  severity: 'low' | 'medium' | 'high' | 'blocking';
  
  /** Possible resolutions */
  possibleResolutions: ExtensionConflictResolution[];
  
  /** Recommended resolution */
  recommendedResolution: ExtensionConflictResolution;
  
  /** Auto-resolvable */
  autoResolvable: boolean;
}

/**
 * Abstract base class for domain extensions
 * This class must be implemented by all domain extensions
 */
export abstract class DomainExtension {
  /** Extension name (must be unique) */
  abstract readonly name: string;
  
  /** Extension version */
  abstract readonly version: string;
  
  /** Extension description */
  abstract readonly description: string;
  
  /** Supported domains */
  abstract readonly supportedDomains: ContentDomainType[];
  
  /** Supported architectures */
  abstract readonly supportedArchitectures: PlatformArchitectureType[];
  
  /** Extension configuration */
  protected config: ExtensionConfig;
  
  /** Extension lifecycle state */
  protected state: ExtensionLifecycleState = 'unloaded';
  
  constructor(config: ExtensionConfig) {
    this.config = config;
  }
  
  /**
   * Detect domain compatibility and confidence score
   * @param context Platform context for detection
   * @returns Confidence score (0-1) for domain compatibility
   */
  abstract detectDomain(context: PlatformContext): Promise<number>;
  
  /**
   * Generate domain-specific content
   * @param context Platform context for content generation
   * @returns Generated domain content
   */
  abstract generateContent(context: PlatformContext): Promise<DomainContent>;
  
  /**
   * Get user archetypes for this domain
   * @param context Platform context
   * @returns Array of user archetypes
   */
  abstract getUserArchetypes(context: PlatformContext): Promise<UserArchetype[]>;
  
  /**
   * Get storage configuration for this domain
   * @param context Platform context
   * @returns Storage configuration
   */
  abstract getStorageConfig(context: PlatformContext): Promise<StorageConfig>;
  
  /**
   * Initialize extension (called during loading)
   * @param context Platform context
   */
  async initialize(context: PlatformContext): Promise<void> {
    this.state = 'initializing';
    await this.performInitialization(context);
    this.state = 'initialized';
  }
  
  /**
   * Cleanup extension resources (called during unloading)
   */
  async cleanup(): Promise<void> {
    this.state = 'unloading';
    await this.performCleanup();
    this.state = 'unloaded';
  }
  
  /**
   * Validate extension configuration
   * @returns Validation result
   */
  async validate(): Promise<ExtensionValidationResult> {
    return await this.performValidation();
  }
  
  /**
   * Get extension health status
   * @returns Health status
   */
  async getHealthStatus(): Promise<ExtensionHealthStatus> {
    return await this.performHealthCheck();
  }
  
  /**
   * Get current lifecycle state
   */
  getState(): ExtensionLifecycleState {
    return this.state;
  }
  
  /**
   * Get extension configuration
   */
  getConfig(): ExtensionConfig {
    return { ...this.config };
  }
  
  /**
   * Update extension configuration
   * @param newConfig New configuration to apply
   */
  async updateConfig(newConfig: Partial<ExtensionConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.onConfigurationUpdated(newConfig);
  }
  
  // Protected methods that subclasses can override
  
  /**
   * Perform extension-specific initialization
   * @param context Platform context
   */
  protected async performInitialization(context: PlatformContext): Promise<void> {
    // Default implementation - override in subclasses
  }
  
  /**
   * Perform extension-specific cleanup
   */
  protected async performCleanup(): Promise<void> {
    // Default implementation - override in subclasses
  }
  
  /**
   * Perform extension validation
   * @returns Validation result
   */
  protected async performValidation(): Promise<ExtensionValidationResult> {
    // Default validation - override in subclasses for custom validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      compatibility: {
        domains: {
          compatible: this.supportedDomains,
          incompatible: [],
          warnings: []
        },
        architectures: {
          compatible: this.supportedArchitectures,
          incompatible: [],
          warnings: []
        },
        dependencies: {
          resolved: this.config.dependencies.filter(d => !d.optional),
          unresolved: [],
          conflicts: []
        }
      },
      performance: {
        estimatedMemory: this.config.constraints.maxMemoryUsage,
        estimatedExecutionTime: this.config.constraints.maxExecutionTime,
        resourceWarnings: []
      },
      security: {
        risks: [],
        permissions: [],
        dataAccess: []
      }
    };
  }
  
  /**
   * Perform health check
   * @returns Health status
   */
  protected async performHealthCheck(): Promise<ExtensionHealthStatus> {
    // Default health check - override in subclasses
    const now = Date.now();
    return {
      extensionId: this.name,
      status: this.state === 'active' ? 'healthy' : 'warning',
      checks: [
        {
          name: 'Extension State',
          status: this.state === 'active' ? 'pass' : 'warning',
          message: `Extension state: ${this.state}`,
          lastChecked: now,
          nextCheck: now + 300000 // 5 minutes
        }
      ],
      performance: {
        responseTime: 0,
        throughput: 0,
        errorRate: 0,
        memoryUsage: 0
      },
      recentIssues: [],
      summary: {
        uptime: 0,
        totalFailures: 0,
        recoveryTime: 0
      }
    };
  }
  
  /**
   * Handle configuration updates
   * @param updatedConfig Updated configuration
   */
  protected async onConfigurationUpdated(updatedConfig: Partial<ExtensionConfig>): Promise<void> {
    // Default implementation - override in subclasses
  }
}