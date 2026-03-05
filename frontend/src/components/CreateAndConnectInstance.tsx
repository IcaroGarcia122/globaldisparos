import React, { useState, useEffect, useRef } from 'react';
import { fetchAPI } from '@/config/api';
import { Plus, Loader2, AlertCircle, RefreshCw, CheckCircle2, QrCode, Copy, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDescription, Alert } from '@/components/ui/alert';
import { initSocket, onQRCode, onInstanceConnected } from '@/utils/socketClient';

interface CreateAndConnectInstanceProps {
  onSuccess?: (instanceId: number) => void;
  onQRGenerated?: (qrCode: string, instanceId: number) => void;
}

interface ConnectionState {
  phase: 'idle' | 'creating' | 'connecting' | 'qr-pending' | 'qr-ready' | 'connected' | 'error';
  instanceId?: number;
  qrCode?: string;
  errorMessage?: string;
  message?: string;
  phoneNumber?: string;
}

/**
 * Componente unificado para criar instância + obter QR code
 * Fluxo automático: Criar → Conectar → Gerar QR → Exibir
 */
const CreateAndConnectInstance: React.FC<CreateAndConnectInstanceProps> = ({
  onSuccess,
  onQRGenerated,
}) => {
  const [instanceName, setInstanceName] = useState('');
  const [accountAge, setAccountAge] = useState(30);
  const [state, setState] = useState<ConnectionState>({ phase: 'idle' });
  const qrPollRef = useRef<NodeJS.Timeout | null>(null);
  const statusCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Inicializa Socket.IO
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        initSocket(token);
      }
    } catch (err) {
      console.warn('⚠️ Socket.IO init falhou:', err);
    }
  }, []);

  // Escuta eventos de QR code via Socket.IO
  useEffect(() => {
    if (state.phase === 'qr-pending' && state.instanceId) {
      onQRCode((data) => {
        if (data.instanceId === state.instanceId) {
          console.log(`✅ QR Code recebido via WebSocket!`);
          setState((prev) => ({
            ...prev,
            phase: 'qr-ready',
            qrCode: data.qrCode,
          }));

          if (onQRGenerated && state.instanceId) {
            onQRGenerated(data.qrCode, state.instanceId);
          }

          if (qrPollRef.current) {
            clearInterval(qrPollRef.current);
            qrPollRef.current = null;
          }
        }
      });

      onInstanceConnected((data) => {
        if (data.instanceId === state.instanceId) {
          console.log(`✅ CONEXÃO ESTABELECIDA! Número: ${data.phoneNumber}`);
          setState((prev) => ({
            ...prev,
            phase: 'connected',
            phoneNumber: data.phoneNumber,
            message: `Conectado com sucesso! ${data.phoneNumber}`,
          }));

          if (onSuccess && state.instanceId) {
            onSuccess(state.instanceId);
          }
        }
      });
    }

    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      if (statusCheckRef.current) clearInterval(statusCheckRef.current);
    };
  }, [state.phase, state.instanceId, onSuccess, onQRGenerated]);

  const handleStartProcess = async () => {
    if (!instanceName.trim()) {
      setState({
        phase: 'error',
        errorMessage: 'Nome da instância é obrigatório',
      });
      return;
    }

    setState({
      phase: 'creating',
      message: '📱 Criando instância WhatsApp...',
    });

    try {
      // PASSO 1: Criar instância
      console.log(`🔧 Criando instância: ${instanceName}`);
      const createResponse = await fetchAPI('/instances', {
        method: 'POST',
        body: { name: instanceName, accountAge },
      });

      const newInstanceId = createResponse.id;
      console.log(`✅ Instância criada! ID: ${newInstanceId}`);

      setState({
        phase: 'connecting',
        instanceId: newInstanceId,
        message: '🔗 Conectando à Evolution API...',
      });

      // PASSO 2: Iniciar conexão
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const connectResponse = await fetchAPI(
        `/instances/${newInstanceId}/connect`,
        {
          method: 'POST',
        }
      );

      console.log(`✅ Conexão iniciada!`);

      setState({
        phase: 'qr-pending',
        instanceId: newInstanceId,
        message: '📲 Aguardando QR code (máx 30 segundos)...',
      });

      // PASSO 3: Fazer polling do QR code
      let attempts = 0;
      const maxAttempts = 30;

      qrPollRef.current = setInterval(async () => {
        attempts++;
        try {
          const qrResponse = await fetchAPI(`/instances/${newInstanceId}/qr`, {
            method: 'GET',
          });

          console.log(
            `[Polling ${attempts}/${maxAttempts}] Status: ${qrResponse?.status}, Has QR: ${!!qrResponse?.qrCode}`
          );

          if (qrResponse?.qrCode) {
            console.log(`✅ QR Code obtido via polling (tentativa ${attempts})!`);
            setState((prev) => ({
              ...prev,
              phase: 'qr-ready',
              qrCode: qrResponse.qrCode,
              message: '✅ QR Code pronto! Escaneie com WhatsApp',
            }));

            if (onQRGenerated && newInstanceId) {
              onQRGenerated(qrResponse.qrCode, newInstanceId);
            }

            if (qrPollRef.current) {
              clearInterval(qrPollRef.current);
              qrPollRef.current = null;
            }
          } else if (attempts >= maxAttempts) {
            throw new Error('QR code não gerado após 60 segundos');
          }
        } catch (error: any) {
          console.warn(`⚠️ Polling tentativa ${attempts} falhou:`, error?.message);
          if (attempts >= maxAttempts) {
            if (qrPollRef.current) {
              clearInterval(qrPollRef.current);
              qrPollRef.current = null;
            }
            setState({
              phase: 'error',
              instanceId: newInstanceId,
              errorMessage: `Erro ao obter QR code: ${error.message}`,
            });
          }
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Erro no processo:', error);

      // Verificar se é erro de limite
      const isLimitError =
        error.message && error.message.includes('Máximo');

      setState({
        phase: 'error',
        errorMessage: isLimitError
          ? 'Limite de 10 instâncias por usuário. Feche uma para adicionar outra.'
          : error.message || 'Erro ao criar instância. Tente novamente.',
      });
    }
  };

  const handleRetry = () => {
    setState({ phase: 'idle' });
    setInstanceName('');
    setAccountAge(30);
  };

  const copyQRCode = () => {
    if (state.qrCode) {
      // For displaying, create an image or allow download
      const qrUrl = state.qrCode;
      fetch(qrUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          img.style.maxWidth = '400px';
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.write(`<img src="${qrUrl}" style="max-width:100%;">`);
          }
        })
        .catch(() => {
          // Fallback: open in new tab
          window.open(qrUrl, '_blank');
        });
    }
  };

  const downloadQRCode = () => {
    if (state.qrCode) {
      const link = document.createElement('a');
      link.href = state.qrCode;
      link.download = `qr-code-${state.instanceId}.png`;
      link.click();
    }
  };

  // ===== RENDERIZAÇÃO =====

  return (
    <Card className="w-full bg-white border border-slate-200">
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-slate-200">
        <CardTitle className="flex items-center gap-2 text-emerald-900">
          <Plus size={20} />
          Nova Instância WhatsApp
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* FASE: IDLE */}
        {state.phase === 'idle' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                Nome da Instância
              </Label>
              <Input
                type="text"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: Meu WhatsApp Principal"
                className="border-slate-200"
              />
            </div>

            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                Idade da Conta (dias)
              </Label>
              <Input
                type="number"
                value={accountAge}
                onChange={(e) => setAccountAge(parseInt(e.target.value) || 30)}
                min="0"
                max="365"
                className="border-slate-200"
              />
              <p className="text-xs text-slate-500 mt-1">
                Usado para calcular limites anti-ban
              </p>
            </div>

            <Button
              onClick={handleStartProcess}
              disabled={!instanceName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              Criar e Conectar
            </Button>
          </div>
        )}

        {/* FASES: CREATING, CONNECTING, QR-PENDING */}
        {(state.phase === 'creating' ||
          state.phase === 'connecting' ||
          state.phase === 'qr-pending') && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Loader2 className="text-blue-600 animate-spin flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-blue-900">{state.message}</p>
                <p className="text-sm text-blue-700 mt-1">
                  {state.phase === 'creating' && 'Criando no banco de dados...'}
                  {state.phase === 'connecting' && 'Iniciando conexão com Evolution API...'}
                  {state.phase === 'qr-pending' && 'Gerando código QR...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* FASE: QR-READY */}
        {state.phase === 'qr-ready' && state.qrCode && (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="text-green-600" size={16} />
              <AlertDescription className="text-green-800">
                ✅ QR Code pronto! Escaneie com seu WhatsApp
              </AlertDescription>
            </Alert>

            {/* QR Code Display */}
            <div className="flex flex-col items-center gap-4">
              <img
                src={state.qrCode}
                alt="QR Code"
                className="w-72 h-72 border-4 border-slate-200 rounded-lg p-2 bg-white"
              />

              <div className="text-xs text-slate-600 text-center max-w-sm">
                <p>📱 Abra WhatsApp no seu celular</p>
                <p>🔗 Vá em Configurações → Dispositivos Conectados</p>
                <p>📸 Escaneie este código QR</p>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={copyQRCode}
                variant="outline"
                className="text-sm"
              >
                <QrCode size={14} className="mr-1" />
                Ver QR
              </Button>
              <Button
                onClick={downloadQRCode}
                variant="outline"
                className="text-sm"
              >
                <Download size={14} className="mr-1" />
                Baixar QR
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              ⏳ Aguardando confirmação (máx 5 minutos)...
            </p>
          </div>
        )}

        {/* FASE: CONNECTED */}
        {state.phase === 'connected' && (
          <div className="space-y-4">
            <Alert className="bg-emerald-50 border-emerald-200">
              <CheckCircle2 className="text-emerald-600" size={16} />
              <AlertDescription className="text-emerald-800">
                ✅ {state.message}
              </AlertDescription>
            </Alert>

            <div className="bg-emerald-50 p-4 rounded-lg text-center">
              <p className="font-semibold text-emerald-900">
                📱 {state.phoneNumber}
              </p>
              <p className="text-sm text-emerald-700 mt-2">
                Instância pronta para enviar mensagens!
              </p>
            </div>

            <Button
              onClick={handleRetry}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus size={16} className="mr-2" />
              Criar Outra Instância
            </Button>
          </div>
        )}

        {/* FASE: ERROR */}
        {state.phase === 'error' && (
          <div className="space-y-4">
            <Alert className="bg-rose-50 border-rose-200">
              <AlertCircle className="text-rose-600" size={16} />
              <AlertDescription className="text-rose-800">
                {state.errorMessage || 'Erro ao processar'}
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
            >
              <RefreshCw size={16} className="mr-2" />
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateAndConnectInstance;
