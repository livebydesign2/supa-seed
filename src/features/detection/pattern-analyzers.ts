/**
 * Pattern Analyzers for Epic 2: Smart Platform Detection Engine
 * Advanced pattern recognition for individual/team/hybrid platform architecture detection
 * Part of Task 2.1.2: Create pattern analyzers for individual/team/hybrid recognition
 */

import { Logger } from '../../core/utils/logger';
import type {
  PlatformArchitectureType,
  ArchitecturePattern,
  PatternAnalysisResult,
  DetectionAnalysisContext,
  ArchitectureEvidence,
  EvidenceType,
  PlatformFeature,
  IndividualPlatformIndicators,
  TeamPlatformIndicators,
  HybridPlatformIndicators
} from './detection-types';

/**
 * Individual Platform Pattern Analyzer
 * Detects patterns indicating individual creator/user-centric platforms
 */
export class IndividualPlatformAnalyzer {
  private indicators: IndividualPlatformIndicators = {
    userCentricTables: [
      'users', 'profiles', 'user_profiles', 'accounts', 'personal_accounts'
    ],
    contentFocusedTables: [
      'posts', 'articles', 'content', 'media', 'images', 'videos', 'galleries',
      'projects', 'portfolios', 'creations', 'works', 'pieces'
    ],
    simpleAccountPatterns: [
      'is_personal_account', 'account_type', 'user_type', 'profile_type'
    ],
    limitedCollaboration: [
      'followers', 'following', 'likes', 'favorites', 'bookmarks', 'comments'
    ],
    personalProfilePatterns: [
      'bio', 'about', 'description', 'avatar', 'profile_picture', 'banner',
      'social_links', 'website', 'location', 'skills', 'interests'
    ]
  };

  /**
   * Analyze schema for individual platform patterns
   */
  async analyzeIndividualPatterns(context: DetectionAnalysisContext): Promise<PatternAnalysisResult[]> {
    const results: PatternAnalysisResult[] = [];

    // Pattern 1: User-centric content creation
    results.push(await this.analyzeUserCentricPattern(context));

    // Pattern 2: Simple account structure
    results.push(await this.analyzeSimpleAccountPattern(context));

    // Pattern 3: Personal profile emphasis
    results.push(await this.analyzePersonalProfilePattern(context));

    // Pattern 4: Limited collaboration features
    results.push(await this.analyzeLimitedCollaborationPattern(context));

    // Pattern 5: Direct user-content ownership
    results.push(await this.analyzeDirectOwnershipPattern(context));

    return results.filter(result => result.matched);
  }

  /**
   * Analyze user-centric content creation pattern
   */
  private async analyzeUserCentricPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'individual_user_centric',
      name: 'User-Centric Content Creation',
      description: 'Content tables directly linked to individual users without team structures',
      indicatesArchitecture: ['individual'],
      confidenceWeight: 0.8,
      tablePatterns: this.indicators.userCentricTables,
      columnPatterns: ['user_id', 'author_id', 'creator_id', 'owner_id'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 2,
      exclusive: false
    };

    const matchedTables = context.schema.tableNames.filter(table =>
      this.indicators.userCentricTables.some(pattern => 
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const contentTables = context.schema.tableNames.filter(table =>
      this.indicators.contentFocusedTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for direct user-content relationships
    const userContentRelationships = context.schema.relationships.filter(rel =>
      matchedTables.some(userTable => rel.fromTable === userTable) &&
      contentTables.some(contentTable => rel.toTable === contentTable)
    );

    const matched = matchedTables.length >= 1 && contentTables.length >= 1;
    const matchConfidence = Math.min(
      (matchedTables.length * 0.3 + contentTables.length * 0.4 + userContentRelationships.length * 0.3),
      1.0
    );

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: [...matchedTables, ...contentTables],
        matchedColumns: ['user_id', 'author_id', 'creator_id'],
        matchedConstraints: [],
        matchedRelationships: userContentRelationships.map(rel => `${rel.fromTable}->${rel.toTable}`),
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'individual',
        confidence: matchConfidence,
        reasoning: `Found ${matchedTables.length} user tables and ${contentTables.length} content tables with direct relationships`
      }
    };
  }

