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
- **⚡ Robust Error Handling**: Automatic retry logic, graceful degradation, and comprehensive error reporting
- **🛡️ Configuration Validation**: Built-in validation for environment variables and configuration
- **🧪 Test Suite**: Comprehensive test coverage with Jest for reliability
- **📋 Schema Management**: Complete SQL schema files for easy database setup
- **🗄️ Schema Detection**: Automatic detection and adaptation to existing database schemas (Makerkit, custom profiles, etc.)
- **⚙️ Configuration Override**: Force specific schema patterns and table mappings via configuration
- **🔧 Flexible Field Mapping**: Support for different field names across various schema patterns

## Installation

```bash
# Global installation for CLI usage
npm install -g supa-seed

# Or install as dev dependency in your project
npm install --save-dev supa-seed
```

## Quick Start

### 1. Database Schema Setup

First, set up your database schema using one of the provided SQL files:

```bash
# For complete setup with all optional tables
psql -h localhost -U postgres -d your_database -f schema.sql

# For minimal setup with only required tables
psql -h localhost -U postgres -d your_database -f schema-minimal.sql
```

Or apply directly in your Supabase Dashboard's SQL editor.

### 2. Environment Setup

Create a `.env` file or set environment variables:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional: for real images
UNSPLASH_ACCESS_KEY=your-unsplash-key
```

Copy `.env.example` to `.env` and fill in your values.

### 3. Initialize Configuration

```bash
# Create a configuration file
supa-seed init

# Or with custom path
supa-seed init --config-file my-config.json
```

### 4. Start Seeding

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

### 5. Check Status & Cleanup

```bash
# Check what data exists
supa-seed status

# Clean up all seed data
supa-seed cleanup --force
```

## Testing & Development

### Running Tests

```bash
# Run the test suite
npm test

# Run tests in watch mode during development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/livebydesign2/supa-seed.git
cd supa-seed

# Install dependencies
npm install

# Build the project
npm run build

# Run development build (watches for changes)
npm run dev
```

## Error Handling & Reliability

Supa Seed includes comprehensive error handling to ensure reliable operation:

- **🔄 Automatic Retry Logic**: Failed operations are automatically retried with exponential backoff
- **🛡️ Table Validation**: Checks if required tables exist before attempting operations
- **⚠️ Graceful Degradation**: Continues with available functionality when optional features fail
- **📝 Detailed Logging**: Comprehensive error reporting with context and suggestions
- **🔍 Connection Monitoring**: Database health checks and connection validation
- **🗄️ Schema Detection**: Automatically detects and adapts to different database schemas

### Common Error Scenarios

The framework automatically handles:
- Missing database tables (skips gracefully)
- Schema mismatches (detects and adapts)
- Network connection issues (retries automatically)
- Permission errors (provides clear feedback)
- Rate limiting (backs off and retries)
- Invalid configurations (validates before execution)

### Troubleshooting Schema Issues

**"No user tables detected" Warning:**
```bash
⚠️  No user tables detected. You may need to:
   1. Run the schema.sql file to create required tables
   2. Or ensure your custom schema is compatible
   3. Check your database permissions
```
**Solution:** Apply schema.sql or ensure your database has user tables (accounts/profiles)

**"Database connection failed":**
```bash
❌ Database connection failed: [error details]
```
**Solution:** Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables

**"Permission denied" Errors:**
```bash
❌ Database permissions error. Please ensure your SUPABASE_SERVICE_ROLE_KEY has permissions to:
  • Create auth users (admin.createUser)
  • Insert into user tables (accounts/profiles)  
  • Access table schemas
```
**Solution:** Use the service role key (not anon key) and ensure RLS policies allow service role access

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
    
    // Check if table exists before seeding
    if (!(await this.checkTableExists('my_table'))) {
      console.log('⚠️  Table my_table not found, skipping...');
      return;
    }
    
    // Your custom seeding logic with error handling
    const result = await this.executeWithRetry(async () => {
      return await client.from('my_table').insert({
        name: faker.person.fullName(),
        email: faker.internet.email(),
      });
    });
    
    if (!result) {
      this.logWarning('Custom seeding', 'Failed to insert data after retries');
    }
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
  "seed": "supa-seed-2025",
  "emailDomain": "supaseed.test"
}
```

