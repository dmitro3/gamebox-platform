/**
 * 充值通道（上 / 下 分申请）
 *
 *   上分：填金额 → 选择类型 → 提交 → 弹窗确认；点「立即联系客服」才发送文案给客服
 *   下分：填金额 → 选择类型 → 提交（立即扣积分）→ 弹窗确认；点「立即联系客服」才发送文案给客服
 *
 * 余额持久化使用 App.getBalance / App.adjustBalance，与大厅页共享
 * 申请记录写入 App.saveRecharge，客服端后续会读取此列表来审核
 */

$(function () {

  // ===== URL & 用户基础信息 =====
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();

  const user = App.getUser();
  if (user) {
    $('#userAvatar').attr('src', user.avatar || '');
    $('#userName').text(user.name || '—');
    $('#userId').text(user.uid || '———');
  }

  // 当前余额（共享 storage：大厅、流水等其它页都从同一处取）
  let balance = App.getBalance(user ? user.uid : '');
  function renderBalance() {
    $('#balance').text(balance.toLocaleString('en-US'));
  }
  renderBalance();

  // ===== 当前类型（up / down） =====
  let curType = 'up';
  let curPayType = 'wechat'; // wechat | alipay | unionpay

  const PAY_NAMES = {
    wechat: '微信',
    alipay: '支付宝',
    unionpay: '银联'
  };

  /** 提交后自动转换的申请文案：微信上分（100） / 支付宝下分（500） */
  function buildApplyLabel(type, payType, amount) {
    const pay = PAY_NAMES[payType] || PAY_NAMES.wechat;
    const action = type === 'up' ? '上分' : '下分';
    return `${pay}${action}（${amount}）`;
  }

  function refreshType() {
    if (curType === 'up') {
      $('#amountLabel').text('上 分 金 额');
      $('#amountHint').text('（请输入整数积分，最低 100）');
      $('#submitBtn').text('提 交 上 分 申 请');
      $('#payTypeHead').text('上 分 类 型');
      $('#payTypeOptions').attr('aria-label', '上分类型');
    } else {
      $('#amountLabel').text('下 分 金 额');
      $('#amountHint').text(`（最多可下 ${balance.toLocaleString('en-US')} 积分）`);
      $('#submitBtn').text('提 交 下 分 申 请');
      $('#payTypeHead').text('下 分 类 型');
      $('#payTypeOptions').attr('aria-label', '下分类型');
    }
  }
  refreshType();

  // 上分 / 下分类型单选
  $('.rpt-options').on('click', '.rpt-item', function () {
    const pay = String($(this).data('pay') || '');
    if (!pay || pay === curPayType) return;
    curPayType = pay;
    $('.rpt-item').removeClass('active').attr('aria-pressed', 'false');
    $(this).addClass('active').attr('aria-pressed', 'true');
  });

  // Tab 切换
  $('.r-tabs').on('click', '.rt-item', function () {
    const type = $(this).data('type');
    if (type === curType) return;
    curType = type;
    $('.rt-item').removeClass('active');
    $(this).addClass('active');
    refreshType();
    $('.rq-item').removeClass('active');
  });

  // ===== 金额输入 =====
  const $input = $('#amountInput');
  const $clear = $('#clearBtn');

  function updateClearBtn() {
    $clear.css('display', $input.val() ? 'flex' : 'none');
  }

  $input.on('input', function () {
    let v = this.value.replace(/[^\d]/g, '');
    if (v.length > 1) v = v.replace(/^0+/, '');
    if (v.length > 9) v = v.slice(0, 9);
    this.value = v;
    $('.rq-item').removeClass('active');
    updateClearBtn();
  });

  $clear.on('click', function () {
    $input.val('').focus();
    $('.rq-item').removeClass('active');
    updateClearBtn();
  });

  // 快捷金额
  $('.r-quick').on('click', '.rq-item', function () {
    const v = String($(this).data('v'));
    $input.val(v);
    $('.rq-item').removeClass('active');
    $(this).addClass('active');
    updateClearBtn();
  });

  // 最近一次提交结果（点「立即联系客服」时才发送文案给客服）
  let pendingCsItem = null;

  // ===== 提交 =====
  $('#submitBtn').on('click', function () {
    const raw = $input.val().trim();
    if (!raw) {
      App.toast('请输入金额');
      $input.focus();
      return;
    }
    const amount = parseInt(raw, 10);
    if (!amount || amount <= 0) {
      App.toast('金额格式有误');
      $input.focus();
      return;
    }
    if (curType === 'up' && amount < 100) {
      App.toast('上分最低 100 积分');
      $input.focus();
      return;
    }
    if (curType === 'down') {
      if (amount < 50) {
        App.toast('下分最低 50 积分');
        $input.focus();
        return;
      }
      if (amount > balance) {
        App.toast('下分金额不能大于当前积分');
        $input.focus();
        return;
      }
    }

    const now = Date.now();
    const label = buildApplyLabel(curType, curPayType, amount);
    const item = {
      id: 'rch_' + now,
      type: curType,
      payType: curPayType,
      label,
      amount,
      roomNo,
      uid: user ? user.uid : '',
      name: user ? user.name : '',
      time: now,
      status: 'pending',
      // 下分时立即冻结/扣除；上分需客服打款后才会到账
      deducted: curType === 'down'
    };

    // 下分：立即扣减玩家积分
    if (curType === 'down' && user && user.uid) {
      balance = App.adjustBalance(user.uid, -amount);
      renderBalance();
      // 因为余额变了，更新一下"最多可下"的提示
      refreshType();
    }

    // 写入申请列表（客服端读取审核）
    App.saveRecharge(item);

    // 清空输入并展示结果（文案暂存 pendingCsItem，等用户点「立即联系客服」再发送）
    $input.val('');
    $('.rq-item').removeClass('active');
    updateClearBtn();
    App.toast(label);
    showResult(item);
  });

  function sendPendingToCs() {
    if (!pendingCsItem || !user || !user.uid) return;
    const label = pendingCsItem.label
      || buildApplyLabel(pendingCsItem.type, pendingCsItem.payType, pendingCsItem.amount);
    App.appendCsUserMessage(user.uid, roomNo, label);
    pendingCsItem = null;
  }

  // ===== 提交结果抽屉 =====
  function showResult(item) {
    pendingCsItem = item;
    const isUp = item.type === 'up';
    const label = item.label || buildApplyLabel(item.type, item.payType, item.amount);

    $('#rsTitle').text(isUp ? '上 分 申 请 已 提 交' : '下 分 申 请 已 提 交');
    $('#rsSubtitle').text(isUp
      ? '请联系客服取得收款账号'
      : '已立即扣除积分，客服审核后将线下转账');
    $('#rsLabel').text(label);
    $('#rsTime').text(formatTime(item.time));
    $('#rsStatus').text('待 审 核');

    const $icon = $('#rsIcon');
    $icon.toggleClass('is-down', !isUp);

    $('#resultMask').addClass('show');
    $('#resultSheet').addClass('show').attr('aria-hidden', 'false');
  }

  function closeResult() {
    pendingCsItem = null;
    $('#resultMask').removeClass('show');
    $('#resultSheet').removeClass('show').attr('aria-hidden', 'true');
  }

  $('#resultMask, #rsLater').on('click', closeResult);
  $('#rsGoCs').on('click', function () {
    sendPendingToCs();
    closeResult();
    goCS();
  });

  // ===== 联系客服 =====
  function goCS() {
    App.go(roomNo
      ? `../cs/cs.html?roomNo=${roomNo}`
      : `../cs/cs.html`);
  }
  $('#csLink').on('click', goCS);

  // ===== 返回 =====
  $('#backBtn').on('click', function () {
    if (window.history.length > 1) window.history.back();
    else App.go(roomNo
      ? `../game-lobby/game-lobby.html?roomNo=${roomNo}`
      : `../game-lobby/game-lobby.html`);
  });

  // ===== 工具 =====
  function formatTime(ts) {
    const d = new Date(ts);
    const pad = n => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

});
