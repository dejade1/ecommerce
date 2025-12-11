import React, { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { emailService } from '../../services/emailService';

export function EmailTest() {
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(emailService.isConfigured());

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Por favor ingresa un email válido' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const success = await emailService.sendTestEmail(testEmail);
      
      if (success) {
        setResult({ 
          success: true, 
          message: `¡Email de prueba enviado exitosamente a ${testEmail}! Revisa tu bandeja de entrada.` 
        });
      } else {
        setResult({ 
          success: false, 
          message: 'Error al enviar el email. Revisa la configuración de Brevo en la consola.' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestLowStockAlert = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Por favor ingresa un email válido' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const success = await emailService.sendLowStockAlert({
        productName: 'Arroz Integral Premium',
        currentStock: 5,
        threshold: 10,
        adminEmail: testEmail
      });
      
      if (success) {
        setResult({ 
          success: true, 
          message: `¡Alerta de stock bajo enviada a ${testEmail}!` 
        });
      } else {
        setResult({ 
          success: false, 
          message: 'Error al enviar la alerta.' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestExpiryAlert = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Por favor ingresa un email válido' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const success = await emailService.sendExpiryAlert({
        productName: 'Leche Entera',
        batchCode: 'LeEn-1-10122025',
        expiryDate: '20/12/2025',
        daysRemaining: 5,
        quantity: 24,
        adminEmail: testEmail
      });
      
      if (success) {
        setResult({ 
          success: true, 
          message: `¡Alerta de vencimiento enviada a ${testEmail}!` 
        });
      } else {
        setResult({ 
          success: false, 
          message: 'Error al enviar la alerta.' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setSending(false);
    }
  };

  const handleTestPurchaseConfirmation = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      setResult({ success: false, message: 'Por favor ingresa un email válido' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const success = await emailService.sendPurchaseConfirmation({
        customerEmail: testEmail,
        customerName: 'Cliente Demo',
        orderNumber: `VM${Date.now()}`,
        items: [
          { name: 'Arroz Premium 1kg', quantity: 2, price: 2.50 },
          { name: 'Aceite de Oliva 500ml', quantity: 1, price: 5.99 },
          { name: 'Lata de Atún', quantity: 3, price: 1.25 }
        ],
        total: 13.74
      });
      
      if (success) {
        setResult({ 
          success: true, 
          message: `¡Confirmación de compra enviada a ${testEmail}!` 
        });
      } else {
        setResult({ 
          success: false, 
          message: 'Error al enviar la confirmación.' 
        });
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}` 
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Estado de configuración */}
      <div className={`p-4 rounded-lg border-2 ${
        isConfigured 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {isConfigured ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          )}
          <div>
            <h3 className={`font-semibold ${
              isConfigured ? 'text-green-900' : 'text-yellow-900'
            }`}>
              {isConfigured ? 'Brevo Configurado' : 'Brevo No Configurado'}
            </h3>
            <p className={`text-sm ${
              isConfigured ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {isConfigured 
                ? 'El servicio de email está listo para enviar mensajes.' 
                : 'Configura VITE_BREVO_API_KEY y VITE_EMAIL_FROM en tu archivo .env'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de prueba */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold">Prueba de Envío de Emails</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de Prueba
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="tu-email@ejemplo.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isConfigured}
            />
            <p className="mt-1 text-xs text-gray-500">
              Ingresa tu email para recibir los mensajes de prueba
            </p>
          </div>

          {/* Botones de prueba */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleTestEmail}
              disabled={sending || !isConfigured}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              <Send className="h-5 w-5" />
              {sending ? 'Enviando...' : 'Email Básico de Prueba'}
            </button>

            <button
              onClick={handleTestLowStockAlert}
              disabled={sending || !isConfigured}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              <AlertCircle className="h-5 w-5" />
              Alerta de Stock Bajo
            </button>

            <button
              onClick={handleTestExpiryAlert}
              disabled={sending || !isConfigured}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
            >
              <AlertCircle className="h-5 w-5" />
              Alerta de Vencimiento
            </button>

            <button
              onClick={handleTestPurchaseConfirmation}
              disabled={sending || !isConfigured}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <CheckCircle className="h-5 w-5" />
              Confirmación de Compra
            </button>
          </div>

          {/* Resultado */}
          {result && (
            <div className={`p-4 rounded-md border-2 ${
              result.success 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm">{result.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instrucci ones */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📘 Instrucciones de Configuración</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Inicia sesión en <a href="https://app.brevo.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Brevo</a></li>
          <li>Ve a <strong>Settings {'>'} SMTP & API {'>'} API Keys</strong></li>
          <li>Crea una nueva API Key (v3) o copia una existente</li>
          <li>Verifica tu email de remitente en <strong>Senders {'>'} Email</strong></li>
          <li>Copia las credenciales al archivo <code className="bg-blue-100 px-2 py-1 rounded">.env</code>:</li>
        </ol>
        <div className="mt-4 bg-blue-900 text-blue-50 p-4 rounded font-mono text-xs overflow-x-auto">
          <div>VITE_BREVO_API_KEY=xkeysib-tu_api_key_aqui</div>
          <div>VITE_EMAIL_FROM=tu-email@ejemplo.com</div>
          <div>VITE_EMAIL_FROM_NAME=Vending Machine</div>
        </div>
        <p className="mt-3 text-xs text-blue-700">
          ⚠️ Después de editar .env, reinicia el servidor de desarrollo (Ctrl+C y <code>npm run dev</code>)
        </p>
      </div>
    </div>
  );
}
