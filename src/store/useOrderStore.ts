import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '@/types';
import { mockOrders } from '@/utils/mockData';

interface OrderState {
  orders: Order[];
  addOrder: (order: Omit<Order, 'id' | 'orderNo' | 'createdAt'>) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByCustomer: (customerId: string) => Order[];
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: mockOrders,
      addOrder: (order) => {
        const newOrder: Order = {
          ...order,
          id: `order-${Date.now()}`,
          orderNo: `T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(get().orders.length + 1).padStart(3, '0')}`,
          createdAt: new Date().toISOString()
        };
        set(state => ({ orders: [...state.orders, newOrder] }));
      },
      updateOrder: (id, updates) => {
        set(state => ({
          orders: state.orders.map(o =>
            o.id === id ? { ...o, ...updates } : o
          )
        }));
      },
      cancelOrder: (id) => {
        set(state => ({
          orders: state.orders.map(o =>
            o.id === id ? { ...o, status: 'cancelled' as const } : o
          )
        }));
      },
      getOrderById: (id) => get().orders.find(o => o.id === id),
      getOrdersByCustomer: (customerId) => 
        get().orders.filter(o => o.customerId === customerId)
    }),
    {
      name: 'order-storage'
    }
  )
);
