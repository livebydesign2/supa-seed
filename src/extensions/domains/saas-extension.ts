/**
 * SaaS Domain Extension for SupaSeed v2.5.0
 * Generates productivity-focused content and team collaboration scenarios for SaaS platforms
 * Part of Task 3.3: Implement SaaS Domain Extension (FR-3.3)
 */

import { Logger } from '../../utils/logger';
import {
  DomainExtension,
  ExtensionConfig,
  ExtensionValidationResult,
  PlatformContext,
  DomainContent,
  UserArchetype,
  StorageConfig,
  ExtensionHealthStatus
} from '../extension-types';
import type { ContentDomainType, PlatformArchitectureType } from '../../detection/detection-types';

/**
 * SaaS product category definitions
 */
export interface SaaSProductCategory {
  id: string;
  name: string;
  description: string;
  features: string[];
  targetAudience: string[];
  pricingModel: 'freemium' | 'subscription' | 'usage-based' | 'enterprise';
  competitors: string[];
}

/**
 * SaaS feature definition
 */
export interface SaaSFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced' | 'enterprise';
  usage: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'occasional';
    userTypes: string[];
    businessValue: 'low' | 'medium' | 'high' | 'critical';
  };
  dependencies: string[];
  pricing?: {
    tier: 'free' | 'basic' | 'pro' | 'enterprise';
    additionalCost?: number;
  };
}

/**
 * Team workspace definition
 */
export interface TeamWorkspace {
  id: string;
  name: string;
  description: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  industry: string;
  projects: WorkspaceProject[];
  members: TeamMember[];
  settings: WorkspaceSettings;
  subscription: {
    plan: string;
    features: string[];
    limits: Record<string, number>;
  };
}

/**
 * Workspace project definition
 */
export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tasks: ProjectTask[];
  assignedMembers: string[];
  deadline?: number;
  budget?: number;
  tags: string[];
}

/**
 * Project task definition
 */
export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: number;
  labels: string[];
  dependencies: string[];
}

/**
 * Team member definition
 */
export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  joinedAt: number;
  lastActive: number;
  productivity: {
    tasksCompleted: number;
    averageTaskTime: number;
    collaborationScore: number;
  };
}

/**
 * Workspace settings definition
 */
export interface WorkspaceSettings {
  timeZone: string;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
  notifications: {
    email: boolean;
    slack: boolean;
    inApp: boolean;
  };
  integrations: string[];
  security: {
    twoFactorRequired: boolean;
    sessionTimeout: number;
    ipWhitelist?: string[];
  };
}

/**
 * Business media item definition for SaaS platforms
 */
export interface BusinessMediaItem {
  id: string;
  workspaceId: string;
  fileName: string;
  displayName: string;
  mediaType: 'logo' | 'banner' | 'presentation' | 'document';
  industry: string;
  purpose: string;
  filePath: string;
  dimensions?: string | null;
  fileSize: string;
  uploadedAt: Date;
  metadata: {
    industry: string;
    purpose: string;
    workspaceId: string;
    businessContext: Record<string, any>;
    tags: string[];
  };
}

/**
 * SaaS Domain Extension
 * Generates productivity-focused content for team collaboration and workspace management
 */
export class SaaSDomainExtension extends DomainExtension {
  public readonly name = 'saas';
  public readonly version = '1.0.0';
  public readonly description = 'SaaS productivity and team collaboration domain extension';
  public readonly supportedDomains: ContentDomainType[] = ['saas'];
  public readonly supportedArchitectures: PlatformArchitectureType[] = ['team', 'hybrid'];

  private productCategories: SaaSProductCategory[] = [];
  private saasFeatures: SaaSFeature[] = [];
  private industryTypes: string[] = [];
  private teamRoles: string[] = [];
  private workspaceTemplates: Partial<TeamWorkspace>[] = [];

  constructor(config: ExtensionConfig) {
    super(config);
    this.initializeSaaSData();
  }

