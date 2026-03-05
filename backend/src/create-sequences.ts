import sequelize from './config/database';
import logger from './utils/logger';

const createSequencesToDatabase = async () => {
  try {
    logger.info('🔧 Criando sequências do PostgreSQL...');

    // 1. Criar sequências para tabelas que usam auto-increment
    const sequences = [
      { name: 'users_id_seq' },
      { name: 'whatsapp_instances_id_seq' },
      { name: 'campaigns_id_seq' },
      { name: 'contacts_id_seq' },
      { name: 'messages_id_seq' },
      { name: 'whatsapp_groups_id_seq' },
      { name: 'activity_logs_id_seq' },
      { name: 'warmup_sessions_id_seq' },
    ];

    for (const { name } of sequences) {
      try {
        // DROP se existir
        await sequelize.query(`DROP SEQUENCE IF EXISTS "${name}" CASCADE;`);

        // CRIAR nova sequência
        await sequelize.query(`CREATE SEQUENCE "${name}" START 1 INCREMENT 1;`);

        logger.info(`✅ Sequência ${name} criada`);
      } catch (error: any) {
        logger.error(`❌ Erro ao criar sequência ${name}:`, error.message);
      }
    }

    // 2. Associar sequências às colunas das tabelas
    const associations = [
      { table: 'users', sequence: 'users_id_seq' },
      { table: 'whatsapp_instances', sequence: 'whatsapp_instances_id_seq' },
      { table: 'campaigns', sequence: 'campaigns_id_seq' },
      { table: 'contacts', sequence: 'contacts_id_seq' },
      { table: 'messages', sequence: 'messages_id_seq' },
      { table: 'whatsapp_groups', sequence: 'whatsapp_groups_id_seq' },
      { table: 'activity_logs', sequence: 'activity_logs_id_seq' },
      { table: 'warmup_sessions', sequence: 'warmup_sessions_id_seq' },
    ];

    for (const { table, sequence } of associations) {
      try {
        // Verificar se table existe
        const tableExists = await sequelize.query(
          `SELECT 1 FROM information_schema.tables WHERE table_name = '${table}';`
        );

        if (tableExists?.[0]?.length > 0) {
          // ALTER COLUMN para usar a sequência
          await sequelize.query(
            `ALTER TABLE "${table}" ALTER COLUMN id SET DEFAULT nextval('${sequence}'::regclass);`
          );

          logger.info(`✅ Sequência ${sequence} vinculada a ${table}.id`);
        } else {
          logger.warn(`⚠️  Tabela ${table} não existe`);
        }
      } catch (error: any) {
        if (error.message.includes('does not exist')) {
          logger.warn(`⚠️  Tabela ${table} não existe`);
        } else {
          logger.error(`❌ Erro ao vincular sequência ${sequence} a ${table}:`, error.message);
        }
      }
    }

    logger.info('✅ Sequências criadas com sucesso!');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Erro ao criar sequências:', error);
    process.exit(1);
  }
};

createSequencesToDatabase();
