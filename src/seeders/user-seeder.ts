import { SeedModule, CachedUser } from '../types';
import { generateUsername, generateTestEmail } from '../utils/auth-utils';
import { SchemaAdapter } from '../schema-adapter';
import { getDomainConfig } from '../domains';
import { 
  MakerKitCompatibilityLayer, 
  MakerKitCompatibilityConfig,
  StandardTestUser 
} from '../compatibility/makerkit-compatibility';

export class UserSeeder extends SeedModule {
  private schemaAdapter!: SchemaAdapter;
  private makerkitCompatibility!: MakerKitCompatibilityLayer;

  async seed(): Promise<void> {
    // Initialize schema adapter with config override
    this.schemaAdapter = new SchemaAdapter(this.context.client, this.context.config);
    await this.schemaAdapter.detectSchema();

    // Initialize MakerKit compatibility layer
    await this.initializeMakerKitCompatibility();

    const users: CachedUser[] = [];
    
    // Create standard MakerKit test emails if enabled (enhanced)
    if (this.context.config.createStandardTestEmails) {
      const standardUsers = await this.createEnhancedStandardTestUsers();
      users.push(...standardUsers);
    }
    
    // Create diverse generated users
    for (let i = 0; i < this.context.config.userCount; i++) {
      const user = await this.createUser();
      if (user) {
        users.push(user);
        this.context.stats.usersCreated++;
      }
    }
    
    // Cache users and compatibility info for other seeders
    this.context.cache.set('users', users);
    this.context.cache.set('schemaAdapter', this.schemaAdapter);
    this.context.cache.set('makerkitCompatibility', this.makerkitCompatibility);
  }

