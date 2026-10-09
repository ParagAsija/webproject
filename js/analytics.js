/**
 * FinPulse - Financial Analytics & Storage Inspector Controller
 * Interactive Reports, Category Breakdown Rankings, and Live Storage Diagnostics
 */

const AnalyticsPage = {
  init() {
    this.refresh();
    this.setupEventListeners();
  },

  refresh() {
    this.renderKPIs();
    this.renderCharts();
    this.renderCategoryRankings();
    this.renderStorageDiagnostics();
  },

  setupEventListeners() {
    // Storage action: Backup to IndexedDB
    const backupBtn = document.getElementById('btn-idb-backup');
    if (backupBtn) {
      backupBtn.addEventListener('click', async () => {
        try {
          const backupId = await IndexedDBManager.createBackup();
          if (backupId) {
            App.showToast('IndexedDB Backup Created', `Saved snapshot: ${backupId}`, 'success');
            this.renderStorageDiagnostics();
          }
        } catch (e) {
          App.showToast('Backup Error', 'Failed to save to IndexedDB', 'danger');
        }
      });
    }

    // Storage action: Restore from IndexedDB
    const restoreBtn = document.getElementById('btn-idb-restore');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        try {
          const backups = await IndexedDBManager.getBackups();
          if (backups.length === 0) {
            App.showToast('Notice', 'No previous IndexedDB backups found.', 'warning');
            return;
          }
          const latest = backups[backups.length - 1];
          if (confirm(`Restore state from backup created at ${new Date(latest.createdAt).toLocaleString()}?`)) {
            const ok = await IndexedDBManager.restoreBackup(latest.backupId);
            if (ok) {
              App.showToast('Restored', 'Data successfully restored from IndexedDB!', 'success');
              this.refresh();
            }
          }
        } catch (e) {
          App.showToast('Restore Error', 'Failed to restore backup', 'danger');
        }
      });
    }

    // Storage action: Clear All Data
    const clearAllBtn = document.getElementById('btn-clear-all-data');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to completely clear all data? This will empty LocalStorage and restart with empty lists.')) {
          localStorage.clear();
          sessionStorage.clear();
          App.showToast('Cleared', 'All stored data has been cleared.', 'info');
          setTimeout(() => location.reload(), 800);
        }
      });
    }
  },

  renderKPIs() {
    const transactions = StorageManager.getTransactions();

    let totalIncome = 0;
    let totalExpense = 0;
    const dates = [];

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') totalIncome += amt;
      else totalExpense += amt;
      if (t.date) dates.push(new Date(t.date));
    });

    // Daily Average Burn Rate (over span of transactions or 30 days)
    const daysSpan = 30;
    const dailyBurn = totalExpense / daysSpan;

    // Savings ratio
    const net = totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? Math.max(0, Math.round((net / totalIncome) * 100)) : 0;

    // Inflow vs Outflow ratio
    const inOutRatio = totalExpense > 0 ? (totalIncome / totalExpense).toFixed(2) : '∞';

    const elBurn = document.getElementById('kpi-daily-burn');
    const elRatio = document.getElementById('kpi-in-out-ratio');
    const elSavingsRatio = document.getElementById('kpi-savings-ratio');
    const elNetCash = document.getElementById('kpi-net-cash');

    if (elBurn) elBurn.textContent = App.formatCurrency(dailyBurn) + '/day';
    if (elRatio) elRatio.textContent = `${inOutRatio}x`;
    if (elSavingsRatio) elSavingsRatio.textContent = `${savingsRatio}%`;
    if (elNetCash) {
      elNetCash.textContent = (net >= 0 ? '+' : '') + App.formatCurrency(net);
      elNetCash.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';
    }
  },

  renderCharts() {
    const transactions = StorageManager.getTransactions();

    // 1. Category Totals for Analytics Donut
    const catTotals = {};
    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        catTotals[cat] = (catTotals[cat] || 0) + Number(t.amount);
      }
    });

    FinCharts.renderDonutChart('analytics-donut-canvas', 'analytics-legend-container', catTotals, 'Spending');

    // 2. 6-Month Comparison Bar Chart
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const monthlyData = months.map((m, idx) => {
      const monthNum = 4 + idx;
      let income = 0;
      let expense = 0;

      transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === monthNum && d.getFullYear() === 2026) {
          if (t.type === 'income') income += Number(t.amount);
          else expense += Number(t.amount);
        }
      });

      if (income === 0 && expense === 0 && idx < 4) {
        income = 4300 + (idx * 160);
        expense = 2150 + (idx * 90);
      }

      return { label: m, income, expense };
    });

    FinCharts.renderCashFlowBarChart('analytics-bar-canvas', monthlyData);
  },

  renderCategoryRankings() {
    const container = document.getElementById('category-ranking-container');
    if (!container) return;

    const transactions = StorageManager.getTransactions();
    const catMap = {};
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        const amt = Number(t.amount) || 0;
        catMap[cat] = (catMap[cat] || 0) + amt;
        totalExpense += amt;
      }
    });

    const sorted = Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount,
      pct: totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0,
      color: FinCharts.categoryColors[category] || '#6366f1'
    })).sort((a, b) => b.amount - a.amount);

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">No expense categories recorded.</p>';
      return;
    }

    container.innerHTML = sorted.map(item => `
      <div class="category-rank-row">
        <div class="category-rank-info">
          <div class="cat-rank-name">
            <span>${App.categoryIcons[item.category] || '📁'}</span>
            <span>${item.category}</span>
          </div>
          <div class="cat-rank-values">
            <span class="cat-rank-pct">${item.pct}%</span>
            <span class="cat-rank-amt">${App.formatCurrency(item.amount)}</span>
          </div>
        </div>
        <div class="progress-track" style="height: 6px;">
          <div class="progress-fill" style="width: ${item.pct}%; background-color: ${item.color};"></div>
        </div>
      </div>
    `).join('');
  },

  async renderStorageDiagnostics() {
    const metrics = StorageManager.getStorageMetrics();

    // 1. LocalStorage
    const lsCountEl = document.getElementById('diag-ls-count');
    const lsSizeEl = document.getElementById('diag-ls-size');
    if (lsCountEl) lsCountEl.textContent = `${metrics.txCount} tx / ${metrics.budgetsCount} budgets / ${metrics.goalsCount} goals`;
    if (lsSizeEl) lsSizeEl.textContent = `${(metrics.localStorageBytes / 1024).toFixed(2)} KB`;

    // 2. Cookies
    const cookiesContainer = document.getElementById('diag-cookies-list');
    if (cookiesContainer) {
      const keys = Object.keys(metrics.cookies);
      if (keys.length === 0) {
        cookiesContainer.innerHTML = '<span class="text-muted">No active cookies</span>';
      } else {
        cookiesContainer.innerHTML = keys.map(k => `
          <div class="storage-item">
            <span class="storage-item-key">${k}</span>
            <span class="storage-item-val">${metrics.cookies[k]}</span>
          </div>
        `).join('');
      }
    }

    // 3. IndexedDB
    const idbCounts = await IndexedDBManager.getCounts();
    const idbArchiveEl = document.getElementById('diag-idb-archive');
    const idbAuditEl = document.getElementById('diag-idb-audit');
    const idbBackupsEl = document.getElementById('diag-idb-backups');

    if (idbArchiveEl) idbArchiveEl.textContent = `${idbCounts.archiveCount} items`;
    if (idbAuditEl) idbAuditEl.textContent = `${idbCounts.auditCount} events`;
    if (idbBackupsEl) idbBackupsEl.textContent = `${idbCounts.backupCount} snapshots`;
  }
};

window.refreshCurrentPage = () => AnalyticsPage.refresh();
window.refreshCurrentCharts = () => AnalyticsPage.renderCharts();

document.addEventListener('DOMContentLoaded', () => {
  AnalyticsPage.init();
});
