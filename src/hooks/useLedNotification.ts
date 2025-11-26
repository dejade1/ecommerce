import { useState, useCallback } from 'react';
import { ledService } from '../services/LedService';

export function useLedNotification() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      console.log('[useLedNotification] Intentando conectar con ESP32...');
      const success = await ledService.connect();
      setIsConnected(success);
      
      if (success) {
        setError(null);
        console.log('[useLedNotification] ✓ Conexión exitosa con ESP32');
      } else {
        setError('No se pudo conectar al ESP32');
        console.error('[useLedNotification] ✗ Conexión fallida');
      }
      
      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMsg);
      console.error('[useLedNotification] Error al conectar:', errorMsg);
      return false;
    }
  }, []);

  const notifyPurchase = useCallback(async (items: Array<{ id: number; quantity: number }>) => {
    console.log('[useLedNotification] === INICIO notifyPurchase ===');
    console.log('[useLedNotification] Items recibidos:', items);
    
    // Verificar conexión antes de enviar
    console.log('[useLedNotification] Verificando conexión...');
    const connected = await connect();
    
    if (!connected) {
      console.error('[useLedNotification] ✗ No hay conexión con ESP32');
      setError('No se pudo conectar al ESP32');
      return false;
    }

    try {
      console.log('[useLedNotification] ✓ Conexión establecida, enviando productos...');
      
      // Enviar cada producto secuencialmente
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`[useLedNotification] Enviando producto ${i + 1}/${items.length}: ID=${item.id}, Cantidad=${item.quantity}`);
        
        const sent = await ledService.sendProductSignal(item.id, item.quantity);
        
        if (!sent) {
          console.error(`[useLedNotification] ✗ Error enviando producto ${item.id}`);
          setError(`Error enviando producto ${item.id}`);
          return false;
        }
        
        console.log(`[useLedNotification] ✓ Producto ${item.id} enviado correctamente`);
        
        // Esperar entre dispensaciones si hay más de un producto
        if (i < items.length - 1) {
          console.log('[useLedNotification] Esperando 1 segundo antes del siguiente producto...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('[useLedNotification] ✓✓✓ Todos los productos enviados exitosamente');
      return true;
    } catch (err) {
      console.error('[useLedNotification] ✗✗✗ Error en notifyPurchase:', err);
      const errorMsg = err instanceof Error ? err.message : 'Error al notificar compra';
      setError(errorMsg);
      return false;
    }
  }, [connect]);

  const disconnect = useCallback(async () => {
    console.log('[useLedNotification] Desconectando...');
    setIsConnected(false);
    setError(null);
  }, []);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    notifyPurchase
  };
}
