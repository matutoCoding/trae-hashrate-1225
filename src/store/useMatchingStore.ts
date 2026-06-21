import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Willingness, BuilderTeam, Order, CustomerPreferences, FitScore } from '@/types';
import { mockWillingness, mockBuilderTeams } from '@/utils/mockData';
import { calculateFitScore, sortBuildersByFitScore } from '@/utils/fitScoreCalculator';

interface MatchingState {
  willingness: Willingness[];
  builderTeams: BuilderTeam[];
  setCustomerWilling: (willingnessId: string, willing: boolean) => void;
  setBuilderWilling: (willingnessId: string, willing: boolean) => void;
  checkMutualMatch: (willingnessId: string) => boolean;
  getWillingnessByOrder: (orderId: string) => Willingness[];
  getWillingnessByBuilder: (builderId: string) => Willingness[];
  getMutualMatches: () => Willingness[];
  getRankedBuilders: (order: Order, preferences?: CustomerPreferences) => (BuilderTeam & { fitScore: FitScore })[];
  calculateFitScore: (order: Order, builder: BuilderTeam, preferences?: CustomerPreferences) => FitScore;
  createWillingness: (orderId: string, customerId: string, builderId: string, fitScore: number) => void;
}

export const useMatchingStore = create<MatchingState>()(
  persist(
    (set, get) => ({
      willingness: mockWillingness,
      builderTeams: mockBuilderTeams,
      setCustomerWilling: (willingnessId, willing) => {
        set(state => ({
          willingness: state.willingness.map(w => {
            if (w.id === willingnessId) {
              const updated = {
                ...w,
                customerWilling: willing,
                updatedAt: new Date().toISOString(),
                mutualMatch: willing === true && w.builderWilling === true
              };
              return updated;
            }
            return w;
          })
        }));
      },
      setBuilderWilling: (willingnessId, willing) => {
        set(state => ({
          willingness: state.willingness.map(w => {
            if (w.id === willingnessId) {
              const updated = {
                ...w,
                builderWilling: willing,
                updatedAt: new Date().toISOString(),
                mutualMatch: w.customerWilling === true && willing === true
              };
              return updated;
            }
            return w;
          })
        }));
      },
      checkMutualMatch: (willingnessId) => {
        const w = get().willingness.find(x => x.id === willingnessId);
        return w ? w.customerWilling === true && w.builderWilling === true : false;
      },
      getWillingnessByOrder: (orderId) => 
        get().willingness.filter(w => w.orderId === orderId),
      getWillingnessByBuilder: (builderId) => 
        get().willingness.filter(w => w.builderId === builderId),
      getMutualMatches: () => 
        get().willingness.filter(w => w.mutualMatch),
      getRankedBuilders: (order, preferences) => 
        sortBuildersByFitScore(get().builderTeams, order, preferences),
      calculateFitScore: (order, builder, preferences) => 
        calculateFitScore(order, builder, preferences),
      createWillingness: (orderId, customerId, builderId, fitScore) => {
        const newWillingness: Willingness = {
          id: `will-${Date.now()}`,
          orderId,
          customerId,
          builderId,
          customerWilling: null,
          builderWilling: null,
          mutualMatch: false,
          fitScore,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        set(state => ({ willingness: [...state.willingness, newWillingness] }));
      }
    }),
    {
      name: 'matching-storage'
    }
  )
);
