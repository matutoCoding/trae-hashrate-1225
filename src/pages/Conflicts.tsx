import { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Scan, 
  Eye, 
  XCircle, 
  Clock, 
  CheckCircle,
  Calendar,
  User,
  MapPin,
  Package,
  ChevronRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import Empty from '@/components/Empty';
import { useConflictStore } from '@/store/useConflictStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { formatDate, formatDateRange, getStatusText, getStatusColor, getDaysBetween } from '@/utils/dateUtils';
import { checkConflicts, findAlternativeSlots } from '@/utils/conflictDetector';
import { cn } from '@/lib/utils';
import type { Conflict, Order } from '@/types';

export default function Conflicts() {
  const { conflicts, scanConflicts, resolveConflict, getConflictsForOrder } = useConflictStore();
  const { orders, cancelOrder, updateOrder, getOrderById, getActiveOrders } = useOrderStore();
  const { getEquipmentById } = useEquipmentStore();
  
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'resolved'>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<'order1' | 'order2'>('order1');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false;
      return true;
    });
  }, [conflicts, filterStatus, filterSeverity]);

  const stats = useMemo(() => {
    const pending = conflicts.filter(c => c.status === 'pending');
    return {
      total: conflicts.length,
      pending: pending.length,
      high: pending.filter(c => c.severity === 'high').length,
      medium: pending.filter(c => c.severity === 'medium').length,
      low: pending.filter(c => c.severity === 'low').length
    };
  }, [conflicts]);

  const timelineOrders = useMemo(() => {
    if (conflicts.length === 0) return [];
    const orderSet = new Set<string>();
    conflicts.forEach(c => {
      orderSet.add(c.orderId1);
      orderSet.add(c.orderId2);
    });
    return Array.from(orderSet)
      .map(id => getOrderById(id))
      .filter(Boolean) as Order[];
  }, [conflicts, getOrderById]);

  const allDates = useMemo(() => {
    const dates = new Set<string>();
    timelineOrders.forEach(order => {
      const start = new Date(order.startDate);
      const end = new Date(order.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.add(formatDate(d.toISOString(), 'MM-dd'));
      }
    });
    return Array.from(dates).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );
  }, [timelineOrders]);

  const [adjustConflicts, setAdjustConflicts] = useState<Conflict[]>([]);
  const [adjustAlternatives, setAdjustAlternatives] = useState<{ startDate: string; endDate: string }[]>([]);

  const handleScan = async () => {
    setIsScanning(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    scanConflicts();
    setIsScanning(false);
  };

  const handleViewDetail = (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setIsDetailModalOpen(true);
    setAdjustConflicts([]);
    setAdjustAlternatives([]);
  };

  const handleCancelOrder = (orderId: string) => {
    if (confirm('确定要取消此订单吗？取消后将释放该订单占用的所有设备时段。')) {
      cancelOrder(orderId);
      scanConflicts();
      setIsDetailModalOpen(false);
    }
  };

  const handleMarkResolved = (conflictId: string) => {
    if (confirm('确定要标记此冲突为已解决吗？')) {
      resolveConflict(conflictId);
      setIsDetailModalOpen(false);
    }
  };

  const handleOpenAdjustModal = (target: 'order1' | 'order2', order: Order) => {
    setAdjustTarget(target);
    setNewStartDate(order.startDate);
    setNewEndDate(order.endDate);
    setAdjustConflicts([]);
    setAdjustAlternatives([]);
    setShowAdjustModal(true);
  };

  const checkNewTimeConflicts = (order: Order, startDate: string, endDate: string) => {
    const testOrder: Order = {
      ...order,
      startDate,
      endDate
    };
    const activeOrders = getActiveOrders().filter(o => o.id !== order.id);
    const conflicts = checkConflicts(testOrder, activeOrders);
    setAdjustConflicts(conflicts);

    if (conflicts.length > 0 && order.equipmentIds.length > 0) {
      const alternatives = findAlternativeSlots(
        order.equipmentIds[0],
        new Date(startDate),
        new Date(endDate),
        activeOrders,
        order.equipmentIds
      );
      setAdjustAlternatives(alternatives);
    } else {
      setAdjustAlternatives([]);
    }
  };

  const handleAdjustTime = () => {
    if (!selectedConflict) return;
    
    const orderId = adjustTarget === 'order1' ? selectedConflict.orderId1 : selectedConflict.orderId2;
    const targetOrder = getOrderById(orderId);
    if (!targetOrder) return;

    const testOrder: Order = {
      ...targetOrder,
      startDate: newStartDate,
      endDate: newEndDate
    };
    const activeOrders = getActiveOrders().filter(o => o.id !== orderId);
    const remainingConflicts = checkConflicts(testOrder, activeOrders);

    updateOrder(orderId, {
      startDate: newStartDate,
      endDate: newEndDate
    });

    scanConflicts();

    if (remainingConflicts.length === 0) {
      alert('时段调整成功，冲突已全部解决！');
      setShowAdjustModal(false);
      setIsDetailModalOpen(false);
    } else {
      alert(`新时段仍存在 ${remainingConflicts.length} 个冲突，请重新选择时段或选择推荐的安全时段。`);
    }
  };

  const handleSelectAlternativeSlot = (slot: { startDate: string; endDate: string }) => {
    setNewStartDate(slot.startDate);
    setNewEndDate(slot.endDate);
    
    if (selectedConflict) {
      const orderId = adjustTarget === 'order1' ? selectedConflict.orderId1 : selectedConflict.orderId2;
      const targetOrder = getOrderById(orderId);
      if (targetOrder) {
        checkNewTimeConflicts(targetOrder, slot.startDate, slot.endDate);
      }
    }
  };

  const getOrderEquipmentNames = (order: Order) => {
    return order.equipmentIds
      .map(id => getEquipmentById(id)?.name)
      .filter(Boolean)
      .join('、');
  };

  const getConflictEquipment = (equipmentId: string) => {
    return getEquipmentById(equipmentId);
  };

  const getOverlapDays = (conflict: Conflict) => {
    return getDaysBetween(conflict.overlapStart, conflict.overlapEnd);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'low': return <AlertTriangle className="w-4 h-4 text-green-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderTimeline = () => {
    if (conflicts.length === 0 || timelineOrders.length === 0) return null;

    const getOrderPosition = (order: Order) => {
      const startKey = formatDate(order.startDate, 'MM-dd');
      const endKey = formatDate(order.endDate, 'MM-dd');
      const startIndex = allDates.indexOf(startKey);
      const endIndex = allDates.indexOf(endKey);
      return {
        left: `${(startIndex / allDates.length) * 100}%`,
        width: `${((endIndex - startIndex + 1) / allDates.length) * 100}%`
      };
    };

    const hasConflict = (orderId: string) => {
      return conflicts.some(c => 
        (c.orderId1 === orderId || c.orderId2 === orderId) && c.status === 'pending'
      );
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            冲突时间轴
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="flex border-b border-gray-200 pb-2 mb-4">
                <div className="w-32 flex-shrink-0 text-sm font-medium text-gray-500">订单</div>
                <div className="flex-1 flex">
                  {allDates.map(date => (
                    <div 
                      key={date} 
                      className="flex-1 text-center text-xs text-gray-400 font-medium"
                    >
                      {date}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {timelineOrders.map(order => {
                  const pos = getOrderPosition(order);
                  const conflicted = hasConflict(order.id);
                  return (
                    <div key={order.id} className="flex items-center">
                      <div className="w-32 flex-shrink-0 pr-3">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {order.orderNo}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {order.customerName}
                        </div>
                      </div>
                      <div className="flex-1 relative h-8">
                        <div
                          className={cn(
                            'absolute top-0 h-8 rounded-lg flex items-center px-3 text-white text-xs font-medium transition-all hover:opacity-90',
                            conflicted ? 'bg-red-500' : 'bg-blue-500'
                          )}
                          style={{ left: pos.left, width: pos.width, minWidth: '80px' }}
                        >
                          {order.eventName || order.customerName}
                          {conflicted && (
                            <AlertTriangle className="w-3 h-3 ml-1 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-6 mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-sm text-gray-600">正常订单</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-sm text-gray-600">冲突订单</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderConflictDetail = () => {
    if (!selectedConflict) return null;

    const order1 = getOrderById(selectedConflict.orderId1);
    const order2 = getOrderById(selectedConflict.orderId2);
    const equipment = getConflictEquipment(selectedConflict.equipmentId);

    if (!order1 || !order2) return null;

    const severityColors = {
      high: 'bg-red-50 border-red-200',
      medium: 'bg-amber-50 border-amber-200',
      low: 'bg-green-50 border-green-200'
    };

    return (
      <div className="p-6 space-y-6">
        <div className={cn(
          'p-4 rounded-xl border',
          severityColors[selectedConflict.severity]
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-lg',
              selectedConflict.severity === 'high' ? 'bg-red-100' :
              selectedConflict.severity === 'medium' ? 'bg-amber-100' : 'bg-green-100'
            )}>
              {getSeverityIcon(selectedConflict.severity)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {selectedConflict.status === 'pending' ? '待处理冲突' : '已解决冲突'}
              </p>
              <p className="text-sm text-gray-600">
                严重程度：{getStatusText(selectedConflict.severity)} · 
                重叠 {getOverlapDays(selectedConflict)} 天 · 
                {formatDateRange(selectedConflict.overlapStart, selectedConflict.overlapEnd)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            涉及设备
          </h4>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border">
              <Package className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{equipment?.name}</p>
              <p className="text-sm text-gray-500">{equipment?.spec}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { order: order1, label: '订单 A', color: 'blue' },
            { order: order2, label: '订单 B', color: 'amber' }
          ].map(({ order, label, color }) => (
            <Card key={order.id} className={cn(
              'border-2',
              color === 'blue' ? 'border-blue-200' : 'border-amber-200'
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={color === 'blue' ? 'info' : 'warning'}>
                    {label}
                  </Badge>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusText(order.status)}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-lg font-semibold text-gray-900">{order.orderNo}</p>
                  <p className="text-sm text-gray-500">{order.eventName}</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateRange(order.startDate, order.endDate)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{order.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Package className="w-4 h-4" />
                    <span>{getOrderEquipmentNames(order)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-lg font-bold text-gray-900">
                    ¥{order.totalAmount.toLocaleString()}
                  </p>
                </div>

                {selectedConflict.status === 'pending' && (
                  <div className="space-y-2 pt-2">
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full"
                      onClick={() => handleCancelOrder(order.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      取消此订单
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenAdjustModal(
                        label === '订单 A' ? 'order1' : 'order2',
                        order
                      )}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      调整时段
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedConflict.status === 'pending' && (
          <div className="bg-blue-50 rounded-xl p-4">
            <h4 className="font-medium text-blue-900 mb-2">处理建议</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 建议优先取消金额较小或优先级较低的订单</li>
              <li>• 调整时段时请检查该设备在新时段是否可用</li>
              <li>• 如客户同意更换设备类型，可考虑替换为其他可用设备</li>
            </ul>
          </div>
        )}

        {selectedConflict.status === 'pending' && (
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
              关闭
            </Button>
            <Button
              variant="success"
              onClick={() => handleMarkResolved(selectedConflict.id)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              标记已解决
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="冲突检测"
        description="检测并处理设备预订时段冲突，确保订单顺利执行"
        actions={
          <Button onClick={handleScan} disabled={isScanning}>
            {isScanning ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Scan className="w-4 h-4 mr-2" />
            )}
            {isScanning ? '扫描中...' : '一键扫描冲突'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">冲突总数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">待处理</p>
                <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">高优先级</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">中/低优先级</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.medium + stats.low}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {renderTimeline()}

      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'resolved')}
          className="w-32"
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '待处理' },
            { value: 'resolved', label: '已解决' }
          ]}
        />
        <Select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value as 'all' | 'high' | 'medium' | 'low')}
          className="w-32"
          options={[
            { value: 'all', label: '全部严重程度' },
            { value: 'high', label: '高' },
            { value: 'medium', label: '中' },
            { value: 'low', label: '低' }
          ]}
        />
      </div>

      {filteredConflicts.length > 0 ? (
        <div className="space-y-3">
          {filteredConflicts.map(conflict => {
            const order1 = getOrderById(conflict.orderId1);
            const order2 = getOrderById(conflict.orderId2);
            const eq = getConflictEquipment(conflict.equipmentId);
            
            if (!order1 || !order2) return null;

            return (
              <Card 
                key={conflict.id} 
                hover
                className={cn(
                  'transition-all',
                  conflict.status === 'pending' && conflict.severity === 'high' 
                    ? 'border-l-4 border-l-red-500' :
                  conflict.status === 'pending' && conflict.severity === 'medium'
                    ? 'border-l-4 border-l-amber-500' :
                  conflict.status === 'pending'
                    ? 'border-l-4 border-l-green-500'
                    : 'opacity-60'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        'p-3 rounded-xl',
                        conflict.severity === 'high' ? 'bg-red-100' :
                        conflict.severity === 'medium' ? 'bg-amber-100' : 'bg-green-100'
                      )}>
                        {getSeverityIcon(conflict.severity)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {order1.orderNo}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900">
                            {order2.orderNo}
                          </span>
                          <Badge className={getStatusColor(conflict.severity)}>
                            {getStatusText(conflict.severity)}
                          </Badge>
                          <Badge variant={conflict.status === 'pending' ? 'warning' : 'success'}>
                            {conflict.status === 'pending' ? '待处理' : '已解决'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            <span>{eq?.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{order1.customerName} vs {order2.customerName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span className="text-red-600 font-medium">
                              重叠: {formatDateRange(conflict.overlapStart, conflict.overlapEnd)}
                              ({getOverlapDays(conflict)}天)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(conflict)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty
          title="暂无冲突记录"
          description="点击上方「一键扫描冲突」按钮检测订单冲突"
          icon={AlertTriangle}
        />
      )}

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="冲突详情"
        className="max-w-4xl"
      >
        {renderConflictDetail()}
      </Modal>

      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="调整订单时段"
        className="max-w-lg"
      >
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-600">
            请为订单选择新的时段，系统将自动检测新时段是否仍有冲突。
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={newStartDate.slice(0, 10)}
                onChange={(e) => {
                  const val = new Date(e.target.value).toISOString();
                  setNewStartDate(val);
                  if (selectedConflict) {
                    const orderId = adjustTarget === 'order1' ? selectedConflict.orderId1 : selectedConflict.orderId2;
                    const targetOrder = getOrderById(orderId);
                    if (targetOrder) {
                      checkNewTimeConflicts(targetOrder, val, newEndDate);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={newEndDate.slice(0, 10)}
                onChange={(e) => {
                  const val = new Date(e.target.value).toISOString();
                  setNewEndDate(val);
                  if (selectedConflict) {
                    const orderId = adjustTarget === 'order1' ? selectedConflict.orderId1 : selectedConflict.orderId2;
                    const targetOrder = getOrderById(orderId);
                    if (targetOrder) {
                      checkNewTimeConflicts(targetOrder, newStartDate, val);
                    }
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {adjustConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">新时段仍存在 {adjustConflicts.length} 个冲突</p>
                  {adjustConflicts.map((c, idx) => {
                    const eq = getEquipmentById(c.equipmentId);
                    const currentOrderId = adjustTarget === 'order1' 
                      ? selectedConflict?.orderId1 
                      : selectedConflict?.orderId2;
                    const otherOrderId = c.orderId1 === currentOrderId ? c.orderId2 : c.orderId1;
                    const otherOrder = getOrderById(otherOrderId);
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
                    注意：保存后该冲突<strong>不会自动标记为已解决</strong>，请选择无冲突的时段。
                  </p>
                </div>
              </div>
            </div>
          )}

          {adjustConflicts.length === 0 && newStartDate && newEndDate && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">新时段安全，无冲突</p>
                  <p className="text-sm text-green-700">
                    此时段内所有设备均可用，保存后冲突将自动标记为已解决。
                  </p>
                </div>
              </div>
            </div>
          )}

          {adjustAlternatives.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
                推荐安全时段：
              </p>
              <div className="space-y-2">
                {adjustAlternatives.map((slot, idx) => (
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setShowAdjustModal(false)}>
              取消
            </Button>
            <Button onClick={handleAdjustTime}>
              确认调整
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
