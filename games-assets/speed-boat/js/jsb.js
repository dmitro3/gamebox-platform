/**
 * 幸运飞艇 · 聊天投注房
 * 界面对齐时时彩；玩法对齐官方 PK10/幸运飞艇：
 * 名次两面 / 龙虎 / 冠亚和值 / 定位艇号
 * BUILD 79 — 与 index.html ?v= 保持一致
 */
$(function () {
  // 1 分钟一期 = 0:56 下注 + 4s 准备开奖
  const INTERVAL = 60;
  const PREP_SEC = 4;

  function fixAvatar(url) {
    const fallback = '/legacy/images/default-avatar.svg';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/')) return url;
    return fallback;
  }

  function avatarHtml(name, seed) {
    const hue = (seed * 41 + (name.charCodeAt(0) || 0) * 17) % 360;
    const ch = name.charAt(0) || '?';
    return `<div class="jsb-msg__avatar jsb-msg__avatar--gen" style="--av-hue:${hue}"><span>${ch}</span></div>`;
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
  let drawPanelOpen = false;
  const closedIssues = new Set();
  const drawnIssues = new Set();
  let pendingDrawRow = null;
  const MOCK_NAMES = [];
  const issueBetBook = {};

  const POS_NAMES = ['冠军', '亚军', '季军', '第四名', '第五名', '第六名', '第七名', '第八名', '第九名', '第十名'];
  const POS = {};
  POS_NAMES.forEach((n, i) => { POS[n] = i; });
  const LHH_PAIRS = [[0, 9], [1, 8], [2, 7], [3, 6], [4, 5]];
  const ODDS = { side: 1.98, dragon: 1.98, position: 9.8 };
  const GY_SUM_ODDS = {
    3: 44.55, 4: 44.55, 5: 22.27, 6: 22.27, 7: 14.85, 8: 14.85,
    9: 11.13, 10: 11.13, 11: 8.91, 12: 8.91, 13: 11.13, 14: 11.13,
    15: 14.85, 16: 14.85, 17: 22.27, 18: 22.27, 19: 44.55
  };
  const SUOHA_WORDS = new Set(['梭哈', '全下', 'allin']);
  const DEFAULT_TRACK_IDX = 0;

  function sideOfBall(n) { return { big: n >= 6, odd: n % 2 === 1 }; }
  function gyMeta(nums) {
    const s = nums[0] + nums[1];
    return { sum: s, size: s > 11 ? '大' : '小', parity: s % 2 ? '单' : '双', text: `${s} ${s > 11 ? '大' : '小'} ${s % 2 ? '单' : '双'}` };
  }
  function lhRow(nums) {
    return LHH_PAIRS.map(([a, b]) => (nums[a] > nums[b] ? '龙' : '虎')).join('');
  }
  function matchSide(side, meta) {
    if (side === '大') return meta.big;
    if (side === '小') return !meta.big;
    if (side === '单') return meta.odd;
    return !meta.odd;
  }
  function parsePlay(raw) {
    const t = String(raw || '').replace(/\s+/g, '');
    let m;
    if ((m = t.match(/^冠亚(大|小|单|双)$/))) return { type: 'gySide', side: m[1], odds: ODDS.side };
    if ((m = t.match(/^冠亚和(1[0-9]|[3-9])$/))) {
      const sum = +m[1];
      if (sum < 3 || sum > 19) return null;
      return { type: 'gySum', sum, odds: GY_SUM_ODDS[sum] || 8.91 };
    }
    for (const name of POS_NAMES) {
      if ((m = t.match(new RegExp('^' + name + '(大|小|单|双)$')))) return { type: 'posSide', pos: POS[name], side: m[1], odds: ODDS.side };
      if ((m = t.match(new RegExp('^' + name + '(10|[1-9])$')))) {
        const num = +m[1];
        if (num < 1 || num > 10) return null;
        return { type: 'position', pos: POS[name], num, odds: ODDS.position };
      }
    }
    if ((m = t.match(/^([1-5])v(6|7|8|9|10)(龙|虎)$/))) {
      const a = +m[1] - 1; const b = +m[2] - 1;
      if (a >= b) return null;
      return { type: 'lhh', a, b, pick: m[3], odds: ODDS.dragon };
    }
    if ((m = t.match(/^([1-5])(龙|虎)$/))) {
      const pairIdx = +m[1] - 1;
      const [a, b] = LHH_PAIRS[pairIdx];
      return { type: 'lhh', a, b, pick: m[2], odds: ODDS.dragon };
    }
    if (t === '龙' || t === '虎') return { type: 'lhh', a: 0, b: 9, pick: t, odds: ODDS.dragon };
    if ((m = t.match(/^(大|小|单|双)$/))) return { type: 'posSide', pos: 0, side: m[1], odds: ODDS.side };
    return null;
  }
  function settleBet(play, amount, nums) {
    const p = parsePlay(play);
    if (!p) return { winAmount: 0, profit: -amount, hit: '' };
    let win = false;
    switch (p.type) {
      case 'gySide': {
        const gy = gyMeta(nums);
        if (p.side === '大') win = gy.sum > 11;
        else if (p.side === '小') win = gy.sum <= 11;
        else if (p.side === '单') win = gy.sum % 2 === 1;
        else win = gy.sum % 2 === 0;
        break;
      }
      case 'gySum': win = nums[0] + nums[1] === p.sum; break;
      case 'posSide': win = matchSide(p.side, sideOfBall(nums[p.pos])); break;
      case 'position': win = nums[p.pos] === p.num; break;
      case 'lhh': {
        const res = nums[p.a] > nums[p.b] ? '龙' : '虎';
        win = res === p.pick;
        break;
      }
    }
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * p.odds);
    return { winAmount, profit: winAmount - amount, hit: play };
  }
  function randomDraw() {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function digitToNum(ch) {
    if (ch === '0') return 10;
    if (ch >= '1' && ch <= '9') return +ch;
    return null;
  }
  function parseTrackDigits(s) {
    if (!s || !/^[0-9]+$/.test(s)) return null;
    const indices = [], seen = new Set();
    for (let i = 0; i < s.length; i++) {
      const n = digitToNum(s[i]);
      if (n === null) return null;
      if (seen.has(n)) continue;
      seen.add(n);
      indices.push(n - 1);
    }
    return indices.length ? indices : null;
  }
  function parseNumberDigits(s) {
    if (!s || !/^[0-9]+$/.test(s)) return null;
    const out = [];
    for (let i = 0; i < s.length; i++) {
      const n = digitToNum(s[i]);
      if (n === null) return null;
      out.push(n);
    }
    return out.length ? out : null;
  }
  function parseTracksFromStart(s) {
    const indices = [], seen = new Set();
    let i = 0;
    while (i < s.length) {
      const n = digitToNum(s[i]);
      if (n === null) break;
      i += 1;
      if (seen.has(n)) continue;
      seen.add(n);
      indices.push(n - 1);
    }
    return indices.length ? { indices, rest: s.slice(i) } : null;
  }
  function parsePairIndices(s) {
    if (!s || !/^[0-9]+$/.test(s)) return null;
    const out = [], seen = new Set();
    for (let i = 0; i < s.length; i++) {
      const n = digitToNum(s[i]);
      if (n === null || n < 1 || n > 5) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    return out.length ? out : null;
  }
  function expandLhhTracksPlay(pairStr, pick) {
    if (!/^[龙虎]$/.test(pick)) return null;
    const pairs = parsePairIndices(pairStr);
    if (!pairs) return null;
    const plays = [];
    pairs.forEach(n => { const play = n + pick; if (parsePlay(play)) plays.push(play); });
    return plays.length ? plays : null;
  }
  function expandLhhFromGlued(t) {
    const plays = [], re = /([1-5])([龙虎])/g;
    let m, consumed = '';
    while ((m = re.exec(t)) !== null) {
      const play = m[1] + m[2];
      if (!parsePlay(play)) return null;
      plays.push(play);
      consumed += m[0];
    }
    if (!plays.length || consumed !== t) return null;
    return plays;
  }
  function expandTrackPlay(trackIndices, playSeg) {
    const seg = String(playSeg || '').replace(/\s+/g, '');
    if (!seg) return null;
    const plays = [];
    if (/^[大小单双]$/.test(seg)) {
      trackIndices.forEach(idx => { const play = POS_NAMES[idx] + seg; if (parsePlay(play)) plays.push(play); });
      return plays.length ? plays : null;
    }
    const nums = parseNumberDigits(seg);
    if (nums) {
      trackIndices.forEach(idx => nums.forEach(num => {
        const play = POS_NAMES[idx] + num;
        if (parsePlay(play)) plays.push(play);
      }));
      return plays.length ? plays : null;
    }
    if (parsePlay(seg)) return [seg];
    return null;
  }
  function expandDefaultTrackPlay(t) {
    if (!t || !/^[0-9]+$/.test(t)) return null;
    return expandTrackPlay([DEFAULT_TRACK_IDX], t);
  }
  function expandPlayPart(playPart) {
    const t = String(playPart || '').replace(/\s+/g, '');
    if (!t) return null;
    const slashParts = t.split('/').filter(Boolean);
    if (slashParts.length === 2) {
      if (/^[龙虎]$/.test(slashParts[1])) {
        const lh = expandLhhTracksPlay(slashParts[0], slashParts[1]);
        if (lh) return lh;
      }
      const tracks = parseTrackDigits(slashParts[0]);
      if (tracks) {
        const expanded = expandTrackPlay(tracks, slashParts[1]);
        if (expanded) return expanded;
      }
    }
    if (/^[0-9]+[龙虎]$/.test(t)) {
      const m = t.match(/^([0-9]+)([龙虎])$/);
      if (m) { const lh = expandLhhTracksPlay(m[1], m[2]); if (lh) return lh; }
    }
    const lhGlued = expandLhhFromGlued(t);
    if (lhGlued) return lhGlued;
    const glued = parseTracksFromStart(t);
    if (glued && glued.rest && /^[大小单双]$/.test(glued.rest)) {
      const expanded = expandTrackPlay(glued.indices, glued.rest);
      if (expanded) return expanded;
    }
    if (/^[0-9]+$/.test(t)) {
      const def = expandDefaultTrackPlay(t);
      if (def) return def;
    }
    if (parsePlay(t)) return [t];
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
  /** 期号：无年份，每日 0 点起从 000001 递增 */
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
  /** 已揭晓的最新期序号（投注中/封盘准备时 = 当前期 - 1；当日首期返回 0） */
  function getLastRevealedIssueSeq() {
    return Math.max(0, getBettingIssueSeq() - 1);
  }
  function getCurrentIssue() {
    return fmtIssue(getBettingIssueSeq());
  }
  function isBettingOpen() {
    return getRoundRemain() > PREP_SEC;
  }

  const SIDE_CHARS = '大小单双';

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

  function betLogKey() { return 'jsb_bet_log_' + user.uid; }
  function loadUserBetLog() {
    try { return JSON.parse(localStorage.getItem(betLogKey())) || []; } catch (e) { return []; }
  }
  function saveUserBetLog(list) {
    localStorage.setItem(betLogKey(), JSON.stringify(list.slice(0, 120)));
    try { window.dispatchEvent(new CustomEvent('jsb-bet-log-updated')); } catch (e) { /* */ }
  }
  function appendUserBetLog(issue, play, amount) {
    const log = loadUserBetLog();
    let group = log.find(g => g.issue === issue);
    if (!group) {
      group = { game: 'speed-boat', issue, createdAt: new Date().toISOString(), settled: false, bets: [], totalAmount: 0, totalProfit: 0 };
      log.unshift(group);
    }
    group.bets.push({ play, amount, status: 'PENDING', profit: 0, winAmount: 0, hit: '' });
    group.totalAmount += amount;
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
      return `<div class="jsb-bot-card jsb-bot-card--bets"><div class="jsb-bot-card__head"><span class="jsb-bot-card__title">注单核对</span><span class="jsb-bot-card__issue">${issue}</span></div><div class="jsb-bot-empty">本期暂无下注</div></div>`;
    }
    const names = Object.keys(book);
    const users = names.map(name => {
      const bets = book[name];
      const total = bets.reduce((s, b) => s + b.amount, 0);
      const tags = bets.map(b => `<span class="jsb-bot-tag">${b.play}/${b.amount}</span>`).join('');
      return `<div class="jsb-bot-user${name === user.name ? ' is-me' : ''}"><div class="jsb-bot-user__head"><span class="jsb-bot-user__name">${name}</span><span class="jsb-bot-user__sum">${total}</span></div><div class="jsb-bot-user__tags">${tags}</div></div>`;
    }).join('');
    return `<div class="jsb-bot-card jsb-bot-card--bets"><div class="jsb-bot-card__head"><span class="jsb-bot-card__title">注单核对</span><span class="jsb-bot-card__issue">${issue}</span></div><div class="jsb-bot-card__body is-full">${users}</div></div>`;
  }

  function buildWinListVerifyHtml(issue, settled) {
    const winners = Object.keys(settled || {}).filter(n => settled[n].some(r => r.winAmount > 0));
    let body = winners.length ? winners.map(name => {
      const winRows = settled[name].filter(r => r.winAmount > 0);
      const totalProfit = settled[name].reduce((s, r) => s + r.profit, 0);
      const tags = winRows.map(r => `<span class="jsb-bot-tag jsb-bot-tag--win">${r.play}/${r.amount}</span>`).join('');
      return `<div class="jsb-bot-user"><div class="jsb-bot-user__head"><span class="jsb-bot-user__name">${name}</span><span class="jsb-bot-user__profit ${totalProfit >= 0 ? 'pos' : 'neg'}">${fmtProfit(totalProfit)}</span></div><div class="jsb-bot-user__tags">${tags}</div></div>`;
    }).join('') : '<div class="jsb-bot-empty">本期暂无中奖</div>';
    return `<div class="jsb-bot-card jsb-bot-card--win"><div class="jsb-bot-card__head"><span class="jsb-bot-card__title">中奖核对</span><span class="jsb-bot-card__issue">${issue}</span></div><div class="jsb-bot-card__body is-full">${body}</div></div>`;
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

  function applyUserSettle(issue, settled) {
    const rows = settled[user.name];
    if (!rows) return;
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
    saveStats(user.uid, stats);
    refreshStats();
  }

  function ballHtml(n, cls) {
    const c = cls ? ` ${cls}` : '';
    const file = './assets/balls/ball-' + String(n).padStart(2, '0') + '.png?v=n2';
    return `<span class="jsb-ball${c}" data-n="${n}"><img class="jsb-ball__img" src="${file}" alt="${n}" loading="lazy"></span>`;
  }

  function renderCountdownDigits(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const mm = pad(Math.floor(s / 60), 2);
    const ss = pad(s % 60, 2);
    const cells = $('#cdDigits .jsb-timer__cell');
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
      $('#cdPrep').prop('hidden', false).text(`封盘中 · ${Math.max(1, Math.ceil(r))}s 后揭晓`);
      $box.attr('aria-label', '封盘中，准备开奖');
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
    try { return JSON.parse(localStorage.getItem('jsb_stats_' + uid)) || { turnover: 0, winloss: 0, rebate: 0 }; } catch (e) { return { turnover: 0, winloss: 0, rebate: 0 }; }
  }
  function saveStats(uid, s) { localStorage.setItem('jsb_stats_' + uid, JSON.stringify(s)); }
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
      rows.push({ issue: fmtIssue(issueSeq), nums, gy: gyMeta(nums).text, lh: lhRow(nums) });
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
    $('#barBalls').html(row.nums.map(n => ballHtml(n, 'xs')).join(''));
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
    historyRows.unshift(pendingDrawRow);
    if (historyRows.length > 120) historyRows.pop();
    renderDrawBar(pendingDrawRow);
    renderDrawTable();
    flashDrawBarReveal();
    pushRobotResult(pendingDrawRow.nums, pendingDrawRow.issue, true);
    pendingDrawRow = null;
    if ($('#longSheet').hasClass('is-open')) renderLongDragonPanel();
    if ($('#predictSheet').hasClass('is-open')) renderPredictPanel();
  }

  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="jsb-draw-table__issue">${r.issue}</td>
      ${r.nums.map(n => `<td>${ballHtml(n, 'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g, '')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }

  function resultCardHtml(nums, issue) {
    const meta = gyMeta(nums);
    const lh = lhRow(nums);
    return JsbResultCard.build(nums, issue, meta, lh);
  }

  function scrollChat() {
    const el = document.getElementById('chatFeed');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function appendMsg(opts) {
    const time = opts.time || fmtTime(new Date());
    const avatar = opts.avatarHtml || `<div class="jsb-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const metaOther = `<div class="jsb-msg__meta"><span class="jsb-msg__name">${opts.name}</span><span class="jsb-msg__time">${time}</span></div>`;
    const metaSelf = `<div class="jsb-msg__meta"><span class="jsb-msg__time">${time}</span><span class="jsb-msg__name">${opts.name}</span></div>`;
    const bubbleCls = opts.robot ? 'jsb-msg__bubble jsb-msg__bubble--bot' : 'jsb-msg__bubble';
    const bubble = `<div class="${bubbleCls}">${opts.html}</div>`;
    const html = opts.self
      ? `<div class="jsb-msg is-self"><div class="jsb-msg__top">${metaSelf}${avatar}</div>${bubble}</div>`
      : `<div class="jsb-msg${opts.robot ? ' is-robot' : ''}">${avatar}<div class="jsb-msg__body">${metaOther}${bubble}</div></div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }

  function closeNoticeHtml(issue) {
    return `<div class="jsb-bot-close-line"><div class="jsb-bot-close-line__bar"><span class="jsb-bot-close-line__deco"></span><span class="jsb-bot-close-line__text">封 盘 线</span><span class="jsb-bot-close-line__deco"></span></div><div class="jsb-bot-close-line__sub">第 <span class="jsb-bot-close-line__issue">${issue}</span> 期 · 停止下注 · 即将开奖</div></div>`;
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
    applyUserSettle(issue, settled);
    const botAv = avatarHtml('机', 0);
    const resultDelay = syncReveal ? 0 : 600;
    setTimeout(() => {
      appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: resultCardHtml(nums, issue) });
      const card = $('#chatFeed .jsb-result-card').last()[0];
      if (card) JsbResultCard.bindStage(card);
    }, resultDelay);
    setTimeout(() => {
      appendMsg({ name: ROBOT.name, avatarHtml: botAv, robot: true, html: buildWinListVerifyHtml(issue, settled) });
    }, resultDelay + 1400);
  }

  function seedChat() {
    const prefixes = App.NAME_PREFIX || ['幸运'];
    const suffixes = App.NAME_SUFFIX || ['艇长'];
    MOCK_NAMES.length = 0;
    for (let i = 0; i < 8; i++) {
      const name = prefixes[i % prefixes.length] + suffixes[i % suffixes.length];
      const betText = `${POS_NAMES[i % 10]}${['大', '小', '单', '双'][i % 4]}/100`;
      MOCK_NAMES.push({ name });
      appendMsg({ name, avatarHtml: avatarHtml(name, i), html: betText });
      recordBet(name, betText);
    }
    appendMsg({ name: user.name, avatar: fixAvatar(user.avatar), self: true, html: '冠军大/100' });
    recordBet(user.name, '冠军大/100');
  }

  function initKeypad() {
    const left = ['大', '小', '单', '双'];
    const right = ['删除', '龙', '虎', '冠亚'];
    const mid = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9'], ['空格', '0', '/']];
    let html = '';
    for (let r = 0; r < 4; r++) {
      html += `<button type="button" class="jsb-key jsb-key--side" data-key="${left[r]}">${left[r]}</button>`;
      mid[r].forEach(k => { html += `<button type="button" class="jsb-key" data-key="${k}">${k}</button>`; });
      const rk = right[r];
      const cls = rk === '删除' ? ' jsb-key--del' : (rk === '冠亚' ? ' jsb-key--gy' : ' jsb-key--side');
      html += `<button type="button" class="jsb-key${cls}" data-key="${rk}">${rk}</button>`;
    }
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.jsb-room');
    if (show) { $('#keypad').prop('hidden', false); $room.addClass('has-keypad'); }
    else { $('#keypad').prop('hidden', true); $room.removeClass('has-keypad'); }
  }

  function insertInput(text) {
    const $in = $('#chatInput');
    const v = $in.val();
    if (text === '删除') { $in.val(v.slice(0, -1)); return; }
    if (text === '空格') { $in.val(v + ' '); return; }
    if (text === '冠亚') { $in.val(v + '冠亚'); return; }
    $in.val(v + text);
  }

  function updateComposerAction() {
    const hasText = !!$('#chatInput').val().trim();
    $('#plusBtn').toggleClass('is-send', hasText).text(hasText ? '发送' : '+');
  }

  function sendBetMessage() {
    const text = $('#chatInput').val().trim();
    if (!text) return;
    if (!isBettingOpen()) { App.toast('封盘中，无法下注'); return; }
    if (!parseBetInput(text)) {
      App.toast('格式：1357913/100（默认冠军）、龙/100（默认第1组龙虎）、2龙3虎/100');
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
    if (!lastBetText) {
      App.toast('暂无上次投注');
      return;
    }
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
    const plays = ['大', '小', '单', '双', '龙', '虎', '冠亚大', '冠亚单'];
    const pos = POS_NAMES[Math.floor(Math.random() * POS_NAMES.length)];
    const betText = `${pos}${plays[Math.floor(Math.random() * plays.length)]}/${[10, 20, 50, 100][Math.floor(Math.random() * 4)]}`;
    appendMsg({ name: n.name, avatarHtml: avatarHtml(n.name, n.name.length * 7), html: betText });
    recordBet(n.name, betText);
  }

  /* ================= 玩法面板 ================= */
  const AMOUNT_CHIPS = [10, 20, 50, 100, 200, 500];
  const PLAY_CATEGORIES = [
    {
      id: 'gySide', title: '冠亚两面', hint: '冠亚和 3-11 小 · 12-19 大 · 赔率 1.98',
      subs: null,
      items: ['冠亚大', '冠亚小', '冠亚单', '冠亚双'].map(p => ({ play: p, label: p, odds: ODDS.side }))
    },
    {
      id: 'posSide', title: '名次两面', hint: '6-10 为大 · 1-5 为小 · 可多选 · 赔率 1.98',
      subs: null,
      sideGroups: POS_NAMES.map(name => ({ label: name, prefix: name, odds: ODDS.side }))
    },
    {
      id: 'lhh', title: '龙虎', hint: '对称名次比大小 · 可多选 · 赔率 1.98',
      subs: null,
      items() {
        const list = [];
        LHH_PAIRS.forEach(([a, b]) => {
          const pr = (a + 1) + 'v' + (b + 1);
          ['龙', '虎'].forEach(x => list.push({ play: pr + x, label: x, pair: pr, odds: ODDS.dragon }));
        });
        return list;
      }
    },
    {
      id: 'gySum', title: '冠亚和值', hint: '猜冠亚军号码之和 3-19',
      subs: null,
      items: Array.from({ length: 17 }, (_, i) => {
        const sum = i + 3;
        return { play: '冠亚和' + sum, label: String(sum), odds: GY_SUM_ODDS[sum] || 8.91 };
      })
    },
    {
      id: 'position', title: '定位艇号', hint: '猜指定名次艇号 · 可多选 · 赔率 9.8',
      subs: null,
      mode: 'positionNum',
      odds: ODDS.position
    }
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
    $('#playAmountChips .jsb-play-foot__chip').removeClass('is-active');
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
      `<button type="button" class="jsb-play-nav__item${i === playCatIdx ? ' is-active' : ''}" data-idx="${i}">${c.title}</button>`
    ).join(''));
    $('#playAmountChips').html(AMOUNT_CHIPS.map(a =>
      `<button type="button" class="jsb-play-foot__chip${a === 100 ? ' is-active' : ''}" data-amt="${a}">${a}</button>`
    ).join(''));
  }

  function playItemHtml(play, label, odds, extraCls) {
    const cls = ['jsb-play-item', extraCls, isPlaySelected(play) ? 'is-active' : ''].filter(Boolean).join(' ');
    const oddsHtml = odds != null ? `<small>${odds}</small>` : '';
    return `<button type="button" class="${cls}" data-play="${play}"><span>${label}</span>${oddsHtml}</button>`;
  }

  function playNumItemHtml(posName, n) {
    const play = posName + n;
    const cls = ['jsb-play-item', 'jsb-play-item--num', isPlaySelected(play) ? 'is-active' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-play="${play}">${ballHtml(n, 'play')}</button>`;
  }

  function renderPlayPanel() {
    const cat = currentPlayCat();
    const $grid = $('#playGrid');
    $('#playHint').text(cat.hint);
    const $sub = $('#playSub');
    if (cat.subs && cat.subs.length) {
      $sub.removeClass('is-hidden').prop('hidden', false).html(
        cat.subs.map((s, i) => `<button type="button" class="jsb-play-sub__btn${i === playSubIdx ? ' is-active' : ''}" data-sub="${i}">${s}</button>`).join('')
      );
    } else {
      $sub.addClass('is-hidden').prop('hidden', true).empty();
    }

    let html = '';
    let gridMode = '';

    if (cat.id === 'gySide') {
      gridMode = 'is-gy-side';
      const items = typeof cat.items === 'function' ? cat.items() : cat.items;
      html = items.map(it => {
        const short = it.label.replace(/^冠亚/, '');
        return playItemHtml(it.play, short, it.odds, 'jsb-play-item--side');
      }).join('');
    } else if (cat.id === 'posSide' && cat.sideGroups) {
      gridMode = 'is-pos-num';
      html = cat.sideGroups.map(g => {
        const cells = ['大', '小', '单', '双'].map(side =>
          playItemHtml(g.prefix + side, side, g.odds, 'jsb-play-item--side')
        ).join('');
        return `<div class="jsb-play-pos-block jsb-play-pos-block--side">
          <div class="jsb-play-pos-block__head">
            <span class="jsb-play-pos-block__title">${g.label}</span>
            <span class="jsb-play-pos-block__hint">大小单双 · ${g.odds}</span>
          </div>
          <div class="jsb-play-pos-block__side">${cells}</div>
        </div>`;
      }).join('');
    } else if (cat.id === 'lhh') {
      gridMode = 'is-lhh';
      html = LHH_PAIRS.map(([a, b]) => {
        const pr = (a + 1) + 'v' + (b + 1);
        const cells = ['龙', '虎'].map(pick =>
          playItemHtml(pr + pick, pick, ODDS.dragon, 'jsb-play-item--lhh')
        ).join('');
        return `<div class="jsb-play-lhh-row"><span class="jsb-play-lhh-row__label">${pr}</span>${cells}</div>`;
      }).join('');
    } else if (cat.id === 'position' && cat.mode === 'positionNum') {
      gridMode = 'is-pos-num';
      html = POS_NAMES.map(name => {
        const nums = Array.from({ length: 10 }, (_, d) => playNumItemHtml(name, d + 1)).join('');
        return `<div class="jsb-play-pos-block">
          <div class="jsb-play-pos-block__head">
            <span class="jsb-play-pos-block__title">${name}</span>
            <span class="jsb-play-pos-block__hint">选该艇号 · 赔率 ${cat.odds}</span>
          </div>
          <div class="jsb-play-pos-block__nums">${nums}</div>
        </div>`;
      }).join('');
    } else {
      const items = typeof cat.items === 'function' ? cat.items() : cat.items;
      html = (items || []).map(it => playItemHtml(it.play, it.label, it.odds)).join('');
    }

    $grid.attr('class', `jsb-play-panel__grid${gridMode ? ' ' + gridMode : ''}`).html(html);
    $grid.scrollTop(0);
  }

  function openPlaySheet(open) {
    const $room = $('.jsb-room');
    if (open) {
      if (drawPanelOpen) setDrawPanelOpen(false);
      openLongSheet(false);
      openPredictSheet(false);
      playCatIdx = 0; playSubIdx = 0; playSelectedList = [];
      playAllin = false;
      $('#playAmount').val(100);
      syncPlayAmountUI();
      clearPlayAmountChipActive();
      $('#playAmountChips .jsb-play-foot__chip[data-amt="100"]').addClass('is-active');
      refreshStats();
      initPlaySheet(); renderPlayPanel(); updatePlaySelected();
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
    $('#playNav').on('click', '.jsb-play-nav__item', function () {
      playCatIdx = +$(this).data('idx');
      playSubIdx = 0;
      $('#playNav .jsb-play-nav__item').removeClass('is-active');
      $(this).addClass('is-active');
      renderPlayPanel();
    });
    $('#playSub').on('click', '.jsb-play-sub__btn', function () {
      playSubIdx = +$(this).data('sub');
      $('#playSub .jsb-play-sub__btn').removeClass('is-active');
      $(this).addClass('is-active');
      renderPlayPanel();
    });
    $('#playGrid').on('click', '.jsb-play-item', function () {
      const play = $(this).data('play');
      togglePlaySelect(play);
      $(this).toggleClass('is-active', isPlaySelected(play));
      updatePlaySelected();
    });
    $('#playAmountChips').on('click', '.jsb-play-foot__chip', function () {
      setPlayAmount(+$(this).data('amt'));
      clearPlayAmountChipActive();
      $(this).addClass('is-active');
    });
    $('#playAmountMinus').on('click', () => {
      const cur = parseInt($('#playAmount').val(), 10) || 100;
      const step = playAmountStep(cur);
      setPlayAmount(cur - step);
      clearPlayAmountChipActive();
    });
    $('#playAmountPlus').on('click', () => {
      const cur = parseInt($('#playAmount').val(), 10) || 0;
      const step = playAmountStep(cur);
      setPlayAmount(cur + step);
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

  function buildLongDragonGroups() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 10);
    const side = [];
    const lhh = [];
    const gy = [];
    if (!rows.length) return { side, lhh, gy };

    POS_NAMES.forEach((pos, idx) => {
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

    LHH_PAIRS.forEach(([a, b]) => {
      const labels = rows.map(r => (r.nums[a] > r.nums[b] ? '龙' : '虎'));
      const s = streakAtHead(labels);
      pushLongItem(lhh, `${a + 1}v${b + 1}${s.tag}`, s.count);
    });

    const gyRows = rows.map(r => gyMeta(r.nums));
    {
      const labels = gyRows.map(m => m.size);
      const s = streakAtHead(labels);
      pushLongItem(gy, `冠亚${s.tag}`, s.count);
    }
    {
      const labels = gyRows.map(m => m.parity);
      const s = streakAtHead(labels);
      pushLongItem(gy, `冠亚${s.tag}`, s.count);
    }

    const sortDesc = arr => arr.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
    return { side: sortDesc(side), lhh: sortDesc(lhh), gy: sortDesc(gy) };
  }

  function longItemParts(name) {
    for (const pos of POS_NAMES) {
      const m = name.match(new RegExp('^' + pos + '(大|小|单|双)$'));
      if (m) return { group: pos, tag: m[1], full: name };
    }
    const gyM = name.match(/^冠亚(大|小|单|双)$/);
    if (gyM) return { group: '冠亚和', tag: gyM[1], full: name };
    const lhhM = name.match(/^(\d+)v(\d+)(龙|虎)$/);
    if (lhhM) {
      const a = +lhhM[1];
      const b = +lhhM[2];
      const posA = POS_NAMES[a - 1] || a;
      const posB = POS_NAMES[b - 1] || b;
      return { group: '龙虎', tag: lhhM[3], full: `${posA} vs ${posB}` };
    }
    return { group: '形态', tag: name, full: name };
  }

  function longTagClass(tag) {
    if (['大', '龙'].includes(tag)) return 'tag-red';
    if (['小', '虎'].includes(tag)) return 'tag-blue';
    if (tag === '单') return 'tag-gold';
    if (tag === '双') return 'tag-purple';
    return 'tag-gold';
  }

  function longStreakBar(count) {
    const pct = Math.min(100, Math.round((count / 10) * 100));
    return `<div class="jsb-long-item__bar"><span style="width:${pct}%"></span></div>`;
  }

  function longTierClass(count) {
    if (count >= 5) return 'is-fire';
    if (count >= 3) return 'is-hot';
    return 'is-warm';
  }

  function renderLongDragonPanel() {
    const groups = buildLongDragonGroups();
    const list = groups[longTab] || [];
    const tabLabel = { side: '两面', lhh: '龙虎', gy: '冠亚' }[longTab] || '';
    if (!list.length) {
      $('#longSummary').text(`${tabLabel} · 暂无连续形态`);
      $('#longBody').html(`
        <div class="jsb-long-empty">
          <div class="jsb-long-empty__icon">◎</div>
          <div class="jsb-long-empty__text">当前没有 2 期以上的长龙</div>
          <div class="jsb-long-empty__hint">开奖后会自动更新</div>
        </div>`);
      return;
    }
    const top = list[0];
    const topParts = longItemParts(top.name);
    $('#longSummary').text(`${tabLabel} · 共 ${list.length} 条`);
    const hero = `
      <div class="jsb-long-hero ${longTierClass(top.count)}">
        <div class="jsb-long-hero__label">当前最长</div>
        <div class="jsb-long-hero__main">
          <span class="jsb-long-hero__tag ${longTagClass(topParts.tag)}">${topParts.tag}</span>
          <span class="jsb-long-hero__text">${topParts.full}</span>
          <span class="jsb-long-hero__num">${top.count}</span>
          <span class="jsb-long-hero__unit">期</span>
        </div>
      </div>`;
    const rows = list.map((item, idx) => {
      const parts = longItemParts(item.name);
      const tier = longTierClass(item.count);
      return `
        <div class="jsb-long-item ${tier}">
          <div class="jsb-long-item__rank">${idx + 1}</div>
          <div class="jsb-long-item__tag ${longTagClass(parts.tag)}">${parts.tag}</div>
          <div class="jsb-long-item__info">
            <div class="jsb-long-item__name">${parts.group}<span class="sep">·</span>${parts.full}</div>
            ${longStreakBar(item.count)}
          </div>
          <div class="jsb-long-item__count">
            <b>${item.count}</b><small>连</small>
          </div>
        </div>`;
    }).join('');
    $('#longBody').html(hero + `<div class="jsb-long-list">${rows}</div>`);
  }

  function openLongSheet(open) {
    const $room = $('.jsb-room');
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
    return `<div class="jsb-predict-card is-clickable"${playAttr} role="button" tabindex="0">
      <div class="jsb-predict-card__name">${name}</div>
      <div class="jsb-predict-card__pick">
        <span class="jsb-predict-card__tag ${predictTagClass(data.pick)}">${data.pick}</span>
        <span class="jsb-predict-card__conf">${pct}%</span>
      </div>
      <div class="jsb-predict-card__reason">${data.reason}</div>
      <div class="jsb-predict-card__bar"><span style="width:${pct}%"></span></div>
    </div>`;
  }

  function buildDigitPredict(rows, posIdx) {
    const window = Math.min(PREDICT_WINDOW, rows.length);
    const freq = Array(11).fill(0);
    const lastSeen = Array(11).fill(window);
    for (let i = 0; i < window; i++) {
      const d = rows[i].nums[posIdx];
      freq[d]++;
      if (lastSeen[d] === window) lastSeen[d] = i;
    }
    const hot = freq
      .map((c, d) => ({ d, c }))
      .filter(x => x.d >= 1)
      .sort((a, b) => b.c - a.c || a.d - b.d)
      .slice(0, 2)
      .filter(x => x.c > 0);
    const cold = lastSeen
      .map((gap, d) => ({ d, gap }))
      .filter(x => x.d >= 1)
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
    updateComposerAction();
    showKeypad(true);
    openPredictSheet(false);
    App.toast(`已填入 ${play}/${amount}`);
  }

  function renderPredictPanel() {
    const rows = historyRows.filter(r => Array.isArray(r.nums) && r.nums.length === 10);
    const issue = getPredictIssue();
    $('#predictSummary').text(`下一期 · ${issue}`);
    if (!rows.length) {
      $('#predictBody').html(`
        <div class="jsb-long-empty">
          <div class="jsb-long-empty__icon">◎</div>
          <div class="jsb-long-empty__text">暂无开奖数据</div>
          <div class="jsb-long-empty__hint">等待开奖后生成预测</div>
        </div>`);
      return;
    }

    if (predictTab === 'side') {
      const cards = [];
      POS_NAMES.forEach((pos, idx) => {
        const ballMeta = rows.map(r => sideOfBall(r.nums[idx]));
        const bigData = pickByTrend(ballMeta.map(m => (m.big ? '大' : '小')), PREDICT_STREAK_BREAK);
        const oddData = pickByTrend(ballMeta.map(m => (m.odd ? '单' : '双')), PREDICT_STREAK_BREAK);
        cards.push(predictCardHtml(`${pos} · 大小`, bigData, pos + bigData.pick));
        cards.push(predictCardHtml(`${pos} · 单双`, oddData, pos + oddData.pick));
      });
      const champMeta = rows.map(r => sideOfBall(r.nums[0]));
      const champBig = pickByTrend(champMeta.map(m => (m.big ? '大' : '小')), PREDICT_STREAK_BREAK);
      const champOdd = pickByTrend(champMeta.map(m => (m.odd ? '单' : '双')), PREDICT_STREAK_BREAK);
      const hero = `
        <div class="jsb-predict-hero">
          <div class="jsb-predict-hero__label">核心参考</div>
          <div class="jsb-predict-hero__main">
            <div class="jsb-predict-hero__tags">
              <span class="jsb-predict-card__tag ${predictTagClass(champBig.pick)} is-clickable" data-predict-play="冠军${champBig.pick}" role="button" tabindex="0">冠军${champBig.pick}</span>
              <span class="jsb-predict-card__tag ${predictTagClass(champOdd.pick)} is-clickable" data-predict-play="冠军${champOdd.pick}" role="button" tabindex="0">冠军${champOdd.pick}</span>
            </div>
            <div class="jsb-predict-hero__note">冠军倾向 ${champBig.pick}${champOdd.pick}，${champBig.reason}</div>
          </div>
        </div>`;
      $('#predictBody').html(hero + `<div class="jsb-predict-grid">${cards.join('')}</div>`);
      return;
    }

    if (predictTab === 'num') {
      const cols = POS_NAMES.map((pos, idx) => {
        const stat = buildDigitPredict(rows, idx);
        const hotHtml = stat.hot.length
          ? stat.hot.map(x =>
            `<span class="jsb-ball-digit is-clickable" data-predict-play="${pos}${x.d}" role="button" tabindex="0">${x.d}</span>`
          ).join('')
          : '<span class="jsb-predict-card__reason">—</span>';
        const coldHtml = stat.cold.map(x =>
          `<span class="jsb-ball-digit is-cold is-clickable" data-predict-play="${pos}${x.d}" role="button" tabindex="0">${x.d}</span>`
        ).join('');
        return `<div class="jsb-predict-digit-col">
          <div class="jsb-predict-digit-col__pos">${pos}</div>
          <div class="jsb-predict-digit-col__label">热号</div>
          <div class="jsb-predict-digit-balls">${hotHtml}</div>
          <div class="jsb-predict-digit-col__label">遗漏</div>
          <div class="jsb-predict-digit-balls">${coldHtml}</div>
        </div>`;
      }).join('');
      $('#predictBody').html(`
        <div class="jsb-predict-hero">
          <div class="jsb-predict-hero__label">定位参考</div>
          <div class="jsb-predict-hero__note">近 ${Math.min(PREDICT_WINDOW, rows.length)} 期各名次热号与遗漏号，可作定位艇号参考</div>
        </div>
        <div class="jsb-predict-digit-grid">${cols}</div>`);
      return;
    }

    const gyRows = rows.map(r => gyMeta(r.nums));
    const sizeData = pickByTrend(gyRows.map(m => m.size), PREDICT_STREAK_BREAK);
    const oddData = pickByTrend(gyRows.map(m => m.parity), PREDICT_STREAK_BREAK);
    const sumFreq = {};
    rows.slice(0, PREDICT_WINDOW).forEach(r => {
      const s = gyMeta(r.nums).sum;
      sumFreq[s] = (sumFreq[s] || 0) + 1;
    });
    const hotSums = Object.keys(sumFreq)
      .map(Number)
      .sort((a, b) => sumFreq[b] - sumFreq[a] || a - b)
      .slice(0, 3);
    const sumCards = hotSums.map(s => {
      const ratio = sumFreq[s] / Math.min(PREDICT_WINDOW, rows.length);
      const conf = Math.round(45 + ratio * 40);
      return predictCardHtml(`冠亚和 ${s}`, {
        pick: String(s),
        reason: `近 ${Math.min(PREDICT_WINDOW, rows.length)} 期出现 ${sumFreq[s]} 次`,
        confidence: conf
      }, `冠亚和${s}`);
    }).join('');
    const lhhCards = LHH_PAIRS.map(([a, b], i) => {
      const labels = rows.map(r => (r.nums[a] > r.nums[b] ? '龙' : '虎'));
      const data = pickByTrend(labels, PREDICT_STREAK_BREAK);
      const play = `${i + 1}${data.pick}`;
      return predictCardHtml(`${POS_NAMES[a]} vs ${POS_NAMES[b]}`, data, play);
    }).join('');
    const hero = `
      <div class="jsb-predict-hero">
        <div class="jsb-predict-hero__label">冠亚参考</div>
        <div class="jsb-predict-hero__main">
          <div class="jsb-predict-hero__tags">
            <span class="jsb-predict-card__tag ${predictTagClass(sizeData.pick)} is-clickable" data-predict-play="冠亚${sizeData.pick}" role="button" tabindex="0">冠亚${sizeData.pick}</span>
            <span class="jsb-predict-card__tag ${predictTagClass(oddData.pick)} is-clickable" data-predict-play="冠亚${oddData.pick}" role="button" tabindex="0">冠亚${oddData.pick}</span>
          </div>
          <div class="jsb-predict-hero__note">${sizeData.reason}</div>
        </div>
      </div>`;
    $('#predictBody').html(hero
      + `<div class="jsb-predict-grid">${predictCardHtml('冠亚 · 大小', sizeData, '冠亚' + sizeData.pick)}${predictCardHtml('冠亚 · 单双', oddData, '冠亚' + oddData.pick)}</div>`
      + `<div class="jsb-predict-hero" style="margin-top:12px"><div class="jsb-predict-hero__label">热和值</div></div>`
      + `<div class="jsb-predict-grid">${sumCards}</div>`
      + `<div class="jsb-predict-hero" style="margin-top:12px"><div class="jsb-predict-hero__label">龙虎走势</div></div>`
      + `<div class="jsb-predict-grid">${lhhCards}</div>`);
  }

  function openPredictSheet(open) {
    const $room = $('.jsb-room');
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
    const $room = $('.jsb-room');
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
    historyRows[0].gy = gyMeta(lastDraw).text;
    historyRows[0].lh = lhRow(lastDraw);
  }

  if (initRemain <= PREP_SEC) {
    const prepDraw = randomDraw();
    pendingDrawRow = {
      issue: fmtIssue(initBettingSeq),
      nums: prepDraw,
      gy: gyMeta(prepDraw).text,
      lh: lhRow(prepDraw)
    };
    closedIssues.add(fmtIssue(initBettingSeq));
    drawnIssues.add(fmtIssue(initBettingSeq));
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
        gy: gyMeta(newDraw).text,
        lh: lhRow(newDraw)
      };
    }
    if (!prepNow && pendingDrawRow) {
      revealPendingDraw();
    }
  }

  setInterval(tick, 1000);
  setInterval(pushRandomBet, 8000);
  tick();

  $('#backBtn').on('click', () => App.go('../../client-app/pages/game-lobby/game-lobby.html' + q));
  $('#btnCs').on('click', () => App.go('../../client-app/pages/cs/cs.html' + q));
  $('#btnExpand').on('click', () => openPlaySheet(true));
  $('#playSheetClose, #playMask').on('click', () => openPlaySheet(false));
  $('#btnRedpack').on('click', () => App.toast('红包 · 开发中'));
  $('#btnSlip').on('click', () => {
    const sep = q.includes('?') ? '&' : '?';
    App.go('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=speed-boat');
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
  $('#keyGrid').on('click', '.jsb-key', function () { insertInput($(this).data('key')); updateComposerAction(); });
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
      'bet-records': '../../client-app/pages/bet-records/bet-records.html',
      flow: '../../client-app/pages/flow/flow.html',
      'points-log': '../../client-app/pages/points-log/points-log.html'
    };
    if (key === 'redpack') { App.toast('红包报表 · 开发中'); return; }
    if (routes[key]) App.go(routes[key] + q);
    else App.toast('即将开放');
  });
  $(document).on('click', function (e) {
    if (drawPanelOpen && !$(e.target).closest('#drawBar').length) {
      setDrawPanelOpen(false);
    }
    if (!$(e.target).closest('#keypad, #chatInput, .jsb-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.jsb-plus-menu, #plusBtn, .jsb-menu-mask').length) showKeypad(false);
    }
  });
  updateComposerAction();
});
