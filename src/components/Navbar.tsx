import React, { useState } from 'react';
import { Search, ShoppingCart, Menu, User, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onSearch: (term: string) => void;
  searchTerm: string;
}

export function Navbar({ onSearch, searchTerm }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { state, dispatch } = useCart();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-8">
            <div className="text-2xl font-bold">Tienda</div>
            <div className="hidden md:flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span className="text-sm">Enviar a Usuario</span>
            </div>
          </div>

          <div className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Buscar productos..."
                className="w-full py-2 px-4 pr-10 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <button className="absolute right-0 top-0 h-full px-4 text-gray-600 hover:text-gray-900">
                <Search className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <button className="flex items-center space-x-1 hover:text-yellow-400">
              <User className="w-5 h-5" />
              <span>Cuenta</span>
            </button>
            <button 
              className="flex items-center space-x-1 hover:text-yellow-400"
              onClick={() => dispatch({ type: 'TOGGLE_CART' })}
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="bg-yellow-400 text-gray-900 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden px-2 pt-2 pb-3 space-y-1">
            <a
              href="#"
              className="block px-3 py-2 rounded-md text-white hover:bg-gray-700"
            >
              Cuenta
            </a>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_CART' })}
              className="block w-full text-left px-3 py-2 rounded-md text-white hover:bg-gray-700"
            >
              Carrito ({totalItems})
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}