## 🎬 GUIA VISUAL - COMO USAR O SISTEMA

### PASSO 1: INICIAR O BACKEND

Abra PowerShell e execute:
```powershell
cd C:\Users\Icaro Garcia\Documents\globaldisparos\backend
npm run dev
```

Você deve ver:
```
🚀 WHATSAPP SAAS BACKEND - ENTERPRISE EDITION STARTED
Server: http://localhost:3001
```

---

### PASSO 2: INICIAR O FRONTEND

Abra OUTRO PowerShell e execute:
```powershell
cd C:\Users\Icaro Garcia\Documents\globaldisparos\frontend
npm run dev
```

Você deve ver:
```
➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

---

### PASSO 3: ABRIR NO NAVEGADOR

Abra seu navegador e acesse:
```
http://localhost:5173
```

---

### PASSO 4: FAZER LOGIN

Você verá a tela de login. Digite:
```
Email: admin@gmail.com
Senha: vip2026
```

Clique em "Entrar"

---

### PASSO 5: NAVEGAR PARA WHATSAPP

Após login, você verá menu lateral com opções:
- Dashboard
- **WhatsApp** ← CLIQUE AQUI
- Campanhas
- Contatos
- Grupos
- Perfil

Clique em **"WhatsApp"**

---

### PASSO 6: CRIAR INSTÂNCIA

Na página WhatsApp, você verá um botão:
```
+ Criar Instância WhatsApp
```

Clique nele

---

### PASSO 7: PREENCHER DADOS

Um modal abrirá. Preencha:
```
Nome: Minha Instância 1
Idade da Conta (opcional): 30
```

Clique em **"Criar e Conectar"**

---

### PASSO 8: AGUARDAR QR CODE

O modal mostrará progresso:
```
Status: Conectando...
Buscando QR Code no WhatsApp...
```

Em 3-5 segundos, o **QR Code aparecerá**

---

### PASSO 9: (OPCIONAL) ESCANEAR QR CODE

Se quiser testar a funcionalidade completa:
1. Abra WhatsApp no celular
2. Vá para Configurações → Aparelhos Conectados
3. Clique em "Conectar Aparelho"
4. Escanei o QR Code da tela

---

## 🎯 NAVEGAÇÃO PRINCIPALPage: **http://localhost:5173**

| Página | URL | Função |
|--------|-----|--------|
| Login | / | Fazer login com email/senha |
| Dashboard | /dashboard | Ver stats e métricas |
| **WhatsApp** | **/whatsapp** | ← COMECE AQUI |
| Campanhas | /campaigns | Gerenciar campanhas |
| Contatos | /contacts | Importar/gerenciar contatos |
| Grupos | /groups | Gerenciar grupos WhatsApp |

---

## 🧪 TESTANDO ENDPOINTS (Avançado)

Se quiser testar de forma mais técnica, abra Console do navegador (F12) e execute:

### Teste 1: Login
```javascript
const login = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'admin@gmail.com', 
    password: 'vip2026' 
  })
});
const data = await login.json();
localStorage.setItem('token', data.token);
console.log('✅ Login OK:', data.user.email);
```

### Teste 2: Listar Instâncias
```javascript
const token = localStorage.getItem('token');
const list = await fetch('http://localhost:3001/api/instances?page=1&limit=10', {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await list.json();
console.log('✅ Instâncias:', data);
```

### Teste 3: Criar Instância
```javascript
const token = localStorage.getItem('token');
const create = await fetch('http://localhost:3001/api/instances', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Test Instance ' + new Date().getTime(),
    accountAge: 30
  })
});
const data = await create.json();
console.log('✅ Instância criada:', { id: data.id, name: data.name });
```

### Teste 4: Obter QR Code
```javascript
const token = localStorage.getItem('token');
const instanceId = 1; // Substitua pelo ID da instância
const qr = await fetch(`http://localhost:3001/api/instances/${instanceId}/qr`, {
  headers: { Authorization: `Bearer ${token}` }
});
const data = await qr.json();
console.log('✅ QR Status:', data.status);
if (data.qrCode) {
  console.log('✅ QR Code recebido! Tamanho:', data.qrCode.length);
}
```

---

## 🔍 VERIFICANDO CACHE

Para validar que o caching está funcionando:

1. Abra DevTools (F12)
2. Clique em **Console**
3. Execute:

```javascript
// 1ª Requisição (deve ser MISS)
const resp1 = await fetch('http://localhost:3001/api/instances?page=1&limit=10', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
console.log('1ª Req - Cache:', resp1.headers.get('x-cache')); // MISS

// Aguarde 2 segundos

await new Promise(r => setTimeout(r, 2000));

// 2ª Requisição (deve ser HIT)
const resp2 = await fetch('http://localhost:3001/api/instances?page=1&limit=10', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
console.log('2ª Req - Cache:', resp2.headers.get('x-cache')); // HIT

// Aguarde 12 segundos (cache expira em 10s)

await new Promise(r => setTimeout(r, 12000));

// 3ª Requisição (deve ser MISS novamente)
const resp3 = await fetch('http://localhost:3001/api/instances?page=1&limit=10', {
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});
console.log('3ª Req - Cache:', resp3.headers.get('x-cache')); // MISS (expirou)
```

**Esperado:**
```
1ª Req - Cache: MISS
2ª Req - Cache: HIT  ← Cache funcionando!
3ª Req - Cache: MISS ← Cache expirou
```

---

## 📱 TESTANDO SOCKET.IO EM TEMPO REAL

No Console (F12), teste Socket.IO:

```javascript
// Conectar ao Socket.IO
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token')
  }
});

