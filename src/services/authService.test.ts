import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';

// Mock global fetch
global.fetch = vi.fn();

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('debe hacer login correctamente', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      const result = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      );
    });

    it('debe sanitizar el username', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: {} }),
      });

      await authService.login({
        username: '<script>alert("xss")</script>',
        password: 'password',
      });

      const callArgs = (global.fetch as any).mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      // El username debe estar sanitizado
      expect(body.username).not.toContain('<script>');
    });
  });

  // ✅ TEST CRÍTICO: Verificar que refreshToken existe
  describe('refreshToken', () => {
    it('debe existir el método refreshToken', () => {
      expect(authService.refreshToken).toBeDefined();
      expect(typeof authService.refreshToken).toBe('function');
    });

    it('debe llamar al endpoint /api/auth/refresh', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Token refrescado' }),
      });

      await authService.refreshToken();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('debe retornar usuario si está autenticado', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        isAdmin: false,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      const result = await authService.getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it('debe retornar null si no está autenticado (401)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'No autenticado' }),
      });

      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  // ✅ TEST CRÍTICO: Verificar timeout de requests
  describe('Request timeout', () => {
    it('debe abortar request después del timeout', async () => {
      vi.useFakeTimers();

      const fetchPromise = new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: async () => ({ user: {} }),
          });
        }, 15000); // 15 segundos (más que el timeout de 10s)
      });

      (global.fetch as any).mockImplementationOnce(() => fetchPromise);

      const loginPromise = authService.login({
        username: 'test',
        password: 'test',
      });

      // Avanzar el tiempo 11 segundos
      vi.advanceTimersByTime(11000);

      await expect(loginPromise).rejects.toThrow();

      vi.useRealTimers();
    });
  });
});