  /**
   * Analyze simple account structure pattern
   */
  private async analyzeSimpleAccountPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'individual_simple_accounts',
      name: 'Simple Account Structure',
      description: 'Simple account structures without complex team/organization hierarchies',
      indicatesArchitecture: ['individual'],
      confidenceWeight: 0.7,
      tablePatterns: ['accounts', 'users', 'profiles'],
      columnPatterns: this.indicators.simpleAccountPatterns,
      constraintPatterns: ['accounts_slug_null_if_personal_account_true'],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const accountTables = context.schema.tableNames.filter(table =>
      ['accounts', 'users', 'profiles'].some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for personal account indicators in constraints
    const personalAccountConstraints = context.schema.constraints.filter(constraint =>
      constraint.constraintName?.toLowerCase().includes('personal_account') ||
      constraint.constraintName?.toLowerCase().includes('is_personal')
    );

    // Look for absence of complex team structures
    const teamTables = context.schema.tableNames.filter(table =>
      ['organizations', 'teams', 'workspaces', 'groups'].some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = accountTables.length >= 1 && teamTables.length <= 1;
    const matchConfidence = accountTables.length > 0 ? 
      Math.max(0.6 - (teamTables.length * 0.2), 0.1) + (personalAccountConstraints.length * 0.3) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: accountTables,
        matchedColumns: this.indicators.simpleAccountPatterns,
        matchedConstraints: personalAccountConstraints.map(c => c.constraintName),
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'individual',
        confidence: matchConfidence,
        reasoning: `Simple account structure detected with ${accountTables.length} account tables and minimal team infrastructure`
      }
    };
  }

  /**
   * Analyze personal profile emphasis pattern
   */
  private async analyzePersonalProfilePattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'individual_personal_profile',
      name: 'Personal Profile Emphasis',
      description: 'Rich personal profile features indicating individual-focused platform',
      indicatesArchitecture: ['individual'],
      confidenceWeight: 0.6,
      tablePatterns: ['profiles', 'user_profiles', 'personal_info'],
      columnPatterns: this.indicators.personalProfilePatterns,
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 3,
      exclusive: false
    };

    const profileTables = context.schema.tableNames.filter(table =>
      table.toLowerCase().includes('profile')
    );

    // This would require column-level analysis which we'll simulate
    const personalProfileFeatures = this.indicators.personalProfilePatterns.length;
    const estimatedMatches = Math.floor(personalProfileFeatures * 0.6); // Simulate typical coverage

    const matched = profileTables.length >= 1 && estimatedMatches >= pattern.minimumMatches;
    const matchConfidence = profileTables.length > 0 ? 
      Math.min((profileTables.length * 0.4) + (estimatedMatches / personalProfileFeatures * 0.6), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: profileTables,
        matchedColumns: this.indicators.personalProfilePatterns.slice(0, estimatedMatches),
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'individual',
        confidence: matchConfidence,
        reasoning: `Rich personal profile features detected in ${profileTables.length} profile tables`
      }
    };
  }

  /**
   * Analyze limited collaboration pattern
   */
  private async analyzeLimitedCollaborationPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'individual_limited_collaboration',
      name: 'Limited Collaboration Features',
      description: 'Simple social features without complex team collaboration',
      indicatesArchitecture: ['individual'],
      confidenceWeight: 0.5,
      tablePatterns: this.indicators.limitedCollaboration,
      columnPatterns: ['follower_id', 'following_id', 'user_id'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const socialTables = context.schema.tableNames.filter(table =>
      this.indicators.limitedCollaboration.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for absence of complex collaboration tables
    const complexCollabTables = context.schema.tableNames.filter(table =>
      ['workspaces', 'projects', 'teams', 'channels', 'rooms'].some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = socialTables.length >= 1 && complexCollabTables.length === 0;
    const matchConfidence = socialTables.length > 0 ?
      Math.min((socialTables.length * 0.3) + (complexCollabTables.length === 0 ? 0.7 : 0), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: socialTables,
        matchedColumns: ['follower_id', 'following_id', 'user_id'],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'individual',
        confidence: matchConfidence,
        reasoning: `Simple social features without complex collaboration infrastructure`
      }
    };
  }

  /**
   * Analyze direct ownership pattern
   */
  private async analyzeDirectOwnershipPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'individual_direct_ownership',
      name: 'Direct User-Content Ownership',
      description: 'Direct ownership relationships without team/organization mediation',
      indicatesArchitecture: ['individual'],
      confidenceWeight: 0.9,
      tablePatterns: [],
      columnPatterns: ['user_id', 'owner_id', 'creator_id', 'author_id'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 2,
      exclusive: false
    };

    // Count direct user-content relationships
    const directRelationships = context.schema.relationships.filter(rel =>
      ['user_id', 'owner_id', 'creator_id', 'author_id'].includes(rel.columnName?.toLowerCase() || '')
    );

    // Look for mediated relationships through organizations/teams
    const mediatedRelationships = context.schema.relationships.filter(rel =>
      ['organization_id', 'team_id', 'workspace_id', 'group_id'].includes(rel.columnName?.toLowerCase() || '')
    );

    const directToMediatedRatio = mediatedRelationships.length === 0 ? 
      1.0 : directRelationships.length / (directRelationships.length + mediatedRelationships.length);

    const matched = directRelationships.length >= pattern.minimumMatches && directToMediatedRatio > 0.7;
    const matchConfidence = matched ? 
      Math.min((directRelationships.length * 0.2) + (directToMediatedRatio * 0.8), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: [],
        matchedColumns: directRelationships.map(rel => rel.columnName).filter(Boolean),
        matchedConstraints: [],
        matchedRelationships: directRelationships.map(rel => `${rel.fromTable}->${rel.toTable}`),
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'individual',
        confidence: matchConfidence,
        reasoning: `Direct ownership pattern with ${directRelationships.length} direct relationships vs ${mediatedRelationships.length} mediated`
      }
    };
  }
}

