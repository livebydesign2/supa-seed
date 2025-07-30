# Changelog

All notable changes to supa-seed will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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