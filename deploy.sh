#!/bin/bash

# Configuration
APP_NAME="cstoredaily"
BACKEND_DIR="./server"
FRONTEND_DIST="./dist"

echo "🚀 Starting Deployment Process..."

# 1. Install dependencies
echo "📦 Installing project dependencies..."
npm install

# 2. Build Frontend
echo "🏗️ Building Frontend..."
npm run build

# 3. Database Migration
echo "🗄️ Running Database Migrations..."
cd $BACKEND_DIR
npm install
npx knex migrate:latest --knexfile knexfile.ts
cd ..

# 4. Process Management (PM2)
# Check if PM2 is installed
if ! command -v pm2 &> /dev/null
then
    echo "⚠️ PM2 not found. Installing globally..."
    npm install -g pm2
fi

echo "🔄 Restarting Backend Process..."
# Start/Restart the backend using PM2
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start server/index.ts --name $APP_NAME --interpreter node --node-args="--loader ts-node/loader"

echo "✅ Deployment Complete!"
echo "📡 Backend is running via PM2. Check status with: pm2 status"
echo "🌐 Frontend build ready in $FRONTEND_DIST"
