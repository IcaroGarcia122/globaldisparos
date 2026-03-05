# 📡 API Reference - Enterprise Backend

Documentação de todos endpoints disponíveis com validação, rate limiting e auditoria automática.

---

## 🔑 Autenticação

### POST /api/auth/login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }'
```

**Rate Limit:** 5 attempts / 15 min  
**Validation:** Email + Password (min 8 chars)  
**Audit Log:** USER_LOGIN

**Response 200:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@test.com",
    "name": "User Name"
  },
  "expiresIn": 900
}
```

**Response 400 (Validation Error):**
```json
{
  "error": "Validation error",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

**Response 401 (Wrong Credentials):**
```json
{
  "error": "Invalid email or password",
  "statusCode": 401
}
```

---

### POST /api/auth/register
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "password123",
    "name": "New User"
  }'
```

**Rate Limit:** Global (100/15 min)  
**Validation:** Email, Password (min 8), Name  
**Audit Log:** USER_CREATED + AUTO_LOGIN

**Response 201:**
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": 2,
    "email": "newuser@test.com",
    "name": "New User"
  },
  "expiresIn": 900
}
```

---

### POST /api/auth/refresh
```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Rate Limit:** Global (100/15 min)  
**Validation:** Valid refresh token  
**Audit Log:** TOKEN_REFRESHED

**Response 200:** (Novo token pair)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NEW)",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (ROTATED)",
  "expiresIn": 900
}
```

**Response 401 (Invalid/Expired):**
```json
{
  "error": "Invalid or expired refresh token",
  "statusCode": 401
}
```

---

### POST /api/auth/logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Rate Limit:** Global  
**Auth Required:** Yes (Access Token)  
**Audit Log:** USER_LOGOUT

**Response 200:**
```json
{
  "message": "Logged out successfully"
}
```

---

### POST /api/auth/logout-all
```bash
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Rate Limit:** Global  
**Auth Required:** Yes (Access Token)  
**Audit Log:** USER_LOGOUT_ALL_DEVICES

**Response 200:**
```json
{
  "message": "Logged out from all devices"
}
```

---

## 🔗 Instâncias WhatsApp

