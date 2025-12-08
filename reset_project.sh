#!/bin/bash

echo "🛑 Stopping all Node.js processes..."
pkill -f "node" || true

echo "🧹 Cleaning Server..."
cd server
rm -rf node_modules package-lock.json dist
echo "📦 Installing Server Dependencies..."
npm install
echo "🔨 Building Server..."
npm run build
cd ..

echo "🧹 Cleaning Client..."
cd client
rm -rf node_modules package-lock.json dist .vite
echo "📦 Installing Client Dependencies..."
npm install --force
echo "🔨 Building Client..."
npm run build
cd ..

echo "✅ Done! To start the project:"
echo "1. Open a terminal for the SERVER and run:"
echo "   cd server && npm start"
echo ""
echo "2. Open a NEW terminal for the CLIENT and run:"
echo "   cd client && npm run dev"
