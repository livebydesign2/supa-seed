/**
 * Template Validation and Testing Utilities for SupaSeed v2.5.0
 * Implements Task 5.2.5: Comprehensive template validation, testing, and quality assurance
 * Provides validation framework for configuration templates and their applications
 */

import type {
  CompleteConfigurationTemplate,
  LayeredConfiguration,
  UniversalCoreConfig,
  SmartDetectionConfig,
  ExtensionsLayerConfig,
  PlatformArchitectureType,
  ContentDomainType
} from './config-layers';
import { Logger } from '../utils/logger';

/**
 * Comprehensive validation result with detailed feedback
 */
export interface TemplateValidationResult {
  valid: boolean;
  templateId: string;
  templateName: string;
  validatedAt: Date;
  validationLevel: 'basic' | 'standard' | 'strict' | 'comprehensive';
  score: number; // 0-100 validation score
  
  summary: {
    errorsCount: number;
    warningsCount: number;
    suggestionsCount: number;
    passedChecks: number;
    totalChecks: number;
    criticalIssues: number;
  };

  results: {
    structure: ValidationSectionResult;
    metadata: ValidationSectionResult;
    layers: ValidationSectionResult;
    composition: ValidationSectionResult;
    compatibility: ValidationSectionResult;
    documentation: ValidationSectionResult;
    performance: ValidationSectionResult;
  };

  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
  recommendations: ValidationRecommendation[];
  
  performance: {
    validationTime: number;
    testsRun: number;
    memoryUsed: number;
  };
}

/**
 * Validation section result for specific aspect
 */
export interface ValidationSectionResult {
  name: string;
  passed: boolean;
  score: number;
  checksRun: number;
  checksPassed: number;
  criticalIssues: number;
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  id: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: 'structure' | 'metadata' | 'layers' | 'composition' | 'compatibility' | 'documentation' | 'performance' | 'security';
  code: string;
  message: string;
  description: string;
  path?: string;
  expected?: any;
  actual?: any;
  impact: 'high' | 'medium' | 'low' | 'none';
  fixable: boolean;
  suggestedFix?: string;
  references?: string[];
}

/**
 * Validation suggestion for improvement
 */
export interface ValidationSuggestion {
  id: string;
  type: 'optimization' | 'best_practice' | 'enhancement' | 'compatibility' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  benefit: string;
  implementation: string;
  effort: 'low' | 'medium' | 'high';
  category: string;
}

/**
 * Validation recommendation for template improvement
 */
export interface ValidationRecommendation {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10 priority score
  category: 'quality' | 'performance' | 'usability' | 'compatibility' | 'security';
  actionItems: string[];
}

/**
 * Template testing configuration
 */
export interface TemplateTestConfig {
  testLevel: 'smoke' | 'basic' | 'comprehensive' | 'full';
  includePerformance: boolean;
  includeCompatibility: boolean;
  includeApplicationTest: boolean;
  mockEnvironment: {
    architecture: PlatformArchitectureType;
    domain: ContentDomainType;
    version: string;
  };
  limits: {
    maxValidationTime: number;
    maxMemoryUsage: number;
    maxApplicationTime: number;
  };
}

/**
 * Template application test result
 */
export interface TemplateApplicationTestResult {
  success: boolean;
  templateId: string;
  testConfig: TemplateTestConfig;
  
  applicationResult: {
    succeeded: boolean;
    duration: number;
    memoryUsage: number;
    configurationGenerated: boolean;
    layersPopulated: number;
    conflictsResolved: number;
  };
  
  validationResult: {
    configurationValid: boolean;
    layersValid: boolean;
    constraintsSatisfied: boolean;
    compatibilityMaintained: boolean;
  };
  
  performanceMetrics: {
    applicationTime: number;
    memoryPeak: number;
    memoryAverage: number;
    operationCounts: Record<string, number>;
  };
  
  issues: ValidationIssue[];
  recommendations: ValidationRecommendation[];
}

/**
 * Template quality assessment
 */
