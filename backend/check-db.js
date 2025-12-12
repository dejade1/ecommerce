const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('\n📊 VERIFICANDO BASE DE DATOS\n');

  const products = await prisma.product.findMany({
    orderBy: { title: 'asc' }
  });

  console.log('═'.repeat(80));
  console.log('PRODUCTOS EN LA BASE DE DATOS');
  console.log('═'.repeat(80));

  for (const p of products) {
    console.log(`\n📦 ${p.title}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Stock Actual: ${p.stock}`);
    console.log(`   Stock Inicial: ${p.initialStock || 'No definido'}`);
    console.log(`   Ventas: ${p.sales || 0}`);
    console.log(`   Precio: $${p.price}`);
    console.log(`   Categoría: ${p.category || 'Sin categoría'}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\nTotal productos: ${products.length}`);

  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
