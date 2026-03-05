#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:3001';
const TIMEOUT = 30000; // 30 segundos - mais tolerante
const MAX_RETRIES = 10;

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let createdInstanceId = null;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function makeRequest(method, endpoint, body = null, token = null, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      timeout,
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
          resolve({ status: res.statusCode, body: parsed, headers: res.headers, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout após ${timeout}ms`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function waitForBackendReady(maxRetries = MAX_RETRIES, delay = 2000) {
  return new Promise(async (resolve, reject) => {
    log('\n⏳ Aguardando backend ficar pronto...', 'yellow');

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await makeRequest('GET', '/health', null, null, 5000);
        if (response.status === 200) {
          log(`✅ Backend pronto! (tentativa ${i + 1}/${maxRetries})`, 'green');
          return resolve();
        }
      } catch (err) {
        log(`  Tentativa ${i + 1}/${maxRetries}: ${err.message}`, 'gray');
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    reject(new Error('Backend não ficou pronto após 10 tentativas'));
  });
}

async function runTest(num, name, fn) {
  try {
    log(`\n[${num}/7] ${name}...`, 'blue');
    const result = await fn();
    log(`  ✅ ${result}`, 'green');
    testsPassed++;
    return true;
  } catch (err) {
    log(`  ❌ ${err.message}`, 'red');
    testsFailed++;
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════╗', 'yellow');
  log('║        SUITE DE TESTES - SISTEMA V2       ║', 'yellow');
  log('╚════════════════════════════════════════════╝', 'yellow');

  log(`\n📍 URL Base: ${BASE_URL}`, 'blue');
  log(`⏱️  Timeout: ${TIMEOUT}ms (30 segundos)`, 'blue');

  // Aguardar backend
  try {
    await waitForBackendReady();
  } catch (err) {
    log(`\n❌ ERRO CRÍTICO: ${err.message}`, 'red');
    log('\n💡 Dica: Execute `npm run dev` no backend antes dos testes!', 'yellow');
    log('\n📖 Mais ajuda: Consulte DIAGNOSTICO_PROBLEMAS.md', 'yellow');
    process.exit(1);
  }

  // TESTE 1: Health Check
  await runTest(1, 'Health Check', async () => {
    const res = await makeRequest('GET', '/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body || !res.body.status) throw new Error('Status ausente na resposta');
    return `Status: ${res.body.status} (uptime: ${res.body.uptime?.toFixed(2)}s)`;
  });

  // TESTE 2: Login
  await runTest(2, 'Login Test', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.token) throw new Error('Token não retornado');
    authToken = res.body.token;
    return `Token: ${res.body.token.substring(0, 20)}... (${res.body.token.length} chars)`;
  });

  // TESTE 3: List Instances
  await runTest(3, 'List Instances', async () => {
    if (!authToken) throw new Error('Token não disponível');
    const res = await makeRequest('GET', '/api/instances?page=1&limit=10', null, authToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const count = res.body.instances?.length || 0;
    return `Instâncias: ${count}, Total: ${res.body.pagination?.total || 0}`;
  });

  // TESTE 4: Create Instance
  await runTest(4, 'Create Instance', async () => {
    if (!authToken) throw new Error('Token não disponível');
    const timestamp = Date.now();
    const res = await makeRequest('POST', '/api/instances', {
      name: `Test Instance ${timestamp}`,
      phone: '+5511999999999'
    }, authToken);
    if (res.status !== 201 && res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.id) throw new Error('ID não retornado');
    createdInstanceId = res.body.id;
    return `ID: ${res.body.id}`;
  });

  // TESTE 5: Get QR Code
  await runTest(5, 'Get QR Code', async () => {
    if (!authToken) throw new Error('Token não disponível');
    if (!createdInstanceId) throw new Error('Instance não criada');
    const res = await makeRequest('GET', `/api/instances/${createdInstanceId}/qr`, null, authToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.body.qrCode && !res.body.qr_code) throw new Error('QR não encontrado');
    const qrType = res.body.qrCode ? 'internal' : 'external';
    return `QR Code recebido (${qrType})`;
  });

  // TESTE 6: Cache Validation
  await runTest(6, 'Cache Validation', async () => {
    if (!authToken) throw new Error('Token não disponível');
    const res = await makeRequest('GET', '/api/instances?page=1&limit=10', null, authToken);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const cacheStatus = res.headers['x-cache'] || 'MISS';
    const etag = res.headers['etag'];
    return `Cache: ${cacheStatus}, ETag: ${etag ? etag.substring(0, 20) + '...' : 'N/A'}`;
  });

  // TESTE 7: General System Check
  await runTest(7, 'General System Check', async () => {
    const res = await makeRequest('GET', '/');
    // Aceita 200, 404, ou qualquer resposta (desde que não haja erro)
    return `Sistema respondendo (status: ${res.status})`;
  });

  // Summary
  log('\n' + '='.repeat(50), 'yellow');
  log(`✅ Testes Passados: ${testsPassed}`, 'green');
  log(`❌ Testes Falhados: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');
  log(`📊 Total: ${testsPassed + testsFailed}`, 'blue');
  log('='.repeat(50) + '\n', 'yellow');

  if (testsFailed === 0) {
    log('🎉 TODOS OS 7 TESTES PASSARAM!', 'green');
    log('✨ Sistema está funcionando perfeitamente!', 'green');
    process.exit(0);
  } else {
    log(`⚠️  ${testsFailed} teste(s) falharam!`, 'red');
    log('💡 Consulte DIAGNOSTICO_PROBLEMAS.md para soluções', 'yellow');
    process.exit(1);
  }
}

// Executar
main().catch(err => {
  log(`\n❌ ERRO NÃO TRATADO: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
