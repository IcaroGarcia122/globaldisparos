import { Campaign, Message, WhatsAppInstance } from '../models';
import whatsappService from '../adapters/whatsapp.config';
import antiBanService from './antiBanService';
import logger from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

interface GroupDispatchOptions {
  campaignId: string;
  instanceId: number;
  groupId: string;
  message: string;
  excludeAdmins?: boolean;
  excludeAlreadySent?: boolean;
  useAntibanVariations?: boolean;
  useAntibanDelays?: boolean;
  useCommercialHours?: boolean;
}

interface ParticipantData {
  phoneNumber: string;
  name: string;
  isAdmin: boolean;
}

class GroupDispatchService {
  /**
   * Obtém participantes de um grupo com filtros
   */
  public async getFilteredGroupParticipants(
    instanceId: number,
    groupId: string,
    options: { excludeAdmins?: boolean; excludeAlreadySent?: boolean }
  ): Promise<ParticipantData[]> {
    try {
      logger.info(`📋 Buscando participantes do grupo ${groupId}...`);

      // Busca participantes
      const participants = await whatsappService.getGroupParticipants(instanceId, groupId);

      let filtered = participants as ParticipantData[];

      // Remove admins se solicitado
      if (options.excludeAdmins) {
        filtered = filtered.filter((p) => !p.isAdmin);
        logger.info(`🚫 Removidos ${participants.length - filtered.length} admins`);
      }

      // Remove quem já recebeu mensagem
      if (options.excludeAlreadySent) {
        const campaign = await Campaign.findOne({
          where: { id: this.currentCampaignId },
        });

        if (campaign) {
          const sentMessages = await Message.findAll({
            where: { campaignId: campaign.id },
            attributes: ['phoneNumber'],
          });

          const sentNumbers = sentMessages.map((m) => m.phoneNumber);
          const beforeCount = filtered.length;
          filtered = filtered.filter((p) => !sentNumbers.includes(p.phoneNumber));
          logger.info(`♻️ Removidos ${beforeCount - filtered.length} já enviados`);
        }
      }

      logger.info(`✅ ${filtered.length} participantes elegíveis`);
      return filtered;
    } catch (error) {
      logger.error(`❌ Erro ao obter participantes filtrados:`, error);
      throw error;
    }
  }

