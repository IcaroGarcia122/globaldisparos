import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { WhatsAppInstance, User } from '../../models';
import instancesRouter from '../instances';
import { authenticate } from '../../middleware/auth';

// Mock do WhatsAppInstance
vi.mock('../../models', () => ({
  WhatsAppInstance: {
    count: vi.fn(),
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    destroy: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
  },
}));

// Mock do whatsappService
vi.mock('../../adapters/whatsapp.config', () => ({
  default: {
    getQRCode: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeConnection: vi.fn(),
  },
}));

describe('Instances Routes - POST /instances', () => {
  let app: Express;
  let token: string;
  const userId = 1;
  const userEmail = 'test@example.com';
  const secret = 'test-secret-key-for-vitest-only-change-in-production';

  beforeEach(() => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/instances', instancesRouter);

    // Generate valid JWT token using the secret from .env.test
    token = jwt.sign(
      { userId, email: userEmail },
      secret,
      { expiresIn: '24h' }
    );

    // Mock User.findByPk to return a valid user
    vi.mocked(User.findByPk).mockResolvedValue({
      id: userId,
      email: userEmail,
      isActive: true,
      role: 'user',
      plan: 'pro', // Plano pro com 3 instâncias
    } as any);

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /instances - Create new instance', () => {
    it('should return 201 when instance is created successfully', async () => {
      const newInstance = {
        id: 1,
        userId,
        name: 'Instance 1',
        accountAge: 30,
        status: 'disconnected',
        isActive: true,
      };

      vi.mocked(WhatsAppInstance.count).mockResolvedValue(0);
      vi.mocked(WhatsAppInstance.create).mockResolvedValue(newInstance as any);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newInstance);
      expect(WhatsAppInstance.count).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
        },
      });
      expect(WhatsAppInstance.create).toHaveBeenCalledWith({
        userId,
        name: 'Instance 1',
        accountAge: 30,
        isActive: true,
      });
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .post('/instances')
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .post('/instances')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user is not found', async () => {
      vi.mocked(User.findByPk).mockResolvedValue(null);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 when user is inactive', async () => {
      vi.mocked(User.findByPk).mockResolvedValue({
        id: userId,
        email: userEmail,
        isActive: false,
        role: 'user',
      } as any);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(401);
    });

    it('should return 409 when user has 3 active instances (pro plan limit)', async () => {
      vi.mocked(WhatsAppInstance.count).mockResolvedValue(3);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 4',
          accountAge: 30,
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('Profissional'); // Verifica que menciona o plano
    });

    it('should use accountAge 0 when not provided', async () => {
      const newInstance = {
        id: 1,
        userId,
        name: 'Instance 1',
        accountAge: 0,
        status: 'disconnected',
        isActive: true,
      };

      vi.mocked(WhatsAppInstance.count).mockResolvedValue(0);
      vi.mocked(WhatsAppInstance.create).mockResolvedValue(newInstance as any);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
        });

      expect(response.status).toBe(201);
      expect(WhatsAppInstance.create).toHaveBeenCalledWith({
        userId,
        name: 'Instance 1',
        accountAge: 0,
        isActive: true,
      });
    });

    it('should return 500 when database error occurs', async () => {
      vi.mocked(WhatsAppInstance.count).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Database connection failed');
    });

    it('should return 500 when create fails', async () => {
      vi.mocked(WhatsAppInstance.count).mockResolvedValue(0);
      vi.mocked(WhatsAppInstance.create).mockRejectedValue(
        new Error('Create failed')
      );

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 1',
          accountAge: 30,
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toContain('Create failed');
    });

    it('should handle large accountAge values', async () => {
      const newInstance = {
        id: 1,
        userId,
        name: 'Old Instance',
        accountAge: 3650, // 10 years
        status: 'disconnected',
        isActive: true,
      };

      vi.mocked(WhatsAppInstance.count).mockResolvedValue(0);
      vi.mocked(WhatsAppInstance.create).mockResolvedValue(newInstance as any);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Old Instance',
          accountAge: 3650,
        });

      expect(response.status).toBe(201);
      expect(response.body.accountAge).toBe(3650);
    });

    it('should create instance when user has 2 active instances (limit not reached)', async () => {
      const newInstance = {
        id: 3,
        userId,
        name: 'Instance 3',
        accountAge: 30,
        status: 'disconnected',
        isActive: true,
      };

      vi.mocked(WhatsAppInstance.count).mockResolvedValue(2);
      vi.mocked(WhatsAppInstance.create).mockResolvedValue(newInstance as any);

      const response = await request(app)
        .post('/instances')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Instance 3',
          accountAge: 30,
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBe(3);
    });
  });

  describe('GET /instances - List user instances', () => {
    it('should return 200 with active instances only by default', async () => {
      const instances = [
        {
          id: 1,
          userId,
          name: 'Instance 1',
          status: 'connected',
          isActive: true,
        },
      ];

      vi.mocked(WhatsAppInstance.findAll).mockResolvedValue(instances as any);

      const response = await request(app)
        .get('/instances')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(instances);
      expect(WhatsAppInstance.findAll).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: true,
        },
      });
    });

    it('should return all instances including inactive when all=true', async () => {
      const instances = [
        { id: 1, userId, name: 'Instance 1', isActive: true },
        { id: 2, userId, name: 'Instance 2', isActive: false },
      ];

      vi.mocked(WhatsAppInstance.findAll).mockResolvedValue(instances as any);

      const response = await request(app)
        .get('/instances?all=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(WhatsAppInstance.findAll).toHaveBeenCalledWith({
        where: {
          userId,
        },
      });
    });

    it('should return 401 without valid token', async () => {
      const response = await request(app).get('/instances');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /:id - Delete instance', () => {
    it('should return 200 when instance is deleted successfully', async () => {
      const instance = {
        id: 1,
        userId,
        name: 'Instance 1',
        status: 'disconnected',
        isActive: true,
        update: vi.fn().mockResolvedValue({
          id: 1,
          isActive: false,
        }),
      };

      vi.mocked(WhatsAppInstance.findOne).mockResolvedValue(instance as any);

      const response = await request(app)
        .delete('/instances/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(instance.update).toHaveBeenCalledWith({ isActive: false });
    });

    it('should return 404 when instance not found', async () => {
      vi.mocked(WhatsAppInstance.findOne).mockResolvedValue(null);

      const response = await request(app)
        .delete('/instances/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('não encontrada');
    });

    it('should return 401 without valid token', async () => {
      const response = await request(app).delete('/instances/1');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /cleanup/inactive - Cleanup inactive instances', () => {
    it('should return 200 and remove inactive instances', async () => {
      vi.mocked(WhatsAppInstance.destroy).mockResolvedValue(2);

      const response = await request(app)
        .post('/instances/cleanup/inactive')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.deletedCount).toBe(2);
      expect(WhatsAppInstance.destroy).toHaveBeenCalledWith({
        where: {
          userId,
          isActive: false,
        },
      });
    });

    it('should return 401 without valid token', async () => {
      const response = await request(app).post('/instances/cleanup/inactive');

      expect(response.status).toBe(401);
    });
  });
});
