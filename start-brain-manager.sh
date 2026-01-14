#!/bin/bash

# Start script for MCP Brain Manager
# Make sure to run npm install and npm run build first

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Running npm install..."
    npm install
fi

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "⚠️  dist directory not found. Running npm run build..."
    npm run build
fi

# Start the server
echo "🧠 Starting MCP Brain Manager..."
node dist/index.js
