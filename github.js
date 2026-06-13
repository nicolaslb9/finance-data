// ===== N&J Budget — GitHub Sync Module =====

let saveTimer = null;
function loadCfgUI() {
  document.getElementById('cfg-user').value = cfg.user||'';
  document.getElementById('cfg-repo').value = cfg.repo||'finance-data';
  document.getElementById('cfg-token').value = cfg.token||'';
}
function saveCfg() {
  cfg.user = document.getElementById('cfg-user').value;
  cfg.repo = document.getElementById('cfg-repo').value;
  cfg.token = document.getElementById('cfg-token').value;
  localStorage.setItem('finance_cfg', JSON.stringify(cfg));
}

function setSyncStatus(msg, cls) {
  const el = document.getElementById('sync-status');
  el.innerHTML = `<span class="sync-dot"></span>${msg}`;
  el.className = 'sync-pill ' + (cls||'');

  // Mobile badge in overview header
  const badge = document.getElementById('mobile-sync-badge');
  if (!badge) return;
  const states = {
    saved:   { emoji: '🟢', label: 'Sincronizado',   bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    saving:  { emoji: '🔄', label: 'Salvando…',       bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    error:   { emoji: '🔴', label: 'Erro no sync',    bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    default: { emoji: '⚪', label: 'Sem conexão',      bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
  };
  const s = states[cls] || states.default;
  badge.innerHTML = `<span style="
    display:inline-flex;align-items:center;gap:5px;
    background:${s.bg};border:1px solid ${s.border};
    border-radius:20px;padding:4px 10px;
    font-size:12px;font-weight:500;color:${s.color};
    font-family:'Geist',sans-serif;
  ">${s.emoji} <span class="badge-label">${s.label}</span></span>`;
}

async function githubRequest(method, path, body) {
  if (!cfg.user || !cfg.token) throw new Error('Configure usuário e token');
  const url = `https://api.github.com/repos/${cfg.user}/${cfg.repo}/contents/${path}`;
  const headers = { 'Authorization': 'token '+cfg.token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) { const e = await res.json().catch(()=>({message:res.statusText})); throw new Error(e.message||res.statusText); }
  return res.json();
}

async function loadFromGithub() {
  if (!cfg.user||!cfg.token) {
    const s = document.getElementById('cfg-status');
    if (s) s.textContent='Configure o GitHub primeiro';
    return;
  }
  setSyncStatus('carregando…','saving');
  try {
    const file = await githubRequest('GET','data.json');
    const json = JSON.parse(atob(file.content.replace(/\n/g,'')));
    // GitHub is the source of truth on load — replace local state entirely
    if (json.data) data = json.data;
    if (json.savings) savings = json.savings;
    if (savings.sinkingFunds && savings.sinkingFunds.length) sinkingFunds = savings.sinkingFunds;
    localStorage.setItem('finance_data',JSON.stringify(data));
    localStorage.setItem('finance_savings',JSON.stringify(savings));
    // Mark load complete — saves are now allowed
    window._loadComplete = true;
    if (!data[currentMonth]) data[currentMonth] = defaultMonthData();
    syncMonthSelectors();
    render();
    setSyncStatus('sincronizado ✓','saved');
    const cfgStatusEl = document.getElementById('cfg-status');
    if (cfgStatusEl) cfgStatusEl.textContent='✓ Dados carregados do GitHub';
    showAutoConnectToast();
  } catch(e) {
    setSyncStatus('erro','error');
    document.getElementById('cfg-status').textContent='✗ '+e.message;
  }
}

async function saveToGithub() {
  if (!cfg.user||!cfg.token) { showTab('settings'); return; }
  setSyncStatus('salvando…','saving');
  const payload = JSON.stringify({data,savings},null,2);
  const content = btoa(unescape(encodeURIComponent(payload)));
  try {
    let sha;
    let prevContent = null;
    try {
      const ex = await githubRequest('GET','data.json');
      sha = ex.sha;
      prevContent = ex.content; // base64 of current (pre-save) data — used for backup
    } catch(e){}

    // Backup: keep the previous data.json as data.json.bak before overwriting
    if (prevContent) {
      try {
        let bakSha;
        try { const b = await githubRequest('GET','data.json.bak'); bakSha=b.sha; } catch(e){}
        const bakBody = { message:'backup before '+new Date().toISOString(), content: prevContent.replace(/\n/g,'') };
        if (bakSha) bakBody.sha = bakSha;
        await githubRequest('PUT','data.json.bak',bakBody);
      } catch(e) { /* backup is best-effort, never blocks the main save */ }
    }

    const body = { message:'update '+new Date().toISOString(), content };
    if (sha) body.sha = sha;
    await githubRequest('PUT','data.json',body);
    const now = new Date();
    localStorage.setItem('last_save_time', now.toISOString());
    window._unsavedChanges = false;
    setSyncStatus('salvo ✓', 'saved');
    localStorage.setItem('finance_data',JSON.stringify(data));
    localStorage.setItem('finance_savings',JSON.stringify(savings));
    updateSaveButton('saved', now);
  } catch(e) {
    window._unsavedChanges = true;
    setSyncStatus('⚠ não salvo na nuvem','error');
    updateSaveButton('error');
  }
}

function updateSaveButton(state, time) {
  const btn = document.getElementById('floating-save-btn');
  if (!btn) return;
  if (state === 'saving') {
    btn.innerHTML = '<span class="save-spinner"></span> Salvando…';
    btn.style.background = '#f59e0b'; btn.style.borderColor = '#f59e0b';
  } else if (state === 'saved') {
    const t = time ? time.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
    btn.innerHTML = '✓ Salvo ' + t;
    btn.style.background = '#16a34a'; btn.style.borderColor = '#16a34a';
    setTimeout(() => {
      btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M8 1v10M4 7l4 4 4-4M2 14h12"/></svg> Salvar agora';
      btn.style.background = 'var(--accent)'; btn.style.borderColor = 'var(--accent)';
    }, 2500);
  } else if (state === 'error') {
    btn.innerHTML = '⚠ Erro — toque p/ tentar';
    btn.style.background = '#dc2626'; btn.style.borderColor = '#dc2626';
  }
}

function autoSave() {
  // GUARD: never save before the initial GitHub load finished —
  // prevents stale localStorage from overwriting good cloud data (data-loss bug)
  if (cfg.user && cfg.token && !window._loadComplete) {
    return;
  }
  localStorage.setItem('finance_data',JSON.stringify(data));
  localStorage.setItem('finance_savings',JSON.stringify(savings));
  if (cfg.user&&cfg.token) {
    setSyncStatus('salvando…','saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToGithub,1500);
  } else {
    setSyncStatus('só local — configure GitHub','error');
  }
}

async function generateWeeklyReport(silent) {
  const contentEl = document.getElementById('weekly-report-content');
  const loadingEl = document.getElementById('report-loading');
  const btnEl = document.getElementById('report-gen-btn');
  const dateLbl = document.getElementById('report-date-label');

  if (!contentEl) return;

  if (!silent) {
    contentEl.style.display = 'none';
    loadingEl.style.display = 'block';
    if (btnEl) btnEl.disabled = true;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: buildReportPrompt() }]
      })
    });

    const data = await response.json();
    const reportHtml = data.content?.[0]?.text || 'Erro ao gerar relatório.';

    // Strip any markdown code fences just in case
    const clean = reportHtml.replace(/```html?|```/g, '').trim();

    // Save to localStorage + GitHub
    const reportObj = {
      html: clean,
      week: getWeekLabel(),
      generatedAt: new Date().toISOString(),
      month: currentMonth
    };
    localStorage.setItem('finance_weekly_report', JSON.stringify(reportObj));
    saveReportToGithub(reportObj);

    renderWeeklyReport(reportObj);
    if (!silent) scheduleWeeklyNotification();

  } catch(err) {
    contentEl.style.display = 'block';
    contentEl.innerHTML = `<div style="padding:12px;color:var(--red);font-size:13px">Erro ao gerar: ${err.message}</div>`;
  } finally {
    loadingEl.style.display = 'none';
    if (btnEl) btnEl.disabled = false;
  }
}

