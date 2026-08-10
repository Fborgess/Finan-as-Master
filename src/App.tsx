import React, { useState, useEffect, useMemo } from 'react';
import {
  Category,
  BankAccount,
  CreditCard,
  PaymentMethod,
  Beneficiary,
  Budget,
  Transaction,
  AccessProfile,
  User,
  FinancialScope,
  MainSection,
  SubMenuCadastro,
  SubMenuFinanceiro,
  SubMenuRelatorios,
  SubMenuConfiguracoes,
  CreditCardInvoicePayment
} from './types';
import { StorageService } from './utils/storage';
import { safeLocalStorage, safeSessionStorage } from './utils/safeStorage';
import { syncService, SyncState } from './utils/syncService';
import { Lock, ShieldCheck, RefreshCw, WifiOff } from 'lucide-react';

// Navigation Layout
import { Navigation } from './components/Navigation';

// Main Views
import { DashboardView } from './components/DashboardView';
import { CategoriesView } from './components/cadastros/CategoriesView';
import { BankAccountsView } from './components/cadastros/BankAccountsView';
import { CreditCardsView } from './components/cadastros/CreditCardsView';
import { PaymentMethodsView } from './components/cadastros/PaymentMethodsView';
import { BeneficiariesView } from './components/cadastros/BeneficiariesView';
import { BudgetsView } from './components/financeiro/BudgetsView';
import { TransactionsView } from './components/financeiro/TransactionsView';
import { TransactionModal } from './components/financeiro/TransactionModal';
import { AccessProfilesView } from './components/configuracoes/AccessProfilesView';
import { UsersView } from './components/configuracoes/UsersView';
import { BiometricSettingsView } from './components/configuracoes/BiometricSettingsView';
import { ThemeAndTextSettingsView } from './components/configuracoes/ThemeAndTextSettingsView';
import { ReportsView } from './components/relatorios/ReportsView';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { LoginView } from './components/auth/LoginView';
import { LockScreenModal } from './components/auth/LockScreenModal';
import { getSystemPreferences, applyThemeToDocument } from './utils/preferences';

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const localUser = safeLocalStorage.getItem('fm_authenticated_user');
    const sessionUser = safeSessionStorage.getItem('fm_authenticated_user');
    return Boolean(localUser || sessionUser);
  });

  // Lock Screen state on minimization / app restore
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const biometricSettings = StorageService.getBiometricSettings();
    if (!biometricSettings.enabled) {
      safeLocalStorage.removeItem('fm_app_locked');
      safeSessionStorage.removeItem('fm_app_locked');
      return false;
    }
    return safeLocalStorage.getItem('fm_app_locked') === 'true' || safeSessionStorage.getItem('fm_app_locked') === 'true';
  });

  const [isAppInBackground, setIsAppInBackground] = useState<boolean>(false);
  const [syncState, setSyncState] = useState<SyncState>('synced');

  // Navigation State
  const [activeMain, setActiveMain] = useState<MainSection>('dashboard');
  const [activeCadastro, setActiveCadastro] = useState<SubMenuCadastro>('categorias');
  const [activeFinanceiro, setActiveFinanceiro] = useState<SubMenuFinanceiro>('transacoes');
  const [activeRelatorios, setActiveRelatorios] = useState<SubMenuRelatorios>('pagar_receber');
  const [activeConfiguracoes, setActiveConfiguracoes] = useState<SubMenuConfiguracoes>('perfis');

  // Application Data States
  const [categories, setCategories] = useState<Category[]>(() => StorageService.getCategories());
  const [accounts, setAccounts] = useState<BankAccount[]>(() => StorageService.getAccounts());
  const [cards, setCards] = useState<CreditCard[]>(() => StorageService.getCreditCards());
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(() => StorageService.getPaymentMethods());
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>(() => StorageService.getBeneficiaries());
  const [budgets, setBudgets] = useState<Budget[]>(() => StorageService.getBudgets());
  const [transactions, setTransactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  const [profiles, setProfiles] = useState<AccessProfile[]>(() => StorageService.getProfiles());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());
  const [invoicePayments, setInvoicePayments] = useState<CreditCardInvoicePayment[]>(() => StorageService.getCreditCardInvoicePayments());

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return safeLocalStorage.getItem('fm_authenticated_user') || safeSessionStorage.getItem('fm_authenticated_user') || StorageService.getActiveUserId();
  });
  const [activeScope, setActiveScope] = useState<FinancialScope>(() => StorageService.getFinancialScope());

  // Transaction Modal State
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const refreshAllStateFromStorage = () => {
    setCategories(StorageService.getCategories());
    setAccounts(StorageService.getAccounts());
    setCards(StorageService.getCreditCards());
    setPaymentMethods(StorageService.getPaymentMethods());
    setBeneficiaries(StorageService.getBeneficiaries());
    setBudgets(StorageService.getBudgets());
    setTransactions(StorageService.getTransactions());
    setProfiles(StorageService.getProfiles());
    setUsers(StorageService.getUsers());
    setInvoicePayments(StorageService.getCreditCardInvoicePayments());
  };

  // Sync with LocalStorage and Theme
  useEffect(() => {
    const prefs = getSystemPreferences();
    applyThemeToDocument(prefs.theme);

    // Subscribe to cloud sync state
    const unsubscribeSync = syncService.subscribe((state) => {
      setSyncState(state);
    });

    // Start auto sync polling server every 10s
    const stopAutoSync = syncService.startAutoSync(() => {
      refreshAllStateFromStorage();
    });

    return () => {
      unsubscribeSync();
      stopAutoSync();
    };
  }, []);

  // Monitor App Minimization / Backgrounding / Window Blur to Lock Screen for Security
  useEffect(() => {
    if (!isAuthenticated) return;

    const lockApp = () => {
      const biometricSettings = StorageService.getBiometricSettings();
      if (biometricSettings.enabled && biometricSettings.lockOnMinimize) {
        safeLocalStorage.setItem('fm_app_locked', 'true');
        safeSessionStorage.setItem('fm_app_locked', 'true');
        setIsLocked(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAppInBackground(true);
        lockApp();
      } else if (document.visibilityState === 'visible') {
        setIsAppInBackground(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);

  // Real-time synchronization across Web tabs and PWA windows on the device
  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (!e.key) {
        setCategories(StorageService.getCategories());
        setAccounts(StorageService.getAccounts());
        setCards(StorageService.getCreditCards());
        setPaymentMethods(StorageService.getPaymentMethods());
        setBeneficiaries(StorageService.getBeneficiaries());
        setBudgets(StorageService.getBudgets());
        setTransactions(StorageService.getTransactions());
        setProfiles(StorageService.getProfiles());
        setUsers(StorageService.getUsers());
        return;
      }

      switch (e.key) {
        case 'fm_categories':
          setCategories(StorageService.getCategories());
          break;
        case 'fm_accounts':
          setAccounts(StorageService.getAccounts());
          break;
        case 'fm_cards':
          setCards(StorageService.getCreditCards());
          break;
        case 'fm_payment_methods':
          setPaymentMethods(StorageService.getPaymentMethods());
          break;
        case 'fm_beneficiaries':
          setBeneficiaries(StorageService.getBeneficiaries());
          break;
        case 'fm_budgets':
          setBudgets(StorageService.getBudgets());
          break;
        case 'fm_transactions':
          setTransactions(StorageService.getTransactions());
          break;
        case 'fm_profiles':
          setProfiles(StorageService.getProfiles());
          break;
        case 'fm_users':
          setUsers(StorageService.getUsers());
          break;
        case 'fm_financial_scope':
          setActiveScope(StorageService.getFinancialScope());
          break;
        case 'fm_active_user_id':
        case 'fm_authenticated_user':
          setActiveUserId(safeLocalStorage.getItem('fm_authenticated_user') || StorageService.getActiveUserId());
          break;
      }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  useEffect(() => { StorageService.saveCategories(categories); }, [categories]);
  useEffect(() => { StorageService.saveAccounts(accounts); }, [accounts]);
  useEffect(() => { StorageService.saveCreditCards(cards); }, [cards]);
  useEffect(() => { StorageService.savePaymentMethods(paymentMethods); }, [paymentMethods]);
  useEffect(() => { StorageService.saveBeneficiaries(beneficiaries); }, [beneficiaries]);
  useEffect(() => { StorageService.saveBudgets(budgets); }, [budgets]);
  useEffect(() => { StorageService.saveTransactions(transactions); }, [transactions]);
  useEffect(() => { StorageService.saveProfiles(profiles); }, [profiles]);
  useEffect(() => { StorageService.saveUsers(users); }, [users]);
  useEffect(() => { StorageService.saveCreditCardInvoicePayments(invoicePayments); }, [invoicePayments]);
  useEffect(() => { StorageService.setActiveUserId(activeUserId); }, [activeUserId]);
  useEffect(() => { StorageService.saveFinancialScope(activeScope); }, [activeScope]);

  // Push updates to cloud server whenever local data changes (only after initial pull is complete)
  useEffect(() => {
    if (syncService.isInitialPullDone()) {
      syncService.pushData();
    }
  }, [categories, accounts, cards, paymentMethods, beneficiaries, budgets, transactions, profiles, users, invoicePayments]);

  const handleManualSync = async () => {
    await syncService.pullData();
    refreshAllStateFromStorage();
  };

  // Scoped Data Filtering for Active Scope (Pessoal vs Família vs Todos)
  const scopedTransactions = useMemo(() => {
    if (activeScope === 'todos') return transactions;
    return transactions.filter((t) => !t.scope || t.scope === activeScope);
  }, [transactions, activeScope]);

  const scopedAccounts = useMemo(() => {
    if (activeScope === 'todos') return accounts;
    return accounts.filter((a) => !a.scope || a.scope === activeScope);
  }, [accounts, activeScope]);

  const scopedCards = useMemo(() => {
    if (activeScope === 'todos') return cards;
    return cards.filter((c) => !c.scope || c.scope === activeScope);
  }, [cards, activeScope]);

  const scopedBudgets = useMemo(() => {
    if (activeScope === 'todos') return budgets;
    return budgets.filter((b) => !b.scope || b.scope === activeScope);
  }, [budgets, activeScope]);

  // Recalculate account balance based on initial balance + paid transactions
  const recalculateAccountBalances = (updatedTxs: Transaction[], currentAccounts: BankAccount[]) => {
    return currentAccounts.map((acc) => {
      let balance = acc.initialBalance;

      updatedTxs.forEach((tx) => {
        if (tx.status !== 'paid') return;

        if (tx.accountId === acc.id) {
          if (tx.type === 'income') balance += tx.amount;
          if (tx.type === 'expense' && !tx.creditCardId) balance -= tx.amount;
          if (tx.type === 'transfer') balance -= tx.amount;
        }

        if (tx.type === 'transfer' && tx.destinationAccountId === acc.id) {
          balance += tx.amount;
        }
      });

      return {
        ...acc,
        currentBalance: balance,
      };
    });
  };

  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || {
    id: 'usr-admin-fs',
    name: 'Administrador (fsborgess)',
    email: 'fsborgess@gmail.com',
    profileId: 'prof-admin',
    pin: '1910',
    password: '1910',
    status: 'active'
  };

  const activeProfile = profiles.find((p) => p.id === activeUser.profileId);

  // Authentication Handlers
  const handleLoginSuccess = (user: User) => {
    setActiveUserId(user.id);
    StorageService.setActiveUserId(user.id);
    safeLocalStorage.setItem('fm_authenticated_user', user.id);
    setIsAuthenticated(true);
    setIsLocked(false);
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
  };

  const handleLogout = () => {
    safeLocalStorage.removeItem('fm_authenticated_user');
    safeSessionStorage.removeItem('fm_authenticated_user');
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
    setIsAuthenticated(false);
    setIsLocked(false);
  };

  // Handlers: Categorias
  const handleSaveInvoicePayment = (payment: CreditCardInvoicePayment, newTransaction?: Transaction) => {
    setInvoicePayments((prev) => [...prev, payment]);
    if (newTransaction) {
      handleSaveTransaction(newTransaction);
    }
  };

  const handleSaveCategory = (cat: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [...prev, cat];
    });
  };
  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  // Handlers: Contas Bancárias
  const handleSaveAccount = (acc: BankAccount) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === acc.id);
      let updatedList;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = acc;
        updatedList = next;
      } else {
        updatedList = [...prev, acc];
      }
      return recalculateAccountBalances(transactions, updatedList);
    });
  };
  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // Handlers: Cartões
  const handleSaveCard = (card: CreditCard) => {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = card;
        return next;
      }
      return [...prev, card];
    });
  };
  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Handlers: Formas de Pagamento
  const handleSavePaymentMethod = (pm: PaymentMethod) => {
    setPaymentMethods((prev) => {
      const idx = prev.findIndex((p) => p.id === pm.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = pm;
        return next;
      }
      return [...prev, pm];
    });
  };
  const handleDeletePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
  };

  // Handlers: Beneficiários
  const handleSaveBeneficiary = (ben: Beneficiary) => {
    setBeneficiaries((prev) => {
      const idx = prev.findIndex((b) => b.id === ben.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ben;
        return next;
      }
      return [...prev, ben];
    });
  };
  const handleDeleteBeneficiary = (id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  };

  // Handlers: Orçamentos
  const handleSaveBudget = (b: Budget) => {
    setBudgets((prev) => {
      const idx = prev.findIndex((item) => item.id === b.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = b;
        return next;
      }
      return [...prev, b];
    });
  };
  const handleDeleteBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  // Handlers: Transações
  const handleSaveTransaction = (txInput: Transaction | Transaction[]) => {
    setTransactions((prev) => {
      let updatedTxs = [...prev];
      const itemsToAddOrUpdate = Array.isArray(txInput) ? txInput : [txInput];

      itemsToAddOrUpdate.forEach((tx) => {
        const idx = updatedTxs.findIndex((item) => item.id === tx.id);
        if (idx >= 0) {
          updatedTxs[idx] = tx;
        } else {
          updatedTxs = [tx, ...updatedTxs];
        }
      });

      // Automatically update account balances
      setAccounts((currentAccounts) => recalculateAccountBalances(updatedTxs, currentAccounts));
      return updatedTxs;
    });
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => {
      const updatedTxs = prev.filter((t) => t.id !== id);
      setAccounts((currentAccounts) => recalculateAccountBalances(updatedTxs, currentAccounts));
      return updatedTxs;
    });
  };

  const handleToggleStatus = (tx: Transaction) => {
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    handleSaveTransaction({ ...tx, status: newStatus });
  };

  // Handlers: Perfis de Acesso
  const handleSaveProfile = (prof: AccessProfile) => {
    setProfiles((prev) => {
      const idx = prev.findIndex((p) => p.id === prof.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = prof;
        return next;
      }
      return [...prev, prof];
    });
  };
  const handleDeleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  // Handlers: Usuários
  const handleSaveUser = (usr: User) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === usr.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = usr;
        return next;
      }
      return [...prev, usr];
    });
  };
  const handleDeleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Render View Selector
  const renderActiveView = () => {
    switch (activeMain) {
      case 'dashboard':
        return (
          <DashboardView
            accounts={scopedAccounts}
            cards={scopedCards}
            categories={categories}
            budgets={scopedBudgets}
            transactions={scopedTransactions}
            activeUser={activeUser}
            onNavigateCadastro={(sub) => {
              setActiveMain('cadastros');
              setActiveCadastro(sub);
            }}
            onNavigateFinanceiro={(sub) => {
              setActiveMain('financeiro');
              setActiveFinanceiro(sub);
            }}
            onOpenNewTransaction={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
          />
        );

      case 'cadastros':
        switch (activeCadastro) {
          case 'categorias':
            return (
              <CategoriesView
                categories={categories}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                activeProfile={activeProfile}
              />
            );
          case 'contas':
            return (
              <BankAccountsView
                accounts={accounts}
                onSaveAccount={handleSaveAccount}
                onDeleteAccount={handleDeleteAccount}
                activeProfile={activeProfile}
              />
            );
          case 'cartoes':
            return (
              <CreditCardsView
                cards={cards}
                accounts={accounts}
                transactions={scopedTransactions}
                invoicePayments={invoicePayments}
                onSaveCard={handleSaveCard}
                onDeleteCard={handleDeleteCard}
                onSaveInvoicePayment={handleSaveInvoicePayment}
                activeProfile={activeProfile}
              />
            );
          case 'pagamentos':
            return (
              <PaymentMethodsView
                paymentMethods={paymentMethods}
                onSavePaymentMethod={handleSavePaymentMethod}
                onDeletePaymentMethod={handleDeletePaymentMethod}
                activeProfile={activeProfile}
              />
            );
          case 'beneficiarios':
            return (
              <BeneficiariesView
                beneficiaries={beneficiaries}
                categories={categories}
                onSaveBeneficiary={handleSaveBeneficiary}
                onDeleteBeneficiary={handleDeleteBeneficiary}
                activeProfile={activeProfile}
              />
            );
        }
        break;

      case 'financeiro':
        switch (activeFinanceiro) {
          case 'orcamento':
            return (
              <BudgetsView
                budgets={scopedBudgets}
                categories={categories}
                transactions={scopedTransactions}
                onSaveBudget={handleSaveBudget}
                onDeleteBudget={handleDeleteBudget}
                activeProfile={activeProfile}
              />
            );
          case 'transacoes':
            return (
              <TransactionsView
                transactions={scopedTransactions}
                categories={categories}
                accounts={accounts}
                cards={cards}
                paymentMethods={paymentMethods}
                beneficiaries={beneficiaries}
                users={users}
                onOpenNewTransaction={() => {
                  setEditingTx(null);
                  setIsTxModalOpen(true);
                }}
                onEditTransaction={(tx) => {
                  setEditingTx(tx);
                  setIsTxModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onToggleStatus={handleToggleStatus}
                activeProfile={activeProfile}
              />
            );
        }
        break;

      case 'relatorios':
        return (
          <ReportsView
            activeSubMenu={activeRelatorios}
            onSelectSubMenu={setActiveRelatorios}
            transactions={scopedTransactions}
            categories={categories}
            accounts={scopedAccounts}
            cards={scopedCards}
            paymentMethods={paymentMethods}
            beneficiaries={beneficiaries}
            activeProfile={activeProfile}
          />
        );

      case 'configuracoes':
        switch (activeConfiguracoes) {
          case 'perfis':
            return (
              <AccessProfilesView
                profiles={profiles}
                users={users}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
                activeProfile={activeProfile}
              />
            );
          case 'usuarios':
            return (
              <UsersView
                users={users}
                profiles={profiles}
                onSaveUser={handleSaveUser}
                onDeleteUser={handleDeleteUser}
                activeProfile={activeProfile}
                activeUserId={activeUserId}
              />
            );
          case 'biometria':
            return (
              <BiometricSettingsView
                activeProfile={activeProfile}
                currentUser={activeUser}
              />
            );
          case 'aparencia':
            return <ThemeAndTextSettingsView />;
        }
        break;
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginView
        users={users}
        profiles={profiles}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <Navigation
      activeMain={activeMain}
      setActiveMain={setActiveMain}
      activeCadastro={activeCadastro}
      setActiveCadastro={setActiveCadastro}
      activeFinanceiro={activeFinanceiro}
      setActiveFinanceiro={setActiveFinanceiro}
      activeRelatorios={activeRelatorios}
      setActiveRelatorios={setActiveRelatorios}
      activeConfiguracoes={activeConfiguracoes}
      setActiveConfiguracoes={setActiveConfiguracoes}
      users={users}
      profiles={profiles}
      activeUser={activeUser}
      onSelectUser={(u) => setActiveUserId(u.id)}
      activeScope={activeScope}
      onSelectScope={setActiveScope}
      onOpenNewTransaction={() => {
        setEditingTx(null);
        setIsTxModalOpen(true);
      }}
      onLogout={handleLogout}
      onManualSync={handleManualSync}
      isSyncing={syncState === 'syncing'}
    >
      <PWAInstallPrompt />
      {renderActiveView()}

      {/* Background Privacy Shield Overlay (Prevents iOS / Android Task Switcher Preview Overlap) */}
      {isAppInBackground && (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-3xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-white">Finança Master</h3>
          <p className="text-xs text-slate-400 mt-1">Sessão protegida por segurança e biometria</p>
        </div>
      )}

      {/* Lock Screen Overlay on App Minimization / Return */}
      {isLocked && isAuthenticated && (
        <LockScreenModal
          user={activeUser}
          profile={activeProfile}
          biometricSettings={StorageService.getBiometricSettings()}
          onUnlockSuccess={() => {
            safeLocalStorage.removeItem('fm_app_locked');
            safeSessionStorage.removeItem('fm_app_locked');
            safeSessionStorage.removeItem('fm_is_refreshing');
            setIsLocked(false);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTx}
        categories={categories}
        accounts={accounts}
        cards={cards}
        paymentMethods={paymentMethods}
        beneficiaries={beneficiaries}
        activeUser={activeUser}
      />
    </Navigation>
  );
}
