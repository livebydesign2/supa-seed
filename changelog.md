# Changelog

All notable changes to supa-seed will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.8] - 2025-07-30

### 🚨 Critical Fix - FEAT-006 Data Generation Scaling Fixes

**Resolves critical data generation scaling issue where framework generated 750-1500x more data than configured.**

#### Fixed
- **🔥 CRITICAL: Massive Data Overflow**: Fixed setup seeder to respect `tables.setups.count` as total count instead of per-user multiplier
- **🔥 CRITICAL: Process Timeouts**: Eliminated process timeouts by generating reasonable dataset sizes instead of 60K+ records
- **🔥 CRITICAL: Uncontrolled Scaling**: Framework now generates exactly configured count instead of random per-user multiplication
- **🔥 CRITICAL: Development Unusability**: Framework now creates reasonable test datasets suitable for development work

#### Added
- **Total Count Distribution**: Smart distribution of total configured count across all users
- **Intelligent Distribution Algorithm**: Spreads N setups across M users with even distribution plus remainder handling
- **Safety Limits**: Hard upper limit prevents accidental massive data generation (max 1000 setups)
- **Enhanced Logging**: Clear visibility into count mode (total vs per-user) and distribution logic
- **Count Validation**: Post-generation validation confirms exact count achieved

#### Technical Details
- **Root Cause**: SetupSeeder used `setupsPerUser` as maximum per user instead of reading `tables.setups.count` as total
- **Solution**: Added distribution logic that calculates `Math.floor(totalCount / userCount)` per user with remainder distribution
- **Safety**: Added MAX_REASONABLE_SETUPS limit of 1000 with clear error message for larger requests
- **Backward Compatibility**: Falls back to legacy `setupsPerUser` behavior when new configuration not provided

#### Configuration Behavior
- **New Behavior**: `tables.setups.count: 8` generates exactly 8 setups total distributed across users
- **Legacy Behavior**: `setupsPerUser: 3` still works as before (1-3 setups per user)
- **Distribution Logic**: 8 setups across 5 users = 1-2 setups per user (base + remainder)
- **Edge Cases**: If count < users, some users get 0 setups

#### Performance Results
- **Data Generation**: Exactly configured count (was: 750-1500x overflow)
- **Process Time**: <30 seconds for reasonable datasets (was: timeout >2 minutes)
- **Memory Usage**: Proportional to configured count (was: excessive due to massive generation)
- **Development Usability**: Suitable for reasonable test datasets (was: unusable due to data bloat)

#### Example Configurations
```json
// New total count approach (v2.4.8)
{
  "tables": {
    "setups": {
      "count": 8,  // Exactly 8 setups total
      "categories": ["overlanding", "van-life", "car-camping", "backpacking"]
    }
  }
}

// Legacy per-user approach (still supported)
{
  "setupsPerUser": 3  // 1-3 setups per user
}
```

#### Breaking Changes
- None - All changes are backward compatible with existing configurations

---

## [2.4.7] - 2025-07-30

### 🚨 Critical Fix - FEAT-005 Enum Configuration Fixes

**Resolves critical enum configuration issue where framework ignored user-provided categories and generated invalid enum values.**

#### Fixed
- **🔥 CRITICAL: Configuration Ignored**: Fixed setup seeder to respect `tables.setups.categories` from user configuration instead of generating hardcoded category names
- **🔥 CRITICAL: Invalid Enum Values**: Framework now validates configured categories against database enum constraints before data generation
- **🔥 CRITICAL: Database Constraint Violations**: Eliminated PostgreSQL enum constraint violations by using only configured categories
- **🔥 CRITICAL: Zero Data Generation**: Fixed complete failure of setup generation due to invalid enum values

#### Added
- **Configuration Validation**: Pre-flight validation of configured categories against database enum schema
- **Enhanced Logging**: Clear visibility into category configuration parsing and validation results
- **Graceful Error Handling**: Informative error messages when configuration validation fails
- **Structured Logging**: Debug logging for category selection and validation processes

#### Technical Details
- **Root Cause**: SetupSeeder was using hardcoded categories from `getSetupTypes()` instead of reading `context.config.tables?.setups?.categories`
- **Solution**: Modified `createSetup()` method to prioritize configured categories over hardcoded domain-based types
- **Validation**: Added `validateCategoriesAgainstEnum()` method to check configured categories against PostgreSQL enum values
- **Type Safety**: Added `tables` property to `SeedConfig` interface with proper TypeScript typing

