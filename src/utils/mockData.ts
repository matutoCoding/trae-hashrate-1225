import type { Equipment, Order, Conflict, User, BuilderTeam, Willingness, DispatchOrder } from '@/types';
import { addDays } from 'date-fns';

const today = new Date();

export const mockUsers: User[] = [
  {
    id: 'admin-001',
    name: '系统管理员',
    role: 'admin',
    phone: '13800138000',
    email: 'admin@tent.com'
  },
  {
    id: 'customer-001',
    name: '张明',
    role: 'customer',
    phone: '13900139001',
    email: 'zhangming@example.com'
  },
  {
    id: 'customer-002',
    name: '李华',
    role: 'customer',
    phone: '13900139002',
    email: 'lihua@example.com'
  },
  {
    id: 'builder-001',
    name: '王队长',
    role: 'builder',
    phone: '13700137001',
    email: 'wang@example.com'
  },
  {
    id: 'builder-002',
    name: '刘师傅',
    role: 'builder',
    phone: '13700137002',
    email: 'liu@example.com'
  }
];

export const mockEquipment: Equipment[] = [
  {
    id: 'eq-001',
    name: '大型户外帐篷',
    type: 'tent',
    spec: '10m x 15m 铝合金框架',
    quantity: 5,
    status: 'available',
    dailyRate: 1200,
    description: '可容纳150人，适合大型户外活动',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-002',
    name: '中型户外活动帐篷',
    type: 'tent',
    spec: '6m x 10m 钢结构',
    quantity: 10,
    status: 'available',
    dailyRate: 600,
    description: '可容纳80人，适合中型活动',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-003',
    name: '小型遮阳帐篷',
    type: 'tent',
    spec: '3m x 3m 便携式',
    quantity: 20,
    status: 'available',
    dailyRate: 150,
    description: '适合小型聚会、市集摊位',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-004',
    name: '长条宴会桌',
    type: 'table',
    spec: '1.8m x 0.8m 折叠式',
    quantity: 100,
    status: 'available',
    dailyRate: 30,
    description: '可坐8人，实木桌面',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-005',
    name: '大圆桌',
    type: 'table',
    spec: '直径1.8m 10人位',
    quantity: 50,
    status: 'available',
    dailyRate: 50,
    description: '宴会专用，带转盘',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-006',
    name: '宴会椅',
    type: 'chair',
    spec: '铁质框架 绒布坐垫',
    quantity: 500,
    status: 'available',
    dailyRate: 8,
    description: '舒适耐用，多种颜色可选',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-007',
    name: '竹节椅',
    type: 'chair',
    spec: '仿竹设计 可堆叠',
    quantity: 300,
    status: 'available',
    dailyRate: 15,
    description: '高端婚礼、宴会专用',
    createdAt: '2026-01-15T00:00:00.000Z'
  },
  {
    id: 'eq-008',
    name: '签到台',
    type: 'other',
    spec: '2m x 0.6m 带灯',
    quantity: 10,
    status: 'available',
    dailyRate: 100,
    description: '活动入口签到专用',
    createdAt: '2026-01-15T00:00:00.000Z'
  }
];