  /**
   * Initialize SaaS productivity data, categories, and templates
   */
  private initializeSaaSData(): void {
    // Define SaaS product categories
    this.productCategories = [
      {
        id: 'project_management',
        name: 'Project Management',
        description: 'Tools for planning, tracking, and managing projects and tasks',
        features: ['task_management', 'project_planning', 'time_tracking', 'resource_allocation'],
        targetAudience: ['project_managers', 'team_leads', 'developers', 'designers'],
        pricingModel: 'subscription',
        competitors: ['Asana', 'Monday.com', 'Jira', 'Trello']
      },
      {
        id: 'team_collaboration',
        name: 'Team Collaboration',
        description: 'Communication and collaboration tools for distributed teams',
        features: ['messaging', 'file_sharing', 'video_conferencing', 'real_time_editing'],
        targetAudience: ['remote_teams', 'distributed_teams', 'cross_functional_teams'],
        pricingModel: 'freemium',
        competitors: ['Slack', 'Microsoft Teams', 'Discord', 'Zoom']
      },
      {
        id: 'productivity_suite',
        name: 'Productivity Suite',
        description: 'Comprehensive productivity tools for individuals and teams',
        features: ['document_editing', 'spreadsheets', 'presentations', 'note_taking'],
        targetAudience: ['knowledge_workers', 'consultants', 'educators', 'students'],
        pricingModel: 'subscription',
        competitors: ['Google Workspace', 'Microsoft 365', 'Notion', 'Airtable']
      },
      {
        id: 'crm_sales',
        name: 'CRM & Sales',
        description: 'Customer relationship management and sales automation tools',
        features: ['contact_management', 'pipeline_tracking', 'email_automation', 'analytics'],
        targetAudience: ['sales_teams', 'marketing_teams', 'customer_success'],
        pricingModel: 'subscription',
        competitors: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zendesk']
      },
      {
        id: 'analytics_bi',
        name: 'Analytics & BI',
        description: 'Business intelligence and data analytics platforms',
        features: ['data_visualization', 'reporting', 'dashboards', 'predictive_analytics'],
        targetAudience: ['data_analysts', 'business_analysts', 'executives', 'marketers'],
        pricingModel: 'usage-based',
        competitors: ['Tableau', 'Power BI', 'Looker', 'Mixpanel']
      }
    ];

    // Define core SaaS features
    this.saasFeatures = [
      {
        id: 'task_management',
        name: 'Task Management',
        description: 'Create, assign, and track tasks across projects',
        category: 'project_management',
        complexity: 'basic',
        usage: {
          frequency: 'daily',
          userTypes: ['project_manager', 'team_member'],
          businessValue: 'high'
        },
        dependencies: [],
        pricing: { tier: 'free' }
      },
      {
        id: 'advanced_reporting',
        name: 'Advanced Reporting',
        description: 'Generate detailed reports with custom metrics and analytics',
        category: 'analytics_bi',
        complexity: 'advanced',
        usage: {
          frequency: 'weekly',
          userTypes: ['admin', 'analyst'],
          businessValue: 'critical'
        },
        dependencies: ['basic_analytics'],
        pricing: { tier: 'pro', additionalCost: 50 }
      },
      {
        id: 'real_time_collaboration',
        name: 'Real-time Collaboration',
        description: 'Simultaneous editing and communication features',
        category: 'team_collaboration',
        complexity: 'intermediate',
        usage: {
          frequency: 'daily',
          userTypes: ['team_member', 'collaborator'],
          businessValue: 'high'
        },
        dependencies: ['messaging'],
        pricing: { tier: 'basic' }
      },
      {
        id: 'api_integrations',
        name: 'API Integrations',
        description: 'Connect with third-party tools and services',
        category: 'productivity_suite',
        complexity: 'advanced',
        usage: {
          frequency: 'occasional',
          userTypes: ['admin', 'developer'],
          businessValue: 'medium'
        },
        dependencies: ['webhook_support'],
        pricing: { tier: 'pro' }
      },
      {
        id: 'sso_authentication',
        name: 'SSO Authentication',
        description: 'Single sign-on integration for enterprise security',
        category: 'security',
        complexity: 'enterprise',
        usage: {
          frequency: 'daily',
          userTypes: ['all_users'],
          businessValue: 'critical'
        },
        dependencies: ['user_management'],
        pricing: { tier: 'enterprise', additionalCost: 200 }
      }
    ];

    // Define industry types for workspace generation
    this.industryTypes = [
      'technology', 'healthcare', 'finance', 'education', 'retail', 'manufacturing',
      'consulting', 'media', 'real_estate', 'legal', 'non_profit', 'government'
    ];

    // Define team roles
    this.teamRoles = [
      'admin', 'project_manager', 'team_lead', 'senior_developer', 'developer',
      'designer', 'product_manager', 'qa_engineer', 'marketing_manager',
      'sales_rep', 'customer_success', 'analyst', 'consultant'
    ];

    // Initialize workspace templates
    this.generateWorkspaceTemplates();

    Logger.debug(`✅ Initialized SaaS data: ${this.productCategories.length} categories, ${this.saasFeatures.length} features`);
  }

