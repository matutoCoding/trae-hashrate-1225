import { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Eye, 
  Check, 
  X, 
  Handshake, 
  ShoppingCart,
  Calendar,
  MapPin,
  User,
  Package,
  AlertTriangle,
  Clock,
  DollarSign,
  ChevronRight
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
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate, formatDateRange, getStatusText, getDaysBetween } from '@/utils/dateUtils';
import { checkConflicts, findAlternativeSlots } from '@/utils/conflictDetector';
import { cn } from '@/lib/utils';
import type { Order, Conflict } from '@/types';
import { useNavigate } from 'react-router-dom';

const statusFilters: { value: string; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: '待确认', color: 'bg-amber-100 text-amber-800' },
  { value: 'confirmed', label: '已确认', color: 'bg-blue-100 text-blue-800' },
  { value: 'matched', label: '已匹配', color: 'bg-purple-100 text-purple-800' },
  { value: 'dispatched', label: '已派工', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: '已取消', color: 'bg-gray-100 text-gray-800' }
];

const orderStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'> = {
    pending: 'warning',
    confirmed: 'info',
    matched: 'purple',
    dispatched: 'info',
    completed: 'success',
    cancelled: 'default'
  };
  return map[status] || 'default';
};

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, addOrder, updateOrder, cancelOrder, getOrderById } = useOrderStore();
  const { equipment } = useEquipmentStore();
  const { addConflict, scanConflicts, getActiveConflicts } = useConflictStore();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<Conflict[]>([]);
  const [alternativeSlots, setAlternativeSlots] = useState<{ startDate: string; endDate: string }[]>([]);

  const [formData, setFormData] = useState({
    customerName: '',
    customerId: '',
    eventName: '',
    address: '',
    equipmentIds: [] as string[],
    startDate: '',
    endDate: ''
  });

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (user?.role === 'customer') {
      result = result.filter(o => o.customerId === user.id);
    }

    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(o =>
        o.orderNo.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.eventName?.toLowerCase().includes(search)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, statusFilter, searchText, user]);

  const orderStats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      matched: orders.filter(o => o.status === 'matched').length,
      dispatched: orders.filter(o => o.status === 'dispatched').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
  }, [orders]);

  const totalAmount = useMemo(() => {
    if (formData.equipmentIds.length === 0 || !formData.startDate || !formData.endDate) return 0;
    const days = getDaysBetween(formData.startDate, formData.endDate);
    const dailyTotal = formData.equipmentIds.reduce((sum, id) => {
      const eq = equipment.find(e => e.id === id);
      return sum + (eq?.dailyRate || 0);
    }, 0);
    return dailyTotal * days;
  }, [formData.equipmentIds, formData.startDate, formData.endDate, equipment]);

  useEffect(() => {
    if (formData.equipmentIds.length > 0 && formData.startDate && formData.endDate) {
      const testOrder: Order = {
        id: 'temp',
        orderNo: 'TEMP',
        customerId: formData.customerId,
        customerName: formData.customerName,
        equipmentIds: formData.equipmentIds,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'pending',
        totalAmount: 0,
        createdAt: new Date().toISOString()
      };

      const foundConflicts = checkConflicts(testOrder, orders);
      setDetectedConflicts(foundConflicts);

      if (foundConflicts.length > 0) {
        const alternatives = findAlternativeSlots(
          formData.equipmentIds[0],
          new Date(formData.startDate),
          new Date(formData.endDate),
          orders,
          formData.equipmentIds
        );
        setAlternativeSlots(alternatives);
      } else {
        setAlternativeSlots([]);
      }
    } else {
      setDetectedConflicts([]);
      setAlternativeSlots([]);
    }
  }, [formData.equipmentIds, formData.startDate, formData.endDate, orders]);

  const getEquipmentNames = (ids: string[]) => {
    return ids.map(id => equipment.find(e => e.id === id)?.name).filter(Boolean).join('、');
  };

  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const handleConfirmOrder = (id: string) => {
    if (confirm('确定要确认此订单吗？')) {
      updateOrder(id, { status: 'confirmed' });
      scanConflicts(orders);
    }
  };

  const handleCancelOrder = (id: string) => {
    if (confirm('确定要取消此订单吗？取消后将释放预订时段。')) {
      cancelOrder(id);
      scanConflicts(orders);
    }
  };

  const handleEnterMatching = (id: string) => {
    updateOrder(id, { status: 'matched' });
    navigate('/matching');
  };

  const handleCreateOrder = () => {
    if (!formData.customerName || !formData.equipmentIds.length || !formData.startDate || !formData.endDate) {
      alert('请填写完整信息');
      return;
    }

    if (detectedConflicts.length > 0) {
      if (!confirm('检测到时段冲突，确定要继续创建吗？')) {
        return;
      }
    }

    addOrder({
      customerId: user?.role === 'customer' ? user.id : formData.customerId,
      customerName: formData.customerName,
      equipmentIds: formData.equipmentIds,
      startDate: formData.startDate,
      endDate: formData.endDate,
      status: 'pending',
      totalAmount: totalAmount,
      eventName: formData.eventName,
      address: formData.address,
      conflictFlag: detectedConflicts.length > 0
    });

    if (detectedConflicts.length > 0) {
      detectedConflicts.forEach(c => {
        addConflict({
          orderId1: c.orderId1,
          orderId2: c.orderId2,
          equipmentId: c.equipmentId,
          overlapStart: c.overlapStart,
          overlapEnd: c.overlapEnd,
          severity: c.severity,
          status: 'pending'
        });
      });
    }

    setCreateModalOpen(false);
    setFormData({
      customerName: '',
      customerId: '',
      eventName: '',
      address: '',
      equipmentIds: [],
      startDate: '',
      endDate: ''
    });
  };

  const handleEquipmentSelect = (eqId: string) => {
    setFormData(prev => ({
      ...prev,
      equipmentIds: prev.equipmentIds.includes(eqId)
        ? prev.equipmentIds.filter(id => id !== eqId)
        : [...prev.equipmentIds, eqId]
    }));
  };

  const handleSelectAlternative = (slot: { startDate: string; endDate: string }) => {
    setFormData(prev => ({
      ...prev,
      startDate: slot.startDate,
      endDate: slot.endDate
    }));
  };

  const getOrderConflicts = (orderId: string) => {
    return getActiveConflicts().filter(
      c => c.orderId1 === orderId || c.orderId2 === orderId
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="订单管理"
        description="管理所有租赁订单，包括创建、确认、取消和撮合操作"
        actions={
          user?.role !== 'builder' && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建订单
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statusFilters.map(filter => {
          const count = filter.value === 'all' 
            ? orderStats.total 
            : orderStats[filter.value as keyof typeof orderStats];
          return (
            <Card 
              key={filter.value} 
              hover
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'cursor-pointer transition-all',
                statusFilter === filter.value && 'ring-2 ring-blue-500 ring-offset-2'
              )}
            >
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className={cn('text-sm font-medium mt-1', filter.color)}>
                  {filter.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="搜索订单号、客户名称、活动名称..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <div className="text-sm text-gray-500">
          共 <span className="font-medium text-gray-900">{filteredOrders.length}</span> 条记录
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">暂无订单数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">订单号</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时段</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredOrders.map(order => {
                    const orderConflicts = getOrderConflicts(order.id);
                    return (
                      <tr 
                        key={order.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleViewDetail(order)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{order.orderNo}</p>
                              {order.eventName && (
                                <p className="text-xs text-gray-500">{order.eventName}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{order.customerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 text-sm max-w-xs truncate" title={getEquipmentNames(order.equipmentIds)}>
                              {getEquipmentNames(order.equipmentIds)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 text-sm">
                              {formatDateRange(order.startDate, order.endDate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span className="font-semibold text-gray-900">
                              ¥{order.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {orderConflicts.length > 0 && (
                              <div className="p-1 bg-red-100 rounded" title="存在冲突">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                              </div>
                            )}
                            <Badge variant={orderStatusBadgeVariant(order.status)}>
                              {getStatusText(order.status)}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(order)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {order.status === 'pending' && user?.role === 'admin' && (
                              <>
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleConfirmOrder(order.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleCancelOrder(order.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {order.status === 'confirmed' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleEnterMatching(order.id)}
                              >
                                <Handshake className="w-4 h-4" />
                              </Button>
                            )}
                            {order.status === 'pending' && user?.role === 'customer' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleCancelOrder(order.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="订单详情"
        className="max-w-2xl"
      >
        {selectedOrder && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{selectedOrder.orderNo}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  创建于 {formatDate(selectedOrder.createdAt, 'yyyy-MM-dd HH:mm')}
                </p>
              </div>
              <Badge variant={orderStatusBadgeVariant(selectedOrder.status)} className="text-sm">
                {getStatusText(selectedOrder.status)}
              </Badge>
            </div>

            {getOrderConflicts(selectedOrder.id).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">检测到时段冲突</p>
                    <p className="text-sm text-red-600 mt-1">
                      该订单与其他订单存在 {getOrderConflicts(selectedOrder.id).length} 个设备时段冲突，请及时处理。
                    </p>
                    <Button variant="danger" size="sm" className="mt-3">
                      前往处理
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">客户信息</p>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedOrder.customerName}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500">活动名称</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedOrder.eventName || '-'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500">活动地址</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{selectedOrder.address || '-'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500">订单金额</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-blue-700">¥{selectedOrder.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-500">租赁时段</p>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">
                      {formatDateRange(selectedOrder.startDate, selectedOrder.endDate)}
                    </p>
                    <p className="text-sm text-blue-600">
                      共 {getDaysBetween(selectedOrder.startDate, selectedOrder.endDate)} 天
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-500">租赁设备</p>
              <div className="space-y-2">
                {selectedOrder.equipmentIds.map(eqId => {
                  const eq = equipment.find(e => e.id === eqId);
                  if (!eq) return null;
                  return (
                    <div key={eqId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{eq.name}</p>
                          <p className="text-xs text-gray-500">{eq.spec}</p>
                        </div>
                      </div>
                      <span className="font-medium text-blue-700">¥{eq.dailyRate}/天</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                关闭
              </Button>
              {selectedOrder.status === 'pending' && user?.role === 'admin' && (
                <>
                  <Button variant="success" onClick={() => {
                    handleConfirmOrder(selectedOrder.id);
                    setDetailModalOpen(false);
                  }}>
                    <Check className="w-4 h-4 mr-2" />
                    确认订单
                  </Button>
                  <Button variant="danger" onClick={() => {
                    handleCancelOrder(selectedOrder.id);
                    setDetailModalOpen(false);
                  }}>
                    <X className="w-4 h-4 mr-2" />
                    取消订单
                  </Button>
                </>
              )}
              {selectedOrder.status === 'confirmed' && (
                <Button onClick={() => {
                  handleEnterMatching(selectedOrder.id);
                  setDetailModalOpen(false);
                }}>
                  <Handshake className="w-4 h-4 mr-2" />
                  进入撮合
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="新建订单"
        className="max-w-3xl"
      >
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="客户名称"
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="请输入客户名称"
            />
            {user?.role !== 'customer' && (
              <Input
                label="客户ID"
                value={formData.customerId}
                onChange={e => setFormData({ ...formData, customerId: e.target.value })}
                placeholder="客户唯一标识"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="活动名称"
              value={formData.eventName}
              onChange={e => setFormData({ ...formData, eventName: e.target.value })}
              placeholder="如：公司周年庆典"
            />
            <Input
              label="活动地址"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="请输入活动地址"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="开始日期"
              type="date"
              value={formData.startDate ? formData.startDate.slice(0, 10) : ''}
              onChange={e => setFormData({ ...formData, startDate: new Date(e.target.value).toISOString() })}
            />
            <Input
              label="结束日期"
              type="date"
              value={formData.endDate ? formData.endDate.slice(0, 10) : ''}
              onChange={e => setFormData({ ...formData, endDate: new Date(e.target.value).toISOString() })}
            />
          </div>

          {formData.startDate && formData.endDate && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                租赁天数：<span className="font-bold">{getDaysBetween(formData.startDate, formData.endDate)}</span> 天
              </p>
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">选择设备</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {equipment.filter(e => e.status === 'available').map(eq => (
                <div
                  key={eq.id}
                  onClick={() => handleEquipmentSelect(eq.id)}
                  className={cn(
                    'p-3 rounded-lg border-2 cursor-pointer transition-all',
                    formData.equipmentIds.includes(eq.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{eq.name}</p>
                      <p className="text-xs text-gray-500">{eq.spec}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-700">¥{eq.dailyRate}/天</p>
                      <p className="text-xs text-gray-500">库存: {eq.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              已选择 <span className="font-medium text-blue-600">{formData.equipmentIds.length}</span> 个设备
            </p>
          </div>

          {detectedConflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">检测到 {detectedConflicts.length} 个时段冲突</p>
                  {detectedConflicts.map((c, idx) => {
                    const conflictEq = equipment.find(e => e.id === c.equipmentId);
                    const otherOrder = getOrderById(c.orderId1 === 'temp' ? c.orderId2 : c.orderId1);
                    return (
                      <div key={idx} className="mt-2 text-sm text-red-700">
                        <p>• 设备「{conflictEq?.name}」与订单 {otherOrder?.orderNo} 冲突</p>
                        <p className="text-xs text-red-600 ml-4">
                          重叠时段: {formatDateRange(c.overlapStart, c.overlapEnd)}
                        </p>
                      </div>
                    );
                  })}

                  {alternativeSlots.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-red-800">推荐替代时段：</p>
                      <div className="mt-2 space-y-2">
                        {alternativeSlots.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectAlternative(slot)}
                            className="w-full p-3 bg-white border border-red-200 rounded-lg text-left hover:bg-red-50 transition-colors flex items-center justify-between"
                          >
                            <span className="text-gray-900">
                              {formatDateRange(slot.startDate, slot.endDate)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {totalAmount > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-gray-600">预估总金额</span>
              <span className="text-2xl font-bold text-blue-700">¥{totalAmount.toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateOrder}>
              <Plus className="w-4 h-4 mr-2" />
              创建订单
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
