/**
 * FinPulse - Unified Storage Architecture
 * Implements Web Storage (LocalStorage, SessionStorage), Cookies, and IndexedDB
 */

const STORAGE_KEYS = {
  TRANSACTIONS: 'finpulse_transactions',
  BUDGETS: 'finpulse_budgets',
  GOALS: 'finpulse_goals',
  SETTINGS: 'finpulse_settings'
};

const DB_CONFIG = {
  NAME: 'FinPulseDB',
  VERSION: 1,
  STORES: {
    ARCHIVE: 'transactions_archive',
    AUDIT_LOGS: 'audit_logs',
    BACKUPS: 'system_backups'
  }
};

// ============================================================================
// 1. COOKIES MANAGEMENT
// ============================================================================
const CookieManager = {
  get(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length));
    }
    return null;
  },

  set(name, value, days = 30) {
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
  },

  delete(name) {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  },

  getAll() {
    const cookies = {};
    if (!document.cookie) return cookies;
    document.cookie.split(';').forEach(c => {
      const [key, val] = c.trim().split('=');
      if (key) cookies[key] = decodeURIComponent(val || '');
    });
    return cookies;
  }
};

// ============================================================================
// 2. INDEXED DB ASYNC ENGINE
// ============================================================================
let dbInstance = null;

const IndexedDBManager = {
  async init() {
    if (dbInstance) return dbInstance;
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB is not supported in this browser.');
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Archive Object Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.ARCHIVE)) {
          const archiveStore = db.createObjectStore(DB_CONFIG.STORES.ARCHIVE, { keyPath: 'id' });
          archiveStore.createIndex('date', 'date', { unique: false });
          archiveStore.createIndex('type', 'type', { unique: false });
          archiveStore.createIndex('category', 'category', { unique: false });
        }

        // Audit Logs Object Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.AUDIT_LOGS)) {
          db.createObjectStore(DB_CONFIG.STORES.AUDIT_LOGS, { keyPath: 'logId', autoIncrement: true });
        }

        // Backups Object Store
        if (!db.objectStoreNames.contains(DB_CONFIG.STORES.BACKUPS)) {
          db.createObjectStore(DB_CONFIG.STORES.BACKUPS, { keyPath: 'backupId' });
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        reject(e);
      };
    });
  },

  async logAudit(action, data) {
    try {
      const db = await this.init();
      if (!db) return;
      const tx = db.transaction(DB_CONFIG.STORES.AUDIT_LOGS, 'readwrite');
      const store = tx.objectStore(DB_CONFIG.STORES.AUDIT_LOGS);
      store.add({
        action,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Audit log write error:', err);
    }
  },

  async createBackup() {
    const db = await this.init();
    if (!db) return null;

    const backupData = {
      backupId: 'backup_' + Date.now(),
      createdAt: new Date().toISOString(),
      transactions: StorageManager.getTransactions(),
      budgets: StorageManager.getBudgets(),
      goals: StorageManager.getGoals(),
      settings: StorageManager.getSettings()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_CONFIG.STORES.BACKUPS, 'readwrite');
      const store = tx.objectStore(DB_CONFIG.STORES.BACKUPS);
      const req = store.put(backupData);

      req.onsuccess = () => resolve(backupData.backupId);
      req.onerror = (e) => reject(e);
    });
  },

  async getBackups() {
    const db = await this.init();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(DB_CONFIG.STORES.BACKUPS, 'readonly');
      const store = tx.objectStore(DB_CONFIG.STORES.BACKUPS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  },

  async restoreBackup(backupId) {
    const db = await this.init();
    if (!db) return false;

    return new Promise((resolve) => {
      const tx = db.transaction(DB_CONFIG.STORES.BACKUPS, 'readonly');
      const store = tx.objectStore(DB_CONFIG.STORES.BACKUPS);
      const req = store.get(backupId);

      req.onsuccess = () => {
        const backup = req.result;
        if (!backup) {
          resolve(false);
          return;
        }

        StorageManager.saveTransactions(backup.transactions || []);
        StorageManager.saveBudgets(backup.budgets || []);
        StorageManager.saveGoals(backup.goals || []);
        if (backup.settings) StorageManager.saveSettings(backup.settings);
        resolve(true);
      };
      req.onerror = () => resolve(false);
    });
  },

  async syncTransactionsToArchive(transactions) {
    const db = await this.init();
    if (!db) return;
    try {
      const tx = db.transaction(DB_CONFIG.STORES.ARCHIVE, 'readwrite');
      const store = tx.objectStore(DB_CONFIG.STORES.ARCHIVE);
      transactions.forEach(t => store.put(t));
    } catch (e) {
      console.warn('Sync archive error:', e);
    }
  },

  async getCounts() {
    const db = await this.init();
    if (!db) return { archiveCount: 0, auditCount: 0, backupCount: 0 };

    return new Promise((resolve) => {
      const tx = db.transaction([
        DB_CONFIG.STORES.ARCHIVE,
        DB_CONFIG.STORES.AUDIT_LOGS,
        DB_CONFIG.STORES.BACKUPS
      ], 'readonly');

      let archiveCount = 0;
      let auditCount = 0;
      let backupCount = 0;

      const r1 = tx.objectStore(DB_CONFIG.STORES.ARCHIVE).count();
      const r2 = tx.objectStore(DB_CONFIG.STORES.AUDIT_LOGS).count();
      const r3 = tx.objectStore(DB_CONFIG.STORES.BACKUPS).count();

      r1.onsuccess = () => { archiveCount = r1.result; };
      r2.onsuccess = () => { auditCount = r2.result; };
      r3.onsuccess = () => { backupCount = r3.result; };

      tx.oncomplete = () => {
        resolve({ archiveCount, auditCount, backupCount });
      };
      tx.onerror = () => {
        resolve({ archiveCount: 0, auditCount: 0, backupCount: 0 });
      };
    });
  }
};

