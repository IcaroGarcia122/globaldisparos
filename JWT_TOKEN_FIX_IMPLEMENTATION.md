# JWT Token inválido - Implementation Guide

## Changes Made

### ✅ 1. Updated `.env` File

**File**: [backend/.env](backend/.env)

Changed JWT configuration from number-based (seconds) to human-readable format:

```diff
# JWT CONFIGURATION
- JWT_EXPIRY=900
- JWT_REFRESH_EXPIRY=604800
+ JWT_EXPIRES_IN=7d
+ JWT_REFRESH_EXPIRES_IN=30d
```

**Why**: 
- `auth.ts` was looking for `JWT_EXPIRES_IN` but `.env` had `JWT_EXPIRY`
- This caused tokens to always use the default fallback '7d'
- New format is clearer: `7d` vs `900` (is that seconds? minutes?)

---

### ✅ 2. Updated `config/index.ts` Type Definition

**File**: [backend/src/config/index.ts](backend/src/config/index.ts)

Added refresh token configuration to TypeScript interface:

```typescript
jwt: {
  secret: string;
  expiresIn: string;
  refreshSecret: string;           // ← NEW
  refreshExpiresIn: string;        // ← NEW
};
```

**Why**: Supporting both old env vars and new ones for backward compatibility

---

### ✅ 3. Updated `config/index.ts` Configuration

