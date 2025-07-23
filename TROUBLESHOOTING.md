# 🔧 Supa-Seed v2.0.0 Troubleshooting Guide

Comprehensive troubleshooting guide for production features, common issues, and advanced debugging.

## 🚨 Emergency Quick Fixes

### **System Not Responding**
```bash
# Kill and restart everything
pkill -f supa-seed
supa-seed memory cleanup
supa-seed health --detailed
```

### **Database Connection Lost**
```bash
# Test connectivity
supa-seed detect --verbose
# If fails, check credentials and restart Supabase
```

### **Out of Memory Errors**
```bash
# Immediate cleanup
supa-seed memory cleanup
# Reduce batch size
supa-seed seed --batch-size 10 --memory-limit 256
```

## 🔍 Diagnostic Commands

Before troubleshooting, gather system information:

```bash
# System health check
supa-seed health --detailed

# Performance analysis
supa-seed analyze --export json > diagnostics.json

# Memory status
supa-seed memory status

# Configuration validation
supa-seed validate-config --strict

# Database schema analysis
supa-seed detect --verbose

# AI service status (if enabled)
supa-seed ai status
```

## 🗄️ Database Issues

### **Connection Problems**

#### **"Database connection failed"**

**Symptoms:** Cannot connect to Supabase database

**Local Supabase:**
```bash
# Check if Supabase is running
supabase status

# Restart if needed
supabase stop && supabase start

# Verify port availability
lsof -i :54321

# Test connection manually
psql -h localhost -U postgres -d postgres -c "SELECT version();"
```

**Cloud Supabase:**
```bash
# Verify environment variables
echo "URL: $SUPABASE_URL"
echo "Key length: ${#SUPABASE_SERVICE_ROLE_KEY}"

# Test API connectivity
curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     "$SUPABASE_URL/rest/v1/"

# Expected: JSON response, not 401 Unauthorized
```

**Common Solutions:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` (not anon key)
- Check URL format: `https://xxx.supabase.co` (no trailing slash)
- Ensure firewall allows connections
- Verify project isn't paused (cloud)

#### **"Schema validation failed"**

**Symptoms:** Missing tables or incorrect schema structure

```bash
# Check current schema
supa-seed detect --verbose

# Expected output should show:
# ✅ All required tables found!

# If missing tables, re-apply schema
psql -f node_modules/supa-seed/schema.sql

# For cloud Supabase, use Dashboard SQL Editor
```

**Table Creation Issues:**
```sql
-- Check table existence manually
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('accounts', 'profiles', 'setups', 'categories');

-- Check permissions
SELECT * FROM information_schema.table_privileges 
WHERE table_name = 'accounts';
```

#### **"RLS Policy Errors"**

**Symptoms:** Row Level Security preventing inserts

```sql
-- Temporarily disable RLS for seeding (NOT for production)
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Or create permissive policy for service role
CREATE POLICY "Service role full access" ON accounts
FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**⚠️ Warning:** Re-enable RLS after seeding for security.

### **Performance Issues**

#### **"Seeding is very slow"**

**Symptoms:** Operations taking >30 seconds for small datasets

```bash
# Check performance metrics
supa-seed analyze

# Identify bottlenecks
supa-seed seed --verbose --batch-size 10

# Monitor memory usage
supa-seed memory status
```

**Common Causes & Solutions:**

1. **Large batch sizes:**
   ```bash
   supa-seed seed --batch-size 25  # Default is 100
   ```

2. **Network latency (cloud):**
   ```bash
   # Use local Supabase for development
   supabase start
   supa-seed seed --env local
   ```

3. **Resource constraints:**
   ```bash
   # Increase memory limit
   supa-seed seed --memory-limit 1024
   
   # Reduce concurrent operations
   supa-seed seed --users 5 --setups 2
   ```

4. **Database locks:**
   ```sql
   -- Check for blocking queries
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   
   -- Kill long-running queries if needed
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE query LIKE '%supa-seed%' AND state = 'idle in transaction';
   ```

## 🤖 AI Integration Issues

### **"AI service unavailable"**

**Symptoms:** AI features not working, falling back to Faker.js

```bash
# Check Ollama status
supa-seed ai status

# Expected output:
# ✅ AI service available
# Model: llama3.1:latest
# Response time: <500ms
```

**Ollama Not Running:**
```bash
# Start Ollama
ollama serve

# Check if port is available
lsof -i :11434

# Test manual connection
curl http://localhost:11434/api/version
```

**No Models Available:**
```bash
# List installed models
ollama list

# If empty, pull recommended model
ollama pull llama3.1:latest

# Or smaller model for testing
ollama pull tinyllama
```

**Connection Issues:**
```bash
# Check firewall/proxy settings
telnet localhost 11434

# Try different port if needed
supa-seed seed --ai --ollama-url http://localhost:11435
```

### **"AI generation timeout"**

**Symptoms:** AI requests hanging or timing out

```bash
# Test with smaller model
ollama pull tinyllama
supa-seed ai test --model tinyllama

