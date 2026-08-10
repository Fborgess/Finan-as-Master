import React, { useState, useEffect } from 'react';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  Category,
  BankAccount,
  CreditCard,
  PaymentMethod,
  Beneficiary,
  User,
  PaymentModality,
  RecurrenceFrequency,
} from '../../types';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  DollarSign,
  User as UserIcon,
  Users,
  Zap,
  CreditCard as CardIcon,
  Repeat,
  Calendar,
  Tag,
  CheckCircle2,
  Clock,
  Building2,
  FileText
} from 'lucide-react';
import { SearchableSelect, SelectOption } from '../common/SearchableSelect';
import { CurrencyInput } from '../common/CurrencyInput';
import { getSystemPreferences, formatTextWithCasing } from '../../utils/preferences';
import {
  getInvoiceYearMonthForDate,
  getInvoiceDates,
  formatYearMonthLabel
} from '../../utils/creditCardInvoices';
import {
  FREQUENCY_OPTIONS,
  addFrequencyToDateString,
  formatFrequencyLabel
} from '../../utils/recurrence';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction | Transaction[]) => void;
  editingTransaction?: Transaction | null;
  categories: Category[];
  accounts: BankAccount[];
  cards: CreditCard[];
  paymentMethods: PaymentMethod[];
  beneficiaries: Beneficiary[];
  activeUser: User;
}

