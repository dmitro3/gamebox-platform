/**
 * 经典水果机 · 24格跑马灯（固定符号 + 顺时针跑灯）
 */
$(function () {
  window.__sltBoot = bootSlots;
});

function bootSlots() {
  if (bootSlots.started) return;
  bootSlots.started = true;

  const PFX = 'slt';
  const V = '?v=3';
  const user = App.getUser();
  const params = new URLSearchParams(location.search);
  const q = params.get('roomNo') ? ('?roomNo=' + encodeURIComponent(params.get('roomNo'))) : '';

  const UNIT_STEPS = [10, 20, 50, 100, 200, 500];
  const SYMBOLS = [
    { id: 'apple', label: '苹果', mult: 2 },
    { id: 'orange', label: '橘子', mult: 3 },
    { id: 'lemon', label: '柠檬', mult: 5 },
    { id: 'watermelon', label: '西瓜', mult: 10 },
    { id: 'cherry', label: '樱桃', mult: 15 },
    { id: 'bell', label: '铃铛', mult: 20 },
    { id: 'bar', label: 'BAR', mult: 50 },
    { id: 'seven', label: '77', mult: 100 }
  ];

  const RING = [
    'apple', 'orange', 'lemon', 'watermelon', 'cherry', 'bell', 'bar', 'seven',
    'apple', 'orange', 'lemon', 'watermelon',
    'cherry', 'bell', 'bar', 'seven', 'apple', 'orange', 'lemon', 'watermelon',
    'cherry', 'bell', 'bar', 'seven'
  ];

  const SLOT_POS = [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
    [7, 1], [7, 2], [7, 3], [7, 4],
    [7, 5], [6, 5], [5, 5], [4, 5], [3, 5], [2, 5], [1, 5], [0, 5],
    [0, 4], [0, 3], [0, 2], [0, 1]
  ];

  let unitIdx = 0;
  let bets = {};
  let spinning = false;
  let lightIndex = 0;
  let history = loadHistory();

  const $room = $('.' + PFX + '-room');
  const $ring = $('#ring');
  const $light = $('#lightDot');
  const $result = $('#resultText');

  function symSrc(id) {
    return './assets/symbols/' + id + '.png' + V;
  }

  function symById(id) {
    return SYMBOLS.find(function (s) { return s.id === id; });
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('slt_history_' + user.uid) || '[]');
    } catch (e) { return []; }
  }

  function saveHistory() {
    localStorage.setItem('slt_history_' + user.uid, JSON.stringify(history.slice(0, 80)));
  }

  function unitBet() { return UNIT_STEPS[unitIdx]; }

  function totalBet() {
    let n = 0;
    SYMBOLS.forEach(function (s) { n += (bets[s.id] || 0); });
    return n * unitBet();
  }

  function refreshStats() {
    $('#statBalance').text(App.getBalance(user.uid).toLocaleString('en-US'));
    $('#statBet').text(totalBet().toLocaleString('en-US'));
    $('#unitBetLabel').text(unitBet());
  }

  function updateCenter(title, sub) {
    $('#centerTitle').text(title || '请押注');
    $('#centerSub').text(sub || '点击下方水果键');
  }

  function buildRing() {
    let html = '';
    RING.forEach(function (symId, idx) {
      const col = SLOT_POS[idx][0];
      const row = SLOT_POS[idx][1];
      const sym = symById(symId);
      html +=
        '<div class="' + PFX + '-slot" data-idx="' + idx + '" data-sym="' + symId + '" ' +
          'style="grid-column:' + (col + 1) + ';grid-row:' + (row + 1) + '">' +
          '<span class="' + PFX + '-slot__cell" aria-hidden="true"></span>' +
          '<img class="' + PFX + '-slot__sym" src="' + symSrc(symId) + '" alt="' + sym.label + '" draggable="false">' +
          '<span class="' + PFX + '-slot__cell-lit" aria-hidden="true"></span>' +
        '</div>';
    });
    $ring.html(html);
    placeLight(lightIndex);
  }

  function buildBetKeys() {
    let html = '';
    SYMBOLS.forEach(function (s) {
      html +=
        '<button type="button" class="' + PFX + '-bet-key" data-id="' + s.id + '">' +
          '<span class="' + PFX + '-bet-key__bg" aria-hidden="true"></span>' +
          '<img class="' + PFX + '-bet-key__sym" src="' + symSrc(s.id) + '" alt="" draggable="false">' +
          '<span class="' + PFX + '-bet-key__label">' + s.label + '</span>' +
          '<span class="' + PFX + '-bet-key__count" data-count>0</span>' +
        '</button>';
    });
    $('#betKeys').html(html);
  }

  function refreshBetKeys() {
    SYMBOLS.forEach(function (s) {
      const n = bets[s.id] || 0;
      const $btn = $('.' + PFX + '-bet-key[data-id="' + s.id + '"]');
      $btn.toggleClass('is-on', n > 0);
      $btn.find('[data-count]').text(n > 0 ? '×' + n : '');
    });
    refreshStats();
  }

  function clearBets() {
    bets = {};
    refreshBetKeys();
    updateCenter('已清除', '请重新押注');
  }

  function allBet() {
    SYMBOLS.forEach(function (s) { bets[s.id] = 1; });
    refreshBetKeys();
    updateCenter('全押', '每个符号 ×1 注');
  }

  function toggleBet(id) {
    if (spinning) return;
    bets[id] = (bets[id] || 0) + 1;
    if (bets[id] > 99) bets[id] = 99;
    refreshBetKeys();
    const sym = symById(id);
    updateCenter('押注 ' + sym.label, '×' + bets[id] + ' 注 · 单注 ' + unitBet());
  }

  function placeLight(idx) {
    const $slot = $('.' + PFX + '-slot[data-idx="' + idx + '"]');
    if (!$slot.length) return;
    const off = $slot.position();
    const sw = $slot.outerWidth();
    const sh = $slot.outerHeight();
    $light.prop('hidden', false).css({
      left: off.left + sw / 2 - 14,
      top: off.top + sh / 2 - 14
    });
    $('.' + PFX + '-slot').removeClass('is-lit');
    $slot.addClass('is-lit');
  }

  function pickTarget() {
    const weights = RING.map(function (id) {
      const s = symById(id);
      return s ? (110 - s.mult) : 10;
    });
    const total = weights.reduce(function (a, b) { return a + b; }, 0);
    let r = Math.random() * total;
    for (let i = 0; i < RING.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  function evaluateWin(targetIdx) {
    const symId = RING[targetIdx];
    const count = bets[symId] || 0;
    if (!count) return { win: false, amount: 0, symId: symId };
    const sym = symById(symId);
    const amount = unitBet() * sym.mult * count;
    return { win: true, amount: amount, symId: symId, sym: sym, count: count };
  }

  function highlightWin(targetIdx) {
    $('.' + PFX + '-slot').removeClass('is-win');
    $('.' + PFX + '-slot[data-idx="' + targetIdx + '"]').addClass('is-win');
  }

  function runLight(targetIdx, done) {
    const laps = 2 + Math.floor(Math.random() * 2);
    const totalSteps = laps * RING.length + ((targetIdx - lightIndex + RING.length) % RING.length);
    let step = 0;
    let delay = 60;

    function tick() {
      lightIndex = (lightIndex + 1) % RING.length;
      placeLight(lightIndex);
      step++;

      const progress = step / totalSteps;
      if (progress < 0.55) delay = 60;
      else if (progress < 0.8) delay = 110;
      else delay = Math.min(delay + 45, 520);

      if (step < totalSteps) {
        setTimeout(tick, delay);
      } else {
        lightIndex = targetIdx;
        placeLight(lightIndex);
        done();
      }
    }
    tick();
  }

  function spin() {
    if (spinning) return;
    const amount = totalBet();
    if (amount <= 0) {
      App.toast('请先押注');
      return;
    }
    if (App.getBalance(user.uid) < amount) {
      App.toast('积分不足');
      return;
    }

    spinning = true;
    $room.addClass('is-spinning');
    $('#btnStart').prop('disabled', true);
    $result.removeClass('is-win is-lose').text('');
    updateCenter('跑灯中…', '好运来临');

    App.setBalance(user.uid, App.getBalance(user.uid) - amount);
    refreshStats();

    const target = pickTarget();
    const startMs = Date.now();

    runLight(target, function () {
      const winInfo = evaluateWin(target);
      highlightWin(target);
      let winAmount = 0;

      if (winInfo.win) {
        winAmount = winInfo.amount;
        App.setBalance(user.uid, App.getBalance(user.uid) + winAmount);
        $result.addClass('is-win').text(
          winInfo.sym.label + ' ×' + winInfo.count + ' · ×' + winInfo.sym.mult + ' · 赢 ' + winAmount
        );
        updateCenter('中奖！', winInfo.sym.label + ' +' + winAmount);
        App.toast('+' + winAmount);
      } else {
        const sym = symById(winInfo.symId);
        $result.addClass('is-lose').text('停在 ' + sym.label + ' · 未押中');
        updateCenter('未中', '停在 ' + sym.label);
      }

      history.unshift({
        time: Date.now(),
        bet: amount,
        win: winAmount,
        sym: winInfo.symId
      });
      saveHistory();

      $('#statWin').text(winAmount > 0 ? ('+' + winAmount.toLocaleString('en-US')) : '0');
      refreshStats();

      spinning = false;
      $room.removeClass('is-spinning');
      $('#btnStart').prop('disabled', false);

      clearBets();
    });
  }

  function renderRules() {
    const rows = SYMBOLS.map(function (s) {
      return '<tr><td><img src="' + symSrc(s.id) + '" width="28" height="28" alt=""></td>' +
        '<td>' + s.label + '</td><td>×' + s.mult + '</td></tr>';
    }).join('');
    $('#sheetBody').html(
      '<h3>跑马灯水果机</h3>' +
      '<p>24 格固定符号盘，押注后按「开始」，跑灯顺时针转动并停在某格。停在您押注的符号上即中奖。</p>' +
      '<h3>奖金计算</h3>' +
      '<p>赢得 = 单注 × 符号赔率 × 押注次数</p>' +
      '<h3>符号赔率</h3>' +
      '<table class="' + PFX + '-pay-table"><thead><tr><th></th><th>符号</th><th>赔率</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<h3>操作</h3>' +
      '<p>点水果键押注（可叠加）；「全押」每个符号各 1 注；「清除」取消押注；± 调整单注额度。</p>'
    );
  }

  function setOverlay($els, open) {
    $els.each(function () {
      if (open) this.removeAttribute('hidden');
      else this.setAttribute('hidden', 'hidden');
    });
  }

  $('#backBtn').on('click', function () {
    if (!$('#rulesSheet')[0].hasAttribute('hidden')) {
      setOverlay($('#sheetMask, #rulesSheet'), false);
      return;
    }
    App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
  });

  $('#btnStart').on('click', spin);

  $('#btnClear').on('click', function () {
    if (spinning) return;
    clearBets();
  });

  $('#btnAllBet').on('click', function () {
    if (spinning) return;
    allBet();
  });

  $('#betKeys').on('click', '.' + PFX + '-bet-key', function () {
    toggleBet($(this).data('id'));
  });

  $('#btnMinus').on('click', function () {
    if (spinning) return;
    unitIdx = Math.max(0, unitIdx - 1);
    refreshStats();
  });

  $('#btnPlus').on('click', function () {
    if (spinning) return;
    unitIdx = Math.min(UNIT_STEPS.length - 1, unitIdx + 1);
    refreshStats();
  });

  $('#sheetClose, #sheetOk, #sheetMask').on('click', function () {
    setOverlay($('#sheetMask, #rulesSheet'), false);
  });

  $('#rulesSheet').on('click', function (e) { e.stopPropagation(); });

  $(window).on('resize orientationchange', function () {
    window.setTimeout(function () { placeLight(lightIndex); }, 100);
  });

  $(document).on('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!spinning) spin();
    }
    if (e.key === 'Escape') setOverlay($('#sheetMask, #rulesSheet'), false);
  });

  $('.slt-center').on('click', function () {
    setOverlay($('#sheetMask, #rulesSheet'), true);
  });

  buildRing();
  buildBetKeys();
  refreshBetKeys();
  refreshStats();
  renderRules();
  window.setTimeout(function () { placeLight(0); }, 150);
}
