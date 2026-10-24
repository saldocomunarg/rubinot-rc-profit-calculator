/**
 * app.js
 * Router principal de la SPA, Dashboard, modales de carga rápida y
 * utilidades de formato compartidas por todos los módulos.
 */

window.Fmt = {
  num(v) {
    v = Number(v);
    if (!isFinite(v)) return '0';
    const format = (window.DB && window.DB.config && window.DB.config.numberFormat) || 'es-AR';
    const locale = format === 'en-US' ? 'en-US' : 'es-AR';
    return v.toLocaleString(locale, { maximumFractionDigits: 2 });
  }
};

window.DashboardModule = {
  render() {
    const cfg = window.DB.capitalConfig || {};
    const inv = window.InventoryModule.summary();
    const buys = window.DB.market.filter(o => o.type === 'buy');
    const sells = window.DB.market.filter(o => o.type === 'sell');
    const goldBought = buys.reduce((a, b) => a + window.MarketModule.computeBuy(b).goldUsed, 0);
    const goldSoldNet = sells.reduce((a, s) => a + window.MarketModule.computeSell(s).goldNeto, 0);
    const avgCost = window.MarketModule.avgBuyCost();
    const rcSold = sells.reduce((a, s) => a + (Number(s.rcQty) || 0), 0);
    const marketProfit = goldSoldNet - avgCost * rcSold;
    const reserveGold = Number(cfg.totalGold || 0) * Number(cfg.liquidityReservePct || 0) / 100;
    const reserveUsd = Number(cfg.totalUsd || 0) * Number(cfg.liquidityReservePct || 0) / 100;
    const invested = window.CapitalModule.investedNow();
    const operativeGold = Math.max(0, Number(cfg.totalGold || 0) - reserveGold);
    const operativeUsd = Math.max(0, Number(cfg.totalUsd || 0) - reserveUsd);
    const availableGold = Math.max(0, operativeGold - invested.goldInvested);
    const availableUsd = Math.max(0, operativeUsd - invested.usdInvested);
    const actualGold = Math.max(0, Number(cfg.totalGold || 0) - invested.goldInvested);
    const actualUsd = Math.max(0, Number(cfg.totalUsd || 0) - invested.usdInvested);
    const roiAvg = goldBought > 0 ? (marketProfit / goldBought) * 100 : 0;
    const extraRc = window.DB.hunts.reduce((a, h) => a + (Number(h.rc) || 0), 0);

    const moneyCard = (title, value, cls='') => `<div class="card"><h3>${title}</h3><div class="value ${cls}">$${window.Fmt.num(value)}</div></div>`;
    const goldCard = (title, value, cls='') => `<div class="card"><h3>${title}</h3><div class="value ${cls}"><span class="gold-value">${window.Fmt.num(value)}<span class="gold-coin" title="Gold">G</span></span></div></div>`;

    return `
      <h1 class="view-title">Dashboard</h1>
      <p class="view-sub">Resumen simple de tu capital, RC y movimientos.</p>

      <div class="section dashboard-money-section">
        <h2>💵 USD</h2>
        <div class="grid grid-cards">
          ${moneyCard('Capital actual', actualUsd, 'blue')}
          ${moneyCard('Capital invertido', invested.usdInvested)}
          ${moneyCard('Capital disponible', availableUsd, 'green')}
          ${moneyCard('Reserva', reserveUsd)}
        </div>
      </div>

      <div class="section dashboard-money-section">
        <h2>🪙 GOLD</h2>
        <div class="grid grid-cards">
          ${goldCard('Capital actual', actualGold, 'blue')}
          ${goldCard('Capital invertido', invested.goldInvested)}
          ${goldCard('Capital disponible', availableGold, 'green')}
          ${goldCard('Reserva', reserveGold)}
        </div>
      </div>

      <div class="grid grid-cards">
        <div class="card"><h3>RC disponibles</h3><div class="value blue">${window.Fmt.num(inv.available)} RC</div></div>
        <div class="card"><h3>RC comprados</h3><div class="value">${window.Fmt.num(inv.bought)} RC</div></div>
        <div class="card"><h3>RC vendidos</h3><div class="value">${window.Fmt.num(inv.sold)} RC</div></div>
        <div class="card"><h3>RC obtenidos como extra</h3><div class="value">${window.Fmt.num(extraRc)} RC</div></div>
      </div>

      <div class="section" style="margin-top:16px;">
        <h2>💵 Inversión real en RC</h2>
        <div class="grid grid-cards">
          <div class="card"><h3>RC acumulados</h3><div class="value blue">${window.Fmt.num(window.InvestmentModule.totals().rc)} RC</div></div>
          <div class="card"><h3>Invertido en USD</h3><div class="value">$${window.Fmt.num(window.InvestmentModule.totals().invested)}</div></div>
          <div class="card"><h3>Valor actual</h3><div class="value">$${window.Fmt.num(window.InvestmentModule.totals().value)}</div></div>
          <div class="card"><h3>Resultado / ROI</h3><div class="value ${window.InvestmentModule.totals().pnl >= 0 ? 'green' : 'red'}">$${window.Fmt.num(window.InvestmentModule.totals().pnl)} · ${window.Fmt.num(window.InvestmentModule.totals().roi)}%</div></div>
        </div>
      </div>

      <div class="section" style="margin-top:16px;">
        <h2>Resultado del mercado</h2>
        <div class="grid grid-2">
          ${goldCard('Ganancia / Pérdida', marketProfit, marketProfit >= 0 ? 'green' : 'red')}
          <div class="card"><h3>ROI promedio</h3><div class="value ${roiAvg >= 0 ? 'green' : 'red'}">${window.Fmt.num(roiAvg)}%</div></div>
        </div>
      </div>
    `;
  },
  afterRender() {}
};

