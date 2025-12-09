/**
 * ARCHIVO ACTUALIZADO: lib/batch-service.ts
 * 
 * MEJORAS IMPLEMENTADAS:
 * 1. ✅ Transacciones atómicas para consistencia de datos
 * 2. ✅ Lógica FIFO robusta
 * 3. ✅ Sincronización automática de stock de producto
 * 4. ✅ Manejo de errores detallado
 * 5. ✅ Validaciones de integridad
 * 6. ✅ NUEVO: Generación automática de código de lote con formato: Prefijo-NumLote-FechaIngreso
 */

import { db } from './db';
import { AppError, ErrorCode } from '../utils/errorHandler';

export interface Batch {
  id?: number;
  productId: number;
  batchCode: string;
  quantity: number;
  expiryDate: string; // YYYY-MM-DD
  createdAt: string;
}

/**
 * Genera un prefijo a partir del nombre del producto
 * Toma las primeras 2 letras de cada palabra (hasta 4 palabras)
 * Ejemplo: "Aceite de Oliva Virgen" -> "AcdeOlVi"
 */
function generateProductPrefix(productName: string): string {
  const words = productName
    .trim()
    .split(/\s+/) // Dividir por espacios
    .filter(w => w.length > 0)
    .slice(0, 4); // Máximo 4 palabras
  
  return words
    .map(word => {
      // Tomar primeras 2 letras, capitalizar primera
      const prefix = word.substring(0, 2);
      return prefix.charAt(0).toUpperCase() + prefix.charAt(1).toLowerCase();
    })
    .join('');
}

/**
 * Genera el número de lote secuencial para un producto
 * Busca el último lote y suma 1
 */
