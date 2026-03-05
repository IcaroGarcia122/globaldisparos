# ✅ Guia de Testes - Sistema Integrado

## 🧪 Testes de Funcionalidade da Integração Enterprise

> Após startup do servidor, execute estes testes para validar cada camada implementada

---

## 🔴 SETUP - Antes de Começar

### 1. Verificar Dependências
```bash
cd backend
npm install
npm run build

# Validar erros zero:
npm run build 2>&1 | grep -i error
# (deve estar vazio)
```

### 2. Configurar .env

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=globaldisparos
DB_USER=root
DB_PASSWORD=root

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=          # deixar vazio se sem senha
REDIS_DB=0

# JWT
JWT_SECRET=sua-chave-super-secreta-minimo-32-caracteres-aleatória!!
JWT_REFRESH_SECRET=outra-chave-diferente-minimo-32-caracteres!!

# Security
HELMET_ENABLED=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info

# Sentry (opcional, pode deixar vazio)
SENTRY_DSN=

# Server
PORT=3001
HOST=localhost
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Iniciar Serviços

```bash
# Terminal 1: PostgreSQL
# (verificar se está rodando)
psql -U root -d globaldisparos

# Terminal 2: Redis
redis-server

# Terminal 3: Backend
cd backend
npm run dev
# Deve exibir o banner ASCII com ✅ todos os serviços
```

---

## ✅ TESTES POR CAMADA

### 1️⃣ VALIDAÇÃO DE AMBIENTE

#### Teste 1.1: Variáveis Obrigatórias
```bash
# Remover JWT_SECRET e tentar iniciar
# Deve falhar durante validação
```

**Esperado:** 
```
🚨 ERRO: JWT_SECRET não pode estar vazio em produção
```

#### Teste 1.2: Parse de Números
```bash
# .env:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Backend valida automaticamente
# Nenhum erro, strings são parseadas como numbers
```

---

### 2️⃣ RATE LIMITING

#### Teste 2.1: Global Rate Limit (100/15min)
```bash
# Script para gerar 150 requisições rápido:
for i in {1..150}; do 
  curl -s http://localhost:3001/health -o /dev/null &
done
wait

# Esperado: Primeiras 100 com 200, depois 429
```

**Resposta 200:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 5.123,
  "environment": "development",
  "redis": "✅ connected"
}
```

**Resposta 429:**
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 1705318200
}
```

#### Teste 2.2: Auth Rate Limit (5/15min)
```bash
# 6 tentativas de login rápidas:
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -s | jq . &
done
wait
```

**Esperado:**
- Primeiras 5: Status variado (401, 400, etc) 
- 6ª: `429 Too Many Requests`

#### Teste 2.3: Bypass para Health Check
```bash
# Health check NÃO respeita rate limit
for i in {1..200}; do 
  curl -s http://localhost:3001/health &
done
wait

# Esperado: Todas 200 com status 200 (sem 429)
```

---

### 3️⃣ SECURITY HEADERS

#### Teste 3.1: Helmet Headers
```bash
curl -i http://localhost:3001/health

# Esperado (cabeçalhos presentes):
HTTP/1.1 200 OK
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'

# NÃO deve ter:
X-Powered-By: (removido)
Server: (removido ou genérico)
```

#### Teste 3.2: CORS Dinâmico
```bash
# De um origin NÃO configurado:
curl -i \
  -H "Origin: https://attacker.com" \
  http://localhost:3001/api/auth/login

# Esperado: CORS error (no header Access-Control-Allow-Origin)
```

```bash
# De um origin configurado:
curl -i \
  -H "Origin: http://localhost:3000" \
  http://localhost:3001/api/auth/login

# Esperado: Header Access-Control-Allow-Origin: http://localhost:3000
```

---

### 4️⃣ INPUT VALIDATION (Zod)

#### Teste 4.1: Email Inválido
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nao-é-email",
    "password": "password123"
  }' | jq .
```

**Esperado:**
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

#### Teste 4.2: Senha Muito Curta
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "123"
  }' | jq .
```

