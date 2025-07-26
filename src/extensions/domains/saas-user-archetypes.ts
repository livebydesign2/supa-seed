/**
 * SaaS User Archetypes for Team Collaboration Platforms
 * Generates realistic user personas for SaaS/productivity domain extensions
 * Part of Task 3.3.3: Create SaaS user archetypes (admin, member, individual) (FR-3.3)
 */

import { Logger } from '../../utils/logger';
import type { UserArchetype } from '../extension-types';
import type { TeamWorkspace, WorkspaceProject } from './saas-extension';

/**
 * Extended SaaS user archetype with productivity-specific attributes
 */
export interface SaaSUserArchetype extends UserArchetype {
  /** Business behavior patterns */
  behavior?: {
    /** Content creation patterns */
    contentCreation: {
      frequency: 'daily' | 'weekly' | 'monthly';
      types: string[];
      sharingPattern: 'team_focused' | 'public_focused' | 'private';
    };
    /** Engagement patterns */
    engagement: {
      likesToShare: boolean;
      collaborationLevel: 'low' | 'medium' | 'high' | 'very_high';
      communityParticipation: 'low' | 'medium' | 'high';
    };
  };

  /** SaaS-specific preferences and behaviors */
  saasPreferences: {
    /** Primary work activities */
    primaryActivities: string[];
    /** Secondary activities */
    secondaryActivities: string[];
    /** Experience level with SaaS tools */
    saasExperience: 'novice' | 'intermediate' | 'expert' | 'power_user';
    /** Collaboration style */
    collaborationStyle: 'individual_contributor' | 'team_player' | 'leader' | 'facilitator';
    /** Communication preference */
    communicationPreference: 'async' | 'sync' | 'mixed';
    /** Preferred tools and integrations */
    preferredTools: string[];
    /** Work schedule pattern */
    workSchedule: 'standard' | 'flexible' | 'remote' | 'hybrid';
  };

  /** Productivity patterns specific to SaaS platforms */
  productivityPattern: {
    /** Daily activity frequency */
    dailyActivityFrequency: 'low' | 'medium' | 'high' | 'very_high';
    /** Content creation types */
    contentTypes: ('projects' | 'tasks' | 'documents' | 'reports' | 'messages' | 'comments')[];
    /** Team interaction behavior */
    teamInteraction: {
      /** Percentage of work done collaboratively */
      collaborativeWorkRatio: number;
      /** Cross-team communication level */
      crossTeamCommunication: boolean;
      /** Meeting participation level */
      meetingParticipation: 'minimal' | 'standard' | 'active' | 'leads';
    };
    /** Productivity metrics patterns */
    productivityMetrics: {
      /** Average tasks completed per week */
      tasksPerWeek: number;
      /** Project involvement level */
      projectInvolvement: 'single' | 'multiple' | 'lead_multiple';
      /** Documentation habits */
      documentationHabits: 'minimal' | 'standard';
    };
  };

  /** Platform-specific usage patterns */
  platformUsage: {
    /** Login frequency */
    loginFrequency: 'daily' | 'multiple_daily' | 'weekly';
    /** Session duration (minutes) */
    avgSessionDuration: number;
    /** Feature usage patterns */
    featureUsage: {
      /** Uses project management features */
      usesProjectManagement: boolean;
      /** Uses team communication features */
      usesTeamCommunication: boolean;
      /** Uses reporting and analytics */
      usesReporting: boolean;
      /** Uses integration features */
      usesIntegrations: boolean;
      /** Uses advanced features */
      usesAdvancedFeatures: boolean;
      /** Creates custom workflows */
      createsWorkflows: boolean;
    };
    /** Notification preferences */
    notificationPreferences: {
      /** Real-time notifications */
      realTime: boolean;
      /** Email summaries */
      emailSummaries: boolean;
      /** Mobile notifications */
      mobile: boolean;
      /** Slack/Teams integration */
      slackIntegration: boolean;
    };
  };
}

/**
 * SaaS User Archetype Generator
 * Creates realistic user personas for SaaS and productivity platforms
 */
export class SaaSUserArchetypeGenerator {
  
  /**
   * Generate comprehensive set of SaaS user archetypes
   */
  static generateSaaSArchetypes(): SaaSUserArchetype[] {
    Logger.info('👥 Generating SaaS user archetypes for team collaboration platforms');

    return [
      this.generateWorkspaceAdminArchetype(),
      this.generateProjectManagerArchetype(),
      this.generateTeamLeadArchetype(),
      this.generateSeniorDeveloperArchetype(),
      this.generateTeamMemberArchetype(),
      this.generateIndividualContributorArchetype(),
      this.generateAnalystArchetype(),
      this.generateFreelancerArchetype()
    ];
  }

