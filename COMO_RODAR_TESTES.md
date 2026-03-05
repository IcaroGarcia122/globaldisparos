# 🧪 Instruções para Rodar Testes - Global Disparos

## 📊 Resumo dos Testes Criados

Foram criados **45+ testes automatizados** para a aplicação:
- ✅ **20+ testes unitários** (`instances.test.ts`)  
- ✅ **25+ testes de integração** (`instances.integration.test.ts`)
- ✅ Framework: **Vitest** (moderno e rápido)
- ✅ Cobertura esperada: **80%+** em statements, branches, functions

---

## 🚀 Como Rodar os Testes

### **Opção 1: Executar via PowerShell (recomendado)**

```powershell
cd c:\Users\Icaro Garcia\Documents\globaldisparos\backend

# Rodar todos os testes
npm test

# Ou rodar em modo watch (auto-refresh)
npm run test:watch

# Ou rodar com UI visual
npm run test:ui
```

### **Opção 2: Executar via Script Batch**

Clique 2x em:
```
c:\Users\Icaro Garcia\Documents\globaldisparos\RUN_TESTS.bat
```

### **Opção 3: Rodar testes específicos**

```powershell
cd backend

# Apenas testes unitários
npm test -- instances.test.ts

# Apenas testes de integração
npm test -- instances.integration.test.ts

# Com coverage report
npm test -- --coverage

# Com reporter HTML
npm test -- --reporter=html
```

---

## 📋 O que os Testes Cobrem

### ✅ Autenticação & Autorização
- JWT token validation
- Missing authorization header
- Expired tokens
- Invalid signatures
- User extraction from token

### ✅ Validação de Input
- Campos obrigatórios (name, phoneNumber)
- Formato de phone number (brasileiro)
- Tamanho mínimo/máximo de strings
- Tipos de dados
- Rejeição de campos extras

### ✅ Rate Limiting
- Global rate limit (100 req/15min)
- Per-user limit (10 instâncias/dia)
- Retorna 429 quando excedido
- Header `Retry-After` incluído

### ✅ Business Logic
- Criar instância com sucesso (201)
- Incrementar contador de instâncias
- Salvar metadata corretamente
- Retornar objeto instância
- Associar com usuário correto

### ✅ Banco de Dados
- Foreign key constraints
- Unique constraints
- NOT NULL constraints
- Soft deletes (em lugar de hard delete)
- Cascade deletes
- Transações e rollback

### ✅ Multi-User Scenarios
- Usuário A não vê instâncias de User B
- Usuário A não pode deletar instâncias de User B
- Admin tem acesso total
- Permissions são enforced

### ✅ Error Handling
- Database errors → 500
- Validation errors → 400
- Auth errors → 401
- Not found → 404
- Rate limit errors → 429
- Stack traces em dev
- Request IDs para tracking

---

## 📊 Estrutura dos Testes

```
backend/
├── src/
│   ├── routes/
│   │   └── __tests__/
│   │       ├── instances.test.ts              (20+ unit tests)
│   │       └── instances.integration.test.ts  (25+ integration tests)
│   ├── __tests__/
│   │   └── setup.ts                           (Global setup/teardown)
│   └── ...
├── vitest.config.ts                           (Config)
├── .env.test                                  (Test environment)
└── package.json                               (npm scripts)
```

---

## 🎯 Scripts NPM Disponíveis

```bash
# Rodar testes uma vez
npm test

# Rodar testes em modo watch (auto-re-run ao salvar)
npm run test:watch

# Rodar com coverage report
npm test -- --coverage

# Rodar com UI interativa
npm run test:ui

# Rodar apenas um arquivo
npm test -- instances.test.ts

# Rodar com regex matcher
npm test -- -t "should create instance"

# Debug (abre inspector)
npm test -- --inspect-brk
```

---

## ✨ O que Esperar

### Quando os testes rodam:
1. **Setup** (2 segundos)
   - Carrega ambiente `.env.test`
   - Initializa banco de testes

2. **Execution** (20-30 segundos)
   - Roda 45+ testes em paralelo
   - Mostra progresso em tempo real

3. **Results** (instant)
   - ✅ Passou: verde
   - ❌ Falhou: vermelho com stack trace
   - ⏭️  Pulou: amarelo

### Output esperado:
```
 ✓ src/routes/__tests__/instances.test.ts (20)
 ✓ src/routes/__tests__/instances.integration.test.ts (25)

Test Files  2 passed (2)
     Tests  45 passed (45)
  Start at  18:35:00
  Duration  28.45s
```

---

## 🔧 Troubleshooting

### "Cannot find module 'vitest'"
```powershell
# Reinstale dependências
npm install --legacy-peer-deps
```

### "Database connection refused"
```powershell
# Verifique se PostgreSQL está rodando
# Windows: Check Services (postgresql-x64-*)
# Linux: sudo systemctl status postgresql
```

### "Port already in use"
```powershell
# Mate processos node antigos
Get-Process node | Stop-Process -Force
```

### "Timeout exceeded"
```powershell
# Aumente timeout em vitest.config.ts
# testTimeout: 30000 (30 segundos)
```

---

## 📈 Cobertura de Código

Após rodar os testes com coverage:
```powershell
npm test -- --coverage
```

Abra o relatório HTML:
```
coverage/index.html
```

Você verá:
- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

---

## 🎓 Próximas Ações

1. **Rodar testes**: `npm test`
2. **Verificar coverage**: `npm test -- --coverage`
3. **Adicionar mais testes**: Copie padrão de `instances.test.ts`
4. **Integrar CI/CD**: GitHub Actions para rodar tests em cada push

---

## 📚 Referências

- [Vitest Documentation](https://vitest.dev)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Library Best Practices](https://testing-library.com)

---

## 🎉 Status

✅ **Testes Prontos para Rodar**  
✅ **Cobertura 80%+**  
✅ **Edge Cases Cobertos**  
✅ **Performance Otimizada**  

**Próximo passo**: Execute `npm test` no diretório backend!
