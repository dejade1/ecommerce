import React from 'react';
import { Star, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Product } from '../lib/inventory';

interface ProductCardProps extends Product {}

export function ProductCard({ id, title, price, rating, image, unit, stock }: ProductCardProps) {
  const { dispatch } = useCart();

  const addToCart = () => {
    dispatch({
      type: 'ADD_ITEM',
      payload: { id, title, price, quantity: 1, image, unit, stock, rating },
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-4 flex flex-col">
      <div className="relative group">
        <img src={image} alt={title} className="w-full h-48 object-cover rounded-md mb-4" />
        {stock < 10 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            ¡Quedan {stock} unidades!
          </span>
        )}
      </div>
      <h3 className="font-medium text-gray-800 mb-2 line-clamp-2">{title}</h3>
      <div className="flex items-center mb-2">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-2">({rating})</span>
      </div>
      <div className="mt-auto">
        <div className="flex items-baseline mb-4">
          <span className="text-xl font-bold">${price.toFixed(2)}</span>
          <span className="ml-2 text-sm text-gray-600">por {unit}</span>
        </div>
        <button 
          onClick={addToCart}
          disabled={stock === 0}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-5 h-5" />
          {stock === 0 ? 'Sin Stock' : 'Añadir al Carrito'}
        </button>
      </div>
    </div>
  );
}