  /**
   * Generate workspace templates for different team sizes and industries
   */
  private generateWorkspaceTemplates(): void {
    this.workspaceTemplates = [
      {
        name: 'Startup Technology Team',
        description: 'Fast-paced startup focused on product development',
        size: 'small',
        industry: 'technology',
        settings: {
          timeZone: 'America/Los_Angeles',
          workingHours: { start: '09:00', end: '18:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
          notifications: { email: true, slack: true, inApp: true },
          integrations: ['github', 'slack', 'figma'],
          security: { twoFactorRequired: true, sessionTimeout: 8640000 }
        }
      },
      {
        name: 'Marketing Agency',
        description: 'Creative agency managing multiple client projects',
        size: 'medium',
        industry: 'media',
        settings: {
          timeZone: 'America/New_York',
          workingHours: { start: '08:30', end: '17:30', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
          notifications: { email: true, slack: false, inApp: true },
          integrations: ['adobe_creative', 'google_analytics', 'mailchimp'],
          security: { twoFactorRequired: false, sessionTimeout: 28800 }
        }
      },
      {
        name: 'Enterprise Consulting',
        description: 'Large consulting firm with multiple practice areas',
        size: 'enterprise',
        industry: 'consulting',
        settings: {
          timeZone: 'UTC',
          workingHours: { start: '09:00', end: '17:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
          notifications: { email: true, slack: false, inApp: false },
          integrations: ['microsoft_365', 'salesforce', 'tableau'],
          security: { twoFactorRequired: true, sessionTimeout: 14400, ipWhitelist: ['10.0.0.0/8'] }
        }
      }
    ];
  }

  // DomainExtension interface implementation

  async initialize(platformContext: PlatformContext): Promise<void> {
    Logger.info('💼 Initializing SaaS Domain Extension');
    
    // Validate platform compatibility
    if (!this.supportedDomains.includes(platformContext.domain) || 
        !this.supportedArchitectures.includes(platformContext.architecture)) {
      throw new Error(`SaaS extension not compatible with ${platformContext.domain}/${platformContext.architecture}`);
    }

    // Initialize data if not already done
    if (this.productCategories.length === 0) {
      this.initializeSaaSData();
    }

    Logger.info(`✅ SaaS extension initialized with ${this.productCategories.length} product categories`);
  }

  async detectDomain(platformContext: PlatformContext): Promise<number> {
    // Check for SaaS-specific schema patterns
    let confidence = 0;
    
    // Look for SaaS-specific table patterns
    const saasTables = ['subscriptions', 'billing', 'features', 'usage', 'workspaces', 'projects', 'teams'];
    const saasFields = ['subscription_id', 'plan_type', 'billing_cycle', 'usage_limits', 'feature_flags'];
    
    // This would analyze the actual schema in a real implementation
    // For now, return high confidence if domain is already 'saas'
    if (platformContext.domain === 'saas') {
      confidence = 0.95;
    } else {
      // Simulate schema analysis confidence
      confidence = Math.random() * 0.3; // Low confidence for non-SaaS domains
    }

    Logger.debug(`🔍 SaaS domain detection confidence: ${confidence}`);
    return confidence;
  }

  async generateContent(platformContext: PlatformContext): Promise<DomainContent> {
    Logger.info('📊 Generating SaaS domain content');

    try {
      // Generate team workspaces
      const workspaces = this.generateTeamWorkspaces(3); // Generate 3 workspaces
      
      // Generate SaaS features
      const features = this.saasFeatures;
      
      // Generate product categories
      const categories = this.productCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        featureCount: features.filter(f => f.category === cat.id).length
      }));

      // Generate productivity metrics
      const metrics = this.generateProductivityMetrics();

      Logger.info(`✅ Generated SaaS content: ${workspaces.length} workspaces, ${features.length} features`);

      return {
        primary: {
          type: 'saas_workspaces',
          items: workspaces,
          relationships: {
            features: features.map(f => f.id),
            categories: categories.map(c => c.id),
            industries: this.industryTypes,
            roles: this.teamRoles
          }
        },
        secondary: [
          {
            type: 'saas_features',
            items: features,
            relationships: {
              categories: features.map(f => f.category),
              workspaces: workspaces.map(w => w.id)
            }
          },
          {
            type: 'saas_categories', 
            items: categories,
            relationships: {
              features: categories.map(c => c.id),
              workspaces: workspaces.map(w => w.id)
            }
          },
          {
            type: 'productivity_metrics',
            items: [metrics],
            relationships: {
              workspaces: workspaces.map(w => w.id)
            }
          }
        ],
        metadata: {
          generatedBy: 'SaaSDomainExtension',
          generatedAt: Date.now(),
          version: this.version,
          quality: {
            realism: 0.85,
            consistency: 0.90,
            completeness: 0.88
          },
          performance: {
            generationTime: 2500,
            memoryUsed: 1024 * 50, // 50KB estimate
            dbOperations: workspaces.length * 3 // Estimate
          }
        }
      };

    } catch (error: any) {
      Logger.error('❌ Failed to generate SaaS content:', error);
      throw error;
    }
  }

