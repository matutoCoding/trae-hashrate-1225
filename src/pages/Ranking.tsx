import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Star,
  Clock,
  Users,
  Award,
  TrendingUp,
  DollarSign,
  Filter,
  ArrowUpDown,
  Crown,
  Zap,
  Target,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RadarChart } from '@/components/charts/RadarChart';
import Empty from '@/components/Empty';
import { useOrderStore } from '@/store/useOrderStore';
import { useMatchingStore } from '@/store/useMatchingStore';
import { calculateFitScore } from '@/utils/fitScoreCalculator';
import { cn } from '@/lib/utils';
import type { Order, BuilderTeam, FitScore, CustomerPreferences } from '@/types';
import { formatDateRange } from '@/utils/dateUtils';

type PriceLevelFilter = 'all' | 'economy' | 'standard' | 'premium';
type SortField = 'totalScore' | 'price' | 'experience' | 'rating';

const priceLevelLabels: Record<string, string> = {
  economy: '经济',
  standard: '标准',
  premium: '高端'
};

const priceLevelColors: Record<string, string> = {
  economy: 'bg-emerald-100 text-emerald-700',
  standard: 'bg-blue-100 text-blue-700',
  premium: 'bg-purple-100 text-purple-700'
};

const sortOptions = [
  { value: 'totalScore', label: '综合得分' },
  { value: 'price', label: '价格' },
  { value: 'experience', label: '经验' },
  { value: 'rating', label: '评分' }
];

const priceFilterOptions = [
  { value: 'all', label: '全部价格等级' },
  { value: 'economy', label: '经济' },
  { value: 'standard', label: '标准' },
  { value: 'premium', label: '高端' }
];

const ratingFilterOptions = [
  { value: '0', label: '全部评分' },
  { value: '3', label: '3分以上' },
  { value: '4', label: '4分以上' },
  { value: '4.5', label: '4.5分以上' }
];

interface BuilderWithScore extends BuilderTeam {
  fitScore: FitScore;
  recommendationTag?: 'best' | 'value' | 'experienced';
}

