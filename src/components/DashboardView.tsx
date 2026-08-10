import React from 'react';
import {
  Category,
  BankAccount,
  CreditCard,
  Budget,
  Transaction,
  User,
  AccessProfile,
  SubMenuCadastro,
  SubMenuFinanceiro
} from '../types';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard as CardIcon,
  Target,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  PieChart
} from 'lucide-react';

interface Props {
  accounts: BankAccount[];
  cards: CreditCard[];
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
  activeUser: User;
  onNavigateCadastro: (sub: SubMenuCadastro) => void;
  onNavigateFinanceiro: (sub: SubMenuFinanceiro) => void;
  onOpenNewTransaction: () => void;
}

export const DashboardView: React.FC<Props> = ({
  accounts,
  cards,
  categories,
  budgets,
  transactions,
  activeUser,
  onNavigateCadastro,
  onNavigateFinanceiro,
  onOpenNewTransaction,
}) => {
  // Financial metrics calculations
  const totalAccountBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);

  const completedTransactions = transactions.filter((t) => t.status === 'paid');

  const totalIncome = completedTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = completedTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Credit Cards metrics
  const totalCreditLimit = cards.reduce((sum, c) => sum + c.creditLimit, 0);
  const cardExpenses = completedTransactions
    .filter((t) => t.type === 'expense' && t.creditCardId)
    .reduce((sum, t) => sum + t.amount, 0);

  // Budget calculations
  const budgetAlerts = budgets.map((b) => {
    const spent = completedTransactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
      .reduce((sum, t) => sum + t.amount, 0);
    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    const isWarning = percent >= b.alertThresholdPercent;
    const isExceeded = percent > 100;
    return {
      ...b,
      spent,
      percent,
      isWarning,
      isExceeded,
    };
  });

  const criticalBudgets = budgetAlerts.filter((b) => b.isWarning);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Resumo Executivo do Sistema</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Olá, {activeUser.name}!
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Acompanhe o saldo consolidado de contas, faturas de cartão de crédito e limites de orçamento em tempo real.
          </p>
        </div>

        <button
          onClick={onOpenNewTransaction}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition transform active:scale-95 flex items-center justify-center space-x-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Lançar Transação</span>
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Total em Contas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Saldo Consolidado</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {formatBRL(totalAccountBalance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1">
              <span>{accounts.length} contas bancárias cadastradas</span>
            </div>
          </div>
        </div>

        {/* Receita Mensal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Receitas Realizadas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
              {formatBRL(totalIncome)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {transactions.filter((t) => t.type === 'income' && t.status === 'paid').length} entradas pagas
            </div>
          </div>
        </div>

        {/* Despesa Mensal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Despesas Realizadas</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-red-400 tracking-tight">
              {formatBRL(totalExpense)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {transactions.filter((t) => t.type === 'expense' && t.status === 'paid').length} saídas quitadas
            </div>
          </div>
        </div>

        {/* Limite de Cartões */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Fatura dos Cartões</span>
            <CardIcon className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-purple-300 tracking-tight">
              {formatBRL(cardExpenses)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Limite Total: {formatBRL(totalCreditLimit)}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Budget Alerts Banner (if any) */}
      {criticalBudgets.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Atenção: Orçamentos Próximos ou Acima do Limite ({criticalBudgets.length})</span>
            </div>
            <button
              onClick={() => onNavigateFinanceiro('orcamento')}
              className="text-xs font-bold text-amber-300 hover:text-amber-100 underline"
            >
              Gerenciar Orçamentos &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            {criticalBudgets.map((b) => (
              <div key={b.id} className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                  <span>{b.name}</span>
                  <span className={b.isExceeded ? 'text-red-400' : 'text-amber-400'}>
                    {b.percent}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className={`h-full ${b.isExceeded ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, b.percent)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Gasto: {formatBRL(b.spent)}</span>
                  <span>Teto: {formatBRL(b.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts & Cards Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contas Bancárias */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Contas Bancárias ({accounts.length})</span>
            </h3>
            <button
              onClick={() => onNavigateCadastro('contas')}
              className="text-xs font-bold text-blue-400 hover:text-blue-300"
            >
              Ver Contas &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {[...accounts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: acc.color || '#3b82f6' }}
                  />
                  <div>
                    <div className="font-bold text-xs text-white">{acc.name}</div>
                    <div className="text-[10px] text-slate-400">{acc.bankName} • {acc.accountNumber || 'CC'}</div>
                  </div>
                </div>

                <div className="font-mono font-bold text-sm text-emerald-400">
                  {formatBRL(acc.currentBalance)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cartões de Crédito */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm flex items-center space-x-2">
              <CardIcon className="w-4 h-4 text-purple-400" />
              <span>Cartões de Crédito ({cards.length})</span>
            </h3>
            <button
              onClick={() => onNavigateCadastro('cartoes')}
              className="text-xs font-bold text-purple-400 hover:text-purple-300"
            >
              Ver Cartões &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {[...cards].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((card) => {
              const cardSpent = completedTransactions
                .filter((t) => t.type === 'expense' && t.creditCardId === card.id)
                .reduce((sum, t) => sum + t.amount, 0);

              const available = card.creditLimit - cardSpent;

              return (
                <div
                  key={card.id}
                  className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-white">{card.name}</div>
                      <div className="text-[10px] text-slate-300 font-medium">
                        <span className="text-amber-400 font-bold">{card.brand}</span> • Fechamento: dia {card.closingDay} | Vencimento: dia {card.dueDay}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-xs text-purple-300">
                        Fatura: {formatBRL(cardSpent)}
                      </div>
                      <div className="text-[10px] text-slate-300 font-semibold">
                        Disp: {formatBRL(available)}
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full"
                      style={{ width: `${Math.min(100, Math.round((cardSpent / card.creditLimit) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Transações Recentes */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-sm">Últimas Transações Lançadas</h3>
            <p className="text-[11px] text-slate-400">Histórico de receitas, despesas e pagamentos</p>
          </div>
          <button
            onClick={() => onNavigateFinanceiro('transacoes')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            Ver Todas ({transactions.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Descrição</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.slice(0, 5).map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId);
                const isPaid = t.status === 'paid';

                return (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      {t.type === 'income' ? (
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 inline-block">
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        </span>
                      ) : t.type === 'expense' ? (
                        <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400 inline-block">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 inline-block">
                          <Wallet className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-bold text-white">
                      {t.description}
                    </td>

                    <td className="py-3 px-3 text-slate-300">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: `${cat?.color || '#64748b'}20`, color: cat?.color || '#cbd5e1' }}
                      >
                        {cat?.name || 'Geral'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {t.date}
                    </td>

                    <td className="py-3 px-3">
                      {isPaid ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Pago</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>Pendente</span>
                        </span>
                      )}
                    </td>

                    <td className={`py-3 px-3 text-right font-mono font-extrabold ${
                      t.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'} {formatBRL(t.amount)}
                    </td>
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
