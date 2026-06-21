import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
}

export default function Empty({ 
  title = '暂无数据', 
  description, 
  icon: Icon,
  className 
}: EmptyProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {Icon && (
        <Icon className="w-12 h-12 text-gray-300 mb-4" />
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 max-w-md">{description}</p>
      )}
    </div>
  );
}
