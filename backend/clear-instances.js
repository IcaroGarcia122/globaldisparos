const path = require('path');
const { Sequelize } = require('sequelize');

// Setup database connection
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'globaldisparos',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'icit0707',
  logging: false
});

// Define WhatsAppInstance model
const WhatsAppInstance = sequelize.define('whatsapp_instances', {
  id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
  userId: Sequelize.INTEGER,
  name: Sequelize.STRING,
  status: Sequelize.STRING,
  isActive: Sequelize.BOOLEAN,
}, { tableName: 'whatsapp_instances', timestamps: false });

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Get all instances using raw query
    console.log('🔍 Querying instances...');
    const instances = await sequelize.query(`
      SELECT id, name, status, is_active FROM whatsapp_instances 
      WHERE user_id = 1
    `, { type: Sequelize.QueryTypes.SELECT });
    
    console.log(`\n📊 Found ${instances.length} instances for admin user:\n`);
    if (instances.length === 0) {
      console.log('   (none)');
    } else {
      instances.forEach(inst => {
        console.log(`   ID: ${inst.id}, Name: "${inst.name}", Status: ${inst.status}, Active: ${inst.is_active}`);
      });
    }
    
    // Delete all
    if (instances.length > 0) {
      console.log('\n🗑️  Deleting all instances...');
      await sequelize.query(`DELETE FROM whatsapp_instances WHERE user_id = 1`);
      console.log('✅ Deleted all instances');
    }
    
    console.log('\n✅ Done');
    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
