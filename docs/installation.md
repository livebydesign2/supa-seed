# 📦 Supa-Seed v2.2.0 Installation Guide

Complete installation and setup guide for the constraint-aware database seeding platform.

## 🎯 Prerequisites

### **System Requirements**
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher (or yarn v1.22.0+)
- **PostgreSQL**: v12.0 or higher
- **Supabase**: Local CLI or cloud project

### **Verify Prerequisites**
```bash
node --version    # Should be v16+
npm --version     # Should be v7+
psql --version    # Should be v12+
```

## 🚀 Installation Methods

### **Method 1: Global Installation (Recommended)**

**Best for**: CLI usage across multiple projects

```bash
# Install globally
npm install -g supa-seed

# Verify installation
supa-seed --version  # Should show v2.2.0

# Check available commands
supa-seed --help
```

### **Method 2: Project-Specific Installation**

**Best for**: Integration into specific projects

```bash
# Install as dev dependency
npm install --save-dev supa-seed

# Or with yarn
yarn add --dev supa-seed

# Use with npx
npx supa-seed --version
```

### **Method 3: Development Installation**

**Best for**: Contributing to supa-seed

```bash
# Clone repository
git clone https://github.com/livebydesign2/supa-seed.git
cd supa-seed

# Install dependencies
npm install

# Build the project
npm run build

# Link for global usage
npm link

# Verify installation
supa-seed --version
```

## 🏗️ Environment Setup

### **Option A: Local Supabase (Recommended for Development)**

#### **1. Install Supabase CLI**
```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Or with Homebrew on macOS
brew install supabase/tap/supabase
```

#### **2. Initialize Supabase Project**
```bash
# In your project directory
supabase init

# Start local Supabase
supabase start
```

#### **3. Get Local Credentials**
```bash
# View local project status
supabase status

# Example output:
# API URL: http://127.0.0.1:54321
# Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **4. Configure Environment**
```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
NODE_ENV=local
EOF
```

### **Option B: Cloud Supabase**

#### **1. Create Supabase Project**
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Wait for setup to complete

#### **2. Get Credentials**
1. Go to **Settings** → **API**
2. Copy **Project URL**
3. Copy **service_role** key (not anon key!)

#### **3. Configure Environment**
```bash
# Create .env file
cat > .env << EOF
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NODE_ENV=production
EOF
```

## 🗄️ Database Schema Setup

### **Choose Schema Type**

Supa-seed includes multiple schema options:

| Schema File | Use Case | Features |
|-------------|----------|----------|
| `schema.sql` | General projects | Full feature set, recommended |
| `schema-makerkit.sql` | MakerKit projects | MakerKit v3 compatible |
| `schema-minimal.sql` | Testing/Demo | Minimal tables only |

### **Local Supabase Schema Setup**

```bash
# Option 1: Direct PostgreSQL
psql -h localhost -U postgres -d postgres -f node_modules/supa-seed/schema.sql

# Option 2: Via Supabase CLI
supabase db reset
# Then paste schema content in Supabase Dashboard → SQL Editor

# Option 3: Using schema file directly
cp node_modules/supa-seed/schema.sql supabase/migrations/001_supa_seed_schema.sql
supabase db reset
```

### **Cloud Supabase Schema Setup**

```bash
# Method 1: Copy and paste in Dashboard
cat node_modules/supa-seed/schema.sql
# Copy output, paste in Supabase Dashboard → SQL Editor → Run

# Method 2: Using psql (if you have connection string)
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres" -f node_modules/supa-seed/schema.sql
```

### **Verify Schema Installation**

```bash
# Test schema with supa-seed
supa-seed detect --verbose

# Expected output:
# ✅ All required tables found!
# Framework detected: custom/makerkit
```

## ⚙️ Configuration

### **Method 1: Interactive Setup (Recommended)**

```bash
# Run interactive setup wizard
supa-seed setup

# Follow prompts to configure:
# - Supabase credentials
# - Environment settings
# - AI integration (optional)
# - Performance settings
```

### **Method 2: Auto-Detection**

```bash
# Auto-detect schema and create config
supa-seed init --detect --env local

# For production
supa-seed init --detect --env production
```

### **Method 3: Manual Configuration**

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
    "enabled": false,
    "ollamaUrl": "http://localhost:11434",
    "fallbackToFaker": true
  },
  "performance": {
    "batchSize": 100,
    "enableMonitoring": true,
    "memoryLimit": 512
  }
}
```

## 🤖 AI Integration Setup (Optional)

### **Install Ollama (Local AI)**

#### **macOS/Linux**
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
ollama serve

# Pull recommended model
ollama pull llama3.1:latest
```

#### **Windows** 
1. Download from [ollama.ai](https://ollama.ai/download)
2. Run installer
3. Open command prompt:
```cmd
ollama serve
ollama pull llama3.1:latest
```

#### **Docker**
```bash
# Run Ollama in Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Pull model
docker exec -it ollama ollama pull llama3.1:latest
```

### **Configure AI Integration**

```bash
# Test AI connectivity
supa-seed ai status