  /**
   * Generate workspace administrator archetype - manages team settings and billing
   */
  private static generateWorkspaceAdminArchetype(): SaaSUserArchetype {
    return {
      email: 'admin@saasplatform.test',
      role: 'admin',
      name: 'Sarah Workspace-Admin',
      purpose: 'Workspace administrator managing team settings, billing, and user access',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['workspace_configs', 'user_management', 'billing_reports', 'team_analytics'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: false, // Admin work is primarily internal
          collaborationLevel: 'high', // Coordinates with all teams
          communityParticipation: 'low' // Focused on internal management
        }
      },

      contentPattern: {
        setupsPerUser: 2, // Creates workspace configurations and policies
        itemsPerSetup: 12, // Comprehensive admin configurations
        publicRatio: 0.05, // Most admin content is internal
        preferredCategories: ['workspace_management', 'user_administration', 'billing', 'security']
      },

      saasPreferences: {
        gearFocus: 'administration',
        budgetRange: 'enterprise',
        activities: ['user_management', 'billing_oversight', 'security_configuration', 'team_analytics']
      },

      saasPreferences: {
        primaryActivities: ['user_management', 'workspace_configuration', 'billing_management', 'security_oversight'],
        secondaryActivities: ['team_analytics', 'integration_management', 'policy_creation'],
        saasExperience: 'expert',
        collaborationStyle: 'leader',
        communicationPreference: 'mixed',
        preferredTools: ['admin_dashboards', 'billing_systems', 'user_directory', 'analytics_tools'],
        workSchedule: 'standard'
      },

      productivityPattern: {
        dailyActivityFrequency: 'medium',
        contentTypes: ['reports', 'documents', 'messages'],
        teamInteraction: {
          collaborativeWorkRatio: 0.4, // Mostly individual admin work
          crossTeamCommunication: true, // Communicates with all teams
          meetingParticipation: 'leads' // Often leads admin/strategy meetings
        },
        productivityMetrics: {
          tasksPerWeek: 15, // Administrative tasks
          projectInvolvement: 'multiple', // Involved in multiple team projects
          documentationHabits: 'standard' // Maintains extensive documentation
        }
      },

      platformUsage: {
        loginFrequency: 'daily',
        avgSessionDuration: 45, // Longer sessions for admin tasks
        featureUsage: {
          usesProjectManagement: false, // Doesn't create projects directly
          usesTeamCommunication: true,
          usesReporting: true, // Heavy reporting usage
          usesIntegrations: true, // Manages integrations
          usesAdvancedFeatures: true, // Uses all admin features
          createsWorkflows: true // Creates organizational workflows
        },
        notificationPreferences: {
          realTime: true, // Needs immediate admin alerts
          emailSummaries: true,
          mobile: true, // Admin needs mobile access
          slackIntegration: false // Uses internal communications
        }
      }
    };
  }

  /**
   * Generate project manager archetype - coordinates teams and deliverables
   */
  private static generateProjectManagerArchetype(): SaaSUserArchetype {
    return {
      email: 'manager@saasplatform.test',
      role: 'project_manager',
      name: 'Marcus Project-Manager',
      purpose: 'Project manager coordinating cross-functional teams and deliverables',
      
      behavior: {
        contentCreation: {
          frequency: 'daily',
          types: ['project_plans', 'task_assignments', 'progress_reports', 'stakeholder_updates'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: true, // Shares project updates and best practices
          collaborationLevel: 'very_high', // Core coordination role
          communityParticipation: 'high' // Active in project management communities
        }
      },

      contentPattern: {
        setupsPerUser: 6, // Creates multiple project setups
        itemsPerSetup: 15, // Detailed project plans with many tasks
        publicRatio: 0.3, // Some project methodologies shared publicly
        preferredCategories: ['project_management', 'team_coordination', 'reporting', 'planning']
      },

      saasPreferences: {
        gearFocus: 'productivity',
        budgetRange: 'pro',
        activities: ['project_planning', 'team_coordination', 'stakeholder_management', 'progress_tracking']
      },

      saasPreferences: {
        primaryActivities: ['project_planning', 'team_coordination', 'progress_tracking', 'stakeholder_communication'],
        secondaryActivities: ['resource_allocation', 'risk_management', 'process_improvement'],
        saasExperience: 'expert',
        collaborationStyle: 'facilitator',
        communicationPreference: 'mixed',
        preferredTools: ['project_management', 'gantt_charts', 'team_communication', 'reporting_tools'],
        workSchedule: 'flexible'
      },

      productivityPattern: {
        dailyActivityFrequency: 'very_high',
        contentTypes: ['projects', 'tasks', 'reports', 'messages', 'documents'],
        teamInteraction: {
          collaborativeWorkRatio: 0.8, // Highly collaborative role
          crossTeamCommunication: true, // Coordinates across teams
          meetingParticipation: 'leads' // Leads project meetings
        },
        productivityMetrics: {
          tasksPerWeek: 25, // High task throughput
          projectInvolvement: 'lead_multiple', // Leads multiple projects
          documentationHabits: 'standard' // Extensive project documentation
        }
      },

      platformUsage: {
        loginFrequency: 'multiple_daily',
        avgSessionDuration: 60, // Long sessions for project coordination
        featureUsage: {
          usesProjectManagement: true, // Primary feature usage
          usesTeamCommunication: true,
          usesReporting: true, // Heavy reporting for stakeholders
          usesIntegrations: true, // Integrates with many tools
          usesAdvancedFeatures: true,
          createsWorkflows: true // Creates project workflows
        },
        notificationPreferences: {
          realTime: true, // Needs real-time project updates
          emailSummaries: true,
          mobile: true, // Mobile access for project coordination
          slackIntegration: true // Slack integration for team communication
        }
      }
    };
  }

  /**
   * Generate team lead archetype - leads development teams
   */
  private static generateTeamLeadArchetype(): SaaSUserArchetype {
    return {
      email: 'teamlead@saasplatform.test',
      role: 'team_lead',
      name: 'Taylor Team-Lead',
      purpose: 'Technical team lead managing development teams and technical decisions',
      
      behavior: {
        contentCreation: {
          frequency: 'daily',
          types: ['technical_specs', 'code_reviews', 'team_updates', 'architecture_docs'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: true, // Shares technical knowledge
          collaborationLevel: 'very_high', // Leads team collaboration
          communityParticipation: 'medium' // Some external tech community involvement
        }
      },

      contentPattern: {
        setupsPerUser: 4, // Creates technical project setups
        itemsPerSetup: 10, // Technical task breakdowns
        publicRatio: 0.2, // Limited public sharing of technical content
        preferredCategories: ['technical_leadership', 'code_review', 'architecture', 'team_mentoring']
      },

      saasPreferences: {
        gearFocus: 'technical',
        budgetRange: 'pro',
        activities: ['technical_planning', 'code_review', 'team_mentoring', 'architecture_decisions']
      },

      saasPreferences: {
        primaryActivities: ['technical_planning', 'code_review', 'team_mentoring', 'architecture_design'],
        secondaryActivities: ['performance_optimization', 'technical_debt_management', 'tool_evaluation'],
        saasExperience: 'expert',
        collaborationStyle: 'leader',
        communicationPreference: 'mixed',
        preferredTools: ['code_repositories', 'project_management', 'communication_tools', 'development_tools'],
        workSchedule: 'flexible'
      },

      productivityPattern: {
        dailyActivityFrequency: 'high',
        contentTypes: ['tasks', 'documents', 'comments', 'messages'],
        teamInteraction: {
          collaborativeWorkRatio: 0.7, // Balance of individual and collaborative work
          crossTeamCommunication: true, // Coordinates with other teams
          meetingParticipation: 'active' // Active in technical meetings
        },
        productivityMetrics: {
          tasksPerWeek: 18, // Mix of technical and leadership tasks
          projectInvolvement: 'lead_multiple', // Leads technical aspects of multiple projects
          documentationHabits: 'standard' // Good technical documentation
        }
      },

      platformUsage: {
        loginFrequency: 'multiple_daily',
        avgSessionDuration: 50, // Focused technical sessions
        featureUsage: {
          usesProjectManagement: true,
          usesTeamCommunication: true,
          usesReporting: true, // Technical progress reporting
          usesIntegrations: true, // Development tool integrations
          usesAdvancedFeatures: true,
          createsWorkflows: true // Creates technical workflows
        },
        notificationPreferences: {
          realTime: true, // Real-time for critical technical issues
          emailSummaries: false, // Prefers immediate notifications
          mobile: true,
          slackIntegration: true // Heavy Slack usage for team communication
        }
      }
    };
  }

  /**
   * Generate senior developer archetype - experienced individual contributor
   */
  private static generateSeniorDeveloperArchetype(): SaaSUserArchetype {
    return {
      email: 'senior.dev@saasplatform.test',
      role: 'senior_developer',
      name: 'Alex Senior-Developer',
      purpose: 'Senior developer contributing to complex projects and mentoring junior developers',
      
      behavior: {
        contentCreation: {
          frequency: 'daily',
          types: ['code_contributions', 'technical_documentation', 'code_reviews', 'knowledge_sharing'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: false, // Focused on internal team sharing
          collaborationLevel: 'high', // High collaboration within development team
          communityParticipation: 'medium' // Some technical community involvement
        }
      },

      contentPattern: {
        setupsPerUser: 3, // Creates development workflows and setups
        itemsPerSetup: 8, // Technical implementation tasks
        publicRatio: 0.15, // Limited public sharing
        preferredCategories: ['development', 'technical_implementation', 'code_review', 'mentoring']
      },

      saasPreferences: {
        gearFocus: 'technical',
        budgetRange: 'pro',
        activities: ['coding', 'code_review', 'technical_design', 'mentoring']
      },

      saasPreferences: {
        primaryActivities: ['coding', 'technical_design', 'code_review', 'problem_solving'],
        secondaryActivities: ['mentoring', 'technical_research', 'tool_optimization'],
        saasExperience: 'expert',
        collaborationStyle: 'team_player',
        communicationPreference: 'async', // Prefers async communication for deep work
        preferredTools: ['development_environments', 'version_control', 'testing_tools', 'documentation'],
        workSchedule: 'flexible'
      },

      productivityPattern: {
        dailyActivityFrequency: 'high',
        contentTypes: ['tasks', 'documents', 'comments'],
        teamInteraction: {
          collaborativeWorkRatio: 0.6, // Balance of individual coding and collaboration
          crossTeamCommunication: false, // Primarily within development team
          meetingParticipation: 'standard' // Participates in necessary meetings
        },
        productivityMetrics: {
          tasksPerWeek: 12, // Focused on complex technical tasks
          projectInvolvement: 'multiple', // Contributes to multiple projects
          documentationHabits: 'standard' // Good technical documentation practices
        }
      },

      platformUsage: {
        loginFrequency: 'daily',
        avgSessionDuration: 40, // Focused work sessions
        featureUsage: {
          usesProjectManagement: true, // Uses for task tracking
          usesTeamCommunication: true,
          usesReporting: false, // Limited reporting usage
          usesIntegrations: true, // Development tool integrations
          usesAdvancedFeatures: true, // Uses advanced technical features
          createsWorkflows: false // Uses existing workflows
        },
        notificationPreferences: {
          realTime: false, // Prefers batched notifications for focus
          emailSummaries: true,
          mobile: false, // Limited mobile usage during deep work
          slackIntegration: true
        }
      }
    };
  }

  /**
   * Generate team member archetype - collaborative team participant
   */
  private static generateTeamMemberArchetype(): SaaSUserArchetype {
    return {
      email: 'member@saasplatform.test',
      role: 'team_member',
      name: 'Jordan Team-Member',
      purpose: 'Team member participating in collaborative projects and contributing to team goals',
      
      behavior: {
        contentCreation: {
          frequency: 'daily',
          types: ['task_updates', 'project_contributions', 'team_communications', 'status_reports'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: false, // Primarily consumes and contributes within team
          collaborationLevel: 'high', // High team collaboration
          communityParticipation: 'low' // Focused on internal team work
        }
      },

      contentPattern: {
        setupsPerUser: 2, // Creates personal productivity setups
        itemsPerSetup: 6, // Standard task management
        publicRatio: 0.1, // Minimal public sharing
        preferredCategories: ['task_management', 'team_collaboration', 'project_contribution']
      },

      saasPreferences: {
        gearFocus: 'collaboration',
        budgetRange: 'basic',
        activities: ['task_execution', 'team_collaboration', 'skill_development', 'project_contribution']
      },

      saasPreferences: {
        primaryActivities: ['task_execution', 'team_collaboration', 'project_contribution', 'communication'],
        secondaryActivities: ['skill_development', 'knowledge_sharing', 'process_improvement'],
        saasExperience: 'intermediate',
        collaborationStyle: 'team_player',
        communicationPreference: 'mixed',
        preferredTools: ['task_management', 'team_communication', 'file_sharing', 'calendar'],
        workSchedule: 'standard'
      },

      productivityPattern: {
        dailyActivityFrequency: 'high',
        contentTypes: ['tasks', 'messages', 'comments'],
        teamInteraction: {
          collaborativeWorkRatio: 0.7, // High collaborative work
          crossTeamCommunication: false, // Primarily within own team
          meetingParticipation: 'active' // Active team meeting participant
        },
        productivityMetrics: {
          tasksPerWeek: 15, // Standard task completion rate
          projectInvolvement: 'multiple', // Involved in multiple team projects
          documentationHabits: 'minimal' // Basic documentation practices
        }
      },

      platformUsage: {
        loginFrequency: 'daily',
        avgSessionDuration: 35, // Standard work sessions
        featureUsage: {
          usesProjectManagement: true,
          usesTeamCommunication: true,
          usesReporting: false, // Limited reporting usage
          usesIntegrations: false, // Uses standard integrations
          usesAdvancedFeatures: false, // Uses core features
          createsWorkflows: false // Uses team-created workflows
        },
        notificationPreferences: {
          realTime: true, // Wants real-time team updates
          emailSummaries: false,
          mobile: true, // Mobile access for team communication
          slackIntegration: true
        }
      }
    };
  }

  /**
   * Generate individual contributor archetype - self-directed worker
   */
  private static generateIndividualContributorArchetype(): SaaSUserArchetype {
    return {
      email: 'individual@saasplatform.test',
      role: 'contributor',
      name: 'Casey Individual-Contributor',
      purpose: 'Self-directed individual contributor working independently on specialized tasks',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['project_deliverables', 'progress_updates', 'specialized_content'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: false, // Minimal sharing, focused on individual work
          collaborationLevel: 'medium', // Some collaboration when needed
          communityParticipation: 'low' // Primarily individual focus
        }
      },

      contentPattern: {
        setupsPerUser: 1, // Personal productivity setup
        itemsPerSetup: 4, // Simple personal task management
        publicRatio: 0.05, // Very limited public sharing
        preferredCategories: ['individual_productivity', 'specialized_work', 'personal_organization']
      },

      saasPreferences: {
        gearFocus: 'individual_productivity',
        budgetRange: 'basic',
        activities: ['independent_work', 'specialized_tasks', 'personal_development', 'focused_execution']
      },

      saasPreferences: {
        primaryActivities: ['independent_work', 'specialized_execution', 'personal_productivity', 'deliverable_creation'],
        secondaryActivities: ['skill_development', 'quality_control', 'time_management'],
        saasExperience: 'intermediate',
        collaborationStyle: 'individual_contributor',
        communicationPreference: 'async', // Prefers asynchronous communication
        preferredTools: ['personal_productivity', 'specialized_tools', 'time_tracking', 'note_taking'],
        workSchedule: 'flexible'
      },

      productivityPattern: {
        dailyActivityFrequency: 'medium',
        contentTypes: ['tasks', 'documents'],
        teamInteraction: {
          collaborativeWorkRatio: 0.3, // Primarily individual work
          crossTeamCommunication: false, // Limited cross-team communication
          meetingParticipation: 'minimal' // Minimal meeting participation
        },
        productivityMetrics: {
          tasksPerWeek: 8, // Focused on fewer, more complex tasks
          projectInvolvement: 'single', // Usually focused on one main project
          documentationHabits: 'minimal' // Personal documentation only
        }
      },

      platformUsage: {
        loginFrequency: 'daily',
        avgSessionDuration: 25, // Shorter, focused sessions
        featureUsage: {
          usesProjectManagement: true, // Personal task management
          usesTeamCommunication: false, // Limited team communication
          usesReporting: false,
          usesIntegrations: false,
          usesAdvancedFeatures: false,
          createsWorkflows: false // Uses basic functionality
        },
        notificationPreferences: {
          realTime: false, // Prefers batch notifications
          emailSummaries: true,
          mobile: false, // Limited mobile usage
          slackIntegration: false
        }
      }
    };
  }

  /**
   * Generate analyst archetype - data-focused team member
   */
  private static generateAnalystArchetype(): SaaSUserArchetype {
    return {
      email: 'analyst@saasplatform.test',
      role: 'analyst',
      name: 'Robin Data-Analyst',
      purpose: 'Data analyst providing insights and reports to support team decision-making',
      
      behavior: {
        contentCreation: {
          frequency: 'weekly',
          types: ['data_reports', 'insights', 'dashboards', 'analysis_documents'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: true, // Shares insights and reports
          collaborationLevel: 'medium', // Collaborates on data needs
          communityParticipation: 'medium' // Some data community involvement
        }
      },

      contentPattern: {
        setupsPerUser: 2, // Creates reporting and analysis setups
        itemsPerSetup: 8, // Detailed analysis tasks
        publicRatio: 0.25, // Some methodology sharing
        preferredCategories: ['data_analysis', 'reporting', 'insights', 'visualization']
      },

      saasPreferences: {
        gearFocus: 'analytics',
        budgetRange: 'pro',
        activities: ['data_analysis', 'report_creation', 'insight_generation', 'dashboard_management']
      },

      saasPreferences: {
        primaryActivities: ['data_analysis', 'report_creation', 'insight_generation', 'data_visualization'],
        secondaryActivities: ['data_quality_assurance', 'methodology_development', 'stakeholder_communication'],
        saasExperience: 'expert',
        collaborationStyle: 'facilitator',
        communicationPreference: 'mixed',
        preferredTools: ['analytics_tools', 'visualization_software', 'reporting_platforms', 'data_sources'],
        workSchedule: 'standard'
      },

      productivityPattern: {
        dailyActivityFrequency: 'medium',
        contentTypes: ['reports', 'documents', 'tasks'],
        teamInteraction: {
          collaborativeWorkRatio: 0.5, // Balance of individual analysis and team collaboration
          crossTeamCommunication: true, // Works with multiple teams for data needs
          meetingParticipation: 'active' // Active in data review meetings
        },
        productivityMetrics: {
          tasksPerWeek: 10, // Complex analytical tasks
          projectInvolvement: 'multiple', // Supports multiple projects with data
          documentationHabits: 'standard' // Extensive documentation for reproducibility
        }
      },

      platformUsage: {
        loginFrequency: 'daily',
        avgSessionDuration: 55, // Long sessions for deep analysis
        featureUsage: {
          usesProjectManagement: true, // Tracks analysis projects
          usesTeamCommunication: true,
          usesReporting: true, // Heavy reporting feature usage
          usesIntegrations: true, // Data source integrations
          usesAdvancedFeatures: true, // Advanced analytics features
          createsWorkflows: true // Creates analytical workflows
        },
        notificationPreferences: {
          realTime: false, // Prefers focused work time
          emailSummaries: true,
          mobile: false,
          slackIntegration: true
        }
      }
    };
  }

  /**
   * Generate freelancer archetype - external contractor or consultant
   */
  private static generateFreelancerArchetype(): SaaSUserArchetype {
    return {
      email: 'freelancer@saasplatform.test',
      role: 'contractor',
      name: 'Morgan Freelancer-Pro',
      purpose: 'Freelance professional managing multiple client projects and deliverables',
      
      behavior: {
        contentCreation: {
          frequency: 'daily',
          types: ['client_deliverables', 'project_updates', 'time_tracking', 'proposals'],
          sharingPattern: 'team_focused'
        },
        engagement: {
          likesToShare: false, // Client confidentiality focused
          collaborationLevel: 'medium', // Collaborates with client teams as needed
          communityParticipation: 'high' // Active in freelancer communities
        }
      },

      contentPattern: {
        setupsPerUser: 5, // Multiple client project setups
        itemsPerSetup: 6, // Client-specific task organization
        publicRatio: 0.1, // Limited public sharing due to client confidentiality
        preferredCategories: ['client_management', 'project_delivery', 'time_management', 'business_development']
      },

      saasPreferences: {
        gearFocus: 'efficiency',
        budgetRange: 'pro',
        activities: ['client_work', 'project_management', 'business_development', 'skill_advancement']
      },

      saasPreferences: {
        primaryActivities: ['client_project_execution', 'time_tracking', 'project_management', 'client_communication'],
        secondaryActivities: ['business_development', 'proposal_creation', 'skill_development', 'networking'],
        saasExperience: 'power_user',
        collaborationStyle: 'individual_contributor',
        communicationPreference: 'mixed',
        preferredTools: ['project_management', 'time_tracking', 'invoicing', 'client_communication'],
        workSchedule: 'flexible'
      },

      productivityPattern: {
        dailyActivityFrequency: 'very_high',
        contentTypes: ['projects', 'tasks', 'documents', 'messages'],
        teamInteraction: {
          collaborativeWorkRatio: 0.4, // Mix of individual work and client collaboration
          crossTeamCommunication: true, // Works with multiple client teams
          meetingParticipation: 'active' // Active in client meetings
        },
        productivityMetrics: {
          tasksPerWeek: 20, // High task throughput across multiple clients
          projectInvolvement: 'lead_multiple', // Leads multiple client projects
          documentationHabits: 'standard' // Detailed documentation for clients
        }
      },

      platformUsage: {
        loginFrequency: 'multiple_daily',
        avgSessionDuration: 45, // Efficient, focused sessions
        featureUsage: {
          usesProjectManagement: true, // Essential for client project management
          usesTeamCommunication: true,
          usesReporting: true, // Client reporting
          usesIntegrations: true, // Billing and communication integrations
          usesAdvancedFeatures: true, // Uses all available features for efficiency
          createsWorkflows: true // Custom workflows for different client types
        },
        notificationPreferences: {
          realTime: true, // Needs immediate client communication
          emailSummaries: true,
          mobile: true, // Mobile access for client responsiveness
          slackIntegration: false // Uses client-specific communication tools
        }
      }
    };
  }

  /**
   * Generate contextual user behavior based on archetype and work context
   */
  static generateContextualBehavior(
    archetype: SaaSUserArchetype,
    context: {
      timeOfDay: string;
      dayOfWeek: string;
      projectPhase: string;
      teamSize: number;
    }
  ): {
    likelihood: number; // 0-1 probability of being active
    expectedActions: string[];
    sessionDuration: number; // minutes
    focusLevel: number; // 0-1 focus intensity
  } {
    let likelihood = 0.5; // Base likelihood
    const expectedActions: string[] = [];
    let sessionDuration = archetype.platformUsage.avgSessionDuration;
    let focusLevel = 0.5;

    // Adjust based on login frequency
    if (archetype.platformUsage.loginFrequency === 'multiple_daily') {
      likelihood += 0.4;
    } else if (archetype.platformUsage.loginFrequency === 'daily') {
      likelihood += 0.3;
    }

    // Adjust based on time of day and work schedule
    if (archetype.saasPreferences.workSchedule === 'flexible') {
      // Flexible workers more likely to be active outside traditional hours
      if (context.timeOfDay === 'early_morning' || context.timeOfDay === 'evening') {
        likelihood += 0.2;
      }
    } else if (archetype.saasPreferences.workSchedule === 'standard') {
      // Standard workers more active during business hours
      if (context.timeOfDay === 'morning' || context.timeOfDay === 'afternoon') {
        likelihood += 0.3;
      }
    }

    // Adjust based on role and project phase
    if (archetype.role === 'project_manager' && context.projectPhase === 'planning') {
      likelihood += 0.3;
      expectedActions.push('create_project_plan', 'assign_tasks', 'schedule_meetings');
      sessionDuration *= 1.4;
      focusLevel = 0.8;
    } else if (archetype.role === 'developer' && context.projectPhase === 'implementation') {
      likelihood += 0.2;
      expectedActions.push('update_task_status', 'commit_code', 'review_code');
      focusLevel = 0.9; // High focus for development work
    }

    // Team size impact
    if (context.teamSize > 10 && archetype.saasPreferences.collaborationStyle === 'leader') {
      likelihood += 0.2;
      expectedActions.push('coordinate_teams', 'review_progress', 'update_stakeholders');
      sessionDuration *= 1.3;
    }

    // Determine actions based on archetype patterns
    if (archetype.productivityPattern.dailyActivityFrequency === 'very_high') {
      expectedActions.push('check_notifications', 'update_tasks', 'respond_messages');
    }

    if (archetype.platformUsage.featureUsage.usesReporting && 
        (context.dayOfWeek === 'friday' || context.dayOfWeek === 'monday')) {
      expectedActions.push('generate_reports', 'review_metrics');
      sessionDuration *= 1.2;
    }

    return {
      likelihood: Math.min(1, Math.max(0, likelihood)),
      expectedActions,
      sessionDuration: Math.round(sessionDuration),
      focusLevel: Math.min(1, Math.max(0, focusLevel))
    };
  }

  /**
   * Generate productivity preferences for an archetype
   */
  static generateProductivityPreferences(archetype: SaaSUserArchetype): {
    preferredFeatures: string[];
    avoidedFeatures: string[];
    workflowPreferences: string[];
    integrationNeeds: string[];
    notificationThreshold: 'minimal' | 'standard';
  } {
    const preferences = {
      preferredFeatures: [] as string[],
      avoidedFeatures: [] as string[],
      workflowPreferences: [] as string[],
      integrationNeeds: [] as string[],
      notificationThreshold: 'standard' as const
    };

    // Set preferences based on role and experience
    switch (archetype.role) {
      case 'admin':
        preferences.preferredFeatures = ['user_management', 'analytics', 'billing', 'security_controls'];
        preferences.avoidedFeatures = ['individual_task_management'];
        preferences.workflowPreferences = ['automation', 'bulk_operations', 'administrative_workflows'];
        preferences.integrationNeeds = ['sso', 'billing_systems', 'user_directories'];
        preferences.notificationThreshold = 'standard';
        break;

      case 'project_manager':
        preferences.preferredFeatures = ['project_templates', 'gantt_charts', 'resource_management', 'reporting'];
        preferences.avoidedFeatures = ['technical_tools'];
        preferences.workflowPreferences = ['project_templates', 'milestone_tracking', 'stakeholder_updates'];
        preferences.integrationNeeds = ['calendar', 'email', 'communication_tools'];
        preferences.notificationThreshold = 'standard';
        break;

      case 'developer':
        preferences.preferredFeatures = ['code_integration', 'issue_tracking', 'time_tracking'];
        preferences.avoidedFeatures = ['marketing_tools', 'sales_features'];
        preferences.workflowPreferences = ['agile_workflows', 'code_review_processes'];
        preferences.integrationNeeds = ['github', 'jira', 'development_tools'];
        preferences.notificationThreshold = 'standard';
        break;

      default:
        preferences.preferredFeatures = ['task_management', 'team_communication'];
        preferences.workflowPreferences = ['simple_workflows'];
        preferences.integrationNeeds = ['calendar', 'email'];
    }

    // Adjust based on experience level
    if (archetype.saasPreferences.saasExperience === 'power_user') {
      preferences.preferredFeatures.push('advanced_automation', 'custom_fields', 'api_access');
      preferences.workflowPreferences.push('custom_workflows', 'advanced_filtering');
    } else if (archetype.saasPreferences.saasExperience === 'novice') {
      preferences.avoidedFeatures.push('advanced_features', 'complex_workflows');
      preferences.workflowPreferences.push('simple_templates', 'guided_setup');
    }

    return preferences;
  }

  /**
   * Simulate user's response to a project or workspace based on their archetype
   */
  static simulateWorkspaceResponse(
    archetype: SaaSUserArchetype,
    workspace: TeamWorkspace
  ): {
    wouldJoin: boolean;
    engagementLevel: 'low' | 'medium' | 'high' | 'very_high';
    contributionStyle: string;
    expectedTasks: string[];
    communicationFrequency: 'low' | 'medium' | 'high';
  } {
    let interestScore = 0;

    // Check industry alignment
    if (archetype.saasPreferences.preferredTools.some(tool => 
        workspace.settings.integrations.includes(tool))) {
      interestScore += 0.3;
    }

    // Check team size preference
    const teamSize = workspace.members.length;
    if ((teamSize <= 10 && archetype.saasPreferences.collaborationStyle === 'individual_contributor') ||
        (teamSize > 10 && archetype.saasPreferences.collaborationStyle === 'leader')) {
      interestScore += 0.2;
    }

    // Check project complexity alignment
    const hasComplexProjects = workspace.projects.some(p => p.tasks.length > 10);
    if (hasComplexProjects && archetype.saasPreferences.saasExperience === 'expert') {
      interestScore += 0.2;
    }

    const wouldJoin = interestScore > 0.4;
    const engagementLevel = interestScore > 0.7 ? 'very_high' : 
                           interestScore > 0.5 ? 'high' : 
                           interestScore > 0.3 ? 'medium' : 'low';

    // Determine contribution style based on archetype
    let contributionStyle = 'standard_contributor';
    if (archetype.role === 'admin') contributionStyle = 'administrative_oversight';
    else if (archetype.role === 'project_manager') contributionStyle = 'coordination_and_planning';
    else if (archetype.saasPreferences.collaborationStyle === 'leader') contributionStyle = 'technical_leadership';

    // Expected tasks based on role and archetype
    const expectedTasks: string[] = [];
    if (archetype.platformUsage.featureUsage.usesProjectManagement) {
      expectedTasks.push('project_planning', 'task_management');
    }
    if (archetype.platformUsage.featureUsage.usesReporting) {
      expectedTasks.push('progress_reporting', 'metrics_analysis');
    }
    if (archetype.productivityPattern.teamInteraction.collaborativeWorkRatio > 0.6) {
      expectedTasks.push('team_coordination', 'knowledge_sharing');
    }

    // Communication frequency based on archetype preferences
    const communicationFrequency = 
      archetype.saasPreferences.communicationPreference === 'sync' ? 'high' :
      archetype.saasPreferences.communicationPreference === 'async' ? 'low' : 'medium';

    return {
      wouldJoin,
      engagementLevel,
      contributionStyle,
      expectedTasks,
      communicationFrequency
    };
  }
}