export default function Ranking() {
  const { orders } = useOrderStore();
  const { builderTeams } = useMatchingStore();

  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [priceLevelFilter, setPriceLevelFilter] = useState<PriceLevelFilter>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<string>('0');
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('totalScore');

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const availableOrders = useMemo(() => {
    return orders.filter(o => o.status === 'confirmed' || o.status === 'matched');
  }, [orders]);

  const allSkills = useMemo(() => {
    const skills = new Set<string>();
    builderTeams.forEach(b => b.skills.forEach(s => skills.add(s)));
    return Array.from(skills);
  }, [builderTeams]);

  const skillOptions = useMemo(() => {
    return [
      { value: '', label: '全部技能' },
      ...allSkills.map(s => ({ value: s, label: s }))
    ];
  }, [allSkills]);

  const rankedBuilders = useMemo<BuilderWithScore[]>(() => {
    if (!selectedOrder) return [];

    const preferences: CustomerPreferences = {
      preferredPriceLevel: priceLevelFilter !== 'all' ? priceLevelFilter : undefined,
      minRating: parseFloat(minRatingFilter) > 0 ? parseFloat(minRatingFilter) : undefined,
      requiredSkills: skillFilter ? [skillFilter] : undefined
    };

    let result = builderTeams.map(builder => ({
      ...builder,
      fitScore: calculateFitScore(selectedOrder, builder, preferences)
    }));

    if (priceLevelFilter !== 'all') {
      result = result.filter(b => b.priceLevel === priceLevelFilter);
    }

    if (parseFloat(minRatingFilter) > 0) {
      result = result.filter(b => b.rating >= parseFloat(minRatingFilter));
    }

    if (skillFilter) {
      result = result.filter(b => b.skills.includes(skillFilter));
    }

    result = result.sort((a, b) => {
      switch (sortField) {
        case 'totalScore':
          return b.fitScore.totalScore - a.fitScore.totalScore;
        case 'price':
          const priceOrder = { economy: 0, standard: 1, premium: 2 };
          return priceOrder[a.priceLevel] - priceOrder[b.priceLevel];
        case 'experience':
          return b.experience - a.experience;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    const maxScore = Math.max(...result.map(b => b.fitScore.totalScore), 0);
    const maxExperience = Math.max(...result.map(b => b.experience), 0);

    return result.map((builder, index) => {
      let recommendationTag: 'best' | 'value' | 'experienced' | undefined;

      if (index === 0 && builder.fitScore.totalScore >= 85) {
        recommendationTag = 'best';
      } else if (builder.priceLevel === 'economy' && builder.fitScore.totalScore >= 70) {
        recommendationTag = 'value';
      } else if (builder.experience >= 8 && builder.experience === maxExperience) {
        recommendationTag = 'experienced';
      }

      return {
        ...builder,
        recommendationTag
      };
    });
  }, [selectedOrder, builderTeams, priceLevelFilter, minRatingFilter, skillFilter, sortField]);

  const getRecommendationBadge = (tag?: 'best' | 'value' | 'experienced') => {
    if (!tag) return null;

    const config = {
      best: {
        icon: Crown,
        label: '最佳匹配',
        className: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
      },
      value: {
        icon: Zap,
        label: '高性价比',
        className: 'bg-gradient-to-r from-emerald-400 to-green-500 text-white'
      },
      experienced: {
        icon: Award,
        label: '经验丰富',
        className: 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white'
      }
    };

    const { icon: Icon, label, className } = config[tag];

    return (
      <Badge className={cn('gap-1', className)}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'from-emerald-500 to-green-600';
    if (score >= 80) return 'from-blue-500 to-indigo-600';
    if (score >= 70) return 'from-amber-500 to-orange-600';
    return 'from-gray-400 to-gray-500';
  };

  const getProgressColor = (score: number): 'blue' | 'green' | 'amber' | 'red' | 'purple' => {
    if (score >= 90) return 'green';
    if (score >= 80) return 'blue';
    if (score >= 70) return 'amber';
    return 'red';
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setPriceLevelFilter('all');
    setMinRatingFilter('0');
    setSkillFilter('');
    setSortField('totalScore');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="契合排序"
        description="为订单智能匹配最合适的搭建团队，查看多维度契合度评分"
      />

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Select
                label="选择订单"
                value={selectedOrderId}
                onChange={e => handleOrderChange(e.target.value)}
                options={[
                  { value: '', label: '请选择要查看匹配的订单' },
                  ...availableOrders.map(o => ({
                    value: o.id,
                    label: `${o.orderNo} - ${o.eventName || o.customerName}`
                  }))
                ]}
              />
            </div>

            {selectedOrder && (
              <div className="flex-1 lg:max-w-sm p-4 bg-blue-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-blue-900 truncate">
                      {selectedOrder.eventName || selectedOrder.orderNo}
                    </p>
                    <p className="text-sm text-blue-600">
                      {formatDateRange(selectedOrder.startDate, selectedOrder.endDate)}
                    </p>
                    <p className="text-sm text-blue-600">
                      ¥{selectedOrder.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedOrder && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-medium text-gray-900">筛选条件</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                label="价格等级"
                value={priceLevelFilter}
                onChange={e => setPriceLevelFilter(e.target.value as PriceLevelFilter)}
                options={priceFilterOptions}
              />

              <Select
                label="最低评分"
                value={minRatingFilter}
                onChange={e => setMinRatingFilter(e.target.value)}
                options={ratingFilterOptions}
              />

              <Select
                label="技能筛选"
                value={skillFilter}
                onChange={e => setSkillFilter(e.target.value)}
                options={skillOptions}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">排序方式</label>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {sortOptions.map(opt => (
                      <Button
                        key={opt.value}
                        variant={sortField === opt.value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setSortField(opt.value as SortField)}
                        className={cn(
                          'px-3 py-1',
                          sortField === opt.value ? 'bg-blue-700 text-white' : 'text-gray-600'
                        )}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOrder ? (
        rankedBuilders.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                共找到 <span className="font-medium text-gray-900">{rankedBuilders.length}</span> 个匹配的搭建团队
              </p>
            </div>

            {rankedBuilders.map((builder, index) => (
              <Card
                key={builder.id}
                hover
                className={cn(
                  'overflow-hidden',
                  index === 0 && 'ring-2 ring-blue-500 ring-offset-2'
                )}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg',
                            'bg-gradient-to-br',
                            getScoreBgColor(builder.fitScore.totalScore)
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {builder.name}
                              </h3>
                              {getRecommendationBadge(builder.recommendationTag)}
                            </div>
                            <p className="text-sm text-gray-500">
                              队长：{builder.leaderName} · {builder.teamSize}人团队
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={cn(
                            'text-4xl font-bold',
                            getScoreColor(builder.fitScore.totalScore)
                          )}>
                            {builder.fitScore.totalScore}
                            <span className="text-lg font-normal text-gray-400 ml-1">分</span>
                          </div>
                          <p className="text-sm text-gray-500">综合契合度</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm">价格等级</span>
                          </div>
                          <Badge className={priceLevelColors[builder.priceLevel]}>
                            {priceLevelLabels[builder.priceLevel]}
                          </Badge>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">从业经验</span>
                          </div>
                          <p className="font-semibold text-gray-900">{builder.experience}年</p>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2 text-gray-500 mb-1">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="text-sm">综合评分</span>
                          </div>
                          <p className="font-semibold text-gray-900">{builder.rating}分</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                          <Target className="w-4 h-4" />
                          <span className="text-sm">技能标签</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {builder.skills.map(skill => (
                            <Badge
                              key={skill}
                              variant="info"
                              className={cn(
                                skillFilter === skill && 'ring-2 ring-blue-500 ring-offset-1'
                              )}
                            >
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-sm">完成订单</span>
                        </div>
                        <p className="font-semibold text-gray-900">{builder.completedOrders}单</p>
                      </div>
                    </div>

                    <div className="flex-1 p-6">
                      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-600" />
                        五维契合度分析
                      </h4>

                      <div className="mb-6">
                        <RadarChart data={builder.fitScore} height={220} />
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">价格契合</span>
                            <span className="text-sm font-medium text-gray-900">
                              {builder.fitScore.priceFit}分
                            </span>
                          </div>
                          <ProgressBar
                            value={builder.fitScore.priceFit}
                            color={getProgressColor(builder.fitScore.priceFit)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">时间契合</span>
                            <span className="text-sm font-medium text-gray-900">
                              {builder.fitScore.timeFit}分
                            </span>
                          </div>
                          <ProgressBar
                            value={builder.fitScore.timeFit}
                            color={getProgressColor(builder.fitScore.timeFit)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">经验契合</span>
                            <span className="text-sm font-medium text-gray-900">
                              {builder.fitScore.experienceFit}分
                            </span>
                          </div>
                          <ProgressBar
                            value={builder.fitScore.experienceFit}
                            color={getProgressColor(builder.fitScore.experienceFit)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">技能契合</span>
                            <span className="text-sm font-medium text-gray-900">
                              {builder.fitScore.skillFit}分
                            </span>
                          </div>
                          <ProgressBar
                            value={builder.fitScore.skillFit}
                            color={getProgressColor(builder.fitScore.skillFit)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">评价契合</span>
                            <span className="text-sm font-medium text-gray-900">
                              {builder.fitScore.ratingFit}分
                            </span>
                          </div>
                          <ProgressBar
                            value={builder.fitScore.ratingFit}
                            color={getProgressColor(builder.fitScore.ratingFit)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Empty
            icon={Users}
            title="没有找到匹配的搭建团队"
            description="请尝试调整筛选条件，或选择其他订单查看匹配结果"
          />
        )
      ) : (
        <Empty
          icon={ShoppingCart}
          title="请先选择订单"
          description="从上方的订单选择器中选择一个订单，查看为该订单匹配的搭建团队"
        />
      )}
    </div>
  );
}
