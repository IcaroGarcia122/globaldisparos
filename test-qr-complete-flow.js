#!/usr/bin/env node

/**
 * Script completo de teste: Criar instância → Gerar QR Code → Validar
 */

const http = require('http');
const fs = require('fs');

const API_URL = 'http://localhost:3001';
const ADMIN_USER = {
  email: 'admin@gmail.com',
  password: 'vip2026'
};

let authToken = null;

// ===================================
// HELPERS
// ===================================

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================
// MAIN FLOW
// ===================================

async function runTests() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('🧪 TESTE COMPLETO DE QR CODE');
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Login como admin
    console.log('📝 [1/5] Fazendo login como admin...');
    const loginRes = await makeRequest('POST', '/api/auth/login', ADMIN_USER);
    
    if (loginRes.status !== 200 && loginRes.status !== 201) {
      console.error(`❌ Erro no login: ${loginRes.status}`);
      console.error(loginRes.body);
      process.exit(1);
    }

    authToken = loginRes.body?.token || loginRes.body?.data?.token;
    if (!authToken) {
      console.error('❌ Token não recebido do servidor');
      console.error('Resposta:', loginRes.body);
      process.exit(1);
    }
    
    console.log(`✅ Login bem-sucedido. Token: ${authToken.substring(0, 20)}...`);

    // 2. Criar instância
    console.log('\n🔧 [2/5] Criando instância WhatsApp...');
    const instanceName = `TEST_${Date.now()}`;
    const createRes = await makeRequest('POST', '/api/instances', {
      name: instanceName,
      accountAge: 30
    });

    if (createRes.status !== 200 && createRes.status !== 201) {
      console.error(`❌ Erro ao criar instância: ${createRes.status}`);
      console.error(createRes.body);
      process.exit(1);
    }

    const instanceId = createRes.body?.id || createRes.body?.data?.id;
    if (!instanceId) {
      console.error('❌ ID da instância não recebido');
      console.error('Resposta:', createRes.body);
      process.exit(1);
    }

    console.log(`✅ Instância criada com ID: ${instanceId}`);

    // 3. Aguardar um pouco para Evolution API processar
    console.log('\n⏳ [3/5] Aguardando 5 segundos para Evolution API processar...');
    await wait(5000);

    // 4. Obter QR Code
    console.log('\n📱 [4/5] Buscando QR Code...');
    const qrRes = await makeRequest('GET', `/api/instances/${instanceId}/qr`);

    if (qrRes.status !== 200) {
      console.error(`❌ Erro ao obter QR Code: ${qrRes.status}`);
      console.error('Headers:', qrRes.headers);
      console.error('Body:', qrRes.body);
      process.exit(1);
    }

    const qrCode = qrRes.body?.qrCode;
    const qrStatus = qrRes.body?.status;

    if (!qrCode && qrStatus !== 'connected') {
      console.error('❌ QR Code não foi retornado');
      console.error('Resposta completa:', JSON.stringify(qrRes.body, null, 2));
      process.exit(1);
    }

    if (qrStatus === 'connected') {
      console.log(`✅ WhatsApp já está conectado! (status: ${qrStatus})`);
    } else {
      console.log(`✅ QR Code obtido com sucesso!`);
      console.log(`   Tamanho: ${qrCode.length} caracteres`);
      console.log(`   Status: ${qrStatus}`);
      
      // Salvar QR Code como imagem
      if (qrCode.startsWith('data:image')) {
        const base64 = qrCode.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const fileName = `qr_${instanceId}_${Date.now()}.png`;
        fs.writeFileSync(fileName, buffer);
        console.log(`   📄 Salvo como: ${fileName}`);
      }
    }

    // 5. Validar estrutura da resposta
    console.log('\n✔️  [5/5] Validando resposta...');
    
    const validations = [
      { name: 'Status HTTP 200', pass: qrRes.status === 200 },
      { name: 'QRCode ou status connected', pass: !!qrCode || qrStatus === 'connected' },
      { name: 'Status definido', pass: !!qrStatus },
    ];

    let allPass = true;
    for (const validation of validations) {
      const icon = validation.pass ? '✅' : '❌';
      console.log(`   ${icon} ${validation.name}`);
      if (!validation.pass) allPass = false;
    }

    console.log(`\n${'='.repeat(80)}`);
    if (allPass) {
      console.log('✅ TODOS OS TESTES PASSARAM!');
      console.log(`\nResumo:`);
      console.log(`  ID da Instância: ${instanceId}`);
      console.log(`  Status: ${qrStatus}`);
      console.log(`  API Backend: http://localhost:3001 ✅`);
      console.log(`  Authentication: Bearer ${authToken.substring(0, 10)}... ✅`);
    } else {
      console.log('❌ ALGUNS TESTES FALHARAM');
      process.exit(1);
    }
    console.log(`${'='.repeat(80)}\n`);

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runTests();
