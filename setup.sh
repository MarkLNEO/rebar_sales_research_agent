#!/bin/bash

echo "🚀 Setting up RebarHQ API (Next.js Optimized)"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local with your credentials before running the server"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Dependencies installed successfully"
echo ""

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "✅ Build completed successfully"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your credentials"
echo "  2. Run 'npm run dev' to start development server"
echo "  3. Visit http://localhost:3000/api/health to verify"
echo ""
echo "Documentation:"
echo "  - README.md - Quick start guide"
echo "  - MIGRATION_GUIDE.md - Detailed migration info"
echo "  - OPTIMIZATION_SUMMARY.md - Performance improvements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
