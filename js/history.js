/**
 * history.js
 * Historial de hunts, compras y ventas de RC, gastos e ingresos.
 */

window.HistoryModule = {

  filters: { type: 'all', q: '', from: '', to: '' },
  selectedId: null,

  buildRows() {
    const rows = [];
    window.DB.hunts.forEach(h => rows.push({
      id: h.id, date: h.date, type: 'extra', label: 'EXTRA', detail: `${window.Fmt.num(h.rc)} RC · ${h.notes || 'RC obtenidos jugando'}`, raw: h
    }));
    window.DB.market.forEach(o => {
      const price = Number(o.pricePerPackage) || 0;
      const total = o.type === 'buy'
        ? (o.goldUsed !== undefined && o.goldUsed !== '' ? Number(o.goldUsed) : (Number(o.rcQty) || 0) * price)
        : (o.goldBruto !== undefined && o.goldBruto !== '' ? Number(o.goldBruto) : (Number(o.rcQty) || 0) * price);
      const extra = o.type === 'buy' ? (o.seller || o.notes || '') : (o.notes || '');
      rows.push({
        id: o.id, date: o.date, type: o.type === 'buy' ? 'buy' : 'sell',
        label: o.type === 'buy' ? 'Compra de RC' : 'Venta de RC',
        detail: `${window.Fmt.num(o.rcQty)} RC · ${window.Fmt.num(price)} Gold/RC · ${window.Fmt.num(total)} Gold${extra ? ' · ' + extra : ''}`, raw: o
      });
    });
    window.DB.ledger.forEach(l => rows.push({
      id: l.id, date: l.date, type: l.type, label: l.type === 'expense' ? 'Gasto' : 'Ingreso',
      detail: `${l.amount} ${l.currency || ''} · ${l.notes || ''}`, raw: l
    }));
    return rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  render() {
    return `
      <h1 class="view-title">Historial</h1>
      <div class="section">
        <div class="toolbar">
          <select id="hi_type">
            <option value="all">Todos los tipos</option>
            <option value="extra">Extras (RC obtenidos)</option>
            <option value="buy">Compras de RC</option>
            <option value="sell">Ventas de RC</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
                                  </select>
          <input type="date" id="hi_from">
          <input type="date" id="hi_to">
          <input type="text" id="hi_q" placeholder="Buscar...">
          <button class="btn secondary small" id="hi_exportBackup">Exportar respaldo completo</button>
          <button class="btn secondary small" id="hi_importBackup">Importar respaldo</button>
        </div>
        <div class="table-wrap" id="hi_table"></div>
        <div class="history-actions" id="hi_actions" style="display:none; margin-top:12px;">
          <button class="btn secondary small" id="hi_edit">✏️ Editar seleccionado</button>
          <button class="btn danger small" id="hi_delete">🗑️ Eliminar seleccionado</button>
        </div>
      </div>
    `;
  },

  renderTable() {
    let rows = this.buildRows();
    const f = this.filters;
    if (f.type !== 'all') rows = rows.filter(r => r.type === f.type);
    if (f.from) rows = rows.filter(r => r.date >= f.from);
    if (f.to) rows = rows.filter(r => r.date <= f.to);
    if (f.q) {
      const q = f.q.toLowerCase();
      rows = rows.filter(r => r.detail.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
    }

    if (!rows.some(r => r.id === this.selectedId)) this.selectedId = null;

    if (!rows.length) {
      document.getElementById('hi_table').innerHTML = `<div class="empty-state">No hay registros con estos filtros.</div>`;
      this.updateActions();
      return;
    }

    const badgeClass = { extra: 'hunt', buy: 'buy', sell: 'sell', expense: 'expense', income: 'income' };
    const trs = rows.slice(0, 500).map(r => `<tr class="history-row ${this.selectedId === r.id ? 'selected' : ''}" data-history-row="${r.id}">
      <td style="width:90px;text-align:center;"><input type="radio" name="hi_select" value="${r.id}" ${this.selectedId === r.id ? 'checked' : ''} aria-label="Seleccionar registro"></td>
      <td>${r.date}</td>
      <td><span class="badge ${badgeClass[r.type] || 'buy'}">${r.label}</span></td>
      <td>${r.detail}</td>
    </tr>`).join('');

    document.getElementById('hi_table').innerHTML = `
      <table><thead><tr><th>Seleccionar</th><th>Fecha</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>${trs}</tbody></table>
    `;

    document.getElementById('hi_table').querySelectorAll('input[name="hi_select"]').forEach(input => {
      input.addEventListener('change', () => {
        this.selectedId = input.value;
        this.renderTable();
      });
    });
    document.getElementById('hi_table').querySelectorAll('[data-history-row]').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.matches('input')) return;
        const radio = row.querySelector('input[name="hi_select"]');
        if (radio) { radio.checked = true; this.selectedId = radio.value; this.renderTable(); }
      });
    });
    this.updateActions();
  },

  updateActions() {
    const actions = document.getElementById('hi_actions');
    if (!actions) return;
    actions.style.display = this.selectedId ? 'flex' : 'none';
    const row = this.buildRows().find(r => r.id === this.selectedId);
    const editBtn = document.getElementById('hi_edit');
    const deleteBtn = document.getElementById('hi_delete');
    if (editBtn) editBtn.disabled = !row;
    if (deleteBtn) deleteBtn.disabled = !row;
  },

  findSelected() {
    return this.buildRows().find(r => r.id === this.selectedId) || null;
  },

  getTarget(row) {
    if (!row) return null;
    if (row.type === 'extra') return { collection: 'hunts', item: window.DB.hunts.find(x => x.id === row.id) };
    if (row.type === 'buy' || row.type === 'sell') return { collection: 'market', item: window.DB.market.find(x => x.id === row.id) };
    if (row.type === 'expense' || row.type === 'income') return { collection: 'ledger', item: window.DB.ledger.find(x => x.id === row.id) };
    return null;
  },

  editSelected() {
    const row = this.findSelected();
    const target = this.getTarget(row);
    if (!target || !target.item) return;
    const item = target.item;
    const type = row.type;

    let fields = '';
    if (type === 'extra') {
      fields = `
        <div class="field"><label>Fecha</label><input type="date" id="he_date" value="${item.date || ''}"></div>
        <div class="field"><label>Cantidad de RC (múltiplos de 25)</label><input type="number" min="25" step="25" id="he_rc" value="${item.rc || 25}"></div>
        <div class="field"><label>Nota</label><input type="text" id="he_notes" value="${item.notes || ''}"></div>`;
    } else if (type === 'buy' || type === 'sell') {
      fields = `
        <div class="field"><label>Fecha</label><input type="date" id="he_date" value="${item.date || ''}"></div>
        <div class="field"><label>Hora</label><input type="time" id="he_time" value="${item.time || ''}"></div>
        <div class="field"><label>Cantidad de RC</label><input type="number" id="he_rcQty" value="${item.rcQty || 0}"></div>
        <div class="field"><label>Base de operación</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
        <div class="field"><label>Precio por 1 RC (gold)</label><input type="number" id="he_price" value="${item.pricePerPackage || 0}"></div>
        ${type === 'buy' ? `
          <div class="field"><label>Gold utilizado</label><input type="number" id="he_goldUsed" value="${item.goldUsed || 0}"></div>
          <div class="field"><label>USD utilizado</label><input type="number" step="0.01" id="he_usdUsed" value="${item.usdUsed || ''}"></div>
          <div class="field"><label>Vendedor / notas</label><input type="text" id="he_notes" value="${item.seller || item.notes || ''}"></div>` : `
          <div class="field"><label>Gold bruto</label><input type="number" id="he_goldBruto" value="${item.goldBruto || 0}"></div>
          <div class="field"><label>Comisión (%)</label><input type="number" step="0.01" id="he_commission" value="${item.commissionPct || 0}"></div>
          <div class="field"><label>Notas</label><input type="text" id="he_notes" value="${item.notes || ''}"></div>`}`;
    } else if (type === 'expense' || type === 'income') {
      fields = `
        <div class="field"><label>Fecha</label><input type="date" id="he_date" value="${item.date || ''}"></div>
        <div class="field"><label>Monto</label><input type="number" step="0.01" id="he_amount" value="${item.amount || 0}"></div>
        <div class="field"><label>Moneda</label><select id="he_currency"><option value="gold" ${item.currency === 'gold' ? 'selected' : ''}>Gold</option><option value="USD" ${item.currency === 'USD' ? 'selected' : ''}>USD</option></select></div>
        <div class="field"><label>Notas</label><input type="text" id="he_notes" value="${item.notes || ''}"></div>`;
    }

    window.App.openModal(`<h3>Editar registro</h3>${fields}<div class="modal-actions"><button class="btn secondary" id="he_cancel">Cancelar</button><button class="btn" id="he_save">Guardar cambios</button></div>`);
    document.getElementById('he_cancel').addEventListener('click', () => window.App.closeModal());
    document.getElementById('he_save').addEventListener('click', async () => {
      if (type === 'extra') {
        const rc = Number(document.getElementById('he_rc').value);
        if (!rc || rc < 25 || rc % 25 !== 0) { alert('La cantidad de RC debe ser de al menos 25 y en múltiplos de 25.'); return; }
        item.date = document.getElementById('he_date').value;
        item.rc = rc;
        item.notes = document.getElementById('he_notes').value;
        item.goldSpent = 0; item.otherIncome = 0; item.otherExpense = 0;
        const move = window.DB.inventoryMoves.find(m => m.refId === item.id && m.type === 'HUNT_RC_IN');
        if (move) { move.qty = rc; move.date = item.date; move.note = 'RC obtenidos como extra'; }
      } else if (type === 'buy' || type === 'sell') {
        item.date = document.getElementById('he_date').value; item.time = document.getElementById('he_time').value;
        const editedRc = Number(document.getElementById('he_rcQty').value);
        if (!editedRc || editedRc < 25 || editedRc % 25 !== 0) { alert('La cantidad de RC debe ser de al menos 25 y en múltiplos de 25.'); return; }
        item.rcQty = editedRc; item.rcPerPackage = 25; item.pricePerPackage = Number(document.getElementById('he_price').value) || 0;
        const move = window.DB.inventoryMoves.find(m => m.refId === item.id); if (move) { move.qty = item.rcQty; move.date = item.date; }
        if (type === 'buy') { item.goldUsed = Number(document.getElementById('he_goldUsed').value) || 0; item.usdUsed = document.getElementById('he_usdUsed').value; item.seller = document.getElementById('he_notes').value; item.notes = item.seller; }
        else { item.goldBruto = Number(document.getElementById('he_goldBruto').value) || 0; item.commissionPct = Number(document.getElementById('he_commission').value) || 0; item.notes = document.getElementById('he_notes').value; }
      } else if (type === 'expense' || type === 'income') {
        item.date = document.getElementById('he_date').value; item.amount = Number(document.getElementById('he_amount').value) || 0; item.currency = document.getElementById('he_currency').value; item.notes = document.getElementById('he_notes').value;
      }
      await window.Storage.save();
      window.App.closeModal();
      this.renderTable();
    });
  },

  deleteSelected() {
    const row = this.findSelected();
    if (!row) return;
    if (!confirm(`¿Eliminar este registro de ${row.label}? Esta acción no se puede deshacer.`)) return;
    if (row.type === 'extra') {
      window.DB.hunts = window.DB.hunts.filter(x => x.id !== row.id);
      window.DB.inventoryMoves = window.DB.inventoryMoves.filter(x => x.refId !== row.id);
    } else if (row.type === 'buy' || row.type === 'sell') {
      window.DB.market = window.DB.market.filter(x => x.id !== row.id);
      window.DB.inventoryMoves = window.DB.inventoryMoves.filter(x => x.refId !== row.id);
    } else if (row.type === 'expense' || row.type === 'income') {
      window.DB.ledger = window.DB.ledger.filter(x => x.id !== row.id);
    }
    this.selectedId = null;
    window.Storage.save();
    this.renderTable();
  },

  afterRender() {
    this.renderTable();
    document.getElementById('hi_type').addEventListener('change', (e) => { this.filters.type = e.target.value; this.renderTable(); });
    document.getElementById('hi_from').addEventListener('change', (e) => { this.filters.from = e.target.value; this.renderTable(); });
    document.getElementById('hi_to').addEventListener('change', (e) => { this.filters.to = e.target.value; this.renderTable(); });
    document.getElementById('hi_q').addEventListener('input', (e) => { this.filters.q = e.target.value; this.renderTable(); });
    document.getElementById('hi_edit').addEventListener('click', () => this.editSelected());
    document.getElementById('hi_delete').addEventListener('click', () => this.deleteSelected());
    document.getElementById('hi_exportBackup').addEventListener('click', async () => {
      const res = await window.Storage.exportBackup();
      if (res.ok) alert('Respaldo exportado en: ' + res.path);
    });
    document.getElementById('hi_importBackup').addEventListener('click', async () => {
      if (!confirm('Importar un respaldo reemplazará TODOS los datos actuales. ¿Continuar?')) return;
      const ok = await window.Storage.importBackup();
      if (ok) window.App.render();
    });
  }
};
