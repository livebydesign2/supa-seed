# Local Development with Supa-seed

## ✅ JWT Authentication Issues RESOLVED in v2.0.3

**Great news!** The JWT authentication issues with service role keys in local Supabase environments have been **fully resolved** in supa-seed v2.0.3.

### **What's Fixed:**
- ✅ **Service role keys now work** in local Supabase environments
- ✅ **Enhanced JWT validation** with unified handling for all key types
- ✅ **Automatic local environment detection** and specialized client configuration
- ✅ **Better error messages** if authentication still fails

### **Upgrade to Get the Fix:**
```bash
npm install supa-seed@latest
```

## JWT Authentication in Local Environments

**Historical Note**: Previous versions of supa-seed had JWT authentication issues with service role keys in local Supabase environments. This has been resolved in v2.0.3.

### 🎯 **Current Status: Both Keys Work**

As of v2.0.3, **both service role keys and anon keys work perfectly** in local environments:

```bash
# Both keys work now! Use whichever you prefer:

# Option 1: Service role key (now works!)
SERVICE_KEY=$(supabase status | grep 'service_role key:' | cut -d: -f2 | xargs)
npx supa-seed detect --url "http://127.0.0.1:54321" --key "$SERVICE_KEY"

# Option 2: Anon key (always worked, still works)
ANON_KEY=$(supabase status | grep 'anon key:' | cut -d: -f2 | xargs)
npx supa-seed detect --url "http://127.0.0.1:54321" --key "$ANON_KEY"
```

### 🎯 **How the Fix Works**

- **Enhanced client creation** with specialized local environment handling
- **Unified JWT validation** treats both key types consistently
- **Automatic detection** of local Supabase environments (127.0.0.1, localhost, :54321)
- **Improved client options** for better local development support

### 🔧 **Legacy Error Symptoms (Pre-v2.0.3)**

If you're still using an older version and see errors like:
```
JWSError JWSInvalidSignature
Table 'accounts' not found in local environment: JWSError JWSInvalidSignature
```

**Solution**: Upgrade to v2.0.3 or later:
```bash
npm install supa-seed@latest
```

### 💡 **Quick Commands for v2.0.3+**

```bash
# Test with service role key (now works!)
npx supa-seed detect --verbose --url "http://127.0.0.1:54321" --key "$(supabase status | grep 'service_role key:' | cut -d: -f2 | xargs)"

# Or test with anon key (still works perfectly)
npx supa-seed detect --verbose --url "http://127.0.0.1:54321" --key "$(supabase status | grep 'anon key:' | cut -d: -f2 | xargs)"
```

### 🚀 **Expected Results**

With v2.0.3+, both keys should produce identical successful output:

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