# TASK-002: Source Code Reorganization for AI-First Development

**Status**: Active  
**Priority**: High  
**Assigned**: Development Team  
**Estimated Effort**: 6-8 hours  

## 🤖 AI Quick Start
This task reorganizes the src/ directory from technical architecture folders to feature-based organization for better AI agent navigation and development workflow.

## ⚠️ Mandatory Workflow
1. 📊 **Analyze Dependencies**: Map all import/export relationships before moving files
2. 🔍 **Plan Migration**: Create detailed file movement plan with import updates
3. 📋 **Use todo_write**: Track each file movement and import fix as separate tasks
4. 📝 **Update Builds**: Ensure all build scripts and configs reflect new structure
5. 🧪 **Test Thoroughly**: Validate CLI functionality after each major reorganization step
6. 💾 **Commit Incrementally**: Small commits for each logical grouping moved

## 🎯 Problem & Opportunity

### Current Issues
- **Technical Architecture Folders**: `src/schema/`, `src/detection/`, etc. don't reflect user-facing capabilities
- **AI Agent Confusion**: Agents struggle to find relevant code when working on specific features
- **Mixed Responsibilities**: Related functionality scattered across multiple directories
- **Import Complexity**: Deep nested imports make refactoring difficult

### Opportunity
- **Feature-Based Organization**: Group by user-facing capabilities for better navigation
- **AI-Friendly Structure**: Clear boundaries for AI agents working on specific features
- **Improved Maintainability**: Related code co-located for easier updates
- **Better Testing**: Feature-based tests alongside implementation

## 💡 Solution Vision

Transform from technical architecture organization to feature-based organization:

### Current Structure Issues
```
src/
├── schema/           # 30+ files with mixed responsibilities
├── detection/        # Framework detection scattered
├── framework/        # Strategy pattern implementation
├── seeders/          # Data generation logic
├── auth/            # Authentication handling
├── storage/         # Asset management
├── ai/              # AI integration
├── utils/           # Shared utilities
└── config/          # Configuration management
```

### Proposed Feature-Based Structure
```
src/
├── features/
│   ├── detection/          # Schema & Framework Detection
│   │   ├── schema-detector.ts
│   │   ├── framework-detector.ts
│   │   ├── constraint-discoverer.ts
│   │   └── detection-cache.ts
│   │
│   ├── analysis/           # Database Analysis & Constraints
│   │   ├── constraint-analyzer.ts
│   │   ├── relationship-analyzer.ts
│   │   ├── rls-analyzer.ts
│   │   └── business-logic-analyzer.ts
│   │
│   ├── integration/        # Framework Integration
│   │   ├── makerkit-integration.ts
│   │   ├── generic-supabase.ts
│   │   ├── strategy-registry.ts
│   │   └── framework-adapter.ts
│   │
│   ├── generation/         # Data Generation & Seeding
│   │   ├── data-generator.ts
│   │   ├── constraint-enforcer.ts
│   │   ├── domain-seeder.ts
│   │   └── volume-manager.ts
│   │
│   ├── auth/              # Authentication (existing)
│   ├── storage/           # Storage & Assets (existing)
│   └── ai/                # AI Enhancement (existing)
│
├── core/
│   ├── config/            # Configuration system
│   ├── types/             # Shared type definitions
│   └── utils/             # Cross-cutting utilities
│
└── cli/                   # CLI interface
    ├── commands/          # Command implementations
    ├── interfaces/        # CLI user interfaces
    └── cli.ts            # Main CLI entry
```

## 📋 Requirements

### Functional Requirements
- **F1**: All existing CLI functionality must work after reorganization
- **F2**: Import paths must be updated consistently across all files
- **F3**: Build process must work without changes to package.json scripts
- **F4**: Test files must be moved alongside their implementation files

### Non-Functional Requirements
- **NF1**: TypeScript compilation must work without errors
- **NF2**: No runtime behavior changes - purely structural reorganization
- **NF3**: Feature boundaries must be clear for AI agent navigation
- **NF4**: Maintain backward compatibility for any external usage

### Acceptance Criteria
- ✅ All files moved to appropriate feature directories
- ✅ All import statements updated to reflect new paths
- ✅ `npm run build` completes successfully
- ✅ `npm test` passes all existing tests
- ✅ CLI commands work identically to before reorganization
- ✅ TypeScript compilation produces zero errors

## 🏗️ Technical Design

### Migration Strategy

#### Phase 1: Create Feature Structure
```bash
mkdir -p src/features/{detection,analysis,integration,generation}
mkdir -p src/core/{config,types,utils}
mkdir -p src/cli/{commands,interfaces}
```

#### Phase 2: Move Files by Feature
**Detection Feature** (Schema & Framework Detection):
- `src/detection/*` → `src/features/detection/`
- `src/domains/domain-detector.ts` → `src/features/detection/`
- Key exports: schema detection, framework identification, constraint discovery

**Analysis Feature** (Database Analysis):
- `src/schema/constraint-*.ts` → `src/features/analysis/`
- `src/schema/relationship-*.ts` → `src/features/analysis/`
- `src/schema/business-logic-*.ts` → `src/features/analysis/`
- Key exports: constraint analysis, relationship mapping, RLS compliance

