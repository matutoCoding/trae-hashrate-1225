import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  startOfDay,
  parseISO,
  differenceInDays,
  getHours,
  setHours,
  setMinutes,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Package,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useOrderStore } from '@/store/useOrderStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { useConflictStore } from '@/store/useConflictStore';
import { checkConflicts, findAlternativeSlots } from '@/utils/conflictDetector';
import { formatDate, formatDateRange, getStatusText, getStatusColor, isDateInRange, getDaysBetween } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Order, Conflict } from '@/types';
import { useNavigate } from 'react-router-dom';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function Calendar() {
  const navigate = useNavigate();
  const { orders, addOrder, getActiveOrders } = useOrderStore();
  const { equipment } = useEquipmentStore();
  const { addConflictsForOrder } = useConflictStore();

  const [createConflicts, setCreateConflicts] = useState<Conflict[]>([]);
  const [createAlternatives, setCreateAlternatives] = useState<{ startDate: string; endDate: string }[]>([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    startDate: Date | null;
    endDate: Date | null;
    startHour: number;
    endHour: number;
  }>({
    isDragging: false,
    startDate: null,
    endDate: null,
    startHour: 9,
    endHour: 18,
  });

  const [formData, setFormData] = useState({
    customerName: '',
    customerId: '',
    eventName: '',
    address: '',
    equipmentIds: [] as string[],
    startTime: '09:00',
    endTime: '18:00',
  });

  const calendarRef = useRef<HTMLDivElement>(null);

  const activeOrders = useMemo(() => {
    return orders.filter(o => o.status !== 'cancelled');
  }, [orders]);

  const filteredOrders = useMemo(() => {
    if (selectedEquipmentIds.length === 0) return activeOrders;
    return activeOrders.filter(o =>
      o.equipmentIds.some(eqId => selectedEquipmentIds.includes(eqId))
    );
  }, [activeOrders, selectedEquipmentIds]);

  const conflictDates = useMemo(() => {
    const conflicts = new Set<string>();
    const ordersToCheck = selectedEquipmentIds.length === 0 ? activeOrders : filteredOrders;

    for (let i = 0; i < ordersToCheck.length; i++) {
      for (let j = i + 1; j < ordersToCheck.length; j++) {
        const order1 = ordersToCheck[i];
        const order2 = ordersToCheck[j];
        const sharedEquipment = order1.equipmentIds.filter(id =>
          order2.equipmentIds.includes(id)
        );
        if (sharedEquipment.length > 0) {
          const testOrder: Order = {
            ...order1,
            equipmentIds: sharedEquipment,
          };
          const foundConflicts = checkConflicts(testOrder, [order2]);
          if (foundConflicts.length > 0) {
            foundConflicts.forEach(c => {
              const start = startOfDay(parseISO(c.overlapStart));
              const end = startOfDay(parseISO(c.overlapEnd));
              let current = start;
              while (current <= end) {
                conflicts.add(format(current, 'yyyy-MM-dd'));
                current = addDays(current, 1);
              }
            });
          }
        }
      }
    }
    return conflicts;
  }, [activeOrders, filteredOrders, selectedEquipmentIds]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { locale: zhCN });
    const calEnd = endOfWeek(monthEnd, { locale: zhCN });

    const days: Date[] = [];
    let current = calStart;
    while (current <= calEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [currentMonth]);

  const getOrdersForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return filteredOrders.filter(o =>
        isDateInRange(dateStr, o.startDate, o.endDate)
      );
    },
    [filteredOrders]
  );

  const getEquipmentForDate = useCallback(
    (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOrders = filteredOrders.filter(o =>
        isDateInRange(dateStr, o.startDate, o.endDate)
      );
      const usedEquipmentIds = new Set(dayOrders.flatMap(o => o.equipmentIds));
      return equipment.filter(eq => usedEquipmentIds.has(eq.id));
    },
    [filteredOrders, equipment]
  );

  const hasConflict = useCallback(
    (date: Date) => {
      return conflictDates.has(format(date, 'yyyy-MM-dd'));
    },
    [conflictDates]
  );

  const handleDateClick = (date: Date) => {
    if (dragState.isDragging) return;
    setSelectedDate(date);
    setIsDayModalOpen(true);
  };

  const handleMouseDown = (date: Date, hour: number) => {
    setDragState({
      isDragging: true,
      startDate: date,
      endDate: date,
      startHour: hour,
      endHour: hour,
    });
  };

  const handleMouseEnter = (date: Date, hour: number) => {
    if (!dragState.isDragging || !dragState.startDate) return;

    const startDateTime = setMinutes(
      setHours(dragState.startDate, dragState.startHour),
      0
    );
    const currentDateTime = setMinutes(setHours(date, hour), 0);

    if (currentDateTime >= startDateTime) {
      setDragState(prev => ({
        ...prev,
        endDate: date,
        endHour: hour,
      }));
    } else {
      setDragState(prev => ({
        ...prev,
        startDate: date,
        startHour: hour,
      }));
    }
  };

  const handleMouseUp = () => {
    if (
      dragState.isDragging &&
      dragState.startDate &&
      dragState.endDate
    ) {
      const startTime = `${String(dragState.startHour).padStart(2, '0')}:00`;
      const endTime = `${String(Math.min(dragState.endHour + 1, 23)).padStart(2, '0')}:00`;
      const equipmentIds = [...selectedEquipmentIds];

      setFormData(prev => ({
        ...prev,
        startTime,
        endTime,
        equipmentIds,
      }));
      setIsCreateModalOpen(true);

      if (equipmentIds.length > 0 && dragState.startDate && dragState.endDate) {
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        const startDate = setMinutes(setHours(dragState.startDate, startHour), startMin).toISOString();
        const endDate = setMinutes(setHours(dragState.endDate, endHour), endMin).toISOString();
        setTimeout(() => checkCreateConflicts(equipmentIds, startDate, endDate), 0);
      }
    }
    setDragState({
      isDragging: false,
      startDate: null,
      endDate: null,
      startHour: 9,
      endHour: 18,
    });
  };

  const isInDragRange = (date: Date, hour: number) => {
    if (
      !dragState.isDragging ||
      !dragState.startDate ||
      !dragState.endDate
    )
      return false;

    const startDateTime = setMinutes(
      setHours(dragState.startDate, dragState.startHour),
      0
    );
    const endDateTime = setMinutes(
      setHours(dragState.endDate, dragState.endHour + 1),
      0
    );
    const currentDateTime = setMinutes(setHours(date, hour), 0);
    const nextHour = setMinutes(setHours(date, hour + 1), 0);

    return currentDateTime >= startDateTime && nextHour <= endDateTime;
  };

  const checkCreateConflicts = (equipmentIds: string[], startDate: string, endDate: string) => {
    if (equipmentIds.length === 0 || !startDate || !endDate) {
      setCreateConflicts([]);
      setCreateAlternatives([]);
      return;
    }

    const testOrder: Order = {
      id: 'temp-calendar',
      orderNo: 'TEMP',
      customerId: '',
      customerName: '',
      equipmentIds,
      startDate,
      endDate,
      status: 'pending',
      totalAmount: 0,
      createdAt: ''
    };

    const activeOrders = getActiveOrders();
    const conflicts = checkConflicts(testOrder, activeOrders);
    setCreateConflicts(conflicts);

    if (conflicts.length > 0 && equipmentIds.length > 0) {
      const alternatives = findAlternativeSlots(
        equipmentIds[0],
        new Date(startDate),
        new Date(endDate),
        activeOrders,
        equipmentIds
      );
      setCreateAlternatives(alternatives);
    } else {
      setCreateAlternatives([]);
    }
  };

  const handleSelectAlternativeSlot = (slot: { startDate: string; endDate: string }) => {
    const start = new Date(slot.startDate);
    const end = new Date(slot.endDate);
    const [startHour] = formData.startTime.split(':').map(Number);
    const [endHour] = formData.endTime.split(':').map(Number);

    setDragState(prev => ({
      ...prev,
      startDate: start,
      endDate: end
    }));

    const newStart = setHours(start, startHour).toISOString();
    const newEnd = setHours(end, endHour).toISOString();
    checkCreateConflicts(formData.equipmentIds, newStart, newEnd);
  };

  const handleCreateOrder = () => {
    if (
      !dragState.startDate ||
      !dragState.endDate ||
      formData.equipmentIds.length === 0
    )
      return;

    const [startHour, startMin] = formData.startTime.split(':').map(Number);
    const [endHour, endMin] = formData.endTime.split(':').map(Number);

    const startDate = setMinutes(
      setHours(dragState.startDate, startHour),
      startMin
    ).toISOString();
    const endDate = setMinutes(
      setHours(dragState.endDate, endHour),
      endMin
    ).toISOString();

    const testOrder: Order = {
      id: 'temp-create',
      orderNo: 'TEMP',
      customerId: '',
      customerName: '',
      equipmentIds: formData.equipmentIds,
      startDate,
      endDate,
      status: 'pending',
      totalAmount: 0,
      createdAt: ''
    };
    const activeOrders = getActiveOrders();
    const conflicts = checkConflicts(testOrder, activeOrders);

    if (conflicts.length > 0) {
      if (!confirm(`检测到 ${conflicts.length} 个时段冲突，确定要继续创建吗？创建后将生成冲突记录，请及时处理。`)) {
        return;
      }
    }

    const days = differenceInDays(dragState.endDate, dragState.startDate) + 1;
    const totalAmount = formData.equipmentIds.reduce((sum, eqId) => {
      const eq = equipment.find(e => e.id === eqId);
      return sum + (eq ? eq.dailyRate * days : 0);
    }, 0);

    const newOrderData = {
      customerId: formData.customerId || `customer-${Date.now()}`,
      customerName: formData.customerName,
      equipmentIds: formData.equipmentIds,
      startDate,
      endDate,
      status: 'pending' as const,
      totalAmount,
      eventName: formData.eventName,
      address: formData.address,
      conflictFlag: conflicts.length > 0
    };

    const newOrder = addOrder(newOrderData);

    if (conflicts.length > 0) {
      addConflictsForOrder(newOrder);
    }

    setIsCreateModalOpen(false);
    setFormData({
      customerName: '',
      customerId: '',
      eventName: '',
      address: '',
      equipmentIds: [],
      startTime: '09:00',
      endTime: '18:00',
    });
    setCreateConflicts([]);
    setCreateAlternatives([]);

    if (conflicts.length > 0) {
      setTimeout(() => {
        if (confirm('订单创建成功，但存在时段冲突，是否立即前往处理？')) {
          navigate('/conflicts');
        }
      }, 100);
    }
  };

  const toggleEquipmentFilter = (eqId: string) => {
    setSelectedEquipmentIds(prev =>
      prev.includes(eqId) ? prev.filter(id => id !== eqId) : [...prev, eqId]
    );
  };

  const toggleEquipmentSelection = (eqId: string) => {
    setFormData(prev => {
      const newEquipmentIds = prev.equipmentIds.includes(eqId)
        ? prev.equipmentIds.filter(id => id !== eqId)
        : [...prev.equipmentIds, eqId];

      if (dragState.startDate && dragState.endDate) {
        const [startHour, startMin] = prev.startTime.split(':').map(Number);
        const [endHour, endMin] = prev.endTime.split(':').map(Number);
        const startDate = setMinutes(setHours(dragState.startDate, startHour), startMin).toISOString();
        const endDate = setMinutes(setHours(dragState.endDate, endHour), endMin).toISOString();
        setTimeout(() => checkCreateConflicts(newEquipmentIds, startDate, endDate), 0);
      }

      return {
        ...prev,
        equipmentIds: newEquipmentIds,
      };
    });
  };

  return (
    <div
      className="space-y-6 animate-in fade-in duration-500"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <PageHeader
        title="排期日历"
        description="查看设备占用情况，管理订单排期"
        actions={
          <Button
            onClick={() => {
              setDragState({
                isDragging: false,
                startDate: startOfDay(new Date()),
                endDate: startOfDay(new Date()),
                startHour: 9,
                endHour: 18,
              });
              setIsCreateModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            新建订单
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">设备筛选：</span>
        <Button
          variant={selectedEquipmentIds.length === 0 ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setSelectedEquipmentIds([])}
        >
          全部
        </Button>
        {equipment.map(eq => (
          <Button
            key={eq.id}
            variant={selectedEquipmentIds.includes(eq.id) ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => toggleEquipmentFilter(eq.id)}
          >
            {eq.name}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
              >
                今天
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-gray-600">冲突</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-gray-600">已占用</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-gray-600">今日</span>
              </div>
            </div>
          </div>

          <div ref={calendarRef} className="select-none">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-500 py-2"
                >
                  周{day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                const dayOrders = getOrdersForDate(date);
                const dayEquipment = getEquipmentForDate(date);
                const hasConflictOnDay = hasConflict(date);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                const isTodayDate = isToday(date);
                const isDragStart =
                  dragState.startDate && isSameDay(date, dragState.startDate);
                const isDragEnd =
                  dragState.endDate && isSameDay(date, dragState.endDate);

                return (
                  <div
                    key={idx}
                    className={cn(
                      'min-h-32 p-2 border rounded-lg transition-all duration-200 cursor-pointer',
                      'hover:border-blue-400 hover:shadow-md',
                      isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                      isTodayDate && 'border-emerald-500 border-2',
                      hasConflictOnDay && 'border-red-500 border-2 bg-red-50',
                      !hasConflictOnDay &&
                        dayOrders.length > 0 &&
                        'border-blue-300 bg-blue-50/50',
                      isDragStart && 'ring-2 ring-blue-500',
                      isDragEnd && 'ring-2 ring-blue-500'
                    )}
                    onClick={() => handleDateClick(date)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                          isTodayDate && 'text-emerald-600 font-bold',
                          hasConflictOnDay && 'text-red-600'
                        )}
                      >
                        {format(date, 'd')}
                      </span>
                      {hasConflictOnDay && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayEquipment.slice(0, 3).map(eq => (
                        <div
                          key={eq.id}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 truncate"
                        >
                          {eq.name}
                        </div>
                      ))}
                      {dayEquipment.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayEquipment.length - 3} 更多
                        </div>
                      )}
                    </div>

                    {dayOrders.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        {dayOrders.length} 个订单
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-3">
              时段视图（拖拽选择创建订单）
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-8 gap-1 mb-2">
                  <div className="text-center text-sm font-medium text-gray-500 py-2">
                    时间
                  </div>
                  {calendarDays.slice(0, 7).map((date, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'text-center text-sm font-medium py-2',
                        isToday(date) && 'text-emerald-600 font-bold',
                        hasConflict(date) && 'text-red-600'
                      )}
                    >
                      {format(date, 'MM/dd', { locale: zhCN })}
                      <div className="text-xs text-gray-400">
                        {format(date, 'EEE', { locale: zhCN })}
                      </div>
                    </div>
                  ))}
                </div>

                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-1 mb-0.5">
                    <div className="text-center text-xs text-gray-500 py-2 pr-2">
                      {String(hour).padStart(2, '0')}:00
                    </div>
                    {calendarDays.slice(0, 7).map((date, idx) => {
                      const isDrag = isInDragRange(date, hour);
                      const dayOrders = getOrdersForDate(date);
                      const hasOrder = dayOrders.some(o => {
                        const startHour = getHours(parseISO(o.startDate));
                        const endHour = getHours(parseISO(o.endDate));
                        return hour >= startHour && hour < endHour;
                      });
                      const conflict = hasConflict(date);

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'h-8 rounded cursor-pointer transition-all duration-150',
                            'border border-gray-100',
                            isDrag && 'bg-blue-500/30 border-blue-500',
                            !isDrag && hasOrder && conflict && 'bg-red-200',
                            !isDrag && hasOrder && !conflict && 'bg-blue-200',
                            !isDrag &&
                              !hasOrder &&
                              'bg-gray-50 hover:bg-blue-50'
                          )}
                          onMouseDown={() => handleMouseDown(date, hour)}
                          onMouseEnter={() => handleMouseEnter(date, hour)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={
          selectedDate
            ? `${formatDate(selectedDate)} 的订单详情`
            : '当日订单'
        }
      >
        <div className="p-6">
          {selectedDate && getOrdersForDate(selectedDate).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>当天暂无订单</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedDate &&
                getOrdersForDate(selectedDate).map(order => {
                  const testOrder: Order = {
                    ...order,
                    equipmentIds:
                      selectedEquipmentIds.length > 0
                        ? order.equipmentIds.filter(id =>
                            selectedEquipmentIds.includes(id)
                          )
                        : order.equipmentIds,
                  };
                  const conflicts = checkConflicts(testOrder, activeOrders);

                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {order.orderNo}
                              {order.eventName && ` - ${order.eventName}`}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                              <User className="w-4 h-4" />
                              {order.customerName}
                            </div>
                          </div>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusText(order.status)}
                          </Badge>
                        </div>

                        {conflicts.length > 0 && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
                              <AlertTriangle className="w-4 h-4" />
                              检测到 {conflicts.length} 个冲突
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            {formatDate(order.startDate)} ~{' '}
                            {formatDate(order.endDate)}
                          </div>
                          {order.address && (
                            <div className="text-gray-600">
                              📍 {order.address}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-500" />
                            <div className="flex flex-wrap gap-1">
                              {order.equipmentIds.map(eqId => {
                                const eq = equipment.find(
                                  e => e.id === eqId
                                );
                                return eq ? (
                                  <Badge
                                    key={eqId}
                                    className="text-xs border border-gray-200 bg-white"
                                  >
                                    {eq.name}
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                          <div className="text-right font-semibold text-blue-700">
                            ¥{order.totalAmount.toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
          <div className="flex justify-end mt-6">
            <Button onClick={() => setIsDayModalOpen(false)}>关闭</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormData({
            customerName: '',
            customerId: '',
            eventName: '',
            address: '',
            equipmentIds: [],
            startTime: '09:00',
            endTime: '18:00',
          });
        }}
        title="创建新订单"
      >
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="客户姓名"
              value={formData.customerName}
              onChange={e =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="请输入客户姓名"
            />
            <Input
              label="客户ID(可选)"
              value={formData.customerId}
              onChange={e =>
                setFormData({ ...formData, customerId: e.target.value })
              }
              placeholder="自动生成"
            />
          </div>

          <Input
            label="活动名称"
            value={formData.eventName}
            onChange={e =>
              setFormData({ ...formData, eventName: e.target.value })
            }
            placeholder="如：公司年会、婚礼等"
          />

          <Input
            label="活动地址"
            value={formData.address}
            onChange={e =>
              setFormData({ ...formData, address: e.target.value })
            }
            placeholder="请输入活动地址"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="开始时间"
              type="time"
              value={formData.startTime}
              onChange={e => {
                const newTime = e.target.value;
                setFormData({ ...formData, startTime: newTime });
                if (formData.equipmentIds.length > 0 && dragState.startDate && dragState.endDate) {
                  const [startHour, startMin] = newTime.split(':').map(Number);
                  const [endHour, endMin] = formData.endTime.split(':').map(Number);
                  const startDate = setMinutes(setHours(dragState.startDate, startHour), startMin).toISOString();
                  const endDate = setMinutes(setHours(dragState.endDate, endHour), endMin).toISOString();
                  checkCreateConflicts(formData.equipmentIds, startDate, endDate);
                }
              }}
            />
            <Input
              label="结束时间"
              type="time"
              value={formData.endTime}
              onChange={e => {
                const newTime = e.target.value;
                setFormData({ ...formData, endTime: newTime });
                if (formData.equipmentIds.length > 0 && dragState.startDate && dragState.endDate) {
                  const [startHour, startMin] = formData.startTime.split(':').map(Number);
                  const [endHour, endMin] = newTime.split(':').map(Number);
                  const startDate = setMinutes(setHours(dragState.startDate, startHour), startMin).toISOString();
                  const endDate = setMinutes(setHours(dragState.endDate, endHour), endMin).toISOString();
                  checkCreateConflicts(formData.equipmentIds, startDate, endDate);
                }
              }}
            />
          </div>

          {dragState.startDate && dragState.endDate && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-700 mb-1">
                已选择日期范围
              </div>
              <div className="text-sm text-blue-600">
                {formatDate(dragState.startDate)} ~{' '}
                {formatDate(dragState.endDate)}
                <span className="ml-2">
                  (共{' '}
                  {differenceInDays(dragState.endDate, dragState.startDate) + 1}{' '}
                  天)
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择设备
            </label>
            <div className="grid grid-cols-2 gap-2">
              {equipment.map(eq => (
                <div
                  key={eq.id}
                  className={cn(
                    'p-3 border rounded-lg cursor-pointer transition-all duration-200',
                    formData.equipmentIds.includes(eq.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  onClick={() => toggleEquipmentSelection(eq.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {eq.name}
                      </div>
                      <div className="text-xs text-gray-500">{eq.spec}</div>
                    </div>
                    <div className="text-sm font-semibold text-blue-700">
                      ¥{eq.dailyRate}/天
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {createConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">
                    检测到 {createConflicts.length} 个时段冲突
                  </p>
                  {createConflicts.map((c, idx) => {
                    const eq = equipment.find(e => e.id === c.equipmentId);
                    const otherOrder = getActiveOrders().find(o => o.id !== 'temp-calendar' && (o.id === c.orderId1 || o.id === c.orderId2));
                    return (
                      <div key={idx} className="mt-2 text-sm text-red-700">
                        <p>• 设备「{eq?.name}」与订单 {otherOrder?.orderNo} 冲突</p>
                        <p className="text-xs text-red-600 ml-4">
                          重叠时段: {formatDateRange(c.overlapStart, c.overlapEnd)}
                        </p>
                      </div>
                    );
                  })}
                  <p className="text-sm text-red-700 mt-3">
                    注意：此时段的设备已被占用，创建后将生成冲突记录。
                  </p>
                </div>
              </div>
            </div>
          )}

          {createConflicts.length === 0 && formData.equipmentIds.length > 0 && dragState.startDate && dragState.endDate && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="font-medium text-green-800">此时段安全可用</p>
                  <p className="text-sm text-green-700">
                    所选设备在该时段均可用，可以正常创建订单。
                  </p>
                </div>
              </div>
            </div>
          )}

          {createAlternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                推荐安全时段：
              </p>
              <div className="space-y-2">
                {createAlternatives.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectAlternativeSlot(slot)}
                    className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors flex items-center justify-between"
                  >
                    <span className="text-gray-900 font-medium">
                      {formatDateRange(slot.startDate, slot.endDate)}
                    </span>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      无冲突
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {formData.equipmentIds.length > 0 &&
            dragState.startDate &&
            dragState.endDate && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  费用预估
                </div>
                <div className="space-y-1 text-sm">
                  {formData.equipmentIds.map(eqId => {
                    const eq = equipment.find(e => e.id === eqId);
                    const days =
                      differenceInDays(
                        dragState.endDate!,
                        dragState.startDate!
                      ) + 1;
                    return eq ? (
                      <div
                        key={eqId}
                        className="flex justify-between text-gray-600"
                      >
                        <span>
                          {eq.name} × {days}天
                        </span>
                        <span>¥{(eq.dailyRate * days).toFixed(2)}</span>
                      </div>
                    ) : null;
                  })}
                  <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 font-semibold text-gray-900">
                    <span>总计</span>
                    <span className="text-blue-700">
                      ¥
                      {formData.equipmentIds
                        .reduce((sum, eqId) => {
                          const eq = equipment.find(e => e.id === eqId);
                          const days =
                            differenceInDays(
                              dragState.endDate!,
                              dragState.startDate!
                            ) + 1;
                          return sum + (eq ? eq.dailyRate * days : 0);
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateOrder}
              disabled={
                !formData.customerName ||
                formData.equipmentIds.length === 0 ||
                !dragState.startDate ||
                !dragState.endDate
              }
            >
              创建订单
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
