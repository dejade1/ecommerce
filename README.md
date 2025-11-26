# Instrucciones para agregar gestión de lotes y reportes diarios

## Archivos incluidos
- src/components/admin/BatchManager.tsx: Componente React para gestionar lotes
- src/components/admin/EmailTasks.tsx: Componente para disparar envío manual de reportes y alertas
- src/lib/email-service.ts: Funciones para disparar las funciones Edge de email
- src/lib/batch-service.ts: Servicios para gestión y consulta de lotes
- prisma/migrations/xxxx_product_batches.sql: Migración para tabla product_batches
- .env-example: Variables a configurar para email (ADMIN_EMAIL) y API (RESEND_API_KEY)

## Pasos para integración

1. Crear migración e inicializar tabla product_batches
2. Configurar variables de entorno ADMIN_EMAIL y RESEND_API_KEY
3. Agregar los componentes BatchManager y EmailTasks en el panel admin
4. Usar servicios batch-service.ts para agregar lotes con número automático y fechas
5. Disparar funciones Edge para resúmenes y alertas
6. Testear envío manual desde EmailTasks y verificar alertas

## Notas

- La generación automática de número de lote usa prefijos del nombre del producto y sufijos alfabéticos.
- La alerta de caducidad se genera 5 días antes en función de la fecha de lote.

