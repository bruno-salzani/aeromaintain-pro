
import React from 'react';

interface AdminQuickActionsProps {
  onAddUser?: () => void;
  onAddAircraft?: () => void;
  onSystemSettings?: () => void;
  onViewLogs?: () => void;
  onViewHealth?: () => void;
}

const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ onAddUser, onAddAircraft, onSystemSettings, onViewLogs, onViewHealth }) => {
  const actions = [
    {
      label: 'Novo Usuário',
      icon: 'fa-user-plus',
      color: 'bg-indigo-600',
      hover: 'hover:bg-indigo-700',
      description: 'Gestão de permissões',
      onClick: onAddUser || (() => console.log('Abrir modal de usuário'))
    },
    {
      label: 'Cadastrar Aeronave',
      icon: 'fa-plane-arrival',
      color: 'bg-slate-800',
      hover: 'hover:bg-slate-900',
      description: 'Expandir frota ativa',
      onClick: onAddAircraft || (() => console.log('Abrir modal de aeronave'))
    },
    {
      label: 'Logs do Sistema',
      icon: 'fa-terminal',
      color: 'bg-blue-600',
      hover: 'hover:bg-blue-700',
      description: 'Auditoria de acessos',
      onClick: onViewLogs || (() => console.log('Ver logs'))
    },
    {
      label: 'Health & Métricas',
      icon: 'fa-heartbeat',
      color: 'bg-green-600',
      hover: 'hover:bg-green-700',
      description: 'Estado e desempenho de serviços',
      onClick: onViewHealth || (() => console.log('Ver health'))
    },
    {
      label: 'Configurações',
      icon: 'fa-cog',
      color: 'bg-white',
      textColor: 'text-gray-700',
      border: 'border border-gray-200',
      hover: 'hover:bg-gray-50',
      description: 'Parâmetros globais',
      onClick: onSystemSettings || (() => console.log('Configurações'))
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Painel Administrativo</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={`card flex items-center gap-4 ${action.color} ${action.border || ''} ${action.hover} ${action.textColor || 'text-white'} transition`}
          >
            <div className="h-12 w-12 rounded-xl bg-black/10 flex items-center justify-center">
              <i className={`fas ${action.icon} text-2xl`}></i>
            </div>
            <div className="flex-1">
              <div className="font-bold">{action.label}</div>
              <div className="text-xs opacity-80">{action.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminQuickActions;
