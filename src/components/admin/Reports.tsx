/**
 * COMPONENTE: Reports
 *
 * Panel de reportes y análisis de datos con gráficos
 *
 * CARACTERÍSTICAS:
 * ✅ Reportes de ventas por día/semana/mes/año
 * ✅ Gráfico de productos más vendidos
 * ✅ Exportación a CSV
 * ✅ Estadísticas visuales
 */

import React, { useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign, Calendar, BarChart3, AlertTriangle, History } from 'lucide-react';
import { db } from '../../lib/db';
import { getAllProducts } from '../../lib/inventory';
import { getRecentAdjustments } from '../../lib/stock-adjustment-service';
import type { StockAdjustment } from '../../lib/db';

interface SalesReport {
  period: string;
  totalSales: number;
  revenue: number;
  orders: number;
}

interface ProductReport {
  id: number;
  name: string;
  sold: number;
  revenue: number;
}

interface ProductDifference {
  id: number;
  name: string;
  initialStock: number;
  currentStock: number;
  difference: number;
  status: 'critical' | 'attention' | 'ok';
}

interface AdjustmentWithProduct extends StockAdjustment {
  productName: string;
}

type DateRange = 'day' | 'week' | 'month' | 'year';

export function Reports() {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [topProducts, setTopProducts] = useState<ProductReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalStats, setTotalStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUnits: 0,
    averageOrderValue: 0
  });
  const [productDifferences, setProductDifferences] = useState<ProductDifference[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<AdjustmentWithProduct[]>([]);

  useEffect(() => {
    loadReportData();

    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      loadReportData();
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [dateRange]);

  /**
   * Agrupa fechas según el rango seleccionado
   */
  const groupByPeriod = (date: Date): string => {
    const d = new Date(date);

    switch (dateRange) {
      case 'day':
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return `Semana del ${weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`;
      case 'month':
        return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      case 'year':
        return d.getFullYear().toString();
      default:
        return d.toLocaleDateString('es-ES');
    }
  };

  /**
   * Filtra por rango de fechas
   */
  const isInDateRange = (date: Date): boolean => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffTime = now.getTime() - orderDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    switch (dateRange) {
      case 'day':
        return diffDays <= 30; // Últimos 30 días
      case 'week':
        return diffDays <= 90; // Últimas 12 semanas
      case 'month':
        return diffDays <= 365; // Últimos 12 meses
      case 'year':
        return diffDays <= 365 * 5; // Últimos 5 años
      default:
        return true;
    }
  };

  /**
   * Carga todos los datos del reporte
   */
  const loadReportData = async () => {
    setLoading(true);
    try {
      const [orders, orderItems, products] = await Promise.all([
        db.orders.toArray(),
        db.orderItems.toArray(),
        getAllProducts()
      ]);

      // Filtrar órdenes por rango de fecha
      const filteredOrders = orders.filter(order => isInDateRange(order.createdAt));

      // Agrupar ventas por período
      const salesByPeriod: { [key: string]: SalesReport } = {};

      filteredOrders.forEach(order => {
        const period = groupByPeriod(order.createdAt);
        if (!salesByPeriod[period]) {
          salesByPeriod[period] = {
            period,
            totalSales: 0,
            revenue: 0,
            orders: 0
          };
        }
        salesByPeriod[period].revenue += order.total;
        salesByPeriod[period].orders += 1;
      });

      // Agregar unidades vendidas
      orderItems.forEach(item => {
        const order = filteredOrders.find(o => o.id === item.orderId);
        if (order) {
          const period = groupByPeriod(order.createdAt);
          if (salesByPeriod[period]) {
            salesByPeriod[period].totalSales += Math.abs(item.quantity);
          }
        }
      });

      setSalesData(Object.values(salesByPeriod).sort((a, b) =>
        a.period.localeCompare(b.period)
      ));

      // Calcular productos más vendidos
      const productSales: { [key: number]: ProductReport } = {};

      orderItems.forEach(item => {
        const order = filteredOrders.find(o => o.id === item.orderId);
        if (order) {
          if (!productSales[item.productId]) {
            const product = products.find(p => p.id === item.productId);
            productSales[item.productId] = {
              id: item.productId,
              name: product?.title || 'Producto desconocido',
              sold: 0,
              revenue: 0
            };
          }
          productSales[item.productId].sold += Math.abs(item.quantity);
          productSales[item.productId].revenue += item.price * Math.abs(item.quantity);
        }
      });

      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.sold - a.sold);

      setTopProducts(sortedProducts);

      // Calcular estadísticas totales
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = filteredOrders.length;
      const totalUnits = Object.values(salesByPeriod).reduce((sum, period) => sum + period.totalSales, 0);

      setTotalStats({
        totalRevenue,
        totalOrders,
        totalUnits,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
      });

      // Calcular diferencias de stock
      const differences: ProductDifference[] = products
        .map(product => {
          // Si initialStock no está definido, usar el stock actual como inicial
          // Esto significa que el producto fue creado sin un stock inicial registrado
          const initialStock = product.initialStock !== undefined && product.initialStock !== null
            ? product.initialStock
            : product.stock;

          const difference = product.stock - initialStock;
          let status: 'critical' | 'attention' | 'ok' = 'ok';

          if (difference < -10) {
            status = 'critical';
          } else if (difference < 0) {
            status = 'attention';
          }

          return {
            id: product.id!,
            name: product.title,
            initialStock,
            currentStock: product.stock,
            difference,
            status
          };
        })
        .filter(d => d.difference < 0) // Solo mostrar productos con diferencia negativa
        .sort((a, b) => a.difference - b.difference); // Más negativo primero

      setProductDifferences(differences);

      // Cargar historial de ajustes (últimos 30 días)
      const adjustments = await getRecentAdjustments(30);
      const adjustmentsWithProduct: AdjustmentWithProduct[] = adjustments.map(adj => {
        const product = products.find(p => p.id === adj.productId);
        return {
          ...adj,
          productName: product?.title || 'Producto desconocido'
        };
      });
      setRecentAdjustments(adjustmentsWithProduct);

    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Exporta ventas por período a CSV
   */
  const exportSalesCSV = () => {
    let csvContent = 'Período,Unidades Vendidas,Ingresos,Órdenes\n';
    salesData.forEach(row => {
      csvContent += `"${row.period}",${row.totalSales},${row.revenue.toFixed(2)},${row.orders}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ventas_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /**
   * Exporta productos más vendidos a CSV
   */
  const exportProductsCSV = () => {
    let csvContent = 'Posición,Producto,Unidades Vendidas,Ingresos\n';
    topProducts.forEach((product, index) => {
      csvContent += `${index + 1},"${product.name}",${product.sold},${product.revenue.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `productos_mas_vendidos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /**
   * Exporta diferencias de stock a CSV
   */
  const exportDifferencesCSV = () => {
    let csvContent = 'Producto,Stock Inicial,Stock Actual,Diferencia,Estado\n';
    productDifferences.forEach(diff => {
      const statusText = diff.status === 'critical' ? 'Crítico' : diff.status === 'attention' ? 'Requiere atención' : 'OK';
      csvContent += `"${diff.name}",${diff.initialStock},${diff.currentStock},${diff.difference},${statusText}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `diferencias_stock_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  /**
   * Renderiza gráfico de barras horizontal para productos
   */
  const renderProductsChart = () => {
    if (topProducts.length === 0) {
      return (
        <div className="text-center py-12">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No hay datos de productos disponibles</p>
        </div>
      );
    }

    const maxSold = Math.max(...topProducts.map(p => p.sold));

    return (
      <div className="space-y-3">
        {topProducts.map((product, index) => {
          const percentage = (product.sold / maxSold) * 100;

          return (
            <div key={product.id} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600 w-6">#{index + 1}</span>
                  <span className="font-medium text-gray-900">{product.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 font-semibold">{product.sold} unidades</span>
                  <span className="text-green-600 font-medium">${product.revenue.toFixed(2)}</span>
                </div>
              </div>
              <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                >
                  <div className="h-full flex items-center justify-end pr-3">
                    {percentage > 15 && (
                      <span className="text-white text-xs font-semibold">
                        {percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h2>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Ingresos Totales</p>
              <p className="text-3xl font-bold mt-2">${totalStats.totalRevenue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Órdenes</p>
              <p className="text-3xl font-bold mt-2">{totalStats.totalOrders}</p>
            </div>
            <BarChart3 className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Unidades Vendidas</p>
              <p className="text-3xl font-bold mt-2">{totalStats.totalUnits}</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Ticket Promedio</p>
              <p className="text-3xl font-bold mt-2">${totalStats.averageOrderValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      {/* Selector de Período */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Ventas por Período</h3>
          </div>
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="day">Por Día (últimos 30 días)</option>
              <option value="week">Por Semana (últimas 12 semanas)</option>
              <option value="month">Por Mes (últimos 12 meses)</option>
              <option value="year">Por Año (últimos 5 años)</option>
            </select>
            <button
              onClick={exportSalesCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={18} />
              Exportar CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unidades Vendidas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Órdenes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.totalSales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      ${row.revenue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.orders}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesData.length === 0 && (
              <p className="text-center py-8 text-gray-500">No hay datos de ventas disponibles en este período</p>
            )}
          </div>
        )}
      </div>

      {/* Productos Más Vendidos */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h3>
          </div>
          <button
            onClick={exportProductsCSV}
            disabled={topProducts.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        ) : (
          renderProductsChart()
        )}
      </div>

      {/* Productos con Mayor Diferencia Negativa */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900">Productos con Diferencia Negativa</h3>
          </div>
          <button
            onClick={exportDifferencesCSV}
            disabled={productDifferences.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        ) : productDifferences.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle size={48} className="mx-auto text-green-400 mb-4" />
            <p className="text-gray-600">No hay productos con diferencia negativa</p>
            <p className="text-sm text-gray-500 mt-2">Todos los productos están con stock ajustado o por encima del inicial</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Inicial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productDifferences.map((diff) => (
                  <tr key={diff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {diff.initialStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {diff.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-red-100 text-red-800">
                        {diff.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        diff.status === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {diff.status === 'critical' ? 'Crítico' : 'Requiere atención'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial de Ajustes (Últimos 30 días) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Historial de Ajustes (Últimos 30 días)</h3>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        ) : recentAdjustments.length === 0 ? (
          <div className="text-center py-12">
            <History size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay ajustes registrados en los últimos 30 días</p>
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
                    Stock Antes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Después
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
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
                {recentAdjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(adjustment.timestamp).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {adjustment.productName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        adjustment.adjustmentType === 'manual' ? 'bg-blue-100 text-blue-800' :
                        adjustment.adjustmentType === 'restock' ? 'bg-green-100 text-green-800' :
                        adjustment.adjustmentType === 'damage' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {adjustment.adjustmentType === 'manual' ? 'Manual' :
                         adjustment.adjustmentType === 'restock' ? 'Reabastecimiento' :
                         adjustment.adjustmentType === 'correction' ? 'Corrección' :
                         adjustment.adjustmentType === 'damage' ? 'Daño' :
                         adjustment.adjustmentType === 'count' ? 'Conteo' :
                         adjustment.adjustmentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {adjustment.quantityBefore}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {adjustment.quantityAfter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        adjustment.difference < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {adjustment.difference > 0 ? `+${adjustment.difference}` : adjustment.difference}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {adjustment.userId || 'system'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {adjustment.note || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
