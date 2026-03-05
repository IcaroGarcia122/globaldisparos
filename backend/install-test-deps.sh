#!/bin/bash

# 🧪 Script de Instalação de Dependências de Teste
# Executar com: bash install-test-deps.sh

echo "================================================"
echo "🧪 Instalando Dependências de Teste"
echo "================================================"

# Verificar se está no diretório backend
if [ ! -f "package.json" ]; then
  echo "❌ Erro: Execute este script no diretório backend/"
  exit 1
fi

echo ""
echo "📦 Detectando gerenciador de pacotes..."

# Detectar gerenciador
if [ -f "bun.lockb" ]; then
  PM="bun"
  INSTALL_CMD="bun add -d"
  echo "✅ Detectado: Bun"
elif [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
  INSTALL_CMD="pnpm add -D"
  echo "✅ Detectado: pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
  INSTALL_CMD="yarn add -D"
  echo "✅ Detectado: Yarn"
else
  PM="npm"
  INSTALL_CMD="npm install --save-dev"
  echo "✅ Detectado: npm"
fi

echo ""
echo "📥 Instalando dependências..."
echo ""

# Dependências de teste
DEPS=(
  "vitest@latest"
  "@vitest/ui@latest"
  "supertest@latest"
  "@types/supertest@latest"
  "@testing-library/node@latest"
  "ts-mockito@latest"
)

echo "Pacotes a instalar:"
for dep in "${DEPS[@]}"; do
  echo "  • $dep"
done

echo ""

# Instalar
$INSTALL_CMD "${DEPS[@]}"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Dependências instaladas com sucesso!"
else
  echo ""
  echo "❌ Erro na instalação!"
  exit 1
fi

# Criar pastas se não existirem
echo ""
echo "📁 Criando diretórios..."

if [ ! -d "src/__tests__" ]; then
  mkdir -p src/__tests__/fixtures
  echo "✅ Criado: src/__tests__/"
fi

if [ ! -d "src/routes/__tests__" ]; then
  mkdir -p src/routes/__tests__
  echo "✅ Criado: src/routes/__tests__/"
fi

# Verificar se vitest.config.ts existe
echo ""
echo "🔧 Verificando configurações..."

if [ ! -f "vitest.config.ts" ]; then
  echo "⚠️  Arquivo vitest.config.ts não encontrado"
  echo "   Copie do exemplo: PADRAO_TESTES.md"
else
  echo "✅ vitest.config.ts encontrado"
fi

if [ ! -f ".env.test" ]; then
  echo "⚠️  Arquivo .env.test não encontrado"
  echo "   Crie um baseado em .env"
else
  echo "✅ .env.test encontrado"
fi

# Adicionar/atualizar scripts no package.json se usarem npm
if [ "$PM" = "npm" ]; then
  echo ""
  echo "📝 Verifique se estas linhas estão em package.json:"
  echo '  "test": "vitest",'
  echo '  "test:ui": "vitest --ui",'
  echo '  "test:watch": "vitest --watch",'
  echo '  "test:coverage": "vitest --coverage",'
fi

echo ""
echo "================================================"
echo "✅ Setup de testes concluído!"
echo "================================================"
echo ""
echo "🚀 Próximos passos:"
echo "  1. Configure .env.test com variáveis de teste"
echo "  2. Configure vitest.config.ts com paths corretos"
echo "  3. Rode: npm test"
echo ""
echo "📚 Documentação:"
echo "  • GUIA_TESTES_COMPLETO.md - Guia completo de testes"
echo "  • PADRAO_TESTES.md - Padrões e estrutura"
echo "  • TROUBLESHOOTING_HTTP500.md - Debug de erros"
echo ""
