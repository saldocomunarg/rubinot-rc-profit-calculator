/**
 * statistics.js
 * Módulo 9: Estadísticas de hunts y mercado, con filtro de período.
 */

window.StatisticsModule = {

  period: '30d',
  customFrom: '',
  customTo: '',

  rangeDates() {
    const today = new Date();
    const toStr = (d) => d.toISOString().slice(0, 10);
    if (this.period === 'today') return { from: toStr(today), to: toStr(today) };
    if (this.period === '7d') { const d = new Date(today); d.setDate(d.getDate() - 7); return { from: toStr(d), to: toStr(today) }; }
    if (this.period === '30d') { const d = new Date(today); d.setDate(d.getDate() - 30); return { from: toStr(d), to: toStr(today) }; }
    if (this.period === 'custom') return { from: this.customFrom || '0000-01-01', to: this.customTo || toStr(today) };
    return { from: '0000-01-01', to: toStr(today) };
  },

  huntStats() {
    const { from, to } = this.rangeDates();
    const hunts = window.DB.hunts.filter(h => h.date >= from && h.date <= to);
    const totalRc = hunts.reduce((a, h) => a + (Number(h.rc) || 0), 0);
    const totalHours = hunts.reduce((a, h) => a + (window.HuntsModule.compute(h).hours || 0), 0);
    const totalValue = hunts.reduce((a, h) => a + window.HuntsModule.compute(h).estimatedValue, 0);
    return {
      count: hunts.length, totalRc,
      avgRcPerHunt: hunts.length ? totalRc / hunts.length : 0,
      avgRcPerHour: totalHours ? totalRc / totalHours : 0,
      totalValue,
      avgValuePerHunt: hunts.length ? totalValue / hunts.length : 0,
      avgValuePerHour: totalHours ? totalValue / totalHours : 0,
      hunts
    };
  },

  marketStats() {
    const { from, to } = this.rangeDates();
    const ops = window.DB.market.filter(o => o.date >= from && o.date <= to);
    const buys = ops.filter(o => o.type === 'buy');
    const sells = ops.filter(o => o.type === 'sell');
    const rcBought = buys.reduce((a, b) => a + (Number(b.rcQty) || 0), 0);
    const rcSold = sells.reduce((a, s) => a + (Number(s.rcQty) || 0), 0);
    const goldInvested = buys.reduce((a, b) => a + window.MarketModule.computeBuy(b).goldUsed, 0);
    const sellCalcs = sells.map(s => window.MarketModule.computeSell(s));
    const goldRecovered = sellCalcs.reduce((a, c) => a + c.goldNeto, 0);
    const commissions = sellCalcs.reduce((a, c) => a + c.commissionGold, 0);
    const avgCost = window.MarketModule.avgBuyCost();
    const realizedPnl = goldRecovered - avgCost * rcSold;
    const roiAvg = goldInvested > 0 ? (realizedPnl / goldInvested) * 100 : 0;
    return { rcBought, rcSold, goldInvested, goldRecovered, commissions, opsCount: ops.length, realizedPnl, roiAvg, ops };
  },

  render() {
    return `
      <h1 class="view-title">Estadísticas</h1>
      <div class="section">
        <div class="toolbar">
          <span class="chip-row" id="st_periodChips">
            <span class="chip" data-p="today">Hoy</span>
            <span class="chip" data-p="7d">7 días</span>
            <span class="chip active" data-p="30d">30 días</span>
            <span class="chip" data-p="custom">Personalizado</span>
          </span>
          <input type="date" id="st_from" style="display:none;">
          <input type="date" id="st_to" style="display:none;">
        </div>
      </div>
      <div id="st_content"></div>
    `;
  },

  renderContent() {
    const h = this.huntStats();
    const m = this.marketStats();
    const fmt = window.Fmt.num;

    document.getElementById('st_content').innerHTML = `
      <div class="section">
        <h2>Hunts</h2>
        <div class="grid grid-cards">
          <div class="card"><h3>Total de hunts</h3><div class="value">${h.count}</div></div>
          <div class="card"><h3>RC totales</h3><div class="value">${fmt(h.totalRc)}</div></div>
          <div class="card"><h3>Promedio RC/hunt</h3><div class="value">${fmt(h.avgRcPerHunt)}</div></div>
          <div class="card"><h3>Promedio RC/hora</h3><div class="value">${fmt(h.avgRcPerHour)}</div></div>
          <div class="card"><h3>Valor estimado total</h3><div class="value blue">${fmt(h.totalValue)}</div></div>
          <div class="card"><h3>Valor promedio / hunt</h3><div class="value">${fmt(h.avgValuePerHunt)}</div></div>
          <div class="card"><h3>Valor promedio / hora</h3><div class="value">${fmt(h.avgValuePerHour)}</div></div>
        </div>
        <canvas id="st_huntChart" height="90" style="margin-top:14px;"></canvas>
      </div>

      <div class="section">
        <h2>Mercado</h2>
        <div class="grid grid-cards">
          <div class="card"><h3>RC comprados</h3><div class="value">${fmt(m.rcBought)}</div></div>
          <div class="card"><h3>RC vendidos</h3><div class="value">${fmt(m.rcSold)}</div></div>
          <div class="card"><h3>Gold invertido</h3><div class="value">${fmt(m.goldInvested)}</div></div>
          <div class="card"><h3>Gold recuperado</h3><div class="value">${fmt(m.goldRecovered)}</div></div>
          <div class="card"><h3>Comisiones</h3><div class="value red">${fmt(m.commissions)}</div></div>
          <div class="card"><h3>Ganancia acumulada</h3><div class="value ${m.realizedPnl>=0?'green':'red'}">${fmt(m.realizedPnl)}</div></div>
          <div class="card"><h3>Operaciones</h3><div class="value">${m.opsCount}</div></div>
          <div class="card"><h3>ROI promedio</h3><div class="value ${m.roiAvg>=0?'green':'red'}">${fmt(m.roiAvg)}%</div></div>
        </div>
        <canvas id="st_marketChart" height="90" style="margin-top:14px;"></canvas>
      </div>
    `;

    this.drawHuntChart(h.hunts);
    this.drawMarketChart(m.ops);
  },

  // Gráficos dibujados a mano sobre <canvas>, sin librerías externas,
  // para que la app funcione 100% offline sin dependencias adicionales.
  drawBarChart(canvas, labels, series) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600, h = canvas.height || 90;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!labels.length) {
      ctx.fillStyle = '#5b6577'; ctx.font = '12px Segoe UI'; ctx.fillText('Sin datos en este período', 10, h / 2);
      return;
    }
    const padding = 24;
    const chartW = w - padding * 2, chartH = h - padding;
    const maxVal = Math.max(1, ...series.flatMap(s => s.data));
    const groupW = chartW / labels.length;
    const barW = Math.max(3, (groupW / series.length) - 4);

    labels.forEach((lab, i) => {
      series.forEach((s, si) => {
        const val = s.data[i] || 0;
        const barH = (val / maxVal) * (chartH - 10);
        const x = padding + i * groupW + si * (barW + 3);
        const y = chartH - barH + 10;
        ctx.fillStyle = s.color;
        ctx.fillRect(x, y, barW, barH);
      });
    });

    ctx.fillStyle = '#5b6577'; ctx.font = '9px Segoe UI';
    labels.forEach((lab, i) => {
      if (labels.length > 12 && i % Math.ceil(labels.length / 12) !== 0) return;
      const x = padding + i * groupW;
      ctx.fillText(lab.slice(5), x, h - 4);
    });

    // leyenda
    let lx = w - 10;
    series.slice().reverse().forEach(s => {
      const label = s.label;
      ctx.font = '10px Segoe UI';
      const tw = ctx.measureText(label).width;
      lx -= tw;
      ctx.fillStyle = '#8b96a8'; ctx.fillText(label, lx, 12);
      lx -= 14;
      ctx.fillStyle = s.color; ctx.fillRect(lx, 5, 9, 9);
      lx -= 10;
    });
  },

  drawHuntChart(hunts) {
    const byDate = {};
    hunts.forEach(h => { byDate[h.date] = (byDate[h.date] || 0) + (Number(h.rc) || 0); });
    const labels = Object.keys(byDate).sort();
    this.drawBarChart(document.getElementById('st_huntChart'), labels, [
      { label: 'RC obtenidos', data: labels.map(l => byDate[l]), color: '#3b82f6' }
    ]);
  },

  drawMarketChart(ops) {
    const byDate = {};
    ops.forEach(o => {
      const key = o.date;
      byDate[key] = byDate[key] || { buy: 0, sell: 0 };
      if (o.type === 'buy') byDate[key].buy += Number(o.rcQty) || 0;
      else byDate[key].sell += Number(o.rcQty) || 0;
    });
    const labels = Object.keys(byDate).sort();
    this.drawBarChart(document.getElementById('st_marketChart'), labels, [
      { label: 'Comprados', data: labels.map(l => byDate[l].buy), color: '#3b82f6' },
      { label: 'Vendidos', data: labels.map(l => byDate[l].sell), color: '#22c55e' }
    ]);
  },

  afterRender() {
    this.renderContent();
    document.getElementById('st_periodChips').querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.period = chip.dataset.p;
        document.getElementById('st_periodChips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const showCustom = this.period === 'custom';
        document.getElementById('st_from').style.display = showCustom ? 'inline-block' : 'none';
        document.getElementById('st_to').style.display = showCustom ? 'inline-block' : 'none';
        this.renderContent();
      });
    });
    document.getElementById('st_from').addEventListener('change', (e) => { this.customFrom = e.target.value; this.renderContent(); });
    document.getElementById('st_to').addEventListener('change', (e) => { this.customTo = e.target.value; this.renderContent(); });
  }
};
