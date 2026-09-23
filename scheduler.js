(function (root) {
  const MS_PER_DAY = 86400000;

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dayIndexForDate(weekStart, date) {
    return Math.round((startOfDay(date) - startOfDay(weekStart)) / MS_PER_DAY);
  }

  function parseDueDate(dueDate) {
    if (dueDate instanceof Date) return dueDate;
    const [y, m, d] = dueDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function rangeInclusive(a, b) {
    const arr = [];
    for (let d = a; d <= b; d++) arr.push(d);
    return arr;
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function toQuarter(hours) {
    return Math.round(hours * 4);
  }

  function splitIntoSessions(estHours, maxSessionHours) {
    const cap = maxSessionHours || 2;
    const capQ = Math.round(cap * 4);
    const totalQ = toQuarter(estHours);
    if (totalQ <= 0) return [];
    const n = Math.ceil(totalQ / capQ);
    const base = Math.floor(totalQ / n);
    const remainder = totalQ - base * n;
    // Front-load the remainder onto the earliest sessions: banking more work
    // earlier survives schedule churn better than saving a bigger chunk for
    // last, which is the same anti-cramming premise as the spread-across-days rule.
    const sessions = [];
    for (let i = 0; i < n; i++) {
      const q = base + (i < remainder ? 1 : 0);
      sessions.push(q / 4);
    }
    return sessions;
  }

  function spreadDays(sessionCount, eligibleDays) {
    return Array.from({ length: sessionCount }, (_, i) =>
      eligibleDays[Math.floor((i * eligibleDays.length) / sessionCount)]
    );
  }

  function mergeIntervals(intervals) {
    const sorted = intervals.slice().sort((a, b) => a.start - b.start);
    const merged = [];
    sorted.forEach(iv => {
      const last = merged[merged.length - 1];
      if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
      else merged.push({ start: iv.start, end: iv.end });
    });
    return merged;
  }

  function subtractIntervals(base, busy) {
    let free = [{ start: base.start, end: base.end }];
    busy.forEach(b => {
      const next = [];
      free.forEach(f => {
        if (b.end <= f.start || b.start >= f.end) { next.push(f); return; }
        if (b.start > f.start) next.push({ start: f.start, end: Math.min(b.start, f.end) });
        if (b.end < f.end) next.push({ start: Math.max(b.end, f.start), end: f.end });
      });
      free = next;
    });
    return free.filter(iv => iv.end - iv.start > 1e-9);
  }

  function subtractFromFreeList(freeList, busy) {
    return freeList.reduce((acc, f) => acc.concat(subtractIntervals(f, busy)), []);
  }

  function computeFreeByDay(blocks, opts) {
    const { startHour, endHour, weekStart, today } = opts;
    const busyByDay = new Map();
    for (let d = 0; d < 7; d++) busyByDay.set(d, []);
    blocks.forEach(b => {
      if (!busyByDay.has(b.day)) return;
      const start = Math.max(b.start, startHour);
      const end = Math.min(b.start + b.dur, endHour);
      if (end > start) busyByDay.get(b.day).push({ start, end });
    });

    const freeByDay = new Map();
    for (let d = 0; d < 7; d++) {
      const merged = mergeIntervals(busyByDay.get(d));
      freeByDay.set(d, subtractIntervals({ start: startHour, end: endHour }, merged));
    }

    const todayIdx = dayIndexForDate(weekStart, today);
    if (todayIdx >= 0 && todayIdx <= 6) {
      const nowHour = today.getHours() + today.getMinutes() / 60;
      // Hours before startHour (past midnight) are treated as "still ahead" rather than
      // mapped onto yesterday's post-midnight column -- a deliberate simplification.
      if (nowHour > startHour) {
        freeByDay.set(todayIdx, subtractFromFreeList(freeByDay.get(todayIdx), [{ start: startHour, end: nowHour }]));
      }
    }

    return freeByDay;
  }

  function findBestGap(freeByDay, day, hoursNeeded) {
    const gaps = freeByDay.get(day) || [];
    let best = null;
    gaps.forEach((g, i) => {
      const len = g.end - g.start;
      if (len + 1e-9 >= hoursNeeded && (!best || len < best.len)) {
        best = { index: i, len, start: g.start };
      }
    });
    return best;
  }

  function consumeGap(freeByDay, day, gapIndex, start, hoursNeeded) {
    const gaps = freeByDay.get(day);
    const g = gaps[gapIndex];
    const remaining = [];
    if (start > g.start) remaining.push({ start: g.start, end: start });
    if (start + hoursNeeded < g.end) remaining.push({ start: start + hoursNeeded, end: g.end });
    gaps.splice(gapIndex, 1, ...remaining);
  }

  function orderDaysByProximity(eligibleDays, targetDay) {
    return eligibleDays.slice().sort((a, b) => {
      const da = Math.abs(a - targetDay), db = Math.abs(b - targetDay);
      return da !== db ? da - db : a - b;
    });
  }

  function placeSession(freeByDay, eligibleDays, targetDay, hours) {
    const order = orderDaysByProximity(eligibleDays, targetDay);
    for (const day of order) {
      const best = findBestGap(freeByDay, day, hours);
      if (best) {
        consumeGap(freeByDay, day, best.index, best.start, hours);
        return { day, start: best.start };
      }
    }
    return null;
  }

  function autoSchedule(input) {
    const {
      tasks, blocks, weekStart, today,
      startHour = 6, endHour = 26, maxSessionHours = 2
    } = input;

    const freeByDay = computeFreeByDay(blocks, { startHour, endHour, weekStart, today });
    const todayIdx = dayIndexForDate(weekStart, today);

    const ordered = tasks.slice().sort((a, b) => parseDueDate(a.dueDate) - parseDueDate(b.dueDate));

    const newBlocks = [];
    const report = [];

    ordered.forEach(task => {
      const dueDate = parseDueDate(task.dueDate);
      const dueDayIdx = dayIndexForDate(weekStart, dueDate);
      const overdue = dueDayIdx < todayIdx;

      let eligibleDays, hoursToSchedule, mode;

      if (overdue) {
        eligibleDays = rangeInclusive(todayIdx, 6);
        hoursToSchedule = task.estHours;
        mode = 'overdue';
      } else if (dueDayIdx <= 6) {
        eligibleDays = rangeInclusive(todayIdx, dueDayIdx);
        hoursToSchedule = task.estHours;
        mode = 'normal';
      } else {
        const daysRemainingThisWeek = 7 - todayIdx;
        const totalDaysUntilDue = Math.round((startOfDay(dueDate) - startOfDay(today)) / MS_PER_DAY) + 1;
        // No cross-week memory: this uses the FULL estHours every run, not "hours remaining."
        // Rerunning next week re-seeds another proportional share of the same total, so it
        // double-counts whatever was already placed in earlier weeks. Correcting that needs
        // a persisted task.scheduledHours plus real dated blocks -- design both together
        // when week navigation lands, not before.
        hoursToSchedule = task.estHours * daysRemainingThisWeek / totalDaysUntilDue;
        eligibleDays = rangeInclusive(todayIdx, 6);
        mode = 'proportional';
      }

      // A locked session (auto:false but still tagged with this taskId) already
      // committed some of this task's hours to the grid. Without this, replanting
      // would pile a fresh full-estHours batch on top of it every rerun instead of
      // topping up the remainder.
      const alreadyCommitted = blocks
        .filter(b => b.taskId === task.id && !b.auto)
        .reduce((sum, b) => sum + b.dur, 0);
      hoursToSchedule = Math.max(0, hoursToSchedule - alreadyCommitted);

      const sessions = splitIntoSessions(hoursToSchedule, maxSessionHours);
      const targets = spreadDays(sessions.length, eligibleDays);

      let placedHours = 0;
      sessions.forEach((hours, i) => {
        const placement = placeSession(freeByDay, eligibleDays, targets[i], hours);
        if (placement) {
          newBlocks.push({
            id: 'auto' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            day: placement.day,
            start: placement.start,
            dur: hours,
            cat: 'study',
            title: task.title,
            auto: true,
            taskId: task.id
          });
          placedHours += hours;
        }
      });

      const shortHours = round1(hoursToSchedule - placedHours);
      if (shortHours > 0.001 || overdue) {
        report.push({
          taskId: task.id,
          title: task.title,
          dueDate: task.dueDate,
          mode,
          targetHoursThisRun: round1(hoursToSchedule),
          placedHours: round1(placedHours),
          shortHours: Math.max(shortHours, 0),
          overdue
        });
      }
    });

    return { newBlocks, report };
  }

  const api = { autoSchedule, splitIntoSessions, computeFreeByDay, dayIndexForDate, parseDueDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Scheduler = api;
})(typeof window !== 'undefined' ? window : globalThis);
