# Script para DEBUG de instâncias WhatsApp
# Requer token JWT válido

# ==========================================
# Configuração
# ==========================================
$token = Read-Host "Cole seu token JWT (localStorage.getItem('token'))"
$baseUrl = "http://localhost:3001/api"

if (-not $token) {
    Write-Host "❌ Token não fornecido!" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Iniciando diagnóstico de instâncias..." -ForegroundColor Cyan

# ==========================================
# 1. Ver TODAS as instâncias
# ==========================================
Write-Host "`n📋 Buscando todas as instâncias..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/instances/debug/all" -Method Get -Headers $headers
    
    Write-Host "✅ Instâncias encontradas:" -ForegroundColor Green
    Write-Host "   Plano: $($response.plan)"
    Write-Host "   Ativas: $($response.summary.active)"
    Write-Host "   Inativas: $($response.summary.inactive)"
    Write-Host "   Total: $($response.summary.total)"
    
    Write-Host "`n📊 Detalhes:" -ForegroundColor Cyan
    $response.instances | ForEach-Object {
        $status = if ($_.isActive) { "✅ ATIVA" } else { "⏸️ INATIVA" }
        Write-Host "   [$status] ID: $($_.id), Nome: $($_.name), Status: $($_.status)"
    }
    
    # ==========================================
    # 2. Oferecer limpeza se houver inativas
    # ==========================================
    if ($response.summary.inactive -gt 0) {
        Write-Host "`n⚠️ Encontradas $($response.summary.inactive) instâncias inativas!" -ForegroundColor Yellow
        $cleanup = Read-Host "Deseja deletar instâncias inativas? (s/n)"
        
        if ($cleanup -eq "s") {
            Write-Host "🧹 Deletando instâncias inativas..." -ForegroundColor Yellow
            
            $cleanupResponse = Invoke-RestMethod -Uri "$baseUrl/instances/debug/cleanup-inactive" -Method Delete -Headers $headers
            Write-Host "✅ $($cleanupResponse.message)" -ForegroundColor Green
        }
    }
    
    # ==========================================
    # 3. Oferecer limpeza completa
    # ==========================================
    if ($response.summary.total -gt 0) {
        Write-Host "`n⚠️ OPÇÃO DE LIMPEZA COMPLETA:" -ForegroundColor Yellow
        Write-Host "   Isto deletará TODAS as instâncias (ativas e inativas)"
        $forceCleanup = Read-Host "Deseja fazer limpeza COMPLETA? (s para sim, qualquer outra coisa para não)"
        
        if ($forceCleanup -eq "s") {
            Write-Host "⚠️ CONFIRMAÇÃO FINAL!" -ForegroundColor Red
            Write-Host "   Isto NÃO pode ser desfeito!"
            $confirm = Read-Host "Digite 'SIM' para confirmar"
            
            if ($confirm -eq "SIM") {
                Write-Host "🔥 Deletando TODAS as instâncias..." -ForegroundColor Red
                
                $forceResponse = Invoke-RestMethod -Uri "$baseUrl/instances/debug/force-cleanup-all" -Method Delete -Headers $headers
                Write-Host "✅ $($forceResponse.message)" -ForegroundColor Green
                Write-Host "✅ $($forceResponse.deletedCount) instâncias deletadas" -ForegroundColor Green
            } else {
                Write-Host "❌ Confirmação não recebida. Operação cancelada." -ForegroundColor Yellow
            }
        }
    }
    
    Write-Host "`n✅ Diagnóstico completo!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Verifique:" -ForegroundColor Yellow
    Write-Host "  - Se o backend está rodando (port 3001)"
    Write-Host "  - Se o token é válido"
    Write-Host "  - Se você está autenticado"
}

Write-Host "`n💡 Após limpeza, recarregue o navegador (Ctrl+Shift+R)" -ForegroundColor Cyan
