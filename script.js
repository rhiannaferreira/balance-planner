(function () {
  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const START_HOUR = 0;   // midnight
  const END_HOUR = 24;    // midnight next day
  const SPAN = END_HOUR - START_HOUR; // 24 hours
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

  let taskFilter = 'all';
  let sortTasksByPriority = false;

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
  const PIN_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 17 5.5 21 7.5 13.5 2 9 9 9"/></svg>';

  function renderBlock(b) {
    const col = document.querySelector('.day-col[data-day="' + b.day + '"]');
    if (!col) return;
    const top = (b.start - START_HOUR) * HPX;
    const height = Math.max(b.dur * HPX - 2, 16);
    const el = document.createElement('div');
    el.className = 'block ' + b.cat;
    el.dataset.id = b.id;
    el.style.top = top + 'px';
    el.style.height = height + 'px';
    el.innerHTML = '<span class="t">' + escapeHtml(b.title) + '</span>' +
                    (height > 26 ? '<span class="time">' + fmtRange(b.start, b.dur) + '</span>' : '') +
                    '<span class="pin' + (b.pin ? ' pinned' : '') + '" data-id="' + b.id + '" title="' + (b.pin ? 'Pinned — kept on Reset week' : 'Pin so Reset week keeps this') + '">' + PIN_SVG + '</span>' +
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
    let list = state.tasks.filter(t =>
      taskFilter === 'all' || (t.category || 'academics') === taskFilter
    );
    list = list.slice().sort((a, b) => {
      if (sortTasksByPriority) {
        const pd = (b.priority || 0) - (a.priority || 0);
        if (pd !== 0) return pd;
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

    if (!list.length) {
      container.innerHTML = '<div class="empty-note" style="padding:8px 0;">No tasks yet.</div>';
      return;
    }
    container.innerHTML = list.map(t => {
      const priority = t.priority || 0;
      const category = t.category || 'academics';
      return '<div class="task-row">' +
        '<div class="task-row-top"><span class="tt">' + escapeHtml(t.title) + '</span>' +
        '<span class="x" data-task-id="' + t.id + '">×</span></div>' +
        '<div class="task-row-meta">' +
        '<span class="tm">' + t.estHours + 'h · due ' + t.dueDate + '</span>' +
        '<span class="cat-tag">' + (category === 'personal' ? 'Personal' : 'Academics') + '</span>' +
        (priority > 0 ? '<span class="pri pri-' + priority + '">' + '!'.repeat(priority) + '</span>' : '') +
        '</div></div>';
    }).join('');
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

  let highlightedCol = null;
  function highlightDayUnder(x, y) {
    const col = document.elementFromPoint(x, y)?.closest('.day-col');
    if (col === highlightedCol) return;
    if (highlightedCol) highlightedCol.classList.remove('drop-target');
    highlightedCol = col || null;
    if (highlightedCol) highlightedCol.classList.add('drop-target');
  }
  function clearDayHighlight() {
    if (highlightedCol) highlightedCol.classList.remove('drop-target');
    highlightedCol = null;
  }

  function attachDragHandlers() {
    document.getElementById('gridBody').addEventListener('pointerdown', (e) => {
      const blockEl = e.target.closest('.block');
      if (!blockEl || e.target.closest('.x') || e.target.closest('.lock') || e.target.closest('.pin')) return;
      const block = state.blocks.find(b => b.id === blockEl.dataset.id);
      if (!block) return;

      const startX = e.clientX, startY = e.clientY;
      const pointerId = e.pointerId;
      let dragging = false;
      try { blockEl.setPointerCapture(pointerId); } catch (err) { /* not required for correctness below */ }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        if (!dragging && Math.hypot(dx, dy) > 4) {
          dragging = true;
          blockEl.classList.add('dragging');
          blockEl.style.pointerEvents = 'none';
        }
        if (dragging) {
          blockEl.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
          highlightDayUnder(ev.clientX, ev.clientY);
        }
      }

      function onUp(ev) {
        if (ev.pointerId !== pointerId) return;
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        clearDayHighlight();
        if (!dragging) return;

        const targetCol = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.day-col');
        if (targetCol) {
          const targetDay = Number(targetCol.getAttribute('data-day'));
          const rect = targetCol.getBoundingClientRect();
          const rawHour = START_HOUR + (ev.clientY - rect.top) / HPX;
          let newStart = Math.round(rawHour * 4) / 4;
          newStart = Math.max(START_HOUR, Math.min(newStart, END_HOUR - block.dur));

          const overlaps = state.blocks.some(other =>
            other.id !== block.id && other.day === targetDay &&
            newStart < other.start + other.dur && newStart + block.dur > other.start
          );

          if (!overlaps) {
            block.day = targetDay;
            block.start = newStart;
            if (block.auto) block.auto = false;
            saveState();
          }
        }
        buildGrid();
      }

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function attachHandlers() {
    document.getElementById('gridBody').addEventListener('click', (e) => {
      const lock = e.target.closest('.lock');
      if (lock) {
        const block = state.blocks.find(b => b.id === lock.getAttribute('data-id'));
        if (block) { block.auto = false; saveState(); buildGrid(); }
        return;
      }
      const pin = e.target.closest('.pin');
      if (pin) {
        const block = state.blocks.find(b => b.id === pin.getAttribute('data-id'));
        if (block) { block.pin = !block.pin; saveState(); buildGrid(); }
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

    const taskFilterTabs = document.getElementById('taskFilterTabs');
    taskFilterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      [...taskFilterTabs.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      taskFilter = btn.getAttribute('data-filter');
      renderTasks();
    });

    document.getElementById('sortByPriority').addEventListener('change', (e) => {
      sortTasksByPriority = e.target.checked;
      renderTasks();
    });

    const taskCatSelect = document.getElementById('taskCatSelect');
    let activeTaskCat = 'academics';
    taskCatSelect.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      [...taskCatSelect.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeTaskCat = btn.getAttribute('data-cat');
    });

    const taskPrioritySelect = document.getElementById('taskPrioritySelect');
    let activeTaskPriority = 0;
    taskPrioritySelect.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      [...taskPrioritySelect.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      activeTaskPriority = Number(btn.getAttribute('data-p'));
    });

    document.getElementById('taskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('taskTitle').value.trim();
      const estHours = Number(document.getElementById('taskHours').value);
      const dueDate = document.getElementById('taskDue').value;
      if (!title || !dueDate || !estHours || estHours <= 0) return;
      const taskId = 'task' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
      state.tasks.push({
        id: taskId, title, estHours, dueDate,
        category: activeTaskCat, priority: activeTaskPriority
      });
      saveState();
      renderTasks();
      document.getElementById('taskTitle').value = '';
    });

    function replant() {
      const weekStart = getWeekStart();
      const today = new Date();
      state.blocks = state.blocks.filter(b => !b.auto);
      const { newBlocks, report } = Scheduler.autoSchedule({
        tasks: state.tasks, blocks: state.blocks, weekStart, today,
        startHour: START_HOUR, endHour: END_HOUR
      });
      state.blocks = state.blocks.concat(newBlocks);
      saveState();
      buildGrid();
      renderBalance();
      renderSchedulerReport(report);
    }

    document.getElementById('runScheduler').addEventListener('click', replant);

    document.getElementById('rebalanceBehind').addEventListener('click', () => {
      const weekStart = getWeekStart();
      const today = new Date();
      const todayIdx = Scheduler.dayIndexForDate(weekStart, today);
      const nowHour = today.getHours() + today.getMinutes() / 60;

      // Credit whatever study time already happened before clearing and replanting,
      // so completed-but-unlocked sessions don't get silently rescheduled on top of
      // themselves elsewhere in the week.
      state.blocks.forEach(b => {
        if (b.auto && (b.day < todayIdx || (b.day === todayIdx && b.start < nowHour))) {
          b.auto = false;
        }
      });

      replant();
    });

    document.getElementById('resetWeek').addEventListener('click', () => {
      if (!confirm('Reset this week? This clears every block except pinned ones.')) return;
      state.blocks = state.blocks.filter(b => b.pin);
      saveState();
      buildGrid();
      renderBalance();
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
      const start = hh + (mm / 60);

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
  attachDragHandlers();
})();
