import sequelize from './src/config/database';
import logger from './src/utils/logger';

const fixSequences = async () => {
  try {
    logger.info('🔧 Reparando sequências do PostgreSQL...');

    // 1. Verificar e reparar tabelas que precisam de sequências
    const tables = [
      { name: 'users', sequence: 'users_id_seq' },
      { name: 'whatsapp_instances', sequence: 'whatsapp_instances_id_seq' },
      { name: 'campaigns', sequence: 'campaigns_id_seq' },
      { name: 'contacts', sequence: 'contacts_id_seq' },
      { name: 'messages', sequence: 'messages_id_seq' },
      { name: 'whatsapp_groups', sequence: 'whatsapp_groups_id_seq' },
      { name: 'activity_logs', sequence: 'activity_logs_id_seq' },
      { name: 'warmup_sessions', sequence: 'warmup_sessions_id_seq' },
    ];

    for (const { name, sequence } of tables) {
      try {
        // Obter o maior ID da tabela
        const result = await sequelize.query(
          `SELECT MAX(id) as max_id FROM "${name}";`
        );

        const maxId = (result?.[0]?.[0] as any)?.max_id || 0;
        const nextId = (parseInt(maxId) || 0) + 1;

        logger.info(`📊 ${name}: Max ID = ${maxId}, próximo = ${nextId}`);

        // Resetar a sequência para o próximo valor
        await sequelize.query(
          `SELECT setval('${sequence}', ${nextId}, false);`
        );

        logger.info(`✅ Sequência ${sequence} reparada para ${nextId}`);
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          logger.warn(`⚠️  Sequência ${sequence} não existe em ${name}`);
        } else {
          logger.error(`❌ Erro ao reparar ${name}:`, error.message);
        }
      }
    }

    logger.info('✅ Sequências reparadas com sucesso!');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Erro ao reparar sequências:', error);
    process.exit(1);
  }
};

fixSequences();
