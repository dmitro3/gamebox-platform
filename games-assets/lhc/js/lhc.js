/**
 * 游戏类型: lhc
 *
 * 幸运六合彩 · 聊天投注房
 */
$(function () {
  const GAME_TYPE = 'lhc';

  /** 总周期 60s；准备中 = 7 球滚停实测 ≈3.2s → 取 4s；倒计时从 00:56 起 */
  const INTERVAL = 60;
  const PREP_SEC = 4;
  const BET_SEC = INTERVAL - PREP_SEC;
  function fixAvatar(url) {
    const fallback = '/images/avatars/001.jpg';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('../../client-app/assets/')) {
      return '/legacy/' + url.slice('../../client-app/assets/'.length);
    }
    if (url.startsWith('../../assets/')) {
      return '/legacy/' + url.slice('../../assets/'.length);
    }
    if (url.startsWith('../assets/')) {
      return '/legacy/' + url.slice('../assets/'.length);
    }
    return url;
  }
  const ROBOT = { name: '机器人', avatar: '/images/avatars/001.jpg' };
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const user = App.getUser();
  const q = roomNo ? '?roomNo=' + encodeURIComponent(roomNo) : '';

  let historyRows = [];
  let lastDraw = [];
  let lastIssueSeq = 0;
  let lastBetText = '';
  /** 上一笔成功投注的全部注单行（玩法面板「重复」用） */
  let lastBetLines = [];
  let drawPanelOpen = false;
  const closedIssues = new Set();
  const drawnIssues = new Set();
  const MOCK_NAMES = [];
  /** 当期注单：issue -> { 玩家名: [{ play, amount }] } */
  const issueBetBook = {};

  function getRoundRemain() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return INTERVAL - (elapsed % INTERVAL);
  }
  function getCurrentIssue() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return fmtIssue8(Math.floor(elapsed / INTERVAL) + 1);
  }
  function isBettingOpen() {
    return getRoundRemain() > PREP_SEC;
  }
  function parseBet(text) {
    const t = String(text || '').trim();
    if (!t) return null;
    // 优先：末段空格分隔金额（兼容「复式二全中 01,08 100」）
    const parts = t.split(/\s+/);
    if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
      const amount = parseInt(parts[parts.length - 1], 10);
      const play = parts.slice(0, -1).join(' ').replace(/[\/／]\s*$/, '');
      if (amount > 0 && play && parsePlay(play)) return { play, amount };
    }
    // 兼容：特码大100 / 特码08/100
    const m = t.match(/^(.*?)[\/／\s]*(\d+)$/);
    if (!m) return null;
    const amount = parseInt(m[2], 10);
    const play = m[1].trim().replace(/[\/／]\s*$/, '');
    if (!amount || !play) return null;
    if (!parsePlay(play)) return null;
    return { play, amount };
  }
  function recordBet(name, text) {
    if (!isBettingOpen()) return false;
    const bet = parseBet(text);
    if (!bet) return false;
    const issue = getCurrentIssue();
    if (!issueBetBook[issue]) issueBetBook[issue] = {};
    if (!issueBetBook[issue][name]) issueBetBook[issue][name] = [];
    issueBetBook[issue][name].push(bet);
    return true;
  }
  function fmtProfit(n) {
    return (n >= 0 ? '+' : '') + n;
  }
  function buildBetListVerifyText(issue) {
    const book = issueBetBook[issue];
    if (!book || !Object.keys(book).length) {
      return `${issue}期已封盘\n竞猜列表核对\n——————————\n暂无下注数据`;
    }
    const blocks = Object.keys(book).map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const lines = bets.map(b => `${b.play} ${b.amount}`).join('\n');
      return `（${name}）下注总金额：${total}\n${lines}`;
    });
    return `${issue}期已封盘\n竞猜列表核对\n——————————\n${blocks.join('\n\n')}`;
  }

  /* ================= 玩法 · 赔率（对齐 D:\123.com cn_odds / Getwin.php） ================= */
  const ODDS = {
    tema: 47,               // 特码
    temaB: 47,
    zhengma: 7,             // 平码（正码）
    zhengmaB: 7,
    zhengmaTe: 47,
    side: 1.95,             // 两面 / 合数 / 尾大小
    weiXiao: 1.95,
    comboSide: 3.7,
    colorRed: 2.823,
    colorBlue: 3.003,
    colorGreen: 3.003,
    zodiac: 12.25,          // 特肖 非本命
    zodiacYear: 9.55,       // 特肖 本命
    pingTe: 2,              // 总肖项 / 一肖
    pingTeYear: 2,
    pingTail0: 2.08,
    pingTail: 1.77,
    weiShu0: 2,             // 总数项 · 0尾
    weiShu: 1.8,            // 总数项 · 1~9尾
    weiShuMiss0: 2,         // 尾数不中 · 0尾
    weiShuMiss: 1.8,        // 尾数不中 · 1~9尾
    sumSide: 1.95,
    sumTail: 1.96,
    head0: 5,
    head: 4.36,
    tail0: 12,              // 特码头/尾（特码本位）
    tail: 9.6,
    liuxiao: 1.95,
    erQuanZhong: 60,        // 二全中
    erZhongTe: 55,          // 二中特 · 中二
    erZhongTeTe: 25,        // 二中特 · 中特
    teChuan: 160,           // 特串
    sanQuanZhong: 600,      // 三全中
    sanZhongEr: 20,         // 三中二 · 中二
    sanZhongSan: 120,       // 三中二 · 中三
    sxLianZhong: { 2: 4, 3: 11, 4: 31, 5: 100 },
    sxLianBuZhong: { 2: 4, 3: 11, 4: 31, 5: 100 },
    wsLianZhong: { 2: 3.05, 3: 6.8, 4: 15.8 },
    wsLianBuZhong: { 2: 3.05, 3: 6.8, 4: 15.8 },
    buZhong: { 5: 2, 6: 2.5, 7: 3, 8: 3.5, 9: 4, 10: 5, 11: 6.2, 12: 7.6 },
    wuxing: { 金: 4.3, 木: 4.3, 水: 5.2, 火: 3.5, 土: 4.7 },
  };

  /** 2026 马年：本命生肖=马（公式与港彩盘一致） */
  const YEAR_ZODIAC = '马';
  const ZODIAC_ORDER = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];

  const RED = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
  const BLUE = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];
  /* 五行号表对齐 123.com cn_sxnumber id=25~29 */
  const WUXING_MAP = {
    金: [13, 14, 21, 22, 29, 30, 43, 44],
    木: [5, 6, 19, 20, 27, 28, 35, 36, 49],
    水: [1, 2, 9, 10, 17, 18, 31, 32, 39, 40, 47, 48],
    火: [7, 8, 15, 16, 23, 24, 37, 38, 45, 46],
    土: [3, 4, 11, 12, 25, 26, 33, 34, 41, 42],
  };
  const CN_NUM = { 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 };

  const PLAY_ITEMS = [
    '特码大', '特码小', '特码单', '特码双',
    '特大单', '特大双', '特小单', '特小双',
    '红波', '蓝波', '绿波',
    '总和大', '总和小', '总和单', '总和双',
    '特合大', '特合小', '特合单', '特合双',
    '特尾大', '特尾小',
    '金', '木', '水', '火', '土',
    '马', '蛇', '龙', '兔', '特码08', '正码12', '平特马', '5尾',
  ];

  function zodiacOf(n) {
    const idx = (n - 1) % 12;
    return ZODIAC_ORDER[idx];
  }
  function zodiacOdds(z) {
    return z === YEAR_ZODIAC ? ODDS.zodiacYear : ODDS.zodiac;
  }
  function pingTeOdds(z) {
    return z === YEAR_ZODIAC ? ODDS.pingTeYear : ODDS.pingTe;
  }
  function wuxingOf(n) {
    for (const [k, arr] of Object.entries(WUXING_MAP)) {
      if (arr.includes(n)) return k;
    }
    return '';
  }
  function waveColor(n) {
    if (RED.includes(n)) return '红';
    if (BLUE.includes(n)) return '蓝';
    return '绿';
  }
  function digitSum(n) {
    return Math.floor(n / 10) + (n % 10);
  }
  function isTemaTie(n) {
    return n === 49;
  }
  function sideOfTema(n) {
    return { big: n >= 25, odd: n % 2 === 1 };
  }
  function matchSide(side, meta) {
    if (side === '大') return meta.big;
    if (side === '小') return !meta.big;
    if (side === '单') return meta.odd;
    return !meta.odd;
  }
  function colorOdds(c) {
    if (c === '红') return ODDS.colorRed;
    if (c === '蓝') return ODDS.colorBlue;
    return ODDS.colorGreen;
  }
  function parseNumList(str) {
    return String(str || '').split(/[,，\s]+/).map(s => parseInt(s, 10)).filter(n => n >= 1 && n <= 49);
  }
  function parseZodiacList(str) {
    return String(str || '').split(/[,，\s]+/).filter(z => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(z));
  }
  function parseTailList(str) {
    return String(str || '').split(/[,，\s]+/).map(s => {
      const m = String(s).match(/^(\d)/);
      return m ? +m[1] : NaN;
    }).filter(n => n >= 0 && n <= 9);
  }
  function combinations(arr, k) {
    const out = [];
    const n = arr.length;
    if (k <= 0 || k > n) return out;
    const idx = Array.from({ length: k }, (_, i) => i);
    while (true) {
      out.push(idx.map(i => arr[i]));
      let i = k - 1;
      while (i >= 0 && idx[i] === i + n - k) i -= 1;
      if (i < 0) break;
      idx[i] += 1;
      for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
    }
    return out;
  }

  /** C(n,k) 注数（对齐 gOrderB 复式） */
  function comboCountFushi(n, k) {
    if (k <= 0 || n < k) return 0;
    let a = 1;
    let b = 1;
    for (let i = 0; i < k; i++) {
      a *= (n - i);
      b *= (i + 1);
    }
    return Math.round(a / b);
  }
  /** 复式：全部 C(n,k) 组合 */
  function expandFushi(items, k) {
    return combinations([...items], k);
  }
  /**
   * 拖头：前 (k-1) 为胆，其余为托；每托一注 = 胆全部 + 该托
   * 对齐 gOrderB / rules「鼠拖牛、虎」
   */
  function expandTuotou(items, k) {
    const arr = [...items];
    const headN = k - 1;
    if (headN <= 0 || arr.length <= headN) return [];
    const head = arr.slice(0, headN);
    const tails = arr.slice(headN);
    return tails.map(t => head.concat([t]));
  }
  /** 多组：每组原样 1 注 */
  function expandDuozu(groups) {
    return (groups || []).filter(g => g && g.length).map(g => [...g]);
  }
  /** 对碰：A×B 笛卡尔积（去同号），生成二码对 */
  function expandDuipengPairs(setA, setB) {
    const out = [];
    const seen = new Set();
    (setA || []).forEach(a => {
      (setB || []).forEach(b => {
        if (a === b) return;
        const x = +a;
        const y = +b;
        if (!(x >= 1 && x <= 49 && y >= 1 && y <= 49)) return;
        const lo = Math.min(x, y);
        const hi = Math.max(x, y);
        const key = lo + ',' + hi;
        if (seen.has(key)) return;
        seen.add(key);
        out.push([lo, hi]);
      });
    });
    return out;
  }
  /** 生肖 → 对应号码 1~49 */
  function numsOfZodiac(z) {
    const out = [];
    for (let n = 1; n <= 49; n++) {
      if (zodiacOf(n) === z) out.push(n);
    }
    return out;
  }
  /** 尾数 → 对应号码 */
  function numsOfTail(t) {
    const tail = +t;
    const out = [];
    for (let n = 1; n <= 49; n++) {
      if (n % 10 === tail) out.push(n);
    }
    return out;
  }
  /** 按副玩法展开组合（items 保持选择顺序，拖头依赖顺序） */
  function expandByMode(mode, items, k) {
    if (mode === '拖头') return expandTuotou(items, k);
    return expandFushi(items, k);
  }
  function unitAmount() {
    return Math.max(1, parseInt($('#playAmount').val(), 10) || 0);
  }
  function fmtBetSummary(betCount, amount) {
    if (!betCount) return '';
    return `共${betCount}注·合计${betCount * amount}`;
  }

  /**
   * 解析玩法文本 → { type, ..., odds }；不合法返回 null
   * 对齐 123.com class1/class2/class3 语义
   */
  function parsePlay(raw) {
    const t = String(raw || '').replace(/\s+/g, '').replace(/\//g, '');
    let m;
    // 连码：复式二全中01,08 / 二中特01,02
    if ((m = t.match(/^(复式|拖头|生肖对碰|尾数对碰|生尾对碰|任意对碰)?(二全中|二中特|特串|三全中|三中二)([\d,，]+)$/))) {
      const nums = parseNumList(m[3]);
      const need = (m[2] === '三全中' || m[2] === '三中二') ? 3 : 2;
      if (nums.length < need) return null;
      const oddsMap = {
        二全中: ODDS.erQuanZhong,
        二中特: ODDS.erZhongTe,
        特串: ODDS.teChuan,
        三全中: ODDS.sanQuanZhong,
        三中二: ODDS.sanZhongEr,
      };
      return { type: 'lianma', mode: m[1] || '复式', play: m[2], nums, odds: oddsMap[m[2]], odds2: m[2] === '二中特' ? ODDS.erZhongTeTe : (m[2] === '三中二' ? ODDS.sanZhongSan : 0) };
    }
    // 生肖连：复式二肖中鼠,牛
    if ((m = t.match(/^(复式|拖头)?([二三四五])肖(中|不中)([鼠牛虎兔龙蛇马羊猴鸡狗猪,，]+)$/))) {
      const n = CN_NUM[m[2]];
      const zs = parseZodiacList(m[4]);
      if (!n || zs.length < n) return null;
      const hit = m[3] === '中';
      const table = hit ? ODDS.sxLianZhong : ODDS.sxLianBuZhong;
      return { type: 'sxLian', mode: m[1] || '复式', n, hit, zodiacs: zs, odds: table[n] || 1 };
    }
    // 尾数连：复式二尾中0尾,1尾（无五尾）
    if ((m = t.match(/^(复式|拖头)?([二三四])尾(中|不中)((?:\d尾?[,，]*)+)$/))) {
      const n = CN_NUM[m[2]];
      const tails = parseTailList(m[4]);
      if (!n || tails.length < n) return null;
      const hit = m[3] === '中';
      const table = hit ? ODDS.wsLianZhong : ODDS.wsLianBuZhong;
      return { type: 'wsLian', mode: m[1] || '复式', n, hit, tails, odds: table[n] || 1 };
    }
    // 六肖中/不中
    if ((m = t.match(/^(六肖中|六肖不中)([鼠牛虎兔龙蛇马羊猴鸡狗猪,，]+)$/))) {
      const zs = parseZodiacList(m[2]);
      if (zs.length !== 6) return null;
      return { type: 'liuxiao', hit: m[1] === '六肖中', zodiacs: zs, odds: ODDS.liuxiao };
    }
    // 多选不中：复式五不中01,02,...
    if ((m = t.match(/^(复式|多组)?(十一|十二|五|六|七|八|九|十)不中([\d,，]+)$/))) {
      const n = CN_NUM[m[2]];
      const nums = parseNumList(m[3]);
      if (!n || nums.length < n) return null;
      return { type: 'buZhong', mode: m[1] || '复式', n, nums, odds: ODDS.buZhong[n] || 1 };
    }
    // 特码号码
    if ((m = t.match(/^(?:特码|特)(0?[1-9]|[1-4][0-9])$/))) {
      const num = +m[1];
      if (num < 1 || num > 49) return null;
      return { type: 'tema', num, odds: ODDS.tema };
    }
    // 正码特
    if ((m = t.match(/^正([一二三四五六1-6])特(0?[1-9]|[1-4][0-9])$/))) {
      const posMap = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5 };
      const pos = posMap[m[1]];
      const num = +m[2];
      if (pos == null || num < 1 || num > 49) return null;
      return { type: 'zhengmaTe', pos, num, odds: ODDS.zhengmaTe };
    }
    // 正码号码
    if ((m = t.match(/^(?:正码|正)(0?[1-9]|[1-4][0-9])$/))) {
      const num = +m[1];
      if (num < 1 || num > 49) return null;
      return { type: 'zhengma', num, odds: ODDS.zhengma };
    }
    if ((m = t.match(/^正(?:码)?([1-6])(大|小|单|双)$/))) {
      return { type: 'zhengSide', pos: +m[1] - 1, side: m[2], odds: ODDS.side };
    }
    if ((m = t.match(/^正(?:码)?([1-6])(大单|大双|小单|小双)$/))) {
      return { type: 'zhengCombo', pos: +m[1] - 1, combo: m[2], odds: ODDS.comboSide };
    }
    if ((m = t.match(/^正(?:码)?([1-6])(红|蓝|绿)波?$/))) {
      return { type: 'zhengColor', pos: +m[1] - 1, color: m[2], odds: colorOdds(m[2]) };
    }
    if ((m = t.match(/^(?:特码|特)(大单|大双|小单|小双)$/))) {
      return { type: 'temaCombo', combo: m[1], odds: ODDS.comboSide };
    }
    if ((m = t.match(/^(?:特码|特)(大|小|单|双)$/))) {
      return { type: 'temaSide', side: m[1], odds: ODDS.side };
    }
    if ((m = t.match(/^(?:特码)?合(大|小|单|双)$/) ) || (m = t.match(/^特合(大|小|单|双)$/))) {
      return { type: 'heSide', side: m[1], odds: ODDS.side };
    }
    if ((m = t.match(/^(?:特码)?尾(大|小)$/) ) || (m = t.match(/^特尾(大|小)$/))) {
      return { type: 'weiSide', side: m[1], odds: m[1] === '小' ? ODDS.weiXiao : ODDS.side };
    }
    if ((m = t.match(/^(红|蓝|绿)波$/))) {
      return { type: 'color', color: m[1], odds: colorOdds(m[1]) };
    }
    if ((m = t.match(/^总和(大|小|单|双)$/) ) || (m = t.match(/^总(大|小|单|双)$/))) {
      return { type: 'sumSide', side: m[1], odds: ODDS.sumSide };
    }
    if ((m = t.match(/^总尾(大|小)$/))) {
      return { type: 'sumTail', side: m[1], odds: ODDS.sumTail };
    }
    if ((m = t.match(/^(?:特码)?([0-4])头$/))) {
      return { type: 'head', head: +m[1], odds: m[1] === '0' ? ODDS.head0 : ODDS.head };
    }
    // 总数项·尾数：七码含该尾；0尾 2 倍，其余 1.8
    if ((m = t.match(/^([0-9])尾$/))) {
      const tail = +m[1];
      return { type: 'weiShu', tail, odds: tail === 0 ? ODDS.weiShu0 : ODDS.weiShu };
    }
    if ((m = t.match(/^([0-9])尾不中$/))) {
      const tail = +m[1];
      return { type: 'weiShuMiss', tail, odds: tail === 0 ? ODDS.weiShuMiss0 : ODDS.weiShuMiss };
    }
    if ((m = t.match(/^平特([0-9])尾$/))) {
      return { type: 'pingTail', tail: +m[1], odds: m[1] === '0' ? ODDS.pingTail0 : ODDS.pingTail };
    }
    if (/^[金木水火土]$/.test(t)) {
      return { type: 'wuxing', el: t, odds: ODDS.wuxing[t] };
    }
    // 总肖项默认按一肖（七码任一肖）；特肖需写 特肖X / 特X
    if ((m = t.match(/^(?:一肖|平特)([鼠牛虎兔龙蛇马羊猴鸡狗猪])$/))) {
      return { type: 'pingZodiac', z: m[1], odds: pingTeOdds(m[1]) };
    }
    if ((m = t.match(/^(?:特肖|特)([鼠牛虎兔龙蛇马羊猴鸡狗猪])$/))) {
      return { type: 'temaZodiac', z: m[1], odds: zodiacOdds(m[1]) };
    }
    if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(t)) {
      return { type: 'pingZodiac', z: t, odds: pingTeOdds(t) };
    }
    if ((m = t.match(/^正肖([鼠牛虎兔龙蛇马羊猴鸡狗猪])$/))) {
      return { type: 'zhengZodiac', z: m[1], odds: m[1] === YEAR_ZODIAC ? 1.62 : 1.88 };
    }
    return null;
  }

  /* ================= 聊天口语下注展开 ================= */
  const ZODIAC_RE = /[鼠牛虎兔龙蛇马羊猴鸡狗猪]/g;
  const YOU_CN = { 2: '二', 3: '三', 4: '四', 5: '五' };
  const YOU_NUM = { 二: 2, 三: 3, 四: 4, 五: 5 };
  const LM_ALIAS = {
    三中三: '三全中', 三全中: '三全中', 三中二: '三中二',
    二中特: '二中特', 二全中: '二全中', 特串: '特串',
  };
  const LM_NEED = { 二全中: 2, 二中特: 2, 特串: 2, 三全中: 3, 三中二: 3 };

  function extractZodiacs(str) {
    const out = [];
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
      if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(s[i])) out.push(s[i]);
    }
    return out;
  }
  function extractNums(str) {
    return String(str || '')
      .replace(/[．.]/g, ',')
      .split(/[,，\s]+/)
      .map(x => parseInt(x, 10))
      .filter(n => n >= 1 && n <= 49);
  }
  function temaLines(nums, amount) {
    const seen = new Set();
    const lines = [];
    nums.forEach(n => {
      if (seen.has(n)) return;
      seen.add(n);
      const play = '特码' + pad(n, 2);
      if (parsePlay(play)) lines.push({ play, amount });
    });
    return lines.length ? lines : null;
  }
  function normalizeChatBetText(text) {
    return String(text || '')
      .trim()
      .replace(/[（(][^）)]*[）)]/g, '') // （二有）等说明
      .replace(/[／]/g, '/')
      .replace(/[．.]/g, ',')
      .replace(/\s+/g, '');
  }
  /** 口语 → [{play, amount}, ...]；失败返回 null */
  function expandChatBetInput(text) {
    const raw0 = String(text || '').trim();
    if (!raw0) return null;
    const t = normalizeChatBetText(raw0);

    // G: 0尾各50 → 特码按尾展号
    let m = t.match(/^([0-9])尾各(\d+)数?$/);
    if (m) {
      const lines = temaLines(numsOfTail(+m[1]), +m[2]);
      if (lines) return lines;
    }

    // F: 平特肖猪600 / 平特猪蛇虎狗/100 / 平特猪蛇虎狗各100
    m = t.match(/^平特肖?([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)(?:各|\/)?(\d+)$/);
    if (m) {
      const zs = extractZodiacs(m[1]);
      const amount = +m[2];
      if (zs.length && amount > 0) {
        return zs.map(z => ({ play: '平特' + z, amount }));
      }
    }

    // H: 复式三四有虎鸡猴猪各5 / 三有四有虎鸡猴猪各5
    {
      let ks = [];
      let zs = [];
      let amount = 0;
      m = t.match(/^复式?((?:[二三四五]有)+)([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)各(\d+)$/);
      if (m) {
        const youRe = /([二三四五])有/g;
        let ym;
        while ((ym = youRe.exec(m[1]))) ks.push(YOU_NUM[ym[1]]);
        zs = extractZodiacs(m[2]);
        amount = +m[3];
      } else {
        m = t.match(/^复式?([二三四五]{2,})有([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)各(\d+)$/);
        if (m) {
          ks = [...m[1]].map(ch => YOU_NUM[ch]).filter(Boolean);
          zs = extractZodiacs(m[2]);
          amount = +m[3];
        }
      }
      if (ks.length && zs.length && amount > 0) {
        const lines = [];
        ks.forEach(k => {
          if (zs.length < k) return;
          const play = '复式' + YOU_CN[k] + '肖中' + zs.join(',');
          if (parsePlay(play)) lines.push({ play, amount });
        });
        if (lines.length) return lines;
      }
    }

    // E: 三有蛇猪猴，狗虎羊各5  |  蛇猪猴三有，狗虎羊三有各5
    m = t.match(/^([二三四五])有(.+)各(\d+)$/);
    if (m) {
      const k = YOU_NUM[m[1]];
      const amount = +m[3];
      const groups = String(m[2]).split(/[,，、;；]/).map(extractZodiacs).filter(g => g.length >= k);
      if (k && groups.length && amount > 0) {
        const cn = YOU_CN[k];
        const lines = groups.map(g => ({ play: '复式' + cn + '肖中' + g.join(','), amount }))
          .filter(l => parsePlay(l.play));
        if (lines.length) return lines;
      }
    }
    // E': 蛇猪猴，狗虎羊三有各5（几有在后）
    m = t.match(/^(.+)([二三四五])有各(\d+)$/);
    if (m) {
      const k = YOU_NUM[m[2]];
      const amount = +m[3];
      const groups = String(m[1]).split(/[,，、;；]/).map(extractZodiacs).filter(g => g.length >= k);
      if (k && groups.length && amount > 0) {
        const cn = YOU_CN[k];
        const lines = groups.map(g => ({ play: '复式' + cn + '肖中' + g.join(','), amount }))
          .filter(l => parsePlay(l.play));
        if (lines.length) return lines;
      }
    }

    // C/D: 猪猴二连50 / 猪猴二有50 / 二有猪猴50 / 牛蛇狗三连50
    m = t.match(/^([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)([二三四五])(?:连|有|肖中)(\d+)$/);
    if (m) {
      const zs = extractZodiacs(m[1]);
      const k = YOU_NUM[m[2]];
      const amount = +m[3];
      if (zs.length >= k && amount > 0) {
        const play = '复式' + YOU_CN[k] + '肖中' + zs.join(',');
        if (parsePlay(play)) return [{ play, amount }];
      }
    }
    m = t.match(/^([二三四五])(?:连|有|肖中)([鼠牛虎兔龙蛇马羊猴鸡狗猪]+)(\d+)$/);
    if (m) {
      const k = YOU_NUM[m[1]];
      const zs = extractZodiacs(m[2]);
      const amount = +m[3];
      if (zs.length >= k && amount > 0) {
        const play = '复式' + YOU_CN[k] + '肖中' + zs.join(',');
        if (parsePlay(play)) return [{ play, amount }];
      }
    }

    // J: 30,49,27,45,32,43复式二中特各5
    m = t.match(/^([\d,，]+)复式?(二中特|二全中|特串|三全中|三中二|三中三)各(\d+)$/);
    if (m) {
      const playName = LM_ALIAS[m[2]] || m[2];
      const nums = extractNums(m[1]);
      const amount = +m[3];
      const need = LM_NEED[playName];
      if (nums.length >= need && amount > 0) {
        const play = '复式' + playName + nums.map(n => pad(n, 2)).join(',');
        if (parsePlay(play)) return [{ play, amount }];
      }
    }

    // I: 11,15,05三中三20
    m = t.match(/^([\d,，]+)(三中三|三全中|三中二|二中特|二全中|特串)(\d+)$/);
    if (m) {
      const playName = LM_ALIAS[m[2]] || m[2];
      const nums = extractNums(m[1]);
      const amount = +m[3];
      const need = LM_NEED[playName];
      if (nums.length >= need && amount > 0) {
        const play = '复式' + playName + nums.map(n => pad(n, 2)).join(',');
        if (parsePlay(play)) return [{ play, amount }];
      }
    }

    // B: 19,31,03,15,37/10 每个号码
    m = t.match(/^([\d,，]+)\/(\d+)$/);
    if (m && !/[鼠牛虎兔龙蛇马羊猴鸡狗猪连有尾平特复式]/.test(m[1])) {
      const nums = extractNums(m[1]);
      const amount = +m[2];
      if (nums.length && amount > 0) {
        const lines = temaLines(nums, amount);
        if (lines) return lines;
      }
    }

    // A: 马牛龙兔鸡各50数 / 马牛龙兔鸡输各50（非生肖字忽略）
    m = t.match(/^([鼠牛虎兔龙蛇马羊猴鸡狗猪\u4e00-\u9fff]*?)各(\d+)数?$/);
    if (m) {
      const zs = extractZodiacs(m[1]);
      const amount = +m[2];
      // 排除已被其它规则覆盖的「平特…各」「尾各」「有…各」
      if (zs.length >= 1 && amount > 0 && !/平特|尾|[二三四五]有|复式/.test(m[1])) {
        const nums = [];
        zs.forEach(z => nums.push(...numsOfZodiac(z)));
        const lines = temaLines(nums, amount);
        if (lines) return lines;
      }
    }

    // 回退：原有单注
    const one = parseBet(raw0);
    if (one) return [one];
    // 再试去空格规范化后的单注
    const one2 = parseBet(t.replace(/(\d+)$/, ' $1'));
    if (one2) return [one2];
    return null;
  }

  function randomDraw() {
    const pool = [];
    for (let i = 1; i <= 49; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const mains = pool.slice(0, 6).sort((a, b) => a - b);
    const special = pool[6];
    return mains.concat([special]);
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    const num = String(n).padStart(2, '0');
    return `<img class="lhc-ball-img${c}" src="./assets/balls/ball_${num}.png" alt="${n}" loading="lazy">`;
  }
  /** 球号 + 生肖（历史表 / 开奖条） */
  function ballZodiacHtml(n, cls) {
    return `<span class="ball-wrap">${ballHtml(n, cls)}<span class="zx">${zodiacOf(n)}</span></span>`;
  }
  /** 特码属性：大小 / 单双 / 波色（不算总和） */
  function temaMeta(nums) {
    const sp = nums[6];
    const size = sp === 49 ? '和' : (sp >= 25 ? '大' : '小');
    const oe = sp === 49 ? '和' : (sp % 2 ? '单' : '双');
    const wave = waveColor(sp);
    return {
      size,
      oe,
      wave,
      zodiac: zodiacOf(sp),
      text: `${size}${oe} ${wave}`,
    };
  }
  function gyMeta(nums) {
    return temaMeta(nums);
  }
  function lhRow(nums) {
    return temaMeta(nums).wave;
  }
  function waveClass(wave) {
    if (wave === '红') return 'is-red';
    if (wave === '蓝') return 'is-blue';
    return 'is-green';
  }
  function renderDrawBar(row) {
    if (!row) return;
    const meta = temaMeta(row.nums);
    const issueShort = String(row.issue).includes('-')
      ? String(row.issue).split('-').pop()
      : String(row.issue).slice(-4);
    $('#barIssue').text(issueShort).attr('title', row.issue);
    $('#barBalls').html(row.nums.map(n => ballZodiacHtml(n, 'xs')).join(''));
    $('#barGy').text(`${meta.size}${meta.oe} ${meta.wave}`);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => {
      const meta = temaMeta(r.nums);
      const balls = r.nums.map(n =>
        `<td class="cell-ball">${ballZodiacHtml(n, 'tbl')}</td>`
      ).join('');
      return `<tr>
        <td class="cell-issue" title="${r.issue}">${r.issue}</td>
        ${balls}
        <td class="cell-size">${meta.size}</td>
        <td class="cell-oe">${meta.oe}</td>
        <td class="cell-wave ${waveClass(meta.wave)}">${meta.wave}</td>
      </tr>`;
    }).join(''));
  }
  function resultCardHtml(nums, issue) {
    if (window.LhcResultCard && typeof LhcResultCard.build === 'function') {
      return LhcResultCard.build(nums, issue);
    }
    const meta = temaMeta(nums);
    return `<div class="lhc-result-card"><div class="lhc-result-card__head"><span class="lhc-result-card__title">幸运六合彩</span></div>
      <div class="lhc-result-card__foot is-show" style="grid-template-columns:1fr 1fr 1fr 1fr">
        <div class="lhc-result-stat"><span class="k">期号</span><span class="v">${String(issue).slice(-7)}</span></div>
        <div class="lhc-result-stat"><span class="k">大小</span><span class="v">${meta.size}</span></div>
        <div class="lhc-result-stat"><span class="k">单双</span><span class="v">${meta.oe}</span></div>
        <div class="lhc-result-stat"><span class="k">波色</span><span class="v">${meta.wave}</span></div>
      </div></div>`;
  }

  function payoutResult(amount, odds, hitLabel) {
    const winAmount = Math.round(amount * odds);
    return { winAmount, profit: winAmount - amount, hit: hitLabel || '' };
  }
  function settleComboGroup(combos, amount, judgeFn) {
    // 复式/拖头：每组一注，金额按单注计（对齐 123.com 拆注）
    let winAmount = 0;
    let stake = 0;
    let hits = 0;
    combos.forEach(c => {
      stake += amount;
      const r = judgeFn(c);
      if (r.tie) { winAmount += amount; return; }
      if (r.win) {
        hits += 1;
        winAmount += Math.round(amount * r.odds);
      }
    });
    return {
      winAmount,
      profit: winAmount - stake,
      hit: hits ? `${hits}组` : '',
    };
  }

  /** 对齐 Getwin.php：返回 { winAmount, profit, hit }；和局退本 */
  function settleBet(play, amount, nums) {
    const p = parsePlay(play);
    if (!p) return { winAmount: 0, profit: -amount, hit: '' };
    const sp = nums[6];
    const mains = nums.slice(0, 6);
    const all = nums.slice();
    const zhengSet = new Set(mains);
    const sxSet = new Set(all.map(zodiacOf));
    const wsSet = new Set(all.map(n => n % 10));
    let win = false;
    let tie = false;
    let odds = p.odds;

    switch (p.type) {
      case 'tema':
        win = sp === p.num;
        break;
      case 'zhengma':
        win = zhengSet.has(p.num);
        break;
      case 'zhengmaTe':
        win = mains[p.pos] === p.num;
        break;
      case 'temaSide':
        if (isTemaTie(sp)) { tie = true; break; }
        win = matchSide(p.side, sideOfTema(sp));
        break;
      case 'temaCombo': {
        if (isTemaTie(sp)) { tie = true; break; }
        const meta = sideOfTema(sp);
        win = !!( {
          大单: meta.big && meta.odd,
          大双: meta.big && !meta.odd,
          小单: !meta.big && meta.odd,
          小双: !meta.big && !meta.odd,
        }[p.combo]);
        break;
      }
      case 'heSide': {
        if (isTemaTie(sp)) { tie = true; break; }
        const hs = digitSum(sp);
        win = matchSide(p.side, { big: hs >= 7, odd: hs % 2 === 1 });
        break;
      }
      case 'weiSide': {
        if (isTemaTie(sp)) { tie = true; break; }
        const w = sp % 10;
        win = p.side === '大' ? w >= 5 : w <= 4;
        break;
      }
      case 'color':
        // 色波：49 仍结算（绿），不和
        win = waveColor(sp) === p.color;
        break;
      case 'sumSide': {
        const s = all.reduce((a, b) => a + b, 0);
        win = matchSide(p.side, { big: s >= 175, odd: s % 2 === 1 });
        break;
      }
      case 'sumTail': {
        const s = all.reduce((a, b) => a + b, 0) % 10;
        win = p.side === '大' ? s >= 5 : s <= 4;
        break;
      }
      case 'head':
        win = Math.floor(sp / 10) === p.head;
        break;
      case 'weiShu':
        // 总数项·尾数：七码任一含该尾
        win = wsSet.has(p.tail);
        break;
      case 'weiShuMiss':
        win = !wsSet.has(p.tail);
        break;
      case 'pingTail':
        win = all.some(n => (n % 10) === p.tail);
        break;
      case 'wuxing':
        win = wuxingOf(sp) === p.el;
        break;
      case 'temaZodiac':
        // 特肖：49 正常比生肖，不和
        win = zodiacOf(sp) === p.z;
        odds = zodiacOdds(p.z);
        break;
      case 'pingZodiac':
        // 一肖：七码任一肖
        win = sxSet.has(p.z);
        odds = pingTeOdds(p.z);
        break;
      case 'zhengZodiac': {
        const hits = mains.filter(n => zodiacOf(n) === p.z).length;
        win = hits > 0;
        if (win) {
          const year = p.z === YEAR_ZODIAC;
          const ladder = year ? [1.62, 2.24, 2.86, 3.48, 4.1] : [1.88, 2.76, 3.64, 4.52];
          odds = ladder[Math.min(hits, ladder.length) - 1];
        }
        break;
      }
      case 'zhengSide': {
        const n = mains[p.pos];
        if (isTemaTie(n)) { tie = true; break; }
        win = matchSide(p.side, sideOfTema(n));
        break;
      }
      case 'zhengCombo': {
        const n = mains[p.pos];
        if (isTemaTie(n)) { tie = true; break; }
        const meta = sideOfTema(n);
        win = !!( {
          大单: meta.big && meta.odd,
          大双: meta.big && !meta.odd,
          小单: !meta.big && meta.odd,
          小双: !meta.big && !meta.odd,
        }[p.combo]);
        break;
      }
      case 'zhengColor':
        win = waveColor(mains[p.pos]) === p.color;
        break;
      case 'lianma': {
        const need = (p.play === '三全中' || p.play === '三中二') ? 3 : 2;
        // 提交已拆成单注时 nums.length===need；聊天整串复式/拖头仍按 mode 展开
        const combos = expandByMode(p.mode || '复式', p.nums, need);
        return settleComboGroup(combos, amount, (balls) => {
          const hitZ = balls.filter(n => zhengSet.has(n)).length;
          const hitT = balls.filter(n => n === sp).length;
          if (p.play === '三全中') return { win: hitZ > 2, odds: ODDS.sanQuanZhong };
          if (p.play === '三中二') {
            if (hitZ === 3) return { win: true, odds: ODDS.sanZhongSan };
            if (hitZ === 2) return { win: true, odds: ODDS.sanZhongEr };
            return { win: false, odds: 0 };
          }
          if (p.play === '二全中') return { win: hitZ > 1, odds: ODDS.erQuanZhong };
          if (p.play === '二中特') {
            if (hitZ > 0 && hitT > 0) return { win: true, odds: ODDS.erZhongTeTe };
            if (hitZ > 1 && hitT === 0) return { win: true, odds: ODDS.erZhongTe };
            return { win: false, odds: 0 };
          }
          if (p.play === '特串') return { win: hitZ > 0 && hitT === 1, odds: ODDS.teChuan };
          return { win: false, odds: 0 };
        });
      }
      case 'sxLian': {
        const combos = expandByMode(p.mode || '复式', p.zodiacs, p.n);
        return settleComboGroup(combos, amount, (zs) => {
          const hit = zs.filter(z => sxSet.has(z)).length;
          if (p.hit) return { win: hit >= zs.length, odds: p.odds };
          return { win: hit === 0, odds: p.odds };
        });
      }
      case 'wsLian': {
        const combos = expandByMode(p.mode || '复式', p.tails, p.n);
        return settleComboGroup(combos, amount, (ts) => {
          const hit = ts.filter(x => wsSet.has(x)).length;
          if (p.hit) return { win: hit >= ts.length, odds: p.odds };
          return { win: hit === 0, odds: p.odds };
        });
      }
      case 'liuxiao': {
        // 六肖：跟特码生肖；49 和局（Getwin）；整组 1 注不拆
        if (isTemaTie(sp)) { tie = true; break; }
        const zx = zodiacOf(sp);
        win = p.hit ? p.zodiacs.includes(zx) : !p.zodiacs.includes(zx);
        break;
      }
      case 'buZhong': {
        // 多组提交已拆成每组 n 个；整串复式仍 C(n,k)
        const combos = (p.mode === '多组' && p.nums.length === p.n)
          ? [p.nums.slice()]
          : expandFushi([...new Set(p.nums)].sort((a, b) => a - b), p.n);
        return settleComboGroup(combos, amount, (balls) => {
          const hit = balls.filter(n => all.includes(n)).length;
          return { win: hit === 0, odds: p.odds };
        });
      }
      default:
        win = false;
    }

    if (tie) return { winAmount: amount, profit: 0, hit: '和' };
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    return payoutResult(amount, odds, play);
  }
  const HISTORY_SHOW = 10;

  function settleIssue(issue, nums) {
    const book = issueBetBook[issue];
    if (!book) return {};
    const out = {};
    Object.keys(book).forEach(name => {
      out[name] = book[name].map(b => {
        const r = settleBet(b.play, b.amount, nums);
        return { play: b.play, amount: b.amount, ...r };
      });
    });
    return out;
  }

  function buildWinListVerifyText(issue, settled) {
    const winners = Object.keys(settled).filter(name => {
      const totalWin = settled[name].reduce((s, r) => s + r.winAmount, 0);
      return totalWin > 0;
    });
    if (!winners.length) {
      return `${issue}期\n中奖列表核对\n——————————\n本期暂无中奖`;
    }
    const blocks = winners.map(name => {
      const rows = settled[name];
      const totalWin = rows.reduce((s, r) => s + r.winAmount, 0);
      const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
      const hits = rows.filter(r => r.hit).map(r => r.hit);
      const line1 = `${name}  中奖金额：+${totalWin}`;
      const line2 = hits.join('、');
      const line3 = `输赢：${fmtProfit(totalProfit)}`;
      return `${line1}\n${line2}\n${line3}`;
    });
    return `${issue}期\n中奖列表核对\n——————————\n${blocks.join('\n\n')}`;
  }

  function applyUserSettle(issue, settled) {
    const rows = settled[user.name];
    if (!rows) return;
    let profit = 0;
    let turnover = 0;
    rows.forEach(r => {
      profit += r.profit;
      turnover += r.amount;
      if (r.winAmount > 0) {
        App.setBalance(user.uid, App.getBalance(user.uid) + r.winAmount);
      }
    });
    const stats = getStats(user.uid);
    stats.winloss += profit;
    stats.turnover += turnover;
    stats.rebate = (stats.rebate || 0) + Math.floor(turnover * 0.005);
    saveStats(user.uid, stats);
    refreshStats();
  }

  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function dateKey() {
    const d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
  }
  /** 官方期号：20260716-0585 */
  function fmtIssue8(seq) {
    return dateKey() + '-' + pad(Math.max(1, seq) % 10000, 4);
  }
  function fmtTime(d) {
    return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
  }
  function fmtMmss(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
  }

  function setCountdownProgress(pct) {
    document.documentElement.style.setProperty('--cd-pct', String(Math.max(0, Math.min(1, pct))));
  }

  function updateCountdownUI(r) {
    const $box = $('#countdownBox').removeClass('is-freeze is-drawing is-preparing');
    if (r <= PREP_SEC) {
      $box.addClass('is-preparing is-drawing');
      $('#cdLabel').text('准备中');
      $('#cdTime').text('···');
      setCountdownProgress(Math.max(0, r) / PREP_SEC);
      return;
    }
    $('#cdLabel').text('倒计时');
    $('#cdTime').text(fmtMmss(r - PREP_SEC));
    setCountdownProgress((r - PREP_SEC) / BET_SEC);
  }


  function getStats(uid) {
    const key = 'lhc_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('lhc_stats_' + uid, JSON.stringify(s));
  }
  function refreshStats() {
    const bal = App.getBalance(user.uid);
    const s = getStats(user.uid);
    $('#statBalance').text(bal.toLocaleString('en-US'));
    $('#statTurnover').text(Math.round(s.turnover).toLocaleString('en-US'));
    const $wl = $('#statWinloss').text((s.winloss >= 0 ? '+' : '') + Math.round(s.winloss).toLocaleString('en-US'));
    $wl.toggleClass('is-plus', s.winloss > 0).toggleClass('is-minus', s.winloss < 0);
    $('#statRebate').text(Math.round(s.rebate).toLocaleString('en-US'));
  }
  function hasLastDraw() {
    if (!lastDraw) return false;
    return Array.isArray(lastDraw) ? lastDraw.length > 0 : lastDraw.bv !== undefined;
  }
  function buildHistory(count) {
    const rows = [];
    const base = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
    for (let i = 0; i < count; i++) {
      const nums = i === 0 && hasLastDraw() ? lastDraw : randomDraw();
      const meta = gyMeta(nums);
      const row = {
        issue: fmtIssue8(base - i),
        nums,
        gy: meta.text,
        lh: lhRow(nums)
      };
      if (nums && nums.bv !== undefined) row.meta = nums;
      rows.push(row);
    }
    return rows;
  }
  function scrollChat() {
    const el = document.getElementById('chatFeed');
    if (el) el.scrollTop = el.scrollHeight;
  }
  function appendMsg(opts) {
    const time = opts.time || fmtTime(new Date());
    const isSelf = opts.self;
    const isRobot = opts.robot;
    const avatar = `<div class="lhc-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="lhc-msg__meta">
            <span class="lhc-msg__name">${opts.name}</span>
            <span class="lhc-msg__time">${time}</span>
          </div>`;
    const bubble = `<div class="lhc-msg__bubble">${opts.html}</div>`;
    const html = isSelf
      ? `<div class="lhc-msg is-self">
        <div class="lhc-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="lhc-msg${isRobot ? ' is-robot' : ''}">
        ${avatar}
        <div class="lhc-msg__body">
          ${meta}
          ${bubble}
        </div>
      </div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }

  function pushRobotClose(issue) {
    appendMsg({
      name: ROBOT.name,
      avatar: ROBOT.avatar,
      robot: true,
      html: '<div class="lhc-msg__bubble--line">======封盘线======<br>=====停止战斗=====</div>'
    });
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="lhc-msg__bubble--list"><pre>${buildBetListVerifyText(issue)}</pre></div>`
      });
    }, 500);
  }

  function pushRobotResult(nums, issue) {
    const settled = settleIssue(issue, nums);
    applyUserSettle(issue, settled);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: resultCardHtml(nums, issue)
      });
      const cards = document.querySelectorAll('#chatFeed .lhc-result-card');
      const cardEl = cards[cards.length - 1];
      if (window.LhcResultCard && LhcResultCard.bindReveal && cardEl) {
        LhcResultCard.bindReveal(cardEl, nums, () => {
          appendMsg({
            name: ROBOT.name,
            avatar: ROBOT.avatar,
            robot: true,
            html: `<div class="lhc-msg__bubble--list"><pre>${buildWinListVerifyText(issue, settled)}</pre></div>`
          });
        });
      } else {
        setTimeout(() => {
          appendMsg({
            name: ROBOT.name,
            avatar: ROBOT.avatar,
            robot: true,
            html: `<div class="lhc-msg__bubble--list"><pre>${buildWinListVerifyText(issue, settled)}</pre></div>`
          });
        }, 1500);
      }
    }, 800);
  }

  function buildBetListText() {
    return buildBetListVerifyText(getCurrentIssue());
  }

  function seedChat() {
    const names = App.NAME_PREFIX || ['幸运'];
    const suffix = App.NAME_SUFFIX || ['玩家'];
    MOCK_NAMES.length = 0;
    for (let i = 0; i < 8; i++) {
      const name = names[i % names.length] + suffix[i % suffix.length];
      const num = pad(1 + (i % 162), 3);
      const ext = [22, 78, 86].includes(1 + (i % 162)) ? 'png' : 'jpg';
      const avatar = `/legacy/images/avatars/${num}.${ext}`;
      const betText = `${PLAY_ITEMS[i % PLAY_ITEMS.length]} ${[20, 50, 100][i % 3]}`;
      MOCK_NAMES.push({ name, avatar });
      appendMsg({ name, avatar, html: betText });
      recordBet(name, betText);
    }
    const myBet = PLAY_ITEMS[0] + ' 100';
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: myBet
    });
    recordBet(user.name, myBet);
  }

  function initKeypad() {
    const left = ['大', '小', '单', '双'];
    const right = ['删除', '100', '200', '500'];
    const mid = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['平特', '0', '/']
    ];
    let html = '';
    for (let r = 0; r < 4; r++) {
      html += `<button type="button" class="lhc-key lhc-key--side" data-key="${left[r]}">${left[r]}</button>`;
      mid[r].forEach(k => {
        html += `<button type="button" class="lhc-key" data-key="${k}">${k}</button>`;
      });
      const rk = right[r];
      const cls = rk === '删除' ? ' lhc-key--del' : ' lhc-key--side';
      html += `<button type="button" class="lhc-key${cls}" data-key="${rk}">${rk}</button>`;
    }
    html += `<button type="button" class="lhc-key lhc-key--side" data-key="各">各</button>`;
    html += `<button type="button" class="lhc-key lhc-key--side" data-key="有">有</button>`;
    html += `<button type="button" class="lhc-key lhc-key--side" data-key="连">连</button>`;
    html += `<button type="button" class="lhc-key lhc-key--side" data-key="尾">尾</button>`;
    html += `<button type="button" class="lhc-key" data-key="空格">空格</button>`;
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.lhc-room');
    if (show) {
      $('#keypad').prop('hidden', false);
      $room.addClass('has-keypad');
    } else {
      $('#keypad').prop('hidden', true);
      $room.removeClass('has-keypad');
    }
  }

  function insertInput(text) {
    const $in = $('#chatInput');
    const v = $in.val();
    if (text === '删除') {
      $in.val(v.slice(0, -1));
    } else if (text === '空格') {
      $in.val(v + ' ');
    } else {
      $in.val(v + text);
    }
    updateComposerAction();
  }

  function updateComposerAction() {
    const hasText = !!$('#chatInput').val().trim();
    const $btn = $('#plusBtn');
    const $img = $('#plusBtnImg');
    if (hasText) {
      $btn.addClass('is-send').attr('aria-label', '发送');
      if ($img.length) $img.attr('src', '/images/chat-rail/send.png?v=1');
    } else {
      $btn.removeClass('is-send').attr('aria-label', '更多');
      if ($img.length) $img.attr('src', '/images/chat-rail/plus.png?v=1');
    }
  }

  function sendBetMessage() {
    const text = $('#chatInput').val().trim();
    if (!text) return;
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    const expanded = expandChatBetInput(text);
    if (!expanded || !expanded.length) {
      App.toast('格式示例：特码大 100 · 马牛各50 · 猪猴二有50 · 平特猪蛇/100 · 0尾各50 · 11,15,05三中三20');
      return;
    }
    const bal = App.getBalance(user.uid);
    const totalAmt = expanded.reduce((s, b) => s + b.amount, 0);
    if (totalAmt > bal) { App.toast('余额不足'); return; }
    App.setBalance(user.uid, bal - totalAmt);
    refreshStats();
    const lines = [];
    expanded.forEach(b => {
      const line = b.play + ' ' + b.amount;
      if (recordBet(user.name, line)) lines.push(line);
    });
    if (!lines.length) {
      App.setBalance(user.uid, App.getBalance(user.uid) + totalAmt);
      refreshStats();
      App.toast('下注失败，请检查玩法');
      return;
    }
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: (lines.length > 1
        ? lines.join('<br>') + `<br><span class="lhc-msg__bet-sum">共${lines.length}注·合计${totalAmt}</span>`
        : lines[0]),
    });
    rememberBetLines(lines);
    if (lines.length > 1) App.toast(`投注成功 · 共${lines.length}注·合计${totalAmt}`);
    $('#chatInput').val('');
    updateComposerAction();
  }

  function rememberBetLines(lines) {
    const arr = (lines || []).filter(Boolean);
    lastBetLines = arr.slice();
    lastBetText = arr.length ? arr[arr.length - 1] : '';
  }

  /** 重复上一笔投注（整批注单） */
  function repeatLastBets() {
    if (!lastBetLines.length) {
      App.toast('暂无上笔投注可重复');
      return;
    }
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    let totalAmt = 0;
    lastBetLines.forEach((line) => {
      const b = parseBet(line);
      if (b) totalAmt += b.amount;
    });
    if (!(totalAmt > 0)) {
      App.toast('重复投注失败');
      return;
    }
    const bal = App.getBalance(user.uid);
    if (totalAmt > bal) { App.toast('余额不足'); return; }
    App.setBalance(user.uid, bal - totalAmt);
    refreshStats();
    const ok = [];
    lastBetLines.forEach((line) => {
      if (recordBet(user.name, line)) ok.push(line);
    });
    if (!ok.length) {
      App.setBalance(user.uid, App.getBalance(user.uid) + totalAmt);
      refreshStats();
      App.toast('重复投注失败');
      return;
    }
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: ok.join('<br>') + (ok.length > 1
        ? `<br><span class="lhc-msg__bet-sum">重复 · 共${ok.length}注·合计${totalAmt}</span>`
        : ''),
    });
    rememberBetLines(ok);
    App.toast(`已重复 · 共${ok.length}注·合计${totalAmt}`);
  }

  function toggleDrawPanel() {
    drawPanelOpen = !drawPanelOpen;
    $('#drawBar').toggleClass('is-open', drawPanelOpen);
    $('#drawToggle').attr('aria-expanded', drawPanelOpen);
  }

  function pushRandomBet() {
    if (!MOCK_NAMES.length || !isBettingOpen()) return;
    const n = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    const betText = `${PLAY_ITEMS[Math.floor(Math.random() * PLAY_ITEMS.length)]} ${[10, 20, 50, 100, 200][Math.floor(Math.random() * 5)]}`;
    appendMsg({ name: n.name, avatar: n.avatar, html: betText });
    recordBet(n.name, betText);
  }

  function openPlusMenu(open) {
    const $room = $('.lhc-room');
    if (open) {
      $('#menuMask').prop('hidden', false);
      $('#plusMenu').prop('hidden', false).addClass('is-open');
      $room.addClass('has-menu');
    } else {
      $('#plusMenu').removeClass('is-open');
      $('#menuMask').prop('hidden', true);
      setTimeout(() => { if (!$('#plusMenu').hasClass('is-open')) $('#plusMenu').prop('hidden', true); }, 280);
      $room.removeClass('has-menu');
    }
  }

  /** 玩法面板顶边对齐历史开奖栏下沿，盖住聊天区、露出倒计时 */
  function layoutPlayOverlay() {
    const bar = document.getElementById('drawBar');
    let top = 210;
    if (bar) {
      const rect = bar.getBoundingClientRect();
      top = Math.max(120, Math.ceil(rect.bottom + 4));
    }
    document.documentElement.style.setProperty('--lhc-play-top', top + 'px');
  }
  function openPlaySheet(open) {
    const $room = $('.lhc-room');
    if (open) {
      // 收起历史展开，保证顶边贴在开奖栏主行下方
      if (drawPanelOpen) {
        drawPanelOpen = false;
        $('#drawBar').removeClass('is-open');
        $('#drawToggle').attr('aria-expanded', false);
      }
      layoutPlayOverlay();
      $('#playMask').prop('hidden', false);
      $('#playSheet').prop('hidden', false).addClass('is-open');
      $room.addClass('has-play');
      renderPlayPanel(false);
      updatePlaySelected();
    } else {
      $('#playSheet').removeClass('is-open');
      $('#playMask').prop('hidden', true);
      setTimeout(() => { if (!$('#playSheet').hasClass('is-open')) $('#playSheet').prop('hidden', true); }, 300);
      $room.removeClass('has-play');
    }
  }
  $(window).on('resize orientationchange', () => {
    if ($('#playSheet').hasClass('is-open')) layoutPlayOverlay();
  });

  // ===== 初始化 =====
  lastDraw = randomDraw();
  lastIssueSeq = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
  historyRows = buildHistory(60);
  historyRows[0].nums = lastDraw.slice();
  historyRows[0].gy = gyMeta(lastDraw).text;
  historyRows[0].lh = lhRow(lastDraw);

  refreshStats();
  renderDrawBar(historyRows[0]);
  renderDrawTable();
  $('#curIssue').text(fmtIssue8(lastIssueSeq + 1));
  updateCountdownUI(INTERVAL - ((Date.now() - todayStartMs()) / 1000 % INTERVAL));
  /* 左侧玩法分类（右侧具体选项后续按分类补） */
  const PLAY_CATEGORIES = [
    { id: 'tema', title: '特码', hint: `点选号码 · 赔率 ${ODDS.tema}`, mode: 'balls', prefix: '特码', odds: ODDS.tema },
    { id: 'zhengma', title: '正码', hint: `点选号码 · 赔率 ${ODDS.zhengma}`, mode: 'balls', prefix: '正码', odds: ODDS.zhengma },
    {
      id: 'temaSide',
      title: '特码两面',
      hint: `两面 ${ODDS.side} · 组合 ${ODDS.comboSide}`,
      items: [
        { label: '大', play: '特码大' },
        { label: '小', play: '特码小' },
        { label: '单', play: '特码单' },
        { label: '双', play: '特码双' },
        { label: '大单', play: '特大单' },
        { label: '大双', play: '特大双' },
        { label: '小单', play: '特小单' },
        { label: '小双', play: '特小双' },
        { label: '合大', play: '合大' },
        { label: '合小', play: '合小' },
        { label: '合单', play: '合单' },
        { label: '合双', play: '合双' },
        { label: '尾大', play: '尾大' },
        { label: '尾小', play: '尾小' },
      ],
    },
    { id: 'lianma', title: '连码', hint: '先选副玩法，再选连码玩法', mode: 'lianma' },
    {
      id: 'zongxiao',
      title: '总肖项',
      hint: `一肖（七码任一）· 赔率 ${ODDS.pingTe}`,
      items: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'].map(z => ({
        label: z,
        play: '一肖' + z,
      })),
    },
    { id: 'zongshu', title: '总数项', hint: `尾数/尾数不中 · 0尾 ${ODDS.weiShu0} · 其余 ${ODDS.weiShu}`, mode: 'zongshu' },
    {
      id: 'shengxiaolian',
      title: '生肖连',
      hint: `二肖 ${ODDS.sxLianZhong[2]} · 三肖 ${ODDS.sxLianZhong[3]} · 四肖 ${ODDS.sxLianZhong[4]} · 五肖 ${ODDS.sxLianZhong[5]}`,
      mode: 'shengxiaolian',
    },
    {
      id: 'weishulian',
      title: '尾数连',
      hint: `二尾 ${ODDS.wsLianZhong[2]} · 三尾 ${ODDS.wsLianZhong[3]} · 四尾 ${ODDS.wsLianZhong[4]}`,
      mode: 'weishulian',
    },
    { id: 'liuxiao', title: '六肖', hint: `中奖 / 不中 · 赔率 ${ODDS.liuxiao}`, mode: 'liuxiao' },
    {
      id: 'duoxuan',
      title: '多选不中',
      hint: `五 ${ODDS.buZhong[5]} · 六 ${ODDS.buZhong[6]} · 七 ${ODDS.buZhong[7]} · 八 ${ODDS.buZhong[8]} · 九 ${ODDS.buZhong[9]} · 十 ${ODDS.buZhong[10]} · 十一 ${ODDS.buZhong[11]} · 十二 ${ODDS.buZhong[12]}`,
      mode: 'duoxuan',
    },
  ];
  /**
   * 特码/正码快捷 · 6 列优化排布（同色上下对齐，便于扫读）
   * 1 红蓝绿·单双  2 红蓝绿·大小  3 大小单双+家野
   * 4 合大小/合单双/尾  5–6 十二生肖
   */
  const BALL_QUICK = [
    { key: '红单', cls: 'is-red' }, { key: '红双', cls: 'is-red' },
    { key: '蓝单', cls: 'is-blue' }, { key: '蓝双', cls: 'is-blue' },
    { key: '绿单', cls: 'is-green' }, { key: '绿双', cls: 'is-green' },

    { key: '红大', cls: 'is-red' }, { key: '红小', cls: 'is-red' },
    { key: '蓝大', cls: 'is-blue' }, { key: '蓝小', cls: 'is-blue' },
    { key: '绿大', cls: 'is-green' }, { key: '绿小', cls: 'is-green' },

    { key: '大', cls: '' }, { key: '小', cls: '' },
    { key: '单', cls: '' }, { key: '双', cls: '' },
    { key: '家禽', cls: 'is-zoo' }, { key: '野兽', cls: 'is-zoo' },

    { key: '合大', cls: '' }, { key: '合小', cls: '' },
    { key: '合单', cls: '' }, { key: '合双', cls: '' },
    { key: '尾大', cls: '' }, { key: '尾小', cls: '' },

    { key: '鼠', cls: 'is-zx' }, { key: '牛', cls: 'is-zx' }, { key: '虎', cls: 'is-zx' },
    { key: '兔', cls: 'is-zx' }, { key: '龙', cls: 'is-zx' }, { key: '蛇', cls: 'is-zx' },
    { key: '马', cls: 'is-zx' }, { key: '羊', cls: 'is-zx' }, { key: '猴', cls: 'is-zx' },
    { key: '鸡', cls: 'is-zx' }, { key: '狗', cls: 'is-zx' }, { key: '猪', cls: 'is-zx' },
  ];
  const POULTRY_ZODIAC = new Set(['牛', '马', '羊', '鸡', '狗', '猪']);
  const BEAST_ZODIAC = new Set(['鼠', '虎', '兔', '龙', '蛇', '猴']);
  const LIANMA_MODES = ['复式', '拖头', '生肖对碰', '尾数对碰', '生尾对碰', '任意对碰'];
  const LIANMA_PLAYS = ['二全中', '二中特', '特串', '三全中', '三中二'];
  /** 对碰类仅二码玩法 */
  const LIANMA_PLAYS_ER = ['二全中', '二中特', '特串'];
  const LIANMA_DUIPENG_MODES = new Set(['生肖对碰', '尾数对碰', '生尾对碰', '任意对碰']);
  const LIANMA_ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const ZONGSHU_SUBS = ['尾数', '尾数不中'];
  const SXL_MODES = ['复式', '拖头'];
  const SXL_PLAYS = ['二肖中', '三肖中', '四肖中', '五肖中', '二肖不中', '三肖不中', '四肖不中', '五肖不中'];
  const WSL_MODES = ['复式', '拖头'];
  const WSL_PLAYS = ['二尾中', '三尾中', '四尾中', '二尾不中', '三尾不中', '四尾不中'];
  const LIUXIAO_SUBS = ['中奖', '不中'];
  const DXBZ_MODES = ['复式', '多组'];
  const DXBZ_PLAYS = ['五不中', '六不中', '七不中', '八不中', '九不中', '十不中', '十一不中', '十二不中'];
  const AMOUNT_CHIPS = [10, 20, 50, 100, 200, 500];
  const COMBO_MODES = new Set(['lianma', 'shengxiaolian', 'weishulian', 'liuxiao', 'duoxuan']);
  let playCatIdx = 0;
  let playSelectedList = [];
  /** 特码快捷多选：可同时激活多个，号码取并集 */
  const ballQuickKeys = new Set();
  /** 各玩法分类独立暂存，切换特码/正码等不互相清空 */
  const playCatState = Object.create(null);
  let lianmaModeIdx = 0;
  let lianmaPlayIdx = 0;
  let lianmaPicked = [];
  let lianmaPickedA = [];
  let lianmaPickedB = [];
  let lianmaPengSide = 'A';
  let zongshuSubIdx = 0;
  let sxlModeIdx = 0;
  let sxlPlayIdx = 0;
  let sxlPicked = [];
  let wslModeIdx = 0;
  let wslPlayIdx = 0;
  let wslPicked = [];
  let liuxiaoSubIdx = 0;
  let liuxiaoPicked = [];
  let dxbzModeIdx = 0;
  let dxbzPlayIdx = 0;
  let dxbzPicked = [];
  let dxbzGroups = [];

  function playOddsLabel(play) {
    const p = parsePlay(play);
    return p ? String(p.odds) : '';
  }
  function currentPlayCat() {
    return PLAY_CATEGORIES[playCatIdx] || PLAY_CATEGORIES[0];
  }
  function isComboPlayMode(mode) {
    return COMBO_MODES.has(mode);
  }
  function togglePlaySelect(play) {
    if (!play || !parsePlay(play)) return;
    const idx = playSelectedList.indexOf(play);
    if (idx >= 0) playSelectedList.splice(idx, 1);
    else playSelectedList.push(play);
  }
  function isPlaySelected(play) {
    return playSelectedList.indexOf(play) >= 0;
  }
  function clearComboPicks() {
    lianmaPicked = [];
    lianmaPickedA = [];
    lianmaPickedB = [];
    lianmaPengSide = 'A';
    sxlPicked = [];
    wslPicked = [];
    liuxiaoPicked = [];
    dxbzPicked = [];
    dxbzGroups = [];
  }
  function clearComboPicksForMode(mode) {
    if (mode === 'lianma') {
      lianmaPicked = [];
      lianmaPickedA = [];
      lianmaPickedB = [];
      lianmaPengSide = 'A';
    } else if (mode === 'shengxiaolian') {
      sxlPicked = [];
    } else if (mode === 'weishulian') {
      wslPicked = [];
    } else if (mode === 'liuxiao') {
      liuxiaoPicked = [];
    } else if (mode === 'duoxuan') {
      dxbzPicked = [];
      dxbzGroups = [];
    }
  }
  function saveCurrentPlayCatState() {
    const cat = currentPlayCat();
    playCatState[cat.id] = {
      list: playSelectedList.slice(),
      quick: [...ballQuickKeys],
    };
  }
  function loadPlayCatState(catId) {
    const s = playCatState[catId];
    playSelectedList = s ? s.list.slice() : [];
    ballQuickKeys.clear();
    if (s && s.quick) s.quick.forEach((k) => ballQuickKeys.add(k));
  }
  /** 清空：所有分类已选一并清掉（特码/正码/连码等暂存全清） */
  function clearPlaySelection() {
    playSelectedList = [];
    ballQuickKeys.clear();
    clearComboPicks();
    Object.keys(playCatState).forEach((k) => { delete playCatState[k]; });
    renderPlayPanel(false);
    updatePlaySelected();
    App.toast('已清空全部选择');
  }
  /** 与连码一致的副玩法/玩法栏（蓝胶囊 + 金方块） */
  function buildLmBar(opts) {
    const modes = opts.modes || [];
    const plays = opts.plays || [];
    const modeIdx = opts.modeIdx | 0;
    const playIdx = opts.playIdx | 0;
    const modeRow = opts.modeRow || 'mode';
    const playRow = opts.playRow || 'play';
    const modeCols = opts.modeCols || Math.min(modes.length || 1, 3);
    const playCols = opts.playCols || Math.min(plays.length || 1, 4);
    let html = '<div class="lhc-lm-bar">';
    if (modes.length) {
      const modeHtml = modes.map((m, i) =>
        `<button type="button" class="lhc-lm-mode${i === modeIdx ? ' is-active' : ''}" data-row="${modeRow}" data-idx="${i}">${m}</button>`
      ).join('');
      html += `<div class="lhc-lm-row">
        <span class="lhc-lm-row__lab is-mode">副玩法</span>
        <div class="lhc-lm-modes is-n${modeCols}">${modeHtml}</div>
      </div>`;
    }
    if (plays.length) {
      const playHtml = plays.map((p, i) => {
        const dataIdx = typeof opts.playDataIdx === 'function' ? opts.playDataIdx(p, i) : i;
        const active = typeof opts.isPlayActive === 'function' ? opts.isPlayActive(p, i) : (i === playIdx);
        return `<button type="button" class="lhc-lm-play${active ? ' is-active' : ''}" data-row="${playRow}" data-idx="${dataIdx}">${p}</button>`;
      }).join('');
      html += `<div class="lhc-lm-row">
        <span class="lhc-lm-row__lab is-play">玩法</span>
        <div class="lhc-lm-plays is-n${playCols}">${playHtml}</div>
      </div>`;
    }
    if (opts.extraHtml) html += opts.extraHtml;
    html += '</div>';
    return html;
  }
  function setPlaySubBar(html) {
    $('#playSub').prop('hidden', false).removeClass('is-stack is-ball-quick').addClass('is-lianma-sub').html(html);
  }
  function fmtPickNum(v) {
    return /^\d+$/.test(String(v)) ? pad(+v, 2) : String(v);
  }
  function pickRoleClass(picked, idx, mode, k) {
    if (mode !== '拖头' || idx < 0) return picked ? ' is-active' : '';
    if (!picked) return '';
    const danN = k - 1;
    return idx < danN ? ' is-active is-dan' : ' is-active is-tuo';
  }
  function setPlaySelectedText(main, betCount) {
    const amt = unitAmount();
    const sum = betCount > 0 ? ` · ${fmtBetSummary(betCount, amt)}` : '';
    $('#playSelected').text(`${main}${sum}`);
  }

  /** 当前面板可拆注数（用于底部合计预览） */
  function previewComboBetCount() {
    const cat = currentPlayCat();
    if (cat.mode === 'lianma') return expandLianmaCombos().length;
    if (cat.mode === 'shengxiaolian') {
      const k = sxlMinPick();
      return expandByMode(sxlMode(), sxlPicked, k).length;
    }
    if (cat.mode === 'weishulian') {
      const k = wslMinPick();
      return expandByMode(wslMode(), wslPicked.map(Number), k).length;
    }
    if (cat.mode === 'liuxiao') return liuxiaoPicked.length === 6 ? 1 : 0;
    if (cat.mode === 'duoxuan') {
      if (dxbzMode() === '多组') return dxbzGroups.length;
      return expandFushi(dxbzPicked.map(Number), dxbzMinPick()).length;
    }
    return playSelectedList.length;
  }

  function expandLianmaCombos() {
    const mode = lianmaMode();
    const play = lianmaPlay();
    const need = lianmaMinPick();
    const isEr = need === 2;
    if (mode === '复式' || mode === '拖头') {
      const nums = lianmaPicked.map(Number).filter(n => n >= 1 && n <= 49);
      return expandByMode(mode, nums, need);
    }
    if (!isEr) return [];
    if (mode === '生肖对碰') {
      const zs = lianmaPicked.filter(v => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(v));
      if (zs.length !== 2) return [];
      return expandDuipengPairs(numsOfZodiac(zs[0]), numsOfZodiac(zs[1]));
    }
    if (mode === '尾数对碰') {
      const ts = lianmaPicked.filter(v => /^\d$/.test(v));
      if (ts.length !== 2) return [];
      return expandDuipengPairs(numsOfTail(ts[0]), numsOfTail(ts[1]));
    }
    if (mode === '生尾对碰') {
      const zs = lianmaPicked.filter(v => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(v));
      const ts = lianmaPicked.filter(v => /^\d$/.test(v));
      if (!zs.length || !ts.length) return [];
      const setA = zs.flatMap(numsOfZodiac);
      const setB = ts.flatMap(numsOfTail);
      return expandDuipengPairs(setA, setB);
    }
    if (mode === '任意对碰') {
      if (!lianmaPickedA.length || !lianmaPickedB.length) return [];
      return expandDuipengPairs(lianmaPickedA.map(Number), lianmaPickedB.map(Number));
    }
    return [];
  }

  function updatePlaySelected() {
    const cat = currentPlayCat();
    const mode = cat.mode;
    const amt = unitAmount();
    if (mode === 'lianma') {
      const lmMode = lianmaMode();
      const min = lianmaMinPick();
      const betCount = expandLianmaCombos().length;
      if (lmMode === '任意对碰') {
        const main = `A[${lianmaPickedA.map(fmtPickNum).join(',') || '—'}]#B[${lianmaPickedB.map(fmtPickNum).join(',') || '—'}]`;
        setPlaySelectedText(`${lmMode}·${lianmaPlay()} · ${main}`, betCount);
        return;
      }
      if (!lianmaPicked.length) {
        setPlaySelectedText(`已选 0/${min}`, 0);
      } else {
        const picks = lianmaPicked.map(fmtPickNum).join(',');
        const danHint = lmMode === '拖头' ? `（前${min - 1}胆）` : '';
        setPlaySelectedText(`${lmMode}·${lianmaPlay()}${danHint} · ${picks}`, betCount);
      }
      return;
    }
    if (mode === 'shengxiaolian') {
      const k = sxlMinPick();
      const betCount = expandByMode(sxlMode(), sxlPicked, k).length;
      if (!sxlPicked.length) setPlaySelectedText(`已选 0/${k}`, 0);
      else {
        const danHint = sxlMode() === '拖头' ? `（前${k - 1}胆）` : '';
        setPlaySelectedText(`${sxlMode()}·${sxlPlay()}${danHint} · ${sxlPicked.join(',')}`, betCount);
      }
      return;
    }
    if (mode === 'weishulian') {
      const k = wslMinPick();
      const betCount = expandByMode(wslMode(), wslPicked.map(Number), k).length;
      if (!wslPicked.length) setPlaySelectedText(`已选 0/${k}`, 0);
      else {
        const picks = wslPicked.map(t => `${t}尾`).join(',');
        const danHint = wslMode() === '拖头' ? `（前${k - 1}胆）` : '';
        setPlaySelectedText(`${wslMode()}·${wslPlay()}${danHint} · ${picks}`, betCount);
      }
      return;
    }
    if (mode === 'liuxiao') {
      const sub = LIUXIAO_SUBS[liuxiaoSubIdx] || LIUXIAO_SUBS[0];
      const tag = sub === '不中' ? '六肖不中' : '六肖中';
      const ok = liuxiaoPicked.length === 6;
      if (!ok) setPlaySelectedText(`已选 ${liuxiaoPicked.length}/6`, 0);
      else setPlaySelectedText(`${tag} · ${liuxiaoPicked.join(',')}`, 1);
      return;
    }
    if (mode === 'duoxuan') {
      const k = dxbzMinPick();
      if (dxbzMode() === '多组') {
        const cur = dxbzPicked.map(n => pad(+n, 2)).join(',');
        const betCount = dxbzGroups.length;
        setPlaySelectedText(`已封${betCount}组 · 当前[${cur || '—'}] ${dxbzPicked.length}/${k}`, betCount);
      } else {
        const betCount = expandFushi(dxbzPicked.map(Number), k).length;
        if (!dxbzPicked.length) setPlaySelectedText(`已选 0/${k}`, 0);
        else {
          const picks = dxbzPicked.map(n => pad(+n, 2)).join(',');
          setPlaySelectedText(`${dxbzMode()}·${dxbzPlay()} · ${picks}`, betCount);
        }
      }
      return;
    }
    const n = playSelectedList.length;
    if (!n) {
      setPlaySelectedText('—', 0);
      return;
    }
    const preview = playSelectedList.slice(0, 4).join('、');
    const main = n > 4 ? `${preview}… 共${n}项` : (n > 1 ? `${preview}（${n}项）` : preview);
    setPlaySelectedText(main, n);
  }

  /** 拆成多条玩法串（不含金额），对齐 123.com 每组合一注 */
  function buildComboBetPlays() {
    const cat = currentPlayCat();
    if (cat.mode === 'lianma') {
      const mode = lianmaMode();
      const play = lianmaPlay();
      const need = lianmaMinPick();
      if ((mode === '生肖对碰' || mode === '尾数对碰' || mode === '生尾对碰' || mode === '任意对碰') && need !== 2) {
        return { err: '对碰仅支持二全中 / 二中特 / 特串' };
      }
      const combos = expandLianmaCombos();
      if (!combos.length) {
        if (mode === '任意对碰') return { err: '请分别选择 A 组与 B 组号码（不可重复）' };
        if (mode === '生肖对碰') return { err: '请选择 2 个生肖对碰' };
        if (mode === '尾数对碰') return { err: '请选择 2 个尾数对碰' };
        if (mode === '生尾对碰') return { err: '请至少选 1 个生肖和 1 个尾' };
        return { err: mode === '拖头' ? `拖头请先选 ${need - 1} 个胆再选托码` : `请至少选择 ${need} 个` };
      }
      const prefix = (mode === '复式' || mode === '拖头') ? mode : '复式';
      return {
        plays: combos.map(c => `${prefix}${play} ${c.map(n => pad(+n, 2)).join(',')}`),
      };
    }
    if (cat.mode === 'shengxiaolian') {
      const k = sxlMinPick();
      const mode = sxlMode();
      const combos = expandByMode(mode, sxlPicked, k);
      if (!combos.length) {
        return { err: mode === '拖头' ? `拖头请先选 ${k - 1} 个胆再选托肖` : `请至少选择 ${k} 个生肖` };
      }
      return { plays: combos.map(c => `${mode}${sxlPlay()} ${c.join(',')}`) };
    }
    if (cat.mode === 'weishulian') {
      const k = wslMinPick();
      const mode = wslMode();
      const combos = expandByMode(mode, wslPicked.map(Number), k);
      if (!combos.length) {
        return { err: mode === '拖头' ? `拖头请先选 ${k - 1} 个胆再选托尾` : `请至少选择 ${k} 个尾` };
      }
      return { plays: combos.map(c => `${mode}${wslPlay()} ${c.map(t => `${t}尾`).join(',')}`) };
    }
    if (cat.mode === 'liuxiao') {
      if (liuxiaoPicked.length !== 6) return { err: '请选择 6 个生肖' };
      const sub = LIUXIAO_SUBS[liuxiaoSubIdx] || LIUXIAO_SUBS[0];
      const tag = sub === '不中' ? '六肖不中' : '六肖中';
      return { plays: [`${tag} ${liuxiaoPicked.join(',')}`] };
    }
    if (cat.mode === 'duoxuan') {
      const k = dxbzMinPick();
      const mode = dxbzMode();
      let combos;
      if (mode === '多组') {
        if (!dxbzGroups.length) return { err: `多组：每满 ${k} 个号自动封一组，请先封组` };
        combos = expandDuozu(dxbzGroups);
      } else {
        combos = expandFushi(dxbzPicked.map(Number), k);
        if (!combos.length) return { err: `请至少选择 ${k} 个号码` };
      }
      return { plays: combos.map(c => `复式${dxbzPlay()} ${c.map(n => pad(+n, 2)).join(',')}`) };
    }
    return { err: '当前玩法不支持' };
  }

  function submitPlayBet() {
    const cat = currentPlayCat();
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    const amount = unitAmount();
    if (!amount) {
      App.toast('请输入有效金额');
      return;
    }
    let lines = [];
    if (isComboPlayMode(cat.mode)) {
      const built = buildComboBetPlays();
      if (built.err) {
        App.toast(built.err);
        return;
      }
      lines = built.plays.map(p => `${p} ${amount}`);
    } else {
      if (!playSelectedList.length) {
        App.toast('请先选择玩法');
        return;
      }
      lines = playSelectedList.map(p => `${p} ${amount}`);
    }
    const total = lines.length * amount;
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: lines.join('<br>') + (lines.length > 1 ? `<br><span class="lhc-msg__bet-sum">${fmtBetSummary(lines.length, amount)}</span>` : ''),
    });
    lines.forEach(line => recordBet(user.name, line));
    rememberBetLines(lines);
    // 只清当前分类，其它分类（如特码选完再去正码）保留
    playSelectedList = [];
    ballQuickKeys.clear();
    clearComboPicksForMode(cat.mode);
    playCatState[cat.id] = { list: [], quick: [] };
    openPlaySheet(false);
    App.toast(`投注成功 · ${fmtBetSummary(lines.length, amount)}`);
  }

  function ballNumsByQuick(key) {
    const all = Array.from({ length: 49 }, (_, i) => i + 1);
    const notTie = (n) => n !== 49;
    const he = (n) => digitSum(n);
    const tail = (n) => n % 10;
    const big = (n) => notTie(n) && n >= 25;
    const small = (n) => notTie(n) && n <= 24;
    const odd = (n) => notTie(n) && n % 2 === 1;
    const even = (n) => notTie(n) && n % 2 === 0;
    const wave = (c) => (n) => waveColor(n) === c;

    if (key === '红') return all.filter(wave('红'));
    if (key === '蓝') return all.filter(wave('蓝'));
    if (key === '绿') return all.filter(wave('绿'));
    if (key === '大') return all.filter(big);
    if (key === '小') return all.filter(small);
    if (key === '单') return all.filter(odd);
    if (key === '双') return all.filter(even);

    if (key === '红单') return all.filter(n => wave('红')(n) && odd(n));
    if (key === '红双') return all.filter(n => wave('红')(n) && even(n));
    if (key === '蓝单') return all.filter(n => wave('蓝')(n) && odd(n));
    if (key === '蓝双') return all.filter(n => wave('蓝')(n) && even(n));
    if (key === '绿单') return all.filter(n => wave('绿')(n) && odd(n));
    if (key === '绿双') return all.filter(n => wave('绿')(n) && even(n));

    if (key === '红大') return all.filter(n => wave('红')(n) && big(n));
    if (key === '红小') return all.filter(n => wave('红')(n) && small(n));
    if (key === '蓝大') return all.filter(n => wave('蓝')(n) && big(n));
    if (key === '蓝小') return all.filter(n => wave('蓝')(n) && small(n));
    if (key === '绿大') return all.filter(n => wave('绿')(n) && big(n));
    if (key === '绿小') return all.filter(n => wave('绿')(n) && small(n));

    // 合数：各位之和；49 和局不入选
    if (key === '合单') return all.filter(n => notTie(n) && he(n) % 2 === 1);
    if (key === '合双') return all.filter(n => notTie(n) && he(n) % 2 === 0);
    if (key === '合大') return all.filter(n => notTie(n) && he(n) >= 5);
    if (key === '合小') return all.filter(n => notTie(n) && he(n) <= 4);
    // 尾数大小：0-4 小，5-9 大；49 和局不入选
    if (key === '尾大') return all.filter(n => notTie(n) && tail(n) >= 5);
    if (key === '尾小') return all.filter(n => notTie(n) && tail(n) <= 4);

    if (key === '家禽') return all.filter(n => POULTRY_ZODIAC.has(zodiacOf(n)));
    if (key === '野兽') return all.filter(n => BEAST_ZODIAC.has(zodiacOf(n)));
    if (/^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(key)) {
      return all.filter(n => zodiacOf(n) === key);
    }
    return [];
  }

  /** 按当前已激活的快捷键，重算本玩法前缀下的选号（多选并集） */
  function rebuildBallQuickSelection() {
    const cat = currentPlayCat();
    const prefix = cat.prefix || '特码';
    const union = new Set();
    ballQuickKeys.forEach((key) => {
      ballNumsByQuick(key).forEach((n) => union.add(prefix + pad(n, 2)));
    });
    playSelectedList = playSelectedList.filter((p) => !String(p).startsWith(prefix));
    union.forEach((p) => playSelectedList.push(p));
  }

  /** 点击快捷：多选开关；再点同一键取消该项，可同时开多个 */
  function applyBallQuick(key) {
    if (!key) return;
    if (ballQuickKeys.has(key)) ballQuickKeys.delete(key);
    else ballQuickKeys.add(key);
    rebuildBallQuickSelection();
    renderBallsPanel();
    updatePlaySelected();
  }

  function waveBallClass(n) {
    const w = waveColor(n);
    if (w === '红') return 'is-red';
    if (w === '蓝') return 'is-blue';
    return 'is-green';
  }

  function renderPlayNav() {
    $('#playNav').html(PLAY_CATEGORIES.map((c, i) =>
      `<button type="button" class="lhc-play-nav__item${i === playCatIdx ? ' is-active' : ''}" data-idx="${i}">${c.title}</button>`
    ).join(''));
  }

  function renderBallsPanel() {
    const cat = currentPlayCat();
    const odds = cat.odds != null ? cat.odds : ODDS.tema;
    const prefix = cat.prefix || '特码';
    const nSel = playSelectedList.filter(p => String(p).startsWith(prefix)).length;
    const qn = ballQuickKeys.size;
    const hintExtra = qn
      ? ` · 已开 ${qn} 个快捷 · 共选 ${nSel} 个`
      : (nSel ? ` · 已选 ${nSel} 个` : ' · 快捷可多选，号码取并集');
    $('#playHint').text((cat.hint || '') + hintExtra);
    $('#playSub').prop('hidden', false).removeClass('is-stack').addClass('is-ball-quick').html(
      `<div class="lhc-play-quick-grid">${BALL_QUICK.map(q =>
        `<button type="button" class="lhc-play-quick ${q.cls || ''}${ballQuickKeys.has(q.key) ? ' is-active' : ''}" data-quick="${q.key}">${q.key}</button>`
      ).join('')}</div>`
    );
    const balls = Array.from({ length: 49 }, (_, i) => {
      const n = i + 1;
      const play = prefix + pad(n, 2);
      const on = isPlaySelected(play);
      return `<button type="button" class="lhc-play-ball${on ? ' is-on' : ''}" data-num="${n}">
        ${ballHtml(n, 'play')}
        <small>1:${odds}</small>
      </button>`;
    }).join('');
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-tema').html(balls);
  }

  function lianmaMode() {
    return LIANMA_MODES[lianmaModeIdx] || LIANMA_MODES[0];
  }
  function lianmaPlay() {
    return LIANMA_PLAYS[lianmaPlayIdx] || LIANMA_PLAYS[0];
  }
  function lianmaPlaysForMode(mode) {
    return LIANMA_DUIPENG_MODES.has(mode) ? LIANMA_PLAYS_ER : LIANMA_PLAYS;
  }
  function ensureLianmaPlayValid() {
    const plays = lianmaPlaysForMode(lianmaMode());
    if (!plays.includes(lianmaPlay())) {
      lianmaPlayIdx = LIANMA_PLAYS.indexOf(plays[0]);
      if (lianmaPlayIdx < 0) lianmaPlayIdx = 0;
    }
  }
  function lianmaMinPick() {
    const play = lianmaPlay();
    return (play === '三全中' || play === '三中二') ? 3 : 2;
  }
  function lianmaTogglePick(val, side) {
    const s = String(val);
    const mode = lianmaMode();
    if (mode === '任意对碰') {
      const list = side === 'B' ? lianmaPickedB : lianmaPickedA;
      const other = side === 'B' ? lianmaPickedA : lianmaPickedB;
      const i = list.indexOf(s);
      if (i >= 0) list.splice(i, 1);
      else if (other.indexOf(s) >= 0) {
        App.toast('A/B 组球号不可重复');
        return;
      } else list.push(s);
      renderLianmaPanel(false);
      return;
    }
    if (mode === '生肖对碰' && /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(s) && !lianmaPicked.includes(s) && lianmaPicked.filter(v => /^[鼠牛虎兔龙蛇马羊猴鸡狗猪]$/.test(v)).length >= 2) {
      App.toast('生肖对碰请选 2 个生肖');
      return;
    }
    if (mode === '尾数对碰' && /^\d$/.test(s) && !lianmaPicked.includes(s) && lianmaPicked.filter(v => /^\d$/.test(v)).length >= 2) {
      App.toast('尾数对碰请选 2 个尾');
      return;
    }
    const i = lianmaPicked.indexOf(s);
    if (i >= 0) lianmaPicked.splice(i, 1);
    else lianmaPicked.push(s);
    renderLianmaPanel(false);
  }

  function renderLianmaPanel(resetPick) {
    if (resetPick !== false) {
      lianmaPicked = [];
      lianmaPickedA = [];
      lianmaPickedB = [];
      lianmaPengSide = 'A';
    }
    ensureLianmaPlayValid();
    const mode = lianmaMode();
    const play = lianmaPlay();
    const plays = lianmaPlaysForMode(mode);
    const min = lianmaMinPick();
    const danN = min - 1;
    const betCount = expandLianmaCombos().length;
    let hint = `${mode} · ${play}`;
    if (mode === '复式') hint += ` · C(n,${min})`;
    else if (mode === '拖头') hint += ` · 前${danN}胆+托`;
    else if (mode === '任意对碰') hint += ' · 左A右B各选号';
    else if (mode === '生肖对碰') hint += ' · 选2肖';
    else if (mode === '尾数对碰') hint += ' · 选2尾';
    else if (mode === '生尾对碰') hint += ' · 生肖×尾数';
    if (LIANMA_DUIPENG_MODES.has(mode)) hint += ' · 仅二码';
    if (betCount) hint += ` · 共${betCount}注`;
    $('#playHint').text(hint);

    setPlaySubBar(buildLmBar({
      modes: LIANMA_MODES,
      modeIdx: lianmaModeIdx,
      modeRow: 'mode',
      modeCols: 3,
      plays,
      playRow: 'play',
      playCols: plays.length === 3 ? 3 : 5,
      playDataIdx: (p) => LIANMA_PLAYS.indexOf(p),
      isPlayActive: (p) => LIANMA_PLAYS.indexOf(p) === lianmaPlayIdx,
    }));

    let body = '';
    let gridCls = 'lhc-play-panel__grid is-tema';
    const picked = new Set(lianmaPicked);

    if (mode === '生肖对碰') {
      gridCls = 'lhc-play-panel__grid is-lianma-block';
      body = `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">选择 2 个生肖</div>
        <div class="lhc-lm-section__grid is-zx">${LIANMA_ZODIAC.map(z =>
          `<button type="button" class="lhc-play-item${picked.has(z) ? ' is-active' : ''}" data-lianma="${z}"><span>${z}</span></button>`
        ).join('')}</div>
      </div>`;
    } else if (mode === '尾数对碰') {
      gridCls = 'lhc-play-panel__grid is-lianma-block';
      body = `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">选择 2 个尾数</div>
        <div class="lhc-lm-section__grid is-tail">${Array.from({ length: 10 }, (_, i) => {
          const t = String(i);
          return `<button type="button" class="lhc-play-item${picked.has(t) ? ' is-active' : ''}" data-lianma="${t}"><span>${t}尾</span></button>`;
        }).join('')}</div>
      </div>`;
    } else if (mode === '生尾对碰') {
      gridCls = 'lhc-play-panel__grid is-lianma-block';
      body = `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">生肖（可多选）</div>
        <div class="lhc-lm-section__grid is-zx">${LIANMA_ZODIAC.map(z =>
          `<button type="button" class="lhc-play-item${picked.has(z) ? ' is-active' : ''}" data-lianma="${z}"><span>${z}</span></button>`
        ).join('')}</div>
      </div>
      <div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">尾数（可多选）</div>
        <div class="lhc-lm-section__grid is-tail">${Array.from({ length: 10 }, (_, i) => {
          const t = String(i);
          return `<button type="button" class="lhc-play-item${picked.has(t) ? ' is-active' : ''}" data-lianma="${t}"><span>${t}尾</span></button>`;
        }).join('')}</div>
      </div>`;
    } else if (mode === '复式' || mode === '拖头') {
      body = Array.from({ length: 49 }, (_, i) => {
        const n = i + 1;
        const key = String(n);
        const idx = lianmaPicked.indexOf(key);
        const on = idx >= 0;
        const role = mode === '拖头' && on ? (idx < danN ? ' is-on is-dan' : ' is-on is-tuo') : (on ? ' is-on' : '');
        return `<button type="button" class="lhc-play-ball${role}" data-lianma="${key}">${ballHtml(n, 'play')}</button>`;
      }).join('');
    } else if (mode === '任意对碰') {
      const setA = new Set(lianmaPickedA);
      const setB = new Set(lianmaPickedB);
      const mkBalls = (side, onSet) => Array.from({ length: 49 }, (_, i) => {
        const n = i + 1;
        const key = String(n);
        const role = onSet.has(key) ? (side === 'A' ? ' is-on is-dan' : ' is-on is-tuo') : '';
        return `<button type="button" class="lhc-play-ball${role}" data-lianma="${key}" data-side="${side}">${ballHtml(n, 'play')}</button>`;
      }).join('');
      gridCls = 'lhc-play-panel__grid is-lianma-block';
      body = `<div class="lhc-lm-ab">
        <div class="lhc-lm-ab__col is-a">
          <div class="lhc-lm-ab__hd">A组（左）</div>
          <div class="lhc-lm-ab__grid">${mkBalls('A', setA)}</div>
        </div>
        <div class="lhc-lm-ab__col is-b">
          <div class="lhc-lm-ab__hd">B组（右）</div>
          <div class="lhc-lm-ab__grid">${mkBalls('B', setB)}</div>
        </div>
      </div>`;
    }

    $('#playGrid').attr('class', gridCls).html(body);
    updatePlaySelected();
  }

  function renderZongshuPanel() {
    const sub = ZONGSHU_SUBS[zongshuSubIdx] || ZONGSHU_SUBS[0];
    const isMiss = sub === '尾数不中';
    $('#playHint').text(`总数项 · ${sub}（0~9 尾）`);
    setPlaySubBar(buildLmBar({
      modes: ZONGSHU_SUBS,
      modeIdx: zongshuSubIdx,
      modeRow: 'zongshu',
      modeCols: 2,
    }));
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-lianma-block').html(
      `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">${sub}</div>
        <div class="lhc-lm-section__grid is-tail">${Array.from({ length: 10 }, (_, i) => {
          const play = isMiss ? `${i}尾不中` : `${i}尾`;
          const odds = playOddsLabel(play);
          const active = isPlaySelected(play);
          return `<button type="button" class="lhc-play-item${active ? ' is-active' : ''}" data-play="${play}"><span>${i}尾</span>${odds ? `<small>1:${odds}</small>` : ''}</button>`;
        }).join('')}</div>
      </div>`
    );
  }

  function sxlMode() {
    return SXL_MODES[sxlModeIdx] || SXL_MODES[0];
  }
  function sxlPlay() {
    return SXL_PLAYS[sxlPlayIdx] || SXL_PLAYS[0];
  }
  function sxlMinPick() {
    const m = sxlPlay().match(/^[二三四五]/);
    const map = { 二: 2, 三: 3, 四: 4, 五: 5 };
    return m ? (map[m[0]] || 2) : 2;
  }
  function sxlTogglePick(z) {
    const s = String(z);
    const i = sxlPicked.indexOf(s);
    if (i >= 0) sxlPicked.splice(i, 1);
    else sxlPicked.push(s);
    renderShengxiaolianPanel(false);
  }
  function renderShengxiaolianPanel(resetPick) {
    if (resetPick !== false) sxlPicked = [];
    const mode = sxlMode();
    const play = sxlPlay();
    const min = sxlMinPick();
    const danN = min - 1;
    const hint = mode === '拖头'
      ? `生肖连 · 拖头 · ${play}（先选 ${danN} 胆再选托，注数=托数）`
      : `生肖连 · 复式 · ${play}（C(n,${min})，单注金额×注数）`;
    $('#playHint').text(hint);
    setPlaySubBar(buildLmBar({
      modes: SXL_MODES,
      modeIdx: sxlModeIdx,
      modeRow: 'sxl-mode',
      modeCols: 2,
      plays: SXL_PLAYS,
      playIdx: sxlPlayIdx,
      playRow: 'sxl-play',
      playCols: 4,
    }));
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-lianma-block').html(
      `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">${mode === '拖头' ? `先选 ${danN} 胆再选托肖` : `至少选 ${min} 个生肖`}</div>
        <div class="lhc-lm-section__grid is-zx">${LIANMA_ZODIAC.map(z => {
          const idx = sxlPicked.indexOf(z);
          return `<button type="button" class="lhc-play-item${pickRoleClass(idx >= 0, idx, mode, min)}" data-sxl="${z}"><span>${z}</span></button>`;
        }).join('')}</div>
      </div>`
    );
    updatePlaySelected();
  }

  function wslMode() {
    return WSL_MODES[wslModeIdx] || WSL_MODES[0];
  }
  function wslPlay() {
    return WSL_PLAYS[wslPlayIdx] || WSL_PLAYS[0];
  }
  function wslMinPick() {
    const m = wslPlay().match(/^[二三四]/);
    const map = { 二: 2, 三: 3, 四: 4, 五: 5 };
    return m ? (map[m[0]] || 2) : 2;
  }
  function wslTogglePick(t) {
    const s = String(t);
    const i = wslPicked.indexOf(s);
    if (i >= 0) wslPicked.splice(i, 1);
    else wslPicked.push(s);
    renderWeishulianPanel(false);
  }
  function renderWeishulianPanel(resetPick) {
    if (resetPick !== false) wslPicked = [];
    const mode = wslMode();
    const play = wslPlay();
    const min = wslMinPick();
    const danN = min - 1;
    const hint = mode === '拖头'
      ? `尾数连 · 拖头 · ${play}（先选 ${danN} 胆再选托，注数=托数）`
      : `尾数连 · 复式 · ${play}（C(n,${min})，单注金额×注数）`;
    $('#playHint').text(hint);
    setPlaySubBar(buildLmBar({
      modes: WSL_MODES,
      modeIdx: wslModeIdx,
      modeRow: 'wsl-mode',
      modeCols: 2,
      plays: WSL_PLAYS,
      playIdx: wslPlayIdx,
      playRow: 'wsl-play',
      playCols: 3,
    }));
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-lianma-block').html(
      `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">${mode === '拖头' ? `先选 ${danN} 胆再选托尾` : `至少选 ${min} 个尾`}</div>
        <div class="lhc-lm-section__grid is-tail">${Array.from({ length: 10 }, (_, i) => {
          const t = String(i);
          const idx = wslPicked.indexOf(t);
          return `<button type="button" class="lhc-play-item${pickRoleClass(idx >= 0, idx, mode, min)}" data-wsl="${t}"><span>${t}尾</span></button>`;
        }).join('')}</div>
      </div>`
    );
    updatePlaySelected();
  }

  function liuxiaoTogglePick(z) {
    const s = String(z);
    const i = liuxiaoPicked.indexOf(s);
    if (i >= 0) {
      liuxiaoPicked.splice(i, 1);
    } else {
      if (liuxiaoPicked.length >= 6) {
        App.toast('六肖最多选 6 个生肖');
        return;
      }
      liuxiaoPicked.push(s);
    }
    renderLiuxiaoPanel(false);
  }
  function renderLiuxiaoPanel(resetPick) {
    if (resetPick !== false) liuxiaoPicked = [];
    const sub = LIUXIAO_SUBS[liuxiaoSubIdx] || LIUXIAO_SUBS[0];
    const picked = new Set(liuxiaoPicked);
    $('#playHint').text(`六肖 · ${sub}（需选满 6 个生肖）`);
    setPlaySubBar(buildLmBar({
      modes: LIUXIAO_SUBS,
      modeIdx: liuxiaoSubIdx,
      modeRow: 'liuxiao',
      modeCols: 2,
    }));
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-lianma-block').html(
      `<div class="lhc-lm-section">
        <div class="lhc-lm-section__hd">已选 ${liuxiaoPicked.length}/6</div>
        <div class="lhc-lm-section__grid is-zx">${LIANMA_ZODIAC.map(z =>
          `<button type="button" class="lhc-play-item${picked.has(z) ? ' is-active' : ''}" data-lx="${z}"><span>${z}</span></button>`
        ).join('')}</div>
      </div>`
    );
    updatePlaySelected();
  }

  function dxbzMode() {
    return DXBZ_MODES[dxbzModeIdx] || DXBZ_MODES[0];
  }
  function dxbzPlay() {
    return DXBZ_PLAYS[dxbzPlayIdx] || DXBZ_PLAYS[0];
  }
  function dxbzMinPick() {
    const m = dxbzPlay().match(/^(十一|十二|五|六|七|八|九|十)/);
    const map = { 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12 };
    return m ? (map[m[1]] || 5) : 5;
  }
  function dxbzTogglePick(num) {
    const s = String(num);
    const k = dxbzMinPick();
    const i = dxbzPicked.indexOf(s);
    if (i >= 0) {
      dxbzPicked.splice(i, 1);
    } else {
      // 多组已封号码不可再选
      if (dxbzMode() === '多组' && dxbzGroups.some(g => g.map(String).includes(s))) {
        App.toast('该号已在已封组中');
        return;
      }
      dxbzPicked.push(s);
      if (dxbzMode() === '多组' && dxbzPicked.length === k) {
        dxbzGroups.push(dxbzPicked.map(Number));
        dxbzPicked = [];
        App.toast(`已封第 ${dxbzGroups.length} 组`);
      }
    }
    renderDuoxuanPanel(false);
  }
  function renderDuoxuanPanel(resetPick) {
    if (resetPick !== false) {
      dxbzPicked = [];
      dxbzGroups = [];
    }
    const mode = dxbzMode();
    const play = dxbzPlay();
    const min = dxbzMinPick();
    const picked = new Set(dxbzPicked);
    const sealed = new Set(dxbzGroups.flatMap(g => g.map(String)));
    const hint = mode === '多组'
      ? `多选不中 · 多组 · ${play}（每满 ${min} 个自动封 1 组）`
      : `多选不中 · 复式 · ${play}（C(n,${min})，单注金额×注数）`;
    $('#playHint').text(hint);
    setPlaySubBar(buildLmBar({
      modes: DXBZ_MODES,
      modeIdx: dxbzModeIdx,
      modeRow: 'dxbz-mode',
      modeCols: 2,
      plays: DXBZ_PLAYS,
      playIdx: dxbzPlayIdx,
      playRow: 'dxbz-play',
      playCols: 4,
    }));
    $('#playGrid').attr('class', 'lhc-play-panel__grid is-tema').html(
      Array.from({ length: 49 }, (_, i) => {
        const n = i + 1;
        const key = String(n);
        let role = '';
        if (picked.has(key)) role = ' is-on';
        else if (sealed.has(key)) role = ' is-on is-dan';
        return `<button type="button" class="lhc-play-ball${role}" data-dxbz="${key}">
          ${ballHtml(n, 'play')}
        </button>`;
      }).join('')
    );
    updatePlaySelected();
  }

  function renderPlayPanel(resetCombo) {
    const cat = currentPlayCat();
    const doReset = resetCombo !== false;
    if (doReset) ballQuickKeys.clear();
    if (cat.mode === 'balls') {
      renderBallsPanel();
      updatePlaySelected();
      return;
    }
    if (cat.mode === 'lianma') {
      renderLianmaPanel(doReset);
      return;
    }
    if (cat.mode === 'zongshu') {
      renderZongshuPanel();
      updatePlaySelected();
      return;
    }
    if (cat.mode === 'shengxiaolian') {
      renderShengxiaolianPanel(doReset);
      return;
    }
    if (cat.mode === 'weishulian') {
      renderWeishulianPanel(doReset);
      return;
    }
    if (cat.mode === 'liuxiao') {
      renderLiuxiaoPanel(doReset);
      return;
    }
    if (cat.mode === 'duoxuan') {
      renderDuoxuanPanel(doReset);
      return;
    }
    $('#playSub').prop('hidden', true).removeClass('is-stack is-lianma-sub is-ball-quick').empty();
    $('#playHint').text(cat.hint || '');
    $('#playGrid').attr('class', 'lhc-play-panel__grid');
    const items = Array.isArray(cat.items) ? cat.items : [];
    if (!items.length) {
      $('#playGrid').html('<div class="lhc-play-panel__empty">具体玩法待添加</div>');
      updatePlaySelected();
      return;
    }
    $('#playGrid').html(items.map(it => {
      const play = typeof it === 'string' ? it : it.play;
      const label = typeof it === 'string' ? it : (it.label || it.play);
      const odds = playOddsLabel(play);
      const active = isPlaySelected(play);
      return `<button type="button" class="lhc-play-item${active ? ' is-active' : ''}" data-play="${play}"><span>${label}</span>${odds ? `<small>1:${odds}</small>` : ''}</button>`;
    }).join(''));
    updatePlaySelected();
  }

  function initPlaySheet() {
    renderPlayNav();
    $('#playAmountChips').html(AMOUNT_CHIPS.map(a =>
      `<button type="button" class="lhc-play-foot__chip${a === 100 ? ' is-active' : ''}" data-amt="${a}">${a}</button>`
    ).join(''));
    renderPlayPanel();
  }

  initKeypad();
  initPlaySheet();
  seedChat();

  function tick() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / INTERVAL) + 1;
    const r = INTERVAL - (elapsed % INTERVAL);
    const issueCur = fmtIssue8(seq);
    $('#curIssue').text(issueCur);
    updateCountdownUI(r);

    if (r <= PREP_SEC && !closedIssues.has(issueCur)) {
      closedIssues.add(issueCur);
      pushRobotClose(issueCur);
    }

    if (r <= PREP_SEC && !drawnIssues.has(issueCur)) {
      drawnIssues.add(issueCur);
      const newDraw = randomDraw();
      lastDraw = newDraw;
      lastIssueSeq = seq;
      const row = {
        issue: issueCur,
        nums: newDraw,
        gy: gyMeta(newDraw).text,
        lh: lhRow(newDraw)
      };
      historyRows.unshift(row);
      if (historyRows.length > 120) historyRows.pop();
      renderDrawBar(row);
      renderDrawTable();
      pushRobotResult(newDraw, issueCur);
    }
  }
  setInterval(tick, 1000);
  setInterval(pushRandomBet, 8000);
  tick();

  // ===== 事件 =====
  $('#backBtn').on('click', () => {
    App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
  });

  /* === chat-rail handlers (lhc) === */

  function openRulesSheet(open) {
    if (open) {
      const tip = '口语示例：马牛各50数 · 19,31,03/10 · 猪猴二有50 · 三有蛇猪猴，狗虎羊各5 · 平特猪蛇/100 · 0尾各50 · 复式三四有虎鸡猴猪各5 · 11,15,05三中三20 · 30,49,27复式二中特各5';
      let rows = '';
      if (typeof PLAY_CATEGORIES !== 'undefined' && PLAY_CATEGORIES && PLAY_CATEGORIES.length) {
        rows = PLAY_CATEGORIES.map(c => {
          const title = c.title || c.name || c.id || '';
          const hint = c.hint || '';
          return '<tr><td>' + title + '</td><td>' + hint + '</td></tr>';
        }).join('');
      }
      const html =
        '<p class="lhc-rules-intro">' + tip + '</p>' +
        (rows
          ? '<table class="lhc-rules-table"><thead><tr><th>玩法</th><th>说明</th></tr></thead><tbody>' + rows + '</tbody></table>'
          : '<p class="lhc-rules-intro">点击右侧或输入栏「玩法」可点选下注；封盘后不可下注。</p>');
      $('#rulesBody').html(html);
      $('#rulesMask').prop('hidden', false);
      $('#rulesSheet').prop('hidden', false).addClass('is-open');
    } else {
      $('#rulesSheet').removeClass('is-open');
      $('#rulesMask').prop('hidden', true);
      setTimeout(() => { if (!$('#rulesSheet').hasClass('is-open')) $('#rulesSheet').prop('hidden', true); }, 280);
    }
  }

  function goBetRecords() {
    const sep = q.includes('?') ? '&' : '?';
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=lhc');
  }

  $('#btnCs').on('click', () => App.go('../../client-app/pages/cs/cs.html' + q));

  $('#btnExpand, #btnComposerPlay').on('click', () => openPlaySheet(true));
  $('#btnRules').on('click', () => openRulesSheet(true));
  $('#rulesSheetClose, #rulesMask').on('click', () => openRulesSheet(false));
  $('#btnRecords').on('click', () => goBetRecords());
  $('#playSheetClose, #playMask').on('click', () => openPlaySheet(false));

  $('#playNav').on('click', '.lhc-play-nav__item', function () {
    const next = +$(this).data('idx') || 0;
    if (next === playCatIdx) return;
    saveCurrentPlayCatState();
    playCatIdx = next;
    loadPlayCatState(currentPlayCat().id);
    $('#playNav .lhc-play-nav__item').removeClass('is-active');
    $(this).addClass('is-active');
    // false：切换分类不重置各玩法内部已选
    renderPlayPanel(false);
  });

  $('#playSub').on('click', '.lhc-play-mode, .lhc-play-type, .lhc-play-quick, .lhc-lm-mode, .lhc-lm-play, .lhc-lm-peng__btn', function () {
    const cat = currentPlayCat();
    const $btn = $(this);
    if ($btn.hasClass('lhc-play-quick') && cat.mode === 'balls') {
      applyBallQuick(String($btn.data('quick') || ''));
      return;
    }
    const row = String($btn.data('row') || '');
    const idx = +$btn.data('idx');
    if (cat.mode === 'lianma') {
      if (row === 'mode') {
        lianmaModeIdx = idx;
        renderLianmaPanel(true);
      } else if (row === 'play') {
        lianmaPlayIdx = idx;
        renderLianmaPanel(false);
      } else if (row === 'peng-side') {
        lianmaPengSide = String($btn.data('side') || 'A') === 'B' ? 'B' : 'A';
        renderLianmaPanel(false);
      }
      return;
    }
    if (cat.mode === 'zongshu' && row === 'zongshu') {
      zongshuSubIdx = idx;
      playSelectedList = [];
      renderZongshuPanel();
      updatePlaySelected();
      return;
    }
    if (cat.mode === 'shengxiaolian') {
      if (row === 'sxl-mode') {
        sxlModeIdx = idx;
        renderShengxiaolianPanel(true);
      } else if (row === 'sxl-play') {
        sxlPlayIdx = idx;
        renderShengxiaolianPanel(false);
      }
      return;
    }
    if (cat.mode === 'weishulian') {
      if (row === 'wsl-mode') {
        wslModeIdx = idx;
        renderWeishulianPanel(true);
      } else if (row === 'wsl-play') {
        wslPlayIdx = idx;
        renderWeishulianPanel(false);
      }
      return;
    }
    if (cat.mode === 'liuxiao' && row === 'liuxiao') {
      liuxiaoSubIdx = idx;
      renderLiuxiaoPanel(true);
      return;
    }
    if (cat.mode === 'duoxuan') {
      if (row === 'dxbz-mode') {
        dxbzModeIdx = idx;
        renderDuoxuanPanel(true);
      } else if (row === 'dxbz-play') {
        dxbzPlayIdx = idx;
        renderDuoxuanPanel(false);
      }
    }
  });

  $('#playGrid').on('click', '.lhc-play-ball[data-num]', function () {
    const cat = currentPlayCat();
    const play = (cat.prefix || '特码') + pad(+$(this).data('num'), 2);
    // 手动点号后不再跟快捷联动，避免重算覆盖
    ballQuickKeys.clear();
    togglePlaySelect(play);
    renderBallsPanel();
    updatePlaySelected();
  });

  $('#playGrid').on('click', '[data-lianma]', function () {
    lianmaTogglePick($(this).data('lianma'), $(this).data('side'));
  });

  $('#playGrid').on('click', '[data-sxl]', function () {
    sxlTogglePick($(this).data('sxl'));
  });

  $('#playGrid').on('click', '[data-wsl]', function () {
    wslTogglePick($(this).data('wsl'));
  });

  $('#playGrid').on('click', '[data-lx]', function () {
    liuxiaoTogglePick($(this).data('lx'));
  });

  $('#playGrid').on('click', '[data-dxbz]', function () {
    dxbzTogglePick($(this).data('dxbz'));
  });

  $('#playGrid').on('click', '.lhc-play-item[data-play]', function () {
    const play = String($(this).data('play'));
    togglePlaySelect(play);
    $(this).toggleClass('is-active', isPlaySelected(play));
    updatePlaySelected();
  });

  $('#playAmountChips').on('click', '.lhc-play-foot__chip', function () {
    const amt = +$(this).data('amt');
    $('#playAmount').val(amt);
    $('#playAmountChips .lhc-play-foot__chip').removeClass('is-active');
    $(this).addClass('is-active');
    updatePlaySelected();
  });

  $('#playAmountMinus').on('click', () => {
    const v = Math.max(1, (parseInt($('#playAmount').val(), 10) || 1) - 10);
    $('#playAmount').val(v);
    $('#playAmountChips .lhc-play-foot__chip').removeClass('is-active');
    updatePlaySelected();
  });
  $('#playAmountPlus').on('click', () => {
    const v = (parseInt($('#playAmount').val(), 10) || 0) + 10;
    $('#playAmount').val(v);
    $('#playAmountChips .lhc-play-foot__chip').removeClass('is-active');
    updatePlaySelected();
  });
  $('#playAmount').on('input change', () => updatePlaySelected());

  $('#playClear').on('click', clearPlaySelection);
  $('#playRepeat').on('click', repeatLastBets);
  $('#playSubmit').on('click', submitPlayBet);
