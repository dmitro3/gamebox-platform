/**
 * 游戏类型: digit5
 *
 * 时时彩 · 聊天投注房
 */
$(function () {
  const GAME_TYPE = 'digit5';

  const BET_SEC = 480;
  const FREEZE_SEC = 90;
  const DRAW_SEC = 30;
  const INTERVAL = BET_SEC + FREEZE_SEC + DRAW_SEC;
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
  let lastDraw = [];
  let lastIssueSeq = 0;
  let lastBetText = '';
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
    const r = getRoundRemain();
    return r > FREEZE_SEC && r <= INTERVAL - DRAW_SEC;
  }
  function parseBet(text) {
    const t = String(text || '').trim();
    const m = t.match(/(\d+)\s*$/);
    if (!m) return null;
    const amount = parseInt(m[1], 10);
    const play = t.slice(0, m.index).trim();
    if (!amount || !play) return null;
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

  const PLAY_ITEMS = ['大','小','单','双','万大','万小','千大','个单','五星大','0','1','2','3','4','5','6','7','8','9'];
  function randomDraw() {
    return Array.from({length:5}, () => Math.floor(Math.random()*10));
  }
  function ballHtml(n, cls) {
    const c = cls ? ' ' + cls : '';
    return `<span class="ssc-ball-img ssc-ball-digit${c}">${n}</span>`;
  }
  function gyMeta(nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    return { text: `${s} ${s>22?'大':'小'} ${s%2?'单':'双'}`, sum: s };
  }
  function lhRow(nums) {
    const big = nums.filter(n=>n>=5).length;
    return big >= 3 ? '偏大' : '偏小';
  }
  function renderDrawBar(row) {
    if (!row) return;
    $('#barIssue').text(row.issue);
    $('#barBalls').html(row.nums.map(n => ballHtml(n, 'xs')).join(''));
    $('#barGy').text('五星和 ' + row.gy);
  }
  function renderDrawTable() {
    $('#drawTableBody').html(historyRows.slice(0, HISTORY_SHOW).map(r => `
      <tr><td class="cell-issue">${r.issue}</td>
      ${r.nums.map(n=>`<td>${ballHtml(n,'tbl')}</td>`).join('')}
      <td class="cell-gy">${r.gy.replace(/\s+/g,'')}</td><td class="cell-lh">${r.lh}</td></tr>`).join(''));
  }
  function resultCardHtml(nums, issue) {
    const meta = gyMeta(nums);
    return `<div class="ssc-result-card"><div class="ssc-result-card__head"><span class="ssc-result-card__title">时时彩</span>
      <div class="ssc-result-card__order">${nums.map(n=>ballHtml(n,'sm')).join('')}</div></div>
      <div class="ssc-result-card__foot"><div class="ssc-result-stat"><span class="k">期号</span><span class="v">No.${String(issue).slice(-6)}</span></div>
      <div class="ssc-result-stat"><span class="k">和值</span><span class="v">${meta.text}</span></div>
      <div class="ssc-result-stat"><span class="k">形态</span><span class="v">${lhRow(nums)}</span></div></div></div>`;
  }
  function settleBet(play, amount, nums) {
    const s = nums.reduce((a,b)=>a+b,0);
    let win = Math.random() > 0.5;
    if (play === '大' || /大/.test(play) && !/小/.test(play)) win = s > 22 || nums[0] >= 5;
    else if (play === '小' || /小/.test(play)) win = s <= 22 || nums[4] <= 4;
    else if (/单/.test(play)) win = s % 2 === 1;
    else if (/双/.test(play)) win = s % 2 === 0;
    if (!win) return { winAmount: 0, profit: -amount, hit: '' };
    const winAmount = Math.round(amount * 1.98);
    return { winAmount, profit: winAmount - amount, hit: play };
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
    saveStats(user.uid, stats);
    refreshStats();
  }

  function todayStartMs() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function fmtIssue8(seq) {
    return '3412' + pad(Math.max(1, seq) % 10000, 4);
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
    const key = 'ssc_stats_' + uid;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(key)); } catch (e) { /* */ }
    return s || { turnover: 0, winloss: 0, rebate: 0 };
  }
  function saveStats(uid, s) {
    localStorage.setItem('ssc_stats_' + uid, JSON.stringify(s));
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
    const avatar = `<div class="ssc-msg__avatar"><img src="${fixAvatar(opts.avatar)}" alt=""></div>`;
    const meta = `<div class="ssc-msg__meta">
            <span class="ssc-msg__name">${opts.name}</span>
            <span class="ssc-msg__time">${time}</span>
          </div>`;
    const bubble = `<div class="ssc-msg__bubble">${opts.html}</div>`;
    const html = isSelf
      ? `<div class="ssc-msg is-self">
        <div class="ssc-msg__top">${meta}${avatar}</div>
        ${bubble}
      </div>`
      : `<div class="ssc-msg${isRobot ? ' is-robot' : ''}">
        ${avatar}
        <div class="ssc-msg__body">
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
      html: '<div class="ssc-msg__bubble--line">======封盘线======<br>=====停止战斗=====</div>'
    });
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="ssc-msg__bubble--list"><pre>${buildBetListVerifyText(issue)}</pre></div>`
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
    }, 800);
    setTimeout(() => {
      appendMsg({
        name: ROBOT.name,
        avatar: ROBOT.avatar,
        robot: true,
        html: `<div class="ssc-msg__bubble--list"><pre>${buildWinListVerifyText(issue, settled)}</pre></div>`
      });
    }, 1500);
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
      html += `<button type="button" class="ssc-key ssc-key--side" data-key="${left[r]}">${left[r]}</button>`;
      mid[r].forEach(k => {
        html += `<button type="button" class="ssc-key" data-key="${k}">${k}</button>`;
      });
      const rk = right[r];
      const cls = rk === '删除' ? ' ssc-key--del' : ' ssc-key--side';
      html += `<button type="button" class="ssc-key${cls}" data-key="${rk}">${rk}</button>`;
    }
    $('#keyGrid').html(html);
  }

  function showKeypad(show) {
    const $room = $('.ssc-room');
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
    const $room = $('.ssc-room');
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
    const $room = $('.ssc-room');
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
  initKeypad();
  $('#playSheetBody').html(PLAY_ITEMS.map(p =>
    `<button type="button" class="ssc-play-item" data-play="${p}">${p}</button>`
  ).join(''));

  seedChat();

  function tick() {
    const elapsed = (Date.now() - todayStartMs()) / 1000;
    const seq = Math.floor(elapsed / INTERVAL) + 1;
    const r = INTERVAL - (elapsed % INTERVAL);
    const issueCur = fmtIssue8(seq);
    $('#curIssue').text(issueCur);
    updateCountdownUI(r);

    if (r <= FREEZE_SEC && !closedIssues.has(issueCur)) {
      closedIssues.add(issueCur);
      pushRobotClose(issueCur);
    }

    if (r <= DRAW_SEC && !drawnIssues.has(issueCur)) {
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

  $('#btnCs').on('click', () => App.go('../../client-app/pages/cs/cs.html' + q));

  $('#btnExpand').on('click', () => openPlaySheet(true));
  $('#playSheetClose, #playMask').on('click', () => openPlaySheet(false));

  $('#playSheetBody').on('click', '.ssc-play-item', function () {
    insertInput($(this).data('play'));
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

  $('#keyGrid').on('click', '.ssc-key', function () {
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
    if (url) App.go(url + q);
    else App.toast('即将开放');
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('#keypad, #chatInput, .ssc-composer').length && $('#keypad').is(':visible')) {
      if (!$(e.target).closest('.ssc-plus-menu, #plusBtn, .ssc-menu-mask').length) {
        showKeypad(false);
      }
    }
  });
});
