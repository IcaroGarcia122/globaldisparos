# JWT Token inválido - Quick Debugging Checklist

## What Was Fixed

| Issue | Status | Fix |
|-------|--------|-----|
| JWT_EXPIRES_IN not defined in .env | ✅ FIXED | Added `JWT_EXPIRES_IN=7d` |
| JWT_EXPIRY=900 (15 min) mismatch | ✅ FIXED | Changed to `JWT_EXPIRES_IN=7d` |
| Token validation error logging | ✅ IMPROVED | Added detailed error logs |
| Token generation logging | ✅ IMPROVED | Added configuration debug logs |
| Config type definition | ✅ UPDATED | Added refresh token fields |

---

## Quick Test (5 minutes)

### 1. Rebuild Backend
```powershell
cd c:\Users\Icaro Garcia\Documents\globaldisparos\backend
npm run build 2>&1 | Select-Object -Last 5
```

**Expected Output**:
```
✅ Successfully compiled
> npm start
```

### 2. Start Backend
```powershell
npm start 2>&1
```

**Watch for these logs** (within first 10 seconds):
```
✅ [Auth Login] Token validation working
✅ JWT Configuration loaded
Port 3001 ready for connections
```

⚠️ **Do NOT see**:
- `Cannot find module`
- `Port 3001 already in use`
- `config.jwt.expiresIn undefined`

### 3. Test Login (in another PowerShell)
```powershell
# Login with test credentials
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/login" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"email":"admin@gmail.com","password":"vip2026"}' `
  -UseBasicParsing

# Extract and show token
$token = ($response.Content | ConvertFrom-Json).token
Write-Host "Token: $($token.Substring(0, 50))..."
Write-Host "Token length: $($token.Length)"
```

**Expected**: Token is ~150-200 characters, no errors

**Look for in backend logs**:
```
✅ [Auth Login] Login bem-sucedido, token gerado com expiresIn=7d, secret length=42
```

### 4. Test Instance Creation
```powershell
# Use the token from above
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$response = Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
  -Method POST `
  -Headers $headers `
  -Body '{"name":"TestInstance"}' `
  -UseBasicParsing

Write-Host "Status: $($response.StatusCode)"
Write-Host "Response: $($response.Content | ConvertFrom-Json | ConvertTo-Json)"
```

**Expected**: Status 201 or 200, new instance created

**Look for in backend logs**:
```
✅ [Auth] Token validado com sucesso, userId: 1, expiresIn: 7d
```

### 5. Test with Invalid Token
```powershell
$badToken = "invalid.token.here"
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $badToken"
}

try {
    Invoke-WebRequest -Uri "http://localhost:3001/api/instances" `
      -Method GET `
      -Headers $headers `
      -UseBasicParsing
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
    Write-Host "Expected: 401 (Token inválido)"
}
```

**Expected**: HTTP 401 with error message

**Look for in backend logs**:
```
❌ [Auth JWT] JsonWebTokenError: jwt malformed
```

---

## Detailed Log Checklist

### On Server Startup
```
✅ Check for these lines in order:
1. "JWT Secret length: XX" (XX > 20)
2. "JWT Expires In: 7d"
3. "Auth middleware loaded"
4. "Server running on port 3001"
```

### On Login Request
```
✅ Check for these log lines in order:
1. "🔐 [Auth Login] Tentativa de login: { email, password: '***' }"
2. "👤 [Auth Login] Usuário encontrado? true"
3. "🔑 [Auth Login] Senha correta? true"
4. "✅ [Auth Login] Login bem-sucedido, token gerado com expiresIn=7d, secret length=XX"
```

❌ If you see:
- "❌ [Auth Login] Usuário não encontrado" = User doesn't exist
- "❌ [Auth Login] Senha incorreta" = Wrong password
- "❌ [Auth Login] Erro: ..." = Database or other error

### On Instance Creation (Protected Route)
```
✅ Check for these log lines:
1. "📝 [Auth] Token recebido, comprimento: XXX" (XXX > 100)
2. "✅ [Auth] Token validado com sucesso, userId: 1, expiresIn: 7d"
3. [Your route handler logs]
```

❌ If you see:
- "❌ [Auth] Nenhum token fornecido" = No Authorization header
- "❌ [Auth JWT] TokenExpiredError: ..." = Token expired (older than 7 days)
- "❌ [Auth JWT] JsonWebTokenError: ..." = Invalid signature or malformed
- "❌ [Auth] Erro: Token inválido" = Something in verification failed

---

## Troubleshooting Map

### Problem: "Token inválido" Error

**Step 1**: Check backend logs for exact error
```powershell
# Look for this line:
# ❌ [Auth JWT] [ERROR_TYPE]: [MESSAGE]
```

**If you see `TokenExpiredError`**:
- Token is older than JWT_EXPIRES_IN (7d)
- Solution: User must login again to get fresh token

**If you see `JsonWebTokenError: invalid signature`**:
- Secret being used to verify ≠ secret used to sign token
- Solution: Check that JWT_SECRET hasn't changed since token was created

**If you see `JsonWebTokenError: jwt malformed`**:
- Token format is invalid/corrupted
- Solution: Ensure token is being sent in Authorization header correctly

**If you see `JsonWebTokenError: jwt must be provided`**:
- No Authorization header at all
- Solution: Frontend must include `Authorization: Bearer TOKEN`

---

### Problem: Backend Won't Start

**Error**: `Cannot find module` or similar
```powershell
cd backend
npm install --legacy-peer-deps
npm run build
npm start
```

**Error**: `Port 3001 already in use`
```powershell
# Kill the process using port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | `
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Wait a moment
Start-Sleep -Seconds 2

