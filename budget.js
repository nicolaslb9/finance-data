// ===== N&J Budget — Budget & Income Module =====

function totalIncome() { return md().income.reduce((s,i)=>s+(+i.amount||0),0); }
function getIncome(id) { return md().income.find(x=>x.id===id); }
function removeIncome(id) { md().income = md().income.filter(x=>x.id!==id); render(); autoSave(); }
function addIncome() { md().income.push({id:nextId++,label:'Nova renda',amount:0}); render(); autoSave(); }

function syncBudgetMonthSelect() {
  const sel = document.getElementById('budget-month-sel');
  if (!sel) return;
  const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  sel.innerHTML = MONTHS_SHORT.map((m,i)=>`<option value="${i}"${i===currentMonth?' selected':''}>${m} 2026</option>`).join('');
}

function getBudget(id) { return md().budget.find(x=>x.id===id); }
function removeBudget(id) { md().budget = md().budget.filter(x=>x.id!==id); render(); renderBudgetOverview(); autoSave(); }
function addBudgetItem() { md().budget.push({id:nextId++,name:'Nova categoria',type:'needs',budget:0}); render(); renderBudgetOverview(); autoSave(); }

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

