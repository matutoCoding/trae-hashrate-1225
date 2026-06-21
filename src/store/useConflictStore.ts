import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conflict, Order } from '@/types';
import { mockConflicts } from '@/utils/mockData';
import { checkConflicts } from '@/utils/conflictDetector';

interface ConflictState {
  conflicts: Conflict[];
  scanConflicts: (orders: Order[]) => Conflict[];
  resolveConflict: (id: string) => void;
  addConflict: (conflict: Omit<Conflict, 'id'>) => void;
  getActiveConflicts: () => Conflict[];
}

export const useConflictStore = create<ConflictState>()(
  persist(
    (set, get) => ({
      conflicts: mockConflicts,
      scanConflicts: (orders) => {
        const allConflicts: Conflict[] = [];
        const activeOrders = orders.filter(o => o.status !== 'cancelled');
        
        for (let i = 0; i < activeOrders.length; i++) {
          for (let j = i + 1; j < activeOrders.length; j++) {
            const conflicts = checkConflicts(activeOrders[i], [activeOrders[j]]);
            allConflicts.push(...conflicts);
          }
        }
        
        set({ conflicts: allConflicts });
        return allConflicts;
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
      },
      getActiveConflicts: () => 
        get().conflicts.filter(c => c.status === 'pending')
    }),
    {
      name: 'conflict-storage'
    }
  )
);
