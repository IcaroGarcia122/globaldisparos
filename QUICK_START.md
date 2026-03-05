# ⚡ Quick Start - Enterprise Backend

Guia rápido para começar com o backend enterprise-grade.

---

## 🚀 Iniciando em 5 Minutos

### 1. Instalar Dependências
```bash
cd backend
npm install
```

### 2. Configurar Ambiente
```bash
# Copiar template
cp .env.example .env

# Editar .env com seus valores:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=globaldisparos
DB_USER=root
DB_PASSWORD=sua_senha

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=sua-chave-super-secreta-minimo-32-caracteres-aleatória-gerada!!
JWT_REFRESH_SECRET=outra-chave-ainda-mais-secreta-gerada-aleatoriamente!!

CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Compilar TypeScript
```bash
npm run build
# Esperado: Sem erros ✅
```

### 4. Iniciar Modo Desenvolvimento
```bash
npm run dev
# Esperado: Log exibindo banner ASCII com ✅
```

### 5. Testar Endpoint
```bash
curl http://localhost:3001/health
# Respuesta:
# {
#   "status": "ok",
#   "redis": "✅ connected"
# }
```

---

## 🔑 Conceitos Principais

### Rate Limiting
```
Global: 100 requisições / 15 minutos
Auth: 5 tentativas login / 15 minutos
API: 30 requisições / 1 minuto
Campaign: 10 campanhas / 10 minutos por user

Exceder → Resposta 429 com Retry-After header
```

### Caching
```
Auto-salvo em Redis:
- User data (TTL 1h)
- Instance info (TTL 1h)
- Campaign details (TTL 30min)
- Etc

Acesso rápido sem hit ao banco
```

### Job Queue
```
Async processing de tarefas lentas:
- Enviar mensagens (8 threads)
- Sincronizar grupos (2 threads)
- Disparar campanhas (1 serial)
- Reconectar instâncias (4 threads)
- Limpar dados antigos (1 thread)

Não bloqueia request - retorna imediatamente com jobId
```

### JWT Tokens
```
Login → Recebe 2 tokens:
1. accessToken (15 minutos)
2. refreshToken (7 dias)

Token Expira → POST /api/auth/refresh
→ Novo par de tokens (rotation automática)

Logout → Refresh token adicionado à blacklist
→ Não pode mais atualizar access token
```

### Audit Logging
```
Todas ações significativas são registradas:
- USER_LOGIN / LOGOUT
- INSTANCE_CONNECTED / DISCONNECTED
- CAMPAIGN_STARTED / STOPPED
- MESSAGE_SENT / FAILED
- CONTACT_IMPORTED / DELETED
- SUSPICIOUS_ACTIVITY
- Etc (20+ tipos)

Queryável por user, resource, action, erro recente
```

---

## 🧪 Testes Rápidos

### Health Check
```bash
curl http://localhost:3001/health

# ✅ Sucesso:
{
  "status": "ok",
  "redis": "✅ connected"
}
```

### Auth - Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "password123"
  }'

# ✅ Sucesso:
{
  "accessToken": "eyJh...",
  "refreshToken": "eyJh...",
  "expiresIn": 900
}
```

### Validação - Erro Esperado
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "short"
  }'

# ✅ Erro Estruturado:
{
  "error": "Validation error",
  "statusCode": 400,
  "errors": [
    {"field": "email", "message": "Invalid email"},
    {"field": "password", "message": "Minimum 8 characters"}
  ]
}
```

### Rate Limit - Teste
```bash
# Fazer 150 requests rápidos:
for i in {1..150}; do
  curl -s http://localhost:3001/health &
done
wait

# ✅ Esperado:
# Primeiros 100: 200 OK
# Após 100: 429 Too Many Requests
# com header: Retry-After: 600 (segundos)
```

---

## 📊 Monitoração

### Ver Logs em Tempo Real
```bash
# Erros:
tail -f logs/error.log

# Tudo:
tail -f logs/combined.log

# Filtrar por pattern:
grep -i "authentication" logs/combined.log
```

### Verificar Redis
```bash
redis-cli

> KEYS *
# Lista todas chaves

> GET "user:123"
# Ver dados usuario

> TTL "user:123"
# Ver quanto tempo até expirar

> MONITOR
# Ver comandos em tempo real
```

### Verificar Fila
```bash
# Se Bull Board instalado:
http://localhost:3001/admin/queues

