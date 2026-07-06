
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
let currentMonth = new Date().getMonth();  // abre no mês atual real (Jan=0 ... Dez=11)
let nextId = 1000;
let charts = {};

function defaultMonthData() {
  // Mirror of June 2026 — emojis are added by catLabel() in JS, NOT stored in names
  return {
    income: [
      {id:1,label:'Income 1 (Juliana)',amount:1768},
      {id:2,label:'Income 2 (Nicolas)',amount:2160},
      {id:3,label:'Income 3 (Juliana)',amount:1768},
      {id:4,label:'Income 4 (Nicolas)',amount:2160},
    ],
    budget: [
      {id:20,name:'Car Financing',type:'debt',budget:592},
      {id:21,name:'iPhone Financing',type:'debt',budget:120},
      {id:10,name:'Aluguel',type:'fixed',budget:2310},
      {id:11,name:'BC Hydro',type:'fixed',budget:45},
      {id:12,name:'Telus',type:'fixed',budget:80},
      {id:13,name:'Car Insurance',type:'fixed',budget:327},
      {id:14,name:'Home Insurance',type:'fixed',budget:32},
      {id:15,name:'Koodo Phone Plans',type:'fixed',budget:110},
      {id:1000,name:'Terapia',type:'fixed',budget:400},
      {id:30,name:'Groceries',type:'needs',budget:800},
      {id:31,name:'Gas',type:'needs',budget:200},
      {id:50,name:'Emergency Savings',type:'savings',budget:300},
      {id:51,name:'Japan Trip',type:'savings',budget:1000},
      {id:52,name:'TFSA',type:'savings',budget:300},
      {id:1002,name:'Baby Fund',type:'savings',budget:30},
      {id:1006,name:'Brasil 2027',type:'savings',budget:100},
      {id:1010,name:'Earlobe + Dental',type:'savings',budget:50},
      {id:60,name:'Sinking Funds',type:'provision',budget:100},
      {id:40,name:'Restaurante & Fun',type:'wants',budget:300},
      {id:42,name:'Subscriptions',type:'wants',budget:108},
      {id:43,name:'Allowance Nicolas',type:'wants',budget:300},
      {id:44,name:'Allowance Juliana',type:'wants',budget:300},
    ],
    transactions: [],
  };
}

let data = {};
let savings = {
  wallets: [
    {id:1,name:'Emergency Savings (Wealthsimple)',amount:7919},
    {id:2,name:'Travel / Viagens',amount:0},
    {id:3,name:'TFSA',amount:3904},
    {id:4,name:'Retirement Fund (Canada Life)',amount:5012},
    {id:5,name:'College / Future Big Purchases',amount:700},
  ],
  goals: [
    {id:1,name:'Emergency Savings ($500/mês)',target:10500,saved:7919,monthly:500},
    {id:2,name:'TFSA Retirement',target:12000,saved:3904,monthly:300},
    {id:3,name:'Brazil Fund',target:2600,saved:0,monthly:200},
    {id:4,name:'Travel / Viagens',target:3000,saved:0,monthly:500},
    {id:5,name:'Immigration',target:2000,saved:0,monthly:200},
  ]
};
let cfg = {user:'',repo:'finance-data',token:''};

const APP_VERSION = '2026-06-v78'; // bump to force localStorage refresh

function init() {
  // Block all cloud saves until the initial GitHub load finishes (anti data-loss guard)
  window._loadComplete = false;
  // If app version changed, wipe localStorage so GitHub data takes over
  const storedVersion = localStorage.getItem('app_version');
  if (storedVersion !== APP_VERSION) {
    localStorage.removeItem('finance_data');
    localStorage.removeItem('finance_savings');
    localStorage.setItem('app_version', APP_VERSION);
  }

  const s = localStorage.getItem('finance_data');
  if (s) { try { data = JSON.parse(s); } catch(e){} }
  const sv = localStorage.getItem('finance_savings');
  if (sv) { try { savings = JSON.parse(sv); } catch(e){} }
  const sc = localStorage.getItem('finance_cfg');
  if (sc) { try { cfg = JSON.parse(sc); loadCfgUI(); } catch(e){} }
  if (!data[currentMonth]) data[currentMonth] = defaultMonthData();
  if (!savings.sinkingPool) savings.sinkingPool = { monthlyContribution: 150, carryover: 0, expenses: {} };

  // Populate + sync all month selectors on boot
  syncMonthSelectors();

  // Sync sinkingFunds from savings — if empty, seed from defaults
  if (savings.sinkingFunds && savings.sinkingFunds.length) {
    sinkingFunds = savings.sinkingFunds;
  } else {
    // No saved data — sinkingFunds keeps its default 4 categories defined above
    savings.sinkingFunds = sinkingFunds;
  }

  render();
  loadWeeklyReport();
}

