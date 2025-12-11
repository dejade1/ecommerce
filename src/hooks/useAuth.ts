import { useState, useEffect, useCallback } from 'react';
import { authService, User } from '../lib/auth-service';
import { useErrorHandler } from '../utils/errorHandler';

// Tipos locales que antes venían de services/authService
export interface LoginCredentials {
    username: string;
    password: string;
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { handleError } = useErrorHandler();

    // ✅ CORREGIDO: logout definido antes para usarlo en dependencias
    const logout = useCallback(async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            // Opcional: recargar página para limpiar estados
            window.location.href = '/';
        }
    }, []);

    // Cargar usuario al montar el componente
    useEffect(() => {
        loadUser();
    }, []);

    // ✅ CORREGIDO: logout agregado a dependencias (previene memory leak)
    useEffect(() => {
        if (!isAuthenticated) return;

        // Refrescar token cada 14 minutos (antes de que expire el de 15 min)
        const interval = setInterval(async () => {
            try {
                // Nota: auth-service.ts no tiene refreshToken, se hace automáticamente con cookies
                const currentUser = await authService.checkAuth();
                if (!currentUser) {
                    logout();
                }
            } catch (error) {
                console.error('Session check failed, logging out:', error);
                logout();
            }
        }, 14 * 60 * 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated, logout]); // ✅ Incluir logout

    const loadUser = async () => {
        try {
            const currentUser = await authService.checkAuth();
            if (currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
            }
        } catch (error) {
            // Si falla al cargar usuario (ej. 401), no es un error crítico, solo no está logueado
            setUser(null);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const login = useCallback(async (credentials: LoginCredentials) => {
        try {
            const loggedUser = await authService.login(credentials.username, credentials.password);
            setUser(loggedUser);
            setIsAuthenticated(true);
            return loggedUser;
        } catch (error) {
            handleError(error);
            throw error;
        }
    }, [handleError]);

    return {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
    };
}
