import { SupaSeedFramework, createDefaultConfig } from '../src/index';
import { SeedConfig } from '../src/core/types/types';

describe('SupaSeedFramework', () => {
  const getTestConfig = (): SeedConfig => ({
    ...createDefaultConfig(),
    supabaseUrl: process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321',
    supabaseServiceKey: process.env.TEST_SUPABASE_SERVICE_KEY || 'test-key'
  });

  describe('Configuration Validation', () => {
    it('should throw error for missing supabaseUrl', () => {
      const config = {
        ...getTestConfig(),
        supabaseUrl: '',
      };

      expect(() => new SupaSeedFramework(config)).toThrow(
        'Missing required configuration: supabaseUrl'
      );
    });

    it('should throw error for missing supabaseServiceKey', () => {
      const config = {
        ...getTestConfig(),
        supabaseServiceKey: '',
      };

      expect(() => new SupaSeedFramework(config)).toThrow(
        'Missing required configuration: supabaseServiceKey'
      );
    });

    it('should throw error for invalid URL format', () => {
      const config = {
        ...getTestConfig(),
        supabaseUrl: 'not-a-url',
      };

      expect(() => new SupaSeedFramework(config)).toThrow(
        'supabaseUrl must be a valid HTTP/HTTPS URL'
      );
    });

    it('should throw error for invalid user count', () => {
      const config = {
        ...getTestConfig(),
        userCount: 0,
      };

      expect(() => new SupaSeedFramework(config)).toThrow(
        'userCount and setupsPerUser must be greater than 0'
      );
    });

    it('should create framework with valid configuration', () => {
      expect(() => new SupaSeedFramework(getTestConfig())).not.toThrow();
    });
  });

  describe('createDefaultConfig', () => {
    it('should create default configuration with overrides', () => {
      const config = createDefaultConfig({
        userCount: 20,
        enableRealImages: true,
      });

      expect(config.userCount).toBe(20);
      expect(config.enableRealImages).toBe(true);
      expect(config.setupsPerUser).toBe(3); // default value
    });

    it('should use environment variables when available', () => {
      const originalUrl = process.env.SUPABASE_URL;
      process.env.SUPABASE_URL = 'https://test.supabase.co';

      const config = createDefaultConfig();
      expect(config.supabaseUrl).toBe('https://test.supabase.co');

      // Restore original value
      if (originalUrl) {
        process.env.SUPABASE_URL = originalUrl;
      } else {
        delete process.env.SUPABASE_URL;
      }
    });
  });

  describe('Framework Methods', () => {
    let framework: SupaSeedFramework;

    beforeEach(() => {
      framework = new SupaSeedFramework(getTestConfig());
    });

    it('should have seed method', () => {
      expect(typeof framework.seed).toBe('function');
    });

    it('should have cleanup method', () => {
      expect(typeof framework.cleanup).toBe('function');
    });

    it('should have status method', () => {
      expect(typeof framework.status).toBe('function');
    });
  });
});