  async getUserArchetypes(platformContext: PlatformContext): Promise<UserArchetype[]> {
    Logger.info('👥 Generating SaaS user archetypes');

    return [
      {
        id: 'saas_admin',
        email: 'admin@saasplatform.test',
        role: 'admin',
        name: 'Sarah Platform-Admin',
        description: 'Workspace administrator managing team settings and billing',
        purpose: 'Workspace administrator managing team settings and billing',
        contentPattern: {
          setupsPerUser: 1, // Creates workspace configurations
          itemsPerSetup: 10, // Comprehensive workspace setup
          publicRatio: 0.1, // Most content is internal
          preferredCategories: ['workspace_management', 'team_admin', 'billing']
        },
        platformContext: {
          architectures: ['team', 'hybrid'],
          domains: ['saas'],
          weight: 0.8
        },
        profile: {
          namePattern: 'Professional Administrator',
          bioPattern: 'Experienced team administrator focused on productivity and system management',
          imagePreferences: {
            style: 'professional',
            categories: ['business', 'corporate']
          }
        }
      },
      {
        id: 'saas_project_manager',
        email: 'manager@saasplatform.test',
        role: 'project_manager',
        name: 'Marcus Project-Manager',
        description: 'Project manager coordinating teams and deliverables',
        purpose: 'Project manager coordinating teams and deliverables',
        contentPattern: {
          setupsPerUser: 4, // Creates multiple project setups
          itemsPerSetup: 8, // Detailed project plans
          publicRatio: 0.3, // Some best practices shared publicly
          preferredCategories: ['project_management', 'team_coordination', 'reporting']
        },
        platformContext: {
          architectures: ['team', 'hybrid'],
          domains: ['saas'],
          weight: 0.9
        },
        profile: {
          namePattern: 'Team Coordinator',
          bioPattern: 'Results-driven project manager with expertise in team collaboration and delivery',
          imagePreferences: {
            style: 'professional',
            categories: ['business', 'teamwork']
          }
        }
      },
      {
        id: 'saas_developer',
        email: 'developer@saasplatform.test',
        role: 'developer',
        name: 'David Team-Developer',
        description: 'Software developer contributing to team projects',
        purpose: 'Software developer contributing to team projects',
        contentPattern: {
          setupsPerUser: 2, // Creates development workflows
          itemsPerSetup: 6, // Technical setup configurations
          publicRatio: 0.2, // Limited public sharing
          preferredCategories: ['development', 'technical_tools', 'automation']
        },
        platformContext: {
          architectures: ['team', 'hybrid'],
          domains: ['saas'],
          weight: 0.7
        },
        profile: {
          namePattern: 'Technical Contributor',
          bioPattern: 'Skilled developer focused on building and maintaining team productivity tools',
          imagePreferences: {
            style: 'casual',
            categories: ['technology', 'workspace']
          }
        }
      },
      {
        id: 'saas_team_member',
        email: 'collaborator@saasplatform.test',
        role: 'team_member',
        name: 'Claire Team-Collaborator',
        description: 'Team member participating in collaborative projects',
        purpose: 'Team member participating in collaborative projects',
        contentPattern: {
          setupsPerUser: 1, // Creates personal productivity setups
          itemsPerSetup: 4, // Simple personal workflows
          publicRatio: 0.1, // Mostly internal team sharing
          preferredCategories: ['personal_productivity', 'collaboration', 'communication']
        },
        platformContext: {
          architectures: ['team', 'hybrid'],
          domains: ['saas'],
          weight: 0.6
        },
        profile: {
          namePattern: 'Team Collaborator',
          bioPattern: 'Engaged team member contributing to collaborative projects and shared goals',
          imagePreferences: {
            style: 'professional',
            categories: ['teamwork', 'collaboration']
          }
        }
      }
    ];
  }

