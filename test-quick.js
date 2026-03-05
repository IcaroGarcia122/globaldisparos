const http = require('http');

const BASE_URL = 'http://localhost:3002';

async function test() {
  console.log('Testando backend em ' + BASE_URL);
  
  // Testar health
  const request = http.request({
    hostname: 'localhost',
    port: 3002,
    path: '/health',
    method: 'GET',
  }, (res) => {
    console.log('✅ Health check: HTTP ' + res.statusCode);
  });
  
  request.on('error', (e) => {
    console.log('❌ Erro: ' + e.message);
  });
  
  request.end();
}

test();
