#!/usr/bin/env node

/**
 * 🎯 TESTE SIMPLIFICADO DE QR CODE
 * Sem dependências de conexão ao backend
 */

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function test() {
  console.log('🚀 TESTE SIMPLIFICADO DE QR CODE');
  console.log('='.repeat(60));
  
  // Dados da instância que seria gerada
  const qrData = {
    id: 'test-instance-123',
    phoneNumber: '+5511999999999',
    status: 'connecting',
    timestamp: new Date().toISOString(),
    url: 'https://web.whatsapp.com/download?connect=https://example.com'
  };
  
  console.log('\n📊 Dados do QR Code:');
  console.log(JSON.stringify(qrData, null, 2));
  
  try {
    console.log('\n⏳ Gerando QR Code...');
    
    // Gera QR code com  a biblioteca 'qrcode'
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    console.log('\n✅ QR CODE GERADO COM SUCESSO!');
    console.log('   Tamanho da imagem (base64):', qrDataUrl.length, 'bytes');
    console.log('   Preview:', qrDataUrl.substring(0, 80) + '...');
    
    // Salva a imagem para inspeção
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(__dirname, 'test-qr-generated.png');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    console.log('\n💾 QR Code salvo em:', filePath);
    
    // Simula resposta da API
    console.log('\n📡 Simulando resposta da API:');
    console.log(JSON.stringify({
      success: true,
      qrCode: qrDataUrl.substring(0, 100) + '...[truncated]',
      status: 'pending',
      instanceId: 'test-instance-123',
      message: 'QR Code pronto para escanear!',
      expiresAt: new Date(Date.now() + 60000).toISOString()
    }, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('\nO QR Code foi gerado e salvocorrectamente.');
    console.log('Próximo passo: Conectar ao backend e testar integração completa');
    
  } catch (error) {
    console.error('\n❌ ERRO ao gerar QR Code:');
    console.error(error.message);
    process.exit(1);
  }
}

test();
