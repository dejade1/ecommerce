// CÓDIGO CORREGIDO - Consultas SQL Seguras
// Archivo: server/services/databaseQueries.ts

import { PrismaClient, Prisma } from '@prisma/client';

const db = new PrismaClient();

// ====================================================================
// BÚSQUEDA DE PRODUCTOS (SIN INYECCIÓN SQL)
// ====================================================================

interface ProductSearchFilters {
  searchTerm?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  sortBy?: 'name' | 'price' | 'createdAt' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * ✅ CORRECTO - Búsqueda de productos usando Prisma ORM
 * Todas las queries son parametrizadas automáticamente
 */
export async function searchProducts(filters: ProductSearchFilters) {
  const {
    searchTerm,
    categoryId,
    minPrice,
    maxPrice,
    inStock = true,
    tags = [],
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20
  } = filters;
  
  // Construir filtros de manera segura
  const whereClause: Prisma.ProductWhereInput = {
    AND: [
      // Búsqueda de texto
      searchTerm ? {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { sku: { contains: searchTerm, mode: 'insensitive' } }
        ]
      } : {},
      
      // Filtro por categoría
      categoryId ? { categoryId } : {},
      
      // Filtro por precio
      minPrice ? { price: { gte: minPrice } } : {},
      maxPrice ? { price: { lte: maxPrice } } : {},
      
      // Filtro por stock
      inStock ? { stock: { gt: 0 } } : {},
      
      // Filtro por tags
      tags.length > 0 ? {
        tags: {
          hasSome: tags
        }
      } : {},
      
      // Solo productos activos
      { isActive: true }
    ]
  };
  
  // Ordenamiento seguro
  const orderBy: Prisma.ProductOrderByWithRelationInput = 
    sortBy === 'popularity'
      ? { orderItems: { _count: sortOrder } }
      : { [sortBy]: sortOrder };
  
  // Paginación
  const skip = (page - 1) * limit;
  
  // Ejecutar consulta con includes optimizados
  const [products, totalCount] = await Promise.all([
    db.product.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        batches: {
          where: {
            quantity: { gt: 0 },
            expiryDate: { gt: new Date() }
          },
          orderBy: {
            expiryDate: 'asc'
          },
          take: 3
        },
        _count: {
          select: {
            orderItems: true,
            reviews: true
          }
        }
      }
    }),
    
    db.product.count({ where: whereClause })
  ]);
  
  return {
    products,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    }
  };
}

/**
 * ✅ CORRECTO - Si necesitas SQL raw, usa template strings (tagged templates)
 * Prisma escapa automáticamente los parámetros
 */
export async function searchProductsRaw(searchTerm: string) {
  // ✅ Los valores dentro de ${} son escapados automáticamente
  return await db.$queryRaw<any[]>`
    SELECT 
      p.*,
      c.name as category_name,
      COUNT(DISTINCT oi.id) as order_count
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    WHERE p.name ILIKE ${`%${searchTerm}%`}
       OR p.description ILIKE ${`%${searchTerm}%`}
    GROUP BY p.id, c.name
    ORDER BY order_count DESC
    LIMIT 20
  `;
}

// ====================================================================
// GESTIÓN DE INVENTARIO FIFO (SIN INYECCIÓN SQL)
// ====================================================================

/**
 * ✅ CORRECTO - Asignación FIFO de lotes
 */
export async function allocateBatchesForOrder(
  orderId: number,
  items: Array<{ productId: number; quantity: number }>
) {
  return await db.$transaction(async (tx) => {
    const allocations: Array<{
      batchId: number;
      productId: number;
      quantity: number;
      orderItemId: number;
    }> = [];
    
    for (const item of items) {
      // Obtener lotes disponibles ordenados por FIFO
      const batches = await tx.batch.findMany({
        where: {
          productId: item.productId,
          quantity: { gt: 0 },
          expiryDate: { gt: new Date() }
        },
        orderBy: {
          expiryDate: 'asc' // FIFO: primero los que vencen antes
        }
      });
      
      let remainingQty = item.quantity;
      
      for (const batch of batches) {
        if (remainingQty <= 0) break;
        
        const allocatedQty = Math.min(batch.quantity, remainingQty);
        
        // Actualizar cantidad del lote
        await tx.batch.update({
          where: { id: batch.id },
          data: {
            quantity: {
              decrement: allocatedQty
            }
          }
        });
        
        // Registrar asignación
        allocations.push({
          batchId: batch.id,
          productId: item.productId,
          quantity: allocatedQty,
          orderItemId: 0 // Se actualizará después
        });
        
        remainingQty -= allocatedQty;
      }
      
      // Verificar que se pudo asignar toda la cantidad
      if (remainingQty > 0) {
        throw new Error(
          `Stock insuficiente para producto ID ${item.productId}. ` +
          `Faltan ${remainingQty} unidades.`
        );
      }
      
      // Actualizar stock total del producto
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }
    
    return allocations;
  });
}

/**
 * ✅ CORRECTO - Obtener lotes próximos a vencer
 */
