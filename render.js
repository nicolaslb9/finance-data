// ===== N&J Budget — Render Module (all renderX functions) =====

function render() {
  renderMetrics();
  renderDonutChart();
  renderBars();
  renderCatChart();
  renderAlerts();
  renderHistory();
  renderIncomeList();
  syncProvisionBudget();
  renderBudgetList();
  renderBudgetOverview();
  renderTxTimeline();
  renderTopCats();
  renderTxList();
  renderSavingsMetrics();
  renderWalletPie();
  renderWallets();
  renderGoals();
  renderRecommendations();
  renderPhasesPlan();
  renderRetirementProjection();
}

function renderMetrics() {
  const inc = totalIncome();
  const spAll = md().budget.reduce((s,b)=>s+spentForCat(b.id),0);
  const budAll = md().budget.reduce((s,b)=>s+(+b.budget||0),0);
  const left = inc - spAll;
  const svBud = totalByType('savings');
  const pctSpent = budAll > 0 ? Math.round(spAll/budAll*100) : 0;
  document.getElementById('metrics').innerHTML = `
    <div class="metric">
      <div class="lbl">Renda</div>
      <div class="val" style="color:var(--green)">${fmt(inc)}</div>
      <div class="sub">${md().income.length} fontes</div>
    </div>
    <div class="metric">
      <div class="lbl">Total gasto</div>
      <div class="val">${fmt(spAll)}</div>
      <div class="sub">${pctSpent}% do orçado</div>
    </div>
    <div class="metric">
      <div class="lbl">Disponível</div>
      <div class="val" style="color:${left>=0?'var(--green)':'var(--red)'}">${fmtSigned(left)}</div>
      <div class="sub">${left>=0?'dentro do limite':'acima do limite'}</div>
    </div>
    <div class="metric">
      <div class="lbl">Savings / mês</div>
      <div class="val" style="color:#7c3aed">${fmt(svBud)}</div>
      <div class="sub">meta mensal</div>
    </div>
  `;
}

function renderAlerts() {
  const over = md().budget.filter(b => spentForCat(b.id) > (+b.budget||0) && b.budget > 0);
  let h = '';
  if (over.length) {
    over.forEach(b => { const ex = spentForCat(b.id) - b.budget; h += `<div class="alert alert-over">⚠ <strong>${esc(b.name)}</strong> ultrapassou em ${fmt(ex)}</div>`; });
  } else {
    h = '<div class="alert alert-ok">✓ Tudo dentro do orçamento!</div>';
  }
  const unalloc = totalIncome() - md().budget.reduce((s,b)=>s+(+b.budget||0),0);
  if (unalloc > 0) h += `<div class="alert alert-info">💰 ${fmt(unalloc)} ainda não alocados</div>`;
  const pct = totalIncome() > 0 ? spentByType('savings')/totalIncome()*100 : 0;
  if (pct > 0) h += `<div class="alert" style="background:var(--purple-light);border-color:#ddd6fe;color:var(--purple)">✦ ${Math.round(pct)}% da renda em savings</div>`;
  document.getElementById('alerts').innerHTML = h;
}

function renderIncomeList() {
  let h = '';
  const total = totalIncome();
  md().income.forEach(i => {
    h += `<div class="tbl-row">
      <input type="text" value="${esc(i.label)}" onchange="getIncome(${i.id}).label=this.value;autoSave()">
      <input type="number" value="${i.amount}" min="0" onchange="getIncome(${i.id}).amount=+this.value;render();renderBudgetOverview();autoSave()">
      <button class="del-btn" onclick="removeIncome(${i.id})">×</button>
    </div>`;
  });
  document.getElementById('income-list').innerHTML = h;
  const lbl = document.getElementById('income-total-label');
  if (lbl) lbl.textContent = fmt(total) + ' total';
}

function renderBudgetMetrics() {
  const el = document.getElementById('budget-metrics');
  if (!el) return;
  const inc = totalIncome();
  const totalBud = md().budget.reduce((s,b)=>s+(+b.budget||0),0);
  const totalSpent = md().budget.reduce((s,b)=>s+spentForCat(b.id),0);
  const unalloc = inc - totalBud;
  const allocPct = inc > 0 ? Math.round(totalBud/inc*100) : 0;
  const spentPct = totalBud > 0 ? Math.round(totalSpent/totalBud*100) : 0;
  const svBud = totalByType('savings');
  const svPct = inc > 0 ? Math.round(svBud/inc*100) : 0;

  el.innerHTML = `
    <div class="metric">
      <div class="lbl">Income total</div>
      <div class="val" style="color:var(--green)">${fmt(inc)}</div>
      <div class="sub">${md().income.length} fontes</div>
    </div>
    <div class="metric">
      <div class="lbl">Já alocado</div>
      <div class="val" style="color:${allocPct>=100?'var(--red)':allocPct>=90?'var(--amber)':'var(--text)'}">${fmt(totalBud)}</div>
      <div class="sub">${allocPct}% do income</div>
    </div>
    <div class="metric">
      <div class="lbl">Não alocado</div>
      <div class="val" style="color:${unalloc<0?'var(--red)':unalloc===0?'var(--green)':'var(--amber)'}">${unalloc<0?'-':''}${fmt(Math.abs(unalloc))}</div>
      <div class="sub">${unalloc<0?'acima do income':unalloc===0?'100% alocado':'ainda livre'}</div>
    </div>
    <div class="metric">
      <div class="lbl">Savings / income</div>
      <div class="val" style="color:#7c3aed">${svPct}%</div>
      <div class="sub">${fmt(svBud)}/mês</div>
    </div>
  `;
}

function renderBudgetOverviewBanner() {
  const el = document.getElementById('budget-overview-banner');
  if (!el) return;
  const inc = totalIncome();
  const totalBud = md().budget.reduce((s,b)=>s+(+b.budget||0),0);
  const unalloc = inc - totalBud;
  const allocPct = inc > 0 ? Math.round(totalBud/inc*100) : 0;

  let bannerStyle, icon, msg, sub;
  if (unalloc < 0) {
    bannerStyle = 'background:#fef2f2;border:1px solid #fecaca;color:#991b1b';
    icon = '⚠️';
    msg = `Orçamento ${fmt(Math.abs(unalloc))} acima do income`;
    sub = 'Reduza categorias ou aumente a renda para equilibrar.';
  } else if (unalloc === 0) {
    bannerStyle = 'background:#f0fdf4;border:1px solid #bbf7d0;color:#166534';
    icon = '✅';
    msg = 'Income 100% alocado — orçamento zero-based perfeito';
    sub = 'Todo o income tem um destino. Nenhum dólar sem função.';
  } else if (allocPct >= 90) {
    bannerStyle = 'background:#fffbeb;border:1px solid #fde68a;color:#92400e';
    icon = '🟡';
    msg = `${fmt(unalloc)} ainda não alocados (${100-allocPct}% do income)`;
    sub = 'Quase lá! Considere adicionar em savings ou provisões.';
  } else {
    bannerStyle = 'background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af';
    icon = '💡';
    msg = `${fmt(unalloc)} ainda não alocados (${100-allocPct}% do income)`;
    sub = `Adicione categorias até chegar em ${fmt(inc)}. Meta: cada dólar com um destino.`;
  }

  el.innerHTML = `<div style="${bannerStyle};border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px">
    <span style="font-size:20px">${icon}</span>
    <div>
      <div style="font-size:14px;font-weight:600">${msg}</div>
      <div style="font-size:12px;opacity:.8;margin-top:2px">${sub}</div>
    </div>
    <div style="margin-left:auto;text-align:right;flex-shrink:0">
      <div style="font-size:22px;font-weight:700;font-family:'Geist Mono',monospace">${allocPct}%</div>
      <div style="font-size:11px;opacity:.7">alocado</div>
    </div>
  </div>`;
}

