/**
 * Script de DEBUG - Execute no console do navegador
 * 
 * Cmd+J (Mac) ou F12 (Windows) -> Abrir DevTools
 * Ir para "Console" tab
 * Colar este script inteiro e apertar Enter
 */

(async function debugInstances() {
  console.log('🔍 Iniciando diagnóstico de instâncias...\n');

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Token não encontrado! Você precisa estar logado.');
    return;
  }

  const baseUrl = 'http://localhost:3001/api';
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // ==========================================
    // 1. Ver TODAS as instâncias
    // ==========================================
    console.log('📋 Buscando todas as instâncias...\n');
    
    const res = await fetch(`${baseUrl}/instances/debug/all`, { 
      method: 'GET', 
      headers 
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    console.log('✅ DIAGNÓSTICO DE INSTÂNCIAS:');
    console.log(`   Plano: ${data.plan}`);
    console.log(`   Ativas: ${data.summary.active}`);
    console.log(`   Inativas: ${data.summary.inactive}`);
    console.log(`   Total: ${data.summary.total}\n`);

    console.log('📊 Detalhes das instâncias:');
    if (data.instances.length === 0) {
      console.log('   ℹ️ Nenhuma instância encontrada');
    } else {
      data.instances.forEach(inst => {
        const status = inst.isActive ? '✅ ATIVA' : '⏸️ INATIVA';
        console.log(`   [${status}] ID: ${inst.id}, Nome: "${inst.name}", Status: ${inst.status}`);
        if (inst.createdAt) console.log(`       Criada: ${new Date(inst.createdAt).toLocaleString()}`);
      });
    }

    // ==========================================
    // 2. Oferecer limpeza
    // ==========================================
    console.log('\n⚠️ OPÇÕES DE LIMPEZA:');
    
    if (data.summary.inactive > 0) {
      console.log(`\n1️⃣ Deletar instâncias inativas (${data.summary.inactive}):`);
      console.log('   debugInstances.cleanupInactive()');
    }

    if (data.summary.total > 0) {
      console.log('\n2️⃣ Deletar TODAS as instâncias (⚠️ Cuidado!)');
      console.log('   debugInstances.forceCleanupAll()');
    }

    // Adicionar funções globais para limpeza
    window.debugInstances = {
      cleanupInactive: async function() {
        if (confirm('Deletar todas as instâncias inativas?')) {
          const res = await fetch(`${baseUrl}/instances/debug/cleanup-inactive`, { 
            method: 'DELETE', 
            headers 
          });
          const result = await res.json();
          console.log('✅', result.message);
          console.log('   Recarregue a página (Ctrl+Shift+R)');
        }
      },

      forceCleanupAll: async function() {
        if (confirm('⚠️ DELETAR TODAS as instâncias? Isto NÃO pode ser desfeito!')) {
          if (confirm('Tem CERTEZA? Isto é irreversível!')) {
            const res = await fetch(`${baseUrl}/instances/debug/force-cleanup-all`, { 
              method: 'DELETE', 
              headers 
            });
            const result = await res.json();
            console.log('🔥', result.message);
            console.log(`   ${result.deletedCount} instâncias deletadas`);
            console.log('   Recarregue a página (Ctrl+Shift+R)');
          }
        }
      }
    };

    console.log('\n✅ Diagnóstico completo!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\nVerifique:');
    console.log('  - Se o backend está rodando (port 3001)');
    console.log('  - Se o token é válido');
    console.log('  - Se você está autenticado');
  }
})();
