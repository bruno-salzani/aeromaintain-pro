import React, { useState } from 'react';
import { User, UserRole } from '@/types';

interface Props {
  users: User[];
  onAdd: (user: Omit<User, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<User>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ROLES: UserRole[] = ['ADMIN', 'OPERADOR', 'MANUTENCAO', 'VISUALIZADOR'];

const UsersManager: React.FC<Props> = ({ users, onAdd, onUpdate, onDelete, onClose }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<User, 'id'>>({
    nome: '',
    email: '',
    role: 'OPERADOR',
    ativo: true
  });

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ nome: u.nome, email: u.email, role: u.role, ativo: u.ativo });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, form);
    } else {
      onAdd(form);
    }
    setEditingId(null);
    setShowForm(false);
    setForm({ nome: '', email: '', role: 'OPERADOR', ativo: true });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-card border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">Gestão de Usuários</h3>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(true)} className="btn-primary">Novo Usuário</button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition" aria-label="Fechar" title="Fechar">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={submit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Nome</label>
                <input className="w-full p-2 border rounded-lg text-sm bg-white" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">E-mail</label>
                <input type="email" className="w-full p-2 border rounded-lg text-sm bg-white" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">Perfil</label>
                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="ativo" type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
                <label htmlFor="ativo" className="text-sm">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="btn">Cancelar</button>
              <button type="submit" className="btn-primary">{editingId ? 'Salvar Alterações' : 'Criar Usuário'}</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50/50">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Perfil</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t">
                  <td className="px-6 py-4">{u.nome}</td>
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4"><span className="badge">{u.role}</span></td>
                  <td className="px-6 py-4">{u.ativo ? <span className="badge-success">Ativo</span> : <span className="badge">Inativo</span>}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="btn" onClick={() => startEdit(u)}>Editar</button>
                    <button className="btn-danger ml-2" onClick={() => onDelete(u.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-gray-500" colSpan={5}>Nenhum usuário cadastrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersManager;
