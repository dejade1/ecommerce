// CÓDIGO CORREGIDO - Sistema de Autenticación Seguro
// Archivo: server/services/authService.ts

import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const db = new PrismaClient();

// ====================================================================
// CONFIGURACIÓN
// ====================================================================

const JWT_CONFIG = {
  accessToken: {
    secret: env.JWT_SECRET,
    expiresIn: '15m', // Token de acceso corto
    issuer: 'robotics-ecommerce',
    audience: 'robotics-ecommerce-api'
  },
  refreshToken: {
    secret: env.JWT_REFRESH_SECRET,
    expiresIn: '7d', // Refresh token más largo
    issuer: 'robotics-ecommerce',
    audience: 'robotics-ecommerce-api'
  }
};

const ARGON2_CONFIG = {
  type: argon2.argon2id, // Más seguro
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4
};

// ====================================================================
// INTERFACES
// ====================================================================

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  sessionId: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface LoginResult {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  tokens: TokenPair;
  sessionId: string;
}

// ====================================================================
// HASH DE CONTRASEÑAS
// ====================================================================

/**
 * Hashea una contraseña usando Argon2
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, ARGON2_CONFIG);
  } catch (error) {
    console.error('Error hasheando contraseña:', error);
    throw new Error('Error al procesar la contraseña');
  }
}

/**
 * Verifica una contraseña contra su hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error('Error verificando contraseña:', error);
    return false;
  }
}

/**
 * Verifica si el hash necesita ser actualizado
 * (por ejemplo, si cambió la configuración de Argon2)
 */
export async function needsRehash(hash: string): Promise<boolean> {
  try {
    return argon2.needsRehash(hash, ARGON2_CONFIG);
  } catch (error) {
    return false;
  }
}

// ====================================================================
// GENERACIÓN DE TOKENS JWT
// ====================================================================

/**
 * Genera un access token JWT
 */
function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      type: 'access'
    },
    JWT_CONFIG.accessToken.secret,
    {
      expiresIn: JWT_CONFIG.accessToken.expiresIn,
      issuer: JWT_CONFIG.accessToken.issuer,
      audience: JWT_CONFIG.accessToken.audience,
      subject: payload.userId.toString()
    }
  );
}

/**
 * Genera un refresh token JWT
 */
function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      sessionId: payload.sessionId,
      type: 'refresh'
    },
    JWT_CONFIG.refreshToken.secret,
    {
      expiresIn: JWT_CONFIG.refreshToken.expiresIn,
      issuer: JWT_CONFIG.refreshToken.issuer,
      audience: JWT_CONFIG.refreshToken.audience,
      subject: payload.userId.toString()
    }
  );
}

/**
 * Genera un par de tokens (access + refresh)
 */
export function generateTokenPair(payload: JWTPayload): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload)
  };
}

/**
 * Verifica un access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.accessToken.secret, {
      issuer: JWT_CONFIG.accessToken.issuer,
      audience: JWT_CONFIG.accessToken.audience
    }) as any;
    
    if (decoded.type !== 'access') {
      throw new Error('Token type inválido');
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Token inválido');
    }
    throw error;
  }
}

/**
 * Verifica un refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.refreshToken.secret, {
      issuer: JWT_CONFIG.refreshToken.issuer,
      audience: JWT_CONFIG.refreshToken.audience
    }) as any;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Token type inválido');
    }
    
    return {
      userId: decoded.userId,
      email: '',
      role: '',
      sessionId: decoded.sessionId
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expirado');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Refresh token inválido');
    }
    throw error;
  }
}

// ====================================================================
// GESTIÓN DE SESIONES
// ====================================================================

/**
 * Crea una nueva sesión
 */
async function createSession(userId: number): Promise<string> {
  const sessionId = randomBytes(32).toString('hex');
  
  await db.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      userAgent: '', // Se puede agregar req.get('user-agent')
      ipAddress: '' // Se puede agregar req.ip
    }
  });
  
  return sessionId;
}

/**
 * Valida una sesión
 */
async function validateSession(sessionId: string): Promise<boolean> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: {
      expiresAt: true,
      revokedAt: true
    }
  });
  
  if (!session) {
    return false;
  }
  
  if (session.revokedAt) {
    return false;
  }
  
  if (session.expiresAt < new Date()) {
    return false;
  }
  
  return true;
}

