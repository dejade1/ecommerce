/**
 * ARCHIVO ACTUALIZADO: lib/inventory.ts
 * 
 * MEJORAS IMPLEMENTADAS:
 * 1. ✅ Integración con servicio de lotes transaccional
 * 2. ✅ Validación de stock antes de crear orden
 * 3. ✅ Tipos estrictos
 * 4. ✅ Manejo de errores centralizado
 * 5. ✅ NUEVO: Generación automática de códigos de lote con formato correcto
 */

import { db } from './db';
import { consumeBatchesFIFO, generateBatchCode } from './batch-service';
import { AppError, ErrorCode } from '../utils/errorHandler';

// Re-export db for components that need direct access
export { db };

export interface Product {
  id?: number;
  title: string;
  price: number;
  stock: number;
  initialStock?: number;
  unit: string;
  image: string;
  rating: number;
  category: string;
  slot?: number;
  beltDistance?: number;
  sales?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
  productTitle: string;
}

export interface Order {
  id?: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

/**
 * Obtiene todos los productos de la base de datos
 */
export async function getAllProducts(): Promise<Product[]> {
  await db.ensureInitialized();
  return db.products.toArray();
}

/**
 * Actualiza el stock de un producto de forma incremental
 * @param productId ID del producto
 * @param quantity Cantidad a agregar o quitar
 * @param type 'in' para entrada, 'out' para salida
 * @param note Nota opcional del movimiento
 */
export async function updateStock(
  productId: number,
  quantity: number,
  type: 'in' | 'out',
  note?: string
): Promise<void> {
  await db.ensureInitialized();

  const product = await db.products.get(productId);
  if (!product) {
    throw new AppError(`Producto ${productId} no encontrado`, ErrorCode.NOT_FOUND);
  }

  // Calcular nuevo stock
  const newStock = type === 'in'
    ? product.stock + quantity
    : product.stock - quantity;

  if (newStock < 0) {
    throw new AppError(
      `Stock insuficiente. Disponible: ${product.stock}, solicitado: ${quantity}`,
      ErrorCode.VALIDATION_ERROR
    );
  }

  // Actualizar stock del producto
  await db.products.update(productId, {
    stock: newStock,
    updatedAt: new Date()
  });

  // Registrar movimiento de stock
  await db.stockMovements.add({
    productId,
    quantity: type === 'in' ? quantity : -quantity,
    type,
    note,
    createdAt: new Date()
  });

  console.log(`[Stock] ${type === 'in' ? 'Entrada' : 'Salida'} - Producto ${productId}: ${quantity} unidades. Stock nuevo: ${newStock}`);
}

/**
 * Crea una nueva orden y actualiza el inventario
 * @param items Items del carrito
 */
export async function createOrder(items: OrderItem[]): Promise<number> {
  if (!items || items.length === 0) {
    throw new AppError('La orden no puede estar vacía', ErrorCode.VALIDATION_ERROR);
  }

  return db.transaction('rw', [db.products, db.batches, db.orders, db.orderItems], async () => {

    // 1. Validar stock de TODOS los productos antes de tocar nada
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (!product) {
        throw new AppError(`Producto ${item.productId} no encontrado`, ErrorCode.NOT_FOUND);
      }
      if (product.stock < item.quantity) {
        throw new AppError(
          `Stock insuficiente para "${product.title}". Disponible: ${product.stock}`,
          ErrorCode.VALIDATION_ERROR
        );
      }
    }

    // 2. Crear la orden
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = await db.orders.add({
      total,
      status: 'completed',
      createdAt: new Date(),
      items: items
    });

    // 3. Procesar cada item (consumir lotes y actualizar ventas)
    for (const item of items) {
      // Registrar item de orden
      await db.orderItems.add({
        orderId,
        ...item
      });

      // Consumir inventario FIFO
      await consumeBatchesFIFO(item.productId, item.quantity);

      // Incrementar contador de ventas del producto
      const product = await db.products.get(item.productId);
      if (product) {
        const currentSales = product.sales || 0;
        await db.products.update(item.productId, {
          sales: currentSales + item.quantity,
          updatedAt: new Date()
        });
      }
    }

    console.log(`[Order] Orden #${orderId} creada exitosamente`);
    return orderId;
  });
}

/**
 * Inicializa la base de datos con datos de prueba si está vacía
 */
export async function initializeDB(): Promise<void> {
  const count = await db.products.count();
  if (count > 0) return;

  console.log('Inicializando base de datos...');

  const initialProducts: Product[] = [
    {
      title: "Arroz Premium Extra Largo",
      price: 2.99,
      stock: 50,
      unit: "kg",
      image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80",
      rating: 4.8,
      category: "Granos",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: "Aceite de Oliva Virgen Extra",
      price: 8.50,
      stock: 30,
      unit: "botella",
      image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
      rating: 4.9,
      category: "Aceites",
      createdAt: new Date(),
      updatedAt: new Date()
    },
  ];

  await db.transaction('rw', [db.products, db.batches], async () => {
    for (const p of initialProducts) {
      const id = await db.products.add(p);

      // Crear lote inicial con código automático
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 6);

      const batchCode = await generateBatchCode(id, p.title);

      await db.batches.add({
        productId: id,
        batchCode,
        quantity: p.stock,
        expiryDate: expiry.toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      console.log(`[Init] Producto "${p.title}" creado con lote ${batchCode}`);
    }
  });
}