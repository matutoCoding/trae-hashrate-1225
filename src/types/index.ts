export interface Equipment {
  id: string;
  name: string;
  type: 'tent' | 'table' | 'chair' | 'other';
  spec: string;
  quantity: number;
  status: 'available' | 'occupied' | 'maintenance';
  dailyRate: number;
  description: string;
  createdAt: string;
}

export interface TimeSlot {
  id: string;
  equipmentId: string;
  orderId: string | null;
  startDate: string;
  endDate: string;
  status: 'available' | 'occupied' | 'blocked';
}

export interface Order {
  id: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  equipmentIds: string[];
  startDate: string;
  endDate: string;
  status: 'pending' | 'confirmed' | 'matched' | 'dispatched' | 'completed' | 'cancelled';
  totalAmount: number;
  createdAt: string;
  conflictFlag?: boolean;
  address?: string;
  eventName?: string;
}

export interface Conflict {
  id: string;
  orderId1: string;
  orderId2: string;
  equipmentId: string;
  overlapStart: string;
  overlapEnd: string;
  severity: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved';
}

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'customer' | 'builder';
  phone: string;
  email: string;
  avatar?: string;
}

export interface BuilderTeam {
  id: string;
  name: string;
  leaderName: string;
  phone: string;
  teamSize: number;
  experience: number;
  rating: number;
  priceLevel: 'economy' | 'standard' | 'premium';
  availability: string[];
  skills: string[];
  completedOrders: number;
  description?: string;
}

export interface Willingness {
  id: string;
  orderId: string;
  customerId: string;
  builderId: string;
  customerWilling: boolean | null;
  builderWilling: boolean | null;
  mutualMatch: boolean;
  fitScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface FitScore {
  priceFit: number;
  timeFit: number;
  experienceFit: number;
  skillFit: number;
  ratingFit: number;
  totalScore: number;
}

export interface CustomerPreferences {
  preferredPriceLevel?: string;
  minRating?: number;
  requiredSkills?: string[];
}

export interface DispatchOrder {
  id: string;
  orderId: string;
  builderId: string;
  builderName: string;
  type: 'setup' | 'teardown';
  scheduledTime: string;
  address: string;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface StatsData {
  totalOrders: number;
  pendingOrders: number;
  activeConflicts: number;
  matchedToday: number;
  revenue: number;
  dispatchPending: number;
}