window.App = {
  currentView: 'dashboard',

  modules: {
    dashboard: window.DashboardModule,
    calculator: window.CalculatorModule,
    market: window.MarketModule,
    hunts: window.HuntsModule,
    inventory: window.InventoryModule,
    cash: window.CashModule,
    capital: window.CapitalModule,
    investment: window.InvestmentModule,
    reinvestment: window.ReinvestmentModule,
    statistics: window.StatisticsModule,
    history: window.HistoryModule,
    settings: window.SettingsModule
  },

  render() {
    const mod = this.modules[this.currentView];
    document.getElementById('view-root').innerHTML = mod.render();
    if (mod.afterRender) mod.afterRender();

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === this.currentView);
    });
  },

  navigate(view) {
    this.currentView = view;
    this.render();
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modalBox').innerHTML = '';
  },

  openModal(html) {
    document.getElementById('modalBox').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('open');
  },

  todayStr() { const d = new Date(); const p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; },
  nowStr() { return new Date().toTimeString().slice(0, 5); },

  openOperationModal(type) {
    const title = type === 'buy' ? 'Registrar compra' : 'Registrar venta';
    const cfg = window.DB.config;
    const extraFields = type === 'buy'
      ? `
        <div class="field"><label>Gold utilizado (dejar vacío para calcular automático)</label><input type="number" id="op_goldUsed"></div>
        <div class="field"><label>USD utilizado (opcional)</label><input type="number" step="0.01" id="op_usdUsed"></div>
        <div class="field"><label>Vendedor / notas</label><input type="text" id="op_seller"></div>
      `
      : `
        <div class="field"><label>Gold bruto (dejar vacío para calcular automático)</label><input type="number" id="op_goldBruto"></div>
        <div class="field"><label>Comisión del mercado (%)</label><input type="number" step="0.01" id="op_commissionPct" value="${cfg.defaultCommission}"></div>
        <div class="field"><label>Notas</label><input type="text" id="op_notes"></div>
      `;

    this.openModal(`
      <h3>${title}</h3>
      <div class="field"><label>Fecha</label><input type="date" id="op_date" value="${this.todayStr()}"></div>
      <div class="field"><label>Hora</label><input type="time" id="op_time" value="${this.nowStr()}"></div>
      <div class="field"><label>Cantidad de RC (mínimo 25, múltiplos de 25)</label><input type="number" min="25" step="25" id="op_rcQty"></div>
      <div class="field"><label>Base de operación</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
      <div class="field"><label>Precio por 1 RC (gold)</label><input type="number" id="op_pricePerPackage"></div>
      ${extraFields}
      <div class="modal-actions">
        <button class="btn secondary" id="op_cancel">Cancelar</button>
        <button class="btn" id="op_save">Guardar</button>
      </div>
    `);

    document.getElementById('op_cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('op_save').addEventListener('click', () => {
      const rcQty = Number(document.getElementById('op_rcQty').value);
      if (!rcQty || rcQty < 25 || rcQty % 25 !== 0) { alert('La cantidad de RC debe ser de al menos 25 y en múltiplos de 25.'); return; }
      const base = {
        type, date: document.getElementById('op_date').value, time: document.getElementById('op_time').value,
        rcQty, rcPerPackage: 25,
        pricePerPackage: Number(document.getElementById('op_pricePerPackage').value) || 0
      };
      if (type === 'buy') {
        base.goldUsed = document.getElementById('op_goldUsed').value;
        base.usdUsed = document.getElementById('op_usdUsed').value;
        base.seller = document.getElementById('op_seller').value;
        base.notes = base.seller;
        if (base.goldUsed === '') base.goldUsed = window.MarketModule.computeBuy(base).goldUsed;
        else base.goldUsed = Number(base.goldUsed);
      } else {
        base.goldBruto = document.getElementById('op_goldBruto').value;
        base.commissionPct = Number(document.getElementById('op_commissionPct').value) || 0;
        base.notes = document.getElementById('op_notes').value;
        if (base.goldBruto === '') base.goldBruto = base.rcQty * base.pricePerPackage;
        else base.goldBruto = Number(base.goldBruto);
      }
      window.MarketModule.addOperation(base);
      this.closeModal();
      this.render();
    });
  },

  openExtraModal() {
    this.openModal(`
      <h3>Registrar extra</h3>
      <p class="view-sub">RC obtenidos jugando o farmeando. No modifica tu capital ni tu dinero.</p>
      <div class="field"><label>Fecha</label><input type="date" id="ex_date" value="${this.todayStr()}"></div>
      <div class="field"><label>Cantidad de RC (múltiplos de 25)</label><input type="number" min="25" step="25" id="ex_rc"></div>
      <div class="field"><label>Nota</label><input type="text" id="ex_notes" placeholder="Ej.: farmeo, recompensa, evento..."></div>
      <div class="modal-actions">
        <button class="btn secondary" id="ex_cancel">Cancelar</button>
        <button class="btn" id="ex_save">Guardar</button>
      </div>
    `);
    document.getElementById('ex_cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('ex_save').addEventListener('click', () => {
      const rc = Number(document.getElementById('ex_rc').value);
      if (!rc || rc < 25 || rc % 25 !== 0) { alert('La cantidad de RC debe ser de al menos 25 y en múltiplos de 25.'); return; }
      window.HuntsModule.addHunt({
        date: document.getElementById('ex_date').value,
        rc, notes: document.getElementById('ex_notes').value
      });
      this.closeModal();
      this.render();
    });
  },

  openLedgerModal(type) {
    const title = type === 'expense' ? 'Registrar gasto' : 'Registrar ingreso';
    this.openModal(`
      <h3>${title}</h3>
      <div class="field"><label>Fecha</label><input type="date" id="lg_date" value="${this.todayStr()}"></div>
      <div class="field"><label>Monto</label><input type="number" step="0.01" id="lg_amount"></div>
      <div class="field"><label>Moneda</label>
        <select id="lg_currency">
          <option value="gold">Gold</option>
          <option value="USD">USD</option>
        </select>
      </div>
      <div class="field"><label>Notas</label><input type="text" id="lg_notes"></div>
      <div class="modal-actions">
        <button class="btn secondary" id="lg_cancel">Cancelar</button>
        <button class="btn" id="lg_save">Guardar</button>
      </div>
    `);
    document.getElementById('lg_cancel').addEventListener('click', () => this.closeModal());
    document.getElementById('lg_save').addEventListener('click', () => {
      const amount = Number(document.getElementById('lg_amount').value);
      if (!amount || amount <= 0) { alert('Ingresá un monto válido.'); return; }
      window.DB.ledger.push({
        id: window.Storage.uid(), type, amount,
        currency: document.getElementById('lg_currency').value,
        date: document.getElementById('lg_date').value,
        notes: document.getElementById('lg_notes').value
      });
      window.Storage.save();
      this.closeModal();
      this.render();
    });
  }
};