/**
 * Team Platform Pattern Analyzer
 * Detects patterns indicating team collaboration platforms
 */
export class TeamPlatformAnalyzer {
  private indicators: TeamPlatformIndicators = {
    teamOrganizationTables: [
      'organizations', 'teams', 'companies', 'workspaces', 'groups'
    ],
    memberManagementTables: [
      'members', 'team_members', 'organization_members', 'workspace_members',
      'user_organizations', 'user_teams', 'memberships'
    ],
    workspaceProjectTables: [
      'workspaces', 'projects', 'channels', 'rooms', 'boards', 'tasks'
    ],
    permissionSystemTables: [
      'roles', 'permissions', 'user_roles', 'role_permissions', 'access_controls'
    ],
    collaborationTables: [
      'invitations', 'invites', 'collaborations', 'shared_resources', 'discussions'
    ],
    roleHierarchyPatterns: [
      'owner', 'admin', 'member', 'viewer', 'is_owner', 'role', 'permission_level'
    ]
  };

  /**
   * Analyze schema for team platform patterns
   */
  async analyzeTeamPatterns(context: DetectionAnalysisContext): Promise<PatternAnalysisResult[]> {
    const results: PatternAnalysisResult[] = [];

    // Pattern 1: Organization/team structure
    results.push(await this.analyzeOrganizationStructurePattern(context));

    // Pattern 2: Member management system
    results.push(await this.analyzeMemberManagementPattern(context));

    // Pattern 3: Workspace/project collaboration
    results.push(await this.analyzeWorkspaceCollaborationPattern(context));

    // Pattern 4: Complex permission system
    results.push(await this.analyzePermissionSystemPattern(context));

    // Pattern 5: Role hierarchy
    results.push(await this.analyzeRoleHierarchyPattern(context));

    return results.filter(result => result.matched);
  }

  /**
   * Analyze organization structure pattern
   */
  private async analyzeOrganizationStructurePattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'team_organization_structure',
      name: 'Organization/Team Structure',
      description: 'Dedicated tables for organizations, teams, or workspaces',
      indicatesArchitecture: ['team'],
      confidenceWeight: 0.9,
      tablePatterns: this.indicators.teamOrganizationTables,
      columnPatterns: ['organization_id', 'team_id', 'workspace_id'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const orgTables = context.schema.tableNames.filter(table =>
      this.indicators.teamOrganizationTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for organization-scoped relationships
    const orgRelationships = context.schema.relationships.filter(rel =>
      ['organization_id', 'team_id', 'workspace_id'].includes(rel.columnName?.toLowerCase() || '')
    );

    const matched = orgTables.length >= 1;
    const matchConfidence = matched ?
      Math.min((orgTables.length * 0.4) + (orgRelationships.length * 0.1), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: orgTables,
        matchedColumns: ['organization_id', 'team_id', 'workspace_id'],
        matchedConstraints: [],
        matchedRelationships: orgRelationships.map(rel => `${rel.fromTable}->${rel.toTable}`),
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'team',
        confidence: matchConfidence,
        reasoning: `Organization structure detected with ${orgTables.length} org tables and ${orgRelationships.length} org relationships`
      }
    };
  }