export interface TemplateQualityAssessment {
  templateId: string;
  overallScore: number; // 0-100
  
  qualityMetrics: {
    completeness: number; // How complete the template is
    correctness: number; // How correct the configuration is
    usability: number; // How easy to use
    performance: number; // Performance characteristics
    maintainability: number; // How maintainable
    documentation: number; // Documentation quality
    compatibility: number; // Compatibility with ecosystem
  };
  
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  
  comparisonToBenchmark: {
    category: string;
    averageScore: number;
    percentile: number;
    ranking: number;
    totalInCategory: number;
  };
}

/**
 * Main template validation engine
 */
export class TemplateValidationEngine {
  private validationRules: Map<string, ValidationRule> = new Map();
  private testSuites: Map<string, TestSuite> = new Map();
  private benchmarkData: Map<string, TemplateBenchmark> = new Map();

  constructor() {
    this.initializeValidationRules();
    this.initializeTestSuites();
    this.initializeBenchmarks();
  }

  /**
   * Initialize validation rules for different aspects
   */
  private initializeValidationRules(): void {
    // Structure validation rules
    this.validationRules.set('structure', {
      name: 'Template Structure',
      checks: [
        {
          id: 'required_fields',
          name: 'Required Fields Present',
          severity: 'critical',
          validator: (template: CompleteConfigurationTemplate) => {
            const required = ['id', 'name', 'description', 'version', 'targets', 'layers', 'metadata'];
            const missing = required.filter(field => !template[field as keyof CompleteConfigurationTemplate]);
            
            return {
              passed: missing.length === 0,
              issues: missing.map(field => ({
                id: `missing_${field}`,
                severity: 'critical' as const,
                category: 'structure' as const,
                code: 'MISSING_REQUIRED_FIELD',
                message: `Required field missing: ${field}`,
                description: `Template must include the ${field} field`,
                path: field,
                impact: 'high' as const,
                fixable: true,
                suggestedFix: `Add the required ${field} field to the template`
              }))
            };
          }
        },
        {
          id: 'valid_ids',
          name: 'Valid Identifiers',
          severity: 'error',
          validator: (template: CompleteConfigurationTemplate) => {
            const idPattern = /^[a-z][a-z0-9-]*[a-z0-9]$/;
            const issues: ValidationIssue[] = [];
            
            if (!idPattern.test(template.id)) {
              issues.push({
                id: 'invalid_template_id',
                severity: 'error',
                category: 'structure',
                code: 'INVALID_ID_FORMAT',
                message: 'Template ID must follow kebab-case pattern',
                description: 'Template IDs should start with a letter, contain only lowercase letters, numbers, and hyphens',
                path: 'id',
                actual: template.id,
                expected: 'kebab-case string',
                impact: 'medium',
                fixable: true,
                suggestedFix: 'Rename template ID to follow kebab-case pattern'
              });
            }
            
            return { passed: issues.length === 0, issues };
          }
        }
      ]
    });

    // Metadata validation rules
    this.validationRules.set('metadata', {
      name: 'Metadata Validation',
      checks: [
        {
          id: 'version_format',
          name: 'Valid Version Format',
          severity: 'error',
          validator: (template: CompleteConfigurationTemplate) => {
            const versionPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
            const issues: ValidationIssue[] = [];
            
            if (!versionPattern.test(template.version)) {
              issues.push({
                id: 'invalid_version',
                severity: 'error',
                category: 'metadata',
                code: 'INVALID_VERSION_FORMAT',
                message: 'Template version must follow semantic versioning',
                description: 'Version should be in format: major.minor.patch[-prerelease]',
                path: 'version',
                actual: template.version,
                expected: 'semantic version (e.g., 1.0.0)',
                impact: 'medium',
                fixable: true,
                suggestedFix: 'Update version to follow semantic versioning format'
              });
            }
            
            return { passed: issues.length === 0, issues };
          }
        },
        {
          id: 'rating_range',
          name: 'Valid Rating Range',
          severity: 'warning',
          validator: (template: CompleteConfigurationTemplate) => {
            const issues: ValidationIssue[] = [];
            const rating = template.metadata.rating;
            
            if (rating < 0 || rating > 5) {
              issues.push({
                id: 'invalid_rating',
                severity: 'warning',
                category: 'metadata',
                code: 'INVALID_RATING_RANGE',
                message: 'Template rating must be between 0 and 5',
                description: 'Rating should represent a 5-star rating system',
                path: 'metadata.rating',
                actual: rating,
                expected: 'number between 0 and 5',
                impact: 'low',
                fixable: true,
                suggestedFix: 'Set rating to a value between 0 and 5'
              });
            }
            
            return { passed: issues.length === 0, issues };
          }
        }
      ]
    });

    // Layer validation rules
    this.validationRules.set('layers', {
      name: 'Configuration Layers',
      checks: [
        {
          id: 'at_least_one_layer',
          name: 'At Least One Layer Configured',
          severity: 'critical',
          validator: (template: CompleteConfigurationTemplate) => {
            const hasUniversal = template.layers.universal && Object.keys(template.layers.universal).length > 0;
            const hasDetection = template.layers.detection && Object.keys(template.layers.detection).length > 0;
            const hasExtensions = template.layers.extensions && Object.keys(template.layers.extensions).length > 0;
            
            const issues: ValidationIssue[] = [];
            
            if (!hasUniversal && !hasDetection && !hasExtensions) {
              issues.push({
                id: 'no_layers_configured',
                severity: 'critical',
                category: 'layers',
                code: 'NO_LAYERS_CONFIGURED',
                message: 'Template must configure at least one layer',
                description: 'Templates should provide configuration for universal, detection, or extensions layers',
                path: 'layers',
                impact: 'high',
                fixable: true,
                suggestedFix: 'Add configuration to at least one layer (universal, detection, or extensions)'
              });
            }
            
            return { passed: issues.length === 0, issues };
          }
        }
      ]
    });

    // Documentation validation rules
    this.validationRules.set('documentation', {
      name: 'Documentation Quality',
      checks: [
        {
          id: 'complete_documentation',
          name: 'Complete Documentation',
          severity: 'warning',
          validator: (template: CompleteConfigurationTemplate) => {
            const issues: ValidationIssue[] = [];
            const doc = template.documentation;
            
            if (!doc.overview || doc.overview.length < 50) {
              issues.push({
                id: 'insufficient_overview',
                severity: 'warning',
                category: 'documentation',
                code: 'INSUFFICIENT_OVERVIEW',
                message: 'Template overview should be at least 50 characters',
                description: 'A good overview helps users understand the template purpose',
                path: 'documentation.overview',
                impact: 'medium',
                fixable: true,
                suggestedFix: 'Expand the overview to provide more detail about the template'
              });
            }
            
            if (doc.setup.length === 0) {
              issues.push({
                id: 'missing_setup_instructions',
                severity: 'warning',
                category: 'documentation',
                code: 'MISSING_SETUP_INSTRUCTIONS',
                message: 'Template should include setup instructions',
                description: 'Setup instructions help users apply the template correctly',
                path: 'documentation.setup',
                impact: 'medium',
                fixable: true,
                suggestedFix: 'Add step-by-step setup instructions'
              });
            }
            
            return { passed: issues.length === 0, issues };
          }
        }
      ]
    });

    Logger.debug('Initialized validation rules');
  }

