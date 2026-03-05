#!/usr/bin/env node
import { exec } from 'child_process';

const cmd = `cd "c:\\Users\\Icaro Garcia\\Documents\\globaldisparos\\backend" && npx ts-node -e "
const sequelize = require('./dist/config/database').default;
const models = require('./dist/models');

(async () => {
  try {
    await sequelize.authenticate();
    const instances = await models.WhatsAppInstance.findAll({
      where: { isActive: true },
      attributes: ['name', 'status', 'phoneNumber', 'connectedAt'],
      raw: true
    });
    
    console.log('\\n=== STATUS DAS INSTÂNCIAS ATIVAS ===\\n');
    instances.forEach(i => {
      const status = i.status === 'connected' ? '✅' : '❌';
      console.log(\`\${status} \${i.name}: \${i.status} (Tel: \${i.phoneNumber || 'N/A'})\`);
    });
    console.log('\\n');
    process.exit(0);
  } catch (e) {
    console.error('Erro:', e.message);
    process.exit(1);
  }
})()" 2>&1`;

exec(cmd, (error, stdout, stderr) => {
  let output = (stdout + stderr).split('\n');
  output = output.filter(line => 
    line.includes('STATUS DAS INSTÂNCIAS') || 
    line.includes('✅') || 
    line.includes('❌') ||
    (line.trim() === '')
  );
  console.log(output.join('\n'));
});
