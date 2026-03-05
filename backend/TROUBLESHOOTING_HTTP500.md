# 🔧 Guia de Troubleshooting - HTTP 500 em POST /instances

## 🆘 Erro Encontrado
```
POST /instances → 500 Internal Server Error
```

## 🔍 Diagnóstico Rápido

Execute este script para identificar o problema:

```bash
#!/bin/bash
# save as: backend/debug-http500.sh

echo "=== TESTE 1: Verificar JWT_SECRET ==="
grep JWT_SECRET .env | head -1

echo -e "\n=== TESTE 2: Listar usuários no banco ==="
psql -h localhost -U postgres -d globaldisparos -c "SELECT id, email, is_active FROM users LIMIT 5;"

echo -e "\n=== TESTE 3: Gerar token de teste ==="
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const secret = '$(grep JWT_SECRET .env | cut -d= -f2)';
const token = jwt.sign({ userId: 1, email: 'test@example.com' }, secret);
console.log(token);
")
echo "Token: $TOKEN"

echo -e "\n=== TESTE 4: Fazer request POST ==="
curl -X POST http://localhost:3000/instances \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","accountAge":30}' \
  2>&1 | jq

echo -e "\n=== TESTE 5: Ver logs do servidor ==="
echo "Abra outro terminal e execute: npm run dev"
echo "Depois rode os testes acima e observe os logs"
```

---

## ⚠️ Problemas Comuns e Soluções

### 1️⃣ **JWT_SECRET Não Configurado**

**Sintoma:**
```
Error: Cannot read property 'secret' of undefined
```

**Solução:**
```bash
# backend/.env
JWT_SECRET=sua_chave_secreta_super_segura_aqui
JWT_EXPIRY=24h

# Reinicie o servidor
npm run dev
```

**Verificação:**
```javascript
// No código, adicione temporariamente:
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Definido' : '❌ NÃO DEFINIDO');
```

---

### 2️⃣ **Usuário Não Existe no Banco de Dados**

**Sintoma:**
```
res.status(401).json({ error: 'Usuário inválido ou inativo' })
```

**Solução:**

```bash
# 1. Verificar usuários no banco
psql -h localhost -U postgres -d globaldisparos

SELECT id, email, is_active FROM users;

# 2. Se vazio, criar usuário de teste
INSERT INTO users (email, password, name, is_active, role, plan, created_at)
VALUES ('test@example.com', 'hashed_pass', 'Test User', true, 'user', 'free', NOW());

# 3. Copiar o ID retornado e usar no token JWT
```

**Script SQL Rápido:**
```sql
-- arquivo: backend/create-test-user.sql
INSERT INTO users (email, password, name, is_active, role, plan, created_at)
VALUES 
  ('user1@test.com', '$2b$10$YourHashedPasswordHere', 'User 1', true, 'user', 'free', NOW()),
  ('user2@test.com', '$2b$10$YourHashedPasswordHere', 'User 2', true, 'user', 'free', NOW());

-- Verificar
SELECT id, email FROM users WHERE email LIKE 'user%@test%';
```

Executar:
```bash
psql -h localhost -U postgres -d globaldisparos < backend/create-test-user.sql
```

---

### 3️⃣ **req.user é Undefined**

**Sintoma:**
```
Cannot read property 'id' of undefined
req.user!.id
```

**Código com Debug:**
```typescript
// backend/src/routes/instances.ts
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    // ⚠️ Adicione estes logs:
    console.log('[1] req.user existe?', !!req.user);
    console.log('[2] req.user:', req.user);
    console.log('[3] req.user?.id:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      return res.status(400).json({ 
        error: 'Erro interno: req.user não definido' 
      });
    }

    const { name, accountAge } = req.body;
    
    // ... resto do código
  } catch (error: any) {
    console.error('❌ ERRO:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### 4️⃣ **Erro ao Criar no Banco de Dados**

**Sintoma:**
```
Error: UPDATE or DELETE on table "users" violates foreign key constraint "whatsapp_instances_user_id_fkey"
```

**Solução (Verificar Foreign Keys):**
```sql
-- Listar todas as constraints
\d whatsapp_instances

-- Deletar constraint se necessário
ALTER TABLE whatsapp_instances 
DROP CONSTRAINT whatsapp_instances_user_id_fkey;

-- Re-criar com ON DELETE CASCADE
ALTER TABLE whatsapp_instances 
ADD CONSTRAINT whatsapp_instances_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

### 5️⃣ **Coluna 'is_active' Não Existe**

