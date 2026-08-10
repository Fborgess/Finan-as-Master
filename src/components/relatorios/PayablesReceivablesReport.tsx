import React, { useState, useMemo } from 'react';
import {
  Transaction,
  Category,
  BankAccount,
  CreditCard,
  PaymentMethod,
  Beneficiary
} from '../../types';
import { ReportHeaderFilter } from './ReportHeaderFilter';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Calendar,
  DollarSign
} from 'lucide-react';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  cards: CreditCard[];
  paymentMethods: PaymentMethod[];
  beneficiaries: Beneficiary[];
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyPreset: (preset: 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear' | 'all') => void;
  activePreset: string;
}

export const PayablesReceivablesReport: React.FC<Props> = ({
  transactions,
  categories,
  accounts,
  cards,
  paymentMethods,
  beneficiaries,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyPreset,
  activePreset,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('pending');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper getters
  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'Sem Categoria';
  const getBeneficiaryName = (id?: string) => beneficiaries.find((b) => b.id === id)?.name || 'Não Informado';
  const getAccountName = (tx: Transaction) => {
    if (tx.creditCardId) {
      const card = cards.find((c) => c.id === tx.creditCardId);
      return card ? `Cartão: ${card.name}` : 'Cartão de Crédito';
    }
    if (tx.accountId) {
      const acc = accounts.find((a) => a.id === tx.accountId);
      return acc ? acc.name : 'Conta Bancária';
    }
    return 'Não Informada';
  };

  // Date filtered items
  const dateFilteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Exclude internal transfers for payables/receivables report
      if (tx.type === 'transfer') return false;

      const txDate = tx.dueDate || tx.date;
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Calculations for overall period KPIs (before status/type tab filters)
  const stats = useMemo(() => {
    let pendingIncome = 0;
    let pendingExpense = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let paidIncome = 0;
    let paidExpense = 0;

    dateFilteredTransactions.forEach((tx) => {
      const txDate = tx.dueDate || tx.date;
      const isOverdue = tx.status === 'pending' && txDate < todayStr;

      if (tx.status === 'pending') {
        if (tx.type === 'income') pendingIncome += tx.amount;
        if (tx.type === 'expense') pendingExpense += tx.amount;
        if (isOverdue) {
          overdueCount++;
          overdueAmount += tx.amount;
        }
      } else if (tx.status === 'paid') {
        if (tx.type === 'income') paidIncome += tx.amount;
        if (tx.type === 'expense') paidExpense += tx.amount;
      }
    });

    return {
      pendingIncome,
      pendingExpense,
      netPending: pendingIncome - pendingExpense,
      overdueCount,
      overdueAmount,
      paidIncome,
      paidExpense,
    };
  }, [dateFilteredTransactions, todayStr]);

  // List filter (search, status, type)
  const displayTransactions = useMemo(() => {
    return dateFilteredTransactions.filter((tx) => {
      const txDate = tx.dueDate || tx.date;
      const isOverdue = tx.status === 'pending' && txDate < todayStr;

      // Status filter
      if (statusFilter === 'pending' && tx.status !== 'pending') return false;
      if (statusFilter === 'overdue' && !isOverdue) return false;
      if (statusFilter === 'paid' && tx.status !== 'paid') return false;

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const categoryName = getCategoryName(tx.categoryId).toLowerCase();
        const beneficiaryName = getBeneficiaryName(tx.beneficiaryId).toLowerCase();
        const desc = tx.description.toLowerCase();
        if (!desc.includes(term) && !categoryName.includes(term) && !beneficiaryName.includes(term)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.dueDate || a.date;
      const dateB = b.dueDate || b.date;
      return dateA.localeCompare(dateB);
    });
  }, [dateFilteredTransactions, statusFilter, typeFilter, searchTerm, todayStr]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Text report summary for copy/share
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const reportTextSummary = `📊 *RELATÓRIO DE CONTAS A PAGAR E RECEBER*
📅 Período: ${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Fim'}
----------------------------------------
📈 Contas a Receber (Pendentes): ${formatCurrency(stats.pendingIncome)}
📉 Contas a Pagar (Pendentes): ${formatCurrency(stats.pendingExpense)}
💵 Saldo Previsto Pendente: ${formatCurrency(stats.netPending)}
⚠️ Contas Atrasadas/Vencidas: ${stats.overdueCount} item(ns)

*RESUMO DOS PRÓXIMOS LANÇAMENTOS:*
${displayTransactions.slice(0, 10).map((t) => {
  const d = formatDate(t.dueDate || t.date);
  const typeTag = t.type === 'income' ? '🟢' : '🔴';
  return `${typeTag} ${d} - ${t.description}: ${formatCurrency(t.amount)} (${getBeneficiaryName(t.beneficiaryId)})`;
}).join('\n')}
${displayTransactions.length > 10 ? `\n... e mais ${displayTransactions.length - 10} item(ns).` : ''}

Gerado via FinançaMaster Web App`;

  // CSV Generation
  const csvData = useMemo(() => {
    const headers = 'Data Vencimento,Tipo,Descricao,Categoria,Beneficiario,Conta/Cartao,Valor,Status\n';
    const rows = displayTransactions.map((tx) => {
      const d = tx.dueDate || tx.date;
      const typeStr = tx.type === 'income' ? 'A Receber' : 'A Pagar';
      const cat = `"${getCategoryName(tx.categoryId)}"`;
      const ben = `"${getBeneficiaryName(tx.beneficiaryId)}"`;
      const acc = `"${getAccountName(tx)}"`;
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      const isOverdue = tx.status === 'pending' && d < todayStr;
      const statusStr = tx.status === 'paid' ? 'Pago' : isOverdue ? 'Vencido/Atrasado' : 'Pendente';
      return `${d},${typeStr},${desc},${cat},${ben},${acc},${tx.amount.toFixed(2)},${statusStr}`;
    }).join('\n');
    return headers + rows;
  }, [displayTransactions, todayStr]);

  return (
    <div className="space-y-6">
      {/* Header & Main Date Filter */}
      <ReportHeaderFilter
        title="Contas a Pagar e Receber"
        subtitle="Controle de compromissos futuros, contas a receber de clientes e pendências a pagar"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onApplyPreset={onApplyPreset}
        activePreset={activePreset}
        onPrint={handlePrint}
        reportTextSummary={reportTextSummary}
        csvData={csvData}
        csvFilename={`contas-pagar-receber-${startDate}-a-${endDate}.csv`}
      />

      {/* Print-Only Header Logo & Title */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FinançaMaster - Relatório Financeiro</h1>
            <h2 className="text-lg font-semibold text-slate-700">Contas a Pagar e Receber</h2>
            <p className="text-xs text-slate-500 mt-1">
              Período de referência: {startDate ? formatDate(startDate) : 'Início'} até {endDate ? formatDate(endDate) : 'Fim'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contas a Receber */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-400 print:text-emerald-700 uppercase tracking-wider">
              Contas a Receber
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 print:bg-slate-100">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white print:text-black mt-2">
            {formatCurrency(stats.pendingIncome)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Entradas pendentes no período
          </p>
        </div>

        {/* Contas a Pagar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-400 print:text-rose-700 uppercase tracking-wider">
              Contas a Pagar
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 print:bg-slate-100">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white print:text-black mt-2">
            {formatCurrency(stats.pendingExpense)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Saídas pendentes no período
          </p>
        </div>

        {/* Saldo Previsto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-400 print:text-blue-700 uppercase tracking-wider">
              Saldo Previsto Pendente
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 print:bg-slate-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${stats.netPending >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}`}>
            {formatCurrency(stats.netPending)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Diferença (A Receber - A Pagar)
          </p>
        </div>

        {/* Contas Vencidas / Atrasadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 print:text-amber-700 uppercase tracking-wider">
              Contas Atrasadas
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 print:bg-slate-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-400 print:text-amber-700 mt-2">
            {stats.overdueCount} <span className="text-sm font-normal text-slate-400">({formatCurrency(stats.overdueAmount)})</span>
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Vencidas até hoje
          </p>
        </div>
      </div>

      {/* Secondary Controls & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === 'overdue'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Atrasadas ({stats.overdueCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === 'paid'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Realizadas/Pagas
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>

          {/* Type Filter & Search Input */}
          <div className="flex items-center space-x-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Tipos</option>
              <option value="income">Apenas a Receber (Receitas)</option>
              <option value="expense">Apenas a Pagar (Despesas)</option>
            </select>

            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar descrição ou favorecido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm print:bg-white print:border-slate-300 print:shadow-none">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between print:border-slate-300">
          <h3 className="font-extrabold text-sm text-white print:text-black flex items-center space-x-2">
            <span>Lista de Lançamentos ({displayTransactions.length})</span>
          </h3>
          <span className="text-xs text-slate-400 print:text-slate-600 font-bold">
            Total na Tabela:{' '}
            <span className="text-white print:text-black font-extrabold">
              {formatCurrency(
                displayTransactions.reduce(
                  (acc, curr) => (curr.type === 'income' ? acc + curr.amount : acc - curr.amount),
                  0
                )
              )}
            </span>
          </span>
        </div>

        {displayTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 print:text-slate-600">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-bold">Nenhuma conta encontrada com os filtros selecionados.</p>
            <p className="text-xs mt-1">Tente alterar o período de datas ou remover o filtro de busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                <tr>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descrição / Favorecido</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Conta / Meio</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {displayTransactions.map((tx) => {
                  const txDate = tx.dueDate || tx.date;
                  const isOverdue = tx.status === 'pending' && txDate < todayStr;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-800/40 transition print:hover:bg-transparent"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-300 print:text-slate-900 whitespace-nowrap">
                        {formatDate(txDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tx.type === 'income' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-emerald-50 print:text-emerald-800">
                            A Receber
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20 print:bg-rose-50 print:text-rose-800">
                            A Pagar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-white print:text-black leading-tight">
                          {tx.description}
                        </div>
                        <div className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                          {getBeneficiaryName(tx.beneficiaryId)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 print:text-slate-800 whitespace-nowrap">
                        {getCategoryName(tx.categoryId)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 print:text-slate-600 whitespace-nowrap">
                        {getAccountName(tx)}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-black text-right whitespace-nowrap text-sm ${
                          tx.type === 'income'
                            ? 'text-emerald-400 print:text-emerald-700'
                            : 'text-rose-400 print:text-rose-700'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {tx.status === 'paid' ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 print:text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Realizada</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/20 text-rose-300 print:text-rose-800 animate-pulse print:animate-none">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Atrasada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-500/20 text-amber-300 print:text-amber-800">
                            <Clock className="w-3 h-3" />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Footer Notice */}
      <div className="hidden print:block text-center text-xs text-slate-500 pt-6 border-t border-slate-300">
        <p>FinançaMaster - Documento impresso para conferência e auditoria de contas.</p>
      </div>
    </div>
  );
};
