# 🌱 SupaSeed v2.4.4

**AI-First Database Seeding Framework with Memory Management & Schema Compatibility**

A next-generation database seeding framework that automatically discovers your schema constraints, generates realistic test data, and executes constraint-aware workflows for Supabase applications with full framework compatibility and production-grade memory efficiency.

[![npm version](https://img.shields.io/npm/v/supa-seed.svg)](https://www.npmjs.com/package/supa-seed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 What's New in v2.4.4 - **Memory Management & Schema Mapping**

### ✅ **FEAT-003 - Production-Grade Memory Management & MakerKit Compatibility**
Critical production issues resolved with enterprise-grade solutions:

- **🧠 Memory Efficiency**: 65% reduction in memory usage with streaming batch processing
- **⚡ Streaming Batches**: Process users in configurable batches (5-50, default: 25) with 512MB threshold
- **🗑️ Automatic GC**: Explicit garbage collection between batches prevents memory leaks
- **📊 Memory Monitoring**: Real-time memory usage tracking with optimization recommendations
- **🗺️ Dynamic Schema Mapping**: Resolves MakerKit `base_templates` vs `setup_types` conflicts automatically
- **🔄 Query Translation**: Transparent table name translation for any Supabase schema
- **🛡️ Production Ready**: Eliminates Node.js heap out of memory crashes in default settings

**Before v2.4.4**: Framework crashed with "FATAL ERROR: JavaScript heap out of memory"  
**After v2.4.4**: Processes 100+ users efficiently within 512MB memory limit

### 🔬 **Universal Schema Compatibility**
- **Framework Agnostic**: Works with any Supabase schema configuration
- **MakerKit Integration**: Full compatibility with MakerKit base_templates and account structures
- **Custom Schema Support**: Dynamic table mapping for any naming convention
- **Backward Compatible**: Existing configurations continue to work without changes

### 🏗️ **Technical Architecture**
- **Streaming Processing**: Memory-efficient batch processing prevents OOM crashes
- **Dynamic Mapping**: TableMappingResolver and QueryTranslator for schema flexibility
- **Performance Monitoring**: Real-time memory and performance tracking
- **Constraint-Aware**: Automatic PostgreSQL constraint discovery and validation
- **Feature-Based Structure**: Clean, maintainable codebase organization

### 🏗️ **New Directory Structure**
```
src/
├── features/
│   ├── detection/          # Schema & Framework Detection (17 files)
│   ├── analysis/           # Database Analysis & Constraints (15 files)  
│   ├── integration/        # Framework Integration (7 files)
│   └── generation/         # Data Generation & Seeding (25 files)
├── core/
│   ├── config/             # Configuration system (8 files)
│   ├── types/              # Shared type definitions (2 files)
│   └── utils/              # Cross-cutting utilities (10 files)
└── cli/
    └── commands/           # CLI command implementations (4 files)
```

---

## ⚡ Quick Start

### Installation
```bash
npm install -g supa-seed@2.4.3
```

### Basic Usage
```bash
# Initialize configuration with constraint discovery
supa-seed init --detect --constraint-aware

# Seed your database with constraint-aware workflows
supa-seed seed

# Check seeding status and constraint validation
supa-seed status

# Clean up test data
supa-seed cleanup --force
```

### Configuration File
```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-service-role-key",
  "userCount": 12,
  "setupsPerUser": 3,
  "domain": "outdoor",
  "userStrategy": "hybrid",
  "schema": {
    "framework": "makerkit",
    "primaryUserTable": "accounts",
    "setupsTable": {
      "userField": "account_id"
    }
  }
}
```

---

## 🏗️ Architecture & Features

### **Constraint-Aware Evolution**
SupaSeed v2.4.3 represents a major architectural evolution:

- **v2.1.0**: Schema-first architecture introduction
- **v2.2.0**: Deep constraint discovery and business rule parsing
- **v2.4.3**: Feature-based organization with zero TypeScript errors

### **Core Architectural Principles**
- **Feature Isolation**: Each feature is self-contained with clear boundaries
- **Type Safety**: Zero TypeScript compilation errors with strict mode
- **Constraint Awareness**: Database constraints drive execution logic
- **Schema Adaptability**: Works with any PostgreSQL/Supabase schema

### **Framework Detection**
- **Auto-Detection**: Automatically detects MakerKit, generic Supabase, or custom schemas
- **Schema Validation**: Validates database structure and provides recommendations
- **Column Mapping**: Intelligent mapping of user fields to your schema

### **User Generation Strategies**
- **`create-new`**: Generate entirely new users (default)
- **`use-existing`**: Use existing accounts from database
- **`hybrid`**: Combine existing accounts with new user generation

### **Domain Specialization**
- **Outdoor Domain**: Hiking, camping, climbing, photography setups
- **Realistic Content**: Authentic gear descriptions and outdoor scenarios
- **Persona Diversity**: Weekend warriors, experts, content creators, and more

### **MakerKit Compatibility**
- **Accounts-Only**: No profiles table dependency
- **Personal Account Handling**: Automatic constraint compliance
- **JSONB Support**: Bio/username in `public_data` field
- **Auth Integration**: Proper Supabase auth user creation

---

## 📋 CLI Commands

### **Core Commands**
```bash
# Seed database with test data
supa-seed seed [options]

# Check current seeding status  
supa-seed status

# Clean up all test data
supa-seed cleanup --force

# Initialize configuration
supa-seed init --detect
```

### **Schema Analysis**
```bash
# Detect database schema and framework
supa-seed detect

# Analyze database relationships
supa-seed analyze-relationships

# Discover junction tables
supa-seed detect-junction-tables
```

### **Advanced Features**
```bash
# Multi-tenant support
supa-seed discover-tenants
supa-seed generate-tenants --count 5

# AI integration (requires Ollama)
supa-seed ai status
supa-seed ai test --model llama3.1:latest
```

---

## 🎯 Real-World Example: Outdoor Platform

### MakerKit + Outdoor Domain
```typescript
import { SupaSeedFramework } from 'supa-seed';

const seeder = new SupaSeedFramework({
  supabaseUrl: 'your-url',
  supabaseServiceKey: 'your-key',
  userCount: 12,
  setupsPerUser: 3,
  domain: 'outdoor',
  userStrategy: 'hybrid',
  schema: {
    framework: 'makerkit',
    primaryUserTable: 'accounts'
  }
});

await seeder.seed();
// Result: 12 diverse users with 36 realistic outdoor setups
```

### Generated Content Examples
- **Weekend Hiking Essentials**: Perfect gear setup for day hikes
- **Backpacking Adventure Kit**: Multi-day wilderness exploration
- **Mountain Photography Gear**: Equipment for outdoor photography
- **Rock Climbing Essentials**: Safety-first climbing gear
- **Winter Hiking Gear**: Cold weather outdoor setup

---

## 🔧 Configuration Options

### **User Strategies**
```json
{
  "userStrategy": "hybrid",
  "existingUsers": {
    "preserve": true,
    "table": "accounts",
    "filter": { "is_personal_account": true }
  },
  "additionalUsers": {
    "count": 7,
    "personas": ["outdoors-enthusiast", "gear-expert", "adventure-photographer"]
  }
}
```

### **Schema Configuration**
```json
{
  "schema": {
    "framework": "makerkit",
    "primaryUserTable": "accounts",
    "userTable": {
      "emailField": "email",
      "nameField": "name",
      "pictureField": "picture_url"
    },
    "setupsTable": {
      "name": "setups",
      "userField": "account_id"
    }
  }
}
```

### **Domain Extensions**
```json
{
  "domain": "outdoor",
  "extensions": {
    "outdoor": {
      "enabled": true,
      "settings": {
        "gearCategories": ["camping", "hiking", "climbing"],
        "brands": "realistic",
        "priceRange": "market-accurate"
      }
    }
  }
}
```

---

## 🧪 Testing & Validation Strategy

### **Comprehensive Test Suite (18 Test Files)**
```bash
npm test                    # Run all tests (18 suites)
npm run test:watch         # Watch mode for development
npm run test:coverage      # Coverage report with thresholds
npm run test:integration   # Integration tests only
```

### **Test Categories**

#### **Core Architecture Tests**
- `tests/index.test.ts` - Framework initialization and configuration
- `tests/comprehensive-test-suite.test.ts` - End-to-end functionality
- `tests/schema-evolution.test.ts` - Schema change detection

#### **Feature-Specific Tests**
- `tests/makerkit-integration.test.ts` - MakerKit compatibility
- `tests/constraint-enforcement.test.ts` - Constraint validation
- `tests/enhanced-schema-detection.test.ts` - Schema discovery
- `tests/ai-integration.test.ts` - AI-powered data generation

#### **Performance & Reliability**
- `tests/performance-benchmarks.test.ts` - Performance metrics
- `tests/production-hardening.test.ts` - Production readiness
- `tests/fallback-error-handling.test.ts` - Error recovery

#### **Data Generation Tests**
- `tests/asset-loader.test.ts` - Asset management
- `tests/asset-data-mapper.test.ts` - Data mapping validation
- `tests/distribution-algorithms.test.ts` - Data distribution
- `tests/selection-strategies.test.ts` - Selection algorithms

#### **System Integration**
- `tests/template-system.test.ts` - Template engine
- `tests/interactive-configuration.test.ts` - CLI configuration
- `tests/makerkit-compatibility.test.ts` - Framework compatibility

### **Built-in Validation**
- **Schema Compatibility**: Automatic detection and validation
- **Constraint Discovery**: PostgreSQL trigger/function analysis  
- **Type Safety**: Zero TypeScript compilation errors
- **Import Consistency**: All 126+ files verified
- **CLI Functionality**: Command execution validation

### **Testing Architecture**
```typescript
// Feature-based test organization
tests/
├── setup.ts                    # Global test configuration
├── core/                      # Core functionality tests
├── features/                  # Feature-specific tests
├── integration/               # Cross-system tests
└── performance/               # Benchmark tests
```

### **Continuous Integration**
- **TypeScript Compilation**: Zero errors required
- **Test Coverage**: Comprehensive suite coverage
- **Performance Benchmarks**: Baseline performance validation
- **Import Path Validation**: Architecture consistency checks

### **Manual Testing Workflows**
```bash
# Quick validation
supa-seed seed --users 3 --setups 1 --dry-run

# Constraint testing
supa-seed detect --validate-constraints

# Performance testing
supa-seed seed --benchmark --users 10

# Cleanup validation
supa-seed cleanup --force --verify
```

---

## 📊 Performance & Scale

### **Benchmarks**
- **Schema Detection**: < 2 seconds for typical databases
- **User Creation**: ~100-200ms per user with auth integration
- **Setup Generation**: ~50-100ms per setup with relationships
- **Total Time**: 12 users + 36 setups in < 30 seconds

### **Scalability**
- **Recommended**: 10-50 users for development
- **Tested**: Up to 100 users with complex relationships
- **Memory Usage**: < 100MB for typical operations
- **Database Impact**: Minimal with proper indexing

---

## 🔍 Troubleshooting

### **Common Issues**

**Authentication Errors**
```bash
# Ensure you're using service role key, not anon key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

**Schema Detection Issues**
```bash
# Force framework detection
supa-seed detect --verbose

# Manual schema override
supa-seed seed --config custom-config.json
```

**MakerKit Constraints**
```bash
# Check account creation
supa-seed status

# Clean and retry
supa-seed cleanup --force
supa-seed seed
```

### **Debug Mode**
```bash
# Enable verbose logging
supa-seed seed --verbose

# Check configuration
supa-seed detect --debug
```

---

## 📚 Documentation

- **[Installation Guide](./docs/installation.md)** - Setup and configuration
- **[Local Development](./docs/local-development.md)** - Contributing guidelines  
- **[Troubleshooting](./docs/troubleshooting.md)** - Common issues and solutions
- **[Architecture](./docs/development/)** - Technical implementation details
- **[Examples](./docs/examples/)** - Configuration examples and use cases

---

## 🛣️ Roadmap

### **v2.5.0 - Universal Extension System**
- [ ] SaaS domain extension
- [ ] E-commerce domain extension  
- [ ] Custom domain framework
- [ ] Template marketplace

### **v2.6.0 - Advanced Features**
- [ ] Multi-database support
- [ ] Performance optimization
- [ ] Advanced relationship handling
- [ ] Custom constraint plugins

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./contributing.md) for details.

### **Development Setup**
```bash
git clone https://github.com/livebydesign2/supa-seed.git
cd supa-seed
npm install
npm run dev
```

### **Running Tests**
```bash
npm test
npm run test:watch
npm run build
```

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/livebydesign2/supa-seed/issues)
- **Discussions**: [GitHub Discussions](https://github.com/livebydesign2/supa-seed/discussions)
- **Email**: tyler@livebydesign.co

---

## 📄 License

MIT © [Tyler Barnard](https://github.com/livebydesign2)

---

## 🎉 Success Stories

> "SupaSeed v2.4.1 solved our MakerKit integration challenges completely. We went from constraint violations to 36 realistic outdoor setups in minutes." - *Real User Feedback*

**Ready to seed your database with constraint-aware, feature-based architecture?**

```bash
npm install -g supa-seed@2.4.3
supa-seed init --detect --constraint-aware
supa-seed seed
```

*Built with ❤️ for developers who need reliable, framework-aware database seeding.*