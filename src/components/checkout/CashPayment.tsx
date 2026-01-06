import React, { useState, useEffect } from 'react';
import { Banknote, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface CashPaymentProps {
  amount: number;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function CashPayment({ amount, onSuccess, onError, onCancel }: CashPaymentProps) {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'processing' | 'success' | 'error'>('idle');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Iniciar el proceso de pago en efectivo
    if (status === 'idle') {
      initiateCashPayment();
    }
  }, [status]);

  const initiateCashPayment = async () => {
    setStatus('waiting');
    setMessage('Inserta tus billetes en el reciclador...');

    try {
      // ✅ Aquí iría la integración con tu reciclador de billetes
      // Por ejemplo, una API que se comunique con el hardware
      
      // const response = await fetch('/api/cash-recycler/start-payment', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ amount })
      // });

      // Simular el proceso (reemplazar con integración real)
      simulateCashPayment();
      
    } catch (error) {
      setStatus('error');
      setMessage('Error al conectar con el reciclador de billetes');
      onError('Error de conexión con reciclador');
    }
  };

  // ⚠️ SIMULAЧIÓN - Reemplazar con API real del reciclador
  const simulateCashPayment = () => {
    let accumulated = 0;
    const interval = setInterval(() => {
      accumulated += 5; // Simular billetes de $5
      setReceivedAmount(accumulated);
      
      if (accumulated >= amount) {
        clearInterval(interval);
        setStatus('processing');
        setMessage('Procesando pago...');
        
        setTimeout(() => {
          setStatus('success');
          setMessage('¡Pago completado exitosamente!');
          onSuccess(`CASH-${Date.now()}`);
        }, 2000);
      }
    }, 2000);

    // Timeout de 2 minutos
    setTimeout(() => {
      if (status !== 'success') {
        clearInterval(interval);
        setStatus('error');
        setMessage('Tiempo de espera agotado');
        onError('Timeout');
      }
    }, 120000);
  };

  const progress = Math.min((receivedAmount / amount) * 100, 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-green-100 rounded-full">
          <Banknote className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pago en Efectivo</h3>
          <p className="text-sm text-gray-500">Reciclador automático</p>
        </div>
      </div>

      {/* Amount */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">${amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Recibido:</span>
          <span className="text-xl font-semibold text-green-600">${receivedAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      {status === 'waiting' && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600 mt-2">
            {progress.toFixed(0)}% completado
          </p>
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
                <li>Inserta tus billetes uno por uno</li>
                <li>Espera la confirmación de cada billete</li>
                <li>El sistema aceptará el pago cuando se complete el monto</li>
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
            disabled={status === 'processing'}
          >
            Cancelar
          </button>
        )}
        
        {status === 'error' && (
          <button
            onClick={() => {
              setStatus('idle');
              setReceivedAmount(0);
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
