import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useLedNotification } from '../hooks/useLedNotification';
import { useAuth } from './AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'TOGGLE_CART' }
  | { type: 'CLEAR_CART' };

interface CartContextType {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  checkout: () => Promise<void>;
}

// ==================== CONTEXT ====================

const CartContext = createContext<CartContextType | null>(null);

// ==================== REDUCER ====================

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + action.payload.quantity }
              : item
          ),
          isOpen: true
        };
      }
      return {
        ...state,
        items: [...state.items, action.payload],
        isOpen: true
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      };

    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: action.payload.quantity }
            : item
        ).filter(item => item.quantity > 0)
      };

    case 'TOGGLE_CART':
      return {
        ...state,
        isOpen: !state.isOpen
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: [],
        isOpen: false
      };

    default:
      return state;
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * ✅ Crear orden directamente en el backend
 * Sin IndexedDB, sin sincronización
 */
async function createOrder(items: { productId: number; quantity: number; price: number }[]): Promise<number> {
  try {
    console.log('📦 Creando orden en el backend...', items);

    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      throw new Error(errorData.message || 'Error al crear la orden');
    }

    const data = await response.json();
    console.log('✅ Orden creada:', data);

    return data.orderId;
  } catch (error) {
    console.error('❌ Error al crear orden:', error);
    throw error;
  }
}

// ==================== PROVIDER ====================

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
  });

  const { notifyPurchase } = useLedNotification();
  const { user, checkSession } = useAuth();

  const checkout = useCallback(async () => {
    try {
      const orderItems = state.items.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      // Calcular total
      const total = state.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // ✅ Crear la orden DIRECTAMENTE en el backend
      const orderId = await createOrder(orderItems);

      // ✅ NUEVO: Si el usuario está autenticado y es cliente, actualizar puntos de lealtad
      if (user && user.role === 'CLIENT') {
        try {
          // Calcular puntos: 1 punto por cada dólar gastado
          const pointsEarned = Math.floor(total);

          console.log(`[Loyalty] Usuario ${user.username} ganó ${pointsEarned} puntos`);

          // Actualizar puntos en el backend
          const response = await fetch(`${API_URL}/users/${user.id}/points`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              points: pointsEarned,
              orderId
            })
          });

          if (response.ok) {
            console.log(`[Loyalty] Puntos actualizados exitosamente`);
            // Actualizar el contexto de autenticación para reflejar los nuevos puntos
            await checkSession();
          } else {
            console.warn('[Loyalty] No se pudieron actualizar los puntos en el servidor');
          }
        } catch (pointsError) {
          console.error('[Loyalty] Error al actualizar puntos:', pointsError);
          // No fallar la compra si hay error con puntos
        }
      }

      // Notificar al sistema LED
      console.log('Notificando sistema LED...');
      const ledSuccess = await notifyPurchase(
        state.items.map(item => ({
          id: item.id,
          quantity: item.quantity
        }))
      );

      if (!ledSuccess) {
        console.log('No se pudo notificar al sistema LED, pero la orden se creó correctamente');
      }

      dispatch({ type: 'CLEAR_CART' });
      
      // Mostrar mensaje con puntos ganados si es cliente
      if (user && user.role === 'CLIENT') {
        const pointsEarned = Math.floor(total);
        alert(`¡Orden #${orderId} creada con éxito!\n¡Ganaste ${pointsEarned} puntos de lealtad!`);
      } else {
        alert(`¡Orden #${orderId} creada con éxito!`);
      }
    } catch (error) {
      console.error('Error en checkout:', error);
      if (error instanceof Error) {
        alert(`Error al procesar la orden: ${error.message}`);
      } else {
        alert('Error al procesar la orden');
      }
    }
  }, [state.items, notifyPurchase, user, checkSession]);

  return (
    <CartContext.Provider value={{ state, dispatch, checkout }}>
      {children}
    </CartContext.Provider>
  );
}

// ==================== CUSTOM HOOK ====================

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser usado dentro de un CartProvider');
  }
  return context;
}

// ==================== EXPORTS ====================

export type { CartItem, CartState, CartAction, CartContextType, Product };
