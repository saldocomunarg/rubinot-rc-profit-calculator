/**
 * investment.js
 * Inversión REAL en RC (USD), completamente separada del Market del juego (Gold).
 * Las proyecciones son escenarios matemáticos configurables, no predicciones.
 */
window.InvestmentModule = {
  state: {
    currentPriceUsd: 0.45,
    monthlyContributionUsd: 0,
    monthlyRcPurchase: 0,
    horizonMonths: 24,
    conservativeAnnualPct: 10,
    baseAnnualPct: 25,
    highAnnualPct: 50
  },

  cfg() { return window.DB.investment || (window.DB.investment = { purchases: [], currentPriceUsd: 0.45, monthlyContributionUsd: 0, monthlyRcPurchase: 0, horizonMonths: 24, conservativeAnnualPct: 10, baseAnnualPct: 25, highAnnualPct: 50 }); },
  loadState() {
    const c = this.cfg();
    this.state = {
      currentPriceUsd: Number(c.currentPriceUsd) || 0.45,
      monthlyContributionUsd: Number(c.monthlyContributionUsd) || 0,
      monthlyRcPurchase: Number(c.monthlyRcPurchase) || 0,
      horizonMonths: Number(c.horizonMonths) || 24,
      conservativeAnnualPct: Number(c.conservativeAnnualPct) || 10,
      baseAnnualPct: Number(c.baseAnnualPct) || 25,
      highAnnualPct: Number(c.highAnnualPct) || 50
    };
  },
  purchases() { return this.cfg().purchases || []; },
  totals() {
    const rows = this.purchases();
    const rc = rows.reduce((a, p) => a + (Number(p.rcQty) || 0), 0);
    const invested = rows.reduce((a, p) => a + (Number(p.totalUsd) || 0), 0);
    const avg = rc > 0 ? invested / rc : 0;
    const current = Number(this.cfg().currentPriceUsd) || 0;
    return { rc, invested, avg, current, value: rc * current, pnl: rc * current - invested, roi: invested > 0 ? ((rc * current - invested) / invested) * 100 : 0 };
  },
  project(annualPct, months, monthlyUsd, monthlyRc) {
    const c = this.cfg();
    const initialRc = this.totals().rc;
    const initialInvested = this.totals().invested;
    let rc = initialRc, invested = initialInvested;
    const rows = [];
    let price = Number(c.currentPriceUsd) || 0.45;
    const monthlyRate = Math.pow(1 + (Number(annualPct) || 0) / 100, 1 / 12) - 1;
    for (let m = 1; m <= (Number(months) || 0); m++) {
      price *= 1 + monthlyRate;
      if (Number(monthlyUsd) > 0 && price > 0) { rc += Number(monthlyUsd) / price; invested += Number(monthlyUsd); }
      if (Number(monthlyRc) > 0) { rc += Number(monthlyRc); invested += Number(monthlyRc) * price; }
      const value = rc * price;
      rows.push({ month: m, price, rc, invested, value, pnl: value - invested, roi: invested > 0 ? ((value - invested) / invested) * 100 : 0 });
    }
    return rows;
  },
  fmtUsd(v) { return '$' + window.Fmt.num(v); },

  render() {
    this.loadState();
    const s = this.state;
    return `
      <h1 class="view-title">📈 Inversión en RC</h1>
      <p class="view-sub">Controlá tu inversión real en USD y proyectá distintos escenarios. Esta sección no usa el Gold del Market.</p>

      <div class="section">
        <h2>💵 Posición real</h2>
        <div class="grid grid-cards" id="inv_summary"></div>
      </div>

      <div class="section">
        <h2>➕ Registrar compra real de RC</h2>
        <p class="view-sub">Una compra acá representa dinero real invertido. No crea una operación del Market y no modifica tu Gold.</p>
        <div class="grid grid-3">
          <div class="field"><label>Fecha</label><input type="date" id="iv_date" value="${window.App.todayStr()}"></div>
          <div class="field"><label>Cantidad de RC</label><input type="number" min="1" step="1" id="iv_rc"></div>
          <div class="field"><label>Precio por 1 RC (USD)</label><input type="number" min="0" step="0.0001" id="iv_price" value="${s.currentPriceUsd}"></div>
          <div class="field"><label>Comisión / gastos (USD)</label><input type="number" min="0" step="0.01" id="iv_fee" value="0"></div>
          <div class="field"><label>Nota</label><input type="text" id="iv_note" placeholder="Ej.: compra para inversión"></div>
        </div>
        <button class="btn" id="iv_save">Registrar inversión</button>
      </div>

      <div class="section">
        <h2>⚙️ Parámetros de proyección</h2>
        <div class="note">Los porcentajes son escenarios hipotéticos. La app no interpreta estos valores como una predicción ni como una rentabilidad garantizada.</div>
        <div class="grid grid-3">
          <div class="field"><label>Precio actual del RC (USD)</label><input type="number" min="0" step="0.0001" id="iv_current" value="${s.currentPriceUsd}"></div>
          <div class="field"><label>Aporte mensual (USD)</label><input type="number" min="0" step="0.01" id="iv_monthlyUsd" value="${s.monthlyContributionUsd}"></div>
          <div class="field"><label>Compra mensual fija (RC)</label><input type="number" min="0" step="1" id="iv_monthlyRc" value="${s.monthlyRcPurchase}"></div>
          <div class="field"><label>Horizonte (meses)</label><input type="number" min="1" step="1" id="iv_months" value="${s.horizonMonths}"></div>
          <div class="field"><label>Escenario conservador (% anual)</label><input type="number" step="0.1" id="iv_cons" value="${s.conservativeAnnualPct}"></div>
          <div class="field"><label>Escenario base (% anual)</label><input type="number" step="0.1" id="iv_base" value="${s.baseAnnualPct}"></div>
          <div class="field"><label>Escenario alto (% anual)</label><input type="number" step="0.1" id="iv_high" value="${s.highAnnualPct}"></div>
        </div>
        <button class="btn" id="iv_project">Actualizar proyección</button>
      </div>

      <div id="iv_projection"></div>

      <div class="section">
        <h2>🧾 Historial de inversión real</h2>
        <div id="iv_history"></div>
      </div>
    `;
  },

  renderSummary() {
    const t = this.totals();
    const card = (title, value, cls='') => `<div class="card"><h3>${title}</h3><div class="value ${cls}">${value}</div></div>`;
    document.getElementById('inv_summary').innerHTML =
      card('RC acumulados', window.Fmt.num(t.rc) + ' RC', 'blue') +
      card('Inversión acumulada', this.fmtUsd(t.invested)) +
      card('Precio promedio', this.fmtUsd(t.avg)) +
      card('Valor actual', this.fmtUsd(t.value)) +
      card('Ganancia / pérdida', this.fmtUsd(t.pnl), t.pnl >= 0 ? 'green' : 'red') +
      card('ROI actual', window.Fmt.num(t.roi) + '%', t.roi >= 0 ? 'green' : 'red');
  },

  renderProjection() {
    const s = this.state;
    const scenarios = [
      ['Conservador', s.conservativeAnnualPct],
      ['Base', s.baseAnnualPct],
      ['Alto', s.highAnnualPct]
    ];
    const rows = scenarios.map(([name, pct]) => {
      const data = this.project(pct, s.horizonMonths, s.monthlyContributionUsd, s.monthlyRcPurchase);
      const last = data[data.length - 1] || { price: this.cfg().currentPriceUsd, rc: this.totals().rc, invested: this.totals().invested, value: this.totals().value, pnl: this.totals().pnl, roi: this.totals().roi };
      return { name, pct, ...last };
    });
    document.getElementById('iv_projection').innerHTML = `
      <div class="section">
        <h2>🔮 Proyección a ${s.horizonMonths} meses</h2>
        <div class="grid grid-cards">
          ${rows.map(r => `<div class="card"><h3>${r.name} · ${window.Fmt.num(r.pct)}% anual</h3><div class="value blue">${this.fmtUsd(r.value)}</div><div class="mini">Precio escenario: ${this.fmtUsd(r.price)} · ${window.Fmt.num(r.rc)} RC</div><div class="mini">Invertido: ${this.fmtUsd(r.invested)} · Resultado: <span class="${r.pnl >= 0 ? 'green' : 'red'}">${this.fmtUsd(r.pnl)}</span> · ROI: ${window.Fmt.num(r.roi)}%</div></div>`).join('')}
        </div>
        <div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>Escenario</th><th>Precio final RC</th><th>RC acumulados</th><th>Total invertido</th><th>Valor final</th><th>Resultado</th><th>ROI</th></tr></thead><tbody>
          ${rows.map(r => `<tr><td>${r.name}</td><td>${this.fmtUsd(r.price)}</td><td>${window.Fmt.num(r.rc)}</td><td>${this.fmtUsd(r.invested)}</td><td>${this.fmtUsd(r.value)}</td><td class="${r.pnl >= 0 ? 'green' : 'red'}">${this.fmtUsd(r.pnl)}</td><td class="${r.roi >= 0 ? 'green' : 'red'}">${window.Fmt.num(r.roi)}%</td></tr>`).join('')}
        </tbody></table></div>
      </div>
    `;
  },

  renderHistory() {
    const rows = this.purchases().slice().sort((a,b) => (b.date || '').localeCompare(a.date || ''));
    if (!rows.length) { document.getElementById('iv_history').innerHTML = '<div class="empty-state">Todavía no registraste compras reales de RC.</div>'; return; }
    document.getElementById('iv_history').innerHTML = `<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>RC</th><th>USD/RC</th><th>Inversión</th><th>Nota</th></tr></thead><tbody>${rows.map(p => `<tr><td>${p.date || ''}</td><td>${window.Fmt.num(p.rcQty)}</td><td>${this.fmtUsd(p.priceUsd)}</td><td>${this.fmtUsd(p.totalUsd)}</td><td>${p.note || ''}</td></tr>`).join('')}</tbody></table></div>`;
  },

  readState() {
    const c = this.cfg();
    c.currentPriceUsd = Number(document.getElementById('iv_current').value) || 0;
    c.monthlyContributionUsd = Number(document.getElementById('iv_monthlyUsd').value) || 0;
    c.monthlyRcPurchase = Number(document.getElementById('iv_monthlyRc').value) || 0;
    c.horizonMonths = Math.max(1, Number(document.getElementById('iv_months').value) || 1);
    c.conservativeAnnualPct = Number(document.getElementById('iv_cons').value) || 0;
    c.baseAnnualPct = Number(document.getElementById('iv_base').value) || 0;
    c.highAnnualPct = Number(document.getElementById('iv_high').value) || 0;
    this.loadState();
  },

  afterRender() {
    this.renderSummary(); this.renderProjection(); this.renderHistory();
    document.getElementById('iv_save').addEventListener('click', async () => {
      const rcQty = Number(document.getElementById('iv_rc').value), price = Number(document.getElementById('iv_price').value), fee = Number(document.getElementById('iv_fee').value) || 0;
      if (rcQty <= 0 || price <= 0) { alert('Ingresá una cantidad de RC y un precio por RC válidos.'); return; }
      this.cfg().purchases.push({ id: window.Storage.uid(), date: document.getElementById('iv_date').value, rcQty, priceUsd: price, feeUsd: fee, totalUsd: rcQty * price + fee, note: document.getElementById('iv_note').value });
      this.cfg().currentPriceUsd = price;
      await window.Storage.save(); window.App.render();
    });
    document.getElementById('iv_project').addEventListener('click', async () => { this.readState(); await window.Storage.save(); this.renderSummary(); this.renderProjection(); });
  }
};
