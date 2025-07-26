/**
 * Webhook Testing and Validation Utilities for Epic 1: Universal MakerKit Core System
 * Comprehensive testing, validation, and development utilities for webhook functionality
 * Part of Task 1.3.5: Create webhook testing and validation utilities
 */

import type {
  WebhookEndpoint,
  WebhookEventType,
  GenericWebhookPayload,
  WebhookTestingScenario,
  WebhookDeliveryResult,
  WebhookValidationResult,
  DevelopmentWebhookConfig,
  WebhookAuthentication,
  AuthWebhookPayload,
  WebhookPayload,
  WebhookSecurity,
  PlatformWebhookConfig,
  MakerKitWebhookPatterns
} from './webhook-types';
import { Logger } from '../utils/logger';
import { WebhookUtils } from './webhook-types';
import * as crypto from 'crypto';

/**
 * Enhanced webhook testing scenarios for comprehensive development testing
 */
export interface WebhookTestSuite {
  id: string;
  name: string;
  description: string;
  scenarios: WebhookTestingScenario[];
  coverage: TestCoverage;
  platformSpecific: boolean;
  architecture?: 'individual' | 'team' | 'hybrid';
  domain?: 'outdoor' | 'saas' | 'ecommerce' | 'social' | 'generic';
}

export interface TestCoverage {
  eventTypes: WebhookEventType[];
  authenticationTypes: ('none' | 'bearer' | 'basic' | 'signature')[];
  responseScenarios: ('success' | 'error' | 'timeout' | 'retry')[];
  payloadTypes: ('auth' | 'database' | 'custom')[];
  coveragePercentage: number;
}

export interface WebhookTestResult {
  testSuiteId: string;
  scenarioResults: ScenarioTestResult[];
  overallSuccess: boolean;
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  executionTime: number;
  coverage: TestCoverage;
  summary: TestSummary;
}

export interface ScenarioTestResult {
  scenarioId: string;
  scenarioName: string;
  passed: boolean;
  deliveryResult: WebhookDeliveryResult;
  validationResult: WebhookValidationResult;
  expectedVsActual: ExpectedVsActual;
  executionTime: number;
  errors: string[];
  warnings: string[];
}

export interface ExpectedVsActual {
  statusCode: { expected: number; actual: number; matches: boolean };
  responseTime: { expected?: number; actual: number; withinRange: boolean };
  headers: { expected?: Record<string, string>; actual?: Record<string, string>; matches: boolean };
  body: { expected?: any; actual?: any; matches: boolean };
}

export interface TestSummary {
  authenticationTests: { passed: number; total: number };
  eventTypeTests: { passed: number; total: number };
  payloadValidationTests: { passed: number; total: number };
  errorHandlingTests: { passed: number; total: number };
  performanceTests: { passed: number; total: number };
  securityTests: { passed: number; total: number };
}

/**
 * Webhook security implementation
 */
