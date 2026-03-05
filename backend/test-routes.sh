#!/bin/bash

echo "================================"
echo "TESTE DO BACKEND WHATSAPP API"
echo "================================"

cd /c/Users/Icaro\ Garcia/Documents/globaldisparos/backend

echo ""
echo "[1] Verificando Node..."
node --version

echo ""
echo "[2] Testando /health..."
curl -s -w "\nStatus: %{http_code}\n" http://localhost:3001/health

echo ""
echo "[3] Testando Login..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"vip2026"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Erro ao fazer login"
  exit 1
fi

echo "Token obtido: ${TOKEN:0:20}..."

echo ""
echo "[4] Listando instâncias..."
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/instances | python -m json.tool 2>/dev/null | head -20

echo ""
echo "[5] Obtendo instância..."
INSTANCE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/instances | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$INSTANCE_ID" ]; then
  echo "Erro ao obter ID da instância"
  exit 1
fi

echo "Instance ID: $INSTANCE_ID"

echo ""
echo "[6] Testando POST /instances/$INSTANCE_ID/connect..."
curl -s -w "\nStatus: %{http_code}\n" -X POST http://localhost:3001/api/instances/$INSTANCE_ID/connect \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "================================"
echo "TESTE COMPLETO"
echo "================================"