function md() { return data[currentMonth]; }
function changeMonth(srcEl) {
  // Read from whichever selector triggered it (or the overview one as fallback)
  const sel = srcEl || document.getElementById('month-sel');
  if (!sel) return;
  currentMonth = parseInt(sel.value);
  if (!data[currentMonth]) data[currentMonth] = defaultMonthData();
  syncMonthSelectors();
  render();
  autoSave();
}

// Populate every .month-selector with options and keep them all in sync
function syncMonthSelectors() {
  const opts = MONTHS.map((m,i)=>`<option value="${i}"${i===currentMonth?' selected':''}>${m.slice(0,3)} 2026</option>`).join('');
  document.querySelectorAll('.month-selector').forEach(sel => {
    sel.innerHTML = opts;
    sel.value = currentMonth;
  });
  const lbl = document.getElementById('month-label');
  if (lbl) lbl.textContent = MONTHS[currentMonth].slice(0,3) + ' 2026';
}

// COMPUTED
function spentForCat(id) { return md().transactions.filter(t=>t.cat===id).reduce((s,t)=>s+(+t.amount||0),0); }
function totalByType(type) { return md().budget.filter(b=>b.type===type).reduce((s,b)=>s+(+b.budget||0),0); }
function spentByType(type) { return md().budget.filter(b=>b.type===type).reduce((s,b)=>s+spentForCat(b.id),0); }
function fmt(n) { return '$'+Math.abs(Math.round(n)).toLocaleString('en-CA'); }
function fmtSigned(n) { return (n<0?'-':'')+fmt(n); }
function clamp(v,a,b) { return Math.max(a,Math.min(b,v)); }
function typeLabel(t) { return {fixed:'Fixo',debt:'Dívida',needs:'Necessidade',wants:'Desejo',savings:'Savings',provision:'Provisões'}[t]||t; }
function typeColor(t) { return {fixed:'#94a3b8',debt:'#ef4444',needs:'#22c55e',wants:'#3b82f6',savings:'#8b5cf6',provision:'#f59e0b'}[t]||'#94a3b8'; }
function typeLightColor(t) { return {fixed:'#f8fafc',debt:'#fef2f2',needs:'#f0fdf4',wants:'#eff6ff',savings:'#f5f3ff',provision:'#fffbeb'}[t]||'#f8fafc'; }

function getTx(id) { return md().transactions.find(x=>x.id===id); }
function removeTx(id) {
  if(!confirm('Remover esta transacao?')) return; md().transactions = md().transactions.filter(x=>x.id!==id); render(); autoSave(); }
function addTx() {
  const today = new Date().toISOString().slice(0,10);
  // Collision-proof ID: higher than any existing transaction id across ALL months
  let maxId = 0;
  for (const mk in data) {
    (data[mk].transactions||[]).forEach(t => { if (+t.id > maxId) maxId = +t.id; });
  }
  const newId = Math.max(maxId, nextId, 3000) + 1;
  nextId = newId + 1;
  md().transactions.unshift({id:newId,date:today,cat:md().budget[0]?.id||10,desc:'',amount:0});
  render(); autoSave(); showTab('transactions');
}

function getCurrentPhase() {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (y < 2026 || (y===2026 && m<=8)) return 'phase1'; // up to Sept 2026
  if (y===2026 || (y===2027 && m<=2)) return 'phase2'; // Oct 2026 - Mar 2027
  return 'phase3';
}

function showTab(name) {
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const tabs = ['overview','budget','transactions','savings','provisions','cardebt','settings'];
  document.getElementById('section-'+name).classList.add('active');
  document.querySelectorAll('.nav-item')[tabs.indexOf(name)].classList.add('active');
  if (name==='budget') { renderBudgetOverview(); }
  if (name==='provisions') { loadSinkingFunds(); renderProvisions(); }
  if (name==='cardebt') { renderCarDebt(); }
  if (name==='savings') { renderRecommendations(); renderPhasesPlan(); renderRetirementProjection(); }
  if (name==='settings') { loadCfgUI(); }
}

