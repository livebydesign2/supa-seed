# SupaSeed Testing Strategy for AI Agents

**Purpose**: Comprehensive testing guidelines for AI agents working on SupaSeed CLI features and fixes.

---

## 🎯 **Testing Philosophy**

### **Core Principles**
- **CLI-First**: Every change must be validated through CLI commands
- **Database-Safe**: All tests must handle database operations safely
- **Framework-Agnostic**: Tests must work across MakerKit and generic Supabase schemas
- **Constraint-Aware**: Validate that database constraints are respected

### **Testing Pyramid for CLI Tools**
```
┌─────────────────────────────────────┐
│           E2E CLI Tests             │  ← Full command workflows
│         (npm run test:cli)          │
├─────────────────────────────────────┤
│        Integration Tests            │  ← Database + CLI integration  
│    (npm run test:integration)      │
├─────────────────────────────────────┤
│           Unit Tests                │  ← Individual functions/classes
│        (npm test)                   │
└─────────────────────────────────────┘
```

---

## 🔄 **Mandatory Testing Workflow for AI Agents**

### **Before Starting Any Task**
```bash
# 0. Navigate to project (CRITICAL - all commands assume this location)
cd /Users/tylerbarnard/Developer/Apps/supa-seed/

# 1. Verify current test baseline
npm test                 # Should pass (or document known failures)
npm run typecheck       # Should pass (or fix TypeScript first)
npm run build           # Should complete successfully

# 2. Test CLI functionality
node dist/cli.js --help        # Verify CLI loads
node dist/cli.js detect        # Test framework detection
```

### **During Development**
```bash
# After each logical code change:
npm run typecheck              # Catch type errors early
npm test -- [relevant-test]   # Run specific tests for your area

# After interface/type changes:
npm run build                  # Ensure compilation works
node dist/cli.js --help       # Verify CLI still loads
```

### **Before Completing Task**
```bash
# 1. Full validation suite
npm run build                  # Clean compilation
npm test                       # All tests pass
npm run typecheck             # Zero TypeScript errors

# 2. CLI regression testing
node dist/cli.js --help       # Command help works
node dist/cli.js detect       # Framework detection works
node dist/cli.js status       # Status command works

# 3. Integration testing (if applicable)
node dist/cli.js seed --help  # Seeding commands available
# NOTE: Full seeding tests require database setup
```

---

## 🧪 **Test Categories & Commands**

### **1. TypeScript Validation**
```bash
# Type checking (most important for current v2.4.3)
npm run typecheck            # Zero compilation errors

# Build validation
npm run build               # Creates clean dist/ output
npm run build:check         # Type check without emit
```

### **2. Unit Tests**
```bash
# All unit tests
npm test

# Specific test files
npm test -- constraint-enforcement.test.ts
npm test -- makerkit-integration.test.ts

# Watch mode during development
npm run test:watch

# Coverage reporting
npm run test:coverage
```

### **3. Integration Tests**
```bash
# Database integration tests
npm run test:integration    # (if script exists)
npm test -- comprehensive-test-suite.test.ts

# Framework compatibility tests
npm test -- makerkit-compatibility.test.ts
npm test -- enhanced-schema-detection.test.ts
```

### **4. CLI Functional Tests**
```bash
# Basic CLI functionality
node dist/cli.js --version           # Version check
node dist/cli.js --help             # Command help
node dist/cli.js detect --help      # Subcommand help

# Framework detection (no database required)
node dist/cli.js detect             # Should show detection results

# Status and info commands
node dist/cli.js status             # Should show current state
```

### **5. Performance & Production Tests**
```bash
# Performance benchmarks
npm test -- performance-benchmarks.test.ts

# Production hardening validation  
npm test -- production-hardening.test.ts

# AI integration tests
npm test -- ai-integration.test.ts
```

---

## 📋 **Testing Checklist for Each Task Type**

