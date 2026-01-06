import React, { useState, useEffect } from 'react';
import { CreditCard, Loader, CheckCircle, XCircle, AlertCircle, Wifi } from 'lucide-react';

interface CardPaymentProps {
  amount: number;
  onSuccess: (transactionId: string, cardLast4?: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function CardPayment({ amount, onSuccess, onError, onCancel }: CardPaymentProps) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [cardLast4, setCardLast4] = useState<string>();

  useEffect(() => {
    if (status === 'idle') {
      initiateCardPayment();
    }
  }, [status]);

  const initiateCardPayment = async () => {
    setStatus('waiting');
    setMessage('Acerca tu tarjeta al punto de pago...');

    try {
      // ✅ Integración con tu punto de pago (ej: Paymentez, PayPhone, Placetopay, etc.)
      // Ejemplo:
      // const response = await fetch('/api/card-terminal/start-payment', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ amount })
      // });

      // Simular proceso (reemplazar con API real)
      simulateCardPayment();
      
    } catch (error) {
      setStatus('error');
      setMessage('Error al conectar con el punto de pago');
      onError('Error de conexión con terminal');
    }
  };

  // ⚠️ SIMULAЧIÓN - Reemplazar con API real del punto de pago
  const simulateCardPayment = () => {
    // Simular lectura de tarjeta
    setTimeout(() => {
      setMessage('Tarjeta detectada...');
      setCardLast4('4532');
    }, 2000);

    // Simular procesamiento
    setTimeout(() => {
      setStatus('processing');
      setMessage('Procesando transacción...');
    }, 4000);

    // Simular éxito
    setTimeout(() => {
      setStatus('success');
      setMessage('¡Pago aprobado!');
      onSuccess(`CARD-${Date.now()}`, '4532');
    }, 7000);

    // Timeout de 2 minutos
    setTimeout(() => {
      if (status !== 'success') {
        setStatus('error');
        setMessage('Tiempo de espera agotado');
        onError('Timeout');
      }
    }, 120000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-full">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pago con Tarjeta</h3>
          <p className="text-sm text-gray-500">Débito o Crédito</p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</span>
        </div>
        {cardLast4 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                **** **** **** {cardLast4}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Animation */}
      {status === 'waiting' && (
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-32 h-40 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg shadow-xl flex items-center justify-center">
              <div className="w-20 h-24 bg-gray-600 rounded flex items-center justify-center">
                <Wifi className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2">
              <CreditCard className="w-12 h-12 text-blue-500 animate-bounce" />
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className={`
        p-4 rounded-lg mb-6 flex items-center gap-3
        ${status === 'waiting' ? 'bg-blue-50 border border-blue-200' : ''}
        ${status === 'processing' ? 'bg-yellow-50 border border-yellow-200' : ''}
        ${status === 'success' ? 'bg-green-50 border border-green-200' : ''}
        ${status === 'error' ? 'bg-red-50 border border-red-200' : ''}
      `}>
        {status === 'waiting' && <Loader className="w-5 h-5 text-blue-600 animate-spin" />}
        {status === 'processing' && <Loader className="w-5 h-5 text-yellow-600 animate-spin" />}
        {status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
        {status === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
        
        <p className={`
          text-sm font-medium
          ${status === 'waiting' ? 'text-blue-700' : ''}
          ${status === 'processing' ? 'text-yellow-700' : ''}
          ${status === 'success' ? 'text-green-700' : ''}
          ${status === 'error' ? 'text-red-700' : ''}
        `}>
          {message}
        </p>
      </div>

      {/* Instructions */}
      {status === 'waiting' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">Instrucciones:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acerca tu tarjeta al lector NFC</li>
                <li>O inserta tu tarjeta con chip</li>
                <li>Ingresa tu PIN si es solicitado</li>
                <li>Espera la confirmación</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Accepted */}
      <div className="mb-6">
        <p className="text-xs text-gray-500 text-center mb-2">Métodos aceptados:</p>
        <div className="flex justify-center gap-3">
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
            Visa
          </div>
          <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
            Mastercard
          </div>
          <div className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            Diners
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {status !== 'success' && (
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={status === 'processing'}
          >
            Cancelar
          </button>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => {
              setStatus('idle');
              setCardLast4(undefined);
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
