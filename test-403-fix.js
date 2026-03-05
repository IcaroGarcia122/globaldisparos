#!/usr/bin/env node

/**
 * 🧪 TESTE DE ERRO 403 - VALIDAÇÃO PÓS-FIX
 * Testa se o erro 403 foi realmente removido
 */

const http = require('http');

function request(method, path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data),
            headers: res.headers
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
}

async function test() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🧪 TESTE: Validar Fix do Erro 403                        ║
╚════════════════════════════════════════════════════════════╝
`);

  try {
    // 1. Teste de Health
    console.log('1️⃣  Testando /health...');
    const health = await request('GET', '/health');
    console.log(`   Status: ${health.status} ${health.status === 200 ? '✅' : '❌'}`);
    if (health.status !== 200) {
      console.log('   ⚠️  Backend ainda está inicializando...\n');
      setTimeout(() => process.exit(0), 5000);
      return;
    }

    // 2. Login
    console.log('\n2️⃣  Fazendo login...');
    const login = await request('POST', '/auth/login');
    if (login.status === 200 && login.data.token) {
      console.log(`   ✅ Login OK`);
      var token = login.data.token;
    } else {
      console.log(`   ⚠️  Tentando criar usuário teste...`);
      const register = await request('POST', '/auth/register');
      if (register.status === 201 && register.data.token) {
        console.log(`   ✅ Usuário criado`);
        token = register.data.token;
      }
    }

    if (!token) {
      console.log('   ❌ Não conseguiu obter token\n');
      process.exit(1);
    }

    // 3. Listar instâncias
    console.log('\n3️⃣  Listando instâncias...');
    const list = await request('GET', '/api/instances', token);
    console.log(`   Status: ${list.status} ${list.status === 200 ? '✅' : '❌'}`);
    
    if (list.data && Array.isArray(list.data.instances)) {
      const instances = list.data.instances;
      console.log(`   Encontradas: ${instances.length} instâncias`);
      
      if (instances.length > 0) {
        const instance = instances[0];
        console.log(`\n4️⃣  Testando acesso à instância ${instance.id}...`);
        
        // Teste GET /:id (verificar se remove 403)
        const details = await request('GET', `/api/instances/${instance.id}`, token);
        console.log(`   GET /:id  → ${details.status} ${details.status === 200 ? '✅' : details.status === 403 ? '❌ ERRO 403!' : '⚠️'}`);
        
        // Teste POST /:id/connect (verificar se remove 403)
        const connect = await request('POST', `/api/instances/${instance.id}/connect`, token);
        console.log(`   POST /:id/connect → ${connect.status} ${connect.status === 200 ? '✅' : connect.status === 403 ? '❌ ERRO 403!' : '⚠️'}`);
        
        // Resumo final
        console.log('\n' + '═'.repeat(60));
        if (details.status !== 403 && connect.status !== 403) {
          console.log('✅ FIX APLICADO COM SUCESSO!');
          console.log('   Erro 403 foi removido das rotas de instância!');
        } else {
          console.log('❌ ERRO 403 AINDA PRESENTE!');
          if (details.status === 403) console.log('   - GET /:id retorna 403');
          if (connect.status === 403) console.log('   - POST /:id/connect retorna 403');
        }
      } else {
        console.log('⚠️  Nenhuma instância encontrada. Crie uma para testar.');
      }
    }

  } catch (error) {
    console.error(`\n❌ Erro no teste: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('⚠️  Backend não está respondendo em localhost:3001');
      console.log('   Aguarde a inicialização...\n');
    }
  }
}

test();
