require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearProducts() {
  try {
    console.log('🗑️  Eliminando productos de prueba...');

    const deletedCount = await prisma.product.deleteMany({});

    console.log(`✅ Se eliminaron ${deletedCount.count} productos`);

    const remainingCount = await prisma.product.count();
    console.log(`📦 Productos restantes en la base de datos: ${remainingCount}`);

  } catch (error) {
    console.error('❌ Error eliminando productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearProducts();
