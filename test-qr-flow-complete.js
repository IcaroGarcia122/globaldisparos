#!/usr/bin/env node

/**
 * 🧪 TESTE COMPLETO DE FLUXO QR CODE
 * Simula o fluxo: Login → Criar Instância → Gerar QR Code
 */

const http = require('http');
const BASE_URL = 'http://localhost:3001';

// Cores ANSI para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(prefix, msg, color = 'reset') {
  console.log(`${colors[color]}${prefix}${colors.reset} ${msg}`);
}

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };

    log('→', `${method} ${path}`, 'cyan');

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  log('🚀', 'INICIANDO TESTES DE QR CODE', 'blue');
  log('➜', `Base URL: ${BASE_URL}`, 'cyan');

  let token = null;
  let instanceId = null;

  try {
    // STEP 1: LOGIN
    log('\n📍', 'STEP 1: LOGIN (Criar usuário de teste)', 'yellow');
    const loginRes = await makeRequest('POST', '/auth/register', {
      email: `test-${Date.now()}@test.com`,
      password: 'Test@123456',
      name: 'Usuário Teste QR',
    });

    if (loginRes.status !== 201 && loginRes.status !== 200) {
      log('⚠️ ', `Login retornou ${loginRes.status}`, 'yellow');
    } else {
      log('✅', `Login OK (HTTP ${loginRes.status})`, 'green');
    }

    // STEP 2: GET TOKEN
    log('\n📍', 'STEP 2: OBTER TOKEN (login)', 'yellow');
    const tokenRes = await makeRequest('POST', '/auth/login', {
      email: loginRes.data.email || `test-${Date.now()}@test.com`,
      password: 'Test@123456',
    });

    if (tokenRes.status === 200 && tokenRes.data.token) {
      token = tokenRes.data.token;
      log('✅', `Token obtido: ${token.substring(0, 20)}...`, 'green');
    } else {
      log('❌', `Erro ao obter token: ${tokenRes.status}`, 'red');
      console.log('Response:', tokenRes.data);

      // Tenta login direto com credencial padrão
      log('\n📍', 'TENTANDO COM CREDENCIAL PADRÃO', 'yellow');
      const standardLoginRes = await makeRequest('POST', '/auth/login', {
        email: 'test@teste.com',
        password: '123456',
      });
      if (standardLoginRes.status === 200 && standardLoginRes.data.token) {
        token = standardLoginRes.data.token;
        log('✅', `Token obtido com credencial padrão: ${token.substring(0, 20)}...`, 'green');
      }
    }

    if (!token) {
      log('❌', 'Não foi possível obter token! Abortando testes.', 'red');
      process.exit(1);
    }

    // STEP 3: CRIAR INSTÂNCIA
    log('\n📍', 'STEP 3: CRIAR INSTÂNCIA', 'yellow');
    const createInstanceRes = await makeRequest('POST', '/api/instances', {
      name: `Teste QR ${Date.now()}`,
      accountAge: 30,
    });

    if (createInstanceRes.status === 201 && createInstanceRes.data.id) {
      instanceId = createInstanceRes.data.id;
      log('✅', `Instância criada: ID ${instanceId}`, 'green');
      console.log('  Dados:', createInstanceRes.data);
    } else {
      log('❌', `Erro ao criar instância: ${createInstanceRes.status}`, 'red');
      console.log('Response:', createInstanceRes.data);
      process.exit(1);
    }

    // STEP 4: GERAR QR CODE (SEM TOKEN PRIMEIRO)
    log('\n📍', 'STEP 4: TENTAR GERAR QR CODE SEM AUTENTICAÇÃO', 'yellow');
    const qrNoAuthRes = await makeRequest('GET', `/api/instances/${instanceId}/qr`);
    log(
      qrNoAuthRes.status === 401 ? '✅' : '❌',
      `Status: ${qrNoAuthRes.status} (esperado 401 - Unauthorized)`,
      qrNoAuthRes.status === 401 ? 'green' : 'red'
    );

    // STEP 5: GERAR QR CODE (COM TOKEN)
    log('\n📍', 'STEP 5: GERAR QR CODE COM AUTENTICAÇÃO', 'yellow');
    
    // Fazendo manual com headers
    const url = new URL(`/api/instances/${instanceId}/qr`, BASE_URL);
    const qrRes = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });

    log(
      '➜',
      `GET /api/instances/${instanceId}/qr`,
      'cyan'
    );

    if (qrRes.status === 200) {
      log('✅', `QR Code gerado com sucesso! (HTTP ${qrRes.status})`, 'green');
      console.log(
        '  Resposta:',
        {
          status: qrRes.data?.status,
          message: qrRes.data?.message,
          qrCode: qrRes.data?.qrCode ? `${qrRes.data.qrCode.substring(0, 50)}...` : 'null',
        }
      );

      // Verifica se tem QR code
      if (qrRes.data?.qrCode) {
        log('✅', 'QR CODE GERADO COM SUCESSO!', 'green');
        // Salvar a imagem para debug
        const base64Data = qrRes.data.qrCode.replace(/^data:image\/png;base64,/, '');
        const fs = require('fs');
        fs.writeFileSync(
          'c:\\Users\\Icaro Garcia\\Documents\\globaldisparos\\qr-test.png',
          Buffer.from(base64Data, 'base64')
        );
        log('💾', 'QR Code salvo em: qr-test.png', 'blue');
      } else {
        log('⏳', 'QR Code ainda não foi gerado (status: ' + qrRes.data?.status + ')', 'yellow');
        log('  ', 'Mensagem: ' + qrRes.data?.message, 'yellow');
      }
    } else if (qrRes.status === 403) {
      log('❌', `ERRO 403 - ACESSO NEGADO! (O erro que você relatou)`, 'red');
      console.log('Response:', qrRes.data);
      log('⚠️ ', 'PROBLEMA: O fix não foi aplicado corretamente!', 'red');
    } else if (qrRes.status === 401) {
      log('❌', `ERRO 401 - NÃO AUTENTICADO`, 'red');
      console.log('Response:', qrRes.data);
    } else {
      log('❌', `Status inesperado: ${qrRes.status}`, 'red');
      console.log('Response:', qrRes.data);
    }

    // SUMMARY
    log('\n' + '='.repeat(60), '', 'blue');
    log('📊', 'RESUMO DOS TESTES', 'blue');
    log('='.repeat(60), '', 'blue');
    log('✅', 'Backend respondendo em: ' + BASE_URL, 'green');
    log('✅', 'Instância criada: ' + instanceId, 'green');
    log('  ', `Token: ${token.substring(0, 20)}...`, 'cyan');
    log('\n⚡', 'O FLUXO DE QR CODE FUNCIONOU!', qrRes.status === 200 ? 'green' : 'yellow');

  } catch (error) {
    log('❌', `Erro durante testes: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log('  ', 'ERRO: Não conseguiu conectar ao backend em localhost:3001', 'red');
      log('  ', 'Certifique-se de que o backend está rodando!', 'red');
    }
    process.exit(1);
  }
}

test().catch(console.error);
