import sequelize from './src/config/database';
import { WhatsAppInstance } from './src/models';
import logger from './src/utils/logger';

async function testConnectionCheck() {
  try {
    await sequelize.authenticate();
    logger.info('📊 Conectado ao banco de dados');

    // Busca todas as instâncias
    const instances = await WhatsAppInstance.findAll();
    
    if (instances.length === 0) {
      logger.warn('⚠️ Nenhuma instância encontrada no banco');
      return;
    }

    logger.info(`📋 Total de instâncias: ${instances.length}`);
    
    instances.forEach((instance: any) => {
      logger.info(`
────────────────────────────────
ID: ${instance.id}
Nome: ${instance.name}
Status: ${instance.status}
IsActive: ${instance.isActive}
CreatedAt: ${instance.createdAt}
────────────────────────────────
      `);
    });

    // Testa a lógica de isConnectedOrStored para cada instância
    logger.info('🔍 Testando verificação de conexão para cada instância...\n');
    
    const whatsappService = require('./src/adapters/whatsapp.config').default;
    
    for (const instance of instances) {
      const isConnected = await whatsappService.isConnectedOrStored(instance.id);
      logger.info(`Instância ${instance.id}: isConnected = ${isConnected}`);
    }

  } catch (error) {
    logger.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

testConnectionCheck();
