import { Lock } from 'lucide-react';
import { useAppState } from './hooks/useAppState';

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
import { StorageService } from './utils/storage';

export default function App() {
  const {
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
  } = useAppState();

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
            onOpenNewTransaction={openNewTransaction}
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
                onOpenNewTransaction={openNewTransaction}
                onEditTransaction={openEditTransaction}
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
      onSelectUser={handleSelectUser}
      activeScope={activeScope}
      onSelectScope={setActiveScope}
      onOpenNewTransaction={openNewTransaction}
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
          <h3 className="text-xl font-black text-white">Khrima</h3>
          <p className="text-xs text-slate-400 mt-1">Sessão protegida por segurança e biometria</p>
        </div>
      )}

      {/* Lock Screen Overlay on App Minimization / Return */}
      {isLocked && isAuthenticated && (
        <LockScreenModal
          user={activeUser}
          profile={activeProfile}
          biometricSettings={StorageService.getBiometricSettings()}
          onUnlockSuccess={handleUnlockSuccess}
          onLogout={handleLogout}
        />
      )}

      {/* Global Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={closeTransactionModal}
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
