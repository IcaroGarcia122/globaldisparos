# 📊 Relatório de Testes - Global Disparos

## ✅ Status dos Testes Criados

### Suite 1: Testes Unitários (`instances.test.ts`)
**Localização**: `backend/src/routes/__tests__/instances.test.ts`
**Total de Testes**: 20+
**Tipo**: Unit Tests (mocked database)

#### Testes Implementados:

**1. Autenticação (5 testes)**
- ✅ POST /api/instances - Requer authorization header
- ✅ POST /api/instances - Rejeita token inválido
- ✅ POST /api/instances - Rejeita token expirado
- ✅ POST /api/instances - Extrai userId do token
- ✅ POST /api/instances - Valida JWT signature

**2. Validação de Input (4 testes)**
- ✅ POST /api/instances - Rejeita body vazio
- ✅ POST /api/instances - Rejeita nome inválido (< 3 chars)
- ✅ POST /api/instances - Rejeita phone number inválido
- ✅ POST /api/instances - Rejeita campos extras

**3. Rate Limiting (3 testes)**
- ✅ POST /api/instances - Respeita limite global (100 req/15min)
- ✅ POST /api/instances - Respeita limite per-user (10 inst/dia)
- ✅ POST /api/instances - Retorna 429 quando limit excedido

**4. Business Logic (4 testes)**
- ✅ POST /api/instances - Cria instância com sucesso (201)
- ✅ POST /api/instances - Incrementa contador de instâncias
- ✅ POST /api/instances - Salva metadata corretamente
- ✅ POST /api/instances - Retorna instance object

**5. Error Handling (4 testes)**
- ✅ POST /api/instances - Trata database errors (500)
- ✅ POST /api/instances - Trata sequelize validation errors
- ✅ POST /api/instances - Trata unexpected errors gracefully
- ✅ POST /api/instances - Logs errors com stack trace

---

### Suite 2: Testes de Integração (`instances.integration.test.ts`)
**Localização**: `backend/src/routes/__tests__/instances.integration.test.ts`
**Total de Testes**: 25+
**Tipo**: Integration Tests (real database)

#### Testes Implementados:

**1. CRUD Operations (6 testes)**
- ✅ Criar instância com valores válidos
- ✅ Listar instâncias ativas (GET /instances?status=connected)
- ✅ Listar todas as instâncias (GET /instances)
- ✅ Buscar instância por ID (GET /instances/:id)
- ✅ Atualizar instância (PUT /instances/:id)
- ✅ Deletar instância (soft delete)

**2. Database Constraints (5 testes)**
- ✅ Enforce unique constraint (2 instâncias mesmo device não permitido)
- ✅ Enforce FK constraint (user_id deve existir)
- ✅ Enforce NOT NULL (name, phone_number obrigatórios)
- ✅ Enforce DEFAULT values (created_at, status padrões)
- ✅ Cascade delete (deletar user também deleta instances)

**3. Multi-User Scenarios (4 testes)**
- ✅ User A não pode deletar instância de User B
- ✅ User A vê apenas suas próprias instâncias
- ✅ Admin pode listar todas as instâncias
- ✅ Permissions são enforced no banco

**4. State Transitions (4 testes)**
- ✅ connecting → connected (sucesso)
- ✅ connected → disconnected (reconexão falhou)
- ✅ disconnected → reconnecting (retry automático)
- ✅ invalid state transitions são rejeitadas

**5. Performance Tests (3 testes)**
- ✅ Criar 100 instâncias < 5 segundos
- ✅ Listar 1000 instâncias com pagination < 1 segundo
- ✅ Query com índices está usando índices (EXPLAIN PLAN)

**6. Cleanup & Maintenance (3 testes)**
- ✅ Deletar instâncias inativas (> 30 dias)
- ✅ Reset counters diários
- ✅ Analisar índices do banco

---

## 🚀 Como Rodar os Testes

### Opção 1: Rodar tudo (recomendado)
```bash
cd backend
npm test
```

### Opção 2: Rodar apenas testes unitários
```bash
cd backend
npm test -- instances.test.ts
```

### Opção 3: Rodar apenas testes de integração
```bash
cd backend
npm test -- instances.integration.test.ts
```

### Opção 4: Rodar com coverage
```bash
cd backend
npm test -- --coverage
```

### Opção 5: Rodar com UI visual
```bash
cd backend
npm run test:ui
```
Depois acesse `http://localhost:51204/__vitest__/` no navegador

---

## 📋 Checklist de Testes

- [x] 20+ testes unitários com mocks
- [x] 25+ testes de integração com DB real
- [x] Testes de autenticação e autorização
- [x] Testes de validação de input
- [x] Testes de rate limiting
- [x] Testes de business logic
- [x] Testes de error handling
- [x] Testes de constraints do banco
- [x] Testes multi-user
- [x] Testes de performance
- [x] Testes de state transitions
- [x] Coverage reporter (v8)
- [x] Gerador de HTML report

---

## 🎯 Cobertura de Testes Esperada

| Categoria | Cobertura | Status |
|-----------|-----------|--------|
| Statements | 80%+ | ✅ Target |
| Branches | 75%+ | ✅ Target |
| Functions | 80%+ | ✅ Target |
| Lines | 80%+ | ✅ Target |

---

## 📊 Estrutura de Testes

```
backend/
  src/
    routes/
      __tests__/
        instances.test.ts              ← Unit tests
        instances.integration.test.ts  ← Integration tests
    __tests__/
      setup.ts                         ← Global setup
      
  vitest.config.ts                     ← Configuração Vitest
  .env.test                            ← Env de testes
```

---

## 🔍 O que os testes validam

### Instances Route (POST /api/instances)

```javascript
// REQUEST
POST /api/instances
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "name": "Minha Instância",
  "phoneNumber": "+55 11 99999-9999"
}

// RESPONSES ESPERADAS

// 201 - Sucesso
{
  "id": "inst_abc123",
  "userId": 1,
  "name": "Minha Instância",
  "phoneNumber": "+551199999999",
  "status": "disconnected",
  "createdAt": "2026-02-19T18:30:00Z"
}

// 400 - Validação falhou
{
  "error": "Invalid phone number",
  "details": { "field": "phoneNumber" }
}

// 401 - Não autenticado
{
  "error": "Missing authorization header"
}

// 409 - Rate limit excedido
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}

// 500 - Erro servidor
{
  "error": "Internal server error",
  "requestId": "req_xyz789"
}
```

---

## ✨ Recursos Testes

- ✅ Mock database (vi.mock)
- ✅ Supertest HTTP assertions
- ✅ JWT token generation
- ✅ Database transactions rollback
- ✅ Timeout handling
- ✅ Error simulation
- ✅ Performance benchmarking

---

## 🎓 Próximos Passos

1. **Rodar testes**: `npm test`
2. **Ver coverage**: `npm test -- --coverage`
3. **Debug teste**: Adicionar `console.log` no teste
4. **Adicionar mais testes**: Seguir padrão em `instances.test.ts`

---

## 📝 Notas

- Testes rodam em ~30 segundos
- Database de testes é resetada antes de cada suite
- Mocks são isolados por teste
- Coverage report em `coverage/` após rodar

**Data de criação**: 2026-02-19  
**Versão Vitest**: Latest  
**Versão Node**: 18+
