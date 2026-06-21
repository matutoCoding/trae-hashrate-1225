import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCircle, Building2, Tent } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

type RoleType = 'admin' | 'customer' | 'builder';

const roles: { value: RoleType; label: string; icon: typeof UserCircle; desc: string }[] = [
  { value: 'admin', label: '系统管理员', icon: Building2, desc: '管理设备、订单、冲突、派工' },
  { value: 'customer', label: '客户', icon: Users, desc: '租赁设备、选择搭建队' },
  { value: 'builder', label: '搭建队', icon: UserCircle, desc: '查看订单、登记意愿、接收派工' }
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = () => {
    if (selectedRole) {
      login(selectedRole);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <Tent className="w-10 h-10 text-white" />
          </div>
          <h1 
            className="text-4xl font-bold text-white mb-2"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            帐篷租赁管理系统
          </h1>
          <p className="text-blue-200">专业活动设备租赁 · 智能匹配 · 高效管理</p>
        </div>

        <Card className="p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">选择登录身份</h2>
          
          <div className="space-y-3 mb-8">
            {roles.map((role, index) => (
              <button
                key={role.value}
                onClick={() => setSelectedRole(role.value)}
                className={cn(
                  'w-full p-4 rounded-xl border-2 text-left transition-all duration-200 group',
                  selectedRole === role.value
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'p-3 rounded-xl transition-colors',
                    selectedRole === role.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                  )}>
                    <role.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={cn(
                      'font-medium',
                      selectedRole === role.value ? 'text-blue-900' : 'text-gray-900'
                    )}>
                      {role.label}
                    </p>
                    <p className="text-sm text-gray-500">{role.desc}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    selectedRole === role.value
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  )}>
                    {selectedRole === role.value && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <Button
            className="w-full py-3 text-base"
            size="lg"
            disabled={!selectedRole}
            onClick={handleLogin}
          >
            登录系统
          </Button>

          <p className="text-center text-xs text-gray-400 mt-4">
            演示系统 - 点击即可登录体验不同角色功能
          </p>
        </Card>
      </div>
    </div>
  );
}
