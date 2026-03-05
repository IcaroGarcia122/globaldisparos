# Evolution API - Ambiente Local de Testes

## 📋 Pré-requisitos

- Docker instalado
- Docker Compose instalado
- VS Code instalado

## 🚀 Quick Start

### 1. Navegar para o projeto
```bash
cd /caminho/para/globaldisparos
```

### 2. Iniciar serviços
```bash
docker-compose up -d
```

### 3. Verificar status
```bash
docker-compose ps
```

### 4. Ver logs
```bash
docker-compose logs -f evolution-api
```

## 🌐 Acessar Serviços

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Evolution API** | http://localhost:8080 | API Key: `teste_local_key_123456789` |
| **PgAdmin** | http://localhost:5050 | Email: `admin@local.com` / Senha: `admin` |
| **Redis Commander** | http://localhost:8081 | - |
| **PostgreSQL** | localhost:5432 | User: `postgres` / Senha: `postgres` / DB: `evolution` |
| **Redis** | localhost:6379 | - |

## ⚙️ Configurar PgAdmin

1. Acesse http://localhost:5050
2. Login: `admin@local.com` / `admin`
3. Adicionar Servidor:
   - **Nome:** Evolution Local
   - **Host:** postgres
   - **Port:** 5432
   - **Database:** evolution
   - **Username:** postgres
   - **Password:** postgres

## 🧪 Testar API

### Listar Instâncias
```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: teste_local_key_123456789"
```

### Criar Instância
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{
    "instanceName": "teste_local",
    "qrcode": true
  }'
```

### Buscar QR Code
```bash
curl http://localhost:8080/instance/qrcode/teste_local \
  -H "apikey: teste_local_key_123456789"
```

### Verificar Status
```bash
curl http://localhost:8080/instance/connectionState/teste_local \
  -H "apikey: teste_local_key_123456789"
```

### Enviar Mensagem
```bash
curl -X POST http://localhost:8080/message/sendText/teste_local \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{
    "number": "5511999999999",
    "text": "Olá! Mensagem de teste."
  }'
```

## 🔧 Comandos Úteis
```bash
# Iniciar
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f evolution-api

# Reiniciar serviço
docker-compose restart evolution-api

# Ver status
docker-compose ps

# Ver uso de recursos
docker stats

# Limpar tudo (CUIDADO - apaga volumes!)
docker-compose down -v
```

## 📦 Backup
```bash
# Fazer backup
./scripts/backup.sh

# Restaurar backup
./scripts/restore.sh backups/evolution_20240101_120000.sql.gz
```

## 🎨 Tasks do VS Code

Pressione `Ctrl+Shift+P` → Digite "Run Task" → Escolha:

- 🚀 Iniciar Evolution API
- ⏹️ Parar Evolution API
- 🔄 Reiniciar Evolution API
- 📋 Ver Logs Evolution
- 📋 Ver Logs Todos Serviços
- 📊 Status dos Containers
- 🧹 Limpar Tudo
- 📦 Backup do Banco
- 🔧 Atualizar Imagens

## 🐛 Troubleshooting

### Porta já em uso
```bash
# Linux/Mac
lsof -ti:8080 | xargs kill -9

# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Resetar tudo
```bash
docker-compose down -v
docker system prune -af
docker-compose up -d
```

### Ver erros detalhados
```bash
docker-compose logs evolution-api
```

## 📚 Documentação

- [Evolution API Docs](https://doc.evolution-api.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
