import sequelize from './src/config/database';
import User from './src/models/User';
import bcrypt from 'bcryptjs';

async function testLogin() {
  try {
    const email = 'admin@gmail.com';
    const password = 'vip2026';
    
    console.log(`🔐 Testando login para: ${email}`);
    
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.log('❌ Usuário não encontrado');
      return;
    }
    
    console.log(`✅ Usuário encontrado: ${user.email}`);
    console.log(`   Password hash: ${user.password.substring(0, 20)}...`);
    
    // Comparar senha
    const match = await user.comparePassword(password);
    console.log(`   comparePassword resultado: ${match}`);
    
    // Teste manual do bcrypt
    const manualMatch = await bcrypt.compare(password, user.password);
    console.log(`   bcrypt.compare resultado: ${manualMatch}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sequelize.close();
  }
}

testLogin();
