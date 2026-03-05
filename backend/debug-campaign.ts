import sequelize from './src/config/database';
import { Campaign, WhatsAppInstance } from './src/models';
import whatsappService from './src/adapters/whatsapp.config';
import logger from './src/utils/logger';

async function debugCampaign() {
  try {
    console.log('🔍 Iniciando debug de campanha...\n');

    // Conecta ao banco
    await sequelize.authenticate();
    logger.info('✅ Banco de dados conectado');

    // Busca uma instância conectada
    const instance = await WhatsAppInstance.findOne({
      where: { status: 'connected', isActive: true },
    });

    if (!instance) {
      logger.warn('⚠️ Nenhuma instância conectada encontrada!');
      process.exit(0);
    }

    logger.info(`\n📱 Found instance: ${instance.id} - ${instance.name} - Status: ${instance.status}`);

    // Busca uma campanha dessa instância
    const campaign = await Campaign.findOne({
      where: { instanceId: instance.id },
      include: [{ model: WhatsAppInstance, as: 'instance' }],
    });

    if (!campaign) {
      logger.warn(`⚠️ Nenhuma campanha encontrada para ${instance.id}`);
      process.exit(0);
    }

    logger.info(`📊 Found campaign: ${campaign.id} - ${campaign.name}`);

    // TEST 1: Verifica instância em memória
    console.log('\n' + '='.repeat(80));
    console.log('TEST 1: Checando instância em memória');
    console.log('='.repeat(80));
    const isConnected1 = whatsappService.isConnected(instance.id);
    logger.info(`isConnected(${instance.id}) = ${isConnected1}`);

    // TEST 2: Tenta buscar grupos
    if (isConnected1) {
      console.log('\n' + '='.repeat(80));
      console.log('TEST 2: Buscando grupos...');
      console.log('='.repeat(80));
      try {
        const groups = await whatsappService.getGroups(instance.id);
        logger.info(`✅ getGroups() retornou ${groups.length} grupos`);
        if (groups.length > 0) {
          logger.info(`Primeiro grupo: ${groups[0].id}`);
          
          // TEST 3: Busca participantes
          console.log('\n' + '='.repeat(80));
          console.log('TEST 3: Buscando participantes do primeiro grupo...');
          console.log('='.repeat(80));
          const participants = await whatsappService.getGroupParticipants(instance.id, groups[0].id);
          logger.info(`✅ getGroupParticipants() retornou ${participants.length} participantes`);
        }
      } catch (error) {
        logger.error('❌ Erro ao buscar grupos:', error);
      }
    }

    // TEST 4: isConnectedOrStored (o que falha)
    console.log('\n' + '='.repeat(80));
    console.log('TEST 4: Verificando com isConnectedOrStored...');
    console.log('='.repeat(80));
    const isConnected2 = await whatsappService.isConnectedOrStored(instance.id);
    logger.info(`✅ isConnectedOrStored(${instance.id}) = ${isConnected2}`);

    // TEST 5: Verifica se os dados batem
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    logger.info(`isConnected(${instance.id}) = ${isConnected1}`);
    logger.info(`isConnectedOrStored(${instance.id}) = ${isConnected2}`);
    logger.info(`Database status = ${instance.status}`);
    logger.info(`Database isActive = ${instance.isActive}`);

    if (isConnected1 !== isConnected2) {
      logger.warn('⚠️ DIFERENÇA ENCONTRADA!');
      logger.warn('isConnected retornou true mas isConnectedOrStored retornou false');
    } else {
      logger.info('✅ Ambos os métodos retornaram o mesmo resultado');
    }

    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

debugCampaign();
