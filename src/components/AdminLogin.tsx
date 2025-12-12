/**
 * ARCHIVO ACTUALIZADO: AdminLogin.tsx
 * 
 * CAMBIOS:
 * ✅ Integración con backend real (JWT)
 * ✅ Uso de AuthContext
 * ✅ Validación centralizada
 * ✅ Bloqueo de rol CLIENT
 * ✅ Solo permite ADMIN y USER
 * ✅ ELIMINADO: Opción de registro (solo login)
 */

import { useState, useCallback } from 'react';
import { X, Eye, EyeOff, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../lib/auth-service';
import {
  sanitizeString,
  validateFields,
  VALIDATION_RULES
} from '../utils/validation';

interface AdminLoginProps {
  onClose: () => void;
}

export function AdminLogin({ onClose }: AdminLoginProps) {
  // Estado
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contexto de autenticación
  const { login } = useAuth();

  // ==================== HANDLERS ====================

  /**
   * Maneja el login
   * Solo permite acceso a ADMIN y USER
   */
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Validación básica
      const validation = validateFields([
        { value: username, fieldName: 'Usuario', rules: ['required'] },
        { value: password, fieldName: 'Contraseña', rules: ['required'] }
      ]);

      if (!validation.isValid) {
        throw new Error(validation.errors[0]);
      }

      // Sanitizar inputs
      const cleanUsername = sanitizeString(username);

      // Llamada al servicio de autenticación
      const user = await authService.login(cleanUsername, password);

      // ✅ Bloquear clientes
      if (user.role === 'CLIENT') {
        throw new Error('Los clientes no tienen acceso al panel de administración. Por favor usa el botón "Cuenta" en la parte superior.');
      }

      // Actualizar contexto global
      login(user);

      setSuccess('¡Login exitoso!');
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión. Verifica tus credenciales.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [username, password, login, onClose]);

  // ==================== RENDER ====================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        {/* Título con ícono de administración */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-800">
              Acceso Administrativo
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            Solo para administradores y personal autorizado
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Los nuevos administradores deben ser registrados desde el panel de administración
          </p>
        </div>

        {/* Mensajes de error/éxito */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin}>
          {/* Campo Usuario */}
          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={VALIDATION_RULES.USERNAME_MIN_LENGTH}
              maxLength={VALIDATION_RULES.USERNAME_MAX_LENGTH}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          {/* Campo Contraseña */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                required
                minLength={VALIDATION_RULES.PASSWORD_MIN_LENGTH}
                maxLength={VALIDATION_RULES.PASSWORD_MAX_LENGTH}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Procesando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}