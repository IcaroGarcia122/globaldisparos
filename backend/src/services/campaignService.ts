import { Campaign, Message, Contact, WhatsAppInstance, ContactList, ActivityLog } from '../models';
import whatsappService from '../adapters/whatsapp.config';
import antiBanService from './antiBanService';
import logger from '../utils/logger';

interface CampaignProgress {
  campaignId: number;
  status: string;
  totalContacts: number;
  messagesSent: number;
  messagesFailed: number;
  messagesRemaining: number;
  currentContact?: number;
  isPaused: boolean;
}

class CampaignService {
  private runningCampaigns: Map<number, boolean> = new Map();

  /**
   * Cria uma nova campanha
   */
  public async createCampaign(data: {
    userId: string;
    instanceId: number;
    contactListId?: string;
    groupId?: string;
    name: string;
    message: string;
    scheduledFor?: Date;
    useAntibanVariations?: boolean;
    useAntibanDelays?: boolean;
    useCommercialHours?: boolean;
  }): Promise<Campaign> {
    try {
      // Valida instância WhatsApp
      const instance = await WhatsAppInstance.findByPk(data.instanceId);
      if (!instance) {
        throw new Error('Instância WhatsApp não encontrada');
      }

      // Valida se instância está conectada
      if (instance.status !== 'connected') {
        throw new Error('Instância WhatsApp não está conectada. Conecte-a antes de criar campanhas.');
      }

      // Se for disparo em grupo, busca participantes do grupo
      let contacts: any[] = [];
      let totalContacts = 0;

      if (data.groupId) {
        // Busca participantes do grupo
        const groupParticipants = await whatsappService.getGroupParticipants(data.instanceId, data.groupId);
        contacts = groupParticipants || [];
        totalContacts = contacts.length;
        logger.info(`📨 Disparo para grupo: ${totalContacts} participantes encontrados`);
      } else if (data.contactListId) {
        // Obtém lista de contatos
        const contactList = await ContactList.findByPk(data.contactListId, {
          include: [{ model: Contact, as: 'contacts' }],
        });

        if (!contactList) {
          throw new Error('Lista de contatos não encontrada');
        }

        contacts = (contactList as any).contacts || [];
        totalContacts = contactList.totalContacts;
      } else {
        throw new Error('Grupo ou lista de contatos é obrigatório');
      }

      if (totalContacts === 0) {
        throw new Error('Nenhum contato encontrado');
      }

      // Cria campanha
      const campaign = await Campaign.create({
        userId: Number(data.userId),
        instanceId: Number(data.instanceId),
        contactListId: data.contactListId ? Number(data.contactListId) : null,
        name: data.name,
        message: data.message,
        scheduledFor: data.scheduledFor || null,
        totalContacts,
        messagesScheduled: totalContacts,
        useAntibanVariations: data.useAntibanVariations ?? true,
        useAntibanDelays: data.useAntibanDelays ?? true,
        useCommercialHours: data.useCommercialHours ?? true,
      });

      // Cria mensagens agendadas
      const messages = contacts.map((contact: any) => ({
        campaignId: campaign.id,
        contactId: contact.id || null,  // null para disparos em grupo
        phoneNumber: contact.phoneNumber || (contact.jid?.split?.('@')[0] || null),
        messageText: data.message,
        status: 'scheduled' as const,
      })).filter(m => m.phoneNumber); // Filtra contatos sem número

      if (messages.length > 0) {
        await Message.bulkCreate(messages);
      }

      // Log de atividade
      await ActivityLog.create({
        userId: Number(data.userId),
        instanceId: Number(data.instanceId),
        action: 'campaign_created',
        details: {
          campaignId: campaign.id,
          campaignName: data.name,
          totalContacts,
          groupId: data.groupId,
        },
        level: 'success',
      });

      logger.info(`✅ Campanha ${campaign.id} criada com ${totalContacts} contatos`);

      return campaign;
    } catch (error) {
      logger.error('Erro ao criar campanha:', error);
      throw error;
    }
  }

