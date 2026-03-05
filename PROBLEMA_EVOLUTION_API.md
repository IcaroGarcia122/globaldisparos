# 🔍 DIAGNÓSTICO: Por que o Sistema Está Caindo

## PROBLEMA IDENTIFICADO

✅ **Backend**: Conectando corretamente ao PostgreSQL
✅ **Banco de dados**: Sequências reparadas e funcionando
✅ **Servidor**: Respondendo em localhost:3001
❌ **Evolution API**: NÃO está disponível em localhost:8080

---

## POR QUE RECEBE ERRO 500

Quando você clica em "Conectar WhatsApp":

```
POST /api/instances/:id/connect
  ↓
backend chama whatsappService.connect()
  ↓
adapter tenta conectar em http://localhost:8080 (Evolution API)
  ↓
"connect ECONNREFUSED ::1:8080" - Conexão recusada!
  ↓
HTTP 500 error
```

---

## SOLUÇÕES

### OPÇÃO 1: Subir Evolution API (Se você tem ela instalada)

A Evolution API é um serviço externo. Se você a tem:

```bash
# Em outro terminal
docker run -p 8080:8080 evolution-api:latest
# ou
npm run evolution:start
# ou qualquer comando que você usa para iniciá-la
```

Depois o sistema funcionará 100%.

### OPÇÃO 2: Usar Mock da Evolution API (Para testes)

Vou criar um mock server que simula a Evolution API. Assim você pode testar sem a API real.

**Criar arquivo `mock-evolution-api.ts`:**

```typescript
import express from 'express';
import logger from './src/utils/logger';

const app = express();
app.use(express.json());

// Mock QR Code endpoint
app.get('/instances/:instanceId/qrcode', (req, res) => {
  const { instanceId } = req.params;
  
  logger.info(`[MOCK] GET QR Code para instância ${instanceId}`);
  
  // Simular QR code após 2 segundos
  setTimeout(() => {
    res.json({
      qrcode: {
        code: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=`,
        base64: true,
        pairingStatus: 'WAITING_FOR_SCAN'
      }
    });
  }, 2000);
});

// Mock Connect endpoint  
app.post('/instances/:instanceId/connect', (req, res) => {
  const { instanceId } = req.params;
  
  logger.info(`[MOCK] POST Connect para instância ${instanceId}`);
  
  res.json({
    message: 'Gerando QR Code...',
    instanceId: instanceId
  });
});

const PORT = 8080;
app.listen(PORT, () => {
  logger.info(`🧪 MOCK Evolution API rodando em http://localhost:${PORT}`);
});
```

Execute com:
```bash
npx ts-node mock-evolution-api.ts
```

### OPÇÃO 3: Usar URL da Evolution API real

Se você tem Evolution API rodando em outra máquina:

```bash
# Abra .env e mude:
EVOLUTION_API_URL=http://seu-servidor:8080
```

---

## O QUE FAZER AGORA

### Se você TEM Evolution API instalada:

```bash
# Terminal 1: Backend (já rodando)
cd backend
npm run dev

# Terminal 2: Evolution API  
docker run -p 8080:8080 evolution-api:latest
# ou seu comando específico

# Terminal 3: Frontend
cd frontend
npm run dev
```

### Se você NÃO TEM Evolution API:

```bash
# Terminal 1: Backend (já rodando)
cd backend
npm run dev

# Terminal 2: Mock Evolution API
cd backend
npx ts-node mock-evolution-api.ts

# Terminal 3: Frontend
cd frontend  
npm run dev
```

Agora quando você conectar, o sistema funcionará com a Evolution API simulada.

---

## VERIFICAR QUAL É SEU CASO

1. **Você instalou Evolution API antes?**
   - SIM → Use OPÇÃO 1 (subir Evolution)
   - NÃO → Use OPÇÃO 2 (Mock)

2. **Você tem Docker?**
   - SIM → `docker ps` para ver se Evolution está rodando
   - NÃO → Use Mock ou instale Evolution manualmente

3. **Frontend/Backend dando erro?**
   - Se ver "ECONNREFUSED 8080" → Evolution API não está disponível
   - Siga OPÇÃO 2 (Mock) para completar os testes

---

## VERIFICAÇÃO RÁPIDA

```bash
# Você consegue acessar Evolution API?
curl http://localhost:8080/

# Se responder com algo → OK, suba ela
# Se der "Connection refused" → Use Mock (OPÇÃO 2)
```

---

## STATUS ATUAL

- ✅ PostgreSQL: Funcionando + Sequências reparadas
- ✅ Backend: Colado e respondendo  
- ✅ Autenticação: Funcionando (login OK)
- ✅ Instâncias: Criando OK
- ❌ Evolution API: Não encontrada

**Próximo passo**: Escolha OPÇÃO 1 ou 2 acima e continue.