function renderBudgetWaterfall() {
  const el = document.getElementById('budget-waterfall');
  if (!el) return;
  const inc = totalIncome();
  if (inc === 0) { el.innerHTML = '<div class="empty">Configure a renda primeiro</div>'; return; }

  const types = [
    { key: 'fixed',     label: '🏠 Despesas fixas',   color: '#94a3b8' },
    { key: 'debt',      label: '💳 Dívidas',            color: '#ef4444' },
    { key: 'savings',   label: '💰 Savings',             color: '#8b5cf6' },
    { key: 'needs',     label: '🛒 Necessidades',        color: '#22c55e' },
    { key: 'wants',     label: '🎯 Desejos',             color: '#3b82f6' },
    { key: 'provision', label: '🔧 Provisões',           color: '#f59e0b' },
  ];

  let remaining = inc;
  let h = `<div style="display:flex;flex-direction:column;gap:6px">`;

  // Income bar
  h += `<div style="display:grid;grid-template-columns:160px 1fr 90px;gap:10px;align-items:center">
    <span style="font-size:12px;font-weight:600;color:var(--text);text-align:right">💵 Income total</span>
    <div style="height:10px;background:#22c55e;border-radius:5px;width:100%"></div>
    <span style="font-size:12px;font-family:'Geist Mono',monospace;font-weight:600;color:var(--green);text-align:right">${fmt(inc)}</span>
  </div>
  <div style="border-top:1px dashed var(--border);margin:4px 0 4px 168px"></div>`;

  types.forEach(t => {
    const bud = totalByType(t.key);
    const sp = spentByType(t.key);
    if (bud === 0 && sp === 0) return;
    remaining -= bud;
    const budPct = Math.min(100, bud / inc * 100);
    const spPct = Math.min(budPct, sp / inc * 100);
    const over = sp > bud;
    h += `<div style="display:grid;grid-template-columns:160px 1fr 90px;gap:10px;align-items:center">
      <span style="font-size:12px;color:var(--text2);text-align:right">${t.label}</span>
      <div style="position:relative;height:8px;background:var(--bg4);border-radius:4px;overflow:hidden">
        <div style="position:absolute;height:100%;width:${budPct.toFixed(1)}%;background:${t.color}22;border-radius:4px"></div>
        <div style="position:absolute;height:100%;width:${spPct.toFixed(1)}%;background:${over?'#ef4444':t.color};border-radius:4px"></div>
      </div>
      <div style="text-align:right">
        <span style="font-size:12px;font-family:'Geist Mono',monospace;color:${over?'var(--red)':'var(--text2)'}">${fmt(bud)}</span>
        ${sp>0?`<span style="font-size:10px;color:${over?'var(--red)':'var(--text3)'};margin-left:4px">(${fmt(sp)})</span>`:''}
      </div>
    </div>`;
  });

  const allocPct = Math.min(100, (inc - Math.max(0, remaining)) / inc * 100);
  h += `<div style="border-top:1px dashed var(--border);margin:4px 0 4px 168px"></div>`;
  h += `<div style="display:grid;grid-template-columns:160px 1fr 90px;gap:10px;align-items:center">
    <span style="font-size:12px;font-weight:600;color:${remaining<0?'var(--red)':remaining===0?'var(--green)':'var(--amber)'};text-align:right">${remaining<0?'⚠️ Excesso':'✦ Não alocado'}</span>
    <div style="height:8px;background:${remaining<0?'#fecaca':remaining===0?'#bbf7d0':'#fde68a'};border-radius:4px;overflow:hidden">
      <div style="height:100%;width:${Math.min(100,Math.abs(remaining)/inc*100).toFixed(1)}%;background:${remaining<0?'var(--red)':remaining===0?'var(--green)':'var(--amber)'}"></div>
    </div>
    <span style="font-size:12px;font-family:'Geist Mono',monospace;font-weight:600;color:${remaining<0?'var(--red)':remaining===0?'var(--green)':'var(--amber)'};text-align:right">${remaining<0?'-':''}${fmt(Math.abs(remaining))}</span>
  </div>`;
  h += '</div>';
  el.innerHTML = h;
}