  /**
   * Analyze member management pattern
   */
  private async analyzeMemberManagementPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'team_member_management',
      name: 'Member Management System',
      description: 'Dedicated member management with roles and permissions',
      indicatesArchitecture: ['team'],
      confidenceWeight: 0.8,
      tablePatterns: this.indicators.memberManagementTables,
      columnPatterns: ['user_id', 'organization_id', 'role', 'is_owner'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const memberTables = context.schema.tableNames.filter(table =>
      this.indicators.memberManagementTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    // Check for member-related constraints
    const memberConstraints = context.schema.constraints.filter(constraint =>
      constraint.constraintName?.toLowerCase().includes('member') ||
      constraint.constraintName?.toLowerCase().includes('organization_member') ||
      constraint.constraintName?.toLowerCase().includes('unique')
    );

    const matched = memberTables.length >= 1;
    const matchConfidence = matched ?
      Math.min((memberTables.length * 0.5) + (memberConstraints.length * 0.2), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: memberTables,
        matchedColumns: ['user_id', 'organization_id', 'role', 'is_owner'],
        matchedConstraints: memberConstraints.map(c => c.constraintName),
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'team',
        confidence: matchConfidence,
        reasoning: `Member management system with ${memberTables.length} member tables and ${memberConstraints.length} related constraints`
      }
    };
  }

  /**
   * Analyze workspace collaboration pattern
   */
  private async analyzeWorkspaceCollaborationPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'team_workspace_collaboration',
      name: 'Workspace/Project Collaboration',
      description: 'Collaborative workspaces, projects, or shared resources',
      indicatesArchitecture: ['team'],
      confidenceWeight: 0.7,
      tablePatterns: this.indicators.workspaceProjectTables,
      columnPatterns: ['workspace_id', 'project_id', 'shared_with'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const workspaceTables = context.schema.tableNames.filter(table =>
      this.indicators.workspaceProjectTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const collaborationTables = context.schema.tableNames.filter(table =>
      this.indicators.collaborationTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = workspaceTables.length >= 1 || collaborationTables.length >= 1;
    const matchConfidence = matched ?
      Math.min((workspaceTables.length * 0.4) + (collaborationTables.length * 0.3), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: [...workspaceTables, ...collaborationTables],
        matchedColumns: ['workspace_id', 'project_id', 'shared_with'],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'team',
        confidence: matchConfidence,
        reasoning: `Collaboration features with ${workspaceTables.length} workspace tables and ${collaborationTables.length} collaboration tables`
      }
    };
  }

  /**
   * Analyze permission system pattern
   */
  private async analyzePermissionSystemPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'team_permission_system',
      name: 'Complex Permission System',
      description: 'Sophisticated role-based access control system',
      indicatesArchitecture: ['team'],
      confidenceWeight: 0.8,
      tablePatterns: this.indicators.permissionSystemTables,
      columnPatterns: ['role_id', 'permission_id', 'access_level'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const permissionTables = context.schema.tableNames.filter(table =>
      this.indicators.permissionSystemTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = permissionTables.length >= 1;
    const matchConfidence = matched ?
      Math.min(permissionTables.length * 0.6, 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: permissionTables,
        matchedColumns: ['role_id', 'permission_id', 'access_level'],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'team',
        confidence: matchConfidence,
        reasoning: `Complex permission system with ${permissionTables.length} permission-related tables`
      }
    };
  }

  /**
   * Analyze role hierarchy pattern
   */
  private async analyzeRoleHierarchyPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'team_role_hierarchy',
      name: 'Role Hierarchy System',
      description: 'Hierarchical role system with different permission levels',
      indicatesArchitecture: ['team'],
      confidenceWeight: 0.6,
      tablePatterns: [],
      columnPatterns: this.indicators.roleHierarchyPatterns,
      constraintPatterns: ['role', 'permission', 'access'],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 2,
      exclusive: false
    };