export async function getBatchesExpiringSoon(daysAhead: number = 5) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  
  return await db.batch.findMany({
    where: {
      quantity: { gt: 0 },
      expiryDate: {
        gte: new Date(),
        lte: futureDate
      }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          categoryId: true
        }
      }
    },
    orderBy: {
      expiryDate: 'asc'
    }
  });
}

// ====================================================================
// REPORTES Y ESTADÍSTICAS (SIN INYECCIÓN SQL)
// ====================================================================

interface ReportDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * ✅ CORRECTO - Reporte de ventas por período
 */
export async function getSalesReport(dateRange: ReportDateRange) {
  const { startDate, endDate } = dateRange;
  
  // Ventas totales
  const salesSummary = await db.order.aggregate({
    _sum: {
      total: true
    },
    _count: {
      id: true
    },
    _avg: {
      total: true
    },
    where: {
      status: 'COMPLETED',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });
  
  // Ventas por día
  const dailySales = await db.$queryRaw<any[]>`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as order_count,
      SUM(total) as total_sales,
      AVG(total) as avg_order_value
    FROM orders
    WHERE status = 'COMPLETED'
      AND created_at >= ${startDate}
      AND created_at <= ${endDate}
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
  
  // Productos más vendidos
  const topProducts = await db.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    },
    _sum: {
      quantity: true,
      price: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        quantity: 'desc'
      }
    },
    take: 10
  });
  
  // Enriquecer con información del producto
  const topProductsWithDetails = await Promise.all(
    topProducts.map(async (item) => {
      const product = await db.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          sku: true,
          imageUrl: true
        }
      });
      
      return {
        product,
        totalQuantity: item._sum.quantity || 0,
        totalRevenue: item._sum.price || 0,
        orderCount: item._count.id
      };
    })
  );
  
  return {
    summary: {
      totalSales: salesSummary._sum.total || 0,
      orderCount: salesSummary._count.id,
      avgOrderValue: salesSummary._avg.total || 0
    },
    dailySales,
    topProducts: topProductsWithDetails
  };
}

/**
 * ✅ CORRECTO - Reporte de inventario
 */
export async function getInventoryReport() {
  // Productos con bajo stock
  const lowStockProducts = await db.product.findMany({
    where: {
      stock: {
        lte: 10,
        gt: 0
      },
      isActive: true
    },
    include: {
      category: {
        select: {
          id: true,
          name: true
        }
      },
      batches: {
        where: {
          quantity: { gt: 0 }
        },
        orderBy: {
          expiryDate: 'asc'
        }
      }
    },
    orderBy: {
      stock: 'asc'
    }
  });
  
  // Productos sin stock
  const outOfStockProducts = await db.product.count({
    where: {
      stock: 0,
      isActive: true
    }
  });
  
  // Valor total del inventario
  const inventoryValue = await db.$queryRaw<any[]>`
    SELECT 
      SUM(p.price * p.stock) as total_value,
      COUNT(*) as product_count,
      SUM(p.stock) as total_units
    FROM products p
    WHERE p.is_active = true
  `;
  
  // Lotes próximos a vencer
  const expiringBatches = await getBatchesExpiringSoon(7);
  
  return {
    lowStockProducts,
    outOfStockCount: outOfStockProducts,
    inventoryValue: inventoryValue[0],
    expiringBatches
  };
}

// ====================================================================
// ACTUALIZACIÓN MASIVA SEGURA
// ====================================================================

/**
 * ✅ CORRECTO - Actualización de precios en masa
 */
export async function updatePricesByCategory(
  categoryId: number,
  percentageChange: number
) {
  // Validar porcentaje
  if (Math.abs(percentageChange) > 50) {
    throw new Error('El cambio de precio no puede ser mayor a 50%');
  }
  
  return await db.$transaction(async (tx) => {
    // Obtener productos de la categoría
    const products = await tx.product.findMany({
      where: {
        categoryId,
        isActive: true
      },
      select: {
        id: true,
        price: true
      }
    });
    
    // Actualizar cada producto
    const updates = products.map(product => {
      const newPrice = product.price * (1 + percentageChange / 100);
      
      return tx.product.update({
        where: { id: product.id },
        data: {
          price: newPrice,
          priceHistory: {
            create: {
              oldPrice: product.price,
              newPrice,
              reason: `Ajuste de categoría: ${percentageChange}%`,
              changedAt: new Date()
            }
          }
        }
      });
    });
    
    await Promise.all(updates);
    
    // Log de auditoría
    await tx.auditLog.create({
      data: {
        action: 'BULK_PRICE_UPDATE',
        details: {
          categoryId,
          percentageChange,
          productsAffected: products.length
        }
      }
    });
    
    return {
      productsUpdated: products.length,
      percentageChange
    };
  });
}

/**
 * ✅ CORRECTO - Importación masiva de productos desde CSV
 */
export async function importProductsFromCSV(
  products: Array<{
    sku: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    categoryId: number;
  }>
) {
  return await db.$transaction(async (tx) => {
    const results = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ sku: string; error: string }>
    };
    
    for (const product of products) {
      try {
        // Verificar si existe por SKU
        const existing = await tx.product.findUnique({
          where: { sku: product.sku },
          select: { id: true }
        });
        
        if (existing) {
          // Actualizar
          await tx.product.update({
            where: { id: existing.id },
            data: {
              name: product.name,
              description: product.description,
              price: product.price,
              stock: product.stock,
              categoryId: product.categoryId
            }
          });
          results.updated++;
        } else {
          // Crear
          await tx.product.create({
            data: product
          });
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          sku: product.sku,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    // Log de auditoría
    await tx.auditLog.create({
      data: {
        action: 'PRODUCT_IMPORT',
        details: {
          totalProcessed: products.length,
          created: results.created,
          updated: results.updated,
          errors: results.errors.length
        }
      }
    });
    
    return results;
  });
}

// ====================================================================
// BÚSQUEDAS COMPLEJAS CON AGREGACIONES
// ====================================================================

/**
 * ✅ CORRECTO - Dashboard con múltiples métricas
 */
export async function getDashboardMetrics(dateRange?: ReportDateRange) {
  const whereClause = dateRange ? {
    createdAt: {
      gte: dateRange.startDate,
      lte: dateRange.endDate
    }
  } : {};
  
  // Ejecutar todas las consultas en paralelo
  const [
    ordersStats,
    revenueStats,
    productsStats,
    customersStats,
    recentOrders,
    lowStockProducts,
    expiringBatches
  ] = await Promise.all([
    // Estadísticas de órdenes
    db.order.groupBy({
      by: ['status'],
      where: whereClause,
      _count: {
        id: true
      }
    }),
    
    // Estadísticas de ingresos
    db.order.aggregate({
      _sum: { total: true },
      _avg: { total: true },
      _count: { id: true },
      where: {
        ...whereClause,
        status: 'COMPLETED'
      }
    }),
    
    // Estadísticas de productos
    db.product.aggregate({
      _count: { id: true },
      _sum: { stock: true },
      where: { isActive: true }
    }),
    
    // Estadísticas de clientes
    db.user.aggregate({
      _count: { id: true },
      where: {
        role: 'CUSTOMER',
        isActive: true
      }
    }),
    
    // Órdenes recientes
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            items: true
          }
        }
      }
    }),
    
    // Productos con bajo stock
    db.product.count({
      where: {
        stock: { lte: 10, gt: 0 },
        isActive: true
      }
    }),
    
    // Lotes por vencer
    getBatchesExpiringSoon(7)
  ]);
  
  return {
    orders: {
      byStatus: ordersStats,
      total: ordersStats.reduce((sum, s) => sum + s._count.id, 0)
    },
    revenue: {
      total: revenueStats._sum.total || 0,
      average: revenueStats._avg.total || 0,
      completedOrders: revenueStats._count.id
    },
    products: {
      total: productsStats._count.id,
      totalStock: productsStats._sum.stock || 0,
      lowStock: lowStockProducts
    },
    customers: {
      total: customersStats._count.id
    },
    recentOrders,
    alerts: {
      lowStockCount: lowStockProducts,
      expiringBatchesCount: expiringBatches.length,
      expiringBatches: expiringBatches.slice(0, 5)
    }
  };
}

// ====================================================================
// BÚSQUEDA FULL-TEXT (PostgreSQL)
// ====================================================================

/**
 * ✅ CORRECTO - Búsqueda full-text con ranking
 * (Requiere configurar índices full-text en PostgreSQL)
 */
export async function fullTextSearch(searchTerm: string, limit: number = 20) {
  // Usar búsqueda full-text de PostgreSQL
  return await db.$queryRaw<any[]>`
    SELECT 
      p.*,
      ts_rank(
        to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, '')),
        plainto_tsquery('spanish', ${searchTerm})
      ) as rank
    FROM products p
    WHERE to_tsvector('spanish', p.name || ' ' || COALESCE(p.description, ''))
      @@ plainto_tsquery('spanish', ${searchTerm})
      AND p.is_active = true
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
}

// ====================================================================
// PREVENCIÓN DE RACE CONDITIONS
// ====================================================================

/**
 * ✅ CORRECTO - Actualización atómica con lock
 */
export async function decrementStockAtomically(
  productId: number,
  quantity: number
) {
  return await db.$transaction(async (tx) => {
    // Obtener producto con lock
    const product = await tx.$queryRaw<any[]>`
      SELECT * FROM products
      WHERE id = ${productId}
      FOR UPDATE
    `;
    
    if (!product[0]) {
      throw new Error('Producto no encontrado');
    }
    
    if (product[0].stock < quantity) {
      throw new Error('Stock insuficiente');
    }
    
    // Actualizar stock
    await tx.product.update({
      where: { id: productId },
      data: {
        stock: {
          decrement: quantity
        }
      }
    });
    
    return product[0];
  });
}

// ====================================================================
// EXPORTACIONES
// ====================================================================

export default {
  searchProducts,
  searchProductsRaw,
  allocateBatchesForOrder,
  getBatchesExpiringSoon,
  getSalesReport,
  getInventoryReport,
  updatePricesByCategory,
  importProductsFromCSV,
  getDashboardMetrics,
  fullTextSearch,
  decrementStockAtomically
};