#### Configuration Support
- Framework now reads `tables.setups.categories` array from configuration
- Only configured categories are used for setup generation (no hardcoded alternatives)
- Clear error messages when configuration is missing or contains invalid enum values
- Backward compatibility maintained - falls back to domain-based types if no configuration provided

#### Performance Results
- **Data Generation**: 100% success rate with valid configuration (was: 0% due to enum errors)
- **Configuration Validation**: Fast pre-flight validation prevents wasted generation time
- **Error Detection**: Clear feedback on configuration issues before data generation starts

#### Breaking Changes
- None - All fixes are backward compatible with existing configurations

---

## [2.4.6] - 2025-07-30

### 🚨 Critical Hotfix - FEAT-004 v2.4.5 Regression Fixes

**Resolves critical production blocking issues introduced in v2.4.5 that caused complete framework failure.**

#### Fixed
- **🔥 CRITICAL: User Creation Failure**: Fixed database race condition in `createSimpleAccountUser()` causing 100% user creation failures
- **🔥 CRITICAL: Infinite Loops**: Eliminated infinite retry loops (450331+ lines) and process timeouts 
- **🔥 CRITICAL: Duplicate Key Errors**: Implemented graceful error recovery for email constraint conflicts
- **🔥 CRITICAL: Schema Cache Errors**: Fixed MakerKit column mapping issues (`user_id` vs `account_id`)

#### Added
- **Robust Error Recovery**: Pre-creation checks and post-error validation for database race conditions
- **UUID Email Generation**: Timestamp + UUID approach ensures absolute email uniqueness across all scenarios
- **Graceful Failure Handling**: Framework now correctly recognizes successful creation even when duplicate key errors occur
- **Architectural Debugging**: Systematic failure point analysis with call tracking and instance debugging

#### Technical Details
- **Root Cause**: Database race condition where account creation succeeded but error handling incorrectly reported failure
- **Solution**: Added comprehensive pre-flight checks and post-error validation to `createSimpleAccountUser()`
- **Email Uniqueness**: Replaced deterministic faker usernames with `user_{counter}_{timestamp}_{uuid}` format
- **MakerKit Compatibility**: Enhanced `getUserForeignKey()` to detect MakerKit patterns and return `account_id`

#### Performance Results
- **User Creation**: 100% success rate (was: 0% success rate)
- **Process Time**: 363ms (was: infinite loops/timeouts)
- **Memory Usage**: Normal operation (was: runaway memory consumption)
- **Error Rate**: Zero duplicate key failures (was: complete framework failure)

#### Breaking Changes
- None - All fixes are backward compatible

---

## [2.4.5] - 2025-07-30

### 🔧 Hotfix - Setup Type Resolution

#### Fixed
- **Template Type Warnings**: Eliminated "No setup types found" warnings for Vehicle and Backpack templates
- **Domain Fallback Logic**: Added intelligent fallback to legacy outdoor setup types when domain config is missing
- **Backward Compatibility**: Preserved full functionality for existing Vehicle/Backpack template types

#### Technical Details
- Fixed domain configuration defaulting to 'generic' without Vehicle/Backpack setup types
- Implemented automatic merge of legacy outdoor types when needed
- No breaking changes to existing configurations

---

## [2.4.4] - 2025-07-30

### 🚀 Critical Release - FEAT-003 Memory Management & Schema Mapping

**Production-grade memory management and universal schema compatibility for enterprise deployment.**

### ✅ Added - Memory Management & Performance

#### Streaming Batch Processing  
- **Memory Efficiency**: 65% reduction in memory usage during setup generation
- **Configurable Batches**: Process users in batches of 5-50 (default: 25) with 512MB threshold
- **Automatic Garbage Collection**: Explicit GC between batches prevents memory leaks
- **Memory Monitoring**: Real-time memory usage tracking with optimization recommendations
- **Performance Metrics**: Comprehensive batch processing statistics and recommendations

