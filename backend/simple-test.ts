import sequelize from './src/config/database';
import { WhatsAppInstance } from './src/models';
import whatsappService from './src/adapters/whatsapp.config';
import logger from './src/utils/logger';

async function simpleTest() {
  try {
    console.log('🔍 Iniciando teste simples...\n');

    // Conecta ao banco
    await sequelize.authenticate();
    logger.info('✅ Banco de dados conectado');

    // Busca uma instância conectada
    const instance = await WhatsAppInstance.findOne({
      where: { status: 'connected', isActive: true },
      raw: true,
    });

    if (!instance) {
      logger.warn('⚠️ Nenhuma instância conectada encontrada!');
      process.exit(0);
    }

    const instanceId = instance.id;
    logger.info(`\n📱 Instância encontrada: ${instanceId}`);
    logger.info(`  - Nome: ${instance.name}`);
    logger.info(`  - Status BD: ${instance.status}`);
    logger.info(`  - isActive BD: ${instance.isActive}`);

    // TEST 1: isConnected (em memória)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: whatsappService.isConnected()');
    console.log('='.repeat(80));
    const test1 = whatsappService.isConnected(instanceId);
    logger.info(`Result: ${test1}`);

    // TEST 2: isConnectedOrStored (memória + BD)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: whatsappService.isConnectedOrStored()');
    console.log('='.repeat(80));
    const test2 = await whatsappService.isConnectedOrStored(instanceId);
    logger.info(`Result: ${test2}`);

    // TEST 3: Tentar buscar grupos (prova que tá conectado)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: whatsappService.getGroups()');
    console.log('='.repeat(80));
    try {
      const groups = await whatsappService.getGroups(instanceId);
      logger.info(`✅ getGroups retornou ${groups?.length || 0} grupos`);
      if (groups && groups.length > 0) {
        logger.info(`Primeiro grupo: ${JSON.stringify(groups[0])}`);
      }
    } catch (err: any) {
      logger.error(`❌ getGroups falhou: ${err.message}`);
    }

    // RESUMO
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMO');
    console.log('='.repeat(80));
    logger.info(`isConnected(memória): ${test1}`);
    logger.info(`isConnectedOrStored(memória+BD): ${test2}`);
    logger.info(`\n⚠️ Se isConnected=false mas isConnectedOrStored=true => instância em BD mas não em memória`);
    logger.info(`⚠️ Se ambos=false mas getGroups funciona => erro na verificação`);

    process.exit(0);
  } catch (err) {
    logger.error('Erro:', err);
    process.exit(1);
  }
}

simpleTest();
