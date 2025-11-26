import { ledService } from "../../services/LedService";

export interface LEDCommand {
  productId: number;
  quantity: number;
}

export class LEDManager {
  private connection: ledService;
  private commandQueue: LEDCommand[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.connection = new ledService();
  }

  async connect(): Promise<{ success: boolean; message: string }> {
    return this.connection.connect();
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  async queueCommand(command: LEDCommand): Promise<void> {
    this.commandQueue.push(command);
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.commandQueue.length === 0) return;

    this.isProcessing = true;
    try {
      while (this.commandQueue.length > 0) {
        const command = this.commandQueue[0];
        await this.sendCommand(command);
        this.commandQueue.shift();
        // Esperar un momento entre comandos
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error('Error procesando cola de comandos LED:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendCommand(command: LEDCommand): Promise<void> {
    const data = `${command.productId},${command.quantity}\n`;
    await this.connection.send(data);
  }

  isSupported(): boolean {
    return this.connection.isSupported();
  }
}

export const ledManager = new LEDManager();