async function manualSave() {
  if (!cfg.user || !cfg.token) {
    alert('Configure o GitHub primeiro (aba Configurações) para salvar na nuvem.');
    showTab('settings');
    return;
  }
  clearTimeout(saveTimer);
  updateSaveButton('saving');
  await saveToGithub();
}

async function testConnection() {
  saveCfg();
  document.getElementById('cfg-status').textContent='Testando…';
  try {
    const res = await fetch(`https://api.github.com/repos/${cfg.user}/${cfg.repo}`,{headers:{Authorization:'token '+cfg.token}});
    if (res.ok) { document.getElementById('cfg-status').textContent='✓ Conexão OK!'; setSyncStatus('conectado ✓','saved'); }
    else throw new Error((await res.json()).message);
  } catch(e) { document.getElementById('cfg-status').textContent='✗ '+e.message; setSyncStatus('erro','error'); }
}

function exportData() {
  const blob = new Blob([JSON.stringify({data,savings},null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='finance-backup.json'; a.click();
}
function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => { try { const j=JSON.parse(ev.target.result); if(j.data)data=j.data; if(j.savings)savings=j.savings; render(); autoSave(); } catch(err){alert('Arquivo inválido');} };
  r.readAsText(file);
}
function resetData() {
  data={}; savings={wallets:[],goals:[]};
  data[currentMonth]=defaultMonthData();
  localStorage.removeItem('finance_data'); localStorage.removeItem('finance_savings');
  render();
}
// ============ SINKING FUNDS / PROVISIONS ============

let sinkingFunds = [
  {id:1,name:'Carro & Estacionamento',icon:'🚗',balance:0,monthlyContribution:80,note:'Manutencao, estacionamento e gastos variaveis do carro',history:[]},
  {id:2,name:'Saúde',icon:'🏥',balance:0,monthlyContribution:20,note:'Dentista, vitaminas, remédios, óculos, fisio',history:[]},
  {id:3,name:'Casa & Assinaturas',icon:'🏠',balance:0,monthlyContribution:15,note:'Costco membership, utensílios, manutenção do apt',history:[]},
  {id:5,name:'Presentes & Datas',icon:'🎁',balance:0,monthlyContribution:15,note:'Aniversários, Natal, datas especiais, jantares de comemoração',history:[]},
];

function getCarLoan() {
  return {
    balance: 16060,
    annualRate: 0.0949,
    biweeklyPayment: 294.24,
    remainingPayments: 63,
    maturityDate: 'Nov 2028'
  };
}

function carAmortSchedule(balance, annualRate, pmt, payments) {
  const r = annualRate / 26;
  const schedule = [];
  let bal = balance;
  for (let i = 0; i < payments && bal > 0; i++) {
    const interest = bal * r;
    const principal = Math.min(pmt - interest, bal);
    bal = Math.max(0, bal - principal);
    schedule.push({payment: i+1, interest: +interest.toFixed(2), principal: +principal.toFixed(2), balance: +bal.toFixed(2)});
  }
  return schedule;
}

function getWeekLabel() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = d => d.toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit'});
  return `Semana ${fmt(monday)} – ${fmt(sunday)}`;
}

function buildReportPrompt() {
  const m = md();
  const inc = totalIncome();
  const budgetLines = m.budget.map(b => {
    const sp = spentForCat(b.id);
    return `${b.name} (${typeLabel(b.type)}): orçado $${b.budget}, gasto $${sp.toFixed(0)}`;
  }).join('\n');

  const txLines = [...m.transactions]
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 30)
    .map(t => {
      const cat = m.budget.find(b=>b.id===t.cat);
      return `${t.date} | ${cat?.name||'?'} | ${t.desc||''} | $${t.amount}`;
    }).join('\n');

  const sfBalance = (savings.sinkingFunds||[]).reduce((s,f)=>s+(+f.balance||0),0);
  const totalSaved = savings.wallets.reduce((s,w)=>s+(+w.amount||0),0);
  const totalSpent = m.budget.reduce((s,b)=>s+spentForCat(b.id),0);
  const unalloc = inc - m.budget.reduce((s,b)=>s+(+b.budget||0),0);

  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  return `Você é um assistente financeiro pessoal para um casal jovem (Nicolas, 27, e Juliana, 30) morando em Vancouver, BC, Canadá. Analise os dados financeiros abaixo e gere um relatório semanal em português brasileiro.

MÊS ATUAL: ${MONTHS[currentMonth]} 2026
RENDA MENSAL LÍQUIDA: $${inc.toLocaleString('en-CA')} CAD

ORÇAMENTO VS GASTOS:
${budgetLines}

TRANSAÇÕES RECENTES (últimas 30):
${txLines || 'Nenhuma transação registrada ainda.'}

RESUMO:
- Total gasto no mês: $${totalSpent.toFixed(0)}
- Não alocado no orçamento: $${unalloc.toFixed(0)}
- Saldo sinking funds: $${sfBalance.toFixed(0)}
- Patrimônio total guardado: $${totalSaved.toLocaleString('en-CA')}

METAS ATIVAS: Japan Trip, Emergency Fund ($33k), TFSA, Baby Fund 2029, Brasil 2027

Gere um relatório semanal com EXATAMENTE esta estrutura HTML (sem markdown, sem blocos de código, apenas HTML inline):

<div style="display:flex;flex-direction:column;gap:16px">

<div style="background:#f0fdf4;border-radius:10px;padding:14px 16px;border-left:3px solid #22c55e">
<div style="font-size:12px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">✅ Pontos positivos</div>
<ul style="font-size:13px;color:#166534;line-height:1.9;padding-left:16px;margin:0">
[3 pontos positivos específicos baseados nos dados]
</ul>
</div>

<div style="background:#fef2f2;border-radius:10px;padding:14px 16px;border-left:3px solid #ef4444">
<div style="font-size:12px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">⚠️ Atenção necessária</div>
<ul style="font-size:13px;color:#991b1b;line-height:1.9;padding-left:16px;margin:0">
[2-3 alertas específicos com valores reais dos dados]
</ul>
</div>

<div style="background:#eff6ff;border-radius:10px;padding:14px 16px;border-left:3px solid #3b82f6">
<div style="font-size:12px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">💡 Recomendações da semana</div>
<ul style="font-size:13px;color:#1e40af;line-height:1.9;padding-left:16px;margin:0">
[2-3 ações concretas e específicas para esta semana]
</ul>
</div>

<div style="background:#fafafa;border-radius:10px;padding:12px 16px;border:1px solid #e5e7eb">
<div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📊 Número da semana</div>
<div style="font-size:28px;font-weight:700;font-family:monospace;color:#111827">[número mais relevante]</div>
<div style="font-size:12px;color:#6b7280;margin-top:4px">[explicação do número em 1 linha]</div>
</div>

</div>

Seja direto, use valores reais dos dados, e foque em ações práticas. Não invente dados que não estão nos dados fornecidos.`;
}

