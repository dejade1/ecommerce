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

  // ✅ Cargar productos SOLO desde el backend (sin IndexedDB)
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

        console.log('✅ Productos recibidos del backend:', data.products?.length || 0, 'productos');

        if (data.success && data.products) {
          setProducts(data.products);
          setFilteredProducts(data.products);
          console.log('🎉 Productos cargados exitosamente');
        } else {
          console.log('⚠️  No hay productos en el backend');
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
            <p className="text-gray-600 text-lg">🔄 Cargando productos...</p>
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
                      {products.length} productos
                    </span>
                  </div>
                  {products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {products.map((product) => (
                        <ProductCard key={product.id} {...product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-600 text-lg mb-4">
                        📦 No hay productos disponibles en este momento.
                      </p>
                      <p className="text-gray-500 text-sm">
                        Los productos se agregan desde el panel de administración.
                      </p>
                    </div>
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
