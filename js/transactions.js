/**
 * FinPulse - Transactions Management Controller
 * Full CRUD Operations, Filtering, Sorting, Pagination, and Data Export/Import
 */

const TransactionsPage = {
  currentPage: 1,
  pageSize: 8,
  activeFilters: {
    search: '',
    type: 'all',
    category: 'all',
    dateRange: 'all',
    sortBy: 'date-desc'
  },
  lastDeletedTransaction: null,

  init() {
    this.restoreSessionFilters();
    this.setupEventListeners();
    this.render();
  },

  restoreSessionFilters() {
    const saved = StorageManager.getSessionFilters();
    if (saved) {
      this.activeFilters = { ...this.activeFilters, ...saved };
      // Sync UI elements
      const searchInput = document.getElementById('tx-search-input');
      if (searchInput) searchInput.value = this.activeFilters.search;

      const catSelect = document.getElementById('tx-category-filter');
      if (catSelect) catSelect.value = this.activeFilters.category;

      const sortSelect = document.getElementById('tx-sort-select');
      if (sortSelect) sortSelect.value = this.activeFilters.sortBy;

      const dateSelect = document.getElementById('tx-date-filter');
      if (dateSelect) dateSelect.value = this.activeFilters.dateRange;

      document.querySelectorAll('.type-filter-btn').forEach(btn => {
        if (btn.getAttribute('data-type') === this.activeFilters.type) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  },

  saveSessionFilters() {
    StorageManager.setSessionFilters(this.activeFilters);
  },

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('tx-search-input');
    const searchClear = document.getElementById('tx-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.activeFilters.search = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.saveSessionFilters();
        this.render();
      });
    }
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.activeFilters.search = '';
        this.currentPage = 1;
        this.saveSessionFilters();
        this.render();
      });
    }

    // Type filter buttons
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeFilters.type = e.target.getAttribute('data-type');
        this.currentPage = 1;
        this.saveSessionFilters();
        this.render();
      });
    });

    // Category filter dropdown
    const catSelect = document.getElementById('tx-category-filter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.activeFilters.category = e.target.value;
        this.currentPage = 1;
        this.saveSessionFilters();
        this.render();
      });
    }

    // Date range filter
    const dateSelect = document.getElementById('tx-date-filter');
    if (dateSelect) {
      dateSelect.addEventListener('change', (e) => {
        this.activeFilters.dateRange = e.target.value;
        this.currentPage = 1;
        this.saveSessionFilters();
        this.render();
      });
    }

    // Sort selector
    const sortSelect = document.getElementById('tx-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.activeFilters.sortBy = e.target.value;
        this.saveSessionFilters();
        this.render();
      });
    }

    // Edit Transaction Modal Form Submission
    const editForm = document.getElementById('edit-tx-form');
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-tx-id').value;
        const title = document.getElementById('edit-tx-title').value.trim();
        const amount = parseFloat(document.getElementById('edit-tx-amount').value);
        const type = document.getElementById('edit-tx-type').value;
        const category = document.getElementById('edit-tx-category').value;
        const date = document.getElementById('edit-tx-date').value;
        const method = document.getElementById('edit-tx-method').value;
        const notes = document.getElementById('edit-tx-notes').value;

        if (!title || isNaN(amount) || amount <= 0 || !date) {
          App.showToast('Validation Error', 'Please check that all required fields are valid.', 'danger');
          return;
        }

        StorageManager.updateTransaction(id, {
          title,
          amount,
          type,
          category,
          date,
          method,
          notes
        });

        App.closeModal('edit-tx-modal');
        App.showToast('Updated', `Transaction "${title}" updated successfully.`, 'success');
        this.render();
      });
    }

    // CSV Export
    const exportBtn = document.getElementById('btn-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportToCSV());
    }

    // JSON Export
    const exportJsonBtn = document.getElementById('btn-export-json');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => this.exportToJSON());
    }

    // CSV / JSON File Import
    const importFileInput = document.getElementById('import-file-input');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }
  },

  getFilteredTransactions() {
    let items = StorageManager.getTransactions();
    const { search, type, category, dateRange, sortBy } = this.activeFilters;

    // Filter by type
    if (type !== 'all') {
      items = items.filter(t => t.type === type);
    }

    // Filter by category
    if (category !== 'all') {
      items = items.filter(t => t.category === category);
    }

    // Filter by search keyword
    if (search) {
      items = items.filter(t => 
        t.title.toLowerCase().includes(search) ||
        (t.notes && t.notes.toLowerCase().includes(search)) ||
        (t.method && t.method.toLowerCase().includes(search)) ||
        t.category.toLowerCase().includes(search)
      );
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      items = items.filter(t => {
        const tDate = new Date(t.date);
        if (dateRange === 'this-month') {
          return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        } else if (dateRange === 'last-month') {
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          return tDate.getMonth() === lastMonth && tDate.getFullYear() === lastMonthYear;
        } else if (dateRange === 'last-7-days') {
          const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        }
        return true;
      });
    }

    // Sorting
    items.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortBy === 'amount-desc') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'amount-asc') return Number(a.amount) - Number(b.amount);
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
      return 0;
    });

    return items;
  },

  render() {
    const allFiltered = this.getFilteredTransactions();
    const tbody = document.getElementById('tx-table-body');
    const countInfo = document.getElementById('tx-summary-count');
    const netInfo = document.getElementById('tx-summary-net');

    // Calculate Net of current filtered view
    let net = 0;
    let incomeSum = 0;
    let expenseSum = 0;

    allFiltered.forEach(t => {
      const a = Number(t.amount) || 0;
      if (t.type === 'income') {
        net += a;
        incomeSum += a;
      } else {
        net -= a;
        expenseSum += a;
      }
    });

    if (countInfo) {
      countInfo.textContent = `Showing ${allFiltered.length} transactions`;
    }
    if (netInfo) {
      const netSign = net >= 0 ? '+' : '';
      netInfo.textContent = `Net: ${netSign}${App.formatCurrency(net)}`;
      netInfo.style.color = net >= 0 ? 'var(--income)' : 'var(--expense)';
    }

    // Pagination slice
    const totalPages = Math.ceil(allFiltered.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    const startIdx = (this.currentPage - 1) * this.pageSize;
    const paginatedItems = allFiltered.slice(startIdx, startIdx + this.pageSize);

    if (!tbody) return;

    if (paginatedItems.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <div class="empty-state-icon">
                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <h3 class="empty-state-title">No transactions found</h3>
              <p class="empty-state-desc">Try clearing filters or add a new transaction using the button above.</p>
              <button class="btn btn-primary btn-sm" data-modal-open="global-tx-modal">
                + Add Transaction
              </button>
            </div>
          </td>
        </tr>
      `;
      this.renderPagination(totalPages);
      return;
    }

    tbody.innerHTML = paginatedItems.map(t => {
      const isInc = t.type === 'income';
      const icon = App.categoryIcons[t.category] || '💰';
      const typeBadge = isInc 
        ? `<span class="badge badge-income">Income</span>` 
        : `<span class="badge badge-expense">Expense</span>`;
      const sign = isInc ? '+' : '-';
      const amtClass = isInc ? 'tx-income' : 'tx-expense';

      return `
        <tr data-id="${t.id}">
          <td>
            <div class="tx-info-cell">
              <div class="tx-avatar">${icon}</div>
              <div>
                <span class="tx-title-text">${t.title}</span>
                <span class="tx-subtitle-text">${t.notes ? t.notes : t.category}</span>
              </div>
            </div>
          </td>
          <td>${typeBadge}</td>
          <td><span class="cat-tag">${t.category}</span></td>
          <td style="color: var(--text-secondary);">${t.date}</td>
          <td style="color: var(--text-muted); font-size:0.82rem;">${t.method || 'Card'}</td>
          <td class="tx-amount-cell ${amtClass}">${sign}${App.formatCurrency(t.amount)}</td>
          <td>
            <div class="tx-actions-cell">
              <button class="action-icon-btn edit-tx-btn" data-id="${t.id}" title="Edit Transaction">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </button>
              <button class="action-icon-btn delete-btn delete-tx-btn" data-id="${t.id}" title="Delete Transaction">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.wireRowActions();
    this.renderPagination(totalPages);
  },

  wireRowActions() {
    // Edit Action Buttons
    document.querySelectorAll('.edit-tx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditModal(id);
      });
    });

    // Delete Action Buttons
    document.querySelectorAll('.delete-tx-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deleteTransactionWithUndo(id);
      });
    });
  },

  openEditModal(id) {
    const transactions = StorageManager.getTransactions();
    const target = transactions.find(t => t.id === id);
    if (!target) return;

    document.getElementById('edit-tx-id').value = target.id;
    document.getElementById('edit-tx-title').value = target.title;
    document.getElementById('edit-tx-amount').value = target.amount;
    document.getElementById('edit-tx-type').value = target.type;
    document.getElementById('edit-tx-category').value = target.category;
    document.getElementById('edit-tx-date').value = target.date;
    document.getElementById('edit-tx-method').value = target.method || 'Card';
    document.getElementById('edit-tx-notes').value = target.notes || '';

    App.openModal('edit-tx-modal');
  },

  deleteTransactionWithUndo(id) {
    const deleted = StorageManager.deleteTransaction(id);
    if (!deleted) return;

    this.lastDeletedTransaction = deleted;
    this.render();

    // Show interactive toast with Undo option
    App.showToast(
      'Transaction Deleted',
      `"${deleted.title}" was removed. <a href="javascript:void(0)" id="toast-undo-btn" style="color:var(--primary); font-weight:700; text-decoration:underline; margin-left:8px;">Undo</a>`,
      'warning',
      6000
    );

    const undoBtn = document.getElementById('toast-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.lastDeletedTransaction) {
          StorageManager.addTransaction(this.lastDeletedTransaction);
          this.lastDeletedTransaction = null;
          this.render();
          App.showToast('Restored', 'Transaction successfully restored.', 'success');
        }
      });
    }
  },

  renderPagination(totalPages) {
    const container = document.getElementById('tx-pagination-controls');
    const info = document.getElementById('tx-pagination-info');

    if (info) {
      info.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    if (!container) return;

    let html = `
      <button class="page-btn" id="prev-page-btn" ${this.currentPage <= 1 ? 'disabled' : ''}>
        &larr; Prev
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      if (totalPages > 6 && Math.abs(p - this.currentPage) > 2 && p !== 1 && p !== totalPages) {
        if (p === 2 || p === totalPages - 1) {
          html += `<span style="padding:0 4px; color:var(--text-muted);">...</span>`;
        }
        continue;
      }
      html += `
        <button class="page-btn ${p === this.currentPage ? 'active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }

    html += `
      <button class="page-btn" id="next-page-btn" ${this.currentPage >= totalPages ? 'disabled' : ''}>
        Next &rarr;
      </button>
    `;

    container.innerHTML = html;

    // Event listeners for pagination buttons
    const prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render();
        }
      });
    }

    const nextBtn = document.getElementById('next-page-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render();
        }
      });
    }

    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        this.render();
      });
    });
  },

  // --------------------------------------------------------------------------
  // CSV / JSON EXPORT & IMPORT
  // --------------------------------------------------------------------------
  exportToCSV() {
    const transactions = StorageManager.getTransactions();
    if (transactions.length === 0) {
      App.showToast('Notice', 'No transactions to export.', 'warning');
      return;
    }

    const headers = ['id', 'title', 'amount', 'type', 'category', 'date', 'method', 'notes'];
    const rows = transactions.map(t => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.amount,
      t.type,
      `"${t.category || ''}"`,
      t.date,
      `"${t.method || ''}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `finpulse_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('Exported', 'Transactions exported to CSV successfully.', 'success');
  },

  exportToJSON() {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      transactions: StorageManager.getTransactions(),
      budgets: StorageManager.getBudgets(),
      goals: StorageManager.getGoals()
    };

    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', jsonStr);
    link.setAttribute('download', `finpulse_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('Exported', 'Full dataset exported to JSON successfully.', 'success');
  },

  handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.transactions)) {
            StorageManager.saveTransactions(parsed.transactions);
            if (Array.isArray(parsed.budgets)) StorageManager.saveBudgets(parsed.budgets);
            if (Array.isArray(parsed.goals)) StorageManager.saveGoals(parsed.goals);
            App.showToast('Import Succeeded', `Imported ${parsed.transactions.length} records.`, 'success');
            this.render();
          }
        } else if (file.name.endsWith('.csv')) {
          const lines = content.split('\n').filter(l => l.trim().length > 0);
          if (lines.length > 1) {
            const newTxs = [];
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
              if (cols.length >= 6) {
                newTxs.push({
                  id: cols[0] || 'tx_' + Date.now() + '_' + i,
                  title: cols[1] || 'Imported Entry',
                  amount: parseFloat(cols[2]) || 0,
                  type: cols[3] || 'expense',
                  category: cols[4] || 'Other',
                  date: cols[5] || new Date().toISOString().split('T')[0],
                  method: cols[6] || 'Imported',
                  notes: cols[7] || ''
                });
              }
            }
            StorageManager.saveTransactions(newTxs);
            App.showToast('CSV Imported', `Successfully imported ${newTxs.length} transactions.`, 'success');
            this.render();
          }
        }
      } catch (err) {
        console.error('Import error:', err);
        App.showToast('Import Failed', 'Invalid file format. Please check your file.', 'danger');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  }
};

window.refreshCurrentPage = () => TransactionsPage.render();

document.addEventListener('DOMContentLoaded', () => {
  TransactionsPage.init();
});