# Increase timeout
supa-seed seed --ai --timeout 60000  # 60 seconds

# Use fallback mode
supa-seed seed --ai --fallback
```

**Resource Issues:**
```bash
# Check system resources
top | grep ollama

# Free up memory
supa-seed memory cleanup

# Use smaller batch sizes with AI
supa-seed seed --ai --batch-size 5
```

## 🧠 Memory Management Issues

### **"High memory usage detected"**

**Symptoms:** System becoming slow, warnings about memory usage

```bash
# Check current memory usage
supa-seed memory status

# Expected healthy status:
# Memory Usage: <60% of limit
# No urgent recommendations
```

**Immediate Actions:**
```bash
# Force cleanup
supa-seed memory cleanup

# Restart with lower limits
supa-seed seed --memory-limit 256

# Use smaller datasets
supa-seed seed --env local  # Uses smaller defaults
```

**Configuration Adjustments:**
```json
{
  "performance": {
    "batchSize": 25,
    "memoryLimit": 512,
    "enableMonitoring": true
  }
}
```

### **"Memory leak detected"**

**Symptoms:** Memory usage continuously growing

```bash
# Monitor memory growth
supa-seed memory status --watch

# Analyze memory patterns
supa-seed analyze --export json | grep -i memory

# Force garbage collection
node --expose-gc $(which supa-seed) seed --memory-limit 256
```

**Investigation Steps:**
1. Run with minimal data to isolate leak
2. Check for unclosed database connections
3. Monitor file handle usage
4. Use profiling tools if needed

## 📊 Performance Monitoring Issues

### **"Performance metrics not available"**

**Symptoms:** `supa-seed analyze` returns empty results

```bash
# Check if monitoring is enabled
grep -i monitoring supa-seed.config.json

# Enable monitoring
supa-seed seed --enable-monitoring

# Verify metrics collection
supa-seed analyze --detailed
```

**Enable Monitoring:**
```json
{
  "performance": {
    "enableMonitoring": true,
    "metricsRetention": 1000
  }
}
```

### **"Circuit breaker activated"**

**Symptoms:** Services repeatedly failing, automatic fallback engaged

```bash
# Check circuit breaker status
supa-seed health --detailed

# Look for services in "open" state
# Expected: All services "closed" or "half-open"
```

**Reset Circuit Breakers:**
```bash
# Manual reset (use carefully)
supa-seed health --reset-circuit-breakers

# Or wait for automatic recovery (recommended)
```

**Prevent Future Activations:**
1. Fix underlying service issues
2. Increase failure thresholds if needed
3. Improve network connectivity

## ⚙️ Configuration Issues

### **"Configuration validation failed"**

**Symptoms:** Startup errors about invalid configuration

```bash
# Validate configuration
supa-seed validate-config --strict

# Common issues will be highlighted with suggestions
```

**Common Configuration Errors:**

1. **Invalid URLs:**
   ```bash
   # Fix URL format
   SUPABASE_URL=https://project.supabase.co  # Not http://
   ```

2. **Wrong API key type:**
   ```bash
   # Use service_role key, not anon key
   # Service key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   # Anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (shorter)
   ```

3. **Environment mismatches:**
   ```json
   {
     "environment": "production",
     "supabaseUrl": "http://127.0.0.1:54321"  // Should be https:// for production
   }
   ```

### **"Environment variables not found"**

**Symptoms:** Configuration loading from environment fails

```bash
# Check environment variables
env | grep SUPABASE

# Load from .env file
supa-seed seed --env-file .env.local

# Verify .env file format
cat .env
# Should NOT have spaces around =
# CORRECT: SUPABASE_URL=https://...
# WRONG:   SUPABASE_URL = https://...
```

## 🎨 Asset Management Issues

### **"Assets not found"**

**Symptoms:** No images, markdown, or JSON assets loaded

```bash
# Check asset directory structure
ls -la assets/
# Expected: images/, markdown/, json/ directories

# Test asset loading
supa-seed seed --assets-strategy all --verbose
```

**Fix Asset Issues:**
```bash
# Create asset directories
mkdir -p assets/{images,markdown,json}

# Add sample assets
echo "# Sample content" > assets/markdown/sample.md
echo '{"test": "data"}' > assets/json/sample.json

# Test loading
supa-seed templates list
```

### **"Image processing failed"**

**Symptoms:** Images not uploading to Supabase Storage

```bash
# Check Supabase Storage configuration
# Go to Dashboard → Storage → Create bucket if needed

# Test with smaller images
supa-seed seed --images-per-setup 1 --verbose

# Disable real images if Unsplash key missing
supa-seed seed --no-real-images
```

## 🔄 System Integration Issues

### **"Service health degraded"**

**Symptoms:** Multiple services showing errors in health check

```bash
# Comprehensive health check
supa-seed health --detailed

# Check individual services
supa-seed ai status      # AI service
supa-seed detect         # Database
supa-seed memory status  # Memory management
```

**System Recovery:**
```bash
# Restart all services
supa-seed health --restart-services