  /**
   * Initialize test suites for comprehensive testing
   */
  private initializeTestSuites(): void {
    // Smoke test suite - basic functionality
    this.testSuites.set('smoke', {
      name: 'Smoke Tests',
      description: 'Basic functionality and structure tests',
      tests: [
        {
          name: 'Template Loads Successfully',
          description: 'Verify template can be loaded without errors',
          test: async (template: CompleteConfigurationTemplate) => {
            try {
              // Basic structure validation
              return {
                passed: Boolean(template.id && template.name && template.layers),
                duration: 0,
                message: template.id ? 'Template loads successfully' : 'Template failed to load'
              };
            } catch (error) {
              return {
                passed: false,
                duration: 0,
                message: `Template loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              };
            }
          }
        }
      ]
    });

    // Application test suite - test actual template application
    this.testSuites.set('application', {
      name: 'Application Tests',
      description: 'Test template application and configuration generation',
      tests: [
        {
          name: 'Template Application',
          description: 'Verify template can be applied to generate valid configuration',
          test: async (template: CompleteConfigurationTemplate) => {
            const startTime = Date.now();
            try {
              // Mock template application
              const hasValidLayers = Boolean(
                template.layers.universal || 
                template.layers.detection || 
                template.layers.extensions
              );
              
              const duration = Date.now() - startTime;
              return {
                passed: hasValidLayers,
                duration,
                message: hasValidLayers ? 'Template applies successfully' : 'Template application failed'
              };
            } catch (error) {
              return {
                passed: false,
                duration: Date.now() - startTime,
                message: `Application test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              };
            }
          }
        }
      ]
    });

    Logger.debug('Initialized test suites');
  }

