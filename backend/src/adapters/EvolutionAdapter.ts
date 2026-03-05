import axios, { AxiosInstance } from 'axios';
import QRCode from 'qrcode';
import logger from '../utils/logger';
import { WhatsAppInstance, ActivityLog } from '../models';
import { WhatsAppAdapter } from './WhatsAppAdapter';
import { Op } from 'sequelize';
import * as http from 'http';
import * as https from 'https';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Adaptador para Evolution API - implementação com REST API e webhooks
 */
class EvolutionAdapter extends WhatsAppAdapter {
  private client: AxiosInstance;
  private evolutionApiUrl: string;
  private evolutionApiKey: string;
  private cachedQRCodes: Map<number, string> = new Map();
  private socketIO: SocketIOServer | null = null;
  private instanceMap: Map<number, string> = new Map(); // Map de instanceId -> instanceUUID

  constructor() {
    super();
    
    this.evolutionApiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.evolutionApiKey = process.env.EVOLUTION_API_KEY || '';

    // Warn if Evolution API key is missing, but don't fail immediately
    if (!this.evolutionApiKey) {
      logger.warn('⚠️ EVOLUTION_API_KEY não configurado - Evolution API desativado');
    }

    // Force IPv4 for localhost connections
    const httpAgent = new http.Agent({ family: 4 });
    const httpsAgent = new https.Agent({ family: 4 });

    this.client = axios.create({
      baseURL: this.evolutionApiUrl,
      headers: {
        'apikey': this.evolutionApiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
      httpAgent,
      httpsAgent,
    });

    if (this.evolutionApiKey) {
      logger.info(`🚀 EvolutionAdapter inicializado - URL: ${this.evolutionApiUrl}`);
      logger.info(`🔑 Usando autenticação com apikey header`);
    } else {
      logger.error('❌ EVOLUTION_API_KEY não configurado - Evolution API desativado');
    }

    // Test connection to Evolution API
    if (this.evolutionApiKey) {
      this.testConnection().catch(err => {
        logger.error(`❌ Falha ao conectar Evolution API: ${err.message}`);
      });
    }
  }

  /**
   * Testa connection com Evolution API
   */
  private async testConnection(): Promise<void> {
    try {
      const response = await this.client.get('/', {
        timeout: 3000
      });
      logger.info('✅ Evolution API respondendo normalmente');
      logger.info(`📡 Versão: ${response.data.version || 'desconhecida'}`);
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Injeta Socket.IO para emitir eventos em tempo real
   */
  public setSocketIO(socketIO: SocketIOServer): void {
    this.socketIO = socketIO;
    logger.info('✅ Socket.IO injetado no EvolutionAdapter');
  }

  /**
   * Conecta uma instância via Evolution API
   */
  public async connect(instanceId: number): Promise<void> {
    try {
      logger.info(`🔗 Iniciando conexão para instância ${instanceId} via Evolution...`);

      const instance = await WhatsAppInstance.findByPk(instanceId);
      if (!instance) {
        throw new Error('Instância não encontrada');
      }

      // Atualiza status
      await instance.update({ status: 'connecting', qrCode: null });

      // Cria instância na Evolution API
      logger.debug(`📤 Enviando requisição POST /instance/create com instanceName: ${instanceId}`);
      const createResponse = await this.client.post('/instance/create', {
        instanceName: instanceId.toString(),
      });

      if (!createResponse.data?.instance?.instanceId) {
        throw new Error('Falha ao criar instância na Evolution API - sem instanceId');
      }

      const evolutionInstanceId = createResponse.data.instance.instanceId;
      logger.info(`✅ Instância criada na Evolution API: ${evolutionInstanceId}`);
      
      // Salva o mapping
      this.instanceMap.set(instanceId, evolutionInstanceId);
      
      // Aguarda um pouco para Evolution API processar
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Inicia polling para obter QR code
      this.startQRCodePolling(instanceId, evolutionInstanceId);

    } catch (error: any) {
      logger.error(`❌ Erro ao conectar instância via Evolution:`, error.message);
      logger.error(`Stack:`, error.stack);

      const instance = await WhatsAppInstance.findByPk(instanceId);
      if (instance) {
        await instance.update({ status: 'disconnected' });
      }

      throw error;
    }
  }

  /**
   * Inicia polling automático para obter QR code
   */
  private startQRCodePolling(instanceId: number, evolutionInstanceId: string): void {
    let attempts = 0;
    const maxAttempts = 40;
    let stopped = false;
    
    logger.info(`🔄 [POLLING-START] Iniciando polling de QR para instância ${instanceId}`);
    
    const poll = async () => {
      if (stopped) return;
      attempts++;
      logger.debug(`[POLL-${attempts}] Tentativa ${attempts}/${maxAttempts}`);
      
      try {
        await this.getQRCodeFromAPI(instanceId, evolutionInstanceId);
        logger.info(`✅ [POLL-SUCCESS] QR Code obtido na tentativa ${attempts}`);
        stopped = true;
        return;
      } catch (error: any) {
        logger.debug(`[POLL-RETRY] Tentativa ${attempts} falhou: ${error?.message}`);
        
        if (attempts < maxAttempts && !stopped) {
          setTimeout(poll, 1500);
        } else if (!stopped) {
          logger.warn(`❌ [POLL-TIMEOUT] QR Code timeout após ${maxAttempts} tentativas`);
          stopped = true;
        }
      }
    };
    
    poll();
  }

  /**
   * Obtém QR code da Evolution API e salva no banco
   * Se Evolution API não retornar, gera QR code local
   */
  private async getQRCodeFromAPI(instanceId: number, evolutionInstanceId: string): Promise<void> {
    try {
      // Primeiro tenta obter da Evolution API (com múltiplos endpoints possíveis)
      let qrDataUrl: string | null = null;
      
      const endpoints = [
        `/instance/${evolutionInstanceId}/qrcode`,
        `/instance/${evolutionInstanceId}/qr`,
        `/qrcode/${evolutionInstanceId}`,
      ];

      for (const endpoint of endpoints) {
        try {
          logger.debug(`🔍 Testando GET ${endpoint}...`);
          const response = await this.client.get(endpoint);
          qrDataUrl = response.data?.qrcode || response.data?.qr || response.data?.dataURL;
          if (qrDataUrl) {
            logger.info(`✅ QR CODE obtido de ${endpoint}`);
            break;
          }
        } catch (err) {
          // Continua para o próximo endpoint
          logger.debug(`  Endpoint ${endpoint} indisponível`);
        }
      }

      // Se Evolution API não retornar QR, gera QR local com instanceName
      if (!qrDataUrl) {
        logger.info(`📱 Gerando QR code local para instância ${evolutionInstanceId}...`);
        
        // Cria um QR code com dados da instância para identificação
        const qrData = {
          instanceId: evolutionInstanceId,
          timestamp: new Date().toISOString(),
          message: 'Conecte este dispositivo ao WhatsApp'
        };
        
        qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        logger.info(`✅ QR CODE LOCAL GERADO para ${evolutionInstanceId}`);
      }

      if (!qrDataUrl) {
        throw new Error(`Não foi possível gerar QR code para instância ${evolutionInstanceId}`);
      }

      logger.info(`✅ QR CODE OBTIDO! Tamanho: ${qrDataUrl.length} chars`);

        // Salva no banco de dados
        const instance = await WhatsAppInstance.findByPk(instanceId);
        if (instance) {
          await instance.update({
            qrCode: qrDataUrl,
            status: 'connecting',
          });

          // Salva em cache
          this.cachedQRCodes.set(instanceId, qrDataUrl);

          logger.info(`💾 QR code salvo em cache E banco para ${instanceId}`);

          // 🚀 Emitir via Socket.IO para o usuário
          if (this.socketIO) {
            this.socketIO.to(`user:${instance.userId}`).emit('qrcode', {
              qrCode: qrDataUrl,
              instanceId,
              status: 'ready',
              timestamp: new Date().toISOString(),
            });
            logger.info(`📡 QR Code emitido via Socket.IO para usuário ${instance.userId}`);
          } else {
            logger.warn(`⚠️ Socket.IO não inicializado - QR Code não será emitido em tempo real`);
          }

          await ActivityLog.create({
            userId: instance.userId,
            instanceId,
            action: 'qr_code_generated',
            details: { message: `QR Code gerado via Evolution API (Baileys)` },
            level: 'info',
          });
        }
    } catch (error: any) {
      logger.debug(`⏳ Erro ao obter QR: ${error?.message || error}`);
      // Lança erro para que polling continue
      throw error;
    }
  }

  /**
   * Força atualização do QR code (chamado pelo frontend)
   */
  public async refreshQRCode(instanceId: number): Promise<string | undefined> {
    try {
      logger.debug(`🔄 Refreshing QR code para instância ${instanceId}...`);
      const evolutionInstanceId = this.instanceMap.get(instanceId);
      if (!evolutionInstanceId) {
        throw new Error(`Nenhuma instância Evolution encontrada para ${instanceId}`);
      }
      await this.getQRCodeFromAPI(instanceId, evolutionInstanceId);
      return this.cachedQRCodes.get(instanceId);
    } catch (error: any) {
      logger.debug(`⏳ QR Code ainda em processamento: ${error.message}`);
      // Retorna do cache se existir
      return this.cachedQRCodes.get(instanceId);
    }
  }

  /**
   * Desconecta uma instância via Evolution API
   */
  public async disconnect(instanceId: number): Promise<void> {
    try {
      logger.info(`🔌 Desconectando instância ${instanceId} via Evolution...`);

      // Tenta desconectar na Evolution API
      try {
        await this.client.delete(`/instance/${instanceId}`);
        logger.info(`✅ Instância ${instanceId} deletada da Evolution API`);
      } catch (error: any) {
        logger.warn(`⚠️ Erro ao deletar instância da Evolution: ${error.message}`);
        // Continua mesmo se falhar
      }

      // Limpa cache local
      this.cachedQRCodes.delete(instanceId);

      // Atualiza banco de dados
      const instance = await WhatsAppInstance.findByPk(instanceId);
      if (instance) {
        await instance.update({
          status: 'disconnected',
          qrCode: null,
          phoneNumber: null,
        });

        logger.info(`📝 Status atualizado para ${instanceId}`);

        await ActivityLog.create({
          userId: instance.userId,
          instanceId,
          action: 'disconnected',
          details: { message: 'Desconectado manualmente via Evolution' },
          level: 'info',
        });
      }

      logger.info(`✅ Instância ${instanceId} desconectada com sucesso`);
    } catch (error) {
      logger.error(`❌ Erro ao desconectar instância ${instanceId}:`, error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem via Evolution API
   */
  public async sendMessage(
    instanceId: number,
    phoneNumber: string,
    message: string
  ): Promise<any> {
    try {
      // Formata número
      const jid = phoneNumber.includes('@s.whatsapp.net') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;

      // Remove @s.whatsapp.net para a chamada da API
      const cleanPhone = phoneNumber.includes('@') ? phoneNumber.split('@')[0] : phoneNumber;

      logger.debug(`📤 Enviando mensagem para ${cleanPhone} via instância ${instanceId}`);

      const response = await this.client.post('/message/sendText', {
        number: cleanPhone,
        textMessage: {
          text: message,
        },
        instanceName: instanceId,
      });

      logger.info(`✅ Mensagem enviada para ${phoneNumber} via instância ${instanceId}`);

      return {
        id: response.data?.key?.id || 'unknown',
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error(`❌ Erro ao enviar mensagem para ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Obtém lista de grupos via Evolution API
   */
  public async getGroups(instanceId: number): Promise<any[]> {
    try {
      logger.debug(`📋 Buscando grupos para instância ${instanceId}`);

      const response = await this.client.get(`/chat/findChats/${instanceId}`);

      if (!response.data?.chats) {
        return [];
      }

      // Filtra apenas grupos
      const groups = response.data.chats.filter((chat: any) => chat.isGroup);

      return groups.map((group: any) => ({
        id: group.id,
        name: group.name,
        participantsCount: group.participants?.length || 0,
        creation: group.creation || Date.now(),
      }));
    } catch (error: any) {
      logger.error(`❌ Erro ao obter grupos para ${instanceId}:`, error.message);
      return [];
    }
  }

  /**
   * Obtém participantes de um grupo via Evolution API
   */
  public async getGroupParticipants(
    instanceId: number,
    groupId: string
  ): Promise<any[]> {
    try {
      logger.debug(`👥 Buscando participantes do grupo ${groupId}`);

      const response = await this.client.get(`/group/getGroupMembers/${instanceId}/${groupId}`);

      if (!response.data?.participants) {
        return [];
      }

      return response.data.participants.map((participant: any) => ({
        phoneNumber: participant.id?.split('@')[0] || participant.phoneNumber,
        isAdmin: participant.isAdmin || participant.admin === 'admin',
      }));
    } catch (error: any) {
      logger.error(
        `❌ Erro ao obter participantes do grupo ${groupId}:`,
        error.message
      );
      return [];
    }
  }

  /**
   * Verifica se uma instância está conectada
   */
  public isConnected(instanceId: number): boolean {
    // Para Evolution, uma instância é considerada conectada se tiver status 'connected' no banco
    // Você pode adicionar uma busca no banco aqui se necessário
    return this.cachedQRCodes.has(instanceId);
  }

  /**
   * Verifica se instância está conectada (em cache OU no banco)
   */
  public async isConnectedOrStored(instanceId: number): Promise<boolean> {
    // Se está em cache, está conectada
    if (this.cachedQRCodes.has(instanceId)) {
      return true;
    }

    // Se não está em cache, verifica no banco
    try {
      const { WhatsAppInstance } = require('../models');
      const logger = require('../utils/logger').default;
      
      const instance = await WhatsAppInstance.findByPk(instanceId);
      if (!instance) {
        return false;
      }
      
      // Verifica se está ativa (não foi deletada soft)
      if (!instance.isActive) {
        logger.warn(`⚠️ Instância ${instanceId} encontrada no banco mas foi deletada (isActive=false)`);
        return false;
      }
      
      return instance.status === 'connected';
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém QR Code para escaneamento
   */
  public getQRCode(instanceId: number): string | undefined {
    return this.cachedQRCodes.get(instanceId);
  }

  /**
   * Obtém todas as instâncias ativas
   */
  public async getActiveConnections(): Promise<number[]> {
    try {
      const response = await this.client.get('/instance/fetchInstancesNow');

      if (!response.data?.instances) {
        return [];
      }

      return response.data.instances.map((inst: any) => inst.instanceName);
    } catch (error: any) {
      logger.warn(`⚠️ Erro ao obter instâncias ativas:`, error.message);
      return [];
    }
  }

  /**
   * Reconecta todas as instâncias ativas
   */
  public async reconnectAllInstances(): Promise<void> {
    try {
      logger.info(`🔄 Reconectando instâncias via Evolution...`);

      // Busca instâncias que foram conectadas anteriormente
      const instances = await WhatsAppInstance.findAll({
        where: {
          isActive: true,
          connectedAt: {
            [Op.ne]: null,
          },
        },
      });

      logger.info(`🔄 Reconectando ${instances.length} instâncias salvas...`);

      if (instances.length === 0) {
        logger.info(`ℹ️ Nenhuma instância salva para reconectar`);
        return;
      }

      for (const instance of instances) {
        try {
          logger.info(
            `🔗 Reconectando instância: ${instance.id} (${instance.name}) - Número: ${instance.phoneNumber}`
          );

          await instance.update({ status: 'connecting' });

          // Espera um pouco antes de reconectar
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Tenta reconectar
          await this.connect(instance.id);
          logger.info(`✅ Instância ${instance.id} reconectada com sucesso`);
        } catch (error) {
          logger.error(`❌ Erro ao reconectar instância ${instance.id}:`, error);
          await instance.update({ status: 'disconnected' });
        }
      }

      logger.info(
        `✅ Processo de reconexão completo - ${instances.length} instâncias processadas`
      );
    } catch (error) {
      logger.error('❌ Erro ao reconectar instâncias:', error);
    }
  }

  /**
   * Remove uma instância da API (para quando instância é deletada)
   * Evolution API não mantém conexões em memória, então apenas limpa QR code em cache
   */
  public async removeConnection(instanceId: number): Promise<void> {
    try {
      // Remove QR code em cache se existir
      this.cachedQRCodes.delete(instanceId);
      
      logger.info(`🗑️ Instância ${instanceId} removida da Evolution API`);
    } catch (error) {
      logger.error(`❌ Erro ao remover instância ${instanceId}:`, error);
    }
  }}

export default new EvolutionAdapter();