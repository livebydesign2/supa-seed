# 🌱 Supa-Seed v2.0.3

**Enterprise-Grade Hybrid Database Seeding Platform for Supabase**

Transform your database seeding from basic scripts into an intelligent, production-ready platform with AI integration, advanced asset management, and enterprise monitoring.

[![npm version](https://img.shields.io/npm/v/supa-seed.svg)](https://www.npmjs.com/package/supa-seed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 What's New in v2.0.3

### 🔑 **JWT Authentication Fix**
- **✅ Enhanced Local Development**: Fixed service role key authentication in local Supabase environments
- **🔄 Unified JWT Validation**: Both anon and service role keys now work seamlessly
- **🛠️ Enhanced Error Handling**: Better error messages with clear workarounds
- **🏠 Local Environment Detection**: Automatic detection and specialized handling

## 🚀 What's New in v2.0.0

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

## ⚡ Quick Start

### **Local Supabase (Recommended for Development)**

```bash
# 1. Install latest version with JWT fixes
npm install -g supa-seed@latest

# 2. Start your local Supabase
supabase start

# 3. Set up schema
psql -h localhost -U postgres -d postgres -f node_modules/supa-seed/schema.sql

# 4. Configure environment (both service role and anon keys work!)
echo "SUPABASE_URL=http://127.0.0.1:54321" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-key" >> .env

# 5. Test schema detection (works with both key types now!)
supa-seed detect --verbose

# 6. Initialize and seed
supa-seed init --env local
supa-seed seed
```

> **✅ JWT Authentication Fixed**: v2.0.3 resolves service role key authentication issues in local environments. Both service role and anon keys now work seamlessly!

### **Cloud Supabase (Production Ready)**

```bash
# 1. Install and configure
npm install -g supa-seed
supa-seed init --detect  # Auto-detects your schema

# 2. Configure for production
cat > .env << EOF
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
EOF

# 3. Run production seeding
supa-seed seed --env production
```

## 🌟 Core Features

### **🤖 AI-Powered Generation**
```bash
# Enable AI with local Ollama
supa-seed ai status        # Check AI service
supa-seed seed --ai        # AI-enhanced seeding
```

**Features:**
- Local Ollama integration (privacy-first)
- Domain-specific prompt engineering
- Intelligent response caching
- Graceful fallback to Faker.js

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

### **Core Commands**
```bash
supa-seed seed              # Run seeding process
supa-seed cleanup           # Remove all seed data
supa-seed status            # System status
supa-seed health            # Health check
```

### **Configuration**
```bash
supa-seed init              # Initialize configuration
supa-seed setup             # Interactive setup wizard
supa-seed detect            # Analyze database schema
supa-seed validate-config   # Validate configuration
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

### **Basic Usage**
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

### **With AI Integration**
```typescript
import { SupaSeedFramework } from 'supa-seed';
import { AIAssetGenerator } from 'supa-seed/ai';

const seeder = new SupaSeedFramework(config);
const aiGenerator = new AIAssetGenerator();

// AI-enhanced seeding
const result = await aiGenerator.generateSeedData(
  'users', 
  10, 
  { domain: 'saas', style: 'professional' }
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

## 📊 Schema Support

### **Supported Frameworks**
- ✅ **MakerKit v1/v2/v3** - Full compatibility with automatic detection
- ✅ **Custom Supabase** - Works with any PostgreSQL schema
- ✅ **Simple Profiles** - Basic user/profile patterns
- ✅ **Wildernest Style** - Outdoor platform schemas

### **Auto-Detection**
The framework automatically detects:
- MakerKit version and configuration
- Custom table structures
- Relationship patterns
- Asset compatibility
- Required migrations

### **Schema Evolution**
- Automatic change detection
- Migration suggestions
- Interactive configuration updates
- Backup and rollback support

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

### **v2.1.0 - Enhanced AI**
- Multiple AI provider support (OpenAI, Anthropic)
- Custom prompt templates
- AI model fine-tuning support

### **v2.2.0 - Advanced Analytics**
- Database performance analytics
- Seeding impact analysis
- Custom metrics and dashboards

### **v2.3.0 - Enterprise Features**
- RBAC and team collaboration
- Audit logging and compliance
- Advanced security features

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Supabase community
- Powered by Faker.js for realistic data generation
- AI features supported by Ollama for privacy-first intelligence
- Inspired by the needs of modern full-stack development

---

**Made by developers, for developers. Transform your database seeding experience with supa-seed v2.0.0.**

🌱 **Happy Seeding!**