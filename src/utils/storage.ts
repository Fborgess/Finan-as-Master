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
  BiometricSettings,
  CreditCardInvoicePayment,
  PermissionMatrix,
} from '../types';
import { safeLocalStorage } from './safeStorage';
import { migrateUserCredentials } from './credentials';
import { migrateProfilePermissions, nonePermissions } from './permissions';

/** Matriz com tudo liberado (Administrador). */
const adminPermissions: PermissionMatrix = (() => {
  const m = nonePermissions();
  m.dashboard.view = true;
  ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: true, edit: true, delete: true };
  });
  ['orcamento', 'transacoes'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: true, edit: true, delete: true };
  });
  ['pagar_receber', 'realizadas', 'por_categoria'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: false, edit: false, delete: false };
  });
  ['perfis', 'usuarios', 'biometria', 'aparencia'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: true, edit: true, delete: true };
  });
  return m;
})();

/** Matriz para o Operador Financeiro: gerencia cadastros/financeiro, apenas visualiza relatórios. */
const operadorPermissions: PermissionMatrix = (() => {
  const m = nonePermissions();
  m.dashboard.view = true;
  ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: true, edit: true, delete: true };
  });
  ['orcamento', 'transacoes'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: true, edit: true, delete: true };
  });
  ['pagar_receber', 'realizadas', 'por_categoria'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: false, edit: false, delete: false };
  });
  ['perfis', 'usuarios', 'biometria', 'aparencia'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: false, create: false, edit: false, delete: false };
  });
  return m;
})();

/** Matriz para o perfil Somente Leitura / Audit. */
const leitorPermissions: PermissionMatrix = (() => {
  const m = nonePermissions();
  m.dashboard.view = true;
  ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: false, edit: false, delete: false };
  });
  m.orcamento = { view: true, create: false, edit: false, delete: false };
  m.transacoes = { view: true, create: false, edit: false, delete: false };
  ['pagar_receber', 'realizadas', 'por_categoria'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: true, create: false, edit: false, delete: false };
  });
  ['perfis', 'usuarios', 'biometria', 'aparencia'].forEach((k) => {
    m[k as keyof PermissionMatrix] = { view: false, create: false, edit: false, delete: false };
  });
  return m;
})();

