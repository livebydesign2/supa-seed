/**
 * SaaS Productivity and Team Generators
 * Advanced content generation utilities for realistic SaaS productivity data
 * Part of Task 3.3.2: Implement productivity and team generators (FR-3.3)
 */

import { Logger } from '../../utils/logger';
import type {
  TeamWorkspace,
  WorkspaceProject,
  ProjectTask,
  TeamMember,
  SaaSFeature,
  WorkspaceSettings
} from './saas-extension';

/**
 * Advanced team generation parameters
 */
export interface TeamGenerationConfig {
  /** Team size distribution */
  teamSizes: {
    small: { min: number; max: number; weight: number };
    medium: { min: number; max: number; weight: number };
    large: { min: number; max: number; weight: number };
    enterprise: { min: number; max: number; weight: number };
  };
  
  /** Industry-specific team compositions */
  industryProfiles: Record<string, {
    commonRoles: string[];
    projectTypes: string[];
    collaborationPatterns: string;
    toolPreferences: string[];
  }>;
  
  /** Productivity patterns */
  productivityPatterns: {
    velocityVariation: number; // 0-1 how much velocity varies
    seasonalFactors: boolean;
    burnoutSimulation: boolean;
    learningCurves: boolean;
  };
  
  /** Collaboration complexity */
  collaborationComplexity: {
    crossFunctional: boolean;
    remoteWork: boolean;
    timeZoneSpread: boolean;
    communicationOverhead: number;
  };
}

/**
 * Project template for different industries and team types
 */
interface ProjectTemplate {
  name: string;
  description: string;
  industry: string[];
  teamSize: 'small' | 'medium' | 'large' | 'enterprise';
  duration: { min: number; max: number }; // in days
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  taskTemplates: TaskTemplate[];
  requiredRoles: string[];
  deliverables: string[];
  riskFactors: string[];
}

/**
 * Task template for realistic task generation
 */
interface TaskTemplate {
  title: string;
  description: string;
  category: string;
  estimatedHours: { min: number; max: number };
  requiredSkills: string[];
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  businessValue: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Team composition template
 */
interface TeamCompositionTemplate {
  industry: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
  roles: Array<{
    role: string;
    count: number;
    seniority: 'junior' | 'mid' | 'senior' | 'lead';
    responsibilities: string[];
    collaborationLevel: number; // 0-1
  }>;
  communicationPatterns: {
    meetingFrequency: 'daily' | 'weekly' | 'biweekly';
    standupsEnabled: boolean;
    retrospectivesEnabled: boolean;
    demoFrequency: 'weekly' | 'biweekly' | 'monthly';
  };
}

/**
 * SaaS Productivity Generator
 * Generates realistic team workspaces, projects, and productivity patterns
 */
export class SaaSProductivityGenerator {
  private config: TeamGenerationConfig;
  private projectTemplates: ProjectTemplate[] = [];
  private taskTemplates: TaskTemplate[] = [];
  private teamCompositionTemplates: TeamCompositionTemplate[] = [];
  private industryMetrics: Map<string, any> = new Map();

  constructor(config: Partial<TeamGenerationConfig> = {}) {
    this.config = this.mergeWithDefaults(config);
    this.initializeTemplates();
    this.initializeIndustryMetrics();
  }

