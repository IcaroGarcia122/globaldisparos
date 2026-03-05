import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Campaign, WhatsAppInstance } from '../models';
import antiBanService from '../services/antiBanService';
import logger from '../utils/logger';

const router = Router();

/**
 * Estatísticas gerais do usuário
 */
router.get('/user', authenticate, async (req: AuthRequest, res) => {
  try {
    const instances = await WhatsAppInstance.findAll({ where: { userId: req.user!.id } });
    const campaigns = await Campaign.findAll({ where: { userId: req.user!.id } });
    const totalSent = instances.reduce((sum, i) => sum + (i.totalMessagesSent || 0), 0);
    const totalFailed = instances.reduce((sum, i) => sum + (i.totalMessagesFailed || 0), 0);

    const stats = {
      totalInstances: instances.length,
      connectedInstances: instances.filter((i) => i.status === 'connected').length,
      disconnectedInstances: instances.filter((i) => i.status === 'disconnected').length,
      banningInstances: instances.filter((i) => i.status === 'banned').length,
      totalCampaigns: campaigns.length,
      runningCampaigns: campaigns.filter((c) => c.status === 'running').length,
      completedCampaigns: campaigns.filter((c) => c.status === 'completed').length,
      totalMessagesSent: totalSent,
      totalMessagesFailed: totalFailed,
      successRate: totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) + '%' : '0%',
      dailyAverage: Math.round(totalSent / (campaigns.length || 1)),
    };

    res.json(stats);
  } catch (error: any) {
    logger.error('Erro ao buscar stats do usuário:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Estatísticas de uma instância
 */
router.get('/instance/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const instance = await WhatsAppInstance.findByPk(req.params.id);

    if (!instance || instance.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const info = await antiBanService.getAntiBanInfo(req.params.id);

    res.json({
      id: instance.id,
      name: instance.name,
      phoneNumber: instance.phoneNumber,
      status: instance.status,
      accountAge: instance.accountAge,
      connectedAt: instance.connectedAt,
      totalMessagesSent: instance.totalMessagesSent,
      totalMessagesFailed: instance.totalMessagesFailed,
      dailyMessagesSent: instance.dailyMessagesSent,
      antiBanInfo: info,
    });
  } catch (error: any) {
    logger.error('Erro ao buscar stats da instância:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Status geral do anti-ban
 */
router.get('/antiban/status', authenticate, async (req: AuthRequest, res) => {
  try {
    const instances = await WhatsAppInstance.findAll({ where: { userId: req.user!.id } });

    const status = {
      totalInstances: instances.length,
      healthyInstances: instances.filter((i) => i.status === 'connected').length,
      bannedInstances: instances.filter((i) => i.status === 'banned').length,
      warningInstances: instances.filter((i) => {
        const failRate = (i.totalMessagesFailed || 0) / ((i.totalMessagesSent || 0) + (i.totalMessagesFailed || 0)) || 0;
        return failRate > 0.5 && failRate < 0.7;
      }).length,
      instances: instances.map((i) => ({
        id: i.id,
        name: i.name,
        status: i.status,
        accountAge: i.accountAge,
        totalSent: i.totalMessagesSent || 0,
        totalFailed: i.totalMessagesFailed || 0,
        failRate: ((i.totalMessagesFailed || 0) / ((i.totalMessagesSent || 0) + (i.totalMessagesFailed || 0))).toFixed(2),
      })),
    };

    res.json(status);
  } catch (error: any) {
    logger.error('Erro ao buscar status anti-ban:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
