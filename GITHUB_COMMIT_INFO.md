# 📦 Repositório Sincronizado com GitHub

## ✅ Status
- **Repository**: https://github.com/IcaroGarcia122/globaldisparos
- **Branch**: main
- **Status**: ✅ Atualizado em 05/03/2026

## 📊 Informações do Commit

### Última Atualização
- **Commit Hash**: 9be8edd
- **Mensagem**: "fix: Habilitar Backend sem Redis e Evolution API Mock"
- **Arquivos Modificados**: 327
- **Linhas Adicionadas**: 58.300+
- **Linhas Removidas**: 1.183-

## 🎯 Principais Mudanças

### Backend (Express + TypeScript)
- ✅ Funciona **SEM Redis** obrigatório
- ✅ Queue Service configurável
- ✅ Modo desenvolvimento sem Docker
- ✅ Porta 3001 (Health: `/health`)

### Frontend (React + Vite)
- ✅ Interface SPA responsiva
- ✅ Conexão com WhatsApp
- ✅ Gerenciamento de campanhas
- ✅ Porta 5173

### API de Simulação
- ✅ Evolution API Mock (porta 8081)
- ✅ Redis Mock (porta 6379)
- ✅ Endpoints funcionais para testes

## 🚀 Como Clonar e Usar

### 1. Clonar Repositório
```bash
git clone https://github.com/IcaroGarcia122/globaldisparos.git
cd globaldisparos
```

### 2. Instalar Dependências

#### Backend
```bash
cd backend
npm install
npm run build
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Iniciar Serviços

#### Terminal 1 - Backend
```bash
cd backend
npm run start
# Rodando em http://localhost:3001
```

#### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
# Rodando em http://localhost:5173
```

#### Terminal 3 - Evolution API Mock (Opcional)
```bash
node evolution-api-mock.js
# Rodando em http://localhost:8081
```

## 📋 Requisitos do Sistema

- **Node.js**: v18+
- **npm**: v9+
- **Git**: Para clonar e gerenciar versionamento
- **Docker** (Opcional): Para produção com PostgreSQL/Redis

## 🔧 Configuração

### Backend `.env` (sem Redis obrigatório)
```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database (PostgreSQL opcional)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=globaldisparos
DB_USER=postgres
DB_PASSWORD=icit0707

# Redis (deixar vazio para desenvolvimento)
REDIS_HOST=
REDIS_PORT=

# JWT
JWT_SECRET=CHANGE_THIS_IN_PRODUCTION
```

### Frontend `api.ts`
```typescript
const API_BASE_URL = 'http://localhost:3001';
const EVOLUTION_URL = 'http://localhost:8081';
```

## 📚 Estrutura do Projeto

```
globaldisparos/
├── backend/
│   ├── src/
│   │   ├── config/        # Configurações
│   │   ├── models/        # BD Models
│   │   ├── routes/        # API Routes
│   │   ├── services/      # Lógica de negócio
│   │   ├── middleware/    # Auth, validators
│   │   └── server.ts      # Entry point
│   ├── dist/              # Compilado
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas SPA
│   │   ├── config/        # Configurações
│   │   └── App.tsx        # Root component
│   ├── package.json
│   └── vite.config.ts
│
├── evolution-api-mock.js  # Simula Evolution API
├── redis-mock.js          # Simula Redis
└── docker-compose.yml     # Para produção
```

## 🔑 Credenciais Padrão (Desenvolvimento)

### Banco de Dados
- **User**: postgres
- **Password**: icit0707
- **Database**: globaldisparos

### Evolution API
- **API Key**: myfKey123456789 (Mock)
- **URL**: http://localhost:8081

## ✨ Funcionalidades Prontas

- [x] Autenticação de usuários
- [x] Gerenciamento de instâncias WhatsApp
- [x] Criação de campanhas
- [x] Envio de mensagens em massa
- [x] Sincronização de grupos
- [x] Gerar QR Code para conectar WhatsApp
- [x] Dashboard de estatísticas
- [x] Sistema de logs
- [x] Proteção contra banimento

## 🐛 Troubleshooting

### Backend não inicia na porta 3001
```bash
# Verificar se a porta está em uso
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Matar processo
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Redis não disponível
- Deixar `REDIS_HOST` vazio no `.env`
- Backend funcionará em modo degradado (sem cache)
- Para produção, ativar Docker

### Frontend não conecta com Backend
1. Verificar se Backend está rodando: `http://localhost:3001/health`
2. Verificar URL em `frontend/src/config/api.ts`
3. Verificar CORS no Backend

## 📖 Próximas Etapas

1. **Produção**: Ativar Docker com PostgreSQL + Redis
2. **Testes**: Implementar testes E2E e unitários
3. **CI/CD**: Configurar GitHub Actions
4. **Deploy**: Preparar para cloud (AWS, DigitalOcean, Heroku)
5. **Monitoramento**: Adicionar Sentry ou similar

## 📞 Suporte

Para issues ou dúvidas:
1. Checkar logs do backend: `npm run start`
2. Abrir issue no GitHub
3. Revisar documentação em arquivos `.md`

---

**Última atualização**: 05/03/2026
**Desenvolvido com**: Node.js, React, TypeScript, Express
