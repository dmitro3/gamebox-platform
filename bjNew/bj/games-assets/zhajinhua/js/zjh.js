/**
 * 游戏类型: card3
 *
 * 炸金花 · 平台派牌 · 一副牌三张 · 聊天投注房
 */
$(function () {
  const GAME_TYPE = 'card3';

  const BET_SEC = 40;
  const FREEZE_SEC = 15;
  const DRAW_SEC = 6;
  const INTERVAL = BET_SEC + FREEZE_SEC + DRAW_SEC;
  const DEAL_MS = 420;
  const HISTORY_SHOW = 10;

  const PLAY_ITEMS = ['大', '小', '单', '双', '豹子', '顺子', '金花', '对子', '散牌', '红', '黑'];
  const PLAY_ITEMS_SORTED = [...PLAY_ITEMS].sort((a, b) => b.length - a.length);
  const ODDS = {
    '大': 1.98,
    '小': 1.98,
    '单': 1.98,
    '双': 1.98,
    '红': 1.98,
    '黑': 1.98,
    '散牌': 2.2,
    '对子': 3.0,
    '金花': 4.5,
    '顺子': 8.0,
    '豹子': 50.0
  };

  const SUITS = [
    { sym: '♠', key: 'spade', color: 0 },
    { sym: '♥', key: 'heart', color: 1 },
    { sym: '♣', key: 'club', color: 0 },
    { sym: '♦', key: 'diamond', color: 1 }
  ];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const TYPE_CLASS = {
    '豹子': 'is-leopard',
    '顺子': 'is-straight',
    '金花': 'is-flush',
    '对子': 'is-pair',
    '散牌': 'is-high'
  };

  function fixAvatar(url) {
    const fallback = '../../client-app/assets/images/avatars/001.jpg';
    if (!url) return fallback;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('../../assets/')) {
      return '../../client-app/assets/' + url.slice('../../assets/'.length);
    }
    if (url.startsWith('../assets/')) {
      return '../../client-app/assets/' + url.slice('../assets/'.length);
    }
    return url;
  }

  const ROBOT = { name: '机器人', avatar: '../../client-app/assets/images/avatars/001.jpg' };
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const user = App.getUser();
  const q = roomNo ? '?roomNo=' + encodeURIComponent(roomNo) : '';

  let historyRows = [];
  let lastDraw = null;
  let lastIssueSeq = 0;
  let lastBetText = '';
  let drawPanelOpen = false;
  const closedIssues = new Set();
  const drawnIssues = new Set();
  const MOCK_NAMES = [];
  const issueBetBook = {};
  let dealAnimationRunning = false;

  function getRoundRemain() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return INTERVAL - (elapsed % INTERVAL);
  }
  function getCurrentIssue() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    return fmtIssue8(Math.floor(elapsed / INTERVAL) + 1);
  }
  function isBettingOpen() {
    const r = getRoundRemain();
    return r > FREEZE_SEC && r <= INTERVAL - DRAW_SEC;
  }

  function parseBet(text) {
    const t = String(text || '').trim();
    const m = t.match(/(\d+)\s*$/);
    if (!m) return null;
    const amount = parseInt(m[1], 10);
    const playRaw = t.slice(0, m.index).trim();
    if (!amount || !playRaw) return null;
    const play = PLAY_ITEMS_SORTED.find(p => playRaw === p);
    if (!play) return null;
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

  function rankVal(rank) {
    if (rank === 'A') return 14;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank, 10);
  }

  function makeCard(suitObj, rank) {
    const val = rankVal(rank);
    return {
      suit: suitObj.sym,
      suitKey: suitObj.key,
      rank,
      val,
      red: suitObj.color === 1,
      text: suitObj.sym + rank
    };
  }

  function buildShoe() {
    const cards = [];
    SUITS.forEach(s => {
      RANKS.forEach(r => cards.push(makeCard(s, r)));
    });
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function isStraight(vals) {
    const sorted = vals.slice().sort((a, b) => a - b);
    if (sorted[2] - sorted[0] === 2 && sorted[1] - sorted[0] === 1) return true;
    if (sorted[0] === 2 && sorted[1] === 3 && sorted[2] === 14) return true;
    return false;
  }

  function evalZjh(cards) {
    const vals = cards.map(c => c.val);
    const sortedDesc = vals.slice().sort((a, b) => b - a);
    const redCount = cards.filter(c => c.red).length;
    const sum = vals.reduce((s, v) => s + (v > 10 ? 10 : v), 0);

    if (sortedDesc[0] === sortedDesc[1] && sortedDesc[1] === sortedDesc[2]) {
      return { type: '豹子', max: sortedDesc[0], sum, redCount, maxRank: sortedDesc[0] };
    }
    if (isStraight(vals)) {
      return { type: '顺子', max: sortedDesc[0], sum, redCount, maxRank: sortedDesc[0] };
    }
    const sameSuit = cards[0].suitKey === cards[1].suitKey && cards[1].suitKey === cards[2].suitKey;
    if (sameSuit) {
      return { type: '金花', max: sortedDesc[0], sum, redCount, maxRank: sortedDesc[0] };
    }
    if (sortedDesc[0] === sortedDesc[1] || sortedDesc[1] === sortedDesc[2] || sortedDesc[0] === sortedDesc[2]) {
      const pairVal = sortedDesc[0] === sortedDesc[1] ? sortedDesc[0] : sortedDesc[1];
      return { type: '对子', max: pairVal, sum, redCount, maxRank: pairVal };
    }
    return { type: '散牌', max: sortedDesc[0], sum, redCount, maxRank: sortedDesc[0] };
  }

  function randomDraw() {
    const shoe = buildShoe();
    const cards = shoe.splice(0, 3);
    const evalObj = evalZjh(cards);
    return { cards, eval: evalObj, result: evalObj.type };
  }

  function cardImgPath(c) {
    return `./assets/cards/${c.suitKey}_${c.rank}.png`;
  }

  function cardSpan(c, cls) {
    const imgPath = cardImgPath(c);
    return `<span class="zjh-card ${c.red ? 'is-red' : ''} ${cls || ''}" data-src="${imgPath}">${c.text}</span>`;
  }

  function createTableCardEl(c) {
    const el = document.createElement('span');
    el.className = `zjh-card zjh-card--deal ${c.red ? 'is-red' : ''}`;
    el.setAttribute('data-src', cardImgPath(c));
    el.textContent = c.text;
    return el;
  }

  function clearDealTable() {
    document.querySelectorAll('.zjh-deal-slot').forEach(slot => { slot.innerHTML = ''; });
    $('#handType').text('—').removeClass('is-leopard is-straight is-flush is-pair is-high');
    $('#metaPoint, #metaColor').text('—');
    $('#zoneHand').removeClass('is-reveal');
    $('#dealerTable').removeClass('is-dealing is-revealed is-shuffle');
  }

  function updateDealMeta(draw) {
    const e = draw.eval;
    const maxLabel = e.maxRank >= 11 ? ['J', 'Q', 'K', 'A'][e.maxRank - 11] : String(e.maxRank);
    $('#handType').text(e.type).removeClass('is-leopard is-straight is-flush is-pair is-high')
      .addClass(TYPE_CLASS[e.type] || '');
    $('#metaPoint').text('最大 ' + maxLabel);
    $('#metaColor').text(e.redCount >= 2 ? '偏红' : e.redCount === 1 ? '红黑各一' : '偏黑');
  }

  function placeCardInSlot(index, card) {
    const slot = document.querySelector(`#handSlots .zjh-deal-slot[data-i="${index}"]`);
    if (!slot) return;
    slot.innerHTML = '';
    slot.appendChild(createTableCardEl(card));
    hydrateCardImages(slot);
  }

  function renderDealTableStatic(draw, reveal) {
    if (!draw) return;
    clearDealTable();
    draw.cards.forEach((c, i) => placeCardInSlot(i, c));
    updateDealMeta(draw);
    if (reveal) {
      $('#dealerTable').addClass('is-revealed');
      $('#zoneHand').addClass('is-reveal');
    }
    $('#dealerStatus').text(draw.result);
  }

  function flyCard(fromEl, toSlot, card, index, done) {
    const layer = document.getElementById('flyingLayer');
    const dealer = document.getElementById('dealerTable');
    if (!layer || !dealer || !fromEl || !toSlot) {
      placeCardInSlot(index, card);
      done();
      return;
    }
    const dRect = dealer.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    const tRect = toSlot.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'zjh-fly-card';
    const inner = createTableCardEl(card);
    inner.classList.add('zjh-card--fly');
    fly.appendChild(inner);
    layer.appendChild(fly);
    hydrateCardImages(fly);

    const cardW = 42;
    const cardH = 58;
    const sx = fRect.left + fRect.width / 2 - dRect.left - cardW / 2;
    const sy = fRect.top + fRect.height / 2 - dRect.top - cardH / 2;
    const ex = tRect.left + tRect.width / 2 - dRect.left - cardW / 2;
    const ey = tRect.top + tRect.height / 2 - dRect.top - cardH / 2;

    fly.style.setProperty('--fx0', sx + 'px');
    fly.style.setProperty('--fy0', sy + 'px');
    fly.style.setProperty('--fx1', ex + 'px');
    fly.style.setProperty('--fy1', ey + 'px');
    toSlot.classList.add('is-catching');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fly.classList.add('is-active'));
    });

    setTimeout(() => {
      placeCardInSlot(index, card);
      fly.remove();
      toSlot.classList.remove('is-catching');
      done();
    }, DEAL_MS);
  }

  function startDealSequence(draw, issue, row) {
    if (dealAnimationRunning) return;
    dealAnimationRunning = true;
    clearDealTable();
    $('#dealerTable').addClass('is-shuffle');
    $('#dealerStatus').text('洗牌中…');

    setTimeout(() => {
      $('#dealerTable').removeClass('is-shuffle').addClass('is-dealing');
      $('#dealerStatus').text('发牌中…');

      let step = 0;
      function next() {
        if (step >= 3) {
          finishDealSequence(draw, issue, row);
          return;
        }
        const index = step;
        const card = draw.cards[index];
        const deckEl = document.getElementById('shoeDeck');
        const slot = document.querySelector(`#handSlots .zjh-deal-slot[data-i="${index}"]`);
        flyCard(deckEl, slot, card, index, () => {
          step++;
          next();
        });
      }
      next();
    }, 500);
  }

  function finishDealSequence(draw, issue, row) {
    updateDealMeta(draw);
    $('#dealerStatus').text(draw.result);
    $('#dealerTable').removeClass('is-dealing').addClass('is-revealed');
    $('#zoneHand').addClass('is-reveal');
    renderDrawBar(row);
    renderDrawTable();
    pushRobotResult(draw, issue);
    dealAnimationRunning = false;
    setTimeout(() => hydrateCardImages(document.getElementById('chatFeed')), 400);
  }

  function rowFromDraw(issue, draw) {
    return {
      issue,
      draw,
      gy: draw.eval.type,
      lh: draw.eval.type
    };
  }

  function renderDrawBar(row) {
    if (!row || !row.draw) return;
    const d = row.draw;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(d.cards.map(c => cardSpan(c, 'xs')).join(''));
    $('#barGy').text('牌型 ' + d.eval.type);
    hydrateCardImages(document.getElementById('barBalls'));
  }

  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => {
      const d = r.draw;
      if (!d) return '';
      return `<tr>
        <td class="cell-issue">${r.issue}</td>
        ${d.cards.map(c => `<td>${cardSpan(c, 'tbl')}</td>`).join('')}
        <td class="cell-gy">${d.eval.type}</td>
        <td class="cell-lh">${d.eval.maxRank >= 11 ? ['J', 'Q', 'K', 'A'][d.eval.maxRank - 11] : d.eval.maxRank}</td>
      </tr>`;
    }).join(''));
    hydrateCardImages(document.getElementById('drawTableBody'));
  }

  function resultCardHtml(draw, issue) {
    const e = draw.eval;
    return `<div class="zjh-result-card">
      <div class="zjh-result-card__head">
        <span class="zjh-result-card__title">炸金花 · 平台派牌</span>
        <span class="zjh-result-card__badge">${e.type}</span>
      </div>
      <div class="zjh-result-card__body">
        <div class="zjh-result-card__cards">${draw.cards.map(c => cardSpan(c, 'sm')).join('')}</div>
      </div>
      <div class="zjh-result-card__foot">
        <div class="zjh-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
        <div class="zjh-result-stat"><span class="k">牌型</span><span class="v">${e.type}</span></div>
        <div class="zjh-result-stat"><span class="k">最大牌</span><span class="v">${e.maxRank >= 11 ? ['J', 'Q', 'K', 'A'][e.maxRank - 11] : e.maxRank}</span></div>
      </div>
    </div>`;
  }

  function settleBet(play, amount, draw) {
    const e = draw.eval;
    let win = false;
    if (play === '大') win = e.maxRank >= 8;
    else if (play === '小') win = e.maxRank <= 7;
    else if (play === '单') win = e.sum % 2 === 1;
    else if (play === '双') win = e.sum % 2 === 0;
    else if (play === '红') win = e.redCount >= 2;
    else if (play === '黑') win = e.redCount <= 1;
    else if (play === e.type) win = true;

    if (!win) {
      return { winAmount: 0, profit: -amount, hit: '', turnover: amount };
    }
    const mult = ODDS[play];
    return {
      winAmount: Math.round(amount * mult),
      profit: Math.round(amount * (mult - 1)),
      hit: play,
      turnover: amount
    };
  }

  function settleIssue(issue, draw) {
    const book = issueBetBook[issue];
    if (!book) return {};
    const out = {};
    Object.keys(book).forEach(name => {
      out[name] = book[name].map(b => {
        const r = settleBet(b.play, b.amount, draw);
        return { play: b.play, amount: b.amount, ...r };
      });
    });
    return out;
  }

  function buildWinListVerifyText(issue, settled) {
    const winners = Object.keys(settled).filter(name => {
      return settled[name].some(r => r.hit && r.profit > 0);
    });
    if (!winners.length) {
      return `${issue}期\n中奖列表核对\n——————————\n本期暂无中奖`;
    }
    const blocks = winners.map(name => {
      const rows = settled[name];
      const totalWin = rows.reduce((s, r) => s + r.winAmount, 0);
      const totalProfit = rows.reduce((s, r) => s + r.profit, 0);
      const hits = rows.filter(r => r.hit).map(r => r.hit);
      return `${name}  中奖金额：+${totalWin}\n${hits.join('、')}\n输赢：${fmtProfit(totalProfit)}`;
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
      turnover += r.turnover || 0;
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

  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function fmtIssue8(seq) {
    return '3407' + pad(Math.max(1, seq) % 10000, 4);
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
    const $box = $('#countdownBox').removeClass('is-freeze is-drawing');
    if (r > INTERVAL - DRAW_SEC) {
      $box.addClass('is-drawing');
      $('#cdLabel').text('开奖');
      $('#cdTime').text('···');
      setCountdownProgress((r - (INTERVAL - DRAW_SEC)) / DRAW_SEC);
    } else if (r <= FREEZE_SEC) {
      $box.addClass('is-freeze');
      $('#cdLabel').text('封盘');
      $('#cdTime').text(fmtMmss(r));
      setCountdownProgress(r / FREEZE_SEC);
    } else {
      $('#cdLabel').text('距封盘');
      $('#cdTime').text(fmtMmss(r - FREEZE_SEC));
      setCountdownProgress((r - FREEZE_SEC) / BET_SEC);
    }
  }

  function getStats(uid) {
    const key = 'zjh_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('zjh_stats_' + uid, JSON.stringify(s));
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

  function buildHistory(count) {
    const rows = [];
    const base = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
    for (let i = 0; i < count; i++) {
      const draw = i === 0 && lastDraw ? lastDraw : randomDraw();
      rows.push(rowFromDraw(fmtIssue8(base - i), draw));
    }
    return rows;
  }

  function scrollChat() {
    const el = document.getElementById('chatFeed');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function appendMsg(opts) {
    const time = opts.time || fmtTime(new Date());
    const avatar = `<div class="zjh-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="zjh-msg__meta">
      <span class="zjh-msg__name">${opts.name}</span>
      <span class="zjh-msg__time">${time}</span>
    </div>`;
    const bubble = `<div class="zjh-msg__bubble">${opts.html}</div>`;
    const html = opts.self
      ? `<div class="zjh-msg is-self">
        <div class="zjh-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="zjh-msg${opts.robot ? ' is-robot' : ''}">
        ${avatar}
        <div class="zjh-msg__body">${meta}${bubble}</div>
      </div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }

  function pushRobotClose(issue) {
    appendMsg({
      name: ROBOT.name,
      avatar: ROBOT.avatar,
      robot: true,
      html: '<div class="zjh-msg__bubble--line">======封盘线======<br>=====停止战斗=====</div>'
    });
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="zjh-msg__bubble--list"><pre>${buildBetListVerifyText(issue)}</pre></div>`
      });
    }, 500);
  }

  function pushRobotResult(draw, issue) {
    const settled = settleIssue(issue, draw);
    applyUserSettle(issue, settled);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: resultCardHtml(draw, issue)
      });
      hydrateCardImages(document.getElementById('chatFeed'));
    }, 800);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="zjh-msg__bubble--list"><pre>${buildWinListVerifyText(issue, settled)}</pre></div>`
      });
    }, 1500);
  }

  function seedChat() {
    const names = App.NAME_PREFIX || ['幸运'];
    const suffix = App.NAME_SUFFIX || ['玩家'];
    MOCK_NAMES.length = 0;
    for (let i = 0; i < 8; i++) {
      const name = names[i % names.length] + suffix[i % suffix.length];
      const num = pad(1 + (i % 162), 3);
      const ext = [22, 78, 86].includes(1 + (i % 162)) ? 'png' : 'jpg';
      const avatar = `../../client-app/assets/images/avatars/${num}.${ext}`;
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
    const right = ['删除', '0', '00', '500'];
    const mid = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['空格', '0', '/']
    ];
    let html = '';
    for (let r = 0; r < 4; r++) {
      const lk = left[r];
      html += `<button type="button" class="zjh-key zjh-key--side" data-key="${lk}">${lk}</button>`;
      mid[r].forEach(k => {
        html += `<button type="button" class="zjh-key" data-key="${k}">${k}</button>`;
      });
      const rk = right[r];
      const cls = rk === '删除' ? ' zjh-key--del' : (r === 3 ? ' zjh-key--type' : ' zjh-key--side');
      const keyVal = r === 3 ? '牌' : rk;
      html += `<button type="button" class="zjh-key${cls}" data-key="${keyVal}">${keyVal}</button>`;
    }
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.zjh-room');
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
      return;
    }
    if (text === '空格') {
      $in.val(v + ' ');
      return;
    }
    if (text === '牌') {
      openPlaySheet(true);
      return;
    }
    $in.val(v + text);
  }

  function sendBetMessage() {
    const text = $('#chatInput').val().trim();
    if (!text) return;
    if (!isBettingOpen()) {
      App.toast('封盘中，无法下注');
      return;
    }
    if (!parseBet(text)) {
      App.toast('格式：玩法 + 金额，如 ' + PLAY_ITEMS[0] + ' 100');
      return;
    }
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: text
    });
    recordBet(user.name, text);
    lastBetText = text;
    $('#chatInput').val('');
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
    const $room = $('.zjh-room');
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
    const $room = $('.zjh-room');
    if (open) {
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

  function hydrateCardImages(root) {
    const scope = root || document;
    scope.querySelectorAll('.zjh-card[data-src]').forEach(el => {
      const src = el.getAttribute('data-src');
      if (!src) return;
      const img = new Image();
      img.onload = function () {
        el.classList.add('has-img');
        el.style.backgroundImage = `url('${src}')`;
      };
      img.onerror = function () { /* keep text fallback */ };
      img.src = src;
    });
  }

  // ===== 初始化 =====
  lastDraw = randomDraw();
  lastIssueSeq = Math.max(1, Math.floor((Date.now() - todayStartMs()) / 1000 / INTERVAL));
  historyRows = buildHistory(60);
  historyRows[0] = rowFromDraw(fmtIssue8(lastIssueSeq), lastDraw);

  refreshStats();
  renderDrawBar(historyRows[0]);
  renderDrawTable();
  $('#curIssue').text(fmtIssue8(lastIssueSeq + 1));
  updateCountdownUI(INTERVAL - ((Date.now() - todayStartMs()) / 1000 % INTERVAL));
  initKeypad();
  $('#playSheetBody').html(PLAY_ITEMS.map(p => {
    const odds = ODDS[p];
    return `<button type="button" class="zjh-play-item" data-play="${p}">${p}<small>1:${(odds - 1).toFixed(odds >= 10 ? 0 : 1)}</small></button>`;
  }).join(''));

  seedChat();
  renderDealTableStatic(lastDraw, true);
  hydrateCardImages(document.getElementById('dealerTable'));

  function tick() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / INTERVAL) + 1;
    const r = INTERVAL - (elapsed % INTERVAL);
    const issueCur = fmtIssue8(seq);
    $('#curIssue').text(issueCur);
    updateCountdownUI(r);

    if (r > DRAW_SEC && !dealAnimationRunning) {
      $('#dealerStatus').text(isBettingOpen() ? '请下注' : (r <= FREEZE_SEC ? '已封盘' : '等待开奖'));
    }

    if (r <= FREEZE_SEC && !closedIssues.has(issueCur)) {
      closedIssues.add(issueCur);
      pushRobotClose(issueCur);
    }

    if (r <= DRAW_SEC && !drawnIssues.has(issueCur) && !dealAnimationRunning) {
      drawnIssues.add(issueCur);
      const newDraw = randomDraw();
      lastDraw = newDraw;
      lastIssueSeq = seq;
      const row = rowFromDraw(issueCur, newDraw);
      historyRows.unshift(row);
      if (historyRows.length > 120) historyRows.pop();
      startDealSequence(newDraw, issueCur, row);
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

  $('#playSheetBody').on('click', '.zjh-play-item', function () {
    insertInput($(this).data('play') + ' ');
    openPlaySheet(false);
    $('#chatInput').focus();
    showKeypad(true);
  });

  $('#btnRedpack').on('click', () => App.toast('红包 · 开发中'));
  $('#btnSlip').on('click', () => App.go('../../client-app/pages/bet-records/bet-records.html' + q));
  $('#btnLong').on('click', () => App.toast('长龙统计 · 开发中'));
  $('#btnPredict').on('click', () => App.toast('预测 · 开发中'));
  $('#drawToggle').on('click', toggleDrawPanel);

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

  $('#keyGrid').on('click', '.zjh-key', function () {
    insertInput($(this).data('key'));
  });

  $('#keypad').on('click', '[data-cmd]', function () {
    const cmd = $(this).data('cmd');
    if (cmd === 'cancel') {
      $('#chatInput').val('');
      return;
    }
    if (cmd === 'repeat' && lastBetText) {
      $('#chatInput').val(lastBetText);
      return;
    }
    if (cmd === 'allin') {
      const bal = App.getBalance(user.uid);
      $('#chatInput').val(PLAY_ITEMS[0] + ' ' + bal);
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
    if (url) App.go(url + q);
    else App.toast('即将开放');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#keypad, #chatInput, .zjh-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.zjh-plus-menu, #plusBtn, .zjh-menu-mask').length) {
        showKeypad(false);
      }
    }
  });
});
