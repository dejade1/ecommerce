/**
 * REPORT SCHEDULER SERVICE
 *
 * Servicio para programar el envío automático de reportes diarios
 */

import * as cron from 'node-cron';
import { sendCSVReport } from './emailService';
import { generateCompleteReportCSV } from './csvService';
import fs from 'fs';
import path from 'path';

// Archivo donde se guardan las configuraciones
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

interface AppSettings {
  autoReportEnabled: boolean;
  autoReportTime: string; // formato HH:MM
  adminEmails: string[];
}

let scheduledTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Lee la configuración desde el archivo
 */
function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }

  // Configuración por defecto
  return {
    autoReportEnabled: false,
    autoReportTime: '09:00',
    adminEmails: [],
  };
}

/**
 * Convierte una hora en formato HH:MM a cron expression
 * Ejemplo: "14:30" => "30 14 * * *" (todos los días a las 14:30)
 */
function timeToCron(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${minutes} ${hours} * * *`; // minutos horas día mes día_semana
}

/**
 * Función que se ejecuta cuando llega la hora programada
 */
async function sendScheduledReport() {
  try {
    const settings = loadSettings();

    if (!settings.autoReportEnabled) {
      console.log('📧 Auto-report is disabled, skipping...');
      return;
    }

    if (!settings.adminEmails || settings.adminEmails.length === 0) {
      console.log('⚠️ No admin emails configured, skipping auto-report');
      return;
    }

    console.log(`📧 [SCHEDULED] Sending automatic report to ${settings.adminEmails.length} recipient(s)...`);

    // Generar el CSV y enviarlo
    const csvContent = await generateCompleteReportCSV();
    await sendCSVReport(csvContent, 'complete', 'Reporte Automático Diario', settings.adminEmails);

    console.log(`✅ [SCHEDULED] Automatic report sent successfully at ${new Date().toLocaleString('es-ES')}`);
  } catch (error) {
    console.error('❌ [SCHEDULED] Error sending automatic report:', error);
  }
}

/**
 * Inicia o reinicia el scheduler con la configuración actual
 */
export function startReportScheduler() {
  // Detener el scheduler anterior si existe
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Previous scheduler stopped');
  }

  const settings = loadSettings();

  if (!settings.autoReportEnabled) {
    console.log('📧 Automatic report scheduling is DISABLED');
    return;
  }

  if (!settings.adminEmails || settings.adminEmails.length === 0) {
    console.log('⚠️ Cannot start scheduler: No admin emails configured');
    return;
  }

  try {
    const cronExpression = timeToCron(settings.autoReportTime);

    // Usar la zona horaria de la configuración o Mexico_City por defecto
    const timezone = (settings as any).timezone || 'America/Mexico_City';

    // Crear y programar la tarea
    scheduledTask = cron.schedule(cronExpression, sendScheduledReport, {
      timezone: timezone,
    });

    console.log(`✅ Report scheduler STARTED`);
    console.log(`📧 Reports will be sent daily at ${settings.autoReportTime}`);
    console.log(`🌍 Timezone: ${timezone}`);
    console.log(`📬 Recipients: ${settings.adminEmails.join(', ')}`);
    console.log(`⏰ Cron expression: ${cronExpression}`);
  } catch (error) {
    console.error('❌ Error starting scheduler:', error);
  }
}

/**
 * Detiene el scheduler
 */
export function stopReportScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Report scheduler STOPPED');
  }
}

/**
 * Reinicia el scheduler (útil cuando se actualiza la configuración)
 */
export function restartReportScheduler() {
  console.log('🔄 Restarting report scheduler...');
  stopReportScheduler();
  startReportScheduler();
}