### Advanced Configuration with Schema Override

For complex schemas or when you need to override auto-detection, use the extended configuration format:

```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-service-role-key",
  "environment": "local",
  "userCount": 5,
  "setupsPerUser": 2,
  "imagesPerSetup": 1,
  "enableRealImages": false,
  "seed": "test-seed-2025",
  "schema": {
    "framework": "makerkit",
    "primaryUserTable": "accounts",
    "userTable": {
      "name": "accounts",
      "emailField": "email",
      "idField": "id",
      "nameField": "name",
      "pictureField": "picture_url"
    },
    "setupsTable": {
      "name": "setups", 
      "userField": "account_id",
      "titleField": "title",
      "descriptionField": "description"
    },
    "optionalTables": {
      "categories": false,
      "baseTemplates": false,
      "gearItems": false
    }
  }
}
```

**Schema Configuration Options:**

- **`framework`** (`"makerkit" | "simple" | "custom"`): Override auto-detected framework type
- **`primaryUserTable`** (`"accounts" | "profiles" | "users"`): Force which table to use for users
- **`userTable`**: Configure field mappings for the user table
- **`setupsTable`**: Configure field mappings for the setups/content table
- **`optionalTables`**: Control which optional tables to seed

This is especially useful for:
- **Makerkit projects** where you want to use `accounts` instead of `profiles` as the primary user table
- **Custom schemas** with non-standard field names
- **Partial seeding** where you want to skip certain tables

### ✅ Success Story: MakerKit Integration

A real-world example of SupaSeed successfully adapting to a complex MakerKit-based project:

**The Challenge:** A project using MakerKit's multi-tenant architecture had:
- `accounts` table with `primary_owner_user_id` field (not standard `id`)
- Missing optional tables (`categories`, `base_templates`)
- Custom field names and constraints
- Framework was auto-detecting `profiles` instead of `accounts` as primary table

**The Solution:** Using configuration override, the framework now:
- ✅ Correctly detects and uses `accounts` as primary user table
- ✅ Handles MakerKit's `primary_owner_user_id` constraint properly  
- ✅ Gracefully skips missing optional tables
- ✅ Respects custom field mappings

**Optimal Configuration for MakerKit Projects:**
```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-service-role-key",
  "environment": "local",
  "userCount": 3,
  "setupsPerUser": 2,
  "imagesPerSetup": 1,
  "enableRealImages": false,
  "seed": "makerkit-test-2025",
  "emailDomain": "supaseed.test",
  "createStandardTestEmails": true,
  "schema": {
    "framework": "makerkit",
    "primaryUserTable": "accounts",
    "userTable": {
      "name": "accounts",
      "emailField": "email",
      "idField": "id", 
      "nameField": "name",
      "pictureField": "picture_url"
    },
    "setupsTable": {
      "name": "setups",
      "userField": "account_id",
      "titleField": "title", 
      "descriptionField": "description"
    },
    "optionalTables": {
      "categories": false,
      "baseTemplates": false,
      "gearItems": true
    }
  }
}
```

**Result:** Framework now works seamlessly with complex production schemas!

### 🧪 Standard MakerKit Test Emails

For MakerKit projects, the framework can automatically create standard test email accounts that match the official MakerKit seed data:

```json
{
  "createStandardTestEmails": true
}
```

**Created Test Accounts:**
- `test@makerkit.dev` - Test User (admin role)
- `custom@makerkit.dev` - Custom User (custom role)  
- `owner@makerkit.dev` - Owner User (owner role)
- `member@makerkit.dev` - Member User (member role)
- `super-admin@makerkit.dev` - Super Admin (super-admin role)

These accounts are created in addition to your regular generated users and provide consistent test credentials across different environments.

