@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>nul
title IoT and Device Telemetry Observability Server

echo ========================================================
echo   IoT and Device Telemetry REST Observability Server
echo ========================================================
echo [Directory] %~dp0
echo.

:: 1. Check if Node.js is already accessible
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK

:: Check common default Node.js installation folders
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
    goto :NODE_OK
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "PATH=%PATH%;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm"
    goto :NODE_OK
)
if exist "%LocalAppData%\Programs\node\node.exe" (
    set "PATH=%PATH%;%LocalAppData%\Programs\node;%APPDATA%\npm"
    goto :NODE_OK
)
if exist "%~dp0.node\node.exe" (
    set "PATH=%~dp0.node;%PATH%"
    goto :NODE_OK
)

:: 2. Node.js is NOT found -> Initiate Automated Installation
goto :AUTO_INSTALL_NODE

:AUTO_INSTALL_NODE
echo ========================================================
echo [Notice] Node.js is NOT installed on this computer.
echo [提示] 偵測到此電腦尚未安裝 Node.js 執行環境。
echo ========================================================
echo.
echo [Auto-Setup] Initiating automated Node.js LTS installation...
echo [自動安裝] 正在為您自動下載並安裝 Node.js LTS (約需 1~2 分鐘)...
echo.

:: Strategy A: Check if winget (Windows Package Manager) is available
where winget >nul 2>nul
if %errorlevel% neq 0 goto :STRATEGY_DOWNLOAD_MSI

echo [Step 1/2] Installing via Windows Package Manager (winget)...
echo 正在透過 Windows 套件管理員 (winget) 自動安裝...
call winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
    goto :NODE_OK
)
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK

:STRATEGY_DOWNLOAD_MSI
echo.
echo [Step 2/2] Downloading official Node.js LTS installer from nodejs.org...
echo 正在透過 PowerShell 下載 Node.js 官方安裝包...
set "NODE_MSI=%TEMP%\nodejs_installer_lts.msi"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
    "$url = 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi'; " ^
    "(New-Object System.Net.WebClient).DownloadFile($url, '%NODE_MSI%')"

if not exist "%NODE_MSI%" goto :INSTALL_MANUAL_GUIDE

echo [Notice] Installing Node.js silently (please click 'Yes' if system prompts for permission)...
echo [提示] 正在安裝 Node.js (若跳出系統權限提示視窗請點擊「是」)...
msiexec /i "%NODE_MSI%" /passive /norestart
del "%NODE_MSI%" >nul 2>nul

if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
    goto :NODE_OK
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "PATH=%PATH%;%ProgramFiles(x86)%\nodejs;%APPDATA%\npm"
    goto :NODE_OK
)
where node >nul 2>nul
if %errorlevel% equ 0 goto :NODE_OK

goto :INSTALL_MANUAL_GUIDE

:NODE_OK
echo [Check] Node.js is ready:
node -v
echo.

if not exist "node_modules" goto :RUN_INSTALL
goto :CHECK_BUILD

:RUN_INSTALL
echo [Notice] First run detected. Installing dependencies...
echo Please wait 1 to 2 minutes...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 goto :INSTALL_FAIL
echo [Success] Dependencies installed successfully.
echo.
goto :CHECK_BUILD

:INSTALL_FAIL
echo [ERROR] npm install failed. Please check your internet connection.
goto :HALT

:CHECK_BUILD
if not exist "server.js" goto :DO_BUILD
if not exist "dist" goto :DO_BUILD
goto :LAUNCH_SERVER

:DO_BUILD
echo [Notice] Compiling server and frontend assets...
call npm run build
if %errorlevel% neq 0 goto :BUILD_FAIL
echo [Success] Build complete.
echo.
goto :LAUNCH_SERVER

:BUILD_FAIL
echo [Warning] Build step encountered an issue. Attempting direct launch...
echo.
goto :LAUNCH_SERVER

:LAUNCH_SERVER
if "%PORT%"=="" set PORT=5050
echo [Starting] Starting REST Telemetry Server on port %PORT%...
echo [Notice] The server will automatically launch your browser once listening.
echo.
echo Access URLs:
echo   http://127.0.0.1:%PORT%
echo   http://localhost:%PORT%
echo ========================================================
echo.

if exist "server.js" (
    node server.js
    goto :SERVER_EXITED
)

if exist "server.ts" (
    call npx tsx server.ts
    goto :SERVER_EXITED
)

call npm start
goto :SERVER_EXITED

:INSTALL_MANUAL_GUIDE
echo ========================================================
echo [ERROR] Automated Node.js installation could not complete.
echo [錯誤] 自動安裝未完成，請手動前往官網安裝：
echo ========================================================
echo.
echo Official Download: https://nodejs.org/ (LTS version)
echo 官網下載網址：https://nodejs.org/ (請選擇 LTS 建議版本)
echo.
echo After installation finishes, please double-click start.bat again!
echo 安裝完成後，請重新雙擊 start.bat 即可一鍵運行！
echo.
goto :HALT

:SERVER_EXITED
echo.
echo [Server stopped] Server process has terminated.
goto :HALT

:HALT
echo ========================================================
echo Press any key to close this window...
echo 請按任意鍵關閉此視窗...
pause >nul
exit /b 0
