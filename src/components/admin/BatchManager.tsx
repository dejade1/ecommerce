import React from 'react';
import { Package, Calendar, AlertTriangle } from 'lucide-react';

/**
 * BATCH MANAGER - FUNCIONALIDAD PENDIENTE
 * 
 * Este componente requiere implementación de gestión de lotes en el backend.
 * Por ahora muestra un mensaje informativo.
 * 
 * TODO Backend:
 * - Crear tabla `batches` en la base de datos
 * - Endpoints para crear/listar/actualizar lotes
 * - Relación lotes-productos
 * - Sistema de alertas por vencimiento
 */

const BatchManager: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Mensaje Informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <Package className="h-16 w-16 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Gestión de Lotes
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          La funcionalidad de gestión de lotes está en desarrollo. Pronto podrás:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* Característica 1 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
            <div className="flex justify-center mb-3">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Registrar Lotes</h3>
            <p className="text-sm text-gray-600">
              Crear y gestionar lotes de productos con códigos únicos y cantidades
            </p>
          </div>

          {/* Característica 2 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
            <div className="flex justify-center mb-3">
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Control de Vencimiento</h3>
            <p className="text-sm text-gray-600">
              Rastrear fechas de caducidad y recibir alertas tempranas
            </p>
          </div>

          {/* Característica 3 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-blue-100">
            <div className="flex justify-center mb-3">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Sistema de Alertas</h3>
            <p className="text-sm text-gray-600">
              Notificaciones automáticas para lotes próximos a vencer
            </p>
          </div>
        </div>

        {/* Nota Técnica */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Nota Técnica
              </p>
              <p className="text-sm text-yellow-800">
                Esta funcionalidad requiere implementación en el backend (endpoints API y base de datos). 
                Por ahora, puedes gestionar el inventario desde la pestaña "Ajustes de Stock".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Información de Desarrollo */}
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🛠️ Implementación Futura
        </h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <p><strong>Backend:</strong> Crear tabla <code className="bg-gray-100 px-2 py-1 rounded text-xs">batches</code> con campos: id, productId, batchCode, quantity, expiryDate, createdAt</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <p><strong>API Endpoints:</strong> POST /api/admin/batches, GET /api/admin/batches/:productId, PUT /api/admin/batches/:id</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <p><strong>Frontend:</strong> Formulario de creación, tabla de listado, sistema de alertas por fecha</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <p><strong>Lógica:</strong> FIFO (First In First Out) automático al realizar ventas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchManager;