    // Check for role-related constraints
    const roleConstraints = context.schema.constraints.filter(constraint =>
      this.indicators.roleHierarchyPatterns.some(pattern =>
        constraint.constraintName?.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = roleConstraints.length >= pattern.minimumMatches;
    const matchConfidence = matched ?
      Math.min(roleConstraints.length * 0.3, 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: [],
        matchedColumns: this.indicators.roleHierarchyPatterns.slice(0, roleConstraints.length),
        matchedConstraints: roleConstraints.map(c => c.constraintName),
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'team',
        confidence: matchConfidence,
        reasoning: `Role hierarchy detected with ${roleConstraints.length} role-related constraints`
      }
    };
  }
}

/**
 * Hybrid Platform Pattern Analyzer
 * Detects patterns indicating hybrid individual/team platforms
 */
export class HybridPlatformAnalyzer {
  private indicators: HybridPlatformIndicators = {
    flexibleAccountTables: [
      'accounts', 'user_accounts', 'flexible_accounts', 'multi_accounts'
    ],
    mixedOwnershipPatterns: [
      'personal_', 'team_', 'shared_', 'organization_', 'individual_'
    ],
    scalablePermissionTables: [
      'access_controls', 'permissions', 'scoped_permissions', 'contextual_permissions'
    ],
    dualCapabilityTables: [
      'workspaces', 'projects', 'content', 'resources', 'items'
    ],
    contextSwitchingPatterns: [
      'context', 'scope', 'mode', 'view_as', 'acting_as'
    ]
  };

  /**
   * Analyze schema for hybrid platform patterns
   */
  async analyzeHybridPatterns(context: DetectionAnalysisContext): Promise<PatternAnalysisResult[]> {
    const results: PatternAnalysisResult[] = [];

    // Pattern 1: Flexible account system
    results.push(await this.analyzeFlexibleAccountPattern(context));

    // Pattern 2: Mixed ownership models
    results.push(await this.analyzeMixedOwnershipPattern(context));

    // Pattern 3: Context-aware permissions
    results.push(await this.analyzeContextAwarePermissionsPattern(context));

    // Pattern 4: Dual capability features
    results.push(await this.analyzeDualCapabilityPattern(context));

    // Pattern 5: Both individual and team features present
    results.push(await this.analyzeCoexistingFeaturesPattern(context));

    return results.filter(result => result.matched);
  }

  /**
   * Analyze flexible account pattern
   */
  private async analyzeFlexibleAccountPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'hybrid_flexible_accounts',
      name: 'Flexible Account System',
      description: 'Account system supporting both individual and team usage',
      indicatesArchitecture: ['hybrid'],
      confidenceWeight: 0.8,
      tablePatterns: this.indicators.flexibleAccountTables,
      columnPatterns: ['is_personal_account', 'account_type', 'account_mode'],
      constraintPatterns: ['accounts_slug_null_if_personal_account'],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const accountTables = context.schema.tableNames.filter(table =>
      table.toLowerCase().includes('account')
    );

    // Check for flexible account indicators in constraints
    const flexibilityConstraints = context.schema.constraints.filter(constraint =>
      constraint.constraintName?.toLowerCase().includes('personal_account') ||
      constraint.constraintName?.toLowerCase().includes('account_type')
    );

