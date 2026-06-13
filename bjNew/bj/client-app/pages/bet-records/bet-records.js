/**
 * 竞猜记录页
 *   - 6 时间 tab
 *   - 每条记录显示：
 *       开始时间 - 结束时间
 *       总注单 / 总金额 / 总反点（3 列 KPI）
 *       游戏总结过 0.00  |  玩家总结过 0.00
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const MOCK = {
    today: [
      { start: '2026-06-01 00:00', end: '2026-06-01 23:59',
        orders: 124, amount: 8520.00, rebate: 42.60,
        gameSettle: 0.00, playerSettle: 8520.00 }
    ],
    yesterday: [
      { start: '2026-05-31 00:00', end: '2026-05-31 23:59',
        orders: 86, amount: 5340.50, rebate: 26.70,
        gameSettle: 0.00, playerSettle: 5340.50 }
    ],
    thisweek: [
      { start: '2026-05-26 00:00', end: '2026-06-01 23:59',
        orders: 510, amount: 36280.00, rebate: 181.40,
        gameSettle: 0.00, playerSettle: 36280.00 }
    ],
    lastweek: [
      { start: '2026-05-19 00:00', end: '2026-05-25 23:59',
        orders: 423, amount: 28930.00, rebate: 144.65,
        gameSettle: 0.00, playerSettle: 28930.00 }
    ],
    thismonth: [],
    lastmonth: []
  };

  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function render(range) {
    const list = MOCK[range] || [];
    if (!list.length) {
      $('#brList').html(`
        <div class="br-empty">
          <div class="br-empty-icon">◇</div>
          <div class="br-empty-text">该 时 段 暂 无 记 录</div>
        </div>
      `);
      return;
    }
    $('#brList').html(list.map(r => `
      <div class="br-card">
        <div class="br-time">${r.start}  ~  ${r.end}</div>
        <div class="br-kpi">
          <div class="br-kpi-cell">
            <span class="br-kpi-num">${r.orders}</span>
            <span class="br-kpi-label">总 注 单</span>
          </div>
          <div class="br-kpi-cell">
            <span class="br-kpi-num">${fmt(r.amount)}</span>
            <span class="br-kpi-label">总 金 额</span>
          </div>
          <div class="br-kpi-cell">
            <span class="br-kpi-num">${fmt(r.rebate)}</span>
            <span class="br-kpi-label">总 反 点</span>
          </div>
        </div>
        <div class="br-summary">
          <div class="br-summary-cell">
            游戏总结过 <span class="br-summary-num ${r.gameSettle >= 0 ? 'pos' : 'neg'}">${fmt(r.gameSettle)}</span>
          </div>
          <div class="br-summary-cell">
            玩家总结过 <span class="br-summary-num ${r.playerSettle >= 0 ? 'pos' : 'neg'}">${fmt(r.playerSettle)}</span>
          </div>
        </div>
      </div>
    `).join(''));
  }

  $('.time-tabs').on('click', '.tt-item', function () {
    $('.tt-item').removeClass('active');
    $(this).addClass('active');
    render($(this).data('range'));
  });

  $('#backBtn').on('click', () => history.length > 1 ? history.back() : App.go(`../settings/settings.html${qs}`));

  render('today');
});
