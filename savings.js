// ===== N&J Budget — Savings, Goals & Wallets Module =====

function depositsForLink(linkId) {
  if (!linkId) return 0;
  let total = 0;
  for (const mk in data) {
    const month = data[mk];
    if (!month.transactions) continue;
    for (const tx of month.transactions) {
      if (tx.cat === linkId) total += (+tx.amount || 0);
    }
  }
  return total;
}

// Effective wallet balance = starting balance + linked deposits
function walletBalance(w) {
  // Base value (manually set / starting) + auto deposits from linked budget category
  const base = (+w.startingBalance || 0);
  const deposits = w.linkId ? depositsForLink(w.linkId) : 0;
  return base + deposits;
}

// When user manually edits the displayed balance, adjust the base so the
// new total matches what they typed (keeping the auto deposits intact)
function setWalletManual(id, newValue) {
  const w = savings.wallets.find(x => x.id === id);
  if (!w) return;
  const deposits = w.linkId ? depositsForLink(w.linkId) : 0;
  w.startingBalance = (+newValue || 0) - deposits; // base absorbs the difference
  w.amount = (+newValue || 0);
  renderWallets();
  renderWalletPie();
  renderSavingsMetrics();
  autoSave();
}

function addWallet() { savings.wallets.push({id:nextId++,name:'Nova conta',amount:0}); renderWallets(); autoSave(); }

function addGoal() { savings.goals.push({id:nextId++,name:'Nova meta',target:1000,saved:0,monthly:100,priority:5}); renderGoals(); renderSavingsMetrics(); autoSave(); }

function renameWallet(id) {
  const w = savings.wallets.find(x => x.id === id);
  if (!w) return;
  const v = prompt('Renomear conta (pode usar emoji):', w.name);
  if (v !== null && v.trim()) { w.name = v.trim(); renderWallets(); renderWalletPie(); autoSave(); }
}

function renameGoal(id) {
  const g = savings.goals.find(x => x.id === id);
  if (!g) return;
  const v = prompt('Renomear meta (pode usar emoji):', g.name);
  if (v !== null && v.trim()) { g.name = v.trim(); renderGoals(); autoSave(); }
}

