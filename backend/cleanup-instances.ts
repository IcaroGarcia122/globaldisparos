import sequelize from './src/config/database';
import { WhatsAppInstance } from './src/models';

async function cleanupInstances() {
  try {
    console.log('🧹 Iniciando limpeza de instâncias antigas...');
    
    // Desativar todas as instâncias (soft delete)
    const result = await WhatsAppInstance.update(
      { isActive: false },
      { where: {} }
    );

    console.log(`✅ ${result[0]} instâncias foram desativadas`);
    
    // Mostrar estatísticas
    const activeCount = await WhatsAppInstance.count({ where: { isActive: true } });
    const inactiveCount = await WhatsAppInstance.count({ where: { isActive: false } });
    
    console.log(`📊 Status: ${activeCount} ativa(s), ${inactiveCount} inativa(s)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar instâncias:', error);
    process.exit(1);
  }
}

cleanupInstances();
