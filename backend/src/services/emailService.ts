import nodemailer from 'nodemailer';
import * as SibApiV3Sdk from '@sendinblue/client';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Servicio de email usando Brevo (Sendinblue)
 */
class EmailService {
  private apiInstance: SibApiV3Sdk.TransactionalEmailsApi;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    // Configurar Brevo API
    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  BREVO_API_KEY no configurado. Emails no se enviarán.');
    }

    this.fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Ecommerce';

    this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    this.apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      apiKey || ''
    );
  }

  /**
   * Enviar email usando Brevo
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!process.env.BREVO_API_KEY) {
        console.log('📧 [EMAIL] Modo desarrollo: Email no enviado');
        console.log('   To:', options.to);
        console.log('   Subject:', options.subject);
        return false;
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      
      sendSmtpEmail.sender = {
        name: this.fromName,
        email: this.fromEmail
      };
      
      sendSmtpEmail.to = [{ email: options.to }];
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;

      // Agregar archivos adjuntos si existen
      if (options.attachments && options.attachments.length > 0) {
        sendSmtpEmail.attachment = options.attachments.map(att => ({
          name: att.filename,
          content: Buffer.isBuffer(att.content) 
            ? att.content.toString('base64') 
            : Buffer.from(att.content).toString('base64')
        }));
      }

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log('✅ [EMAIL] Email enviado exitosamente a:', options.to);
      console.log('   Message ID:', result.response.body.messageId);
      
      return true;
    } catch (error: any) {
      console.error('❌ [EMAIL] Error enviando email:', error.message);
      if (error.response) {
        console.error('   Response:', error.response.body);
      }
      return false;
    }
  }

  /**
   * Enviar email de prueba
   */
  async sendTestEmailMethod(to: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: '🎉 Email de Prueba - Ecommerce',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EAB308;">¡Configuración exitosa!</h1>
          <p>Este es un email de prueba del sistema de notificaciones.</p>
          <p>Si recibiste este email, significa que la configuración de Brevo está funcionando correctamente.</p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 14px;">
            Enviado desde tu panel de administración de Ecommerce
          </p>
        </div>
      `
    });
  }

  /**
   * Enviar reporte de inventario por email
   */
  async sendInventoryReport(to: string, csvData: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: '📊 Reporte de Inventario - ' + new Date().toLocaleDateString('es-ES'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #EAB308;">Reporte de Inventario</h1>
          <p>Adjunto encontrarás el reporte de inventario actualizado.</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #6B7280; font-size: 14px;">
            Este reporte fue generado automáticamente desde el panel de administración.
          </p>
        </div>
      `,
      attachments: [{
        filename: `inventario_${Date.now()}.csv`,
        content: csvData,
        contentType: 'text/csv'
      }]
    });
  }
}

export const emailService = new EmailService();

// ==================== EXPORTED FUNCTIONS FOR ROUTES ====================

/**
 * Verifica la conexión con el servicio de email
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    if (!process.env.BREVO_API_KEY) {
      console.log('⚠️  BREVO_API_KEY no configurado');
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error verifying email connection:', error);
    return false;
  }
}

/**
 * Envía un email de prueba
 */
export async function sendTestEmail(email: string) {
  try {
    const success = await emailService.sendTestEmailMethod(email);
    return {
      success,
      message: success 
        ? 'Email de prueba enviado exitosamente' 
        : 'Error al enviar email de prueba'
    };
  } catch (error) {
    console.error('Error sending test email:', error);
    return {
      success: false,
      message: 'Error al enviar email de prueba'
    };
  }
}

/**
 * Envía alerta de stock bajo
 */
export async function sendLowStockAlert(params: {
  productName: string;
  currentStock: number;
  threshold: number;
  emails: string[];
}) {
  try {
    const results = [];
    for (const email of params.emails) {
      const success = await emailService.sendEmail({
        to: email,
        subject: `⚠️ Alerta: Stock Bajo - ${params.productName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #EF4444;">⚠️ Alerta de Stock Bajo</h1>
            <p><strong>Producto:</strong> ${params.productName}</p>
            <p><strong>Stock actual:</strong> ${params.currentStock} unidades</p>
            <p><strong>Umbral de alerta:</strong> ${params.threshold} unidades</p>
            <p style="color: #EF4444; font-weight: bold;">¡Es necesario reabastecer este producto!</p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 14px;">
              Fecha: ${new Date().toLocaleString('es-ES')}
            </p>
          </div>
        `
      });
      results.push({ email, success });
    }
    
    return {
      success: results.every(r => r.success),
      sent: results.filter(r => r.success).length,
      total: results.length
    };
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    return {
      success: false,
      sent: 0,
      total: params.emails.length
    };
  }
}

/**
 * Envía reporte CSV por email
 */
export async function sendCSVReport(
  csvData: string,
  reportType: string,
  filename: string,
  emails: string[]
) {
  try {
    const reportTitles: { [key: string]: string } = {
      'most-sold': 'Productos Más Vendidos',
      'negative-diff': 'Productos con Diferencias Negativas',
      'adjustments': 'Historial de Ajustes',
      'inventory': 'Inventario Completo',
      'complete': 'Reporte Completo'
    };

    const title = reportTitles[reportType] || 'Reporte';
    const results = [];

    for (const email of emails) {
      const success = await emailService.sendEmail({
        to: email,
        subject: `📄 ${title} - ${new Date().toLocaleDateString('es-ES')}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #EAB308;">${title}</h1>
            <p>Adjunto encontrarás el reporte solicitado en formato CSV.</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
            <p><strong>Tipo:</strong> ${title}</p>
            <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
            <p style="color: #6B7280; font-size: 14px;">
              Este reporte fue generado automáticamente desde el panel de administración.
            </p>
          </div>
        `,
        attachments: [{
          filename: `${filename}_${Date.now()}.csv`,
          content: csvData,
          contentType: 'text/csv'
        }]
      });
      results.push({ email, success });
    }

    return {
      success: results.every(r => r.success),
      sent: results.filter(r => r.success).length,
      total: results.length,
      message: results.every(r => r.success)
        ? 'Reporte enviado exitosamente a todos los destinatarios'
        : `Reporte enviado a ${results.filter(r => r.success).length} de ${results.length} destinatarios`
    };
  } catch (error) {
    console.error('Error sending CSV report:', error);
    return {
      success: false,
      sent: 0,
      total: emails.length,
      message: 'Error al enviar el reporte'
    };
  }
}
