import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  handleError,
  AppError,
  ValidationError,
  AuthenticationError,
  useErrorHandler
} from './errorHandler';

describe('Error Handling', () => {
  describe('handleError', () => {
    it('debe retornar AppError sin cambios', () => {
      const error = new AppError('Test error');
      const result = handleError(error);
      expect(result).toBe(error);
    });

    it('debe convertir Error estándar a AppError', () => {
      const error = new Error('Standard error');
      const result = handleError(error);
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Standard error');
    });

    it('debe convertir string a AppError', () => {
      const result = handleError('String error');
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('String error');
    });

    it('debe manejar valores desconocidos', () => {
      const result = handleError({ unknown: 'object' });
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe('Ocurrió un error inesperado');
    });
  });

  describe('Custom Error Classes', () => {
    it('ValidationError debe tener statusCode 400', () => {
      const error = new ValidationError('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('AuthenticationError debe tener statusCode 401', () => {
      const error = new AuthenticationError();
      expect(error.statusCode).toBe(401);
    });
  });

  // ✅ TEST CRÍTICO: Verificar que useErrorHandler NO tiene variable shadowing
  describe('useErrorHandler hook', () => {
    it('debe manejar errores sin stack overflow', () => {
      const { result } = renderHook(() => useErrorHandler());

      // Si hay variable shadowing, esto causará stack overflow
      expect(() => {
        act(() => {
          result.current.handleError(new Error('Test'));
        });
      }).not.toThrow();

      expect(result.current.error).toBeInstanceOf(AppError);
      expect(result.current.hasError).toBe(true);
    });

    it('debe limpiar errores correctamente', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('Test'));
      });
      expect(result.current.hasError).toBe(true);

      act(() => {
        result.current.clearError();
      });
      expect(result.current.hasError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('debe manejar múltiples errores consecutivos', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('Error 1'));
      });
      expect(result.current.error?.message).toBe('Error 1');

      act(() => {
        result.current.handleError(new Error('Error 2'));
      });
      expect(result.current.error?.message).toBe('Error 2');
    });
  });
});
