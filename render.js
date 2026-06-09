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
    const balColor = over?'var(--red)':bal>0?'var(--green)':'var(--text3)';
    h += `<div style="padding:10px 4px;border-bottom:1px solid var(--border)">
      <!-- Row 1: name + rename + delete -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:7px">
        <span style="flex:1;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${catLabel(b.id, b.name)}</span>
        <button class="rename-btn" onclick="renameBudget(${b.id})" title="Renomear" style="flex-shrink:0">⋯</button>
        <button class="del-btn" onclick="removeBudget(${b.id})" style="flex-shrink:0">×</button>
      </div>
      <!-- Row 2: type select + budget input + spent + balance -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <select onchange="getBudget(${b.id}).type=this.value;render();autoSave()" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);flex-shrink:0">
          ${['fixed','debt','needs','wants','savings'].map(t=>`<option value="${t}"${b.type===t?' selected':''}>${typeLabel(t)}</option>`).join('')}
        </select>
        <div style="display:flex;align-items:center;gap:3px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:2px 6px;flex-shrink:0">
          <span style="font-size:11px;color:var(--text3)">$</span>
          <input type="number" value="${b.budget}" min="0" style="width:64px;border:none;background:transparent;font-size:12px;font-weight:600;color:var(--text)" onchange="getBudget(${b.id}).budget=+this.value;render();autoSave()">
        </div>
        <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
          <span style="font-size:11px;color:var(--text3)">gasto <span style="font-family:'Geist Mono',monospace;font-weight:500;color:var(--text2)">${fmt(sp)}</span></span>
          <span style="font-size:11px;color:var(--text3)">saldo <span style="font-family:'Geist Mono',monospace;font-weight:600;color:${balColor}">${over?'-':''}${fmt(Math.abs(bal))}</span></span>
        </div>
      </div>
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
  const cats = md().budget.map(b => ({...b, spent: spentForCat(b.id)})).filter(b=>b.spent>0).sort((a,b)=>b.spent-a.spent).slice(0,5);
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
    const em = CAT_EMOJI[tx.cat] || '';
    const d = new Date(tx.date+'T12:00:00');
    const dateStr = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
    h += `<div style="padding:10px 4px;border-bottom:1px solid var(--border)">
      <!-- Row 1: date badge + category select + delete -->
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:7px">
        <span style="font-size:11px;font-weight:600;color:var(--text3);white-space:nowrap;min-width:48px">${dateStr}</span>
        <select onchange="getTx(${tx.id}).cat=+this.value;render();autoSave()" style="flex:1;font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);min-width:0">
          ${md().budget.map(b=>`<option value="${b.id}"${b.id===tx.cat?' selected':''}>${esc(b.name)}</option>`).join('')}
        </select>
        <span class="badge badge-${cat.type}" style="flex-shrink:0;font-size:10px">${typeLabel(cat.type)}</span>
        <button class="del-btn" onclick="removeTx(${tx.id})" style="flex-shrink:0">×</button>
      </div>
      <!-- Row 2: description + amount + date input -->
      <div style="display:flex;align-items:center;gap:6px">
        <input type="text" value="${esc(tx.desc)}" placeholder="Descrição" style="flex:1;font-size:12px;min-width:0" onchange="getTx(${tx.id}).desc=this.value;autoSave()">
        <div style="display:flex;align-items:center;gap:3px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:2px 7px;flex-shrink:0">
          <span style="font-size:11px;color:var(--text3)">$</span>
          <input type="number" value="${tx.amount}" min="0" step="0.01" style="width:64px;border:none;background:transparent;font-size:13px;font-weight:700;color:var(--text)" onchange="getTx(${tx.id}).amount=+this.value;render();autoSave()">
        </div>
        <input type="date" value="${tx.date}" style="font-size:11px;width:36px;opacity:0;position:absolute" onchange="getTx(${tx.id}).date=this.value;render();autoSave()" id="date-${tx.id}">
        <button onclick="document.getElementById('date-${tx.id}').showPicker?document.getElementById('date-${tx.id}').showPicker():document.getElementById('date-${tx.id}').click()" style="font-size:13px;background:none;border:none;cursor:pointer;color:var(--text3);padding:2px 4px" title="Mudar data">📅</button>
      </div>
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
  const wsCashIds = [50, 51, 1002, 1006, 1010, 1000];
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
  const recPhaseEl = document.getElementById('rec-phase-label');

  // Determine phase based on current date
  const now = new Date();
  const phase = (now.getFullYear() < 2026 || (now.getFullYear()===2026 && now.getMonth()<=8))
    ? 'phase1'
    : (now.getFullYear()===2026 || (now.getFullYear()===2027 && now.getMonth()<=2))
    ? 'phase2' : 'phase3';

  const phaseLabels = {
    phase1: 'Fase 1 · Agora ate Set/2026',
    phase2: 'Fase 2 · Out/2026 - Mar/2027',
    phase3: 'Fase 3 · Abr/2027 em diante'
  };
  if (recPhaseEl) recPhaseEl.textContent = phaseLabels[phase];

  // Real recommendations based on actual goals + planning conversations
  // Phase 1: Japan sprint + base building
  // Phase 2: Brazil + retirement ramp up
  // Phase 3: Permanent regime
  const plans = {
    phase1: [
      { id:51, label:'Japan Trip',        amount:1000, color:'#ef4444',
        note:'Prioridade maxima — prazo Set 4, 2026. Faltam ~$3,200.' },
      { id:50, label:'Emergency Savings', amount:300,  color:'#f59e0b',
        note:'Construindo ate $33k (6x despesas). Atualmente $7,919.' },
      { id:52, label:'TFSA',              amount:300,  color:'#3b82f6',
        note:'VGRO — crescimento composto. Manter contribuicao mesmo nas fases de viagem.' },
      { id:1006,label:'Brasil 2027',       amount:100,  color:'#22c55e',
        note:'Comecar pequeno agora. Aumentar para $667/mes apos o Japao.' },
      { id:1002,label:'Baby Fund',         amount:30,   color:'#ec4899',
        note:'2029 — 3 anos de runway. Comecar cedo, aumentar gradualmente.' },
      { id:1010,label:'Earlobe + Dental',  amount:50,   color:'#06b6d4',
        note:'Juliana ~$2,000 + Nicolas ~$900. Prazo 2027. Verificar Sun Life.' },
    ],
    phase2: [
      { id:1006,label:'Brasil 2027',       amount:667,  color:'#ef4444',
        note:'Aumentar apos Japao — meta $4,000 ate Marco/2027.' },
      { id:50, label:'Emergency Savings', amount:400,  color:'#f59e0b',
        note:'Continuar construindo ate $33k.' },
      { id:52, label:'TFSA',              amount:400,  color:'#3b82f6',
        note:'Aumentar contribuicao — maximizar limite anual ($7,000/ano).' },
      { id:1002,label:'Baby Fund',         amount:200,  color:'#ec4899',
        note:'Aumentar — 2029 se aproxima. Meta $20,000.' },
      { id:1010,label:'Earlobe + Dental',  amount:200,  color:'#06b6d4',
        note:'Prazo se aproxima — reforcar contribuicao.' },
    ],
    phase3: [
      { id:52, label:'TFSA',              amount:600,  color:'#3b82f6',
        note:'Maximizar — $7,000/ano. Principal veiculo de aposentadoria.' },
      { id:50, label:'Emergency Savings', amount:300,  color:'#f59e0b',
        note:'Fase final ate $33k. Depois redirecionar para aposentadoria.' },
      { id:1002,label:'Baby Fund',         amount:400,  color:'#ec4899',
        note:'Sprint final — 2029 chegando. Meta $20,000.' },
      { id:900, label:'Canada Life RRP',  amount:517,  color:'#8b5cf6',
        note:'Auto-descontado do salario da Juliana. 5% + empresa dobra = $517/mes.' },
    ]
  };

  const items = plans[phase] || plans.phase1;
  const total = items.reduce((s,x)=>s+x.amount,0);

  let h = '';
  items.forEach(item => {
    const em = WALLET_EMOJI[item.id] || '';
    h += `<div style="display:flex;align-items:flex-start;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--accent);display:flex;align-items:center;gap:5px">
          ${em ? `<span class="emo" style="font-size:14px">${em}</span>` : ''}
          <span>${esc(item.label)}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px;line-height:1.4">${esc(item.note)}</div>
      </div>
      <span style="font-family:'Geist Mono',monospace;font-size:13px;font-weight:600;color:${item.color};white-space:nowrap;flex-shrink:0">${fmt(item.amount)}<span style="font-size:10px;font-weight:400;color:var(--text3)">/mes</span></span>
    </div>`;
  });
  h += `<div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:2px solid var(--border)">
    <span style="font-size:12px;font-weight:600;color:var(--text)">Total savings/mes</span>
    <span style="font-family:'Geist Mono',monospace;font-size:14px;font-weight:700;color:var(--accent)">${fmt(total)}</span>
  </div>`;

  const recEl = document.getElementById('recommendations');
  if (recEl) recEl.innerHTML = h;
}

