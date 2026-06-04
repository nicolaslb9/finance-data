// ===== N&J Budget — Sinking Funds Module =====

function loadSinkingFunds() {
  // Only replace defaults if GitHub/localStorage has actual data
  if (savings.sinkingFunds && savings.sinkingFunds.length) {
    sinkingFunds = savings.sinkingFunds;
  }
  // If still empty (no GitHub data yet), keep the defaults defined at top
  syncProvisionBudget();
}

function saveSinkingFunds() {
  savings.sinkingFunds = sinkingFunds;
  autoSave();
}

function totalSinkingMonthly() {
  return (sinkingFunds||[]).reduce((s,f)=>s+(+f.monthlyContribution||0),0);
}

function sfAddMonthlyAll() {
  loadSinkingFunds();
  const month = new Date().toISOString().slice(0, 7); // e.g. "2026-06"

  // Check if already contributed this month
  const alreadyDone = sinkingFunds.every(f => f.lastContribution === month);
  if (alreadyDone) {
    if (!confirm('Você já adicionou os $100 este mês. Adicionar novamente?')) return;
  }

  sinkingFunds.forEach(f => {
    f.balance = (+f.balance || 0) + (+f.monthlyContribution || 0);
    f.lastContribution = month;
  });
  saveSinkingFunds();
  renderProvisions();
}

// ── Use money from a category ────────────────────────────────────────────────
function sfUse(id) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f) return;
  const bal = +f.balance || 0;
  if (bal <= 0) { alert('Saldo zerado nesta categoria.'); return; }

  const em = SF_EMOJI[f.id] || "";
  const amtStr = prompt(`Quanto você gastou em "${em} ${f.name}"?\n(Saldo disponível: $${bal.toFixed(0)})`, '');
  if (!amtStr) return;
  const amt = parseFloat(amtStr);
  if (isNaN(amt) || amt <= 0) return;

  const desc = prompt('O que foi? (ex: Troca de óleo, Dentista...)', '') || '';

  f.balance = Math.max(0, bal - amt);
  if (!f.history) f.history = [];
  f.history.unshift({ date: new Date().toISOString().slice(0, 10), amount: amt, desc });
  if (f.history.length > 10) f.history.length = 10;

  saveSinkingFunds();
  renderProvisions();
}

// ── Edit monthly contribution ────────────────────────────────────────────────
function sfSetTotal(newTotal) {
  // Redistribute newTotal proportionally across categories
  if (!sinkingFunds.length) return;
  const currentTotal = sinkingFunds.reduce((s,f) => s + (+f.monthlyContribution||0), 0);
  if (currentTotal === 0) {
    // If all zero, split equally
    const each = Math.floor(newTotal / sinkingFunds.length);
    sinkingFunds.forEach((f,i) => {
      f.monthlyContribution = (i === sinkingFunds.length-1)
        ? newTotal - each*(sinkingFunds.length-1)
        : each;
    });
  } else {
    // Scale proportionally
    let allocated = 0;
    sinkingFunds.forEach((f, i) => {
      if (i === sinkingFunds.length - 1) {
        f.monthlyContribution = Math.max(0, newTotal - allocated);
      } else {
        const scaled = Math.round((+f.monthlyContribution||0) / currentTotal * newTotal);
        f.monthlyContribution = scaled;
        allocated += scaled;
      }
    });
  }
  saveSinkingFunds();
  syncProvisionBudget();
  // Also update the budget provision line for current month
  const provItem = md().budget.find(b => b.type === 'provision');
  if (provItem) { provItem.budget = newTotal; autoSave(); }
  renderProvisions();
  renderBudgetOverview();
}

function sfEditContribDirect(id, val) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f || isNaN(val) || val < 0) return;
  f.monthlyContribution = val;
  saveSinkingFunds();
  syncProvisionBudget();
  // Update budget provision line
  const provItem = md().budget.find(b => b.type === 'provision');
  if (provItem) { provItem.budget = totalSinkingMonthly(); autoSave(); }
  renderProvisions();
  renderBudgetOverview();
}

function sfEditContrib(id) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f) return;
  const val = parseFloat(prompt(
    `Contribuição mensal para "${f.name}" ($):`,
    f.monthlyContribution
  ));
  if (!isNaN(val) && val >= 0) {
    f.monthlyContribution = val;
    saveSinkingFunds();
    syncProvisionBudget();
    renderProvisions();
  }
}

// ── Delete category ──────────────────────────────────────────────────────────
function sfSetBalance(id, val) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f) return;
  f.balance = Math.max(0, val);
  saveSinkingFunds();
  // re-render metrics only (avoid full re-render that resets focus)
  const totalBal = sinkingFunds.reduce((s,f)=>s+(+f.balance||0),0);
  const metEl = document.getElementById('sf-metrics');
  if (metEl) {
    const totalAlloc = sinkingFunds.reduce((s,f)=>s+(+f.monthlyContribution||0),0);
    const unalloc = 100 - totalAlloc;
    const curMonth = new Date().toISOString().slice(0,7);
    const contributed = sinkingFunds.every(f=>f.lastContribution===curMonth);
    metEl.innerHTML = `
      <div class="metric"><div class="lbl">Saldo acumulado</div><div class="val" style="color:var(--green)">${fmt(totalBal)}</div><div class="sub">disponível para usar</div></div>
      <div class="metric"><div class="lbl">Total/mês</div><div class="val" style="color:#f59e0b">$${totalAlloc}</div><div class="sub">soma das categorias</div></div>
      <div class="metric"><div class="lbl">Este mês</div><div class="val" style="font-size:18px">${contributed?'✅':'⏳'}</div><div class="sub">${contributed?'contribuição feita':'pendente'}</div></div>
    `;
  }
}

function sfDeleteCategory(id) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f || !confirm(`Excluir "${f.icon} ${f.name}"? O saldo de ${fmt(f.balance||0)} será perdido.`)) return;
  sinkingFunds = sinkingFunds.filter(x => x.id !== id);
  saveSinkingFunds();
  renderProvisions();
}

// ── Add new category ─────────────────────────────────────────────────────────
function sfAddCategory() {
  const name = prompt('Nome da categoria:');
  if (!name || !name.trim()) return;
  const contrib = parseFloat(prompt('Contribuição mensal ($):', '0')) || 0;
  sinkingFunds.push({
    id: Date.now(), name: name.trim(), icon: '📦',
    balance: 0, monthlyContribution: contrib,
    note: '', history: []
  });
  saveSinkingFunds();
  renderProvisions();
}

// ── Main render ──────────────────────────────────────────────────────────────
function addSinkingFund() { sfAddCategory(); }

// ═══════════════════════════════════════════════════════
// CAR DEBT
// ═══════════════════════════════════════════════════════
function renameSinkingFund(id) {
  const f = sinkingFunds.find(x => x.id === id);
  if (!f) return;
  const v = prompt('Renomear categoria:', f.name);
  if (v !== null && v.trim()) {
    // Split leading emoji if present
    const parts = v.trim().match(/^(\p{Emoji}\uFE0F?)?\s*(.*)$/u);
    if (parts && parts[1]) { f.icon = parts[1]; f.name = parts[2]; }
    else { f.name = v.trim(); }
    saveSinkingFunds(); renderProvisions();
  }
}

// Wraps any emoji characters in a .emo span so they always render in color
