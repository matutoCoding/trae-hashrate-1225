import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { mockUsers } from '@/utils/mockData';

interface AuthState {
  user: User | null;
  login: (role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (role: string) => {
        const user = mockUsers.find(u => u.role === role);
        if (user) {
          set({ user });
        }
      },
      logout: () => set({ user: null })
    }),
    {
      name: 'auth-storage'
    }
  )
);
