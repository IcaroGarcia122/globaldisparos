import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import whatsappService from '../adapters/whatsapp.config';
import groupDispatchService from '../services/groupDispatchService';
import logger from '../utils/logger';

const router = Router();

/**
 * Obtém grupos de uma instância
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { instanceId } = req.query;

    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId é obrigatório' });
    }

    logger.info(`📋 Obtendo grupos da instância ${instanceId}...`);

    const groups = await whatsappService.getGroups(Number(instanceId));

    res.json(groups || []);
  } catch (error: any) {
    logger.error(`❌ Erro ao obter grupos:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sincroniza grupos da instância
 */
router.get('/sync/:instanceId', authenticate, async (req, res) => {
  try {
    const groups = await whatsappService.getGroups(Number(req.params.instanceId));
    res.json({ message: `${groups.length} grupos sincronizados`, groups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Obtém participantes de um grupo
 */
router.get('/:groupId/participants', authenticate, async (req, res) => {
  try {
    const { instanceId } = req.query;
    const participants = await whatsappService.getGroupParticipants(Number(instanceId), req.params.groupId);
    res.json({ groupId: req.params.groupId, participants, total: participants.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Exporta participantes como XLSX
 */
router.get('/:groupId/export-xlsx', authenticate, async (req: AuthRequest, res) => {
  try {
    const { instanceId, excludeAdmins } = req.query;
    
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId é obrigatório' });
    }

    logger.info(`📥 Exportando grupo ${req.params.groupId}...`);

    const buffer = await groupDispatchService.exportGroupParticipantsXLSX(
      Number(instanceId),
      req.params.groupId,
      excludeAdmins === 'true'
    );

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="participantes_${req.params.groupId}.xlsx"`);
    res.send(buffer);
  } catch (error: any) {
    logger.error(`❌ Erro ao exportar XLSX:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Inicia disparo em grupo (DEPRECATED - use /campaigns instead)
 */
router.post('/:groupId/dispatch', authenticate, async (req: AuthRequest, res) => {
  return res.status(410).json({ 
    error: 'Esta rota foi removida. Use POST /campaigns com groupId ao invés disso.' 
  });
});

export default router;

