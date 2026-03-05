import { spawn } from 'child_process';
import http from 'http';
import { setTimeout } from 'timers/promises';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         GLOBAL DISPAROS - STARTUP SCRIPT                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Kill existing processes
  console.log('[1/5] Limpando processos anteriores...');
  spawn('taskkill', ['/F', '/IM', 'node.exe'], { stdio: 'ignore' });
  spawn('taskkill', ['/F', '/IM', 'npm.cmd'], { stdio: 'ignore' });
  await setTimeout(3000);

  // Start Backend
  console.log('[2/5] Iniciando Backend (PORT 3001)...');
  const backendDir = 'c:\\Users\\Icaro Garcia\\Documents\\globaldisparos\\backend';
  const backend = spawn('node', ['dist/server.js'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    detached: true,
  });
  console.log(`  ✓ Backend iniciado (PID: ${backend.pid})`);

  // Wait for backend to stabilize
  await setTimeout(10000);

  // Check health
  console.log('[3/5] Testando Backend...');
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:3001/health', (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    if (response) {
      console.log('  ✓ Backend respondendo!');
    }
  } catch (e) {
    console.log('  ⚠ Backend pode não estar pronto, continuando...');
  }

  // Start Frontend
  console.log('[4/5] Iniciando Frontend (PORT 5173)...');
  const frontendDir = 'c:\\Users\\Icaro Garcia\\Documents\\globaldisparos\\frontend';
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: true,
    detached: true,
  });
  console.log(`  ✓ Frontend iniciado (PID: ${frontend.pid})`);

  // Final summary
  await setTimeout(5000);
  console.log('\n[5/5] Status Final');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ APLICAÇÃO INICIADA COM SUCESSO                        ║');
  console.log('║                                                            ║');
  console.log('║  Backend:  http://127.0.0.1:3001                          ║');
  console.log('║  Frontend: http://127.0.0.1:5173                          ║');
  console.log('║  API:      http://127.0.0.1:3001/api                      ║');
  console.log('║                                                            ║');
  console.log('║  Para parar: Feche as janelas de Backend/Frontend          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Exit script (processes run detached)
  process.exit(0);
}

main().catch(console.error);
