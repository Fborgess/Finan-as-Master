import React, { useState } from 'react';
import { AccessProfile, User } from '../../types';
import { ShieldAlert, Plus, Edit2, Trash2, X, Check, Lock, ShieldCheck } from 'lucide-react';

interface Props {
  profiles: AccessProfile[];
  users: User[];
  onSaveProfile: (profile: AccessProfile) => void;
  onDeleteProfile: (id: string) => void;
  activeProfile?: AccessProfile;
}

export const AccessProfilesView: React.FC<Props> = ({
  profiles,
  users,
  onSaveProfile,
  onDeleteProfile,
  activeProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState({
    canManageCadastros: true,
    canManageTransactions: true,
    canManageBudgets: true,
    canManageSettings: false,
    canViewReports: true,
    canAccessPessoalScope: true,
    canAccessFamiliaScope: true,
  });

  const canManage = activeProfile?.permissions.canManageSettings ?? true;

  const handleDelete = (p: AccessProfile) => {
    const userCount = users.filter((u) => u.profileId === p.id).length;
    if (userCount > 0) {
      if (!window.confirm(`Atenção: O perfil "${p.name}" possui ${userCount} usuário(s) associado(s). Deseja realmente excluí-lo?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Deseja realmente excluir o perfil "${p.name}"?`)) {
        return;
      }
    }
    onDeleteProfile(p.id);
  };

  const handleOpenModal = (p?: AccessProfile) => {
    if (p) {
      setEditingProfile(p);
      setName(p.name);
      setDescription(p.description);
      setPermissions({
        canManageCadastros: p.permissions.canManageCadastros ?? true,
        canManageTransactions: p.permissions.canManageTransactions ?? true,
        canManageBudgets: p.permissions.canManageBudgets ?? true,
        canManageSettings: p.permissions.canManageSettings ?? false,
        canViewReports: p.permissions.canViewReports ?? true,
        canAccessPessoalScope: p.permissions.canAccessPessoalScope !== false,
        canAccessFamiliaScope: p.permissions.canAccessFamiliaScope !== false,
      });
    } else {
      setEditingProfile(null);
      setName('');
      setDescription('');
      setPermissions({
        canManageCadastros: true,
        canManageTransactions: true,
        canManageBudgets: true,
        canManageSettings: false,
        canViewReports: true,
        canAccessPessoalScope: true,
        canAccessFamiliaScope: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveProfile({
      id: editingProfile?.id || `prof-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      isSystemRole: editingProfile?.isSystemRole || false,
      permissions,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>3. Configurações &bull; Perfil de Acesso</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Níveis & Perfis de Permissão</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina o grau de acesso e regras de privilégios para Administradores, Operadores e Dependentes.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/30 transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Criar Perfil de Acesso</span>
          </button>
        )}
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...profiles].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => {
          const userCount = users.filter((u) => u.profileId === p.id).length;

          return (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-sm flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">{p.name}</h3>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        {userCount} {userCount === 1 ? 'usuário associado' : 'usuários associados'}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenModal(p)}
                        className="p-1.5 text-slate-400 hover:text-purple-400 rounded-lg hover:bg-slate-800 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {p.description}
                </p>

                {/* Permissions matrix checklist */}
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">1. Cadastros MESTRE:</span>
                    <span className={`font-bold ${p.permissions.canManageCadastros ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {p.permissions.canManageCadastros ? 'Permitido' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">2. Transações Financeiras:</span>
                    <span className={`font-bold ${p.permissions.canManageTransactions ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {p.permissions.canManageTransactions ? 'Permitido' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">3. Orçamento Mensal:</span>
                    <span className={`font-bold ${p.permissions.canManageBudgets ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {p.permissions.canManageBudgets ? 'Permitido' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">4. Configurações de Sistema:</span>
                    <span className={`font-bold ${p.permissions.canManageSettings ? 'text-purple-400' : 'text-slate-600'}`}>
                      {p.permissions.canManageSettings ? 'Permitido (Admin)' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">5. Módulo Pessoal:</span>
                    <span className={`font-bold ${p.permissions.canAccessPessoalScope !== false ? 'text-indigo-400' : 'text-slate-600'}`}>
                      {p.permissions.canAccessPessoalScope !== false ? 'Acesso Liberado' : 'Bloqueado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">6. Módulo Família:</span>
                    <span className={`font-bold ${p.permissions.canAccessFamiliaScope !== false ? 'text-purple-400' : 'text-slate-600'}`}>
                      {p.permissions.canAccessFamiliaScope !== false ? 'Acesso Liberado' : 'Bloqueado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingProfile ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome do Perfil *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gestor Financeiro, Auditor, Dependente..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição das Funções
                </label>
                <input
                  type="text"
                  placeholder="Qual é a finalidade deste perfil..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Matriz de Permissões
                </p>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageCadastros}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canManageCadastros: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Gerenciar Cadastros (Contas, Cartões, Categorias)</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageTransactions}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canManageTransactions: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Lançar e Editar Transações Financeiras</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageBudgets}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canManageBudgets: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Gerenciar Orçamentos Mensais</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canViewReports}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canViewReports: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Visualizar Relatórios e Dashboards Analytics</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canManageSettings}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canManageSettings: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Gerenciar Usuários e Configurações Globais</span>
                </label>

                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-800">
                  Permissão de Módulos (Escopo de Dados)
                </p>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canAccessPessoalScope !== false}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAccessPessoalScope: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                  <span>Permitir acesso ao Módulo Pessoal</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permissions.canAccessFamiliaScope !== false}
                    onChange={(e) =>
                      setPermissions({ ...permissions, canAccessFamiliaScope: e.target.checked })
                    }
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Permitir acesso ao Módulo Família</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-md transition"
                >
                  Salvar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