  /**
   * Inicia uma campanha de disparo
   */
  public async startCampaign(campaignId: number): Promise<void> {
    try {
      const campaign = await Campaign.findByPk(campaignId, {
        include: [{ model: WhatsAppInstance, as: 'instance' }],
      });

      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      if (campaign.status !== 'pending' && campaign.status !== 'paused') {
        throw new Error('Campanha não pode ser iniciada neste status');
      }

      // Debug: log da instância
      logger.info(`🔍 Verificando instância ${campaign.instanceId}...`);
      
      // Verifica se instância está conectada (em memória ou no banco)
      logger.info(`⏳ Chamando isConnectedOrStored para instância ${campaign.instanceId}...`);
      const isConnected = await whatsappService.isConnectedOrStored(campaign.instanceId);
      
      logger.info(`📊 Resultado da verificação: isConnected = ${isConnected}`);
      
      if (!isConnected) {
        logger.error(`❌ Instância ${campaign.instanceId} não está conectada`);
        throw new Error('Instância WhatsApp não está conectada. Por favor, escaneie o QR code primeiro.');
      }

      logger.info(`✅ Instância ${campaign.instanceId} está conectada - iniciando campanha...`);

      // Atualiza status
      await campaign.update({
        status: 'running',
        startedAt: campaign.startedAt || new Date(),
      });

      // Marca como em execução
      this.runningCampaigns.set(campaignId, true);

      // Log
      await ActivityLog.create({
        userId: campaign.userId,
        instanceId: campaign.instanceId,
        action: 'campaign_started',
        details: {
          campaignId,
          campaignName: campaign.name,
        },
        level: 'info',
      });

      logger.info(`🚀 Campanha ${campaignId} iniciada`);

      // Inicia processo de envio EM BACKGROUND (não bloqueia)
      setImmediate(() => {
        this.processCampaign(campaignId).catch((error) => {
          logger.error(`❌ Erro ao processar campanha ${campaignId}:`, error);
          campaign.update({ status: 'completed' }).catch(err => logger.error('Erro ao atualizar status:', err));
        });
      });
    } catch (error) {
      logger.error('Erro ao iniciar campanha:', error);
      throw error;
    }
  }

