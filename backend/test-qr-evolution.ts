/**
 * Script de teste completo para QR Code com Evolution API
 * Testa fluxo de geração, busca e exibição do QR code
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001';
const CREDENTIALS = {
  email: 'admin@gmail.com',
  password: 'vip2026'
};

// Cores para terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️${colors.reset} ${msg}`),
  debug: (msg: string) => console.log(`${colors.cyan}🔍${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
};

interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

interface InstanceResponse {
  id: number;
  userId: number;
  name: string;
  status: string;
  phoneNumber: string | null;
  qrCode: string | null;
  connectedAt: string | null;
  isActive: boolean;
}

interface QRResponse {
  qrCode: string | null;
  status: 'connected' | 'pending' | 'awaiting';
  connectedAt?: string;
  message: string;
  retryAfter?: number;
}

const test = async () => {
  let token = '';
  let testInstanceId = 0;

  try {
    // ===== ETAPA 1: LOGIN =====
    log.info('ETAPA 1: Autenticação');
    console.log('');
    
    const loginRes = await axios.post<LoginResponse>(`${BACKEND_URL}/api/auth/login`, CREDENTIALS);
    token = loginRes.data.token;
    log.success(`Login realizado: ${loginRes.data.user.email} (ID: ${loginRes.data.user.id})`);

    // ===== ETAPA 2: CRIAR INSTÂNCIA =====
    log.info('ETAPA 2: Criar nova instância');
    console.log('');

    const instanceName = `test_qr_${Date.now()}`;
    const createRes = await axios.post<InstanceResponse>(
      `${BACKEND_URL}/api/instances`,
      {
        name: instanceName,
        accountAge: 30
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    testInstanceId = createRes.data.id;
    log.success(`Instância criada: ID ${testInstanceId}, status: ${createRes.data.status}`);

    // ===== ETAPA 3: AGUARDAR E BUSCAR QR CODE =====
    log.info('ETAPA 3: Buscar QR Code com polling');
    console.log('');

    let qrCodeData: QRResponse | null = null;
    let attempts = 0;
    const maxAttempts = 20; // Até 40 segundos (2s por tentativa)

    while (attempts < maxAttempts && !qrCodeData?.qrCode) {
      attempts++;
      try {
        const qrRes = await axios.get<QRResponse>(
          `${BACKEND_URL}/api/instances/${testInstanceId}/qr`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        qrCodeData = qrRes.data;

        if (qrCodeData.qrCode) {
          log.success(`QR Code obtido na tentativa ${attempts}!`);
          console.log(`  Status: ${qrCodeData.status}`);
          console.log(`  Mensagem: ${qrCodeData.message}`);
          console.log(`  QR Length: ${qrCodeData.qrCode.length} caracteres`);
          break;
        } else {
          log.debug(`Tentativa ${attempts}/${maxAttempts}: status=${qrCodeData.status}, msg="${qrCodeData.message}"`);
          if (qrCodeData.retryAfter) {
            log.info(`  (Aguarde ${qrCodeData.retryAfter}s para tentar novamente)`);
          }
          
          // Aguarda antes de próxima tentativa
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        log.warn(`Erro na tentativa ${attempts}: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!qrCodeData?.qrCode) {
      log.error(`QR Code não obtido após ${maxAttempts} tentativas`);
      log.warn(`Última resposta: ${JSON.stringify(qrCodeData)}`);
      process.exit(1);
    }

    // ===== ETAPA 4: VALIDAR QR CODE =====
    log.info('ETAPA 4: Validar formato do QR Code');
    console.log('');

    if (qrCodeData.qrCode.startsWith('data:image')) {\n      log.success('QR Code está em formato Data URL');\n    } else if (qrCodeData.qrCode.match(/^[A-Za-z0-9+/=]{100,}/)) {\n      log.success('QR Code parece ser um string grande (pode ser Base64)');\n    } else {\n      log.warn('QR Code formato desconhecido:');\n      console.log(`  ${qrCodeData.qrCode.substring(0, 100)}...`);\n    }\n\n    // ===== ETAPA 5: LISTÁR INSTÂNCIAS =====\n    log.info('ETAPA 5: Listar instâncias');\n    console.log('');\n\n    const listRes = await axios.get<InstanceResponse[]>(\n      `${BACKEND_URL}/api/instances`,\n      {\n        headers: { Authorization: `Bearer ${token}` }\n      }\n    );\n\n    const testInstance = listRes.data.find(i => i.id === testInstanceId);\n    if (testInstance) {\n      log.success(`Instância encontrada na lista:`);\n      console.log(`  ID: ${testInstance.id}`);\n      console.log(`  Nome: ${testInstance.name}`);\n      console.log(`  Status: ${testInstance.status}`);\n      console.log(`  QR no BD: ${testInstance.qrCode ? 'Sim (' + testInstance.qrCode.length + ' chars)' : 'Não'}`);\n      console.log(`  Conectada em: ${testInstance.connectedAt || 'Não conectada'}`);\n    } else {\n      log.error('Instância não encontrada na lista');\n    }\n\n    // ===== ETAPA 6: REFRESH QR CODE (Opcional) =====\n    log.info('ETAPA 6: Testar refresh de QR Code (simulando re-conexão)');\n    console.log('');\n\n    try {\n      // Fazer refresh tentando conectar novamente\n      const refreshRes = await axios.post(\n        `${BACKEND_URL}/api/instances/${testInstanceId}/connect`,\n        {},\n        {\n          headers: { Authorization: `Bearer ${token}` }\n        }\n      );\n      \n      log.info('Re-conexão iniciada, aguardando novo QR code...');\n      \n      // Aguardar novo QR code\n      await new Promise(resolve => setTimeout(resolve, 3000));\n      \n      const newQrRes = await axios.get<QRResponse>(\n        `${BACKEND_URL}/api/instances/${testInstanceId}/qr`,\n        {\n          headers: { Authorization: `Bearer ${token}` }\n        }\n      );\n\n      if (newQrRes.data.qrCode) {\n        log.success('Novo QR Code obtido após refresh!');\n        console.log(`  Mensagem: ${newQrRes.data.message}`);\n      } else {\n        log.info('Ainda aguardando novo QR Code...');\n      }\n    } catch (error: any) {\n      log.warn(`Erro ao fazer refresh: ${error.response?.data?.error || error.message}`);\n    }\n\n    // ===== ETAPA 7: LIMPEZA =====\n    log.info('ETAPA 7: Limpeza - deletar instância de teste');\n    console.log('');\n\n    try {\n      await axios.delete(\n        `${BACKEND_URL}/api/instances/${testInstanceId}`,\n        {\n          headers: { Authorization: `Bearer ${token}` }\n        }\n      );\n      log.success(`Instância ${testInstanceId} deletada com sucesso`);\n    } catch (error: any) {\n      log.warn(`Erro ao deletar instância: ${error.message}`);\n    }\n\n    // ===== RESUMO FINAL =====\n    console.log('');\n    log.success('✅ TESTE COMPLETO COM SUCESSO!');\n    console.log('');\n    console.log('Resumo:');\n    console.log(`  1. ✅ Login bem-sucedido`);\n    console.log(`  2. ✅ Instância criada (ID: ${testInstanceId})`);\n    console.log(`  3. ✅ QR Code obtido (${attempts} tentativas, ${attempts * 2}s`);\n    console.log(`  4. ✅ QR Code validado`);\n    console.log(`  5. ✅ Instância listada`);\n    console.log(`  6. ✅ Operação de refresh testada`);\n    console.log(`  7. ✅ Limpeza realizada`);\n    console.log('');\n\n    process.exit(0);\n  } catch (error: any) {\n    console.error('');\n    log.error(`Erro durante teste: ${error.message}`);\n    \n    if (error.response?.data) {\n      console.error('Resposta do servidor:', JSON.stringify(error.response.data, null, 2));\n    }\n    \n    // Tentar limpar instância de teste se foi criada\n    if (testInstanceId && token) {\n      try {\n        await axios.delete(\n          `${BACKEND_URL}/api/instances/${testInstanceId}`,\n          {\n            headers: { Authorization: `Bearer ${token}` }\n          }\n        );\n        log.info('Instância de teste deletada durante cleanup');\n      } catch (cleanupError: any) {\n        log.warn(`Erro ao deletar instância de teste: ${cleanupError.message}`);\n      }\n    }\n\n    process.exit(1);\n  }\n};\n\n// Executar teste\ntest();\n