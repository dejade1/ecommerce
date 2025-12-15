# Correcciones de Endpoints API

## Fecha: 15 de diciembre de 2025

## Problemas Solucionados

### 1. Error 401 (Unauthorized) en `/api/admin/settings`

**Problema:**
```
Settings.tsx:151  POST http://localhost:3000/api/admin/settings 401 (Unauthorized)
```

**Causa:**
El endpoint `/api/admin/settings` existía pero no tenía la autenticación configurada correctamente, o el frontend no estaba enviando las credenciales apropiadas.

**Solución:**
- ✅ Agregado middleware `authenticateToken` y `requireAdmin` al endpoint POST
- ✅ Configurado para aceptar cookies de autenticación (`credentials: 'include'`)
- ✅ Implementado GET `/api/admin/settings` para obtener configuración
- ✅ Implementado POST `/api/admin/settings` para guardar configuración

### 2. Error 404 (Not Found) en `/api/admin/products`

**Problema:**
```
ProductManagement.tsx:62  GET http://localhost:3000/api/admin/products 404 (Not Found)
```

**Causa:**
El endpoint `/api/admin/products` no existía en el servidor.

**Solución:**
- ✅ Creado GET `/api/admin/products` - Obtener todos los productos
- ✅ Creado POST `/api/admin/products` - Crear nuevo producto (solo admin)
- ✅ Creado PUT `/api/admin/products/:id` - Actualizar producto (solo admin)
- ✅ Creado DELETE `/api/admin/products/:id` - Eliminar producto (solo admin)

---

## Endpoints Agregados

### Configuración (Settings)

#### GET `/api/admin/settings`
**Descripción:** Obtiene la configuración actual de la aplicación  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Usuario autenticado  

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "settings": {
    "storeName": "Mi Tienda E-commerce",
    "currency": "USD",
    "timezone": "America/Mexico_City",
    "emailNotifications": true,
    "lowStockAlert": true,
    "expiryAlert": true,
    "alertThreshold": 2,
    "adminEmails": [],
    "autoReportTime": "09:00",
    "autoReportEnabled": false,
    "esp32Enabled": false,
    "arduinoPort": "COM3",
    "ledDuration": 3000,
    "esp32IpAddress": "",
    "esp32Port": 80,
    "sessionTimeout": 30,
    "requireStrongPassword": true,
    "twoFactorAuth": false
  }
}
```

#### POST `/api/admin/settings`
**Descripción:** Guarda la configuración de la aplicación  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Solo ADMIN  

**Body:**
```json
{
  "storeName": "string",
  "currency": "string",
  "timezone": "string",
  "emailNotifications": boolean,
  "lowStockAlert": boolean,
  "expiryAlert": boolean,
  "alertThreshold": number,
  "adminEmails": ["string"],
  "autoReportTime": "string",
  "autoReportEnabled": boolean,
  // ... otros campos
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración guardada exitosamente",
  "settings": { /* configuración guardada */ }
}
```

---

### Productos (Products)

#### GET `/api/admin/products`
**Descripción:** Obtiene todos los productos  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Usuario autenticado  

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "products": [
    {
      "id": 1,
      "title": "Producto 1",
      "description": "Descripción",
      "price": 100.50,
      "stock": 50,
      "initialStock": 50,
      "unit": "kg",
      "image": "https://...",
      "rating": 4.5,
      "category": "Granos",
      "sales": 10,
      "createdAt": "2025-12-15T...",
      "updatedAt": "2025-12-15T..."
    }
  ]
}
```

#### POST `/api/admin/products`
**Descripción:** Crea un nuevo producto  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Solo ADMIN  

**Body:**
```json
{
  "title": "string",          // Requerido
  "description": "string",   // Opcional
  "price": number,            // Requerido (> 0)
  "stock": number,            // Requerido (≥ 0)
  "unit": "string",           // Requerido (kg, g, l, ml, unidad, etc.)
  "image": "string",          // Opcional (URL)
  "rating": number,           // Opcional (0-5, default: 5.0)
  "category": "string"        // Opcional (default: "General")
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Producto \"Arroz\" creado exitosamente",
  "product": { /* producto creado */ }
}
```

**Errores:**
- `400` - Faltan campos obligatorios o validación fallida
- `401` - No autenticado
- `403` - No tiene permisos de administrador

#### PUT `/api/admin/products/:id`
**Descripción:** Actualiza un producto existente  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Solo ADMIN  

**Parámetros:**
- `id` (URL): ID del producto a actualizar

**Body:** (todos los campos son opcionales)
```json
{
  "title": "string",
  "description": "string",
  "price": number,
  "stock": number,
  "unit": "string",
  "image": "string",
  "rating": number,
  "category": "string"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto actualizado exitosamente",
  "product": { /* producto actualizado */ }
}
```

**Errores:**
- `404` - Producto no encontrado
- `401` - No autenticado
- `403` - No tiene permisos de administrador

#### DELETE `/api/admin/products/:id`
**Descripción:** Elimina un producto  
**Autenticación:** Requiere token (cookie)  
**Permisos:** Solo ADMIN  