  /**
   * Initialize realistic project and task templates
   */
  private initializeTemplates(): void {
    // Define project templates for different scenarios
    this.projectTemplates = [
      {
        name: 'Customer Portal Development',
        description: 'Build a self-service customer portal with authentication and billing integration',
        industry: ['technology', 'saas', 'finance'],
        teamSize: 'medium',
        duration: { min: 45, max: 90 },
        complexity: 'moderate',
        taskTemplates: [
          {
            title: 'User Authentication System',
            description: 'Implement secure user login and registration with SSO support',
            category: 'backend',
            estimatedHours: { min: 20, max: 40 },
            requiredSkills: ['authentication', 'security', 'backend'],
            dependencies: [],
            riskLevel: 'medium',
            businessValue: 'critical'
          },
          {
            title: 'Billing Integration',
            description: 'Connect customer portal to billing system for invoice and payment management',
            category: 'integration',
            estimatedHours: { min: 16, max: 32 },
            requiredSkills: ['api_integration', 'payments', 'backend'],
            dependencies: ['User Authentication System'],
            riskLevel: 'high',
            businessValue: 'critical'
          },
          {
            title: 'Dashboard UI Components',
            description: 'Create responsive dashboard components for customer data visualization',
            category: 'frontend',
            estimatedHours: { min: 24, max: 48 },
            requiredSkills: ['react', 'ui_design', 'responsive_design'],
            dependencies: [],
            riskLevel: 'low',
            businessValue: 'high'
          }
        ],
        requiredRoles: ['product_manager', 'senior_developer', 'frontend_developer', 'designer'],
        deliverables: ['Authentication system', 'Billing integration', 'Customer dashboard', 'Mobile-responsive UI'],
        riskFactors: ['Third-party API changes', 'Security compliance requirements', 'Peak traffic scalability']
      },
      {
        name: 'Marketing Analytics Platform',
        description: 'Internal analytics platform for tracking marketing campaign performance',
        industry: ['marketing', 'media', 'ecommerce'],
        teamSize: 'large',
        duration: { min: 60, max: 120 },
        complexity: 'complex',
        taskTemplates: [
          {
            title: 'Data Pipeline Architecture',
            description: 'Design and implement scalable data ingestion and processing pipeline',
            category: 'data_engineering',
            estimatedHours: { min: 40, max: 80 },
            requiredSkills: ['data_engineering', 'etl', 'cloud_architecture'],
            dependencies: [],
            riskLevel: 'high',
            businessValue: 'critical'
          },
          {
            title: 'Real-time Dashboard',
            description: 'Build real-time analytics dashboard with customizable widgets',
            category: 'frontend',
            estimatedHours: { min: 32, max: 64 },
            requiredSkills: ['data_visualization', 'real_time', 'dashboard_design'],
            dependencies: ['Data Pipeline Architecture'],
            riskLevel: 'medium',
            businessValue: 'high'
          }
        ],
        requiredRoles: ['data_engineer', 'frontend_developer', 'product_manager', 'data_analyst'],
        deliverables: ['Data ingestion pipeline', 'Analytics dashboard', 'Campaign tracking', 'Performance reports'],
        riskFactors: ['Data volume scalability', 'Real-time processing requirements', 'Complex analytics queries']
      },
      {
        name: 'Mobile App MVP',
        description: 'Minimum viable product for mobile application with core features',
        industry: ['technology', 'startup', 'consumer'],
        teamSize: 'small',
        duration: { min: 30, max: 60 },
        complexity: 'simple',
        taskTemplates: [
          {
            title: 'User Onboarding Flow',
            description: 'Create intuitive user registration and onboarding experience',
            category: 'mobile_ui',
            estimatedHours: { min: 16, max: 24 },
            requiredSkills: ['mobile_ui', 'user_experience', 'ios_android'],
            dependencies: [],
            riskLevel: 'low',
            businessValue: 'high'
          },
          {
            title: 'Core Feature Implementation',
            description: 'Implement primary app functionality and user interactions',
            category: 'mobile_development',
            estimatedHours: { min: 40, max: 60 },
            requiredSkills: ['mobile_development', 'api_integration', 'state_management'],
            dependencies: ['User Onboarding Flow'],
            riskLevel: 'medium',
            businessValue: 'critical'
          }
        ],
        requiredRoles: ['mobile_developer', 'designer', 'product_manager'],
        deliverables: ['iOS app', 'Android app', 'Backend API', 'App store listings'],
        riskFactors: ['App store approval', 'Cross-platform compatibility', 'User adoption']
      }
    ];

    // Define team composition templates
    this.teamCompositionTemplates = [
      {
        industry: 'technology',
        size: 'small',
        roles: [
          {
            role: 'product_manager',
            count: 1,
            seniority: 'mid',
            responsibilities: ['roadmap_planning', 'stakeholder_communication', 'requirements_gathering'],
            collaborationLevel: 0.9
          },
          {
            role: 'senior_developer',
            count: 1,
            seniority: 'senior',
            responsibilities: ['architecture_design', 'code_review', 'mentoring'],
            collaborationLevel: 0.8
          },
          {
            role: 'developer',
            count: 2,
            seniority: 'mid',
            responsibilities: ['feature_development', 'testing', 'documentation'],
            collaborationLevel: 0.7
          },
          {
            role: 'designer',
            count: 1,
            seniority: 'mid',
            responsibilities: ['ui_design', 'user_research', 'prototyping'],
            collaborationLevel: 0.6
          }
        ],
        communicationPatterns: {
          meetingFrequency: 'daily',
          standupsEnabled: true,
          retrospectivesEnabled: true,
          demoFrequency: 'weekly'
        }
      },
      {
        industry: 'marketing',
        size: 'medium',
        roles: [
          {
            role: 'marketing_manager',
            count: 1,
            seniority: 'senior',
            responsibilities: ['campaign_strategy', 'budget_management', 'team_coordination'],
            collaborationLevel: 0.9
          },
          {
            role: 'data_analyst',
            count: 2,
            seniority: 'mid',
            responsibilities: ['data_analysis', 'reporting', 'insights_generation'],
            collaborationLevel: 0.7
          },
          {
            role: 'content_creator',
            count: 2,
            seniority: 'junior',
            responsibilities: ['content_creation', 'social_media', 'copywriting'],
            collaborationLevel: 0.5
          },
          {
            role: 'designer',
            count: 1,
            seniority: 'mid',
            responsibilities: ['creative_design', 'brand_consistency', 'visual_content'],
            collaborationLevel: 0.6
          }
        ],
        communicationPatterns: {
          meetingFrequency: 'weekly',
          standupsEnabled: false,
          retrospectivesEnabled: true,
          demoFrequency: 'monthly'
        }
      }
    ];

    Logger.debug(`✅ Initialized ${this.projectTemplates.length} project templates and ${this.teamCompositionTemplates.length} team compositions`);
  }

