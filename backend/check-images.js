const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });

  console.log('=== PRODUCTOS E IMÁGENES ===\n');
  products.forEach(p => {
    console.log(`ID: ${p.id} | ${p.name}`);
    console.log(`   Imagen: ${p.image}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkImages().catch(console.error);