export class WebhookSecurityImpl implements WebhookSecurity {
  /**
   * Generate webhook signature using HMAC
   */
  generateSignature(payload: string, secret: string, algorithm: 'sha256' | 'sha1' = 'sha256'): string {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string, algorithm: 'sha256' | 'sha1' = 'sha256'): boolean {
    const expectedSignature = this.generateSignature(payload, secret, algorithm);
    
    // Use timing-safe comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate webhook request structure and headers
   */
  validateRequest(request: {
    headers: Record<string, string>;
    body: string;
    method: string;
    url: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate HTTP method
    if (request.method !== 'POST') {
      errors.push('Webhook requests must use POST method');
    }

    // Validate content type
    const contentType = request.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      errors.push('Webhook requests must use application/json content type');
    }

    // Validate body
    if (!request.body || request.body.trim() === '') {
      errors.push('Webhook request body cannot be empty');
    } else {
      try {
        JSON.parse(request.body);
      } catch (error) {
        errors.push('Webhook request body must be valid JSON');
      }
    }

    // Check for required headers
    const userAgent = request.headers['user-agent'];
    if (!userAgent) {
      errors.push('User-Agent header is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Simple rate limiting check (in-memory for development)
   */
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  async checkRateLimit(endpoint: string, windowMs: number, maxRequests: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const store = this.rateLimitStore.get(endpoint);

    if (!store || now > store.resetTime) {
      // Reset or initialize rate limit
      const resetTime = now + windowMs;
      this.rateLimitStore.set(endpoint, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime
      };
    }

    if (store.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: store.resetTime
      };
    }

    store.count++;
    return {
      allowed: true,
      remaining: maxRequests - store.count,
      resetTime: store.resetTime
    };
  }
}

/**
 * Comprehensive webhook testing utilities
 */
export class WebhookTestUtils {
  private security: WebhookSecurityImpl;

  constructor() {
    this.security = new WebhookSecurityImpl();
  }

  /**
   * Generate comprehensive test scenarios for MakerKit platforms
   */
  generateTestSuite(
    config: DevelopmentWebhookConfig,
    platformConfig?: PlatformWebhookConfig
  ): WebhookTestSuite {
    const scenarios: WebhookTestingScenario[] = [];

    // Generate basic authentication scenarios
    scenarios.push(...this.generateAuthenticationScenarios(config));

    // Generate event type scenarios
    scenarios.push(...this.generateEventTypeScenarios(config));

    // Generate error handling scenarios
    scenarios.push(...this.generateErrorHandlingScenarios(config));

    // Generate platform-specific scenarios
    if (platformConfig) {
      scenarios.push(...this.generatePlatformSpecificScenarios(config, platformConfig));
    }

    // Generate performance test scenarios
    scenarios.push(...this.generatePerformanceScenarios(config));

    // Generate security test scenarios
    scenarios.push(...this.generateSecurityScenarios(config));

    const coverage = this.calculateTestCoverage(scenarios);

    return {
      id: WebhookUtils.generateWebhookId('test-suite'),
      name: `Comprehensive Webhook Test Suite`,
      description: 'Complete test coverage for webhook functionality including authentication, events, errors, and platform-specific scenarios',
      scenarios,
      coverage,
      platformSpecific: !!platformConfig,
      architecture: platformConfig?.architecture,
      domain: platformConfig?.domain
    };
  }

  /**
   * Run complete test suite
   */
  async runTestSuite(
    testSuite: WebhookTestSuite,
    webhookManager: any // IWebhookManager interface
  ): Promise<WebhookTestResult> {
    Logger.info(`🧪 Running webhook test suite: ${testSuite.name}`);
    const startTime = Date.now();

    const scenarioResults: ScenarioTestResult[] = [];
    let passedScenarios = 0;

    for (const scenario of testSuite.scenarios) {
      const scenarioResult = await this.runScenarioTest(scenario, webhookManager);
      scenarioResults.push(scenarioResult);
      
      if (scenarioResult.passed) {
        passedScenarios++;
      }
    }

    const executionTime = Date.now() - startTime;
    const overallSuccess = passedScenarios === testSuite.scenarios.length;

    const summary = this.generateTestSummary(scenarioResults);

    Logger.info(`✅ Test suite completed: ${passedScenarios}/${testSuite.scenarios.length} scenarios passed`);

    return {
      testSuiteId: testSuite.id,
      scenarioResults,
      overallSuccess,
      totalScenarios: testSuite.scenarios.length,
      passedScenarios,
      failedScenarios: testSuite.scenarios.length - passedScenarios,
      executionTime,
      coverage: testSuite.coverage,
      summary
    };
  }

  /**
   * Run individual test scenario
   */
  private async runScenarioTest(
    scenario: WebhookTestingScenario,
    webhookManager: any
  ): Promise<ScenarioTestResult> {
    Logger.debug(`🔬 Running test scenario: ${scenario.name}`);
    const startTime = Date.now();

    try {
      // Run the scenario
      const deliveryResult = await webhookManager.runTestScenario(scenario);
      
      // Validate the result
      const validationResult = await this.validateScenarioResult(deliveryResult, scenario);
      
      // Compare expected vs actual
      const expectedVsActual = this.compareExpectedVsActual(deliveryResult, scenario);
      
      const passed = validationResult.isValid && expectedVsActual.statusCode.matches;
      const executionTime = Date.now() - startTime;

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed,
        deliveryResult,
        validationResult,
        expectedVsActual,
        executionTime,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        passed: false,
        deliveryResult: {
          success: false,
          statusCode: 0,
          responseTime: executionTime,
          attempt: 1,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        validationResult: {
          isValid: false,
          errors: [error.message],
          warnings: [],
          suggestions: [],
          payloadSize: 0,
          validationTime: 0
        },
        expectedVsActual: {
          statusCode: { expected: scenario.expectedResponse.statusCode, actual: 0, matches: false },
          responseTime: { actual: executionTime, withinRange: false },
          headers: { matches: false },
          body: { matches: false }
        },
        executionTime,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Generate authentication test scenarios
   */
  private generateAuthenticationScenarios(config: DevelopmentWebhookConfig): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Test no authentication
    scenarios.push({
      id: WebhookUtils.generateWebhookId('auth-test'),
      name: 'No Authentication Test',
      description: 'Test webhook delivery without authentication',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: {
        statusCode: 200,
        headers: { 'content-type': 'application/json' }
      },
      validationRules: [
        { field: 'success', rule: 'equals_true', description: 'Delivery should succeed' },
        { field: 'statusCode', rule: 'equals_200', description: 'Should return 200 status' }
      ]
    });

    // Test bearer authentication
    if (config.authentication?.type === 'bearer') {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('bearer-test'),
        name: 'Bearer Authentication Test',
        description: 'Test webhook delivery with bearer token authentication',
        event: 'user.created',
        mockPayload: this.generateMockAuthPayload('user.created'),
        expectedResponse: {
          statusCode: 200,
          headers: { 'authorization': `Bearer ${config.authentication.credentials?.token}` }
        },
        validationRules: [
          { field: 'headers.authorization', rule: 'contains_bearer', description: 'Should include bearer token' }
        ]
      });
    }

    // Test signature authentication
    if (config.authentication?.type === 'signature') {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('signature-test'),
        name: 'Signature Authentication Test',
        description: 'Test webhook delivery with signature authentication',
        event: 'user.created',
        mockPayload: this.generateMockAuthPayload('user.created'),
        expectedResponse: {
          statusCode: 200,
          headers: { 'x-signature': 'sha256=...' }
        },
        validationRules: [
          { field: 'headers.x-signature', rule: 'starts_with_sha256', description: 'Should include valid signature' }
        ]
      });
    }

    return scenarios;
  }

  /**
   * Generate event type test scenarios
   */
  private generateEventTypeScenarios(config: DevelopmentWebhookConfig): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Auth event scenarios
    const authEvents: WebhookEventType[] = ['user.created', 'user.updated', 'user.confirmed', 'mfa.enrolled'];
    
    for (const event of authEvents) {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('event-test'),
        name: `${event} Event Test`,
        description: `Test webhook delivery for ${event} event`,
        event,
        mockPayload: this.generateMockAuthPayload(event as any),
        expectedResponse: { statusCode: 200 },
        validationRules: [
          { field: 'type', rule: `equals_${event}`, description: `Event type should be ${event}` },
          { field: 'user.id', rule: 'is_uuid', description: 'User ID should be valid UUID' }
        ]
      });
    }

    // Database event scenarios
    const dbEvents: WebhookEventType[] = ['INSERT', 'UPDATE', 'DELETE'];
    
    for (const event of dbEvents) {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('db-test'),
        name: `${event} Database Event Test`,
        description: `Test webhook delivery for database ${event} event`,
        event,
        mockPayload: this.generateMockDatabasePayload(event as any),
        expectedResponse: { statusCode: 200 },
        validationRules: [
          { field: 'type', rule: `equals_${event}`, description: `Event type should be ${event}` },
          { field: 'table', rule: 'is_string', description: 'Table name should be present' },
          { field: 'schema', rule: 'equals_public', description: 'Schema should be public' }
        ]
      });
    }

    return scenarios;
  }

  /**
   * Generate error handling test scenarios
   */
  private generateErrorHandlingScenarios(config: DevelopmentWebhookConfig): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Test 404 response
    scenarios.push({
      id: WebhookUtils.generateWebhookId('error-test'),
      name: '404 Error Handling Test',
      description: 'Test webhook handling when endpoint returns 404',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: { statusCode: 404 },
      validationRules: [
        { field: 'success', rule: 'equals_false', description: 'Delivery should fail' },
        { field: 'statusCode', rule: 'equals_404', description: 'Should return 404 status' }
      ]
    });

    // Test 500 response
    scenarios.push({
      id: WebhookUtils.generateWebhookId('error-test'),
      name: '500 Error Handling Test',
      description: 'Test webhook handling when endpoint returns 500',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: { statusCode: 500 },
      validationRules: [
        { field: 'success', rule: 'equals_false', description: 'Delivery should fail' },
        { field: 'statusCode', rule: 'equals_500', description: 'Should return 500 status' }
      ]
    });

    // Test timeout scenario
    scenarios.push({
      id: WebhookUtils.generateWebhookId('timeout-test'),
      name: 'Timeout Handling Test',
      description: 'Test webhook handling when request times out',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: { statusCode: 0 },
      validationRules: [
        { field: 'success', rule: 'equals_false', description: 'Delivery should fail' },
        { field: 'error', rule: 'contains_timeout', description: 'Should contain timeout error' }
      ]
    });

    return scenarios;
  }

  /**
   * Generate platform-specific test scenarios
   */
  private generatePlatformSpecificScenarios(
    config: DevelopmentWebhookConfig,
    platformConfig: PlatformWebhookConfig
  ): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Generate scenarios based on domain
    if (platformConfig.domain === 'outdoor') {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('outdoor-test'),
        name: 'Outdoor Setup Created Test',
        description: 'Test webhook for outdoor setup creation',
        event: 'INSERT',
        mockPayload: {
          type: 'INSERT',
          table: 'setups',
          schema: 'public',
          record: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            user_id: '440e8400-e29b-41d4-a716-446655440000',
            title: 'Test Outdoor Setup',
            description: 'A test outdoor setup for webhook validation',
            category: 'hiking',
            is_public: true,
            created_at: new Date().toISOString()
          },
          old_record: null
        },
        expectedResponse: { statusCode: 200 },
        validationRules: [
          { field: 'table', rule: 'equals_setups', description: 'Should be setups table' },
          { field: 'record.category', rule: 'is_string', description: 'Setup should have category' }
        ]
      });
    }

    // Generate scenarios based on architecture
    if (platformConfig.architecture === 'team') {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('team-test'),
        name: 'Team Member Added Test',
        description: 'Test webhook for team member addition',
        event: 'INSERT',
        mockPayload: {
          type: 'INSERT',
          table: 'organization_members',
          schema: 'public',
          record: {
            id: '550e8400-e29b-41d4-a716-446655440000',
            organization_id: '440e8400-e29b-41d4-a716-446655440000',
            user_id: '330e8400-e29b-41d4-a716-446655440000',
            role: 'member',
            created_at: new Date().toISOString()
          },
          old_record: null
        },
        expectedResponse: { statusCode: 200 },
        validationRules: [
          { field: 'table', rule: 'equals_organization_members', description: 'Should be organization_members table' },
          { field: 'record.role', rule: 'is_string', description: 'Member should have role' }
        ]
      });
    }

    return scenarios;
  }

  /**
   * Generate performance test scenarios
   */
  private generatePerformanceScenarios(config: DevelopmentWebhookConfig): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Response time test
    scenarios.push({
      id: WebhookUtils.generateWebhookId('perf-test'),
      name: 'Response Time Test',
      description: 'Test webhook response time performance',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: { statusCode: 200 },
      validationRules: [
        { field: 'responseTime', rule: 'less_than_1000', description: 'Response time should be under 1 second' }
      ]
    });

    // Large payload test
    scenarios.push({
      id: WebhookUtils.generateWebhookId('payload-test'),
      name: 'Large Payload Test',
      description: 'Test webhook handling of large payloads',
      event: 'user.updated',
      mockPayload: this.generateLargeMockPayload(),
      expectedResponse: { statusCode: 200 },
      validationRules: [
        { field: 'success', rule: 'equals_true', description: 'Should handle large payloads' },
        { field: 'payloadSize', rule: 'greater_than_10000', description: 'Payload should be large' }
      ]
    });

    return scenarios;
  }

  /**
   * Generate security test scenarios
   */
  private generateSecurityScenarios(config: DevelopmentWebhookConfig): WebhookTestingScenario[] {
    const scenarios: WebhookTestingScenario[] = [];

    // Invalid signature test
    if (config.authentication?.type === 'signature') {
      scenarios.push({
        id: WebhookUtils.generateWebhookId('security-test'),
        name: 'Invalid Signature Test',
        description: 'Test webhook security with invalid signature',
        event: 'user.created',
        mockPayload: this.generateMockAuthPayload('user.created'),
        expectedResponse: { statusCode: 401 },
        validationRules: [
          { field: 'success', rule: 'equals_false', description: 'Should reject invalid signature' },
          { field: 'statusCode', rule: 'equals_401', description: 'Should return 401 unauthorized' }
        ]
      });
    }

    // Rate limiting test
    scenarios.push({
      id: WebhookUtils.generateWebhookId('rate-test'),
      name: 'Rate Limiting Test',
      description: 'Test webhook rate limiting functionality',
      event: 'user.created',
      mockPayload: this.generateMockAuthPayload('user.created'),
      expectedResponse: { statusCode: 429 },
      validationRules: [
        { field: 'statusCode', rule: 'equals_429', description: 'Should return 429 when rate limited' }
      ]
    });

    return scenarios;
  }

  /**
   * Helper methods for mock payload generation
   */
  private generateMockAuthPayload(event: string): AuthWebhookPayload {
    return {
      type: event as any,
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg'
        },
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      }
    };
  }

  private generateMockDatabasePayload(event: string): WebhookPayload {
    return {
      type: event as any,
      table: 'accounts',
      schema: 'public',
      record: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Account',
        slug: 'test-account',
        is_personal_account: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      old_record: null
    };
  }

  private generateLargeMockPayload(): AuthWebhookPayload {
    const largeMetadata: Record<string, any> = {};
    
    // Generate large metadata object
    for (let i = 0; i < 1000; i++) {
      largeMetadata[`field_${i}`] = `This is a large field with lots of data to test payload size handling. Field number ${i} contains sample data.`;
    }

    return {
      type: 'user.updated',
      user: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_metadata: largeMetadata,
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      }
    };
  }

  /**
   * Validation and comparison utilities
   */
  private async validateScenarioResult(
    result: WebhookDeliveryResult,
    scenario: WebhookTestingScenario
  ): Promise<WebhookValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate against expected response
    if (result.statusCode !== scenario.expectedResponse.statusCode) {
      errors.push(`Expected status code ${scenario.expectedResponse.statusCode}, got ${result.statusCode}`);
    }

    // Apply validation rules
    for (const rule of scenario.validationRules) {
      const fieldValue = this.getFieldValue(result, rule.field);
      const ruleResult = this.applyValidationRule(fieldValue, rule.rule);
      
      if (!ruleResult.passed) {
        errors.push(`Validation rule failed for ${rule.field}: ${rule.description} - ${ruleResult.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      payloadSize: WebhookUtils.getPayloadSize(scenario.mockPayload),
      validationTime: 0
    };
  }

  private compareExpectedVsActual(
    result: WebhookDeliveryResult,
    scenario: WebhookTestingScenario
  ): ExpectedVsActual {
    return {
      statusCode: {
        expected: scenario.expectedResponse.statusCode,
        actual: result.statusCode || 0,
        matches: result.statusCode === scenario.expectedResponse.statusCode
      },
      responseTime: {
        actual: result.responseTime,
        withinRange: result.responseTime < 5000 // 5 second max
      },
      headers: {
        expected: scenario.expectedResponse.headers,
        actual: result.response?.headers,
        matches: this.compareHeaders(scenario.expectedResponse.headers, result.response?.headers)
      },
      body: {
        expected: scenario.expectedResponse.body,
        actual: result.response?.body,
        matches: this.compareBody(scenario.expectedResponse.body, result.response?.body)
      }
    };
  }

  private compareHeaders(expected?: Record<string, string>, actual?: Record<string, string>): boolean {
    if (!expected) return true;
    if (!actual) return false;

    for (const [key, value] of Object.entries(expected)) {
      if (actual[key] !== value) return false;
    }
    return true;
  }

  private compareBody(expected?: any, actual?: any): boolean {
    if (!expected) return true;
    if (!actual) return false;

    try {
      const actualParsed = typeof actual === 'string' ? JSON.parse(actual) : actual;
      return JSON.stringify(expected) === JSON.stringify(actualParsed);
    } catch {
      return false;
    }
  }

  private getFieldValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private applyValidationRule(value: any, rule: string): { passed: boolean; message: string } {
    const [ruleName, ruleValue] = rule.split('_', 2);
    
    switch (ruleName) {
      case 'equals':
        const passed = value === (ruleValue === 'true' ? true : ruleValue === 'false' ? false : ruleValue);
        return { passed, message: passed ? 'Value matches expected' : `Expected ${ruleValue}, got ${value}` };
        
      case 'contains':
        const contains = value && value.toString().includes(ruleValue);
        return { passed: contains, message: contains ? 'Value contains expected string' : `Value does not contain ${ruleValue}` };
        
      case 'is':
        let typeCheck = false;
        if (ruleValue === 'string') typeCheck = typeof value === 'string';
        else if (ruleValue === 'uuid') typeCheck = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
        return { passed: typeCheck, message: typeCheck ? `Value is valid ${ruleValue}` : `Value is not a valid ${ruleValue}` };
        
      case 'less':
        const lessThan = value < parseInt(ruleValue);
        return { passed: lessThan, message: lessThan ? `Value is less than ${ruleValue}` : `Value ${value} is not less than ${ruleValue}` };
        
      case 'greater':
        const greaterThan = value > parseInt(ruleValue);
        return { passed: greaterThan, message: greaterThan ? `Value is greater than ${ruleValue}` : `Value ${value} is not greater than ${ruleValue}` };
        
      default:
        return { passed: false, message: `Unknown validation rule: ${rule}` };
    }
  }

  private calculateTestCoverage(scenarios: WebhookTestingScenario[]): TestCoverage {
    const eventTypes = new Set<WebhookEventType>();
    const authTypes = new Set<string>();
    const responseTypes = new Set<string>();
    const payloadTypes = new Set<string>();

    for (const scenario of scenarios) {
      eventTypes.add(scenario.event);
      
      // Determine auth type from scenario
      if (scenario.name.includes('Bearer')) authTypes.add('bearer');
      else if (scenario.name.includes('Signature')) authTypes.add('signature');
      else authTypes.add('none');
      
      // Determine response scenario
      if (scenario.expectedResponse.statusCode === 200) responseTypes.add('success');
      else if (scenario.expectedResponse.statusCode >= 400) responseTypes.add('error');
      else if (scenario.name.includes('Timeout')) responseTypes.add('timeout');
      
      // Determine payload type
      if ('user' in scenario.mockPayload) payloadTypes.add('auth');
      else if ('table' in scenario.mockPayload) payloadTypes.add('database');
      else payloadTypes.add('custom');
    }

    // Calculate coverage percentage based on common scenarios
    const totalPossibleScenarios = 20; // Rough estimate of comprehensive coverage
    const coveragePercentage = Math.min((scenarios.length / totalPossibleScenarios) * 100, 100);

    return {
      eventTypes: Array.from(eventTypes),
      authenticationTypes: Array.from(authTypes) as any,
      responseScenarios: Array.from(responseTypes) as any,
      payloadTypes: Array.from(payloadTypes) as any,
      coveragePercentage
    };
  }

  private generateTestSummary(results: ScenarioTestResult[]): TestSummary {
    const categories = {
      authenticationTests: { passed: 0, total: 0 },
      eventTypeTests: { passed: 0, total: 0 },
      payloadValidationTests: { passed: 0, total: 0 },
      errorHandlingTests: { passed: 0, total: 0 },
      performanceTests: { passed: 0, total: 0 },
      securityTests: { passed: 0, total: 0 }
    };

    for (const result of results) {
      // Categorize test based on scenario name
      if (result.scenarioName.includes('Authentication')) {
        categories.authenticationTests.total++;
        if (result.passed) categories.authenticationTests.passed++;
      } else if (result.scenarioName.includes('Event')) {
        categories.eventTypeTests.total++;
        if (result.passed) categories.eventTypeTests.passed++;
      } else if (result.scenarioName.includes('Payload')) {
        categories.payloadValidationTests.total++;
        if (result.passed) categories.payloadValidationTests.passed++;
      } else if (result.scenarioName.includes('Error') || result.scenarioName.includes('404') || result.scenarioName.includes('500')) {
        categories.errorHandlingTests.total++;
        if (result.passed) categories.errorHandlingTests.passed++;
      } else if (result.scenarioName.includes('Performance') || result.scenarioName.includes('Response Time')) {
        categories.performanceTests.total++;
        if (result.passed) categories.performanceTests.passed++;
      } else if (result.scenarioName.includes('Security') || result.scenarioName.includes('Rate') || result.scenarioName.includes('Signature')) {
        categories.securityTests.total++;
        if (result.passed) categories.securityTests.passed++;
      }
    }

    return categories;
  }

  /**
   * Generate webhook testing report
   */
  generateTestReport(testResult: WebhookTestResult): string {
    const report = [
      '# Webhook Test Report',
      '',
      `**Test Suite:** ${testResult.testSuiteId}`,
      `**Execution Time:** ${testResult.executionTime}ms`,
      `**Overall Success:** ${testResult.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`,
      `**Scenarios:** ${testResult.passedScenarios}/${testResult.totalScenarios} passed`,
      '',
      '## Coverage',
      `- Event Types: ${testResult.coverage.eventTypes.join(', ')}`,
      `- Authentication Types: ${testResult.coverage.authenticationTypes.join(', ')}`,
      `- Response Scenarios: ${testResult.coverage.responseScenarios.join(', ')}`,
      `- Coverage Percentage: ${testResult.coverage.coveragePercentage.toFixed(1)}%`,
      '',
      '## Summary by Category',
      `- Authentication Tests: ${testResult.summary.authenticationTests.passed}/${testResult.summary.authenticationTests.total}`,
      `- Event Type Tests: ${testResult.summary.eventTypeTests.passed}/${testResult.summary.eventTypeTests.total}`,
      `- Payload Validation: ${testResult.summary.payloadValidationTests.passed}/${testResult.summary.payloadValidationTests.total}`,
      `- Error Handling: ${testResult.summary.errorHandlingTests.passed}/${testResult.summary.errorHandlingTests.total}`,
      `- Performance Tests: ${testResult.summary.performanceTests.passed}/${testResult.summary.performanceTests.total}`,
      `- Security Tests: ${testResult.summary.securityTests.passed}/${testResult.summary.securityTests.total}`,
      ''
    ];

    // Add failed scenarios details
    const failedScenarios = testResult.scenarioResults.filter(r => !r.passed);
    if (failedScenarios.length > 0) {
      report.push('## Failed Scenarios');
      for (const scenario of failedScenarios) {
        report.push(`### ${scenario.scenarioName}`);
        report.push(`- **Execution Time:** ${scenario.executionTime}ms`);
        report.push(`- **Expected Status Code:** ${scenario.expectedVsActual.statusCode.expected}`);
        report.push(`- **Actual Status Code:** ${scenario.expectedVsActual.statusCode.actual}`);
        if (scenario.errors.length > 0) {
          report.push(`- **Errors:** ${scenario.errors.join(', ')}`);
        }
        report.push('');
      }
    }

    return report.join('\n');
  }
}

