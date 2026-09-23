(function () {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const START_HOUR = 6;   // 6am
  const END_HOUR = 26;    // 2am next day
  const SPAN = END_HOUR - START_HOUR; // 20 hours
  const HPX = 40; // px per hour

  const STORE_KEY = 'balance-planner-v1';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return {
      funTarget: 10,
      sleepTarget: 49,
      blocks: [
        { id: 'seed1', day: 0, start: 9,  dur: 3,   cat: 'fixed', title: 'Ricoh internship (IT-EAD)' },
        { id: 'seed2', day: 1, start: 19, dur: 1.5, cat: 'study', title: 'Stat 415 problem set' },
        { id: 'seed3', day: 2, start: 14, dur: 1,   cat: 'fixed', title: 'IST Learning Assistant hours' },
        { id: 'seed4', day: 3, start: 17, dur: 1.5, cat: 'study', title: 'CMPSC 465 homework' },
        { id: 'seed5', day: 4, start: 19, dur: 2,   cat: 'fun',   title: 'Dinner with friends' },
        { id: 'seed6', day: 5, start: 11, dur: 2,   cat: 'fun',   title: 'Self-care / makeup time' },
        { id: 'seed7', day: 6, start: 16, dur: 1,   cat: 'fixed', title: 'THON DEI committee meeting' },
        { id: 'seed8', day: 0, start: 23, dur: 7,   cat: 'sleep', title: 'Sleep' },
        { id: 'seed9', day: 3, start: 23, dur: 7,   cat: 'sleep', title: 'Sleep' }
      ]
    };
  }

  let state = loadState();
  if (!Array.isArray(state.tasks)) state.tasks = [];

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { /* storage unavailable — continue silently */ }
  }

  function fmtHour(h) {
    const hh = Math.floor(h) % 24;
    const period = hh < 12 ? 'AM' : 'PM';
    let disp = hh % 12;
    if (disp === 0) disp = 12;
    return disp + (h % 1 !== 0 ? ':30' : '') + period;
  }

  function fmtRange(start, dur) {
    const end = start + dur;
    return fmtHour(start) + '–' + fmtHour(end);
  }

  function getWeekStart() {
    const now = new Date();
    const day = now.getDay(); // 0 sun .. 6 sat
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
    return monday;
  }

  function weekLabel() {
    const monday = getWeekStart();
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const opts = { month: 'short', day: 'numeric' };
    return monday.toLocaleDateString(undefined, opts) + ' – ' + sunday.toLocaleDateString(undefined, opts);
  }

  function buildHead() {
    const head = document.getElementById('gridHead');
    head.innerHTML = '<div class="cell"></div>' + DAYS.map(d =>
      '<div class="cell"><div class="d">' + d + '</div></div>'
    ).join('');
  }

  function buildGrid() {
    const body = document.getElementById('gridBody');
    body.style.setProperty('--hpx', HPX + 'px');
    body.style.height = (SPAN * HPX) + 'px';

    let hoursHtml = '<div class="hours-col" style="height:' + (SPAN*HPX) + 'px;">';
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const top = (h - START_HOUR) * HPX;
      hoursHtml += '<div class="hour-label" style="top:' + top + 'px;">' + fmtHour(h % 24 === 0 ? 24 : h) + '</div>';
    }
    hoursHtml += '</div>';

    let daysHtml = '';
    for (let d = 0; d < 7; d++) {
      daysHtml += '<div class="day-col" data-day="' + d + '" style="height:' + (SPAN*HPX) + 'px;"></div>';
    }

    body.innerHTML = hoursHtml + daysHtml;

    state.blocks.forEach(b => renderBlock(b));
  }

  const LOCK_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  function renderBlock(b) {
    const col = document.querySelector('.day-col[data-day="' + b.day + '"]');
    if (!col) return;
    const top = (b.start - START_HOUR) * HPX;
    const height = Math.max(b.dur * HPX - 2, 16);
    const el = document.createElement('div');
    el.className = 'block ' + b.cat;
    el.style.top = top + 'px';
    el.style.height = height + 'px';
    el.innerHTML = '<span class="t">' + escapeHtml(b.title) + '</span>' +
                    (height > 26 ? '<span class="time">' + fmtRange(b.start, b.dur) + '</span>' : '') +
                    (b.auto ? '<span class="lock" data-id="' + b.id + '" title="Lock so re-planning leaves this alone">' + LOCK_SVG + '</span>' : '') +
                    '<span class="x" data-id="' + b.id + '">×</span>';
    col.appendChild(el);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function computeTotals() {
    const totals = { study: 0, fun: 0, fixed: 0, sleep: 0 };
    state.blocks.forEach(b => { totals[b.cat] = (totals[b.cat] || 0) + Number(b.dur); });
    return totals;
  }

  function renderBalance() {
    const totals = computeTotals();
    const container = document.getElementById('balanceBars');
    const rows = [
      { key: 'study', label: 'Study / work', color: 'var(--study)', target: null },
      { key: 'fun', label: 'Fun', color: 'var(--fun)', target: state.funTarget },
      { key: 'sleep', label: 'Sleep', color: 'var(--sleep)', target: state.sleepTarget },
      { key: 'fixed', label: 'Fixed', color: 'var(--fixed)', target: null }
    ];
    container.innerHTML = rows.map(r => {
      const val = totals[r.key] || 0;
      const max = r.target ? Math.max(r.target, val) : Math.max(val, 20);
      const pct = Math.min(100, (val / max) * 100);
      const targetStr = r.target ? (' / ' + r.target + 'h target') : '';
      return '<div class="balance-row"><span>' + r.label + '</span><b>' + round1(val) + 'h' + targetStr + '</b></div>' +
             '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%; background:' + r.color + ';"></div></div>';
    }).join('');

    const verdict = document.getElementById('verdictBox');
    const funOk = totals.fun >= state.funTarget;
    const sleepOk = totals.sleep >= state.sleepTarget * 0.85;
    if (funOk && sleepOk) {
      verdict.className = 'verdict good';
      verdict.textContent = 'Balanced week — fun and sleep are both holding their ground.';
    } else {
      verdict.className = 'verdict warn';
      const gaps = [];
      if (!funOk) gaps.push('fun is ' + round1(state.funTarget - totals.fun) + 'h under target');
      if (!sleepOk) gaps.push('sleep is ' + round1(state.sleepTarget - totals.sleep) + 'h under target');
      verdict.textContent = gaps.join(' and ') + '. Consider moving a study block earlier to protect that time.';
    }
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function renderTasks() {
    const container = document.getElementById('taskList');
    if (!state.tasks.length) {
      container.innerHTML = '<div class="empty-note" style="padding:8px 0;">No tasks yet.</div>';
      return;
    }
    container.innerHTML = state.tasks.map(t =>
      '<div class="task-row"><span class="tt">' + escapeHtml(t.title) + '</span>' +
      '<span class="tm">' + t.estHours + 'h · due ' + t.dueDate + '</span>' +
      '<span class="x" data-task-id="' + t.id + '">×</span></div>'
    ).join('');
  }

  function renderSchedulerReport(report) {
    const box = document.getElementById('schedulerReport');
    if (!report.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="verdict warn" style="margin-top:10px;">' +
      report.map(r => {
        const bits = [];
        if (r.overdue) bits.push('overdue');
        if (r.shortHours > 0) bits.push(round1(r.shortHours) + 'h short');
        return '<div>' + escapeHtml(r.title) + ' — ' + bits.join(', ') + '</div>';
      }).join('') +
      '</div>';
  }

  function attachHandlers() {
    document.getElementById('gridBody').addEventListener('click', (e) => {
      const lock = e.target.closest('.lock');
      if (lock) {
        const block = state.blocks.find(b => b.id === lock.getAttribute('data-id'));
        if (block) { block.auto = false; saveState(); buildGrid(); }
        return;
      }
      if (e.target.classList.contains('x')) {
        const id = e.target.getAttribute('data-id');
        state.blocks = state.blocks.filter(b => b.id !== id);
        saveState();
        buildGrid();
        renderBalance();
      }
    });

    document.getElementById('taskList').addEventListener('click', (e) => {
      if (e.target.classList.contains('x')) {
        const id = e.target.getAttribute('data-task-id');
        state.tasks = state.tasks.filter(t => t.id !== id);
        saveState();
        renderTasks();
      }
    });

    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('taskTitle').value.trim();
      const estHours = Number(document.getElementById('taskHours').value);
      const dueDate = document.getElementById('taskDue').value;
      if (!title || !dueDate || !estHours || estHours <= 0) return;
      const taskId = 'task' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      state.tasks.push({ id: taskId, title, estHours, dueDate });
      saveState();
      renderTasks();
      document.getElementById('taskTitle').value = '';
    });

    document.getElementById('runScheduler').addEventListener('click', () => {
      const weekStart = getWeekStart();
      const today = new Date();
      state.blocks = state.blocks.filter(b => !b.auto);
      const { newBlocks, report } = Scheduler.autoSchedule({ tasks: state.tasks, blocks: state.blocks, weekStart, today });
      state.blocks = state.blocks.concat(newBlocks);
      saveState();
      buildGrid();
      renderBalance();
      renderSchedulerReport(report);
    });

    const catSelect = document.getElementById('catSelect');
    let activeCat = 'study';
    catSelect.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      [...catSelect.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.getAttribute('data-cat');
    });

    document.getElementById('addForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('title').value.trim();
      const day = Number(document.getElementById('day').value);
      const startStr = document.getElementById('start').value;
      const dur = Number(document.getElementById('dur').value);
      if (!title || !startStr || !dur) return;
      const [hh, mm] = startStr.split(':').map(Number);
      let start = hh + (mm / 60);
      if (start < START_HOUR) start += 24; // treat early-morning times as post-midnight

      state.blocks.push({
        id: 'b' + Date.now(),
        day, start, dur, cat: activeCat, title
      });
      saveState();
      buildGrid();
      renderBalance();
      document.getElementById('title').value = '';
    });

    document.getElementById('funTarget').addEventListener('input', (e) => {
      state.funTarget = Number(e.target.value) || 0;
      saveState();
      renderBalance();
    });
    document.getElementById('sleepTarget').addEventListener('input', (e) => {
      state.sleepTarget = Number(e.target.value) || 0;
      saveState();
      renderBalance();
    });

    document.getElementById('funTarget').value = state.funTarget;
    document.getElementById('sleepTarget').value = state.sleepTarget;
  }

  document.getElementById('weekLabel').textContent = weekLabel();
  buildHead();
  buildGrid();
  renderBalance();
  renderTasks();
  attachHandlers();
})();
