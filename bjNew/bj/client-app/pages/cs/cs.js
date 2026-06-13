/**
 * 在线客服聊天页
 *
 * 当前实现（原型 / mock）：
 *   - 客服头像 / 名称：根据 URL ?roomNo 参数取出对应房间名，生成"{房间名} · 客服"
 *   - 历史消息：localStorage 持久化（按 uid + roomNo 隔离），保留 1 小时
 *   - 每分钟自动扫一遍，超过 1 小时的消息会被清理
 *   - 用户发送 → 1.5s 后客服模拟回复（基于关键词匹配 autoReply）
 *   - Enter 发送 / Shift+Enter 换行 / textarea 自适应高度
 *   - 返回按钮：history.back() / 兜底到大厅 / 兜底到 welcome
 *
 * 后期要补：
 *   - 接 server 端的 WebSocket / 长轮询，与代理后台真正通信
 *   - 服务端也按 1 小时清理，避免端上和服务端不一致
 *   - 图片 / 表情 / 文件支持（图片放大查看已有）
 */
$(function () {

  // ===== URL 参数 =====
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();

  const user = App.getUser();

  // ===== 客服信息（基于房间） =====
  // 顶部信息条已删除（页面标题改为「在线客服」），仅保留下面消息气泡和欢迎语用的两个常量
  const room = (App.getRooms() || []).find(r => r.roomNo === roomNo);
  const roomName = room ? room.name : '本 房 间';
  const AGENT_AVATAR = '../../assets/images/avatars/001.jpg';

  // ===== 消息持久化 + 1 小时过期 =====
  const STORE_KEY = `cs_messages_${user.uid}_${roomNo || 'default'}`;
  const EXPIRE_MS = 60 * 60 * 1000; // 1 小时

  // 去掉过期消息（按 ts 字段判断；typing 永远不保留）
  function pruneExpired(arr) {
    const cutoff = Date.now() - EXPIRE_MS;
    return (arr || []).filter(m => {
      if (m.type === 'typing') return false;
      if (!m.ts) return false;            // 没 ts 视为旧数据，清掉
      return m.ts >= cutoff;
    });
  }

  function loadMessages() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return pruneExpired(arr);
    } catch (_) { return []; }
  }

  function saveMessages() {
    // typing 是临时态，不持久化
    const toSave = messages.filter(m => m.type !== 'typing');
    try { localStorage.setItem(STORE_KEY, JSON.stringify(toSave)); } catch (_) {}
  }

  // ===== 状态 =====
  // 每条消息：{ type: 'time'|'agent'|'user'|'typing', text?, img?, ts? }
  let messages = loadMessages();
  if (messages.length === 0) {
    // 全过期 or 首次进入：重置成欢迎对话
    const now = Date.now();
    messages = [
      { type: 'time',  text: nowLabel(),                ts: now },
      { type: 'agent', text: `您好，欢迎来到 ${roomName.replace(/\s/g, '')}，我是您的专属客服，请问有什么可以帮您？`, ts: now }
    ];
    saveMessages();
  }

  // ===== 渲染 =====
  //   每条消息 { type, text?, img? }
  //   type: time | agent | user | typing
  //   img:  base64 / blob URL（与 text 二选一，存在 img 时即为图片消息）
  function render() {
    const $list = $('#messages').empty();
    messages.forEach(m => {
      if (m.type === 'time') {
        $list.append(`<div class="cs-time">${escapeHtml(m.text)}</div>`);
      } else if (m.type === 'agent') {
        $list.append(`
          <div class="cs-msg agent">
            <div class="cs-bubble-avatar"><img src="${AGENT_AVATAR}" alt=""></div>
            ${renderBubble(m, 'agent')}
          </div>
        `);
      } else if (m.type === 'user') {
        $list.append(`
          <div class="cs-msg user">
            ${renderBubble(m, 'user')}
          </div>
        `);
      } else if (m.type === 'typing') {
        $list.append(`
          <div class="cs-msg agent cs-typing">
            <div class="cs-bubble-avatar"><img src="${AGENT_AVATAR}" alt=""></div>
            <div class="cs-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        `);
      }
    });
    scrollToBottom();
  }

  // 渲染消息气泡（区分文字 / 图片）
  function renderBubble(m, side) {
    if (m.img) {
      // 图片用 data-src 存原图，点击放大查看
      return `
        <div class="cs-img-bubble" data-img="${m.img}">
          <img src="${m.img}" alt="图片">
        </div>
      `;
    }
    return `<div class="cs-bubble">${escapeHtml(m.text || '')}</div>`;
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = $('#messages')[0];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[<>&"]/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'
    }[c]));
  }

  function nowLabel() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `今 日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // 客服回复延时（ms）
  const REPLY_DELAY_MS = 1500;
  const PENDING_KEY = App.CS_PENDING_PREFIX + user.uid + '_' + (roomNo || 'default');

  // ===== 发送文字消息 =====
  function sendMessage(text) {
    text = String(text || '').trim();
    if (!text) return;
    maybeInsertTimeDivider();
    messages.push({ type: 'user', text, ts: Date.now() });
    saveMessages();
    render();
    $('#msgInput').val('').trigger('input');
    refreshSendBtn();
    scheduleAgentReply(autoReply(text));
  }

  // ===== 发送图片消息（原型阶段：本地 FileReader → base64）
  // 真实接入时改为：上传到服务端 → 拿到 URL → push { img: url }
  function sendImage(file) {
    if (!file || !/^image\//.test(file.type)) return;
    // 限制大小（原型阶段宽松一点，5MB 内）
    if (file.size > 5 * 1024 * 1024) {
      App.toast('图片不能超过 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      maybeInsertTimeDivider();
      messages.push({ type: 'user', img: e.target.result, ts: Date.now() });
      saveMessages();
      render();
      scheduleAgentReply('收到您发来的图片，我看一下，请稍候。');
    };
    reader.readAsDataURL(file);
  }

  // 距上一条非 time/typing 消息超过 10 分钟，自动插入"今日 HH:mm"分隔
  function maybeInsertTimeDivider() {
    const last = [...messages].reverse().find(m => m.type !== 'typing' && m.type !== 'time');
    if (!last || !last.ts || Date.now() - last.ts >= 10 * 60 * 1000) {
      messages.push({ type: 'time', text: nowLabel(), ts: Date.now() });
    }
  }

  /**
   * 客服回复调度
   *   1) 立刻把"待回复"写入 localStorage（含预期回复时间 + 文本）
   *      若玩家在 1.5s 内跳走，下一个页面 mountTabbar 会捡起这条，写消息 + 未读 + 1
   *   2) 同时本页面 setTimeout 1.5s 后处理：
   *      - 若 pending 还在（未被其他页面 mountTabbar 捡走）→ 写消息 + 不增加未读（仍在客服页 = 已读）
   *      - 若已被捡走 → 重新 load 一次 messages 把那条客服回复同步进来
   */
  function scheduleAgentReply(replyText) {
    const replyAt = Date.now() + REPLY_DELAY_MS;
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ replyAt, text: replyText }));
    } catch (_) {}

    // 350ms 后显示"客服正在输入"
    setTimeout(function () {
      messages.push({ type: 'typing' });   // typing 不持久化
      render();
    }, 350);

    // REPLY_DELAY_MS 后写入回复
    setTimeout(function () {
      // 移除 typing
      const i = messages.findIndex(m => m.type === 'typing');
      if (i >= 0) messages.splice(i, 1);

      let pending = null;
      try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch (_) {}
      if (pending) {
        // 还在 cs 页面收到回复，标记已读、不增加 unread
        localStorage.removeItem(PENDING_KEY);
        messages.push({ type: 'agent', text: pending.text, ts: Date.now() });
        saveMessages();
        App.clearCsUnread(user.uid, roomNo);
      } else {
        // 已被其他页面（mountTabbar）写入并标了 unread，重新 load 同步过来 + 清未读
        messages = loadMessages();
        App.clearCsUnread(user.uid, roomNo);
      }
      render();
    }, REPLY_DELAY_MS);
  }

  // ===== 定时清理：每 60 秒扫一遍过期消息 =====
  setInterval(() => {
    const before = messages.length;
    messages = pruneExpired(messages);
    if (messages.length === 0) {
      // 全部过期 → 重置欢迎语
      const now = Date.now();
      messages = [
        { type: 'time',  text: nowLabel(), ts: now },
        { type: 'agent', text: `您好，欢迎回来，我是您的专属客服，有什么可以帮您？`, ts: now }
      ];
    }
    if (messages.length !== before) {
      saveMessages();
      render();
    }
  }, 60 * 1000);

  // 客服自动回复（关键词匹配，原型阶段够用）
  function autoReply(input) {
    if (/上分|充值|存款|入金/.test(input))
      return '上分请点击大厅页面的【充值】按钮发起，到账时间通常 1-3 分钟，超时未到账请联系代理。';
    if (/下分|提现|取款|出金/.test(input))
      return '下分请点击大厅【充值】按钮 → 切换"提现"标签提交申请，到账时间 1-5 分钟。';
    if (/回水/.test(input))
      return '回水佣金每日早晨 06:00 自动结算前一天的有效下注，按 0.8% 计算，可在【流水】→ 红利筛选 → 回水佣金查看明细。';
    if (/下线|代理|分成/.test(input))
      return '下线佣金每日 06:00 自动发放，按下线前一天的有效下注 × 0.8% 计算；推广码可在【推广】中心生成。';
    if (/推广|推荐码|邀请/.test(input))
      return '在大厅【推广】入口可以查看您的专属推荐码，把推荐码发给好友即可获得下线收益。';
    if (/规则|玩法|怎么玩/.test(input))
      return '具体玩法可以告诉我您想了解的游戏（炸金花 / 斗牛 / 北京赛车 / 时时彩），我会发您完整规则。';
    if (/余额|积分/.test(input))
      return '您的当前积分余额会显示在大厅顶部，所有变动均会记录到【流水】页面，可按时间和类型筛选。';
    if (/你好|您好|hi|hello/i.test(input))
      return '您好，很高兴为您服务，请问需要咨询什么？';
    return '已收到您的消息，请稍候，我们会尽快为您处理。';
  }

  // ===== 发送按钮状态：输入为空时灰掉 =====
  function refreshSendBtn() {
    const has = $('#msgInput').val().trim().length > 0;
    $('#sendBtn').toggleClass('disabled', !has);
  }

  // ===== 事件 =====
  $('#sendBtn').on('click', function () {
    if ($(this).hasClass('disabled')) return;
    sendMessage($('#msgInput').val());
  });
  // Enter 发送 / Shift+Enter 换行
  $('#msgInput').on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage($(this).val());
    }
  });
  // textarea 自适应高度 + 同步发送按钮状态
  $('#msgInput').on('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    refreshSendBtn();
  });
  // 图片按钮 → 触发隐藏的 file input
  $('#imgBtn').on('click', function () {
    $('#imgInput').val('').trigger('click');
  });
  $('#imgInput').on('change', function () {
    const file = this.files && this.files[0];
    if (file) sendImage(file);
    this.value = '';   // 清空，便于下次选同一张能再次触发 change
  });

  // 点击聊天里的图片 → 全屏查看
  $('#messages').on('click', '.cs-img-bubble', function () {
    const src = $(this).data('img');
    if (!src) return;
    $('#imgViewerSrc').attr('src', src);
    $('#imgViewer').addClass('show');
  });
  // 点击遮罩任意位置 → 关闭
  $('#imgViewer').on('click', function () {
    $(this).removeClass('show');
    $('#imgViewerSrc').attr('src', '');
  });

  // 返回按钮：优先 history.back()，否则回大厅 / welcome
  $('#backBtn').on('click', function () {
    if (history.length > 1) {
      history.back();
    } else {
      App.go(roomNo
        ? `../game-lobby/game-lobby.html?roomNo=${roomNo}`
        : `../welcome/welcome.html`);
    }
  });

  // 底部 Tab 由 common.js 自动挂载（按 URL 推断 active）

  // ===== 初始化 =====
  render();
  refreshSendBtn();

});
