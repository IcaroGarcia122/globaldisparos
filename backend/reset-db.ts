import { Sequelize } from 'sequelize';
import config from './src/config';

async function resetDB() {
  try {
    const sequelize = new Sequelize({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      username: config.database.user,
      password: config.database.password,
      dialect: 'postgres',
      logging: false,
    });

    await sequelize.authenticate();
    console.log('✅ Conectado ao banco');

    const result = await sequelize.query(
      `UPDATE whatsapp_instances SET status='disconnected', connected_at=null, qr_code=null, phone_number=null;`
    );
    
    console.log('✅ Instâncias resetadas');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

resetDB();
