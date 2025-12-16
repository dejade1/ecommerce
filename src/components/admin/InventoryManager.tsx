import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save, AlertTriangle, Package, History, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

// ==================== TIPOS ====================

interface Product {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  stock: number;
  initialStock?: number | null;
  unit: string;
  image?: string | null;
  rating: number;
  category?: string | null;
  sales: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface Batch {
  id: number;
  productId: number;
  batchCode: string;
  quantity: number;
  expiryDate: string;
  createdAt: string;
}

interface StockAdjustment {
  id: number;
  productId: number;
  adjustmentType: string;
  quantityBefore: number;
  quantityAfter: number;
  difference: number;
  note?: string | null;
  userId: string;
  timestamp: string;
  product: {
    title: string;
  };
}

const API_URL = 'http://localhost:3000';

// ==================== COMPONENTE ====================

export function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stockHistory, setStockHistory] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<number>(0);
  const [formData, setFormData] = useState<{
    productId: number;
    quantity: number;
    type: 'add' | 'subtract';
    note: string;
    newPrice: string;
    expiryDate: string;
  }>({
    productId: 0,
    quantity: 1,
    type: 'add',
    note: '',
    newPrice: '',
    expiryDate: ''
  });

  useEffect(() => {
    loadProducts();
    loadStockHistory();
  }, []);

  useEffect(() => {
    if (formData.productId > 0 && formData.type === 'subtract') {
      loadProductBatches(formData.productId);
    } else {
      setBatches([]);
      setSelectedBatchId(0);
    }
  }, [formData.productId, formData.type]);

  /**
   * ✅ Carga productos desde el backend
   */
  async function loadProducts() {
    try {
      const response = await fetch(`${API_URL}/api/admin/products`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }

  /**
   * ✅ Carga historial de ajustes de stock
   */
  async function loadStockHistory() {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/stock-adjustments?limit=20`, {
        credentials: 'include'
      });
      const data = await response.json();
      setStockHistory(data.adjustments || []);
    } catch (error) {
      console.error('Error loading stock history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }

  /**
   * ✅ Carga lotes de un producto
   */
  async function loadProductBatches(productId: number) {
    try {
      const response = await fetch(`${API_URL}/api/admin/batches/product/${productId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      const availableBatches = (data.batches || []).filter((b: Batch) => b.quantity > 0);
      setBatches(availableBatches);
    } catch (error) {
      console.error('Error loading batches:', error);
      setBatches([]);
    }
  }

  const handleProductSelect = (productId: number) => {
    const selectedProduct = products.find(p => p.id === productId);
    setFormData(prev => ({
      ...prev,
      productId,
      newPrice: selectedProduct ? selectedProduct.price.toString() : ''
    }));
    setSelectedBatchId(0);
  };

  /**
   * ✅ Actualiza stock y crea lote automáticamente al reabastecer
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.productId) {
      setError('Por favor seleccione un producto');
      return;
    }

    const product = products.find(p => p.id === formData.productId);
    if (!product) {
      setError('Producto no encontrado');
      return;
    }

    if (formData.type === 'add' && !formData.expiryDate) {
      setError('Debe ingresar la fecha de vencimiento del lote');
      return;
    }

    if (formData.type === 'subtract') {
      if (batches.length > 0 && selectedBatchId === 0) {
        setError('Este producto tiene lotes. Debe seleccionar un lote para retirar stock.');
        return;
      }

      if (selectedBatchId > 0) {
        const selectedBatch = batches.find(b => b.id === selectedBatchId);
        if (!selectedBatch) {
          setError('Lote seleccionado no encontrado');
          return;
        }
        if (selectedBatch.quantity < formData.quantity) {
          setError(`El lote ${selectedBatch.batchCode} solo tiene ${selectedBatch.quantity} unidades disponibles`);
          return;
        }
      }
    }

    try {
      if (formData.type === 'add') {
        const response = await fetch(`${API_URL}/api/admin/batches`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: formData.productId,
            quantity: formData.quantity,
            expiryDate: formData.expiryDate
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al crear lote');
        }

        setSuccess(`✅ Lote ${result.batch.batchCode} creado con ${formData.quantity} unidades`);
      }
      else if (formData.type === 'subtract') {
        if (selectedBatchId === 0) {
          setError('Debe seleccionar un lote');
          return;
        }

        const selectedBatch = batches.find(b => b.id === selectedBatchId);
        if (!selectedBatch) {
          setError('Lote no encontrado');
          return;
        }

        const updateResponse = await fetch(`${API_URL}/api/admin/products/${formData.productId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock: Math.max(0, product.stock - formData.quantity)
          })
        });

        if (!updateResponse.ok) {
          throw new Error('Error al actualizar stock del producto');
        }

        await fetch(`${API_URL}/api/admin/batches/${selectedBatchId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: selectedBatch.quantity - formData.quantity
          })
        });

        setSuccess(`✅ Retiradas ${formData.quantity} unidades del lote ${selectedBatch.batchCode}`);
      }

      setFormData({
        productId: 0,
        quantity: 1,
        type: 'add',
        note: '',
        newPrice: '',
        expiryDate: ''
      });
      setSelectedBatchId(0);
      setBatches([]);

      await loadProducts();
      await loadStockHistory();
    } catch (error) {
      console.error('Error updating stock:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar stock');
    }
  }

  /**
   * ✅ Elimina producto del backend
   */
  async function handleDeleteProduct() {
    if (!formData.productId) {
      setError('Por favor seleccione un producto');
      return;
    }

    const product = products.find(p => p.id === formData.productId);
    if (!product) return;

    if (!confirm(`¿Está seguro de eliminar "${product.title}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/products/${formData.productId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al eliminar producto');
      }

      setSuccess(`Producto "${product.title}" eliminado correctamente`);

      setFormData({
        productId: 0,
        quantity: 1,
        type: 'add',
        note: '',
        newPrice: '',
        expiryDate: ''
      });

      await loadProducts();
      await loadStockHistory();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar producto');
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function getAdjustmentTypeLabel(type: string): { label: string; color: string; icon: React.ReactNode } {
    switch (type) {
      case 'batch':
        return { label: 'Reabastecimiento', color: 'text-green-700 bg-green-50', icon: <TrendingUp className="h-4 w-4" /> };
      case 'subtract':
        return { label: 'Retiro', color: 'text-red-700 bg-red-50', icon: <TrendingDown className="h-4 w-4" /> };
      case 'delete':
        return { label: 'Eliminación', color: 'text-gray-700 bg-gray-50', icon: <Trash2 className="h-4 w-4" /> };
      default:
        return { label: type, color: 'text-blue-700 bg-blue-50', icon: <History className="h-4 w-4" /> };
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Ajuste de Inventario</h2>
        <p className="text-sm text-gray-600 mt-1">
          Reabastecer crea lotes automáticamente. Retirar stock requiere selección de lote.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-500 p-3 rounded-md text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Producto
          </label>
          <select
            value={formData.productId}
            onChange={(e) => handleProductSelect(Number(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
          >
            <option value={0}>Seleccionar producto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title} (Stock actual: {product.stock})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Ajuste
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'add' | 'subtract' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
          >
            <option value="add">Reabastecer (Crear Lote)</option>
            <option value="subtract">Retirar del Stock (De Lote Existente)</option>
          </select>
        </div>

        {formData.type === 'add' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <label className="block text-sm font-medium text-green-900 mb-2">
              Fecha de Vencimiento del Lote *
            </label>
            <input
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="block w-full rounded-md border-green-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
              required
            />
            <p className="mt-2 text-xs text-green-700">
              📦 Se creará un nuevo lote automáticamente con código único (ej: ArrPreBl-2-16122025)
            </p>
          </div>
        )}

        {formData.type === 'subtract' && batches.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-center mb-2">
              <Package className="h-5 w-5 text-blue-600 mr-2" />
              <label className="block text-sm font-medium text-blue-900">
                Seleccionar Lote a Retirar *
              </label>
            </div>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(Number(e.target.value))}
              className="block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value={0}>-- Seleccionar lote --</option>
              {batches.map((batch) => {
                const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                return (
                  <option key={batch.id} value={batch.id}>
                    {batch.batchCode} | Disponible: {batch.quantity} unidades | Vence: {formatDate(batch.expiryDate)} ({daysLeft} días)
                  </option>
                );
              })}
            </select>
            <p className="mt-2 text-xs text-blue-700">
              📍 Este producto tiene lotes. Debe seleccionar de cuál lote desea retirar el stock.
            </p>
          </div>
        )}

        {formData.type === 'subtract' && batches.length === 0 && formData.productId > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Este producto no tiene lotes disponibles. No se puede retirar stock.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: prev.quantity + 1 }))}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={formData.type === 'subtract' && batches.length === 0}
            className="flex-1 flex items-center justify-center font-medium py-2 px-4 rounded-md bg-yellow-400 hover:bg-yellow-500 text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 mr-2" />
            {formData.type === 'add' ? 'Reabastecer (Crear Lote)' : 'Retirar Stock'}
          </button>

          {formData.productId > 0 && (
            <button
              type="button"
              onClick={handleDeleteProduct}
              className="flex items-center justify-center font-medium py-2 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Eliminar Producto
            </button>
          )}
        </div>
      </form>

      {/* ✅ TABLA DE HISTORIAL DE MOVIMIENTOS */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium flex items-center">
            <History className="h-5 w-5 mr-2 text-gray-700" />
            Historial de Movimientos
          </h3>
          <button
            onClick={loadStockHistory}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Actualizar
          </button>
        </div>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-400"></div>
          </div>
        ) : stockHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay movimientos registrados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Antes/Después
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nota
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockHistory.map((adjustment) => {
                  const typeInfo = getAdjustmentTypeLabel(adjustment.adjustmentType);
                  return (
                    <tr key={adjustment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(adjustment.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {adjustment.product.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.color}`}>
                          {typeInfo.icon}
                          <span className="ml-1">{typeInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${
                          adjustment.difference > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {adjustment.difference > 0 ? '+' : ''}{adjustment.difference}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {adjustment.quantityBefore} → {adjustment.quantityAfter}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {adjustment.userId}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {adjustment.note || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla de Inventario Actual */}
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Inventario Actual</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ventas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img 
                        src={product.image || 'https://via.placeholder.com/150?text=No+Image'} 
                        alt="" 
                        className="h-8 w-8 rounded-full mr-3 object-cover" 
                      />
                      <span className="text-sm font-medium text-gray-900">{product.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.stock < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.sales || 0} unidades
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