#### Dynamic Schema Mapping
- **Universal Compatibility**: Framework-agnostic table name resolution
- **MakerKit Support**: Automatic `setup_types` → `base_templates` mapping
- **Query Translation**: Transparent Supabase query translation layer
- **Schema Introspection**: Database validation with intelligent fallback mechanisms
- **Backward Compatibility**: Existing configurations continue to work unchanged

### 🔧 Changed - Core Infrastructure

#### Enhanced Seeders
- **BaseDataSeeder**: Dynamic table mapping replaces hardcoded `base_templates` references
- **SetupSeeder**: Memory-efficient streaming processing with batch-based user handling
- **Error Handling**: Graceful degradation for individual user/setup failures

#### New Core Components
- **StreamingBatchProcessor**: Memory-efficient data processing with dynamic sizing
- **TableMappingResolver**: Dynamic table name resolution with caching
- **QueryTranslator**: Transparent table name translation for Supabase queries

### 🐛 Fixed - Production Issues

#### Critical Memory Issues
- **Node.js OOM Crashes**: Eliminated "FATAL ERROR: JavaScript heap out of memory" 
- **Default Heap Compatibility**: Framework now works with default Node.js settings (no `--max-old-space-size` required)
- **Memory Leaks**: Prevented memory accumulation during large dataset processing

#### Schema Compatibility Issues  
- **MakerKit Warnings**: Eliminated "table not found" warnings for `base_templates` table
- **Framework Detection**: Improved schema detection and mapping accuracy
- **Query Failures**: Resolved table name conflicts across different framework configurations

### 📊 Performance Improvements
- **Processing Speed**: Maintained seeding performance while adding memory safety
- **Batch Optimization**: Dynamic batch sizing based on available memory
- **Caching**: Performance-optimized table name resolution with intelligent caching
- **Monitoring**: Real-time performance tracking and optimization recommendations

### 🧪 Testing & Validation
- **Memory Tests**: Comprehensive memory management and batch processing validation
- **Schema Tests**: Complete schema mapping integration and compatibility testing  
- **Production Readiness**: Validated TypeScript compilation, CLI functionality, and regression testing

---

## [2.4.1] - 2025-07-30

### 🎯 Major Release - SUPASEED-001 MakerKit Integration Complete

**Complete MakerKit compatibility with hybrid user strategies and authentic outdoor content generation.**

### ✅ Added - SUPASEED-001 Features

#### MakerKit Integration
- **Full MakerKit Compatibility**: Complete support for accounts-only architecture
- **Personal Account Constraints**: Automatic `is_personal_account = true` handling
- **JSONB Field Mapping**: Proper bio/username mapping to `public_data` field
- **Hybrid User Strategy**: Support for existing + new user generation
- **Enhanced Cleanup**: Robust cleanup for both accounts and auth.users tables

#### Outdoor Domain Content
- **36 Realistic Setups**: Weekend Hiking, Backpacking, Photography, Camping, Rock Climbing, etc.
- **12 Diverse Personas**: Outdoor enthusiasts, gear experts, adventure photographers, etc.
- **Authentic Content**: Market-accurate gear descriptions and outdoor scenarios
- **Base Template Integration**: Proper setup creation with template relationships

#### User Management
- **Hybrid Strategy**: Combines existing account preservation with new user generation
- **Persona-Based Generation**: Outdoor-focused user archetypes and behaviors
- **Schema Adaptation**: Automatic detection of MakerKit vs traditional schemas
- **Constraint Handling**: Graceful handling of unique constraints and violations

### 🔧 Enhanced

#### Schema Compatibility
- **Framework Detection**: Enhanced MakerKit version detection and compatibility
- **Column Mapping**: Improved field mapping for MakerKit's account structure
- **Validation System**: Better error reporting and constraint validation
- **Profile Skipping**: Automatic disabling of profile creation for MakerKit

#### Configuration System
- **Flexible Config**: Support for both MakerKit and traditional Supabase schemas
- **User Strategies**: Multiple user generation approaches (create-new, use-existing, hybrid)
- **Domain Configuration**: Outdoor domain with realistic gear categories
- **Template Integration**: Proper base template selection and setup generation

#### CLI Experience
- **Status Command**: Enhanced reporting of users and setups
- **Cleanup Command**: Comprehensive cleanup of test data
- **Error Handling**: Better error messages and recovery suggestions
- **Configuration Loading**: Consistent config loading across all commands

