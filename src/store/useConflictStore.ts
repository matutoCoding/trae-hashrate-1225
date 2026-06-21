import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conflict, Order } from '@/types';
import { mockConflicts } from '@/utils/mockData';
import { checkConflicts } from '@/utils/conflictDetector';
import { useOrderStore } from './useOrderStore';

interface ConflictState {
  conflicts: Conflict[];
  scanConflicts: () => Conflict[];
  resolveConflict: (id: string) => void;
  addConflict: (conflict: Omit<Conflict, 'id'>) => Conflict;
  addConflictsForOrder: (order: Order) => Conflict[];
  removeConflictsForOrder: (orderId: string) => void;
  getActiveConflicts: () => Conflict[];
  getConflictsForOrder: (orderId: string) => Conflict[];
}

const getConflictKey = (c: Conflict) => {
  const ids = [c.orderId1, c.orderId2].sort();
  return `${ids[0]}_${ids[1]}_${c.equipmentId}`;
};

export const useConflictStore = create<ConflictState>()(
  persist(
    (set, get) => ({
      conflicts: mockConflicts,
      scanConflicts: () => {
        const orders = useOrderStore.getState().getActiveOrders();
        const existingConflicts = get().conflicts;

        const existingMap = new Map<string, Conflict>();
        existingConflicts.forEach(c => {
          existingMap.set(getConflictKey(c), c);
        });

        const newConflicts: Conflict[] = [];

        for (let i = 0; i < orders.length; i++) {
          for (let j = i + 1; j < orders.length; j++) {
            const found = checkConflicts(orders[i], [orders[j]]);
            found.forEach(c => {
              const key = getConflictKey(c);
              const existing = existingMap.get(key);
              if (existing) {
                newConflicts.push({ ...c, id: existing.id, status: existing.status });
              } else {
                newConflicts.push(c);
              }
            });
          }
        }

        set({ conflicts: newConflicts });
        return newConflicts;
      },
      resolveConflict: (id) => {
        set(state => ({
          conflicts: state.conflicts.map(c =>
            c.id === id ? { ...c, status: 'resolved' as const } : c
          )
        }));
      },
      addConflict: (conflict) => {
        const newConflict: Conflict = {
          ...conflict,
          id: `conflict-${Date.now()}`
        };
        set(state => ({ conflicts: [...state.conflicts, newConflict] }));
        return newConflict;
      },
      addConflictsForOrder: (order) => {
        const activeOrders = useOrderStore.getState()
          .getActiveOrders()
          .filter(o => o.id !== order.id);
        const found = checkConflicts(order, activeOrders);
        const newConflicts: Conflict[] = [];

        found.forEach(c => {
          const newConflict: Conflict = {
            ...c,
            id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };
          newConflicts.push(newConflict);
        });

        if (newConflicts.length > 0) {
          set(state => ({ conflicts: [...get().conflicts, ...newConflicts] }));
        }

        return newConflicts;
      },
      removeConflictsForOrder: (orderId) => {
        set(state => ({
          conflicts: state.conflicts.filter(c =>
            c.orderId1 !== orderId && c.orderId2 !== orderId
          )
        }));
      },
      getActiveConflicts: () =>
        get().conflicts.filter(c => c.status === 'pending'),
      getConflictsForOrder: (orderId) =>
        get().conflicts.filter(c => c.orderId1 === orderId || c.orderId2 === orderId)
    }),
    {
      name: 'conflict-storage'
    }
  )
);
