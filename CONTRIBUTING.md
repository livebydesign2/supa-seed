# 🤝 Contributing to Supa Seed

Thank you for your interest in contributing to Supa Seed! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Submitting Changes](#submitting-changes)
- [Architecture Overview](#architecture-overview)
- [Adding New Seeders](#adding-new-seeders)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- TypeScript knowledge
- Supabase account for testing
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/your-username/supa-seed.git
cd supa-seed
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your Supabase test credentials
```

4. **Set up test database**

```bash
# Apply the minimal schema to your test database
psql -h localhost -U postgres -d test_database -f schema-minimal.sql
```

5. **Build and test**

```bash
npm run build
npm test
```

## 🔧 Development Workflow

### Making Changes

1. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**

- Write code following our standards (see below)
- Add tests for new functionality
- Update documentation as needed

3. **Test your changes**

```bash
# Run the full test suite
npm test

# Check test coverage
npm run test:coverage

# Test CLI functionality
npm run seed:minimal

# Check TypeScript compilation
npm run build
```

4. **Commit and push**

```bash
git add .
git commit -m "feat: describe your changes"
git push origin feature/your-feature-name
```

5. **Create a Pull Request**

## 📝 Code Standards

### TypeScript Guidelines

- **Strict Mode**: All code must pass TypeScript strict mode
- **Error Handling**: Always include proper error handling and retry logic
- **Type Safety**: Prefer explicit types over `any`
- **Null Safety**: Use proper null checks and optional chaining

### Code Style

```typescript
// Good: Comprehensive error handling
async seed(): Promise<void> {
  try {
    if (!(await this.checkTableExists('users'))) {
      this.logWarning('Table check', 'users table not found, skipping');
      return;
    }
    
    const result = await this.executeWithRetry(async () => {
      return await this.context.client.from('users').insert(data);
    });
    
    if (!result) {
      this.logError('User creation', 'Failed after all retry attempts');
      return;
    }
  } catch (error) {
    this.logError('Seed operation', error);
    throw error;
  }
}

// Bad: No error handling
async seed(): Promise<void> {
  await this.context.client.from('users').insert(data);
}
```

### Error Handling Patterns

All seeders should follow these patterns:

1. **Table Validation**

```typescript
if (!(await this.checkTableExists('table_name'))) {
  this.logWarning('Table check', 'table_name not found, skipping');
  return;
}
```

2. **Retry Logic**

```typescript
const result = await this.executeWithRetry(async () => {
  return await this.context.client.from('table').insert(data);
});

if (!result) {
  this.logError('Operation', 'Failed after retries');
  return;
}
```

3. **Structured Logging**

```typescript
// For errors
this.logError('Context description', error, { additionalInfo });

// For warnings  
this.logWarning('Context description', 'Warning message', { additionalInfo });
```

## 🧪 Testing Guidelines

### Writing Tests

- **Unit Tests**: Test individual functions and classes
- **Integration Tests**: Test seeder workflows end-to-end
- **Error Scenarios**: Test error handling and edge cases

### Test Structure

```typescript
describe('FeatureSeeder', () => {
  let seeder: FeatureSeeder;
  
  beforeEach(() => {
    seeder = new FeatureSeeder(mockContext);
  });
  
  describe('Error Handling', () => {
    it('should handle missing tables gracefully', async () => {
      // Mock table check to return false
      jest.spyOn(seeder, 'checkTableExists').mockResolvedValue(false);
      
      // Should not throw error
      await expect(seeder.seed()).resolves.not.toThrow();
    });
    
    it('should retry failed operations', async () => {
      // Test retry logic
    });
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- user-seeder.test.ts
```

## 📨 Submitting Changes

### Pull Request Process

1. **Ensure all tests pass**

```bash
npm test
npm run build
```

2. **Update documentation** if needed

3. **Write a clear PR description**

- What changes were made
- Why the changes were necessary
- How to test the changes
- Any breaking changes

4. **Follow commit message conventions**

```
feat: add new seeder for categories
fix: resolve retry logic in auth seeder  
docs: update README with new features
test: add unit tests for base data seeder
```

### PR Checklist

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Error handling is comprehensive
- [ ] Documentation is updated
- [ ] Breaking changes are documented
- [ ] Commit messages are descriptive

## 🏗️ Architecture Overview

### Core Classes

- **`SupaSeedFramework`** - Main orchestrator class
- **`SeedModule`** - Base class for all seeders with error handling utilities
- **`SeedContext`** - Shared context with client, config, cache, and stats

### Error Handling Architecture

The framework uses a layered error handling approach:

1. **Base Layer**: `SeedModule` provides utility methods
2. **Seeder Layer**: Individual seeders implement specific error handling
3. **Framework Layer**: `SupaSeedFramework` coordinates and reports overall status

### Utility Methods (Available in all seeders)

```typescript
// Check if database connection is healthy
await this.checkDatabaseConnection()

// Check if a table exists and is accessible  
await this.checkTableExists('table_name')

// Execute operation with automatic retry logic
await this.executeWithRetry(async () => { /* operation */ })

// Log structured error information
this.logError('context', error, { additionalInfo })

// Log structured warning information
this.logWarning('context', 'message', { additionalInfo })
```

## ➕ Adding New Seeders

### Creating a New Seeder

1. **Create the seeder class**

```typescript
import { SeedModule, SeedContext } from '../types';

export class MySeeder extends SeedModule {
  async seed(): Promise<void> {
    console.log('🔧 Seeding my data...');
    
    try {
      // Check if required tables exist
      if (!(await this.checkTableExists('my_table'))) {
        this.logWarning('Table check', 'my_table not found, skipping');
        return;
      }
      
      // Your seeding logic with error handling
      const result = await this.executeWithRetry(async () => {
        return await this.context.client
          .from('my_table')
          .insert(this.generateData());
      });
      
      if (!result) {
        this.logError('Data seeding', 'Failed to insert data after retries');
        return;
      }
      
      console.log('✅ My seeding complete');
    } catch (error) {
      this.logError('My seeder failed', error);
      throw error;
    }
  }
  
  private generateData(): any[] {
    // Use this.context.faker for consistent fake data
    return [];
  }
}
```

2. **Add to the seeding order**

Edit `src/index.ts`:

```typescript
const seeders: SeedModule[] = [
  new AuthSeeder(this.context),
  new BaseDataSeeder(this.context),
  new MySeeder(this.context), // Add here in dependency order
  new UserSeeder(this.context),
  // ...
];
```

3. **Write tests**

```typescript
describe('MySeeder', () => {
  // Test error handling scenarios
  // Test data generation
  // Test table validation
});
```

4. **Update exports**

Add to `src/index.ts` exports:

```typescript
export { MySeeder } from './seeders/my-seeder';
```

### Best Practices for New Seeders

- **Always check table existence** before operations
- **Use retry logic** for database operations  
- **Provide meaningful error messages** and warnings
- **Cache results** for other seeders to use
- **Update progress statistics** when appropriate
- **Make operations idempotent** (safe to run multiple times)

## 🤔 Questions?

If you have questions or need help:

1. Check existing issues on GitHub
2. Create a new issue with the "question" label
3. Join our community discussions
4. Review the README.md for usage examples

Thank you for contributing to Supa Seed! 🌱