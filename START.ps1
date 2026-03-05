#!/usr/bin/env powershell
# Quick Start Script for Windows Development

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "🚀 STARTING GLOBAL DISPAROS" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing node processes
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "npm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "✅ Old processes cleaned" -ForegroundColor Green
Write-Host ""

# Verify PostgreSQL connection
Write-Host "Checking PostgreSQL..." -ForegroundColor Yellow
try {
  $conn = New-Object System.Data.SqlClient.SqlConnection
  $conn.ConnectionString = "Server=localhost;User Id=postgres;Password=icit0707;database=postgres;Connection Timeout=3"
  $conn.Open()
  $conn.Close()
  Write-Host "✅ PostgreSQL is running" -ForegroundColor Green
} catch {
  Write-Host "⚠️  PostgreSQL might not be running. Please ensure it's started." -ForegroundColor Yellow
}

Write-Host ""

# Start Backend
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Starting Backend..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

cd "backend"
Write-Host "Building backend..." -ForegroundColor Yellow
npm run build 2>&1 | Select-Object -Last 2

Write-Host "Starting npm start..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "start" -PassThru | Out-Null

Start-Sleep -Seconds 6

# Test backend
Write-Host ""
Write-Host "Testing backend health..." -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction Stop
  Write-Host "✅ Backend is responding!" -ForegroundColor Green
  Write-Host $response.Content
} catch {
  Write-Host "⚠️  Backend is not responding yet. It may still be initializing..." -ForegroundColor Yellow
}

Write-Host ""

# Start Frontend
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Starting Frontend..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

cd "..\frontend"
Write-Host "Starting frontend dev server..." -ForegroundColor Yellow
Start-Process -FilePath "npm" -ArgumentList "run dev" -PassThru | Out-Null

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "✅ APPLICATION STARTED" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Frontend:  http://localhost:8080" -ForegroundColor Cyan
Write-Host "📍 Backend:   http://localhost:3001" -ForegroundColor Cyan
Write-Host "📍 Health:    http://localhost:3001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Keep this window open to maintain the servers running" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop: Press Ctrl+C (multiple times if needed) or close this window" -ForegroundColor Yellow
Write-Host ""

# Keep PowerShell window open
Read-Host "Press Enter to keep the window open" | Out-Null
