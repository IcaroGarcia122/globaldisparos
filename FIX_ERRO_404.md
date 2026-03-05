# 🚨 FIX: Erro 404 ao Conectar WhatsApp

## ❌ O Problema

```
Erro ao conectar: Request failed with status code 404
Erro ao gerar o QR code
```

**Causa**: A rota `POST /api/instances/:id/connect` não está respondendo com código 404.

---

## ✅ Solução

### 1️⃣ Parar todos os processos Node

```bash
taskkill /F /IM node.exe
Start-Sleep -Seconds 3
```

### 2️⃣ Recompilar o backend

```bash
cd backend
npm run build
```

**Validar**: Não deve ter erros TypeScript (saída vazia é sucesso)

### 3️⃣ Iniciar o backend NOVO

```bash
npm run dev
```

**Validar**: Você deveria ver:
```
✅ Usando Evolution API (ÚNICA implementação disponível)
📡 Evolution API URL: http://localhost:8080
✅ Servidor rodando na porta 3001
```

### 4️⃣ Iniciar o frontend

Em outro terminal:
```bash
cd frontend
npm run dev
```

### 5️⃣ Testar no navegador

- Abrir http://localhost:8080
- Login: admin@gmail.com / vip2026
- Conectar WhatsApp
- Esperar 2-3 segundos e acessar o console do navegador (F12)

---

## 🔍 Se Ainda Não Funcionar

### Verificar logs do backend

Quando você clica "Conectar", você deve ver no terminal do backend:
```
[CONNECT] Iniciando para instância 1
[CONNECT] Chamando whatsappService.connect(1)
```

**Se não aparecer**: Significa que a requisição não chegou ao backend. Verify:
- Frontend está em http://localhost:8080
- Backend está em http://localhost:3001
- Proxy em vite.config.ts está correto

### Verificar network do browser

1. Abrir F12 (DevTools)
2. Ir em "Network"
3. Clicar "Conectar WhatsApp"
4. Procurar pela requisição a `/api/instances/.../connect`
5. Se estatus for:
   - ❌ **404**: Backend não tem a rota (recompile!)
   - ❌ **401**: Token inválido (faça login novamente)
   - ❌ **403**: Acesso negado (não é dono da instância)
   - ✅ **200**: Funcionando!

---

## 📝 Checklist de Diagnóstico

- [ ] Backend está compilado: `npm run build` retorna sem erros
- [ ] Backend está rodando: `npm run dev` mostra porta 3001
- [ ] Post com `/health` retorna 200
- [ ] Pode fazer login (token válido)
- [ ] Pode listar instâncias (GET /api/instances)
- [ ] POST /api/instances/:id/connect retorna 200 ou 500, não 404

---

## 🚀 Comando Rápido para Resetar Tudo

```bash
# Terminal 1: Backend
taskkill /F /IM node.exe
Start-Sleep -Seconds 3
cd backend
npm run build
npm run dev

# Terminal 2: Frontend (depois que backend estiver rodando)
cd frontend
npm run dev
```

---

## 💡 O Que Fazer Se Vir 404 no Console do Backend

Se ver no terminal do backend:
```
❌ Cannot find module
```

Significa que o build falhou. Execute:
```bash
npm run build
```

Se tiver erro de compilação TypeScript, procure por erros de sintaxe no arquivo instances.ts.

---

**⏰ Tempo esperado**: 5-10 segundos para o QR code aparecer após clicar "Conectar"

Tente novamente agora! 🚀