socket.on('connect', () => {
  console.log('✅ Socket.IO Conectado!');
});

socket.on('qrcode', (data) => {
  console.log('📱 QR Code recebido via Socket.IO:', data);
});

socket.on('instance_connected', (data) => {
  console.log('✅ Instância Conectada!:', data);
});

socket.on('error', (err) => {
  console.error('❌ Socket.IO Erro:', err);
});
```

Agora, se você criar uma nova instância no frontend, a mensagem "QR Code recebido" deve aparecer no console **em tempo real**!

---

## ✅ CHECKLIST DE SUCESSO

Após seguir todos os passos:

- [ ] ✅ Backend rodando em http://localhost:3001
- [ ] ✅ Frontend rodando em http://localhost:5173
- [ ] ✅ Login funcionando
- [ ] ✅ Página WhatsApp acessível
- [ ] ✅ Botão "+ Criar Instância" visível
- [ ] ✅ Modal abre ao clicar
- [ ] ✅ Instância é criada
- [ ] ✅ QR Code aparece em segundos
- [ ] ✅ Cache headers visíveis (X-Cache)
- [ ] ✅ Socket.IO conecta

## 🎉 SE TUDO PASSOU, PARABÉNS!

Seu sistema está 100% funcionando com:
- ✅ Endpoints otimizados
- ✅ Caching inteligente  
- ✅ Socket.IO real-time
- ✅ Mock API fallback
- ✅ Frontend + Backend integrados

---

## ⚠️ TROUBLESHOOTING

### Backend não inicia
```bash
# Kill tudo e começa fresco
Get-Process | Where-Object {$_.ProcessName -match "node"} | Stop-Process -Force
npm run dev
```

### Porta 3001 em uso
```bash
# Encontra o processo
netstat -ano | findstr :3001

# Mata o processo (substituir PID)
taskkill /PID XXXX /F
```

### Frontend não compila
```bash
cd frontend
rm -r node_modules package-lock.json
npm install
npm run dev
```

### Erros de dependência
```bash
cd backend
npm install --legacy-peer-deps
npm run dev
```

---

**Pronto para começar! 🚀**

