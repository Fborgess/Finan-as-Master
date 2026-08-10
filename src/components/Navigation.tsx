import React, { useState, useEffect } from 'react';
import {
  MainSection,
  SubMenuCadastro,
  SubMenuFinanceiro,
  SubMenuRelatorios,
  SubMenuConfiguracoes,
  User as UserType,
  AccessProfile,
  FinancialScope
} from '../types';
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  Settings,
  FolderTree,
  Building2,
  CreditCard,
  Receipt,
  Users2,
  Users,
  User as UserIcon,
  Target,
  ArrowRightLeft,
  ShieldAlert,
  UserCheck,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  PlusCircle,
  LogOut,
  Sparkles,
  Smartphone,
  Maximize2,
  Minimize2,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle2,
  Fingerprint,
  Palette,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import { ThemeMode } from '../types';
import { getSystemPreferences, saveSystemPreferences } from '../utils/preferences';

interface Props {
  activeMain: MainSection;
  setActiveMain: (section: MainSection) => void;
  activeCadastro: SubMenuCadastro;
  setActiveCadastro: (sub: SubMenuCadastro) => void;
  activeFinanceiro: SubMenuFinanceiro;
  setActiveFinanceiro: (sub: SubMenuFinanceiro) => void;
  activeRelatorios: SubMenuRelatorios;
  setActiveRelatorios: (sub: SubMenuRelatorios) => void;
  activeConfiguracoes: SubMenuConfiguracoes;
  setActiveConfiguracoes: (sub: SubMenuConfiguracoes) => void;
  users: UserType[];
  profiles: AccessProfile[];
  activeUser: UserType;
  onSelectUser: (user: UserType) => void;
  activeScope: FinancialScope;
  onSelectScope: (scope: FinancialScope) => void;
  onOpenNewTransaction: () => void;
  onLogout?: () => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
  children?: React.ReactNode;
}

