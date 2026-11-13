/* Tree of Life — 九種果子資料、成長規則、感受提示表（規格 v0.3）
   純資料，瀏覽器與 Node 共用（以全域變數提供）。 */

var FRUITS = [
  { id: 'love', zh: '仁愛', en: 'Love', c: '#E0534A', fl: '#FFC9C2', k: 'apple', motif: 'heart', angle: 0, sector: 162,
    refs: ['哥林多前書 13:4-7', '約翰一書 4:19'],
    desc: '愛先是領受，才能流出。不是努力表現出愛，而是在被愛中學會關心、接納與付出。',
    q: ['今天有誰讓你不容易去愛？你當時心裡最在意的是什麼？', '你今天在哪個時刻感受到自己是被接納的？', '如果不需要先證明對方值得，你會怎麼對待他？'],
    p: ['主動問候一位最近較少聯絡的人', '聆聽某人說完話而不急著給建議', '為一位讓你不舒服的人禱告'] },
  { id: 'joy', zh: '喜樂', en: 'Joy', c: '#F2B934', fl: '#FFEDB5', k: 'citrus', motif: 'dots', angle: 40, sector: 189,
    refs: ['腓立比書 4:4', '尼希米記 8:10'],
    desc: '喜樂不是情緒永遠高昂，而是在環境起伏中，仍知道生命的源頭沒有改變。',
    q: ['今天你的心情主要被什麼事左右？', '有沒有一件小事，是你差點忽略的恩典？', '你的喜樂比較依賴結果，還是依賴關係？'],
    p: ['睡前寫下三件今天的恩典', '把一件好消息分享給別人', '在等待中安排一段不為產出的休息'] },
  { id: 'peace', zh: '和平', en: 'Peace', c: '#5B9BE0', fl: '#CFE3FA', k: 'oval', motif: null, angle: 80, sector: 216,
    refs: ['腓立比書 4:6-7', '約翰福音 14:27'],
    desc: '在不確定中仍能安穩，不必先掌握所有答案。也包含願意促成人與人之間的和好。',
    q: ['今天讓你不安的，是哪一件你無法控制的事？', '你試圖用什麼方式讓自己重新感到可控？', '如果把這件事交託出去，你今晚可以放下什麼？'],
    p: ['把擔心的事寫下來並逐項禱告交託', '面對衝突前先停三次呼吸', '主動修補一段緊張的關係'] },
  { id: 'patience', zh: '忍耐', en: 'Patience', c: '#B0767C', fl: '#F1D6DE', k: 'fig', motif: 'ribs', angle: 120, sector: 243,
    refs: ['雅各書 1:2-4', '羅馬書 12:12'],
    desc: '面對等待、緩慢與困難時，不輕易失去盼望，也不急著用自己的方式加速。',
    q: ['今天哪件事讓你覺得「太慢了」？', '你在等待中最想抓住的是什麼？', '這段等待可能正在培養你什麼？'],
    p: ['讓別人用自己的速度完成一件事', '把一個想立刻回覆的訊息延到冷靜後再回', '為一個長期等待的事寫下目前看見的進展'] },
  { id: 'kindness', zh: '恩慈', en: 'Kindness', c: '#F0813A', fl: '#FFDDC2', k: 'persimmon', motif: 'calyx', angle: 160, sector: 270,
    refs: ['以弗所書 4:32'],
    desc: '以溫柔和善意對待他人，特別是對方沒有「做到」的時候。',
    q: ['今天你對誰比較嚴厲？那份嚴厲背後是什麼？', '你希望別人在你失誤時怎麼對待你？', '有沒有一個人，今天其實需要的是一句好話？'],
    p: ['對一位服務人員具體表達感謝', '在別人犯錯時先說一句體諒的話', '為家人做一件他沒開口要求的事'] },
  { id: 'goodness', zh: '良善', en: 'Goodness', c: '#7FC255', fl: '#D8F2C8', k: 'pear', motif: null, angle: 200, sector: 297,
    refs: ['羅馬書 12:21', '彌迦書 6:8'],
    desc: '選擇正直且合宜的行動，即使沒有人看見，也不以此證明自己比別人好。',
    q: ['今天有沒有一個「做對的事」比較困難的時刻？', '你做好事時，心裡在意的是對方，還是自己的形象？', '哪個小地方，可以讓你的行動和信念更一致？'],
    p: ['在沒人要求的情況下完成一件該做的事', '承認一個自己的小錯誤', '拒絕一件與良心不一致的小便宜'] },
  { id: 'faithfulness', zh: '信實', en: 'Faithfulness', c: '#6A7FD6', fl: '#DCE2FA', k: 'cluster', motif: null, angle: 240, sector: 324,
    refs: ['路加福音 16:10', '哀歌 3:22-23'],
    desc: '持守承諾與忠心，在小事上可靠。也記得自己的信實，是回應神先向我們的信實。',
    q: ['最近有沒有一個你答應了卻一直拖著的事？', '今天你在哪一件小事上是忠心的？', '你在哪裡經歷過神的信實？'],
    p: ['完成一件拖延已久的承諾', '準時出席並全心參與一個約定', '每天固定一個時間回到經文'] },
  { id: 'gentleness', zh: '溫柔', en: 'Gentleness', c: '#B985D6', fl: '#F1E2F8', k: 'plum', motif: 'seam', angle: 280, sector: 351,
    refs: ['馬太福音 11:29', '箴言 15:1'],
    desc: '有能力，卻不以強勢控制他人。溫柔不是軟弱，而是收斂的力量。',
    q: ['今天你在哪裡想用強勢讓事情照你的方式走？', '對方當時可能需要什麼？', '如果換一種語氣，同一句話會帶來什麼不同？'],
    p: ['在討論中先問一個問題再表達立場', '把一句命令改成邀請', '在占上風的時候選擇不追擊'] },
  { id: 'self-control', zh: '節制', en: 'Self-control', c: '#C9B53A', fl: '#F6EBA8', k: 'gourd', motif: 'ridges', angle: 320, sector: 378,
    refs: ['箴言 25:28', '提多書 2:11-12'],
    desc: '能管理自己的慾望與反應。不是靠意志力硬撐，而是在恩典中學會說「不」也說「好」。',
    q: ['今天你在哪個時刻反應得比你希望的更快？', '那一刻你真正想要的是什麼？', '有什麼環境上的小調整，能讓你下次更容易停一下？'],
    p: ['設定一段不碰手機的時間', '在生氣時先離開現場十分鐘', '為一個習慣設定一個溫和的界線'] },
];

