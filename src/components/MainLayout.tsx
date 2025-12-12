import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { CategoryBar } from './CategoryBar';
import { ProductCard } from './ProductCard';
import { Cart } from './Cart';
import { AdminButton } from './AdminButton';

// ==================== TIPOS ====================

interface Product {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  stock: number;
  unit: string;
  image?: string | null;
  rating: number;
  category?: string | null;
  sales: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

const API_URL = 'http://localhost:3000';

export function MainLayout() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar productos desde el backend
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError('');

        console.log('🔄 Cargando productos desde el backend...', API_URL);

        const response = await fetch(`${API_URL}/api/products/public`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('📡 Respuesta del servidor:', response.status);

        if (!response.ok) {
          throw new Error('Error al cargar productos');
        }

        const data = await response.json();

        console.log('✅ Productos recibidos del backend:', data.products?.length, 'productos');
        console.log('📦 Productos:', data.products?.map(p => p.title));

        if (data.success && data.products) {
          setProducts(data.products);
          setFilteredProducts(data.products);

          // ✅ SINCRONIZAR CON INDEXEDDB para que el checkout funcione
          const { db } = await import('../lib/db');
          console.log('💾 Sincronizando productos con IndexedDB...');

          for (const product of data.products) {
            const exists = await db.products.get(product.id);
            if (exists) {
              // Actualizar todos los campos desde el backend (backend es fuente de verdad)
              await db.products.update(product.id, {
                title: product.title,
                description: product.description,
                price: product.price,
                stock: product.stock, // ✅ Sincronizar stock desde backend
                sales: product.sales || 0, // ✅ Sincronizar ventas desde backend
                initialStock: product.initialStock || product.stock, // ✅ Sincronizar stock inicial
                unit: product.unit,
                image: product.image,
                rating: product.rating,
                category: product.category,
                updatedAt: product.updatedAt
              });
            } else {
              await db.products.add(product);
            }

            // Crear lote inicial si el producto tiene stock pero no tiene lotes
            if (product.stock > 0) {
              const batches = await db.batches.where('productId').equals(product.id).toArray();
              const totalBatchQty = batches.reduce((sum, b) => sum + b.quantity, 0);

              if (totalBatchQty === 0) {
                // Crear lote inicial con 6 meses de vencimiento
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 6);

                await db.batches.add({
                  productId: product.id,
                  batchCode: `INIT-${product.id}-${Date.now()}`,
                  quantity: product.stock,
                  expiryDate: expiryDate.toISOString().split('T')[0],
                  createdAt: new Date().toISOString()
                });

                console.log(`📦 Lote inicial creado para "${product.title}": ${product.stock} unidades`);
              }
            }
          }

          console.log('✅ Productos sincronizados con IndexedDB');
        }
      } catch (err) {
        console.error('❌ Error loading products:', err);
        setError('Error al cargar productos. Por favor recarga la página.');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = products.filter(product =>
      product.title.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar onSearch={handleSearch} searchTerm={searchTerm} />
      <CategoryBar />
      <Cart />
      <AdminButton />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Estado de carga */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Cargando productos...</p>
          </div>
        )}

        {/* Estado de error */}
        {error && !loading && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-8">
            {error}
          </div>
        )}

        {/* Productos cargados */}
        {!loading && !error && (
          <>
            {searchTerm ? (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Resultados de búsqueda para "{searchTerm}"
                </h2>
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} {...product} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">No se encontraron productos que coincidan con tu búsqueda.</p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Productos Disponibles</h2>
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {products.length} productos desde backend
                    </span>
                  </div>
                  {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <ProductCard key={product.id} {...product} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No hay productos disponibles en este momento.</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}