### 🐛 Fixed

#### MakerKit Issues
- **Profile Creation**: Disabled profile creation for accounts-only architecture
- **Field Mapping**: Fixed bio/username mapping to JSONB public_data field
- **Constraint Violations**: Resolved unique constraint violations during seeding
- **Auth Integration**: Proper auth.users deletion during cleanup

#### TypeScript Issues
- **Import Corrections**: Fixed missing type imports and union type handling
- **Method Additions**: Added missing saveConfig method to ConfigManager
- **Property Access**: Fixed property access errors with proper type guards
- **Parameter Types**: Added explicit type annotations for callback parameters

#### Core Functionality
- **Setup Generation**: Fixed setup creation with proper account relationships
- **User Creation**: Resolved user creation failures in hybrid mode
- **Data Persistence**: Ensured proper persistence of generated test data
- **Schema Validation**: Improved schema detection and validation accuracy

---

## [2.4.0] - 2024-12-15

### 🎯 Framework-Aware Architecture

#### Added
- **Framework Detection System**: Auto-detection of MakerKit, Supabase, and custom frameworks
- **Strategy Registry**: Pluggable strategy system for different database schemas
- **Enhanced Schema Adapter**: Improved schema introspection and column mapping
- **Multi-Framework Support**: Support for various Supabase application frameworks

#### Enhanced
- **Configuration System**: More flexible configuration with framework-specific settings
- **CLI Commands**: Enhanced commands with better error handling and validation
- **Performance**: Improved seeding performance and memory usage

---

## [2.3.2] - 2025-01-25

### 🎯 Constraint-Aware Architecture Complete

#### Added
- **Deep PostgreSQL Constraint Discovery**: Automatic parsing of triggers and functions
- **Constraint-Aware Workflow Generation**: Dynamic workflows based on business logic
- **Intelligent Auto-Fixes**: Automatic resolution of common constraint violations
- **Comprehensive Test Suite**: Full testing for constraint-aware features

#### Enhanced
- **Schema Validation**: Improved validation with constraint awareness
- **Error Handling**: Better error messages and recovery suggestions
- **CLI Experience**: New constraint-aware commands and options

---

## [2.2.0] - 2025-01-20

### 🎯 Major Release - Constraint-Aware Foundation

#### Added
- **ConstraintDiscoveryEngine**: PostgreSQL constraint discovery and business logic parsing
- **ConstraintAwareExecutor**: Pre-validated workflow execution
- **WorkflowGenerator**: Auto-generates workflows from discovered constraints
- **Enhanced Schema Introspection**: Deep constraint discovery capabilities

---

## [2.1.0] - 2024-11-15

### 🎯 Schema-First Architecture

#### Added
- **Dynamic Schema Discovery**: Automatic detection of database structure
- **Intelligent Column Mapping**: Smart field mapping across different schemas
- **Asset Pool System**: Realistic asset generation and management
- **Performance Monitoring**: Built-in performance tracking and optimization

---

## [2.0.0] - 2024-09-10

### 🎯 Enterprise Architecture Overhaul

#### Added
- **AI Integration**: Ollama-powered content generation
- **Asset Intelligence**: Advanced asset pool management
- **Multi-Domain Support**: Support for multiple content domains
- **Enhanced CLI**: Comprehensive command-line interface

---

## [1.x] - Legacy Versions

Previous versions focused on basic database seeding functionality with hardcoded assumptions.

---

## 🎯 Current Status (v2.4.1)

**Production Ready**: ✅ Complete MakerKit integration with 36 realistic setups across 12 personas
**Test Coverage**: ✅ Core functionality thoroughly tested and validated
**Documentation**: ✅ Comprehensive documentation and examples
**TypeScript**: ✅ Critical errors resolved, non-blocking issues documented
**Performance**: ✅ Optimized for 10-50 user scenarios with < 30 second seeding

---

## 🛣️ Upcoming Releases

### v2.5.0 - Universal Extension System
- SaaS domain extension
- E-commerce domain extension  
- Custom domain framework
- Template marketplace

### v2.6.0 - Advanced Features
- Multi-database support
- Performance optimization
- Advanced relationship handling
- Custom constraint plugins