# Enable AI in configuration
supa-seed init --ai --ollama-url http://localhost:11434
```

## ✅ Verification & Testing

### **1. Basic Functionality Test**

```bash
# Check installation
supa-seed --version

# Test database connectivity
supa-seed detect

# Run health check
supa-seed health
```

### **2. Configuration Test**

```bash
# Validate configuration
supa-seed validate-config

# Test with minimal seeding
supa-seed seed --users 2 --setups 1 --images 0
```

### **3. AI Integration Test (if enabled)**

```bash
# Check AI status
supa-seed ai status

# Test AI generation
supa-seed ai test

# Run AI-enhanced seeding
supa-seed seed --ai --users 3
```

### **4. Performance Test**

```bash
# Run with monitoring
supa-seed seed --users 10 --verbose

# Check performance metrics
supa-seed analyze

# Memory status
supa-seed memory status
```

## 🔧 Troubleshooting Installation

### **Common Installation Issues**

#### **"Module not found" errors**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm uninstall -g supa-seed
npm install -g supa-seed

# Verify Node.js version
node --version  # Must be v16+
```

#### **"Permission denied" on global install**
```bash
# Fix npm permissions (Unix/macOS)
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use nvm for Node version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
npm install -g supa-seed
```

#### **"Command not found: supa-seed"**
```bash
# Check installation location
npm list -g supa-seed

# Add to PATH if needed (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$(npm config get prefix)/bin"

# Or use npx
npx supa-seed --version
```

### **Database Connection Issues**

#### **Local Supabase not responding**
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start

# Check ports
lsof -i :54321  # Should show supabase process
```

#### **Cloud Supabase connection failed**
```bash
# Verify credentials
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection with curl
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/"
```

#### **Schema not found errors**
```bash
# Re-apply schema
supa-seed detect --verbose

# If tables missing, re-run schema
psql -h localhost -U postgres -d postgres -f node_modules/supa-seed/schema.sql
```

### **AI Integration Issues**

#### **Ollama connection failed**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# Start Ollama if not running
ollama serve

# Check available models
ollama list
```

#### **AI generation errors**
```bash
# Test with fallback enabled
supa-seed seed --ai --fallback

# Check AI status
supa-seed ai status

# Use Faker.js only if AI unavailable
supa-seed seed --no-ai
```

## 🔄 Upgrading from v1.x

### **Breaking Changes**

⚠️ **Important**: v2.2.0 includes constraint-aware features and maintains v2.1.0 compatibility

#### **Configuration Format**
```bash
# Backup old config
cp supa-seed.config.json supa-seed.config.v1.backup.json

# Create new v2.0 config
supa-seed init --detect

# Manually migrate custom settings
```

#### **CLI Commands**
- `supa-seed run` → `supa-seed seed`
- New commands: `health`, `analyze`, `memory`, `ai`
- Enhanced commands: `status --detailed`, `init --detect`

#### **Schema Updates**
```bash
# Check for required schema updates
supa-seed detect --verbose

# Apply any missing schema changes
# (supa-seed will provide specific SQL if needed)
```

### **Migration Steps**

1. **Backup existing data**
   ```bash
   supa-seed export --type data > backup-v1.json
   ```

2. **Uninstall v1.x**
   ```bash
   npm uninstall -g supa-seed
   ```

3. **Install v2.0.0**
   ```bash
   npm install -g supa-seed@2.0.0
   ```

4. **Update configuration**
   ```bash
   supa-seed init --detect
   ```

5. **Test installation**
   ```bash
   supa-seed health
   supa-seed seed --users 2  # Test run
   ```

## 📞 Getting Help

### **Documentation**
- [README.md](README.md) - Main documentation
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Detailed troubleshooting
- [Project Progress](docs/PROJECT-PROGRESS-TRACKER.md) - Development history

### **Command Help**
```bash
supa-seed --help           # General help
supa-seed seed --help      # Command-specific help
supa-seed health --detailed # Detailed system status
```

### **Community**
- GitHub Issues: [Report bugs or request features](https://github.com/livebydesign2/supa-seed/issues)
- Discussions: [Community support and questions](https://github.com/livebydesign2/supa-seed/discussions)

### **Support Checklist**

Before seeking help, please run:

```bash
# Collect diagnostic information
supa-seed --version
supa-seed health --detailed
supa-seed detect --verbose
supa-seed analyze --export json > diagnostics.json

# Include this information when reporting issues
```

---

## ✅ Quick Installation Summary

**For impatient developers:**

```bash
# 1. Install
npm install -g supa-seed

# 2. Setup local Supabase
supabase start

# 3. Apply schema
psql -h localhost -U postgres -d postgres -f node_modules/supa-seed/schema.sql

# 4. Configure
echo "SUPABASE_URL=http://127.0.0.1:54321" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=$(supabase status | grep 'service_role key' | cut -d':' -f2 | xargs)" >> .env

# 5. Initialize and seed
supa-seed init --env local
supa-seed seed

# 🎉 Done!
```

**Installation complete!** You now have a fully functional enterprise-grade database seeding platform.

🌱 **Happy seeding with supa-seed v2.2.0!**