import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import sequelize from '../../config/database';
import { WhatsAppInstance, User } from '../../models';
import express, { Express } from 'express';
import instancesRouter from '../instances';

/**
 * Testes de Integração para POST /instances
 * 
 * ⚠️ REQUER:
 * - Banco de dados PostgreSQL rodando
 * - Variáveis de ambiente em .env.test
 * - Tabela 'users' sincronizada
 * - Tabela 'whatsapp_instances' sincronizada
 */

describe('Instances Routes - Integration Tests', () => {
  let app: Express;
  let testUser: any;
  let token: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/instances', instancesRouter);

    // Sincronizar modelos com o banco (cria as tabelas se não existirem)
    await sequelize.sync({ force: false });

    // Limpar dados de testes anteriores
    await WhatsAppInstance.destroy({ where: {} });
    await User.destroy({ where: {} });
  });

  afterAll(async () => {
    // Limpar dados de teste
    await WhatsAppInstance.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Fechar conexão com BD
    await sequelize.close();
  });

  beforeEach(async () => {
    // Criar usuário de teste para cada teste
    testUser = await User.create({
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password',
      name: 'Test User',
      isActive: true,
      role: 'user',
      plan: 'pro', // Plano pro com 3 instâncias
    });

    // Gerar token JWT válido
    token = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  });

  describe('POST /instances - Testes de Integração', () => {
    it('✅ Criar instância com sucesso (201)', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance de Teste',
          accountAge: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toMatchObject({
        name: 'Instance de Teste',
        accountAge: 30,
        userId: testUser.id,
        isActive: true,
        status: 'disconnected',
      });

      // Verificar que foi realmente criado no banco
      const instance = await WhatsAppInstance.findByPk(response.body.id);
      expect(instance).toBeTruthy();
      expect(instance.name).toBe('Instance de Teste');
    });

    it('✅ Criar instância com accountAge padrão (0) quando omitido', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance Sem Idade',
        });

      expect(response.status).toBe(201);
      expect(response.body.accountAge).toBe(0);
    });

    it('❌ Rejeitar sem token de autenticação (401)', async () => {
      const response = await request(app)
        .post('/instances')
        .send({
          name: 'Instance',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('❌ Rejeitar token inválido (401)', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', 'Bearer invalid-token-xyz')
        .send({
          name: 'Instance',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
    });

    it('❌ Rejeitar quando usuário não existe (401)', async () => {
      // Token com userId inválido
      const fakeToken = jwt.sign(
        { userId: 99999, email: 'fake@example.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          name: 'Instance',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Usuário inválido');
    });

    it('❌ Rejeitar quando usuário está inativo (401)', async () => {
      // Desativar usuário
      await testUser.update({ isActive: false });

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inativo');
    });

    it('❌ Rejeitar quando usuário atingir limite de 3 instâncias (409)', async () => {
      // Criar 3 instâncias ativas
      for (let i = 1; i <= 3; i++) {
        await WhatsAppInstance.create({
          userId: testUser.id,
          name: `Instance ${i}`,
          isActive: true,
        });
      }

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 4',
          accountAge: 30,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Profissional'); // Verifica que menciona o plano pro
    });

    it('✅ Permitir criar nova instância ao atingir limite com 1 inativa', async () => {
      // Criar 2 instâncias ativas
      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Instance 1',
        isActive: true,
      });

      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Instance 2',
        isActive: true,
      });

      // Criar 1 inativa
      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Instance 3 Inativa',
        isActive: false,
      });

      // Deve rejeitar pois há 2 ativas (limite é 3)
      // Mas se fosse 3, rejeitaria
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 3 Ativa',
          accountAge: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body.isActive).toBe(true);

      // Verificar total de instâncias (3 ativas + 1 inativa)
      const total = await WhatsAppInstance.count({
        where: { userId: testUser.id },
      });
      expect(total).toBe(4);
    });

    it('✅ Instâncias de usuários diferentes não afetam limite', async () => {
      // Criar segundo usuário
      const user2 = await User.create({
        email: `test2-${Date.now()}@example.com`,
        password: 'hashed_password',
        name: 'Test User 2',
        isActive: true,
        role: 'user',
        plan: 'basic', // Plano basic com 1 instância
      });

      const token2 = jwt.sign(
        { userId: user2.id, email: user2.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      // User1 cria 3 instâncias
      for (let i = 1; i <= 3; i++) {
        await WhatsAppInstance.create({
          userId: testUser.id,
          name: `User1 Instance ${i}`,
          isActive: true,
        });
      }

      // User2 deve conseguir criar normalmente
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          name: 'User2 Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body.userId).toBe(user2.id);

      // Limpeza
      await user2.destroy();
    });

    it('✅ Aceitar valores grandes de accountAge', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Old Account',
          accountAge: 3650, // 10 anos
        });

      expect(response.status).toBe(201);
      expect(response.body.accountAge).toBe(3650);
    });

    it('✅ Aceitar accountAge = 0', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'New Account',
          accountAge: 0,
        });

      expect(response.status).toBe(201);
      expect(response.body.accountAge).toBe(0);
    });

    it('❌ Campo name é obrigatório', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accountAge: 30,
          // name omitido propositalmente
        });

      // Express não vai rejeitar automaticamente
      // Mas pode gerar erro ao salvar no banco
      // Esperamos 500 ou validação
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /instances - Testes de Integração', () => {
    beforeEach(async () => {
      // Criar algumas instâncias de teste
      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Active Instance 1',
        status: 'disconnected',
        isActive: true,
      });

      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Inactive Instance',
        status: 'disconnected',
        isActive: false,
      });

      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Active Instance 2',
        status: 'disconnected',
        isActive: true,
      });
    });

    it('✅ Listar apenas instâncias ativas por padrão', async () => {
      const response = await request(app)
        .get('/instances')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2); // 2 ativas
      expect(
        response.body.every((i: any) => i.isActive === true)
      ).toBe(true);
    });

    it('✅ Listar todas as instâncias com all=true', async () => {
      const response = await request(app)
        .get('/instances?all=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3); // 2 ativas + 1 inativa
    });

    it('✅ Retornar array vazio se nenhuma ativa', async () => {
      // Desativar todas
      await WhatsAppInstance.update(
        { isActive: false },
        { where: { userId: testUser.id } }
      );

      const response = await request(app)
        .get('/instances')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('❌ Retornar 401 sem autenticação', async () => {
      const response = await request(app).get('/instances');

      expect(response.status).toBe(401);
    });

    it('✅ Filtro all=false deve listar apenas ativas', async () => {
      const response = await request(app)
        .get('/instances?all=false')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('DELETE /:id - Testes de Integração', () => {
    let testInstance: any;

    beforeEach(async () => {
      testInstance = await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Instance to Delete',
        status: 'connected',
        isActive: true,
      });
    });

    it('✅ Delete marca instância como inativa', async () => {
      const response = await request(app)
        .delete(`/instances/${testInstance.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verificar no banco
      const updated = await WhatsAppInstance.findByPk(testInstance.id);
      expect(updated.isActive).toBe(false);
    });

    it('❌ Não permitir deletar instância de outro usuário', async () => {
      // Criar outro usuário
      const otherUser = await User.create({
        email: `other-${Date.now()}@example.com`,
        password: 'hashed_password',
        name: 'Other User',
        isActive: true,
        role: 'user',
        plan: 'basic', // Plano básico
      });

      // Criar instância para outro usuário
      const otherInstance = await WhatsAppInstance.create({
        userId: otherUser.id,
        name: 'Other User Instance',
        isActive: true,
      });

      const response = await request(app)
        .delete(`/instances/${otherInstance.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);

      // Verificar que não foi deletada
      const stillAlive = await WhatsAppInstance.findByPk(otherInstance.id);
      expect(stillAlive).toBeTruthy();
      expect(stillAlive.isActive).toBe(true);

      // Limpeza
      await otherUser.destroy();
    });

    it('❌ Retornar 404 para instância inexistente', async () => {
      const response = await request(app)
        .delete('/instances/99999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('não encontrada');
    });

    it('❌ Retornar 401 sem autenticação', async () => {
      const response = await request(app).delete(`/instances/${testInstance.id}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /cleanup/inactive - Testes de Integração', () => {
    beforeEach(async () => {
      // Criar instâncias ativas e inativas
      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Active 1',
        isActive: true,
      });

      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Inactive 1',
        isActive: false,
      });

      await WhatsAppInstance.create({
        userId: testUser.id,
        name: 'Inactive 2',
        isActive: false,
      });
    });

    it('✅ Remover apenas instâncias inativas do usuário', async () => {
      const response = await request(app)
        .post('/instances/cleanup/inactive')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(2);

      // Verificar que instâncias ativas não foram deletadas
      const remaining = await WhatsAppInstance.count({
        where: { userId: testUser.id },
      });
      expect(remaining).toBe(1);
    });

    it('✅ Retornar 0 se não houver inativas', async () => {
      // Deletar todas as inativas primeiro
      await WhatsAppInstance.destroy({
        where: { userId: testUser.id, isActive: false },
      });

      const response = await request(app)
        .post('/instances/cleanup/inactive')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(0);
    });

    it('❌ Retornar 401 sem autenticação', async () => {
      const response = await request(app).post('/instances/cleanup/inactive');

      expect(response.status).toBe(401);
    });

    it('✅ Não afetar instâncias de outros usuários', async () => {
      // Criar outro usuário com instâncias inativas
      const otherUser = await User.create({
        email: `cleanup-${Date.now()}@example.com`,
        password: 'hashed_password',
        name: 'Cleanup User',
        isActive: true,
        role: 'user',
        plan: 'basic', // Plano básico
      });

      await WhatsAppInstance.create({
        userId: otherUser.id,
        name: 'Other Inactive',
        isActive: false,
      });

      const otherToken = jwt.sign(
        { userId: otherUser.id, email: otherUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '24h' }
      );

      // Cleanup do primeiro usuário
      const response = await request(app)
        .post('/instances/cleanup/inactive')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(2);

      // Verificar que instância do outro usuário ainda existe
      const otherStillExists = await WhatsAppInstance.count({
        where: { userId: otherUser.id, isActive: false },
      });
      expect(otherStillExists).toBe(1);

      // Limpeza
      await otherUser.destroy();
    });
  });
});
