// Script temporal para convertir un usuario en administrador
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const username = 'cliente1';

  const user = await prisma.user.update({
    where: { username: username },
    data: { isAdmin: true },
  });

  console.log(`✅ Usuario ${username} ahora es administrador`);
  console.log(user);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