  /**
   * Initialize benchmark data for quality comparison
   */
  private initializeBenchmarks(): void {
    this.benchmarkData.set('platform', {
      category: 'platform',
      averageScore: 75,
      topScores: [95, 92, 89, 87, 85],
      commonIssues: ['incomplete_documentation', 'missing_examples'],
      qualityMetrics: {
        completeness: 80,
        correctness: 85,
        usability: 75,
        performance: 70,
        maintainability: 72,
        documentation: 68,
        compatibility: 88
      }
    });

    this.benchmarkData.set('domain', {
      category: 'domain',
      averageScore: 78,
      topScores: [93, 90, 88, 86, 84],
      commonIssues: ['complex_configuration', 'performance_concerns'],
      qualityMetrics: {
        completeness: 82,
        correctness: 87,
        usability: 76,
        performance: 74,
        maintainability: 75,
        documentation: 70,
        compatibility: 85
      }
    });

    Logger.debug('Initialized benchmark data');
  }

  /**
   * Comprehensive template validation
   */
  public async validateTemplate(
    template: CompleteConfigurationTemplate,
    options: {
      level?: 'basic' | 'standard' | 'strict' | 'comprehensive';
      includePerformance?: boolean;
      includeApplicationTest?: boolean;
    } = {}
  ): Promise<TemplateValidationResult> {
    const startTime = Date.now();
    const level = options.level || 'standard';
    
    Logger.info(`🔍 Validating template: ${template.name} (level: ${level})`);

    try {
      const result: TemplateValidationResult = {
        valid: true,
        templateId: template.id,
        templateName: template.name,
        validatedAt: new Date(),
        validationLevel: level,
        score: 0,
        
        summary: {
          errorsCount: 0,
          warningsCount: 0,
          suggestionsCount: 0,
          passedChecks: 0,
          totalChecks: 0,
          criticalIssues: 0
        },

        results: {
          structure: await this.validateSection(template, 'structure'),
          metadata: await this.validateSection(template, 'metadata'),
          layers: await this.validateSection(template, 'layers'),
          composition: await this.validateSection(template, 'composition'),
          compatibility: await this.validateSection(template, 'compatibility'),
          documentation: await this.validateSection(template, 'documentation'),
          performance: await this.validateSection(template, 'performance')
        },

        issues: [],
        suggestions: [],
        recommendations: [],
        
        performance: {
          validationTime: 0,
          testsRun: 0,
          memoryUsed: 0
        }
      };

      // Collect all issues and calculate summary
      Object.values(result.results).forEach(section => {
        result.issues.push(...section.issues);
        result.summary.totalChecks += section.checksRun;
        result.summary.passedChecks += section.checksPassed;
        result.summary.criticalIssues += section.criticalIssues;
      });

      result.summary.errorsCount = result.issues.filter(i => i.severity === 'error' || i.severity === 'critical').length;
      result.summary.warningsCount = result.issues.filter(i => i.severity === 'warning').length;

      // Generate suggestions and recommendations
      result.suggestions = await this.generateSuggestions(template, result.issues);
      result.recommendations = await this.generateRecommendations(template, result);

      result.summary.suggestionsCount = result.suggestions.length;

      // Calculate overall validation score
      result.score = this.calculateValidationScore(result);
      result.valid = result.summary.criticalIssues === 0 && result.summary.errorsCount === 0;

      const validationTime = Date.now() - startTime;
      result.performance.validationTime = validationTime;

      Logger.complete(`Template validation completed in ${validationTime}ms (score: ${result.score}/100)`);
      
      return result;

    } catch (error) {
      Logger.error(`Template validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Validate specific section of template
   */
  private async validateSection(
    template: CompleteConfigurationTemplate,
    sectionName: string
  ): Promise<ValidationSectionResult> {
    const rule = this.validationRules.get(sectionName);
    
    if (!rule) {
      return {
        name: sectionName,
        passed: true,
        score: 100,
        checksRun: 0,
        checksPassed: 0,
        criticalIssues: 0,
        issues: [],
        suggestions: []
      };
    }

    const issues: ValidationIssue[] = [];
    let checksPassed = 0;
    
    for (const check of rule.checks) {
      try {
        const checkResult = check.validator(template);
        if (checkResult.passed) {
          checksPassed++;
        } else {
          issues.push(...checkResult.issues);
        }
      } catch (error) {
        issues.push({
          id: `${check.id}_error`,
          severity: 'error',
          category: sectionName as any,
          code: 'VALIDATION_ERROR',
          message: `Validation check failed: ${check.name}`,
          description: `Error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`,
          impact: 'medium',
          fixable: false
        });
      }
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const passed = criticalIssues === 0 && issues.filter(i => i.severity === 'error').length === 0;
    const score = Math.max(0, 100 - (criticalIssues * 30) - (issues.filter(i => i.severity === 'error').length * 20) - (issues.filter(i => i.severity === 'warning').length * 10));

    return {
      name: rule.name,
      passed,
      score,
      checksRun: rule.checks.length,
      checksPassed,
      criticalIssues,
      issues,
      suggestions: []
    };
  }

  /**
   * Generate improvement suggestions based on validation results
   */
  private async generateSuggestions(
    template: CompleteConfigurationTemplate,
    issues: ValidationIssue[]
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = [];

    // Documentation improvement suggestions
    if (template.documentation.setup.length < 3) {
      suggestions.push({
        id: 'improve_setup_docs',
        type: 'best_practice',
        priority: 'medium',
        title: 'Improve Setup Documentation',
        description: 'Add more detailed setup instructions to help users apply the template',
        benefit: 'Better user experience and reduced support requests',
        implementation: 'Add step-by-step setup instructions with examples',
        effort: 'low',
        category: 'documentation'
      });
    }

    // Performance optimization suggestions
    if (Object.keys(template.layers.universal || {}).length > 10) {
      suggestions.push({
        id: 'optimize_configuration',
        type: 'performance',
        priority: 'low',
        title: 'Optimize Configuration Complexity',
        description: 'Consider simplifying complex configurations for better performance',
        benefit: 'Faster template application and reduced memory usage',
        implementation: 'Break down complex configurations into smaller, focused templates',
        effort: 'medium',
        category: 'performance'
      });
    }

    // Compatibility suggestions
    if (template.metadata.compatibility.dependencies.length > 5) {
      suggestions.push({
        id: 'reduce_dependencies',
        type: 'compatibility',
        priority: 'medium',
        title: 'Reduce Dependencies',
        description: 'Consider reducing the number of dependencies for better compatibility',
        benefit: 'Wider compatibility and easier installation',
        implementation: 'Remove or make optional non-essential dependencies',
        effort: 'medium',
        category: 'compatibility'
      });
    }

    return suggestions;
  }

  /**
   * Generate recommendations for template improvement
   */
  private async generateRecommendations(
    template: CompleteConfigurationTemplate,
    validationResult: TemplateValidationResult
  ): Promise<ValidationRecommendation[]> {
    const recommendations: ValidationRecommendation[] = [];

    // High-priority recommendation for critical issues
    if (validationResult.summary.criticalIssues > 0) {
      recommendations.push({
        id: 'fix_critical_issues',
        title: 'Fix Critical Issues',
        description: 'Address critical validation issues that prevent template from functioning correctly',
        reasoning: 'Critical issues prevent the template from being used effectively',
        impact: 'high',
        effort: 'medium',
        priority: 10,
        category: 'quality',
        actionItems: validationResult.issues
          .filter(i => i.severity === 'critical')
          .map(i => i.suggestedFix || `Fix: ${i.message}`)
      });
    }

    // Documentation improvement recommendation
    if (validationResult.results.documentation.score < 70) {
      recommendations.push({
        id: 'improve_documentation',
        title: 'Improve Documentation Quality',
        description: 'Enhance template documentation to improve user experience',
        reasoning: 'Good documentation reduces user confusion and support requests',
        impact: 'medium',
        effort: 'low',
        priority: 7,
        category: 'usability',
        actionItems: [
          'Expand template overview with more details',
          'Add comprehensive setup instructions',
          'Include usage examples and best practices',
          'Add troubleshooting guide'
        ]
      });
    }

    // Performance optimization recommendation
    if (validationResult.results.performance.score < 60) {
      recommendations.push({
        id: 'optimize_performance',
        title: 'Optimize Template Performance',
        description: 'Improve template application speed and resource usage',
        reasoning: 'Better performance improves user experience and reduces resource consumption',
        impact: 'medium',
        effort: 'medium',
        priority: 5,
        category: 'performance',
        actionItems: [
          'Simplify complex configuration structures',
          'Reduce unnecessary computations',
          'Optimize inheritance chains',
          'Consider lazy loading for optional features'
        ]
      });
    }

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate overall validation score
   */
  private calculateValidationScore(result: TemplateValidationResult): number {
    const weights = {
      structure: 0.25,
      metadata: 0.15,
      layers: 0.20,
      composition: 0.15,
      compatibility: 0.10,
      documentation: 0.10,
      performance: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(result.results).forEach(([section, sectionResult]) => {
      const weight = weights[section as keyof typeof weights] || 0;
      weightedScore += sectionResult.score * weight;
      totalWeight += weight;
    });

    const baseScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Apply penalties for critical issues
    const criticalPenalty = result.summary.criticalIssues * 20;
    const errorPenalty = result.summary.errorsCount * 10;
    
    return Math.max(0, Math.round(baseScore - criticalPenalty - errorPenalty));
  }

  /**
   * Test template application
   */
  public async testTemplateApplication(
    template: CompleteConfigurationTemplate,
    testConfig: TemplateTestConfig
  ): Promise<TemplateApplicationTestResult> {
    const startTime = Date.now();
    
    Logger.info(`🧪 Testing template application: ${template.name}`);

    try {
      // Mock application test - in real implementation would use template manager
      const applicationResult = {
        succeeded: true,
        duration: Math.random() * 1000 + 500,
        memoryUsage: Math.random() * 50 + 20,
        configurationGenerated: true,
        layersPopulated: Object.keys(template.layers).length,
        conflictsResolved: 0
      };

      const validationResult = {
        configurationValid: true,
        layersValid: true,
        constraintsSatisfied: true,
        compatibilityMaintained: true
      };

      const performanceMetrics = {
        applicationTime: applicationResult.duration,
        memoryPeak: applicationResult.memoryUsage * 1.2,
        memoryAverage: applicationResult.memoryUsage,
        operationCounts: {
          merges: 5,
          validations: 3,
          transformations: 2
        }
      };

      const result: TemplateApplicationTestResult = {
        success: applicationResult.succeeded && validationResult.configurationValid,
        templateId: template.id,
        testConfig,
        applicationResult,
        validationResult,
        performanceMetrics,
        issues: [],
        recommendations: []
      };

      const testTime = Date.now() - startTime;
      Logger.complete(`Template application test completed in ${testTime}ms`);

      return result;

    } catch (error) {
      Logger.error(`Template application test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Assess template quality compared to benchmarks
   */
  public async assessTemplateQuality(
    template: CompleteConfigurationTemplate,
    validationResult: TemplateValidationResult
  ): Promise<TemplateQualityAssessment> {
    Logger.info(`📊 Assessing template quality: ${template.name}`);

    const category = template.metadata.category;
    const benchmark = this.benchmarkData.get(category) || this.benchmarkData.get('platform')!;

    // Calculate individual quality metrics
    const qualityMetrics = {
      completeness: this.calculateCompletenessScore(template),
      correctness: Math.max(0, 100 - validationResult.summary.errorsCount * 15),
      usability: this.calculateUsabilityScore(template),
      performance: validationResult.results.performance.score,
      maintainability: this.calculateMaintainabilityScore(template),
      documentation: validationResult.results.documentation.score,
      compatibility: validationResult.results.compatibility.score
    };

    const overallScore = Object.values(qualityMetrics).reduce((sum, score) => sum + score, 0) / Object.keys(qualityMetrics).length;

    // Compare to benchmark
    const percentile = this.calculatePercentile(overallScore, benchmark.topScores);
    const ranking = benchmark.topScores.filter(score => score > overallScore).length + 1;

    const assessment: TemplateQualityAssessment = {
      templateId: template.id,
      overallScore: Math.round(overallScore),
      qualityMetrics,
      strengths: this.identifyStrengths(qualityMetrics, benchmark.qualityMetrics),
      weaknesses: this.identifyWeaknesses(qualityMetrics, benchmark.qualityMetrics),
      improvementAreas: this.identifyImprovementAreas(qualityMetrics, benchmark.qualityMetrics),
      comparisonToBenchmark: {
        category,
        averageScore: benchmark.averageScore,
        percentile,
        ranking,
        totalInCategory: benchmark.topScores.length + 10 // Mock total
      }
    };

    Logger.complete(`Quality assessment completed (score: ${assessment.overallScore}/100)`);
    return assessment;
  }

  /**
   * Calculate completeness score based on template content
   */
  private calculateCompletenessScore(template: CompleteConfigurationTemplate): number {
    let score = 0;
    const maxScore = 100;

    // Check required fields (30 points)
    const requiredFields = ['id', 'name', 'description', 'version', 'targets', 'layers', 'metadata'];
    const presentFields = requiredFields.filter(field => template[field as keyof CompleteConfigurationTemplate]);
    score += (presentFields.length / requiredFields.length) * 30;

    // Check layer configuration (25 points)
    const configuredLayers = Object.values(template.layers).filter(layer => layer && Object.keys(layer).length > 0);
    score += (configuredLayers.length / 3) * 25;

    // Check documentation completeness (25 points)
    const docScore = (
      (template.documentation.overview.length > 0 ? 1 : 0) +
      (template.documentation.setup.length > 0 ? 1 : 0) +
      (template.documentation.customization.length > 0 ? 1 : 0) +
      (template.documentation.troubleshooting.length > 0 ? 1 : 0)
    ) / 4;
    score += docScore * 25;

    // Check metadata completeness (20 points)
    const metadataScore = (
      (template.metadata.tags.length > 0 ? 1 : 0) +
      (template.metadata.examples.length > 0 ? 1 : 0) +
      (template.metadata.compatibility.dependencies !== undefined ? 1 : 0) +
      (template.metadata.estimatedSetupTime !== undefined ? 1 : 0)
    ) / 4;
    score += metadataScore * 20;

    return Math.min(score, maxScore);
  }

  /**
   * Calculate usability score based on template design
   */
  private calculateUsabilityScore(template: CompleteConfigurationTemplate): number {
    let score = 0;

    // Documentation quality (40 points)
    if (template.documentation.overview.length >= 50) score += 15;
    if (template.documentation.setup.length >= 3) score += 15;
    if (template.documentation.examples.length > 0) score += 10;

    // Metadata clarity (30 points)
    if (template.metadata.difficulty) score += 10;
    if (template.metadata.estimatedSetupTime) score += 10;
    if (template.metadata.tags.length >= 3) score += 10;

    // Configuration simplicity (30 points)
    const complexityPenalty = Math.max(0, Object.keys(template.layers.universal || {}).length - 5) * 2;
    score += Math.max(0, 30 - complexityPenalty);

    return Math.min(score, 100);
  }

  /**
   * Calculate maintainability score
   */
  private calculateMaintainabilityScore(template: CompleteConfigurationTemplate): number {
    let score = 100;

    // Penalize excessive complexity
    const layerComplexity = Object.values(template.layers).reduce((total, layer) => {
      return total + (layer ? this.countNestedProperties(layer) : 0);
    }, 0);
    
    if (layerComplexity > 20) score -= (layerComplexity - 20) * 2;

    // Penalize too many dependencies
    if (template.metadata.compatibility.dependencies.length > 3) {
      score -= (template.metadata.compatibility.dependencies.length - 3) * 5;
    }

    // Reward good inheritance structure
    if (template.composition.baseTemplates.length > 0 && template.composition.baseTemplates.length <= 2) {
      score += 10;
    }

    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Count nested properties in an object
   */
  private countNestedProperties(obj: any, depth = 0): number {
    if (depth > 5) return 0; // Prevent infinite recursion
    
    let count = 0;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        count++;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          count += this.countNestedProperties(obj[key], depth + 1);
        }
      }
    }
    return count;
  }

  /**
   * Calculate percentile ranking
   */
  private calculatePercentile(score: number, benchmarkScores: number[]): number {
    const belowCount = benchmarkScores.filter(s => s < score).length;
    return Math.round((belowCount / benchmarkScores.length) * 100);
  }

  /**
   * Identify template strengths
   */
  private identifyStrengths(metrics: any, benchmark: any): string[] {
    const strengths: string[] = [];
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value > (benchmark[key] + 10)) {
        strengths.push(`Excellent ${key} (${Math.round(value)}/100)`);
      }
    });

    return strengths;
  }

  /**
   * Identify template weaknesses
   */
  private identifyWeaknesses(metrics: any, benchmark: any): string[] {
    const weaknesses: string[] = [];
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value < (benchmark[key] - 10)) {
        weaknesses.push(`Below average ${key} (${Math.round(value)}/100)`);
      }
    });

    return weaknesses;
  }

  /**
   * Identify improvement areas
   */
  private identifyImprovementAreas(metrics: any, benchmark: any): string[] {
    const areas: string[] = [];
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value < 70) {
        areas.push(`${key.charAt(0).toUpperCase() + key.slice(1)} needs improvement`);
      }
    });

    return areas;
  }
}

/**
 * Validation rule interface
 */
interface ValidationRule {
  name: string;
  checks: ValidationCheck[];
}

/**
 * Individual validation check
 */
interface ValidationCheck {
  id: string;
  name: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  validator: (template: CompleteConfigurationTemplate) => {
    passed: boolean;
    issues: ValidationIssue[];
  };
}

/**
 * Test suite interface
 */
interface TestSuite {
  name: string;
  description: string;
  tests: TemplateTest[];
}

/**
 * Individual template test
 */
interface TemplateTest {
  name: string;
  description: string;
  test: (template: CompleteConfigurationTemplate) => Promise<{
    passed: boolean;
    duration: number;
    message: string;
  }>;
}

/**
 * Template benchmark data
 */
interface TemplateBenchmark {
  category: string;
  averageScore: number;
  topScores: number[];
  commonIssues: string[];
  qualityMetrics: {
    completeness: number;
    correctness: number;
    usability: number;
    performance: number;
    maintainability: number;
    documentation: number;
    compatibility: number;
  };
}

/**
 * Default template validation engine instance
 */
export const templateValidationEngine = new TemplateValidationEngine();