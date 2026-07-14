/**
 * 游戏类型: digit5
 *
 * 1分时时彩 · 聊天投注房
 * 玩法与规则对齐官方「幸运时时彩」：
 * 两面 / 定位胆 / 不定位 / 三星组三 / 三星组六 / 龙虎和 / 斗牛 / 前中后
 */
$(function () {
  const GAME_TYPE = 'digit5';

  // V66 1分时时彩：1 分钟一期 = 0:56 下注倒计时 + 4s 准备中
  const INTERVAL = 60;
  const PREP_SEC = 4;
  const BET_SEC = INTERVAL - PREP_SEC;

  function fixAvatar(url) {
    const fallback = '/legacy/images/default-avatar.svg';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    if (url.startsWith('../../assets/') || url.startsWith('../assets/')) {
      return '/legacy/images/default-avatar.svg';
    }
    return url;
  }
  function avatarHtml(name, seed) {
    const hue = (seed * 41 + (name.charCodeAt(0) || 0) * 17) % 360;
    const ch = name.charAt(0) || '?';
    return `<div class="ffc-msg__avatar ffc-msg__avatar--gen" style="--av-hue:${hue}"><span>${ch}</span></div>`;
  }
  const ROBOT = { name: '机器人', avatar: '/legacy/images/default-avatar.svg' };
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const user = App.getUser();
  const q = roomNo ? '?roomNo=' + encodeURIComponent(roomNo) : '';

  let historyRows = [];
  let lastDraw = [];
  let lastIssueSeq = 0;
  let lastBetText = '';
  /** 输入框由「梭哈」填入时，发送再按余额均分多注 */
  let composerAllin = false;
  let drawPanelOpen = false;
  const closedIssues = new Set();
  const drawnIssues = new Set();
  const MOCK_NAMES = [];
  /** 当期注单：issue -> { 玩家名: [{ play, amount }] } */
  const issueBetBook = {};

  /* ================= 官方玩法 · 赔率 ================= */
  const ODDS = {
    sumSide: 1.995,   // 总和 大/小/单/双
    ballSide: 1.995,  // 第一~五球 大/小/单/双
    position: 9.95,   // 定位胆
    anyDigit: 3.6,    // 不定位
    group3: 260,      // 三星组三
    group6: 125,      // 三星组六
    dragon: 1.99,     // 龙 / 虎
    tie: 9,           // 和
    noNiu: 2.02,      // 无牛
    niu: 9.22,        // 牛1~牛9、牛牛
    niuSide: 1.98     // 牛大/牛小/牛单/牛双
  };

  const POS = { 万: 0, 千: 1, 百: 2, 十: 3, 个: 4 };
  const SEG = { 前三: [0, 3], 中三: [1, 4], 后三: [2, 5] };
  const SHAPE_ODDS = { 豹子: 75, 顺子: 14.5, 对子: 3.3, 半顺: 2.5, 杂六: 3 };

  /**
   * 解析玩法文本 → { type, ..., odds }；不合法返回 null
   */
  function parsePlay(raw) {
    const t = String(raw || '').replace(/\s+/g, '');
    let m;
    if ((m = t.match(/^(?:总和|总)?(大|小|单|双)$/))) {
      return { type: 'sumSide', side: m[1], odds: ODDS.sumSide };
    }
    if ((m = t.match(/^([万千百十个])(大|小|单|双)$/))) {
      return { type: 'ballSide', pos: POS[m[1]], side: m[2], odds: ODDS.ballSide };
    }
    if ((m = t.match(/^([万千百十个])([0-9])$/))) {
      return { type: 'position', pos: POS[m[1]], digit: +m[2], odds: ODDS.position };
    }
    if ((m = t.match(/^(前三|中三|后三)(豹子|顺子|对子|半顺|杂六)$/))) {
      return { type: 'shape', seg: m[1], shape: m[2], odds: SHAPE_ODDS[m[2]] };
    }
    if ((m = t.match(/^(前三|中三|后三)组三([0-9])[,，]?([0-9])$/))) {
      if (m[2] === m[3]) return null;
      return { type: 'group3', seg: m[1], a: +m[2], b: +m[3], odds: ODDS.group3 };
    }
    if ((m = t.match(/^(前三|中三|后三)组六([0-9])[,，]?([0-9])[,，]?([0-9])$/))) {
      const set = new Set([m[2], m[3], m[4]]);
      if (set.size !== 3) return null;
      return { type: 'group6', seg: m[1], digits: [+m[2], +m[3], +m[4]], odds: ODDS.group6 };
    }
    if ((m = t.match(/^(前三|中三|后三)([0-9])$/))) {
      return { type: 'anyDigit', seg: m[1], digit: +m[2], odds: ODDS.anyDigit };
    }
    if ((m = t.match(/^([1-4])[vV]([1-5])(龙|虎|和)$/))) {
      const a = +m[1], b = +m[2];
      if (a >= b) return null;
      return { type: 'lhh', a: a - 1, b: b - 1, pick: m[3], odds: m[3] === '和' ? ODDS.tie : ODDS.dragon };
    }
    if (t === '无牛') return { type: 'niu', val: -1, odds: ODDS.noNiu };
    if (t === '牛牛') return { type: 'niu', val: 10, odds: ODDS.niu };
    if ((m = t.match(/^牛([1-9])$/))) return { type: 'niu', val: +m[1], odds: ODDS.niu };
    if ((m = t.match(/^牛(大|小|单|双)$/))) return { type: 'niuSide', side: m[1], odds: ODDS.niuSide };
    return null;
  }

  /* ---------- 判定工具 ---------- */
  function sumOf(nums) { return nums.reduce((a, b) => a + b, 0); }
  function sideOfSum(s) { return { big: s >= 23, odd: s % 2 === 1 }; }
  function sideOfBall(n) { return { big: n >= 5, odd: n % 2 === 1 }; }
  function segOf(nums, seg) { const r = SEG[seg]; return nums.slice(r[0], r[1]); }

  /** 斗牛：返回 -1 无牛，10 牛牛，1~9 牛几 */
  function niuValue(nums) {
    const total = sumOf(nums);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 5; k++) {
          if ((nums[i] + nums[j] + nums[k]) % 10 === 0) {
            const v = (total - nums[i] - nums[j] - nums[k]) % 10;
            return v === 0 ? 10 : v;
          }
        }
      }
    }
    return -1;
  }
  function niuLabel(v) {
    if (v === -1) return '无牛';
    if (v === 10) return '牛牛';
    return '牛' + v;
  }

  /** 前中后形态：豹子 / 顺子 / 对子 / 半顺 / 杂六（9-0、0-1 相连） */
  function shapeOf(arr3) {
    const s = arr3.slice().sort((a, b) => a - b);
    if (s[0] === s[2]) return '豹子';
    if (s[0] === s[1] || s[1] === s[2]) return '对子';
    for (let a = 0; a < 10; a++) {
      const set = new Set([a, (a + 1) % 10, (a + 2) % 10]);
      if (set.has(s[0]) && set.has(s[1]) && set.has(s[2])) return '顺子';
    }
    const adjacent = (x, y) => { const d = Math.abs(x - y); return d === 1 || d === 9; };
    if (adjacent(s[0], s[1]) || adjacent(s[1], s[2]) || adjacent(s[0], s[2])) return '半顺';
    return '杂六';
  }

  function matchSide(side, meta) {
    if (side === '大') return meta.big;
    if (side === '小') return !meta.big;
    if (side === '单') return meta.odd;
    return !meta.odd;
  }

  /** 官方规则结算：返回 { winAmount, profit, hit } */
  function settleBet(play, amount, nums) {
    const p = parsePlay(play);
    if (!p) return { winAmount: 0, profit: -amount, hit: '' };
    let win = false;
    switch (p.type) {
      case 'sumSide':
        win = matchSide(p.side, sideOfSum(sumOf(nums)));
        break;
      case 'ballSide':
        win = matchSide(p.side, sideOfBall(nums[p.pos]));
        break;
      case 'position':
        win = nums[p.pos] === p.digit;
        break;
      case 'anyDigit':
        win = segOf(nums, p.seg).includes(p.digit);
        break;
      case 'group3': {
        const seg = segOf(nums, p.seg).slice().sort((a, b) => a - b);
        const aab = [p.a, p.a, p.b].sort((a, b) => a - b);
        const abb = [p.a, p.b, p.b].sort((a, b) => a - b);
        const same = (x, y) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];
        win = same(seg, aab) || same(seg, abb);
        break;
      }
      case 'group6': {
        const seg = segOf(nums, p.seg);
        const set = new Set(seg);
        win = set.size === 3 && p.digits.every(d => set.has(d));
        break;
      }
      case 'lhh': {
        const x = nums[p.a], y = nums[p.b];
        const res = x > y ? '龙' : (x < y ? '虎' : '和');
        win = res === p.pick;
        break;
      }
      case 'niu':
        win = niuValue(nums) === p.val;
        break;
      case 'niuSide': {
        const v = niuValue(nums);
        if (v === -1) { win = false; break; }
        if (p.side === '大') win = v >= 6;        // 牛6~牛牛
        else if (p.side === '小') win = v <= 5;   // 牛1~牛5
        else if (p.side === '单') win = v % 2 === 1;
        else win = v % 2 === 0;                   // 牛2/4/6/8/牛牛
        break;
      }
      case 'shape':
        win = shapeOf(segOf(nums, p.seg)) === p.shape;
        break;
    }
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * p.odds);
    return { winAmount, profit: winAmount - amount, hit: play };
  }

  /* ================= 期号 / 时间 ================= */
  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function dateKey() {
    const d = new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
  }
  /** 官方期号格式：20260704-0082 */
  function fmtIssue(seq) {
    return dateKey() + '-' + pad(Math.max(1, seq) % 10000, 4);
  }
  function setCurIssueDisplay(issue) {
    $('#curIssue').text(issue).attr('title', issue);
  }
  function fmtTime(d) {
    return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
  }

  function getRoundRemain() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return INTERVAL - (elapsed % INTERVAL);
  }
  function getCurrentIssue() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return fmtIssue(Math.floor(elapsed / INTERVAL) + 1);
  }
  function isBettingOpen() {
    return getRoundRemain() > PREP_SEC;
  }

  /* ================= 注单 ================= */
  const POS_CHARS = '万千百十个';
  const SIDE_CHARS = '大小单双';
  const SUOHA_WORDS = new Set(['梭哈', '全下', 'allin']);

  /** 玩法段拆成不重复的位置列表（保持顺序） */
  function splitPositions(posStr) {
    const out = [];
    const seen = new Set();
    for (const c of posStr) {
      if (!POS_CHARS.includes(c) || seen.has(c)) continue;
      seen.add(c);
      out.push(c);
    }
    return out;
  }

  /** 解析玩法段 → 玩法名数组；支持组合：万百十单、十百59、万13 */
  function expandPlayPart(playPart) {
    const t = String(playPart || '').replace(/\s+/g, '');
    if (!t) return null;

    // 多位置 + 两面：万百十单 → 万单、百单、十单
    let m = t.match(/^([万千百十个]+)([大小单双])$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      for (const p of splitPositions(m[1])) {
        const play = p + m[2];
        if (!parsePlay(play)) return null;
        plays.push(play);
      }
      return plays.length ? plays : null;
    }

    // 多位置 + 号码：十百59 → 十5、十9、百5、百9
    m = t.match(/^([万千百十个]+)([0-9]+)$/);
    if (m && m[1].length >= 2 && m[2].length >= 1) {
      const positions = splitPositions(m[1]);
      const plays = [];
      for (const p of positions) {
        for (const d of m[2]) {
          const play = p + d;
          if (!parsePlay(play)) return null;
          plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    // 单位置 + 多号：万13 → 万1、万3
    m = t.match(/^([万千百十个])([0-9]{2,})$/);
    if (m) {
      const pos = m[1];
      const plays = [];
      for (const d of m[2]) {
        const play = pos + d;
        if (!parsePlay(play)) return null;
        plays.push(play);
      }
      return plays.length ? plays : null;
    }

    // 不定位多号：前三135
    m = t.match(/^(前三|中三|后三)([0-9]{2,})$/);
    if (m) {
      const seg = m[1];
      const plays = [];
      for (const d of m[2]) {
        const play = seg + d;
        if (!parsePlay(play)) return null;
        plays.push(play);
      }
      return plays.length ? plays : null;
    }

    if (parsePlay(t)) return [t];
    return null;
  }

  /** 梭哈：单注全下；多注按余额均分 */
  function resolveBetAmounts(plays, amountPart) {
    const key = String(amountPart || '').trim();
    if (!SUOHA_WORDS.has(key)) {
      const amount = parseInt(key, 10);
      if (!amount) return null;
      return plays.map(play => ({ play, amount }));
    }
    const bal = App.getBalance(user.uid);
    if (!bal || bal < 1) return null;
    if (plays.length === 1) return [{ play: plays[0], amount: bal }];
    const base = Math.floor(bal / plays.length);
    if (base < 1) return null;
    const rem = bal - base * plays.length;
    return plays.map((play, i) => ({
      play,
      amount: base + (i === 0 ? rem : 0)
    }));
  }

  /** 解析一条聊天投注 → [{ play, amount }, ...]；非法返回 null */
  function parseBetLines(text) {
    const raw = String(text || '').trim();
    const m = raw.match(/^(.+?)\/(.+)$/);
    if (!m) return null;
    const plays = expandPlayPart(m[1].trim());
    if (!plays || !plays.length) return null;
    return resolveBetAmounts(plays, m[2].trim());
  }

  /** 解析聊天框投注（支持空格分隔多注） */
  function parseBetInput(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const parts = raw.split(/\s+/).filter(Boolean);
    const all = [];
    for (const part of parts) {
      const lines = parseBetLines(part);
      if (!lines) return null;
      all.push(...lines);
    }
    return all.length ? all : null;
  }

  function formatResolvedBets(lines) {
    return lines.map(l => `${l.play}/${l.amount}`).join(' ');
  }

  function applyAllinToInput() {
    const $in = $('#chatInput');
    let v = $in.val().replace(/\s+/g, ' ').trim();
    if (!v) {
      App.toast('请先输入玩法，再点梭哈');
      return false;
    }
    v = v.replace(/\/(\d+|梭哈|全下|allin)$/i, '');
    const plays = expandPlayPart(v);
    if (!plays || !plays.length) {
      App.toast('玩法无效，请检查后再点梭哈');
      return false;
    }
    const lines = resolveBetAmounts(plays, '梭哈');
    if (!lines) {
      App.toast('余额不足，无法梭哈');
      return false;
    }
    const perAmount = plays.length === 1
      ? lines[0].amount
      : Math.floor(App.getBalance(user.uid) / plays.length);
    $in.val(`${v}/${perAmount}`);
    composerAllin = true;
    updateComposerAction();
    return true;
  }

  function parseBet(text) {
    const lines = parseBetLines(text);
    if (!lines || lines.length !== 1) return lines || null;
    return lines[0];
  }

  function recordBetLine(name, play, amount) {
    if (!isBettingOpen()) return false;
    if (!parsePlay(play) || !amount) return false;
    const issue = getCurrentIssue();
    if (!issueBetBook[issue]) issueBetBook[issue] = {};
    if (!issueBetBook[issue][name]) issueBetBook[issue][name] = [];
    issueBetBook[issue][name].push({ play, amount });
    if (name === user.name) appendUserBetLog(issue, play, amount);
    return true;
  }

  /* ================= 注单持久化（供竞猜记录页） ================= */
  function betLogKey() {
    return 'ffc_bet_log_' + user.uid;
  }
  function loadUserBetLog() {
    try {
      const raw = localStorage.getItem(betLogKey());
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveUserBetLog(list) {
    localStorage.setItem(betLogKey(), JSON.stringify(list.slice(0, 120)));
    try {
      window.dispatchEvent(new CustomEvent('ffc-bet-log-updated'));
    } catch (e) { /* */ }
  }
  function appendUserBetLog(issue, play, amount) {
    const log = loadUserBetLog();
    let group = log.find(g => g.issue === issue);
    if (!group) {
      group = {
        game: 'ffc',
        issue,
        createdAt: new Date().toISOString(),
        settled: false,
        bets: [],
        totalAmount: 0,
        totalProfit: 0
      };
      log.unshift(group);
    }
    group.bets.push({
      play,
      amount,
      status: 'PENDING',
      profit: 0,
      winAmount: 0,
      hit: ''
    });
    group.totalAmount += amount;
    saveUserBetLog(log);
  }
  function settleUserBetLog(issue, nums, rows) {
    const log = loadUserBetLog();
    const group = log.find(g => g.issue === issue);
    if (!group || !group.bets.length) return;
    group.settled = true;
    group.settledAt = new Date().toISOString();
    group.drawNums = nums.slice();
    group.drawSummary = `${gyMeta(nums).text} · ${lhRow(nums)}`;
    group.totalProfit = 0;
    const rowQueue = rows && rows.length ? rows.slice() : [];
    group.bets = group.bets.map((b, i) => {
      let r = rowQueue[i];
      if (!r || r.play !== b.play || r.amount !== b.amount) {
        r = settleBet(b.play, b.amount, nums);
      }
      const item = {
        play: b.play,
        amount: b.amount,
        status: r.winAmount > 0 ? 'WON' : 'LOST',
        profit: r.profit,
        winAmount: r.winAmount,
        hit: r.hit || ''
      };
      group.totalProfit += item.profit;
      return item;
    });
    saveUserBetLog(log);
  }

  function recordBetLines(name, lines) {
    if (!lines || !lines.length) return false;
    let ok = false;
    lines.forEach(({ play, amount }) => {
      if (recordBetLine(name, play, amount)) ok = true;
    });
    return ok;
  }

  function recordBet(name, text) {
    const lines = parseBetInput(text);
    if (!lines) return false;
    return recordBetLines(name, lines);
  }
  function fmtProfit(n) {
    return (n >= 0 ? '+' : '') + n;
  }
  function buildBetListVerifyHtml(issue) {
    const book = issueBetBook[issue];
    if (!book || !Object.keys(book).length) {
      return `<div class="ffc-bot-card ffc-bot-card--bets">
        <div class="ffc-bot-card__head"><span class="ffc-bot-card__title">注单核对</span><span class="ffc-bot-card__issue">${issue}</span></div>
        <div class="ffc-bot-empty">本期暂无下注</div>
      </div>`;
    }
    const names = Object.keys(book);
    const totalAmt = names.reduce((s, n) => s + book[n].reduce((a, b) => a + b.amount, 0), 0);
    const totalCnt = names.reduce((s, n) => s + book[n].length, 0);
    const users = names.map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const tags = bets.map(b => `<span class="ffc-bot-tag">${b.play}/${b.amount}</span>`).join('');
      const me = name === user.name ? ' is-me' : '';
      return `<div class="ffc-bot-user${me}">
        <div class="ffc-bot-user__head"><span class="ffc-bot-user__name">${name}</span><span class="ffc-bot-user__sum">${total}</span></div>
        <div class="ffc-bot-user__tags">${tags}</div>
      </div>`;
    }).join('');
    return `<div class="ffc-bot-card ffc-bot-card--bets">
      <div class="ffc-bot-card__head"><span class="ffc-bot-card__title">注单核对</span><span class="ffc-bot-card__issue">${issue}</span></div>
      <div class="ffc-bot-card__stat">${names.length} 人 · ${totalCnt} 注 · ${totalAmt}</div>
      <div class="ffc-bot-card__body is-full">${users}</div>
    </div>`;
  }

  function buildWinListVerifyHtml(issue, settled) {
    const pending = settled == null;
    if (pending) {
      return `<div class="ffc-bot-card ffc-bot-card--win is-calculating">
      <div class="ffc-bot-card__head"><span class="ffc-bot-card__title">中奖核对</span><span class="ffc-bot-card__issue">${issue}</span></div>
      <div class="ffc-bot-card__body is-full">
        <div class="ffc-bot-calc-line">
          <span class="ffc-bot-calc-line__icon" aria-hidden="true"></span>
          <span class="ffc-bot-calc-line__text">正在核对中奖注单</span>
        </div>
      </div>
    </div>`;
    }
    const winners = Object.keys(settled || {}).filter(name =>
      settled[name].some(r => r.winAmount > 0)
    );
    let body = '';
    if (winners.length) {
      winners.sort((a, b) => {
        const pa = settled[a].reduce((s, r) => s + r.profit, 0);
        const pb = settled[b].reduce((s, r) => s + r.profit, 0);
        return pb - pa;
      });
      body = winners.map(name => {
        const winRows = settled[name].filter(r => r.winAmount > 0);
        const totalWin = winRows.reduce((s, r) => s + r.winAmount, 0);
        const totalProfit = settled[name].reduce((s, r) => s + r.profit, 0);
        const tags = winRows.map(r =>
          `<span class="ffc-bot-tag ffc-bot-tag--win">${r.play}/${r.amount}</span>`
        ).join('');
        const profitCls = totalProfit >= 0 ? 'pos' : 'neg';
        return `<div class="ffc-bot-user">
          <div class="ffc-bot-user__head">
            <span class="ffc-bot-user__name">${name}</span>
            <span class="ffc-bot-user__profit ${profitCls}">${fmtProfit(totalProfit)}</span>
          </div>
          <div class="ffc-bot-user__tags">${tags}</div>
          <div class="ffc-bot-user__sub">中奖 +${totalWin}</div>
        </div>`;
      }).join('');
    } else {
      body = '<div class="ffc-bot-empty">本期暂无中奖</div>';
    }
    let mine = '';
    const myRows = settled && settled[user.name];
    if (myRows && myRows.length) {
      const myProfit = myRows.reduce((s, r) => s + r.profit, 0);
      const myWin = myRows.reduce((s, r) => s + r.winAmount, 0);
      const profitCls = myProfit >= 0 ? 'pos' : 'neg';
      const winText = myWin > 0 ? `中奖 +${myWin}` : '未中奖';
      mine = `<div class="ffc-bot-mine-line ${profitCls}">
        <span class="ffc-bot-mine-line__label">您本期</span>
        <span class="ffc-bot-mine-line__win">${winText}</span>
        <span class="ffc-bot-mine-line__profit">输赢 ${fmtProfit(myProfit)}</span>
      </div>`;
    }
    return `<div class="ffc-bot-card ffc-bot-card--win">
      <div class="ffc-bot-card__head"><span class="ffc-bot-card__title">中奖核对</span><span class="ffc-bot-card__issue">${issue}</span></div>
      <div class="ffc-bot-card__body is-full">${body}</div>
      ${mine}
    </div>`;
  }

  /** 开奖结果滚号 + 底部 chip 动画大致时长（ms） */
  function resultRevealDurationMs() {
    const n = 5;
    const lastBallDone = (n - 1) * 180 + 480 + (n - 1) * 70;
    const lastChipDone = (1.15 + n * 0.22 + 0.28) * 1000 + 400;
    return Math.ceil(Math.max(lastBallDone, lastChipDone) + 150);
  }

  function closeNoticeHtml(issue) {
    return `<div class="ffc-bot-close-line">
      <div class="ffc-bot-close-line__bar">
        <span class="ffc-bot-close-line__deco"></span>
        <span class="ffc-bot-close-line__text">封 盘 线</span>
        <span class="ffc-bot-close-line__deco"></span>
      </div>
      <div class="ffc-bot-close-line__sub">第 <span class="ffc-bot-close-line__issue">${issue}</span> 期 · 停止下注 · 即将开奖</div>
    </div>`;
  }

  function buildBetListVerifyText(issue) {
    const book = issueBetBook[issue];
    if (!book || !Object.keys(book).length) {
      return `${issue}期已封盘\n竞猜列表核对\n——————————\n暂无下注数据`;
    }
    const blocks = Object.keys(book).map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const lines = bets.map(b => `${b.play}/${b.amount}`).join('\n');
      return `（${name}）下注总金额：${total}\n${lines}`;
    });
    return `${issue}期已封盘\n竞猜列表核对\n——————————\n${blocks.join('\n\n')}`;
  }

  /* ================= 开奖 ================= */
  const PLAY_ITEMS = [
    '大', '小', '单', '双',
    '万大', '千小', '百单', '十双', '个大',
    '万5', '个0', '千8',
    '前三3', '中三6', '后三9',
    '1v2龙', '2v4虎', '1v5和', '3v5龙',
    '无牛', '牛牛', '牛5', '牛大', '牛小', '牛单', '牛双',
    '前三豹子', '中三顺子', '后三对子', '前三半顺', '后三杂六',
    '前三组三13', '后三组六258'
  ];
  function randomDraw() {
    return Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    return `<span class="ffc-ball-digit${c}">${n}</span>`;
  }
  function gyMeta(nums) {
    const s = sumOf(nums);
    return { text: `${s} ${s >= 23 ? '大' : '小'} ${s % 2 ? '单' : '双'}`, sum: s };
  }
  function lhRow(nums) {
    return niuLabel(niuValue(nums));
  }
  function barSummaryHtml(row) {
    const gy = row.gy || gyMeta(row.nums).text;
    const lh = row.lh || lhRow(row.nums);
    return `${gy}<span class="sep">·</span>${lh}`;
  }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(n => ballHtml(n, 'xs')).join(''));
    $('#barSummary').html(barSummaryHtml(row));
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="ffc-draw-table__issue">${r.issue}</td>
      ${r.nums.map(n => `<td>${ballHtml(n, 'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g, '')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    return FfcResultCard.build(nums, issue);
  }
  const HISTORY_SHOW = 10;
  const POS_LABELS = ['万', '千', '百', '十', '个'];
  const MIN_LONG_STREAK = 2;
  let longTab = 'side';

  function streakAtHead(labels) {
    if (!labels.length) return { tag: '', count: 0 };
    const tag = labels[0];
    let count = 1;
    for (let i = 1; i < labels.length; i++) {
      if (labels[i] === tag) count++;
      else break;
    }
    return { tag, count };
  }

  function pushLongItem(list, name, count) {
    if (count >= MIN_LONG_STREAK) list.push({ name, count });
  }

  function buildLongDragonGroups() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 5);
    const side = [];
    const lhh = [];
    const niu = [];
    if (!rows.length) return { side, lhh, niu };

    const sumMeta = rows.map(r => sideOfSum(sumOf(r.nums)));
    {
      const labels = sumMeta.map(m => (m.big ? '大' : '小'));
      const s = streakAtHead(labels);
      pushLongItem(side, `总${s.tag}`, s.count);
    }
    {
      const labels = sumMeta.map(m => (m.odd ? '单' : '双'));
      const s = streakAtHead(labels);
      pushLongItem(side, `总${s.tag}`, s.count);
    }

    POS_LABELS.forEach((pos, idx) => {
      const ballMeta = rows.map(r => sideOfBall(r.nums[idx]));
      {
        const labels = ballMeta.map(m => (m.big ? '大' : '小'));
        const s = streakAtHead(labels);
        pushLongItem(side, `${pos}${s.tag}`, s.count);
      }
      {
        const labels = ballMeta.map(m => (m.odd ? '单' : '双'));
        const s = streakAtHead(labels);
        pushLongItem(side, `${pos}${s.tag}`, s.count);
      }
    });

    for (let a = 1; a <= 4; a++) {
      for (let b = a + 1; b <= 5; b++) {
        const labels = rows.map(r => {
          const x = r.nums[a - 1];
          const y = r.nums[b - 1];
          return x > y ? '龙' : (x < y ? '虎' : '和');
        });
        const s = streakAtHead(labels);
        pushLongItem(lhh, `${a}v${b}${s.tag}`, s.count);
      }
    }

    {
      const labels = rows.map(r => (niuValue(r.nums) === -1 ? '无牛' : '有牛'));
      const s = streakAtHead(labels);
      if (s.tag === '无牛') pushLongItem(niu, '无牛', s.count);
    }
    {
      const labels = rows.map(r => {
        const v = niuValue(r.nums);
        if (v === -1) return '无牛';
        return (v >= 6 || v === 10) ? '牛大' : '牛小';
      });
      const s = streakAtHead(labels);
      if (s.tag !== '无牛') pushLongItem(niu, s.tag, s.count);
    }
    {
      const labels = rows.map(r => {
        const v = niuValue(r.nums);
        if (v === -1) return '无牛';
        return v % 2 === 1 ? '牛单' : '牛双';
      });
      const s = streakAtHead(labels);
      if (s.tag !== '无牛') pushLongItem(niu, s.tag, s.count);
    }
    {
      const labels = rows.map(r => niuLabel(niuValue(r.nums)));
      const s = streakAtHead(labels);
      pushLongItem(niu, s.tag, s.count);
    }

    const sortDesc = arr => arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
    return { side: sortDesc(side), lhh: sortDesc(lhh), niu: sortDesc(niu) };
  }

  const LHH_POS = ['', '万', '千', '百', '十', '个'];

  function longItemParts(name) {
    const pos = name.match(/^([万千百十个])(.+)$/);
    if (pos) return { group: pos[1] + '位', tag: pos[2], full: name };
    const sum = name.match(/^总(.+)$/);
    if (sum) return { group: '总和', tag: sum[1], full: name };
    const lhh = name.match(/^(\d)v(\d)(.+)$/);
    if (lhh) {
      const a = +lhh[1];
      const b = +lhh[2];
      const group = `${LHH_POS[a]} vs ${LHH_POS[b]}`;
      return { group: '龙虎', tag: lhh[3], full: `${group} · ${lhh[3]}` };
    }
    if (name === '无牛' || name.startsWith('牛')) return { group: '斗牛', tag: name, full: name };
    return { group: '形态', tag: name, full: name };
  }

  function longTagClass(tag) {
    if (['大', '龙', '牛大'].includes(tag)) return 'tag-red';
    if (['小', '虎', '牛小'].includes(tag)) return 'tag-blue';
    if (['单', '牛单'].includes(tag)) return 'tag-gold';
    if (['双', '牛双'].includes(tag)) return 'tag-purple';
    if (tag === '和') return 'tag-green';
    if (tag === '无牛') return 'tag-muted';
    return 'tag-gold';
  }

  function longStreakBar(count) {
    const pct = Math.min(100, Math.round((count / 10) * 100));
    return `<div class="ffc-long-item__bar"><span style="width:${pct}%"></span></div>`;
  }

  function longTierClass(count) {
    if (count >= 5) return 'is-fire';
    if (count >= 3) return 'is-hot';
    return 'is-warm';
  }

  function renderLongDragonPanel() {
    const groups = buildLongDragonGroups();
    const list = groups[longTab] || [];
    const tabLabel = { side: '两面', lhh: '龙虎', niu: '斗牛' }[longTab] || '';
    if (!list.length) {
      $('#longSummary').text(`${tabLabel} · 暂无连续形态`);
      $('#longBody').html(`
        <div class="ffc-long-empty">
          <div class="ffc-long-empty__icon">◎</div>
          <div class="ffc-long-empty__text">当前没有 2 期以上的长龙</div>
          <div class="ffc-long-empty__hint">开奖后会自动更新</div>
        </div>`);
      return;
    }
    const top = list[0];
    const topParts = longItemParts(top.name);
    $('#longSummary').text(`${tabLabel} · 共 ${list.length} 条`);
    const hero = `
      <div class="ffc-long-hero ${longTierClass(top.count)}">
        <div class="ffc-long-hero__label">当前最长</div>
        <div class="ffc-long-hero__main">
          <span class="ffc-long-hero__tag ${longTagClass(topParts.tag)}">${topParts.tag}</span>
          <span class="ffc-long-hero__text">${topParts.full}</span>
          <span class="ffc-long-hero__num">${top.count}</span>
          <span class="ffc-long-hero__unit">期</span>
        </div>
      </div>`;
    const rows = list.map((item, idx) => {
      const parts = longItemParts(item.name);
      const tier = longTierClass(item.count);
      const rank = idx + 1;
      return `
        <div class="ffc-long-item ${tier}">
          <div class="ffc-long-item__rank">${rank}</div>
          <div class="ffc-long-item__tag ${longTagClass(parts.tag)}">${parts.tag}</div>
          <div class="ffc-long-item__info">
            <div class="ffc-long-item__name">${parts.group}<span class="sep">·</span>${parts.full}</div>
            ${longStreakBar(item.count)}
          </div>
          <div class="ffc-long-item__count">
            <b>${item.count}</b><small>连</small>
          </div>
        </div>`;
    }).join('');
    $('#longBody').html(hero + `<div class="ffc-long-list">${rows}</div>`);
  }

  function openLongSheet(open) {
    const $room = $('.ffc-room');
    if (open) {
      openPlaySheet(false);
      openPredictSheet(false);
      longTab = 'side';
      $('#longTabs button').removeClass('is-active');
      $('#longTabs button[data-tab="side"]').addClass('is-active');
      $('#longMask').prop('hidden', false);
      $('#longSheet').prop('hidden', false).addClass('is-open');
      $room.addClass('has-long');
      renderLongDragonPanel();
    } else {
      $('#longSheet').removeClass('is-open');
      $('#longMask').prop('hidden', true);
      setTimeout(() => {
        if (!$('#longSheet').hasClass('is-open')) $('#longSheet').prop('hidden', true);
      }, 300);
      $room.removeClass('has-long');
    }
  }

  /* ================= 智能预测 ================= */
  let predictTab = 'side';
  const PREDICT_WINDOW = 20;
  const PREDICT_STREAK_BREAK = 3;

  function flipSideTag(tag) {
    if (tag === '大') return '小';
    if (tag === '小') return '大';
    if (tag === '单') return '双';
    if (tag === '双') return '单';
    if (tag === '龙') return '虎';
    if (tag === '虎') return '龙';
    return tag;
  }

  function pickByTrend(labels, streakBreak) {
    const recent = labels.slice(0, PREDICT_WINDOW);
    if (!recent.length) return { pick: '—', reason: '数据不足', confidence: 0 };
    const s = streakAtHead(recent);
    if (s.count >= streakBreak && s.tag) {
      return {
        pick: flipSideTag(s.tag),
        reason: `已连续 ${s.count} 期「${s.tag}」，看反转`,
        confidence: Math.min(88, 52 + s.count * 9)
      };
    }
    const count = {};
    recent.forEach(l => { count[l] = (count[l] || 0) + 1; });
    const pick = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b, 'zh'))[0];
    const ratio = count[pick] / recent.length;
    return {
      pick,
      reason: `近 ${recent.length} 期「${pick}」出现 ${count[pick]} 次`,
      confidence: Math.round(48 + ratio * 42)
    };
  }

  function predictTagClass(tag) {
    return longTagClass(tag);
  }

  function predictCardHtml(name, data, play) {
    const pct = Math.max(0, Math.min(100, data.confidence || 0));
    const playAttr = play && parsePlay(play) ? ` data-predict-play="${play}"` : '';
    return `<div class="ffc-predict-card is-clickable"${playAttr} role="button" tabindex="0">
      <div class="ffc-predict-card__name">${name}</div>
      <div class="ffc-predict-card__pick">
        <span class="ffc-predict-card__tag ${predictTagClass(data.pick)}">${data.pick}</span>
        <span class="ffc-predict-card__conf">${pct}%</span>
      </div>
      <div class="ffc-predict-card__reason">${data.reason}</div>
      <div class="ffc-predict-card__bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }

  function buildDigitPredict(rows, posIdx) {
    const window = Math.min(PREDICT_WINDOW, rows.length);
    const freq = Array(10).fill(0);
    const lastSeen = Array(10).fill(window);
    for (let i = 0; i < window; i++) {
      const d = rows[i].nums[posIdx];
      freq[d]++;
      if (lastSeen[d] === window) lastSeen[d] = i;
    }
    const hot = freq
      .map((c, d) => ({ d, c }))
      .sort((a, b) => b.c - a.c || a.d - b.d)
      .slice(0, 2)
      .filter(x => x.c > 0);
    const cold = lastSeen
      .map((gap, d) => ({ d, gap }))
      .sort((a, b) => b.gap - a.gap || a.d - b.d)
      .slice(0, 2);
    return { hot, cold };
  }

  function getPredictIssue() {
    return $('#curIssue').attr('title') || getCurrentIssue();
  }

  function defaultPredictAmount() {
    return Math.max(1, parseInt($('#playAmount').val(), 10) || 100);
  }

  function fillPredictPlay(play) {
    if (!play || !parsePlay(play)) return;
    const amount = defaultPredictAmount();
    $('#chatInput').val(`${play}/${amount}`);
    composerAllin = false;
    updateComposerAction();
    showKeypad(true);
    openPredictSheet(false);
    App.toast(`已填入 ${play}/${amount}`);
  }

  function renderPredictPanel() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 5);
    const issue = getPredictIssue();
    $('#predictSummary').text(`下一期 · ${issue}`);
    if (!rows.length) {
      $('#predictBody').html(`
        <div class="ffc-long-empty">
          <div class="ffc-long-empty__icon">◎</div>
          <div class="ffc-long-empty__text">暂无开奖数据</div>
          <div class="ffc-long-empty__hint">等待开奖后生成预测</div>
        </div>`);
      return;
    }

    if (predictTab === 'side') {
      const sumMeta = rows.map(r => sideOfSum(sumOf(r.nums)));
      const sumBig = pickByTrend(sumMeta.map(m => (m.big ? '大' : '小')), PREDICT_STREAK_BREAK);
      const sumOdd = pickByTrend(sumMeta.map(m => (m.odd ? '单' : '双')), PREDICT_STREAK_BREAK);
      const cards = [
        predictCardHtml('总和 · 大小', sumBig, sumBig.pick),
        predictCardHtml('总和 · 单双', sumOdd, sumOdd.pick)
      ];
      POS_LABELS.forEach((pos, idx) => {
        const ballMeta = rows.map(r => sideOfBall(r.nums[idx]));
        const bigData = pickByTrend(ballMeta.map(m => (m.big ? '大' : '小')), PREDICT_STREAK_BREAK);
        const oddData = pickByTrend(ballMeta.map(m => (m.odd ? '单' : '双')), PREDICT_STREAK_BREAK);
        cards.push(predictCardHtml(`${pos}位 · 大小`, bigData, pos + bigData.pick));
        cards.push(predictCardHtml(`${pos}位 · 单双`, oddData, pos + oddData.pick));
      });
      const hero = `
        <div class="ffc-predict-hero">
          <div class="ffc-predict-hero__label">核心参考</div>
          <div class="ffc-predict-hero__main">
            <div class="ffc-predict-hero__tags">
              <span class="ffc-predict-card__tag ${predictTagClass(sumBig.pick)} is-clickable" data-predict-play="${sumBig.pick}" role="button" tabindex="0">${sumBig.pick}</span>
              <span class="ffc-predict-card__tag ${predictTagClass(sumOdd.pick)} is-clickable" data-predict-play="${sumOdd.pick}" role="button" tabindex="0">${sumOdd.pick}</span>
            </div>
            <div class="ffc-predict-hero__note">总和倾向 ${sumBig.pick}${sumOdd.pick}，${sumBig.reason}</div>
          </div>
        </div>`;
      $('#predictBody').html(hero + `<div class="ffc-predict-grid">${cards.join('')}</div>`);
      return;
    }

    if (predictTab === 'digit') {
      const cols = POS_LABELS.map((pos, idx) => {
        const stat = buildDigitPredict(rows, idx);
        const hotHtml = stat.hot.length
          ? stat.hot.map(x =>
            `<span class="ffc-ball-digit is-clickable" data-predict-play="${pos}${x.d}" role="button" tabindex="0">${x.d}</span>`
          ).join('')
          : '<span class="ffc-predict-card__reason">—</span>';
        const coldHtml = stat.cold.map(x =>
          `<span class="ffc-ball-digit is-cold is-clickable" data-predict-play="${pos}${x.d}" role="button" tabindex="0">${x.d}</span>`
        ).join('');
        return `<div class="ffc-predict-digit-col">
          <div class="ffc-predict-digit-col__pos">${pos}</div>
          <div class="ffc-predict-digit-col__label">热号</div>
          <div class="ffc-predict-digit-balls">${hotHtml}</div>
          <div class="ffc-predict-digit-col__label">遗漏</div>
          <div class="ffc-predict-digit-balls">${coldHtml}</div>
        </div>`;
      }).join('');
      $('#predictBody').html(`
        <div class="ffc-predict-hero">
          <div class="ffc-predict-hero__label">定位参考</div>
          <div class="ffc-predict-hero__note">近 ${Math.min(PREDICT_WINDOW, rows.length)} 期各位置热号与遗漏号，可作定位胆参考</div>
        </div>
        <div class="ffc-predict-digit-grid">${cols}</div>`);
      return;
    }

    const shapeRows = [
      { seg: '前三', key: '前三' },
      { seg: '中三', key: '中三' },
      { seg: '后三', key: '后三' }
    ].map(item => {
      const labels = rows.map(r => shapeOf(segOf(r.nums, item.key)));
      return { ...item, data: pickByTrend(labels, 2) };
    });
    const niuLabels = rows.map(r => niuLabel(niuValue(r.nums)));
    const niuData = pickByTrend(niuLabels, 2);
    const list = shapeRows.map(item => {
      const play = item.key + item.data.pick;
      return `
      <div class="ffc-predict-shape-item is-clickable" data-predict-play="${play}" role="button" tabindex="0">
        <div class="ffc-predict-shape-item__seg">${item.seg}</div>
        <div class="ffc-predict-shape-item__info">
          <div class="ffc-predict-shape-item__pick">${item.data.pick}</div>
          <div class="ffc-predict-shape-item__reason">${item.data.reason}</div>
        </div>
        <div class="ffc-predict-shape-item__conf">${item.data.confidence}%</div>
      </div>`;
    }).join('');
    const niuBlock = `
      <div class="ffc-predict-shape-item is-clickable" data-predict-play="${niuData.pick}" role="button" tabindex="0">
        <div class="ffc-predict-shape-item__seg">斗牛</div>
        <div class="ffc-predict-shape-item__info">
          <div class="ffc-predict-shape-item__pick">${niuData.pick}</div>
          <div class="ffc-predict-shape-item__reason">${niuData.reason}</div>
        </div>
        <div class="ffc-predict-shape-item__conf">${niuData.confidence}%</div>
      </div>`;
    $('#predictBody').html(`
      <div class="ffc-predict-hero">
        <div class="ffc-predict-hero__label">形态参考</div>
        <div class="ffc-predict-hero__note">前三 / 中三 / 后三形态与斗牛走势预测</div>
      </div>
      <div class="ffc-predict-shape-list">${list}${niuBlock}</div>`);
  }

  function openPredictSheet(open) {
    const $room = $('.ffc-room');
    if (open) {
      openPlaySheet(false);
      openLongSheet(false);
      predictTab = 'side';
      $('#predictTabs button').removeClass('is-active');
      $('#predictTabs button[data-tab="side"]').addClass('is-active');
      $('#predictMask').prop('hidden', false);
      $('#predictSheet').prop('hidden', false).addClass('is-open');
      $room.addClass('has-predict');
      renderPredictPanel();
    } else {
      $('#predictSheet').removeClass('is-open');
      $('#predictMask').prop('hidden', true);
      setTimeout(() => {
        if (!$('#predictSheet').hasClass('is-open')) $('#predictSheet').prop('hidden', true);
      }, 300);
      $room.removeClass('has-predict');
    }
  }

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
      const rows = settled[name].filter(r => r.winAmount > 0);
      const totalWin = rows.reduce((s, r) => s + r.winAmount, 0);
      const totalProfit = settled[name].reduce((s, r) => s + r.profit, 0);
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
    saveStats(user.uid, stats);
    refreshStats();
  }

  /* ================= 倒计时：1:56 → 00:00 → 准备中 ================= */
  function fmtMmss(sec) {
    const s = Math.max(0, Math.floor(sec));
    return pad(Math.floor(s / 60), 2) + ':' + pad(s % 60, 2);
  }
  function renderCountdownDigits(sec) {
    const s = Math.max(0, Math.floor(sec));
    const text = pad(Math.floor(s / 60), 2) + pad(s % 60, 2);
    const $cells = $('#cdDigits .ffc-timer__cell');
    for (let i = 0; i < 4; i++) {
      $cells.eq(i).text(text[i]);
    }
  }
  function updateCountdownUI(r) {
    const $box = $('#countdownBox').removeClass('is-preparing');
    if (r <= PREP_SEC) {
      $box.addClass('is-preparing');
      $('#cdDigits').prop('hidden', true);
      $('#cdPrep').prop('hidden', false);
      return;
    }
    $('#cdDigits').prop('hidden', false);
    $('#cdPrep').prop('hidden', true);
    renderCountdownDigits(r - PREP_SEC);
  }

  /* ================= 统计 ================= */
  function getStats(uid) {
    const key = 'ffc_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('ffc_stats_' + uid, JSON.stringify(s));
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
    return Array.isArray(lastDraw) && lastDraw.length > 0;
  }
  function buildHistory(count) {
    const rows = [];
    const base = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
    for (let i = 0; i < count; i++) {
      const nums = i === 0 && hasLastDraw() ? lastDraw : randomDraw();
      rows.push({
        issue: fmtIssue(base - i),
        nums,
        gy: gyMeta(nums).text,
        lh: lhRow(nums)
      });
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
    const avatar = opts.avatarHtml
      ? opts.avatarHtml
      : `<div class="ffc-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="ffc-msg__meta">
            <span class="ffc-msg__name">${opts.name}</span>
            <span class="ffc-msg__time">${time}</span>
          </div>`;
    const bubbleCls = isRobot ? ' ffc-msg__bubble--bot' : '';
    const bubble = `<div class="ffc-msg__bubble${bubbleCls}">${opts.html}</div>`;
    const html = isSelf
      ? `<div class="ffc-msg is-self">
        <div class="ffc-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="ffc-msg${isRobot ? ' is-robot' : ''}">
        ${avatar}
        <div class="ffc-msg__body">
          ${meta}
          ${bubble}
        </div>
      </div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }

  function pushRobotClose(issue) {
    const botAv = avatarHtml('机', 0);
    appendMsg({
      name: ROBOT.name,
      avatarHtml: botAv,
      robot: true,
      html: closeNoticeHtml(issue)
    });
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatarHtml: botAv,
        robot: true,
        html: buildBetListVerifyHtml(issue)
      });
    }, 400);
  }

  function pushRobotResult(nums, issue) {
    const settled = settleIssue(issue, nums);
    applyUserSettle(issue, settled);
    settleUserBetLog(issue, nums, settled[user.name] || null);
    const botAv = avatarHtml('机', 0);
    const resultDelay = 600;
    const revealMs = resultRevealDurationMs();
    const calcPause = 1000;
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatarHtml: botAv,
        robot: true,
        html: resultCardHtml(nums, issue)
      });
      const card = $('#chatFeed .ffc-bot-card--result').last()[0];
      if (card) FfcResultCard.bindReveal(card, nums);
    }, resultDelay);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatarHtml: botAv,
        robot: true,
        html: buildWinListVerifyHtml(issue, null)
      });
      setTimeout(() => {
        const $bubble = $('#chatFeed .ffc-bot-card--win.is-calculating').last().closest('.ffc-msg__bubble');
        if ($bubble.length) {
          $bubble.html(buildWinListVerifyHtml(issue, settled));
          scrollChat();
        }
      }, calcPause);
    }, resultDelay + revealMs);
  }

  function seedChat() {
    const names = App.NAME_PREFIX || ['幸运'];
    const suffix = App.NAME_SUFFIX || ['玩家'];
    MOCK_NAMES.length = 0;
    for (let i = 0; i < 8; i++) {
      const name = names[i % names.length] + suffix[i % suffix.length];
      const betText = `${PLAY_ITEMS[i % PLAY_ITEMS.length]}/${[20, 50, 100][i % 3]}`;
      MOCK_NAMES.push({ name });
      appendMsg({ name, avatarHtml: avatarHtml(name, i), html: betText });
      recordBet(name, betText);
    }
    const myBet = PLAY_ITEMS[0] + '/100';
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: myBet
    });
    recordBet(user.name, myBet);
  }

  /* ================= 键盘 ================= */
  function initKeypad() {
    const rows = [
      { left: '万', mid: ['1', '2', '3'], right: '删除', del: true },
      { left: '千', mid: ['4', '5', '6'], right: '大' },
      { left: '百', mid: ['7', '8', '9'], right: '小' },
      { left: '十', mid: ['0', '/', '00'], right: '单' },
      { left: '个', mid: ['500'], right: '双', amtWide: true }
    ];
    let html = '';
    rows.forEach(row => {
      html += `<button type="button" class="ffc-key ffc-key--pos" data-key="${row.left}">${row.left}</button>`;
      if (row.amtWide) {
        html += `<button type="button" class="ffc-key ffc-key--amt" data-key="${row.mid[0]}">${row.mid[0]}</button>`;
      } else {
        row.mid.forEach(k => {
          html += `<button type="button" class="ffc-key" data-key="${k}">${k}</button>`;
        });
      }
      const cls = row.del ? ' ffc-key--del' : ' ffc-key--side';
      html += `<button type="button" class="ffc-key${cls}" data-key="${row.right}">${row.right}</button>`;
    });
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.ffc-room');
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
    composerAllin = false;
    if (text === '删除') {
      $in.val(v.slice(0, -1));
      updateComposerAction();
      return;
    }
    if (SIDE_CHARS.includes(text)) {
      const trimmed = v.replace(/\s+$/, '');
      if (trimmed && POS_CHARS.includes(trimmed.slice(-1))) {
        $in.val(trimmed + text);
      } else {
        $in.val(trimmed + '总' + text);
      }
      updateComposerAction();
      return;
    }
    $in.val(v + text);
    updateComposerAction();
  }

  function updateComposerAction() {
    const hasText = $('#chatInput').val().trim().length > 0;
    const $btn = $('#plusBtn');
    if (hasText) {
      $btn.addClass('is-send').text('发送').attr('aria-label', '发送');
    } else {
      $btn.removeClass('is-send').text('+').attr('aria-label', '更多');
    }
  }

  function sendBetMessage() {
    const text = $('#chatInput').val().trim();
    if (!text) return;
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    let lines;
    if (composerAllin) {
      composerAllin = false;
      const m = text.match(/^(.+?)\/(.+)$/);
      if (!m) {
        App.toast('格式：玩法/金额，如 万千单/50');
        return;
      }
      const plays = expandPlayPart(m[1].trim());
      if (!plays || !plays.length) {
        App.toast('玩法无效，请检查后再发送');
        return;
      }
      lines = resolveBetAmounts(plays, '梭哈');
      if (!lines) {
        App.toast('余额不足，无法梭哈');
        return;
      }
    } else {
      lines = parseBetInput(text);
      if (!lines) {
        App.toast('格式：玩法/金额，如 十百59/100、万百十单/500、万单/梭哈');
        return;
      }
    }
    const display = lines.map(l => `${l.play}/${l.amount}`).join('<br>');
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: display
    });
    recordBetLines(user.name, lines);
    lastBetText = formatResolvedBets(lines);
    $('#chatInput').val('');
    updateComposerAction();
    if (lines.length > 1) App.toast(`投注成功 · ${lines.length}注`);
  }

  function toggleDrawPanel() {
    drawPanelOpen = !drawPanelOpen;
    $('#drawBar').toggleClass('is-open', drawPanelOpen);
    $('#drawToggle').attr('aria-expanded', drawPanelOpen);
  }

  function pushRandomBet() {
    if (!MOCK_NAMES.length || !isBettingOpen()) return;
    const n = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    const betText = `${PLAY_ITEMS[Math.floor(Math.random() * PLAY_ITEMS.length)]}/${[10, 20, 50, 100, 200][Math.floor(Math.random() * 5)]}`;
    appendMsg({ name: n.name, avatarHtml: avatarHtml(n.name, n.name.length * 7), html: betText });
    recordBet(n.name, betText);
  }

  function openPlusMenu(open) {
    const $room = $('.ffc-room');
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

  function openPlaySheet(open) {
    const $room = $('.ffc-room');
    if (open) {
      $('#playMask').prop('hidden', false);
      $('#playSheet').prop('hidden', false).addClass('is-open');
      $room.addClass('has-play');
      renderPlayPanel();
      updatePlaySelected();
    } else {
      $('#playSheet').removeClass('is-open');
      $('#playMask').prop('hidden', true);
      setTimeout(() => { if (!$('#playSheet').hasClass('is-open')) $('#playSheet').prop('hidden', true); }, 300);
      $room.removeClass('has-play');
    }
  }

  /* ================= 玩法面板：左分类 · 右选项 · 底投注 ================= */
  const AMOUNT_CHIPS = [10, 20, 50, 100, 200, 500];
  const PLAY_CATEGORIES = [
    {
      id: 'twoSide',
      title: '两面',
      hint: '总和≥23为大 · 单球≥5为大 · 赔率 1.995',
      subs: null,
      sideGroups: [
        { label: '总和', prefix: '', odds: ODDS.sumSide },
        ...Object.keys(POS).map(p => ({ label: p + '位', prefix: p, odds: ODDS.ballSide }))
      ]
    },
    {
      id: 'position',
      title: '定位胆',
      hint: '选位置与号码 · 赔率 9.95',
      subs: Object.keys(POS),
      mode: 'positionDigit',
      odds: ODDS.position
    },
    {
      id: 'anyDigit',
      title: '不定位',
      hint: '三位含所选号码即中 · 赔率 3.6',
      subs: Object.keys(SEG),
      mode: 'segDigit',
      odds: ODDS.anyDigit
    },
    {
      id: 'group3',
      title: '三星组三',
      hint: '选2个号码 · 赔率 260',
      subs: Object.keys(SEG),
      mode: 'group3',
      pickCount: 2,
      odds: ODDS.group3
    },
    {
      id: 'group6',
      title: '三星组六',
      hint: '选3个号码 · 赔率 125',
      subs: Object.keys(SEG),
      mode: 'group6',
      pickCount: 3,
      odds: ODDS.group6
    },
    {
      id: 'lhh',
      title: '龙虎和',
      hint: '龙/虎 1.99 · 和 9',
      subs: null,
      items() {
        const list = [];
        for (let a = 1; a <= 4; a++) {
          for (let b = a + 1; b <= 5; b++) {
            const pr = a + 'v' + b;
            ['龙', '虎', '和'].forEach(x => {
              list.push({ play: pr + x, label: pr + x, odds: x === '和' ? ODDS.tie : ODDS.dragon });
            });
          }
        }
        return list;
      }
    },
    {
      id: 'niu',
      title: '斗牛',
      hint: '任意3位和为10的倍数有牛',
      subs: null,
      items() {
        const list = [{ play: '无牛', label: '无牛', odds: ODDS.noNiu }];
        for (let i = 1; i <= 9; i++) list.push({ play: '牛' + i, label: '牛' + i, odds: ODDS.niu });
        list.push({ play: '牛牛', label: '牛牛', odds: ODDS.niu });
        ['牛大', '牛小', '牛单', '牛双'].forEach(x => list.push({ play: x, label: x, odds: ODDS.niuSide }));
        return list;
      }
    },
    {
      id: 'shape',
      title: '前中后',
      hint: '豹子75 顺子14.5 对子3.3 半顺2.5 杂六3',
      subs: Object.keys(SEG),
      mode: 'shape',
      shapes: ['豹子', '顺子', '对子', '半顺', '杂六']
    }
  ];

  let playCatIdx = 0;
  let playSubIdx = 0;
  /** @type {string[]} 已选玩法（可多选） */
  let playSelectedList = [];
  let playPickedDigits = [];

  function currentPlayCat() {
    return PLAY_CATEGORIES[playCatIdx];
  }
  function currentPlaySub() {
    const cat = currentPlayCat();
    return cat.subs ? cat.subs[playSubIdx] : '';
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

  function digitItems(odds) {
    return Array.from({ length: 10 }, (_, d) => ({
      play: String(d),
      label: String(d),
      odds,
      isDigit: true
    }));
  }

  function buildPlayFromDigits(cat) {
    const sub = currentPlaySub();
    const digits = playPickedDigits.slice().sort((a, b) => a - b);
    if (cat.mode === 'positionDigit' && digits.length === 1) {
      return sub + digits[0];
    }
    if (cat.mode === 'segDigit' && digits.length === 1) {
      return sub + digits[0];
    }
    if (cat.mode === 'group3' && digits.length === 2) {
      return sub + '组三' + digits.join('');
    }
    if (cat.mode === 'group6' && digits.length === 3) {
      return sub + '组六' + digits.join('');
    }
    return '';
  }

  function updatePlaySelected() {
    if (!playSelectedList.length) {
      $('#playSelected').text('—');
      return;
    }
    const n = playSelectedList.length;
    const preview = playSelectedList.slice(0, 4).join('、');
    $('#playSelected').text(n > 4 ? `${preview}… 共${n}项` : (n > 1 ? `${preview}（${n}项）` : preview));
  }

  function resetPlayPick(clearAll) {
    playPickedDigits = [];
    if (clearAll) playSelectedList = [];
    updatePlaySelected();
  }

  function initPlaySheet() {
    $('#playNav').html(PLAY_CATEGORIES.map((c, i) =>
      `<button type="button" class="ffc-play-nav__item${i === playCatIdx ? ' is-active' : ''}" data-idx="${i}">${c.title}</button>`
    ).join(''));

    $('#playAmountChips').html(AMOUNT_CHIPS.map(a =>
      `<button type="button" class="ffc-play-foot__chip${a === 100 ? ' is-active' : ''}" data-amt="${a}">${a}</button>`
    ).join(''));
  }

  function renderPlayPanel() {
    const cat = currentPlayCat();
    $('#playHint').text(cat.hint);

    const $sub = $('#playSub');
    if (cat.subs && cat.subs.length) {
      $sub.removeClass('is-hidden').prop('hidden', false).html(
        cat.subs.map((s, i) =>
          `<button type="button" class="ffc-play-sub__btn${i === playSubIdx ? ' is-active' : ''}" data-sub="${i}">${s}</button>`
        ).join('')
      );
    } else {
      $sub.addClass('is-hidden').prop('hidden', true).empty();
    }

    const $grid = $('#playGrid');
    let html = '';
    let isDigits = false;

    if (cat.mode === 'positionDigit' || cat.mode === 'segDigit') {
      isDigits = true;
      const sub = currentPlaySub();
      html = digitItems(cat.odds).map(it => {
        const playStr = sub + it.play;
        const picked = isPlaySelected(playStr);
        return `<button type="button" class="ffc-play-item${picked ? ' is-active' : ''}" data-play="${it.play}" data-digit="1"><span>${it.label}</span><small>${it.odds}</small></button>`;
      }).join('');
    } else if (cat.mode === 'group3' || cat.mode === 'group6') {
      isDigits = true;
      html = digitItems(cat.odds).map(it => {
        const picking = playPickedDigits.indexOf(+it.play) >= 0;
        return `<button type="button" class="ffc-play-item${picking ? ' is-picked' : ''}" data-play="${it.play}" data-digit="1"><span>${it.label}</span></button>`;
      }).join('');
    } else if (cat.mode === 'shape') {
      html = cat.shapes.map(shape => {
        const play = currentPlaySub() + shape;
        const active = isPlaySelected(play);
        return `<button type="button" class="ffc-play-item${active ? ' is-active' : ''}" data-play="${play}"><span>${shape}</span><small>${SHAPE_ODDS[shape]}</small></button>`;
      }).join('');
    } else if (cat.id === 'twoSide' && cat.sideGroups) {
      html = cat.sideGroups.map(g => {
        const cells = ['大', '小', '单', '双'].map(s => {
          const play = g.prefix + s;
          const active = isPlaySelected(play);
          return `<button type="button" class="ffc-play-item ffc-play-item--side${active ? ' is-active' : ''}" data-play="${play}"><span>${play}</span><small>${g.odds}</small></button>`;
        }).join('');
        return `<div class="ffc-play-section"><div class="ffc-play-section__grid">${cells}</div></div>`;
      }).join('');
    } else if (typeof cat.items === 'function') {
      html = cat.items().map(it => {
        const active = isPlaySelected(it.play);
        return `<button type="button" class="ffc-play-item${active ? ' is-active' : ''}" data-play="${it.play}"><span>${it.label}</span><small>${it.odds}</small></button>`;
      }).join('');
    }

    $grid.toggleClass('is-digits', isDigits).toggleClass('is-two-side', cat.id === 'twoSide').html(html);
    $grid.scrollTop(0);
    updatePlaySelected();
  }

  function submitPlayBet() {
    if (!playSelectedList.length) {
      App.toast('请先选择玩法');
      return;
    }
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    const amount = Math.max(1, parseInt($('#playAmount').val(), 10) || 0);
    if (!amount) {
      App.toast('请输入有效金额');
      return;
    }
    const validPlays = playSelectedList.filter(p => parsePlay(p));
    if (!validPlays.length) {
      App.toast('玩法无效，请重新选择');
      return;
    }
    const lines = validPlays.map(p => p + '/' + amount);
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: lines.join('<br>')
    });
    lines.forEach(line => recordBet(user.name, line));
    lastBetText = lines[lines.length - 1];
    playSelectedList = [];
    openPlaySheet(false);
    App.toast(`投注成功 · ${lines.length}注`);
  }

  function initPlaySheetEvents() {
    $('#playNav').on('click', '.ffc-play-nav__item', function () {
      playCatIdx = +$(this).data('idx');
      playSubIdx = 0;
      resetPlayPick(true);
      $('#playNav .ffc-play-nav__item').removeClass('is-active');
      $(this).addClass('is-active');
      renderPlayPanel();
    });

    $('#playSub').on('click', '.ffc-play-sub__btn', function () {
      playSubIdx = +$(this).data('sub');
      playPickedDigits = [];
      $('#playSub .ffc-play-sub__btn').removeClass('is-active');
      $(this).addClass('is-active');
      renderPlayPanel();
      updatePlaySelected();
    });

    $('#playGrid').on('click', '.ffc-play-item', function () {
      const cat = currentPlayCat();
      const play = String($(this).data('play'));
      const isDigit = $(this).data('digit');

      if (isDigit && (cat.mode === 'group3' || cat.mode === 'group6')) {
        const d = +play;
        const idx = playPickedDigits.indexOf(d);
        if (idx >= 0) {
          playPickedDigits.splice(idx, 1);
        } else {
          playPickedDigits.push(d);
        }
        if (playPickedDigits.length >= cat.pickCount) {
          const built = buildPlayFromDigits(cat);
          if (built && parsePlay(built)) {
            togglePlaySelect(built);
          }
          playPickedDigits = [];
          updatePlaySelected();
        }
        renderPlayPanel();
        return;
      }

      if (isDigit && (cat.mode === 'positionDigit' || cat.mode === 'segDigit')) {
        const playStr = currentPlaySub() + play;
        togglePlaySelect(playStr);
        $(this).toggleClass('is-active', isPlaySelected(playStr));
        updatePlaySelected();
        return;
      }

      togglePlaySelect(play);
      $(this).toggleClass('is-active', isPlaySelected(play));
      updatePlaySelected();
    });

    $('#playAmountChips').on('click', '.ffc-play-foot__chip', function () {
      const amt = +$(this).data('amt');
      $('#playAmount').val(amt);
      $('#playAmountChips .ffc-play-foot__chip').removeClass('is-active');
      $(this).addClass('is-active');
    });

    $('#playAmountMinus').on('click', () => {
      const v = Math.max(1, (parseInt($('#playAmount').val(), 10) || 1) - 10);
      $('#playAmount').val(v);
      $('#playAmountChips .ffc-play-foot__chip').removeClass('is-active');
    });
    $('#playAmountPlus').on('click', () => {
      const v = (parseInt($('#playAmount').val(), 10) || 0) + 10;
      $('#playAmount').val(v);
      $('#playAmountChips .ffc-play-foot__chip').removeClass('is-active');
    });

    $('#playSubmit').on('click', submitPlayBet);
  }

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
  setCurIssueDisplay(fmtIssue(lastIssueSeq + 1));
  updateCountdownUI(getRoundRemain());
  initKeypad();
  initPlaySheet();
  initPlaySheetEvents();

  seedChat();

  function tick() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / INTERVAL) + 1;
    const r = INTERVAL - (elapsed % INTERVAL);
    const issueCur = fmtIssue(seq);
    setCurIssueDisplay(issueCur);
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
      if ($('#longSheet').hasClass('is-open')) renderLongDragonPanel();
      if ($('#predictSheet').hasClass('is-open')) renderPredictPanel();
    }
  }
  setInterval(tick, 1000);
  setInterval(pushRandomBet, 8000);
  tick();

  // ===== 事件 =====
  $('#backBtn').on('click', () => {
    App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
  });

  $('#btnCs').on('click', () => App.go('../../client-app/pages/cs/cs.html' + q));

  $('#btnExpand').on('click', () => openPlaySheet(true));
  $('#playSheetClose, #playMask').on('click', () => openPlaySheet(false));

  $('#btnRedpack').on('click', () => App.toast('红包 · 开发中'));

  $('#btnSlip').on('click', () => {
    const sep = q.includes('?') ? '&' : '?';
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=ffc');
  });
  $('#btnLong').on('click', () => openLongSheet(true));
  $('#longSheetClose, #longMask').on('click', () => openLongSheet(false));
  $('#longTabs').on('click', 'button[data-tab]', function () {
    longTab = $(this).data('tab');
    $('#longTabs button').removeClass('is-active');
    $(this).addClass('is-active');
    renderLongDragonPanel();
  });
  $('#btnPredict').on('click', () => openPredictSheet(true));
  $('#predictSheetClose, #predictMask').on('click', () => openPredictSheet(false));
  $('#predictTabs').on('click', 'button[data-tab]', function () {
    predictTab = $(this).data('tab');
    $('#predictTabs button').removeClass('is-active');
    $(this).addClass('is-active');
    renderPredictPanel();
  });
  $('#predictBody').on('click', '[data-predict-play]', function () {
    fillPredictPlay(String($(this).data('predict-play') || ''));
  });
  $('#predictBody').on('keydown', '[data-predict-play]', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fillPredictPlay(String($(this).data('predict-play') || ''));
    }
  });

  $('#drawToggle').on('click', toggleDrawPanel);

  $('#chatInput').on('focus', () => {
    showKeypad(true);
    openPlusMenu(false);
  });

  $('#chatInput').on('input', () => {
    composerAllin = false;
    updateComposerAction();
  });

  $('#chatInput').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendBetMessage();
    }
  });

  $('#keyGrid').on('click', '.ffc-key', function () {
    insertInput($(this).data('key'));
  });

  $('#keypad').on('click', '[data-cmd]', function () {
    const cmd = $(this).data('cmd');
    if (cmd === 'cancel') {
      composerAllin = false;
      $('#chatInput').val('');
      updateComposerAction();
      return;
    }
    if (cmd === 'repeat' && lastBetText) {
      $('#chatInput').val(lastBetText);
      updateComposerAction();
      return;
    }
    if (cmd === 'allin') {
      applyAllinToInput();
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
    if ($('#chatInput').val().trim()) {
      sendBetMessage();
      return;
    }
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
    if (url) App.go(url + q);
    else App.toast('即将开放');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#keypad, #chatInput, .ffc-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.ffc-plus-menu, #plusBtn, .ffc-menu-mask').length) {
        showKeypad(false);
      }
    }
  });

  updateComposerAction();
});