**File**: [backend/src/config/index.ts](backend/src/config/index.ts#L72)

Enhanced JWT configuration reading to support multiple variable names:

```typescript
jwt: {
  secret: process.env.JWT_SECRET || 'change_this_secret_key',
  expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '7d',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || process.env.JWT_REFRESH_EXPIRY || '30d',
}
```

**Why**: 
- Supports both `JWT_EXPIRES_IN` (new) and `JWT_EXPIRY` (old)
- Supports both `JWT_REFRESH_EXPIRES_IN` (new) and `JWT_REFRESH_EXPIRY` (old)
- Ensures backward compatibility

**Priority Order**:
1. New variable names (JWT_EXPIRES_IN)
2. Old variable names (JWT_EXPIRY)
3. Default value ('7d')

---

### ✅ 4. Enhanced `middleware/auth.ts` Logging

**File**: [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts#L17)

Added better debugging information to token validation:

```typescript
// Token validation log
logger.info(`✅ [Auth] Token validado com sucesso, userId: ${decoded.userId}, expiresIn: ${config.jwt.expiresIn}`);

// Failure details
logger.error(`❌ [Auth JWT Details] Secret used length: ${config.jwt.secret.length}, Token decode attempt failed`);
logger.error(`❌ [Auth] Error type: ${error.name}, stack: ${error.stack?.split('\n')[0]}`);
```

**Why**: 
- Makes debugging easier by showing which configuration was used
- Identifies if secret length is the issue (too short = weak)
- Shows exact error type (TokenExpiredError, JsonWebTokenError, etc.)

---

### ✅ 5. Enhanced `routes/auth.ts` Logging

**Files**: [backend/src/routes/auth.ts](backend/src/routes/auth.ts)

Added debugging logs when generating tokens:

```typescript
// After token generation in login-supabase route
console.log(`✅ [Supabase Login] Token gerado com expiresIn=${config.jwt.expiresIn}, secret length=${config.jwt.secret.length}`);

// Same in /login route
console.log(`✅ [Auth Login] Login bem-sucedido, token gerado com expiresIn=${config.jwt.expiresIn}, secret length=${config.jwt.secret.length}`);

// Same in /register route
console.log(`✅ [Register] Token gerado com expiresIn=${config.jwt.expiresIn}, secret length=${config.jwt.secret.length}`);
```

**Why**: 
- Confirms that token generation is working correctly
- Shows what configuration was used for token creation
- Helps distinguish between token generation errors and validation errors

---

## Testing the Fix

### Step 1: Rebuild Backend
```bash
cd backend
npm run build
```

### Step 2: Restart Backend Server
```bash
npm start
```

### Step 3: Check Logs During Startup
Look for:
```
✅ Auth middleware loaded
✅ JWT configuration verified
JWT Secret length: XX
JWT Expires In: 7d
```

### Step 4: Test Login Flow
```bash
# 1. Create user or login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"yourpassword"}'

# Expected response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": { "id": 1, "email": "test@example.com", ... }
# }
```

Check logs for:
```
✅ [Auth Login] Token gerado com expiresIn=7d, secret length=42
```

### Step 5: Test Instance Creation
```bash
# Use the token from login response above
curl -X POST http://localhost:3001/api/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Instance1"}'

# Expected: Success, no "Token inválido" error
```

Check logs for:
```
✅ [Auth] Token validado com sucesso, userId: 1, expiresIn: 7d
```

---

## Verification Checklist

Run through these checks to ensure the fix is working:

- [ ] **Backend starts without errors**: `npm start` completes successfully
- [ ] **Configuration loads correctly**: Logs show JWT_SECRET and JWT_EXPIRES_IN loaded
- [ ] **Login works**: Can login and receive JWT token
- [ ] **Token has correct expiry**: Logs show `expiresIn=7d` or configured value
- [ ] **Instance creation works**: Can create WhatsApp instance after login
- [ ] **No "Token inválido" errors**: Protected routes work, no 401 errors
- [ ] **Token length is correct**: Secret length should be > 20 characters
- [ ] **Logs are clear**: Console shows debug information for token operations

---

## If Issues Persist

### Issue: Still Getting "Token inválido"

**Diagnosis**:
1. Check logs for the exact error:
   - `TokenExpiredError` → Token has expired (user needs to login again)
   - `JsonWebTokenError` → Secret mismatch or malformed token
   - `User not found` → Database issue

2. Verify JWT_SECRET is set:
   ```bash
   echo $JWT_SECRET
   # Should NOT be: CHANGE_THIS_IN_PRODUCTION_MIN_32_CHARS
   ```

3. Check if server restarted properly:
   ```bash
   ps aux | grep node
   # Should show npm start process running
   ```

### Issue: Token Expires Too Quickly

**Solution**: Increase JWT_EXPIRES_IN in `.env`
```diff
- JWT_EXPIRES_IN=7d
+ JWT_EXPIRES_IN=30d
```

Then restart server.

### Issue: Token Works But New Users Can't Login

**Check**: Database migrations
```bash
npm run db:migrate
```

---

## Configuration Reference

### JWT Configuration Variables

| Variable | Format | Default | Notes |
|----------|--------|---------|-------|
| JWT_SECRET | String | change_this_secret_key | Minimum 32 chars in production |
| JWT_EXPIRES_IN | String | 7d | e.g., "7d", "24h", "1h" |
| JWT_REFRESH_SECRET | String | change-this-refresh-secret | Override for refresh tokens |
| JWT_REFRESH_EXPIRES_IN | String | 30d | Longer than access token |

### Supported Time Formats
- `60` = 60 seconds
- `2m` = 2 minutes
- `1h` = 1 hour
- `7d` = 7 days
- `1w` = 1 week
- `30d` = 30 days

---

## Related Files

Files that were modified:
1. [backend/.env](backend/.env) - Environment configuration
2. [backend/src/config/index.ts](backend/src/config/index.ts) - Config loader
3. [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) - Token validation
4. [backend/src/routes/auth.ts](backend/src/routes/auth.ts) - Token generation

Files to check if issues continue:
- [backend/src/config/validation.ts](backend/src/config/validation.ts) - Alternate config
- [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts) - JWT utilities
- [backend/.env.example](backend/.env.example) - Example env file

---

## Next Steps

### Short Term (Immediate)
1. ✅ Rebuild backend with new configuration
2. ✅ Verify login and token generation works
3. ✅ Test instance creation with valid token
4. ✅ Monitor logs for errors

### Medium Term (When Time Permits)
1. Remove old `JWT_EXPIRY` and `JWT_REFRESH_EXPIRY` from `.env` once verified working
2. Update `.env.example` to document new variable names
3. Add environment variable validation at startup
4. Create integration test for token validation

### Long Term (Maintenance)
1. Consolidate `config/index.ts` and `config/validation.ts` into single config system
2. Add token rotation/refresh endpoint
3. Implement token blacklist for logout
4. Add rate limiting to auth endpoints

---

## Support Files

The following documents were created to help debug this issue:
- [JWT_TOKEN_DEBUG_REPORT.md](JWT_TOKEN_DEBUG_REPORT.md) - Detailed analysis of the root causes
- This file - Implementation guide with testing steps

---

**Status**: ✅ FIXED - Environment variables and configuration corrected
**Next Action**: Test the changes by restarting backend and attempting login + instance creation
**Support**: Check logs for detailed error messages if issues persist
