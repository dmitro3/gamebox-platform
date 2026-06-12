/**
 * 明细页（重做版）
 *
 * 页面结构：
 *   - 顶部两 tab：今日已结 / 未结明细
 *   - 4 列表格：期号 / 游戏类型 / 下注金额 / 结果
 *
 * 数据来源：
 *   - 今日已结：FLOW_DATA 中 kind === 'game' 的注单，按 bets 展平为单笔行
 *   - 未结明细：本地 mock 几条 pending 注单，结果列显示「待开奖」
 *
 * 设计取舍：
 *   - 删除了原页所有筛选 / 日期 sheet / 滚轮 / 分组 / 展开折叠逻辑
 *   - 单笔展平后，期号一列会出现重复（同一期多注），保留重复让用户看到完整明细
 */
$(function () {

  const FLOW_DATA = App.FLOW_DATA || [];

  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();

  // ===== 金额格式化 =====
  function fmt(n) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // ===== 返回 =====
  $('#backBtn').on('click', function () {
    if (history.length > 1) history.back();
    else App.go(roomNo
      ? `../game-lobby/game-lobby.html?roomNo=${roomNo}`
      : `../welcome/welcome.html`);
  });

  // ===== 把 FLOW_DATA 的 game 类记录展平为「单笔」行 =====
  // 每笔注单包含：issue / game / stake / result(amount)
  function buildSettledRows() {
    const rows = [];
    FLOW_DATA.forEach(r => {
      if (r.kind !== 'game' || !Array.isArray(r.bets)) return;
      r.bets.forEach(b => {
        rows.push({
          issue:  r.issue,
          game:   (r.game || '').replace(/\s+/g, ''),
          stake:  b.stake,
          result: b.amount,
          time:   r.time
        });
      });
    });
    // 时间倒序
    rows.sort((a, b) => (a.time < b.time ? 1 : -1));
    return rows;
  }

  // ===== 未结明细：本地 mock 几条「待开奖」注单 =====
  // 真实场景下应由后端推送 status='pending' 的注单
  function buildUnsettledRows() {
    return [
      { issue: 'C20260601-018', game: '极速赛车', stake: 50,  result: null },
      { issue: 'D20260601-042', game: '分分彩',   stake: 100, result: null },
      { issue: 'D20260601-042', game: '分分彩',   stake: 80,  result: null },
      { issue: 'E20260601-007', game: '香港六合彩', stake: 200, result: null }
    ];
  }

  // ===== 渲染表格 body =====
  function renderRows(rows) {
    if (!rows.length) {
      return `
        <div class="dt-empty">
          <div class="empty-icon">◇</div>
          <div class="empty-text">暂 无 数 据</div>
        </div>
      `;
    }
    return rows.map(r => {
      let resultHtml;
      if (r.result === null) {
        resultHtml = `<span class="dt-pending">待 开 奖</span>`;
      } else {
        const isWin = r.result >= 0;
        const sign = isWin ? '+' : '';
        resultHtml = `<span class="dt-result ${isWin ? 'pos' : 'neg'}">${sign}${fmt(r.result)}</span>`;
      }
      return `
        <div class="dt-row">
          <div class="dt-col col-issue">${r.issue}</div>
          <div class="dt-col col-game">${r.game}</div>
          <div class="dt-col col-stake">${fmt(r.stake)}</div>
          <div class="dt-col col-result">${resultHtml}</div>
        </div>
      `;
    }).join('');
  }

  // ===== Tab 切换 =====
  let currentTab = 'settled';
  $('.detail-tabs').on('click', '.dt-tab', function () {
    const tab = $(this).data('tab');
    if (tab === currentTab) return;
    currentTab = tab;
    $('.dt-tab').removeClass('active');
    $(this).addClass('active');
    render();
  });

  function render() {
    const rows = currentTab === 'settled' ? buildSettledRows() : buildUnsettledRows();
    $('#detailBody').html(renderRows(rows));
  }

  // ===== 初始化 =====
  render();
});
