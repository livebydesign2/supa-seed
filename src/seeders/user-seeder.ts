import { SeedModule, CachedUser } from '../types';
import { generateOutdoorUsername, generateTestEmail } from '../utils/auth-utils';

export class UserSeeder extends SeedModule {
  async seed(): Promise<void> {
    const users: CachedUser[] = [];
    
    // Create diverse outdoor enthusiasts
    for (let i = 0; i < this.context.config.userCount; i++) {
      const user = await this.createUser();
      users.push(user);
      this.context.stats.usersCreated++;
    }
    
    // Cache users for other seeders
    this.context.cache.set('users', users);
  }

  private async createUser(): Promise<CachedUser> {
    const { faker, client } = this.context;
    
    // Generate realistic outdoor enthusiast profile
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = generateOutdoorUsername(firstName, lastName);
    const email = generateTestEmail(username);
    const bio = this.generateOutdoorBio();
    
    // Create auth user first
    const userId = faker.string.uuid();
    
    const { error: authError } = await client.auth.admin.createUser({
      id: userId,
      email,
      password: 'password',
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        username,
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    // Create account profile
    const { data: account, error: accountError } = await client
      .from('accounts')
      .insert({
        id: userId,
        email,
        name: `${firstName} ${lastName}`,
        username,
        bio,
        picture_url: this.generateProfileImage(firstName, lastName),
        created_at: faker.date.past({ years: 2 }).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (accountError) {
      throw new Error(`Failed to create account: ${accountError.message}`);
    }

    return {
      id: userId,
      email,
      username,
      name: `${firstName} ${lastName}`,
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