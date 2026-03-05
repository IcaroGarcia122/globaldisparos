import { fetchAPI } from '@/config/api';

async function testAdminLogin() {
  try {
    console.log('🔐 Iniciando teste de login...');
    
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: { email: 'admin@gmail.com', password: 'vip2026' }
    });
    
    console.log('✅ Login bem-sucedido!');
    console.log('Token:', response.token?.substring(0, 30) + '...');
    console.log('User:', response.user);
    
  } catch (error: any) {
    console.error('❌ Erro no login:', error);
    console.error('Message:', error.message);
  }
}

// Executar ao carregar a página
testAdminLogin();
