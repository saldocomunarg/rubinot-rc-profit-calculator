/**
 * calculator.js
 * Módulo 1: Calculadora RC.
 * Cálculo puro sobre los datos ingresados por el usuario. No persiste nada
 * salvo los últimos valores usados (para comodidad al reabrir la app).
 */

window.CalculatorModule = {

  compute(input) {
    const RC_PER_PACKAGE = 25;
    const rcQty = Math.max(RC_PER_PACKAGE, Math.floor((Number(input.rcQty) || RC_PER_PACKAGE) / RC_PER_PACKAGE) * RC_PER_PACKAGE);
    const buyPricePerRc = Number(input.buyPricePerRc) || 0;
    const sellPricePerRc = Number(input.sellPricePerRc) || 0;
    const commissionPct = Number(input.commissionPct) || 0;
    const usdBuyPerPackage = Number(input.usdBuyPerPackage) || 0;
    const usdSellPerPackage = Number(input.usdSellPerPackage) || 0;

    const packages = rcQty / RC_PER_PACKAGE;
    const goldInvested = rcQty * buyPricePerRc;
    const grossSale = rcQty * sellPricePerRc;
    const commissionGold = grossSale * (commissionPct / 100);
    const netSale = grossSale - commissionGold;
    const profitGold = netSale - goldInvested;
    const roiPct = goldInvested > 0 ? (profitGold / goldInvested) * 100 : 0;
    const usdBuyTotal = packages * usdBuyPerPackage;
    const usdSellTotal = packages * usdSellPerPackage;
    const profitRc = buyPricePerRc > 0 ? profitGold / buyPricePerRc : 0;

    return {
      packages, goldInvested, grossSale, commissionGold, netSale, profitGold,
      roiPct, usdBuyPerPackage, usdSellPerPackage, usdBuyTotal, usdSellTotal, profitRc, averageBuyPrice: buyPricePerRc
    };
  },

  render() {
    const last = window.DB.config.lastCalculatorInput || {
      rcQty: 500, buyPricePerRc: 86600, sellPricePerRc: 98200, commissionPct: 5
    };

    return `
      <h1 class="view-title">Calculadora RC</h1>
      <p class="view-sub">Simulación matemática pura sobre compra/venta de RC. No ejecuta ninguna operación real.</p>

      <div class="section">
        <h2>Datos de la operación</h2>
        <div class="grid grid-3">
          <div class="field"><label>Cantidad de RC (múltiplos de 25)</label><input type="number" min="25" step="25" id="calc_rcQty" value="${last.rcQty}"></div>
          <div class="field"><label>Base fija (RC)</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
          <div class="field"><label>Compra por 1 RC (Gold)</label><input type="number" id="calc_buyPricePerRc" value="${last.buyPricePerRc ?? last.buyPricePerPackage ?? 86600}"></div>
          <div class="field"><label>Venta por 1 RC (Gold)</label><input type="number" id="calc_sellPricePerRc" value="${last.sellPricePerRc ?? last.sellPricePerPackage ?? 98200}"></div>
          <div class="field"><label>Comisión (%)</label><input type="number" step="0.01" id="calc_commissionPct" value="${last.commissionPct}"></div>
          <div class="field"><label>Compra — 25 RC (USD)</label><input type="text" value="$${window.Fmt.num(window.DB.config.rcBuyUsdPerPackage ?? 0.45)}" disabled></div>
          <div class="field"><label>Venta — 25 RC (USD)</label><input type="text" value="$${window.Fmt.num(window.DB.config.rcSellUsdPerPackage ?? 0.45)}" disabled></div>
        </div>
        <button class="btn" id="calc_run">Calcular</button>
      </div>

      <div id="calc_results"></div>
    `;
  },

  afterRender() {
    const runBtn = document.getElementById('calc_run');
    const run = () => {
      const input = {
        rcQty: document.getElementById('calc_rcQty').value,
        buyPricePerRc: document.getElementById('calc_buyPricePerRc').value,
        sellPricePerRc: document.getElementById('calc_sellPricePerRc').value,
        commissionPct: document.getElementById('calc_commissionPct').value,
        usdBuyPerPackage: window.DB.config.rcBuyUsdPerPackage ?? 0.45,
        usdSellPerPackage: window.DB.config.rcSellUsdPerPackage ?? 0.45
      };
      window.DB.config.lastCalculatorInput = input;
      window.Storage.save();

      const r = this.compute(input);
      const fmt = window.Fmt.num;
      const fmtGold = (v) => `<span class="gold-value">${fmt(v)}<span class="gold-coin" title="Gold">G</span></span>`;

      document.getElementById('calc_results').innerHTML = `
        <div class="section">
          <h2>Resultado</h2>
          <div class="grid grid-cards">
            <div class="card"><h3>Paquetes</h3><div class="value">${fmt(r.packages)}</div></div>
            <div class="card"><h3>Gold invertido</h3><div class="value">${fmtGold(r.goldInvested)}</div></div>
            <div class="card"><h3>Venta bruta</h3><div class="value">${fmtGold(r.grossSale)}</div></div>
            <div class="card"><h3>Comisión</h3><div class="value red">${fmtGold(r.commissionGold)}</div></div>
            <div class="card"><h3>Venta neta</h3><div class="value blue">${fmtGold(r.netSale)}</div></div>
            <div class="card"><h3>Ganancia / Pérdida (RC)</h3><div class="value ${r.profitRc >= 0 ? 'green' : 'red'}">${fmt(r.profitRc)} RC</div></div>
            <div class="card"><h3>ROI %</h3><div class="value ${r.roiPct >= 0 ? 'green' : 'red'}">${fmt(r.roiPct)}%</div></div>
            <div class="card"><h3>Valor compra — 25 RC (USD)</h3><div class="value">$${fmt(r.usdBuyPerPackage)}</div><div class="sub">Total: $${fmt(r.usdBuyTotal)}</div></div>
            <div class="card"><h3>Valor venta — 25 RC (USD)</h3><div class="value">$${fmt(r.usdSellPerPackage)}</div><div class="sub">Total: $${fmt(r.usdSellTotal)}</div></div>
            <div class="card"><h3>Promedio de compra / RC</h3><div class="value">${fmtGold(r.averageBuyPrice)}</div></div>
          </div>
        </div>
      `;
    };
    runBtn.addEventListener('click', run);
    run();
  }
};
