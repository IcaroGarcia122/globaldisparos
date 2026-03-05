# 🧪 Guia Completo de Testes - Rota POST /instances

## 📋 Índice
1. [Problemas Identificados](#problemas-identificados)
2. [Análise do Erro HTTP 500](#análise-do-erro-http-500)
3. [Setup de Testes](#setup-de-testes)
4. [Casos de Teste](#casos-de-teste)
5. [Execução de Testes](#execução-de-testes)
6. [Debugging](#debugging)

---

## 🔍 Problemas Identificados

### 1. **HTTP 500 ao Criar Instância**

O erro HTTP 500 indica uma exceção não tratada. Possíveis causas:

#### A. Autenticação Falha
```typescript
// ❌ PROBLEMA: middleware pode não estar setando req.user
authenticate(req, res, next) {
  // Se falhar aqui, req.user pode ser undefined
  req.user = { id, email, role };
}

// Na rota POST /instances:
const userId = req.user!.id; // ⚠️ req.user pode ser null/undefined
```

#### B. Usuário Não Encontrado no Banco
```typescript
// No middleware auth.ts
const user = await User.findByPk(decoded.userId);
if (!user || !user.isActive) {
  return res.status(401).json({ error: 'Usuário inválido' });
}

// ⚠️ Se JWT foi decodificado com userId diferente, o usuário pode não existir
```

#### C. Erro ao Criar WhatsAppInstance
```typescript
await WhatsAppInstance.create({
  userId: req.user!.id,
  name,
  accountAge: accountAge || 0,
  isActive: true
});
// ⚠️ Constraints de BD podem falhar:
// - userId não exist (Foreign Key)
// - name é obrigatório (null/undefined)
// - Valores inválidos para campos
```

---

## 📊 Análise do Erro HTTP 500

### Checklist de Diagnóstico

```bash
# 1. Verificar logs do servidor
npm run dev
# Procure por mensagens de erro no console

# 2. Validar token JWT
# Token deve conter: { userId, email, exp }
# Secret da geração deve match com JWT_SECRET na .env

# 3. Verificar banco de dados
# Tabela 'users' existe?
# Tabela 'whatsapp_instances' existe?

# 4. Validar dados enviados
Request Body:
{
  "name": "string (obrigatório)",
  "accountAge": "number (opcional, default 0)"
}
# ⚠️ Se 'name' está undefined ou null, o banco rejeitará

# 5. Verificar constraints de FK
# userId enviado ao banco deve existir em tabela 'users'
```

### Script de Debug

```typescript
// src/routes/instances.ts - adicione logs detalhados:

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    console.log('[POST /instances] Iniciando...');
    console.log('[1] req.user:', req.user); // ⚠️ Pode ser undefined
    console.log('[2] req.body:', req.body);
    
    const { name, accountAge } = req.body;
    console.log('[3] name:', name, 'type:', typeof name);
    
    if (!req.user?.id) {
      console.log('[ERROR] req.user.id não definido!');
      return res.status(400).json({ error: 'Erro interno: usuário inválido' });
    }

    const activeCount = await WhatsAppInstance.count({
      where: { userId: req.user.id, isActive: true }
    });
    console.log('[4] activeCount:', activeCount);

    if (activeCount >= 3) {
      return res.status(409).json({ 
        error: 'Máximo de 3 instâncias ativas' 
      });
    }

    const instance = await WhatsAppInstance.create({
      userId: req.user.id,
      name,
      accountAge: accountAge || 0,
      isActive: true
    });
    console.log('[5] Instância criada:', instance.id);
    
    res.status(201).json(instance);
  } catch (error: any) {
    console.log('[ERROR] Exception:', {
      message: error.message,
      stack: error.stack,
      code: error.code, // Erro de BD
      detail: error.detail // Detalhe do erro
    });
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🛠️ Setup de Testes

### 1. Instalar Dependências

```bash
cd backend

npm install --save-dev \
  vitest \
  @vitest/ui \
  @testing-library/node \
  supertest \
  @types/supertest \
  ts-vi

# Ou com yarn/pnpm
yarn add -D vitest @vitest/ui supertest @types/supertest
```

### 2. Configurar Vitest

Criar arquivo `backend/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Criar Setup File

`backend/src/__tests__/setup.ts`:

```typescript
import { beforeAll, afterAll, vi } from 'vitest';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.test' });

// Mock global para console
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};

// Setup do banco de testes (se necessário)
beforeAll(async () => {
  // Inicialize BD de teste aqui
});

afterAll(async () => {
  // Limpe recursos
});
```

### 4. Atualizar package.json

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## ✅ Casos de Teste

### Teste 1: Criar Instância com Sucesso
```typescript
it('POST /instances - Sucesso 201', async () => {
  const response = await request(app)
    .post('/instances')
    .set('Authorization', `Bearer ${validToken}`)
    .send({
      name: 'Instance de Teste',
      accountAge: 30
    });

  expect(response.status).toBe(201);
  expect(response.body).toHaveProperty('id');
  expect(response.body.userId).toBe(userId);
  expect(response.body.isActive).toBe(true);
});
```

**Valida:**
- ✅ Token JWT válido aceito
- ✅ Instância criada com dados corretos
- ✅ Resposta HTTP 201 (Created)

---

### Teste 2: Sem Token
```typescript
it('POST /instances - Sem token = 401', async () => {
  const response = await request(app)
    .post('/instances')
    .send({ name: 'Instance' });

  expect(response.status).toBe(401);
  expect(response.body.error).toContain('Token não fornecido');
});
```

**Valida:**
- ✅ Middleware de autenticação funcionando
- ✅ Rejeita requisições sem token

---

### Teste 3: Token Inválido
```typescript
it('POST /instances - Token inválido = 401', async () => {
  const response = await request(app)
    .post('/instances')
    .set('Authorization', 'Bearer invalid.token.here')
    .send({ name: 'Instance' });

  expect(response.status).toBe(401);
  expect(response.body.error).toContain('Token inválido');
});
```

**Valida:**
- ✅ Rejeita tokens mal formados/expirados

---

### Teste 4: Limite de 3 Instâncias
```typescript
it('POST /instances - Limite 3 instâncias = 409', async () => {
  // Mock: usuário já tem 3 instâncias ativas
  vi.mocked(WhatsAppInstance.count).mockResolvedValue(3);

  const response = await request(app)
    .post('/instances')
    .set('Authorization', `Bearer ${validToken}`)
    .send({ name: 'Instance 4' });

  expect(response.status).toBe(409);
  expect(response.body.error).toContain('Máximo de 3');
});
```

**Valida:**
- ✅ Limite de instâncias por usuário
- ✅ Resposta apropriada (Conflict)

---

### Teste 5: Erro de Banco de Dados
```typescript
it('POST /instances - DB Error = 500', async () => {
  vi.mocked(WhatsAppInstance.count)
    .mockRejectedValue(new Error('Connection refused'));

  const response = await request(app)
    .post('/instances')
    .set('Authorization', `Bearer ${validToken}`)
    .send({ name: 'Instance' });

  expect(response.status).toBe(500);
  expect(response.body.error).toContain('Connection refused');
});
```

**Valida:**
- ✅ Trata erros de BD graciosamente
- ✅ Retorna HTTP 500 com mensagem

---

## 🚀 Execução de Testes

### Rodar Todos os Testes
```bash
npm test
```

### Rodar com UI Interativa
```bash
npm run test:ui
# Abre dashboard em http://localhost:51204
```

### Rodar Teste Específico
```bash
npm test -- instances.test.ts

# Ou use --grep para filtrar por nome
npm test -- --grep "POST /instances"
```

### Modo Watch (Re-executa ao salvar)
```bash
npm run test:watch
```

### Relatório de Cobertura
```bash
npm run test:coverage
# Gera index.html em coverage/
```

---

## 🐛 Debugging

### 1. Adicionar Breakpoints

Arquivo: `backend/src/routes/instances.ts`

```typescript
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    debugger; // ⚠️ Node.js vai pausar aqui
    
    const { name, accountAge } = req.body;
    
    // ... resto do código
  }
});
```

Rodar com debugger:
```bash
node --inspect-brk=9229 node_modules/.bin/ts-node-dev src/server.ts
# Abrir chrome://inspect em Google Chrome
```

### 2. Logs Estruturados

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    logger.info('POST /instances iniciado', { userId: req.user?.id });
    
    const { name, accountAge } = req.body;
    logger.debug('Dados recebidos', { name, accountAge });
    
    // ...resto do código
  } catch (error) {
    logger.error('Erro ao criar instância', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ error: error.message });
  }
});
```

### 3. Verificar BD em Tempo Real

```bash
# Se usar PostgreSQL
psql -h localhost -U postgres -d globaldisparos

# Verificar usuários
SELECT id, email, is_active FROM users LIMIT 5;

# Verificar instâncias
SELECT id, user_id, name, is_active FROM whatsapp_instances LIMIT 5;

# Verificar constraints
\dt whatsapp_instances
```

### 4. Teste Manual com cURL

```bash
# 1. Obter token (login)
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"123"}' \
  | jq -r '.token')

# 2. Criar instância
curl -X POST http://localhost:3000/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Instance",
    "accountAge": 30
  }' | jq

# 3. Listar instâncias
curl http://localhost:3000/instances \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 📝 Checklist Final

- [ ] JWT_SECRET configurado em .env
- [ ] Banco de dados criado e migrado
- [ ] Tabela `users` tem dados de teste
- [ ] Usuário de teste está ativo (is_active = true)
- [ ] Middleware `authenticate` está sendo usado
- [ ] WhatsAppInstance usa Foreign Key correta para userId
- [ ] Testes rodam sem erro com `npm test`
- [ ] Cobertura de testes > 80% com `npm run test:coverage`

---

## 🔗 Referências

- [Vitest Docs](https://vitest.dev/)
- [Supertest Docs](https://github.com/visionmedia/supertest)
- [Express Testing](https://expressjs.com/en/guide/testing.html)
- [JWT.io](https://jwt.io/)
