import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  required?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Pesquisar...',
  disabled = false,
  className = '',
  clearable = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search term
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesLabel = opt.label.toLowerCase().includes(term);
    const matchesSublabel = opt.sublabel ? opt.sublabel.toLowerCase().includes(term) : false;
    const matchesGroup = opt.group ? opt.group.toLowerCase().includes(term) : false;
    return matchesLabel || matchesSublabel || matchesGroup;
  });

  // Focus search input when dropdown opens and reset highlighted index
  useEffect(() => {
    if (isOpen) {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      const initialIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(initialIdx >= 0 ? initialIdx : 0);
    } else {
      setSearchTerm('');
      setHighlightedIndex(0);
    }
  }, [isOpen]);

  // Reset highlight when search term changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({
        block: 'nearest',
      });
    }
  }, [highlightedIndex, isOpen]);

  // Group filtered options if group prop is present
  const groupedOptions: { [groupName: string]: SelectOption[] } = {};
  const ungroupedOptions: SelectOption[] = [];

  filteredOptions.forEach((opt) => {
    if (opt.group) {
      if (!groupedOptions[opt.group]) {
        groupedOptions[opt.group] = [];
      }
      groupedOptions[opt.group].push(opt);
    } else {
      ungroupedOptions.push(opt);
    }
  });

  const hasGroups = Object.keys(groupedOptions).length > 0;

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Keyboard navigation on trigger button
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setIsOpen(true);
      setSearchTerm(e.key);
    }
  };

  // Keyboard navigation inside search input and list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length > 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  const selectedOption = options.find((opt) => opt.value === value);

  // Map flat index for refs
  let flatIndexCounter = 0;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full flex items-center justify-between bg-slate-800 border ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700 hover:border-slate-600'
        } rounded-xl px-3 py-2.5 text-xs text-white transition focus:outline-none text-left disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <div className="truncate">
                <span className="font-semibold text-slate-100">{selectedOption.label}</span>
                {selectedOption.sublabel && (
                  <span className="ml-1.5 text-[11px] text-slate-300 font-medium">({selectedOption.sublabel})</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-slate-300 truncate font-medium">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0 text-slate-400">
          {clearable && selectedOption && (
            <div
              onClick={handleClear}
              className="p-1 hover:text-white hover:bg-slate-700 rounded-md transition"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </div>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          onKeyDown={handleInputKeyDown}
          className="absolute z-50 mt-1.5 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Box */}
          <div className="p-2 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                Nenhuma opção encontrada
              </div>
            ) : hasGroups ? (
              <>
                {ungroupedOptions.map((opt) => {
                  const currentIdx = flatIndexCounter++;
                  const isHighlighted = currentIdx === highlightedIndex;
                  const isSelected = value === opt.value;
                  return (
                    <button
                      key={opt.value}
                      ref={(el) => (optionRefs.current[currentIdx] = el)}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : isHighlighted
                          ? 'bg-slate-800 text-white ring-1 ring-blue-500/50'
                          : 'text-slate-100 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-2">
                        {opt.icon}
                        <span className="truncate">{opt.label}</span>
                        {opt.sublabel && (
                          <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>
                            ({opt.sublabel})
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {Object.entries(groupedOptions).map(([groupName, groupOpts]) => (
                  <div key={groupName} className="mb-2">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-200 bg-slate-800 border-y border-slate-700 my-1">
                      {groupName}
                    </div>
                    {groupOpts.map((opt) => {
                      const currentIdx = flatIndexCounter++;
                      const isHighlighted = currentIdx === highlightedIndex;
                      const isSelected = value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          ref={(el) => (optionRefs.current[currentIdx] = el)}
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition text-left pl-5 ${
                            isSelected
                              ? 'bg-blue-600 text-white font-bold shadow-sm'
                              : isHighlighted
                              ? 'bg-slate-800 text-white ring-1 ring-blue-500/50'
                              : 'text-slate-100 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            {opt.icon}
                            <span className="truncate">{opt.label}</span>
                            {opt.sublabel && (
                              <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>
                                ({opt.sublabel})
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </>
            ) : (
              filteredOptions.map((opt) => {
                const currentIdx = flatIndexCounter++;
                const isHighlighted = currentIdx === highlightedIndex;
                const isSelected = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    ref={(el) => (optionRefs.current[currentIdx] = el)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : isHighlighted
                        ? 'bg-slate-800 text-white ring-1 ring-blue-500/50'
                        : 'text-slate-100 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate pr-2">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className={`text-[10px] font-medium ${isSelected ? 'text-blue-100' : 'text-slate-300'}`}>
                          ({opt.sublabel})
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
