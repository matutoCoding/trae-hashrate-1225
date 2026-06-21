import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Empty from '@/components/Empty';
import { useMatchingStore } from '@/store/useMatchingStore';
import { useOrderStore } from '@/store/useOrderStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { Order, Willingness, BuilderTeam } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type MatchStatus = 'unselected' | 'one_sided' | 'mutual' | 'rejected';

const getMatchStatus = (willingness: Willingness): MatchStatus => {
  if (willingness.customerWilling === false || willingness.builderWilling === false) {
    return 'rejected';
  }
  if (willingness.mutualMatch) return 'mutual';
  if (willingness.customerWilling === true || willingness.builderWilling === true) return 'one_sided';
  return 'unselected';
};

const getStatusLabel = (status: MatchStatus): string => {
  const labels: Record<MatchStatus, string> = {
    unselected: '未选择',
    one_sided: '单方意愿',
    mutual: '双向匹配',
    rejected: '已拒绝'
  };
  return labels[status];
};

const getStatusVariant = (status: MatchStatus): 'default' | 'warning' | 'success' | 'danger' => {
  const variants: Record<MatchStatus, 'default' | 'warning' | 'success' | 'danger'> = {
    unselected: 'default',
    one_sided: 'warning',
    mutual: 'success',
    rejected: 'danger'
  };
  return variants[status];
};

interface MatchSuccessAnimationProps {
  show: boolean;
  onComplete: () => void;
}

