#!/usr/bin/env node

const http = require('http');
const querystring = require('querystring');

function doRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body.length > 0 ? JSON.parse(body) : body,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function main() {
  try {
    console.log('\n📝 Teste de Socket.IO e QR Code\n');

    // 1. Login
    console.log('[1] Fazendo login...');
    const loginRes = await doRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    
    if (loginRes.statusCode !== 200) {
      console.log(`❌ Login falhou: ${loginRes.statusCode}`);
      return;
    }
    
    const token = loginRes.body.token;
    console.log(`✅ Login bem-sucedido`);
    console.log(`   Token: ${token?.substring(0, 50)}...`);

    // 2. Criar instância
    console.log('\n[2] Criando instância...');
    const createRes = await doRequest('POST', '/api/instances', {
      name: 'Test QR',
      accountAge: 30
    }, token);
    
    if (createRes.statusCode !== 201) {
      console.log(`❌ Criação falhou: ${createRes.statusCode}`);
      console.log(` Error: ${JSON.stringify(createRes.body)}`);
      return;
    }
    
    const instanceId = createRes.body.id;
    console.log(`✅ Instância criada: ID ${instanceId}`);

    // 3. Testar Socket.IO endpoint
    console.log('\n[3] Testando Socket.IO endpoint...');
    const socketRes = await doRequest('GET', '/socket.io/?EIO=4&transport=polling');
    console.log(`✅ Socket.IO responding: ${socketRes.statusCode}`);
    console.log(`   Response bytes: ${socketRes.body.length || 0}`);
    console.log(`   Body: ${socketRes.body.substring(0, 100)}...`);

    // 4. Iniciar conexão WhatsApp
    console.log('\n[4] Inicializando conexão WhatsApp...');
    const connectRes = await doRequest('POST', `/api/instances/${instanceId}/connect`, {}, token);
    
    if (connectRes.statusCode !== 200) {
      console.log(`⚠️ Connect falhou: ${connectRes.statusCode}`);
      console.log(` Response: ${JSON.stringify(connectRes.body)}`);
    } else {
      console.log(`✅ Conexão inicializada`);
      console.log(`   Message: ${connectRes.body.message}`);
    }

    console.log('\n✅ Teste concluído!');
    console.log('📝 Verifique o console do navegador (frontend) para Socket.IO logs');
    console.log('📝 Logs devem mostrar "QR Code recebido via WebSocket"');

  } catch (error) {
    console.error(`❌ Erro:`, error.message);
  }
}

main();