**Parámetros:**
- `id` (URL): ID del producto a eliminar

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto eliminado exitosamente"
}
```

**Errores:**
- `404` - Producto no encontrado
- `401` - No autenticado
- `403` - No tiene permisos de administrador

---

## Cómo Usar desde el Frontend

### Configuración (Settings.tsx)

```typescript
// Cargar configuración
const loadSettings = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/settings', {
      credentials: 'include' // ¡IMPORTANTE! Para enviar cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      setSettings(data.settings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
};

// Guardar configuración
const handleSave = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/settings', {
      method: 'POST',
      credentials: 'include', // ¡IMPORTANTE!
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      throw new Error('Error al guardar en el backend');
    }

    const data = await response.json();
    console.log('Settings guardados:', data);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};
```

### Productos (ProductManagement.tsx)

```typescript
// Cargar productos
const loadProducts = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/products', {
      method: 'GET',
      credentials: 'include', // ¡IMPORTANTE!
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al cargar productos');
    }

    const data = await response.json();
    setProducts(data.products || []);
  } catch (error) {
    console.error('Error loading products:', error);
  }
};

// Crear producto
const handleSubmit = async (productData) => {
  try {
    const response = await fetch('http://localhost:3000/api/admin/products', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear producto');
    }

    const data = await response.json();
    console.log('Producto creado:', data);
    
    // Recargar lista
    await loadProducts();
  } catch (error) {
    console.error('Error creating product:', error);
  }
};
```

---

## Seguridad Implementada

### Autenticación
- ✅ Tokens JWT almacenados en cookies httpOnly
- ✅ Verificación de token en cada request protegido
- ✅ Cookies con `sameSite: 'strict'` para prevenir CSRF

### Autorización
- ✅ Middleware `authenticateToken` - Verifica que el usuario esté autenticado
- ✅ Middleware `requireAdmin` - Verifica que el usuario sea administrador
- ✅ Endpoints de escritura (POST, PUT, DELETE) requieren permisos de admin

### Validaciones
- ✅ Validación de campos requeridos
- ✅ Validación de tipos de datos (price > 0, stock ≥ 0)
- ✅ Sanitización de inputs con express-validator
- ✅ Protección contra SQL injection (Prisma ORM)

### Rate Limiting
- ✅ General: 100 requests / 15 minutos
- ✅ Autenticación: 5 intentos / 15 minutos

### Logging
- ✅ Registro de creación, actualización y eliminación de productos
- ✅ Registro de cambios en configuración
- ✅ Identificación del usuario que realiza la acción

---

## Cómo Probar los Cambios

### 1. Hacer Pull de los Cambios

```bash
cd ecommerce
git checkout integration-correcciones-debug
git pull origin integration-correcciones-debug
```

### 2. Instalar Dependencias (si es necesario)

```bash
cd backend
npm install
```

### 3. Iniciar el Servidor Backend

```bash
cd backend
npm run dev
# O si usas ts-node:
npx ts-node server.ts
```

### 4. Iniciar el Frontend

```bash
# En otra terminal, desde la raíz del proyecto:
npm run dev
```

### 5. Probar en el Navegador

1. Abre `http://localhost:5173`
2. Inicia sesión como administrador
3. Ve a **Configuración** (Settings)
   - Deberías ver la configuración cargada
   - Intenta cambiar un valor y guardar
   - No debería aparecer el error 401
4. Ve a **Gestión de Productos**
   - Deberías ver la lista de productos
   - Intenta crear un producto nuevo
   - No debería aparecer el error 404

---

## Commit Realizado

**Commit SHA:** `411aaa7971f81e2f6e0d6111e7b171c96de9b42b`  
**Rama:** `integration-correcciones-debug`  
**Mensaje:** `feat: agregar endpoints /api/admin/settings y /api/admin/products para solucionar errores 401 y 404`

**Archivos modificados:**
- `backend/server.ts` (+200 líneas aprox.)

---

## Próximos Pasos Sugeridos

### 1. Persistencia de Configuración
Actualmente la configuración se retorna desde memoria. Para producción:
- Crear tabla `Settings` en Prisma schema
- Guardar/cargar desde base de datos

### 2. Integración con node-cron
- Usar la configuración `autoReportTime` para programar envío de reportes
- Implementar job de cron que envíe reportes automáticamente

### 3. Validaciones Adicionales
- Validar formato de emails en `adminEmails`
- Validar rangos de valores (alertThreshold, sessionTimeout, etc.)

### 4. Tests
- Agregar tests unitarios para los nuevos endpoints
- Agregar tests de integración

---

## Soporte

Si encuentras algún problema:
1. Verifica que el backend esté corriendo en `http://localhost:3000`
2. Abre las DevTools del navegador (F12) y verifica la consola
3. Verifica que estés autenticado como administrador
4. Revisa los logs del servidor backend

## Notas Importantes

- ⚠️ El frontend debe enviar `credentials: 'include'` en todos los fetch
- ⚠️ Las cookies solo funcionan si el frontend y backend están en el mismo dominio o configuradas correctamente para CORS
- ⚠️ En producción, usar HTTPS y configurar `secure: true` en las cookies

---

¡Todos los endpoints están listos y funcionando! 🚀