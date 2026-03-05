#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║               RODANDO TESTES AUTOMATIZADOS                 ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const backendDir = 'c:\\Users\\Icaro Garcia\\Documents\\globaldisparos\\backend';

console.log('[1/3] Compilando TypeScript...');
const build = spawn('npm', ['run', 'build'], {
  cwd: backendDir,
  stdio: 'pipe',
  shell: true
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('✓ Build concluído com sucesso\n');
    console.log('[2/3] Rodando suite de testes Vitest...\n');
    
    const test = spawn('npm', ['test'], {
      cwd: backendDir,
      stdio: 'inherit',
      shell: true
    });

    test.on('close', (testCode) => {
      console.log('\n[3/3] Testes concluídos');
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      if (testCode === 0) {
        console.log('║  ✅ TODOS OS TESTES PASSARAM COM SUCESSO!                 ║');
      } else {
        console.log('║  ⚠️  ALGUNS TESTES FALHARAM, VERIFIQUE OS LOGS ACIMA       ║');
      }
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      process.exit(testCode);
    });
  } else {
    console.log('❌ Build falhou!');
    process.exit(1);
  }
});