function renderBudgetTypeSummary() {
  const el = document.getElementById('budget-type-summary');
  const unallocEl = document.getElementById('budget-unalloc-label');
  if (!el) return;
  const inc = totalIncome();
  const types = ['fixed','debt','needs','wants','savings','provision'];
  let h = '';
  let totalBud = 0;
  types.forEach(t => {
    const bud = totalByType(t);
    const sp = spentByType(t);
    const pct = inc > 0 ? Math.round(bud/inc*100) : 0;
    totalBud += bud;
    h += `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${typeColor(t)};flex-shrink:0"></span>
        <span style="font-size:13px">${typeLabel(t)}</span>
        <span style="font-size:10px;background:${typeLightColor(t)};color:${typeColor(t)};padding:1px 6px;border-radius:20px;font-weight:600">${pct}%</span>
      </div>
      <div style="text-align:right">
        <span style="font-size:13px;font-weight:600;font-family:'Geist Mono',monospace">${fmt(bud)}</span>
        ${sp>0?`<div style="font-size:10px;color:var(--text3)">gasto: ${fmt(sp)}</div>`:''}
      </div>
    </div>`;
  });
  const unalloc = inc - totalBud;
  if (unalloc !== 0) {
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:13px;color:${unalloc<0?'var(--red)':'var(--amber)'}">Não alocado</span>
      <span style="font-size:13px;font-weight:600;font-family:'Geist Mono',monospace;color:${unalloc<0?'var(--red)':'var(--amber)'}">${unalloc<0?'-':''}${fmt(Math.abs(unalloc))}</span>
    </div>`;
  }
  h += `<div style="display:flex;justify-content:space-between;padding:10px 0 0">
    <span style="font-size:12px;font-weight:600;color:var(--text3)">TOTAL ALOCADO</span>
    <span style="font-size:14px;font-weight:700;font-family:'Geist Mono',monospace">${fmt(totalBud)}</span>
  </div>`;
  el.innerHTML = h;
  if (unallocEl) unallocEl.textContent = unalloc <= 0 ? '✓ 100% alocado' : fmt(unalloc) + ' livre';
}





function renderBudgetSinkingCard() {
  const el = document.getElementById('budget-sinking-card');
  if (!el) return;
  loadSinkingFunds();
  syncProvisionBudget();

  const total = totalSinkingMonthly();
  const balance = sinkingFunds.reduce((s,f) => s + (+f.balance||0), 0);
  const inc = totalIncome();
  const pct = inc > 0 ? Math.round(total/inc*100) : 0;
  const cats = [...new Set(sinkingFunds.map(f=>f.category))];
  const PROV_COLORS_LOCAL = {carro:'#ef4444',saude:'#3b82f6',casa:'#22c55e',roupas:'#ec4899',beleza:'#a855f7',social:'#f59e0b',tech:'#06b6d4',transporte:'#8b5cf6'};

  // Group totals by category for mini bars
  const bycat = {};
  sinkingFunds.forEach(f => { bycat[f.category] = (bycat[f.category]||0) + (+f.monthlyProvision||0); });

  const miniItems = Object.entries(bycat).map(([cat, amt]) => {
    const pctBar = total > 0 ? Math.round(amt/total*100) : 0;
    const color = PROV_COLORS_LOCAL[cat]||'#888';
    const LABELS = {carro:'🚗',saude:'🦷',casa:'🏠',roupas:'👗',beleza:'💅',social:'🎁',tech:'📱',transporte:'🚌'};
    return `<div style="display:flex;align-items:center;gap:6px">
      <span style="font-size:12px">${LABELS[cat]||'•'}</span>
      <div style="flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pctBar}%;background:${color};border-radius:2px"></div>
      </div>
      <span style="font-size:11px;font-family:'Geist Mono',monospace;color:#6b7280;white-space:nowrap">${fmt(amt)}</span>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px">
    <div style="display:grid;grid-template-columns:1fr auto;gap:16px;align-items:start">
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="width:10px;height:10px;background:#f59e0b;border-radius:50%;display:inline-block"></span>
          <span style="font-size:13px;font-weight:600;color:#92400e">🔧 Provisões (Sinking Funds)</span>
          <span style="font-size:10px;background:#fef3c7;color:#b45309;padding:2px 7px;border-radius:20px;font-weight:600">${pct}% do income</span>
          <button onclick="showTab('provisions')" style="margin-left:auto;font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid #f59e0b;background:transparent;color:#b45309;cursor:pointer;font-family:'Geist',sans-serif;font-weight:500">
            Ver detalhes →
          </button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${miniItems}
        </div>
      </div>
      <div style="text-align:right;border-left:1px solid #fde68a;padding-left:20px;min-width:120px">
        <div style="font-size:11px;color:#b45309;text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:4px">Provisão/mês</div>
        <div style="font-size:26px;font-weight:700;font-family:'Geist Mono',monospace;color:#92400e;line-height:1">${fmt(total)}</div>
        <div style="font-size:11px;color:#b45309;margin-top:6px">${sinkingFunds.length} categorias</div>
        <div style="font-size:11px;color:#b45309;margin-top:2px">saldo: <span style="font-weight:600">${fmt(balance)}</span></div>
      </div>
    </div>
  </div>`;
}

function renderBudgetOverview() {
  renderBudgetSinkingCard();
  renderBudgetOverviewBanner();
  renderBudgetMetrics();
  renderBudgetPieChart();
  renderBudgetSummaryChart();
  renderBudgetWaterfall();
  renderBudgetTypeSummary();
  syncBudgetMonthSelect();
}

function renderBudgetList() {
  const TYPE_ORDER = {debt:0, fixed:1, savings:2, needs:3, provision:4, wants:5};
  const sorted = [...md().budget].sort((a,b) => (TYPE_ORDER[a.type]??9) - (TYPE_ORDER[b.type]??9));
  let h = '';
  sorted.forEach(b => {
    const sp = spentForCat(b.id);
    const bal = (+b.budget||0) - sp;
    const over = bal < 0;
    h += `<div class="tbl-row">
      <div style="display:flex;align-items:center;gap:4px;min-width:0">
        <span style="flex:1;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(b.name)}">${catLabel(b.id, b.name)}</span>
        <button class="rename-btn" onclick="renameBudget(${b.id})" title="Renomear">⋯</button>
      </div>
      <select onchange="getBudget(${b.id}).type=this.value;render();autoSave()">
        ${['fixed','debt','needs','wants','savings'].map(t=>`<option value="${t}"${b.type===t?' selected':''}>${typeLabel(t)}</option>`).join('')}
      </select>
      <input type="number" value="${b.budget}" min="0" onchange="getBudget(${b.id}).budget=+this.value;render();autoSave()">
      <span class="budget-spent-col" style="font-family:'Geist Mono',monospace;font-size:12px;color:var(--text2)">${fmt(sp)}</span>
      <span class="budget-bal-col" style="font-family:'Geist Mono',monospace;font-size:12px;color:${over?'var(--red)':bal>0?'var(--green)':'var(--text3)'}">${over?'-':''}${fmt(Math.abs(bal))}</span>
      <button class="del-btn" onclick="removeBudget(${b.id})">×</button>
    </div>`;
  });
  document.getElementById('budget-list').innerHTML = h;
}

function renderTxTimeline() {
  destroyChart('tx-timeline');
  const txs = md().transactions;
  if (txs.length === 0) return;
  const byDay = {};
  txs.forEach(tx => { byDay[tx.date] = (byDay[tx.date]||0) + (+tx.amount||0); });
  const days = Object.keys(byDay).sort();
  let cumulative = 0;
  const cumData = days.map(d => { cumulative += byDay[d]; return cumulative; });
  const ctx = document.getElementById('chart-tx-timeline').getContext('2d');
  charts['tx-timeline'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5)),
      datasets: [{
        label: 'Gasto acumulado', data: cumData,
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.06)',
        borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#2563eb'
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Acumulado: ${fmt(ctx.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Geist Mono', size: 10 }, color: '#a8a8a2' } },
        y: { grid: { color: '#f0f0ee' }, ticks: { font: { family: 'Geist Mono', size: 10 }, color: '#a8a8a2', callback: v => '$'+v } }
      }
    }
  });
}

function renderTopCats() {
  const cats = md().budget.map(b => ({...b, spent: spentForCat(b.id)})).filter(b=>b.spent>0).sort((a,b)=>b.spent-a.spent);
  const maxSpent = cats[0]?.spent || 1;
  let h = '';
  if (cats.length === 0) { h = '<div class="empty">Sem gastos ainda</div>'; }
  cats.forEach(b => {
    const pct = Math.round(b.spent/maxSpent*100);
    h += `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:12px;font-weight:500">${esc(b.name)}</span>
        <span style="font-size:12px;font-family:'Geist Mono',monospace;color:var(--text2)">${fmt(b.spent)}</span>
      </div>
      <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${typeColor(b.type)};border-radius:3px;transition:width .4s"></div>
      </div>
    </div>`;
  });
  document.getElementById('top-cats').innerHTML = h;
  document.getElementById('tx-count').textContent = md().transactions.length + ' transações';
}

function renderTxList() {
  const sorted = [...md().transactions].sort((a,b)=>b.date.localeCompare(a.date));
  let h = '';
  if (sorted.length === 0) {
    h = '<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8M8 8h5"/></svg>Nenhum gasto ainda. Clique em "+ Adicionar gasto"</div>';
  }
  sorted.forEach(tx => {
    const cat = md().budget.find(b=>b.id===tx.cat)||{name:'—',type:'needs'};
    h += `<div class="tbl-row">
      <input type="date" value="${tx.date}" onchange="getTx(${tx.id}).date=this.value;render();autoSave()">
      <select onchange="getTx(${tx.id}).cat=+this.value;render();autoSave()">
        ${md().budget.map(b=>`<option value="${b.id}"${b.id===tx.cat?' selected':''}>${esc(b.name)}</option>`).join('')}
      </select>
      <input type="text" class="tx-desc-col" value="${esc(tx.desc)}" placeholder="Descrição" onchange="getTx(${tx.id}).desc=this.value;autoSave()">
      <input type="number" value="${tx.amount}" min="0" step="0.01" onchange="getTx(${tx.id}).amount=+this.value;render();autoSave()">
      <span class="tx-type-col"><span class="badge badge-${cat.type}">${typeLabel(cat.type)}</span></span>
      <button class="del-btn" onclick="removeTx(${tx.id})">×</button>
    </div>`;
  });
  document.getElementById('tx-list').innerHTML = h;
}

function renderSavingsMetrics() {
  const total = savings.wallets.reduce((s,w)=>s+(+w.amount||0),0);
  const retirementTotal = savings.wallets.filter(w=>['TFSA','Canada Life','Aposentadoria','RRP'].some(k=>w.name.includes(k))).reduce((s,w)=>s+(+w.amount||0),0);
  const urgentGoals = savings.goals.filter(g=>g.monthly>0);
  const monthlyAllocated = urgentGoals.reduce((s,g)=>s+(+g.monthly||0),0);
  const income = (savings._income_total)||8511;
  const savePct = income>0?Math.round(monthlyAllocated/income*100):0;

  // Wealthsimple Cash = wallets que ficam na cash account
  const wsCashIds = [50, 51, 1002, 1006, 1010, 1000, 3066];
  const wsCashTotal = savings.wallets
    .filter(w => wsCashIds.includes(w.id))
    .reduce((s,w)=>s+(+w.amount||0),0);

  document.getElementById('savings-metrics').innerHTML = `
    <div class="metric"><div class="lbl">Total guardado</div><div class="val" style="color:var(--green)">${fmt(total)}</div><div class="sub">em todas as contas</div></div>
    <div class="metric"><div class="lbl">Para aposentadoria</div><div class="val" style="color:#7c3aed">${fmt(retirementTotal)}</div><div class="sub">TFSA + Canada Life</div></div>
    <div class="metric"><div class="lbl">Wealthsimple Cash</div><div class="val" style="color:#0ea5e9">${fmt(wsCashTotal)}</div><div class="sub">Emergency · Japan · Baby · BR · Dental · College</div></div>
    <div class="metric"><div class="lbl">Alocado/mês</div><div class="val">${fmt(monthlyAllocated)}</div><div class="sub">${savePct}% da renda</div></div>
    <div class="metric"><div class="lbl">Metas ativas</div><div class="val">${savings.goals.length}</div><div class="sub">${savings.goals.filter(g=>{const p=g.target>0?g.saved/g.target:0;return p>=1;}).length} concluídas</div></div>
  `;
}

function renderWalletPie() {
  destroyChart('wallet-pie');
  const ws = savings.wallets.filter(w=>w.amount>0);
  if (ws.length === 0) return;
  const colors = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#84cc16','#a78bfa'];
  const ctx = document.getElementById('chart-wallet-pie').getContext('2d');
  charts['wallet-pie'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ws.map(w=>w.name.length>22?w.name.slice(0,22)+'…':w.name),
      datasets: [{ data: ws.map(w=>w.amount), backgroundColor: colors.slice(0,ws.length), borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } } } }
  });
}

// Sum of all deposits made to a linked savings category across ALL months
function renderWallets() {
  let h = '';
  const colors = ['#3b82f6','#8b5cf6','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#14b8a6','#f97316','#84cc16','#a78bfa'];
  // Sync linked wallet amounts before rendering
  savings.wallets.forEach(w => { w.amount = walletBalance(w); });
  savings.wallets.forEach((w,i) => {
    const color = colors[i % colors.length];
    const total = savings.wallets.reduce((s,x)=>s+(+x.amount||0),0);
    const pct = total>0?Math.round((+w.amount||0)/total*100):0;
    const linked = !!w.linkId;
    h += `<div class="wallet-row">
      <div style="display:flex;align-items:center;gap:8px;flex:1">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
        <span class="wallet-name" style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(w.name)}">${walletLabel(w.id, w.name)}</span>
        ${linked?'<span title=\"Vinculado ao orçamento\" style=\"font-size:11px\">🔗</span>':''}
        <button class="rename-btn" onclick="renameWallet(${w.id})" title="Renomear">⋯</button>
        <span style="font-size:10px;color:var(--text3);font-family:'Geist Mono',monospace">${pct}%</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <input class="wallet-amt" type="number" value="${w.amount}" min="0" style="width:100px;text-align:right${linked?';color:'+color+';font-weight:600':''}" onchange="setWalletManual(${w.id}, +this.value)" title="${linked?'Vinculado ao orçamento — mas você pode ajustar manualmente':'Editável'}">
        <button class="del-btn" onclick="if(confirm('Remover a conta \'${esc(w.name)}\' do patrimonio?')){savings.wallets=savings.wallets.filter(x=>x.id!==${w.id});renderWallets();renderWalletPie();autoSave()}">×</button>
      </div>
    </div>`;
  });
  const total = savings.wallets.reduce((s,w)=>s+(+w.amount||0),0);
  document.getElementById('wallet-list').innerHTML = h;
  document.getElementById('wallet-total').textContent = fmt(total);
  const lbl = document.getElementById('wallet-total-label');
  if(lbl) lbl.textContent = savings.wallets.length + ' contas';
}
function renderRecommendations() {
  const el = document.getElementById('recommendations');
  if (!el) return;

  const m = md();
  const income = (m.income||[]).reduce((s,i)=>s+(+i.amount||0),0) || 7856;

  // Budget totals by type
  const byType = {};
  (m.budget||[]).forEach(b => { byType[b.type] = (byType[b.type]||0) + (+b.budget||0); });
  const savingsBudget = byType['savings'] || 0;
  const essentials = (byType['fixed']||0) + (byType['debt']||0) + (byType['needs']||0);
  const wants = byType['wants'] || 0;
  const savingsPct = income>0 ? Math.round(savingsBudget/income*100) : 0;
  const essentialsPct = income>0 ? Math.round(essentials/income*100) : 0;

  const recs = [];

  // 1. Savings rate vs 20% benchmark
  if (savingsPct >= 20) {
    recs.push({icon:'✅', color:'#15803d', text:`Sua taxa de poupança é <strong>${savingsPct}%</strong> da renda — acima da meta de 20%. Muito bom.`});
  } else if (savingsPct >= 15) {
    recs.push({icon:'📈', color:'#a16207', text:`Você poupa <strong>${savingsPct}%</strong> da renda. Está perto da meta de 20% — se conseguir apertar um pouco os desejos, chega lá.`});
  } else {
    recs.push({icon:'⚠️', color:'#b91c1c', text:`Sua taxa de poupança é <strong>${savingsPct}%</strong>, abaixo da meta de 20%. Veja se dá pra remanejar algo dos desejos.`});
  }

  // 2. Pay yourself first
  recs.push({icon:'🎯', color:'#1e40af', text:`Mova os <strong>${fmt(savingsBudget)}</strong> de savings para as contas <strong>no começo do mês</strong>, assim que o salário cair — antes que vire gasto.`});

  // 3. Emergency fund progress
  const emGoal = savings.goals.find(g=>g.id===50);
  if (emGoal) {
    const target = emGoal.target || 30096;
    const saved = emGoal.saved || 0;
    const pct = Math.round(saved/target*100);
    if (pct < 100) {
      recs.push({icon:'🛡️', color:'#7c3aed', text:`Fundo de emergência em <strong>${pct}%</strong> (${fmt(saved)} de ${fmt(target)}). Priorize completá-lo — é sua rede de segurança.`});
    } else {
      recs.push({icon:'🛡️', color:'#15803d', text:`Fundo de emergência completo (${fmt(saved)})! Pode redirecionar esse fluxo para TFSA/aposentadoria.`});
    }
  }

  // 4. Essentials weight
  if (essentialsPct > 60) {
    recs.push({icon:'🏠', color:'#a16207', text:`Seus essenciais são <strong>${essentialsPct}%</strong> da renda (aluguel de Vancouver pesa). É estrutural, não descontrole — a folga vem de otimizar aos poucos.`});
  }

  // 5. Slack / unallocated
  const totalBudget = essentials + wants + savingsBudget + (byType['provision']||0);
  const slack = income - totalBudget;
  if (slack < 50) {
    recs.push({icon:'💨', color:'#b45309', text:`Seu orçamento está quase 100% alocado (folga de ${fmt(slack)}). Deixe $100-150 livres para imprevistos.`});
  } else {
    recs.push({icon:'💨', color:'#15803d', text:`Você tem ${fmt(slack)} de folga não alocada — ótimo colchão para imprevistos.`});
  }

  let h = '<div style="display:flex;flex-direction:column;gap:11px">';
  recs.forEach(r => {
    h += `<div style="display:flex;gap:9px;align-items:flex-start;font-size:13px;line-height:1.5;color:var(--text2)">
      <span style="font-size:15px;flex-shrink:0">${r.icon}</span>
      <span>${r.text}</span>
    </div>`;
  });
  h += '</div>';
  el.innerHTML = h;
}

function renderPhasesPlan() {
  // Removido — substituído por recomendações baseadas no orçamento
  return;
}

function renderRetirementProjection() {
  const retEl = document.getElementById('retirement-projection');
  if(!retEl) return;

  function fvAnnuity(pmt, rAnnual, years) {
    const r = rAnnual/12, n = years*12;
    return pmt * ((1+r)**n - 1) / r;
  }
  function fvLumpSum(pv, rAnnual, years) {
    return pv * (1 + rAnnual/12)**(years*12);
  }

  const r = 0.06;
  const rrpMonthly = 517;
  const tfsa = savings.wallets.find(w=>w.name.includes('TFSA'));
  const cl = savings.wallets.find(w=>w.name.includes('Canada Life'));
  const extra = savings.wallets.find(w=>w.name.includes('Aposentadoria')||w.name.includes('Extra'));

  const tfsaNow = tfsa?+tfsa.amount:3904;
  const clNow = cl?+cl.amount:5012;
  const extraNow = extra?+extra.amount:0;

  // Nicolas: 28 years | Juliana: 25 years (use 28 = conservative)
  const rrpFv = fvAnnuity(rrpMonthly, r, 28);
  const tfsaFv = fvLumpSum(tfsaNow, r, 28) + fvAnnuity(500, r, 28);
  const clFv = fvLumpSum(clNow, r, 28);
  const extraFv = fvAnnuity(300, r, 4) + fvAnnuity(800, r, 24); // phase3 projection
  const totalProjected = rrpFv + tfsaFv + clFv + extraFv;
  const target = 1800000;
  const gap = Math.max(0, target - totalProjected);
  const pct = Math.min(100, Math.round(totalProjected/target*100));

  const items = [
    {label:'Canada Life RRP (Juliana)', value: rrpFv, note:'$517/mês × 28 anos @ 6%', color:'#8b5cf6'},
    {label:'TFSA VGRO (ambos)', value: tfsaFv, note:`${fmt(tfsaNow)} atual + $500/mês @ 6%`, color:'#3b82f6'},
    {label:'Canada Life atual crescendo', value: clFv, note:`${fmt(clNow)} atual @ 6%`, color:'#22c55e'},
    {label:'Investimentos extras', value: extraFv, note:'$300/mês fase2 + $800/mês fase3', color:'#f59e0b'},
  ];

  let h = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:16px">
    <div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:6px">Projeção em 28 anos (Nicolas aos 55)</div>
      <div style="font-size:28px;font-weight:700;color:#15803d;font-family:'Geist Mono',monospace;letter-spacing:-1px">${fmt(totalProjected)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">de ${fmt(target)} necessários</div>
      <div style="margin-top:10px;height:8px;background:#dcfce7;border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:#22c55e;border-radius:4px;transition:width .5s"></div>
      </div>
      <div style="font-size:11px;color:#16a34a;margin-top:4px;font-weight:600">${pct}% do caminho</div>
    </div>
    <div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:8px">Composição do portfólio</div>
      ${items.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #dcfce7">
        <div><span style="display:inline-block;width:8px;height:8px;background:${x.color};border-radius:50%;margin-right:6px"></span><span style="font-size:12px;color:#374151">${x.label}</span><br><span style="font-size:10px;color:#9ca3af;margin-left:14px">${x.note}</span></div>
        <span style="font-size:12px;font-weight:600;font-family:'Geist Mono',monospace;color:${x.color};white-space:nowrap">${fmt(x.value)}</span>
      </div>`).join('')}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;background:#dcfce7;border-radius:8px;padding:12px;margin-top:4px">
    <div style="text-align:center"><div style="font-size:10px;color:#166534;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Gap restante</div><div style="font-size:16px;font-weight:700;color:${gap>0?'#dc2626':'#16a34a'};font-family:'Geist Mono',monospace">${gap>0?fmt(gap):'✓ OK'}</div></div>
    <div style="text-align:center"><div style="font-size:10px;color:#166534;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Renda mensal aposentadoria</div><div style="font-size:16px;font-weight:700;color:#15803d;font-family:'Geist Mono',monospace">$6,000</div></div>
    <div style="text-align:center"><div style="font-size:10px;color:#166534;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Anos até aposentadoria</div><div style="font-size:16px;font-weight:700;color:#15803d;font-family:'Geist Mono',monospace">28 anos</div></div>
  </div>
  <div style="margin-top:12px;padding:12px 14px;background:#eff6ff;border-radius:8px;border-left:3px solid #3b82f6">
    <div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:8px">💡 Recomendações</div>
    <div style="display:flex;flex-direction:column;gap:7px;font-size:12.5px;color:#374151;line-height:1.5">
      <div>📈 <strong>VGRO</strong> (80/20) é bom para 28 anos. Após os 40, considere migrar parte para <strong>XBAL</strong> (60/40).</div>
      <div>🍁 <strong>CPP + OAS</strong> do governo somam ~<strong>$3.300-3.900/mês</strong> para o casal a partir dos 65 (extra além dos seus investimentos).</div>
      <div>🇧🇷 Acordo Brasil-Canadá (2014): o CPP acumulado pode ser recebido no Brasil se voltarem. Nada se perde.</div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#6b7280;font-style:italic">Estimativas. Veja seu CPP real no My Service Canada Account.</div>
  </div>`;
  retEl.innerHTML = h;
}

function renderGoals() {
  let h = '';
  const priorityOrder = savings.goals.slice().sort((a,b)=>(a.priority||9)-(b.priority||9));
  priorityOrder.forEach(g => {
    const pct = g.target>0 ? clamp(g.saved/g.target*100,0,100) : 0;
    const left = Math.max(0, g.target-g.saved);
    const months = g.monthly>0 ? Math.ceil(left/g.monthly) : '∞';
    const barColor = pct>=100?'#22c55e':pct>=60?'#3b82f6':'#8b5cf6';
    const urgency = g.deadline ? (() => {
      const d = new Date(g.deadline), now = new Date();
      const diff = Math.ceil((d-now)/(1000*60*60*24*30));
      if(diff<=3) return `<span style="font-size:10px;background:#fef2f2;color:#dc2626;padding:1px 6px;border-radius:20px;font-weight:600;margin-left:6px">⚡ ${diff}m</span>`;
      if(diff<=6) return `<span style="font-size:10px;background:#fffbeb;color:#d97706;padding:1px 6px;border-radius:20px;font-weight:600;margin-left:6px">${diff}m</span>`;
      return '';
    })() : '';
    h += `<div class="prog-wrap">
      <div class="prog-head">
        <div style="display:flex;align-items:center;flex:1;gap:4px;min-width:0">
          <span class="prog-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(g.name)}">${walletLabel(g.id, g.name)}</span>
          ${urgency}
          <button class="rename-btn" onclick="renameGoal(${g.id})" title="Renomear">⋯</button>
        </div>
        <span class="prog-pct">${Math.round(pct)}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct.toFixed(1)}%;background:${barColor}"></div></div>
      ${g.note?`<div style="font-size:11px;color:#6b7280;margin-bottom:6px;line-height:1.5">${esc(g.note)}</div>`:''}
      <div class="prog-meta">
        <span>Objetivo: <input type="number" value="${g.target}" min="0" onchange="savings.goals.find(x=>x.id===${g.id}).target=+this.value;renderGoals();renderSavingsMetrics();renderRetirementProjection();autoSave()"></span>
        <span>Tenho hoje: <input type="number" value="${g.saved}" min="0" onchange="savings.goals.find(x=>x.id===${g.id}).saved=+this.value;renderGoals();renderSavingsMetrics();renderRetirementProjection();autoSave()"></span>
      </div>
    </div>`;
  });
  document.getElementById('goals-list').innerHTML = h;
}
function renderProvisions() {
  const el = document.getElementById('sf-pool');
  if (!el) return;

  // Ensure pool exists
  if (!savings.sinkingPool) {
    savings.sinkingPool = { monthlyContribution: 150, carryover: 0, expenses: {} };
  }
  const pool = savings.sinkingPool;
  const mk = String(currentMonth);
  const monthExpenses = pool.expenses[mk] || [];

  // Month math
  const entrou = +pool.monthlyContribution || 0;
  const saiu = monthExpenses.reduce((s,e)=>s+(+e.amount||0), 0);
  const sobrouMes = entrou - saiu;

  // Carryover = sum of leftovers from ALL previous months (chronological)
  // Caixinha total = carryover acumulado + sobra do mês atual
  let carryoverAccum = +pool.carryover || 0;
  const prevMonths = Object.keys(pool.expenses).map(Number).filter(m => m < currentMonth);
  // (carryover field holds manual base; we add each prior month's leftover)
  prevMonths.forEach(pm => {
    const exp = (pool.expenses[String(pm)]||[]).reduce((s,e)=>s+(+e.amount||0),0);
    carryoverAccum += (entrou - exp);
  });
  const caixinha = carryoverAccum + sobrouMes;

  let h = '';

  // ── Top metrics: entrou / saiu / sobrou (mês corrente) ──
  h += '<div class="metrics" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">';
  h += `<div class="metric"><div class="lbl">Entrou este mês</div><div class="val" style="color:var(--green)">${fmt(entrou)}</div><div class="sub">aporte mensal</div></div>`;
  h += `<div class="metric"><div class="lbl">Saiu este mês</div><div class="val" style="color:${saiu>0?'var(--red)':'var(--text2)'}">${fmt(saiu)}</div><div class="sub">${monthExpenses.length} gasto(s)</div></div>`;
  h += `<div class="metric"><div class="lbl">Sobrou este mês</div><div class="val" style="color:${sobrouMes>=0?'var(--green)':'var(--red)'}">${fmt(sobrouMes)}</div><div class="sub">entrou − saiu</div></div>`;
  h += '</div>';

  // ── Caixinha total (destaque) ──
  h += `<div class="card" style="margin-bottom:16px;background:linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02));border:1px solid rgba(16,185,129,0.25)">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:12px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:600">🐷 Caixinha disponível</div>
        <div style="font-size:28px;font-weight:700;color:var(--green);font-family:'Geist Mono',monospace;margin-top:2px">${fmt(caixinha)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">sobra acumulada de meses anteriores + sobra deste mês</div>
      </div>
      <div style="text-align:right;font-size:12px;color:var(--text3)">
        <div>Acumulado anterior: <strong style="color:var(--text2)">${fmt(carryoverAccum)}</strong></div>
        <div>+ Sobra do mês: <strong style="color:var(--text2)">${fmt(sobrouMes)}</strong></div>
      </div>
    </div>
  </div>`;

  // ── Aporte mensal editável ──
  h += `<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;font-size:13px;color:var(--text2)">
    <span>Aporte mensal:</span>
    <div style="display:flex;align-items:center;gap:3px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:3px 10px">
      <span style="color:var(--text3)">$</span>
      <input type="number" value="${entrou}" min="0" style="width:70px;border:none;background:transparent;font-size:14px;font-weight:600;color:var(--text)" onchange="sfSetMonthly(+this.value)">
    </div>
  </div>`;

  // ── Lista de gastos do mês (extrato) ──
  h += `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <h3 style="font-size:15px;font-weight:600">Gastos da caixinha — ${MONTHS[currentMonth]}</h3>
      <button class="btn btn-sm btn-primary" onclick="sfAddExpense()">+ Registrar gasto</button>
    </div>`;

  if (monthExpenses.length === 0) {
    h += `<div class="empty" style="padding:24px 0">Nenhum gasto este mês ainda.<br><span style="font-size:11px;color:var(--text3)">Ex: manutenção do carro, presente, consulta, assinatura…</span></div>`;
  } else {
    // sorted by date desc
    const sorted = [...monthExpenses].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    sorted.forEach(e => {
      const d = e.date ? new Date(e.date+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}) : '—';
      h += `<div style="display:flex;align-items:center;gap:8px;padding:9px 2px;border-top:1px solid var(--border)">
        <input type="date" value="${e.date||''}" style="font-size:11px;width:120px;color:var(--text3)" onchange="sfEditExpense(${e.id},'date',this.value)">
        <input type="text" value="${esc(e.desc||'')}" placeholder="Descrição (ex: troca de óleo)" style="flex:1;font-size:13px;min-width:0" onchange="sfEditExpense(${e.id},'desc',this.value)">
        <div style="display:flex;align-items:center;gap:3px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:2px 7px">
          <span style="font-size:11px;color:var(--text3)">$</span>
          <input type="number" value="${e.amount}" min="0" step="0.01" style="width:64px;border:none;background:transparent;font-size:13px;font-weight:700;color:var(--text)" onchange="sfEditExpense(${e.id},'amount',+this.value)">
        </div>
        <button class="del-btn" onclick="sfRemoveExpense(${e.id})">×</button>
      </div>`;
    });
  }
  h += '</div>';

  // ── Exemplos do que pode sair daqui ──
  h += `<div style="margin-top:14px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;font-size:12.5px;color:#92400e;line-height:1.6">
    <strong>💡 Como usar:</strong> entram $${entrou} por mês na caixinha. Você vai tirando conforme gasta com coisas previsíveis mas irregulares — por exemplo: <strong>🚗 carro</strong> (manutenção, estacionamento), <strong>🏥 saúde</strong>, <strong>🎁 presentes & datas</strong>, <strong>🏠 casa & assinaturas</strong>. O que sobrar no fim do mês acumula na caixinha para o próximo. Se não sobrar, tudo bem.
  </div>`;

  el.innerHTML = h;
}

// ── Pool management functions ──
function sfSetMonthly(val) {
  if (!savings.sinkingPool) savings.sinkingPool = {monthlyContribution:150,carryover:0,expenses:{}};
  savings.sinkingPool.monthlyContribution = Math.max(0, +val||0);
  // keep budget provision line in sync
  const prov = md().budget.find(b=>b.id===60);
  if (prov) prov.budget = savings.sinkingPool.monthlyContribution;
  render(); autoSave();
}

function sfAddExpense() {
  if (!savings.sinkingPool) savings.sinkingPool = {monthlyContribution:150,carryover:0,expenses:{}};
  const mk = String(currentMonth);
  if (!savings.sinkingPool.expenses[mk]) savings.sinkingPool.expenses[mk] = [];
  // collision-proof id across all months
  let maxId = 0;
  Object.values(savings.sinkingPool.expenses).forEach(arr => arr.forEach(e => { if(+e.id>maxId) maxId=+e.id; }));
  const newId = Math.max(maxId, 5000) + 1;
  const today = new Date().toISOString().slice(0,10);
  savings.sinkingPool.expenses[mk].unshift({id:newId, date:today, desc:'', amount:0});
  render(); autoSave();
}

function sfEditExpense(id, field, value) {
  const mk = String(currentMonth);
  const arr = savings.sinkingPool.expenses[mk] || [];
  const e = arr.find(x=>x.id===id);
  if (e) { e[field] = value; render(); autoSave(); }
}

function sfRemoveExpense(id) {
  if (!confirm('Remover este gasto da caixinha?')) return;
  const mk = String(currentMonth);
  savings.sinkingPool.expenses[mk] = (savings.sinkingPool.expenses[mk]||[]).filter(x=>x.id!==id);
  render(); autoSave();
}

function renderCarDebt() {
  if (!document.getElementById('car-metrics')) return;
  const loan = getCarLoan();
  const schedule = carAmortSchedule(loan.balance, loan.annualRate, loan.biweeklyPayment, loan.remainingPayments);
  const totalInterest = schedule.reduce((s,p)=>s+p.interest,0);
  const totalPaid = schedule.reduce((s,p)=>s+p.interest+p.principal,0);
  const monthlyEq = loan.biweeklyPayment * 26 / 12;

  // Metrics
  document.getElementById('car-metrics').innerHTML = `
    <div class="metric"><div class="lbl">Saldo devedor</div><div class="val" style="color:var(--red)">$${loan.balance.toLocaleString('en-CA',{minimumFractionDigits:2})}</div><div class="sub">Jun 2026</div></div>
    <div class="metric"><div class="lbl">Pagamento quinzenal</div><div class="val">$${loan.biweeklyPayment}</div><div class="sub">~${fmt(monthlyEq)}/mês</div></div>
    <div class="metric"><div class="lbl">Juros restantes</div><div class="val" style="color:var(--amber)">$${totalInterest.toFixed(0)}</div><div class="sub">se pagar normalmente</div></div>
    <div class="metric"><div class="lbl">Quitação</div><div class="val" style="font-size:18px">Nov 2028</div><div class="sub">${loan.remainingPayments} pagamentos</div></div>
  `;

  // Amortization chart — monthly grouped
  const monthly = [];
  let acc = {interest:0, principal:0};
  schedule.forEach((p,i) => {
    acc.interest += p.interest;
    acc.principal += p.principal;
    if ((i+1) % 2 === 0 || i === schedule.length-1) {
      monthly.push({...acc});
      acc = {interest:0, principal:0};
    }
  });

  destroyChart('car-amort');
  const ctx1 = document.getElementById('chart-car-amort');
  if (ctx1) {
    charts['car-amort'] = new Chart(ctx1.getContext('2d'), {
      type: 'bar',
      data: {
        labels: monthly.map((_,i)=>{
          const d = new Date(2026,5,1); d.setMonth(d.getMonth()+i);
          return d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        }),
        datasets: [
          {label:'Principal', data: monthly.map(m=>+m.principal.toFixed(2)), backgroundColor:'#3b82f6', borderRadius:3, stack:'a'},
          {label:'Juros',     data: monthly.map(m=>+m.interest.toFixed(2)),  backgroundColor:'#fca5a5', borderRadius:3, stack:'a'}
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{labels:{font:{family:'Geist',size:11},boxWidth:10,color:'#6b6b66'}},
          tooltip:{callbacks:{label:ctx=>` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`}}},
        scales:{
          x:{grid:{display:false},ticks:{font:{family:'Geist',size:10},color:'#a8a8a2',maxTicksLimit:10}},
          y:{grid:{color:'#f0f0ee'},ticks:{font:{family:'Geist Mono',size:10},color:'#a8a8a2',callback:v=>'$'+v},stacked:true}
        }
      }
    });
  }

  // Balance over time
  const balPoints = schedule.filter((_,i)=>i%2===0).map((p,i)=>({x:i, y:p.balance}));
  destroyChart('car-balance');
  const ctx2 = document.getElementById('chart-car-balance');
  if (ctx2) {
    charts['car-balance'] = new Chart(ctx2.getContext('2d'), {
      type: 'line',
      data: {
        labels: balPoints.map((_,i)=>{
          const d = new Date(2026,5,1); d.setMonth(d.getMonth()+i);
          return d.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
        }),
        datasets:[{
          label:'Saldo devedor', data:balPoints.map(p=>p.y),
          borderColor:'#ef4444', backgroundColor:'rgba(239,68,68,0.07)',
          borderWidth:2, fill:true, tension:0.3, pointRadius:0
        }]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>` Saldo: ${fmt(ctx.parsed.y)}`}}},
        scales:{
          x:{grid:{display:false},ticks:{font:{family:'Geist',size:10},color:'#a8a8a2',maxTicksLimit:8}},
          y:{grid:{color:'#f0f0ee'},ticks:{font:{family:'Geist Mono',size:10},color:'#a8a8a2',callback:v=>'$'+Math.round(v/1000)+'k'}}
        }
      }
    });
  }

  // Recommendations
  const recEl = document.getElementById('car-recommendations');
  if (recEl) {
    const rate = loan.annualRate * 100;
    const tfsa_return = 6.0;
    const better_invest = tfsa_return > loan.annualRate * 100;
    recEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div style="background:var(--bg3);border-radius:10px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">📊 Contexto da dívida</div>
        <div style="font-size:13px;line-height:1.8;color:var(--text2)">
          Taxa: <strong style="color:var(--red)">${rate}% a.a.</strong><br>
          Juros totais restantes: <strong>${fmt(totalInterest)}</strong><br>
          Você paga <strong>${fmt(monthlyEq)}/mês</strong> (~${Math.round(schedule[0]?.interest/schedule[0]?.principal*100||0)}% em juros agora)<br>
          A parcela de juros <em>diminui</em> a cada pagamento
        </div>
      </div>
      <div style="background:var(--bg3);border-radius:10px;padding:14px">
        <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">🧠 Recomendação</div>
        <div style="font-size:13px;line-height:1.8;color:var(--text2)">
          ${rate > 6 ? `
            <strong style="color:var(--amber)">Pagar mais rápido vale a pena.</strong><br>
            9.49% a.a. é mais caro que o retorno esperado do TFSA (~6%). Cada $1 pago agora
            economiza $0.095 por ano — garantido. Aportes extras têm retorno garantido de 9.49%.
          ` : `
            Seria melhor investir no TFSA e pagar o mínimo no carro.
          `}
        </div>
      </div>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px">
      <div style="font-size:12px;font-weight:600;color:#1e40af;margin-bottom:10px">📋 Opções em ordem de prioridade</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px">
          <span style="background:#3b82f6;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">1</span>
          <div><strong>Pagar normalmente + emergency fund primeiro</strong> — garanta os $33k de reserva antes de acelerar a dívida do carro.</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px">
          <span style="background:#3b82f6;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">2</span>
          <div><strong>Aportes eventuais de $500–$1,000</strong> — quando sobrar dinheiro (bônus, mês de 3 pagamentos). Cada $1,000 economiza ~${fmt(Math.round(totalInterest/loan.balance*1000))} em juros.</div>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;font-size:13px">
          <span style="background:#94a3b8;color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">3</span>
          <div><strong>Não sacrificar TFSA pelo carro</strong> — manter contribuição no TFSA mesmo enquanto paga o carro. Dívida quitada em Nov/28 de qualquer jeito.</div>
        </div>
      </div>
    </div>`;
  }

  renderCarLumpSim();
}