**Esperado:** 
```json
{
  "error": "Validation error",
  "statusCode": 400,
  "errors": [
    {
      "field": "password",
      "message": "Minimum 8 characters"
    }
  ]
}
```

#### Teste 4.3: Tipo de Dados Errado
```bash
curl -X POST http://localhost:3001/api/instances \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Instance 1",
    "userData": "should-be-object"
  }' | jq .
```

**Esperado:** Erro 400 especificando tipo esperado

---

### 5️⃣ REDIS CACHING

#### Teste 5.1: Cache SET/GET
```bash
# Redis CLI (em outro terminal):
redis-cli

# Monitore o Redis:
> MONITOR

# Volte ao terminal anterior e faça um request:
curl http://localhost:3001/api/auth/login -X POST ...

# No Redis MONITOR deve mostrar:
"SET" "user:123:session" "{...json...}" "EX" 3600
"GET" "user:123:session"
```

#### Teste 5.2: TTL Automático
```bash
redis-cli

# Ver TTL de uma chave:
> TTL "user:123:session"
(integer) 3599  # segundos até expirar

# Esperar alguns segundos:
> TTL "user:123:session"
(integer) 3595
```

#### Teste 5.3: Pattern Deletion
```bash
# Verificar padrão de keys:
> KEYS "user:*"
# Deve listar user:1, user:2, etc

# No código (se implementado):
# await redisService.deletePattern('user:*')

# Após:
> KEYS "user:*"
# (empty)
```

---

### 6️⃣ JOB QUEUE (Bull)

#### Teste 6.1: Adicionar Job à Fila
```bash
# Simular envio de mensagem (em uma rota):
curl -X POST http://localhost:3001/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": 1,
    "phoneNumber": "5519999999999",
    "message": "Teste de fila"
  }'

# Response deve ser rápido (não bloqueante):
{
  "status": "queued",
  "jobId": "abc123",
  "message": "Message queued for processing"
}
```

#### Teste 6.2: Monitorar Fila
```bash
# Instalar Bull Board (opcional):
npm install @bull-board/express @bull-board/ui

# Acessar dashboard:
http://localhost:3001/admin/queues

# Deve mostrar:
- send-message queue (pending, completed, failed)
- dispatch-campaign queue
- reconnect-instance queue
- group-sync queue
- cleanup queue
```

#### Teste 6.3: Retry com Exponential Backoff
```bash
# Simular erro no processamento
# Job tenta:
Tentativa 1: imediata
Tentativa 2: +5segundos (backoff)
Tentativa 3: +25 segundos (exponencial)
> Falha final

# Logs devem mostrar:
❌ Job 123 failed, retry 1/3
❌ Job 123 failed, retry 2/3
❌ Job 123 moved to dead letter queue
```

---

### 7️⃣ AUDIT LOGGING

#### Teste 7.1: Log de Ação
```bash
# Dado login bem-sucedido:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }'

# No database, `activity_logs` deve ter novo registro:
```

```sql
SELECT * FROM activity_logs 
WHERE user_id = 1 
ORDER BY created_at DESC 
LIMIT 1;

-- Esperado:
-- id: 1001
-- user_id: 1
-- action: 'USER_LOGIN'
-- ip_address: '127.0.0.1'
-- user_agent: 'curl/7.x'
-- created_at: CURRENT_TIMESTAMP
```

#### Teste 7.2: Query de Auditoria
```bash
# Dentro de uma rota com acesso ao auditService:

// Por usuário (últimas 10 ações):
const logs = await auditService.getUserLogs(1, 10);
console.log(logs);
// [{action: 'LOGIN', timestamp: ...}, ...]

// Por recurso:
const campaignLogs = await auditService.getResourceLogs('campaign', 5);

// Por ação:
const loginAttempts = await auditService.getLogsByAction('FAILED_LOGIN_ATTEMPT');

// Últimos erros (últimas 24h):
const errors = await auditService.getRecentErrors(24);

// Logs de segurança:
const security = await auditService.getSecurityLogs();

// Estatísticas:
const stats = await auditService.getStats(24);
// {totalLogins: 45, totalErrors: 2, topActions: [...]}
```

