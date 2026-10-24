/**
 * inventory.js
 * Módulo 4: Inventario central de RC.
 * RC disponibles = obtenidos por hunts + comprados - vendidos - usados
 */

window.InventoryModule = {

  summary() {
    const moves = window.DB.inventoryMoves;
    const sum = (type) => moves.filter(m => m.type === type).reduce((a, m) => a + (Number(m.qty) || 0), 0);
    const fromHunts = sum('HUNT_RC_IN');
    const bought = sum('MARKET_BUY_RC');
    const sold = sum('MARKET_SELL_RC');
    const used = sum('RC_USE');
    const available = fromHunts + bought - sold - used;
    return { fromHunts, bought, sold, used, available };
  },

  estimatedValue(pricePerRc) {
    const { available } = this.summary();
    return available * (Number(pricePerRc) || 0);
  },

  useRc(qty, date, note) {
    window.DB.inventoryMoves.push({
      id: window.Storage.uid(), type: 'RC_USE', qty: Number(qty),
      date: date || new Date().toISOString().slice(0, 10), note: note || 'Uso manual de RC'
    });
    window.Storage.save();
  },

  render() {
    const s = this.summary();
    const lastPrice = window.DB.config.lastInventoryPrice || 0;
    return `
      <h1 class="view-title">Inventario de RC</h1>
      <p class="view-sub">Vista central del stock de RC, separado de dinero real.</p>

      <div class="grid grid-cards">
        <div class="card"><h3>RC disponibles</h3><div class="value blue">${window.Fmt.num(s.available)}</div></div>
        <div class="card"><h3>Obtenidos por hunts</h3><div class="value">${window.Fmt.num(s.fromHunts)}</div></div>
        <div class="card"><h3>Comprados en mercado</h3><div class="value">${window.Fmt.num(s.bought)}</div></div>
        <div class="card"><h3>Vendidos</h3><div class="value">${window.Fmt.num(s.sold)}</div></div>
        <div class="card"><h3>Utilizados</h3><div class="value">${window.Fmt.num(s.used)}</div></div>
      </div>

      <div class="section">
        <h2>Valor estimado del inventario</h2>
        <div class="grid grid-2">
          <div class="field">
            <label>Valor estimado por RC (gold)</label>
            <input type="number" id="inv_price" value="${lastPrice}">
          </div>
          <div class="card" style="align-self:end;">
            <h3>Valor estimado total</h3>
            <div class="value blue" id="inv_estValue">${window.Fmt.num(this.estimatedValue(lastPrice))} gold</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Usar RC (descontar del inventario)</h2>
        <div class="grid grid-3">
          <div class="field"><label>Cantidad a usar</label><input type="number" id="inv_useQty"></div>
          <div class="field"><label>Fecha</label><input type="date" id="inv_useDate" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="field"><label>Nota</label><input type="text" id="inv_useNote" placeholder="opcional"></div>
        </div>
        <button class="btn" id="inv_useBtn">Registrar uso</button>
      </div>

      <div class="section">
        <h2>Movimientos de inventario</h2>
        <div class="table-wrap" id="inv_moves"></div>
      </div>
    `;
  },

  renderMoves() {
    const rows = window.DB.inventoryMoves.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!rows.length) {
      document.getElementById('inv_moves').innerHTML = `<div class="empty-state">Sin movimientos todavía.</div>`;
      return;
    }
    const labels = { HUNT_RC_IN: 'Hunt (ingreso)', MARKET_BUY_RC: 'Compra mercado', MARKET_SELL_RC: 'Venta mercado', RC_USE: 'Uso manual' };
    const trs = rows.slice(0, 200).map(m => `<tr>
      <td>${m.date}</td><td>${labels[m.type] || m.type}</td><td>${window.Fmt.num(m.qty)}</td><td>${m.note || ''}</td>
    </tr>`).join('');
    document.getElementById('inv_moves').innerHTML = `
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Nota</th></tr></thead><tbody>${trs}</tbody></table>
    `;
  },

  afterRender() {
    this.renderMoves();
    document.getElementById('inv_price').addEventListener('input', (e) => {
      const v = Number(e.target.value) || 0;
      window.DB.config.lastInventoryPrice = v;
      document.getElementById('inv_estValue').textContent = window.Fmt.num(this.estimatedValue(v)) + ' gold';
      window.Storage.save();
    });
    document.getElementById('inv_useBtn').addEventListener('click', () => {
      const qty = document.getElementById('inv_useQty').value;
      if (!qty || Number(qty) <= 0) { alert('Ingresá una cantidad válida.'); return; }
      this.useRc(qty, document.getElementById('inv_useDate').value, document.getElementById('inv_useNote').value);
      window.App.render();
    });
  }
};
