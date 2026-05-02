# Pavane startup script for Windows
$env:PATH = "C:\Users\carlo\AppData\Roaming\npm;" + $env:PATH

# Load .env
if (Test-Path ".env") {
    Get-Content ".env" | Where-Object { $_ -match "^[A-Z_]+=.+" } | ForEach-Object {
        $key, $value = $_ -split "=", 2
        [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

Write-Host "Starting Pavane API on http://localhost:7124" -ForegroundColor Cyan
Write-Host "Starting Pavane UI on http://localhost:7123" -ForegroundColor Cyan
Write-Host ""

# Start API in background
$apiJob = Start-Job -ScriptBlock {
    $env:PATH = "C:\Users\carlo\AppData\Roaming\npm;" + $env:PATH
    cd "C:\Users\carlo\Documents\Antigravity\PAVANE\apps\api"
    npx tsx watch src/index.ts
}

# Wait for API to start
Start-Sleep -Seconds 3

# Start web in foreground
cd "C:\Users\carlo\Documents\Antigravity\PAVANE\apps\web"
npx next dev -p 7123
