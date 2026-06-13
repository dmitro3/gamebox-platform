/**
 * 「我的」页（重做版）
 *
 * 布局：
 *   1. 用户名片（金质 Baroque 框，与「输入房间号」页同款）
 *   2. 钱包中心（3 行：标题+眼睛、余额、流水/回水/盈利）
 *   3. 2×3 网格：账号管理 / 申请记录 / 竞猜记录 / 福利报表 / 积分账变 / 代理报表
 *   4. 1×4 网格：分享好友 / 检查更新 / 游戏介绍 / 在线客服
 *   5. 退出登录
 *
 * 已下架模块：VIP / 我的团队 / 分享赚钱 / 帮助中心
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const user = App.getUser();

  // ===== 卡片 1：用户名片 =====
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(`profile_${user.uid}`) || '{}') || {}; }
  catch (e) {}
  $('#userAvatar').attr('src', profile.avatar  || user.avatar);
  $('#userName').text(profile.nickname || user.name);
  $('#userId').text(user.uid);

  $('#avatarBtn').on('click', function () {
    App.go(`../profile/profile.html${qs}`);
  });

  // ===== 卡片 2：钱包中心 =====
  // 余额来自 App.getUser().balance；流水/回水/盈利 mock（后期由后端推送）
  const WALLET_STORE = `wallet_hidden_${user.uid}`;
  const stats = {
    balance:  Number(user.balance || 0),
    turnover: 0,
    rebate:   0,
    pnl:      0
  };
  const fmtNum = n => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = n => Number(n).toLocaleString('en-US');
  let hidden = localStorage.getItem(WALLET_STORE) === '1';

  function renderWallet() {
    $('#walletBalance').text(hidden ? '*****' : fmtNum(stats.balance));
    $('#statTurnover').text(hidden ? '***' : fmtInt(stats.turnover));
    $('#statRebate').text(hidden ? '***' : fmtInt(stats.rebate));
    $('#statPnl').text(hidden ? '***' : fmtInt(stats.pnl));
    $('.wallet-card').toggleClass('is-hidden', hidden);
  }
  renderWallet();

  $('#walletEye').on('click', function () {
    hidden = !hidden;
    localStorage.setItem(WALLET_STORE, hidden ? '1' : '0');
    renderWallet();
  });

  // ===== 卡片 3 & 4：网格菜单 =====
  // 每个 key 对应一个子页（不存在的提示「即将开放」）
  const ROUTES = {
    account:   '../account-manage/account-manage.html',
    apply:     '../apply-records/apply-records.html',
    bet:       '../bet-records/bet-records.html',
    welfare:   '../welfare/welfare.html',
    points:    '../points-log/points-log.html',
    agent:     '../agent-report/agent-report.html',
    'branch-app': '../branch-app/branch-app.html',
    update:     null,    // 检查更新：toast 提示已是最新
    intro:      null,    // 游戏介绍：toast 占位（后期接入富文本）
    cs:        '../cs/cs.html'
  };
  const LABEL = {
    'branch-app': '分享好友',
    'update':    '检查更新',
    'intro':     '游戏介绍'
  };

  $('.gc-item').on('click', function () {
    const key = $(this).data('key');
    const url = ROUTES[key];
    if (url) {
      App.go(url + qs);
      return;
    }
    if (key === 'update') {
      App.alert({
        title: '检 查 更 新',
        message: `当前已是最新版本\n${App.APP_VERSION || 'v1.0.0'}`,
        okText: '我 知 道 了',
        icon: 'info'
      });
      return;
    }
    App.toast(`${LABEL[key] || '该模块'} · 即将开放`);
  });

  // 顶部右侧消息中心（铃铛）已下架，不再注入未读小红点 / 跳转事件

  // ===== 顶部返回 =====
  $('#backBtn').on('click', function () {
    if (history.length > 1) history.back();
    else App.go(roomNo ? `../game-lobby/game-lobby.html${qs}` : `../welcome/welcome.html`);
  });

  // ===== 卡片 5：退出登录 =====
  $('#logoutBtn').on('click', function () {
    App.confirm({
      title: '退 出 登 录',
      message: '确定要退出当前账号吗？',
      okText: '退 出',
      cancelText: '取 消'
    }).then(ok => {
      if (!ok) return;
      App.clearUser();
      App.go('../welcome/welcome.html');
    });
  });

});
