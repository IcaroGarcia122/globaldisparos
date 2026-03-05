
## ✅ Checklist de Verificação

### 1. Verificar que todos os containers estão rodando
```bash
docker-compose ps
```

**Esperado:** Todos com status `Up`

### 2. Testar Evolution API

#### A) Health Check
```bash
curl http://localhost:8080
```
**Esperado:** Resposta HTML ou JSON

#### B) Listar Instâncias
```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: teste_local_key_123456789"
```
**Esperado:** `[]` (array vazio)

### 3. Criar Instância de Teste
```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{
    "instanceName": "minha_instancia_teste",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

**Esperado:** JSON com `instance` criada

### 4. Conectar Instância (gerar QR)
```bash
curl -X GET http://localhost:8080/instance/connect/minha_instancia_teste \
  -H "apikey: teste_local_key_123456789"
```

**Esperado:** JSON indicando que está conectando

### 5. Buscar QR Code
```bash
curl http://localhost:8080/instance/qrcode/minha_instancia_teste \
  -H "apikey: teste_local_key_123456789"
```

**Esperado:** JSON com `base64` do QR Code

### 6. Verificar no Banco de Dados

#### Pelo PgAdmin:
1. Abra http://localhost:5050
2. Login: `admin@local.com` / `admin`
3. Conecte ao servidor (ver README.md)
4. Execute:
```sql
SELECT * FROM "Instance";
SELECT * FROM "Message" LIMIT 10;
```

#### Pelo Terminal:
```bash
docker exec -it postgres_local psql -U postgres -d evolution -c "SELECT * FROM \"Instance\";"
```

### 7. Verificar no Redis

#### Pelo Redis Commander:
1. Abra http://localhost:8081
2. Veja as keys criadas

#### Pelo Terminal:
```bash
docker exec -it redis_local redis-cli
> KEYS *
> GET evolution_local:instances
```

### 8. Testar Envio de Mensagem (após conectar WhatsApp)
```bash
curl -X POST http://localhost:8080/message/sendText/minha_instancia_teste \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{
    "number": "5511999999999",
    "text": "Olá! Esta é uma mensagem de teste do Evolution API."
  }'
```

### 9. Listar Instâncias Novamente
```bash
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: teste_local_key_123456789"
```

**Esperado:** Array com a instância criada

### 10. Verificar Status da Conexão
```bash
curl http://localhost:8080/instance/connectionState/minha_instancia_teste \
  -H "apikey: teste_local_key_123456789"
```

**Esperado:** JSON com `state` (close, connecting, open)

## 📊 Cenários de Teste

### Cenário 1: Criar 3 Instâncias Diferentes
```bash
# Instância 1
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{"instanceName": "instancia_1", "qrcode": true}'

# Instância 2
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{"instanceName": "instancia_2", "qrcode": true}'

# Instância 3
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: teste_local_key_123456789" \
  -d '{"instanceName": "instancia_3", "qrcode": true}'

# Listar todas
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: teste_local_key_123456789"
```

### Cenário 2: Deletar Instância
```bash
curl -X DELETE http://localhost:8080/instance/delete/instancia_1 \
  -H "apikey: teste_local_key_123456789"
```

### Cenário 3: Logout da Instância
```bash
curl -X DELETE http://localhost:8080/instance/logout/instancia_2 \
  -H "apikey: teste_local_key_123456789"
```

## 🔍 Logs de Debug

### Ver logs da Evolution API:
```bash
docker-compose logs -f evolution-api
```

### Ver logs do PostgreSQL:
```bash
docker-compose logs -f postgres
```

### Ver logs do Redis:
```bash
docker-compose logs -f redis
```

### Ver logs de todos:
```bash
docker-compose logs -f
```

## ✅ Resultado Esperado

Ao final dos testes, você deve ter:

- [ ] Evolution API respondendo em http://localhost:8080
- [ ] Instâncias criadas e visíveis no banco
- [ ] QR Codes sendo gerados
- [ ] PgAdmin acessível e conectado
- [ ] Redis Commander mostrando dados
- [ ] Logs sem erros críticos

## 🐛 Se algo falhar

1. Ver logs: `docker-compose logs -f evolution-api`
2. Verificar containers: `docker-compose ps`
3. Reiniciar serviço: `docker-compose restart evolution-api`
4. Resetar tudo: `docker-compose down -v && docker-compose up -d`