  /**
   * Initialize industry-specific metrics and benchmarks
   */
  private initializeIndustryMetrics(): void {
    const metrics = [
      {
        industry: 'technology',
        metrics: {
          velocityRange: { min: 20, max: 45 }, // story points per sprint
          defectRate: { min: 0.02, max: 0.08 }, // defects per story point
          teamSatisfaction: { min: 7.2, max: 8.8 }, // out of 10
          codeReviewCoverage: { min: 0.85, max: 0.98 },
          deploymentFrequency: 'daily',
          leadTime: { min: 2, max: 8 } // days
        }
      },
      {
        industry: 'marketing',
        metrics: {
          campaignSuccessRate: { min: 0.15, max: 0.35 },
          contentProductionRate: { min: 8, max: 20 }, // pieces per week
          teamSatisfaction: { min: 6.8, max: 8.2 },
          collaborationIndex: { min: 0.65, max: 0.85 },
          timeToMarket: { min: 5, max: 15 }, // days for campaign launch
          creativeIterations: { min: 2, max: 6 }
        }
      },
      {
        industry: 'consulting',
        metrics: {
          utilizationRate: { min: 0.70, max: 0.90 },
          clientSatisfaction: { min: 7.5, max: 9.2 },
          projectMargin: { min: 0.20, max: 0.45 },
          knowledgeSharing: { min: 0.60, max: 0.85 },
          proposalWinRate: { min: 0.25, max: 0.55 },
          projectDeliveryTime: { min: 0.9, max: 1.2 } // ratio to estimated time
        }
      }
    ];

    for (const metric of metrics) {
      this.industryMetrics.set(metric.industry, metric.metrics);
    }

    Logger.debug(`✅ Initialized metrics for ${metrics.length} industries`);
  }

  /**
   * Generate realistic team workspace with industry-specific characteristics
   */
  generateProductivityWorkspace(
    industry: string,
    teamSize: 'small' | 'medium' | 'large' | 'enterprise',
    specialization?: string
  ): TeamWorkspace {
    Logger.debug(`🏢 Generating productivity workspace for ${industry} (${teamSize} team)`);

    const template = this.getTeamCompositionTemplate(industry, teamSize);
    const projects = this.generateIndustryProjects(industry, teamSize, 3);
    const members = this.generateTeamFromTemplate(template);

    const workspace: TeamWorkspace = {
      id: `workspace_${industry}_${Date.now()}`,
      name: this.generateWorkspaceName(industry, specialization),
      description: this.generateWorkspaceDescription(industry, teamSize),
      size: teamSize,
      industry,
      projects,
      members,
      settings: this.generateIndustrySettings(industry, template),
      subscription: this.generateSubscriptionForTeamSize(teamSize)
    };

    return workspace;
  }

