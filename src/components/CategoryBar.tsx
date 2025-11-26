import React from 'react';
import { ChevronDown } from 'lucide-react';

export function CategoryBar() {
  const categories = [
    'Alimentos Básicos',
    'Limpieza del Hogar',
    'Despensa',
    'Ofertas del Día',
    'Más Vendidos',
  ];

  return (
    <div className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center space-x-6 text-sm">
          <button className="flex items-center space-x-1 hover:text-yellow-400">
            <span>Categorías</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className="hidden md:block hover:text-yellow-400"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}