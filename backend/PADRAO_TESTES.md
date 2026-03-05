# 📚 Padrão de Estrutura de Testes para Rotas

## 📁 Estrutura de Diretórios

```
backend/
├── src/
│   ├── routes/
│   │   ├── instances.ts
│   │   ├── messages.ts
│   │   ├── contacts.ts
│   │   └── __tests__/
│   │       ├── instances.test.ts           # Unit tests com mocks
│   │       ├── instances.integration.test.ts # Integration tests
│   │       ├── messages.test.ts
│   │       ├── messages.integration.test.ts
│   │       └── ...
│   │
│   └── __tests__/
│       ├── setup.ts                         # Setup global
│       └── fixtures/
│           ├── users.fixture.ts
│           ├── instances.fixture.ts
│           └── ...
│
├── vitest.config.ts
├── .env.test
└── package.json (com scripts de teste)
```

---

## 🎯 Padrão de Test File

Cada rota deve ter:

### 1. **Unit Tests** (`instances.test.ts`)
- Com mocks do banco de dados
- Focado na lógica da rota
- Rápido de executar
- Sem dependência de BD real

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { WhatsAppInstance } from '../../models';

vi.mock('../../models');

describe('Instances Routes - Unit Tests', () => {
  // Testes com mocks...
});
```

### 2. **Integration Tests** (`instances.integration.test.ts`)
- Com banco de dados real (ou teste)
- Testa fluxo completo
- Mais lento mas mais realista
- Usa `beforeAll` para setup de dados

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import sequelize from '../../config/database';

describe('Instances Routes - Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: false });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // Testes reais com BD...
});
```

---

## 🔧 Exemplos de Padrões Comuns

### Pattern 1: Teste Simples de Authenticação

```typescript
describe('Authentication', () => {
  it('should return 401 without token', async () => {
    const response = await request(app)
      .post('/instances')
      .send({ name: 'Test' });

    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const response = await request(app)
      .post('/instances')
      .set('Authorization', 'Bearer invalid')
      .send({ name: 'Test' });

    expect(response.status).toBe(401);
  });
});
```

### Pattern 2: Teste com Dados Setup

```typescript
describe('POST /messages', () => {
  let sender: any;
  let recipient: any;

  beforeEach(async () => {
    sender = await User.create({
      email: `sender-${Date.now()}@test.com`,
      // ...
    });

    recipient = await User.create({
      email: `recipient-${Date.now()}@test.com`,
      // ...
    });
  });

  it('should send message between users', async () => {
    const token = generateToken(sender.id);

    const response = await request(app)
      .post('/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        recipientId: recipient.id,
        content: 'Hello'
      });

    expect(response.status).toBe(201);
    expect(response.body.senderId).toBe(sender.id);
  });
});
```

### Pattern 3: Teste com Múltiplas Requisições

```typescript
describe('Workflow completo', () => {
  it('should create, update, and delete instance', async () => {
    const token = generateToken(userId);

    // 1. Criar
    const createResponse = await request(app)
      .post('/instances')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    
    expect(createResponse.status).toBe(201);
    const instanceId = createResponse.body.id;

    // 2. Verificar criação
    const getResponse = await request(app)
      .get('/instances')
      .set('Authorization', `Bearer ${token}`);
    
    expect(getResponse.body).toContainEqual(
      expect.objectContaining({ id: instanceId })
    );

    // 3. Deletar
    const deleteResponse = await request(app)
      .delete(`/instances/${instanceId}`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(deleteResponse.status).toBe(200);
  });
});
```

### Pattern 4: Teste com Erro Esperado

```typescript
describe('Error Handling', () => {
  it('should handle database connection error', async () => {
    vi.mocked(WhatsAppInstance.count)
      .mockRejectedValue(new Error('Connection failed'));

    const response = await request(app)
      .post('/instances')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });

    expect(response.status).toBe(500);
    expect(response.body.error).toContain('Connection failed');
  });
});
```

### Pattern 5: Teste com Fixtures

**`fixtures/users.fixture.ts`:**
```typescript
export const createTestUser = async (overrides = {}) => {
  return User.create({
    email: `test-${Date.now()}@example.com`,
    password: 'hashed',
    name: 'Test User',
    isActive: true,
    role: 'user',
    plan: 'free',
    ...overrides,
  });
};

export const createTestUsers = async (count = 3) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await createTestUser());
  }
  return users;
};
```

