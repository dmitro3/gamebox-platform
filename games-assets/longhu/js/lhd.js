/**
 * 龙虎斗 · 即时比牌（龙/虎/和 三方押注）
 */
$(function () {
  window.__lhdBoot = bootLonghu;
});

function bootLonghu() {
  if (bootLonghu.started) return;
  bootLonghu.started = true;

  const PFX = 'lhd';
  const V = '?v=1';
  const user = App.getUser();
  const params = new URLSearchParams(location.search);
  const q = params.get('roomNo') ? ('?roomNo=' + encodeURIComponent(params.get('roomNo'))) : '';

  const UNIT_STEPS = [10, 20, 50, 100, 200, 500];
  const SIDES = [
    { id: 'dragon', label: '龙', mult: 2 },
    { id: 'tiger', label: '虎', mult: 2 },
    { id: 'tie', label: '和', mult: 9 }
  ];

  const SUITS = [
    { sym: '♠', red: false },
    { sym: '♥', red: true },
    { sym: '♣', red: false },
    { sym: '♦', red: true }
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let unitIdx = 0;
  let bets = {};
  let dealing = false;
  let history = loadHistory();

  const $room = $('.' + PFX + '-room');
  const $result = $('#resultText');
  const $dragonCard = $('#dragonCard');
  const $tigerCard = $('#tigerCard');
  const $dragonFace = $('#dragonFace');
  const $tigerFace = $('#tigerFace');

  function symSrc(id) {
    return './assets/symbols/' + id + '.png' + V;
  }

  function sideById(id) {
    return SIDES.find(function (s) { return s.id === id; });
  }

  function loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('lhd_history_' + user.uid) || '[]');
    } catch (e) { return []; }
  }

  function saveHistory() {
    localStorage.setItem('lhd_history_' + user.uid, JSON.stringify(history.slice(0, 80)));
  }

  function cardValue(rank) {
    if (rank === 'A') return 1;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    return parseInt(rank, 10);
  }

  function drawCard() {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return {
      rank: rank,
      suit: suit.sym,
      red: suit.red,
      value: cardValue(rank),
      text: rank + suit.sym
    };
  }

  function unitBet() { return UNIT_STEPS[unitIdx]; }

  function totalBet() {
    let n = 0;
    SIDES.forEach(function (s) { n += (bets[s.id] || 0); });
    return n * unitBet();
  }

  function refreshStats() {
    $('#statBalance').text(App.getBalance(user.uid).toLocaleString('en-US'));
    $('#statBet').text(totalBet().toLocaleString('en-US'));
    $('#unitBetLabel').text(unitBet());
  }

  function updateCenter(title, sub) {
    $('#centerTitle').text(title || '请押注');
    $('#centerSub').text(sub || '点击下方押注键');
  }

  function buildBetKeys() {
    let html = '';
    SIDES.forEach(function (s) {
      html +=
        '<button type="button" class="' + PFX + '-bet-key" data-id="' + s.id + '">' +
          '<span class="' + PFX + '-bet-key__bg" aria-hidden="true"></span>' +
          '<img class="' + PFX + '-bet-key__sym" src="' + symSrc(s.id) + '" alt="" draggable="false">' +
          '<span class="' + PFX + '-bet-key__label">' + s.label + ' ×' + s.mult + '</span>' +
          '<span class="' + PFX + '-bet-key__count" data-count></span>' +
        '</button>';
    });
    $('#betKeys').html(html);
  }

  function refreshBetKeys() {
    SIDES.forEach(function (s) {
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
    SIDES.forEach(function (s) { bets[s.id] = 1; });
    refreshBetKeys();
    updateCenter('全押', '龙/虎/和各 1 注');
  }

  function toggleBet(id) {
    if (dealing) return;
    bets[id] = (bets[id] || 0) + 1;
    if (bets[id] > 99) bets[id] = 99;
    refreshBetKeys();
    const side = sideById(id);
    updateCenter('押注 ' + side.label, '×' + bets[id] + ' 注 · 单注 ' + unitBet());
  }

  function resetCards() {
    $dragonCard.removeClass('is-flipped is-win');
    $tigerCard.removeClass('is-flipped is-win');
    $('#sideDragon, #sideTiger').removeClass('is-win');
    $dragonFace.empty();
    $tigerFace.empty();
    $('#dragonPts, #tigerPts').text('');
  }

  function renderCardFace($face, card) {
    const cls = card.red ? 'is-red' : '';
    $face.html(
      '<span class="lhd-card__rank ' + cls + '">' + card.rank + '</span>' +
      '<span class="lhd-card__suit ' + cls + '">' + card.suit + '</span>' +
      '<span class="lhd-card__center ' + cls + '">' + card.suit + '</span>'
    );
  }

  function flashCard($card, $face, finalCard, done) {
    let ticks = 0;
    const maxTicks = 10 + Math.floor(Math.random() * 6);

    function tick() {
      const temp = drawCard();
      renderCardFace($face, temp);
      ticks++;
      if (ticks < maxTicks) {
        setTimeout(tick, 55 + ticks * 12);
      } else {
        renderCardFace($face, finalCard);
        $card.addClass('is-flipped');
        setTimeout(done, 180);
      }
    }
    tick();
  }

  function determineWinner(dragon, tiger) {
    if (dragon.value > tiger.value) return 'dragon';
    if (tiger.value > dragon.value) return 'tiger';
    return 'tie';
  }

  function evaluateWin(winner) {
    const count = bets[winner] || 0;
    if (!count) return { win: false, amount: 0, winner: winner };
    const side = sideById(winner);
    const amount = unitBet() * side.mult * count;
    return { win: true, amount: amount, winner: winner, side: side, count: count };
  }

  function highlightWinner(winner) {
    if (winner === 'dragon') {
      $('#sideDragon').addClass('is-win');
      $dragonCard.addClass('is-win');
    } else if (winner === 'tiger') {
      $('#sideTiger').addClass('is-win');
      $tigerCard.addClass('is-win');
    } else {
      $('#sideDragon, #sideTiger').addClass('is-win');
      $dragonCard.addClass('is-win');
      $tigerCard.addClass('is-win');
    }
  }

  function deal() {
    if (dealing) return;
    const amount = totalBet();
    if (amount <= 0) {
      App.toast('请先押注');
      return;
    }
    if (App.getBalance(user.uid) < amount) {
      App.toast('积分不足');
      return;
    }

    dealing = true;
    $room.addClass('is-dealing');
    $('#btnStart').prop('disabled', true);
    $result.removeClass('is-win is-lose').text('');
    updateCenter('发牌中…', '龙争虎斗');

    App.setBalance(user.uid, App.getBalance(user.uid) - amount);
    refreshStats();

    resetCards();

    const dragon = drawCard();
    const tiger = drawCard();
    const winner = determineWinner(dragon, tiger);

    flashCard($dragonCard, $dragonFace, dragon, function () {
      $('#dragonPts').text('点数 ' + dragon.value);
      flashCard($tigerCard, $tigerFace, tiger, function () {
        $('#tigerPts').text('点数 ' + tiger.value);
        settleRound(dragon, tiger, winner, amount);
      });
    });
  }

  function settleRound(dragon, tiger, winner, amount) {
    const winInfo = evaluateWin(winner);
    highlightWinner(winner);

    let winAmount = 0;
    const winnerSide = sideById(winner);

    if (winInfo.win) {
      winAmount = winInfo.amount;
      App.setBalance(user.uid, App.getBalance(user.uid) + winAmount);
      $result.addClass('is-win').text(
        winInfo.side.label + ' ×' + winInfo.count + ' · ×' + winInfo.side.mult + ' · 赢 ' + winAmount
      );
      updateCenter('中奖！', winnerSide.label + ' +' + winAmount);
      App.toast('+' + winAmount);
    } else {
      const resultText = winner === 'tie'
        ? '和局 ' + dragon.text + ' vs ' + tiger.text
        : winnerSide.label + '胜 ' + dragon.text + ' vs ' + tiger.text;
      $result.addClass('is-lose').text(resultText + ' · 未押中');
      updateCenter('未中', winnerSide.label + ' 胜出');
    }

    history.unshift({
      time: Date.now(),
      bet: amount,
      win: winAmount,
      winner: winner,
      dragon: dragon.text,
      tiger: tiger.text
    });
    saveHistory();

    $('#statWin').text(winAmount > 0 ? ('+' + winAmount.toLocaleString('en-US')) : '0');
    refreshStats();

    dealing = false;
    $room.removeClass('is-dealing');
    $('#btnStart').prop('disabled', false);
    clearBets();
  }

  function renderRules() {
    const rows = SIDES.map(function (s) {
      return '<tr><td><img src="' + symSrc(s.id) + '" width="32" height="32" alt=""></td>' +
        '<td>' + s.label + '</td><td>×' + s.mult + '</td></tr>';
    }).join('');
    $('#sheetBody').html(
      '<h3>龙虎斗</h3>' +
      '<p>龙、虎各发一张牌，比点数大小。A 最小、K 最大。点数相同为和局。</p>' +
      '<h3>奖金计算</h3>' +
      '<p>赢得 = 单注 × 赔率 × 押注次数</p>' +
      '<h3>赔率</h3>' +
      '<table class="' + PFX + '-pay-table"><thead><tr><th></th><th>押注</th><th>赔率</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<h3>操作</h3>' +
      '<p>点押注键叠加注数；「全押」龙/虎/和各 1 注；「清除」取消押注；± 调整单注额度。</p>'
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

  $('#btnStart').on('click', deal);

  $('#btnClear').on('click', function () {
    if (dealing) return;
    clearBets();
  });

  $('#btnAllBet').on('click', function () {
    if (dealing) return;
    allBet();
  });

  $('#betKeys').on('click', '.' + PFX + '-bet-key', function () {
    toggleBet($(this).data('id'));
  });

  $('#btnMinus').on('click', function () {
    if (dealing) return;
    unitIdx = Math.max(0, unitIdx - 1);
    refreshStats();
  });

  $('#btnPlus').on('click', function () {
    if (dealing) return;
    unitIdx = Math.min(UNIT_STEPS.length - 1, unitIdx + 1);
    refreshStats();
  });

  $('#sheetClose, #sheetOk, #sheetMask').on('click', function () {
    setOverlay($('#sheetMask, #rulesSheet'), false);
  });

  $('#rulesSheet').on('click', function (e) { e.stopPropagation(); });

  $(document).on('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!dealing) deal();
    }
    if (e.key === 'Escape') setOverlay($('#sheetMask, #rulesSheet'), false);
  });

  $('#centerPanel').on('click', function () {
    setOverlay($('#sheetMask, #rulesSheet'), true);
  });

  buildBetKeys();
  refreshBetKeys();
  refreshStats();
  renderRules();
  resetCards();
}
