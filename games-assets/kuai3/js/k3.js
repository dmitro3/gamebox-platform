/**
 * 1分快三 · 聊天投注房
 * 3 颗骰子 · 55s 一期（51s 下注倒计时 + 4s 准备中）
 * BUILD 40 — 与 index.html ?v= 保持一致
 */
$(function () {
  // 总周期 55s；准备中 = 3 骰滚停实测占满约 4s；倒计时从 00:51 起
  const INTERVAL = 55;
  const PREP_SEC = 4;

  function fixAvatar(url) {
    const fallback = '/images/avatars/001.jpg';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    return fallback;
  }

  function avatarHtml(name, seed) {
    const hue = (seed * 41 + (name.charCodeAt(0) || 0) * 17) % 360;
    const ch = name.charAt(0) || '?';
    return `<div class="k3-msg__avatar k3-msg__avatar--gen" style="--av-hue:${hue}"><span>${ch}</span></div>`;
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
  let drawPanelOpen = false;
  const closedIssues = new Set();
  const drawnIssues = new Set();
  let pendingDrawRow = null;
  let rollingCardIssue = null;
  const MOCK_NAMES = [];
  const issueBetBook = {};

  const ODDS = {
    side: 1.98,
    sum: 6.5, // 兜底；实际按 SUM_ODDS 分档
    dice: 2.0, // 出现 1 次基准；结算按出现次数 2/3/4
    pairN: 10,
    tripletN: 150,
    tripletAny: 24,
    straight: 8,
    alldiff: 1.95,
    long: 5.8,
  };
  /** 和值分档赔率（含本返还） */
  const SUM_ODDS = {
    4: 50, 5: 18, 6: 14, 7: 12, 8: 8, 9: 6.5, 10: 6,
    11: 6, 12: 6.5, 13: 8, 14: 12, 15: 14, 16: 18, 17: 50,
  };
  const SUOHA_WORDS = new Set(['梭哈', '全下', 'allin']);
  const SIDE_CHARS = '大小单双';
  const DICE_CHARS = '123456';

  function randomDraw() {
    return [0, 1, 2].map(() => 1 + Math.floor(Math.random() * 6));
  }

  function isTriplet(nums) {
    return nums[0] === nums[1] && nums[1] === nums[2];
  }

  function countOf(nums, n) {
    return nums.filter(x => x === n).length;
  }

  function isStraightShape(nums) {
    if (isTriplet(nums)) return false;
    const s = nums.slice().sort((a, b) => a - b);
    return s[0] + 1 === s[1] && s[1] + 1 === s[2];
  }

  function isPairShape(nums) {
    if (isTriplet(nums)) return false;
    return nums[0] === nums[1] || nums[1] === nums[2] || nums[0] === nums[2];
  }

  function isSanButong(nums) {
    if (isTriplet(nums) || isPairShape(nums) || isStraightShape(nums)) return false;
    return true;
  }

  function longPairs() {
    const out = [];
    for (let a = 1; a <= 6; a++) {
      for (let b = a + 1; b <= 6; b++) out.push({ a, b, play: '长牌' + a + b });
    }
    return out;
  }

  function sumMeta(nums) {
    const sum = nums.reduce((a, b) => a + b, 0);
    const triplet = isTriplet(nums);
    let size = '—';
    if (!triplet) size = sum >= 11 ? '大' : '小';
    const parity = sum % 2 ? '单' : '双';
    const text = triplet ? `${sum} 豹` : `${sum} ${size} ${parity}`;
    return { sum, text, size, parity, triplet };
  }

  function shapeRow(nums) {
    if (isTriplet(nums)) return '三同号';
    if (isPairShape(nums)) return '二同号';
    if (isStraightShape(nums)) return '三连号';
    return '三不同号';
  }

  function diceHtml(n, cls) {
    return K3ResultCard.diceHtml(n, cls);
  }

  function predictDiceBtn(n, cold) {
    const coldCls = cold ? ' is-cold' : '';
    return `<button type="button" class="k3-predict-dice-btn${coldCls}" data-predict-play="三军${n}">${diceHtml(n, 'sm')}</button>`;
  }

  function parsePlay(raw) {
    const t = String(raw || '').replace(/\s+/g, '');
    let m;
    if ((m = t.match(/^(大|小|单|双)$/))) return { type: 'side', side: m[1], odds: ODDS.side };
    if ((m = t.match(/^和(?:值)?([4-9]|1[0-7])$/))) {
      const sum = +m[1];
      return { type: 'sum', sum, odds: SUM_ODDS[sum] || ODDS.sum };
    }
    if ((m = t.match(/^三军([1-6])$/))) return { type: 'dice', num: +m[1], odds: ODDS.dice };
    if ((m = t.match(/^独([1-6])$/))) return { type: 'dice', num: +m[1], odds: ODDS.dice };
    if ((m = t.match(/^二同([1-6])$/))) return { type: 'pairN', num: +m[1], odds: ODDS.pairN };
    if ((m = t.match(/^三同([1-6])$/))) return { type: 'tripletN', num: +m[1], odds: ODDS.tripletN };
    if ((m = t.match(/^三同号([1-6])$/))) return { type: 'tripletN', num: +m[1], odds: ODDS.tripletN };
    if (t === '三同号' || t === '豹子' || t === '豹') {
      return { type: 'tripletAny', odds: ODDS.tripletAny };
    }
    if (t === '三连号' || t === '顺子') return { type: 'straight', odds: ODDS.straight };
    if (t === '三不同号' || t === '杂六') return { type: 'alldiff', odds: ODDS.alldiff };
    if ((m = t.match(/^长牌?([1-6])([1-6])$/))) {
      const a = +m[1];
      const b = +m[2];
      if (a !== b) {
        return { type: 'long', a: Math.min(a, b), b: Math.max(a, b), odds: ODDS.long };
      }
    }
    return null;
  }

  function settleBet(play, amount, nums) {
    const p = parsePlay(play);
    if (!p) return { winAmount: 0, profit: -amount, hit: '' };
    const triplet = isTriplet(nums);
    const meta = sumMeta(nums);
    let win = false;
    switch (p.type) {
      case 'side':
        if (!triplet) {
          if (p.side === '大') win = meta.sum >= 11 && meta.sum <= 17;
          else if (p.side === '小') win = meta.sum >= 4 && meta.sum <= 10;
          else if (p.side === '单') win = meta.sum % 2 === 1;
          else win = meta.sum % 2 === 0;
        }
        break;
      case 'sum':
        win = meta.sum === p.sum;
        break;
      case 'dice': {
        const c = countOf(nums, p.num);
        if (c <= 0) return { winAmount: 0, profit: -amount, hit: '' };
        const diceOdds = c === 1 ? 2 : (c === 2 ? 3 : 4);
        const winAmount = Math.round(amount * diceOdds);
        return { winAmount, profit: winAmount - amount, hit: play };
      }
      case 'pairN':
        win = countOf(nums, p.num) === 2;
        break;
      case 'tripletN':
        win = countOf(nums, p.num) === 3;
        break;
      case 'tripletAny':
        win = triplet;
        break;
      case 'straight':
        win = isStraightShape(nums);
        break;
      case 'alldiff':
        win = isSanButong(nums);
        break;
      case 'long':
        win = nums.includes(p.a) && nums.includes(p.b);
        break;
    }
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * p.odds);
    return { winAmount, profit: winAmount - amount, hit: play };
  }

  function expandPlayPart(playPart) {
    const t = String(playPart || '').replace(/\s+/g, '');
    if (!t) return null;

    if (/^[大小单双]{2,}$/.test(t)) {
      const plays = [];
      const seen = new Set();
      for (const c of t) {
        if (SIDE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    let m = t.match(/^三军([1-6]+)$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        if (DICE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = '三军' + c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    m = t.match(/^二同([1-6]+)$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        if (DICE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = '二同' + c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    m = t.match(/^三同([1-6]+)$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        if (DICE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = '三同' + c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    m = t.match(/^三同号([1-6]+)$/);
    if (m && m[1].length >= 1) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        if (DICE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = '三同' + c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    m = t.match(/^长牌?([1-6]{2,})$/);
    if (m && m[1].length >= 2 && m[1].length % 2 === 0) {
      const plays = [];
      const seen = new Set();
      for (let i = 0; i < m[1].length; i += 2) {
        const play = '长牌' + m[1].slice(i, i + 2);
        if (!parsePlay(play)) continue;
        const key = play.slice(2);
        if (seen.has(key)) continue;
        seen.add(key);
        plays.push(play);
      }
      return plays.length ? plays : null;
    }

    m = t.match(/^独([1-6]+)$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        if (DICE_CHARS.includes(c) && !seen.has(c)) {
          seen.add(c);
          const play = '独' + c;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    // 合法和值（和10~和17 等）优先整注
    if (parsePlay(t)) return [t];

    m = t.match(/^和([0-9]+)$/);
    if (m && m[1].length >= 2) {
      const plays = [];
      const seen = new Set();
      for (const c of m[1]) {
        const n = +c;
        if (n >= 4 && n <= 9 && !seen.has(n)) {
          seen.add(n);
          const play = '和' + n;
          if (parsePlay(play)) plays.push(play);
        }
      }
      return plays.length ? plays : null;
    }

    return null;
  }

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
    return plays.map((play, i) => ({ play, amount: base + (i === 0 ? rem : 0) }));
  }

  function parseBetLines(text) {
    const raw = String(text || '').trim();
    const m = raw.match(/^(.+)\/(\d+|梭哈|全下|allin)$/i);
    if (!m) return null;
    const plays = expandPlayPart(m[1].trim());
    if (!plays || !plays.length) return null;
    return resolveBetAmounts(plays, m[2].trim());
  }

  function formatResolvedBets(lines) {
    return lines.map(l => `${l.play}/${l.amount}`).join(' ');
  }

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

  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function pad(n, w) { return String(n).padStart(w, '0'); }

  function fmtIssue(seq) {
    return pad(Math.max(1, seq), 6);
  }

  function setCurIssueDisplay(issue) {
    $('#curIssue').text(issue).attr('title', issue);
  }

  function fmtTime(d) {
    return pad(d.getHours(), 2) + ':' + pad(d.getMinutes(), 2) + ':' + pad(d.getSeconds(), 2);
  }

  function getRoundRemain() {
    return INTERVAL - ((Date.now() - todayStartMs()) / 1000 % INTERVAL);
  }

  function getBettingIssueSeq() {
    return Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL) + 1;
  }

  function getLastRevealedIssueSeq() {
    return Math.max(0, getBettingIssueSeq() - 1);
  }

  function getCurrentIssue() {
    return fmtIssue(getBettingIssueSeq());
  }

  function isBettingOpen() {
    return getRoundRemain() > PREP_SEC;
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
    updateComposerAction();
    return true;
  }

  function betLogKey() { return 'k3_bet_log_' + user.uid; }

  function loadUserBetLog() {
    try { return JSON.parse(localStorage.getItem(betLogKey())) || []; } catch (e) { return []; }
  }

  function saveUserBetLog(list) {
    localStorage.setItem(betLogKey(), JSON.stringify(list.slice(0, 120)));
    try { window.dispatchEvent(new CustomEvent('k3-bet-log-updated')); } catch (e) { /* */ }
  }

  function appendUserBetLog(issue, play, amount) {
    const log = loadUserBetLog();
    let group = log.find(g => g.issue === issue);
    if (!group) {
      group = {
        game: 'kuai3',
        issue,
        createdAt: new Date().toISOString(),
        settled: false,
        bets: [],
        totalAmount: 0,
        totalProfit: 0
      };
      log.unshift(group);
    }
    group.bets.push({ play, amount, status: 'PENDING', profit: 0, winAmount: 0, hit: '' });
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
    group.drawSummary = `${sumMeta(nums).text} · ${shapeRow(nums)}`;
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

  function recordBet(name, text) {
    const lines = parseBetInput(text);
    if (!lines) return false;
    let ok = false;
    lines.forEach(({ play, amount }) => { if (recordBetLine(name, play, amount)) ok = true; });
    return ok;
  }

  function fmtProfit(n) { return (n >= 0 ? '+' : '') + n; }

  function buildBetListVerifyHtml(issue) {
    const book = issueBetBook[issue];
    if (!book || !Object.keys(book).length) {
      return `<div class="k3-bot-card k3-bot-card--bets"><div class="k3-bot-card__head"><span class="k3-bot-card__title">注单核对</span><span class="k3-bot-card__issue">${issue}</span></div><div class="k3-bot-empty">本期暂无下注</div></div>`;
    }
    const names = Object.keys(book);
    const totalAmt = names.reduce((s, n) => s + book[n].reduce((a, b) => a + b.amount, 0), 0);
    const totalCnt = names.reduce((s, n) => s + book[n].length, 0);
    const users = names.map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const tags = bets.map(b => `<span class="k3-bot-tag">${b.play}/${b.amount}</span>`).join('');
      return `<div class="k3-bot-user${name === user.name ? ' is-me' : ''}"><div class="k3-bot-user__head"><span class="k3-bot-user__name">${name}</span><span class="k3-bot-user__sum">${total}</span></div><div class="k3-bot-user__tags">${tags}</div></div>`;
    }).join('');
    return `<div class="k3-bot-card k3-bot-card--bets"><div class="k3-bot-card__head"><span class="k3-bot-card__title">注单核对</span><span class="k3-bot-card__issue">${issue}</span></div><div class="k3-bot-card__stat">${names.length} 人 · ${totalCnt} 注 · ${totalAmt}</div><div class="k3-bot-card__body is-full">${users}</div></div>`;
  }

  function buildWinListVerifyHtml(issue, settled) {
    const winners = Object.keys(settled || {}).filter(n => settled[n].some(r => r.winAmount > 0));
    let body = winners.length ? winners.map(name => {
      const winRows = settled[name].filter(r => r.winAmount > 0);
      const totalProfit = settled[name].reduce((s, r) => s + r.profit, 0);
      const tags = winRows.map(r => `<span class="k3-bot-tag k3-bot-tag--win">${r.play}/${r.amount}</span>`).join('');
      return `<div class="k3-bot-user"><div class="k3-bot-user__head"><span class="k3-bot-user__name">${name}</span><span class="k3-bot-user__profit ${totalProfit >= 0 ? 'pos' : 'neg'}">${fmtProfit(totalProfit)}</span></div><div class="k3-bot-user__tags">${tags}</div></div>`;
    }).join('') : '<div class="k3-bot-empty">本期暂无中奖</div>';
    let mine = '';
    const myRows = settled && settled[user.name];
    if (myRows && myRows.length) {
      const myProfit = myRows.reduce((s, r) => s + r.profit, 0);
      const myWin = myRows.reduce((s, r) => s + r.winAmount, 0);
      const profitCls = myProfit >= 0 ? 'pos' : 'neg';
      const winText = myWin > 0 ? `中奖 +${myWin}` : '未中奖';
      mine = `<div class="k3-bot-mine-line ${profitCls}"><span class="k3-bot-mine-line__label">您本期</span><span class="k3-bot-mine-line__win">${winText}</span><span class="k3-bot-mine-line__profit">输赢 ${fmtProfit(myProfit)}</span></div>`;
    }
    return `<div class="k3-bot-card k3-bot-card--win"><div class="k3-bot-card__head"><span class="k3-bot-card__title">中奖核对</span><span class="k3-bot-card__issue">${issue}</span></div><div class="k3-bot-card__body is-full">${body}</div>${mine}</div>`;
  }

  function settleIssue(issue, nums) {
    const book = issueBetBook[issue];
    if (!book) return {};
    const out = {};
    Object.keys(book).forEach(name => {
      out[name] = book[name].map(b => ({ play: b.play, amount: b.amount, ...settleBet(b.play, b.amount, nums) }));
    });
    return out;
  }

  function applyUserSettle(issue, settled, nums) {
    const rows = settled[user.name];
    if (rows) {
      let profit = 0;
      let turnover = 0;
      rows.forEach(r => {
        profit += r.profit;
        turnover += r.amount;
        if (r.winAmount > 0) App.setBalance(user.uid, App.getBalance(user.uid) + r.winAmount);
      });
      const stats = getStats(user.uid);
      stats.winloss += profit;
      stats.turnover += turnover;
      stats.rebate = (stats.rebate || 0) + Math.floor(turnover * 0.005);
      saveStats(user.uid, stats);
      refreshStats();
    }
    settleUserBetLog(issue, nums || lastDraw, rows);
  }

  function renderCountdownDigits(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const mm = pad(Math.floor(s / 60), 2);
    const ss = pad(s % 60, 2);
    const cells = $('#cdDigits .k3-timer__cell');
    if (cells.length >= 4) {
      cells.eq(0).text(mm[0]);
      cells.eq(1).text(mm[1]);
      cells.eq(2).text(ss[0]);
      cells.eq(3).text(ss[1]);
    }
  }

  function updateCountdownUI(r) {
    const $box = $('#countdownBox');
    const betRemain = r - PREP_SEC;
    const displaySec = Math.max(0, Math.ceil(betRemain));
    const inPrep = r <= PREP_SEC || displaySec <= 0;
    if (inPrep) {
      $box.addClass('is-preparing');
      $('#cdDigits').prop('hidden', true);
      $('#cdPrep').prop('hidden', false).text('准备中');
      $box.attr('aria-label', '准备中');
      $('#drawBar').addClass('is-holding');
      return;
    }
    $box.removeClass('is-preparing');
    $('#cdDigits').prop('hidden', false).attr('aria-label', '距封盘倒计时');
    $('#cdPrep').prop('hidden', true);
    $('#drawBar').removeClass('is-holding');
    renderCountdownDigits(displaySec);
  }

  function getStats(uid) {
    try { return JSON.parse(localStorage.getItem('k3_stats_' + uid)) || { turnover: 0, winloss: 0, rebate: 0 }; } catch (e) { return { turnover: 0, winloss: 0, rebate: 0 }; }
  }

  function saveStats(uid, s) { localStorage.setItem('k3_stats_' + uid, JSON.stringify(s)); }

  function refreshStats() {
    const bal = App.getBalance(user.uid);
    const s = getStats(user.uid);
    $('#statBalance').text(bal.toLocaleString('en-US'));
    $('#statTurnover').text(Math.round(s.turnover).toLocaleString('en-US'));
    const $wl = $('#statWinloss').text((s.winloss >= 0 ? '+' : '') + Math.round(s.winloss).toLocaleString('en-US'));
    $wl.toggleClass('is-plus', s.winloss > 0).toggleClass('is-minus', s.winloss < 0);
    $('#statRebate').text(Math.round(s.rebate).toLocaleString('en-US'));
    $('#playFootBalance').text(bal.toLocaleString('en-US'));
  }

  const HISTORY_SHOW = 10;

  function buildHistory(count) {
    const rows = [];
    const latestSeq = getLastRevealedIssueSeq();
    const startSeq = latestSeq >= 1 ? latestSeq : 1;
    for (let i = 0; i < count; i++) {
      const issueSeq = Math.max(1, startSeq - i);
      const nums = i === 0 && lastDraw.length ? lastDraw : randomDraw();
      const meta = sumMeta(nums);
      rows.push({ issue: fmtIssue(issueSeq), nums, gy: meta.text, lh: shapeRow(nums) });
    }
    return rows;
  }

  function barSummaryHtml(row) {
    return `${row.gy.replace(/\s+/g, '')}<span class="sep">·</span>${row.lh}`;
  }

  function renderDrawBar(row) {
    if (!row) return;
    const revealedSeq = getLastRevealedIssueSeq();
    $('#barIssue').text(revealedSeq >= 1 ? row.issue : '------');
    $('#barBalls').html(row.nums.map(n => diceHtml(n, 'xs')).join(''));
    $('#barSummary').html(revealedSeq >= 1 ? barSummaryHtml(row) : '等待开奖');
  }

  function flashDrawBarReveal() {
    const $bar = $('#drawBar');
    $bar.removeClass('is-reveal');
    void $bar[0].offsetWidth;
    $bar.addClass('is-reveal');
    setTimeout(() => $bar.removeClass('is-reveal'), 900);
  }

  function revealPendingDraw() {
    if (!pendingDrawRow) return;
    const row = pendingDrawRow;
    historyRows.unshift(row);
    if (historyRows.length > 120) historyRows.pop();
    renderDrawBar(row);
    renderDrawTable();
    flashDrawBarReveal();

    const nums = row.nums;
    const issue = row.issue;
    const meta = sumMeta(nums);
    const shape = shapeRow(nums);
    const settled = settleIssue(issue, nums);
    const card = document.querySelector(`#chatFeed .k3-result-card[data-issue="${issue}"]`)
      || $('#chatFeed .k3-result-card.is-rolling').last()[0];

    if (card) {
      K3ResultCard.settle(card, nums, issue, meta, shape);
      applyUserSettle(issue, settled, nums);
      const botAv = avatarHtml('机', 0);
      setTimeout(() => {
        appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: buildWinListVerifyHtml(issue, settled) });
      }, 750);
    } else {
      pushRobotResult(nums, issue, true);
    }

    pendingDrawRow = null;
    rollingCardIssue = null;
    if ($('#longSheet').hasClass('is-open')) renderLongDragonPanel();
    if ($('#predictSheet').hasClass('is-open')) renderPredictPanel();
  }

  function pushRobotRolling(issue, nums) {
    if (rollingCardIssue === issue) return;
    rollingCardIssue = issue;
    const botAv = avatarHtml('机', 0);
    appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: K3ResultCard.buildRolling(issue) });
    const card = $(`#chatFeed .k3-result-card[data-issue="${issue}"]`).last()[0]
      || $('#chatFeed .k3-result-card.is-rolling').last()[0];
    if (!card) return;
    const meta = sumMeta(nums);
    const shape = shapeRow(nums);
    const remainMs = Math.max(900, Math.ceil(getRoundRemain() * 1000));
    K3ResultCard.startRoll(card, nums, issue, meta, shape, remainMs);
    scrollChat();
  }

  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="k3-draw-table__issue">${r.issue}</td>
      ${r.nums.map(n => `<td>${diceHtml(n, 'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g, '')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }

  function resultCardHtml(nums, issue) {
    const meta = sumMeta(nums);
    const shape = shapeRow(nums);
    return K3ResultCard.build(nums, issue, meta, shape);
  }

  function scrollChat() {
    const el = document.getElementById('chatFeed');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function appendMsg(opts) {
    const time = opts.time || fmtTime(new Date());
    const avatar = opts.avatarHtml || `<div class="k3-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const metaOther = `<div class="k3-msg__meta"><span class="k3-msg__name">${opts.name}</span><span class="k3-msg__time">${time}</span></div>`;
    const metaSelf = `<div class="k3-msg__meta"><span class="k3-msg__time">${time}</span><span class="k3-msg__name">${opts.name}</span></div>`;
    const bubbleCls = opts.robot ? 'k3-msg__bubble k3-msg__bubble--bot' : 'k3-msg__bubble';
    const bubble = `<div class="${bubbleCls}">${opts.html}</div>`;
    const html = opts.self
      ? `<div class="k3-msg is-self"><div class="k3-msg__top">${metaSelf}${avatar}</div>${bubble}</div>`
      : `<div class="k3-msg${opts.robot ? ' is-robot' : ''}">${avatar}<div class="k3-msg__body">${metaOther}${bubble}</div></div>`;
    $('#chatFeed').append(html);
    const feed = document.getElementById('chatFeed');
    if (feed) {
      const cards = feed.querySelectorAll('.k3-result-card.is-settled:not([data-laid="1"])');
      const settled = cards[cards.length - 1];
      if (settled) K3ResultCard.initSettled(settled);
    }
    scrollChat();
  }

  function closeNoticeHtml(issue) {
    return `<div class="k3-bot-close-line"><div class="k3-bot-close-line__bar"><span class="k3-bot-close-line__deco"></span><span class="k3-bot-close-line__text">封 盘 线</span><span class="k3-bot-close-line__deco"></span></div><div class="k3-bot-close-line__sub">第 <span class="k3-bot-close-line__issue">${issue}</span> 期 · 停止下注 · 即将开奖</div></div>`;
  }

  function pushRobotClose(issue) {
    const botAv = avatarHtml('机', 0);
    appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: closeNoticeHtml(issue) });
    setTimeout(() => {
      appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: buildBetListVerifyHtml(issue) });
    }, 500);
  }

  function pushRobotResult(nums, issue, syncReveal) {
    const settled = settleIssue(issue, nums);
    applyUserSettle(issue, settled, nums);
    const botAv = avatarHtml('机', 0);
    const resultDelay = syncReveal ? 0 : 600;
    setTimeout(() => {
      appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: K3ResultCard.buildRolling(issue) });
      const card = $('#chatFeed .k3-result-card.is-rolling').last()[0];
      if (card) {
        const meta = sumMeta(nums);
        const shape = shapeRow(nums);
        K3ResultCard.startRoll(card, nums, issue, meta, shape, 1400);
      }
    }, resultDelay);
    setTimeout(() => {
      appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: buildWinListVerifyHtml(issue, settled) });
    }, resultDelay + 1800);
  }

  function seedChat() {
    const prefixes = App.NAME_PREFIX || ['黄金'];
    const suffixes = App.NAME_SUFFIX || ['猎手'];
    const demoPlays = ['大/100', '小/50', '和11/100', '三军3/50', '二同2/80', '三同6/20', '三连号/30', '长牌12/40'];
    MOCK_NAMES.length = 0;
    for (let i = 0; i < 8; i++) {
      const name = prefixes[i % prefixes.length] + suffixes[i % suffixes.length];
      const betText = demoPlays[i % demoPlays.length];
      MOCK_NAMES.push({ name });
      appendMsg({ name, avatarHtml: avatarHtml(name, i), html: betText });
      recordBet(name, betText);
    }
    appendMsg({ name: user.name, avatar: fixAvatar(user.avatar), self: true, html: '大/100' });
    recordBet(user.name, '大/100');
  }

  function initKeypad() {
    const left = ['大', '小', '单', '双'];
    const right = ['删除', '二同', '三同', '长牌'];
    const mid = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['和', '三军', '/']];
    let html = '';
    for (let r = 0; r < 4; r++) {
      html += `<button type="button" class="k3-key k3-key--side" data-key="${left[r]}">${left[r]}</button>`;
      mid[r].forEach(k => { html += `<button type="button" class="k3-key" data-key="${k}">${k}</button>`; });
      const rk = right[r];
      let cls = ' k3-key--side';
      if (rk === '删除') cls = ' k3-key--del';
      else if (rk === '二同' || rk === '三同') cls = ' k3-key--tri';
      else if (rk === '长牌') cls = ' k3-key--dice';
      html += `<button type="button" class="k3-key${cls}" data-key="${rk}">${rk}</button>`;
    }
    // 第五行：三连号（玩法/金额）
    html += `<button type="button" class="k3-key k3-key--side" data-key="三连">三连</button>`;
    html += `<button type="button" class="k3-key" data-key="0">0</button>`;
    html += `<button type="button" class="k3-key k3-key--side" data-key="三不同">三不同</button>`;
    html += `<button type="button" class="k3-key" data-key="空格">空格</button>`;
    html += `<button type="button" class="k3-key k3-key--side" data-key="豹子">豹子</button>`;
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.k3-room');
    if (show) { $('#keypad').prop('hidden', false); $room.addClass('has-keypad'); }
    else { $('#keypad').prop('hidden', true); $room.removeClass('has-keypad'); }
  }

  function insertInput(text) {
    const $in = $('#chatInput');
    const v = $in.val();
    if (text === '删除') { $in.val(v.slice(0, -1)); updateComposerAction(); return; }
    if (text === '空格') { $in.val(v + ' '); updateComposerAction(); return; }
    if (text === '三连') { $in.val(v + '三连号'); updateComposerAction(); return; }
    if (text === '三不同') { $in.val(v + '三不同号'); updateComposerAction(); return; }
    if (text === '豹子') { $in.val(v + '三同号'); updateComposerAction(); return; }
    $in.val(v + text);
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
    if (!isBettingOpen()) { App.toast('封盘中，无法下注'); return; }
    if (!parseBetInput(text)) {
      App.toast('格式：大/100、和11/50、三同号/100、三同1/100、二同3/100、长牌12/100、三连号/100');
      return;
    }
    const bal = App.getBalance(user.uid);
    const lines = parseBetInput(text);
    const total = lines.reduce((s, l) => s + l.amount, 0);
    if (total > bal) { App.toast('余额不足'); return; }
    App.setBalance(user.uid, bal - total);
    refreshStats();
    const display = lines.length > 1 ? formatResolvedBets(lines) : text.replace(/\s+/g, ' ');
    appendMsg({ name: user.name, avatar: fixAvatar(user.avatar), self: true, html: display });
    recordBet(user.name, text);
    lastBetText = formatResolvedBets(lines);
    $('#chatInput').val('');
    updateComposerAction();
  }

  function repeatLastBet() {
    if (!lastBetText) { App.toast('暂无上次投注'); return; }
    $('#chatInput').val(lastBetText);
    updateComposerAction();
    sendBetMessage();
  }

  function setDrawPanelOpen(open) {
    drawPanelOpen = !!open;
    $('#drawBar').toggleClass('is-open', drawPanelOpen);
    $('#drawToggle').attr('aria-expanded', drawPanelOpen);
  }

  function toggleDrawPanel() {
    setDrawPanelOpen(!drawPanelOpen);
  }

  function pushRandomBet() {
    if (!MOCK_NAMES.length || !isBettingOpen()) return;
    const n = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
    const plays = ['大', '小', '和10', '三军1', '二同3', '三同号', '三连号', '三不同号', '长牌45'];
    const betText = `${plays[Math.floor(Math.random() * plays.length)]}/${[10, 20, 50, 100][Math.floor(Math.random() * 4)]}`;
    appendMsg({ name: n.name, avatarHtml: avatarHtml(n.name, n.name.length * 7), html: betText });
    recordBet(n.name, betText);
  }

  /* ================= 玩法面板 ================= */
  const AMOUNT_CHIPS = [10, 20, 50, 100, 200, 500];
  const PLAY_CATEGORIES = [
    {
      id: 'sideSum',
      title: '和值两面',
      hint: '两面：4-10 小 · 11-17 大 · 豹子通杀 · 1.98｜和值：猜总和 4-17 · 6.5',
      subs: null,
      sideItems: ['大', '小', '单', '双'].map(p => ({ play: p, label: p, odds: ODDS.side })),
      sumItems: Array.from({ length: 14 }, (_, i) => {
        const sum = i + 4;
        return { play: '和' + sum, label: String(sum), odds: SUM_ODDS[sum] || ODDS.sum };
      }),
    },
    {
      id: 'dice',
      title: '三军',
      hint: '指定点数至少出现 1 次 · 赔率 2.0',
      subs: null,
      items: Array.from({ length: 6 }, (_, i) => {
        const n = i + 1;
        return { play: '三军' + n, label: '三军' + n, odds: ODDS.dice };
      }),
    },
    {
      id: 'pair',
      title: '二同号',
      hint: '指定点数恰好出现 2 次（非豹子）· 赔率 10',
      subs: null,
      items: Array.from({ length: 6 }, (_, i) => {
        const n = i + 1;
        return { play: '二同' + n, label: String(n) + String(n), odds: ODDS.pairN };
      }),
    },
    {
      id: 'triplet',
      title: '三同号',
      hint: '指定豹子点数 · 单号 150｜任意豹子输入三同号 · 24',
      subs: null,
      items: [
        { play: '三同号', label: '任意', odds: ODDS.tripletAny },
        ...Array.from({ length: 6 }, (_, i) => {
          const n = i + 1;
          return { play: '三同' + n, label: String(n).repeat(3), odds: ODDS.tripletN };
        }),
      ],
    },
    {
      id: 'straight',
      title: '三连号',
      hint: '三颗骰子为连续点数 123 / 234 / 345 / 456 · 赔率 8',
      subs: null,
      items: [{ play: '三连号', label: '三连号', odds: ODDS.straight }],
    },
    {
      id: 'alldiff',
      title: '三不同号',
      hint: '三颗点数互不相同且不成顺子 · 赔率 1.95',
      subs: null,
      items: [{ play: '三不同号', label: '三不同', odds: ODDS.alldiff }],
    },
    {
      id: 'long',
      title: '长牌',
      hint: '两个不同点数各至少出现 1 次 · 赔率 5.8',
      subs: null,
      items: longPairs().map(p => ({
        play: p.play,
        label: p.a + '·' + p.b,
        odds: ODDS.long,
      })),
    },
  ];

  let playCatIdx = 0;
  let playSubIdx = 0;
  let playSelectedList = [];
  let playAllin = false;

  function playAmountStep(val) {
    const n = parseInt(val, 10) || 0;
    if (n >= 500) return 100;
    if (n >= 100) return 50;
    return 10;
  }

  function clearPlayAmountChipActive() {
    $('#playAmountChips .k3-play-foot__chip').removeClass('is-active');
  }

  function syncPlayAmountUI() {
    const $in = $('#playAmount');
    if (playAllin) {
      $in.attr('type', 'text').prop('readonly', true).val('梭哈').addClass('is-allin');
      $('#playAmountAllin').addClass('is-active');
      clearPlayAmountChipActive();
    } else {
      $in.attr('type', 'number').prop('readonly', false).removeClass('is-allin');
      $('#playAmountAllin').removeClass('is-active');
      if (!$in.val() || $in.val() === '梭哈') $in.val(100);
    }
  }

  function setPlayAmount(val) {
    playAllin = false;
    $('#playAmount').attr('type', 'number').prop('readonly', false).removeClass('is-allin');
    $('#playAmountAllin').removeClass('is-active');
    $('#playAmount').val(Math.max(1, val));
  }

  function currentPlayCat() { return PLAY_CATEGORIES[playCatIdx]; }

  function togglePlaySelect(play) {
    if (!play || !parsePlay(play)) return;
    const idx = playSelectedList.indexOf(play);
    if (idx >= 0) playSelectedList.splice(idx, 1);
    else playSelectedList.push(play);
  }

  function isPlaySelected(play) { return playSelectedList.indexOf(play) >= 0; }

  function updatePlaySelected() {
    if (!playSelectedList.length) {
      $('#playSelected').text('—');
      $('#playClearSel').prop('disabled', true);
      return;
    }
    $('#playClearSel').prop('disabled', false);
    const preview = playSelectedList.slice(0, 3).join('、');
    $('#playSelected').text(playSelectedList.length > 3 ? `${preview}… 共${playSelectedList.length}项` : preview);
  }

  function clearPlaySelection() {
    if (!playSelectedList.length) return;
    playSelectedList = [];
    renderPlayPanel();
    updatePlaySelected();
  }

  function initPlaySheet() {
    $('#playNav').html(PLAY_CATEGORIES.map((c, i) =>
      `<button type="button" class="k3-play-nav__item${i === playCatIdx ? ' is-active' : ''}" data-idx="${i}">${c.title}</button>`
    ).join(''));
    $('#playAmountChips').html(AMOUNT_CHIPS.map(a =>
      `<button type="button" class="k3-play-foot__chip${a === 100 ? ' is-active' : ''}" data-amt="${a}">${a}</button>`
    ).join(''));
  }

  function playItemHtml(play, label, odds, extraCls) {
    const cls = ['k3-play-item', extraCls, isPlaySelected(play) ? 'is-active' : ''].filter(Boolean).join(' ');
    const oddsHtml = odds != null ? `<small>${odds}</small>` : '';
    return `<button type="button" class="${cls}" data-play="${play}"><span>${label}</span>${oddsHtml}</button>`;
  }

  function renderPlayPanel() {
    const cat = currentPlayCat();
    const $grid = $('#playGrid');
    $('#playHint').text(cat.hint);
    $('#playSub').addClass('is-hidden').prop('hidden', true).empty();
    let html = '';
    let gridMode = '';
    if (cat.id === 'sideSum') {
      gridMode = 'is-side-sum';
      const sideHtml = cat.sideItems.map(it => playItemHtml(it.play, it.label, it.odds, 'k3-play-item--side')).join('');
      const sumHtml = cat.sumItems.map(it => playItemHtml(it.play, it.label, it.odds, 'k3-play-item--sum')).join('');
      html = `<div class="k3-play-section"><div class="k3-play-section__title">两面</div><div class="k3-play-section__grid is-gy-side">${sideHtml}</div></div>`
        + `<div class="k3-play-section"><div class="k3-play-section__title">和值</div><div class="k3-play-section__grid is-digits">${sumHtml}</div></div>`;
    } else if (cat.id === 'dice') {
      gridMode = 'is-dice-grid';
      html = cat.items.map(it => {
        const n = +String(it.play).replace('三军', '');
        const cls = ['k3-play-item', 'k3-play-item--dice-img', isPlaySelected(it.play) ? 'is-active' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-play="${it.play}"><span class="k3-play-item__dice">${diceHtml(n, 'play')}</span><small>${it.odds}</small></button>`;
      }).join('');
    } else if (cat.id === 'pair') {
      gridMode = 'is-dice-grid';
      html = cat.items.map(it => {
        const n = +String(it.play).replace('二同', '');
        const cls = ['k3-play-item', 'k3-play-item--dice-img', isPlaySelected(it.play) ? 'is-active' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-play="${it.play}"><span class="k3-play-item__dice k3-play-item__dice--pair">${diceHtml(n, 'play')}${diceHtml(n, 'play')}</span><small>${it.odds}</small></button>`;
      }).join('');
    } else if (cat.id === 'triplet') {
      gridMode = 'is-triplet-grid';
      html = cat.items.map(it => {
        if (it.play === '三同号') {
          return playItemHtml(it.play, it.label, it.odds, 'k3-play-item--tri-any');
        }
        const n = +String(it.play).replace('三同', '');
        const cls = ['k3-play-item', 'k3-play-item--dice-img', isPlaySelected(it.play) ? 'is-active' : ''].filter(Boolean).join(' ');
        return `<button type="button" class="${cls}" data-play="${it.play}"><span class="k3-play-item__dice k3-play-item__dice--tri">${diceHtml(n, 'play')}${diceHtml(n, 'play')}${diceHtml(n, 'play')}</span><small>${it.odds}</small></button>`;
      }).join('');
    } else if (cat.id === 'long') {
      gridMode = 'is-long-grid';
      html = cat.items.map(it => playItemHtml(it.play, it.label, it.odds, 'k3-play-item--long')).join('');
    } else {
      html = cat.items.map(it => playItemHtml(it.play, it.label, it.odds)).join('');
    }
    $grid.attr('class', `k3-play-panel__grid${gridMode ? ' ' + gridMode : ''}`).html(html);
    $grid.scrollTop(0);
  }


  /** 玩法面板顶边对齐历史开奖栏下沿，盖住聊天区、露出倒计时 */
  function layoutPlayOverlay() {
    const bar = document.getElementById('drawBar');
    let top = 210;
    if (bar) {
      const rect = bar.getBoundingClientRect();
      top = Math.max(120, Math.ceil(rect.bottom + 4));
    }
    document.documentElement.style.setProperty('--k3-play-top', top + 'px');
  }
  function openPlaySheet(open) {
    const $room = $('.k3-room');
    if (open) {
      layoutPlayOverlay();

      if (drawPanelOpen) setDrawPanelOpen(false);
      openLongSheet(false);
      openPredictSheet(false);
      playCatIdx = 0;
      playSubIdx = 0;
      playSelectedList = [];
      playAllin = false;
      $('#playAmount').val(100);
      syncPlayAmountUI();
      clearPlayAmountChipActive();
      $('#playAmountChips .k3-play-foot__chip[data-amt="100"]').addClass('is-active');
      refreshStats();
      initPlaySheet();
      renderPlayPanel();
      updatePlaySelected();
      $('#playMask').prop('hidden', false);
      $('#playSheet').prop('hidden', false).addClass('is-open');
      $room.addClass('has-play');
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

  function submitPlayBet() {
    if (!isBettingOpen()) { App.toast('封盘中，无法下注'); return; }
    const plays = playSelectedList.filter(p => parsePlay(p));
    if (!plays.length) { App.toast('请选择玩法'); return; }
    let lines;
    if (playAllin) {
      lines = resolveBetAmounts(plays, '梭哈');
      if (!lines) { App.toast('余额不足，无法梭哈'); return; }
    } else {
      const amount = parseInt($('#playAmount').val(), 10);
      if (!amount || amount < 1) { App.toast('请输入有效金额'); return; }
      lines = resolveBetAmounts(plays, String(amount));
      if (!lines) { App.toast('请输入有效金额'); return; }
      const total = lines.reduce((s, l) => s + l.amount, 0);
      if (total > App.getBalance(user.uid)) { App.toast('余额不足'); return; }
    }
    const text = formatResolvedBets(lines);
    $('#chatInput').val(text);
    playAllin = false;
    syncPlayAmountUI();
    openPlaySheet(false);
    showKeypad(true);
    sendBetMessage();
  }

  function initPlaySheetEvents() {
    $('#playNav').on('click', '.k3-play-nav__item', function () {
      playCatIdx = +$(this).data('idx');
      playSubIdx = 0;
      $('#playNav .k3-play-nav__item').removeClass('is-active');
      $(this).addClass('is-active');
      renderPlayPanel();
    });
    $('#playGrid').on('click', '.k3-play-item', function () {
      const play = $(this).data('play');
      togglePlaySelect(play);
      $(this).toggleClass('is-active', isPlaySelected(play));
      updatePlaySelected();
    });
    $('#playAmountChips').on('click', '.k3-play-foot__chip', function () {
      setPlayAmount(+$(this).data('amt'));
      clearPlayAmountChipActive();
      $(this).addClass('is-active');
    });
    $('#playAmountMinus').on('click', () => {
      const cur = parseInt($('#playAmount').val(), 10) || 100;
      setPlayAmount(cur - playAmountStep(cur));
      clearPlayAmountChipActive();
    });
    $('#playAmountPlus').on('click', () => {
      const cur = parseInt($('#playAmount').val(), 10) || 0;
      setPlayAmount(cur + playAmountStep(cur));
      clearPlayAmountChipActive();
    });
    $('#playAmountAllin').on('click', () => {
      playAllin = !playAllin;
      syncPlayAmountUI();
    });
    $('#playAmount').on('input', () => {
      if (playAllin) return;
      clearPlayAmountChipActive();
    });
    $('#playClearSel').on('click', clearPlaySelection);
    $('#playSubmit').on('click', submitPlayBet);
  }

  /* ================= 长龙 / 预测 ================= */
  const MIN_LONG_STREAK = 2;
  let longTab = 'side';
  let predictTab = 'side';
  const PREDICT_WINDOW = 20;
  const PREDICT_STREAK_BREAK = 3;

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

  function sideLabelForRow(nums) {
    if (isTriplet(nums)) return null;
    const meta = sumMeta(nums);
    return meta;
  }

  function buildLongDragonGroups() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 3);
    const side = [];
    const shape = [];
    const sumTab = [];
    if (!rows.length) return { side, shape, sum: sumTab };

    {
      const labels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? m.size : null;
      }).filter(Boolean);
      if (labels.length) {
        const s = streakAtHead(labels);
        pushLongItem(side, s.tag, s.count);
      }
    }
    {
      const labels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? m.parity : null;
      }).filter(Boolean);
      if (labels.length) {
        const s = streakAtHead(labels);
        pushLongItem(side, s.tag, s.count);
      }
    }

    {
      const labels = rows.map(r => shapeRow(r.nums));
      const s = streakAtHead(labels);
      pushLongItem(shape, s.tag, s.count);
    }

    {
      const labels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? '和值' + m.size : null;
      }).filter(Boolean);
      if (labels.length) {
        const s = streakAtHead(labels);
        pushLongItem(sumTab, s.tag, s.count);
      }
    }
    {
      const labels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? '和值' + m.parity : null;
      }).filter(Boolean);
      if (labels.length) {
        const s = streakAtHead(labels);
        pushLongItem(sumTab, s.tag, s.count);
      }
    }

    const sortDesc = arr => arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
    return { side: sortDesc(side), shape: sortDesc(shape), sum: sortDesc(sumTab) };
  }

  function longItemParts(name) {
    if (['大', '小', '单', '双'].includes(name)) return { group: '和值两面', tag: name, full: name };
    if (name.startsWith('和值')) return { group: '和值两面', tag: name.slice(2), full: name };
    return { group: '形态', tag: name, full: name };
  }

  function longTagClass(tag) {
    if (['大'].includes(tag)) return 'tag-red';
    if (['小'].includes(tag)) return 'tag-blue';
    if (['单'].includes(tag)) return 'tag-gold';
    if (['双'].includes(tag)) return 'tag-purple';
    if (tag === '三同号') return 'tag-red';
    if (tag === '三连号') return 'tag-green';
    if (tag === '二同号') return 'tag-gold';
    if (tag === '三不同号') return 'tag-muted';
    return 'tag-muted';
  }

  function longStreakBar(count) {
    const pct = Math.min(100, Math.round((count / 10) * 100));
    return `<div class="k3-long-item__bar"><span style="width:${pct}%"></span></div>`;
  }

  function longTierClass(count) {
    if (count >= 5) return 'is-fire';
    if (count >= 3) return 'is-hot';
    return 'is-warm';
  }

  function renderLongDragonPanel() {
    const groups = buildLongDragonGroups();
    const list = groups[longTab] || [];
    const tabLabel = { side: '和值两面', shape: '形态', sum: '和值' }[longTab] || '';
    if (!list.length) {
      $('#longSummary').text(`${tabLabel} · 暂无连续形态`);
      $('#longBody').html(`
        <div class="k3-long-empty">
          <div class="k3-long-empty__icon">◎</div>
          <div class="k3-long-empty__text">当前没有 2 期以上的长龙</div>
          <div class="k3-long-empty__hint">开奖后会自动更新</div>
        </div>`);
      return;
    }
    const top = list[0];
    const topParts = longItemParts(top.name);
    $('#longSummary').text(`${tabLabel} · 共 ${list.length} 条`);
    const hero = `
      <div class="k3-long-hero ${longTierClass(top.count)}">
        <div class="k3-long-hero__label">当前最长</div>
        <div class="k3-long-hero__main">
          <span class="k3-long-hero__tag ${longTagClass(topParts.tag)}">${topParts.tag}</span>
          <span class="k3-long-hero__text">${topParts.full}</span>
          <span class="k3-long-hero__num">${top.count}</span>
          <span class="k3-long-hero__unit">期</span>
        </div>
      </div>`;
    const rows = list.map((item, idx) => {
      const parts = longItemParts(item.name);
      return `
        <div class="k3-long-item ${longTierClass(item.count)}">
          <div class="k3-long-item__rank">${idx + 1}</div>
          <div class="k3-long-item__tag ${longTagClass(parts.tag)}">${parts.tag}</div>
          <div class="k3-long-item__info">
            <div class="k3-long-item__name">${parts.group}<span class="sep">·</span>${parts.full}</div>
            ${longStreakBar(item.count)}
          </div>
          <div class="k3-long-item__count"><b>${item.count}</b><small>连</small></div>
        </div>`;
    }).join('');
    $('#longBody').html(hero + `<div class="k3-long-list">${rows}</div>`);
  }

  function openLongSheet(open) {
    const $room = $('.k3-room');
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
      setTimeout(() => { if (!$('#longSheet').hasClass('is-open')) $('#longSheet').prop('hidden', true); }, 300);
      $room.removeClass('has-long');
    }
  }

  function flipSideTag(tag) {
    if (tag === '大') return '小';
    if (tag === '小') return '大';
    if (tag === '单') return '双';
    if (tag === '双') return '单';
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
    return `<div class="k3-predict-card is-clickable"${playAttr} role="button" tabindex="0">
      <div class="k3-predict-card__name">${name}</div>
      <div class="k3-predict-card__pick">
        <span class="k3-predict-card__tag ${predictTagClass(data.pick)}">${data.pick}</span>
        <span class="k3-predict-card__conf">${pct}%</span>
      </div>
      <div class="k3-predict-card__reason">${data.reason}</div>
      <div class="k3-predict-card__bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }

  function buildDicePredict(rows) {
    const window = Math.min(PREDICT_WINDOW, rows.length);
    const freq = Array(7).fill(0);
    const lastSeen = Array(7).fill(window);
    for (let i = 0; i < window; i++) {
      rows[i].nums.forEach(d => {
        freq[d]++;
        if (lastSeen[d] === window) lastSeen[d] = i;
      });
    }
    const hot = freq
      .map((c, d) => ({ d, c }))
      .filter(x => x.d >= 1)
      .sort((a, b) => b.c - a.c || a.d - b.d)
      .slice(0, 3)
      .filter(x => x.c > 0);
    const cold = lastSeen
      .map((gap, d) => ({ d, gap }))
      .filter(x => x.d >= 1)
      .sort((a, b) => b.gap - a.gap || a.d - b.d)
      .slice(0, 3);
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
    updateComposerAction();
    showKeypad(true);
    openPredictSheet(false);
    App.toast(`已填入 ${play}/${amount}`);
  }

  function renderPredictPanel() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 3);
    const issue = getPredictIssue();
    $('#predictSummary').text(`下一期 · ${issue}`);
    if (!rows.length) {
      $('#predictBody').html(`
        <div class="k3-long-empty">
          <div class="k3-long-empty__icon">◎</div>
          <div class="k3-long-empty__text">暂无开奖数据</div>
          <div class="k3-long-empty__hint">等待开奖后生成预测</div>
        </div>`);
      return;
    }

    if (predictTab === 'side') {
      const sizeLabels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? m.size : null;
      }).filter(Boolean);
      const oddLabels = rows.map(r => {
        const m = sideLabelForRow(r.nums);
        return m ? m.parity : null;
      }).filter(Boolean);
      const sizeData = pickByTrend(sizeLabels, PREDICT_STREAK_BREAK);
      const oddData = pickByTrend(oddLabels, PREDICT_STREAK_BREAK);
      const hero = `
        <div class="k3-predict-hero">
          <div class="k3-predict-hero__label">核心参考</div>
          <div class="k3-predict-hero__main">
            <div class="k3-predict-hero__tags">
              <span class="k3-predict-card__tag ${predictTagClass(sizeData.pick)} is-clickable" data-predict-play="${sizeData.pick}" role="button" tabindex="0">${sizeData.pick}</span>
              <span class="k3-predict-card__tag ${predictTagClass(oddData.pick)} is-clickable" data-predict-play="${oddData.pick}" role="button" tabindex="0">${oddData.pick}</span>
            </div>
            <div class="k3-predict-hero__note">和值倾向 ${sizeData.pick}${oddData.pick}，${sizeData.reason}</div>
          </div>
        </div>`;
      $('#predictBody').html(hero + `<div class="k3-predict-grid">${predictCardHtml('和值 · 大小', sizeData, sizeData.pick)}${predictCardHtml('和值 · 单双', oddData, oddData.pick)}</div>`);
      return;
    }

    if (predictTab === 'sum') {
      const sumFreq = {};
      rows.slice(0, PREDICT_WINDOW).forEach(r => {
        const s = sumMeta(r.nums).sum;
        sumFreq[s] = (sumFreq[s] || 0) + 1;
      });
      const hotSums = Object.keys(sumFreq)
        .map(Number)
        .sort((a, b) => sumFreq[b] - sumFreq[a] || a - b)
        .slice(0, 6);
      const sumCards = hotSums.map(s => {
        const ratio = sumFreq[s] / Math.min(PREDICT_WINDOW, rows.length);
        const conf = Math.round(45 + ratio * 40);
        return predictCardHtml(`和 ${s}`, {
          pick: String(s),
          reason: `近 ${Math.min(PREDICT_WINDOW, rows.length)} 期出现 ${sumFreq[s]} 次`,
          confidence: conf
        }, '和' + s);
      }).join('');
      $('#predictBody').html(`
        <div class="k3-predict-hero">
          <div class="k3-predict-hero__label">热和值</div>
          <div class="k3-predict-hero__note">近 ${Math.min(PREDICT_WINDOW, rows.length)} 期高频总和，可作和值投注参考</div>
        </div>
        <div class="k3-predict-grid">${sumCards || '<div class="k3-bot-empty">数据不足</div>'}</div>`);
      return;
    }

    const stat = buildDicePredict(rows);
    const hotHtml = stat.hot.length
      ? stat.hot.map(x => predictDiceBtn(x.d, false)).join('')
      : '<span class="k3-predict-card__reason">—</span>';
    const coldHtml = stat.cold.map(x => predictDiceBtn(x.d, true)).join('');
    $('#predictBody').html(`
      <div class="k3-predict-hero">
        <div class="k3-predict-hero__label">骰点参考</div>
        <div class="k3-predict-hero__note">近 ${Math.min(PREDICT_WINDOW, rows.length)} 期各点数出现频次与遗漏</div>
      </div>
      <div class="k3-predict-digit-col">
        <div class="k3-predict-digit-col__label">热号</div>
        <div class="k3-predict-digit-balls">${hotHtml}</div>
        <div class="k3-predict-digit-col__label">遗漏</div>
        <div class="k3-predict-digit-balls">${coldHtml}</div>
      </div>`);
  }

  function openPredictSheet(open) {
    const $room = $('.k3-room');
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
      setTimeout(() => { if (!$('#predictSheet').hasClass('is-open')) $('#predictSheet').prop('hidden', true); }, 300);
      $room.removeClass('has-predict');
    }
  }

  function openPlusMenu(open) {
    const $room = $('.k3-room');
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

  // ===== 初始化 =====
  const initRemain = getRoundRemain();
  const initBettingSeq = getBettingIssueSeq();
  lastIssueSeq = getLastRevealedIssueSeq();
  lastDraw = randomDraw();
  historyRows = buildHistory(60);
  if (lastIssueSeq >= 1) {
    historyRows[0].issue = fmtIssue(lastIssueSeq);
    historyRows[0].nums = lastDraw.slice();
    historyRows[0].gy = sumMeta(lastDraw).text;
    historyRows[0].lh = shapeRow(lastDraw);
  }

  if (initRemain <= PREP_SEC) {
    const prepDraw = randomDraw();
    pendingDrawRow = {
      issue: fmtIssue(initBettingSeq),
      nums: prepDraw,
      gy: sumMeta(prepDraw).text,
      lh: shapeRow(prepDraw)
    };
    closedIssues.add(fmtIssue(initBettingSeq));
    drawnIssues.add(fmtIssue(initBettingSeq));
    pushRobotRolling(fmtIssue(initBettingSeq), prepDraw);
  }

  refreshStats();
  renderDrawBar(historyRows[0]);
  renderDrawTable();
  setCurIssueDisplay(fmtIssue(initBettingSeq));
  updateCountdownUI(getRoundRemain());
  initKeypad();
  initPlaySheet();
  initPlaySheetEvents();
  seedChat();

  function tick() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / INTERVAL) + 1;
    const r = INTERVAL - (elapsed % INTERVAL);
    const prepNow = r <= PREP_SEC;
    setCurIssueDisplay(fmtIssue(seq));
    updateCountdownUI(r);

    const issueCur = fmtIssue(seq);
    if (prepNow && !closedIssues.has(issueCur)) {
      closedIssues.add(issueCur);
      pushRobotClose(issueCur);
    }
    if (prepNow && !drawnIssues.has(issueCur)) {
      drawnIssues.add(issueCur);
      const newDraw = randomDraw();
      lastDraw = newDraw;
      lastIssueSeq = seq;
      pendingDrawRow = {
        issue: issueCur,
        nums: newDraw,
        gy: sumMeta(newDraw).text,
        lh: shapeRow(newDraw)
      };
      pushRobotRolling(issueCur, newDraw);
    }
    if (!prepNow && pendingDrawRow) {
      revealPendingDraw();
    }
  }

  setInterval(tick, 1000);
  setInterval(pushRandomBet, 8000);
  tick();

  $('#backBtn').on('click', () => App.go('../../client-app/pages/game-lobby/game-lobby.html' + q));
  /* === chat-rail handlers (k3) === */

  function openRulesSheet(open) {
    if (open) {
      const tip = '格式：玩法/金额，如 大/100、二同3/50、长牌12/100';
      let rows = '';
      if (typeof PLAY_CATEGORIES !== 'undefined' && PLAY_CATEGORIES && PLAY_CATEGORIES.length) {
        rows = PLAY_CATEGORIES.map(c => {
          const title = c.title || c.name || c.id || '';
          const hint = c.hint || '';
          return '<tr><td>' + title + '</td><td>' + hint + '</td></tr>';
        }).join('');
      }
      const html =
        '<p class="k3-rules-intro">' + tip + '</p>' +
        (rows
          ? '<table class="k3-rules-table"><thead><tr><th>玩法</th><th>说明</th></tr></thead><tbody>' + rows + '</tbody></table>'
          : '<p class="k3-rules-intro">点击右侧或输入栏「玩法」可点选下注；封盘后不可下注。</p>');
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
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=kuai3');
  }

  $('#btnCs').on('click', () => App.go('../../client-app/pages/cs/cs.html' + q));
  $('#btnExpand, #btnComposerPlay').on('click', () => openPlaySheet(true));
  $('#btnRules').on('click', () => openRulesSheet(true));
  $('#rulesSheetClose, #rulesMask').on('click', () => openRulesSheet(false));
  $('#btnRecords').on('click', () => goBetRecords());
  $('#playSheetClose, #playMask').on('click', () => openPlaySheet(false));
$('#btnSlip').on('click', () => {
    const sep = q.includes('?') ? '&' : '?';
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=kuai3');
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
  $('#drawToggle').on('click', function (e) {
    e.stopPropagation();
    toggleDrawPanel();
  });

  $('#chatInput').on('focus', () => { showKeypad(true); openPlusMenu(false); });
  $('#chatInput').on('input', () => updateComposerAction());
  $('#chatInput').on('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); sendBetMessage(); } });
  $('#keyGrid').on('click', '.k3-key', function () {
    insertInput($(this).data('key'));
    updateComposerAction();
  });
  $('#keypad').on('click', '[data-cmd]', function () {
    const cmd = $(this).data('cmd');
    if (cmd === 'cancel') { $('#chatInput').val(''); updateComposerAction(); return; }
    if (cmd === 'repeat') { repeatLastBet(); return; }
    if (cmd === 'allin') { applyAllinToInput(); return; }
    if (cmd === 'topup') { App.go('../../client-app/pages/recharge/recharge.html' + q); return; }
    if (cmd === 'withdraw') { App.toast('下分请联系客服'); return; }
  });
  $('#plusBtn').on('click', function () {
    if ($('#chatInput').val().trim()) { sendBetMessage(); return; }
    showKeypad(false);
    openPlusMenu(!$('#plusMenu').hasClass('is-open'));
  });
  $('#menuMask').on('click', () => openPlusMenu(false));
  $('#plusMenu').on('click', 'button', function () {
    const key = $(this).data('link');
    openPlusMenu(false);
    const routes = {
      recharge: '../../client-app/pages/recharge/recharge.html',
      withdraw: '../../client-app/pages/profile/profile.html',
      'apply-records': '../../client-app/pages/apply-records/apply-records.html',
      welfare: '../../client-app/pages/welfare/welfare.html',
      'bet-records': '../../client-app/pages/bet-records/bet-records.html',
      flow: '../../client-app/pages/flow/flow.html',
      'points-log': '../../client-app/pages/points-log/points-log.html'
    };
    if (key === 'redpack') { App.toast('红包报表 · 开发中'); return; }
    if (routes[key]) {
      let go = routes[key] + q;
      if (key === 'bet-records') go += (go.includes('?') ? '&' : '?') + 'game=kuai3';
      App.go(go);
    } else App.toast('即将开放');
  });
  $(document).on('click', function (e) {
    if (drawPanelOpen && !$(e.target).closest('#drawBar').length) {
      setDrawPanelOpen(false);
    }
    if (!$(e.target).closest('#keypad, #chatInput, .k3-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.k3-plus-menu, #plusBtn, .k3-menu-mask').length) showKeypad(false);
    }
  });
  updateComposerAction();
});
