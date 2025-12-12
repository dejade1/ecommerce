require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProducts() {
  try {
    console.log('🌱 Sembrando productos de prueba...');

    const products = [
      {
        title: 'Coca Cola 600ml',
        description: 'Refresco de cola 600ml',
        price: 1.50,
        stock: 50,
        initialStock: 50,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Coca+Cola',
        category: 'Bebidas',
        sales: 15,
        rating: 4.5
      },
      {
        title: 'Agua Mineral 1L',
        description: 'Agua mineral natural 1 litro',
        price: 0.80,
        stock: 100,
        initialStock: 100,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Agua',
        category: 'Bebidas',
        sales: 45,
        rating: 4.8
      },
      {
        title: 'Pan Blanco',
        description: 'Pan blanco fresco 500g',
        price: 1.20,
        stock: 30,
        initialStock: 30,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/D2691E/FFFFFF?text=Pan',
        category: 'Panadería',
        sales: 25,
        rating: 4.3
      },
      {
        title: 'Leche Entera 1L',
        description: 'Leche entera pasteurizada',
        price: 1.80,
        stock: 40,
        initialStock: 40,
        unit: 'litro',
        image: 'https://via.placeholder.com/150/FFFFFF/000000?text=Leche',
        category: 'Lácteos',
        sales: 30,
        rating: 4.6
      },
      {
        title: 'Cerveza Corona 355ml',
        description: 'Cerveza clara importada',
        price: 2.50,
        stock: 60,
        initialStock: 60,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/FFD700/000000?text=Corona',
        category: 'Licores',
        sales: 20,
        rating: 4.7
      },
      {
        title: 'Huevos Docena',
        description: 'Huevos frescos de granja',
        price: 3.50,
        stock: 25,
        initialStock: 25,
        unit: 'docena',
        image: 'https://via.placeholder.com/150/FFFACD/000000?text=Huevos',
        category: 'Lácteos',
        sales: 18,
        rating: 4.4
      },
      {
        title: 'Arroz 1kg',
        description: 'Arroz blanco grano largo',
        price: 2.20,
        stock: 35,
        initialStock: 35,
        unit: 'kg',
        image: 'https://via.placeholder.com/150/F5F5DC/000000?text=Arroz',
        category: 'Granos',
        sales: 12,
        rating: 4.2
      },
      {
        title: 'Aceite de Oliva 500ml',
        description: 'Aceite de oliva extra virgen',
        price: 5.50,
        stock: 20,
        initialStock: 20,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/808000/FFFFFF?text=Aceite',
        category: 'Aceites',
        sales: 8,
        rating: 4.9
      },
      {
        title: 'Café Molido 250g',
        description: 'Café molido 100% arábica',
        price: 4.00,
        stock: 28,
        initialStock: 28,
        unit: 'unidad',
        image: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Cafe',
        category: 'Bebidas',
        sales: 22,
        rating: 4.7
      },
      {
        title: 'Azúcar 1kg',
        description: 'Azúcar blanca refinada',
        price: 1.50,
        stock: 45,
        initialStock: 45,
        unit: 'kg',
        image: 'https://via.placeholder.com/150/FFFFFF/000000?text=Azucar',
        category: 'Granos',
        sales: 16,
        rating: 4.1
      }
    ];

    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData
      });
      console.log(`✅ Producto creado: ${product.title} (ID: ${product.id})`);
    }

    const totalProducts = await prisma.product.count();
    console.log(`\n🎉 ¡Completado! Total de productos en la base de datos: ${totalProducts}`);

  } catch (error) {
    console.error('❌ Error sembrando productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProducts();
