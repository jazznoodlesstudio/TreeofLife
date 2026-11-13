const test = require('node:test');
const assert = require('node:assert/strict');
const { FRUITS, RULES } = require('../src/data.js');
const { Engine } = require('../src/engine.js');

const IDS = FRUITS.map(f => f.id);
const day = (n) => Engine.addDays('2026-01-05', n);           // 2026-01-05 是週一

/** 依序「每天儲存一次」，模擬真實使用 */
function run(refls, untilDay) {
  let states = null;
  const sorted = [...refls].sort((a, b) => a.local_date.localeCompare(b.local_date));
  const lastDay = untilDay ?? sorted[sorted.length - 1].local_date;
  for (let d = sorted[0].local_date; d <= lastDay; d = Engine.addDays(d, 1)) {
    const upto = sorted.filter(r => r.local_date <= d);
    if (!upto.some(r => r.local_date === d)) continue;            // 只有儲存當天才重算
    states = Engine.recompute(states, upto, d, RULES, IDS).states;
  }
  return states;
}
const R = (n, o = {}) => ({ local_date: day(n), event_text: '今天開會時很焦躁', inner_reactions: ['焦慮'], ...o });

test('ISO 週：跨年邊界', () => {
  assert.equal(Engine.isoWeek('2026-01-01'), '2026-W01');
  assert.equal(Engine.isoWeek('2027-01-01'), '2026-W53');
  assert.equal(Engine.isoWeek('2024-12-30'), '2025-W01');
});

test('第一次以某果子為焦點 → 種子', () => {
  const s = run([R(0, { focus_fruit_id: 'peace' })]);
  assert.equal(s.peace.state, 'seed');
  assert.equal(s.joy.state, 'dormant');
});

test('沒有寫 Q1 不算省思', () => {
  const c = Engine.computeCounters([R(0, { event_text: '  ', focus_fruit_id: 'peace' })], RULES, IDS);
  assert.equal(c.total_reflections, 0);
  assert.equal(c.fruits.peace.focus_days, 0);
});

test('每天最多前進一階：修改歷史讓條件一次滿足，也只升一階', () => {
  const refls = [0, 1, 2].map(n => R(n, { focus_fruit_id: 'peace' }));
  // 一次補齊三天，同一天儲存
  const s = Engine.recompute(null, refls, day(2), RULES, IDS).states;
  assert.equal(s.peace.state, 'seed');
  const s2 = Engine.recompute(s, refls, day(2), RULES, IDS).states;
  assert.equal(s2.peace.state, 'seed', '同一天再存一次仍不前進');
  const s3 = Engine.recompute(s2, refls, day(3), RULES, IDS).states;
  assert.equal(s3.peace.state, 'bud', '隔天才前進');
});

test('時間經過、漏掉很多天，狀態不下降', () => {
  const refls = [0, 1, 2, 3].map(n => R(n, { focus_fruit_id: 'peace' }));
  const before = run(refls);
  const after = Engine.recompute(before, [...refls, R(60)], day(60), RULES, IDS).states;
  assert.equal(after.peace.state, before.peace.state);
});

test('Q3 選分別善惡樹或負面情緒，不影響成長', () => {
  const a = run([0, 1, 2, 3].map(n => R(n, { focus_fruit_id: 'joy', direction: 'life', inner_reactions: ['感恩'] })));
  const b = run([0, 1, 2, 3].map(n => R(n, { focus_fruit_id: 'joy', direction: 'knowledge', inner_reactions: ['生氣', '嫉妒'] })));
  assert.deepEqual(a, b);
});

test('實踐回報歸屬於「那一天」的焦點果子', () => {
  const refls = [
    R(0, { focus_fruit_id: 'kindness', practice_text: '對店員說謝謝' }),
    R(4, { focus_fruit_id: 'love', prev_practice_checkin: 'partly', checkin_for_date: day(0) }),
  ];
  const c = Engine.computeCounters(refls, RULES, IDS);
  assert.equal(c.fruits.kindness.practiced_count, 1);
  assert.equal(c.fruits.love.practiced_count, 0);
});

test('「還沒有」不計入，也不扣分', () => {
  const refls = [
    R(0, { focus_fruit_id: 'kindness', practice_text: '對店員說謝謝' }),
    R(1, { prev_practice_checkin: 'not_yet', checkin_for_date: day(0) }),
  ];
  assert.equal(Engine.computeCounters(refls, RULES, IDS).fruits.kindness.practiced_count, 0);
});

test('practice_text 少於 4 字不算計畫', () => {
  const c = Engine.computeCounters([R(0, { focus_fruit_id: 'peace', practice_text: '禱告' })], RULES, IDS);
  assert.equal(c.fruits.peace.planned_count, 0);
});

test('結果至少要跨三個不同的週', () => {
  // 同一週內做滿所有條件
  const refls = [];
  for (let n = 0; n < 6; n++) refls.push(R(n, { focus_fruit_id: 'patience', practice_text: '讓別人慢慢做完',
    ...(n > 0 ? { prev_practice_checkin: 'done', checkin_for_date: day(n - 1) } : {}) }));
  const c = Engine.computeCounters(refls, RULES, IDS);
  assert.ok(c.fruits.patience.practiced_count >= 4);
  assert.equal(c.fruits.patience.active_weeks, 1);
  assert.equal(Engine.eligibleState(c.fruits.patience, RULES), 'flower');
});

test('完整走到結果，且依序經過每一階', () => {
  const refls = [];
  const seen = new Set();
  let states = null;
  for (let n = 0; n < 28; n += 2) {
    refls.push(R(n, { focus_fruit_id: 'faithfulness', practice_text: '每天固定一個時間讀經',
      ...(n > 0 ? { prev_practice_checkin: 'done', checkin_for_date: day(n - 2) } : {}) }));
    states = Engine.recompute(states, refls, day(n), RULES, IDS).states;
    seen.add(states.faithfulness.state);
  }
  assert.equal(states.faithfulness.state, 'fruit');
  assert.deepEqual([...seen], ['seed', 'bud', 'flower', 'fruit']);
});

test('刪除紀錄的預覽與下降', () => {
  const refls = [0, 1, 2].map(n => R(n, { focus_fruit_id: 'peace' }));
  const states = run(refls);
  assert.equal(states.peace.state, 'bud');
  const drop = Engine.previewDelete(states, refls, day(1), RULES, IDS);
  assert.deepEqual(drop, [{ id: 'peace', from: 'bud', to: 'seed' }]);
  const after = Engine.recompute(states, refls.filter(r => r.local_date !== day(1)), day(4), RULES, IDS).states;
  assert.equal(after.peace.state, 'seed');
});

test('樹的視覺狀態：根、樹幹、葉片、回來的光', () => {
  const refls = [R(0, { focus_fruit_id: 'joy', practice_text: '寫下三件恩典' }), R(10)];
  const { counters, states } = Engine.recompute(null, refls, day(10), RULES, IDS);
  const v = Engine.treeVisual(counters, states, refls, day(10), RULES, IDS);
  assert.equal(v.roots, 1);
  assert.equal(v.trunk, 2);
  assert.equal(v.fruits.joy.leaves, 3);
  assert.equal(v.returning, true);
  assert.equal(v.skeleton, true);
});

test('感受提示最多兩個', () => {
  const HINTS = require('../src/data.js').HINTS;
  assert.deepEqual(Engine.hintsFor(['焦慮'], HINTS), ['peace', 'patience']);
  assert.equal(Engine.hintsFor(['生氣', '失落'], HINTS).length, 2);
  assert.deepEqual(Engine.hintsFor(['平靜'], HINTS), []);
});