export const Navigation: React.FC<Props> = ({
  activeMain,
  setActiveMain,
  activeCadastro,
  setActiveCadastro,
  activeFinanceiro,
  setActiveFinanceiro,
  activeRelatorios,
  setActiveRelatorios,
  activeConfiguracoes,
  setActiveConfiguracoes,
  users,
  profiles,
  activeUser,
  onSelectUser,
  activeScope,
  onSelectScope,
  onOpenNewTransaction,
  onLogout,
  onManualSync,
  isSyncing,
  children,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScopeMenuOpen, setIsScopeMenuOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>(() => getSystemPreferences().theme);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = currentTheme === 'light' ? 'dark' : 'light';
    setCurrentTheme(nextTheme);
    const prefs = getSystemPreferences();
    saveSystemPreferences({ ...prefs, theme: nextTheme });
  };

  // Group Collapses
  const [openCadastro, setOpenCadastro] = useState(true);
  const [openFinanceiro, setOpenFinanceiro] = useState(true);
  const [openRelatorios, setOpenRelatorios] = useState(true);
  const [openConfig, setOpenConfig] = useState(true);

  const activeProfile = profiles.find((p) => p.id === activeUser.profileId);
  const canAccessPessoal = activeProfile?.permissions.canAccessPessoalScope !== false;
  const canAccessFamilia = activeProfile?.permissions.canAccessFamiliaScope !== false;
  const canAccessBoth = canAccessPessoal && canAccessFamilia;

  useEffect(() => {
    if (!canAccessPessoal && activeScope === 'pessoal' && canAccessFamilia) {
      onSelectScope('familia');
    } else if (!canAccessFamilia && activeScope === 'familia' && canAccessPessoal) {
      onSelectScope('pessoal');
    } else if (!canAccessBoth && activeScope === 'todos') {
      if (canAccessPessoal) onSelectScope('pessoal');
      else if (canAccessFamilia) onSelectScope('familia');
    }
  }, [activeUser.id, activeProfile?.id, activeScope, canAccessPessoal, canAccessFamilia, canAccessBoth]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn('Fullscreen request denied or not supported:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleNavClick = (main: MainSection, sub?: any) => {
    setActiveMain(main);
    if (main === 'cadastros' && sub) setActiveCadastro(sub);
    if (main === 'financeiro' && sub) setActiveFinanceiro(sub);
    if (main === 'relatorios' && sub) setActiveRelatorios(sub);
    if (main === 'configuracoes' && sub) setActiveConfiguracoes(sub);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-20 md:pb-6 selection:bg-blue-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white ios-safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-[3.5rem] py-1.5 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Logo & Sidebar Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 focus:outline-none transition flex items-center space-x-1.5"
              aria-label="Menu Navegação"
              title="Abrir Menu de Navegação"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-amber-400" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
              <span className="hidden sm:inline text-xs font-bold text-slate-300">Menu</span>
            </button>

            <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleNavClick('dashboard')}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-lg sm:text-xl">
                F
              </div>
              <div>
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white block leading-tight">
                  Finança<span className="text-blue-400">Master</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block flex items-center space-x-1">
                  {typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) ? (
                    <span className="text-emerald-400 font-bold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      <span>App Nativo (Standalone)</span>
                    </span>
                  ) : (
                    <span>Web & Mobile PWA</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Controls: Fullscreen + Quick Action + Active User */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Cloud Sync Status Button */}
            <button
              onClick={onManualSync}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-extrabold flex items-center space-x-1.5 text-slate-300 transition active:scale-95"
              title="Sincronizar lançamentos e cadastros com a Nuvem agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline text-slate-200">Sincronizar Nuvem</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 text-xs font-bold"
              title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia (Fullscreen)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 text-amber-400" />
                  <span className="hidden md:inline text-amber-400">Sair Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden md:inline">Fullscreen</span>
                </>
              )}
            </button>

            {/* Quick Theme Switcher Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center space-x-1.5 text-xs font-bold"
              title={currentTheme === 'light' ? "Mudar para Tema Escuro (Dark Mode)" : "Mudar para Tema Claro (Light Mode)"}
            >
              {currentTheme === 'light' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline text-amber-600 font-extrabold">Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline text-purple-300 font-extrabold">Escuro</span>
                </>
              )}
            </button>

            {/* Module Switcher (Módulo Pessoal vs Família vs Consolidado) */}
            <div className="relative">
              <button
                onClick={() => setIsScopeMenuOpen(!isScopeMenuOpen)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl border text-xs font-extrabold transition shadow-sm ${
                  activeScope === 'pessoal'
                    ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-300'
                    : activeScope === 'familia'
                    ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
                    : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                }`}
                title="Alternar Módulo Financeiro (Pessoal / Família)"
              >
                {activeScope === 'pessoal' && <UserIcon className="w-4 h-4 text-indigo-400 shrink-0" />}
                {activeScope === 'familia' && <Users className="w-4 h-4 text-purple-400 shrink-0" />}
                {activeScope === 'todos' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                <span className="hidden lg:inline">
                  {activeScope === 'pessoal' && 'Módulo Pessoal'}
                  {activeScope === 'familia' && 'Módulo Família'}
                  {activeScope === 'todos' && 'Visão Consolidada'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {isScopeMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Alternar Módulo Financeiro
                  </p>
                  <div className="space-y-1 mt-1">
                    {canAccessPessoal && (
                      <button
                        onClick={() => {
                          onSelectScope('pessoal');
                          setIsScopeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                          activeScope === 'pessoal'
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <UserIcon className="w-4 h-4 text-indigo-400" />
                          <span>Módulo Pessoal</span>
                        </div>
                        {activeScope === 'pessoal' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    )}

                    {canAccessFamilia && (
                      <button
                        onClick={() => {
                          onSelectScope('familia');
                          setIsScopeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                          activeScope === 'familia'
                            ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span>Módulo Família</span>
                        </div>
                        {activeScope === 'familia' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                      </button>
                    )}

                    {canAccessBoth && (
                      <button
                        onClick={() => {
                          onSelectScope('todos');
                          setIsScopeMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                          activeScope === 'todos'
                            ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30 font-extrabold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Visão Consolidada</span>
                        </div>
                        {activeScope === 'todos' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={onOpenNewTransaction}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Nova Transação</span>
            </button>

            {/* Active User Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-white transition"
              >
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  {activeUser.name.charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <div className="font-bold leading-none">{activeUser.name}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    {activeProfile?.name || 'Usuário'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Perfil Ativo
                    </p>
                    <p className="text-xs font-bold text-white mt-0.5">{activeUser.name}</p>
                    <p className="text-[11px] text-slate-400">{activeUser.email}</p>
                  </div>

                  <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Trocar Usuário Ativo
                  </p>

                  <div className="space-y-1 mt-1">
                    {users.map((u) => {
                      const prof = profiles.find((p) => p.id === u.profileId);
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSelectUser(u);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition ${
                            u.id === activeUser.id
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="leading-none">{u.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{prof?.name}</div>
                            </div>
                          </div>
                          {u.id === activeUser.id && (
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {onLogout && (
                    <div className="border-t border-slate-800 mt-2 pt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sair / Bloquear App</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Overlay Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Main Drawer & View Layout Wrapper */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:pb-8">
        <div className="flex flex-col gap-6 items-start">
          {/* Overlay Drawer Navigation Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 p-4 shadow-2xl overflow-y-auto transform transition-transform duration-200 ease-in-out ${
              isMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Header inside drawer */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  F
                </div>
                <span className="font-extrabold text-sm text-white">Menu Navegação</span>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                title="Fechar Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sidebar Module Switcher Box */}
            <div className="mb-4 p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
                <span>Módulo Ativo</span>
                <span className="text-blue-400 font-mono">Filtro</span>
              </div>
              <div className={`grid gap-1 p-0.5 bg-slate-900 rounded-xl border border-slate-800/80 ${
                canAccessBoth ? 'grid-cols-3' : 'grid-cols-2'
              }`}>
                {canAccessPessoal && (
                  <button
                    onClick={() => onSelectScope('pessoal')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center transition ${
                      activeScope === 'pessoal'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Módulo Pessoal"
                  >
                    <UserIcon className="w-3.5 h-3.5 mb-0.5" />
                    <span>Pessoal</span>
                  </button>
                )}

                {canAccessFamilia && (
                  <button
                    onClick={() => onSelectScope('familia')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center transition ${
                      activeScope === 'familia'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Módulo Família"
                  >
                    <Users className="w-3.5 h-3.5 mb-0.5" />
                    <span>Família</span>
                  </button>
                )}

                {canAccessBoth && (
                  <button
                    onClick={() => onSelectScope('todos')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center transition ${
                      activeScope === 'todos'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Visão Consolidada"
                  >
                    <Sparkles className="w-3.5 h-3.5 mb-0.5" />
                    <span>Ambos</span>
                  </button>
                )}
              </div>
            </div>

            <nav className="space-y-4 text-xs font-medium">
              {/* Dashboard */}
              <button
                onClick={() => handleNavClick('dashboard')}
                className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-xl font-bold transition ${
                  activeMain === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-blue-400" />
                <span>Dashboard Geral</span>
              </button>

              {/* 1. CADASTRO */}
              <div>
                <button
                  onClick={() => setOpenCadastro(!openCadastro)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-white uppercase tracking-wider font-extrabold text-[10px]"
                >
                  <span className="flex items-center space-x-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-amber-400" />
                    <span>1. CADASTRO</span>
                  </span>
                  {openCadastro ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {openCadastro && (
                  <div className="mt-1 space-y-1 pl-3 border-l border-slate-800">
                    <button
                      onClick={() => handleNavClick('cadastros', 'beneficiarios')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'cadastros' && activeCadastro === 'beneficiarios'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Users2 className="w-3.5 h-3.5" />
                      <span>Beneficiários</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('cadastros', 'cartoes')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'cadastros' && activeCadastro === 'cartoes'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cartão de Crédito</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('cadastros', 'categorias')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'cadastros' && activeCadastro === 'categorias'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <FolderTree className="w-3.5 h-3.5" />
                      <span>Categorias Financeiras</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('cadastros', 'contas')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'cadastros' && activeCadastro === 'contas'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Contas Bancárias</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('cadastros', 'pagamentos')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'cadastros' && activeCadastro === 'pagamentos'
                          ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Formas de Pagamento</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. FINANCEIRO */}
              <div>
                <button
                  onClick={() => setOpenFinanceiro(!openFinanceiro)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-white uppercase tracking-wider font-extrabold text-[10px]"
                >
                  <span className="flex items-center space-x-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>2. FINANCEIRO</span>
                  </span>
                  {openFinanceiro ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {openFinanceiro && (
                  <div className="mt-1 space-y-1 pl-3 border-l border-slate-800">
                    <button
                      onClick={() => handleNavClick('financeiro', 'orcamento')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'financeiro' && activeFinanceiro === 'orcamento'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Orçamento Mensal</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('financeiro', 'transacoes')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'financeiro' && activeFinanceiro === 'transacoes'
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Transações</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. RELATÓRIOS */}
              <div>
                <button
                  onClick={() => setOpenRelatorios(!openRelatorios)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-white uppercase tracking-wider font-extrabold text-[10px]"
                >
                  <span className="flex items-center space-x-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                    <span>3. RELATÓRIOS</span>
                  </span>
                  {openRelatorios ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {openRelatorios && (
                  <div className="mt-1 space-y-1 pl-3 border-l border-slate-800">
                    <button
                      onClick={() => handleNavClick('relatorios', 'pagar_receber')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'relatorios' && activeRelatorios === 'pagar_receber'
                          ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Contas a Pagar/Receber</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('relatorios', 'realizadas')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'relatorios' && activeRelatorios === 'realizadas'
                          ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Contas/Receitas Realizadas</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('relatorios', 'por_categoria')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'relatorios' && activeRelatorios === 'por_categoria'
                          ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <PieChart className="w-3.5 h-3.5 text-purple-400" />
                      <span>Relatório por Categoria</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 4. CONFIGURAÇÕES */}
              <div>
                <button
                  onClick={() => setOpenConfig(!openConfig)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-white uppercase tracking-wider font-extrabold text-[10px]"
                >
                  <span className="flex items-center space-x-1.5">
                    <Settings className="w-3.5 h-3.5 text-purple-400" />
                    <span>4. CONFIGURAÇÕES</span>
                  </span>
                  {openConfig ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {openConfig && (
                  <div className="mt-1 space-y-1 pl-3 border-l border-slate-800">
                    <button
                      onClick={() => handleNavClick('configuracoes', 'perfis')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'configuracoes' && activeConfiguracoes === 'perfis'
                          ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Perfil de Acesso</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('configuracoes', 'usuarios')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'configuracoes' && activeConfiguracoes === 'usuarios'
                          ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Usuários</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('configuracoes', 'biometria')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'configuracoes' && activeConfiguracoes === 'biometria'
                          ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Digital / Face ID (Móvel)</span>
                    </button>

                    <button
                      onClick={() => handleNavClick('configuracoes', 'aparencia')}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-xl transition ${
                        activeMain === 'configuracoes' && activeConfiguracoes === 'aparencia'
                          ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                      <span>Tema & Formatação</span>
                    </button>
                  </div>
                )}
              </div>
            </nav>

            {/* Mobile Footer Badge */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center space-x-2 text-[11px] text-slate-400">
              <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
              <span>PWA Mobile Ready (iOS/Android)</span>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 w-full space-y-4">
            {/* Quick Sub-Navigation Bar for Cadastros */}
            {activeMain === 'cadastros' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center overflow-x-auto gap-1 text-xs">
                <button
                  onClick={() => setActiveCadastro('beneficiarios')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeCadastro === 'beneficiarios'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Users2 className="w-3.5 h-3.5" />
                  <span>Beneficiários</span>
                </button>
                <button
                  onClick={() => setActiveCadastro('cartoes')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeCadastro === 'cartoes'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Cartão de Crédito</span>
                </button>
                <button
                  onClick={() => setActiveCadastro('categorias')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeCadastro === 'categorias'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Categorias Financeiras</span>
                </button>
                <button
                  onClick={() => setActiveCadastro('contas')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeCadastro === 'contas'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Contas Bancárias</span>
                </button>
                <button
                  onClick={() => setActiveCadastro('pagamentos')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeCadastro === 'pagamentos'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Formas de Pagamento</span>
                </button>
              </div>
            )}

            {/* Quick Sub-Navigation Bar for Financeiro */}
            {activeMain === 'financeiro' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center overflow-x-auto gap-1 text-xs">
                <button
                  onClick={() => setActiveFinanceiro('transacoes')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeFinanceiro === 'transacoes'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Lançamentos & Transações</span>
                </button>
                <button
                  onClick={() => setActiveFinanceiro('orcamento')}
                  className={`px-3 py-2 rounded-xl font-bold flex items-center space-x-1.5 whitespace-nowrap transition ${
                    activeFinanceiro === 'orcamento'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Orçamento & Teto de Gastos</span>
                </button>
              </div>
            )}

            {children}
          </main>
        </div>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-around md:hidden text-slate-400 ios-safe-bottom">
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-bold ${
            activeMain === 'dashboard' ? 'text-blue-400' : 'hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Inicio</span>
        </button>

        <button
          onClick={() => handleNavClick('financeiro', 'transacoes')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-bold ${
            activeMain === 'financeiro' && activeFinanceiro === 'transacoes' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="w-5 h-5" />
          <span>Transações</span>
        </button>

        {/* Floating Quick Plus Button */}
        <button
          onClick={onOpenNewTransaction}
          className="w-12 h-12 -mt-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/50 border-2 border-slate-900 active:scale-90 transition"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <button
          onClick={() => handleNavClick('cadastros', 'categorias')}
          className={`flex flex-col items-center space-y-0.5 text-[10px] font-bold ${
            activeMain === 'cadastros' ? 'text-amber-400' : 'hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-5 h-5" />
          <span>Cadastros</span>
        </button>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="flex flex-col items-center space-y-0.5 text-[10px] font-bold hover:text-slate-200"
        >
          <Menu className="w-5 h-5" />
          <span>Mais</span>
        </button>
      </div>
    </div>
  );
};