export const mockOrders: Order[] = [
  {
    id: 'order-001',
    orderNo: 'T20260620001',
    customerId: 'customer-001',
    customerName: '张明',
    equipmentIds: ['eq-001', 'eq-004', 'eq-006'],
    startDate: addDays(today, 2).toISOString(),
    endDate: addDays(today, 4).toISOString(),
    status: 'confirmed',
    totalAmount: 5850,
    createdAt: '2026-06-15T10:30:00.000Z',
    address: '北京市朝阳区体育场',
    eventName: '公司周年庆典'
  },
  {
    id: 'order-002',
    orderNo: 'T20260620002',
    customerId: 'customer-002',
    customerName: '李华',
    equipmentIds: ['eq-002', 'eq-005', 'eq-007'],
    startDate: addDays(today, 5).toISOString(),
    endDate: addDays(today, 7).toISOString(),
    status: 'pending',
    totalAmount: 4950,
    createdAt: '2026-06-18T14:20:00.000Z',
    address: '北京市海淀区会展中心',
    eventName: '婚礼宴会'
  },
  {
    id: 'order-003',
    orderNo: 'T20260620003',
    customerId: 'customer-001',
    customerName: '张明',
    equipmentIds: ['eq-001', 'eq-004', 'eq-006'],
    startDate: addDays(today, 3).toISOString(),
    endDate: addDays(today, 5).toISOString(),
    status: 'pending',
    totalAmount: 5850,
    createdAt: '2026-06-19T09:15:00.000Z',
    conflictFlag: true,
    address: '北京市朝阳区公园',
    eventName: '新品发布会'
  },
  {
    id: 'order-004',
    orderNo: 'T20260620004',
    customerId: 'customer-002',
    customerName: '李华',
    equipmentIds: ['eq-003', 'eq-004'],
    startDate: addDays(today, -2).toISOString(),
    endDate: addDays(today, 1).toISOString(),
    status: 'completed',
    totalAmount: 1050,
    createdAt: '2026-06-10T16:45:00.000Z',
    address: '北京市东城区商场广场',
    eventName: '品牌推广活动'
  },
  {
    id: 'order-005',
    orderNo: 'T20260620005',
    customerId: 'customer-001',
    customerName: '张明',
    equipmentIds: ['eq-002', 'eq-005', 'eq-006'],
    startDate: addDays(today, 10).toISOString(),
    endDate: addDays(today, 12).toISOString(),
    status: 'matched',
    totalAmount: 4200,
    createdAt: '2026-06-12T11:00:00.000Z',
    address: '北京市顺义区度假村',
    eventName: '企业团建'
  },
  {
    id: 'order-006',
    orderNo: 'T20260620006',
    customerId: 'customer-002',
    customerName: '李华',
    equipmentIds: ['eq-001', 'eq-002'],
    startDate: addDays(today, 15).toISOString(),
    endDate: addDays(today, 18).toISOString(),
    status: 'pending',
    totalAmount: 6600,
    createdAt: '2026-06-18T08:30:00.000Z',
    address: '北京市丰台区博览馆',
    eventName: '行业展会'
  }
];

export const mockConflicts: Conflict[] = [
  {
    id: 'conflict-001',
    orderId1: 'order-001',
    orderId2: 'order-003',
    equipmentId: 'eq-001',
    overlapStart: addDays(today, 3).toISOString(),
    overlapEnd: addDays(today, 4).toISOString(),
    severity: 'high',
    status: 'pending'
  }
];

export const mockBuilderTeams: BuilderTeam[] = [
  {
    id: 'builder-001',
    name: '金牌搭建队',
    leaderName: '王队长',
    phone: '13700137001',
    teamSize: 8,
    experience: 8,
    rating: 4.9,
    priceLevel: 'premium',
    availability: [
      addDays(today, 1).toISOString(),
      addDays(today, 2).toISOString(),
      addDays(today, 3).toISOString(),
      addDays(today, 5).toISOString(),
      addDays(today, 10).toISOString()
    ],
    skills: ['大型帐篷', '婚礼布置', '展览搭建', '灯光音响'],
    completedOrders: 156,
    description: '专业搭建团队，8年行业经验，服务过众多大型活动'
  },
  {
    id: 'builder-002',
    name: '速搭施工队',
    leaderName: '刘师傅',
    phone: '13700137002',
    teamSize: 5,
    experience: 5,
    rating: 4.6,
    priceLevel: 'standard',
    availability: [
      addDays(today, 2).toISOString(),
      addDays(today, 3).toISOString(),
      addDays(today, 4).toISOString(),
      addDays(today, 6).toISOString(),
      addDays(today, 7).toISOString()
    ],
    skills: ['中型帐篷', '快速搭建', '桌椅布置'],
    completedOrders: 89,
    description: '高效快速，价格实惠，适合中小型活动'
  },
  {
    id: 'builder-003',
    name: '便民搭建组',
    leaderName: '陈工',
    phone: '13700137003',
    teamSize: 3,
    experience: 3,
    rating: 4.3,
    priceLevel: 'economy',
    availability: [
      addDays(today, 1).toISOString(),
      addDays(today, 2).toISOString(),
      addDays(today, 4).toISOString(),
      addDays(today, 5).toISOString()
    ],
    skills: ['小型帐篷', '简易搭建', '市集布置'],
    completedOrders: 45,
    description: '性价比高，灵活应变，适合小型活动'
  },
  {
    id: 'builder-004',
    name: '精英策划团队',
    leaderName: '赵总监',
    phone: '13700137004',
    teamSize: 12,
    experience: 12,
    rating: 5.0,
    priceLevel: 'premium',
    availability: [
      addDays(today, 5).toISOString(),
      addDays(today, 6).toISOString(),
      addDays(today, 10).toISOString(),
      addDays(today, 15).toISOString()
    ],
    skills: ['大型帐篷', '高端婚礼', '企业活动', '舞台搭建', '特效设计'],
    completedOrders: 280,
    description: '一站式活动策划搭建，12年行业领先'
  },
  {
    id: 'builder-005',
    name: '鑫源施工队',
    leaderName: '孙队长',
    phone: '13700137005',
    teamSize: 6,
    experience: 6,
    rating: 4.7,
    priceLevel: 'standard',
    availability: [
      addDays(today, 1).toISOString(),
      addDays(today, 3).toISOString(),
      addDays(today, 7).toISOString(),
      addDays(today, 8).toISOString(),
      addDays(today, 12).toISOString()
    ],
    skills: ['中型帐篷', '展览布置', '会议搭建'],
    completedOrders: 112,
    description: '品质保障，服务周到，经验丰富'
  }
];

