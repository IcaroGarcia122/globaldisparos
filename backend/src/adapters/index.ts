/**
 * WhatsApp Adapters - Index File
 * 
 * ✅ EVOLUTION API ONLY - Baileys removed
 * 
 * Exports all adapter-related components for clean imports:
 * 
 * import whatsappService from 'adapters/whatsapp.config';
 * import { WhatsAppAdapter } from 'adapters';
 * import EvolutionAdapter from 'adapters';
 */

export { WhatsAppAdapter } from './WhatsAppAdapter';
export { default as EvolutionAdapter } from './EvolutionAdapter';
export { default as WhatsAppService } from './WhatsAppService';
export { default as whatsappService, createWhatsAppService } from './whatsapp.config';
