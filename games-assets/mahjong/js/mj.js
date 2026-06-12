/**
 * 麻将胡了 · PG 风格 5×4 路（参考 jyh 素材）
 */
$(function () {
  window.__mjBoot = bootMahjong;
});

function bootMahjong() {
  if (bootMahjong.started) return;
  bootMahjong.started = true;

  const user = App.getUser();
  const params = new URLSearchParams(location.search);
  const q = params.get('roomNo') ? ('?roomNo=' + encodeURIComponent(params.get('roomNo'))) : '';

  const COLS = 5;
  const ROWS = 4;
  const MULTS = [1, 2, 3, 5];
  const BET_SIZES = [0.01, 0.03, 0.10, 1.00, 5.00];
  const BET_MULTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const BASE_BET = 20;
  const REEL_EXTRA = [12, 15, 18, 21, 24];
  /** 滚轮视窗上下各露出的比例（与中间 4 格同属一条滚带） */
  const PEEK_RATIO = 0.07;
  /** 调牌面布局时全用一万；排好后改回 null */
  const LAYOUT_PREVIEW_TILE = 'wan1';

  const TILES = [
    { id: 'wan1', img: 'wan1.png', weight: 10, pay: 3 },
    { id: 'wan2', img: 'wan2.png', weight: 10, pay: 3 },
    { id: 'wan5', img: 'wan5.png', weight: 10, pay: 3 },
    { id: 'wan8', img: 'wan8.png', weight: 10, pay: 3 },
    { id: 'tong4', img: 'tong4.png', weight: 10, pay: 3 },
    { id: 'tong6', img: 'tong6.png', weight: 10, pay: 3 },
    { id: 'tong8', img: 'tong8.png', weight: 10, pay: 3 },
    { id: 'sou3', img: 'sou3.png', weight: 10, pay: 3 },
    { id: 'sou5', img: 'sou5.png', weight: 10, pay: 3 },
    { id: 'sou7', img: 'sou7.png', weight: 10, pay: 3 },
    { id: 'fa', img: 'fa.png', weight: 8, pay: 5 },
    { id: 'zhong', img: 'zhong.png', weight: 8, pay: 5 },
    { id: 'bai', img: 'bai.png', weight: 8, pay: 4 },
    { id: 'gold', img: 'gold.png', weight: 5, pay: 6 },
    { id: 'wild', img: 'wild.png', weight: 4, pay: 8, wild: true },
    { id: 'hu', img: 'hu.png', weight: 3, pay: 15, scatter: true }
  ];

  let betSizeIdx = 0;
  let betMultIdx = 0;
  let betComboIdx = 0;
  let draftSizeIdx = 0;
  let draftMultIdx = 0;
  let multIdx = 0;
  let spinning = false;
  let turbo = false;
  let autoLeft = 0;
  let grid = [];
  let lastInteract = Date.now();
  let demoTimer = null;
  let spinHistory = [];

  const BET_COMBOS = (function () {
    const list = [];
    BET_SIZES.forEach(function (size, si) {
      BET_MULTS.forEach(function (mult, mi) {
        list.push({ size: size, mult: mult, si: si, mi: mi, total: size * mult * BASE_BET });
      });
    });
    list.sort(function (a, b) { return a.total - b.total; });
    return list;
  })();

  const $room = $('.mj-room');
  const $grid = $('#grid');
  const $result = $('#resultText');
  const $msgViewport = $('#msgViewport');
  const $msgLine = $('#msgTickerLine');
  const $statWin = $('#statWin');
  const $statBalance = $('#statBalance');
  const $statBet = $('#statBet');

  const MULT_LABELS = ['x1', 'x2', 'x3', 'x5'];
  const MSG_TIPS = [
    '获得镀金符号，有机会赢得百搭',
    '在免费旋转中，赢得高达10倍奖金倍数！',
    '3个或更多胡，奖励12次或更多免费旋转',
    '赢得高达1024路！'
  ];
  const MSG_INTERVAL = 3000;
  const RESULT_FLASH_MS = 2600;

  let msgIdx = 0;
  let msgTimer = null;
  let resultTimer = null;
  const MULT_OVERLAY_LAYOUT = [
    { left: 0.090969, top: 0.57906, width: 0.145023 },
    { left: 0.307185, top: 0.581197, width: 0.149637 },
    { left: 0.53263, top: 0.581197, width: 0.148978 },
    { left: 0.758075, top: 0.57906, width: 0.150956 }
  ];

  function comboIndex(si, mi) {
    for (let i = 0; i < BET_COMBOS.length; i++) {
      if (BET_COMBOS[i].si === si && BET_COMBOS[i].mi === mi) return i;
    }
    return 0;
  }

  function applyBetCombo(combo) {
    betSizeIdx = combo.si;
    betMultIdx = combo.mi;
    betComboIdx = comboIndex(combo.si, combo.mi);
  }

  function currentCombo() {
    return BET_COMBOS[betComboIdx] || BET_COMBOS[0];
  }

  function initBetPicker() {
    const $size = $('#betColSize');
    const $mult = $('#betColMult');
    const $base = $('#betColBase');
    const $total = $('#betColTotal');
    if (!$size.length) return;

    BET_SIZES.forEach(function (s, i) {
      $size.append(
        '<button type="button" class="mj-bet-item" data-kind="size" data-idx="' + i + '">' +
        fmtMoney(s) + '</button>'
      );
    });
    BET_MULTS.forEach(function (m, i) {
      $mult.append(
        '<button type="button" class="mj-bet-item" data-kind="mult" data-idx="' + i + '">' +
        m + '</button>'
      );
    });
    $base.append(
      '<button type="button" class="mj-bet-item is-active" disabled>' + BASE_BET + '</button>'
    );
    BET_COMBOS.forEach(function (c, i) {
      $total.append(
        '<button type="button" class="mj-bet-item" data-kind="total" data-si="' + c.si +
        '" data-mi="' + c.mi + '" data-idx="' + i + '">' + fmtMoney(c.total) + '</button>'
      );
    });
  }

  function scrollBetItemIntoView($item) {
    if (!$item.length) return;
    const el = $item[0];
    const list = el.parentElement;
    if (!list) return;
    const top = el.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
    list.scrollTop = Math.max(0, top);
  }

  function renderBetPickerDraft() {
    $('#betColSize .mj-bet-item').removeClass('is-active').eq(draftSizeIdx).addClass('is-active');
    $('#betColMult .mj-bet-item').removeClass('is-active').eq(draftMultIdx).addClass('is-active');
    const ci = comboIndex(draftSizeIdx, draftMultIdx);
    $('#betColTotal .mj-bet-item').removeClass('is-active').eq(ci).addClass('is-active');
    const size = BET_SIZES[draftSizeIdx];
    const mult = BET_MULTS[draftMultIdx];
    const total = size * mult * BASE_BET;
    $('#betHlSize').text(fmtMoney(size));
    $('#betHlMult').text(String(mult));
    $('#betHlTotal').text(fmtMoney(total));
    scrollBetItemIntoView($('#betColSize .mj-bet-item').eq(draftSizeIdx));
    scrollBetItemIntoView($('#betColMult .mj-bet-item').eq(draftMultIdx));
    scrollBetItemIntoView($('#betColTotal .mj-bet-item').eq(ci));
  }

  function openDrawer(id) {
    closeRules();
    openMenu(false);
    closeHistoryPage();
    $('#drawerMask').prop('hidden', false);
    $('.mj-drawer').prop('hidden', true);
    $('#' + id).prop('hidden', false);
  }

  function closeDrawers() {
    $('#drawerMask').prop('hidden', true);
    $('.mj-drawer').prop('hidden', true);
  }

  function isDrawerOpen() {
    return !$('#drawerMask').prop('hidden');
  }

  function openBalanceDrawer() {
    $('#drawerBalance').text(fmtMoney(App.getBalance(user.uid)));
    openDrawer('balanceDrawer');
  }

  function openBetDrawer() {
    draftSizeIdx = betSizeIdx;
    draftMultIdx = betMultIdx;
    renderBetPickerDraft();
    openDrawer('betDrawer');
  }

  function confirmBetDrawer() {
    betSizeIdx = draftSizeIdx;
    betMultIdx = draftMultIdx;
    betComboIdx = comboIndex(betSizeIdx, betMultIdx);
    refreshStats();
    closeDrawers();
  }

  function setMaxBetDraft() {
    draftSizeIdx = BET_SIZES.length - 1;
    draftMultIdx = BET_MULTS.length - 1;
    renderBetPickerDraft();
  }

  function openHistoryPage() {
    closeDrawers();
    closeRules();
    openMenu(false);
    renderHistoryList();
    $('#historyPage').prop('hidden', false);
  }

  function closeHistoryPage() {
    $('#historyPage').prop('hidden', true);
  }

  function isHistoryOpen() {
    return !$('#historyPage').prop('hidden');
  }

  function formatHistoryTime(ts) {
    const d = new Date(ts);
    const p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(d.getMonth() + 1) + '/' + p(d.getDate()) + '/' + d.getFullYear() + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function makeTxId() {
    return String(Date.now()) + String(Math.floor(Math.random() * 900000000) + 100000000);
  }

  function renderHistoryList() {
    const $list = $('#historyList');
    if (!$list.length) return;

    let betSum = 0;
    let winSum = 0;
    spinHistory.forEach(function (h) {
      betSum += h.bet || 0;
      winSum += h.win || 0;
    });

    $('#historyCount').text(spinHistory.length + ' 条记录');
    $('#historyBetSum').text(fmtMoney(betSum));
    $('#historyWinSum').text(fmtMoney(winSum));

    if (!spinHistory.length) {
      $list.html('<p class="mj-history__empty">没有历史记录</p>');
      return;
    }

    let html = '';
    spinHistory.forEach(function (h) {
      html += '<div class="mj-history__row">' +
        '<span class="mj-history__row-time">' + formatHistoryTime(h.time) + '</span>' +
        '<span class="mj-history__row-txid">' + (h.txId || '—') + '</span>' +
        '<span class="mj-history__row-bet">' + fmtMoney(h.bet) + '</span>' +
        '<span class="mj-history__row-win' + (h.win > 0 ? ' is-win' : ' is-lose') + '">' +
        fmtMoney(h.win) +
        '</span></div>';
    });
    $list.html(html);
  }

  function addSpinHistory(entry) {
    if (!entry.txId) entry.txId = makeTxId();
    spinHistory.unshift(entry);
    if (spinHistory.length > 100) spinHistory.length = 100;
  }

  function initMultOverlays() {
    const $wrap = $('#multOverlays');
    if (!$wrap.length) return;
    let html = '';
    MULT_LABELS.forEach(function (label, i) {
      const lay = MULT_OVERLAY_LAYOUT[i];
      html += '<img class="mj-mult-gold' + (i === 0 ? ' is-active' : '') + '" data-idx="' + i + '" ' +
        'src="./assets/mult-active/' + label + '.png?v=1" alt="" draggable="false" ' +
        'style="left:' + (lay.left * 100) + '%;top:' + (lay.top * 100) + '%;width:' + (lay.width * 100) + '%">';
    });
    $wrap.html(html);
  }

  function layoutMsgLine(text) {
    if (!$msgViewport.length || !$msgLine.length) return;
    const vp = $msgViewport[0];
    const line = $msgLine[0];
    $msgLine
      .text(text)
      .removeClass('is-scroll is-center')
      .css({ animation: 'none', transform: '' });
    void line.offsetWidth;
    const vpW = vp.clientWidth;
    const lineW = line.scrollWidth;
    if (lineW <= vpW + 2) {
      $msgLine.addClass('is-center');
      return;
    }
    const overflow = lineW - vpW;
    const scrollDur = Math.min(2.2, Math.max(1.1, overflow / 42));
    $msgLine
      .addClass('is-scroll')
      .css({
        '--mj-scroll-to': (-overflow) + 'px',
        '--mj-scroll-dur': scrollDur + 's',
        '--mj-scroll-delay': '0.35s'
      });
  }

  function showMsgTip(idx) {
    if ($result.text().trim()) return;
    layoutMsgLine(MSG_TIPS[idx]);
  }

  function advanceMsgTip() {
    if ($result.text().trim()) return;
    msgIdx = (msgIdx + 1) % MSG_TIPS.length;
    showMsgTip(msgIdx);
  }

  function startMsgTicker() {
    clearInterval(msgTimer);
    showMsgTip(msgIdx);
    msgTimer = setInterval(advanceMsgTip, MSG_INTERVAL);
  }

  function clearSpinResult() {
    clearTimeout(resultTimer);
    $result.removeClass('is-win is-lose').text('');
    $msgViewport.removeClass('is-hidden');
    showMsgTip(msgIdx);
  }

  function flashSpinResult(text, cls) {
    clearTimeout(resultTimer);
    $result.removeClass('is-win is-lose').addClass(cls).text(text);
    $msgViewport.addClass('is-hidden');
    resultTimer = setTimeout(clearSpinResult, RESULT_FLASH_MS);
  }

  function layoutTile() {
    if (!LAYOUT_PREVIEW_TILE) return null;
    return TILES.find(function (x) { return x.id === LAYOUT_PREVIEW_TILE; }) || TILES[0];
  }

  function pickTile() {
    const fixed = layoutTile();
    if (fixed) return fixed;
    const total = TILES.reduce(function (s, t) { return s + t.weight; }, 0);
    let r = Math.random() * total;
    for (let i = 0; i < TILES.length; i++) {
      r -= TILES[i].weight;
      if (r <= 0) return TILES[i];
    }
    return TILES[0];
  }

  function tileSrc(tile) {
    if ((window.devicePixelRatio || 1) >= 1.5) {
      return './assets/tiles/hd/' + tile.id + '@3x.png?v=1';
    }
    return './assets/tiles/' + tile.img + '?v=1';
  }

  function randomGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        let t = pickTile();
        if (!LAYOUT_PREVIEW_TILE && c >= 1 && c <= 3 && Math.random() < 0.12) {
          t = TILES.find(function (x) { return x.id === 'gold'; }) || t;
        }
        row.push(t);
      }
      g.push(row);
    }
    return g;
  }

  function cellHtml(tile, r, c, win) {
    return '<div class="mj-cell' + (win ? ' is-win' : '') + '" data-r="' + r + '" data-c="' + c + '">' +
      '<img src="' + tileSrc(tile) + '" alt="' + tile.id + '" draggable="false">' +
      '</div>';
  }

  function reelMetrics(reelEl) {
    const reelH = reelEl.getBoundingClientRect().height || reelEl.clientHeight;
    if (reelH <= 0) return null;
    const peek = reelH * PEEK_RATIO;
    const cellH = (reelH - peek * 2) / ROWS;
    const restY = cellH - peek;
    return { peek: peek, cellH: cellH, restY: restY };
  }

  function layoutReel(reelEl) {
    const m = reelMetrics(reelEl);
    if (!m || m.cellH <= 0) return null;
    reelEl.style.setProperty('--mj-cell-h', m.cellH + 'px');
    reelEl.style.setProperty('--mj-peek', m.peek + 'px');
    const strip = reelEl.querySelector('.mj-reel-strip');
    if (strip && !reelEl.classList.contains('is-spinning')) {
      strip.style.transition = 'none';
      strip.style.transform = 'translate3d(0,' + m.restY + 'px,0)';
    }
    return m;
  }

  function layoutAllReels() {
    $grid.find('.mj-reel').each(function () {
      layoutReel(this);
    });
  }

  function scheduleLayoutReels() {
    requestAnimationFrame(function () {
      requestAnimationFrame(layoutAllReels);
    });
  }

  /** 一条连续滚带：上缓冲格 + 4 主格 + 下缓冲格 */
  function reelStripHtml(g, c, winCells) {
    winCells = winCells || [];
    let html = '';
    html += cellHtml(pickTile(), -1, c, false);
    for (let r = 0; r < ROWS; r++) {
      const t = g[r][c];
      const win = winCells.some(function (w) { return w.r === r && w.c === c; });
      html += cellHtml(t, r, c, win);
    }
    html += cellHtml(pickTile(), -2, c, false);
    return html;
  }

  function renderGrid(g, winCells) {
    winCells = winCells || [];
    let html = '';
    for (let c = 0; c < COLS; c++) {
      html += '<div class="mj-reel" data-col="' + c + '"><div class="mj-reel-strip">';
      html += reelStripHtml(g, c, winCells);
      html += '</div></div>';
    }
    $grid.html(html);
    scheduleLayoutReels();
    $grid.find('.mj-cell img').each(function () {
      if (this.complete) return;
      this.addEventListener('load', scheduleLayoutReels, { once: true });
    });
  }

  function reelTimings() {
    /** 第 1 列停 → 第 5 列停，总间隔 1s */
    const stopSpan = turbo ? 500 : 1000;
    const stagger = stopSpan / (COLS - 1);
    const base = turbo ? 380 : 620;
    return { base: base, stagger: stagger };
  }

  function spinReels(targetGrid, onComplete) {
    layoutAllReels();
    const timing = reelTimings();
    const $reels = $grid.find('.mj-reel');
    let stopped = 0;
    const block = ROWS + 2;

    $reels.each(function (col) {
      const reel = this;
      const $reel = $(reel);
      const $strip = $reel.find('.mj-reel-strip');
      const metrics = layoutReel(reel) || reelMetrics(reel);
      if (!metrics) {
        stopped++;
        if (stopped >= COLS) onComplete();
        return;
      }
      const cellH = metrics.cellH;
      const restY = metrics.restY;
      const extra = REEL_EXTRA[col];
      let html = '';
      const $currentCells = $strip.find('.mj-cell');

      if ($currentCells.length >= block) {
        $currentCells.each(function () {
          html += this.outerHTML;
        });
      } else if ($currentCells.length === ROWS) {
        html += cellHtml(pickTile(), -1, col, false);
        $currentCells.each(function () {
          html += this.outerHTML;
        });
        html += cellHtml(pickTile(), -2, col, false);
      } else {
        html += reelStripHtml(targetGrid, col, null);
      }
      for (let i = 0; i < extra; i++) {
        html += cellHtml(pickTile(), -1, col, false);
      }
      html += reelStripHtml(targetGrid, col, null);

      $strip.html(html);
      $strip.css({ transition: 'none', transform: 'translate3d(0,' + restY + 'px,0)' });
      $reel.addClass('is-spinning').removeClass('is-stopping');

      const finalStart = block + extra;
      const endY = -(finalStart * cellH - restY);
      const duration = timing.base + col * timing.stagger;

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          $strip.css({
            transition: 'transform ' + duration + 'ms cubic-bezier(0.14, 0.72, 0.18, 1)',
            transform: 'translate3d(0,' + endY + 'px,0)'
          });
        });
      });

      $strip.one('transitionend', function (e) {
        if (e.originalEvent && e.originalEvent.propertyName !== 'transform') return;
        $reel.removeClass('is-spinning').addClass('is-stopping');
        $strip.html(reelStripHtml(targetGrid, col, null));
        layoutReel(reel);
        $strip.css('transition', '');
        stopped++;
        if (stopped >= COLS) onComplete();
      });
    });
  }

  function updateMultBar() {
    $('#multOverlays .mj-mult-gold').removeClass('is-active')
      .eq(multIdx).addClass('is-active');
  }

  function betAmount() {
    return BET_SIZES[betSizeIdx] * BET_MULTS[betMultIdx] * BASE_BET;
  }

  function fmtMoney(n) {
    return '¥' + Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function refreshStats() {
    if ($statBalance.length) {
      $statBalance.text(fmtMoney(App.getBalance(user.uid)));
    }
    if ($statBet.length) {
      $statBet.text(fmtMoney(betAmount()));
    }
  }

  function matchId(a, b) {
    if (!a || !b) return false;
    if (a.wild || b.wild) return true;
    if (a.scatter || b.scatter) return a.id === b.id;
    return a.id === b.id;
  }

  /** 简化 1024 路：每行从左连续 3+ 同符号（百搭通配） */
  function evaluateGrid(g) {
    let bestPay = 0;
    let bestId = null;
    let winCells = [];
    let bestLen = 0;

    for (let r = 0; r < ROWS; r++) {
      let runTile = g[r][0];
      let runLen = 1;
      for (let c = 1; c <= COLS; c++) {
        if (c < COLS && matchId(runTile, g[r][c]) && !runTile.scatter) {
          runLen++;
        } else {
          if (runLen >= 3 && runTile && !runTile.scatter) {
            const pay = runTile.pay * runLen;
            if (pay > bestPay) {
              bestPay = pay;
              bestId = runTile.id;
              bestLen = runLen;
              winCells = [];
              for (let k = 0; k < runLen; k++) winCells.push({ r: r, c: k });
            }
          }
          if (c < COLS) {
            runTile = g[r][c];
            runLen = 1;
          }
        }
      }
    }

    const huCount = g.flat().filter(function (t) { return t.scatter; }).length;
    if (huCount >= 3) {
      return { win: true, pay: 20 + huCount * 5, cells: winCells, hu: true, len: huCount };
    }

    if (bestPay > 0) {
      return { win: true, pay: bestPay, cells: winCells, id: bestId, len: bestLen };
    }
    return { win: false, pay: 0, cells: [] };
  }

  function playSpinBtnOnce() {
    const face = document.querySelector('#btnSpin .mj-spin-face');
    if (!face) return;
    face.classList.remove('is-rotating');
    void face.offsetWidth;
    face.classList.add('is-rotating');
    face.addEventListener('animationend', function onEnd() {
      face.classList.remove('is-rotating');
      face.removeEventListener('animationend', onEnd);
    });
  }

  function spin(isDemo) {
    if (spinning) return;
    const amount = isDemo ? 0 : betAmount();
    if (!isDemo && App.getBalance(user.uid) < amount) {
      App.toast('积分不足');
      autoLeft = 0;
      $('#btnAuto').removeClass('is-on');
      return;
    }

    playSpinBtnOnce();
    spinning = true;
    lastInteract = Date.now();
    clearTimeout(demoTimer);
    $room.addClass('is-spinning');
    $('#btnSpin').prop('disabled', true);
    clearSpinResult();
    if ($statWin.length) {
      $statWin.text(fmtMoney(0));
    }

    if (!isDemo) {
      App.setBalance(user.uid, App.getBalance(user.uid) - amount);
      refreshStats();
    }

    grid = randomGrid();

    spinReels(grid, function () {
      const ev = evaluateGrid(grid);
      const mult = MULTS[multIdx];
      let winAmount = 0;
      let historyDesc = '未中奖';

      if (ev.win) {
        winAmount = Math.round((isDemo ? betAmount() : amount) * ev.pay * mult / 10);
        if (!isDemo) {
          App.setBalance(user.uid, App.getBalance(user.uid) + winAmount);
        }
        multIdx = Math.min(multIdx + 1, MULTS.length - 1);
        renderGrid(grid, ev.cells);
        const label = ev.hu ? ('胡了 x' + ev.len) : (ev.len + '连奖');
        historyDesc = label + ' · x' + mult;
        flashSpinResult(label + ' · x' + mult + ' · 赢 ' + winAmount, 'is-win');
        if (!isDemo) App.toast('+' + winAmount);
      } else {
        multIdx = 0;
        flashSpinResult('未中奖，再转一把', 'is-lose');
      }

      if (!isDemo) {
        addSpinHistory({
          time: Date.now(),
          bet: amount,
          win: winAmount,
          desc: historyDesc
        });
      }

      updateMultBar();
      refreshStats();
      if ($statWin.length) {
        $statWin.text(fmtMoney(winAmount));
      }

      spinning = false;
      $room.removeClass('is-spinning');
      $('#btnSpin').prop('disabled', false);

      if (autoLeft > 0 && !isDemo) {
        autoLeft--;
        if (autoLeft <= 0) $('#btnAuto').removeClass('is-on');
        setTimeout(function () { spin(false); }, turbo ? 500 : 900);
      } else {
        scheduleDemo();
      }
    });
  }

  function scheduleDemo() {
    clearTimeout(demoTimer);
    demoTimer = setTimeout(function () {
      if (spinning || autoLeft > 0) return;
      if (Date.now() - lastInteract < 12000) {
        scheduleDemo();
        return;
      }
      grid = randomGrid();
      renderGrid(grid);
    }, 8000);
  }

  function setOverlayVisible($els, open) {
    $els.each(function () {
      const el = this;
      if (open) {
        el.removeAttribute('hidden');
      } else {
        el.setAttribute('hidden', 'hidden');
      }
    });
  }

  function isRulesOpen() {
    return !document.getElementById('rulesSheet').hasAttribute('hidden');
  }

  function isMenuOpen() {
    return $('#controlsBar').hasClass('is-menu-open');
  }

  function openMenu(open) {
    $('#controlsBar').toggleClass('is-menu-open', !!open);
  }

  function openRules(open) {
    setOverlayVisible($('#sheetMask, #rulesSheet'), !!open);
    $('body').toggleClass('mj-rules-open', !!open);
    if (open) {
      setTimeout(function () {
        const body = document.getElementById('rulesBody');
        if (body) body.scrollTop = 0;
      }, 50);
    }
  }

  function closeRules() {
    openRules(false);
  }

  var $backBtn = $('#backBtn');
  if ($backBtn.length) {
    $backBtn.on('click', function () {
      if (isHistoryOpen()) {
        closeHistoryPage();
        return;
      }
      if (isDrawerOpen()) {
        closeDrawers();
        return;
      }
      if (isRulesOpen()) {
        closeRules();
        return;
      }
      if (isMenuOpen()) {
        openMenu(false);
        return;
      }
      App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
    });
  }

  $('#btnSpin').on('click', function () {
    lastInteract = Date.now();
    spin(false);
  });

  $('#btnMinus').on('click', function () {
    betComboIdx = Math.max(0, betComboIdx - 1);
    applyBetCombo(BET_COMBOS[betComboIdx]);
    lastInteract = Date.now();
    refreshStats();
  });

  $('#btnPlus').on('click', function () {
    betComboIdx = Math.min(BET_COMBOS.length - 1, betComboIdx + 1);
    applyBetCombo(BET_COMBOS[betComboIdx]);
    lastInteract = Date.now();
    refreshStats();
  });

  $('#statPodBalance').on('click', function (e) {
    e.stopPropagation();
    lastInteract = Date.now();
    openBalanceDrawer();
  });

  $('#statPodBet').on('click', function (e) {
    e.stopPropagation();
    lastInteract = Date.now();
    openBetDrawer();
  });

  $('#statPodWin').on('click', function (e) {
    e.stopPropagation();
    lastInteract = Date.now();
    openHistoryPage();
  });

  $('#betColSize, #betColMult, #betColTotal').on('click', '.mj-bet-item', function () {
    const kind = $(this).data('kind');
    if (kind === 'size') {
      draftSizeIdx = Number($(this).data('idx'));
    } else if (kind === 'mult') {
      draftMultIdx = Number($(this).data('idx'));
    } else if (kind === 'total') {
      draftSizeIdx = Number($(this).data('si'));
      draftMultIdx = Number($(this).data('mi'));
    }
    renderBetPickerDraft();
  });

  $('#betMaxBtn').on('click', function () {
    setMaxBetDraft();
  });

  $('#betConfirmBtn').on('click', function () {
    confirmBetDrawer();
  });

  $('#drawerMask').on('click', function () {
    closeDrawers();
  });

  $('[data-close-drawer]').on('click', function () {
    closeDrawers();
  });

  $('.mj-drawer').on('click', function (e) {
    e.stopPropagation();
  });

  $('#historyBack').on('click', function () {
    closeHistoryPage();
  });

  $('#btnTurbo').on('click', function () {
    turbo = !turbo;
    $(this).toggleClass('is-on', turbo);
    lastInteract = Date.now();
  });

  $('#btnAuto').on('click', function () {
    if (autoLeft > 0) {
      autoLeft = 0;
      $(this).removeClass('is-on');
      return;
    }
    autoLeft = 20;
    $(this).addClass('is-on');
    lastInteract = Date.now();
    if (!spinning) spin(false);
  });

  $('#btnMenu').on('click', function () {
    lastInteract = Date.now();
    openMenu(true);
  });

  $('#menuPanel').on('click', 'button', function () {
    const act = $(this).data('act');
    if (act === 'close') {
      openMenu(false);
      return;
    }
    openMenu(false);
    if (act === 'exit') {
      App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
    } else if (act === 'rules') {
      openRules(true);
    } else if (act === 'pay') {
      App.toast('赔付表 · 开发中');
    } else if (act === 'sound') {
      App.toast('声音开关 · 开发中');
    } else if (act === 'history') {
      openHistoryPage();
    }
  });

  $('body').on('click', '#sheetClose, #sheetOk, #sheetMask', function (e) {
    e.preventDefault();
    e.stopPropagation();
    closeRules();
  });

  $('#rulesSheet').on('click', function (e) {
    e.stopPropagation();
  });

  $(document).on('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (isHistoryOpen()) closeHistoryPage();
    else if (isDrawerOpen()) closeDrawers();
    else if (isRulesOpen()) closeRules();
    else if (isMenuOpen()) openMenu(false);
  });

  $(document).on('click touchstart', function () { lastInteract = Date.now(); });

  initMultOverlays();
  initBetPicker();
  betComboIdx = comboIndex(betSizeIdx, betMultIdx);
  startMsgTicker();
  $(window).on('resize orientationchange', function () {
    scheduleLayoutReels();
    if (!$result.text().trim()) showMsgTip(msgIdx);
  });
  if (window.ResizeObserver && $grid[0]) {
    new ResizeObserver(scheduleLayoutReels).observe($grid[0]);
  }
  grid = randomGrid();
  renderGrid(grid);
  refreshStats();
  updateMultBar();
  scheduleDemo();
}
