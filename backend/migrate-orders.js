/**
 * Script para migrar la tabla Order agregando campos de cliente
 * 
 * IMPORTANTE: Ejecutar ANTES de reiniciar el servidor
 * 
 * Uso:
 *   node migrate-orders.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateOrders() {
  console.log('🔄 Iniciando migración de tabla Order...');

  try {
    // 1. Verificar si ya existen órdenes
    const existingOrders = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Order"
    `;
    
    const orderCount = existingOrders[0]?.count || 0;
    console.log(`📊 Encontradas ${orderCount} órdenes existentes`);

    if (orderCount > 0) {
      console.log('⚠️  Se encontraron órdenes existentes. Agregando campos por defecto...');
      
      // 2. Actualizar órdenes existentes con valores por defecto
      await prisma.$executeRaw`
        UPDATE "Order" 
        SET 
          customerName = COALESCE(customerName, 'Cliente Anónimo'),
          customerEmail = COALESCE(customerEmail, 'cliente@example.com'),
          phone = COALESCE(phone, 'N/A'),
          address = COALESCE(address, 'N/A'),
          paymentMethod = COALESCE(paymentMethod, 'Efectivo'),
          status = COALESCE(status, 'PENDING')
        WHERE customerName IS NULL
      `;
      
      console.log('✅ Órdenes existentes actualizadas con valores por defecto');
    }

    // 3. Generar nueva migración de Prisma
    console.log('📦 Generando migración de Prisma...');
    console.log('\n⚠️  EJECUTA MANUALMENTE:');
    console.log('   cd backend');
    console.log('   npx prisma migrate dev --name add_order_customer_fields');
    console.log('\n✅ Migración preparada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateOrders()
  .then(() => {
    console.log('\n🎉 Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
