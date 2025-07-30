#!/bin/bash

# SupaSeed Version Update Script
# Automatically updates version numbers across all documentation and source files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to update version in a file
update_file_version() {
    local file="$1"
    local old_version="$2"
    local new_version="$3"
    local pattern="$4"
    
    if [[ -f "$file" ]]; then
        if grep -q "$old_version" "$file"; then
            if [[ "$pattern" ]]; then
                sed -i.bak "s/$pattern/$(echo "$pattern" | sed "s/$old_version/$new_version/g")/g" "$file"
            else
                sed -i.bak "s/$old_version/$new_version/g" "$file"
            fi
            rm -f "$file.bak"
            print_success "Updated $file"
        else
            print_warning "Version $old_version not found in $file"
        fi
    else
        print_warning "File $file not found"
    fi
}

# Main function
main() {
    print_step "SupaSeed Version Update Script"
    echo
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Get current version from package.json
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    
    if [[ -z "$CURRENT_VERSION" ]]; then
        print_error "Could not read current version from package.json"
        exit 1
    fi
    
    print_step "Current version: $CURRENT_VERSION"
    
    # Prompt for new version
    if [[ -z "$1" ]]; then
        echo -n "Enter new version (e.g., 2.4.5): "
        read NEW_VERSION
    else
        NEW_VERSION="$1"
    fi
    
    if [[ -z "$NEW_VERSION" ]]; then
        print_error "No version provided"
        exit 1
    fi
    
    # Validate version format (basic semver check)
    if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Invalid version format. Use semantic versioning (e.g., 2.4.5)"
        exit 1
    fi
    
    print_step "Updating from v$CURRENT_VERSION to v$NEW_VERSION"
    echo
    
    # Update package.json
    print_step "Updating package.json..."
    npm version "$NEW_VERSION" --no-git-tag-version
    print_success "Updated package.json"
    
    # Update README.md
    print_step "Updating README.md..."
    update_file_version "README.md" "$CURRENT_VERSION" "$NEW_VERSION"
    
    # Update changelog.md header if it's the latest version
    print_step "Updating changelog.md..."
    if [[ -f "changelog.md" ]]; then
        # Check if we need to add a new version entry
        if ! grep -q "\[$NEW_VERSION\]" changelog.md; then
            print_warning "Please manually add v$NEW_VERSION entry to changelog.md"
        else
            update_file_version "changelog.md" "$CURRENT_VERSION" "$NEW_VERSION"
        fi
    fi
    
    # Update AI context documentation
    print_step "Updating AI context files..."
    update_file_version "docs/product/ai-context/project-brief.md" "$CURRENT_VERSION" "$NEW_VERSION"
    update_file_version "docs/product/ai-context/current-state.md" "$CURRENT_VERSION" "$NEW_VERSION"
    
    # Update any other documentation files that might contain version references
    print_step "Scanning for other version references..."
    
    # Common documentation files
    DOCS_FILES=(
        "docs/product/reference/installation.md"
        "docs/product/strategic/roadmap.md"
        "contributing.md"
    )
    
    for file in "${DOCS_FILES[@]}"; do
        if [[ -f "$file" ]]; then
            update_file_version "$file" "$CURRENT_VERSION" "$NEW_VERSION"
        fi
    done
    
    # Search for any remaining version references in documentation
    print_step "Checking for remaining version references..."
    REMAINING=$(grep -r "v$CURRENT_VERSION\|$CURRENT_VERSION" docs/ --include="*.md" 2>/dev/null | grep -v "changelog.md" | grep -v ".md.bak" || true)
    
    if [[ -n "$REMAINING" ]]; then
        print_warning "Found additional version references that may need manual updates:"
        echo "$REMAINING"
    fi
    
    # Rebuild to update CLI version
    print_step "Rebuilding project..."
    npm run build
    
    # Verify CLI version
    CLI_VERSION=$(node dist/cli.js --version)
    if [[ "$CLI_VERSION" == "$NEW_VERSION" ]]; then
        print_success "CLI version updated to $CLI_VERSION"
    else
        print_error "CLI version mismatch: expected $NEW_VERSION, got $CLI_VERSION"
        exit 1
    fi
    
    echo
    print_success "Version update complete!"
    print_step "Summary:"
    echo "  • package.json: $CURRENT_VERSION → $NEW_VERSION"
    echo "  • CLI version: $NEW_VERSION"
    echo "  • Documentation updated"
    echo
    print_step "Next steps:"
    echo "  1. Review changes: git diff"
    echo "  2. Update changelog.md with release notes if needed"
    echo "  3. Commit changes: git add . && git commit -m 'chore: bump version to v$NEW_VERSION'"
    echo "  4. Publish: npm publish"
    echo
}

# Script usage
show_usage() {
    echo "Usage: $0 [new_version]"
    echo
    echo "Examples:"
    echo "  $0 2.4.5          # Update to specific version"
    echo "  $0                # Interactive mode - prompts for version"
    echo
    echo "This script will:"
    echo "  • Update package.json version"
    echo "  • Update version references in documentation"
    echo "  • Rebuild the project"
    echo "  • Verify CLI version is updated"
}

# Handle command line arguments
case "$1" in
    -h|--help)
        show_usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac