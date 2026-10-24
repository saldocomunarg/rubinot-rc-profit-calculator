/**
 * cash.js
 * Módulo 5: Cierre de Caja e Inventario Diario.
 */

window.CashModule = {

  selectedDate: new Date().toISOString().slice(0, 10),

  dayData(date) {
    const hunts = window.DB.hunts.filter(h => h.date === date);
    const buys = window.DB.market.filter(o => o.date === date && o.type === 'buy');
    const sells = window.DB.market.filter(o => o.date === date && o.type === 'sell');
    const ledger = window.DB.ledger.filter(l => l.date === date);

    const huntRc = hunts.reduce((a, h) => a + (Number(h.rc) || 0), 0);
    const huntGoldSpent = hunts.reduce((a, h) => a + (Number(h.goldSpent) || 0), 0);
    const huntOtherIncome = hunts.reduce((a, h) => a + (Number(h.otherIncome) || 0), 0);
    const huntOtherExpense = hunts.reduce((a, h) => a + (Number(h.otherExpense) || 0), 0);
    const huntEstValue = hunts.reduce((a, h) => a + (Number(h.rc) || 0) * (Number(h.estimatedValuePerRc) || 0), 0);

    const rcBought = buys.reduce((a, b) => a + (Number(b.rcQty) || 0), 0);
    const goldUsedBuy = buys.reduce((a, b) => a + (Number(window.MarketModule.computeBuy(b).goldUsed) || 0), 0);
    const rcSold = sells.reduce((a, s) => a + (Number(s.rcQty) || 0), 0);
    const sellCalc = sells.map(s => window.MarketModule.computeSell(s));
    const goldReceived = sellCalc.reduce((a, c) => a + c.goldNeto, 0);
    const commissionsTotal = sellCalc.reduce((a, c) => a + c.commissionGold, 0);
    const marketPnl = goldReceived - (rcSold > 0 ? window.MarketModule.avgBuyCost() * rcSold : 0);

    const expenses = ledger.filter(l => l.type === 'expense').reduce((a, l) => a + Number(l.amount), 0);
    const incomes = ledger.filter(l => l.type === 'income').reduce((a, l) => a + Number(l.amount), 0);

    return {
      hunts, buys, sells,
      huntRc, huntGoldSpent, huntOtherIncome, huntOtherExpense, huntEstValue,
      rcBought, goldUsedBuy, rcSold, goldReceived, commissionsTotal, marketPnl,
      expenses, incomes
    };
  },

  inventorySnapshot(date, d) {
    // Inventario acumulado ANTES del día seleccionado
    const priorMoves = window.DB.inventoryMoves.filter(m => m.date < date);
    const sum = (type) => priorMoves.filter(m => m.type === type).reduce((a, m) => a + (Number(m.qty) || 0), 0);
    const initial = sum('HUNT_RC_IN') + sum('MARKET_BUY_RC') - sum('MARKET_SELL_RC') - sum('RC_USE');

    const todayMoves = window.DB.inventoryMoves.filter(m => m.date === date);
    const usedToday = todayMoves.filter(m => m.type === 'RC_USE').reduce((a, m) => a + (Number(m.qty)||0), 0);

    const expected = initial + d.huntRc + d.rcBought - d.rcSold - usedToday;
    return { initial, expected, usedToday };
  },

  goldCashSnapshot(date, d) {
    const closures = window.DB.cashClosures.filter(c => c.date < date).sort((a,b) => a.date.localeCompare(b.date));
    const initialGold = closures.length ? Number(closures[closures.length - 1].goldReal) : (Number(window.DB.capitalConfig.totalGold) || 0);
    const expected = initialGold - d.goldUsedBuy + d.goldReceived - (d.huntGoldSpent) + 0;
    return { initialGold, expected };
  },

  saveClosure(payload) {
    const idx = window.DB.cashClosures.findIndex(c => c.date === payload.date);
    if (idx >= 0) window.DB.cashClosures[idx] = payload; else window.DB.cashClosures.push(payload);
    window.Storage.save();
  },

  render() {
    return `
      <h1 class="view-title">Cierre de Caja e Inventario Diario</h1>
      <p class="view-sub">Seleccioná una fecha para ver todo lo ocurrido ese día y registrar el cierre.</p>
      <div class="section">
        <div class="toolbar">
          <label style="margin:0;">Fecha:</label>
          <input type="date" id="cash_date" value="${this.selectedDate}">
        </div>
        <div id="cash_content"></div>
      </div>
    `;
  },

  renderContent() {
    const date = this.selectedDate;
    const d = this.dayData(date);
    const inv = this.inventorySnapshot(date, d);
    const gold = this.goldCashSnapshot(date, d);
    const existing = window.DB.cashClosures.find(c => c.date === date) || {};

    document.getElementById('cash_content').innerHTML = `
      <h4>Hunts del día</h4>
      <div class="grid grid-cards">
        <div class="card"><h3>Cantidad de hunts</h3><div class="value">${d.hunts.length}</div></div>
        <div class="card"><h3>RC obtenidos</h3><div class="value">${window.Fmt.num(d.huntRc)}</div></div>
        <div class="card"><h3>Gold gastado</h3><div class="value">${window.Fmt.num(d.huntGoldSpent)}</div></div>
        <div class="card"><h3>Otros ingresos</h3><div class="value">${window.Fmt.num(d.huntOtherIncome)}</div></div>
        <div class="card"><h3>Otros gastos</h3><div class="value">${window.Fmt.num(d.huntOtherExpense)}</div></div>
        <div class="card"><h3>Valor estimado RC</h3><div class="value">${window.Fmt.num(d.huntEstValue)}</div></div>
      </div>

      <h4>Mercado del día</h4>
      <div class="grid grid-cards">
        <div class="card"><h3>RC comprados</h3><div class="value">${window.Fmt.num(d.rcBought)}</div></div>
        <div class="card"><h3>Gold utilizado</h3><div class="value">${window.Fmt.num(d.goldUsedBuy)}</div></div>
        <div class="card"><h3>RC vendidos</h3><div class="value">${window.Fmt.num(d.rcSold)}</div></div>
        <div class="card"><h3>Gold recibido</h3><div class="value">${window.Fmt.num(d.goldReceived)}</div></div>
        <div class="card"><h3>Comisiones</h3><div class="value red">${window.Fmt.num(d.commissionsTotal)}</div></div>
        <div class="card"><h3>Ganancia/Pérdida mercado</h3><div class="value ${d.marketPnl>=0?'green':'red'}">${window.Fmt.num(d.marketPnl)}</div></div>
      </div>

      <h4>Inventario</h4>
      <div class="grid grid-cards">
        <div class="card"><h3>Inventario inicial</h3><div class="value">${window.Fmt.num(inv.initial)}</div></div>
        <div class="card"><h3>Usados hoy</h3><div class="value">${window.Fmt.num(inv.usedToday)}</div></div>
        <div class="card"><h3>Inventario final esperado</h3><div class="value blue">${window.Fmt.num(inv.expected)}</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:10px;">
        <div class="field"><label>Inventario real al cierre</label><input type="number" id="cash_invReal" value="${existing.inventoryReal ?? ''}"></div>
        <div class="card"><h3>Diferencia / discrepancia</h3><div class="value" id="cash_invDiff">—</div></div>
      </div>

      <h4>Caja de gold</h4>
      <div class="grid grid-cards">
        <div class="card"><h3>Gold inicial</h3><div class="value">${window.Fmt.num(gold.initialGold)}</div></div>
        <div class="card"><h3>Gold final esperado</h3><div class="value blue">${window.Fmt.num(gold.expected)}</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:10px;">
        <div class="field"><label>Gold real al cierre</label><input type="number" id="cash_goldReal" value="${existing.goldReal ?? ''}"></div>
        <div class="card"><h3>Diferencia (esperado vs real)</h3><div class="value" id="cash_goldDiff">—</div></div>
      </div>

      <button class="btn" id="cash_save" style="margin-top:16px;">Guardar cierre del día</button>
    `;

    const invRealInput = document.getElementById('cash_invReal');
    const goldRealInput = document.getElementById('cash_goldReal');
    const updateDiffs = () => {
      const invReal = invRealInput.value === '' ? null : Number(invRealInput.value);
      const goldReal = goldRealInput.value === '' ? null : Number(goldRealInput.value);
      document.getElementById('cash_invDiff').textContent = invReal === null ? '—' : window.Fmt.num(invReal - inv.expected);
      document.getElementById('cash_goldDiff').textContent = goldReal === null ? '—' : window.Fmt.num(goldReal - gold.expected);
    };
    invRealInput.addEventListener('input', updateDiffs);
    goldRealInput.addEventListener('input', updateDiffs);
    updateDiffs();

    document.getElementById('cash_save').addEventListener('click', () => {
      this.saveClosure({
        date, inventoryExpected: inv.expected, inventoryReal: invRealInput.value === '' ? null : Number(invRealInput.value),
        goldExpected: gold.expected, goldReal: goldRealInput.value === '' ? null : Number(goldRealInput.value),
        marketPnl: d.marketPnl, huntEstValue: d.huntEstValue
      });
      alert('Cierre guardado para ' + date);
    });
  },

  afterRender() {
    this.renderContent();
    document.getElementById('cash_date').addEventListener('change', (e) => {
      this.selectedDate = e.target.value;
      this.renderContent();
    });
  }
};
