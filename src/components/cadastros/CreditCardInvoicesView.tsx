import React, { useState } from 'react';
import { CreditCard, BankAccount, Transaction, CreditCardInvoicePayment, AccessProfile } from '../../types';
import {
  CreditCard as CardIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Calendar,
  Building2,
  FileText,
  Plus,
  ArrowRight,
  Check,
  X,
  Lock,
  Tag,
  User as UserIcon,
  Users
} from 'lucide-react';
import {
  calculateCreditCardInvoice,
  formatYearMonthLabel,
  addMonthsToYearMonth,
  CreditCardInvoiceSummary
} from '../../utils/creditCardInvoices';
import { CurrencyInput } from '../common/CurrencyInput';
import { can } from '../../utils/permissions';

interface Props {
  cards: CreditCard[];
  accounts: BankAccount[];
  transactions: Transaction[];
  invoicePayments: CreditCardInvoicePayment[];
  onSavePayment: (payment: CreditCardInvoicePayment, newTransaction?: Transaction) => void;
  activeProfile?: AccessProfile;
}

export const CreditCardInvoicesView: React.FC<Props> = ({
  cards,
  accounts,
  transactions,
  invoicePayments,
  onSavePayment,
  activeProfile,
}) => {
  // Current month in YYYY-MM
  const todayYM = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedCardId, setSelectedCardId] = useState<string>(() => cards[0]?.id || '');
  const [selectedYM, setSelectedYM] = useState<string>(todayYM());
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Form states for paying invoice
  const [payBankAccountId, setPayBankAccountId] = useState('');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');

  const selectedCard = cards.find((c) => c.id === selectedCardId) || cards[0];

  const canPay = can(activeProfile, 'cartoes', 'create');

  const handlePrevMonth = () => {
    setSelectedYM((prev) => addMonthsToYearMonth(prev, -1));
  };

  const handleNextMonth = () => {
    setSelectedYM((prev) => addMonthsToYearMonth(prev, 1));
  };

  if (!selectedCard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <CardIcon className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <h3 className="font-bold text-base text-white mb-1">Nenhum Cartão Cadastrado</h3>
        <p className="text-xs">Cadastre um cartão de crédito na aba "Meus Cartões" para gerenciar suas faturas.</p>
      </div>
    );
  }

  const invoiceSummary: CreditCardInvoiceSummary = calculateCreditCardInvoice(
    selectedCard,
    selectedYM,
    transactions,
    invoicePayments
  );

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr || !dateStr.includes('-')) return dateStr;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleOpenPayModal = () => {
    setPayBankAccountId(selectedCard.bankAccountId || accounts[0]?.id || '');
    setPayAmount(invoiceSummary.remainingBalance);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`Pagamento da fatura ${invoiceSummary.label} - ${selectedCard.name}`);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBankAccountId || payAmount <= 0) return;

    const paymentId = `pay-${Date.now()}`;
    const txId = `tx-paycard-${Date.now()}`;

    // 1. Transaction to debit bank account
    const debitTransaction: Transaction = {
      id: txId,
      type: 'expense',
      description: `Pagamento Fatura ${selectedCard.name} (${invoiceSummary.label})`,
      amount: payAmount,
      date: payDate,
      dueDate: payDate,
      status: 'paid',
      categoryId: 'cat-8', // Investimentos / Finanças
      accountId: payBankAccountId,
      paymentMethodId: 'pm-6', // Transferência / Débito
      userId: 'usr-admin-fs',
      notes: payNotes,
      scope: selectedCard.scope || 'pessoal',
    };

    // 2. Invoice payment record
    const paymentRecord: CreditCardInvoicePayment = {
      id: paymentId,
      cardId: selectedCard.id,
      yearMonth: selectedYM,
      amountPaid: payAmount,
      paymentDate: payDate,
      bankAccountId: payBankAccountId,
      transactionId: txId,
      notes: payNotes,
    };

    onSavePayment(paymentRecord, debitTransaction);
    setIsPayModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGA':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black flex items-center space-x-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fatura Paga</span>
          </span>
        );
      case 'PARCIAL':
        return (
          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-black flex items-center space-x-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Pago Parcial</span>
          </span>
        );
      case 'FECHADA':
        return (
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black flex items-center space-x-1.5 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Fatura Fechada (Aguardando Pagamento)</span>
          </span>
        );
      case 'VENCIDA':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-black flex items-center space-x-1.5 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Fatura Vencida</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black flex items-center space-x-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>Fatura Aberta</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector and Month Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Card Selector Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {cards.map((card) => {
            const isSelected = card.id === selectedCard.id;
            return (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-black transition flex items-center space-x-2 shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <CardIcon className="w-3.5 h-3.5" />
                <span>{card.name}</span>
              </button>
            );
          })}
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-center space-x-3 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Mês Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-black text-white min-w-[120px] text-center tracking-wide">
            {invoiceSummary.label}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
            title="Próximo Mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Invoice Card Summary */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-xs font-extrabold uppercase text-amber-400 tracking-wider">
                Fatura do Cartão &bull; {selectedCard.brand}
              </span>
              {getStatusBadge(invoiceSummary.status)}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{selectedCard.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              Período de Compras: <strong className="text-slate-200">{formatDateBR(invoiceSummary.periodStart)}</strong> até <strong className="text-slate-200">{formatDateBR(invoiceSummary.periodEnd)}</strong>
            </p>
          </div>

          {/* Action Button: Pay Invoice */}
          {invoiceSummary.remainingBalance > 0 && canPay && (
            <button
              onClick={handleOpenPayModal}
              className="px-5 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition flex items-center justify-center space-x-2 shrink-0"
            >
              <DollarSign className="w-4 h-4" />
              <span>Pagar Fatura ({formatBRL(invoiceSummary.remainingBalance)})</span>
            </button>
          )}
        </div>

        {/* Invoice Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
              Valor Total da Fatura
            </span>
            <span className="text-lg md:text-xl font-black font-mono text-white">
              {formatBRL(invoiceSummary.totalAmount)}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider block mb-1">
              Valor Pago
            </span>
            <span className="text-lg md:text-xl font-black font-mono text-emerald-400">
              {formatBRL(invoiceSummary.amountPaid)}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider block mb-1">
              Saldo Restante a Pagar
            </span>
            <span className="text-lg md:text-xl font-black font-mono text-amber-300">
              {formatBRL(invoiceSummary.remainingBalance)}
            </span>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
              Datas Importantes
            </span>
            <div className="text-xs space-y-0.5">
              <div className="text-slate-300">
                Fechamento: <strong className="text-amber-300 font-bold">{formatDateBR(invoiceSummary.closingDate)}</strong>
              </div>
              <div className="text-slate-300">
                Vencimento: <strong className="text-rose-300 font-bold">{formatDateBR(invoiceSummary.dueDate)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History for this Invoice */}
      {invoiceSummary.payments.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Histórico de Pagamentos desta Fatura</span>
          </h4>
          <div className="space-y-2">
            {invoiceSummary.payments.map((p) => {
              const account = accounts.find((a) => a.id === p.bankAccountId);
              return (
                <div
                  key={p.id}
                  className="bg-slate-850 border border-slate-750 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">{p.notes || 'Pagamento de Fatura'}</span>
                    <span className="text-[11px] text-slate-400">
                      Pago em {formatDateBR(p.paymentDate)} via {account?.name || 'Conta Bancária'}
                    </span>
                  </div>
                  <span className="font-black font-mono text-emerald-400 text-sm">
                    + {formatBRL(p.amountPaid)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoice Items List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-white">Lançamentos da Fatura</h3>
            <p className="text-xs text-slate-400">
              Listagem de todas as compras e parcelas incluídas nesta fatura ({invoiceSummary.transactions.length} itens).
            </p>
          </div>
        </div>

        {invoiceSummary.transactions.length === 0 ? (
          <div className="py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">Nenhum lançamento registrado nesta fatura.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3 rounded-l-xl">Data Compra</th>
                  <th className="p-3">Descrição / Item</th>
                  <th className="p-3">Parcela</th>
                  <th className="p-3">Âmbito</th>
                  <th className="p-3 text-right rounded-r-xl">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoiceSummary.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3 font-mono text-slate-400 shrink-0 whitespace-nowrap">
                      {formatDateBR(tx.date)}
                    </td>
                    <td className="p-3 font-semibold text-white">
                      <div>{tx.description}</div>
                      {tx.notes && <div className="text-[10px] text-slate-400 font-normal">{tx.notes}</div>}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {tx.isInstallment && tx.installmentNumber && tx.totalInstallments ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold">
                          {tx.installmentNumber}/{tx.totalInstallments}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">À vista</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {tx.scope === 'familia' ? (
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          Família
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          Pessoal
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-rose-400 whitespace-nowrap">
                      {formatBRL(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Invoice Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Pagar Fatura de Cartão</span>
              </h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="flex-1 overflow-y-auto p-5 space-y-3.5">
              <div className="bg-slate-850 p-3 rounded-xl border border-slate-750 text-xs space-y-1">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Resumo da Fatura</div>
                <div className="font-black text-sm text-white">{selectedCard.name} ({invoiceSummary.label})</div>
                <div className="text-slate-300">
                  Total Restante a Quitar: <strong className="text-amber-400 font-mono font-extrabold">{formatBRL(invoiceSummary.remainingBalance)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Debitar da Conta Bancária *
                </label>
                <select
                  required
                  value={payBankAccountId}
                  onChange={(e) => setPayBankAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Selecione a Conta --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName}) - Saldo: {formatBRL(acc.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Valor do Pagamento (R$) *
                </label>
                <CurrencyInput
                  value={payAmount}
                  onChange={(val) => setPayAmount(val)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Observação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento via App Itaú"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-2 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="flex-1 py-1.5 px-4 border border-slate-700 text-slate-400 font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-green-500 hover:bg-green-600 text-slate-950 font-black text-xs shadow-md transition"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
