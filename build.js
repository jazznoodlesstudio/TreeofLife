/* 產生沙盒頁、SVG 素材與 JSON 資料：node build.js */
const fs = require('fs');
const path = require('path');
const { FRUITS, RULES, FEELINGS, HINTS } = require('./src/data.js');
const { Engine, STATES } = require('./src/engine.js');
global.FRUITS = FRUITS; global.RULES = RULES;
const { Art } = require('./src/art.js');

const out = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const STAGES = ['seed', 'bud', 'flower', 'fruit'];

/* 1. 沙盒頁：把 src 的三個檔案內嵌進去 */
const inline = ['data.js', 'engine.js', 'art.js'].map(f => fs.readFileSync(path.join(__dirname, 'src', f), 'utf8')).join('\n');
if (inline.includes('</script')) throw new Error('inline script contains </script');
const tpl = fs.readFileSync(path.join(__dirname, 'src', 'sandbox.html'), 'utf8');
out('dist/sandbox.html', tpl.replace('/*@INLINE*/', () => inline));

/* 2. 果子素材：9 種 × 4 階段，透明背景、不含光暈（光暈由程式依階段加上） */
FRUITS.forEach(f => STAGES.forEach(st => out(`assets/fruits/${f.id}_${st}.svg`, Art.icon(f, st, { size: 256 }))));

/* 3. 主視覺與 App icon */
const IDS = FRUITS.map(f => f.id);
const full = { date: 'x', seed_glow: true, roots: 7, trunk: 7, skeleton: true, focus: null, returning: false,
  fruits: Object.fromEntries(IDS.map(id => [id, { state: 'fruit', leaves: 24 }])) };
const sample = { ...full, roots: 4, trunk: 4, focus: 'peace',
  fruits: { love: { state: 'fruit', leaves: 18 }, joy: { state: 'flower', leaves: 12 }, peace: { state: 'bud', leaves: 6 }, patience: { state: 'seed', leaves: 3 },
    kindness: { state: 'bud', leaves: 6 }, goodness: { state: 'dormant', leaves: 0 }, faithfulness: { state: 'seed', leaves: 0 }, gentleness: { state: 'dormant', leaves: 0 }, 'self-control': { state: 'flower', leaves: 9 } } };
['night', 'day'].forEach(mode => {
  out(`assets/scenes/tree_full_${mode}.svg`, Art.tree(full, { mode, fruits: FRUITS, rules: RULES, washK: .45, label: '結滿九種果子的生命樹' }));
  out(`assets/scenes/tree_sample_${mode}.svg`, Art.tree(sample, { mode, fruits: FRUITS, rules: RULES, label: '各果子停在不同階段的生命樹' }));
});
out('assets/app_icon.svg', Art.appIcon(FRUITS));

/* 4. 資料檔（規格 1.1 的 fruit_definitions、growth_rules、fruit_hints） */
const defs = FRUITS.map((f, i) => ({
  fruit_id: f.id, sort_order: i + 1, name_zh: f.zh, name_en: f.en, bible_reference: '加拉太書 5:22-23',
  supporting_refs: f.refs, description: f.desc, reflection_questions: f.q, practice_examples: f.p,
  visual_asset: {
    fruit_kind: f.k, motif: f.motif, color_fruit: f.c, color_flower: f.fl, branch_angle: f.angle, crown_sector: f.sector,
    ...Object.fromEntries(STAGES.map(st => [`sprite_${st}`, `fruits/${f.id}_${st}.svg`])),
  },
  default_growth_state: 'dormant',
}));
out('data/fruit_definitions.json', JSON.stringify(defs, null, 2) + '\n');
out('data/growth_rules.json', JSON.stringify(RULES, null, 2) + '\n');
out('data/fruit_hints.json', JSON.stringify({ feelings: FEELINGS, hints: HINTS }, null, 2) + '\n');

console.log('built: dist/sandbox.html, assets/fruits (%d), assets/scenes (4), assets/app_icon.svg, data/*.json', FRUITS.length * STAGES.length);
