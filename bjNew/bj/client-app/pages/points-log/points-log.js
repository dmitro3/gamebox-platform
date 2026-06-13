/**
 * 积分账变
 *   - 6 时间 tab
 *   - 全部 + 筛选（14 个类型：全部、存款、取款、存取款、彩票下注、彩票结算、彩票回水、
 *     彩票取消注单、娱乐下注、娱乐结算、娱乐回水、娱乐取消注单、红包、佣金）
 *   - mock：今日有 10 条混合数据，其他时段空
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const FILTERS = [
    '全 部', '存 款', '取 款', '存 取 款',
    '彩票下注', '彩票结算', '彩票回水', '彩票取消注单',
    '娱乐下注', '娱乐结算', '娱乐回水', '娱乐取消注单',
    '红 包', '佣 金'
  ];

  const fmt = n => (n >= 0 ? '+' : '-') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtBal = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // mock 数据：仅今日有数据，其他时段空
  const RAW = {
    today: [
      { kind: '彩票下注', amount: -200, balance: 5320.00, time: '2026-06-01 14:32:18' },
      { kind: '彩票结算', amount: +380, balance: 5700.00, time: '2026-06-01 14:36:50' },
      { kind: '彩票回水', amount: +5.6,  balance: 5705.60, time: '2026-06-01 14:36:51' },
      { kind: '娱乐下注', amount: -500, balance: 5205.60, time: '2026-06-01 15:10:02' },
      { kind: '娱乐结算', amount: +120, balance: 5325.60, time: '2026-06-01 15:12:45' },
      { kind: '红 包',    amount: +8.88, balance: 5334.48, time: '2026-06-01 16:08:00' },
      { kind: '存 款',    amount: +1000, balance: 6334.48, time: '2026-06-01 17:30:15' },
      { kind: '彩票下注', amount: -300, balance: 6034.48, time: '2026-06-01 18:00:22' },
      { kind: '彩票结算', amount: +600, balance: 6634.48, time: '2026-06-01 18:04:01' },
      { kind: '取 款',    amount: -500, balance: 6134.48, time: '2026-06-01 19:00:00' }
    ],
    yesterday: [],
    thisweek: [],
    lastweek: [],
    thismonth: [],
    lastmonth: []
  };

  let currentRange = 'today';
  let currentFilter = 0;

  function render() {
    let list = RAW[currentRange] || [];
    if (currentFilter !== 0) {
      const want = FILTERS[currentFilter];
      list = list.filter(r => r.kind === want);
    }
    if (!list.length) {
      $('#plList').html(`
        <div class="pl-empty">
          <div class="pl-empty-icon">◇</div>
          <div class="pl-empty-text">暂 无 记 录</div>
        </div>
      `);
      return;
    }
    $('#plList').html(list.map(r => `
      <div class="pl-row">
        <span class="pl-kind">${r.kind}</span>
        <span class="pl-amount ${r.amount >= 0 ? 'pos' : 'neg'}">${fmt(r.amount)}</span>
        <span class="pl-time">${r.time}</span>
        <span class="pl-balance">余额 ${fmtBal(r.balance)}</span>
      </div>
    `).join(''));
  }

  // 时间 tab
  $('.time-tabs').on('click', '.tt-item', function () {
    $('.tt-item').removeClass('active');
    $(this).addClass('active');
    currentRange = $(this).data('range');
    render();
  });

  // 筛选 sheet
  function buildSheet() {
    $('#sheetGrid').html(FILTERS.map((f, i) => `
      <button type="button" class="pl-opt ${i === currentFilter ? 'active' : ''}" data-idx="${i}">${f}</button>
    `).join(''));
  }
  function openSheet() {
    buildSheet();
    $('#sheetMask').removeClass('hidden');
    $('#filterSheet').removeClass('hidden');
  }
  function closeSheet() {
    $('#sheetMask').addClass('hidden');
    $('#filterSheet').addClass('hidden');
  }
  $('#filterBtn').on('click', openSheet);
  $('#sheetClose').on('click', closeSheet);
  $('#sheetMask').on('click', closeSheet);
  $('#sheetGrid').on('click', '.pl-opt', function () {
    currentFilter = +$(this).data('idx');
    $('#pickedLabel').text(FILTERS[currentFilter]);
    closeSheet();
    render();
  });

  $('#backBtn').on('click', () => history.length > 1 ? history.back() : App.go(`../settings/settings.html${qs}`));

  render();
});