**Usando fixture:**
```typescript
import { createTestUser } from '../../__tests__/fixtures/users.fixture.ts';

describe('Users', () => {
  it('should create users', async () => {
    const user = await createTestUser({ email: 'custom@test.com' });
    expect(user.email).toBe('custom@test.com');
  });
});
```

---

## 🚀 Script de Testes

**`package.json`:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run",
    "test:debug": "vitest --inspect-brk --inspect --single-thread",
    "test:instances": "vitest run src/routes/__tests__/instances.test.ts",
    "test:integration": "vitest run src/routes/__tests__/*.integration.test.ts"
  }
}
```

---

## 📊 Exemplo de Cobertura de Testes

Para 100% de cobertura, testar:

```
✅ Happy paths (tudo funciona)
✅ Erro de autenticação (401)
✅ Erro de autorização (403)
✅ Recurso não encontrado (404)
✅ Limite/conflito (409/429)
✅ Erro de validação (400)
✅ Erro de servidor (500)
✅ Casos limite (valores máximos, vazios, etc)
✅ Fluxos completos (end-to-end)
```

---

## 🎓 Checklist de Teste Completo

Para cada endpoint:

- [ ] **GET /resource (lista)**
  - [ ] Retorna lista vazia quando sem dados
  - [ ] Retorna lista com dados
  - [ ] Filtra corretamente (query params)
  - [ ] Pagina corretamente (offset, limit)
  - [ ] 401 sem autenticação

- [ ] **POST /resource (criação)**
  - [ ] 201 ao criar com sucesso
  - [ ] 400 com dados inválidos
  - [ ] 401 sem autenticação
  - [ ] 403 sem permissão
  - [ ] 409 com conflito (ex: limite)
  - [ ] 500 com erro de servidor

- [ ] **GET /resource/:id (detalhe)**
  - [ ] Retorna recurso correto
  - [ ] 404 quando não existe
  - [ ] 401 sem autenticação

- [ ] **PUT/PATCH /resource/:id (atualização)**
  - [ ] Atualiza parcialmente (PATCH)
  - [ ] Atualiza completamente (PUT)
  - [ ] 404 quando não existe
  - [ ] 400 com dados inválidos
  - [ ] 403 se não é o proprietário

- [ ] **DELETE /resource/:id (deleção)**
  - [ ] Deleta e retorna 200/204
  - [ ] 404 quando não existe
  - [ ] 403 se não é o proprietário

---

## 📈 Métricas de Qualidade

```
✅ Cobertura de linhas: > 80%
✅ Cobertura de funções: > 80%
✅ Cobertura de branches: > 80%
✅ Tempo de execução: < 30s (unit) / < 5min (integration)
✅ Número de testes: 1 teste por function/branch principais
```

---

## 🔗 Referências Rápidas

| Comando | Uso |
|---------|-----|
| `npm test` | Rodar todos os testes |
| `npm test -- instances` | Rodar apenas testes de instâncias |
| `npm test:ui` | Abrir dashboard visual |
| `npm test:watch` | Modo watch (re-roda ao salvar) |
| `npm test:coverage` | Gerar relatório de cobertura |
| `npm test:debug` | Com debugger (Node Inspector) |

---

## 💡 Dicas Importantes

1. **Sempre cleanup:** Use `afterEach` ou `afterAll` para limpar dados
2. **Isolação:** Cada teste deve ser independente
3. **Nomes descritivos:** Descreva o que testa, não como testa
4. **AAA Pattern:** Arrange, Act, Assert
5. **Mock com cuidado:** Mocks muito restritivos ocultam bugs
6. **Testes lentos:** Usar unit + integration, não só integration

---

## 🐛 Se não conseguir fazer o teste passar...

1. Adicione logs: `console.log('Debug:', value)`
2. Use `--reporter=verbose` para mais detalhes
3. Rode com `--inspect-brk` para debugar
4. Verifique mocks estão corretos: `vi.mocked(function).mock.calls`
5. Revise a ordem de execução no arquivo
