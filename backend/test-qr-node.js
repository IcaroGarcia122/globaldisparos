const http = require('http');

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTest() {
  try {
    console.log('🚀 Starting QR Code Integration Test...\n');
    
    // Step 1: Login
    console.log('📝 Step 1: Logging in...');
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    
    if (loginRes.statusCode !== 200) {
      console.log('❌ Login failed:', loginRes.statusCode);
      process.exit(1);
    }
    
    const loginData = JSON.parse(loginRes.body);
    const token = loginData.token || loginData.data?.token;
    
    if (!token) {
      console.log('❌ No token in response');
      process.exit(1);
    }
    
    console.log('✅ Login successful');
    console.log('   Token:', token.substring(0, 30) + '...\n');
    
    // Step 2: Create instance
    console.log('📝 Step 2: Creating WhatsApp instance...');
    const timestamp = Date.now();
    const instanceRes = await makeRequest('POST', '/api/instances', {
      'Authorization': `Bearer ${token}`
    }, {
      name: `TestQR-${timestamp}`
    });
    
    if (instanceRes.statusCode !== 201 && instanceRes.statusCode !== 200) {
      console.log('❌ Instance creation failed:', instanceRes.statusCode);
      console.log('   Response:', instanceRes.body);
      process.exit(1);
    }
    
    const instanceData = JSON.parse(instanceRes.body);
    const instanceId = instanceData.id;
    
    console.log('✅ Instance created');
    console.log('   Instance ID:', instanceId);
    console.log('   Name:', instanceData.name, '\n');
    
    // Step 3: Wait for QR generation
    console.log('⏳ Step 3: Waiting 20 seconds for QR code generation...');
    for (let i = 20; i > 0; i--) {
      process.stdout.write(`\r   ${i} seconds remaining...`);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');
    
    // Step 4: Get QR code
    console.log('📝 Step 4: Fetching QR code...');
    const qrRes = await makeRequest('GET', `/api/instances/${instanceId}/qr`, {
      'Authorization': `Bearer ${token}`
    });
    
    if (qrRes.statusCode !== 200) {
      console.log('❌ QR fetch failed:', qrRes.statusCode);
      console.log('   Response:', qrRes.body);
      process.exit(1);
    }
    
    const qrData = JSON.parse(qrRes.body);
    
    console.log('\n✅ QR Code Response Received:');
    console.log('   Status:', qrData.status);
    console.log('   Message:', qrData.message);
    
    if (qrData.qrCode) {
      console.log('   Has QR Code: Yes');
      console.log('   QR Code Size:', qrData.qrCode.length, 'bytes');
      console.log('   QR Code Type:', qrData.qrCode.startsWith('data:') ? 'Data URL (Base64)' : 'Unknown');
    } else {
      console.log('   Has QR Code: No');
    }
    
    console.log('\n🎉 Test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('   ', error.message);
    process.exit(1);
  }
}

runTest();
