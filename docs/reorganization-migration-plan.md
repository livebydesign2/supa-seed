# Source Code Reorganization Migration Plan

**Generated**: 2025-07-30  
**Status**: Active  

## Migration Strategy Overview

Transform from technical architecture organization to feature-based organization while maintaining all existing functionality and zero breaking changes.

## File Movement Plan

### Phase 1: Create Feature Structure
```bash
mkdir -p src/features/{detection,analysis,integration,generation}
mkdir -p src/core/{config,types,utils}
mkdir -p src/cli/{commands,interfaces}
```

### Phase 2: Detection Feature (Schema & Framework Detection)
**Target**: `src/features/detection/`

Files to move:
- `src/detection/*` (17 files) → `src/features/detection/`
- Key files: detection-types.ts, architecture-detector.ts, domain-detector.ts, detection-integration.ts

### Phase 3: Analysis Feature (Database Analysis & Constraints) 
**Target**: `src/features/analysis/`

Files to move:
- `src/schema/business-logic-analyzer.ts` → `src/features/analysis/`
- `src/schema/relationship-analyzer.ts` → `src/features/analysis/`
- `src/schema/constraint-*` files (8 files) → `src/features/analysis/`
- `src/security/rls-compliance-*` files → `src/features/analysis/`

### Phase 4: Integration Feature (Framework Integration)
**Target**: `src/features/integration/`

Files to move:
- `src/framework/*` (6 files) → `src/features/integration/`
- `src/compatibility/*` → `src/features/integration/`
- Keep strategy pattern but organize by integration type

### Phase 5: Generation Feature (Data Generation & Seeding)
**Target**: `src/features/generation/`

Files to move:
- `src/seeders/*` (7 files) → `src/features/generation/seeders/`
- `src/data/*` (2 files) → `src/features/generation/`
- `src/schema/workflow-*` files (3 files) → `src/features/generation/`
- `src/assets/*` (4 files) → `src/features/generation/assets/`
- `src/storage/*` (3 files) → `src/features/generation/storage/`

### Phase 6: Core Infrastructure
**Target**: `src/core/`

Files to move:
- `src/config/*` (7 files) → `src/core/config/`
- `src/types.ts`, `src/config-types.ts` → `src/core/types/`
- `src/utils/*` (11 files) → `src/core/utils/`
- Keep existing structure, clean organization

### Phase 7: CLI Organization
**Target**: `src/cli/`

Files to move:
- `src/cli/*` (4 files) → `src/cli/commands/`
- `src/cli.ts` stays at root temporarily for compatibility

## Import Update Patterns

### Core Utilities
```typescript
// FROM: import { Logger } from '../utils/logger';
// TO:   import { Logger } from '../core/utils/logger';
```

### Detection System
```typescript
// FROM: import { DetectionTypes } from '../detection/detection-types';
// TO:   import { DetectionTypes } from '../features/detection/detection-types';
```

### Framework Integration
```typescript
// FROM: import { MakerKitStrategy } from '../framework/strategies/makerkit-strategy';
// TO:   import { MakerKitStrategy } from '../features/integration/strategies/makerkit-strategy';
```

### Configuration
```typescript
// FROM: import { ConfigManager } from '../config-manager';
// TO:   import { ConfigManager } from '../core/config/config-manager';
```

## Validation Steps

### After Each Phase
1. Run `npm run typecheck` - must pass with 0 errors
2. Test import resolution
3. Commit changes incrementally

### Final Validation
1. Full TypeScript compilation: `npm run build`
2. CLI functionality test: `node dist/cli.js --help`
3. Run complete test suite: `npm test`
4. Integration tests for MakerKit workflow

## Risk Mitigation

### Rollback Strategy
- Each phase committed separately
- Can rollback to any previous working state
- Git branch: `feature/source-reorganization`

### Breaking Change Prevention
- No changes to `src/index.ts` exports initially
- Public API remains identical
- CLI interface unchanged

### Testing Strategy
- Pre-migration baseline testing
- Incremental validation after each phase
- Post-migration regression testing

## Implementation Notes

### File Dependencies
- Most files import from `../utils/logger` - will become `../core/utils/logger`
- Detection files have internal dependencies - move as unit
- Framework strategies depend on strategy-interface - maintain relationships

### Index Files
- Update all `index.ts` files to maintain exports
- Ensure no breaking changes to public API
- Add barrel exports for new structure

### Special Considerations
- `src/cli.ts` - main CLI entry, update imports but keep location
- `src/index.ts` - library entry point, update imports but preserve exports
- `src/schema-adapter.ts` - core infrastructure, move to appropriate location