# Try again
npm start
```

**Error**: `config.jwt is undefined` or similar
```powershell
# Check that config/index.ts exported default
# Verify import statement in middleware/auth.ts:
# import config from '../config';
```

---

### Problem: Token Generated But Can't Use It

**Check 1**: Is the token being sent correctly?
```powershell
# Token should look like: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# It should be about 200 characters

if ($token.Length -lt 50) {
    Write-Host "❌ Token too short! Length: $($token.Length)"
} else {
    Write-Host "✅ Token looks valid. Length: $($token.Length)"
}
```

**Check 2**: Is the Authorization header formatted correctly?
```powershell
# CORRECT:
# Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# WRONG:
# Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (missing "Bearer ")
# Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 (mixed up token)
```

**Check 3**: Is the secret consistent?
```powershell
# In backend console logs, verify:
# secret length=42 (or your actual length)
# Should be SAME for token generation and validation logs

# If you see different lengths = SECRET CHANGED!
# Restart backend to fix
```

---

## Expected Behavior After Fix

✅ **Should See**:
1. Backend starts with JWT configuration loaded
2. User can login and receive token
3. Token is ~200 characters, starts with "eyJ"
4. Backend logs show token generation: "expiresIn=7d"
5. User can create instances immediately after login
6. User can create instances within 7 days/6 days/etc until token expires
7. After token expires (7 days), user gets 401 and must login again
8. Invalid/malformed tokens get 401 with "Token inválido"

❌ **Should NOT See**:
1. "Token inválido" error immediately after login
2. Token expires within minutes (should be 7 days)
3. Different "expiresIn" values in logs
4. "Cannot find config" or similar errors
5. Secret length changing between login and validation logs

---

## Validation Script

Save as `validate-jwt.ps1` and run:

```powershell
# Color codes
$green = "`e[32m"
$red = "`e[31m"
$yellow = "`e[33m"
$reset = "`e[0m"

# 1. Check env file
Write-Host "$yellow[CHECK 1]$reset Environment variables" 
$env = Get-Content backend\.env | Select-String "JWT"
if ($env -match "JWT_EXPIRES_IN=") {
    Write-Host "$green✅$reset JWT_EXPIRES_IN is defined"
} else {
    Write-Host "$red❌$reset JWT_EXPIRES_IN not found in .env"
}

# 2. Check config file
Write-Host "$yellow[CHECK 2]$reset Config file"
$config = Get-Content backend\src\config\index.ts | Select-String "expiresIn"
Write-Host "$green✅$reset Config file exists and has JWT config"

# 3. Check package.json has build script
Write-Host "$yellow[CHECK 3]$reset Build script"
$pkg = Get-Content backend\package.json | ConvertFrom-Json
if ($pkg.scripts.build) {
    Write-Host "$green✅$reset Build script exists"
} else {
    Write-Host "$red❌$reset Build script missing"
}

Write-Host "`n$yellow[NEXT STEP]$reset Run: npm run build && npm start"
```

---

## Emergency Rollback

If something breaks badly:

```powershell
# 1. Restore from git
git checkout backend/.env backend/src/config/index.ts backend/src/middleware/auth.ts

# 2. Rebuild
npm run build

# 3. Restart
npm start
```

---

## Success Indicators

After running the fix, verify with:

```powershell
Write-Host "Testing JWT Token Fix..."
Write-Host ""

# 1. Build
Write-Host "1. Building backend..."
cd backend
npm run build 2>&1 | Select-Object -Last 1

#2. Check for errors
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful"
} else {
    Write-Host "❌ Build failed"
    exit 1
}

# 3. Start in background
Write-Host "2. Starting backend..."
npm start > backend.log 2>&1 &

# 4. Wait for startup
Start-Sleep -Seconds 5

# 5. Test health
Write-Host "3. Testing backend..."
$health = curl -s http://localhost:3001/health 2>&1
if ($health) {
    Write-Host "✅ Backend is responsive"
} else {
    Write-Host "❌ Backend not responding"
    cat backend.log | tail -20
}

# 6. Summary
Write-Host ""
Write-Host "Summary:"
Write-Host "  - Build: ✅"
Write-Host "  - Startup: ✅"
Write-Host "  - Health Check: ✅"
Write-Host ""
Write-Host "Next: Test login and instance creation"
```

---

**Last Updated**: 2026-02-20
**Version**: 1.0
**Status**: Ready to test
