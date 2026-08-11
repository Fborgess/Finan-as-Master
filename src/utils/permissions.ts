import { AccessProfile, PermissionAction, PermissionKey, PermissionMatrix } from '../types';

export const PERMISSION_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

export const PERMISSION_KEYS: PermissionKey[] = [
  'dashboard',
  'categorias',
  'contas',
  'cartoes',
  'pagamentos',
  'beneficiarios',
  'orcamento',
  'transacoes',
  'pagar_receber',
  'realizadas',
  'por_categoria',
  'perfis',
  'usuarios',
  'biometria',
  'aparencia',
];

export const PERMISSION_KEY_LABELS: Record<PermissionKey, string> = {
  dashboard: 'Dashboard Geral',
  categorias: 'Categorias Financeiras',
  contas: 'Contas Bancárias',
  cartoes: 'Cartões de Crédito',
  pagamentos: 'Formas de Pagamento',
  beneficiarios: 'Beneficiários',
  orcamento: 'Orçamento Mensal',
  transacoes: 'Transações',
  pagar_receber: 'Contas a Pagar/Receber',
  realizadas: 'Contas/Receitas Realizadas',
  por_categoria: 'Relatório por Categoria',
  perfis: 'Perfil de Acesso',
  usuarios: 'Usuários',
  biometria: 'Digital / Face ID',
  aparencia: 'Tema & Formatação',
};

export const PERMISSION_SECTION: Record<
  PermissionKey,
  'dashboard' | 'cadastros' | 'financeiro' | 'relatorios' | 'configuracoes'
> = {
  dashboard: 'dashboard',
  categorias: 'cadastros',
  contas: 'cadastros',
  cartoes: 'cadastros',
  pagamentos: 'cadastros',
  beneficiarios: 'cadastros',
  orcamento: 'financeiro',
  transacoes: 'financeiro',
  pagar_receber: 'relatorios',
  realizadas: 'relatorios',
  por_categoria: 'relatorios',
  perfis: 'configuracoes',
  usuarios: 'configuracoes',
  biometria: 'configuracoes',
  aparencia: 'configuracoes',
};

export function createPermissionMatrix(all: boolean): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  PERMISSION_KEYS.forEach((key) => {
    matrix[key] = { view: all, create: all, edit: all, delete: all };
  });
  return matrix;
}

export const allPermissions = (): PermissionMatrix => createPermissionMatrix(true);
export const nonePermissions = (): PermissionMatrix => createPermissionMatrix(false);

/**
 * Global helper: verifies if a profile has the requested action on a permission key.
 * If no profile is provided, grants access (legacy behavior before profiles existed).
 */
export function can(
  profile: AccessProfile | undefined | null,
  key: PermissionKey,
  action: PermissionAction = 'view'
): boolean {
  if (!profile) return true;
  return profile.permissions?.modules?.[key]?.[action] ?? false;
}

/**
 * Converts legacy profile permissions (canManageCadastros / canManageTransactions /
 * canManageBudgets / canManageSettings / canViewReports) into the new granular
 * modules matrix. Used to auto-migrate existing local/synced profiles.
 */
export function migrateProfilePermissions(profile: AccessProfile): AccessProfile {
  const perms = profile.permissions as unknown as Record<string, unknown> | undefined;
  if (perms && typeof perms.modules === 'object' && perms.modules) {
    return profile;
  }

  const legacy = (perms || {}) as {
    canManageCadastros?: boolean;
    canManageTransactions?: boolean;
    canManageBudgets?: boolean;
    canManageSettings?: boolean;
    canViewReports?: boolean;
    canAccessPessoalScope?: boolean;
    canAccessFamiliaScope?: boolean;
  };

  const modules = createPermissionMatrix(false);

  // Dashboard: read-only for everyone by default
  modules.dashboard.view = true;

  const manageCadastros = legacy.canManageCadastros ?? true;
  const manageTransactions = legacy.canManageTransactions ?? true;
  const manageBudgets = legacy.canManageBudgets ?? true;
  const manageSettings = legacy.canManageSettings ?? false;
  const viewReports = legacy.canViewReports ?? true;

  const cadastroKeys: PermissionKey[] = ['categorias', 'contas', 'cartoes', 'pagamentos', 'beneficiarios'];
  cadastroKeys.forEach((key) => {
    modules[key] = { view: true, create: manageCadastros, edit: manageCadastros, delete: manageCadastros };
  });

  modules.orcamento = { view: true, create: manageBudgets, edit: manageBudgets, delete: manageBudgets };
  modules.transacoes = { view: true, create: manageTransactions, edit: manageTransactions, delete: manageTransactions };

  modules.pagar_receber = { view: viewReports, create: false, edit: false, delete: false };
  modules.realizadas = { view: viewReports, create: false, edit: false, delete: false };
  modules.por_categoria = { view: viewReports, create: false, edit: false, delete: false };

  ['perfis', 'usuarios', 'biometria', 'aparencia'].forEach((key) => {
    modules[key as PermissionKey] = {
      view: manageSettings,
      create: manageSettings,
      edit: manageSettings,
      delete: manageSettings,
    };
  });

  return {
    ...profile,
    permissions: {
      modules,
      canAccessPessoalScope: legacy.canAccessPessoalScope !== false,
      canAccessFamiliaScope: legacy.canAccessFamiliaScope !== false,
    },
  };
}