async function saveReportToGithub(reportObj) {
  if (!cfg.user || !cfg.token) return;
  try {
    let sha;
    try {
      const ex = await githubRequest('GET', 'weekly-report.json');
      sha = ex.sha;
    } catch(e) {}
    const body = { message: 'update weekly report', content: btoa(unescape(encodeURIComponent(JSON.stringify(reportObj, null, 2)))) };
    if (sha) body.sha = sha;
    await githubRequest('PUT', 'weekly-report.json', body);
  } catch(e) { console.log('Report save error:', e.message); }
}

async function loadReportFromGithub() {
  if (!cfg.user || !cfg.token) return null;
  try {
    const file = await githubRequest('GET', 'weekly-report.json');
    return JSON.parse(atob(file.content.replace(/\n/g,'')));
  } catch(e) { return null; }
}

function loadWeeklyReport() {
  // Try localStorage first (instant), then check if we should auto-generate
  const cached = localStorage.getItem('finance_weekly_report');
  if (cached) {
    try {
      const r = JSON.parse(cached);
      renderWeeklyReport(r);
      // Check if report is older than 7 days — auto-regenerate silently
      const age = (Date.now() - new Date(r.generatedAt).getTime()) / (1000*60*60*24);
      if (age > 7) {
        console.log('Report is', Math.round(age), 'days old — auto-regenerating');
        setTimeout(() => generateWeeklyReport(true), 3000); // silent, after 3s
      }
      return;
    } catch(e) {}
  }
  // No cached report — try loading from GitHub
  loadReportFromGithub().then(r => {
    if (r) {
      localStorage.setItem('finance_weekly_report', JSON.stringify(r));
      renderWeeklyReport(r);
    }
  });
}

// ── Local push notification scheduling ─────────────────────────────────────
async function tryAutoLoad() {
  if (!cfg.user || !cfg.token) {
    // No cloud sync — local-only mode, saves allowed immediately
    window._loadComplete = true;
    setSyncStatus('sem configuração', '');
    return;
  }
  // Have credentials — load cloud data FIRST (source of truth) before allowing any save
  setSyncStatus('conectando…', 'saving');
  try {
    await loadFromGithub();   // sets window._loadComplete = true on success
  } catch(e) {
    // Load failed — DO NOT allow saves (would overwrite good cloud data with stale local).
    // Keep _loadComplete false; user sees error and can retry.
    window._loadComplete = false;
    setSyncStatus('⚠ erro ao conectar — não editando', 'error');
  }
}

init();
tryAutoLoad();


// ===== UI helpers (FAB) =====

// Show FAB only on mobile and only on transactions tab


// Warn before leaving if there are unsaved cloud changes
window.addEventListener('beforeunload', (e) => {
  if (window._unsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
});