function scheduleWeeklyNotification() {
  if (!('Notification' in window)) return;

  Notification.requestPermission().then(perm => {
    if (perm !== 'granted') return;

    // Calculate next Monday 9am
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
    nextMonday.setHours(9, 0, 0, 0);
    const delay = nextMonday.getTime() - now.getTime();

    // Save scheduled time to localStorage so SW can pick it up
    localStorage.setItem('report_notify_at', nextMonday.toISOString());
    console.log('Notification scheduled for', nextMonday.toLocaleString('pt-BR'));

    // Schedule via setTimeout (works when app is open)
    setTimeout(() => {
      new Notification('N&J Budget 📊', {
        body: 'Seu relatório semanal está pronto. Toque para abrir.',
        icon: '/finance-data/icon-192.png',
        badge: '/finance-data/icon-192.png',
        tag: 'weekly-report'
      });
      generateWeeklyReport(true);
    }, delay);
  });
}

function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Notificações não suportadas neste browser.');
    return;
  }
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') {
      scheduleWeeklyNotification();
      alert('✅ Notificações ativadas! Você receberá o relatório toda segunda-feira às 9h.');
    } else {
      alert('Permissão negada. Ative nas configurações do seu dispositivo.');
    }
  });
}

function showAutoConnectToast() {
  // Only show toast if the page just loaded (not on manual saves)
  if (window._toastShown) return;
  window._toastShown = true;
  const toast = document.createElement('div');
  const isMobile = window.innerWidth <= 720;
  toast.className = isMobile ? 'mobile-toast' : '';
  toast.style.cssText = [
    'position:fixed',isMobile?'bottom:calc(72px + env(safe-area-inset-bottom))':'bottom:24px','right:24px','z-index:9999',
    'background:#1a1a18','color:#f0f0f2','border-radius:10px',
    'padding:12px 18px','font-size:13px','font-family:Geist,sans-serif',
    'display:flex','align-items:center','gap:10px',
    'box-shadow:0 4px 20px rgba(0,0,0,0.15)',
    'animation:slideUp .25s ease','opacity:1','transition:opacity .3s'
  ].join(';');
  toast.innerHTML = '<span style="color:#34d399;font-size:16px">✓</span> Conectado ao GitHub automaticamente';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(), 300); }, 3000);
}

