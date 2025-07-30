import { SeedModule, CachedUser } from '../core/types/types';
import { generateUsername, generateTestEmail } from '../../core/utils/auth-utils';
import { SchemaAdapter } from '../core/schema-adapter';
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
    try {
      // Initialize schema adapter with config override
      this.schemaAdapter = new SchemaAdapter(this.context.client, this.context.config);
      await this.schemaAdapter.detectSchema();

      // Initialize MakerKit compatibility layer
      await this.initializeMakerKitCompatibility();

      const users: CachedUser[] = [];
      let successfulUsers = 0;
      let failedUsers = 0;

      // NEW: Handle different user strategies (SUPASEED-001)
      const userStrategy = this.context.config.userStrategy || 'create-new';
      
      switch (userStrategy) {
        case 'use-existing':
          console.log('📋 Using existing users only...');
          const existingUsers = await this.useExistingUsers();
          users.push(...existingUsers);
          successfulUsers = existingUsers.length;
          console.log(`✅ Found ${existingUsers.length} existing users`);
          break;
          
        case 'hybrid':
          console.log('🔀 Using hybrid user strategy (existing + new)...');
          const hybridResult = await this.hybridUserStrategy();
          users.push(...hybridResult.allUsers);
          successfulUsers = hybridResult.totalCreated;
          console.log(`✅ Hybrid strategy: ${hybridResult.existing} existing + ${hybridResult.created} new = ${hybridResult.allUsers.length} total`);
          break;
          
        case 'create-new':
        default:
          // Original behavior - create standard test emails if enabled
          if (this.context.config.createStandardTestEmails) {
            try {
              const standardUsers = await this.createEnhancedStandardTestUsers();
              users.push(...standardUsers);
              successfulUsers += standardUsers.length;
            } catch (error: any) {
              console.log(`⚠️  Standard test user creation failed: ${error.message}`);
              console.log('   Continuing with regular user creation...');
              failedUsers++;
            }
          }
          
          // Create diverse generated users with error recovery
          console.log(`🔄 Creating ${this.context.config.userCount} users...`);
          for (let i = 0; i < this.context.config.userCount; i++) {
            try {
              const user = await this.createUser();
              if (user) {
                users.push(user);
                this.context.stats.usersCreated++;
                successfulUsers++;
              } else {
                failedUsers++;
              }
            } catch (error: any) {
              console.log(`⚠️  User ${i + 1} creation failed: ${error.message}`);
              failedUsers++;
              // Continue with next user instead of failing completely
            }
          }
          break;
      }
      
      // Report results
      console.log(`✅ User processing complete: ${successfulUsers} successful, ${failedUsers} failed`);
      
      // Cache users and compatibility info for other seeders (even if some failed)
      this.context.cache.set('users', users);
      this.context.cache.set('schemaAdapter', this.schemaAdapter);
      this.context.cache.set('makerkitCompatibility', this.makerkitCompatibility);
      
      // If no users were found/created at all, provide helpful guidance
      if (users.length === 0) {
        if (userStrategy === 'use-existing') {
          console.log('🚨 No existing users found matching criteria. This may cause cascade failures.');
          console.log('💡 Check your existingUsers configuration:');
          console.log('   1. Table name and filter criteria');
          console.log('   2. Database permissions');
          console.log('   3. Existing data in the specified table');
        } else {
          console.log('🚨 No users were created successfully. This may cause cascade failures.');
          console.log('💡 Check your schema configuration and column mappings.');
          console.log('   Other seeders will be skipped to prevent errors.');
        }
        // Set a flag to indicate no users were available
        this.context.cache.set('noUsersCreated', true);
      }
      
    } catch (error: any) {
      console.error('🚨 Critical error in user seeding:', error.message);
      console.log('💡 This may be due to schema incompatibility. Please check:');
      console.log('   1. Database connection');
      console.log('   2. Table permissions');
      console.log('   3. Column name mappings in config');
      
      // Set empty cache to prevent cascade failures
      this.context.cache.set('users', []);
      this.context.cache.set('noUsersCreated', true);
      throw error;
    }
  }

  /**
   * NEW: Use existing users only (SUPASEED-001)
   * Queries the database for existing users based on configuration
   */
  private async useExistingUsers(): Promise<CachedUser[]> {
    const existingConfig = this.context.config.existingUsers || {};
    const table = existingConfig.table || 'accounts';
    const filter = existingConfig.filter || { is_personal_account: true };
    const idField = existingConfig.idField || 'id';

    console.log(`🔍 Querying existing users from '${table}' table...`);
    console.log(`🔍 Filter criteria:`, filter);

    try {
      // Query existing users with the specified filter
      const query = this.context.client.from(table).select('*');
      
      // Apply filter criteria
      Object.entries(filter).forEach(([key, value]) => {
        query.eq(key, value);
      });

      const { data: existingUsers, error } = await query;

      if (error) {
        console.error(`❌ Error querying existing users:`, error);
        throw new Error(`Failed to query existing users from '${table}': ${error.message}`);
      }

      if (!existingUsers || existingUsers.length === 0) {
        console.log(`⚠️  No existing users found in '${table}' matching criteria`);
        return [];
      }

      // Convert database users to CachedUser format
      const cachedUsers: CachedUser[] = existingUsers.map((user: any) => {
        // Try common field mappings for email, name, username
        const email = user.email || user.email_address || user.user_email || `user-${user[idField]}@existing.test`;
        const name = user.name || user.display_name || user.full_name || user.username || `User ${user[idField]}`;
        const username = user.username || user.display_name || user.name || `user_${user[idField]}`;

        return {
          id: user[idField],
          email,
          username,
          name,
        };
      });

      console.log(`✅ Successfully loaded ${cachedUsers.length} existing users`);
      
      // Log sample of found users for verification
      if (cachedUsers.length > 0) {
        console.log('📋 Sample existing users:');
        cachedUsers.slice(0, 3).forEach(user => {
          console.log(`   • ${user.email} (${user.name})`);
        });
        if (cachedUsers.length > 3) {
          console.log(`   ... and ${cachedUsers.length - 3} more`);
        }
      }

      return cachedUsers;

    } catch (error: any) {
      console.error(`❌ Failed to load existing users:`, error.message);
      
      // Provide helpful debugging information
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log(`💡 Table '${table}' does not exist. Please check your configuration.`);
      } else if (error.message.includes('permission denied')) {
        console.log(`💡 Permission denied accessing '${table}'. Check your service role key permissions.`);
      } else if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log(`💡 One of the filter columns doesn't exist in '${table}'. Check your filter configuration.`);
      }
      
      throw error;
    }
  }

  /**
   * NEW: Hybrid user strategy - combine existing users with newly created ones (SUPASEED-001)
   */
  private async hybridUserStrategy(): Promise<{
    existing: number;
    created: number;
    totalCreated: number;
    allUsers: CachedUser[];
  }> {
    console.log('🔀 Starting hybrid user strategy...');

    // Step 1: Load existing users
    const existingUsers = await this.useExistingUsers();
    console.log(`📋 Found ${existingUsers.length} existing users`);

    // Step 2: Create additional users based on configuration
    const additionalConfig = this.context.config.additionalUsers || {};
    const additionalCount = additionalConfig.count || 7;
    const personas = additionalConfig.personas || ['casual_user', 'expert_user', 'content_creator', 'admin_user', 'power_user'];
    
    console.log(`🆕 Creating ${additionalCount} additional users with personas...`);
    
    const newUsers: CachedUser[] = [];
    let createdCount = 0;
    let failedCount = 0;

    for (let i = 0; i < additionalCount; i++) {
      try {
        // Create user with persona-based profile
        const persona = personas[i % personas.length];
        const user = await this.createPersonaUser(persona, i);
        
        if (user) {
          newUsers.push(user);
          createdCount++;
          this.context.stats.usersCreated++;
        } else {
          failedCount++;
        }
      } catch (error: any) {
        console.log(`⚠️  Persona user ${i + 1} (${personas[i % personas.length]}) creation failed: ${error.message}`);
        failedCount++;
      }
    }

    console.log(`✅ Additional user creation: ${createdCount} successful, ${failedCount} failed`);

    // Step 3: Combine existing and new users
    const allUsers = [...existingUsers, ...newUsers];
    
    // Step 4: Log summary for user visibility
    console.log('📊 Hybrid Strategy Summary:');
    console.log(`   • Existing users: ${existingUsers.length}`);
    console.log(`   • Newly created: ${createdCount}`);
    console.log(`   • Total available: ${allUsers.length}`);
    console.log(`   • Failed creations: ${failedCount}`);

    return {
      existing: existingUsers.length,
      created: createdCount,
      totalCreated: existingUsers.length + createdCount, // Total successful users
      allUsers
    };
  }

  /**
   * NEW: Create a user with persona-based characteristics (SUPASEED-001)
   */
  private async createPersonaUser(persona: string, index: number): Promise<CachedUser | null> {
    const { faker } = this.context;
    const domainConfig = getDomainConfig(this.context.config.domain);
    
    // Generate persona-specific characteristics
    const personaConfig = this.getPersonaConfig(persona);
    
    // Generate realistic profile based on persona
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${personaConfig.usernamePrefix}_${firstName.toLowerCase()}_${lastName.toLowerCase().slice(0, 3)}`;
    const email = `${username}@${this.context.config.emailDomain || 'supaseed.test'}`;
    const bio = this.generatePersonaBio(persona, personaConfig, domainConfig);
    const name = `${firstName} ${lastName}`;

    console.log(`  🎭 Creating ${persona}: ${email}`);
    
    try {
      // Use schema adapter to create user with appropriate strategy
      const result = await this.schemaAdapter.createUserForSchema({
        email,
        name,
        username,
        bio,
        picture_url: this.generateProfileImage(firstName, lastName),
      });

      if (!result.success) {
        console.log(`    ⚠️  ${persona} user creation failed: ${result.error}`);
        return null;
      }

      console.log(`    ✅ Created ${persona}: ${email}`);
      return {
        id: result.id,
        email,
        username,
        name,
      };
    } catch (error: any) {
      console.log(`    ⚠️  Unexpected error creating ${persona} user ${email}: ${error.message}`);
      return null;
    }
  }

  /**
   * NEW: Get persona-specific configuration (SUPASEED-001)
   */
  private getPersonaConfig(persona: string): {
    usernamePrefix: string;
    activities: string[];
    traits: string[];
    experience: string;
  } {
    const personaConfigs: Record<string, any> = {
      casual_user: {
        usernamePrefix: 'casual',
        activities: ['browsing', 'sharing', 'commenting'],
        traits: ['friendly', 'curious', 'social'],
        experience: 'beginner'
      },
      expert_user: {
        usernamePrefix: 'expert',
        activities: ['analyzing', 'teaching', 'mentoring', 'reviewing'],
        traits: ['knowledgeable', 'detailed', 'helpful'],
        experience: 'expert'
      },
      content_creator: {
        usernamePrefix: 'creator',
        activities: ['creating', 'publishing', 'sharing', 'storytelling'],
        traits: ['creative', 'engaging', 'prolific'],
        experience: 'intermediate'
      },
      admin_user: {
        usernamePrefix: 'admin',
        activities: ['managing', 'moderating', 'organizing'],
        traits: ['responsible', 'organized', 'fair'],
        experience: 'advanced'
      },
      power_user: {
        usernamePrefix: 'power',
        activities: ['optimizing', 'customizing', 'automating'],
        traits: ['efficient', 'technical', 'innovative'],
        experience: 'advanced'
      }
    };

    return personaConfigs[persona] || personaConfigs.casual_user;
  }

  /**
   * NEW: Generate persona-specific bio (SUPASEED-001)
   */
  private generatePersonaBio(persona: string, personaConfig: any, domainConfig: any): string {
    const { faker } = this.context;
    
    const activity = faker.helpers.arrayElement(personaConfig.activities) as string;
    const trait = faker.helpers.arrayElement(personaConfig.traits) as string;
    const location = faker.helpers.arrayElement(domainConfig.locations || ['the community', 'online', 'worldwide']) as string;
    
    const templates = [
      `${personaConfig.experience.charAt(0).toUpperCase() + personaConfig.experience.slice(1)} user passionate about ${activity}. Known for being ${trait}. Active in ${location}.`,
      `${trait.charAt(0).toUpperCase() + trait.slice(1)} ${persona.replace('_', ' ')} focused on ${activity}. Based in ${location}.`,
      `${personaConfig.experience.charAt(0).toUpperCase() + personaConfig.experience.slice(1)} level user specializing in ${activity}. ${trait.charAt(0).toUpperCase() + trait.slice(1)} and engaged.`
    ];
    
    return faker.helpers.arrayElement(templates);
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
    
    try {
      // Use schema adapter to create user with appropriate strategy
      const result = await this.schemaAdapter.createUserForSchema({
        email,
        name,
        username,
        bio,
        picture_url: this.generateProfileImage(firstName, lastName),
      });

      if (!result.success) {
        // Provide detailed error information for debugging
        const errorInfo = result.error || 'Unknown error';
        console.log(`    ⚠️  User creation failed for ${email}: ${errorInfo}`);
        
        // Check if it's a column mapping issue
        if (errorInfo.includes('column') && errorInfo.includes('does not exist')) {
          console.log(`    💡 This appears to be a column mapping issue. Check your schema configuration.`);
        }
        
        return null;
      }

      return {
        id: result.id,
        email,
        username,
        name,
      };
    } catch (error: any) {
      console.log(`    ⚠️  Unexpected error creating user ${email}: ${error.message}`);
      return null;
    }
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