import React, { useState, useEffect } from 'react';
import { SystemPreferences, ThemeMode, TextCasingMode } from '../../types';
import {
  getSystemPreferences,
  saveSystemPreferences,
  formatTextWithCasing,
} from '../../utils/preferences';
import {
  Palette,
  Type,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
  Info,
  Check,
  Zap,
  Sliders
} from 'lucide-react';

interface Props {
  onPreferencesChange?: (prefs: SystemPreferences) => void;
}

export const ThemeAndTextSettingsView: React.FC<Props> = ({ onPreferencesChange }) => {
  const [preferences, setPreferences] = useState<SystemPreferences>(() => getSystemPreferences());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const sampleOriginal = 'bom de preço - alimentos e bebidas';
  const sampleFormatted = formatTextWithCasing(sampleOriginal, preferences.textCasing);

  const handleSelectTheme = (theme: ThemeMode) => {
    const updated = { ...preferences, theme };
    setPreferences(updated);
    saveSystemPreferences(updated);
    if (onPreferencesChange) onPreferencesChange(updated);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSelectCasing = (textCasing: TextCasingMode) => {
    const updated = { ...preferences, textCasing };
    setPreferences(updated);
    saveSystemPreferences(updated);
    if (onPreferencesChange) onPreferencesChange(updated);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Aparência & Formatação de Texto</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize o tema de cores do aplicativo e o padrão de caixa das descrições
            </p>
          </div>
        </div>

        {savedSuccess && (
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3.5 py-2 rounded-xl animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preferências salvas com sucesso!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. SEÇÃO DE TEMAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Palette className="w-5 h-5 text-purple-400" />
            <h3 className="font-extrabold text-white text-base">1. Tema Visual do Sistema</h3>
          </div>

          <p className="text-xs text-slate-400">
            Escolha o estilo de exibição de cores da plataforma:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tema Escuro */}
            <button
              type="button"
              onClick={() => handleSelectTheme('dark')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 relative group ${
                preferences.theme === 'dark'
                  ? 'bg-slate-950 border-purple-500 ring-2 ring-purple-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-purple-400">
                  <Moon className="w-5 h-5" />
                </div>
                {preferences.theme === 'dark' && (
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div>
                <div className="font-extrabold text-sm text-white">Escuro (Dark Mode)</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Tema padrão slate/purple de alto contraste e descanso visual.
                </div>
              </div>

              {/* Preview Box */}
              <div className="w-full bg-slate-900 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-bold">Preview Dashboard</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 font-bold">R$ 1.500,00</span>
              </div>
            </button>

            {/* Tema Claro */}
            <button
              type="button"
              onClick={() => handleSelectTheme('light')}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 relative group ${
                preferences.theme === 'light'
                  ? 'bg-white text-slate-900 border-purple-600 ring-2 ring-purple-500/40'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Sun className="w-5 h-5" />
                </div>
                {preferences.theme === 'light' && (
                  <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div>
                <div className={`font-extrabold text-sm ${preferences.theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  Claro (Light Mode)
                </div>
                <div className={`text-[11px] ${preferences.theme === 'light' ? 'text-slate-600' : 'text-slate-400'} mt-1`}>
                  Fundo claro e limpo para ambientes com alta luminosidade.
                </div>
              </div>

              {/* Preview Box */}
              <div className="w-full bg-slate-100 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-[10px]">
                <span className="text-slate-800 font-bold">Preview Dashboard</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">R$ 1.500,00</span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. SEÇÃO DE CONFIGURAÇÃO DE TEXTO */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Type className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-white text-base">2. Configuração de Texto</h3>
          </div>

          <p className="text-xs text-slate-400">
            Defina o padrão de formatação automática para os textos cadastrados (categorias, descrições, beneficiários):
          </p>

          <div className="space-y-3">
            {/* Opção 1: Tudo maiúsculo */}
            <button
              type="button"
              onClick={() => handleSelectCasing('uppercase')}
              className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                preferences.textCasing === 'uppercase'
                  ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <span>1- Tudo maiúsculo</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md">
                    EX: BOM DE PREÇO
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Converte automaticamente todos os caracteres em letras maiúsculas.
                </p>
              </div>
              {preferences.textCasing === 'uppercase' && (
                <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 ml-2" />
              )}
            </button>

            {/* Opção 2: Primeira Letra Maiúscula (preposições minúsculas) */}
            <button
              type="button"
              onClick={() => handleSelectCasing('titlecase')}
              className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                preferences.textCasing === 'titlecase'
                  ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <span>2- Primeira Letra Maiúscula</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md">
                    EX: Bom de Preço
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Maiúsculas nas palavras principais, mantendo preposições (de, da, do, em, e...) minúsculas.
                </p>
              </div>
              {preferences.textCasing === 'titlecase' && (
                <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 ml-2" />
              )}
            </button>

            {/* Opção 3: Entrada livre */}
            <button
              type="button"
              onClick={() => handleSelectCasing('none')}
              className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                preferences.textCasing === 'none'
                  ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1">
                <div className="font-extrabold text-xs text-white flex items-center space-x-2">
                  <span>3- Entrada livre</span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md">
                    EX: Como digitado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Mantém o texto exatamente da forma como o usuário digitar no formulário.
                </p>
              </div>
              {preferences.textCasing === 'none' && (
                <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 ml-2" />
              )}
            </button>
          </div>

          {/* Live Preview Sample */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
            <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Demonstração de Texto ao Digitar:</span>
            </div>
            <div className="text-xs text-slate-300">
              Original digitado: <code className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">{sampleOriginal}</code>
            </div>
            <div className="text-xs font-bold text-white flex items-center space-x-2 pt-0.5">
              <span>Resultado formatado:</span>
              <span className="text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-lg font-mono text-xs">
                "{sampleFormatted}"
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
