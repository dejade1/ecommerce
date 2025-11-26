class LedService {
  private baseUrl: string = 'http://192.168.18.14'; // ACTUALIZA CON TU IP
  private isConnected: boolean = false;

  async connect(): Promise<boolean> {
    try {
      console.log('[LedService] Verificando conexión ESP32...');
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        mode: 'cors',
      });
      
      if (response.ok) {
        const data = await response.json();
        this.isConnected = data.status === 'online';
        console.log('[LedService] ESP32 conectado:', data);
        return this.isConnected;
      }
      
      return false;
    } catch (error) {
      console.error('[LedService] Error conectando:', error);
      this.isConnected = false;
      return false;
    }
  }

  async sendProductSignal(productId: number, quantity: number): Promise<boolean> {
    try {
      console.log(`[LedService] Dispensando producto ${productId}, cantidad ${quantity}`);
      
      const response = await fetch(`${this.baseUrl}/blink`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId, quantity })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('[LedService] Respuesta ESP32:', result);
      return true;
    } catch (error) {
      console.error('[LedService] Error:', error);
      return false;
    }
  }

  isSupported(): boolean {
    return true; // WiFi siempre disponible
  }
}

export const ledService = new LedService();
