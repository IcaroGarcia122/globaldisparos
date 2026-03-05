/**
 * Mock da Evolution API para testes sem Docker
 * Fornece respostas simuladas para endpoints da API
 */

import logger from './logger';
import { WhatsAppInstance } from '../models';

class MockEvolutionAPI {
  private mockQRCodes: Map<string, string> = new Map();
  private connectedInstances: Map<string, boolean> = new Map();

  /**
   * Simula GET /instance/qrcode/:instanceId
   */
  async getMockQRCode(instanceId: number | string): Promise<string> {
    const key = `instance-${instanceId}`;
    
    // Se já retornou QR code uma vez, retorna sempre
    if (this.mockQRCodes.has(key)) {
      return this.mockQRCodes.get(key)!;
    }

    // Gera um QR code simulado (SVG simples)
    const mockQR = this.generateMockQRCode(instanceId);
    this.mockQRCodes.set(key, mockQR);
    
    logger.info(`✅ Mock QR Code gerado para instância ${instanceId}`);
    return mockQR;
  }

  /**
   * Simula POST /instance/create
   */
  async mockCreateInstance(instanceName: string): Promise<{ success: boolean; instanceName: string }> {
    logger.info(`🔧 Mock create instance: ${instanceName}`);
    return {
      success: true,
      instanceName
    };
  }

  /**
   * Simula DELETE /instance/:instanceId
   */
  async mockDeleteInstance(instanceId: string | number): Promise<{ success: boolean }> {
    logger.info(`🗑️ Mock delete instance: ${instanceId}`);
    this.mockQRCodes.delete(`instance-${instanceId}`);
    this.connectedInstances.delete(`instance-${instanceId}`);
    return { success: true };
  }

  /**
   * Simula GET /instance/fetchInstancesNow
   */
  async mockFetchInstances(): Promise<{ instances: Array<{  instanceName: string; state: string }> }> {
    const instances: Array<{ instanceName: string; state: string }> = [];
    
    // Retorna todas as instâncias do banco como se estivessem na Evolution API
    try {
      const whatsappInstances = await WhatsAppInstance.findAll({ where: { isActive: true } });
      
      for (const instance of whatsappInstances) {
        instances.push({
          instanceName: instance.id.toString(),
          state: this.connectedInstances.has(`instance-${instance.id}`) ? 'open' : 'closed'
        });
      }
    } catch (error) {
      logger.warn('❌ Erro ao buscar instâncias mock:', error);
    }

    return { instances };
  }

  /**
   * Gera um QR code mock em base64 (uma imagem PNG simples)
   */
  private generateMockQRCode(instanceId: number | string): string {
    // Este é um QR code SVG muito simples renderizado como base64
    // Na realidade, você criaria um QR code real usando uma lib como 'qrcode'
    // Para teste, vamos simular uma imagem base64

    // Vamos usar um SVG simples como placeholder
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
        <defs>
          <style>
            .qr-cell { fill: #000; }
            .qr-bg { fill: #fff; }
            .qr-text { fill: #000; font-size: 14px; font-family: Arial; }
          </style>
        </defs>
        <rect class="qr-bg" width="300" height="300"/>
        
        <!-- Padrão de QR code simplificado -->
        <rect class="qr-cell" x="10" y="10" width="80" height="80"/>
        <rect class="qr-bg" x="20" y="20" width="60" height="60"/>
        <rect class="qr-cell" x="30" y="30" width="40" height="40"/>
        <rect class="qr-bg" x="40" y="40" width="20" height="20"/>
        
        <rect class="qr-cell" x="210" y="10" width="80" height="80"/>
        <rect class="qr-bg" x="220" y="20" width="60" height="60"/>
        <rect class="qr-cell" x="230" y="30" width="40" height="40"/>
        <rect class="qr-bg" x="240" y="40" width="20" height="20"/>
        
        <rect class="qr-cell" x="10" y="210" width="80" height="80"/>
        <rect class="qr-bg" x="20" y="220" width="60" height="60"/>
        <rect class="qr-cell" x="30" y="230" width="40" height="40"/>
        <rect class="qr-bg" x="40" y="240" width="20" height="20"/>
        
        <!-- Dados (padrão aleatório) -->
        <rect class="qr-cell" x="120" y="120" width="60" height="60"/>
        <rect class="qr-bg" x="140" y="140" width="20" height="20"/>
        
        <!-- Info -->
        <text class="qr-text" x="10" y="300" width="280" text-anchor="start">
          Instância ${instanceId} - MOCK QR CODE
        </text>
      </svg>
    `;

    // Converte SVG para base64
    const buffer = Buffer.from(svg);
    const base64 = buffer.toString('base64');
    
    // Retorna como data URL (para ser legível como imagem)
    return `data:image/svg+xml;base64,${base64}`;
  }

  /**
   * Marca uma instância como conectada (simula scanning de QR)
   */
  markAsConnected(instanceId: number | string): void {
    this.connectedInstances.set(`instance-${instanceId}`, true);
    logger.info(`✅ Mock instância ${instanceId} marcada como conectada`);
  }

  /**
   * Verifica se instância está marcada como conectada
   */
  isConnected(instanceId: number | string): boolean {
    return this.connectedInstances.get(`instance-${instanceId}`) || false;
  }

  /**
   * Limpa todos os dados de mock
   */
  clear(): void {
    this.mockQRCodes.clear();
    this.connectedInstances.clear();
    logger.info('🧹 Mock Evolution API limpo');
  }
}

// Exporta singleton
export const mockEvolutionAPI = new MockEvolutionAPI();
export default mockEvolutionAPI;
