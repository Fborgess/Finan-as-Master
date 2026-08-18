import React, { useState } from 'react';
import {
  Transaction,
  Category,
  BankAccount,
  CreditCard,
  PaymentMethod,
  Beneficiary,
  User,
  AccessProfile
} from '../../types';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
  Trash2,
  Wallet,
  CreditCard as CardIcon,
  User as UserIcon,
  Users,
  Repeat,
  Zap
} from 'lucide-react';
import { formatModalityBadge } from '../../utils/recurrence';
import { can } from '../../utils/permissions';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  cards: CreditCard[];
  paymentMethods: PaymentMethod[];
  beneficiaries: Beneficiary[];
  users: User[];
  onOpenNewTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onToggleStatus: (tx: Transaction) => void;
  activeProfile?: AccessProfile;
}

export const TransactionsView: React.FC<Props> = ({
  transactions,
  categories,
  accounts,
  cards,
  paymentMethods,
  beneficiaries,
  users,
  onOpenNewTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onToggleStatus,
  activeProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterModality, setFilterModality] = useState<string>('ALL');

  const canCreate = can(activeProfile, 'transacoes', 'create');
  const canEdit = can(activeProfile, 'transacoes', 'edit');
  const canDelete = can(activeProfile, 'transacoes', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesCategory =
      filterCategory === 'ALL' ||
      t.categoryId === filterCategory ||
      categories.some((c) => c.id === t.categoryId && c.parentId === filterCategory);

    const matchesModality =
      filterModality === 'ALL' ||
      (filterModality === 'single' && !t.isInstallment && !t.isRecurring && t.paymentModality !== 'installment' && t.paymentModality !== 'recurring') ||
      (filterModality === 'installment' && (t.isInstallment || t.paymentModality === 'installment')) ||
      (filterModality === 'recurring' && (t.isRecurring || t.paymentModality === 'recurring'));

    return matchesSearch && matchesType && matchesStatus && matchesCategory && matchesModality;
  });

  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ArrowRightLeft className="w-4 h-4" />
            <span>2. Financeiro &bull; Transações</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Lançamentos Financeiros</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registre entradas, saídas e transferências com vinculação a contas e cartões.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={onOpenNewTransaction}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Transação</span>
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Receitas do Filtro</span>
              <span className="text-lg font-extrabold font-mono text-emerald-400">{formatBRL(totalIncome)}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Despesas do Filtro</span>
              <span className="text-lg font-extrabold font-mono text-red-400">{formatBRL(totalExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>

          {/* Filter Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="paid">Pago / Quitado</option>
            <option value="pending">Pendente / Agendado</option>
          </select>

          {/* Filter Modalidade */}
          <select
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todas as Modalidades</option>
            <option value="single">⚡ À Vista</option>
            <option value="installment">💳 Parcelado</option>
            <option value="recurring">🔄 Recorrente / Fixo</option>
          </select>

          {/* Filter Category */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories
              .filter((c) => !c.parentId)
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map((parent) => {
                const children = categories
                  .filter((c) => c.parentId === parent.id)
                  .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                return (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>
                      {parent.name} (Todas/Geral)
                    </option>
                    {children.map((child) => (
                      <option key={child.id} value={child.id}>
                        &nbsp;&nbsp;↳ {child.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
          </select>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden text-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Descrição & Beneficiário</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Conta / Cartão</th>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Valor</th>
                {(canEdit || canDelete) && <th className="py-3 px-4 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId);
                const parentCat = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : null;
                const acc = accounts.find((a) => a.id === t.accountId);
                const destAcc = accounts.find((a) => a.id === t.destinationAccountId);
                const card = cards.find((c) => c.id === t.creditCardId);
                const ben = beneficiaries.find((b) => b.id === t.beneficiaryId);
                const isPaid = t.status === 'paid';
                const modalityBadge = formatModalityBadge(t);

                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      {t.type === 'income' ? (
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 inline-block" title="Receita">
                          <ArrowDownLeft className="w-4 h-4" />
                        </span>
                      ) : t.type === 'expense' ? (
                        <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400 inline-block" title="Despesa">
                          <ArrowUpRight className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 inline-block" title="Transferência">
                          <ArrowRightLeft className="w-4 h-4" />
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-extrabold text-white text-xs">{t.description}</span>
                        
                        {/* Scope Badge */}
                        {t.scope === 'familia' ? (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold flex items-center space-x-1 shrink-0">
                            <Users className="w-2.5 h-2.5" />
                            <span>Família</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-extrabold flex items-center space-x-1 shrink-0">
                            <UserIcon className="w-2.5 h-2.5" />
                            <span>Pessoal</span>
                          </span>
                        )}

                        {/* Modality Badge */}
                        {modalityBadge.type === 'installment' && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-300 border border-purple-700/50 text-[9px] font-extrabold flex items-center space-x-1 shrink-0"
                            title={modalityBadge.subtext}
                          >
                            <CardIcon className="w-2.5 h-2.5 text-purple-400" />
                            <span>{modalityBadge.text}</span>
                          </span>
                        )}

                        {modalityBadge.type === 'recurring' && (
                          <span
                            className="px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-700/50 text-[9px] font-extrabold flex items-center space-x-1 shrink-0"
                            title={modalityBadge.subtext}
                          >
                            <Repeat className="w-2.5 h-2.5 text-amber-400" />
                            <span>{modalityBadge.text}</span>
                          </span>
                        )}
                      </div>
                      {ben && (
                        <div className="text-[10px] text-slate-400 mt-0.5">Beneficiário: {ben.name}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-block"
                        style={{ backgroundColor: `${cat?.color || '#64748b'}20`, color: cat?.color || '#cbd5e1' }}
                      >
                        {parentCat ? `${parentCat.name} › ${cat?.name}` : cat?.name || 'Geral'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      {card ? (
                        <span className="flex items-center space-x-1 text-[11px]">
                          <CardIcon className="w-3.5 h-3.5 text-purple-400" />
                          <span>{card.name}</span>
                        </span>
                      ) : t.type === 'transfer' ? (
                        <span className="text-[10px] text-slate-300">
                          {acc?.name} &rarr; {destAcc?.name}
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-[11px]">
                          <Wallet className="w-3.5 h-3.5 text-blue-400" />
                          <span>{acc?.name || 'Conta Corrente'}</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {t.date}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => canEdit && onToggleStatus(t)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                          isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                        }`}
                        title={canEdit ? "Clique para alterar status pago/pendente" : "Sem permissão para alterar status"}
                      >
                        {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{isPaid ? 'Pago' : 'Pendente'}</span>
                      </button>
                    </td>

                    <td className={`py-3.5 px-4 text-right font-mono font-extrabold text-sm ${
                      t.type === 'income' ? 'text-emerald-400' : t.type === 'expense' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} {formatBRL(t.amount)}
                    </td>

                    {(canEdit || canDelete) && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {canEdit && (
                          <button
                            onClick={() => onEditTransaction(t)}
                            className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          )}
                          {canDelete && (
                          <button
                            onClick={() => onDeleteTransaction(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
