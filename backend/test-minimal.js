#!/usr/bin/env node

/**
 * Backend simplificado para testes de QR Code
 * Funcionalidade MÍNIMA: Login + Criar Instância + Obter QR Code
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const app = express();
const JWT_SECRET = 'test_secret_key_123';

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// SIMULAÇÃO DE BANCO DE DADOS
// ==========================================

const users = new Map();
const instances = new Map();
let nextInstanceId = 1;

// Criar admin padrão
users.set('admin@gmail.com', {
  id: 'admin-001',
  email: 'admin@gmail.com',
  password: 'vip2026',
  plan: 'enterprise',
  role: 'admin'
});

// ==========================================
// HELPERS
// ==========================================

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token ausente' });
  }
  
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// ==========================================
// ROTAS
// ==========================================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log(`[AUTH] Login attempt: ${email}`);
  
  const user = users.get(email);
  
  if (!user || user.password !== password) {
    console.log(`[AUTH] ❌ Login failed for ${email}`);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }
  
  const token = generateToken(user);
  console.log(`[AUTH] ✅ Login successful for ${email}`);
  
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
      role: user.role
    }
  });
});

// Criar instância
app.post('/api/instances', authenticate, async (req, res) => {
  try {
    const { name, accountAge } = req.body;
    const userId = req.user.id;
    
    console.log(`[INSTANCE] Creating: ${name} for user ${userId}`);
    
    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    const instanceId = nextInstanceId++;
    const instance = {
      id: instanceId,
      userId,
      name,
      accountAge: accountAge || 0,
      status: 'connecting',
      qrCode: null,
      createdAt: new Date()
    };
    
    instances.set(instanceId, instance);
    
    console.log(`[INSTANCE] ✅ Created with ID ${instanceId}`);
    
    res.status(201).json({
      id: instanceId,
      ...instance
    });
  } catch (error) {
    console.error('[INSTANCE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obter QR Code - ROTA CRÍTICA
app.get('/api/instances/:id/qr', authenticate, async (req, res) => {
  try {
    const instanceId = Number(req.params.id);
    const userId = req.user.id;
    
    console.log(`[QR-CODE] GET /${instanceId} from user ${userId}`);
    
    const instance = instances.get(instanceId);
    
    if (!instance) {
      console.log(`[QR-CODE] ❌ Instance ${instanceId} not found`);
      return res.status(404).json({ error: 'Instância não encontrada' });
    }
    
    // Verificar propriedade (ESTE ERA O ERRO 403!)
    if (instance.userId !== userId && req.user.role !== 'admin') {
      console.log(`[QR-CODE] ❌ Access denied: Instance owned by ${instance.userId}, accessed by ${userId}`);
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Se já está conectado, retorna mensagem
    if (instance.status === 'connected') {
      console.log(`[QR-CODE] ✅ Instance ${instanceId} already connected`);
      return res.json({
        qrCode: null,
        status: 'connected',
        message: 'WhatsApp já conectado'
      });
    }
    
    // Se já gerou QR Code, retorna
    if (instance.qrCode) {
      console.log(`[QR-CODE] 📱 Returning cached QR for ${instanceId}`);
      return res.json({
        qrCode: instance.qrCode,
        status: 'pending',
        message: 'QR Code gerado'
      });
    }
    
    // Gerar novo QR Code
    console.log(`[QR-CODE] 🔧 Generating new QR for ${instanceId}...`);
    
    const qrData = {
      instanceId,
      userId,
      timestamp: new Date().toISOString(),
      message: 'Escaneie com WhatsApp'
    };
    
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
    
    instance.qrCode = qrCode;
    
    console.log(`[QR-CODE] ✅ Generated QR Code (${qrCode.length} bytes)`);
    
    res.json({
      qrCode,
      status: 'pending',
      message: 'QR Code gerado - Escaneie com WhatsApp'
    });
    
  } catch (error) {
    console.error('[QR-CODE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar instâncias
app.get('/api/instances', authenticate, (req, res) => {
  const userId = req.user.id;
  const userInstances = Array.from(instances.values()).filter(i => i.userId === userId);
  
  res.json(userInstances);
});

// ==========================================
// START SERVER
// ==========================================

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║  🚀 TESTE BACKEND MINIMALISTA                      ║
║                                                    ║
║  🔗 http://localhost:${PORT}                         ║
║  🏥 Health: http://localhost:${PORT}/health            ║
║                                                    ║
║  📝 Login: POST /api/auth/login                    ║
║     {                                              ║
║       "email": "admin@gmail.com",                  ║
║       "password": "vip2026"                        ║
║     }                                              ║
║                                                    ║
║  📱 QR Code: GET /api/instances/:id/qr             ║
║     (com Authorization: Bearer <token>)            ║
║                                                    ║
╚════════════════════════════════════════════════════╝
  `);
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});
