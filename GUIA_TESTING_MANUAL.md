# 📋 GUÍA DE TESTING MANUAL

## ✅ CHECKLIST DE TESTING COMPLETO

### 1. 🔐 SEGURIDAD Y AUTENTICACIÓN

- [ ] **Test 1.1:** Servidor rechaza arrancar sin JWT_SECRET
  ```bash
  # Renombrar backend/.env temporalmente
  cd backend
  mv .env .env.backup
  npm run dev
  # ✅ Debe mostrar: "❌ FATAL: JWT_SECRET must be set..."
  mv .env.backup .env
  ```

- [ ] **Test 1.2:** Login con credenciales incorrectas
  - Ir a login de admin
  - Usar credenciales incorrectas
  - ✅ Debe mostrar "Credenciales inválidas"
  - ✅ NO debe revelar si el usuario existe

- [ ] **Test 1.3:** Login con credenciales correctas
  - Usar credenciales válidas
  - ✅ Debe redireccionar al dashboard
  - ✅ Abrir DevTools → Application → Cookies
  - ✅ Verificar cookies httpOnly: `accessToken`, `refreshToken`

- [ ] **Test 1.4:** Rate limiting de login
  - Intentar login 6 veces con password incorrecta
  - ✅ Después del 5to intento debe bloquear por 15 minutos
  - ✅ Mensaje: "Demasiados intentos de login"

- [ ] **Test 1.5:** Refresh automático de token
  - Login exitoso
  - Dejar la página abierta
  - Abrir DevTools → Network
  - ✅ Después de 14 minutos debe hacer request a `/api/auth/refresh`
  - ✅ No debe cerrar sesión

- [ ] **Test 1.6:** Sanitización de inputs
  - Intentar login con: `<script>alert('xss')</script>`
  - ✅ No debe ejecutar el script
  - ✅ Debe sanitizar el input

---

### 2. 📦 LÓGICA FIFO DE LOTES

- [ ] **Test 2.1:** Crear lotes con diferentes fechas de vencimiento
  ```
  Dashboard → Stock → Agregar lotes:
  - Producto: Arroz
  - Lote A: 50 unidades, vence 2025-12-10
  - Lote B: 30 unidades, vence 2025-12-05 (más antiguo)
  - Lote C: 20 unidades, vence 2025-12-15
  ```
  - ✅ Los 3 lotes deben aparecer en la tabla

- [ ] **Test 2.2:** Consumir lotes en orden FIFO
  ```
  Dashboard → Inventory → Vender 60 unidades de Arroz
  ```
  - ✅ Lote B debe desaparecer (30 unidades consumidas)
  - ✅ Lote A debe quedar con 20 unidades (consumió 30 de 50)
  - ✅ Lote C debe quedar intacto (20 unidades)

- [ ] **Test 2.3:** Alertas de lotes próximos a vencer
  ```
  Dashboard → Batches → Ver alertas
  ```
  - ✅ Debe mostrar lotes que vencen en menos de 7 días
  - ✅ Debe mostrar en orden de prioridad (más antiguo primero)

- [ ] **Test 2.4:** Sincronización de stock
  - Ver stock total del producto en Inventory
  - Sumar manualmente las cantidades de todos los lotes
  - ✅ Ambos valores deben coincidir

---

### 3. 🛒 CARRITO Y ÓRDENES

- [ ] **Test 3.1:** Agregar productos al carrito
  - Agregar 3 productos diferentes
  - ✅ El contador del carrito debe actualizarse
  - ✅ El total debe calcularse correctamente

- [ ] **Test 3.2:** Modificar cantidades en carrito
  - Cambiar cantidad de un producto
  - ✅ El total debe recalcularse
  - ✅ El cambio debe reflejarse inmediatamente

- [ ] **Test 3.3:** Validación de stock al checkout
  - Intentar comprar más unidades de las disponibles
  - ✅ Debe mostrar error: "Stock insuficiente"
  - ✅ No debe procesar la orden

- [ ] **Test 3.4:** Checkout exitoso
  - Comprar productos con stock suficiente
  - ✅ Debe mostrar confirmación
  - ✅ El stock debe decrementar
  - ✅ Debe crear una orden en "Sales History"
  - ✅ Debe consumir los lotes correctamente (FIFO)

---

### 4. 🔧 RENDIMIENTO

