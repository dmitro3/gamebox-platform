/**
 * 777 经典拉霸 · 3轴1线水果机（PS 级素材版）
 */
$(function () {
  window.__lbBoot = bootLaba;
});

function bootLaba() {
  if (bootLaba.started) return;
  bootLaba.started = true;

  const PFX = 'lb';
  const ASSET_V = '?v=1';
  const user = App.getUser();
  const params = new URLSearchParams(location.search);
  const q = params.get('roomNo') ? ('?roomNo=' + encodeURIComponent(params.get('roomNo'))) : '';

  const REEL_COUNT = 3;
  const STRIP_LEN = 10;
  const BET_STEPS = [10, 20, 50, 100, 200, 500, 1000];
  const AUTO_COUNTS = [20, 50, 100, 200, 500, 1000];

  const SYMBOLS = [
    { id: 'bar3', family: 'bar', weight: 3, label: 'Triple BAR' },
    { id: 'bar2', family: 'bar', weight: 5, label: 'Double BAR' },
    { id: 'bar1', family: 'bar', weight: 8, label: 'BAR' },
    { id: 'seven', family: 'seven', weight: 6, label: '77' },
    { id: 'watermelon', family: 'watermelon', weight: 10, label: '西瓜' },
    { id: 'bell', family: 'bell', weight: 11, label: '铃铛' },
    { id: 'cherry', family: 'cherry', weight: 14, label: '樱桃' },
    { id: 'orange', family: 'fruit', weight: 13, label: '橙子' },
    { id: 'lemon', family: 'fruit', weight: 13, label: '柠檬' }
  ];

  const PAYTABLE = [
    { match: '3× Triple BAR', mult: 500, tile: 'bar3', label: 'BAR×3' },
    { match: '3× 77', mult: 75, tile: 'seven', label: '77' },
    { match: '3× 西瓜', mult: 40, tile: 'watermelon', label: '西瓜' },
    { match: '3× 任意 BAR', mult: 25, tile: 'bar1', label: 'BAR' },
    { match: '2× BAR（左连）', mult: 25, tile: 'bar2', label: 'BAR×2' },
    { match: '3× 铃铛', mult: 15, tile: 'bell', label: '铃铛' },
    { match: '3× 混合水果', mult: 8, tile: 'cherry', label: '水果' },
    { match: '3× 樱桃', mult: 5, tile: 'cherry', label: '樱桃' },
    { match: '1× BAR（首轴）', mult: 3, tile: 'bar1', label: 'BAR×1' }
  ];

  let betIdx = 1;
  let spinning = false;
  let turbo = false;
  let autoLeft = 0;
  let pendingAutoCount = 50;
  let history = loadHistory();
  let settings = loadSettings();

  const $room = $('.' + PFX + '-room');
  const $reels = $('#reels');
  const $result = $('#resultText');

  function tileSrc(id) {
    return './assets/tiles/' + id + '.png' + ASSET_V;
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('lb_history_' + user.uid) || '[]');
    } catch (e) { return []; }
  }

  function saveHistory() {
    localStorage.setItem('lb_history_' + user.uid, JSON.stringify(history.slice(0, 100)));
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem('lb_settings_' + user.uid) || '{}');
    } catch (e) { return {}; }
  }

  function saveSettings() {
    localStorage.setItem('lb_settings_' + user.uid, JSON.stringify(settings));
  }

  function syncTileHeight() {
    const h = $reels.find('.' + PFX + '-reel-window').first().height();
    if (h > 0) {
      document.documentElement.style.setProperty('--lb-tile-h', h + 'px');
    }
  }

  function pickSymbol() {
    const total = SYMBOLS.reduce(function (s, t) { return s + t.weight; }, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SYMBOLS.length; i++) {
      r -= SYMBOLS[i].weight;
      if (r <= 0) return SYMBOLS[i];
    }
    return SYMBOLS[SYMBOLS.length - 1];
  }

  function symById(id) {
    return SYMBOLS.find(function (s) { return s.id === id; });
  }

  function tileHtml(sym, extraCls) {
    const cls = [PFX + '-tile', extraCls || ''].filter(Boolean).join(' ');
    return '<div class="' + cls + '" data-id="' + sym.id + '" data-family="' + sym.family + '">' +
      '<img class="' + PFX + '-tile__img" src="' + tileSrc(sym.id) + '" alt="" draggable="false">' +
      '</div>';
  }

  function buildStrip(finalSym) {
    let html = '';
    for (let i = 0; i < STRIP_LEN; i++) {
      html += tileHtml(i === STRIP_LEN - 1 && finalSym ? finalSym : pickSymbol());
    }
    return html;
  }

  function buildLoopStrip(sym) {
    const s = sym || pickSymbol();
    let html = '';
    for (let g = 0; g < 5; g++) html += tileHtml(s);
    return html;
  }

  function initReels() {
    $reels.empty();
    for (let c = 0; c < REEL_COUNT; c++) {
      $reels.append(
        '<div class="' + PFX + '-reel is-idle" data-col="' + c + '">' +
          '<div class="' + PFX + '-reel-window">' +
            '<div class="' + PFX + '-reel-strip">' + buildLoopStrip() + '</div>' +
          '</div></div>'
      );
    }
    syncTileHeight();
  }

  function payRowHtml(p) {
    return '<li>' +
      '<span class="' + PFX + '-paytable__sym">' +
        '<img class="' + PFX + '-paytable__icon" src="' + tileSrc(p.tile) + '" alt="">' +
        '<span class="' + PFX + '-paytable__label">' + p.label + '</span>' +
      '</span>' +
      '<span class="' + PFX + '-paytable__mult">×' + p.mult + '</span></li>';
  }

  function renderPayPanel() {
    $('#payList').html(PAYTABLE.map(payRowHtml).join(''));
  }

  function betAmount() { return BET_STEPS[betIdx]; }

  function refreshStats() {
    $('#statBalance').text(App.getBalance(user.uid).toLocaleString('en-US'));
    $('#statBet').text(betAmount().toLocaleString('en-US'));
  }

  function getLineSymbols() {
    const line = [];
    $reels.find('.' + PFX + '-reel').each(function () {
      const $tile = $(this).find('.' + PFX + '-tile').last();
      line.push({
        id: $tile.data('id'),
        family: $tile.data('family'),
        $el: $tile
      });
    });
    return line;
  }

  function isBarFamily(family) { return family === 'bar'; }

  function isFruitFamily(family) {
    return family === 'fruit' || family === 'cherry';
  }

  function evaluateWin(line) {
    const ids = line.map(function (x) { return x.id; });
    const families = line.map(function (x) { return x.family; });

    const barCount = families.filter(isBarFamily).length;
    const allBar = barCount === 3;
    const allBar3 = allBar && ids.every(function (id) { return id === 'bar3'; });

    if (allBar3) return { win: true, mult: 500, label: 'Triple BAR', cols: [0, 1, 2] };
    if (allBar) return { win: true, mult: 25, label: '任意 BAR', cols: [0, 1, 2] };
    if (barCount >= 2 && isBarFamily(families[0]) && isBarFamily(families[1])) {
      return { win: true, mult: 25, label: 'BAR 左连×2', cols: [0, 1] };
    }
    if (barCount >= 1 && isBarFamily(families[0])) {
      return { win: true, mult: 3, label: 'BAR 首轴', cols: [0] };
    }

    if (ids[0] === ids[1] && ids[1] === ids[2]) {
      const id = ids[0];
      if (id === 'seven') return { win: true, mult: 75, label: '77', cols: [0, 1, 2] };
      if (id === 'watermelon') return { win: true, mult: 40, label: '西瓜', cols: [0, 1, 2] };
      if (id === 'bell') return { win: true, mult: 15, label: '铃铛', cols: [0, 1, 2] };
      if (id === 'cherry') return { win: true, mult: 5, label: '樱桃', cols: [0, 1, 2] };
    }

    if (families.every(isFruitFamily)) {
      const distinct = {};
      ids.forEach(function (id) { distinct[id] = true; });
      if (Object.keys(distinct).length >= 2) {
        return { win: true, mult: 8, label: '混合水果', cols: [0, 1, 2] };
      }
    }

    return { win: false, mult: 0, label: '', cols: [] };
  }

  function highlightWin(line, winInfo) {
    line.forEach(function (x) { x.$el.removeClass('is-win'); });
    if (!winInfo.win) return;
    winInfo.cols.forEach(function (i) {
      if (line[i]) line[i].$el.addClass('is-win');
    });
  }

  function randomResult() {
    const row = [];
    for (let c = 0; c < REEL_COUNT; c++) row.push(pickSymbol());
    return row;
  }

  function stopReels(result, done) {
    let stopped = 0;
    const colDelay = turbo ? 100 : 200;
    $reels.find('.' + PFX + '-reel').each(function (col) {
      const $reel = $(this);
      setTimeout(function () {
        $reel.removeClass('is-spinning is-idle');
        $reel.find('.' + PFX + '-reel-strip').html(buildStrip(result[col])).css('transform', 'translateY(0)');
        stopped++;
        if (stopped === REEL_COUNT) done();
      }, (turbo ? 150 : 280) + col * colDelay);
    });
  }

  function startIdle(lastResult) {
    $reels.find('.' + PFX + '-reel').each(function (i) {
      const sym = lastResult ? lastResult[i] : null;
      $(this).find('.' + PFX + '-reel-strip').html(buildLoopStrip(sym)).css('transform', '');
      $(this).addClass('is-idle').removeClass('is-spinning');
    });
  }

  function addHistory(roundId, bet, profit) {
    history.unshift({
      time: formatTime(new Date()),
      id: roundId,
      bet: bet,
      profit: profit
    });
    saveHistory();
  }

  function formatTime(d) {
    const p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
      p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function genRoundId() {
    return 'LB' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function spin(isDemo) {
    if (spinning) return;
    const amount = isDemo ? 0 : betAmount();
    if (!isDemo && App.getBalance(user.uid) < amount) {
      App.toast('积分不足');
      autoLeft = 0;
      updateAutoBtn();
      $('#btnAuto').removeClass('is-on');
      return;
    }

    spinning = true;
    syncTileHeight();
    $room.addClass('is-spinning');
    $('#btnSpin').prop('disabled', true);
    $result.removeClass('is-win is-lose').text('');

    if (!isDemo) {
      App.setBalance(user.uid, App.getBalance(user.uid) - amount);
      refreshStats();
    }

    $reels.find('.' + PFX + '-reel').each(function () {
      $(this).removeClass('is-idle').addClass('is-spinning');
      $(this).find('.' + PFX + '-reel-strip').html(buildStrip()).css('transform', '');
    });

    const result = randomResult();
    const spinMs = turbo ? 400 : 700 + Math.random() * 300;
    const roundId = genRoundId();

    setTimeout(function () {
      stopReels(result, function () {
        const line = getLineSymbols();
        const winInfo = evaluateWin(line);
        highlightWin(line, winInfo);
        let winAmount = 0;

        if (winInfo.win) {
          winAmount = Math.round((isDemo ? betAmount() : amount) * winInfo.mult);
          if (!isDemo) {
            App.setBalance(user.uid, App.getBalance(user.uid) + winAmount);
          }
          $result.addClass('is-win').text(winInfo.label + ' ×' + winInfo.mult + ' · 赢 ' + winAmount);
          if (!isDemo) App.toast('+' + winAmount);
        } else {
          $result.addClass('is-lose').text('未中奖，再转一把');
        }

        if (!isDemo) addHistory(roundId, amount, winAmount - amount);

        refreshStats();
        $('#statWin').text(winAmount > 0 ? ('+' + winAmount.toLocaleString('en-US')) : '0');

        spinning = false;
        $room.removeClass('is-spinning');
        $('#btnSpin').prop('disabled', false);
        $reels.find('.' + PFX + '-reel').removeClass('is-idle is-spinning');
        setTimeout(function () { startIdle(result); }, turbo ? 800 : 2000);

        if (autoLeft > 0 && !isDemo) {
          autoLeft--;
          updateAutoBtn();
          if (autoLeft <= 0) $('#btnAuto').removeClass('is-on');
          setTimeout(function () { spin(false); }, turbo ? 400 : 700);
        }
      });
    }, spinMs);
  }

  function updateAutoBtn() {
    const $badge = $('#autoCountBadge');
    if (autoLeft > 0) {
      $('#btnAuto').addClass('is-on');
      $badge.text(autoLeft).prop('hidden', false);
    } else {
      $('#btnAuto').removeClass('is-on');
      $badge.prop('hidden', true);
    }
  }

  function setOverlay($els, open) {
    $els.each(function () {
      if (open) this.removeAttribute('hidden');
      else this.setAttribute('hidden', 'hidden');
    });
  }

  function isMenuOpen() { return $('#controlsBar').hasClass('is-menu-open'); }
  function openMenu(open) { $('#controlsBar').toggleClass('is-menu-open', !!open); }

  function openSheet(tab) {
    renderSheetContent(tab || 'pay');
    $('#sheetTabs .' + PFX + '-sheet__tab').removeClass('is-active');
    $('#sheetTabs .' + PFX + '-sheet__tab[data-tab="' + (tab || 'pay') + '"]').addClass('is-active');
    setOverlay($('#sheetMask, #sideSheet'), true);
  }

  function closeSheet() { setOverlay($('#sheetMask, #sideSheet'), false); }

  function paySheetRow(p) {
    return '<div class="' + PFX + '-pay-sheet-row">' +
      '<span class="' + PFX + '-pay-sheet-row__sym">' +
        '<img src="' + tileSrc(p.tile) + '" alt="">' + p.match +
      '</span>' +
      '<span class="' + PFX + '-pay-sheet-row__val">×' + p.mult + '</span></div>';
  }

  function renderSheetContent(tab) {
    const $c = $('#sheetContent');
    if (tab === 'pay') {
      $c.html('<h3>符号赔付值</h3>' + PAYTABLE.map(paySheetRow).join(''));
    } else if (tab === 'rules') {
      $c.html(
        '<h3>经典拉霸</h3>' +
        '<p>本游戏是一个 3×1 类型的游戏，只有一条中奖线路。从左至右 3 个相同图标即可中奖。</p>' +
        '<h3>BAR 特殊规则</h3>' +
        '<p>当第一个转轴为 BAR 图标，第二及第三个转轴为其他图标时，也认定为连接 BAR 图标中奖（首轴 BAR 计 3 倍）。</p>' +
        '<h3>奖金计算</h3>' +
        '<p>奖励 = 符号赔付值 × 投注总额。</p>' +
        '<h3>自动旋转</h3>' +
        '<p>可选择 20、50、100、200、500、1000 次自动旋转，达到次数后立即停止。</p>' +
        '<h3>返还率</h3>' +
        '<p>当前游戏理论返还率 (RTP) 为 96.4%。</p>' +
        '<h3>附加说明</h3>' +
        '<p>如果游戏出现机械故障，则所有受影响的游戏投注和奖励均作废。</p>'
      );
    } else if (tab === 'history') {
      if (!history.length) {
        $c.html('<p class="' + PFX + '-history-empty">当前没有游戏记录</p>' +
          '<p style="font-size:11px;color:#607090;margin-top:8px">系统最多保存最近 100 条记录（点击牌局 ID 可复制）</p>');
      } else {
        $c.html(
          '<table class="' + PFX + '-history-table"><thead><tr>' +
          '<th>时间</th><th>牌局ID</th><th>投注</th><th>盈利</th></tr></thead><tbody>' +
          history.slice(0, 50).map(function (h) {
            const profitCls = h.profit >= 0 ? 'style="color:#ffd040"' : 'style="color:#ff6060"';
            return '<tr><td>' + h.time + '</td><td class="lb-copy-id" data-id="' + h.id + '" style="cursor:pointer;color:#8090ff">' +
              h.id.slice(0, 10) + '…</td><td>' + h.bet + '</td><td ' + profitCls + '>' +
              (h.profit >= 0 ? '+' : '') + h.profit + '</td></tr>';
          }).join('') +
          '</tbody></table>' +
          '<p style="font-size:11px;color:#607090;margin-top:8px">点击牌局 ID 可复制</p>'
        );
      }
    } else if (tab === 'settings') {
      const musicOn = settings.music !== false;
      const sfxOn = settings.sfx !== false;
      const quickOn = settings.quick === true;
      $c.html(
        '<div class="' + PFX + '-setting-row"><span>音乐</span>' +
          '<button type="button" class="' + PFX + '-toggle' + (musicOn ? ' is-on' : '') + '" data-key="music"></button></div>' +
        '<div class="' + PFX + '-setting-row"><span>音效</span>' +
          '<button type="button" class="' + PFX + '-toggle' + (sfxOn ? ' is-on' : '') + '" data-key="sfx"></button></div>' +
        '<div class="' + PFX + '-setting-row"><span>快速旋转</span>' +
          '<button type="button" class="' + PFX + '-toggle' + (quickOn ? ' is-on' : '') + '" data-key="quick"></button></div>' +
        '<p style="font-size:11px;color:#607090;margin-top:16px">Ver: 1.0.0 (CNY)</p>'
      );
    }
  }

  function openBetModal() {
    $('#betList').html(BET_STEPS.map(function (v, i) {
      return '<li class="' + (i === betIdx ? 'is-active' : '') + '" data-idx="' + i + '">' + v + '</li>';
    }).join(''));
    setOverlay($('#betMask, #betModal'), true);
  }

  function closeBetModal() { setOverlay($('#betMask, #betModal'), false); }
  function openAutoModal() {
    $('#autoCounts').html(AUTO_COUNTS.map(function (n) {
      return '<button type="button" class="' + (n === pendingAutoCount ? 'is-active' : '') + '" data-n="' + n + '">' + n + '</button>';
    }).join(''));
    setOverlay($('#autoMask, #autoModal'), true);
  }
  function closeAutoModal() { setOverlay($('#autoMask, #autoModal'), false); }

  $('#backBtn').on('click', function () {
    if (!$('#sideSheet')[0].hasAttribute('hidden')) { closeSheet(); return; }
    if (!$('#betModal')[0].hasAttribute('hidden')) { closeBetModal(); return; }
    if (!$('#autoModal')[0].hasAttribute('hidden')) { closeAutoModal(); return; }
    if (isMenuOpen()) { openMenu(false); return; }
    App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
  });

  $('#btnSpin').on('click', function () {
    if (autoLeft > 0) {
      autoLeft = 0;
      updateAutoBtn();
      return;
    }
    spin(false);
  });

  $('#btnMinus').on('click', function () {
    betIdx = Math.max(0, betIdx - 1);
    refreshStats();
  });

  $('#btnPlus').on('click', function () {
    betIdx = Math.min(BET_STEPS.length - 1, betIdx + 1);
    refreshStats();
  });

  $('#statPodBet').on('click', openBetModal);

  $('#statPodWin').on('click', function () {
    openSheet('history');
  });

  $('#betList').on('click', 'li', function () {
    betIdx = Number($(this).data('idx'));
    $('#betList li').removeClass('is-active');
    $(this).addClass('is-active');
  });

  $('#betMax').on('click', function () {
    betIdx = BET_STEPS.length - 1;
    $('#betList li').removeClass('is-active').last().addClass('is-active');
  });

  $('#betOk').on('click', function () {
    refreshStats();
    closeBetModal();
  });

  $('#betMask').on('click', closeBetModal);

  $('#btnTurbo').on('click', function () {
    turbo = !turbo;
    $(this).toggleClass('is-on', turbo);
  });

  $('#btnAuto').on('click', function () {
    if (autoLeft > 0) {
      autoLeft = 0;
      updateAutoBtn();
      return;
    }
    openAutoModal();
  });

  $('#autoCounts').on('click', 'button', function () {
    pendingAutoCount = Number($(this).data('n'));
    $('#autoCounts button').removeClass('is-active');
    $(this).addClass('is-active');
  });

  $('#autoStart').on('click', function () {
    closeAutoModal();
    autoLeft = pendingAutoCount;
    updateAutoBtn();
    if (!spinning) spin(false);
  });

  $('#autoMask').on('click', closeAutoModal);
  $('#btnMenu').on('click', function () { openMenu(true); });

  $('#menuPanel').on('click', 'button', function () {
    const act = $(this).data('act');
    if (act === 'close') { openMenu(false); return; }
    openMenu(false);
    if (act === 'exit') App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
    else if (act === 'pay') openSheet('pay');
    else if (act === 'rules') openSheet('rules');
    else if (act === 'history') openSheet('history');
    else if (act === 'settings') openSheet('settings');
  });

  $('#sheetTabs').on('click', '.' + PFX + '-sheet__tab', function () {
    const tab = $(this).data('tab');
    $('#sheetTabs .' + PFX + '-sheet__tab').removeClass('is-active');
    $(this).addClass('is-active');
    renderSheetContent(tab);
  });

  $('#sheetContent').on('click', '.lb-copy-id', function () {
    const id = $(this).data('id');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(id).then(function () { App.toast('已复制牌局 ID'); });
    } else {
      App.toast(id);
    }
  });

  $('#sheetContent').on('click', '.' + PFX + '-toggle', function () {
    const key = $(this).data('key');
    settings[key] = !$(this).hasClass('is-on');
    if (key === 'quick') turbo = settings.quick;
    saveSettings();
    renderSheetContent('settings');
    $('#btnTurbo').toggleClass('is-on', turbo);
  });

  $('#sheetClose, #sheetMask').on('click', closeSheet);
  $('#sideSheet').on('click', function (e) { e.stopPropagation(); });

  $(document).on('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!spinning) spin(false);
    }
    if (e.key === 'Escape') {
      closeSheet();
      closeBetModal();
      closeAutoModal();
      if (isMenuOpen()) openMenu(false);
    }
  });

  $(window).on('resize orientationchange', function () {
    window.setTimeout(syncTileHeight, 80);
  });

  if (settings.quick) {
    turbo = true;
    $('#btnTurbo').addClass('is-on');
  }

  initReels();
  renderPayPanel();
  refreshStats();
  window.setTimeout(syncTileHeight, 120);
}