  /**
   * Generate realistic project with industry-specific tasks and timeline
   */
  generateIndustryProject(
    industry: string,
    complexity: 'simple' | 'moderate' | 'complex' | 'enterprise',
    teamSize: 'small' | 'medium' | 'large' | 'enterprise'
  ): WorkspaceProject {
    Logger.debug(`📊 Generating ${complexity} project for ${industry} industry`);

    const templates = this.projectTemplates.filter(t => 
      t.industry.includes(industry) && t.complexity === complexity
    );
    const template = templates.length > 0 
      ? templates[Math.floor(Math.random() * templates.length)]
      : this.projectTemplates[0]; // Fallback

    const project: WorkspaceProject = {
      id: `project_${industry}_${Date.now()}`,
      name: this.adaptProjectName(template.name, industry),
      description: template.description,
      status: this.selectProjectStatus(),
      priority: this.selectProjectPriority(complexity),
      tasks: this.generateTasksFromTemplate(template.taskTemplates),
      assignedMembers: this.selectProjectMembers(teamSize),
      deadline: this.calculateProjectDeadline(template.duration),
      budget: this.calculateProjectBudget(complexity, teamSize),
      tags: this.generateProjectTags(industry, complexity)
    };

    return project;
  }

  /**
   * Generate team member with role-specific productivity patterns
   */
  generateProductiveMember(
    role: string,
    seniority: 'junior' | 'mid' | 'senior' | 'lead',
    industry: string
  ): TeamMember {
    const baseProductivity = this.getBaseProductivityForRole(role, seniority);
    const industryModifier = this.getIndustryProductivityModifier(industry);
    
    const member: TeamMember = {
      id: `member_${role}_${Date.now()}`,
      email: `${role.toLowerCase()}@${industry}platform.test`,
      name: this.generateRealisticName(role),
      role,
      permissions: this.generateRolePermissions(role, seniority),
      joinedAt: this.generateJoinDate(seniority),
      lastActive: Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000), // Within 24 hours
      productivity: {
        tasksCompleted: Math.round(baseProductivity.tasksPerWeek * industryModifier * (1 + Math.random() * 0.4 - 0.2)),
        averageTaskTime: Math.round(baseProductivity.avgHoursPerTask * industryModifier * (1 + Math.random() * 0.3 - 0.15)),
        collaborationScore: Math.min(1.0, baseProductivity.collaborationBase * industryModifier * (1 + Math.random() * 0.2 - 0.1))
      }
    };

    return member;
  }

  /**
   * Generate realistic sprint or iteration for agile teams
   */
  generateProductivitySprint(
    teamSize: number,
    industry: string,
    duration: number = 14 // days
  ): {
    sprintId: string;
    name: string;
    duration: number;
    capacity: number;
    plannedVelocity: number;
    actualVelocity?: number;
    tasks: ProjectTask[];
    burndownData: Array<{ day: number; remaining: number; ideal: number }>;
    retrospective?: {
      whatWorked: string[];
      whatDidntWork: string[];
      actionItems: string[];
    };
  } {
    const metrics = this.industryMetrics.get(industry) || this.industryMetrics.get('technology');
    const baseVelocity = (metrics.velocityRange.min + metrics.velocityRange.max) / 2;
    const teamVelocity = Math.round(baseVelocity * (teamSize / 6)); // Normalized for 6-person team

    const sprint = {
      sprintId: `sprint_${Date.now()}`,
      name: `Sprint ${Math.floor(Date.now() / 1000000) % 100}`,
      duration,
      capacity: teamSize * duration * 6, // 6 hours per person per day
      plannedVelocity: teamVelocity,
      actualVelocity: Math.round(teamVelocity * (0.8 + Math.random() * 0.4)), // 80-120% of planned
      tasks: this.generateSprintTasks(teamVelocity),
      burndownData: this.generateBurndownData(teamVelocity, duration),
      retrospective: this.generateRetrospective(industry)
    };

    return sprint;
  }

