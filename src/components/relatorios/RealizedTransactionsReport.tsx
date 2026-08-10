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
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Building2,
  Receipt,
  Search,
  CheckCircle2,
  Scale
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

export const RealizedTransactionsReport: React.FC<Props> = ({
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
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Helper getters
  const getCategoryName = (id: string) => categories.find((c) => c.id === id)?.name || 'Sem Categoria';
  const getBeneficiaryName = (id?: string) => beneficiaries.find((b) => b.id === id)?.name || 'Não Informado';
  const getPaymentMethodName = (id: string) => paymentMethods.find((p) => p.id === id)?.name || 'Não Informado';

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

  // Date and Realized Status ('paid') filtered
  const realizedTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status !== 'paid') return false;
      if (tx.type === 'transfer') return false; // Exclude internal transfers for net profit calculation
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Overall Realized Stats
  const stats = useMemo(() => {
    let realizedIncome = 0;
    let realizedExpense = 0;

    realizedTransactions.forEach((tx) => {
      if (tx.type === 'income') realizedIncome += tx.amount;
      if (tx.type === 'expense') realizedExpense += tx.amount;
    });

    const netResult = realizedIncome - realizedExpense;
    const savingsMargin = realizedIncome > 0 ? ((netResult) / realizedIncome) * 100 : 0;

    return {
      realizedIncome,
      realizedExpense,
      netResult,
      savingsMargin,
      totalCount: realizedTransactions.length,
    };
  }, [realizedTransactions]);

  // Breakdown by Bank Account / Card
  const accountBreakdown = useMemo(() => {
    const map: { [key: string]: { name: string; income: number; expense: number } } = {};

    realizedTransactions.forEach((tx) => {
      const name = getAccountName(tx);
      if (!map[name]) {
        map[name] = { name, income: 0, expense: 0 };
      }
      if (tx.type === 'income') map[name].income += tx.amount;
      if (tx.type === 'expense') map[name].expense += tx.amount;
    });

    return Object.values(map);
  }, [realizedTransactions, accounts, cards]);

  // Breakdown by Payment Method
  const paymentMethodBreakdown = useMemo(() => {
    const map: { [key: string]: { name: string; amount: number; count: number } } = {};

    realizedTransactions.forEach((tx) => {
      const pmName = getPaymentMethodName(tx.paymentMethodId);
      if (!map[pmName]) {
        map[pmName] = { name: pmName, amount: 0, count: 0 };
      }
      map[pmName].amount += tx.amount;
      map[pmName].count += 1;
    });

    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [realizedTransactions, paymentMethods]);

  // Display transactions filtered by type & search
  const displayTransactions = useMemo(() => {
    return realizedTransactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

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
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [realizedTransactions, typeFilter, searchTerm]);

  // Format currency helper
  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Report Text Summary for Copy & Share
  const reportTextSummary = `📊 *RELATÓRIO DE DESPESAS E RECEITAS REALIZADAS*
📅 Período: ${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Fim'}
----------------------------------------
🟢 Receitas Realizadas (Efetivadas): ${formatCurrency(stats.realizedIncome)}
🔴 Despesas Realizadas (Pagas): ${formatCurrency(stats.realizedExpense)}
💵 Resultado Líquido: ${formatCurrency(stats.netResult)}
📈 Margem de Lucro / Poupança: ${stats.savingsMargin.toFixed(1)}%
🔢 Total de Lançamentos Pagos: ${stats.totalCount}

*MAIORES FORMAS DE PAGAMENTO UTILIZADAS:*
${paymentMethodBreakdown.slice(0, 5).map((p) => `• ${p.name}: ${formatCurrency(p.amount)} (${p.count}x)`).join('\n')}

Gerado via FinançaMaster Web App`;

  // CSV Generation
  const csvData = useMemo(() => {
    const headers = 'Data Pagamento,Tipo,Descricao,Categoria,Beneficiario,Conta/Cartao,Forma Pagamento,Valor,Status\n';
    const rows = displayTransactions.map((tx) => {
      const typeStr = tx.type === 'income' ? 'Receita Realizada' : 'Despesa Realizada';
      const cat = `"${getCategoryName(tx.categoryId)}"`;
      const ben = `"${getBeneficiaryName(tx.beneficiaryId)}"`;
      const acc = `"${getAccountName(tx)}"`;
      const pm = `"${getPaymentMethodName(tx.paymentMethodId)}"`;
      const desc = `"${tx.description.replace(/"/g, '""')}"`;
      return `${tx.date},${typeStr},${desc},${cat},${ben},${acc},${pm},${tx.amount.toFixed(2)},Efetivado`;
    }).join('\n');
    return headers + rows;
  }, [displayTransactions]);

  return (
    <div className="space-y-6">
      {/* Header & Date Range Toolbar */}
      <ReportHeaderFilter
        title="Contas e Receitas Realizadas"
        subtitle="Fluxo de caixa efetivado: todas as receitas efetivamente recebidas e despesas quitadas"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onApplyPreset={onApplyPreset}
        activePreset={activePreset}
        onPrint={handlePrint}
        reportTextSummary={reportTextSummary}
        csvData={csvData}
        csvFilename={`relatorio-realizadas-${startDate}-a-${endDate}.csv`}
      />

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">FinançaMaster - Relatório de Execução Financeira</h1>
            <h2 className="text-lg font-semibold text-slate-700">Contas e Receitas Realizadas (Pagas e Recebidas)</h2>
            <p className="text-xs text-slate-500 mt-1">
              Período de referência: {startDate ? formatDate(startDate) : 'Início'} até {endDate ? formatDate(endDate) : 'Fim'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas Realizadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-400 print:text-emerald-700 uppercase tracking-wider">
              Receitas Realizadas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 print:bg-slate-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 print:text-emerald-700 mt-2">
            {formatCurrency(stats.realizedIncome)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Entradas já liquidadas
          </p>
        </div>

        {/* Despesas Realizadas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-400 print:text-rose-700 uppercase tracking-wider">
              Despesas Quitadas
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 print:bg-slate-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 print:text-rose-700 mt-2">
            {formatCurrency(stats.realizedExpense)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Saídas efetivamente pagas
          </p>
        </div>

        {/* Resultado Líquido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-400 print:text-blue-700 uppercase tracking-wider">
              Resultado Líquido (Caixa)
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 print:bg-slate-100">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-black mt-2 ${stats.netResult >= 0 ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'}`}>
            {formatCurrency(stats.netResult)}
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Sobras / Déficit de caixa
          </p>
        </div>

        {/* Taxa de Poupança / Margem */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 print:text-amber-700 uppercase tracking-wider">
              Margem de Poupança
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 print:bg-slate-100">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white print:text-black mt-2">
            {stats.savingsMargin.toFixed(1)}%
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Percentual retido do faturamento
          </p>
        </div>
      </div>

      {/* Account & Payment Method Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown por Conta Bancária / Cartão */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm print:bg-white print:border-slate-300">
          <h3 className="font-extrabold text-sm text-white print:text-black mb-3 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Resumo por Instituição / Conta</span>
          </h3>

          <div className="space-y-3">
            {accountBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum registro para exibir.</p>
            ) : (
              accountBreakdown.map((item) => {
                const balance = item.income - item.expense;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-800 text-xs print:bg-slate-50 print:border-slate-200"
                  >
                    <div>
                      <span className="font-bold text-white print:text-black block">{item.name}</span>
                      <div className="flex space-x-3 text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                        <span className="text-emerald-400">Entradas: {formatCurrency(item.income)}</span>
                        <span className="text-rose-400">Saídas: {formatCurrency(item.expense)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-black ${
                          balance >= 0 ? 'text-emerald-400 print:text-emerald-800' : 'text-rose-400 print:text-rose-800'
                        }`}
                      >
                        {formatCurrency(balance)}
                      </span>
                      <span className="block text-[10px] text-slate-400">Líquido do Período</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Breakdown por Forma de Pagamento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm print:bg-white print:border-slate-300">
          <h3 className="font-extrabold text-sm text-white print:text-black mb-3 flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Distribuição por Forma de Pagamento</span>
          </h3>

          <div className="space-y-2.5">
            {paymentMethodBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum registro para exibir.</p>
            ) : (
              paymentMethodBreakdown.map((pm) => {
                const percent = stats.realizedExpense + stats.realizedIncome > 0
                  ? (pm.amount / (stats.realizedExpense + stats.realizedIncome)) * 100
                  : 0;

                return (
                  <div key={pm.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200 print:text-black">{pm.name}</span>
                      <span className="font-mono font-bold text-white print:text-black">
                        {formatCurrency(pm.amount)}{' '}
                        <span className="text-[10px] font-normal text-slate-400">({pm.count}x - {percent.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden print:bg-slate-200">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setTypeFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({stats.totalCount})
            </button>
            <button
              onClick={() => setTypeFilter('income')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'income'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apenas Receitas
            </button>
            <button
              onClick={() => setTypeFilter('expense')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apenas Despesas
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar histórico pago..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Main Realized Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm print:bg-white print:border-slate-300">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between print:border-slate-300">
          <h3 className="font-extrabold text-sm text-white print:text-black flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Extrato de Transações Efetivadas ({displayTransactions.length})</span>
          </h3>
          <span className="text-xs text-slate-400 print:text-slate-600 font-bold">
            Total Efetivado:{' '}
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
            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40 text-emerald-400" />
            <p className="text-sm font-bold">Nenhum lançamento quitado/efetivado no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                <tr>
                  <th className="px-4 py-3">Data Pgto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Descrição / Beneficiário</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Conta / Meio</th>
                  <th className="px-4 py-3">Forma Pgto</th>
                  <th className="px-4 py-3 text-right">Valor Efetivado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                {displayTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono font-medium text-slate-300 print:text-slate-900 whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {tx.type === 'income' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Receita
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Despesa
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
                    <td className="px-4 py-3 text-slate-400 print:text-slate-600 whitespace-nowrap">
                      {getPaymentMethodName(tx.paymentMethodId)}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-slate-500 pt-6 border-t border-slate-300">
        <p>FinançaMaster - Extrato de receitas e despesas efetuadas impresso via sistema.</p>
      </div>
    </div>
  );
};
