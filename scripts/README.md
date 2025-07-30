# SupaSeed Scripts

Utility scripts for SupaSeed development and maintenance.

## Version Management

### `update-version.sh`

Automatically updates version numbers across all documentation and source files.

**Usage:**
```bash
# Interactive mode - prompts for version
npm run version:update

# Direct version specification  
npm run version:update 2.4.5

# Or run script directly
./scripts/update-version.sh 2.4.5
```

**What it does:**
- Updates `package.json` version
- Updates version references in `README.md`
- Updates AI context documentation
- Scans and updates other documentation files
- Rebuilds the project
- Verifies CLI version is updated correctly

**Files automatically updated:**
- `package.json`
- `README.md` 
- `docs/product/ai-context/project-brief.md`
- `docs/product/ai-context/current-state.md`
- Other documentation files as detected

**Manual updates still needed:**
- `changelog.md` - Add new version entry with release notes
- Feature documentation with version-specific information

## Development Workflow

1. **Update Version**: `npm run version:update 2.4.5`
2. **Review Changes**: `git diff`
3. **Update Changelog**: Add release notes to `changelog.md`
4. **Commit**: `git add . && git commit -m "chore: bump version to v2.4.5"`
5. **Publish**: `npm publish`

This automation eliminates the manual version update process and ensures consistency across all documentation.