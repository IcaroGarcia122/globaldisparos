#!/usr/bin/env pwsh

Write-Host "[CLEANUP] Remove old instances" -ForegroundColor Yellow

# Login
$loginData = '{"email":"admin@gmail.com","password":"vip2026"}'
$loginResp = curl "http://localhost:3001/api/auth/login" -Method POST -Body $loginData -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
$loginJson = $loginResp.Content | ConvertFrom-Json
$token = $loginJson.token
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Token: OK"

# Get instances
$listResp = curl "http://localhost:3001/api/instances" -Method GET -Headers $headers -UseBasicParsing -ErrorAction Stop
$listJson = $listResp.Content | ConvertFrom-Json
$instances = $listJson.instances

Write-Host "Found $($instances.Count) instances:"
foreach ($inst in $instances) {
  Write-Host "  - ID: $($inst.id), Name: $($inst.name), Status: $($inst.status)"
}

# Delete each
Write-Host "`nDeleting..."
foreach ($inst in $instances) {
  try {
    curl "http://localhost:3001/api/instances/$($inst.id)" -Method DELETE -Headers $headers -UseBasicParsing -ErrorAction Stop | Out-Null
    Write-Host "  [OK] Deleted ID: $($inst.id)"
  } catch {
    Write-Host "  [ERROR] Failed to delete $($inst.id): $_"
  }
}

Write-Host "`nCleanup complete"
