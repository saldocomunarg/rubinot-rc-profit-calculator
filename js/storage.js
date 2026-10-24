/**
 * storage.js
 * Capa de persistencia. Guarda todo en un único archivo JSON local
 * (userData/rubinot-data.json) a través del proceso principal de Electron.
 * También mantiene un espejo en memoria (window.DB) para acceso rápido
 * desde el resto de los módulos.
 */

const DEFAULT_DB = {
  config: {
    playerName: '',
    character: '',
    currency: 'USD',
    defaultCommission: 5,
    defaultRcPerPackage: 25,
    rcBuyUsdPerPackage: 0.45,
    rcSellUsdPerPackage: 0.45,
    theme: 'dark',
    numberFormat: 'es-AR'
  },
  market: [],       // operaciones de compra/venta
  hunts: [],        // extras: RC obtenidos jugando/farmeando (compatibilidad de datos)
  inventoryMoves: [],// movimientos de inventario (HUNT_RC_IN, MARKET_BUY_RC, MARKET_SELL_RC, RC_USE)
  cashClosures: [],  // cierres diarios
  ledger: [],        // gastos / ingresos sueltos (no ligados a market/hunt)
  investment: {
    purchases: [],
    currentPriceUsd: 0.45,
    monthlyContributionUsd: 0,
    monthlyRcPurchase: 0,
    horizonMonths: 24,
    conservativeAnnualPct: 10,
    baseAnnualPct: 25,
    highAnnualPct: 50
  },
  capitalConfig: {
    totalUsd: 0,
    totalGold: 0,
    buyPricePerPackage: 86600,
    sellPricePerPackage: 98200,
    rcPerPackage: 25,
    commissionPct: 5,
    simultaneousOps: 5,
    liquidityReservePct: 20,
    reinvestPct: 100
  }
};

window.DB = JSON.parse(JSON.stringify(DEFAULT_DB));

window.Storage = {
  async load() {
    let data = null;
    try {
      data = await window.rubinotAPI.readData();
    } catch (e) {
      console.warn('No se pudo leer datos via IPC, se usa localStorage como respaldo.', e);
    }
    if (!data) {
      // fallback a localStorage (útil si se abre como página suelta)
      const raw = localStorage.getItem('rubinot-data');
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) { data = null; }
      }
    }
    if (data) {
      window.DB = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DB)), data);
      // aseguramos que sub-objetos no falten (compatibilidad hacia adelante)
      window.DB.config = Object.assign({}, DEFAULT_DB.config, data.config || {});
      window.DB.capitalConfig = Object.assign({}, DEFAULT_DB.capitalConfig, data.capitalConfig || {});
      window.DB.investment = Object.assign({}, DEFAULT_DB.investment, data.investment || {});
      window.DB.investment.purchases = Array.isArray(data.investment && data.investment.purchases) ? data.investment.purchases : [];
    }
    return window.DB;
  },

  async save() {
    try {
      await window.rubinotAPI.writeData(window.DB);
    } catch (e) {
      console.warn('No se pudo escribir via IPC, se usa localStorage.', e);
    }
    try {
      localStorage.setItem('rubinot-data', JSON.stringify(window.DB));
    } catch (e) { /* ignore quota errors */ }
    const ind = document.getElementById('saveIndicator');
    if (ind) {
      ind.textContent = 'Guardado ' + new Date().toLocaleTimeString();
      ind.style.color = '#22c55e';
      setTimeout(() => { ind.style.color = ''; ind.textContent = 'Datos guardados localmente'; }, 1500);
    }
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // ---- utilidades de exportación ----
  toCSV(rows, columns) {
    const header = columns.map(c => c.label).join(',');
    const lines = rows.map(r => columns.map(c => {
      let v = typeof c.value === 'function' ? c.value(r) : r[c.value];
      if (v === undefined || v === null) v = '';
      v = String(v).replace(/"/g, '""');
      if (v.includes(',') || v.includes('\n')) v = `"${v}"`;
      return v;
    }).join(','));
    return [header, ...lines].join('\n');
  },

  async exportCSV(defaultName, rows, columns) {
    const csv = this.toCSV(rows, columns);
    const res = await window.rubinotAPI.saveFile({
      defaultName,
      content: csv,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    return res;
  },

  async exportBackup() {
    const res = await window.rubinotAPI.saveFile({
      defaultName: 'rubinot-backup.json',
      content: JSON.stringify(window.DB, null, 2),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    return res;
  },

  async importBackup() {
    const res = await window.rubinotAPI.openFile({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (!res.ok) return false;
    try {
      const data = JSON.parse(res.content);
      window.DB = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DB)), data);
      await this.save();
      return true;
    } catch (e) {
      alert('El archivo de respaldo no es válido.');
      return false;
    }
  }
};
