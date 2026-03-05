#!/bin/bash

echo "📋 CHECKLIST DE VALIDAÇÃO"
echo "=========================="
echo ""

echo "1. Verificando Backend na porta 3001..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
  echo "   ✅ Backend respondendo (porta 3001)"
else
  echo "   ❌ Backend não respondendo"
fi

echo ""
echo "2. Verificando Frontend na porta 8080..."
if curl -s http://localhost:8080 > /dev/null 2>&1; then
  echo "   ✅ Frontend respondendo (porta 8080)"
else
  echo "   ❌ Frontend não respondendo"
fi

echo ""
echo "3. Verificando endpoints da API..."
curl -s http://localhost:3001/api 2>&1 | head -1
echo "   ℹ️  API em: http://localhost:3001/api"

echo ""
echo "✅ Sistema pronto para testes!"
echo ""
echo "Para testar:"
echo "1. Acesse http://localhost:8080 no navegador"
echo "2. Faça login"
echo "3. Clique em 'Conectar WhatsApp'"
echo "4. Crie até 3 instâncias"
echo "5. Tente criar a 4ª (deve ser rejeitada)"
