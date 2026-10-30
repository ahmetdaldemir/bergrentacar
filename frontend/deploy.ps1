# PowerShell Deployment Script for Windows

# Server configuration
$SERVER_HOST = "153.92.220.225"
$SERVER_USER = "u448837686.bergrentacar.com"
$SERVER_PASS = if ($env:DEPLOY_PASSWORD) { $env:DEPLOY_PASSWORD } else { "@198711Ad@" }
$REMOTE_PATH = "public_html"
$LOCAL_BUILD_DIR = "dist"

Write-Host "Starting deployment process..." -ForegroundColor Green

# Step 1: Build the project
Write-Host "Building project..." -ForegroundColor Yellow

# Run build and capture output
$buildOutput = npm run build 2>&1 | Out-String
$buildExitCode = $LASTEXITCODE

# Check if build was successful
if ($buildExitCode -ne 0) {
    Write-Host "Build failed with exit code: $buildExitCode" -ForegroundColor Red
    Write-Host $buildOutput
    exit 1
}

# Also check output for error messages
if ($buildOutput -match "error|Error|ERROR|failed|Failed|FAILED") {
    Write-Host "Build output contains errors:" -ForegroundColor Red
    Write-Host $buildOutput
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Step 1.5: Verify translation files are included in build
Write-Host "Verifying translation files in build..." -ForegroundColor Yellow
$translationCheck = Get-ChildItem -Path "$LOCAL_BUILD_DIR\assets\*.js" -Recurse | Select-String -Pattern "footer\.companyName|footer\.companyDescription" -Quiet
if ($translationCheck) {
    Write-Host "Translation files found in build!" -ForegroundColor Green
} else {
    Write-Host "Warning: Translation files may not be included in build" -ForegroundColor Yellow
}

# Step 2: Check if dist directory exists
if (-not (Test-Path $LOCAL_BUILD_DIR)) {
    Write-Host "Build directory '$LOCAL_BUILD_DIR' not found!" -ForegroundColor Red
    exit 1
}

# Step 2.5: Copy .env file to dist if it exists
if (Test-Path ".env") {
    Write-Host "Copying .env file to dist..." -ForegroundColor Yellow
    Copy-Item ".env" -Destination "$LOCAL_BUILD_DIR\.env" -Force
    Write-Host ".env file copied successfully!" -ForegroundColor Green
} elseif (Test-Path ".env.production") {
    Write-Host "Copying .env.production file to dist as .env..." -ForegroundColor Yellow
    Copy-Item ".env.production" -Destination "$LOCAL_BUILD_DIR\.env" -Force
    Write-Host ".env.production file copied successfully!" -ForegroundColor Green
} else {
    Write-Host "No .env or .env.production file found. Skipping..." -ForegroundColor Yellow
}

# Step 3: Upload files using WinSCP or FTP
Write-Host "Uploading files..." -ForegroundColor Yellow

# Try using WinSCP if available
if (Get-Command winscp -ErrorAction SilentlyContinue) {
    Write-Host "Using WinSCP for deployment..." -ForegroundColor Yellow
    
    $scriptContent = @"
open ftp://$SERVER_USER`:$SERVER_PASS@$SERVER_HOST/
cd $REMOTE_PATH
synchronize remote $LOCAL_BUILD_DIR .
exit
"@
    
    $scriptContent | winscp /script=-
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Deployment successful!" -ForegroundColor Green
    } else {
        Write-Host "Deployment failed!" -ForegroundColor Red
        exit 1
    }
} else {
    # Fallback: Use .NET FTP classes
    Write-Host "Using .NET FTP for deployment..." -ForegroundColor Yellow
    
    try {
        # First, test connection to root
        $rootUri = "ftp://$SERVER_HOST/"
        Write-Host "Testing FTP connection to root..." -ForegroundColor Yellow
        
        try {
            $rootRequest = [System.Net.FtpWebRequest]::Create($rootUri)
            $rootRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
            $rootRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
            $rootRequest.UsePassive = $true
            $rootResponse = $rootRequest.GetResponse()
            $rootStream = $rootResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($rootStream)
            $rootContents = $reader.ReadToEnd()
            $reader.Close()
            $rootStream.Close()
            $rootResponse.Close()
            
            Write-Host "FTP connection successful!" -ForegroundColor Green
            Write-Host "Root directory contents: $rootContents" -ForegroundColor Cyan
            
            # Check if REMOTE_PATH exists, if not try root or create it
            if ($rootContents -notmatch $REMOTE_PATH) {
                Write-Host "Directory '$REMOTE_PATH' not found. Checking alternatives..." -ForegroundColor Yellow
                # Try to use root directory or create public_html
                $ftpUri = "ftp://$SERVER_HOST/"
                Write-Host "Using root directory for upload..." -ForegroundColor Yellow
            } else {
                $ftpUri = "ftp://$SERVER_HOST/$REMOTE_PATH/"
                Write-Host "Using '$REMOTE_PATH' directory for upload..." -ForegroundColor Green
            }
        } catch {
            Write-Host "FTP connection failed: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Trying to connect directly to $REMOTE_PATH..." -ForegroundColor Yellow
            
            # Try direct connection to REMOTE_PATH
            $ftpUri = "ftp://$SERVER_HOST/$REMOTE_PATH/"
            try {
                $testRequest = [System.Net.FtpWebRequest]::Create($ftpUri)
                $testRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
                $testRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
                $testRequest.UsePassive = $true
                $testResponse = $testRequest.GetResponse()
                $testResponse.Close()
                Write-Host "Direct connection to $REMOTE_PATH successful!" -ForegroundColor Green
            } catch {
                # If that fails, try root
                Write-Host "Trying root directory instead..." -ForegroundColor Yellow
                $ftpUri = "ftp://$SERVER_HOST/"
            }
        }
        
        # Function to create directory on FTP server (recursive)
        function Create-FtpDirectory($ftpPath) {
            try {
                # Check if directory exists
                $checkRequest = [System.Net.FtpWebRequest]::Create($ftpPath)
                $checkRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
                $checkRequest.Method = [System.Net.WebRequestMethods+Ftp]::ListDirectory
                $checkRequest.UsePassive = $true
                try {
                    $checkResponse = $checkRequest.GetResponse()
                    $checkResponse.Close()
                    return # Directory exists
                } catch {
                    # Directory doesn't exist, create it
                }
                
                # Create directory
                $ftpRequest = [System.Net.FtpWebRequest]::Create($ftpPath)
                $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
                $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
                $ftpRequest.UsePassive = $true
                $response = $ftpRequest.GetResponse()
                $response.Close()
            } catch {
                # Directory might already exist or creation failed, ignore error
            }
        }
        
        # Function to ensure directory path exists (creates all parent directories)
        function Ensure-FtpDirectory($dirPath) {
            $parts = $dirPath.Trim('/').Split('/')
            $currentPath = $ftpUri.TrimEnd('/')
            
            foreach ($part in $parts) {
                if ($part) {
                    $currentPath = "$currentPath/$part"
                    Create-FtpDirectory($currentPath)
                }
            }
        }
        
        # Upload all files recursively
        $files = Get-ChildItem -Path $LOCAL_BUILD_DIR -Recurse -File
        
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring((Resolve-Path $LOCAL_BUILD_DIR).Path.Length + 1)
            $relativePath = $relativePath.Replace('\', '/')
            
            # Create directory structure if needed (recursive)
            $remoteDir = Split-Path $relativePath -Parent
            if ($remoteDir) {
                Ensure-FtpDirectory($remoteDir)
            }
            
            $remoteUri = "$ftpUri$relativePath"
            
            Write-Host "Uploading: $relativePath" -ForegroundColor Cyan
            
            $ftpRequest = [System.Net.FtpWebRequest]::Create($remoteUri)
            $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
            $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
            $ftpRequest.UseBinary = $true
            $ftpRequest.UsePassive = $true
            
            $fileContent = [System.IO.File]::ReadAllBytes($file.FullName)
            $ftpRequest.ContentLength = $fileContent.Length
            
            try {
                # Set timeout
                $ftpRequest.Timeout = 30000
                $ftpRequest.ReadWriteTimeout = 30000
                
                $requestStream = $ftpRequest.GetRequestStream()
                $requestStream.Write($fileContent, 0, $fileContent.Length)
                $requestStream.Close()
                
                $response = $ftpRequest.GetResponse()
                $statusCode = $response.StatusCode
                $response.Close()
                
                if ($statusCode -eq [System.Net.FtpStatusCode]::ClosingData -or 
                    $statusCode -eq [System.Net.FtpStatusCode]::FileActionOK -or
                    $statusCode -eq [System.Net.FtpStatusCode]::DataAlreadyOpen) {
                    Write-Host "  OK" -ForegroundColor Green
                } else {
                    Write-Host "  Warning: Status $statusCode" -ForegroundColor Yellow
                }
            } catch {
                $errorMsg = $_.Exception.Message
                Write-Host "  Failed: $errorMsg" -ForegroundColor Red
                
                # If it's a 550 error, try to create parent directory again
                if ($errorMsg -match "550") {
                    Write-Host "  Retrying with directory creation..." -ForegroundColor Yellow
                    if ($remoteDir) {
                        Ensure-FtpDirectory($remoteDir)
                        # Retry upload
                        try {
                            $retryRequest = [System.Net.FtpWebRequest]::Create($remoteUri)
                            $retryRequest.Credentials = New-Object System.Net.NetworkCredential($SERVER_USER, $SERVER_PASS)
                            $retryRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
                            $retryRequest.UseBinary = $true
                            $retryRequest.UsePassive = $true
                            $retryRequest.Timeout = 30000
                            $retryRequest.ReadWriteTimeout = 30000
                            
                            $retryStream = $retryRequest.GetRequestStream()
                            $retryStream.Write($fileContent, 0, $fileContent.Length)
                            $retryStream.Close()
                            
                            $retryResponse = $retryRequest.GetResponse()
                            $retryResponse.Close()
                            Write-Host "  Retry successful!" -ForegroundColor Green
                        } catch {
                            Write-Host "  Retry also failed: $($_.Exception.Message)" -ForegroundColor Red
                            throw
                        }
                    } else {
                        throw
                    }
                } else {
                    throw
                }
            }
        }
        
        Write-Host "Deployment successful!" -ForegroundColor Green
    } catch {
        Write-Host "Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Error details: $($_.Exception)" -ForegroundColor Red
        Write-Host "Tip: Install WinSCP for better FTP support:" -ForegroundColor Yellow
        Write-Host "   Download from: https://winscp.net/eng/download.php" -ForegroundColor Yellow
        Write-Host "   Or use Git Bash to run deploy.sh" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Deployment complete!" -ForegroundColor Green