  /**
   * Processa uma campanha (envio das mensagens)
   */
  private async processCampaign(campaignId: number): Promise<void> {
    logger.info(`📨 ===== INICIANDO PROCESSAMENTO DA CAMPANHA ${campaignId} =====`);
    
    try {
      const campaign = await Campaign.findByPk(campaignId, {
        include: [{ model: WhatsAppInstance, as: 'instance' }],
      });

      if (!campaign) {
        logger.error(`❌ Campanha não encontrada: ${campaignId}`);
        return;
      }

      logger.info(`📨 Campanha encontrada: ${campaign.name}`);

      // Obtém mensagens pendentes
      const messages = await Message.findAll({
        where: {
          campaignId,
          status: 'scheduled',
        },
        order: [['createdAt', 'ASC']],
      });

      logger.info(`📨 ✅ ${messages.length} mensagens encontradas para enviar`);
      
      if (messages.length === 0) {
        logger.warn(`⚠️ Nenhuma mensagem para enviar na campanha ${campaignId}`);
        await campaign.update({ status: 'completed' });
        return;
      }

      const instance = (campaign as any).instance! as WhatsAppInstance;
      
      logger.info(`🔗 Instância: ${instance.name} (ID: ${instance.id}, Status: ${instance.status})`);
      
      // Verifica se está conectada (com reconexão automática se marcada como conectada)
      const isConnected = await whatsappService.isConnectedOrStored(instance.id);
      
      if (!isConnected) {
        logger.error(`❌ Instância não está conectada e não foi possível reconectar. Status: ${instance.status}`);
        await campaign.update({ status: 'completed' });
        return;
      }
      
      logger.info(`✅ Instância validada para disparo`);
      
      const limits = antiBanService.getLimitsByAccountAge(instance.accountAge);
      let messageCount = 0;
      let failureCount = 0;
      let burstCount = 0;
      const burstLimit = antiBanService.generateBurstLimit();

      logger.info(`⏱️ Limites antiban: ${limits.dailyLimit} msg/dia`);
      
      // Delay padrão entre mensagens (antiban)
      const delayBetweenMessages = 500; // 500ms entre mensagens

      for (const message of messages) {
        // Verifica se campanha ainda está rodando
        if (!this.runningCampaigns.get(campaignId)) {
          logger.info(`⏸️ Campanha ${campaignId} pausada`);
          break;
        }

        // Verifica limite diário
        if (await antiBanService.hasReachedDailyLimit(instance.id)) {
          logger.info(`⏳ Limite diário atingido para instância ${instance.id}`);
          await campaign.update({ status: 'paused' });
          await ActivityLog.create({
            userId: campaign.userId,
            instanceId: instance.id,
            action: 'campaign_daily_limit',
            details: { campaignId, limit: limits.dailyLimit },
            level: 'warning',
          });
          break;
        }

        // Verifica horário comercial
        if (campaign.useCommercialHours && !antiBanService.isCommercialHours()) {
          logger.info(`🌙 Fora do horário comercial. Pausando campanha ${campaignId}`);
          await campaign.update({ status: 'paused' });
          
          // Agenda retomada
          const waitTime = antiBanService.getTimeUntilCommercialHours();
          setTimeout(() => {
            this.startCampaign(campaignId).catch((error) => {
              logger.error(`Erro ao retomar campanha ${campaignId}:`, error);
            });
          }, waitTime);
          break;
        }

        // Verifica detecção de ban
        if (await antiBanService.detectPossibleBan(instance.id)) {
          logger.error(`🚨 Possível ban detectado na instância ${instance.id}`);
          await campaign.update({ status: 'banned' });
          await instance.update({ status: 'banned' });
          await ActivityLog.create({
            userId: campaign.userId,
            instanceId: instance.id,
            action: 'possible_ban_detected',
            details: { campaignId, errorRate: instance.getErrorRate() },
            level: 'error',
          });
          break;
        }

        // Prepara mensagem
        const finalMessage = campaign.message;

        try {
          logger.info(`📤 Enviando para ${message.phoneNumber}...`);
          
          // Envia mensagem
          await whatsappService.sendMessage(instance.id, message.phoneNumber, finalMessage);

          // Atualiza mensagem
          await message.update({
            status: 'sent',
            sentAt: new Date(),
          });

          // Atualiza contadores
          await campaign.increment('messagesSent');
          await instance.increment(['dailyMessagesSent', 'totalMessagesSent']);
          await instance.update({ lastMessageAt: new Date() });

          messageCount++;
          burstCount++;

          logger.info(`✅ Mensagem enviada para ${message.phoneNumber} (${messageCount}/${messages.length})`);
        } catch (error: any) {
          logger.error(`❌ Erro ao enviar mensagem para ${message.phoneNumber}:`, error.message);

          // Atualiza mensagem como falha
          await message.update({
            status: 'failed',
            errorMessage: error.message,
          });

          // Atualiza contadores de falha
          await campaign.increment('messagesFailed');
          await instance.increment('totalMessagesFailed');
        }

        // Controle de burst - pausa a cada X mensagens
        if (burstCount >= burstLimit && campaign.useAntibanDelays) {
          const burstPause = antiBanService.generateBurstPause();
          logger.info(`⏸️ Pausa burst de ${burstPause / 1000}s após ${burstCount} mensagens`);
          await new Promise((resolve) => setTimeout(resolve, burstPause));
          burstCount = 0;
        }

        // Delay entre mensagens
        if (campaign.useAntibanDelays && messageCount < messages.length) {
          const delay = delayBetweenMessages;
          logger.debug(`⏳ Aguardando ${delay / 1000}s antes da próxima mensagem`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Verifica se terminou
      const remainingMessages = await Message.count({
        where: {
          campaignId,
          status: 'scheduled',
        },
      });

      if (remainingMessages === 0) {
        await campaign.update({
          status: 'completed',
          completedAt: new Date(),
        });

        await ActivityLog.create({
          userId: campaign.userId,
          instanceId: campaign.instanceId,
          action: 'campaign_completed',
          details: {
            campaignId,
            messagesSent: campaign.messagesSent,
            messagesFailed: campaign.messagesFailed,
            successRate: campaign.getSuccessRate().toFixed(2) + '%',
          },
          level: 'success',
        });

        logger.info(`🎉 Campanha ${campaignId} concluída!`);
      }

      // Remove das campanhas em execução
      this.runningCampaigns.delete(campaignId);
    } catch (error) {
      logger.error(`Erro ao processar campanha ${campaignId}:`, error);
      
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        await campaign.update({ status: 'paused' });
      }

      this.runningCampaigns.delete(campaignId);
    }
  }

  /**
   * Pausa uma campanha
   */
  public async pauseCampaign(campaignId: number): Promise<void> {
    try {
      this.runningCampaigns.set(campaignId, false);
      
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        await campaign.update({ status: 'paused' });

        await ActivityLog.create({
          userId: campaign.userId,
          instanceId: campaign.instanceId,
          action: 'campaign_paused',
          details: { campaignId, campaignName: campaign.name },
          level: 'info',
        });
      }

      logger.info(`⏸️ Campanha ${campaignId} pausada`);
    } catch (error) {
      logger.error('Erro ao pausar campanha:', error);
      throw error;
    }
  }

  /**
   * Cancela uma campanha
   */
  public async cancelCampaign(campaignId: number): Promise<void> {
    try {
      this.runningCampaigns.delete(campaignId);
      
      const campaign = await Campaign.findByPk(campaignId);
      if (campaign) {
        await campaign.update({ status: 'cancelled' });

        await ActivityLog.create({
          userId: campaign.userId,
          instanceId: campaign.instanceId,
          action: 'campaign_cancelled',
          details: { campaignId, campaignName: campaign.name },
          level: 'warning',
        });
      }

      logger.info(`❌ Campanha ${campaignId} cancelada`);
    } catch (error) {
      logger.error('Erro ao cancelar campanha:', error);
      throw error;
    }
  }

  /**
   * Obtém progresso de uma campanha
   */
  public async getCampaignProgress(campaignId: number): Promise<CampaignProgress | null> {
    try {
      const campaign = await Campaign.findByPk(campaignId);
      if (!campaign) return null;

      return {
        campaignId: campaign.id,
        status: campaign.status,
        totalContacts: campaign.totalContacts,
        messagesSent: campaign.messagesSent,
        messagesFailed: campaign.messagesFailed,
        messagesRemaining: campaign.totalContacts - campaign.messagesSent - campaign.messagesFailed,
        isPaused: !this.runningCampaigns.get(campaignId),
      };
    } catch (error) {
      logger.error('Erro ao obter progresso da campanha:', error);
      return null;
    }
  }

  /**
   * Calcula métricas detalhadas de uma campanha para o dashboard
   */
  public async getCampaignMetrics(campaignId: number): Promise<any> {
    try {
      const campaign = await Campaign.findByPk(campaignId);
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      // Busca todas as mensagens
      const messages = await Message.findAll({
        where: { campaignId }
      });

      // Calcula métricas
      const total = messages.length;
      const pending = messages.filter(m => m.status === 'scheduled').length;
      const sent = messages.filter(m => m.status === 'sent' || m.status === 'delivered' || m.status === 'read' || m.status === 'failed').length;
      const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
      const read = messages.filter(m => m.status === 'read').length;
      const error = messages.filter(m => m.status === 'failed').length;

      // Calcula taxa de sucesso
      const successRate = total > 0 ? ((sent - error) / total) * 100 : 0;

      // Calcula velocidade (mensagens por minuto)
      let currentSpeed = 0;
      if (campaign.startedAt) {
        const elapsedMilliseconds = Date.now() - new Date(campaign.startedAt).getTime();
        const elapsedMinutes = elapsedMilliseconds / (1000 * 60);
        currentSpeed = elapsedMinutes > 0 ? Math.round((sent / elapsedMinutes) * 100) / 100 : 0;
      }

      // Calcula tempo restante estimado
      let estimatedTimeRemaining = 0;
      if (currentSpeed > 0 && pending > 0) {
        estimatedTimeRemaining = Math.round((pending / currentSpeed) * 60);
      }

      // Calcula tempo decorrido
      let elapsedTime = 0;
      if (campaign.startedAt) {
        const elapsedMilliseconds = Date.now() - new Date(campaign.startedAt).getTime();
        elapsedTime = Math.round(elapsedMilliseconds / 1000);
      }

      return {
        total,
        sent,
        delivered,
        read,
        error,
        pending,
        successRate: Math.round(successRate * 100) / 100,
        currentSpeed: currentSpeed || campaign.messageSpeed || 0,
        estimatedTimeRemaining,
        elapsedTime,
        status: campaign.status,
        totalContacts: campaign.totalContacts,
        messagesSent: campaign.messagesSent,
        messagesFailed: campaign.messagesFailed,
        startedAt: campaign.startedAt,
        completedAt: campaign.completedAt,
      };
    } catch (error) {
      logger.error('Erro ao calcular métricas da campanha:', error);
      throw error;
    }
  }

  /**
   * Obém timeline de envios da campanha agregada por minuto
   */
  public async getCampaignTimeline(campaignId: number): Promise<any[]> {
    try {
      const campaign = await Campaign.findByPk(campaignId);
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      // Busca todas as mensagens com timestamps
      const messages = await Message.findAll({
        where: { campaignId },
        order: [['sentAt', 'ASC']]
      });

      // Agrupa mensagens por minuto
      const timelineMap = new Map<string, any>();

      messages.forEach(msg => {
        // Usa o timestamp de envio ou criação
        const timestamp = msg.sentAt || msg.createdAt;
        if (!timestamp) return;

        // Agrupa por minuto (arredonda para o minuto anterior)
        const date = new Date(timestamp);
        date.setSeconds(0, 0);
        const key = date.toISOString();

        if (!timelineMap.has(key)) {
          timelineMap.set(key, {
            time: key,
            sent: 0,
            delivered: 0,
            read: 0,
            error: 0,
            pending: 0,
          });
        }

        const record = timelineMap.get(key);
        if (msg.status === 'sent') {
          record.sent++;
        } else if (msg.status === 'delivered') {
          record.delivered++;
        } else if (msg.status === 'read') {
          record.read++;
        } else if (msg.status === 'failed') {
          record.error++;
        } else if (msg.status === 'scheduled') {
          record.pending++;
        }
      });

      // Converte map para array ordenado
      const timeline = Array.from(timelineMap.values())
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
        .map(item => ({
          ...item,
          // Formata o tempo para exibição
          timeLabel: new Date(item.time).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          // Calcula cumulativo
          totalSent: item.sent + item.delivered + item.read,
        }));

      return timeline;
    } catch (error) {
      logger.error('Erro ao gerar timeline da campanha:', error);
      return [];
    }
  }
}

export default new CampaignService();
