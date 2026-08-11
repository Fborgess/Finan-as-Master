import React, { useState, useMemo } from 'react';
import {
  Transaction,
  Category,
  BankAccount,
  CreditCard,
  Beneficiary
} from '../../types';
import { ReportHeaderFilter } from './ReportHeaderFilter';
import {
  FolderTree,
  TrendingDown,
  TrendingUp,
  PieChart,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Layers,
  Search,
  Tag
} from 'lucide-react';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  cards: CreditCard[];
  beneficiaries: Beneficiary[];
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onApplyPreset: (preset: 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear' | 'all') => void;
  activePreset: string;
}

interface CategoryGroup {
  category: Category;
  subcategories: {
    category: Category;
    totalAmount: number;
    count: number;
    transactions: Transaction[];
  }[];
  directTransactions: Transaction[];
  totalAmount: number;
  count: number;
  percentOfTotal: number;
}

export const CategoryReport: React.FC<Props> = ({
  transactions,
  categories,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onApplyPreset,
  activePreset,
}) => {
  const [viewType, setViewType] = useState<'expense' | 'income' | 'all'>('expense');
  const [onlyPaid, setOnlyPaid] = useState<boolean>(true);
  const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (catId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Filter transactions by date and paid status
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type === 'transfer') return false; // Exclude transfers
      if (onlyPaid && tx.status !== 'paid') return false;
      const txDate = tx.dueDate || tx.date;
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate, onlyPaid]);

  // Overall totals
  const overallExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  const overallIncome = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  // Helper to build hierarchy groups for expenses or income
  const buildCategoryGroups = (targetType: 'expense' | 'income'): CategoryGroup[] => {
    const typeTotal = targetType === 'expense' ? overallExpense : overallIncome;
    if (typeTotal === 0) return [];

    const rootCategories = categories.filter(
      (c) => !c.parentId && (c.type === targetType || c.type === 'both')
    );

    const groups: CategoryGroup[] = rootCategories.map((rootCat) => {
      // Find direct child categories
      const childCategories = categories.filter((c) => c.parentId === rootCat.id);

      // Child category stats
      const subcategoryItems = childCategories.map((childCat) => {
        const childTxs = filteredTransactions.filter(
          (tx) => tx.categoryId === childCat.id && tx.type === targetType
        );
        const total = childTxs.reduce((sum, t) => sum + t.amount, 0);
        return {
          category: childCat,
          totalAmount: total,
          count: childTxs.length,
          transactions: childTxs,
        };
      }).filter((item) => item.count > 0);

      // Direct transactions assigned to root category
      const directTxs = filteredTransactions.filter(
        (tx) => tx.categoryId === rootCat.id && tx.type === targetType
      );
      const directTotal = directTxs.reduce((sum, t) => sum + t.amount, 0);

      // Sum of subcategories + direct
      const rootTotal = directTotal + subcategoryItems.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalCount = directTxs.length + subcategoryItems.reduce((sum, s) => sum + s.count, 0);

      return {
        category: rootCat,
        subcategories: subcategoryItems,
        directTransactions: directTxs,
        totalAmount: rootTotal,
        count: totalCount,
        percentOfTotal: (rootTotal / typeTotal) * 100,
      };
    }).filter((g) => g.count > 0);

    // Also catch orphan transactions (categories created with parent that doesn't match or direct child matching)
    const processedCatIds = new Set<string>();
    groups.forEach((g) => {
      processedCatIds.add(g.category.id);
      g.subcategories.forEach((s) => processedCatIds.add(s.category.id));
    });

    const orphanTxs = filteredTransactions.filter(
      (tx) => tx.type === targetType && !processedCatIds.has(tx.categoryId)
    );

    if (orphanTxs.length > 0) {
      const orphanTotal = orphanTxs.reduce((sum, t) => sum + t.amount, 0);
      groups.push({
        category: {
          id: 'orphan-category',
          name: 'Outras Categoria / Não Mapeadas',
          type: targetType,
          color: '#64748b',
        },
        subcategories: [],
        directTransactions: orphanTxs,
        totalAmount: orphanTotal,
        count: orphanTxs.length,
        percentOfTotal: (orphanTotal / typeTotal) * 100,
      });
    }

    return groups.sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const expenseGroups = useMemo(() => buildCategoryGroups('expense'), [filteredTransactions, categories, overallExpense]);
  const incomeGroups = useMemo(() => buildCategoryGroups('income'), [filteredTransactions, categories, overallIncome]);

  // Highlights
  const topExpenseGroup = expenseGroups[0];
  const topIncomeGroup = incomeGroups[0];

  // Search filter applied to groups
  const filterGroupsBySearch = (groups: CategoryGroup[]) => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter((g) => {
      const catName = g.category.name.toLowerCase();
      const hasSubMatch = g.subcategories.some((s) => s.category.name.toLowerCase().includes(term));
      const hasTxMatch = [...g.directTransactions, ...g.subcategories.flatMap((s) => s.transactions)].some((t) =>
        t.description.toLowerCase().includes(term)
      );
      return catName.includes(term) || hasSubMatch || hasTxMatch;
    });
  };

  const filteredExpenseGroups = useMemo(() => filterGroupsBySearch(expenseGroups), [expenseGroups, searchTerm]);
  const filteredIncomeGroups = useMemo(() => filterGroupsBySearch(incomeGroups), [incomeGroups, searchTerm]);

  // Format currency
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

  // Text summary
  const reportTextSummary = `📊 *RELATÓRIO DE DESPESAS E RECEITAS POR CATEGORIA*
📅 Período: ${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Fim'}
----------------------------------------
🔴 Total Despesas: ${formatCurrency(overallExpense)}
🟢 Total Receitas: ${formatCurrency(overallIncome)}

*TOP CATEGORIAS DE DESPESAS:*
${expenseGroups.slice(0, 5).map((g) => `• ${g.category.name}: ${formatCurrency(g.totalAmount)} (${g.percentOfTotal.toFixed(1)}%)`).join('\n')}

*TOP CATEGORIAS DE RECEITAS:*
${incomeGroups.slice(0, 5).map((g) => `• ${g.category.name}: ${formatCurrency(g.totalAmount)} (${g.percentOfTotal.toFixed(1)}%)`).join('\n')}

Gerado via Khrima Web App`;

  // CSV Export
  const csvData = useMemo(() => {
    const headers = 'Tipo,Categoria Pai,Subcategoria,Quantidade Transacoes,Valor Total (R$),% do Total\n';
    let rows = '';

    expenseGroups.forEach((g) => {
      rows += `Despesa,"${g.category.name}","Geral/Direto",${g.count},${g.totalAmount.toFixed(2)},${g.percentOfTotal.toFixed(2)}%\n`;
      g.subcategories.forEach((s) => {
        rows += `Despesa,"${g.category.name}","${s.category.name}",${s.count},${s.totalAmount.toFixed(2)},${((s.totalAmount / overallExpense) * 100).toFixed(2)}%\n`;
      });
    });

    incomeGroups.forEach((g) => {
      rows += `Receita,"${g.category.name}","Geral/Direto",${g.count},${g.totalAmount.toFixed(2)},${g.percentOfTotal.toFixed(2)}%\n`;
      g.subcategories.forEach((s) => {
        rows += `Receita,"${g.category.name}","${s.category.name}",${s.count},${s.totalAmount.toFixed(2)},${((s.totalAmount / overallIncome) * 100).toFixed(2)}%\n`;
      });
    });

    return headers + rows;
  }, [expenseGroups, incomeGroups, overallExpense, overallIncome]);

  return (
    <div className="space-y-6">
      {/* Header & Main Date Filter */}
      <ReportHeaderFilter
        title="Despesas e Receitas por Categoria"
        subtitle="Análise detalhada de participação de mercado interno por categorias e subcategorias"
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onApplyPreset={onApplyPreset}
        activePreset={activePreset}
        onPrint={handlePrint}
        reportTextSummary={reportTextSummary}
        csvData={csvData}
        csvFilename={`relatorio-por-categoria-${startDate}-a-${endDate}.csv`}
      />

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 pb-4 border-b border-slate-300 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Khrima - Análise de Categorias</h1>
            <h2 className="text-lg font-semibold text-slate-700">Relatório de Despesas e Receitas por Categoria</h2>
            <p className="text-xs text-slate-500 mt-1">
              Período de referência: {startDate ? formatDate(startDate) : 'Início'} até {endDate ? formatDate(endDate) : 'Fim'}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Maior Categoria de Gastos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-rose-400 print:text-rose-700 uppercase tracking-wider">
              Maior Gasto do Período
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 print:bg-slate-100">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-black text-white print:text-black mt-2 truncate">
            {topExpenseGroup ? topExpenseGroup.category.name : 'Nenhuma'}
          </p>
          <p className="text-xs font-mono font-bold text-rose-400 print:text-rose-700 mt-0.5">
            {topExpenseGroup ? formatCurrency(topExpenseGroup.totalAmount) : 'R$ 0,00'}{' '}
            <span className="text-[10px] text-slate-400 font-normal">
              ({topExpenseGroup ? topExpenseGroup.percentOfTotal.toFixed(1) : 0}%)
            </span>
          </p>
        </div>

        {/* Maior Categoria de Entradas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-emerald-400 print:text-emerald-700 uppercase tracking-wider">
              Maior Fonte de Receita
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 print:bg-slate-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-black text-white print:text-black mt-2 truncate">
            {topIncomeGroup ? topIncomeGroup.category.name : 'Nenhuma'}
          </p>
          <p className="text-xs font-mono font-bold text-emerald-400 print:text-emerald-700 mt-0.5">
            {topIncomeGroup ? formatCurrency(topIncomeGroup.totalAmount) : 'R$ 0,00'}{' '}
            <span className="text-[10px] text-slate-400 font-normal">
              ({topIncomeGroup ? topIncomeGroup.percentOfTotal.toFixed(1) : 0}%)
            </span>
          </p>
        </div>

        {/* Total Categorias de Saídas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-amber-400 print:text-amber-700 uppercase tracking-wider">
              Categorias de Saída
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 print:bg-slate-100">
              <FolderTree className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white print:text-black mt-2">
            {expenseGroups.length} <span className="text-xs font-normal text-slate-400">grupos ativos</span>
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Total despesas: {formatCurrency(overallExpense)}
          </p>
        </div>

        {/* Total Categorias de Entradas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm print:border-slate-300 print:bg-white print:text-black">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-blue-400 print:text-blue-700 uppercase tracking-wider">
              Categorias de Entrada
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 print:bg-slate-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-white print:text-black mt-2">
            {incomeGroups.length} <span className="text-xs font-normal text-slate-400">grupos ativos</span>
          </p>
          <p className="text-[11px] text-slate-400 print:text-slate-600 mt-1">
            Total receitas: {formatCurrency(overallIncome)}
          </p>
        </div>
      </div>

      {/* Secondary Toolbar Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* View Type Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-bold">
            <button
              onClick={() => setViewType('expense')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apenas Despesas
            </button>
            <button
              onClick={() => setViewType('income')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'income'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apenas Receitas
            </button>
            <button
              onClick={() => setViewType('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewType === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Visão Geral Ambas
            </button>
          </div>

          {/* Status Switcher & Search */}
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyPaid}
                onChange={(e) => setOnlyPaid(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-slate-700"
              />
              <span>Considerar Apenas Lançamentos Quitados</span>
            </label>

            <div className="relative w-48 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Filtrar categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Groups View */}
      <div className="space-y-6">
        {/* DESPESAS SECTION */}
        {(viewType === 'expense' || viewType === 'all') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm print:bg-white print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-white print:text-black">
                  Detalhamento das Despesas por Categoria
                </h3>
              </div>
              <span className="text-xs font-extrabold text-rose-400 print:text-rose-700 font-mono">
                Total: {formatCurrency(overallExpense)}
              </span>
            </div>

            {filteredExpenseGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-xs font-bold">Nenhuma despesa para exibir no período selecionado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 print:divide-slate-200">
                {filteredExpenseGroups.map((group) => {
                  const isExpanded = !!expandedCategories[group.category.id];

                  return (
                    <div key={group.category.id} className="p-4 hover:bg-slate-800/30 transition">
                      {/* Parent Row */}
                      <div
                        onClick={() => toggleExpand(group.category.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <button className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 print:hidden">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: group.category.color || '#f43f5e' }}
                          />
                          <div>
                            <span className="font-extrabold text-sm text-white print:text-black">
                              {group.category.name}
                            </span>
                            <span className="text-[11px] text-slate-400 print:text-slate-600 block sm:inline sm:ml-2">
                              ({group.count} transação/ões)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 self-end sm:self-auto">
                          <div className="w-28 sm:w-36 bg-slate-800 rounded-full h-2 overflow-hidden print:bg-slate-200">
                            <div
                              className="bg-rose-500 h-full rounded-full"
                              style={{ width: `${Math.min(group.percentOfTotal, 100)}%` }}
                            />
                          </div>
                          <div className="text-right min-w-[100px]">
                            <span className="font-mono font-black text-sm text-rose-400 print:text-rose-700 block">
                              {formatCurrency(group.totalAmount)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {group.percentOfTotal.toFixed(1)}% do total
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subcategories & Direct Transactions (Expanded View or Always Printed) */}
                      {(isExpanded || window.matchMedia('print').matches) && (
                        <div className="mt-3 pl-6 sm:pl-10 space-y-2 border-l-2 border-rose-500/30 pt-2">
                          {group.subcategories.map((sub) => (
                            <div
                              key={sub.category.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs print:bg-slate-50"
                            >
                              <div className="flex items-center space-x-2">
                                <Tag className="w-3 h-3 text-rose-400" />
                                <span className="font-bold text-slate-200 print:text-black">
                                  {sub.category.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({sub.count}x)
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-200 print:text-black">
                                {formatCurrency(sub.totalAmount)}
                              </span>
                            </div>
                          ))}

                          {group.directTransactions.length > 0 && (
                            <div className="p-2 rounded-xl bg-slate-800/20 text-[11px] text-slate-400 flex items-center justify-between">
                              <span>Lançamentos diretos na categoria pai:</span>
                              <span className="font-mono font-bold text-slate-300">
                                {formatCurrency(
                                  group.directTransactions.reduce((acc, curr) => acc + curr.amount, 0)
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* RECEITAS SECTION */}
        {(viewType === 'income' || viewType === 'all') && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm print:bg-white print:border-slate-300">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 print:bg-slate-100 print:border-slate-300">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-white print:text-black">
                  Detalhamento das Receitas por Categoria
                </h3>
              </div>
              <span className="text-xs font-extrabold text-emerald-400 print:text-emerald-700 font-mono">
                Total: {formatCurrency(overallIncome)}
              </span>
            </div>

            {filteredIncomeGroups.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <p className="text-xs font-bold">Nenhuma receita para exibir no período selecionado.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 print:divide-slate-200">
                {filteredIncomeGroups.map((group) => {
                  const isExpanded = !!expandedCategories[group.category.id];

                  return (
                    <div key={group.category.id} className="p-4 hover:bg-slate-800/30 transition">
                      {/* Parent Row */}
                      <div
                        onClick={() => toggleExpand(group.category.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <button className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800 print:hidden">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: group.category.color || '#10b981' }}
                          />
                          <div>
                            <span className="font-extrabold text-sm text-white print:text-black">
                              {group.category.name}
                            </span>
                            <span className="text-[11px] text-slate-400 print:text-slate-600 block sm:inline sm:ml-2">
                              ({group.count} transação/ões)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 self-end sm:self-auto">
                          <div className="w-28 sm:w-36 bg-slate-800 rounded-full h-2 overflow-hidden print:bg-slate-200">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(group.percentOfTotal, 100)}%` }}
                            />
                          </div>
                          <div className="text-right min-w-[100px]">
                            <span className="font-mono font-black text-sm text-emerald-400 print:text-emerald-700 block">
                              {formatCurrency(group.totalAmount)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {group.percentOfTotal.toFixed(1)}% do total
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Subcategories */}
                      {(isExpanded || window.matchMedia('print').matches) && (
                        <div className="mt-3 pl-6 sm:pl-10 space-y-2 border-l-2 border-emerald-500/30 pt-2">
                          {group.subcategories.map((sub) => (
                            <div
                              key={sub.category.id}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 text-xs print:bg-slate-50"
                            >
                              <div className="flex items-center space-x-2">
                                <Tag className="w-3 h-3 text-emerald-400" />
                                <span className="font-bold text-slate-200 print:text-black">
                                  {sub.category.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  ({sub.count}x)
                                </span>
                              </div>
                              <span className="font-mono font-bold text-slate-200 print:text-black">
                                {formatCurrency(sub.totalAmount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print Footer */}
      <div className="hidden print:block text-center text-xs text-slate-500 pt-6 border-t border-slate-300">
        <p>Khrima - Relatório de categorias e subcategorias gerado em PDF/Impressão.</p>
      </div>
    </div>
  );
};