#### Teste 7.3: GDPR Cleanup
```bash
// Manualmente (ou cron automático 3 AM UTC):
await auditService.deleteOldLogs(90);  // Deletar > 90 dias

// Verificar:
SELECT COUNT(*) FROM activity_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
// Deve estar vazio
```

---

### 8️⃣ ERROR HANDLING & SENTRY

#### Teste 8.1: Erro Operacional
```bash
# 404 Not Found:
curl http://localhost:3001/api/rota-inexistente

# Esperado:
{
  "error": "Not Found",
  "path": "/api/rota-inexistente",
  "method": "GET",
  "statusCode": 404
}

# Logs: error.log contém ERROR [OperationalError]
```

#### Teste 8.2: Erro 500 (Não Esperado)
```bash
# Forçar erro (temporariamente comentar validação):
// Em uma rota, forçar: throw new Error('Força');

// Esperado:
1. Response 500 (genérico em prod):
   {
     "error": "Internal Server Error",
     "message": "An unexpected error occurred"
   }

2. Logs: error.log com stack trace (dev)

3. Sentry: Novo evento enviado (se DSN configurado)

4. Sem exposição de detalhes (segurança)
```

#### Teste 8.3: Validation Error Handler
```bash
# Erro durante validação (já testado acima)
# Esperado: 400 com errors array detalhado
```

---

### 9️⃣ JWT TOKEN MANAGEMENT

#### Teste 9.1: Generate Token Pair
```bash
// Simulado no login:
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }'

// Esperado:
{
  "accessToken": "eyJhbGc...",      // JWT com exp: 15min
  "refreshToken": "eyJhbGc...",     // JWT com exp: 7 dias
  "user": {...},
  "expiresIn": 900                  // segundos
}
```

#### Teste 9.2: Refresh Token Rotation
```bash
// Quando accessToken expirar:
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."    // token anterior
  }'

// Esperado:
{
  "accessToken": "eyJhbGc...",      // Token NOVO
  "refreshToken": "eyJhbGc...",     // RefreshToken NOVO (rotacionado)
  "expiresIn": 900
}

// Verificar:
// - Novo accessToken válido por 15min
// - Novo refreshToken válido por 7 dias
// - Token antigo adicionado à blacklist Redis
```

#### Teste 9.3: Revoke Refresh Token
```bash
// Logout user:
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer {refreshToken}"

// Esperado:
{
  "message": "Logged out successfully"
}

// Tentar usar token antigo deve falhar:
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "eyJhbGc..."}'

// Resposta:
{
  "error": "Invalid or expired refresh token",
  "statusCode": 401
}
```

#### Teste 9.4: Logout All Devices
```bash
// User com refresh tokens em 3 dispositivos:
// Device 1: token_a
// Device 2: token_b  
// Device 3: token_c

// Calling logout-all em Device 1:
curl -X POST http://localhost:3001/api/auth/logout-all \
  -H "Authorization: Bearer {accessToken}"

// Esperado:
// - Todos 3 refresh tokens adicionados à blacklist
// - Devices 2 e 3 recebem erro ao tentar usar tokens antigos
```

---

### 🔟 WINSTON LOGGER

#### Teste 10.1: Arquivos de Log
```bash
# Verificar estrutura:
ls -la backend/logs/

# Esperado:
error.log       (apenas erros)
warn.log        (apenas warnings)
combined.log    (tudo)
exceptions.log  (uncaught exceptions)
rejections.log  (unhandled rejections)
```

#### Teste 10.2: Rotação de Arquivos
```bash
# Sistema rotaciona quando atinge 10MB
# Máximo 10 files = 100MB por tipo

# Teste:
# 1. Gerar muitos logs (forçar erro repetidas vezes)
# 2. Verificar: ls logs/
# 3. Deve haver: error.log, error.log.1, error.log.2, etc
```

#### Teste 10.3: Log Levels
```bash
# .env LOG_LEVEL=debug (desenvolvimento)
# Esperado: Todos os níveis aparecem

# .env LOG_LEVEL=info (produção)
# Esperado: Info, warn, error (debug ignorado)

# .env LOG_LEVEL=error (emergência)
# Esperado: Apenas errors
```

---

