import axios from 'axios';

const BASE_API = 'http://127.0.0.1:3001/api';
let authToken: string = '';
let userId: number = 0;

// UTILS
function log(msg: string) {
  console.log(`[TEST] ${new Date().toISOString().slice(11, 19)} ${msg}`);
}

async function request(method: string, path: string, data?: any) {
  const url = `${BASE_API}${path}`;
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  log(`${method} ${url}`);
  try {
    const response = await axios({ 
      method, 
      url, 
      data, 
      headers,
      httpAgent: new (require('http').Agent)({ family: 4 }), // Force IPv4
      httpsAgent: new (require('https').Agent)({ family: 4 }) // Force IPv4
    });
    return response.data;
  } catch (error: any) {
    log(`   ERROR: ${error.response?.status || error.message}`);
    console.error('  ', error.response?.data || error.message);
    throw error;
  }
}

// TEST FLOW
async function runTest() {
  try {
    // ========== STEP 1: CREATE USER ==========
    log('📝 STEP 1: Criando novo usuário de teste...');
    const userRes = await request('POST', '/auth/register', {
      email: `test-${Date.now()}@test.com`,
      password: 'Test@12345',
      fullName: 'Test User WhatsApp',
    });
    userId = userRes.user.id;
    log(`   ✅ Usuário criado: ${userRes.user.email} (ID: ${userId})`);

    // ========== STEP 2: LOGIN ==========
    log('🔐 STEP 2: Fazendo login...');
    const loginRes = await request('POST', '/auth/login', {
      email: userRes.user.email,
      password: 'Test@12345',
    });
    authToken = loginRes.token;
    log(`   ✅ Login bem-sucedido, token obtido`);

    // ========== STEP 3: CREATE INSTANCE ==========
    log('📱 STEP 3: Criando instância WhatsApp...');
    const instanceRes = await request('POST', '/instances', {
      name: `Test-${Date.now()}`,
      sessionName: `test-session-${Date.now()}`,
    });
    const instanceId = instanceRes.id;
    log(`   ✅ Instância criada: ID=${instanceId}, Status=${instanceRes.status}`);

    // ========== STEP 4: POLL FOR QR CODE ==========
    log('🔄 STEP 4: Fazendo polling para obter QR code...');

    let attempts = 0;
    const maxAttempts = 15;
    let qrCode: any = null;

    while (attempts < maxAttempts && !qrCode) {
      attempts++;
      try {
        const qrRes = await request('GET', `/instances/${instanceId}/qr`);
        log(`   [Tentativa ${attempts}] Status: ${qrRes.status}`);

        if (qrRes.qrCode) {
          qrCode = qrRes.qrCode;
          log(`   ✅ QR CODE OBTIDO! Tamanho: ${qrCode.length} chars`);
          log(`   Primeiro 100 chars: ${qrCode.substring(0, 100)}...`);
          break;
        } else {
          log(`   ⏳ Aguardando... (${qrRes.message})`);
        }
      } catch (error) {
        log(`   ERROR na tentativa ${attempts}`);
      }

      // Espera 2 segundos antes da próxima tentativa
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (qrCode) {
      log('✅ SUCESSO TESTS COMPLETO!');
      log(`QR Code gerado com sucesso em ${attempts} tentativas`);
      log(`Total de tempo: ${attempts * 2} segundos`);
    } else {
      log(`❌ FALHA: QR Code não obtido após ${attempts} tentativas`);
    }

    // Get final instance status
    const finalInstance = await request('GET', `/instances/${instanceId}`);
    log(`\n📊 ESTADO FINAL:`);
    log(`   ID: ${finalInstance.id}`);
    log(`   Name: ${finalInstance.name}`);
    log(`   Status: ${finalInstance.status}`);
    log(`   QR Code no DB: ${finalInstance.qrCode ? 'SIM ✅' : 'NÃO ❌'}`);
  } catch (error) {
    log(`❌ TESTE FALHOU: ${error?.message}`);
    process.exit(1);
  }
}

// RUN!
log('🚀 Iniciando teste de fluxo QR Code...\n');
runTest().then(() => {
  log('\n✅ Teste finalizado');
  process.exit(0);
});