/* growth_rules.json */
var RULES = {
  version: '0.3',
  practice_min_chars: 4,
  thresholds: {                       // 由高往低判斷，條件全部成立
    fruit:  { practiced_count: 4, active_weeks: 3 },
    flower: { planned_count: 2, practiced_count: 1 },
    bud:    { focus_days: 3, aware_days: 2 },
    seed:   { focus_days: 1 },
  },
  roots_thresholds: [1, 3, 7, 14, 30, 60, 120],   // total_reflections
  trunk_thresholds: [1, 2, 4, 8, 16, 26, 52],     // total_active_weeks
  leaves_per_plan: 3,
  leaves_max: 24,
  return_gap_days: 7,
  visual: {
    glow: { seed: 0.25, bud: 0.4, flower: 0.55, fruit: 0.75 },
    focus_boost: 1.3,
    day_hours: [6, 18],
    day: { halo: 0.6, wash: 0.45 },
    night: { halo: 1, wash: 1 },
  },
};

/* fruit_hints.json — Q2 感受 → 可以看看的果子（規則對照，不經過 AI；草案） */
var FEELINGS = ['焦慮', '想掌控', '生氣', '不耐煩', '失落', '疲憊', '受傷', '嫉妒', '自責', '想逃避', '平靜', '感恩'];
var HINTS = {
  '焦慮': ['peace', 'patience'], '想掌控': ['peace', 'patience'],
  '生氣': ['patience', 'gentleness', 'self-control'], '不耐煩': ['patience', 'gentleness', 'self-control'],
  '失落': ['joy', 'faithfulness'], '疲憊': ['joy', 'faithfulness'],
  '受傷': ['love', 'kindness'],
  '嫉妒': ['joy', 'goodness'],
  '自責': ['love', 'faithfulness'],
  '想逃避': ['self-control', 'faithfulness'],
  '平靜': [], '感恩': [],
};
var DIRECTIONS = [['life', '生命樹'], ['knowledge', '分別善惡樹'], ['mixed', '兩者都有'], ['unsure', '不確定']];

if (typeof module !== 'undefined') module.exports = { FRUITS, RULES, FEELINGS, HINTS, DIRECTIONS };
