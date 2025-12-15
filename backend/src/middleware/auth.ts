/**
 * AUTH MIDDLEWARE
 *
 * Middlewares de autenticación reutilizables
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ==================== TIPOS ====================

interface JWTPayload {
    userId: number;
    username: string;
    role: string; // CORREGIDO: Usar 'role' en lugar de 'isAdmin'
}

export interface AuthRequest extends Request {
    user?: JWTPayload;
}

// ==================== UTILIDADES ====================

const JWT_SECRET = process.env.JWT_SECRET as string;

/**
 * Verifica access token
 */
function verifyAccessToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

// ==================== MIDDLEWARES ====================

/**
 * Middleware para verificar autenticación
 */
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
    // Intentar obtener token de cookie
    const token = req.cookies.accessToken;

    if (!token) {
        return res.status(401).json({ error: 'No autenticado' });
    }

    const payload = verifyAccessToken(token);

    if (!payload) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    req.user = payload;
    next();
}

/**
 * Middleware para verificar que el usuario es admin
 * CORREGIDO: Verificar role === 'ADMIN' en lugar de isAdmin
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    }
    next();
}
