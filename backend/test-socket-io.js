const http = require('http');

// Test Socket.IO and QR emission
const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== LOGIN RESPONSE ===');
    console.log(`Status: ${res.statusCode}`);
    const json = JSON.parse(data);
    console.log(`Token: ${json.token?.substring(0, 50)}...`);
    
    const token = json.token;
    
    // Now test Socket.IO with token
    const ioTest = require('socket.io-client');
    const socket = ioTest.io('http://127.0.0.1:3001', {
      auth: {
        token: token
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('\n🟢 Socket.IO CONECTADO!');
      console.log(`   ID: ${socket.id}`);
    });

    socket.on('qr', (data) => {
      console.log('\n✅ QR CODE RECEBIDO VIA WEBSOCKET!');
      console.log(`   Instance ID: ${data.instanceId}`);
      console.log(`   QR Code lenght: ${data.qrCode?.length || 0} bytes`);
      console.log(`   Timestamp: ${data.timestamp}`);
    });

    socket.on('error', (error) => {
      console.log(`\n❌ Socket.IO Error: ${error}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`\n🔴 Desconectado: ${reason}`);
      process.exit(0);
    });

    // Wait 10 seconds then exit
    setTimeout(() => {
      console.log('\n⏱️ Timeout - encerrando teste...');
      socket.disconnect();
      process.exit(0);
    }, 10000);
  });
});

req.on('error', (e) => {
  console.error(`Erro: ${e}`);
});

const loginData = JSON.stringify({
  email: 'admin@gmail.com',
  password: 'vip2026'
});

req.write(loginData);
req.end();
