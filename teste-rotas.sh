#!/bin/bash
# teste-rotas.sh - Script para testar rotas do backend

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🧪 TESTE DE CONECTIVIDADE E ROTAS                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

BACKEND_URL="http://localhost:3001"
API_URL="$BACKEND_URL/api"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Verificando se backend está rodando...${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend respondendo em http://localhost:3001${NC}"
else
    echo -e "${RED}❌ Backend NÃO está rodando em http://localhost:3001${NC}"
    echo -e "${YELLOW}Inicie com: cd backend && npm run dev${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}2. Fazendo login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"vip2026"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Erro ao fazer login${NC}"
    echo "Resposta: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Login bem-sucedido${NC}"
echo -e "${YELLOW}Token: ${TOKEN:0:20}...${NC}"

echo ""
echo -e "${BLUE}3. Listando instâncias...${NC}"
INSTANCES=$(curl -s -X GET "$API_URL/instances" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Resposta recebida${NC}"
echo "Instâncias: $INSTANCES"

INSTANCE_ID=$(echo $INSTANCES | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$INSTANCE_ID" ]; then
    echo -e "${YELLOW}⚠️  Nenhuma instância encontrada, criando...${NC}"
    
    CREATE_RESPONSE=$(curl -s -X POST "$API_URL/instances" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"test_$(date +%s)\",\"accountAge\":30}")
    
    INSTANCE_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
    echo -e "${GREEN}✅ Instância criada: ID $INSTANCE_ID${NC}"
fi

echo ""
echo -e "${BLUE}4. Testando GET /instances/:id/qr${NC}"
QR_RESPONSE=$(curl -s -X GET "$API_URL/instances/$INSTANCE_ID/qr" \
  -H "Authorization: Bearer $TOKEN")

echo -e "${GREEN}✅ Resposta recebida${NC}"
echo "QR Response: ${QR_RESPONSE:0:100}..."

echo ""
echo -e "${BLUE}5. Testando POST /instances/:id/connect${NC}"
CONNECT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/instances/$INSTANCE_ID/connect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$CONNECT_RESPONSE" | tail -n 1)
BODY=$(echo "$CONNECT_RESPONSE" | head -n -1)

echo -e "${YELLOW}HTTP Status: $HTTP_CODE${NC}"
echo "Response: $BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ POST /connect funcionando!${NC}"
elif [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ ERRO 404 - Instância não encontrada!${NC}"
    echo "  - Instance ID: $INSTANCE_ID"
    echo "  - URL tentada: $API_URL/instances/$INSTANCE_ID/connect"
elif [ "$HTTP_CODE" = "403" ]; then
    echo -e "${RED}❌ ERRO 403 - Acesso negado${NC}"
elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${RED}❌ ERRO 500 - Erro interno do servidor${NC}"
else
    echo -e "${RED}❌ ERRO $HTTP_CODE${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Teste concluído!${NC}"
echo ""