function renderPhasesPlan() {
  const phasesEl = document.getElementById('phases-plan');
  if(!phasesEl) return;
  const phase = getCurrentPhase();

  const phases = [
    {
      id: 'phase1',
      label: 'Fase 1',
      period: 'Agora → Set/2026',
      goal: 'Japan Trip + fundamentos',
      color: '#ef4444', bg: '#fef2f2', border: '#fecaca',
      items: [
        { id:51,  label:'Japan Trip',       amount:1000, note:'Prioridade maxima — prazo Set 4' },
        { id:50,  label:'Emergency Savings',amount:300,  note:'Construindo ate $30,096' },
        { id:52,  label:'TFSA',             amount:300,  note:'Manter sempre — VGRO' },
        { id:1006,label:'Brasil 2027',      amount:100,  note:'Comecar pequeno agora' },
        { id:1002,label:'Baby Fund',        amount:30,   note:'Inicio — 2029 ainda longe' },
        { id:1010,label:'Earlobe + Dental', amount:50,   note:'Prazo 2027' },
      ]
    },
    {
      id: 'phase2',
      label: 'Fase 2',
      period: 'Out/2026 → Mar/2027',
      goal: 'Brasil + acelerar aposentadoria',
      color: '#f59e0b', bg: '#fffbeb', border: '#fde68a',
      items: [
        { id:1006,label:'Brasil 2027',      amount:667,  note:'Aumentar — meta $4k ate Mar/27' },
        { id:50,  label:'Emergency Savings',amount:400,  note:'Continuacao' },
        { id:52,  label:'TFSA',             amount:400,  note:'Aumentar contribuicao' },
        { id:1002,label:'Baby Fund',        amount:200,  note:'Aumentar — 2029 se aproxima' },
        { id:1010,label:'Earlobe + Dental', amount:200,  note:'Prazo chegando' },
      ]
    },
    {
      id: 'phase3',
      label: 'Fase 3',
      period: 'Abr/2027 em diante',
      goal: 'Regime permanente — aposentadoria',
      color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0',
      items: [
        { id:52,  label:'TFSA',             amount:600,  note:'Maximizar $7k/ano' },
        { id:50,  label:'Emergency Savings',amount:300,  note:'Sprint final ate $30,096' },
        { id:1002,label:'Baby Fund',        amount:400,  note:'2029 — sprint final' },
        { id:900, label:'Canada Life RRP',  amount:517,  note:'Auto-descontado salario Juliana' },
      ]
    },
  ];

  let h = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">`;

  phases.forEach(p => {
    const isActive = p.id === phase;
    const total = p.items.reduce((s,x)=>s+x.amount,0);

    h += `<div style="background:${p.bg};border:${isActive?'2px':'1px'} solid ${isActive?p.color:p.border};border-radius:10px;padding:14px;position:relative">
      ${isActive ? `<span style="position:absolute;top:-9px;right:12px;background:${p.color};color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.04em">ATUAL</span>` : ''}
      <div style="font-size:11px;font-weight:700;color:${p.color};text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">${p.label}</div>
      <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:2px">${p.period}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:10px;font-style:italic">${p.goal}</div>
      ${p.items.map(x => {
        const em = WALLET_EMOJI[x.id] || '';
        return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:4px 0;border-bottom:1px solid rgba(0,0,0,0.05);gap:6px">
          <div style="font-size:11px;color:#374151;display:flex;align-items:center;gap:4px;min-width:0">
            ${em ? `<span class="emo" style="font-size:12px;flex-shrink:0">${em}</span>` : ''}
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.label)}</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:${p.color};white-space:nowrap;font-family:'Geist Mono',monospace">${fmt(x.amount)}</span>
        </div>`;
      }).join('')}
      <div style="margin-top:8px;padding-top:6px;border-top:1px solid ${p.border};display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:#6b7280">Total/mes</span>
        <span style="font-size:13px;font-weight:700;color:${p.color};font-family:'Geist Mono',monospace">${fmt(total)}</span>
      </div>
    </div>`;
  });

  h += '</div>';
  phasesEl.innerHTML = h;
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
  <div style="margin-top:12px;padding:10px 12px;background:#eff6ff;border-radius:8px;border-left:3px solid #3b82f6">
    <div style="font-size:12px;font-weight:600;color:#1e40af;margin-bottom:4px">💡 Sobre o VGRO e diversificação</div>
    <div style="font-size:12px;color:#374151;line-height:1.6">VGRO (80% ações/20% renda fixa) é uma boa escolha para horizonte de 28 anos. Para reduzir risco gradualmente, considere migrar 20-30% para <strong>XBAL</strong> (60/40) após os 40 anos de vocês. O Canada Life RRP já funciona como âncora conservadora. Não há necessidade de mudança agora.</div>
  </div>

  <!-- CPP / OAS — Government pension -->
  <div style="margin-top:12px;padding:14px 16px;background:#fefce8;border-radius:8px;border-left:3px solid #eab308">
    <div style="font-size:13px;font-weight:700;color:#854d0e;margin-bottom:8px">🍁 Aposentadoria do governo canadense (CPP + OAS)</div>
    <div style="font-size:12px;color:#374151;line-height:1.7">
      Sim! Além dos seus investimentos, o governo paga dois benefícios:<br><br>
      <strong>1. CPP (Canada Pension Plan)</strong> — vocês já contribuem via paycheck desde 2023. É proporcional ao quanto e por quantos anos vocês contribuem. O máximo (2026) é <strong>$1.507/mês</strong> aos 65 anos, mas a média real é <strong>~$925/mês</strong>. O CPP cobre cerca de 25% da renda pré-aposentadoria.<br><br>
      <strong>2. OAS (Old Age Security)</strong> — pago a partir dos 65 anos a quem morou 10+ anos no Canadá. Não depende de contribuição (vem dos impostos gerais). Hoje é <strong>~$740/mês</strong>.<br><br>
      <strong>Estimativa para vocês:</strong> contribuindo desde 2023 com renda de ~$62-67k, cada um acumula cerca de <strong>$30-38/mês de CPP por ano contribuído</strong>. Se continuarem até os 55 (≈32 anos de contribuição), poderiam chegar perto do máximo. Mas aposentando aos 55 (sem contribuir dos 55 aos 65) e começando a receber aos 65, uma estimativa realista é <strong>$900-1.200/mês de CPP cada</strong> + $740 de OAS cada = <strong>~$3.300-3.900/mês do governo para o casal</strong> (em dólares de hoje, a partir dos 65).
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid #fde68a">
      <div style="font-size:12px;font-weight:600;color:#854d0e;margin-bottom:4px">🇧🇷 E se voltarem para o Brasil?</div>
      <div style="font-size:12px;color:#374151;line-height:1.7">
        Brasil e Canadá têm um <strong>Acordo de Previdência Social</strong> (em vigor desde 2014). Isso significa:<br>
        • O <strong>CPP</strong> que vocês acumularam pode ser <strong>recebido morando no Brasil</strong> — o Canadá deposita o benefício proporcional ao que foi contribuído lá.<br>
        • A <strong>OAS</strong> também pode ser paga no exterior, mas exige <strong>20 anos de residência no Canadá</strong> para manter o valor cheio fora do país (com menos de 20 anos, vira proporcional).<br>
        • O acordo permite <strong>somar os períodos</strong> dos dois países: o tempo contribuído no Canadá conta para qualificar no INSS brasileiro e vice-versa — útil para atingir o tempo mínimo de aposentadoria em qualquer um dos dois.<br><br>
        Na prática: o que vocês contribuíram aqui não se perde se voltarem. Cada país paga sua parte proporcional.
      </div>
    </div>
    <div style="margin-top:8px;font-size:10px;color:#a16207;font-style:italic">Estimativas aproximadas. Para valores exatos, criem conta no My Service Canada Account — mostra seu CPP acumulado real.</div>
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
        <span>Meta: <input type="number" value="${g.target}" min="0" onchange="savings.goals.find(x=>x.id===${g.id}).target=+this.value;renderGoals();renderSavingsMetrics();renderRetirementProjection();autoSave()"></span>
        <span>Guardado: <input type="number" value="${g.saved}" min="0" onchange="savings.goals.find(x=>x.id===${g.id}).saved=+this.value;renderGoals();renderSavingsMetrics();renderRetirementProjection();autoSave()"></span>
        <span>Mensal: <input type="number" value="${g.monthly}" min="0" onchange="savings.goals.find(x=>x.id===${g.id}).monthly=+this.value;renderGoals();renderRecommendations();autoSave()"></span>
        <span style="color:var(--accent);font-weight:500">≈ ${months} meses</span>
      </div>
    </div>`;
  });
  document.getElementById('goals-list').innerHTML = h;
}
function renderProvisions() {
  const catsEl  = document.getElementById('sf-categories');
  const metEl   = document.getElementById('sf-metrics');
  const barEl   = document.getElementById('sf-contribute-bar');
  if (!catsEl) return;

  loadSinkingFunds();

  if (!sinkingFunds || !sinkingFunds.length) {
    catsEl.innerHTML = '<div class="empty">Nenhuma categoria. Clique em "+ Nova categoria".</div>';
    return;
  }

  const totalBal    = sinkingFunds.reduce((s, f) => s + (+f.balance || 0), 0);
  const totalAlloc  = sinkingFunds.reduce((s, f) => s + (+f.monthlyContribution || 0), 0);
  const unalloc     = 0; // no fixed cap — total is whatever you allocate
  const curMonth    = new Date().toISOString().slice(0, 7);
  const contributed = sinkingFunds.every(f => f.lastContribution === curMonth);

  // ── Metrics ──
  if (metEl) metEl.innerHTML = `
    <div class="metric">
      <div class="lbl">Saldo acumulado</div>
      <div class="val" style="color:var(--green)">${fmt(totalBal)}</div>
      <div class="sub">disponível para usar</div>
    </div>
    <div class="metric">
      <div class="lbl">Total/mês</div>
      <div class="val" style="color:#f59e0b">$${totalAlloc}</div>
      <div class="sub">soma das categorias</div>
    </div>
    <div class="metric">
      <div class="lbl">Este mês</div>
      <div class="val" style="font-size:18px">${contributed ? '✅' : '⏳'}</div>
      <div class="sub">${contributed ? 'contribuição feita' : 'pendente'}</div>
    </div>
  `;

  // ── Contribute bar ──
  if (barEl) {
    barEl.innerHTML = `
    <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:12px">

      <!-- Top row: total editor + contribute button -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;color:var(--text2);font-weight:500">Total este mês:</span>
          <div style="display:flex;align-items:center;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px 10px">
            <span style="font-size:13px;color:var(--text3)">$</span>
            <input type="number" id="sf-total-input" value="${totalAlloc}" min="0" step="10"
              style="width:70px;border:none;background:transparent;font-size:15px;font-weight:700;color:var(--accent);font-family:'Geist Mono',monospace;text-align:center;outline:none"
              onchange="sfSetTotal(+this.value)"
              title="Altere o total mensal — redistribui proporcionalmente">
          </div>
          <span style="font-size:11px;color:var(--text3)">${contributed ? '<span style="color:var(--green)">✓ adicionado este mês</span>' : 'pendente'}</span>
        </div>
        <button class="btn btn-primary btn-sm" onclick="sfAddMonthlyAll()" style="white-space:nowrap">
          + Adicionar $${totalAlloc} do mês
        </button>
      </div>

      <!-- Per-category quick edit row -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--bg4)">
        <span style="font-size:11px;color:var(--text3);align-self:center;white-space:nowrap">Por categoria:</span>
        ${sinkingFunds.map(f => `
          <div style="display:flex;align-items:center;gap:4px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 8px">
            <span class="emo" style="font-size:12px">${SF_EMOJI[f.id] || '📦'}</span>
            <span style="font-size:11px;color:var(--text2)">${esc(f.name)}</span>
            <span style="font-size:11px;color:var(--text3)">$</span>
            <input type="number" value="${f.monthlyContribution}" min="0" step="5"
              style="width:44px;border:none;background:transparent;font-size:12px;font-weight:600;color:var(--accent);font-family:'Geist Mono',monospace;text-align:center;outline:none"
              onchange="sfEditContribDirect(${f.id}, +this.value)">
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // ── Category cards ──
  const COLORS = ['#ef4444','#3b82f6','#22c55e','#a855f7'];
  let h = '';

  sinkingFunds.forEach((f, i) => {
    const color   = COLORS[i % COLORS.length];
    const bal     = +f.balance || 0;
    const contrib = +f.monthlyContribution || 0;
    const hist    = f.history || [];
    const pct     = contrib > 0 ? Math.min(100, bal / (contrib * 3) * 100) : 0; // fill bar vs 3-month target

    h += `
    <div class="card" style="margin-bottom:10px">

      <!-- Header row: icon + name + balance + delete -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <span class="emo" style="font-size:22px;line-height:1;flex-shrink:0">${SF_EMOJI[f.id] || '📦'}</span>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600;color:var(--text)">${esc(f.name)}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${esc(f.note || '')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:700;font-family:'Geist Mono',monospace;color:${color}">${fmt(bal)}</div>
          <div style="font-size:11px;color:var(--text3)">+${fmt(contrib)}/mês</div>
        </div>
        <button class="rename-btn" onclick="renameSinkingFund(${f.id})" title="Renomear">⋯</button>
        <button class="del-btn" onclick="sfDeleteCategory(${f.id})">✕</button>
      </div>

      <!-- Progress bar (vs 3-month accumulation target) -->
      <div style="height:5px;background:var(--bg4);border-radius:3px;overflow:hidden;margin-bottom:12px">
        <div style="height:100%;width:${pct.toFixed(0)}%;background:${color};border-radius:3px;transition:width .4s"></div>
      </div>

      <!-- Action buttons -->
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-sm btn-primary" onclick="sfUse(${f.id})" ${bal <= 0 ? 'disabled style="opacity:.5"' : ''}>
          Registrar gasto
        </button>
        <button class="btn btn-sm" onclick="sfEditContrib(${f.id})" style="color:var(--text3)">
          Editar $${contrib}/mês
        </button>
      </div>

      <!-- History -->
      ${hist.length ? `
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;font-weight:600;margin-bottom:6px">Histórico</div>
        ${hist.slice(0, 5).map(h => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--bg4);font-size:12px">
            <span style="color:var(--text2)">${h.date}${h.desc ? ' · ' + esc(h.desc) : ''}</span>
            <span style="color:var(--red);font-family:'Geist Mono',monospace;font-weight:600">−${fmt(h.amount)}</span>
          </div>
        `).join('')}
      </div>` : ''}

    </div>`;
  });

  catsEl.innerHTML = h;
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
