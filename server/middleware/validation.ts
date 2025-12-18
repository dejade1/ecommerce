// CÓDIGO CORREGIDO - Validación y Sanitización de Entradas
// Archivo: server/middleware/validation.ts

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

// ====================================================================
// ESQUEMAS DE VALIDACIÓN
// ====================================================================

// Esquema para productos
export const ProductSchema = z.object({
  name: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre es demasiado largo')
    .regex(/^[a-zA-Z0-9\s\-áéíóúñÑüÜ.,()]+$/, 'El nombre contiene caracteres inválidos'),
  
  description: z.string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(5000, 'La descripción es demasiado larga'),
  
  price: z.number()
    .positive('El precio debe ser positivo')
    .max(1000000, 'Precio excesivo')
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales'),
  
  sku: z.string()
    .min(3, 'SKU muy corto')
    .max(50, 'SKU muy largo')
    .regex(/^[A-Z0-9\-]+$/, 'SKU solo puede contener letras mayúsculas, números y guiones'),
  
  stock: z.number()
    .int('El stock debe ser un número entero')
    .min(0, 'El stock no puede ser negativo')
    .max(1000000, 'Stock excesivo'),
  
  categoryId: z.number()
    .int('ID de categoría inválido')
    .positive('ID de categoría debe ser positivo'),
  
  imageUrl: z.string()
    .url('URL de imagen inválida')
    .regex(/\.(jpg|jpeg|png|gif|webp)$/i, 'Formato de imagen no permitido')
    .optional(),
  
  weight: z.number()
    .positive('El peso debe ser positivo')
    .max(10000, 'Peso excesivo')
    .optional(),
  
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
  }).optional(),
  
  tags: z.array(z.string().max(50))
    .max(10, 'Máximo 10 tags permitidos')
    .optional()
});

// Esquema para lotes (batches)
export const BatchSchema = z.object({
  batchNumber: z.string()
    .min(3, 'Número de lote muy corto')
    .max(50, 'Número de lote muy largo')
    .regex(/^[A-Z0-9\-]+$/, 'Formato de lote inválido'),
  
  productId: z.number()
    .int('ID de producto inválido')
    .positive('ID de producto debe ser positivo'),
  
  quantity: z.number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser positiva')
    .max(100000, 'Cantidad excesiva'),
  
  expiryDate: z.string()
    .datetime('Fecha inválida')
    .refine(
      (date) => new Date(date) > new Date(),
      'La fecha de vencimiento debe ser futura'
    ),
  
  manufacturingDate: z.string()
    .datetime('Fecha inválida')
    .optional(),
  
  supplier: z.string()
    .max(200, 'Nombre de proveedor muy largo')
    .optional(),
  
  notes: z.string()
    .max(1000, 'Notas muy largas')
    .optional()
});

// Esquema para órdenes
export const OrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().positive().max(1000),
      price: z.number().positive()
    })
  ).min(1, 'La orden debe tener al menos un item'),
  
  shippingAddress: z.object({
    street: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Código postal inválido'),
    country: z.string().length(2, 'Código de país debe ser ISO 3166-1 alpha-2')
  }),
  
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'stripe']),
  
  notes: z.string().max(500).optional()
});

// Esquema para usuarios
export const UserRegistrationSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .max(255, 'Email muy largo')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(100, 'Contraseña muy larga')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un símbolo especial'),
  
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre muy largo')
    .regex(/^[a-zA-ZáéíóúñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),
  
  phone: z.string()
    .regex(/^\+?[\d\s\-()]+$/, 'Número de teléfono inválido')
    .min(10, 'Teléfono muy corto')
    .max(20, 'Teléfono muy largo')
    .optional()
});

// Esquema para login
export const LoginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'Contraseña requerida')
});

// Esquema para búsqueda
export const SearchQuerySchema = z.object({
  q: z.string()
    .max(100, 'Búsqueda muy larga')
    .optional(),
  
  category: z.string()
    .uuid('ID de categoría inválido')
    .optional(),
  
  minPrice: z.number()
    .min(0, 'Precio mínimo inválido')
    .optional(),
  
  maxPrice: z.number()
    .max(1000000, 'Precio máximo inválido')
    .optional(),
  
  page: z.number()
    .int('Página debe ser un número entero')
    .min(1, 'Página debe ser mayor a 0')
    .default(1),
  
  limit: z.number()
    .int('Límite debe ser un número entero')
    .min(1, 'Límite debe ser mayor a 0')
    .max(100, 'Límite máximo: 100')
    .default(20),
  
  sortBy: z.enum(['name', 'price', 'createdAt', 'popularity'])
    .default('createdAt'),
  
  sortOrder: z.enum(['asc', 'desc'])
    .default('desc')
});

// ====================================================================
// MIDDLEWARE DE VALIDACIÓN
// ====================================================================