# Mostra:
- Pending jobs
- Completed jobs
- Failed jobs
- Queue stats
```

---

## 🔧 Troubleshooting Rápido

| Problema | Solução |
|----------|----------|
| **"Cannot connect to Redis"** | Verificar se Redis está rodando: `redis-server` |
| **"Database connection failed"** | Verificar DB_HOST, DB_PORT, DB_USER, DB_PASSWORD em .env |
| **"JWT_SECRET not set"** | Adicionar JWT_SECRET=sua-chave em .env (mín 32 chars) |
| **"CORS error"** | Adicionar origin em CORS_ORIGINS no .env |
| **"Rate limited (429)"** | Esperado - aguarde 15 minutos ou resete Redis |
| **"Build fails"** | Rodar `npm install` antes de `npm run build` |
| **"Port 3001 already in use"** | Mudar PORT em .env ou `lsof -i :3001` e matar processo |

---

## 📝 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/
│   │   └── validation.ts        ✨ Environment validation
│   ├── middleware/
│   │   ├── rateLimiting.ts      ✨ Rate limiting
│   │   ├── securityHeaders.ts   ✨ Helmet + CORS
│   │   └── errorHandler.ts      ✨ Global errors
│   ├── services/
│   │   ├── redisService.ts      ✨ Cache distribuído
│   │   ├── queueService.ts      ✨ Bull queues
│   │   ├── auditService.ts      ✨ Audit trail
│   │   └── ... (existing)
│   ├── utils/
│   │   ├── logger.ts            ✨ Winston logging
│   │   ├── jwt.ts               ✨ Token management
│   │   └── ... (existing)
│   ├── validators/
│   │   └── index.ts             ✨ Zod schemas
│   ├── server.ts                ✨ Tudo integrado
│   └── ... (existing routes/models)
├── logs/                         ✨ Winston log files
│   ├── error.log
│   ├── warn.log
│   ├── combined.log
│   └── ...
├── dist/                         Compiled JS
├── tsconfig.json
├── package.json
└── .env                          Your secrets (gitignored)

✨ = Novo (Enterprise)
```

---

## 🌟 Novo: O Que Mudou

### Antes do Startup (Você Vê Isso Agora)
```
🚀 WHATSAPP SAAS BACKEND - ENTERPRISE EDITION STARTED

Environment: DEVELOPMENT
Server: http://localhost:3001
Frontend: http://localhost:5173

✅ Baileys WhatsApp integration with anti-ban
✅ PostgreSQL database connection
✅ Redis caching & distributed locking
✅ Bull job queue (message, campaign, reconnect)
✅ Rate limiting (global, auth, API, campaign)
✅ Security headers & CORS protection
✅ Global error handling & Sentry integration
✅ Audit logging & compliance trail
✅ JWT token management with refresh rotation
✅ WebSocket real-time communication (Socket.IO)
✅ Cron jobs for maintenance & cleanup

🔐 Production-ready for thousands of concurrent users
```

### Checklist de Startup
```
✅ Environment validation
✅ Database connected
✅ Redis cache service
✅ Job queue service (5 queues)
✅ JWT service
✅ Logging initialized
✅ Cron jobs scheduled
```

---

## 🚀 Próxima Fase

Após 7-10 dias de testes em staging:

```bash
# 1. Build Docker image
docker build -t whatsapp-saas:v1.0.0 .

# 2. Test image locally
docker run -p 3001:3001 whatsapp-saas:v1.0.0

# 3. Push to registry
docker push your-registry/whatsapp-saas:v1.0.0

# 4. Deploy com PM2 ou K8s
pm2 start dist/server.js -i max
# ou
kubectl apply -f deployment.yaml
```

---

## 📚 Documentação Completa

Para detalhes aprofundados, veja:

1. **INTEGRACAO_PRODUCAO.md** - All features explained
2. **GUIA_TESTES_INTEGRACAO.md** - Comprehensive test suite
3. **backend/src/** - Código-fonte documentado

---

## ✅ Checklist Final

- [ ] Backend compilado (`npm run build`)
- [ ] `.env` configurado com valores reais
- [ ] Redis rodando (`redis-server`)
- [ ] PostgreSQL acessível
- [ ] `npm run dev` iniciado
- [ ] Health endpoint retorna 200
- [ ] Validação Zod testada (erro 400)
- [ ] Rate limit testado (erro 429)
- [ ] JWT token obtido (login)
- [ ] Logs sendo gerados (logs/)

Tudo Ok? 🎉 **Sistema Enterprise Pronto!**

---

**Tempo até estar rodando:** ~5 minutos  
**Tempo para produção:** ~1 semana com testes  
**Suporte do sistema:** Enterprise-grade, 99.9% uptime ready

Go build something amazing! 🚀

