import { useState, useMemo } from 'react';
import {
  Handshake,
  Eye,
  Check,
  Users,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  User,
  Building2,
  Calendar,
  MapPin,
  Filter
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/Layout/StatCard';
import { RadarChart } from '@/components/charts/RadarChart';
import Empty from '@/components/Empty';
import { useMatchingStore } from '@/store/useMatchingStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useDispatchStore } from '@/store/useDispatchStore';
import { formatDateTime, getStatusText } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Willingness, Order, BuilderTeam, FitScore } from '@/types';

type MatchStatus = 'all' | 'pending' | 'one_sided' | 'mutual';

const statusFilters: { value: MatchStatus; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: '待撮合', color: 'bg-amber-100 text-amber-800' },
  { value: 'one_sided', label: '单方意愿', color: 'bg-blue-100 text-blue-800' },
  { value: 'mutual', label: '互选成功', color: 'bg-green-100 text-green-800' }
];

const getMatchStatus = (willingness: Willingness): MatchStatus => {
  const { customerWilling, builderWilling, mutualMatch } = willingness;
  if (mutualMatch) return 'mutual';
  if (customerWilling === null && builderWilling === null) return 'pending';
  return 'one_sided';
};

const getWillingnessBadge = (value: boolean | null) => {
  if (value === true) {
    return <Badge variant="success"><ThumbsUp className="w-3 h-3 mr-1" />愿意</Badge>;
  }
  if (value === false) {
    return <Badge variant="danger"><ThumbsDown className="w-3 h-3 mr-1" />不愿意</Badge>;
  }
  return <Badge variant="default"><HelpCircle className="w-3 h-3 mr-1" />待确认</Badge>;
};

const getScoreColor = (score: number) => {
  if (score >= 90) return 'text-emerald-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-amber-600';
  return 'text-gray-600';
};

const getScoreBg = (score: number) => {
  if (score >= 90) return 'bg-emerald-50 border-emerald-200';
  if (score >= 80) return 'bg-blue-50 border-blue-200';
  if (score >= 70) return 'bg-amber-50 border-amber-200';
  return 'bg-gray-50 border-gray-200';
};

