import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import dotenv from 'dotenv';

/**
 * Setup file para Vitest
 * Executado antes de todos os testes
 */

// Carregar variáveis de ambiente de teste
dotenv.config({ path: '.env.test' });

// Estouro de stack trace para melhor debug
Error.stackTraceLimit = 50;

// Mock de console para limpar saída dos testes (opcional)
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

// Descomentar se quiser suprimir logs durante testes
/*
global.console = {
  ...console,
  log: () => {},
  error: () => {},
  warn: () => {},
  info: () => {},
  debug: () => {},
};
*/

beforeAll(async () => {
  console.log('\n🧪 =============== INICIANDO SUITE DE TESTES ===============');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
  console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`💾 DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log('===========================================================\n');
});

afterAll(async () => {
  console.log('\n✅ =============== TESTES FINALIZADOS ===============');
  console.log(`📅 ${new Date().toLocaleString('pt-BR')}`);
  console.log('====================================================\n');
});

beforeEach(() => {
  // Reset de estado antes de cada teste (se necessário)
});

afterEach(() => {
  // Limpeza após cada teste
});

// Timeout global para testes (padrão: 10s)
// Se precisar aumentar: { timeout: 30000 } no describe
if (!process.env.VITEST_TIMEOUT) {
  process.env.VITEST_TIMEOUT = '10000';
}