const INITIAL_CATEGORIES: Category[] = [
  // Categorias Pai
  { id: 'cat-1', name: 'Alimentação & Gastronomia', type: 'expense', color: '#f59e0b', icon: 'Utensils', description: 'Compras de mercado, feira, restaurantes e delivery' },
  { id: 'cat-2', name: 'Moradia & Habitação', type: 'expense', color: '#ef4444', icon: 'Home', description: 'Aluguel, luz, água, condomínio, internet e manutenção da casa' },
  { id: 'cat-3', name: 'Transporte & Veículos', type: 'expense', color: '#3b82f6', icon: 'Car', description: 'Combustível, seguro, IPVA, Uber e manutenção' },
  { id: 'cat-4', name: 'Saúde & Cuidados Pessoais', type: 'expense', color: '#10b981', icon: 'HeartPulse', description: 'Farmácia, consultas, plano de saúde e academia' },
  { id: 'cat-5', name: 'Lazer & Estilo de Vida', type: 'expense', color: '#ec4899', icon: 'Film', description: 'Cinema, viagens, hobbies, assinaturas e passeios' },
  { id: 'cat-6', name: 'Rendimentos de Trabalho', type: 'income', color: '#059669', icon: 'Briefcase', description: 'Salário mensal fixo, pró-labore e bônus' },
  { id: 'cat-7', name: 'Serviços & Freelances', type: 'income', color: '#10b981', icon: 'TrendingUp', description: 'Receitas de freelancers e consultorias' },
  { id: 'cat-8', name: 'Investimentos & Finanças', type: 'both', color: '#8b5cf6', icon: 'PiggyBank', description: 'Aplicações financeiras, dividendos e rendimentos' },

  // Subcategorias (Filhos)
  { id: 'sub-101', parentId: 'cat-1', name: 'Supermercado & Feira', type: 'expense', color: '#f59e0b', description: 'Compras de mantimentos para casa' },
  { id: 'sub-102', parentId: 'cat-1', name: 'Restaurantes & Bares', type: 'expense', color: '#f59e0b', description: 'Refeições fora de casa' },
  { id: 'sub-103', parentId: 'cat-1', name: 'Delivery & iFood', type: 'expense', color: '#f59e0b', description: 'Pedidos de comida em casa' },

  { id: 'sub-201', parentId: 'cat-2', name: 'Aluguel & Condomínio', type: 'expense', color: '#ef4444', description: 'Taxa condominial e aluguel do imóvel' },
  { id: 'sub-202', parentId: 'cat-2', name: 'Energia, Água & Gás', type: 'expense', color: '#ef4444', description: 'Contas básicas de consumo residencial' },
  { id: 'sub-203', parentId: 'cat-2', name: 'Internet, TV & Telefone', type: 'expense', color: '#ef4444', description: 'Serviços de telecomunicação' },

  { id: 'sub-301', parentId: 'cat-3', name: 'Combustível (Gasolina/Etanol)', type: 'expense', color: '#3b82f6', description: 'Abastecimento do veículo' },
  { id: 'sub-302', parentId: 'cat-3', name: 'Aplicativos (Uber / 99)', type: 'expense', color: '#3b82f6', description: 'Corridas de aplicativo e táxi' },
  { id: 'sub-303', parentId: 'cat-3', name: 'Manutenção & IPVA', type: 'expense', color: '#3b82f6', description: 'Oficina, revisão e impostos veiculares' },

  { id: 'sub-601', parentId: 'cat-6', name: 'Salário Fixo Mensal', type: 'income', color: '#059669', description: 'Remuneração principal em conta' },
  { id: 'sub-602', parentId: 'cat-6', name: 'Bônus & Participação nos Lucros', type: 'income', color: '#059669', description: 'PLR, prêmios e comissões' },
];

const INITIAL_ACCOUNTS: BankAccount[] = [];

const INITIAL_CARDS: CreditCard[] = [];

const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pm-1', name: 'PIX Instantâneo', code: 'pix', description: 'Transferência imediata sem taxa', active: true, allowInstallments: false },
  { id: 'pm-2', name: 'Cartão de Crédito', code: 'credit', description: 'Pagamento em fatura mensal com opção de parcelamento', active: true, allowInstallments: true },
  { id: 'pm-3', name: 'Cartão de Débito', code: 'debit', description: 'Débito direto em conta corrente', active: true, allowInstallments: false },
  { id: 'pm-4', name: 'Boleto Bancário', code: 'boleto', description: 'Pagamento via código de barras com vencimento e opção de parcelas', active: true, allowInstallments: true },
  { id: 'pm-5', name: 'Dinheiro em Espécie', code: 'cash', description: 'Pagamento em cédulas/moeda física', active: true, allowInstallments: false },
  { id: 'pm-6', name: 'Transferência TED/DOC', code: 'transfer', description: 'Transferência bancária tradicional', active: true, allowInstallments: false },
];

const INITIAL_BENEFICIARIES: Beneficiary[] = [];

const INITIAL_BUDGETS: Budget[] = [];

const INITIAL_PROFILES: AccessProfile[] = [
  {
    id: 'prof-admin',
    name: 'Administrador Financeiro',
    description: 'Acesso total a todas as funcionalidades e configurações do sistema.',
    isSystemRole: true,
    permissions: {
      modules: adminPermissions,
      canAccessPessoalScope: true,
      canAccessFamiliaScope: true,
    },
  },
  {
    id: 'prof-operador',
    name: 'Operador Financeiro',
    description: 'Pode gerenciar cadastros, lançar transações e orçamentos, mas sem acesso a configurações avançadas.',
    isSystemRole: false,
    permissions: {
      modules: operadorPermissions,
      canAccessPessoalScope: true,
      canAccessFamiliaScope: true,
    },
  },
  {
    id: 'prof-leitor',
    name: 'Somente Leitura / Audit',
    description: 'Pode apenas visualizar relatórios e movimentações sem alterar registros.',
    isSystemRole: false,
    permissions: {
      modules: leitorPermissions,
      canAccessPessoalScope: true,
      canAccessFamiliaScope: true,
    },
  },
];

