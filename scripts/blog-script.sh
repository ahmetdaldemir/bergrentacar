#!/bin/bash

# Blog Generation Script
# 
# This script generates 5 initial blog posts for a tenant using AI.
# It runs locally and connects to the remote database via SSH.
#
# Usage:
#   ./blog-script.sh <tenant-slug> [remote-host] [remote-user] [remote-path]
#
# Example:
#   ./blog-script.sh sunset
#   ./blog-script.sh sunset "$REMOTE_HOST" "$REMOTE_USER" "$REMOTE_PATH"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if tenant slug is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Tenant slug is required${NC}"
    echo ""
    echo "Usage:"
    echo "  ./blog-script.sh <tenant-slug> [remote-host] [remote-user] [remote-path]"
    echo ""
    echo "Example:"
    echo "  ./blog-script.sh sunset"
    echo "  ./blog-script.sh sunset \"\$REMOTE_HOST\" \"\$REMOTE_USER\" \"\$REMOTE_PATH\""
    exit 1
fi

TENANT_SLUG=$1
## Load local deploy config if present (keeps secrets local)
if [ -f ".deploy.local" ]; then
  # shellcheck disable=SC1091
  source .deploy.local
fi

REMOTE_HOST="${2:-${REMOTE_HOST:-}}"
REMOTE_USER="${3:-${REMOTE_USER:-}}"
REMOTE_PATH="${4:-${REMOTE_PATH:-}}"
if [ -z "$REMOTE_HOST" ] || [ -z "$REMOTE_USER" ] || [ -z "$REMOTE_PATH" ]; then
    echo -e "${RED}❌ REMOTE_HOST, REMOTE_USER and REMOTE_PATH are required${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Starting blog generation for tenant: ${TENANT_SLUG}${NC}"
echo -e "${BLUE}📡 Will connect to database on: ${REMOTE_USER}@${REMOTE_HOST}${NC}"
echo ""

# Check if we're in the project root
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Check if script file exists locally
if [ ! -f "scripts/generate-initial-blogs.ts" ]; then
    echo -e "${RED}❌ Error: scripts/generate-initial-blogs.ts not found${NC}"
    exit 1
fi

# Get database credentials from remote server (excluding OPENAI_API_KEY)
echo -e "${BLUE}🔐 Getting database credentials from remote server...${NC}"
DB_CONFIG=$(ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_PATH}/backend && docker exec saas-tour-backend printenv | grep -E '^DB_' | tr '\n' ' '")

if [ -z "$DB_CONFIG" ]; then
    echo -e "${RED}❌ Error: Could not get database credentials from remote server${NC}"
    echo -e "${YELLOW}   Make sure backend container is running and accessible${NC}"
    exit 1
fi

# Extract environment variables (only DB_* variables)
DB_HOST=$(echo "$DB_CONFIG" | grep -oP 'DB_HOST=\K[^\s]+' || echo "localhost")
DB_PORT=$(echo "$DB_CONFIG" | grep -oP 'DB_PORT=\K[^\s]+' || echo "5432")
DB_USERNAME=$(echo "$DB_CONFIG" | grep -oP 'DB_USERNAME=\K[^\s]+' || echo "")
DB_PASSWORD=$(echo "$DB_CONFIG" | grep -oP 'DB_PASSWORD=\K[^\s]+' || echo "")
DB_NAME=$(echo "$DB_CONFIG" | grep -oP 'DB_NAME=\K[^\s]+' || echo "")

# Use the provided OpenAI API key from environment variable
# If not set, script will fail - user must provide API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${RED}❌ Error: OPENAI_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}   Please set OPENAI_API_KEY before running this script:${NC}"
    echo -e "${YELLOW}   export OPENAI_API_KEY='your-api-key-here'${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Using OpenAI API key from environment variable${NC}"

# If DB_HOST is container name, get actual host IP
if [ "$DB_HOST" = "global_postgres" ] || [ "$DB_HOST" = "postgres" ] || [ "$DB_HOST" = "localhost" ]; then
    # Get PostgreSQL container's IP or use remote host
    DB_HOST=${REMOTE_HOST}
    echo -e "${YELLOW}⚠️  Database is in container, using remote host IP${NC}"
    echo -e "${YELLOW}   Make sure PostgreSQL port (5432) is accessible from your local machine${NC}"
    echo -e "${YELLOW}   Or use SSH tunnel: ssh -L 5432:localhost:5432 ${REMOTE_USER}@${REMOTE_HOST}${NC}"
    echo ""
    read -p "Continue anyway? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        exit 1
    fi
fi

# Check if backend node_modules exists locally
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Backend node_modules not found. Installing dependencies...${NC}"
    cd backend
    npm install
    cd ..
fi

# Check if ts-node is available
if ! command -v ts-node &> /dev/null && ! command -v npx &> /dev/null; then
    echo -e "${YELLOW}⚠️  ts-node not found. Installing globally...${NC}"
    npm install -g ts-node typescript
fi

# Run the TypeScript script locally with remote database connection
echo -e "${BLUE}📝 Running blog generation script locally...${NC}"
echo ""

# Export environment variables and run script
export DB_HOST
export DB_PORT
export DB_USERNAME
export DB_PASSWORD
export DB_NAME
export OPENAI_API_KEY
export NODE_ENV=production
# Disable Redis for local script execution (Redis is on remote server)
export REDIS_HOST=disabled
export REDIS_PORT=6379

# Run script from backend directory (like other backend scripts)
cd backend
npx ts-node --project tsconfig.json ../scripts/generate-initial-blogs.ts "$TENANT_SLUG"
EXIT_CODE=$?
cd ..

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Blog generation completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Blog generation failed with exit code: $EXIT_CODE${NC}"
    exit $EXIT_CODE
fi

