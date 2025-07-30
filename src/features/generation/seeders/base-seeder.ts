import { SeedModule } from '../../../core/types/types';
import { Logger } from '../../../core/utils/logger';

export abstract class BaseSeeder extends SeedModule {
  /**
   * Check if a table exists in the database
   */
  protected async tableExists(tableName: string): Promise<boolean> {
    try {
      const { error } = await this.context.client
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        // PGRST116 = table doesn't exist
        if (error.code === 'PGRST116' || error.message?.includes('relation') && error.message?.includes('does not exist')) {
          return false;
        }
        // Other errors might mean the table exists but we lack permissions
        Logger.debug(`Table check for ${tableName} returned error: ${error.message}`);
      }
      
      return true;
    } catch (error) {
      Logger.debug(`Table existence check failed for ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Check if a field exists in a table
   */
  protected async fieldExists(tableName: string, fieldName: string): Promise<boolean> {
    try {
      const { data, error } = await this.context.client
        .from(tableName)
        .select(fieldName)
        .limit(1);
      
      if (error) {
        // Column doesn't exist error
        if (error.message?.includes('column') && error.message?.includes('does not exist')) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      Logger.debug(`Field existence check failed for ${tableName}.${fieldName}:`, error);
      return false;
    }
  }

  /**
   * Run a seeding operation with graceful error handling
   */
  protected async seedWithFallback<T>(
    operation: () => Promise<T>,
    tableName: string,
    skipMessage?: string
  ): Promise<T | null> {
    try {
      // First check if table exists
      const exists = await this.tableExists(tableName);
      if (!exists) {
        Logger.skip(`${tableName} table not found. ${skipMessage || 'Skipping...'}`);
        return null;
      }
      
      // Run the operation
      return await operation();
    } catch (error: any) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        Logger.skip(`${tableName} table not found. ${skipMessage || 'Skipping...'}`);
      } else {
        Logger.warn(`Error seeding ${tableName}: ${error.message}`);
        Logger.debug('Error details:', error);
      }
      return null;
    }
  }

  /**
   * Get field name with fallbacks
   */
  protected getFieldWithFallback(
    fieldMapping: Record<string, string>,
    primaryField: string,
    fallbacks: string[]
  ): string {
    if (fieldMapping[primaryField]) {
      return fieldMapping[primaryField];
    }
    
    for (const fallback of fallbacks) {
      if (fieldMapping[fallback]) {
        return fieldMapping[fallback];
      }
    }
    
    return primaryField;
  }
}