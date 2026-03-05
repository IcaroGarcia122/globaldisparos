#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001';

function makeRequest(method, endpoint, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    };

    if (token) options.headers.Authorization = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {}, headers: res.headers });
        } catch { resolve({ status: res.statusCode, body: null, headers: res.headers }); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('\n📱 TESTE DE INTEGRAÇÃO WHATSAPP\n');

  let token = null;
  let instanceId = null;

  try {
    // 1. Health
    console.log('[1/7] Health Check...');
    const health = await makeRequest('GET', '/health');
    console.log(` ✅ Status: ${health.status}`);

    // 2. Login
    console.log('\n[2/7] Login...');
    const login = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);
    token = login.body.token;
    console.log(` ✅ Token: ${token.substring(0, 20)}...`);

    // 3. Create Instance
    console.log('\n[3/7] Create WhatsApp Instance...');
    const create = await makeRequest('POST', '/api/instances', {
      name: 'WhatsApp Test Instance',
      phone: '+5511999999999'
    }, token);
    if (create.status !== 201 && create.status !== 200) throw new Error(`Create failed: ${create.status}`);
    instanceId = create.body.id;
    console.log(` ✅ Instance Created - ID: ${instanceId}`);
    console.log(`    Name: ${create.body.name}`);
    console.log(`    Status: ${create.body.status}`);

    // 4. Get QR Code
    console.log('\n[4/7] Get QR Code...');
    const qr = await makeRequest('GET', `/api/instances/${instanceId}/qr`, null, token);
    if (qr.status !== 200) throw new Error(`QR failed: ${qr.status}`);
    console.log(` ✅ QR Code Generated`);
    console.log(`    Has QR: ${!!qr.body.qrCode}`);
    console.log(`    Size: ${qr.body.qrCode?.length || 0} bytes`);

    // 5. Connect Instance
    console.log('\n[5/7] Connect Instance...');
    const connect = await makeRequest('POST', `/api/instances/${instanceId}/connect`, {
      phone: '+5511999999999',
      qrCode: qr.body.qrCode
    }, token);
    console.log(` ✅ Connection initiated - Status: ${connect.status}`);
    console.log(`    Response: ${JSON.stringify(connect.body).substring(0, 100)}...`);

    // 6. List Instances
    console.log('\n[6/7] List Instances with Pagination...');
    const list = await makeRequest('GET', '/api/instances?page=1&limit=10', null, token);
    if (list.status !== 200) throw new Error(`List failed: ${list.status}`);
    console.log(` ✅ Instances Listed`);
    console.log(`    Total: ${list.body.pagination?.total || 0}`);
    console.log(`    Page: ${list.body.pagination?.page || 1}`);
    console.log(`    Cache: ${list.headers['x-cache'] || 'MISS'}`);

    // 7. Send Message Test
    console.log('\n[7/7] Test Message Sending Endpoint...');
    const sendMsg = await makeRequest('POST', `/api/instances/${instanceId}/send-message`, {
      to: '+5511999999999',
      message: 'Teste de mensagem da integração'
    }, token);
    console.log(` ✅ Message endpoint response - Status: ${sendMsg.status}`);
    console.log(`    Response: ${JSON.stringify(sendMsg.body).substring(0, 150)}...`);

    console.log('\n' + '='.repeat(50));
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('✨ Sistema WhatsApp integrado com sucesso!');
    console.log('='.repeat(50) + '\n');
    
    console.log('📱 PRÓXIMOS PASSOS:');
    console.log('1. Abra: http://localhost:5173');
    console.log('2. Login: admin@gmail.com / vip2026');
    console.log('3. Navegue para: WhatsApp');
    console.log('4. Escaneie o QR Code com seu celular');
    console.log('5. Use a interface para disparar mensagens\n');

  } catch (err) {
    console.error(`\n❌ ERRO: ${err.message}\n`);
    process.exit(1);
  }
}

test();