$('#btnSlip').on('click', () => {
    const sep = q ? '&' : '?';
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=lhc');
  });
  $('#btnLong').on('click', () => App.toast('长龙统计 · 开发中'));
  $('#btnPredict').on('click', () => App.toast('预测 · 开发中'));

  $('#drawToggle').on('click', toggleDrawPanel);

  $('#chatInput').on('input', () => updateComposerAction());
  $('#chatInput').on('focus', () => {
    showKeypad(true);
    openPlusMenu(false);
  });

  $('#chatInput').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendBetMessage();
    }
  });

  $('#keyGrid').on('click', '.lhc-key', function () {
    insertInput($(this).data('key'));
  });

  $('#keypad').on('click', '[data-cmd]', function () {
    const cmd = $(this).data('cmd');
    if (cmd === 'cancel') {
      $('#chatInput').val('');
      return;
    }
    if (cmd === 'repeat') {
      if (lastBetLines.length > 1) {
        // 多注时直接重复落单，避免输入框塞不下
        repeatLastBets();
      } else if (lastBetText) {
        $('#chatInput').val(lastBetText);
      } else {
        App.toast('暂无上笔投注可重复');
      }
      return;
    }
    if (cmd === 'allin') {
      const bal = App.getBalance(user.uid);
      $('#chatInput').val('梭哈 ' + bal);
      return;
    }
    if (cmd === 'topup') {
      App.go('../../client-app/pages/recharge/recharge.html' + q);
      return;
    }
    if (cmd === 'withdraw') {
      App.toast('下分请联系客服');
      return;
    }
  });

  $('#plusBtn').on('click', function () {
    showKeypad(false);
    openPlusMenu(!$('#plusMenu').hasClass('is-open'));
  });

  $('#menuMask').on('click', () => openPlusMenu(false));

  const LINKS = {
    recharge: '../../client-app/pages/recharge/recharge.html',
    withdraw: '../../client-app/pages/profile/profile.html',
    'apply-records': '../../client-app/pages/apply-records/apply-records.html',
    welfare: '../../client-app/pages/welfare/welfare.html',
    'bet-records': '../../client-app/pages/bet-records/bet-records.html',
    flow: '../../client-app/pages/flow/flow.html',
    redpack: null,
    'points-log': '../../client-app/pages/points-log/points-log.html'
  };

  $('#plusMenu').on('click', 'button', function () {
    const key = $(this).data('link');
    openPlusMenu(false);
    if (key === 'redpack') {
      App.toast('红包报表 · 开发中');
      return;
    }
    const url = LINKS[key];
    if (url) {
      let go = url + q;
      if (key === 'bet-records') go += (go.includes('?') ? '&' : '?') + 'game=lhc';
      App.go(go);
    } else App.toast('即将开放');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#keypad, #chatInput, .lhc-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.lhc-plus-menu, #plusBtn, .lhc-menu-mask').length) {
        showKeypad(false);
      }
    }
  });
});
