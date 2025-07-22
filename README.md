# 🌱 Supa Seed

A modern TypeScript-based database seeding framework for Supabase projects that generates realistic, contextual test data with smart image management.

## Features

- **🎯 Realistic Fake Data**: Uses Faker.js to generate contextual user profiles and content
- **🖼️ Smart Image Management**: Handles image generation/download with Supabase Storage integration
- **🔄 Dependency-Aware**: Automatically manages data dependencies and execution order
- **🎛️ Configurable**: Multiple seeding profiles for different scenarios
- **🧹 Clean-up Support**: Easy removal of seed data
- **📊 Progress Tracking**: Real-time feedback and statistics
- **🔒 Type-Safe**: Full TypeScript support with Supabase types
- **📦 CLI & Library**: Use as command-line tool or import as library

## Installation

```bash
# Global installation for CLI usage
npm install -g supa-seed

# Or install as dev dependency in your project
npm install --save-dev supa-seed
```

## Quick Start

### 1. Environment Setup

Create a `.env` file or set environment variables:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional: for real images
UNSPLASH_ACCESS_KEY=your-unsplash-key
```

### 2. Initialize Configuration

```bash
# Create a configuration file
supa-seed init

# Or with custom path
supa-seed init --config-file my-config.json
```

### 3. Start Seeding

```bash
# Basic seeding (10 users, 3 setups each)
supa-seed seed

# Minimal data for quick testing
supa-seed seed --users 3 --setups 1 --images 1

# Comprehensive data for demos
supa-seed seed --users 25 --setups 5 --images 5

# With real images from Unsplash
supa-seed seed --real-images
```

### 4. Check Status & Cleanup

```bash
# Check what data exists
supa-seed status

# Clean up all seed data
supa-seed cleanup --force
```

## Usage

### CLI Usage

```bash
# Seed with custom parameters
supa-seed seed \
  --users 15 \
  --setups 4 \
  --images 3 \
  --real-images \
  --env production

# Initialize with custom config
supa-seed init --config-file production.config.json

# Clean up everything
supa-seed cleanup --force

# Check current status
supa-seed status
```

### Library Usage

```typescript
import { SupaSeedFramework, createDefaultConfig } from 'supa-seed';

// Basic usage
const config = createDefaultConfig({
  userCount: 10,
  setupsPerUser: 3,
  imagesPerSetup: 2,
  enableRealImages: false,
});

const seeder = new SupaSeedFramework(config);

// Seed data
await seeder.seed();

// Check status
await seeder.status();

// Clean up
await seeder.cleanup();
```

### Custom Seeders

```typescript
import { SeedModule, SeedContext } from 'supa-seed';

export class CustomSeeder extends SeedModule {
  async seed(): Promise<void> {
    const { client, faker } = this.context;
    
    // Your custom seeding logic
    await client.from('my_table').insert({
      name: faker.person.fullName(),
      email: faker.internet.email(),
    });
  }
}
```

## Configuration

### Configuration File Structure

```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-service-role-key",
  "environment": "local",
  "userCount": 10,
  "setupsPerUser": 3,
  "imagesPerSetup": 2,
  "enableRealImages": false,
  "seed": "supa-seed-2025"
}
```

### Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (required)
- `UNSPLASH_ACCESS_KEY` - Unsplash API key (optional, for real images)
- `NODE_ENV` - Environment (`local`|`staging`|`production`)

## Built-in Seeders

The framework includes several pre-built seeders:

1. **AuthSeeder** - Sets up authentication and basic users
2. **BaseDataSeeder** - Creates foundational data and categories  
3. **UserSeeder** - Generates realistic user profiles
4. **GearSeeder** - Seeds professional gear database with real items
5. **SetupSeeder** - Creates contextual gear configurations
6. **MediaSeeder** - Handles image generation and upload

## Database Schema Requirements

Supa Seed expects certain tables to exist in your Supabase database:

### Required Tables

```sql
-- Users/Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  username VARCHAR UNIQUE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories for organizing data
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  description TEXT
);

-- Main content/setup table
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR NOT NULL,
  description TEXT,
  category VARCHAR,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Optional Tables

```sql
-- For gear/item management
CREATE TABLE gear_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id),
  make VARCHAR,
  model VARCHAR,
  price DECIMAL,
  weight VARCHAR,
  description TEXT
);

-- For item associations
CREATE TABLE setup_items (
  setup_id UUID REFERENCES setups(id) ON DELETE CASCADE,
  gear_item_id UUID REFERENCES gear_items(id),
  quantity INTEGER DEFAULT 1,
  notes TEXT,
  PRIMARY KEY (setup_id, gear_item_id)
);
```

## Image Management

### Placeholder Images

By default, Supa Seed generates colored placeholder images:

```typescript
const config = createDefaultConfig({
  enableRealImages: false,  // Use placeholders
  imagesPerSetup: 3,
});
```

### Real Images (Unsplash)

Enable real images with an Unsplash API key:

```bash
export UNSPLASH_ACCESS_KEY=your-api-key
```

```typescript
const config = createDefaultConfig({
  enableRealImages: true,   // Use real images
  imagesPerSetup: 3,
});
```

### Custom Image Sources

Extend the MediaSeeder for custom image sources:

```typescript
import { MediaSeeder } from 'supa-seed';

export class CustomMediaSeeder extends MediaSeeder {
  async generateImage(category: string): Promise<Buffer> {
    // Your custom image generation logic
    // Could integrate with DALL-E, Midjourney, local files, etc.
  }
}
```

## Examples

### Basic E-commerce Seeding

```typescript
import { SupaSeedFramework, createDefaultConfig } from 'supa-seed';

const config = createDefaultConfig({
  userCount: 50,
  setupsPerUser: 5,
  imagesPerSetup: 4,
  enableRealImages: true,
  seed: 'ecommerce-demo-2025',
});

const seeder = new SupaSeedFramework(config);
await seeder.seed();
```

### Development Environment

```typescript
// Quick setup for development
const devConfig = createDefaultConfig({
  userCount: 5,
  setupsPerUser: 2,  
  imagesPerSetup: 1,
  enableRealImages: false,
});

const seeder = new SupaSeedFramework(devConfig);
await seeder.seed();
```

### Production Demo Data

```typescript
// High-quality demo data
const demoConfig = createDefaultConfig({
  userCount: 25,
  setupsPerUser: 4,
  imagesPerSetup: 5,
  enableRealImages: true,
  environment: 'production',
});

const seeder = new SupaSeedFramework(demoConfig);
await seeder.seed();
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report bugs](https://github.com/livebydesign2/supa-seed/issues)
- 💡 [Request features](https://github.com/livebydesign2/supa-seed/issues)
- 📖 [Documentation](https://github.com/livebydesign2/supa-seed#readme)

---

Made with ❤️ for the Supabase community 