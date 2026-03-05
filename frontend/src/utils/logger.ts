// Simple logger utility for frontend
const logger = {
  info: (message: string, data?: any) => {
    console.log(`ℹ️ ${message}`, data || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ ${message}`, data || '');
  },
  
  error: (message: string, data?: any) => {
    console.error(`❌ ${message}`, data || '');
  },
  
  debug: (message: string, data?: any) => {
    console.log(`🔍 ${message}`, data || '');
  },
};

export default logger;
