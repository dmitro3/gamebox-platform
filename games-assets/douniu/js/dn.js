/**
 * 游戏类型: douniu-banker
 *
 * 斗牛 · 庄闲比牌 · 两副牌 · 聊天投注房
 */
$(function () {
  const GAME_TYPE = 'douniu-banker';

  const BET_SEC = 40;
  const FREEZE_SEC = 15;
  const DRAW_SEC = 8;
  const INTERVAL = BET_SEC + FREEZE_SEC + DRAW_SEC;
  const DEAL_MS = 420;
  const HISTORY_SHOW = 10;

  const PLAY_ITEMS = ['庄', '闲', '和', '牛一到牛六', '牛七到牛九', '牛牛'];
  const PLAY_ITEMS_SORTED = [...PLAY_ITEMS].sort((a, b) => b.length - a.length);
  const ODDS = {
    '庄': 1.95,
    '闲': 2.0,
    '和': 9.0,
    '牛一到牛六': 2.2,
    '牛七到牛九': 3.5,
    '牛牛': 12.0
  };

  const SUITS = [
    { sym: '♠', key: 'spade', color: 0 },
    { sym: '♥', key: 'heart', color: 1 },
    { sym: '♣', key: 'club', color: 0 },
    { sym: '♦', key: 'diamond', color: 1 }
  ];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SUIT_POWER = { spade: 4, heart: 3, club: 2, diamond: 1 };

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
  let pendingDrawIssue = null;

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
    if (rank === 'A') return 1;
    if (rank === 'K') return 13;
    if (rank === 'Q') return 12;
    if (rank === 'J') return 11;
    return parseInt(rank, 10);
  }

  function niuPoint(rank) {
    if (rank === 'A') return 1;
    if (['J', 'Q', 'K', '10'].includes(rank)) return 10;
    return parseInt(rank, 10);
  }

  function makeCard(suitObj, rank, deck) {
    const val = rankVal(rank);
    return {
      suit: suitObj.sym,
      suitKey: suitObj.key,
      rank,
      val,
      niuVal: niuPoint(rank),
      red: suitObj.color === 1,
      deck,
      text: suitObj.sym + rank
    };
  }

  function buildShoe() {
    const cards = [];
    for (let deck = 0; deck < 2; deck++) {
      SUITS.forEach(s => {
        RANKS.forEach(r => cards.push(makeCard(s, r, deck)));
      });
    }
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function isFlower(cards) {
    return cards.every(c => ['J', 'Q', 'K'].includes(c.rank));
  }

  function isBomb(cards) {
    const counts = {};
    cards.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
    return Object.values(counts).some(n => n === 4);
  }

  function isSmallBull(cards) {
    if (!cards.every(c => niuPoint(c.rank) <= 5)) return false;
    return cards.reduce((s, c) => s + niuPoint(c.rank), 0) <= 10;
  }

  function evalHand(cards) {
    if (isSmallBull(cards)) {
      return { tier: 100, niu: 11, text: '五小牛', special: 'small' };
    }
    if (isBomb(cards)) {
      return { tier: 90, niu: 11, text: '炸弹牛', special: 'bomb' };
    }
    if (isFlower(cards)) {
      return { tier: 80, niu: 11, text: '五花牛', special: 'flower' };
    }
    const vals = cards.map(c => c.niuVal);
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 4; j++) {
        for (let k = j + 1; k < 5; k++) {
          const s = vals[i] + vals[j] + vals[k];
          if (s % 10 === 0) {
            const rest = vals.filter((_, idx) => idx !== i && idx !== j && idx !== k);
            const n = (rest[0] + rest[1]) % 10;
            const niu = n === 0 ? 10 : n;
            return {
              tier: 70 + niu,
              niu,
              text: niu === 10 ? '牛牛' : '牛' + niu,
              special: null
            };
          }
        }
      }
    }
    return { tier: 0, niu: 0, text: '无牛', special: null };
  }

  function maxCard(cards) {
    return cards.slice().sort((a, b) => {
      if (b.val !== a.val) return b.val - a.val;
      return (SUIT_POWER[b.suitKey] || 0) - (SUIT_POWER[a.suitKey] || 0);
    })[0];
  }

  function compareHands(bCards, bEval, pCards, pEval) {
    if (bEval.tier !== pEval.tier) {
      return bEval.tier > pEval.tier ? '庄' : '闲';
    }
    const bc = maxCard(bCards);
    const pc = maxCard(pCards);
    if (bc.val !== pc.val) {
      return bc.val > pc.val ? '庄' : '闲';
    }
    if ((SUIT_POWER[bc.suitKey] || 0) !== (SUIT_POWER[pc.suitKey] || 0)) {
      return (SUIT_POWER[bc.suitKey] || 0) > (SUIT_POWER[pc.suitKey] || 0) ? '庄' : '闲';
    }
    return '和';
  }

  function randomDraw() {
    const shoe = buildShoe();
    const banker = shoe.splice(0, 5);
    const player = shoe.splice(0, 5);
    const bankerEval = evalHand(banker);
    const playerEval = evalHand(player);
    const winner = compareHands(banker, bankerEval, player, playerEval);
    const winnerEval = winner === '庄' ? bankerEval : winner === '闲' ? playerEval : null;
    return {
      banker,
      player,
      bankerEval,
      playerEval,
      winner,
      winnerEval,
      result: winner === '和' ? '和局' : winner + '赢'
    };
  }

  function cardImgPath(c) {
    return `./assets/cards/${c.suitKey}_${c.rank}.png`;
  }

  function cardSpan(c, cls) {
    const deckCls = c.deck === 1 ? ' is-deck2' : '';
    const imgPath = cardImgPath(c);
    return `<span class="dn-card ${c.red ? 'is-red' : ''}${deckCls} ${cls || ''}" data-src="${imgPath}">${c.text}</span>`;
  }

  function createTableCardEl(c) {
    const el = document.createElement('span');
    el.className = `dn-card dn-card--deal ${c.red ? 'is-red' : ''}${c.deck === 1 ? ' is-deck2' : ''}`;
    el.setAttribute('data-src', cardImgPath(c));
    el.textContent = c.text;
    return el;
  }

  function clearDealTable() {
    document.querySelectorAll('.dn-deal-slot').forEach(slot => { slot.innerHTML = ''; });
    $('#bankerNiu, #playerNiu').text('—');
    $('#zoneBanker, #zonePlayer').removeClass('is-win');
    $('#dealerTable').removeClass('is-dealing is-revealed is-shuffle');
  }

  function placeCardInSlot(side, index, card) {
    const slotsId = side === 'banker' ? 'bankerSlots' : 'playerSlots';
    const slot = document.querySelector(`#${slotsId} .dn-deal-slot[data-i="${index}"]`);
    if (!slot) return;
    slot.innerHTML = '';
    slot.appendChild(createTableCardEl(card));
    hydrateCardImages(slot);
  }

  function renderDealTableStatic(draw, highlightWinner) {
    if (!draw) return;
    clearDealTable();
    draw.banker.forEach((c, i) => placeCardInSlot('banker', i, c));
    draw.player.forEach((c, i) => placeCardInSlot('player', i, c));
    $('#bankerNiu').text(draw.bankerEval.text);
    $('#playerNiu').text(draw.playerEval.text);
    $('#dealerTable').addClass('is-revealed');
    if (highlightWinner) {
      if (draw.winner === '庄') $('#zoneBanker').addClass('is-win');
      if (draw.winner === '闲') $('#zonePlayer').addClass('is-win');
    }
    $('#dealerStatus').text(draw.result);
  }

  function flyCard(fromEl, toSlot, card, done) {
    const layer = document.getElementById('flyingLayer');
    const dealer = document.getElementById('dealerTable');
    if (!layer || !dealer || !fromEl || !toSlot) {
      placeCardInSlot(card._side, card._index, card);
      done();
      return;
    }
    const dRect = dealer.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    const tRect = toSlot.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'dn-fly-card';
    const inner = createTableCardEl(card);
    inner.classList.add('dn-card--fly');
    fly.appendChild(inner);
    layer.appendChild(fly);
    hydrateCardImages(fly);

    const cardW = 36;
    const cardH = 50;
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
      placeCardInSlot(card._side, card._index, card);
      fly.remove();
      toSlot.classList.remove('is-catching');
      done();
    }, DEAL_MS);
  }

  function startDealSequence(draw, issue, row) {
    if (dealAnimationRunning) return;
    dealAnimationRunning = true;
    pendingDrawIssue = issue;
    clearDealTable();
    $('#dealerTable').addClass('is-shuffle');
    $('#dealerStatus').text('洗牌中…');

    setTimeout(() => {
      $('#dealerTable').removeClass('is-shuffle').addClass('is-dealing');
      $('#dealerStatus').text('发牌中…');

      const sequence = [];
      for (let i = 0; i < 5; i++) {
        sequence.push({ side: 'banker', index: i, card: draw.banker[i] });
        sequence.push({ side: 'player', index: i, card: draw.player[i] });
      }

      let step = 0;
      function next() {
        if (step >= sequence.length) {
          finishDealSequence(draw, issue, row);
          return;
        }
        const item = sequence[step++];
        const card = Object.assign({}, item.card, { _side: item.side, _index: item.index });
        const deckEl = card.deck === 1
          ? document.getElementById('shoeDeck2')
          : document.getElementById('shoeDeck1');
        const slotsId = item.side === 'banker' ? 'bankerSlots' : 'playerSlots';
        const slot = document.querySelector(`#${slotsId} .dn-deal-slot[data-i="${item.index}"]`);
        flyCard(deckEl, slot, card, next);
      }
      next();
    }, 600);
  }

  function finishDealSequence(draw, issue, row) {
    $('#bankerNiu').text(draw.bankerEval.text);
    $('#playerNiu').text(draw.playerEval.text);
    $('#dealerStatus').text(draw.result);
    $('#dealerTable').removeClass('is-dealing').addClass('is-revealed');
    if (draw.winner === '庄') $('#zoneBanker').addClass('is-win');
    if (draw.winner === '闲') $('#zonePlayer').addClass('is-win');
    renderDrawBar(row);
    renderDrawTable();
    pushRobotResult(draw, issue);
    dealAnimationRunning = false;
    pendingDrawIssue = null;
    setTimeout(() => hydrateCardImages(document.getElementById('chatFeed')), 400);
  }

  function sideCardsHtml(cards, cls) {
    return cards.map(c => cardSpan(c, cls)).join('');
  }

  function rowFromDraw(issue, draw) {
    return {
      issue,
      draw,
      gy: `庄${draw.bankerEval.text} 闲${draw.playerEval.text}`,
      lh: draw.result
    };
  }

  function renderDrawBar(row) {
    if (!row || !row.draw) return;
    const d = row.draw;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(
      `<span class="dn-bar-compare">
        <span class="dn-bar-side is-banker"><em>庄</em>${d.bankerEval.text}</span>
        <span class="dn-bar-vs">VS</span>
        <span class="dn-bar-side is-player"><em>闲</em>${d.playerEval.text}</span>
      </span>`
    );
    $('#barGy').text(d.result);
  }

  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => {
      const d = r.draw;
      if (!d) return '';
      return `<tr>
        <td class="cell-issue">${r.issue}</td>
        <td class="cell-gy">${d.bankerEval.text}</td>
        <td class="cell-gy">${d.playerEval.text}</td>
        <td class="cell-lh ${d.winner === '庄' ? 'is-banker' : d.winner === '闲' ? 'is-player' : 'is-tie'}">${r.lh}</td>
      </tr>`;
    }).join(''));
  }

  function resultCardHtml(draw, issue) {
    const winB = draw.winner === '庄' ? ' is-win' : '';
    const winP = draw.winner === '闲' ? ' is-win' : '';
    const winT = draw.winner === '和' ? ' is-tie' : '';
    return `<div class="dn-result-card">
      <div class="dn-result-card__head">
        <span class="dn-result-card__title">斗牛 · 庄闲比牌</span>
        <span class="dn-result-card__badge${winT}">${draw.result}</span>
      </div>
      <div class="dn-result-card__body">
        <div class="dn-side${winB}">
          <div class="dn-side__label">庄</div>
          <div class="dn-side__cards">${sideCardsHtml(draw.banker, 'sm')}</div>
          <div class="dn-side__niu">${draw.bankerEval.text}</div>
        </div>
        <div class="dn-vs">VS</div>
        <div class="dn-side${winP}">
          <div class="dn-side__label">闲</div>
          <div class="dn-side__cards">${sideCardsHtml(draw.player, 'sm')}</div>
          <div class="dn-side__niu">${draw.playerEval.text}</div>
        </div>
      </div>
      <div class="dn-result-card__foot">
        <div class="dn-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
        <div class="dn-result-stat"><span class="k">庄牌</span><span class="v">${draw.bankerEval.text}</span></div>
        <div class="dn-result-stat"><span class="k">闲牌</span><span class="v">${draw.playerEval.text}</span></div>
      </div>
    </div>`;
  }

  function winnerEvalOf(draw) {
    if (draw.winner === '庄') return draw.bankerEval;
    if (draw.winner === '闲') return draw.playerEval;
    return null;
  }

  function niuInLow(evalObj) {
    return evalObj && evalObj.niu >= 1 && evalObj.niu <= 6;
  }

  function niuInMid(evalObj) {
    return evalObj && evalObj.niu >= 7 && evalObj.niu <= 9;
  }

  function isBull(evalObj) {
    return evalObj && (evalObj.niu === 10 || evalObj.text === '牛牛');
  }

  function settleBet(play, amount, draw) {
    const winner = draw.winner;
    const we = winnerEvalOf(draw);

    if (winner === '和') {
      if (play === '和') {
        const mult = ODDS['和'];
        return { winAmount: Math.round(amount * mult), profit: Math.round(amount * (mult - 1)), hit: play, turnover: amount, refund: false };
      }
      return { winAmount: 0, profit: 0, hit: '退本', turnover: 0, refund: true };
    }

    let win = false;
    if (play === '庄' && winner === '庄') win = true;
    if (play === '闲' && winner === '闲') win = true;
    if (play === '牛一到牛六' && niuInLow(we)) win = true;
    if (play === '牛七到牛九' && niuInMid(we)) win = true;
    if (play === '牛牛' && isBull(we)) win = true;

    if (!win) {
      return { winAmount: 0, profit: -amount, hit: '', turnover: amount, refund: false };
    }
    const mult = ODDS[play];
    return {
      winAmount: Math.round(amount * mult),
      profit: Math.round(amount * (mult - 1)),
      hit: play,
      turnover: amount,
      refund: false
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
      return settled[name].some(r => r.hit && (r.profit > 0 || r.refund));
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
    return '3408' + pad(Math.max(1, seq) % 10000, 4);
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
    const key = 'dn_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('dn_stats_' + uid, JSON.stringify(s));
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
    const avatar = `<div class="dn-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="dn-msg__meta">
      <span class="dn-msg__name">${opts.name}</span>
      <span class="dn-msg__time">${time}</span>
    </div>`;
    const bubble = `<div class="dn-msg__bubble">${opts.html}</div>`;
    const html = opts.self
      ? `<div class="dn-msg is-self">
        <div class="dn-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="dn-msg${opts.robot ? ' is-robot' : ''}">
        ${avatar}
        <div class="dn-msg__body">${meta}${bubble}</div>
      </div>`;
    $('#chatFeed').append(html);
    scrollChat();
  }

  function pushRobotClose(issue) {
    appendMsg({
      name: ROBOT.name,
      avatar: ROBOT.avatar,
      robot: true,
      html: '<div class="dn-msg__bubble--line">======封盘线======<br>=====停止战斗=====</div>'
    });
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="dn-msg__bubble--list"><pre>${buildBetListVerifyText(issue)}</pre></div>`
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
    }, 800);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="dn-msg__bubble--list"><pre>${buildWinListVerifyText(issue, settled)}</pre></div>`
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
    const myBet = '庄 100';
    appendMsg({
      name: user.name,
      avatar: fixAvatar(user.avatar),
      self: true,
      html: myBet
    });
    recordBet(user.name, myBet);
  }

  function initKeypad() {
    const left = ['庄', '闲', '和', '牛'];
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
      const sideCls = lk === '牛' ? ' dn-key--niu' : ' dn-key--side';
      html += `<button type="button" class="dn-key${sideCls}" data-key="${lk}">${lk}</button>`;
      mid[r].forEach(k => {
        html += `<button type="button" class="dn-key" data-key="${k}">${k}</button>`;
      });
      const rk = right[r];
      const cls = rk === '删除' ? ' dn-key--del' : ' dn-key--side';
      html += `<button type="button" class="dn-key${cls}" data-key="${rk}">${rk}</button>`;
    }
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.dn-room');
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
    if (text === '牛') {
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
      App.toast('格式：玩法 + 金额，如 庄 100');
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
    const $room = $('.dn-room');
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
    const $room = $('.dn-room');
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
    scope.querySelectorAll('.dn-card[data-src]').forEach(el => {
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
    const note = p === '庄' ? ' · 抽水5%' : '';
    return `<button type="button" class="dn-play-item" data-play="${p}">${p}<small>1:${odds - 1}${note}</small></button>`;
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

  $('#playSheetBody').on('click', '.dn-play-item', function () {
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

  $('#keyGrid').on('click', '.dn-key', function () {
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
      $('#chatInput').val('庄 ' + bal);
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
    if (!$(e.target).closest('#keypad, #chatInput, .dn-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.dn-plus-menu, #plusBtn, .dn-menu-mask').length) {
        showKeypad(false);
      }
    }
  });
});
