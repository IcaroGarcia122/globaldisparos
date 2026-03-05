import axios from 'axios';

// Test script para verificar a API de grupos
async function testGroupsAPI() {
  const baseURL = 'http://localhost:3001/api';
  const token = 'test_token'; // Use um token válido do seu sistema

  try {
    console.log('🧪 Testing Groups API...\n');

    // 1. Obter instâncias
    console.log('1️⃣  Fetching instances...');
    const instancesRes = await axios.get(`${baseURL}/instances`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Instances:', JSON.stringify(instancesRes.data, null, 2));

    if (instancesRes.data && instancesRes.data.length > 0) {
      const instanceId = instancesRes.data[0].id;
      console.log(`\n2️⃣  Fetching groups for instance ${instanceId}...`);

      // 2. Obter grupos
      try {
        const groupsRes = await axios.get(`${baseURL}/groups/sync/${instanceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Groups API Response:');
        console.log(JSON.stringify(groupsRes.data, null, 2));

        // Verificar estrutura
        if (groupsRes.data.groups && Array.isArray(groupsRes.data.groups)) {
          console.log(`\n✅ Groups array found with ${groupsRes.data.groups.length} items`);
          console.log('First group:', JSON.stringify(groupsRes.data.groups[0], null, 2));
        }
      } catch (err: any) {
        console.error('❌ Error fetching groups:', err.response?.data || err.message);
      }
    }
  } catch (err: any) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
}

testGroupsAPI();