async function getNextBatchNumber(productId: number): Promise<number> {
  const batches = await db.batches
    .where('productId')
    .equals(productId)
    .toArray();
  
  if (batches.length === 0) return 1;
  
  // Extraer números de lote de los códigos existentes
  const batchNumbers = batches
    .map(b => {
      // Formato esperado: Prefijo-Num-Fecha
      const parts = b.batchCode.split('-');
      if (parts.length >= 2) {
        const num = parseInt(parts[1]);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    })
    .filter(n => n > 0);
  
  if (batchNumbers.length === 0) return 1;
  
  return Math.max(...batchNumbers) + 1;
}

/**
 * Genera la fecha en formato DDMMAAAA
 * Ejemplo: 09122025 para 9 de diciembre de 2025
 */
function getFormattedDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Genera un código de lote automáticamente
 * Formato: [PrefijoProd]-[NumLote]-[FechaIngreso]
 * Ejemplo: "AcdeOlVi-1-09122025"
 * 
 * @param productId ID del producto
 * @param productName Nombre del producto
 * @returns Código de lote generado
 */
export async function generateBatchCode(productId: number, productName: string): Promise<string> {
  const prefix = generateProductPrefix(productName);
  const batchNumber = await getNextBatchNumber(productId);
  const dateStr = getFormattedDate();
  
  return `${prefix}-${batchNumber}-${dateStr}`;
}

/**
 * Añade un nuevo lote y actualiza el stock del producto
 * Ejecutado dentro de una transacción
 * Si no se proporciona batchCode, se genera automáticamente
 */
export async function addBatch(batch: Omit<Batch, 'batchCode' | 'createdAt'> & { batchCode?: string }): Promise<number> {
  return db.transaction('rw', [db.products, db.batches], async () => {
    // 1. Validar producto
    const product = await db.products.get(batch.productId);
    if (!product) {
      throw new AppError(`Producto ${batch.productId} no encontrado`, ErrorCode.NOT_FOUND);
    }

    // 2. Generar código de lote si no se proporcionó
    const batchCode = batch.batchCode || await generateBatchCode(batch.productId, product.title);

    // 3. Insertar lote
    const batchId = await db.batches.add({
      productId: batch.productId,
      batchCode,
      quantity: batch.quantity,
      expiryDate: batch.expiryDate,
      createdAt: new Date().toISOString()
    });

    // 4. Actualizar stock total del producto
    const newStock = (product.stock || 0) + batch.quantity;
    await db.products.update(batch.productId, { stock: newStock });

    console.log(`[Batch] Lote añadido: ${batchCode}. Nuevo stock para ${product.title}: ${newStock}`);
    return batchId;
  });
}

/**
 * Consume stock siguiendo lógica FIFO (First-In, First-Out)
 * Prioriza lotes con fecha de expiración más próxima
 */
export async function consumeBatchesFIFO(
  productId: number,
  quantityToConsume: number
): Promise<void> {
  if (quantityToConsume <= 0) return;

  await db.transaction('rw', [db.products, db.batches], async () => {
    // 1. Obtener producto y validar stock global
    const product = await db.products.get(productId);
    if (!product) {
      throw new AppError('Producto no encontrado', ErrorCode.NOT_FOUND);
    }

    if (product.stock < quantityToConsume) {
      throw new AppError(
        `Stock insuficiente. Solicitado: ${quantityToConsume}, Disponible: ${product.stock}`,
        ErrorCode.VALIDATION_ERROR
      );
    }

    // 2. Obtener lotes ordenados por fecha de expiración (ASC)
    const batches = await db.batches
      .where('productId')
      .equals(productId)
      .toArray();

    // Ordenar en memoria por si el índice no es suficiente
    batches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    let remainingToConsume = quantityToConsume;
    const batchesToDelete: number[] = [];
    const batchesToUpdate: { id: number, quantity: number }[] = [];

    // 3. Calcular consumo por lote
    for (const batch of batches) {
      if (remainingToConsume <= 0) break;

      if (batch.quantity <= remainingToConsume) {
        // Consumir lote completo
        remainingToConsume -= batch.quantity;
        if (batch.id) batchesToDelete.push(batch.id);
      } else {
        // Consumir parcial
        const newQuantity = batch.quantity - remainingToConsume;
        if (batch.id) batchesToUpdate.push({ id: batch.id, quantity: newQuantity });
        remainingToConsume = 0;
      }
    }

    // 4. Validar que se pudo cubrir la demanda
    if (remainingToConsume > 0) {
      console.warn(`[Inconsistency] Stock global dice ${product.stock} pero lotes suman menos.`);
      const realStock = product.stock - quantityToConsume + remainingToConsume;
      await db.products.update(productId, { stock: realStock });

      throw new AppError(
        'Inconsistencia de inventario detectada. Por favor intente de nuevo.',
        ErrorCode.INTERNAL_ERROR
      );
    }

    // 5. Aplicar cambios (Atomicidad garantizada por la transacción)

    // Eliminar lotes vacíos
    if (batchesToDelete.length > 0) {
      await db.batches.bulkDelete(batchesToDelete);
    }

    // Actualizar lotes parciales
    for (const update of batchesToUpdate) {
      await db.batches.update(update.id, { quantity: update.quantity });
    }

    // Actualizar stock total del producto
    const newTotalStock = product.stock - quantityToConsume;
    await db.products.update(productId, { stock: newTotalStock });

    console.log(`[FIFO] Consumidos ${quantityToConsume} unidades de ${product.title}. Stock restante: ${newTotalStock}`);
  });
}

/**
 * Obtiene todos los lotes de un producto específico
 */
export async function getBatchesByProduct(productId: number): Promise<Batch[]> {
  await db.ensureInitialized();
  return db.batches
    .where('productId')
    .equals(productId)
    .toArray();
}

/**
 * Actualiza la cantidad de un lote específico
 */
export async function updateBatchQuantity(batchId: number, newQuantity: number): Promise<void> {
  await db.transaction('rw', [db.batches, db.products], async () => {
    const batch = await db.batches.get(batchId);
    if (!batch) {
      throw new AppError(`Lote ${batchId} no encontrado`, ErrorCode.NOT_FOUND);
    }

    const oldQuantity = batch.quantity;
    const difference = newQuantity - oldQuantity;

    // Actualizar cantidad del lote
    await db.batches.update(batchId, { quantity: newQuantity });

    // Actualizar stock del producto
    const product = await db.products.get(batch.productId);
    if (product) {
      const newStock = product.stock + difference;
      await db.products.update(batch.productId, { stock: newStock });
    }
  });
}

/**
 * Obtiene lotes próximos a vencer
 */
export async function getExpiringBatches(daysThreshold: number = 7): Promise<Batch[]> {
  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  // Convertir a string YYYY-MM-DD para comparación lexicográfica
  const thresholdStr = thresholdDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  return db.batches
    .where('expiryDate')
    .between(todayStr, thresholdStr, true, true)
    .toArray();
}

/**
 * Sincroniza el stock total del producto con la suma de sus lotes
 * Útil para tareas de mantenimiento
 */
export async function syncProductStock(productId: number): Promise<void> {
  await db.transaction('rw', [db.products, db.batches], async () => {
    const batches = await db.batches.where('productId').equals(productId).toArray();
    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);

    await db.products.update(productId, { stock: totalQuantity });
    console.log(`[Sync] Stock sincronizado para producto ${productId}: ${totalQuantity}`);
  });
}
