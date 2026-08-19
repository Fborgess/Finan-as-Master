import React, { useState } from 'react';
import { AccessProfile, User, PermissionAction, PermissionKey, PermissionMatrix } from '../../types';
import { ShieldAlert, Plus, Edit2, Trash2, X, Check, Lock, ShieldCheck } from 'lucide-react';
import {
  can,
  createPermissionMatrix,
  migrateProfilePermissions,
  PERMISSION_ACTIONS,
  PERMISSION_KEY_LABELS,
} from '../../utils/permissions';

interface Props {
  profiles: AccessProfile[];
  users: User[];
  onSaveProfile: (profile: AccessProfile) => void;
  onDeleteProfile: (id: string) => void;
  activeProfile?: AccessProfile;
}

const ACTION_LABELS: Record<PermissionAction, string> = {
  view: 'Ver',
  create: 'Incluir',
  edit: 'Editar',
  delete: 'Excluir',
};

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  cadastros: 'Cadastros',
  financeiro: 'Financeiro',
  relatorios: 'Relatórios',
  configuracoes: 'Configurações',
};

// Agrupamento visual das chaves de permissão
const SECTION_KEYS: { section: string; keys: PermissionKey[] }[] = [
  { section: 'dashboard', keys: ['dashboard'] },
  { section: 'cadastros', keys: ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'] },
  { section: 'financeiro', keys: ['orcamento', 'transacoes'] },
  { section: 'relatorios', keys: ['pagar_receber', 'realizadas', 'por_categoria'] },
  { section: 'configuracoes', keys: ['perfis', 'usuarios', 'biometria', 'aparencia'] },
];

// Matriz padrão de novo perfil (herda o comportamento do modelo antigo)
const defaultNewProfileMatrix = (): PermissionMatrix => {
  const m = createPermissionMatrix(false);
  m.dashboard.view = true;
  ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'].forEach((k) => {
    m[k as PermissionKey] = { view: true, create: true, edit: true, delete: true };
  });
  ['orcamento', 'transacoes'].forEach((k) => {
    m[k as PermissionKey] = { view: true, create: true, edit: true, delete: true };
  });
  ['pagar_receber', 'realizadas', 'por_categoria'].forEach((k) => {
    m[k as PermissionKey] = { view: true, create: false, edit: false, delete: false };
  });
  ['perfis', 'usuarios', 'biometria', 'aparencia'].forEach((k) => {
    m[k as PermissionKey] = { view: false, create: false, edit: false, delete: false };
  });
  return m;
};

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
  const [modules, setModules] = useState<PermissionMatrix>(() => defaultNewProfileMatrix());
  const [canAccessPessoal, setCanAccessPessoal] = useState(true);
  const [canAccessFamilia, setCanAccessFamilia] = useState(true);

  // Quem gerencia perfis precisa de create/edit/delete em "perfis"
  const canManage = can(activeProfile, 'perfis', 'create') || can(activeProfile, 'perfis', 'edit') || can(activeProfile, 'perfis', 'delete');

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
      const migrated = migrateProfilePermissions(p);
      setEditingProfile(migrated);
      setName(migrated.name);
      setDescription(migrated.description);
      setModules(migrated.permissions.modules);
      setCanAccessPessoal(migrated.permissions.canAccessPessoalScope !== false);
      setCanAccessFamilia(migrated.permissions.canAccessFamiliaScope !== false);
    } else {
      setEditingProfile(null);
      setName('');
      setDescription('');
      setModules(defaultNewProfileMatrix());
      setCanAccessPessoal(true);
      setCanAccessFamilia(true);
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
      permissions: {
        modules,
        canAccessPessoalScope: canAccessPessoal,
        canAccessFamiliaScope: canAccessFamilia,
      },
    });

    setIsModalOpen(false);
  };

  const setModuleAction = (key: PermissionKey, action: PermissionAction, value: boolean) => {
    setModules((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [action]: value,
      },
    }));
  };

  const summaryLabel = (p: AccessProfile) => {
    const m = p.permissions.modules;
    const parts: string[] = [];
    SECTION_KEYS.forEach(({ section, keys }) => {
      const anyView = keys.some((k) => m[k]?.view);
      if (!anyView) return;
      const canCrud = keys.some((k) => m[k]?.create || m[k]?.edit || m[k]?.delete);
      parts.push(canCrud ? `${SECTION_LABELS[section]}: Gerência` : `${SECTION_LABELS[section]}: Leitura`);
    });
    return parts;
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
            Defina o grau de acesso por tela (Ver / Incluir / Editar / Excluir) para Administradores, Operadores e Dependentes.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
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
          const migrated = migrateProfilePermissions(p);
          const labels = summaryLabel(migrated);

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
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
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
                  {labels.length === 0 && (
                    <span className="text-slate-600 text-[11px]">Nenhum acesso liberado.</span>
                  )}
                  {labels.map((label) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-400">{label.split(':')[0]}:</span>
                      <span className="font-bold text-emerald-400">{label.split(':')[1]?.trim()}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400">Módulo Pessoal:</span>
                    <span className={`font-bold ${migrated.permissions.canAccessPessoalScope !== false ? 'text-indigo-400' : 'text-slate-600'}`}>
                      {migrated.permissions.canAccessPessoalScope !== false ? 'Liberado' : 'Bloqueado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Módulo Família:</span>
                    <span className={`font-bold ${migrated.permissions.canAccessFamiliaScope !== false ? 'text-purple-400' : 'text-slate-600'}`}>
                      {migrated.permissions.canAccessFamiliaScope !== false ? 'Liberado' : 'Bloqueado'}
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
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

              <div className="space-y-4 pt-2 border-t border-slate-800">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Matriz de Permissões por Tela
                </p>

                {SECTION_KEYS.map(({ section, keys }) => {
                  const anyVisible = keys.some((k) => modules[k]?.view);
                  const hasManageDefault = keys.some((k) => modules[k]?.create || modules[k]?.edit || modules[k]?.delete);

                  const toggleAll = (action: PermissionAction, value: boolean) => {
                    keys.forEach((k) => setModuleAction(k, action, value));
                  };

                  const setSectionAll = (value: boolean) => {
                    keys.forEach((k) => {
                      PERMISSION_ACTIONS.forEach((action) => {
                        setModules((prev) => ({ ...prev, [k]: { ...prev[k], [action]: value } }));
                      });
                    });
                  };

                  return (
                    <div key={section} className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-white">
                          {SECTION_LABELS[section]}
                        </span>
                        <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={keys.every((k) => PERMISSION_ACTIONS.every((a) => modules[k]?.[a]))}
                            onChange={(e) => setSectionAll(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                          />
                          <span>{anyVisible || hasManageDefault ? 'Liberar tudo' : 'Liberar seção'}</span>
                        </label>
                      </div>

                      {/* Column headers */}
                      <div className="grid grid-cols-[1fr_repeat(4,3.5rem)] items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                        <span className="px-1">Tela</span>
                        {PERMISSION_ACTIONS.map((act) => (
                          <span key={act} className="text-center" title={ACTION_LABELS[act]}>
                            {ACTION_LABELS[act]}
                          </span>
                        ))}
                      </div>

                      {keys.map((key) => (
                        <div
                          key={key}
                          className="grid grid-cols-[1fr_repeat(4,3.5rem)] items-center gap-1 text-xs text-slate-300"
                        >
                          <span className="px-1 truncate">{PERMISSION_KEY_LABELS[key]}</span>
                          {PERMISSION_ACTIONS.map((act) => (
                            <span key={act} className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={!!modules[key]?.[act]}
                                onChange={(e) => setModuleAction(key, act, e.target.checked)}
                                className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                              />
                            </span>
                          ))}
                        </div>
                      ))}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Aplicar a todas as telas acima
                        </span>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAll('view', true)}
                            className="px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition"
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAll('create', true)}
                            className="px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition"
                          >
                            Incluir
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAll('edit', true)}
                            className="px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAll('delete', true)}
                            className="px-2 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-2 border-t border-slate-800">
                  Permissão de Módulos (Escopo de Dados)
                </p>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canAccessPessoal}
                    onChange={(e) => setCanAccessPessoal(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                  <span>Permitir acesso ao Módulo Pessoal</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canAccessFamilia}
                    onChange={(e) => setCanAccessFamilia(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <span>Permitir acesso ao Módulo Família</span>
                </label>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400 font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-xs shadow-sm transition"
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