/**
 * Servicio de Ajustes de Stock
 *
 * Maneja el registro y consulta de ajustes manuales de inventario
 * con historial completo de cambios.
 */

import { db } from './db';
import { AppError, ErrorCode } from '../utils/errorHandler';
import type { StockAdjustment } from './db';

/**
 * Registra un ajuste manual de stock
 * @param productId ID del producto
 * @param newQuantity Nueva cantidad de stock
 * @param note Nota del ajuste (opcional)
 * @param adjustmentType Tipo de ajuste (default: 'manual')
 * @returns ID del ajuste registrado
 */
export async function registerStockAdjustment(
  productId: number,
  newQuantity: number,
  note?: string,
  adjustmentType: StockAdjustment['adjustmentType'] = 'manual'
): Promise<number> {
  // Validar que la nueva cantidad no sea negativa
  if (newQuantity < 0) {
    throw new AppError(
      'La cantidad de stock no puede ser negativa',
      ErrorCode.VALIDATION_ERROR
    );
  }

  return db.transaction('rw', [db.products, db.stockAdjustments], async () => {
    const product = await db.products.get(productId);

    if (!product) {
      throw new AppError(
        `Producto ${productId} no encontrado`,
        ErrorCode.NOT_FOUND
      );
    }

    const quantityBefore = product.stock;
    const difference = newQuantity - quantityBefore;

    // Si no hay cambio, no registrar ajuste
    if (difference === 0) {
      console.log(`[Adjustment] No hay cambios en el stock del producto ${productId}`);
      return 0;
    }

    // Obtener usuario actual (si está disponible en localStorage)
    const currentUser = localStorage.getItem('currentUser') || 'system';

    // Crear registro de ajuste
    const adjustmentId = await db.stockAdjustments.add({
      productId,
      adjustmentType,
      quantityBefore,
      quantityAfter: newQuantity,
      difference,
      note,
      userId: currentUser,
      timestamp: new Date()
    });

    // Actualizar stock del producto
    await db.products.update(productId, {
      stock: newQuantity,
      updatedAt: new Date()
    });

    console.log(
      `[Adjustment] Producto ${productId} "${product.title}": ${quantityBefore} → ${newQuantity} (${difference > 0 ? '+' : ''}${difference})`
    );

    return adjustmentId;
  });
}

/**
 * Obtiene historial de ajustes de un producto específico
 * @param productId ID del producto
 * @returns Array de ajustes ordenados por fecha descendente
 */
export async function getAdjustmentHistory(productId: number): Promise<StockAdjustment[]> {
  return db.stockAdjustments
    .where('productId')
    .equals(productId)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Obtiene todos los ajustes recientes
 * @param days Número de días hacia atrás (default: 30)
 * @returns Array de ajustes recientes ordenados por fecha descendente
 */
export async function getRecentAdjustments(days: number = 30): Promise<StockAdjustment[]> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  return db.stockAdjustments
    .where('timestamp')
    .above(threshold)
    .reverse()
    .sortBy('timestamp');
}

/**
 * Obtiene estadísticas de ajustes por producto
 * @param productId ID del producto
 * @returns Estadísticas de ajustes
 */
export async function getAdjustmentStats(productId: number) {
  const adjustments = await getAdjustmentHistory(productId);

  const totalAdjustments = adjustments.length;
  const totalIncrease = adjustments
    .filter(adj => adj.difference > 0)
    .reduce((sum, adj) => sum + adj.difference, 0);
  const totalDecrease = adjustments
    .filter(adj => adj.difference < 0)
    .reduce((sum, adj) => sum + Math.abs(adj.difference), 0);

  return {
    totalAdjustments,
    totalIncrease,
    totalDecrease,
    netChange: totalIncrease - totalDecrease,
    lastAdjustment: adjustments[0] || null
  };
}

/**
 * Elimina ajustes antiguos (utilidad de mantenimiento)
 * @param days Mantener solo ajustes de los últimos X días
 * @returns Cantidad de registros eliminados
 */
export async function cleanOldAdjustments(days: number = 365): Promise<number> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const oldAdjustments = await db.stockAdjustments
    .where('timestamp')
    .below(threshold)
    .count();

  await db.stockAdjustments
    .where('timestamp')
    .below(threshold)
    .delete();

  console.log(`[Cleanup] Eliminados ${oldAdjustments} ajustes antiguos (más de ${days} días)`);

  return oldAdjustments;
}
