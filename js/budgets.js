/**
 * FinPulse - Budgets & Savings Goals Controller
 * Full CRUD for Monthly Category Budgets & Multi-Goal Tracking
 */

const BudgetsPage = {
  activeGoalForContribution: null,

  init() {
    this.setupEventListeners();
    this.render();
  },

  setupEventListeners() {
    // Add Budget Form
    const addBudgetForm = document.getElementById('add-budget-form');
    if (addBudgetForm) {
      addBudgetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('budget-cat-select').value;
        const limit = parseFloat(document.getElementById('budget-limit-input').value);

        if (!category || isNaN(limit) || limit <= 0) {
          App.showToast('Validation Error', 'Please choose a category and enter a positive budget limit.', 'danger');
          return;
        }

        StorageManager.saveBudgetCategory(category, limit);
        App.closeModal('add-budget-modal');
        addBudgetForm.reset();
        App.showToast('Budget Created', `Monthly budget for ${category} set to ${App.formatCurrency(limit)}.`, 'success');
        this.render();
      });
    }

    // Add Savings Goal Form
    const addGoalForm = document.getElementById('add-goal-form');
    if (addGoalForm) {
      addGoalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('goal-title-input').value.trim();
        const targetAmount = parseFloat(document.getElementById('goal-target-input').value);
        const currentSaved = parseFloat(document.getElementById('goal-current-input').value) || 0;
        const targetDate = document.getElementById('goal-date-input').value;
        const icon = document.getElementById('goal-icon-input').value || '🎯';

        if (!title || isNaN(targetAmount) || targetAmount <= 0) {
          App.showToast('Validation Error', 'Please enter a goal title and valid target amount.', 'danger');
          return;
        }

        StorageManager.addGoal({
          title,
          targetAmount,
          currentSaved,
          targetDate,
          icon
        });

        App.closeModal('add-goal-modal');
        addGoalForm.reset();
        App.showToast('Goal Created', `Savings goal "${title}" initialized!`, 'success');
        this.render();
      });
    }

    // Contribute Funds to Goal Form
    const contributeForm = document.getElementById('contribute-goal-form');
    if (contributeForm) {
      contributeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const goalId = document.getElementById('contribute-goal-id').value;
        const addAmount = parseFloat(document.getElementById('contribute-amount-input').value);

        if (!goalId || isNaN(addAmount) || addAmount <= 0) {
          App.showToast('Validation Error', 'Please enter a valid contribution amount.', 'danger');
          return;
        }

        const goals = StorageManager.getGoals();
        const target = goals.find(g => g.id === goalId);
        if (target) {
          const newTotal = (target.currentSaved || 0) + addAmount;
          StorageManager.updateGoal(goalId, { currentSaved: newTotal });
          App.closeModal('contribute-goal-modal');
          contributeForm.reset();
          App.showToast('Funds Contributed', `Added ${App.formatCurrency(addAmount)} to "${target.title}"!`, 'success');
          this.render();
        }
      });
    }
  },

  render() {
    this.renderHeroBanner();
    this.renderBudgetsList();
    this.renderGoalsList();
  },

  renderHeroBanner() {
    const budgets = StorageManager.getBudgets();
    const transactions = StorageManager.getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalBudgeted = 0;
    budgets.forEach(b => {
      totalBudgeted += Number(b.limit) || 0;
    });

    let totalSpent = 0;
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        totalSpent += Number(t.amount) || 0;
      }
    });

    const remaining = totalBudgeted - totalSpent;
    const utilizationPct = totalBudgeted > 0 ? Math.min(100, Math.round((totalSpent / totalBudgeted) * 100)) : 0;

    const elHeroAmt = document.getElementById('hero-budget-remaining');
    const elHeroSpent = document.getElementById('hero-budget-spent');
    const elHeroTotal = document.getElementById('hero-budget-total');
    const elHeroPct = document.getElementById('hero-budget-pct');
    const elHeroBar = document.getElementById('hero-budget-bar');

    if (elHeroAmt) {
      elHeroAmt.textContent = App.formatCurrency(remaining);
      elHeroAmt.style.color = remaining >= 0 ? 'var(--income)' : 'var(--expense)';
    }
    if (elHeroSpent) elHeroSpent.textContent = App.formatCurrency(totalSpent);
    if (elHeroTotal) elHeroTotal.textContent = App.formatCurrency(totalBudgeted);
    if (elHeroPct) elHeroPct.textContent = `${utilizationPct}% utilized`;

    if (elHeroBar) {
      elHeroBar.style.width = `${utilizationPct}%`;
      if (utilizationPct >= 90) elHeroBar.className = 'budget-large-fill fill-danger';
      else if (utilizationPct >= 70) elHeroBar.className = 'budget-large-fill fill-warning';
      else elHeroBar.className = 'budget-large-fill fill-safe';
    }
  },

  renderBudgetsList() {
    const container = document.getElementById('budgets-cards-container');
    if (!container) return;

    const budgets = StorageManager.getBudgets();
    const transactions = StorageManager.getTransactions();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const categorySpend = {};
    transactions.forEach(t => {
      const d = new Date(t.date);
      if (t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        categorySpend[t.category] = (categorySpend[t.category] || 0) + Number(t.amount);
      }
    });

    if (budgets.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <h3 class="empty-state-title">No category budgets yet</h3>
          <p class="empty-state-desc">Set spending limits for your frequent categories to stay on track.</p>
          <button class="btn btn-primary" data-modal-open="add-budget-modal">+ Add Category Budget</button>
        </div>
      `;
      return;
    }

    container.innerHTML = budgets.map(b => {
      const spent = categorySpend[b.category] || 0;
      const limit = Number(b.limit) || 1;
      const pct = Math.round((spent / limit) * 100);
      const remaining = limit - spent;
      const icon = App.categoryIcons[b.category] || '📁';

      let statusBadge = '<span class="badge badge-income">On Track</span>';
      let fillClass = 'fill-safe';

      if (pct >= 100) {
        statusBadge = '<span class="badge badge-expense">Over Limit!</span>';
        fillClass = 'fill-danger';
      } else if (pct >= 80) {
        statusBadge = '<span class="badge badge-warning">Near Limit</span>';
        fillClass = 'fill-warning';
      }

      return `
        <div class="budget-category-card">
          <div class="budget-card-header">
            <div class="budget-cat-info">
              <div class="budget-cat-icon">${icon}</div>
              <div>
                <div class="budget-cat-name">${b.category}</div>
                <div class="budget-cat-limit">Limit: ${App.formatCurrency(limit)} / mo</div>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="budget-card-stats">
            <div class="budget-stat-col">
              <span class="stat-col-label">Spent</span>
              <span class="stat-col-val" style="color: ${pct >= 100 ? 'var(--expense)' : 'var(--text-primary)'}">
                ${App.formatCurrency(spent)}
              </span>
            </div>
            <div class="budget-stat-col" style="align-items: flex-end;">
              <span class="stat-col-label">Remaining</span>
              <span class="stat-col-val" style="color: ${remaining < 0 ? 'var(--expense)' : 'var(--income)'}">
                ${App.formatCurrency(remaining)}
              </span>
            </div>
          </div>

          <div>
            <div class="progress-track" style="height: 10px;">
              <div class="progress-fill ${fillClass}" style="width: ${Math.min(100, pct)}%"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">
              <span>${pct}% used</span>
              <span>${spent > limit ? `Exceeded by ${App.formatCurrency(spent - limit)}` : `${App.formatCurrency(remaining)} left`}</span>
            </div>
          </div>

          <div class="budget-card-footer">
            <button class="btn btn-ghost btn-sm edit-budget-btn" data-category="${b.category}" data-limit="${b.limit}">
              Adjust Limit
            </button>
            <div class="budget-actions">
              <button class="action-icon-btn delete-btn delete-budget-btn" data-id="${b.id}" data-category="${b.category}" title="Delete Budget">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.wireBudgetCardActions();
  },

  wireBudgetCardActions() {
    // Adjust budget limit
    document.querySelectorAll('.edit-budget-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        const limit = btn.getAttribute('data-limit');
        const newLimit = prompt(`Update monthly budget limit for "${cat}":`, limit);
        if (newLimit !== null) {
          const parsed = parseFloat(newLimit);
          if (!isNaN(parsed) && parsed > 0) {
            StorageManager.saveBudgetCategory(cat, parsed);
            App.showToast('Budget Updated', `${cat} budget set to ${App.formatCurrency(parsed)}.`, 'success');
            this.render();
          } else {
            App.showToast('Error', 'Please enter a valid positive number.', 'danger');
          }
        }
      });
    });

    // Delete budget
    document.querySelectorAll('.delete-budget-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const cat = btn.getAttribute('data-category');
        if (confirm(`Remove budget limit for "${cat}"?`)) {
          StorageManager.deleteBudgetCategory(id);
          App.showToast('Budget Removed', `Budget for ${cat} deleted.`, 'info');
          this.render();
        }
      });
    });
  },

  renderGoalsList() {
    const container = document.getElementById('goals-cards-container');
    if (!container) return;

    const goals = StorageManager.getGoals();

    if (goals.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h3 class="empty-state-title">No savings goals yet</h3>
          <p class="empty-state-desc">Set target savings goals for vacations, gadgets, or emergency funds.</p>
          <button class="btn btn-primary" data-modal-open="add-goal-modal">+ Add Savings Goal</button>
        </div>
      `;
      return;
    }

    container.innerHTML = goals.map(g => {
      const saved = Number(g.currentSaved) || 0;
      const target = Number(g.targetAmount) || 1;
      const pct = Math.min(100, Math.round((saved / target) * 100));
      const remaining = Math.max(0, target - saved);

      return `
        <div class="goal-card">
          <div class="goal-header">
            <div class="goal-title-wrap">
              <div class="goal-icon-badge">${g.icon || '🎯'}</div>
              <div>
                <div class="goal-title">${g.title}</div>
                <div class="goal-target-date">Target: ${g.targetDate || 'No deadline'}</div>
              </div>
            </div>
            <span class="badge ${pct >= 100 ? 'badge-income' : 'badge-neutral'}">${pct}%</span>
          </div>

          <div class="goal-progress-section">
            <div class="goal-amounts-row">
              <span class="goal-saved-bold">${App.formatCurrency(saved)}</span>
              <span class="goal-target-gray">Goal: ${App.formatCurrency(target)}</span>
            </div>

            <div class="progress-track" style="height: 10px;">
              <div class="progress-fill fill-safe" style="width: ${pct}%"></div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
              <span>${pct >= 100 ? '🎉 Goal Completed!' : `${App.formatCurrency(remaining)} remaining`}</span>
            </div>
          </div>

          <div class="goal-footer-actions">
            <button class="btn btn-primary btn-sm contribute-goal-btn" data-id="${g.id}" data-title="${g.title}">
              + Add Funds
            </button>
            <div class="budget-actions">
              <button class="action-icon-btn delete-btn delete-goal-btn" data-id="${g.id}" data-title="${g.title}" title="Delete Goal">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.wireGoalActions();
  },

  wireGoalActions() {
    // Contribute funds
    document.querySelectorAll('.contribute-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        document.getElementById('contribute-goal-id').value = id;
        document.getElementById('contribute-goal-title-display').textContent = title;
        App.openModal('contribute-goal-modal');
      });
    });

    // Delete goal
    document.querySelectorAll('.delete-goal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        if (confirm(`Delete savings goal "${title}"?`)) {
          StorageManager.deleteGoal(id);
          App.showToast('Goal Deleted', `"${title}" has been deleted.`, 'info');
          this.render();
        }
      });
    });
  }
};

window.refreshCurrentPage = () => BudgetsPage.render();

document.addEventListener('DOMContentLoaded', () => {
  BudgetsPage.init();
});
