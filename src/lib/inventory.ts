import { db } from './db';
import type { DBSchema } from './db';

export type Product = DBSchema['products'];
export type Order = DBSchema['orders'];
export type OrderItem = DBSchema['orderItems'];
export type StockMovement = DBSchema['stockMovements'];

export async function updateStock(
  productId: number,
  quantity: number,
  type: 'in' | 'out',
  note?: string
): Promise<number> {
  const product = await db.get('products', productId);
  if (!product) {
    throw new Error('Producto no encontrado');
  }

  const newStock = type === 'in' ? product.stock + quantity : product.stock - quantity;
  if (newStock < 0) {
    throw new Error('Stock insuficiente');
  }

  await db.put('products', {
    ...product,
    stock: newStock,
    updatedAt: new Date()
  });

  await db.add('stockMovements', {
    productId,
    quantity,
    type,
    note,
    createdAt: new Date()
  });

  return newStock;
}

export async function createOrder(
  items: { productId: number; quantity: number; price: number }[]
): Promise<number> {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  for (const item of items) {
    const product = await db.get('products', item.productId);
    if (!product || product.stock < item.quantity) {
      throw new Error(`Stock insuficiente para el producto ${product?.title}`);
    }
  }

  const orderId = await db.add('orders', {
    total,
    status: 'pending',
    createdAt: new Date()
  });

  for (const item of items) {
    await db.add('orderItems', {
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price
    });

    await updateStock(item.productId, item.quantity, 'out', `Orden #${orderId}`);
  }

  return orderId;
}

export async function getAllProducts(): Promise<Product[]> {
  return db.getAll('products');
}

export async function getProductById(id: number): Promise<Product | undefined> {
  return db.get('products', id);
}

export async function initializeDB(): Promise<void> {
  await db.init();
  
  const products = await getAllProducts();
  if (products.length === 0) {
    const initialProducts = [
      {
        title: "Arroz Premium Extra Largo - 1kg",
        price: 2.99,
        stock: 100,
        unit: "kg",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.8,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Fideos Espagueti - 500g",
        price: 1.99,
        stock: 150,
        unit: "paquete",
        image: "https://images.unsplash.com/photo-1612969308146-066d55f37927?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Aceite de Oliva Extra Virgen - 750ml",
        price: 8.99,
        stock: 75,
        unit: "botella",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.9,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Leche Entera - 1L",
        price: 1.49,
        stock: 200,
        unit: "litro",
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.6,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Pan Integral - 700g",
        price: 2.49,
        stock: 50,
        unit: "paquete",
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.7,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: "Huevos Orgánicos - 12 unidades",
        price: 4.99,
        stock: 80,
        unit: "docena",
        image: "https://images.unsplash.com/photo-1518569656558-1f25e69d93d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80",
        rating: 4.8,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const product of initialProducts) {
      await db.add('products', product);
    }
  }
}

export { db };