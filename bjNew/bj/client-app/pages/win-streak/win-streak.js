/**
 * 连赢八场
 *   - 连赢 8 场 + 8 局总有效投注达到档位 → 派发对应彩金
 *   - 6 个档位，按"实际完成的最高档位"派发，不重复
 *   - 申请方式：完成后联系客服核对注单后派发
 *
 * 原型阶段不做真实记账，"立即领取"按钮直接引导到客服会话。
 */

$(function () {

  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  // ===== 档位数据 =====
  const TIERS = [
    { bet: 5000,   bonus: 188 },
    { bet: 20000,  bonus: 588 },
    { bet: 50000,  bonus: 1088 },
    { bet: 88000,  bonus: 1888 },
    { bet: 300000, bonus: 3888 },
    { bet: 500000, bonus: 8888, cap: true }
  ];

  function fmtMoney(n) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function renderTable() {
    const rowsHtml = TIERS.map(t => {
      const bet = fmtMoney(t.bet);
      const bonus = fmtMoney(t.bonus);
      const betCell = t.cap
        ? `${bet}<span class="fd-cap-badge">最 高</span>`
        : bet;
      return `
        <div class="fd-trow${t.cap ? ' is-cap' : ''}">
          <div>${betCell}</div>
          <div class="fd-bonus">${bonus}</div>
        </div>
      `;
    }).join('');
    $('#wsTbody').html(rowsHtml);
  }
  renderTable();

  // ===== 立即领取 =====
  $('#claimBtn').on('click', function () {
    App.toast('正在为您接入在线客服 ...');
    setTimeout(function () {
      App.go(`../cs/cs.html${qs}`);
    }, 350);
  });

  // ===== 文中"在线客服"链接 =====
  $('#csLink').on('click', function () {
    App.go(`../cs/cs.html${qs}`);
  });

  // ===== 返回 =====
  $('#backBtn').on('click', function () {
    if (window.history.length > 1) window.history.back();
    else App.go(`../promo/promo.html${qs}`);
  });

});
