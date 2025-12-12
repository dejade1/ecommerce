require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const productCount = await prisma.product.count();
    console.log(`📦 Total de productos en la base de datos: ${productCount}`);

    if (productCount > 0) {
      const products = await prisma.product.findMany({
        take: 5,
        orderBy: { sales: 'desc' }
      });

      console.log('\n📊 Primeros 5 productos (ordenados por ventas):');
      products.forEach(p => {
        console.log(`  - ${p.title}: ${p.sales || 0} ventas, stock: ${p.stock}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
