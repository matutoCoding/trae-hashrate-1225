import { useState } from 'react';
import { Plus, Edit2, Trash2, Package, Tent, Armchair, Square } from 'lucide-react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useEquipmentStore } from '@/store/useEquipmentStore';
import { getStatusText, getStatusColor } from '@/utils/dateUtils';
import { cn } from '@/lib/utils';
import type { Equipment } from '@/types';

const typeIcons = {
  tent: Tent,
  table: Square,
  chair: Armchair,
  other: Package
};

const typeLabels = {
  tent: '帐篷',
  table: '桌子',
  chair: '椅子',
  other: '其他'
};

export default function Equipment() {
  const { equipment, addEquipment, updateEquipment, deleteEquipment } = useEquipmentStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [formData, setFormData] = useState({
    name: '',
    type: 'tent' as Equipment['type'],
    spec: '',
    quantity: 1,
    status: 'available' as Equipment['status'],
    dailyRate: 0,
    description: ''
  });

  const filteredEquipment = filterType === 'all' 
    ? equipment 
    : equipment.filter(e => e.type === filterType);

  const handleAdd = () => {
    setEditingEquipment(null);
    setFormData({
      name: '',
      type: 'tent',
      spec: '',
      quantity: 1,
      status: 'available',
      dailyRate: 0,
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData({
      name: eq.name,
      type: eq.type,
      spec: eq.spec,
      quantity: eq.quantity,
      status: eq.status,
      dailyRate: eq.dailyRate,
      description: eq.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (editingEquipment) {
      updateEquipment(editingEquipment.id, formData);
    } else {
      addEquipment(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除此设备吗？')) {
      deleteEquipment(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader
        title="设备管理"
        description="管理帐篷、桌椅等租赁设备的建档和库存"
        actions={
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增设备
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        {['all', 'tent', 'table', 'chair', 'other'].map(type => (
          <Button
            key={type}
            variant={filterType === type ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? '全部' : typeLabels[type as keyof typeof typeLabels]}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredEquipment.map(eq => {
          const Icon = typeIcons[eq.type];
          return (
            <Card key={eq.id} hover className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'p-3 rounded-xl',
                    eq.type === 'tent' ? 'bg-blue-100 text-blue-600' :
                    eq.type === 'table' ? 'bg-amber-100 text-amber-600' :
                    eq.type === 'chair' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(eq)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(eq.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{eq.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{eq.spec}</p>

                <div className="flex items-center justify-between mb-3">
                  <Badge className={getStatusColor(eq.status)}>
                    {getStatusText(eq.status)}
                  </Badge>
                  <span className="text-lg font-bold text-blue-700">¥{eq.dailyRate}/天</span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>库存: <span className="font-medium text-gray-900">{eq.quantity}</span></span>
                  <span>{typeLabels[eq.type]}</span>
                </div>

                {eq.description && (
                  <p className="mt-3 text-xs text-gray-400 line-clamp-2">{eq.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEquipment ? '编辑设备' : '新增设备'}
      >
        <div className="p-6 space-y-4">
          <Input
            label="设备名称"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="请输入设备名称"
          />
          <Select
            label="设备类型"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value as Equipment['type'] })}
            options={[
              { value: 'tent', label: '帐篷' },
              { value: 'table', label: '桌子' },
              { value: 'chair', label: '椅子' },
              { value: 'other', label: '其他' }
            ]}
          />
          <Input
            label="规格参数"
            value={formData.spec}
            onChange={e => setFormData({ ...formData, spec: e.target.value })}
            placeholder="如：10m x 15m 铝合金框架"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="库存数量"
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
            />
            <Input
              label="日租金(元)"
              type="number"
              value={formData.dailyRate}
              onChange={e => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <Select
            label="设备状态"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as Equipment['status'] })}
            options={[
              { value: 'available', label: '可用' },
              { value: 'occupied', label: '已占用' },
              { value: 'maintenance', label: '维护中' }
            ]}
          />
          <Input
            label="设备描述"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="设备详细描述"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>
              {editingEquipment ? '保存修改' : '创建设备'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