// Al entrar a un campo numérico, seleccionamos su valor para poder reemplazarlo escribiendo directamente.
document.addEventListener('focusin', (e) => {
  if (e.target && e.target.matches('input[type=number]')) {
    setTimeout(() => { try { e.target.select(); } catch (_) {} }, 0);
  }
});

// ---- inicialización ----
document.addEventListener('DOMContentLoaded', async () => {
  await window.Storage.load();

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => window.App.navigate(btn.dataset.view));
  });

  const menuToggle = document.getElementById('menuToggle');
  const actionMenu = document.getElementById('actionMenu');
  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    actionMenu.classList.toggle('open');
  });
  document.getElementById('menuBuy').addEventListener('click', () => { actionMenu.classList.remove('open'); window.App.openOperationModal('buy'); });
  document.getElementById('menuSell').addEventListener('click', () => { actionMenu.classList.remove('open'); window.App.openOperationModal('sell'); });
  document.getElementById('menuExtra').addEventListener('click', () => { actionMenu.classList.remove('open'); window.App.openExtraModal(); });
  document.addEventListener('click', (e) => {
    if (!actionMenu.contains(e.target) && e.target !== menuToggle) actionMenu.classList.remove('open');
  });

  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'modalOverlay') window.App.closeModal();
  });

  window.App.render();
});