  /**
   * Generate team collaboration metrics
   */
  generateCollaborationMetrics(teamSize: number, industry: string): {
    communicationFrequency: Record<string, number>;
    knowledgeSharing: {
      documentsCreated: number;
      documentsShared: number;
      peerReviews: number;
      mentoringSessions: number;
    };
    meetingEfficiency: {
      averageMeetingDuration: number;
      meetingsPerWeek: number;
      meetingProductivityScore: number;
    };
    crossFunctionalWork: {
      crossTeamProjects: number;
      collaborationScore: number;
      dependencyManagement: number;
    };
  } {
    const industryMetrics = this.industryMetrics.get(industry) || this.industryMetrics.get('technology');
    
    return {
      communicationFrequency: {
        messages: Math.round(teamSize * (20 + Math.random() * 30)), // 20-50 per person per day
        mentions: Math.round(teamSize * (5 + Math.random() * 10)),
        reactions: Math.round(teamSize * (10 + Math.random() * 20)),
        filesShared: Math.round(teamSize * (2 + Math.random() * 8))
      },
      knowledgeSharing: {
        documentsCreated: Math.round(teamSize * (1 + Math.random() * 3)), // per week
        documentsShared: Math.round(teamSize * (0.5 + Math.random() * 2)),
        peerReviews: Math.round(teamSize * (1 + Math.random() * 2)),
        mentoringSessions: Math.round(teamSize * 0.3 * (1 + Math.random()))
      },
      meetingEfficiency: {
        averageMeetingDuration: 30 + Math.random() * 45, // 30-75 minutes
        meetingsPerWeek: Math.round(teamSize * (2 + Math.random() * 4)),
        meetingProductivityScore: 0.6 + Math.random() * 0.3 // 60-90%
      },
      crossFunctionalWork: {
        crossTeamProjects: Math.floor(Math.random() * 3) + 1,
        collaborationScore: (industryMetrics.collaborationIndex?.min || 0.7) + 
          Math.random() * ((industryMetrics.collaborationIndex?.max || 0.9) - (industryMetrics.collaborationIndex?.min || 0.7)),
        dependencyManagement: 0.65 + Math.random() * 0.25 // 65-90%
      }
    };
  }

  // Private helper methods

  private mergeWithDefaults(config: Partial<TeamGenerationConfig>): TeamGenerationConfig {
    return {
      teamSizes: {
        small: { min: 3, max: 8, weight: 0.3 },
        medium: { min: 8, max: 20, weight: 0.4 },
        large: { min: 20, max: 50, weight: 0.2 },
        enterprise: { min: 50, max: 200, weight: 0.1 }
      },
      industryProfiles: {
        technology: {
          commonRoles: ['developer', 'product_manager', 'designer', 'qa_engineer'],
          projectTypes: ['web_development', 'mobile_app', 'api_development', 'platform_migration'],
          collaborationPatterns: 'agile',
          toolPreferences: ['github', 'jira', 'slack', 'figma']
        },
        marketing: {
          commonRoles: ['marketing_manager', 'content_creator', 'designer', 'analyst'],
          projectTypes: ['campaign_launch', 'content_strategy', 'brand_redesign', 'market_research'],
          collaborationPatterns: 'campaign-based',
          toolPreferences: ['hubspot', 'mailchimp', 'adobe_creative', 'google_analytics']
        }
      },
      productivityPatterns: {
        velocityVariation: 0.2,
        seasonalFactors: true,
        burnoutSimulation: false,
        learningCurves: true
      },
      collaborationComplexity: {
        crossFunctional: true,
        remoteWork: true,
        timeZoneSpread: false,
        communicationOverhead: 0.15
      },
      ...config
    };
  }

  private getTeamCompositionTemplate(industry: string, size: string): TeamCompositionTemplate {
    const templates = this.teamCompositionTemplates.filter(t => 
      t.industry === industry && t.size === size
    );
    return templates.length > 0 ? templates[0] : this.teamCompositionTemplates[0];
  }

  private generateIndustryProjects(
    industry: string, 
    teamSize: string, 
    count: number
  ): WorkspaceProject[] {
    const projects: WorkspaceProject[] = [];
    const complexities = ['simple', 'moderate', 'complex'] as const;
    
    for (let i = 0; i < count; i++) {
      const complexity = complexities[i % complexities.length];
      const project = this.generateIndustryProject(industry, complexity, teamSize as any);
      projects.push(project);
    }
    
    return projects;
  }

