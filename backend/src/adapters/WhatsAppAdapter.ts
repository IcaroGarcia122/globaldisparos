/**
 * Interface abstrata para adaptadores WhatsApp
 * Define contrato para integração Evolution API
 */
export abstract class WhatsAppAdapter {
  /**
   * Conecta uma instância WhatsApp
   * @param instanceId ID único da instância
   */
  abstract connect(instanceId: number): Promise<void>;

  /**
   * Desconecta uma instância WhatsApp
   * @param instanceId ID único da instância
   */
  abstract disconnect(instanceId: number): Promise<void>;

  /**
   * Obtém código QR para escaneamento
   * @param instanceId ID único da instância
   * @returns String com QR code em Data URL ou undefined se não disponível
   */
  abstract getQRCode(instanceId: number): string | undefined;

  /**
   * Força atualização do código QR (refresh)
   * @param instanceId ID único da instância
   * @returns String com QR code em Data URL ou undefined se não disponível
   */
  abstract refreshQRCode(instanceId: number): Promise<string | undefined>;

  /**
   * Envia uma mensagem de texto
   * @param instanceId ID único da instância
   * @param phoneNumber Número do telefone (com ou sem @s.whatsapp.net)
   * @param message Conteúdo da mensagem
   * @returns Resultado do envio (contém ID da mensagem)
   */
  abstract sendMessage(
    instanceId: number,
    phoneNumber: string,
    message: string
  ): Promise<any>;

  /**
   * Obtém lista de todos os grupos da instância
   * @param instanceId ID único da instância
   * @returns Array com dados dos grupos
   */
  abstract getGroups(instanceId: number): Promise<any[]>;

  /**
   * Obtém lista de participantes de um grupo
   * @param instanceId ID único da instância
   * @param groupId ID do grupo (formato: 120363xxxxx-1535xxxxx@g.us)
   * @returns Array com dados dos participantes
   */
  abstract getGroupParticipants(
    instanceId: number,
    groupId: string
  ): Promise<any[]>;

  /**
   * Verifica se uma instância está conectada
   * @param instanceId ID único da instância
   * @returns true se conectada, false caso contrário
   */
  abstract isConnected(instanceId: number): boolean;

  /**
   * Verifica se uma instância está conectada (em memória) ou foi conectada antes (no banco)
   * @param instanceId ID único da instância
   * @returns true se conectada em memória ou se status no banco é 'connected'
   */
  abstract isConnectedOrStored(instanceId: number): Promise<boolean>;

  /**
   * Obtém lista de IDs de instâncias conectadas
   * @returns Array com IDs das instâncias ativas
   */
  abstract getActiveConnections(): number[] | Promise<number[]>;

  /**
   * Reconecta todas as instâncias ativas ao iniciar o servidor
   * Busca no banco instâncias que foram conectadas anteriormente
   */
  abstract reconnectAllInstances(): Promise<void>;

  /**
   * Remove uma conexão da memória (para quando instância é deletada)
   * @param instanceId ID único da instância
   */
  abstract removeConnection(instanceId: number): Promise<void>;
}