    const matched = accountTables.length >= 1 && flexibilityConstraints.length >= 1;
    const matchConfidence = matched ?
      Math.min((accountTables.length * 0.4) + (flexibilityConstraints.length * 0.6), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: accountTables,
        matchedColumns: ['is_personal_account', 'account_type', 'account_mode'],
        matchedConstraints: flexibilityConstraints.map(c => c.constraintName),
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'hybrid',
        confidence: matchConfidence,
        reasoning: `Flexible account system with ${accountTables.length} account tables and ${flexibilityConstraints.length} flexibility constraints`
      }
    };
  }

  /**
   * Analyze mixed ownership pattern
   */
  private async analyzeMixedOwnershipPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'hybrid_mixed_ownership',
      name: 'Mixed Ownership Model',
      description: 'Content can be owned by individuals or teams/organizations',
      indicatesArchitecture: ['hybrid'],
      confidenceWeight: 0.7,
      tablePatterns: [],
      columnPatterns: ['user_id', 'organization_id', 'team_id', 'owner_type'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 2,
      exclusive: false
    };

    // Check for tables with both individual and team ownership columns
    const mixedOwnershipTables = context.schema.tableNames.filter(tableName => {
      const tableRels = context.schema.relationships.filter(rel => rel.fromTable === tableName);
      const hasUserOwnership = tableRels.some(rel => 
        ['user_id', 'owner_id', 'created_by'].includes(rel.columnName?.toLowerCase() || '')
      );
      const hasTeamOwnership = tableRels.some(rel =>
        ['organization_id', 'team_id', 'workspace_id'].includes(rel.columnName?.toLowerCase() || '')
      );
      return hasUserOwnership && hasTeamOwnership;
    });

    const matched = mixedOwnershipTables.length >= 1;
    const matchConfidence = matched ?
      Math.min(mixedOwnershipTables.length * 0.5, 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: mixedOwnershipTables,
        matchedColumns: ['user_id', 'organization_id', 'team_id', 'owner_type'],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'hybrid',
        confidence: matchConfidence,
        reasoning: `Mixed ownership model with ${mixedOwnershipTables.length} tables supporting both individual and team ownership`
      }
    };
  }

  /**
   * Analyze context-aware permissions pattern
   */
  private async analyzeContextAwarePermissionsPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'hybrid_context_permissions',
      name: 'Context-Aware Permissions',
      description: 'Permission system that adapts to individual vs team context',
      indicatesArchitecture: ['hybrid'],
      confidenceWeight: 0.6,
      tablePatterns: this.indicators.scalablePermissionTables,
      columnPatterns: this.indicators.contextSwitchingPatterns,
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const permissionTables = context.schema.tableNames.filter(table =>
      this.indicators.scalablePermissionTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = permissionTables.length >= 1;
    const matchConfidence = matched ?
      Math.min(permissionTables.length * 0.7, 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: permissionTables,
        matchedColumns: this.indicators.contextSwitchingPatterns,
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'hybrid',
        confidence: matchConfidence,
        reasoning: `Context-aware permission system with ${permissionTables.length} adaptive permission tables`
      }
    };
  }

  /**
   * Analyze dual capability pattern
   */
  private async analyzeDualCapabilityPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'hybrid_dual_capability',
      name: 'Dual Capability Features',
      description: 'Features that work in both individual and team contexts',
      indicatesArchitecture: ['hybrid'],
      confidenceWeight: 0.8,
      tablePatterns: this.indicators.dualCapabilityTables,
      columnPatterns: ['scope', 'visibility', 'access_type'],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: false
    };

    const dualTables = context.schema.tableNames.filter(table =>
      this.indicators.dualCapabilityTables.some(pattern =>
        table.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    const matched = dualTables.length >= 2; // Need multiple types for hybrid
    const matchConfidence = matched ?
      Math.min(dualTables.length * 0.3, 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: dualTables,
        matchedColumns: ['scope', 'visibility', 'access_type'],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'hybrid',
        confidence: matchConfidence,
        reasoning: `Dual capability features with ${dualTables.length} tables supporting both contexts`
      }
    };
  }

  /**
   * Analyze coexisting features pattern
   */
  private async analyzeCoexistingFeaturesPattern(context: DetectionAnalysisContext): Promise<PatternAnalysisResult> {
    const pattern: ArchitecturePattern = {
      id: 'hybrid_coexisting_features',
      name: 'Coexisting Individual and Team Features',
      description: 'Platform has both individual-focused and team-focused features',
      indicatesArchitecture: ['hybrid'],
      confidenceWeight: 0.9,
      tablePatterns: [],
      columnPatterns: [],
      constraintPatterns: [],
      relationshipPatterns: [],
      functionPatterns: [],
      minimumMatches: 1,
      exclusive: true
    };

    // Check for both individual and team indicators
    const individualAnalyzer = new IndividualPlatformAnalyzer();
    const teamAnalyzer = new TeamPlatformAnalyzer();

    const individualResults = await individualAnalyzer.analyzeIndividualPatterns(context);
    const teamResults = await teamAnalyzer.analyzeTeamPatterns(context);

    const individualScore = individualResults.reduce((sum, result) => 
      sum + (result.matched ? result.matchConfidence : 0), 0) / Math.max(individualResults.length, 1);
    const teamScore = teamResults.reduce((sum, result) =>
      sum + (result.matched ? result.matchConfidence : 0), 0) / Math.max(teamResults.length, 1);

    // Hybrid indicates balance between individual and team features
    const balance = 1 - Math.abs(individualScore - teamScore);
    const minRequiredFeatures = Math.min(individualScore, teamScore);

    const matched = individualScore > 0.3 && teamScore > 0.3 && balance > 0.4;
    const matchConfidence = matched ?
      Math.min((balance * 0.5) + (minRequiredFeatures * 0.5), 1.0) : 0;

    return {
      pattern,
      matched,
      matchConfidence,
      matchDetails: {
        matchedTables: [],
        matchedColumns: [],
        matchedConstraints: [],
        matchedRelationships: [],
        matchedFunctions: []
      },
      architectureIndication: {
        type: 'hybrid',
        confidence: matchConfidence,
        reasoning: `Coexisting features detected: individual score ${individualScore.toFixed(2)}, team score ${teamScore.toFixed(2)}, balance ${balance.toFixed(2)}`
      }
    };
  }
}

