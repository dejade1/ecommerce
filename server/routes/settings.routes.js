import express from 'express';
import { getSetting, getSettings, setSetting } from '../api/settings.js';

const router = express.Router();

// GET /api/settings - Obtener todas las configuraciones
router.get('/', getSettings);

// GET /api/settings/:key - Obtener una configuración específica
router.get('/:key', getSetting);

// PUT /api/settings/:key - Actualizar o crear configuración
router.put('/:key', setSetting);

export default router;
