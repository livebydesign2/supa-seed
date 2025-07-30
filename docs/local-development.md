# Local Development with SupaSeed v2.4.1

## 🏗️ MakerKit Integration Complete

**SupaSeed v2.4.1** provides seamless local development with full MakerKit integration, hybrid user strategies, and comprehensive framework detection.

### **Key Features:**
- ✅ **Full MakerKit Support**: Accounts-only architecture with JSONB public_data
- ✅ **Hybrid User Strategy**: Combines existing + new user generation  
- ✅ **Framework Auto-Detection**: Automatically detects MakerKit vs generic Supabase
- ✅ **Outdoor Domain Content**: 36+ realistic setups across 12 personas
- ✅ **Local & Cloud Ready**: Works seamlessly in both environments

### **Quick Start:**
```bash
npm install -g supa-seed@2.4.1
```

## Local Development Setup

### 🎯 **MakerKit + Local Supabase**

For MakerKit projects with local Supabase development:

```bash
# 1. Start local Supabase
supabase start

# 2. Auto-detect MakerKit framework and create config
supa-seed init --detect

# 3. Seed with hybrid strategy (preserves existing accounts)
supa-seed seed

# Expected result: 
# - Uses existing accounts if any
# - Creates additional users to reach target count
# - Generates realistic outdoor setups
```

### 🏗️ **Framework Detection**

SupaSeed automatically detects your framework and configures accordingly:

```bash
# Run framework detection
supa-seed detect --verbose

# For MakerKit, you'll see:
# ✅ Framework: MakerKit v3+
# ✅ Primary table: accounts  
# ✅ Accounts-only architecture detected
# ✅ JSONB public_data field available
```

### ⚙️ **Configuration for MakerKit**

The generated config will be optimized for MakerKit:

```json
{
  "supabaseUrl": "http://127.0.0.1:54321",
  "supabaseServiceKey": "your-local-service-key",
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

### 🎯 **User Strategy Options**

- **`hybrid`** (default): Uses existing accounts + creates new ones to reach target
- **`create-new`**: Creates entirely new accounts 
- **`use-existing`**: Only uses existing accounts in database

### 🚀 **Verification**

After seeding, verify the results:

```bash
# Check seeding results
supa-seed status

# Should show:
# 👥 Users: 12 accounts (X existing + Y new)
# 🏔️  Setups: 36 outdoor scenarios 
# 📊 Personas: 12 diverse archetypes
# ✅ All data successfully created
```

## Advanced Local Development

### 🧪 **Testing Different Strategies**

```bash
# Test with create-new strategy
supa-seed seed --user-strategy create-new --users 5

# Test with use-existing only  
supa-seed seed --user-strategy use-existing

# Test with different domains
supa-seed seed --domain saas --users 8
```

### 🔧 **Development Workflow**

```bash
# 1. Clean existing data
supa-seed cleanup --force

# 2. Seed fresh data
supa-seed seed

# 3. Check status  
supa-seed status

# 4. Export for backup (optional)
supa-seed export --format json > backup.json
```

### 🏗️  **MakerKit Schema Compatibility**

SupaSeed handles MakerKit's unique schema requirements:

- **Accounts-only**: No `profiles` table dependency
- **Personal accounts**: Sets `is_personal_account = true` 
- **JSONB fields**: Stores bio/username in `public_data`
- **Constraint handling**: Manages unique constraints gracefully

### 📊 **Performance Optimization**

For local development, these settings provide optimal performance:

```json
{
  "performance": {
    "batchSize": 50,
    "enableMonitoring": true,
    "memoryLimit": 256
  }
}
```

## Cloud Environment Support

SupaSeed works seamlessly with both local and cloud Supabase environments. For production deployments, ensure you're using the service role key and proper configuration.