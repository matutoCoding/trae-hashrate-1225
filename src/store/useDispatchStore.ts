import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DispatchOrder } from '@/types';
import { mockDispatchOrders } from '@/utils/mockData';

interface DispatchState {
  dispatchOrders: DispatchOrder[];
  createDispatchOrder: (order: Omit<DispatchOrder, 'id'>) => void;
  updateDispatchOrder: (id: string, updates: Partial<DispatchOrder>) => void;
  startDispatch: (id: string) => void;
  completeDispatch: (id: string) => void;
  getDispatchByOrder: (orderId: string) => DispatchOrder[];
  getDispatchByBuilder: (builderId: string) => DispatchOrder[];
  getPendingDispatches: () => DispatchOrder[];
}

export const useDispatchStore = create<DispatchState>()(
  persist(
    (set, get) => ({
      dispatchOrders: mockDispatchOrders,
      createDispatchOrder: (order) => {
        const newOrder: DispatchOrder = {
          ...order,
          id: `dispatch-${Date.now()}`
        };
        set(state => ({ dispatchOrders: [...state.dispatchOrders, newOrder] }));
      },
      updateDispatchOrder: (id, updates) => {
        set(state => ({
          dispatchOrders: state.dispatchOrders.map(d =>
            d.id === id ? { ...d, ...updates } : d
          )
        }));
      },
      startDispatch: (id) => {
        set(state => ({
          dispatchOrders: state.dispatchOrders.map(d =>
            d.id === id ? { 
              ...d, 
              status: 'in_progress' as const, 
              startedAt: new Date().toISOString() 
            } : d
          )
        }));
      },
      completeDispatch: (id) => {
        set(state => ({
          dispatchOrders: state.dispatchOrders.map(d =>
            d.id === id ? { 
              ...d, 
              status: 'completed' as const, 
              completedAt: new Date().toISOString() 
            } : d
          )
        }));
      },
      getDispatchByOrder: (orderId) => 
        get().dispatchOrders.filter(d => d.orderId === orderId),
      getDispatchByBuilder: (builderId) => 
        get().dispatchOrders.filter(d => d.builderId === builderId),
      getPendingDispatches: () => 
        get().dispatchOrders.filter(d => d.status === 'pending')
    }),
    {
      name: 'dispatch-storage'
    }
  )
);
