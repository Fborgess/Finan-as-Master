import React, { useState } from 'react';
import { User, AccessProfile } from '../../types';
import { generateSalt, hashSecret } from '../../utils/credentials';
import { UserCheck, Plus, Edit2, Trash2, X, KeyRound, CheckCircle2, XCircle, Mail, Eye, EyeOff } from 'lucide-react';
import { can } from '../../utils/permissions';

interface Props {
  users: User[];
  profiles: AccessProfile[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  activeProfile?: AccessProfile;
  activeUserId: string;
}

export const UsersView: React.FC<Props> = ({
  users,
  profiles,
  onSaveUser,
  onDeleteUser,
  activeProfile,
  activeUserId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileId, setProfileId] = useState('');
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const canCreate = can(activeProfile, 'usuarios', 'create');
  const canEdit = can(activeProfile, 'usuarios', 'edit');
  const canDelete = can(activeProfile, 'usuarios', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const handleOpenModal = (u?: User) => {
    setShowPin(false);
    if (u) {
      setEditingUser(u);
      setName(u.name);
      setEmail(u.email);
      setProfileId(u.profileId);
      setPin('');
      setStatus(u.status);
    } else {
      setEditingUser(null);
      setName('');
      setEmail('');
      setProfileId(profiles[0]?.id || 'prof-admin');
      setPin('1234');
      setStatus('active');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const next: User = {
      id: editingUser?.id || `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      profileId,
      status,
    };

    // Preserve existing credentials when editing without changing the PIN
    if (editingUser) {
      next.pinHash = editingUser.pinHash;
      next.pinSalt = editingUser.pinSalt;
      next.passwordHash = editingUser.passwordHash;
      next.passwordSalt = editingUser.passwordSalt;
      next.pin = editingUser.pin;
      next.password = editingUser.password;
    }

    const trimmedPin = pin.trim();
    if (trimmedPin) {
      const salt = generateSalt();
      next.pinHash = await hashSecret(trimmedPin, salt);
      next.pinSalt = salt;
      next.passwordHash = await hashSecret(trimmedPin, salt);
      next.passwordSalt = salt;
      // New credentials are stored only as hashes
      delete next.pin;
      delete next.password;
    }

    onSaveUser(next);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <UserCheck className="w-4 h-4" />
            <span>3. Configurações &bull; Usuários do Sistema</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Usuários & Membros da Família</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre os usuários com e-mail, PIN de acesso e perfil de permissões individual.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Usuário</span>
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...users].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((u) => {
          const prof = profiles.find((p) => p.id === u.profileId);
          const isActiveUser = u.id === activeUserId;

          return (
            <div
              key={u.id}
              className={`bg-slate-900 border rounded-2xl p-5 transition shadow-sm flex flex-col justify-between space-y-4 ${
                isActiveUser ? 'border-blue-500/60 ring-1 ring-blue-500/40' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-extrabold text-blue-400 text-base shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-extrabold text-sm text-white">{u.name}</h3>
                        {isActiveUser && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Sessão Ativa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex items-center space-x-1">
                      {canEdit && (
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      )}
                      {canDelete && users.length > 1 && (
                      <button
                        onClick={() => onDeleteUser(u.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      Perfil Associado
                    </span>
                    <span className="font-bold text-slate-200">
                      {prof?.name || 'Padrão'}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      PIN Rápido
                    </span>
                    <span className="font-mono text-slate-300">
                      {u.pinHash || u.pin ? '••••' : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-[11px]">
                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold ${
                    u.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {u.status === 'active' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{u.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                </span>
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
                {editingUser ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
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
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva, Ana Paula..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Endereço de E-mail *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@khrima.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Perfil de Acesso *
                  </label>
                  <select
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {[...profiles].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    {editingUser ? 'PIN (deixe em branco para manter)' : 'PIN (4 Dígitos) *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4}
                      required={!editingUser}
                      placeholder={editingUser ? '••••' : '1234'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-1.5 text-xs text-white font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition"
                      title={showPin ? "Ocultar PIN" : "Exibir PIN"}
                    >
                      {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Status do Usuário
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="active">Ativo (Pode acessar)</option>
                  <option value="inactive">Inativo (Acesso bloqueado)</option>
                </select>
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
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
