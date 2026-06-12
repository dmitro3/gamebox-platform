/**
 * 推广码绑定页（登录后跳到这里输入房间号）
 *
 * 业务逻辑：
 *  - 进入已审核房间（无论是 输入房间号 还是 点击下方图标）：
 *      → toast "正在进入 · 房间名称" → 跳 game-lobby
 *  - 输入未审核的房间号：
 *      → toast "进房申请已提交，请稍后重试"（停留本页）
 *      → 等代理在后台审核（审核交互后续补，原型阶段手动）
 *  - 任意一次点击"进入房间"后，6 位输入框都会清空、光标回到首格
 *
 * 数据来源：localStorage（原型阶段假数据 by App.getRooms()）
 */
$(function () {

  // ===== 整页等比适配：把 .referral-page（设计基准宽 390）整体缩放贴合屏幕 =====
  // 思路：先量出内容真实自然高 CH，缩放比 = min(屏宽/390, 屏高/CH)：
  //   · 高屏 → 取屏宽比：铺满整宽、四角贴边，min-height 反算让 flex 撑满整屏高；
  //   · 矮屏 → 取屏高比：按高缩放、绝不裁切按钮（两侧露极少背景）。
  // 同时自动适配房间数量（内容变高 CH 变大、整体自动缩小）。
  const DESIGN_W = 390;
  const stageEl = document.querySelector('.referral-page');
  let stageLastW = -1;
  function fitStage() {
    const w = window.innerWidth, h = window.innerHeight;
    // 1) 量内容自然高：临时 scale=1、min-height=0（--app-h:0）→ 内容紧排高度
    stageEl.style.setProperty('--page-scale', 1);
    stageEl.style.setProperty('--app-h', '0px');
    void stageEl.offsetHeight;                 // 强制 reflow，确保拿到最新高度
    const CH = stageEl.scrollHeight;
    // 2) 取较小缩放比，保证宽高都不溢出
    const scale = Math.min(w / DESIGN_W, h / CH);
    stageEl.style.setProperty('--page-scale', scale);
    stageEl.style.setProperty('--app-h', h + 'px');
    stageLastW = w;
  }
  fitStage();
  // 软键盘弹出只改高度不改宽度 → 不重算，避免整页跳动；仅宽度变化/旋转时重算
  window.addEventListener('resize', function () {
    if (window.innerWidth !== stageLastW) fitStage();
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(fitStage, 250);
  });
  // 房间图标/头像是异步加载的 → 全部加载完后再量一次，避免按图片未就绪时高度偏小
  window.addEventListener('load', fitStage);

  // ===== 顶部用户详情栏 =====
  // 这页是"还没进入房间"的中转页，只显示平台身份（头像/名称/ID）
  // 积分 / VIP 等都是房间内独立的状态，进房后才展示
  const user = App.getUser();
  $('#userAvatar').attr('src', user.avatar);
  $('#userName').text(user.name);
  $('#userId').text(user.uid);

  // ===== 屏顶右上角：个人设置 + 安全退出 =====
  // 个人设置 → 跳设置页（settings.html，带 ?from=referral 让返回键能识别来源）
  $('#settingsBtn').on('click', function () {
    App.go('../settings/settings.html?from=referral');
  });

  // 安全退出 → 二次确认 → 清登录态 + 清会话 + 跳回玩家登录页
  $('#logoutBtn').on('click', function () {
    if (!confirm('确定要安全退出当前账号吗？')) return;
    App.clearUser();
    App.clearSession();
    try { sessionStorage.clear(); } catch (_) { /* 容错：sessionStorage 不可用时静默忽略 */ }
    App.toast('已安全退出');
    setTimeout(() => App.go('../welcome/welcome.html'), 400);
  });

  // ===== 6 格输入框逻辑 =====
  const $boxes = $('.code-box');

  function refreshFilled() {
    $boxes.each(function () {
      $(this).toggleClass('filled', !!this.value);
    });
  }

  function getCode() {
    return $boxes.map(function () { return this.value; }).get().join('');
  }

  $boxes.on('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 1);
    refreshFilled();
    if (this.value) {
      const $next = $boxes.eq($(this).data('idx') + 1);
      if ($next.length) $next.focus(); else this.blur();
    }
  });
  $boxes.on('keydown', function (e) {
    const idx = $(this).data('idx');
    if (e.key === 'Backspace' && !this.value) {
      // 当前为空 → 退到前一格清空；已在第 0 格 → 什么都不做（修 jQuery eq(-1) 循环到末尾的 bug）
      if (idx > 0) {
        $boxes.eq(idx - 1).val('').focus();
        refreshFilled();
        e.preventDefault();
      } else {
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft') {
      if (idx > 0) $boxes.eq(idx - 1).focus();
    } else if (e.key === 'ArrowRight') {
      if (idx < $boxes.length - 1) $boxes.eq(idx + 1).focus();
    }
  });
  $boxes.on('paste', function (e) {
    e.preventDefault();
    const text = (e.originalEvent.clipboardData || window.clipboardData).getData('text');
    const nums = (text || '').replace(/\D/g, '').slice(0, 6);
    $boxes.each(function (i) { this.value = nums[i] || ''; });
    refreshFilled();
    $boxes.eq(Math.min(nums.length, $boxes.length - 1)).focus();
  });
  setTimeout(() => $boxes.eq(0).focus(), 200);

  // ===== 渲染已通过房间网格 =====
  function renderRooms() {
    const rooms = App.getRooms();
    if (!rooms.length) {
      $('#roomsSection').hide();
      return;
    }
    const html = rooms.map(r => `
      <div class="room-tile" data-room="${r.roomNo}">
        <div class="room-luxe-wrap">
          <img class="room-icon" src="${r.icon}" alt="${r.name}" loading="lazy">
          <img class="room-frame" src="../../assets/images/room-frame-gold.png" alt="">
        </div>
        <div class="name">${r.name}</div>
        <div class="room-no">${r.roomNo}</div>
      </div>
    `).join('');
    $('#roomsGrid').html(html);
    $('#roomsSection').show();
  }
  renderRooms();
  fitStage();                  // 房间渲染后内容高度变化，重新适配缩放

  // 清空 6 格输入并把光标聚焦到首格
  function resetCode() {
    $boxes.val('');
    refreshFilled();
    $boxes.eq(0).focus();
  }

  // 进入一个"已审核通过"的房间：统一文案 + 清空输入 + 跳转大厅
  function enterRoom(room) {
    App.toast(`正在进入 · ${room.name}`);
    resetCode();
    setTimeout(() => App.go('../game-lobby/game-lobby.html?roomNo=' + room.roomNo), 500);
  }

  // 点击已通过房间格子 → 直接进入大厅
  $('#roomsGrid').on('click', '.room-tile', function () {
    const roomNo = String($(this).data('room'));
    const room = App.getRooms().find(r => r.roomNo === roomNo);
    if (room) enterRoom(room);
  });

  // ===== 提交"进入房间" =====
  $('#btnApply').on('click', async function () {
    const code = getCode();
    if (!/^\d{6}$/.test(code)) {
      App.toast('请输入完整的 6 位房间号');
      const $empty = $boxes.filter(function () { return !this.value; }).first();
      if ($empty.length) {
        $empty.addClass('shake').focus();
        setTimeout(() => $empty.removeClass('shake'), 400);
      }
      return;
    }

    // 已通过该房间 → 直接进
    const room = App.getRooms().find(r => r.roomNo === code);
    if (room) {
      enterRoom(room);
      return;
    }

    // 首次进入 → 提交申请，停留本页等代理审核（审核交互后续再补）
    const $btn = $(this).prop('disabled', true);
    $btn.find('.btn-text').text('提交中...');
    await App.delay(600);
    $btn.find('.btn-text').text('进 入 房 间');
    $btn.prop('disabled', false);
    App.toast('进房申请已提交，请稍后重试');
    resetCode();
  });

});
