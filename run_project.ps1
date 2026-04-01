$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = $PSScriptRoot

if (-not (Test-Path (Join-Path $root "backend"))) {
  throw "Missing backend folder at: $root\\backend"
}
if (-not (Test-Path (Join-Path $root "frontend"))) {
  throw "Missing frontend folder at: $root\\frontend"
}
if (-not (Test-Path (Join-Path $root "ai-service"))) {
  throw "Missing ai-service folder at: $root\\ai-service"
}

Write-Host "Starting Peer Connect services..." -ForegroundColor Cyan
Write-Host "Backend  -> http://localhost:5000" -ForegroundColor Yellow
Write-Host "Frontend -> http://localhost:3000" -ForegroundColor Yellow
Write-Host "AI       -> http://localhost:8001" -ForegroundColor Yellow

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw "npm not found in PATH. Install Node.js first."
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "python not found in PATH. Install Python first."
}

$backendCmd = "cd /d `"$root\\backend`" && npm run dev"
$frontendCmd = "cd /d `"$root\\frontend`" && npm run dev"
$aiCmd = "cd /d `"$root\\ai-service`" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"

Start-Process cmd.exe -ArgumentList "/k", $backendCmd
Start-Process cmd.exe -ArgumentList "/k", $frontendCmd
Start-Process cmd.exe -ArgumentList "/k", $aiCmd

Write-Host "All services launched in separate terminals." -ForegroundColor Green
Write-Host "Use Ctrl+C in each terminal window to stop them." -ForegroundColor Green

function Wait-ForPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][string]$Name,
    [int]$TimeoutSeconds = 60
  )

  $started = Get-Date
  while (((Get-Date) - $started).TotalSeconds -lt $TimeoutSeconds) {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
      Write-Host "$Name ready on port $Port" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Milliseconds 800
  }

  Write-Host "$Name is still starting (port $Port not open yet)." -ForegroundColor Yellow
  return $false
}

Write-Host "Checking service health..." -ForegroundColor Cyan
Wait-ForPort -Port 5000 -Name "Backend" -TimeoutSeconds 45 | Out-Null
Wait-ForPort -Port 3000 -Name "Frontend" -TimeoutSeconds 45 | Out-Null
Wait-ForPort -Port 8001 -Name "AI service" -TimeoutSeconds 120 | Out-Null
