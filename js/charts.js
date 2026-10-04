/**
 * FinPulse - Vanilla HTML5 Canvas Charting Engine
 * Zero external dependencies - fully native Canvas 2D implementation
 */

const FinCharts = {
  // Color palette for category slices
  categoryColors: {
    'Salary': '#10b981',
    'Freelance': '#06b6d4',
    'Investments': '#8b5cf6',
    'Housing': '#6366f1',
    'Food & Dining': '#f43f5e',
    'Transportation': '#f59e0b',
    'Shopping': '#ec4899',
    'Entertainment': '#a855f7',
    'Utilities': '#14b8a6',
    'Healthcare': '#3b82f6',
    'Other': '#64748b'
  },

  // Setup HiDPI Canvas
  setupCanvas(canvas) {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    return { ctx, width: rect.width, height: rect.height, dpr };
  },

  /**
   * Render Donut Chart for Expense Categories
   */
  renderDonutChart(canvasId, legendContainerId, data, centerLabel = 'Expenses') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const total = Object.values(data).reduce((acc, val) => acc + val, 0);

    // If no data
    if (total === 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
      ctx.font = '14px Plus Jakarta Sans, sans-serif';
      ctx.fillText('No expense data available', width / 2, height / 2);
      if (legendContainerId) {
        const legend = document.getElementById(legendContainerId);
        if (legend) legend.innerHTML = '<p class="text-muted" style="text-align:center; font-size:0.8rem;">No categories to display</p>';
      }
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 18;
    const innerRadius = radius * 0.65;

    let startAngle = -Math.PI / 2;
    const legendItems = [];

    // Draw slices
    for (const [category, amount] of Object.entries(data)) {
      if (amount <= 0) continue;
      const sliceAngle = (amount / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;
      const sliceColor = this.categoryColors[category] || '#6366f1';

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // Border between slices
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--bg-card').trim() || '#161f33';
      ctx.stroke();

      legendItems.push({
        category,
        amount,
        percentage: ((amount / total) * 100).toFixed(1),
        color: sliceColor
      });

      startAngle = endAngle;
    }

    // Center Text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    ctx.font = '500 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText(centerLabel.toUpperCase(), centerX, centerY - 10);

    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#ffffff';
    ctx.font = '700 15px Plus Jakarta Sans, sans-serif';
    ctx.fillText(App.formatCurrency(total), centerX, centerY + 12);

    // Build Legend HTML
    if (legendContainerId) {
      const legend = document.getElementById(legendContainerId);
      if (legend) {
        legendItems.sort((a, b) => b.amount - a.amount);
        legend.innerHTML = legendItems.map(item => `
          <div class="legend-item">
            <div class="legend-left">
              <span class="legend-color-dot" style="background-color: ${item.color}"></span>
              <span class="legend-name">${item.category}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span style="font-size:0.75rem; color:var(--text-muted);">${item.percentage}%</span>
              <span class="legend-amount">${App.formatCurrency(item.amount)}</span>
            </div>
          </div>
        `).join('');
      }
    }
  },

  /**
   * Render Cash Flow Bar Chart (Income vs Expense comparison)
   */
  renderCashFlowBarChart(canvasId, monthlyData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 25, right: 25, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Find max value
    let maxVal = 1000;
    monthlyData.forEach(d => {
      maxVal = Math.max(maxVal, d.income, d.expense);
    });
    maxVal = Math.ceil(maxVal / 1000) * 1000;

    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.06)';
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const incomeColor = getComputedStyle(document.body).getPropertyValue('--income').trim() || '#10b981';
    const expenseColor = getComputedStyle(document.body).getPropertyValue('--expense').trim() || '#f43f5e';

    // Horizontal grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = textColor;
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const yVal = (maxVal / steps) * i;
      const yPos = padding.top + chartH - (i / steps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(padding.left + chartW, yPos);
      ctx.stroke();

      ctx.fillText(App.formatShortCurrency(yVal), padding.left - 8, yPos);
    }

    const groupWidth = chartW / monthlyData.length;
    const barWidth = Math.min(22, (groupWidth - 20) / 2);

    monthlyData.forEach((d, idx) => {
      const groupCenterX = padding.left + (idx + 0.5) * groupWidth;

      // Income bar
      const incHeight = (d.income / maxVal) * chartH;
      const incX = groupCenterX - barWidth - 3;
      const incY = padding.top + chartH - incHeight;
      this.drawRoundedBar(ctx, incX, incY, barWidth, incHeight, 4, incomeColor);

      // Expense bar
      const expHeight = (d.expense / maxVal) * chartH;
      const expX = groupCenterX + 3;
      const expY = padding.top + chartH - expHeight;
      this.drawRoundedBar(ctx, expX, expY, barWidth, expHeight, 4, expenseColor);

      // X-Axis Label
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(d.label, groupCenterX, padding.top + chartH + 12);
    });
  },

  /**
   * Render Running Balance Trend Line Chart
   */
  renderBalanceLineChart(canvasId, trendPoints) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    if (trendPoints.length < 2) return;

    const padding = { top: 25, right: 30, bottom: 40, left: 55 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = trendPoints.map(p => p.balance);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(1000, ...values);
    const valRange = maxVal - minVal || 1;

    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.06)';
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-muted').trim() || '#94a3b8';
    const primaryColor = getComputedStyle(document.body).getPropertyValue('--primary').trim() || '#6366f1';

    // Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = textColor;
    ctx.font = '10px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const v = minVal + (valRange / steps) * i;
      const y = padding.top + chartH - (i / steps) * chartH;

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();

      ctx.fillText(App.formatShortCurrency(v), padding.left - 8, y);
    }

    // Points calculation
    const points = trendPoints.map((p, idx) => {
      const x = padding.left + (idx / (trendPoints.length - 1)) * chartW;
      const y = padding.top + chartH - ((p.balance - minVal) / valRange) * chartH;
      return { x, y, date: p.date, balance: p.balance };
    });

    // Draw Gradient Area under line
    const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + chartH);
    points.forEach((p, i) => {
      if (i === 0) ctx.lineTo(p.x, p.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Smooth Line
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else {
        const prev = points[i - 1];
        const cx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
      }
    });
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = primaryColor;
    ctx.stroke();

    // Draw data points & X-axis labels
    points.forEach((p, idx) => {
      // Only draw marker if not congested
      if (trendPoints.length <= 12 || idx % Math.ceil(trendPoints.length / 8) === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(p.date, p.x, padding.top + chartH + 12);
      }
    });
  },

  // Helper: Draw rounded top rectangle bar
  drawRoundedBar(ctx, x, y, width, height, radius, fill) {
    if (height <= 0) return;
    radius = Math.min(radius, width / 2, height);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }
};
