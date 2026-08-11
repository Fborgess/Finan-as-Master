import React, { useState } from 'react';
import { BankAccount, AccountType, AccessProfile } from '../../types';
import { Building2, Plus, Edit2, Trash2, X, Wallet, Shield, User as UserIcon, Users } from 'lucide-react';
import { CurrencyInput } from '../common/CurrencyInput';
import { getSystemPreferences, formatTextWithCasing } from '../../utils/preferences';
import { can } from '../../utils/permissions';

interface Props {
  accounts: BankAccount[];
  onSaveAccount: (account: BankAccount) => void;
  onDeleteAccount: (id: string) => void;
  activeProfile?: AccessProfile;
}

const COLOR_PRESETS = ['#f97316', '#820ad1', '#eab308', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];

export const BankAccountsView: React.FC<Props> = ({
  accounts,
  onSaveAccount,
  onDeleteAccount,
  activeProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [accountNumber, setAccountNumber] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [scope, setScope] = useState<'pessoal' | 'familia'>('pessoal');

  const canCreate = can(activeProfile, 'contas', 'create');
  const canEdit = can(activeProfile, 'contas', 'edit');
  const canDelete = can(activeProfile, 'contas', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const handleOpenModal = (acc?: BankAccount) => {
    if (acc) {
      setEditingAccount(acc);
      setName(acc.name);
      setBankName(acc.bankName);
      setAccountType(acc.accountType);
      setInitialBalance(acc.initialBalance);
      setAccountNumber(acc.accountNumber || '');
      setColor(acc.color || COLOR_PRESETS[0]);
      setScope(acc.scope || 'pessoal');
    } else {
      setEditingAccount(null);
      setName('');
      setBankName('');
      setAccountType('checking');
      setInitialBalance(0);
      setAccountNumber('');
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      setScope('pessoal');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bankName.trim()) return;

    const prefs = getSystemPreferences();
    const formattedName = formatTextWithCasing(name.trim(), prefs.textCasing);
    const formattedBank = formatTextWithCasing(bankName.trim(), prefs.textCasing);

    const numInit = initialBalance || 0;
    const currentBal = editingAccount
      ? editingAccount.currentBalance
      : numInit;

    onSaveAccount({
      id: editingAccount?.id || `acc-${Date.now()}`,
      name: formattedName,
      bankName: formattedBank,
      accountType,
      initialBalance: numInit,
      currentBalance: currentBal,
      accountNumber: accountNumber.trim(),
      color,
      scope,
    });

    setIsModalOpen(false);
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'checking': return 'Conta Corrente';
      case 'savings': return 'Poupança';
      case 'investment': return 'Investimentos';
      case 'cash': return 'Carteira em Espécie';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>1. Cadastro &bull; Contas Bancárias</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Contas Bancárias & Caixas</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre suas contas onde o dinheiro fica depositado para ter o controle do saldo disponível.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Conta</span>
          </button>
        )}
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...accounts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((acc) => (
          <div
            key={acc.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: acc.color || '#3b82f6' }}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{acc.name}</h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {acc.bankName} {acc.accountNumber && `• N: ${acc.accountNumber}`}
                    </p>
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex items-center space-x-1">
                    {canEdit && (
                    <button
                      onClick={() => handleOpenModal(acc)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                    {canDelete && (
                    <button
                      onClick={() => onDeleteAccount(acc.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Saldo Atual em Conta
                </div>
                <div className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">
                  {formatBRL(acc.currentBalance)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center space-x-1.5">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                  {getAccountTypeLabel(acc.accountType)}
                </span>
                {acc.scope === 'familia' ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>Família</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center space-x-1">
                    <UserIcon className="w-3 h-3" />
                    <span>Pessoal</span>
                  </span>
                )}
              </div>
              <span>Saldo Inicial: {formatBRL(acc.initialBalance)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingAccount ? 'Editar Conta' : 'Nova Conta Bancária'}
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
                  Nome da Conta / Identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conta Corrente Principal, Reserva..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Âmbito / Módulo da Conta *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-850 border border-slate-700/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setScope('pessoal')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                      scope === 'pessoal'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Módulo Pessoal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('familia')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition ${
                      scope === 'familia'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Módulo Família</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Instituição / Banco *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Itaú, Nubank, Bradesco..."
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Conta *
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimentos</option>
                    <option value="cash">Espécie / Carteira</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Saldo Inicial *
                  </label>
                  <CurrencyInput
                    value={initialBalance}
                    onChange={(val) => setInitialBalance(val)}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Número da Conta (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="12345-6"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cor do Cartão / Card
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition transform ${
                        color === c ? 'scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
