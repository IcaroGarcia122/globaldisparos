import sequelize from './config/database';

/**
 * Simple script to sync database schema on startup
 * This will create tables and fix sequences automatically
 */
const initDatabase = async () => {
  try {
    console.log('🔧 Sincronizando schema do banco de dados...');
    
    // Sync all models with database
    // This will:
    // 1. Create tables if they don't exist
    // 2. Add new columns if models have changed
    // 3. Auto-create sequences for serial columns
    await sequelize.sync({ alter: true });
    
    console.log('✅ Schema sincronizado com sucesso!');
    console.log('✅ Sequências de auto-increment foram restauradas.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro ao sincronizar schema:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
};

initDatabase();