/**
 * Middleware genérico para validar el body de la request
 */
export function validateBody(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar estructura
      const validated = await schema.parseAsync(req.body);
      
      // Sanitizar campos de texto
      req.body = sanitizeObject(validated);
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Datos de entrada inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware para validar query parameters
 */
export function validateQuery(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convertir query strings a tipos apropiados
      const query = parseQueryParams(req.query);
      
      // Validar
      const validated = await schema.parseAsync(query);
      
      // Reemplazar query con datos validados
      req.query = validated as any;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

/**
 * Middleware para validar parámetros de ruta
 */
export function validateParams(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convertir params a números donde sea apropiado
      const params = parseRouteParams(req.params);
      
      // Validar
      const validated = await schema.parseAsync(params);
      
      // Reemplazar params con datos validados
      req.params = validated as any;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Parámetros de ruta inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

// ====================================================================
// FUNCIONES DE SANITIZACIÓN
// ====================================================================

/**
 * Sanitiza HTML en strings
 */
function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No permitir ningún tag HTML
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true
  });
}

/**
 * Sanitiza un objeto recursivamente
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Parsea query parameters convirtiendo strings a tipos apropiados
 */
function parseQueryParams(query: any): any {
  const parsed: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      // Intentar convertir a número
      if (/^\d+$/.test(value)) {
        parsed[key] = parseInt(value, 10);
      }
      // Intentar convertir a float
      else if (/^\d+\.\d+$/.test(value)) {
        parsed[key] = parseFloat(value);
      }
      // Intentar convertir a boolean
      else if (value === 'true') {
        parsed[key] = true;
      }
      else if (value === 'false') {
        parsed[key] = false;
      }
      // Mantener como string
      else {
        parsed[key] = value;
      }
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
}

/**
 * Parsea parámetros de ruta
 */
function parseRouteParams(params: any): any {
  const parsed: any = {};
  
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      parsed[key] = parseInt(value, 10);
    } else {
      parsed[key] = value;
    }
  }
  
  return parsed;
}

// ====================================================================
// ESQUEMAS COMUNES PARA PARAMS
// ====================================================================

export const IdParamSchema = z.object({
  id: z.number().int().positive()
});

export const UuidParamSchema = z.object({
  id: z.string().uuid()
});

// ====================================================================
// VALIDADORES PERSONALIZADOS
// ====================================================================

/**
 * Valida que un array no tenga duplicados
 */
export function uniqueArray<T>() {
  return z.array(z.any()).refine(
    (arr) => new Set(arr).size === arr.length,
    'El array contiene elementos duplicados'
  );
}

/**
 * Valida que una fecha sea futura
 */
export function futureDate() {
  return z.string().datetime().refine(
    (date) => new Date(date) > new Date(),
    'La fecha debe ser futura'
  );
}

/**
 * Valida que una fecha sea pasada
 */
export function pastDate() {
  return z.string().datetime().refine(
    (date) => new Date(date) < new Date(),
    'La fecha debe ser pasada'
  );
}

/**
 * Valida formato de teléfono ecuatoriano
 */
export function ecuadorianPhone() {
  return z.string().regex(
    /^(\+593|0)[0-9]{9}$/,
    'Formato de teléfono ecuatoriano inválido'
  );
}

// ====================================================================
// EJEMPLO DE USO EN RUTAS
// ====================================================================

/*
import { Router } from 'express';
import { validateBody, validateQuery, validateParams, IdParamSchema } from './middleware/validation';

const router = Router();

// Crear producto
router.post('/products',
  authenticateToken,
  authorize(Permission.CREATE_PRODUCT),
  validateBody(ProductSchema),
  async (req, res, next) => {
    try {
      // req.body ya está validado y sanitizado
      const product = await db.product.create({
        data: req.body
      });
      
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  }
);

// Buscar productos
router.get('/products',
  validateQuery(SearchQuerySchema),
  async (req, res, next) => {
    try {
      // req.query ya está validado y parseado
      const { q, category, minPrice, maxPrice, page, limit, sortBy, sortOrder } = req.query;
      
      const products = await searchProducts({
        searchTerm: q,
        categoryId: category,
        minPrice,
        maxPrice,
        page,
        limit,
        sortBy,
        sortOrder
      });
      
      res.json(products);
    } catch (error) {
      next(error);
    }
  }
);

// Obtener producto por ID
router.get('/products/:id',
  validateParams(IdParamSchema),
  async (req, res, next) => {
    try {
      // req.params.id ya es un número
      const product = await db.product.findUnique({
        where: { id: req.params.id }
      });
      
      if (!product) {
        throw new AppError(404, 'Producto no encontrado');
      }
      
      res.json(product);
    } catch (error) {
      next(error);
    }
  }
);
*/
