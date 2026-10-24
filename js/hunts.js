/**
 * hunts.js
 * Módulo 3: Hunts. Los RC obtenidos entran al inventario pero NO se
 * consideran capital invertido automáticamente.
 */

window.HuntsModule = {
  addHunt(extra) {
    extra.id = window.Storage.uid();
    extra.createdAt = new Date().toISOString();
    extra.rc = Number(extra.rc) || 0;
    extra.goldSpent = 0;
    extra.otherIncome = 0;
    extra.otherExpense = 0;
    extra.estimatedValuePerRc = 0;
    window.DB.hunts.push(extra);
    window.DB.inventoryMoves.push({
      id: window.Storage.uid(), type: 'HUNT_RC_IN', qty: extra.rc,
      date: extra.date, refId: extra.id, note: 'RC obtenidos como extra'
    });
    window.Storage.save();
  },
  deleteHunt(id) {
    window.DB.hunts = window.DB.hunts.filter(h => h.id !== id);
    window.DB.inventoryMoves = window.DB.inventoryMoves.filter(m => m.refId !== id);
    window.Storage.save();
  },
  render() {
    return `<h1 class="view-title">Extra</h1><p class="view-sub">RC obtenidos jugando o farmeando. No modifica tu capital ni tu dinero invertido.</p>`;
  },
  afterRender() {}
};