**Sintoma:**
```
Error: column "is_active" of relation "users" does not exist
```

**Solução:**

Verificar estrutura da tabela:
```sql
\d users
```

Se `is_active` não existe, adicionar:
```sql
ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
```

---

### 6️⃣ **Timeout na Conexão com BD**

**Sintoma:**
```
ECONNREFUSED: Connection refused
```

**Verificações:**
```bash
# 1. PostgreSQL está rodando?
sudo systemctl status postgresql

# 2. Pode conectar?
psql -h localhost -U postgres -d globaldisparos

# 3. Há firewall bloqueando?
netstat -tulpn | grep 5432

# 4. Variáveis de ambiente corretas?
grep -E "DB_HOST|DB_PORT|DB_USER|DB_PASS|DB_NAME" backend/.env
```

**Solução (.env):**
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=globaldisparos
```

---

## 📋 Checklist de Verificação

Copie e cole este checklist no seu terminal:

```bash
#!/bin/bash
echo "🔍 CHECKLIST DE DIAGNÓSTICO"
echo "================================"

echo "1️⃣  JWT_SECRET configurado?"
[ -z "$(grep -E '^JWT_SECRET=' .env)" ] && echo "❌ NÃO" || echo "✅ SIM"

echo "2️⃣  Banco de dados está rodando?"
psql -h localhost -U postgres -c "\l" > /dev/null 2>&1 && echo "✅ SIM" || echo "❌ NÃO"

echo "3️⃣  Tabela 'users' existe?"
psql -h localhost -U postgres -d globaldisparos -c "\dt users" 2>/dev/null | grep -q "users" && echo "✅ SIM" || echo "❌ NÃO"

echo "4️⃣  Tabela 'whatsapp_instances' existe?"
psql -h localhost -U postgres -d globaldisparos -c "\dt whatsapp_instances" 2>/dev/null | grep -q "whatsapp_instances" && echo "✅ SIM" || echo "❌ NÃO"

echo "5️⃣  Há usuários no banco?"
USERS=$(psql -h localhost -U postgres -d globaldisparos -tA -c "SELECT COUNT(*) FROM users" 2>/dev/null)
[ "$USERS" -gt 0 ] && echo "✅ SIM ($USERS usuários)" || echo "❌ NÃO (0 usuários)"

echo "6️⃣  Servidor está rodando?"
curl -s http://localhost:3000/health > /dev/null && echo "✅ SIM" || echo "❌ NÃO"

echo ""
echo "================================"
echo "Se algum item estiver ❌, siga as soluções acima"
```

---

## 🧪 Teste Manual Passo a Passo

### Passo 1: Inicie o Servidor
```bash
cd backend
npm run dev

# Você deve ver:
# ✅ Servidor rodando em http://localhost:3000
# ✅ Banco sincronizado
```

### Passo 2: Crie um usuário de teste
```bash
# Abra outro terminal
psql -h localhost -U postgres -d globaldisparos

-- Dentro do psql:
INSERT INTO users (email, password, name, is_active, role, plan, created_at, updated_at)
VALUES ('test@example.com', 'anypassword', 'Test User', true, 'user', 'free', NOW(), NOW());

-- Anote o ID retornado (geralmente 1 se primeira vez)
SELECT id FROM users WHERE email = 'test@example.com';
-- Saída: 1
```

### Passo 3: Gere um token JWT
```bash
# Terminal 3
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 1, email: 'test@example.com' },
  process.env.JWT_SECRET || 'test-secret'
);
console.log('Token:', token);
"
# Copie o token completo
```

### Passo 4: Faça a requisição POST
```bash
# Terminal 3
curl -X POST http://localhost:3000/instances \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Instance",
    "accountAge": 30
  }' | jq

# Resposta esperada:
# {
#   "id": 1,
#   "userId": 1,
#   "name": "My First Instance",
#   "accountAge": 30,
#   "isActive": true,
#   "status": "disconnected"
# }
```

### Passo 5: Verifique nos Logs
```
# Terminal 1 (npm run dev) deve mostrar:
POST /instances 201 - 5.234 ms

