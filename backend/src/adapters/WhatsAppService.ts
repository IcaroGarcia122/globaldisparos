import { WhatsAppAdapter } from './WhatsAppAdapter';
import logger from '../utils/logger';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Serviço unificado de WhatsApp usando Evolution API
 * Abstração que delega operações ao adaptador Evolution
 */
class WhatsAppService {
  private adapter: WhatsAppAdapter;

  constructor(adapter: WhatsAppAdapter) {
    this.adapter = adapter;
    
    const adapterName = adapter.constructor.name;
    logger.info(`✅ WhatsAppService inicializado com adaptador: ${adapterName}`);
  }

  /**
   * Injeta Socket.IO no adaptador para emitir eventos em tempo real
   */
  setSocketIO(io: SocketIOServer): void {
    if (this.adapter && typeof (this.adapter as any).setSocketIO === 'function') {
      (this.adapter as any).setSocketIO(io);
    }
  }

  /**
   * Conecta uma instância WhatsApp
   */
  async connect(instanceId: number): Promise<void> {
    return this.adapter.connect(instanceId);
  }

  /**
   * Desconecta uma instância WhatsApp
   */
  async disconnect(instanceId: number): Promise<void> {
    return this.adapter.disconnect(instanceId);
  }

  /**
   * Obtém código QR para escaneamento
   */
  getQRCode(instanceId: number): string | undefined {
    return this.adapter.getQRCode(instanceId);
  }

  /**
   * Força atualização/refresh do código QR
   */
  async refreshQRCode(instanceId: number): Promise<string | undefined> {
    return this.adapter.refreshQRCode(instanceId);
  }

  /**
   * Envia uma mensagem de texto
   */
  async sendMessage(
    instanceId: number,
    phoneNumber: string,
    message: string
  ): Promise<any> {
    return this.adapter.sendMessage(instanceId, phoneNumber, message);
  }

  /**
   * Obtém lista de todos os grupos da instância
   */
  async getGroups(instanceId: number): Promise<any[]> {
    return this.adapter.getGroups(instanceId);
  }

  /**
   * Obtém lista de participantes de um grupo
   */
  async getGroupParticipants(
    instanceId: number,
    groupId: string
  ): Promise<any[]> {
    return this.adapter.getGroupParticipants(instanceId, groupId);
  }

  /**
   * Verifica se uma instância está conectada
   */
  isConnected(instanceId: number): boolean {
    return this.adapter.isConnected(instanceId);
  }

  /**
   * Verifica se uma instância está conectada ou foi conectada antes
   */
  async isConnectedOrStored(instanceId: number): Promise<boolean> {
    return this.adapter.isConnectedOrStored(instanceId);
  }

  /**
   * Obtém lista de IDs de instâncias conectadas
   */
  async getActiveConnections(): Promise<number[]> {
    const connections = this.adapter.getActiveConnections();
    
    // Se o adaptador retorna Promise, aguarda; senão, retorna diretamente
    if (connections instanceof Promise) {
      return connections;
    }
    
    // Evolution API sempre retorna Promise, mas manter este padrão para compatibilidade
    return Promise.resolve(connections);
  }

  /**
   * Reconecta todas as instâncias ativas ao iniciar o servidor
   */
  async reconnectAllInstances(): Promise<void> {
    return this.adapter.reconnectAllInstances();
  }

  /**
   * Remove uma conexão da memória quando instância é deletada
   */
  async removeConnection(instanceId: number): Promise<void> {
    return this.adapter.removeConnection(instanceId);
  }
}

export default WhatsAppService;
