# Sistema de Roles y Programa de Fidelización

## 👥 Roles de Usuario

### Tipos de usuarios:

1. **ADMIN** - Administrador completo
   - Acceso total al panel de administración
   - Puede gestionar productos, usuarios, órdenes, etc.

2. **USER** - Usuario con permisos administrativos
   - Mismo acceso que ADMIN (por ahora)
   - Útil para futuros permisos granulares

3. **CLIENT** - Cliente final
   - **SIN acceso al panel de administración**
   - Solo puede realizar compras
   - Participa en programa de fidelización

---

## 🎯 Programa de Fidelización

### Reglas:

- ✅ **10 puntos por cada dólar** de compra
- ✅ **Sin fecha de caducidad** (puntos acumulables indefinidamente)
- ✅ **1000 puntos = $1 de descuento**
- ✅ Los clientes pueden usar puntos en cualquier momento

### Ejemplo:

```
Compra de $50.00:
- Puntos ganados: 500 puntos
- Total acumulado: 1500 puntos

Próxima compra de $30.00:
- Puede usar 1000 puntos = $1 de descuento
- Total a pagar: $29.00
- Puntos usados: -1000
- Puntos ganados: 290 (por $29.00)
- Total acumulado: 790 puntos
```

---

## 🛠️ Pasos de Implementación

### 1. Actualizar base de datos

```bash
cd backend

# Generar cliente de Prisma con nuevo schema
npx prisma generate

# Aplicar migración
npx prisma migrate dev --name add_roles_and_loyalty

# Si hay problemas con SQLite, usar:
npx prisma db push
```

### 2. Actualizar tipos en el frontend

Actualizar `src/lib/auth-service.ts`:

```typescript
export interface User {
    id: number;
    username: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'CLIENT';  // ✅ Cambiar isAdmin por role
    loyaltyPoints?: number;              // ✅ Agregar puntos
}
```

### 3. Proteger rutas de administración

Actualizar `src/components/ProtectedRoute.tsx`:

```typescript
if (user.role === 'CLIENT') {
    return <div>Acceso denegado. Solo administradores.</div>;
}
```

### 4. Actualizar backend

Actualizar `backend/src/server.ts`:

```typescript
// Middleware para verificar que NO es cliente
function requireNotClient(req: AuthRequest, res: Response, next: NextFunction) {
    if (req.user?.role === 'CLIENT') {
        return res.status(403).json({ 
            error: 'Acceso denegado. Esta función es solo para administradores' 
        });
    }
    next();
}

// Aplicar a todas las rutas de admin
app.use('/api/admin/*', authenticateToken, requireNotClient);
```

### 5. Sistema de puntos en compras

```typescript
// Calcular puntos al crear orden
const calculatePoints = (totalInDollars: number): number => {
    return Math.floor(totalInDollars * 10);
};

// Calcular descuento desde puntos
const calculateDiscount = (points: number): number => {
    return Math.floor(points / 1000);
};

// Al crear una orden:
const pointsEarned = calculatePoints(total);
const pointsToUse = Math.min(user.loyaltyPoints, requestedPoints);
const discount = calculateDiscount(pointsToUse);
const finalTotal = total - discount;

// Actualizar puntos del usuario
await prisma.user.update({
    where: { id: userId },
    data: {
        loyaltyPoints: {
            increment: pointsEarned - pointsToUse
        }
    }
});

// Registrar en historial
await prisma.loyaltyPointsHistory.create({
    data: {
        userId,
        points: pointsEarned,
        orderId: order.id,
        description: `Compra de $${total.toFixed(2)}`
    }
});

if (pointsToUse > 0) {
    await prisma.loyaltyPointsHistory.create({
        data: {
            userId,
            points: -pointsToUse,
            orderId: order.id,
            description: `Descuento aplicado: $${discount.toFixed(2)}`
        }
    });
}
```

---

## 📝 Cambios necesarios en archivos existentes

### Backend (`backend/src/server.ts`):

1. Cambiar `isAdmin` por `role` en todas las partes
2. Actualizar `/api/auth/register` para aceptar `role`
3. Agregar middleware `requireNotClient`
4. Crear endpoint `/api/user/loyalty-points` (GET)
5. Crear endpoint `/api/user/loyalty-history` (GET)
6. Actualizar lógica de órdenes para calcular puntos

### Frontend:

1. `src/lib/auth-service.ts` - Actualizar interface User
2. `src/components/ProtectedRoute.tsx` - Bloquear clientes
3. `src/context/AuthContext.tsx` - Actualizar tipo User
4. Crear `src/components/LoyaltyPoints.tsx` - Mostrar puntos del usuario
5. Actualizar proceso de checkout para permitir usar puntos

---

## 🧪 Testing

### Casos de prueba:

1. ✅ Cliente NO puede acceder a `/admin`
2. ✅ Admin y User SÍ pueden acceder a `/admin`
3. ✅ Cliente gana 10 puntos por cada dólar
4. ✅ Cliente puede usar 1000 puntos para $1 de descuento
5. ✅ Puntos se acumulan correctamente
6. ✅ Historial de puntos se registra

---

## 🔐 Migración de usuarios existentes

Los usuarios existentes:
- `isAdmin = true` → se convierten en `role = 'ADMIN'`
- `isAdmin = false` → se convierten en `role = 'CLIENT'`
- Todos empiezan con `loyaltyPoints = 0`

---

## 📊 Dashboard de puntos (futuro)

### Para clientes:
- Ver puntos actuales
- Ver historial de puntos
- Calcular cuánto pueden ahorrar

### Para admins:
- Ver estadísticas de programa de fidelización
- Clientes con más puntos
- Total de puntos canjeados
