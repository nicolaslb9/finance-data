// ===== N&J Budget — Budget & Income Module =====

function totalIncome() { return md().income.reduce((s,i)=>s+(+i.amount||0),0); }
function getIncome(id) { return md().income.find(x=>x.id===id); }
function removeIncome(id) { if(!confirm('Remover esta linha de renda?')) return; md().income = md().income.filter(x=>x.id!==id); render(); autoSave(); }
function addIncome() { md().income.push({id:nextId++,label:'Nova renda',amount:0}); render(); autoSave(); }

function syncBudgetMonthSelect() {
  const sel = document.getElementById('budget-month-sel');
  if (!sel) return;
  const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  sel.innerHTML = MONTHS_SHORT.map((m,i)=>`<option value="${i}"${i===currentMonth?' selected':''}>${m} 2026</option>`).join('');
}

function getBudget(id) { return md().budget.find(x=>x.id===id); }
function removeBudget(id) { const b=getBudget(id); if(!confirm(`Remover a categoria "${b?b.name:''}"?`)) return; md().budget = md().budget.filter(x=>x.id!==id); render(); renderBudgetOverview(); autoSave(); }
function addBudgetItem() {
  // Ask for the name first — no manual rename step needed
  const name = prompt('Nome da nova categoria (pode usar emoji):', '');
  if (name === null) return;            // cancelled — don't create anything
  const finalName = name.trim() || 'Nova categoria';

  // Generate a unique ID higher than any existing budget id (across all months)
  let maxId = 0;
  for (const mk in data) {
    (data[mk].budget||[]).forEach(b => { if (+b.id > maxId) maxId = +b.id; });
  }
  const newId = Math.max(maxId, nextId, 2000) + 1;
  nextId = newId + 1;
  md().budget.push({id:newId, name:finalName, type:'needs', budget:0});
  render(); renderBudgetOverview(); autoSave();
}

function syncProvisionBudget() {
  // Only auto-create if it doesn't exist — user can edit the budget value per month freely
  const total = totalSinkingMonthly();
  const provItem = md().budget.find(b => b.type === 'provision');
  if (!provItem && total > 0) {
    md().budget.push({id:60, name:'Sinking Funds', type:'provision', budget: total});
  }
}

// ── Called every new month: add contributions ────────────────────────────────
function renameBudget(id) {
  const b = getBudget(id);
  if (!b) return;
  const v = prompt('Renomear categoria (pode usar emoji):', b.name);
  if (v !== null && v.trim()) { b.name = v.trim(); render(); autoSave(); }
}

