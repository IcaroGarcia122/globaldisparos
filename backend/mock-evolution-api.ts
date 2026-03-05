import express from 'express';

const app = express();
app.use(express.json());

const PORT = 18080;
const mockQRCodes = new Map<string, { qr: string; createdAt: number }>();
const mockConnectedInstances = new Set<string>();

// Logger simples
const logger = {
  info: (msg: string) => console.log(`[MOCK-API] ✅ ${msg}`),
  error: (msg: string) => console.error(`[MOCK-API] ❌ ${msg}`),
  debug: (msg: string) => console.log(`[MOCK-API] 🔍 ${msg}`),
};

// Rota de criação de instância (chamada pelo connect())
app.post('/instance/create', (req: any, res: any) => {
  const { instanceName, token } = req.body;
  
  if (!instanceName) {
    logger.error('POST /instance/create - instanceName obrigatório');
    return res.status(400).json({ error: 'instanceName required' });
  }

  logger.info(`POST /instance/create - Instância: ${instanceName}`);
  
  // Gerar QR code simulado com data URL base64
  const mockQRContent = `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="white" width="200" height="200"/><text x="50%" y="50%" font-size="20" text-anchor="middle" dominant-baseline="middle">QR_${instanceName}</text></svg>`
  ).toString('base64')}`;
  
  mockQRCodes.set(instanceName, {
    qr: mockQRContent,
    createdAt: Date.now()
  });

  logger.info(`Instância criada com QR gerado: ${instanceName}`);

  res.status(201).json({
    status: 'success',
    message: 'Instância criada com sucesso',
    instanceName,
    instanceId: instanceName,
  });
});

// Rota para obter QR code (chamada pelo polling)
app.get('/instance/qrcode/:instanceId', (req: any, res: any) => {
  const { instanceId } = req.params;
  
  logger.debug(`GET /instance/qrcode/${instanceId}`);
  
  // Simular pequeno delay de I/O
  setTimeout(() => {
    const stored = mockQRCodes.get(instanceId);
    const qrData = stored?.qr || `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="white" width="200" height="200"/><text x="50%" y="50%" font-size="16" text-anchor="middle" dominant-baseline="middle">QR_${instanceId}</text></svg>`
    ).toString('base64')}`;
    
    const response = {
      qr: qrData,  // Campo principal: qr
      qrcode: qrData, // Compatibilidade com versões anteriores
      pairingStatus: 'WAITING_FOR_SCAN',
      timestamp: Date.now(),
      instanceId,
    };
    
    logger.debug(`QR retornado para ${instanceId} (tamanho: ${qrData.length} chars)`);
    res.json(response);
  }, 300);
});

// Mock de escaneamento automático (para testes)
app.post('/instance/:instanceId/simulate-scan', (req: any, res: any) => {
  const { instanceId } = req.params;
  logger.info(`Simulando scan QR para ${instanceId}`);
  mockConnectedInstances.add(instanceId);
  res.json({ status: 'scanned', instanceId });
});

// Rota para enviar mensagens
app.post('/message/sendText', (req: any, res: any) => {
  const { instanceName, number, text } = req.body;
  
  if (!mockConnectedInstances.has(instanceName)) {
    logger.error(`Instância ${instanceName} não conectada`);
    return res.status(400).json({ error: 'Instância não conectada' });
  }
  
  logger.info(`POST /message/sendText - Para: ${number}`);
  
  res.json({
    status: 'success',
    message: 'Mensagem enviada',
    timestamp: Date.now(),
  });
});

// Rota para buscar chats
app.get('/chat/findChats/:instanceId', (req: any, res: any) => {
  const { instanceId } = req.params;
  
  logger.debug(`GET /chat/findChats/${instanceId}`);
  
  res.json({
    chats: [
      { id: '1@s.whatsapp.net', name: 'Chat 1', isGroup: false },
      { id: '2@s.whatsapp.net', name: 'Chat 2', isGroup: false },
    ],
  });
});

// Rota para buscar membros do grupo
app.get('/group/getGroupMembers/:instanceId/:groupId', (req: any, res: any) => {
  const { instanceId, groupId } = req.params;
  
  logger.debug(`GET /group/getGroupMembers/${instanceId}/${groupId}`);
  
  res.json({
    members: [
      { id: '1@s.whatsapp.net', name: 'Membro 1' },
      { id: '2@s.whatsapp.net', name: 'Membro 2' },
    ],
  });
});

// Rota para buscar instâncias
app.get('/instance/fetchInstancesNow', (req: any, res: any) => {
  logger.debug(`GET /instance/fetchInstancesNow`);
  
  res.json({
    instances: Array.from(mockQRCodes.entries()).map(([name, data]) => ({
      instanceName: name,
      status: mockConnectedInstances.has(name) ? 'connected' : 'disconnected',
      qrcode: data.qr,
    })),
  });
});

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({ status: 'ok', message: 'Mock Evolution API running', timestamp: Date.now() });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🌐 Mock Evolution API rodando em http://0.0.0.0:${PORT}`);
  logger.info(`   ✓ Escutando em http://127.0.0.1:${PORT}`);
  logger.info(`   ✓ Endpoints: POST /instance/create, GET /instance/qrcode/:id`);
});
