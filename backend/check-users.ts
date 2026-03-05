import sequelize from './src/config/database';
import User from './src/models/User';

async function check() {
  try {
    const users = await User.findAll({
      attributes: ['email', 'role', 'isActive'],
      raw: true,
    });
    console.log('✅ Usuários no banco:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await sequelize.close();
  }
}

check();
