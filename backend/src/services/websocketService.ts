import { io } from '../server';
import logger from '../utils/logger';

/**
 * Serviço para gerenciar emissões WebSocket
 */
class WebSocketService {
  /**
   * Emite QR code para um cliente específico (por userId) ou broadcast
   */
  public emitQRCode(instanceId: number, qrCode: string, userId?: number): void {
    try {
      const payload = {
        instanceId,
        qrCode,
        timestamp: new Date().toISOString(),
      };

      if (userId) {
        // Emitir para um usuário específico
        const userSockets = this.getUserSockets(userId);
        userSockets.forEach(socket => {
          socket.emit('qr', payload);
          logger.debug(`📱 QR emitido para usuário ${userId}, socket ${socket.id}`);
        });
      } else {
        // Broadcast para todos
        io.emit('qr', payload);
        logger.debug(`📱 QR emitido para todos os clientes`);
      }
    } catch (error) {
      logger.error(`❌ Erro ao emitir QR code:`, error);
    }
  }

  /**
   * Emite evento de conexão bem-sucedida
   */
  public emitInstanceConnected(instanceId: number, phoneNumber: string, userId?: number): void {
    try {
      const payload = {
        instanceId,
        phoneNumber,
        timestamp: new Date().toISOString(),
      };

      if (userId) {
        const userSockets = this.getUserSockets(userId);
        userSockets.forEach(socket => {
          socket.emit('instance_connected', payload);
          logger.debug(`✅ Conexão emitida para usuário ${userId}`);
        });
      } else {
        io.emit('instance_connected', payload);
      }
    } catch (error) {
      logger.error(`❌ Erro ao emitir conexão:`, error);
    }
  }

  /**
   * Emite evento de desconexão
   */
  public emitInstanceDisconnected(instanceId: number, reason: string, userId?: number): void {
    try {
      const payload = {
        instanceId,
        reason,
        timestamp: new Date().toISOString(),
      };

      if (userId) {
        const userSockets = this.getUserSockets(userId);
        userSockets.forEach(socket => {
          socket.emit('instance_disconnected', payload);
          logger.debug(`🔴 Desconexão emitida para usuário ${userId}`);
        });
      } else {
        io.emit('instance_disconnected', payload);
      }
    } catch (error) {
      logger.error(`❌ Erro ao emitir desconexão:`, error);
    }
  }

  /**
   * Obtém todos os sockets de um usuário (para quando user está em múltiplas abas)
   */
  private getUserSockets(userId: number): any[] {
    const sockets: any[] = [];
    io.sockets.sockets.forEach((socket) => {
      if (socket.data?.userId === userId) {
        sockets.push(socket);
      }
    });
    return sockets;
  }

  /**
   * Registra o usuário no socket
   */
  public registerUserSocket(socket: any, userId: number): void {
    socket.data = socket.data || {};
    socket.data.userId = userId;
    logger.debug(`✅ Socket ${socket.id} registrado para usuário ${userId}`);
  }
}

export default new WebSocketService();
