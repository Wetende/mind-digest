# PowerShell script to set Android SDK environment variables
# Run this script to set up Android SDK path for Expo/React Native development

Write-Host "Setting up Android SDK environment variables..." -ForegroundColor Green

# Check if Android SDK exists in common locations
$sdkPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk",
    "$env:PROGRAMFILES\Android\sdk",
    "$env:HOME\Android\Sdk",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
)

$androidSdkPath = $null
foreach ($path in $sdkPaths) {
    if (Test-Path $path) {
        $androidSdkPath = $path
        Write-Host "Found Android SDK at: $androidSdkPath" -ForegroundColor Green
        break
    }
}

if ($null -eq $androidSdkPath) {
    Write-Host "Android SDK not found. Please install Android Studio first:" -ForegroundColor Yellow
    Write-Host "1. Download Android Studio from: https://developer.android.com/studio" -ForegroundColor Yellow
    Write-Host "2. Install Android SDK during setup" -ForegroundColor Yellow
    Write-Host "3. Re-run this script after installation" -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath

# Add Android SDK tools to PATH (if they exist)
$sdkPaths = @(
    "$androidSdkPath\tools\bin",
    "$androidSdkPath\platform-tools",
    "$androidSdkPath\emulator"
)

foreach ($path in $sdkPaths) {
    if (Test-Path $path) {
        $env:Path = "$path;$env:Path"
        Write-Host "Added to PATH: $path" -ForegroundColor Blue
    }
}

# Verify adb command exists
try {
    $adbVersion = & adb version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "ADB found and working!" -ForegroundColor Green
    } else {
        Write-Host "ADB installed but not in PATH" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ADB not found. Make sure Android SDK platform-tools are installed" -ForegroundColor Red
}

Write-Host "Environment setup complete!" -ForegroundColor Green
Write-Host "ANDROID_HOME: $env:ANDROID_HOME"
Write-Host "ANDROID_SDK_ROOT: $env:ANDROID_SDK_ROOT"
Write-Host ""
Write-Host "To make these changes permanent, either:" -ForegroundColor Cyan
Write-Host "1. Run: $env:ANDROID_HOME; $env:ANDROID_SDK_ROOT" -ForegroundColor White
Write-Host "2. Or add them to your system environment variables" -ForegroundColor White
