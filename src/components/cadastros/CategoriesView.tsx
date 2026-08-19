import React, { useState, useMemo } from 'react';
import { Category, CategoryType, AccessProfile } from '../../types';
import { getSystemPreferences, formatTextWithCasing } from '../../utils/preferences';
import { can } from '../../utils/permissions';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Tag,
  FolderPlus,
  Layers
} from 'lucide-react';

interface Props {
  categories: Category[];
  onSaveCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  activeProfile?: AccessProfile;
}

const COLOR_PRESETS = [
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'
];

export const CategoriesView: React.FC<Props> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
  activeProfile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Expanded parents state (Parent ID -> boolean)
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Form states
  const [categoryKind, setCategoryKind] = useState<'parent' | 'child'>('parent');
  const [parentId, setParentId] = useState<string>('');
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [description, setDescription] = useState('');

  const canCreate = can(activeProfile, 'categorias', 'create');
  const canEdit = can(activeProfile, 'categorias', 'edit');
  const canDelete = can(activeProfile, 'categorias', 'delete');
  const canManage = canCreate || canEdit || canDelete;

  // Separate parent and child categories (sorted alphabetically)
  const parentCategories = useMemo(() => {
    return [...categories.filter((c) => !c.parentId)].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [categories]);

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    parentCategories.forEach((p) => {
      next[p.id] = true;
    });
    setExpandedParents(next);
  };

  const collapseAll = () => {
    setExpandedParents({});
  };

  const handleOpenModal = (cat?: Category, defaultParentId?: string) => {
    if (cat) {
      setEditingCategory(cat);
      if (cat.parentId) {
        setCategoryKind('child');
        setParentId(cat.parentId);
      } else {
        setCategoryKind('parent');
        setParentId('');
      }
      setName(cat.name);
      setType(cat.type);
      setColor(cat.color);
      setDescription(cat.description || '');
    } else {
      setEditingCategory(null);
      setName('');
      if (defaultParentId) {
        setCategoryKind('child');
        setParentId(defaultParentId);
        const parent = parentCategories.find((p) => p.id === defaultParentId);
        if (parent) {
          setType(parent.type);
          setColor(parent.color);
        } else {
          setType('expense');
          setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
        }
      } else {
        setCategoryKind('parent');
        setParentId('');
        setType('expense');
        setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
      }
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const handleParentSelectChange = (selectedParentId: string) => {
    setParentId(selectedParentId);
    const parent = parentCategories.find((p) => p.id === selectedParentId);
    if (parent) {
      setType(parent.type);
      setColor(parent.color);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const prefs = getSystemPreferences();
    const formattedName = formatTextWithCasing(name.trim(), prefs.textCasing);
    const formattedDesc = formatTextWithCasing(description.trim(), prefs.textCasing);

    const finalParentId = categoryKind === 'child' ? parentId : undefined;

    onSaveCategory({
      id: editingCategory?.id || `cat-${Date.now()}`,
      parentId: finalParentId,
      name: formattedName,
      type,
      color,
      description: formattedDesc,
    });

    // Automatically expand parent if we created/edited a child category
    if (finalParentId) {
      setExpandedParents((prev) => ({ ...prev, [finalParentId]: true }));
    }

    setIsModalOpen(false);
  };

  // Filter logic
  const filteredParents = useMemo(() => {
    return parentCategories.filter((parent) => {
      const children = categories.filter((c) => c.parentId === parent.id);

      const matchesSearch =
        parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (parent.description && parent.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        children.some(
          (child) =>
            child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (child.description && child.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchesType =
        filterType === 'ALL' ||
        parent.type === filterType ||
        parent.type === 'both' ||
        children.some((child) => child.type === filterType || child.type === 'both');

      return matchesSearch && matchesType;
    });
  }, [parentCategories, categories, searchTerm, filterType]);

  // Auto-expand parents if searching
  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FolderTree className="w-4 h-4" />
            <span>1. Cadastro &bull; Categorias & Subcategorias</span>
          </div>
          <h2 className="text-xl font-extrabold text-white">Estrutura de Categorias e Subcategorias</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize suas finanças com Categorias Pai e Subcategorias Filhas expansíveis para relatórios detalhados.
          </p>
        </div>

        {canCreate && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-1 px-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs shadow-sm transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Categoria</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter, Search & Expand Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar categoria ou subcategoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Quick expand/collapse controls */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-[11px] font-semibold">
            <button
              onClick={expandAll}
              className="px-2.5 py-1 rounded-full text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition"
              title="Expandir todas as categorias pai"
            >
              Expandir Todas
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
              title="Recolher todas"
            >
              Recolher
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-full transition ${
                filterType === 'ALL' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1.5 rounded-full transition ${
                filterType === 'expense' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Despesas
            </button>
            <button
              onClick={() => setFilterType('income')}
              className={`px-3 py-1.5 rounded-full transition ${
                filterType === 'income' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Receitas
            </button>
          </div>
        </div>
      </div>

      {/* Categories Accordion / Grid */}
      <div className="space-y-4">
        {filteredParents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <FolderTree className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="font-bold text-sm text-slate-300">Nenhuma categoria encontrada</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar o termo de busca ou filtros.</p>
          </div>
        ) : (
          filteredParents.map((parent) => {
            const children = categories
              .filter((c) => c.parentId === parent.id)
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            // If searching or explicitly expanded
            const isExpanded = isSearching || !!expandedParents[parent.id];
            const childrenCount = children.length;

            return (
              <div
                key={parent.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition shadow-sm hover:border-slate-700"
              >
                {/* Parent Category Card Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90">
                  <div className="flex items-center space-x-3.5">
                    {/* Expansion Toggle Button */}
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className={`p-2 rounded-full transition flex items-center justify-center ${
                        childrenCount > 0
                          ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                      title={isExpanded ? 'Recolher subcategorias' : 'Expandir subcategorias'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-amber-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    {/* Color badge */}
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0"
                      style={{ backgroundColor: parent.color }}
                    >
                      {parent.name.charAt(0)}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PAI
                        </span>
                        <h3 className="font-extrabold text-base text-white">{parent.name}</h3>
                      </div>

                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            parent.type === 'income'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : parent.type === 'expense'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {parent.type === 'income' ? 'Receita' : parent.type === 'expense' ? 'Despesa' : 'Mista'}
                        </span>

                        <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                          <Layers className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {childrenCount === 0
                              ? 'Sem subcategorias'
                              : childrenCount === 1
                              ? '1 subcategoria'
                              : `${childrenCount} subcategorias`}
                          </span>
                        </span>
                      </div>

                      {parent.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{parent.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Expansion Button */}
                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {/* Button to add child directly to this parent */}
                    {canCreate && (
                      <button
                        onClick={() => handleOpenModal(undefined, parent.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs transition flex items-center space-x-1"
                        title="Adicionar Subcategoria nesta Categoria Pai"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">+ Subcategoria</span>
                      </button>
                    )}

                    {/* Expand/Collapse Text Toggle */}
                    <button
                      onClick={() => toggleExpand(parent.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs transition flex items-center space-x-1 border border-slate-700"
                    >
                      <span>{isExpanded ? 'Ocultar' : 'Expandir'}</span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit / Delete Parent */}
                    {(canEdit || canDelete) && (
                      <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
                        {canEdit && (
                        <button
                          onClick={() => handleOpenModal(parent)}
                          className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                          title="Editar Categoria Pai"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        )}
                        {canDelete && (
                        <button
                          onClick={() => onDeleteCategory(parent.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                          title="Excluir Categoria Pai"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subcategories Collapsible Section (FILHOS) */}
                {isExpanded && (
                  <div className="bg-slate-950/60 border-t border-slate-800/80 p-4 sm:p-5 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                      <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                        <CornerDownRight className="w-4 h-4 text-amber-400" />
                        <span>Subcategorias Filhas ({children.length})</span>
                      </span>

                      {canCreate && (
                        <button
                          onClick={() => handleOpenModal(undefined, parent.id)}
                          className="text-[11px] font-bold text-amber-400 hover:underline flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nova Subcategoria</span>
                        </button>
                      )}
                    </div>

                    {children.length === 0 ? (
                      <div className="py-4 text-center text-slate-500 text-xs italic bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                        Nenhuma subcategoria cadastrada para {parent.name}.
                        {canCreate && (
                          <button
                            onClick={() => handleOpenModal(undefined, parent.id)}
                            className="ml-2 font-bold text-amber-400 hover:underline not-italic"
                          >
                            + Clique aqui para adicionar a primeira subcategoria
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-2 sm:pl-4">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition flex items-start justify-between space-x-3 shadow-xs"
                          >
                            <div className="flex items-start space-x-2.5">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 mt-0.5"
                                style={{ backgroundColor: child.color }}
                              >
                                {child.name.charAt(0)}
                              </div>

                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    FILHO
                                  </span>
                                  <h4 className="font-extrabold text-xs text-white">{child.name}</h4>
                                </div>

                                {child.description && (
                                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                                    {child.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {(canEdit || canDelete) && (
                              <div className="flex items-center space-x-0.5 shrink-0">
                                {canEdit && (
                                <button
                                  onClick={() => handleOpenModal(child)}
                                  className="p-1 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition"
                                  title="Editar Subcategoria"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                )}
                                {canDelete && (
                                <button
                                  onClick={() => onDeleteCategory(child.id)}
                                  className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                                  title="Excluir Subcategoria"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Category / Subcategory Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-hidden">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center space-x-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <span>
                  {editingCategory
                    ? editingCategory.parentId
                      ? 'Editar Subcategoria (Filho)'
                      : 'Editar Categoria (Pai)'
                    : categoryKind === 'child'
                    ? 'Nova Subcategoria (Filho)'
                    : 'Nova Categoria (Pai)'}
                </span>
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
              {/* Kind selector: Categoria Pai vs Subcategoria */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nível de Hierarquia *
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryKind('parent');
                      setParentId('');
                    }}
                    className={`py-1.5 rounded-xl transition ${
                      categoryKind === 'parent'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Categoria PAI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryKind('child');
                      if (!parentId && parentCategories[0]) {
                        handleParentSelectChange(parentCategories[0].id);
                      }
                    }}
                    className={`py-1.5 rounded-xl transition ${
                      categoryKind === 'child'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Subcategoria (FILHO)
                  </button>
                </div>
              </div>

              {/* Parent Category Select (If Child) */}
              {categoryKind === 'child' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Vincular à Categoria PAI *
                  </label>
                  <select
                    required
                    value={parentId}
                    onChange={(e) => handleParentSelectChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="" disabled>
                      -- Selecione a Categoria Pai --
                    </option>
                    {parentCategories.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type === 'income' ? 'Receita' : p.type === 'expense' ? 'Despesa' : 'Mista'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Nome {categoryKind === 'child' ? 'da Subcategoria *' : 'da Categoria Pai *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    categoryKind === 'child'
                      ? 'Ex: Supermercado, Restaurante, Combustível...'
                      : 'Ex: Alimentação, Habitação, Transporte...'
                  }
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Tipo *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CategoryType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="expense">Despesa (Saída)</option>
                  <option value="income">Receita (Entrada)</option>
                  <option value="both">Ambas (Mista / Investimentos)</option>
                </select>
              </div>

              {/* Cor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cor de Identificação
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition transform ${
                        color === c
                          ? 'scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição / Notas
                </label>
                <input
                  type="text"
                  placeholder="Explicativo do que inclui esta categoria/subcategoria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex space-x-2 pt-2 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-1.5 px-4 border border-slate-700 text-slate-400 font-semibold text-xs hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 px-4 bg-green-600 hover:bg-green-500 text-white font-semibold text-xs shadow-sm transition"
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