function renderCarLumpSim() {
  const el = document.getElementById('car-lump-result');
  if (!el) return;
  const loan = getCarLoan();
  const lump = parseFloat(document.getElementById('car-lump-input')?.value) || 0;
  if (lump <= 0) { el.innerHTML = '<p style="color:var(--text3);font-size:13px">Digite um valor acima de $0.</p>'; return; }
  if (lump >= loan.balance) {
    const schedule = carAmortSchedule(loan.balance, loan.annualRate, loan.biweeklyPayment, loan.remainingPayments);
    const totalInt = schedule.reduce((s,p)=>s+p.interest,0);
    el.innerHTML = `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;font-size:13px;color:#15803d">
      <strong>Quita o carro hoje!</strong> Você economiza ${fmt(totalInt)} em juros e elimina o pagamento de ${fmt(loan.biweeklyPayment * 26/12)}/mês.
    </div>`;
    return;
  }
  const newBalance = loan.balance - lump;
  const origSchedule = carAmortSchedule(loan.balance, loan.annualRate, loan.biweeklyPayment, loan.remainingPayments);
  const newSchedule  = carAmortSchedule(newBalance, loan.annualRate, loan.biweeklyPayment, loan.remainingPayments);
  const origInt = origSchedule.reduce((s,p)=>s+p.interest,0);
  const newInt  = newSchedule.reduce((s,p)=>s+p.interest,0);
  const saved = origInt - newInt;
  const newPmt = loan.biweeklyPayment * (newBalance / loan.balance);
  el.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
    <div style="background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Novo saldo</div>
      <div style="font-size:18px;font-weight:700;font-family:'Geist Mono',monospace;color:var(--red)">${fmt(newBalance)}</div>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:11px;color:#166534;margin-bottom:4px">Juros economizados</div>
      <div style="font-size:18px;font-weight:700;font-family:'Geist Mono',monospace;color:var(--green)">${fmt(saved)}</div>
    </div>
    <div style="background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Retorno efetivo</div>
      <div style="font-size:18px;font-weight:700;font-family:'Geist Mono',monospace;color:var(--accent)">${(saved/lump*100).toFixed(1)}%</div>
      <div style="font-size:10px;color:var(--text3)">sobre o aporte</div>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════
// WEEKLY REPORT
// ═══════════════════════════════════════════════════════════

function renderWeeklyReport(reportObj) {
  const contentEl = document.getElementById('weekly-report-content');
  const loadingEl = document.getElementById('report-loading');
  const dateLbl = document.getElementById('report-date-label');
  if (!contentEl) return;

  if (loadingEl) loadingEl.style.display = 'none';
  contentEl.style.display = 'block';
  contentEl.innerHTML = reportObj.html;
  if (dateLbl) dateLbl.textContent = reportObj.week || '';
}


function renderHistory() {
  const el = document.getElementById('history-trend');
  if (!el) return;

  const monthKeys = Object.keys(data).map(Number).sort((a,b)=>a-b);
  if (monthKeys.length < 2) {
    el.innerHTML = '<div class="empty">Histórico aparecerá conforme você usar o app em meses diferentes.</div>';
    return;
  }

  // ── Selected months (default last 6) ──
  if (!window._historyMonths) window._historyMonths = monthKeys.slice(-6);
  window._historyMonths = window._historyMonths.filter(m => monthKeys.includes(m));
  if (window._historyMonths.length === 0) window._historyMonths = monthKeys.slice(-6);
  const selMonths = window._historyMonths.slice().sort((a,b)=>a-b);

  // ── All comparable categories (reference = current month budget) ──
  const allCats = md().budget.filter(b => ['needs','wants','savings'].includes(b.type));
  const allCatIds = allCats.map(c => c.id);

  // ── Selected categories (default = all) ──
  if (!window._historyCats) window._historyCats = allCatIds.slice();
  window._historyCats = window._historyCats.filter(id => allCatIds.includes(id));
  if (window._historyCats.length === 0 && !window._historyCatsCleared) window._historyCats = allCatIds.slice();
  const selCats = allCats.filter(c => window._historyCats.includes(c.id));

  // ── Month selector chips ──
  let h = '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;align-items:center">';
  h += '<span style="font-size:11px;color:var(--text3);margin-right:2px">Meses:</span>';
  monthKeys.forEach(mk => {
    const on = selMonths.includes(mk);
    h += `<button onclick="toggleHistoryMonth(${mk})" style="
      font-size:11px;padding:4px 10px;border-radius:14px;cursor:pointer;white-space:nowrap;
      border:1px solid ${on?'var(--accent)':'var(--border2)'};
      background:${on?'var(--accent)':'transparent'};
      color:${on?'#fff':'var(--text2)'};font-weight:${on?'600':'400'};transition:all .12s">
      ${MONTHS[mk]}</button>`;
  });
  h += '</div>';

  // ── Category selector — compact dropdown ──
  const totalCats = allCats.length;
  const selCount = window._historyCats.length;
  const open = !!window._historyCatsOpen;
  h += '<div style="margin-bottom:12px;position:relative">';
  h += `<button onclick="toggleHistoryCatPanel()" style="
    font-size:12px;padding:6px 12px;border-radius:8px;cursor:pointer;
    border:1px solid var(--border2);background:var(--bg3);color:var(--text2);
    display:inline-flex;align-items:center;gap:8px">
    <span>Categorias <strong style="color:var(--accent)">${selCount}/${totalCats}</strong></span>
    <span style="font-size:10px;transform:rotate(${open?'180':'0'}deg);transition:transform .15s">▾</span>
  </button>`;

  if (open) {
    h += `<div style="margin-top:8px;padding:10px;border:1px solid var(--border2);border-radius:10px;background:var(--bg);box-shadow:0 4px 12px rgba(0,0,0,0.06)">`;
    // Quick actions
    h += `<div style="display:flex;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border)">
      <button onclick="historyCatsAll()" style="font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--accent);font-weight:500">Selecionar todas</button>
      <button onclick="historyCatsClear()" style="font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;border:1px solid var(--border2);background:transparent;color:var(--text3)">Limpar</button>
    </div>`;
    // Checkbox rows in a responsive grid
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:4px">';
    allCats.forEach(cat => {
      const on = window._historyCats.includes(cat.id);
      const em = CAT_EMOJI[cat.id] || '';
      h += `<label style="display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text2)" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" ${on?'checked':''} onchange="toggleHistoryCat(${cat.id})" style="cursor:pointer;accent-color:var(--accent)">
        ${em?`<span class="emo">${em}</span>`:''}<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(cat.name)}</span>
      </label>`;
    });
    h += '</div></div>';
  }
  h += '</div>';

  if (selMonths.length < 1) { el.innerHTML = h + '<div class="empty">Selecione ao menos um mês.</div>'; return; }
  if (selCats.length < 1)   { el.innerHTML = h + '<div class="empty">Selecione ao menos uma categoria.</div>'; return; }

  // ── Table ──
  h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">';
  h += '<thead><tr><th style="text-align:left;padding:6px 8px;color:var(--text3);font-weight:600;position:sticky;left:0;background:var(--bg)">Categoria</th>';
  selMonths.forEach(mk => {
    h += `<th style="text-align:right;padding:6px 8px;color:var(--text3);font-weight:600;white-space:nowrap">${MONTHS[mk].slice(0,3)}</th>`;
  });
  h += '</tr></thead><tbody>';

  selCats.forEach(cat => {
    const em = CAT_EMOJI[cat.id] || '';
    h += `<tr style="border-top:1px solid var(--border)"><td style="text-align:left;padding:6px 8px;white-space:nowrap;position:sticky;left:0;background:var(--bg)">${em?`<span class="emo">${em}</span> `:''}${esc(cat.name)}</td>`;
    let prev = null;
    selMonths.forEach(mk => {
      const month = data[mk];
      const spent = (month && month.transactions)
        ? month.transactions.filter(t => t.cat === cat.id).reduce((s,t)=>s+(+t.amount||0),0)
        : 0;
      let color = 'var(--text2)';
      if (prev !== null && spent > 0 && prev > 0) {
        if (spent > prev * 1.1) color = 'var(--red)';
        else if (spent < prev * 0.9) color = 'var(--green)';
      }
      h += `<td style="text-align:right;padding:6px 8px;font-family:'Geist Mono',monospace;color:${color};white-space:nowrap">${spent>0?fmt(spent):'—'}</td>`;
      prev = spent;
    });
    h += '</tr>';
  });

  // Total row (only selected categories)
  h += `<tr style="border-top:2px solid var(--border2);font-weight:700"><td style="text-align:left;padding:6px 8px;position:sticky;left:0;background:var(--bg)">Total (selecionadas)</td>`;
  selMonths.forEach(mk => {
    const month = data[mk];
    const total = (month && month.transactions)
      ? month.transactions.filter(t => window._historyCats.includes(t.cat)).reduce((s,t)=>s+(+t.amount||0),0)
      : 0;
    h += `<td style="text-align:right;padding:6px 8px;font-family:'Geist Mono',monospace;white-space:nowrap">${total>0?fmt(total):'—'}</td>`;
  });
  h += '</tr></tbody></table></div>';
  h += '<div style="font-size:10px;color:var(--text3);margin-top:8px;font-style:italic">🔴 gasto subiu &gt;10% vs mês anterior selecionado · 🟢 caiu &gt;10%</div>';

  el.innerHTML = h;
}

function toggleHistoryMonth(mk) {
  if (!window._historyMonths) window._historyMonths = [];
  const i = window._historyMonths.indexOf(mk);
  if (i >= 0) window._historyMonths.splice(i, 1);
  else window._historyMonths.push(mk);
  renderHistory();
}

function toggleHistoryCat(id) {
  if (!window._historyCats) window._historyCats = [];
  const i = window._historyCats.indexOf(id);
  if (i >= 0) window._historyCats.splice(i, 1);
  else window._historyCats.push(id);
  window._historyCatsCleared = (window._historyCats.length === 0);
  renderHistory();
}

function toggleHistoryCatPanel() {
  window._historyCatsOpen = !window._historyCatsOpen;
  renderHistory();
}

function historyCatsAll() {
  const allCatIds = md().budget.filter(b => ['needs','wants','savings'].includes(b.type)).map(c=>c.id);
  window._historyCats = allCatIds.slice();
  window._historyCatsCleared = false;
  window._historyCatsOpen = true;
  renderHistory();
}

function historyCatsClear() {
  window._historyCats = [];
  window._historyCatsCleared = true;
  window._historyCatsOpen = true;
  renderHistory();
}
