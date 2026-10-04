# IT Issue Tracker - Demo User Creation Script (PowerShell)
# Creates users through POST /api/auth/register (as required by the assignment).
# Roles other than "user" can only be assigned by an admin, so the script logs in as the
# seeded admin first and sends its Bearer token with every register call.

$ErrorActionPreference = "Stop"
$BaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { "http://localhost:3000" }
$ApiUrl = "$BaseUrl/api/auth/register"

# Read ADMIN_USERNAME / ADMIN_PASSWORD / DEMO_PASSWORD from .env
$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) ".env"
$config = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object {
        $key, $value = $_ -split '=', 2
        $config[$key] = $value
    }
}
$AdminUsername = if ($config["ADMIN_USERNAME"]) { $config["ADMIN_USERNAME"] } else { "admin" }
$AdminPassword = $config["ADMIN_PASSWORD"]
$DemoPassword = $config["DEMO_PASSWORD"]

if (-not $AdminPassword -or -not $DemoPassword) {
    Write-Host "ADMIN_PASSWORD / DEMO_PASSWORD are not set in .env - run: bash scripts/init-env.sh" -ForegroundColor Red
    exit 1
}

Write-Host "Creating demo users for IT Issue Tracker..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Wait for server to be ready
Write-Host "Waiting for server to be ready..." -ForegroundColor Cyan
for ($i = 1; $i -le 30; $i++) {
    try {
        $null = Invoke-WebRequest -Uri $BaseUrl -Method GET -TimeoutSec 5 -UseBasicParsing
        Write-Host "Server is ready!" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "Waiting... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

# Log in as the admin created by scripts/seed-admin.js
Write-Host "Logging in as admin '$AdminUsername'..." -ForegroundColor Cyan
$loginBody = @{ username = $AdminUsername; password = $AdminPassword } | ConvertTo-Json
try {
    $login = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
}
catch {
    Write-Host "Admin login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
$headers = @{ Authorization = "Bearer $($login.token)" }

# Function to create user (as admin)
function New-UserAccount {
    param(
        [string]$Username,
        [string]$Role
    )

    Write-Host "Creating user: $Username (Role: $Role)" -ForegroundColor Yellow
    $body = @{ username = $Username; password = $DemoPassword; role = $Role } | ConvertTo-Json
    try {
        $null = Invoke-RestMethod -Uri $ApiUrl -Method POST -Headers $headers -Body $body -ContentType "application/json"
        Write-Host "User '$Username' created successfully" -ForegroundColor Green
    }
    catch {
        if ($_.ErrorDetails.Message -match "exists") {
            Write-Host "User '$Username' already exists" -ForegroundColor Yellow
        } else {
            Write-Host "Failed to create user '$Username': $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

New-UserAccount -Username "support01" -Role "support"
New-UserAccount -Username "support02" -Role "support"
New-UserAccount -Username "user" -Role "user"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Demo users:" -ForegroundColor White
Write-Host "  $AdminUsername | admin   | password = ADMIN_PASSWORD in .env" -ForegroundColor White
Write-Host "  support01 | support | password = DEMO_PASSWORD in .env" -ForegroundColor White
Write-Host "  support02 | support | password = DEMO_PASSWORD in .env" -ForegroundColor White
Write-Host "  user      | user    | password = DEMO_PASSWORD in .env" -ForegroundColor White
Write-Host "Open the app at: $BaseUrl" -ForegroundColor Cyan
