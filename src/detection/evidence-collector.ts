/**
 * Architecture Evidence Collection System for Epic 2: Smart Platform Detection Engine
 * Specialized evidence collection and reasoning for platform architecture detection
 * Part of Task 2.1.4: Add architecture-specific evidence collection and reasoning
 */

import {
  ArchitectureEvidence,
  EvidenceType,
  PlatformArchitectureType,
  DetectionAnalysisContext,
  PlatformFeature,
  PlatformFeatureCategory
} from './detection-types';

/**
 * Evidence collection configuration
 */
export interface EvidenceCollectionConfig {
  /** Whether to collect detailed table analysis evidence */
  detailedTableAnalysis: boolean;
  
  /** Whether to analyze column naming patterns */
  analyzeColumnPatterns: boolean;
  
  /** Whether to examine relationship patterns */
  analyzeRelationships: boolean;
  
  /** Whether to inspect business logic functions */
  analyzeBusinessLogic: boolean;
  
  /** Maximum evidence items to collect per type */
  maxEvidencePerType: number;
  
  /** Minimum confidence threshold for evidence inclusion */
  minEvidenceConfidence: number;
}

/**
 * Evidence reasoning and analysis result
 */
export interface EvidenceAnalysisResult {
  /** All collected evidence */
  evidence: ArchitectureEvidence[];
  
  /** Architecture confidence scores based on evidence */
  architectureScores: {
    individual: number;
    team: number;
    hybrid: number;
  };
  
  /** Platform features detected from evidence */
  platformFeatures: PlatformFeature[];
  
  /** Detailed reasoning for architecture determination */
  reasoning: string[];
  
  /** Confidence in the overall analysis */
  overallConfidence: number;
  
  /** Warnings about evidence quality or conflicts */
  warnings: string[];
}

/**
 * Individual platform evidence patterns
 */
export class IndividualEvidenceCollector {
  /**
   * Collect evidence pointing to individual creator platform architecture
   */
  async collectIndividualEvidence(
    context: DetectionAnalysisContext,
    config: EvidenceCollectionConfig
  ): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Collect user-centric table evidence
    const userCentricEvidence = await this.collectUserCentricEvidence(context);
    evidence.push(...userCentricEvidence);

    // Collect simple account structure evidence
    const simpleAccountEvidence = await this.collectSimpleAccountEvidence(context);
    evidence.push(...simpleAccountEvidence);

    // Collect personal content evidence
    const personalContentEvidence = await this.collectPersonalContentEvidence(context);
    evidence.push(...personalContentEvidence);

    // Collect limited collaboration evidence
    const limitedCollabEvidence = await this.collectLimitedCollaborationEvidence(context);
    evidence.push(...limitedCollabEvidence);