/**
 * Revoca una sesión
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
}

/**
 * Revoca todas las sesiones de un usuario
 */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  await db.session.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

/**
 * Limpia sesiones expiradas
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  await db.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { revokedAt: { lt: thirtyDaysAgo } }
      ]
    }
  });
}

// ====================================================================
// REGISTRO DE USUARIOS
// ====================================================================

interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface RegisterResult {
  user: {
    id: number;
    email: string;
    name: string;
  };
}

/**
 * Registra un nuevo usuario
 */
export async function registerUser(
  input: RegisterInput
): Promise<RegisterResult> {
  // Verificar si el email ya existe
  const existingUser = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true }
  });
  
  if (existingUser) {
    throw new Error('El email ya está registrado');
  }
  
  // Hashear contraseña
  const hashedPassword = await hashPassword(input.password);
  
  // Crear usuario
  const user = await db.user.create({
    data: {
      email: input.email.toLowerCase(),
      password: hashedPassword,
      name: input.name,
      phone: input.phone,
      role: 'CUSTOMER', // Rol por defecto
      isActive: true
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });
  
  // Log de auditoría
  await db.auditLog.create({
    data: {
      action: 'USER_REGISTERED',
      userId: user.id,
      details: { email: user.email }
    }
  });
  
  return { user };
}

// ====================================================================
// LOGIN
// ====================================================================

interface LoginInput {
  email: string;
  password: string;
}

/**
 * Realiza el login de un usuario
 */
export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  // Normalizar email
  const email = input.email.toLowerCase().trim();
  
  // Buscar usuario
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      isActive: true,
      failedLoginAttempts: true,
      lockedUntil: true
    }
  });
  
  // Timing attack prevention - siempre verificar password
  const validUser = user !== null;
  const dummyHash = await hashPassword('dummy-password-for-timing-attack-prevention');
  const passwordToVerify = validUser ? user.password : dummyHash;
  
  const validPassword = await verifyPassword(input.password, passwordToVerify);
  
  // Verificar cuenta bloqueada
  if (validUser && user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new Error(
      `Cuenta bloqueada. Intenta nuevamente en ${minutesLeft} minutos`
    );
  }
  
  // Verificar credenciales
  if (!validUser || !validPassword) {
    // Incrementar intentos fallidos
    if (validUser) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= 5;
      
      await db.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: shouldLock
            ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
            : null
        }
      });
      
      // Log de auditoría
      await db.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          userId: user.id,
          ipAddress,
          details: { reason: 'invalid_credentials', attempts }
        }
      });
    }
    
    throw new Error('Credenciales inválidas');
  }
  
  // Verificar cuenta activa
  if (!user.isActive) {
    throw new Error('Cuenta desactivada. Contacta al administrador');
  }
  
  // Verificar si necesita rehash de contraseña
  if (await needsRehash(user.password)) {
    const newHash = await hashPassword(input.password);
    await db.user.update({
      where: { id: user.id },
      data: { password: newHash }
    });
  }
  
  // Crear sesión
  const sessionId = await createSession(user.id);
  
  // Generar tokens
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId
  };
  
  const tokens = generateTokenPair(payload);
  
  // Actualizar usuario
  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
  
  // Log de auditoría
  await db.auditLog.create({
    data: {
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      ipAddress,
      details: { sessionId }
    }
  });
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    tokens,
    sessionId
  };
}

// ====================================================================
// REFRESH TOKEN
// ====================================================================

/**
 * Refresca el access token usando un refresh token válido
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPair> {
  // Verificar refresh token
  const decoded = verifyRefreshToken(refreshToken);
  
  // Validar sesión
  const sessionValid = await validateSession(decoded.sessionId);
  if (!sessionValid) {
    throw new Error('Sesión inválida o expirada');
  }
  
  // Obtener datos del usuario
  const user = await db.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true
    }
  });
  
  if (!user || !user.isActive) {
    throw new Error('Usuario inválido');
  }
  
  // Generar nuevo access token (mantener mismo refresh token)
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: decoded.sessionId
  };
  
  const newAccessToken = generateAccessToken(payload);
  
  return {
    accessToken: newAccessToken,
    refreshToken // Mantener el mismo refresh token
  };
}

// ====================================================================
// LOGOUT
// ====================================================================

/**
 * Cierra la sesión de un usuario
 */
