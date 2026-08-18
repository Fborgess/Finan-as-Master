import React, { useState } from 'react';
import { Budget, Category, Transaction, AccessProfile } from '../../types';
import { Target, Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle2, TrendingUp, User as UserIcon, Users } from 'lucide-react';
import { can } from '../../utils/permissions';

interface Props {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onSaveBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  activeProfile?: AccessProfile;
}

export const BudgetsView: React.FC<Props> = ({
  budgets,
  categories,
  transactions,
  onSaveBudget,
  onDeleteBudget,
  activeProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [alertThresholdPercent, setAlertThresholdPercent] = useState('80');
  const [scope, setScope] = useState<'pessoal' | 'familia'>('pessoal');

  const canCreate = can(activeProfile, 'orcamento', 'create');
  const canEdit = can(activeProfile, 'orcamento', 'edit');
  const canDelete = can(activeProfile, 'orcamento', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  const handleOpenModal = (b?: Budget) => {
    if (b) {
      setEditingBudget(b);
      setName(b.name);
      setCategoryId(b.categoryId);
      setAmount(b.amount.toString());
      setAlertThresholdPercent(b.alertThresholdPercent.toString());
      setScope(b.scope || 'pessoal');
    } else {
      setEditingBudget(null);
      setName('');
      setCategoryId(expenseCategories[0]?.id || '');
      setAmount('1000');
      setAlertThresholdPercent('80');
      setScope('pessoal');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    const numAmount = parseFloat(amount) || 0;
    const numThreshold = parseInt(alertThresholdPercent, 10) || 80;

    onSaveBudget({
      id: editingBudget?.id || `bud-${Date.now()}`,
      name: name.trim(),
      categoryId,
      amount: numAmount,
      alertThresholdPercent: numThreshold,
      scope,
    });

    setIsModalOpen(false);
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculate stats for each budget based on paid expense transactions
  const budgetStats = budgets.map((b) => {
    const cat = categories.find((c) => c.id === b.categoryId);
    const parentCat = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : null;

    // Support summing subcategories if budget is assigned to a parent category
    const childCategoryIds = categories.filter((c) => c.parentId === b.categoryId).map((c) => c.id);
    const matchingCategoryIds = new Set([b.categoryId, ...childCategoryIds]);

    const spent = transactions
      .filter((t) => t.type === 'expense' && t.status === 'paid' && matchingCategoryIds.has(t.categoryId))
      .reduce((sum, t) => sum + t.amount, 0);

    const remaining = b.amount - spent;
    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    const isExceeded = percent > 100;
    const isWarning = percent >= b.alertThresholdPercent;

    return {
      ...b,
      category: cat,
      parentCategory: parentCat,
      spent,
      remaining,
      percent,
      isExceeded,
      isWarning,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Target className="w-4 h-4" />
            <span>2. Financeiro &bull; Orçamento Mensal</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Planejamento & Orçamento</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina tetos de gastos por categoria e receba alertas para evitar extrapolar seu planejamento familiar.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Definir Novo Orçamento</span>
          </button>
        )}
      </div>

      {/* Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...budgetStats]
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
          .map((b) => (
          <div
            key={b.id}
            className={`bg-slate-900 border rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between space-y-4 transition ${
              b.isExceeded
                ? 'border-red-500/50 bg-red-950/10'
                : b.isWarning
                ? 'border-amber-500/50 bg-amber-950/10'
                : 'border-slate-800'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: b.category?.color || '#3b82f6' }}
                    />
                    <h3 className="font-extrabold text-base text-white">{b.name}</h3>
                    {b.scope === 'familia' ? (
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
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Categoria: <span className="text-slate-300 font-semibold">{b.parentCategory ? `${b.parentCategory.name} › ${b.category?.name}` : b.category?.name || 'Geral'}</span>
                  </p>
                </div>

                {(canEdit || canDelete) && (
                  <div className="flex items-center space-x-1">
                    {canEdit && (
                    <button
                      onClick={() => handleOpenModal(b)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                    {canDelete && (
                    <button
                      onClick={() => onDeleteBudget(b.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Progresso Consumido</span>
                  <span
                    className={
                      b.isExceeded
                        ? 'text-red-400 font-mono'
                        : b.isWarning
                        ? 'text-amber-400 font-mono'
                        : 'text-emerald-400 font-mono'
                    }
                  >
                    {b.percent}%
                  </span>
                </div>

                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.isExceeded
                        ? 'bg-red-500'
                        : b.isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Total Gasto
                </span>
                <span className="font-mono font-bold text-slate-200">
                  {formatBRL(b.spent)}
                </span>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Teto Estipulado
                </span>
                <span className="font-mono font-bold text-white">
                  {formatBRL(b.amount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Saldo Restante
                </span>
                <span
                  className={`font-mono font-bold ${
                    b.remaining < 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {formatBRL(b.remaining)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento de Gastos'}
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
                  Nome do Orçamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teto Mensal Supermercado, Aluguel e Contas..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Âmbito / Módulo do Orçamento *
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

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Categoria Mapeada *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {categories
                    .filter((c) => !c.parentId && (c.type === 'expense' || c.type === 'both'))
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((parent) => {
                      const children = categories
                        .filter(
                          (c) => c.parentId === parent.id && (c.type === 'expense' || c.type === 'both')
                        )
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                      return (
                        <optgroup key={parent.id} label={parent.name}>
                          <option value={parent.id}>
                            {parent.name} (Teto Geral Categoria)
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

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Valor Limite (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="1500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Alerta em (%)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    required
                    placeholder="80"
                    value={alertThresholdPercent}
                    onChange={(e) => setAlertThresholdPercent(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
                  className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-slate-950 font-extrabold text-xs shadow-md transition"
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