# E os logs da rota:
[POST /instances] Iniciando...
[1] req.user: { id: 1, email: 'test@example.com', role: 'user' }
[2] req.body: { name: 'My First Instance', accountAge: 30 }
[3] Instância criada: 1
```

---

## 🎯 Se ainda der erro...

### 1. Ative logs super detalhados:

**backend/src/routes/instances.ts:**
```typescript
router.post('/', authenticate, async (req: AuthRequest, res) => {
  const startTime = Date.now();
  
  try {
    console.log('\n========== INICIANDO POST /instances ==========');
    console.log(`[${Date.now() - startTime}ms] Middleware authenticate passou`);
    console.log(`[${Date.now() - startTime}ms] req.user:`, JSON.stringify(req.user, null, 2));
    console.log(`[${Date.now() - startTime}ms] req.body:`, JSON.stringify(req.body, null, 2));
    
    const { name, accountAge } = req.body;
    console.log(`[${Date.now() - startTime}ms] Extraído: name="${name}", accountAge=${accountAge}`);
    
    if (!req.user?.id) {
      console.log(`[${Date.now() - startTime}ms] ❌ ERRO: req.user.id não definido`);
      return res.status(400).json({ error: 'req.user.id ausente' });
    }

    console.log(`[${Date.now() - startTime}ms] Contando instâncias ativas...`);
    const activeCount = await WhatsAppInstance.count({
      where: { userId: req.user.id, isActive: true }
    });
    console.log(`[${Date.now() - startTime}ms] activeCount = ${activeCount}`);

    if (activeCount >= 3) {
      console.log(`[${Date.now() - startTime}ms] ❌ Limite atingido`);
      return res.status(409).json({ 
        error: 'Máximo de 3 instâncias ativas' 
      });
    }

    console.log(`[${Date.now() - startTime}ms] Criando instância...`);
    const instance = await WhatsAppInstance.create({
      userId: req.user.id,
      name,
      accountAge: accountAge || 0,
      isActive: true
    });
    console.log(`[${Date.now() - startTime}ms] ✅ Criada com ID ${instance.id}`);
    
    res.status(201).json(instance);
    console.log(`[${Date.now() - startTime}ms] ✅ Resposta 201 enviada`);
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.log(`\n❌ ❌ ❌ ERRO NO POST /instances ❌ ❌ ❌`);
    console.log(`Duração: ${duration}ms`);
    console.log(`Tipo: ${error.constructor.name}`);
    console.log(`Mensagem: ${error.message}`);
    console.log(`Code: ${error.code}`);
    console.log(`Detail: ${error.detail}`);
    console.log(`Constraint: ${error.constraint}`);
    console.log(`Stack:\n${error.stack}`);
    console.log('========== FIM DO ERRO ==========\n');
    
    res.status(500).json({
      error: error.message,
      code: error.code,
      type: error.constructor.name
    });
  }
});
```

### 2. Captura a saída completa:

```bash
npm run dev > server.log 2>&1 &
# Faça a requisição
curl -X POST http://localhost:3000/instances ...
# Aguarde 5 segundos
sleep 5
# Veja o log
tail -100 server.log
```

### 3. Crie um teste minimal em arquivo separado:

**backend/test-http500.ts:**
```typescript
import axios from 'axios';
import jwt from 'jsonwebtoken';

async function testCreateInstance() {
  const userId = 1; // ID do seu usuário de teste
  const token = jwt.sign(
    { userId, email: 'test@example.com' },
    process.env.JWT_SECRET || 'test-secret'
  );

  try {
    const response = await axios.post(
      'http://localhost:3000/instances',
      {
        name: 'Test Instance',
        accountAge: 30
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Sucesso!', response.data);
  } catch (error: any) {
    console.log('❌ Erro:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
  }
}

testCreateInstance();
```

Executar:
```bash
npx ts-node backend/test-http500.ts
```

---

## 📞 Informações para Suporte

Se nada funcionar, colete estas informações:

```bash
# Copie a saída deste comando:
{
  echo "=== NODE VERSION ==="
  node --version
  
  echo "=== NPM VERSION ==="
  npm --version
  
  echo "=== POSTGRESQL VERSION ==="
  psql --version
  
  echo "=== DATABASE INFO ==="
  psql -h localhost -U postgres -d globaldisparos -c "\d users"
  psql -h localhost -U postgres -d globaldisparos -c "\d whatsapp_instances"
  
  echo "=== USERS COUNT ==="
  psql -h localhost -U postgres -d globaldisparos -c "SELECT COUNT(*) FROM users"
  
  echo "=== .env FILE (sem senhas) ==="
  grep -v PASSWORD .env | head -20
  
  echo "=== LAST 50 LINES OF SERVER.LOG ==="
  tail -50 server.log 2>/dev/null || echo "Arquivo não encontrado"
} > diagnostico.txt && cat diagnostico.txt
```

Compartilhe o arquivo `backend/diagnostico.txt` para que seja possível ajudar melhor.
