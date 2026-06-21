import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Calendar, 
  ShoppingCart, 
  AlertTriangle, 
  Handshake, 
  Trophy, 
  ListChecks,
  Users,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
  { path: '/dashboard', label: '仪表盘', icon: LayoutDashboard, roles: ['admin', 'customer', 'builder'] },
  { path: '/equipment', label: '设备管理', icon: Package, roles: ['admin'] },
  { path: '/calendar', label: '排期日历', icon: Calendar, roles: ['admin', 'customer', 'builder'] },
  { path: '/orders', label: '订单管理', icon: ShoppingCart, roles: ['admin', 'customer'] },
  { path: '/conflicts', label: '冲突检测', icon: AlertTriangle, roles: ['admin'] },
  { path: '/matching', label: '撮合大厅', icon: Handshake, roles: ['admin', 'customer', 'builder'] },
  { path: '/match-results', label: '匹配结果', icon: Users, roles: ['admin', 'customer', 'builder'] },
  { path: '/ranking', label: '契合排序', icon: Trophy, roles: ['admin', 'customer'] },
  { path: '/dispatch', label: '派工管理', icon: ListChecks, roles: ['admin', 'builder'] }
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div 
      className={cn(
        'fixed left-0 top-0 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-blue-700/50">
          <div className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'justify-between'
          )}>
            {!collapsed && (
              <div>
                <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>
                  帐篷租赁
                </h1>
                <p className="text-xs text-blue-300 mt-0.5">智能管理系统</p>
              </div>
            )}
            {collapsed && (
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
            )}
            <button
              onClick={onToggle}
              className={cn(
                'p-1.5 rounded-lg hover:bg-white/10 transition-colors',
                collapsed && 'hidden'
              )}
            >
              <span className="text-blue-300">◀</span>
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive 
                  ? 'bg-white/20 text-white shadow-lg' 
                  : 'text-blue-200 hover:bg-white/10 hover:text-white',
                collapsed && 'justify-center'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-blue-700/50">
          {!collapsed && user && (
            <div className="mb-3 px-3 py-2">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-blue-300">
                {user.role === 'admin' ? '系统管理员' : user.role === 'customer' ? '客户' : '搭建队'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-blue-200 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium text-sm">退出登录</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
