import React, { useState } from 'react';
import { Beneficiary, Category, BeneficiaryType, AccessProfile } from '../../types';
import { Users2, Plus, Edit2, Trash2, X, Search, Mail, Phone, FileText, FolderTree } from 'lucide-react';
import { SearchableSelect, SelectOption } from '../common/SearchableSelect';
import { getSystemPreferences, formatTextWithCasing } from '../../utils/preferences';
import { can } from '../../utils/permissions';

interface Props {
  beneficiaries: Beneficiary[];
  categories: Category[];
  onSaveBeneficiary: (b: Beneficiary) => void;
  onDeleteBeneficiary: (id: string) => void;
  activeProfile?: AccessProfile;
}

export const BeneficiariesView: React.FC<Props> = ({
  beneficiaries,
  categories,
  onSaveBeneficiary,
  onDeleteBeneficiary,
  activeProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBen, setEditingBen] = useState<Beneficiary | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<BeneficiaryType>('supplier');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');

  const canCreate = can(activeProfile, 'beneficiarios', 'create');
  const canEdit = can(activeProfile, 'beneficiarios', 'edit');
  const canDelete = can(activeProfile, 'beneficiarios', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  const handleOpenModal = (b?: Beneficiary) => {
    if (b) {
      setEditingBen(b);
      setName(b.name);
      setDocument(b.document || '');
      setEmail(b.email || '');
      setPhone(b.phone || '');
      setType(b.type);
      setDefaultCategoryId(b.defaultCategoryId || '');
    } else {
      setEditingBen(null);
      setName('');
      setDocument('');
      setEmail('');
      setPhone('');
      setType('supplier');
      setDefaultCategoryId('');
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prefs = getSystemPreferences();
    const formattedName = formatTextWithCasing(name.trim(), prefs.textCasing);

    onSaveBeneficiary({
      id: editingBen?.id || `ben-${Date.now()}`,
      name: formattedName,
      document: document.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      type,
      defaultCategoryId: defaultCategoryId || undefined,
    });

    setIsModalOpen(false);
  };

  // Build Category Options for SearchableSelect
  const categoryOptions: SelectOption[] = [
    { value: '', label: '-- Nenhuma (Sugerir no lançamento) --' },
  ];

  categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .forEach((parent) => {
      const children = categories
        .filter((c) => c.parentId === parent.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

      categoryOptions.push({
        value: parent.id,
        label: parent.name,
        sublabel: `Geral (${parent.type === 'income' ? 'Receita' : 'Despesa'})`,
        group: parent.name,
      });

      children.forEach((child) => {
        categoryOptions.push({
          value: child.id,
          label: child.name,
          sublabel: child.type === 'income' ? 'Receita' : 'Despesa',
          group: parent.name,
        });
      });
    });

  const filteredBeneficiaries = beneficiaries
    .filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.document && b.document.includes(searchTerm)) ||
        (b.email && b.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users2 className="w-4 h-4" />
            <span>1. Cadastro &bull; Beneficiários, Fornecedores & Clientes</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Beneficiários e Pagadores</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cadastre empresas, clientes e pessoas para quem você faz pagamentos ou de quem recebe receitas.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Beneficiário</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Beneficiaries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBeneficiaries.map((b) => {
          const defaultCat = categories.find((c) => c.id === b.defaultCategoryId);

          return (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{b.name}</h3>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                        b.type === 'supplier'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : b.type === 'customer'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {b.type === 'supplier'
                        ? 'Fornecedor'
                        : b.type === 'customer'
                        ? 'Cliente / Fonte'
                        : 'Ambos'}
                    </span>
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
                        onClick={() => onDeleteBeneficiary(b.id)}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-400">
                  {b.document && (
                    <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>{b.document}</span>
                    </div>
                  )}

                  {b.email && (
                    <div className="flex items-center space-x-1.5 text-[11px]">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">{b.email}</span>
                    </div>
                  )}

                  {b.phone && (
                    <div className="flex items-center space-x-1.5 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{b.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {defaultCat && (
                <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Categoria padrão:</span>
                  <span
                    className="font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${defaultCat.color}20`, color: defaultCat.color }}
                  >
                    {defaultCat.name}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base">
                {editingBen ? 'Editar Beneficiário' : 'Novo Beneficiário'}
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
                  Nome Razão / Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado Carrefour, Imobiliária..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Cadastro *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as BeneficiaryType)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="supplier">Fornecedor / Recebedor</option>
                    <option value="customer">Cliente / Fonte Pagadora</option>
                    <option value="both">Ambos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-8888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Categoria Financeira Padrão
                </label>
                <SearchableSelect
                  options={categoryOptions}
                  value={defaultCategoryId}
                  onChange={(val) => setDefaultCategoryId(val)}
                  searchPlaceholder="Pesquisar categoria financeira..."
                  placeholder="Selecione a Categoria Padrão"
                />
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
                  Salvar Beneficiário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
