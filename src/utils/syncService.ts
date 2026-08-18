import { StorageService } from './storage';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncListener {
  (state: SyncState, lastSyncedAt?: string): void;
}

class SyncServiceManager {
  private currentState: SyncState = 'synced';
  private lastSyncedAt?: string;
  private listeners: Set<SyncListener> = new Set();
  private syncIntervalId: any = null;
  private isSyncing = false;

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState, this.lastSyncedAt);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(state: SyncState) {
    this.currentState = state;
    this.listeners.forEach((l) => l(state, this.lastSyncedAt));
  }

  public getSyncState(): SyncState {
    return this.currentState;
  }

  public getLastSyncedAt(): string | undefined {
    return this.lastSyncedAt;
  }

  private hasCompletedInitialPull = false;

  public isInitialPullDone(): boolean {
    return this.hasCompletedInitialPull;
  }

  /**
   * Helper function to merge array records by ID, prioritizing cloud data
   */
  private mergeArray<T extends { id: string }>(localList: T[], cloudList: T[]): T[] {
    if (!cloudList || !Array.isArray(cloudList)) return localList || [];
    if (!localList || !Array.isArray(localList)) return cloudList || [];

    const map = new Map<string, T>();
    // First populate local
    for (const item of localList) {
      if (item && item.id) map.set(item.id, item);
    }
    // Override with cloud items (cloud is source of truth)
    for (const item of cloudList) {
      if (item && item.id) map.set(item.id, item);
    }
    return Array.from(map.values());
  }

  /**
   * Puxa todos os dados atualizados do servidor na nuvem
   */
  public async pullData(): Promise<boolean> {
    if (!navigator.onLine) {
      this.notifyListeners('offline');
      return false;
    }

    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.notifyListeners('syncing');

    try {
      const response = await fetch('/api/sync/pull', {
        method: 'GET',
        headers: { 'x-api-key': import.meta.env.VITE_SYNC_API_KEY || '' },
      });
      if (!response.ok) {
        throw new Error(`Sync pull failed with status ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        const d = result.data;

        // Smart merge local and cloud data
        if (d.categories) {
          const merged = this.mergeArray(StorageService.getCategories(), d.categories);
          StorageService.saveCategories(merged);
        }
        if (d.accounts) {
          const merged = this.mergeArray(StorageService.getAccounts(), d.accounts);
          StorageService.saveAccounts(merged);
        }
        if (d.cards) {
          const merged = this.mergeArray(StorageService.getCreditCards(), d.cards);
          StorageService.saveCreditCards(merged);
        }
        if (d.paymentMethods) {
          const merged = this.mergeArray(StorageService.getPaymentMethods(), d.paymentMethods);
          StorageService.savePaymentMethods(merged);
        }
        if (d.beneficiaries) {
          const merged = this.mergeArray(StorageService.getBeneficiaries(), d.beneficiaries);
          StorageService.saveBeneficiaries(merged);
        }
        if (d.budgets) {
          const merged = this.mergeArray(StorageService.getBudgets(), d.budgets);
          StorageService.saveBudgets(merged);
        }
        if (d.transactions) {
          const merged = this.mergeArray(StorageService.getTransactions(), d.transactions);
          StorageService.saveTransactions(merged);
        }
        if (d.profiles) {
          const merged = this.mergeArray(StorageService.getProfiles(), d.profiles);
          StorageService.saveProfiles(merged);
        }
        if (d.users) {
          const merged = this.mergeArray(StorageService.getUsers(), d.users);
          StorageService.saveUsers(merged);
        }
        if (d.cardInvoicePayments) {
          const merged = this.mergeArray(StorageService.getCreditCardInvoicePayments(), d.cardInvoicePayments);
          StorageService.saveCreditCardInvoicePayments(merged);
        }

        this.lastSyncedAt = d.lastUpdated || new Date().toISOString();
        this.hasCompletedInitialPull = true;
        this.notifyListeners('synced');

        // Notifica outras abas no mesmo dispositivo via evento de storage
        window.dispatchEvent(new Event('storage'));
        return true;
      }

      this.hasCompletedInitialPull = true;
      this.lastSyncedAt = new Date().toISOString();
      this.notifyListeners('synced');
      return true;
    } catch (err) {
      console.warn('Sync pull notice:', err);
      this.hasCompletedInitialPull = true; // allow push if network fails
      this.notifyListeners('offline');
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Envia os dados locais atualizados para o servidor na nuvem
   */
  public async pushData(): Promise<boolean> {
    if (!this.hasCompletedInitialPull) {
      console.log('Skipping pushData: Initial pull not completed yet');
      return false;
    }

    if (!navigator.onLine) {
      this.notifyListeners('offline');
      return false;
    }

    this.notifyListeners('syncing');

    const payload = {
      categories: StorageService.getCategories(),
      accounts: StorageService.getAccounts(),
      cards: StorageService.getCreditCards(),
      paymentMethods: StorageService.getPaymentMethods(),
      beneficiaries: StorageService.getBeneficiaries(),
      budgets: StorageService.getBudgets(),
      transactions: StorageService.getTransactions(),
      profiles: StorageService.getProfiles(),
      users: StorageService.getUsers(),
      cardInvoicePayments: StorageService.getCreditCardInvoicePayments(),
    };

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_SYNC_API_KEY || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed with status ${response.status}`);
      }

      const res = await response.json();
      if (res.success) {
        this.lastSyncedAt = res.lastUpdated || new Date().toISOString();
        this.notifyListeners('synced');
        return true;
      }
      this.notifyListeners('error');
      return false;
    } catch (err) {
      console.warn('Sync push error:', err);
      this.notifyListeners('offline');
      return false;
    }
  }

  /**
   * Inicia sincronização contínua entre dispositivos
   */
  public startAutoSync(onStateChange?: () => void) {
    // Puxar dados iniciais
    this.pullData().then(() => {
      if (onStateChange) onStateChange();
    });

    if (this.syncIntervalId) clearInterval(this.syncIntervalId);

    // Polling a cada 10 segundos
    this.syncIntervalId = setInterval(() => {
      this.pullData().then(() => {
        if (onStateChange) onStateChange();
      });
    }, 10000);

    const handleFocus = () => {
      this.pullData().then(() => {
        if (onStateChange) onStateChange();
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      if (this.syncIntervalId) clearInterval(this.syncIntervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }
}

export const syncService = new SyncServiceManager();
