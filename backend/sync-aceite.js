const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAceite() {
  console.log('\n🔄 SINCRONIZANDO ACEITE EL COCINERO...\n');

  // Actualizar aceite con 2 ventas
  const updated = await prisma.product.update({
    where: { id: 1 },
    data: {
      sales: 2,
      stock: 8, // 10 - 2 ventas
    }
  });

  console.log('✅ Aceite actualizado:');
  console.log(`   Ventas: 0 → ${updated.sales}`);
  console.log(`   Stock: 10 → ${updated.stock}`);
  console.log('\n✅ Sincronización completada\n');

  await prisma.$disconnect();
}

syncAceite().catch(console.error);
