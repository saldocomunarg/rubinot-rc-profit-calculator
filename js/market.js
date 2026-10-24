/**
 * market.js
 * Módulo 2: Compras y ventas de RC.
 * Cada operación genera además un movimiento de inventario.
 */

window.MarketModule = {

  filters: { type: 'all', from: '', to: '', q: '' },

  computeBuy(op) {
    const RC_PER_PACKAGE = 25;
    const packages = (Number(op.rcQty) || 0) / RC_PER_PACKAGE;
    const goldUsed = op.goldUsed !== undefined && op.goldUsed !== '' ? Number(op.goldUsed) : (Number(op.rcQty) || 0) * (Number(op.pricePerPackage) || 0);
    return { packages, goldUsed };
  },

  computeSell(op) {
    const goldBruto = Number(op.goldBruto) || (Number(op.rcQty) || 0) * (Number(op.pricePerPackage) || 0);
    const commissionGold = goldBruto * (Number(op.commissionPct) || 0) / 100;
    const goldNeto = goldBruto - commissionGold;
    return { goldBruto, commissionGold, goldNeto };
  },

  avgBuyCost() {
    const buys = window.DB.market.filter(o => o.type === 'buy');
    let totalRc = 0, totalGold = 0;
    buys.forEach(b => { totalRc += Number(b.rcQty) || 0; totalGold += Number(b.goldUsed) || 0; });
    return totalRc > 0 ? totalGold / totalRc : 0;
  },

  addOperation(op) {
    op.id = window.Storage.uid();
    op.createdAt = new Date().toISOString();
    window.DB.market.push(op);

    // movimiento de inventario asociado
    if (op.type === 'buy') {
      window.DB.inventoryMoves.push({
        id: window.Storage.uid(), type: 'MARKET_BUY_RC', qty: Number(op.rcQty),
        date: op.date, refId: op.id, note: 'Compra en mercado'
      });
    } else {
      window.DB.inventoryMoves.push({
        id: window.Storage.uid(), type: 'MARKET_SELL_RC', qty: Number(op.rcQty),
        date: op.date, refId: op.id, note: 'Venta en mercado'
      });
    }
    window.Storage.save();
  },

  editOperation(id) {
    const op = window.DB.market.find(x => x.id === id);
    if (!op) return;
    const isBuy = op.type === 'buy';
    const title = isBuy ? 'Editar compra de RC' : 'Editar venta de RC';
    window.App.openModal(`
      <h3>${title}</h3>
      <div class="grid grid-2">
        <div class="field"><label>Fecha</label><input type="date" id="mk_edit_date" value="${op.date || ''}"></div>
        <div class="field"><label>Hora</label><input type="time" id="mk_edit_time" value="${op.time || ''}"></div>
      </div>
      <div class="grid grid-2">
        <div class="field"><label>Cantidad de RC</label><input type="number" min="25" step="25" id="mk_edit_rc" value="${op.rcQty || 25}"></div>
        <div class="field"><label>Precio por 1 RC (Gold)</label><input type="number" id="mk_edit_price" value="${op.pricePerPackage || 0}"></div>
      </div>
      <div class="field"><label>Base fija</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
      ${isBuy ? `
        <div class="grid grid-2">
          <div class="field"><label>Gold utilizado</label><input type="number" id="mk_edit_gold" value="${op.goldUsed ?? ''}"></div>
          <div class="field"><label>USD utilizado</label><input type="number" step="0.01" id="mk_edit_usd" value="${op.usdUsed ?? ''}"></div>
        </div>
        <div class="field"><label>Vendedor / notas</label><input type="text" id="mk_edit_notes" value="${op.seller || op.notes || ''}"></div>
      ` : `
        <div class="grid grid-2">
          <div class="field"><label>Gold bruto</label><input type="number" id="mk_edit_gold" value="${op.goldBruto ?? ''}"></div>
          <div class="field"><label>Comisión (%)</label><input type="number" step="0.01" id="mk_edit_commission" value="${op.commissionPct ?? 0}"></div>
        </div>
        <div class="field"><label>Notas</label><input type="text" id="mk_edit_notes" value="${op.notes || ''}"></div>
      `}
      <div class="modal-actions"><button class="btn secondary" id="mk_edit_cancel">Cancelar</button><button class="btn" id="mk_edit_save">Guardar cambios</button></div>
    `);
    document.getElementById('mk_edit_cancel').addEventListener('click', () => window.App.closeModal());
    document.getElementById('mk_edit_save').addEventListener('click', async () => {
      const rc = Number(document.getElementById('mk_edit_rc').value);
      if (!rc || rc < 25 || rc % 25 !== 0) { alert('La cantidad de RC debe ser de al menos 25 y en múltiplos de 25.'); return; }
      op.date = document.getElementById('mk_edit_date').value;
      op.time = document.getElementById('mk_edit_time').value;
      op.rcQty = rc;
      op.rcPerPackage = 25;
      op.pricePerPackage = Number(document.getElementById('mk_edit_price').value) || 0;
      const goldField = document.getElementById('mk_edit_gold').value;
      if (isBuy) {
        op.goldUsed = goldField === '' ? rc * op.pricePerPackage : Number(goldField);
        op.usdUsed = document.getElementById('mk_edit_usd').value;
        op.seller = document.getElementById('mk_edit_notes').value;
        op.notes = op.seller;
      } else {
        op.goldBruto = goldField === '' ? rc * op.pricePerPackage : Number(goldField);
        op.commissionPct = Number(document.getElementById('mk_edit_commission').value) || 0;
        op.notes = document.getElementById('mk_edit_notes').value;
      }
      const move = window.DB.inventoryMoves.find(m => m.refId === id);
      if (move) { move.qty = rc; move.date = op.date; }
      await window.Storage.save();
      window.App.closeModal();
      this.renderTable();
      window.App.refreshBadges && window.App.refreshBadges();
    });
  },

  deleteOperation(id) {
    window.DB.market = window.DB.market.filter(o => o.id !== id);
    window.DB.inventoryMoves = window.DB.inventoryMoves.filter(m => m.refId !== id);
    window.Storage.save();
  },

  render() {
    return `
      <h1 class="view-title">Compras y Ventas de RC</h1>
      <p class="view-sub">Historial de todo lo que comprás y vendés. Cada registro puede editarse o eliminarse.</p>

      <div class="section">
        <div class="toolbar">
          <button class="btn" id="mk_addBuy">+ Compra de RC</button>
          <button class="btn secondary" id="mk_addSell">+ Venta de RC</button>
          <select id="mk_filterType">
            <option value="all">Todas</option>
            <option value="buy">Compras de RC</option>
            <option value="sell">Ventas de RC</option>
          </select>
          <input type="date" id="mk_filterFrom">
          <input type="date" id="mk_filterTo">
          <input type="text" id="mk_filterQ" placeholder="Buscar notas / vendedor...">
          <button class="btn secondary small" id="mk_exportCsv">Exportar CSV</button>
        </div>
        <div class="grid grid-cards" style="margin-bottom:14px;">
          <div class="card"><h3>Precio promedio de compra</h3><div class="value">${window.Fmt.num(this.avgBuyCost())} gold/RC</div></div>
        </div>
        <div class="table-wrap" id="mk_tableWrap"></div>
      </div>
    `;
  },

  renderTable() {
    let rows = window.DB.market.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.time||'').localeCompare(a.time||''));
    const f = this.filters;
    if (f.type !== 'all') rows = rows.filter(r => r.type === f.type);
    if (f.from) rows = rows.filter(r => r.date >= f.from);
    if (f.to) rows = rows.filter(r => r.date <= f.to);
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(r => (r.notes || '').toLowerCase().includes(q) || (r.seller || '').toLowerCase().includes(q));
    }

    if (!rows.length) {
      document.getElementById('mk_tableWrap').innerHTML = `<div class="empty-state">No hay compras o ventas registradas con estos filtros.</div>`;
      return;
    }

    const trs = rows.map(op => {
      if (op.type === 'buy') {
        const c = this.computeBuy(op);
        return `<tr>
          <td>${op.date} ${op.time || ''}</td>
          <td><span class="badge buy">COMPRA</span></td>
          <td>${window.Fmt.num(op.rcQty)}</td>
          <td>${window.Fmt.num(op.pricePerPackage)}</td>
          <td>${window.Fmt.num(c.goldUsed)} gold</td>
          <td>${op.usdUsed ? '$' + window.Fmt.num(op.usdUsed) : '—'}</td>
          <td>${op.seller || op.notes || '—'}</td>
          <td><button class="btn secondary small" data-edit="${op.id}">Editar</button> <button class="btn danger small" data-del="${op.id}">Eliminar</button></td>
        </tr>`;
      } else {
        const c = this.computeSell(op);
        const profit = c.goldNeto; // referencia bruta neta, ganancia real se ve en dashboard vs costo promedio
        return `<tr>
          <td>${op.date} ${op.time || ''}</td>
          <td><span class="badge sell">VENTA</span></td>
          <td>${window.Fmt.num(op.rcQty)}</td>
          <td>${window.Fmt.num(op.pricePerPackage)}</td>
          <td>${window.Fmt.num(c.goldNeto)} gold neto</td>
          <td>${window.Fmt.num(c.commissionGold)} gold</td>
          <td>${op.notes || '—'}</td>
          <td><button class="btn secondary small" data-edit="${op.id}">Editar</button> <button class="btn danger small" data-del="${op.id}">Eliminar</button></td>
        </tr>`;
      }
    }).join('');

    document.getElementById('mk_tableWrap').innerHTML = `
      <table>
        <thead><tr>
          <th>Fecha</th><th>Tipo</th><th>RC</th><th>Precio/RC</th><th>Gold</th><th>USD/Comisión</th><th>Notas</th><th>Acciones</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    `;

    document.getElementById('mk_tableWrap').querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => this.editOperation(btn.dataset.edit));
    });

    document.getElementById('mk_tableWrap').querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm('¿Eliminar esta compra/venta de RC? Esta acción no se puede deshacer.')) {
          this.deleteOperation(btn.dataset.del);
          this.renderTable();
          window.App.refreshBadges && window.App.refreshBadges();
        }
      });
    });
  },

  afterRender() {
    this.renderTable();
    document.getElementById('mk_addBuy').addEventListener('click', () => window.App.openOperationModal('buy'));
    document.getElementById('mk_addSell').addEventListener('click', () => window.App.openOperationModal('sell'));
    document.getElementById('mk_filterType').addEventListener('change', (e) => { this.filters.type = e.target.value; this.renderTable(); });
    document.getElementById('mk_filterFrom').addEventListener('change', (e) => { this.filters.from = e.target.value; this.renderTable(); });
    document.getElementById('mk_filterTo').addEventListener('change', (e) => { this.filters.to = e.target.value; this.renderTable(); });
    document.getElementById('mk_filterQ').addEventListener('input', (e) => { this.filters.q = e.target.value; this.renderTable(); });
    document.getElementById('mk_exportCsv').addEventListener('click', async () => {
      await window.Storage.exportCSV('compras-ventas-rc.csv', window.DB.market, [
        { label: 'Fecha', value: 'date' }, { label: 'Hora', value: 'time' }, { label: 'Tipo', value: 'type' },
        { label: 'RC', value: 'rcQty' }, { label: 'Precio/RC', value: 'pricePerPackage' },
        { label: 'Gold usado', value: 'goldUsed' }, { label: 'USD usado', value: 'usdUsed' },
        { label: 'Comisión %', value: 'commissionPct' }, { label: 'Notas', value: 'notes' }
      ]);
    });
  }
};