// ── Emoji map per category ID (kept in JS, not in data, avoids encoding bugs) ──
const CAT_EMOJI = {
  // Debt
  20: '🚗', 21: '📱',
  // Fixed
  10: '🏠', 11: '⚡', 12: '📡', 13: '🛡️', 14: '🛡️', 15: '📲', 1000: '🎓', 1001: '🧠', 3066: '🎓',
  // Needs
  30: '🛒', 31: '⛽', 32: '❤️', 33: '🏡',
  // Savings
  50: '🎯', 51: '🗾', 52: '📈', 1002: '👶', 1006: '🇧🇷', 1010: '💆',
  // Provision
  60: '🐷',
  // Wants
  40: '🍽️', 41: '✨', 42: '🔁', 43: '🎁', 44: '🎁', 45: '👗',
};

// Wallet/goal emoji by ID
const WALLET_EMOJI = {
  50: '🎯', 51: '🗾', 52: '📈', 1002: '👶', 1006: '🇧🇷', 1010: '💆', 900: '🏦',
  1000: '🎓', 1011: '🐷', 3066: '🎓',
};

// Sinking fund emoji by ID — kept in JS, not in data
const SF_EMOJI = {
  1: '🚗',  // Carro
  2: '🏥',  // Saude
  3: '🏠',  // Casa & Assinaturas
  5: '🎁',  // Presentes & Datas,
};

function sfLabel(id, name) {
  const em = SF_EMOJI[id] || '📦';
  return `<span class="emo">${em}</span> ${esc(name)}`;
}

// Returns "emoji Name" — emoji hardcoded in JS, name from data
function catLabel(id, name) {
  const em = CAT_EMOJI[id] || '';
  return em ? `<span class="emo">${em}</span> ${esc(name)}` : esc(name);
}
function walletLabel(id, name) {
  const em = WALLET_EMOJI[id] || '';
  return em ? `<span class="emo">${em}</span> ${esc(name)}` : esc(name);
}

// ── Generic rename helper for titles (avoids emoji-in-input bug) ─────────────
function withEmoji(str) {
  const s = esc(str);
  // Match emoji (incl. flags, ZWJ sequences, variation selectors)
  return s.replace(
    /(\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic})*[\uFE0F]?|[\u{1F1E6}-\u{1F1FF}]{2})/gu,
    '<span class="emo">$1</span>'
  );
}

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function updateFab(tabName) {
  const fab = document.getElementById('mobile-fab');
  if (!fab) return;
  const isMobile = window.innerWidth <= 720;
  fab.style.display = (isMobile && tabName === 'transactions') ? 'flex' : 'none';
}
const _origShowTabFab = showTab;
showTab = function(name) { _origShowTabFab(name); updateFab(name); };
window.addEventListener('resize', () => {
  const active = document.querySelector('.nav-item.active');
  if (active) updateFab(active.getAttribute('onclick')?.match(/'(\w+)'/)?.[1] || '');
});


// ===== Service Worker registration =====

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/finance-data/service-worker.js');

      // Check for updates every time the app opens
      reg.update();

      // When a new SW is waiting, activate it immediately
      reg.addEventListener('updatefound', () => {
        const newSW = reg.installing;
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            // New version ready — reload to get fresh app
            newSW.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        });
      });

      // If SW controller changes (new SW took over), reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch(err) {
      console.log('SW error:', err);
    }
  });
}
