# IT Issue Tracker - User Creation Script (PowerShell)
# สร้าง users ผ่าน API /auth/register ตามที่ระบุใน requirements

$BaseUrl = "http://localhost:3000"
$ApiUrl = "$BaseUrl/api/auth/register"

Write-Host "🚀 Creating default users for IT Issue Tracker..." -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan

# Function to create user
function New-UserAccount {
    param(
        [string]$Username,
        [SecureString]$Password,
        [string]$Role
    )
    
    Write-Host "Creating user: $Username (Role: $Role)" -ForegroundColor Yellow
    
    # Convert SecureString to plain text for API call
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    $body = @{
        username = $Username
        password = $PlainPassword
        role = $Role
    } | ConvertTo-Json
    
    try {
        $null = Invoke-RestMethod -Uri $ApiUrl -Method POST -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "✅ User '$Username' created successfully" -ForegroundColor Green
    }
    catch {
        if ($_.Exception.Response.StatusCode -eq 409) {
            Write-Host "⚠️  User '$Username' already exists" -ForegroundColor Yellow
        } else {
            Write-Host "❌ Failed to create user '$Username': $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    Write-Host ""
}

# Wait for server to be ready
Write-Host "⏳ Waiting for server to be ready..." -ForegroundColor Cyan
for ($i = 1; $i -le 30; $i++) {
    try {
        $null = Invoke-WebRequest -Uri $BaseUrl -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ Server is ready!" -ForegroundColor Green
        break
    }
    catch {
        Write-Host "Waiting... ($i/30)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

# Create default users
Write-Host "👥 Creating default users..." -ForegroundColor Cyan
Write-Host ""

# Admin user
$adminPassword = ConvertTo-SecureString "admin" -AsPlainText -Force
New-UserAccount -Username "admin" -Password $adminPassword -Role "admin"

# Support users
$supportPassword = ConvertTo-SecureString "support01" -AsPlainText -Force
New-UserAccount -Username "support01" -Password $supportPassword -Role "support"

$supportPassword2 = ConvertTo-SecureString "support02" -AsPlainText -Force
New-UserAccount -Username "support02" -Password $supportPassword2 -Role "support"

# Regular user
$userPassword = ConvertTo-SecureString "user" -AsPlainText -Force
New-UserAccount -Username "user" -Password $userPassword -Role "user"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 User creation completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Default Users:" -ForegroundColor White
Write-Host "  Username    | Password | Role" -ForegroundColor Gray
Write-Host "  ------------|----------|--------" -ForegroundColor Gray
Write-Host "  admin       | admin | admin" -ForegroundColor White
Write-Host "  support01   | support01 | support" -ForegroundColor White
Write-Host "  support02   | support02 | support" -ForegroundColor White
Write-Host "  user        | user | user" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access the application at: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# Test login for admin user
Write-Host "🧪 Testing admin login..." -ForegroundColor Cyan
$loginBody = @{
    username = "admin"
    password = "admin"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
    if ($loginResponse.token) {
        Write-Host "✅ Admin login test successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Admin login test failed: No token received" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Admin login test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✨ Setup complete! You can now log in with any of the users above." -ForegroundColor Green
