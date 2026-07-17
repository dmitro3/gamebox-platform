/* 龙虎斗桌台：倒计时 / 下注 / 筹码 / 路单 / 发牌翻牌 / 结算 */
(function () {
  if (window.__lhdBooted) return;
  window.__lhdBooted = true;

  /* 总周期 60s：下注 + 开奖流程(2 张发牌翻牌报点≈9s) + 派奖 4s */
  var ROUND_SEC = 60;
  var DRAW_EST_SEC = 9;
  var PAYOUT_SECS = 4;
  var TOTAL = ROUND_SEC - DRAW_EST_SEC - PAYOUT_SECS;
  var BANNER_MS = 1500;
  var FLY_MS = 360;
  var GAP_MS = 140;
  var FLIP_MS = 420;
  var FLIP_GAP_MS = 80;
  var DEAL_HOLD_MS = 240;
  var CARD_BACK = './assets/cards/card-back.png?v=9';
  var DECKS = 8;
  var phase = 'bet'; /* bet | draw | payout */
  var left = TOTAL;
  var betDeadline = 0;
  var payoutDeadline = 0;
  var lastBeatSec = -1;
  var roundBusy = false;
  var selectedChip = 1;
  var chipPage = 0;
  var betTotals = { dragon: 0, tiger: 0, tie: 0 };
  var roundPlacements = [];
  var lastRoundPlacements = [];
  var usedUndo = false;
  var usedRebet = false;
  var roadHistory = [];
  var roadStats = { dragon: 0, tiger: 0, tie: 0 };
  var ROAD_ROWS = 6;
  var ROAD_MIN_COLS = 12;
  var ROAD_MAX = 72;
  var ROAD_LABELS = { dragon: '龙', tiger: '虎', tie: '和' };
  var SUITS = ['spade', 'heart', 'club', 'diamond'];
  var RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var CHIP_SRC = {
    1: './assets/ui/chips/chip-1.png?v=4',
    5: './assets/ui/chips/chip-5.png?v=4',
    10: './assets/ui/chips/chip-10.png?v=4',
    50: './assets/ui/chips/chip-50.png?v=4',
    100: './assets/ui/chips/chip-100.png?v=4',
    500: './assets/ui/chips/chip-500.png?v=4',
    1000: './assets/ui/chips/chip-1000.png?v=1',
    2000: './assets/ui/chips/chip-2000.png?v=1',
    3000: './assets/ui/chips/chip-3000.png?v=1',
    4000: './assets/ui/chips/chip-4000.png?v=1',
    5000: './assets/ui/chips/chip-5000.png?v=1',
    10000: './assets/ui/chips/chip-10000.png?v=1'
  };
  var CHIP_PAGES = [
    [1, 5, 10, 50, 100, 500],
    [1000, 2000, 3000, 4000, 5000, 10000]
  ];
  /* 对齐 WG：含本金赔付倍数（龙/虎 1:2，和 1:9）；赢利抽水 5%；开和龙/虎全退 */
  var PAY_MULT = { dragon: 2, tiger: 2, tie: 9 };
  var COMMISSION = 0.05;
  var TIE_REFUND = 1;
  var DEAL_ORDER = ['d1', 't1'];

  var timeEl = document.getElementById('cdTime');
  var timerBox = document.getElementById('timerBox');
  var shoe = document.getElementById('shoeBox');
  var chipBar = document.getElementById('chipBar');
  var actionBar = document.getElementById('actionBar');
  var betArea = document.getElementById('betArea');
  var beadGrid = document.getElementById('beadGrid');
  var bigGrid = document.getElementById('bigGrid');
  var beadScroll = document.getElementById('beadScroll');
  var bigScroll = document.getElementById('bigScroll');
  var dragonHand = document.getElementById('dragonHand');
  var tigerHand = document.getElementById('tigerHand');
  var dragonType = document.getElementById('dragonType');
  var tigerType = document.getElementById('tigerType');
  var flyLayer = document.getElementById('flyLayer');
  var payoutFlyLayer = document.getElementById('payoutFlyLayer');
  var room = document.querySelector('.lhd-room');
  var CHIP_FLY_MS = 420;
  var CHIP_LAND_SCALE = 2 / 3;
  var COLLECT_MS = 420;
  var TO_SCORE_MS = 520;
  var SLOT_COUNT = { dragon: 20, tiger: 20, tie: 20 };
  var slotCache = {};
  var slotStacks = {};
  /* ---------- 本房间其他人：从人数图标飞出下注 ---------- */
  var OTHER_BET_KEYS = ['dragon', 'tiger', 'tie'];
  var OTHER_CHIP_VALUES = [1, 5, 10, 50, 100, 500, 1000, 2000];
  var otherBetTimer = null;

  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function localRect(el) {
    if (!room || !el) return { left: 0, top: 0, width: 0, height: 0 };
    var rr = room.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    var sx = rr.width / room.offsetWidth || 1;
    var sy = rr.height / room.offsetHeight || 1;
    return {
      left: (er.left - rr.left) / sx,
      top: (er.top - rr.top) / sy,
      width: er.width / sx,
      height: er.height / sy
    };
  }

  function layerRect(el) {
    if (!payoutFlyLayer || !el) return { left: 0, top: 0, width: 0, height: 0, cx: 0, cy: 0 };
    var layer = payoutFlyLayer.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    return {
      left: er.left - layer.left,
      top: er.top - layer.top,
      width: er.width,
      height: er.height,
      cx: er.left - layer.left + er.width / 2,
      cy: er.top - layer.top + er.height / 2
    };
  }

  function buildSlots(count) {
    var slots = [];
    var minDist = count >= 20 ? 14 : 18;
    var padX = 8;
    var padY = 10;
    var tries = 0;
    var maxTries = count * 80;
    while (slots.length < count && tries < maxTries) {
      tries++;
      var x = padX + Math.random() * (100 - padX * 2);
      var y = padY + Math.random() * (100 - padY * 2);
      var ok = true;
      for (var i = 0; i < slots.length; i++) {
        var dx = x - slots[i].x;
        var dy = y - slots[i].y;
        if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
      }
      if (ok) slots.push({ x: x, y: y });
    }
    while (slots.length < count) {
      slots.push({
        x: padX + Math.random() * (100 - padX * 2),
        y: padY + Math.random() * (100 - padY * 2)
      });
    }
    return slots;
  }

  function getSlots(key) {
    if (!slotCache[key]) slotCache[key] = buildSlots(SLOT_COUNT[key] || 10);
    return slotCache[key];
  }

  function pickSlot(key) {
    var slots = getSlots(key);
    var idx = Math.floor(Math.random() * slots.length);
    if (!slotStacks[key]) slotStacks[key] = [];
    var stack = slotStacks[key];
    var layer = stack[idx] || 0;
    stack[idx] = layer + 1;
    var base = slots[idx];
    var rx = (Math.random() - 0.5) * 6;
    var ry = (Math.random() - 0.5) * 5;
    return {
      idx: idx,
      layer: layer,
      x: Math.max(5, Math.min(95, base.x + rx + (layer % 3) * 0.9)),
      y: Math.max(6, Math.min(94, base.y + ry - layer * 2.1))
    };
  }

  function barChipSize() {
    if (!chipBar) return 48;
    var srcChip = qs('.lhd-chip.is-selected', chipBar) || qs('.lhd-chip', chipBar);
    if (!srcChip) return 48;
    var r = localRect(srcChip);
    return Math.min(r.width, r.height) || 48;
  }

  function betBtn(key) {
    return qs('.lhd-bet-btn[data-bet="' + key + '"]', betArea);
  }

  function placeChipOnBtn(btn, value, slot, landSize, owner) {
    var box = qs('.lhd-bet-btn__chips', btn);
    if (!box) return;
    var img = document.createElement('img');
    img.src = CHIP_SRC[value] || CHIP_SRC[1];
    img.alt = '';
    img.draggable = false;
    img.setAttribute('data-owner', owner || 'me');
    img.setAttribute('data-value', String(value));
    img.style.setProperty('--chip-x', slot.x + '%');
    img.style.setProperty('--chip-y', slot.y + '%');
    img.style.setProperty('--chip-w', landSize + 'px');
    img.style.setProperty('--chip-z', String(10 + slot.layer));
    box.appendChild(img);
  }

  function flyChipToBet(btn, value, slot, landSize, flyMs, owner) {
    if (!chipBar || !flyLayer || !btn) {
      placeChipOnBtn(btn, value, slot, landSize, owner || 'me');
      return;
    }
    var srcChip = qs('.lhd-chip[data-chip="' + value + '"]', chipBar) ||
      qs('.lhd-chip.is-selected', chipBar);
    if (!srcChip) {
      placeChipOnBtn(btn, value, slot, landSize, owner || 'me');
      return;
    }
    var duration = typeof flyMs === 'number' ? flyMs : CHIP_FLY_MS;
    var who = owner || 'me';
    var from = localRect(srcChip);
    var chipBox = qs('.lhd-bet-btn__chips', btn);
    var area = chipBox ? localRect(chipBox) : localRect(btn);
    var size = Math.min(from.width, from.height) || 40;
    var startX = from.left + from.width / 2 - size / 2;
    var startY = from.top + from.height / 2 - size / 2;
    var endCX = area.left + area.width * (slot.x / 100);
    var endCY = area.top + area.height * (slot.y / 100);
    var endX = endCX - size / 2;
    var endY = endCY - size / 2;
    var fly = document.createElement('div');
    fly.className = 'lhd-fly-chip';
    fly.style.width = size + 'px';
    fly.style.height = size + 'px';
    fly.style.left = startX + 'px';
    fly.style.top = startY + 'px';
    fly.style.transitionDuration = duration + 'ms';
    fly.style.setProperty('--fly-x', (endX - startX) + 'px');
    fly.style.setProperty('--fly-y', (endY - startY) + 'px');
    fly.style.setProperty('--fly-scale', String(landSize / size));
    fly.innerHTML = '<img src="' + (CHIP_SRC[value] || CHIP_SRC[1]) + '" alt="" draggable="false">';
    flyLayer.appendChild(fly);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { fly.classList.add('is-flying'); });
    });
    setTimeout(function () {
      if (fly.parentNode) fly.parentNode.removeChild(fly);
      placeChipOnBtn(btn, value, slot, landSize, who);
    }, duration);
  }

  function flyChipAbs(srcRect, dstRect, srcUrl, duration, endScale) {
    return new Promise(function (resolve) {
      if (!payoutFlyLayer) { resolve(); return; }
      var size = Math.max(12, Math.min(srcRect.width, srcRect.height) || 24);
      var startX = srcRect.cx - size / 2;
      var startY = srcRect.cy - size / 2;
      var endSize = size * (endScale || 1);
      var endX = dstRect.cx - endSize / 2;
      var endY = dstRect.cy - endSize / 2;
      var fly = document.createElement('div');
      fly.className = 'lhd-fly-chip lhd-fly-chip--payout';
      fly.style.width = size + 'px';
      fly.style.height = size + 'px';
      fly.style.left = startX + 'px';
      fly.style.top = startY + 'px';
      fly.style.transitionDuration = duration + 'ms';
      fly.style.setProperty('--fly-x', (endX - startX) + 'px');
      fly.style.setProperty('--fly-y', (endY - startY) + 'px');
      fly.style.setProperty('--fly-scale', String(endScale || 1));
      fly.innerHTML = '<img src="' + srcUrl + '" alt="" draggable="false">';
      payoutFlyLayer.appendChild(fly);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { fly.classList.add('is-flying'); });
      });
      setTimeout(function () {
        if (fly.parentNode) fly.parentNode.removeChild(fly);
        resolve();
      }, duration);
    });
  }

  function stopOtherBetting() {
    if (otherBetTimer) {
      clearTimeout(otherBetTimer);
      otherBetTimer = null;
    }
  }

  function flyChipFromPlayers(btn, value, slot, landSize) {
    var fromEl = qs('.lhd-players__icon') || document.getElementById('playersBox');
    if (!fromEl || !btn || !payoutFlyLayer) {
      placeChipOnBtn(btn, value, slot, landSize, 'other');
      return;
    }
    var src = layerRect(fromEl);
    var chipBox = qs('.lhd-bet-btn__chips', btn) || btn;
    var area = layerRect(chipBox);
    var dst = {
      cx: area.left + area.width * (slot.x / 100),
      cy: area.top + area.height * (slot.y / 100),
      width: landSize,
      height: landSize
    };
    var duration = 380 + Math.floor(Math.random() * 80);
    flyChipAbs(
      src, dst, CHIP_SRC[value] || CHIP_SRC[1], duration,
      landSize / Math.max(18, Math.min(src.width, src.height) || 36)
    ).then(function () {
      placeChipOnBtn(btn, value, slot, landSize, 'other');
    });
  }

  function spawnOtherBet() {
    if (phase !== 'bet' || roundBusy) return;
    var key = OTHER_BET_KEYS[Math.floor(Math.random() * OTHER_BET_KEYS.length)];
    if (Math.random() < 0.58) key = Math.random() < 0.5 ? 'dragon' : 'tiger';
    var btn = betBtn(key);
    if (!btn) return;
    var box = qs('.lhd-bet-btn__chips', btn);
    if (box && box.querySelectorAll('img').length >= 18) return;
    var value = OTHER_CHIP_VALUES[Math.floor(Math.random() * OTHER_CHIP_VALUES.length)];
    var slot = pickSlot(key);
    var landSize = barChipSize() * CHIP_LAND_SCALE;
    flyChipFromPlayers(btn, value, slot, landSize);
    sfx('bet', { vol: 0.35, dedupeMs: 120 });
  }

  function startOtherBetting() {
    stopOtherBetting();
    function schedule() {
      if (phase !== 'bet') return;
      var wait = 500 + Math.random() * 1200;
      otherBetTimer = setTimeout(function () {
        if (phase !== 'bet') return;
        var n = 1 + Math.floor(Math.random() * 3);
        for (var i = 0; i < n; i++) {
          setTimeout(spawnOtherBet, i * 90);
        }
        schedule();
      }, wait);
    }
    schedule();
  }

  /* ---------- 音频 ---------- */
  var AUDIO_BASE = './assets/audio/';
  var AUDIO_V = '2';
  var audioUnlocked = false;
  var bgmAudio = null;
  var voiceAudio = null;
  var sfxLastAt = {};
  var audioPref = { music: true, sfx: true };
  try {
    var apRaw = JSON.parse(localStorage.getItem('lhd_audio') || 'null');
    if (apRaw && typeof apRaw === 'object') {
      audioPref.music = apRaw.music !== false;
      audioPref.sfx = apRaw.sfx !== false;
    }
  } catch (e) { /* ignore */ }

  function saveAudioPref() {
    try { localStorage.setItem('lhd_audio', JSON.stringify(audioPref)); } catch (e) { /* ignore */ }
  }
  function audioUrl(name) { return AUDIO_BASE + name + '.mp3?v=' + AUDIO_V; }
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      var silent = new Audio(audioUrl('bet'));
      silent.volume = 0;
      silent.play().then(function () { silent.pause(); }).catch(function () {});
    } catch (e) { /* ignore */ }
    ensureBgm(true);
  }
  function ensureBgm(playNow) {
    if (!bgmAudio) {
      bgmAudio = new Audio(audioUrl('bgm'));
      bgmAudio.loop = true;
      bgmAudio.volume = 0.32;
      bgmAudio.preload = 'auto';
    }
    if (!audioPref.music) return;
    if (playNow && bgmAudio.paused) {
      var p = bgmAudio.play();
      if (p && p.catch) p.catch(function () {});
    }
  }
  function setMusicOn(on) {
    audioPref.music = !!on;
    saveAudioPref();
    if (audioPref.music) ensureBgm(true);
    else if (bgmAudio) { try { bgmAudio.pause(); } catch (e) {} }
  }
  function setSfxOn(on) {
    audioPref.sfx = !!on;
    saveAudioPref();
    if (!audioPref.sfx && voiceAudio) {
      try { voiceAudio.pause(); } catch (e) {}
      voiceAudio = null;
    }
  }
  function sfx(name, opt) {
    if (!name || !audioPref.sfx) return;
    opt = opt || {};
    var now = Date.now();
    var gap = typeof opt.dedupeMs === 'number' ? opt.dedupeMs : 80;
    if (sfxLastAt[name] && now - sfxLastAt[name] < gap) return;
    sfxLastAt[name] = now;
    try {
      var node = new Audio(audioUrl(name));
      node.volume = typeof opt.vol === 'number' ? opt.vol : 0.85;
      var p = node.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* ignore */ }
  }
  function playVoice(name, vol) {
    return new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        resolve();
      }
      if (!name || !audioPref.sfx) { finish(); return; }
      try {
        if (voiceAudio) {
          voiceAudio.onended = null;
          voiceAudio.onerror = null;
          try { voiceAudio.pause(); } catch (e1) {}
          voiceAudio = null;
        }
        var node = new Audio(audioUrl(name));
        voiceAudio = node;
        node.volume = typeof vol === 'number' ? vol : 1;
        node.onended = finish;
        node.onerror = finish;
        var p = node.play();
        if (p && p.catch) p.catch(finish);
        setTimeout(finish, 2600);
      } catch (e) { finish(); }
    });
  }

  /** 单注返还（含本金）：赢利抽水；开和龙/虎全退 */
  function calcBetReturn(key, stake, result) {
    if (!(stake > 0)) return 0;
    if (key === result) {
      var mult = PAY_MULT[key];
      if (!(mult > 0)) return 0;
      var grossProfit = stake * (mult - 1);
      return stake + Math.floor(grossProfit * (1 - COMMISSION));
    }
    if (result === 'tie' && (key === 'dragon' || key === 'tiger')) {
      return Math.floor(stake * TIE_REFUND);
    }
    return 0;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function pct(n, total) { return total ? Math.round((n / total) * 100) + '%' : '0%'; }
  function isClosed() { return phase !== 'bet' || roundBusy; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  var user = (window.App && App.getUser) ? App.getUser() : { uid: '100000001' };
  var params = new URLSearchParams(location.search);
  var roomNo = (params.get('roomNo') || '').trim();
  var q = roomNo ? '?roomNo=' + encodeURIComponent(roomNo) : '';

  function uid() { return (user && user.uid) ? user.uid : '100000001'; }

  function getStats() {
    try {
      return JSON.parse(localStorage.getItem('lhd_stats_' + uid())) || { turnover: 0, winloss: 0, rebate: 0 };
    } catch (e) {
      return { turnover: 0, winloss: 0, rebate: 0 };
    }
  }
  function saveStats(s) {
    localStorage.setItem('lhd_stats_' + uid(), JSON.stringify(s));
  }
  function refreshBalance() {
    var el = qs('#statBalance');
    if (!el || !window.App || !App.getBalance) return;
    try { el.textContent = Number(App.getBalance(uid())).toLocaleString('en-US'); } catch (e) {}
    var s = getStats();
    var wl = qs('#statWinloss');
    var to = qs('#statTurnover');
    var rb = qs('#statRebate');
    if (wl) {
      wl.textContent = (s.winloss >= 0 ? '+' : '') + Math.round(s.winloss).toLocaleString('en-US');
      wl.classList.toggle('is-plus', s.winloss > 0);
      wl.classList.toggle('is-minus', s.winloss < 0);
    }
    if (to) to.textContent = Math.round(s.turnover).toLocaleString('en-US');
    if (rb) rb.textContent = Math.round(s.rebate || 0).toLocaleString('en-US');
  }

  function debitBalance(amount) {
    if (!(amount > 0) || !window.App || !App.getBalance || !App.setBalance) return false;
    var bal = App.getBalance(uid());
    if (bal < amount) return false;
    App.setBalance(uid(), bal - amount);
    return true;
  }

  function creditBalance(amount) {
    if (!(amount > 0) || !window.App || !App.getBalance || !App.setBalance) return;
    App.setBalance(uid(), App.getBalance(uid()) + amount);
  }

  /* ---------- 下注注单日志（供“下注记录”页 /bets?game=longhu 读取） ---------- */
  var PLAY_LABELS = {
    dragon: '龙', tiger: '虎', tie: '和'
  };
  var currentBetIssue = '';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : '' + n); }
  function ymd() {
    var d = new Date();
    return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }
  function nextBetIssue() {
    var day = ymd();
    var rec = null;
    try { rec = JSON.parse(localStorage.getItem('lhd_issue') || 'null'); } catch (e) { rec = null; }
    if (!rec || rec.day !== day) rec = { day: day, seq: 0 };
    rec.seq += 1;
    try { localStorage.setItem('lhd_issue', JSON.stringify(rec)); } catch (e) { /* ignore */ }
    return day + '-' + pad3(rec.seq);
  }
  function betLogKey() { return 'lhd_bet_log_' + uid(); }
  function loadBetLog() {
    try { return JSON.parse(localStorage.getItem(betLogKey())) || []; } catch (e) { return []; }
  }
  function saveBetLog(list) {
    try { localStorage.setItem(betLogKey(), JSON.stringify(list.slice(0, 120))); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('lhd-bet-log-updated')); } catch (e) { /* ignore */ }
  }
  function findBetGroup(log, issue) {
    for (var i = 0; i < log.length; i++) { if (log[i].issue === issue) return log[i]; }
    return null;
  }
  function appendBetLog(playKey, amount) {
    if (!currentBetIssue) currentBetIssue = nextBetIssue();
    var log = loadBetLog();
    var group = findBetGroup(log, currentBetIssue);
    if (!group) {
      group = {
        game: 'longhu', issue: currentBetIssue, createdAt: new Date().toISOString(),
        settled: false, bets: [], totalAmount: 0, totalProfit: 0
      };
      log.unshift(group);
    }
    group.bets.push({
      play: PLAY_LABELS[playKey] || playKey, key: playKey,
      amount: amount, status: 'PENDING', profit: 0, winAmount: 0, hit: ''
    });
    group.totalAmount += amount;
    saveBetLog(log);
  }
  function clearCurrentBetLog() {
    if (!currentBetIssue) return;
    var log = loadBetLog();
    var kept = [];
    for (var j = 0; j < log.length; j++) {
      if (log[j].issue !== currentBetIssue) kept.push(log[j]);
    }
    if (kept.length !== log.length) saveBetLog(kept);
    currentBetIssue = '';
  }
  function settleBetLog(issue, outcome) {
    if (!issue || !outcome) return;
    var log = loadBetLog();
    var group = findBetGroup(log, issue);
    if (!group || group.settled) return;
    var resName = outcome.result === 'dragon' ? '龙赢'
      : (outcome.result === 'tiger' ? '虎赢' : '和局');
    group.drawSummary = '龙' + outcome.dragonRank + ' · 虎' + outcome.tigerRank + ' · ' + resName;
    var totalProfit = 0;
    for (var i = 0; i < group.bets.length; i++) {
      var b = group.bets[i];
      var key = b.key;
      var win = key === outcome.result;
      var ret = calcBetReturn(key, b.amount, outcome.result);
      b.winAmount = ret;
      b.profit = ret - b.amount;
      if (win) { b.status = 'WON'; b.hit = (PLAY_LABELS[key] || '') + ' 中'; }
      else if (ret > 0) { b.status = 'WON'; b.hit = '和 · 全退'; }
      else { b.status = 'LOST'; b.hit = ''; }
      totalProfit += b.profit;
    }
    group.settled = true;
    group.settledAt = new Date().toISOString();
    group.totalProfit = totalProfit;
    saveBetLog(log);
  }

  /* A=1 … K=13，比点数大小 */
  function rankValue(rank) {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank, 10);
  }
  function makeCard(suit, rank) { return { suit: suit, rank: rank }; }
  function cardSrc(c) { return './assets/cards/' + c.suit + '_' + c.rank + '.png?v=1'; }

  function buildDeck() {
    var deck = [];
    for (var d = 0; d < DECKS; d++) {
      for (var si = 0; si < SUITS.length; si++) {
        for (var r = 0; r < RANKS.length; r++) deck.push(makeCard(SUITS[si], RANKS[r]));
      }
    }
    for (var i = deck.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck;
  }

  function resolveHands(deck) {
    var dragon = deck[0];
    var tiger = deck[1];
    var dr = rankValue(dragon.rank);
    var tr = rankValue(tiger.rank);
    var result = dr > tr ? 'dragon' : (tr > dr ? 'tiger' : 'tie');
    return {
      dragon: dragon,
      tiger: tiger,
      result: result,
      dragonRank: dr,
      tigerRank: tr
    };
  }

  function resetCards() {
    qsa('.lhd-card').forEach(function (el) {
      el.classList.remove('is-dealt', 'is-flipped');
      var front = qs('.lhd-card__face--front img', el);
      if (front) front.src = './assets/cards/card-back.png?v=9';
    });
    if (flyLayer) flyLayer.innerHTML = '';
    if (payoutFlyLayer) payoutFlyLayer.innerHTML = '';
    clearCompare();
    clearWinBets();
  }

  function clearCompare() {
    if (dragonHand) dragonHand.classList.remove('is-winner', 'is-loser');
    if (tigerHand) tigerHand.classList.remove('is-winner', 'is-loser');
    [dragonType, tigerType].forEach(function (el) {
      if (!el) return;
      el.hidden = true;
      el.classList.remove('is-show');
      el.textContent = '';
    });
  }

  function clearWinBets() {
    if (!betArea) return;
    qsa('.lhd-bet-btn.is-win', betArea).forEach(function (btn) {
      btn.classList.remove('is-win');
    });
  }

  function showCompare(outcome) {
    clearCompare();
    if (dragonType) {
      dragonType.hidden = false;
      dragonType.textContent = outcome.dragonRank;
      dragonType.classList.add('is-show');
    }
    if (tigerType) {
      tigerType.hidden = false;
      tigerType.textContent = outcome.tigerRank;
      tigerType.classList.add('is-show');
    }
    if (outcome.result === 'dragon') {
      if (dragonHand) dragonHand.classList.add('is-winner');
      if (tigerHand) tigerHand.classList.add('is-loser');
    } else if (outcome.result === 'tiger') {
      if (tigerHand) tigerHand.classList.add('is-winner');
      if (dragonHand) dragonHand.classList.add('is-loser');
    }
  }

  function highlightWinningBets(outcome) {
    clearWinBets();
    if (!betArea) return;
    var keys = [];
    if (outcome.result === 'dragon') keys.push('dragon');
    if (outcome.result === 'tiger') keys.push('tiger');
    if (outcome.result === 'tie') keys.push('tie');
    keys.forEach(function (key) {
      var btn = betBtn(key);
      if (btn) btn.classList.add('is-win');
    });
  }

  function showScorePop(amount) {
    if (!amount) return;
    var target = document.getElementById('statBalance');
    var host = document.querySelector('.lhd-head') || document.body;
    if (!target || !host) return;
    var tr = target.getBoundingClientRect();
    var hr = host.getBoundingClientRect();
    var pop = document.createElement('div');
    pop.className = 'lhd-score-pop';
    pop.textContent = (amount > 0 ? '+' : '') + Number(amount).toLocaleString('en-US');
    pop.style.left = (tr.left + tr.width / 2 - hr.left) + 'px';
    pop.style.top = (tr.bottom - hr.top + 2) + 'px';
    host.appendChild(pop);
    setTimeout(function () { if (pop.parentNode) pop.parentNode.removeChild(pop); }, 1450);
  }

  function showPhaseBanner(kind) {
    var box = document.getElementById('phaseBanner');
    var img = document.getElementById('phaseBannerImg');
    if (!box || !img) return Promise.resolve();
    var isStop = kind === 'stop';
    img.src = isStop
      ? './assets/ui/banners/bet-stop.png?v=1'
      : './assets/ui/banners/bet-start.png?v=1';
    img.alt = isStop ? '停止下注' : '开始下注';
    if (box._bannerTimer) clearTimeout(box._bannerTimer);
    if (box._bannerHideTimer) clearTimeout(box._bannerHideTimer);
    box.classList.remove('is-show', 'is-hide');
    void box.offsetWidth;
    box.classList.add('is-show');
    box.setAttribute('aria-hidden', 'false');
    return new Promise(function (resolve) {
      box._bannerTimer = setTimeout(function () {
        box.classList.remove('is-show');
        box.classList.add('is-hide');
        box._bannerHideTimer = setTimeout(function () {
          box.classList.remove('is-hide');
          box.setAttribute('aria-hidden', 'true');
          box._bannerTimer = null;
          box._bannerHideTimer = null;
        }, 340);
        resolve();
      }, BANNER_MS);
    });
  }

  function beat() {
    if (!timeEl) return;
    timeEl.classList.remove('is-beat');
    void timeEl.offsetWidth;
    timeEl.classList.add('is-beat');
  }

  function paint(doBeat) {
    if (!timerBox || !timeEl) return;
    timerBox.classList.remove('is-urgent', 'is-critical', 'is-draw', 'is-payout');
    timeEl.classList.remove('is-beat');
    if (phase === 'draw') {
      timerBox.classList.add('is-draw');
      timeEl.textContent = '开奖中';
      return;
    }
    if (phase === 'payout') {
      timerBox.classList.add('is-payout');
      timeEl.textContent = '派奖中';
      return;
    }
    timeEl.textContent = String(left);
    if (left <= 10) timerBox.classList.add('is-urgent');
    if (left <= 5 && left > 0) {
      timerBox.classList.add('is-critical');
      if (doBeat) {
        beat();
        sfx('countdown', { vol: 0.7, dedupeMs: 400 });
      }
    }
  }

  function setCardFront(slot, card) {
    var el = qs('.lhd-card[data-slot="' + slot + '"]');
    if (!el) return;
    var front = qs('.lhd-card__face--front img', el);
    if (front) front.src = cardSrc(card);
  }

  async function dealSlot(slot, card) {
    setCardFront(slot, card);
    var el = qs('.lhd-card[data-slot="' + slot + '"]');
    if (!el || !flyLayer || !shoe || !room) {
      if (el) el.classList.add('is-dealt');
      sfx('deal', { vol: 0.7 });
      await sleep(GAP_MS);
      return;
    }
    sfx('deal', { vol: 0.7 });
    var from = localRect(shoe);
    var to = localRect(el);
    var w = to.width;
    var h = to.height;
    var startX = from.left + from.width * 0.55 - w / 2;
    var startY = from.top + from.height * 0.72 - h / 2;
    var dx = to.left - startX;
    var dy = to.top - startY;
    var fly = document.createElement('div');
    fly.className = 'lhd-fly-card';
    fly.style.width = w + 'px';
    fly.style.height = h + 'px';
    fly.style.left = startX + 'px';
    fly.style.top = startY + 'px';
    fly.style.setProperty('--fly-x', dx + 'px');
    fly.style.setProperty('--fly-y', dy + 'px');
    fly.innerHTML = '<img src="' + CARD_BACK + '" alt="" draggable="false">';
    flyLayer.appendChild(fly);
    shoe.classList.remove('is-dealing');
    void shoe.offsetWidth;
    shoe.classList.add('is-dealing');
    await new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          fly.classList.add('is-flying');
        });
      });
      setTimeout(function () {
        if (fly.parentNode) fly.parentNode.removeChild(fly);
        el.classList.add('is-dealt');
        shoe.classList.remove('is-dealing');
        resolve();
      }, FLY_MS);
    });
    await sleep(GAP_MS);
  }

  async function flipSlot(slot) {
    var el = qs('.lhd-card[data-slot="' + slot + '"]');
    if (el) el.classList.add('is-flipped');
    sfx('open', { vol: 0.75, dedupeMs: 40 });
    await sleep(FLIP_MS);
    await sleep(FLIP_GAP_MS);
  }

  async function dealAndReveal(outcome) {
    var map = { d1: outcome.dragon, t1: outcome.tiger };
    var i;
    for (i = 0; i < DEAL_ORDER.length; i++) {
      await dealSlot(DEAL_ORDER[i], map[DEAL_ORDER[i]]);
    }
    await sleep(DEAL_HOLD_MS);
    for (i = 0; i < DEAL_ORDER.length; i++) {
      await flipSlot(DEAL_ORDER[i]);
    }
    showCompare(outcome);
    sfx('vs', { vol: 0.75 });
    await playVoice('voice/dragon');
    await playVoice('voice/point-' + outcome.dragonRank);
    await playVoice('voice/tiger');
    await playVoice('voice/point-' + outcome.tigerRank);
    if (outcome.result === 'dragon') {
      sfx('dragon-win-sfx', { vol: 0.8 });
      await playVoice('voice/dragon-win');
    } else if (outcome.result === 'tiger') {
      sfx('tiger-win-sfx', { vol: 0.8 });
      await playVoice('voice/tiger-win');
    } else {
      await playVoice('voice/tie');
    }
  }

  function calcSettlement(outcome) {
    var stakeTotal = 0;
    var returnTotal = 0;
    Object.keys(betTotals).forEach(function (key) {
      var stake = betTotals[key] || 0;
      if (!stake) return;
      stakeTotal += stake;
      returnTotal += calcBetReturn(key, stake, outcome.result);
    });
    return {
      stakeTotal: stakeTotal,
      returnTotal: Math.round(returnTotal),
      profit: Math.round(returnTotal - stakeTotal)
    };
  }

  function applySettlement(settlement) {
    if (!settlement) return;
    if (settlement.returnTotal > 0) creditBalance(settlement.returnTotal);
    var s = getStats();
    s.turnover = (s.turnover || 0) + (settlement.stakeTotal || 0);
    s.winloss = (s.winloss || 0) + (settlement.profit || 0);
    s.rebate = (s.rebate || 0) + Math.floor((settlement.stakeTotal || 0) * 0.005);
    saveStats(s);
    refreshBalance();
    if (settlement.returnTotal > 0) showScorePop(settlement.returnTotal);
  }

  function chipsOn(key) {
    var btn = betBtn(key);
    if (!btn) return [];
    return Array.prototype.slice.call(btn.querySelectorAll('.lhd-bet-btn__chips img'));
  }

  function getWinLoseKeys(outcome) {
    var all = ['dragon', 'tiger', 'tie'];
    var win = [];
    var lose = [];
    /* 主胜区始终作为飞入目标（即使该区暂无筹码） */
    if (outcome.result === 'dragon') win.push('dragon');
    else if (outcome.result === 'tiger') win.push('tiger');
    else if (outcome.result === 'tie') win.push('tie');
    all.forEach(function (k) {
      var has = chipsOn(k).length > 0;
      var isWin = false;
      if (k === 'dragon') isWin = outcome.result === 'dragon';
      else if (k === 'tiger') isWin = outcome.result === 'tiger';
      else if (k === 'tie') isWin = outcome.result === 'tie';
      /* 和局：龙/虎退半，视觉上保留筹码飞回积分 */
      if (outcome.result === 'tie' && (k === 'dragon' || k === 'tiger')) isWin = true;
      if (isWin) {
        if (win.indexOf(k) < 0 && (has || k === 'dragon' || k === 'tiger' || k === 'tie')) win.push(k);
      } else if (has) {
        lose.push(k);
      }
    });
    return { win: win, lose: lose };
  }

  function clearBetVisual(key) {
    var btn = betBtn(key);
    if (!btn) return;
    var box = qs('.lhd-bet-btn__chips', btn);
    if (box) box.innerHTML = '';
  }

  function collectPayout(outcome, settlement) {
    return new Promise(function (resolve) {
      stopOtherBetting();
      if (settlement && settlement.returnTotal > 0) sfx('credit-loop-in', { vol: 0.7 });
      if (!payoutFlyLayer) {
        applySettlement(settlement);
        resolve();
        return;
      }
      payoutFlyLayer.innerHTML = '';
      var scoreEl = document.getElementById('statBalance');
      var playersIcon = qs('.lhd-players__icon') || document.getElementById('playersBox');
      var scoreRect = scoreEl ? layerRect(scoreEl) : null;
      var playersRect = playersIcon ? layerRect(playersIcon) : null;
      var landSize = barChipSize() * CHIP_LAND_SCALE;
      var wl = getWinLoseKeys(outcome);
      var winKeys = wl.win;
      var loseKeys = wl.lose;
      var moving = [];
      loseKeys.forEach(function (lk) {
        chipsOn(lk).forEach(function (img) {
          moving.push({
            img: img,
            owner: img.getAttribute('data-owner') || 'other',
            value: parseInt(img.getAttribute('data-value'), 10) || 1,
            src: img.getAttribute('src') || CHIP_SRC[1]
          });
        });
      });

      var phase1 = [];
      if (moving.length && winKeys.length) {
        moving.forEach(function (chip, idx) {
          var targetKey = winKeys[idx % winKeys.length];
          var winBtn = betBtn(targetKey);
          if (!winBtn) return;
          var winBox = qs('.lhd-bet-btn__chips', winBtn) || winBtn;
          var winArea = layerRect(winBox);
          var src = layerRect(chip.img);
          var jx = (Math.random() - 0.5) * winArea.width * 0.55;
          var jy = (Math.random() - 0.5) * winArea.height * 0.45;
          var dst = { cx: winArea.cx + jx, cy: winArea.cy + jy, width: landSize, height: landSize };
          var slot = pickSlot(targetKey);
          phase1.push(delay(idx * 35).then(function () {
            chip.img.style.opacity = '0';
            return flyChipAbs(
              src, dst, chip.src, COLLECT_MS,
              landSize / Math.max(12, Math.min(src.width, src.height) || landSize)
            ).then(function () {
              var potOwner = (betTotals[targetKey] || 0) > 0 ? 'me' : 'other';
              placeChipOnBtn(winBtn, chip.value, slot, landSize, potOwner);
            });
          }));
        });
      } else if (moving.length && playersRect) {
        moving.forEach(function (chip, idx) {
          var src = layerRect(chip.img);
          phase1.push(delay(idx * 30).then(function () {
            chip.img.style.opacity = '0';
            return flyChipAbs(src, playersRect, chip.src, TO_SCORE_MS, 0.35);
          }));
        });
      }

      Promise.all(phase1).then(function () {
        loseKeys.forEach(clearBetVisual);

        var meList = [];
        var otherList = [];
        winKeys.forEach(function (wk) {
          chipsOn(wk).forEach(function (img) {
            if ((img.getAttribute('data-owner') || 'other') === 'me') meList.push(img);
            else otherList.push(img);
          });
        });

        function trimList(arr, maxN) {
          if (arr.length <= maxN) return arr;
          var step = Math.ceil(arr.length / maxN);
          return arr.filter(function (_, i) { return i % step === 0; }).slice(0, maxN);
        }
        meList = trimList(meList, 12);
        otherList = trimList(otherList, 12);

        var phase2 = [];
        meList.forEach(function (img, idx) {
          if (!scoreRect) return;
          phase2.push(delay(idx * 38).then(function () {
            var src = layerRect(img);
            var srcUrl = img.getAttribute('src') || CHIP_SRC[1];
            img.style.opacity = '0';
            return flyChipAbs(src, scoreRect, srcUrl, TO_SCORE_MS, 0.42);
          }));
        });
        otherList.forEach(function (img, idx) {
          if (!playersRect) return;
          phase2.push(delay(idx * 38).then(function () {
            var src = layerRect(img);
            var srcUrl = img.getAttribute('src') || CHIP_SRC[1];
            img.style.opacity = '0';
            return flyChipAbs(src, playersRect, srcUrl, TO_SCORE_MS, 0.35);
          }));
        });

        return Promise.all(phase2).then(function () {
          ['dragon', 'tiger', 'tie'].forEach(clearBetVisual);
          if (settlement && settlement.returnTotal > 0) sfx('win', { vol: 0.85 });
          applySettlement(settlement);
          resolve();
        });
      }).catch(function () {
        applySettlement(settlement);
        resolve();
      });
    });
  }

  function clearBetsVisual() {
    Object.keys(betTotals).forEach(function (k) { betTotals[k] = 0; });
    slotStacks = {};
    qsa('.lhd-bet-btn').forEach(function (btn) {
      var chips = qs('.lhd-bet-btn__chips', btn);
      var stake = qs('.lhd-bet-btn__stake', btn);
      if (chips) chips.innerHTML = '';
      if (stake) { stake.hidden = true; stake.textContent = '0'; }
    });
  }

  function updateStakeLabel(key) {
    var btn = betBtn(key);
    if (!btn) return;
    var stake = qs('.lhd-bet-btn__stake', btn);
    var v = betTotals[key] || 0;
    if (!stake) return;
    if (v > 0) { stake.hidden = false; stake.textContent = Number(v).toLocaleString('en-US'); }
    else { stake.hidden = true; stake.textContent = '0'; }
  }

  function placeBet(key) {
    if (isClosed() || !key) return;
    /* 龙、虎可同时下注（无互斥） */

    unlockAudio();
    var value = selectedChip;
    var btn = betBtn(key);
    if (!btn) return;
    if (!debitBalance(value)) {
      if (window.App && App.toast) App.toast('积分不足');
      return;
    }
    betTotals[key] = (betTotals[key] || 0) + value;
    roundPlacements.push({ key: key, value: value });
    appendBetLog(key, value);
    var slot = pickSlot(key);
    var landSize = barChipSize() * CHIP_LAND_SCALE;
    flyChipToBet(btn, value, slot, landSize, undefined, 'me');
    updateStakeLabel(key);
    sfx('bet', { vol: 0.9 });
    refreshBalance();
    syncActions();
  }

  function undoAllBets() {
    if (isClosed() || usedUndo || !roundPlacements.length) return;
    var refund = 0;
    roundPlacements.forEach(function (p) { refund += p.value; });
    creditBalance(refund);
    clearCurrentBetLog();
    clearBetsVisual();
    roundPlacements = [];
    usedUndo = true;
    sfx('cancel', { vol: 0.75 });
    refreshBalance();
    syncActions();
  }

  function rebetLastRound() {
    if (isClosed() || usedRebet || !lastRoundPlacements.length) return;
    var need = 0;
    lastRoundPlacements.forEach(function (p) {
      need += p.value;
    });
    if (!debitBalance(need)) {
      if (window.App && App.toast) App.toast('积分不足');
      return;
    }
    lastRoundPlacements.forEach(function (p, i) {
      betTotals[p.key] = (betTotals[p.key] || 0) + p.value;
      roundPlacements.push({ key: p.key, value: p.value });
      appendBetLog(p.key, p.value);
      var btn = betBtn(p.key);
      if (btn) {
        var slot = pickSlot(p.key);
        var landSize = barChipSize() * CHIP_LAND_SCALE;
        flyChipToBet(btn, p.value, slot, landSize, CHIP_FLY_MS + i * 40, 'me');
      }
      updateStakeLabel(p.key);
    });
    usedRebet = true;
    sfx('rebet', { vol: 0.8 });
    refreshBalance();
    syncActions();
  }

  function syncActions() {
    if (!actionBar) return;
    var undoBtn = qs('[data-action="undo"]', actionBar);
    var rebetBtn = qs('[data-action="rebet"]', actionBar);
    var canUndo = !isClosed() && !usedUndo && roundPlacements.length > 0;
    var canRebet = !isClosed() && !usedRebet && lastRoundPlacements.length > 0 && roundPlacements.length === 0;
    if (undoBtn) {
      undoBtn.classList.toggle('is-disabled', !canUndo);
      undoBtn.setAttribute('aria-disabled', canUndo ? 'false' : 'true');
    }
    if (rebetBtn) {
      rebetBtn.classList.toggle('is-disabled', !canRebet);
      rebetBtn.setAttribute('aria-disabled', canRebet ? 'false' : 'true');
    }
  }

  function applyChipPage() {
    var page = CHIP_PAGES[chipPage] || CHIP_PAGES[0];
    var btns = qsa('.lhd-chip', chipBar);
    btns.forEach(function (btn, i) {
      var v = page[i];
      if (v == null) { btn.style.visibility = 'hidden'; return; }
      btn.style.visibility = 'visible';
      btn.setAttribute('data-chip', String(v));
      btn.setAttribute('aria-label', String(v));
      var img = qs('img', btn);
      if (img) img.src = CHIP_SRC[v];
      btn.classList.toggle('is-selected', v === selectedChip);
    });
    if (page.indexOf(selectedChip) < 0) {
      selectedChip = page[0];
      btns.forEach(function (btn) {
        btn.classList.toggle('is-selected', Number(btn.getAttribute('data-chip')) === selectedChip);
      });
    }
  }

  function buildBigRoad(history) {
    var cols = [];
    var lastSide = null;
    function place(side, ties) {
      if (!cols.length || lastSide !== side) cols.push({ cells: [] });
      var col = cols[cols.length - 1];
      if (col.cells.length >= ROAD_ROWS) {
        cols.push({ cells: [] });
        col = cols[cols.length - 1];
      }
      col.cells.push({ side: side, ties: ties || 0 });
    }
    history.forEach(function (r) {
      if (r === 'tie') {
        if (!cols.length) place('dragon', 1);
        else {
          var col = cols[cols.length - 1];
          var cell = col.cells[col.cells.length - 1];
          cell.ties = (cell.ties || 0) + 1;
        }
        return;
      }
      place(r, 0);
      lastSide = r;
    });
    return cols;
  }

  function syncRoadGridWidth(grid, cols) {
    if (!grid || !cols) return;
    var sample = grid.querySelector('.lhd-bead, .lhd-big');
    var gap = 2;
    var cell = sample ? sample.getBoundingClientRect().width : 0;
    if (!(cell > 4)) {
      var sc = grid.closest('.lhd-roadmap__scroll');
      var h = sc ? sc.clientHeight : 0;
      cell = h > 8 ? (h - 6 - 5 * gap) / 6 : 22;
    }
    grid.style.width = (cols * (cell + gap) - gap) + 'px';
  }

  function renderBead() {
    if (!beadGrid) return;
    var filledCols = Math.ceil(roadHistory.length / ROAD_ROWS) || 0;
    var cols = Math.max(ROAD_MIN_COLS, filledCols + 1);
    var lastIdx = roadHistory.length - 1;
    var html = '';
    for (var c = 0; c < cols; c++) {
      for (var r = 0; r < ROAD_ROWS; r++) {
        var idx = c * ROAD_ROWS + r;
        if (idx < roadHistory.length) {
          var kind = roadHistory[idx];
          var latest = idx === lastIdx ? ' is-latest' : '';
          html += '<span class="lhd-bead lhd-bead--' + kind + latest + '" role="listitem">' + ROAD_LABELS[kind] + '</span>';
        } else {
          html += '<span class="lhd-bead lhd-bead--empty" aria-hidden="true"></span>';
        }
      }
    }
    beadGrid.innerHTML = html;
    beadGrid.style.setProperty('--road-cols', String(cols));
    syncRoadGridWidth(beadGrid, cols);
  }

  function renderBig() {
    if (!bigGrid) return;
    var colsData = buildBigRoad(roadHistory);
    var cols = Math.max(ROAD_MIN_COLS, colsData.length + 1);
    var html = '';
    var lastCol = colsData.length - 1;
    var lastRow = lastCol >= 0 ? colsData[lastCol].cells.length - 1 : -1;
    for (var c = 0; c < cols; c++) {
      var col = colsData[c];
      for (var r = 0; r < ROAD_ROWS; r++) {
        if (col && r < col.cells.length) {
          var cell = col.cells[r];
          var latest = (c === lastCol && r === lastRow) ? ' is-latest' : '';
          var tieHtml = '';
          if (cell.ties > 0) {
            var n = cell.ties > 9 ? 9 : cell.ties;
            tieHtml = '<i class="lhd-big__tie" data-n="' + n + '">' + (n > 1 ? String(n) : '') + '</i>';
          }
          html += '<span class="lhd-big lhd-big--' + cell.side + latest + '" role="listitem">' + tieHtml + '</span>';
        } else {
          html += '<span class="lhd-big lhd-big--empty" aria-hidden="true"></span>';
        }
      }
    }
    bigGrid.innerHTML = html;
    bigGrid.style.setProperty('--road-cols', String(cols));
    syncRoadGridWidth(bigGrid, cols);
  }

  function scrollRoadToEnd() {
    function go() {
      if (beadScroll) beadScroll.scrollLeft = beadScroll.scrollWidth;
      if (bigScroll) bigScroll.scrollLeft = bigScroll.scrollWidth;
    }
    go();
    requestAnimationFrame(function () { go(); requestAnimationFrame(go); });
  }

  function renderRoad() {
    var total = roadStats.dragon + roadStats.tiger + roadStats.tie;
    setText('roadD', String(roadStats.dragon));
    setText('roadTg', String(roadStats.tiger));
    setText('roadTie', String(roadStats.tie));
    setText('roadN', String(total));
    setText('roadDpct', pct(roadStats.dragon, total));
    setText('roadTgpct', pct(roadStats.tiger, total));
    setText('roadTiepct', pct(roadStats.tie, total));
    renderBead();
    renderBig();
    scrollRoadToEnd();
  }

  function pushRoad(result) {
    if (!ROAD_LABELS[result]) return;
    if (roadStats[result] != null) roadStats[result] += 1;
    roadHistory.push(result);
    if (roadHistory.length > ROAD_MAX) {
      var over = roadHistory.length - ROAD_MAX;
      over = Math.ceil(over / ROAD_ROWS) * ROAD_ROWS;
      roadHistory = roadHistory.slice(over);
    }
    renderRoad();
  }

  function setPhase(next) {
    phase = next;
    syncActions();
    paint(false);
  }

  function tick() {
    var now = Date.now();
    if (phase === 'bet') {
      left = Math.max(0, Math.ceil((betDeadline - now) / 1000));
      var doBeat = left !== lastBeatSec;
      lastBeatSec = left;
      paint(doBeat && left <= 5 && left > 0);
      if (left <= 0) startDraw();
      return;
    }
    if (phase === 'payout') {
      paint(false);
      return;
    }
    paint(false);
  }

  async function startDraw() {
    if (roundBusy) return;
    roundBusy = true;
    stopOtherBetting();
    setPhase('draw');
    await showPhaseBanner('stop');
    sfx('stop-bet', { vol: 0.7 });
    playVoice('voice/stop-bet');

    var deck = buildDeck();
    var outcome = resolveHands(deck);
    await dealAndReveal(outcome);

    highlightWinningBets(outcome);
    var settlement = calcSettlement(outcome);
    var roundIssue = currentBetIssue;
    setPhase('payout');
    payoutDeadline = Date.now() + Math.max(PAYOUT_SECS, 3) * 1000;
    await collectPayout(outcome, settlement);
    settleBetLog(roundIssue, outcome);
    currentBetIssue = '';
    pushRoad(outcome.result);

    lastRoundPlacements = roundPlacements.slice();
    roundPlacements = [];
    usedUndo = false;
    usedRebet = false;
    /* 筹码视觉已在 collectPayout 清掉，这里只清注额 */
    Object.keys(betTotals).forEach(function (k) { betTotals[k] = 0; });
    slotStacks = {};
    qsa('.lhd-bet-btn__stake').forEach(function (stake) {
      stake.hidden = true;
      stake.textContent = '0';
    });
    var remain = Math.max(0, payoutDeadline - Date.now());
    if (remain > 0) await sleep(remain);
    resetCards();
    roundBusy = false;
    startBet();
  }

  function startBet() {
    setPhase('bet');
    currentBetIssue = '';
    betDeadline = Date.now() + TOTAL * 1000;
    left = TOTAL;
    lastBeatSec = -1;
    paint(false);
    showPhaseBanner('start');
    sfx('start-bet', { vol: 0.65 });
    playVoice('voice/start-bet');
    startOtherBetting();
    syncActions();
  }

  /* events */
  var backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function () {
      if (window.App && App.go) App.go('../../client-app/pages/game-lobby/game-lobby.html' + q);
      else if (window.parent !== window) window.parent.postMessage({ type: 'assets-game-nav', path: '/lobby' + q }, '*');
      else history.back();
    });
  }

  if (betArea) {
    betArea.addEventListener('click', function (e) {
      var btn = e.target.closest('.lhd-bet-btn');
      if (!btn) return;
      placeBet(btn.getAttribute('data-bet'));
    });
  }

  if (chipBar) {
    chipBar.addEventListener('click', function (e) {
      unlockAudio();
      if (e.target.closest('.lhd-chip-more')) {
        chipPage = (chipPage + 1) % CHIP_PAGES.length;
        applyChipPage();
        return;
      }
      var chip = e.target.closest('.lhd-chip');
      if (!chip) return;
      selectedChip = Number(chip.getAttribute('data-chip')) || 1;
      qsa('.lhd-chip', chipBar).forEach(function (c) {
        c.classList.toggle('is-selected', c === chip);
      });
    });
  }

  if (actionBar) {
    actionBar.addEventListener('click', function (e) {
      unlockAudio();
      var btn = e.target.closest('.lhd-action');
      if (!btn || btn.classList.contains('is-disabled')) return;
      var act = btn.getAttribute('data-action');
      if (act === 'undo') undoAllBets();
      else if (act === 'rebet') rebetLastRound();
    });
  }

  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('touchstart', unlockAudio, { once: true });

  applyChipPage();
  renderRoad();
  resetCards();
  refreshBalance();
  setInterval(refreshBalance, 2000);
  startBet();
  window.__lhdTickTimer = setInterval(function () {
    tick();
  }, 200);

  var playersEl = document.getElementById('playersCount');
  var playersN = 36;
  window.__lhdPlayersTimer = setInterval(function () {
    playersN = Math.max(18, Math.min(86, playersN + ((Math.random() * 5) | 0) - 2));
    if (playersEl) playersEl.textContent = String(playersN);
  }, 4000);

  /* ---------- 右侧快捷栏 + 弹层 ---------- */
  (function initRail() {
    var mask = document.getElementById('lhdSheetMask');
    var sheet = document.getElementById('lhdSheet');
    var sheetTitle = document.getElementById('lhdSheetTitle');
    var sheetBody = document.getElementById('lhdSheetBody');
    var closeBtn = document.getElementById('lhdSheetClose');

    function openSheet(title, html) {
      if (!sheet) return;
      sheetTitle.textContent = title;
      sheetBody.innerHTML = html;
      if (mask) mask.hidden = false;
      sheet.hidden = false;
      sheet.setAttribute('aria-hidden', 'false');
    }
    function closeSheet() {
      if (!sheet) return;
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
      if (mask) mask.hidden = true;
      sheetBody.innerHTML = '';
    }
    if (mask) mask.addEventListener('click', closeSheet);
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);

    function nav(path) {
      if (window.App && App.go) App.go(path);
      else if (window.parent !== window) {
        window.parent.postMessage({ type: 'assets-game-nav', path: path }, '*');
      }
    }

    var csBtn = document.getElementById('railCs');
    if (csBtn) csBtn.addEventListener('click', function () {
      nav('../../client-app/pages/cs/cs.html' + q);
    });

    var recBtn = document.getElementById('railRecords');
    if (recBtn) recBtn.addEventListener('click', function () {
      var sep = q.indexOf('?') >= 0 ? '&' : '?';
      nav('../../client-app/pages/bet-records/bet-records.html' + q + sep + 'game=longhu');
    });

    var histBtn = document.getElementById('railHistory');
    if (histBtn) histBtn.addEventListener('click', function () {
      var total = roadStats.dragon + roadStats.tiger + roadStats.tie;
      var html = '<div class="lhd-sheet-road__stats">' +
        '<span>龙 <b class="dragon">' + roadStats.dragon + '</b></span>' +
        '<span>虎 <b class="tiger">' + roadStats.tiger + '</b></span>' +
        '<span>和 <b class="tie">' + roadStats.tie + '</b></span>' +
        '<span>总局 <b>' + total + '</b></span></div>' +
        '<div class="lhd-sheet-road__label">珠盘</div>' +
        '<div class="lhd-sheet-road__scroll"><div class="lhd-sheet-road__grid" id="sheetBead"></div></div>' +
        '<div class="lhd-sheet-road__label">大路</div>' +
        '<div class="lhd-sheet-road__scroll"><div class="lhd-sheet-road__grid" id="sheetBig"></div></div>';
      openSheet('历史记录', html);
      var sb = document.getElementById('sheetBead');
      var sg = document.getElementById('sheetBig');
      if (sb) { var old = beadGrid; beadGrid = sb; renderBead(); beadGrid = old; }
      if (sg) { var old2 = bigGrid; bigGrid = sg; renderBig(); bigGrid = old2; }
    });

    var rulesBtn = document.getElementById('railRules');
    if (rulesBtn) rulesBtn.addEventListener('click', function () {
      openSheet('玩法规则',
        '<div class="lhd-rules">' +
        '<p class="lhd-rules__intro">开牌时龙、虎各派一张牌，无须补牌。按牌面点数定输赢：K 最大、A 最小；点数相同则为和（K &gt; Q &gt; J &gt; 10 &gt; … &gt; 2 &gt; A）。</p>' +
        '<table class="lhd-rules__table"><thead><tr><th>投注</th><th>获胜条件</th><th>赔付倍数</th><th>备注</th></tr></thead><tbody>' +
        '<tr><td>龙</td><td>龙点数 &gt; 虎</td><td class="odds">1 : 2</td><td>开和全退</td></tr>' +
        '<tr><td>虎</td><td>虎点数 &gt; 龙</td><td class="odds">1 : 2</td><td>开和全退</td></tr>' +
        '<tr><td>和</td><td>龙虎点数相同</td><td class="odds">1 : 9</td><td></td></tr>' +
        '</tbody></table>' +
        '<p class="lhd-rules__intro">赔付倍数含本金。中奖后对赢利抽取 5% 抽水（例：押龙 1000，龙赢，净利 1000×0.95=950，返还 1950）。龙与虎可同时下注。</p>' +
        '</div>');
    });

    var setBtn = document.getElementById('railSettings');
    if (setBtn) setBtn.addEventListener('click', function () {
      openSheet('设置',
        '<div class="lhd-settings">' +
        '<label class="lhd-settings__row"><span>背景音乐</span>' +
        '<input type="checkbox" id="lhdMusicToggle"' + (audioPref.music ? ' checked' : '') + '></label>' +
        '<label class="lhd-settings__row"><span>音效 / 语音</span>' +
        '<input type="checkbox" id="lhdSfxToggle"' + (audioPref.sfx ? ' checked' : '') + '></label>' +
        '</div>');
      var m = document.getElementById('lhdMusicToggle');
      var s = document.getElementById('lhdSfxToggle');
      if (m) m.addEventListener('change', function () { unlockAudio(); setMusicOn(m.checked); });
      if (s) s.addEventListener('change', function () { unlockAudio(); setSfxOn(s.checked); });
    });
  })();
})();
