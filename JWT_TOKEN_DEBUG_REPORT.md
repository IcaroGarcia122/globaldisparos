# JWT Token inválido - Debugging Report

**Issue**: "Token inválido" error when creating WhatsApp instances after login

---

## 1. ROOT CAUSES IDENTIFIED

### 🔴 **CRITICAL ISSUE #1: Environment Variable Mismatch**

**Problem**: The `.env` file uses conflicting JWT expiry variable names

```
# In .env (line 29)
JWT_EXPIRY=900              ❌ This is in SECONDS (15 minutes)

# Missing from .env
JWT_EXPIRES_IN=???          ❌ This env var is NOT defined
```

**Impact**:
- [auth.ts](auth.ts#L25) signs tokens using: `process.env.JWT_EXPIRES_IN || '7d'`
- Since `JWT_EXPIRES_IN` is undefined, tokens get 7-day expiry (default)
- BUT the `.env` suggests 15-minute expiry (JWT_EXPIRY=900)
- This creates confusion about actual token lifetime

**Files Affected**:
- [backend/src/config/index.ts](backend/src/config/index.ts#L72) - Expects `JWT_EXPIRES_IN` 
- [backend/.env](backend/.env#L29) - Defines `JWT_EXPIRY` instead

---

### 🔴 **CRITICAL ISSUE #2: Two Conflicting Config Systems**

**Problem**: Two different configuration files with different JWT settings

```
OLD CONFIG (backend/src/config/index.ts):
├── jwt.secret = process.env.JWT_SECRET || 'change_this_secret_key'
├── jwt.expiresIn = process.env.JWT_EXPIRES_IN || '7d'  [STRING]
└── Used by: auth.ts routes (login, register, login-supabase)

NEW CONFIG (backend/src/config/validation.ts):
├── jwtSecret = process.env.JWT_SECRET || 'change-this-secret-key-in-production'
├── jwtExpiry = getEnvNumber(process.env.JWT_EXPIRY, 900)  [NUMBER in SECONDS]
└── Used by: jwt.ts utils (token generation/verification)
```

**How This Causes Errors**:
1. Login route signs token with config from `config/index.ts`
2. Instance creation tries to verify token with middleware from `config/index.ts`
3. BUT the .env has `JWT_EXPIRY=900` (15 min) instead of `JWT_EXPIRES_IN=7d`
4. If tokens are verified by jwt.ts utils elsewhere, they use jwtExpiry (900 seconds)
5. **MISMATCH**: Token expires after 15 minutes but claims to be valid for 7 days

---

### 🟠 **ISSUE #3: Inconsistent Default Secrets**

```
config/index.ts line 71:
  secret: 'change_this_secret_key'

config/validation.ts line 130:
  jwtSecret: 'change-this-secret-key-in-production'

.env line 27:
  JWT_SECRET=CHANGE_THIS_IN_PRODUCTION_MIN_32_CHARS
```

**If JWT_SECRET is not set in .env properly**, the fallback defaults differ between files

---

## 2. TOKEN GENERATION & VERIFICATION FLOW

### Current Flow (PROBLEMATIC)

```
Login Request
    ↓
auth.ts uses config.jwt.secret ✅
    ↓
Token signed with '7d' expiry (from JWT_EXPIRES_IN default)
    ↓
Token returned to frontend
    ↓
Frontend includes token in Authorization header
    ↓
authenticate middleware in auth.ts
    ├─ Uses: config.jwt.secret ✅ (same as generation)
    ├─ Calls: jwt.verify(token, config.jwt.secret)
    └─ Token should validate... BUT
        ❌ If JWT_EXPIRY=900 is being checked elsewhere
        ❌ If token already expired (15 min < 7d)
        ❌ If config.jwt.secret differs from process.env.JWT_SECRET
```

---

## 3. KEY FILES & CONFIGURATION

### [backend/.env](backend/.env) (Current)
```dotenv
JWT_SECRET=CHANGE_THIS_IN_PRODUCTION_MIN_32_CHARS
JWT_REFRESH_SECRET=CHANGE_THIS_REFRESH_SECRET_ALSO  
JWT_EXPIRY=900                    ❌ NEVER USED BY AUTH.TS
JWT_REFRESH_EXPIRY=604800
```

**Missing**:
```
JWT_EXPIRES_IN=7d                 ← Should be added for clarity
```

---

### [backend/src/config/index.ts](backend/src/config/index.ts) (OLD)
```typescript
jwt: {
  secret: process.env.JWT_SECRET || 'change_this_secret_key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',  // Looks for wrong var name!
}
```

**Used by**:
- `auth.ts` (login, register, login-supabase) ← TOKEN GENERATION
- `middleware/auth.ts` (authenticate) ← TOKEN VERIFICATION

---

### [backend/src/config/validation.ts](backend/src/config/validation.ts) (NEW)
```typescript
jwtSecret: process.env.JWT_SECRET || 'change-this-secret-key-in-production',
jwtExpiry: getEnvNumber(process.env.JWT_EXPIRY, 900),  // 15 minutes in seconds!
jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret',
jwtRefreshExpiry: getEnvNumber(process.env.JWT_REFRESH_EXPIRY, 604800),
```

**Used by**:
- `utils/jwt.ts` (token generation/verification helpers) ← SOMETIMES CALLED

---

### [backend/src/utils/jwt.ts](backend/src/utils/jwt.ts)
```typescript
generateAccessToken(payload) {
  // Uses envConfig.jwtSecret and envConfig.jwtExpiry
  // expiresIn: 900 seconds = 15 minutes! ⚠️
}

verifyAccessToken(token) {
  // Uses envConfig.jwtSecret
  // Should work IF secret matches
}
```

---

## 4. SCENARIO ANALYSIS: Why "Token inválido"?

### Scenario A: Token Already Expired
```
1. User logs in at 2:05 PM
2. Token generated with expiresIn: '7d' 
3. BUT if JWT_EXPIRY=900 is checked somewhere...
4. Token treated as expired after 15 minutes (2:20 PM)
5. User can't create instances at 2:25 PM ← Token inválido
```

### Scenario B: Config Mismatch
```
1. auth.ts signs token with config/index.ts secret
2. middleware tries to verify with config/index.ts secret
3. But if .env JWT_SECRET changed since server started...
4. Token was signed with old secret, verified with new secret
5. Verification fails ← Token inválido
```

### Scenario C: Debug Mode Testing
```
1. .env.test has: JWT_EXPIRY=24h (string, not number!)
2. getEnvNumber('24h', 900) returns 900 (can't parse '24h')
3. Tokens expire in 15 minutes during tests
4. User gets "Token inválido" before expected expiry
```

---

## 5. RECOMMENDATIONS

### 🔧 STEP 1: Standardize Environment Variables

**[backend/.env](backend/.env)** - Replace:
```dotenv
# OLD
JWT_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

# NEW
JWT_EXPIRY=7d              → Match config/index.ts expectation OR
JWT_EXPIRES_IN=7d          → What auth.ts actually uses (RECOMMENDED)
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRES_IN=7d
```

**Recommendation**: Use human-readable format consistently:
```dotenv
JWT_EXPIRY=7d              # 7 days
JWT_REFRESH_EXPIRY=30d     # 30 days
```

---

### 🔧 STEP 2: Consolidate Configuration

**Option A (Recommended)**: Use only `config/index.ts`
- Remove/deprecate `config/validation.ts`
- Update all imports to use single config source
- Ensure no mixed config usage

**Option B**: Use only `config/validation.ts`
- Update `auth.ts` to import from validation.ts
- Update environment variable names to be consistent

---

### 🔧 STEP 3: Fix Token Expiry Settings

**Current (WRONG)**:
```
.env: JWT_EXPIRY=900
auth.ts looks for: JWT_EXPIRES_IN
Result: Default '7d' used, but .env suggests 15 min
```

**Fixed**:
```
.env: JWT_EXPIRES_IN=7d
auth.ts looks for: JWT_EXPIRES_IN
Result: Token expires in 7 days as intended
```

---

### 🔧 STEP 4: Verify Secret Consistency

Ensure `JWT_SECRET` in `.env`:
- Is not the placeholder 'CHANGE_THIS_IN_PRODUCTION_MIN_32_CHARS'
- Is at least 32 characters for security
- Does NOT change between server restarts

```bash
# Check current secret (for development only!)
echo $JWT_SECRET

# Should output stable, consistent value
```

---

## 6. IMPLEMENTATION PLAN

### Phase 1: Fix Environment Variables (URGENT)
1. Update `.env` to use consistent variable names:
   ```dotenv
   JWT_EXPIRES_IN=7d              # Remove JWT_EXPIRY=900
   JWT_REFRESH_EXPIRES_IN=30d     # Or JWT_REFRESH_EXPIRY as needed
   ```

2. Update `config/index.ts` to read the right variables OR
3. Update `.env` to use the format `config/index.ts` expects

### Phase 2: Consolidate Configs
1. Choose ONE config file (index.ts or validation.ts)
2. Update all imports to use single source
3. Remove unused config file

### Phase 3: Add Validation
```typescript
// In config initialization
if (config.jwt.secret === 'change_this_secret_key') {
  throw new Error('❌ JWT_SECRET must be set in .env for production');
}
```

### Phase 4: Test
```bash
# 1. Clear all sessions/tokens
# 2. Restart backend server
# 3. Login and immediately create instance
# 4. Verify token works for at least 5 minutes
# 5. Check logs for "Token inválido" errors
```

---

## 7. QUICK FIXES (Immediate Actions)

### Fix #1: Update .env
```diff
- JWT_EXPIRY=900
- JWT_REFRESH_EXPIRY=604800
+ JWT_EXPIRES_IN=7d
+ JWT_REFRESH_EXPIRES_IN=30d
```

### Fix #2: Update config/index.ts  
```typescript
jwt: {
  secret: process.env.JWT_SECRET || 'change_this_secret_key',
- expiresIn: process.env.JWT_EXPIRES_IN || '7d',
+ expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRY || '7d',
}
```

### Fix #3: Ensure Secret is Set
```bash
# Add to .env if not already set:
JWT_SECRET=your-32-character-secret-key-here-must-be
```

---

## 8. FILES TO MODIFY

Priority Order:
1. ✅ [backend/.env](backend/.env) - Add/fix JWT_EXPIRES_IN
2. ✅ [backend/src/config/index.ts](backend/src/config/index.ts) - Handle both variable names
3. ⚠️ [backend/src/config/validation.ts](backend/src/config/validation.ts) - Remove if unused
4. 📝 [backend/src/routes/auth.ts](backend/src/routes/auth.ts) - Verify token generation
5. 📝 [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) - Verify token validation

---

## 9. VERIFICATION CHECKLIST

- [ ] JWT_SECRET is set to a non-placeholder value in .env
- [ ] JWT_EXPIRES_IN or JWT_EXPIRY is defined in .env
- [ ] config/index.ts reads from correct environment variables
- [ ] auth.ts and middleware/auth.ts use the same config object
- [ ] jwt.ts utils use the same secret as auth routes
- [ ] Token expiry is consistent across all code paths
- [ ] Login generates token successfully
- [ ] Immediately after login, user can access protected routes
- [ ] No "Token inválido" errors in logs
- [ ] User can create instances with valid token

---

## 10. LOGGING ADDED IN auth.ts

To help debug token issues:

```typescript
// Line 25 in middleware/auth.ts
logger.info(`📝 [Auth] Token recebido, comprimento: ${token.length}`);

// Line 32 in middleware/auth.ts  
logger.info(`✅ [Auth] Token validado com sucesso, userId: ${decoded.userId}`);

// Line 34 in middleware/auth.ts
logger.error(`❌ [Auth JWT] ${jwtError.name}: ${jwtError.message}`);
```

**To see details, set LOG_LEVEL=debug in .env**

---

## Summary

| Item | Current | Problem | Fix |
|------|---------|---------|-----|
| JWT Secret | `process.env.JWT_SECRET` | Two different defaults | Use single config |
| JWT Expiry Variable | `JWT_EXPIRY=900` | auth.ts looks for `JWT_EXPIRES_IN` | Add JWT_EXPIRES_IN=7d |
| Expiry Duration | 900 seconds | Too short, creates 15-min limit | Use 7d or configurable |
| Config Usage | Two files (index.ts + validation.ts) | Inconsistent settings | Consolidate to one |
| Error Message | "Token inválido" | No details on why | Already has logging |

---

**Status**: 🔴 CRITICAL - Tokens expiring prematurely or using wrong secret
**Severity**: HIGH - Blocks all authenticated operations
**Urgency**: Fix environment variables first, then consolidate configs