export const TransactionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  categories,
  accounts,
  cards,
  paymentMethods,
  beneficiaries,
  activeUser,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<TransactionStatus>('paid');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [notes, setNotes] = useState('');

  // Âmbito do Lançamento
  const [scope, setScope] = useState<'pessoal' | 'familia'>('pessoal');

  // Modalidade de Pagamento / Agendamento
  const [modality, setModality] = useState<PaymentModality>('single');

  // Configurações de Parcelamento
  const [totalInstallments, setTotalInstallments] = useState<number>(2);
  const [initialInstallment, setInitialInstallment] = useState<number>(1);
  const [installmentMode, setInstallmentMode] = useState<'total' | 'per_installment'>('total');
  const [installmentFrequency, setInstallmentFrequency] = useState<RecurrenceFrequency>('monthly');

  // Configurações de Recorrência / Lançamento Fixo
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('monthly');
  const [recurrenceEndType, setRecurrenceEndType] = useState<'indefinite' | 'count'>('indefinite');
  const [recurrenceCount, setRecurrenceCount] = useState<number>(12);

  const checkAndSetStatusForDate = (targetDueDate: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (targetDueDate > todayStr) {
      setStatus('pending');
    } else {
      setStatus('paid');
    }
  };

  const handleDateChange = (newDate: string) => {
    const prevDate = date;
    setDate(newDate);
    if (!dueDate || dueDate === prevDate) {
      setDueDate(newDate);
      checkAndSetStatusForDate(newDate);
    }
  };

  const handleDueDateChange = (newDueDate: string) => {
    setDueDate(newDueDate);
    if (newDueDate) {
      checkAndSetStatusForDate(newDueDate);
    }
  };

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setDescription(editingTransaction.description);
      setAmount(editingTransaction.amount);
      setDate(editingTransaction.date);
      setDueDate(editingTransaction.dueDate || editingTransaction.date);
      setStatus(editingTransaction.status);
      setCategoryId(editingTransaction.categoryId);
      setAccountId(editingTransaction.accountId || '');
      setDestinationAccountId(editingTransaction.destinationAccountId || '');
      setCreditCardId(editingTransaction.creditCardId || '');
      setPaymentMethodId(editingTransaction.paymentMethodId);
      setBeneficiaryId(editingTransaction.beneficiaryId || '');
      setNotes(editingTransaction.notes || '');
      setScope(editingTransaction.scope || 'pessoal');

      if (editingTransaction.isInstallment || editingTransaction.paymentModality === 'installment') {
        setModality('installment');
        setTotalInstallments(editingTransaction.totalInstallments || 2);
        setInitialInstallment(editingTransaction.installmentNumber || 1);
        setInstallmentFrequency(editingTransaction.installmentFrequency || 'monthly');
      } else if (editingTransaction.isRecurring || editingTransaction.paymentModality === 'recurring') {
        setModality('recurring');
        setRecurrenceFrequency(editingTransaction.recurrenceFrequency || 'monthly');
        if (editingTransaction.recurrenceCount) {
          setRecurrenceEndType('count');
          setRecurrenceCount(editingTransaction.recurrenceCount);
        } else {
          setRecurrenceEndType('indefinite');
        }
      } else {
        setModality('single');
      }
    } else {
      setType('expense');
      setDescription('');
      setAmount(0);
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDueDate(today);
      setStatus('paid');
      setCategoryId(categories[0]?.id || '');
      setAccountId(accounts[0]?.id || '');
      setDestinationAccountId('');
      setCreditCardId('');
      setPaymentMethodId(paymentMethods[0]?.id || '');
      setBeneficiaryId('');
      setNotes('');
      setScope('pessoal');

      setModality('single');
      setTotalInstallments(2);
      setInitialInstallment(1);
      setInstallmentMode('total');
      setInstallmentFrequency('monthly');

      setRecurrenceFrequency('monthly');
      setRecurrenceEndType('indefinite');
      setRecurrenceCount(12);
    }
  }, [editingTransaction, isOpen, categories, accounts, paymentMethods]);

  if (!isOpen) return null;

  // Filter categories by transaction type
  const availableCategories = categories.filter((c) => {
    if (type === 'transfer') return true;
    if (type === 'income') return c.type === 'income' || c.type === 'both';
    if (type === 'expense') return c.type === 'expense' || c.type === 'both';
    return true;
  });

  const handleBeneficiaryChange = (benId: string) => {
    setBeneficiaryId(benId);
    const ben = beneficiaries.find((b) => b.id === benId);
    if (ben && ben.defaultCategoryId) {
      setCategoryId(ben.defaultCategoryId);
    }
  };

  // Build Options for SearchableSelects
  const categoryOptions: SelectOption[] = [];
  categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .forEach((parent) => {
      const children = availableCategories
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      const isParentAvailable = availableCategories.some((c) => c.id === parent.id);

      if (isParentAvailable) {
        categoryOptions.push({
          value: parent.id,
          label: parent.name,
          sublabel: 'Geral',
          group: parent.name,
        });
      }
      children.forEach((child) => {
        categoryOptions.push({
          value: child.id,
          label: child.name,
          group: parent.name,
        });
      });
    });

  const beneficiaryOptions: SelectOption[] = [
    { value: '', label: '-- Nenhum Selecionado --' },
    ...[...beneficiaries]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((b) => ({
        value: b.id,
        label: b.name,
        sublabel: b.type === 'supplier' ? 'Fornecedor' : b.type === 'customer' ? 'Cliente' : 'Ambos',
      })),
  ];

  const paymentMethodOptions: SelectOption[] = [...paymentMethods]
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map((pm) => ({
      value: pm.id,
      label: pm.name,
      sublabel: pm.allowInstallments ? 'Permite Parcelar' : 'À vista',
    }));

  const accountOrCardOptions: SelectOption[] = [
    ...[...accounts]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((acc) => ({
        value: `acc:${acc.id}`,
        label: acc.name,
        sublabel: acc.bankName,
        group: 'Contas Bancárias',
      })),
    ...[...cards]
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((card) => ({
        value: `card:${card.id}`,
        label: `Cartão: ${card.name}`,
        sublabel: card.brand,
        group: 'Cartões de Crédito',
      })),
  ];

  const destinationAccountOptions: SelectOption[] = [
    { value: '', label: '-- Selecione a conta destino --' },
    ...[...accounts]
      .filter((acc) => acc.id !== accountId)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      .map((acc) => ({
        value: acc.id,
        label: acc.name,
        sublabel: acc.bankName,
      })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const prefs = getSystemPreferences();
    const formattedDesc = formatTextWithCasing(description.trim(), prefs.textCasing);
    const numAmount = amount || 0;

    // 1. Lançamento Parcelado
    if (modality === 'installment' && totalInstallments > 1 && !editingTransaction) {
      const groupId = `grp-inst-${Date.now()}`;
      const count = Math.max(2, totalInstallments);
      const startNum = Math.min(Math.max(1, initialInstallment), count);

      let eachAmount = 0;
      if (installmentMode === 'total') {
        eachAmount = Math.round((numAmount / count) * 100) / 100;
      } else {
        eachAmount = numAmount;
      }

      const generatedTxs: Transaction[] = [];

      for (let i = startNum; i <= count; i++) {
        const stepOffset = i - startNum;
        const txDate = addFrequencyToDateString(date, stepOffset, installmentFrequency);
        const txDueDate = addFrequencyToDateString(dueDate || date, stepOffset, installmentFrequency);

        const txStatus = i === startNum ? status : 'pending';
        const cleanDesc = formattedDesc.replace(/\s*\(\d+\/\d+\)$/, '');

        generatedTxs.push({
          id: `tx-${Date.now()}-${i}`,
          type,
          description: `${cleanDesc} (${i}/${count})`,
          amount: eachAmount,
          date: txDate,
          dueDate: txDueDate,
          status: txStatus,
          categoryId: categoryId || categories[0]?.id || 'cat-1',
          accountId: creditCardId ? undefined : accountId || accounts[0]?.id,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          creditCardId: creditCardId || undefined,
          paymentMethodId: paymentMethodId || paymentMethods[0]?.id || 'pm-1',
          beneficiaryId: beneficiaryId || undefined,
          userId: activeUser.id,
          notes: notes.trim()
            ? `${notes.trim()} (Parcela ${i} de ${count})`
            : `Parcela ${i} de ${count} (${formatFrequencyLabel(installmentFrequency)})`,
          scope,
          paymentModality: 'installment',
          isInstallment: true,
          installmentNumber: i,
          totalInstallments: count,
          installmentGroupId: groupId,
          installmentFrequency,
        });
      }

      onSave(generatedTxs);
    }
    // 2. Lançamento Recorrente / Fixo
    else if (modality === 'recurring' && !editingTransaction) {
      const groupId = `grp-rec-${Date.now()}`;
      const occurrences = recurrenceEndType === 'count' ? Math.max(1, recurrenceCount) : 12;

      const generatedTxs: Transaction[] = [];

      for (let i = 1; i <= occurrences; i++) {
        const stepOffset = i - 1;
        const txDate = addFrequencyToDateString(date, stepOffset, recurrenceFrequency);
        const txDueDate = addFrequencyToDateString(dueDate || date, stepOffset, recurrenceFrequency);

        const txStatus = i === 1 ? status : 'pending';

        const freqText = formatFrequencyLabel(recurrenceFrequency);
        const labelNote = recurrenceEndType === 'count'
          ? `Lançamento Recorrente (${i}/${occurrences} • ${freqText})`
          : `Lançamento Fixo (${freqText})`;

        generatedTxs.push({
          id: `tx-rec-${Date.now()}-${i}`,
          type,
          description: formattedDesc,
          amount: numAmount,
          date: txDate,
          dueDate: txDueDate,
          status: txStatus,
          categoryId: categoryId || categories[0]?.id || 'cat-1',
          accountId: creditCardId ? undefined : accountId || accounts[0]?.id,
          destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
          creditCardId: creditCardId || undefined,
          paymentMethodId: paymentMethodId || paymentMethods[0]?.id || 'pm-1',
          beneficiaryId: beneficiaryId || undefined,
          userId: activeUser.id,
          notes: notes.trim() ? `${notes.trim()} - ${labelNote}` : labelNote,
          scope,
          paymentModality: 'recurring',
          isRecurring: true,
          recurrenceFrequency,
          recurrenceCount: recurrenceEndType === 'count' ? occurrences : undefined,
          recurringGroupId: groupId,
          recurrenceIndex: i,
        });
      }

      onSave(generatedTxs);
    }
    // 3. Lançamento À Vista / Único (ou Edição)
    else {
      onSave({
        id: editingTransaction?.id || `tx-${Date.now()}`,
        type,
        description: formattedDesc,
        amount: numAmount,
        date,
        dueDate: dueDate || date,
        status,
        categoryId: categoryId || categories[0]?.id || 'cat-1',
        accountId: creditCardId ? undefined : accountId || accounts[0]?.id,
        destinationAccountId: type === 'transfer' ? destinationAccountId : undefined,
        creditCardId: creditCardId || undefined,
        paymentMethodId: paymentMethodId || paymentMethods[0]?.id || 'pm-1',
        beneficiaryId: beneficiaryId || undefined,
        userId: activeUser.id,
        notes: notes.trim() || undefined,
        scope,
        paymentModality: modality,
        isInstallment: modality === 'installment',
        installmentNumber: modality === 'installment' ? initialInstallment : editingTransaction?.installmentNumber,
        totalInstallments: modality === 'installment' ? totalInstallments : editingTransaction?.totalInstallments,
        installmentGroupId: editingTransaction?.installmentGroupId,
        installmentFrequency: modality === 'installment' ? installmentFrequency : undefined,
        isRecurring: modality === 'recurring',
        recurrenceFrequency: modality === 'recurring' ? recurrenceFrequency : undefined,
        recurrenceCount: modality === 'recurring' && recurrenceEndType === 'count' ? recurrenceCount : undefined,
      });
    }

    onClose();
  };

  const parsedAmount = parseFloat(String(amount)) || 0;
  const computedEachInstallment =
    installmentMode === 'total'
      ? parsedAmount / Math.max(1, totalInstallments)
      : parsedAmount;
  const computedTotalInstallment =
    installmentMode === 'total'
      ? parsedAmount
      : parsedAmount * Math.max(1, totalInstallments);

  const headerBgColor =
    type === 'expense'
      ? 'from-red-950/40 to-slate-900 border-red-800/40'
      : type === 'income'
      ? 'from-emerald-950/40 to-slate-900 border-emerald-800/40'
      : 'from-blue-950/40 to-slate-900 border-blue-800/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900 rounded-t-2xl shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base leading-tight text-slate-100">
                {editingTransaction ? 'Editar Transação' : 'Nova Transação Financeira'}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {type === 'expense' ? 'Registro de Saída / Despesa' : type === 'income' ? 'Registro de Entrada / Receita' : 'Transferência entre Contas'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-700/60 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {/* PASSO 1: TIPO DE LANÇAMENTO & MÓDULO (SELETOR DE TOPO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Tipo */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-200 uppercase tracking-wider mb-1">
                1. Tipo de Lançamento *
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1 transition ${
                    type === 'expense'
                      ? 'bg-red-600 text-white font-extrabold shadow-md border border-red-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  <span>Despesa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1 transition ${
                    type === 'income'
                      ? 'bg-emerald-600 text-white font-extrabold shadow-md border border-emerald-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Receita</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('transfer');
                    setModality('single');
                  }}
                  className={`py-2 rounded-lg flex items-center justify-center space-x-1 transition ${
                    type === 'transfer'
                      ? 'bg-blue-600 text-white font-extrabold shadow-md border border-blue-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Transf.</span>
                </button>
              </div>
            </div>

            {/* Módulo / Scope */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-200 uppercase tracking-wider mb-1">
                Módulo / Âmbito *
              </label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setScope('pessoal')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    scope === 'pessoal'
                      ? 'bg-blue-600 text-white font-extrabold shadow-md border border-blue-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <UserIcon className={`w-3.5 h-3.5 shrink-0 ${scope === 'pessoal' ? 'text-white' : 'text-blue-400'}`} />
                  <span>Pessoal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScope('familia')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    scope === 'familia'
                      ? 'bg-purple-600 text-white font-extrabold shadow-md border border-purple-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users className={`w-3.5 h-3.5 shrink-0 ${scope === 'familia' ? 'text-white' : 'text-purple-400'}`} />
                  <span>Família</span>
                </button>
              </div>
            </div>
          </div>

          {/* PASSO 2: VALOR HERO & DESCRIÇÃO DA OPERAÇÃO */}
          <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Valor Principal */}
              <div className="sm:col-span-7">
                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                  2. Valor do Lançamento (R$) *
                </label>
                <CurrencyInput
                  value={amount}
                  onChange={(val) => setAmount(val)}
                  className="bg-slate-900 border border-slate-700 text-white font-extrabold text-lg sm:text-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status do Pagamento */}
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                  Status *
                </label>
                <button
                  type="button"
                  onClick={() => setStatus(status === 'paid' ? 'pending' : 'paid')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-900 text-xs font-bold text-slate-200 hover:bg-slate-800 flex items-center justify-between transition h-[42px]"
                  title="Clique para alternar entre Pago e Pendente"
                >
                  <span className="flex items-center space-x-1.5 min-w-0">
                    {status === 'paid' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">
                      {status === 'paid'
                        ? type === 'income' ? 'Pago / Recebido' : 'Quitado / Pago'
                        : 'Pendente / Agendado'}
                    </span>
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
                      status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {status === 'paid' ? 'Pago' : 'Não Pago'}
                  </span>
                </button>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Descrição do Lançamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Supermercado, Aluguel, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  const prefs = getSystemPreferences();
                  setDescription(formatTextWithCasing(description, prefs.textCasing));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {/* PASSO 3: CATEGORIA, CONTA & BENEFICIÁRIO */}
          <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center space-x-1.5 text-slate-200 font-extrabold text-xs">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>3. Classificação e Origem dos Dados</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Categoria */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                  Categoria *
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={categoryId}
                  onChange={(val) => setCategoryId(val)}
                  searchPlaceholder="Pesquisar categoria..."
                  placeholder="Selecione Categoria"
                />
              </div>

              {/* Beneficiário / Fornecedor */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                  Beneficiário / Fornecedor
                </label>
                <SearchableSelect
                  options={beneficiaryOptions}
                  value={beneficiaryId}
                  onChange={(val) => handleBeneficiaryChange(val)}
                  searchPlaceholder="Pesquisar beneficiário..."
                  placeholder="Nenhum selecionado"
                />
              </div>
            </div>

            {/* Conta, Cartão e Forma de Pagamento */}
            {type !== 'transfer' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                    Forma de Pagamento *
                  </label>
                  <SearchableSelect
                    options={paymentMethodOptions}
                    value={paymentMethodId}
                    onChange={(val) => setPaymentMethodId(val)}
                    searchPlaceholder="Pesquisar forma..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                    Conta Bancária ou Cartão *
                  </label>
                  <SearchableSelect
                    options={accountOrCardOptions}
                    value={creditCardId ? `card:${creditCardId}` : accountId ? `acc:${accountId}` : ''}
                    onChange={(val) => {
                      if (val.startsWith('card:')) {
                        setCreditCardId(val.replace('card:', ''));
                        setAccountId('');
                      } else {
                        setAccountId(val.replace('acc:', ''));
                        setCreditCardId('');
                      }
                    }}
                    searchPlaceholder="Pesquisar conta ou cartão..."
                  />
                </div>
              </div>

              {creditCardId && (() => {
                const selectedCard = cards.find((c) => c.id === creditCardId);
                if (!selectedCard) return null;
                const targetYM = getInvoiceYearMonthForDate(selectedCard.closingDay, date);
                const { closingDate, dueDate } = getInvoiceDates(selectedCard.closingDay, selectedCard.dueDay, targetYM);
                const formatDateBR = (dStr: string) => dStr.split('-').reverse().join('/');

                return (
                  <div className="mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 flex items-start space-x-2 animate-in fade-in duration-150">
                    <CardIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block font-black">Fatura Correspondente: {formatYearMonthLabel(targetYM)}</strong>
                      <span>
                        Fechamento: <strong>{formatDateBR(closingDate)}</strong> &bull; Vencimento: <strong>{formatDateBR(dueDate)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })()}
            </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                    Conta Origem (Saída) *
                  </label>
                  <SearchableSelect
                    options={[...accounts]
                      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                      .map((acc) => ({
                        value: acc.id,
                        label: acc.name,
                        sublabel: acc.bankName,
                      }))}
                    value={accountId}
                    onChange={(val) => setAccountId(val)}
                    searchPlaceholder="Pesquisar conta origem..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                    Conta Destino (Entrada) *
                  </label>
                  <SearchableSelect
                    options={destinationAccountOptions}
                    value={destinationAccountId}
                    onChange={(val) => setDestinationAccountId(val)}
                    searchPlaceholder="Pesquisar conta destino..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* PASSO 4: MODALIDADE E REGRAS (À VISTA, PARCELADO, RECORRENTE) */}
          {type !== 'transfer' && !editingTransaction && (
            <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl space-y-3">
              <label className="block text-[10px] font-extrabold text-slate-200 uppercase tracking-wider">
                4. Modalidade de Pagamento / Repetição *
              </label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModality('single')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    modality === 'single'
                      ? 'bg-amber-600 text-white font-extrabold shadow-md border border-amber-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Zap className={`w-3.5 h-3.5 shrink-0 ${modality === 'single' ? 'text-white' : 'text-amber-400'}`} />
                  <span>À Vista</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModality('installment')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    modality === 'installment'
                      ? 'bg-purple-600 text-white font-extrabold shadow-md border border-purple-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CardIcon className={`w-3.5 h-3.5 shrink-0 ${modality === 'installment' ? 'text-white' : 'text-purple-400'}`} />
                  <span>Parcelado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModality('recurring')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                    modality === 'recurring'
                      ? 'bg-blue-600 text-white font-extrabold shadow-md border border-blue-500'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Repeat className={`w-3.5 h-3.5 shrink-0 ${modality === 'recurring' ? 'text-white' : 'text-blue-400'}`} />
                  <span>Recorrente</span>
                </button>
              </div>

              {/* Expansor de Parcelamento Padronizado */}
              {modality === 'installment' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 mt-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <CardIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-200">Configuração das Parcelas</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Número de Parcelas *
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={120}
                        value={totalInstallments}
                        onChange={(e) => setTotalInstallments(parseInt(e.target.value, 10) || 2)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Frequência *
                      </label>
                      <select
                        value={installmentFrequency}
                        onChange={(e) => setInstallmentFrequency(e.target.value as RecurrenceFrequency)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        {FREQUENCY_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value} className="bg-slate-900 text-white">
                            {f.label} ({f.description})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Parcela Inicial
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={totalInstallments}
                        value={initialInstallment}
                        onChange={(e) => setInitialInstallment(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Cálculo do Valor *
                      </label>
                      <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setInstallmentMode('total')}
                          className={`py-1.5 rounded-lg transition ${
                            installmentMode === 'total'
                              ? 'bg-blue-600 text-white font-extrabold shadow-sm border border-blue-500'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Dividir Total
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstallmentMode('per_installment')}
                          className={`py-1.5 rounded-lg transition ${
                            installmentMode === 'per_installment'
                              ? 'bg-blue-600 text-white font-extrabold shadow-sm border border-blue-500'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          Por Parcela
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Parcelamento */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>Lançamentos a Gerar:</span>
                      <span className="font-extrabold text-slate-100">
                        {totalInstallments - initialInstallment + 1} de {totalInstallments} parcelas ({formatFrequencyLabel(installmentFrequency)})
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>Valor de Cada Parcela:</span>
                      <span className="font-extrabold text-slate-100 font-mono">
                        R${' '}
                        {computedEachInstallment.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 font-medium border-t border-slate-800 pt-1.5">
                      <span>Valor Total da Compra:</span>
                      <span className="font-extrabold text-slate-100 font-mono">
                        R${' '}
                        {computedTotalInstallment.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Expansor de Recorrência Padronizado */}
              {modality === 'recurring' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3.5 animate-in fade-in zoom-in-95 duration-150 mt-2">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                    <Repeat className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200">Configuração da Recorrência</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Frequência de Repetição *
                      </label>
                      <select
                        value={recurrenceFrequency}
                        onChange={(e) => setRecurrenceFrequency(e.target.value as RecurrenceFrequency)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        {FREQUENCY_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value} className="bg-slate-900 text-white">
                            {f.label} ({f.description})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                        Duração / Limite *
                      </label>
                      <select
                        value={recurrenceEndType}
                        onChange={(e) => setRecurrenceEndType(e.target.value as 'indefinite' | 'count')}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                      >
                        <option value="indefinite" className="bg-slate-900 text-white">Fixo Indefinido (Sem fim)</option>
                        <option value="count" className="bg-slate-900 text-white">Número Fixo de Vezes</option>
                      </select>
                    </div>
                  </div>

                  {recurrenceEndType === 'count' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                          Quantidade de Repetições *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={120}
                          value={recurrenceCount}
                          onChange={(e) => setRecurrenceCount(parseInt(e.target.value, 10) || 1)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-extrabold"
                        />
                      </div>
                      <div className="flex items-end pb-1 text-[11px] text-slate-300">
                        <span>Serão gerados <strong>{recurrenceCount}</strong> lançamentos com intervalo <strong>{formatFrequencyLabel(recurrenceFrequency).toLowerCase()}</strong>.</span>
                      </div>
                    </div>
                  )}

                  {/* Resumo da Recorrência */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>Modalidade:</span>
                      <span className="font-extrabold text-slate-100">
                        {recurrenceEndType === 'count' ? `Recorrente (${recurrenceCount} ciclos)` : 'Lançamento Fixo (Sem fim)'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 font-medium">
                      <span>Frequência:</span>
                      <span className="font-extrabold text-slate-100">
                        {formatFrequencyLabel(recurrenceFrequency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300 font-medium border-t border-slate-800 pt-1.5">
                      <span>Valor por Ciclo:</span>
                      <span className="font-extrabold text-slate-100 font-mono">
                        R${' '}
                        {parsedAmount.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASSO 5: DATAS E ANOTAÇÕES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Data do Lançamento *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {dueDate > new Date().toISOString().split('T')[0] && (
                <p className="text-[10px] text-amber-400 mt-1 font-semibold flex items-center space-x-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Vencimento futuro: alterado para Não Pago (Pendente)</span>
                </p>
              )}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-300 uppercase tracking-wider mb-1">
              Observações / Anotações
            </label>
            <input
              type="text"
              placeholder="Comprovante, observações adicionais..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {modality === 'installment' && totalInstallments > 1 && !editingTransaction
                  ? `Gerar ${totalInstallments - initialInstallment + 1} Parcelas`
                  : modality === 'recurring' && !editingTransaction
                  ? `Gerar Série Recorrente`
                  : 'Salvar Lançamento'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