### **TypeScript/Interface Fixes**
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run build` completes successfully  
- [ ] `npm test` passes (no regression)
- [ ] CLI commands still work: `node dist/cli.js --help`

### **CLI Command Changes**
- [ ] Command help shows correctly: `node dist/cli.js [command] --help`
- [ ] Command runs without errors: `node dist/cli.js [command]`
- [ ] Error handling works: `node dist/cli.js [command] --invalid-flag`
- [ ] All related unit tests pass: `npm test -- [command].test.ts`

### **Database/Schema Changes**
- [ ] Schema detection still works: `node dist/cli.js detect`
- [ ] Constraint-related tests pass: `npm test -- constraint*.test.ts`
- [ ] MakerKit compatibility maintained: `npm test -- makerkit*.test.ts`
- [ ] **Warning**: Full seeding tests require database setup

### **Configuration System Changes**
- [ ] Configuration loading works: test with valid config file
- [ ] Error handling for invalid configs: test with malformed config
- [ ] Migration tests pass: `npm test -- *migrator*.test.ts`
- [ ] Interactive configuration tests: `npm test -- interactive*.test.ts`

---

## 🔧 **CLI Testing Patterns**

### **Testing Commands Without Database**
```typescript
// Test command structure and help text
describe('CLI Commands', () => {
  it('should show help for detect command', () => {
    const result = execSync('node dist/cli.js detect --help');
    expect(result.toString()).toContain('Detect framework');
  });
  
  it('should handle invalid arguments gracefully', () => {
    expect(() => {
      execSync('node dist/cli.js detect --invalid-flag');
    }).not.toThrow();
  });
});
```

### **Testing Framework Detection**
```typescript
// Test detection logic without actual seeding
describe('Framework Detection', () => {
  it('should detect MakerKit patterns', () => {
    // Mock database responses for MakerKit schema
    const detector = new FrameworkDetector(mockSupabaseClient);
    const result = detector.detectFramework();
    expect(result.framework).toBe('makerkit');
  });
});
```

### **Testing Configuration Loading**
```typescript
// Test configuration validation
describe('Configuration', () => {
  it('should load valid configuration', () => {
    const config = ConfigManager.load('test-config.json');
    expect(config.supabaseUrl).toBeDefined();
  });
  
  it('should validate required fields', () => {
    expect(() => {
      ConfigManager.load('invalid-config.json');
    }).toThrow('Missing required field');
  });
});
```

---

## 🚨 **Error Handling Testing**

### **Required Error Scenarios**
```bash
# CLI error handling
node dist/cli.js invalid-command        # Unknown command
node dist/cli.js detect --invalid       # Invalid flags
node dist/cli.js seed                   # Missing config

# Configuration errors
node dist/cli.js seed --config invalid.json    # Invalid config
node dist/cli.js seed --config missing.json    # Missing config
```

### **Database Error Scenarios**
```typescript
// Test database connection failures
describe('Database Errors', () => {
  it('should handle connection failures gracefully', async () => {
    const seeder = new SupaSeedFramework({
      supabaseUrl: 'invalid-url',
      supabaseServiceKey: 'invalid-key'
    });
    
    await expect(seeder.detect()).rejects.toThrow();
    // But should not crash the process
  });
});
```

---

## 📊 **Test Reporting & Validation**

### **Success Criteria for Tasks**
```bash
# All tasks must meet these criteria:
✅ npm run typecheck     # 0 errors
✅ npm run build        # Successful compilation  
✅ npm test             # All tests passing
✅ CLI loads: node dist/cli.js --help
✅ No regression in existing functionality
```

### **Coverage Requirements**
- **New Functions**: Must have unit tests
- **CLI Commands**: Must have functional tests
- **Error Handling**: Must have negative test cases
- **Integration Points**: Must have integration tests

### **Performance Validation**
```bash
# For performance-sensitive changes:
npm test -- performance-benchmarks.test.ts

# CLI responsiveness (should be < 2 seconds):
time node dist/cli.js detect
time node dist/cli.js --help
```

---

## 🔗 **Integration with Development Workflow**

### **Pre-Commit Testing**
```bash
# Minimal validation before any commit:
npm run typecheck && npm run build && npm test
```

### **PR/Release Testing**
```bash
# Full validation for releases:
npm run clean
npm install
npm run build
npm test
npm run test:coverage

# CLI smoke testing:
node dist/cli.js --version
node dist/cli.js --help
node dist/cli.js detect
```

### **Continuous Integration**
```yaml
# Example GitHub Actions workflow
- name: Test TypeScript
  run: npm run typecheck
  
- name: Run Tests  
  run: npm test
  
- name: Test CLI
  run: |
    npm run build
    node dist/cli.js --help
    node dist/cli.js detect
```

---

## 🎯 **Testing Anti-Patterns to Avoid**

### **❌ Don't Do This**
- Skip testing after "simple" TypeScript fixes
- Test only happy path scenarios
- Ignore CLI functional testing
- Make database-dependent tests without proper setup
- Commit without running `npm run typecheck`

### **✅ Do This Instead**
- Test both success and error scenarios
- Validate CLI commands actually work after changes  
- Use mocks for database-dependent tests when possible
- Run full test suite before committing
- Document any test setup requirements

---

## 📚 **Quick Reference Links**

### **Test Commands**
- **Type Check**: `npm run typecheck`
- **Build**: `npm run build`  
- **All Tests**: `npm test`
- **CLI Test**: `node dist/cli.js --help`
- **Coverage**: `npm run test:coverage`

### **Test Files Location**
- **Unit Tests**: `/tests/*.test.ts`
- **Test Setup**: `/tests/setup.ts`
- **Integration Tests**: `/tests/comprehensive-test-suite.test.ts`

### **Related Documentation**  
- **Contributing Guide**: `/contributing.md` (development setup)
- **Package Scripts**: `/package.json` (all available test commands)
- **TypeScript Config**: `/tsconfig.json` (compilation settings)

---

**Remember**: Testing is not optional - it's how we ensure SupaSeed remains reliable for database seeding across different frameworks and configurations.