  /**
   * Exporta participantes de um grupo como XLSX
   */
  public async exportGroupParticipantsXLSX(
    instanceId: number,
    groupId: string,
    excludeAdmins: boolean = false
  ): Promise<Buffer> {
    try {
      logger.info(`📊 Exportando participantes do grupo ${groupId} como XLSX...`);

      const participants = await whatsappService.getGroupParticipants(instanceId, groupId);

      let filtered = participants as ParticipantData[];
      if (excludeAdmins) {
        filtered = filtered.filter((p) => !p.isAdmin);
      }

      // Cria workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Participantes');

      // Headers
      worksheet.columns = [
        { header: 'Número', key: 'phoneNumber', width: 15 },
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'Admin', key: 'isAdmin', width: 10 },
      ];

      // Adiciona dados
      worksheet.addRows(
        filtered.map((p) => ({
          phoneNumber: p.phoneNumber,
          name: p.name || 'Sem nome',
          isAdmin: p.isAdmin ? 'Sim' : 'Não',
        }))
      );

      // Estilo
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

      logger.info(`✅ XLSX gerado com ${filtered.length} registros`);
      const buffer = await (workbook.xlsx.writeBuffer() as unknown as Buffer);
      return buffer;
    } catch (error) {
      logger.error(`❌ Erro ao exportar XLSX:`, error);
      throw error;
    }
  }

  /**
   * Gera variações de mensagem
   */
  public generateMessageVariations(baseMessage: string, count: number = 4): string[] {
    const variations: string[] = [];
    const changes = [
      (msg: string) => msg, // Original
      (msg: string) => msg + ' 😊',
      (msg: string) => 'Oi! ' + msg,
      (msg: string) => msg + ' Abraço!',
      (msg: string) => 'E aí! ' + msg,
      (msg: string) => msg + ' Tmj!',
    ];

    for (let i = 0; i < count; i++) {
      const variation = changes[i % changes.length](baseMessage);
      variations.push(variation);
    }

    return variations;
  }

  /**
   * Interpola variáveis em mensagem
   */
  public interpolateMessage(message: string, data: Record<string, any>): string {
    let result = message;

    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Calcula delay humanizado
   */
  public calculateHumanDelay(minMs: number, maxMs: number): number {
    // Delay base aleatório
    const baseDelay = Math.random() * (maxMs - minMs) + minMs;

    // Variação adicional de ±20%
    const variation = baseDelay * 0.2 * (Math.random() > 0.5 ? 1 : -1);

    // Nunca é exatamente o mesmo padrão
    const jitter = Math.random() * 1000;

    return Math.round(baseDelay + variation + jitter);
  }

  /**
   * Inicia disparo em grupo
   */
  public async startGroupDispatch(options: GroupDispatchOptions): Promise<void> {
    try {
      this.currentCampaignId = options.campaignId;

      logger.info(`🚀 Iniciando disparo em grupo...`, {
        campaignId: options.campaignId,
        groupId: options.groupId,
      });

      const campaign = await Campaign.findByPk(options.campaignId);
      if (!campaign) {
        throw new Error('Campanha não encontrada');
      }

      const instance = await WhatsAppInstance.findByPk(options.instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      // Verifica se está conectada (com reconexão automática)
      const isConnected = await whatsappService.isConnectedOrStored(options.instanceId);
      if (!isConnected) {
        throw new Error(`Instância não está conectada e não foi possível reconectar`);
      }

      logger.info(`✅ Instância validada para disparo`);

      // Obtém participantes
      const participants = await this.getFilteredGroupParticipants(options.instanceId, options.groupId, {
        excludeAdmins: options.excludeAdmins,
        excludeAlreadySent: options.excludeAlreadySent,
      });

      if (participants.length === 0) {
        throw new Error('Nenhum participante elegível para disparo');
      }

      // Gera variações
      const variations = options.useAntibanVariations
        ? this.generateMessageVariations(options.message, Math.min(4, participants.length))
        : [options.message];

      logger.info(`📨 Iniciando envio para ${participants.length} participantes com ${variations.length} variações`);

      // Obtém limites anti-ban
      const limits = antiBanService.getLimitsByAccountAge(instance.accountAge || 0);

      // Controle de envios
      let messagesSent = 0;
      let messagesFailed = 0;
      let lastPauseTime = Date.now();
      let burstCount = 0;

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];

        // Verifica limite diário
        if (messagesSent >= limits.dailyLimit) {
          logger.warn(`⚠️ Limite diário atingido (${limits.dailyLimit})`);
          break;
        }

        // Verifica pausa inteligente
        const burstLimit = Math.floor(Math.random() * 16) + 5; // 5-20 mensagens
        if (burstCount >= burstLimit) {
          const pauseTime = Math.floor(Math.random() * 3) + 2; // 2-5 minutos
          logger.info(`⏸️ Pausa inteligente: ${pauseTime} minutos após ${burstCount} mensagens`);
          await this.delay(pauseTime * 60 * 1000);
          burstCount = 0;
          lastPauseTime = Date.now();
        }

        // Verifica horário comercial
        if (options.useCommercialHours && !antiBanService.isCommercialHours()) {
          const waitTime = antiBanService.getTimeUntilCommercialHours();
          logger.warn(`🕐 Fora do horário comercial. Aguardando ${waitTime}ms`);
          await this.delay(waitTime);
        }

        // Seleciona variação
        const message = variations[messagesSent % variations.length];

        // Interpola variáveis
        const finalMessage = this.interpolateMessage(message, {
          nome: participant.name || 'usuário',
          telefone: participant.phoneNumber,
          data: new Date().toLocaleDateString('pt-BR'),
          dia_semana: new Date().toLocaleDateString('pt-BR', { weekday: 'long' }),
        });

        // Envia mensagem
        try {
          await whatsappService.sendMessage(options.instanceId, participant.phoneNumber, finalMessage);

          messagesSent++;
          burstCount++;

          logger.info(`✅ [${messagesSent}/${participants.length}] Enviado para ${participant.name}`);

          // Atualiza campanha
          await campaign.update({
            messagesSent,
            totalContacts: participants.length,
          });

          // Log de mensagem
          await Message.create({
            campaignId: options.campaignId,
            contactId: undefined as any,
            phoneNumber: participant.phoneNumber,
            message: finalMessage,
            status: 'sent',
            sendTime: new Date(),
          } as any);
        } catch (err) {
          messagesFailed++;
          logger.error(`❌ Erro ao enviar para ${participant.phoneNumber}:`, err);

          await Message.create({
            campaignId: options.campaignId,
            contactId: undefined as any,
            phoneNumber: participant.phoneNumber,
            message: finalMessage,
            status: 'failed',
            sendTime: new Date(),
          } as any);
        }

        // Delay humanizado
        if (i < participants.length - 1) {
          const delay = options.useAntibanDelays
            ? this.calculateHumanDelay(limits.delayMin * 1000, limits.delayMax * 1000)
            : 3000;

          logger.debug(`⏱️ Aguardando ${delay}ms até próximo envio...`);
          await this.delay(delay);
        }
      }

      // Finaliza campanha
      await campaign.update({
        status: 'completed',
        completedAt: new Date(),
        messagesFailed,
      });

      logger.info(`🎉 Disparo concluído! Enviados: ${messagesSent}, Falhados: ${messagesFailed}`);
    } catch (error) {
      logger.error(`❌ Erro no disparo em grupo:`, error);
      throw error;
    }
  }

  private currentCampaignId: string = '';

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GroupDispatchService();
