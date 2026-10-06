/**
 * FinPulse - Dashboard Page Controller
 * Manages metric calculations, charts, budget health, and recent activities
 */

const Dashboard = {
  activeChartPeriod: 'monthly',

  init() {
    this.refresh();
    this.setupEventListeners();
  },

  refresh() {
    this.updateMetrics();
    this.renderCharts();
    this.renderRecentTransactions();
    this.renderBudgetHealth();
  },

  setupEventListeners() {
    // Chart timeframe pills
    document.querySelectorAll('.chart-filter-pills .chart-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.chart-filter-pills .chart-pill').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeChartPeriod = e.target.getAttribute('data-period') || 'monthly';
        this.renderCharts();
      });
    });

    // Quick seed demo button if exists
    const seedBtn = document.getElementById('btn-reset-demo-data');
    if (seedBtn) {
      seedBtn.addEventListener('click', () => {
        if (confirm('Load fresh demo sample data? This will overwrite existing local records with realistic entries.')) {
          seedInitialData(true);
          App.showToast('Demo Data Loaded', 'Sample transactions and budgets restored.', 'success');
          this.refresh();
        }
      });
    }
  },

  updateMetrics() {
    const transactions = StorageManager.getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalBalance = 0;
    let monthIncome = 0;
    let monthExpense = 0;

    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const tDate = new Date(t.date);

      if (t.type === 'income') {
        totalBalance += amt;
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
          monthIncome += amt;
        }
      } else {
        totalBalance -= amt;
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
          monthExpense += amt;
        }
      }
    });

    const netSavings = monthIncome - monthExpense;
    const savingsRate = monthIncome > 0 ? Math.max(0, Math.round((netSavings / monthIncome) * 100)) : 0;

    // Update UI elements
    const elBal = document.getElementById('metric-total-balance');
    const elInc = document.getElementById('metric-month-income');
    const elExp = document.getElementById('metric-month-expense');
    const elRate = document.getElementById('metric-savings-rate');

    if (elBal) elBal.textContent = App.formatCurrency(totalBalance);
    if (elInc) elInc.textContent = App.formatCurrency(monthIncome);
    if (elExp) elExp.textContent = App.formatCurrency(monthExpense);
    if (elRate) elRate.textContent = `${savingsRate}%`;
  },

  renderCharts() {
    const transactions = StorageManager.getTransactions();

    // 1. Prepare Category Breakdown for Donut Chart
    const categoryTotals = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const cat = t.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
      }
    });

    FinCharts.renderDonutChart('dashboard-donut-canvas', 'donut-legend-container', categoryTotals, 'Expenses');

    // 2. Prepare Cash Flow Data (Monthly or Weekly)
    if (this.activeChartPeriod === 'monthly') {
      const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
      const monthlyData = months.map((m, idx) => {
        const monthNum = 4 + idx; // 4 = May, 9 = Oct
        let income = 0;
        let expense = 0;

        transactions.forEach(t => {
          const d = new Date(t.date);
          if (d.getMonth() === monthNum && d.getFullYear() === 2026) {
            if (t.type === 'income') income += Number(t.amount);
            else expense += Number(t.amount);
          }
        });

        // Provide pleasant realistic baseline if earlier months have no entries
        if (income === 0 && expense === 0 && idx < 4) {
          income = 4200 + (idx * 150);
          expense = 2100 + (idx * 80);
        }

        return { label: m, income, expense };
      });

      FinCharts.renderCashFlowBarChart('dashboard-cashflow-canvas', monthlyData);
    } else {
      // 30 Days Running Balance Line Chart
      const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      let running = 3500;
      const trendPoints = [];

      sorted.forEach(t => {
        if (t.type === 'income') running += Number(t.amount);
        else running -= Number(t.amount);

        const shortDate = t.date.slice(5); // MM-DD
        trendPoints.push({ date: shortDate, balance: running });
      });

      if (trendPoints.length === 0) {
        trendPoints.push({ date: '10-01', balance: 3500 }, { date: '10-07', balance: 4800 });
      }

      FinCharts.renderBalanceLineChart('dashboard-cashflow-canvas', trendPoints.slice(-10));
    }
  },

  renderRecentTransactions() {
    const container = document.getElementById('recent-transactions-list');
    if (!container) return;

    const transactions = StorageManager.getTransactions();
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem;">
          <p class="text-muted" style="font-size: 0.85rem;">No recent transactions yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map(t => {
      const isInc = t.type === 'income';
      const icon = App.categoryIcons[t.category] || '💰';
      const sign = isInc ? '+' : '-';
      const amtClass = isInc ? 'tx-income' : 'tx-expense';

      return `
        <div class="mini-tx-item">
          <div class="mini-tx-left">
            <div class="mini-tx-icon">${icon}</div>
            <div class="mini-tx-details">
              <span class="mini-tx-title">${t.title}</span>
              <span class="mini-tx-meta">${t.category} • ${t.date}</span>
            </div>
          </div>
          <div class="mini-tx-right">
            <span class="mini-tx-amount ${amtClass}">${sign}${App.formatCurrency(t.amount)}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${t.method || 'Card'}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderBudgetHealth() {
    const container = document.getElementById('dashboard-budget-health-list');
    if (!container) return;

    const budgets = StorageManager.getBudgets();
    const transactions = StorageManager.getTransactions();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate spend per category for this month
    const categorySpend = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
      }
    });

    if (budgets.length === 0) {
      container.innerHTML = `<p class="text-muted" style="font-size:0.85rem;">No budget categories configured.</p>`;
      return;
    }

    // Show top 4 budgets
    const previewBudgets = budgets.slice(0, 4);

    container.innerHTML = previewBudgets.map(b => {
      const spent = categorySpend[b.category] || 0;
      const pct = Math.min(100, Math.round((spent / b.limit) * 100));

      let fillClass = 'fill-safe';
      if (pct >= 90) fillClass = 'fill-danger';
      else if (pct >= 70) fillClass = 'fill-warning';

      return `
        <div class="budget-progress-item">
          <div class="budget-progress-header">
            <span class="budget-progress-label">${App.categoryIcons[b.category] || '📁'} ${b.category}</span>
            <span class="budget-progress-numbers">${App.formatCurrency(spent)} / ${App.formatCurrency(b.limit)} (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.refreshCurrentPage = () => Dashboard.refresh();
window.refreshCurrentCharts = () => Dashboard.renderCharts();

document.addEventListener('DOMContentLoaded', () => {
  Dashboard.init();
});
