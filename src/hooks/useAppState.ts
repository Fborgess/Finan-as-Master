import { useState, useEffect, useMemo, useCallback } from 'react';
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
  CreditCardInvoicePayment,
  FinancialScope,
  MainSection,
  SubMenuCadastro,
  SubMenuFinanceiro,
  SubMenuRelatorios,
  SubMenuConfiguracoes,
} from '../types';
import { StorageService } from '../utils/storage';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';
import { syncService, SyncState } from '../utils/syncService';
import { getSystemPreferences, applyThemeToDocument } from '../utils/preferences';

const FALLBACK_ADMIN: User = {
  id: 'usr-admin-fs',
  name: 'Administrador (fsborgess)',
  email: 'fsborgess@gmail.com',
  profileId: 'prof-admin',
  status: 'active'
};

// Generic upsert helper: updates an item if it exists, otherwise appends it
const upsert = <T extends { id: string }>(list: T[], item: T): T[] => {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = item;
    return next;
  }
  return [...list, item];
};

export function useAppState() {
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

  const refreshAllStateFromStorage = useCallback(() => {
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
  }, []);

  // Migrate legacy plaintext credentials to hashed format once on app load
  useEffect(() => {
    StorageService.migrateCredentials();
  }, []);

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
  }, [refreshAllStateFromStorage]);

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
        refreshAllStateFromStorage();
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
  }, [refreshAllStateFromStorage]);

  // Persist to LocalStorage whenever local data changes
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

  const handleManualSync = useCallback(async () => {
    await syncService.pullData();
    refreshAllStateFromStorage();
  }, [refreshAllStateFromStorage]);

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
  const recalculateAccountBalances = useCallback((updatedTxs: Transaction[], currentAccounts: BankAccount[]) => {
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
  }, []);

  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || FALLBACK_ADMIN;
  const activeProfile = profiles.find((p) => p.id === activeUser.profileId);

  // Authentication Handlers
  const handleLoginSuccess = useCallback((user: User) => {
    setActiveUserId(user.id);
    StorageService.setActiveUserId(user.id);
    // Persistence (localStorage vs sessionStorage) is decided by the login
    // source and the "remember me" choice. Do not force localStorage here.
    setIsAuthenticated(true);
    setIsLocked(false);
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
  }, []);

  const handleLogout = useCallback(() => {
    safeLocalStorage.removeItem('fm_authenticated_user');
    safeSessionStorage.removeItem('fm_authenticated_user');
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
    setIsAuthenticated(false);
    setIsLocked(false);
  }, []);

  // Handlers: Categorias
  const handleSaveInvoicePayment = useCallback((payment: CreditCardInvoicePayment, newTransaction?: Transaction) => {
    setInvoicePayments((prev) => [...prev, payment]);
    if (newTransaction) {
      handleSaveTransaction(newTransaction);
    }
  }, []);

  const handleSaveCategory = useCallback((cat: Category) => {
    setCategories((prev) => upsert(prev, cat));
  }, []);

  const handleDeleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Handlers: Contas Bancárias
  const handleSaveAccount = useCallback((acc: BankAccount) => {
    setAccounts((prev) => {
      const updatedList = upsert(prev, acc);
      return recalculateAccountBalances(transactions, updatedList);
    });
  }, [transactions, recalculateAccountBalances]);

  const handleDeleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Handlers: Cartões
  const handleSaveCard = useCallback((card: CreditCard) => {
    setCards((prev) => upsert(prev, card));
  }, []);

  const handleDeleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // Handlers: Formas de Pagamento
  const handleSavePaymentMethod = useCallback((pm: PaymentMethod) => {
    setPaymentMethods((prev) => upsert(prev, pm));
  }, []);

  const handleDeletePaymentMethod = useCallback((id: string) => {
    setPaymentMethods((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Handlers: Beneficiários
  const handleSaveBeneficiary = useCallback((ben: Beneficiary) => {
    setBeneficiaries((prev) => upsert(prev, ben));
  }, []);

  const handleDeleteBeneficiary = useCallback((id: string) => {
    setBeneficiaries((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Handlers: Orçamentos
  const handleSaveBudget = useCallback((b: Budget) => {
    setBudgets((prev) => upsert(prev, b));
  }, []);

  const handleDeleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // Handlers: Transações
  const handleSaveTransaction = useCallback((txInput: Transaction | Transaction[]) => {
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
  }, [recalculateAccountBalances]);

  const handleDeleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => {
      const updatedTxs = prev.filter((t) => t.id !== id);
      setAccounts((currentAccounts) => recalculateAccountBalances(updatedTxs, currentAccounts));
      return updatedTxs;
    });
  }, [recalculateAccountBalances]);

  const handleToggleStatus = useCallback((tx: Transaction) => {
    const newStatus = tx.status === 'paid' ? 'pending' : 'paid';
    handleSaveTransaction({ ...tx, status: newStatus });
  }, [handleSaveTransaction]);

  // Handlers: Perfis de Acesso
  const handleSaveProfile = useCallback((prof: AccessProfile) => {
    setProfiles((prev) => upsert(prev, prof));
  }, []);

  const handleDeleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // Handlers: Usuários
  const handleSaveUser = useCallback((usr: User) => {
    setUsers((prev) => upsert(prev, usr));
  }, []);

  const handleDeleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const openNewTransaction = useCallback(() => {
    setEditingTx(null);
    setIsTxModalOpen(true);
  }, []);

  const openEditTransaction = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setIsTxModalOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => {
    setIsTxModalOpen(false);
    setEditingTx(null);
  }, []);

  const handleSelectUser = useCallback((u: User) => {
    setActiveUserId(u.id);
  }, []);

  const handleUnlockSuccess = useCallback(() => {
    safeLocalStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_app_locked');
    safeSessionStorage.removeItem('fm_is_refreshing');
    setIsLocked(false);
  }, []);

  return {
    // Navigation State
    activeMain, setActiveMain,
    activeCadastro, setActiveCadastro,
    activeFinanceiro, setActiveFinanceiro,
    activeRelatorios, setActiveRelatorios,
    activeConfiguracoes, setActiveConfiguracoes,

    // Authentication
    isAuthenticated,
    isLocked,
    isAppInBackground,
    syncState,
    handleLoginSuccess,
    handleLogout,
    handleUnlockSuccess,

    // Application Data
    categories,
    accounts,
    cards,
    paymentMethods,
    beneficiaries,
    budgets,
    transactions,
    profiles,
    users,
    invoicePayments,

    // Scoped Data
    scopedTransactions,
    scopedAccounts,
    scopedCards,
    scopedBudgets,

    // Active User / Scope / Profile
    activeUserId,
    activeUser,
    activeProfile,
    activeScope,
    setActiveScope,
    handleSelectUser,

    // Transaction Modal
    isTxModalOpen,
    editingTx,
    openNewTransaction,
    openEditTransaction,
    closeTransactionModal,

    // Manual Sync
    handleManualSync,
    refreshAllStateFromStorage,

    // CRUD Handlers
    handleSaveInvoicePayment,
    handleSaveCategory, handleDeleteCategory,
    handleSaveAccount, handleDeleteAccount,
    handleSaveCard, handleDeleteCard,
    handleSavePaymentMethod, handleDeletePaymentMethod,
    handleSaveBeneficiary, handleDeleteBeneficiary,
    handleSaveBudget, handleDeleteBudget,
    handleSaveTransaction, handleDeleteTransaction, handleToggleStatus,
    handleSaveProfile, handleDeleteProfile,
    handleSaveUser, handleDeleteUser,
  };
}
