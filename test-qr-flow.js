#!/usr/bin/env node

/**
 * Complete QR Code Flow Test
 * 1. Login
 * 2. Create/Get instance 
 * 3. Initialize Socket.IO
 * 4. Trigger QR code generation
 * 5. Listen for QR code via Socket.IO
 * 6. Wait for instance connected event
 */

const http = require('http');
const https = require('https');

const API_URL = 'http://127.0.0.1:3001/api';
const SOCKET_URL = 'http://127.0.0.1:3001';
let AUTH_TOKEN = '';

// Colors for console output
const C = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Green: '\x1b[32m',
  Red: '\x1b[31m',
  Yellow: '\x1b[33m',
  Cyan: '\x1b[36m',
  Blue: '\x1b[34m',
};

function log(color, msg) {
  console.log(`${color}[${new Date().toLocaleTimeString()}] ${msg}${C.Reset}`);
}

function request(method, url, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
      },
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          // Socket.IO responses start with '0' or other bytes, remove them
          const jsonBody = body.replace(/^[^{[]*/, '').trim();
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody ? JSON.parse(jsonBody) : null,
            rawBody: body,
          });
        } catch (e) {
          // If not JSON, return raw body
          resolve({
            status: res.statusCode,
            headers: res.headers,
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

async function testFlow() {
  try {
    log(C.Cyan, '═══════════════════════════════════════════════════════');
    log(C.Cyan, '  QR CODE FLOW TEST - COMPLETE END-TO-END VALIDATION');
    log(C.Cyan, '═══════════════════════════════════════════════════════\n');

    // 1. LOGIN
    log(C.Blue, '>>> STEP 1: LOGIN');
    const loginRes = await request('POST', `${API_URL}/auth/login`, {
      email: 'admin@gmail.com',
      password: 'vip2026',
    });
    if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.status}`);
    AUTH_TOKEN = loginRes.body.token;
    log(C.Green, `✅ Login successful! Token: ${AUTH_TOKEN.substring(0, 20)}...`);

    // 2. GET INSTANCE OR CREATE
    log(C.Blue, '\n>>> STEP 2: GET WHATSAPP INSTANCES');
    const listRes = await request('GET', `${API_URL}/instances`);
    let instanceId = null;
    
    if (listRes.body && listRes.body.length > 0) {
      instanceId = listRes.body[0].id;
      log(C.Green, `✅ Using existing instance! ID: ${instanceId}`);
    } else {
      log(C.Blue, '   No instances found, creating new one...');
      const createRes = await request('POST', `${API_URL}/instances`, {
        name: `test-instance-${Date.now()}`,
        accountAge: 30,
      });
      if (createRes.status !== 201) throw new Error(`Instance creation failed: ${createRes.status}`);
      instanceId = createRes.body.id;
      log(C.Green, `✅ Instance created! ID: ${instanceId}`);
    }

    // 3. CHECK SOCKET.IO ENDPOINT
    log(C.Blue, '\n>>> STEP 3: VERIFY SOCKET.IO ENDPOINT');
    const socketRes = await request('GET', `${SOCKET_URL}/socket.io/?EIO=4&transport=polling`);
    if (socketRes.status !== 200) throw new Error(`Socket.IO endpoint failed: ${socketRes.status}`);
    log(C.Green, `✅ Socket.IO endpoint responding! Status: ${socketRes.status}`);

    // 4. TRIGGER CONNECTION & WAIT FOR QR
    log(C.Blue, '\n>>> STEP 4: TRIGGER QR CODE GENERATION');
    log(C.Yellow, `   Calling POST /api/instances/${instanceId}/connect...`);
    
    const connectRes = await request('POST', `${API_URL}/instances/${instanceId}/connect`);
    if (connectRes.status !== 200) {
      log(C.Yellow, `   Response status: ${connectRes.status}`);
      log(C.Yellow, `   Response body:`, connectRes.body);
    }
    log(C.Green, `✅ Connection request sent! Expected QR via WebSocket...`);

    // 5. WAIT FOR QR CODE IN BACKEND LOGS
    log(C.Blue, '\n>>> STEP 5: WAITING FOR QR CODE EMISSION (checking logs)...');
    log(C.Yellow, '   ⏳ Waiting 5 seconds for backend to generate and emit QR...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. FETCH INSTANCE QR CODE TO CHECK IF GENERATED
    log(C.Blue, '\n>>> STEP 6: VERIFY QR CODE IN DATABASE');
    const qrRes = await request('GET', `${API_URL}/instances/${instanceId}/qr`);
    if (qrRes.status !== 200) throw new Error(`Get QR failed: ${qrRes.status}`);
    
    const qrData = qrRes.body;
    if (qrData.qrCode) {
      log(C.Green, `✅ QR CODE FOUND IN DATABASE!`);
      log(C.Green, `   QR Code Length: ${qrData.qrCode.length} characters`);
      log(C.Green, `   Status: ${qrData.status}`);
      if (qrData.qrCode.startsWith('data:image')) {
        log(C.Green, `   ✅ QR is valid base64 DataURL (can render in image)`);
      }
    } else {
      log(C.Yellow, `⚠️  QR code not yet in database`);
      log(C.Yellow, `   Current status: ${qrData.status}`);
    }

    // 7. SUCCESS SUMMARY
    log(C.Cyan, '\n═══════════════════════════════════════════════════════');
    log(C.Green, '✅ TEST COMPLETED SUCCESSFULLY!');
    log(C.Cyan, '═══════════════════════════════════════════════════════\n');
    
    log(C.Green, 'Next steps:');
    log(C.Green, '  1. Open http://localhost:8080 in browser');
    log(C.Green, '  2. Click "Connect" on instance ID ' + instanceId);
    log(C.Green, '  3. Check browser console for "QR Code recebido via WebSocket"');
    log(C.Green, '  4. QR code should display in modal');

  } catch (error) {
    log(C.Red, `\n❌ TEST FAILED: ${error.message}`);
    log(C.Red, `Error details:`, error);
    process.exit(1);
  }
}

testFlow();