// ============================================================================
// 3. WEB STORAGE (LOCALSTORAGE & SESSIONSTORAGE)
// ============================================================================
const StorageManager = {
  // --- LocalStorage Operations ---
  getTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error reading transactions:', e);
      return [];
    }
  },

  saveTransactions(items) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(items));
      IndexedDBManager.syncTransactionsToArchive(items);
      return true;
    } catch (e) {
      console.error('Error saving transactions:', e);
      return false;
    }
  },

  addTransaction(item) {
    const items = this.getTransactions();
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString(),
      ...item
    };
    items.unshift(newTx);
    this.saveTransactions(items);
    IndexedDBManager.logAudit('create_transaction', newTx);
    return newTx;
  },

  updateTransaction(id, updatedFields) {
    const items = this.getTransactions();
    const index = items.findIndex(t => t.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updatedFields, updatedAt: new Date().toISOString() };
    this.saveTransactions(items);
    IndexedDBManager.logAudit('update_transaction', items[index]);
    return items[index];
  },

  deleteTransaction(id) {
    const items = this.getTransactions();
    const target = items.find(t => t.id === id);
    const filtered = items.filter(t => t.id !== id);
    this.saveTransactions(filtered);
    IndexedDBManager.logAudit('delete_transaction', { id, target });
    return target;
  },

  getBudgets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BUDGETS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveBudgets(items) {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(items));
    IndexedDBManager.logAudit('save_budgets', items);
    return true;
  },

  saveBudgetCategory(category, limit) {
    const budgets = this.getBudgets();
    const idx = budgets.findIndex(b => b.category === category);
    if (idx >= 0) {
      budgets[idx].limit = parseFloat(limit);
    } else {
      budgets.push({
        id: 'bg_' + Date.now(),
        category,
        limit: parseFloat(limit)
      });
    }
    this.saveBudgets(budgets);
  },

  deleteBudgetCategory(categoryId) {
    const budgets = this.getBudgets();
    const filtered = budgets.filter(b => b.id !== categoryId && b.category !== categoryId);
    this.saveBudgets(filtered);
  },

  getGoals() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.GOALS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveGoals(items) {
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(items));
    IndexedDBManager.logAudit('save_goals', items);
    return true;
  },

  addGoal(goal) {
    const goals = this.getGoals();
    const newGoal = {
      id: 'gl_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...goal
    };
    goals.push(newGoal);
    this.saveGoals(goals);
    return newGoal;
  },

  updateGoal(id, fields) {
    const goals = this.getGoals();
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) return null;
    goals[idx] = { ...goals[idx], ...fields };
    this.saveGoals(goals);
    return goals[idx];
  },

  deleteGoal(id) {
    const goals = this.getGoals();
    const filtered = goals.filter(g => g.id !== id);
    this.saveGoals(filtered);
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw ? JSON.parse(raw) : {
        currency: 'USD',
        theme: 'dark',
        userName: 'Alex Morgan'
      };
    } catch (e) {
      return { currency: 'USD', theme: 'dark', userName: 'Alex Morgan' };
    }
  },

  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    // Also keep cookies synchronized
    if (settings.theme) CookieManager.set('fp_theme', settings.theme, 90);
    if (settings.currency) CookieManager.set('fp_currency', settings.currency, 90);
    if (settings.userName) CookieManager.set('fp_user_name', settings.userName, 90);
  },

  // --- SessionStorage Operations ---
  getSessionFilters() {
    try {
      const raw = sessionStorage.getItem('finpulse_active_filters');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setSessionFilters(filters) {
    try {
      sessionStorage.setItem('finpulse_active_filters', JSON.stringify(filters));
    } catch (e) {}
  },

  clearSessionFilters() {
    sessionStorage.removeItem('finpulse_active_filters');
  },

  incrementSessionPageViews() {
    const views = parseInt(sessionStorage.getItem('finpulse_views') || '0', 10);
    sessionStorage.setItem('finpulse_views', (views + 1).toString());
    return views + 1;
  },

  // --- Raw Diagnostics Helper ---
  getStorageMetrics() {
    let lsBytes = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        lsBytes += (localStorage[key].length + key.length) * 2;
      }
    }

    return {
      txCount: this.getTransactions().length,
      budgetsCount: this.getBudgets().length,
      goalsCount: this.getGoals().length,
      localStorageBytes: lsBytes,
      sessionViews: sessionStorage.getItem('finpulse_views') || 1,
      cookies: CookieManager.getAll()
    };
  }
};

