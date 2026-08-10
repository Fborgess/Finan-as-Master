import React, { useState } from 'react';
import { PaymentMethod, PaymentMethodCode, AccessProfile } from '../../types';
import { Receipt, Plus, Edit2, Trash2, X, Check, CheckCircle2, XCircle, CreditCard, CalendarCheck } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';

interface Props {
  paymentMethods: PaymentMethod[];
  onSavePaymentMethod: (pm: PaymentMethod) => void;
  onDeletePaymentMethod: (id: string) => void;
  activeProfile?: AccessProfile;
}

export const PaymentMethodsView: React.FC<Props> = ({
  paymentMethods,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  activeProfile,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethod | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState<PaymentMethodCode>('pix');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [allowInstallments, setAllowInstallments] = useState(false);

  const canManage = activeProfile?.permissions.canManageCadastros ?? true;

  const handleOpenModal = (pm?: PaymentMethod) => {
    if (pm) {
      setEditingPm(pm);
      setName(pm.name);
      setCode(pm.code);
      setDescription(pm.description || '');
      setActive(pm.active);
      setAllowInstallments(pm.allowInstallments ?? (pm.code === 'credit' || pm.code === 'boleto'));
    } else {
      setEditingPm(null);
      setName('');
      setCode('pix');
      setDescription('');
      setActive(true);
      setAllowInstallments(false);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSavePaymentMethod({
      id: editingPm?.id || `pm-${Date.now()}`,
      name: name.trim(),
      code,
      description: description.trim(),
      active,
      allowInstallments,
    });

    setIsModalOpen(false);
  };

  const toggleActive = (pm: PaymentMethod) => {
    if (!canManage) return;
    onSavePaymentMethod({
      ...pm,
      active: !pm.active,
    });
  };

  const codeOptions = [
    { value: 'pix', label: 'PIX Instantâneo', sublabel: 'À Vista' },
    { value: 'credit', label: 'Cartão de Crédito', sublabel: 'Fatura Mensal' },
    { value: 'debit', label: 'Cartão de Débito', sublabel: 'À Vista' },
    { value: 'transfer', label: 'Transferência TED/DOC', sublabel: 'Bancário' },
    { value: 'boleto', label: 'Boleto Bancário', sublabel: 'Fatura/Carne' },
    { value: 'cash', label: 'Dinheiro em Espécie', sublabel: 'Físico' },
    { value: 'other', label: 'Outra Modalidade', sublabel: 'Geral' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4" />
            <span>1. Cadastro &bull; Formas de Pagamento</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Formas de Pagamento</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre as modalidades aceitas e configure quais permitem parcelamento.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Forma de Pagamento</span>
          </button>
        )}
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...paymentMethods].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map((pm) => (
          <div
            key={pm.id}
            className={`bg-slate-900 border rounded-2xl p-4 transition shadow-sm flex flex-col justify-between ${
              pm.active ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="font-extrabold text-sm text-white">{pm.name}</h3>
                    <button
                      onClick={() => toggleActive(pm)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                        pm.active
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {pm.active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{pm.active ? 'Ativo' : 'Inativo'}</span>
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded">
                      {pm.code}
                    </span>

                    {pm.allowInstallments ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                        <CalendarCheck className="w-3 h-3" />
                        <span>Permite Parcelar</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        À Vista
                      </span>
                    )}
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(pm)}
                      className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePaymentMethod(pm.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {pm.description && (
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {pm.description}
                </p>
              )}
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
                {editingPm ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}
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
                  Nome da Forma de Pagamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PIX, Cartão de Crédito, Vale Alimentação..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Código do Sistema *
                </label>
                <SearchableSelect
                  options={codeOptions}
                  value={code}
                  onChange={(val) => {
                    setCode(val as PaymentMethodCode);
                    if (val === 'credit' || val === 'boleto') {
                      setAllowInstallments(true);
                    }
                  }}
                  searchPlaceholder="Pesquisar código do sistema..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  placeholder="Informações adicionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Toggle Allow Installments */}
              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="allowInstallments" className="text-xs text-white font-bold cursor-pointer block">
                      Permite Parcelamento?
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Habilita campos de quantidade de parcelas no lançamento.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="allowInstallments"
                    checked={allowInstallments}
                    onChange={(e) => setAllowInstallments(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pmActive"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="pmActive" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Disponível para seleção nas transações
                </label>
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
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition"
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
