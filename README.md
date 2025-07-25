# 🌱 Supa-Seed v2.1.0

**Schema-First, Framework-Agnostic Database Seeding Platform for Supabase**

Transform your database seeding from hardcoded assumptions to intelligent, schema-driven automation that adapts to any MakerKit variant or custom database structure.

[![npm version](https://img.shields.io/npm/v/supa-seed.svg)](https://www.npmjs.com/package/supa-seed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What's New in v2.1.0 - **Complete Architectural Revolution**

### 🎯 **Schema-First Architecture**
- **🔍 Dynamic Schema Discovery**: Automatically introspects your database structure
- **🧠 Intelligent Column Mapping**: Fuzzy matching and pattern recognition for any schema
- **⚡ Constraint-Aware Execution**: Validates operations before execution to prevent errors
- **🔄 Framework-Agnostic**: Works with any MakerKit variant or custom schema
- **🛡️ Zero Hardcoded Assumptions**: Completely eliminates hardcoded business logic

### 🆕 **Beta Tester Issues Resolved**
- **✅ Personal Account Constraints**: Handles complex database constraints automatically
- **🔧 Dynamic Workflows**: No more "whack-a-mole" individual column fixes
- **📊 Relationship Discovery**: Intelligent foreign key handling and dependency management
- **🎨 Progressive Enhancement**: Graceful degradation with multiple fallback strategies

## 🚀 Previous Features (v2.0.x)

**Major Release**: Complete architectural transformation with 6-phase hybrid implementation:

### 🎯 **Enterprise Features**
- **🤖 AI Integration**: Local Ollama support with intelligent data generation
- **📊 Performance Monitoring**: Real-time metrics and optimization
- **🧠 Memory Management**: Automatic cleanup and intelligent resource management
- **🛡️ Error Handling**: Advanced recovery with context and retry logic
- **⚙️ Configuration Validation**: Built-in security and performance rules
- **🖥️ Production CLI**: Professional interface with health checks

### 🔧 **Advanced Capabilities**
- **🎨 Asset Pool System**: Multi-format asset loading with 5 selection strategies
- **🧩 Association Intelligence**: Smart distribution with constraint enforcement
- **📈 Schema Evolution**: Automatic change detection with migration suggestions
- **🔄 Graceful Degradation**: Circuit breakers for service reliability
- **🎪 Template System**: Dynamic configuration with marketplace support

## ⚡ Quick Start - Schema-First Approach

### **Automatic Schema Detection (Recommended)**

```bash
# 1. Install latest version with schema-first architecture
npm install -g supa-seed@latest

# 2. Start your local Supabase (or use cloud)
supabase start

# 3. Automatic schema discovery and configuration
supa-seed quickstart --schema-first

# 4. Test architecture (validates against your actual schema)
supa-seed test-architecture

# 5. Schema-driven seeding (adapts to your database automatically)
supa-seed seed --schema-first
```

> **🎯 Schema-First Revolution**: v2.1.0 eliminates all hardcoded assumptions. Works with any MakerKit variant or custom schema automatically!

### **Manual Configuration (Legacy Support)**

```bash
# 1. For existing v2.0.x configurations
supa-seed migrate-config supa-seed.config.json

# 2. Enable schema-first features
supa-seed seed --enable-schema-discovery
```

### **Cloud Supabase (Production Ready)**

```bash
# 1. Install and configure with schema discovery
npm install -g supa-seed
supa-seed quickstart --schema-first --cloud

# 2. Configure for production
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
EOF

# 3. Run constraint-aware production seeding
supa-seed seed --schema-first --env production
```

## 🌟 Core Features - Schema-First Revolution

### **🔍 Dynamic Schema Introspection**
```bash
# Analyze your database automatically
supa-seed detect --comprehensive     # Deep schema analysis
supa-seed introspect --export json   # Export schema info
```

**Features:**
- Automatic framework detection (MakerKit v1/v2/v3, custom schemas)
- Intelligent constraint discovery and handling
- Relationship mapping and dependency analysis
- Column pattern recognition with confidence scoring

### **🧠 Intelligent Column Mapping**
```bash
# Dynamic mapping with fuzzy matching
supa-seed map --confidence 0.8       # High confidence mappings
supa-seed map --export mappings.json # Export discovered mappings
```

**Features:**
- Fuzzy string matching for column names
- Pattern recognition for common naming conventions
- Confidence scoring and alternative suggestions
- Custom mapping support with validation

### **⚡ Constraint-Aware Execution**
```bash
# Validate before execution
supa-seed validate --constraints     # Check all constraints
supa-seed seed --safe-mode          # Constraint validation enabled
```

**Features:**
- Pre-execution constraint validation
- Automatic dependency creation
- Business logic constraint handling
- Auto-fix suggestions for common issues

### **🤖 AI-Powered Generation (Enhanced)**
```bash
# Enable AI with schema context
supa-seed ai status        # Check AI service
supa-seed seed --ai --schema-aware   # AI with schema understanding
```

**Features:**
- Schema-aware AI prompt generation
- Local Ollama integration (privacy-first)
- Domain-specific prompt engineering with schema context
- Intelligent response caching with schema versioning

### **📊 Performance Monitoring**
```bash
supa-seed analyze          # Performance analysis
supa-seed status --detailed  # System health
```

**Built-in Monitoring:**
- Real-time performance metrics
- Memory usage tracking
- Error rate monitoring
- Export to Prometheus/JSON

### **🎨 Advanced Asset Management**
```bash
# Configure asset strategies
supa-seed templates list   # Available templates
supa-seed seed --assets-strategy weighted
```

**5 Selection Strategies:**
- `all` - Select all available assets
- `random` - Random selection with seeding
- `filtered` - Advanced filtering by metadata
- `manual` - Specific asset selection
- `weighted` - Priority-based selection

### **🛡️ Production Hardening**
```bash
supa-seed health           # Comprehensive health check
supa-seed memory status    # Memory management
supa-seed validate-config  # Configuration validation
```

**Enterprise Features:**
- Circuit breaker patterns
- Automatic error recovery
- Memory cleanup and optimization
- Configuration security validation

## 📋 Installation & Setup

### **Prerequisites**
- Node.js 16+ and npm
- Supabase project (local or cloud)
- PostgreSQL access

### **Global Installation**
```bash
npm install -g supa-seed
supa-seed --version  # Should show v2.0.0
```

### **Project Installation**
```bash
npm install --save-dev supa-seed
npx supa-seed init
```

### **Schema Setup**

Choose the appropriate schema for your project:

```bash
# Basic schema (recommended for new projects)
psql -f node_modules/supa-seed/schema.sql

# MakerKit v3 compatible schema
psql -f node_modules/supa-seed/schema-makerkit.sql

# Minimal schema (testing only)
psql -f node_modules/supa-seed/schema-minimal.sql
```

Or apply via Supabase Dashboard → SQL Editor.

## 🎯 Configuration

### **Interactive Setup (Recommended)**
```bash
supa-seed setup  # Interactive wizard
```

### **Auto-Detection**
```bash
supa-seed init --detect  # Analyzes your database
```

### **Manual Configuration**

Create `supa-seed.config.json`:

```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-service-role-key",
  "environment": "local",
  "userCount": 10,
  "setupsPerUser": 3,
  "imagesPerSetup": 2,
  "enableRealImages": false,
  "ai": {
    "enabled": true,
    "ollamaUrl": "http://localhost:11434",
    "fallbackToFaker": true
  },
  "performance": {
    "batchSize": 100,
    "enableMonitoring": true,
    "memoryLimit": 512
  },
  "assets": {
    "selectionStrategy": "weighted",
    "loadImages": true,
    "loadMarkdown": true
  }
}
```

## 🖥️ CLI Commands

### **Core Commands - Schema-First**
```bash
supa-seed seed --schema-first         # Schema-driven seeding
supa-seed cleanup                     # Remove all seed data
supa-seed status                      # System status
supa-seed health                      # Health check
supa-seed test-architecture           # Test new architecture
```

### **Schema Management**
```bash
supa-seed introspect                  # Analyze database schema
supa-seed detect --comprehensive      # Deep schema analysis
supa-seed map --export               # Export column mappings
supa-seed validate --constraints      # Validate constraints
supa-seed migrate-config             # Migrate v2.0.x configs
```

### **Configuration**
```bash
supa-seed init --schema-first        # Initialize with schema discovery
supa-seed quickstart                 # Automated setup with schema analysis
supa-seed setup                      # Interactive setup wizard
supa-seed validate-config            # Validate configuration
```

### **AI Management**
```bash
supa-seed ai status         # Check AI service
supa-seed ai test           # Test AI connectivity
```

### **Performance & Monitoring**
```bash
supa-seed analyze           # Performance analysis
supa-seed memory status     # Memory usage
supa-seed memory cleanup    # Force cleanup
supa-seed export --type metrics  # Export metrics
```

### **Templates**
```bash
supa-seed templates list    # Available templates
supa-seed templates validate # Validate all templates
```

## 🎪 Advanced Usage

### **Environment-Specific Seeding**

```bash
# Development (small datasets)
supa-seed seed --env local --users 5

# Staging (medium datasets)  
supa-seed seed --env staging --users 25

# Production (large datasets)
supa-seed seed --env production --users 100
```

### **AI-Enhanced Seeding**

```bash
# Install and start Ollama locally
curl -fsSL https://ollama.ai/install.sh | sh
ollama serve
ollama pull llama3.1:latest

# Enable AI seeding
supa-seed seed --ai --fallback
```

### **Asset Integration**

```bash
# Create assets directory
mkdir -p assets/{images,markdown,json}

# Add your assets
cp *.jpg assets/images/
cp *.md assets/markdown/
cp *.json assets/json/

# Run with asset integration
supa-seed seed --assets-strategy filtered
```

### **Schema Evolution**

```bash
# Detect schema changes
supa-seed detect --verbose

# Interactive configuration updates
supa-seed seed --interactive
```

## 🔧 Library Usage

### **Schema-First Usage (v2.1.0)**
```typescript
import { 
  createSchemaDrivenSeeder, 
  createFrameworkAgnosticCreator,
  quickStart 
} from 'supa-seed/schema';

// Quick start with automatic schema detection
const { adapter, recommendations } = await quickStart(client, {
  email: 'test@example.com',
  enableTesting: true
});

// Manual schema-driven approach
const seeder = createSchemaDrivenSeeder(client, {
  version: '2.1.0',
  seeding: { enableSchemaIntrospection: true },
  schema: { 
    columnMapping: { enableDynamicMapping: true },
    constraints: { enableValidation: true }
  }
});

await seeder.createUser({
  email: 'user@example.com',
  name: 'Test User'
});
```

### **Legacy Usage (v2.0.x)**
```typescript
import { SupaSeedFramework, createDefaultConfig } from 'supa-seed';

const config = createDefaultConfig({
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseServiceKey: 'your-key',
  environment: 'local'
});

const seeder = new SupaSeedFramework(config);
await seeder.seed();
```

### **With Schema-Aware AI Integration**
```typescript
import { createSchemaDrivenSeeder } from 'supa-seed/schema';
import { AIAssetGenerator } from 'supa-seed/ai';

const seeder = createSchemaDrivenSeeder(client, {
  seeding: { enableSchemaIntrospection: true }
});

const aiGenerator = new AIAssetGenerator();

// Schema-aware AI generation
const schemaInfo = await seeder.getSchemaInfo();
const result = await aiGenerator.generateSeedDataWithSchema(
  'users', 
  10, 
  { 
    domain: 'saas', 
    style: 'professional',
    schemaContext: schemaInfo // AI understands your actual schema
  }
);
```

### **With Performance Monitoring**
```typescript
import { PerformanceMonitor, withPerformanceMonitoring } from 'supa-seed/utils';

PerformanceMonitor.initialize();

await withPerformanceMonitoring(
  () => seeder.seed(),
  'seeding',
  'main_operation'
);

const stats = PerformanceMonitor.getPerformanceStats();
console.log(`Average response time: ${stats.averageResponseTime}ms`);
```

## 🛡️ Production Features

### **Error Handling & Recovery**
- Automatic retry with exponential backoff
- Circuit breaker patterns for external services
- Comprehensive error context and suggestions
- Graceful degradation when services unavailable

### **Performance Optimization**
- Real-time performance monitoring
- Memory usage tracking and cleanup
- Batch processing with configurable sizes
- Resource usage optimization

### **Security & Validation**
- Configuration validation with security rules
- Environment-specific validation (dev vs prod)
- Service key validation and rotation support
- SQL injection prevention

### **Monitoring & Observability**
- Performance metrics export (Prometheus/JSON)
- Health checks and system status
- Memory management with cleanup recommendations
- Service dependency monitoring

## 🔍 Troubleshooting

### **Common Issues**

**"AI service unavailable"**
```bash
# Check Ollama status
supa-seed ai status

# Start Ollama if needed
ollama serve

# Test with fallback enabled
supa-seed seed --ai --fallback
```

**"Memory usage high"**
```bash
# Check memory status
supa-seed memory status

# Force cleanup
supa-seed memory cleanup

# Adjust memory limits
supa-seed seed --memory-limit 1024
```

**"Configuration invalid"**
```bash
# Validate configuration
supa-seed validate-config --strict

# Fix with interactive setup
supa-seed setup
```

**"Database connection failed"**
```bash
# Check service health
supa-seed health

# Test database connectivity
supa-seed detect --verbose

# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### **Performance Issues**

**Slow seeding performance:**
```bash
# Analyze performance
supa-seed analyze

# Reduce batch size
supa-seed seed --batch-size 50

# Monitor memory usage
supa-seed memory status
```

**High memory usage:**
```bash
# Enable memory monitoring
supa-seed seed --memory-limit 512

# Force garbage collection
supa-seed memory cleanup

# Use smaller datasets for development
supa-seed seed --env local
```

### **Debugging**

Enable verbose logging:
```bash
supa-seed seed --verbose
supa-seed health --detailed
supa-seed analyze --export json > debug.json
```

## 📊 Schema Support - Universal Compatibility

### **Supported Frameworks (Zero Configuration)**
- ✅ **MakerKit v1/v2/v3** - Automatic detection with 90%+ accuracy
- ✅ **Custom Supabase** - Dynamic adaptation to any PostgreSQL schema
- ✅ **Simple Profiles** - Basic user/profile patterns with constraint awareness
- ✅ **Wildernest Style** - Outdoor platform schemas with relationship discovery
- ✅ **Any PostgreSQL Schema** - Framework-agnostic approach works universally

### **Intelligent Schema Discovery**
The new architecture automatically discovers and adapts to:
- **Framework Detection**: MakerKit variants, custom schemas with confidence scoring
- **Column Mapping**: Fuzzy matching for renamed columns (display_name → username → full_name)
- **Constraint Analysis**: Business logic constraints, foreign keys, check constraints
- **Relationship Mapping**: Table dependencies, foreign key relationships, circular dependencies
- **Schema Evolution**: Version changes, table modifications, constraint updates

### **Beta Tester Issues Resolved**
- **✅ Personal Account Constraints**: `profiles_personal_account_only` constraint handled automatically
- **✅ Dynamic Column Discovery**: No more hardcoded `avatar_url` → `picture_url` mapping issues
- **✅ Business Logic Awareness**: Understands MakerKit's `is_personal_account` requirements
- **✅ Framework Agnostic**: Works with any MakerKit customization or custom schema

### **Schema Evolution & Migration**
- **Automatic Change Detection**: Detects schema modifications and suggests config updates
- **Configuration Migration**: Smooth upgrade from v2.0.x hardcoded configs to v2.1.0 schema-first
- **Interactive Updates**: Guided configuration updates when schema changes detected
- **Backup and Rollback**: Safe migration with automatic backups and rollback capability

## 🌐 Environment Configuration

### **Local Development**
```bash
# .env.local
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-key
NODE_ENV=local
```

### **Staging**
```bash
# .env.staging  
SUPABASE_URL=https://staging-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-staging-key
NODE_ENV=staging
```

### **Production**
```bash
# .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-production-key
NODE_ENV=production
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### **Development Setup**
```bash
git clone https://github.com/livebydesign2/supa-seed.git
cd supa-seed
npm install
npm run build
npm test
```

### **Running Tests**
```bash
npm test                    # All tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests
npm run test:coverage      # Coverage report
```

## 📈 Roadmap

### **✅ v2.1.0 - Schema-First Architecture (COMPLETED)**
- ✅ Dynamic schema introspection and discovery
- ✅ Framework-agnostic operation with any schema
- ✅ Constraint-aware execution and validation
- ✅ Intelligent column mapping with fuzzy matching
- ✅ Configuration migration from hardcoded assumptions

### **v2.2.0 - Enhanced AI Integration**
- Multiple AI provider support (OpenAI, Anthropic, Claude)
- Schema-aware prompt templates with context injection
- AI model fine-tuning support with schema understanding
- Intelligent data relationships and constraint awareness

### **v2.3.0 - Advanced Analytics & Monitoring**
- Schema evolution tracking and impact analysis
- Database performance analytics with schema optimization
- Seeding impact analysis and constraint violation prediction
- Custom metrics and dashboards for schema health

### **v2.4.0 - Enterprise Features**
- RBAC and team collaboration with schema access control
- Audit logging and compliance with schema change tracking
- Advanced security features with constraint-based permissions
- Multi-tenant schema management and isolation

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Supabase community
- Powered by Faker.js for realistic data generation
- AI features supported by Ollama for privacy-first intelligence
- Inspired by the needs of modern full-stack development

---

**Made by developers, for developers. Transform your database seeding from hardcoded assumptions to intelligent, schema-driven automation with supa-seed v2.1.0.**

### **🎯 The Schema-First Revolution**

No more:
- ❌ Hardcoded column mappings that break with schema changes
- ❌ Framework assumptions that fail with customizations  
- ❌ "Whack-a-mole" fixes for individual constraint issues
- ❌ Manual configuration for every MakerKit variant

Instead:
- ✅ **Dynamic Discovery**: Automatically understands your schema
- ✅ **Framework Agnostic**: Works with any MakerKit variant or custom schema
- ✅ **Constraint Aware**: Prevents errors before they happen
- ✅ **Future Proof**: Adapts to schema changes automatically

🌱 **Happy Schema-First Seeding!**