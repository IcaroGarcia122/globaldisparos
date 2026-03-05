#!/usr/bin/env node

/**
 * Test via Vite proxy (simulating browser request)
 * This tests the frontend → backend chain
 */

const http = require('http');

let AUTH_TOKEN = '';

function request(method, url, port = 8080, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path: url,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const jsonBody = body.replace(/^[^{[]*/, '').trim();
          resolve({
            status: res.statusCode,
            body: jsonBody ? JSON.parse(jsonBody) : null,
            rawBody: body.substring(0, 300),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            rawBody: body.substring(0, 300),
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        status: 0,
        error: err.message,
        body: null,
      });
    });

    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('=== TEST: Via Vite Proxy (Port 8080) ===\n');

    // Test 1: Direct to backend
    console.log('1️⃣  Login via BACKEND (port 3001)');
    let resp = await request('POST', '/api/auth/login', 3001, {
      email: 'admin@gmail.com',
      password: 'vip2026',
    });

    if (resp.error) {
      console.error('❌ Cannot connect to backend:', resp.error);
      process.exit(1);
    }

    if (resp.status === 200) {
      AUTH_TOKEN = resp.body.token;
      console.log('✅ Backend login OK\n');
    } else {
      console.error('❌ Backend login failed:', resp.status);
      process.exit(1);
    }

    // Test 2: Via Vite proxy
    console.log('2️⃣  Login via VITE PROXY (port 8080)');
    resp = await request('POST', '/api/auth/login', 8080, {
      email: 'admin@gmail.com',
      password: 'vip2026',
    });

    if (resp.error) {
      console.error('❌ Error connecting through proxy:', resp.error);
      console.error('   Vite dev server may not be ready');
      process.exit(1);
    }

    console.log(`Status: ${resp.status}`);
    if (resp.status === 200) {
      console.log('✅ Proxy login OK\n');
      AUTH_TOKEN = resp.body.token;
    } else {
      console.error('❌ Proxy login failed');
      console.log('Response:', resp.rawBody);
      process.exit(1);
    }

    // Test 3: Create instance via proxy
    console.log('3️⃣  Create instance via VITE PROXY');
    const body = { name: `Proxy-Test-${Date.now()}`, accountAge: 30 };
    console.log(`Body: ${JSON.stringify(body)}\n`);

    resp = await request('POST', '/api/instances', 8080, body);

    console.log(`Status: ${resp.status}`);
    if (resp.status === 201) {
      console.log(`✅ Instance created! ID: ${resp.body.id}\n`);
    } else if (resp.status === 0) {
      console.error(`❌ Connection failed: ${resp.error}`);
    } else {
      console.error(`❌ Create failed (${resp.status})`);
      console.log('Response:', resp.rawBody);
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

test();
