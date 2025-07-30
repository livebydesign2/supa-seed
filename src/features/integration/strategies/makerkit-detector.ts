/**
 * MakerKit Framework Detector
 * Specialized detection logic for MakerKit framework patterns
 */

import type { createClient } from '@supabase/supabase-js';
import { DatabaseSchema, FunctionInfo, ConstraintInfo } from '../strategy-interface';
import { Logger } from '../../../core/utils/logger';

type SupabaseClient = ReturnType<typeof createClient>;

export interface MakerKitDetectionResult {
  isMakerKit: boolean;
  version?: 'v2' | 'v3' | 'custom';
  confidence: number;
  detectedFeatures: MakerKitFeature[];
  missingFeatures: string[];
  recommendations: string[];
}

export interface MakerKitFeature {
  name: string;
  type: 'function' | 'table' | 'constraint' | 'trigger' | 'column';
  confidence: number;
  description: string;
}

export class MakerKitDetector {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Comprehensive MakerKit detection
   */
  async detectMakerKit(schema: DatabaseSchema): Promise<MakerKitDetectionResult> {
    const detectedFeatures: MakerKitFeature[] = [];
    const missingFeatures: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check for MakerKit-specific functions
      const functionFeatures = this.detectMakerKitFunctions(schema.functions);
      detectedFeatures.push(...functionFeatures);

      // Check for MakerKit table patterns
      const tableFeatures = this.detectMakerKitTables(schema);
      detectedFeatures.push(...tableFeatures);

      // Check for MakerKit constraints
      const constraintFeatures = this.detectMakerKitConstraints(schema.constraints);
      detectedFeatures.push(...constraintFeatures);

      // Check for MakerKit triggers
      const triggerFeatures = this.detectMakerKitTriggers(schema);
      detectedFeatures.push(...triggerFeatures);

      // Calculate overall confidence
      const confidence = this.calculateConfidence(detectedFeatures);
      
      // Determine version
      const version = this.determineVersion(detectedFeatures);

      // Generate recommendations
      const generatedRecommendations = this.generateRecommendations(
        detectedFeatures, 
        confidence, 
        version
      );
      recommendations.push(...generatedRecommendations);

      // Identify missing features
      const expectedFeatures = this.getExpectedMakerKitFeatures(version);
      const foundFeatureNames = detectedFeatures.map(f => f.name);
      missingFeatures.push(
        ...expectedFeatures.filter(expected => !foundFeatureNames.includes(expected))
      );

      return {
        isMakerKit: confidence > 0.3,
        version,
        confidence,
        detectedFeatures,
        missingFeatures,
        recommendations
      };

    } catch (error: any) {
      Logger.error(`MakerKit detection failed: ${error.message}`);
      return {
        isMakerKit: false,
        confidence: 0,
        detectedFeatures: [],
        missingFeatures: [],
        recommendations: [`Detection failed: ${error.message}`]
      };
    }
  }

  /**
   * Detect MakerKit-specific database functions
   */
  private detectMakerKitFunctions(functions: FunctionInfo[]): MakerKitFeature[] {
    const features: MakerKitFeature[] = [];

    // Key MakerKit functions
    const makerKitFunctionPatterns = [
      {
        pattern: /kit\.setup_new_user/i,
        name: 'setup_new_user_function',
        confidence: 0.4,
        description: 'MakerKit user setup function'
      },
      {
        pattern: /handle_new_user/i,
        name: 'handle_new_user_function',
        confidence: 0.3,
        description: 'User creation handler function'
      },
      {
        pattern: /create_profile_for_user/i,
        name: 'create_profile_function',
        confidence: 0.2,
        description: 'Profile creation function'
      },
      {
        pattern: /validate_personal_account/i,
        name: 'validate_personal_account_function',
        confidence: 0.2,
        description: 'Personal account validation function'
      }
    ];

    for (const func of functions) {
      const fullName = `${func.schema}.${func.name}`;
      
      for (const pattern of makerKitFunctionPatterns) {
        if (pattern.pattern.test(func.name) || pattern.pattern.test(fullName)) {
          features.push({
            name: pattern.name,
            type: 'function',
            confidence: pattern.confidence,
            description: `${pattern.description}: ${func.name}`
          });
          break;
        }
      }
    }

    return features;
  }

  /**
   * Detect MakerKit table patterns
   */
  private detectMakerKitTables(schema: DatabaseSchema): MakerKitFeature[] {
    const features: MakerKitFeature[] = [];

    // Check accounts table
    const accountsTable = schema.tables.find(t => t.name === 'accounts');
    if (accountsTable) {
      // Check for is_personal_account column
      const hasPersonalAccountColumn = accountsTable.columns.some(c => 
        c.name === 'is_personal_account'
      );
      
      if (hasPersonalAccountColumn) {
        features.push({
          name: 'personal_account_column',
          type: 'column',
          confidence: 0.3,
          description: 'accounts.is_personal_account column found'
        });
      }

      // Check for slug column
      const hasSlugColumn = accountsTable.columns.some(c => c.name === 'slug');
      if (hasSlugColumn) {
        features.push({
          name: 'account_slug_column',
          type: 'column',
          confidence: 0.1,
          description: 'accounts.slug column found'
        });
      }

      // Check for MakerKit v3 patterns
      const hasWorkspaceColumns = accountsTable.columns.some(c => 
        c.name.includes('workspace_') || c.name.includes('team_')
      );
      
      if (hasWorkspaceColumns) {
        features.push({
          name: 'workspace_columns',
          type: 'column',
          confidence: 0.2,
          description: 'MakerKit v3 workspace/team columns detected'
        });
      }
    }

    // Check for MakerKit-specific tables
    const makerKitTables = [
      'subscriptions',
      'organizations', 
      'organization_members',
      'invitations'
    ];

    for (const tableName of makerKitTables) {
      const table = schema.tables.find(t => t.name === tableName);
      if (table) {
        features.push({
          name: `${tableName}_table`,
          type: 'table',
          confidence: 0.15,
          description: `MakerKit ${tableName} table found`
        });
      }
    }

    return features;
  }

  /**
   * Detect MakerKit constraint patterns
   */
  private detectMakerKitConstraints(constraints: ConstraintInfo[]): MakerKitFeature[] {
    const features: MakerKitFeature[] = [];

    // Look for the signature MakerKit constraint
    const personalAccountConstraint = constraints.find(c => 
      c.name.includes('accounts_slug_null_if_personal_account') ||
      c.definition.toLowerCase().includes('is_personal_account') && 
      c.definition.toLowerCase().includes('slug')
    );

    if (personalAccountConstraint) {
      features.push({
        name: 'personal_account_constraint',
        type: 'constraint',
        confidence: 0.4,
        description: `Personal account constraint: ${personalAccountConstraint.name}`
      });
    }

    // Look for other MakerKit-specific constraints
    const makerKitConstraintPatterns = [
      /organization.*member/i,
      /subscription.*status/i,
      /invitation.*email/i
    ];

    for (const constraint of constraints) {
      for (const pattern of makerKitConstraintPatterns) {
        if (pattern.test(constraint.name) || pattern.test(constraint.definition)) {
          features.push({
            name: `${constraint.name}_constraint`,
            type: 'constraint',
            confidence: 0.1,
            description: `MakerKit constraint: ${constraint.name}`
          });
          break;
        }
      }
    }

    return features;
  }

  /**
   * Detect MakerKit trigger patterns
   */
  private detectMakerKitTriggers(schema: DatabaseSchema): MakerKitFeature[] {
    const features: MakerKitFeature[] = [];

    // Look for user creation triggers
    const userTriggers = schema.triggers.filter(t => 
      t.table === 'users' || 
      t.function.includes('handle_new_user') ||
      t.function.includes('setup_new_user')
    );

    if (userTriggers.length > 0) {
      features.push({
        name: 'user_creation_triggers',
        type: 'trigger',
        confidence: 0.3,
        description: `User creation triggers: ${userTriggers.map(t => t.name).join(', ')}`
      });
    }

    return features;
  }

  /**
   * Calculate confidence score based on detected features
   */
  private calculateConfidence(features: MakerKitFeature[]): number {
    const totalConfidence = features.reduce((sum, feature) => sum + feature.confidence, 0);
    
    // Cap confidence at 1.0 and apply diminishing returns
    return Math.min(1.0, totalConfidence * 0.8);
  }

  /**
   * Determine MakerKit version based on detected features
   */
  private determineVersion(features: MakerKitFeature[]): 'v2' | 'v3' | 'custom' | undefined {
    const featureNames = features.map(f => f.name);

    // Check for v3 patterns
    if (featureNames.includes('workspace_columns') || 
        featureNames.some(name => name.includes('organization'))) {
      return 'v3';
    }

    // Check for v2 patterns
    if (featureNames.includes('personal_account_constraint') ||
        featureNames.includes('setup_new_user_function')) {
      return 'v2';
    }

    // If we have some MakerKit features but can't determine version
    if (features.length > 0) {
      return 'custom';
    }

    return undefined;
  }

  /**
   * Generate recommendations based on detection results
   */
  private generateRecommendations(
    features: MakerKitFeature[], 
    confidence: number,
    version?: string
  ): string[] {
    const recommendations: string[] = [];

    if (confidence > 0.7) {
      recommendations.push('High confidence MakerKit detection - use MakerKit strategy');
      recommendations.push('Enable auth-trigger based user creation');
      recommendations.push('Use constraint auto-fixing for personal account handling');
    } else if (confidence > 0.4) {
      recommendations.push('Moderate MakerKit detection - verify schema manually');
      recommendations.push('Consider enabling MakerKit-specific features');
    } else if (confidence > 0.1) {
      recommendations.push('Partial MakerKit patterns detected');
      recommendations.push('Manual framework override may be needed');
    }

    if (version === 'v3') {
      recommendations.push('MakerKit v3 detected - use latest API patterns');
      recommendations.push('Enable workspace/organization features');
    } else if (version === 'v2') {
      recommendations.push('MakerKit v2 detected - use classic patterns');
    }

    // Feature-specific recommendations
    const featureNames = features.map(f => f.name);
    
    if (featureNames.includes('personal_account_constraint')) {
      recommendations.push('Personal account constraint found - enable auto-fix');
    }

    if (featureNames.includes('setup_new_user_function')) {
      recommendations.push('User setup function found - use trigger-based creation');
    }

    return recommendations;
  }

  /**
   * Get expected features for a MakerKit version
   */
  private getExpectedMakerKitFeatures(version?: string): string[] {
    const baseFeatures = [
      'personal_account_column',
      'account_slug_column',
      'personal_account_constraint'
    ];

    if (version === 'v2') {
      return [
        ...baseFeatures,
        'setup_new_user_function',
        'handle_new_user_function'
      ];
    }

    if (version === 'v3') {
      return [
        ...baseFeatures,
        'workspace_columns',
        'organizations_table',
        'organization_members_table'
      ];
    }

    return baseFeatures;
  }
}