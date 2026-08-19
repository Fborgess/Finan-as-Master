import React, { useState } from 'react';
import { CreditCard, BankAccount, Transaction, CreditCardInvoicePayment, AccessProfile } from '../../types';
import { CreditCard as CardIcon, Plus, Edit2, Trash2, X, Calendar, Building2, User as UserIcon, Users, FileText, CheckCircle2 } from 'lucide-react';
import { CurrencyInput } from '../common/CurrencyInput';
import { getSystemPreferences, formatTextWithCasing } from '../../utils/preferences';
import { can } from '../../utils/permissions';
import { CreditCardInvoicesView } from './CreditCardInvoicesView';

interface Props {
  cards: CreditCard[];
  accounts: BankAccount[];
  transactions: Transaction[];
  invoicePayments: CreditCardInvoicePayment[];
  onSaveCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
  onSaveInvoicePayment: (payment: CreditCardInvoicePayment, newTransaction?: Transaction) => void;
  activeProfile?: AccessProfile;
}

const COLOR_PRESETS = ['#09090b', '#1e293b', '#820ad1', '#0284c7', '#059669', '#d97706', '#dc2626', '#3f3f46'];

export const CreditCardsView: React.FC<Props> = ({
  cards,
  accounts,
  transactions,
  invoicePayments,
  onSaveCard,
  onDeleteCard,
  onSaveInvoicePayment,
  activeProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'cards' | 'invoices'>('cards');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Mastercard');
  const [creditLimit, setCreditLimit] = useState<number>(5000);
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [bankAccountId, setBankAccountId] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [scope, setScope] = useState<'pessoal' | 'familia'>('pessoal');

  const canCreate = can(activeProfile, 'cartoes', 'create');
  const canEdit = can(activeProfile, 'cartoes', 'edit');
  const canDelete = can(activeProfile, 'cartoes', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const handleOpenModal = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card);
      setName(card.name);
      setBrand(card.brand);
      setCreditLimit(card.creditLimit);
      setClosingDay(card.closingDay.toString());
      setDueDay(card.dueDay.toString());
      setBankAccountId(card.bankAccountId || '');
      setColor(card.color || COLOR_PRESETS[0]);
      setScope(card.scope || 'pessoal');
    } else {
      setEditingCard(null);
      setName('');
      setBrand('Mastercard');
      setCreditLimit(5000);
      setClosingDay('25');
      setDueDay('5');
      setBankAccountId(accounts[0]?.id || '');
      setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      setScope('pessoal');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prefs = getSystemPreferences();
    const formattedName = formatTextWithCasing(name.trim(), prefs.textCasing);

    const limitNum = creditLimit || 0;
    const closeNum = parseInt(closingDay, 10) || 1;
    const dueNum = parseInt(dueDay, 10) || 10;

    onSaveCard({
      id: editingCard?.id || `card-${Date.now()}`,
      name: formattedName,
      brand: brand.trim(),
      creditLimit: limitNum,
      closingDay: closeNum,
      dueDay: dueNum,
      bankAccountId: bankAccountId || undefined,
      color,
      scope,
    });

    setIsModalOpen(false);
  };

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CardIcon className="w-4 h-4" />
            <span>1. Cadastro &bull; Cartões de Crédito & Faturas</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Cartões de Crédito</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerencie limites, faturas (abertas/pagas/vencidas), dias de fechamento/vencimento e pagamentos.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Cartão</span>
          </button>
        )}
      </div>

      {/* Sub-Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeTab === 'cards'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <CardIcon className="w-4 h-4" />
          <span>Meus Cartões ({cards.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
            activeTab === 'invoices'
              ? 'bg-amber-500 text-slate-950 shadow-sm'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Faturas & Extrato de Cartão</span>
        </button>
      </div>

      {activeTab === 'invoices' ? (
        <CreditCardInvoicesView
          cards={cards}
          accounts={accounts}
          transactions={transactions}
          invoicePayments={invoicePayments}
          onSavePayment={onSaveInvoicePayment}
          activeProfile={activeProfile}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...cards].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((card) => {
          const linkedAccount = accounts.find((a) => a.id === card.bankAccountId);

          return (
            <div
              key={card.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all duration-200 hover:-translate-y-1"
            >
              {/* Header Info */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        {/* Brand */}
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                          {card.brand}
                        </span>
                        {/* Scope */}
                        {card.scope === 'familia' ? (
                          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold flex items-center space-x-1">
                            <Users className="w-3 h-3 text-purple-400" />
                            <span>Família</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-bold flex items-center space-x-1">
                            <UserIcon className="w-3 h-3 text-indigo-400" />
                            <span>Pessoal</span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-lg text-white tracking-tight">{card.name}</h3>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="flex items-center space-x-1 shrink-0 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
                        {canEdit && (
                        <button
                          onClick={() => handleOpenModal(card)}
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition"
                          title="Editar Cartão"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => onDeleteCard(card.id)}
                          className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                          title="Excluir Cartão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* EMV Chip & Number Preview */}
                  <div className="flex items-center justify-between my-4 pt-2 border-t border-slate-800/60">
                    <div className="w-7 h-5 rounded bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 border border-amber-200/50 flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm">
                      <div className="w-full h-[1px] bg-amber-900/50 absolute top-1.5" />
                      <div className="w-[1px] h-full bg-amber-900/50 absolute left-2.5" />
                    </div>
                    <span className="font-mono text-xs text-slate-400 tracking-widest font-semibold">
                      •••• •••• ••••
                    </span>
                  </div>

                  {/* Limit Section */}
                  <div className="space-y-0.5 pt-1">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                      Limite Total de Crédito
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                      {formatBRL(card.creditLimit)}
                    </div>
                  </div>
                </div>

                {/* Footer Details: Fechamento, Vencimento, Débito */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-slate-300 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Fech: <strong className="text-white font-bold">Dia {card.closingDay}</strong></span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-slate-300 flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">Venc: <strong className="text-white font-bold">Dia {card.dueDay}</strong></span>
                    </div>
                  </div>

                  {linkedAccount && (
                    <div className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Débito em: <strong className="text-white font-bold">{linkedAccount.name}</strong></span>
                    </div>
                  )}
                </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Card Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
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
                  Nome do Cartão *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Itaú Black, Nubank UV..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Âmbito / Módulo do Cartão *
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
                    Bandeira *
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="Amex">American Express</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Limite de Crédito *
                  </label>
                  <CurrencyInput
                    value={creditLimit}
                    onChange={(val) => setCreditLimit(val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dia Fechamento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    placeholder="25"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dia Vencimento *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    placeholder="5"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Conta para Débito / Vínculo
                </label>
                <select
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Selecione uma conta (Opcional) --</option>
                  {[...accounts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400 font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-xs shadow-sm transition"
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
