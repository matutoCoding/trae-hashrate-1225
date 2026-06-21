import { useState, useMemo } from 'react';
import {
  Plus,
  Eye,
  Play,
  Check,
  Clock,
  MapPin,
  Users,
  Calendar,
  Package,
  Wrench,
  Hammer,
  CheckCircle2,
  Circle,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { StatCard } from '@/components/Layout/StatCard';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Empty from '@/components/Empty';
import { useDispatchStore } from '@/store/useDispatchStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useMatchingStore } from '@/store/useMatchingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDateTime, getStatusText } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { DispatchOrder, Order, BuilderTeam } from '@/types';

const typeFilters: { value: string; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'setup', label: '搭建', color: 'bg-blue-100 text-blue-700' },
  { value: 'teardown', label: '拆卸', color: 'bg-orange-100 text-orange-700' }
];

const statusColumns = [
  { key: 'pending', label: '待派工', color: 'amber', icon: Clock },
  { key: 'in_progress', label: '进行中', color: 'blue', icon: Play },
  { key: 'completed', label: '已完成', color: 'green', icon: Check }
] as const;

const typeBadgeVariant = (type: string): 'info' | 'warning' | 'success' => {
  const map: Record<string, 'info' | 'warning' | 'success'> = {
    setup: 'info',
    teardown: 'warning'
  };
  return map[type] || 'info';
};

const statusBadgeVariant = (status: string): 'default' | 'success' | 'warning' | 'info' => {
  const map: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
    pending: 'warning',
    in_progress: 'info',
    completed: 'success'
  };
  return map[status] || 'default';
};

