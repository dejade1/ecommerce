const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAllStocks() {
  console.log('\n🔧 CORRIGIENDO STOCKS BASADO EN VENTAS...\n');

  // Carne de res: 100 inicial - 4 ventas = 96
  const carne = await prisma.product.update({
    where: { id: 2 },
    data: {
      stock: 96,
    }
  });
  console.log('✅ Carne de res: Stock 100 → 96 (4 ventas)');

  // Tropico seco: 25 inicial - 4 ventas = 21
  const tropico = await prisma.product.update({
    where: { id: 3 },
    data: {
      stock: 21,
    }
  });
  console.log('✅ Tropico seco: Stock 25 → 21 (4 ventas)');

  console.log('\n✅ Todos los stocks corregidos\n');

  await prisma.$disconnect();
}

fixAllStocks().catch(console.error);