const INITIAL_USERS: User[] = [
  { id: 'usr-admin-fs', name: 'Administrador (fsborgess)', email: 'fsborgess@gmail.com', profileId: 'prof-admin', pin: '1910', password: '1910', status: 'active' },
];

const INITIAL_TRANSACTIONS: Transaction[] = [];

const SAMPLE_IDS = new Set([
  'acc-1', 'acc-2', 'acc-3',
  'card-1', 'card-2',
  'ben-1', 'ben-2', 'ben-3', 'ben-4', 'ben-5',
  'bud-1', 'bud-2', 'bud-3', 'bud-4',
  'tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5',
  'usr-1', 'usr-2', 'usr-3'
]);

const SAMPLE_EMAILS = new Set([
  'carlos@khrima.com',
  'ana@khrima.com',
  'lucas@khrima.com'
]);

// Clean up cached sample data unconditionally in all browsers (retaining categories, subcategories, payment methods, profiles and admin user)
const cleanSampleDataIfNeeded = () => {
  if (typeof window === 'undefined') return;
  try {
    // 1. Clean transactions
    const rawTx = safeLocalStorage.getItem('fm_transactions');
    if (rawTx) {
      const txs = JSON.parse(rawTx);
      const filtered = txs.filter((t: any) => !SAMPLE_IDS.has(t.id));
      safeLocalStorage.setItem('fm_transactions', JSON.stringify(filtered));
    }

    // 2. Clean accounts
    const rawAcc = safeLocalStorage.getItem('fm_accounts');
    if (rawAcc) {
      const accs = JSON.parse(rawAcc);
      const filtered = accs.filter((a: any) => !SAMPLE_IDS.has(a.id));
      safeLocalStorage.setItem('fm_accounts', JSON.stringify(filtered));
    }

    // 3. Clean credit cards
    const rawCards = safeLocalStorage.getItem('fm_cards');
    if (rawCards) {
      const cards = JSON.parse(rawCards);
      const filtered = cards.filter((c: any) => !SAMPLE_IDS.has(c.id));
      safeLocalStorage.setItem('fm_cards', JSON.stringify(filtered));
    }

    // 4. Clean beneficiaries
    const rawBen = safeLocalStorage.getItem('fm_beneficiaries');
    if (rawBen) {
      const bens = JSON.parse(rawBen);
      const filtered = bens.filter((b: any) => !SAMPLE_IDS.has(b.id));
      safeLocalStorage.setItem('fm_beneficiaries', JSON.stringify(filtered));
    }

    // 5. Clean budgets
    const rawBud = safeLocalStorage.getItem('fm_budgets');
    if (rawBud) {
      const buds = JSON.parse(rawBud);
      const filtered = buds.filter((b: any) => !SAMPLE_IDS.has(b.id));
      safeLocalStorage.setItem('fm_budgets', JSON.stringify(filtered));
    }

    // 6. Clean sample users
    const rawUsers = safeLocalStorage.getItem('fm_users');
    if (rawUsers) {
      const users = JSON.parse(rawUsers);
      const filtered = users.filter((u: any) => !SAMPLE_IDS.has(u.id) && !SAMPLE_EMAILS.has(u.email?.toLowerCase()));
      safeLocalStorage.setItem('fm_users', JSON.stringify(filtered));
    }

    // 7. Point active user to the default admin if set to a sample user.
    // NOTE: we do NOT auto-set fm_authenticated_user here, so the app always
    // requires credentials on first open instead of silently logging in.
    const activeUserId = safeLocalStorage.getItem('fm_active_user_id');
    if (!activeUserId || SAMPLE_IDS.has(activeUserId)) {
      safeLocalStorage.setItem('fm_active_user_id', 'usr-admin-fs');
    }
  } catch (e) {
    // Ignore storage errors
  }
};

