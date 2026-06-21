import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { FitScore } from '@/types';

interface RadarChartProps {
  data: FitScore;
  height?: number;
}

export const RadarChart = ({ data, height = 250 }: RadarChartProps) => {
  const chartData = [
    { subject: '价格契合', A: data.priceFit, fullMark: 100 },
    { subject: '时间契合', A: data.timeFit, fullMark: 100 },
    { subject: '经验契合', A: data.experienceFit, fullMark: 100 },
    { subject: '技能契合', A: data.skillFit, fullMark: 100 },
    { subject: '评价契合', A: data.ratingFit, fullMark: 100 }
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsRadar data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: '#6b7280', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 100]} 
          tick={{ fill: '#9ca3af', fontSize: 10 }}
        />
        <Radar
          name="契合度"
          dataKey="A"
          stroke="#1e40af"
          fill="#1e40af"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip 
          formatter={(value: number) => [`${value}分`, '得分']}
          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
};
