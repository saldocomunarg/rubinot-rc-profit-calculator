/**
 * reinvestment.js
 * Módulo 8: Reinversión. Simulador de crecimiento operación por operación
 * con objetivos de capital. Es una simulación matemática, no una promesa
 * de resultados futuros.
 */

window.ReinvestmentModule = {

  state: {
    capitalInicial: 9,
    inversionPorOp: 9,
    rentabilidadPct: 7.73,
    reinvestPct: 100,
    rcPerPackage: 25,
    buyPricePerPackage: 86600,
    operaciones: 20
  },

  goals: [20, 50, 100, 250, 500, 1000],

  simulate(s) {
    const rows = [];
    let capital = Number(s.capitalInicial) || 0;
    for (let i = 1; i <= (Number(s.operaciones) || 0); i++) {
      const capitalInicial = capital;
      const inversion = Math.min(Number(s.inversionPorOp) || 0, capitalInicial);
      const ganancia = inversion * (Number(s.rentabilidadPct) || 0) / 100;
      const reinvestido = ganancia * (Number(s.reinvestPct) || 0) / 100;
      const retirada = ganancia - reinvestido;
      const capitalFinal = capitalInicial - inversion + inversion + reinvestido; // capital que queda operando + reinversión
      const rcAdquiridos = (Number(s.rcPerPackage) || 0) * (Number(s.buyPricePerPackage) > 0 ? inversion / Number(s.buyPricePerPackage) : 0);
      rows.push({ n: i, capitalInicial, inversion, ganancia, reinvestido, retirada, capitalFinal, rcAdquiridos });
      capital = capitalFinal;
    }
    return rows;
  },

  operationsToReachGoal(s, goal) {
    let capital = Number(s.capitalInicial) || 0;
    let n = 0;
    const maxIter = 5000;
    while (capital < goal && n < maxIter) {
      const inversion = Math.min(Number(s.inversionPorOp) || 0, capital);
      if (inversion <= 0) return null;
      const ganancia = inversion * (Number(s.rentabilidadPct) || 0) / 100;
      const reinvertido = ganancia * (Number(s.reinvestPct) || 0) / 100;
      capital = capital + reinvertido;
      n++;
    }
    return capital >= goal ? n : null;
  },

  render() {
    const s = this.state;
    return `
      <h1 class="view-title">Reinversión</h1>
      <p class="view-sub">Simulador de crecimiento operación por operación. Es una simulación matemática y NO una garantía de ganancias futuras.</p>

      <div class="section">
        <h2>Parámetros de simulación</h2>
        <div class="grid grid-3">
          <div class="field"><label>Capital inicial</label><input type="number" step="0.01" id="ri_capitalInicial" value="${s.capitalInicial}"></div>
          <div class="field"><label>Inversión por operación</label><input type="number" step="0.01" id="ri_inversionPorOp" value="${s.inversionPorOp}"></div>
          <div class="field"><label>Rentabilidad por operación (%)</label><input type="number" step="0.01" id="ri_rentabilidadPct" value="${s.rentabilidadPct}"></div>
          <div class="field">
            <label>Porcentaje de reinversión</label>
            <div class="chip-row" id="ri_reinvestChips">
              ${[0, 25, 50, 75, 100].map(p => `<span class="chip ${Number(s.reinvestPct) === p ? 'active' : ''}" data-pct="${p}">${p}%</span>`).join('')}
            </div>
            <input type="number" id="ri_reinvestPct" value="${s.reinvestPct}" style="margin-top:6px;">
          </div>
          <div class="field"><label>Base de operación</label><input type="text" value="25 RC por lote (fijo)" disabled></div>
          <div class="field"><label>Precio de compra por 1 RC (gold)</label><input type="number" id="ri_buyPrice" value="${s.buyPricePerPackage}"></div>
          <div class="field">
            <label>Cantidad de operaciones</label>
            <div class="chip-row" id="ri_opsChips">
              ${[5, 10, 20, 50, 100].map(p => `<span class="chip ${Number(s.operaciones) === p ? 'active' : ''}" data-n="${p}">${p}</span>`).join('')}
            </div>
            <input type="number" id="ri_operaciones" value="${s.operaciones}" style="margin-top:6px;">
          </div>
        </div>
        <button class="btn" id="ri_run">Simular</button>
      </div>

      <div id="ri_results"></div>

      <div class="section">
        <h2>¿Cuántas operaciones necesito para llegar a un objetivo?</h2>
        <div class="note">Calculado con los parámetros de arriba (capital inicial, inversión por operación, rentabilidad y reinversión).</div>
        <div id="ri_goals"></div>
      </div>
    `;
  },

  renderResults() {
    const s = this.state;
    const rows = this.simulate(s);
    const fmt = window.Fmt.num;
    document.getElementById('ri_results').innerHTML = `
      <div class="section">
        <h2>Resultado de la simulación (${rows.length} operaciones)</h2>
        <div class="grid grid-cards" style="margin-bottom:14px;">
          <div class="card"><h3>Capital final</h3><div class="value blue">${fmt(rows.length ? rows[rows.length-1].capitalFinal : s.capitalInicial)}</div></div>
          <div class="card"><h3>Ganancia total</h3><div class="value green">${fmt(rows.reduce((a,r)=>a+r.ganancia,0))}</div></div>
          <div class="card"><h3>Total retirado</h3><div class="value">${fmt(rows.reduce((a,r)=>a+r.retirada,0))}</div></div>
          <div class="card"><h3>Total RC adquiridos</h3><div class="value">${fmt(rows.reduce((a,r)=>a+r.rcAdquiridos,0))}</div></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Operación</th><th>Capital inicial</th><th>Inversión</th><th>Ganancia</th><th>% Reinvertido</th><th>Ganancia retirada</th><th>Capital final</th><th>RC adquiridos</th>
            </tr></thead>
            <tbody>
              ${rows.map(r => `<tr>
                <td>${r.n}</td><td>${fmt(r.capitalInicial)}</td><td>${fmt(r.inversion)}</td><td>${fmt(r.ganancia)}</td>
                <td>${s.reinvestPct}%</td><td>${fmt(r.retirada)}</td><td>${fmt(r.capitalFinal)}</td><td>${fmt(r.rcAdquiridos)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderGoals() {
    const s = this.state;
    const rows = this.goals.map(g => {
      const n = this.operationsToReachGoal(s, g);
      return `<tr><td>USD ${g}</td><td>${n === null ? 'No alcanzable con estos parámetros' : n + ' operaciones'}</td></tr>`;
    }).join('');
    document.getElementById('ri_goals').innerHTML = `
      <table><thead><tr><th>Objetivo</th><th>Operaciones necesarias</th></tr></thead><tbody>${rows}</tbody></table>
    `;
  },

  readInputs() {
    return {
      capitalInicial: document.getElementById('ri_capitalInicial').value,
      inversionPorOp: document.getElementById('ri_inversionPorOp').value,
      rentabilidadPct: document.getElementById('ri_rentabilidadPct').value,
      reinvestPct: document.getElementById('ri_reinvestPct').value,
      rcPerPackage: 25,
      buyPricePerPackage: document.getElementById('ri_buyPrice').value,
      operaciones: document.getElementById('ri_operaciones').value
    };
  },

  afterRender() {
    this.renderResults();
    this.renderGoals();

    document.getElementById('ri_run').addEventListener('click', () => {
      this.state = this.readInputs();
      window.DB.config.lastReinvestState = this.state;
      window.Storage.save();
      this.renderResults();
      this.renderGoals();
    });

    document.getElementById('ri_reinvestChips').querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => { document.getElementById('ri_reinvestPct').value = chip.dataset.pct; });
    });
    document.getElementById('ri_opsChips').querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => { document.getElementById('ri_operaciones').value = chip.dataset.n; });
    });
  }
};