    return this.filterAndRankEvidence(evidence, config);
  }

  private async collectUserCentricEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for user profile tables
    const profileTables = schema.tableNames.filter(name => 
      /^(user_profiles?|profiles?|users_profiles?)$/i.test(name)
    );

    if (profileTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found user profile tables: ${profileTables.join(', ')}`,
        confidence: 0.8,
        weight: 0.7,
        supportingData: {
          tables: profileTables,
          patterns: ['user_profile_focus']
        },
        architectureIndicators: {
          individual: 0.8,
          team: 0.2,
          hybrid: 0.4
        }
      });
    }

    // Look for personal content tables
    const personalContentTables = schema.tableNames.filter(name =>
      /^(posts?|articles?|stories?|content|creations?|items?)$/i.test(name)
    );

    if (personalContentTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found personal content tables: ${personalContentTables.join(', ')}`,
        confidence: 0.7,
        weight: 0.6,
        supportingData: {
          tables: personalContentTables,
          patterns: ['personal_content_focus']
        },
        architectureIndicators: {
          individual: 0.9,
          team: 0.1,
          hybrid: 0.3
        }
      });
    }

    return evidence;
  }

  private async collectSimpleAccountEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for accounts table with simple structure
    const accountTables = schema.tableNames.filter(name => 
      /^accounts?$/i.test(name)
    );

    if (accountTables.length > 0) {
      // Check if accounts table lacks team-oriented columns
      const hasTeamColumns = schema.relationships.some(rel =>
        rel.fromTable.toLowerCase().includes('account') && 
        (rel.toTable.toLowerCase().includes('member') || 
         rel.toTable.toLowerCase().includes('team') ||
         rel.toTable.toLowerCase().includes('organization'))
      );

      if (!hasTeamColumns) {
        evidence.push({
          type: 'relationship_pattern',
          description: 'Accounts table lacks team/organization relationships',
          confidence: 0.75,
          weight: 0.8,
          supportingData: {
            tables: accountTables,
            patterns: ['simple_account_structure']
          },
          architectureIndicators: {
            individual: 0.8,
            team: 0.1,
            hybrid: 0.2
          }
        });
      }
    }

    return evidence;
  }

  private async collectPersonalContentEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for direct user-to-content relationships
    const userContentRelationships = schema.relationships.filter(rel =>
      (rel.fromTable.toLowerCase().includes('user') && 
       (rel.toTable.toLowerCase().includes('post') ||
        rel.toTable.toLowerCase().includes('content') ||
        rel.toTable.toLowerCase().includes('item') ||
        rel.toTable.toLowerCase().includes('creation'))) ||
      (rel.toTable.toLowerCase().includes('user') && 
       (rel.fromTable.toLowerCase().includes('post') ||
        rel.fromTable.toLowerCase().includes('content') ||
        rel.fromTable.toLowerCase().includes('item') ||
        rel.fromTable.toLowerCase().includes('creation')))
    );

    if (userContentRelationships.length > 0) {
      evidence.push({
        type: 'relationship_pattern',
        description: `Found direct user-content relationships: ${userContentRelationships.length} connections`,
        confidence: 0.8,
        weight: 0.7,
        supportingData: {
          patterns: ['direct_user_content_ownership'],
          samples: userContentRelationships.map(rel => `${rel.fromTable} -> ${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.9,
          team: 0.2,
          hybrid: 0.4
        }
      });
    }

    return evidence;
  }

  private async collectLimitedCollaborationEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for absence of team collaboration tables
    const collaborationTables = schema.tableNames.filter(name =>
      /^(teams?|organizations?|workspaces?|groups?|members?|roles?|permissions?)$/i.test(name)
    );

    if (collaborationTables.length === 0) {
      evidence.push({
        type: 'table_pattern',
        description: 'Absence of team collaboration tables (teams, organizations, workspaces)',
        confidence: 0.7,
        weight: 0.6,
        supportingData: {
          patterns: ['no_team_structures']
        },
        architectureIndicators: {
          individual: 0.8,
          team: 0.1,
          hybrid: 0.3
        }
      });
    } else if (collaborationTables.length <= 2) {
      evidence.push({
        type: 'table_pattern',
        description: `Minimal collaboration structures: ${collaborationTables.join(', ')}`,
        confidence: 0.6,
        weight: 0.5,
        supportingData: {
          tables: collaborationTables,
          patterns: ['minimal_collaboration']
        },
        architectureIndicators: {
          individual: 0.6,
          team: 0.4,
          hybrid: 0.7
        }
      });
    }

    return evidence;
  }

  private filterAndRankEvidence(
    evidence: ArchitectureEvidence[], 
    config: EvidenceCollectionConfig
  ): ArchitectureEvidence[] {
    return evidence
      .filter(e => e.confidence >= config.minEvidenceConfidence)
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, config.maxEvidencePerType);
  }
}

/**
 * Team platform evidence patterns
 */
export class TeamEvidenceCollector {
  /**
   * Collect evidence pointing to team collaboration platform architecture
   */
  async collectTeamEvidence(
    context: DetectionAnalysisContext,
    config: EvidenceCollectionConfig
  ): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Collect team structure evidence
    const teamStructureEvidence = await this.collectTeamStructureEvidence(context);
    evidence.push(...teamStructureEvidence);

    // Collect member management evidence
    const memberManagementEvidence = await this.collectMemberManagementEvidence(context);
    evidence.push(...memberManagementEvidence);

    // Collect workspace evidence
    const workspaceEvidence = await this.collectWorkspaceEvidence(context);
    evidence.push(...workspaceEvidence);

    // Collect permission system evidence
    const permissionEvidence = await this.collectPermissionSystemEvidence(context);
    evidence.push(...permissionEvidence);

    return this.filterAndRankEvidence(evidence, config);
  }

  private async collectTeamStructureEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for team/organization tables
    const teamTables = schema.tableNames.filter(name =>
      /^(teams?|organizations?|companies?|groups?)$/i.test(name)
    );

    if (teamTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found team structure tables: ${teamTables.join(', ')}`,
        confidence: 0.9,
        weight: 0.9,
        supportingData: {
          tables: teamTables,
          patterns: ['team_organization_structure']
        },
        architectureIndicators: {
          individual: 0.1,
          team: 0.9,
          hybrid: 0.7
        }
      });
    }

    return evidence;
  }

  private async collectMemberManagementEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for member/invitation tables
    const memberTables = schema.tableNames.filter(name =>
      /^(members?|team_members?|organization_members?|invitations?|invites?)$/i.test(name)
    );

    if (memberTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found member management tables: ${memberTables.join(', ')}`,
        confidence: 0.85,
        weight: 0.8,
        supportingData: {
          tables: memberTables,
          patterns: ['member_management_system']
        },
        architectureIndicators: {
          individual: 0.1,
          team: 0.9,
          hybrid: 0.6
        }
      });
    }

    // Look for role-based relationships
    const roleRelationships = schema.relationships.filter(rel =>
      (rel.fromTable.toLowerCase().includes('member') && 
       rel.toTable.toLowerCase().includes('role')) ||
      (rel.fromTable.toLowerCase().includes('user') && 
       rel.toTable.toLowerCase().includes('role'))
    );

    if (roleRelationships.length > 0) {
      evidence.push({
        type: 'relationship_pattern',
        description: `Found role-based member relationships: ${roleRelationships.length} connections`,
        confidence: 0.8,
        weight: 0.7,
        supportingData: {
          patterns: ['role_based_membership'],
          samples: roleRelationships.map(rel => `${rel.fromTable} -> ${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.2,
          team: 0.8,
          hybrid: 0.6
        }
      });
    }

    return evidence;
  }

  private async collectWorkspaceEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for workspace/project tables
    const workspaceTables = schema.tableNames.filter(name =>
      /^(workspaces?|projects?|boards?|channels?)$/i.test(name)
    );

    if (workspaceTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found workspace/project tables: ${workspaceTables.join(', ')}`,
        confidence: 0.8,
        weight: 0.7,
        supportingData: {
          tables: workspaceTables,
          patterns: ['workspace_project_structure']
        },
        architectureIndicators: {
          individual: 0.2,
          team: 0.8,
          hybrid: 0.7
        }
      });
    }

    return evidence;
  }

  private async collectPermissionSystemEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for permission/role tables
    const permissionTables = schema.tableNames.filter(name =>
      /^(permissions?|roles?|access_controls?|policies?)$/i.test(name)
    );

    if (permissionTables.length > 1) {  // More than just basic roles
      evidence.push({
        type: 'table_pattern',
        description: `Found complex permission system: ${permissionTables.join(', ')}`,
        confidence: 0.85,
        weight: 0.8,
        supportingData: {
          tables: permissionTables,
          patterns: ['complex_permission_system']
        },
        architectureIndicators: {
          individual: 0.1,
          team: 0.9,
          hybrid: 0.6
        }
      });
    }

    return evidence;
  }

  private filterAndRankEvidence(
    evidence: ArchitectureEvidence[], 
    config: EvidenceCollectionConfig
  ): ArchitectureEvidence[] {
    return evidence
      .filter(e => e.confidence >= config.minEvidenceConfidence)
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, config.maxEvidencePerType);
  }
}

/**
 * Hybrid platform evidence patterns
 */
export class HybridEvidenceCollector {
  /**
   * Collect evidence pointing to hybrid platform architecture
   */
  async collectHybridEvidence(
    context: DetectionAnalysisContext,
    config: EvidenceCollectionConfig
  ): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];

    // Collect flexible account evidence
    const flexibleAccountEvidence = await this.collectFlexibleAccountEvidence(context);
    evidence.push(...flexibleAccountEvidence);

    // Collect mixed ownership evidence
    const mixedOwnershipEvidence = await this.collectMixedOwnershipEvidence(context);
    evidence.push(...mixedOwnershipEvidence);

    // Collect scalable permission evidence
    const scalablePermissionEvidence = await this.collectScalablePermissionEvidence(context);
    evidence.push(...scalablePermissionEvidence);

    // Collect dual capability evidence
    const dualCapabilityEvidence = await this.collectDualCapabilityEvidence(context);
    evidence.push(...dualCapabilityEvidence);

    return this.filterAndRankEvidence(evidence, config);
  }

  private async collectFlexibleAccountEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for accounts that can be both individual and team
    const accountTypes = schema.tableNames.filter(name =>
      /^(accounts?|account_types?)$/i.test(name)
    );

    // Check for flexible account structure via relationships
    const accountRelationships = schema.relationships.filter(rel =>
      rel.fromTable.toLowerCase().includes('account') || 
      rel.toTable.toLowerCase().includes('account')
    );

    const hasIndividualRelations = accountRelationships.some(rel =>
      rel.fromTable.toLowerCase().includes('user') || 
      rel.toTable.toLowerCase().includes('user')
    );

    const hasTeamRelations = accountRelationships.some(rel =>
      rel.fromTable.toLowerCase().includes('member') || 
      rel.toTable.toLowerCase().includes('member') ||
      rel.fromTable.toLowerCase().includes('team') || 
      rel.toTable.toLowerCase().includes('team')
    );

    if (hasIndividualRelations && hasTeamRelations) {
      evidence.push({
        type: 'relationship_pattern',
        description: 'Accounts support both individual users and team members',
        confidence: 0.9,
        weight: 0.9,
        supportingData: {
          patterns: ['flexible_account_structure'],
          samples: accountRelationships.map(rel => `${rel.fromTable} -> ${rel.toTable}`)
        },
        architectureIndicators: {
          individual: 0.3,
          team: 0.3,
          hybrid: 0.9
        }
      });
    }

    return evidence;
  }

  private async collectMixedOwnershipEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for content that can be owned by both users and teams
    const contentTables = schema.tableNames.filter(name =>
      /^(posts?|content|items?|resources?|projects?)$/i.test(name)
    );

    const ownershipRelationships = schema.relationships.filter(rel =>
      contentTables.some(table => 
        rel.fromTable.toLowerCase() === table.toLowerCase() ||
        rel.toTable.toLowerCase() === table.toLowerCase()
      )
    );

    const hasUserOwnership = ownershipRelationships.some(rel =>
      rel.fromTable.toLowerCase().includes('user') || 
      rel.toTable.toLowerCase().includes('user')
    );

    const hasTeamOwnership = ownershipRelationships.some(rel =>
      rel.fromTable.toLowerCase().includes('team') || 
      rel.toTable.toLowerCase().includes('team') ||
      rel.fromTable.toLowerCase().includes('organization') || 
      rel.toTable.toLowerCase().includes('organization')
    );

    if (hasUserOwnership && hasTeamOwnership) {
      evidence.push({
        type: 'relationship_pattern',
        description: 'Content can be owned by both individual users and teams',
        confidence: 0.85,
        weight: 0.8,
        supportingData: {
          tables: contentTables,
          patterns: ['mixed_ownership_patterns']
        },
        architectureIndicators: {
          individual: 0.2,
          team: 0.2,
          hybrid: 0.8
        }
      });
    }

    return evidence;
  }

  private async collectScalablePermissionEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for permission systems that support both individual and team access
    const permissionTables = schema.tableNames.filter(name =>
      /^(permissions?|access_controls?|shares?|visibility?)$/i.test(name)
    );

    if (permissionTables.length > 0) {
      const permissionRelationships = schema.relationships.filter(rel =>
        permissionTables.some(table => 
          rel.fromTable.toLowerCase() === table.toLowerCase() ||
          rel.toTable.toLowerCase() === table.toLowerCase()
        )
      );

      const hasUserPermissions = permissionRelationships.some(rel =>
        rel.fromTable.toLowerCase().includes('user') || 
        rel.toTable.toLowerCase().includes('user')
      );

      const hasTeamPermissions = permissionRelationships.some(rel =>
        rel.fromTable.toLowerCase().includes('team') || 
        rel.toTable.toLowerCase().includes('team') ||
        rel.fromTable.toLowerCase().includes('member') || 
        rel.toTable.toLowerCase().includes('member')
      );

      if (hasUserPermissions && hasTeamPermissions) {
        evidence.push({
          type: 'relationship_pattern',
          description: 'Permission system supports both individual and team access patterns',
          confidence: 0.8,
          weight: 0.7,
          supportingData: {
            tables: permissionTables,
            patterns: ['scalable_permission_system']
          },
          architectureIndicators: {
            individual: 0.3,
            team: 0.3,
            hybrid: 0.8
          }
        });
      }
    }

    return evidence;
  }

  private async collectDualCapabilityEvidence(context: DetectionAnalysisContext): Promise<ArchitectureEvidence[]> {
    const evidence: ArchitectureEvidence[] = [];
    const { schema } = context;

    // Look for tables that suggest both individual and team capabilities
    const dualCapabilityTables = schema.tableNames.filter(name =>
      /^(contexts?|scopes?|environments?|modes?)$/i.test(name)
    );

    if (dualCapabilityTables.length > 0) {
      evidence.push({
        type: 'table_pattern',
        description: `Found dual capability indicators: ${dualCapabilityTables.join(', ')}`,
        confidence: 0.7,
        weight: 0.6,
        supportingData: {
          tables: dualCapabilityTables,
          patterns: ['dual_capability_structure']
        },
        architectureIndicators: {
          individual: 0.4,
          team: 0.4,
          hybrid: 0.8
        }
      });
    }

    // Look for context-switching patterns
    const contextSwitchingRelationships = schema.relationships.filter(rel =>
      (rel.columnName.toLowerCase().includes('context') ||
       rel.columnName.toLowerCase().includes('scope') ||
       rel.columnName.toLowerCase().includes('mode'))
    );

    if (contextSwitchingRelationships.length > 0) {
      evidence.push({
        type: 'column_analysis',
        description: `Found context-switching patterns: ${contextSwitchingRelationships.length} relationships`,
        confidence: 0.75,
        weight: 0.6,
        supportingData: {
          patterns: ['context_switching_capability'],
          samples: contextSwitchingRelationships.map(rel => rel.columnName)
        },
        architectureIndicators: {
          individual: 0.3,
          team: 0.3,
          hybrid: 0.9
        }
      });
    }

    return evidence;
  }

  private filterAndRankEvidence(
    evidence: ArchitectureEvidence[], 
    config: EvidenceCollectionConfig
  ): ArchitectureEvidence[] {
    return evidence
      .filter(e => e.confidence >= config.minEvidenceConfidence)
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, config.maxEvidencePerType);
  }
}

/**
 * Main evidence collection orchestrator
 */
export class ArchitectureEvidenceCollector {
  private individualCollector: IndividualEvidenceCollector;
  private teamCollector: TeamEvidenceCollector;
  private hybridCollector: HybridEvidenceCollector;

  constructor() {
    this.individualCollector = new IndividualEvidenceCollector();
    this.teamCollector = new TeamEvidenceCollector();
    this.hybridCollector = new HybridEvidenceCollector();
  }

  /**
   * Collect comprehensive evidence for all architecture types
   */
  async collectAllEvidence(
    context: DetectionAnalysisContext,
    config: Partial<EvidenceCollectionConfig> = {}
  ): Promise<EvidenceAnalysisResult> {
    const fullConfig: EvidenceCollectionConfig = {
      detailedTableAnalysis: true,
      analyzeColumnPatterns: true,
      analyzeRelationships: true,
      analyzeBusinessLogic: false,
      maxEvidencePerType: 10,
      minEvidenceConfidence: 0.3,
      ...config
    };

    // Collect evidence from all collectors
    const [individualEvidence, teamEvidence, hybridEvidence] = await Promise.all([
      this.individualCollector.collectIndividualEvidence(context, fullConfig),
      this.teamCollector.collectTeamEvidence(context, fullConfig),
      this.hybridCollector.collectHybridEvidence(context, fullConfig)
    ]);

    // Combine all evidence
    const allEvidence = [
      ...individualEvidence,
      ...teamEvidence,
      ...hybridEvidence
    ];

    // Calculate architecture scores based on evidence
    const architectureScores = this.calculateArchitectureScores(allEvidence);

    // Extract platform features from evidence
    const platformFeatures = this.extractPlatformFeatures(allEvidence, context);

    // Generate reasoning
    const reasoning = this.generateReasoning(allEvidence, architectureScores);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(allEvidence, architectureScores);

    // Generate warnings
    const warnings = this.generateWarnings(allEvidence, architectureScores);

    return {
      evidence: allEvidence,
      architectureScores,
      platformFeatures,
      reasoning,
      overallConfidence,
      warnings
    };
  }

  /**
   * Calculate architecture confidence scores based on collected evidence
   */
  private calculateArchitectureScores(evidence: ArchitectureEvidence[]): {
    individual: number;
    team: number;
    hybrid: number;
  } {
    const scores = { individual: 0, team: 0, hybrid: 0 };
    let totalWeight = 0;

    for (const e of evidence) {
      const evidenceWeight = e.confidence * e.weight;
      scores.individual += e.architectureIndicators.individual * evidenceWeight;
      scores.team += e.architectureIndicators.team * evidenceWeight;
      scores.hybrid += e.architectureIndicators.hybrid * evidenceWeight;
      totalWeight += evidenceWeight;
    }

    if (totalWeight > 0) {
      scores.individual /= totalWeight;
      scores.team /= totalWeight;
      scores.hybrid /= totalWeight;
    }

    // Normalize scores to ensure they don't exceed 1.0
    const maxScore = Math.max(scores.individual, scores.team, scores.hybrid);
    if (maxScore > 1.0) {
      scores.individual /= maxScore;
      scores.team /= maxScore;
      scores.hybrid /= maxScore;
    }

    return scores;
  }

  /**
   * Extract platform features from evidence
   */
  private extractPlatformFeatures(
    evidence: ArchitectureEvidence[],
    context: DetectionAnalysisContext
  ): PlatformFeature[] {
    const features: PlatformFeature[] = [];
    const { schema } = context;

    // Authentication features
    const hasAuthTables = schema.tableNames.some(name => 
      /^(auth|users?|accounts?)/.test(name.toLowerCase())
    );
    if (hasAuthTables) {
      features.push({
        id: 'authentication',
        name: 'User Authentication',
        category: 'authentication',
        present: true,
        confidence: 0.95,
        evidence: ['Found authentication related tables'],
        implementingTables: schema.tableNames.filter(name => 
          /^(auth|users?|accounts?)/.test(name.toLowerCase())
        ),
        typicallyIndicates: ['individual', 'team', 'hybrid'],
        commonInDomains: ['outdoor', 'saas', 'ecommerce', 'social', 'generic']
      });
    }

    // User management features
    const hasUserManagement = evidence.some(e => 
      e.supportingData.tables?.some(table => 
        /^(user_profiles?|profiles?)$/i.test(table)
      )
    );
    if (hasUserManagement) {
      features.push({
        id: 'user_management',
        name: 'User Profile Management',
        category: 'user_management',
        present: true,
        confidence: 0.8,
        evidence: ['Found user profile management tables'],
        implementingTables: schema.tableNames.filter(name => 
          /^(user_profiles?|profiles?)$/i.test(name)
        ),
        typicallyIndicates: ['individual', 'hybrid'],
        commonInDomains: ['outdoor', 'saas', 'social', 'generic']
      });
    }

    // Team collaboration features
    const hasTeamFeatures = evidence.some(e => 
      e.supportingData.tables?.some(table => 
        /^(teams?|organizations?|members?)$/i.test(table)
      )
    );
    if (hasTeamFeatures) {
      features.push({
        id: 'team_collaboration',
        name: 'Team Collaboration',
        category: 'collaboration',
        present: true,
        confidence: 0.9,
        evidence: ['Found team collaboration structures'],
        implementingTables: schema.tableNames.filter(name => 
          /^(teams?|organizations?|members?)$/i.test(name)
        ),
        typicallyIndicates: ['team', 'hybrid'],
        commonInDomains: ['saas', 'generic']
      });
    }

    return features;
  }

  /**
   * Generate human-readable reasoning for architecture determination
   */
  private generateReasoning(
    evidence: ArchitectureEvidence[],
    scores: { individual: number; team: number; hybrid: number }
  ): string[] {
    const reasoning: string[] = [];

    // Sort evidence by strength (confidence * weight)
    const sortedEvidence = evidence
      .sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight))
      .slice(0, 5); // Top 5 pieces of evidence

    reasoning.push(`Architecture analysis based on ${evidence.length} pieces of evidence:`);

    // Add top evidence explanations
    for (const e of sortedEvidence) {
      const strength = e.confidence * e.weight;
      const dominantArch = Object.entries(e.architectureIndicators)
        .sort(([,a], [,b]) => b - a)[0][0];
      
      reasoning.push(
        `• ${e.description} (${dominantArch} indicator, strength: ${strength.toFixed(2)})`
      );
    }

    // Add score summary
    reasoning.push(
      `Final scores: Individual: ${scores.individual.toFixed(2)}, ` +
      `Team: ${scores.team.toFixed(2)}, Hybrid: ${scores.hybrid.toFixed(2)}`
    );

    return reasoning;
  }

  /**
   * Calculate overall confidence in the analysis
   */
  private calculateOverallConfidence(
    evidence: ArchitectureEvidence[],
    scores: { individual: number; team: number; hybrid: number }
  ): number {
    if (evidence.length === 0) return 0;

    // Base confidence on amount and quality of evidence
    const averageConfidence = evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length;
    const evidenceAmount = Math.min(evidence.length / 10, 1); // Scale based on evidence count
    
    // Factor in score separation (higher confidence when scores are clearly separated)
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    const scoreSeparation = sortedScores[0] - sortedScores[1];
    
    return (averageConfidence * 0.4) + (evidenceAmount * 0.3) + (scoreSeparation * 0.3);
  }

  /**
   * Generate warnings about evidence quality or conflicts
   */
  private generateWarnings(
    evidence: ArchitectureEvidence[],
    scores: { individual: number; team: number; hybrid: number }
  ): string[] {
    const warnings: string[] = [];

    // Check for low evidence count
    if (evidence.length < 3) {
      warnings.push('Limited evidence available - consider manual verification');
    }

    // Check for conflicting evidence
    const strongEvidence = evidence.filter(e => (e.confidence * e.weight) > 0.5);
    const conflictingEvidence = strongEvidence.filter(e => {
      const indicators = Object.values(e.architectureIndicators);
      const max = Math.max(...indicators);
      const conflicts = indicators.filter(v => v > 0.4 && v !== max);
      return conflicts.length > 0;
    });

    if (conflictingEvidence.length > 0) {
      warnings.push('Some evidence points to multiple architecture types - hybrid platform likely');
    }

    // Check for close scores
    const sortedScores = Object.values(scores).sort((a, b) => b - a);
    if (sortedScores[0] - sortedScores[1] < 0.2) {
      warnings.push('Architecture scores are close - consider additional analysis');
    }

    // Check for low overall confidence
    const overallConfidence = this.calculateOverallConfidence(evidence, scores);
    if (overallConfidence < 0.6) {
      warnings.push('Low confidence in architecture detection - manual review recommended');
    }

    return warnings;
  }
}

/**
 * Default evidence collection configuration
 */
export const DEFAULT_EVIDENCE_CONFIG: EvidenceCollectionConfig = {
  detailedTableAnalysis: true,
  analyzeColumnPatterns: true,
  analyzeRelationships: true,
  analyzeBusinessLogic: false,
  maxEvidencePerType: 10,
  minEvidenceConfidence: 0.3
};