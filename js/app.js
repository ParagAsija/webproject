/**
 * FinPulse - Core Application Utilities & UI Controllers
 * Handles modals, toasts, themes, currency formatting, and mobile drawer
 */

const App = {
  currencies: {
    'USD': { symbol: '$', code: 'USD', locale: 'en-US' },
    'EUR': { symbol: '€', code: 'EUR', locale: 'de-DE' },
    'GBP': { symbol: '£', code: 'GBP', locale: 'en-GB' },
    'INR': { symbol: '₹', code: 'INR', locale: 'en-IN' },
    'JPY': { symbol: '¥', code: 'JPY', locale: 'ja-JP' }
  },

  categoryIcons: {
    'Salary': '💼',
    'Freelance': '💻',
    'Investments': '📈',
    'Housing': '🏠',
    'Food & Dining': '🍔',
    'Transportation': '🚗',
    'Shopping': '🛍️',
    'Entertainment': '🎬',
    'Utilities': '⚡',
    'Healthcare': '🏥',
    'Other': '📦'
  },

  init() {
    this.initTheme();
    this.initCurrency();
    this.initMobileNav();
    this.initModals();
    this.initQuickAddModal();
    this.renderUserProfile();
  },

  // --------------------------------------------------------------------------
  // THEME MANAGEMENT (LocalStorage + Cookies)
  // --------------------------------------------------------------------------
  initTheme() {
    const savedTheme = CookieManager.get('fp_theme') || StorageManager.getSettings().theme || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButton(savedTheme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        CookieManager.set('fp_theme', newTheme, 90);
        const settings = StorageManager.getSettings();
        settings.theme = newTheme;
        StorageManager.saveSettings(settings);
        this.updateThemeButton(newTheme);
        this.showToast('Theme Updated', `Switched to ${newTheme} mode`, 'info', 2000);

        // Re-render charts on theme change if they exist
        if (window.refreshCurrentCharts) {
          window.refreshCurrentCharts();
        }
      });
    }
  },

  updateThemeButton(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    if (theme === 'light') {
      btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`;
      btn.setAttribute('title', 'Switch to Dark Mode');
    } else {
      btn.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`;
      btn.setAttribute('title', 'Switch to Light Mode');
    }
  },

  // --------------------------------------------------------------------------
  // CURRENCY SELECTION
  // --------------------------------------------------------------------------
  initCurrency() {
    const currentCode = CookieManager.get('fp_currency') || StorageManager.getSettings().currency || 'USD';
    const select = document.getElementById('currency-select');
    if (select) {
      select.value = currentCode;
      select.addEventListener('change', (e) => {
        const newCode = e.target.value;
        CookieManager.set('fp_currency', newCode, 90);
        const settings = StorageManager.getSettings();
        settings.currency = newCode;
        StorageManager.saveSettings(settings);
        this.showToast('Currency Updated', `Active currency is now ${newCode}`, 'info', 2000);
        // Refresh active page to update rendered amounts
        if (window.refreshCurrentPage) {
          window.refreshCurrentPage();
        } else {
          location.reload();
        }
      });
    }
  },

  getCurrency() {
    const code = CookieManager.get('fp_currency') || StorageManager.getSettings().currency || 'USD';
    return this.currencies[code] || this.currencies['USD'];
  },

  formatCurrency(amount) {
    const curr = this.getCurrency();
    const val = Number(amount) || 0;
    return new Intl.NumberFormat(curr.locale, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  },

  formatShortCurrency(amount) {
    const curr = this.getCurrency();
    const val = Number(amount) || 0;
    if (Math.abs(val) >= 1000000) {
      return curr.symbol + (val / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(val) >= 1000) {
      return curr.symbol + (val / 1000).toFixed(1) + 'k';
    }
    return curr.symbol + val.toFixed(0);
  },

  // --------------------------------------------------------------------------
  // USER PROFILE
  // --------------------------------------------------------------------------
  renderUserProfile() {
    const name = CookieManager.get('fp_user_name') || StorageManager.getSettings().userName || 'Alex Morgan';
    const nameEl = document.getElementById('sidebar-user-name');
    if (nameEl) nameEl.textContent = name;
  },

  // --------------------------------------------------------------------------
  // MOBILE NAVIGATION DRAWER
  // --------------------------------------------------------------------------
  initMobileNav() {
    const toggleBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggleBtn && sidebar && backdrop) {
      const openDrawer = () => {
        sidebar.classList.add('mobile-open');
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      };

      const closeDrawer = () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      };

      toggleBtn.addEventListener('click', openDrawer);
      backdrop.addEventListener('click', closeDrawer);

      // Close when clicking nav items on mobile
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', closeDrawer);
      });
    }
  },

  // --------------------------------------------------------------------------
  // MODAL CONTROLLER
  // --------------------------------------------------------------------------
  initModals() {
    // Open modal buttons
    document.querySelectorAll('[data-modal-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-modal-open');
        this.openModal(modalId);
      });
    });

    // Close buttons
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) this.closeModal(modal.id);
      });
    });

    // Close when clicking overlay backdrop
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay.id);
        }
      });
    });

    // Esc key closes top modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) this.closeModal(activeModal.id);
      }
    });
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Focus first input
    const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  },

  // --------------------------------------------------------------------------
  // GLOBAL QUICK ADD TRANSACTION MODAL
  // --------------------------------------------------------------------------
  initQuickAddModal() {
    const form = document.getElementById('global-quick-tx-form');
    if (!form) return;

    // Set default date to today
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      const title = formData.get('title').trim();
      const amount = parseFloat(formData.get('amount'));
      const type = formData.get('type');
      const category = formData.get('category');
      const date = formData.get('date');
      const method = formData.get('method') || 'Card';
      const notes = formData.get('notes') || '';

      if (!title || isNaN(amount) || amount <= 0 || !date) {
        this.showToast('Validation Error', 'Please enter a valid title, positive amount, and date.', 'danger');
        return;
      }

      const newTx = StorageManager.addTransaction({
        title,
        amount,
        type,
        category,
        date,
        method,
        notes
      });

      this.closeModal('global-tx-modal');
      form.reset();
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

      this.showToast('Transaction Added', `${title} (${this.formatCurrency(amount)}) saved successfully.`, 'success');

      if (window.refreshCurrentPage) {
        window.refreshCurrentPage();
      }
    });
  },

  // --------------------------------------------------------------------------
  // TOAST NOTIFICATION ENGINE
  // --------------------------------------------------------------------------
  showToast(title, message, type = 'info', duration = 3500) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconSvg = {
      success: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`,
      danger: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`,
      warning: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
      info: `<svg class="toast-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
    }[type] || '';

    toast.innerHTML = `
      <div style="color: var(--${type === 'danger' ? 'expense' : (type === 'success' ? 'income' : 'primary')})">
        ${iconSvg}
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-desc">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 250);
    };

    closeBtn.addEventListener('click', dismiss);
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
