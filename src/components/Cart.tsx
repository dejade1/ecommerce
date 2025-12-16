import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingCart, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { CustomerData } from '../context/CartContext';

export function Cart() {
  const { state, dispatch, checkout } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>({
    customerName: '',
    customerEmail: '',
    phone: '',
    address: '',
    paymentMethod: 'Efectivo'
  });

  const total = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      await checkout(customerData);
      // Resetear formulario
      setCustomerData({
        customerName: '',
        customerEmail: '',
        phone: '',
        address: '',
        paymentMethod: 'Efectivo'
      });
      setShowCheckout(false);
    } catch (error) {
      console.error('Error en checkout:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={() => {
          dispatch({ type: 'TOGGLE_CART' });
          setShowCheckout(false);
        }}
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-white sticky top-0 z-10">
            <div className="flex items-center">
              {showCheckout ? (
                <>
                  <CreditCard className="h-6 w-6 mr-2 text-green-600" />
                  <h2 className="text-lg font-semibold">Datos de Envío</h2>
                </>
              ) : (
                <>
                  <ShoppingCart className="h-6 w-6 mr-2" />
                  <h2 className="text-lg font-semibold">Carrito de Compras</h2>
                </>
              )}
            </div>
            <button
              onClick={() => {
                dispatch({ type: 'TOGGLE_CART' });
                setShowCheckout(false);
              }}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Contenido */}
          {!showCheckout ? (
            // Vista del Carrito
            <>
              <div className="flex-1 overflow-y-auto p-4">
                {state.items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <ShoppingCart className="h-16 w-16 mb-4" />
                    <p className="text-lg">Tu carrito está vacío</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {state.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 border-b pb-4">
                        <img
                          src={item.image || 'https://via.placeholder.com/80'}
                          alt={item.title}
                          className="h-20 w-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium">{item.title}</h3>
                          <p className="text-gray-600">
                            ${item.price.toFixed(2)} por {item.unit}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <button
                              onClick={() =>
                                dispatch({
                                  type: 'UPDATE_QUANTITY',
                                  payload: { id: item.id, quantity: Math.max(0, item.quantity - 1) },
                                })
                              }
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              onClick={() =>
                                dispatch({
                                  type: 'UPDATE_QUANTITY',
                                  payload: { id: item.id, quantity: item.quantity + 1 },
                                })
                              }
                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_ITEM', payload: item.id })}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t p-4 bg-white">
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">Total:</span>
                  <span className="font-semibold text-xl">${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={state.items.length === 0}
                >
                  Proceder al Pago
                </button>
              </div>
            </>
          ) : (
            // Vista de Checkout
            <>
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleCheckout} className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerData.customerName}
                      onChange={(e) => setCustomerData({ ...customerData, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="Juan Pérez"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerData.customerEmail}
                      onChange={(e) => setCustomerData({ ...customerData, customerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="juan@example.com"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="555-1234"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección de Envío *
                    </label>
                    <textarea
                      required
                      value={customerData.address}
                      onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      placeholder="Calle Falsa 123, Ciudad, País"
                      rows={3}
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago *
                    </label>
                    <select
                      required
                      value={customerData.paymentMethod}
                      onChange={(e) => setCustomerData({ ...customerData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      disabled={isProcessing}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                      <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                    </select>
                  </div>

                  {/* Resumen */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-semibold mb-2">Resumen de Compra</h3>
                    <div className="space-y-1 text-sm">
                      {state.items.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.title} x {item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-lg">${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowCheckout(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-4 rounded-md transition-colors"
                      disabled={isProcessing}
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Procesando...' : 'Confirmar Compra'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
