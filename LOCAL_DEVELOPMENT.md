# Local Development with Supa-seed

## JWT Authentication in Local Environments

When using supa-seed with local Supabase environments, you may encounter JWT authentication issues with service role keys. This is a known issue with local Supabase development setups.

### ✅ **Recommended Solution: Use Anon Key**

For schema detection in local environments, **use the anon key instead of the service role key**:

```bash
# Get your anon key
supabase status | grep "anon key"

# Use anon key for detection (recommended for local development)
npx supa-seed detect --url "http://127.0.0.1:54321" --key "[YOUR_ANON_KEY]"
```

### 🎯 **Why This Works**

- **Anon keys** have sufficient permissions for schema detection
- **Service role keys** may fail JWT validation in local Supabase environments
- **Framework detection** works perfectly with anon keys
- **All supa-seed features** are fully functional with anon keys

### 🔧 **Error Symptoms**

If you see errors like:
```
JWSError JWSInvalidSignature
Table 'accounts' not found in local environment: JWSError JWSInvalidSignature
```

This indicates a JWT authentication issue with your service role key in the local environment.

### 💡 **Quick Command**

```bash
# One-liner to detect with anon key
npx supa-seed detect --verbose --url "http://127.0.0.1:54321" --key "$(supabase status | grep 'anon key:' | cut -d: -f2 | xargs)"
```

### 🚀 **Expected Results**

With anon key, you should see perfect detection:

```
📋 Enhanced schema detected: {
  primaryUserTable: 'accounts',
  makerkitVersion: 'v2',
  frameworkType: 'makerkit',
  customTables: 7,
  relationships: 2
}

📊 Database Schema Analysis:
   🏗️  Framework detected: makerkit
   👤 Has accounts table: ✅
   📝 Has setups table: ✅
```

## Cloud Environments

For production/staging environments, service role keys work as expected. This issue is specific to local development environments.