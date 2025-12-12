require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('👤 Creando usuario administrador...');

    const username = 'admin';
    const email = 'admin@ecommerce.com';
    const password = 'admin123'; // Cambiar después del primer login

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    const admin = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        isAdmin: true,
      },
    });

    console.log('\n✅ Usuario administrador creado:');
    console.log('📧 Email:', email);
    console.log('👤 Username:', username);
    console.log('🔑 Password:', password);
    console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error creando administrador:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