cleanSampleDataIfNeeded();

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Error parsing storage key:', e);
    return fallback;
  }
};

export class StorageService {
  // Categorias
  static getCategories(): Category[] {
    const raw = safeLocalStorage.getItem('fm_categories');
    return safeParse(raw, INITIAL_CATEGORIES);
  }
  static saveCategories(data: Category[]): void {
    safeLocalStorage.setItem('fm_categories', JSON.stringify(data));
  }

  // Contas
  static getAccounts(): BankAccount[] {
    const raw = safeLocalStorage.getItem('fm_accounts');
    const items: BankAccount[] = safeParse(raw, INITIAL_ACCOUNTS);
    return items.filter((a) => !SAMPLE_IDS.has(a.id));
  }
  static saveAccounts(data: BankAccount[]): void {
    safeLocalStorage.setItem('fm_accounts', JSON.stringify(data.filter((a) => !SAMPLE_IDS.has(a.id))));
  }

  // Cartões
  static getCreditCards(): CreditCard[] {
    const raw = safeLocalStorage.getItem('fm_cards');
    const items: CreditCard[] = safeParse(raw, INITIAL_CARDS);
    return items.filter((c) => !SAMPLE_IDS.has(c.id));
  }
  static saveCreditCards(data: CreditCard[]): void {
    safeLocalStorage.setItem('fm_cards', JSON.stringify(data.filter((c) => !SAMPLE_IDS.has(c.id))));
  }

  // Formas de Pagamento
  static getPaymentMethods(): PaymentMethod[] {
    const raw = safeLocalStorage.getItem('fm_payment_methods');
    return safeParse(raw, INITIAL_PAYMENT_METHODS);
  }
  static savePaymentMethods(data: PaymentMethod[]): void {
    safeLocalStorage.setItem('fm_payment_methods', JSON.stringify(data));
  }

  // Beneficiários
  static getBeneficiaries(): Beneficiary[] {
    const raw = safeLocalStorage.getItem('fm_beneficiaries');
    const items: Beneficiary[] = safeParse(raw, INITIAL_BENEFICIARIES);
    return items.filter((b) => !SAMPLE_IDS.has(b.id));
  }
  static saveBeneficiaries(data: Beneficiary[]): void {
    safeLocalStorage.setItem('fm_beneficiaries', JSON.stringify(data.filter((b) => !SAMPLE_IDS.has(b.id))));
  }

  // Orçamentos
  static getBudgets(): Budget[] {
    const raw = safeLocalStorage.getItem('fm_budgets');
    const items: Budget[] = safeParse(raw, INITIAL_BUDGETS);
    return items.filter((b) => !SAMPLE_IDS.has(b.id));
  }
  static saveBudgets(data: Budget[]): void {
    safeLocalStorage.setItem('fm_budgets', JSON.stringify(data.filter((b) => !SAMPLE_IDS.has(b.id))));
  }

  // Transações
  static getTransactions(): Transaction[] {
    const raw = safeLocalStorage.getItem('fm_transactions');
    const items: Transaction[] = safeParse(raw, INITIAL_TRANSACTIONS);
    return items.filter((t) => !SAMPLE_IDS.has(t.id));
  }
  static saveTransactions(data: Transaction[]): void {
    safeLocalStorage.setItem('fm_transactions', JSON.stringify(data.filter((t) => !SAMPLE_IDS.has(t.id))));
  }

