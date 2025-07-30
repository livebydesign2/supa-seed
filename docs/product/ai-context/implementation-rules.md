# Implementation Rules

## 🏗️ Architecture Patterns
- **Feature-Based Organization**: Group related functionality by capability, not technical layer
- **Framework-Agnostic**: Support multiple frameworks (MakerKit, generic Supabase) through strategy pattern
- **Constraint-Aware**: All data generation must respect database constraints, RLS policies, and triggers
- **CLI-First**: Design for command-line usage with clear, helpful output and error messages

## 🎨 CLI/UX Standards
- **Commander.js**: Use Commander.js for consistent command structure and help text
- **Chalk + Ora**: Colorful output with spinners for long-running operations
- **Helpful Errors**: Clear error messages with suggested fixes and troubleshooting steps
- **Progress Feedback**: Show progress for multi-step operations (detection, seeding)
- **Graceful Degradation**: Handle partial failures and provide recovery options

## 💾 Database Rules  
- **RLS Compliance**: Respect all Row Level Security policies during seeding
- **Constraint Discovery**: Automatically detect and handle foreign keys, unique constraints, checks
- **Multi-tenant Support**: Handle tenant-aware schemas (account_id associations)
- **Schema Evolution**: Support schema changes without breaking existing configurations

## 🔒 Security Rules
- **Service Role Only**: Use Supabase service role key, never expose to end users
- **No Data Exposure**: Never log sensitive data or connection strings
- **Cleanup Support**: Provide data cleanup commands to remove test data
- **Environment Variables**: Support secure credential management via .env files

## 🧪 Testing Requirements
- **Follow Testing Strategy**: See `@reference/testing-strategy.md` for comprehensive guidelines
- **Unit Tests**: For business logic, constraint handling, and data generation
- **Integration Tests**: For database operations and framework detection  
- **CLI Tests**: For command functionality and error handling
- **Schema Tests**: Validate constraint discovery and compliance across different schemas
- **Mandatory Workflow**: Run `npm run typecheck && npm run build && npm test` before completing tasks

## 📝 Code Standards
- **TypeScript Strict**: No `any` types, proper interfaces for all data structures
- **Error Handling**: Comprehensive error handling for database, network, and validation errors
- **Logging**: Structured logging with different levels (debug, info, warn, error)
- **Modular Design**: Clear separation of concerns between detection, generation, and seeding

## 🚀 Development Workflow
- **Setup**: Follow `@docs/local-development.md` for development environment
- **Build Process**: Use `npm run build` to compile TypeScript and validate
- **Testing**: Run `npm test` for comprehensive test suite
- **TypeScript**: Use `npm run typecheck` to validate types without building

## 📚 Key Reference Documents
- **Local Development**: `@docs/local-development.md` - Development setup
- **Installation**: `@docs/installation.md` - CLI installation and configuration
- **Troubleshooting**: `@docs/troubleshooting.md` - Common issues and solutions
- **Architecture**: `@docs/development/` - Technical implementation details

## 🔄 Framework Integration Rules
- **MakerKit Compatibility**: Support accounts-only architecture with public_data JSONB fields
- **Generic Supabase**: Support traditional user/profile table structures  
- **Detection First**: Always detect framework before applying strategy
- **Graceful Fallback**: Handle unknown schemas with generic approaches

## 📊 Data Generation Standards
- **Realistic Data**: Generate contextually appropriate test data (outdoor domain focus)
- **Constraint Compliance**: Never violate database constraints or RLS policies
- **Relationship Handling**: Properly handle foreign key relationships and junction tables
- **Volume Control**: Support configurable data volumes for different use cases 