### Environment Variables

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (required)
- `UNSPLASH_ACCESS_KEY` - Unsplash API key (optional, for real images)
- `NODE_ENV` - Environment (`local`|`staging`|`production`)
- `SUPA_SEED_EMAIL_DOMAIN` - Domain for test emails (optional, default: supaseed.test)
- `SUPA_SEED_DOMAIN` - Domain configuration (optional: generic, outdoor, ecommerce, saas)
- `SUPA_SEED_CREATE_STANDARD_EMAILS` - Create MakerKit standard test emails (optional, default: false)

## Built-in Seeders

The framework includes several pre-built seeders with robust error handling:

1. **AuthSeeder** - Sets up authentication and validates user creation capabilities
2. **BaseDataSeeder** - Creates foundational data and categories with table existence checks
3. **UserSeeder** - Generates realistic user profiles with automatic retry logic
4. **GearSeeder** - Seeds professional gear database with graceful degradation
5. **SetupSeeder** - Creates contextual gear configurations with dependency validation
6. **MediaSeeder** - Handles image generation and upload with fallback mechanisms

Each seeder includes:
- ✅ Table existence validation before operations
- ✅ Automatic retry logic for transient failures  
- ✅ Graceful handling of missing dependencies
- ✅ Comprehensive error logging and reporting
- ✅ Rollback capabilities for failed operations

## Database Schema Setup

Supa Seed now supports multiple database schema patterns and automatically detects your schema type for compatibility.

### Supported Schema Types

**1. Simple Schema (schema.sql / schema-minimal.sql)**
- Basic `accounts`, `categories`, `setups` tables
- Direct foreign key relationships
- Ideal for simple projects

**1a. MakerKit Schema (schema-makerkit.sql)**
- Compatible with existing MakerKit/complex multi-tenant projects
- Adds missing tables: `categories`, `gear_items`, `base_templates`, junction tables
- Preserves existing schema while adding supa-seed compatibility
- Includes sample data and proper RLS policies

**2. Makerkit Schema (Multi-tenant SaaS)**
- Uses `auth.users` + `profiles` pattern  
- Team/account-based multi-tenancy
- Automatic detection and adaptation

**3. Custom Profiles Schema**
- Uses `auth.users` + `profiles` tables
- Single-tenant with user profiles
- Flexible for custom implementations

### Automatic Schema Detection

Supa Seed automatically detects your database schema and adapts:

```typescript
// The framework automatically detects and uses the right strategy
const seeder = new SupaSeedFramework(config);
await seeder.seed(); // Works with any supported schema
```

### Schema Installation Options

**Option 1: Use Provided Schema**
```bash
# Apply complete schema
psql -h your-host -U postgres -d your_database -f schema.sql

# Or apply minimal schema  
psql -h your-host -U postgres -d your_database -f schema-minimal.sql

# For MakerKit projects (adds missing tables to existing schema)
psql -h your-host -U postgres -d your_database -f schema-makerkit.sql

# Via Supabase Dashboard
# Copy and paste the contents of either file into the SQL editor
```

**Option 2: Use Your Existing Schema**
```bash
# Supa Seed will detect and adapt to your existing schema
# No schema changes required if you have:
# - User tables (accounts, profiles, or custom)
# - Basic content tables (setups, posts, etc.)
supa-seed seed # Automatically detects schema
```

### Schema Compatibility Requirements

**Minimum Requirements:**
- At least one user table (`accounts`, `profiles`, etc.)
- Supabase auth enabled
- Service role key with appropriate permissions

**Recommended Tables:**
- User profiles: `accounts` or `profiles`  
- Content: `setups`, `posts`, or similar
- Categories: `categories` or `tags`

### Required Tables (Minimal)

For basic functionality, you need these tables:

```sql
-- User accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  username VARCHAR(100) UNIQUE,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content categories  
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

-- User setups/content
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Optional Tables (Complete Schema)

The complete schema includes additional tables for advanced features:

- **gear_items** - Product/gear database with specifications
- **setup_gear_items** - Many-to-many relationships between setups and gear
- **base_templates** - Reusable templates (vehicles, backpacks, etc.)
- **setup_base_templates** - Template associations

See `schema.sql` for complete table definitions with proper indexes, constraints, and RLS policies.

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