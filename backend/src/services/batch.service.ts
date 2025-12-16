/**
 * SERVICIO DE LOTES (BATCHES)
 * 
 * Sistema completo de gestión de lotes con:
 * - Nomenclatura automática (ArrPreBl-1-15122025)
 * - FIFO (First In First Out) automático
 * - Alertas de vencimiento
 * - Integración con ajustes de stock
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genera código de lote automático
 * Formato: ArrPreBl-1-15122025
 * - Primeras 2 letras de las primeras 3 palabras del título
 * - Número secuencial del lote para ese producto
 * - Fecha DDMMYYYY
 * 
 * Ejemplo:
 * - "Arroz Premium Blanco" -> ArrPreBl-1-15122025
 * - "Aceite de Oliva" -> AcDeOl-1-15122025
 * - "Azúcar" -> Az-1-15122025 (solo 1 palabra)
 */
export async function generateBatchCode(productId: number): Promise<string> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { title: true }
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  // Generar prefijo del nombre (primeras 2 letras de hasta 3 palabras)
  const words = product.title
    .trim()
    .split(/\s+/) // Dividir por espacios múltiples
    .filter(word => word.length > 0);
  
  const prefix = words
    .slice(0, 3) // Máximo 3 palabras
    .map(word => {
      // Capitalizar primera letra, resto minúscula
      const cleaned = word.replace(/[^a-zA-Z]/g, ''); // Quitar caracteres especiales
      if (cleaned.length === 0) return '';
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1, 2).toLowerCase();
    })
    .filter(part => part.length > 0)
    .join('');

  // Si no hay prefijo válido, usar 'PROD'
  const finalPrefix = prefix.length > 0 ? prefix : 'PROD';

  // Obtener número secuencial (contar lotes existentes + 1)
  const existingBatches = await prisma.batch.count({
    where: { productId }
  });
  const sequence = existingBatches + 1;

  // Fecha actual DDMMYYYY
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const dateStr = `${day}${month}${year}`;

  return `${finalPrefix}-${sequence}-${dateStr}`;
}

/**
 * Crear lote automáticamente con registro en ajustes de stock
 */
export async function createBatch(
  productId: number,
  quantity: number,
  expiryDate: Date,
  userId?: string
) {
  // Validaciones
  if (quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  if (expiryDate <= new Date()) {
    throw new Error('La fecha de vencimiento debe ser futura');
  }

  // Verificar que el producto existe
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true, stock: true }
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  // Generar código de lote
  const batchCode = await generateBatchCode(productId);

  // Usar transacción para asegurar consistencia
  const result = await prisma.$transaction(async (tx) => {
    // 1. Crear lote
    const batch = await tx.batch.create({
      data: {
        productId,
        batchCode,
        quantity,
        expiryDate
      }
    });

    // 2. Actualizar stock del producto
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: {
        stock: { increment: quantity }
      },
      select: { stock: true }
    });

    // 3. Registrar ajuste de stock
    await tx.stockAdjustment.create({
      data: {
        productId,
        adjustmentType: 'batch',
        quantityBefore: product.stock,
        quantityAfter: updatedProduct.stock,
        difference: quantity,
        note: `Lote creado: ${batchCode} | Vencimiento: ${expiryDate.toISOString().split('T')[0]}`,
        userId: userId || 'sistema'
      }
    });

    return batch;
  });

  console.log(`[LOTE] Creado: ${batchCode} | Producto: ${product.title} | Cantidad: ${quantity}`);

  return result;
}

/**
 * Consumir lotes usando FIFO (First In First Out)
 * 
 * Lógica:
 * 1. Ordena lotes por fecha de vencimiento (más próximo primero)
 * 2. Si hay empate en fecha, ordena por fecha de creación (más antiguo primero)
 * 3. Consume de cada lote hasta agotar la cantidad solicitada
 * 4. Lanza error si no hay suficiente stock en lotes
 */
