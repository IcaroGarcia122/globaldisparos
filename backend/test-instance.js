const http = require('http');

// Step 1: Login
const loginData = JSON.stringify({
  email: 'admin@gmail.com',
  password: 'vip2026'
});

const loginOptions = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const loginReq = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('=== LOGIN RESPONSE ===');
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
    
    try {
      const loginRes = JSON.parse(data);
      const token = loginRes.token;
      
      // Step 2: Create Instance
      console.log('\n=== CREATING INSTANCE ===');
      const createData = JSON.stringify({
        name: 'oo',
        accountAge: 30
      });
      
      const createOptions = {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/instances',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': createData.length
        }
      };
      
      const createReq = http.request(createOptions, (res2) => {
        let data2 = '';
        res2.on('data', (chunk) => { data2 += chunk; });
        res2.on('end', () => {
          console.log('Status:', res2.statusCode);
          console.log('Body:', data2);
          process.exit(0);
        });
      });
      
      createReq.on('error', (e) => {
        console.error('Request error:', e);
        process.exit(1);
      });
      
      createReq.write(createData);
      createReq.end();
      
    } catch (e) {
      console.error('Parse error:', e.message);
      process.exit(1);
    }
  });
});

loginReq.on('error', (e) => {
  console.error('Login error:', e);
  process.exit(1);
});

loginReq.write(loginData);
loginReq.end();
