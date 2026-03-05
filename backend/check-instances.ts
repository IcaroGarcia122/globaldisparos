import sequelize from './src/config/database';
import { WhatsAppInstance } from './src/models';

(async () => {
  try {
    await sequelize.authenticate();
    
    const instances = await WhatsAppInstance.findAll({
      attributes: ['id', 'name', 'status', 'isActive', 'connectedAt', 'phoneNumber'],
      where: { isActive: true },
      raw: true
    });
    
    console.log(`\n=== INSTÂNCIAS ATIVAS (${instances.length}) ===\n`);
    instances.forEach((inst: any) => {
      console.log(`📱 ${inst.name}:`);
      console.log(`   ID: ${inst.id}`);
      console.log(`   Status: ${inst.status}`);
      console.log(`   ConnectedAt: ${inst.connectedAt || 'NULL'}`);
      console.log(`   PhoneNumber: ${inst.phoneNumber || 'NULL'}`);
      console.log();
    });

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
})();
