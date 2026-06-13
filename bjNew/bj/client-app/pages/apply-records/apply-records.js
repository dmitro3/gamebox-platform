/**
 * 申请记录页（上下分记录）
 *   - 6 时间 tab：今日 / 昨日 / 本周 / 上周 / 本月 / 上个月
 *   - 数据：mock（上线后接 server: GET /api/apply-records?range=xxx）
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  // mock：每个 tab 不同条数，让切换有视觉差异
  const MOCK = {
    today: [
      { kind: '上 分', amount: +500,  status: 'success', time: '2026-06-01 09:32' },
      { kind: '下 分', amount: -300,  status: 'pending', time: '2026-06-01 11:08' },
      { kind: '上 分', amount: +1000, status: 'success', time: '2026-06-01 14:21' }
    ],
    yesterday: [
      { kind: '上 分', amount: +800, status: 'success', time: '2026-05-31 19:45' },
      { kind: '下 分', amount: -200, status: 'reject',  time: '2026-05-31 22:10' }
    ],
    thisweek: [
      { kind: '上 分', amount: +500,  status: 'success', time: '2026-06-01 09:32' },
      { kind: '下 分', amount: -300,  status: 'pending', time: '2026-06-01 11:08' },
      { kind: '上 分', amount: +1000, status: 'success', time: '2026-06-01 14:21' },
      { kind: '上 分', amount: +800,  status: 'success', time: '2026-05-31 19:45' },
      { kind: '下 分', amount: -200,  status: 'reject',  time: '2026-05-31 22:10' },
      { kind: '上 分', amount: +1500, status: 'success', time: '2026-05-29 10:00' }
    ],
    lastweek: [
      { kind: '上 分', amount: +2000, status: 'success', time: '2026-05-22 08:15' },
      { kind: '下 分', amount: -1000, status: 'success', time: '2026-05-25 16:50' }
    ],
    thismonth: [],
    lastmonth: []
  };

  const STATUS_LABEL = { success: '已通过', pending: '审核中', reject: '已驳回' };
  const fmt = n => Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function render(range) {
    const list = MOCK[range] || [];
    if (!list.length) {
      $('#arList').html(`
        <div class="ar-empty">
          <div class="ar-empty-icon">◇</div>
          <div class="ar-empty-text">该 时 段 暂 无 记 录</div>
        </div>
      `);
      return;
    }
    $('#arList').html(list.map(r => {
      const isUp = r.amount >= 0;
      return `
        <div class="ar-card">
          <div class="ar-badge ${isUp ? 'up' : 'down'}">${isUp ? '上分' : '下分'}</div>
          <div class="ar-body">
            <div class="ar-row1">
              <span class="ar-kind">${r.kind}</span>
              <span class="ar-status ${r.status}">${STATUS_LABEL[r.status]}</span>
            </div>
            <div class="ar-time">${r.time}</div>
          </div>
          <div class="ar-amount ${isUp ? 'pos' : 'neg'}">${isUp ? '+' : '-'}${fmt(r.amount)}</div>
        </div>
      `;
    }).join(''));
  }

  $('.time-tabs').on('click', '.tt-item', function () {
    $('.tt-item').removeClass('active');
    $(this).addClass('active');
    render($(this).data('range'));
  });

  $('#backBtn').on('click', () => history.length > 1 ? history.back() : App.go(`../settings/settings.html${qs}`));

  render('today');
});
