/**
 * Configuração e factory para WhatsAppService
 * ✅ APENAS Evolution API (Baileys removido completamente)
 */

import WhatsAppService from './WhatsAppService';
import EvolutionAdapter from './EvolutionAdapter';
import logger from '../utils/logger';

/**
 * Cria e retorna a instância de WhatsAppService com Evolution API
 * 
 * Variáveis de ambiente:
 * - EVOLUTION_API_URL: URL da Evolution API (padrão: 'http://localhost:8080')
 * - EVOLUTION_API_KEY: Chave de autenticação da Evolution API
 * 
 * @returns WhatsAppService configurado com Evolution API
 */
export function createWhatsAppService(): WhatsAppService {
  logger.info(`🚀 Usando Evolution API (ÚNICA implementação disponível)`);
  logger.info(`📡 Evolution API URL: ${process.env.EVOLUTION_API_URL || 'http://localhost:8080'}`);
  
  return new WhatsAppService(EvolutionAdapter);
}

/**
 * Exporta uma instância única de WhatsAppService
 * Use este como singleton em toda a aplicação
 */
export const whatsappService = createWhatsAppService();

export default whatsappService;