### GET /api/instances
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/instances
```

**Rate Limit:** API (30/1 min)  
**Auth Required:** Yes  
**Audit Log:** INSTANCES_LISTED

**Response 200:**
```json
{
  "instances": [
    {
      "id": 1,
      "userId": 1,
      "name": "Instance 1",
      "phoneNumber": "5519999999999",
      "status": "connected",
      "connectedAt": "2024-01-15T10:00:00Z",
      "isActive": true,
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

---

### POST /api/instances
```bash
curl -X POST http://localhost:3001/api/instances \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Instance",
    "isActive": true
  }'
```

**Rate Limit:** API  
**Auth Required:** Yes  
**Validation:** Name (1-100 chars)  
**Audit Log:** INSTANCE_CREATED

**Response 201:**
```json
{
  "id": 2,
  "userId": 1,
  "name": "New Instance",
  "status": "disconnected",
  "qrCode": "data:image/png;base64,...",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### GET /api/instances/:id
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/instances/1
```

**Response 200:**
```json
{
  "id": 1,
  "userId": 1,
  "name": "Instance 1",
  "phoneNumber": "5519999999999",
  "status": "connected",
  "connectedAt": "2024-01-15T10:00:00Z",
  "messagesSent": 150,
  "messagesReceived": 25,
  "dailyLimit": 1000,
  "dailySent": 150,
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00Z"
}
```

---

### DELETE /api/instances/:id
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/instances/1
```

**Audit Log:** INSTANCE_DELETED

**Response 200:**
```json
{
  "message": "Instance deleted successfully"
}
```

---

## 📨 Campanhas

### GET /api/campaigns
```bash
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3001/api/campaigns?page=1&limit=10&status=active'
```

**Query Params:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `status` (enum: 'pending', 'running', 'completed', 'failed')
- `instanceId` (filter by instance)

**Rate Limit:** API  
**Auth Required:** Yes  
**Audit Log:** CAMPAIGNS_LISTED

**Response 200:**
```json
{
  "campaigns": [
    {
      "id": 1,
      "userId": 1,
      "instanceId": 1,
      "name": "Campaign 1",
      "message": "Hello {{name}}",
      "status": "completed",
      "totalContacts": 100,
      "sentMessages": 95,
      "failedMessages": 5,
      "createdAt": "2024-01-15T09:00:00Z",
      "completedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

---

### POST /api/campaigns
```bash
curl -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Campaign 1",
    "message": "Hello {{name}}, this is a test",
    "instanceId": 1,
    "contacts": ["5519999999999", "5519999999998"],
    "scheduling": {
      "startTime": "2024-01-16T09:00:00Z",
      "interval": 5,
      "intervalUnit": "seconds"
    }
  }'
```

**Rate Limit:** Campaign (10/10 min)  
**Auth Required:** Yes  
**Validation:** All fields required, phone regex  
**Audit Log:** CAMPAIGN_CREATED

**Response 201:**
```json
{
  "id": 5,
  "userId": 1,
  "instanceId": 1,
  "name": "Campaign 1",
  "message": "Hello {{name}}, this is a test",
  "status": "pending",
  "totalContacts": 2,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### POST /api/campaigns/:id/start
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/campaigns/5/start
```

**Audit Log:** CAMPAIGN_STARTED  
**Action:** Enfileira mensagens no Bull queue

**Response 200:**
```json
{
  "id": 5,
  "status": "running",
  "jobId": "job_123abc",
  "message": "Campaign started, messages queued for processing"
}
```

---

### POST /api/campaigns/:id/pause
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/campaigns/5/pause
```

**Audit Log:** CAMPAIGN_PAUSED

**Response 200:**
```json
{
  "id": 5,
  "status": "paused",
  "sentSoFar": 45
}
```

---

### DELETE /api/campaigns/:id
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/campaigns/5
```

**Audit Log:** CAMPAIGN_DELETED

**Response 200:**
```json
{
  "message": "Campaign deleted"
}
```

---

## 👥 Contatos

### GET /api/contacts
```bash
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3001/api/contacts?page=1&limit=50'
```

**Rate Limit:** API  
**Auth Required:** Yes

**Response 200:**
```json
{
  "contacts": [
    {
      "id": 1,
      "userId": 1,
      "phoneNumber": "5519999999999",
      "name": "Contato 1",
      "email": "contact@test.com",
      "tags": ["vip", "enterprise"],
      "lastMessageAt": "2024-01-15T10:00:00Z",
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 50
}
```

---

### POST /api/contacts/bulk-import
```bash
curl -X POST http://localhost:3001/api/contacts/bulk-import \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "phoneNumber": "5519999999999",
        "name": "Contato 1",
        "email": "contact1@test.com",
        "tags": ["tag1", "tag2"]
      }
    ]
  }'
```

**Rate Limit:** API  
**Auth Required:** Yes  
**Validation:** Array de contatos, phone regex  
**Audit Log:** CONTACTS_IMPORTED

**Response 200:**
```json
{
  "imported": 1,
  "failed": 0,
  "errors": []
}
```

---

### DELETE /api/contacts/:id
```bash
curl -X DELETE \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/contacts/1
```

**Audit Log:** CONTACT_DELETED

**Response 200:**
```json
{
  "message": "Contact deleted"
}
```

---

## 👫 Grupos

### GET /api/groups/:instanceId
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/groups/1
```

**Rate Limit:** API  
**Auth Required:** Yes  
**Audit Log:** GROUPS_LISTED

**Response 200:**
```json
{
  "groups": [
    {
      "id": "120XXXXXXXXXXX-XXXXXXXXXXXXX",
      "name": "Group Name",
      "description": "Group description",
      "members": 50,
      "owner": "5519999999999",
      "createdAt": "2023-01-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### POST /api/groups/:instanceId/sync
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/groups/1/sync
```

**Action:** Enfileira sync no queue  
**Audit Log:** GROUPS_SYNC_QUEUED

**Response 200:**
```json
{
  "jobId": "job_456def",
  "message": "Group sync queued"
}
```

---

## 📊 Estatísticas

### GET /api/stats/dashboard
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/stats/dashboard
```

**Response 200:**
```json
{
  "totalInstances": 5,
  "activeInstances": 4,
  "totalContacts": 500,
  "totalCampaigns": 10,
  "completedCampaigns": 8,
  "totalMessages": 1500,
  "successRate": "96.5%",
  "30dayRevenue": 1500.00
}
```

---

## 🔒 Autenticação

### Header Obrigatório
```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Sem Authorization:
```json
{
  "error": "Unauthorized",
  "statusCode": 401,
  "message": "Missing or invalid authentication token"
}
```

---

## ❌ Erros Comuns

### 400 - Validation Error
```json
{
  "error": "Validation error",
  "statusCode": 400,
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Invalid phone number format (expected 10-15 digits)"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "error": "Unauthorized",
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

### 403 - Forbidden
```json
{
  "error": "Forbidden",
  "statusCode": 403,
  "message": "You don't have permission to access this resource"
}
```

### 404 - Not Found
```json
{
  "error": "Not Found",
  "statusCode": 404,
  "path": "/api/campaigns/999"
}
```

### 429 - Too Many Requests
```json
{
  "error": "Too many requests, please try again later.",
  "statusCode": 429,
  "retryAfter": 1705318200
}
```

---

## 📈 Rate Limiting Padrão

| Endpoint | Limite | Janela |
|----------|--------|--------|
| /api/auth/login | 5 | 15 min |
| /api/auth/register | 10 (global) | 15 min |
| /api/auth/refresh | 10 (global) | 15 min |
| /api/instances/* | 30 | 1 min |
| /api/campaigns | 10 | 10 min |
| /api/contacts/* | 30 | 1 min |
| /api/groups/* | 30 | 1 min |
| /api/stats/* | 30 | 1 min |
| /health | Unlimited | N/A |

---

## 🔍 Auditoria Automática

Cada request é auditado:
```
✅ Ação executada
✅ User ID
✅ IP Address
✅ User Agent
✅ Timestamp
✅ Resource (ID)
✅ Detalhes da ação
```

Query via:
```typescript
// Em código:
const logs = await auditService.getUserLogs(userId, limit);
const logs = await auditService.getResourceLogs('campaign', campaignId);
const logs = await auditService.getLogsByAction('CAMPAIGN_STARTED');
```

---

## 🚀 Exemplo Completo

### Fluxo: Login → Criar Instância → Listar Instâncias

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# 2. Criar instância
INSTANCE_ID=$(curl -s -X POST http://localhost:3001/api/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Instance"
  }' | jq -r '.id')

# 3. Listar instâncias
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/instances | jq .

# 4. Usar token novo (refresh)
NEW_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" \
  | jq -r '.accessToken')
```

---

**Última Atualização:** 15 de Janeiro, 2024  
**Versão API:** v1.0 (Enterprise)  
**Status:** Production Ready ✅

