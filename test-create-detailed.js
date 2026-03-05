#!/usr/bin/env node

/**
 * Test creating instance with detailed error logging
 * Simulates exact frontend behavior
 */

const http = require('http');

let AUTH_TOKEN = '';

function request(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: url,
      method: method,
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
            rawBody: body,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: null,
            rawBody: body,
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function test() {
  try {
    console.log('=== TEST: Create Instance Frontend Simulation ===\n');

    // Step 1: Login
    console.log('1️⃣  LOGIN');
    const loginResp = await request('POST', '/api/auth/login', {
      email: 'admin@gmail.com',
      password: 'vip2026',
    });
    
    if (loginResp.status !== 200) {
      console.error('❌ Login failed:', loginResp.status);
      console.error('   Body:', loginResp.body);
      process.exit(1);
    }

    AUTH_TOKEN = loginResp.body.token;
    console.log('✅ Login successful\n');

    // Step 2: Fetch current instances
    console.log('2️⃣  GET /instances');
    const listResp = await request('GET', '/api/instances');
    console.log(`✅ Current instances: ${listResp.body.length}`);
    listResp.body.forEach(inst => {
      console.log(`   - ID ${inst.id}: ${inst.name} (active: ${inst.isActive})`);
    });
    console.log();

    // Step 3: Try to create instance - THIS IS WHERE ERROR MIGHT HAPPEN
    console.log('3️⃣  POST /instances (CREATE)');
    console.log('   Sending body:');
    const body = { name: `Test-${Date.now()}`, accountAge: 30 };
    console.log(`   ${JSON.stringify(body)}\n`);

    const createResp = await request('POST', '/api/instances', body);

    console.log(`Status: ${createResp.status}`);
    console.log(`Response:`, JSON.stringify(createResp.body, null, 2));

    if (createResp.status === 201) {
      console.log(`\n✅ SUCCESS! Instance created: ID ${createResp.body.id}`);
    } else if (createResp.status === 400) {
      console.error(`\n❌ BAD REQUEST (400)`);
      console.error(`   Error: ${createResp.body.error}`);
      console.error(`   This usually means missing/invalid fields`);
    } else if (createResp.status === 409) {
      console.error(`\n❌ CONFLICT (409)`);
      console.error(`   Error: ${createResp.body.error}`);
    } else {
      console.error(`\n❌ ERROR ${createResp.status}`);
      console.error(`   Body:`, createResp.rawBody);
    }

  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
}

test();
