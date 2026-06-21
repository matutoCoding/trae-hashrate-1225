import type { Order, Conflict } from '@/types';

export function isOverlap(
  start1: Date, end1: Date, 
  start2: Date, end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}

export function checkConflicts(
  newOrder: Order, 
  existingOrders: Order[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  for (const equipmentId of newOrder.equipmentIds) {
    const relevantOrders = existingOrders.filter(o => 
      o.equipmentIds.includes(equipmentId) && 
      o.status !== 'cancelled' &&
      o.id !== newOrder.id
    );
    
    for (const existing of relevantOrders) {
      if (isOverlap(
        new Date(newOrder.startDate), new Date(newOrder.endDate),
        new Date(existing.startDate), new Date(existing.endDate)
      )) {
        const overlapStart = new Date(
          Math.max(new Date(newOrder.startDate).getTime(), 
                   new Date(existing.startDate).getTime())
        ).toISOString();
        const overlapEnd = new Date(
          Math.min(new Date(newOrder.endDate).getTime(), 
                   new Date(existing.endDate).getTime())
        ).toISOString();
        
        const overlapDays = Math.ceil(
          (new Date(overlapEnd).getTime() - new Date(overlapStart).getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        
        let severity: 'high' | 'medium' | 'low' = 'medium';
        if (overlapDays >= 3) severity = 'high';
        else if (overlapDays <= 1) severity = 'low';
        
        conflicts.push({
          id: `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          orderId1: newOrder.id,
          orderId2: existing.id,
          equipmentId,
          overlapStart,
          overlapEnd,
          severity,
          status: 'pending'
        });
      }
    }
  }
  
  return conflicts;
}

export function findAlternativeSlots(
  equipmentId: string,
  desiredStart: Date,
  desiredEnd: Date,
  existingOrders: Order[],
  equipmentIds: string[]
): { startDate: string; endDate: string }[] {
  const alternatives: { startDate: string; endDate: string }[] = [];
  const desiredDays = Math.ceil(
    (desiredEnd.getTime() - desiredStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  for (let offset = -7; offset <= 7; offset++) {
    if (offset === 0) continue;
    
    const testStart = new Date(desiredStart);
    testStart.setDate(testStart.getDate() + offset);
    const testEnd = new Date(testStart);
    testEnd.setDate(testEnd.getDate() + desiredDays);
    
    const testOrder: Order = {
      id: 'test',
      orderNo: 'TEST',
      customerId: '',
      customerName: '',
      equipmentIds,
      startDate: testStart.toISOString(),
      endDate: testEnd.toISOString(),
      status: 'pending',
      totalAmount: 0,
      createdAt: ''
    };
    
    const conflicts = checkConflicts(testOrder, existingOrders);
    
    if (conflicts.length === 0) {
      alternatives.push({
        startDate: testStart.toISOString(),
        endDate: testEnd.toISOString()
      });
    }
    
    if (alternatives.length >= 3) break;
  }
  
  return alternatives;
}
