import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ Obtener una configuración específica
export async function getetting(req, res) {
  try {
    const { key } = req.params;

    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('[ERROR] getetting:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
}

// ✅ Obtener TODAS las configuraciones
export async function getSettings(req, res) {
  try {
    const settings = await prisma.settings.findMany();

    // Convertir array a objeto {key: value}
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });

    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('[ERROR] getSettings:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
}

// ✅ Actualizar o crear configuración
export async function setSetting(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (!value) {
      return res.status(400).json({ error: 'El valor es requerido' });
    }

    // Upsert (crear si no existe, actualizar si existe)
    const setting = await prisma.settings.upsert({
      where: { key },
      update: {
        value,
        description: description || undefined
      },
      create: {
        key,
        value,
        description: description || null
      }
    });

    console.log(`[✅ SETTINGS] ${key} = ${value}`);

    res.json({ success: true, setting });
  } catch (error) {
    console.error('[ERROR] setSetting:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
}

// ✅ Inicializar configuraciones por defecto
export async function initializeSettings() {
  try {
    const defaultSettings = [
      {
        key: 'esp32_ip',
        value: '192.168.0.106',
        description: 'Dirección IP del ESP32 dispensador'
      },
      {
        key: 'esp32_timeout',
        value: '30000',
        description: 'Timeout en milisegundos para conexión ESP32'
      },
      {
        key: 'esp32_enabled',
        value: 'true',
        description: 'Habilitar/deshabilitar comunicación con ESP32'
      }
    ];

    for (const setting of defaultSettings) {
      await prisma.settings.upsert({
        where: { key: setting.key },
        update: {},
        create: setting
      });
    }

    console.log('[✅ SETTINGS] Configuraciones por defecto inicializadas');
  } catch (error) {
    console.error('[ERROR] initializeSettings:', error);
  }
}
