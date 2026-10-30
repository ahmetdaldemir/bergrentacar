#!/bin/bash

# Server configuration
SERVER_HOST="153.92.220.225"
SERVER_USER="u448837686.bergrentacar.com"
SERVER_PASS="${DEPLOY_PASSWORD:-@198711Ad@}"
REMOTE_PATH="public_html"
LOCAL_BUILD_DIR="dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment process...${NC}"

# Step 1: Build the project
echo -e "${YELLOW}📦 Building project...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Aborting deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Step 1.5: Verify translation files are included in build
echo -e "${YELLOW}🔍 Verifying translation files in build...${NC}"
if grep -r "footer.companyName\|footer.companyDescription" "$LOCAL_BUILD_DIR/assets"/*.js > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Translation files found in build!${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Translation files may not be included in build${NC}"
fi

# Step 2: Check if dist directory exists
if [ ! -d "$LOCAL_BUILD_DIR" ]; then
    echo -e "${RED}❌ Build directory '$LOCAL_BUILD_DIR' not found!${NC}"
    exit 1
fi

# Step 2.5: Copy .env file to dist if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}📋 Copying .env file to dist...${NC}"
    cp .env "$LOCAL_BUILD_DIR/.env"
    echo -e "${GREEN}✅ .env file copied successfully!${NC}"
elif [ -f ".env.production" ]; then
    echo -e "${YELLOW}📋 Copying .env.production file to dist as .env...${NC}"
    cp .env.production "$LOCAL_BUILD_DIR/.env"
    echo -e "${GREEN}✅ .env.production file copied successfully!${NC}"
else
    echo -e "${YELLOW}⚠️  No .env or .env.production file found. Skipping...${NC}"
fi

# Step 3: Upload files using lftp (if available) or curl
if command -v lftp &> /dev/null; then
    echo -e "${YELLOW}📤 Uploading files using lftp...${NC}"
    
    lftp -c "
    set ftp:ssl-allow no
    set ftp:passive-mode yes
    open -u $SERVER_USER,$SERVER_PASS ftp://$SERVER_HOST
    cd $REMOTE_PATH
    mirror -R --delete --verbose $LOCAL_BUILD_DIR .
    bye
    "
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Deployment successful!${NC}"
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        exit 1
    fi
elif command -v curl &> /dev/null; then
    echo -e "${YELLOW}📤 Uploading files using curl...${NC}"
    echo -e "${YELLOW}⚠️  Note: curl FTP upload is basic. Consider installing lftp for better deployment.${NC}"
    
    cd $LOCAL_BUILD_DIR || exit 1
    
    # Upload files one by one (handle paths correctly)
    find . -type f | while read -r file; do
        # Remove leading ./ from path
        file_path="${file#./}"
        echo -e "${YELLOW}Uploading: $file_path${NC}"
        curl -T "$file" --user "$SERVER_USER:$SERVER_PASS" "ftp://$SERVER_HOST/$REMOTE_PATH/$file_path" --ftp-create-dirs
    done
    
    cd .. || exit 1
    
    echo -e "${GREEN}✅ Deployment completed!${NC}"
else
    echo -e "${RED}❌ Neither lftp nor curl found. Please install lftp for deployment:${NC}"
    echo -e "${YELLOW}   macOS: brew install lftp${NC}"
    echo -e "${YELLOW}   Linux: sudo apt-get install lftp (Ubuntu/Debian)${NC}"
    echo -e "${YELLOW}   Windows: Use deploy.ps1 PowerShell script instead${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"