- [ ] **Test 4.1:** Validación de contraseña no bloquea UI
  ```javascript
  // En consola del navegador:
  const start = Date.now();
  // Ir a registro y escribir contraseña larga
  const password = 'A'.repeat(100) + 'a1!';
  // Pegar en el campo de contraseña
  const duration = Date.now() - start;
  console.log('Duration:', duration, 'ms');
  ```
  - ✅ Debe validar en menos de 100ms

- [ ] **Test 4.2:** Búsqueda de productos es rápida
  - Ir a Products
  - Buscar por nombre
  - ✅ Resultados deben aparecer instantáneamente (<500ms)

- [ ] **Test 4.3:** Queries de lotes son rápidas
  - Ir a Stock
  - Filtrar por producto
  - ✅ Resultados deben cargar rápidamente (<1s)

---

### 5. 🐛 MANEJO DE ERRORES

- [ ] **Test 5.1:** Error de red (backend apagado)
  - Apagar el backend
  - Intentar hacer login
  - ✅ Debe mostrar: "No se pudo conectar con el servidor"
  - ✅ NO debe crashear la app

- [ ] **Test 5.2:** Timeout de request
  ```
  // Simular request lento en DevTools:
  DevTools → Network → Throttling → "Slow 3G"
  ```
  - Intentar login
  - ✅ Después de 10 segundos debe abortar
  - ✅ Debe mostrar error de timeout

- [ ] **Test 5.3:** Sesión expirada
  - Login exitoso
  - Cerrar navegador
  - Abrir después de 8 días (o modificar expiración del refresh token)
  - ✅ Debe pedir login nuevamente
  - ✅ NO debe mostrar datos del usuario anterior

---

### 6. 📱 HARDWARE (OPCIONAL)

- [ ] **Test 6.1:** Conexión con ESP32/Arduino
  ```
  Dashboard → Test Connection
  ```
  - ✅ Si hay hardware conectado, debe mostrar "Connected"
  - ✅ Si NO hay hardware, debe mostrar mensaje sin crashear

- [ ] **Test 6.2:** Notificación LED al comprar
  - Hacer una compra
  - ✅ Si hay hardware, el LED debe encenderse
  - ✅ Si NO hay hardware, la compra debe procesarse normalmente

---

### 7. 🗄️ BASE DE DATOS

- [ ] **Test 7.1:** IndexedDB se inicializa automáticamente
  ```javascript
  // En consola del navegador:
  indexedDB.databases().then(console.log)
  ```
  - ✅ Debe mostrar base de datos "storeDB"
  - ✅ Debe tener las stores: products, orders, orderItems, product_batches

- [ ] **Test 7.2:** Transacciones son atómicas
  - Iniciar una compra
  - Interrumpir (cerrar navegador a la mitad)
  - Reabrir
  - ✅ La orden debe estar completa O no existir
  - ✅ NO debe haber estado inconsistente

---

### 8. 🔄 ACTUALIZACIÓN Y PERSISTENCIA

- [ ] **Test 8.1:** Datos persisten después de recargar
  - Agregar productos al carrito
  - Recargar página (F5)
  - ✅ El carrito debe mantener los productos

- [ ] **Test 8.2:** Sesión persiste después de recargar
  - Hacer login
  - Recargar página (F5)
  - ✅ Debe seguir autenticado
  - ✅ NO debe pedir login nuevamente

---

## 🎯 CRITERIOS DE ÉXITO

Para considerar el testing completado, TODOS los tests deben pasar:

- ✅ 0 errores en consola del navegador
- ✅ 0 warnings de React
- ✅ 0 errores en consola del servidor
- ✅ Todas las transacciones son atómicas
- ✅ No hay memory leaks (verificar en DevTools → Memory)
- ✅ No hay race conditions (ejecutar tests múltiples veces)

---

## 🚨 TESTS DE ESTRÉS (OPCIONAL)

### Test de Carga de Lotes
```javascript
// En consola del navegador después de login:
for (let i = 0; i < 100; i++) {
  // Agregar 100 lotes
  // Verificar que no se bloquee la UI
}
```

### Test de Múltiples Usuarios Concurrentes
```bash
# Usar herramienta como Apache Bench:
ab -n 1000 -c 10 http://localhost:3000/api/auth/login
```
- ✅ El servidor debe responder sin crashear
- ✅ Rate limiting debe funcionar correctamente

---

## 📝 REPORTE DE BUGS

Si encuentras algún bug:

1. Anotar pasos exactos para reproducirlo
2. Captura de pantalla si es UI
3. Logs de consola (frontend y backend)
4. Versión del navegador
5. Sistema operativo

---

**Última actualización:** 2025-12-01
**Tests completados:** ___/40
