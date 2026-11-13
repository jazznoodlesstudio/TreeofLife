/* Tree of Life — Growth Engine（規格 v0.3 第 2–4、7 節）
   全部是純函數：輸入省思紀錄，輸出計數、果子狀態與整棵樹的視覺狀態。AI 不參與。 */

var STATES = ['dormant', 'seed', 'bud', 'flower', 'fruit'];
var STAGE_ZH = { dormant: '還沒選過', seed: '種子', bud: '花苞', flower: '開花', fruit: '結果' };

var Engine = (function () {
  const rank = s => STATES.indexOf(s);
  const dnum = d => { const [y, m, dd] = d.split('-').map(Number); return Date.UTC(y, m - 1, dd) / 864e5; };
  const dstr = n => new Date(n * 864e5).toISOString().slice(0, 10);
  const addDays = (d, k) => dstr(dnum(d) + k);
  const chars = s => [...String(s || '').trim()].length;

  function isoWeek(d) {
    const t = new Date(dnum(d) * 864e5);
    const day = (t.getUTCDay() + 6) % 7;            // 週一 = 0
    t.setUTCDate(t.getUTCDate() - day + 3);         // 同週的週四
    const y = t.getUTCFullYear();
    const firstThu = new Date(Date.UTC(y, 0, 4));
    firstThu.setUTCDate(firstThu.getUTCDate() - ((firstThu.getUTCDay() + 6) % 7) + 3);
    const wk = 1 + Math.round((t - firstThu) / (7 * 864e5));
    return y + '-W' + String(wk).padStart(2, '0');
  }

  /* 2.2 訊號 */
  function signals(r) {
    return {
      reflected: chars(r.event_text) > 0,
      aware: (r.inner_reactions || []).length > 0 || chars(r.inner_other) > 0,
    };
  }

  /* 3.2 計數：從全部紀錄全量重算 */
  function computeCounters(refls, rules, fruitIds) {
    const byDate = new Map(refls.map(r => [r.local_date, r]));
    const F = {}, weeks = {};
    fruitIds.forEach(id => { F[id] = { focus_days: 0, aware_days: 0, planned_count: 0, practiced_count: 0, active_weeks: 0 }; weeks[id] = new Set(); });
    let total = 0, awareDays = 0;
    const allWeeks = new Set();
    for (const r of refls) {
      // 實踐回報：歸屬於 checkin_for_date 那筆紀錄的焦點果子
      if ((r.prev_practice_checkin === 'done' || r.prev_practice_checkin === 'partly') && r.checkin_for_date) {
        const src = byDate.get(r.checkin_for_date);
        const pf = src && src.focus_fruit_id;
        if (pf && F[pf]) { F[pf].practiced_count++; weeks[pf].add(isoWeek(r.local_date)); }
      }
      const s = signals(r);
      if (!s.reflected) continue;
      total++;
      allWeeks.add(isoWeek(r.local_date));
      if (s.aware) awareDays++;
      const f = r.focus_fruit_id;
      if (f && F[f]) {
        F[f].focus_days++;
        if (s.aware) F[f].aware_days++;
        if (chars(r.practice_text) >= rules.practice_min_chars) F[f].planned_count++;
        weeks[f].add(isoWeek(r.local_date));
      }
      // Q3 direction 刻意不產生任何訊號
    }
    fruitIds.forEach(id => { F[id].active_weeks = weeks[id].size; });
    return { fruits: F, total_reflections: total, total_aware_days: awareDays, total_active_weeks: allWeeks.size };
  }

  /* 3.4 */
  const meets = (c, cond) => Object.keys(cond).every(k => c[k] >= cond[k]);
  function eligibleState(c, rules) {
    for (const st of ['fruit', 'flower', 'bud', 'seed']) if (meets(c, rules.thresholds[st])) return st;
    return 'dormant';
  }
  function nextState(current, c, today, changedOn, rules) {
    const target = eligibleState(c, rules);
    if (rank(target) < rank(current)) return target;              // 只有刪改紀錄才會發生
    if (rank(target) === rank(current)) return current;
    if (changedOn && changedOn === today) return current;          // 今天已前進過
    return STATES[rank(current) + 1];                              // 一次只前進一階
  }

  /* 第 7 節：每次儲存省思時呼叫 */
  function recompute(prevStates, refls, today, rules, fruitIds) {
    const counters = computeCounters(refls, rules, fruitIds);
    const states = {};
    fruitIds.forEach(id => {
      const prev = (prevStates && prevStates[id]) || { state: 'dormant', state_changed_on: null };
      const nxt = nextState(prev.state, counters.fruits[id], today, prev.state_changed_on, rules);
      states[id] = nxt === prev.state ? { ...prev } : { state: nxt, state_changed_on: today };
    });
    return { counters, states };
  }

  /* 3.5 刪除前預覽：哪些果子會因此下降 */
  function previewDelete(states, refls, date, rules, fruitIds) {
    const rest = refls.filter(r => r.local_date !== date);
    const c = computeCounters(rest, rules, fruitIds);
    return fruitIds
      .map(id => ({ id, from: states[id].state, to: eligibleState(c.fruits[id], rules) }))
      .filter(x => rank(x.to) < rank(x.from));
  }

  /* 第 4 節：整棵樹的視覺狀態 */
  function treeVisual(counters, states, refls, today, rules, fruitIds) {
    const level = (n, th) => th.filter(t => n >= t).length;
    const dates = refls.filter(r => signals(r).reflected && r.local_date <= today).map(r => r.local_date).sort();
    const last = dates[dates.length - 1], prev = dates[dates.length - 2];
    const todayRef = refls.find(r => r.local_date === today);
    const fruits = {};
    fruitIds.forEach(id => {
      fruits[id] = {
        state: states[id].state,
        leaves: Math.min(counters.fruits[id].planned_count * rules.leaves_per_plan, rules.leaves_max),
      };
    });
    return {
      date: today,
      seed_glow: counters.total_reflections >= 1,
      roots: level(counters.total_reflections, rules.roots_thresholds),
      trunk: level(counters.total_active_weeks, rules.trunk_thresholds),
      skeleton: counters.total_aware_days >= 1,
      fruits,
      focus: todayRef ? todayRef.focus_fruit_id || null : null,
      returning: !!(last === today && prev && dnum(last) - dnum(prev) >= rules.return_gap_days),
    };
  }

  /* 第 6.3 節：感受 → 可以看看的果子（最多 2 個，依出現次數） */
  function hintsFor(feelings, hints) {
    const score = {};
    (feelings || []).forEach(f => (hints[f] || []).forEach((id, i) => { score[id] = (score[id] || 0) + 10 - i; }));
    return Object.keys(score).sort((a, b) => score[b] - score[a]).slice(0, 2);
  }

  return { rank, dnum, dstr, addDays, chars, isoWeek, signals, computeCounters, eligibleState, nextState, recompute, previewDelete, treeVisual, hintsFor };
})();

if (typeof module !== 'undefined') module.exports = { Engine, STATES, STAGE_ZH };