const MatchSuccessAnimation = ({ show, onComplete }: MatchSuccessAnimationProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2500);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" style={{ animationDuration: '1.5s' }} />
        <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-2xl">
          <div className="text-center text-white">
            <svg className="mx-auto h-16 w-16 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animationDuration: '0.6s' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            <p className="mt-2 text-lg font-bold">匹配成功!</p>
          </div>
        </div>
        <div className="absolute -inset-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 rounded-full bg-amber-400"
              style={{
                top: '50%',
                left: '50%',
                animation: `sparkle 1.5s ease-out forwards`,
                animationDelay: `${i * 0.1}s`,
                transform: `rotate(${i * 45}deg) translateY(-80px)`
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes sparkle {
          0% { opacity: 1; transform: rotate(var(--rotation)) translateY(0) scale(1); }
          100% { opacity: 0; transform: rotate(var(--rotation)) translateY(-120px) scale(0); }
        }
      `}</style>
    </div>
  );
};

interface WillingnessCardProps {
  willingness: Willingness;
  builder: BuilderTeam | undefined;
  order: Order | undefined;
  isCustomerView: boolean;
  onCustomerWilling: (willing: boolean) => void;
  onBuilderWilling: (willing: boolean) => void;
  onMatchSuccess: () => void;
}

const WillingnessCard = ({
  willingness,
  builder,
  order,
  isCustomerView,
  onCustomerWilling,
  onBuilderWilling,
  onMatchSuccess
}: WillingnessCardProps) => {
  const status = getMatchStatus(willingness);
  const { calculateFitScore } = useMatchingStore();

  const handleCustomerWilling = (willing: boolean) => {
    const wasMutual = willingness.mutualMatch;
    onCustomerWilling(willing);
    if (willing && willingness.builderWilling === true && !wasMutual) {
      onMatchSuccess();
    }
  };

  const handleBuilderWilling = (willing: boolean) => {
    const wasMutual = willingness.mutualMatch;
    onBuilderWilling(willing);
    if (willing && willingness.customerWilling === true && !wasMutual) {
      onMatchSuccess();
    }
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getFitScoreBg = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-emerald-600';
    if (score >= 75) return 'from-blue-500 to-blue-600';
    if (score >= 60) return 'from-amber-500 to-amber-600';
    return 'from-gray-500 to-gray-600';
  };

  if (!builder || !order) return null;

  const fitScore = calculateFitScore(order, builder);

  return (
    <Card
      hover
      className={cn(
        'transition-all duration-500',
        status === 'mutual' && 'ring-2 ring-amber-400 shadow-amber-100 shadow-lg'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-md', getFitScoreBg(fitScore.totalScore))}>
              {Math.round(fitScore.totalScore)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{builder.name}</h4>
              <p className="text-sm text-gray-500">队长: {builder.leaderName}</p>
            </div>
          </div>
          <Badge variant={getStatusVariant(status)}>
            {getStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-gray-600">{builder.teamSize}人</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-gray-600">{builder.rating}分</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-gray-600">{builder.experience}年经验</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {builder.skills.slice(0, 4).map((skill, idx) => (
            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
              {skill}
            </span>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">客户意愿</span>
            <span className={cn('font-medium', willingness.customerWilling === true ? 'text-emerald-600' : willingness.customerWilling === false ? 'text-red-600' : 'text-gray-400')}>
              {willingness.customerWilling === true ? '愿意' : willingness.customerWilling === false ? '不愿意' : '待选择'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">搭建队意愿</span>
            <span className={cn('font-medium', willingness.builderWilling === true ? 'text-emerald-600' : willingness.builderWilling === false ? 'text-red-600' : 'text-gray-400')}>
              {willingness.builderWilling === true ? '愿意' : willingness.builderWilling === false ? '不愿意' : '待选择'}
            </span>
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">契合度分析</span>
            <span className={cn('font-semibold', getFitScoreColor(fitScore.totalScore))}>
              综合 {Math.round(fitScore.totalScore)}分
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">价格</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${fitScore.priceFit}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{fitScore.priceFit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">时间</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${fitScore.timeFit}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{fitScore.timeFit}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">经验</span>
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500" style={{ width: `${fitScore.experienceFit}%` }} />
              </div>
              <span className="text-xs text-gray-600 w-8 text-right">{fitScore.experienceFit}</span>
            </div>
          </div>
        </div>
      </CardContent>

      {(isCustomerView ? willingness.customerWilling === null : willingness.builderWilling === null) && status !== 'rejected' && (
        <CardFooter className="flex gap-3">
          <Button
            variant="success"
            size="sm"
            className="flex-1"
            onClick={() => isCustomerView ? handleCustomerWilling(true) : handleBuilderWilling(true)}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            愿意合作
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-gray-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => isCustomerView ? handleCustomerWilling(false) : handleBuilderWilling(false)}
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            暂不考虑
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

interface OrderCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: () => void;
}

const OrderCard = ({ order, isSelected, onSelect }: OrderCardProps) => {
  const getStatusBadge = (status: Order['status']) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'info' | 'danger'; label: string }> = {
      pending: { variant: 'warning', label: '待确认' },
      confirmed: { variant: 'info', label: '已确认' },
      matched: { variant: 'success', label: '已匹配' },
      dispatched: { variant: 'info', label: '已派单' },
      completed: { variant: 'success', label: '已完成' },
      cancelled: { variant: 'danger', label: '已取消' }
    };
    return variants[status] || { variant: 'default', label: status };
  };

  const statusBadge = getStatusBadge(order.status);

  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-4 rounded-xl border-2 cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-blue-600 bg-blue-50 shadow-md'
          : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900">{order.eventName || '活动订单'}</h4>
          <p className="text-sm text-gray-500">{order.orderNo}</p>
        </div>
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>
      <div className="space-y-1.5 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="truncate">{order.address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {format(new Date(order.startDate), 'MM/dd')} - {format(new Date(order.endDate), 'MM/dd')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-gray-900">¥{order.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default function Matching() {
  const { user } = useAuthStore();
  const { orders, getOrdersByCustomer } = useOrderStore();
  const {
    willingness,
    builderTeams,
    setCustomerWilling,
    setBuilderWilling,
    getWillingnessByOrder,
    getWillingnessByBuilder,
    getRankedBuilders,
    createWillingness
  } = useMatchingStore();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const isCustomer = user?.role === 'customer';
  const isBuilder = user?.role === 'builder';
  const isAdmin = user?.role === 'admin';

  const pendingOrders = orders.filter(o => ['pending', 'confirmed'].includes(o.status));

  const customerOrders = user ? getOrdersByCustomer(user.id).filter(o => ['pending', 'confirmed', 'matched'].includes(o.status)) : [];

  const builderWillingness = user ? getWillingnessByBuilder(user.id).filter(w => {
    const order = orders.find(o => o.id === w.orderId);
    return order && ['pending', 'confirmed', 'matched'].includes(order.status);
  }) : [];

  const availableOrdersForBuilder = pendingOrders.filter(order => {
    const existing = builderWillingness.find(w => w.orderId === order.id);
    return !existing;
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const orderWillingness = selectedOrderId ? getWillingnessByOrder(selectedOrderId) : [];

  const handleApplyOrder = (order: Order) => {
    if (!user || !isBuilder) return;
    const ranked = getRankedBuilders(order);
    const currentBuilder = ranked.find(b => b.id === user.id);
    if (currentBuilder) {
      createWillingness(order.id, order.customerId, user.id, currentBuilder.fitScore.totalScore);
    }
  };

  const displayWillingness = isCustomer && selectedOrderId
    ? orderWillingness
    : isBuilder
    ? builderWillingness
    : [];

  const displayWillingnessSorted = [...displayWillingness].sort((a, b) => {
    const statusOrder: Record<MatchStatus, number> = { mutual: 0, one_sided: 1, unselected: 2, rejected: 3 };
    const statusA = statusOrder[getMatchStatus(a)];
    const statusB = statusOrder[getMatchStatus(b)];
    if (statusA !== statusB) return statusA - statusB;
    return b.fitScore - a.fitScore;
  });

  const stats = {
    total: willingness.length,
    oneSided: willingness.filter(w => getMatchStatus(w) === 'one_sided').length,
    mutual: willingness.filter(w => getMatchStatus(w) === 'mutual').length
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Empty title="请先登录" description="登录后查看撮合大厅" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MatchSuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">撮合大厅</h1>
          <p className="text-gray-500 mt-1">
            {isCustomer && '选择合适的搭建团队，完成活动搭建'}
            {isBuilder && '浏览可接订单，选择合适的合作机会'}
            {isAdmin && '查看所有撮合进度与匹配状态'}
          </p>
        </div>
        <Badge variant="info" className="text-sm px-3 py-1">
          当前身份: {isCustomer ? '客户' : isBuilder ? '搭建队' : '管理员'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">总意愿数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">单方意愿</p>
              <p className="text-2xl font-bold text-amber-600">{stats.oneSided}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">双向匹配</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.mutual}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {isCustomer && '我的订单'}
                {isBuilder && '可报名订单'}
                {isAdmin && '待撮合订单'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {isCustomer && customerOrders.length === 0 && <Empty description="暂无订单" />}
              {isBuilder && availableOrdersForBuilder.length === 0 && <Empty description="暂无可报名订单" />}
              {isAdmin && pendingOrders.length === 0 && <Empty description="暂无待撮合订单" />}

              {isCustomer && customerOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  onSelect={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                />
              ))}

              {isBuilder && availableOrdersForBuilder.map(order => (
                <div key={order.id} className="space-y-3">
                  <OrderCard
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onSelect={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                  />
                  {selectedOrderId === order.id && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleApplyOrder(order)}
                    >
                      <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      报名此订单
                    </Button>
                  )}
                </div>
              ))}

              {isAdmin && pendingOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderId === order.id}
                  onSelect={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                />
              ))}
            </CardContent>
          </Card>

          {isBuilder && builderWillingness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>我已报名</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
                {builderWillingness.map(w => {
                  const order = orders.find(o => o.id === w.orderId);
                  if (!order) return null;
                  return (
                    <OrderCard
                      key={w.id}
                      order={order}
                      isSelected={selectedOrderId === order.id}
                      onSelect={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {isCustomer && selectedOrder ? '申请的搭建队列表' : '搭建队意愿'}
                {isBuilder && '我的意愿登记'}
                {isAdmin && '撮合详情'}
              </CardTitle>
              {selectedOrder && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedOrder.eventName} · {selectedOrder.orderNo}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {displayWillingnessSorted.length === 0 ? (
                <Empty
                  description={
                    isCustomer
                      ? selectedOrder
                        ? '暂无搭建队申请，请耐心等待'
                        : '请选择一个订单查看申请的搭建队'
                      : isBuilder
                      ? '暂无意愿登记，可从左侧选择订单报名'
                      : '请选择订单查看撮合详情'
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayWillingnessSorted.map(w => {
                    const builder = builderTeams.find(b => b.id === w.builderId);
                    const order = orders.find(o => o.id === w.orderId);
                    return (
                      <WillingnessCard
                        key={w.id}
                        willingness={w}
                        builder={builder}
                        order={order}
                        isCustomerView={isCustomer}
                        onCustomerWilling={(willing) => setCustomerWilling(w.id, willing)}
                        onBuilderWilling={(willing) => setBuilderWilling(w.id, willing)}
                        onMatchSuccess={() => setShowSuccessAnimation(true)}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