export default function MatchResults() {
  const { willingness, builderTeams, calculateFitScore } = useMatchingStore();
  const { orders, getOrderById, updateOrder } = useOrderStore();
  const { createDispatchOrder } = useDispatchStore();

  const [statusFilter, setStatusFilter] = useState<MatchStatus>('all');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedWillingness, setSelectedWillingness] = useState<Willingness | null>(null);

  const stats = useMemo(() => {
    const totalOrders = new Set(willingness.map(w => w.orderId)).size;
    const pending = willingness.filter(w => 
      w.customerWilling === null && w.builderWilling === null
    ).length;
    const oneSided = willingness.filter(w => 
      !w.mutualMatch && (w.customerWilling !== null || w.builderWilling !== null)
    ).length;
    const mutual = willingness.filter(w => w.mutualMatch).length;
    return { totalOrders, pending, oneSided, mutual };
  }, [willingness]);

  const filteredWillingness = useMemo(() => {
    let result = [...willingness];

    if (statusFilter !== 'all') {
      result = result.filter(w => getMatchStatus(w) === statusFilter);
    }

    return result.sort((a, b) => b.fitScore - a.fitScore);
  }, [willingness, statusFilter]);

  const getOrder = (orderId: string): Order | undefined => {
    return getOrderById(orderId);
  };

  const getBuilder = (builderId: string): BuilderTeam | undefined => {
    return builderTeams.find(b => b.id === builderId);
  };

  const getFitScoreDetail = (willingness: Willingness): FitScore | null => {
    const order = getOrder(willingness.orderId);
    const builder = getBuilder(willingness.builderId);
    if (!order || !builder) return null;
    return calculateFitScore(order, builder);
  };

  const handleViewDetail = (willingness: Willingness) => {
    setSelectedWillingness(willingness);
    setDetailModalOpen(true);
  };

  const handleConfirmClick = (willingness: Willingness) => {
    setSelectedWillingness(willingness);
    setConfirmModalOpen(true);
  };

  const handleConfirmMatch = () => {
    if (!selectedWillingness) return;

    const order = getOrder(selectedWillingness.orderId);
    const builder = getBuilder(selectedWillingness.builderId);

    if (!order || !builder) return;

    updateOrder(order.id, { status: 'matched' });

    createDispatchOrder({
      orderId: order.id,
      builderId: builder.id,
      builderName: builder.name,
      type: 'setup',
      scheduledTime: order.startDate,
      address: order.address || '',
      status: 'pending',
      notes: `通过互选撮合，契合度分数：${selectedWillingness.fitScore}分`
    });

    createDispatchOrder({
      orderId: order.id,
      builderId: builder.id,
      builderName: builder.name,
      type: 'teardown',
      scheduledTime: order.endDate,
      address: order.address || '',
      status: 'pending',
      notes: `通过互选撮合，契合度分数：${selectedWillingness.fitScore}分`
    });

    setConfirmModalOpen(false);
    setDetailModalOpen(false);
    setSelectedWillingness(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="匹配结果"
        description="查看撮合匹配结果，管理互选成功的订单和搭建队配对"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="总订单数"
          value={stats.totalOrders}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="待撮合数"
          value={stats.pending}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="单方意愿数"
          value={stats.oneSided}
          icon={AlertCircle}
          color="purple"
        />
        <StatCard
          title="互选成功数"
          value={stats.mutual}
          icon={Handshake}
          color="green"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex gap-2">
            {statusFilters.map(filter => {
              const count = filter.value === 'all' 
                ? willingness.length
                : willingness.filter(w => getMatchStatus(w) === filter.value).length;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    statusFilter === filter.value
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {filter.label}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          共 <span className="font-medium text-gray-900">{filteredWillingness.length}</span> 条记录
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredWillingness.length === 0 ? (
            <Empty
              icon={Handshake}
              title="暂无匹配记录"
              description="当前筛选条件下没有匹配记录"
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredWillingness.map(item => {
                const order = getOrder(item.orderId);
                const builder = getBuilder(item.builderId);
                const matchStatus = getMatchStatus(item);

                if (!order || !builder) return null;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-6 hover:bg-gray-50 transition-colors cursor-pointer',
                      matchStatus === 'mutual' && 'bg-green-50/50'
                    )}
                    onClick={() => handleViewDetail(item)}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center border-2',
                            getScoreBg(item.fitScore)
                          )}>
                            <span className={cn('text-lg font-bold', getScoreColor(item.fitScore))}>
                              {item.fitScore}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {order.orderNo}
                              </h3>
                              {matchStatus === 'mutual' && (
                                <Badge variant="success">
                                  <Handshake className="w-3 h-3 mr-1" />
                                  互选成功
                                </Badge>
                              )}
                              {matchStatus === 'one_sided' && (
                                <Badge variant="info">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  单方意愿
                                </Badge>
                              )}
                              {matchStatus === 'pending' && (
                                <Badge variant="warning">
                                  <Clock className="w-3 h-3 mr-1" />
                                  待撮合
                                </Badge>
                              )}
                            </div>
                            {order.eventName && (
                              <p className="text-sm text-gray-500 mt-0.5">{order.eventName}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">客户</p>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm text-gray-700">{order.customerName}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">搭建队</p>
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm text-gray-700">{builder.name}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">活动时间</p>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                {formatDateTime(order.startDate).slice(0, 10)}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-400">活动地址</p>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-sm text-gray-700 truncate" title={order.address}>
                                {order.address || '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">客户意愿：</span>
                            {getWillingnessBadge(item.customerWilling)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">搭建队意愿：</span>
                            {getWillingnessBadge(item.builderWilling)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">契合度：</span>
                            <span className={cn('text-sm font-semibold', getScoreColor(item.fitScore))}>
                              {item.fitScore}分
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(item)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看详情
                        </Button>
                        {item.mutualMatch && order.status !== 'matched' && order.status !== 'dispatched' && order.status !== 'completed' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleConfirmClick(item)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            确认成交
                          </Button>
                        )}
                        {order.status === 'matched' && (
                          <Badge variant="purple">
                            {getStatusText(order.status)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="匹配详情"
        className="max-w-3xl"
      >
        {selectedWillingness && (() => {
          const order = getOrder(selectedWillingness.orderId);
          const builder = getBuilder(selectedWillingness.builderId);
          const fitScore = getFitScoreDetail(selectedWillingness);

          if (!order || !builder) return null;

          return (
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{order.orderNo}</h3>
                  <p className="text-sm text-gray-500 mt-1">{order.eventName}</p>
                </div>
                <div className={cn(
                  'px-4 py-2 rounded-xl border-2',
                  getScoreBg(selectedWillingness.fitScore)
                )}>
                  <p className="text-xs text-gray-500 text-center">契合度</p>
                  <p className={cn('text-2xl font-bold text-center', getScoreColor(selectedWillingness.fitScore))}>
                    {selectedWillingness.fitScore}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">客户</p>
                        <p className="font-medium text-gray-900">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">意愿状态</span>
                      {getWillingnessBadge(selectedWillingness.customerWilling)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">搭建队</p>
                        <p className="font-medium text-gray-900">{builder.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">意愿状态</span>
                      {getWillingnessBadge(selectedWillingness.builderWilling)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">创建时间</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(selectedWillingness.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">更新时间</p>
                  <p className="text-sm text-gray-700">
                    {formatDateTime(selectedWillingness.updatedAt)}
                  </p>
                </div>
              </div>

              {fitScore && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">契合度分析</p>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <RadarChart data={fitScore} height={280} />
                    <div className="grid grid-cols-5 gap-2 mt-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">价格契合</p>
                        <p className="font-semibold text-blue-600">{fitScore.priceFit}分</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">时间契合</p>
                        <p className="font-semibold text-blue-600">{fitScore.timeFit}分</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">经验契合</p>
                        <p className="font-semibold text-blue-600">{fitScore.experienceFit}分</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">技能契合</p>
                        <p className="font-semibold text-blue-600">{fitScore.skillFit}分</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">评价契合</p>
                        <p className="font-semibold text-blue-600">{fitScore.ratingFit}分</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">订单信息</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {formatDateTime(order.startDate)} 至 {formatDateTime(order.endDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{order.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.status === 'matched' ? 'purple' : 'info'}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">搭建队信息</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">队长</span>
                    <span className="text-sm text-gray-700">{builder.leaderName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">联系电话</span>
                    <span className="text-sm text-gray-700">{builder.phone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">团队规模</span>
                    <span className="text-sm text-gray-700">{builder.teamSize}人</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">从业经验</span>
                    <span className="text-sm text-gray-700">{builder.experience}年</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">评分</span>
                    <span className="text-sm text-amber-600 font-medium">★ {builder.rating}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {builder.skills.map(skill => (
                      <Badge key={skill} variant="default">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setDetailModalOpen(false)}>
                  关闭
                </Button>
                {selectedWillingness.mutualMatch && order.status !== 'matched' && order.status !== 'dispatched' && order.status !== 'completed' && (
                  <Button
                    variant="success"
                    onClick={() => {
                      setDetailModalOpen(false);
                      handleConfirmClick(selectedWillingness);
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    确认成交
                  </Button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="确认成交"
        className="max-w-md"
      >
        {selectedWillingness && (() => {
          const order = getOrder(selectedWillingness.orderId);
          const builder = getBuilder(selectedWillingness.builderId);

          if (!order || !builder) return null;

          return (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">确认成交匹配</h3>
                <p className="text-sm text-gray-500 mt-2">
                  确认后将更新订单状态为「已匹配」，并自动生成派工单
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">订单号</span>
                  <span className="text-sm font-medium text-gray-900">{order.orderNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">客户</span>
                  <span className="text-sm text-gray-700">{order.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">搭建队</span>
                  <span className="text-sm text-gray-700">{builder.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">契合度</span>
                  <span className={cn('text-sm font-bold', getScoreColor(selectedWillingness.fitScore))}>
                    {selectedWillingness.fitScore}分
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">操作提示</p>
                    <p className="text-sm text-amber-600 mt-1">
                      确认成交后，将生成搭建和拆除两张派工单，不可撤销。请确认双方意愿无误。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setConfirmModalOpen(false)}>
                  取消
                </Button>
                <Button variant="success" onClick={handleConfirmMatch}>
                  <Check className="w-4 h-4 mr-2" />
                  确认成交
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