  /**
   * Initialize enhanced MakerKit compatibility layer
   */
  private async initializeMakerKitCompatibility(): Promise<void> {
    // Build compatibility config from context
    const compatibilityConfig: MakerKitCompatibilityConfig = {
      standardTestUsers: this.context.config.createStandardTestEmails || false,
      customTestEmails: this.context.config.customTestEmails || [],
      preserveAuthFlow: true,
      preserveRLS: true,
      makerkitVersion: 'auto', // Auto-detect from schema
      teamAccountCreation: this.context.config.createTeamAccounts ?? true,
      personalAccountCreation: true,
      roleHierarchy: true,
      subscriptionSupport: true,
      notificationSystem: true,
      overrides: {
        primaryUserTable: this.context.config.schema?.primaryUserTable,
        testUserPasswords: {
          default: this.context.config.testUserPassword || 'password123'
        }
      }
    };

    this.makerkitCompatibility = new MakerKitCompatibilityLayer(
      this.context.client,
      compatibilityConfig,
      this.schemaAdapter
    );

    // Initialize and validate compatibility
    const validation = await this.makerkitCompatibility.initialize();
    
    // Log compatibility status
    console.log(`🔧 MakerKit compatibility: ${validation.compatibility}`);
    console.log(`📋 Detected version: ${validation.detectedVersion}`);
    
    if (validation.issues.length > 0) {
      console.log('⚠️  Compatibility issues:');
      validation.issues.forEach(issue => console.log(`    • ${issue}`));
    }
    
    if (validation.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      validation.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
  }

  /**
   * Create enhanced standard test users using MakerKit compatibility layer
   */
  private async createEnhancedStandardTestUsers(): Promise<CachedUser[]> {
    console.log('🧪 Creating enhanced MakerKit test users...');
    
    // Use the compatibility layer to create users with proper MakerKit integration
    const result = await this.makerkitCompatibility.createStandardTestUsers();
    
    // Convert StandardTestUser[] to CachedUser[] format
    const cachedUsers: CachedUser[] = result.created.map(user => ({
      id: crypto.randomUUID(), // This will be updated with actual ID from database
      email: user.email,
      username: user.username,
      name: user.name,
    }));

    // Update stats
    this.context.stats.usersCreated += result.created.length;
    
    // Log any failures
    if (result.failed.length > 0) {
      console.log('⚠️  Some users failed to create:');
      result.failed.forEach(failure => {
        console.log(`    • ${failure.user.email}: ${failure.error}`);
      });
    }

    console.log(`✅ Enhanced MakerKit users created: ${result.created.length}/${result.created.length + result.failed.length}`);
    return cachedUsers;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use createEnhancedStandardTestUsers instead
   */
  private async createStandardTestUsers(): Promise<CachedUser[]> {
    console.log('🧪 Creating standard MakerKit test users (legacy mode)...');
    
    const standardTestEmails = [
      { email: 'test@makerkit.dev', name: 'Test User', username: 'test_user', role: 'admin' },
      { email: 'custom@makerkit.dev', name: 'Custom User', username: 'custom_user', role: 'custom' },
      { email: 'owner@makerkit.dev', name: 'Owner User', username: 'owner_user', role: 'owner' },
      { email: 'member@makerkit.dev', name: 'Member User', username: 'member_user', role: 'member' },
      { email: 'super-admin@makerkit.dev', name: 'Super Admin', username: 'super_admin', role: 'super-admin' },
    ];

    const createdUsers: CachedUser[] = [];
    
    for (const testUser of standardTestEmails) {
      console.log(`  Creating: ${testUser.email}`);
      
      const bio = `Standard MakerKit test user with ${testUser.role} role for testing purposes.`;
      
      const result = await this.schemaAdapter.createUserForSchema({
        email: testUser.email,
        name: testUser.name,
        username: testUser.username,
        bio,
        picture_url: this.generateProfileImage(testUser.name.split(' ')[0], testUser.name.split(' ')[1] || 'User'),
      });

      if (result.success) {
        createdUsers.push({
          id: result.id,
          email: testUser.email,
          username: testUser.username,
          name: testUser.name,
        });
        this.context.stats.usersCreated++;
        console.log(`  ✅ Created: ${testUser.email}`);
      } else {
        console.log(`  ⚠️  Failed to create ${testUser.email}: ${result.error}`);
      }
    }
    
    console.log(`✅ Created ${createdUsers.length} standard test users`);
    return createdUsers;
  }

  private async createUser(): Promise<CachedUser | null> {
    const { faker } = this.context;
    const domainConfig = getDomainConfig(this.context.config.domain);
    
    // Generate realistic profile based on domain
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = generateUsername(firstName, lastName, domainConfig.usernameSuffixes);
    const email = generateTestEmail(username, this.context.config.emailDomain);
    const bio = this.generateUserBio(domainConfig);
    const name = `${firstName} ${lastName}`;
    
    // Use schema adapter to create user with appropriate strategy
    const result = await this.schemaAdapter.createUserForSchema({
      email,
      name,
      username,
      bio,
      picture_url: this.generateProfileImage(firstName, lastName),
    });

    if (!result.success) {
      this.logWarning('User creation', `Failed to create user ${email}: ${result.error}`);
      return null;
    }

    return {
      id: result.id,
      email,
      username,
      name,
    };
  }

  private generateUserBio(domainConfig: any): string {
    const { faker } = this.context;
    
    const activities = domainConfig.activities || ['working', 'creating', 'building', 'learning'];
    const locations = domainConfig.locations || ['the city', 'remote', 'downtown', 'worldwide'];
    const templates = domainConfig.bioTemplates || [
      'Passionate about {activity}. Based in {location}.',
      'Professional focusing on {activity}. Located in {location}.'
    ];
    
    // Select random template and fill in placeholders
    let bio: string = faker.helpers.arrayElement(templates);
    bio = bio.replace('{activity}', faker.helpers.arrayElement(activities));
    bio = bio.replace('{location}', faker.helpers.arrayElement(locations));
    
    return bio;
  }

  /**
   * Legacy function for backward compatibility
   * @deprecated Use generateUserBio instead
   */
  private generateOutdoorBio(): string {
    const { faker } = this.context;
    const activities = [
      'hiking', 'backpacking', 'camping', 'overlanding', 'rock climbing',
      'mountaineering', 'van life', 'car camping', 'ultralight backpacking',
      'bushcraft', 'photography', 'wildlife watching'
    ];
    const locations = [
      'Pacific Northwest', 'Colorado Rockies', 'California Sierra',
      'Appalachian Mountains', 'Utah desert', 'Alaska wilderness',
      'Canadian Rockies', 'Cascade Range', 'Great Smoky Mountains'
    ];
    const templates = [
      `Passionate ${faker.helpers.arrayElements(activities, 2).join(' and ')} enthusiast. Love exploring the ${faker.helpers.arrayElement(locations)}.`,
      `Weekend warrior with a passion for ${faker.helpers.arrayElement(activities)}. Always planning the next adventure!`,
      `${faker.helpers.arrayElement(activities)} addict from the ${faker.helpers.arrayElement(locations)}. Sharing my gear setups and trail stories.`,
      `Outdoor photographer and ${faker.helpers.arrayElement(activities)} enthusiast. ${faker.helpers.arrayElement(['Based in', 'Exploring', 'Living in'])} the ${faker.helpers.arrayElement(locations)}.`,
    ];
    return faker.helpers.arrayElement(templates);
  }

  private generateProfileImage(firstName: string, lastName: string): string {
    // Use a service like RoboHash or UI Avatars for consistent profile images
    const initial = `${firstName[0]}${lastName[0]}`.toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName + '+' + lastName)}&background=random&bold=true&size=200`;
  }
} 