#!/usr/bin/env node
/**
 * Script para iniciar todos os serviços de uma vez
 * Pode fazer controle de PIDs para matar depois
 */

const { spawn } = require('child_process');
const path = require('path');

const baseDir = 'C:\\Users\\Icaro Garcia\\Documents\\globaldisparos';
const backendDir = path.join(baseDir, 'backend');
const frontendDir = path.join(baseDir, 'frontend');

console.log('🚀 Iniciando todos os serviços...\n');

// START Mock API
console.log('📍 [1/3] Iniciando Mock Evolution API...');
const mockApi = spawn('npx', ['ts-node', 'mock-evolution-api.ts'], {
  cwd: backendDir,            // Working directory
  stdio: 'inherit',           // Inherit parent's stdio
  shell: true,
});

// Wait with timeout then start backend
setTimeout(() => {
  // START Backend
  console.log('\n📍 [2/3] Iniciando Backend...');
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
  });

  // Wait with timeout then start frontend
  setTimeout(() => {
    // START Frontend
    console.log('\n📍 [3/3] Iniciando Frontend...');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
    });
  }, 3000);
}, 2000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️  Encerrando serviços...');
  process.exit(0);
});