// ============================================================================
// 4. SAMPLE SEED DATA GENERATOR
// ============================================================================
function seedInitialData(force = false) {
  if (!force && localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    return; // Already initialized
  }

  // Pre-configured realistic transactions
  const sampleTransactions = [
    { id: 'tx_101', title: 'Tech Corp Monthly Salary', amount: 4850.00, type: 'income', category: 'Salary', date: '2026-10-01', method: 'Direct Deposit', notes: 'October base salary' },
    { id: 'tx_102', title: 'Downtown Apartment Rent', amount: 1650.00, type: 'expense', category: 'Housing', date: '2026-10-02', method: 'Bank Transfer', notes: 'Monthly rent for #4B' },
    { id: 'tx_103', title: 'Whole Foods Market Groceries', amount: 142.80, type: 'expense', category: 'Food & Dining', date: '2026-10-03', method: 'Credit Card', notes: 'Weekly organic groceries' },
    { id: 'tx_104', title: 'Freelance UI/UX Consultation', amount: 1200.00, type: 'income', category: 'Freelance', date: '2026-10-03', method: 'Stripe', notes: 'Fintech mobile app wireframes' },
    { id: 'tx_105', title: 'Electric & City Gas Utility', amount: 98.40, type: 'expense', category: 'Utilities', date: '2026-10-04', method: 'Direct Debit', notes: 'Power bill' },
    { id: 'tx_106', title: 'Metro Transit Monthly Pass', amount: 85.00, type: 'expense', category: 'Transportation', date: '2026-10-04', method: 'Apple Pay', notes: 'Subway & bus' },
    { id: 'tx_107', title: 'Blue Bottle Artisanal Coffee', amount: 14.50, type: 'expense', category: 'Food & Dining', date: '2026-10-05', method: 'Credit Card', notes: 'Meeting with client' },
    { id: 'tx_108', title: 'Equinox Gym Membership', amount: 110.00, type: 'expense', category: 'Healthcare', date: '2026-10-05', method: 'Credit Card', notes: 'Monthly fitness pass' },
    { id: 'tx_109', title: 'Dividend Payout - Index Fund', amount: 245.50, type: 'income', category: 'Investments', date: '2026-10-06', method: 'Brokerage', notes: 'Q3 S&P 500 ETF dividend' },
    { id: 'tx_110', title: 'Amazon Essentials & Ergonomic Mouse', amount: 68.90, type: 'expense', category: 'Shopping', date: '2026-10-06', method: 'Credit Card', notes: 'Home office gear' },
    { id: 'tx_111', title: 'Netflix & Spotify Premium Bundles', amount: 28.98, type: 'expense', category: 'Entertainment', date: '2026-10-06', method: 'Credit Card', notes: 'Streaming subscriptions' },
    { id: 'tx_112', title: 'Italian Trattoria Dinner with Friends', amount: 84.50, type: 'expense', category: 'Food & Dining', date: '2026-10-07', method: 'Credit Card', notes: 'Pasta & dessert' },
    { id: 'tx_113', title: 'High-Yield Savings Interest', amount: 42.10, type: 'income', category: 'Investments', date: '2026-09-30', method: 'Bank Transfer', notes: 'APY 5.1%' },
    { id: 'tx_114', title: 'Trader Joe’s Pantry Restock', amount: 94.20, type: 'expense', category: 'Food & Dining', date: '2026-09-28', method: 'Debit Card', notes: 'Groceries' },
    { id: 'tx_115', title: 'Uber Ride to Airport', amount: 46.50, type: 'expense', category: 'Transportation', date: '2026-09-26', method: 'Apple Pay', notes: 'Weekend trip' }
  ];

  // Default Budget Limits per category
  const sampleBudgets = [
    { id: 'bg_1', category: 'Housing', limit: 1800.00 },
    { id: 'bg_2', category: 'Food & Dining', limit: 600.00 },
    { id: 'bg_3', category: 'Transportation', limit: 250.00 },
    { id: 'bg_4', category: 'Shopping', limit: 300.00 },
    { id: 'bg_5', category: 'Entertainment', limit: 150.00 },
    { id: 'bg_6', category: 'Utilities', limit: 200.00 }
  ];

  // Default Savings Goals
  const sampleGoals = [
    { id: 'gl_1', title: 'Emergency Rain Fund', targetAmount: 10000, currentSaved: 7200, targetDate: '2026-12-31', icon: '🛡️', color: '#10b981' },
    { id: 'gl_2', title: 'Japan Tokyo Autumn Trip', targetAmount: 4500, currentSaved: 2850, targetDate: '2027-04-15', icon: '✈️', color: '#6366f1' },
    { id: 'gl_3', title: 'M4 MacBook Pro & Studio Display', targetAmount: 3200, currentSaved: 1600, targetDate: '2026-11-25', icon: '💻', color: '#f59e0b' }
  ];

  StorageManager.saveTransactions(sampleTransactions);
  StorageManager.saveBudgets(sampleBudgets);
  StorageManager.saveGoals(sampleGoals);

  // Default Settings & Cookies
  const settings = {
    currency: CookieManager.get('fp_currency') || 'USD',
    theme: CookieManager.get('fp_theme') || 'dark',
    userName: CookieManager.get('fp_user_name') || 'Alex Morgan'
  };
  StorageManager.saveSettings(settings);

  CookieManager.set('fp_last_login', new Date().toISOString(), 30);
}

// Auto-run initialization
document.addEventListener('DOMContentLoaded', () => {
  StorageManager.incrementSessionPageViews();
  seedInitialData(false);
  IndexedDBManager.init();
});
