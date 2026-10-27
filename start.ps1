# ========================================================
#  IoT and Device Telemetry REST Observability Server
#  Windows PowerShell Launcher with Automated Node.js Setup
# ========================================================

Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  IoT and Device Telemetry REST Observability Server" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "[Directory] $PSScriptRoot"
Write-Host ""

# 1. Check Node.js in current PATH and standard installation paths
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    $standardPaths = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:LOCALAPPDATA\Programs\node",
        "$PSScriptRoot\.node"
    )
    foreach ($dir in $standardPaths) {
        if (Test-Path "$dir\node.exe") {
            $env:PATH = "$dir;$env:PATH"
            $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
            break
        }
    }
}

# 2. Automated Node.js Installation if not detected
if (-not $nodeCmd) {
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host "[Notice] Node.js is NOT installed on this computer." -ForegroundColor Yellow
    Write-Host "[提示] 偵測到此電腦尚未安裝 Node.js 執行環境。" -ForegroundColor Yellow
    Write-Host "========================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "[Auto-Setup] Initiating automated Node.js installation..." -ForegroundColor Cyan
    Write-Host "[自動安裝] 正在為您自動下載並安裝 Node.js LTS (約需 1~2 分鐘)..." -ForegroundColor Cyan
    Write-Host ""

    $installed = $false

    # Strategy 1: winget (Windows Package Manager)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "[Step 1/2] Installing via Windows Package Manager (winget)..." -ForegroundColor Cyan
        & winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        if (Test-Path "$env:ProgramFiles\nodejs\node.exe") {
            $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
            $installed = $true
        }
    }

    # Strategy 2: Download official MSI installer from nodejs.org
    if (-not $installed) {
        Write-Host "[Step 2/2] Downloading official Node.js installer from nodejs.org..." -ForegroundColor Cyan
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = "$env:TEMP\nodejs_installer.msi"
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
            if (Test-Path $msiPath) {
                Write-Host "Installing Node.js silently (please click 'Yes' if prompted for permission)..." -ForegroundColor Cyan
                Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /passive /norestart" -Wait
                Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
                if (Test-Path "$env:ProgramFiles\nodejs\node.exe") {
                    $env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"
                }
            }
        } catch {
            Write-Host "[Warning] MSI download encountered an issue: $_" -ForegroundColor DarkYellow
        }
    }

    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Write-Host "========================================================" -ForegroundColor Red
        Write-Host "[ERROR] Automated installation failed." -ForegroundColor Red
        Write-Host "Please download and install Node.js manually from: https://nodejs.org" -ForegroundColor Red
        Write-Host "========================================================" -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[Success] Node.js is ready!" -ForegroundColor Green
    Write-Host ""
}

$nodeVer = & node -v
Write-Host "[Check] Node.js is ready: $nodeVer" -ForegroundColor Green
Write-Host ""

# 3. Check node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "[Notice] First run: installing dependencies..." -ForegroundColor Yellow
    Write-Host "Please wait 1 to 2 minutes..."
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] npm install failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
    Write-Host "[Success] Dependencies installed." -ForegroundColor Green
    Write-Host ""
}

# 4. Check build
if ((-not (Test-Path "server.js")) -or (-not (Test-Path "dist"))) {
    Write-Host "[Notice] Compiling assets..." -ForegroundColor Yellow
    npm run build
}

# 5. Start server (will automatically launch browser when listening)
if (-not $env:PORT) { $env:PORT = "5050" }
Write-Host "[Starting] Launching server on port $($env:PORT)..." -ForegroundColor Cyan
Write-Host "Access URLs: http://127.0.0.1:$($env:PORT) or http://localhost:$($env:PORT)" -ForegroundColor Yellow
Write-Host ""

# 6. Run server
if (Test-Path "server.js") {
    node server.js
} else {
    npm start
}

Read-Host "Server stopped. Press Enter to exit..."
