/**
 * CLI Commands for Framework Strategy System
 */

import type { createClient } from '@supabase/supabase-js';
import { FrameworkAdapter } from '../../features/integration/framework-adapter';
import { createEnhancedSupabaseClient } from '../../core/utils/enhanced-supabase-client';
import { Logger } from '../../core/utils/logger';

export interface FrameworkCommandOptions {
  url?: string;
  key?: string;
  verbose?: boolean;
  framework?: string;
}

export class FrameworkCommands {
  
  /**
   * Detect framework and show strategy information
   */
  static async detectFramework(options: FrameworkCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('🔍 Detecting framework and analyzing strategies...\n');

      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false,
        frameworkOverride: options.framework
      });

      await adapter.initialize();

      // Get strategy information
      const currentStrategy = adapter.getCurrentStrategy();
      const selection = adapter.getStrategySelection();
      const recommendations = adapter.getRecommendations();

      // Display results
      console.log('📋 Framework Detection Results:');
      console.log(`   Framework: ${selection?.detection.framework || 'unknown'}`);
      console.log(`   Version: ${selection?.detection.version || 'N/A'}`);
      console.log(`   Confidence: ${((selection?.detection.confidence || 0) * 100).toFixed(1)}%`);
      console.log(`   Selected Strategy: ${currentStrategy?.name || 'none'}`);
      console.log(`   Selection Reason: ${selection?.reason || 'unknown'}`);

      if (selection?.detection.detectedFeatures && selection.detection.detectedFeatures.length > 0) {
        console.log('\n🔧 Detected Features:');
        selection.detection.detectedFeatures.forEach(feature => {
          console.log(`   • ${feature}`);
        });
      }

      if (recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }

      // Show all available strategies if verbose
      if (options.verbose) {
        console.log('\n📊 All Strategy Detection Results:');
        const allResults = await adapter.getAllDetectionResults();
        
        for (const result of allResults) {
          console.log(`\n   ${result.strategy}:`);
          console.log(`     Confidence: ${(result.detection.confidence * 100).toFixed(1)}%`);
          console.log(`     Features: ${result.detection.detectedFeatures.join(', ') || 'none'}`);
        }

        console.log('\n🛠️  Available Strategies:');
        const availableStrategies = adapter.getAvailableStrategies();
        availableStrategies.forEach(strategy => {
          console.log(`   • ${strategy}`);
        });
      }

      console.log('\n✅ Framework detection completed');

    } catch (error: any) {
      console.error('❌ Framework detection failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Test a specific strategy
   */
  static async testStrategy(strategyName: string, options: FrameworkCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log(`🧪 Testing strategy: ${strategyName}\n`);

      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false
      });

      await adapter.initialize();

      // Override to the requested strategy
      await adapter.overrideStrategy(strategyName);

      // Validate strategy
      const validation = await adapter.validateStrategy();

      console.log('📋 Strategy Test Results:');
      console.log(`   Strategy: ${strategyName}`);
      console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);

      if (validation.issues.length > 0) {
        console.log('\n⚠️  Issues:');
        validation.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
      }

      if (validation.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        validation.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }

      // Test basic user creation if validation passes
      if (validation.valid && options.verbose) {
        console.log('\n🔧 Testing user creation...');
        
        try {
          const result = await adapter.createUser({
            email: 'test@framework-test.com',
            name: 'Framework Test User',
            username: 'testuser'
          });

          if (result.success) {
            console.log('   ✅ User creation test passed');
            if (result.appliedFixes.length > 0) {
              console.log('   🔧 Applied fixes:');
              result.appliedFixes.forEach(fix => {
                console.log(`     • ${fix.reason}`);
              });
            }
          } else {
            console.log('   ❌ User creation test failed');
            result.errors.forEach(error => {
              console.log(`     • ${error}`);
            });
          }
        } catch (testError: any) {
          console.log(`   ⚠️  User creation test error: ${testError.message}`);
        }
      }

      console.log('\n✅ Strategy test completed');

    } catch (error: any) {
      console.error('❌ Strategy test failed:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }

  /**
   * List all available strategies
   */
  static async listStrategies(options: FrameworkCommandOptions): Promise<void> {
    const client = createEnhancedSupabaseClient(
      options.url || process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
      options.key || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    ) as any;

    try {
      console.log('📋 Available Framework Strategies:\n');

      const adapter = new FrameworkAdapter(client, undefined, {
        debug: options.verbose || false
      });

      await adapter.initialize();

      const strategies = adapter.getAvailableStrategies();
      const allResults = await adapter.getAllDetectionResults();

      for (const strategyName of strategies) {
        const result = allResults.find(r => r.strategy === strategyName);
        const confidence = result ? (result.detection.confidence * 100).toFixed(1) : '0.0';
        
        console.log(`   ${strategyName}:`);
        console.log(`     Confidence: ${confidence}%`);
        
        if (result && result.detection.detectedFeatures.length > 0) {
          console.log(`     Features: ${result.detection.detectedFeatures.join(', ')}`);
        }
        
        if (options.verbose && result) {
          console.log(`     Framework: ${result.detection.framework}`);
          if (result.detection.version) {
            console.log(`     Version: ${result.detection.version}`);
          }
        }
        
        console.log('');
      }

      console.log('✅ Strategy listing completed');

    } catch (error: any) {
      console.error('❌ Failed to list strategies:', error.message);
      
      if (options.verbose) {
        console.error('Debug details:', error);
      }
      
      process.exit(1);
    }
  }
}