export type FinancialScope = 'pessoal' | 'familia' | 'todos';

export type CategoryType = 'income' | 'expense' | 'both';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon?: string;
  description?: string;
  parentId?: string; // ID da Categoria Pai (caso seja uma subcategoria)
  scope?: 'pessoal' | 'familia';
}

export type AccountType = 'checking' | 'savings' | 'investment' | 'cash';

export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountType: AccountType;
  initialBalance: number;
  currentBalance: number;
  accountNumber?: string;
  color?: string;
  scope?: 'pessoal' | 'familia';
}

export interface CreditCard {
  id: string;
  name: string;
  brand: string;
  creditLimit: number;
  closingDay: number; // dia do fechamento da fatura
  dueDay: number;     // dia do vencimento da fatura
  bankAccountId?: string;
  color?: string;
  scope?: 'pessoal' | 'familia';
}

export type InvoiceStatus = 'ABERTA' | 'FECHADA' | 'PAGA' | 'PARCIAL' | 'VENCIDA';

export interface CreditCardInvoicePayment {
  id: string;
  cardId: string;
  yearMonth: string; // ex: "2026-08"
  amountPaid: number;
  paymentDate: string; // YYYY-MM-DD
  bankAccountId: string;
  transactionId?: string; // ID da transação de débito bancário criada
  notes?: string;
}

export type PaymentMethodCode = 'cash' | 'pix' | 'credit' | 'debit' | 'transfer' | 'boleto' | 'other';

export interface PaymentMethod {
  id: string;
  name: string;
  code: PaymentMethodCode;
  description?: string;
  active: boolean;
  allowInstallments?: boolean; // Se esta forma de pagamento permite parcelamento
}

export type BeneficiaryType = 'supplier' | 'customer' | 'both';

export interface Beneficiary {
  id: string;
  name: string;
  document?: string; // CPF ou CNPJ
  email?: string;
  phone?: string;
  type: BeneficiaryType;
  defaultCategoryId?: string;
}

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  alertThresholdPercent: number; // Ex: 80%
  scope?: 'pessoal' | 'familia';
}

export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionStatus = 'paid' | 'pending' | 'cancelled';

export type PaymentModality = 'single' | 'installment' | 'recurring';

export type RecurrenceFrequency =
  | 'weekly'        // Semanal (a cada 7 dias)
  | 'biweekly'      // Quinzenal (a cada 15 dias)
  | 'monthly'       // Mensal (a cada mês)
  | 'bimonthly'     // Bimestral (a cada 2 meses)
  | 'quarterly'     // Trimestral (a cada 3 meses)
  | 'semiannually'  // Semestral (a cada 6 meses)
  | 'yearly';       // Anual (a cada ano)

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  status: TransactionStatus;
  categoryId: string;
  accountId?: string;        // Conta envolvida
  destinationAccountId?: string; // Para transferências entre contas
  creditCardId?: string;     // Caso pague via Cartão de Crédito
  paymentMethodId: string;
  beneficiaryId?: string;
  userId: string; // Quem registrou
  notes?: string;
  scope?: 'pessoal' | 'familia';

  // Modalidade do Lançamento
  paymentModality?: PaymentModality;

  // Regras de Parcelamento
  isInstallment?: boolean;       // Indica se a transação é parcelada
  installmentNumber?: number;   // Parcela atual (ex: 1, 2...)
  totalInstallments?: number;    // Quantidade total de parcelas (ex: 12)
  installmentGroupId?: string;  // ID de agrupamento das parcelas
  installmentFrequency?: RecurrenceFrequency; // Frequência das parcelas

  // Regras de Recorrência / Lançamento Fixo
  isRecurring?: boolean;         // Indica se é um lançamento fixo/recorrente
  recurrenceFrequency?: RecurrenceFrequency; // Frequência da repetição
  recurrenceCount?: number;       // Qtd de vezes que se repete (undefined se indeterminado/contínuo)
  recurringGroupId?: string;      // ID de agrupamento da série recorrente
  recurrenceIndex?: number;       // Índice da repetição (1, 2, 3...)
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export type PermissionKey =
  | 'dashboard'
  | 'categorias'
  | 'contas'
  | 'cartoes'
  | 'pagamentos'
  | 'beneficiarios'
  | 'orcamento'
  | 'transacoes'
  | 'pagar_receber'
  | 'realizadas'
  | 'por_categoria'
  | 'perfis'
  | 'usuarios'
  | 'biometria'
  | 'aparencia';

export type PermissionMatrix = Record<PermissionKey, Record<PermissionAction, boolean>>;

export interface AccessProfile {
  id: string;
  name: string;
  description: string;
  isSystemRole?: boolean;
  permissions: {
    modules: PermissionMatrix;
    canAccessPessoalScope?: boolean;
    canAccessFamiliaScope?: boolean;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  profileId: string;
  // Legacy plaintext credentials (migrated to hashes on first load)
  pin?: string;
  password?: string;
  // Hashed credentials (PBKDF2-SHA256 with per-user salt)
  pinHash?: string;
  pinSalt?: string;
  passwordHash?: string;
  passwordSalt?: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
}

export interface BiometricSettings {
  enabled: boolean;
  biometricType: 'fingerprint' | 'faceid' | 'both' | 'auto';
  requireOnAppLaunch: boolean;
  requireOnSensitiveActions: boolean;
  lockOnMinimize?: boolean;
  fallbackToPin: boolean;
  registeredDeviceName?: string;
  lastAuthenticatedAt?: string;
}

export type ThemeMode = 'dark' | 'light' | 'midnight';
export type TextCasingMode = 'uppercase' | 'titlecase' | 'none';

export interface SystemPreferences {
  theme: ThemeMode;
  textCasing: TextCasingMode;
}

export interface ThemePreset {
  name: string;
  preferences: SystemPreferences;
  savedAt: string;
}

export type MainSection = 'dashboard' | 'cadastros' | 'financeiro' | 'relatorios' | 'configuracoes';

export type SubMenuCadastro = 'categorias' | 'contas' | 'cartoes' | 'pagamentos' | 'beneficiarios';
export type SubMenuFinanceiro = 'orcamento' | 'transacoes';
export type SubMenuRelatorios = 'pagar_receber' | 'realizadas' | 'por_categoria';
export type SubMenuConfiguracoes = 'perfis' | 'usuarios' | 'biometria' | 'aparencia';
