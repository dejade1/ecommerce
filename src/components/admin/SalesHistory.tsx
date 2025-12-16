import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, DollarSign, Package, ShoppingCart, Filter } from 'lucide-react';

// ==================== TIPOS ====================

interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  productTitle?: string;
  productImage?: string;
}

interface Order {
  id: number;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
  items?: OrderItem[];
}

const API_URL = 'http://localhost:3000';

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjAgMTVDMTguMzQzMSAxNSAxNyAxNi4zNDMxIDE3IDE4QzE3IDE5LjY1NjkgMTguMzQzMSAyMSAyMCAyMUMyMS42NTY5IDIxIDIzIDE5LjY1NjkgMjMgMThDMjMgMTYuMzQzMSAyMS42NTY5IDE1IDIwIDE1Wk0xMyAxMkMxMi40NDc3IDEyIDEyIDEyLjQ0NzcgMTIgMTNWMjdDMTIgMjcuNTUyMyAxMi40NDc3IDI4IDEzIDI4SDI3QzI3LjU1MjMgMjggMjggMjcuNTUyMyAyOCAyN1YxM0MyOCAxMi40NDc3IDI3LjU1MjMgMTIgMjcgMTJIMTNaTTI2IDI2SDE0VjE0SDI2VjI2WiIgZmlsbD0iIzlDQTNCMCIvPjwvc3ZnPg==';

// ==================== COMPONENTE ====================

export function SalesHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  /**
   * ✅ Carga órdenes desde el backend
   */
  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar órdenes');
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error loading orders:', error);
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    // Filtrar por nombre de cliente
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!order.customerName.toLowerCase().includes(searchLower) &&
          !order.customerEmail.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Filtrar por rango de fechas
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(order.createdAt) < fromDate) return false;
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(order.createdAt) > toDate) return false;
    }

    return true;
  });

  // Calcular estadísticas
  const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = filteredOrders.length;
  const totalItems = filteredOrders.reduce((sum, order) => {
    return sum + (order.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Historial de Ventas</h2>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Ventas Totales</dt>
                  <dd className="text-lg font-medium text-gray-900">${totalSales.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Número de Órdenes</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Productos Vendidos</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalItems} unidades</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Cliente
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o email..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Desde
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Hasta
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"
            />
          </div>
        </div>

        {(searchTerm || dateFrom || dateTo) && (
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Lista de Órdenes */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Historial de Ventas ({filteredOrders.length})
          </h3>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-500 text-sm">
            {error}
          </div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
            <p className="mt-1 text-sm text-gray-500">
              {orders.length === 0
                ? 'Las ventas aparecerán aquí cuando se realicen.'
                : 'No hay ventas que coincidan con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          <ul role="list" className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <ShoppingCart className="h-6 w-6 text-green-600" />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Orden #{order.id}
                        </p>
                        <div className="flex items-center mt-1">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          <p className="text-sm text-gray-500">
                            {format(new Date(order.createdAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        ${order.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {/* Información del Cliente */}
                  <div className="mt-4 bg-gray-50 rounded-md p-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Cliente:</p>
                        <p className="text-sm text-gray-900 mt-1">{order.customerName}</p>
                        <p className="text-xs text-gray-500 mt-1">{order.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-700">Teléfono:</p>
                        <p className="text-sm text-gray-900 mt-1">{order.phone}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700">Dirección de Entrega:</p>
                      <p className="text-sm text-gray-900 mt-1">{order.address}</p>
                    </div>
                  </div>

                  {/* Productos de la Orden */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 bg-blue-50 rounded-md p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">Productos:</p>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center">
                              <img
                                src={item.productImage || PLACEHOLDER_IMAGE}
                                alt={item.productTitle || 'Producto'}
                                className="h-6 w-6 rounded-full object-cover mr-2"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = PLACEHOLDER_IMAGE;
                                }}
                              />
                              <span className="text-gray-900">
                                {item.productTitle || `Producto #${item.productId}`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-gray-500">
                                {item.quantity} × ${item.price.toFixed(2)}
                              </span>
                              <span className="font-medium text-gray-900">
                                ${(item.quantity * item.price).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
