#!/usr/bin/env node

import axios from 'axios';

const API_URL = 'http://127.0.0.1:3001';

async function test() {
  try {
    console.log('1. Login...');
    const loginResp = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@gmail.com',
      password: 'vip2026'
    });
    const token = loginResp.data.token;
    console.log('   ✅ Token obtido');

    const headers = { Authorization: `Bearer ${token}` };

    console.log('\n2. Criando instância...');
    const instResp = await axios.post(`${API_URL}/api/instances`, {
      name: `test_${Date.now()}`,
      accountAge: 30
    }, { headers });
    const instanceId = instResp.data.id;
    console.log(`   ✅ Instância criada: ${instanceId}`);

    console.log('\n3. Testando POST /instances/:id/connect...');
    try {
      const connectResp = await axios.post(
        `${API_URL}/api/instances/${instanceId}/connect`,
        {},
        { headers }
      );
      console.log(`   ✅ Status: ${connectResp.status}`);
      console.log(`   ✅ Response:`, connectResp.data);
    } catch (err: any) {
      console.log(`   ❌ Status: ${err.response?.status}`);
      console.log(`   ❌ Error:`, err.response?.data);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

test();
