// ===== N&J Budget — Charts Module (Chart.js) =====

function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }

function renderDonutChart() {
  destroyChart('donut');
  const types = ['fixed','debt','needs','wants','savings'];
  const vals = types.map(t => spentByType(t));
  const total = vals.reduce((a,b)=>a+b,0);
  document.getElementById('donut-total').textContent = total > 0 ? fmt(total) + ' gastos' : 'sem gastos';
  if (total === 0) {
    const labels = types.map(t => typeLabel(t));
    const budgets = types.map(t => totalByType(t));
    const ctx = document.getElementById('chart-donut').getContext('2d');
    charts['donut'] = new Chart(ctx, {
      type: 'doughnut',
      data: { labels, datasets: [{ data: budgets, backgroundColor: types.map(t=>typeColor(t)), borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { font: { family: 'Geist', size: 11 }, boxWidth: 10, padding: 10, color: '#6b6b66' } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } } } }
    });
    return;
  }
  const ctx = document.getElementById('chart-donut').getContext('2d');
  charts['donut'] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: types.map(t=>typeLabel(t)),
      datasets: [{ data: vals, backgroundColor: types.map(t=>typeColor(t)), borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'right', labels: { font: { family: 'Geist', size: 11 }, boxWidth: 10, padding: 10, color: '#6b6b66' } }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } } } }
  });
}

function renderBars() {
  const inc = totalIncome() || 1;
  const types = ['fixed','debt','needs','wants','savings'];
  let h = '';
  types.forEach(t => {
    const bud = totalByType(t), sp = spentByType(t);
    const pct = clamp(bud/inc*100,0,100);
    const spPct = clamp(sp/inc*100,0,100);
    const over = sp > bud && bud > 0;
    const color = over ? 'var(--red)' : typeColor(t);
    h += `<div class="bar-row">
      <span class="bar-lbl">${typeLabel(t)}</span>
      <div class="bar-track" style="position:relative">
        <div style="position:absolute;height:100%;width:${pct.toFixed(1)}%;background:${typeLightColor(t)};border-radius:4px"></div>
        <div class="bar-fill" style="width:${spPct.toFixed(1)}%;background:${color};position:relative"></div>
      </div>
      <span class="bar-amt" style="color:${over?'var(--red)':'var(--text2)'}">${fmt(sp)}<span style="color:var(--text3)">/${fmt(bud)}</span></span>
    </div>`;
  });
  document.getElementById('bars').innerHTML = h;
}

function renderCatChart() {
  destroyChart('cats');
  const cats = md().budget.filter(b => spentForCat(b.id) > 0).sort((a,b) => spentForCat(b.id)-spentForCat(a.id)).slice(0,8);
  if (cats.length === 0) return;
  const ctx = document.getElementById('chart-cats').getContext('2d');
  charts['cats'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats.map(b => b.name.length > 14 ? b.name.slice(0,14)+'…' : b.name),
      datasets: [
        { label: 'Orçado', data: cats.map(b=>b.budget), backgroundColor: cats.map(b=>typeLightColor(b.type)), borderColor: cats.map(b=>typeColor(b.type)), borderWidth: 1, borderRadius: 4, barPercentage: 0.7 },
        { label: 'Gasto', data: cats.map(b=>spentForCat(b.id)), backgroundColor: cats.map(b=>typeColor(b.type)), borderRadius: 4, barPercentage: 0.7 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.x)}` } } },
      scales: {
        x: { grid: { color: '#f0f0ee' }, ticks: { font: { family: 'Geist Mono', size: 10 }, color: '#a8a8a2', callback: v => '$'+Math.round(v/1000*10)/10+'k' } },
        y: { grid: { display: false }, ticks: { font: { family: 'Geist', size: 11 }, color: '#6b6b66' } }
      }
    }
  });
}

function renderBudgetSummaryChart() {
  destroyChart('budget-summary');
  const types = ['fixed','debt','needs','wants','savings','provision'];
  const ctx = document.getElementById('chart-budget-summary');
  if (!ctx) return;
  charts['budget-summary'] = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: types.map(typeLabel),
      datasets: [
        { label: 'Orçado', data: types.map(t=>totalByType(t)), backgroundColor: types.map(t=>typeLightColor(t)), borderColor: types.map(t=>typeColor(t)), borderWidth: 1.5, borderRadius: 5, barPercentage: 0.65 },
        { label: 'Gasto', data: types.map(t=>spentByType(t)), backgroundColor: types.map(t=>typeColor(t)), borderRadius: 5, barPercentage: 0.65 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { family: 'Geist', size: 11 }, boxWidth: 10, color: '#6b6b66' } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Geist', size: 11 }, color: '#6b6b66' } },
        y: { grid: { color: '#f0f0ee' }, ticks: { font: { family: 'Geist Mono', size: 10 }, color: '#a8a8a2', callback: v => '$'+v } }
      }
    }
  });
}

function renderBudgetPieChart() {
  destroyChart('budget-pie');
  const ctx = document.getElementById('chart-budget-pie');
  if (!ctx) return;
  const types = ['fixed','debt','needs','wants','savings','provision'];
  const inc = totalIncome();
  const budgeted = types.map(t => totalByType(t));
  const totalBud = budgeted.reduce((a,b)=>a+b,0);
  const unalloc = Math.max(0, inc - totalBud);
  const labels = [...types.map(typeLabel), 'Não alocado'];
  const vals = [...budgeted, unalloc];
  const colors = [...types.map(typeColor), '#e5e7eb'];
  const pieEl = document.getElementById('budget-pie-sub');
  if (pieEl) pieEl.textContent = unalloc > 0 ? fmt(unalloc) + ' livre' : '100% alocado';
  charts['budget-pie'] = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Geist', size: 10 }, boxWidth: 10, padding: 8, color: '#6b6b66' } },
        tooltip: { callbacks: { label: ctx => {
          const pct = inc > 0 ? Math.round(ctx.parsed/inc*100) : 0;
          return ` ${ctx.label}: ${fmt(ctx.parsed)} (${pct}%)`;
        }}}
      }
    }
  });
}