export default function Dispatch() {
  const { user } = useAuthStore();
  const { dispatchOrders, createDispatchOrder, startDispatch, completeDispatch } = useDispatchStore();
  const { orders } = useOrderStore();
  const { builderTeams } = useMatchingStore();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [builderFilter, setBuilderFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchOrder | null>(null);

  const [formData, setFormData] = useState({
    orderId: '',
    builderId: '',
    type: 'setup' as 'setup' | 'teardown',
    scheduledTime: '',
    address: '',
    notes: ''
  });

  const filteredDispatches = useMemo(() => {
    let result = [...dispatchOrders];

    if (user?.role === 'builder') {
      result = result.filter(d => d.builderId === user.id);
    }

    if (typeFilter !== 'all') {
      result = result.filter(d => d.type === typeFilter);
    }

    if (builderFilter !== 'all') {
      result = result.filter(d => d.builderId === builderFilter);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      const orderMap = new Map<string, string>(orders.map(o => [o.id, o.orderNo]));
      result = result.filter(d => {
        const orderNo = orderMap.get(d.orderId) || '';
        return (
          orderNo.toLowerCase().includes(search) ||
          d.builderName.toLowerCase().includes(search) ||
          d.address.toLowerCase().includes(search)
        );
      });
    }

    return result.sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }, [dispatchOrders, typeFilter, builderFilter, searchText, user, orders]);

  const dispatchStats = useMemo(() => {
    const baseList = user?.role === 'builder'
      ? dispatchOrders.filter(d => d.builderId === user.id)
      : dispatchOrders;
    
    return {
      pending: baseList.filter(d => d.status === 'pending').length,
      in_progress: baseList.filter(d => d.status === 'in_progress').length,
      completed: baseList.filter(d => d.status === 'completed').length
    };
  }, [dispatchOrders, user]);

  const columnDispatches = useMemo(() => {
    return {
      pending: filteredDispatches.filter(d => d.status === 'pending'),
      in_progress: filteredDispatches.filter(d => d.status === 'in_progress'),
      completed: filteredDispatches.filter(d => d.status === 'completed')
    };
  }, [filteredDispatches]);

  const builderOptions = useMemo(() => [
    { value: 'all', label: '全部搭建队' },
    ...builderTeams.map(b => ({ value: b.id, label: b.name }))
  ], [builderTeams]);

  const orderOptions = useMemo(() => [
    { value: '', label: '请选择订单' },
    ...orders.map(o => ({ value: o.id, label: `${o.orderNo} - ${o.eventName || o.customerName}` }))
  ], [orders]);

  const getOrder = (orderId: string): Order | undefined => {
    return orders.find(o => o.id === orderId);
  };

  const getBuilder = (builderId: string): BuilderTeam | undefined => {
    return builderTeams.find(b => b.id === builderId);
  };

  const handleViewDetail = (dispatch: DispatchOrder) => {
    setSelectedDispatch(dispatch);
    setDetailModalOpen(true);
  };

  const handleStartDispatch = (id: string) => {
    if (confirm('确定要开始此任务吗？')) {
      startDispatch(id);
    }
  };

  const handleCompleteDispatch = (id: string) => {
    if (confirm('确定要完成此任务吗？')) {
      completeDispatch(id);
    }
  };

  const handleCreateDispatch = () => {
    if (!formData.orderId || !formData.builderId || !formData.scheduledTime || !formData.address) {
      alert('请填写完整信息');
      return;
    }

    const builder = getBuilder(formData.builderId);
    if (!builder) return;

    createDispatchOrder({
      orderId: formData.orderId,
      builderId: formData.builderId,
      builderName: builder.name,
      type: formData.type,
      scheduledTime: new Date(formData.scheduledTime).toISOString(),
      address: formData.address,
      status: 'pending',
      notes: formData.notes
    });

    setCreateModalOpen(false);
    setFormData({
      orderId: '',
      builderId: '',
      type: 'setup',
      scheduledTime: '',
      address: '',
      notes: ''
    });
  };

  const getTimelineEvents = (dispatch: DispatchOrder) => {
    const events = [];
    
    events.push({
      time: formatDateTime(dispatch.scheduledTime),
      title: '任务创建',
      description: `派工单已创建，计划于 ${formatDateTime(dispatch.scheduledTime)} 执行`,
      status: 'completed'
    });

    if (dispatch.startedAt) {
      events.push({
        time: formatDateTime(dispatch.startedAt),
        title: '开始执行',
        description: `${dispatch.builderName} 开始执行任务`,
        status: 'completed'
      });
    }

    if (dispatch.completedAt) {
      events.push({
        time: formatDateTime(dispatch.completedAt),
        title: '任务完成',
        description: `任务已完成，耗时 ${Math.round((new Date(dispatch.completedAt).getTime() - new Date(dispatch.startedAt!).getTime()) / 60000)} 分钟`,
        status: 'completed'
      });
    }

    if (dispatch.status === 'pending') {
      events.push({
        time: '待执行',
        title: '等待开始',
        description: '等待搭建队开始任务',
        status: 'pending'
      });
    } else if (dispatch.status === 'in_progress') {
      events.push({
        time: '进行中',
        title: '正在执行',
        description: '任务正在执行中...',
        status: 'in_progress'
      });
    }

    return events;
  };

  const getOperationLogs = (dispatch: DispatchOrder) => {
    const logs = [];
    
    logs.push({
      time: formatDateTime(dispatch.scheduledTime),
      operator: '系统',
      action: '创建派工单',
      detail: `创建 ${dispatch.type === 'setup' ? '搭建' : '拆卸'} 任务，分配给 ${dispatch.builderName}`
    });

    if (dispatch.startedAt) {
      logs.push({
        time: formatDateTime(dispatch.startedAt),
        operator: dispatch.builderName,
        action: '开始任务',
        detail: '搭建队开始执行任务'
      });
    }

    if (dispatch.completedAt) {
      logs.push({
        time: formatDateTime(dispatch.completedAt),
        operator: dispatch.builderName,
        action: '完成任务',
        detail: '任务执行完成'
      });
    }

    return logs;
  };

  const renderDispatchCard = (dispatch: DispatchOrder) => {
    const order = getOrder(dispatch.orderId);
    
    return (
      <Card
        key={dispatch.id}
        hover
        className="cursor-pointer"
        onClick={() => handleViewDetail(dispatch)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {dispatch.type === 'setup' ? (
                <Hammer className="w-4 h-4 text-blue-500" />
              ) : (
                <Wrench className="w-4 h-4 text-orange-500" />
              )}
              <Badge variant={typeBadgeVariant(dispatch.type)}>
                {dispatch.type === 'setup' ? '搭建' : '拆卸'}
              </Badge>
            </div>
            <Badge variant={statusBadgeVariant(dispatch.status)}>
              {getStatusText(dispatch.status)}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">
                {order?.orderNo || dispatch.orderId}
              </span>
            </div>
            {order?.eventName && (
              <p className="text-xs text-gray-500 ml-6">{order.eventName}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">{dispatch.builderName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              {formatDateTime(dispatch.scheduledTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700 truncate" title={dispatch.address}>
              {dispatch.address}
            </span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => handleViewDetail(dispatch)}
            >
              <Eye className="w-4 h-4 mr-1" />
              详情
            </Button>
            {dispatch.status === 'pending' && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => handleStartDispatch(dispatch.id)}
              >
                <Play className="w-4 h-4 mr-1" />
                开始
              </Button>
            )}
            {dispatch.status === 'in_progress' && (
              <Button
                variant="success"
                size="sm"
                className="flex-1"
                onClick={() => handleCompleteDispatch(dispatch.id)}
              >
                <Check className="w-4 h-4 mr-1" />
                完成
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="派工管理"
        description="管理搭建和拆卸任务的派工、进度追踪和状态流转"
        actions={
          user?.role === 'admin' && (
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建派工单
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="待派工"
          value={dispatchStats.pending}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="进行中"
          value={dispatchStats.in_progress}
          icon={Play}
          color="blue"
        />
        <StatCard
          title="已完成"
          value={dispatchStats.completed}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">筛选：</span>
            </div>
            
            <div className="flex gap-2">
              {typeFilters.map(filter => (
                <Button
                  key={filter.value}
                  variant={typeFilter === filter.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setTypeFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {user?.role !== 'builder' && (
              <div className="w-48">
                <Select
                  value={builderFilter}
                  onChange={e => setBuilderFilter(e.target.value)}
                  options={builderOptions}
                />
              </div>
            )}

            <div className="flex-1 max-w-md ml-auto">
              <Input
                placeholder="搜索订单号、搭建队、地址..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            <div className="text-sm text-gray-500">
              共 <span className="font-medium text-gray-900">{filteredDispatches.length}</span> 条记录
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {statusColumns.map(column => {
          const ColumnIcon = column.icon;
          const columnData = columnDispatches[column.key as keyof typeof columnDispatches];
          
          return (
            <div key={column.key} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'p-2 rounded-lg',
                    column.color === 'amber' && 'bg-amber-100',
                    column.color === 'blue' && 'bg-blue-100',
                    column.color === 'green' && 'bg-green-100'
                  )}>
                    <ColumnIcon className={cn(
                      'w-5 h-5',
                      column.color === 'amber' && 'text-amber-600',
                      column.color === 'blue' && 'text-blue-600',
                      column.color === 'green' && 'text-green-600'
                    )} />
                  </div>
                  <h3 className="font-semibold text-gray-900">{column.label}</h3>
                  <Badge variant={column.key === 'pending' ? 'warning' : column.key === 'in_progress' ? 'info' : 'success'}>
                    {columnData.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnData.length === 0 ? (
                  <Card>
                    <CardContent className="p-8">
                      <Empty
                        title="暂无任务"
                        description={`${column.label}的派工单`}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  columnData.map(dispatch => renderDispatchCard(dispatch))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="派工单详情"
        className="max-w-3xl"
      >
        {selectedDispatch && (
          <div className="p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedDispatch.type === 'setup' ? '搭建任务' : '拆卸任务'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  派工单编号：{selectedDispatch.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={typeBadgeVariant(selectedDispatch.type)}>
                  {selectedDispatch.type === 'setup' ? '搭建' : '拆卸'}
                </Badge>
                <Badge variant={statusBadgeVariant(selectedDispatch.status)}>
                  {getStatusText(selectedDispatch.status)}
                </Badge>
              </div>
            </div>

            {(() => {
              const order = getOrder(selectedDispatch.orderId);
              const builder = getBuilder(selectedDispatch.builderId);
              
              return (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">订单信息</p>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{order?.orderNo}</span>
                    </div>
                    {order?.eventName && (
                      <p className="text-sm text-gray-600 ml-6">{order.eventName}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">搭建队</p>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{selectedDispatch.builderName}</span>
                    </div>
                    {builder?.leaderName && (
                      <p className="text-sm text-gray-600 ml-6">
                        队长：{builder.leaderName} · {builder.phone}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">计划时间</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {formatDateTime(selectedDispatch.scheduledTime)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">任务地址</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{selectedDispatch.address}</span>
                    </div>
                  </div>

                  {selectedDispatch.startedAt && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">开始时间</p>
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-blue-700">
                          {formatDateTime(selectedDispatch.startedAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedDispatch.completedAt && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">完成时间</p>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-700">
                          {formatDateTime(selectedDispatch.completedAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {selectedDispatch.notes && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">备注信息</p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700">{selectedDispatch.notes}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">时间线</h4>
                <div className="space-y-4">
                  {getTimelineEvents(selectedDispatch).map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {event.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : event.status === 'in_progress' ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          </div>
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300" />
                        )}
                        {idx < getTimelineEvents(selectedDispatch).length - 1 && (
                          <div className={cn(
                            'w-0.5 flex-1 mt-1',
                            event.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'
                          )} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="text-xs text-gray-500">{event.time}</p>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">操作日志</h4>
                <div className="space-y-3">
                  {getOperationLogs(selectedDispatch).map((log, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900">{log.action}</span>
                        <span className="text-xs text-gray-500">{log.time}</span>
                      </div>
                      <p className="text-sm text-gray-600">操作人：{log.operator}</p>
                      <p className="text-sm text-gray-600">{log.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                关闭
              </Button>
              {selectedDispatch.status === 'pending' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleStartDispatch(selectedDispatch.id);
                    setDetailModalOpen(false);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  开始任务
                </Button>
              )}
              {selectedDispatch.status === 'in_progress' && (
                <Button
                  variant="success"
                  onClick={() => {
                    handleCompleteDispatch(selectedDispatch.id);
                    setDetailModalOpen(false);
                  }}
                >
                  <Check className="w-4 h-4 mr-2" />
                  完成任务
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="创建派工单"
        className="max-w-2xl"
      >
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="选择订单"
              value={formData.orderId}
              onChange={e => {
                const order = getOrder(e.target.value);
                setFormData({
                  ...formData,
                  orderId: e.target.value,
                  address: order?.address || ''
                });
              }}
              options={orderOptions}
            />
            <Select
              label="搭建队"
              value={formData.builderId}
              onChange={e => setFormData({ ...formData, builderId: e.target.value })}
              options={[
                { value: '', label: '请选择搭建队' },
                ...builderTeams.map(b => ({ value: b.id, label: b.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="任务类型"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'setup' | 'teardown' })}
              options={[
                { value: 'setup', label: '搭建' },
                { value: 'teardown', label: '拆卸' }
              ]}
            />
            <Input
              label="计划时间"
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
            />
          </div>

          <Input
            label="任务地址"
            value={formData.address}
            onChange={e => setFormData({ ...formData, address: e.target.value })}
            placeholder="请输入任务地址"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">备注信息</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="可选填写其他备注信息"
            />
          </div>

          {formData.orderId && (() => {
            const order = getOrder(formData.orderId);
            const builder = getBuilder(formData.builderId);
            if (!order) return null;
            
            return (
              <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-blue-800">订单信息预览</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600">活动名称：</span>
                    <span className="text-blue-900">{order.eventName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">客户名称：</span>
                    <span className="text-blue-900">{order.customerName}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">租赁时段：</span>
                    <span className="text-blue-900">
                      {formatDateTime(order.startDate)} ~ {formatDateTime(order.endDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">设备数量：</span>
                    <span className="text-blue-900">{order.equipmentIds.length} 件</span>
                  </div>
                </div>
                {builder && (
                  <div className="pt-2 border-t border-blue-200">
                    <p className="text-sm">
                      <span className="text-blue-600">搭建队：</span>
                      <span className="text-blue-900 font-medium">{builder.name}</span>
                      <span className="text-blue-600 ml-4">队长：</span>
                      <span className="text-blue-900">{builder.leaderName}</span>
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateDispatch}>
              <Plus className="w-4 h-4 mr-2" />
              创建派工单
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
