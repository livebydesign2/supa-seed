import { SeedModule, CachedUser } from '../types';
import { generateOutdoorUsername, generateTestEmail } from '../utils/auth-utils';
import { SchemaAdapter } from '../schema-adapter';

export class UserSeeder extends SeedModule {
  private schemaAdapter!: SchemaAdapter;

  async seed(): Promise<void> {
    // Initialize schema adapter with config override
    this.schemaAdapter = new SchemaAdapter(this.context.client, this.context.config);
    await this.schemaAdapter.detectSchema();

    const users: CachedUser[] = [];
    
    // Create diverse outdoor enthusiasts
    for (let i = 0; i < this.context.config.userCount; i++) {
      const user = await this.createUser();
      if (user) {
        users.push(user);
        this.context.stats.usersCreated++;
      }
    }
    
    // Cache users for other seeders
    this.context.cache.set('users', users);
    this.context.cache.set('schemaAdapter', this.schemaAdapter);
  }

  private async createUser(): Promise<CachedUser | null> {
    const { faker } = this.context;
    
    // Generate realistic outdoor enthusiast profile
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = generateOutdoorUsername(firstName, lastName);
    const email = generateTestEmail(username, this.context.config.emailDomain);
    const bio = this.generateOutdoorBio();
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