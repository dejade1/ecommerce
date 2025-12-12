const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });

  console.log('=== TODOS LOS PRODUCTOS EN BASE DE DATOS ===');
  console.log('Total productos:', products.length);
  console.log('');

  products.forEach(prod => {
    console.log(`ID ${prod.id}: ${prod.title}`);
    console.log(`  Stock: ${prod.stock} | Precio: $${prod.price} | Categoría: ${prod.category || 'N/A'}`);
  });

  console.log('\n=== PRODUCTOS CON STOCK (visibles en tienda) ===');
  const withStock = products.filter(p => p.stock > 0);
  console.log('Total con stock:', withStock.length);
  withStock.forEach(p => console.log(`- ${p.title} (Stock: ${p.stock})`));

  await prisma.$disconnect();
}

main().catch(console.error);