# Clear all caches
supa-seed memory cleanup
supa-seed ai clear-cache

# Reset to known good state
supa-seed cleanup --force
supa-seed seed --env local --users 2
```

### **"Template system errors"**

**Symptoms:** Template generation or validation failing

```bash
# Check template system
supa-seed templates validate

# List available templates
supa-seed templates list

# Regenerate template cache
supa-seed templates refresh
```

## 🐛 Advanced Debugging

### **Enable Debug Mode**

```bash
# Maximum verbosity
DEBUG=supa-seed:* supa-seed seed --verbose

# Specific debug categories
DEBUG=supa-seed:database supa-seed seed
DEBUG=supa-seed:ai supa-seed seed --ai
DEBUG=supa-seed:performance supa-seed analyze
```

### **Performance Profiling**

```bash
# Profile memory usage
node --inspect $(which supa-seed) seed --users 10

# Profile CPU usage
node --prof $(which supa-seed) seed --users 50
node --prof-process isolate-*.log > profile.txt
```

### **Database Query Analysis**

```sql
-- Enable query logging (PostgreSQL)
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### **Network Analysis**

```bash
# Monitor network traffic
netstat -an | grep :54321  # Local Supabase
netstat -an | grep :443    # Cloud Supabase

# Test latency
ping supabase.co
curl -w "@curl-format.txt" -o /dev/null -s "$SUPABASE_URL/rest/v1/"
```

### **Log Analysis**

```bash
# Export detailed logs
supa-seed seed --verbose 2>&1 | tee supa-seed.log

# Analyze error patterns
grep -i error supa-seed.log | sort | uniq -c

# Check timing information
grep -i "completed in" supa-seed.log

# Monitor memory usage over time
grep -i "memory" supa-seed.log | tail -20
```

## 📞 Getting Additional Help

### **Collecting Diagnostic Information**

Before reporting issues, collect comprehensive diagnostics:

```bash
#!/bin/bash
# Save as collect-diagnostics.sh

echo "=== Supa-Seed Diagnostics ===" > diagnostics.txt
echo "Date: $(date)" >> diagnostics.txt
echo "Version: $(supa-seed --version)" >> diagnostics.txt
echo "Node: $(node --version)" >> diagnostics.txt
echo "OS: $(uname -a)" >> diagnostics.txt
echo "" >> diagnostics.txt

echo "=== Health Check ===" >> diagnostics.txt
supa-seed health --detailed >> diagnostics.txt 2>&1
echo "" >> diagnostics.txt

echo "=== Configuration ===" >> diagnostics.txt
supa-seed validate-config >> diagnostics.txt 2>&1
echo "" >> diagnostics.txt

echo "=== Performance Analysis ===" >> diagnostics.txt
supa-seed analyze --export json >> diagnostics.json 2>&1
echo "Performance data exported to diagnostics.json" >> diagnostics.txt
echo "" >> diagnostics.txt

echo "=== Schema Analysis ===" >> diagnostics.txt
supa-seed detect --verbose >> diagnostics.txt 2>&1
echo "" >> diagnostics.txt

echo "=== AI Status ===" >> diagnostics.txt
supa-seed ai status >> diagnostics.txt 2>&1
echo "" >> diagnostics.txt

echo "Diagnostics collected in diagnostics.txt and diagnostics.json"
```

### **Common Support Questions**

**Q: Can I use supa-seed in production?**
A: Yes! v2.0.0 is production-ready with enterprise features like monitoring, error recovery, and performance optimization.

**Q: Does AI integration require internet?**
A: No! Ollama runs locally for privacy. No data is sent to external services.

**Q: How much memory does supa-seed use?**
A: Default limit is 512MB, configurable. Use `supa-seed memory status` to monitor usage.

**Q: Can I customize the generated data?**
A: Yes! Use AI prompts, custom templates, and asset integration for tailored data.

**Q: How do I contribute or report bugs?**
A: Visit [GitHub Issues](https://github.com/livebydesign2/supa-seed/issues) with diagnostics information.

### **Community Resources**

- **Documentation**: [README.md](README.md), [INSTALLATION.md](INSTALLATION.md)
- **Examples**: [examples/](examples/) directory
- **Issues**: [GitHub Issues](https://github.com/livebydesign2/supa-seed/issues)
- **Discussions**: [GitHub Discussions](https://github.com/livebydesign2/supa-seed/discussions)

---

## ✅ Troubleshooting Checklist

When encountering issues:

- [ ] Run `supa-seed health --detailed`
- [ ] Check `supa-seed --version` (should be v2.0.0)
- [ ] Verify database connectivity with `supa-seed detect`
- [ ] Validate configuration with `supa-seed validate-config`
- [ ] Check memory usage with `supa-seed memory status`
- [ ] Try with minimal data: `supa-seed seed --users 2`
- [ ] Enable verbose logging: `supa-seed seed --verbose`
- [ ] Collect diagnostics before reporting issues

**Most issues can be resolved by following this systematic approach!**

🔧 **Happy troubleshooting with supa-seed v2.0.0!**