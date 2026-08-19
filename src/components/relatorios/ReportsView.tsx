import React, { useState } from 'react';
import {
  Transaction,
  Category,
  BankAccount,
  CreditCard,
  PaymentMethod,
  Beneficiary,
  AccessProfile,
  SubMenuRelatorios
} from '../../types';
import { PayablesReceivablesReport } from './PayablesReceivablesReport';
import { RealizedTransactionsReport } from './RealizedTransactionsReport';
import { CategoryReport } from './CategoryReport';
import {
  FileText,
  Clock,
  CheckCircle2,
  PieChart,
  ShieldAlert
} from 'lucide-react';
import { can } from '../../utils/permissions';

interface Props {
  activeSubMenu: SubMenuRelatorios;
  onSelectSubMenu: (sub: SubMenuRelatorios) => void;
  transactions: Transaction[];
  categories: Category[];
  accounts: BankAccount[];
  cards: CreditCard[];
  paymentMethods: PaymentMethod[];
  beneficiaries: Beneficiary[];
  activeProfile?: AccessProfile;
}

export const ReportsView: React.FC<Props> = ({
  activeSubMenu,
  onSelectSubMenu,
  transactions,
  categories,
  accounts,
  cards,
  paymentMethods,
  beneficiaries,
  activeProfile,
}) => {
  // Check permission per report submenu
  const canPagarReceber = can(activeProfile, 'pagar_receber', 'view');
  const canRealizadas = can(activeProfile, 'realizadas', 'view');
  const canPorCategoria = can(activeProfile, 'por_categoria', 'view');
  const canViewReports = canPagarReceber || canRealizadas || canPorCategoria;

  // Default date filter: First day of current month to last day of current month
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(lastDayStr);
  const [activePreset, setActivePreset] = useState<string>('thisMonth');

  // Preset Date Helper
  const handleApplyPreset = (preset: 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear' | 'all') => {
    setActivePreset(preset);
    const today = new Date();

    if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'lastMonth') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'last30') {
      const start = new Date();
      start.setDate(today.getDate() - 30);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'last90') {
      const start = new Date();
      start.setDate(today.getDate() - 90);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (preset === 'thisYear') {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  if (!canViewReports) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 my-8">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-extrabold text-white">Acesso Restrito aos Relatórios</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Seu perfil de acesso atual não possui permissão para visualizar relatórios gerenciais e estatísticas do sistema. Entre em contato com o administrador para solicitar liberação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs Bar for Reports */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center overflow-x-auto gap-1 text-xs print:hidden">
        {canPagarReceber && (
        <button
          onClick={() => onSelectSubMenu('pagar_receber')}
          className={`px-4 py-1.5 px-3.5 font-semibold flex items-center space-x-2 whitespace-nowrap transition ${
            activeSubMenu === 'pagar_receber'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>1. Contas a Pagar e Receber</span>
        </button>
        )}

        {canRealizadas && (
        <button
          onClick={() => onSelectSubMenu('realizadas')}
          className={`px-4 py-1.5 px-3.5 font-semibold flex items-center space-x-2 whitespace-nowrap transition ${
            activeSubMenu === 'realizadas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>2. Contas e Receitas Realizadas</span>
        </button>
        )}

        {canPorCategoria && (
        <button
          onClick={() => onSelectSubMenu('por_categoria')}
          className={`px-4 py-1.5 px-3.5 font-semibold flex items-center space-x-2 whitespace-nowrap transition ${
            activeSubMenu === 'por_categoria'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4 text-purple-400" />
          <span>3. Despesas e Receitas por Categoria</span>
        </button>
        )}
      </div>

      {/* Render selected report */}
      {activeSubMenu === 'pagar_receber' && canPagarReceber && (
        <PayablesReceivablesReport
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          cards={cards}
          paymentMethods={paymentMethods}
          beneficiaries={beneficiaries}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(d) => {
            setStartDate(d);
            setActivePreset('custom');
          }}
          onEndDateChange={(d) => {
            setEndDate(d);
            setActivePreset('custom');
          }}
          onApplyPreset={handleApplyPreset}
          activePreset={activePreset}
        />
      )}

      {activeSubMenu === 'realizadas' && canRealizadas && (
        <RealizedTransactionsReport
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          cards={cards}
          paymentMethods={paymentMethods}
          beneficiaries={beneficiaries}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(d) => {
            setStartDate(d);
            setActivePreset('custom');
          }}
          onEndDateChange={(d) => {
            setEndDate(d);
            setActivePreset('custom');
          }}
          onApplyPreset={handleApplyPreset}
          activePreset={activePreset}
        />
      )}

      {activeSubMenu === 'por_categoria' && canPorCategoria && (
        <CategoryReport
          transactions={transactions}
          categories={categories}
          accounts={accounts}
          cards={cards}
          beneficiaries={beneficiaries}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={(d) => {
            setStartDate(d);
            setActivePreset('custom');
          }}
          onEndDateChange={(d) => {
            setEndDate(d);
            setActivePreset('custom');
          }}
          onApplyPreset={handleApplyPreset}
          activePreset={activePreset}
        />
      )}
    </div>
  );
};