## 🎯 TESTE INTEGRADO (End-to-End)

### Cenário: Criar Campanha e Enviar Mensagens

#### Setup:

```bash
# 1. Ter user logado:
export TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# 2. Ter instância WhatsApp conectada:
# GET /api/instances deve ter status: "connected"
```

#### Teste:

```bash
# 1. Criar campanha:
CAMPAIGN_ID=$(curl -s -X POST http://localhost:3001/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste E2E",
    "message": "Olá {{name}}",
    "instanceId": 1,
    "contacts": ["5519999999999", "5519999999998"]
  }' | jq -r '.id')

echo "Campaign created: $CAMPAIGN_ID"

# 2. Disparar campanha:
curl -s -X POST http://localhost:3001/api/campaigns/$CAMPAIGN_ID/dispatch \
  -H "Authorization: Bearer $TOKEN" | jq .

# 3. Verificar audit log:
curl -s http://localhost:3001/api/audits/campaigns/$CAMPAIGN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .

# Esperado:
# [
#   {action: 'CAMPAIGN_CREATED', timestamp: ...},
#   {action: 'CAMPAIGN_STARTED', timestamp: ...},
#   {action: 'MESSAGE_SENT', timestamp: ...},
#   {action: 'MESSAGE_SENT', timestamp: ...}
# ]

# 4. Verificar job queue:
# Bull Board: http://localhost:3001/admin/queues
# Deve mostrar: send-message (2 completed)
# E: dispatch-campaign (1 completed)

# 5. Verificar Redis cache:
redis-cli
> KEYS "campaign:$CAMPAIGN_ID"
> GET "campaign:$CAMPAIGN_ID"
# Deve conter: {id, name, status: 'completed', ...}

# 6. Verificar logs:
tail -f logs/combined.log | grep -i campaign
# Esperado:
# ✅ Campaign created
# ✅ Campaign dispatched
# ✅ Message sent
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

```
✅ Ambiente
  [ ] Todas variáveis .env validadas no startup
  [ ] JWT_SECRET diferente em produção
  [ ] Logs criados em logs/ directory

✅ Rate Limiting
  [ ] Global limita 100/15min
  [ ] Auth limita 5/15min
  [ ] Health check bypassa rate limit
  [ ] Response 429 com Retry-After header

✅ Security
  [ ] Headers Helmet presentes
  [ ] CORS dinâmico funciona
  [ ] Validação Zod em todos endpoints
  [ ] Senha não exposita em logs

✅ Caching
  [ ] Redis conecta ao startup
  [ ] SET/GET funciona
  [ ] TTL respeitado
  [ ] Pattern deletion funciona

✅ Job Queue
  [ ] Bull Queues inicializam
  [ ] Jobs são processados
  [ ] Retry com exponential backoff
  [ ] Completed jobs removem-se de memory

✅ Audit
  [ ] ActivityLog criado para cada ação
  [ ] Query getUserLogs funciona
  [ ] Cleanup automático funciona
  [ ] Compliance GDPR OK

✅ Error Handling
  [ ] 404 retorna json estruturado
  [ ] 500 não expõe stack em prod
  [ ] Sentry recebe eventos (se configurado)
  [ ] Validation errors são detalhados

✅ JWT
  [ ] generateTokenPair retorna 2 tokens
  [ ] accessToken expira em 15min
  [ ] refreshToken expira em 7 dias
  [ ] Token rotation funciona
  [ ] Logout revoga token

✅ Logging
  [ ] Error.log contém erros
  [ ] Combined.log contém tudo
  [ ] Rotação automática 10MB
  [ ] Exceptions.log captura uncaught
```

---

## 🚀 Finalização

Após passar todos os testes:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "🚀 Enterprise-grade backend integration complete"
   git push
   ```

2. **Deployar para staging:**
   ```bash
   npm run build
   docker build -t whatsapp-saas:v1.0.0 .
   docker push your-registry/whatsapp-saas:v1.0.0
   ```

3. **Monitorar em produção:**
   - Sentry dashboard
   - Logs centralizados
   - Health check endlessly
   - Rate limit metrics

**Status: ✅ Sistema Enterprise Pronto para Produção**

