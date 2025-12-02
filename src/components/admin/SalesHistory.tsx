import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Package, DollarSign } from 'lucide-react';
import { db } from '../../lib/inventory';
import type { Order, OrderItem, Product } from '../../lib/inventory';

interface SaleDetail extends Order {
  items: (OrderItem & { product: Product })[];
}

export function SalesHistory() {
  const [sales, setSales] = useState<SaleDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const orders = await db.getAll('orders');
      const orderItems = await db.getAll('orderItems');
      const products = await db.getAll('products');

      // Agrupar items por orden y agregar detalles del producto
      const salesWithDetails = await Promise.all(
        orders.map(async (order) => {
          const items = orderItems
            .filter(item => item.orderId === order.id)
            .map(item => ({
              ...item,
              product: products.find(p => p.id === item.productId)!
            }));

          return {
            ...order,
            items
          };
        })
      );

      // Ordenar por fecha más reciente
      setSales(salesWithDetails.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Historial de Ventas</h2>
        <span className="text-sm text-gray-500">
          Total de ventas: {sales.length}
        </span>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay ventas</h3>
          <p className="mt-1 text-sm text-gray-500">
            Las ventas aparecerán aquí cuando se realicen.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {sales.map((sale) => (
              <li key={sale.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <p className="ml-2 text-sm text-gray-600">
                        {format(new Date(sale.createdAt), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <p className="ml-1 text-sm font-medium text-gray-900">
                        ${sale.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex flex-col space-y-2">
                      {sale.items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div className="flex items-center">
                            <img 
                              src={item.product.image} 
                              alt={item.product.title}
                              className="h-8 w-8 rounded-full object-cover mr-2"
                            />
                            <span className="text-gray-900">{item.product.title}</span>
                          </div>
                          <div className="flex items-center space-x-4">
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

                  <div className="mt-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      sale.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.status === 'completed' ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}