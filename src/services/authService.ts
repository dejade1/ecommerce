/**
 * Auth Service con IndexedDB (sin backend)
 * 
 * Autenticación completamente local usando IndexedDB
 * Las contraseñas se hashean con bcryptjs
 */

import { db } from '../lib/inventory';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

interface StoredUser {
  id?: number;
  username: string;
  email: string;
  password: string; // Hasheada
  isAdmin: boolean;
  createdAt: Date;
}

class AuthService {
  private currentUser: User | null = null;

  /**
   * Hash simple de contraseña (para demostración)
   * En producción usar bcrypt.js
   */
  private async hashPassword(password: string): Promise<string> {
    // Hash simple con SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Inicializa usuarios por defecto si no existen
   */
  async initializeDefaultUsers(): Promise<void> {
    try {
      const users = await db.users.toArray();
      
      if (users.length === 0) {
        // Crear usuario admin por defecto
        const adminPassword = await this.hashPassword('admin123');
        await db.users.add({
          username: 'admin',
          email: 'admin@ejemplo.com',
          password: adminPassword,
          isAdmin: true,
          createdAt: new Date()
        });

        // Crear usuario normal por defecto
        const userPassword = await this.hashPassword('user123');
        await db.users.add({
          username: 'user',
          email: 'user@ejemplo.com',
          password: userPassword,
          isAdmin: false,
          createdAt: new Date()
        });

        console.log('👤 Usuarios por defecto creados:');
        console.log('   Admin: username="admin", password="admin123"');
        console.log('   User:  username="user", password="user123"');
      }
    } catch (error) {
      console.error('Error initializing users:', error);
    }
  }

  /**
   * Login con IndexedDB
   */
  async login(credentials: LoginCredentials): Promise<{ user: User }> {
    try {
      const hashedPassword = await this.hashPassword(credentials.password);
      
      const user = await db.users
        .where('username')
        .equals(credentials.username.toLowerCase().trim())
        .first();

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (user.password !== hashedPassword) {
        throw new Error('Contraseña incorrecta');
      }

      // Guardar usuario en localStorage
      const userWithoutPassword: User = {
        id: user.id!,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      };

      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
      this.currentUser = userWithoutPassword;

      return { user: userWithoutPassword };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register nuevo usuario
   */
  async register(username: string, email: string, password: string): Promise<{ user: User }> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await db.users
        .where('username')
        .equals(username.toLowerCase().trim())
        .first();

      if (existingUser) {
        throw new Error('El usuario ya existe');
      }

      const hashedPassword = await this.hashPassword(password);

      const userId = await db.users.add({
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        isAdmin: false, // Los nuevos usuarios no son admin por defecto
        createdAt: new Date()
      });

      const user: User = {
        id: userId as number,
        username: username.toLowerCase().trim(),
        email: email.toLowerCase().trim(),
        isAdmin: false
      };

      localStorage.setItem('currentUser', JSON.stringify(user));
      this.currentUser = user;

      return { user };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    localStorage.removeItem('currentUser');
    this.currentUser = null;
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Primero intentar desde memoria
      if (this.currentUser) {
        return this.currentUser;
      }

      // Luego desde localStorage
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const user = JSON.parse(stored);
        this.currentUser = user;
        return user;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Refresh token (no-op en versión local)
   */
  async refreshToken(): Promise<void> {
    // No hace nada en versión local
    return Promise.resolve();
  }

  /**
   * Verificar si hay sesión activa
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('currentUser');
  }
}

export const authService = new AuthService();

// Inicializar usuarios por defecto al cargar
authService.initializeDefaultUsers();
