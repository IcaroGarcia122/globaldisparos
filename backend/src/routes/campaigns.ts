import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Campaign, Message } from '../models';
import campaignService from '../services/campaignService';
import logger from '../utils/logger';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaign = await campaignService.createCampaign({ 
      userId: req.user!.id, 
      ...req.body 
    });
    
    logger.info(`✅ Campanha criada: ${campaign.id}`);
    res.status(201).json(campaign);
  } catch (error: any) {
    logger.error(`❌ Erro ao criar campanha:`, error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaigns = await Campaign.findAll({ where: { userId: req.user!.id } });
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/start', authenticate, async (req: AuthRequest, res) => {
  try {
    await campaignService.startCampaign(Number(req.params.id));
    res.json({ message: 'Campanha iniciada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/pause', authenticate, async (req: AuthRequest, res) => {
  try {
    await campaignService.pauseCampaign(Number(req.params.id));
    res.json({ message: 'Campanha pausada' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaign = await Campaign.findByPk(Number(req.params.id), {
      attributes: ['id', 'name', 'message', 'status', 'totalContacts', 'messagesSent', 'messagesFailed', 'startedAt', 'completedAt', 'createdAt']
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }
    
    const progress = await campaignService.getCampaignProgress(Number(req.params.id));
    
    res.json({
      ...progress,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res) => {
  try {
    await campaignService.cancelCampaign(Number(req.params.id));
    res.json({ message: 'Campanha cancelada com sucesso' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/campaigns/:id
 * Obter dados completos da campanha com métricas para dashboard
 */
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number(req.params.id);
    
    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Calcular métricas
    const metrics = await campaignService.getCampaignMetrics(campaignId);
    
    // Buscar mensagens recentes
    const recentMessages = await Message.findAll({
      where: { campaignId },
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Gerar timeline para gráfico
    const timeline = await campaignService.getCampaignTimeline(campaignId);

    res.json({
      campaign,
      metrics,
      recentContacts: recentMessages.map((msg: any) => ({
        id: msg.id,
        phone: msg.phone,
        name: msg.contactName,
        status: msg.status,
        sentAt: msg.sentAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt,
        error: msg.error
      })),
      timeline
    });

  } catch (error: any) {
    logger.error(`❌ Erro ao buscar campanha:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/campaigns/:id/status
 * Alterar status da campanha (pause, resume, stop)
 */
router.patch('/:id/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number(req.params.id);
    const { status } = req.body;

    if (!['running', 'paused', 'stopped', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    await campaign.update({ status });
    
    logger.info(`✅ Status da campanha ${campaignId} alterado para ${status}`);
    res.json({ success: true, status });

  } catch (error: any) {
    logger.error(`❌ Erro ao alterar status:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/campaigns/:id/message
 * Alterar mensagem da campanha em tempo real
 */
router.patch('/:id/message', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number(req.params.id);
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem inválida' });
    }

    if (message.length > 4096) {
      return res.status(400).json({ error: 'Mensagem muito longa (máximo 4096 caracteres)' });
    }

    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    await campaign.update({ message });
    
    logger.info(`✅ Mensagem da campanha ${campaignId} atualizada`);
    res.json({ success: true });

  } catch (error: any) {
    logger.error(`❌ Erro ao alterar mensagem:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/campaigns/:id/speed
 * Alterar velocidade de envio
 */
router.patch('/:id/speed', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number(req.params.id);
    const { speed } = req.body;

    if (!speed || typeof speed !== 'number' || speed < 1 || speed > 60) {
      return res.status(400).json({ error: 'Velocidade deve estar entre 1 e 60' });
    }

    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Calcular intervalo em segundos: 60 segundos / velocidade (msgs/min)
    const interval = 60 / speed;
    
    await campaign.update({ 
      messageInterval: interval,
      messageSpeed: speed
    });
    
    logger.info(`✅ Velocidade da campanha ${campaignId} alterada para ${speed} msgs/min`);
    res.json({ success: true, speed });

  } catch (error: any) {
    logger.error(`❌ Erro ao alterar velocidade:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/campaigns/:id/export
 * Exportar relatório da campanha em CSV
 */
router.get('/:id/export', authenticate, async (req: AuthRequest, res) => {
  try {
    const campaignId = Number(req.params.id);

    const campaign = await Campaign.findByPk(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Buscar todas as mensagens
    const messages = await Message.findAll({
      where: { campaignId },
      order: [['createdAt', 'ASC']]
    });

    // Gerar CSV
    const headers = ['Data/Hora', 'Telefone', 'Nome', 'Status', 'Envio', 'Entrega', 'Leitura', 'Erro'];
    const rows = messages.map((msg: any) => [
      msg.createdAt?.toLocaleString('pt-BR'),
      msg.phone,
      msg.contactName || '',
      msg.status,
      msg.sentAt?.toLocaleString('pt-BR') || '-',
      msg.deliveredAt?.toLocaleString('pt-BR') || '-',
      msg.readAt?.toLocaleString('pt-BR') || '-',
      msg.error || '-'
    ].map(v => `"${v}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="campanha-${campaignId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\ufeff' + csv); // BOM for UTF-8
    
    logger.info(`✅ Relatório da campanha ${campaignId} exportado`);

  } catch (error: any) {
    logger.error(`❌ Erro ao exportar:`, error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