  // Perfis
  static getProfiles(): AccessProfile[] {
    const raw = safeLocalStorage.getItem('fm_profiles');
    const items = safeParse<AccessProfile[]>(raw, INITIAL_PROFILES);
    return items.map((p) => migrateProfilePermissions(p));
  }
  static saveProfiles(data: AccessProfile[]): void {
    safeLocalStorage.setItem('fm_profiles', JSON.stringify(data));
  }

  // Usuários
  static getUsers(): User[] {
    const raw = safeLocalStorage.getItem('fm_users');
    let users: User[] = safeParse(raw, INITIAL_USERS);
    users = users.filter((u) => !SAMPLE_IDS.has(u.id) && !SAMPLE_EMAILS.has(u.email?.toLowerCase()));

    // Garante que o e-mail de admin (fsborgess@gmail.com) sempre esteja disponível
    // com as credenciais padrão (PIN/senha 1910) apenas na primeira criação.
    const adminIndex = users.findIndex((u) => u.email.toLowerCase() === 'fsborgess@gmail.com');
    if (adminIndex === -1) {
      users.unshift({
        id: 'usr-admin-fs',
        name: 'Administrador (fsborgess)',
        email: 'fsborgess@gmail.com',
        profileId: 'prof-admin',
        pin: '1910',
        password: '1910',
        status: 'active',
      });
      StorageService.saveUsers(users);
    }

    return users;
  }
  static saveUsers(data: User[]): void {
    safeLocalStorage.setItem('fm_users', JSON.stringify(data));
  }

  // Migra credenciais em texto puro (PIN/senha) para hashes PBKDF2 com salt
  static async migrateCredentials(): Promise<void> {
    const users = StorageService.getUsers();
    const migrated = await migrateUserCredentials(users);
    if (migrated !== users) {
      StorageService.saveUsers(migrated);
    }
  }

  // Active User ID
  static getActiveUserId(): string {
    const stored = safeLocalStorage.getItem('fm_active_user_id');
    if (stored && ['usr-1', 'usr-2', 'usr-3'].includes(stored)) {
      return 'usr-admin-fs';
    }
    return stored || 'usr-admin-fs';
  }
  static setActiveUserId(id: string): void {
    safeLocalStorage.setItem('fm_active_user_id', id);
  }

  // Pagamentos de Faturas de Cartão
  static getCreditCardInvoicePayments(): CreditCardInvoicePayment[] {
    const raw = safeLocalStorage.getItem('fm_card_invoice_payments');
    return safeParse<CreditCardInvoicePayment[]>(raw, []);
  }
  static saveCreditCardInvoicePayments(data: CreditCardInvoicePayment[]): void {
    safeLocalStorage.setItem('fm_card_invoice_payments', JSON.stringify(data));
  }

  // Biometric Settings
  static getBiometricSettings(): BiometricSettings {
    const raw = safeLocalStorage.getItem('fm_biometric_settings');
    if (raw) {
      const parsed = safeParse<any>(raw, null);
      if (parsed) {
        if (parsed.lockOnMinimize === undefined) parsed.lockOnMinimize = false;
        if (parsed.enabled === undefined) parsed.enabled = false;
        return parsed;
      }
    }
    return {
      enabled: false,
      biometricType: 'both',
      requireOnAppLaunch: false,
      requireOnSensitiveActions: false,
      lockOnMinimize: false,
      fallbackToPin: true,
      registeredDeviceName: 'Dispositivo Móvel',
    };
  }
  static saveBiometricSettings(data: BiometricSettings): void {
    safeLocalStorage.setItem('fm_biometric_settings', JSON.stringify(data));
  }

  // Financial Scope (Módulo Pessoal vs Família)
  static getFinancialScope(): 'pessoal' | 'familia' | 'todos' {
    return (safeLocalStorage.getItem('fm_financial_scope') as 'pessoal' | 'familia' | 'todos') || 'pessoal';
  }
  static saveFinancialScope(scope: 'pessoal' | 'familia' | 'todos'): void {
    safeLocalStorage.setItem('fm_financial_scope', scope);
  }
}
