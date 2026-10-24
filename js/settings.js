/**
 * settings.js
 * Módulo 12: Configuración general.
 */

window.SettingsModule = {

  render() {
    const c = window.DB.config;
    return `
      <h1 class="view-title">Configuración</h1>
      <div class="section">
        <h2>Datos del jugador</h2>
        <div class="grid grid-2">
          <div class="field"><label>Nombre del jugador</label><input type="text" id="cf_playerName" value="${c.playerName || ''}"></div>
          <div class="field"><label>Personaje</label><input type="text" id="cf_character" value="${c.character || ''}"></div>
        </div>
      </div>

      <div class="section">
        <h2>Valores predeterminados</h2>
        <div class="grid grid-2">
          <div class="field"><label>Moneda</label>
            <select id="cf_currency">
              <option value="USD" ${c.currency==='USD'?'selected':''}>USD</option>
              <option value="EUR" ${c.currency==='EUR'?'selected':''}>EUR</option>
              <option value="ARS" ${c.currency==='ARS'?'selected':''}>ARS</option>
            </select>
          </div>
          <div class="field"><label>Comisión predeterminada (%)</label><input type="number" id="cf_commission" value="${c.defaultCommission}"></div>
          <div class="field"><label>Valor de compra — 25 RC (USD)</label><input type="number" step="0.01" min="0" id="cf_rcBuyUsd" value="${c.rcBuyUsdPerPackage ?? 0.45}"></div>
          <div class="field"><label>Valor de venta — 25 RC (USD)</label><input type="number" step="0.01" min="0" id="cf_rcSellUsd" value="${c.rcSellUsdPerPackage ?? 0.45}"></div>
          <div class="field"><label>Base de operaciones RC</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
          <div class="field"><label>Formato de números</label>
            <select id="cf_numberFormat">
              <option value="es-AR" ${c.numberFormat==='es-AR'?'selected':''}>1.234,56 (es-AR)</option>
              <option value="en-US" ${c.numberFormat==='en-US'?'selected':''}>1,234.56 (en-US)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Apariencia</h2>
        <div class="chip-row">
          <span class="chip ${c.theme==='dark'?'active':''}" data-theme="dark">Oscuro</span>
          <span class="chip ${c.theme==='light'?'active':''}" data-theme="light">Claro (próximamente)</span>
        </div>
      </div>

      <div class="section">
        <h2>Datos y respaldo</h2>
        <p class="view-sub">Todos los datos se guardan localmente en tu computadora. Nada se envía a internet.</p>
        <div class="chip-row">
          <button class="btn secondary" id="cf_exportBackup">Exportar respaldo</button>
          <button class="btn secondary" id="cf_importBackup">Importar respaldo</button>
          <button class="btn danger" id="cf_reset">Borrar todos los datos</button>
        </div>
      </div>

      <button class="btn" id="cf_save">Guardar configuración</button>
    `;
  },

  afterRender() {
    document.getElementById('cf_save').addEventListener('click', () => {
      window.DB.config = Object.assign({}, window.DB.config, {
        playerName: document.getElementById('cf_playerName').value,
        character: document.getElementById('cf_character').value,
        currency: document.getElementById('cf_currency').value,
        defaultCommission: document.getElementById('cf_commission').value,
        defaultRcPerPackage: 25,
        rcBuyUsdPerPackage: Number(document.getElementById('cf_rcBuyUsd').value) || 0,
        rcSellUsdPerPackage: Number(document.getElementById('cf_rcSellUsd').value) || 0,
        numberFormat: document.getElementById('cf_numberFormat').value
      });
      window.Storage.save();
      alert('Configuración guardada.');
    });

    document.querySelectorAll('[data-theme]').forEach(chip => {
      chip.addEventListener('click', () => {
        if (chip.dataset.theme !== 'dark') { alert('El tema claro estará disponible próximamente.'); return; }
        window.DB.config.theme = 'dark';
        window.Storage.save();
      });
    });

    document.getElementById('cf_exportBackup').addEventListener('click', async () => {
      const res = await window.Storage.exportBackup();
      if (res.ok) alert('Respaldo exportado en: ' + res.path);
    });
    document.getElementById('cf_importBackup').addEventListener('click', async () => {
      if (!confirm('Importar un respaldo reemplazará TODOS los datos actuales. ¿Continuar?')) return;
      const ok = await window.Storage.importBackup();
      if (ok) window.App.render();
    });
    document.getElementById('cf_reset').addEventListener('click', () => {
      if (confirm('¿Seguro que querés borrar TODOS los datos? Esta acción no se puede deshacer.')) {
        if (confirm('Confirmá nuevamente: se perderán hunts, operaciones, inventario y cierres.')) {
          window.DB.market = []; window.DB.hunts = []; window.DB.inventoryMoves = [];
          window.DB.cashClosures = []; window.DB.ledger = [];
          window.Storage.save();
          window.App.render();
        }
      }
    });
  }
};