  private generateTeamFromTemplate(template: TeamCompositionTemplate): TeamMember[] {
    const members: TeamMember[] = [];
    
    for (const roleSpec of template.roles) {
      for (let i = 0; i < roleSpec.count; i++) {
        const member = this.generateProductiveMember(
          roleSpec.role,
          roleSpec.seniority,
          template.industry
        );
        members.push(member);
      }
    }
    
    return members;
  }

  private generateWorkspaceName(industry: string, specialization?: string): string {
    const industryNames: Record<string, string[]> = {
      'technology': ['TechFlow', 'DevHub', 'CodeCraft', 'InnovateLab'],
      'marketing': ['BrandForge', 'CampaignCentral', 'CreativeCore', 'MarketPulse'],
      'consulting': ['StrategicMinds', 'ConsultPro', 'ExpertiseHub', 'AdvisoryCore']
    };
    
    const names = industryNames[industry] || ['TeamSpace', 'WorkHub', 'CollabCore'];
    const baseName = names[Math.floor(Math.random() * names.length)];
    
    return specialization ? `${baseName} - ${specialization}` : baseName;
  }

  private generateWorkspaceDescription(industry: string, teamSize: string): string {
    const descriptions: Record<string, string> = {
      'technology': `Collaborative development workspace for ${teamSize} technology team`,
      'marketing': `Creative marketing workspace for ${teamSize} cross-functional team`,
      'consulting': `Professional consulting workspace for ${teamSize} advisory team`
    };
    
    return descriptions[industry] || `Professional workspace for ${teamSize} team collaboration`;
  }

