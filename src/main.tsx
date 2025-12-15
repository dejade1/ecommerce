import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';

/**
 * ARQUITECTURA SIMPLIFICADA
 * 
 * ❌ ANTES: Frontend -> IndexedDB -> Backend (sincronización compleja)
 * ✅ AHORA: Frontend -> Backend directo (simple y directo)
 * 
 * Los productos se cargan directamente desde el backend.
 * No hay base de datos local (IndexedDB).
 * Como funciona en la vida real.
 */

console.log('🚀 Iniciando aplicación (sin IndexedDB, solo backend)');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
