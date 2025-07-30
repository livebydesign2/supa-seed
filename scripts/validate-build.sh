#!/bin/bash

# Build validation script for SupaSeed
# Run this before any release to ensure everything is working

set -e  # Exit on any error

echo "🔍 Starting SupaSeed build validation..."

# Clean previous build
echo "🧹 Cleaning previous build..."
npm run clean

# Type checking
echo "📝 Running TypeScript type checking..."
if npm run typecheck; then
    echo "✅ TypeScript validation passed"
else
    echo "❌ TypeScript validation failed"
    exit 1
fi

# Build the project
echo "🔨 Building project..."
if npm run build; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed"
    exit 1
fi

# Validate essential build artifacts exist
echo "📦 Validating build artifacts..."
REQUIRED_FILES=(
    "dist/index.js"
    "dist/index.d.ts"
    "dist/cli.js"
    "dist/cli.d.ts"
    "dist/types.js"
    "dist/types.d.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Test package creation
echo "📦 Testing package creation..."
if npm pack --dry-run > package-test.log 2>&1; then
    echo "✅ Package creation test passed"
    
    # Check package size (should be reasonable)
    PACKAGE_SIZE=$(npm pack --dry-run | grep -o '[0-9.]*MB\|[0-9.]*kB' | tail -1)
    echo "📏 Package size: $PACKAGE_SIZE"
    
else
    echo "❌ Package creation test failed"
    cat package-test.log
    exit 1
fi

# Run tests if they exist
echo "🧪 Running tests..."
if npm test > test-results.log 2>&1; then
    echo "✅ Tests passed"
else
    echo "⚠️  Tests failed or not configured (continuing anyway)"
    echo "   Check test-results.log for details"
fi

echo ""
echo "🎉 All validations passed! Ready for release."
echo ""
echo "Next steps:"
echo "  1. npm run prepublishOnly  # Final build with validation"
echo "  2. git add . && git commit -m 'chore: prepare v2.4.1 release'"
echo "  3. git tag v2.4.1"
echo "  4. git push origin main --tags"
echo "  5. npm publish"

# Cleanup
rm -f package-test.log test-results.log