import { useMemo } from 'react';
import { 
  ShoppingCart, 
  AlertTriangle, 
  Handshake, 
  Clock,
  DollarSign,
  Calendar
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { StatCard } from '@/components/Layout/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useOrderStore } from '@/store/useOrderStore';
import { useConflictStore } from '@/store/useConflictStore';
import { useMatchingStore } from '@/store/useMatchingStore';
import { useDispatchStore } from '@/store/useDispatchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatDate, getStatusText, getStatusColor } from '@/utils/dateUtils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { orders } = useOrderStore();
  const { getActiveConflicts } = useConflictStore();
  const { getMutualMatches } = useMatchingStore();
  const { getPendingDispatches, dispatchOrders } = useDispatchStore();
  const { user } = useAuthStore();

  const activeConflicts = getActiveConflicts();
  const mutualMatches = getMutualMatches();
  const pendingDispatches = getPendingDispatches();

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
      activeConflicts: activeConflicts.length,
      matchedToday: mutualMatches.length,
      revenue: `¥${totalRevenue.toLocaleString()}`,
      dispatchPending: pendingDispatches.length
    };
  }, [orders, activeConflicts, mutualMatches, pendingDispatches]);

  const recentOrders = orders.slice(0, 5);
  const upcomingDispatches = dispatchOrders
    .filter(d => d.status !== 'completed')
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title={`欢迎回来，${user?.name}`}
        description={`今天是 ${formatDate(new Date().toISOString(), 'yyyy年MM月dd日 EEEE')}，祝您工作顺利！`}
      />

      {activeConflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-800">发现 {activeConflicts.length} 个时段冲突需要处理</p>
              <p className="text-sm text-red-600">请尽快前往冲突检测页面处理</p>
            </div>
          </div>
          <Link to="/conflicts">
            <Button variant="danger" size="sm">立即处理</Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="总订单数"
          value={stats.totalOrders}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="待确认订单"
          value={stats.pendingOrders}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="待处理冲突"
          value={stats.activeConflicts}
          icon={AlertTriangle}
          color={activeConflicts.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="成功匹配"
          value={stats.matchedToday}
          icon={Handshake}
          color="green"
        />
        <StatCard
          title="累计营收"
          value={stats.revenue}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="待派工"
          value={stats.dispatchPending}
          icon={Calendar}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近订单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNo}</p>
                      <p className="text-sm text-gray-500">{order.eventName || order.customerName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={
                      order.status === 'completed' ? 'success' :
                      order.status === 'cancelled' ? 'default' :
                      order.status === 'matched' ? 'purple' :
                      order.status === 'pending' ? 'warning' : 'info'
                    }>
                      {getStatusText(order.status)}
                    </Badge>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      ¥{order.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/orders" className="block mt-4">
              <Button variant="ghost" className="w-full">查看全部订单 →</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>待执行派工</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDispatches.length > 0 ? (
                upcomingDispatches.map(dispatch => (
                  <div 
                    key={dispatch.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        dispatch.type === 'setup' ? 'bg-green-100' : 'bg-amber-100'
                      )}>
                        <Calendar className={cn(
                          'w-5 h-5',
                          dispatch.type === 'setup' ? 'text-green-600' : 'text-amber-600'
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {dispatch.type === 'setup' ? '搭建任务' : '拆卸任务'}
                        </p>
                        <p className="text-sm text-gray-500">{dispatch.builderName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(dispatch.status)}>
                        {getStatusText(dispatch.status)}
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDate(dispatch.scheduledTime, 'MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>暂无待执行派工</p>
                </div>
              )}
            </div>
            <Link to="/dispatch" className="block mt-4">
              <Button variant="ghost" className="w-full">查看全部派工 →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