export async function logoutUser(sessionId: string): Promise<void> {
  await revokeSession(sessionId);
  
  // Log de auditoría
  const session = await db.session.findUnique({
    where: { id: sessionId },
    select: { userId: true }
  });
  
  if (session) {
    await db.auditLog.create({
      data: {
        action: 'LOGOUT',
        userId: session.userId,
        details: { sessionId }
      }
    });
  }
}

// ====================================================================
// CAMBIO DE CONTRASEÑA
// ====================================================================

interface ChangePasswordInput {
  userId: number;
  currentPassword: string;
  newPassword: string;
}

/**
 * Cambia la contraseña de un usuario
 */
export async function changePassword(
  input: ChangePasswordInput
): Promise<void> {
  // Obtener usuario con contraseña actual
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, password: true, email: true }
  });
  
  if (!user) {
    throw new Error('Usuario no encontrado');
  }
  
  // Verificar contraseña actual
  const validPassword = await verifyPassword(
    input.currentPassword,
    user.password
  );
  
  if (!validPassword) {
    throw new Error('Contraseña actual incorrecta');
  }
  
  // Verificar que la nueva contraseña sea diferente
  const samePassword = await verifyPassword(input.newPassword, user.password);
  if (samePassword) {
    throw new Error('La nueva contraseña debe ser diferente a la actual');
  }
  
  // Hashear nueva contraseña
  const hashedPassword = await hashPassword(input.newPassword);
  
  // Actualizar contraseña
  await db.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date()
    }
  });
  
  // Revocar todas las sesiones existentes (forzar re-login)
  await revokeAllUserSessions(user.id);
  
  // Log de auditoría
  await db.auditLog.create({
    data: {
      action: 'PASSWORD_CHANGED',
      userId: user.id,
      details: {}
    }
  });
}

// ====================================================================
// RESET DE CONTRASEÑA
// ====================================================================

/**
 * Genera un token de reset de contraseña
 */
export async function generatePasswordResetToken(
  email: string
): Promise<string> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true }
  });
  
  if (!user) {
    // No revelar si el email existe
    throw new Error('Si el email existe, recibirás instrucciones');
  }
  
  // Generar token aleatorio
  const token = randomBytes(32).toString('hex');
  const hashedToken = await hashPassword(token);
  
  // Guardar token
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hora
    }
  });
  
  // Log de auditoría
  await db.auditLog.create({
    data: {
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
      details: { email: user.email }
    }
  });
  
  return token; // Devolver token sin hashear para enviar por email
}

/**
 * Resetea la contraseña usando un token válido
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  // Buscar tokens no expirados
  const resetTokens = await db.passwordResetToken.findMany({
    where: {
      expiresAt: { gt: new Date() },
      usedAt: null
    },
    include: {
      user: {
        select: { id: true, email: true }
      }
    }
  });
  
  // Verificar token
  let validToken = null;
  for (const rt of resetTokens) {
    if (await verifyPassword(token, rt.token)) {
      validToken = rt;
      break;
    }
  }
  
  if (!validToken) {
    throw new Error('Token inválido o expirado');
  }
  
  // Hashear nueva contraseña
  const hashedPassword = await hashPassword(newPassword);
  
  // Actualizar contraseña
  await db.user.update({
    where: { id: validToken.userId },
    data: {
      password: hashedPassword,
      passwordChangedAt: new Date()
    }
  });
  
  // Marcar token como usado
  await db.passwordResetToken.update({
    where: { id: validToken.id },
    data: { usedAt: new Date() }
  });
  
  // Revocar todas las sesiones
  await revokeAllUserSessions(validToken.userId);
  
  // Log de auditoría
  await db.auditLog.create({
    data: {
      action: 'PASSWORD_RESET_COMPLETED',
      userId: validToken.userId,
      details: { email: validToken.user.email }
    }
  });
}

// ====================================================================
// TAREAS PROGRAMADAS
// ====================================================================

/**
 * Ejecutar limpieza de sesiones expiradas (ejecutar cada hora)
 */
export async function runScheduledCleanup(): Promise<void> {
  await cleanupExpiredSessions();
  
  // Limpiar tokens de reset expirados
  await db.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { not: null } }
      ]
    }
  });
}
