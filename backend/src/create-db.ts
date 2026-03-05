/**
 * Script para criar o banco de dados PostgreSQL
 * Execute com: psql -U postgres -c "CREATE DATABASE globaldisparos;"
 */

import { Client } from 'pg';

const createDatabase = async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'icit0707',
    database: 'postgres', // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');

    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = 'globaldisparos'`
    );

    if (result.rows.length === 0) {
      console.log('🔨 Criando banco de dados globaldisparos...');
      await client.query('CREATE DATABASE globaldisparos;');
      console.log('✅ Banco de dados criado com sucesso!');
    } else {
      console.log('✅ Banco de dados já existe');
    }

    await client.end();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

createDatabase();
