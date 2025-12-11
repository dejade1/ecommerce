/**
 * Email Service usando Brevo (SendinBlue)
 * 
 * Este servicio permite enviar emails usando la API de Brevo.
 * Requiere:
 * - VITE_BREVO_API_KEY en .env
 * - VITE_EMAIL_FROM en .env
 */

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailParams {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface BrevoResponse {
  messageId: string;
}

class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {
    this.apiKey = import.meta.env.VITE_BREVO_API_KEY || '';
    this.fromEmail = import.meta.env.VITE_EMAIL_FROM || 'noreply@ejemplo.com';
    this.fromName = import.meta.env.VITE_EMAIL_FROM_NAME || 'Vending Machine';

    if (!this.apiKey) {
      console.warn('⚠️ VITE_BREVO_API_KEY no está configurado en .env');
    }
  }

  /**
   * Envía un email usando la API de Brevo
   */
  async sendEmail(params: EmailParams): Promise<boolean> {
    try {
      if (!this.apiKey) {
        throw new Error('API Key de Brevo no configurado');
      }

      // Normalizar destinatarios a array
      const recipients = Array.isArray(params.to) ? params.to : [params.to];

      const payload = {
        sender: {
          email: this.fromEmail,
          name: this.fromName
        },
        to: recipients.map(r => ({
          email: r.email,
          name: r.name || r.email.split('@')[0]
        })),
        subject: params.subject,
        htmlContent: params.htmlContent,
        textContent: params.textContent || this.stripHtml(params.htmlContent)
      };

      console.log('📧 Enviando email a:', recipients.map(r => r.email).join(', '));

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error de Brevo:', errorData);
        throw new Error(`Error al enviar email: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data: BrevoResponse = await response.json();
      console.log('✅ Email enviado exitosamente. Message ID:', data.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      return false;
    }
  }

  /**
   * Envía un email de prueba
   */
  async sendTestEmail(toEmail: string): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #fbbf24; color: #1f2937; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background: #fbbf24; color: #1f2937; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Email de Prueba Exitoso!</h1>
          </div>
          <div class="content">
            <h2>Hola,</h2>
            <p>Este es un email de prueba desde tu aplicación de <strong>Vending Machine</strong>.</p>
            <p>Si estás viendo este mensaje, significa que la integración con Brevo está funcionando correctamente.</p>
            <p><strong>Información del sistema:</strong></p>
            <ul>
              <li>Servicio: Brevo (SendinBlue)</li>
              <li>Fecha: ${new Date().toLocaleString('es-ES')}</li>
              <li>Destinatario: ${toEmail}</li>
            </ul>
            <p style="text-align: center; margin-top: 30px;">
              <a href="#" class="button">Sistema Configurado ✅</a>
            </p>
          </div>
          <div class="footer">
            <p>Este es un email automático generado por el sistema de Vending Machine.</p>
            <p>© 2025 Vending Machine. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: { email: toEmail },
      subject: '🚀 Email de Prueba - Vending Machine',
      htmlContent
    });
  }

  /**
   * Envía alerta de stock bajo
   */
  async sendLowStockAlert(params: {
    productName: string;
    currentStock: number;
    threshold: number;
    adminEmail: string;
  }): Promise<boolean> {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; }
          .product { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h2>⚠️ Alerta de Stock Bajo</h2>
            <p>El siguiente producto ha alcanzado un nivel de stock crítico:</p>
          </div>
          <div class="product">
            <h3>📦 ${params.productName}</h3>
            <p><strong>Stock actual:</strong> ${params.currentStock} unidades</p>
            <p><strong>Umbral de alerta:</strong> ${params.threshold} unidades</p>
            <p style="color: #ef4444; font-weight: bold;">¡Es necesario reabastecer este producto!</p>
          </div>
          <div class="footer">
            <p>Fecha de alerta: ${new Date().toLocaleString('es-ES')}</p>
            <p>Sistema de Vending Machine - Alertas Automáticas</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: { email: params.adminEmail, name: 'Administrador' },
      subject: `⚠️ Alerta: Stock Bajo - ${params.productName}`,
      htmlContent
    });
  }

  /**
   * Envía notificación de lote próximo a vencer
   */
  async sendExpiryAlert(params: {
    productName: string;
    batchCode: string;
    expiryDate: string;
    daysRemaining: number;
    quantity: number;
    adminEmail: string;
  }): Promise<boolean> {
    const urgencyLevel = params.daysRemaining < 7 ? 'CRÍTICO' : params.daysRemaining < 15 ? 'URGENTE' : 'ATENCIÓN';
    const bgColor = params.daysRemaining < 7 ? '#fef2f2' : params.daysRemaining < 15 ? '#fff7ed' : '#fefce8';
    const borderColor = params.daysRemaining < 7 ? '#ef4444' : params.daysRemaining < 15 ? '#f97316' : '#eab308';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 20px; border-radius: 8px; }
          .batch { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
          .urgency { display: inline-block; padding: 8px 16px; background: ${borderColor}; color: white; border-radius: 4px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="alert">
            <h2>🗓️ Alerta de Vencimiento de Lote</h2>
            <span class="urgency">${urgencyLevel}</span>
            <p style="margin-top: 15px;">Un lote de producto está próximo a vencer.</p>
          </div>
          <div class="batch">
            <h3>📦 ${params.productName}</h3>
            <p><strong>Código de Lote:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${params.batchCode}</code></p>
            <p><strong>Fecha de Vencimiento:</strong> ${params.expiryDate}</p>
            <p><strong>Días Restantes:</strong> <span style="color: ${borderColor}; font-weight: bold; font-size: 18px;">${params.daysRemaining} días</span></p>
            <p><strong>Cantidad:</strong> ${params.quantity} unidades</p>
            <p style="margin-top: 15px; padding: 10px; background: #fef3c7; border-radius: 4px;">
              ⚠️ <strong>Acción requerida:</strong> Considere promocionar este producto o retirarlo antes del vencimiento.
            </p>
          </div>
          <div class="footer">
            <p>Fecha de alerta: ${new Date().toLocaleString('es-ES')}</p>
            <p>Sistema de Vending Machine - Control de Lotes</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: { email: params.adminEmail, name: 'Administrador' },
      subject: `🗓️ ${urgencyLevel}: Lote ${params.batchCode} vence en ${params.daysRemaining} días`,
      htmlContent
    });
  }

  /**
   * Envía confirmación de compra al cliente
   */
  async sendPurchaseConfirmation(params: {
    customerEmail: string;
    customerName?: string;
    orderNumber: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
  }): Promise<boolean> {
    const itemsHtml = params.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; border-radius: 6px; overflow: hidden; }
          th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: bold; }
          .total { background: #fbbf24; padding: 15px; border-radius: 6px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ¡Compra Confirmada!</h1>
          </div>
          <div class="content">
            <h2>Hola ${params.customerName || 'Cliente'},</h2>
            <p>Gracias por tu compra. Aquí están los detalles de tu orden:</p>
            <p><strong>Número de Orden:</strong> #${params.orderNumber}</p>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th style="text-align: center;">Cantidad</th>
                  <th style="text-align: right;">Precio Unit.</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="total">
              <h2 style="margin: 0; text-align: right;">Total: $${params.total.toFixed(2)}</h2>
            </div>
            <p style="margin-top: 30px; text-align: center; color: #6b7280;">
              ¡Disfruta tu compra! 🎉
            </p>
          </div>
          <div class="footer">
            <p>Fecha: ${new Date().toLocaleString('es-ES')}</p>
            <p>© 2025 Vending Machine. Gracias por tu preferencia.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: { email: params.customerEmail, name: params.customerName },
      subject: `✅ Confirmación de Compra - Orden #${params.orderNumber}`,
      htmlContent
    });
  }

  /**
   * Elimina etiquetas HTML de un string
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.fromEmail;
  }
}

// Exportar instancia singleton
export const emailService = new EmailService();