/**
 * Webhook validation utilities for development environments
 */
export class WebhookValidationUtils {
  /**
   * Validate webhook configuration completeness
   */
  static validateWebhookConfiguration(config: DevelopmentWebhookConfig): WebhookValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check required fields
    if (!config.baseUrl) {
      errors.push('Base URL is required for webhook configuration');
    } else if (!WebhookUtils.isValidWebhookUrl(config.baseUrl)) {
      errors.push('Base URL must be a valid HTTP/HTTPS URL');
    }

    // Check endpoint configuration
    const endpointCount = Object.keys(config.endpoints).length;
    if (endpointCount === 0) {
      warnings.push('No webhook endpoints configured');
    }

    // Check authentication
    if (!config.authentication || config.authentication.type === 'none') {
      suggestions.push('Consider adding authentication for production environments');
    }

    // Check ngrok configuration
    if (config.ngrokSupport.enabled && !config.ngrokSupport.authToken) {
      warnings.push('Ngrok enabled but no auth token provided - public tunnel will be created');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      payloadSize: 0,
      validationTime: 0
    };
  }

  /**
   * Validate platform webhook configuration against requirements
   */
  static validatePlatformWebhookConfig(
    config: PlatformWebhookConfig,
    requirements?: string[]
  ): WebhookValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check essential webhooks
    if (config.webhooks.essential.length === 0) {
      errors.push('At least one essential webhook must be configured');
    }

    // Check domain-specific requirements
    if (config.domain !== 'generic') {
      const domainPatterns = config.patterns.domainSpecific[config.domain];
      if (domainPatterns?.enabled && domainPatterns.events.length === 0) {
        warnings.push(`Domain-specific patterns enabled for ${config.domain} but no events configured`);
      }
    }

    // Check architecture-specific requirements
    if (config.architecture === 'team') {
      const hasTeamWebhooks = config.webhooks.essential.some(w => 
        w.name.includes('Team') || w.name.includes('Member') || w.name.includes('Organization')
      );
      if (!hasTeamWebhooks) {
        suggestions.push('Consider adding team-specific webhooks for team architecture');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      payloadSize: 0,
      validationTime: 0
    };
  }
}

// Export security implementation
export const webhookSecurity = new WebhookSecurityImpl();

// Export testing utilities
export const webhookTestUtils = new WebhookTestUtils();