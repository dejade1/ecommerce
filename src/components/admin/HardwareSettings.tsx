import React, { useState, useEffect } from 'react';
import { Wifi, Save, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { ledService } from '../../services/LedService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function HardwareSettings() {
  const [esp32IP, setEsp32IP] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // Cargar configuración actual
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // ✅ CORREGIDO: Usar /admin/settings
      const response = await fetch(`${API_URL}/admin/settings/esp32_ip`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEsp32IP(data.setting.value);
        console.log('✅ IP cargada:', data.setting.value);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  };

  const handleSave = async () => {
    if (!esp32IP.trim()) {
      setMessage({ type: 'error', text: 'La IP no puede estar vacía' });
      return;
    }

    // Validar formato IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(esp32IP)) {
      setMessage({ type: 'error', text: 'Formato de IP inválido (ej: 192.168.0.106)' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // ✅ CORREGIDO: Usar /admin/settings
      const response = await fetch(`${API_URL}/admin/settings/esp32_ip`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: esp32IP,
          description: 'Dirección IP del ESP32 dispensador'
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Respuesta del servidor:', data);
        
        // Actualizar IP en LedService
        ledService.setESP32IP(esp32IP);
        
        setMessage({ type: 'success', text: 'IP guardada correctamente' });
        setConnectionStatus('unknown');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error guardando IP:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error al guardar la IP' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);

    try {
      // Actualizar IP temporalmente para prueba
      ledService.setESP32IP(esp32IP);
      
      const connected = await ledService.connect();
      
      if (connected) {
        setConnectionStatus('connected');
        setMessage({ type: 'success', text: '✅ Conexión exitosa con ESP32' });
      } else {
        setConnectionStatus('disconnected');
        setMessage({ type: 'error', text: '❌ No se pudo conectar con ESP32' });
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      setMessage({ type: 'error', text: 'Error al probar conexión' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wifi className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Configuración de Hardware</h2>
      </div>

      {/* ESP32 IP Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dirección IP del ESP32
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={esp32IP}
              onChange={(e) => setEsp32IP(e.target.value)}
              placeholder="192.168.0.106"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {connectionStatus === 'connected' && (
              <div className="flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-lg">
                <CheckCircle className="w-5 h-5" />
              </div>
            )}
            {connectionStatus === 'disconnected' && (
              <div className="flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-lg">
                <XCircle className="w-5 h-5" />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Ejemplo: 192.168.1.100 (sin http://)
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Guardando...' : 'Guardar IP'}
          </button>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Probando...' : 'Probar Conexión'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">💡 Cómo encontrar la IP del ESP32:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Abre el Serial Monitor del Arduino IDE (115200 baud)</li>
            <li>Reinicia el ESP32</li>
            <li>Busca la línea "[IP] 192.168.x.x"</li>
            <li>Copia esa IP y pégala aquí</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
