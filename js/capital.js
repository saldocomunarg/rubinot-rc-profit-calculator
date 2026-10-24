/**
 * capital.js
 * Módulo 7: Planificador de Capital y Liquidez.
 * Todo es una simulación matemática basada exclusivamente en los datos
 * ingresados por el usuario. No hay valores "correctos" universales:
 * la reserva, la liquidez y el capital operativo son parámetros que
 * cada usuario configura según su propio criterio.
 */

window.CapitalModule = {

  opCounts: [1, 2, 5, 10, 20, 50],
  customOpCount: 10,

  cfg() { return window.DB.capitalConfig; },

  // ---- cálculos base ----
  operationCostGold(cfg) {
    const rcPerPackage = Number(cfg.rcPerPackage) || 25;
    const pricePerRc = Number(cfg.buyPricePerPackage) || 0;
    return pricePerRc * rcPerPackage; // costo en gold de comprar 1 lote de RC (por defecto 25)
  },
  operationCostUsd(cfg) { return Number(window.DB.config.rcBuyUsdPerPackage ?? cfg.costUsdPerPackage) || 0; },

  reserveGold(cfg) { return (Number(cfg.totalGold) || 0) * (Number(cfg.liquidityReservePct) || 0) / 100; },
  reserveUsd(cfg) { return (Number(cfg.totalUsd) || 0) * (Number(cfg.liquidityReservePct) || 0) / 100; },

  operativeGold(cfg) { return (Number(cfg.totalGold) || 0) - this.reserveGold(cfg); },
  operativeUsd(cfg) { return (Number(cfg.totalUsd) || 0) - this.reserveUsd(cfg); },

  // capital actualmente invertido = posición neta en compras de mercado no vendidas (gold y USD)
  investedNow() {
    const buys = window.DB.market.filter(o => o.type === 'buy');
    const sells = window.DB.market.filter(o => o.type === 'sell');
    const goldIn = buys.reduce((a, b) => a + (Number(window.MarketModule.computeBuy(b).goldUsed) || 0), 0);
    const usdIn = 0; // Las compras del Market usan únicamente Gold; la inversión real en USD se registra en Inversión RC.
    const goldOut = sells.reduce((a, s) => a + (Number(window.MarketModule.computeSell(s).goldNeto) || 0), 0);
    return { goldInvested: Math.max(0, goldIn - goldOut), usdInvested: Math.max(0, usdIn) };
  },

  packagesFor(gold, cfg) {
    const cost = this.operationCostGold(cfg);
    return cost > 0 ? Math.floor(gold / cost) : 0;
  },

  rcFor(gold, cfg) {
    return this.packagesFor(gold, cfg) * (Number(cfg.rcPerPackage) || 0);
  },

  profitPerOperationGold(cfg) {
    const packages = 1;
    const grossSale = packages * (Number(cfg.sellPricePerPackage) || 0) * (Number(cfg.rcPerPackage) || 25);
    const commission = grossSale * (Number(cfg.commissionPct) || 0) / 100;
    const netSale = grossSale - commission;
    return netSale - this.operationCostGold(cfg);
  },

  roiPerOperation(cfg) {
    const cost = this.operationCostGold(cfg);
    return cost > 0 ? (this.profitPerOperationGold(cfg) / cost) * 100 : 0;
  },

  // ---- render principal ----
  render() {
    const cfg = this.cfg();
    return `
      <h1 class="view-title">Planificador de Capital y Liquidez</h1>
      <p class="view-sub">Cuánto capital necesitás para operar, cuánto tenés invertido, cuánto está líquido y cuánto reservado. Todos los valores son configurables por vos — no hay un nivel "correcto" universal.</p>

      <div class="section">
        <h2>Datos de capital y mercado</h2>
        <div class="grid grid-3">
          <div class="field"><label>Capital inicial ($ USD)</label><input type="number" step="0.01" id="cap_totalUsd" value="${cfg.totalUsd}"></div>
          <div class="field"><label>Capital total (Gold)</label><input type="number" id="cap_totalGold" value="${cfg.totalGold}"></div>
          <div class="field"><label>Compra — 25 RC (USD)</label><input type="text" id="cap_costUsdPerPackage" value="$${window.Fmt.num(window.DB.config.rcBuyUsdPerPackage ?? 0.45)}" disabled></div>
          <div class="field"><label>Compra por 1 RC (Gold)</label><input type="number" id="cap_buyPrice" value="${cfg.buyPricePerPackage}"></div>
          <div class="field"><label>Venta por 1 RC (Gold)</label><input type="number" id="cap_sellPrice" value="${cfg.sellPricePerPackage}"></div>
          <div class="field"><label>Base fija (RC)</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
          <div class="field"><label>Comisión (%)</label><input type="number" step="0.01" id="cap_commission" value="${cfg.commissionPct}"></div>
          <div class="field"><label>Operaciones simultáneas</label><input type="number" id="cap_simOps" value="${cfg.simultaneousOps}"></div>
          <div class="field">
            <label>Reserva (%)</label>
            <div class="chip-row" id="cap_reserveChips">
              ${[10, 20, 30, 50].map(p => `<span class="chip ${Number(cfg.liquidityReservePct) === p ? 'active' : ''}" data-pct="${p}">${p}%</span>`).join('')}
            </div>
            <input type="number" id="cap_reservePct" value="${cfg.liquidityReservePct}" style="margin-top:6px;">
          </div>
          <div class="field"><label>Reinversión (%)</label><input type="number" id="cap_reinvestPct" value="${cfg.reinvestPct}"></div>
        </div>
      </div>

      <div id="cap_summary"></div>
      <div id="cap_liquidityBar"></div>
      <div id="cap_levels"></div>
      <div id="cap_opsTable"></div>
      <div id="cap_customCalc"></div>
      <div id="cap_purchasePower"></div>
      <div id="cap_simulation"></div>
    `;
  },

  renderSummary() {
    const cfg = this.cfg();
    const reserveG = this.reserveGold(cfg), reserveU = this.reserveUsd(cfg);
    const opG = this.operativeGold(cfg), opU = this.operativeUsd(cfg);
    const inv = this.investedNow();
    const liquidG = Math.max(0, opG - inv.goldInvested);
    const liquidU = Math.max(0, opU - inv.usdInvested);
    const profitOp = this.profitPerOperationGold(cfg);
    const roi = this.roiPerOperation(cfg);
    const reinvestGold = profitOp * (Number(cfg.simultaneousOps) || 0) * (Number(cfg.reinvestPct) || 0) / 100;

    document.getElementById('cap_summary').innerHTML = `
      <div class="section">
        <h2>Resumen de capital</h2>
        <div class="capital-summary-columns">
          <div class="capital-summary-group">
            <h3 class="capital-summary-title">USD</h3>
            <div class="grid grid-cards">
              <div class="card"><h3>Capital operativo</h3><div class="value blue">$${window.Fmt.num(opU)}</div></div>
              <div class="card"><h3>Reserva</h3><div class="value">$${window.Fmt.num(reserveU)}</div></div>
              <div class="card"><h3>Capital invertido</h3><div class="value">$${window.Fmt.num(inv.usdInvested)}</div></div>
              <div class="card"><h3>Capital líquido</h3><div class="value green">$${window.Fmt.num(liquidU)}</div></div>
            </div>
          </div>
          <div class="capital-summary-group">
            <h3 class="capital-summary-title">GOLD</h3>
            <div class="grid grid-cards">
              <div class="card"><h3>Capital operativo</h3><div class="value blue">${window.Fmt.num(opG)}</div></div>
              <div class="card"><h3>Reserva</h3><div class="value">${window.Fmt.num(reserveG)}</div></div>
              <div class="card"><h3>Capital invertido</h3><div class="value">${window.Fmt.num(inv.goldInvested)}</div></div>
              <div class="card"><h3>Capital líquido</h3><div class="value green">${window.Fmt.num(liquidG)}</div></div>
              <div class="card"><h3>Ganancia por operación</h3><div class="value ${profitOp>=0?'green':'red'}">${window.Fmt.num(profitOp)} gold <span class="sub">(${window.Fmt.num(roi)}% ROI)</span></div></div>
              <div class="card"><h3>Ganancia reinvertible</h3><div class="value blue">${window.Fmt.num(reinvestGold)} gold</div></div>
            </div>
          </div>
        </div>
      </div>
    `;
    return { reserveG, reserveU, opG, opU, inv, liquidG, liquidU };
  },

  renderLiquidityBar(data) {
    const cfg = this.cfg();
    const total = Number(cfg.totalGold) || 0;
    const invested = Math.min(data.inv.goldInvested, total);
    const reserve = Math.min(data.reserveG, total - invested < 0 ? 0 : data.reserveG);
    const liquid = Math.max(0, total - invested - reserve);
    const pct = (v) => total > 0 ? (v / total * 100) : 0;

    document.getElementById('cap_liquidityBar').innerHTML = `
      <div class="section">
        <h2>Indicador de liquidez (base: gold)</h2>
        <div class="bar-outer">
          <div class="bar-seg" style="width:${pct(invested)}%; background:#3b82f6;">${invested>0?pct(invested).toFixed(0)+'%':''}</div>
          <div class="bar-seg" style="width:${pct(liquid)}%; background:#22c55e;">${liquid>0?pct(liquid).toFixed(0)+'%':''}</div>
          <div class="bar-seg" style="width:${pct(reserve)}%; background:#eab308; color:#1a1400;">${reserve>0?pct(reserve).toFixed(0)+'%':''}</div>
        </div>
        <div class="bar-legend">
          <span><span class="legend-dot" style="background:#3b82f6;"></span>Invertido: ${window.Fmt.num(invested)} gold</span>
          <span><span class="legend-dot" style="background:#22c55e;"></span>Líquido: ${window.Fmt.num(liquid)} gold</span>
          <span><span class="legend-dot" style="background:#eab308;"></span>Reserva: ${window.Fmt.num(reserve)} gold</span>
          <span><strong>Total: ${window.Fmt.num(total)} gold</strong></span>
        </div>
      </div>
    `;
  },

  renderLevels() {
    document.getElementById('cap_levels').innerHTML = `
      <div class="section">
        <h2>Niveles informativos</h2>
        <div class="grid grid-3">
          <div class="card">
            <h3>Capital operativo</h3>
            <div class="sub" style="font-size:12.5px; color: var(--white); margin-top:6px;">Dinero destinado a realizar operaciones de compra/venta de RC. Vos definís cuánto de tu capital total entra en esta categoría.</div>
          </div>
          <div class="card">
            <h3>Liquidez</h3>
            <div class="sub" style="font-size:12.5px; color: var(--white); margin-top:6px;">Dinero disponible para aprovechar nuevas oportunidades sin tocar la reserva. Surge de lo operativo no invertido todavía.</div>
          </div>
          <div class="card">
            <h3>Reserva</h3>
            <div class="sub" style="font-size:12.5px; color: var(--white); margin-top:6px;">Dinero que decidiste no utilizar en operaciones. Ningún nivel es "correcto": son parámetros que configurás vos.</div>
          </div>
        </div>
      </div>
    `;
  },

  renderOpsTable() {
    const cfg = this.cfg();
    const costGold = this.operationCostGold(cfg);
    const costUsd = this.operationCostUsd(cfg);
    const opG = this.operativeGold(cfg), opU = this.operativeUsd(cfg);

    const rows = this.opCounts.map(n => {
      const neededGold = costGold * n;
      const neededUsd = costUsd * n;
      const neededPackagesRc = n * (Number(cfg.rcPerPackage) || 0);
      const canGold = opG >= neededGold;
      const canUsd = opU >= neededUsd;
      return `<tr>
        <td>${n}</td>
        <td>${window.Fmt.num(neededGold)} gold</td>
        <td>${costUsd > 0 ? '$' + window.Fmt.num(neededUsd) : '—'}</td>
        <td>${window.Fmt.num(neededPackagesRc)} RC</td>
        <td>${canGold ? '<span class="badge sell">Sí</span>' : '<span class="badge expense">No</span>'}</td>
        <td>${costUsd > 0 ? (canUsd ? '<span class="badge sell">Sí</span>' : '<span class="badge expense">No</span>') : '—'}</td>
      </tr>`;
    }).join('');

    document.getElementById('cap_opsTable').innerHTML = `
      <div class="section">
        <h2>Capital necesario según cantidad de operaciones</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Operaciones</th><th>Gold requerido</th><th>USD requerido</th><th>RC totales</th><th>¿Alcanza en gold?</th><th>¿Alcanza en USD?</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderCustomCalc() {
    const cfg = this.cfg();
    const n = this.customOpCount;
    const neededGold = this.operationCostGold(cfg) * n;
    const neededUsd = this.operationCostUsd(cfg) * n;

    document.getElementById('cap_customCalc').innerHTML = `
      <div class="section">
        <h2>Calculadora de capital mínimo</h2>
        <p class="view-sub" style="margin-bottom:10px;">¿Cuánto dinero necesito para realizar X operaciones?</p>
        <div class="grid grid-3">
          <div class="field"><label>N.º de operaciones</label><input type="number" id="cap_customN" value="${n}"></div>
          <div class="card"><h3>Gold requerido</h3><div class="value blue">${window.Fmt.num(neededGold)}</div></div>
          <div class="card"><h3>USD requerido</h3><div class="value blue">${this.operationCostUsd(cfg) > 0 ? '$' + window.Fmt.num(neededUsd) : '—'}</div></div>
        </div>
      </div>
    `;
  },

  renderPurchasePower(data) {
    const cfg = this.cfg();
    const costGold = this.operationCostGold(cfg);
    const rcPerPackage = Number(cfg.rcPerPackage) || 0;
    const availableOperativeGold = Math.max(0, data.opG - data.inv.goldInvested);

    const packagesNow = costGold > 0 ? Math.floor(availableOperativeGold / costGold) : 0;
    const rcNow = packagesNow * rcPerPackage;
    const remainder = availableOperativeGold - (packagesNow * costGold);
    const missingForNextPackage = costGold > 0 ? Math.max(0, costGold - remainder) : 0;
    const liquidAfterMaxBuy = remainder; // lo que sobra tras comprar el máximo de paquetes
    const canIncreaseOperation = remainder >= costGold; // si el resto ya alcanza para otro paquete completo

    document.getElementById('cap_purchasePower').innerHTML = `
      <div class="section">
        <h2>Poder de compra actual</h2>
        <div class="grid grid-cards">
          <div class="card"><h3>RC comprables ahora</h3><div class="value blue">${window.Fmt.num(rcNow)} RC</div><div class="sub">${window.Fmt.num(packagesNow)} paquete(s) con el capital operativo líquido</div></div>
          <div class="card"><h3>Gold que falta para otro paquete de ${window.Fmt.num(rcPerPackage)} RC</h3><div class="value ${missingForNextPackage>0?'red':'green'}">${window.Fmt.num(missingForNextPackage)}</div></div>
          <div class="card"><h3>Gold adicional requerido</h3><div class="value">${window.Fmt.num(missingForNextPackage)} gold</div></div>
          <div class="card"><h3>Gold restante tras compra</h3><div class="value green">${window.Fmt.num(liquidAfterMaxBuy)} gold</div></div>
          <div class="card"><h3>¿Puedo hacer otra operación?</h3><div class="value ${canIncreaseOperation?'green':'red'}">${canIncreaseOperation ? 'Sí, ya alcanza' : 'Todavía no'}</div></div>
        </div>
      </div>
    `;
  },

  // ---- simulación operación por operación (reserva + reinversión) ----
  simState: { capitalInicial: 9, reservaPct: 20, reinversionPct: 100, rentabilidadPct: 7.73, operaciones: 20 },

  runSimulation(s) {
    const rows = [];
    let capital = Number(s.capitalInicial) || 0;
    for (let i = 1; i <= (Number(s.operaciones) || 0); i++) {
      const capitalInicial = capital;
      const reserva = capitalInicial * (Number(s.reservaPct) || 0) / 100;
      const capitalOperativo = capitalInicial - reserva;
      const ganancia = capitalOperativo * (Number(s.rentabilidadPct) || 0) / 100;
      const reinversion = ganancia * (Number(s.reinversionPct) || 0) / 100;
      const capitalFinal = capitalInicial + reinversion;
      rows.push({ n: i, capitalInicial, capitalOperativo, reserva, ganancia, reinversion, capitalFinal });
      capital = capitalFinal;
    }
    return rows;
  },

  renderSimulation() {
    const s = this.simState;
    const rows = this.runSimulation(s);
    const fmt = window.Fmt.num;

    document.getElementById('cap_simulation').innerHTML = `
      <div class="section">
        <h2>Simulación de crecimiento (reserva + reinversión)</h2>
        <div class="note">Simulación matemática basada exclusivamente en los datos ingresados. No es una garantía de ganancias futuras.</div>
        <div class="grid grid-3">
          <div class="field"><label>Capital inicial (USD)</label><input type="number" step="0.01" id="sim_capitalInicial" value="${s.capitalInicial}"></div>
          <div class="field"><label>Reserva (%)</label><input type="number" id="sim_reservaPct" value="${s.reservaPct}"></div>
          <div class="field"><label>Reinversión (%)</label><input type="number" id="sim_reinversionPct" value="${s.reinversionPct}"></div>
          <div class="field"><label>Rentabilidad/operación (%)</label><input type="number" step="0.01" id="sim_rentabilidadPct" value="${s.rentabilidadPct}"></div>
          <div class="field"><label>N.º de operaciones</label><input type="number" id="sim_operaciones" value="${s.operaciones}"></div>
          <div style="align-self:end;"><button class="btn" id="sim_run">Simular</button></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>N.º</th><th>Capital inicial (USD)</th><th>Capital operativo</th><th>Reserva</th><th>Ganancia</th><th>Reinversión</th><th>Capital final</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => `<tr>
                <td>${r.n}</td><td>$ ${fmt(r.capitalInicial)}</td><td>${fmt(r.capitalOperativo)}</td>
                <td>${fmt(r.reserva)}</td><td>${fmt(r.ganancia)}</td><td>${fmt(r.reinversion)}</td><td>${fmt(r.capitalFinal)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('sim_run').addEventListener('click', () => {
      this.simState = {
        capitalInicial: document.getElementById('sim_capitalInicial').value,
        reservaPct: document.getElementById('sim_reservaPct').value,
        reinversionPct: document.getElementById('sim_reinversionPct').value,
        rentabilidadPct: document.getElementById('sim_rentabilidadPct').value,
        operaciones: document.getElementById('sim_operaciones').value
      };
      this.renderSimulation();
    });
  },

  saveConfig() {
    const cfg = {
      totalUsd: document.getElementById('cap_totalUsd').value,
      totalGold: document.getElementById('cap_totalGold').value,
      costUsdPerPackage: window.DB.config.rcBuyUsdPerPackage ?? 0.45,
      buyPricePerPackage: document.getElementById('cap_buyPrice').value,
      sellPricePerPackage: document.getElementById('cap_sellPrice').value,
      rcPerPackage: 25,
      commissionPct: document.getElementById('cap_commission').value,
      simultaneousOps: document.getElementById('cap_simOps').value,
      liquidityReservePct: document.getElementById('cap_reservePct').value,
      reinvestPct: document.getElementById('cap_reinvestPct').value
    };
    window.DB.capitalConfig = cfg;
    window.Storage.save();
    this.refreshAll();
  },

  refreshAll() {
    const data = this.renderSummary();
    this.renderLiquidityBar(data);
    this.renderLevels();
    this.renderOpsTable();
    this.renderCustomCalc();
    this.renderPurchasePower(data);
    document.getElementById('cap_customN').addEventListener('input', (e) => {
      this.customOpCount = Number(e.target.value) || 0;
      this.renderCustomCalc();
      document.getElementById('cap_customN').focus();
    });
  },

  afterRender() {
    this.refreshAll();
    this.renderSimulation();

    const inputs = ['cap_totalUsd', 'cap_totalGold', 'cap_buyPrice', 'cap_sellPrice',
      'cap_commission', 'cap_simOps', 'cap_reservePct', 'cap_reinvestPct'];
    inputs.forEach(id => {
      document.getElementById(id).addEventListener('input', () => this.saveConfig());
    });
    document.getElementById('cap_reserveChips').querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('cap_reservePct').value = chip.dataset.pct;
        this.saveConfig();
      });
    });
  }
};
