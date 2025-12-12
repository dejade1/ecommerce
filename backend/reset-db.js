require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🧹 Limpiando base de datos...');

    // Eliminar todos los productos
    await prisma.product.deleteMany({});
    console.log('✅ Todos los productos eliminados');

    // Resetear el autoincrement (opcional)
    await prisma.$executeRawUnsafe('DELETE FROM sqlite_sequence WHERE name="Product"');
    console.log('✅ Contador de IDs reseteado');

    console.log('\n✅ Base de datos limpia. Ejecuta seed-products.js para crear productos nuevos.');

  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
