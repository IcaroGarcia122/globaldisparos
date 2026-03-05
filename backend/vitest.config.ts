import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Usar ambiente Node.js (não jsdom)
    environment: 'node',
    
    // Arquivo de setup executado antes dos testes
    setupFiles: ['./src/__tests__/setup.ts'],
    
    // API global do Vitest disponível sem imports
    globals: true,
    
    // Timeout padrão para testes (ms)
    testTimeout: 10000,
    
    // Timeout para hooks (beforeAll, afterAll, etc)
    hookTimeout: 10000,
    
    // Reporter de saída
    reporters: ['verbose'],
    
    // Cobertura de testes
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.integration.test.ts',
        'src/server.ts',
      ],
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
    
    // Incluir apenas arquivos de teste UNITÁRIOS (não integração)
    // Testes de integração requerem PostgreSQL rodando
    include: ['src/**/*.test.ts', '!src/**/*.integration.test.ts'],
    exclude: ['node_modules', 'dist'],
    
    // Limpar buffer de console entre testes
    clearMocks: true,
    restoreMocks: true,
    
    // Validar atualizações de snapshots
    snapshotFormat: {
      printBasicPrototype: false,
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