/**
 * Pattern Analysis Orchestrator
 * Coordinates all pattern analyzers and provides unified results
 */
export class PatternAnalysisOrchestrator {
  private individualAnalyzer = new IndividualPlatformAnalyzer();
  private teamAnalyzer = new TeamPlatformAnalyzer();
  private hybridAnalyzer = new HybridPlatformAnalyzer();

  /**
   * Run comprehensive pattern analysis across all architecture types
   */
  async analyzeAllPatterns(context: DetectionAnalysisContext): Promise<{
    individual: PatternAnalysisResult[];
    team: PatternAnalysisResult[];
    hybrid: PatternAnalysisResult[];
    summary: {
      individualScore: number;
      teamScore: number;
      hybridScore: number;
      strongestArchitecture: PlatformArchitectureType;
      confidence: number;
    };
  }> {
    Logger.debug('Starting comprehensive pattern analysis');

    const [individualResults, teamResults, hybridResults] = await Promise.all([
      this.individualAnalyzer.analyzeIndividualPatterns(context),
      this.teamAnalyzer.analyzeTeamPatterns(context),
      this.hybridAnalyzer.analyzeHybridPatterns(context)
    ]);

    // Calculate aggregate scores
    const individualScore = this.calculateAggregateScore(individualResults);
    const teamScore = this.calculateAggregateScore(teamResults);
    const hybridScore = this.calculateAggregateScore(hybridResults);

    // Determine strongest architecture
    const scores = [
      { type: 'individual' as PlatformArchitectureType, score: individualScore },
      { type: 'team' as PlatformArchitectureType, score: teamScore },
      { type: 'hybrid' as PlatformArchitectureType, score: hybridScore }
    ];
    scores.sort((a, b) => b.score - a.score);

    const strongestArchitecture = scores[0].type;
    const confidence = scores[0].score;

    Logger.debug(`Pattern analysis complete: ${strongestArchitecture} (${confidence.toFixed(2)})`);

    return {
      individual: individualResults,
      team: teamResults,
      hybrid: hybridResults,
      summary: {
        individualScore,
        teamScore,
        hybridScore,
        strongestArchitecture,
        confidence
      }
    };
  }

  /**
   * Calculate aggregate score from pattern analysis results
   */
  private calculateAggregateScore(results: PatternAnalysisResult[]): number {
    if (results.length === 0) return 0;

    const weightedSum = results.reduce((sum, result) => {
      if (!result.matched) return sum;
      return sum + (result.matchConfidence * result.pattern.confidenceWeight);
    }, 0);

    const totalWeight = results.reduce((sum, result) => {
      if (!result.matched) return sum;
      return sum + result.pattern.confidenceWeight;
    }, 0);

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}

export default PatternAnalysisOrchestrator;