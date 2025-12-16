import React, { useState, useEffect } from 'react';
import { Plus, Minus, Save, AlertTriangle, Package } from 'lucide-react';

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

const API_URL = 'http://localhost:3000';

// ==================== COMPONENTE ====================

export function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<number>(0);
  const [formData, setFormData] = useState<{
    productId: number;
    quantity: number;
    type: 'add' | 'subtract' | 'set';
    note: string;
    newPrice: string;
  }>({
    productId: 0,
    quantity: 1,
    type: 'add',
    note: '',
    newPrice: ''
  });

  useEffect(() => {
    loadProducts();
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
   * ✅ Carga lotes de un producto
   */
  async function loadProductBatches(productId: number) {
    try {
      const response = await fetch(`${API_URL}/api/admin/batches/product/${productId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      // Filtrar solo lotes con stock disponible
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
   * ✅ Actualiza stock en el backend
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

    // ✅ Validar selección de lote si es retiro de stock
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
      let newStock = product.stock;

      // Calcular nuevo stock según el tipo
      switch (formData.type) {
        case 'add':
          newStock = product.stock + formData.quantity;
          break;
        case 'subtract':
          newStock = Math.max(0, product.stock - formData.quantity);
          break;
        case 'set':
          newStock = formData.quantity;
          break;
      }

      // Preparar datos para actualizar
      const updateData: any = {
        stock: newStock
      };

      // Actualizar precio si se especificó
      if (formData.newPrice) {
        const newPrice = parseFloat(formData.newPrice);
        if (!isNaN(newPrice) && newPrice >= 0) {
          updateData.price = newPrice;
        }
      }

      // ✅ Enviar actualización al backend
      const response = await fetch(`${API_URL}/api/admin/products/${formData.productId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al actualizar stock');
      }

      // ✅ Si es retiro con lote, decrementar el lote
      if (formData.type === 'subtract' && selectedBatchId > 0) {
        const selectedBatch = batches.find(b => b.id === selectedBatchId);
        if (selectedBatch) {
          await fetch(`${API_URL}/api/admin/batches/${selectedBatchId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quantity: selectedBatch.quantity - formData.quantity
            })
          });
          setSuccess(`Stock actualizado. Retiradas ${formData.quantity} unidades del lote ${selectedBatch.batchCode}`);
        }
      } else {
        setSuccess(`Stock actualizado correctamente: ${product.title} ahora tiene ${newStock} unidades`);
      }

      // Resetear formulario
      setFormData({
        productId: 0,
        quantity: 1,
        type: 'add',
        note: '',
        newPrice: ''
      });
      setSelectedBatchId(0);
      setBatches([]);

      // Recargar productos
      await loadProducts();
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

      // Resetear formulario
      setFormData({
        productId: 0,
        quantity: 1,
        type: 'add',
        note: '',
        newPrice: ''
      });

      // Recargar productos
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar producto');
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
      <h2 className="text-xl font-semibold mb-6">Ajuste de Inventario</h2>

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
        {/* Selector de Producto */}
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

        {/* Tipo de Movimiento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Ajuste
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'add' | 'subtract' | 'set' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
          >
            <option value="add">Añadir al Stock</option>
            <option value="subtract">Restar del Stock (Retiro)</option>
            <option value="set">Establecer Stock (sobrescribir)</option>
          </select>
        </div>

        {/* ✅ SELECCIÓN DE LOTE (solo si es retiro y hay lotes) */}
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

        {/* Cantidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {formData.type === 'set' ? 'Nuevo Stock' : 'Cantidad'}
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(0, prev.quantity - 1) }))}
              className="p-2 rounded-md bg-gray-100 hover:bg-gray-200"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
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

        {/* Nuevo Precio (Opcional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nuevo Precio Unitario ($) - Opcional
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.newPrice}
            onChange={(e) => setFormData({ ...formData, newPrice: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            placeholder="Dejar vacío para mantener el precio actual"
          />
        </div>

        {/* Nota */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nota - Opcional
          </label>
          <input
            type="text"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            placeholder="Razón del ajuste de inventario"
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center font-medium py-2 px-4 rounded-md bg-yellow-400 hover:bg-yellow-500 text-gray-900 transition-colors"
          >
            <Save className="w-5 h-5 mr-2" />
            Guardar Ajuste
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
