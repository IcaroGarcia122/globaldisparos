import { WhatsAppInstance } from './src/models';
import whatsappService from './src/adapters/whatsapp.config';
import db from './src/database';
import logger from './src/utils/logger';

async function testReconnect() {
  try {
    logger.info('🧪 Iniciando teste de reconexão...');
    
    // Conecta ao banco
    await db.authenticate();
    logger.info('✅ Banco de dados conectado');
    
    // Sincroniza modelo
    await WhatsAppInstance.sync();
    logger.info('✅ Modelo sincronizado');
    
    // Testa isConnectedOrStored
    logger.info('🔍 Buscando instâncias...');
    const instances = await WhatsAppInstance.findAll({ limit: 1 });
    logger.info(`📦 Encontradas ${instances.length} instâncias`);
    
    if (instances.length > 0) {
      const instance = instances[0];
      logger.info(`🧪 Testando isConnectedOrStored para ${instance.id}...`);
      const result = await whatsappService.isConnectedOrStored(instance.id);
      logger.info(`✅ Resultado: ${result}`);
    }
    
    logger.info('✅ Teste completado com sucesso');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testReconnect();
