require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAllDatabase() {
  try {
    console.log('🧹 Borrando TODA la base de datos...');

    // Orden importante: eliminar en orden inverso de dependencias
    await prisma.stockAdjustment.deleteMany({});
    console.log('✅ StockAdjustments eliminados');

    await prisma.orderItem.deleteMany({});
    console.log('✅ OrderItems eliminados');

    await prisma.order.deleteMany({});
    console.log('✅ Orders eliminadas');

    await prisma.batch.deleteMany({});
    console.log('✅ Batches eliminados');

    await prisma.product.deleteMany({});
    console.log('✅ Products eliminados');

    await prisma.refreshToken.deleteMany({});
    console.log('✅ RefreshTokens eliminados');

    await prisma.user.deleteMany({});
    console.log('✅ Users eliminados');

    // Resetear todos los autoincrements
    await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence');
    console.log('✅ Todos los contadores de IDs reseteados');

    console.log('\n✅✅✅ BASE DE DATOS COMPLETAMENTE VACÍA');
    console.log('👉 Ahora puedes agregar productos manualmente desde el panel de admin');

  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllDatabase();