export const mockWillingness: Willingness[] = [
  {
    id: 'will-001',
    orderId: 'order-001',
    customerId: 'customer-001',
    builderId: 'builder-001',
    customerWilling: true,
    builderWilling: true,
    mutualMatch: true,
    fitScore: 92,
    createdAt: '2026-06-16T09:00:00.000Z',
    updatedAt: '2026-06-17T10:30:00.000Z'
  },
  {
    id: 'will-002',
    orderId: 'order-001',
    customerId: 'customer-001',
    builderId: 'builder-002',
    customerWilling: false,
    builderWilling: true,
    mutualMatch: false,
    fitScore: 78,
    createdAt: '2026-06-16T09:05:00.000Z',
    updatedAt: '2026-06-16T14:20:00.000Z'
  },
  {
    id: 'will-003',
    orderId: 'order-002',
    customerId: 'customer-002',
    builderId: 'builder-001',
    customerWilling: null,
    builderWilling: true,
    mutualMatch: false,
    fitScore: 85,
    createdAt: '2026-06-18T15:00:00.000Z',
    updatedAt: '2026-06-18T15:00:00.000Z'
  },
  {
    id: 'will-004',
    orderId: 'order-002',
    customerId: 'customer-002',
    builderId: 'builder-004',
    customerWilling: true,
    builderWilling: null,
    mutualMatch: false,
    fitScore: 95,
    createdAt: '2026-06-18T15:10:00.000Z',
    updatedAt: '2026-06-19T08:45:00.000Z'
  },
  {
    id: 'will-005',
    orderId: 'order-002',
    customerId: 'customer-002',
    builderId: 'builder-005',
    customerWilling: null,
    builderWilling: true,
    mutualMatch: false,
    fitScore: 72,
    createdAt: '2026-06-18T15:15:00.000Z',
    updatedAt: '2026-06-18T15:15:00.000Z'
  },
  {
    id: 'will-006',
    orderId: 'order-005',
    customerId: 'customer-001',
    builderId: 'builder-001',
    customerWilling: true,
    builderWilling: true,
    mutualMatch: true,
    fitScore: 88,
    createdAt: '2026-06-13T10:00:00.000Z',
    updatedAt: '2026-06-14T09:30:00.000Z'
  }
];

export const mockDispatchOrders: DispatchOrder[] = [
  {
    id: 'dispatch-001',
    orderId: 'order-004',
    builderId: 'builder-002',
    builderName: '速搭施工队',
    type: 'setup',
    scheduledTime: addDays(today, -2).toISOString(),
    address: '北京市东城区商场广场',
    status: 'completed',
    startedAt: addDays(today, -2).toISOString(),
    completedAt: addDays(today, -2).toISOString()
  },
  {
    id: 'dispatch-002',
    orderId: 'order-004',
    builderId: 'builder-002',
    builderName: '速搭施工队',
    type: 'teardown',
    scheduledTime: addDays(today, 1).toISOString(),
    address: '北京市东城区商场广场',
    status: 'pending'
  },
  {
    id: 'dispatch-003',
    orderId: 'order-001',
    builderId: 'builder-001',
    builderName: '金牌搭建队',
    type: 'setup',
    scheduledTime: addDays(today, 2).toISOString(),
    address: '北京市朝阳区体育场',
    status: 'pending'
  },
  {
    id: 'dispatch-004',
    orderId: 'order-001',
    builderId: 'builder-001',
    builderName: '金牌搭建队',
    type: 'teardown',
    scheduledTime: addDays(today, 4).toISOString(),
    address: '北京市朝阳区体育场',
    status: 'pending'
  }
];

export function getMockUserByRole(role: string): User | undefined {
  return mockUsers.find(u => u.role === role);
}
