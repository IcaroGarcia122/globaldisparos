import path from 'path';
import fs from 'fs';
import config from './src/config';
import { WhatsAppInstance } from './src/models';
import { sequelize } from './src/models';
import logger from './src/utils/logger';

async function resetInstances() {
  try {
    await sequelize.authenticate();
    logger.info('🔗 Conectado ao banco de dados');

    // Lista instâncias
    const instances = await WhatsAppInstance.findAll();
    logger.info(`📊 Encontradas ${instances.length} instâncias`);

    for (const instance of instances) {
      logger.info(`\n🔄 Resetando ${instance.name} (${instance.id})...`);

      // Remove diretório de auth
      const authDir = path.join(config.authSessionsDir, instance.id);
      if (fs.existsSync(authDir)) {
        fs.rmSync(authDir, { recursive: true, force: true });
        logger.info(`  ✅ Arquivos de autenticação removidos`);
      }

      // Resetta dados no banco
      await instance.update({
        status: 'disconnected',
        connectedAt: null,
        qrCode: null,
        phoneNumber: null,
        dailyMessagesSent: 0,
        totalMessagesSent: 0,
        totalMessagesFailed: 0,
        lastMessageAt: null,
      });
      logger.info(`  ✅ Dados da instância resetados`);
    }

    logger.info(`\n✅ Todas as instâncias foram resetadas. Escaneie os codes QR novamente.`);
    process.exit(0);
  } catch (err) {
    logger.error('❌ Erro:', err);
    process.exit(1);
  }
}

resetInstances();