export async function consumeBatchesFIFO(
  productId: number,
  quantity: number
): Promise<Array<{ batchId: number; batchCode: string; consumed: number }>> {
  if (quantity <= 0) {
    throw new Error('La cantidad a consumir debe ser mayor a 0');
  }

  let remaining = quantity;
  const consumedBatches: Array<{ batchId: number; batchCode: string; consumed: number }> = [];

  // Obtener lotes ordenados por FIFO
  const batches = await prisma.batch.findMany({
    where: {
      productId,
      quantity: { gt: 0 } // Solo lotes con stock disponible
    },
    orderBy: [
      { expiryDate: 'asc' },  // Primero los que vencen antes
      { createdAt: 'asc' }    // Si hay empate, primero los más antiguos
    ]
  });

  if (batches.length === 0) {
    throw new Error('No hay lotes disponibles para este producto');
  }

  // Consumir de cada lote
  for (const batch of batches) {
    if (remaining <= 0) break;

    const toConsume = Math.min(batch.quantity, remaining);
    
    // Actualizar cantidad del lote
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        quantity: { decrement: toConsume }
      }
    });

    consumedBatches.push({
      batchId: batch.id,
      batchCode: batch.batchCode,
      consumed: toConsume
    });

    remaining -= toConsume;
  }

  // Verificar si se pudo consumir toda la cantidad
  if (remaining > 0) {
    throw new Error(
      `Stock insuficiente en lotes. Disponible: ${quantity - remaining}, Solicitado: ${quantity}`
    );
  }

  console.log(`[FIFO] Producto ID ${productId}: Consumidos ${quantity} unidades de ${consumedBatches.length} lote(s)`);

  return consumedBatches;
}

/**
 * Obtener lotes próximos a vencer (sistema de alertas)
 */
export async function getExpiringBatches(daysThreshold: number = 7) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);

  const batches = await prisma.batch.findMany({
    where: {
      expiryDate: { lte: threshold },
      quantity: { gt: 0 } // Solo lotes con stock
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          category: true
        }
      }
    },
    orderBy: { expiryDate: 'asc' }
  });

  return batches;
}

/**
 * Obtener todos los lotes de un producto
 */
export async function getProductBatches(productId: number) {
  const batches = await prisma.batch.findMany({
    where: { productId },
    orderBy: [
      { expiryDate: 'asc' },
      { createdAt: 'asc' }
    ]
  });

  return batches;
}

/**
 * Obtener resumen de stock por lotes
 */
export async function getBatchStockSummary(productId: number) {
  const batches = await prisma.batch.findMany({
    where: {
      productId,
      quantity: { gt: 0 }
    },
    orderBy: { expiryDate: 'asc' }
  });

  const totalInBatches = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stock: true, title: true }
  });

  return {
    productId,
    productTitle: product?.title || 'Desconocido',
    stockTotal: product?.stock || 0,
    stockInBatches: totalInBatches,
    stockOutsideBatches: (product?.stock || 0) - totalInBatches,
    batches: batches.map(b => ({
      id: b.id,
      code: b.batchCode,
      quantity: b.quantity,
      expiryDate: b.expiryDate,
      daysUntilExpiry: Math.ceil((b.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))
  };
}

/**
 * Eliminar lote (solo si quantity = 0)
 */
export async function deleteBatch(batchId: number, userId?: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { product: true }
  });

  if (!batch) {
    throw new Error('Lote no encontrado');
  }

  if (batch.quantity > 0) {
    throw new Error('No se puede eliminar un lote con stock. Primero debe consumirse completamente.');
  }

  await prisma.batch.delete({
    where: { id: batchId }
  });

  console.log(`[LOTE] Eliminado: ${batch.batchCode} por ${userId || 'sistema'}`);
}

export default {
  generateBatchCode,
  createBatch,
  consumeBatchesFIFO,
  getExpiringBatches,
  getProductBatches,
  getBatchStockSummary,
  deleteBatch
};
