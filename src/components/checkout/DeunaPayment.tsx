import React, { useState, useEffect } from 'react';
import { Smartphone, Loader, CheckCircle, XCircle, AlertCircle, QrCode, RefreshCw } from 'lucide-react';

interface DeunaPaymentProps {
  amount: number;
  orderId: string;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function DeunaPayment({ amount, orderId, onSuccess, onError, onCancel }: DeunaPaymentProps) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'waiting' | 'success' | 'error' | 'expired'>('idle');
  const [message, setMessage] = useState('');
  const [qrCode, setQrCode] = useState<string>();
  const [deepLink, setDeepLink] = useState<string>();
  const [expiresAt, setExpiresAt] = useState<Date>();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (status === 'idle') {
      generateQRCode();
    }
  }, [status]);

  // Countdown timer
  useEffect(() => {
    if (expiresAt && status === 'waiting') {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const remaining = Math.max(0, expiresAt.getTime() - now);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          setStatus('expired');
          setMessage('El código QR ha expirado');
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [expiresAt, status]);

  const generateQRCode = async () => {
    setStatus('generating');
    setMessage('Generando código QR...');

    try {
      // ✅ Integración con DeUna API
      // Documentación: https://docs.payvalida.com/api-deuna
      
      const response = await fetch('/api/payments/deuna/create-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount,
          orderId,
          description: `Orden #${orderId}`,
          // Webhook URL para notificaciones
          webhookUrl: `${window.location.origin}/api/payments/deuna/webhook`
        })
      });

      if (!response.ok) {
        throw new Error('Error al generar QR');
      }

      const data = await response.json();
      
      setQrCode(data.qrCode); // Base64 o URL de imagen
      setDeepLink(data.deepLink); // Deep link para app DeUna
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutos
      setStatus('waiting');
      setMessage('Escanea el código QR con DeUna o Banco Pichincha');

      // Iniciar polling para verificar el pago
      startPaymentPolling(data.transactionId);
      
    } catch (error) {
      console.error('Error generando QR DeUna:', error);
      setStatus('error');
      setMessage('Error al generar código QR');
      onError('Error generando QR');
    }
  };

  // Polling para verificar estado del pago
  const startPaymentPolling = (transactionId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/deuna/status/${transactionId}`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            setStatus('success');
            setMessage('¡Pago confirmado!');
            onSuccess(transactionId);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setStatus('error');
            setMessage('Pago rechazado');
            onError('Pago rechazado');
          }
        }
      } catch (error) {
        console.error('Error verificando pago:', error);
      }
    }, 3000); // Verificar cada 3 segundos

    // Detener polling después de 10 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      if (status === 'waiting') {
        setStatus('expired');
        setMessage('Tiempo de espera agotado');
      }
    }, 600000);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-purple-100 rounded-full">
          <Smartphone className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pago con DeUna</h3>
          <p className="text-sm text-gray-500">Transferencia instantánea</p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</span>
        </div>
      </div>

      {/* QR Code */}
      {(status === 'waiting' || status === 'expired') && qrCode && (
        <div className="mb-6">
          <div className="relative bg-white p-4 rounded-lg border-2 border-purple-200">
            {/* QR Code Image */}
            <div className="flex justify-center mb-3">
              <img 
                src={qrCode} 
                alt="QR Code DeUna" 
                className={`w-48 h-48 ${status === 'expired' ? 'opacity-30' : ''}`}
              />
            </div>

            {/* Expired Overlay */}
            {status === 'expired' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                <div className="text-center">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Código Expirado</p>
                </div>
              </div>
            )}

            {/* Timer */}
            {status === 'waiting' && timeRemaining > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600">Expira en:</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatTime(timeRemaining)}
                </p>
              </div>
            )}
          </div>

          {/* Deep Link Button */}
          {deepLink && status === 'waiting' && (
            <button
              onClick={() => window.open(deepLink, '_blank')}
              className="w-full mt-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              Abrir en App DeUna
            </button>
          )}
        </div>
      )}

      {/* Status Message */}
      <div className={`
        p-4 rounded-lg mb-6 flex items-center gap-3
        ${status === 'generating' ? 'bg-blue-50 border border-blue-200' : ''}
        ${status === 'waiting' ? 'bg-purple-50 border border-purple-200' : ''}
        ${status === 'success' ? 'bg-green-50 border border-green-200' : ''}
        ${status === 'error' || status === 'expired' ? 'bg-red-50 border border-red-200' : ''}
      `}>
        {status === 'generating' && <Loader className="w-5 h-5 text-blue-600 animate-spin" />}
        {status === 'waiting' && <QrCode className="w-5 h-5 text-purple-600 animate-pulse" />}
        {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
        {(status === 'error' || status === 'expired') && <XCircle className="w-5 h-5 text-red-600" />}
        
        <p className={`
          text-sm font-medium
          ${status === 'generating' ? 'text-blue-700' : ''}
          ${status === 'waiting' ? 'text-purple-700' : ''}
          ${status === 'success' ? 'text-green-700' : ''}
          ${(status === 'error' || status === 'expired') ? 'text-red-700' : ''}
        `}>
          {message}
        </p>
      </div>

      {/* Instructions */}
      {status === 'waiting' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-purple-800">
              <p className="font-medium mb-2">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Abre la app DeUna o Banco Pichincha</li>
                <li>Toca "Escanear QR" o "Pagar"</li>
                <li>Escanea el código QR</li>
                <li>Confirma el pago en tu app</li>
                <li>Espera la confirmación automática</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {status !== 'success' && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        )}
        
        {(status === 'error' || status === 'expired') && (
          <button
            onClick={() => {
              setStatus('idle');
              setQrCode(undefined);
              setDeepLink(undefined);
            }}
            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generar Nuevo QR
          </button>
        )}
      </div>
    </div>
  );
}
