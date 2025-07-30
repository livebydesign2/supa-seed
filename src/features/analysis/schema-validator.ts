import type { createClient } from '@supabase/supabase-js';
import { Logger } from '../../core/utils/logger';
import { SchemaAdapter } from '../core/schema-adapter';

type SupabaseClient = ReturnType<typeof createClient>;

export interface SchemaValidationIssue {
  type: 'error' | 'warning';
  message: string;
  table?: string;
  field?: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaValidationIssue[];
  recommendations: string[];
}

export class SchemaValidator {
  constructor(
    private client: SupabaseClient,
    private schemaAdapter: SchemaAdapter
  ) {}

  /**
   * Validate schema compatibility before seeding
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    Logger.step('Validating schema compatibility...');
    
    const issues: SchemaValidationIssue[] = [];
    const recommendations: string[] = [];
    
    try {
      // Get schema information
      const schemaInfo = await this.schemaAdapter.detectSchema();
      
      // Check for user tables
      if (!schemaInfo.hasAccounts && !schemaInfo.hasProfiles) {
        issues.push({
          type: 'error',
          message: 'No user table found (accounts or profiles)',
          table: 'accounts/profiles'
        });
        recommendations.push('Run schema.sql or schema-wildernest.sql to create required tables');
      }
      
      // Check for setups table
      if (!schemaInfo.hasSetups) {
        issues.push({
          type: 'warning',
          message: 'Setups table not found',
          table: 'setups'
        });
        recommendations.push('Some seeders may be skipped without the setups table');
      }
      
      // Validate user table fields based on detected schema
      if (schemaInfo.hasProfiles) {
        await this.validateTableFields('profiles', [
          { field: 'id', required: true },
          { field: 'email', required: false },
          { field: 'display_name', required: false, alternatives: ['name', 'full_name'] }
        ], issues);
      }
      
      if (schemaInfo.hasAccounts) {
        await this.validateTableFields('accounts', [
          { field: 'id', required: true },
          { field: 'email', required: true },
          { field: 'name', required: false, alternatives: ['display_name', 'full_name'] }
        ], issues);
      }
      
      // Validate setups table fields if it exists
      if (schemaInfo.hasSetups) {
        await this.validateTableFields('setups', [
          { field: 'id', required: true },
          { field: 'user_id', required: false, alternatives: ['account_id', 'profile_id'] },
          { field: 'title', required: true },
          { field: 'description', required: false }
        ], issues);
      }
      
      // Check for auth configuration
      const authValid = await this.validateAuthConfiguration();
      if (!authValid) {
        issues.push({
          type: 'warning',
          message: 'Auth configuration may not be properly set up',
        });
        recommendations.push('Ensure service role key has permission to create auth users');
      }
      
      // Provide framework-specific recommendations
      const strategy = this.schemaAdapter.getUserCreationStrategy();
      Logger.info(`Using ${strategy} user creation strategy`);
      
      if (strategy === 'makerkit-profiles' && !schemaInfo.hasOrganizations && !schemaInfo.hasTeams) {
        recommendations.push('Consider adding organizations/teams tables for full MakerKit compatibility');
      }
      
    } catch (error: any) {
      issues.push({
        type: 'error',
        message: `Schema validation failed: ${error.message}`
      });
    }
    
    const valid = !issues.some(issue => issue.type === 'error');
    
    return {
      valid,
      issues,
      recommendations
    };
  }

  /**
   * Validate that required fields exist in a table
   */
  private async validateTableFields(
    tableName: string,
    fieldChecks: Array<{
      field: string;
      required: boolean;
      alternatives?: string[];
    }>,
    issues: SchemaValidationIssue[]
  ): Promise<void> {
    try {
      // Try to select all specified fields
      const fields = fieldChecks.map(check => check.field).join(', ');
      const { error } = await this.client
        .from(tableName)
        .select(fields)
        .limit(1);
      
      if (error) {
        // Parse error to determine which fields are missing
        const errorMessage = error.message.toLowerCase();
        
        for (const check of fieldChecks) {
          if (errorMessage.includes(`column "${check.field}"`) || 
              errorMessage.includes(`column ${check.field}`)) {
            
            if (check.required) {
              issues.push({
                type: 'error',
                message: `Required field missing: ${tableName}.${check.field}`,
                table: tableName,
                field: check.field
              });
            } else {
              // Check alternatives
              let foundAlternative = false;
              if (check.alternatives) {
                for (const alt of check.alternatives) {
                  const altExists = await this.fieldExists(tableName, alt);
                  if (altExists) {
                    foundAlternative = true;
                    Logger.debug(`Using alternative field ${alt} instead of ${check.field}`);
                    break;
                  }
                }
              }
              
              if (!foundAlternative) {
                issues.push({
                  type: 'warning',
                  message: `Optional field missing: ${tableName}.${check.field}`,
                  table: tableName,
                  field: check.field
                });
              }
            }
          }
        }
      }
    } catch (error: any) {
      Logger.debug(`Field validation error for ${tableName}:`, error);
    }
  }

  /**
   * Check if a field exists in a table
   */
  private async fieldExists(tableName: string, fieldName: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from(tableName)
        .select(fieldName)
        .limit(1);
      
      return !error || !error.message.toLowerCase().includes('column');
    } catch {
      return false;
    }
  }

  /**
   * Validate auth configuration
   */
  private async validateAuthConfiguration(): Promise<boolean> {
    try {
      // Try to list users (requires service role)
      const { error } = await this.client.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Print validation results
   */
  static printResults(result: SchemaValidationResult): void {
    if (result.valid) {
      Logger.success('Schema validation passed');
    } else {
      Logger.error('Schema validation failed');
    }
    
    // Print issues
    if (result.issues.length > 0) {
      console.log('\n📋 Validation Issues:');
      for (const issue of result.issues) {
        const icon = issue.type === 'error' ? '❌' : '⚠️';
        const location = issue.table ? ` (${issue.table}${issue.field ? `.${issue.field}` : ''})` : '';
        console.log(`   ${icon} ${issue.message}${location}`);
      }
    }
    
    // Print recommendations
    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      for (const rec of result.recommendations) {
        console.log(`   • ${rec}`);
      }
    }
  }
}