# 🧪 Script de Instalação de Dependências de Teste (Windows)
# Executar com: powershell -ExecutionPolicy Bypass -File install-test-deps.ps1

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🧪 Instalando Dependências de Teste" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está no diretório backend
if (!(Test-Path "package.json")) {
  Write-Host "❌ Erro: Execute este script no diretório backend/" -ForegroundColor Red
  exit 1
}

Write-Host "📦 Detectando gerenciador de pacotes..." -ForegroundColor Yellow

# Detectar gerenciador
$PM = "npm"
$INSTALL_CMD = "npm install --save-dev"

if (Test-Path "bun.lockb") {
  $PM = "bun"
  $INSTALL_CMD = "bun add -d"
  Write-Host "✅ Detectado: Bun" -ForegroundColor Green
} elseif (Test-Path "pnpm-lock.yaml") {
  $PM = "pnpm"
  $INSTALL_CMD = "pnpm add -D"
  Write-Host "✅ Detectado: pnpm" -ForegroundColor Green
} elseif (Test-Path "yarn.lock") {
  $PM = "yarn"
  $INSTALL_CMD = "yarn add -D"
  Write-Host "✅ Detectado: Yarn" -ForegroundColor Green
} else {
  Write-Host "✅ Detectado: npm" -ForegroundColor Green
}

Write-Host ""
Write-Host "📥 Instalando dependências..." -ForegroundColor Yellow
Write-Host ""

# Dependências de teste
$DEPS = @(
  "vitest@latest",
  "@vitest/ui@latest",
  "supertest@latest",
  "@types/supertest@latest",
  "@testing-library/node@latest",
  "ts-mockito@latest"
)

Write-Host "Pacotes a instalar:" -ForegroundColor Yellow
foreach ($dep in $DEPS) {
  Write-Host "  • $dep" -ForegroundColor Gray
}

Write-Host ""

# Instalar
$cmd = "$INSTALL_CMD $($DEPS -join ' ')"
Write-Host "Executando: $cmd" -ForegroundColor Gray
Invoke-Expression $cmd

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "✅ Dependências instaladas com sucesso!" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "❌ Erro na instalação!" -ForegroundColor Red
  exit 1
}

# Criar pastas se não existirem
Write-Host ""
Write-Host "📁 Criando diretórios..." -ForegroundColor Yellow

if (!(Test-Path "src\__tests__")) {
  New-Item -ItemType Directory -Path "src\__tests__\fixtures" -Force | Out-Null
  Write-Host "✅ Criado: src\__tests__\" -ForegroundColor Green
}

if (!(Test-Path "src\routes\__tests__")) {
  New-Item -ItemType Directory -Path "src\routes\__tests__" -Force | Out-Null
  Write-Host "✅ Criado: src\routes\__tests__\" -ForegroundColor Green
}

# Verificar se vitest.config.ts existe
Write-Host ""
Write-Host "🔧 Verificando configurações..." -ForegroundColor Yellow

if (!(Test-Path "vitest.config.ts")) {
  Write-Host "⚠️  Arquivo vitest.config.ts não encontrado" -ForegroundColor Yellow
  Write-Host "   Copie do exemplo: PADRAO_TESTES.md" -ForegroundColor Gray
} else {
  Write-Host "✅ vitest.config.ts encontrado" -ForegroundColor Green
}

if (!(Test-Path ".env.test")) {
  Write-Host "⚠️  Arquivo .env.test não encontrado" -ForegroundColor Yellow
  Write-Host "   Crie um baseado em .env" -ForegroundColor Gray
} else {
  Write-Host "✅ .env.test encontrado" -ForegroundColor Green
}

# Mostrar info sobre package.json
if ($PM -eq "npm") {
  Write-Host ""
  Write-Host "📝 Verifique se estas linhas estão em package.json under 'scripts':" -ForegroundColor Yellow
  Write-Host '  "test": "vitest",' -ForegroundColor Gray
  Write-Host '  "test:ui": "vitest --ui",' -ForegroundColor Gray
  Write-Host '  "test:watch": "vitest --watch",' -ForegroundColor Gray
  Write-Host '  "test:coverage": "vitest --coverage",' -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Setup de testes concluído!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "🚀 Próximos passos:" -ForegroundColor Cyan
Write-Host "  1. Configure .env.test com variáveis de teste" -ForegroundColor Gray
Write-Host "  2. Configure vitest.config.ts com paths corretos" -ForegroundColor Gray
Write-Host "  3. Rode: npm test" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Documentação:" -ForegroundColor Cyan
Write-Host "  • GUIA_TESTES_COMPLETO.md - Guia completo de testes" -ForegroundColor Gray
Write-Host "  • PADRAO_TESTES.md - Padrões e estrutura" -ForegroundColor Gray
Write-Host "  • TROUBLESHOOTING_HTTP500.md - Debug de erros" -ForegroundColor Gray
Write-Host ""