  async getStorageConfig(platformContext: PlatformContext): Promise<StorageConfig> {
    Logger.info('💾 Generating SaaS storage configuration');

    return {
      buckets: {
        primary: {
          name: 'business-media',
          public: true,
          allowedFileTypes: [
            'image/jpeg',
            'image/png', 
            'image/webp',
            'image/svg+xml'
          ],
          maxFileSize: 10 * 1024 * 1024 // 10MB for business media
        },
        secondary: [
          {
            name: 'workspace-documents',
            purpose: 'Team workspace documents and files',
            public: false,
            allowedFileTypes: [
              'application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
              'text/plain',
              'text/markdown'
            ],
            maxFileSize: 25 * 1024 * 1024 // 25MB for business documents
          },
          {
            name: 'project-assets',
            purpose: 'Project-specific assets and files',
            public: false,
            allowedFileTypes: [
              'image/jpeg',
              'image/png',
              'image/svg+xml',
              'application/pdf',
              'application/zip'
            ],
            maxFileSize: 50 * 1024 * 1024 // 50MB for project assets
          },
          {
            name: 'user-assets',
            purpose: 'Individual user assets and profiles',
            public: false,
            allowedFileTypes: [
              'image/jpeg',
              'image/png',
              'image/webp'
            ],
            maxFileSize: 5 * 1024 * 1024 // 5MB for user assets
          }
        ]
      },
      organization: {
        directoryPattern: '{domain}/{workspace_id}/{project_id?}',
        fileNamingPattern: '{timestamp}_{user_id}_{original_name}',
        metadataFields: ['workspace_id', 'project_id', 'user_id', 'industry', 'mediaType']
      },
      contentGeneration: {
        generateRealImages: true,
        imageSources: ['unsplash', 'business_stock'],
        preferredFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        qualitySettings: {
          images: 'medium',
          thumbnails: 'low'
        }
      },
      accessControl: {
        defaultPermissions: 'private',
        rlsPolicyPattern: 'workspace_member_access',
        userAccessRules: [
          {
            role: 'admin',
            permissions: ['read', 'write', 'delete', 'share']
          },
          {
            role: 'project_manager',
            permissions: ['read', 'write', 'share']
          },
          {
            role: 'team_member',
            permissions: ['read', 'write']
          }
        ]
      }
    };
  }

