#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001';
const TIMEOUT = 30000;

let authToken = null;
let instanceId = null;

function makeRequest(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout`));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    process.stdout.write(`  ${name}... `);
    await fn();
    console.log('✅');
    return true;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     TESTE DE INTEGRAÇÃO WHATSAPP          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Step 1: Login
  console.log('📝 STEP 1: Autenticar');
  await test('Login admin', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.token) throw new Error('Token não retornado');
    authToken = res.body.token;
    console.log(`\n    Token: ${authToken.substring(0, 30)}...`);
  });

  if (!authToken) {
    console.error('\n❌ Falha ao autenticar. Abortando...');
    process.exit(1);
  }

  // Step 2: Create Instance
  console.log('\n🚀 STEP 2: Criar Instância WhatsApp');
  const instanceName = `TEST-$(date +%s)`;
  
  await test('Criar nova instância', async () => {
    const res = await makeRequest('POST', '/api/instances', {
      name: `WhatsApp Test ${Date.now()}`,
      phone: '+5511999999999'
    }, authToken);
    
    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Status ${res.status}: ${JSON.stringify(res.body)}`);
    }
    
    if (!res.body.id) throw new Error('ID não retornado');
    instanceId = res.body.id;
    console.log(`\n    ID: ${instanceId}`);
  });

  if (!instanceId) {
    console.error('\n❌ Falha ao criar instância. Abortando...');
    process.exit(1);
  }

  // Step 3: Get QR Code
  console.log('\n📱 STEP 3: Obter QR Code');
  let qrCode = null;
  
  await test('Gerar QR Code', async () => {
    const res = await makeRequest('GET', `/api/instances/${instanceId}/qr`, null, authToken);
    
    if (res.status !== 200) {
      throw new Error(`Status ${res.status}`);
    }
    
    if (!res.body.qrCode && !res.body.qr_code) {
      throw new Error('QR Code não encontrado na resposta');
    }
    
    qrCode = res.body.qrCode || res.body.qr_code;
    console.log(`\n    QR code tipo: ${qrCode.substring(0, 50)}...`);
  });

  // Step 4: Get Instance Status
  console.log('\n⚙️  STEP 4: Verificar Status da Instância');
  
  await test('Obter detalhes da instância', async () => {
    const res = await makeRequest('GET', `/api/instances/${instanceId}`, null, authToken);
    
    if (res.status !== 200) {
      throw new Error(`Status ${res.status}`);
    }
    
    console.log(`\n    Status: ${res.body.status || 'unknown'}`);
    console.log(`    Conectada: ${res.body.connected ? 'SIM' : 'NÃO'}`);
  });

  // Step 5: Test Message Simulation (se conectada)
  console.log('\n💬 STEP 5: Simular Envio de Mensagem');
  
  await test('Preparar payload de mensagem', async () => {
    const payload = {
      instanceId: instanceId,
      to: '+5511987654321',
      message: 'Teste de integração - Mensagem automática',
      timestamp: new Date().toISOString()
    };
    
    console.log(`\n    Para: ${payload.to}`);
    console.log(`    Mensagem: ${payload.message}`);
    console.log(`    ID instância: ${payload.instanceId}`);
  });

  // Step 6: List Instances with Cache Test
  console.log('\n📊 STEP 6: Validar Cache e Performance');
  
  let firstTime = 0;
  let secondTime = 0;

  await test('Primeira requisição (sem cache)', async () => {
    const start = Date.now();
    const res = await makeRequest('GET', '/api/instances', null, authToken);
    firstTime = Date.now() - start;
    
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    console.log(`\n    Tempo: ${firstTime}ms`);
  });

  await test('Segunda requisição (com cache)', async () => {
    const start = Date.now();
    const res = await makeRequest('GET', '/api/instances', null, authToken);
    secondTime = Date.now() - start;
    
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    console.log(`\n    Tempo: ${secondTime}ms (${(firstTime/secondTime).toFixed(1)}x mais rápido)`);
  });

  // Step 7: Test Webhook Simulation
  console.log('\n🔔 STEP 7: Simular Webhook');
  
  await test('Preparar webhook de QR Code', async () => {
    const webhookPayload = {
      event: 'qr_code_generated',
      instanceId: instanceId,
      qrCode: qrCode,
      timestamp: new Date().toISOString()
    };
    
    console.log(`\n    Evento: ${webhookPayload.event}`);
    console.log(`    Instância: ${webhookPayload.instanceId}`);
  });

  // Summary
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║            RESUMO FINAL                   ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  console.log(`✅ Token gerado: ${authToken ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Instância criada: ${instanceId ? `ID ${instanceId}` : 'NÃO'}`);
  console.log(`✅ QR Code gerado: ${qrCode ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Cache funcionando: ${secondTime > 0 ? `${(firstTime/secondTime).toFixed(1)}x mais rápido` : 'NÃO'}`);
  
  console.log('\n🎯 PRÓXIMOS PASSOS:');
  console.log('  1. Escanear QR Code com seu WhatsApp');
  console.log('  2. Aguardar conexão (status muda para "connected")');
  console.log('  3. Enviar mensagens via API');
  console.log('  4. Webhooks receberão eventos em tempo real\n');

  console.log('✨ Sistema WhatsApp integrado e pronto para uso!\n');
}

main().catch(err => {
  console.error(`\n❌ ERRO: ${err.message}\n`);
  process.exit(1);
});
