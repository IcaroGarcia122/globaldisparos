#!/usr/bin/env node

const http = require('http');

async function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${global.token}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('🔐 Login...');
    const login = await request('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });

    if (login.status !== 200) {
      console.error('❌ Login failed:', login.body);
      process.exit(1);
    }

    global.token = login.body.token;
    console.log('✅ Login OK\n');

    // Criar nova instância
    console.log('📝 Creating new instance...');
    const create = await request('POST', '/api/instances', {
      name: `Instance-${Date.now()}`,
      accountAge: 30
    });

    if (create.status === 201) {
      const instanceId = create.body.id;
      console.log(`✅ Instance created! ID: ${instanceId}\n`);

      // Gerar QR code
      console.log('📲 Triggering QR generation...');
      const connect = await request('POST', `/api/instances/${instanceId}/connect`);
      
      if (connect.status === 200) {
        console.log('✅ QR generation triggered\n');

        // Wait for QR
        await new Promise(r => setTimeout(r, 3000));

        console.log('🔍 Checking QR code...');
        const qr = await request('GET', `/api/instances/${instanceId}/qr`);

        if (qr.body.qrCode) {
          console.log('✅ QR CODE FOUND!');
          console.log(`   Length: ${qr.body.qrCode.length}`);
          console.log(`   Status: ${qr.body.status}`);
          console.log(`   Valid: ${qr.body.qrCode.startsWith('data:image') ? '✅' : '❌'}`);
        } else {
          console.log('⚠️  No QR code yet');
          console.log(`   Status: ${qr.body.status}`);
        }
      } else {
        console.error('❌ QR generation failed:', connect.body);
      }
    } else if (create.status === 409) {
      console.error('❌ Instance limit reached:', create.body.error);
    } else {
      console.error('❌ Create failed:', create.status, create.body);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

test();