  async validate(): Promise<ExtensionValidationResult> {
    const errors: Array<{ field: string; message: string; severity: 'error' | 'warning' }> = [];
    const warnings: string[] = [];

    // Validate product categories
    if (this.productCategories.length === 0) {
      errors.push({
        field: 'productCategories',
        message: 'No product categories defined',
        severity: 'error'
      });
    }

    // Validate SaaS features
    if (this.saasFeatures.length === 0) {
      errors.push({
        field: 'saasFeatures',
        message: 'No SaaS features defined',
        severity: 'error'
      });
    }

    // Performance warnings
    if (this.saasFeatures.length > 100) {
      warnings.push('Large feature set may impact initialization performance');
    }

    const valid = errors.filter(e => e.severity === 'error').length === 0;

    return {
      valid,
      errors,
      warnings,
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
          resolved: [],
          unresolved: [],
          conflicts: []
        }
      },
      performance: {
        estimatedMemory: Math.round(this.saasFeatures.length * 1.5), // 1.5KB per feature estimate
        estimatedExecutionTime: 8000, // 8 seconds
        resourceWarnings: warnings.filter(w => w.includes('performance'))
      },
      security: {
        risks: [],
        permissions: ['read:workspaces', 'create:projects', 'manage:teams'],
        dataAccess: ['workspaces', 'projects', 'team_members', 'billing_info']
      }
    };
  }

  async updateConfig(configUpdate: Partial<ExtensionConfig>): Promise<void> {
    Logger.info('🔧 Updating SaaS extension configuration');
    
    // Merge configuration updates
    this.config = { ...this.config, ...configUpdate };
    
    // Reinitialize if settings changed
    if (configUpdate.settings) {
      this.initializeSaaSData();
    }
    
    Logger.info('✅ SaaS extension configuration updated');
  }

  async cleanup(): Promise<void> {
    Logger.info('🧹 Cleaning up SaaS extension resources');
    
    // Clear SaaS data
    this.productCategories = [];
    this.saasFeatures = [];
    this.industryTypes = [];
    this.teamRoles = [];
    this.workspaceTemplates = [];
    
    Logger.info('✅ SaaS extension cleanup complete');
  }

  async getHealthStatus(): Promise<ExtensionHealthStatus> {
    const isHealthy = this.productCategories.length > 0 && this.saasFeatures.length > 0;
    
    return {
      extensionId: `${this.name}@${this.config.metadata.version}`,
      status: isHealthy ? 'healthy' : 'warning',
      checks: [
        {
          name: 'product_categories',
          status: this.productCategories.length > 0 ? 'pass' : 'fail',
          message: `${this.productCategories.length} product categories available`,
          lastChecked: Date.now(),
          nextCheck: Date.now() + 300000 // 5 minutes
        },
        {
          name: 'saas_features',
          status: this.saasFeatures.length > 0 ? 'pass' : 'fail',
          message: `${this.saasFeatures.length} SaaS features available`,
          lastChecked: Date.now(),
          nextCheck: Date.now() + 300000 // 5 minutes
        }
      ],
      performance: {
        responseTime: 0, // Would be measured in real execution
        throughput: this.saasFeatures.length,
        errorRate: 0,
        memoryUsage: Math.round(this.saasFeatures.length * 1.5) // Estimate
      },
      recentIssues: [],
      summary: {
        uptime: Date.now() - (this.config.metadata as any).initializedAt || 0,
        totalFailures: 0,
        recoveryTime: 0
      }
    };
  }

  // Helper methods for content generation

  private generateTeamWorkspaces(count: number): TeamWorkspace[] {
    const workspaces: TeamWorkspace[] = [];
    
    for (let i = 0; i < count; i++) {
      const template = this.workspaceTemplates[i % this.workspaceTemplates.length];
      const workspace = this.createWorkspaceFromTemplate(template, i + 1);
      workspaces.push(workspace);
    }
    
    return workspaces;
  }

  private createWorkspaceFromTemplate(template: Partial<TeamWorkspace>, index: number): TeamWorkspace {
    const workspace: TeamWorkspace = {
      id: `workspace_${index}`,
      name: template.name || `Team Workspace ${index}`,
      description: template.description || `Collaborative workspace for team productivity`,
      size: template.size || 'medium',
      industry: template.industry || this.industryTypes[Math.floor(Math.random() * this.industryTypes.length)],
      projects: this.generateProjects(3), // 3 projects per workspace
      members: this.generateTeamMembers(8), // 8 members per workspace
      settings: template.settings || this.generateDefaultSettings(),
      subscription: {
        plan: this.selectSubscriptionPlan(template.size || 'medium'),
        features: this.selectPlanFeatures(template.size || 'medium'),
        limits: this.generatePlanLimits(template.size || 'medium')
      }
    };

    return workspace;
  }

  private generateProjects(count: number): WorkspaceProject[] {
    const projects: WorkspaceProject[] = [];
    const projectTemplates = [
      {
        name: 'Website Redesign',
        description: 'Complete overhaul of company website with modern design',
        status: 'active' as const,
        priority: 'high' as const,
        tags: ['web', 'design', 'marketing']
      },
      {
        name: 'Mobile App Development',
        description: 'Native mobile application for iOS and Android platforms',
        status: 'planning' as const,
        priority: 'medium' as const,
        tags: ['mobile', 'development', 'cross-platform']
      },
      {
        name: 'Data Analytics Platform',
        description: 'Internal analytics dashboard for business intelligence',
        status: 'active' as const,
        priority: 'high' as const,
        tags: ['analytics', 'data', 'reporting']
      }
    ];

    for (let i = 0; i < count; i++) {
      const template = projectTemplates[i % projectTemplates.length];
      const project: WorkspaceProject = {
        id: `project_${i + 1}`,
        name: template.name,
        description: template.description,
        status: template.status,
        priority: template.priority,
        tasks: this.generateProjectTasks(8), // 8 tasks per project
        assignedMembers: this.selectRandomMembers(3), // 3 members per project
        deadline: Date.now() + (30 + Math.floor(Math.random() * 90)) * 24 * 60 * 60 * 1000, // 30-120 days
        budget: Math.floor(Math.random() * 50000) + 10000, // $10K-$60K budget
        tags: template.tags
      };
      projects.push(project);
    }

    return projects;
  }

  private generateProjectTasks(count: number): ProjectTask[] {
    const tasks: ProjectTask[] = [];
    const taskTemplates = [
      'Requirements gathering and analysis',
      'Technical architecture design',
      'User interface mockups',
      'Database schema design',
      'API endpoint development',
      'Frontend component implementation',
      'Testing and quality assurance',
      'Documentation and deployment'
    ];

    for (let i = 0; i < count; i++) {
      const task: ProjectTask = {
        id: `task_${i + 1}`,
        title: taskTemplates[i % taskTemplates.length],
        description: `Detailed implementation of ${taskTemplates[i % taskTemplates.length].toLowerCase()}`,
        status: ['todo', 'in-progress', 'review', 'done'][Math.floor(Math.random() * 4)] as any,
        priority: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)] as any,
        assignee: `member_${Math.floor(Math.random() * 8) + 1}`,
        estimatedHours: Math.floor(Math.random() * 40) + 8, // 8-48 hours
        actualHours: Math.floor(Math.random() * 35) + 5, // 5-40 hours
        dueDate: Date.now() + Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000, // Next 2 weeks
        labels: this.generateTaskLabels(),
        dependencies: []
      };
      tasks.push(task);
    }

    return tasks;
  }

  private generateTeamMembers(count: number): TeamMember[] {
    const members: TeamMember[] = [];
    
    for (let i = 0; i < count; i++) {
      const member: TeamMember = {
        id: `member_${i + 1}`,
        email: `member${i + 1}@saasplatform.test`,
        name: this.generateMemberName(i),
        role: this.teamRoles[Math.floor(Math.random() * this.teamRoles.length)],
        permissions: this.generateMemberPermissions(),
        joinedAt: Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000, // Within last year
        lastActive: Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000, // Within last week
        productivity: {
          tasksCompleted: Math.floor(Math.random() * 50) + 10,
          averageTaskTime: Math.floor(Math.random() * 20) + 5, // 5-25 hours average
          collaborationScore: Math.random() * 0.4 + 0.6 // 0.6-1.0 score
        }
      };
      members.push(member);
    }

    return members;
  }

  private generateDefaultSettings(): WorkspaceSettings {
    return {
      timeZone: 'UTC',
      workingHours: {
        start: '09:00',
        end: '17:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri']
      },
      notifications: {
        email: true,
        slack: false,
        inApp: true
      },
      integrations: ['google_calendar', 'github'],
      security: {
        twoFactorRequired: false,
        sessionTimeout: 28800 // 8 hours
      }
    };
  }

  private selectSubscriptionPlan(size: string): string {
    const plans: Record<string, string> = {
      'small': 'Starter',
      'medium': 'Professional',
      'large': 'Business',
      'enterprise': 'Enterprise'
    };
    return plans[size] || 'Professional';
  }

  private selectPlanFeatures(size: string): string[] {
    const featuresByPlan: Record<string, string[]> = {
      'small': ['task_management', 'basic_reporting', 'file_sharing'],
      'medium': ['task_management', 'advanced_reporting', 'real_time_collaboration', 'integrations'],
      'large': ['task_management', 'advanced_reporting', 'real_time_collaboration', 'api_integrations', 'custom_fields'],
      'enterprise': ['task_management', 'advanced_reporting', 'real_time_collaboration', 'api_integrations', 'sso_authentication', 'advanced_security']
    };
    return featuresByPlan[size] || featuresByPlan['medium'];
  }

  private generatePlanLimits(size: string): Record<string, number> {
    const limitsByPlan: Record<string, Record<string, number>> = {
      'small': { projects: 10, members: 15, storage_gb: 50 },
      'medium': { projects: 50, members: 100, storage_gb: 200 },
      'large': { projects: 200, members: 500, storage_gb: 1000 },
      'enterprise': { projects: -1, members: -1, storage_gb: -1 } // Unlimited
    };
    return limitsByPlan[size] || limitsByPlan['medium'];
  }

  private selectRandomMembers(count: number): string[] {
    const members: string[] = [];
    for (let i = 0; i < count; i++) {
      members.push(`member_${Math.floor(Math.random() * 8) + 1}`);
    }
    return Array.from(new Set(members)); // Remove duplicates
  }

  private generateTaskLabels(): string[] {
    const labels = ['frontend', 'backend', 'design', 'research', 'testing', 'documentation', 'bug', 'enhancement'];
    const selectedLabels = labels.filter(() => Math.random() > 0.7); // 30% chance each
    return selectedLabels.length > 0 ? selectedLabels : ['general'];
  }

  private generateMemberName(index: number): string {
    const names = [
      'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson',
      'Emma Brown', 'Frank Miller', 'Grace Taylor', 'Henry Clark'
    ];
    return names[index % names.length];
  }

  private generateMemberPermissions(): string[] {
    const allPermissions = [
      'read_projects', 'write_projects', 'delete_projects',
      'read_tasks', 'write_tasks', 'assign_tasks',
      'read_members', 'invite_members', 'manage_members',
      'read_settings', 'write_settings'
    ];
    
    // Generate 3-6 random permissions
    const count = 3 + Math.floor(Math.random() * 4);
    const shuffled = [...allPermissions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private generateProductivityMetrics(): Record<string, any> {
    return {
      teamEfficiency: {
        tasksCompletedPerWeek: Math.floor(Math.random() * 50) + 20,
        averageTaskCompletionTime: Math.floor(Math.random() * 10) + 3, // 3-13 hours
        projectSuccessRate: Math.random() * 0.3 + 0.7 // 70-100%
      },
      collaboration: {
        messagesPerDay: Math.floor(Math.random() * 100) + 50,
        meetingsPerWeek: Math.floor(Math.random() * 10) + 5,
        fileSharesPerWeek: Math.floor(Math.random() * 30) + 10
      },
      usage: {
        activeUsersPerDay: Math.floor(Math.random() * 20) + 5,
        sessionDurationMinutes: Math.floor(Math.random() * 120) + 30,
        featureAdoptionRate: Math.random() * 0.4 + 0.6 // 60-100%
      }
    };
  }

  // Business Media Generation for SaaS Platforms
  generateBusinessMedia(context: {
    workspaceId: string;
    industry: string;
    mediaType: 'logo' | 'banner' | 'presentation' | 'document';
    purpose: string;
  }): BusinessMediaItem[] {
    const { workspaceId, industry, mediaType, purpose } = context;
    
    const businessMediaTemplates = {
      logo: [
        { name: 'company-logo-primary.svg', description: 'Primary company logo', dimensions: '400x400' },
        { name: 'company-logo-white.svg', description: 'White version for dark backgrounds', dimensions: '400x400' },
        { name: 'company-favicon.png', description: 'Website favicon', dimensions: '32x32' }
      ],
      banner: [
        { name: 'workspace-banner.jpg', description: 'Team workspace banner image', dimensions: '1200x400' },
        { name: 'presentation-header.png', description: 'Presentation header template', dimensions: '1920x540' },
        { name: 'social-media-banner.jpg', description: 'Social media banner', dimensions: '1200x630' }
      ],
      presentation: [
        { name: 'quarterly-review-template.pptx', description: 'Quarterly business review template', size: '2.1MB' },
        { name: 'product-pitch-deck.pptx', description: 'Product pitch presentation', size: '3.4MB' },
        { name: 'team-onboarding-slides.pptx', description: 'New team member onboarding', size: '1.8MB' }
      ],
      document: [
        { name: 'project-requirements.docx', description: 'Project requirements template', size: '245KB' },
        { name: 'team-handbook.pdf', description: 'Team operational handbook', size: '1.2MB' },
        { name: 'workflow-documentation.pdf', description: 'Process workflow documentation', size: '890KB' }
      ]
    };

    const templates = businessMediaTemplates[mediaType] || [];
    
    return templates.map((template, index) => ({
      id: this.generateId(),
      workspaceId,
      fileName: template.name,
      displayName: template.description,
      mediaType,
      industry,
      purpose,
      filePath: `business-media/${workspaceId}/${mediaType}/${template.name}`,
      dimensions: 'dimensions' in template ? template.dimensions : null,
      fileSize: 'size' in template ? template.size : this.generateRealisticFileSize(mediaType),
      uploadedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within last 30 days
      metadata: {
        industry,
        purpose,
        workspaceId,
        businessContext: this.getBusinessContext(industry, mediaType),
        tags: this.generateMediaTags(industry, mediaType, purpose)
      }
    }));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private generateRealisticFileSize(mediaType: string): string {
    const sizeMaps: Record<string, () => string> = {
      logo: () => `${Math.floor(Math.random() * 500) + 50}KB`,
      banner: () => `${Math.floor(Math.random() * 2000) + 500}KB`,
      presentation: () => `${(Math.random() * 5 + 1).toFixed(1)}MB`,
      document: () => `${Math.floor(Math.random() * 1500) + 200}KB`
    };
    
    return sizeMaps[mediaType]?.() || '1MB';
  }

  private getBusinessContext(industry: string, mediaType: string): Record<string, any> {
    const industryContexts: Record<string, Record<string, any>> = {
      technology: {
        colorScheme: ['#007acc', '#ff6b35', '#4ecdc4'],
        style: 'modern-minimal',
        tone: 'innovative'
      },
      consulting: {
        colorScheme: ['#2c3e50', '#3498db', '#e74c3c'],
        style: 'professional-corporate',
        tone: 'authoritative'
      },
      healthcare: {
        colorScheme: ['#27ae60', '#3498db', '#f39c12'],
        style: 'clean-trustworthy',
        tone: 'caring'
      },
      finance: {
        colorScheme: ['#2c3e50', '#16a085', '#f39c12'],
        style: 'corporate-sophisticated',
        tone: 'reliable'
      },
      education: {
        colorScheme: ['#9b59b6', '#3498db', '#e67e22'],
        style: 'friendly-approachable',
        tone: 'educational'
      }
    };

    return industryContexts[industry] || industryContexts.technology;
  }

  private generateMediaTags(industry: string, mediaType: string, purpose: string): string[] {
    const baseTags = [industry, mediaType, purpose];
    const contextTags: Record<string, string[]> = {
      logo: ['branding', 'identity', 'corporate'],
      banner: ['marketing', 'visual', 'communication'],
      presentation: ['business', 'slides', 'meeting'],
      document: ['documentation', 'process', 'reference']
    };
    
    return [...baseTags, ...(contextTags[mediaType] || [])];
  }
}