/**
 * Test suite for MakerKit Compatibility Layer
 * Phase 1, Checkpoint A2 validation
 */

import { 
  MakerKitCompatibilityLayer, 
  MakerKitCompatibilityConfig,
  StandardTestUser,
  MakerKitValidationResult
} from '../src/features/integration/makerkit-compatibility';
import { SchemaAdapter } from '../src/core/schema-adapter';

// Mock Logger
jest.mock('../src/core/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Supabase client for testing
const mockClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue({ error: null, data: [] }),
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ error: null, data: { id: 'test-id', primary_owner_user_id: 'user-id' } })
        })
      })
    }),
    insert: jest.fn().mockResolvedValue({ error: null, data: [{ id: 'test-id' }] })
  }),
  auth: {
    admin: {
      createUser: jest.fn().mockResolvedValue({ error: null, data: { user: { id: 'user-id' } } }),
      listUsers: jest.fn().mockResolvedValue({ error: null, data: [] })
    }
  }
} as any;

describe('MakerKit Compatibility Layer', () => {
  let compatibilityLayer: MakerKitCompatibilityLayer;
  let mockSchemaAdapter: SchemaAdapter;

  const defaultConfig: MakerKitCompatibilityConfig = {
    standardTestUsers: true,
    preserveAuthFlow: true,
    preserveRLS: true,
    makerkitVersion: 'v3',
    teamAccountCreation: true,
    personalAccountCreation: true,
    roleHierarchy: true,
    subscriptionSupport: true,
    notificationSystem: true
  };

  beforeEach(() => {
    mockSchemaAdapter = new SchemaAdapter(mockClient);
    compatibilityLayer = new MakerKitCompatibilityLayer(mockClient, defaultConfig, mockSchemaAdapter);
    jest.clearAllMocks();
  });

  describe('Initialization and Validation', () => {
    test('should initialize successfully with valid MakerKit schema', async () => {
      // Mock schema detection to return MakerKit v3
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: true,
        hasSetups: false,
        hasCategories: false,
        hasTeams: true,
        hasOrganizations: false,
        accountsTableStructure: 'makerkit',
        primaryUserTable: 'accounts',
        makerkitVersion: 'v3',
        customTables: ['notifications', 'invitations'],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: true,
          supportsMarkdown: true,
          supportsJson: true,
          contentTables: ['posts'],
          userContentRelationships: [],
          mediaStoragePattern: 'supabase_storage'
        },
        frameworkType: 'makerkit'
      });

      const result = await compatibilityLayer.initialize();

      expect(result.isValid).toBe(true);
      expect(result.compatibility).toBe('full');
      expect(result.detectedVersion).toBe('v3');
      expect(result.issues).toHaveLength(0);
    });

    test('should detect compatibility issues with incomplete schema', async () => {
      // Mock schema detection to return incomplete schema
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: false, // Missing accounts table
        hasUsers: true,
        hasProfiles: false,
        hasSetups: false,
        hasCategories: false,
        hasTeams: false,
        hasOrganizations: false,
        accountsTableStructure: 'simple',
        primaryUserTable: 'users',
        makerkitVersion: 'none',
        customTables: [],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: false,
          supportsMarkdown: false,
          supportsJson: true,
          contentTables: [],
          userContentRelationships: [],
          mediaStoragePattern: 'url_only'
        },
        frameworkType: 'simple'
      });

      const result = await compatibilityLayer.initialize();

      expect(result.isValid).toBe(false);
      expect(result.compatibility).toBe('partial');
      expect(result.detectedVersion).toBe('none');
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues).toContain('No accounts table found but standard test users requested');
    });

    test('should auto-configure version when set to auto', async () => {
      const autoConfig = { ...defaultConfig, makerkitVersion: 'auto' as any };
      const autoCompatibilityLayer = new MakerKitCompatibilityLayer(mockClient, autoConfig, mockSchemaAdapter);

      // Mock schema detection
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: true,
        hasSetups: false,
        hasCategories: false,
        hasTeams: true,
        hasOrganizations: false,
        accountsTableStructure: 'makerkit',
        primaryUserTable: 'accounts',
        makerkitVersion: 'v2',
        customTables: ['subscriptions'],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: true,
          supportsMarkdown: true,
          supportsJson: true,
          contentTables: [],
          userContentRelationships: [],
          mediaStoragePattern: 'supabase_storage'
        },
        frameworkType: 'makerkit'
      });

      const result = await autoCompatibilityLayer.initialize();

      expect(result.detectedVersion).toBe('v2');
      expect(result.compatibility).toBe('full');
    });
  });

  describe('Standard Test Users', () => {
    beforeEach(async () => {
      // Mock successful schema detection
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: true,
        hasSetups: false,
        hasCategories: false,
        hasTeams: true,
        hasOrganizations: false,
        accountsTableStructure: 'makerkit',
        primaryUserTable: 'accounts',
        makerkitVersion: 'v3',
        customTables: [],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: true,
          supportsMarkdown: true,
          supportsJson: true,
          contentTables: [],
          userContentRelationships: [],
          mediaStoragePattern: 'supabase_storage'
        },
        frameworkType: 'makerkit'
      });
      
      await compatibilityLayer.initialize();
    });

    test('should generate standard MakerKit test users', () => {
      const users = compatibilityLayer.getStandardTestUsers();

      expect(users).toHaveLength(5); // 5 standard MakerKit users
      
      const expectedEmails = [
        'test@makerkit.dev',
        'owner@makerkit.dev', 
        'member@makerkit.dev',
        'custom@makerkit.dev',
        'super-admin@makerkit.dev'
      ];

      expectedEmails.forEach(email => {
        const user = users.find(u => u.email === email);
        expect(user).toBeDefined();
        expect(user?.name).toBeDefined();
        expect(user?.username).toBeDefined();
        expect(user?.role).toBeDefined();
        expect(user?.password).toBe('password123'); // Default password
        expect(user?.metadata?.isTestUser).toBe(true);
      });
    });

    test('should include custom test emails when configured', () => {
      const configWithCustomEmails = {
        ...defaultConfig,
        customTestEmails: ['demo@mycompany.com', 'staging@mycompany.com']
      };

      const customCompatibilityLayer = new MakerKitCompatibilityLayer(
        mockClient, 
        configWithCustomEmails, 
        mockSchemaAdapter
      );

      const users = customCompatibilityLayer.getStandardTestUsers();

      expect(users).toHaveLength(7); // 5 standard + 2 custom
      expect(users.find(u => u.email === 'demo@mycompany.com')).toBeDefined();
      expect(users.find(u => u.email === 'staging@mycompany.com')).toBeDefined();
    });

    test('should create standard test users successfully', async () => {
      // Mock successful user creation
      mockClient.auth.admin.createUser.mockResolvedValue({ 
        error: null, 
        data: { user: { id: 'user-id' } } 
      });

      const result = await compatibilityLayer.createStandardTestUsers();

      expect(result.created).toHaveLength(5);
      expect(result.failed).toHaveLength(0);
      
      // Verify auth.admin.createUser was called for each user
      expect(mockClient.auth.admin.createUser).toHaveBeenCalledTimes(5);
      
      // Verify each user has proper metadata
      result.created.forEach(user => {
        expect(user.metadata?.isTestUser).toBe(true);
        expect(user.metadata?.createdBy).toBe('supa-seed-makerkit-compatibility');
      });
    });

    test('should handle user creation failures gracefully', async () => {
      // Mock auth error for one user
      mockClient.auth.admin.createUser
        .mockResolvedValueOnce({ error: null, data: { user: { id: 'user-1' } } })
        .mockResolvedValueOnce({ error: { message: 'Email already exists' }, data: null })
        .mockResolvedValueOnce({ error: null, data: { user: { id: 'user-3' } } })
        .mockResolvedValueOnce({ error: null, data: { user: { id: 'user-4' } } })
        .mockResolvedValueOnce({ error: null, data: { user: { id: 'user-5' } } });

      const result = await compatibilityLayer.createStandardTestUsers();

      expect(result.created).toHaveLength(4);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('Email already exists');
    });
  });

  describe('User Role Management', () => {
    test('should generate appropriate bio for each role', async () => {
      await compatibilityLayer.initialize();
      const users = compatibilityLayer.getStandardTestUsers();

      const adminUser = users.find(u => u.role === 'admin');
      const ownerUser = users.find(u => u.role === 'owner');
      const memberUser = users.find(u => u.role === 'member');

      expect(adminUser).toBeDefined();
      expect(ownerUser).toBeDefined();
      expect(memberUser).toBeDefined();

      // Verify role-specific metadata
      expect(adminUser?.metadata?.role).toBe('admin');
      expect(ownerUser?.metadata?.canCreateTeams).toBe(true);
      expect(memberUser?.metadata?.role).toBe('member');
    });

    test('should use custom passwords when configured', () => {
      const configWithCustomPasswords = {
        ...defaultConfig,
        overrides: {
          testUserPasswords: {
            default: 'custom123',
            perUser: {
              'test@makerkit.dev': 'special-password'
            }
          }
        }
      };

      const customCompatibilityLayer = new MakerKitCompatibilityLayer(
        mockClient,
        configWithCustomPasswords,
        mockSchemaAdapter
      );

      const users = customCompatibilityLayer.getStandardTestUsers();
      
      const testUser = users.find(u => u.email === 'test@makerkit.dev');
      const ownerUser = users.find(u => u.email === 'owner@makerkit.dev');

      expect(testUser?.password).toBe('special-password'); // Per-user override
      expect(ownerUser?.password).toBe('custom123'); // Default override
    });
  });

  describe('Compatibility Information', () => {
    test('should provide comprehensive compatibility info', async () => {
      // Mock schema detection
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: true,
        hasSetups: true,
        hasCategories: false,
        hasTeams: true,
        hasOrganizations: false,
        accountsTableStructure: 'makerkit',
        primaryUserTable: 'accounts',
        makerkitVersion: 'v3',
        customTables: ['gear', 'base_templates'],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: true,
          supportsMarkdown: true,
          supportsJson: true,
          contentTables: ['posts', 'setups'],
          userContentRelationships: [],
          mediaStoragePattern: 'supabase_storage'
        },
        frameworkType: 'wildernest'
      });

      await compatibilityLayer.initialize();
      const info = compatibilityLayer.getCompatibilityInfo();

      expect(info.detectedVersion).toBe('v3');
      expect(info.supportedFeatures).toContain('Standard test users');
      expect(info.supportedFeatures).toContain('Team accounts');
      expect(info.supportedFeatures).toContain('Role hierarchy');
      expect(info.recommendedSettings.teamAccountCreation).toBe(true);
      expect(info.recommendedSettings.roleHierarchy).toBe(true);
    });

    test('should identify limitations for older MakerKit versions', async () => {
      // Mock v1 detection
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: false,
        hasSetups: false,
        hasCategories: false,
        hasTeams: false,
        hasOrganizations: false,
        accountsTableStructure: 'makerkit', 
        primaryUserTable: 'accounts',
        makerkitVersion: 'v1',
        customTables: [],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: false,
          supportsMarkdown: false,
          supportsJson: true,
          contentTables: [],
          userContentRelationships: [],
          mediaStoragePattern: 'url_only'
        },
        frameworkType: 'makerkit'
      });

      await compatibilityLayer.initialize();
      const info = compatibilityLayer.getCompatibilityInfo();

      expect(info.detectedVersion).toBe('v1');
      expect(info.limitations).toContain('Limited team account support');
      expect(info.limitations).toContain('Basic role system only');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with existing configurations', async () => {
      // Test that the layer works with minimal configuration
      const minimalConfig: MakerKitCompatibilityConfig = {
        standardTestUsers: true,
        preserveAuthFlow: true,
        preserveRLS: true,
        teamAccountCreation: false,
        personalAccountCreation: true,
        roleHierarchy: false,
        subscriptionSupport: false,
        notificationSystem: false
      };

      const minimalCompatibilityLayer = new MakerKitCompatibilityLayer(
        mockClient,
        minimalConfig,
        mockSchemaAdapter
      );

      // Mock simple schema
      jest.spyOn(mockSchemaAdapter, 'detectSchema').mockResolvedValue({
        hasAccounts: true,
        hasUsers: true,
        hasProfiles: false,
        hasSetups: false,
        hasCategories: false,
        hasTeams: false,
        hasOrganizations: false,
        accountsTableStructure: 'simple',
        primaryUserTable: 'accounts',
        makerkitVersion: 'none',
        customTables: [],
        detectedRelationships: [],
        assetCompatibility: {
          supportsImages: false,
          supportsMarkdown: false,
          supportsJson: true,
          contentTables: [],
          userContentRelationships: [],
          mediaStoragePattern: 'url_only'
        },
        frameworkType: 'simple'
      });

      const result = await minimalCompatibilityLayer.initialize();
      
      expect(result.compatibility).toBe('custom');
      expect(result.detectedVersion).toBe('none');
      
      const users = minimalCompatibilityLayer.getStandardTestUsers();
      expect(users).toHaveLength(5); // Should still create standard users
    });
  });
});