**Integration Feature** (Framework Integration):
- `src/framework/*` → `src/features/integration/`
- `src/compatibility/*` → `src/features/integration/`
- Key exports: MakerKit strategy, generic Supabase support, framework adapters

**Generation Feature** (Data Generation):
- `src/seeders/*` → `src/features/generation/`
- `src/data/*` → `src/features/generation/`
- `src/schema/workflow-*.ts` → `src/features/generation/`
- Key exports: data seeding, constraint enforcement, volume management

#### Phase 3: Organize Core Infrastructure
**Configuration**:
- `src/config/*` → `src/core/config/`
- Central configuration management

**Types**:
- `src/types.ts` → `src/core/types/`
- `src/schema/*-types.ts` → `src/core/types/`
- Shared type definitions

**Utils**:
- `src/utils/*` → `src/core/utils/`
- Cross-cutting utilities

#### Phase 4: CLI Organization
- `src/cli/*` → `src/cli/commands/`
- `src/cli.ts` → `src/cli/cli.ts`

### Import Update Strategy

#### Automated Approach
```typescript
// Example: Update imports in all files
// From: import { ConstraintAnalyzer } from '../schema/constraint-analyzer';
// To:   import { ConstraintAnalyzer } from '../features/analysis/constraint-analyzer';

// Use find/replace with patterns:
// Find: from ['"](\.\.\/)*schema\/
// Replace: from '$1features/analysis/
```

#### Manual Verification
- Review all `index.ts` files for proper exports
- Ensure no circular dependencies introduced
- Validate that all public APIs remain accessible

### Testing Strategy
- **Unit Tests**: Move test files alongside implementation
- **Integration Tests**: Update import paths in test files
- **CLI Tests**: Ensure all commands work after reorganization
- **Build Tests**: Validate that compiled output structure is correct

## 🔄 Implementation Tasks

### Phase 1: Preparation (2 hours)
- [ ] **Analyze Dependencies**: Map all current import/export relationships
- [ ] **Create Migration Script**: Automate file movements and import updates
- [ ] **Backup Current State**: Create git branch for rollback safety
- [ ] **Update Build Config**: Modify any build scripts that reference specific paths

### Phase 2: Feature Migration (3 hours)
- [ ] **Move Detection Files**: Reorganize schema/framework detection logic
- [ ] **Move Analysis Files**: Consolidate constraint and relationship analysis
- [ ] **Move Integration Files**: Group framework-specific code
- [ ] **Move Generation Files**: Consolidate data generation and seeding

### Phase 3: Core Infrastructure (1 hour)
- [ ] **Reorganize Config**: Move configuration management to core
- [ ] **Consolidate Types**: Group all type definitions
- [ ] **Organize Utils**: Move cross-cutting utilities

### Phase 4: Validation & Testing (2 hours)
- [ ] **Update Imports**: Fix all import statements across codebase
- [ ] **Test Compilation**: Ensure TypeScript compiles without errors
- [ ] **Test CLI**: Validate all commands work correctly
- [ ] **Run Test Suite**: Ensure all tests pass after reorganization

## 🧪 Testing Strategy

### Pre-Migration Testing
```bash
# Baseline functionality
npm run build
npm test
npm run typecheck

# CLI functionality test
node dist/cli.js --help
node dist/cli.js detect
```

### Post-Migration Testing
```bash
# Same tests should pass
npm run build
npm test
npm run typecheck

# CLI should work identically
node dist/cli.js --help
node dist/cli.js detect
```

### Regression Testing
- Test MakerKit integration workflow
- Test generic Supabase detection
- Test data seeding functionality
- Test error handling and recovery

## 📊 Progress Tracking

### Current Status: In Progress
- ✅ **Planning**: Feature boundary definitions completed
- ✅ **Dependency Analysis**: Import/export mapping completed  
- ✅ **Migration Strategy**: File movement plan completed
- ✅ **File Movement**: All major features reorganized to new structure
- ⏳ **Import Updates**: ~75% complete, remaining imports being resolved
- ⏳ **Validation**: TypeScript compilation in progress

### Success Metrics
- **Code Organization**: Clear feature boundaries for AI navigation
- **Maintainability**: Related functionality co-located
- **Development Velocity**: Faster feature development for AI agents
- **Technical Debt**: Reduced complexity in import structures

### Risk Mitigation
- **Import Breakage**: Comprehensive testing after each phase
- **Build Issues**: Incremental validation of build process
- **Feature Boundaries**: Clear ownership and responsibility mapping
- **Rollback Plan**: Git branch strategy for safe migration

## 🔗 Links & References

### Codebase Context
- **Current Architecture**: `src/` directory structure
- **Build Process**: `package.json` scripts and `tsconfig.json`
- **Import Patterns**: Existing module boundaries and dependencies

### Related Documentation
- **Development Guidelines**: `@docs/local-development.md`
- **Architecture Decisions**: `@docs/product/decisions/technical/`
- **Implementation Rules**: `@docs/product/ai-context/implementation-rules.md`

### External Resources
- **TypeScript Module Resolution**: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- **Feature-Based Architecture**: Software architecture best practices
- **Refactoring Patterns**: Safe code reorganization techniques

---

**Created**: 2025-07-30  
**Last Updated**: 2025-07-30  
**Next Review**: When starting v2.5.0 development