/**
 * 代理报表
 *   - 6 时间 tab
 *   - 每条：开始时间 - 结束时间，已反佣金 / 未返佣流水
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const MOCK = {
    today:     [{ start: '2026-06-01 00:00', end: '2026-06-01 23:59', paid: 42.60,  unpaid: 8520.00 }],
    yesterday: [{ start: '2026-05-31 00:00', end: '2026-05-31 23:59', paid: 26.70,  unpaid: 5340.50 }],
    thisweek:  [{ start: '2026-05-26 00:00', end: '2026-06-01 23:59', paid: 181.40, unpaid: 36280.00 }],
    lastweek:  [{ start: '2026-05-19 00:00', end: '2026-05-25 23:59', paid: 144.65, unpaid: 28930.00 }],
    thismonth: [],
    lastmonth: []
  };

  const fmt = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function render(range) {
    const list = MOCK[range] || [];
    if (!list.length) {
      $('#agList').html(`
        <div class="ag-empty">
          <div class="ag-empty-icon">◇</div>
          <div class="ag-empty-text">该 时 段 暂 无 数 据</div>
        </div>
      `);
      return;
    }
    $('#agList').html(list.map(r => `
      <div class="ag-card">
        <div class="ag-time">${r.start}  ~  ${r.end}</div>
        <div class="ag-kpi">
          <div class="ag-kpi-cell">
            <span class="ag-kpi-num">${fmt(r.paid)}</span>
            <span class="ag-kpi-label">已 反 佣 金</span>
          </div>
          <div class="ag-kpi-cell">
            <span class="ag-kpi-num">${fmt(r.unpaid)}</span>
            <span class="ag-kpi-label">未 返 佣 流 水</span>
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