  private generateIndustrySettings(industry: string, template: TeamCompositionTemplate): WorkspaceSettings {
    return {
      timeZone: 'UTC',
      workingHours: {
        start: industry === 'technology' ? '10:00' : '09:00',
        end: industry === 'technology' ? '18:00' : '17:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri']
      },
      notifications: {
        email: true,
        slack: template.communicationPatterns.standupsEnabled,
        inApp: true
      },
      integrations: this.getIndustryIntegrations(industry),
      security: {
        twoFactorRequired: industry === 'finance' || industry === 'consulting',
        sessionTimeout: industry === 'finance' ? 14400 : 28800 // 4 or 8 hours
      }
    };
  }

  private generateSubscriptionForTeamSize(teamSize: string): any {
    const plans: Record<string, any> = {
      'small': { plan: 'Starter', features: ['basic'], limits: { projects: 10, storage_gb: 50 } },
      'medium': { plan: 'Professional', features: ['advanced'], limits: { projects: 50, storage_gb: 200 } },
      'large': { plan: 'Business', features: ['premium'], limits: { projects: 200, storage_gb: 1000 } },
      'enterprise': { plan: 'Enterprise', features: ['all'], limits: { projects: -1, storage_gb: -1 } }
    };
    
    return plans[teamSize] || plans['medium'];
  }

  private adaptProjectName(templateName: string, industry: string): string {
    const adaptations: Record<string, Record<string, string>> = {
      'technology': {
        'Customer Portal Development': 'SaaS Customer Portal',
        'Marketing Analytics Platform': 'Product Analytics Platform'
      },
      'marketing': {
        'Customer Portal Development': 'Brand Experience Portal',
        'Mobile App MVP': 'Campaign Mobile App'
      }
    };
    
    return adaptations[industry]?.[templateName] || templateName;
  }

  private selectProjectStatus(): WorkspaceProject['status'] {
    const statuses: WorkspaceProject['status'][] = ['planning', 'active', 'on-hold', 'completed'];
    const weights = [0.2, 0.5, 0.1, 0.2]; // Active projects most common
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random < sum) {
        return statuses[i];
      }
    }
    
    return 'active';
  }

  private selectProjectPriority(complexity: string): WorkspaceProject['priority'] {
    const priorityMap: Record<string, WorkspaceProject['priority']> = {
      'simple': 'medium',
      'moderate': 'high',
      'complex': 'high',
      'enterprise': 'urgent'
    };
    
    return priorityMap[complexity] || 'medium';
  }

  private generateTasksFromTemplate(taskTemplates: TaskTemplate[]): ProjectTask[] {
    return taskTemplates.map((template, index) => ({
      id: `task_${index + 1}`,
      title: template.title,
      description: template.description,
      status: this.selectTaskStatus(),
      priority: this.mapBusinessValueToPriority(template.businessValue),
      assignee: `member_${Math.floor(Math.random() * 5) + 1}`,
      estimatedHours: template.estimatedHours.min + 
        Math.random() * (template.estimatedHours.max - template.estimatedHours.min),
      actualHours: undefined, // Will be filled as tasks progress
      dueDate: Date.now() + Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000,
      labels: [template.category, template.riskLevel],
      dependencies: template.dependencies
    }));
  }

  private selectProjectMembers(teamSize: string): string[] {
    const memberCounts: Record<string, number> = {
      'small': 3,
      'medium': 5,
      'large': 8,
      'enterprise': 12
    };
    
    const count = memberCounts[teamSize] || 5;
    const members: string[] = [];
    
    for (let i = 0; i < count; i++) {
      members.push(`member_${i + 1}`);
    }
    
    return members;
  }

  private calculateProjectDeadline(duration: { min: number; max: number }): number {
    const days = duration.min + Math.random() * (duration.max - duration.min);
    return Date.now() + days * 24 * 60 * 60 * 1000;
  }

  private calculateProjectBudget(complexity: string, teamSize: string): number {
    const baseBudgets: Record<string, number> = {
      'simple': 25000,
      'moderate': 75000,
      'complex': 150000,
      'enterprise': 500000
    };
    
    const teamMultipliers: Record<string, number> = {
      'small': 0.7,
      'medium': 1.0,
      'large': 1.5,
      'enterprise': 2.5
    };
    
    const base = baseBudgets[complexity] || 75000;
    const multiplier = teamMultipliers[teamSize] || 1.0;
    
    return Math.round(base * multiplier * (0.8 + Math.random() * 0.4));
  }

  private generateProjectTags(industry: string, complexity: string): string[] {
    const baseTags = [industry, complexity];
    const additionalTags = ['high_priority', 'client_facing', 'internal', 'innovation', 'maintenance'];
    
    const selectedAdditional = additionalTags
      .filter(() => Math.random() > 0.6)
      .slice(0, 2);
      
    return [...baseTags, ...selectedAdditional];
  }

  private getBaseProductivityForRole(role: string, seniority: string): any {
    const roleMetrics: Record<string, any> = {
      'developer': { tasksPerWeek: 12, avgHoursPerTask: 8, collaborationBase: 0.7 },
      'product_manager': { tasksPerWeek: 8, avgHoursPerTask: 6, collaborationBase: 0.9 },
      'designer': { tasksPerWeek: 10, avgHoursPerTask: 12, collaborationBase: 0.6 },
      'analyst': { tasksPerWeek: 6, avgHoursPerTask: 16, collaborationBase: 0.5 }
    };
    
    const seniorityMultipliers: Record<string, number> = {
      'junior': 0.7,
      'mid': 1.0,
      'senior': 1.3,
      'lead': 1.1 // Less individual work, more coordination
    };
    
    const base = roleMetrics[role] || roleMetrics['developer'];
    const multiplier = seniorityMultipliers[seniority] || 1.0;
    
    return {
      tasksPerWeek: base.tasksPerWeek * multiplier,
      avgHoursPerTask: base.avgHoursPerTask / multiplier,
      collaborationBase: base.collaborationBase + (seniority === 'lead' ? 0.2 : 0)
    };
  }

  private getIndustryProductivityModifier(industry: string): number {
    const modifiers: Record<string, number> = {
      'technology': 1.1,
      'marketing': 0.9,
      'consulting': 1.0,
      'finance': 0.85
    };
    
    return modifiers[industry] || 1.0;
  }

  private generateRealisticName(role: string): string {
    const names = [
      'Alex Johnson', 'Jordan Smith', 'Casey Williams', 'Morgan Davis',
      'Taylor Brown', 'Riley Wilson', 'Cameron Miller', 'Avery Garcia'
    ];
    
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateRolePermissions(role: string, seniority: string): string[] {
    const rolePermissions: Record<string, string[]> = {
      'admin': ['all_permissions'],
      'product_manager': ['read_all', 'write_projects', 'manage_team', 'view_analytics'],
      'developer': ['read_projects', 'write_code', 'deploy_staging'],
      'designer': ['read_projects', 'write_designs', 'upload_assets'],
      'analyst': ['read_all', 'write_reports', 'view_analytics']
    };
    
    const basePermissions = rolePermissions[role] || ['read_projects'];
    
    if (seniority === 'lead' || seniority === 'senior') {
      basePermissions.push('mentor_team', 'review_work');
    }
    
    return basePermissions;
  }

  private generateJoinDate(seniority: string): number {
    const daysAgo: Record<string, { min: number; max: number }> = {
      'junior': { min: 30, max: 365 },
      'mid': { min: 365, max: 1095 }, // 1-3 years
      'senior': { min: 730, max: 2190 }, // 2-6 years
      'lead': { min: 1095, max: 2920 } // 3-8 years
    };
    
    const range = daysAgo[seniority] || daysAgo['mid'];
    const days = range.min + Math.random() * (range.max - range.min);
    
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  private selectTaskStatus(): ProjectTask['status'] {
    const statuses: ProjectTask['status'][] = ['todo', 'in-progress', 'review', 'done'];
    const weights = [0.3, 0.4, 0.2, 0.1];
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random < sum) {
        return statuses[i];
      }
    }
    
    return 'todo';
  }

  private mapBusinessValueToPriority(businessValue: string): ProjectTask['priority'] {
    const mapping: Record<string, ProjectTask['priority']> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'critical': 'urgent'
    };
    
    return mapping[businessValue] || 'medium';
  }

  private generateSprintTasks(velocity: number): ProjectTask[] {
    const tasks: ProjectTask[] = [];
    let remainingPoints = velocity;
    
    while (remainingPoints > 0) {
      const points = Math.min(remainingPoints, Math.floor(Math.random() * 8) + 1); // 1-8 points
      
      const task: ProjectTask = {
        id: `sprint_task_${tasks.length + 1}`,
        title: `Sprint Task ${tasks.length + 1}`,
        description: 'Sprint-specific task implementation',
        status: 'todo',
        priority: 'medium',
        estimatedHours: points * 2, // 2 hours per story point
        labels: ['sprint'],
        dependencies: []
      };
      
      tasks.push(task);
      remainingPoints -= points;
    }
    
    return tasks;
  }

  private generateBurndownData(velocity: number, duration: number): Array<{ day: number; remaining: number; ideal: number }> {
    const data: Array<{ day: number; remaining: number; ideal: number }> = [];
    let remaining = velocity;
    
    for (let day = 0; day <= duration; day++) {
      const ideal = velocity * (1 - day / duration);
      
      if (day > 0) {
        // Simulate realistic burndown with some variance
        const dailyBurn = (velocity / duration) * (0.7 + Math.random() * 0.6);
        remaining = Math.max(0, remaining - dailyBurn);
      }
      
      data.push({
        day,
        remaining: Math.round(remaining * 10) / 10,
        ideal: Math.round(ideal * 10) / 10
      });
    }
    
    return data;
  }

  private generateRetrospective(industry: string): any {
    const retrospectives: Record<string, any> = {
      'technology': {
        whatWorked: ['Daily standups improved communication', 'Code reviews caught early bugs'],
        whatDidntWork: ['Meeting overload reduced coding time', 'Unclear requirements led to rework'],
        actionItems: ['Limit meetings to essential ones', 'Improve requirement documentation']
      },
      'marketing': {
        whatWorked: ['Creative collaboration sessions', 'Data-driven decision making'],
        whatDidntWork: ['Last-minute campaign changes', 'Insufficient creative feedback time'],
        actionItems: ['Establish creative review deadlines', 'Implement campaign change freeze periods']
      }
    };
    
    return retrospectives[industry] || retrospectives['technology'];
  }

  private getIndustryIntegrations(industry: string): string[] {
    const integrations: Record<string, string[]> = {
      'technology': ['github', 'jira', 'slack', 'docker'],
      'marketing': ['mailchimp', 'hubspot', 'google_analytics', 'adobe_creative'],
      'consulting': ['microsoft_365', 'salesforce', 'zoom', 'tableau']
    };
    
    return integrations[industry] || integrations['technology'];
  }
}