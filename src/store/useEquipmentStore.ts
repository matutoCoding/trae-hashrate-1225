import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Equipment } from '@/types';
import { mockEquipment } from '@/utils/mockData';

interface EquipmentState {
  equipment: Equipment[];
  addEquipment: (eq: Omit<Equipment, 'id' | 'createdAt'>) => void;
  updateEquipment: (id: string, updates: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;
  getEquipmentById: (id: string) => Equipment | undefined;
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      equipment: mockEquipment,
      addEquipment: (eq) => {
        const newEq: Equipment = {
          ...eq,
          id: `eq-${Date.now()}`,
          createdAt: new Date().toISOString()
        };
        set(state => ({ equipment: [...state.equipment, newEq] }));
      },
      updateEquipment: (id, updates) => {
        set(state => ({
          equipment: state.equipment.map(eq =>
            eq.id === id ? { ...eq, ...updates } : eq
          )
        }));
      },
      deleteEquipment: (id) => {
        set(state => ({
          equipment: state.equipment.filter(eq => eq.id !== id)
        }));
      },
      getEquipmentById: (id) => get().equipment.find(eq => eq.id === id)
    }),
    {
      name: 'equipment-storage'
    }
  )
);
