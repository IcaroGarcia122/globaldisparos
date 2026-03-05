# 🚀 Global Disparos - Guia Rápido de Início

## 📋 Pré-requisitos

- **Node.js** 18+ (instalar de https://nodejs.org/)
- **PostgreSQL** 13+ (instalar localmente ou remoto)
- **Redis** (opcional, mas recomendado para melhor performance)
- **Git** (para clonar o repositório)

## 🏃 Início Rápido (2 minutos)

### Windows (PowerShell)

```powershell
# 1. Abra PowerShell como Administrador
# 2. Navegue até a pasta do projeto
cd C:\Users\SeuUsuario\Documents\globaldisparos

# 3. Execute o script de inicialização
.\START.ps1
```

### Linux/macOS (Bash)

```bash
# 1. Navegue até a pasta do projeto
cd ~/Documents/globaldisparos

# 2. Tornar o script executável
chmod +x START.sh

# 3. Executar o script
./START.sh
```

---

## 🛠️ Setup Manual (Se preferir)

### 1. Instalar Dependências

```bash
# Backend
cd backend
npm install --legacy-peer-deps

# Frontend
cd ../frontend
npm install
```

### 2. Configurar Banco de Dados

**PostgreSQL:**
```sql
-- Conectar como admin
psql -U postgres

-- Criar banco de dados
CREATE DATABASE globaldisparos;

-- Criar usuário
CREATE USER postgres WITH PASSWORD 'icit0707';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE globaldisparos TO postgres;
```

### 3. Configurar Backend

```bash
cd backend

# Arquivo .env já está configurado
# Se precisar ajustar, edite:
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=icit0707
# DB_NAME=globaldisparos
```

### 4. Iniciar Servidores

**Terminal 1 - Backend:**
```bash
cd backend
npm run build
npm start
# Deve mostrar: ✅ WHATSAPP SAAS BACKEND STARTED
# Na porta: http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Deve mostrar: VITE v5.4.19 ready
# Na porta: http://localhost:8080
```

---

## ✅ Testar a Aplicação

### Backend Health Check

```bash
curl http://localhost:3001/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-02-19T01:35:00.000Z",
  "uptime": 45.123,
  "environment": "development",
  "redis": "⚠️ degraded"
}
```

### Frontend

Abena no navegador:
```
http://localhost:8080
```

---

## 🐛 Solução de Problemas

### Erro: "Port 3001 already in use"

```powershell
# Windows - matar processo na porta 3001
Get-Process -Name "node" | Stop-Process -Force

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Erro: "PostgreSQL connection refused"

1. Verificar se PostgreSQL está rodando:
   ```bash
   # Windows
   Get-Service PostgreSQL
   
   # Linux
   sudo systemctl status postgresql
   
   # Mac
   brew services list | grep postgres
   ```

2. Se não estiver, iniciar:
   ```bash
   # Windows - Services.msc
   # Linux
   sudo systemctl start postgresql
   
   # Mac
   brew services start postgresql
   ```

### Erro: "Redis connection refused"

Redis é **opcional**. O app continua funcionando sem ele, mas com:
- ❌ Sem cache
- ❌ Sem filas de job
- ⚠️ Performance reduzida

Para ativar Redis:
```bash
# Windows - Redis não tem suporte nativo
# Use WSL2 ou Docker

# Linux
sudo apt install redis-server
sudo systemctl start redis-server

# Mac
brew install redis
brew services start redis
```

### Erro: "Module not found"

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Frontend
cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

---

##📊 Estrutur do Projeto

```
globaldisparos/
├── backend/                    # API REST + WhatsApp
│   ├── src/
│   │   ├── routes/            # Endpoints
│   │   ├── models/            # Banco de dados
│   │   ├── services/          # Lógica de negócio
│   │   ├── middleware/        # Auth, rate limiting, etc
│   │   └── config/            # Configuração
│   ├── dist/                  # Código compilado
│   ├── .env                   # Variáveis de ambiente
│   └── package.json
│
├── frontend/                   # Aplicação React
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── services/          # Chamadas API
│   │   └── App.tsx
│   ├── index.html
│   └── package.json
│
├── START.ps1                   # Script de inicialização (Windows)
├── START.sh                    # Script de inicialização (Linux/Mac)
└── README.md                   # Este arquivo
```

---

## 📚 Documentação

- [API Endpoints](./backend/API_ENDPOINTS.md) - Lista completa de endpoints
- [Guia Testes](./backend/GUIA_TESTES_COMPLETO.md) - Como rodar testes
- [Anti-Ban Guide](./backend/DOC_ANTI_BAN.md) - Sistema anti-banimento
- [Status do Projeto](./STATUS.md) - Progresso das features

---

## 🔐 Segurança

**⚠️ IMPORTANTE**: As credenciais abaixo são APENAS para desenvolvimento:

```
DB_USER=postgres
DB_PASSWORD=icit0707
JWT_SECRET=dev_secret_key_min_32_chars_long_ok
```

**Em Produção:**
- Mude TODAS as senhas
- Configure variáveis de ambiente seguras
- Use HTTPS
- Configure CORS adequadamente
- Ative Helmet
- Use variáveis de ambiente secretas

---

## 🚀 Deployment

### Docker (Recomendado)

```bash
docker-compose up -d
```

### Manual

Veja [INSTALACAO_WINDOWS.md](./backend/INSTALACAO_WINDOWS.md)

---

## 📞 Suporte

Tem um problema?

1. Consulte [TROUBLESHOOTING_HTTP500.md](./backend/TROUBLESHOOTING_HTTP500.md)
2. Verifique os logs:
   ```bash
   # Backend
   tail -f backend/logs/*.log
   
   # Frontend
   verificar console do navegador (F12)
   ```
3. Leia a documentação no `/backend`

---

## ✅ Checklist de Inicialização

- [ ] Node.js 18+ instalado
- [ ] PostgreSQL 13+ instalado e rodando
- [ ] Banco `globaldisparos` criado
- [ ] Backend compilado (`npm run build`)
- [ ] Backend iniciado (`npm start`)
- [ ] Backend respondendo em `http://localhost:3001/health`
- [ ] Frontend iniciado (`npm run dev`)
- [ ] Frontend acessível em `http://localhost:8080`
- [ ] Consegue fazer login
- [ ] Consegue criar instância WhatsApp

---

## 📊 Próximas Features

- [ ] Webhook para WhatsApp
- [ ] Sistema de aquecimento (warmup)
- [ ] Dashboard de análises
- [ ] Exportar relatórios
- [ ] Integração com CRM

---

**Última atualização:** 19 de Fevereiro de 2026  
**Status:** ✅ Funcional para desenvolvimento
