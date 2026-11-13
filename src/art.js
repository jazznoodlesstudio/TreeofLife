/* Tree of Life — 美術：九種果子 × 四階段、會依視覺狀態生長的樹、App icon。
   全部以 SVG 字串輸出，瀏覽器與 Node（匯出素材）共用。依賴 data.js 的 FRUITS、RULES。 */

var Art = (function () {
  let UID = 0;
  const uid = () => 'a' + (UID++).toString(36);
  const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const f1 = n => (+n).toFixed(1);

  const LEAF = '#3E7A5A', STEM = '#6A5340';
  const PAL = {
    night: { sky: ['#070E1E', '#132747', '#1F3D62'], trunk: ['#2A1E14', '#4A3626'], hill: '#12241E', grass: '#1E3A2C',
      soil: ['#1C150F', '#120D09'], root: '#5C4634', leaves: ['#1B3A30', '#204337', '#264C3E', '#2D5646'], branch: '#3A2B1F', lamp: '#F6E7A8', ff: 16 },
    day: { sky: ['#8CCBEF', '#DDF0F4', '#FFF3D6'], trunk: ['#6E4528', '#A0703F'], hill: '#8CC463', grass: '#5E9E3C',
      soil: ['#9C7752', '#6E5038'], root: '#4E3624', leaves: ['#3F7E2E', '#4C8F35', '#5EA03F', '#72B24B'], branch: '#6E4528', lamp: '#FFF3C4', ff: 6 },
  };

  /* ---------- 果子造型（100×100 方格） ---------- */
  function geom(f, fill) {
    const s = `fill="${fill}"`, dk = mix(f.c, '#000000', .35);
    switch (f.k) {
      case 'apple': return { top: 38, shape: `<path ${s} d="M50 38 C 40 29, 21 32, 21 55 C 21 75, 35 88, 50 85 C 65 88, 79 75, 79 55 C 79 32, 60 29, 50 38 Z"/>`,
        extra: `<path fill="${mix(f.c, '#ffffff', .45)}" opacity=".8" d="M43 66 C 33 59, 34 50, 40 50 C 42 50, 43 52, 43 53 C 43 52, 44 50, 46 50 C 52 50, 53 59, 43 66 Z"/>`, hl: [36, 48, 7, 4.5, -30] };
      case 'citrus': return { top: 34, shape: `<circle ${s} cx="50" cy="60" r="26"/>`,
        extra: `<g fill="${dk}" opacity=".2"><circle cx="58" cy="70" r="1.2"/><circle cx="64" cy="62" r="1.2"/><circle cx="55" cy="78" r="1.2"/><circle cx="66" cy="72" r="1.2"/></g>`, hl: [40, 48, 7, 4.5, -30] };
      case 'oval': return { top: 34, shape: `<ellipse ${s} cx="50" cy="60" rx="21" ry="26"/>`, extra: '', hl: [42, 47, 5, 7, -15] };
      case 'fig': return { top: 30, shape: `<path ${s} d="M50 30 C 55 30, 57 39, 62 46 C 77 58, 75 84, 50 85 C 25 84, 23 58, 38 46 C 43 39, 45 30, 50 30 Z"/>`,
        extra: `<g stroke="${dk}" stroke-width="1.1" fill="none" opacity=".35"><path d="M42 50 Q36 66 42 82"/><path d="M58 50 Q64 66 58 82"/><path d="M50 46 L50 84"/></g>`, hl: [39, 62, 4.5, 8, 15] };
      case 'persimmon': return { top: 40, shape: `<ellipse ${s} cx="50" cy="62" rx="29" ry="23"/>`,
        extra: `<g fill="${LEAF}"><ellipse cx="42" cy="41" rx="9" ry="3.4" transform="rotate(-14 42 41)"/><ellipse cx="58" cy="41" rx="9" ry="3.4" transform="rotate(14 58 41)"/><ellipse cx="50" cy="44" rx="3.4" ry="5"/></g>`, hl: [38, 53, 7, 4, -20] };
      case 'pear': return { top: 22, shape: `<path ${s} d="M50 22 C 57 22, 58 36, 62 46 C 78 62, 71 87, 50 87 C 29 87, 22 62, 38 46 C 42 36, 43 22, 50 22 Z"/>`, extra: '', hl: [40, 64, 5, 9, 15] };
      case 'cluster': { const p = [[29, 38], [43, 38], [57, 38], [71, 38], [36, 51], [50, 51], [64, 51], [43, 64], [57, 64], [50, 77]];
        return { top: 29, cluster: p, shape: p.map(([x, y]) => `<circle ${s} cx="${x}" cy="${y}" r="9"/>`).join(''), extra: '', hl: null }; }
      case 'plum': return { top: 35, shape: `<ellipse ${s} cx="50" cy="61" rx="24" ry="25"/>`, extra: `<path d="M52 37 Q60 60 52 85" stroke="${dk}" stroke-width="1.4" fill="none" opacity=".35"/>`, hl: [38, 50, 6, 5, -30] };
      case 'gourd': return { top: 33, shape: `<ellipse ${s} cx="50" cy="61" rx="23" ry="27"/>`,
        extra: `<g stroke="${dk}" stroke-width="1.3" fill="none" opacity=".35"><path d="M50 35 L50 87"/><path d="M50 35 Q36 60 50 87"/><path d="M50 35 Q64 60 50 87"/><path d="M50 35 Q27 60 50 87"/><path d="M50 35 Q73 60 50 87"/></g>`, hl: [39, 52, 4.5, 8, -10] };
    }
  }

  function fruitArt(f) {
    const id = uid(), g = geom(f, `url(#${id})`);
    const stem = f.k === 'persimmon' ? `<path d="M50 42 L51 35" stroke="${STEM}" stroke-width="3" stroke-linecap="round"/>`
      : `<path d="M50 ${g.top + 2} C 50 ${g.top - 6}, 51 ${g.top - 12}, 55 ${g.top - 16}" stroke="${STEM}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    const lx = 53, ly = g.top - 9;
    const leaf = `<path d="M${lx} ${ly} C ${lx + 8} ${ly - 12}, ${lx + 22} ${ly - 13}, ${lx + 29} ${ly - 7} C ${lx + 21} ${ly + 3}, ${lx + 9} ${ly + 5}, ${lx} ${ly} Z" fill="${LEAF}"/>`;
    let hl = '';
    if (g.cluster) hl = g.cluster.map(([x, y]) => `<circle cx="${x - 3}" cy="${y - 3.5}" r="2.3" fill="#fff" opacity=".6"/>`).join('');
    else { const [x, y, rx, ry, r] = g.hl; hl = `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".55"/>`; }
    return `<defs><radialGradient id="${id}" cx="40%" cy="38%" r="75%"><stop offset="0" stop-color="${mix(f.fl, '#ffffff', .3)}"/><stop offset=".45" stop-color="${f.c}"/><stop offset="1" stop-color="${mix(f.c, '#000000', .25)}"/></radialGradient></defs>${stem}${leaf}${g.shape}${g.extra}${hl}`;
  }

  function stageArt(st, f) {
    const id = uid();
    const gr = `<defs><radialGradient id="${id}" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${f.fl}"/><stop offset="1" stop-color="${f.c}"/></radialGradient></defs>`;
    if (st === 'seed') return gr + `<circle cx="50" cy="58" r="8" fill="url(#${id})"/><circle cx="50" cy="58" r="2.8" fill="#fff" opacity=".9"/>`;
    if (st === 'bud') return gr + `<path d="M50 30 C 63 41, 63 57, 50 66 C 37 57, 37 41, 50 30 Z" fill="url(#${id})"/><path d="M39 60 Q50 76 61 60 Q55 69 50 70 Q45 69 39 60 Z" fill="${LEAF}"/><path d="M50 70 L50 82" stroke="${LEAF}" stroke-width="3" stroke-linecap="round"/>`;
    if (st === 'flower') {
      const p = [0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="42" rx="10" ry="15" transform="rotate(${a} 50 57)" fill="url(#${id})" opacity=".95"/>`).join('');
      return gr + p + `<circle cx="50" cy="57" r="7" fill="${f.c}"/><circle cx="50" cy="57" r="3" fill="#fff" opacity=".8"/>`;
    }
    if (st === 'fruit') return fruitArt(f);
    return '';
  }

  /* 光暈（依 RULES.visual.glow）。p = 濾鏡 id 前綴 */
  function halo(f, o, p, cy = 60, r = 40, cls = '', sty = '') {
    if (o <= 0) return '';
    return `<g opacity="${Math.min(o, 1).toFixed(2)}"><g class="${cls}" style="${sty}"><circle cx="50" cy="${cy}" r="${r}" fill="${f.fl}" opacity=".55" filter="url(#${p}blur)"/><circle cx="50" cy="${cy}" r="${f1(r * .6)}" fill="${f.c}" opacity=".6" filter="url(#${p}blur)"/></g></g>`;
  }
  const filters = p => `<filter id="${p}blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="${p}big" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="24"/></filter>
    <filter id="${p}sm" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.5"/></filter>`;
  const haloGeom = st => ({ cy: st === 'fruit' ? 60 : 57, r: st === 'seed' ? 22 : st === 'fruit' ? 42 : 34 });

  /* 單張圖示（選擇格子、階段標籤、素材匯出用） */
  function icon(f, st, opts = {}) {
    const p = uid() + '-', size = opts.size ? ` width="${opts.size}" height="${opts.size}"` : '';
    const art = st === 'dormant' ? fruitArt(f) : stageArt(st, f);
    const h = opts.glow ? halo(f, opts.glow, p, haloGeom(st).cy, haloGeom(st).r, opts.haloClass || '') : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${size} style="overflow:visible" aria-hidden="true"><defs>${filters(p)}</defs>${h}<g class="art">${art}</g></svg>`;
  }

  /* ---------- 會生長的樹 ---------- */
  const W = 800, H = 620, GY = 462, CX = 400;
  const TRUNK_H = [0, 60, 92, 124, 154, 180, 204, 226];
  const TRUNK_W = [0, 8, 12, 16, 21, 26, 32, 38];
  const ROOTS_N = [0, 2, 3, 4, 5, 6, 7, 8];
  const RULES_LEAVES_MAX = o => o.rules.leaves_max || 24;

  function rootPath(i, level) {
    const r = rng(200 + i * 17);
    const side = i % 2 ? 1 : -1, spread = (0.3 + r() * 0.9) * side;
    const depth = 22 + level * 17 * (0.7 + r() * 0.3);
    const x0 = CX + side * (2 + r() * 6), y0 = GY + 6;
    const x1 = x0 + spread * depth * .55, y1 = y0 + depth * .45;
    const x2 = x0 + spread * depth * 1.1 + (r() - .5) * 20, y2 = y0 + depth;
    return { d: `M${f1(x0)} ${f1(y0)} Q ${f1(x1)} ${f1(y1 - 8)} ${f1((x1 + x2) / 2)} ${f1((y1 + y2) / 2)} T ${f1(x2)} ${f1(y2)}`, len: depth * 1.6 };
  }

  /** v: Engine.treeVisual 的輸出；o: { mode, fruits, rules, prev, washK, label } */
  function tree(v, o) {
    const mode = o.mode || 'night', P = PAL[mode], RV = o.rules.visual, MV = RV[mode];
    const prev = o.prev && o.prev.date !== v.date ? o.prev : (o.prev || null);
    const p = uid() + '-', R = rng(11);
    let s = `<defs>${filters(p)}
      <linearGradient id="${p}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset=".65" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>
      <linearGradient id="${p}soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.soil[0]}"/><stop offset="1" stop-color="${P.soil[1]}"/></linearGradient>
      <linearGradient id="${p}tr" x1="0" x2="1"><stop offset="0" stop-color="${P.trunk[0]}"/><stop offset=".55" stop-color="${P.trunk[1]}"/><stop offset="1" stop-color="${P.trunk[0]}"/></linearGradient>
      <radialGradient id="${p}sun"><stop offset="0" stop-color="#FFF3C4"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>
      <radialGradient id="${p}seed"><stop offset="0" stop-color="${P.lamp}"/><stop offset="1" stop-color="${P.lamp}" stop-opacity="0"/></radialGradient></defs>`;
    /* 天空 */
    s += `<rect width="${W}" height="${GY + 10}" fill="url(#${p}sky)"/>`;
    if (mode === 'day') {
      s += `<circle cx="680" cy="80" r="170" fill="url(#${p}sun)"/><circle cx="680" cy="80" r="30" fill="#FFF6D8"/>
        <g fill="#fff" opacity=".85"><ellipse cx="120" cy="90" rx="70" ry="20"/><ellipse cx="160" cy="78" rx="44" ry="22"/><ellipse cx="560" cy="150" rx="60" ry="16"/><ellipse cx="590" cy="140" rx="34" ry="16"/></g>`;
    } else {
      for (let i = 0; i < 90; i++) { const x = R() * W, y = R() * (GY - 120), r = R() * 1.4 + .3; s += `<circle class="${i % 3 ? '' : 'tw'}" style="--d:${f1(2 + R() * 3)}s;--dl:${f1(R() * 3)}s" cx="${x | 0}" cy="${y | 0}" r="${f1(r)}" fill="#FFF6D6" opacity="${(.3 + R() * .6).toFixed(2)}"/>`; }
      s += `<circle cx="672" cy="82" r="22" fill="#FFF3CF"/><circle cx="682" cy="75" r="20" fill="${P.sky[0]}"/>`;
    }
    s += `<path d="M0 ${GY - 30} Q200 ${GY - 74} 400 ${GY - 28} T800 ${GY - 40} L800 ${GY + 10} L0 ${GY + 10}Z" fill="${P.hill}"/>`;
    /* 土壤剖面 */
    s += `<rect y="${GY}" width="${W}" height="${H - GY}" fill="url(#${p}soil)"/>`;
    s += `<path d="M0 ${GY} Q 200 ${GY - 6} 400 ${GY} T 800 ${GY} L800 ${GY + 8} L0 ${GY + 8}Z" fill="${P.grass}"/>`;
    for (let i = 0; i < 50; i++) { const x = R() * W, h = 5 + R() * 9; s += `<path d="M${x | 0} ${GY + 2} q2 ${f1(-h)} 4 ${f1(-h * 1.1)}" stroke="${P.grass}" stroke-width="1.4" fill="none"/>`; }

    /* 種子的微光（≥ 1 次省思） */
    if (v.seed_glow) s += `<circle cx="${CX}" cy="${GY + 22}" r="34" fill="url(#${p}seed)" opacity="${mode === 'day' ? .45 : .7}" class="br" style="--d:4.4s"/><circle cx="${CX}" cy="${GY + 22}" r="4" fill="${P.lamp}"/>`;

    /* 根系 */
    const rn = ROOTS_N[v.roots], prn = prev ? ROOTS_N[prev.roots] : rn;
    let roots = '', light = '';
    for (let i = 0; i < rn; i++) {
      const rp = rootPath(i, v.roots);
      const isNew = prev && (i >= prn || v.roots > prev.roots);
      const w = 1.4 + v.roots * .45 - i * .12;
      roots += `<path d="${rp.d}" stroke="${P.root}" stroke-width="${f1(Math.max(1.2, w))}" fill="none" stroke-linecap="round" ${isNew ? `class="rootin" style="--len:${rp.len | 0}"` : ''}/>`;
      if (v.returning) light += `<path d="${rp.d}" stroke="#BFE6FF" stroke-width="2.4" fill="none" stroke-linecap="round" class="rootlight" style="--len:${rp.len | 0};--dl:${f1(i * .25)}s" filter="url(#${p}sm)"/>`;
    }
    s += roots + light;

    /* 樹幹 */
    const L = v.trunk;
    const th = TRUNK_H[L], tw = TRUNK_W[L];
    const topY = GY - th;
    const crownR = 80 + L * 24;
    const cy = topY - 16 - L * 3;
    const sc = .7 + L * .06;                 // 樹冠內元素的縮放
    if (L >= 1) {
      const grow = prev && prev.trunk !== L ? ' class="trunkgrow"' : '';
      s += `<g${grow}><path fill="url(#${p}tr)" d="M${CX - tw / 2} ${GY + 6} C ${f1(CX - tw * .45)} ${f1(GY - th * .4)}, ${f1(CX - tw * .32)} ${f1(GY - th * .7)}, ${f1(CX - tw * .3)} ${topY} L ${f1(CX + tw * .3)} ${topY} C ${f1(CX + tw * .32)} ${f1(GY - th * .7)}, ${f1(CX + tw * .45)} ${f1(GY - th * .4)}, ${CX + tw / 2} ${GY + 6} Z"/>
        <ellipse cx="${CX}" cy="${GY + 4}" rx="${f1(tw * .9)}" ry="${f1(3 + tw * .12)}" fill="${P.trunk[0]}"/></g>`;
    } else if (v.seed_glow) {
      s += `<path d="M${CX} ${GY} Q ${CX + 2} ${GY - 14} ${CX + 6} ${GY - 22}" stroke="${LEAF}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
    }

    /* 樹冠骨架與枝條 */
    const tips = {};
    o.fruits.forEach(f => {
      const a = f.sector * Math.PI / 180;
      tips[f.id] = [CX + Math.cos(a) * crownR * .86, cy + Math.sin(a) * crownR * .62 * .86];
    });
    let branches = '';
    if (v.skeleton && L >= 1) {
      [-1, 1].forEach(side => {
        const ex = CX + side * crownR * .42, ey = cy - crownR * .12;
        branches += `<path d="M${CX} ${topY + 4} Q ${f1(CX + side * crownR * .12)} ${f1(topY - 10)} ${f1(ex)} ${f1(ey)}" stroke="${P.branch}" stroke-width="${f1(Math.max(3, tw * .42))}" fill="none" stroke-linecap="round"/>`;
      });
    }
    const SW = { seed: 2.2, bud: 3, flower: 3.6, fruit: 4.4 };
    o.fruits.forEach(f => {
      const st = v.fruits[f.id].state; if (st === 'dormant' || L < 1) return;
      const [x, y] = tips[f.id];
      const qx = CX + (x - CX) * .35, qy = topY - 6 + (y - topY) * .25;
      const isNew = prev && prev.fruits[f.id].state === 'dormant';
      branches += `<path d="M${CX} ${topY + 2} Q ${f1(qx)} ${f1(qy)} ${f1(x)} ${f1(y)}" stroke="${P.branch}" stroke-width="${f1(SW[st] * (.8 + L * .07))}" fill="none" stroke-linecap="round"${isNew ? ` class="rootin" style="--len:${Math.hypot(x - CX, y - topY) * 1.3 | 0}"` : ''}/>`;
    });
    s += branches;

    /* 葉片：每條枝條 min(planned × 3, 24) 片，圍繞枝頭以黃金角排列 */
    let leaves = [];
    o.fruits.forEach((f, fi) => {
      const n = L >= 1 ? v.fruits[f.id].leaves : 0; if (!n) return;
      const pn = prev ? prev.fruits[f.id].leaves : n;
      const [x, y] = tips[f.id];
      const qx = CX + (x - CX) * .35, qy = topY - 6 + (y - topY) * .25;
      const lr = rng(500 + fi);
      for (let j = 0; j < n; j++) {
        // 第一批長在枝頭，之後沿著枝條往樹幹方向長，樹冠內部會慢慢被填滿
        const t = 1 - .7 * (j / RULES_LEAVES_MAX(o)), u = 1 - t;
        const bx = u * u * CX + 2 * u * t * qx + t * t * x, by = u * u * (topY + 2) + 2 * u * t * qy + t * t * y;
        const a = j * 2.39996 + fi, rr = (8 + (j % 4) * 6 + lr() * 6) * sc;
        const px = bx + Math.cos(a) * rr * 1.2, py = by + Math.sin(a) * rr * .9 - 4 * sc;
        const r = (17 + (j % 3) * 3 + lr() * 3) * sc;
        const col = P.leaves[(j + fi) % 4];
        leaves.push([py, `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(r)}" fill="${col}"${prev && j >= pn ? ` class="leafin" style="--dl:${f1((j - pn) * .08)}s"` : ''}/>`]);
      }
    });
    leaves.sort((a, b) => a[0] - b[0]);
    s += leaves.map(l => l[1]).join('');

    /* 葉面柔光 */
    let wash = '';
    o.fruits.forEach(f => {
      const st = v.fruits[f.id].state; if (st === 'dormant' || L < 1) return;
      const k = RV.glow[st], [x, y] = tips[f.id];
      wash += `<circle class="${v.focus === f.id ? 'br' : ''}" style="--d:3.2s" cx="${f1(x)}" cy="${f1(y)}" r="${f1((30 + k * 80 * (o.washK || 1)) * sc)}" fill="${f.c}" opacity="${(k * .55 * (o.washK || 1) * MV.wash).toFixed(2)}" filter="url(#${p}big)"/>`;
    });
    s += `<g style="mix-blend-mode:${mode === 'night' ? 'screen' : 'normal'}">${wash}</g>`;

    /* 花果 */
    const items = [];
    o.fruits.forEach((f, i) => {
      const st = v.fruits[f.id].state; if (st === 'dormant' || L < 1) return;
      const [x, y] = tips[f.id];
      const spots = st === 'fruit' ? [[0, 6, .7], [-24, 24, .6], [22, 28, .58]] : [[0, 4, st === 'seed' ? .8 : .72]];
      const changed = prev && prev.fruits[f.id].state !== st;
      const glow = RV.glow[st] * MV.halo * (v.focus === f.id ? RV.focus_boost : 1);
      const hg = haloGeom(st);
      spots.forEach(([dx, dy, k], j) => {
        const scale = k * sc, X = x + dx * sc, Y = y + dy * sc;
        const d = f1(3 + ((i * 7 + j * 3) % 5) * .45), dl = f1((i * .37 + j * .6) % 2.5);
        items.push([Y, `<g transform="translate(${f1(X - 50 * scale)} ${f1(Y - 58 * scale)}) scale(${scale.toFixed(3)})"><g${changed ? ` class="enter" style="--dl:${f1(j * .25)}s"` : ''}>${halo(f, glow, p, hg.cy, hg.r, 'br', `--d:${d}s;--dl:${dl}s`)}${stageArt(st, f)}</g></g>`]);
      });
    });
    items.sort((a, b) => a[0] - b[0]);
    s += items.map(i => i[1]).join('');

    /* 漂浮光點 */
    for (let i = 0; i < P.ff; i++) {
      const x = 80 + R() * 640, y = 160 + R() * (GY - 170);
      s += `<g class="ff" style="--d:${f1(7 + R() * 6)}s;--dl:${f1(R() * 4)}s"><circle cx="${x | 0}" cy="${y | 0}" r="5" fill="#F8F2A0" opacity="${mode === 'day' ? .35 : .5}" filter="url(#${p}sm)"/><circle cx="${x | 0}" cy="${y | 0}" r="1.4" fill="#FFFBE0"/></g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" class="scene" viewBox="0 0 ${W} ${H}" role="img" aria-label="${o.label || '生命樹'}">${s}</svg>`;
  }

  /* ---------- App icon（1024） ---------- */
  function appIcon(fruits) {
    const p = uid() + '-';
    let dots = '';
    fruits.forEach((f, i) => {
      const a = (f.sector) * Math.PI / 180, x = 512 + Math.cos(a) * 250, y = 470 + Math.sin(a) * 170;
      dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="62" fill="${f.c}" opacity=".55" filter="url(#${p}g)"/><circle cx="${f1(x)}" cy="${f1(y)}" r="30" fill="${mix(f.fl, '#ffffff', .2)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="22" fill="${f.c}"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs><linearGradient id="${p}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1630"/><stop offset="1" stop-color="#1F3D62"/></linearGradient>
  <filter id="${p}g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="22"/></filter>
  <clipPath id="${p}c"><rect width="1024" height="1024" rx="224"/></clipPath></defs>
  <g clip-path="url(#${p}c)">
  <rect width="1024" height="1024" fill="url(#${p}bg)"/>
  <path d="M492 900 C 498 800, 500 700, 496 600 L 528 600 C 524 700, 526 800, 532 900 Z" fill="#4A3626"/>
  <ellipse cx="512" cy="470" rx="330" ry="240" fill="#1B3A30"/><ellipse cx="512" cy="440" rx="270" ry="190" fill="#204337"/>
  ${dots}
  <path d="M0 900 Q512 860 1024 900 L1024 1024 L0 1024Z" fill="#0F1F19"/></g>
</svg>`;
  }

  return { PAL, mix, icon, tree, appIcon, fruitArt, stageArt };
})();

if (typeof module !== 'undefined') module.exports = { Art };
